import { getDb, jsonResponse, errorResponse, parseBody, runOnce, setRequestDeadline } from './_db.js';
import { requireAuth } from './_auth.js';
import { logAudit } from './_audit.js';

const TIPE_VALID     = ['info', 'penting', 'peringatan'];
const PENERIMA_VALID = ['semua', 'bidang', 'user'];
const MAX_AKSI       = 2;
const LONCENG_MAX    = 100;
const URUTAN_TIPE    = { peringatan: 0, penting: 1, info: 2 };

function ensureSchema(sql) {
  return runOnce('info_popup.schema', async () => {
    await sql`
      CREATE TABLE IF NOT EXISTS info_popup (
        id            SERIAL PRIMARY KEY,
        judul         TEXT        NOT NULL,
        isi           TEXT        NOT NULL,
        tipe          TEXT        NOT NULL DEFAULT 'info',
        modul_target  TEXT        NOT NULL DEFAULT 'semua',
        penerima_tipe TEXT        NOT NULL DEFAULT 'semua',
        penerima_ids  JSONB       NOT NULL DEFAULT '[]'::jsonb,
        wajib_dibaca  BOOLEAN     NOT NULL DEFAULT FALSE,
        aksi          JSONB       NOT NULL DEFAULT '[]'::jsonb,
        mulai_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        berakhir_at   TIMESTAMPTZ,
        aktif         BOOLEAN     NOT NULL DEFAULT TRUE,
        revisi        INTEGER     NOT NULL DEFAULT 1,
        created_by    INTEGER,
        created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        deleted_at    TIMESTAMPTZ
      )`;
    await sql`
      CREATE TABLE IF NOT EXISTS info_popup_status (
        info_id            INTEGER     NOT NULL REFERENCES info_popup(id) ON DELETE CASCADE,
        user_id            INTEGER     NOT NULL,
        revisi             INTEGER     NOT NULL DEFAULT 1,
        status             TEXT        NOT NULL,
        dimengerti_at      TIMESTAMPTZ,
        disembunyikan_at   TIMESTAMPTZ,
        pertama_dilihat_at TIMESTAMPTZ,
        UNIQUE (info_id, user_id)
      )`;
    await sql`CREATE INDEX IF NOT EXISTS idx_info_popup_aktif_jadwal ON info_popup (aktif, mulai_at, berakhir_at)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_info_popup_status_user  ON info_popup_status (user_id)`;
  });
}

const ALLOWED_TAGS = new Set(['p', 'br', 'strong', 'b', 'em', 'i', 'u', 'ol', 'ul', 'li', 'a', 'h3', 'h4']);
const BLOCK_DROP   = 'script|style|iframe|object|embed|svg|math|template|noscript';

function decodeEntities(s) {
  return String(s)
    .replace(/&#x([0-9a-f]+);?/gi, (_, h) => { const n = parseInt(h, 16); return n > 0 && n < 0x110000 ? String.fromCodePoint(n) : ''; })
    .replace(/&#(\d+);?/g,         (_, d) => { const n = parseInt(d, 10); return n > 0 && n < 0x110000 ? String.fromCodePoint(n) : ''; })
    .replace(/&colon;/gi, ':').replace(/&tab;/gi, '\t').replace(/&newline;/gi, '\n')
    .replace(/&lt;/gi, '<').replace(/&gt;/gi, '>').replace(/&quot;/gi, '"').replace(/&apos;/gi, "'").replace(/&amp;/gi, '&');
}
const escAttr = (s) => String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
function escText(s) {
  return String(s)
    .replace(/&(?!(?:[a-zA-Z][a-zA-Z0-9]*|#\d+|#x[0-9a-fA-F]+);)/g, '&amp;')
    .replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
function getAttr(attrStr, name) {
  const re = new RegExp('(?:^|\\s)' + name + '\\s*=\\s*(?:"([^"]*)"|\'([^\']*)\'|([^\\s"\'>]+))', 'i');
  const m = re.exec(attrStr || '');
  return m ? (m[1] ?? m[2] ?? m[3] ?? '') : null;
}
export function isSafeUrl(url) {
  const bersih = decodeEntities(url).replace(/[\u0000-\u0020\u007f-\u009f]/g, '');
  return /^(https?:|mailto:)/i.test(bersih);
}
export function sanitizeHtml(input) {
  if (typeof input !== 'string' || !input) return '';
  const s = input
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(new RegExp(`<(${BLOCK_DROP})\\b[\\s\\S]*?<\\/\\1\\s*>`, 'gi'), '')
    .replace(new RegExp(`<\\/?(?:${BLOCK_DROP})\\b[^>]*>`, 'gi'), '');
  let out = '';
  let last = 0;
  const re = /<\/?([a-zA-Z][a-zA-Z0-9]*)\b([^>]*)>/g;
  let m;
  while ((m = re.exec(s))) {
    out += escText(s.slice(last, m.index));
    last = re.lastIndex;
    const closing = m[0][1] === '/';
    const name = m[1].toLowerCase();
    if (!ALLOWED_TAGS.has(name)) continue;
    if (closing) { if (name !== 'br') out += `</${name}>`; continue; }
    if (name === 'br') { out += '<br>'; continue; }
    let attrs = '';
    if (name === 'a') {
      const href = getAttr(m[2], 'href');
      if (href && isSafeUrl(href)) attrs = ` href="${escAttr(decodeEntities(href).trim())}" target="_blank" rel="noopener noreferrer"`;
    } else if (name === 'p' || name === 'li') {
      const cls = (getAttr(m[2], 'class') || '').trim();
      if (/^ql-indent-[1-8]$/.test(cls)) attrs = ` class="${cls}"`;
    }
    out += `<${name}${attrs}>`;
  }
  out += escText(s.slice(last));
  return out;
}
const teksPolos = (html) => decodeEntities(String(html || '').replace(/<[^>]*>/g, ' ')).replace(/\s+/g, ' ').trim();

function bersihkanAksi(arr) {
  if (!Array.isArray(arr)) return { aksi: [] };
  const aksi = [];
  for (const a of arr.slice(0, MAX_AKSI)) {
    const label  = String(a?.label || '').trim().slice(0, 40);
    const tujuan = String(a?.tujuan || '').trim().slice(0, 500);
    const tipe   = a?.tipe === 'link' ? 'link' : 'halaman';
    if (!label && !tujuan) continue;
    if (!label || !tujuan) return { error: 'Tombol aksi harus punya label dan tujuan' };
    if (tipe === 'link' && !/^https?:\/\//i.test(tujuan)) return { error: 'Tautan tombol aksi harus diawali https:// atau http://' };
    if (tipe === 'halaman' && !/^[a-z0-9_.-]+$/i.test(tujuan)) return { error: 'Tujuan halaman pada tombol aksi tidak valid' };
    aksi.push({ label, tipe, tujuan });
  }
  return { aksi };
}
const parseTanggal = (v) => { const d = new Date(v); return isNaN(d.getTime()) ? null : d; };

function validasi(b, cur) {
  const ada = (k) => Object.prototype.hasOwnProperty.call(b, k);

  const judul = ada('judul') ? String(b.judul ?? '').trim() : cur?.judul;
  if (!judul) return { error: 'Judul wajib diisi' };
  if (judul.length > 200) return { error: 'Judul maksimal 200 karakter' };

  let isi = cur?.isi;
  if (ada('isi')) {
    isi = sanitizeHtml(String(b.isi ?? ''));
    if (!teksPolos(isi)) return { error: 'Isi wajib diisi' };
  } else if (!isi) return { error: 'Isi wajib diisi' };

  const tipe = ada('tipe') ? b.tipe : (cur?.tipe ?? 'info');
  if (!TIPE_VALID.includes(tipe)) return { error: 'Tipe tidak valid' };

  const penerima_tipe = ada('penerima_tipe') ? b.penerima_tipe : (cur?.penerima_tipe ?? 'semua');
  if (!PENERIMA_VALID.includes(penerima_tipe)) return { error: 'Tipe penerima tidak valid' };
  let penerima_ids = ada('penerima_ids') ? b.penerima_ids : (cur?.penerima_ids ?? []);
  penerima_ids = Array.isArray(penerima_ids)
    ? [...new Set(penerima_ids.map(Number).filter((n) => Number.isInteger(n) && n > 0))].slice(0, 2000) : [];
  if (penerima_tipe === 'semua') penerima_ids = [];
  else if (!penerima_ids.length) return { error: penerima_tipe === 'bidang' ? 'Pilih minimal satu Unit Kerja' : 'Pilih minimal satu user' };

  let modul_target = ada('modul_target') ? String(b.modul_target || 'semua').trim().toLowerCase() : (cur?.modul_target ?? 'semua');
  if (!/^[a-z0-9_-]{1,60}$/.test(modul_target)) modul_target = 'semua';

  const wajib_dibaca = ada('wajib_dibaca') ? !!b.wajib_dibaca : !!cur?.wajib_dibaca;
  const aktif        = ada('aktif') ? !!b.aktif : (cur ? !!cur.aktif : true);

  let aksi = cur?.aksi ?? [];
  if (ada('aksi')) {
    const r = bersihkanAksi(b.aksi);
    if (r.error) return r;
    aksi = r.aksi;
  }

  let mulai_at = cur?.mulai_at ? new Date(cur.mulai_at) : null;
  if (ada('mulai_at') && b.mulai_at) {
    mulai_at = parseTanggal(b.mulai_at);
    if (!mulai_at) return { error: 'Waktu mulai tidak valid' };
  }
  let berakhir_at = cur?.berakhir_at ? new Date(cur.berakhir_at) : null;
  if (ada('berakhir_at')) {
    if (!b.berakhir_at) berakhir_at = null;
    else {
      berakhir_at = parseTanggal(b.berakhir_at);
      if (!berakhir_at) return { error: 'Waktu berakhir tidak valid' };
    }
  }
  if (berakhir_at && berakhir_at <= (mulai_at || new Date())) return { error: 'Waktu berakhir harus setelah waktu mulai' };

  return {
    vals: {
      judul, isi, tipe, penerima_tipe, penerima_ids, modul_target, wajib_dibaca, aksi, aktif,
      mulai_at: mulai_at ? mulai_at.toISOString() : null,
      berakhir_at: berakhir_at ? berakhir_at.toISOString() : null,
    },
  };
}

function statusJadwal(row) {
  const now = Date.now();
  if (!row.aktif) return 'nonaktif';
  if (new Date(row.mulai_at).getTime() > now) return 'terjadwal';
  if (row.berakhir_at && new Date(row.berakhir_at).getTime() <= now) return 'berakhir';
  return 'berlangsung';
}
function statusUser(row) {
  if (row.st_revisi !== row.revisi || !row.st_status) return 'baru';
  if (row.st_status === 'disembunyikan' && row.wajib_dibaca) return 'baru';
  return row.st_status;
}

export const handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return jsonResponse({});
  setRequestDeadline();

  const auth = requireAuth(event);
  if (!auth) return errorResponse('Unauthorized', 401);

  const sql = getDb();
  const rawPath  = event.path.replace(/^.*\/info-popup\/?/, '');
  const segments = rawPath.split('/').filter(Boolean);
  const first    = segments[0] || '';
  const id       = first && /^\d+$/.test(first) ? parseInt(first, 10) : null;
  const sub      = segments[1] || '';
  const method   = event.httpMethod;

  try {
    await ensureSchema(sql);

    if (method === 'GET' && first === 'saya') {
      const modul = String(event.queryStringParameters?.modul || '').trim().toLowerCase().slice(0, 60);
      const me = (await sql`SELECT bidang_id, last_login, NOW() AS now FROM users WHERE id = ${auth.id} LIMIT 1`)[0];
      if (!me) return errorResponse('Unauthorized', 401);
      const lastLogin = me.last_login ? new Date(me.last_login).getTime() : 0;
      const bidangId  = me.bidang_id ?? null;

      const rows = await sql`
        SELECT i.id, i.judul, i.isi, i.tipe, i.modul_target, i.wajib_dibaca, i.aksi,
               i.mulai_at, i.berakhir_at, i.revisi, i.created_at,
               (i.berakhir_at IS NOT NULL AND i.berakhir_at <= NOW()) AS berakhir,
               s.status AS st_status, s.revisi AS st_revisi, s.dimengerti_at
        FROM info_popup i
        LEFT JOIN info_popup_status s ON s.info_id = i.id AND s.user_id = ${auth.id}
        WHERE i.deleted_at IS NULL AND i.aktif = TRUE AND i.mulai_at <= NOW()
          AND (i.berakhir_at IS NULL OR i.berakhir_at > NOW() - INTERVAL '30 days')
          AND (   i.penerima_tipe = 'semua'
               OR (i.penerima_tipe = 'bidang' AND i.penerima_ids @> to_jsonb(${bidangId}::int))
               OR (i.penerima_tipe = 'user'   AND i.penerima_ids @> to_jsonb(${auth.id}::int)))
        ORDER BY i.created_at DESC
        LIMIT ${LONCENG_MAX}`;

      const lonceng = [];
      const popup = [];
      let belumDibaca = 0;
      for (const r of rows) {
        const stat = statusUser(r);
        const item = {
          id: r.id, judul: r.judul, isi: sanitizeHtml(r.isi), tipe: r.tipe, modul_target: r.modul_target,
          wajib_dibaca: r.wajib_dibaca, aksi: Array.isArray(r.aksi) ? r.aksi : [],
          mulai_at: r.mulai_at, berakhir_at: r.berakhir_at, revisi: r.revisi, created_at: r.created_at,
          berakhir: !!r.berakhir, status: stat,
        };
        lonceng.push(item);
        if (item.berakhir) continue;
        if (stat === 'baru') belumDibaca++;

        if (r.modul_target !== 'semua' && r.modul_target !== modul) continue;
        if (stat === 'disembunyikan') continue;
        if (stat === 'dimengerti' && r.dimengerti_at && new Date(r.dimengerti_at).getTime() > lastLogin) continue;
        popup.push(item);
      }
      popup.sort((a, b) => (URUTAN_TIPE[a.tipe] - URUTAN_TIPE[b.tipe]) || (new Date(b.created_at) - new Date(a.created_at)));
      return jsonResponse({
        popup_ids: popup.map((p) => p.id),
        lonceng,
        belum_dibaca: belumDibaca,
        server_time: new Date(me.now).toISOString(),
      });
    }

    if (method === 'POST' && id && ['dimengerti', 'sembunyikan', 'tampilkan-lagi'].includes(sub)) {
      const info = (await sql`
        SELECT id, revisi, wajib_dibaca FROM info_popup WHERE id = ${id} AND deleted_at IS NULL LIMIT 1`)[0];
      if (!info) return jsonResponse({ ok: true, diabaikan: true });

      if (sub === 'sembunyikan' && info.wajib_dibaca) {
        return errorResponse('Info wajib dibaca tidak dapat disembunyikan', 400);
      }
      if (sub === 'sembunyikan') {
        await sql`
          INSERT INTO info_popup_status (info_id, user_id, revisi, status, disembunyikan_at, pertama_dilihat_at)
          VALUES (${id}, ${auth.id}, ${info.revisi}, 'disembunyikan', NOW(), NOW())
          ON CONFLICT (info_id, user_id) DO UPDATE SET
            pertama_dilihat_at = CASE WHEN info_popup_status.revisi = EXCLUDED.revisi
                                      THEN COALESCE(info_popup_status.pertama_dilihat_at, NOW()) ELSE NOW() END,
            revisi = EXCLUDED.revisi, status = 'disembunyikan', disembunyikan_at = NOW()`;
      } else {
        await sql`
          INSERT INTO info_popup_status (info_id, user_id, revisi, status, dimengerti_at, pertama_dilihat_at)
          VALUES (${id}, ${auth.id}, ${info.revisi}, 'dimengerti', NOW(), NOW())
          ON CONFLICT (info_id, user_id) DO UPDATE SET
            pertama_dilihat_at = CASE WHEN info_popup_status.revisi = EXCLUDED.revisi
                                      THEN COALESCE(info_popup_status.pertama_dilihat_at, NOW()) ELSE NOW() END,
            revisi = EXCLUDED.revisi, status = 'dimengerti', dimengerti_at = NOW(), disembunyikan_at = NULL`;
      }
      return jsonResponse({ ok: true });
    }

    if (!auth.is_admin) return errorResponse('Akses ditolak - hanya admin', 403);

    if (method === 'GET' && !first) {
      const rows = await sql`
        SELECT i.id, i.judul, i.isi, i.tipe, i.modul_target, i.penerima_tipe, i.penerima_ids, i.wajib_dibaca, i.aksi,
               i.mulai_at, i.berakhir_at, i.aktif, i.revisi, i.created_by, i.created_at, i.updated_at,
               (SELECT COUNT(*) FROM users u
                 WHERE u.is_active IS NOT FALSE
                   AND (i.penerima_tipe = 'semua'
                        OR (i.penerima_tipe = 'bidang' AND i.penerima_ids @> to_jsonb(u.bidang_id))
                        OR (i.penerima_tipe = 'user'   AND i.penerima_ids @> to_jsonb(u.id))))::int AS jml_penerima,
               (SELECT COUNT(*) FROM info_popup_status s JOIN users u ON u.id = s.user_id
                 WHERE s.info_id = i.id AND s.revisi = i.revisi AND s.status = 'dimengerti' AND u.is_active IS NOT FALSE
                   AND (i.penerima_tipe = 'semua'
                        OR (i.penerima_tipe = 'bidang' AND i.penerima_ids @> to_jsonb(u.bidang_id))
                        OR (i.penerima_tipe = 'user'   AND i.penerima_ids @> to_jsonb(u.id))))::int AS jml_dimengerti,
               (SELECT COUNT(*) FROM info_popup_status s JOIN users u ON u.id = s.user_id
                 WHERE s.info_id = i.id AND s.revisi = i.revisi AND s.status = 'disembunyikan' AND u.is_active IS NOT FALSE
                   AND (i.penerima_tipe = 'semua'
                        OR (i.penerima_tipe = 'bidang' AND i.penerima_ids @> to_jsonb(u.bidang_id))
                        OR (i.penerima_tipe = 'user'   AND i.penerima_ids @> to_jsonb(u.id))))::int AS jml_disembunyikan
        FROM info_popup i
        WHERE i.deleted_at IS NULL
        ORDER BY i.created_at DESC`;
      const info = rows.map((r) => ({
        ...r,
        jml_belum: Math.max(0, r.jml_penerima - r.jml_dimengerti - r.jml_disembunyikan),
        status_jadwal: statusJadwal(r),
      }));
      return jsonResponse({ info });
    }

    if (method === 'GET' && id && sub === 'penerima') {
      const cur = (await sql`
        SELECT id, judul, revisi, penerima_tipe, penerima_ids FROM info_popup WHERE id = ${id} AND deleted_at IS NULL LIMIT 1`)[0];
      if (!cur) return errorResponse('Info tidak ditemukan', 404);
      const idsJson = JSON.stringify(cur.penerima_ids || []);
      const rows = await sql`
        SELECT u.id, u.nama, u.nip, b.nama AS bidang_nama,
               s.status AS st_status, s.revisi AS st_revisi, s.dimengerti_at, s.disembunyikan_at, s.pertama_dilihat_at
        FROM users u
        LEFT JOIN bidang b ON b.id = u.bidang_id
        LEFT JOIN info_popup_status s ON s.info_id = ${id} AND s.user_id = u.id
        WHERE u.is_active IS NOT FALSE
          AND (   ${cur.penerima_tipe}::text = 'semua'
               OR (${cur.penerima_tipe}::text = 'bidang' AND ${idsJson}::jsonb @> to_jsonb(u.bidang_id))
               OR (${cur.penerima_tipe}::text = 'user'   AND ${idsJson}::jsonb @> to_jsonb(u.id)))
        ORDER BY u.nama ASC`;
      const penerima = rows.map((r) => {
        const sah = r.st_revisi === cur.revisi && r.st_status;
        return {
          id: r.id, nama: r.nama, nip: r.nip, bidang_nama: r.bidang_nama,
          status: sah ? r.st_status : 'belum',
          waktu: sah ? (r.st_status === 'disembunyikan' ? r.disembunyikan_at : r.dimengerti_at) : null,
          pertama_dilihat_at: sah ? r.pertama_dilihat_at : null,
        };
      });
      return jsonResponse({ info: { id: cur.id, judul: cur.judul, revisi: cur.revisi }, penerima });
    }

    if (method === 'POST' && !first) {
      const body = parseBody(event);
      const v = validasi(body, null);
      if (v.error) return errorResponse(v.error, 400);
      const x = v.vals;
      const rows = await sql`
        INSERT INTO info_popup (judul, isi, tipe, modul_target, penerima_tipe, penerima_ids, wajib_dibaca, aksi,
                                mulai_at, berakhir_at, aktif, created_by)
        VALUES (${x.judul}, ${x.isi}, ${x.tipe}, ${x.modul_target}, ${x.penerima_tipe}, ${JSON.stringify(x.penerima_ids)}::jsonb,
                ${x.wajib_dibaca}, ${JSON.stringify(x.aksi)}::jsonb,
                COALESCE(${x.mulai_at}::timestamptz, NOW()), ${x.berakhir_at}::timestamptz, ${x.aktif}, ${auth.id})
        RETURNING *`;
      await logAudit(sql, event, {
        user_id: auth.id, nama: auth.nama, email: auth.email,
        aksi: 'create', entitas: 'info_popup', entitas_id: rows[0].id,
        detail: { judul: x.judul, tipe: x.tipe, penerima_tipe: x.penerima_tipe, modul_target: x.modul_target },
      });
      return jsonResponse({ info: rows[0] }, 201);
    }

    if (method === 'PUT' && id && !sub) {
      const cur = (await sql`SELECT * FROM info_popup WHERE id = ${id} AND deleted_at IS NULL LIMIT 1`)[0];
      if (!cur) return errorResponse('Info tidak ditemukan', 404);
      const body = parseBody(event);
      const v = validasi(body, cur);
      if (v.error) return errorResponse(v.error, 400);
      const x = v.vals;
      const naikRevisi = body.tampilkan_ulang === true ? 1 : 0;
      const rows = await sql`
        UPDATE info_popup SET
          judul = ${x.judul}, isi = ${x.isi}, tipe = ${x.tipe}, modul_target = ${x.modul_target},
          penerima_tipe = ${x.penerima_tipe}, penerima_ids = ${JSON.stringify(x.penerima_ids)}::jsonb,
          wajib_dibaca = ${x.wajib_dibaca}, aksi = ${JSON.stringify(x.aksi)}::jsonb,
          mulai_at = ${x.mulai_at}::timestamptz, berakhir_at = ${x.berakhir_at}::timestamptz,
          aktif = ${x.aktif}, revisi = revisi + ${naikRevisi}, updated_at = NOW()
        WHERE id = ${id} AND deleted_at IS NULL
        RETURNING *`;
      if (!rows.length) return errorResponse('Info tidak ditemukan', 404);

      const hanyaAktif = Object.keys(body).every((k) => k === 'aktif');
      await logAudit(sql, event, {
        user_id: auth.id, nama: auth.nama, email: auth.email,
        aksi: hanyaAktif ? (x.aktif ? 'aktifkan' : 'nonaktifkan') : 'update',
        entitas: 'info_popup', entitas_id: id,
        detail: { judul: x.judul, tampilkan_ulang: naikRevisi === 1, revisi: rows[0].revisi },
      });
      return jsonResponse({ info: rows[0] });
    }

    if (method === 'DELETE' && id && !sub) {
      const rows = await sql`
        UPDATE info_popup SET deleted_at = NOW() WHERE id = ${id} AND deleted_at IS NULL RETURNING id, judul`;
      if (!rows.length) return errorResponse('Info tidak ditemukan', 404);
      await logAudit(sql, event, {
        user_id: auth.id, nama: auth.nama, email: auth.email,
        aksi: 'delete', entitas: 'info_popup', entitas_id: id, detail: { judul: rows[0].judul },
      });
      return jsonResponse({ ok: true });
    }

    return errorResponse('Not found', 404);
  } catch (err) {
    console.error('[info-popup]', err);
    return errorResponse('Gagal memproses info popup: ' + err.message);
  }
};
