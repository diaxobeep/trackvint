import { NextRequest } from 'next/server';
import { demoStore } from '@/lib/demoStore';
import { createAdminClient } from '@/lib/supabase/admin';
import { canUseSupabaseStore, resolveUserId } from '@/lib/authUser';
import { corsJson, corsOptions } from '@/lib/cors';

export async function OPTIONS() {
  return corsOptions();
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const limit = Math.min(100, Number(searchParams.get('limit') || 40));
  const userId = await resolveUserId(req);

  if (canUseSupabaseStore(userId)) {
    const admin = createAdminClient()!;
    const { data } = await admin
      .from('detected_sales')
      .select('*')
      .eq('user_id', userId)
      .order('sold_at', { ascending: false })
      .limit(limit);

    const sales = (data || []).map((row) => ({
      id: row.id,
      userId: row.user_id,
      vintedItemId: row.vinted_item_id,
      title: row.title,
      brand: row.brand,
      priceCents: row.price_cents,
      photoUrl: row.photo_url,
      sellerLogin: row.seller_login,
      sellerPhotoUrl: row.seller_photo_url,
      itemUrl: row.item_url,
      soldAt: row.sold_at,
      saleSpeedHours: row.sale_speed_hours,
    }));
    return corsJson({ ok: true, sales });
  }

  return corsJson({
    ok: true,
    sales: demoStore.listSales(userId === 'demo' ? 'demo' : userId, limit),
  });
}
