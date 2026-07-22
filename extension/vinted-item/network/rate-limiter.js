/**
 * Rate-limiter + file d'attente pour les appels Vinted.
 *
 * - Requêtes `interactive` (action user) : priorité haute, délai minimal
 * - Requêtes `background` (radar auto, scrape vendeur) : espacées + debounce
 * - Pause globale si 429 / challenge
 */

const DEFAULTS = {
  /** Délai mini entre 2 requêtes background (ms) */
  backgroundMinIntervalMs: 1_200,
  /** Délai mini entre 2 requêtes interactive (ms) */
  interactiveMinIntervalMs: 350,
  /** Jitter aléatoire ajouté (ms) pour éviter un rythme mécanique */
  jitterMs: 400,
  /** Debounce des fetches auto par clé (ms) */
  debounceMs: 800,
};

/** @typedef {'interactive' | 'background'} RequestPriority */

/**
 * @typedef {object} QueueItem
 * @property {RequestPriority} priority
 * @property {() => Promise<any>} run
 * @property {(value: any) => void} resolve
 * @property {(reason?: any) => void} reject
 */

export class VintedRateLimiter {
  /**
   * @param {Partial<typeof DEFAULTS>} [options]
   */
  constructor(options = {}) {
    this.options = { ...DEFAULTS, ...options };
    /** @type {QueueItem[]} */
    this.queue = [];
    this.running = false;
    this.pausedUntil = 0;
    this.pauseReason = /** @type {string|null} */ (null);
    this.lastStartAt = 0;
    /** @type {Map<string, { timer: ReturnType<typeof setTimeout>, resolvers: Array<{resolve: Function, reject: Function, run: Function}> }>} */
    this.debounceBuckets = new Map();
    /** @type {Set<(state: { paused: boolean, until: number, reason: string|null }) => void>} */
    this.listeners = new Set();
  }

  /**
   * @param {(state: { paused: boolean, until: number, reason: string|null }) => void} fn
   */
  subscribe(fn) {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  isPaused() {
    return Date.now() < this.pausedUntil;
  }

  getPauseState() {
    return {
      paused: this.isPaused(),
      until: this.pausedUntil,
      reason: this.pauseReason,
    };
  }

  /**
   * Met en pause toutes les requêtes auto / file.
   * @param {number} durationMs
   * @param {string} reason
   */
  pause(durationMs, reason) {
    const until = Date.now() + Math.max(durationMs, 5_000);
    this.pausedUntil = Math.max(this.pausedUntil, until);
    this.pauseReason = reason;
    this.#emit();
    // Reprend le drain après la pause
    const wait = this.pausedUntil - Date.now();
    setTimeout(() => {
      if (!this.isPaused()) {
        this.pauseReason = null;
        this.#emit();
      }
      this.#drain();
    }, wait + 10);
  }

  resume() {
    this.pausedUntil = 0;
    this.pauseReason = null;
    this.#emit();
    this.#drain();
  }

  /**
   * Enfile une tâche rate-limitee.
   * @template T
   * @param {() => Promise<T>} run
   * @param {{ priority?: RequestPriority }} [opts]
   * @returns {Promise<T>}
   */
  schedule(run, opts = {}) {
    const priority = opts.priority ?? 'background';

    if (this.isPaused() && priority === 'background') {
      return Promise.reject(
        Object.assign(new Error('vinted_paused'), {
          code: 'vinted_paused',
          reason: this.pauseReason,
          until: this.pausedUntil,
        }),
      );
    }

    return new Promise((resolve, reject) => {
      const item = { priority, run, resolve, reject };
      if (priority === 'interactive') {
        this.queue.unshift(item);
      } else {
        this.queue.push(item);
      }
      this.#drain();
    });
  }

  /**
   * Debounce une clé (ex: seller:275730317) — une seule requête part après silence.
   * @template T
   * @param {string} key
   * @param {() => Promise<T>} run
   * @param {{ waitMs?: number, priority?: RequestPriority }} [opts]
   * @returns {Promise<T>}
   */
  debounce(key, run, opts = {}) {
    const waitMs = opts.waitMs ?? this.options.debounceMs;
    const priority = opts.priority ?? 'background';

    return new Promise((resolve, reject) => {
      const existing = this.debounceBuckets.get(key);
      if (existing) {
        clearTimeout(existing.timer);
        existing.resolvers.push({ resolve, reject, run });
        existing.timer = setTimeout(() => this.#flushDebounce(key, priority), waitMs);
        return;
      }

      const entry = {
        timer: setTimeout(() => this.#flushDebounce(key, priority), waitMs),
        resolvers: [{ resolve, reject, run }],
      };
      this.debounceBuckets.set(key, entry);
    });
  }

  /**
   * @param {string} key
   * @param {RequestPriority} priority
   */
  #flushDebounce(key, priority) {
    const entry = this.debounceBuckets.get(key);
    this.debounceBuckets.delete(key);
    if (!entry?.resolvers.length) return;

    // Ne lance qu'une fois ; tous les awaiters reçoivent le même résultat
    const { run } = entry.resolvers[entry.resolvers.length - 1];
    this.schedule(run, { priority })
      .then((value) => {
        for (const r of entry.resolvers) r.resolve(value);
      })
      .catch((err) => {
        for (const r of entry.resolvers) r.reject(err);
      });
  }

  async #drain() {
    if (this.running) return;
    this.running = true;

    try {
      while (this.queue.length) {
        if (this.isPaused()) {
          // Pendant une pause, on laisse les interactive passer au compte-gouttes
          // seulement si l'utilisateur force (déjà en tête). Sinon on attend.
          const next = this.queue[0];
          if (!next || next.priority !== 'interactive') break;
        }

        const item = this.queue.shift();
        if (!item) break;

        const minInterval =
          item.priority === 'interactive'
            ? this.options.interactiveMinIntervalMs
            : this.options.backgroundMinIntervalMs;

        const elapsed = Date.now() - this.lastStartAt;
        const jitter = Math.floor(Math.random() * this.options.jitterMs);
        const wait = Math.max(0, minInterval + jitter - elapsed);
        if (wait > 0) await sleep(wait);

        // Re-check pause après attente
        if (this.isPaused() && item.priority === 'background') {
          item.reject(
            Object.assign(new Error('vinted_paused'), {
              code: 'vinted_paused',
              reason: this.pauseReason,
              until: this.pausedUntil,
            }),
          );
          continue;
        }

        this.lastStartAt = Date.now();
        try {
          item.resolve(await item.run());
        } catch (err) {
          item.reject(err);
        }
      }
    } finally {
      this.running = false;
      if (this.queue.length && !this.isPaused()) {
        queueMicrotask(() => this.#drain());
      }
    }
  }

  #emit() {
    const state = this.getPauseState();
    for (const fn of this.listeners) {
      try {
        fn(state);
      } catch {
        /* ignore */
      }
    }
  }
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

/** Instance partagée (content-script / overlay). */
export const vintedLimiter = new VintedRateLimiter();
