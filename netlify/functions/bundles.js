// netlify/functions/bundles.js
import { getDb, jsonResponse, errorResponse, parseBody } from './_db.js';
import { requireAuth } from './_auth.js';
import crypto from 'node:crypto';

function slugify(str) {
  return str.toLowerCase().replace(/[^a-z0-9\s-]/g,'').trim()
    .replace(/\s+/g,'-').replace(/-+/g,'-').substring(0,60);
}
function canAccess(user) {
  return user.is_admin || user.permissions?.includes('superlink.bundle');
}

function hashPassword(pw) {
  return crypto.createHash('sha256').update(String(pw)).digest('hex');
}

// Buang password_hash mentah dari response, ganti jadi flag is_protected
function stripPassword(row) {
  if (!row) return row;
  const { password_hash, ...rest } = row;
  return { ...rest, is_protected: !!password_hash };
}

export const handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return jsonResponse({});

  const sql = getDb();
  const rawPath = event.path.replace(/.*\/bundles/, '') || '/';
  const segments = rawPath.split('/').filter(Boolean);
  const seg0 = segments[0] || null;
  const seg1 = segments[1] || null;
  const seg2 = segments[2] || null;
  const isNumericId = seg0 && !isNaN(seg0);
  const bundleId = isNumericId ? parseInt(seg0) : null;
  const isSlug = seg0 && isNaN(seg0);
  const isItems = seg1 === 'items';
  const itemId = seg2 && !isNaN(seg2) ? parseInt(seg2) : null;

  // ── GET /api/bundles/check-slug?slug=xxx&excludeId=xxx (PUBLIK) ──
  // Real-time check ketersediaan slug, dipakai form Buat/Edit Bundle
  if (event.httpMethod === 'GET' && seg0 === 'check-slug') {
    const qs = event.queryStringParameters || {};
    const raw = (qs.slug || '').trim();
    const excludeId = qs.excludeId && !isNaN(qs.excludeId) ? parseInt(qs.excludeId) : null;
    const slugVal = slugify(raw);
    if (!slugVal) return jsonResponse({ available: null, slug: '' });
    try {
      const rows = excludeId
        ? await sql`SELECT id FROM bundles WHERE slug = ${slugVal} AND id != ${excludeId} LIMIT 1`
        : await sql`SELECT id FROM bundles WHERE slug = ${slugVal} LIMIT 1`;
      return jsonResponse({ available: rows.length === 0, slug: slugVal });
    } catch (err) {
      return errorResponse('Gagal cek slug');
    }
  }

  // ── GET bundle by slug (PUBLIK) ────────────────────────────
  // ?pw=xxx      → password kalau bundle diproteksi
  // ?src=qr      → dipakai buat tandai kunjungan lewat QR code (analytics)
  if (event.httpMethod === 'GET' && isSlug) {
    try {
      // Ambil bundle tanpa filter aktif agar bisa bedakan: tidak ada vs nonaktif
      const rows = await sql`SELECT * FROM bundles WHERE slug = ${seg0} LIMIT 1`;
      if (!rows.length) return errorResponse('Bundle tidak ditemukan', 404);
      const bd = rows[0];
      if (!bd.aktif) {
        return jsonResponse({ error: 'Bundle tidak tersedia', reason: 'inactive' }, 403);
      }
      if (bd.expired_at && new Date(bd.expired_at) < new Date()) {
        return jsonResponse({ error: 'Bundle sudah kedaluwarsa', reason: 'expired' }, 403);
      }

      const qs = event.queryStringParameters || {};
      if (bd.password_hash) {
        const pw = (qs.pw || '').trim();
        const pwHash = pw ? hashPassword(pw) : null;
        if (!pw || pwHash !== bd.password_hash) {
          return jsonResponse({ error: 'Password diperlukan', reason: 'password_required', wrong: !!pw }, 401);
        }
      }

      const items = await sql`SELECT * FROM bundle_items WHERE bundle_id = ${bd.id} ORDER BY id ASC`;

      // Catat kunjungan (analytics), sama seperti klik link
      try {
        const ip  = event.headers['x-forwarded-for']?.split(',')[0]?.trim() || '';
        const ua  = event.headers['user-agent'] || '';
        const ref = event.headers['referer'] || '';
        const viaQr = qs.src === 'qr';
        await sql`
          INSERT INTO klik_log (bundle_id, ip_address, user_agent, referer, via_qr)
          VALUES (${bd.id}, ${ip}, ${ua}, ${ref}, ${viaQr})
        `;
      } catch (logErr) { console.error('[bundle klik_log]', logErr); }

      return jsonResponse({ bundle: stripPassword(bd), items });
    } catch (err) { return errorResponse('Gagal mengambil bundle'); }
  }

  // ── Auth required untuk semua selain publik ────────────────
  const auth = requireAuth(event);
  if (!auth) return errorResponse('Unauthorized', 401);

  let user = auth;
  if (!auth.is_admin) {
    const perms = await sql`SELECT menu_key FROM user_permissions WHERE user_id = ${auth.id}`;
    user = { ...auth, permissions: perms.map(p => p.menu_key) };
  }
  if (!canAccess(user)) return errorResponse('Akses ditolak', 403);

  // ── GET /api/bundles/:id/analytics?dari=YYYY-MM-DD&sampai=YYYY-MM-DD ──
  if (event.httpMethod === 'GET' && bundleId && seg1 === 'analytics') {
    const bdRows = await sql`SELECT id, created_by FROM bundles WHERE id = ${bundleId} LIMIT 1`;
    if (!bdRows.length) return errorResponse('Bundle tidak ditemukan', 404);
    if (!user.is_admin && bdRows[0].created_by !== user.id) return errorResponse('Akses ditolak', 403);

    const qs     = event.queryStringParameters || {};
    const dari   = qs.dari   || new Date(Date.now() - 6 * 86400000).toISOString().slice(0, 10);
    const sampai = qs.sampai || new Date().toISOString().slice(0, 10);
    const dariTs   = `${dari} 00:00:00+08`;
    const sampaiTs = `${sampai} 23:59:59+08`;

    try {
      const daily = await sql`
        SELECT TO_CHAR(clicked_at AT TIME ZONE 'Asia/Makassar', 'YYYY-MM-DD') AS tanggal,
               COUNT(*)::INT AS klik
        FROM klik_log
        WHERE bundle_id = ${bundleId} AND clicked_at BETWEEN ${dariTs}::timestamptz AND ${sampaiTs}::timestamptz
        GROUP BY tanggal ORDER BY tanggal ASC
      `;
      const agg = await sql`
        SELECT COUNT(*)::INT AS total,
               COUNT(DISTINCT ip_address)::INT AS unik,
               COUNT(*) FILTER (WHERE via_qr)::INT AS qr
        FROM klik_log
        WHERE bundle_id = ${bundleId} AND clicked_at BETWEEN ${dariTs}::timestamptz AND ${sampaiTs}::timestamptz
      `;
      return jsonResponse({
        dari, sampai,
        total_visitor: agg[0].total,
        unique_visitor: agg[0].unik,
        qr_visitor: agg[0].qr,
        daily,
      });
    } catch (err) {
      return errorResponse('Gagal mengambil analitik: ' + err.message);
    }
  }

  // ── GET /api/bundles ───────────────────────────────────────
  if (event.httpMethod === 'GET' && !seg0) {
    try {
      // Admin lihat semua bundle. User non-admin hanya lihat bundle buatannya sendiri
      // (bundle buatan admin/lama dengan created_by NULL tidak ditampilkan ke user).
      const rows = user.is_admin
        ? await sql`
            SELECT b.*, u.nama AS created_by_nama, COUNT(bi.id)::INT AS jumlah_item
            FROM bundles b
            LEFT JOIN bundle_items bi ON bi.bundle_id = b.id
            LEFT JOIN users u ON u.id = b.created_by
            GROUP BY b.id, u.nama ORDER BY b.created_at DESC
          `
        : await sql`
            SELECT b.*, u.nama AS created_by_nama, COUNT(bi.id)::INT AS jumlah_item
            FROM bundles b
            LEFT JOIN bundle_items bi ON bi.bundle_id = b.id
            LEFT JOIN users u ON u.id = b.created_by
            WHERE b.created_by = ${user.id}
            GROUP BY b.id, u.nama ORDER BY b.created_at DESC
          `;
      return jsonResponse({ bundles: rows.map(stripPassword) });
    } catch (err) { return errorResponse('Gagal mengambil data bundle'); }
  }

  // ── GET /api/bundles/:id ───────────────────────────────────
  if (event.httpMethod === 'GET' && bundleId && !isItems) {
    try {
      const rows = await sql`SELECT * FROM bundles WHERE id = ${bundleId} LIMIT 1`;
      if (!rows.length) return errorResponse('Bundle tidak ditemukan', 404);
      if (!user.is_admin && rows[0].created_by !== user.id) return errorResponse('Akses ditolak', 403);
      const items = await sql`SELECT * FROM bundle_items WHERE bundle_id = ${bundleId} ORDER BY id ASC`;
      return jsonResponse({ bundle: stripPassword(rows[0]), items });
    } catch (err) { return errorResponse('Gagal mengambil bundle'); }
  }

  // ── POST /api/bundles ──────────────────────────────────────
  if (event.httpMethod === 'POST' && !seg0) {
    const { judul, deskripsi, slug: rawSlug, aktif, expired_at, password } = parseBody(event);
    if (!judul) return errorResponse('Judul wajib diisi', 400);
    const slug = rawSlug ? slugify(rawSlug) : slugify(judul);
    const exist = await sql`SELECT id FROM bundles WHERE slug = ${slug} LIMIT 1`;
    if (exist.length) return errorResponse('Slug sudah digunakan', 409);
    const expiredVal = expired_at ? new Date(expired_at) : null;
    const pwHash = password ? hashPassword(password) : null;
    try {
      const rows = await sql`
        INSERT INTO bundles (judul, deskripsi, slug, aktif, created_by, expired_at, password_hash)
        VALUES (${judul}, ${deskripsi||null}, ${slug}, ${aktif !== false}, ${user.id}, ${expiredVal}, ${pwHash}) RETURNING *
      `;
      return jsonResponse({ bundle: stripPassword(rows[0]) }, 201);
    } catch (err) { return errorResponse('Gagal membuat bundle'); }
  }

  // ── PUT /api/bundles/:id ───────────────────────────────────
  if (event.httpMethod === 'PUT' && bundleId && !isItems) {
    if (!user.is_admin) {
      const owner = await sql`SELECT created_by FROM bundles WHERE id = ${bundleId} LIMIT 1`;
      if (!owner.length || owner[0].created_by !== user.id) return errorResponse('Akses ditolak', 403);
    }
    const { judul, deskripsi, slug: rawSlug, aktif, expired_at, password, clear_password } = parseBody(event);
    const slug = rawSlug ? slugify(rawSlug) : undefined;
    if (slug) {
      const exist = await sql`SELECT id FROM bundles WHERE slug = ${slug} AND id != ${bundleId} LIMIT 1`;
      if (exist.length) return errorResponse('Slug sudah digunakan', 409);
    }

    // expired_at: undefined = jangan diubah, null/'' = hapus masa berlaku, isi = set baru
    const expiredExpr = expired_at !== undefined
      ? (expired_at ? new Date(expired_at) : null)
      : sql`expired_at`;

    // password_hash: clear_password = hapus proteksi, password terisi = ganti, selain itu jangan diubah
    const passwordExpr = clear_password
      ? null
      : (password ? hashPassword(password) : sql`password_hash`);

    try {
      const rows = await sql`
        UPDATE bundles SET
          judul = COALESCE(${judul}, judul),
          deskripsi = COALESCE(${deskripsi !== undefined ? (deskripsi || null) : null}, deskripsi),
          slug = COALESCE(${slug||null}, slug),
          aktif = COALESCE(${aktif !== undefined ? aktif : null}, aktif),
          expired_at = ${expiredExpr},
          password_hash = ${passwordExpr},
          updated_at = NOW()
        WHERE id = ${bundleId} RETURNING *
      `;
      if (!rows.length) return errorResponse('Bundle tidak ditemukan', 404);
      return jsonResponse({ bundle: stripPassword(rows[0]) });
    } catch (err) { return errorResponse('Gagal mengupdate bundle'); }
  }

  // ── DELETE /api/bundles/:id ────────────────────────────────
  if (event.httpMethod === 'DELETE' && bundleId && !isItems) {
    if (!user.is_admin) {
      const owner = await sql`SELECT created_by FROM bundles WHERE id = ${bundleId} LIMIT 1`;
      if (!owner.length || owner[0].created_by !== user.id) return errorResponse('Akses ditolak', 403);
    }
    await sql`DELETE FROM bundle_items WHERE bundle_id = ${bundleId}`;
    await sql`DELETE FROM bundles WHERE id = ${bundleId}`;
    return jsonResponse({ ok: true });
  }

  // ── POST /api/bundles/:id/items ────────────────────────────
  if (event.httpMethod === 'POST' && bundleId && isItems && !itemId) {
    if (!user.is_admin) {
      const owner = await sql`SELECT created_by FROM bundles WHERE id = ${bundleId} LIMIT 1`;
      if (!owner.length || owner[0].created_by !== user.id) return errorResponse('Akses ditolak', 403);
    }
    const { judul, url, deskripsi, ikon } = parseBody(event);
    if (!judul || !url) return errorResponse('Judul dan URL wajib diisi', 400);
    try {
      const rows = await sql`
        INSERT INTO bundle_items (bundle_id, judul, url, deskripsi, ikon)
        VALUES (${bundleId}, ${judul}, ${url}, ${deskripsi||null}, ${ikon||'🔗'}) RETURNING *
      `;
      return jsonResponse({ item: rows[0] }, 201);
    } catch (err) { return errorResponse('Gagal menambah item'); }
  }

  // ── PUT /api/bundles/:id/items/:itemId ─────────────────────
  if (event.httpMethod === 'PUT' && bundleId && isItems && itemId) {
    if (!user.is_admin) {
      const owner = await sql`SELECT created_by FROM bundles WHERE id = ${bundleId} LIMIT 1`;
      if (!owner.length || owner[0].created_by !== user.id) return errorResponse('Akses ditolak', 403);
    }
    const { judul, url, deskripsi, ikon } = parseBody(event);
    try {
      const rows = await sql`
        UPDATE bundle_items SET
          judul = COALESCE(${judul}, judul), url = COALESCE(${url}, url),
          deskripsi = COALESCE(${deskripsi !== undefined ? (deskripsi || null) : null}, deskripsi),
          ikon = COALESCE(${ikon}, ikon)
        WHERE id = ${itemId} AND bundle_id = ${bundleId} RETURNING *
      `;
      if (!rows.length) return errorResponse('Item tidak ditemukan', 404);
      return jsonResponse({ item: rows[0] });
    } catch (err) { return errorResponse('Gagal mengupdate item'); }
  }

  // ── DELETE /api/bundles/:id/items/:itemId ──────────────────
  if (event.httpMethod === 'DELETE' && bundleId && isItems && itemId) {
    if (!user.is_admin) {
      const owner = await sql`SELECT created_by FROM bundles WHERE id = ${bundleId} LIMIT 1`;
      if (!owner.length || owner[0].created_by !== user.id) return errorResponse('Akses ditolak', 403);
    }
    await sql`DELETE FROM bundle_items WHERE id = ${itemId} AND bundle_id = ${bundleId}`;
    return jsonResponse({ ok: true });
  }

  return errorResponse('Not found', 404);
};