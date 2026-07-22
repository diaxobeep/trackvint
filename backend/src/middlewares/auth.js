/**
 * Auth JWT — vérifie Authorization: Bearer <token>
 */
import jwt from 'jsonwebtoken';
import { createUser } from '../models/types.js';

export const JWT_SECRET =
  process.env.JWT_SECRET || 'trackvint-dev-secret-change-me';

export const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

/**
 * @param {{ id: string, name: string, email: string, image?: string|null }} user
 * @returns {string}
 */
export function signUserToken(user) {
  return jwt.sign(
    {
      sub: user.id,
      name: user.name,
      email: user.email,
      image: user.image ?? null,
    },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN },
  );
}

/**
 * @param {string} token
 * @returns {import('../models/types.js').User|null}
 */
export function verifyUserToken(token) {
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    if (!payload || typeof payload !== 'object') return null;
    return createUser({
      id: String(payload.sub),
      name: String(payload.name || ''),
      email: String(payload.email || ''),
      image: payload.image ?? null,
    });
  } catch {
    return null;
  }
}

/**
 * Extrait le Bearer token ; ignore les cookies ResellTrack legacy.
 */
export function optionalAuth(req, _res, next) {
  const bearer = req.headers.authorization?.replace(/^Bearer\s+/i, '');
  const token = bearer || null;

  if (token) {
    const user = verifyUserToken(token);
    if (user) {
      req.user = user;
      req.sessionToken = token;
      return next();
    }
  }

  req.user = null;
  req.sessionToken = null;
  next();
}

export function requireAuth(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ error: 'unauthenticated' });
  }
  return next();
}
