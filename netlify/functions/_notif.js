import crypto from 'crypto';

const PRIORITAS = ['info', 'penting', 'peringatan'];
export const MODUL_NOTIF = ['surat-masuk', 'lembur', 'perjadin', 'periode', 'kinerja', 'absensi', 'sistem', 'keamanan'];
const BULAN = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
const MS_HARI = 86400000;

let _skemaSiap = false;
export async function ensureNotifSchema(sql) {
  if (_skemaSiap) return;
  await sql`
    CREATE TABLE IF NOT EXISTS notifikasi (
      id             SERIAL PRIMARY KEY,
      user_id        INTEGER     NOT NULL,
      modul          TEXT        NOT NULL,
      jenis          TEXT        NOT NULL CHECK (jenis IN ('kondisi', 'peristiwa')),
      kunci          TEXT        NOT NULL,
      tingkat        TEXT,
      prioritas      TEXT        NOT NULL DEFAULT 'info' CHECK (prioritas IN ('info', 'penting', 'peringatan')),
      judul          TEXT        NOT NULL,
      isi            TEXT,
      tautan         JSONB,
      dibuat_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      diperbarui_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      dibaca_at      TIMESTAMPTZ,
      selesai_at     TIMESTAMPTZ,
      kedaluwarsa_at TIMESTAMPTZ,
      UNIQUE (user_id, kunci)
    )`;
  await sql`CREATE INDEX IF NOT EXISTS idx_notifikasi_user  ON notifikasi (user_id, dibaca_at, selesai_at)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_notifikasi_modul ON notifikasi (modul, jenis, selesai_at)`;
  await sql`
    CREATE TABLE IF NOT EXISTS notifikasi_preferensi (
      user_id       INTEGER     NOT NULL,
      modul         TEXT        NOT NULL,
      nonaktif      BOOLEAN     NOT NULL DEFAULT TRUE,
      diperbarui_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      PRIMARY KEY (user_id, modul)
    )`;
  _skemaSiap = true;
}

export async function buatNotifBanyak(sql, rows) {
  const unik = new Map();
  for (const r of rows || []) {
    if (!r || !r.user_id || !r.kunci || !r.judul || !r.modul) continue;
    unik.set(`${r.user_id}|${r.kunci}`, {
      user_id: r.user_id,
      modul: r.modul,
      jenis: r.jenis === 'kondisi' ? 'kondisi' : 'peristiwa',
      kunci: r.kunci,
      tingkat: r.tingkat || null,
      prioritas: PRIORITAS.includes(r.prioritas) ? r.prioritas : 'info',
      judul: String(r.judul).slice(0, 300),
      isi: r.isi ? String(r.isi).slice(0, 1000) : null,
      tautan: r.tautan || null,
    });
  }
  if (!unik.size) return 0;
  const payload = JSON.stringify([...unik.values()]);
  const res = await sql`
    INSERT INTO notifikasi (user_id, modul, jenis, kunci, tingkat, prioritas, judul, isi, tautan)
    SELECT x.user_id, x.modul, x.jenis, x.kunci, x.tingkat, x.prioritas, x.judul, x.isi, x.tautan
    FROM jsonb_to_recordset(${payload}::jsonb)
         AS x(user_id int, modul text, jenis text, kunci text, tingkat text, prioritas text, judul text, isi text, tautan jsonb)
    ON CONFLICT (user_id, kunci) DO UPDATE SET
      tingkat = EXCLUDED.tingkat, prioritas = EXCLUDED.prioritas, judul = EXCLUDED.judul,
      isi = EXCLUDED.isi, tautan = EXCLUDED.tautan,
      diperbarui_at = NOW(),
      dibaca_at = CASE
        WHEN notifikasi.selesai_at IS NOT NULL
          OR notifikasi.tingkat   IS DISTINCT FROM EXCLUDED.tingkat
          OR notifikasi.prioritas IS DISTINCT FROM EXCLUDED.prioritas
          OR notifikasi.judul     IS DISTINCT FROM EXCLUDED.judul
        THEN NULL ELSE notifikasi.dibaca_at END,
      selesai_at = NULL
    WHERE notifikasi.selesai_at IS NOT NULL
       OR notifikasi.tingkat   IS DISTINCT FROM EXCLUDED.tingkat
       OR notifikasi.prioritas IS DISTINCT FROM EXCLUDED.prioritas
       OR notifikasi.judul     IS DISTINCT FROM EXCLUDED.judul
       OR notifikasi.isi       IS DISTINCT FROM EXCLUDED.isi
       OR notifikasi.tautan    IS DISTINCT FROM EXCLUDED.tautan
    RETURNING id`;
  return res.length;
}

export const buatNotif = (sql, row) => buatNotifBanyak(sql, [row]);

export async function tutupNotifPrefix(sql, prefix) {
  const r = await sql`
    UPDATE notifikasi SET selesai_at = NOW()
    WHERE selesai_at IS NULL AND starts_with(kunci, ${prefix})
    RETURNING id`;
  return r.length;
}

export async function tutupNotifUser(sql, userId, prefix) {
  const r = await sql`
    UPDATE notifikasi SET selesai_at = NOW()
    WHERE selesai_at IS NULL AND user_id = ${userId} AND starts_with(kunci, ${prefix})
    RETURNING id`;
  return r.length;
}

export async function rekonsiliasiKondisi(sql, modul, rows) {
  const dibuat = await buatNotifBanyak(sql, rows);
  const aktif = JSON.stringify((rows || []).map((r) => ({ user_id: r.user_id, kunci: r.kunci })));
  const ditutup = await sql`
    UPDATE notifikasi SET selesai_at = NOW()
    WHERE modul = ${modul} AND jenis = 'kondisi' AND selesai_at IS NULL
      AND NOT EXISTS (
        SELECT 1 FROM jsonb_to_recordset(${aktif}::jsonb) AS k(user_id int, kunci text)
        WHERE k.user_id = notifikasi.user_id AND k.kunci = notifikasi.kunci)
    RETURNING id`;
  return { dibuat, ditutup: ditutup.length };
}

export const hashSingkat = (teks) => crypto.createHash('md5').update(String(teks ?? '')).digest('hex').slice(0, 8);
export const potong = (teks, n = 100) => { const t = String(teks ?? '').replace(/\s+/g, ' ').trim(); return t.length > n ? t.slice(0, n - 1) + '…' : t; };

export async function bersihkanNotifikasi(sql) {
  const r = await sql`
    DELETE FROM notifikasi
    WHERE (selesai_at IS NOT NULL AND selesai_at < NOW() - INTERVAL '30 days')
       OR (jenis = 'peristiwa' AND dibaca_at IS NOT NULL AND dibaca_at < NOW() - INTERVAL '30 days')
       OR (jenis = 'peristiwa' AND dibuat_at < NOW() - INTERVAL '90 days')
       OR (kedaluwarsa_at IS NOT NULL AND kedaluwarsa_at < NOW())
       OR user_id NOT IN (SELECT id FROM users)
    RETURNING id`;
  await sql`DELETE FROM notifikasi_preferensi WHERE user_id NOT IN (SELECT id FROM users)`;
  return r.length;
}

export async function userByNama(sql, namaList, menuKeys) {
  const list = [...new Set((namaList || []).filter(Boolean))];
  if (!list.length) return [];
  return await sql`
    SELECT u.id, u.nama FROM users u
    WHERE u.nama = ANY(${list}) AND u.is_active IS NOT FALSE
      AND (u.is_admin = TRUE OR EXISTS (
        SELECT 1 FROM user_permissions up WHERE up.user_id = u.id AND up.menu_key = ANY(${menuKeys})))`;
}

export async function userFullAkses(sql, menuKey) {
  return await sql`
    SELECT u.id FROM users u
    WHERE u.is_active IS NOT FALSE
      AND (u.is_admin = TRUE OR EXISTS (
        SELECT 1 FROM user_permissions up WHERE up.user_id = u.id AND up.menu_key = ${menuKey}))`;
}

const parseYmd = (s) => { const [y, m, d] = s.split('-').map(Number); return Date.UTC(y, m - 1, d); };
const fmtYmd = (ms) => new Date(ms).toISOString().slice(0, 10);
export const geserHari = (ymd, n) => fmtYmd(parseYmd(ymd) + n * MS_HARI);
export const fmtTanggal = (ymd) => { const [y, m, d] = ymd.split('-').map(Number); return `${d} ${BULAN[m - 1]} ${y}`; };
export const hariKerja = (ymd, libur) => {
  const dow = new Date(parseYmd(ymd)).getUTCDay();
  return dow !== 0 && dow !== 6 && !libur.has(ymd);
};
export function mundurKeHariKerja(ymd, libur) {
  let t = ymd;
  for (let i = 0; i < 14 && !hariKerja(t, libur); i++) t = geserHari(t, -1);
  return t;
}

const SURAT_MENU = ['surat.masuk', 'surat.masuk.full'];
const PRIORITAS_TINGKAT = { 'h-3': 'penting', 'h-1': 'peringatan', 'hari-h': 'peringatan', terlambat: 'peringatan' };
const HARI_TANPA_BATAS = 7;
const ESKALASI_DEFAULT = 3;

export function tingkatSurat(sisa, batasYmd, hariIni, libur) {
  if (sisa < 0) return 'terlambat';
  if (sisa === 0) return 'hari-h';
  if (hariIni >= mundurKeHariKerja(geserHari(batasYmd, -1), libur)) return 'h-1';
  if (hariIni >= mundurKeHariKerja(geserHari(batasYmd, -3), libur)) return 'h-3';
  return null;
}

function teksSisa(sisa) {
  if (sisa < 0) return `Terlambat ${-sisa} hari`;
  if (sisa === 0) return 'Batas waktu hari ini';
  if (sisa === 1) return 'Batas waktu besok';
  return `Batas waktu ${sisa} hari lagi`;
}

async function ambilAmbangEskalasi(sql) {
  try {
    const r = await sql`SELECT value FROM settings WHERE key = 'notif_surat_eskalasi_hari' LIMIT 1`;
    const n = parseInt(r[0]?.value, 10);
    if (Number.isInteger(n) && n >= 1 && n <= 60) return n;
  } catch {  }
  return ESKALASI_DEFAULT;
}

export async function sinkronSuratMasuk(sql) {
  await ensureNotifSchema(sql);
  const [{ hari_ini }] = await sql`SELECT to_char((NOW() AT TIME ZONE 'Asia/Makassar')::date, 'YYYY-MM-DD') AS hari_ini`;
  let libur = new Set();
  try { libur = new Set((await sql`SELECT to_char(tanggal, 'YYYY-MM-DD') AS t FROM hari_libur`).map((r) => r.t)); } catch {  }
  const ambang = await ambilAmbangEskalasi(sql);

  const surat = await sql`
    SELECT id, perihal, pegawai_list,
           to_char(batas_waktu::date, 'YYYY-MM-DD') AS batas,
           (batas_waktu::date - (NOW() AT TIME ZONE 'Asia/Makassar')::date) AS sisa,
           to_char(COALESCE(tanggal_terima::date, (created_at AT TIME ZONE 'Asia/Makassar')::date), 'YYYY-MM-DD') AS diterima,
           ((NOW() AT TIME ZONE 'Asia/Makassar')::date - COALESCE(tanggal_terima::date, (created_at AT TIME ZONE 'Asia/Makassar')::date)) AS umur
    FROM surat_masuk
    WHERE selesai = FALSE`;

  const semuaNama = new Set();
  for (const s of surat) for (const n of (Array.isArray(s.pegawai_list) ? s.pegawai_list : [])) semuaNama.add(n);
  const pegawai = await userByNama(sql, [...semuaNama], SURAT_MENU);
  const idByNama = new Map();
  for (const u of pegawai) idByNama.set(u.nama, [...(idByNama.get(u.nama) || []), u.id]);

  const rows = [];
  let jumlahEskalasi = 0;
  for (const s of surat) {
    const penerima = (Array.isArray(s.pegawai_list) ? s.pegawai_list : []).flatMap((n) => idByNama.get(n) || []);
    const tautan = { halaman: 'surat-masuk', id: s.id };
    if (s.batas) {
      const sisa = Number(s.sisa);
      if (sisa <= -ambang) jumlahEskalasi++;
      const tingkat = tingkatSurat(sisa, s.batas, hari_ini, libur);
      if (!tingkat) continue;
      for (const uid of penerima) {
        rows.push({
          user_id: uid, modul: 'surat-masuk', jenis: 'kondisi', kunci: `surat-masuk:${s.id}:deadline`,
          tingkat, prioritas: PRIORITAS_TINGKAT[tingkat],
          judul: `Surat masuk: ${s.perihal}`,
          isi: `${teksSisa(sisa)} · ${fmtTanggal(s.batas)}`, tautan,
        });
      }
    } else if (Number(s.umur) >= HARI_TANPA_BATAS) {
      for (const uid of penerima) {
        rows.push({
          user_id: uid, modul: 'surat-masuk', jenis: 'kondisi', kunci: `surat-masuk:${s.id}:tanpa-batas`,
          tingkat: 'tanpa-batas', prioritas: 'info',
          judul: `Surat masuk belum selesai: ${s.perihal}`,
          isi: `Diterima ${fmtTanggal(s.diterima)} · belum ada batas waktu`, tautan,
        });
      }
    }
  }

  if (jumlahEskalasi > 0) {
    for (const u of await userFullAkses(sql, 'surat.masuk.full')) {
      rows.push({
        user_id: u.id, modul: 'surat-masuk', jenis: 'kondisi', kunci: 'surat-masuk:eskalasi',
        tingkat: 'eskalasi', prioritas: 'peringatan',
        judul: `${jumlahEskalasi} surat terlambat ≥ ${ambang} hari`,
        isi: 'Buka Surat Masuk untuk menindaklanjuti', tautan: { halaman: 'surat-masuk', filter: 'terlambat' },
      });
    }
  }

  const { dibuat, ditutup } = await rekonsiliasiKondisi(sql, 'surat-masuk', rows);
  return { dibuat, ditutup, surat: surat.length };
}

export async function notifSuratDitugaskan(sql, suratId, namaList, kecuali = null) {
  await ensureNotifSchema(sql);
  const penerima = (await userByNama(sql, namaList, SURAT_MENU)).filter((u) => u.id !== kecuali);
  if (!penerima.length) return 0;
  const [s] = await sql`SELECT perihal, to_char(batas_waktu::date, 'YYYY-MM-DD') AS batas FROM surat_masuk WHERE id = ${suratId} LIMIT 1`;
  if (!s) return 0;
  return await buatNotifBanyak(sql, penerima.map((u) => ({
    user_id: u.id, modul: 'surat-masuk', jenis: 'peristiwa', kunci: `surat-masuk:${suratId}:tugas`,
    prioritas: 'penting', judul: `Surat masuk baru: ${s.perihal}`,
    isi: s.batas ? `Ditugaskan kepada Anda · batas waktu ${fmtTanggal(s.batas)}` : 'Ditugaskan kepada Anda · tanpa batas waktu',
    tautan: { halaman: 'surat-masuk', id: suratId },
  })));
}

export const tutupNotifSurat = (sql, suratId) => tutupNotifPrefix(sql, `surat-masuk:${suratId}:`);
