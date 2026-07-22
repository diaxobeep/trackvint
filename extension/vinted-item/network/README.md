# Réseau Vinted — client légitime + rate-limit

## Comment l’extension parle à Vinted

| Étape | Mécanisme |
|-------|-----------|
| Cookies session | `credentials: 'include'` → cookies du domaine Vinted de l’onglet |
| User-Agent | **Jamais spoofé** — Chrome envoie l’UA réel |
| CSRF | `x-csrf-token` + `x-anon-id` extraits du DOM (meta / scripts) |
| Domaine | `location.origin` (fr/be/de…) plutôt que hardcode `www.vinted.fr` |
| Images CDN | Relais service worker avec les mêmes règles |

## Fichiers

| Fichier | Rôle |
|---------|------|
| `vinted-client.js` | Fetch unifié + headers navigateur |
| `rate-limiter.js` | Queue, jitter, debounce, pause globale |
| `errors.js` | Détection 429 / captcha / challenge |
| `similar-search.js` | Upload photo + catalogue (via le client) |

## Rate-limiting

- **background** (radar auto, scrape vendeur) : ≥ ~1,2 s + jitter 0–400 ms  
- **interactive** (recherche image user) : ≥ ~350 ms, priorité haute  
- **debounce** par clé (`seller-profile:123`) : coalescé les bursts  
- **pause** globale sur 429 / challenge : rejette les jobs background

## Erreurs → UI

Sur 429 ou page challenge :

1. `vintedLimiter.pause(duration)`  
2. Event `tv:vinted-pause`  
3. Toast discret Shadow DOM (« Analyse en pause »)  
4. Reprise auto après `Retry-After` (ou 60–120 s)

## Exemple

```js
import { fetchSellerProfile, uploadVintedPhoto } from './vinted-client.js';

// Auto — debounce + background
await fetchSellerProfile('275730317');

// Geste user — interactive + CSRF
await uploadVintedPhoto(formData);
```
