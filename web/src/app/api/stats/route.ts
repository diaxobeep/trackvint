import { NextRequest } from 'next/server';
import { requireUserId, resolveUserId } from '@/lib/authUser';
import {
  fetchUserSales,
  fetchUserTrackers,
  mapSale,
} from '@/lib/supabaseData';
import { corsJson, corsOptions } from '@/lib/cors';

export async function OPTIONS() {
  return corsOptions();
}

function euros(cents: number | null) {
  if (cents == null) return null;
  return Math.round(cents) / 100;
}

function formatSoldDate(iso?: string) {
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

/** GET /api/stats — Radar extension (données DB uniquement). */
export async function GET(req: NextRequest) {
  try {
    // Auth optionnelle pour lecture légère ; si absente → empty radar
    const userId = (await resolveUserId(req)) || (await requireUserId(req).catch(() => null));
    const { searchParams } = new URL(req.url);
    const sellerId = searchParams.get('sellerId');
    const domain = searchParams.get('domain') || 'vinted.fr';
    const days = Math.min(Math.max(Number(searchParams.get('days') || 30), 1), 365);
    const sortBy = searchParams.get('sortBy') || 'recent';
    const cutoff = Date.now() - days * 864e5;

    if (!userId) {
      return corsJson({
        avgPrice: null,
        minPrice: null,
        maxPrice: null,
        soldCount: 0,
        trackedItems: 0,
        commonState: null,
        brand: null,
        category: sellerId ? 'Profil vendeur' : 'Radar',
        title: sellerId ? 'Vendeur' : 'Radar',
        days,
        sortBy,
        notice: 'Connecte-toi pour synchroniser tes trackers.',
        locked: { avgSoldPrice: true, analytics: true },
        plan: 'free',
        needsTrack: Boolean(sellerId),
        trackedSellers: [],
        recentSold: [],
        seller: sellerId
          ? {
              vintedId: sellerId,
              login: `vendeur-${sellerId.slice(-4)}`,
              domain,
              photoUrl: null,
              profileUrl: `https://www.${domain}/member/${sellerId}`,
              isFavorite: false,
              tracked: false,
              soldCount: 0,
              trackedItems: 0,
              activeItems: 0,
            }
          : null,
        inventoryHint: { total: 0, active: 0, sold: 0 },
        fetchedAt: new Date().toISOString(),
      });
    }

    const [{ sellers }, salesRows] = await Promise.all([
      fetchUserTrackers(userId),
      fetchUserSales(userId, 200),
    ]);
    const sales = salesRows.map(mapSale);
    const tracked = sellerId
      ? sellers.find((s) => s.vinted_seller_id === sellerId)
      : null;

    let listings = sales.filter((s) => new Date(s.soldAt).getTime() >= cutoff);
    if (sellerId && tracked) {
      listings = listings.filter((s) => s.sellerLogin === tracked.vinted_username);
    } else if (sellerId) {
      listings = [];
    }

    if (sortBy === 'price') {
      listings = [...listings].sort((a, b) => b.priceCents - a.priceCents);
    } else {
      listings = [...listings].sort((a, b) => b.soldAt.localeCompare(a.soldAt));
    }

    const prices = listings.map((l) => l.priceCents);
    const avgCents = prices.length
      ? Math.round(prices.reduce((a, b) => a + b, 0) / prices.length)
      : null;
    const minCents = prices.length ? Math.min(...prices) : null;
    const maxCents = prices.length ? Math.max(...prices) : null;
    const login = tracked?.vinted_username || null;

    const seller = sellerId
      ? {
          vintedId: sellerId,
          login: login || `vendeur-${sellerId.slice(-4)}`,
          domain: tracked?.domain || domain,
          city: null,
          country: null,
          feedbackCount: null,
          feedbackReputation: null,
          publicationsPerDay: null,
          soldCount: listings.length,
          trackedItems: listings.length,
          activeItems: 0,
          photoUrl: tracked?.photo_url || null,
          profileUrl: `https://www.${domain}/member/${sellerId}`,
          isFavorite: Boolean(tracked),
          tracked: Boolean(tracked),
          lastSyncedAt: null,
        }
      : null;

    return corsJson({
      avgPrice: euros(avgCents),
      minPrice: euros(minCents),
      maxPrice: euros(maxCents),
      soldCount: listings.length,
      trackedItems: seller?.trackedItems ?? listings.length,
      commonState: null,
      brand: listings[0]?.brand || null,
      category: sellerId
        ? tracked
          ? 'Vendeur tracké'
          : 'Profil vendeur'
        : 'Ventes',
      title: seller ? `@${seller.login}` : 'Radar',
      days,
      sortBy,
      notice:
        'Nous trackons seulement les ventes des articles à plus de 15 euros.',
      locked: { avgSoldPrice: false, analytics: false },
      plan: 'free',
      needsTrack: Boolean(sellerId && !tracked && listings.length === 0),
      trackedSellers: sellers.map((s) => ({
        id: s.id,
        vintedId: s.vinted_seller_id,
        login: s.vinted_username,
        domain: s.domain,
        photoUrl: s.photo_url,
        salesCount: sales.filter((x) => x.sellerLogin === s.vinted_username)
          .length,
      })),
      recentSold: listings.slice(0, 40).map((l) => ({
        id: l.id,
        title: l.title,
        price: euros(l.priceCents),
        state: null,
        photo: l.photoUrl || null,
        photoCount: l.photoUrl ? 1 : 0,
        favouriteCount: 0,
        soldAt: l.soldAt,
        soldAtLabel: formatSoldDate(l.soldAt),
        url: l.itemUrl || `https://www.${domain}/items/${l.vintedItemId}`,
        sellerId: sellerId || undefined,
      })),
      seller,
      inventoryHint: { total: 0, active: 0, sold: listings.length },
      fetchedAt: new Date().toISOString(),
    });
  } catch (err) {
    const e = err as Error & { status?: number };
    return corsJson(
      { error: e.message || 'Erreur stats' },
      { status: e.status || 500 },
    );
  }
}
