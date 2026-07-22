# TrackVint — fiche article Vinted

Content script **fiche article** (ex-`vinted.js` ResellTrack déminifié).

## Important

Ce module parle **uniquement à Vinted** (DOM + `/api/v2/photos` + catalogue).
Les appels SaaS (radar, favoris, auth) passent par `../shared/api` + JWT.

## Structure

```
vinted-item/
├── main.js                      # Point d'entrée + écoute des messages
├── browser.js                   # Shim chrome / browser
├── i18n/
│   └── colors.js                # Traduction couleurs EN → FR
├── dom/
│   ├── auth-tokens.js           # CSRF + cookie anon_id
│   ├── catalog-parser.js        # Parse HTML catalogue → listings
│   └── item-extractor.js        # Extraction données article
└── network/
    └── similar-search.js        # Upload photo + recherche visuelle
```

## Messages gérés

| Type | Action |
|------|--------|
| `GET_VINTED_DATA` | Extrait id, titre, prix, marque, taille, état, couleur, photos, vendeur… |
| `SEARCH_SIMILAR_ON_SALE` | Upload l'image → catalogue Vinted → annonces similaires |
