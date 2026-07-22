/**
 * Extraction des données d'une fiche article Vinted depuis le DOM / payload Next.js.
 *
 * Stratégie :
 * 1. Scanner les scripts `__next_f.push([...])` (Flight / RSC payload)
 * 2. En extraire l'objet `item`, plugins (description, attributs), favourites, breadcrumbs
 * 3. Enrichir avec la couleur visible dans le DOM
 */

import { translateColorName } from '../i18n/colors.js';

/**
 * @typedef {object} ExtractedItem
 * @property {number|string} id
 * @property {string} title
 * @property {number|null} price
 * @property {string} currency
 * @property {string|null} description
 * @property {string|null} brand
 * @property {string|null} size
 * @property {string|null} condition
 * @property {string|null} color
 * @property {string[]} photos
 * @property {number|null} favourites
 * @property {number|null} seller_id
 * @property {{ categories: object[], brand: object|null }|null} breadcrumbs
 * @property {string} url
 */

/**
 * Lit la couleur affichée sur la fiche (microdata ou attributs UI).
 * @returns {string}
 */
export function readVisibleColorFromDom() {
  const microdata = document
    .querySelector('[itemprop="color"]')
    ?.textContent?.trim();
  if (microdata) return microdata;

  const colorBlock = document.querySelector(
    '[data-testid="item-attributes-color"]',
  );
  if (colorBlock) {
    const values = colorBlock.querySelectorAll('.details-list__item-value');
    const lastValue = values[values.length - 1]?.textContent?.trim();
    if (lastValue) return lastValue;
  }

  return '';
}

/**
 * Extrait une sous-chaîne JSON équilibrée (objet `{…}` ou tableau `[…]`)
 * à partir d'un index donné dans une grande string.
 *
 * @param {string} source
 * @param {number} startIndex  Index du `{` ou `[` ouvrant
 * @returns {string|null}
 */
export function extractBalancedJsonSlice(source, startIndex) {
  const openChar = source[startIndex];
  const closeChar = openChar === '{' ? '}' : ']';
  let depth = 0;

  for (let i = startIndex; i < source.length; i++) {
    if (source[i] === openChar) {
      depth++;
    } else if (source[i] === closeChar) {
      depth--;
      if (depth === 0) return source.slice(startIndex, i + 1);
    }
  }

  return null;
}

/**
 * Parse un appel `self.__next_f.push([1, "<payload>"])` et retourne le payload stringifié.
 * @param {string} scriptText
 * @returns {string|null}
 */
export function parseNextFlightPushPayload(scriptText) {
  const match = scriptText.match(/self\.__next_f\.push\(\[1,([\s\S]*)\]\)/);
  if (!match) return null;

  try {
    // Le 2ᵉ élément du tableau est une string JSON escapée → JSON.parse la « dé-escape »
    return JSON.parse(match[1]);
  } catch {
    return null;
  }
}

/**
 * Déduit catégories + marque depuis le fil d'Ariane Vinted.
 * @param {Array<{ url: string, title?: string }>} breadcrumbs
 */
export function parseBreadcrumbs(breadcrumbs) {
  /** @type {Array<{ id: number, slug: string, title?: string, url: string }>} */
  const categories = [];
  /** @type {{ id: number, slug: string, url: string }|null} */
  let brand = null;

  for (const crumb of breadcrumbs) {
    if (crumb.url === '/') continue;

    const brandMatch = crumb.url.match(/\/brand\/(\d+)-([^?/]+)/);
    if (brandMatch) {
      brand = {
        id: parseInt(brandMatch[1], 10),
        slug: brandMatch[2],
        url: crumb.url,
      };
    }

    const catalogMatch = crumb.url.match(/\/catalog\/(\d+)-([^/?\s]+)/);
    if (catalogMatch) {
      categories.push({
        id: parseInt(catalogMatch[1], 10),
        slug: catalogMatch[2],
        title: crumb.title,
        url: crumb.url,
      });
    }
  }

  return { categories, brand };
}

/**
 * Fusionne et déduplique les couleurs (DOM + payload + attributs plugins).
 * @param {string[]} colorCandidates
 * @returns {string|null}
 */
function normalizeColorList(colorCandidates) {
  const seen = new Set();

  const unique = colorCandidates
    .flatMap((c) => c.split(',').map((part) => part.trim()))
    .map((c) => translateColorName(c))
    .filter((c) => {
      const key = c.toLowerCase();
      if (c.length === 0 || seen.has(key)) return false;
      seen.add(key);
      return true;
    });

  return unique.length > 0 ? unique.join(', ') : null;
}

/**
 * Point d'entrée : extrait toutes les infos de l'article courant.
 * @returns {ExtractedItem|{ error: string }}
 */
export function extractCurrentItemData() {
  const scripts = Array.from(document.querySelectorAll('script'));

  /** @type {any} */
  let itemPayload = null;
  /** @type {any[]|null} */
  let plugins = null;
  /** @type {number|null} */
  let favouriteCount = null;
  /** @type {{ categories: object[], brand: object|null }|null} */
  let breadcrumbs = null;
  /** @type {string[]} */
  const fallbackPhotoUrls = [];

  // --- Scan des scripts Next.js Flight ---
  for (const script of scripts) {
    const text = script.textContent ?? '';
    if (!text.includes('__next_f')) continue;

    const payload = parseNextFlightPushPayload(text);
    if (!payload) continue;

    // Objet item principal
    if (
      !itemPayload &&
      /"item":\{"id":\d+,"title":/.test(payload) &&
      payload.includes('"photos"')
    ) {
      const itemKeyIndex = payload.indexOf('"item":');
      if (itemKeyIndex >= 0) {
        const jsonSlice = extractBalancedJsonSlice(payload, itemKeyIndex + 7);
        if (jsonSlice) {
          try {
            itemPayload = JSON.parse(jsonSlice);
          } catch {
            /* ignore */
          }
        }
      }
    }

    // Photos f800 en fallback si le tableau photos de l'item est vide
    if (fallbackPhotoUrls.length === 0 && payload.includes('"is_main":true')) {
      const photoRegex =
        /"url":"(https:\/\/images\d*\.vinted\.net\/[^"]*\/f800\/[^"]+)"/g;
      const seen = new Set();
      let match;
      while ((match = photoRegex.exec(payload)) !== null) {
        if (!seen.has(match[1])) {
          seen.add(match[1]);
          fallbackPhotoUrls.push(match[1]);
        }
      }
    }

    // Plugins (description, attributs marque/taille/état/couleur)
    if (!plugins && /"plugins":\[\{"name":"summary"/.test(payload)) {
      const pluginsKeyIndex = payload.indexOf('"plugins":');
      if (pluginsKeyIndex >= 0) {
        const jsonSlice = extractBalancedJsonSlice(
          payload,
          pluginsKeyIndex + 10,
        );
        if (jsonSlice) {
          try {
            plugins = JSON.parse(jsonSlice);
          } catch {
            /* ignore */
          }
        }
      }
    }

    // Nombre de favoris
    if (favouriteCount === null) {
      const favMatch = payload.match(/"favourite_count":(\d+)/);
      if (favMatch && payload.includes('"item_id":')) {
        favouriteCount = parseInt(favMatch[1], 10);
      }
    }

    // Fil d'Ariane
    if (!breadcrumbs && payload.includes('"name":"breadcrumbs"')) {
      const crumbsIndex = payload.indexOf('"breadcrumbs":[');
      if (crumbsIndex >= 0) {
        const jsonSlice = extractBalancedJsonSlice(payload, crumbsIndex + 14);
        if (jsonSlice) {
          try {
            breadcrumbs = parseBreadcrumbs(JSON.parse(jsonSlice));
          } catch {
            /* ignore */
          }
        }
      }
    }
  }

  if (!itemPayload) {
    return { error: 'errors.extractFailed' };
  }

  // --- Lecture des plugins ---
  let description = null;
  let brandFromAttrs = null;
  let size = null;
  let condition = null;
  /** @type {string[]} */
  const colorsFromPlugins = [];

  if (plugins) {
    for (const plugin of plugins) {
      if (plugin.name === 'description') {
        description = plugin.data.description ?? null;
      }

      if (plugin.name === 'attributes') {
        const attributes = plugin.data.attributes ?? [];
        for (const attr of attributes) {
          if (attr.code === 'brand') brandFromAttrs = attr.data.value;
          if (attr.code === 'size') size = attr.data.value;
          if (attr.code === 'status') condition = attr.data.value;
          if (attr.code === 'color') {
            const titles = (attr.data.values ?? [])
              .map((v) => v?.title)
              .filter((t) => typeof t === 'string' && t.length > 0);
            if (titles.length > 0) {
              colorsFromPlugins.push(...titles);
            } else if (attr.data.value) {
              colorsFromPlugins.push(attr.data.value);
            }
          }
        }
      }
    }
  }

  // --- Couleurs : DOM > color1/color2 item > plugins ---
  const visibleColor = readVisibleColorFromDom();
  const color1 = typeof itemPayload.color1 === 'string' ? itemPayload.color1 : '';
  const color2 = typeof itemPayload.color2 === 'string' ? itemPayload.color2 : '';

  /** @type {string[]} */
  const colorCandidates = [];
  if (visibleColor) colorCandidates.push(visibleColor);
  if (colorCandidates.length === 0) {
    if (color1) colorCandidates.push(color1);
    if (color2) colorCandidates.push(color2);
  }
  if (colorCandidates.length === 0) {
    colorCandidates.push(...colorsFromPlugins);
  }

  const color = normalizeColorList(colorCandidates);

  // --- Photos ---
  const photosFromItem = Array.isArray(itemPayload.photos)
    ? itemPayload.photos
        .map((p) => p.full_size_url ?? p.url ?? null)
        .filter((u) => typeof u === 'string' && u.length > 0)
    : [];
  const photos =
    photosFromItem.length > 0 ? photosFromItem : fallbackPhotoUrls;

  const price = itemPayload.price;
  const brandDto = itemPayload.brand_dto;

  return {
    id: itemPayload.id,
    title: itemPayload.title,
    price: price?.amount ? parseFloat(price.amount) : null,
    currency: price?.currency_code ?? itemPayload.currency ?? 'EUR',
    description,
    brand: brandFromAttrs ?? brandDto?.title ?? null,
    size,
    condition,
    color,
    photos,
    favourites: favouriteCount,
    seller_id: itemPayload.seller_id ?? null,
    breadcrumbs,
    url: window.location.href,
  };
}
