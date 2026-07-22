import { NextRequest } from 'next/server';
import { requireUserId } from '@/lib/authUser';
import { createAdminClient } from '@/lib/supabase/admin';
import { upsertTracker } from '@/lib/supabaseData';
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

    const result = await upsertTracker({
      userId,
      type: 'seller',
      categoryId: body.categoryId || body.folderId || null,
      domain,
      sourceUrl: `https://www.${domain}/member/${vintedId}`,
      photoUrl,
      vintedSellerId: vintedId,
      vintedUsername: login,
    });

    return corsJson(
      {
        id: result.tracker.id,
        vintedId,
        login,
        domain,
        photoUrl,
        categoryId: result.tracker.category_id,
        salesCount: 0,
      },
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
      .from('trackers')
      .update({ is_active: false })
      .eq('user_id', userId)
      .eq('type', 'seller')
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
