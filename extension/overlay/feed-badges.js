/**
 * Badges « save » sur le feed Vinted — injection légère anti-flicker.
 *
 * Stratégie :
 * 1. IntersectionObserver : ne traite que les cartes visibles
 * 2. Batch rAF : une passe DOM max par frame
 * 3. data-tv-enhanced="1" : jamais réinjecté
 * 4. MutationObserver debouncé : pas de scan sync à chaque mutation scroll
 */

const CARD_SELECTORS = [
  '[data-testid^="item-box-"]',
  '[data-testid^="grid-item"]',
  'div.feed-grid__item',
  'div[class*="item-box"]',
].join(',');

const ICON_PLUS = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 5v14M5 12h14"/></svg>`;
const ICON_CHECK = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="m5 12 5 5L20 7"/></svg>`;

/**
 * @param {{ onSave?: (itemId: string, btn: HTMLElement) => void }} [opts]
 * @returns {{ stop: () => void }}
 */
export function startFeedBadges(opts = {}) {
  const pending = new Set();
  let raf = 0;
  let stopped = false;

  const io = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        const card = /** @type {HTMLElement} */ (entry.target);
        if (card.dataset.tvEnhanced === '1') {
          io.unobserve(card);
          continue;
        }
        pending.add(card);
      }
      scheduleFlush();
    },
    {
      root: null,
      // Marge pour préparer un peu avant l'entrée viewport
      rootMargin: '120px 0px',
      threshold: 0.01,
    },
  );

  const mo = new MutationObserver(() => {
    // Debounce via rAF — le scroll Vinted ajoute des nœuds en rafale
    scheduleScan();
  });

  let scanRaf = 0;
  function scheduleScan() {
    if (stopped || scanRaf) return;
    scanRaf = requestAnimationFrame(() => {
      scanRaf = 0;
      observeNewCards();
    });
  }

  function scheduleFlush() {
    if (stopped || raf) return;
    raf = requestAnimationFrame(() => {
      raf = 0;
      flushPending();
    });
  }

  function observeNewCards() {
    const cards = document.querySelectorAll(CARD_SELECTORS);
    for (const card of cards) {
      if (!(card instanceof HTMLElement)) continue;
      if (card.dataset.tvEnhanced === '1') continue;
      if (card.dataset.tvObserved === '1') continue;
      card.dataset.tvObserved = '1';
      io.observe(card);
    }
  }

  function flushPending() {
    for (const card of pending) {
      enhanceCard(card, opts);
      io.unobserve(card);
    }
    pending.clear();
  }

  function enhanceCard(card, options) {
    if (card.dataset.tvEnhanced === '1') return;

    // Ancre relative sans layout thrash si déjà positionné
    card.dataset.tvEnhanced = '1';

    const itemId = extractItemId(card);
    if (!itemId) return;

    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'tv-feed-btn';
    btn.dataset.tvItemId = itemId;
    btn.setAttribute('aria-label', 'Sauvegarder dans TrackVint');
    btn.innerHTML = ICON_PLUS;

    btn.addEventListener(
      'click',
      (event) => {
        event.preventDefault();
        event.stopPropagation();
        const saved = btn.classList.toggle('is-saved');
        btn.innerHTML = saved ? ICON_CHECK : ICON_PLUS;
        options.onSave?.(itemId, btn);
      },
      // Passive false requis pour preventDefault sur certains navigateurs
      { capture: true },
    );

    card.appendChild(btn);
  }

  // Boot
  observeNewCards();
  mo.observe(document.body, { childList: true, subtree: true });

  return {
    stop() {
      stopped = true;
      mo.disconnect();
      io.disconnect();
      if (raf) cancelAnimationFrame(raf);
      if (scanRaf) cancelAnimationFrame(scanRaf);
      pending.clear();
    },
  };
}

function extractItemId(card) {
  const link = card.querySelector('a[href*="/items/"]');
  const href = link?.getAttribute('href') ?? '';
  const match = href.match(/\/items\/(\d+)/);
  return match?.[1] ?? null;
}
