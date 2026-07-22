export function notFoundHandler(_req, res) {
  res.status(404).json({ error: 'not_found' });
}

export function errorHandler(err, _req, res, _next) {
  if (err?.message?.startsWith('CORS blocked')) {
    return res.status(403).json({ error: 'cors_blocked', message: err.message });
  }

  console.error('[error]', err);
  const status = err.status || 500;
  return res.status(status).json({
    error: err.code || 'internal_error',
    message: err.message || 'Unexpected error',
  });
}
