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

export const MAX_LOGIN_ATTEMPTS   = 3;          // jumlah salah per "putaran" sebelum terkunci
export const LOGIN_WINDOW_MINUTES = 15;         // (lama, dipertahankan buat kompatibilitas import)

// Kunci bertingkat: tiap kelipatan MAX_LOGIN_ATTEMPTS salah berturut-turut, waktu tunggu naik.
// Putaran ke-1 (salah ke-3)  -> 60 menit (1 jam)
// Putaran ke-2 (salah ke-6)  -> 180 menit (3 jam)
// Putaran ke-3+ (ke-9 dst)   -> 360 menit (6 jam, mentok di sini)
export const LOGIN_LOCK_TIERS_MINUTES = [60, 180, 360];
// Riwayat salah dihitung sejauh ini; kalau gak ada percobaan salah selama itu, hitungan mulai dari nol lagi.
export const LOGIN_HISTORY_HOURS = 24;

export function loginLockMinutes(putaran) {
  const i = Math.min(Math.max(putaran, 1), LOGIN_LOCK_TIERS_MINUTES.length) - 1;
  return LOGIN_LOCK_TIERS_MINUTES[i];
}

// Hitung status kunci dari riwayat percobaan salah per identifier (NIP) saja - IP sengaja tidak dihitung,
// jadi ganti IP/pakai data seluler tidak mengulang hitungan. (param ip tetap ada biar pemanggil lama gak rusak)
// Return: { allowed, count, remaining, retryAfterSec, lockMinutes }
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

// ages: umur tiap percobaan salah (detik), urut dari yang paling lama.
export function _hitungKunci(ages, maxAttempts = MAX_LOGIN_ATTEMPTS) {
  const count    = ages.length;
  const putaran  = Math.floor(count / maxAttempts);   // sudah berapa kali kena kunci
  const sisaPutaran = count - putaran * maxAttempts;  // salah di putaran berjalan
  if (putaran > 0) {
    // Kunci dipicu saat percobaan salah ke-(putaran*max). Waktu tunggu dihitung dari saat itu.
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