/**
 * ProxyManager — rotation de proxys résidentiels / mobiles.
 *
 * Sources (dans l'ordre) :
 * 1. process.env.VINTED_PROXIES  → liste séparée par des virgules
 * 2. backend/data/proxies.json   → { "proxies": ["http://user:pass@host:port", ...] }
 *
 * Formats acceptés :
 * - http://user:pass@host:port
 * - socks5://user:pass@host:port
 * - host:port:user:pass  (format AdsPower / Dolphin-like)
 */

import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROXIES_FILE = path.resolve(__dirname, '../../data/proxies.json');

/** @typedef {{ raw: string, server: string, username?: string, password?: string, protocol: string }} ParsedProxy */

export class ProxyManager {
  constructor() {
    /** @type {ParsedProxy[]} */
    this.pool = [];
    this.index = 0;
    this.loaded = false;
    /** Proxys temporairement exclus (ban / 403 répétés) */
    /** @type {Map<string, number>} */
    this.cooldownUntil = new Map();
  }

  /**
   * Charge le pool (idempotent).
   */
  async load() {
    const fromEnv = String(process.env.VINTED_PROXIES || '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

    let fromFile = [];
    try {
      const raw = await readFile(PROXIES_FILE, 'utf8');
      const json = JSON.parse(raw);
      fromFile = Array.isArray(json?.proxies) ? json.proxies : [];
    } catch {
      /* optional */
    }

    this.pool = [...fromEnv, ...fromFile]
      .map((p) => parseProxy(p))
      .filter(Boolean);

    this.loaded = true;
    console.log(
      `[proxyManager] ${this.pool.length} proxy(s) chargé(s)${
        this.pool.length === 0 ? ' — mode direct (IP serveur)' : ''
      }`,
    );
    return this.pool.length;
  }

  hasProxies() {
    return this.pool.length > 0;
  }

  /**
   * Prochain proxy disponible (round-robin + skip cooldown).
   * @returns {ParsedProxy|null}
   */
  next() {
    if (!this.pool.length) return null;
    const now = Date.now();
    for (let i = 0; i < this.pool.length; i += 1) {
      const candidate = this.pool[this.index % this.pool.length];
      this.index += 1;
      const until = this.cooldownUntil.get(candidate.raw) || 0;
      if (until > now) continue;
      return candidate;
    }
    // Tous en cooldown → on prend le suivant quand même
    const fallback = this.pool[this.index % this.pool.length];
    this.index += 1;
    return fallback;
  }

  /**
   * Met un proxy en pause après un ban / challenge.
   * @param {ParsedProxy|string|null} proxy
   * @param {number} [ms]
   */
  markBad(proxy, ms = 15 * 60 * 1000) {
    if (!proxy) return;
    const key = typeof proxy === 'string' ? proxy : proxy.raw;
    this.cooldownUntil.set(key, Date.now() + ms);
    console.warn(`[proxyManager] cooldown ${ms}ms → ${redact(key)}`);
  }

  /**
   * Args Puppeteer pour ce proxy.
   * @param {ParsedProxy|null} proxy
   */
  toPuppeteerArgs(proxy) {
    if (!proxy) return [];
    return [`--proxy-server=${proxy.protocol}://${proxy.server}`];
  }

  /**
   * URL complète pour undici/fetch ProxyAgent si besoin.
   * @param {ParsedProxy|null} proxy
   */
  toUrl(proxy) {
    if (!proxy) return null;
    if (proxy.username) {
      return `${proxy.protocol}://${encodeURIComponent(proxy.username)}:${encodeURIComponent(proxy.password || '')}@${proxy.server}`;
    }
    return `${proxy.protocol}://${proxy.server}`;
  }
}

/**
 * @param {string} input
 * @returns {ParsedProxy|null}
 */
export function parseProxy(input) {
  const s = String(input || '').trim();
  if (!s) return null;

  // host:port:user:pass
  if (!/^[a-z]+:\/\//i.test(s) && s.split(':').length === 4) {
    const [host, port, username, password] = s.split(':');
    return {
      raw: s,
      protocol: 'http',
      server: `${host}:${port}`,
      username,
      password,
    };
  }

  try {
    const withProto = /^[a-z]+:\/\//i.test(s) ? s : `http://${s}`;
    const u = new URL(withProto);
    return {
      raw: s,
      protocol: u.protocol.replace(':', '') || 'http',
      server: u.host,
      username: u.username ? decodeURIComponent(u.username) : undefined,
      password: u.password ? decodeURIComponent(u.password) : undefined,
    };
  } catch {
    return null;
  }
}

function redact(raw) {
  return String(raw).replace(/\/\/([^:]+):([^@]+)@/, '//***:***@');
}

/** Singleton */
export const proxyManager = new ProxyManager();
