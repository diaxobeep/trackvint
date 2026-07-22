# TrackVint

SaaS ResellTrack-like : **extension Chrome** + **site Next.js** (LP + dashboard) + **API Express** (crawler Vinted 24/7).

## Stack

| Partie | Techno | Deploy |
|--------|--------|--------|
| `web/` | Next.js 15 | **Vercel** |
| `backend/` | Express + crawler | Railway / Fly / Render |
| `extension/` | Chrome MV3 | Chrome Web Store / load unpacked |
| Auth / DB | **Supabase** | (SQL dans `supabase/migrations`) |
| Paiements | **Stripe** Checkout + webhook | clés dans Vercel |

En local sans clés → **mode démo** (JWT Express `demo@trackvint.local` / `demo`).

---

## Démarrage local

```bash
# 1. API + crawler
cd backend
npm install
npm start
# → http://127.0.0.1:3000

# 2. Site (LP + app)
cd ../web
cp .env.example .env.local
npm install
npm run dev
# → http://127.0.0.1:3001

# 3. Extension
# chrome://extensions → Mode développeur → Charger non empaquetée → dossier extension/
```

- LP : http://127.0.0.1:3001  
- App : http://127.0.0.1:3001/app  
- Auth : http://127.0.0.1:3001/auth  
- Tarifs : http://127.0.0.1:3001/pricing  

Popup extension → bouton **Web** ouvre le site avec `?ext=<id>` pour lier le JWT.

---

## Déploiement (GitHub → Vercel + Supabase + Stripe)

### 1. GitHub
Pousse ce repo. Root = monorepo.

### 2. Supabase
1. Crée un projet
2. SQL Editor → colle `supabase/migrations/001_init.sql`
3. Auth → URL redirect : `https://TON-DOMAINE.vercel.app/auth`
4. Copie `URL` + `anon key` + `service_role`

### 3. Vercel (dossier `web/`)
1. Import GitHub → **Root Directory = `web`**
2. Variables d’environnement :

```
NEXT_PUBLIC_SITE_URL=https://TON-DOMAINE.vercel.app
NEXT_PUBLIC_API_URL=https://TON-API.up.railway.app
TRACKVINT_API_URL=https://TON-API.up.railway.app
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
STRIPE_SECRET_KEY=sk_...
STRIPE_WEBHOOK_SECRET=whsec_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_...
STRIPE_PRICE_STARTER=price_...
STRIPE_PRICE_PRO=price_...
DEMO_MODE=0
```

### 4. Stripe
1. Crée 2 prix récurrents (Starter / Pro)
2. Webhook → `https://TON-DOMAINE.vercel.app/api/stripe/webhook`
   Events : `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`

### 5. API crawler (Railway)
1. New project → deploy `backend/`
2. Env : `PORT`, `JWT_SECRET`, `CRAWLER_DISABLED=0`
3. Mets l’URL publique dans `NEXT_PUBLIC_API_URL` (Vercel) et dans `extension/shared/config.js` (`ENV = 'production'`).

### 6. Extension prod
Dans `extension/shared/config.js` :

```js
export const ENV = 'production';
// apiBaseUrl + webAppUrl = tes domaines
```

Recharge / pack l’extension.

---

## Architecture data

```
Extension ──JWT──▶ API Express ──▶ store (local JSON) ou Supabase
Site Next.js ─────▶ même API (overview / auth / stripe)
Crawler 24/7 ─────▶ scrappe vendeurs trackés → marque sold
```

Les boutons Setup / Tracker / Dashboard du web sont **navigables**. Sur mobile, menu ☰ (sidebar drawer) — plus de sidebar hors écran.

---

## Compte démo

- Email : `demo@trackvint.local`
- Mot de passe : `demo`
