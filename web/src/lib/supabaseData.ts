import { createAdminClient } from '@/lib/supabase/admin';
import type { Category, Item, Json, Tracker, TrackerType } from '@/types/database';

export type DbSeller = {
  id: string;
  user_id: string;
  category_id: string;
  vinted_seller_id: string;
  vinted_username: string;
  domain: string;
  photo_url: string | null;
  source_url: string | null;
  is_active: boolean;
  created_at: string;
};

export type DbSearch = {
  id: string;
  user_id: string;
  category_id: string;
  search_url: string;
  label: string;
  parsed_filters: Record<string, unknown>;
  domain: string;
  is_active: boolean;
  created_at: string;
};

export type DbSale = {
  id: string;
  user_id: string;
  tracker_id: string;
  vinted_item_id: string;
  title: string | null;
  brand: string | null;
  price_cents: number | null;
  photo_url: string | null;
  seller_login: string | null;
  seller_photo_url: string | null;
  item_url: string | null;
  sold_at: string;
  sale_speed_hours: number | null;
};

export function mapSale(row: DbSale) {
  return {
    id: row.id,
    userId: row.user_id,
    trackerId: row.tracker_id,
    vintedItemId: row.vinted_item_id,
    title: row.title || '',
    brand: row.brand || '',
    priceCents: row.price_cents || 0,
    photoUrl: row.photo_url || undefined,
    sellerLogin: row.seller_login || undefined,
    sellerPhotoUrl: row.seller_photo_url || undefined,
    itemUrl: row.item_url || undefined,
    soldAt: row.sold_at,
    saleSpeedHours:
      row.sale_speed_hours != null ? Number(row.sale_speed_hours) : undefined,
  };
}

function trackerToSeller(t: Tracker): DbSeller {
  return {
    id: t.id,
    user_id: t.user_id,
    category_id: t.category_id,
    vinted_seller_id: t.vinted_seller_id || '',
    vinted_username: t.vinted_username,
    domain: t.domain,
    photo_url: t.photo_url,
    source_url: t.source_url,
    is_active: t.is_active,
    created_at: t.created_at,
  };
}

function trackerToSearch(t: Tracker): DbSearch {
  return {
    id: t.id,
    user_id: t.user_id,
    category_id: t.category_id,
    search_url: t.search_url || '',
    label: t.label,
    parsed_filters: (t.parsed_filters || {}) as Record<string, unknown>,
    domain: t.domain,
    is_active: t.is_active,
    created_at: t.created_at,
  };
}

/** Crée Vendeurs + Recherches si absents (jamais de catégorie random). */
export async function ensureDefaultCategories(userId: string) {
  const admin = createAdminClient();
  const { error } = await admin.rpc('ensure_default_categories', {
    p_user_id: userId,
  });
  if (error) throw error;
}

export async function fetchUserCategories(userId: string): Promise<Category[]> {
  const admin = createAdminClient();
  await ensureDefaultCategories(userId);
  const { data, error } = await admin
    .from('categories')
    .select('*')
    .eq('user_id', userId)
    .order('is_system', { ascending: false })
    .order('name', { ascending: true });
  if (error) throw error;
  return (data || []) as Category[];
}

/**
 * Résout la catégorie cible :
 * - categoryId fourni + appartenant à l'user → OK
 * - sinon catégorie système selon le type (vendeurs / recherches)
 * - refuse toute catégorie hors user
 */
export async function resolveCategoryId(
  userId: string,
  type: TrackerType,
  categoryId?: string | null,
): Promise<string> {
  const categories = await fetchUserCategories(userId);

  if (categoryId) {
    const hit = categories.find((c) => c.id === categoryId);
    if (!hit) {
      const err = new Error('Catégorie introuvable ou non autorisée') as Error & {
        status?: number;
        code?: string;
      };
      err.status = 400;
      err.code = 'INVALID_CATEGORY';
      throw err;
    }
    // Un tracker vendeur ne doit pas atterrir dans "Recherches" et inversement
    // sauf catégorie custom
    if (hit.kind === 'sellers' && type === 'search') {
      const err = new Error(
        'Un tracker recherche ne peut pas aller dans la catégorie Vendeurs',
      ) as Error & { status?: number; code?: string };
      err.status = 400;
      err.code = 'CATEGORY_TYPE_MISMATCH';
      throw err;
    }
    if (hit.kind === 'searches' && type === 'seller') {
      const err = new Error(
        'Un tracker vendeur ne peut pas aller dans la catégorie Recherches',
      ) as Error & { status?: number; code?: string };
      err.status = 400;
      err.code = 'CATEGORY_TYPE_MISMATCH';
      throw err;
    }
    return hit.id;
  }

  const slug = type === 'seller' ? 'vendeurs' : 'recherches';
  const system = categories.find((c) => c.slug === slug && c.is_system);
  if (!system) {
    const err = new Error('Catégorie système manquante') as Error & {
      status?: number;
    };
    err.status = 500;
    throw err;
  }
  return system.id;
}

export async function fetchUserTrackers(userId: string) {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from('trackers')
    .select('*')
    .eq('user_id', userId)
    .eq('is_active', true)
    .order('created_at', { ascending: false });
  if (error) throw error;
  const rows = (data || []) as Tracker[];
  return {
    sellers: rows.filter((t) => t.type === 'seller').map(trackerToSeller),
    searches: rows.filter((t) => t.type === 'search').map(trackerToSearch),
    all: rows,
  };
}

export async function fetchUserSales(userId: string, limit = 100) {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from('items')
    .select('*')
    .eq('user_id', userId)
    .eq('status', 'sold')
    .order('sold_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return ((data || []) as Item[]).map((row) => ({
    id: row.id,
    user_id: row.user_id,
    tracker_id: row.tracker_id,
    vinted_item_id: row.vinted_item_id,
    title: row.title,
    brand: row.brand,
    price_cents: row.price_cents,
    photo_url: row.photo_url,
    seller_login: row.seller_login,
    seller_photo_url: row.seller_photo_url,
    item_url: row.item_url,
    sold_at: row.sold_at || row.created_at,
    sale_speed_hours: row.sale_speed_hours,
  })) as DbSale[];
}

export async function fetchUserProfile(userId: string) {
  const admin = createAdminClient();
  const { data } = await admin
    .from('profiles')
    .select('id, email, full_name, plan')
    .eq('id', userId)
    .maybeSingle();
  return data;
}

export async function upsertTracker(input: {
  userId: string;
  type: TrackerType;
  categoryId?: string | null;
  domain: string;
  sourceUrl?: string;
  photoUrl?: string | null;
  vintedSellerId?: string;
  vintedUsername?: string;
  searchUrl?: string;
  label?: string;
  parsedFilters?: Record<string, unknown>;
}) {
  const admin = createAdminClient();
  const categoryId = await resolveCategoryId(
    input.userId,
    input.type,
    input.categoryId,
  );

  const payload = {
    user_id: input.userId,
    category_id: categoryId,
    type: input.type,
    domain: input.domain,
    source_url: input.sourceUrl || null,
    photo_url: input.photoUrl || null,
    is_active: true,
    vinted_seller_id: input.type === 'seller' ? input.vintedSellerId! : null,
    vinted_username: input.vintedUsername || '',
    search_url: input.type === 'search' ? input.searchUrl! : null,
    label: input.label || '',
    parsed_filters: (input.parsedFilters || {}) as Json,
  };

  // Upsert manuel (index partiels)
  let existingQuery = admin
    .from('trackers')
    .select('*')
    .eq('user_id', input.userId)
    .eq('type', input.type);

  if (input.type === 'seller') {
    existingQuery = existingQuery.eq('vinted_seller_id', input.vintedSellerId!);
  } else {
    existingQuery = existingQuery.eq('search_url', input.searchUrl!);
  }

  const { data: existing } = await existingQuery.maybeSingle();

  if (existing) {
    const { data, error } = await admin
      .from('trackers')
      .update({
        ...payload,
        category_id: categoryId,
      })
      .eq('id', existing.id)
      .select('*, categories(*)')
      .single();
    if (error) throw error;
    return { created: false, tracker: data as Tracker & { categories: Category } };
  }

  const { data, error } = await admin
    .from('trackers')
    .insert(payload)
    .select('*, categories(*)')
    .single();
  if (error) throw error;
  return { created: true, tracker: data as Tracker & { categories: Category } };
}
