import { getDb, jsonResponse, errorResponse, parseBody } from './_db.js';
import { requireAuth } from './_auth.js';
import { logAudit } from './_audit.js';
import { cleanupReplacedFile } from './_cloudinary.js';
import {
  ensurePerjadinSchema, buildPerjadin, insertPerjadin, updatePerjadin, backfillPerjadinDariAbsensi,
  JENIS_PERJADIN, STATUS_VERIFIKASI, SKPD_DEFAULT,
} from './_perjadin.js';

// Hak akses Perjadin (diatur admin di menu Hak Akses, sama seperti Absensi/Surat):
//  - admin, atau permission 'perjadin.full' (Admin Penuh): lihat semua data, input, edit, hapus & verifikasi.
//  - permission 'perjadin' (dasar): hanya melihat data perjalanan dinas milik sendiri (read-only).
// Data perjalanan dinas user biasa tetap masuk lewat form di menu Absensi (POST /api/absensi/pengajuan).
async function getAccess(sql, auth) {
  if (auth.is_admin) return { full: true, base: true };
  const rows = await sql`
    SELECT menu_key FROM user_permissions
    WHERE user_id = ${auth.id} AND menu_key IN ('perjadin', 'perjadin.full')
  `;
  const keys = rows.map((r) => r.menu_key);
  const full = keys.includes('perjadin.full');
  return { full, base: full || keys.includes('perjadin') };
}

const _int = (v) => { const n = parseInt(v); return Number.isInteger(n) ? n : null; };
const _txt = (v) => { const s = (v ?? '').toString().trim(); return s || null; };

export const handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return jsonResponse({});

  const auth = requireAuth(event);
  if (!auth) return errorResponse('Unauthorized', 401);

  const sql = getDb();
  const rawPath = event.path.replace(/.*\/perjadin/, '') || '/';
  const segments = rawPath.split('/').filter(Boolean);
  const isPelaksana = segments[0] === 'pelaksana';
  const isSumberDana = segments[0] === 'sumberdana';
  const id = segments[0] && !isNaN(segments[0]) ? parseInt(segments[0]) : null;
  const action = id ? segments[1] : null;

  let access;
  try {
    access = await getAccess(sql, auth);
    if (!access.base) return errorResponse('Unauthorized', 401);
    await ensurePerjadinSchema(sql);
    await backfillPerjadinDariAbsensi(sql);
  } catch (err) {
    console.error('[perjadin:init]', err);
    return errorResponse('Gagal menyiapkan data perjalanan dinas');
  }

  // Akses dasar: hanya baca data milik sendiri (daftar, opsi filter, satu data). Selebihnya khusus Admin Penuh.
  if (!access.full && !(event.httpMethod === 'GET' && !isPelaksana && !isSumberDana)) return errorResponse('Unauthorized', 401);
  const ownerId = access.full ? null : _int(auth.id);

  const audit = (aksi, entitas_id, detail) => logAudit(sql, event, {
    user_id: auth.id, nama: auth.nama, email: auth.email, aksi, entitas: 'perjadin', entitas_id, detail,
  });

  // ── Daftar pegawai (untuk dropdown Pelaksana + auto-isi NIP) ──
  if (isPelaksana && event.httpMethod === 'GET') {
    try {
      const rows = await sql`
        SELECT u.id, u.nama, u.nip, b.nama AS sub_unit
        FROM users u
        LEFT JOIN bidang b ON b.id = u.bidang_id
        WHERE u.is_active IS NOT FALSE
        ORDER BY u.nama ASC
      `;
      return jsonResponse({ pelaksana: rows, skpd_default: SKPD_DEFAULT });
    } catch (err) {
      console.error('[GET /api/perjadin/pelaksana]', err);
      return errorResponse('Gagal mengambil daftar pegawai');
    }
  }

  // ── Master Sumber Dana (tabel yang sama dengan master Sumber Dana e-Planning) → dropdown Sumber Dana ──
  // Dibaca langsung dari tabel, supaya admin Perjadin tidak perlu punya akses modul e-Planning.
  if (isSumberDana && event.httpMethod === 'GET') {
    try {
      const rows = await sql`SELECT id, nama, kode FROM eplanning_sumberdana WHERE aktif IS NOT FALSE ORDER BY nama ASC`;
      return jsonResponse({
        sumberdana: rows.map((r) => ({ id: r.id, nama: r.nama, kode: r.kode || null, label: r.kode ? `${r.kode} - ${r.nama}` : r.nama })),
      });
    } catch (err) {
      console.error('[GET /api/perjadin/sumberdana]', err);
      return jsonResponse({ sumberdana: [] });   // tabel e-Planning belum ada / belum diinisialisasi
    }
  }

  // ── Opsi dropdown filter: hanya nilai yang benar-benar ada di data ──
  // tahun: semua tahun yang punya data; bulan: bulan yang punya data pada tahun terpilih;
  // jenis & status: yang ada pada tahun/bulan terpilih.
  if (segments[0] === 'opsi' && event.httpMethod === 'GET') {
    const qs = event.queryStringParameters || {};
    const tahun = _int(qs.tahun);
    const bulan = _int(qs.bulan);
    const uid = ownerId;
    try {
      const th = await sql`
        SELECT DISTINCT EXTRACT(YEAR FROM tgl_mulai)::int AS v FROM perjadin
        WHERE tgl_mulai IS NOT NULL AND (${uid}::int IS NULL OR user_id = ${uid}::int) ORDER BY v DESC
      `;
      const bl = await sql`
        SELECT DISTINCT EXTRACT(MONTH FROM tgl_mulai)::int AS v FROM perjadin
        WHERE tgl_mulai IS NOT NULL AND (${uid}::int IS NULL OR user_id = ${uid}::int)
          AND (${tahun}::int IS NULL OR EXTRACT(YEAR FROM tgl_mulai) = ${tahun}::int)
        ORDER BY v ASC
      `;
      const jn = await sql`
        SELECT DISTINCT jenis_perjadin AS v FROM perjadin
        WHERE jenis_perjadin IS NOT NULL AND jenis_perjadin <> ''
          AND (${uid}::int IS NULL OR user_id = ${uid}::int)
          AND (${tahun}::int IS NULL OR EXTRACT(YEAR FROM tgl_mulai) = ${tahun}::int)
          AND (${bulan}::int IS NULL OR EXTRACT(MONTH FROM tgl_mulai) = ${bulan}::int)
      `;
      const st = await sql`
        SELECT DISTINCT status_verifikasi AS v FROM perjadin
        WHERE status_verifikasi IS NOT NULL
          AND (${uid}::int IS NULL OR user_id = ${uid}::int)
          AND (${tahun}::int IS NULL OR EXTRACT(YEAR FROM tgl_mulai) = ${tahun}::int)
          AND (${bulan}::int IS NULL OR EXTRACT(MONTH FROM tgl_mulai) = ${bulan}::int)
      `;
      return jsonResponse({
        tahun: th.map((r) => r.v), bulan: bl.map((r) => r.v),
        jenis: jn.map((r) => r.v), status: st.map((r) => r.v),
      });
    } catch (err) {
      console.error('[GET /api/perjadin/opsi]', err);
      return errorResponse('Gagal mengambil opsi filter');
    }
  }

  // ── Dashboard (ringkasan agregat; akses dasar hanya melihat data milik sendiri) ──
  if (segments[0] === 'dashboard' && event.httpMethod === 'GET') {
    const uid = ownerId;
    try {
      const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Makassar' });   // YYYY-MM-DD
      const [ty, tm] = today.split('-').map(Number);
      const ym = today.slice(0, 7);
      const d6 = new Date(Date.UTC(ty, tm - 1 - 5, 1));
      const start6 = `${d6.getUTCFullYear()}-${String(d6.getUTCMonth() + 1).padStart(2, '0')}-01`;

      const tot = await sql`
        SELECT COUNT(*)::int AS total,
               COALESCE(SUM(jumlah_biaya), 0)::float8 AS total_biaya,
               COALESCE(SUM(jumlah_hari), 0)::int AS total_hari,
               COUNT(*) FILTER (WHERE status_verifikasi = 'menunggu')::int AS menunggu,
               COUNT(*) FILTER (WHERE status_verifikasi = 'terverifikasi')::int AS terverifikasi,
               COUNT(*) FILTER (WHERE jenis_perjadin IS NULL)::int AS belum_lengkap,
               COUNT(DISTINCT COALESCE(user_id::text, pelaksana_nama))::int AS pegawai,
               COUNT(*) FILTER (WHERE EXTRACT(YEAR FROM tgl_mulai) = ${ty}::int)::int AS tahun_ini,
               COALESCE(SUM(jumlah_biaya) FILTER (WHERE EXTRACT(YEAR FROM tgl_mulai) = ${ty}::int), 0)::float8 AS biaya_tahun_ini,
               COUNT(*) FILTER (WHERE to_char(tgl_mulai, 'YYYY-MM') = ${ym}::text)::int AS bulan_ini,
               COALESCE(SUM(jumlah_biaya) FILTER (WHERE to_char(tgl_mulai, 'YYYY-MM') = ${ym}::text), 0)::float8 AS biaya_bulan_ini,
               COUNT(*) FILTER (WHERE tgl_mulai <= ${today}::date AND tgl_selesai >= ${today}::date)::int AS sedang_berjalan,
               COUNT(*) FILTER (WHERE tgl_mulai > ${today}::date)::int AS akan_datang,
               COALESCE(SUM(jumlah_transport), 0)::float8 AS transport,
               COALESCE(SUM(jumlah_taksi), 0)::float8 AS taksi,
               COALESCE(SUM((detail->>'uang_harian_rp')::numeric), 0)::float8 AS uang_harian,
               COALESCE(SUM((detail->>'uang_representasi_rp')::numeric), 0)::float8 AS uang_representasi,
               COALESCE(SUM(COALESCE((detail->>'penginapan_rp')::numeric, 0) + COALESCE((detail->>'penginapan_30_rp')::numeric, 0)), 0)::float8 AS penginapan,
               COALESCE(SUM((detail->>'lain_rp')::numeric), 0)::float8 AS lain
        FROM perjadin
        WHERE status_verifikasi <> 'ditolak' AND (${uid}::int IS NULL OR user_id = ${uid}::int)
      `;
      const bulan = await sql`
        SELECT to_char(tgl_mulai, 'YYYY-MM') AS ym, COUNT(*)::int AS jumlah,
               COALESCE(SUM(jumlah_biaya), 0)::float8 AS biaya, COALESCE(SUM(jumlah_hari), 0)::int AS hari
        FROM perjadin
        WHERE status_verifikasi <> 'ditolak' AND (${uid}::int IS NULL OR user_id = ${uid}::int)
          AND tgl_mulai >= ${start6}::date
        GROUP BY 1 ORDER BY 1
      `;
      const jenis = await sql`
        SELECT COALESCE(jenis_perjadin, '') AS jenis, COUNT(*)::int AS jumlah,
               COALESCE(SUM(jumlah_biaya), 0)::float8 AS biaya
        FROM perjadin
        WHERE status_verifikasi <> 'ditolak' AND (${uid}::int IS NULL OR user_id = ${uid}::int)
        GROUP BY 1 ORDER BY jumlah DESC
      `;
      const tujuan = await sql`
        SELECT kota_tujuan AS nama, COUNT(*)::int AS jumlah, COALESCE(SUM(jumlah_biaya), 0)::float8 AS biaya
        FROM perjadin
        WHERE status_verifikasi <> 'ditolak' AND (${uid}::int IS NULL OR user_id = ${uid}::int)
          AND kota_tujuan IS NOT NULL AND kota_tujuan <> ''
        GROUP BY 1 ORDER BY jumlah DESC, biaya DESC LIMIT 8
      `;
      const pelaksana = access.full ? await sql`
        SELECT pelaksana_nama AS nama, COUNT(*)::int AS jumlah, COALESCE(SUM(jumlah_hari), 0)::int AS hari,
               COALESCE(SUM(jumlah_biaya), 0)::float8 AS biaya
        FROM perjadin
        WHERE status_verifikasi <> 'ditolak'
        GROUP BY 1 ORDER BY jumlah DESC, hari DESC LIMIT 8
      ` : [];
      const terbaru = await sql`
        SELECT id, pelaksana_nama, rincian_kegiatan, kota_tujuan, status_verifikasi, jenis_perjadin,
               tgl_mulai::text AS tgl_mulai, tgl_selesai::text AS tgl_selesai, jumlah_biaya::float8 AS jumlah_biaya
        FROM perjadin
        WHERE status_verifikasi <> 'ditolak' AND (${uid}::int IS NULL OR user_id = ${uid}::int)
        ORDER BY tgl_mulai DESC, id DESC LIMIT 20
      `;
      return jsonResponse({ today, ringkas: tot[0] || {}, bulan, jenis, tujuan, pelaksana, terbaru, full: access.full });
    } catch (err) {
      console.error('[GET /api/perjadin/dashboard]', err);
      return errorResponse('Gagal mengambil data dashboard perjalanan dinas');
    }
  }

  // ── Laporan (semua baris sesuai filter, tanpa paginasi — dipakai tabel laporan & cetak PDF) ──
  if (segments[0] === 'laporan' && event.httpMethod === 'GET') {
    const qs = event.queryStringParameters || {};
    const tahun = _int(qs.tahun);
    const bulan = _int(qs.bulan);
    const jenis = JENIS_PERJADIN.includes(qs.jenis) ? qs.jenis : null;
    const status = STATUS_VERIFIKASI.includes(qs.status) ? qs.status : null;
    // Dipertanggungjawabkan = ada rincian anggaran (detail) atau No./Tgl SP2D (sama dengan _pjAdaAnggaran di frontend).
    const pjf = ['ya', 'tidak'].includes(qs.pj) ? qs.pj : null;
    const userId = access.full ? _int(qs.user_id) : ownerId;
    try {
      const rows = await sql`
        SELECT pj.*, pj.tgl_mulai::text AS tgl_mulai, pj.tgl_selesai::text AS tgl_selesai,
               pj.tgl_sp2d::text AS tgl_sp2d, pj.tgl_surat_tugas::text AS tgl_surat_tugas,
               pj.jumlah_transport::float8 AS jumlah_transport, pj.jumlah_taksi::float8 AS jumlah_taksi,
               pj.jumlah_biaya::float8 AS jumlah_biaya
        FROM perjadin pj
        WHERE (${tahun}::int IS NULL OR EXTRACT(YEAR FROM pj.tgl_mulai) = ${tahun}::int)
          AND (${bulan}::int IS NULL OR EXTRACT(MONTH FROM pj.tgl_mulai) = ${bulan}::int)
          AND (${jenis}::text IS NULL OR pj.jenis_perjadin = ${jenis}::text)
          AND (${userId}::int IS NULL OR pj.user_id = ${userId}::int)
          AND (${pjf}::text IS NULL OR (
                (COALESCE(pj.detail, '{}'::jsonb) <> '{}'::jsonb OR COALESCE(pj.no_sp2d, '') <> '' OR pj.tgl_sp2d IS NOT NULL OR COALESCE(pj.sumber_dana, '') <> '')
                = (${pjf}::text = 'ya')))
          AND ((${status}::text IS NULL AND pj.status_verifikasi <> 'ditolak') OR pj.status_verifikasi = ${status}::text)
        ORDER BY pj.tgl_mulai ASC, pj.id ASC
        LIMIT 3000
      `;
      return jsonResponse({ perjadin: rows, full: access.full });
    } catch (err) {
      console.error('[GET /api/perjadin/laporan]', err);
      return errorResponse('Gagal mengambil data laporan perjalanan dinas');
    }
  }

  // ── Daftar / rekap ──
  if (event.httpMethod === 'GET' && !id) {
    const qs = event.queryStringParameters || {};
    const tahun = _int(qs.tahun);
    const bulan = _int(qs.bulan);
    const jenis = JENIS_PERJADIN.includes(qs.jenis) ? qs.jenis : null;
    const status = STATUS_VERIFIKASI.includes(qs.status) ? qs.status : null;
    const userId = access.full ? _int(qs.user_id) : ownerId;
    const qRaw = _txt(qs.q);
    const q = qRaw ? `%${qRaw.replace(/[\\%_]/g, '\\$&')}%` : null;
    const limit = Math.min(Math.max(_int(qs.limit) || 20, 1), 100);
    const page = Math.max(_int(qs.page) || 1, 1);
    const offset = (page - 1) * limit;

    try {
      // Baris "ditolak" (mis. dari pengajuan Tugas Luar yang ditolak) disembunyikan kecuali difilter eksplisit.
      const rows = await sql`
        SELECT pj.*, pj.tgl_mulai::text AS tgl_mulai, pj.tgl_selesai::text AS tgl_selesai,
               pj.tgl_sp2d::text AS tgl_sp2d, pj.tgl_surat_tugas::text AS tgl_surat_tugas,
               pj.jumlah_transport::float8 AS jumlah_transport, pj.jumlah_taksi::float8 AS jumlah_taksi,
               pj.jumlah_biaya::float8 AS jumlah_biaya,
               ap.status_persetujuan AS pengajuan_status
        FROM perjadin pj
        LEFT JOIN absensi_pengajuan ap ON ap.id = pj.pengajuan_id
        WHERE (${tahun}::int IS NULL OR EXTRACT(YEAR FROM pj.tgl_mulai) = ${tahun}::int)
          AND (${bulan}::int IS NULL OR EXTRACT(MONTH FROM pj.tgl_mulai) = ${bulan}::int)
          AND (${jenis}::text IS NULL OR pj.jenis_perjadin = ${jenis}::text)
          AND (${userId}::int IS NULL OR pj.user_id = ${userId}::int)
          AND ((${status}::text IS NULL AND pj.status_verifikasi <> 'ditolak') OR pj.status_verifikasi = ${status}::text)
          AND (${q}::text IS NULL
               OR pj.pelaksana_nama ILIKE ${q}::text OR pj.rincian_kegiatan ILIKE ${q}::text
               OR pj.no_surat_tugas ILIKE ${q}::text OR pj.kota_tujuan ILIKE ${q}::text
               OR pj.pelaksana_nip ILIKE ${q}::text)
        ORDER BY pj.tgl_mulai DESC, pj.id DESC
        LIMIT ${limit} OFFSET ${offset}
      `;
      const sum = await sql`
        SELECT COUNT(*)::int AS total,
               COALESCE(SUM(pj.jumlah_biaya), 0)::float8 AS total_biaya,
               COUNT(*) FILTER (WHERE pj.status_verifikasi = 'menunggu')::int AS menunggu,
               COUNT(*) FILTER (WHERE pj.status_verifikasi = 'terverifikasi')::int AS terverifikasi
        FROM perjadin pj
        WHERE (${tahun}::int IS NULL OR EXTRACT(YEAR FROM pj.tgl_mulai) = ${tahun}::int)
          AND (${bulan}::int IS NULL OR EXTRACT(MONTH FROM pj.tgl_mulai) = ${bulan}::int)
          AND (${jenis}::text IS NULL OR pj.jenis_perjadin = ${jenis}::text)
          AND (${userId}::int IS NULL OR pj.user_id = ${userId}::int)
          AND ((${status}::text IS NULL AND pj.status_verifikasi <> 'ditolak') OR pj.status_verifikasi = ${status}::text)
          AND (${q}::text IS NULL
               OR pj.pelaksana_nama ILIKE ${q}::text OR pj.rincian_kegiatan ILIKE ${q}::text
               OR pj.no_surat_tugas ILIKE ${q}::text OR pj.kota_tujuan ILIKE ${q}::text
               OR pj.pelaksana_nip ILIKE ${q}::text)
      `;
      const s = sum[0] || {};
      return jsonResponse({
        perjadin: rows,
        total: s.total || 0,
        page, limit,
        summary: {
          total: s.total || 0, total_biaya: s.total_biaya || 0,
          menunggu: s.menunggu || 0, terverifikasi: s.terverifikasi || 0,
        },
      });
    } catch (err) {
      console.error('[GET /api/perjadin]', err);
      return errorResponse('Gagal mengambil data perjalanan dinas');
    }
  }

  // ── Satu data ──
  if (event.httpMethod === 'GET' && id && !action) {
    try {
      const rows = await sql`
        SELECT pj.*, pj.tgl_mulai::text AS tgl_mulai, pj.tgl_selesai::text AS tgl_selesai,
               pj.tgl_sp2d::text AS tgl_sp2d, pj.tgl_surat_tugas::text AS tgl_surat_tugas,
               pj.jumlah_transport::float8 AS jumlah_transport, pj.jumlah_taksi::float8 AS jumlah_taksi,
               pj.jumlah_biaya::float8 AS jumlah_biaya
        FROM perjadin pj WHERE pj.id = ${id} LIMIT 1
      `;
      if (!rows.length || (ownerId !== null && Number(rows[0].user_id) !== ownerId)) return errorResponse('Data perjalanan dinas tidak ditemukan', 404);
      return jsonResponse({ perjadin: rows[0] });
    } catch (err) {
      console.error('[GET /api/perjadin/:id]', err);
      return errorResponse('Gagal mengambil data perjalanan dinas');
    }
  }

  // ── Input langsung oleh admin ──
  if (event.httpMethod === 'POST' && !id) {
    const body = parseBody(event);
    const { row, error } = buildPerjadin(body, { admin: true, base: { nama_skpd: SKPD_DEFAULT } });
    if (error) return errorResponse(error, 400);
    row.nama_skpd = SKPD_DEFAULT;   // Nama SKPD read-only
    try {
      const saved = await insertPerjadin(sql, row, { sumber: 'admin', input_by: auth.id });
      await audit('create_perjadin', saved.id, {
        pelaksana: row.pelaksana_nama, tujuan: row.kota_tujuan, tgl_mulai: row.tgl_mulai, tgl_selesai: row.tgl_selesai,
      });
      return jsonResponse({ perjadin: saved }, 201);
    } catch (err) {
      console.error('[POST /api/perjadin]', err);
      return errorResponse('Gagal menyimpan data perjalanan dinas');
    }
  }

  // ── Verifikasi ──
  if (event.httpMethod === 'PUT' && id && action === 'verifikasi') {
    const { status, catatan } = parseBody(event);
    if (!STATUS_VERIFIKASI.includes(status)) return errorResponse('Status verifikasi tidak valid', 400);
    try {
      const rows = await sql`
        UPDATE perjadin SET
          status_verifikasi = ${status},
          catatan_admin = ${_txt(catatan)},
          verified_by = ${status === 'menunggu' ? null : auth.id},
          verified_at = ${status === 'menunggu' ? null : new Date().toISOString()},
          updated_at = NOW()
        WHERE id = ${id}
        RETURNING id, status_verifikasi, catatan_admin
      `;
      if (!rows.length) return errorResponse('Data perjalanan dinas tidak ditemukan', 404);
      await audit('verifikasi_perjadin', id, { status, catatan: _txt(catatan) });
      return jsonResponse({ perjadin: rows[0] });
    } catch (err) {
      console.error('[PUT /api/perjadin/:id/verifikasi]', err);
      return errorResponse('Gagal memperbarui status verifikasi');
    }
  }

  // ── Edit oleh admin ──
  if (event.httpMethod === 'PUT' && id && !action) {
    try {
      const cur = await sql`
        SELECT pj.*, pj.tgl_mulai::text AS tgl_mulai, pj.tgl_selesai::text AS tgl_selesai,
               pj.tgl_sp2d::text AS tgl_sp2d, pj.tgl_surat_tugas::text AS tgl_surat_tugas
        FROM perjadin pj WHERE pj.id = ${id} LIMIT 1
      `;
      if (!cur.length) return errorResponse('Data perjalanan dinas tidak ditemukan', 404);
      const { row, error } = buildPerjadin(parseBody(event), { admin: true, base: cur[0] });
      if (error) return errorResponse(error, 400);
      row.nama_skpd = SKPD_DEFAULT;   // Nama SKPD read-only
      const saved = await updatePerjadin(sql, id, row);
      await audit('update_perjadin', id, { pelaksana: row.pelaksana_nama, tujuan: row.kota_tujuan });
      return jsonResponse({ perjadin: saved });
    } catch (err) {
      console.error('[PUT /api/perjadin/:id]', err);
      return errorResponse('Gagal menyimpan perubahan');
    }
  }

  // ── Hapus ──
  if (event.httpMethod === 'DELETE' && id) {
    try {
      const cur = await sql`
        SELECT id, user_id, pengajuan_id, tgl_mulai::text AS tgl_mulai, tgl_selesai::text AS tgl_selesai
        FROM perjadin WHERE id = ${id} LIMIT 1
      `;
      if (!cur.length) return errorResponse('Data perjalanan dinas tidak ditemukan', 404);
      const pj = cur[0];

      // Tugas Luar di Absensi yang menaungi perjalanan dinas ini ikut dihapus (sama seperti hapus dari menu Absensi):
      // lewat pengajuan_id kalau ada, kalau tidak lewat rentang tanggal pegawai yang sama (absensi tanpa pengajuan).
      // Absensi dihapus duluan supaya kalau gagal di tengah, baris Perjadin masih ada dan bisa dicoba hapus lagi.
      let absensiHapus = [];
      if (pj.pengajuan_id) {
        absensiHapus = await sql`
          DELETE FROM absensi WHERE pengajuan_id = ${pj.pengajuan_id} AND status = 'tugas_luar'
          RETURNING id, data_dukung_url
        `;
      } else if (pj.user_id && pj.tgl_mulai && pj.tgl_selesai) {
        absensiHapus = await sql`
          DELETE FROM absensi
          WHERE user_id = ${pj.user_id} AND status = 'tugas_luar' AND pengajuan_id IS NULL
            AND tanggal BETWEEN ${pj.tgl_mulai}::date AND ${pj.tgl_selesai}::date
          RETURNING id, data_dukung_url
        `;
      }

      const rows = await sql`DELETE FROM perjadin WHERE id = ${id} RETURNING id, pelaksana_nama, kota_tujuan`;
      if (!rows.length) return errorResponse('Data perjalanan dinas tidak ditemukan', 404);

      // Pengajuan Tugas Luar yang sudah tidak punya absensi ikut dihapus (aturan yang sama dengan hapus absensi).
      const fileDukung = new Set(absensiHapus.map((r) => r.data_dukung_url).filter(Boolean));
      if (pj.pengajuan_id) {
        const sisa = await sql`SELECT 1 FROM absensi WHERE pengajuan_id = ${pj.pengajuan_id} LIMIT 1`;
        if (!sisa.length) {
          const peng = await sql`DELETE FROM absensi_pengajuan WHERE id = ${pj.pengajuan_id} RETURNING data_dukung_url`;
          if (peng[0]?.data_dukung_url) fileDukung.add(peng[0].data_dukung_url);
        }
      }
      for (const url of fileDukung) {
        try { await cleanupReplacedFile(sql, url, null); }
        catch (e) { console.error('[DELETE /api/perjadin/:id] cleanup file', e); }
      }

      await audit('delete_perjadin', id, {
        pelaksana: rows[0].pelaksana_nama, tujuan: rows[0].kota_tujuan, absensi_dihapus: absensiHapus.length,
      });
      return jsonResponse({ ok: true, absensi_dihapus: absensiHapus.length });
    } catch (err) {
      console.error('[DELETE /api/perjadin/:id]', err);
      return errorResponse('Gagal menghapus data perjalanan dinas');
    }
  }

  return errorResponse('Not found', 404);
};
