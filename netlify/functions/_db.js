// netlify/functions/_db.js
import { neon } from '@neondatabase/serverless';

let _sql = null;
export function getDb() {
  if (!_sql) _sql = neon(process.env.DATABASE_URL);
  return _sql;
}

// Set ALLOWED_ORIGIN di Netlify env vars (mis. https://sapa-dinkesp2kb.netlify.app).
// Fallback ke '*' kalau belum di-set supaya tidak langsung mati di dev, tapi
// SANGAT disarankan diisi di production.
const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN || '*';

export function jsonResponse(data, status = 200) {
  return {
    statusCode: status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': ALLOWED_ORIGIN,
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, PATCH, OPTIONS',
      'Vary': 'Origin',
      // WAJIB: tanpa ini, browser boleh nge-cache response API (termasuk error
      // response yg gak sengaja ke-cache, mis. dari rate-limit sesaat). Efeknya
      // browser bakal terus-terusan kirim conditional request dan puas dgn 304
      // (Not Modified) → JS dapet balik body basi selamanya walau server-nya
      // udah normal. Kejadian nyata: endpoint absensi kena ini, semua page di
      // Absenku (dashboard/absensi/laporan) macet baca body basi via 304.
      'Cache-Control': 'no-store',
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