import { getDb, jsonResponse, errorResponse } from './_db.js';
import { ensureMonSchema, heartbeat, jalankanHealth, kirimTelegram } from './_monitoring.js';
import { sinkronSistem } from './_notif_modul.js';

async function notifSafe(fn) {
  try { await fn(); } catch (e) { console.error('[notif]', e); }
}

export const handler = async () => {
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
