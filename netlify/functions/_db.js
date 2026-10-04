import { neon, neonConfig } from '@neondatabase/serverless';

// Semua query Neon (HTTP) lewat fetch ini supaya koneksi yang macet tidak menggantung sampai
// function kena timeout (30 dtk di netlify dev): batasi waktu tiap request, dan ulangi SEKALI
// khusus SELECT biasa. INSERT/UPDATE/DELETE/transaksi tidak pernah diulang otomatis (bisa dobel).
const DB_TIMEOUT_MS = parseInt(process.env.DB_FETCH_TIMEOUT_MS, 10) || 12000;

function isPlainSelect(body) {
  try {
    const o = JSON.parse(body);
    const q = typeof o?.query === 'string' ? o.query : null;   // transaksi (o.queries) tidak diulang
    return !!q && /^\s*select\b/i.test(q)
      && !/\bfor\s+(update|share|no\s+key)\b/i.test(q)
      && !/\b(nextval|setval|pg_advisory\w*)\s*\(/i.test(q);
  } catch { return false; }
}

export async function dbFetch(url, init = {}) {
  const maxTry = isPlainSelect(init.body) ? 2 : 1;
  let lastErr;
  for (let i = 1; i <= maxTry; i++) {
    const ctrl  = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), DB_TIMEOUT_MS);
    const signal = init.signal && AbortSignal.any ? AbortSignal.any([init.signal, ctrl.signal]) : ctrl.signal;
    try {
      const res = await fetch(url, { ...init, signal });
      // Baca isi respons sampai habis selagi timer masih jalan (body yang macet ikut terputus).
      const buf = await res.arrayBuffer();
      return new Response(buf, { status: res.status, statusText: res.statusText, headers: res.headers });
    } catch (e) {
      lastErr = ctrl.signal.aborted
        ? new Error(`Database tidak merespons dalam ${Math.round(DB_TIMEOUT_MS / 1000)} detik`)
        : e;
    } finally {
      clearTimeout(timer);
    }
  }
  throw lastErr;
}
neonConfig.fetchFunction = dbFetch;

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
