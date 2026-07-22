import { NextRequest } from 'next/server';
import { requireUserId } from '@/lib/authUser';
import { fetchUserSales, mapSale } from '@/lib/supabaseData';
import { corsJson, corsOptions } from '@/lib/cors';

export async function OPTIONS() {
  return corsOptions();
}

export async function GET(req: NextRequest) {
  try {
    const userId = await requireUserId(req);
    const sales = (await fetchUserSales(userId, 500)).map(mapSale);

    const byBrand = new Map<
      string,
      { brand: string; sold: number; sumPrice: number; sparkline: number[] }
    >();

    for (const s of sales) {
      const brand = s.brand || 'Autre';
      const cur = byBrand.get(brand) || {
        brand,
        sold: 0,
        sumPrice: 0,
        sparkline: [0, 0, 0, 0, 0, 0, 0],
      };
      cur.sold += 1;
      cur.sumPrice += s.priceCents / 100;
      const day = Math.min(
        6,
        Math.max(0, Math.floor((Date.now() - new Date(s.soldAt).getTime()) / 86400000)),
      );
      cur.sparkline[6 - day] += 1;
      byBrand.set(brand, cur);
    }

    const niches = [...byBrand.values()]
      .map((b) => ({
        brand: b.brand,
        sold: b.sold,
        avgPrice: b.sold ? Number((b.sumPrice / b.sold).toFixed(2)) : 0,
        // Volume relatif sur la période (pas de STR inventé)
        sellThroughRate: null as number | null,
        volumeShare: null as number | null,
        sparkline: b.sparkline,
      }))
      .sort((a, b) => b.sold - a.sold);

    const totalSold = niches.reduce((a, n) => a + n.sold, 0) || 1;
    for (const n of niches) {
      n.volumeShare = Math.round((n.sold / totalSold) * 100);
    }

    return corsJson({ ok: true, niches });
  } catch (err) {
    const e = err as Error & { status?: number };
    return corsJson(
      { ok: false, error: e.message || 'Erreur' },
      { status: e.status || 500 },
    );
  }
}
