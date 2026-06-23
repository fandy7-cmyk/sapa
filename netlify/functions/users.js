// netlify/functions/users.js
// GET    /api/users                        → list semua user (admin only)
// POST   /api/users                        → tambah user baru (admin only)
// PUT    /api/users/:id                    → edit user (admin only)
// DELETE /api/users/:id                    → hapus user (admin only)
// GET    /api/users/:id/permissions        → lihat permissions user (admin only)
// PUT    /api/users/:id/permissions        → set permissions user (admin only)
// POST   /api/users/:id/reset-password     → reset password user ke default (admin only)

import bcrypt from 'bcryptjs';
import { getDb, jsonResponse, errorResponse, parseBody } from './_db.js';
import { requireAdmin, requireAuth } from './_auth.js';

const DEFAULT_PASSWORD = 'Balut2026';

export const handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return jsonResponse({});

  // Cek auth dasar — endpoint tertentu butuh admin
  const auth = requireAuth(event);
  if (!auth) return errorResponse('Unauthorized', 401);

  const sql = getDb();
  const rawPath = event.path.replace(/.*\/users/, '') || '/';
  const segments = rawPath.split('/').filter(Boolean);

  // /api/users/:id/permissions
  const isPermissions = segments[1] === 'permissions';
  const isResetPassword = segments[1] === 'reset-password';
  const isPerencanaan = segments[0] === 'perencanaan';
  const userId = segments[0] && !isNaN(segments[0]) ? parseInt(segments[0]) : null;

  // ── GET /api/users/perencanaan — semua user terautentikasi boleh akses ──
  if (event.httpMethod === 'GET' && isPerencanaan) {
    try {
      const rows = await sql`
        SELECT u.nama FROM users u
        LEFT JOIN bidang b ON b.id = u.bidang_id
        WHERE u.is_admin = FALSE
          AND b.nama ILIKE '%perencanaan%'
        ORDER BY u.nama ASC
      `;
      return jsonResponse({ pegawai: rows.map(r => r.nama) });
    } catch (err) {
      console.error('[GET /api/users/perencanaan]', err);
      return errorResponse('Gagal mengambil data pegawai');
    }
  }

  // ── GET /api/users/:id/indikator — user boleh fetch indikator miliknya sendiri ──
  if (event.httpMethod === 'GET' && userId && segments[1] === 'indikator') {
    if (auth.id !== userId && !auth.is_admin) return errorResponse('Unauthorized', 401);
    try {
      const rows = await sql`
        SELECT indikator_id FROM user_indikator WHERE user_id = ${userId}
      `;
      return jsonResponse({ indikator_ids: rows.map(r => r.indikator_id) });
    } catch (err) {
      console.error('[GET /api/users/:id/indikator]', err);
      return errorResponse('Gagal mengambil data indikator');
    }
  }

  // Semua endpoint di bawah ini wajib admin
  const admin = requireAdmin(event);
  if (!admin) return errorResponse('Unauthorized', 401);

  // ── GET /api/users ─────────────────────────────────────────────────────
  if (event.httpMethod === 'GET' && !userId) {
    try {
      const users = await sql`
        SELECT u.id, u.nama, u.email, u.is_admin, u.last_login, u.created_at,
               u.bidang_id, b.nama AS bidang_nama, b.singkatan AS bidang_singkatan
        FROM users u
        LEFT JOIN bidang b ON b.id = u.bidang_id
        ORDER BY u.is_admin DESC, u.nama ASC
      `;
      return jsonResponse({ users });
    } catch (err) {
      console.error('[GET /api/users]', err);
      return errorResponse('Gagal mengambil data pengguna');
    }
  }

  // ── GET /api/users/:id/permissions ────────────────────────────────────
  if (event.httpMethod === 'GET' && userId && isPermissions) {
    try {
      const perms = await sql`
        SELECT menu_key FROM user_permissions WHERE user_id = ${userId}
      `;
      return jsonResponse({ permissions: perms.map(p => p.menu_key) });
    } catch (err) {
      console.error('[GET /api/users/:id/permissions]', err);
      return errorResponse('Gagal mengambil hak akses');
    }
  }

  // ── POST /api/users ────────────────────────────────────────────────────
  if (event.httpMethod === 'POST' && !userId) {
    const { nama, email, bidang_id } = parseBody(event);
    if (!nama || !email) {
      return errorResponse('Nama dan email wajib diisi', 400);
    }
    try {
      const exist = await sql`SELECT id FROM users WHERE email = ${email.toLowerCase().trim()} LIMIT 1`;
      if (exist.length) return errorResponse('Email sudah terdaftar', 409);

      const hash = await bcrypt.hash(DEFAULT_PASSWORD, 10);
      const bidangVal = bidang_id ? parseInt(bidang_id) : null;
      const rows = await sql`
        INSERT INTO users (nama, email, password_hash, is_admin, bidang_id)
        VALUES (${nama.trim()}, ${email.toLowerCase().trim()}, ${hash}, FALSE, ${bidangVal})
        RETURNING id, nama, email, is_admin, last_login, created_at, bidang_id
      `;
      return jsonResponse({ user: rows[0] }, 201);
    } catch (err) {
      console.error('[POST /api/users]', err);
      return errorResponse('Gagal menambah pengguna');
    }
  }

  // ── PUT /api/users/:id ─────────────────────────────────────────────────
  if (event.httpMethod === 'PUT' && userId && !isPermissions && segments[1] !== 'indikator') {
    const { nama, email, bidang_id } = parseBody(event);
    try {
      if (email) {
        const exist = await sql`
          SELECT id FROM users WHERE email = ${email.toLowerCase().trim()} AND id != ${userId} LIMIT 1
        `;
        if (exist.length) return errorResponse('Email sudah digunakan', 409);
      }

      const bidangVal = bidang_id !== undefined
        ? (bidang_id ? parseInt(bidang_id) : null)
        : undefined;

      const rows = await sql`
        UPDATE users SET
          nama      = COALESCE(${nama?.trim() || null}, nama),
          email     = COALESCE(${email?.toLowerCase().trim() || null}, email),
          bidang_id = ${bidangVal !== undefined ? bidangVal : sql`bidang_id`}
        WHERE id = ${userId} AND is_admin = FALSE
        RETURNING id, nama, email, is_admin, last_login, created_at, bidang_id
      `;
      if (!rows.length) return errorResponse('Pengguna tidak ditemukan atau tidak dapat diedit', 404);

      const fullRows = await sql`
        SELECT u.id, u.nama, u.email, u.is_admin, u.last_login, u.created_at,
               u.bidang_id, b.nama AS bidang_nama, b.singkatan AS bidang_singkatan
        FROM users u
        LEFT JOIN bidang b ON b.id = u.bidang_id
        WHERE u.id = ${rows[0].id} LIMIT 1
      `;
      return jsonResponse({ user: fullRows[0] });
    } catch (err) {
      console.error('[PUT /api/users/:id]', err);
      return errorResponse('Gagal mengupdate pengguna');
    }
  }

  // ── PUT /api/users/:id/permissions ────────────────────────────────────
  if (event.httpMethod === 'PUT' && userId && isPermissions) {
    const { permissions } = parseBody(event);
    if (!Array.isArray(permissions)) return errorResponse('Format permissions tidak valid', 400);
    try {
      await sql`DELETE FROM user_permissions WHERE user_id = ${userId}`;
      if (permissions.length > 0) {
        for (const key of permissions) {
          await sql`
            INSERT INTO user_permissions (user_id, menu_key)
            VALUES (${userId}, ${key})
            ON CONFLICT DO NOTHING
          `;
        }
      }
      return jsonResponse({ ok: true, permissions });
    } catch (err) {
      console.error('[PUT /api/users/:id/permissions]', err);
      return errorResponse('Gagal menyimpan hak akses');
    }
  }

  // ── POST /api/users/:id/reset-password (admin reset pw user ke default) ──
  if (event.httpMethod === 'POST' && userId && isResetPassword) {
    try {
      const check = await sql`SELECT id, is_admin FROM users WHERE id = ${userId} LIMIT 1`;
      if (!check.length) return errorResponse('Pengguna tidak ditemukan', 404);
      if (check[0].is_admin) return errorResponse('Tidak dapat mereset password Super Admin', 403);

      const hash = await bcrypt.hash(DEFAULT_PASSWORD, 10);
      await sql`UPDATE users SET password_hash = ${hash} WHERE id = ${userId}`;
      return jsonResponse({ ok: true, default_password: DEFAULT_PASSWORD });
    } catch (err) {
      console.error('[POST /api/users/:id/reset-password]', err);
      return errorResponse('Gagal mereset password');
    }
  }

  // ── DELETE /api/users/:id ──────────────────────────────────────────────
  if (event.httpMethod === 'DELETE' && userId) {
    try {
      const check = await sql`SELECT is_admin FROM users WHERE id = ${userId} LIMIT 1`;
      if (!check.length) return errorResponse('Pengguna tidak ditemukan', 404);
      if (check[0].is_admin) return errorResponse('Tidak dapat menghapus Super Admin', 403);

      await sql`DELETE FROM user_permissions WHERE user_id = ${userId}`;
      await sql`DELETE FROM users WHERE id = ${userId}`;
      return jsonResponse({ ok: true });
    } catch (err) {
      console.error('[DELETE /api/users/:id]', err);
      return errorResponse('Gagal menghapus pengguna');
    }
  }

  // ── PUT /api/users/:id/indikator ──────────────────────────────────────────
  if (event.httpMethod === 'PUT' && userId && segments[1] === 'indikator') {
    const { indikator_ids } = parseBody(event);
    if (!Array.isArray(indikator_ids)) return errorResponse('Format indikator_ids tidak valid', 400);
    try {
      await sql`DELETE FROM user_indikator WHERE user_id = ${userId}`;
      for (const iid of indikator_ids) {
        await sql`
          INSERT INTO user_indikator (user_id, indikator_id)
          VALUES (${userId}, ${iid})
          ON CONFLICT DO NOTHING
        `;
      }
      return jsonResponse({ ok: true, indikator_ids });
    } catch (err) {
      console.error('[PUT /api/users/:id/indikator]', err);
      return errorResponse('Gagal menyimpan indikator');
    }
  }

  return errorResponse('Not found', 404);
};