import { getDb, jsonResponse, errorResponse } from './_db.js';
import { ensureMonSchema, heartbeat, jalankanHealth, kirimTelegram } from './_monitoring.js';
import { sinkronSistem } from './_notif_modul.js';

async function notifSafe(fn) {
  try { await fn(); } catch (e) { console.error('[notif]', e); }
}

// Hemat kuota Neon: di luar jam kerja (WITA) dan di akhir pekan, cek penuh hanya
// di menit 0-14 tiap jam (1x/jam). Di jam kerja tetap tiap 15 menit, karena DB
// memang sedang dipakai pegawai. Putaran yang dilewati tidak menyentuh DB sama sekali.
// Set MON_CRON_PENUH=1 di env Netlify untuk mengembalikan perilaku lama (tiap 15 menit, 24 jam).
const TZ_MON = 'Asia/Makassar';
const JAM_KERJA_MULAI = 7;
const JAM_KERJA_SELESAI = 18;

function perluJalan() {
  if (process.env.MON_CRON_PENUH === '1') return true;
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: TZ_MON, hour12: false, hour: '2-digit', minute: '2-digit', weekday: 'short',
  }).formatToParts(new Date());
  const get = (t) => parts.find(p => p.type === t)?.value;
  const jam = parseInt(get('hour'), 10) % 24;
  const menit = parseInt(get('minute'), 10);
  const hariKerja = !['Sat', 'Sun'].includes(get('weekday'));
  const jamKerja = hariKerja && jam >= JAM_KERJA_MULAI && jam < JAM_KERJA_SELESAI;
  return jamKerja || menit < 15;
}

export const handler = async () => {
  if (!perluJalan()) return jsonResponse({ dilewati: 'di luar jam kerja' });
  const sql = getDb();
  try {
    await ensureMonSchema(sql);
    const h = await jalankanHealth(sql, { penuh: true });

    const [lama] = await sql`SELECT value FROM sys_state WHERE key = 'health_status'`;
    const statusLama = lama?.value || null;
    await sql`
      INSERT INTO sys_state (key, value, updated_at) VALUES ('health_status', ${h.status}, NOW())
      ON CONFLICT (key) DO UPDATE SET value = ${h.status}, updated_at = NOW()
    `;

    if (statusLama !== h.status && !(statusLama === null && h.status === 'ok')) {
      const bermasalah = h.checks.filter(c => c.status === 'down' || c.status === 'warn');
      if (h.status === 'ok') {
        await kirimTelegram('✅ SAPA pulih: semua pemeriksaan kesehatan kembali normal.');
      } else {
        const ikon = h.status === 'down' ? '🔴' : '🟠';
        await kirimTelegram([
          `${ikon} Kesehatan SAPA: ${h.status === 'down' ? 'DOWN' : 'menurun'}`,
          ...bermasalah.map(c => `• ${c.nama}: ${c.info}`),
        ].join('\n'));
      }
    }

    await notifSafe(() => sinkronSistem(sql));

    await sql`DELETE FROM sys_perf_log WHERE created_at < NOW() - INTERVAL '7 days'`;
    await sql`DELETE FROM sys_error_log WHERE status = 'selesai' AND last_seen < NOW() - INTERVAL '30 days'`;

    await heartbeat(sql, 'monitoring-cron', true, h.status);
    return jsonResponse({ status: h.status });
  } catch (err) {
    console.error('[monitoring-cron]', err);
    return errorResponse('Gagal menjalankan monitoring-cron');
  }
};
