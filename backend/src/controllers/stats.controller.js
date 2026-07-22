/**
 * GET /api/stats — tableau de bord unifié (par vendeur si sellerId).
 * Query: sellerId?, domain?, brand?, itemId?, days?, sortBy?
 */
import { store } from '../data/store.js';
import { eurosFromCents } from '../models/types.js';

const STATE_LABELS = {
  NEW_WITH_TAGS: 'Neuf avec étiquette',
  NEW_WITHOUT_TAGS: 'Neuf sans étiquette',
  VERY_GOOD: 'Très bon état',
  GOOD: 'Bon état',
  SATISFACTORY: 'Satisfaisant',
};

function stateLabel(state) {
  if (!state) return '—';
  return STATE_LABELS[state] || String(state).replaceAll('_', ' ');
}

function formatSoldDate(iso) {
  if (!iso) return '';
  try {
    return new Intl.DateTimeFormat('fr-FR', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    }).format(new Date(iso));
  } catch {
    return String(iso).slice(0, 10);
  }
}

function listingPhoto(l) {
  const raw = l.photos?.[0];
  if (raw && !String(raw).includes('trackvint.local')) return raw;
  return null;
}

export function getStats(req, res) {
  const sellerId = req.query.sellerId ? String(req.query.sellerId) : null;
  const domain = String(req.query.domain || 'vinted.fr');
  const brand = req.query.brand ? String(req.query.brand) : null;
  const days = Math.min(Math.max(Number(req.query.days) || 30, 1), 365);
  const sortBy = String(req.query.sortBy || 'recent');
  const locked = !store.isPro();
  const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;

  let listings;
  if (sellerId) {
    listings = store.getListingsForSeller(sellerId, { includeActive: false });
  } else {
    listings = store.getSoldListings();
  }

  listings = listings.filter((l) => {
    if (!l.soldAt) return false;
    return new Date(l.soldAt).getTime() >= cutoff;
  });

  if (brand) {
    const b = brand.toLowerCase();
    const filtered = listings.filter((l) =>
      l.brandName?.toLowerCase().includes(b),
    );
    if (filtered.length) listings = filtered;
  }

  if (sortBy === 'price') {
    listings = [...listings].sort((a, b) => b.price - a.price);
  } else {
    listings = [...listings].sort(
      (a, b) => new Date(b.soldAt || 0) - new Date(a.soldAt || 0),
    );
  }

  const pricesCents = listings.map((l) => l.price);
  const minCents = pricesCents.length ? Math.min(...pricesCents) : null;
  const maxCents = pricesCents.length ? Math.max(...pricesCents) : null;
  const avgCents = pricesCents.length
    ? Math.round(pricesCents.reduce((a, b) => a + b, 0) / pricesCents.length)
    : null;

  const allForSeller = sellerId
    ? store.getListingsForSeller(sellerId, { includeActive: true })
    : [];
  const activeCount = allForSeller.filter(
    (l) => l.status === 'active' || !l.soldAt,
  ).length;

  const fav = sellerId ? store.findFavoriteByVintedId(sellerId) : null;
  const cached = sellerId ? store.getSellerProfile(sellerId) : null;
  const tracked = Boolean(fav);

  const login =
    cached?.login ||
    fav?.login ||
    (sellerId ? store.sellerLoginFor(sellerId) : null);

  const seller = sellerId
    ? {
        vintedId: sellerId,
        login: login || `vendeur-${sellerId.slice(-4)}`,
        domain: cached?.domain || fav?.domain || domain,
        city: cached?.city || fav?.city || null,
        country: cached?.country || fav?.country || null,
        feedbackCount: cached?.feedbackCount ?? null,
        feedbackReputation: cached?.feedbackReputation ?? null,
        publicationsPerDay: cached?.publicationsPerDay ?? null,
        soldCount: listings.length,
        trackedItems: activeCount + listings.length,
        activeItems: activeCount,
        photoUrl:
          cached?.photoUrl ||
          fav?.photoUrl ||
          null,
        profileUrl: `https://www.${domain}/member/${sellerId}`,
        isFavorite: tracked,
        tracked,
        lastSyncedAt: cached?.updatedAt || fav?.lastSyncedAt || null,
      }
    : null;

  return res.json({
    avgPrice: locked ? null : avgCents != null ? eurosFromCents(avgCents) : null,
    minPrice: minCents != null ? eurosFromCents(minCents) : null,
    maxPrice: maxCents != null ? eurosFromCents(maxCents) : null,
    soldCount: listings.length,
    trackedItems: seller?.trackedItems ?? listings.length,
    commonState: stateLabel(
      listings[0]?.state || cached?.commonState || 'VERY_GOOD',
    ),
    brand: brand || listings[0]?.brandName || null,
    category: sellerId
      ? tracked
        ? 'Vendeur tracké'
        : 'Profil vendeur'
      : 'Ventes similaires',
    title: seller ? `@${seller.login}` : brand || 'Radar',
    days,
    sortBy,
    notice:
      'Nous trackons seulement les ventes des articles à plus de 15 euros.',
    locked: {
      avgSoldPrice: locked,
      analytics: locked,
    },
    plan: store.plan,
    needsTrack: Boolean(sellerId && !tracked && listings.length === 0),
    trackedSellers: store.getFavoriteSellers().map((s) => ({
      id: s.id,
      vintedId: s.vintedId,
      login: s.login,
      domain: s.domain,
      photoUrl: s.photoUrl,
      salesCount: store.getListingsForSeller(s.vintedId).length,
    })),
    recentSold: listings.slice(0, 40).map((l) => ({
      id: l.id,
      title: l.title,
      price: eurosFromCents(l.price),
      state: stateLabel(l.state),
      photo: listingPhoto(l),
      photoCount: Math.max(l.photos?.length || 0, 1),
      favouriteCount: l.favouriteCount ?? 0,
      soldAt: l.soldAt,
      soldAtLabel: formatSoldDate(l.soldAt),
      url:
        l.url ||
        `https://www.${domain}/items/${l.vintedId}`,
      sellerId: l.sellerId || sellerId,
    })),
    seller,
    inventoryHint: store.inventorySummary(),
    fetchedAt: new Date().toISOString(),
  });
}
