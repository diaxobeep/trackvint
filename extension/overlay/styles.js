/**
 * Styles Shadow DOM — panneau type ResellTrack (noir + lime).
 */

import { themeCssVariables } from './theme.js';

export const OVERLAY_STYLES = `
${themeCssVariables()}

*, *::before, *::after { box-sizing: border-box; }

.tv-fab {
  position: fixed;
  right: 18px;
  bottom: 88px;
  z-index: 2147483646;
  width: 52px;
  height: 52px;
  border: none;
  border-radius: 50%;
  cursor: grab;
  display: grid;
  place-items: center;
  pointer-events: auto;
  color: var(--tv-on-accent);
  background: var(--tv-accent);
  box-shadow: 0 8px 28px rgba(0, 0, 0, 0.45), 0 0 0 1px rgba(146, 239, 74, 0.35);
  transition: transform 0.18s ease, box-shadow 0.18s ease;
  contain: layout paint style;
  touch-action: none;
}
.tv-fab:hover { transform: scale(1.06); }
.tv-fab.is-open { box-shadow: 0 0 0 3px #111, 0 10px 28px rgba(0,0,0,0.5); }
.tv-fab.is-dragging { cursor: grabbing; }
.tv-fab svg { pointer-events: none; }

.tv-panel {
  position: fixed;
  top: 64px;
  right: 16px;
  z-index: 2147483647;
  width: min(420px, calc(100vw - 20px));
  height: min(620px, calc(100vh - 80px));
  overflow: hidden;
  pointer-events: auto;
  border-radius: var(--tv-radius);
  background: var(--tv-bg);
  box-shadow: var(--tv-shadow);
  contain: layout paint style;
  animation: tv-panel-in 0.18s ease both;
}
.tv-panel[hidden] { display: none !important; }

@keyframes tv-panel-in {
  from { opacity: 0; transform: translateY(-6px) scale(0.985); }
  to { opacity: 1; transform: none; }
}

@media (prefers-reduced-motion: reduce) {
  .tv-fab, .tv-panel { transition: none; animation: none; }
}

.tv-shell {
  display: flex;
  width: 100%;
  height: 100%;
  background: var(--tv-bg);
}

.tv-sidebar {
  width: 52px;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  padding: 12px 0;
  background: #0a0a0a;
  border-right: 1px solid var(--tv-border);
}

.tv-sidebar-logo {
  width: 34px; height: 34px; margin-bottom: 8px;
  border-radius: 10px;
  display: grid; place-items: center;
  color: var(--tv-accent);
  background: var(--tv-accent-soft);
  border: 1px solid rgba(146, 239, 74, 0.22);
}

.tv-side-btn {
  position: relative;
  width: 38px; height: 38px;
  border: none; border-radius: 8px;
  background: transparent;
  color: rgba(255,255,255,0.42);
  cursor: pointer;
  display: grid; place-items: center;
  transition: color 0.12s, background 0.12s;
}
.tv-side-btn:hover {
  color: rgba(255,255,255,0.75);
  background: rgba(255,255,255,0.05);
}
.tv-side-btn.is-active {
  color: var(--tv-accent);
  background: var(--tv-accent-soft);
}
.tv-side-btn.is-active::before {
  content: '';
  position: absolute;
  left: -7px; top: 25%;
  width: 2px; height: 50%;
  border-radius: 0 2px 2px 0;
  background: var(--tv-accent);
}

.tv-main {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  background: var(--tv-bg);
}

.tv-chrome {
  height: 44px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 12px 0 14px;
  border-bottom: 1px solid var(--tv-border);
  background: #0a0a0a;
  cursor: grab;
  user-select: none;
  flex-shrink: 0;
}
.tv-chrome:active { cursor: grabbing; }
.tv-chrome-brand {
  display: flex; align-items: baseline; gap: 8px;
}
.tv-chrome-brand strong {
  font-size: 13px; font-weight: 750; letter-spacing: -0.02em;
}
.tv-chrome-brand span {
  font-size: 10px; font-weight: 700; letter-spacing: 0.04em;
  color: var(--tv-dim); text-transform: uppercase;
}

.tv-icon-btn {
  width: 30px; height: 30px; border: none; border-radius: 8px;
  background: transparent; color: var(--tv-dim); cursor: pointer;
  display: grid; place-items: center;
}
.tv-icon-btn:hover { color: var(--tv-text); background: rgba(255,255,255,0.06); }

.tv-body {
  flex: 1; min-height: 0; overflow: auto;
  padding: 12px 12px 16px;
  scrollbar-width: thin;
  scrollbar-color: rgba(146,239,74,0.25) transparent;
}

.tv-page { display: none; flex-direction: column; gap: 12px; }
.tv-page.is-active { display: flex; }

.tv-banner {
  display: flex; gap: 8px; align-items: center;
  justify-content: space-between;
  padding: 10px 12px;
  border-radius: 10px;
  border: 1px solid rgba(96, 165, 250, 0.28);
  background: var(--tv-info-soft);
  color: #93c5fd;
  font-size: 11.5px; line-height: 1.4;
}
.tv-banner--warn {
  border-color: rgba(146, 239, 74, 0.35);
  background: var(--tv-accent-soft);
  color: #c8f59a;
}
.tv-banner-x {
  border: none; background: transparent; color: inherit;
  cursor: pointer; font-size: 14px; line-height: 1; padding: 0 2px;
}

.tv-seller {
  display: flex; align-items: center; justify-content: space-between;
  padding: 4px 2px;
}
.tv-seller-left { display: flex; align-items: center; gap: 10px; min-width: 0; }
.tv-avatar {
  width: 44px; height: 44px; border-radius: 50%;
  overflow: hidden; flex-shrink: 0;
  background: var(--tv-card);
  border: 1px solid var(--tv-border);
  display: grid; place-items: center;
  font-weight: 700; color: var(--tv-accent);
}
.tv-avatar img { width: 100%; height: 100%; object-fit: cover; display: block; }
.tv-avatar--sm { width: 36px; height: 36px; }
.tv-seller-name-row {
  display: flex; align-items: center; gap: 6px;
}
.tv-seller-name-row strong {
  font-size: 14px; font-weight: 700; letter-spacing: -0.02em;
}
.tv-seller-domain {
  display: block; margin-top: 2px;
  font-size: 11px; color: var(--tv-dim);
}
.tv-fav-btn {
  width: 26px; height: 26px; border: none; border-radius: 8px;
  background: transparent; color: #d4a017; cursor: pointer;
  display: grid; place-items: center; opacity: 0.55;
}
.tv-fav-btn.is-on, .tv-fav-btn:hover { opacity: 1; }

.tv-metrics {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
}
.tv-metric {
  padding: 10px 10px 12px;
  border-radius: 10px;
  background: var(--tv-card);
  border: 1px solid var(--tv-border);
  min-height: 68px;
}
.tv-metric span {
  display: block;
  font-size: 9px; font-weight: 700; letter-spacing: 0.06em;
  text-transform: uppercase; color: var(--tv-dim);
  margin-bottom: 8px;
}
.tv-metric strong {
  display: flex; align-items: center; gap: 6px;
  font-size: 18px; font-weight: 750; letter-spacing: -0.03em;
}
.tv-metric strong.is-accent { color: var(--tv-accent); }
.tv-metric.is-locked strong { color: var(--tv-dim); }
.tv-blur {
  filter: blur(5px);
  user-select: none;
}
.tv-metric i { display: grid; color: var(--tv-dim); }

.tv-toolbar {
  display: flex; align-items: center; justify-content: space-between; gap: 8px;
}
.tv-chips { display: flex; gap: 6px; flex-wrap: wrap; }
.tv-chip {
  height: 28px; padding: 0 10px;
  border: 1px solid var(--tv-border);
  border-radius: 8px;
  background: var(--tv-raised);
  color: var(--tv-muted);
  font: 650 11px/1 var(--tv-font);
  cursor: pointer;
}
.tv-chip:hover { color: var(--tv-text); border-color: rgba(255,255,255,0.16); }
.tv-chip.is-active {
  color: var(--tv-on-accent);
  background: var(--tv-accent);
  border-color: var(--tv-accent-strong);
}
.tv-chip--icon {
  width: 28px; padding: 0;
  display: grid; place-items: center;
}

.tv-sales-head {
  display: flex; align-items: center; justify-content: space-between; gap: 8px;
}
.tv-sales-head h3 {
  margin: 0; font-size: 12.5px; font-weight: 700;
}
.tv-sales-actions { display: flex; align-items: center; gap: 5px; flex-wrap: wrap; justify-content: flex-end; }
.tv-icon-mini {
  width: 28px; height: 28px; border-radius: 8px;
  border: 1px solid var(--tv-border);
  background: var(--tv-raised); color: var(--tv-dim);
  display: grid; place-items: center; cursor: pointer;
}
.tv-icon-mini.is-active { color: var(--tv-accent); border-color: rgba(146,239,74,0.35); background: var(--tv-accent-soft); }

.tv-sales {
  list-style: none; margin: 0; padding: 0;
  display: flex; flex-direction: column; gap: 8px;
}
.tv-sales.is-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}
.tv-sales.is-grid .tv-sale {
  flex-direction: column;
}
.tv-sales.is-grid .tv-sale-thumb {
  width: 100%; height: 120px;
}

.tv-sale {
  display: flex; gap: 10px; padding: 10px;
  border: 1px solid var(--tv-border);
  border-radius: 10px;
  background: var(--tv-raised);
  content-visibility: auto;
  contain-intrinsic-size: auto 84px;
}
.tv-sale-thumb {
  position: relative;
  width: 56px; height: 74px; border-radius: 6px;
  background: var(--tv-card); flex-shrink: 0; overflow: hidden;
}
.tv-sale-thumb.is-empty { background: linear-gradient(135deg, #1a1a1a, #111); }
.tv-sale-thumb img { width: 100%; height: 100%; object-fit: cover; display: block; }
.tv-sale-badges {
  position: absolute; left: 4px; bottom: 4px;
  display: flex; gap: 3px;
}
.tv-sale-badges span {
  display: inline-flex; align-items: center; gap: 2px;
  padding: 2px 4px; border-radius: 4px;
  background: rgba(0,0,0,0.65);
  color: #fff; font-size: 9px; font-weight: 700;
}
.tv-sale-meta { min-width: 0; flex: 1; display: flex; flex-direction: column; gap: 4px; }
.tv-sale-title {
  margin: 0; font-size: 12px; font-weight: 600; line-height: 1.35; color: var(--tv-text);
  display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;
}
.tv-sale-row {
  display: flex; align-items: center; gap: 6px;
  font-size: 11px; color: var(--tv-muted);
}
.tv-sale-price {
  margin-left: auto; font-size: 12.5px; font-weight: 750; color: var(--tv-accent);
}
.tv-sale-foot {
  display: flex; align-items: center; justify-content: space-between; gap: 8px;
  font-size: 10.5px; color: var(--tv-dim);
}
.tv-sale-link {
  color: var(--tv-accent); text-decoration: none; font-weight: 650; font-size: 11px;
}
.tv-sale-link:hover { text-decoration: underline; }

.tv-page-title h3 { margin: 0 0 4px; font-size: 15px; font-weight: 750; }
.tv-page-title p { margin: 0; font-size: 12px; color: var(--tv-muted); }

.tv-card {
  padding: 14px;
  border: 1px solid var(--tv-border);
  border-radius: 10px;
  background: var(--tv-raised);
}
.tv-card h3 { margin: 0 0 6px; font-size: 12px; font-weight: 700; }
.tv-card p { margin: 0; font-size: 12px; line-height: 1.45; color: var(--tv-muted); }

.tv-fav-card {
  display: flex; align-items: center; justify-content: space-between; gap: 10px;
}

.tv-stat-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
.tv-stat {
  padding: 12px;
  border-radius: 10px;
  border: 1px solid var(--tv-border);
  background: var(--tv-card);
}
.tv-stat-label {
  display: block; margin-bottom: 6px;
  font-size: 10px; font-weight: 700; letter-spacing: 0.06em;
  text-transform: uppercase; color: var(--tv-dim);
}
.tv-stat-value {
  font-size: 18px; font-weight: 750; letter-spacing: -0.03em;
}
.tv-stat-value.is-accent { color: var(--tv-accent); }

.tv-empty, .tv-gate, .tv-error {
  padding: 28px 16px; text-align: center;
  border: 1px solid var(--tv-border); border-radius: 10px;
  background: var(--tv-raised);
}
.tv-empty { color: var(--tv-muted); font-size: 13px; line-height: 1.5; }
.tv-gate-mark {
  width: 48px; height: 48px; margin: 0 auto 12px;
  border-radius: 14px; display: grid; place-items: center;
  color: var(--tv-accent); background: var(--tv-accent-soft);
}
.tv-gate h3 { margin: 0 0 8px; font-size: 16px; }
.tv-gate p { margin: 0 0 16px; color: var(--tv-muted); font-size: 13px; line-height: 1.5; }
.tv-error {
  border-color: rgba(255,92,122,0.35); background: var(--tv-danger-soft);
  color: var(--tv-danger); font-size: 13px; line-height: 1.45;
}
.tv-error strong { display: block; margin-bottom: 4px; color: #ffb0bf; }

.tv-btn {
  display: inline-flex; align-items: center; justify-content: center;
  min-height: 40px; padding: 0 16px; border: none; border-radius: 10px;
  background: var(--tv-accent); color: var(--tv-on-accent);
  font: 700 13px/1 var(--tv-font); cursor: pointer;
}
.tv-btn--ghost {
  background: var(--tv-raised); color: var(--tv-text);
  border: 1px solid var(--tv-border); margin-top: 8px;
}

.tv-spinner {
  width: 22px; height: 22px;
  border: 2px solid rgba(146, 239, 74, 0.2);
  border-top-color: var(--tv-accent);
  border-radius: 50%;
  animation: tv-spin 0.55s linear infinite;
  margin: 0 auto 12px;
}
@keyframes tv-spin { to { transform: rotate(360deg); } }

.tv-skeleton { display: flex; flex-direction: column; gap: 10px; }
.tv-skel-row { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 8px; }
.tv-skel {
  height: 72px; border-radius: 10px;
  background: linear-gradient(90deg, #111 25%, #1a1a1a 50%, #111 75%);
  background-size: 200% 100%;
  animation: tv-shimmer 1.2s ease infinite;
}
.tv-skel--banner { height: 42px; }
.tv-skel--seller { height: 56px; }
@keyframes tv-shimmer {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}

.tv-pause-toast {
  position: fixed; left: 50%; bottom: 24px; z-index: 2147483647;
  width: min(340px, calc(100vw - 24px)); transform: translateX(-50%);
  pointer-events: auto; animation: tv-panel-in 0.2s ease both;
}
.tv-pause-toast[hidden] { display: none !important; }
.tv-pause-toast__inner {
  display: flex; gap: 10px; align-items: flex-start;
  padding: 12px 14px; border-radius: 12px;
  border: 1px solid rgba(240,180,41,0.35); background: #1a1608;
  box-shadow: 0 12px 32px rgba(0,0,0,0.4); color: var(--tv-text);
}
.tv-pause-toast__dot {
  width: 8px; height: 8px; margin-top: 4px; border-radius: 50%;
  background: var(--tv-warn); flex-shrink: 0;
}
.tv-pause-toast__text { display: flex; flex-direction: column; gap: 2px; flex: 1; font-size: 12px; line-height: 1.4; }
.tv-pause-toast__text strong { color: var(--tv-warn); }
.tv-pause-toast__text span { color: var(--tv-muted); }
.tv-pause-toast__dismiss {
  border: none; background: transparent; color: var(--tv-dim);
  cursor: pointer; font-size: 16px; line-height: 1;
}
`;

export const HOST_DOCUMENT_STYLES = `
tv-overlay-root {
  all: initial;
  position: fixed; inset: 0; width: 0; height: 0;
  overflow: visible; pointer-events: none; z-index: 2147483646;
}
/* Ne PAS forcer pointer-events:auto sur tous les descendants light-DOM */

.tv-feed-btn {
  position: absolute !important; top: 8px !important; right: 8px !important;
  z-index: 5 !important; width: 32px !important; height: 32px !important;
  margin: 0 !important; padding: 0 !important;
  border: 1px solid rgba(146, 239, 74, 0.35) !important;
  border-radius: 10px !important;
  background: rgba(0, 0, 0, 0.82) !important;
  color: #92ef4a !important; cursor: pointer !important;
  display: grid !important; place-items: center !important;
  box-shadow: 0 4px 14px rgba(0, 0, 0, 0.35) !important;
  contain: layout paint style !important; pointer-events: auto !important;
}
.tv-feed-btn:hover { transform: scale(1.06) !important; }
.tv-feed-btn.is-saved {
  color: #0b1702 !important; background: #92ef4a !important; border-color: #7ad636 !important;
}
.tv-feed-btn svg { width: 16px; height: 16px; pointer-events: none; }
[data-tv-enhanced="1"] { position: relative !important; }
`;
