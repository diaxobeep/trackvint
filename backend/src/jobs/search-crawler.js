/**
 * Search crawler — scrape catalogues / recherches trackées.
 * Utilise le catalogue public Vinted (JSON) via vintedApi.
 */

import { store } from '../data/store.js';

/**
 * @param {Array<object>} trackers
 */
export async function crawlSearchTrackers(trackers = []) {
  if (!trackers.length) return;

  let fetchCatalog;
  try {
    ({ fetchCatalogItems: fetchCatalog } = await import('../services/vintedApi.js'));
  } catch {
    console.warn('[search-crawler] vintedApi indisponible');
    return;
  }

  for (const t of trackers) {
    try {
      const q = t.parsedFilters?.search_text || t.label || '';
      if (!q || typeof fetchCatalog !== 'function') continue;

      const items = await fetchCatalog({ q, perPage: 12 }).catch(() => null);
      const list = items?.items || items || [];
      // Snapshot : on enregistre les IDs vus ; disparition = vente (prochaine itération)
      for (const it of list.slice(0, 12)) {
        if (!it?.id && !it?.vintedId) continue;
        // Pour l'instant on ne marque pas sold ici — le seller crawler gère mieux.
        store.upsertSearchTracker({
          userId: t.userId,
          searchUrl: t.searchUrl,
          label: t.label,
          parsedFilters: { ...(t.parsedFilters || {}), lastSeen: String(Date.now()) },
          domain: t.domain,
        });
      }
      console.log(`[search-crawler] ${t.label}: ${list.length} items`);
    } catch (err) {
      console.warn(`[search-crawler] ${t.label}:`, err?.message || err);
    }
  }
}
