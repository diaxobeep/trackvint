/**
 * Parsing d'une page catalogue Vinted (HTML) pour en extraire des listings.
 * Utilisé après une recherche par image (`/catalog?search_by_image_uuid=…`).
 */

/** Regex capturant l'ID numérique dans une URL `/items/12345-…` */
export const ITEM_URL_PATTERN = /\/items\/(\d+)(?:[-?/]|$)/;

/**
 * @typedef {object} CatalogListing
 * @property {string} id
 * @property {string} url
 * @property {string} title
 * @property {string|null} brand
 * @property {number} priceCents
 * @property {string} currency
 * @property {string[]} photos
 * @property {null} status
 * @property {null} publishedAt
 * @property {null} size
 * @property {number} favouriteCount
 */

/**
 * Point d'entrée : parse le HTML du catalogue et retourne les annonces.
 * Priorité : JSON-LD ItemList → sélecteurs de grille → liens /items/.
 *
 * @param {string} html
 * @returns {CatalogListing[]}
 */
export function parseCatalogHtml(html) {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  const jsonLdScripts = doc.querySelectorAll(
    'script[type="application/ld+json"]',
  );

  for (const script of Array.from(jsonLdScripts)) {
    const text = script.textContent ?? '';
    if (!text.includes('ItemList')) continue;

    try {
      const listings = parseItemListJsonLd(JSON.parse(text));
      if (listings.length > 0) return listings;
    } catch {
      // JSON-LD invalide → on continue vers les fallbacks DOM
    }
  }

  return parseCatalogFromDom(doc);
}

/**
 * Transforme un bloc JSON-LD `@type: ItemList` en listings normalisés.
 * @param {unknown} jsonLd
 * @returns {CatalogListing[]}
 */
function parseItemListJsonLd(jsonLd) {
  if (!jsonLd || typeof jsonLd !== 'object') return [];

  const list = /** @type {{ '@type'?: string, itemListElement?: unknown[] }} */ (
    jsonLd
  );
  if (list['@type'] !== 'ItemList' || !Array.isArray(list.itemListElement)) {
    return [];
  }

  /** @type {CatalogListing[]} */
  const listings = [];

  for (const element of list.itemListElement) {
    const item = /** @type {any} */ (element).item ?? element;
    const url = typeof item.url === 'string' ? item.url : null;
    if (!url) continue;

    const idMatch = url.match(ITEM_URL_PATTERN);
    if (!idMatch) continue;

    const offers = item.offers;
    const rawPrice = offers?.price;
    const priceCents =
      rawPrice == null ? 0 : Math.round(Number(rawPrice) * 100);

    listings.push({
      id: idMatch[1],
      url,
      title: typeof item.name === 'string' ? item.name : '',
      brand: typeof item.brand?.name === 'string' ? item.brand.name : null,
      priceCents,
      currency: offers?.priceCurrency ?? 'EUR',
      photos: (() => {
        const imageUrl = normalizeImageField(item.image);
        return imageUrl ? [imageUrl] : [];
      })(),
      status: null,
      publishedAt: null,
      size: null,
      favouriteCount: 0,
    });
  }

  return listings;
}

/**
 * Normalise le champ `image` JSON-LD (string | string[] | {url}).
 * @param {unknown} imageField
 * @returns {string|null}
 */
function normalizeImageField(imageField) {
  if (typeof imageField === 'string') return imageField;
  if (Array.isArray(imageField) && typeof imageField[0] === 'string') {
    return imageField[0];
  }
  if (
    imageField &&
    typeof imageField === 'object' &&
    typeof /** @type {{ url?: string }} */ (imageField).url === 'string'
  ) {
    return /** @type {{ url: string }} */ (imageField).url;
  }
  return null;
}

/**
 * Fallback DOM : teste plusieurs sélecteurs de cartes produit Vinted.
 * @param {Document} doc
 * @returns {CatalogListing[]}
 */
function parseCatalogFromDom(doc) {
  const cardSelectors = [
    '[data-testid^="item-box-"]',
    '[data-testid^="grid-item"]',
    'div.feed-grid__item',
    'div[class*="ItemBox"]',
    'div[class*="item-box"]',
  ];

  for (const selector of cardSelectors) {
    const cards = doc.querySelectorAll(selector);
    if (cards.length === 0) continue;

    const listings = extractListingsFromCards(Array.from(cards));
    if (listings.length > 0) return listings;
  }

  // Dernier recours : tous les liens vers /items/
  return extractListingsFromItemLinks(doc);
}

/**
 * @param {Element[]} cards
 * @returns {CatalogListing[]}
 */
function extractListingsFromCards(cards) {
  const seenIds = new Set();
  /** @type {CatalogListing[]} */
  const listings = [];

  for (const card of cards) {
    const listing = extractListingFromCard(card);
    if (listing && !seenIds.has(listing.id)) {
      seenIds.add(listing.id);
      listings.push(listing);
    }
  }

  return listings;
}

/**
 * Extrait un listing depuis une carte produit du DOM.
 * @param {Element} card
 * @returns {CatalogListing|null}
 */
function extractListingFromCard(card) {
  const link = card.querySelector('a[href*="/items/"]');
  if (!link) return null;

  const href = link.getAttribute('href') ?? '';
  const idMatch = href.match(ITEM_URL_PATTERN);
  if (!idMatch) return null;

  const img = card.querySelector('img');
  const rawTitle =
    link.getAttribute('title') ?? img?.getAttribute('alt') ?? '';

  return {
    id: idMatch[1],
    url: href.startsWith('http') ? href : `https://www.vinted.fr${href}`,
    title: cleanItemTitle(rawTitle),
    brand: extractBrandFromTitle(rawTitle),
    priceCents: extractPriceCentsFromElement(card),
    currency: 'EUR',
    photos: (() => {
      const src = img?.getAttribute('src') ?? img?.getAttribute('data-src');
      return src ? [src] : [];
    })(),
    status: null,
    publishedAt: null,
    size: null,
    favouriteCount: 0,
  };
}

/**
 * Parcourt tous les liens /items/ et remonte au conteneur le plus proche
 * qui contient une image + un prix.
 * @param {Document} doc
 * @returns {CatalogListing[]}
 */
function extractListingsFromItemLinks(doc) {
  const links = doc.querySelectorAll('a[href*="/items/"]');
  const seenIds = new Set();
  /** @type {CatalogListing[]} */
  const listings = [];

  for (const link of Array.from(links)) {
    const href = link.getAttribute('href') ?? '';
    const idMatch = href.match(ITEM_URL_PATTERN);
    if (!idMatch) continue;

    const itemId = idMatch[1];
    if (seenIds.has(itemId)) continue;
    seenIds.add(itemId);

    // Remonte jusqu'à 6 parents pour trouver un bloc « carte » complet
    let container = /** @type {Element|null} */ (link);
    for (let depth = 0; depth < 6 && container; depth++) {
      const hasImage = Boolean(container.querySelector('img'));
      const hasPrice = /\d+[.,]\d{2}\s*€/.test(container.textContent ?? '');
      if (hasImage && hasPrice) break;
      container = container.parentElement;
    }

    const card = container ?? link;
    const img = card.querySelector('img');
    const rawTitle =
      link.getAttribute('title') ?? img?.getAttribute('alt') ?? '';

    listings.push({
      id: itemId,
      url: href.startsWith('http') ? href : `https://www.vinted.fr${href}`,
      title: cleanItemTitle(rawTitle),
      brand: extractBrandFromTitle(rawTitle),
      priceCents: extractPriceCentsFromElement(card),
      currency: 'EUR',
      photos: (() => {
        const src = img?.getAttribute('src') ?? img?.getAttribute('data-src');
        return src ? [src] : [];
      })(),
      status: null,
      publishedAt: null,
      size: null,
      favouriteCount: 0,
    });
  }

  return listings;
}

/**
 * Nettoie un titre issu d'un attribut title/alt (souvent "titre, marque: X, …").
 * @param {string} rawTitle
 * @returns {string}
 */
export function cleanItemTitle(rawTitle) {
  if (!rawTitle) return '';

  const metaIndex = rawTitle.search(
    /,\s*(marque|état|taille|prix|brand|state|size|price)\s*:/i,
  );
  const titleOnly = metaIndex > 0 ? rawTitle.slice(0, metaIndex) : rawTitle;

  return titleOnly.trim().replace(/\s+/g, ' ').slice(0, 120);
}

/**
 * Extrait la marque depuis un title/alt du type "…, marque: Nike, …".
 * @param {string} rawTitle
 * @returns {string|null}
 */
export function extractBrandFromTitle(rawTitle) {
  const match = rawTitle.match(/(?:marque|brand)\s*:\s*([^,]+)/i);
  return match ? match[1].trim() : null;
}

/**
 * Lit un prix en centimes depuis un élément (sélecteurs price ou regex €).
 * @param {Element} element
 * @returns {number}
 */
export function extractPriceCentsFromElement(element) {
  const priceNodes = element.querySelectorAll(
    '[data-testid*="price" i], [class*="price" i]',
  );

  for (const node of Array.from(priceNodes)) {
    const cents = parsePriceToCents(node.textContent ?? '');
    if (cents > 0) return cents;
  }

  const fallback = (element.textContent ?? '').match(/(\d+[.,]\d{2})\s*€/);
  return fallback ? parsePriceToCents(fallback[1]) : 0;
}

/**
 * Convertit une chaîne "12,50" / "12.50" en centimes (1250).
 * @param {string} priceText
 * @returns {number}
 */
export function parsePriceToCents(priceText) {
  const match = priceText.replace(/\s/g, '').match(/(\d+)[.,]?(\d{0,2})/);
  if (!match) return 0;

  const euros = Number.parseInt(match[1], 10);
  const cents = match[2]
    ? Number.parseInt(match[2].padEnd(2, '0'), 10)
    : 0;

  return euros * 100 + cents;
}
