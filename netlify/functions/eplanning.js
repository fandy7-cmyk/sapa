
import { getDb, jsonResponse, errorResponse, parseBody } from './_db.js';
import { requireAuth, requireAdmin } from './_auth.js';
import { logAudit } from './_audit.js';

let _migrated = false;
async function ensureSchema(sql) {
  if (_migrated) return;
  await sql`
    CREATE TABLE IF NOT EXISTS eplanning_usulan (
      id                TEXT PRIMARY KEY,
      bidang_id         INT REFERENCES bidang(id),
      bidang_nama       TEXT,
      sub_kegiatan      TEXT,
      indikator         TEXT,
      target            TEXT,
      total_anggaran    NUMERIC NOT NULL DEFAULT 0,
      status            TEXT NOT NULL DEFAULT 'DRAFT',
      pembuat_user_id   INT REFERENCES users(id),
      pembuat_nama      TEXT,
      tahun_anggaran    INT,
      link_surat_usulan TEXT,
      link_kak          TEXT,
      link_datadukung   TEXT,
      nama_kabid        TEXT,
      nip_kabid         TEXT,
      link_ttd          TEXT,
      nama_kadis        TEXT,
      nip_kadis         TEXT,
      link_ttd_kadis    TEXT,
      catatan_koreksi   TEXT,
      created_at        TIMESTAMPTZ DEFAULT NOW(),
      updated_at        TIMESTAMPTZ DEFAULT NOW()
    )
  `;
  await sql`ALTER TABLE eplanning_usulan ADD COLUMN IF NOT EXISTS bidang_tipe TEXT`;
  await sql`ALTER TABLE eplanning_usulan ADD COLUMN IF NOT EXISTS ditolak_oleh TEXT`;
  await sql`ALTER TABLE eplanning_usulan ADD COLUMN IF NOT EXISTS nama_sekretaris TEXT`;
  await sql`ALTER TABLE eplanning_usulan ADD COLUMN IF NOT EXISTS nip_sekretaris TEXT`;
  await sql`ALTER TABLE eplanning_usulan ADD COLUMN IF NOT EXISTS link_ttd_sekretaris TEXT`;
  await sql`UPDATE eplanning_usulan SET status = 'MENUNGGU ADMIN' WHERE status = 'DIAJUKAN KE ADMIN'`;
  await sql`UPDATE eplanning_usulan SET status = 'DITOLAK', ditolak_oleh = 'KEPALA' WHERE status = 'KOREKSI BIDANG'`;
  await sql`UPDATE eplanning_usulan SET status = 'SELESAI' WHERE status = 'DISETUJUI'`;
  await sql`
    UPDATE eplanning_usulan u SET
      status = CASE b.tipe
        WHEN 'puskesmas'  THEN 'MENUNGGU KEPALA PUSKESMAS'
        WHEN 'sub_bagian' THEN 'MENUNGGU KEPALA SUB BAGIAN'
        ELSE 'MENUNGGU KEPALA BIDANG'
      END,
      bidang_tipe = COALESCE(b.tipe, 'bidang')
    FROM bidang b
    WHERE u.bidang_id = b.id AND u.status = 'DIAJUKAN KE BIDANG'
  `;
  await sql`
    UPDATE eplanning_usulan SET status = 'MENUNGGU KEPALA BIDANG', bidang_tipe = 'bidang'
    WHERE status = 'DIAJUKAN KE BIDANG'
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS eplanning_rincian (
      id            TEXT PRIMARY KEY,
      usulan_id     TEXT REFERENCES eplanning_usulan(id) ON DELETE CASCADE,
      kode_rekening TEXT,
      nama_rekening TEXT,
      sumber_dana   TEXT,
      komponen      TEXT,
      spesifikasi   TEXT,
      keterangan    TEXT,
      koefisien     TEXT,
      volume        NUMERIC DEFAULT 0,
      harga_satuan  NUMERIC DEFAULT 0,
      sub_total     NUMERIC DEFAULT 0,
      status_item   TEXT,
      catatan       TEXT,
      created_at    TIMESTAMPTZ DEFAULT NOW(),
      updated_at    TIMESTAMPTZ DEFAULT NOW()
    )
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS eplanning_rekening (
      kode_rekening TEXT PRIMARY KEY,
      nama_rekening TEXT NOT NULL,
      aktif         BOOLEAN NOT NULL DEFAULT true
    )
  `;
  await sql`ALTER TABLE eplanning_rekening ADD COLUMN IF NOT EXISTS aktif BOOLEAN NOT NULL DEFAULT true`;
  await sql`
    CREATE TABLE IF NOT EXISTS eplanning_subkegiatan (
      kode_subkegiatan TEXT PRIMARY KEY,
      nama_subkegiatan TEXT NOT NULL,
      indikator        TEXT,
      satuan           TEXT,
      aktif            BOOLEAN NOT NULL DEFAULT true
    )
  `;
  await sql`ALTER TABLE eplanning_subkegiatan ADD COLUMN IF NOT EXISTS aktif BOOLEAN NOT NULL DEFAULT true`;
  await sql`
    CREATE TABLE IF NOT EXISTS eplanning_sumberdana (
      id   SERIAL PRIMARY KEY,
      nama TEXT UNIQUE NOT NULL,
      aktif BOOLEAN NOT NULL DEFAULT true
    )
  `;
  await sql`ALTER TABLE eplanning_sumberdana ADD COLUMN IF NOT EXISTS aktif BOOLEAN NOT NULL DEFAULT true`;
  await sql`ALTER TABLE eplanning_sumberdana ADD COLUMN IF NOT EXISTS kode TEXT`;
  await sql`
    CREATE TABLE IF NOT EXISTS eplanning_satuan (
      id   SERIAL PRIMARY KEY,
      nama TEXT UNIQUE NOT NULL,
      aktif BOOLEAN NOT NULL DEFAULT true
    )
  `;
  await sql`ALTER TABLE eplanning_satuan ADD COLUMN IF NOT EXISTS aktif BOOLEAN NOT NULL DEFAULT true`;
  await sql`
    CREATE TABLE IF NOT EXISTS eplanning_provinsi (
      id   SERIAL PRIMARY KEY,
      nama TEXT UNIQUE NOT NULL
    )
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS eplanning_kabkota (
      id           SERIAL PRIMARY KEY,
      provinsi_id  INT NOT NULL REFERENCES eplanning_provinsi(id) ON DELETE CASCADE,
      nama         TEXT NOT NULL,
      tipe         TEXT NOT NULL DEFAULT 'Kabupaten',
      UNIQUE(provinsi_id, nama)
    )
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS eplanning_kecamatan (
      id          SERIAL PRIMARY KEY,
      kabkota_id  INT NOT NULL REFERENCES eplanning_kabkota(id) ON DELETE CASCADE,
      nama        TEXT NOT NULL,
      UNIQUE(kabkota_id, nama)
    )
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS eplanning_desakelurahan (
      id            SERIAL PRIMARY KEY,
      kecamatan_id  INT NOT NULL REFERENCES eplanning_kecamatan(id) ON DELETE CASCADE,
      nama          TEXT NOT NULL,
      tipe          TEXT NOT NULL DEFAULT 'Desa',
      UNIQUE(kecamatan_id, nama)
    )
  `;
  const [{ count: kabkotaCount }] = await sql`SELECT COUNT(*)::int AS count FROM eplanning_kabkota`;
  if (kabkotaCount === 0) {
    const [prov] = await sql`
      INSERT INTO eplanning_provinsi (nama) VALUES ('Sulawesi Tengah')
      ON CONFLICT (nama) DO UPDATE SET nama = EXCLUDED.nama RETURNING id`;
    const [kab] = await sql`
      INSERT INTO eplanning_kabkota (provinsi_id, nama, tipe)
      VALUES (${prov.id}, 'Banggai Laut', 'Kabupaten') RETURNING id`;
    const WILAYAH_BANGGAI_LAUT = {
      'Labobo': ['Alasan', 'Bontosi', 'Lalong', 'Lipulalongo', 'Liputalas', 'Mansalean', 'Padingkian', 'Paisulamo'],
      'Bokan Kepulauan': ['Bolokut', 'Bungin', 'Kasuari', 'Kaukes', 'Keak', 'Kokudang', 'Mandel', 'Mbuang Mbuang', 'Minanga', 'Ndindibung', 'Nggasuang', 'Paisubebe', 'Panapat', 'Sonit', 'Timpaus', 'Toropot'],
      'Bangkurung': ['Bone Bone', 'Bungin Luean', 'Dungkean', 'Kalupapi', 'Kanari', 'Lalong', 'Lantibung', 'Mbeleang', 'Sasabobok', 'Tabulang', 'Taduno', 'Togong Sagu'],
      'Banggai Utara': ['Bone Baru', 'Kendek', 'Lokotoi', 'Paisumosoni', 'Popisi', 'Tolise Tubono'],
      'Banggai Tengah': ['Adean', 'Badumpayan', 'Gonggong', 'Mominit', 'Monsongan', 'Posos Lalongo', 'Timbong', 'Tintingo'],
      'Banggai Selatan': ['Bentean', 'Kelapa Lima', 'Labuan Kapelak', 'Malino Padas', 'Matanga', 'Tolokibit'],
      'Banggai': ['Dangkalan', 'Dodung|Kelurahan', 'Kokini', 'Lambako', 'Lampa', 'Lompio|Kelurahan', 'Pasir Putih', 'Potil Pololoba', 'Tano Bonunungan|Kelurahan', 'Tinakin Laut'],
    };
    for (const [namaKec, daftarDesa] of Object.entries(WILAYAH_BANGGAI_LAUT)) {
      const [kec] = await sql`
        INSERT INTO eplanning_kecamatan (kabkota_id, nama) VALUES (${kab.id}, ${namaKec}) RETURNING id`;
      for (const entry of daftarDesa) {
        const [namaDesa, tipe] = entry.split('|');
        await sql`
          INSERT INTO eplanning_desakelurahan (kecamatan_id, nama, tipe)
          VALUES (${kec.id}, ${namaDesa}, ${tipe || 'Desa'})`;
      }
    }
  }
  await sql`ALTER TABLE eplanning_usulan ADD COLUMN IF NOT EXISTS lokasi_pelaksanaan_kabkota_id INT REFERENCES eplanning_kabkota(id)`;
  await sql`ALTER TABLE eplanning_usulan ADD COLUMN IF NOT EXISTS rincian_lokasi JSONB NOT NULL DEFAULT '[]'::jsonb`;
  await sql`
    CREATE TABLE IF NOT EXISTS eplanning_prioritasprov (
      id SERIAL PRIMARY KEY, nama TEXT UNIQUE NOT NULL, aktif BOOLEAN NOT NULL DEFAULT true
    )
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS eplanning_prioritaskabkota (
      id SERIAL PRIMARY KEY, nama TEXT UNIQUE NOT NULL, aktif BOOLEAN NOT NULL DEFAULT true
    )
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS eplanning_bidangurusan (
      id SERIAL PRIMARY KEY, nama TEXT UNIQUE NOT NULL, aktif BOOLEAN NOT NULL DEFAULT true
    )
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS eplanning_tagbelanja (
      id SERIAL PRIMARY KEY, nama TEXT UNIQUE NOT NULL, aktif BOOLEAN NOT NULL DEFAULT true
    )
  `;
  await sql`ALTER TABLE eplanning_usulan ADD COLUMN IF NOT EXISTS prioritas_provinsi_id INT REFERENCES eplanning_prioritasprov(id)`;
  await sql`ALTER TABLE eplanning_usulan ADD COLUMN IF NOT EXISTS prioritas_provinsi_nama TEXT`;
  await sql`ALTER TABLE eplanning_usulan ADD COLUMN IF NOT EXISTS prioritas_kabkota_id INT REFERENCES eplanning_prioritaskabkota(id)`;
  await sql`ALTER TABLE eplanning_usulan ADD COLUMN IF NOT EXISTS prioritas_kabkota_nama TEXT`;
  await sql`ALTER TABLE eplanning_usulan ADD COLUMN IF NOT EXISTS bidang_urusan_id INT REFERENCES eplanning_bidangurusan(id)`;
  await sql`ALTER TABLE eplanning_usulan ADD COLUMN IF NOT EXISTS bidang_urusan_nama TEXT`;
  await sql`ALTER TABLE eplanning_usulan ADD COLUMN IF NOT EXISTS tag_belanja JSONB NOT NULL DEFAULT '[]'::jsonb`;
  await sql`ALTER TABLE eplanning_usulan ADD COLUMN IF NOT EXISTS anggaran_n1 NUMERIC`;
  await sql`ALTER TABLE eplanning_usulan ADD COLUMN IF NOT EXISTS anggaran_n2 NUMERIC`;
  await sql`ALTER TABLE eplanning_usulan ADD COLUMN IF NOT EXISTS waktu_mulai_bulan SMALLINT`;
  await sql`ALTER TABLE eplanning_usulan ADD COLUMN IF NOT EXISTS waktu_selesai_bulan SMALLINT`;
  await sql`ALTER TABLE eplanning_usulan ADD COLUMN IF NOT EXISTS sumber_dana_summary JSONB NOT NULL DEFAULT '[]'::jsonb`;
  await sql`
    CREATE TABLE IF NOT EXISTS eplanning_standar_harga (
      id                     SERIAL PRIMARY KEY,
      kategori               TEXT NOT NULL,
      kode_kelompok_barang   TEXT,
      uraian_kelompok_barang TEXT,
      id_standar_harga       TEXT,
      kode_barang            TEXT,
      uraian_barang          TEXT NOT NULL,
      spesifikasi            TEXT,
      satuan                 TEXT,
      harga_satuan           NUMERIC NOT NULL DEFAULT 0,
      kode_rekening          TEXT,
      tkdn                   NUMERIC,
      aktif                  BOOLEAN NOT NULL DEFAULT true,
      created_at             TIMESTAMPTZ DEFAULT NOW(),
      updated_at             TIMESTAMPTZ DEFAULT NOW()
    )
  `;
  await sql`ALTER TABLE eplanning_standar_harga ADD COLUMN IF NOT EXISTS tkdn NUMERIC`;
  await sql`ALTER TABLE eplanning_standar_harga ADD COLUMN IF NOT EXISTS tahun INT`;
  await sql`UPDATE eplanning_standar_harga SET tahun = 2027 WHERE tahun IS NULL`;
  await sql`CREATE INDEX IF NOT EXISTS idx_eplanning_usulan_bidang ON eplanning_usulan(bidang_id)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_eplanning_usulan_status ON eplanning_usulan(status)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_eplanning_usulan_tahun ON eplanning_usulan(tahun_anggaran)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_eplanning_rincian_usulan ON eplanning_rincian(usulan_id)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_eplanning_rekening_nama ON eplanning_rekening(nama_rekening)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_eplanning_standarharga_kategori ON eplanning_standar_harga(kategori)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_eplanning_standarharga_uraian ON eplanning_standar_harga(uraian_barang)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_eplanning_standarharga_kode ON eplanning_standar_harga(kode_barang)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_eplanning_standarharga_tahun ON eplanning_standar_harga(tahun)`;
  _migrated = true;
}

function generateId(prefix) {
  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
}

const TIPE_KEPALA_LABEL = {
  puskesmas:  'PUSKESMAS',
  bidang:     'BIDANG',
  sub_bagian: 'SUB BAGIAN',
};
function statusMenungguKepala(bidangTipe) {
  return `MENUNGGU KEPALA ${TIPE_KEPALA_LABEL[bidangTipe] || 'BIDANG'}`;
}
function isStatusMenungguKepala(status) {
  return typeof status === 'string' && status.startsWith('MENUNGGU KEPALA');
}

async function getRole(sql, auth) {
  if (auth.is_admin) return { isAdmin: true, isKabid: false, isOperator: false, isSekretaris: false, bidangId: null };
  const perms = await sql`SELECT menu_key FROM user_permissions WHERE user_id = ${auth.id}`;
  const keys = perms.map(p => p.menu_key);
  const userRows = await sql`SELECT bidang_id FROM users WHERE id = ${auth.id} LIMIT 1`;
  return {
    isAdmin: keys.includes('eplanning.admin'),
    isKabid: keys.includes('eplanning.kabid'),
    isOperator: keys.includes('eplanning.operator'),
    isSekretaris: keys.includes('eplanning.sekretaris'),
    bidangId: userRows[0]?.bidang_id ?? null,
  };
}

async function recalcTotal(sql, usulanId) {
  const rows = await sql`
    SELECT COALESCE(SUM(sub_total), 0) AS total FROM eplanning_rincian WHERE usulan_id = ${usulanId}
  `;
  const perSumber = await sql`
    SELECT COALESCE(NULLIF(sumber_dana, ''), 'Belum ditentukan') AS nama, COALESCE(SUM(sub_total), 0) AS total
    FROM eplanning_rincian WHERE usulan_id = ${usulanId}
    GROUP BY 1 ORDER BY 1
  `;
  await sql`
    UPDATE eplanning_usulan SET
      total_anggaran = ${rows[0].total},
      sumber_dana_summary = ${JSON.stringify(perSumber)},
      updated_at = NOW()
    WHERE id = ${usulanId}`;
}

export const handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return jsonResponse({});

  const sql = getDb();
  await ensureSchema(sql);

  const auth = requireAuth(event);
  if (!auth) return errorResponse('Unauthorized', 401);

  const role = await getRole(sql, auth);
  if (!role.isAdmin && !role.isKabid && !role.isOperator && !role.isSekretaris) {
    return errorResponse('Anda belum memiliki akses ke modul e-Planning', 403);
  }

  const rawPath = event.path.replace(/.*\/eplanning/, '') || '/';
  const segments = rawPath.split('/').filter(Boolean);
  const resource = segments[0] || '';
  const qs = event.queryStringParameters || {};

  try {
    if (resource === 'tahun') {
      const rows = await sql`
        SELECT tahun FROM periode WHERE jenis = 'eplanning' AND tahun IS NOT NULL
        UNION SELECT tahun_anggaran AS tahun FROM eplanning_usulan WHERE tahun_anggaran IS NOT NULL
        UNION SELECT tahun FROM eplanning_standar_harga WHERE tahun IS NOT NULL
        ORDER BY tahun DESC`;
      let tahunList = rows.map(r => r.tahun);
      if (!tahunList.length) tahunList = [new Date().getFullYear() + 1];
      return jsonResponse({ tahun: tahunList });
    }

    if (resource === 'usulan') {
      const id = segments[1] || null;
      const action = segments[2] || null;

      if (event.httpMethod === 'GET' && id) {
        const rows = await sql`SELECT * FROM eplanning_usulan WHERE id = ${id} LIMIT 1`;
        if (!rows.length) return errorResponse('Usulan tidak ditemukan', 404);
        const u = rows[0];
        if (!role.isAdmin && !(role.isKabid && role.bidangId === u.bidang_id) &&
            !(role.isSekretaris && u.bidang_tipe === 'sub_bagian') &&
            !(role.isOperator && u.pembuat_user_id === auth.id)) {
          return errorResponse('Unauthorized', 401);
        }
        return jsonResponse({ usulan: u });
      }

      if (event.httpMethod === 'GET' && !id) {
        const tahunFilter = qs.tahun && /^\d{4}$/.test(qs.tahun) ? parseInt(qs.tahun) : null;
        let rows;
        if (role.isAdmin) {
          if (qs.status) {
            rows = await sql`
              SELECT * FROM eplanning_usulan
              WHERE status = ${qs.status}
                AND (${tahunFilter}::int IS NULL OR tahun_anggaran = ${tahunFilter}::int
                     OR (${tahunFilter}::int = 2027 AND tahun_anggaran IS NULL))
              ORDER BY updated_at DESC`;
          } else {
            rows = await sql`
              SELECT * FROM eplanning_usulan
              WHERE status != 'DRAFT'
                AND (${tahunFilter}::int IS NULL OR tahun_anggaran = ${tahunFilter}::int
                     OR (${tahunFilter}::int = 2027 AND tahun_anggaran IS NULL))
              ORDER BY updated_at DESC`;
          }
        } else if (role.isKabid) {
          rows = await sql`
            SELECT * FROM eplanning_usulan
            WHERE bidang_id = ${role.bidangId}
              AND (${tahunFilter}::int IS NULL OR tahun_anggaran = ${tahunFilter}::int
                   OR (${tahunFilter}::int = 2027 AND tahun_anggaran IS NULL))
            ORDER BY updated_at DESC`;
        } else if (role.isSekretaris) {
          rows = await sql`
            SELECT * FROM eplanning_usulan
            WHERE bidang_tipe = 'sub_bagian'
              AND (${tahunFilter}::int IS NULL OR tahun_anggaran = ${tahunFilter}::int
                   OR (${tahunFilter}::int = 2027 AND tahun_anggaran IS NULL))
            ORDER BY updated_at DESC`;
        } else {
          rows = await sql`
            SELECT * FROM eplanning_usulan
            WHERE bidang_id = ${role.bidangId} AND pembuat_user_id = ${auth.id}
              AND (${tahunFilter}::int IS NULL OR tahun_anggaran = ${tahunFilter}::int
                   OR (${tahunFilter}::int = 2027 AND tahun_anggaran IS NULL))
            ORDER BY updated_at DESC`;
        }
        return jsonResponse({ usulan: rows });
      }

      if (event.httpMethod === 'PUT' && id && action === 'submit') {
        const cur = await sql`SELECT pembuat_user_id, bidang_id, status FROM eplanning_usulan WHERE id = ${id} LIMIT 1`;
        if (!cur.length) return errorResponse('Usulan tidak ditemukan', 404);
        if (!role.isAdmin && cur[0].pembuat_user_id !== auth.id) return errorResponse('Unauthorized', 401);
        if (!['DRAFT'].includes(cur[0].status)) return errorResponse('Usulan sudah diajukan, tidak bisa disubmit ulang', 409);
        const b = await sql`SELECT tipe FROM bidang WHERE id = ${cur[0].bidang_id} LIMIT 1`;
        const bidangTipe = b[0]?.tipe || 'bidang';
        const rows = await sql`
          UPDATE eplanning_usulan SET
            status = ${statusMenungguKepala(bidangTipe)}, bidang_tipe = ${bidangTipe},
            ditolak_oleh = NULL, updated_at = NOW()
          WHERE id = ${id} RETURNING *`;
        await logAudit(sql, event, { user_id: auth.id, nama: auth.nama, aksi: 'eplanning_submit', entitas: 'eplanning_usulan', entitas_id: id });
        return jsonResponse({ usulan: rows[0] });
      }

      if (event.httpMethod === 'PUT' && id && action === 'approve-kabid') {
        if (!role.isAdmin && !role.isKabid) return errorResponse('Unauthorized', 401);
        const cur = await sql`SELECT bidang_id, bidang_tipe, status FROM eplanning_usulan WHERE id = ${id} LIMIT 1`;
        if (!cur.length) return errorResponse('Usulan tidak ditemukan', 404);
        if (role.isKabid && !role.isAdmin && cur[0].bidang_id !== role.bidangId) return errorResponse('Unauthorized', 401);
        if (!isStatusMenungguKepala(cur[0].status)) return errorResponse('Usulan belum di tahap Menunggu Kepala', 409);
        const { nama_kabid, nip_kabid, link_ttd } = parseBody(event);
        if (!nama_kabid || !nip_kabid) return errorResponse('Nama dan NIP Kepala wajib diisi', 400);
        const nextStatus = cur[0].bidang_tipe === 'sub_bagian' ? 'MENUNGGU SEKRETARIS' : 'MENUNGGU ADMIN';
        const rows = await sql`
          UPDATE eplanning_usulan SET
            status = ${nextStatus},
            nama_kabid = ${nama_kabid}, nip_kabid = ${nip_kabid}, link_ttd = ${link_ttd || null},
            updated_at = NOW()
          WHERE id = ${id} RETURNING *`;
        await logAudit(sql, event, { user_id: auth.id, nama: auth.nama, aksi: 'eplanning_approve_kabid', entitas: 'eplanning_usulan', entitas_id: id, detail: { nextStatus } });
        return jsonResponse({ usulan: rows[0] });
      }

      if (event.httpMethod === 'PUT' && id && action === 'approve-sekretaris') {
        if (!role.isAdmin && !role.isSekretaris) return errorResponse('Unauthorized', 401);
        const cur = await sql`SELECT status, bidang_tipe FROM eplanning_usulan WHERE id = ${id} LIMIT 1`;
        if (!cur.length) return errorResponse('Usulan tidak ditemukan', 404);
        if (cur[0].status !== 'MENUNGGU SEKRETARIS') return errorResponse('Usulan belum di tahap Menunggu Sekretaris', 409);
        const { nama_sekretaris, nip_sekretaris, link_ttd_sekretaris } = parseBody(event);
        if (!nama_sekretaris || !nip_sekretaris) return errorResponse('Nama dan NIP Sekretaris wajib diisi', 400);
        const rows = await sql`
          UPDATE eplanning_usulan SET
            status = 'MENUNGGU ADMIN',
            nama_sekretaris = ${nama_sekretaris}, nip_sekretaris = ${nip_sekretaris},
            link_ttd_sekretaris = ${link_ttd_sekretaris || null},
            updated_at = NOW()
          WHERE id = ${id} RETURNING *`;
        await logAudit(sql, event, { user_id: auth.id, nama: auth.nama, aksi: 'eplanning_approve_sekretaris', entitas: 'eplanning_usulan', entitas_id: id });
        return jsonResponse({ usulan: rows[0] });
      }

      if (event.httpMethod === 'PUT' && id && action === 'approve-admin') {
        if (!role.isAdmin) return errorResponse('Unauthorized', 401);
        const cur = await sql`SELECT status FROM eplanning_usulan WHERE id = ${id} LIMIT 1`;
        if (!cur.length) return errorResponse('Usulan tidak ditemukan', 404);
        if (cur[0].status !== 'MENUNGGU ADMIN') return errorResponse('Usulan belum di tahap Menunggu Admin', 409);
        const { nama_kadis, nip_kadis, link_ttd_kadis } = parseBody(event);
        if (!nama_kadis || !nip_kadis) return errorResponse('Nama dan NIP Kepala Dinas wajib diisi', 400);
        const rows = await sql`
          UPDATE eplanning_usulan SET
            status = 'SELESAI',
            nama_kadis = ${nama_kadis}, nip_kadis = ${nip_kadis}, link_ttd_kadis = ${link_ttd_kadis || null},
            updated_at = NOW()
          WHERE id = ${id} RETURNING *`;
        if (!rows.length) return errorResponse('Usulan tidak ditemukan', 404);
        await logAudit(sql, event, { user_id: auth.id, nama: auth.nama, aksi: 'eplanning_approve_admin', entitas: 'eplanning_usulan', entitas_id: id });
        return jsonResponse({ usulan: rows[0] });
      }

      if (event.httpMethod === 'PUT' && id && action === 'status') {
        if (!role.isAdmin && !role.isKabid && !role.isSekretaris) return errorResponse('Unauthorized', 401);
        const { status, catatan_koreksi } = parseBody(event);
        const ALLOWED = ['DITOLAK'];
        if (!ALLOWED.includes(status)) return errorResponse('Status tidak valid', 400);
        if (!catatan_koreksi || !catatan_koreksi.trim()) return errorResponse('Catatan alasan penolakan wajib diisi', 400);
        const cur = await sql`SELECT status FROM eplanning_usulan WHERE id = ${id} LIMIT 1`;
        if (!cur.length) return errorResponse('Usulan tidak ditemukan', 404);
        let ditolakOleh;
        if (cur[0].status === 'MENUNGGU ADMIN') ditolakOleh = 'ADMIN';
        else if (cur[0].status === 'MENUNGGU SEKRETARIS') ditolakOleh = 'SEKRETARIS';
        else ditolakOleh = 'KEPALA';
        const rows = await sql`
          UPDATE eplanning_usulan SET status = ${status},
            catatan_koreksi = ${catatan_koreksi.trim()}, ditolak_oleh = ${ditolakOleh}, updated_at = NOW()
          WHERE id = ${id} RETURNING *`;
        if (!rows.length) return errorResponse('Usulan tidak ditemukan', 404);
        await logAudit(sql, event, { user_id: auth.id, nama: auth.nama, aksi: 'eplanning_set_status', entitas: 'eplanning_usulan', entitas_id: id, detail: { status, ditolakOleh } });
        return jsonResponse({ usulan: rows[0] });
      }

      if (event.httpMethod === 'POST' && !id) {
        if (!role.isAdmin && !role.isOperator) return errorResponse('Unauthorized', 401);
        const body = parseBody(event);

        if (!role.isAdmin) {
          try {
            const win = await sql`
              SELECT open_at, close_at FROM periode
              WHERE jenis = 'eplanning' AND bulan IS NULL
                AND open_at <= NOW() AND close_at >= NOW()
              LIMIT 1`;
            if (!win.length) {
              const any = await sql`
                SELECT open_at, close_at FROM periode
                WHERE jenis = 'eplanning' AND bulan IS NULL
                ORDER BY tahun DESC LIMIT 1`;
              if (!any.length) return errorResponse('Periode pengusulan e-Planning belum diatur.', 403);
              const p = any[0];
              const now = Date.now();
              const open = p.open_at ? new Date(p.open_at).getTime() : null;
              const close = p.close_at ? new Date(p.close_at).getTime() : null;
              if (open && now < open) return errorResponse('Periode pengusulan e-Planning belum dibuka.', 403);
              if (close && now > close) return errorResponse('Periode pengusulan e-Planning sudah ditutup.', 403);
              return errorResponse('Periode pengusulan e-Planning sedang tidak terbuka.', 403);
            }
          } catch (err) {
            console.warn('[eplanning/usulan] Gagal cek window periode:', err.message);
          }
        }
        let usulanId = body.id;
        const isNew = !usulanId;
        if (isNew) usulanId = generateId('USL');

        let bidangId = role.bidangId;
        let bidangNama = null;
        if (bidangId) {
          const b = await sql`SELECT nama FROM bidang WHERE id = ${bidangId} LIMIT 1`;
          bidangNama = b[0]?.nama || null;
        }

        if (!isNew) {
          const existing = await sql`SELECT pembuat_user_id, status FROM eplanning_usulan WHERE id = ${usulanId} LIMIT 1`;
          if (!existing.length) return errorResponse('Usulan tidak ditemukan', 404);
          if (!role.isAdmin && existing[0].pembuat_user_id !== auth.id) return errorResponse('Unauthorized', 401);
          if (!role.isAdmin && !['DRAFT', 'DITOLAK'].includes(existing[0].status)) {
            return errorResponse('Usulan yang sudah diajukan tidak bisa diedit lagi', 409);
          }
          const rows = await sql`
            UPDATE eplanning_usulan SET
              sub_kegiatan = ${body.sub_kegiatan || null},
              indikator    = ${body.indikator || null},
              target       = ${body.target || null},
              tahun_anggaran = ${body.tahun_anggaran || null},
              link_surat_usulan = ${body.link_surat_usulan ?? null},
              link_kak           = ${body.link_kak ?? null},
              link_datadukung    = ${body.link_datadukung ?? null},
              lokasi_pelaksanaan_kabkota_id = ${body.lokasi_pelaksanaan_kabkota_id || null},
              rincian_lokasi = ${JSON.stringify(body.rincian_lokasi || [])},
              prioritas_provinsi_id = ${body.prioritas_provinsi_id || null},
              prioritas_provinsi_nama = ${body.prioritas_provinsi_nama || null},
              prioritas_kabkota_id = ${body.prioritas_kabkota_id || null},
              prioritas_kabkota_nama = ${body.prioritas_kabkota_nama || null},
              bidang_urusan_id = ${body.bidang_urusan_id || null},
              bidang_urusan_nama = ${body.bidang_urusan_nama || null},
              tag_belanja = ${JSON.stringify(body.tag_belanja || [])},
              anggaran_n1 = ${body.anggaran_n1 ?? null},
              anggaran_n2 = ${body.anggaran_n2 ?? null},
              waktu_mulai_bulan = ${body.waktu_mulai_bulan || null},
              waktu_selesai_bulan = ${body.waktu_selesai_bulan || null},
              status = CASE WHEN status = 'DITOLAK' THEN 'DRAFT' ELSE status END,
              ditolak_oleh = CASE WHEN status = 'DITOLAK' THEN NULL ELSE ditolak_oleh END,
              updated_at = NOW()
            WHERE id = ${usulanId} RETURNING *`;
          return jsonResponse({ usulan: rows[0] });
        }

        const rows = await sql`
          INSERT INTO eplanning_usulan (
            id, bidang_id, bidang_nama, sub_kegiatan, indikator, target, status,
            pembuat_user_id, pembuat_nama, tahun_anggaran,
            link_surat_usulan, link_kak, link_datadukung,
            lokasi_pelaksanaan_kabkota_id, rincian_lokasi,
            prioritas_provinsi_id, prioritas_provinsi_nama,
            prioritas_kabkota_id, prioritas_kabkota_nama,
            bidang_urusan_id, bidang_urusan_nama, tag_belanja,
            anggaran_n1, anggaran_n2, waktu_mulai_bulan, waktu_selesai_bulan
          ) VALUES (
            ${usulanId}, ${bidangId}, ${bidangNama}, ${body.sub_kegiatan || null}, ${body.indikator || null},
            ${body.target || null}, 'DRAFT', ${auth.id}, ${auth.nama}, ${body.tahun_anggaran || null},
            ${body.link_surat_usulan ?? null}, ${body.link_kak ?? null}, ${body.link_datadukung ?? null},
            ${body.lokasi_pelaksanaan_kabkota_id || null}, ${JSON.stringify(body.rincian_lokasi || [])},
            ${body.prioritas_provinsi_id || null}, ${body.prioritas_provinsi_nama || null},
            ${body.prioritas_kabkota_id || null}, ${body.prioritas_kabkota_nama || null},
            ${body.bidang_urusan_id || null}, ${body.bidang_urusan_nama || null}, ${JSON.stringify(body.tag_belanja || [])},
            ${body.anggaran_n1 ?? null}, ${body.anggaran_n2 ?? null}, ${body.waktu_mulai_bulan || null}, ${body.waktu_selesai_bulan || null}
          ) RETURNING *`;
        await logAudit(sql, event, { user_id: auth.id, nama: auth.nama, aksi: 'eplanning_create_usulan', entitas: 'eplanning_usulan', entitas_id: usulanId });
        return jsonResponse({ usulan: rows[0] }, 201);
      }

      if (event.httpMethod === 'DELETE' && id) {
        const existing = await sql`SELECT pembuat_user_id, status FROM eplanning_usulan WHERE id = ${id} LIMIT 1`;
        if (!existing.length) return errorResponse('Usulan tidak ditemukan', 404);
        if (!role.isAdmin) {
          if (existing[0].pembuat_user_id !== auth.id) return errorResponse('Unauthorized', 401);
          if (!['DRAFT', 'DITOLAK'].includes(existing[0].status)) {
            return errorResponse('Usulan yang sudah diajukan tidak bisa dihapus', 409);
          }
        }
        await sql`DELETE FROM eplanning_usulan WHERE id = ${id}`;
        await logAudit(sql, event, { user_id: auth.id, nama: auth.nama, aksi: 'eplanning_delete_usulan', entitas: 'eplanning_usulan', entitas_id: id });
        return jsonResponse({ ok: true });
      }

      return errorResponse('Not found', 404);
    }

    if (resource === 'rincian') {
      const id = segments[1] || null;

      if (event.httpMethod === 'GET') {
        const usulanId = qs.usulan_id;
        if (!usulanId) return errorResponse('usulan_id wajib diisi', 400);
        const uRows = await sql`SELECT bidang_id, pembuat_user_id FROM eplanning_usulan WHERE id = ${usulanId} LIMIT 1`;
        if (!uRows.length) return errorResponse('Usulan tidak ditemukan', 404);
        const u = uRows[0];
        if (!role.isAdmin && !(role.isKabid && role.bidangId === u.bidang_id) &&
            !(role.isOperator && u.pembuat_user_id === auth.id)) {
          return errorResponse('Unauthorized', 401);
        }
        const rows = await sql`SELECT * FROM eplanning_rincian WHERE usulan_id = ${usulanId} ORDER BY created_at ASC`;
        return jsonResponse({ rincian: rows });
      }

      if (event.httpMethod === 'POST' && !id) {
        const body = parseBody(event);
        if (!body.usulan_id) return errorResponse('usulan_id wajib diisi', 400);
        const uRows = await sql`SELECT pembuat_user_id, status FROM eplanning_usulan WHERE id = ${body.usulan_id} LIMIT 1`;
        if (!uRows.length) return errorResponse('Usulan tidak ditemukan', 404);
        if (!role.isAdmin && uRows[0].pembuat_user_id !== auth.id) return errorResponse('Unauthorized', 401);
        if (!role.isAdmin && !['DRAFT', 'DITOLAK'].includes(uRows[0].status)) {
          return errorResponse('Usulan yang sudah diajukan tidak bisa diubah rinciannya', 409);
        }

        const volume = Number(body.volume) || 0;
        const harga = Number(body.harga_satuan) || 0;
        const subTotal = volume * harga;
        let rincianId = body.id;
        const isNew = !rincianId;
        if (isNew) rincianId = generateId('RNC');

        let namaRekening = null;
        if (body.kode_rekening) {
          const r = await sql`SELECT nama_rekening FROM eplanning_rekening WHERE kode_rekening = ${body.kode_rekening} LIMIT 1`;
          namaRekening = r[0]?.nama_rekening || null;
        }

        let rows;
        if (isNew) {
          rows = await sql`
            INSERT INTO eplanning_rincian (
              id, usulan_id, kode_rekening, nama_rekening, sumber_dana, komponen,
              spesifikasi, keterangan, koefisien, volume, harga_satuan, sub_total, status_item, catatan
            ) VALUES (
              ${rincianId}, ${body.usulan_id}, ${body.kode_rekening || null}, ${namaRekening},
              ${body.sumber_dana || null}, ${body.komponen || null}, ${body.spesifikasi || null},
              ${body.keterangan || null}, ${body.koefisien || null}, ${volume}, ${harga}, ${subTotal},
              ${body.status_item || null}, ${body.catatan || null}
            ) RETURNING *`;
        } else {
          rows = await sql`
            UPDATE eplanning_rincian SET
              kode_rekening = ${body.kode_rekening || null}, nama_rekening = ${namaRekening},
              sumber_dana = ${body.sumber_dana || null}, komponen = ${body.komponen || null},
              spesifikasi = ${body.spesifikasi || null}, keterangan = ${body.keterangan || null},
              koefisien = ${body.koefisien || null}, volume = ${volume}, harga_satuan = ${harga},
              sub_total = ${subTotal}, status_item = ${body.status_item || null}, catatan = ${body.catatan || null},
              updated_at = NOW()
            WHERE id = ${rincianId} RETURNING *`;
          if (!rows.length) return errorResponse('Rincian tidak ditemukan', 404);
        }
        await recalcTotal(sql, body.usulan_id);
        return jsonResponse({ rincian: rows[0] }, isNew ? 201 : 200);
      }

      if (event.httpMethod === 'DELETE' && id) {
        const rRows = await sql`SELECT usulan_id FROM eplanning_rincian WHERE id = ${id} LIMIT 1`;
        if (!rRows.length) return errorResponse('Rincian tidak ditemukan', 404);
        const usulanId = rRows[0].usulan_id;
        const uRows = await sql`SELECT pembuat_user_id, status FROM eplanning_usulan WHERE id = ${usulanId} LIMIT 1`;
        if (uRows.length && !role.isAdmin) {
          if (uRows[0].pembuat_user_id !== auth.id) return errorResponse('Unauthorized', 401);
          if (!['DRAFT', 'DITOLAK'].includes(uRows[0].status)) {
            return errorResponse('Usulan yang sudah diajukan tidak bisa diubah rinciannya', 409);
          }
        }
        await sql`DELETE FROM eplanning_rincian WHERE id = ${id}`;
        await recalcTotal(sql, usulanId);
        return jsonResponse({ ok: true });
      }

      return errorResponse('Not found', 404);
    }

    if (resource === 'subkegiatan') {
      const kode = segments[1] ? decodeURIComponent(segments[1]) : null;

      if (event.httpMethod === 'GET') {
        const rows = await sql`SELECT * FROM eplanning_subkegiatan ORDER BY nama_subkegiatan ASC`;
        return jsonResponse({ subkegiatan: rows });
      }
      if (!role.isAdmin) return errorResponse('Unauthorized', 401);

      if (event.httpMethod === 'POST' && kode === 'import') {
        const body = parseBody(event);
        const rows = Array.isArray(body.rows) ? body.rows : [];
        if (!rows.length) return errorResponse('Tidak ada baris untuk diimpor', 400);
        if (rows.length > 1000) return errorResponse('Maksimal 1000 baris per batch', 400);

        const kd  = rows.map(r => (r.kode_subkegiatan ?? '').toString().trim());
        const nm  = rows.map(r => (r.nama_subkegiatan ?? '').toString().trim());
        const ind = rows.map(r => (r.indikator ?? '').toString().trim() || null);
        const sat = rows.map(r => (r.satuan ?? '').toString().trim() || null);

        const valid = rows.map((_, i) => i).filter(i => kd[i] && nm[i]);
        if (!valid.length) return errorResponse('Tidak ada baris valid - kode & nama wajib diisi', 400);
        const vkd = valid.map(i => kd[i]);
        const vnm = valid.map(i => nm[i]);
        const vind = valid.map(i => ind[i]);
        const vsat = valid.map(i => sat[i]);

        await sql`
          INSERT INTO eplanning_subkegiatan (kode_subkegiatan, nama_subkegiatan, indikator, satuan)
          SELECT * FROM unnest(${vkd}::text[], ${vnm}::text[], ${vind}::text[], ${vsat}::text[])
          ON CONFLICT (kode_subkegiatan) DO UPDATE SET
            nama_subkegiatan = EXCLUDED.nama_subkegiatan,
            indikator = EXCLUDED.indikator,
            satuan = EXCLUDED.satuan`;

        return jsonResponse({ ok: true, inserted: valid.length, skipped: rows.length - valid.length }, 201);
      }

      if (event.httpMethod === 'POST' && !kode) {
        const { kode_subkegiatan, nama_subkegiatan, indikator, satuan } = parseBody(event);
        if (!kode_subkegiatan || !nama_subkegiatan) return errorResponse('Kode dan nama wajib diisi', 400);
        const rows = await sql`
          INSERT INTO eplanning_subkegiatan (kode_subkegiatan, nama_subkegiatan, indikator, satuan)
          VALUES (${kode_subkegiatan}, ${nama_subkegiatan}, ${indikator || null}, ${satuan || null})
          ON CONFLICT (kode_subkegiatan) DO UPDATE SET
            nama_subkegiatan = EXCLUDED.nama_subkegiatan, indikator = EXCLUDED.indikator, satuan = EXCLUDED.satuan
          RETURNING *`;
        return jsonResponse({ subkegiatan: rows[0] }, 201);
      }
      if (event.httpMethod === 'PUT' && kode) {
        const { nama_subkegiatan, indikator, satuan, aktif } = parseBody(event);
        const rows = await sql`
          UPDATE eplanning_subkegiatan SET
            nama_subkegiatan = COALESCE(${nama_subkegiatan ?? null}, nama_subkegiatan),
            indikator = COALESCE(${indikator ?? null}, indikator),
            satuan = COALESCE(${satuan ?? null}, satuan),
            aktif = COALESCE(${aktif ?? null}, aktif)
          WHERE kode_subkegiatan = ${kode} RETURNING *`;
        if (!rows.length) return errorResponse('Sub kegiatan tidak ditemukan', 404);
        return jsonResponse({ subkegiatan: rows[0] });
      }
      if (event.httpMethod === 'DELETE' && kode) {
        await sql`DELETE FROM eplanning_subkegiatan WHERE kode_subkegiatan = ${kode}`;
        return jsonResponse({ ok: true });
      }
      return errorResponse('Not found', 404);
    }

    if (resource === 'rekening') {
      const kode = segments[1] ? decodeURIComponent(segments[1]) : null;

      if (event.httpMethod === 'GET' && !kode && qs.page === undefined) {
        const q = (qs.q || '').trim();
        if (q.length === 1) return jsonResponse({ rekening: [] });
        if (q.length === 0) {
          const rows = await sql`
            SELECT er.kode_rekening, er.nama_rekening
            FROM eplanning_rekening er
            LEFT JOIN eplanning_rincian ri ON ri.kode_rekening = er.kode_rekening
            WHERE er.aktif = true
            GROUP BY er.kode_rekening, er.nama_rekening
            ORDER BY COUNT(ri.id) DESC, er.nama_rekening ASC
            LIMIT 30`;
          return jsonResponse({ rekening: rows });
        }
        const rows = await sql`
          SELECT kode_rekening, nama_rekening FROM eplanning_rekening
          WHERE aktif = true AND (nama_rekening ILIKE ${'%' + q + '%'} OR kode_rekening ILIKE ${'%' + q + '%'})
          ORDER BY nama_rekening ASC LIMIT 30`;
        return jsonResponse({ rekening: rows });
      }

      if (event.httpMethod === 'GET' && !kode) {
        if (!role.isAdmin) return errorResponse('Unauthorized', 401);
        const page = Math.max(1, parseInt(qs.page) || 1);
        const pageSize = Math.min(100, Math.max(1, parseInt(qs.pageSize) || 25));
        const search = `%${(qs.search || '').trim()}%`;
        const offset = (page - 1) * pageSize;
        const rows = await sql`
          SELECT kode_rekening, nama_rekening, aktif FROM eplanning_rekening
          WHERE nama_rekening ILIKE ${search} OR kode_rekening ILIKE ${search}
          ORDER BY kode_rekening ASC LIMIT ${pageSize} OFFSET ${offset}`;
        const totalRows = await sql`
          SELECT COUNT(*)::int AS total FROM eplanning_rekening
          WHERE nama_rekening ILIKE ${search} OR kode_rekening ILIKE ${search}`;
        return jsonResponse({ rekening: rows, total: totalRows[0].total, page, pageSize });
      }

      if (!role.isAdmin) return errorResponse('Unauthorized', 401);

      if (event.httpMethod === 'POST' && !kode) {
        const { kode_rekening, nama_rekening } = parseBody(event);
        if (!kode_rekening?.trim() || !nama_rekening?.trim()) return errorResponse('Kode dan nama wajib diisi', 400);
        const rows = await sql`
          INSERT INTO eplanning_rekening (kode_rekening, nama_rekening)
          VALUES (${kode_rekening.trim()}, ${nama_rekening.trim()})
          ON CONFLICT (kode_rekening) DO UPDATE SET nama_rekening = EXCLUDED.nama_rekening
          RETURNING *`;
        return jsonResponse({ rekening: rows[0] }, 201);
      }
      if (event.httpMethod === 'PUT' && kode) {
        const { nama_rekening, aktif } = parseBody(event);
        const rows = await sql`
          UPDATE eplanning_rekening SET
            nama_rekening = COALESCE(${nama_rekening?.trim() || null}, nama_rekening),
            aktif = COALESCE(${aktif ?? null}, aktif)
          WHERE kode_rekening = ${kode} RETURNING *`;
        if (!rows.length) return errorResponse('Rekening tidak ditemukan', 404);
        return jsonResponse({ rekening: rows[0] });
      }
      if (event.httpMethod === 'DELETE' && kode) {
        await sql`DELETE FROM eplanning_rekening WHERE kode_rekening = ${kode}`;
        return jsonResponse({ ok: true });
      }
      return errorResponse('Not found', 404);
    }

    if (resource === 'sumberdana') {
      const idRaw = segments[1] || null;
      const id = idRaw && /^\d+$/.test(idRaw) ? parseInt(idRaw) : null;

      if (event.httpMethod === 'GET') {
        const rows = await sql`SELECT * FROM eplanning_sumberdana ORDER BY nama ASC`;
        return jsonResponse({ sumberdana: rows });
      }
      if (!role.isAdmin) return errorResponse('Unauthorized', 401);

      if (event.httpMethod === 'POST' && idRaw === 'import') {
        const body = parseBody(event);
        const rows = Array.isArray(body.rows) ? body.rows : [];
        if (!rows.length) return errorResponse('Tidak ada baris untuk diimpor', 400);
        if (rows.length > 1000) return errorResponse('Maksimal 1000 baris per batch', 400);

        const seen = new Map();
        for (const r of rows) {
          const nama = (typeof r === 'string' ? r : (r.nama ?? '')).toString().trim();
          if (!nama) continue;
          const kode = (typeof r === 'string' ? '' : (r.kode ?? '')).toString().trim();
          if (!seen.has(nama) || kode) seen.set(nama, kode || seen.get(nama) || '');
        }
        const namaList = [...seen.keys()];
        const kodeList = namaList.map(n => seen.get(n) || null);
        if (!namaList.length) return errorResponse('Tidak ada baris valid - nama wajib diisi', 400);

        const added = await sql`
          INSERT INTO eplanning_sumberdana (nama, kode)
          SELECT s, k FROM unnest(${namaList}::text[], ${kodeList}::text[]) AS t(s, k)
          ON CONFLICT (nama) DO UPDATE SET kode = COALESCE(EXCLUDED.kode, eplanning_sumberdana.kode)
          WHERE eplanning_sumberdana.kode IS NULL AND EXCLUDED.kode IS NOT NULL
          RETURNING nama`;

        return jsonResponse({ ok: true, inserted: added.length, skipped: namaList.length - added.length }, 201);
      }

      if (event.httpMethod === 'POST' && !id) {
        const { nama, kode } = parseBody(event);
        if (!nama || !nama.trim()) return errorResponse('Nama wajib diisi', 400);
        const rows = await sql`
          INSERT INTO eplanning_sumberdana (nama, kode) VALUES (${nama.trim()}, ${kode?.trim() || null})
          ON CONFLICT (nama) DO NOTHING RETURNING *`;
        return jsonResponse({ sumberdana: rows[0] || null }, 201);
      }
      if (event.httpMethod === 'PUT' && id) {
        const { nama, kode, aktif } = parseBody(event);
        if (nama !== undefined && !nama.trim()) return errorResponse('Nama wajib diisi', 400);
        try {
          const rows = await sql`
            UPDATE eplanning_sumberdana SET
              nama  = COALESCE(${nama !== undefined ? nama.trim() : null}, nama),
              kode  = CASE WHEN ${kode !== undefined} THEN ${kode !== undefined ? (kode?.trim() || null) : null} ELSE kode END,
              aktif = COALESCE(${aktif ?? null}, aktif)
            WHERE id = ${id} RETURNING *`;
          if (!rows[0]) return errorResponse('Data tidak ditemukan', 404);
          return jsonResponse({ sumberdana: rows[0] });
        } catch (e) {
          if (String(e.message || '').includes('duplicate')) return errorResponse('Nama sumber dana sudah ada', 409);
          throw e;
        }
      }
      if (event.httpMethod === 'DELETE' && id) {
        await sql`DELETE FROM eplanning_sumberdana WHERE id = ${id}`;
        return jsonResponse({ ok: true });
      }
      return errorResponse('Not found', 404);
    }

    if (resource === 'satuan') {
      const id = segments[1] ? parseInt(segments[1]) : null;

      if (event.httpMethod === 'GET') {
        const rows = await sql`SELECT * FROM eplanning_satuan ORDER BY nama ASC`;
        return jsonResponse({ satuan: rows });
      }
      if (!role.isAdmin) return errorResponse('Unauthorized', 401);

      if (event.httpMethod === 'POST' && segments[1] === 'sync-dari-standarharga') {
        const added = await sql`
          INSERT INTO eplanning_satuan (nama)
          SELECT DISTINCT trim(satuan) FROM eplanning_standar_harga
          WHERE satuan IS NOT NULL AND trim(satuan) <> ''
          ON CONFLICT (nama) DO NOTHING
          RETURNING nama`;
        return jsonResponse({ ok: true, added: added.length });
      }

      if (event.httpMethod === 'POST' && !id) {
        const { nama } = parseBody(event);
        if (!nama || !nama.trim()) return errorResponse('Nama wajib diisi', 400);
        const rows = await sql`
          INSERT INTO eplanning_satuan (nama) VALUES (${nama.trim()})
          ON CONFLICT (nama) DO NOTHING RETURNING *`;
        return jsonResponse({ satuan: rows[0] || null }, 201);
      }
      if (event.httpMethod === 'PUT' && id) {
        const { nama, aktif } = parseBody(event);
        if (nama !== undefined && !nama.trim()) return errorResponse('Nama wajib diisi', 400);
        try {
          const rows = await sql`
            UPDATE eplanning_satuan SET
              nama  = COALESCE(${nama !== undefined ? nama.trim() : null}, nama),
              aktif = COALESCE(${aktif ?? null}, aktif)
            WHERE id = ${id} RETURNING *`;
          if (!rows[0]) return errorResponse('Data tidak ditemukan', 404);
          return jsonResponse({ satuan: rows[0] });
        } catch (e) {
          if (String(e.message || '').includes('duplicate')) return errorResponse('Nama satuan sudah ada', 409);
          throw e;
        }
      }
      if (event.httpMethod === 'DELETE' && id) {
        await sql`DELETE FROM eplanning_satuan WHERE id = ${id}`;
        return jsonResponse({ ok: true });
      }
      return errorResponse('Not found', 404);
    }

    const REFERENSI_TABLES = {
      prioritasprov: 'eplanning_prioritasprov',
      prioritaskabkota: 'eplanning_prioritaskabkota',
      bidangurusan: 'eplanning_bidangurusan',
      tagbelanja: 'eplanning_tagbelanja',
    };
    if (REFERENSI_TABLES[resource]) {
      const table = REFERENSI_TABLES[resource];
      const id = segments[1] ? parseInt(segments[1]) : null;

      if (event.httpMethod === 'GET') {
        const rows = await sql`SELECT * FROM ${sql.unsafe(table)} ORDER BY nama ASC`;
        return jsonResponse({ [resource]: rows });
      }
      if (!role.isAdmin) return errorResponse('Unauthorized', 401);

      if (event.httpMethod === 'POST' && !id) {
        const { nama } = parseBody(event);
        if (!nama || !nama.trim()) return errorResponse('Nama wajib diisi', 400);
        const rows = await sql`
          INSERT INTO ${sql.unsafe(table)} (nama) VALUES (${nama.trim()})
          ON CONFLICT (nama) DO NOTHING RETURNING *`;
        return jsonResponse({ [resource]: rows[0] || null }, 201);
      }
      if (event.httpMethod === 'PUT' && id) {
        const { nama, aktif } = parseBody(event);
        if (nama !== undefined && !nama.trim()) return errorResponse('Nama wajib diisi', 400);
        try {
          const rows = await sql`
            UPDATE ${sql.unsafe(table)} SET
              nama  = COALESCE(${nama !== undefined ? nama.trim() : null}, nama),
              aktif = COALESCE(${aktif ?? null}, aktif)
            WHERE id = ${id} RETURNING *`;
          if (!rows[0]) return errorResponse('Data tidak ditemukan', 404);
          return jsonResponse({ [resource]: rows[0] });
        } catch (e) {
          if (String(e.message || '').includes('duplicate')) return errorResponse('Nama sudah ada', 409);
          throw e;
        }
      }
      if (event.httpMethod === 'DELETE' && id) {
        await sql`DELETE FROM ${sql.unsafe(table)} WHERE id = ${id}`;
        return jsonResponse({ ok: true });
      }
      return errorResponse('Not found', 404);
    }

    if (resource === 'provinsi') {
      if (event.httpMethod === 'GET') {
        const rows = await sql`SELECT * FROM eplanning_provinsi ORDER BY nama ASC`;
        return jsonResponse({ provinsi: rows });
      }
      return errorResponse('Not found', 404);
    }

    if (resource === 'kabkota') {
      const id = segments[1] ? parseInt(segments[1]) : null;

      if (event.httpMethod === 'GET') {
        const rows = qs.provinsi_id
          ? await sql`SELECT * FROM eplanning_kabkota WHERE provinsi_id = ${parseInt(qs.provinsi_id)} ORDER BY nama ASC`
          : await sql`SELECT * FROM eplanning_kabkota ORDER BY nama ASC`;
        return jsonResponse({ kabkota: rows });
      }
      if (!role.isAdmin) return errorResponse('Unauthorized', 401);

      if (event.httpMethod === 'POST' && !id) {
        const { provinsi_id, nama, tipe } = parseBody(event);
        if (!provinsi_id || !nama || !nama.trim()) return errorResponse('Provinsi dan nama wajib diisi', 400);
        const rows = await sql`
          INSERT INTO eplanning_kabkota (provinsi_id, nama, tipe)
          VALUES (${provinsi_id}, ${nama.trim()}, ${tipe || 'Kabupaten'})
          ON CONFLICT (provinsi_id, nama) DO NOTHING RETURNING *`;
        return jsonResponse({ kabkota: rows[0] || null }, 201);
      }
      if (event.httpMethod === 'PUT' && id) {
        const { nama, tipe } = parseBody(event);
        const rows = await sql`
          UPDATE eplanning_kabkota SET
            nama = COALESCE(${nama?.trim() || null}, nama),
            tipe = COALESCE(${tipe || null}, tipe)
          WHERE id = ${id} RETURNING *`;
        if (!rows[0]) return errorResponse('Data tidak ditemukan', 404);
        return jsonResponse({ kabkota: rows[0] });
      }
      if (event.httpMethod === 'DELETE' && id) {
        await sql`DELETE FROM eplanning_kabkota WHERE id = ${id}`;
        return jsonResponse({ ok: true });
      }
      return errorResponse('Not found', 404);
    }

    if (resource === 'kecamatan') {
      const id = segments[1] ? parseInt(segments[1]) : null;

      if (event.httpMethod === 'GET') {
        if (!qs.kabkota_id) return errorResponse('kabkota_id wajib diisi', 400);
        const rows = await sql`
          SELECT * FROM eplanning_kecamatan WHERE kabkota_id = ${parseInt(qs.kabkota_id)} ORDER BY nama ASC`;
        return jsonResponse({ kecamatan: rows });
      }
      if (!role.isAdmin) return errorResponse('Unauthorized', 401);

      if (event.httpMethod === 'POST' && !id) {
        const { kabkota_id, nama } = parseBody(event);
        if (!kabkota_id || !nama || !nama.trim()) return errorResponse('Kab/Kota dan nama wajib diisi', 400);
        const rows = await sql`
          INSERT INTO eplanning_kecamatan (kabkota_id, nama) VALUES (${kabkota_id}, ${nama.trim()})
          ON CONFLICT (kabkota_id, nama) DO NOTHING RETURNING *`;
        return jsonResponse({ kecamatan: rows[0] || null }, 201);
      }
      if (event.httpMethod === 'PUT' && id) {
        const { nama } = parseBody(event);
        if (!nama || !nama.trim()) return errorResponse('Nama wajib diisi', 400);
        const rows = await sql`UPDATE eplanning_kecamatan SET nama = ${nama.trim()} WHERE id = ${id} RETURNING *`;
        if (!rows[0]) return errorResponse('Data tidak ditemukan', 404);
        return jsonResponse({ kecamatan: rows[0] });
      }
      if (event.httpMethod === 'DELETE' && id) {
        await sql`DELETE FROM eplanning_kecamatan WHERE id = ${id}`;
        return jsonResponse({ ok: true });
      }
      return errorResponse('Not found', 404);
    }

    if (resource === 'desakelurahan') {
      const id = segments[1] ? parseInt(segments[1]) : null;

      if (event.httpMethod === 'GET') {
        if (!qs.kecamatan_id) return errorResponse('kecamatan_id wajib diisi', 400);
        const rows = await sql`
          SELECT * FROM eplanning_desakelurahan WHERE kecamatan_id = ${parseInt(qs.kecamatan_id)} ORDER BY nama ASC`;
        return jsonResponse({ desakelurahan: rows });
      }
      if (!role.isAdmin) return errorResponse('Unauthorized', 401);

      if (event.httpMethod === 'POST' && !id) {
        const { kecamatan_id, nama, tipe } = parseBody(event);
        if (!kecamatan_id || !nama || !nama.trim()) return errorResponse('Kecamatan dan nama wajib diisi', 400);
        const rows = await sql`
          INSERT INTO eplanning_desakelurahan (kecamatan_id, nama, tipe)
          VALUES (${kecamatan_id}, ${nama.trim()}, ${tipe || 'Desa'})
          ON CONFLICT (kecamatan_id, nama) DO NOTHING RETURNING *`;
        return jsonResponse({ desakelurahan: rows[0] || null }, 201);
      }
      if (event.httpMethod === 'PUT' && id) {
        const { nama, tipe } = parseBody(event);
        const rows = await sql`
          UPDATE eplanning_desakelurahan SET
            nama = COALESCE(${nama?.trim() || null}, nama),
            tipe = COALESCE(${tipe || null}, tipe)
          WHERE id = ${id} RETURNING *`;
        if (!rows[0]) return errorResponse('Data tidak ditemukan', 404);
        return jsonResponse({ desakelurahan: rows[0] });
      }
      if (event.httpMethod === 'DELETE' && id) {
        await sql`DELETE FROM eplanning_desakelurahan WHERE id = ${id}`;
        return jsonResponse({ ok: true });
      }
      return errorResponse('Not found', 404);
    }

    if (resource === 'standarharga') {
      const sub = segments[1] || null;

      if (event.httpMethod === 'GET' && !sub && qs.page === undefined) {
        const q = (qs.q || '').trim();
        const kategori = (qs.kategori || '').trim().toUpperCase();
        if (q.length === 1) return jsonResponse({ standarharga: [] });
        const kFilter = kategori && kategori !== 'SEMUA' ? kategori : null;
        const tahunFilter = qs.tahun && /^\d{4}$/.test(qs.tahun) ? parseInt(qs.tahun) : null;
        let rows;
        if (q.length === 0) {
          rows = kFilter
            ? await sql`
                SELECT * FROM eplanning_standar_harga
                WHERE aktif = true AND kategori = ${kFilter}
                  AND (${tahunFilter}::int IS NULL OR tahun = ${tahunFilter}::int
                       OR (${tahunFilter}::int = 2027 AND tahun IS NULL))
                ORDER BY uraian_barang ASC LIMIT 30`
            : await sql`
                SELECT * FROM eplanning_standar_harga
                WHERE aktif = true
                  AND (${tahunFilter}::int IS NULL OR tahun = ${tahunFilter}::int
                       OR (${tahunFilter}::int = 2027 AND tahun IS NULL))
                ORDER BY uraian_barang ASC LIMIT 30`;
        } else {
          const like = '%' + q + '%';
          rows = kFilter
            ? await sql`
                SELECT * FROM eplanning_standar_harga
                WHERE aktif = true AND kategori = ${kFilter}
                  AND (uraian_barang ILIKE ${like} OR kode_barang ILIKE ${like} OR spesifikasi ILIKE ${like})
                  AND (${tahunFilter}::int IS NULL OR tahun = ${tahunFilter}::int
                       OR (${tahunFilter}::int = 2027 AND tahun IS NULL))
                ORDER BY uraian_barang ASC LIMIT 30`
            : await sql`
                SELECT * FROM eplanning_standar_harga
                WHERE aktif = true
                  AND (uraian_barang ILIKE ${like} OR kode_barang ILIKE ${like} OR spesifikasi ILIKE ${like})
                  AND (${tahunFilter}::int IS NULL OR tahun = ${tahunFilter}::int
                       OR (${tahunFilter}::int = 2027 AND tahun IS NULL))
                ORDER BY uraian_barang ASC LIMIT 30`;
        }
        return jsonResponse({ standarharga: rows });
      }

      if (event.httpMethod === 'GET' && sub === 'count') {
        const tahunFilter = qs.tahun && /^\d{4}$/.test(qs.tahun) ? parseInt(qs.tahun) : null;
        const rows = await sql`
          SELECT kategori, COUNT(*)::int AS total FROM eplanning_standar_harga
          WHERE ${tahunFilter}::int IS NULL OR tahun = ${tahunFilter}::int
                OR (${tahunFilter}::int = 2027 AND tahun IS NULL)
          GROUP BY kategori`;
        return jsonResponse({ count: rows });
      }

      if (event.httpMethod === 'GET' && sub === 'meta') {
        const kategori = (qs.kategori || 'SSH').trim().toUpperCase();
        const tahunFilter = qs.tahun && /^\d{4}$/.test(qs.tahun) ? parseInt(qs.tahun) : null;
        const satuanRows = await sql`
          SELECT DISTINCT satuan FROM eplanning_standar_harga
          WHERE kategori = ${kategori} AND satuan IS NOT NULL AND satuan <> ''
            AND (${tahunFilter}::int IS NULL OR tahun = ${tahunFilter}::int
                 OR (${tahunFilter}::int = 2027 AND tahun IS NULL))
          ORDER BY satuan ASC`;
        const statusRows = await sql`
          SELECT DISTINCT aktif FROM eplanning_standar_harga
          WHERE kategori = ${kategori}
            AND (${tahunFilter}::int IS NULL OR tahun = ${tahunFilter}::int
                 OR (${tahunFilter}::int = 2027 AND tahun IS NULL))`;
        return jsonResponse({
          satuan: satuanRows.map(r => r.satuan),
          status: statusRows.map(r => r.aktif),
        });
      }

      if (event.httpMethod === 'GET' && !sub) {
        const page = Math.max(1, parseInt(qs.page) || 1);
        const pageSize = Math.min(100, Math.max(1, parseInt(qs.pageSize) || 25));
        const kategori = (qs.kategori || 'SSH').trim().toUpperCase();
        const search = `%${(qs.search || '').trim()}%`;
        const statusFilter = qs.status === 'true' ? true : (qs.status === 'false' ? false : null);
        const satuanFilter = (qs.satuan || '').trim();
        const tahunFilter = qs.tahun && /^\d{4}$/.test(qs.tahun) ? parseInt(qs.tahun) : null;
        const offset = (page - 1) * pageSize;
        const rows = await sql`
          SELECT sh.*,
            (SELECT string_agg(
                trim(k.kode) || CASE WHEN r2.nama_rekening IS NOT NULL THEN ' - ' || r2.nama_rekening ELSE '' END,
                E'\u241E' ORDER BY k.ord)
             FROM unnest(string_to_array(sh.kode_rekening, ',')) WITH ORDINALITY AS k(kode, ord)
             LEFT JOIN eplanning_rekening r2 ON r2.kode_rekening = trim(k.kode)
            ) AS rekening_label
          FROM eplanning_standar_harga sh
          WHERE sh.kategori = ${kategori}
            AND (sh.uraian_barang ILIKE ${search} OR sh.kode_barang ILIKE ${search} OR sh.spesifikasi ILIKE ${search}
                 OR EXISTS (
                   SELECT 1 FROM unnest(string_to_array(sh.kode_rekening, ',')) AS kk(kode)
                   LEFT JOIN eplanning_rekening r3 ON r3.kode_rekening = trim(kk.kode)
                   WHERE trim(kk.kode) ILIKE ${search} OR r3.nama_rekening ILIKE ${search}
                 ))
            AND (${statusFilter}::boolean IS NULL OR sh.aktif = ${statusFilter}::boolean)
            AND (${satuanFilter} = '' OR sh.satuan = ${satuanFilter})
            AND (${tahunFilter}::int IS NULL OR sh.tahun = ${tahunFilter}::int
                 OR (${tahunFilter}::int = 2027 AND sh.tahun IS NULL))
          ORDER BY (sh.kode_rekening IS NULL OR sh.kode_rekening = '') ASC,
                   sh.kode_rekening ASC, sh.uraian_barang ASC
          LIMIT ${pageSize} OFFSET ${offset}`;
        const totalRows = await sql`
          SELECT COUNT(*)::int AS total FROM eplanning_standar_harga sh
          WHERE sh.kategori = ${kategori}
            AND (sh.uraian_barang ILIKE ${search} OR sh.kode_barang ILIKE ${search} OR sh.spesifikasi ILIKE ${search}
                 OR EXISTS (
                   SELECT 1 FROM unnest(string_to_array(sh.kode_rekening, ',')) AS kk(kode)
                   LEFT JOIN eplanning_rekening r3 ON r3.kode_rekening = trim(kk.kode)
                   WHERE trim(kk.kode) ILIKE ${search} OR r3.nama_rekening ILIKE ${search}
                 ))
            AND (${statusFilter}::boolean IS NULL OR sh.aktif = ${statusFilter}::boolean)
            AND (${tahunFilter}::int IS NULL OR sh.tahun = ${tahunFilter}::int
                 OR (${tahunFilter}::int = 2027 AND sh.tahun IS NULL))
            AND (${satuanFilter} = '' OR sh.satuan = ${satuanFilter})`;
        return jsonResponse({ standarharga: rows, total: totalRows[0].total, page, pageSize });
      }

      if (event.httpMethod === 'POST' && sub === 'import') {
        if (!role.isAdmin) return errorResponse('Unauthorized', 401);
        const body = parseBody(event);
        const kategori = (body.kategori || '').trim().toUpperCase();
        const tahun = /^\d{4}$/.test(String(body.tahun)) ? parseInt(body.tahun) : null;
        const rows = Array.isArray(body.rows) ? body.rows : [];
        if (!kategori) return errorResponse('Kategori wajib diisi', 400);
        if (!tahun) return errorResponse('Tahun wajib diisi', 400);
        if (!rows.length) return errorResponse('Tidak ada baris untuk diimpor', 400);
        if (rows.length > 1000) return errorResponse('Maksimal 1000 baris per batch', 400);

        const kkb = rows.map(r => r.kode_kelompok_barang ?? null);
        const ukb = rows.map(r => r.uraian_kelompok_barang ?? null);
        const idsh = rows.map(r => r.id_standar_harga != null ? String(r.id_standar_harga) : null);
        const kb = rows.map(r => r.kode_barang ?? null);
        const ub = rows.map(r => (r.uraian_barang ?? '').toString().trim() || '(tanpa nama)');
        const spek = rows.map(r => r.spesifikasi ?? null);
        const sat = rows.map(r => r.satuan ?? null);
        const hs = rows.map(r => Number(r.harga_satuan) || 0);
        const kr = rows.map(r => r.kode_rekening ?? null);
        const tk = rows.map(r => (r.tkdn === '' || r.tkdn == null) ? null : Number(r.tkdn));

        await sql`
          INSERT INTO eplanning_standar_harga
            (kategori, tahun, kode_kelompok_barang, uraian_kelompok_barang, id_standar_harga,
             kode_barang, uraian_barang, spesifikasi, satuan, harga_satuan, kode_rekening, tkdn)
          SELECT ${kategori}, ${tahun}, * FROM unnest(
            ${kkb}::text[], ${ukb}::text[], ${idsh}::text[], ${kb}::text[],
            ${ub}::text[], ${spek}::text[], ${sat}::text[], ${hs}::numeric[], ${kr}::text[], ${tk}::numeric[]
          )`;

        const satuanBaru = [...new Set(sat.map(s => (s || '').trim()).filter(Boolean))];
        let satuanAdded = 0;
        if (satuanBaru.length) {
          const added = await sql`
            INSERT INTO eplanning_satuan (nama)
            SELECT DISTINCT s FROM unnest(${satuanBaru}::text[]) AS s
            ON CONFLICT (nama) DO NOTHING
            RETURNING nama`;
          satuanAdded = added.length;
        }
        return jsonResponse({ ok: true, inserted: rows.length, satuanAdded }, 201);
      }

      if (event.httpMethod === 'DELETE' && !sub && qs.kategori) {
        if (!role.isAdmin) return errorResponse('Unauthorized', 401);
        const kategori = qs.kategori.trim().toUpperCase();
        const tahunFilter = qs.tahun && /^\d{4}$/.test(qs.tahun) ? parseInt(qs.tahun) : null;
        const del = await sql`
          DELETE FROM eplanning_standar_harga
          WHERE kategori = ${kategori}
            AND (${tahunFilter}::int IS NULL OR tahun = ${tahunFilter}::int
                 OR (${tahunFilter}::int = 2027 AND tahun IS NULL))
          RETURNING id`;
        return jsonResponse({ ok: true, deleted: del.length });
      }

      if (!role.isAdmin) return errorResponse('Unauthorized', 401);
      const id = sub && /^\d+$/.test(sub) ? parseInt(sub) : null;

      if (event.httpMethod === 'POST' && !sub) {
        const b = parseBody(event);
        const kategori = (b.kategori || '').trim().toUpperCase();
        const uraian_barang = (b.uraian_barang || '').trim();
        const tahun = /^\d{4}$/.test(String(b.tahun)) ? parseInt(b.tahun) : null;
        if (!kategori || !uraian_barang) return errorResponse('Kategori dan uraian barang wajib diisi', 400);
        if (!tahun) return errorResponse('Tahun wajib diisi', 400);
        const rows = await sql`
          INSERT INTO eplanning_standar_harga
            (kategori, tahun, kode_kelompok_barang, uraian_kelompok_barang, id_standar_harga, kode_barang,
             uraian_barang, spesifikasi, satuan, harga_satuan, kode_rekening, tkdn)
          VALUES (
            ${kategori}, ${tahun}, ${b.kode_kelompok_barang?.trim() || null}, ${b.uraian_kelompok_barang?.trim() || null},
            ${b.id_standar_harga?.trim() || null}, ${b.kode_barang || null}, ${uraian_barang},
            ${b.spesifikasi || null}, ${b.satuan || null}, ${Number(b.harga_satuan) || 0}, ${b.kode_rekening || null},
            ${b.tkdn === '' || b.tkdn == null ? null : Number(b.tkdn)}
          ) RETURNING *`;
        return jsonResponse({ standarharga: rows[0] }, 201);
      }
      if (event.httpMethod === 'PUT' && id) {
        const b = parseBody(event);
        const has = (k) => Object.prototype.hasOwnProperty.call(b, k);
        const cur = await sql`SELECT * FROM eplanning_standar_harga WHERE id = ${id}`;
        if (!cur.length) return errorResponse('Data tidak ditemukan', 404);
        const c = cur[0];
        const merged = {
          uraian_barang: b.uraian_barang?.trim() || c.uraian_barang,
          spesifikasi: has('spesifikasi') ? (b.spesifikasi || null) : c.spesifikasi,
          satuan: has('satuan') ? (b.satuan || null) : c.satuan,
          harga_satuan: b.harga_satuan != null && b.harga_satuan !== '' ? Number(b.harga_satuan) : c.harga_satuan,
          kode_rekening: has('kode_rekening') ? (b.kode_rekening || null) : c.kode_rekening,
          tkdn: has('tkdn') ? (b.tkdn === '' || b.tkdn == null ? null : Number(b.tkdn)) : c.tkdn,
          kode_barang: has('kode_barang') ? (b.kode_barang || null) : c.kode_barang,
          kode_kelompok_barang: has('kode_kelompok_barang') ? (b.kode_kelompok_barang || null) : c.kode_kelompok_barang,
          uraian_kelompok_barang: has('uraian_kelompok_barang') ? (b.uraian_kelompok_barang || null) : c.uraian_kelompok_barang,
          id_standar_harga: has('id_standar_harga') ? (b.id_standar_harga || null) : c.id_standar_harga,
          tahun: has('tahun') && /^\d{4}$/.test(String(b.tahun)) ? parseInt(b.tahun) : c.tahun,
          aktif: has('aktif') ? !!b.aktif : c.aktif,
        };
        const rows = await sql`
          UPDATE eplanning_standar_harga SET
            uraian_barang          = ${merged.uraian_barang},
            spesifikasi            = ${merged.spesifikasi},
            satuan                 = ${merged.satuan},
            harga_satuan           = ${merged.harga_satuan},
            kode_rekening          = ${merged.kode_rekening},
            tkdn                   = ${merged.tkdn},
            kode_barang            = ${merged.kode_barang},
            kode_kelompok_barang   = ${merged.kode_kelompok_barang},
            uraian_kelompok_barang = ${merged.uraian_kelompok_barang},
            id_standar_harga       = ${merged.id_standar_harga},
            tahun                  = ${merged.tahun},
            aktif                  = ${merged.aktif},
            updated_at             = NOW()
          WHERE id = ${id} RETURNING *`;
        return jsonResponse({ standarharga: rows[0] });
      }
      if (event.httpMethod === 'DELETE' && id) {
        await sql`DELETE FROM eplanning_standar_harga WHERE id = ${id}`;
        return jsonResponse({ ok: true });
      }
      return errorResponse('Not found', 404);
    }

    return errorResponse('Not found', 404);
  } catch (err) {
    console.error(`[eplanning ${event.httpMethod} ${rawPath}]`, err);
    return errorResponse('Terjadi kesalahan server: ' + err.message);
  }
};