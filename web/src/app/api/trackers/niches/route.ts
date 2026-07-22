import { NextRequest } from 'next/server';
import { demoStore } from '@/lib/demoStore';
import { createAdminClient } from '@/lib/supabase/admin';
import { canUseSupabaseStore, resolveUserId } from '@/lib/authUser';
import { corsJson, corsOptions } from '@/lib/cors';

export async function OPTIONS() {
  return corsOptions();
}

export async function GET(req: NextRequest) {
  const userId = await resolveUserId(req);
  let sales = demoStore.listSales('demo', 500);

  if (canUseSupabaseStore(userId)) {
    const admin = createAdminClient()!;
    const { data } = await admin
      .from('detected_sales')
      .select('*')
      .eq('user_id', userId)
      .limit(500);
    sales = (data || []).map((row) => ({
      id: row.id,
      userId: row.user_id,
      vintedItemId: row.vinted_item_id,
      title: row.title || '',
      brand: row.brand || 'Autre',
      priceCents: row.price_cents || 0,
      photoUrl: row.photo_url,
      sellerLogin: row.seller_login,
      sellerPhotoUrl: row.seller_photo_url,
      itemUrl: row.item_url,
      soldAt: row.sold_at,
      saleSpeedHours: Number(row.sale_speed_hours) || 24,
    }));
  }

  const byBrand = new Map<
    string,
    {
      brand: string;
      sold: number;
      sumPrice: number;
      sparkline: number[];
    }
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
      Math.floor((Date.now() - new Date(s.soldAt).getTime()) / 86400000),
    );
    cur.sparkline[6 - day] += 1;
    byBrand.set(brand, cur);
  }

  const niches = [...byBrand.values()]
    .map((b) => ({
      brand: b.brand,
      sold: b.sold,
      avgPrice: b.sold ? Number((b.sumPrice / b.sold).toFixed(2)) : 0,
      sellThroughRate: Math.min(
        100,
        Math.round((b.sold / Math.max(8, b.sold + 3)) * 100),
      ),
      sparkline: b.sparkline,
    }))
    .sort((a, b) => b.sold - a.sold);

  return corsJson({ ok: true, niches });
}
