import { neon, neonConfig } from '@neondatabase/serverless';

const DB_TIMEOUT_MS = parseInt(process.env.DB_FETCH_TIMEOUT_MS, 10) || 12000;

function isPlainSelect(body) {
  try {
    const o = JSON.parse(body);
    const q = typeof o?.query === 'string' ? o.query : null;
    return !!q && /^\s*select\b/i.test(q)
      && !/\bfor\s+(update|share|no\s+key)\b/i.test(q)
      && !/\b(nextval|setval|pg_advisory\w*)\s*\(/i.test(q);
  } catch { return false; }
}

const FUNCTION_BUDGET_MS = parseInt(process.env.FUNCTION_BUDGET_MS, 10) || 27000;
let _deadline = 0;
export function setRequestDeadline(budgetMs = FUNCTION_BUDGET_MS) { _deadline = Date.now() + budgetMs; }

export async function dbFetch(url, init = {}) {
  const maxTry = isPlainSelect(init.body) ? 2 : 1;
  let lastErr;
  for (let i = 1; i <= maxTry; i++) {
    const sisa = _deadline ? _deadline - Date.now() : Infinity;
    if (sisa < 1500) {
      throw lastErr || new Error('Database tidak merespons: batas waktu function hampir habis');
    }
    const timeoutMs = Math.min(DB_TIMEOUT_MS, sisa - 500);
    const ctrl  = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), timeoutMs);
    const signal = init.signal && AbortSignal.any ? AbortSignal.any([init.signal, ctrl.signal]) : ctrl.signal;
    try {
      const res = await fetch(url, { ...init, signal });
      const buf = await res.arrayBuffer();
      return new Response(buf, { status: res.status, statusText: res.statusText, headers: res.headers });
    } catch (e) {
      lastErr = ctrl.signal.aborted
        ? new Error(`Database tidak merespons dalam ${Math.round(timeoutMs / 1000)} detik`)
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
