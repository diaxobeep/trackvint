# Couche partagée TrackVint

## Config

Édite [`config.js`](./config.js) :

```js
export const ENV = 'local'; // ou 'production'
```

- **local** → `http://localhost:3000`
- **production** → `https://api.ton-domaine.com`

## Auth JWT

1. `POST /api/auth/login` `{ email, password }` → `{ token, user }`
2. Stockage via `auth/session.js` (`tv_jwt`)
3. Chaque `api.get/post/delete` ajoute `Authorization: Bearer <token>`

## Vinted

Les modules `../vinted-item/**` continuent d’appeler **uniquement** les APIs Vinted
(`*.vinted.fr`, CSRF, upload photos). Aucune URL ResellTrack dedans.
