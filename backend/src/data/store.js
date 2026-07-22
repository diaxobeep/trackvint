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

// Seed
const rootNiches = createFolder({
  id: 'folder_niches',
  name: 'Niches sneakers',
  itemCount: 2,
  sellerCount: 0,
});
const rootSellers = createFolder({
  id: 'folder_sellers',
  name: 'Vendeurs top',
  itemCount: 0,
  sellerCount: 1,
});
folders.set(rootNiches.id, rootNiches);
folders.set(rootSellers.id, rootSellers);

savedItems.set('item_1', {
  id: 'item_1',
  vintedId: '9276434990',
  title: 'Ensemble 2 pièces brodé ton blanc et bleu, taille M',
  brand: 'tessa',
  price: 42,
  currency: 'EUR',
  domain: 'vinted.fr',
  photos: [
    'https://cdn.trackvint.local/radar-vinted-39265911095.jpg',
  ],
  state: 'VERY_GOOD',
  url: 'https://www.vinted.fr/items/9276434990',
  folderId: rootNiches.id,
});

savedItems.set('item_2', {
  id: 'item_2',
  vintedId: '9442495274',
  title: 'Paire de mules à talons bicolores (taille 38)',
  brand: 'Lupila',
  price: 38,
  currency: 'EUR',
  domain: 'vinted.fr',
  photos: [],
  state: 'VERY_GOOD',
  url: 'https://www.vinted.fr/items/9442495274',
  folderId: rootNiches.id,
});

favoriteSellers.set('seller_1', {
  id: 'seller_1',
  vintedId: '275730317',
  login: 'anna-411',
  domain: 'vinted.fr',
  photoUrl: 'https://cdn.trackvint.local/radar-vinted-seller-275730317.jpg',
  folderId: rootSellers.id,
  city: 'Colomiers',
  country: 'France',
});

function daysAgo(n) {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - n);
  return d.toISOString();
}

function dateOnly(n) {
  return daysAgo(n).slice(0, 10);
}

const DEMO_SELLER_ID = '275730317';

const MOCK_SOLD = [
  createSoldListing({
    id: '810719966',
    vintedId: '9276434990',
    sellerId: DEMO_SELLER_ID,
    title: 'Ensemble 2 pièces brodé pour l\'été, tons blanc et bleu, taille M',
    brandName: 'tessa',
    price: 4200,
    soldAt: daysAgo(20),
    favouriteCount: 7,
    photos: [
      'https://cdn.trackvint.local/radar-vinted-39265911095.jpg',
      'https://cdn.trackvint.local/radar-vinted-39265911098.jpg',
    ],
    score: 0.982,
    colors: [{ hex: '#FFFFFF', title: 'Blanc' }],
  }),
  createSoldListing({
    id: '811001122',
    vintedId: '9281001122',
    sellerId: DEMO_SELLER_ID,
    title: 'Robe brodée blanche et bleue taille M',
    brandName: 'tessa',
    price: 3500,
    soldAt: daysAgo(12),
    favouriteCount: 4,
    score: 0.91,
  }),
  createSoldListing({
    id: '811223344',
    vintedId: '9282233445',
    sellerId: DEMO_SELLER_ID,
    title: 'Top brodé été blanc M',
    brandName: 'tessa',
    price: 2800,
    soldAt: daysAgo(5),
    favouriteCount: 2,
    score: 0.88,
    state: 'GOOD',
  }),
  createSoldListing({
    id: '812334455',
    vintedId: '9293344556',
    sellerId: DEMO_SELLER_ID,
    title: 'Nike Air Max 90 blanches T42',
    brandName: 'Nike',
    price: 4500,
    soldAt: daysAgo(3),
    favouriteCount: 11,
    score: 0.95,
  }),
  createSoldListing({
    id: '813445566',
    vintedId: '9304455667',
    sellerId: DEMO_SELLER_ID,
    title: 'Nike Dunk Low panda T43',
    brandName: 'Nike',
    price: 7800,
    soldAt: daysAgo(1),
    favouriteCount: 22,
    score: 0.97,
    state: 'NEW_WITH_TAGS',
  }),
];

const MOCK_PUBLISHED = [
  createSoldListing({
    id: '889175016',
    vintedId: '9450167088',
    title: 'Chaussures à talons noires, taille 38',
    brandName: 'Vintage Dressing',
    price: 3400,
    soldAt: null,
    favouriteCount: 0,
  }),
  createSoldListing({
    id: '888132294',
    vintedId: '9442495274',
    title: 'Paire de mules à talons bicolores marron et beige (taille 38)',
    brandName: 'Lupila',
    price: 3800,
    soldAt: null,
    favouriteCount: 4,
  }),
  createSoldListing({
    id: '815627698',
    vintedId: '9284857095',
    title: 'Chemisier Léger Jaune Volants, Taille S',
    brandName: 'tessa',
    price: 3400,
    soldAt: null,
    favouriteCount: 0,
  }),
];

inventory.set('inv_1', {
  id: 'inv_1',
  title: 'Nike Dunk Low panda T43',
  brand: 'Nike',
  buyPrice: 45,
  sellPrice: 78,
  status: 'sold',
  vintedId: '9304455667',
  notes: 'Acheté en friperie',
  photos: [],
  domain: 'vinted.fr',
  boughtAt: daysAgo(40),
  soldAt: daysAgo(1),
  createdAt: daysAgo(40),
});

inventory.set('inv_2', {
  id: 'inv_2',
  title: 'Ensemble brodé blanc/bleu M',
  brand: 'tessa',
  buyPrice: 12,
  sellPrice: 42,
  status: 'listed',
  vintedId: '9276434990',
  notes: null,
  photos: [
    'https://cdn.trackvint.local/radar-vinted-39265911095.jpg',
  ],
  domain: 'vinted.fr',
  boughtAt: daysAgo(15),
  soldAt: null,
  createdAt: daysAgo(15),
});

inventory.set('inv_3', {
  id: 'inv_3',
  title: 'Mules talons bicolores 38',
  brand: 'Lupila',
  buyPrice: 8,
  sellPrice: null,
  status: 'stock',
  vintedId: null,
  notes: 'À photographier',
  photos: [],
  domain: 'vinted.fr',
  boughtAt: daysAgo(3),
  soldAt: null,
  createdAt: daysAgo(3),
});

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
    const fromTrack = [...trackedListings.values()].filter(
      (l) => String(l.sellerId) === sid,
    );
    const fromMock = MOCK_SOLD.filter((l) => String(l.sellerId) === sid);
    const map = new Map();
    for (const l of [...fromMock, ...fromTrack]) {
      map.set(String(l.vintedId), l);
    }
    let list = [...map.values()];
    if (!opts.includeActive) {
      list = list.filter((l) => l.status !== 'active' && l.soldAt);
    }
    return list;
  },

  getSoldListings() {
    // Global feed = mock démo + toutes les ventes trackées
    const map = new Map();
    for (const l of MOCK_SOLD) map.set(`m:${l.vintedId}`, l);
    for (const l of trackedListings.values()) {
      if (l.status === 'active' && !l.soldAt) continue;
      map.set(`t:${l.sellerId}:${l.vintedId}`, l);
    }
    return [...map.values()];
  },

  getPublishedListings() {
    return MOCK_PUBLISHED;
  },

  buildPublishedChart(days = 30) {
    const counts = [0, 9, 2, 0, 5, 0, 0, 1, 0, 1, 0, 0, 1, 0, 0, 3, 0, 0, 0, 0, 1, 0, 1, 0, 2, 3, 0, 2, 0, 3, 0];
    return Array.from({ length: days }, (_, i) => ({
      date: dateOnly(days - 1 - i),
      count: counts[i] ?? Math.floor(Math.random() * 3),
    }));
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
};
