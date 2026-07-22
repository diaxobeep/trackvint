import { NextRequest } from 'next/server';
import { requireUserId } from '@/lib/authUser';
import { createAdminClient } from '@/lib/supabase/admin';
import {
  ensureDefaultCategories,
  fetchUserCategories,
} from '@/lib/supabaseData';
import { corsJson, corsOptions } from '@/lib/cors';

export async function OPTIONS() {
  return corsOptions();
}

/** GET /api/categories — liste des catégories de l'utilisateur */
export async function GET(req: NextRequest) {
  try {
    const userId = await requireUserId(req);
    const categories = await fetchUserCategories(userId);
    return corsJson({ ok: true, categories });
  } catch (err) {
    const e = err as Error & { status?: number };
    return corsJson(
      { ok: false, error: e.message || 'Erreur' },
      { status: e.status || 500 },
    );
  }
}

/** POST /api/categories — crée une catégorie custom */
export async function POST(req: NextRequest) {
  try {
    const userId = await requireUserId(req);
    await ensureDefaultCategories(userId);
    const body = await req.json().catch(() => ({}));
    const name = String(body.name || '').trim();
    if (!name) {
      return corsJson({ ok: false, error: 'Nom requis' }, { status: 400 });
    }
    const slug = name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 60);

    const admin = createAdminClient();
    const { data, error } = await admin
      .from('categories')
      .insert({
        user_id: userId,
        name,
        slug: slug || `cat-${Date.now()}`,
        kind: 'custom',
        is_system: false,
      })
      .select()
      .single();
    if (error) throw error;
    return corsJson({ ok: true, category: data }, { status: 201 });
  } catch (err) {
    const e = err as Error & { status?: number };
    return corsJson(
      { ok: false, error: e.message || 'Erreur' },
      { status: e.status || 500 },
    );
  }
}
