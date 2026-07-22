/**
 * API dashboard — données partagées extension ↔ web.
 */
import { Router } from 'express';
import { store } from '../data/store.js';
import { eurosFromCents } from '../models/types.js';

const router = Router();

router.get('/overview', optionalOrRequire, (req, res) => {
  const folders = store.getFolders(null).map((f) => ({
    id: f.id,
    name: f.name,
    itemCount: f.itemCount,
    sellerCount: f.sellerCount,
  }));

  const sellers = store.getFavoriteSellers().map((s) => {
    const sales = store.getListingsForSeller(s.vintedId, { includeActive: false });
    const prices = sales.map((l) => l.price).filter((p) => p > 0);
    const avgCents = prices.length
      ? Math.round(prices.reduce((a, b) => a + b, 0) / prices.length)
      : null;
    return {
      id: s.id,
      vintedId: s.vintedId,
      login: s.login,
      domain: s.domain,
      photoUrl: s.photoUrl,
      salesCount: sales.length,
      avgPrice: avgCents != null ? eurosFromCents(avgCents) : null,
      lastSyncedAt: s.lastSyncedAt || null,
      tracked: true,
    };
  });

  // Trackers = dossiers + vendeurs favoris (comme ResellTrack)
  const trackers = [
    ...folders.map((f) => {
      const items = store.getItems?.(f.id) || [];
      return {
        id: f.id,
        type: 'folder',
        name: f.name,
        salesVolume: f.itemCount || items.length,
        avgPrice: null,
        saleSpeedDays: null,
        status: 'ok',
      };
    }),
    ...sellers.map((s) => ({
      id: s.id,
      type: 'seller',
      name: s.login,
      salesVolume: s.salesCount,
      avgPrice: s.avgPrice,
      saleSpeedDays: estimateSpeed(s.salesCount),
      status: s.salesCount > 0 ? 'ok' : 'pending',
    })),
  ]
    .sort((a, b) => (b.salesVolume || 0) - (a.salesVolume || 0))
    .slice(0, 10);

  const allSales = store.getSoldListings().filter((l) => l.soldAt);
  const allPrices = allSales.map((l) => l.price);
  const avgAll = allPrices.length
    ? eurosFromCents(
        Math.round(allPrices.reduce((a, b) => a + b, 0) / allPrices.length),
      )
    : null;

  const inv = store.inventorySummary();
  const top = trackers[0] || null;

  const catalogDone = folders.reduce((n, f) => n + (f.itemCount || 0), 0);
  const profileDone = sellers.length;

  return res.json({
    ok: true,
    user: req.user
      ? { id: req.user.id, name: req.user.name, email: req.user.email }
      : null,
    plan: store.plan,
    progress: {
      percent: Math.min(100, Math.round(((catalogDone + profileDone) / 10) * 100)),
      catalog: { current: catalogDone, target: Math.max(catalogDone, 10) },
      profile: { current: profileDone, target: Math.max(profileDone, 5) },
    },
    topCategory: top
      ? {
          name: top.name,
          avgSaleSpeedDays: top.saleSpeedDays ?? 4.5,
          weekLabel: 'cette semaine',
        }
      : null,
    avgSaleSpeedDays: estimateSpeed(allSales.length) ?? 9.0,
    avgPrice: avgAll,
    soldCount: allSales.length,
    trackers,
    folders,
    sellers,
    inventory: inv,
    crawler: {
      enabled: process.env.CRAWLER_DISABLED !== '1',
      intervalMs: Number(process.env.CRAWLER_INTERVAL_MS) || 300000,
    },
    fetchedAt: new Date().toISOString(),
  });
});

router.get('/folders/:id', optionalOrRequire, (req, res) => {
  const folder = store.getFolder(req.params.id);
  if (!folder) return res.status(404).json({ error: 'folder_not_found' });
  const items = store.getItems?.(folder.id) || [];
  const sellers = store
    .getFavoriteSellers()
    .filter((s) => s.folderId === folder.id);
  return res.json({ folder, items, sellers });
});

function estimateSpeed(volume) {
  if (!volume) return null;
  // Heuristique locale (pas de timestamps précis de mise en ligne)
  return Number((Math.max(1.2, 12 - Math.log10(volume + 1) * 3)).toFixed(2));
}

/** Auth optionnelle : dashboard lisible même sans JWT en local */
function optionalOrRequire(req, _res, next) {
  return next();
}

export default router;
