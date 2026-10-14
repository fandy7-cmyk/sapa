// API notifikasi user (lonceng "Notifikasi"). Dipanggil lewat /api/notifikasi/* (rule /api/* di netlify.toml).
//   GET  /api/notifikasi/saya         daftar notifikasi aktif milik user login, jumlah belum dibaca, dan modul yang dimute
//   GET  /api/notifikasi/ringkasan    hanya jumlah belum dibaca (ringan, untuk polling)
//   POST /api/notifikasi/:id/baca     tandai satu notifikasi dibaca
//   POST /api/notifikasi/baca-semua   tandai semua notifikasi yang tampil dibaca
//   PUT  /api/notifikasi/preferensi   { modul, nonaktif } nonaktifkan / aktifkan notifikasi satu modul
// Pembuatan notifikasi hanya dari backend (endpoint modul dan notif-cron.js), tidak ada endpoint tulis notifikasi untuk klien.
// Modul yang dimute menyembunyikan notifikasinya, KECUALI yang berprioritas 'peringatan' (tetap tampil dan tetap dihitung).
// Notifikasinya sendiri tetap tersimpan, jadi mengaktifkan lagi modulnya memunculkan kembali yang masih berlaku.
import { getDb, jsonResponse, errorResponse, parseBody } from './_db.js';
import { requireAuth } from './_auth.js';
import { ensureNotifSchema, MODUL_NOTIF } from './_notif.js';

const LIMIT_DAFTAR = 100;

export const handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return jsonResponse({});

  const auth = requireAuth(event);
  if (!auth) return errorResponse('Unauthorized', 401);

  const sql = getDb();
  try { await ensureNotifSchema(sql); } catch (e) { return errorResponse('Gagal menyiapkan skema notifikasi: ' + e.message); }

  const rawPath = event.path.replace(/.*\/notifikasi/, '') || '/';
  const seg = rawPath.split('/').filter(Boolean);
  const first = seg[0] || null;
  const id = first && !isNaN(first) ? parseInt(first, 10) : null;

  try {
    if (event.httpMethod === 'GET' && first === 'saya') {
      const [rows, [hit], dimute] = await Promise.all([
        sql`
          SELECT n.id, n.modul, n.jenis, n.tingkat, n.prioritas, n.judul, n.isi, n.tautan, n.diperbarui_at, n.dibaca_at
          FROM notifikasi n
          WHERE n.user_id = ${auth.id} AND n.selesai_at IS NULL
            AND NOT (n.prioritas <> 'peringatan' AND EXISTS (
              SELECT 1 FROM notifikasi_preferensi p WHERE p.user_id = n.user_id AND p.modul = n.modul AND p.nonaktif))
          ORDER BY (n.dibaca_at IS NULL) DESC,
                   CASE n.prioritas WHEN 'peringatan' THEN 0 WHEN 'penting' THEN 1 ELSE 2 END,
                   n.diperbarui_at DESC
          LIMIT ${LIMIT_DAFTAR}`,
        sql`
          SELECT COUNT(*)::int AS n FROM notifikasi n
          WHERE n.user_id = ${auth.id} AND n.selesai_at IS NULL AND n.dibaca_at IS NULL
            AND NOT (n.prioritas <> 'peringatan' AND EXISTS (
              SELECT 1 FROM notifikasi_preferensi p WHERE p.user_id = n.user_id AND p.modul = n.modul AND p.nonaktif))`,
        sql`SELECT modul FROM notifikasi_preferensi WHERE user_id = ${auth.id} AND nonaktif ORDER BY modul`,
      ]);
      return jsonResponse({ notifikasi: rows, belum_dibaca: hit.n, dimute: dimute.map((r) => r.modul) });
    }

    if (event.httpMethod === 'GET' && first === 'ringkasan') {
      const [hit] = await sql`
        SELECT COUNT(*)::int AS n FROM notifikasi n
        WHERE n.user_id = ${auth.id} AND n.selesai_at IS NULL AND n.dibaca_at IS NULL
          AND NOT (n.prioritas <> 'peringatan' AND EXISTS (
            SELECT 1 FROM notifikasi_preferensi p WHERE p.user_id = n.user_id AND p.modul = n.modul AND p.nonaktif))`;
      return jsonResponse({ belum_dibaca: hit.n });
    }

    if (event.httpMethod === 'POST' && first === 'baca-semua') {
      const r = await sql`
        UPDATE notifikasi n SET dibaca_at = NOW()
        WHERE n.user_id = ${auth.id} AND n.selesai_at IS NULL AND n.dibaca_at IS NULL
          AND NOT (n.prioritas <> 'peringatan' AND EXISTS (
            SELECT 1 FROM notifikasi_preferensi p WHERE p.user_id = n.user_id AND p.modul = n.modul AND p.nonaktif))
        RETURNING n.id`;
      return jsonResponse({ ok: true, diubah: r.length });
    }

    if (event.httpMethod === 'POST' && id && seg[1] === 'baca') {
      const r = await sql`
        UPDATE notifikasi SET dibaca_at = COALESCE(dibaca_at, NOW())
        WHERE id = ${id} AND user_id = ${auth.id}
        RETURNING id`;
      if (!r.length) return errorResponse('Notifikasi tidak ditemukan', 404);
      return jsonResponse({ ok: true });
    }

    if (event.httpMethod === 'PUT' && first === 'preferensi') {
      const { modul, nonaktif } = parseBody(event);
      if (!MODUL_NOTIF.includes(modul) || typeof nonaktif !== 'boolean') return errorResponse('Data tidak valid', 400);
      if (nonaktif) {
        await sql`
          INSERT INTO notifikasi_preferensi (user_id, modul, nonaktif) VALUES (${auth.id}, ${modul}, TRUE)
          ON CONFLICT (user_id, modul) DO UPDATE SET nonaktif = TRUE, diperbarui_at = NOW()`;
      } else {
        await sql`DELETE FROM notifikasi_preferensi WHERE user_id = ${auth.id} AND modul = ${modul}`;
      }
      const dimute = await sql`SELECT modul FROM notifikasi_preferensi WHERE user_id = ${auth.id} AND nonaktif ORDER BY modul`;
      return jsonResponse({ ok: true, dimute: dimute.map((r) => r.modul) });
    }

    return errorResponse('Not found', 404);
  } catch (err) {
    console.error('[notifikasi]', err);
    return errorResponse('Gagal memproses notifikasi: ' + err.message);
  }
};
