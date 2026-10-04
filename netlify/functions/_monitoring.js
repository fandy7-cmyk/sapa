import crypto from 'crypto';
import { runOnce } from './_db.js';

// ───────── Skema ─────────
// Dipanggil sekali per instance function yang warm (lihat runOnce di _db.js).
export function ensureMonSchema(sql) {
  return runOnce('monitoring_schema', async () => {
    await sql`
      CREATE TABLE IF NOT EXISTS sys_error_log (
        id            SERIAL PRIMARY KEY,
        fingerprint   TEXT NOT NULL UNIQUE,
        source        TEXT NOT NULL DEFAULT 'client',
        message       TEXT NOT NULL,
        stack         TEXT,
        endpoint      TEXT,
        http_status   INT,
        page          TEXT,
        user_id       TEXT,
        nama          TEXT,
        ua            TEXT,
        occurrences   INT NOT NULL DEFAULT 1,
        status        TEXT NOT NULL DEFAULT 'baru',
        first_seen    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        last_seen     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        last_notified TIMESTAMPTZ
      )`;
    await sql`CREATE INDEX IF NOT EXISTS idx_sys_error_status ON sys_error_log (status, last_seen DESC)`;
    await sql`
      CREATE TABLE IF NOT EXISTS sys_perf_log (
        id          BIGSERIAL PRIMARY KEY,
        created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        endpoint    TEXT NOT NULL,
        method      TEXT NOT NULL,
        status      INT NOT NULL,
        duration_ms INT NOT NULL,
        user_id     TEXT
      )`;
    await sql`CREATE INDEX IF NOT EXISTS idx_sys_perf_created ON sys_perf_log (created_at DESC)`;
    await sql`
      CREATE TABLE IF NOT EXISTS sys_heartbeat (
        name     TEXT PRIMARY KEY,
        last_run TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        ok       BOOLEAN NOT NULL DEFAULT TRUE,
        info     TEXT
      )`;
    await sql`
      CREATE TABLE IF NOT EXISTS sys_state (
        key        TEXT PRIMARY KEY,
        value      TEXT,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )`;
  });
}

// ───────── Heartbeat (dipakai cron) ─────────
export async function heartbeat(sql, name, ok = true, info = null) {
  try {
    await ensureMonSchema(sql);
    await sql`
      INSERT INTO sys_heartbeat (name, last_run, ok, info)
      VALUES (${name}, NOW(), ${ok}, ${info})
      ON CONFLICT (name) DO UPDATE SET last_run = NOW(), ok = ${ok}, info = ${info}
    `;
  } catch (e) { console.error('[heartbeat]', e); }
}

// ───────── Normalisasi & fingerprint ─────────
export function normalisasiEndpoint(p) {
  if (!p || typeof p !== 'string') return null;
  let s = p.split('?')[0].split('#')[0];
  if (!s.startsWith('/api/')) return null;
  s = s.replace(/\/[0-9a-f]{8}-[0-9a-f-]{27}/gi, '/:id')   // uuid
       .replace(/\/\d+(?=\/|$)/g, '/:id')                   // angka
       .replace(/\/[0-9a-f]{20,}(?=\/|$)/gi, '/:id');       // hash panjang
  return s.slice(0, 120);
}

export function modulDariEndpoint(ep) {
  const seg = (ep || '').split('/')[2] || '';
  const peta = {
    absensi: 'Absenku', 'absensi-cron-alpa': 'Absenku', lembur: 'Lembur',
    kinerja: 'Kinerja', eplanning: 'e-Planning',
    'surat-masuk': 'Surat', 'surat-keluar': 'Surat',
    links: 'Superlink', bundles: 'Superlink', stats: 'Superlink', redirect: 'Superlink',
    users: 'Master Data', bidang: 'Master Data', pegawai: 'Master Data', periode: 'Master Data',
    profil: 'Master Data', settings: 'Master Data', pengumuman: 'Master Data',
    'dokumen-publik': 'Master Data', ticker: 'Master Data',
    auth: 'Autentikasi', 'audit-trail': 'Audit Trail', upload: 'Upload File',
  };
  return peta[seg] || (seg ? seg : 'Lainnya');
}

export function bikinFingerprint({ source, message, endpoint, http_status, stack }) {
  const msg = String(message || '')
    .replace(/https?:\/\/[^\s)]+/g, '<url>')
    .replace(/[0-9a-f]{8}-[0-9a-f-]{27}/gi, '<uuid>')
    .replace(/\d+/g, '#')
    .slice(0, 200);
  const baris = String(stack || '').split('\n').slice(0, 2).join('|')
    .replace(/https?:\/\/[^/\s]+/g, '').replace(/[?&]v=[\d.]+/g, '').replace(/:\d+:\d+/g, '').slice(0, 200);
  const dasar = [source, endpoint || '', http_status || '', msg, source === 'api' ? '' : baris].join('~');
  return crypto.createHash('sha1').update(dasar).digest('hex');
}

// ───────── Telegram ─────────
export function telegramAktif() {
  return !!(process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_CHAT_ID);
}

export async function kirimTelegram(teks) {
  if (!telegramAktif()) return { ok: false, alasan: 'TELEGRAM_BOT_TOKEN / TELEGRAM_CHAT_ID belum di-set' };
  try {
    const r = await fetch(`https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: process.env.TELEGRAM_CHAT_ID,
        text: String(teks).slice(0, 3500),
        disable_web_page_preview: true,
      }),
      signal: AbortSignal.timeout(3000),
    });
    if (!r.ok) return { ok: false, alasan: `Telegram HTTP ${r.status}` };
    return { ok: true };
  } catch (e) {
    return { ok: false, alasan: e.message };
  }
}

// ───────── Health check ─────────
// status tiap cek: 'ok' | 'warn' | 'down' | 'unknown'
async function cekDatabase(sql) {
  const t0 = Date.now();
  try {
    await sql`SELECT 1`;
    const ms = Date.now() - t0;
    return { key: 'database', nama: 'Database (Neon)', status: ms > 1500 ? 'warn' : 'ok', ms, info: ms > 1500 ? 'Respons lambat' : 'Terhubung' };
  } catch (e) {
    return { key: 'database', nama: 'Database (Neon)', status: 'down', ms: Date.now() - t0, info: e.message };
  }
}

async function cekCloudinary() {
  const cloud = process.env.CLOUDINARY_CLOUD_NAME, key = process.env.CLOUDINARY_API_KEY, secret = process.env.CLOUDINARY_API_SECRET;
  if (!cloud || !key || !secret) return { key: 'cloudinary', nama: 'Cloudinary (file)', status: 'warn', info: 'Env CLOUDINARY_* belum lengkap' };
  const t0 = Date.now();
  try {
    const r = await fetch(`https://api.cloudinary.com/v1_1/${cloud}/ping`, {
      headers: { Authorization: 'Basic ' + Buffer.from(`${key}:${secret}`).toString('base64') },
      signal: AbortSignal.timeout(4000),
    });
    const ms = Date.now() - t0;
    if (r.ok) return { key: 'cloudinary', nama: 'Cloudinary (file)', status: ms > 2500 ? 'warn' : 'ok', ms, info: ms > 2500 ? 'Respons lambat' : 'Terhubung' };
    return { key: 'cloudinary', nama: 'Cloudinary (file)', status: 'down', ms, info: `HTTP ${r.status} (cek API key/secret)` };
  } catch (e) {
    return { key: 'cloudinary', nama: 'Cloudinary (file)', status: 'down', ms: Date.now() - t0, info: e.message };
  }
}

async function cekCron(sql) {
  // Cron absensi jalan tiap hari (heartbeat ditulis juga saat dilewati akhir pekan/libur),
  // jadi 30 jam = telat sekitar 6 jam dari jadwal sudah dianggap macet.
  const batasJam = Number(process.env.CRON_ALPA_MAX_JAM) || 30;
  try {
    const rows = await sql`
      SELECT last_run, ok, info, EXTRACT(EPOCH FROM (NOW() - last_run))/3600 AS umur_jam
      FROM sys_heartbeat WHERE name = 'absensi-cron-alpa'`;
    if (!rows.length) return { key: 'cron_absensi', nama: 'Cron Absensi (Alpa otomatis)', status: 'unknown', info: 'Belum pernah tercatat. Tunggu eksekusi terjadwal berikutnya.' };
    const r = rows[0], umur = Number(r.umur_jam);
    const info = `Terakhir jalan ${Math.round(umur)} jam lalu`;
    if (!r.ok) return { key: 'cron_absensi', nama: 'Cron Absensi (Alpa otomatis)', status: 'down', last_run: r.last_run, info: info + ' (gagal)' };
    if (umur > batasJam) return { key: 'cron_absensi', nama: 'Cron Absensi (Alpa otomatis)', status: 'down', last_run: r.last_run, info: `${info}, melewati batas ${batasJam} jam` };
    return { key: 'cron_absensi', nama: 'Cron Absensi (Alpa otomatis)', status: 'ok', last_run: r.last_run, info };
  } catch (e) {
    return { key: 'cron_absensi', nama: 'Cron Absensi (Alpa otomatis)', status: 'unknown', info: e.message };
  }
}

export async function jalankanHealth(sql, { penuh = true } = {}) {
  await ensureMonSchema(sql).catch(() => {});
  const db = await cekDatabase(sql);
  if (!penuh) return { status: db.status === 'down' ? 'down' : 'ok', checks: [db] };
  const [cld, cron] = await Promise.all([cekCloudinary(), db.status === 'down' ? Promise.resolve({ key: 'cron_absensi', nama: 'Cron Absensi (Alpa otomatis)', status: 'unknown', info: 'Dilewati karena database down' }) : cekCron(sql)]);
  const checks = [db, cld, cron];
  let status = 'ok';
  if (db.status === 'down') status = 'down';
  else if (checks.some(c => c.status === 'down' || c.status === 'warn')) status = 'degraded';
  return { status, checks };
}
