import { NextResponse } from 'next/server';

/** CORS pour Extension Chrome + dashboard (même API). */
export const CORS_HEADERS: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
  'Access-Control-Allow-Headers':
    'Content-Type, Authorization, X-User-Id, Accept',
};

export function corsJson(data: unknown, init?: { status?: number }) {
  return NextResponse.json(data, {
    status: init?.status ?? 200,
    headers: CORS_HEADERS,
  });
}

export function corsOptions() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}
