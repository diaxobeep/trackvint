import { createBrowserClient } from '@supabase/ssr';
import { requireSupabaseEnv } from '../env';

export function createClient() {
  const { url, anon } = requireSupabaseEnv();
  return createBrowserClient(url, anon);
}
