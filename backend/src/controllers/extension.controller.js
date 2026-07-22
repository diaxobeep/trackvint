import { store } from '../data/store.js';

/**
 * GET /api/extension/subscription
 */
export function getSubscription(req, res) {
  return res.json({
    plan: store.plan ?? store.Plan.FREE,
    proPrice: store.proPrice,
    userId: req.user.id,
    renewsAt: null,
    endsAt: null,
  });
}

/**
 * POST /api/extension/subscription/upgrade
 * Body: { plan: 'pro' | 'free' } — mock billing
 */
export function upgradeSubscription(req, res) {
  const plan = String(req.body?.plan || 'pro');
  const next = store.setPlan(plan);
  return res.json({
    plan: next,
    proPrice: store.proPrice,
    userId: req.user.id,
    mock: true,
  });
}

/**
 * GET /api/extension/notice?locale=fr
 */
export function getNotice(req, res) {
  const locale = String(req.query.locale || 'fr');
  const messages = {
    fr: 'Nous trackons seulement les ventes des articles à plus de 15 euros.',
    en: 'We only track sales of items above 15 euros.',
    de: 'Wir tracken nur Verkäufe von Artikeln über 15 Euro.',
  };

  return res.json({
    dismissible: true,
    enabled: true,
    level: 'info',
    message: messages[locale] ?? messages.fr,
    updatedAt: new Date().toISOString(),
  });
}

/**
 * GET /api/extension/favorites
 * GET /api/extension/favorites?folderId=
 */
export function getFavorites(req, res) {
  const folderId = req.query.folderId ? String(req.query.folderId) : null;

  if (!folderId) {
    return res.json({
      folders: store.getFolders(null).map((f) => ({
        id: f.id,
        name: f.name,
        itemCount: f.itemCount,
        sellerCount: f.sellerCount,
      })),
    });
  }

  const folder = store.getFolder(folderId);
  if (!folder) {
    return res.status(404).json({ error: 'folder_not_found' });
  }

  return res.json({
    folder,
    subfolders: store.getFolders(folderId),
    savedItems: store.getItems(folderId),
    favorites: store
      .getFavoriteSellers()
      .filter((s) => s.folderId === folderId),
  });
}

/**
 * POST /api/extension/folders
 * Body: { name, parentId }
 */
export function createFolder(req, res) {
  const { name, parentId = null } = req.body;
  const folder = store.createFolder(String(name).trim(), parentId);
  return res.status(201).json(folder);
}

/**
 * DELETE /api/extension/folders/:folderId
 */
export function deleteFolder(req, res) {
  const ok = store.deleteFolder(req.params.folderId);
  if (!ok) return res.status(404).json({ error: 'folder_not_found' });
  return res.json({ ok: true });
}

/**
 * POST /api/extension/items/save
 * Body: { folderId, item }
 * folderId optionnel → dossier par défaut « Niches sneakers »
 */
export function saveItem(req, res) {
  const { item } = req.body;
  const folderId =
    req.body.folderId || store.getDefaultFolderId?.() || 'folder_niches';
  if (!store.getFolder(folderId)) {
    return res.status(404).json({ error: 'folder_not_found' });
  }
  const saved = store.saveItem(folderId, item ?? {});
  return res.status(201).json(saved);
}

/**
 * DELETE /api/extension/items/:dbId
 */
export function deleteItem(req, res) {
  const ok = store.deleteItem(req.params.dbId);
  if (!ok) return res.status(404).json({ error: 'item_not_found' });
  return res.json({ ok: true });
}

/**
 * POST /api/extension/sellers/favorite
 * Body: { folderId, vintedId, login, domain, ... }
 */
export function favoriteSeller(req, res) {
  const { folderId, ...seller } = req.body;
  const fid = folderId || 'folder_sellers';
  if (!store.getFolder(fid)) {
    return res.status(404).json({ error: 'folder_not_found' });
  }
  const row = store.favoriteSeller(fid, seller);
  const sales = Array.isArray(req.body?.sales) ? req.body.sales : [];
  if (sales.length && row.vintedId) {
    store.upsertSellerListings(row.vintedId, sales);
  }
  return res.status(201).json({
    ...row,
    salesCount: store.getListingsForSeller(row.vintedId).length,
  });
}

/**
 * POST /api/extension/sellers/track
 * Body: { seller: {...}, sales?: [], activeItems?: [], track?: boolean }
 * Sans auth — tracking local.
 */
export function trackSeller(req, res) {
  const body = req.body || {};
  const seller = body.seller || body;
  const vintedId = String(seller.vintedId ?? seller.id ?? '');
  if (!vintedId) {
    return res.status(400).json({ error: 'vintedId_required' });
  }

  const domain = seller.domain || 'vinted.fr';
  store.upsertSellerProfile({
    vintedId,
    login: seller.login || seller.name || `vendeur-${vintedId.slice(-4)}`,
    domain,
    photoUrl: seller.photoUrl || seller.photo || null,
    city: seller.city || null,
    country: seller.country || null,
    feedbackCount: seller.feedbackCount ?? null,
    feedbackReputation: seller.feedbackReputation ?? null,
    itemCount: seller.itemCount ?? null,
    givenItemCount: seller.givenItemCount ?? seller.soldCount ?? null,
  });

  const sales = [
    ...(Array.isArray(body.sales) ? body.sales : []),
    ...(Array.isArray(body.activeItems)
      ? body.activeItems.map((i) => ({ ...i, status: 'active', soldAt: null }))
      : []),
  ];
  const upserted = store.upsertSellerListings(vintedId, sales);

  const shouldTrack = body.track !== false;
  let favorite = store.findFavoriteByVintedId(vintedId);
  if (shouldTrack) {
    favorite = store.favoriteSeller('folder_sellers', {
      vintedId,
      login: seller.login || seller.name,
      domain,
      photoUrl: seller.photoUrl || seller.photo,
      city: seller.city,
      country: seller.country,
    });
  }

  return res.json({
    ok: true,
    tracked: Boolean(favorite),
    favorite,
    upserted,
    salesCount: store.getListingsForSeller(vintedId).length,
    activeCount: store
      .getListingsForSeller(vintedId, { includeActive: true })
      .filter((l) => l.status === 'active' || !l.soldAt).length,
  });
}

/**
 * POST /api/extension/sellers/:vintedId/sales
 * Body: { sales: [], activeItems?: [] }
 */
export function ingestSellerSales(req, res) {
  const vintedId = String(req.params.vintedId || '');
  if (!vintedId) {
    return res.status(400).json({ error: 'vintedId_required' });
  }
  const sales = Array.isArray(req.body?.sales) ? req.body.sales : [];
  const active = Array.isArray(req.body?.activeItems)
    ? req.body.activeItems.map((i) => ({ ...i, status: 'active', soldAt: null }))
    : [];
  const upserted = store.upsertSellerListings(vintedId, [...sales, ...active]);
  if (req.body?.seller) {
    store.upsertSellerProfile({ ...req.body.seller, vintedId });
  }
  return res.json({
    ok: true,
    upserted,
    salesCount: store.getListingsForSeller(vintedId).length,
    tracked: store.isSellerTracked(vintedId),
  });
}

/**
 * DELETE /api/extension/sellers/favorite?id= | ?vintedId=
 */
export function unfavoriteSeller(req, res) {
  const vintedId = req.query.vintedId ? String(req.query.vintedId) : '';
  if (vintedId) {
    const ok = store.unfavoriteByVintedId(vintedId);
    if (!ok) return res.status(404).json({ error: 'seller_not_found' });
    return res.json({ ok: true });
  }
  const id = String(req.query.id || '');
  const ok = store.unfavoriteSeller(id);
  if (!ok) return res.status(404).json({ error: 'seller_not_found' });
  return res.json({ ok: true });
}

/**
 * GET /api/extension/sellers/favorites
 */
export function listFavoriteSellers(_req, res) {
  return res.json({
    sellers: store.getFavoriteSellers().map((s) => ({
      ...s,
      salesCount: store.getListingsForSeller(s.vintedId).length,
    })),
  });
}

/**
 * GET /api/extension/sellers/tracked
 */
export function listTrackedSellers(_req, res) {
  return listFavoriteSellers(_req, res);
}

/**
 * DELETE /api/extension/favorites/:dbId
 * Supprime un item OU un vendeur favori selon l'id.
 */
export function deleteFavoriteEntry(req, res) {
  const ok = store.deleteFavoriteEntry(req.params.dbId);
  if (!ok) return res.status(404).json({ error: 'favorite_not_found' });
  return res.json({ ok: true });
}
