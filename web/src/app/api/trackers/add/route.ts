import { NextRequest } from 'next/server';
import { parseVintedUrl } from '@/lib/vintedUrl';
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
    const url = body.url || body.sourceUrl;
    const categoryId = body.categoryId || body.category_id || null;
    const parsed = parseVintedUrl(url);

    if (parsed.kind === 'seller') {
      const result = await upsertTracker({
        userId,
        type: 'seller',
        categoryId,
        domain: parsed.domain,
        sourceUrl: parsed.sourceUrl,
        vintedSellerId: parsed.vintedSellerId!,
        vintedUsername: parsed.vintedUsername || '',
      });
      return corsJson({
        ok: true,
        type: 'seller',
        created: result.created,
        tracker: result.tracker,
        category: result.tracker.categories,
        message: result.created ? 'Vendeur tracké' : 'Vendeur déjà tracké',
      });
    }

    const result = await upsertTracker({
      userId,
      type: 'search',
      categoryId,
      domain: parsed.domain,
      sourceUrl: parsed.searchUrl,
      searchUrl: parsed.searchUrl!,
      label: parsed.label || 'Recherche',
      parsedFilters: parsed.parsedFilters || {},
    });
    return corsJson({
      ok: true,
      type: 'search',
      created: result.created,
      tracker: result.tracker,
      category: result.tracker.categories,
      message: result.created ? 'Recherche trackée' : 'Recherche déjà trackée',
    });
  } catch (err) {
    const e = err as Error & { status?: number; code?: string };
    const status =
      e.status ||
      (e.code === 'INVALID_URL' ||
      e.code === 'UNSUPPORTED_URL' ||
      e.code === 'INVALID_CATEGORY' ||
      e.code === 'CATEGORY_TYPE_MISMATCH'
        ? 400
        : 500);
    return corsJson(
      { ok: false, error: e.message || 'Erreur tracker', code: e.code },
      { status },
    );
  }
}
