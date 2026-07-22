/**
 * Accès unifié à l'API d'extension (Chrome / Firefox).
 * Firefox expose `browser`, Chrome expose `chrome`.
 */
export const extensionApi =
  globalThis.browser?.runtime?.id != null
    ? globalThis.browser
    : globalThis.chrome;
