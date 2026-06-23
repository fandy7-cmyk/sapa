// netlify/functions/surat-keluar.js
import { getDb, jsonResponse, errorResponse, parseBody } from './_db.js';
import { requireAuth } from './_auth.js';

async function checkAccess(auth, sql) {
  if (auth.is_admin) return true;
  const perms = await sql`SELECT menu_key FROM user_permissions WHERE user_id = ${auth.id} AND menu_key = 'surat.keluar' LIMIT 1`;
  return perms.length > 0;
}

export const handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return jsonResponse({});

  const auth = requireAuth(event);
  if (!auth) return errorResponse('Unauthorized', 401);

  const sql = getDb();
  const ok = await checkAccess(auth, sql);
  if (!ok) return errorResponse('Akses ditolak', 403);

  const rawPath = event.path.replace(/.*\/surat-keluar/, '') || '/';
  const segments = rawPath.split('/').filter(Boolean);
  const seg0 = segments[0] || null;
  const numId = seg0 && !isNaN(seg0) ? parseInt(seg0) : null;
  const isStats = seg0 === 'stats';

  if (event.httpMethod === 'GET' && isStats) {
    try {
      const [{ total }] = await sql`SELECT COUNT(*)::INT AS total FROM surat_keluar`;
      const [{ bulan_ini }] = await sql`SELECT COUNT(*)::INT AS bulan_ini FROM surat_keluar WHERE DATE_TRUNC('month', tanggal_surat) = DATE_TRUNC('month', CURRENT_DATE)`;
      const [{ tahun_ini }] = await sql`SELECT COUNT(*)::INT AS tahun_ini FROM surat_keluar WHERE DATE_TRUNC('year', tanggal_surat) = DATE_TRUNC('year', CURRENT_DATE)`;
      return jsonResponse({ total, bulan_ini, tahun_ini });
    } catch (err) { return errorResponse('Gagal mengambil statistik'); }
  }

  if (event.httpMethod === 'GET' && !numId) {
    const { page = 1, limit = 20, q = '', pegawai: pf = '', tahun: tf = '', bulan: bf = '' } = event.queryStringParameters || {};
    const offset   = (parseInt(page) - 1) * parseInt(limit);
    const search   = `%${q}%`;
    const pgSearch = pf ? pf : null;
    const tahunVal = tf ? tf : null;
    const bulanVal = bf ? parseInt(bf) : null;
    try {
      const rows = await sql`
        SELECT * FROM surat_keluar
        WHERE (perihal ILIKE ${search} OR tujuan_surat ILIKE ${search} OR no_agenda ILIKE ${search} OR no_surat ILIKE ${search} OR COALESCE(pegawai,'') ILIKE ${search})
          AND (${pgSearch}::text IS NULL OR pegawai = ${pgSearch}::text)
          AND (${tahunVal}::text IS NULL OR EXTRACT(YEAR FROM tanggal_surat)::text = ${tahunVal}::text)
          AND (${bulanVal}::int IS NULL OR EXTRACT(MONTH FROM tanggal_surat)::int = ${bulanVal}::int)
        ORDER BY tanggal_surat ASC, id ASC LIMIT ${parseInt(limit)} OFFSET ${offset}
      `;
      const countRows = await sql`
        SELECT COUNT(*)::INT AS total FROM surat_keluar
        WHERE (perihal ILIKE ${search} OR tujuan_surat ILIKE ${search} OR no_agenda ILIKE ${search} OR no_surat ILIKE ${search} OR COALESCE(pegawai,'') ILIKE ${search})
          AND (${pgSearch}::text IS NULL OR pegawai = ${pgSearch}::text)
          AND (${tahunVal}::text IS NULL OR EXTRACT(YEAR FROM tanggal_surat)::text = ${tahunVal}::text)
          AND (${bulanVal}::int IS NULL OR EXTRACT(MONTH FROM tanggal_surat)::int = ${bulanVal}::int)
      `;
      return jsonResponse({ surat: rows, total: countRows[0].total, page: parseInt(page), limit: parseInt(limit) });
    } catch (err) { return errorResponse('Gagal mengambil data surat keluar: ' + err.message); }
  }

  if (event.httpMethod === 'POST' && !numId) {
    const { no_agenda, no_surat, tanggal_surat, tujuan_surat, perihal, pegawai, file_url, file_name, keterangan } = parseBody(event);
    if (!no_agenda || !tujuan_surat || !perihal) return errorResponse('No. agenda, tujuan surat, dan perihal wajib diisi', 400);
    try {
      const rows = await sql`
        INSERT INTO surat_keluar (no_agenda, no_surat, tanggal_surat, tujuan_surat, perihal, pegawai, file_url, file_name, keterangan)
        VALUES (${no_agenda}, ${no_surat||null}, ${tanggal_surat||null}, ${tujuan_surat}, ${perihal}, ${pegawai||null}, ${file_url||null}, ${file_name||null}, ${keterangan||null})
        RETURNING *
      `;
      return jsonResponse({ surat: rows[0] }, 201);
    } catch (err) { return errorResponse('Gagal menyimpan surat keluar'); }
  }

  if (event.httpMethod === 'PUT' && numId) {
    const body = parseBody(event);
    const { no_agenda, no_surat, tanggal_surat, tujuan_surat, perihal, pegawai, file_url, file_name, keterangan } = body;
    try {
      const rows = await sql`
        UPDATE surat_keluar SET
          no_agenda = COALESCE(${no_agenda??null}, no_agenda),
          no_surat = ${no_surat !== undefined ? no_surat : sql`no_surat`},
          tanggal_surat = COALESCE(${tanggal_surat??null}, tanggal_surat),
          tujuan_surat = COALESCE(${tujuan_surat??null}, tujuan_surat),
          perihal = COALESCE(${perihal??null}, perihal),
          pegawai = ${pegawai !== undefined ? pegawai : sql`pegawai`},
          file_url = ${file_url !== undefined ? file_url : sql`file_url`},
          file_name = ${file_name !== undefined ? file_name : sql`file_name`},
          keterangan = ${keterangan !== undefined ? keterangan : sql`keterangan`},
          updated_at = NOW()
        WHERE id = ${numId} RETURNING *
      `;
      if (!rows.length) return errorResponse('Surat tidak ditemukan', 404);
      return jsonResponse({ surat: rows[0] });
    } catch (err) { return errorResponse('Gagal mengupdate surat keluar'); }
  }

  if (event.httpMethod === 'DELETE' && numId) {
    try {
      await sql`DELETE FROM surat_keluar WHERE id = ${numId}`;
      return jsonResponse({ ok: true });
    } catch (err) { return errorResponse('Gagal menghapus surat keluar'); }
  }

  return errorResponse('Not found', 404);
};