import { NextRequest } from 'next/server';
import { parseVintedUrl } from '@/lib/vintedUrl';
import { demoStore } from '@/lib/demoStore';
import { createAdminClient } from '@/lib/supabase/admin';
import { canUseSupabaseStore, resolveUserId } from '@/lib/authUser';
import { corsJson, corsOptions } from '@/lib/cors';

export async function OPTIONS() {
  return corsOptions();
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const url = body.url || body.sourceUrl;
    const parsed = parseVintedUrl(url);
    const userId = await resolveUserId(req);
    const useDb = canUseSupabaseStore(userId);
    const admin = useDb ? createAdminClient() : null;

    if (parsed.kind === 'seller') {
      if (admin) {
        const { data, error } = await admin
          .from('seller_trackers')
          .upsert(
            {
              user_id: userId,
              vinted_seller_id: parsed.vintedSellerId!,
              vinted_username: parsed.vintedUsername || '',
              domain: parsed.domain,
              source_url: parsed.sourceUrl,
              is_active: true,
            },
            { onConflict: 'user_id,vinted_seller_id' },
          )
          .select()
          .single();
        if (error) throw error;
        return corsJson({
          ok: true,
          type: 'seller',
          created: true,
          tracker: data,
          message: 'Vendeur tracké',
        });
      }

      const result = demoStore.upsertSeller({
        userId,
        vintedSellerId: parsed.vintedSellerId!,
        vintedUsername: parsed.vintedUsername || '',
        domain: parsed.domain,
        sourceUrl: parsed.sourceUrl,
      });
      return corsJson({
        ok: true,
        type: 'seller',
        created: result.created,
        tracker: result.tracker,
        message: result.created ? 'Vendeur tracké' : 'Vendeur déjà tracké',
      });
    }

    if (admin) {
      const { data, error } = await admin
        .from('search_trackers')
        .upsert(
          {
            user_id: userId,
            search_url: parsed.searchUrl!,
            label: parsed.label || 'Recherche',
            parsed_filters: parsed.parsedFilters || {},
            domain: parsed.domain,
            is_active: true,
          },
          { onConflict: 'user_id,search_url' },
        )
        .select()
        .single();
      if (error) throw error;
      return corsJson({
        ok: true,
        type: 'search',
        created: true,
        tracker: data,
        message: 'Recherche trackée',
      });
    }

    const result = demoStore.upsertSearch({
      userId,
      searchUrl: parsed.searchUrl!,
      label: parsed.label || 'Recherche',
      parsedFilters: parsed.parsedFilters || {},
      domain: parsed.domain,
    });
    return corsJson({
      ok: true,
      type: 'search',
      created: result.created,
      tracker: result.tracker,
      message: result.created ? 'Recherche trackée' : 'Recherche déjà trackée',
    });
  } catch (err) {
    const e = err as Error & { code?: string };
    const status =
      e.code === 'INVALID_URL' || e.code === 'UNSUPPORTED_URL' ? 400 : 500;
    return corsJson(
      { ok: false, error: e.message || 'Erreur tracker', code: e.code },
      { status },
    );
  }
}
