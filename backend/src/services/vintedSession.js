/**
 * Session Vinted — mode PUBLIC par défaut.
 *
 * Les endpoints /api/v2/items, /users, /catalog sont publics :
 * pas besoin de compte ni de proxy. On envoie juste des headers navigateur.
 *
 * Optionnel :
 * - warm-up GET homepage pour récupérer d’éventuels cookies Set-Cookie
 * - VINTED_STEALTH=1 → Puppeteer stealth (si DataDome bloque ton IP)
 */

import { proxyManager } from './proxyManager.js';

const DOMAIN = process.env.VINTED_DOMAIN || 'vinted.fr';
const ORIGIN = `https://www.${DOMAIN}`;
const SESSION_TTL_MS = Number(process.env.VINTED_SESSION_TTL_MS) || 30 * 60 * 1000;
const USE_STEALTH = process.env.VINTED_STEALTH === '1';

const DEFAULT_UA =
  process.env.VINTED_UA ||
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';

/**
 * @typedef {object} VintedSessionData
 * @property {string} cookieHeader
 * @property {Array<{name:string,value:string,domain?:string}>} cookies
 * @property {string} userAgent
 * @property {string} acceptLanguage
 * @property {string|null} csrfToken
 * @property {string|null} anonId
 * @property {import('./proxyManager.js').ParsedProxy|null} proxy
 * @property {number} createdAt
 * @property {number} expiresAt
 * @property {'public'|'stealth'} mode
 */

/** @type {VintedSessionData|null} */
let currentSession = null;
/** @type {Promise<VintedSessionData>|null} */
let refreshPromise = null;

/**
 * @param {{ force?: boolean }} [opts]
 */
export async function getVintedSession(opts = {}) {
  const now = Date.now();
  if (
    !opts.force &&
    currentSession &&
    currentSession.expiresAt > now + 30_000
  ) {
    return currentSession;
  }

  if (refreshPromise) return refreshPromise;

  refreshPromise = (USE_STEALTH ? createStealthSession() : createPublicSession())
    .then((session) => {
      currentSession = session;
      return session;
    })
    .finally(() => {
      refreshPromise = null;
    });

  return refreshPromise;
}

export function invalidateVintedSession() {
  console.warn('[vintedSession] invalidate');
  if (currentSession?.proxy) {
    proxyManager.markBad(currentSession.proxy);
  }
  currentSession = null;
}

/**
 * Session publique : headers navigateur + cookies homepage (si dispo).
 * @returns {Promise<VintedSessionData>}
 */
async function createPublicSession() {
  const now = Date.now();
  /** @type {VintedSessionData} */
  const session = {
    cookieHeader: '',
    cookies: [],
    userAgent: DEFAULT_UA,
    acceptLanguage: 'fr-FR,fr;q=0.9,en-US;q=0.8,en;q=0.7',
    csrfToken: null,
    anonId: null,
    proxy: null,
    createdAt: now,
    expiresAt: now + SESSION_TTL_MS,
    mode: 'public',
  };

  // Warm-up soft : une visite homepage pour Set-Cookie (anon_id, access_token_web…)
  try {
    const res = await fetch(`${ORIGIN}/`, {
      method: 'GET',
      redirect: 'follow',
      headers: {
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': session.acceptLanguage,
        'User-Agent': session.userAgent,
        'Cache-Control': 'no-cache',
      },
      signal: AbortSignal.timeout(12_000),
    });

    applySetCookies(session, getSetCookieList(res));

    console.log(
      `[vintedSession] public OK (${session.cookies.length} cookie(s) homepage)`,
    );
  } catch (err) {
    console.warn(
      '[vintedSession] warm-up homepage échoué — on continue sans cookies',
      err instanceof Error ? err.message : err,
    );
  }

  return session;
}

/**
 * Applique des Set-Cookie dans la session (gère Max-Age=-1 / overwrite).
 * @param {VintedSessionData} session
 * @param {string[]} setCookieLines
 */
function applySetCookies(session, setCookieLines) {
  /** @type {Map<string, string>} */
  const jar = new Map(session.cookies.map((c) => [c.name, c.value]));

  for (const line of setCookieLines) {
    const parts = String(line).split(';').map((p) => p.trim());
    const [pair] = parts;
    const eq = pair.indexOf('=');
    if (eq < 0) continue;
    const name = pair.slice(0, eq).trim();
    const value = pair.slice(eq + 1).trim();

    const attrs = Object.fromEntries(
      parts.slice(1).map((a) => {
        const i = a.indexOf('=');
        if (i < 0) return [a.toLowerCase(), '1'];
        return [a.slice(0, i).toLowerCase(), a.slice(i + 1)];
      }),
    );

    // Expiration / suppression
    if (attrs['max-age'] === '-1' || attrs['max-age'] === '0' || value === '') {
      jar.delete(name);
      continue;
    }

    jar.set(name, value);
  }

  session.cookies = [...jar.entries()].map(([name, value]) => ({ name, value }));
  session.cookieHeader = session.cookies
    .map((c) => `${c.name}=${c.value}`)
    .join('; ');
  session.anonId = jar.get('anon_id') || null;
}

/**
 * Mode optionnel Puppeteer (VINTED_STEALTH=1).
 */
async function createStealthSession() {
  if (!proxyManager.loaded) await proxyManager.load();
  const proxy = proxyManager.hasProxies() ? proxyManager.next() : null;

  console.log(
    `[vintedSession] stealth bootstrap${proxy ? ` via ${proxy.server}` : ''}…`,
  );

  const extra = await import('puppeteer-extra');
  const puppeteer = extra.default;
  const stealthMod = await import('puppeteer-extra-plugin-stealth');
  puppeteer.use(stealthMod.default());

  const browser = await puppeteer.launch({
    headless: process.env.VINTED_HEADLESS === '0' ? false : 'new',
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-blink-features=AutomationControlled',
      '--lang=fr-FR,fr',
      ...proxyManager.toPuppeteerArgs(proxy),
    ],
    ignoreHTTPSErrors: true,
  });

  try {
    const page = await browser.newPage();
    if (proxy?.username) {
      await page.authenticate({
        username: proxy.username,
        password: proxy.password || '',
      });
    }
    await page.setViewport({ width: 1365, height: 900 });
    await page.setExtraHTTPHeaders({
      'Accept-Language': 'fr-FR,fr;q=0.9,en-US;q=0.8,en;q=0.7',
    });
    await page.goto(`${ORIGIN}/`, {
      waitUntil: 'domcontentloaded',
      timeout: 60_000,
    });
    await sleep(800 + Math.random() * 800);

    const cookies = await page.cookies();
    const userAgent = await page.evaluate(() => navigator.userAgent);
    const now = Date.now();

    return {
      cookieHeader: cookies.map((c) => `${c.name}=${c.value}`).join('; '),
      cookies: cookies.map((c) => ({
        name: c.name,
        value: c.value,
        domain: c.domain,
      })),
      userAgent,
      acceptLanguage: 'fr-FR,fr;q=0.9,en-US;q=0.8,en;q=0.7',
      csrfToken: null,
      anonId: cookies.find((c) => c.name === 'anon_id')?.value || null,
      proxy,
      createdAt: now,
      expiresAt: now + SESSION_TTL_MS,
      mode: /** @type {'stealth'} */ ('stealth'),
    };
  } finally {
    await browser.close().catch(() => {});
  }
}

/** @param {Response} res */
function getSetCookieList(res) {
  // Node 18+ : getSetCookie() ; fallback headers.get
  const h = /** @type {any} */ (res.headers);
  if (typeof h.getSetCookie === 'function') {
    return h.getSetCookie();
  }
  const single = res.headers.get('set-cookie');
  return single ? [single] : [];
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

export function getSessionOrigin() {
  return ORIGIN;
}

export function getSessionDomain() {
  return DOMAIN;
}
