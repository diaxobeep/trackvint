import { NextRequest } from 'next/server';
import { requireUserId } from '@/lib/authUser';
import {
  fetchUserCategories,
  fetchUserProfile,
  fetchUserSales,
  fetchUserTrackers,
  mapSale,
} from '@/lib/supabaseData';
import { corsJson, corsOptions } from '@/lib/cors';

export async function OPTIONS() {
  return corsOptions();
}

export async function GET(req: NextRequest) {
  try {
    const userId = await requireUserId(req);
    const [{ sellers, searches, all }, salesRows, profile, categories] =
      await Promise.all([
        fetchUserTrackers(userId),
        fetchUserSales(userId, 200),
        fetchUserProfile(userId),
        fetchUserCategories(userId),
      ]);
    const sales = salesRows.map(mapSale);

    const avgPrice =
      sales.length > 0
        ? sales.reduce((a, s) => a + s.priceCents / 100, 0) / sales.length
        : null;
    const avgSpeed =
      sales.length > 0
        ? sales.reduce((a, s) => a + (s.saleSpeedHours || 24) / 24, 0) /
          sales.length
        : null;

    const categoryCounts = new Map<string, number>();
    for (const t of all) {
      categoryCounts.set(
        t.category_id,
        (categoryCounts.get(t.category_id) || 0) + 1,
      );
    }

    return corsJson({
      ok: true,
      plan: profile?.plan || 'free',
      user: profile
        ? { name: profile.full_name, email: profile.email }
        : undefined,
      progress: {
        percent: Math.min(100, (sellers.length + searches.length) * 15),
        catalog: { current: searches.length, target: 10 },
        profile: { current: sellers.length, target: 5 },
      },
      topCategory: sales[0]
        ? {
            name: sales[0].brand || '—',
            avgSaleSpeedDays: Number(
              ((sales[0].saleSpeedHours || 24) / 24).toFixed(2),
            ),
            weekLabel: 'cette semaine',
          }
        : null,
      avgSaleSpeedDays: avgSpeed != null ? Number(avgSpeed.toFixed(2)) : null,
      avgPrice: avgPrice != null ? Number(avgPrice.toFixed(2)) : null,
      soldCount: sales.length,
      categories: categories.map((c) => ({
        id: c.id,
        name: c.name,
        slug: c.slug,
        kind: c.kind,
        isSystem: c.is_system,
        trackerCount: categoryCounts.get(c.id) || 0,
      })),
      trackers: [
        ...sellers.map((s) => ({
          id: s.id,
          name: s.vinted_username || s.vinted_seller_id,
          type: 'seller' as const,
          categoryId: s.category_id,
          salesVolume: sales.filter((x) => x.sellerLogin === s.vinted_username)
            .length,
          avgPrice,
          saleSpeedDays: avgSpeed,
          status: 'ok',
        })),
        ...searches.map((s) => ({
          id: s.id,
          name: s.label || 'Recherche',
          type: 'search' as const,
          categoryId: s.category_id,
          salesVolume: 0,
          status: 'ok',
        })),
      ],
      folders: categories.map((c) => ({
        id: c.id,
        name: c.name,
        itemCount: categoryCounts.get(c.id) || 0,
      })),
      sellers: sellers.map((s) => ({
        id: s.id,
        login: s.vinted_username,
        vintedId: s.vinted_seller_id,
        photoUrl: s.photo_url,
        categoryId: s.category_id,
        salesCount: sales.filter((x) => x.sellerLogin === s.vinted_username)
          .length,
      })),
      crawler: { enabled: true },
    });
  } catch (err) {
    const e = err as Error & { status?: number };
    return corsJson(
      { ok: false, error: e.message || 'Erreur' },
      { status: e.status || 500 },
    );
  }
}
