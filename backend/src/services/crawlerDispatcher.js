/**
 * Dispatcher de crawling 24/7.
 *
 * Lit les trackers actifs (store local / Supabase) et route :
 *  - SellerTracker  → seller-crawler.js  (dressing membre, détection ventes)
 *  - SearchTracker  → search-crawler.js  (catalogue/filtres, nouvelles annonces)
 *
 * Les deux crawlers mettent à jour detected_sales / trackedListings.
 */

import { store } from '../data/store.js';

const TICK_MS = Number(process.env.DISPATCHER_INTERVAL_MS) || 5 * 60 * 1000;

let timer = null;
let running = false;

export function startCrawlerDispatcher() {
  if (timer) return;
  console.log(
    `[crawler-dispatcher] started (every ${Math.round(TICK_MS / 1000)}s)`,
  );
  timer = setTimeout(() => {
    void tick();
    timer = setInterval(() => void tick(), TICK_MS);
  }, 15_000);
}

export function stopCrawlerDispatcher() {
  if (!timer) return;
  clearTimeout(timer);
  clearInterval(timer);
  timer = null;
}

async function tick() {
  if (running) return;
  running = true;
  try {
    const sellers = store.listActiveSellerTrackers();
    const searches = store.listActiveSearchTrackers();

    if (sellers.length) {
      const { crawlSellerTrackers } = await import('../jobs/seller-crawler.js');
      if (typeof crawlSellerTrackers === 'function') {
        await crawlSellerTrackers(sellers);
      }
    }

    if (searches.length) {
      const { crawlSearchTrackers } = await import('../jobs/search-crawler.js');
      if (typeof crawlSearchTrackers === 'function') {
        await crawlSearchTrackers(searches);
      }
    }
  } catch (err) {
    console.warn('[crawler-dispatcher]', err?.message || err);
  } finally {
    running = false;
  }
}
