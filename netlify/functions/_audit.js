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

export const MAX_LOGIN_ATTEMPTS   = 5;
export const LOGIN_WINDOW_MINUTES = 15;

export async function checkLoginRateLimit(sql, identifier, ip, windowMinutes = LOGIN_WINDOW_MINUTES, maxAttempts = MAX_LOGIN_ATTEMPTS) {
  const rows = await sql`
    SELECT COUNT(*)::int AS cnt FROM login_attempts
    WHERE email = ${identifier} AND ip_address = ${ip}
    AND attempted_at >= NOW() - (${windowMinutes}::text || ' minutes')::interval
  `;
  const count = rows[0].cnt;
  return { allowed: count < maxAttempts, count, remaining: Math.max(0, maxAttempts - count) };
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