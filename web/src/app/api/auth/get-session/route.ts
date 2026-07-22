import { NextRequest } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { corsJson, corsOptions } from '@/lib/cors';

export async function OPTIONS() {
  return corsOptions();
}

/** GET /api/auth/get-session — utilisé par l'extension */
export async function GET(req: NextRequest) {
  const auth = req.headers.get('authorization') || '';
  const bearer = auth.match(/^Bearer\s+(.+)$/i)?.[1]?.trim();

  if (bearer?.startsWith('demo.')) {
    try {
      const payload = JSON.parse(
        Buffer.from(bearer.slice(5), 'base64url').toString('utf8'),
      );
      return corsJson({
        user: {
          id: payload.sub || 'demo',
          email: payload.email || 'demo@trackvint.local',
          name: payload.name || 'Demo',
        },
      });
    } catch {
      return corsJson({ error: 'invalid_token' }, { status: 401 });
    }
  }

  if (bearer) {
    const admin = createAdminClient();
    if (admin) {
      const { data, error } = await admin.auth.getUser(bearer);
      if (!error && data.user) {
        return corsJson({
          user: {
            id: data.user.id,
            email: data.user.email,
            name:
              (data.user.user_metadata?.full_name as string) ||
              data.user.email?.split('@')[0],
          },
        });
      }
    }
  }

  return corsJson({ error: 'unauthenticated' }, { status: 401 });
}
