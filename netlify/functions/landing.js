// netlify/functions/landing.js
// Endpoint publik untuk landing page SAPA - tanpa autentikasi
//
// GET /api/landing/shortlinks  → daftar shortlink aktif (yang punya slug_pendek)
// GET /api/landing/bundles     → daftar bundle aktif + jumlah item
// GET /api/landing/info        → daftar pengumuman/info publik aktif
// GET /api/landing/stats       → count ringan (pengumuman, dokumen, pegawai) buat stat-bar

import { getDb, jsonResponse, errorResponse } from './_db.js';

export const handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return jsonResponse({});
  if (event.httpMethod !== 'GET') return errorResponse('Method not allowed', 405);

  const sql = getDb();

  // ── Robust path parsing: works on local dev (:8888) & production ──
  // event.path bisa:
  //   /api/landing/shortlinks              (via netlify.toml redirect lokal)
  //   /.netlify/functions/landing/shortlinks (direct function call)
  //   /.netlify/functions/landing          (tanpa sub-path)
  const rawPath = event.path || '';
  const sub = rawPath
    .replace(/^.*\/landing\/?/, '')   // hapus semua prefix sampai /landing/
    .replace(/\/$/, '')
    .trim();

  try {

    // ── GET /api/landing/shortlinks ───────────────────────────
    if (sub === 'shortlinks') {
      const rows = await sql`
        SELECT
          id,
          judul,
          url,
          slug_pendek  AS slug,
          ikon,
          deskripsi,
          COALESCE((SELECT COUNT(*) FROM klik_log kl WHERE kl.link_id = links.id), 0)::INT AS total_klik
        FROM links
        WHERE aktif = true
          AND slug_pendek IS NOT NULL
          AND slug_pendek <> ''
        ORDER BY judul ASC
      `;
      return jsonResponse({ items: rows });
    }

    // ── GET /api/landing/bundles ──────────────────────────────
    if (sub === 'bundles') {
      const rows = await sql`
        SELECT
          b.id,
          b.judul,
          b.slug,
          b.deskripsi,
          COUNT(bi.id)::int AS jumlah_item
        FROM bundles b
        LEFT JOIN bundle_items bi ON bi.bundle_id = b.id
        WHERE b.aktif = true
        GROUP BY b.id, b.judul, b.slug, b.deskripsi
        ORDER BY b.judul ASC
      `;
      return jsonResponse({ items: rows });
    }

    // ── GET /api/landing/info ─────────────────────────────────
    if (sub === 'info') {
      let rows = [];
      try {
        rows = await sql`
          SELECT
            id,
            judul,
            isi,
            tipe,
            aksi,
            created_at
          FROM pengumuman
          WHERE aktif = true
            AND deleted_at IS NULL
          ORDER BY created_at DESC
          LIMIT 10
        `;
      } catch (e) {
        console.warn('[landing.js] tabel pengumuman belum ada, skip:', e.message);
        rows = [];
      }
      return jsonResponse({ items: rows });
    }

    // ── GET /api/landing/pegawai ──────────────────────────────
    if (sub === 'pegawai') {
      const rows = await sql`
        SELECT id, nama, jabatan, golongan, foto_url, urutan, parent_id
        FROM pegawai
        WHERE aktif = true
        ORDER BY urutan ASC NULLS LAST, nama ASC
      `;
      return jsonResponse({ pegawai: rows });
    }

    // ── GET /api/landing/dokumen ──────────────────────────────
    if (sub === 'dokumen') {
      const rows = await sql`
        SELECT id, judul, keterangan, kategori, file_url, created_at
        FROM dokumen_publik
        WHERE aktif = true
          AND deleted_at IS NULL
        ORDER BY created_at DESC
      `;
      return jsonResponse({ dokumen: rows });
    }

    // ── GET /api/landing/stats ────────────────────────────────
    // Endpoint ringan khusus buat stat-bar: cuma COUNT, gak narik full rows.
    // Satu round-trip ke Neon, bukan 3 request terpisah yang nunggu full list.
    if (sub === 'stats') {
      // 3 query independen - dulu di-await berurutan (3x round-trip ke Neon),
      // sekarang paralel. pengumuman punya fallback sendiri (tabelnya opsional).
      const [pengumumanRes, dokumenRes, pegawaiRes] = await Promise.allSettled([
        sql`
          SELECT COUNT(*)::INT AS c
          FROM pengumuman
          WHERE aktif = true AND deleted_at IS NULL
        `,
        sql`
          SELECT COUNT(*)::INT AS c
          FROM dokumen_publik
          WHERE aktif = true AND deleted_at IS NULL
        `,
        // Replikasi skipPattern frontend: /kepala dinas|sekretaris dinas|sekdis/i
        sql`
          SELECT COUNT(*)::INT AS c
          FROM pegawai
          WHERE aktif = true
            AND jabatan !~* 'kepala dinas|sekretaris dinas|sekdis'
        `,
      ]);

      let pengumuman = 0;
      if (pengumumanRes.status === 'fulfilled') {
        pengumuman = pengumumanRes.value[0].c;
      } else {
        console.warn('[landing.js] stats: tabel pengumuman belum ada, skip:', pengumumanRes.reason?.message);
      }

      if (dokumenRes.status === 'rejected') throw dokumenRes.reason;
      if (pegawaiRes.status === 'rejected') throw pegawaiRes.reason;
      const dokumen = dokumenRes.value[0].c;
      const pegawai = pegawaiRes.value[0].c;

      // Endpoint publik non-sensitif (cuma angka count) - boleh di-cache
      // singkat di edge/CDN Netlify. Ini nolongin kasus cold-start Neon:
      // visitor pertama nunggu koneksi DB "bangun", visitor2 dalam 60 detik
      // berikutnya langsung dapat response dari cache tanpa nunggu DB sama sekali.
      return jsonResponse({ pengumuman, dokumen, pegawai }, 200, {
        'Cache-Control': 'public, max-age=60, stale-while-revalidate=300',
      });
    }

    // ── GET /api/landing/profil ───────────────────────────────
    if (sub === 'profil') {
      const rows = await sql`
        SELECT visi, tugas_fungsi, alamat, telepon, email, instagram, maps_embed, lat, lng
        FROM profil_instansi
        WHERE id = 1
        LIMIT 1
      `;
      return jsonResponse(rows[0] || {});
    }

    // ── GET /api/landing/tema-aktif ───────────────────────────
    // Endpoint publik (tanpa auth) buat cek tema musiman yang lagi aktif
    // hari ini (mis. Ramadhan, HUT RI). Dipakai di landing.html (sebelum
    // login) maupun app.html (setelah login) lewat theme-engine.js.
    // Tema disimpan admin di tabel `settings` (key='tema_musiman', value
    // berupa JSON array) lewat /api/settings (settings.js, admin only).
    if (sub === 'tema-aktif') {
      let rows = [];
      try {
        rows = await sql`SELECT value FROM settings WHERE key = 'tema_musiman' LIMIT 1`;
      } catch (e) {
        // Tabel settings belum ada / query gagal → anggap gak ada tema aktif,
        // jangan sampai landing page ikut error gara-gara fitur opsional ini.
        console.warn('[landing.js] tema-aktif: gagal query settings, skip:', e.message);
        return jsonResponse({ theme: null });
      }

      if (!rows.length) return jsonResponse({ theme: null }, 200, { 'Cache-Control': 'public, max-age=60' });

      let list = [];
      try {
        const raw = rows[0].value;
        list = typeof raw === 'string' ? JSON.parse(raw) : (raw || []);
        if (!Array.isArray(list)) list = [];
      } catch { list = []; }

      // Tanggal hari ini dalam WITA (zona kerja Kab. Banggai Laut), format
      // YYYY-MM-DD supaya bisa dibanding string langsung dengan tanggal_mulai/selesai.
      const todayStr = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Makassar' });

      const active = list.find(t =>
        t && t.aktif !== false &&
        t.tanggal_mulai && t.tanggal_selesai &&
        todayStr >= t.tanggal_mulai && todayStr <= t.tanggal_selesai
      ) || null;

      // Cuma expose field yang perlu ditampilkan publik, bukan seluruh objek.
      const theme = active ? {
        id: active.id,
        nama: active.nama || '',
        gambar_url: active.gambar_url || null,
        posisi: active.posisi || 'pill-atas',
        efek: active.efek || 'none',
        partikel: active.partikel || 'none',
        partikel_densitas: active.partikel_densitas || 'sedang',
      } : null;

      return jsonResponse({ theme }, 200, { 'Cache-Control': 'public, max-age=60' });
    }

    // ── Sub-path tidak dikenal ────────────────────────────────
    return errorResponse('Not found', 404);

  } catch (err) {
    console.error('[landing.js]', err);
    return errorResponse('Server error', 500);
  }
};