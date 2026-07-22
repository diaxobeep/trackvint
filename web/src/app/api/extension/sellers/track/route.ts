import { NextRequest } from 'next/server';
import { requireUserId } from '@/lib/authUser';
import { createAdminClient } from '@/lib/supabase/admin';
import { corsJson, corsOptions } from '@/lib/cors';

export async function OPTIONS() {
  return corsOptions();
}

export async function POST(req: NextRequest) {
  try {
    const userId = await requireUserId(req);
    const body = await req.json().catch(() => ({}));
    const seller = body.seller || body;
    const vintedId = String(seller.vintedId ?? seller.id ?? '');
    if (!vintedId) {
      return corsJson({ error: 'vintedId_required' }, { status: 400 });
    }

    const login =
      seller.login ||
      seller.name ||
      seller.vintedUsername ||
      `vendeur-${vintedId.slice(-4)}`;
    const domain = seller.domain || 'vinted.fr';
    const photoUrl = seller.photoUrl || seller.photo || null;
    const admin = createAdminClient();

    const { data, error } = await admin
      .from('seller_trackers')
      .upsert(
        {
          user_id: userId,
          vinted_seller_id: vintedId,
          vinted_username: login,
          domain,
          photo_url: photoUrl,
          source_url: `https://www.${domain}/member/${vintedId}`,
          is_active: body.track !== false,
        },
        { onConflict: 'user_id,vinted_seller_id' },
      )
      .select()
      .single();
    if (error) throw error;

    return corsJson({
      ok: true,
      tracked: true,
      favorite: {
        id: data.id,
        vintedId,
        login,
        domain,
        photoUrl,
      },
      upserted: 0,
      salesCount: 0,
      activeCount: 0,
    });
  } catch (err) {
    const e = err as Error & { status?: number };
    return corsJson(
      { ok: false, error: e.message || 'track_failed' },
      { status: e.status || 500 },
    );
  }
}
