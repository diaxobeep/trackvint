import { store } from '../data/store.js';
import { eurosFromCents } from '../models/types.js';

/**
 * GET /api/radar/sold-similar
 * Query: imageUrl×N, from, to, brand, title, brandId, categoryId,
 *        colorName, desc, level, topK, sortBy
 */
export function soldSimilar(req, res) {
  const {
    brand,
    title,
    level = 'model',
    sortBy = 'recent',
    topK = '1000',
  } = req.query;

  let listings = store.getSoldListings().filter((l) => {
    if (brand && l.brandName?.toLowerCase() !== String(brand).toLowerCase()) {
      // si brand fourni mais mismatch, on garde quand même un peu de bruit réaliste
      return l.brandName?.toLowerCase().includes(String(brand).toLowerCase());
    }
    if (title) {
      const t = String(title).toLowerCase();
      return l.title.toLowerCase().includes(t.split(/\s+/)[0] ?? '');
    }
    return true;
  });

  if (listings.length === 0) {
    listings = store.getSoldListings().slice(0, 3);
  }

  if (sortBy === 'price') {
    listings = [...listings].sort((a, b) => b.price - a.price);
  } else {
    listings = [...listings].sort(
      (a, b) => new Date(b.soldAt || 0) - new Date(a.soldAt || 0),
    );
  }

  const limit = Math.min(Number(topK) || 50, 50);
  listings = listings.slice(0, limit);

  const prices = listings.map((l) => l.price);
  const avgCents = prices.length
    ? Math.round(prices.reduce((a, b) => a + b, 0) / prices.length)
    : null;

  const planIsFree = !store.isPro();
  const modelLabel = [brand, title].filter(Boolean).join(' ') || 'tessa blanc bleu ensemble';

  return res.json({
    avgPrice: planIsFree ? null : eurosFromCents(avgCents ?? 0),
    brands: [
      {
        brandId: 7740,
        brandName: brand || 'tessa',
        count: listings.length,
        maxPrice: Math.max(...prices, 0),
        minPrice: Math.min(...prices, 0),
        sampleImage: listings[0]?.photos?.[0] ?? null,
      },
    ],
    canBroaden: level === 'model' || level === 'model_color',
    colorRelaxed: false,
    effectiveScope: level,
    hasMore: false,
    locked: { priceStats: planIsFree },
    model: null,
    modelLabel,
    pinnedBrandId: null,
    range: {
      from: String(req.query.from || defaultFrom()),
      to: String(req.query.to || defaultTo()),
    },
    recentSold: listings,
    salesByPeriod: groupSalesByWeek(listings),
    scope: level,
    soldCount: listings.length,
    typeSize: 1,
  });
}

/**
 * GET /api/radar/catalog-combined
 */
export function catalogCombined(req, res) {
  const listings = store.getSoldListings();
  const prices = listings.map((l) => l.price);
  const avg = prices.reduce((a, b) => a + b, 0) / (prices.length || 1);
  const locked = !store.isPro();

  return res.json({
    catalogIds: String(req.query.catalogIds || '')
      .split(',')
      .filter(Boolean),
    range: {
      from: String(req.query.from || defaultFrom()),
      to: String(req.query.to || defaultTo()),
    },
    soldCount: listings.length,
    avgSoldPrice: locked ? null : Math.round(avg),
    minPrice: prices.length ? Math.min(...prices) : null,
    maxPrice: prices.length ? Math.max(...prices) : null,
    commonState: null,
    salesPerDay: null,
    publishedPerDay: null,
    recentSold: listings.slice(0, 10),
    hasMore: false,
    locked: {
      analytics: locked,
      avgSoldPrice: locked,
      totalRevenue: locked,
    },
    topBrands: [],
    topCategories: [],
  });
}

/**
 * GET /api/radar/seller-stats
 * Query: sellerId, domain, from, to, sortBy?, offset?
 */
export function sellerStats(req, res) {
  const sellerId = String(req.query.sellerId || '');
  const domain = String(req.query.domain || 'vinted.fr');
  const offset = Number(req.query.offset || 0);
  const sortBy = String(req.query.sortBy || 'recent');

  if (!sellerId) {
    return res.status(400).json({ error: 'sellerId_required' });
  }

  // Simule un vendeur non tracké
  if (sellerId === '0' || sellerId === 'notfound') {
    return res.status(404).json({ error: 'seller_not_tracked' });
  }

  let recentSold = store.getSoldListings().filter((l) => l.domain === domain);
  if (sortBy === 'price') {
    recentSold = [...recentSold].sort((a, b) => b.price - a.price);
  }

  const page = recentSold.slice(offset, offset + 10);
  const published = store.getPublishedListings();
  const locked = !store.isPro();
  const cached = store.getSellerProfile?.(sellerId);
  const login = cached?.login || store.sellerLoginFor(sellerId);
  const prices = recentSold.map((l) => l.price);
  const avgCents = prices.length
    ? Math.round(prices.reduce((a, b) => a + b, 0) / prices.length)
    : null;
  const totalRevenue = prices.length
    ? prices.reduce((a, b) => a + b, 0)
    : null;

  return res.json({
    seller: {
      bannedByVinted: false,
      city: cached?.city || null,
      country: cached?.country || null,
      countryCode: cached?.countryCode || null,
      domain: cached?.domain || domain,
      feedbackCount: cached?.feedbackCount ?? null,
      feedbackReputation: cached?.feedbackReputation ?? null,
      isBusiness: Boolean(cached?.isBusiness),
      isSuspect: false,
      login,
      photoUrl: cached?.photoUrl || null,
      profileUrl: `https://www.${domain}/member/${sellerId}`,
      suspicionBand: 'none',
      suspicionReasonCodes: [],
      vintedId: sellerId,
    },
    stats: {
      avgSoldPrice: locked ? null : avgCents,
      publicationsPerDay30d: null,
      soldCount: recentSold.length,
      totalItems: published.length + recentSold.length,
      totalRevenue: locked ? null : totalRevenue,
    },
    publicationMetrics: {
      boostsPerDay: null,
      priceModificationsPerDay: null,
      publicationsPerDay: null,
    },
    performanceMetrics: null,
    publishedChart: store.buildPublishedChart(30),
    soldChart: store.buildSoldChart(30),
    recentPublished: published,
    recentSold: page,
    brandRevenue: [],
    categoryRevenue: [],
    averageBasketSeries: [],
    topBrands: [],
    topCategories: [],
    trends: null,
    hasMore: offset + 10 < recentSold.length,
    locked: {
      analytics: locked,
      avgSoldPrice: locked,
      totalRevenue: locked,
    },
  });
}

function defaultTo() {
  return new Date().toISOString().slice(0, 10);
}

function defaultFrom() {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - 30);
  return d.toISOString().slice(0, 10);
}

function groupSalesByWeek(listings) {
  const map = new Map();
  for (const l of listings) {
    if (!l.soldAt) continue;
    const week = l.soldAt.slice(0, 10);
    map.set(week, (map.get(week) || 0) + 1);
  }
  return [...map.entries()].map(([period, count]) => ({ period, count }));
}
