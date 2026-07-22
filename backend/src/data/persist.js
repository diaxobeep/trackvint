/**
 * Persistance JSON simple pour le store en mémoire.
 * Fichier : backend/data/db.json
 *
 * Note: le dossier Documents peut être sur iCloud (fichiers dataless).
 * Les lectures ont un timeout pour ne pas bloquer le boot.
 */
import { mkdir, readFile, writeFile, access } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.resolve(__dirname, '../../data');
const DB_PATH = path.join(DATA_DIR, 'db.json');

let writeQueue = Promise.resolve();

function withTimeout(promise, ms, label) {
  return Promise.race([
    promise,
    new Promise((_, reject) => {
      setTimeout(() => reject(new Error(`${label}_timeout`)), ms);
    }),
  ]);
}

export async function loadPersistedDb() {
  try {
    await withTimeout(access(DB_PATH), 400, 'persist_access');
    const raw = await withTimeout(readFile(DB_PATH, 'utf8'), 800, 'persist_read');
    return JSON.parse(raw);
  } catch (err) {
    if (err?.message?.includes('timeout')) {
      console.warn('[trackvint] skip db.json (iCloud/dataless timeout)');
    }
    return null;
  }
}

/**
 * @param {() => object} snapshotFn
 */
export function schedulePersist(snapshotFn) {
  writeQueue = writeQueue
    .then(async () => {
      await withTimeout(mkdir(DATA_DIR, { recursive: true }), 1000, 'persist_mkdir');
      const payload = {
        savedAt: new Date().toISOString(),
        ...snapshotFn(),
      };
      await withTimeout(
        writeFile(DB_PATH, JSON.stringify(payload, null, 2), 'utf8'),
        2000,
        'persist_write',
      );
    })
    .catch((err) => {
      console.warn('[trackvint] persist failed:', err?.message || err);
    });
  return writeQueue;
}

export { DB_PATH, DATA_DIR };
