/**
 * Toast discret dans le Shadow DOM — pause 429 / challenge Vinted.
 */

/**
 * @param {HTMLElement} mount  .tv-mount dans le shadow
 */
export function createPauseToaster(mount) {
  let toast = mount.querySelector('.tv-pause-toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.className = 'tv-pause-toast';
    toast.hidden = true;
    toast.setAttribute('role', 'status');
    toast.setAttribute('aria-live', 'polite');
    mount.appendChild(toast);
  }

  let hideTimer = 0;

  return {
    /**
     * @param {{ message: string, until?: number, reason?: string }} detail
     */
    show(detail) {
      const remainingMin = detail.until
        ? Math.max(1, Math.ceil((detail.until - Date.now()) / 60_000))
        : null;

      toast.innerHTML = `
        <div class="tv-pause-toast__inner">
          <span class="tv-pause-toast__dot" aria-hidden="true"></span>
          <div class="tv-pause-toast__text">
            <strong>Analyse en pause</strong>
            <span>${escapeHtml(detail.message)}</span>
            ${
              remainingMin
                ? `<span class="tv-pause-toast__meta">Reprise ~${remainingMin} min</span>`
                : ''
            }
          </div>
          <button type="button" class="tv-pause-toast__dismiss" aria-label="Masquer">×</button>
        </div>
      `;
      toast.hidden = false;

      toast.querySelector('.tv-pause-toast__dismiss')?.addEventListener(
        'click',
        () => {
          toast.hidden = true;
        },
        { once: true },
      );

      if (hideTimer) clearTimeout(hideTimer);
      // Reste visible un moment puis se fait discret (reste accessible si panel ouvert)
      hideTimer = window.setTimeout(() => {
        toast.classList.add('is-compact');
      }, 8_000);
    },

    hide() {
      toast.hidden = true;
      toast.classList.remove('is-compact');
    },
  };
}

function escapeHtml(str) {
  return String(str)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;');
}
