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