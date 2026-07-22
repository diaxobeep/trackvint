import { NextRequest } from 'next/server';
import { requireUserId } from '@/lib/authUser';
import { createAdminClient } from '@/lib/supabase/admin';
import { fetchUserSales, mapSale } from '@/lib/supabaseData';
import { corsJson, corsOptions } from '@/lib/cors';

export async function OPTIONS() {
  return corsOptions();
}

export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  try {
    const userId = await requireUserId(req);
    const { id } = await ctx.params;
    const admin = createAdminClient();

    const { data: row, error } = await admin
      .from('seller_trackers')
      .select('*')
      .eq('user_id', userId)
      .eq('vinted_seller_id', id)
      .eq('is_active', true)
      .maybeSingle();

    if (error) throw error;
    if (!row) {
      return corsJson({ ok: false, error: 'Vendeur introuvable' }, { status: 404 });
    }

    const allSales = (await fetchUserSales(userId, 500)).map(mapSale);
    const sales = allSales.filter((s) => s.sellerLogin === row.vinted_username);

    const avgPrice =
      sales.length > 0
        ? sales.reduce((a, s) => a + s.priceCents / 100, 0) / sales.length
        : 0;
    const brands: Record<string, number> = {};
    for (const s of sales) {
      brands[s.brand || 'Autre'] = (brands[s.brand || 'Autre'] || 0) + 1;
    }
    const topBrands = Object.entries(brands)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([name, count]) => ({ name, count }));

    return corsJson({
      ok: true,
      seller: {
        vintedId: row.vinted_seller_id,
        login: row.vinted_username,
        photoUrl: row.photo_url,
        domain: row.domain,
      },
      kpis: {
        avgPrice: Number(avgPrice.toFixed(2)),
        estimatedRevenue: Number(
          sales.reduce((a, s) => a + s.priceCents / 100, 0).toFixed(2),
        ),
        soldThisMonth: sales.length,
        topBrands,
      },
      activeItems: [],
      soldItems: sales,
    });
  } catch (err) {
    const e = err as Error & { status?: number };
    return corsJson(
      { ok: false, error: e.message || 'Erreur' },
      { status: e.status || 500 },
    );
  }
}
