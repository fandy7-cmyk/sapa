// netlify/functions/absensi-cron-alpa.js
//
// CRON: auto-tandai Alpa (dipicu scheduled invocation, lihat netlify.toml)
// Dipisah dari absensi.js karena Netlify TIDAK MENGIZINKAN satu function
// dipakai sekaligus sebagai "scheduled function" DAN endpoint HTTP biasa —
// begitu sebuah function terdaftar dgn `schedule` di netlify.toml, request
// HTTP normal ke function itu ditolak (dev: pesan "which is a scheduled
// function"; production: function jadi gak bisa diakses via HTTP publik).
// Sebelumnya absensi.js dipakai dobel (endpoint /api/absensi/* SEKALIGUS
// cron), makanya SEMUA request ke /api/absensi/* ikut kena block.
//
// Cek isinya sama persis dgn jalankanCronAlpa() versi lama di absensi.js.

import { getDb, jsonResponse, errorResponse } from './_db.js';

const TZ = 'Asia/Makassar';

function kemarinStr() {
  const now = new Date();
  const kemarin = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  return new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit' }).format(kemarin);
}

export const handler = async (event) => {
  const sql = getDb();
  const tanggal = kemarinStr();
  try {
    const dow = new Date(`${tanggal}T00:00:00`).getDay();
    if (dow === 0 || dow === 6) {
      console.log(`[cron-alpa] lewati ${tanggal}: akhir pekan`);
      return jsonResponse({ tanggal, dilewati: 'akhir pekan' });
    }
    const libur = await sql`SELECT keterangan FROM hari_libur WHERE tanggal = ${tanggal} LIMIT 1`;
    if (libur.length) {
      console.log(`[cron-alpa] lewati ${tanggal}: hari libur (${libur[0].keterangan})`);
      return jsonResponse({ tanggal, dilewati: `hari libur: ${libur[0].keterangan}` });
    }
    const belumAbsen = await sql`
      SELECT u.id FROM users u
      WHERE u.is_admin = false
        AND NOT EXISTS (SELECT 1 FROM absensi a WHERE a.user_id = u.id AND a.tanggal = ${tanggal})
    `;
    let ditandai = 0;
    for (const u of belumAbsen) {
      await sql`
        INSERT INTO absensi
          (user_id, tanggal, jam_masuk, jam_keluar, status, terlambat, menit_terlambat, keterangan, input_by)
        VALUES
          (${u.id}, ${tanggal}, NULL, NULL, 'alpa', false, 0, 'Otomatis: tidak ada absen masuk & pulang', NULL)
      `;
      ditandai++;
    }
    console.log(`[cron-alpa] ${tanggal}: ${ditandai} pegawai ditandai Alpa otomatis`);
    return jsonResponse({ tanggal, ditandai });
  } catch (err) {
    console.error('[cron-alpa]', err);
    return errorResponse('Gagal menjalankan cron alpa');
  }
};
