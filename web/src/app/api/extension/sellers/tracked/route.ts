import { NextRequest } from 'next/server';
import { demoStore } from '@/lib/demoStore';
import { createAdminClient } from '@/lib/supabase/admin';
import { canUseSupabaseStore, resolveUserId } from '@/lib/authUser';
import { corsJson, corsOptions } from '@/lib/cors';

export async function OPTIONS() {
  return corsOptions();
}

/** GET /api/extension/sellers/tracked */
export async function GET(req: NextRequest) {
  const userId = await resolveUserId(req);
  let sellers = demoStore.listSellers(userId);

  if (canUseSupabaseStore(userId)) {
    const admin = createAdminClient()!;
    const { data } = await admin
      .from('seller_trackers')
      .select('*')
      .eq('user_id', userId)
      .eq('is_active', true);
    sellers = (data || []).map((r) => ({
      id: r.id,
      userId: r.user_id,
      vintedSellerId: r.vinted_seller_id,
      vintedUsername: r.vinted_username,
      domain: r.domain,
      sourceUrl: r.source_url || '',
      photoUrl: r.photo_url,
      isActive: r.is_active,
    }));
  }

  return corsJson({
    sellers: sellers.map((s) => ({
      id: s.id,
      vintedId: s.vintedSellerId,
      login: s.vintedUsername,
      domain: s.domain,
      photoUrl: s.photoUrl,
      salesCount: 0,
    })),
  });
}
