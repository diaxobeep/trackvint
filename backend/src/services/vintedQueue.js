/**
 * File d'attente Vinted — concurrency 1 + jitter 1–3s.
 * Pause globale sur 429 / challenge DataDome.
 */

const DEFAULTS = {
  minDelayMs: Number(process.env.VINTED_MIN_DELAY_MS) || 1_000,
  maxDelayMs: Number(process.env.VINTED_MAX_DELAY_MS) || 3_000,
  concurrency: 1,
};

/**
 * @typedef {object} QueueJob
 * @property {() => Promise<any>} run
 * @property {(v: any) => void} resolve
 * @property {(e: any) => void} reject
 * @property {string} [label]
 */

export class VintedQueue {
  /**
   * @param {Partial<typeof DEFAULTS>} [opts]
   */
  constructor(opts = {}) {
    this.opts = { ...DEFAULTS, ...opts };
    /** @type {QueueJob[]} */
    this.queue = [];
    this.active = 0;
    this.pausedUntil = 0;
    this.pauseReason = /** @type {string|null} */ (null);
    this.lastRunAt = 0;
  }

  isPaused() {
    return Date.now() < this.pausedUntil;
  }

  getState() {
    return {
      pending: this.queue.length,
      active: this.active,
      paused: this.isPaused(),
      pausedUntil: this.pausedUntil,
      reason: this.pauseReason,
    };
  }

  /**
   * @param {number} durationMs
   * @param {string} reason
   */
  pause(durationMs, reason = 'rate_limit') {
    this.pausedUntil = Math.max(
      this.pausedUntil,
      Date.now() + Math.max(5_000, durationMs),
    );
    this.pauseReason = reason;
    console.warn(
      `[vintedQueue] PAUSE ${Math.round(durationMs / 1000)}s (${reason})`,
    );
    const wait = this.pausedUntil - Date.now();
    setTimeout(() => {
      if (!this.isPaused()) {
        this.pauseReason = null;
        this.#drain();
      }
    }, wait + 20);
  }

  resume() {
    this.pausedUntil = 0;
    this.pauseReason = null;
    this.#drain();
  }

  /**
   * @template T
   * @param {() => Promise<T>} run
   * @param {{ label?: string }} [meta]
   * @returns {Promise<T>}
   */
  enqueue(run, meta = {}) {
    return new Promise((resolve, reject) => {
      this.queue.push({ run, resolve, reject, label: meta.label });
      this.#drain();
    });
  }

  async #drain() {
    if (this.active >= this.opts.concurrency) return;
    if (this.isPaused()) return;
    const job = this.queue.shift();
    if (!job) return;

    this.active += 1;
    try {
      await this.#waitSpacing();
      if (this.isPaused()) {
        // Remet en tête si pause pendant l'attente
        this.queue.unshift(job);
        return;
      }
      const result = await job.run();
      job.resolve(result);
    } catch (err) {
      job.reject(err);
    } finally {
      this.active -= 1;
      this.lastRunAt = Date.now();
      setImmediate(() => this.#drain());
    }
  }

  async #waitSpacing() {
    const elapsed = Date.now() - this.lastRunAt;
    const base =
      this.opts.minDelayMs +
      Math.random() * (this.opts.maxDelayMs - this.opts.minDelayMs);
    const wait = Math.max(0, base - elapsed);
    if (wait > 0) await sleep(wait);
  }
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

export const vintedQueue = new VintedQueue();
