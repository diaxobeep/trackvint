import { NextResponse } from 'next/server';
import { demoStore } from '@/lib/demoStore';

/** Overview dashboard same-origin (pas de dépendance Express en prod). */
export async function GET() {
  const sellers = demoStore.listSellers();
  const searches = demoStore.listSearches();
  const sales = demoStore.listSales('demo', 100);
  const avgPrice =
    sales.length > 0
      ? sales.reduce((a, s) => a + s.priceCents / 100, 0) / sales.length
      : null;
  const avgSpeed =
    sales.length > 0
      ? sales.reduce((a, s) => a + (s.saleSpeedHours || 24) / 24, 0) / sales.length
      : null;

  return NextResponse.json({
    ok: true,
    plan: 'free',
    progress: {
      percent: Math.min(100, (sellers.length + searches.length) * 15),
      catalog: { current: searches.length, target: 10 },
      profile: { current: sellers.length, target: 5 },
    },
    topCategory: sales[0]
      ? {
          name: sales[0].brand,
          avgSaleSpeedDays: Number(((sales[0].saleSpeedHours || 24) / 24).toFixed(2)),
          weekLabel: 'cette semaine',
        }
      : null,
    avgSaleSpeedDays: avgSpeed != null ? Number(avgSpeed.toFixed(2)) : null,
    avgPrice: avgPrice != null ? Number(avgPrice.toFixed(2)) : null,
    soldCount: sales.length,
    trackers: [
      ...sellers.map((s) => ({
        id: s.id,
        name: s.vintedUsername,
        salesVolume: sales.filter((x) => x.sellerLogin === s.vintedUsername).length,
        avgPrice,
        saleSpeedDays: avgSpeed,
        status: 'ok',
      })),
      ...searches.map((s) => ({
        id: s.id,
        name: s.label,
        salesVolume: 0,
        status: 'ok',
      })),
    ],
    folders: searches.map((s) => ({
      id: s.id,
      name: s.label,
      itemCount: 0,
    })),
    sellers: sellers.map((s) => ({
      id: s.id,
      login: s.vintedUsername,
      vintedId: s.vintedSellerId,
      photoUrl: s.photoUrl,
      salesCount: sales.filter((x) => x.sellerLogin === s.vintedUsername).length,
    })),
    crawler: { enabled: true },
  });
}
