import jwt from 'jsonwebtoken';
import crypto from 'crypto';

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  throw new Error('JWT_SECRET env var belum di-set!');
}

const ACCESS_TOKEN_TTL = '1h';
const REFRESH_TOKEN_TTL_MS = 8 * 60 * 60 * 1000; 

export function signToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: ACCESS_TOKEN_TTL });
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

// Admin Kinerja: admin penuh ATAU user yang punya permission 'kinerja.full'.
// Dipakai untuk endpoint kelola indikator/target/jenis/laporan/monitoring/periode.
export async function requireKinerjaAdmin(event, sql) {
  const user = requireAuth(event);
  if (!user) return null;
  if (user.is_admin) return user;
  try {
    const rows = await sql`
      SELECT 1 FROM user_permissions
      WHERE user_id = ${user.id} AND menu_key = 'kinerja.full' LIMIT 1
    `;
    return rows.length ? user : null;
  } catch { return null; }
}

export function hashRefreshToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

export function generateRefreshToken() {
  const token = crypto.randomBytes(40).toString('hex');
  const hash = hashRefreshToken(token);
  const expires_at = new Date(Date.now() + REFRESH_TOKEN_TTL_MS);
  return { token, hash, expires_at };
}