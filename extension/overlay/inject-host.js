/**
 * Host Shadow DOM unique — créé une seule fois.
 * Évite les fuites de styles Vinted ↔ overlay.
 */

import { HOST_DOCUMENT_STYLES, OVERLAY_STYLES } from './styles.js';

const HOST_TAG = 'tv-overlay-root';
const STYLE_ID = 'tv-host-styles';

/**
 * @returns {{ host: HTMLElement, shadow: ShadowRoot, mount: HTMLElement }}
 */
export function ensureOverlayHost() {
  let host = document.querySelector(HOST_TAG);
  if (!host) {
    host = document.createElement(HOST_TAG);
    // Ne pas bloquer le scroll / hit-testing de la page hors UI
    host.style.cssText = 'position:fixed;inset:0;width:0;height:0;overflow:visible;pointer-events:none;z-index:2147483646;';
    document.documentElement.appendChild(host);
  }

  injectHostDocumentStyles();

  let shadow = host.shadowRoot;
  if (!shadow) {
    shadow = host.attachShadow({ mode: 'open' });
    const style = document.createElement('style');
    style.textContent = OVERLAY_STYLES;
    shadow.appendChild(style);

    const mount = document.createElement('div');
    mount.className = 'tv-mount';
    mount.style.cssText = 'pointer-events:none;';
    // Les enfants réactivent pointer-events via CSS (.tv-fab, .tv-panel)
    shadow.appendChild(mount);
  }

  const mount = shadow.querySelector('.tv-mount');
  return { host, shadow, mount };
}

function injectHostDocumentStyles() {
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = HOST_DOCUMENT_STYLES;
  (document.head || document.documentElement).appendChild(style);
}
