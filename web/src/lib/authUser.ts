import { NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isUuid(id: string) {
  return UUID_RE.test(id);
}

/**
 * Résout l'userId depuis cookie Supabase, Bearer JWT, ou X-User-Id.
 * Retourne 'demo' si anonyme (store mémoire).
 */
export async function resolveUserId(req: NextRequest): Promise<string> {
  const header = req.headers.get('x-user-id');
  if (header && header !== 'undefined') return header;

  const auth = req.headers.get('authorization') || '';
  const bearer = auth.match(/^Bearer\s+(.+)$/i)?.[1]?.trim();

  if (bearer?.startsWith('demo.')) {
    try {
      const payload = JSON.parse(
        Buffer.from(bearer.slice(5), 'base64url').toString('utf8'),
      );
      return String(payload.sub || payload.email || 'demo');
    } catch {
      return 'demo';
    }
  }

  if (bearer) {
    const admin = createAdminClient();
    if (admin) {
      const { data } = await admin.auth.getUser(bearer);
      if (data.user?.id) return data.user.id;
    }
  }

  try {
    const supabase = await createClient();
    if (supabase) {
      const { data } = await supabase.auth.getUser();
      if (data.user?.id) return data.user.id;
    }
  } catch {
    /* ignore */
  }

  return 'demo';
}

/** Persistance Supabase seulement pour de vrais UUID auth. */
export function canUseSupabaseStore(userId: string) {
  return isUuid(userId) && Boolean(createAdminClient());
}
