import { NextResponse } from 'next/server';
import { CORS_HEADERS } from '@/lib/cors';

export async function GET() {
  return NextResponse.json(
    { ok: true, service: 'trackvint-web', ts: new Date().toISOString() },
    { headers: CORS_HEADERS },
  );
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}
