import { neon } from '@neondatabase/serverless';

let _sql = null;
export function getDb() {
  if (!_sql) _sql = neon(process.env.DATABASE_URL);
  return _sql;
}

const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN || '*';

export function jsonResponse(data, status = 200, extraHeaders = {}) {
  return {
    statusCode: status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': ALLOWED_ORIGIN,
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, PATCH, OPTIONS',
      'Vary': 'Origin',
      'Cache-Control': 'no-store',
      ...extraHeaders,
    },
    body: JSON.stringify(data),
  };
}

export function errorResponse(message, status = 500, extra = {}) {
  return jsonResponse({ error: message, ...extra }, status);
}

export function parseBody(event) {
  try { return JSON.parse(event.body || '{}'); } catch { return {}; }
}

// Jalankan fn() sekali per instance function yang warm (mis. migrasi ALTER TABLE ... IF NOT EXISTS).
// Request yang datang bersamaan berbagi promise yang sama; kalau gagal, entry dibuang supaya dicoba lagi.
// Penting: ALTER TABLE mengambil lock tabel walau kolomnya sudah ada, jadi jangan dijalankan tiap request.
const _onceCache = new Map();
export function runOnce(key, fn) {
  let p = _onceCache.get(key);
  if (!p) {
    p = (async () => fn())();
    _onceCache.set(key, p);
    p.catch(() => { if (_onceCache.get(key) === p) _onceCache.delete(key); });
  }
  return p;
}
