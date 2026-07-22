# Extension TrackVint

Chrome MV3 — overlay Vinted + popup.

## Install local

1. `chrome://extensions` → Mode développeur
2. Charger non empaquetée → ce dossier
3. API locale : `http://127.0.0.1:3000`
4. Site : `http://127.0.0.1:3001` (bouton **Web** du popup)

## Config

`shared/config.js` :
- `ENV = 'local' | 'production'`
- `webAppUrl` / `apiBaseUrl`

## Lien web

Le popup ouvre `/app?ext=<chrome.runtime.id>` pour pousser le JWT (`SET_JWT`).
