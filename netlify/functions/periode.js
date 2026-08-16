// netlify/functions/periode.js
//
// GET    /api/periode          → list semua periode (auth required)
// GET    /api/periode/aktif    → periode yang window-nya sedang terbuka (now BETWEEN open_at AND close_at)
// POST   /api/periode          → tambah periode (admin only)
// PUT    /api/periode/:id      → edit periode (admin only)
// DELETE /api/periode/:id      → hapus periode (admin only)
//
// Skema kolom:
//   bulan     INTEGER (1–12), NULLABLE - NULL berarti periode tahunan (jenis 'eplanning')
//   jenis     TEXT    - 'monev' | 'ikk' | 'spm' | 'eplanning'  (satu row per jenis, unique: tahun+bulan+jenis)
//   open_at   TIMESTAMPTZ   - waktu input mulai dibuka
//   close_at  TIMESTAMPTZ   - waktu input ditutup
//   (kolom aktif & triwulan tetap ada di DB untuk kompatibilitas, tidak dipakai)

import { getDb, jsonResponse, errorResponse, parseBody } from './_db.js';
import { requireAuth, requireAdmin } from './_auth.js';

const JENIS_VALID = ['monev', 'ikk', 'spm', 'eplanning'];
// jenis yang periodenya tahunan (bulan NULL) - bukan bulanan
const JENIS_TAHUNAN = ['eplanning'];

// ── Auto-migrate: pastikan kolom bulan nullable + constraint jenis terkini ──
let _migrated = false;
async function ensureSchema(sql) {
  if (_migrated) return;
  try {
    await sql`ALTER TABLE periode ALTER COLUMN bulan DROP NOT NULL`;
  } catch (err) {
    // Sudah nullable / kolom lain - abaikan, bukan fatal
    console.warn('[periode] ensureSchema (bulan nullable):', err.message);
  }
  try {
    // Constraint lama (dibuat manual di Neon, tidak tercatat di kode) cuma
    // mengizinkan 'monev'/'ikk'/'spm' - drop & buat ulang biar 'eplanning' lolos.
    await sql`ALTER TABLE periode DROP CONSTRAINT IF EXISTS periode_jenis_check`;
    await sql`ALTER TABLE periode ADD CONSTRAINT periode_jenis_check
               CHECK (jenis = ANY (ARRAY['monev','ikk','spm','eplanning']))`;
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

  // ── GET /api/periode/aktif - semua periode yang window-nya terbuka sekarang ──
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

  // ── GET /api/periode (semua, auth required) ──────────────────────────────
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

  // ── Semua mutasi: admin only ─────────────────────────────────────────────
  const admin = requireAdmin(event);
  if (!admin) return errorResponse('Unauthorized', 401);

  // ── POST /api/periode ────────────────────────────────────────────────────
  if (event.httpMethod === 'POST' && !seg0) {
    const { tahun, bulan, jenis, label, open_at, close_at } = parseBody(event);
    const isTahunan = JENIS_TAHUNAN.includes(jenis);

    if (!tahun)                              return errorResponse('Tahun wajib diisi', 400);
    if (!isTahunan && !bulan)                return errorResponse('Bulan wajib diisi', 400);
    if (!isTahunan && (bulan < 1 || bulan > 12)) return errorResponse('Bulan harus antara 1–12', 400);
    if (!jenis || !JENIS_VALID.includes(jenis))
      return errorResponse(`Jenis wajib diisi: ${JENIS_VALID.map(j => `"${j}"`).join(', ')}`, 400);
    if (!open_at)                return errorResponse('Waktu buka (open_at) wajib diisi', 400);
    if (!close_at)               return errorResponse('Waktu tutup (close_at) wajib diisi', 400);
    if (new Date(open_at) >= new Date(close_at))
      return errorResponse('Waktu tutup harus setelah waktu buka', 400);

    const BULAN_LABEL = ['','Januari','Februari','Maret','April','Mei','Juni',
                          'Juli','Agustus','September','Oktober','November','Desember'];
    const jenisLabel = jenis === 'monev' ? 'IKU' : jenis === 'ikk' ? 'IKK'
                      : jenis === 'spm'  ? 'SPM' : 'e-Planning';
    const autoLabel  = label?.trim() || (isTahunan
      ? `Tahun Anggaran ${tahun} - ${jenisLabel}`
      : `${BULAN_LABEL[parseInt(bulan)]} ${tahun} - ${jenisLabel}`);
    const bulanVal = isTahunan ? null : parseInt(bulan);

    try {
      // Constraint unique DB tidak berlaku untuk kombinasi bulan=NULL (Postgres:
      // NULL selalu dianggap berbeda), jadi jenis tahunan dicek manual di sini.
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
        return errorResponse('Periode tahun, bulan & jenis tersebut sudah ada', 409);
      return errorResponse('Gagal menyimpan periode: ' + err.message);
    }
  }

  // ── PUT /api/periode/:id ─────────────────────────────────────────────────
  if (event.httpMethod === 'PUT' && numId) {
    const { tahun, bulan, jenis, label, open_at, close_at } = parseBody(event);

    const isTahunan = jenis !== undefined ? JENIS_TAHUNAN.includes(jenis) : null;
    if (bulan !== undefined && bulan !== null && (bulan < 1 || bulan > 12))
      return errorResponse('Bulan harus antara 1–12', 400);
    if (jenis !== undefined && !JENIS_VALID.includes(jenis))
      return errorResponse(`Jenis harus salah satu dari: ${JENIS_VALID.join(', ')}`, 400);
    if (open_at && close_at && new Date(open_at) >= new Date(close_at))
      return errorResponse('Waktu tutup harus setelah waktu buka', 400);

    // isTahunan null (jenis tidak diubah) → biarkan status "tahunan" apa adanya (kolom is_tahunan_now di CASE)
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
        return errorResponse('Periode tahun, bulan & jenis tersebut sudah ada', 409);
      return errorResponse('Gagal mengupdate periode: ' + err.message);
    }
  }

  // ── DELETE /api/periode/:id ──────────────────────────────────────────────
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