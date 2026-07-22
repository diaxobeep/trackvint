import cors from 'cors';

/**
 * CORS pour :
 * - l'extension Chrome (`chrome-extension://<id>`)
 * - le frontend SaaS local / prod
 * - les previews locales
 *
 * Les content scripts n'envoient pas d'Origin chrome-extension pour les fetch
 * page-context, mais le service worker et le popup oui.
 */
const ALLOWED_ORIGIN_PATTERNS = [
  /^chrome-extension:\/\//i,
  /^moz-extension:\/\//i,
  /^http:\/\/localhost(:\d+)?$/i,
  /^http:\/\/127\.0\.0\.1(:\d+)?$/i,
  /^https:\/\/.*\.vercel\.app$/i,
  /^https:\/\/(www\.)?trackvint\.[a-z.]+$/i,
  /^https:\/\/app\.reselltrack\.fr$/i,
];

function isOriginAllowed(origin) {
  if (!origin) return true; // same-origin / outils CLI / certains SW
  return ALLOWED_ORIGIN_PATTERNS.some((re) => re.test(origin));
}

export const corsMiddleware = cors({
  origin(origin, callback) {
    if (isOriginAllowed(origin)) {
      callback(null, true);
      return;
    }
    callback(new Error(`CORS blocked for origin: ${origin}`));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type',
    'Accept',
    'Authorization',
    'X-Requested-With',
    'Cookie',
    'Access-Control-Request-Private-Network',
  ],
  exposedHeaders: ['Set-Cookie'],
  maxAge: 86400,
});

/** Chrome Private Network Access — extensions → localhost */
export function privateNetworkMiddleware(req, res, next) {
  res.setHeader('Access-Control-Allow-Private-Network', 'true');
  if (
    req.method === 'OPTIONS' &&
    req.headers['access-control-request-private-network'] === 'true'
  ) {
    res.setHeader('Access-Control-Allow-Private-Network', 'true');
  }
  next();
}
