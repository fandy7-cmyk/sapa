import { runOnce } from './_db.js';

// Helper bersama untuk modul Perjadin (Perjalanan Dinas). Dipakai oleh perjadin.js (input/rekap admin)
// dan absensi.js (form Perjalanan Dinas yang ikut terkirim saat user mengajukan Tugas Luar).

export const SKPD_DEFAULT = 'Dinas Kesehatan, Pengendalian Penduduk dan Keluarga Berencana';
export const JENIS_PERJADIN = ['Dalam Kota', 'Luar Kota Dalam Provinsi', 'Luar Provinsi'];
export const STATUS_VERIFIKASI = ['menunggu', 'terverifikasi', 'ditolak'];

// Rincian biaya/transportasi/penginapan disimpan di kolom JSONB `detail`. Kuncinya 1:1 dengan kolom di
// "Form Rekapitulasi Perjalanan Dinas" (Lampiran 6). Dipisah dari kolom biasa karena driver Neon HTTP
// tidak mendukung query dinamis, jadi ~50 kolom flat berarti INSERT/UPDATE yang sangat panjang.
const _tiket = (p) => [
  `${p}_asal`, `${p}_asal_maskapai`, `${p}_asal_tiket`,
  `${p}_transit`, `${p}_transit_maskapai`, `${p}_transit_tiket`,
  `${p}_tujuan`, `${p}_tujuan_maskapai`, `${p}_tujuan_tiket`,
];
export const DETAIL_TEXT = [
  ..._tiket('udara_pergi'), ..._tiket('udara_pulang'),
  'darat_pergi_kendaraan', 'darat_pergi_plat', 'darat_pulang_kendaraan', 'darat_pulang_plat',
  'darat_bbm_pergi', 'darat_bbm_pulang',
  'laut_pergi_perusahaan', 'laut_pulang_perusahaan',
  'penginapan_nama', 'penginapan_cabang', 'lain_keterangan',
];
export const DETAIL_RP = [
  'udara_pergi_rp', 'udara_pulang_rp', 'darat_pergi_rp', 'darat_pulang_rp', 'laut_pergi_rp', 'laut_pulang_rp',
  'taksi_pergi_rp', 'taksi_pulang_rp', 'uang_harian_rp', 'uang_representasi_rp',
  'penginapan_rp', 'penginapan_30_rp', 'lain_rp',
];
export const DETAIL_DATE = ['penginapan_checkin', 'penginapan_checkout'];
// Diisi/dihitung admin (bendahara), bukan user yang mengajukan.
export const DETAIL_ADMIN_ONLY = ['uang_harian_rp', 'uang_representasi_rp', 'penginapan_30_rp'];
// Kode bandara selalu huruf besar (LUW, UPG, CGK, ...).
const KODE_BANDARA = new Set(
  ['udara_pergi', 'udara_pulang'].flatMap((p) => [`${p}_asal`, `${p}_transit`, `${p}_tujuan`])
);

const MAX_RP = 1e12;

export function ensurePerjadinSchema(sql) {
  return runOnce('perjadin.schema', async () => {
    await sql`
      CREATE TABLE IF NOT EXISTS perjadin (
        id SERIAL PRIMARY KEY,
        user_id INTEGER,
        sumber TEXT NOT NULL DEFAULT 'admin',
        pengajuan_id INTEGER,
        status_verifikasi TEXT NOT NULL DEFAULT 'menunggu',
        catatan_admin TEXT,
        verified_by INTEGER,
        verified_at TIMESTAMPTZ,
        nama_skpd TEXT,
        sub_unit TEXT,
        no_sp2d TEXT,
        tgl_sp2d DATE,
        no_surat_tugas TEXT,
        tgl_surat_tugas DATE,
        rincian_kegiatan TEXT,
        jenis_perjadin TEXT,
        pelaksana_nama TEXT NOT NULL,
        pelaksana_nip TEXT,
        pelaksana_gol TEXT,
        pelaksana_jabatan TEXT,
        tgl_mulai DATE NOT NULL,
        tgl_selesai DATE NOT NULL,
        jumlah_hari INTEGER NOT NULL DEFAULT 1,
        kota_asal TEXT,
        kota_tujuan TEXT,
        detail JSONB NOT NULL DEFAULT '{}'::jsonb,
        jumlah_transport BIGINT NOT NULL DEFAULT 0,
        jumlah_taksi BIGINT NOT NULL DEFAULT 0,
        jumlah_biaya BIGINT NOT NULL DEFAULT 0,
        input_by INTEGER,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `;
    // Sumber Dana (label dari master Sumber Dana e-Planning, mis. "1.1 - DAK Fisik")
    await sql`ALTER TABLE perjadin ADD COLUMN IF NOT EXISTS sumber_dana TEXT`;
    await sql`CREATE INDEX IF NOT EXISTS idx_perjadin_tgl_mulai ON perjadin (tgl_mulai)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_perjadin_pengajuan ON perjadin (pengajuan_id)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_perjadin_user ON perjadin (user_id)`;
  });
}

// Data pelaksana (nama, NIP, sub unit) dari akun user + tabel pegawai (dicocokkan lewat NIP).
export async function getPelaksana(sql, userId) {
  const rows = await sql`
    SELECT u.id, u.nama, u.nip, b.nama AS sub_unit
    FROM users u
    LEFT JOIN bidang b ON b.id = u.bidang_id
    WHERE u.id = ${userId}
    LIMIT 1
  `;
  return rows[0] || null;
}

const _isYMD = (s) => {
  if (typeof s !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const [y, m, d] = s.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d;
};

export function hitungHari(mulai, selesai) {
  const p = (s) => { const [y, m, d] = s.split('-').map(Number); return Date.UTC(y, m - 1, d); };
  return Math.round((p(selesai) - p(mulai)) / 86400000) + 1;
}

const _cleanText = (v, max = 300) => {
  if (v === undefined || v === null) return null;
  const s = String(v).trim();
  return s ? s.slice(0, max) : null;
};

const _n = (detail, k) => Number(detail[k]) || 0;

export function hitungTotal(detail) {
  const jumlah_transport =
    _n(detail, 'udara_pergi_rp') + _n(detail, 'udara_pulang_rp') +
    _n(detail, 'darat_pergi_rp') + _n(detail, 'darat_pulang_rp') +
    _n(detail, 'laut_pergi_rp') + _n(detail, 'laut_pulang_rp');
  const jumlah_taksi = _n(detail, 'taksi_pergi_rp') + _n(detail, 'taksi_pulang_rp');
  const jumlah_biaya =
    jumlah_transport + jumlah_taksi +
    _n(detail, 'uang_harian_rp') + _n(detail, 'uang_representasi_rp') +
    _n(detail, 'penginapan_rp') + _n(detail, 'penginapan_30_rp') + _n(detail, 'lain_rp');
  return { jumlah_transport, jumlah_taksi, jumlah_biaya };
}

// Validasi + normalisasi input form Perjalanan Dinas -> baris siap simpan.
//  admin=true : semua field dari `input` dipakai (field yang tidak dikirim dipertahankan dari `base`).
//  admin=false: hanya field yang boleh diisi user yang dipakai; pelaksana & tanggal selalu dari `base`
//               (diambil server dari akun user & data pengajuan), field khusus admin dari `base`.
// Return { error } atau { row }.
export function buildPerjadin(input = {}, { admin = false, base = {} } = {}) {
  const src = input || {};
  const has = (k) => Object.prototype.hasOwnProperty.call(src, k) && src[k] !== undefined;
  const pick = (k, max, adminOnly = false) => {
    if (has(k) && (admin || !adminOnly)) return _cleanText(src[k], max);
    return base[k] ?? null;
  };
  const pickDate = (k, adminOnly = false) => {
    if (has(k) && (admin || !adminOnly)) {
      const v = _cleanText(src[k], 10);
      if (v && !_isYMD(v)) return { err: true };
      return { v };
    }
    return { v: base[k] ?? null };
  };

  const tglSurat = pickDate('tgl_surat_tugas');
  const tglSp2d = pickDate('tgl_sp2d', true);
  if (tglSurat.err) return { error: 'Tanggal surat tugas tidak valid' };
  if (tglSp2d.err) return { error: 'Tanggal SP2D tidak valid' };

  const row = {
    nama_skpd: (admin && has('nama_skpd') ? _cleanText(src.nama_skpd, 200) : base.nama_skpd) || SKPD_DEFAULT,
    sub_unit: pick('sub_unit', 200, true),
    no_sp2d: pick('no_sp2d', 200, true),
    sumber_dana: pick('sumber_dana', 200, true),
    tgl_sp2d: tglSp2d.v,
    no_surat_tugas: pick('no_surat_tugas', 200),
    tgl_surat_tugas: tglSurat.v,
    rincian_kegiatan: pick('rincian_kegiatan', 1500),
    jenis_perjadin: pick('jenis_perjadin', 60),
    kota_asal: pick('kota_asal', 100),
    kota_tujuan: pick('kota_tujuan', 100),
  };

  // Pelaksana & tanggal pelaksanaan: admin boleh mengisi/ubah, user selalu dari server.
  if (admin) {
    const uid = has('user_id') ? parseInt(src.user_id) : base.user_id;
    row.user_id = Number.isInteger(uid) && uid > 0 ? uid : null;
    row.pelaksana_nama = has('pelaksana_nama') ? _cleanText(src.pelaksana_nama, 200) : base.pelaksana_nama;
    row.pelaksana_nip = has('pelaksana_nip') ? _cleanText(src.pelaksana_nip, 40) : (base.pelaksana_nip ?? null);
    row.tgl_mulai = has('tgl_mulai') ? _cleanText(src.tgl_mulai, 10) : base.tgl_mulai;
    row.tgl_selesai = has('tgl_selesai') ? _cleanText(src.tgl_selesai, 10) : base.tgl_selesai;
  } else {
    row.user_id = base.user_id ?? null;
    row.pelaksana_nama = base.pelaksana_nama;
    row.pelaksana_nip = base.pelaksana_nip ?? null;
    row.tgl_mulai = base.tgl_mulai;
    row.tgl_selesai = base.tgl_selesai;
    row.sub_unit = base.sub_unit ?? null;
  }

  if (!row.pelaksana_nama) return { error: 'Nama pelaksana wajib diisi' };
  if (!_isYMD(row.tgl_mulai) || !_isYMD(row.tgl_selesai)) return { error: 'Tanggal pelaksanaan (mulai/selesai) wajib diisi' };
  if (row.tgl_selesai < row.tgl_mulai) return { error: 'Tanggal selesai tidak boleh sebelum tanggal mulai' };
  if (!row.rincian_kegiatan) return { error: 'Rincian kegiatan wajib diisi' };
  if (!JENIS_PERJADIN.includes(row.jenis_perjadin)) return { error: 'Jenis perjalanan dinas tidak valid' };
  if (!row.kota_asal) return { error: 'Kota asal wajib diisi' };
  if (!row.kota_tujuan) return { error: 'Kota tujuan wajib diisi' };
  row.jumlah_hari = hitungHari(row.tgl_mulai, row.tgl_selesai);

  // Rincian biaya (JSONB). Hanya field yang terisi yang disimpan.
  const dSrc = (src.detail && typeof src.detail === 'object') ? src.detail : {};
  const dBase = (base.detail && typeof base.detail === 'object') ? base.detail : {};
  const detail = {};
  const allowed = (k) => admin || !DETAIL_ADMIN_ONLY.includes(k);
  for (const k of DETAIL_TEXT) {
    let v = (allowed(k) && k in dSrc) ? _cleanText(dSrc[k]) : _cleanText(dBase[k]);
    if (v && KODE_BANDARA.has(k)) v = v.toUpperCase();
    if (v) detail[k] = v;
  }
  for (const k of DETAIL_DATE) {
    const v = (allowed(k) && k in dSrc) ? _cleanText(dSrc[k], 10) : _cleanText(dBase[k], 10);
    if (v && !_isYMD(v)) return { error: 'Tanggal check-in/check-out penginapan tidak valid' };
    if (v) detail[k] = v;
  }
  for (const k of DETAIL_RP) {
    let v = (allowed(k) && k in dSrc) ? dSrc[k] : dBase[k];
    if (v === undefined || v === null || v === '') continue;
    v = Number(v);
    if (!Number.isFinite(v) || v < 0 || v > MAX_RP) return { error: 'Nominal biaya tidak valid' };
    v = Math.round(v);
    if (v > 0) detail[k] = v;
  }
  if (detail.penginapan_checkin && detail.penginapan_checkout && detail.penginapan_checkout < detail.penginapan_checkin) {
    return { error: 'Check-out penginapan tidak boleh sebelum check-in' };
  }

  row.detail = detail;
  Object.assign(row, hitungTotal(detail));
  return { row };
}

export async function insertPerjadin(sql, row, { sumber = 'admin', pengajuan_id = null, input_by = null } = {}) {
  const rows = await sql`
    INSERT INTO perjadin (
      user_id, sumber, pengajuan_id, nama_skpd, sub_unit, no_sp2d, tgl_sp2d, sumber_dana, no_surat_tugas, tgl_surat_tugas,
      rincian_kegiatan, jenis_perjadin, pelaksana_nama, pelaksana_nip,
      tgl_mulai, tgl_selesai, jumlah_hari, kota_asal, kota_tujuan, detail,
      jumlah_transport, jumlah_taksi, jumlah_biaya, input_by
    ) VALUES (
      ${row.user_id}, ${sumber}, ${pengajuan_id}, ${row.nama_skpd}, ${row.sub_unit}, ${row.no_sp2d}, ${row.tgl_sp2d}, ${row.sumber_dana ?? null},
      ${row.no_surat_tugas}, ${row.tgl_surat_tugas}, ${row.rincian_kegiatan}, ${row.jenis_perjadin},
      ${row.pelaksana_nama}, ${row.pelaksana_nip},
      ${row.tgl_mulai}, ${row.tgl_selesai}, ${row.jumlah_hari}, ${row.kota_asal}, ${row.kota_tujuan},
      ${JSON.stringify(row.detail)}::jsonb,
      ${row.jumlah_transport}, ${row.jumlah_taksi}, ${row.jumlah_biaya}, ${input_by}
    )
    RETURNING *, tgl_mulai::text AS tgl_mulai, tgl_selesai::text AS tgl_selesai,
              tgl_sp2d::text AS tgl_sp2d, tgl_surat_tugas::text AS tgl_surat_tugas
  `;
  return rows[0];
}

export async function updatePerjadin(sql, id, row) {
  const rows = await sql`
    UPDATE perjadin SET
      user_id = ${row.user_id}, nama_skpd = ${row.nama_skpd}, sub_unit = ${row.sub_unit},
      no_sp2d = ${row.no_sp2d}, tgl_sp2d = ${row.tgl_sp2d}, sumber_dana = ${row.sumber_dana ?? null},
      no_surat_tugas = ${row.no_surat_tugas}, tgl_surat_tugas = ${row.tgl_surat_tugas},
      rincian_kegiatan = ${row.rincian_kegiatan}, jenis_perjadin = ${row.jenis_perjadin},
      pelaksana_nama = ${row.pelaksana_nama}, pelaksana_nip = ${row.pelaksana_nip},
      tgl_mulai = ${row.tgl_mulai}, tgl_selesai = ${row.tgl_selesai}, jumlah_hari = ${row.jumlah_hari},
      kota_asal = ${row.kota_asal}, kota_tujuan = ${row.kota_tujuan},
      detail = ${JSON.stringify(row.detail)}::jsonb,
      jumlah_transport = ${row.jumlah_transport}, jumlah_taksi = ${row.jumlah_taksi}, jumlah_biaya = ${row.jumlah_biaya},
      updated_at = NOW()
    WHERE id = ${id}
    RETURNING *, tgl_mulai::text AS tgl_mulai, tgl_selesai::text AS tgl_selesai,
              tgl_sp2d::text AS tgl_sp2d, tgl_surat_tugas::text AS tgl_surat_tugas
  `;
  return rows[0] || null;
}

// ── Sinkron Absensi (Tugas Luar) → Perjadin ──
// Setiap Tugas Luar di absensi harus punya baris di rekap Perjadin. Kalau user sudah mengisi form Perjalanan
// Dinas (lewat pengajuan), baris itu dipakai apa adanya. Kalau belum (input manual admin, pengajuan tanpa form,
// ubah status jadi Tugas Luar), dibuat baris "kerangka": jenis/kota/biaya kosong, status verifikasi 'menunggu',
// supaya admin tinggal melengkapinya dari menu Perjadin.
export async function syncPerjadinDariAbsensi(sql, { user_id, tgl_mulai, tgl_selesai, keterangan = null, pengajuan_id = null, input_by = null }) {
  if (!user_id || !_isYMD(tgl_mulai) || !_isYMD(tgl_selesai)) return null;
  await ensurePerjadinSchema(sql);
  if (pengajuan_id) {
    const ada = await sql`SELECT id FROM perjadin WHERE pengajuan_id = ${pengajuan_id} LIMIT 1`;
    if (ada.length) return null;
  }
  const overlap = await sql`
    SELECT id FROM perjadin
    WHERE user_id = ${user_id} AND status_verifikasi <> 'ditolak'
      AND tgl_mulai <= ${tgl_selesai}::date AND tgl_selesai >= ${tgl_mulai}::date
    LIMIT 1
  `;
  if (overlap.length) return null;
  const pel = await getPelaksana(sql, user_id);
  if (!pel) return null;
  const row = {
    user_id, nama_skpd: SKPD_DEFAULT, sub_unit: pel.sub_unit || null,
    no_sp2d: null, tgl_sp2d: null, sumber_dana: null, no_surat_tugas: null, tgl_surat_tugas: null,
    rincian_kegiatan: _cleanText(keterangan, 1500) || 'Tugas Luar (dicatat dari Absensi)',
    jenis_perjadin: null,
    pelaksana_nama: pel.nama, pelaksana_nip: pel.nip || null,
    tgl_mulai, tgl_selesai, jumlah_hari: hitungHari(tgl_mulai, tgl_selesai),
    kota_asal: null, kota_tujuan: null, detail: {},
    jumlah_transport: 0, jumlah_taksi: 0, jumlah_biaya: 0,
  };
  return insertPerjadin(sql, row, { sumber: 'absensi', pengajuan_id, input_by });
}

// Absensi Tugas Luar dihapus → buang baris kerangka Perjadin yang belum dilengkapi, kalau sudah tidak ada
// absensi Tugas Luar lain di rentangnya. Baris yang sudah diisi (jenis/biaya/verifikasi) tidak disentuh.
export async function bersihkanKerangkaPerjadin(sql, { user_id, tanggal }) {
  if (!user_id || !tanggal) return;
  await ensurePerjadinSchema(sql);
  const stubs = await sql`
    SELECT id, tgl_mulai::text AS tgl_mulai, tgl_selesai::text AS tgl_selesai FROM perjadin
    WHERE user_id = ${user_id} AND sumber = 'absensi' AND jenis_perjadin IS NULL
      AND jumlah_biaya = 0 AND status_verifikasi = 'menunggu'
      AND tgl_mulai <= ${tanggal}::date AND tgl_selesai >= ${tanggal}::date
  `;
  for (const s of stubs) {
    const sisa = await sql`
      SELECT 1 FROM absensi WHERE user_id = ${user_id} AND status = 'tugas_luar'
        AND tanggal BETWEEN ${s.tgl_mulai}::date AND ${s.tgl_selesai}::date LIMIT 1
    `;
    if (!sisa.length) await sql`DELETE FROM perjadin WHERE id = ${s.id}`;
  }
}

// Sekali jalan per database: Tugas Luar lama di absensi yang belum ada di Perjadin dibuatkan baris kerangka.
// Dikelompokkan per pengajuan, atau per rentang tanggal berurutan untuk input manual.
export function backfillPerjadinDariAbsensi(sql) {
  return runOnce('perjadin.backfill_absensi', async () => {
    await ensurePerjadinSchema(sql);
    await sql`ALTER TABLE absensi_settings ADD COLUMN IF NOT EXISTS perjadin_backfilled BOOLEAN NOT NULL DEFAULT FALSE`;
    const flag = await sql`SELECT perjadin_backfilled FROM absensi_settings WHERE id = 1`;
    if (!flag.length || flag[0].perjadin_backfilled) return;

    const rows = await sql`
      SELECT user_id, pengajuan_id, tanggal::text AS tanggal, keterangan
      FROM absensi WHERE status = 'tugas_luar' ORDER BY user_id, tanggal
    `;
    const groups = [];
    for (const r of rows) {
      const last = groups[groups.length - 1];
      const nyambung = last && last.user_id === r.user_id &&
        ((r.pengajuan_id && last.pengajuan_id === r.pengajuan_id) ||
         (!r.pengajuan_id && !last.pengajuan_id && hitungHari(last.selesai, r.tanggal) <= 2));
      if (nyambung) last.selesai = r.tanggal;
      else groups.push({ user_id: r.user_id, pengajuan_id: r.pengajuan_id, mulai: r.tanggal, selesai: r.tanggal, keterangan: r.keterangan });
    }
    for (const g of groups) {
      try {
        await syncPerjadinDariAbsensi(sql, {
          user_id: g.user_id, tgl_mulai: g.mulai, tgl_selesai: g.selesai,
          keterangan: g.keterangan, pengajuan_id: g.pengajuan_id,
        });
      } catch (e) { console.error('[backfill perjadin]', e); }
    }
    await sql`UPDATE absensi_settings SET perjadin_backfilled = TRUE WHERE id = 1`;
  });
}
