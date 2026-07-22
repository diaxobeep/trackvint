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
    const vintedId = String(body.vintedId ?? body.seller?.vintedId ?? '');
    if (!vintedId) {
      return corsJson({ error: 'vintedId_required' }, { status: 400 });
    }
    const login =
      body.login || body.seller?.login || `vendeur-${vintedId.slice(-4)}`;
    const domain = body.domain || 'vinted.fr';
    const photoUrl = body.photoUrl || null;
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
          is_active: true,
        },
        { onConflict: 'user_id,vinted_seller_id' },
      )
      .select()
      .single();
    if (error) throw error;

    return corsJson(
      { id: data.id, vintedId, login, domain, photoUrl, salesCount: 0 },
      { status: 201 },
    );
  } catch (err) {
    const e = err as Error & { status?: number };
    return corsJson(
      { error: e.message || 'favorite_failed' },
      { status: e.status || 500 },
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const userId = await requireUserId(req);
    const vintedId = new URL(req.url).searchParams.get('vintedId') || '';
    if (!vintedId) {
      return corsJson({ error: 'seller_not_found' }, { status: 404 });
    }
    const admin = createAdminClient();
    const { error } = await admin
      .from('seller_trackers')
      .update({ is_active: false })
      .eq('user_id', userId)
      .eq('vinted_seller_id', vintedId);
    if (error) throw error;
    return corsJson({ ok: true });
  } catch (err) {
    const e = err as Error & { status?: number };
    return corsJson(
      { error: e.message || 'unfavorite_failed' },
      { status: e.status || 500 },
    );
  }
}
