/**
 * Pont réseau (ex-service worker ResellTrack).
 *
 * - Plus d'appels vers app.reselltrack.fr
 * - Toutes les requêtes SaaS passent par `shared/api` + JWT Bearer
 * - La logique Vinted (CSRF, upload photos, catalogue) reste inchangée
 */

import { API_BASE_URL, apiUrl } from '../shared/config.js';
import {
  api,
  directApiRequest,
  fetchSession,
  getRadarAnalysis,
  loginWithPassword,
  signOut,
} from '../shared/api/client.js';
import { getAccessToken, setSession } from '../shared/auth/session.js';

const extensionApi =
  globalThis.browser?.runtime?.id != null
    ? globalThis.browser
    : globalThis.chrome;

/** Domaines Vinted — inchangés (injection / analyse DOM). */
export const VINTED_HOST_RE =
  /vinted\.(fr|be|es|de|it|nl|pl|pt|at|lu|cz|sk|hu|ro|lt|lv|ee)$/;

/**
 * Enregistre les handlers runtime.onMessage (à appeler depuis background.js).
 */
export function registerMessageHandlers() {
  if (!extensionApi?.runtime?.onMessage) {

    return;
  }

  const reply = (message, sendResponse) => {
    handleMessage(message)
      .then(sendResponse)
      .catch((error) => {
        sendResponse({
          __status: 0,
          __error: error instanceof Error ? error.message : String(error),
        });
      });
    return true;
  };

  extensionApi.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (sender.id && extensionApi.runtime?.id && sender.id !== extensionApi.runtime.id) {
      return false;
    }
    return reply(message, sendResponse);
  });

  // Messages depuis http://localhost:3000/auth (externally_connectable)
  extensionApi.runtime.onMessageExternal?.addListener((message, sender, sendResponse) => {
    const origin = sender.url || '';
    const allowed =
      origin.startsWith('http://localhost:3000/') ||
      origin.startsWith('http://127.0.0.1:3000/');
    if (!allowed) return false;
    if (message?.type !== 'SET_JWT') return false;
    return reply(message, sendResponse);
  });
}

/**
 * @param {any} message
 */
async function handleMessage(message) {
  switch (message.type) {
    case 'TV_API_REQUEST':
      return directApiRequest(message.path, message.options || {});

    case 'CHECK_SAAS_SESSION':
      return fetchSession();

    case 'CONNECT_EXISTING':
      return fetchSession();

    case 'LOGIN_PASSWORD':
      return loginWithPassword({
        email: message.email,
        password: message.password,
      });

    case 'START_OAUTH':
    case 'START_EMAIL_LOGIN': {
      return {
        ok: false,
        error: 'Utilise la connexion email/mot de passe dans le popup.',
      };
    }

    case 'SIGN_OUT':
      await signOut();
      return { ok: true };

    case 'GET_RADAR_ANALYSIS':
      return getRadarAnalysis(message.url);

    case 'DELETE_RESOURCE': {
      let path = message.url;
      try {
        if (/^https?:\/\//i.test(path)) {
          const u = new URL(path);
          path = `${u.pathname}${u.search}`;
        }
      } catch {
        /* keep */
      }
      path = path
        .replace(/^https?:\/\/app\.reselltrack\.fr/i, '')
        .replace(/^https?:\/\/cdn\.reselltrack\.io/i, '');
      return api.delete(path);
    }

    case 'SAVE_VINTED_ITEM':
      return api.post('/api/extension/items/save', {
        folderId: message.folderId || 'folder_niches',
        item: message.item,
      });

    case 'FAVORITE_SELLER':
      return api.post('/api/extension/sellers/favorite', {
        folderId: message.folderId || 'folder_sellers',
        ...message.seller,
      });

    case 'UPGRADE_PLAN':
      return api.post('/api/extension/subscription/upgrade', {
        plan: message.plan || 'pro',
      });

    case 'UNFAVORITE_SELLER':
      return api.delete('/api/extension/sellers/favorite', { id: message.id });

    case 'CREATE_FOLDER':
      return api.post('/api/extension/folders', {
        name: message.name,
        parentId: message.parentId ?? null,
      });

    case 'CLEAR_RADAR_CACHE':
      // Cache local éventuel — no-op côté mock
      return { ok: true };

    case 'FETCH_VINTED_IMAGE': {
      // Cookies session + User-Agent natif du navigateur (ne jamais spoof UA)
      const response = await fetch(message.url, {
        credentials: 'include',
        cache: 'no-cache',
        headers: {
          Accept: 'image/avif,image/webp,image/apng,image/*,*/*;q=0.8',
          // Accept-Language réel si dispo dans le SW
          ...(typeof navigator !== 'undefined' && navigator.language
            ? {
                'Accept-Language':
                  navigator.languages?.join(',') || navigator.language,
              }
            : {}),
        },
      });

      if (response.status === 429) {
        return {
          error: 'image_429',
          rateLimited: true,
          retryAfter: response.headers.get('retry-after'),
        };
      }
      if (!response.ok) return { error: `image_${response.status}` };

      const buffer = await response.arrayBuffer();
      const mime = response.headers.get('content-type') ?? 'image/jpeg';
      const bytes = new Uint8Array(buffer);
      let binary = '';
      const chunk = 0x8000;
      for (let i = 0; i < bytes.length; i += chunk) {
        binary += String.fromCharCode.apply(
          null,
          // @ts-expect-error TypedArray → apply
          bytes.subarray(i, i + chunk),
        );
      }
      return { base64: btoa(binary), mime };
    }

    case 'TV_VINTED_RESUME': {
      // Relayé aux content scripts via tabs si besoin — no-op SW
      return { ok: true };
    }

    case 'GET_API_BASE':
      return { apiBaseUrl: API_BASE_URL };

    case 'SET_JWT':
      await setSession(message.token, message.user);
      // Notifie popup / overlay pour recharger l’UI connectée
      try {
        extensionApi.runtime.sendMessage({ type: 'AUTH_COMPLETE' }).catch(() => {});
      } catch {
        /* popup peut être fermé */
      }
      return { ok: true };

    case 'GET_JWT':
      return { token: await getAccessToken() };

    default:
      return { __error: `unknown_message:${message.type}` };
  }
}

export { API_BASE_URL, apiUrl, VINTED_HOST_RE as isVintedHostPattern };
