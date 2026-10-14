import { getDb, jsonResponse, errorResponse } from './_db.js';
import { heartbeat } from './_monitoring.js';
import { ensureNotifSchema, sinkronSuratMasuk, bersihkanNotifikasi } from './_notif.js';
import {
  sinkronLembur, sinkronKinerjaVerifikasi, sinkronPeriode, sinkronPerjadin, sinkronAbsensi, sinkronSistem, sinkronKeamanan,
} from './_notif_modul.js';

// Dijadwalkan via netlify.toml (tiap jam). Function terpisah dari API notifikasi.js karena Netlify tidak mengizinkan
// satu function menjadi scheduled function sekaligus endpoint HTTP biasa (pola yang sama dengan absensi-cron-alpa).
// Tugas: rekonsiliasi notifikasi kondisi tiap modul (buat / naikkan tingkat / tutup) dan bersihkan notifikasi lama.
// Idempotent: tingkat dihitung dari tanggal & data terkini, jadi aman dijalankan ulang kapan saja.
// Tiap modul dijalankan terpisah: kegagalan satu modul (mis. tabelnya belum ada) tidak menghentikan modul lain.
const TUGAS = [
  ['surat-masuk', sinkronSuratMasuk],
  ['lembur', sinkronLembur],
  ['kinerja-verifikasi', sinkronKinerjaVerifikasi],
  ['periode', sinkronPeriode],
  ['perjadin', sinkronPerjadin],
  ['absensi', sinkronAbsensi],
  ['sistem', sinkronSistem],
  ['keamanan', sinkronKeamanan],
];

async function jalankan() {
  const sql = getDb();
  try {
    await ensureNotifSchema(sql);
    const hasil = {}, gagal = [];
    for (const [nama, fn] of TUGAS) {
      try { hasil[nama] = await fn(sql); }
      catch (err) { console.error(`[notif-cron] ${nama}`, err); gagal.push(nama); hasil[nama] = { error: err.message }; }
    }
    const dibersihkan = await bersihkanNotifikasi(sql);
    console.log(`[notif-cron] ${JSON.stringify(hasil)} dibersihkan=${dibersihkan}`);
    return { res: jsonResponse({ hasil, dibersihkan, gagal }, gagal.length ? 207 : 200), gagal };
  } catch (err) {
    console.error('[notif-cron]', err);
    return { res: errorResponse('Gagal menjalankan notif-cron: ' + err.message), gagal: ['inti'] };
  }
}

// Catat denyut agar halaman Pemantauan Sistem tahu cron ini masih hidup (ok=false bila ada modul yang gagal).
export const handler = async () => {
  const { res, gagal } = await jalankan();
  await heartbeat(getDb(), 'notif-cron', gagal.length === 0, gagal.length ? `Gagal: ${gagal.join(', ')}` : `HTTP ${res.statusCode}`);
  return res;
};
