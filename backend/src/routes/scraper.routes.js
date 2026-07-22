/**
 * Routes scraper locales — consommées par l'extension Chrome.
 *
 * GET  /api/scrape/status
 * POST /api/scrape/session/refresh
 * GET  /api/scrape/user/:id
 * GET  /api/scrape/user/:id/items
 * GET  /api/scrape/item/:id
 * GET  /api/scrape/catalog?q=
 */

import { Router } from 'express';
import {
  fetchItemDetails,
  fetchUserItems,
  fetchUserProfile,
  getScraperStatus,
  peekSession,
  searchCatalogItems,
  VintedHttpError,
} from '../services/vintedApi.js';
import {
  getVintedSession,
  invalidateVintedSession,
} from '../services/vintedSession.js';
import { store } from '../data/store.js';

const router = Router();

router.get('/status', async (req, res) => {
  const status = await getScraperStatus();
  // ?bootstrap=1 force un check session (peut lancer Puppeteer)
  const session =
    req.query.bootstrap === '1' ? await peekSession() : null;
  res.json({ ok: true, ...status, session });
});

router.post('/session/refresh', async (_req, res) => {
  try {
    invalidateVintedSession();
    // Débloque la file si elle était en pause
    const { vintedQueue } = await import('../services/vintedQueue.js');
    vintedQueue.resume();
    const session = await getVintedSession({ force: true });
    res.json({
      ok: true,
      mode: session.mode,
      cookieCount: session.cookies.length,
      expiresAt: session.expiresAt,
      proxy: session.proxy?.server || null,
    });
  } catch (err) {
    res.status(503).json({
      ok: false,
      error: 'session_refresh_failed',
      message: err instanceof Error ? err.message : String(err),
    });
  }
});

router.get('/user/:id', async (req, res) => {
  const id = String(req.params.id || '');
  if (!/^\d+$/.test(id)) {
    return res.status(400).json({ error: 'invalid_user_id' });
  }

  try {
    const data = await fetchUserProfile(id);
    const user = data?.user || data;

    // Cache local pour l'extension / crawler
    if (user?.id || user?.login) {
      store.upsertSellerProfile({
        vintedId: String(user.id || id),
        login: user.login,
        domain: process.env.VINTED_DOMAIN || 'vinted.fr',
        photoUrl: user.photo?.url || null,
        city: user.city || null,
        country: user.country_title || null,
        feedbackCount: user.feedback_count ?? null,
        feedbackReputation: user.feedback_reputation ?? null,
        itemCount: user.item_count ?? null,
        givenItemCount: user.given_item_count ?? null,
      });
    }

    return res.json({ ok: true, user, raw: data });
  } catch (err) {
    return sendScrapeError(res, err);
  }
});

router.get('/user/:id/items', async (req, res) => {
  const id = String(req.params.id || '');
  if (!/^\d+$/.test(id)) {
    return res.status(400).json({ error: 'invalid_user_id' });
  }

  try {
    const page = Number(req.query.page) || 1;
    const perPage = Math.min(Number(req.query.perPage) || 96, 96);
    const data = await fetchUserItems(id, { page, perPage });
    const items = data?.items || [];

    const domain = process.env.VINTED_DOMAIN || 'vinted.fr';
    const normalized = items.map((it) => normalizeItem(it, domain));

    // Persist actifs pour détection de ventes (disparition = sold)
    store.upsertSellerListings(
      id,
      normalized.map((n) => ({
        ...n,
        status: 'active',
        soldAt: null,
        priceIsEuros: true,
      })),
    );

    return res.json({
      ok: true,
      count: normalized.length,
      items: normalized,
      pagination: data?.pagination || null,
    });
  } catch (err) {
    return sendScrapeError(res, err);
  }
});

router.get('/item/:id', async (req, res) => {
  const id = String(req.params.id || '');
  if (!/^\d+$/.test(id)) {
    return res.status(400).json({ error: 'invalid_item_id' });
  }

  try {
    const data = await fetchItemDetails(id);
    const item = data?.item || data;
    const domain = process.env.VINTED_DOMAIN || 'vinted.fr';
    return res.json({
      ok: true,
      item: item ? normalizeItem(item, domain) : null,
      raw: data,
    });
  } catch (err) {
    return sendScrapeError(res, err);
  }
});

router.get('/catalog', async (req, res) => {
  const q = String(req.query.q || req.query.search_text || '').trim();
  if (!q) {
    return res.status(400).json({ error: 'q_required' });
  }

  try {
    const page = Number(req.query.page) || 1;
    const perPage = Math.min(Number(req.query.perPage) || 24, 96);
    const data = await searchCatalogItems(q, { page, perPage });
    const items = data?.items || [];
    const domain = process.env.VINTED_DOMAIN || 'vinted.fr';

    return res.json({
      ok: true,
      query: q,
      count: items.length,
      items: items.map((it) => normalizeItem(it, domain)),
      pagination: data?.pagination || null,
    });
  } catch (err) {
    return sendScrapeError(res, err);
  }
});

/**
 * @param {any} it
 * @param {string} domain
 */
function moneyAmount(value) {
  if (value == null || value === '') return null;
  if (typeof value === 'number') return value;
  if (typeof value === 'string') return Number(value.replace(',', '.'));
  if (typeof value === 'object' && value.amount != null) {
    return Number(String(value.amount).replace(',', '.'));
  }
  return null;
}

function normalizeItem(it, domain) {
  const id = String(it.id ?? '');
  const priceNum = moneyAmount(
    it.price_numeric ?? it.price ?? it.total_item_price,
  );
  const price = Number.isFinite(priceNum) ? priceNum : null;
  return {
    vintedId: id,
    title: it.title || '',
    brandName: it.brand_title || it.brand?.title || null,
    price,
    priceLabel: price != null ? `${price} €` : null,
    currency:
      it.currency ||
      it.price?.currency_code ||
      it.total_item_price?.currency_code ||
      'EUR',
    photo: it.photo?.url || it.photos?.[0]?.url || null,
    photos: (it.photos || []).map((p) => p?.url).filter(Boolean),
    favouriteCount: it.favourite_count ?? 0,
    viewCount: it.view_count ?? null,
    url: it.url || `https://www.${domain}/items/${id}`,
    userId: it.user?.id
      ? String(it.user.id)
      : it.user_id
        ? String(it.user_id)
        : null,
    status: it.status || null,
  };
}

/**
 * @param {import('express').Response} res
 * @param {unknown} err
 */
function sendScrapeError(res, err) {
  if (err instanceof VintedHttpError) {
    return res.status(err.isRateLimited ? 429 : err.isForbidden ? 503 : 502).json({
      ok: false,
      error: err.message,
      status: err.status,
      retryable: err.isRateLimited || err.isChallenge,
      body: err.body ?? null,
    });
  }

  console.error('[scraper]', err);
  return res.status(500).json({
    ok: false,
    error: 'scrape_failed',
    message: err instanceof Error ? err.message : String(err),
  });
}

export default router;
