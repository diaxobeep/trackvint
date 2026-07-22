/**
 * Controllers Trackers unifiés — POST /api/trackers/add
 * Accepte URL Vinted (profil ou recherche) depuis Web + Extension.
 */

import { parseVintedUrl } from '../services/vintedUrlParser.js';
import { store } from '../data/store.js';

function userIdFromReq(req) {
  return req.user?.id || req.headers['x-user-id'] || 'demo';
}

/**
 * POST /api/trackers/add  { url: string }
 */
export function addTracker(req, res) {
  try {
    const url = req.body?.url || req.body?.sourceUrl;
    const parsed = parseVintedUrl(url);
    const userId = userIdFromReq(req);

    if (parsed.kind === 'seller') {
      const result = store.upsertSellerTracker({
        userId,
        vintedSellerId: parsed.vintedSellerId,
        vintedUsername: parsed.vintedUsername,
        domain: parsed.domain,
        sourceUrl: parsed.sourceUrl,
      });
      return res.status(result.created ? 201 : 200).json({
        ok: true,
        type: 'seller',
        created: result.created,
        tracker: result.tracker,
        message: result.created
          ? 'Vendeur tracké'
          : 'Vendeur déjà tracké (réactivé)',
      });
    }

    const result = store.upsertSearchTracker({
      userId,
      searchUrl: parsed.searchUrl,
      label: parsed.label,
      parsedFilters: parsed.parsedFilters,
      domain: parsed.domain,
    });

    return res.status(result.created ? 201 : 200).json({
      ok: true,
      type: 'search',
      created: result.created,
      tracker: result.tracker,
      message: result.created
        ? 'Recherche trackée'
        : 'Recherche déjà trackée (réactivée)',
    });
  } catch (err) {
    const status =
      err.code === 'INVALID_URL' || err.code === 'UNSUPPORTED_URL' ? 400 : 500;
    return res.status(status).json({
      ok: false,
      error: err.message || 'Erreur tracker',
      code: err.code || 'TRACKER_ERROR',
    });
  }
}

/** GET /api/trackers */
export function listTrackers(req, res) {
  const userId = userIdFromReq(req);
  res.json({
    ok: true,
    sellers: store.listSellerTrackers(userId),
    searches: store.listSearchTrackers(userId),
  });
}

/** GET /api/trackers/sales */
export function listSales(req, res) {
  const userId = userIdFromReq(req);
  const limit = Math.min(100, Number(req.query.limit) || 40);
  res.json({
    ok: true,
    sales: store.listDetectedSales(userId, limit),
  });
}

/** GET /api/trackers/niches */
export function nicheStats(req, res) {
  const userId = userIdFromReq(req);
  res.json({
    ok: true,
    niches: store.getNichePerformance(userId),
  });
}

/** GET /api/trackers/sellers/:vintedId */
export function sellerDetail(req, res) {
  const userId = userIdFromReq(req);
  const detail = store.getSellerTrackerDetail(userId, req.params.vintedId);
  if (!detail) {
    return res.status(404).json({ ok: false, error: 'Vendeur introuvable' });
  }
  res.json({ ok: true, ...detail });
}
