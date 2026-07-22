import { NextRequest } from 'next/server';
import { requireUserId } from '@/lib/authUser';
import {
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
    const [{ sellers, searches }, salesRows, profile] = await Promise.all([
      fetchUserTrackers(userId),
      fetchUserSales(userId, 200),
      fetchUserProfile(userId),
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
      trackers: [
        ...sellers.map((s) => ({
          id: s.id,
          name: s.vinted_username || s.vinted_seller_id,
          salesVolume: sales.filter((x) => x.sellerLogin === s.vinted_username)
            .length,
          avgPrice,
          saleSpeedDays: avgSpeed,
          status: 'ok',
        })),
        ...searches.map((s) => ({
          id: s.id,
          name: s.label || 'Recherche',
          salesVolume: 0,
          status: 'ok',
        })),
      ],
      folders: searches.map((s) => ({
        id: s.id,
        name: s.label || 'Recherche',
        itemCount: 0,
      })),
      sellers: sellers.map((s) => ({
        id: s.id,
        login: s.vinted_username,
        vintedId: s.vinted_seller_id,
        photoUrl: s.photo_url,
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
