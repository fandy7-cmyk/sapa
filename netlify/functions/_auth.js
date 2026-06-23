// netlify/functions/_auth.js
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  // Jangan biarkan server jalan dengan secret tebakan/hardcoded.
  // Set env var JWT_SECRET di Netlify Dashboard → Site settings → Environment variables.
  throw new Error('JWT_SECRET env var belum di-set!');
}

export function signToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '8h' });
}

export function verifyToken(token) {
  try { return jwt.verify(token, JWT_SECRET); } catch { return null; }
}

export function getTokenFromEvent(event) {
  const auth = event.headers?.authorization || event.headers?.Authorization || '';
  if (auth.startsWith('Bearer ')) return auth.slice(7);
  return null;
}

export function requireAuth(event) {
  const token = getTokenFromEvent(event);
  if (!token) return null;
  return verifyToken(token);
}

export function requireAdmin(event) {
  const user = requireAuth(event);
  if (!user || !user.is_admin) return null;
  return user;
}