import { NextRequest } from 'next/server';
import { demoStore } from '@/lib/demoStore';
import { createAdminClient } from '@/lib/supabase/admin';
import { canUseSupabaseStore, resolveUserId } from '@/lib/authUser';
import { corsJson, corsOptions } from '@/lib/cors';

export async function OPTIONS() {
  return corsOptions();
}

export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id } = await ctx.params;
  const userId = await resolveUserId(req);

  let seller = demoStore
    .listSellers()
    .find((s) => s.vintedSellerId === id);
  let sales = demoStore
    .listSales('demo', 200)
    .filter((s) => s.sellerLogin === seller?.vintedUsername);

  if (canUseSupabaseStore(userId)) {
    const admin = createAdminClient()!;
    const { data: row } = await admin
      .from('seller_trackers')
      .select('*')
      .eq('user_id', userId)
      .eq('vinted_seller_id', id)
      .maybeSingle();
    if (row) {
      seller = {
        id: row.id,
        userId: row.user_id,
        vintedSellerId: row.vinted_seller_id,
        vintedUsername: row.vinted_username,
        domain: row.domain,
        sourceUrl: row.source_url || '',
        photoUrl: row.photo_url,
        isActive: row.is_active,
      };
      const { data: saleRows } = await admin
        .from('detected_sales')
        .select('*')
        .eq('user_id', userId)
        .eq('seller_login', row.vinted_username)
        .limit(200);
      sales = (saleRows || []).map((r) => ({
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
  }

  if (!seller) {
    return corsJson({ ok: false, error: 'Vendeur introuvable' }, { status: 404 });
  }

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
      vintedId: seller.vintedSellerId,
      login: seller.vintedUsername,
      photoUrl: seller.photoUrl,
      domain: seller.domain,
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
}
