/**
 * FAB flottant dans le Shadow DOM — draggable, position mémorisée.
 */

const FAB_ICON = `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><circle cx="12" cy="12" r="2.2" fill="currentColor" stroke="none"/><circle cx="12" cy="12" r="6.2" opacity=".55"/><circle cx="12" cy="12" r="10" opacity=".28"/></svg>`;

const POS_KEY = 'tv_fab_pos';

function getStorage() {
  const api =
    globalThis.chrome?.storage?.local
      ? globalThis.chrome
      : globalThis.browser?.storage?.local
        ? globalThis.browser
        : null;
  return api?.storage?.local ?? null;
}

async function loadFabPos() {
  const storage = getStorage();
  if (!storage) return null;
  try {
    const data = await storage.get(POS_KEY);
    const pos = data?.[POS_KEY];
    if (
      pos &&
      typeof pos.left === 'number' &&
      typeof pos.top === 'number'
    ) {
      return pos;
    }
  } catch {
    /* ignore */
  }
  return null;
}

async function saveFabPos(left, top) {
  const storage = getStorage();
  if (!storage) return;
  try {
    await storage.set({ [POS_KEY]: { left, top } });
  } catch {
    /* ignore */
  }
}

/**
 * @param {HTMLElement} mount
 * @param {{ onToggle: () => void }} opts
 */
export function createFab(mount, opts) {
  let fab = mount.querySelector('.tv-fab');
  if (fab) return getFabApi(fab);

  fab = document.createElement('button');
  fab.type = 'button';
  fab.className = 'tv-fab';
  fab.setAttribute('aria-label', 'Ouvrir TrackVint');
  fab.innerHTML = FAB_ICON;
  mount.appendChild(fab);

  loadFabPos().then((pos) => {
    if (!pos || !fab.isConnected) return;
    fab.style.left = `${pos.left}px`;
    fab.style.top = `${pos.top}px`;
    fab.style.right = 'auto';
    fab.style.bottom = 'auto';
  });

  let moved = false;
  let startX = 0;
  let startY = 0;
  let originLeft = 0;
  let originTop = 0;

  fab.addEventListener('pointerdown', (e) => {
    if (e.button !== 0) return;
    moved = false;
    fab.classList.add('is-dragging');
    const rect = fab.getBoundingClientRect();
    startX = e.clientX;
    startY = e.clientY;
    originLeft = rect.left;
    originTop = rect.top;
    fab.setPointerCapture(e.pointerId);
  });

  fab.addEventListener('pointermove', (e) => {
    if (!fab.hasPointerCapture(e.pointerId)) return;
    const dx = e.clientX - startX;
    const dy = e.clientY - startY;
    if (Math.hypot(dx, dy) > 4) moved = true;
    if (!moved) return;

    const left = Math.max(8, Math.min(window.innerWidth - 60, originLeft + dx));
    const top = Math.max(8, Math.min(window.innerHeight - 60, originTop + dy));
    fab.style.left = `${left}px`;
    fab.style.top = `${top}px`;
    fab.style.right = 'auto';
    fab.style.bottom = 'auto';
  });

  fab.addEventListener('pointerup', (e) => {
    fab.classList.remove('is-dragging');
    if (fab.hasPointerCapture(e.pointerId)) {
      fab.releasePointerCapture(e.pointerId);
    }
    if (moved) {
      const left = parseFloat(fab.style.left) || 0;
      const top = parseFloat(fab.style.top) || 0;
      saveFabPos(left, top);
    } else {
      opts.onToggle();
    }
  });

  return getFabApi(fab);
}

function getFabApi(fab) {
  return {
    el: fab,
    setOpen(open) {
      fab.classList.toggle('is-open', open);
      fab.setAttribute('aria-expanded', String(open));
    },
  };
}
