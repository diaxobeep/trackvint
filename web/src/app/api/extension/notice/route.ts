import { NextRequest } from 'next/server';
import { corsJson, corsOptions } from '@/lib/cors';

export async function OPTIONS() {
  return corsOptions();
}

/** GET /api/extension/notice */
export async function GET(req: NextRequest) {
  const locale = new URL(req.url).searchParams.get('locale') || 'fr';
  const messages: Record<string, string> = {
    fr: 'Nous trackons seulement les ventes des articles à plus de 15 euros.',
    en: 'We only track sales of items above 15 euros.',
  };
  return corsJson({
    dismissible: true,
    enabled: true,
    level: 'info',
    message: messages[locale] || messages.fr,
    updatedAt: new Date().toISOString(),
  });
}
