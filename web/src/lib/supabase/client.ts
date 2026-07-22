import { createBrowserClient } from '@supabase/ssr';
import { requireSupabaseEnv } from '../env';
import type { Database } from '@/types/database';

export function createClient() {
  const { url, anon } = requireSupabaseEnv();
  return createBrowserClient<Database>(url, anon);
}
