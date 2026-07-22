/**
 * Extraction des jetons d'authentification présents dans la page Vinted.
 * Nécessaires pour appeler l'API photos (upload pour recherche visuelle).
 */

/**
 * Récupère le jeton CSRF depuis la meta HTML ou les scripts inline.
 * @param {Document} [doc=document]
 * @returns {string|null}
 */
export function extractCsrfToken(doc = document) {
  // 1) Meta standard
  const metaToken = doc
    .querySelector('meta[name="csrf-token"]')
    ?.getAttribute('content');
  if (metaToken) return metaToken;

  // 2) Variable embarquée dans un <script> (payload Next / config)
  for (const script of doc.querySelectorAll('script')) {
    const text = script.textContent ?? '';
    if (!text.includes('CSRF_TOKEN')) continue;

    const match = text.match(/\\?"CSRF_TOKEN\\?"\s*:\s*\\?"([^"\\]+)\\?"/);
    if (match?.[1]) return match[1];
  }

  return null;
}

/**
 * Lit le cookie `anon_id` (identifiant anonyme Vinted).
 * @returns {string|null}
 */
export function extractAnonId() {
  const match = document.cookie.match(/(?:^|;\s*)anon_id=([^;]+)/);
  return match ? decodeURIComponent(match[1]) : null;
}
