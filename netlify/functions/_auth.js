import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  throw new Error('JWT_SECRET env var belum di-set!');
}

if (JWT_SECRET.length < 32) {
  console.warn('[auth] JWT_SECRET kurang dari 32 karakter. Ganti dengan nilai acak, mis. `openssl rand -hex 32`.');
}

const ACCESS_TOKEN_TTL = '15m';
const REFRESH_TOKEN_TTL_MS = 8 * 60 * 60 * 1000;
export const SESSION_MAX_MS = 24 * 60 * 60 * 1000;

export const BCRYPT_COST = 12;
export const PASSWORD_MIN = 10;
// Hanya untuk mendeteksi akun lama yang masih memakai password default. Tidak dipakai untuk membuat password.
export const LEGACY_DEFAULT_PASSWORD = 'Balut2026';

export function signToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { algorithm: 'HS256', expiresIn: ACCESS_TOKEN_TTL });
}

export function verifyToken(token) {
  try { return jwt.verify(token, JWT_SECRET, { algorithms: ['HS256'] }); } catch { return null; }
}

export function getTokenFromEvent(event) {
  const auth = event.headers?.authorization || event.headers?.Authorization || '';
  if (auth.startsWith('Bearer ')) return auth.slice(7);
  return null;
}

// Token dengan klaim `mcp` (wajib ganti password) hanya boleh mengakses endpoint ini.
const MCP_ALLOWED_PATH = /\/auth\/(change-password|me|logout|logout-all)\/?$/;

export function requireAuth(event) {
  const token = getTokenFromEvent(event);
  if (!token) return null;
  const user = verifyToken(token);
  if (!user) return null;
  if (user.mcp && !MCP_ALLOWED_PATH.test(event.path || '')) return null;
  return user;
}

export function requireAdmin(event) {
  const user = requireAuth(event);
  if (!user || !user.is_admin) return null;
  return user;
}

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

export function validatePassword(pw, { nip } = {}) {
  if (typeof pw !== 'string') return 'Password tidak valid';
  if (pw.length < PASSWORD_MIN) return `Password minimal ${PASSWORD_MIN} karakter`;
  if (Buffer.byteLength(pw, 'utf8') > 72) return 'Password maksimal 72 karakter';
  if (!/[a-z]/.test(pw) || !/[A-Z]/.test(pw) || !/\d/.test(pw) || !/[^A-Za-z0-9\s]/.test(pw)) {
    return 'Password harus mengandung huruf besar, huruf kecil, angka, dan simbol';
  }
  const low = pw.toLowerCase();
  if (low === LEGACY_DEFAULT_PASSWORD.toLowerCase() || /^(password|qwerty|admin|sapa|balut|dinkes|banggai)[\d\W_]*$/i.test(pw)) {
    return 'Password terlalu mudah ditebak, pilih yang lain';
  }
  if (nip && String(nip).trim().length >= 6 && low.includes(String(nip).trim().toLowerCase())) {
    return 'Password tidak boleh mengandung NIP';
  }
  return null;
}

export function hashPassword(pw) {
  return bcrypt.hash(pw, BCRYPT_COST);
}

export function needsRehash(hash) {
  try { return bcrypt.getRounds(hash) < BCRYPT_COST; } catch { return false; }
}

export function generateTempPassword() {
  const abc = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
  for (;;) {
    let p = '';
    for (let i = 0; i < 12; i++) p += abc[crypto.randomInt(abc.length)];
    if (/\d/.test(p) && /[a-z]/.test(p) && /[A-Z]/.test(p)) return p;
  }
}
