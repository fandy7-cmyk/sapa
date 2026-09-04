import { getDb, jsonResponse, errorResponse, parseBody } from './_db.js';
import { requireAuth } from './_auth.js';
import { logAudit } from './_audit.js';
import { deleteFromCloudinary } from './_cloudinary.js';

async function hasBasic(auth, sql) {
  if (auth.is_admin) return true;
  const rows = await sql`
    SELECT 1 FROM user_permissions
    WHERE user_id = ${auth.id} AND menu_key IN ('lembur', 'lembur.full') LIMIT 1
  `;
  return rows.length > 0;
}

async function hasFull(auth, sql) {
  if (auth.is_admin) return true;
  const rows = await sql`
    SELECT 1 FROM user_permissions
    WHERE user_id = ${auth.id} AND menu_key = 'lembur.full' LIMIT 1
  `;
  return rows.length > 0;
}

export const handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return jsonResponse({});

  const auth = requireAuth(event);
  if (!auth) return errorResponse('Unauthorized', 401);

  const sql = getDb();
  const ok = await hasBasic(auth, sql);
  if (!ok) return errorResponse('Akses ditolak', 403);

  const full = await hasFull(auth, sql);

  const rawPath = event.path.replace(/.*\/lembur/, '') || '/';
  const segments = rawPath.split('/').filter(Boolean);
  const resource = segments[0] || null; // kegiatan | sesi | entries | dokumentasi
  const seg1 = segments[1] || null;
  const seg2 = segments[2] || null;
  const seg3 = segments[3] || null;
  const id1 = seg1 && !isNaN(seg1) ? parseInt(seg1) : null;
  const q = event.queryStringParameters || {};

  // ---------------------------------------------------------------- KEGIATAN
  if (resource === 'kegiatan') {
    if (event.httpMethod === 'GET' && !id1) {
      try {
        const rows = await sql`
          SELECT k.*,
            (SELECT COUNT(*)::INT FROM lembur_sesi s WHERE s.kegiatan_id = k.id) AS jumlah_sesi
          FROM lembur_kegiatan k
          ORDER BY k.created_at DESC
        `;
        return jsonResponse({ kegiatan: rows });
      } catch (err) { return errorResponse('Gagal mengambil data kegiatan: ' + err.message); }
    }

    if (event.httpMethod === 'POST' && !id1) {
      if (!full) return errorResponse('Akses ditolak', 403);
      const { nama_kegiatan } = parseBody(event);
      if (!nama_kegiatan) return errorResponse('Nama kegiatan wajib diisi', 400);
      try {
        const rows = await sql`
          INSERT INTO lembur_kegiatan (nama_kegiatan, created_by)
          VALUES (${nama_kegiatan}, ${auth.id}) RETURNING *
        `;
        await logAudit(sql, event, { user_id: auth.id, nama: auth.nama, email: auth.email, aksi: 'create', entitas: 'lembur_kegiatan', entitas_id: rows[0].id, detail: { nama_kegiatan } });
        return jsonResponse({ kegiatan: rows[0] }, 201);
      } catch (err) { return errorResponse('Gagal menyimpan kegiatan: ' + err.message); }
    }

    if (event.httpMethod === 'PUT' && id1) {
      if (!full) return errorResponse('Akses ditolak', 403);
      const { nama_kegiatan } = parseBody(event);
      try {
        const rows = await sql`
          UPDATE lembur_kegiatan SET nama_kegiatan = COALESCE(${nama_kegiatan ?? null}, nama_kegiatan), updated_at = NOW()
          WHERE id = ${id1} RETURNING *
        `;
        if (!rows.length) return errorResponse('Kegiatan tidak ditemukan', 404);
        return jsonResponse({ kegiatan: rows[0] });
      } catch (err) { return errorResponse('Gagal mengubah kegiatan: ' + err.message); }
    }

    if (event.httpMethod === 'DELETE' && id1) {
      if (!full) return errorResponse('Akses ditolak', 403);
      try {
        const dokRows = await sql`
          SELECT d.file_url FROM lembur_dokumentasi d
          JOIN lembur_sesi s ON s.id = d.sesi_id
          WHERE s.kegiatan_id = ${id1}
        `;
        await sql`DELETE FROM lembur_kegiatan WHERE id = ${id1}`;
        for (const d of dokRows) { if (d.file_url) await deleteFromCloudinary(d.file_url).catch(() => {}); }
        await logAudit(sql, event, { user_id: auth.id, nama: auth.nama, email: auth.email, aksi: 'delete', entitas: 'lembur_kegiatan', entitas_id: id1 });
        return jsonResponse({ ok: true });
      } catch (err) { return errorResponse('Gagal menghapus kegiatan: ' + err.message); }
    }
  }

  // -------------------------------------------------------------------- SESI
  if (resource === 'sesi') {
    // POST /sesi/:id/peserta  -> tambah peserta
    if (event.httpMethod === 'POST' && id1 && seg2 === 'peserta') {
      if (!full) return errorResponse('Akses ditolak', 403);
      const { user_ids } = parseBody(event);
      if (!Array.isArray(user_ids) || !user_ids.length) return errorResponse('Pilih minimal 1 pegawai', 400);
      try {
        for (const uid of user_ids) {
          await sql`
            INSERT INTO lembur_entries (sesi_id, user_id)
            VALUES (${id1}, ${uid})
            ON CONFLICT (sesi_id, user_id) DO NOTHING
          `;
        }
        const rows = await sql`
          SELECT e.*, u.nama, u.nip, COALESCE(u.avatar_url, p.foto_url) AS foto_url
          FROM lembur_entries e
          JOIN users u ON u.id = e.user_id
          LEFT JOIN pegawai p ON REGEXP_REPLACE(p.nip, '[^0-9]', '', 'g') = REGEXP_REPLACE(u.nip, '[^0-9]', '', 'g') AND p.aktif = TRUE
          WHERE e.sesi_id = ${id1} ORDER BY e.id ASC
        `;
        return jsonResponse({ entries: rows });
      } catch (err) { return errorResponse('Gagal menambah peserta: ' + err.message); }
    }

    // DELETE /sesi/:id/peserta/:userId -> hapus peserta
    if (event.httpMethod === 'DELETE' && id1 && seg2 === 'peserta' && seg3) {
      if (!full) return errorResponse('Akses ditolak', 403);
      try {
        await sql`DELETE FROM lembur_entries WHERE sesi_id = ${id1} AND user_id = ${parseInt(seg3)}`;
        return jsonResponse({ ok: true });
      } catch (err) { return errorResponse('Gagal menghapus peserta: ' + err.message); }
    }

    if (event.httpMethod === 'GET' && !id1) {
      const kegiatanId = q.kegiatan_id ? parseInt(q.kegiatan_id) : null;
      if (!kegiatanId) return errorResponse('kegiatan_id wajib diisi', 400);
      try {
        const rows = await sql`
          SELECT s.*,
            (SELECT COUNT(*)::INT FROM lembur_entries e WHERE e.sesi_id = s.id) AS jumlah_peserta,
            (SELECT COUNT(*)::INT FROM lembur_dokumentasi d WHERE d.sesi_id = s.id) AS jumlah_dokumentasi,
            EXISTS(SELECT 1 FROM lembur_entries e WHERE e.sesi_id = s.id AND e.user_id = ${auth.id}) AS is_peserta
          FROM lembur_sesi s
          WHERE s.kegiatan_id = ${kegiatanId}
          ORDER BY s.tanggal ASC, s.id ASC
        `;
        return jsonResponse({ sesi: rows });
      } catch (err) { return errorResponse('Gagal mengambil data sesi: ' + err.message); }
    }

    if (event.httpMethod === 'POST' && !id1) {
      if (!full) return errorResponse('Akses ditolak', 403);
      const { kegiatan_id, tanggal, jam_mulai, jam_selesai, user_ids } = parseBody(event);
      if (!kegiatan_id || !tanggal) return errorResponse('Kegiatan dan tanggal wajib diisi', 400);
      try {
        const rows = await sql`
          INSERT INTO lembur_sesi (kegiatan_id, tanggal, jam_mulai, jam_selesai, created_by)
          VALUES (${kegiatan_id}, ${tanggal}, ${jam_mulai || null}, ${jam_selesai || null}, ${auth.id})
          RETURNING *
        `;
        const sesi = rows[0];
        if (Array.isArray(user_ids)) {
          for (const uid of user_ids) {
            await sql`
              INSERT INTO lembur_entries (sesi_id, user_id)
              VALUES (${sesi.id}, ${uid})
              ON CONFLICT (sesi_id, user_id) DO NOTHING
            `;
          }
        }
        await logAudit(sql, event, { user_id: auth.id, nama: auth.nama, email: auth.email, aksi: 'create', entitas: 'lembur_sesi', entitas_id: sesi.id, detail: { tanggal } });
        return jsonResponse({ sesi }, 201);
      } catch (err) {
        if (err.message?.includes('lembur_sesi_kegiatan_id_tanggal_key')) return errorResponse('Sudah ada sesi lembur untuk tanggal ini', 409);
        return errorResponse('Gagal menyimpan sesi: ' + err.message);
      }
    }

    if (event.httpMethod === 'PUT' && id1) {
      if (!full) return errorResponse('Akses ditolak', 403);
      const { tanggal, jam_mulai, jam_selesai } = parseBody(event);
      try {
        const rows = await sql`
          UPDATE lembur_sesi SET
            tanggal = COALESCE(${tanggal ?? null}, tanggal),
            jam_mulai = ${jam_mulai !== undefined ? jam_mulai : sql`jam_mulai`},
            jam_selesai = ${jam_selesai !== undefined ? jam_selesai : sql`jam_selesai`},
            updated_at = NOW()
          WHERE id = ${id1} RETURNING *
        `;
        if (!rows.length) return errorResponse('Sesi tidak ditemukan', 404);
        return jsonResponse({ sesi: rows[0] });
      } catch (err) { return errorResponse('Gagal mengubah sesi: ' + err.message); }
    }

    if (event.httpMethod === 'DELETE' && id1) {
      if (!full) return errorResponse('Akses ditolak', 403);
      try {
        const dokRows = await sql`SELECT file_url FROM lembur_dokumentasi WHERE sesi_id = ${id1}`;
        await sql`DELETE FROM lembur_sesi WHERE id = ${id1}`;
        for (const d of dokRows) { if (d.file_url) await deleteFromCloudinary(d.file_url).catch(() => {}); }
        await logAudit(sql, event, { user_id: auth.id, nama: auth.nama, email: auth.email, aksi: 'delete', entitas: 'lembur_sesi', entitas_id: id1 });
        return jsonResponse({ ok: true });
      } catch (err) { return errorResponse('Gagal menghapus sesi: ' + err.message); }
    }
  }

  // ---------------------------------------------------------------- ENTRIES
  if (resource === 'entries') {
    if (event.httpMethod === 'GET' && !id1) {
      const sesiId = q.sesi_id ? parseInt(q.sesi_id) : null;
      if (!sesiId) return errorResponse('sesi_id wajib diisi', 400);
      try {
        const rows = await sql`
          SELECT e.*, u.nama, u.nip, COALESCE(u.avatar_url, p.foto_url) AS foto_url
          FROM lembur_entries e
          JOIN users u ON u.id = e.user_id
          LEFT JOIN pegawai p ON REGEXP_REPLACE(p.nip, '[^0-9]', '', 'g') = REGEXP_REPLACE(u.nip, '[^0-9]', '', 'g') AND p.aktif = TRUE
          WHERE e.sesi_id = ${sesiId}
          ORDER BY e.id ASC
        `;
        return jsonResponse({ entries: rows });
      } catch (err) { return errorResponse('Gagal mengambil data entri: ' + err.message); }
    }

    if (event.httpMethod === 'PUT' && id1) {
      const { uraian_tugas } = parseBody(event);
      try {
        const owner = await sql`SELECT user_id FROM lembur_entries WHERE id = ${id1} LIMIT 1`;
        if (!owner.length) return errorResponse('Entri tidak ditemukan', 404);
        if (!full && owner[0].user_id !== auth.id) return errorResponse('Akses ditolak', 403);
        const rows = await sql`
          UPDATE lembur_entries SET
            uraian_tugas = ${uraian_tugas ?? null},
            input_by = ${auth.id},
            updated_at = NOW()
          WHERE id = ${id1} RETURNING *
        `;
        return jsonResponse({ entry: rows[0] });
      } catch (err) { return errorResponse('Gagal menyimpan uraian tugas: ' + err.message); }
    }

    if (event.httpMethod === 'DELETE' && id1) {
      if (!full) return errorResponse('Akses ditolak', 403);
      try {
        await sql`DELETE FROM lembur_entries WHERE id = ${id1}`;
        return jsonResponse({ ok: true });
      } catch (err) { return errorResponse('Gagal menghapus entri: ' + err.message); }
    }
  }

  // ----------------------------------------------------------- DOKUMENTASI
  if (resource === 'dokumentasi') {
    if (event.httpMethod === 'GET' && !id1) {
      const sesiId = q.sesi_id ? parseInt(q.sesi_id) : null;
      if (!sesiId) return errorResponse('sesi_id wajib diisi', 400);
      try {
        const rows = await sql`SELECT * FROM lembur_dokumentasi WHERE sesi_id = ${sesiId} ORDER BY id ASC`;
        return jsonResponse({ dokumentasi: rows });
      } catch (err) { return errorResponse('Gagal mengambil dokumentasi: ' + err.message); }
    }

    if (event.httpMethod === 'POST' && !id1) {
      if (!full) return errorResponse('Akses ditolak', 403);
      const { sesi_id, file_url, file_name } = parseBody(event);
      if (!sesi_id || !file_url) return errorResponse('sesi_id dan file_url wajib diisi', 400);
      try {
        const rows = await sql`
          INSERT INTO lembur_dokumentasi (sesi_id, file_url, file_name, uploaded_by)
          VALUES (${sesi_id}, ${file_url}, ${file_name || null}, ${auth.id})
          RETURNING *
        `;
        return jsonResponse({ dokumentasi: rows[0] }, 201);
      } catch (err) { return errorResponse('Gagal menyimpan dokumentasi: ' + err.message); }
    }

    if (event.httpMethod === 'DELETE' && id1) {
      if (!full) return errorResponse('Akses ditolak', 403);
      try {
        const before = await sql`SELECT file_url FROM lembur_dokumentasi WHERE id = ${id1}`;
        await sql`DELETE FROM lembur_dokumentasi WHERE id = ${id1}`;
        if (before[0]?.file_url) await deleteFromCloudinary(before[0].file_url).catch(() => {});
        return jsonResponse({ ok: true });
      } catch (err) { return errorResponse('Gagal menghapus dokumentasi: ' + err.message); }
    }
  }

  // -------------------------------------------------------- PEGAWAI (roster)
  if (resource === 'pegawai' && event.httpMethod === 'GET') {
    if (!full) return errorResponse('Akses ditolak', 403);
    try {
      const rows = await sql`
        SELECT DISTINCT u.id, u.nama, u.nip
        FROM users u
        JOIN user_permissions up ON up.user_id = u.id
        WHERE u.is_admin = FALSE AND up.menu_key IN ('lembur', 'lembur.full')
        ORDER BY u.nama ASC
      `;
      return jsonResponse({ pegawai: rows });
    } catch (err) { return errorResponse('Gagal mengambil daftar pegawai: ' + err.message); }
  }

  return errorResponse('Not found', 404);
};
