import { getDb, jsonResponse, errorResponse, parseBody } from './_db.js';
import { requireAdmin, requireAuth } from './_auth.js';

export const TIPE_BIDANG = ['puskesmas', 'bidang', 'sub_bagian'];
export const TIPE_BIDANG_LABEL = {
  puskesmas:  'Puskesmas',
  bidang:     'Bidang',
  sub_bagian: 'Sub Bagian',
};

let _migrated = false;
async function ensureSchema(sql) {
  if (_migrated) return;
  await sql`ALTER TABLE bidang ADD COLUMN IF NOT EXISTS tipe TEXT NOT NULL DEFAULT 'bidang'`;
  _migrated = true;
}

export const handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return jsonResponse({});

  const sql = getDb();
  await ensureSchema(sql);
  const rawPath = event.path.replace(/.*\/bidang/, '') || '/';
  const segments = rawPath.split('/').filter(Boolean);
  const id = segments[0] && !isNaN(segments[0]) ? parseInt(segments[0]) : null;

  if (event.httpMethod === 'GET') {
    const auth = requireAuth(event);
    if (!auth) return errorResponse('Unauthorized', 401);
    try {
      const rows = await sql`
        SELECT * FROM bidang
        WHERE deleted_at IS NULL
        ORDER BY urutan ASC, nama ASC
      `;
      return jsonResponse({ bidang: rows });
    } catch (err) {
      return errorResponse('Gagal mengambil data bidang: ' + err.message);
    }
  }

  const admin = requireAdmin(event);
  if (!admin) return errorResponse('Unauthorized', 401);

  if (event.httpMethod === 'POST' && !id) {
    const { nama, singkatan, urutan, aktif, tipe } = parseBody(event);
    if (!nama) return errorResponse('Nama bidang wajib diisi', 400);
    if (tipe && !TIPE_BIDANG.includes(tipe)) return errorResponse('Tipe unit kerja tidak valid', 400);
    try {
      const rows = await sql`
        INSERT INTO bidang (nama, singkatan, urutan, aktif, tipe)
        VALUES (${nama.trim()}, ${singkatan?.trim() || null}, ${urutan ?? 0}, ${aktif !== false}, ${tipe || 'bidang'})
        RETURNING *
      `;
      return jsonResponse({ bidang: rows[0] }, 201);
    } catch (err) {
      return errorResponse('Gagal menyimpan bidang: ' + err.message);
    }
  }

  if (event.httpMethod === 'PUT' && id) {
    const { nama, singkatan, urutan, aktif, tipe } = parseBody(event);
    if (tipe && !TIPE_BIDANG.includes(tipe)) return errorResponse('Tipe unit kerja tidak valid', 400);
    try {
      const rows = await sql`
        UPDATE bidang SET
          nama       = COALESCE(${nama?.trim() ?? null}, nama),
          singkatan  = ${singkatan !== undefined ? (singkatan?.trim() || null) : sql`singkatan`},
          urutan     = COALESCE(${urutan ?? null}, urutan),
          aktif      = COALESCE(${aktif !== undefined ? aktif : null}, aktif),
          tipe       = COALESCE(${tipe || null}, tipe),
          updated_at = NOW()
        WHERE id = ${id} RETURNING *
      `;
      if (!rows.length) return errorResponse('Bidang tidak ditemukan', 404);
      return jsonResponse({ bidang: rows[0] });
    } catch (err) {
      return errorResponse('Gagal mengupdate bidang: ' + err.message);
    }
  }

  if (event.httpMethod === 'DELETE' && id) {
    try {
      const inUse = await sql`SELECT id FROM users WHERE bidang_id = ${id} LIMIT 1`;
      if (inUse.length) return errorResponse('Bidang masih digunakan oleh pengguna, tidak dapat dihapus', 409);
      const rows = await sql`
        UPDATE bidang SET deleted_at = NOW()
        WHERE id = ${id} AND deleted_at IS NULL
        RETURNING id
      `;
      if (!rows.length) return errorResponse('Bidang tidak ditemukan', 404);
      return jsonResponse({ ok: true });
    } catch (err) {
      return errorResponse('Gagal menghapus bidang: ' + err.message);
    }
  }

  return errorResponse('Not found', 404);
};