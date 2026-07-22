import { createBrowserClient } from '@supabase/ssr';
import { isDemoMode } from '../env';

export function createClient() {
  if (isDemoMode()) return null;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  return createBrowserClient(url, key);
}
