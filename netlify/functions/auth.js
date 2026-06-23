// netlify/functions/auth.js
// POST /api/auth/login
// POST /api/auth/me  → verify token + return permissions

import bcrypt from 'bcryptjs';
import { getDb, jsonResponse, errorResponse, parseBody } from './_db.js';
import { signToken, requireAuth } from './_auth.js';

export const handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return jsonResponse({});

  const sql = getDb();
  const path = event.path.replace(/.*\/auth/, '');

  // ── LOGIN ──────────────────────────────────────────────────
  if (event.httpMethod === 'POST' && path === '/login') {
    const { email, password } = parseBody(event);
    if (!email || !password) return errorResponse('Email dan password wajib diisi', 400);

    try {
      const rows = await sql`
        SELECT u.*, b.nama AS bidang_nama, b.singkatan AS bidang_singkatan
        FROM users u
        LEFT JOIN bidang b ON b.id = u.bidang_id
        WHERE u.email = ${email.toLowerCase().trim()} LIMIT 1
      `;
      if (!rows.length) return errorResponse('Email atau password salah', 401);

      const user = rows[0];
      const valid = await bcrypt.compare(password, user.password_hash);
      if (!valid) return errorResponse('Email atau password salah', 401);

      await sql`UPDATE users SET last_login = NOW() WHERE id = ${user.id}`;

      // Ambil permissions
      let permissions = [];
      if (!user.is_admin) {
        const perms = await sql`
          SELECT menu_key FROM user_permissions WHERE user_id = ${user.id}
        `;
        permissions = perms.map(p => p.menu_key);
      }

      const token = signToken({
        id: user.id,
        email: user.email,
        nama: user.nama,
        is_admin: user.is_admin,
      });

      return jsonResponse({
        token,
        user: {
          id: user.id,
          nama: user.nama,
          email: user.email,
          is_admin: user.is_admin,
          bidang_id: user.bidang_id,
          bidang_nama: user.bidang_nama || null,
          bidang_singkatan: user.bidang_singkatan || null,
          permissions,
        },
      });
    } catch (err) {
      console.error(err);
      return errorResponse('Server error', 500);
    }
  }

  // ── ME (verify token + refresh permissions) ────────────────
  if (event.httpMethod === 'GET' && path === '/me') {
    const auth = requireAuth(event);
    if (!auth) return errorResponse('Unauthorized', 401);

    try {
      const rows = await sql`
        SELECT u.id, u.nama, u.email, u.is_admin, u.bidang_id,
               b.nama AS bidang_nama, b.singkatan AS bidang_singkatan
        FROM users u
        LEFT JOIN bidang b ON b.id = u.bidang_id
        WHERE u.id = ${auth.id} LIMIT 1
      `;
      if (!rows.length) return errorResponse('User tidak ditemukan', 404);
      const user = rows[0];

      let permissions = [];
      if (!user.is_admin) {
        const perms = await sql`
          SELECT menu_key FROM user_permissions WHERE user_id = ${user.id}
        `;
        permissions = perms.map(p => p.menu_key);
      }

      return jsonResponse({ user: { ...user, permissions } });
    } catch (err) {
      console.error(err);
      return errorResponse('Server error', 500);
    }
  }

  // ── CHANGE PASSWORD (user ganti password sendiri) ─────────────
  if (event.httpMethod === 'POST' && path === '/change-password') {
    const auth = requireAuth(event);
    if (!auth) return errorResponse('Unauthorized', 401);

    const { password_lama, password_baru } = parseBody(event);
    if (!password_lama || !password_baru) return errorResponse('Password lama dan baru wajib diisi', 400);
    if (password_baru.length < 6) return errorResponse('Password baru minimal 6 karakter', 400);

    try {
      const rows = await sql`SELECT password_hash FROM users WHERE id = ${auth.id} LIMIT 1`;
      if (!rows.length) return errorResponse('User tidak ditemukan', 404);

      const valid = await bcrypt.compare(password_lama, rows[0].password_hash);
      if (!valid) return errorResponse('Password lama tidak sesuai', 401);

      const hash = await bcrypt.hash(password_baru, 10);
      await sql`UPDATE users SET password_hash = ${hash} WHERE id = ${auth.id}`;
      return jsonResponse({ ok: true });
    } catch (err) {
      console.error('[POST /api/auth/change-password]', err);
      return errorResponse('Server error', 500);
    }
  }

  return errorResponse('Not found', 404);
};