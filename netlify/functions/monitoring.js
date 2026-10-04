import { getDb, jsonResponse, errorResponse, parseBody } from './_db.js';
import { requireAuth, requireAdmin } from './_auth.js';
import {
  ensureMonSchema, normalisasiEndpoint, modulDariEndpoint, bikinFingerprint,
  kirimTelegram, telegramAktif,
} from './_monitoring.js';

const potong = (v, n) => (v == null ? null : String(v).slice(0, n));
const MILESTONE_NOTIF = new Set([10, 50, 100, 500, 1000]);

export const handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return jsonResponse({});

  const sql = getDb();
  const path = (event.path.replace(/.*\/monitoring/, '') || '/').replace(/\/+$/, '') || '/';
  const seg = path.split('/').filter(Boolean);
  const m = event.httpMethod;
  const qs = event.queryStringParameters || {};

  try {
    await ensureMonSchema(sql);

    // ───── POST /error  (boleh tanpa login: halaman login juga bisa error) ─────
    if (m === 'POST' && seg[0] === 'error' && !seg[1]) {
      if ((event.body || '').length > 20000) return errorResponse('Payload terlalu besar', 413);
      const b = parseBody(event);
      const user = requireAuth(event);

      const source = ['client', 'promise', 'api', 'network'].includes(b.source) ? b.source : 'client';
      const message = potong(b.message, 500);
      if (!message) return errorResponse('message wajib diisi', 400);
      const endpoint = normalisasiEndpoint(b.endpoint);
      const http_status = Number.isInteger(b.http_status) ? b.http_status : null;
      const stack = potong(b.stack, 4000);
      const fingerprint = bikinFingerprint({ source, message, endpoint, http_status, stack });

      // Pengaman badai error: kalau sudah ada >=60 error baru dalam semenit, tolak yang berikutnya.
      const [{ n: baruSemenit }] = await sql`
        SELECT COUNT(*)::int AS n FROM sys_error_log WHERE first_seen >= NOW() - INTERVAL '1 minute'`;
      if (baruSemenit >= 60) return jsonResponse({ ok: false, dibatasi: true }, 429);

      // Error jaringan murni (sinyal HP jelek, dsb) dicatat, tapi tidak menambah badge/notifikasi.
      const statusAwal = source === 'network' ? 'dilihat' : 'baru';

      const [prev] = await sql`SELECT status FROM sys_error_log WHERE fingerprint = ${fingerprint}`;
      const rows = await sql`
        INSERT INTO sys_error_log
          (fingerprint, source, message, stack, endpoint, http_status, page, user_id, nama, ua, status)
        VALUES
          (${fingerprint}, ${source}, ${message}, ${stack}, ${endpoint}, ${http_status},
           ${potong(b.page, 200)}, ${user ? String(user.id) : null}, ${user ? potong(user.nama, 100) : null},
           ${potong(event.headers['user-agent'], 300)}, ${statusAwal})
        ON CONFLICT (fingerprint) DO UPDATE SET
          occurrences = sys_error_log.occurrences + 1,
          last_seen   = NOW(),
          page        = EXCLUDED.page,
          user_id     = COALESCE(EXCLUDED.user_id, sys_error_log.user_id),
          nama        = COALESCE(EXCLUDED.nama, sys_error_log.nama),
          ua          = EXCLUDED.ua,
          status      = CASE WHEN sys_error_log.status = 'selesai' AND EXCLUDED.source <> 'network'
                             THEN 'baru' ELSE sys_error_log.status END
        RETURNING id, occurrences, status, source, (xmax = 0) AS baru_dibuat
      `;
      const r = rows[0];
      const kambuh = prev?.status === 'selesai' && r.status === 'baru';

      // Notifikasi: error baru, atau jumlah kejadian menyentuh ambang tertentu.
      const perluNotif = r.source !== 'network' && r.status === 'baru' && (r.baru_dibuat || kambuh || MILESTONE_NOTIF.has(r.occurrences));
      if (perluNotif && telegramAktif()) {
        const judul = r.baru_dibuat ? '🔴 Error baru di SAPA'
          : kambuh ? '🟠 Error yang sudah ditandai selesai muncul lagi di SAPA'
          : `🟠 Error berulang (${r.occurrences}x) di SAPA`;
        await kirimTelegram([
          judul,
          message.slice(0, 300),
          endpoint ? `Endpoint: ${endpoint}${http_status ? ' (' + http_status + ')' : ''}` : null,
          b.page ? `Halaman: ${potong(b.page, 100)}` : null,
          user?.nama ? `Pengguna: ${potong(user.nama, 60)}` : null,
        ].filter(Boolean).join('\n'));
        await sql`UPDATE sys_error_log SET last_notified = NOW() WHERE id = ${r.id}`;
      }
      return jsonResponse({ ok: true });
    }

    // ───── POST /perf  (batch dari browser, wajib login) ─────
    if (m === 'POST' && seg[0] === 'perf') {
      const user = requireAuth(event);
      if (!user) return errorResponse('Unauthorized', 401);
      if ((event.body || '').length > 30000) return errorResponse('Payload terlalu besar', 413);
      const items = Array.isArray(parseBody(event).items) ? parseBody(event).items.slice(0, 60) : [];
      const bersih = [];
      for (const it of items) {
        const ep = normalisasiEndpoint(it.endpoint);
        const ms = Math.round(Number(it.ms));
        const st = Math.round(Number(it.status));
        const mt = String(it.method || 'GET').toUpperCase().slice(0, 8);
        if (!ep || !Number.isFinite(ms) || ms < 0 || ms > 600000 || !Number.isFinite(st)) continue;
        bersih.push({ endpoint: ep, method: mt, status: st, ms, user_id: String(user.id) });
      }
      if (bersih.length) {
        await sql`
          INSERT INTO sys_perf_log (endpoint, method, status, duration_ms, user_id)
          SELECT x.endpoint, x.method, x.status, x.ms, x.user_id
          FROM jsonb_to_recordset(${JSON.stringify(bersih)}::jsonb)
            AS x(endpoint text, method text, status int, ms int, user_id text)
        `;
      }
      // Pembersihan ringan di sela traffic normal (cron juga melakukannya).
      if (Math.random() < 0.02) {
        await sql`DELETE FROM sys_perf_log WHERE created_at < NOW() - INTERVAL '7 days'`;
      }
      return jsonResponse({ ok: true, diterima: bersih.length });
    }

    // ───── Semua endpoint di bawah ini khusus admin ─────
    const admin = requireAdmin(event);
    if (!admin) return errorResponse('Unauthorized', 401);

    // GET /summary  -> dipakai badge sidebar (dipanggil berkala, harus murah)
    if (m === 'GET' && seg[0] === 'summary') {
      const [[e], st] = await Promise.all([
        sql`SELECT COUNT(*) FILTER (WHERE status = 'baru')::int AS baru,
                   COUNT(*) FILTER (WHERE last_seen >= NOW() - INTERVAL '24 hours')::int AS h24
            FROM sys_error_log`,
        sql`SELECT value, updated_at FROM sys_state WHERE key = 'health_status'`,
      ]);
      return jsonResponse({
        error_baru: e.baru, error_24h: e.h24,
        health: st[0]?.value || null, health_updated: st[0]?.updated_at || null,
        telegram: telegramAktif(),
      });
    }

    // GET /errors
    if (m === 'GET' && seg[0] === 'errors' && !seg[1]) {
      const page = Math.max(1, parseInt(qs.page) || 1);
      const limit = Math.min(50, Math.max(1, parseInt(qs.limit) || 15));
      const statusF = ['baru', 'dilihat', 'selesai'].includes(qs.status) ? qs.status : null;
      const q = `%${qs.q || ''}%`;
      const [rows, [{ total }]] = await Promise.all([
        sql`SELECT * FROM sys_error_log
            WHERE (${statusF}::text IS NULL OR status = ${statusF}::text)
              AND (message ILIKE ${q} OR COALESCE(endpoint,'') ILIKE ${q} OR COALESCE(nama,'') ILIKE ${q})
            ORDER BY last_seen DESC LIMIT ${limit} OFFSET ${(page - 1) * limit}`,
        sql`SELECT COUNT(*)::int AS total FROM sys_error_log
            WHERE (${statusF}::text IS NULL OR status = ${statusF}::text)
              AND (message ILIKE ${q} OR COALESCE(endpoint,'') ILIKE ${q} OR COALESCE(nama,'') ILIKE ${q})`,
      ]);
      return jsonResponse({ errors: rows, total, page, limit });
    }

    // POST /errors/mark-all   body: { dari: 'baru', ke: 'dilihat' }
    if (m === 'POST' && seg[0] === 'errors' && seg[1] === 'mark-all') {
      const b = parseBody(event);
      const dari = ['baru', 'dilihat'].includes(b.dari) ? b.dari : 'baru';
      const ke = ['dilihat', 'selesai'].includes(b.ke) ? b.ke : 'dilihat';
      const r = await sql`UPDATE sys_error_log SET status = ${ke} WHERE status = ${dari} RETURNING id`;
      return jsonResponse({ ok: true, diubah: r.length });
    }

    // PATCH /errors/:id   body: { status }
    if (m === 'PATCH' && seg[0] === 'errors' && seg[1]) {
      const id = parseInt(seg[1]);
      const st = parseBody(event).status;
      if (!id || !['baru', 'dilihat', 'selesai'].includes(st)) return errorResponse('Data tidak valid', 400);
      await sql`UPDATE sys_error_log SET status = ${st} WHERE id = ${id}`;
      return jsonResponse({ ok: true });
    }

    // GET /performance?jam=24
    if (m === 'GET' && seg[0] === 'performance') {
      const jam = Math.min(168, Math.max(1, parseInt(qs.jam) || 24));
      const [rows, [tot]] = await Promise.all([
        sql`SELECT endpoint,
                   COUNT(*)::int AS n,
                   ROUND(AVG(duration_ms))::int AS avg_ms,
                   ROUND(percentile_cont(0.95) WITHIN GROUP (ORDER BY duration_ms))::int AS p95_ms,
                   MAX(duration_ms)::int AS max_ms,
                   COUNT(*) FILTER (WHERE status >= 500 OR status = 0)::int AS n_error
            FROM sys_perf_log
            WHERE created_at >= NOW() - (${jam}::int * INTERVAL '1 hour')
            GROUP BY endpoint ORDER BY p95_ms DESC LIMIT 25`,
        sql`SELECT COUNT(*)::int AS n,
                   COALESCE(ROUND(AVG(duration_ms))::int, 0) AS avg_ms,
                   COALESCE(ROUND(percentile_cont(0.95) WITHIN GROUP (ORDER BY duration_ms))::int, 0) AS p95_ms
            FROM sys_perf_log WHERE created_at >= NOW() - (${jam}::int * INTERVAL '1 hour')`,
      ]);
      return jsonResponse({ jam, total: tot, endpoints: rows });
    }

    // GET /usage?hari=7
    if (m === 'GET' && seg[0] === 'usage') {
      const hari = Math.min(30, Math.max(1, parseInt(qs.hari) || 7));
      const [perSeg, perJam, aktif, [u24]] = await Promise.all([
        sql`SELECT split_part(endpoint, '/', 3) AS seg, user_id, COUNT(*)::int AS n
            FROM sys_perf_log
            WHERE created_at >= NOW() - (${hari}::int * INTERVAL '1 day') AND user_id IS NOT NULL
            GROUP BY 1, 2`,
        sql`SELECT EXTRACT(HOUR FROM created_at AT TIME ZONE 'Asia/Makassar')::int AS jam,
                   COUNT(*)::int AS n, COUNT(DISTINCT user_id)::int AS u
            FROM sys_perf_log
            WHERE created_at >= NOW() - (${hari}::int * INTERVAL '1 day')
            GROUP BY 1 ORDER BY 1`,
        sql`SELECT p.user_id, MAX(p.created_at) AS terakhir, MAX(u.nama) AS nama
            FROM sys_perf_log p LEFT JOIN users u ON u.id::text = p.user_id
            WHERE p.created_at >= NOW() - INTERVAL '15 minutes' AND p.user_id IS NOT NULL
            GROUP BY p.user_id ORDER BY terakhir DESC LIMIT 12`,
        sql`SELECT COUNT(DISTINCT user_id)::int AS n FROM sys_perf_log WHERE created_at >= NOW() - INTERVAL '24 hours'`,
      ]);
      const modul = new Map();
      for (const r of perSeg) {
        const nama = modulDariEndpoint('/api/' + r.seg);
        if (!modul.has(nama)) modul.set(nama, { modul: nama, hits: 0, users: new Set() });
        const o = modul.get(nama); o.hits += r.n; o.users.add(r.user_id);
      }
      const daftarModul = [...modul.values()]
        .map(o => ({ modul: o.modul, hits: o.hits, pengguna: o.users.size }))
        .sort((a, b) => b.hits - a.hits);
      return jsonResponse({ hari, pengguna_24h: u24.n, aktif_sekarang: aktif, modul: daftarModul, per_jam: perJam });
    }

    // GET /security
    if (m === 'GET' && seg[0] === 'security') {
      const [ringkas, terbaru] = await Promise.all([
        sql`SELECT aksi,
                   COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '24 hours')::int AS h24,
                   COUNT(*)::int AS h7
            FROM audit_log
            WHERE created_at >= NOW() - INTERVAL '7 days'
              AND aksi IN ('login_failed','login_blocked','refresh_token_reuse_detected','force_logout','unlock_login')
            GROUP BY aksi`,
        sql`SELECT created_at, aksi, nama, email, ip_address, lokasi, detail
            FROM audit_log
            WHERE aksi IN ('login_failed','login_blocked','refresh_token_reuse_detected')
            ORDER BY created_at DESC LIMIT 100`,
      ]);
      return jsonResponse({ ringkasan: ringkas, terbaru });
    }

    // POST /test-notif
    if (m === 'POST' && seg[0] === 'test-notif') {
      const r = await kirimTelegram('✅ Tes notifikasi SAPA: koneksi bot Telegram berhasil.');
      return jsonResponse(r, r.ok ? 200 : 400);
    }

    return errorResponse('Endpoint tidak ditemukan', 404);
  } catch (err) {
    console.error('[/api/monitoring]', err);
    return errorResponse('Gagal memproses pemantauan: ' + err.message);
  }
};
