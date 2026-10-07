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
            GROUP BY l.id ORDER BY total_klik DESC LIMIT 25
          `
        : sql`
            SELECT l.id, l.judul, l.url, l.ikon, l.warna_ikon, COUNT(kl.id)::INT AS total_klik
            FROM links l LEFT JOIN klik_log kl ON kl.link_id = l.id
            WHERE l.created_by = ${auth.id}
            GROUP BY l.id ORDER BY total_klik DESC LIMIT 25
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

    // Data tambahan buat dashboard Superlink (tren 30 hari, jam ramai, perangkat, sumber).
    // Dipisah try/catch supaya kalau salah satu gagal, statistik dasar tetap kebaca.
    const ex = {};
    const adm = isAdmin;
    const uid = auth.id;
    const jalan = async (kunci, fn) => { try { ex[kunci] = await fn(); } catch (e) { console.error('[stats extra ' + kunci + ']', e.message); ex[kunci] = null; } };
    await Promise.all([
      jalan('klik_30hari', () => sql`
        SELECT gs::DATE::TEXT AS tanggal, COALESCE(c.jumlah, 0)::INT AS jumlah
        FROM generate_series(
          (NOW() AT TIME ZONE 'Asia/Makassar')::DATE - INTERVAL '29 days',
          (NOW() AT TIME ZONE 'Asia/Makassar')::DATE, INTERVAL '1 day') AS gs
        LEFT JOIN (
          SELECT (kl.clicked_at AT TIME ZONE 'Asia/Makassar')::DATE AS tgl, COUNT(*)::INT AS jumlah
          FROM klik_log kl JOIN links l ON l.id = kl.link_id
          WHERE kl.clicked_at >= NOW() - INTERVAL '31 days' AND (${adm} = TRUE OR l.created_by = ${uid})
          GROUP BY tgl
        ) c ON c.tgl = gs::DATE
        ORDER BY gs ASC`),
      jalan('klik_per_jam', () => sql`
        SELECT EXTRACT(HOUR FROM (kl.clicked_at AT TIME ZONE 'Asia/Makassar'))::INT AS jam, COUNT(*)::INT AS jumlah
        FROM klik_log kl JOIN links l ON l.id = kl.link_id
        WHERE kl.clicked_at >= NOW() - INTERVAL '30 days' AND (${adm} = TRUE OR l.created_by = ${uid})
        GROUP BY jam ORDER BY jam`),
      jalan('perangkat', () => sql`
        SELECT CASE
                 WHEN kl.user_agent ~* 'ipad|tablet' THEN 'Tablet'
                 WHEN kl.user_agent ~* 'mobi|android|iphone' THEN 'Ponsel'
                 WHEN COALESCE(kl.user_agent, '') = '' THEN 'Tidak diketahui'
                 ELSE 'Desktop' END AS jenis,
               COUNT(*)::INT AS jumlah
        FROM klik_log kl JOIN links l ON l.id = kl.link_id
        WHERE (${adm} = TRUE OR l.created_by = ${uid})
        GROUP BY jenis ORDER BY jumlah DESC`),
      jalan('via_qr', () => sql`
        SELECT COALESCE(kl.via_qr, FALSE) AS via_qr, COUNT(*)::INT AS jumlah
        FROM klik_log kl JOIN links l ON l.id = kl.link_id
        WHERE (${adm} = TRUE OR l.created_by = ${uid})
        GROUP BY 1`),
      jalan('top_referer', () => sql`
        SELECT COALESCE(NULLIF(substring(kl.referer from '://([^/]+)'), ''), 'Langsung / tidak ada') AS sumber, COUNT(*)::INT AS jumlah
        FROM klik_log kl JOIN links l ON l.id = kl.link_id
        WHERE (${adm} = TRUE OR l.created_by = ${uid})
        GROUP BY 1 ORDER BY jumlah DESC LIMIT 20`),
      jalan('klik_minggu_lalu', () => sql`
        SELECT COUNT(*)::INT AS jumlah
        FROM klik_log kl JOIN links l ON l.id = kl.link_id
        WHERE kl.clicked_at >= NOW() - INTERVAL '14 days' AND kl.clicked_at < NOW() - INTERVAL '7 days'
          AND (${adm} = TRUE OR l.created_by = ${uid})`),
    ]);

    return jsonResponse({
      total_klik, klik_hari_ini, total_links, total_users, top_links, klik_7hari,
      klik_30hari: ex.klik_30hari || [],
      klik_per_jam: ex.klik_per_jam || [],
      perangkat: ex.perangkat || [],
      via_qr: ex.via_qr || [],
      top_referer: ex.top_referer || [],
      klik_minggu_lalu: ex.klik_minggu_lalu ? ex.klik_minggu_lalu[0].jumlah : null,
    });
  } catch (err) {
    console.error(err);
    return errorResponse('Gagal mengambil statistik');
  }
};