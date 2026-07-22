/**
 * Serveur Express TrackVint — API + dashboard web + scraper public.
 * Données partagées entre extension Chrome et /app.
 */
import express from 'express';
import { corsMiddleware, privateNetworkMiddleware } from './middlewares/cors.js';
import { errorHandler, notFoundHandler } from './middlewares/errorHandler.js';
import { optionalAuth } from './middlewares/auth.js';
import authRoutes from './routes/auth.routes.js';
import extensionRoutes from './routes/extension.routes.js';
import radarRoutes from './routes/radar.routes.js';
import toolsRoutes from './routes/tools.routes.js';
import statsRoutes from './routes/stats.routes.js';
import inventoryRoutes from './routes/inventory.routes.js';
import scraperRoutes from './routes/scraper.routes.js';
import dashboardRoutes from './routes/dashboard.routes.js';
import { extensionCallback } from './controllers/auth.controller.js';
import { authPage } from './controllers/auth-page.controller.js';
import { appDashboard } from './controllers/app-dashboard.controller.js';
import { appSettings } from './controllers/app-settings.controller.js';
import { proxyManager } from './services/proxyManager.js';

const PORT = Number(process.env.PORT) || 3000;
const app = express();

app.use(corsMiddleware);
app.use(privateNetworkMiddleware);
app.use(express.json({ limit: '12mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(optionalAuth);

app.get('/health', (_req, res) => {
  res.json({
    ok: true,
    service: 'trackvint-api',
    version: '1.3.0',
    scraper: process.env.VINTED_STEALTH === '1' ? 'stealth' : 'public',
    crawler: process.env.CRAWLER_DISABLED === '1' ? 'off' : 'on',
  });
});

app.get('/auth', authPage);
app.get('/app', appDashboard);
app.get('/app/settings', appSettings);
app.get('/', (_req, res) => res.redirect(302, '/app'));

app.use('/api/auth', authRoutes);
app.use('/api/extension', extensionRoutes);
app.use('/api/radar', radarRoutes);
app.use('/api/tools', toolsRoutes);
app.use('/api/stats', statsRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/scrape', scraperRoutes);
app.use('/api/dashboard', dashboardRoutes);

app.get('/auth/extension-callback', extensionCallback);

app.get('/tools/image-search', (req, res) => {
  const img = typeof req.query.img === 'string' ? req.query.img : '';
  res.type('html').send(`<!DOCTYPE html>
<html lang="fr"><head><meta charset="utf-8"><title>TrackVint Lens</title>
<style>body{margin:0;background:#070807;color:#eef5ea;font:14px system-ui;padding:16px}
img{max-width:100%;border-radius:8px;margin-top:12px}.accent{color:#92ef4a}</style></head>
<body><h1 class="accent">Lens</h1><p>Recherche visuelle TrackVint.</p>
${img ? `<img src="${img.replace(/"/g, '')}" alt="query" />` : '<p>Aucune image.</p>'}
</body></html>`);
});

app.use(notFoundHandler);
app.use(errorHandler);

async function boot() {
  const { store } = await import('./data/store.js');
  await store.loadFromDisk();
  await proxyManager.load();

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[trackvint-api] http://127.0.0.1:${PORT}`);
    console.log(`[trackvint-api] web dashboard → /app`);
    console.log(`[trackvint-api] scrape → /api/scrape/status`);
  });

  if (process.env.CRAWLER_DISABLED !== '1') {
    const { startSellerCrawler } = await import('./jobs/seller-crawler.js');
    startSellerCrawler();
  }
}

boot().catch((err) => {
  console.error('[trackvint-api] boot failed', err);
  process.exit(1);
});
