import { NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isUuid(id: string) {
  return UUID_RE.test(id);
}

/**
 * Résout l'userId authentifié (cookie Supabase ou Bearer JWT).
 * Retourne null si non authentifié — plus de fallback "demo".
 */
export async function resolveUserId(req: NextRequest): Promise<string | null> {
  const auth = req.headers.get('authorization') || '';
  const bearer = auth.match(/^Bearer\s+(.+)$/i)?.[1]?.trim();

  if (bearer) {
    try {
      const admin = createAdminClient();
      const { data } = await admin.auth.getUser(bearer);
      if (data.user?.id && isUuid(data.user.id)) return data.user.id;
    } catch {
      /* continue */
    }
  }

  try {
    const supabase = await createClient();
    const { data } = await supabase.auth.getUser();
    if (data.user?.id && isUuid(data.user.id)) return data.user.id;
  } catch {
    /* ignore */
  }

  return null;
}

export async function requireUserId(req: NextRequest): Promise<string> {
  const id = await resolveUserId(req);
  if (!id) {
    const err = new Error('Authentification requise') as Error & { status: number };
    err.status = 401;
    throw err;
  }
  return id;
}
