import bcrypt from 'bcryptjs';
import { getDb, jsonResponse, errorResponse, parseBody, runOnce } from './_db.js';
import { signToken, requireAuth, generateRefreshToken, hashRefreshToken, validatePassword, hashPassword, needsRehash, BCRYPT_COST, LEGACY_DEFAULT_PASSWORD, SESSION_MAX_MS } from './_auth.js';
import { logAudit, getReqMeta, checkLoginRateLimit, beginLoginAttempt, clearLoginAttempts } from './_audit.js';
import { sinkronKeamanan } from './_notif_modul.js';

async function notifSafe(fn) {
  try { await fn(); } catch (e) { console.error('[notif]', e); }
}

function _fmtTunggu(sec) {
  const m = Math.max(1, Math.ceil(sec / 60));
  if (m < 60) return `${m} menit`;
  const j = Math.floor(m / 60), r = m % 60;
  return r ? `${j} jam ${r} menit` : `${j} jam`;
}
function _blokir(sec, menit) {
  return errorResponse(`Terlalu banyak percobaan login. Coba lagi dalam ${_fmtTunggu(sec)}.`, 429, { retry_after_detik: sec, lock_menit: menit });
}

let _dummyHashP = null;
function _dummyHash() {
  if (!_dummyHashP) _dummyHashP = bcrypt.hash('dummy-password-untuk-timing', BCRYPT_COST);
  return _dummyHashP;
}

async function ensureAuthCols(sql) {
  await runOnce('users.is_active', () => sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE`);
  await runOnce('users.must_change_password', () => sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS must_change_password BOOLEAN NOT NULL DEFAULT FALSE`);
  await runOnce('refresh_tokens.session_started_at', () => sql`ALTER TABLE refresh_tokens ADD COLUMN IF NOT EXISTS session_started_at TIMESTAMPTZ`);
}

function _accessPayload(user, mustChange) {
  return { id: user.id, email: user.email, nama: user.nama, is_admin: user.is_admin, ...(mustChange ? { mcp: true } : {}) };
}

export const handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return jsonResponse({});

  const sql = getDb();
  const path = event.path.replace(/.*\/auth/, '');

  if (event.httpMethod === 'POST' && path === '/lock-status') {
    const { nip } = parseBody(event);
    if (!nip) return jsonResponse({ terkunci: false, retry_after_detik: 0 });
    try {
      const st = await checkLoginRateLimit(sql, String(nip).trim(), '');
      return jsonResponse({ terkunci: !st.allowed, retry_after_detik: st.allowed ? 0 : st.retryAfterSec });
    } catch (err) {
      console.error('[POST /api/auth/lock-status]', err);
      return errorResponse('Server error', 500);
    }
  }

  if (event.httpMethod === 'POST' && path === '/login') {
    const { nip, password, lokasi } = parseBody(event);
    if (!nip || !password) return errorResponse('Username dan password wajib diisi', 400);
    if ((typeof nip !== 'string' && typeof nip !== 'number') || typeof password !== 'string' || password.length > 256) {
      return errorResponse('Format login tidak valid', 400);
    }

    const nipNorm = String(nip).trim().slice(0, 64);
    const { ip } = getReqMeta(event);

    try {
      // Percobaan dicatat lebih dulu (atomik terhadap request paralel), baru password diperiksa.
      const gate = await beginLoginAttempt(sql, nipNorm, ip);
      if (!gate.allowed) {
        await logAudit(sql, event, { aksi: 'login_blocked', detail: { nip: nipNorm }, lokasi_client: lokasi });
        return _blokir(gate.retryAfterSec, gate.lockMinutes);
      }

      await runOnce('users.tanda_tangan', () => sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS tanda_tangan TEXT`);
      await runOnce('users.jabatan', () => sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS jabatan TEXT`);
      await ensureAuthCols(sql);
      const rows = await sql`
        SELECT u.*, b.nama AS bidang_nama, b.singkatan AS bidang_singkatan
        FROM users u
        LEFT JOIN bidang b ON b.id = u.bidang_id
        WHERE u.nip = ${nipNorm} LIMIT 1
      `;
      const user = rows[0] || null;

      // Selalu jalankan bcrypt (hash dummy bila NIP tidak ada) supaya waktu respons tidak membocorkan keberadaan akun.
      const hashUji = (user && user.password_hash) ? user.password_hash : await _dummyHash();
      const cocok = await bcrypt.compare(password, hashUji);
      const valid = !!user && cocok;

      if (!valid) {
        await logAudit(sql, event, {
          user_id: user?.id ?? null, nama: user?.nama ?? null, email: user?.email ?? null,
          aksi: 'login_failed',
          detail: { nip: nipNorm, reason: user ? 'wrong_password' : 'nip_not_found' },
          lokasi_client: lokasi,
        });
        const after = await checkLoginRateLimit(sql, nipNorm, ip);
        if (!after.allowed) {
          await notifSafe(() => sinkronKeamanan(sql));
          return _blokir(after.retryAfterSec, after.lockMinutes);
        }
        return errorResponse('Username atau password salah', 401, { sisa_percobaan: after.remaining });
      }

      if (user.is_active === false) {
        await clearLoginAttempts(sql, nipNorm);
        await logAudit(sql, event, { user_id: user.id, nama: user.nama, email: user.email, aksi: 'login_failed', detail: { nip: nipNorm, reason: 'user_inactive' }, lokasi_client: lokasi });
        return errorResponse('Akun Anda dinonaktifkan, hubungi admin', 403);
      }

      // Akun lama yang masih memakai password default otomatis diwajibkan ganti password.
      let mustChange = user.must_change_password === true;
      if (!mustChange && password === LEGACY_DEFAULT_PASSWORD) {
        mustChange = true;
        await sql`UPDATE users SET must_change_password = TRUE WHERE id = ${user.id}`;
      }

      if (!mustChange && needsRehash(user.password_hash)) {
        try {
          const baru = await hashPassword(password);
          await sql`UPDATE users SET password_hash = ${baru} WHERE id = ${user.id}`;
        } catch (e) { console.error('[login rehash]', e); }
      }

      await sql`UPDATE users SET last_login = NOW() WHERE id = ${user.id}`;
      await clearLoginAttempts(sql, nipNorm);
      await logAudit(sql, event, { user_id: user.id, nama: user.nama, email: user.email, aksi: 'login_success', lokasi_client: lokasi });

      let permissions = [];
      if (!user.is_admin) {
        const perms = await sql`SELECT menu_key FROM user_permissions WHERE user_id = ${user.id}`;
        permissions = perms.map(p => p.menu_key);
      }

      const token = signToken(_accessPayload(user, mustChange));

      const { token: refreshToken, hash, expires_at } = generateRefreshToken();
      await sql`
        INSERT INTO refresh_tokens (user_id, token_hash, expires_at, ip_address, user_agent, session_started_at)
        VALUES (${user.id}, ${hash}, ${expires_at.toISOString()}, ${ip}, ${event.headers['user-agent'] || null}, NOW())
      `;

      return jsonResponse({
        token,
        refresh_token: refreshToken,
        user: {
          id: user.id, nama: user.nama, nip: user.nip, email: user.email, is_admin: user.is_admin,
          bidang_id: user.bidang_id, bidang_nama: user.bidang_nama || null,
          bidang_singkatan: user.bidang_singkatan || null, permissions,
          jabatan: user.jabatan || null,
          tanda_tangan: user.tanda_tangan || null,
          must_change_password: mustChange,
        },
      });
    } catch (err) {
      console.error(err);
      return errorResponse('Server error', 500);
    }
  }

  if (event.httpMethod === 'POST' && path === '/refresh') {
    const { refresh_token } = parseBody(event);
    if (!refresh_token) return errorResponse('Refresh token wajib diisi', 400);
    const { ip } = getReqMeta(event);
    const hash = hashRefreshToken(refresh_token);

    try {
      await ensureAuthCols(sql);
      const rows = await sql`SELECT * FROM refresh_tokens WHERE token_hash = ${hash} LIMIT 1`;
      if (!rows.length) return errorResponse('Refresh token tidak valid', 401);
      const rt = rows[0];

      if (rt.revoked_at) {
        await sql`UPDATE refresh_tokens SET revoked_at = NOW() WHERE user_id = ${rt.user_id} AND revoked_at IS NULL`;
        await logAudit(sql, event, { user_id: rt.user_id, aksi: 'refresh_token_reuse_detected', detail: { refresh_token_id: rt.id } });
        return errorResponse('Sesi dicurigai bermasalah, silakan login ulang', 401);
      }
      if (new Date(rt.expires_at) < new Date()) {
        return errorResponse('Refresh token kedaluwarsa, silakan login ulang', 401);
      }

      // Batas absolut umur sesi: setelah itu wajib login ulang walau refresh token masih berlaku.
      const sessionStart = new Date(rt.session_started_at || rt.created_at || Date.now());
      if (Date.now() - sessionStart.getTime() > SESSION_MAX_MS) {
        await sql`UPDATE refresh_tokens SET revoked_at = NOW() WHERE id = ${rt.id} AND revoked_at IS NULL`;
        return errorResponse('Sesi berakhir, silakan login ulang', 401);
      }

      const userRows = await sql`SELECT id, nama, email, is_admin, is_active, must_change_password FROM users WHERE id = ${rt.user_id} LIMIT 1`;
      if (!userRows.length) return errorResponse('User tidak ditemukan', 404);
      const user = userRows[0];
      if (user.is_active === false) return errorResponse('Akun Anda dinonaktifkan, hubungi admin', 403);

      const { token: newRefreshToken, hash: newHash, expires_at } = generateRefreshToken();
      await sql`
        INSERT INTO refresh_tokens (user_id, token_hash, expires_at, ip_address, user_agent, session_started_at)
        VALUES (${user.id}, ${newHash}, ${expires_at.toISOString()}, ${ip}, ${event.headers['user-agent'] || null}, ${sessionStart.toISOString()})
      `;
      await sql`UPDATE refresh_tokens SET revoked_at = NOW(), replaced_by = ${newHash} WHERE id = ${rt.id}`;

      const newAccessToken = signToken(_accessPayload(user, user.must_change_password === true));
      return jsonResponse({ token: newAccessToken, refresh_token: newRefreshToken });
    } catch (err) {
      console.error('[POST /api/auth/refresh]', err);
      return errorResponse('Server error', 500);
    }
  }

  if (event.httpMethod === 'POST' && path === '/logout') {
    const { refresh_token } = parseBody(event);
    if (refresh_token) {
      try {
        const hash = hashRefreshToken(refresh_token);
        await sql`UPDATE refresh_tokens SET revoked_at = NOW() WHERE token_hash = ${hash} AND revoked_at IS NULL`;
      } catch (err) { console.error('[POST /api/auth/logout]', err); }
    }
    return jsonResponse({ ok: true });
  }

  if (event.httpMethod === 'POST' && path === '/logout-all') {
    const auth = requireAuth(event);
    if (!auth) return errorResponse('Unauthorized', 401);
    try {
      await sql`UPDATE refresh_tokens SET revoked_at = NOW() WHERE user_id = ${auth.id} AND revoked_at IS NULL`;
      await logAudit(sql, event, { user_id: auth.id, nama: auth.nama, email: auth.email, aksi: 'logout_all' });
      return jsonResponse({ ok: true });
    } catch (err) {
      console.error('[POST /api/auth/logout-all]', err);
      return errorResponse('Server error', 500);
    }
  }

  if (event.httpMethod === 'GET' && path === '/me') {
    const auth = requireAuth(event);
    if (!auth) return errorResponse('Unauthorized', 401);
    try {
      await runOnce('users.tanda_tangan', () => sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS tanda_tangan TEXT`);
      await runOnce('users.jabatan', () => sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS jabatan TEXT`);
      await ensureAuthCols(sql);
      const rows = await sql`
        SELECT u.id, u.nama, u.email, u.is_admin, u.bidang_id, u.tanda_tangan, u.jabatan, u.is_active, u.must_change_password,
               b.nama AS bidang_nama, b.singkatan AS bidang_singkatan
        FROM users u LEFT JOIN bidang b ON b.id = u.bidang_id
        WHERE u.id = ${auth.id} LIMIT 1
      `;
      if (!rows.length) return errorResponse('User tidak ditemukan', 404);
      const user = rows[0];
      if (user.is_active === false) return errorResponse('Akun Anda dinonaktifkan, hubungi admin', 403);
      let permissions = [];
      if (!user.is_admin) {
        const perms = await sql`SELECT menu_key FROM user_permissions WHERE user_id = ${user.id}`;
        permissions = perms.map(p => p.menu_key);
      }
      return jsonResponse({ user: { ...user, must_change_password: user.must_change_password === true, permissions } });
    } catch (err) {
      console.error(err);
      return errorResponse('Server error', 500);
    }
  }

  if (event.httpMethod === 'POST' && path === '/change-password') {
    const auth = requireAuth(event);
    if (!auth) return errorResponse('Unauthorized', 401);
    const { password_lama, password_baru } = parseBody(event);
    if (!password_lama || !password_baru) return errorResponse('Password lama dan baru wajib diisi', 400);
    if (typeof password_lama !== 'string' || password_lama.length > 256) return errorResponse('Password lama tidak sesuai', 401);
    const { ip } = getReqMeta(event);
    try {
      await ensureAuthCols(sql);
      const rows = await sql`SELECT password_hash, nip, email, nama, is_admin, is_active FROM users WHERE id = ${auth.id} LIMIT 1`;
      if (!rows.length) return errorResponse('User tidak ditemukan', 404);
      const u = rows[0];
      if (u.is_active === false) return errorResponse('Akun Anda dinonaktifkan, hubungi admin', 403);

      const errPw = validatePassword(password_baru, { nip: u.nip });
      if (errPw) return errorResponse(errPw, 400);
      if (password_baru === password_lama) return errorResponse('Password baru tidak boleh sama dengan password lama', 400);

      // Verifikasi password lama juga dibatasi percobaannya (mencegah brute force memakai token curian).
      const kunci = `cp:${auth.id}`;
      const gate = await beginLoginAttempt(sql, kunci, '');
      if (!gate.allowed) return _blokir(gate.retryAfterSec, gate.lockMinutes);

      const valid = await bcrypt.compare(password_lama, u.password_hash);
      if (!valid) return errorResponse('Password lama tidak sesuai', 401);
      await clearLoginAttempts(sql, kunci);

      const hash = await hashPassword(password_baru);
      await sql`UPDATE users SET password_hash = ${hash}, must_change_password = FALSE WHERE id = ${auth.id}`;
      await sql`UPDATE refresh_tokens SET revoked_at = NOW() WHERE user_id = ${auth.id} AND revoked_at IS NULL`;
      await logAudit(sql, event, { user_id: auth.id, nama: auth.nama, email: auth.email, aksi: 'change_password' });

      // Sesi baru supaya pengguna tidak ter-logout setelah mengganti password.
      const token = signToken(_accessPayload({ id: auth.id, email: u.email, nama: u.nama, is_admin: u.is_admin }, false));
      const { token: refreshToken, hash: rtHash, expires_at } = generateRefreshToken();
      await sql`
        INSERT INTO refresh_tokens (user_id, token_hash, expires_at, ip_address, user_agent, session_started_at)
        VALUES (${auth.id}, ${rtHash}, ${expires_at.toISOString()}, ${ip}, ${event.headers['user-agent'] || null}, NOW())
      `;
      return jsonResponse({ ok: true, token, refresh_token: refreshToken });
    } catch (err) {
      console.error('[POST /api/auth/change-password]', err);
      return errorResponse('Server error', 500);
    }
  }

  return errorResponse('Not found', 404);
};