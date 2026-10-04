import { getDb, jsonResponse } from './_db.js';
import { requireAdmin } from './_auth.js';
import { jalankanHealth, telegramAktif } from './_monitoring.js';

// GET /api/health          -> publik, ringan (hanya cek database). Cocok buat UptimeRobot dsb.
//                             HTTP 200 kalau hidup, 503 kalau database mati.
// GET /api/health?detail=1 -> khusus admin (Bearer token): database, Cloudinary, cron absensi.
export const handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return jsonResponse({});
  if (event.httpMethod !== 'GET') return jsonResponse({ error: 'Method not allowed' }, 405);

  const sql = getDb();
  const detail = (event.queryStringParameters || {}).detail;

  if (detail) {
    if (!requireAdmin(event)) return jsonResponse({ error: 'Unauthorized' }, 401);
    const h = await jalankanHealth(sql, { penuh: true });
    return jsonResponse({ ...h, waktu: new Date().toISOString(), notifikasi: { telegram: telegramAktif() } });
  }

  const h = await jalankanHealth(sql, { penuh: false });
  return jsonResponse({ status: h.status, waktu: new Date().toISOString() }, h.status === 'down' ? 503 : 200);
};
