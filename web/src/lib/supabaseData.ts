import { createAdminClient } from '@/lib/supabase/admin';

export type DbSeller = {
  id: string;
  user_id: string;
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
    vintedItemId: row.vinted_item_id,
    title: row.title || '',
    brand: row.brand || '',
    priceCents: row.price_cents || 0,
    photoUrl: row.photo_url || undefined,
    sellerLogin: row.seller_login || undefined,
    sellerPhotoUrl: row.seller_photo_url || undefined,
    itemUrl: row.item_url || undefined,
    soldAt: row.sold_at,
    saleSpeedHours: row.sale_speed_hours != null ? Number(row.sale_speed_hours) : undefined,
  };
}

export async function fetchUserTrackers(userId: string) {
  const admin = createAdminClient();
  const [sellers, searches] = await Promise.all([
    admin
      .from('seller_trackers')
      .select('*')
      .eq('user_id', userId)
      .eq('is_active', true)
      .order('created_at', { ascending: false }),
    admin
      .from('search_trackers')
      .select('*')
      .eq('user_id', userId)
      .eq('is_active', true)
      .order('created_at', { ascending: false }),
  ]);
  if (sellers.error) throw sellers.error;
  if (searches.error) throw searches.error;
  return {
    sellers: (sellers.data || []) as DbSeller[],
    searches: (searches.data || []) as DbSearch[],
  };
}

export async function fetchUserSales(userId: string, limit = 100) {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from('detected_sales')
    .select('*')
    .eq('user_id', userId)
    .order('sold_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data || []) as DbSale[];
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
