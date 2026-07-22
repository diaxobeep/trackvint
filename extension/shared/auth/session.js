/**
 * Session JWT — stockage local (extension ou navigateur).
 * N'utilise plus les cookies cross-origin de app.reselltrack.fr.
 */

import { JWT_STORAGE_KEY, USER_STORAGE_KEY } from '../config.js';

function getStorageArea() {
  const api =
    globalThis.chrome?.runtime?.id != null
      ? globalThis.chrome
      : globalThis.browser?.runtime?.id != null
        ? globalThis.browser
        : null;

  if (api?.storage?.local) {
    return {
      async get(keys) {
        return api.storage.local.get(keys);
      },
      async set(obj) {
        return api.storage.local.set(obj);
      },
      async remove(keys) {
        return api.storage.local.remove(keys);
      },
    };
  }

  // Fallback page web / preview
  return {
    async get(keys) {
      const list = Array.isArray(keys) ? keys : [keys];
      /** @type {Record<string, unknown>} */
      const out = {};
      for (const key of list) {
        const raw = localStorage.getItem(key);
        out[key] = raw ? JSON.parse(raw) : undefined;
      }
      return out;
    },
    async set(obj) {
      for (const [key, value] of Object.entries(obj)) {
        localStorage.setItem(key, JSON.stringify(value));
      }
    },
    async remove(keys) {
      const list = Array.isArray(keys) ? keys : [keys];
      for (const key of list) localStorage.removeItem(key);
    },
  };
}

const storage = getStorageArea();

/**
 * @returns {Promise<string|null>}
 */
export async function getAccessToken() {
  const data = await storage.get(JWT_STORAGE_KEY);
  const token = data[JWT_STORAGE_KEY];
  return typeof token === 'string' && token.length > 0 ? token : null;
}

/**
 * @param {string} token
 * @param {{ id: string, name: string, email: string, image?: string|null }} [user]
 */
export async function setSession(token, user) {
  /** @type {Record<string, unknown>} */
  const payload = { [JWT_STORAGE_KEY]: token };
  if (user) payload[USER_STORAGE_KEY] = user;
  await storage.set(payload);
}

/**
 * @returns {Promise<{ id: string, name: string, email: string, image: string|null }|null>}
 */
export async function getStoredUser() {
  const data = await storage.get(USER_STORAGE_KEY);
  const user = data[USER_STORAGE_KEY];
  return user && typeof user === 'object' ? /** @type {any} */ (user) : null;
}

export async function clearSession() {
  await storage.remove([JWT_STORAGE_KEY, USER_STORAGE_KEY]);
}

/**
 * Header Authorization prêt à l'emploi, ou objet vide si non connecté.
 * @returns {Promise<Record<string, string>>}
 */
export async function getAuthHeaders() {
  const token = await getAccessToken();
  if (!token) return {};
  return { Authorization: `Bearer ${token}` };
}
