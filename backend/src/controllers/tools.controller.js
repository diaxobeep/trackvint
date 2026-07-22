/**
 * Tools image-search (Lens) — mock.
 */

/**
 * GET /api/tools/image-search/ingest?url=
 * Retourne une URL « hébergée » (ici : l'URL d'origine).
 */
export function ingestImage(req, res) {
  const url = String(req.query.url || '');
  if (!url) {
    return res.status(400).json({ error: 'url_required' });
  }

  try {
    // Valide que c'est une URL http(s)
    const parsed = new URL(url);
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      return res.status(400).json({ error: 'invalid_url' });
    }
  } catch {
    return res.status(400).json({ error: 'invalid_url' });
  }

  return res.json({
    url,
    ingestedAt: new Date().toISOString(),
    storage: 'mock-r2',
  });
}

/**
 * POST /api/tools/image-search/upload
 * Body: { imageB64, contentType }
 */
export function uploadImage(req, res) {
  const { imageB64, contentType } = req.body ?? {};
  const allowed = new Set(['image/jpeg', 'image/png', 'image/webp']);

  if (!imageB64 || typeof imageB64 !== 'string') {
    return res.status(400).json({ error: 'imageB64_required' });
  }

  const mime = allowed.has(contentType) ? contentType : 'image/jpeg';
  const id = `img_${Date.now()}`;
  const raw = imageB64.replace(/^data:[^;]+;base64,/, '');
  const previewSlice = raw.slice(0, 120);
  const dataUrl = `data:${mime};base64,${previewSlice}`;

  return res.status(201).json({
    url: `https://cdn.trackvint.local/mock/${id}.jpg`,
    contentType: mime,
    bytesEstimate: Math.floor((raw.length * 3) / 4),
    preview: dataUrl,
  });
}
