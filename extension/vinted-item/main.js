/**
 * Content script `vinted` — page fiche article (`/items/*`).
 *
 * Écoute les messages du service worker / overlay :
 * - GET_VINTED_DATA          → extraction DOM / Next.js de l'article courant
 * - SEARCH_SIMILAR_ON_SALE   → recherche visuelle d'annonces similaires
 *
 * Correspond au fichier minifié : content-scripts/vinted.js
 */

import { extensionApi } from './browser.js';
import { extractCurrentItemData } from './dom/item-extractor.js';
import { searchSimilarListingsByImage } from './network/similar-search.js';

/** Motifs d'URL déclarés dans le manifest (référence). */
export const MATCH_PATTERNS = [
  '*://*.vinted.fr/items/*',
  '*://*.vinted.be/items/*',
  '*://*.vinted.es/items/*',
  '*://*.vinted.de/items/*',
];

/**
 * Enregistre les handlers de messages runtime.
 */
export function main() {
  extensionApi.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    // --- Données de la fiche article ouverte ---
    if (message.type === 'GET_VINTED_DATA') {
      try {
        sendResponse(extractCurrentItemData());
      } catch (error) {
        sendResponse({
          error: error instanceof Error ? error.message : String(error),
        });
      }
      return true; // réponse synchrone déjà envoyée, mais pattern WXT conserve true
    }

    // --- Recherche d'annonces similaires par image ---
    if (message.type === 'SEARCH_SIMILAR_ON_SALE') {
      (async () => {
        try {
          if (!message.imageUrl) {
            sendResponse({ error: 'errors.noImage' });
            return;
          }

          const listings = await searchSimilarListingsByImage(message.imageUrl);
          sendResponse({ listings });
        } catch (error) {
          console.warn('[RT/cs] SEARCH_SIMILAR_ON_SALE failed', error);
          sendResponse({
            error:
              error instanceof Error ? error.message : 'errors.unknown',
          });
        }
      })();

      // Indique à Chrome que sendResponse sera appelé de façon asynchrone
      return true;
    }

    return false;
  });
}

// Bootstrapping (équivalent du wrapper IIFE WXT minifié)
main();
