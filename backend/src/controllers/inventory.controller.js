/**
 * Inventaire revente — mock métier ResellTrack-like.
 * Articles achetés / à revendre / vendus, marges, ROI.
 */
import { store } from '../data/store.js';

/**
 * GET /api/inventory
 * Query: status?=stock|listed|sold|all
 */
export function listInventory(req, res) {
  const status = String(req.query.status || 'all');
  const items = store.listInventory(status === 'all' ? null : status);
  const summary = store.inventorySummary();
  return res.json({ items, summary });
}

/**
 * POST /api/inventory
 * Body: { title, brand?, buyPrice, sellPrice?, status?, vintedId?, notes? }
 */
export function createInventoryItem(req, res) {
  const body = req.body ?? {};
  if (!body.title || String(body.title).trim().length === 0) {
    return res.status(400).json({ error: 'title_required' });
  }
  const item = store.createInventoryItem({
    title: String(body.title).trim(),
    brand: body.brand ?? null,
    buyPrice: Number(body.buyPrice ?? 0),
    sellPrice: body.sellPrice != null ? Number(body.sellPrice) : null,
    status: body.status || 'stock',
    vintedId: body.vintedId ? String(body.vintedId) : null,
    notes: body.notes ?? null,
    photos: Array.isArray(body.photos) ? body.photos : [],
    domain: body.domain || 'vinted.fr',
  });
  return res.status(201).json(item);
}

/**
 * PATCH /api/inventory/:id
 */
export function updateInventoryItem(req, res) {
  const updated = store.updateInventoryItem(req.params.id, req.body ?? {});
  if (!updated) return res.status(404).json({ error: 'item_not_found' });
  return res.json(updated);
}

/**
 * DELETE /api/inventory/:id
 */
export function deleteInventoryItem(req, res) {
  const ok = store.deleteInventoryItem(req.params.id);
  if (!ok) return res.status(404).json({ error: 'item_not_found' });
  return res.json({ ok: true });
}

/**
 * GET /api/inventory/summary
 */
export function inventorySummary(_req, res) {
  return res.json(store.inventorySummary());
}

/**
 * GET /api/inventory/export
 */
export function exportInventory(req, res) {
  const items = store.listInventory(null);
  const summary = store.inventorySummary();
  res.setHeader(
    'Content-Disposition',
    `attachment; filename="trackvint-inventory-${Date.now()}.json"`,
  );
  return res.json({
    exportedAt: new Date().toISOString(),
    userId: req.user?.id ?? null,
    summary,
    items,
  });
}
