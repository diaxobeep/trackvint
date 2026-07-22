import { NextRequest } from 'next/server';
import { demoStore } from '@/lib/demoStore';
import { createAdminClient } from '@/lib/supabase/admin';
import { canUseSupabaseStore, resolveUserId } from '@/lib/authUser';
import { corsJson, corsOptions } from '@/lib/cors';

export async function OPTIONS() {
  return corsOptions();
}

/** POST /api/extension/sellers/favorite — alias track */
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const userId = await resolveUserId(req);
  const vintedId = String(body.vintedId ?? body.seller?.vintedId ?? '');
  if (!vintedId) {
    return corsJson({ error: 'vintedId_required' }, { status: 400 });
  }
  const login = body.login || body.seller?.login || `vendeur-${vintedId.slice(-4)}`;
  const domain = body.domain || 'vinted.fr';
  const photoUrl = body.photoUrl || null;

  if (canUseSupabaseStore(userId)) {
    const admin = createAdminClient()!;
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
    if (error) {
      return corsJson({ error: error.message }, { status: 500 });
    }
    return corsJson(
      { id: data.id, vintedId, login, domain, photoUrl, salesCount: 0 },
      { status: 201 },
    );
  }

  const result = demoStore.upsertSeller({
    userId,
    vintedSellerId: vintedId,
    vintedUsername: login,
    domain,
    sourceUrl: `https://www.${domain}/member/${vintedId}`,
    photoUrl: photoUrl || undefined,
  });
  return corsJson(
    {
      id: result.tracker.id,
      vintedId,
      login,
      domain,
      photoUrl,
      salesCount: 0,
    },
    { status: 201 },
  );
}

/** DELETE /api/extension/sellers/favorite?vintedId= */
export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const vintedId = searchParams.get('vintedId') || '';
  if (!vintedId) {
    return corsJson({ error: 'seller_not_found' }, { status: 404 });
  }

  const userId = await resolveUserId(req);
  if (canUseSupabaseStore(userId)) {
    const admin = createAdminClient()!;
    await admin
      .from('seller_trackers')
      .update({ is_active: false })
      .eq('user_id', userId)
      .eq('vinted_seller_id', vintedId);
    return corsJson({ ok: true });
  }

  // demo store: soft-remove by marking inactive if present
  const sellers = demoStore.listSellers(userId);
  const hit = sellers.find((s) => s.vintedSellerId === vintedId);
  if (hit) hit.isActive = false;
  return corsJson({ ok: true });
}
