/**
 * Modèles / schémas métier (documentation + factories mock).
 * Pas d'ORM : données en mémoire pour le mock.
 */

/** @typedef {{ id: string, name: string, email: string, image: string|null }} User */
/** @typedef {{ id: string, name: string, parentId: string|null, itemCount: number, sellerCount: number }} Folder */
/** @typedef {{ id: string, vintedId: string, title: string, brand: string|null, price: number, currency: string, domain: string, photos: string[], state: string|null, url: string, folderId: string }} SavedItem */
/** @typedef {{ id: string, vintedId: string, login: string, domain: string, photoUrl: string|null, folderId: string, city?: string, country?: string }} FavoriteSeller */

/**
 * @typedef {object} SoldListing
 * @property {string} id
 * @property {string} vintedId
 * @property {string} title
 * @property {string|null} brandName
 * @property {number} price  // centimes ou euros selon endpoint — on utilise euros décimaux côté radar mock pour lisibilité UI ; l'extension lit souvent centimes via CDN. Ici : centimes comme dans le cache LevelDB.
 * @property {string} domain
 * @property {string|null} soldAt
 * @property {string} state
 * @property {number} favouriteCount
 * @property {string[]} photos
 * @property {number} [score]
 */

/**
 * @typedef {object} SellerStats
 * @property {object} seller
 * @property {object} stats
 * @property {object} publicationMetrics
 * @property {Array<{date: string, count: number}>} publishedChart
 * @property {Array<{date: string, count: number}>} soldChart
 * @property {SoldListing[]} recentPublished
 * @property {SoldListing[]} recentSold
 * @property {boolean} hasMore
 * @property {object} locked
 */

export const Plan = Object.freeze({
  FREE: 'free',
  PRO: 'pro',
  STARTER: 'starter',
});

export function createUser(overrides = {}) {
  return {
    id: 'FceRzQtPQNt7xeHfrIKa6pKIisfMq5XY',
    name: 'Demo TrackVint',
    email: 'demo@trackvint.local',
    image: 'https://lh3.googleusercontent.com/a/default-user=s96-c',
    ...overrides,
  };
}

export function createFolder(overrides = {}) {
  return {
    id: `folder_${Math.random().toString(36).slice(2, 10)}`,
    name: 'Nouveau dossier',
    parentId: null,
    itemCount: 0,
    sellerCount: 0,
    ...overrides,
  };
}

export function createSoldListing(overrides = {}) {
  const id = overrides.id ?? String(800000000 + Math.floor(Math.random() * 9999999));
  return {
    id,
    vintedId: overrides.vintedId ?? String(9200000000 + Math.floor(Math.random() * 99999999)),
    sellerId: overrides.sellerId ?? null,
    title: 'Article vintage',
    brandName: 'Nike',
    price: 4200, // centimes
    domain: 'vinted.fr',
    soldAt: new Date().toISOString(),
    state: 'VERY_GOOD',
    favouriteCount: 3,
    photos: [],
    score: 0.92,
    status: overrides.status ?? 'sold', // sold | active
    ...overrides,
  };
}

export function eurosFromCents(cents) {
  return Math.round(cents) / 100;
}

export function centsFromEuros(euros) {
  return Math.round(Number(euros) * 100);
}
