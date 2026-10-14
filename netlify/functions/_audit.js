export function getReqMeta(event) {
  const ip = event.headers['x-forwarded-for']?.split(',')[0]?.trim() || '';
  const ua = event.headers['user-agent'] || '';
  return { ip, ua };
}

async function fetchLokasi(ip) {
  if (!ip || ip === '::1' || ip.startsWith('127.') || ip.startsWith('192.168.') || ip.startsWith('10.')) return null;
  try {
    const r = await fetch(`http://ip-api.com/json/${ip}?fields=status,city,regionName,country&lang=id`, {
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
  const lokasi = lokasi_client || await fetchLokasi(ip);
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

export function loginLockMinutes(putaran) {
  const i = Math.min(Math.max(putaran, 1), LOGIN_LOCK_TIERS_MINUTES.length) - 1;
  return LOGIN_LOCK_TIERS_MINUTES[i];
}

export async function checkLoginRateLimit(sql, identifier, ip, maxAttempts = MAX_LOGIN_ATTEMPTS) {
  const rows = await sql`
    SELECT EXTRACT(EPOCH FROM (NOW() - attempted_at))::float AS age_sec
    FROM login_attempts
    WHERE email = ${identifier}
      AND attempted_at >= NOW() - (${LOGIN_HISTORY_HOURS}::text || ' hours')::interval
    ORDER BY attempted_at ASC
  `;
  return _hitungKunci(rows.map(r => Number(r.age_sec)), maxAttempts);
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