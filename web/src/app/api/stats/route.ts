import { NextRequest } from 'next/server';
import { demoStore } from '@/lib/demoStore';
import { createAdminClient } from '@/lib/supabase/admin';
import { canUseSupabaseStore, resolveUserId } from '@/lib/authUser';
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

/**
 * GET /api/stats — payload Radar extension (évite Erreur 404 sur Vercel).
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const sellerId = searchParams.get('sellerId');
  const domain = searchParams.get('domain') || 'vinted.fr';
  const days = Math.min(Math.max(Number(searchParams.get('days') || 30), 1), 365);
  const sortBy = searchParams.get('sortBy') || 'recent';
  const userId = await resolveUserId(req);
  const cutoff = Date.now() - days * 864e5;

  let sellers = demoStore.listSellers(userId);
  let sales = demoStore.listSales(userId, 200);

  if (canUseSupabaseStore(userId)) {
    const admin = createAdminClient()!;
    const [sRes, salesRes] = await Promise.all([
      admin.from('seller_trackers').select('*').eq('user_id', userId).eq('is_active', true),
      admin
        .from('detected_sales')
        .select('*')
        .eq('user_id', userId)
        .order('sold_at', { ascending: false })
        .limit(200),
    ]);
    sellers = (sRes.data || []).map((r) => ({
      id: r.id,
      userId: r.user_id,
      vintedSellerId: r.vinted_seller_id,
      vintedUsername: r.vinted_username,
      domain: r.domain,
      sourceUrl: r.source_url || '',
      photoUrl: r.photo_url,
      isActive: r.is_active,
    }));
    sales = (salesRes.data || []).map((r) => ({
      id: r.id,
      userId: r.user_id,
      vintedItemId: r.vinted_item_id,
      title: r.title || '',
      brand: r.brand || '',
      priceCents: r.price_cents || 0,
      photoUrl: r.photo_url,
      sellerLogin: r.seller_login,
      sellerPhotoUrl: r.seller_photo_url,
      itemUrl: r.item_url,
      soldAt: r.sold_at,
      saleSpeedHours: Number(r.sale_speed_hours) || undefined,
    }));
  }

  const tracked = sellerId
    ? sellers.find((s) => s.vintedSellerId === sellerId)
    : null;

  let listings = sales.filter((s) => new Date(s.soldAt).getTime() >= cutoff);
  if (sellerId && tracked) {
    listings = listings.filter(
      (s) => s.sellerLogin === tracked.vintedUsername || !s.sellerLogin,
    );
  } else if (sellerId && !tracked) {
    // Pas encore de ventes en base pour ce profil → panel vide mais OK
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

  const login =
    tracked?.vintedUsername ||
    (sellerId ? `vendeur-${sellerId.slice(-4)}` : null);

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
        photoUrl:
          tracked?.photoUrl ||
          `https://i.pravatar.cc/96?u=${encodeURIComponent(sellerId)}`,
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
    commonState: 'Très bon état',
    brand: listings[0]?.brand || null,
    category: sellerId
      ? tracked
        ? 'Vendeur tracké'
        : 'Profil vendeur'
      : 'Ventes similaires',
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
      vintedId: s.vintedSellerId,
      login: s.vintedUsername,
      domain: s.domain,
      photoUrl: s.photoUrl,
      salesCount: sales.filter((x) => x.sellerLogin === s.vintedUsername).length,
    })),
    recentSold: listings.slice(0, 40).map((l) => ({
      id: l.id,
      title: l.title,
      price: euros(l.priceCents),
      state: 'Très bon état',
      photo:
        l.photoUrl ||
        `https://picsum.photos/seed/${l.vintedItemId}/112/148`,
      photoCount: 1,
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
}
