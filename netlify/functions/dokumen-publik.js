
import { getDb, jsonResponse, errorResponse, parseBody } from './_db.js';
import { requireAdmin } from './_auth.js';

export const handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return jsonResponse({});

  const sql = getDb();
  const rawPath = event.path.replace(/^.*\/dokumen-publik\/?/, '') || '';
  const segments = rawPath.split('/').filter(Boolean);
  const id = segments[0] && !isNaN(segments[0]) ? parseInt(segments[0]) : null;

  const admin = requireAdmin(event);
  if (!admin) return errorResponse('Unauthorized', 401);

  if (event.httpMethod === 'GET' && !id) {
    try {
      const rows = await sql`
        SELECT * FROM dokumen_publik
        WHERE deleted_at IS NULL
        ORDER BY created_at DESC
      `;
      return jsonResponse({ dokumen: rows });
    } catch (err) {
      console.error('[GET /api/dokumen-publik]', err);
      return errorResponse('Gagal mengambil dokumen: ' + err.message);
    }
  }

  if (event.httpMethod === 'POST' && !id) {
    const { judul, keterangan, kategori, file_url, aktif } = parseBody(event);
    if (!judul)    return errorResponse('Judul wajib diisi', 400);
    if (!file_url) return errorResponse('URL file wajib diisi', 400);
    try {
      const rows = await sql`
        INSERT INTO dokumen_publik (judul, keterangan, kategori, file_url, aktif)
        VALUES (
          ${judul.trim()},
          ${keterangan?.trim() || null},
          ${kategori?.trim() || null},
          ${file_url.trim()},
          ${aktif !== false}
        )
        RETURNING *
      `;
      return jsonResponse({ dokumen: rows[0] }, 201);
    } catch (err) {
      console.error('[POST /api/dokumen-publik]', err);
      return errorResponse('Gagal menyimpan dokumen: ' + err.message);
    }
  }

  if (event.httpMethod === 'PUT' && id) {
    const body = parseBody(event);
    try {
      const existingRows = await sql`SELECT * FROM dokumen_publik WHERE id = ${id} AND deleted_at IS NULL`;
      if (!existingRows.length) return errorResponse('Dokumen tidak ditemukan', 404);
      const existing = existingRows[0];

      const judul      = body.judul !== undefined ? body.judul.trim() : existing.judul;
      const keterangan = body.keterangan !== undefined ? (body.keterangan?.trim() || null) : existing.keterangan;
      const kategori   = body.kategori !== undefined ? (body.kategori?.trim() || null) : existing.kategori;
      const file_url   = body.file_url !== undefined ? body.file_url.trim() : existing.file_url;
      const aktif      = body.aktif !== undefined ? !!body.aktif : existing.aktif;

      const rows = await sql`
        UPDATE dokumen_publik SET
          judul      = ${judul},
          keterangan = ${keterangan},
          kategori   = ${kategori},
          file_url   = ${file_url},
          aktif      = ${aktif},
          updated_at = NOW()
        WHERE id = ${id}
        RETURNING *
      `;
      return jsonResponse({ dokumen: rows[0] });
    } catch (err) {
      console.error('[PUT /api/dokumen-publik/:id]', err);
      return errorResponse('Gagal mengupdate dokumen: ' + err.message);
    }
  }

  if (event.httpMethod === 'DELETE' && id) {
    try {
      const rows = await sql`
        UPDATE dokumen_publik SET deleted_at = NOW()
        WHERE id = ${id} AND deleted_at IS NULL
        RETURNING id
      `;
      if (!rows.length) return errorResponse('Dokumen tidak ditemukan', 404);
      return jsonResponse({ ok: true });
    } catch (err) {
      console.error('[DELETE /api/dokumen-publik/:id]', err);
      return errorResponse('Gagal menghapus dokumen: ' + err.message);
    }
  }

  return errorResponse('Not found', 404);
};