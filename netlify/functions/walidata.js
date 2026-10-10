// Walidata (Data SSD) - pencatatan realisasi indikator sektoral per Kode SSD, unit kerja, dan tahun.
// Endpoint (relatif terhadap /.netlify/functions/walidata):
//   GET    /data-rentang?tahun=2022,2023,...  rekap beberapa tahun sekaligus (maks 8) untuk download Laporan
//   GET    /data?tahun=YYYY          rekap Data SSD (admin: semua; user: indikator unit kerjanya)
//   PUT    /realisasi                simpan/kosongkan realisasi {indikator_id,bidang_id,tahun,nilai}
//   GET    /indikator                master indikator (admin)
//   POST   /indikator                tambah indikator (admin)
//   PUT    /indikator/:id            ubah indikator (admin)
//   DELETE /indikator/:id            arsipkan indikator (admin) - realisasi tetap tersimpan
//   GET    /monitoring?tahun=YYYY    monitoring pengisian per indikator x unit kerja (admin)
//   GET    /dashboard?tahun=YYYY     ringkasan pengisian untuk Dashboard (admin: semua; user: indikator yang di-assign ke akunnya)
//   GET/PUT /indikator/:id/users     assign user (penanggung jawab) per indikator (admin) - sama dengan Kinerja
//   (periode penginputan memakai tabel `periode` jenis 'walidata' - diatur di Master Data → Periode)
//   POST   /import                   {mode:'validate'|'commit', rows, overwrite}  (admin)
import { getDb, jsonResponse, errorResponse, parseBody, runOnce, setRequestDeadline } from './_db.js';
import { requireAuth } from './_auth.js';

const AGREGASI = ['jumlah', 'rata_rata', 'maksimum', 'minimum', 'tidak_diagregasi'];
const PERM_VIEW = 'walidata';
const PERM_INPUT = 'walidata.input';
const PERM_FULL = 'walidata.full';

async function ensureSchema(sql) {
  return runOnce('walidata-schema', async () => {
    await sql`CREATE TABLE IF NOT EXISTS walidata_indikator (
      id          SERIAL PRIMARY KEY,
      kode_ssd    TEXT NOT NULL,
      uraian      TEXT NOT NULL,
      definisi    TEXT,
      satuan      TEXT,
      agregasi    TEXT NOT NULL DEFAULT 'jumlah',
      urutan      INTEGER NOT NULL DEFAULT 0,
      created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      deleted_at  TIMESTAMPTZ
    )`;
    await sql`CREATE UNIQUE INDEX IF NOT EXISTS walidata_indikator_kode_uq
              ON walidata_indikator (LOWER(kode_ssd)) WHERE deleted_at IS NULL`;
    await sql`CREATE TABLE IF NOT EXISTS walidata_indikator_unit (
      indikator_id INTEGER NOT NULL REFERENCES walidata_indikator(id) ON DELETE CASCADE,
      bidang_id    INTEGER NOT NULL,
      PRIMARY KEY (indikator_id, bidang_id)
    )`;
    // Assign user per indikator (padanan user_indikator di Kinerja). Tanpa baris = tidak ada user biasa yang melihat indikator (sama dengan Kinerja).
    await sql`CREATE TABLE IF NOT EXISTS walidata_indikator_user (
      indikator_id INTEGER NOT NULL REFERENCES walidata_indikator(id) ON DELETE CASCADE,
      user_id      INTEGER NOT NULL,
      PRIMARY KEY (indikator_id, user_id)
    )`;
    // Satu baris = satu nilai yang SUDAH diinput. Tidak ada baris = belum diinput (beda dengan nol).
    await sql`CREATE TABLE IF NOT EXISTS walidata_realisasi (
      id           SERIAL PRIMARY KEY,
      indikator_id INTEGER NOT NULL REFERENCES walidata_indikator(id),
      bidang_id    INTEGER NOT NULL,
      tahun        INTEGER NOT NULL,
      nilai        NUMERIC NOT NULL,
      updated_by   INTEGER,
      created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE (indikator_id, bidang_id, tahun)
    )`;
    await sql`CREATE TABLE IF NOT EXISTS walidata_realisasi_log (
      id           SERIAL PRIMARY KEY,
      indikator_id INTEGER NOT NULL,
      bidang_id    INTEGER NOT NULL,
      tahun        INTEGER NOT NULL,
      nilai_lama   NUMERIC,
      nilai_baru   NUMERIC,
      aksi         TEXT NOT NULL,
      user_id      INTEGER,
      created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )`;
  });
}

// ── Konteks user: admin / permission / unit kerja ──────────────────────────
async function getCtx(event, sql) {
  const u = requireAuth(event);
  if (!u) return null;
  const perms = (await sql`SELECT menu_key FROM user_permissions WHERE user_id = ${u.id}`).map(r => r.menu_key);
  const urow = (await sql`SELECT bidang_id FROM users WHERE id = ${u.id} LIMIT 1`)[0];
  const admin = !!u.is_admin || perms.includes(PERM_FULL);
  return {
    id: u.id,
    admin,
    bidang_id: urow?.bidang_id ?? null,
    canView: admin || perms.includes(PERM_VIEW) || perms.includes(PERM_INPUT),
    canInput: admin || perms.includes(PERM_INPUT),
  };
}

function parseNum(v) {
  if (v === null || v === undefined) return null;
  if (typeof v === 'number') return Number.isFinite(v) ? v : NaN;
  let s = String(v).trim();
  if (s === '') return null;
  s = s.replace(/\s/g, '');
  if (s.includes(',') && s.includes('.')) s = s.replace(/\./g, '').replace(',', '.');
  else if (s.includes(',')) s = s.replace(',', '.');
  if (!/^-?\d+(\.\d+)?$/.test(s)) return NaN;
  return Number(s);
}

function hitungTotal(agregasi, nilaiList) {
  if (!nilaiList.length || agregasi === 'tidak_diagregasi') return null;
  const n = nilaiList.map(Number);
  switch (agregasi) {
    case 'rata_rata': return n.reduce((a, b) => a + b, 0) / n.length;
    case 'maksimum':  return Math.max(...n);
    case 'minimum':   return Math.min(...n);
    default:          return n.reduce((a, b) => a + b, 0);
  }
}

function periodeStatus(p) {
  if (!p) return 'belum_diatur';
  const now = Date.now();
  if (now < new Date(p.open_at).getTime()) return 'belum_dibuka';
  if (now > new Date(p.close_at).getTime()) return 'ditutup';
  return 'terbuka';
}

async function catatLog(sql, { indikator_id, bidang_id, tahun, lama, baru, aksi, user_id }) {
  await sql`INSERT INTO walidata_realisasi_log (indikator_id, bidang_id, tahun, nilai_lama, nilai_baru, aksi, user_id)
            VALUES (${indikator_id}, ${bidang_id}, ${tahun}, ${lama}, ${baru}, ${aksi}, ${user_id})`;
}

// ── Handler ────────────────────────────────────────────────────────────────
export const handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return jsonResponse({});
  setRequestDeadline();
  const sql = getDb();
  try {
    await ensureSchema(sql);
    const ctx = await getCtx(event, sql);
    if (!ctx) return errorResponse('Unauthorized', 401);
    if (!ctx.canView) return errorResponse('Akses ditolak', 403);

    const rawPath = event.path.replace(/.*\/walidata/, '') || '/';
    const [seg0, seg1, seg2] = rawPath.split('/').filter(Boolean);
    const id = seg1 && !isNaN(seg1) ? parseInt(seg1, 10) : null;
    const m = event.httpMethod;

    if (seg0 === 'data' && m === 'GET') return await getData(event, sql, ctx);
    if (seg0 === 'data-rentang' && m === 'GET') return await getDataRentang(event, sql, ctx);
    if (seg0 === 'monitoring' && m === 'GET') return await getMonitoring(event, sql, ctx);
    if (seg0 === 'dashboard' && m === 'GET') return await getDashboard(event, sql, ctx);
    if (seg0 === 'realisasi' && seg1 === 'pindah' && m === 'POST') return await pindahRealisasi(event, sql, ctx);
    if (seg0 === 'realisasi' && m === 'PUT') return await putRealisasi(event, sql, ctx);
    if (seg0 === 'indikator') return await handleIndikator(event, sql, ctx, m, id, seg2);
    if (seg0 === 'import' && m === 'POST') return await handleImport(event, sql, ctx);
    return errorResponse('Endpoint tidak ditemukan', 404);
  } catch (err) {
    console.error('[walidata]', err);
    return errorResponse('Terjadi kesalahan: ' + err.message);
  }
};

// ── GET /data-rentang?tahun=2022,2023 ─────────────────────────────────────
// Sama dengan /data tapi untuk beberapa tahun dalam satu kali query realisasi (dipakai download Laporan per rentang tahun).
// Aturan akses & perhitungan total identik dengan getData; nilai dan total dikembalikan per tahun: { "2022": 10, ... }.
async function getDataRentang(event, sql, ctx) {
  const tahunList = [...new Set(String(event.queryStringParameters?.tahun || '').split(',')
    .map(x => parseInt(x, 10)).filter(x => x >= 1990 && x <= 2100))].sort((a, b) => a - b);
  if (!tahunList.length) return errorResponse('Parameter tahun wajib diisi', 400);
  if (tahunList.length > 8) return errorResponse('Maksimal 8 tahun per permintaan', 400);

  const indikator = ctx.admin
    ? await sql`SELECT * FROM walidata_indikator WHERE deleted_at IS NULL ORDER BY urutan, kode_ssd`
    : ctx.bidang_id
      ? await sql`SELECT i.* FROM walidata_indikator i
                  JOIN walidata_indikator_unit u ON u.indikator_id = i.id AND u.bidang_id = ${ctx.bidang_id}
                  WHERE i.deleted_at IS NULL
                    AND EXISTS (SELECT 1 FROM walidata_indikator_user x WHERE x.indikator_id = i.id AND x.user_id = ${ctx.id})
                  ORDER BY i.urutan, i.kode_ssd`
      : [];
  const ids = indikator.map(i => i.id);

  const [units, real] = ids.length ? await Promise.all([
    sql`SELECT u.indikator_id, u.bidang_id, b.nama, b.singkatan
        FROM walidata_indikator_unit u JOIN bidang b ON b.id = u.bidang_id
        WHERE u.indikator_id = ANY(${ids}) ORDER BY b.urutan, b.nama`,
    sql`SELECT r.indikator_id, r.bidang_id, r.tahun, r.nilai, COALESCE(b.nama, 'Belum ditetapkan unit') AS nama, b.singkatan
        FROM walidata_realisasi r LEFT JOIN bidang b ON b.id = r.bidang_id
        WHERE r.tahun = ANY(${tahunList}) AND r.indikator_id = ANY(${ids})`,
  ]) : [[], []];

  const unitsBy = new Map(), realBy = new Map();
  for (const u of units) { if (!unitsBy.has(u.indikator_id)) unitsBy.set(u.indikator_id, []); unitsBy.get(u.indikator_id).push(u); }
  for (const r of real) { if (!realBy.has(r.indikator_id)) realBy.set(r.indikator_id, []); realBy.get(r.indikator_id).push(r); }

  const rows = indikator.map(i => {
    const detail = (unitsBy.get(i.id) || []).map(u => ({
      bidang_id: u.bidang_id, nama: u.nama, singkatan: u.singkatan, pengampu: true, nilai: {} }));
    const byBid = new Map(detail.map(d => [d.bidang_id, d]));
    for (const r of realBy.get(i.id) || []) {
      let d = byBid.get(r.bidang_id);
      if (!d) {
        // unit riwayat (bukan pengampu lagi) / bidang_id 0 = import tanpa unit, sama seperti getData
        d = { bidang_id: r.bidang_id, nama: r.nama, singkatan: r.singkatan, pengampu: false, tanpa_unit: r.bidang_id === 0, nilai: {} };
        byBid.set(r.bidang_id, d); detail.push(d);
      }
      d.nilai[r.tahun] = Number(r.nilai);
    }
    const total = {};
    for (const t of tahunList) {
      const vals = detail.filter(d => (d.pengampu || d.tanpa_unit) && d.nilai[t] !== undefined).map(d => d.nilai[t]);
      total[t] = hitungTotal(i.agregasi, vals);
    }
    return {
      id: i.id, kode_ssd: i.kode_ssd, uraian: i.uraian, satuan: i.satuan, agregasi: i.agregasi, total,
      detail: ctx.admin ? detail : detail.filter(d => d.bidang_id === ctx.bidang_id),
    };
  });
  return jsonResponse({ tahun_list: tahunList, rows, me: { admin: ctx.admin, bidang_id: ctx.bidang_id } });
}

// ── GET /data ──────────────────────────────────────────────────────────────
async function getData(event, sql, ctx) {
  const tahun = parseInt(event.queryStringParameters?.tahun, 10) || new Date().getFullYear();

  const indikator = ctx.admin
    ? await sql`SELECT * FROM walidata_indikator WHERE deleted_at IS NULL ORDER BY urutan, kode_ssd`
    : ctx.bidang_id
      ? await sql`SELECT i.* FROM walidata_indikator i
                  JOIN walidata_indikator_unit u ON u.indikator_id = i.id AND u.bidang_id = ${ctx.bidang_id}
                  WHERE i.deleted_at IS NULL
                    AND EXISTS (SELECT 1 FROM walidata_indikator_user x WHERE x.indikator_id = i.id AND x.user_id = ${ctx.id})
                  ORDER BY i.urutan, i.kode_ssd`
      : [];
  const ids = indikator.map(i => i.id);

  const units = ids.length
    ? await sql`SELECT u.indikator_id, u.bidang_id, b.nama, b.singkatan
                FROM walidata_indikator_unit u JOIN bidang b ON b.id = u.bidang_id
                WHERE u.indikator_id = ANY(${ids}) ORDER BY b.urutan, b.nama`
    : [];
  const real = ids.length
    ? await sql`SELECT r.indikator_id, r.bidang_id, r.nilai, r.updated_at, COALESCE(b.nama, 'Belum ditetapkan unit') AS nama, b.singkatan
                FROM walidata_realisasi r LEFT JOIN bidang b ON b.id = r.bidang_id
                WHERE r.tahun = ${tahun} AND r.indikator_id = ANY(${ids})`
    : [];
  const periode = (await sql`SELECT * FROM periode WHERE jenis = 'walidata' AND bulan IS NULL AND tahun = ${tahun} LIMIT 1`)[0] || null;
  const status = periodeStatus(periode);
  // Admin: semua tahun yang punya realisasi/periode. User biasa: hanya tahun realisasi indikator yang di-assign ke dia
  // (unit kerjanya sendiri) + tahun yang periodenya sedang dibuka. Tanpa indikator ter-assign -> kosong (frontend pakai tahun berjalan).
  const tahunRows = ctx.admin
    ? await sql`SELECT DISTINCT tahun FROM (
        SELECT tahun FROM walidata_realisasi UNION SELECT tahun FROM periode WHERE jenis = 'walidata') t ORDER BY tahun DESC`
    : ids.length
      ? await sql`SELECT DISTINCT tahun FROM (
          SELECT tahun FROM walidata_realisasi WHERE indikator_id = ANY(${ids}) AND bidang_id = ${ctx.bidang_id ?? -1}
          UNION
          SELECT tahun FROM periode WHERE jenis = 'walidata' AND bulan IS NULL AND NOW() BETWEEN open_at AND close_at) t
          ORDER BY tahun DESC`
      : [];

  const rows = indikator.map(i => {
    const pengampu = units.filter(u => u.indikator_id === i.id);
    const aktifIds = new Set(pengampu.map(u => u.bidang_id));
    const rIni = real.filter(r => r.indikator_id === i.id);
    const detail = pengampu.map(u => {
      const r = rIni.find(x => x.bidang_id === u.bidang_id);
      return { bidang_id: u.bidang_id, nama: u.nama, singkatan: u.singkatan, pengampu: true,
               nilai: r ? Number(r.nilai) : null, updated_at: r?.updated_at ?? null };
    });
    // bidang_id 0 = realisasi hasil import yang unit kerjanya belum ditetapkan: ikut total, bisa dipindahkan admin.
    // Unit yang pernah mengisi tapi sudah bukan pengampu: tampil sebagai riwayat, tidak masuk total.
    for (const r of rIni) {
      if (!aktifIds.has(r.bidang_id)) {
        detail.push({ bidang_id: r.bidang_id, nama: r.nama, singkatan: r.singkatan, pengampu: false,
                      tanpa_unit: r.bidang_id === 0, nilai: Number(r.nilai), updated_at: r.updated_at });
      }
    }
    const terisi = detail.filter(d => (d.pengampu || d.tanpa_unit) && d.nilai !== null);
    const terisiPengampu = detail.filter(d => d.pengampu && d.nilai !== null);
    return {
      id: i.id, kode_ssd: i.kode_ssd, uraian: i.uraian, definisi: i.definisi, satuan: i.satuan, agregasi: i.agregasi,
      total: hitungTotal(i.agregasi, terisi.map(d => d.nilai)),
      jumlah_pengampu: pengampu.length, jumlah_terisi: terisiPengampu.length,
      // user biasa hanya melihat baris unit kerjanya sendiri
      detail: ctx.admin ? detail : detail.filter(d => d.bidang_id === ctx.bidang_id),
    };
  });

  const bisaInputPeriode = ctx.admin || status === 'terbuka';
  return jsonResponse({
    tahun, rows,
    periode: periode ? { ...periode, status } : { status },
    daftar_tahun: tahunRows.map(r => r.tahun),
    me: { admin: ctx.admin, can_input: ctx.canInput && bisaInputPeriode, bidang_id: ctx.bidang_id },
  });
}

// ── GET /monitoring ────────────────────────────────────────────────────────
// Satu baris = satu indikator x unit kerja pengampu (tiap unit menginput sendiri). Status "terisi" bila ada realisasi tahun tsb.
async function getMonitoring(event, sql, ctx) {
  if (!ctx.admin) return errorResponse('Hanya admin yang dapat melihat monitoring', 403);
  const tahun = parseInt(event.queryStringParameters?.tahun, 10) || new Date().getFullYear();
  const NO_UNIT = '- Tanpa Unit -';

  const perUnit = await sql`
    SELECT i.id AS indikator_id, i.kode_ssd, i.uraian, i.definisi, i.satuan, u.bidang_id, b.nama AS unit,
           r.nilai, r.updated_at AS diisi_pada,
           COALESCE((SELECT ARRAY_AGG(us.nama ORDER BY us.nama) FROM walidata_indikator_user iu JOIN users us ON us.id = iu.user_id
                     WHERE iu.indikator_id = i.id AND us.bidang_id = u.bidang_id), '{}') AS pic_users
    FROM walidata_indikator i
    JOIN walidata_indikator_unit u ON u.indikator_id = i.id
    JOIN bidang b ON b.id = u.bidang_id
    LEFT JOIN walidata_realisasi r ON r.indikator_id = i.id AND r.bidang_id = u.bidang_id AND r.tahun = ${tahun}
    WHERE i.deleted_at IS NULL
    ORDER BY i.urutan, i.kode_ssd, b.urutan, b.nama`;
  const tanpaUnit = await sql`
    SELECT i.id AS indikator_id, i.kode_ssd, i.uraian, i.definisi, i.satuan, NULL::int AS bidang_id, ${NO_UNIT}::text AS unit,
           r.nilai, r.updated_at AS diisi_pada, '{}'::text[] AS pic_users
    FROM walidata_indikator i
    LEFT JOIN LATERAL (SELECT nilai, updated_at FROM walidata_realisasi x WHERE x.indikator_id = i.id AND x.tahun = ${tahun}
                       ORDER BY updated_at DESC LIMIT 1) r ON TRUE
    WHERE i.deleted_at IS NULL AND NOT EXISTS (SELECT 1 FROM walidata_indikator_unit u WHERE u.indikator_id = i.id)
    ORDER BY i.urutan, i.kode_ssd`;

  const indikator = [...perUnit, ...tanpaUnit].map(r => ({
    indikator_id: r.indikator_id, kode_ssd: r.kode_ssd, uraian: r.uraian, definisi: r.definisi, satuan: r.satuan,
    bidang_id: r.bidang_id, unit: r.unit, pic_users: r.pic_users || [],
    status: r.nilai !== null && r.nilai !== undefined ? 'terisi' : 'belum',
    nilai: r.nilai !== null && r.nilai !== undefined ? Number(r.nilai) : null,
    diisi_pada: r.diisi_pada || null,
  }));

  const terisi = indikator.filter(r => r.status === 'terisi').length;
  const pjMap = new Map();
  for (const r of indikator) {
    const p = pjMap.get(r.unit) || { unit: r.unit, total: 0, terisi: 0 };
    p.total++; if (r.status === 'terisi') p.terisi++;
    pjMap.set(r.unit, p);
  }
  // kartu per unit: yang paling banyak belum input di depan (sama dengan Kinerja)
  const summary_unit = [...pjMap.values()].sort((a, b) =>
    ((a.unit === NO_UNIT) - (b.unit === NO_UNIT)) || ((a.terisi / a.total) - (b.terisi / b.total)) || a.unit.localeCompare(b.unit, 'id'));
  const tahunRows = await sql`SELECT DISTINCT tahun FROM (
      SELECT tahun FROM walidata_realisasi UNION SELECT tahun FROM periode WHERE jenis = 'walidata') t ORDER BY tahun DESC`;

  return jsonResponse({
    tahun, daftar_tahun: tahunRows.map(r => r.tahun),
    summary: { total: indikator.length, terisi, belum: indikator.length - terisi },
    summary_unit, indikator,
  });
}

// ── GET /dashboard ─────────────────────────────────────────────────────────
// Satu "isian" = satu indikator x unit kerja pengampu pada tahun terpilih (sama dengan baris Monitoring Pengisian).
// Admin melihat semua indikator & unit kerja; user biasa hanya isian unit kerjanya untuk indikator yang di-assign ke akunnya
// (aturan yang sama dengan GET /data).
async function getDashboard(event, sql, ctx) {
  const tahun = parseInt(event.queryStringParameters?.tahun, 10) || new Date().getFullYear();
  const adm = ctx.admin, bid = ctx.bidang_id ?? -1, uid = ctx.id;

  const [pairs, tren, terbaru, tahunRows, periodeRows, tanpa] = await Promise.all([
    sql`SELECT i.id AS indikator_id, i.kode_ssd, i.uraian, i.satuan, u.bidang_id, b.nama AS unit, b.singkatan,
               (r.indikator_id IS NOT NULL) AS terisi,
               COALESCE((SELECT ARRAY_AGG(us.nama ORDER BY us.nama) FROM walidata_indikator_user iu JOIN users us ON us.id = iu.user_id
                         WHERE iu.indikator_id = i.id AND us.bidang_id = u.bidang_id), '{}') AS pic_users
        FROM walidata_indikator i
        JOIN walidata_indikator_unit u ON u.indikator_id = i.id
        JOIN bidang b ON b.id = u.bidang_id
        LEFT JOIN walidata_realisasi r ON r.indikator_id = i.id AND r.bidang_id = u.bidang_id AND r.tahun = ${tahun}
        WHERE i.deleted_at IS NULL
          AND (${adm}::boolean OR (u.bidang_id = ${bid}::int
               AND EXISTS (SELECT 1 FROM walidata_indikator_user x WHERE x.indikator_id = i.id AND x.user_id = ${uid}::int)))
        ORDER BY i.urutan, i.kode_ssd, b.urutan, b.nama`,
    // jumlah isian yang sudah terinput per tahun (8 tahun terakhir yang punya data)
    sql`SELECT r.tahun, COUNT(*)::int AS terisi
        FROM walidata_realisasi r JOIN walidata_indikator i ON i.id = r.indikator_id AND i.deleted_at IS NULL
        WHERE ${adm}::boolean OR (r.bidang_id = ${bid}::int
              AND EXISTS (SELECT 1 FROM walidata_indikator_user x WHERE x.indikator_id = r.indikator_id AND x.user_id = ${uid}::int))
        GROUP BY r.tahun ORDER BY r.tahun DESC LIMIT 8`,
    // aktivitas input/ubah/hapus/import terbaru dari log
    sql`SELECT l.aksi, l.tahun, l.nilai_baru, l.created_at, i.kode_ssd, i.uraian,
               COALESCE(b.nama, 'Belum ditetapkan unit') AS unit, us.nama AS oleh
        FROM walidata_realisasi_log l
        JOIN walidata_indikator i ON i.id = l.indikator_id AND i.deleted_at IS NULL
        LEFT JOIN bidang b ON b.id = l.bidang_id
        LEFT JOIN users us ON us.id = l.user_id
        WHERE ${adm}::boolean OR (l.bidang_id = ${bid}::int
              AND EXISTS (SELECT 1 FROM walidata_indikator_user x WHERE x.indikator_id = l.indikator_id AND x.user_id = ${uid}::int))
        ORDER BY l.created_at DESC LIMIT 8`,
    sql`SELECT DISTINCT tahun FROM (
          SELECT r.tahun FROM walidata_realisasi r
          WHERE ${adm}::boolean OR (r.bidang_id = ${bid}::int
                AND EXISTS (SELECT 1 FROM walidata_indikator i WHERE i.id = r.indikator_id AND i.deleted_at IS NULL)
                AND EXISTS (SELECT 1 FROM walidata_indikator_user x WHERE x.indikator_id = r.indikator_id AND x.user_id = ${uid}::int))
          UNION
          SELECT tahun FROM periode WHERE jenis = 'walidata' AND bulan IS NULL AND (${adm}::boolean OR NOW() BETWEEN open_at AND close_at)
        ) t ORDER BY tahun DESC`,
    sql`SELECT * FROM periode WHERE jenis = 'walidata' AND bulan IS NULL AND tahun = ${tahun} LIMIT 1`,
    // indikator yang belum punya unit kerja pengampu (hanya relevan untuk admin)
    sql`SELECT COUNT(*)::int AS n FROM walidata_indikator i
        WHERE ${adm}::boolean AND i.deleted_at IS NULL AND NOT EXISTS (SELECT 1 FROM walidata_indikator_unit u WHERE u.indikator_id = i.id)`,
  ]);

  const periode = periodeRows[0] || null;

  // per indikator: lengkap (semua unit pengampu terisi) / sebagian / belum
  const indMap = new Map();
  for (const p of pairs) {
    const x = indMap.get(p.indikator_id) || { total: 0, terisi: 0 };
    x.total++; if (p.terisi) x.terisi++;
    indMap.set(p.indikator_id, x);
  }
  let lengkap = 0, sebagian = 0, belum = 0;
  for (const x of indMap.values()) { if (x.terisi === x.total) lengkap++; else if (x.terisi > 0) sebagian++; else belum++; }

  // per unit kerja: yang paling rendah progresnya di depan
  const unitMap = new Map();
  for (const p of pairs) {
    const u = unitMap.get(p.bidang_id) || { bidang_id: p.bidang_id, unit: p.unit, singkatan: p.singkatan, total: 0, terisi: 0 };
    u.total++; if (p.terisi) u.terisi++;
    unitMap.set(p.bidang_id, u);
  }
  const unit = [...unitMap.values()].sort((a, b) => (a.terisi / a.total) - (b.terisi / b.total) || a.unit.localeCompare(b.unit, 'id'));

  const terisi = pairs.filter(p => p.terisi).length;
  const belumDiisi = pairs.filter(p => !p.terisi);
  return jsonResponse({
    tahun, full: adm,
    daftar_tahun: tahunRows.map(r => r.tahun),
    periode: periode ? { ...periode, status: periodeStatus(periode) } : { status: 'belum_diatur' },
    ringkas: { indikator: indMap.size, lengkap, sebagian, belum, tanpa_pengampu: tanpa[0]?.n || 0,
               isian: pairs.length, terisi, belum_isi: pairs.length - terisi },
    unit,
    tren: tren.map(r => ({ tahun: r.tahun, terisi: r.terisi })).reverse(),
    jumlah_belum_diisi: belumDiisi.length,
    belum_diisi: belumDiisi.slice(0, 100).map(p => ({ kode_ssd: p.kode_ssd, uraian: p.uraian, unit: p.unit, pic_users: p.pic_users || [] })),
    terbaru: terbaru.map(r => ({ aksi: r.aksi, tahun: r.tahun, nilai: r.nilai_baru === null ? null : Number(r.nilai_baru),
                                 waktu: r.created_at, kode_ssd: r.kode_ssd, uraian: r.uraian, unit: r.unit, oleh: r.oleh })),
  });
}

// ── PUT /realisasi ─────────────────────────────────────────────────────────
async function putRealisasi(event, sql, ctx) {
  if (!ctx.canInput) return errorResponse('Anda tidak memiliki akses menginput realisasi', 403);
  const { indikator_id, bidang_id, tahun, nilai } = parseBody(event);
  const iid = parseInt(indikator_id, 10), bid = parseInt(bidang_id, 10), thn = parseInt(tahun, 10);
  if (!iid || !bid || !thn) return errorResponse('Indikator, unit kerja, dan tahun wajib diisi', 400);

  if (!ctx.admin) {
    if (bid !== ctx.bidang_id) return errorResponse('Anda hanya dapat menginput realisasi unit kerja sendiri', 403);
    const periode = (await sql`SELECT * FROM periode WHERE jenis = 'walidata' AND bulan IS NULL AND tahun = ${thn} LIMIT 1`)[0];
    if (periodeStatus(periode) !== 'terbuka') return errorResponse('Periode penginputan tahun ' + thn + ' tidak sedang dibuka', 403);
  }
  const pengampu = await sql`SELECT 1 FROM walidata_indikator_unit u JOIN walidata_indikator i ON i.id = u.indikator_id
                             WHERE u.indikator_id = ${iid} AND u.bidang_id = ${bid} AND i.deleted_at IS NULL`;
  if (!pengampu.length) return errorResponse('Unit kerja bukan pengampu indikator ini', 400);
  if (!ctx.admin) {
    // Sama seperti Kinerja: user biasa hanya boleh menginput indikator yang di-assign langsung ke akunnya.
    const ass = await sql`SELECT 1 FROM walidata_indikator_user WHERE indikator_id = ${iid} AND user_id = ${ctx.id}`;
    if (!ass.length) return errorResponse('Indikator ini tidak di-assign ke akun Anda', 403);
  }

  const baru = parseNum(nilai);
  if (Number.isNaN(baru)) return errorResponse('Nilai realisasi harus berupa angka', 400);

  const lama = (await sql`SELECT nilai FROM walidata_realisasi WHERE indikator_id = ${iid} AND bidang_id = ${bid} AND tahun = ${thn}`)[0];
  if (baru === null) {   // kosongkan = kembali ke "belum diinput"
    if (lama) {
      await sql`DELETE FROM walidata_realisasi WHERE indikator_id = ${iid} AND bidang_id = ${bid} AND tahun = ${thn}`;
      await catatLog(sql, { indikator_id: iid, bidang_id: bid, tahun: thn, lama: lama.nilai, baru: null, aksi: 'hapus', user_id: ctx.id });
    }
    return jsonResponse({ ok: true, nilai: null });
  }
  await sql`INSERT INTO walidata_realisasi (indikator_id, bidang_id, tahun, nilai, updated_by)
            VALUES (${iid}, ${bid}, ${thn}, ${baru}, ${ctx.id})
            ON CONFLICT (indikator_id, bidang_id, tahun)
            DO UPDATE SET nilai = EXCLUDED.nilai, updated_by = EXCLUDED.updated_by, updated_at = NOW()`;
  await catatLog(sql, { indikator_id: iid, bidang_id: bid, tahun: thn, lama: lama?.nilai ?? null, baru, aksi: lama ? 'ubah' : 'input', user_id: ctx.id });
  return jsonResponse({ ok: true, nilai: baru });
}

// Pindahkan realisasi "belum ditetapkan unit" (bidang_id 0) ke satu unit pengampu. Nilai yang bentrok dengan data unit tsb dilewati.
async function pindahTanpaUnit(sql, indikatorId, bidangId, userId) {
  const bentrok = await sql`SELECT COUNT(*)::int AS n FROM walidata_realisasi r WHERE r.indikator_id = ${indikatorId} AND r.bidang_id = 0
      AND EXISTS (SELECT 1 FROM walidata_realisasi x WHERE x.indikator_id = r.indikator_id AND x.bidang_id = ${bidangId} AND x.tahun = r.tahun)`;
  const moved = await sql`UPDATE walidata_realisasi r SET bidang_id = ${bidangId}, updated_by = ${userId}, updated_at = NOW()
      WHERE r.indikator_id = ${indikatorId} AND r.bidang_id = 0
      AND NOT EXISTS (SELECT 1 FROM walidata_realisasi x WHERE x.indikator_id = r.indikator_id AND x.bidang_id = ${bidangId} AND x.tahun = r.tahun)
      RETURNING r.tahun, r.nilai`;
  for (const r of moved) {
    await catatLog(sql, { indikator_id: indikatorId, bidang_id: bidangId, tahun: r.tahun, lama: null, baru: r.nilai, aksi: 'pindah_unit', user_id: userId });
  }
  return { dipindah: moved.length, bentrok: bentrok[0].n };
}

async function pindahRealisasi(event, sql, ctx) {
  if (!ctx.admin) return errorResponse('Hanya admin yang dapat memindahkan realisasi', 403);
  const { indikator_id, bidang_id } = parseBody(event);
  const iid = parseInt(indikator_id, 10), bid = parseInt(bidang_id, 10);
  if (!iid || !bid) return errorResponse('Indikator dan unit kerja wajib diisi', 400);
  const ok = await sql`SELECT 1 FROM walidata_indikator_unit WHERE indikator_id = ${iid} AND bidang_id = ${bid}`;
  if (!ok.length) return errorResponse('Unit kerja tujuan harus pengampu indikator ini', 400);
  return jsonResponse({ ok: true, ...(await pindahTanpaUnit(sql, iid, bid, ctx.id)) });
}

// ── Indikator (master) ─────────────────────────────────────────────────────
async function simpanUnit(sql, indikatorId, unitIds) {
  const ids = [...new Set((unitIds || []).map(Number).filter(Boolean))];
  await sql`DELETE FROM walidata_indikator_unit WHERE indikator_id = ${indikatorId}`;
  if (ids.length) {
    await sql`INSERT INTO walidata_indikator_unit (indikator_id, bidang_id)
              SELECT ${indikatorId}, x FROM unnest(${ids}::int[]) AS x`;
  }
}

async function handleIndikator(event, sql, ctx, m, id, sub) {
  if (!ctx.admin) return errorResponse('Hanya admin yang dapat mengelola indikator', 403);

  // GET/PUT /indikator/:id/users - assign user per indikator (padanan /api/kinerja/indikator/:id/users)
  if (id && sub === 'users') {
    const ind = (await sql`SELECT id FROM walidata_indikator WHERE id = ${id} AND deleted_at IS NULL LIMIT 1`)[0];
    if (!ind) return errorResponse('Indikator tidak ditemukan', 404);
    if (m === 'GET') {
      await runOnce('users.is_active', () => sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE`);
      const userIds = (await sql`SELECT user_id FROM walidata_indikator_user WHERE indikator_id = ${id}`).map(r => Number(r.user_id));
      const unitIds = (await sql`SELECT bidang_id FROM walidata_indikator_unit WHERE indikator_id = ${id}`).map(r => Number(r.bidang_id));
      // Kandidat = user non-admin dari unit kerja pengampu (semua user bila unit belum ditetapkan).
      // Yang sudah ter-assign tetap ditampilkan supaya bisa dilepas.
      const noUnit = unitIds.length === 0;
      const users = await sql`
        SELECT u.id, u.nama, u.nip, b.nama AS bidang_nama, u.is_active
        FROM users u LEFT JOIN bidang b ON b.id = u.bidang_id
        WHERE u.is_admin = FALSE
          AND (${noUnit}::boolean OR u.bidang_id = ANY(${unitIds}::int[]) OR u.id = ANY(${userIds}::int[]))
        ORDER BY u.nama ASC`;
      return jsonResponse({ user_ids: userIds, users });
    }
    if (m === 'PUT') {
      const { user_ids } = parseBody(event);
      if (!Array.isArray(user_ids)) return errorResponse('Format user_ids tidak valid', 400);
      const ids = [...new Set(user_ids.map(Number).filter(n => Number.isInteger(n) && n > 0))];
      await sql`DELETE FROM walidata_indikator_user WHERE indikator_id = ${id}`;
      if (ids.length) {
        await sql`INSERT INTO walidata_indikator_user (indikator_id, user_id)
                  SELECT ${id}, x FROM unnest(${ids}::int[]) AS x ON CONFLICT DO NOTHING`;
      }
      return jsonResponse({ ok: true, user_ids: ids });
    }
    return errorResponse('Metode tidak didukung', 405);
  }

  if (m === 'GET') {
    const rows = await sql`
      SELECT i.*, COALESCE((SELECT json_agg(json_build_object('bidang_id', b.id, 'nama', b.nama, 'singkatan', b.singkatan) ORDER BY b.urutan, b.nama)
                            FROM walidata_indikator_unit u JOIN bidang b ON b.id = u.bidang_id
                            WHERE u.indikator_id = i.id), '[]'::json) AS unit,
             COALESCE((SELECT ARRAY_AGG(u.nama ORDER BY u.nama) FROM walidata_indikator_user iu JOIN users u ON u.id = iu.user_id
                       WHERE iu.indikator_id = i.id), '{}') AS pic_users,
             (SELECT COUNT(*)::int FROM walidata_realisasi r WHERE r.indikator_id = i.id) AS jumlah_realisasi
      FROM walidata_indikator i WHERE i.deleted_at IS NULL ORDER BY i.urutan, i.kode_ssd`;
    return jsonResponse({ indikator: rows });
  }

  if (m === 'DELETE' && id) {
    await sql`UPDATE walidata_indikator SET deleted_at = NOW() WHERE id = ${id}`;   // realisasi tetap tersimpan
    return jsonResponse({ ok: true });
  }

  if (m === 'POST' || m === 'PUT') {
    const b = parseBody(event);
    const kode = String(b.kode_ssd || '').trim();
    const uraian = String(b.uraian || '').trim();
    if (!kode) return errorResponse('Kode SSD wajib diisi', 400);
    if (!uraian) return errorResponse('Uraian wajib diisi', 400);
    const agregasi = b.agregasi || 'jumlah';
    if (!AGREGASI.includes(agregasi)) return errorResponse('Metode agregasi tidak valid', 400);
    if (b.unit_ids !== undefined && !Array.isArray(b.unit_ids)) return errorResponse('Format unit kerja tidak valid', 400);
    const unitIds = b.unit_ids || [];   // boleh kosong: admin menetapkan pengampu belakangan

    const dup = await sql`SELECT id FROM walidata_indikator WHERE LOWER(kode_ssd) = LOWER(${kode}) AND deleted_at IS NULL
                          AND id <> ${id || 0} LIMIT 1`;
    if (dup.length) return errorResponse('Kode SSD ' + kode + ' sudah digunakan', 409);

    if (m === 'POST') {
      // Kode yang pernah diarsipkan dipulihkan, supaya riwayat realisasinya tersambung kembali.
      const arsip = await sql`SELECT id FROM walidata_indikator WHERE LOWER(kode_ssd) = LOWER(${kode}) AND deleted_at IS NOT NULL
                              ORDER BY deleted_at DESC LIMIT 1`;
      let row;
      if (arsip.length) {
        row = (await sql`UPDATE walidata_indikator SET kode_ssd = ${kode}, uraian = ${uraian}, definisi = ${b.definisi || null},
                         satuan = ${b.satuan || null}, agregasi = ${agregasi}, deleted_at = NULL, updated_at = NOW()
                         WHERE id = ${arsip[0].id} RETURNING *`)[0];
      } else {
        row = (await sql`INSERT INTO walidata_indikator (kode_ssd, uraian, definisi, satuan, agregasi)
                         VALUES (${kode}, ${uraian}, ${b.definisi || null}, ${b.satuan || null}, ${agregasi}) RETURNING *`)[0];
      }
      await simpanUnit(sql, row.id, unitIds);
      if (unitIds.length === 1) await pindahTanpaUnit(sql, row.id, Number(unitIds[0]), ctx.id);
      return jsonResponse({ indikator: row, dipulihkan: arsip.length > 0 }, 201);
    }

    const row = (await sql`UPDATE walidata_indikator SET kode_ssd = ${kode}, uraian = ${uraian}, definisi = ${b.definisi || null},
                           satuan = ${b.satuan || null}, agregasi = ${agregasi}, updated_at = NOW()
                           WHERE id = ${id} AND deleted_at IS NULL RETURNING *`)[0];
    if (!row) return errorResponse('Indikator tidak ditemukan', 404);
    await simpanUnit(sql, id, unitIds);   // realisasi unit yang dilepas tidak dihapus (jadi riwayat)
    // Pengampu tunggal: realisasi "belum ditetapkan unit" otomatis dialihkan ke unit itu
    let pindah = null;
    if (unitIds.length === 1) pindah = await pindahTanpaUnit(sql, id, Number(unitIds[0]), ctx.id);
    return jsonResponse({ indikator: row, pindah });
  }
  return errorResponse('Metode tidak didukung', 405);
}

// ── Import Excel ───────────────────────────────────────────────────────────
// Satu baris = satu (Kode SSD, Unit Kerja, Tahun). Jika Realisasi kosong, baris hanya mendaftarkan
// master/pengampu (Unit Kerja boleh lebih dari satu, dipisah ";").
function splitUnit(s) { return String(s || '').split(/[;\n|]/).map(x => x.trim()).filter(Boolean); }

async function handleImport(event, sql, ctx) {
  if (!ctx.admin) return errorResponse('Hanya admin yang dapat mengimpor data', 403);
  const { mode, rows, overwrite } = parseBody(event);
  if (!Array.isArray(rows) || !rows.length) return errorResponse('Tidak ada data untuk diimpor', 400);
  if (rows.length > 8000) return errorResponse('Maksimal 8000 baris per impor', 400);

  const bidang = await sql`SELECT id, nama, singkatan FROM bidang WHERE deleted_at IS NULL`;
  const bidangMap = new Map();
  for (const b of bidang) {
    bidangMap.set(b.nama.trim().toLowerCase(), b.id);
    if (b.singkatan) bidangMap.set(b.singkatan.trim().toLowerCase(), b.id);
  }
  const indikatorDb = await sql`SELECT * FROM walidata_indikator WHERE deleted_at IS NULL`;
  const indByKode = new Map(indikatorDb.map(i => [i.kode_ssd.toLowerCase(), i]));
  const arsipDb = await sql`SELECT * FROM walidata_indikator WHERE deleted_at IS NOT NULL ORDER BY deleted_at`;
  const arsipByKode = new Map(arsipDb.map(i => [i.kode_ssd.toLowerCase(), i]));
  const existing = await sql`SELECT indikator_id, bidang_id, tahun, nilai FROM walidata_realisasi`;
  const existKey = new Map(existing.map(r => [`${r.indikator_id}|${r.bidang_id}|${r.tahun}`, Number(r.nilai)]));

  // Baris format lebar hanya membawa uraian/definisi/satuan pada kemunculan pertama tiap Kode SSD
  // (supaya payload kecil); baris berikutnya memakai data master dari baris pertama itu.
  const fileMaster = new Map();
  for (const r of rows) {
    const k = String(r.kode_ssd ?? '').trim().toLowerCase();
    if (!k) continue;
    const cur = fileMaster.get(k) || { uraian: '', definisi: '', satuan: '' };
    for (const f of ['uraian', 'definisi', 'satuan']) if (!cur[f] && String(r[f] ?? '').trim()) cur[f] = String(r[f]).trim();
    fileMaster.set(k, cur);
  }

  const seen = new Set();
  const hasil = rows.map((r, idx) => {
    const kodeRaw = String(r.kode_ssd ?? '').trim();
    const fm = fileMaster.get(kodeRaw.toLowerCase()) || { uraian: '', definisi: '', satuan: '' };
    const out = { baris: r._baris || idx + 2, status: 'baru', pesan: [], kode_ssd: kodeRaw,
                  uraian: String(r.uraian ?? '').trim() || fm.uraian, definisi: String(r.definisi ?? '').trim() || fm.definisi,
                  satuan: String(r.satuan ?? '').trim() || fm.satuan, unit_ids: [], unit_nama: String(r.unit_kerja ?? '').trim(),
                  tahun: null, nilai: null, master_baru: false, master_beda: false };
    const err = (p) => { out.status = 'error'; out.pesan.push(p); };

    if (!out.kode_ssd) err('Kode SSD kosong');
    const ind = indByKode.get(out.kode_ssd.toLowerCase());
    const arsip = arsipByKode.get(out.kode_ssd.toLowerCase());
    if (!ind && !arsip && !out.uraian) err('Uraian wajib diisi untuk Kode SSD baru');
    out.master_baru = !ind && !arsip;

    const namaUnit = splitUnit(r.unit_kerja);
    for (const n of namaUnit) {
      const bid = bidangMap.get(n.toLowerCase());
      if (!bid) err(`Unit Kerja "${n}" tidak ditemukan`); else out.unit_ids.push(bid);
    }

    out.unit0 = out.unit_ids[0] ?? 0;   // 0 = unit belum ditetapkan (diset admin belakangan)
    const nilai = parseNum(r.realisasi);
    if (Number.isNaN(nilai)) err('Realisasi bukan angka');
    else out.nilai = nilai;

    if (out.nilai !== null) {
      const thn = parseInt(r.tahun, 10);
      if (!thn || thn < 1990 || thn > 2100) err('Tahun tidak valid');
      else out.tahun = thn;
      if (namaUnit.length > 1) err('Baris dengan Realisasi hanya boleh satu Unit Kerja');
    }

    if (out.status !== 'error' && out.nilai !== null) {
      const key = `${out.kode_ssd.toLowerCase()}|${out.unit0}|${out.tahun}`;
      if (seen.has(key)) err('Duplikat dalam file (Kode SSD + Unit Kerja + Tahun)');
      seen.add(key);
    }

    const target = ind || arsip;
    if (out.status !== 'error' && target) {
      out.master_beda = (out.uraian && out.uraian !== target.uraian) || (out.definisi && out.definisi !== (target.definisi || ''))
                     || (out.satuan && out.satuan !== (target.satuan || ''));
      if (out.nilai !== null) {
        const lama = existKey.get(`${target.id}|${out.unit0}|${out.tahun}`);
        if (lama !== undefined) {
          if (lama === out.nilai) { out.status = 'sama'; out.pesan.push('Nilai sama dengan data tersimpan, dilewati'); }
          else { out.status = 'konflik'; out.pesan.push(`Sudah ada nilai ${lama}, akan ditimpa jika dikonfirmasi`); out.nilai_lama = lama; }
        }
      }
    }
    if (out.status === 'baru' && out.nilai === null) out.status = out.master_baru ? 'baru' : 'master';
    return out;
  });

  const ringkas = hasil.reduce((a, h) => { a[h.status] = (a[h.status] || 0) + 1; return a; }, {});
  if (mode !== 'commit') {
    // Respons ringan: uraian/definisi tidak dikirim balik (bisa ribuan baris)
    return jsonResponse({
      hasil: hasil.map(h => ({ baris: h.baris, status: h.status, pesan: h.pesan, kode_ssd: h.kode_ssd, uraian: h.uraian.slice(0, 80),
                               unit_nama: h.unit_nama, tahun: h.tahun, nilai: h.nilai, master_baru: h.master_baru })),
      ringkas });
  }

  // ── commit: hanya baris tanpa error; konflik hanya jika overwrite dikonfirmasi ──
  const layak = hasil.filter(h => h.status !== 'error' && h.status !== 'sama' && (h.status !== 'konflik' || overwrite));
  let masterBaru = 0;
  const diproses = new Set();      // kode yang master-nya sudah ditangani pada request ini
  const unitPair = new Map();      // `${iid}|${bid}` -> [iid,bid]
  const batch = [];                // realisasi yang akan di-upsert

  for (const h of layak) {
    const kodeKey = h.kode_ssd.toLowerCase();
    let ind = indByKode.get(kodeKey);
    if (!diproses.has(kodeKey)) {
      diproses.add(kodeKey);
      const arsip = arsipByKode.get(kodeKey);
      if (!ind && arsip) {   // pulihkan indikator yang pernah diarsipkan
        ind = (await sql`UPDATE walidata_indikator SET deleted_at = NULL, updated_at = NOW() WHERE id = ${arsip.id} RETURNING *`)[0];
        indByKode.set(kodeKey, ind);
      }
      if (!ind) {
        ind = (await sql`INSERT INTO walidata_indikator (kode_ssd, uraian, definisi, satuan)
                         VALUES (${h.kode_ssd}, ${h.uraian}, ${h.definisi || null}, ${h.satuan || null}) RETURNING *`)[0];
        indByKode.set(kodeKey, ind);
        masterBaru++;
      } else if (overwrite && h.master_beda) {
        await sql`UPDATE walidata_indikator SET uraian = COALESCE(NULLIF(${h.uraian}, ''), uraian),
                  definisi = COALESCE(NULLIF(${h.definisi}, ''), definisi), satuan = COALESCE(NULLIF(${h.satuan}, ''), satuan),
                  updated_at = NOW() WHERE id = ${ind.id}`;
      }
    }
    // pengampu: hanya menambah, tidak pernah melepas unit yang sudah ada
    for (const bid of h.unit_ids) unitPair.set(`${ind.id}|${bid}`, [ind.id, bid]);
    if (h.nilai !== null) {
      const k = `${ind.id}|${h.unit0}|${h.tahun}`;
      batch.push({ iid: ind.id, bid: h.unit0, tahun: h.tahun, nilai: h.nilai, lama: existKey.get(k) });
      existKey.set(k, h.nilai);
    }
  }

  if (unitPair.size) {
    const p = [...unitPair.values()];
    await sql`INSERT INTO walidata_indikator_unit (indikator_id, bidang_id)
              SELECT a, b FROM unnest(${p.map(x => x[0])}::int[], ${p.map(x => x[1])}::int[]) AS t(a, b) ON CONFLICT DO NOTHING`;
  }
  let ditimpa = 0;
  if (batch.length) {
    const iids = batch.map(b => b.iid), bids = batch.map(b => b.bid), thns = batch.map(b => b.tahun);
    const nils = batch.map(b => String(b.nilai)), lamas = batch.map(b => (b.lama === undefined ? '' : String(b.lama)));
    ditimpa = batch.filter(b => b.lama !== undefined).length;
    await sql`INSERT INTO walidata_realisasi (indikator_id, bidang_id, tahun, nilai, updated_by)
              SELECT a, b, c, d::numeric, ${ctx.id} FROM unnest(${iids}::int[], ${bids}::int[], ${thns}::int[], ${nils}::text[]) AS t(a, b, c, d)
              ON CONFLICT (indikator_id, bidang_id, tahun)
              DO UPDATE SET nilai = EXCLUDED.nilai, updated_by = EXCLUDED.updated_by, updated_at = NOW()`;
    await sql`INSERT INTO walidata_realisasi_log (indikator_id, bidang_id, tahun, nilai_lama, nilai_baru, aksi, user_id)
              SELECT a, b, c, NULLIF(e, '')::numeric, d::numeric, 'import', ${ctx.id}
              FROM unnest(${iids}::int[], ${bids}::int[], ${thns}::int[], ${nils}::text[], ${lamas}::text[]) AS t(a, b, c, d, e)`;
  }
  // Total tidak disimpan sebagai kolom: dihitung ulang dari realisasi setiap kali Data SSD dibuka.
  return jsonResponse({ ok: true, ringkas: { master_baru: masterBaru, realisasi_disimpan: batch.length, ditimpa,
                         dilewati: hasil.length - layak.length } });
}
