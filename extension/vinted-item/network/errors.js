/**
 * Erreurs Vinted réseau + détection anti-bot / rate-limit.
 */

export class VintedNetworkError extends Error {
  /**
   * @param {string} code
   * @param {object} [meta]
   */
  constructor(code, meta = {}) {
    super(code);
    this.name = 'VintedNetworkError';
    this.code = code;
    /** @type {number|undefined} */
    this.status = meta.status;
    /** @type {boolean} */
    this.isRateLimited = Boolean(meta.isRateLimited);
    /** @type {boolean} */
    this.isChallenge = Boolean(meta.isChallenge);
    /** @type {number|undefined} */
    this.retryAfterMs = meta.retryAfterMs;
    this.bodySnippet = meta.bodySnippet;
  }
}

const CHALLENGE_PATTERNS = [
  /captcha/i,
  /challenge-platform/i,
  /cf-browser-verification/i,
  /cf-challenge/i,
  /datadome/i,
  /px-captcha/i,
  /access.?denied/i,
  /unusual.?traffic/i,
  /verify you are human/i,
  /security check/i,
];

/**
 * @param {Response} response
 * @param {string} [bodyText]
 */
export function classifyVintedResponse(response, bodyText = '') {
  const status = response.status;
  const retryAfterHeader = response.headers.get('retry-after');
  const retryAfterMs = parseRetryAfterMs(retryAfterHeader);

  if (status === 429) {
    return {
      isRateLimited: true,
      isChallenge: false,
      retryAfterMs: retryAfterMs ?? 60_000,
      code: 'vinted_rate_limited',
    };
  }

  // 403 + page challenge / soft-bot HTML
  const snippet = bodyText.slice(0, 4000);
  const challengeHit = CHALLENGE_PATTERNS.some((re) => re.test(snippet));
  if (status === 403 || status === 503 || challengeHit) {
    const looksLikeHtml = /^\s*</.test(snippet) || /<!DOCTYPE/i.test(snippet);
    if (challengeHit || (status === 403 && looksLikeHtml)) {
      return {
        isRateLimited: false,
        isChallenge: true,
        retryAfterMs: retryAfterMs ?? 120_000,
        code: 'vinted_security_challenge',
      };
    }
  }

  if (!response.ok) {
    return {
      isRateLimited: false,
      isChallenge: false,
      retryAfterMs: undefined,
      code: `vinted_http_${status}`,
    };
  }

  return null;
}

/**
 * @param {string|null} value
 * @returns {number|undefined}
 */
function parseRetryAfterMs(value) {
  if (!value) return undefined;
  const asInt = Number.parseInt(value, 10);
  if (!Number.isNaN(asInt)) return asInt * 1000;
  const date = Date.parse(value);
  if (!Number.isNaN(date)) return Math.max(0, date - Date.now());
  return undefined;
}
