/**
 * Service worker TrackVint.
 */
import { registerMessageHandlers, API_BASE_URL } from './api-bridge.js';

const api = globalThis.browser?.runtime?.id != null ? globalThis.browser : globalThis.chrome;

registerMessageHandlers();

const VINTED_RE = /vinted\.(fr|be|es|de|it|nl|pl|pt|at|lu)/i;

/** Sur Vinted : clic icône = toggle overlay. Sinon : popup. */
async function syncActionForTab(tabId, url = '') {
  try {
    if (VINTED_RE.test(url)) {
      await api.action.setPopup({ tabId, popup: '' });
    } else {
      await api.action.setPopup({ tabId, popup: 'popup/index.html' });
    }
  } catch {
    /* ignore */
  }
}

api.action.onClicked.addListener(async (tab) => {
  if (!tab?.id) return;
  try {
    await api.tabs.sendMessage(tab.id, { type: 'TOGGLE_TV_PANEL' });
  } catch (err) {

  }
});

api.commands?.onCommand?.addListener(async (command) => {
  if (command !== 'toggle-panel') return;
  const [tab] = await api.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id || !VINTED_RE.test(tab.url || '')) return;
  try {
    await api.tabs.sendMessage(tab.id, { type: 'TOGGLE_TV_PANEL' });
  } catch (err) {

  }
});

api.tabs.onActivated.addListener(async ({ tabId }) => {
  const tab = await api.tabs.get(tabId).catch(() => null);
  if (tab?.url) await syncActionForTab(tabId, tab.url);
});

api.tabs.onUpdated.addListener(async (tabId, info, tab) => {
  if (info.url || info.status === 'complete') {
    await syncActionForTab(tabId, tab.url || '');
  }
});

api.runtime.onInstalled.addListener(() => {

});
