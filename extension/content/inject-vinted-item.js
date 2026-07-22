/**
 * Bootstrap → content script fiche article (extraction / recherche visuelle).
 */
(async () => {
  try {
    const url = chrome.runtime.getURL('vinted-item/main.js');
    await import(url);
  } catch (err) {
    console.error('[TrackVint] vinted-item bootstrap failed', err);
  }
})();
