import { getDb, jsonResponse, errorResponse } from './_db.js';
import { requireAuth } from './_auth.js';

export const handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return jsonResponse({});
  if (event.httpMethod !== 'GET') return errorResponse('Method not allowed', 405);
  const auth = requireAuth(event);
  if (!auth) return errorResponse('Unauthorized', 401);

  const sql = getDb();
  try {
    const isAdmin = !!auth.is_admin;

    // Semua query independen -> jalankan paralel (dulu berurutan = 6x round trip ke Neon).
    const [
      [{ total_klik }],
      [{ klik_hari_ini }],
      [{ total_links }],
      [{ total_users }],
      top_links,
      klik_7hari,
    ] = await Promise.all([
      isAdmin
        ? sql`SELECT COUNT(*)::INT AS total_klik FROM klik_log`
        : sql`
            SELECT COUNT(*)::INT AS total_klik
            FROM klik_log kl JOIN links l ON l.id = kl.link_id
            WHERE l.created_by = ${auth.id}
          `,

      isAdmin
        ? sql`
            SELECT COUNT(*)::INT AS klik_hari_ini
            FROM klik_log
            WHERE (clicked_at AT TIME ZONE 'Asia/Makassar')::DATE = (NOW() AT TIME ZONE 'Asia/Makassar')::DATE
          `
        : sql`
            SELECT COUNT(*)::INT AS klik_hari_ini
            FROM klik_log kl JOIN links l ON l.id = kl.link_id
            WHERE (kl.clicked_at AT TIME ZONE 'Asia/Makassar')::DATE = (NOW() AT TIME ZONE 'Asia/Makassar')::DATE
              AND l.created_by = ${auth.id}
          `,

      isAdmin
        ? sql`SELECT COUNT(*)::INT AS total_links FROM links WHERE aktif = TRUE`
        : sql`SELECT COUNT(*)::INT AS total_links FROM links WHERE aktif = TRUE AND created_by = ${auth.id}`,

      sql`SELECT COUNT(*)::INT AS total_users FROM users`,

      isAdmin
        ? sql`
            SELECT l.id, l.judul, l.url, l.ikon, l.warna_ikon, COUNT(kl.id)::INT AS total_klik
            FROM links l LEFT JOIN klik_log kl ON kl.link_id = l.id
            GROUP BY l.id ORDER BY total_klik DESC LIMIT 5
          `
        : sql`
            SELECT l.id, l.judul, l.url, l.ikon, l.warna_ikon, COUNT(kl.id)::INT AS total_klik
            FROM links l LEFT JOIN klik_log kl ON kl.link_id = l.id
            WHERE l.created_by = ${auth.id}
            GROUP BY l.id ORDER BY total_klik DESC LIMIT 5
          `,

      // Batasi scan ke 8 hari terakhir (superset dari 7 hari WITA) - dulu GROUP BY seluruh klik_log.
      isAdmin
        ? sql`
            SELECT gs::DATE::TEXT AS tanggal, COALESCE(c.jumlah, 0)::INT AS jumlah
            FROM generate_series(
              (NOW() AT TIME ZONE 'Asia/Makassar')::DATE - INTERVAL '6 days',
              (NOW() AT TIME ZONE 'Asia/Makassar')::DATE,
              INTERVAL '1 day'
            ) AS gs
            LEFT JOIN (
              SELECT (clicked_at AT TIME ZONE 'Asia/Makassar')::DATE AS tgl, COUNT(*)::INT AS jumlah
              FROM klik_log
              WHERE clicked_at >= NOW() - INTERVAL '8 days'
              GROUP BY tgl
            ) c ON c.tgl = gs::DATE
            ORDER BY gs ASC
          `
        : sql`
            SELECT gs::DATE::TEXT AS tanggal, COALESCE(c.jumlah, 0)::INT AS jumlah
            FROM generate_series(
              (NOW() AT TIME ZONE 'Asia/Makassar')::DATE - INTERVAL '6 days',
              (NOW() AT TIME ZONE 'Asia/Makassar')::DATE,
              INTERVAL '1 day'
            ) AS gs
            LEFT JOIN (
              SELECT (kl.clicked_at AT TIME ZONE 'Asia/Makassar')::DATE AS tgl, COUNT(*)::INT AS jumlah
              FROM klik_log kl JOIN links l ON l.id = kl.link_id
              WHERE l.created_by = ${auth.id}
                AND kl.clicked_at >= NOW() - INTERVAL '8 days'
              GROUP BY tgl
            ) c ON c.tgl = gs::DATE
            ORDER BY gs ASC
          `,
    ]);

    return jsonResponse({ total_klik, klik_hari_ini, total_links, total_users, top_links, klik_7hari });
  } catch (err) {
    console.error(err);
    return errorResponse('Gagal mengambil statistik');
  }
};