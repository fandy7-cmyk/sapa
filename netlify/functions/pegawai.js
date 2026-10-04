
import { getDb, jsonResponse, errorResponse, parseBody } from './_db.js';
import { requireAuth, requireAdmin } from './_auth.js';
import { cleanupReplacedFile } from './_cloudinary.js';

export const handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return jsonResponse({});

  const sql = getDb();
  const rawPath = event.path.replace(/^.*\/pegawai\/?/, '') || '';
  const segments = rawPath.split('/').filter(Boolean);
  const id = segments[0] && !isNaN(segments[0]) ? parseInt(segments[0]) : null;

  if (event.httpMethod === 'GET') {
    const auth = requireAuth(event);
    if (!auth) return errorResponse('Unauthorized', 401);
  } else {
    const admin = requireAdmin(event);
    if (!admin) return errorResponse('Unauthorized', 401);
  }

  if (event.httpMethod === 'GET' && !id) {
    try {
      const rows = await sql`
        SELECT p.*, par.nama AS parent_nama
        FROM pegawai p
        LEFT JOIN pegawai par ON par.id = p.parent_id AND par.deleted_at IS NULL
        WHERE p.deleted_at IS NULL
        ORDER BY p.urutan ASC NULLS LAST, p.nama ASC
      `;
      return jsonResponse({ pegawai: rows });
    } catch (err) {
      console.error('[GET /api/pegawai]', err);
      return errorResponse('Gagal mengambil data pegawai: ' + err.message);
    }
  }

  if (event.httpMethod === 'POST' && !id) {
    const { nama, nip, jabatan, golongan, urutan, foto_url, aktif, parent_id } = parseBody(event);
    if (!nama)    return errorResponse('Nama wajib diisi', 400);
    if (!jabatan) return errorResponse('Jabatan wajib diisi', 400);
    try {
      const rows = await sql`
        INSERT INTO pegawai (nama, nip, jabatan, golongan, urutan, foto_url, aktif, parent_id)
        VALUES (
          ${nama.trim()},
          ${nip?.trim() || null},
          ${jabatan.trim()},
          ${golongan?.trim() || null},
          ${urutan ?? null},
          ${foto_url || null},
          ${aktif !== false},
          ${parent_id ? parseInt(parent_id) : null}
        )
        RETURNING *
      `;
      return jsonResponse({ pegawai: rows[0] }, 201);
    } catch (err) {
      console.error('[POST /api/pegawai]', err);
      return errorResponse('Gagal menyimpan pegawai: ' + err.message);
    }
  }

  if (event.httpMethod === 'PUT' && id) {
    const { nama, nip, jabatan, golongan, urutan, foto_url, aktif, parent_id } = parseBody(event);
    try {
      // Field yang tidak dikirim dipertahankan nilainya. Digabung di JS (bukan pakai fragmen sql`kolom`
      // di dalam query) karena driver Neon HTTP tidak mendukung fragmen bersarang: fragmennya dikirim
      // sebagai JSON {"parameterizedQuery":...} dan bikin error "invalid input syntax for type integer".
      const curRows = await sql`SELECT * FROM pegawai WHERE id = ${id}`;
      if (!curRows.length) return errorResponse('Pegawai tidak ditemukan', 404);
      const cur = curRows[0];

      const vNama     = nama?.trim() ?? cur.nama;
      const vNip      = nip      !== undefined ? (nip?.trim() || null)      : cur.nip;
      const vJabatan  = jabatan?.trim() ?? cur.jabatan;
      const vGolongan = golongan !== undefined ? (golongan?.trim() || null) : cur.golongan;
      const vUrutan   = urutan   !== undefined ? urutan                     : cur.urutan;
      const vFoto     = foto_url !== undefined ? (foto_url || null)         : cur.foto_url;
      const vAktif    = aktif ?? cur.aktif;
      const vParent   = parent_id !== undefined ? (parent_id ? parseInt(parent_id) : null) : cur.parent_id;

      const rows = await sql`
        UPDATE pegawai SET
          nama      = ${vNama},
          nip       = ${vNip},
          jabatan   = ${vJabatan},
          golongan  = ${vGolongan},
          urutan    = ${vUrutan},
          foto_url  = ${vFoto},
          aktif     = ${vAktif},
          parent_id = ${vParent},
          updated_at = NOW()
        WHERE id = ${id}
        RETURNING *
      `;
      if (!rows.length) return errorResponse('Pegawai tidak ditemukan', 404);
      if (cur.foto_url) await cleanupReplacedFile(sql, cur.foto_url, rows[0].foto_url);
      return jsonResponse({ pegawai: rows[0] });
    } catch (err) {
      console.error('[PUT /api/pegawai/:id]', err);
      return errorResponse('Gagal mengupdate pegawai: ' + err.message);
    }
  }

  if (event.httpMethod === 'DELETE' && id) {
    try {
      const rows = await sql`
        UPDATE pegawai SET deleted_at = NOW()
        WHERE id = ${id} AND deleted_at IS NULL
        RETURNING id
      `;
      if (!rows.length) return errorResponse('Pegawai tidak ditemukan', 404);
      return jsonResponse({ ok: true });
    } catch (err) {
      console.error('[DELETE /api/pegawai/:id]', err);
      return errorResponse('Gagal menghapus pegawai: ' + err.message);
    }
  }

  return errorResponse('Not found', 404);
};