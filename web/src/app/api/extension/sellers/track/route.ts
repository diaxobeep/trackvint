import { NextRequest } from 'next/server';
import { demoStore } from '@/lib/demoStore';
import { createAdminClient } from '@/lib/supabase/admin';
import { canUseSupabaseStore, resolveUserId } from '@/lib/authUser';
import { corsJson, corsOptions } from '@/lib/cors';

export async function OPTIONS() {
  return corsOptions();
}

/**
 * POST /api/extension/sellers/track
 * Body: { seller: { vintedId, login, domain, photoUrl }, track?: boolean }
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const seller = body.seller || body;
    const vintedId = String(seller.vintedId ?? seller.id ?? '');
    if (!vintedId) {
      return corsJson({ error: 'vintedId_required' }, { status: 400 });
    }

    const userId = await resolveUserId(req);
    const login =
      seller.login || seller.name || seller.vintedUsername || `vendeur-${vintedId.slice(-4)}`;
    const domain = seller.domain || 'vinted.fr';
    const photoUrl = seller.photoUrl || seller.photo || null;
    const sourceUrl = `https://www.${domain}/member/${vintedId}`;

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
            source_url: sourceUrl,
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
    }

    const result = demoStore.upsertSeller({
      userId,
      vintedSellerId: vintedId,
      vintedUsername: login,
      domain,
      sourceUrl,
      photoUrl: photoUrl || undefined,
    });

    return corsJson({
      ok: true,
      tracked: true,
      favorite: {
        id: result.tracker.id,
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
    return corsJson(
      { ok: false, error: err instanceof Error ? err.message : 'track_failed' },
      { status: 500 },
    );
  }
}
