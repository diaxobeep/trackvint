import { NextRequest } from 'next/server';
import { requireUserId } from '@/lib/authUser';
import { upsertTracker } from '@/lib/supabaseData';
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

    const result = await upsertTracker({
      userId,
      type: 'seller',
      categoryId: body.categoryId || null,
      domain,
      sourceUrl: `https://www.${domain}/member/${vintedId}`,
      photoUrl,
      vintedSellerId: vintedId,
      vintedUsername: login,
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
        categoryId: result.tracker.category_id,
      },
      category: result.tracker.categories,
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
