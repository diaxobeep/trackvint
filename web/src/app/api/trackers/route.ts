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

  if (canUseSupabaseStore(userId)) {
    const admin = createAdminClient()!;
    const [sellers, searches] = await Promise.all([
      admin
        .from('seller_trackers')
        .select('*')
        .eq('user_id', userId)
        .eq('is_active', true),
      admin
        .from('search_trackers')
        .select('*')
        .eq('user_id', userId)
        .eq('is_active', true),
    ]);
    return corsJson({
      ok: true,
      sellers: sellers.data || [],
      searches: searches.data || [],
    });
  }

  return corsJson({
    ok: true,
    sellers: demoStore.listSellers().filter((s) => s.userId === userId || userId === 'demo'),
    searches: demoStore
      .listSearches()
      .filter((s) => s.userId === userId || userId === 'demo'),
  });
}
