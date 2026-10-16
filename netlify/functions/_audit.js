import net from 'node:net';

function _cleanIp(v) {
  const s = String(v || '').trim();
  return net.isIP(s) ? s : '';
}

export function getReqMeta(event) {
  const h = event.headers || {};
  // x-nf-client-connection-ip diisi Netlify. x-forwarded-for hanya cadangan dan wajib berupa IP valid.
  const ip = _cleanIp(h['x-nf-client-connection-ip']) || _cleanIp(String(h['x-forwarded-for'] || '').split(',')[0]);
  const ua = String(h['user-agent'] || '').slice(0, 500);
  return { ip, ua };
}

function _isPrivateIp(ip) {
  if (!ip) return true;
  const v = ip.toLowerCase().replace(/^::ffff:/, '');
  if (v === '::1' || v === '::') return true;
  if (/^(fc|fd|fe80)/.test(v)) return true;
  const m = v.match(/^(\d+)\.(\d+)\./);
  if (!m) return false;
  const a = +m[1], b = +m[2];
  return a === 0 || a === 10 || a === 127 || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168);
}

function _cleanLokasi(v) {
  if (typeof v !== 'string') return null;
  const s = v.replace(/[\u0000-\u001f<>]/g, '').trim().slice(0, 200);
  return s || null;
}

async function fetchLokasi(ip) {
  if (!net.isIP(ip || '') || _isPrivateIp(ip)) return null;
  try {
    // ip-api.com versi gratis hanya mendukung HTTP.
    const r = await fetch(`http://ip-api.com/json/${encodeURIComponent(ip)}?fields=status,city,regionName,country&lang=id`, {
      signal: AbortSignal.timeout(2000),
    });
    if (!r.ok) return null;
    const d = await r.json();
    if (d.status !== 'success') return null;

    const kabKota = d.city ? (/kota/i.test(d.city) ? d.city : `Kabupaten/Kota ${d.city}`) : null;
    const prov = d.regionName ? `Provinsi ${d.regionName}` : null;
    return [kabKota, prov, d.country].filter(Boolean).join(', ') || null;
  } catch {
    return null;
  }
}

export async function logAudit(sql, event, { user_id = null, nama = null, email = null, aksi, entitas = null, entitas_id = null, detail = null, lokasi_client = null }) {
  const { ip } = getReqMeta(event);
  const lokasi = _cleanLokasi(lokasi_client) || await fetchLokasi(ip);
  try {
    await sql`
      INSERT INTO audit_log (user_id, nama, email, aksi, entitas, entitas_id, detail, ip_address, lokasi)
      VALUES (${user_id}, ${nama}, ${email}, ${aksi}, ${entitas}, ${entitas_id},
              ${detail ? JSON.stringify(detail) : null}::jsonb, ${ip}, ${lokasi})
    `;
  } catch (e) {
    console.error('[logAudit]', e);
  }
}

export const MAX_LOGIN_ATTEMPTS   = 3;
export const LOGIN_WINDOW_MINUTES = 15;

export const LOGIN_LOCK_TIERS_MINUTES = [60, 180, 360];
export const LOGIN_HISTORY_HOURS = 24;

// Batas per IP: lebih longgar dari per NIP karena jaringan kantor dipakai bersama banyak pegawai.
// Lock bertingkat dan riwayat 24 jam sama dengan per NIP (30x salah -> 60 mnt, 60x -> 180 mnt, 90x -> 360 mnt).
export const MAX_IP_ATTEMPTS = 30;

// IP lokal (testing di localhost) tidak dihitung per IP, supaya tidak mengunci diri sendiri.
export function _isIpLokal(ip) {
  return !ip || ip === '::1' || ip.startsWith('127.') || ip.startsWith('::ffff:127.');
}

export function loginLockMinutes(putaran) {
  const i = Math.min(Math.max(putaran, 1), LOGIN_LOCK_TIERS_MINUTES.length) - 1;
  return LOGIN_LOCK_TIERS_MINUTES[i];
}

function _gabungKunci(perNip, perIp, adaIp) {
  if (!adaIp) return perNip;
  if (!perNip.allowed || !perIp.allowed) {
    // kalau dua-duanya terkunci, pakai yang lebih lama
    if (perNip.allowed) return perIp;
    if (perIp.allowed) return perNip;
    return perIp.retryAfterSec > perNip.retryAfterSec ? perIp : perNip;
  }
  return { ...perNip, remaining: Math.min(perNip.remaining, perIp.remaining) };
}

export async function checkLoginRateLimit(sql, identifier, ip, maxAttempts = MAX_LOGIN_ATTEMPTS) {
  if (_isIpLokal(ip)) ip = '';
  const [rows, ipRows] = await Promise.all([
    sql`
      SELECT EXTRACT(EPOCH FROM (NOW() - attempted_at))::float AS age_sec
      FROM login_attempts
      WHERE email = ${identifier}
        AND attempted_at >= NOW() - (${LOGIN_HISTORY_HOURS}::text || ' hours')::interval
      ORDER BY attempted_at ASC
    `,
    ip ? sql`
      SELECT EXTRACT(EPOCH FROM (NOW() - attempted_at))::float AS age_sec
      FROM login_attempts
      WHERE ip_address = ${ip}
        AND attempted_at >= NOW() - (${LOGIN_HISTORY_HOURS}::text || ' hours')::interval
      ORDER BY attempted_at ASC
    ` : Promise.resolve([]),
  ]);

  const perNip = _hitungKunci(rows.map(r => Number(r.age_sec)), maxAttempts);
  if (!ip) return perNip;
  const perIp = _hitungKunci(ipRows.map(r => Number(r.age_sec)), MAX_IP_ATTEMPTS);
  return _gabungKunci(perNip, perIp, true);
}

// Mencatat percobaan SEBELUM password diperiksa, lalu menilai apakah percobaan ini boleh lanjut
// berdasarkan percobaan yang tercatat sebelumnya. Dengan begitu request paralel (burst) tidak
// bisa lolos bersamaan dari batas percobaan. Percobaan yang diblokir tidak ikut menaikkan lock.
export async function beginLoginAttempt(sql, identifier, ip, maxAttempts = MAX_LOGIN_ATTEMPTS) {
  const ipCek = _isIpLokal(ip) ? '' : ip;
  const pre = await checkLoginRateLimit(sql, identifier, ip, maxAttempts);
  if (!pre.allowed) return pre;

  const ins = await sql`
    INSERT INTO login_attempts (email, ip_address) VALUES (${identifier}, ${ip || null})
    RETURNING attempted_at::text AS ts
  `;
  const ts = ins[0].ts;

  const [nipRows, ipRows] = await Promise.all([
    sql`
      SELECT EXTRACT(EPOCH FROM (NOW() - attempted_at))::float AS age_sec
      FROM login_attempts
      WHERE email = ${identifier}
        AND attempted_at >= NOW() - (${LOGIN_HISTORY_HOURS}::text || ' hours')::interval
        AND attempted_at <= ${ts}::timestamptz
      ORDER BY attempted_at ASC
    `,
    ipCek ? sql`
      SELECT EXTRACT(EPOCH FROM (NOW() - attempted_at))::float AS age_sec
      FROM login_attempts
      WHERE ip_address = ${ipCek}
        AND attempted_at >= NOW() - (${LOGIN_HISTORY_HOURS}::text || ' hours')::interval
        AND attempted_at <= ${ts}::timestamptz
      ORDER BY attempted_at ASC
    ` : Promise.resolve([]),
  ]);

  // baris terakhir = percobaan ini sendiri (atau yang kembar timestamp, dihitung ketat)
  const priorNip = _hitungKunci(nipRows.slice(0, -1).map(r => Number(r.age_sec)), maxAttempts);
  const priorIp  = ipCek ? _hitungKunci(ipRows.slice(0, -1).map(r => Number(r.age_sec)), MAX_IP_ATTEMPTS) : null;
  const prior = _gabungKunci(priorNip, priorIp, !!ipCek);

  if (!prior.allowed) {
    try { await sql`DELETE FROM login_attempts WHERE email = ${identifier} AND attempted_at = ${ts}::timestamptz`; }
    catch (e) { console.error('[beginLoginAttempt cleanup]', e); }
    return prior;
  }
  return prior;
}

export function _hitungKunci(ages, maxAttempts = MAX_LOGIN_ATTEMPTS) {
  const count    = ages.length;
  const putaran  = Math.floor(count / maxAttempts);
  const sisaPutaran = count - putaran * maxAttempts;
  if (putaran > 0) {
    const lockMin = loginLockMinutes(putaran);
    const retryAfterSec = Math.ceil(lockMin * 60 - ages[putaran * maxAttempts - 1]);
    if (retryAfterSec > 0) {
      return { allowed: false, count, remaining: 0, retryAfterSec, lockMinutes: lockMin };
    }
  }
  return { allowed: true, count, remaining: maxAttempts - sisaPutaran, retryAfterSec: 0, lockMinutes: 0 };
}

export async function recordLoginAttempt(sql, identifier, ip) {
  try {
    await sql`INSERT INTO login_attempts (email, ip_address) VALUES (${identifier}, ${ip})`;
  } catch (e) { console.error('[recordLoginAttempt]', e); }
}

export async function clearLoginAttempts(sql, identifier) {
  try {
    await sql`DELETE FROM login_attempts WHERE email = ${identifier}`;
  } catch (e) { console.error('[clearLoginAttempts]', e); }
}