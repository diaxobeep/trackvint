/**
 * Store en mémoire — simule la DB ResellTrack.
 */
import { createFolder, createSoldListing, createUser, Plan } from '../models/types.js';
import { loadPersistedDb, schedulePersist } from './persist.js';

const user = createUser();

/** @type {Map<string, import('../models/types.js').Folder>} */
const folders = new Map();

/** @type {Map<string, import('../models/types.js').SavedItem>} */
const savedItems = new Map();

/** @type {Map<string, import('../models/types.js').FavoriteSeller>} */
const favoriteSellers = new Map();

/** @type {Map<string, object>} */
const inventory = new Map();

/** Ventes / articles trackés par vendeur — clé `${sellerId}:${vintedId}` */
/** @type {Map<string, object>} */
const trackedListings = new Map();

/** Profils vendeurs sync (cache) — clé vintedId */
/** @type {Map<string, object>} */
const sellerProfiles = new Map();

/** Trackers vendeurs unifiés — clé `${userId}:${vintedSellerId}` */
/** @type {Map<string, object>} */
const sellerTrackers = new Map();

/** Trackers recherches — clé `${userId}:${searchUrl}` */
/** @type {Map<string, object>} */
const searchTrackers = new Map();

/** Ventes détectées — clé `${userId}:${vintedItemId}` */
/** @type {Map<string, object>} */
const detectedSales = new Map();

// Dossiers vides par défaut (pas de seed / mock)
const rootNiches = createFolder({
  id: 'folder_niches',
  name: 'Niches',
  itemCount: 0,
  sellerCount: 0,
});
const rootSellers = createFolder({
  id: 'folder_sellers',
  name: 'Vendeurs',
  itemCount: 0,
  sellerCount: 0,
});
folders.set(rootNiches.id, rootNiches);
folders.set(rootSellers.id, rootSellers);

function daysAgo(n) {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - n);
  return d.toISOString();
}

function dateOnly(n) {
  return daysAgo(n).slice(0, 10);
}

function inventoryMargin(item) {
  if (item.sellPrice == null || item.buyPrice == null) return null;
  return Number((item.sellPrice - item.buyPrice).toFixed(2));
}

function touch() {
  schedulePersist(() => store.snapshot());
}

export const store = {
  Plan,
  user,
  /** Plan abonnement mock — free | pro */
  plan: Plan.FREE,
  proPrice: 34,
  defaultFolderId: rootNiches.id,

  snapshot() {
    return {
      plan: this.plan,
      folders: [...folders.values()],
      savedItems: [...savedItems.values()],
      favoriteSellers: [...favoriteSellers.values()],
      inventory: [...inventory.values()],
      trackedListings: [...trackedListings.values()],
      sellerProfiles: [...sellerProfiles.values()],
    };
  },

  hydrate(data) {
    if (!data || typeof data !== 'object') return false;
    if (data.plan) this.plan = data.plan;
    if (Array.isArray(data.folders)) {
      folders.clear();
      for (const f of data.folders) folders.set(f.id, f);
    }
    if (Array.isArray(data.savedItems)) {
      savedItems.clear();
      for (const i of data.savedItems) savedItems.set(i.id, i);
    }
    if (Array.isArray(data.favoriteSellers)) {
      favoriteSellers.clear();
      for (const s of data.favoriteSellers) favoriteSellers.set(s.id, s);
    }
    if (Array.isArray(data.inventory)) {
      inventory.clear();
      for (const i of data.inventory) inventory.set(i.id, i);
    }
    if (Array.isArray(data.trackedListings)) {
      trackedListings.clear();
      for (const l of data.trackedListings) {
        const sid = String(l.sellerId || '');
        const vid = String(l.vintedId || l.id || '');
        if (sid && vid) trackedListings.set(`${sid}:${vid}`, l);
      }
    }
    if (Array.isArray(data.sellerProfiles)) {
      sellerProfiles.clear();
      for (const p of data.sellerProfiles) {
        if (p?.vintedId) sellerProfiles.set(String(p.vintedId), p);
      }
    }
    return true;
  },

  async loadFromDisk() {
    const data = await loadPersistedDb();
    if (data) {
      this.hydrate(data);
      console.log('[trackvint] store restored from disk');
      return true;
    }
    touch();
    return false;
  },

  getDefaultFolderId() {
    return this.defaultFolderId;
  },

  setPlan(plan) {
    const p = String(plan || '').toLowerCase();
    if (p === Plan.PRO || p === 'pro') {
      this.plan = Plan.PRO;
    } else if (p === Plan.STARTER || p === 'starter') {
      this.plan = Plan.STARTER;
    } else {
      this.plan = Plan.FREE;
    }
    touch();
    return this.plan;
  },

  isPro() {
    return this.plan === Plan.PRO || this.plan === Plan.STARTER;
  },

  /** Login vendeur mock dérivé de l'id Vinted */
  sellerLoginFor(sellerId) {
    const known = favoriteSellers.get('seller_1');
    if (known && String(known.vintedId) === String(sellerId)) {
      return known.login;
    }
    const id = String(sellerId || '0');
    return `vendeur-${id.slice(-4)}`;
  },

  getFolders(parentId = null) {
    return [...folders.values()].filter((f) => f.parentId === parentId);
  },

  getFolder(id) {
    return folders.get(id) ?? null;
  },

  createFolder(name, parentId = null) {
    const folder = createFolder({ name, parentId });
    folders.set(folder.id, folder);
    touch();
    return folder;
  },

  deleteFolder(id) {
    const ok = folders.delete(id);
    for (const [itemId, item] of savedItems) {
      if (item.folderId === id) savedItems.delete(itemId);
    }
    for (const [sellerId, seller] of favoriteSellers) {
      if (seller.folderId === id) favoriteSellers.delete(sellerId);
    }
    if (ok) touch();
    return ok;
  },

  getItems(folderId) {
    return [...savedItems.values()].filter((i) => i.folderId === folderId);
  },

  saveItem(folderId, item) {
    const id = `item_${Date.now()}`;
    const saved = {
      id,
      folderId,
      vintedId: String(item.vintedId ?? item.id ?? ''),
      title: item.title ?? 'Sans titre',
      brand: item.brand ?? null,
      price: Number(item.price ?? 0),
      currency: item.currency ?? 'EUR',
      domain: item.domain ?? 'vinted.fr',
      photos: Array.isArray(item.photos) ? item.photos : [],
      state: item.state ?? item.condition ?? null,
      url: item.url ?? '',
    };
    savedItems.set(id, saved);
    const folder = folders.get(folderId);
    if (folder) folder.itemCount += 1;
    touch();
    return saved;
  },

  deleteItem(id) {
    const item = savedItems.get(id);
    if (!item) return false;
    savedItems.delete(id);
    const folder = folders.get(item.folderId);
    if (folder && folder.itemCount > 0) folder.itemCount -= 1;
    touch();
    return true;
  },

  getFavoriteSellers() {
    return [...favoriteSellers.values()];
  },

  findFavoriteByVintedId(vintedId) {
    const id = String(vintedId || '');
    return (
      [...favoriteSellers.values()].find((s) => String(s.vintedId) === id) ||
      null
    );
  },

  isSellerTracked(vintedId) {
    return Boolean(this.findFavoriteByVintedId(vintedId));
  },

  favoriteSeller(folderId, seller) {
    const vintedId = String(seller.vintedId ?? seller.id ?? '');
    const existing = this.findFavoriteByVintedId(vintedId);
    if (existing) {
      const row = {
        ...existing,
        login: seller.login ?? seller.name ?? existing.login,
        domain: seller.domain ?? existing.domain,
        photoUrl: seller.photoUrl ?? seller.photo ?? existing.photoUrl,
        city: seller.city ?? existing.city,
        country: seller.country ?? existing.country,
        tracked: true,
        lastSyncedAt: new Date().toISOString(),
      };
      favoriteSellers.set(existing.id, row);
      this.upsertSellerProfile(row);
      touch();
      return row;
    }

    const id = `seller_${Date.now()}`;
    const row = {
      id,
      folderId: folderId || this.getDefaultFolderId(),
      vintedId,
      login: seller.login ?? seller.name ?? 'vendeur',
      domain: seller.domain ?? 'vinted.fr',
      photoUrl: seller.photoUrl ?? seller.photo ?? null,
      city: seller.city ?? null,
      country: seller.country ?? null,
      tracked: true,
      lastSyncedAt: new Date().toISOString(),
    };
    favoriteSellers.set(id, row);
    const folder = folders.get(row.folderId);
    if (folder) folder.sellerCount += 1;
    this.upsertSellerProfile(row);
    touch();
    return row;
  },

  unfavoriteSeller(id) {
    const row = favoriteSellers.get(id);
    if (!row) return false;
    favoriteSellers.delete(id);
    const folder = folders.get(row.folderId);
    if (folder && folder.sellerCount > 0) folder.sellerCount -= 1;
    touch();
    return true;
  },

  unfavoriteByVintedId(vintedId) {
    const row = this.findFavoriteByVintedId(vintedId);
    if (!row) return false;
    return this.unfavoriteSeller(row.id);
  },

  deleteFavoriteEntry(id) {
    if (savedItems.has(id)) return this.deleteItem(id);
    if (favoriteSellers.has(id)) return this.unfavoriteSeller(id);
    return false;
  },

  upsertSellerProfile(profile) {
    const vintedId = String(profile.vintedId || profile.id || '');
    if (!vintedId) return null;
    const prev = sellerProfiles.get(vintedId) || {};
    const next = {
      ...prev,
      ...profile,
      vintedId,
      updatedAt: new Date().toISOString(),
    };
    sellerProfiles.set(vintedId, next);
    touch();
    return next;
  },

  getSellerProfile(vintedId) {
    return sellerProfiles.get(String(vintedId)) || null;
  },

  /**
   * Upsert articles/ventes d'un vendeur (prix en centimes).
   * @param {string} sellerId
   * @param {object[]} listings
   */
  upsertSellerListings(sellerId, listings = []) {
    const sid = String(sellerId);
    let upserted = 0;
    for (const raw of listings) {
      const vintedId = String(raw.vintedId ?? raw.id ?? '');
      if (!vintedId) continue;
      const key = `${sid}:${vintedId}`;
      const prev = trackedListings.get(key) || {};
      let price = Number(prev.price ?? 0);
      if (raw.priceCents != null) {
        price = Math.round(Number(raw.priceCents));
      } else if (raw.price != null) {
        const n = Number(raw.price);
        price = raw.priceIsEuros || n < 500 ? Math.round(n * 100) : Math.round(n);
      }

      const status =
        raw.status ||
        (raw.soldAt || prev.soldAt ? 'sold' : null) ||
        prev.status ||
        'sold';

      const row = createSoldListing({
        ...prev,
        id: prev.id || String(raw.id || vintedId),
        vintedId,
        sellerId: sid,
        title: raw.title ?? prev.title,
        brandName: raw.brandName ?? raw.brand ?? prev.brandName ?? null,
        price: Number.isFinite(price) ? price : 0,
        domain: raw.domain ?? prev.domain ?? 'vinted.fr',
        soldAt:
          status === 'active'
            ? null
            : raw.soldAt !== undefined
              ? raw.soldAt
              : prev.soldAt ?? new Date().toISOString(),
        state: raw.state ?? prev.state ?? 'VERY_GOOD',
        favouriteCount: raw.favouriteCount ?? prev.favouriteCount ?? 0,
        photos: Array.isArray(raw.photos)
          ? raw.photos
          : raw.photo
            ? [raw.photo]
            : prev.photos || [],
        status,
        url: raw.url || prev.url || '',
      });
      trackedListings.set(key, row);
      upserted += 1;
    }
    if (upserted) touch();
    return upserted;
  },

  /**
   * Ventes (+ optionnellement actifs) pour un vendeur.
   * @param {string} sellerId
   * @param {{ includeActive?: boolean }} [opts]
   */
  getListingsForSeller(sellerId, opts = {}) {
    const sid = String(sellerId);
    let list = [...trackedListings.values()].filter(
      (l) => String(l.sellerId) === sid,
    );
    if (!opts.includeActive) {
      list = list.filter((l) => l.status !== 'active' && l.soldAt);
    }
    return list;
  },

  getSoldListings() {
    return [...trackedListings.values()].filter(
      (l) => !(l.status === 'active' && !l.soldAt),
    );
  },

  getPublishedListings() {
    return [...trackedListings.values()].filter(
      (l) => l.status === 'active' || !l.soldAt,
    );
  },

  buildPublishedChart(days = 30) {
    const listings = this.getPublishedListings();
    const map = new Map();
    for (const l of listings) {
      const day = String(l.listedAt || l.createdAt || '').slice(0, 10);
      if (!day) continue;
      map.set(day, (map.get(day) || 0) + 1);
    }
    return Array.from({ length: days }, (_, i) => {
      const date = dateOnly(days - 1 - i);
      return { date, count: map.get(date) || 0 };
    });
  },

  buildSoldChart(days = 30) {
    const listings = this.getSoldListings().filter((l) => l.soldAt);
    const map = new Map();
    for (const l of listings) {
      const day = String(l.soldAt).slice(0, 10);
      map.set(day, (map.get(day) || 0) + 1);
    }
    return Array.from({ length: days }, (_, i) => {
      const date = dateOnly(days - 1 - i);
      return { date, count: map.get(date) || 0 };
    });
  },

  listInventory(status = null) {
    let items = [...inventory.values()];
    if (status) items = items.filter((i) => i.status === status);
    return items
      .map((i) => ({ ...i, margin: inventoryMargin(i) }))
      .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
  },

  createInventoryItem(data) {
    const id = `inv_${Date.now()}`;
    const item = {
      id,
      title: data.title,
      brand: data.brand ?? null,
      buyPrice: Number(data.buyPrice ?? 0),
      sellPrice: data.sellPrice != null ? Number(data.sellPrice) : null,
      status: data.status || 'stock',
      vintedId: data.vintedId ?? null,
      notes: data.notes ?? null,
      photos: data.photos ?? [],
      domain: data.domain || 'vinted.fr',
      boughtAt: new Date().toISOString(),
      soldAt: data.status === 'sold' ? new Date().toISOString() : null,
      createdAt: new Date().toISOString(),
    };
    inventory.set(id, item);
    touch();
    return { ...item, margin: inventoryMargin(item) };
  },

  updateInventoryItem(id, patch) {
    const item = inventory.get(id);
    if (!item) return null;
    const next = {
      ...item,
      ...patch,
      id: item.id,
      buyPrice:
        patch.buyPrice != null ? Number(patch.buyPrice) : item.buyPrice,
      sellPrice:
        patch.sellPrice !== undefined
          ? patch.sellPrice == null
            ? null
            : Number(patch.sellPrice)
          : item.sellPrice,
    };
    if (patch.status === 'sold' && !next.soldAt) {
      next.soldAt = new Date().toISOString();
    }
    inventory.set(id, next);
    touch();
    return { ...next, margin: inventoryMargin(next) };
  },

  deleteInventoryItem(id) {
    const ok = inventory.delete(id);
    if (ok) touch();
    return ok;
  },

  inventorySummary() {
    const items = [...inventory.values()];
    const stock = items.filter((i) => i.status === 'stock');
    const listed = items.filter((i) => i.status === 'listed');
    const sold = items.filter((i) => i.status === 'sold');
    const invested = items.reduce((s, i) => s + Number(i.buyPrice || 0), 0);
    const revenue = sold.reduce((s, i) => s + Number(i.sellPrice || 0), 0);
    const costSold = sold.reduce((s, i) => s + Number(i.buyPrice || 0), 0);
    return {
      counts: {
        all: items.length,
        stock: stock.length,
        listed: listed.length,
        sold: sold.length,
      },
      invested: Number(invested.toFixed(2)),
      revenue: Number(revenue.toFixed(2)),
      profit: Number((revenue - costSold).toFixed(2)),
      stockValue: Number(
        stock.reduce((s, i) => s + Number(i.buyPrice || 0), 0).toFixed(2),
      ),
      listedValue: Number(
        listed.reduce((s, i) => s + Number(i.sellPrice || i.buyPrice || 0), 0).toFixed(2),
      ),
    };
  },

  // --- Trackers unifiés (vendeurs + recherches) ---

  upsertSellerTracker({ userId, vintedSellerId, vintedUsername, domain, sourceUrl, photoUrl }) {
    const key = `${userId}:${vintedSellerId}`;
    const existing = sellerTrackers.get(key);
    if (existing) {
      existing.isActive = true;
      existing.vintedUsername = vintedUsername || existing.vintedUsername;
      existing.sourceUrl = sourceUrl || existing.sourceUrl;
      existing.photoUrl = photoUrl || existing.photoUrl;
      touch();
      return { created: false, tracker: existing };
    }
    const tracker = {
      id: `st_${vintedSellerId}`,
      userId,
      vintedSellerId: String(vintedSellerId),
      vintedUsername: vintedUsername || String(vintedSellerId),
      domain: domain || 'vinted.fr',
      sourceUrl: sourceUrl || '',
      photoUrl: photoUrl || null,
      isActive: true,
      createdAt: new Date().toISOString(),
    };
    sellerTrackers.set(key, tracker);
    // Sync favorite sellers for crawler legacy
    if (![...favoriteSellers.values()].some((s) => s.vintedId === String(vintedSellerId))) {
      const id = `seller_${vintedSellerId}`;
      favoriteSellers.set(id, {
        id,
        vintedId: String(vintedSellerId),
        login: tracker.vintedUsername,
        domain: tracker.domain,
        photoUrl: tracker.photoUrl,
        folderId: 'folder_sellers',
      });
    }
    touch();
    return { created: true, tracker };
  },

  upsertSearchTracker({ userId, searchUrl, label, parsedFilters, domain }) {
    const key = `${userId}:${searchUrl}`;
    const existing = searchTrackers.get(key);
    if (existing) {
      existing.isActive = true;
      existing.label = label || existing.label;
      existing.parsedFilters = parsedFilters || existing.parsedFilters;
      touch();
      return { created: false, tracker: existing };
    }
    const tracker = {
      id: `sr_${Date.now().toString(36)}`,
      userId,
      searchUrl,
      label: label || 'Recherche',
      parsedFilters: parsedFilters || {},
      domain: domain || 'vinted.fr',
      isActive: true,
      createdAt: new Date().toISOString(),
    };
    searchTrackers.set(key, tracker);
    touch();
    return { created: true, tracker };
  },

  listSellerTrackers(userId) {
    return [...sellerTrackers.values()].filter((t) => !userId || t.userId === userId);
  },

  listSearchTrackers(userId) {
    return [...searchTrackers.values()].filter((t) => !userId || t.userId === userId);
  },

  listActiveSellerTrackers() {
    return [...sellerTrackers.values()].filter((t) => t.isActive);
  },

  listActiveSearchTrackers() {
    return [...searchTrackers.values()].filter((t) => t.isActive);
  },

  addDetectedSale(sale) {
    const key = `${sale.userId || 'demo'}:${sale.vintedItemId}`;
    if (detectedSales.has(key)) return detectedSales.get(key);
    const row = {
      id: `sale_${sale.vintedItemId}`,
      userId: sale.userId || 'demo',
      ...sale,
      soldAt: sale.soldAt || new Date().toISOString(),
      createdAt: new Date().toISOString(),
    };
    detectedSales.set(key, row);
    touch();
    return row;
  },

  listDetectedSales(userId, limit = 40) {
    return [...detectedSales.values()]
      .filter((s) => !userId || s.userId === userId || s.userId === 'demo')
      .sort((a, b) => String(b.soldAt).localeCompare(String(a.soldAt)))
      .slice(0, limit);
  },

  getNichePerformance(userId) {
    const sales = this.listDetectedSales(userId, 500);
    const byBrand = new Map();
    for (const s of sales) {
      const brand = s.brand || 'Autre';
      const cur = byBrand.get(brand) || {
        brand,
        sold: 0,
        volume: 0,
        sumPrice: 0,
        sparkline: [0, 0, 0, 0, 0, 0, 0],
      };
      cur.sold += 1;
      cur.volume += 1;
      cur.sumPrice += Number(s.priceCents || 0) / 100;
      const day = Math.min(6, Math.floor((Date.now() - new Date(s.soldAt).getTime()) / 86400000));
      cur.sparkline[6 - day] = (cur.sparkline[6 - day] || 0) + 1;
      byBrand.set(brand, cur);
    }
    return [...byBrand.values()]
      .map((b) => ({
        ...b,
        avgPrice: b.sold ? Number((b.sumPrice / b.sold).toFixed(2)) : 0,
        sellThroughRate: Math.min(100, Math.round((b.sold / Math.max(8, b.sold + 3)) * 100)),
      }))
      .sort((a, b) => b.sold - a.sold)
      .slice(0, 12);
  },

  getSellerTrackerDetail(userId, vintedId) {
    const tracker =
      this.listSellerTrackers(userId).find((t) => t.vintedSellerId === String(vintedId)) ||
      [...favoriteSellers.values()].find((s) => s.vintedId === String(vintedId));
    if (!tracker) return null;
    const sales = this.listDetectedSales(userId, 200).filter(
      (s) => s.sellerLogin === (tracker.vintedUsername || tracker.login) || s.vintedSellerId === String(vintedId),
    );
    const listings = [...trackedListings.values()].filter(
      (l) => String(l.sellerId || l.vintedSellerId) === String(vintedId),
    );
    const avgPrice =
      sales.length > 0
        ? sales.reduce((a, s) => a + Number(s.priceCents || 0) / 100, 0) / sales.length
        : 0;
    const brands = {};
    for (const s of sales) {
      const b = s.brand || 'Autre';
      brands[b] = (brands[b] || 0) + 1;
    }
    const topBrands = Object.entries(brands)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([name, count]) => ({ name, count }));

    return {
      seller: {
        vintedId: String(vintedId),
        login: tracker.vintedUsername || tracker.login,
        photoUrl: tracker.photoUrl,
        domain: tracker.domain || 'vinted.fr',
      },
      kpis: {
        avgPrice: Number(avgPrice.toFixed(2)),
        estimatedRevenue: Number(
          sales.reduce((a, s) => a + Number(s.priceCents || 0) / 100, 0).toFixed(2),
        ),
        soldThisMonth: sales.length,
        topBrands,
      },
      activeItems: listings.filter((l) => l.status !== 'sold').slice(0, 40),
      soldItems: sales.slice(0, 40),
    };
  },
};
