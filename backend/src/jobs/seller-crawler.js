/**
 * =============================================================================
 * Autovint / TrackVint — Seller Crawler (worker 24/7)
 * =============================================================================
 *
 * Rôle : actualiser en arrière-plan le dressing des vendeurs Vinted suivis.
 *
 * Principes :
 * 1. JSON only — JAMAIS de HTML catalogue / dressing (payload ciblé < ~10 Ko
 *    avec per_page=20). Seul le warm-up guest tape la home pour les cookies.
 * 2. Furtivité — Axios + https-proxy-agent + headers navigateur réalistes.
 * 3. Résilience — 429 / 403 (DataDome) → pause, rotation proxy, retry ;
 *    le worker ne crash JAMAIS.
 *
 * Boucle : délai aléatoire 10–30 s entre vendeurs (pas de cron rigide).
 *
 * Exports utilisés par server.js :
 *   - startSellerCrawler()
 *   - stopSellerCrawler()
 */

import axios from 'axios';
import { HttpsProxyAgent } from 'https-proxy-agent';
import { store } from '../data/store.js';
import { proxyManager } from '../services/proxyManager.js';

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

/** Domaine Vinted cible (ex: vinted.fr). */
const VINTED_DOMAIN = process.env.VINTED_DOMAIN || 'vinted.fr';

/** Origine absolue. */
const VINTED_ORIGIN = `https://www.${VINTED_DOMAIN}`;

/**
 * Items par page API — volontairement bas pour rester sous ~10 Ko JSON.
 * Vinted renvoie déjà des objets denses ; 20 est un bon compromis.
 */
const PER_PAGE = Number(process.env.CRAWLER_PER_PAGE) || 20;

/** Délai min / max entre deux vendeurs (ms). */
const DELAY_MIN_MS = Number(process.env.CRAWLER_DELAY_MIN_MS) || 10_000;
const DELAY_MAX_MS = Number(process.env.CRAWLER_DELAY_MAX_MS) || 30_000;

/** Pause globale après 429 (ms). */
const PAUSE_429_MS = Number(process.env.CRAWLER_PAUSE_429_MS) || 60_000;

/** Pause globale après 403 / DataDome (ms). */
const PAUSE_403_MS = Number(process.env.CRAWLER_PAUSE_403_MS) || 120_000;

/** TTL du cookie invité en mémoire (ms). */
const GUEST_TTL_MS = Number(process.env.CRAWLER_GUEST_TTL_MS) || 25 * 60 * 1000;

/** User-Agent « desktop Chrome » stable — pas de spoof exotique. */
const USER_AGENT =
  process.env.VINTED_UA ||
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';

/** Fallback proxies depuis env (CSV) si proxyManager vide. */
const ENV_PROXY_LIST = String(process.env.VINTED_PROXIES || '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

// ---------------------------------------------------------------------------
// État en mémoire (process)
// ---------------------------------------------------------------------------

/** @type {{ cookieHeader: string, anonId: string|null, fetchedAt: number }|null} */
let guestSession = null;

/** Timestamp jusqu’auquel le scheduler est en pause. */
let pausedUntil = 0;

/** Raison de la pause (logs). */
let pauseReason = /** @type {string|null} */ (null);

/** Handle du prochain tick (setTimeout). */
let loopTimer = /** @type {ReturnType<typeof setTimeout>|null} */ (null);

/** Garde anti-réentrance. */
let tickRunning = false;

/** Flag stop demandé. */
let stopped = true;

// ---------------------------------------------------------------------------
// 1. GESTION DES REQUÊTES (Axios + Proxys)
// ---------------------------------------------------------------------------

/**
 * Headers HTTP standards d’un navigateur sur Vinted (requête XHR JSON).
 * @param {{ cookie?: string, referer?: string }} [extra]
 */
function buildBrowserHeaders(extra = {}) {
  /** @type {Record<string, string>} */
  const headers = {
    Accept: 'application/json, text/plain, */*',
    'Accept-Language': 'fr-FR,fr;q=0.9,en-US;q=0.8,en;q=0.7',
    'User-Agent': USER_AGENT,
    Origin: VINTED_ORIGIN,
    Referer: extra.referer || `${VINTED_ORIGIN}/`,
    'Cache-Control': 'no-cache',
    Pragma: 'no-cache',
    // Indique une requête « same-origin » type SPA — DataDome regarde ça.
    'Sec-Fetch-Dest': 'empty',
    'Sec-Fetch-Mode': 'cors',
    'Sec-Fetch-Site': 'same-origin',
  };

  if (extra.cookie) {
    headers.Cookie = extra.cookie;
  }

  return headers;
}

/**
 * Retourne une URL de proxy aléatoire / rotative.
 *
 * Sources :
 * 1. proxyManager (VINTED_PROXIES + data/proxies.json)
 * 2. fallback ENV_PROXY_LIST
 *
 * @returns {string|null} URL type `http://user:pass@host:port`
 */
export function getRandomProxy() {
  // Round-robin via proxyManager (respecte les cooldowns)
  if (proxyManager.loaded && proxyManager.hasProxies()) {
    const parsed = proxyManager.next();
    const url = proxyManager.toUrl(parsed);
    if (url) return url;
  }

  if (!ENV_PROXY_LIST.length) return null;
  const pick = ENV_PROXY_LIST[Math.floor(Math.random() * ENV_PROXY_LIST.length)];
  return pick.includes('://') ? pick : `http://${pick}`;
}

/**
 * Construit une instance Axios préconfigurée (JSON, timeout, proxy optionnel).
 * Une nouvelle instance par requête permet de changer de proxy facilement.
 *
 * @param {{ proxyUrl?: string|null, cookie?: string }} [opts]
 */
export function createVintedClient(opts = {}) {
  const proxyUrl = opts.proxyUrl ?? getRandomProxy();

  /** @type {import('axios').CreateAxiosDefaults} */
  const config = {
    baseURL: VINTED_ORIGIN,
    timeout: 20_000,
    // On gère 4xx nous-mêmes (pas de throw axios automatique sur 403/429)
    validateStatus: () => true,
    headers: buildBrowserHeaders({ cookie: opts.cookie }),
    // Ne jamais suivre de redirects HTML lourds en aveugle sur l’API
    maxRedirects: 3,
    // Réponse max — garde-fou anti payload HTML surprise
    maxContentLength: 256 * 1024,
    maxBodyLength: 64 * 1024,
  };

  if (proxyUrl) {
    const agent = new HttpsProxyAgent(proxyUrl);
    config.httpAgent = agent;
    config.httpsAgent = agent;
    // Axios ne doit pas utiliser le proxy env système en double
    config.proxy = false;
  }

  const client = axios.create(config);

  // Métadonnées pour logs / rotation
  client.defaults.meta = { proxyUrl: proxyUrl || null };

  return client;
}

// ---------------------------------------------------------------------------
// 2. GESTION DU TOKEN INVITÉ (Guest Cookie)
// ---------------------------------------------------------------------------

/**
 * Warm-up : GET homepage Vinted via proxy pour récupérer `set-cookie`
 * (notamment `anon_id` / cookies session anonymes).
 *
 * ⚠️ Seul endroit où l’on touche du HTML — uniquement pour les cookies,
 * jamais pour parser le dressing.
 *
 * @param {{ force?: boolean }} [opts]
 * @returns {Promise<{ cookieHeader: string, anonId: string|null }>}
 */
export async function fetchGuestToken(opts = {}) {
  const now = Date.now();
  if (
    !opts.force &&
    guestSession &&
    now - guestSession.fetchedAt < GUEST_TTL_MS &&
    guestSession.cookieHeader
  ) {
    return {
      cookieHeader: guestSession.cookieHeader,
      anonId: guestSession.anonId,
    };
  }

  const proxyUrl = getRandomProxy();
  const client = createVintedClient({ proxyUrl });

  console.log(
    `[autovint-crawler] guest warm-up${proxyUrl ? ` via proxy` : ' (IP directe)'}…`,
  );

  try {
    const res = await client.get('/', {
      headers: {
        ...buildBrowserHeaders(),
        Accept:
          'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': 'none',
        'Upgrade-Insecure-Requests': '1',
      },
      // On ne stocke PAS le body HTML — cookies uniquement
      responseType: 'text',
      // Axios expose set-cookie via headers
      maxRedirects: 5,
    });

    if (res.status === 429 || res.status === 403) {
      markProxyBad(proxyUrl, res.status);
      pauseJob(res.status === 429 ? PAUSE_429_MS : PAUSE_403_MS, `guest_${res.status}`);
      throw new Error(`guest_warmup_${res.status}`);
    }

    const setCookie = normalizeSetCookie(res.headers['set-cookie']);
    const cookieHeader = mergeCookieHeader(guestSession?.cookieHeader, setCookie);
    const anonId = extractCookieValue(cookieHeader, 'anon_id');

    if (!cookieHeader) {
      throw new Error('guest_no_set_cookie');
    }

    guestSession = {
      cookieHeader,
      anonId,
      fetchedAt: Date.now(),
    };

    console.log(
      `[autovint-crawler] guest OK (anon_id=${anonId ? 'yes' : 'no'}, cookies=${cookieHeader.split(';').length})`,
    );

    return { cookieHeader, anonId };
  } catch (err) {
    // Ne jamais faire planter le process
    console.warn(
      `[autovint-crawler] fetchGuestToken failed:`,
      err?.message || err,
    );
    // Si on a encore une vieille session, on la réutilise en dégradé
    if (guestSession?.cookieHeader) {
      return {
        cookieHeader: guestSession.cookieHeader,
        anonId: guestSession.anonId,
      };
    }
    throw err;
  }
}

/**
 * Invalide le guest token (après 403 / session pourrie).
 */
export function invalidateGuestToken() {
  guestSession = null;
}

// ---------------------------------------------------------------------------
// 3. LOGIQUE DU CRAWLER — checkSellerUpdates
// ---------------------------------------------------------------------------

/**
 * @typedef {object} SlimItem
 * @property {string} id
 * @property {number|null} price        Prix en euros (si dispo)
 * @property {'active'|'sold'|'unknown'} status
 * @property {string|null} createdAt    Date d’ajout ISO si dispo
 * @property {string|null} title
 * @property {string|null} url
 */

/**
 * @typedef {object} SellerDiff
 * @property {string} sellerId
 * @property {SlimItem[]} newItems
 * @property {Array<{ id: string, oldPrice: number|null, newPrice: number|null, title?: string|null }>} priceChanges
 * @property {SlimItem[]} disappeared   Probables ventes (plus dans le dressing actif)
 * @property {SlimItem[]} current       Snapshot slim de la page 1
 * @property {number} fetchedAt
 */

/**
 * Interroge l’API JSON publique du dressing vendeur et calcule les diffs.
 *
 * Endpoint (léger) :
 *   GET /api/v2/users/:id/items?page=1&per_page=20&order=newest_first
 *
 * @param {string|number} sellerId
 * @param {{ domain?: string }} [opts]
 * @returns {Promise<SellerDiff>}
 */
export async function checkSellerUpdates(sellerId, opts = {}) {
  const id = String(sellerId);
  const domain = opts.domain || VINTED_DOMAIN;

  // --- Pause globale ? ---
  if (Date.now() < pausedUntil) {
    const wait = pausedUntil - Date.now();
    console.log(
      `[autovint-crawler] job en pause encore ${Math.ceil(wait / 1000)}s (${pauseReason})`,
    );
    return emptyDiff(id);
  }

  // --- Guest cookie ---
  let guest;
  try {
    guest = await fetchGuestToken();
  } catch {
    // Retry une fois après rotation proxy + courte pause
    await sleep(2_000 + Math.random() * 2_000);
    try {
      guest = await fetchGuestToken({ force: true });
    } catch {
      pauseJob(PAUSE_403_MS, 'guest_unavailable');
      return emptyDiff(id);
    }
  }

  const proxyUrl = getRandomProxy();
  const client = createVintedClient({
    proxyUrl,
    cookie: guest.cookieHeader,
  });

  const path = `/api/v2/users/${encodeURIComponent(id)}/items`;
  const params = {
    page: 1,
    per_page: PER_PAGE,
    order: 'newest_first',
  };

  let res;
  try {
    res = await client.get(path, {
      params,
      headers: {
        ...buildBrowserHeaders({
          cookie: guest.cookieHeader,
          referer: `${VINTED_ORIGIN}/member/${id}`,
        }),
        ...(guest.anonId ? { 'X-Anon-Id': guest.anonId } : {}),
      },
    });
  } catch (err) {
    // Erreur réseau / timeout — soft fail
    console.warn(
      `[autovint-crawler] ${id} network:`,
      err?.message || err,
    );
    markProxyBad(proxyUrl, 0);
    return emptyDiff(id);
  }

  // --- Résilience 429 / 403 ---
  if (res.status === 429) {
    console.warn(`[autovint-crawler] 429 rate-limit sur seller ${id}`);
    markProxyBad(proxyUrl, 429);
    invalidateGuestToken();
    pauseJob(PAUSE_429_MS, '429');
    // Le scheduler reprendra plus tard ; on ne throw pas
    return emptyDiff(id);
  }

  if (res.status === 403 || res.status === 401) {
    console.warn(
      `[autovint-crawler] ${res.status} challenge/DataDome sur seller ${id}`,
    );
    markProxyBad(proxyUrl, res.status);
    invalidateGuestToken();
    pauseJob(PAUSE_403_MS, String(res.status));
    // Tente un refresh guest en arrière-plan (best-effort)
    void fetchGuestToken({ force: true }).catch(() => {});
    return emptyDiff(id);
  }

  if (res.status !== 200 || !res.data) {
    console.warn(
      `[autovint-crawler] ${id} unexpected status ${res.status}`,
    );
    return emptyDiff(id);
  }

  // Garde-fou taille payload (log si > 10 Ko pour monitoring)
  const rawSize = typeof res.data === 'string'
    ? res.data.length
    : Buffer.byteLength(JSON.stringify(res.data), 'utf8');
  if (rawSize > 10_000) {
    console.warn(
      `[autovint-crawler] ${id} payload ${rawSize} B > 10 Ko — envisager per_page plus bas`,
    );
  }

  const rawItems = Array.isArray(res.data.items) ? res.data.items : [];
  const current = rawItems.map((it) => slimItem(it, domain));

  // -------------------------------------------------------------------------
  // TODO: DB Query — charger le snapshot précédent du vendeur
  // Exemple :
  //   const previousRows = await db.items.findMany({ where: { sellerId: id } });
  // Pour l’instant on s’appuie sur le store mémoire / disque TrackVint.
  // -------------------------------------------------------------------------
  // TODO: DB Query
  const previousRows = store.getListingsForSeller(id, { includeActive: true });

  /** @type {Map<string, { price: number|null, status: string, title?: string|null }>} */
  const previousMap = new Map();
  for (const row of previousRows) {
    const itemId = String(row.vintedId || row.id);
    previousMap.set(itemId, {
      // store : prix parfois en centimes
      price: normalizeStoredPrice(row),
      status: row.status || 'active',
      title: row.title || null,
    });
  }

  /** @type {SlimItem[]} */
  const newItems = [];
  /** @type {SellerDiff['priceChanges']} */
  const priceChanges = [];

  const currentIds = new Set(current.map((i) => i.id));

  for (const item of current) {
    const prev = previousMap.get(item.id);
    if (!prev) {
      newItems.push(item);
      continue;
    }
    if (
      prev.price != null &&
      item.price != null &&
      Number(prev.price) !== Number(item.price)
    ) {
      priceChanges.push({
        id: item.id,
        oldPrice: prev.price,
        newPrice: item.price,
        title: item.title || prev.title,
      });
    }
  }

  // Articles actifs en base absents de la page 1 → candidates « vendus »
  // (approximation : page 1 only ; un article page 2+ pourrait faux-positif)
  /** @type {SlimItem[]} */
  const disappeared = [];
  for (const [itemId, prev] of previousMap) {
    if (prev.status !== 'active') continue;
    if (currentIds.has(itemId)) continue;
    // Si on n’a que PER_PAGE items, un disparu hors page 1 n’est pas fiable
    // → on ne marque « sold » que si le dressing renvoyé est « court »
    //    ou si l’item était dans le top récent (heuristique soft).
    disappeared.push({
      id: itemId,
      price: prev.price,
      status: 'sold',
      createdAt: null,
      title: prev.title || null,
      url: `https://www.${domain}/items/${itemId}`,
    });
  }

  // -------------------------------------------------------------------------
  // TODO: DB Query — persister newItems / priceChanges / disappeared
  // Exemple :
  //   await db.items.createMany({ data: newItems });
  //   await db.items.updateMany({ … priceChanges … });
  //   await db.items.updateMany({ where: { id: { in: disappeared } }, data: { status: 'sold' } });
  // -------------------------------------------------------------------------
  // TODO: DB Query
  applyDiffToStore(id, domain, current, newItems, priceChanges, disappeared);

  if (newItems.length || priceChanges.length || disappeared.length) {
    console.log(
      `[autovint-crawler] ${id}: +${newItems.length} new, ~${priceChanges.length} price, -${disappeared.length} gone`,
    );
  }

  return {
    sellerId: id,
    newItems,
    priceChanges,
    disappeared,
    current,
    fetchedAt: Date.now(),
  };
}

/**
 * Persistance temporaire via le store TrackVint (remplacé plus tard par la vraie DB).
 * @param {string} sellerId
 * @param {string} domain
 * @param {SlimItem[]} current
 * @param {SlimItem[]} newItems
 * @param {SellerDiff['priceChanges']} priceChanges
 * @param {SlimItem[]} disappeared
 */
function applyDiffToStore(
  sellerId,
  domain,
  current,
  newItems,
  priceChanges,
  disappeared,
) {
  try {
    const activeRows = current.map((it) => ({
      vintedId: it.id,
      title: it.title,
      brandName: null,
      price: it.price ?? 0,
      priceIsEuros: true,
      domain,
      photos: [],
      favouriteCount: 0,
      status: 'active',
      soldAt: null,
      url: it.url,
      createdAt: it.createdAt,
    }));

    // TODO: DB Query — upsert actifs
    store.upsertSellerListings(sellerId, activeRows);

    if (disappeared.length && current.length < PER_PAGE) {
      // Heuristique : dressing court → disparus = probablement vendus
      // TODO: DB Query — mark sold
      store.upsertSellerListings(
        sellerId,
        disappeared.map((it) => ({
          vintedId: it.id,
          title: it.title,
          brandName: null,
          price: it.price ?? 0,
          priceIsEuros: true,
          domain,
          photos: [],
          favouriteCount: 0,
          status: 'sold',
          soldAt: new Date().toISOString(),
          url: it.url,
        })),
      );
    }

    // priceChanges déjà reflétés via upsert des `current`
    void newItems;
    void priceChanges;
  } catch (err) {
    console.warn(
      `[autovint-crawler] store persist failed:`,
      err?.message || err,
    );
  }
}

/**
 * Normalise un item API Vinted → slim.
 * @param {any} it
 * @param {string} domain
 * @returns {SlimItem}
 */
function slimItem(it, domain) {
  const id = String(it.id);
  const priceRaw =
    it.price_numeric ??
    it.price?.amount ??
    it.total_item_price?.amount ??
    null;
  const price =
    priceRaw == null || priceRaw === ''
      ? null
      : Number(priceRaw);

  // L’endpoint /items du dressing = articles encore en vente
  const status = it.is_closed || it.is_sold ? 'sold' : 'active';

  const createdAt =
    it.created_at_ts
      ? new Date(Number(it.created_at_ts) * 1000).toISOString()
      : it.created_at || it.photo?.high_resolution?.timestamp
        ? new Date(
            Number(it.photo.high_resolution.timestamp) * 1000,
          ).toISOString()
        : null;

  return {
    id,
    price: Number.isFinite(price) ? price : null,
    status,
    createdAt,
    title: it.title ? String(it.title).slice(0, 200) : null,
    url: it.url || `https://www.${domain}/items/${id}`,
  };
}

function normalizeStoredPrice(row) {
  if (row == null || row.price == null) return null;
  const n = Number(row.price);
  if (!Number.isFinite(n)) return null;
  // Heuristique : valeurs > 500 sans flag euros → probablement centimes
  if (row.priceIsEuros) return n;
  if (n > 500) return Math.round(n) / 100;
  return n;
}

function emptyDiff(sellerId) {
  return {
    sellerId: String(sellerId),
    newItems: [],
    priceChanges: [],
    disappeared: [],
    current: [],
    fetchedAt: Date.now(),
  };
}

// ---------------------------------------------------------------------------
// 4. BOUCLE PRINCIPALE (Scheduler dynamique)
// ---------------------------------------------------------------------------

/**
 * Démarre le worker 24/7 (idempotent).
 */
export function startSellerCrawler() {
  if (!stopped && loopTimer) {
    console.log('[autovint-crawler] already running');
    return;
  }
  stopped = false;
  console.log(
    `[autovint-crawler] started — delay ${DELAY_MIN_MS / 1000}–${DELAY_MAX_MS / 1000}s, per_page=${PER_PAGE}, domain=${VINTED_DOMAIN}`,
  );

  // Premier tick légèrement différé (laisse le serveur finir son boot)
  scheduleNext(5_000 + Math.random() * 5_000);
}

/**
 * Arrête le worker (graceful).
 */
export function stopSellerCrawler() {
  stopped = true;
  if (loopTimer) {
    clearTimeout(loopTimer);
    loopTimer = null;
  }
  console.log('[autovint-crawler] stopped');
}

/**
 * Planifie le prochain cycle avec un délai aléatoire.
 * @param {number} [overrideMs]
 */
function scheduleNext(overrideMs) {
  if (stopped) return;
  if (loopTimer) clearTimeout(loopTimer);

  const base =
    overrideMs != null
      ? overrideMs
      : randomBetween(DELAY_MIN_MS, DELAY_MAX_MS);

  // Si on est en pause globale, on attend la fin de pause + jitter
  const pauseLeft = Math.max(0, pausedUntil - Date.now());
  const wait = pauseLeft > 0 ? pauseLeft + randomBetween(1_000, 5_000) : base;

  loopTimer = setTimeout(() => {
    void runLoopTick();
  }, wait);
}

/**
 * Un tour de boucle : 1 vendeur (round-robin via index en mémoire).
 * On traite **un vendeur par tick** pour étaler la charge (furtivité).
 */
let sellerCursor = 0;

async function runLoopTick() {
  if (stopped) return;
  if (tickRunning) {
    scheduleNext(2_000);
    return;
  }

  tickRunning = true;
  try {
    if (!proxyManager.loaded) {
      await proxyManager.load().catch(() => {});
    }

    // TODO: DB Query — liste des vendeurs suivis par les users SaaS
    //   const sellers = await db.trackedSellers.findMany({ where: { active: true } });
    // TODO: DB Query
    const sellers = store.getFavoriteSellers?.() || [];

    if (!sellers.length) {
      // Rien à faire — on rappelle plus tard sans spammer les logs
      scheduleNext(randomBetween(DELAY_MAX_MS, DELAY_MAX_MS * 2));
      return;
    }

    const seller = sellers[sellerCursor % sellers.length];
    sellerCursor = (sellerCursor + 1) % sellers.length;

    const sellerId = seller.vintedId || seller.id;
    if (!sellerId) {
      scheduleNext();
      return;
    }

    await checkSellerUpdates(sellerId, {
      domain: seller.domain || VINTED_DOMAIN,
    });
  } catch (err) {
    // Filet de sécurité absolu — le worker ne doit jamais mourir
    console.error(
      '[autovint-crawler] tick fatal (swallowed):',
      err?.message || err,
    );
    pauseJob(30_000, 'tick_error');
  } finally {
    tickRunning = false;
    scheduleNext();
  }
}

// ---------------------------------------------------------------------------
// Helpers — pause / proxy / cookies / timing
// ---------------------------------------------------------------------------

/**
 * Met le job en pause (les ticks suivants attendent).
 * @param {number} ms
 * @param {string} reason
 */
function pauseJob(ms, reason) {
  pausedUntil = Math.max(pausedUntil, Date.now() + ms);
  pauseReason = reason;
  console.warn(
    `[autovint-crawler] PAUSE ${Math.round(ms / 1000)}s — ${reason}`,
  );
}

/**
 * Signale un proxy défaillant au proxyManager.
 * @param {string|null|undefined} proxyUrl
 * @param {number} status
 */
function markProxyBad(proxyUrl, status) {
  if (!proxyUrl) return;
  const cooldown =
    status === 429 ? 10 * 60 * 1000 : status === 403 ? 15 * 60 * 1000 : 5 * 60 * 1000;
  try {
    proxyManager.markBad(proxyUrl, cooldown);
  } catch {
    /* ignore */
  }
}

/**
 * @param {string[]|string|undefined} setCookie
 * @returns {string[]}
 */
function normalizeSetCookie(setCookie) {
  if (!setCookie) return [];
  return Array.isArray(setCookie) ? setCookie : [setCookie];
}

/**
 * Fusionne d’anciens cookies avec de nouveaux `Set-Cookie`.
 * @param {string|undefined} existing
 * @param {string[]} setCookieLines
 */
function mergeCookieHeader(existing, setCookieLines) {
  /** @type {Map<string, string>} */
  const map = new Map();

  if (existing) {
    for (const part of existing.split(';')) {
      const [k, ...rest] = part.trim().split('=');
      if (k) map.set(k, rest.join('='));
    }
  }

  for (const line of setCookieLines) {
    const first = String(line).split(';')[0];
    const eq = first.indexOf('=');
    if (eq <= 0) continue;
    const name = first.slice(0, eq).trim();
    const value = first.slice(eq + 1).trim();
    if (name) map.set(name, value);
  }

  return [...map.entries()].map(([k, v]) => `${k}=${v}`).join('; ');
}

/**
 * @param {string} cookieHeader
 * @param {string} name
 */
function extractCookieValue(cookieHeader, name) {
  if (!cookieHeader) return null;
  const re = new RegExp(`(?:^|;\\s*)${name}=([^;]+)`, 'i');
  const m = cookieHeader.match(re);
  return m ? decodeURIComponent(m[1]) : null;
}

function randomBetween(min, max) {
  return Math.floor(min + Math.random() * (max - min + 1));
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

// ---------------------------------------------------------------------------
// API debug (optionnelle) — état runtime
// ---------------------------------------------------------------------------

export function getCrawlerState() {
  return {
    stopped,
    pausedUntil,
    pauseReason,
    pauseLeftMs: Math.max(0, pausedUntil - Date.now()),
    hasGuest: Boolean(guestSession?.cookieHeader),
    guestAgeMs: guestSession ? Date.now() - guestSession.fetchedAt : null,
    sellerCursor,
    perPage: PER_PAGE,
    domain: VINTED_DOMAIN,
  };
}

/**
 * Entrée dispatcher — crawl une liste de SellerTrackers.
 * @param {Array<{ vintedSellerId?: string, vintedId?: string }>} sellers
 */
export async function crawlSellerTrackers(sellers = []) {
  for (const s of sellers) {
    const id = s.vintedSellerId || s.vintedId;
    if (!id) continue;
    try {
      await checkSellerUpdates(String(id));
    } catch (err) {
      console.warn(`[seller-crawler] ${id}:`, err?.message || err);
    }
  }
}
