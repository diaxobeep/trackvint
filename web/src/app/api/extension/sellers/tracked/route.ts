import { NextRequest } from 'next/server';
import { requireUserId, resolveUserId } from '@/lib/authUser';
import { fetchUserTrackers } from '@/lib/supabaseData';
import { corsJson, corsOptions } from '@/lib/cors';

export async function OPTIONS() {
  return corsOptions();
}

export async function GET(req: NextRequest) {
  try {
    const userId = await resolveUserId(req);
    if (!userId) return corsJson({ sellers: [] });
    const { sellers } = await fetchUserTrackers(userId);
    return corsJson({
      sellers: sellers.map((s) => ({
        id: s.id,
        vintedId: s.vinted_seller_id,
        login: s.vinted_username,
        domain: s.domain,
        photoUrl: s.photo_url,
        salesCount: 0,
      })),
    });
  } catch (err) {
    return corsJson(
      { sellers: [], error: err instanceof Error ? err.message : 'Erreur' },
      { status: 500 },
    );
  }
}
