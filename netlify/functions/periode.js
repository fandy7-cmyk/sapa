
import { getDb, jsonResponse, errorResponse, parseBody } from './_db.js';
import { requireAuth, requireKinerjaAdmin } from './_auth.js';

const JENIS_VALID = ['monev', 'ikk', 'spm', 'subkeg', 'eplanning', 'walidata'];
const JENIS_TAHUNAN = ['eplanning', 'walidata'];
// Periode kinerja per triwulan: kolom `bulan` = bulan akhir TW (3/6/9/12)
const TW_VALID = [3, 6, 9, 12];
const TW_NAMA  = { 3: 'Triwulan I', 6: 'Triwulan II', 9: 'Triwulan III', 12: 'Triwulan IV' };

let _migrated = false;
async function ensureSchema(sql) {
  if (_migrated) return;
  try {
    await sql`ALTER TABLE periode ALTER COLUMN bulan DROP NOT NULL`;
  } catch (err) {
    console.warn('[periode] ensureSchema (bulan nullable):', err.message);
  }
  try {
    await sql`ALTER TABLE periode DROP CONSTRAINT IF EXISTS periode_jenis_check`;
    await sql`ALTER TABLE periode ADD CONSTRAINT periode_jenis_check
               CHECK (jenis = ANY (ARRAY['monev','ikk','spm','subkeg','eplanning','walidata']))`;
  } catch (err) {
    console.warn('[periode] ensureSchema (jenis check):', err.message);
  }
  _migrated = true;
}

export const handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return jsonResponse({});

  const sql = getDb();
  await ensureSchema(sql);
  const rawPath = event.path.replace(/.*\/periode/, '') || '/';
  const segments = rawPath.split('/').filter(Boolean);
  const seg0 = segments[0] || null;
  const seg1 = segments[1] || null;

  const isAktif = seg0 === 'aktif';
  const numId   = seg0 && !isNaN(seg0) ? parseInt(seg0) : null;

  if (event.httpMethod === 'GET' && isAktif) {
    try {
      const rows = await sql`
        SELECT * FROM periode
        WHERE open_at <= NOW() AND close_at >= NOW()
        ORDER BY tahun DESC, bulan DESC NULLS LAST, jenis ASC
      `;
      return jsonResponse({ periode: rows });
    } catch (err) {
      return errorResponse('Gagal mengambil periode terbuka: ' + err.message);
    }
  }

  if (event.httpMethod === 'GET' && !seg0) {
    const auth = requireAuth(event);
    if (!auth) return errorResponse('Unauthorized', 401);
    try {
      const rows = await sql`
        SELECT * FROM periode ORDER BY tahun DESC, bulan DESC NULLS LAST, jenis ASC
      `;
      return jsonResponse({ periode: rows });
    } catch (err) {
      return errorResponse('Gagal mengambil daftar periode: ' + err.message);
    }
  }

  const admin = await requireKinerjaAdmin(event, sql);
  if (!admin) return errorResponse('Unauthorized', 401);

  // Admin Kinerja (non-admin) hanya boleh mengelola periode kinerja, bukan e-Planning.
  const JENIS_KINERJA = ['monev', 'ikk', 'spm', 'subkeg'];
  const kinerjaOnly = !admin.is_admin;
  if (kinerjaOnly && event.httpMethod !== 'GET') {
    let targetJenis = null;
    if (numId) {
      const cur = await sql`SELECT jenis FROM periode WHERE id = ${numId} LIMIT 1`;
      targetJenis = cur[0]?.jenis ?? null;
      if (cur.length && !JENIS_KINERJA.includes(targetJenis))
        return errorResponse('Akses ditolak: hanya admin yang bisa mengelola periode e-Planning dan Walidata', 403);
    }
    if (event.httpMethod === 'POST' || event.httpMethod === 'PUT') {
      const j = parseBody(event).jenis;
      if (j !== undefined && !JENIS_KINERJA.includes(j))
        return errorResponse('Akses ditolak: hanya admin yang bisa mengelola periode e-Planning dan Walidata', 403);
    }
  }

  if (event.httpMethod === 'POST' && !seg0) {
    const { tahun, bulan, jenis, label, open_at, close_at } = parseBody(event);
    const isTahunan = JENIS_TAHUNAN.includes(jenis);

    if (!tahun)                              return errorResponse('Tahun wajib diisi', 400);
    if (!isTahunan && !bulan)                return errorResponse('Triwulan wajib diisi', 400);
    if (!isTahunan && !TW_VALID.includes(parseInt(bulan))) return errorResponse('Triwulan harus I–IV (nilai 3, 6, 9, atau 12)', 400);
    if (!jenis || !JENIS_VALID.includes(jenis))
      return errorResponse(`Jenis wajib diisi: ${JENIS_VALID.map(j => `"${j}"`).join(', ')}`, 400);
    if (!open_at)                return errorResponse('Waktu buka (open_at) wajib diisi', 400);
    if (!close_at)               return errorResponse('Waktu tutup (close_at) wajib diisi', 400);
    if (new Date(open_at) >= new Date(close_at))
      return errorResponse('Waktu tutup harus setelah waktu buka', 400);

    const BULAN_LABEL = ['','Januari','Februari','Maret','April','Mei','Juni',
                          'Juli','Agustus','September','Oktober','November','Desember'];
    const jenisLabel = jenis === 'monev' ? 'IKU' : jenis === 'ikk' ? 'IKK'
                      : jenis === 'spm'  ? 'SPM' : jenis === 'subkeg' ? 'Sub Kegiatan' : jenis === 'walidata' ? 'Walidata' : 'e-Planning';
    const autoLabel  = label?.trim() || (isTahunan
      ? `Tahun Anggaran ${tahun} - ${jenisLabel}`
      : `${TW_NAMA[parseInt(bulan)]} ${tahun} - ${jenisLabel}`);
    const bulanVal = isTahunan ? null : parseInt(bulan);

    try {
      if (isTahunan) {
        const dup = await sql`
          SELECT id FROM periode WHERE tahun = ${parseInt(tahun)} AND jenis = ${jenis} AND bulan IS NULL LIMIT 1`;
        if (dup.length) return errorResponse(`Periode ${jenisLabel} untuk tahun ${tahun} sudah ada`, 409);
      }

      const rows = await sql`
        INSERT INTO periode (tahun, bulan, jenis, label, open_at, close_at)
        VALUES (
          ${parseInt(tahun)},
          ${bulanVal},
          ${jenis},
          ${autoLabel},
          ${open_at},
          ${close_at}
        )
        RETURNING *
      `;
      return jsonResponse({ periode: rows[0] }, 201);
    } catch (err) {
      if (err.message?.includes('unique'))
        return errorResponse('Periode tahun, triwulan & jenis tersebut sudah ada', 409);
      return errorResponse('Gagal menyimpan periode: ' + err.message);
    }
  }

  if (event.httpMethod === 'PUT' && numId) {
    const { tahun, bulan, jenis, label, open_at, close_at } = parseBody(event);

    const isTahunan = jenis !== undefined ? JENIS_TAHUNAN.includes(jenis) : null;
    if (bulan !== undefined && bulan !== null && !TW_VALID.includes(parseInt(bulan)))
      return errorResponse('Triwulan harus I–IV (nilai 3, 6, 9, atau 12)', 400);
    if (jenis !== undefined && !JENIS_VALID.includes(jenis))
      return errorResponse(`Jenis harus salah satu dari: ${JENIS_VALID.join(', ')}`, 400);
    if (open_at && close_at && new Date(open_at) >= new Date(close_at))
      return errorResponse('Waktu tutup harus setelah waktu buka', 400);

    try {
      const rows = await sql`
        UPDATE periode SET
          tahun      = COALESCE(${tahun ?? null}, tahun),
          bulan      = CASE
                         WHEN ${isTahunan === true} THEN NULL
                         WHEN ${isTahunan === false} THEN COALESCE(${bulan ?? null}, bulan)
                         ELSE COALESCE(${bulan ?? null}, bulan)
                       END,
          jenis      = COALESCE(${jenis ?? null}, jenis),
          label      = COALESCE(${label?.trim() ?? null}, label),
          open_at    = COALESCE(${open_at ?? null}, open_at),
          close_at   = COALESCE(${close_at ?? null}, close_at),
          updated_at = NOW()
        WHERE id = ${numId} RETURNING *
      `;
      if (!rows.length) return errorResponse('Periode tidak ditemukan', 404);
      return jsonResponse({ periode: rows[0] });
    } catch (err) {
      if (err.message?.includes('unique'))
        return errorResponse('Periode tahun, triwulan & jenis tersebut sudah ada', 409);
      return errorResponse('Gagal mengupdate periode: ' + err.message);
    }
  }

  if (event.httpMethod === 'DELETE' && numId) {
    try {
      const check = await sql`SELECT id FROM periode WHERE id = ${numId} LIMIT 1`;
      if (!check.length) return errorResponse('Periode tidak ditemukan', 404);
      await sql`DELETE FROM periode WHERE id = ${numId}`;
      return jsonResponse({ ok: true });
    } catch (err) {
      return errorResponse('Gagal menghapus periode: ' + err.message);
    }
  }

  return errorResponse('Not found', 404);
};