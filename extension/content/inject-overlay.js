/**
 * Bootstrap content-script (non-module) → charge overlay ES module.
 * Chrome n'autorise pas type=module directement dans content_scripts.
 */
(async () => {
  try {
    const url = chrome.runtime.getURL('overlay/main.js');
    await import(url);
  } catch (err) {
    console.error('[TrackVint] overlay bootstrap failed', err);
  }
})();
