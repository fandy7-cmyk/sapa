
// Buku Panduan per modul.
//   GET    /api/buku-panduan/modul        -> daftar id modul yang punya panduan aktif DAN boleh diakses user ini
//   GET    /api/buku-panduan?modul=lembur  -> panduan aktif untuk satu modul (user harus punya akses modul itu)
//   GET    /api/buku-panduan/admin         -> semua panduan (admin)
//   POST   /api/buku-panduan               -> tambah (admin)
//   PUT    /api/buku-panduan/:id           -> ubah (admin)
//   DELETE /api/buku-panduan/:id           -> hapus, soft delete (admin)
//
// Aturan akses modul: user boleh melihat panduan modul M jika admin, atau punya permission
// bernama persis M atau berawalan "M." (mis. modul "kinerja" -> "kinerja.monev", "kinerja.full").
// Ini cocok dengan semua modul yang ada sekarang (id modul di sidebar = awalan permission).
// Kalau suatu saat ada modul yang id-nya beda dari awalan permission, tambahkan di ALIAS_PERMISSION.

import { getDb, jsonResponse, errorResponse, parseBody } from './_db.js';
import { requireAuth } from './_auth.js';

const ALIAS_PERMISSION = {
  // modul: ['awalan-permission', ...]   (kosong = pakai id modul itu sendiri)
};

// Sama dengan frame-src di CSP netlify.toml. Host lain tidak bisa ditampilkan di dalam SAPA.
const HOST_DIIZINKAN = new Set(['drive.google.com', 'docs.google.com', 'res.cloudinary.com']);

const RE_MODUL = /^[a-z0-9_-]{1,40}$/;

const SQL_SKEMA = async (sql) => {
  await sql`
    CREATE TABLE IF NOT EXISTS buku_panduan (
      id          SERIAL PRIMARY KEY,
      modul       VARCHAR(40)  NOT NULL,
      judul       VARCHAR(200) NOT NULL,
      keterangan  VARCHAR(500),
      file_url    VARCHAR(1000) NOT NULL,
      urutan      INTEGER NOT NULL DEFAULT 0,
      aktif       BOOLEAN NOT NULL DEFAULT TRUE,
      created_by  INTEGER,
      created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      deleted_at  TIMESTAMPTZ
    )`;
  await sql`CREATE INDEX IF NOT EXISTS idx_buku_panduan_modul ON buku_panduan (modul) WHERE deleted_at IS NULL`;
};

// Tabel dibuat sekali saja kalau belum ada (error 42P01), bukan di setiap cold start,
// supaya tidak menambah query DDL ke database di jalur normal.
let _skemaDicek = null;
async function denganSkema(sql, fn) {
  try {
    return await fn();
  } catch (err) {
    if (err?.code !== '42P01') throw err;
    if (!_skemaDicek) _skemaDicek = SQL_SKEMA(sql).catch(e => { _skemaDicek = null; throw e; });
    await _skemaDicek;
    return await fn();
  }
}

function awalanPermission(modul) {
  return ALIAS_PERMISSION[modul] && ALIAS_PERMISSION[modul].length ? ALIAS_PERMISSION[modul] : [modul];
}

function punyaAkses(perms, modul) {
  return awalanPermission(modul).some(a => perms.some(k => k === a || k.startsWith(a + '.')));
}

async function ambilPermission(sql, user) {
  if (user.is_admin) return null; // null = semua
  const rows = await sql`SELECT menu_key FROM user_permissions WHERE user_id = ${user.id}`;
  return rows.map(r => r.menu_key);
}

// Mengembalikan { error } kalau tidak valid, atau { url } yang sudah dirapikan.
function validasiUrl(raw) {
  const s = String(raw || '').trim();
  if (!s) return { error: 'Link buku panduan wajib diisi' };
  if (s.length > 1000) return { error: 'Link terlalu panjang' };
  let u;
  try { u = new URL(s); } catch { return { error: 'Link tidak valid' }; }
  if (u.protocol !== 'https:') return { error: 'Link harus diawali https://' };
  if (!HOST_DIIZINKAN.has(u.hostname)) {
    return { error: 'Link harus dari Google Drive/Docs (drive.google.com, docs.google.com) atau Cloudinary (res.cloudinary.com)' };
  }
  return { url: u.toString() };
}

function bacaBody(event) {
  const b = parseBody(event) || {};
  const out = {};
  if (b.modul !== undefined) out.modul = String(b.modul || '').trim().toLowerCase();
  if (b.judul !== undefined) out.judul = String(b.judul || '').trim();
  if (b.keterangan !== undefined) out.keterangan = String(b.keterangan || '').trim();
  if (b.file_url !== undefined) out.file_url = b.file_url;
  if (b.aktif !== undefined) out.aktif = b.aktif === true || b.aktif === 1 || b.aktif === '1' || b.aktif === 'true';
  return out;
}

function cekField(d, { wajib }) {
  if (wajib || d.modul !== undefined) {
    if (!d.modul || !RE_MODUL.test(d.modul)) return 'Modul tidak valid';
  }
  if (wajib || d.judul !== undefined) {
    if (!d.judul) return 'Judul wajib diisi';
    if (d.judul.length > 200) return 'Judul maksimal 200 karakter';
  }
  if (d.keterangan !== undefined && d.keterangan.length > 500) return 'Keterangan maksimal 500 karakter';
  return null;
}

export const handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return jsonResponse({});

  const user = requireAuth(event);
  if (!user) return errorResponse('Unauthorized', 401);

  const sql = getDb();
  const rawPath = event.path.replace(/^.*\/buku-panduan\/?/, '') || '';
  const segments = rawPath.split('/').filter(Boolean);
  const seg0 = segments[0] || '';
  const id = seg0 && /^\d+$/.test(seg0) ? parseInt(seg0, 10) : null;
  const method = event.httpMethod;

  try {
    // ── Daftar modul yang punya panduan (dipakai sidebar, 1x per sesi) ──
    if (method === 'GET' && seg0 === 'modul') {
      const rows = await denganSkema(sql, () => sql`
        SELECT DISTINCT modul FROM buku_panduan WHERE aktif = TRUE AND deleted_at IS NULL`);
      let modul = rows.map(r => r.modul);
      const perms = await ambilPermission(sql, user);
      if (perms) modul = modul.filter(m => punyaAkses(perms, m));
      return jsonResponse({ modul });
    }

    // ── Semua panduan untuk halaman admin ──
    if (method === 'GET' && seg0 === 'admin') {
      if (!user.is_admin) return errorResponse('Forbidden', 403);
      const rows = await denganSkema(sql, () => sql`
        SELECT id, modul, judul, keterangan, file_url, aktif, created_at, updated_at
        FROM buku_panduan WHERE deleted_at IS NULL
        ORDER BY modul, id`);
      return jsonResponse({ panduan: rows });
    }

    // ── Panduan aktif satu modul (halaman baca) ──
    if (method === 'GET' && !id) {
      const modul = String(event.queryStringParameters?.modul || '').trim().toLowerCase();
      if (!RE_MODUL.test(modul)) return errorResponse('Modul tidak valid', 400);
      const perms = await ambilPermission(sql, user);
      if (perms && !punyaAkses(perms, modul)) return errorResponse('Anda tidak memiliki akses ke modul ini', 403);
      const rows = await denganSkema(sql, () => sql`
        SELECT id, modul, judul, keterangan, file_url, updated_at
        FROM buku_panduan
        WHERE modul = ${modul} AND aktif = TRUE AND deleted_at IS NULL
        ORDER BY id`);
      return jsonResponse({ panduan: rows });
    }

    // ── Sisanya khusus admin ──
    if (!user.is_admin) return errorResponse('Forbidden', 403);

    if (method === 'POST' && !id) {
      const d = bacaBody(event);
      const err = cekField(d, { wajib: true });
      if (err) return errorResponse(err, 400);
      const v = validasiUrl(d.file_url);
      if (v.error) return errorResponse(v.error, 400);
      const rows = await denganSkema(sql, () => sql`
        INSERT INTO buku_panduan (modul, judul, keterangan, file_url, aktif, created_by)
        VALUES (${d.modul}, ${d.judul}, ${d.keterangan || null}, ${v.url}, ${d.aktif !== false}, ${user.id})
        RETURNING id, modul, judul, keterangan, file_url, aktif, created_at, updated_at`);
      return jsonResponse({ panduan: rows[0] }, 201);
    }

    if (method === 'PUT' && id) {
      const d = bacaBody(event);
      const err = cekField(d, { wajib: false });
      if (err) return errorResponse(err, 400);
      let url;
      if (d.file_url !== undefined) {
        const v = validasiUrl(d.file_url);
        if (v.error) return errorResponse(v.error, 400);
        url = v.url;
      }
      const ada = await denganSkema(sql, () => sql`SELECT * FROM buku_panduan WHERE id = ${id} AND deleted_at IS NULL`);
      if (!ada.length) return errorResponse('Buku panduan tidak ditemukan', 404);
      const lama = ada[0];
      const rows = await sql`
        UPDATE buku_panduan SET
          modul      = ${d.modul !== undefined ? d.modul : lama.modul},
          judul      = ${d.judul !== undefined ? d.judul : lama.judul},
          keterangan = ${d.keterangan !== undefined ? (d.keterangan || null) : lama.keterangan},
          file_url   = ${url !== undefined ? url : lama.file_url},
          aktif      = ${d.aktif !== undefined ? d.aktif : lama.aktif},
          updated_at = NOW()
        WHERE id = ${id} AND deleted_at IS NULL
        RETURNING id, modul, judul, keterangan, file_url, aktif, created_at, updated_at`;
      return jsonResponse({ panduan: rows[0] });
    }

    if (method === 'DELETE' && id) {
      const rows = await denganSkema(sql, () => sql`
        UPDATE buku_panduan SET deleted_at = NOW(), updated_at = NOW()
        WHERE id = ${id} AND deleted_at IS NULL RETURNING id`);
      if (!rows.length) return errorResponse('Buku panduan tidak ditemukan', 404);
      return jsonResponse({ ok: true });
    }

    return errorResponse('Not found', 404);
  } catch (err) {
    console.error('[buku-panduan]', method, rawPath, err);
    return errorResponse('Terjadi kesalahan pada buku panduan: ' + err.message);
  }
};
