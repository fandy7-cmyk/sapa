// Notifikasi modul untuk lonceng "Notifikasi" - Fase 2: Lembur, Kinerja (verifikasi + periode input), Perjadin.
// Fase 3: Absensi (pengajuan + alpa otomatis), Sistem (error baru / kesehatan), Keamanan (akun terkunci).
// Pola sama dengan Surat Masuk di _notif.js:
//   - sinkron*()  : rekonsiliasi notifikasi KONDISI (dipanggil notif-cron tiap jam dan setelah ada perubahan data).
//   - notif*()    : notifikasi PERISTIWA saat ada kejadian (ditugaskan, catatan, hasil verifikasi, ...).
// Semua dipanggil best-effort dari endpoint modul: kegagalan notifikasi tidak boleh menggagalkan aksi utamanya.
import {
  ensureNotifSchema, buatNotifBanyak, rekonsiliasiKondisi, tutupNotifPrefix, userFullAkses,
  fmtTanggal, hashSingkat, potong,
} from './_notif.js';
import { _hitungKunci, LOGIN_HISTORY_HOURS } from './_audit.js';

const intUnik = (arr, kecuali = null) =>
  [...new Set((arr || []).map(Number).filter((n) => Number.isInteger(n) && n > 0 && n !== kecuali))];
const fmtJam = (mulai, selesai) => (mulai && selesai ? `${mulai}–${selesai}` : (mulai || selesai || '-'));

async function userAdmin(sql) {
  return await sql`SELECT id FROM users WHERE is_admin = TRUE AND is_active IS NOT FALSE`;
}

async function userAktif(sql, ids) {
  if (!ids.length) return [];
  return await sql`SELECT id FROM users WHERE id = ANY(${ids}) AND is_active IS NOT FALSE`;
}

// ═════════════════════════════ LEMBUR ═════════════════════════════
// Catatan alur: sesi lembur hanya bisa dicatat untuk tanggal yang SUDAH terjadi (lembur.js menolak tanggal masa depan),
// jadi notifikasinya "lembur tercatat, isi uraian tugas", bukan "dijadwalkan".
const LEMBUR_HALAMAN = 'lembur-kegiatan';
const HARI_URAIAN_PERINGATAN = 3;   // Penting mulai H+1 sejak tanggal sesi, Peringatan mulai H+3

// Kondisi: uraian tugas peserta masih kosong setelah tanggal sesi lewat. Menutup diri saat uraian terisi,
// dan menutup peristiwa lembur milik peserta/sesi yang sudah dihapus (juga akibat kegiatan dihapus).
export async function sinkronLembur(sql) {
  await ensureNotifSchema(sql);
  const entri = await sql`
    SELECT e.user_id, e.sesi_id, k.nama_kegiatan,
           to_char(s.tanggal::date, 'YYYY-MM-DD') AS tanggal,
           ((NOW() AT TIME ZONE 'Asia/Makassar')::date - s.tanggal::date) AS umur
    FROM lembur_entries e
    JOIN lembur_sesi s     ON s.id = e.sesi_id
    JOIN lembur_kegiatan k ON k.id = s.kegiatan_id
    JOIN users u           ON u.id = e.user_id
    WHERE COALESCE(BTRIM(e.uraian_tugas), '') = ''
      AND u.is_active IS NOT FALSE
      AND ((NOW() AT TIME ZONE 'Asia/Makassar')::date - s.tanggal::date) >= 1`;
  const rows = entri.map((e) => {
    const lama = Number(e.umur) >= HARI_URAIAN_PERINGATAN;
    return {
      user_id: e.user_id, modul: 'lembur', jenis: 'kondisi', kunci: `lembur:${e.sesi_id}:uraian`,
      tingkat: lama ? 'h+3' : 'h+1', prioritas: lama ? 'peringatan' : 'penting',
      judul: 'Uraian tugas lembur belum diisi',
      isi: `${fmtTanggal(e.tanggal)} · ${e.nama_kegiatan}`, tautan: { halaman: LEMBUR_HALAMAN },
    };
  });
  const hasil = await rekonsiliasiKondisi(sql, 'lembur', rows);
  const yatim = await sql`
    UPDATE notifikasi SET selesai_at = NOW()
    WHERE modul = 'lembur' AND selesai_at IS NULL
      AND NOT EXISTS (
        SELECT 1 FROM lembur_entries e
        WHERE e.sesi_id = (CASE WHEN split_part(notifikasi.kunci, ':', 2) ~ '^[0-9]+$' THEN split_part(notifikasi.kunci, ':', 2)::int END)
          AND e.user_id = notifikasi.user_id)
    RETURNING id`;
  return { ...hasil, ditutup: hasil.ditutup + yatim.length, entri: entri.length };
}

// Peristiwa: peserta ditambahkan ke sesi. `kecuali` = pelaku (tidak diberi tahu tentang aksinya sendiri).
export async function notifLemburDicatat(sql, sesiId, userIds, kecuali = null) {
  const ids = intUnik(userIds, kecuali);
  if (!ids.length) return 0;
  await ensureNotifSchema(sql);
  const [s] = await sql`
    SELECT to_char(s.tanggal::date, 'YYYY-MM-DD') AS tanggal, k.nama_kegiatan
    FROM lembur_sesi s JOIN lembur_kegiatan k ON k.id = s.kegiatan_id WHERE s.id = ${sesiId} LIMIT 1`;
  if (!s) return 0;
  return await buatNotifBanyak(sql, (await userAktif(sql, ids)).map((u) => ({
    user_id: u.id, modul: 'lembur', jenis: 'peristiwa', kunci: `lembur:${sesiId}:tugas`,
    prioritas: 'info', judul: `Lembur tercatat: ${fmtTanggal(s.tanggal)}`,
    isi: `${s.nama_kegiatan} · isi uraian tugas Anda`, tautan: { halaman: LEMBUR_HALAMAN },
  })));
}

// Peristiwa: tanggal atau jam sesi diubah -> semua peserta (kecuali pelaku).
export async function notifLemburJadwal(sql, sesiId, kecuali = null) {
  await ensureNotifSchema(sql);
  const [s] = await sql`
    SELECT to_char(s.tanggal::date, 'YYYY-MM-DD') AS tanggal,
           to_char(s.jam_mulai, 'HH24:MI') AS jm, to_char(s.jam_selesai, 'HH24:MI') AS js, k.nama_kegiatan
    FROM lembur_sesi s JOIN lembur_kegiatan k ON k.id = s.kegiatan_id WHERE s.id = ${sesiId} LIMIT 1`;
  if (!s) return 0;
  const peserta = await sql`SELECT e.user_id FROM lembur_entries e JOIN users u ON u.id = e.user_id WHERE e.sesi_id = ${sesiId} AND u.is_active IS NOT FALSE`;
  const isi = `${fmtTanggal(s.tanggal)} · ${fmtJam(s.jm, s.js)} · ${s.nama_kegiatan}`;
  return await buatNotifBanyak(sql, peserta.filter((p) => p.user_id !== kecuali).map((p) => ({
    user_id: p.user_id, modul: 'lembur', jenis: 'peristiwa', kunci: `lembur:${sesiId}:jadwal`,
    tingkat: hashSingkat(isi), prioritas: 'info', judul: 'Jadwal lembur diubah', isi, tautan: { halaman: LEMBUR_HALAMAN },
  })));
}

// Peristiwa untuk satu peserta: jam lembur pribadi diubah (jenis 'jam') atau catatan kasubag diisi/diubah (jenis 'catatan').
export async function notifLemburEntri(sql, entriId, jenis, kecuali = null) {
  await ensureNotifSchema(sql);
  const [e] = await sql`
    SELECT e.user_id, e.sesi_id, e.catatan,
           to_char(s.tanggal::date, 'YYYY-MM-DD') AS tanggal,
           to_char(COALESCE(e.jam_mulai, s.jam_mulai), 'HH24:MI')     AS jm,
           to_char(COALESCE(e.jam_selesai, s.jam_selesai), 'HH24:MI') AS js
    FROM lembur_entries e JOIN lembur_sesi s ON s.id = e.sesi_id
    WHERE e.id = ${entriId} LIMIT 1`;
  if (!e || e.user_id === kecuali) return 0;
  const [u] = await userAktif(sql, [e.user_id]);
  if (!u) return 0;
  if (jenis === 'catatan') {
    const catatan = potong(e.catatan, 120);
    if (!catatan) { await sql`UPDATE notifikasi SET selesai_at = NOW() WHERE user_id = ${e.user_id} AND kunci = ${`lembur:${e.sesi_id}:catatan`} AND selesai_at IS NULL`; return 0; }
    return await buatNotifBanyak(sql, [{
      user_id: e.user_id, modul: 'lembur', jenis: 'peristiwa', kunci: `lembur:${e.sesi_id}:catatan`,
      tingkat: hashSingkat(catatan), prioritas: 'info', judul: 'Catatan pada uraian tugas lembur',
      isi: `${fmtTanggal(e.tanggal)} · ${catatan}`, tautan: { halaman: LEMBUR_HALAMAN },
    }]);
  }
  const isi = `${fmtTanggal(e.tanggal)} · jam Anda ${fmtJam(e.jm, e.js)}`;
  return await buatNotifBanyak(sql, [{
    user_id: e.user_id, modul: 'lembur', jenis: 'peristiwa', kunci: `lembur:${e.sesi_id}:jam`,
    tingkat: hashSingkat(isi), prioritas: 'info', judul: 'Jam lembur Anda diubah', isi, tautan: { halaman: LEMBUR_HALAMAN },
  }]);
}

// ═════════════════════════════ KINERJA ═════════════════════════════
const VERIF_PENDING = ['menunggu', 'diajukan_kembali'];
const TW_NAMA = { 3: 'Triwulan I', 6: 'Triwulan II', 9: 'Triwulan III', 12: 'Triwulan IV' };
const JENIS_LABEL = { monev: 'IKU', ikk: 'IKK', spm: 'SPM', subkeg: 'Sub Kegiatan' };
const HALAMAN_JENIS = { monev: 'monev-kinerja', ikk: 'realisasi-ikk', spm: 'spm-kinerja', subkeg: 'subkeg-kinerja' };
const HARI_VERIF_LAMA = 3;   // pengajuan menunggu > 3 hari -> ringkasan verifikator naik ke Peringatan
const labelPeriode = (bulan, tahun) => `${TW_NAMA[bulan] || `Bulan ${bulan}`} ${tahun}`;

function jenisIndikator(ind) {   // sama dengan verifJenisList di kinerja_function.js
  let jc = ind.jenis_custom;
  if (typeof jc === 'string') { try { jc = JSON.parse(jc); } catch { jc = []; } }
  const list = [];
  if (ind.jenis_monev) list.push('monev');
  if (ind.jenis_ikk) list.push('ikk');
  if (ind.jenis_spm) list.push('spm');
  if (Array.isArray(jc) && jc.includes('subkeg')) list.push('subkeg');
  return list;
}

// Kondisi: satu ringkasan per verifikator aktif ("N pengajuan menunggu verifikasi"), naik ke Peringatan bila ada yang
// menunggu > 3 hari. Hanya verifikator yang ditetapkan untuk unit kerja indikator (admin tidak diberi notifikasi individual).
// Juga menutup notifikasi hasil (disetujui/perlu perbaikan) yang sudah tidak relevan (diajukan ulang atau data dihapus).
export async function sinkronKinerjaVerifikasi(sql) {
  await ensureNotifSchema(sql);
  const per = await sql`
    SELECT kv.user_id, COUNT(*)::int AS n,
           COALESCE(MAX((NOW() AT TIME ZONE 'Asia/Makassar')::date - (kr.submitted_at AT TIME ZONE 'Asia/Makassar')::date), 0) AS terlama
    FROM kinerja_realisasi kr
    JOIN kinerja_indikator ki   ON ki.id = kr.indikator_id
    JOIN bidang b               ON TRIM(b.nama) = TRIM(ki.penanggung_jawab) AND b.deleted_at IS NULL
    JOIN kinerja_verifikator kv ON kv.bidang_id = b.id AND kv.aktif = TRUE
    JOIN users u                ON u.id = kv.user_id AND u.is_active IS NOT FALSE
    WHERE kr.status_verifikasi = ANY(${VERIF_PENDING})
    GROUP BY kv.user_id`;
  const rows = per.map((r) => {
    const lama = Number(r.terlama) > HARI_VERIF_LAMA;
    return {
      user_id: r.user_id, modul: 'kinerja', jenis: 'kondisi', kunci: 'kinerja:verifikasi:menunggu',
      tingkat: lama ? 'lama' : 'normal', prioritas: lama ? 'peringatan' : 'penting',
      judul: `${r.n} pengajuan kinerja menunggu verifikasi`,
      isi: lama ? `Ada pengajuan yang menunggu lebih dari ${HARI_VERIF_LAMA} hari` : 'Buka Verifikasi Kinerja untuk memproses',
      tautan: { halaman: 'verifikasi-kinerja' },
    };
  });
  const hasil = await rekonsiliasiKondisi(sql, 'kinerja', rows);
  // Notifikasi hasil hanya berlaku selama status realisasinya disetujui / perlu_perbaikan.
  const basi = await sql`
    UPDATE notifikasi SET selesai_at = NOW()
    WHERE modul = 'kinerja' AND jenis = 'peristiwa' AND selesai_at IS NULL AND right(kunci, 6) = ':hasil'
      AND NOT EXISTS (
        SELECT 1 FROM kinerja_realisasi kr
        WHERE kr.id = (CASE WHEN split_part(notifikasi.kunci, ':', 2) ~ '^[0-9]+$' THEN split_part(notifikasi.kunci, ':', 2)::int END)
          AND kr.status_verifikasi IN ('disetujui', 'perlu_perbaikan'))
    RETURNING id`;
  return { ...hasil, ditutup: hasil.ditutup + basi.length, verifikator: per.length };
}

// Peristiwa ke pengaju: pengajuan disetujui (Info) atau perlu perbaikan + alasan (Penting).
export async function notifKinerjaHasil(sql, realisasiId, aksi, alasan, kecuali = null) {
  await ensureNotifSchema(sql);
  const [r] = await sql`
    SELECT kr.submitted_by, kr.bulan, kr.tahun, ki.indikator_kinerja,
           ki.jenis_monev, ki.jenis_ikk, ki.jenis_spm, ki.jenis_custom
    FROM kinerja_realisasi kr JOIN kinerja_indikator ki ON ki.id = kr.indikator_id
    WHERE kr.id = ${realisasiId} LIMIT 1`;
  if (!r || !r.submitted_by || r.submitted_by === kecuali) return 0;
  const [u] = await userAktif(sql, [r.submitted_by]);
  if (!u) return 0;
  const jenis = jenisIndikator(r)[0];
  const setuju = aksi === 'setujui';
  return await buatNotifBanyak(sql, [{
    user_id: r.submitted_by, modul: 'kinerja', jenis: 'peristiwa', kunci: `kinerja:${realisasiId}:hasil`,
    tingkat: setuju ? 'disetujui' : 'perlu_perbaikan', prioritas: setuju ? 'info' : 'penting',
    judul: `${setuju ? 'Pengajuan disetujui' : 'Perlu perbaikan'}: ${potong(r.indikator_kinerja, 90)}`,
    isi: setuju ? labelPeriode(r.bulan, r.tahun) : `${labelPeriode(r.bulan, r.tahun)} · ${potong(alasan, 120)}`,
    tautan: HALAMAN_JENIS[jenis] ? { halaman: HALAMAN_JENIS[jenis] } : null,
  }]);
}

// Kondisi: periode input kinerja (IKU/IKK/SPM/Sub Kegiatan) yang sedang dibuka. Penerima = pengisi yang ditugaskan
// (tabel user_indikator) dan MASIH punya indikator yang belum diajukan (draft / perlu perbaikan / belum diisi).
// Tingkat: dibuka (Info) -> h-3 (Penting) -> h-1 (Peringatan) -> jam-1, kurang dari 1 jam (Peringatan).
// Menutup diri saat periode ditutup atau semua indikator pengisi itu sudah diajukan. Cron per jam, jadi tingkat
// "jam-1" muncul pada eksekusi terakhir sebelum tutup (tidak presisi menit). Periode tahunan (e-Planning, Walidata) belum dicakup.
export async function sinkronPeriode(sql) {
  await ensureNotifSchema(sql);
  const periode = await sql`
    SELECT p.id, p.jenis, p.bulan, p.tahun,
           to_char(p.close_at AT TIME ZONE 'Asia/Makassar', 'YYYY-MM-DD HH24:MI') AS tutup,
           EXTRACT(EPOCH FROM (p.close_at - NOW()))::int AS detik,
           ((p.close_at AT TIME ZONE 'Asia/Makassar')::date - (NOW() AT TIME ZONE 'Asia/Makassar')::date) AS sisa
    FROM periode p
    WHERE p.jenis = ANY(${Object.keys(JENIS_LABEL)}) AND p.bulan IS NOT NULL
      AND p.open_at <= NOW() AND p.close_at >= NOW()`;
  const rows = [];
  for (const p of periode) {
    const pengisi = await sql`
      SELECT ui.user_id, COUNT(*)::int AS belum
      FROM kinerja_indikator ki
      JOIN user_indikator ui ON ui.indikator_id = ki.id
      JOIN users u           ON u.id = ui.user_id AND u.is_active IS NOT FALSE
      LEFT JOIN kinerja_realisasi kr ON kr.indikator_id = ki.id AND kr.bulan = ${p.bulan} AND kr.tahun = ${p.tahun}
      WHERE ki.aktif = TRUE
        AND (CASE ${p.jenis}::text
               WHEN 'monev' THEN COALESCE(ki.jenis_monev::boolean, FALSE)
               WHEN 'ikk'   THEN COALESCE(ki.jenis_ikk::boolean, FALSE)
               WHEN 'spm'   THEN COALESCE(ki.jenis_spm::boolean, FALSE)
               ELSE COALESCE(ki.jenis_custom::jsonb ? 'subkeg', FALSE) END)
        AND COALESCE(kr.status_verifikasi, 'draft') IN ('draft', 'perlu_perbaikan')
      GROUP BY ui.user_id`;
    const detik = Number(p.detik), sisa = Number(p.sisa);
    const tingkat = detik <= 3600 ? 'jam-1' : sisa <= 1 ? 'h-1' : sisa <= 3 ? 'h-3' : 'dibuka';
    const prioritas = { 'jam-1': 'peringatan', 'h-1': 'peringatan', 'h-3': 'penting', dibuka: 'info' }[tingkat];
    const nama = `Periode input ${JENIS_LABEL[p.jenis]} ${labelPeriode(p.bulan, p.tahun)}`;
    const judul = { dibuka: `${nama} dibuka`, 'h-3': `${nama} segera ditutup`, 'h-1': `${nama} segera ditutup`, 'jam-1': `${nama} ditutup kurang dari 1 jam lagi` }[tingkat];
    for (const u of pengisi) {
      rows.push({
        user_id: u.user_id, modul: 'periode', jenis: 'kondisi', kunci: `periode:${p.id}:input`, tingkat, prioritas, judul,
        isi: `${u.belum} indikator belum diajukan · ditutup ${fmtTanggal(p.tutup.slice(0, 10))} ${p.tutup.slice(11)} WITA`,
        tautan: { halaman: HALAMAN_JENIS[p.jenis] },
      });
    }
  }
  const hasil = await rekonsiliasiKondisi(sql, 'periode', rows);
  return { ...hasil, periode: periode.length };
}

// ═════════════════════════════ PERJADIN ═════════════════════════════
// Data perjadin masuk lewat Absensi (pengajuan tugas luar) atau input admin, dengan status awal 'menunggu'.
// Ringkasan ke admin / perjadin.full; hasil verifikasi ke pemilik data. Perubahan yang berasal dari modul Absensi
// terjangkau cron per jam (tidak di-hook langsung).
export async function sinkronPerjadin(sql) {
  await ensureNotifSchema(sql);
  const [{ n }] = await sql`SELECT COUNT(*)::int AS n FROM perjadin WHERE status_verifikasi = 'menunggu'`;
  const rows = n > 0
    ? (await userFullAkses(sql, 'perjadin.full')).map((u) => ({
        user_id: u.id, modul: 'perjadin', jenis: 'kondisi', kunci: 'perjadin:verifikasi:menunggu',
        tingkat: 'menunggu', prioritas: 'penting', judul: `${n} data perjalanan dinas menunggu verifikasi`,
        isi: 'Buka Data Perjadin untuk memverifikasi', tautan: { halaman: 'perjadin-rekap' },
      }))
    : [];
  const hasil = await rekonsiliasiKondisi(sql, 'perjadin', rows);
  const basi = await sql`
    UPDATE notifikasi SET selesai_at = NOW()
    WHERE modul = 'perjadin' AND jenis = 'peristiwa' AND selesai_at IS NULL AND right(kunci, 6) = ':hasil'
      AND NOT EXISTS (
        SELECT 1 FROM perjadin pj
        WHERE pj.id = (CASE WHEN split_part(notifikasi.kunci, ':', 2) ~ '^[0-9]+$' THEN split_part(notifikasi.kunci, ':', 2)::int END)
          AND pj.status_verifikasi IN ('terverifikasi', 'ditolak'))
    RETURNING id`;
  return { ...hasil, ditutup: hasil.ditutup + basi.length, menunggu: n };
}

// Peristiwa ke pemilik data: terverifikasi (Info) atau dikembalikan/ditolak + catatan (Penting). Status 'menunggu'
// (dikembalikan ke antrean) menutup notifikasi hasil sebelumnya. Tautan hanya diberikan bila pemilik bisa membuka menu Perjadin.
export async function notifPerjadinHasil(sql, perjadinId, status, catatan, kecuali = null) {
  await ensureNotifSchema(sql);
  const kunci = `perjadin:${perjadinId}:hasil`;
  if (status === 'menunggu') return await tutupNotifPrefix(sql, kunci);
  const [r] = await sql`SELECT user_id, kota_tujuan, tgl_mulai::text AS tgl_mulai FROM perjadin WHERE id = ${perjadinId} LIMIT 1`;
  if (!r || !r.user_id || r.user_id === kecuali) return 0;
  const [u] = await userAktif(sql, [r.user_id]);
  if (!u) return 0;
  const [akses] = await sql`
    SELECT (us.is_admin = TRUE OR EXISTS (SELECT 1 FROM user_permissions up WHERE up.user_id = us.id AND up.menu_key IN ('perjadin', 'perjadin.full'))) AS boleh
    FROM users us WHERE us.id = ${r.user_id}`;
  const ok = status === 'terverifikasi';
  const tujuan = r.kota_tujuan ? ` ke ${potong(r.kota_tujuan, 60)}` : '';
  return await buatNotifBanyak(sql, [{
    user_id: r.user_id, modul: 'perjadin', jenis: 'peristiwa', kunci,
    tingkat: status, prioritas: ok ? 'info' : 'penting',
    judul: `Perjalanan dinas${tujuan} ${ok ? 'terverifikasi' : 'dikembalikan'}`,
    isi: ok ? (r.tgl_mulai ? fmtTanggal(r.tgl_mulai) : null) : [r.tgl_mulai ? fmtTanggal(r.tgl_mulai) : null, potong(catatan, 120)].filter(Boolean).join(' · ') || null,
    tautan: akses?.boleh ? { halaman: 'perjadin-rekap' } : null,
  }]);
}

// ═════════════════════════════ ABSENSI ═════════════════════════════
// Pengajuan absensi (tugas luar / cuti) punya alur persetujuan: pending -> disetujui | ditolak (ajukan ulang -> pending).
// Ringkasan "menunggu persetujuan" ke admin / absensi.full; hasil (disetujui / ditolak + catatan) ke pemohon.
// Alpa otomatis (netlify/functions/absensi-cron-alpa.js) memberi tahu pegawai yang ditandai Alpa.
const ABSENSI_HALAMAN = 'absensi-harian';
const JENIS_PENGAJUAN = { tugas_luar: 'tugas luar', cuti: 'cuti' };
const rentangTanggal = (a, b) => (!b || a === b ? fmtTanggal(a) : `${fmtTanggal(a)} – ${fmtTanggal(b)}`);

export async function sinkronAbsensi(sql) {
  await ensureNotifSchema(sql);
  const [{ n }] = await sql`SELECT COUNT(*)::int AS n FROM absensi_pengajuan WHERE status_persetujuan = 'pending'`;
  const rows = n > 0
    ? (await userFullAkses(sql, 'absensi.full')).map((u) => ({
        user_id: u.id, modul: 'absensi', jenis: 'kondisi', kunci: 'absensi:pengajuan:menunggu',
        tingkat: 'menunggu', prioritas: 'penting', judul: `${n} pengajuan absensi menunggu persetujuan`,
        isi: 'Buka Absensi untuk menyetujui atau menolak', tautan: { halaman: ABSENSI_HALAMAN },
      }))
    : [];
  const hasil = await rekonsiliasiKondisi(sql, 'absensi', rows);
  // Hasil pengajuan hanya berlaku selama statusnya disetujui / ditolak (ajukan ulang atau dihapus -> ditutup).
  const basi = await sql`
    UPDATE notifikasi SET selesai_at = NOW()
    WHERE modul = 'absensi' AND jenis = 'peristiwa' AND selesai_at IS NULL
      AND starts_with(kunci, 'absensi:pengajuan:') AND right(kunci, 6) = ':hasil'
      AND NOT EXISTS (
        SELECT 1 FROM absensi_pengajuan p
        WHERE p.id = (CASE WHEN split_part(notifikasi.kunci, ':', 3) ~ '^[0-9]+$' THEN split_part(notifikasi.kunci, ':', 3)::int END)
          AND p.status_persetujuan IN ('disetujui', 'ditolak'))
    RETURNING id`;
  return { ...hasil, ditutup: hasil.ditutup + basi.length, menunggu: n };
}

// Peristiwa ke pemohon setelah pengajuan diproses. Status 'pending' (diajukan ulang) menutup hasil sebelumnya.
export async function notifAbsensiPengajuanHasil(sql, pengajuanId, kecuali = null) {
  await ensureNotifSchema(sql);
  const kunci = `absensi:pengajuan:${pengajuanId}:hasil`;
  const [p] = await sql`
    SELECT user_id, status, status_persetujuan, catatan_admin, tanggal::text AS tanggal, tanggal_selesai::text AS tanggal_selesai
    FROM absensi_pengajuan WHERE id = ${pengajuanId} LIMIT 1`;
  if (!p || p.status_persetujuan === 'pending') return await tutupNotifPrefix(sql, kunci);
  if (!p.user_id || p.user_id === kecuali) return 0;
  const [u] = await userAktif(sql, [p.user_id]);
  if (!u) return 0;
  const setuju = p.status_persetujuan === 'disetujui';
  const jenis = JENIS_PENGAJUAN[p.status] || 'absensi';
  const rentang = rentangTanggal(p.tanggal, p.tanggal_selesai);
  return await buatNotifBanyak(sql, [{
    user_id: p.user_id, modul: 'absensi', jenis: 'peristiwa', kunci,
    tingkat: p.status_persetujuan, prioritas: setuju ? 'info' : 'penting',
    judul: `Pengajuan ${jenis} ${setuju ? 'disetujui' : 'ditolak'}`,
    isi: setuju ? rentang : [rentang, potong(p.catatan_admin, 120)].filter(Boolean).join(' · '),
    tautan: { halaman: ABSENSI_HALAMAN },
  }]);
}

// Peristiwa: pegawai ditandai Alpa otomatis oleh cron harian (tanggal = hari kerja kemarin).
export async function notifAbsensiAlpa(sql, tanggal, userIds) {
  const ids = intUnik(userIds);
  if (!ids.length) return 0;
  await ensureNotifSchema(sql);
  return await buatNotifBanyak(sql, (await userAktif(sql, ids)).map((u) => ({
    user_id: u.id, modul: 'absensi', jenis: 'peristiwa', kunci: `absensi:alpa:${tanggal}`,
    prioritas: 'info', judul: `Absensi ${fmtTanggal(tanggal)} ditandai Alpa`,
    isi: 'Tidak ada absensi masuk dan pulang. Hubungi admin bila ini keliru.', tautan: { halaman: ABSENSI_HALAMAN },
  })));
}

// ═════════════════════════════ SISTEM (admin) ═════════════════════════════
// Sumber yang sama dengan badge merah di sidebar (monitoring.js /summary): error berstatus 'baru' dan sys_state.health_status.
// Satu notifikasi persisten selama masih ada error baru (jumlah di isi, tidak mereset status dibaca); hilang saat semua
// error ditandai dilihat/selesai. Badge sidebar tetap ada sebagai indikator tambahan.
export async function sinkronSistem(sql) {
  await ensureNotifSchema(sql);
  const [e] = await sql`SELECT COUNT(*) FILTER (WHERE status = 'baru')::int AS baru FROM sys_error_log`;
  const [h] = await sql`SELECT value FROM sys_state WHERE key = 'health_status'`;
  const admins = await userAdmin(sql);
  const rows = [];
  for (const a of admins) {
    if (e.baru > 0) {
      rows.push({
        user_id: a.id, modul: 'sistem', jenis: 'kondisi', kunci: 'sistem:error-baru', tingkat: 'ada', prioritas: 'peringatan',
        judul: 'Ada error baru di sistem', isi: `${e.baru} error belum ditelaah`, tautan: { halaman: 'pemantauan-sistem' },
      });
    }
    if (h?.value === 'down' || h?.value === 'degraded') {
      const down = h.value === 'down';
      rows.push({
        user_id: a.id, modul: 'sistem', jenis: 'kondisi', kunci: 'sistem:kesehatan', tingkat: h.value, prioritas: down ? 'peringatan' : 'penting',
        judul: down ? 'Kesehatan sistem: DOWN' : 'Kesehatan sistem menurun',
        isi: 'Ada pemeriksaan yang bermasalah. Buka Pemantauan Sistem.', tautan: { halaman: 'pemantauan-sistem' },
      });
    }
  }
  return { ...(await rekonsiliasiKondisi(sql, 'sistem', rows)), error_baru: e.baru, health: h?.value || null };
}

// ═════════════════════════════ KEAMANAN (admin) ═════════════════════════════
// Akun yang sedang terkunci karena salah password berulang (aturan kunci bertingkat di _audit.js, dipakai langsung
// lewat _hitungKunci supaya selalu sama dengan halaman Pengguna). Satu ringkasan ke admin; hilang saat kunci habis
// atau dibuka admin. Hanya akun yang ada dan aktif (percobaan ke NIP yang tidak terdaftar tidak dihitung).
export async function sinkronKeamanan(sql) {
  await ensureNotifSchema(sql);
  const att = await sql`
    SELECT email, EXTRACT(EPOCH FROM (NOW() - attempted_at))::float AS age_sec
    FROM login_attempts
    WHERE attempted_at >= NOW() - (${LOGIN_HISTORY_HOURS}::text || ' hours')::interval
    ORDER BY email, attempted_at ASC`;
  const perNip = {};
  for (const a of att) (perNip[a.email] ||= []).push(Number(a.age_sec));
  const terkunci = Object.keys(perNip).filter((nip) => !_hitungKunci(perNip[nip]).allowed);
  const akun = terkunci.length
    ? await sql`SELECT nama FROM users WHERE BTRIM(nip) = ANY(${terkunci}) AND is_active IS NOT FALSE ORDER BY nama`
    : [];
  const rows = [];
  if (akun.length) {
    const nama = akun.slice(0, 3).map((a) => a.nama).join(', ') + (akun.length > 3 ? ` dan ${akun.length - 3} lainnya` : '');
    for (const a of await userAdmin(sql)) {
      rows.push({
        user_id: a.id, modul: 'keamanan', jenis: 'kondisi', kunci: 'keamanan:akun-terkunci', tingkat: 'terkunci', prioritas: 'peringatan',
        judul: `${akun.length} akun terkunci karena salah password`, isi: nama, tautan: { halaman: 'pengguna' },
      });
    }
  }
  return { ...(await rekonsiliasiKondisi(sql, 'keamanan', rows)), terkunci: akun.length };
}
