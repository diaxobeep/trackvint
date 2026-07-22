# Scraper Vinted — mode public

Les infos article / profil / catalogue sont **publiques**.  
Pas besoin de compte ni de proxy en usage normal.

## Défaut
`fetch` Node + headers navigateur + warm-up homepage (cookies anonymes).

## Routes
- `GET /api/scrape/item/:id`
- `GET /api/scrape/user/:id`
- `GET /api/scrape/user/:id/items`
- `GET /api/scrape/catalog?q=nike`
- `GET /api/scrape/status`

## Optionnel
- `VINTED_STEALTH=1` — Puppeteer si ton IP est bloquée
- `VINTED_PROXIES=...` — seulement si tu en as vraiment besoin
