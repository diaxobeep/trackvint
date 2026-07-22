import { NextRequest } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { corsJson, corsOptions } from '@/lib/cors';

export async function OPTIONS() {
  return corsOptions();
}

export async function GET(req: NextRequest) {
  const auth = req.headers.get('authorization') || '';
  const bearer = auth.match(/^Bearer\s+(.+)$/i)?.[1]?.trim();
  if (!bearer) {
    return corsJson({ error: 'unauthenticated' }, { status: 401 });
  }

  try {
    const admin = createAdminClient();
    const { data, error } = await admin.auth.getUser(bearer);
    if (error || !data.user) {
      return corsJson({ error: 'unauthenticated' }, { status: 401 });
    }
    return corsJson({
      user: {
        id: data.user.id,
        email: data.user.email,
        name:
          (data.user.user_metadata?.full_name as string) ||
          data.user.email?.split('@')[0],
      },
    });
  } catch (err) {
    return corsJson(
      { error: err instanceof Error ? err.message : 'session_error' },
      { status: 500 },
    );
  }
}
