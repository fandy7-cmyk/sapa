// netlify/functions/surat-masuk.js
import { getDb, jsonResponse, errorResponse, parseBody } from './_db.js';
import { requireAuth } from './_auth.js';

async function checkAccess(auth, sql) {
  if (auth.is_admin) return true;
  const perms = await sql`SELECT menu_key FROM user_permissions WHERE user_id = ${auth.id} AND menu_key = 'surat.masuk' LIMIT 1`;
  return perms.length > 0;
}

export const handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return jsonResponse({});

  const auth = requireAuth(event);
  if (!auth) return errorResponse('Unauthorized', 401);

  const sql = getDb();
  const ok = await checkAccess(auth, sql);
  if (!ok) return errorResponse('Akses ditolak', 403);

  const rawPath = event.path.replace(/.*\/surat-masuk/, '') || '/';
  const segments = rawPath.split('/').filter(Boolean);
  const seg0 = segments[0] || null;
  const seg1 = segments[1] || null;
  const numId = seg0 && !isNaN(seg0) ? parseInt(seg0) : null;
  const isStats = seg0 === 'stats';
  const isSelesai = numId && seg1 === 'selesai';

  if (event.httpMethod === 'GET' && isStats) {
    try {
      const [{ total }] = await sql`SELECT COUNT(*)::INT AS total FROM surat_masuk`;
      const [{ belum_selesai }] = await sql`SELECT COUNT(*)::INT AS belum_selesai FROM surat_masuk WHERE selesai = FALSE`;
      const [{ bulan_ini }] = await sql`SELECT COUNT(*)::INT AS bulan_ini FROM surat_masuk WHERE DATE_TRUNC('month', tanggal_terima) = DATE_TRUNC('month', CURRENT_DATE)`;
      const [{ terlambat }] = await sql`SELECT COUNT(*)::INT AS terlambat FROM surat_masuk WHERE selesai = FALSE AND batas_waktu < CURRENT_DATE`;
      return jsonResponse({ total, belum_selesai, bulan_ini, terlambat });
    } catch (err) { console.error('[STATS surat-masuk]', err); return errorResponse('Gagal mengambil statistik: ' + err.message); }
  }

  if (event.httpMethod === 'GET' && !numId && !isStats) {
    const { page = 1, limit = 20, q = '', selesai: sf = '', pegawai: pf = '', tahun: tf = '', bulan: bf = '' } = event.queryStringParameters || {};
    const offset = (parseInt(page) - 1) * parseInt(limit);
    const search  = `%${q}%`;
    const pgSearch = pf ? pf : null;
    const tahunVal = tf ? tf : null;
    const bulanVal = bf ? parseInt(bf) : null;
    try {
      let rows, countRows;
      // Karena neon() tidak support sql fragment, kita pakai pendekatan:
      // filter selesai via boolean, pegawai/tahun/bulan via COALESCE trick
      const selesaiBool = sf === 'true' ? true : sf === 'false' ? false : null;

      rows = await sql`
        SELECT * FROM surat_masuk
        WHERE (perihal ILIKE ${search} OR asal_surat ILIKE ${search} OR no_agenda ILIKE ${search}
          OR no_surat ILIKE ${search} OR COALESCE(pegawai,'') ILIKE ${search})
          AND (${selesaiBool}::boolean IS NULL OR selesai = ${selesaiBool}::boolean)
          AND (${pgSearch}::text IS NULL OR pegawai = ${pgSearch}::text)
          AND (${tahunVal}::text IS NULL OR EXTRACT(YEAR FROM tanggal_terima)::text = ${tahunVal}::text)
          AND (${bulanVal}::int IS NULL OR EXTRACT(MONTH FROM tanggal_terima)::int = ${bulanVal}::int)
        ORDER BY tanggal_terima ASC NULLS LAST, id ASC
        LIMIT ${parseInt(limit)} OFFSET ${offset}`;
      countRows = await sql`
        SELECT COUNT(*)::INT AS total FROM surat_masuk
        WHERE (perihal ILIKE ${search} OR asal_surat ILIKE ${search} OR no_agenda ILIKE ${search}
          OR no_surat ILIKE ${search} OR COALESCE(pegawai,'') ILIKE ${search})
          AND (${selesaiBool}::boolean IS NULL OR selesai = ${selesaiBool}::boolean)
          AND (${pgSearch}::text IS NULL OR pegawai = ${pgSearch}::text)
          AND (${tahunVal}::text IS NULL OR EXTRACT(YEAR FROM tanggal_terima)::text = ${tahunVal}::text)
          AND (${bulanVal}::int IS NULL OR EXTRACT(MONTH FROM tanggal_terima)::int = ${bulanVal}::int)`;

      return jsonResponse({ surat: rows, total: countRows[0].total, page: parseInt(page), limit: parseInt(limit) });
    } catch (err) { console.error('[GET surat-masuk]', err); return errorResponse('Gagal mengambil data surat masuk: ' + err.message); }
  }

  if (event.httpMethod === 'POST' && !numId) {
    const { no_agenda, no_surat, tanggal_surat, tanggal_terima, asal_surat, perihal, batas_waktu, pegawai, file_url, file_name, selesai, keterangan } = parseBody(event);
    if (!no_agenda || !asal_surat || !perihal) return errorResponse('No. agenda, asal surat, dan perihal wajib diisi', 400);
    try {
      const rows = await sql`
        INSERT INTO surat_masuk (no_agenda, no_surat, tanggal_surat, tanggal_terima, asal_surat, perihal, batas_waktu, pegawai, file_url, file_name, selesai, keterangan)
        VALUES (${no_agenda}, ${no_surat||null}, ${tanggal_surat||null}, ${tanggal_terima||null}, ${asal_surat}, ${perihal}, ${batas_waktu||null}, ${pegawai||null}, ${file_url||null}, ${file_name||null}, ${selesai===true}, ${keterangan||null})
        RETURNING *
      `;
      return jsonResponse({ surat: rows[0] }, 201);
    } catch (err) { console.error('[POST surat-masuk]', err); return errorResponse('Gagal menyimpan surat masuk: ' + err.message); }
  }

  if (event.httpMethod === 'PUT' && numId && !isSelesai) {
    const body = parseBody(event);
    const { no_agenda, no_surat, tanggal_surat, tanggal_terima, asal_surat, perihal, batas_waktu, pegawai, file_url, file_name, selesai, keterangan } = body;
    try {
      const rows = await sql`
        UPDATE surat_masuk SET
          no_agenda      = COALESCE(${no_agenda??null}, no_agenda),
          no_surat       = ${no_surat !== undefined ? no_surat : sql`no_surat`},
          tanggal_surat  = ${tanggal_surat !== undefined ? tanggal_surat : sql`tanggal_surat`},
          tanggal_terima = COALESCE(${tanggal_terima??null}, tanggal_terima),
          asal_surat     = COALESCE(${asal_surat??null}, asal_surat),
          perihal        = COALESCE(${perihal??null}, perihal),
          batas_waktu    = ${batas_waktu !== undefined ? batas_waktu : sql`batas_waktu`},
          pegawai        = ${pegawai !== undefined ? pegawai : sql`pegawai`},
          file_url       = ${file_url !== undefined ? file_url : sql`file_url`},
          file_name      = ${file_name !== undefined ? file_name : sql`file_name`},
          selesai        = COALESCE(${selesai??null}, selesai),
          keterangan     = ${keterangan !== undefined ? keterangan : sql`keterangan`},
          updated_at     = NOW()
        WHERE id = ${numId} RETURNING *
      `;
      if (!rows.length) return errorResponse('Surat tidak ditemukan', 404);
      return jsonResponse({ surat: rows[0] });
    } catch (err) { console.error('[PUT surat-masuk]', err); return errorResponse('Gagal mengupdate surat masuk: ' + err.message); }
  }

  if (event.httpMethod === 'PATCH' && isSelesai) {
    const { selesai } = parseBody(event);
    try {
      const rows = await sql`UPDATE surat_masuk SET selesai = ${Boolean(selesai)}, updated_at = NOW() WHERE id = ${numId} RETURNING *`;
      if (!rows.length) return errorResponse('Surat tidak ditemukan', 404);
      return jsonResponse({ surat: rows[0] });
    } catch (err) { return errorResponse('Gagal mengupdate status: ' + err.message); }
  }

  if (event.httpMethod === 'DELETE' && numId) {
    try {
      await sql`DELETE FROM surat_masuk WHERE id = ${numId}`;
      return jsonResponse({ ok: true });
    } catch (err) { return errorResponse('Gagal menghapus surat masuk: ' + err.message); }
  }

  return errorResponse('Not found', 404);
};