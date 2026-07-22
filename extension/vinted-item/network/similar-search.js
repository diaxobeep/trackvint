/**
 * Recherche d'annonces similaires via l'API photos Vinted.
 * Passe par vinted-client (cookies session, rate-limit, 429/challenge).
 */

import { extensionApi } from '../browser.js';
import { parseCatalogHtml } from '../dom/catalog-parser.js';
import {
  fetchVintedHtml,
  uploadVintedPhoto,
} from './vinted-client.js';

/**
 * Convertit un Blob image en JPEG (qualité 0.9) via canvas.
 * @param {Blob} imageBlob
 * @returns {Promise<Blob>}
 */
export async function convertBlobToJpeg(imageBlob) {
  if (imageBlob.type === 'image/jpeg') return imageBlob;

  const bitmap = await createImageBitmap(imageBlob);
  const canvas = document.createElement('canvas');
  canvas.width = bitmap.width;
  canvas.height = bitmap.height;

  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('canvas_2d_unavailable');

  ctx.drawImage(bitmap, 0, 0);
  bitmap.close();

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('canvas_toBlob_null'))),
      'image/jpeg',
      0.9,
    );
  });
}

/**
 * @param {string} base64
 * @returns {Uint8Array}
 */
function base64ToUint8Array(base64) {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

/**
 * @param {string} imageUrl
 * @returns {Promise<import('../dom/catalog-parser.js').CatalogListing[]>}
 */
export async function searchSimilarListingsByImage(imageUrl) {
  // CDN images → relais SW (cookies + UA navigateur, sans spoof)
  const downloadResult = await extensionApi.runtime.sendMessage({
    type: 'FETCH_VINTED_IMAGE',
    url: imageUrl,
  });

  if (downloadResult.error || !downloadResult.base64) {
    throw new Error(`image_download_${downloadResult.error ?? 'unknown'}`);
  }

  const imageBytes = base64ToUint8Array(downloadResult.base64);
  const jpegBlob = await convertBlobToJpeg(
    new Blob([imageBytes], { type: downloadResult.mime ?? 'image/jpeg' }),
  );

  const formData = new FormData();
  formData.append('photo[type]', 'item');
  formData.append('photo[file]', jpegBlob, 'image.jpg');

  const uploadJson = await uploadVintedPhoto(formData);
  const photoUuid =
    uploadJson?.uuid ?? uploadJson?.photo?.uuid ?? uploadJson?.id;

  if (!photoUuid) throw new Error('upload_no_uuid');

  const catalogPath = `/catalog?search_by_image_uuid=${encodeURIComponent(photoUuid)}`;
  const html = await fetchVintedHtml(catalogPath, {
    priority: 'interactive',
  });

  return parseCatalogHtml(html);
}
