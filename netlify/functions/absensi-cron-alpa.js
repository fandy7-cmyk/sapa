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
        AND EXISTS (SELECT 1 FROM user_permissions up WHERE up.user_id = u.id AND up.menu_key IN ('absensi','absensi.full'))
        AND NOT EXISTS (SELECT 1 FROM absensi a WHERE a.user_id = u.id AND a.tanggal = ${tanggal})
    `;
    let ditandai = 0;
    for (const u of belumAbsen) {
      await sql`
        INSERT INTO absensi
          (user_id, tanggal, jam_masuk, jam_keluar, status, terlambat, menit_terlambat, keterangan, input_by)
        VALUES
          (${u.id}, ${tanggal}, NULL, NULL, 'alpa', false, 0, 'Otomatis: tidak ada absensi masuk & pulang', NULL)
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