import { getDb, jsonResponse, errorResponse, parseBody } from './_db.js';
import { requireAuth } from './_auth.js';
import { logAudit } from './_audit.js';
import { deleteFromCloudinary } from './_cloudinary.js';

const STATUS_VALID = ['hadir', 'tugas_luar', 'cuti', 'alpa'];

async function hasFullAccess(sql, auth) {
  if (auth.is_admin) return true;
  const rows = await sql`
    SELECT 1 FROM user_permissions
    WHERE user_id = ${auth.id} AND menu_key = 'absensi.full' LIMIT 1
  `;
  return rows.length > 0;
}

function hitungTerlambat(tanggalStr, jamMasukStr, settings) {
  if (!jamMasukStr) return { terlambat: false, menit_terlambat: 0 };
  const d = new Date(`${tanggalStr}T00:00:00`);
  const dow = d.getDay();
  const isJumat = dow === 5;
  const batas = isJumat ? settings.jam_masuk_jumat : settings.jam_masuk_senin_kamis;

  const toMin = (t) => {
    const [h, m] = t.split(':').map(Number);
    return h * 60 + m;
  };
  const masukMin = toMin(jamMasukStr);
  const batasMin = toMin(batas) + (settings.toleransi_menit || 0);
  const selisih = masukMin - batasMin;
  return selisih > 0
    ? { terlambat: true, menit_terlambat: selisih }
    : { terlambat: false, menit_terlambat: 0 };
}

function _menitDariJam(jamStr) {
  if (!jamStr) return 0;
  const [h, m] = jamStr.split(':').map(Number);
  return h * 60 + m;
}

function cekJendelaWaktu(tanggalStr, jamSekarangStr, batasAwalStr, batasAkhirStr) {
  const toMin = (t) => {
    const [h, m] = t.split(':').map(Number);
    return h * 60 + m;
  };
  const now = toMin(jamSekarangStr);
  if (batasAwalStr && now < toMin(batasAwalStr)) {
    return { boleh: false, alasan: 'awal', batas: batasAwalStr.slice(0, 5) };
  }
  if (batasAkhirStr && now > toMin(batasAkhirStr)) {
    return { boleh: false, alasan: 'akhir', batas: batasAkhirStr.slice(0, 5) };
  }
  return { boleh: true };
}

const TZ = 'Asia/Makassar';

function todayStr() {
  return new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
}
function nowTimeStr() {
  return new Intl.DateTimeFormat('en-GB', { timeZone: TZ, hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date());
}

const KETERANGAN_CRON_ALPA = 'Otomatis: tidak ada absensi masuk & pulang';
function isCronAlpaRow(row) {
  return row.status === 'alpa' && row.input_by === null && row.keterangan === KETERANGAN_CRON_ALPA;
}

function _rentangTanggalYMD(mulaiStr, selesaiStr) {
  const parse = (s) => { const [y, m, d] = s.split('-').map(Number); return Date.UTC(y, m - 1, d); };
  const fmt = (t) => {
    const dt = new Date(t);
    const y = dt.getUTCFullYear();
    const m = String(dt.getUTCMonth() + 1).padStart(2, '0');
    const d = String(dt.getUTCDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  };
  const list = [];
  for (let t = parse(mulaiStr); t <= parse(selesaiStr); t += 86400000) list.push(fmt(t));
  return list;
}

export const handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return jsonResponse({});

  const auth = requireAuth(event);
  if (!auth) return errorResponse('Unauthorized', 401);

  const sql = getDb();
  const rawPath = event.path.replace(/.*\/absensi/, '') || '/';
  const segments = rawPath.split('/').filter(Boolean);

  const isSettings = segments[0] === 'settings';
  const isLibur = segments[0] === 'libur';
  const isRekap = segments[0] === 'rekap';
  const isRingkasanBulan = segments[0] === 'ringkasan-bulan';
  const isJamKerja = segments[0] === 'jam-kerja';
  const isBulanTersedia = segments[0] === 'bulan-tersedia';
  const isTahunTersedia = segments[0] === 'tahun-tersedia';
  const isBidangTersedia = segments[0] === 'bidang-tersedia';
  const isStatusTersedia = segments[0] === 'status-tersedia';
  const isCheckin = segments[0] === 'checkin';
  const isCheckout = segments[0] === 'checkout';
  const isPengajuan = segments[0] === 'pengajuan';
  const recordId = segments[0] && !isNaN(segments[0]) ? parseInt(segments[0]) : null;
  const liburId = isLibur && segments[1] && !isNaN(segments[1]) ? parseInt(segments[1]) : null;
  const pengajuanId = isPengajuan && segments[1] && !isNaN(segments[1]) ? parseInt(segments[1]) : null;
  const pengajuanAction = isPengajuan ? segments[2] : null;

  const full = await hasFullAccess(sql, auth);

  if (isSettings) {
    if (event.httpMethod === 'GET') {
      try {
        const rows = await sql`SELECT * FROM absensi_settings WHERE id = 1`;
        return jsonResponse({ settings: rows[0] });
      } catch (err) {
        console.error('[GET /api/absensi/settings]', err);
        return errorResponse('Gagal mengambil pengaturan');
      }
    }
    if (event.httpMethod === 'PUT') {
      if (!full) return errorResponse('Unauthorized', 401);
      const {
        jam_masuk_awal_senin_kamis, jam_masuk_awal_jumat,
        jam_masuk_akhir_senin_kamis, jam_masuk_akhir_jumat,
        jam_masuk_senin_kamis, jam_masuk_jumat,
        jam_pulang_senin_kamis, jam_pulang_jumat,
        jam_pulang_akhir_senin_kamis, jam_pulang_akhir_jumat,
        toleransi_menit,
      } = parseBody(event);
      try {
        const rows = await sql`
          UPDATE absensi_settings SET
            jam_masuk_awal_senin_kamis = COALESCE(${jam_masuk_awal_senin_kamis || null}, jam_masuk_awal_senin_kamis),
            jam_masuk_awal_jumat       = COALESCE(${jam_masuk_awal_jumat || null}, jam_masuk_awal_jumat),
            jam_masuk_akhir_senin_kamis = COALESCE(${jam_masuk_akhir_senin_kamis || null}, jam_masuk_akhir_senin_kamis),
            jam_masuk_akhir_jumat       = COALESCE(${jam_masuk_akhir_jumat || null}, jam_masuk_akhir_jumat),
            jam_masuk_senin_kamis  = COALESCE(${jam_masuk_senin_kamis || null}, jam_masuk_senin_kamis),
            jam_masuk_jumat        = COALESCE(${jam_masuk_jumat || null}, jam_masuk_jumat),
            jam_pulang_senin_kamis = COALESCE(${jam_pulang_senin_kamis || null}, jam_pulang_senin_kamis),
            jam_pulang_jumat       = COALESCE(${jam_pulang_jumat || null}, jam_pulang_jumat),
            jam_pulang_akhir_senin_kamis = COALESCE(${jam_pulang_akhir_senin_kamis || null}, jam_pulang_akhir_senin_kamis),
            jam_pulang_akhir_jumat       = COALESCE(${jam_pulang_akhir_jumat || null}, jam_pulang_akhir_jumat),
            toleransi_menit        = COALESCE(${toleransi_menit ?? null}, toleransi_menit),
            updated_at = NOW()
          WHERE id = 1
          RETURNING *
        `;
        await logAudit(sql, event, {
          user_id: auth.id, nama: auth.nama, email: auth.email,
          aksi: 'update_absensi_settings', entitas: 'absensi_settings', entitas_id: 1,
          detail: rows[0],
        });
        return jsonResponse({ settings: rows[0] });
      } catch (err) {
        console.error('[PUT /api/absensi/settings]', err);
        return errorResponse('Gagal menyimpan pengaturan');
      }
    }
    return errorResponse('Not found', 404);
  }

  if (isLibur) {
    if (event.httpMethod === 'GET') {
      const { tahun, bulan } = event.queryStringParameters || {};
      try {
        let rows;
        if (tahun && bulan) {
          rows = await sql`
            SELECT * FROM hari_libur
            WHERE EXTRACT(YEAR FROM tanggal) = ${parseInt(tahun)}
              AND EXTRACT(MONTH FROM tanggal) = ${parseInt(bulan)}
            ORDER BY tanggal ASC
          `;
        } else if (tahun) {
          rows = await sql`
            SELECT * FROM hari_libur
            WHERE EXTRACT(YEAR FROM tanggal) = ${parseInt(tahun)}
            ORDER BY tanggal ASC
          `;
        } else {
          rows = await sql`SELECT * FROM hari_libur ORDER BY tanggal DESC LIMIT 100`;
        }
        return jsonResponse({ libur: rows });
      } catch (err) {
        console.error('[GET /api/absensi/libur]', err);
        return errorResponse('Gagal mengambil data hari libur');
      }
    }
    if (event.httpMethod === 'POST') {
      if (!full) return errorResponse('Unauthorized', 401);
      const { tanggal, keterangan } = parseBody(event);
      if (!tanggal || !keterangan) return errorResponse('Tanggal dan keterangan wajib diisi', 400);
      try {
        const exist = await sql`SELECT id FROM hari_libur WHERE tanggal = ${tanggal} LIMIT 1`;
        if (exist.length) return errorResponse('Tanggal tersebut sudah tercatat sebagai hari libur', 409);
        const rows = await sql`
          INSERT INTO hari_libur (tanggal, keterangan, created_by)
          VALUES (${tanggal}, ${keterangan.trim()}, ${auth.id})
          RETURNING *
        `;
        await logAudit(sql, event, {
          user_id: auth.id, nama: auth.nama, email: auth.email,
          aksi: 'create_hari_libur', entitas: 'hari_libur', entitas_id: rows[0].id,
          detail: { tanggal, keterangan },
        });
        return jsonResponse({ libur: rows[0] }, 201);
      } catch (err) {
        console.error('[POST /api/absensi/libur]', err);
        return errorResponse('Gagal menambah hari libur');
      }
    }
    if (event.httpMethod === 'PUT' && liburId) {
      if (!full) return errorResponse('Unauthorized', 401);
      const { tanggal, keterangan } = parseBody(event);
      if (!tanggal || !keterangan) return errorResponse('Tanggal dan keterangan wajib diisi', 400);
      try {
        const exist = await sql`SELECT id FROM hari_libur WHERE tanggal = ${tanggal} AND id != ${liburId} LIMIT 1`;
        if (exist.length) return errorResponse('Tanggal tersebut sudah tercatat sebagai hari libur', 409);
        const rows = await sql`
          UPDATE hari_libur SET tanggal = ${tanggal}, keterangan = ${keterangan.trim()}
          WHERE id = ${liburId}
          RETURNING *
        `;
        if (!rows.length) return errorResponse('Data hari libur tidak ditemukan', 404);
        await logAudit(sql, event, {
          user_id: auth.id, nama: auth.nama, email: auth.email,
          aksi: 'update_hari_libur', entitas: 'hari_libur', entitas_id: liburId,
          detail: { tanggal, keterangan },
        });
        return jsonResponse({ libur: rows[0] });
      } catch (err) {
        console.error('[PUT /api/absensi/libur/:id]', err);
        return errorResponse('Gagal menyimpan perubahan hari libur');
      }
    }
    if (event.httpMethod === 'DELETE' && liburId) {
      if (!full) return errorResponse('Unauthorized', 401);
      try {
        await sql`DELETE FROM hari_libur WHERE id = ${liburId}`;
        await logAudit(sql, event, {
          user_id: auth.id, nama: auth.nama, email: auth.email,
          aksi: 'delete_hari_libur', entitas: 'hari_libur', entitas_id: liburId,
        });
        return jsonResponse({ ok: true });
      } catch (err) {
        console.error('[DELETE /api/absensi/libur/:id]', err);
        return errorResponse('Gagal menghapus hari libur');
      }
    }
    return errorResponse('Not found', 404);
  }

  if (isPengajuan) {
    if (event.httpMethod === 'GET') {
      const { status_persetujuan, user_id } = event.queryStringParameters || {};
      const targetUserId = full ? (user_id ? parseInt(user_id) : null) : auth.id;
      if (!full && user_id && parseInt(user_id) !== auth.id) return errorResponse('Unauthorized', 401);
      try {
        const rows = await sql`
          SELECT p.*, p.tanggal::text AS tanggal, p.tanggal_selesai::text AS tanggal_selesai, u.nama AS nama_pegawai
          FROM absensi_pengajuan p
          JOIN users u ON u.id = p.user_id
          WHERE (${targetUserId}::int IS NULL OR p.user_id = ${targetUserId}::int)
            AND (${status_persetujuan || null}::text IS NULL OR p.status_persetujuan = ${status_persetujuan || null}::text)
          ORDER BY p.created_at DESC
          LIMIT 200
        `;
        return jsonResponse({ pengajuan: rows });
      } catch (err) {
        console.error('[GET /api/absensi/pengajuan]', err);
        return errorResponse('Gagal mengambil data pengajuan');
      }
    }

    if (event.httpMethod === 'POST' && !pengajuanId) {
      const { tanggal, tanggal_selesai, status, keterangan, data_dukung_url, data_dukung_nama } = parseBody(event);
      if (!tanggal || !tanggal_selesai || !status) return errorResponse('Tanggal dan jenis pengajuan wajib diisi', 400);
      if (status !== 'tugas_luar' && status !== 'cuti') return errorResponse('Jenis pengajuan tidak valid', 400);
      if (tanggal_selesai < tanggal) return errorResponse('Tanggal selesai tidak boleh sebelum tanggal mulai', 400);
      if (!data_dukung_url) return errorResponse('Data dukung wajib diisi', 400);

      try {
        const tanggalList = _rentangTanggalYMD(tanggal, tanggal_selesai);
        const bentrokAbsensi = await sql`SELECT tanggal FROM absensi WHERE user_id = ${auth.id} AND tanggal = ANY(${tanggalList}::date[])`;
        if (bentrokAbsensi.length) {
          return errorResponse('Sudah ada catatan absensi pada rentang tanggal ini, hubungi admin', 409);
        }
        const bentrokPengajuan = await sql`
          SELECT id FROM absensi_pengajuan
          WHERE user_id = ${auth.id} AND status_persetujuan = 'pending'
            AND tanggal <= ${tanggal_selesai} AND tanggal_selesai >= ${tanggal}
        `;
        if (bentrokPengajuan.length) {
          return errorResponse('Ada pengajuan lain yang masih menunggu persetujuan pada rentang tanggal ini', 409);
        }

        const rows = await sql`
          INSERT INTO absensi_pengajuan (user_id, tanggal, tanggal_selesai, status, keterangan, data_dukung_url, data_dukung_nama)
          VALUES (${auth.id}, ${tanggal}, ${tanggal_selesai}, ${status}, ${keterangan || null}, ${data_dukung_url}, ${data_dukung_nama || null})
          RETURNING *, tanggal::text AS tanggal, tanggal_selesai::text AS tanggal_selesai
        `;
        await logAudit(sql, event, {
          user_id: auth.id, nama: auth.nama, email: auth.email,
          aksi: 'create_pengajuan_absensi', entitas: 'absensi_pengajuan', entitas_id: rows[0].id,
          detail: { tanggal, tanggal_selesai, status },
        });
        return jsonResponse({ pengajuan: rows[0] }, 201);
      } catch (err) {
        console.error('[POST /api/absensi/pengajuan]', err);
        return errorResponse('Gagal mengajukan');
      }
    }

    if (event.httpMethod === 'PUT' && pengajuanId && pengajuanAction === 'approve') {
      if (!full) return errorResponse('Unauthorized', 401);
      try {
        const existing = await sql`SELECT *, tanggal::text AS tanggal, tanggal_selesai::text AS tanggal_selesai FROM absensi_pengajuan WHERE id = ${pengajuanId} LIMIT 1`;
        if (!existing.length) return errorResponse('Pengajuan tidak ditemukan', 404);
        const peng = existing[0];
        if (peng.status_persetujuan !== 'pending') return errorResponse('Pengajuan ini sudah diproses', 409);

        const tanggalStr = peng.tanggal;
        const selesaiStr = peng.tanggal_selesai;
        const tanggalList = _rentangTanggalYMD(tanggalStr, selesaiStr);
        const bentrok = await sql`SELECT tanggal::text AS tanggal FROM absensi WHERE user_id = ${peng.user_id} AND tanggal = ANY(${tanggalList}::date[])`;
        if (bentrok.length) {
          const daftar = bentrok.map(r => r.tanggal).join(', ');
          return errorResponse(`Sudah ada absensi pada tanggal: ${daftar}. Cek data absensi pegawai dulu.`, 409);
        }

        const inserted = [];
        for (const tgl of tanggalList) {
          const rows = await sql`
            INSERT INTO absensi (user_id, tanggal, jam_masuk, jam_keluar, status, terlambat, menit_terlambat, keterangan, data_dukung_url, data_dukung_nama, input_by, pengajuan_id)
            VALUES (${peng.user_id}, ${tgl}, NULL, NULL, ${peng.status}, false, 0, ${peng.keterangan}, ${peng.data_dukung_url}, ${peng.data_dukung_nama}, ${auth.id}, ${peng.id})
            RETURNING *
          `;
          inserted.push(rows[0]);
        }
        const updated = await sql`
          UPDATE absensi_pengajuan SET status_persetujuan = 'disetujui', diproses_oleh = ${auth.id}, diproses_at = NOW()
          WHERE id = ${pengajuanId}
          RETURNING *
        `;
        await logAudit(sql, event, {
          user_id: auth.id, nama: auth.nama, email: auth.email,
          aksi: 'approve_pengajuan_absensi', entitas: 'absensi_pengajuan', entitas_id: pengajuanId,
          detail: { user_id: peng.user_id, tanggal: tanggalStr, tanggal_selesai: selesaiStr, status: peng.status },
        });
        return jsonResponse({ pengajuan: updated[0], absensi: inserted });
      } catch (err) {
        console.error('[PUT /api/absensi/pengajuan/:id/approve]', err);
        return errorResponse('Gagal menyetujui pengajuan');
      }
    }

    if (event.httpMethod === 'PUT' && pengajuanId && pengajuanAction === 'reject') {
      if (!full) return errorResponse('Unauthorized', 401);
      const { catatan_admin } = parseBody(event);
      try {
        const existing = await sql`SELECT * FROM absensi_pengajuan WHERE id = ${pengajuanId} LIMIT 1`;
        if (!existing.length) return errorResponse('Pengajuan tidak ditemukan', 404);
        if (existing[0].status_persetujuan !== 'pending') return errorResponse('Pengajuan ini sudah diproses', 409);
        const rows = await sql`
          UPDATE absensi_pengajuan SET status_persetujuan = 'ditolak', catatan_admin = ${catatan_admin || null}, diproses_oleh = ${auth.id}, diproses_at = NOW()
          WHERE id = ${pengajuanId}
          RETURNING *
        `;
        await logAudit(sql, event, {
          user_id: auth.id, nama: auth.nama, email: auth.email,
          aksi: 'reject_pengajuan_absensi', entitas: 'absensi_pengajuan', entitas_id: pengajuanId,
          detail: { catatan_admin },
        });
        return jsonResponse({ pengajuan: rows[0] });
      } catch (err) {
        console.error('[PUT /api/absensi/pengajuan/:id/reject]', err);
        return errorResponse('Gagal menolak pengajuan');
      }
    }

    if (event.httpMethod === 'DELETE' && pengajuanId) {
      try {
        const existing = await sql`SELECT * FROM absensi_pengajuan WHERE id = ${pengajuanId} LIMIT 1`;
        if (!existing.length) return errorResponse('Pengajuan tidak ditemukan', 404);
        if (existing[0].user_id !== auth.id && !full) return errorResponse('Unauthorized', 401);
        if (!['pending', 'ditolak'].includes(existing[0].status_persetujuan)) return errorResponse('Pengajuan yang sudah disetujui tidak bisa dihapus dari sini', 409);
        await sql`DELETE FROM absensi_pengajuan WHERE id = ${pengajuanId}`;
        if (existing[0].data_dukung_url) await deleteFromCloudinary(existing[0].data_dukung_url).catch(() => {});
        await logAudit(sql, event, {
          user_id: auth.id, nama: auth.nama, email: auth.email,
          aksi: 'batalkan_pengajuan_absensi', entitas: 'absensi_pengajuan', entitas_id: pengajuanId,
        });
        return jsonResponse({ ok: true });
      } catch (err) {
        console.error('[DELETE /api/absensi/pengajuan/:id]', err);
        return errorResponse('Gagal membatalkan pengajuan');
      }
    }

    return errorResponse('Not found', 404);
  }

  if (isCheckin && event.httpMethod === 'POST') {
    try {
      const tanggal = todayStr();
      let body = {};
      try { body = JSON.parse(event.body || '{}'); } catch { /* noop */ }
      const jamInput = typeof body.jam === 'string' ? body.jam.trim() : '';
      if (jamInput && !/^([01]\d|2[0-3]):[0-5]\d$/.test(jamInput)) return errorResponse('Format jam tidak valid (HH:MM)', 400);
      const jam = jamInput || nowTimeStr();

      const libur = await sql`SELECT keterangan FROM hari_libur WHERE tanggal = ${tanggal} LIMIT 1`;
      if (libur.length) return errorResponse(`Hari ini libur (${libur[0].keterangan}), absensi tidak diperlukan`, 400);

      const existing = await sql`SELECT id, jam_masuk FROM absensi WHERE user_id = ${auth.id} AND tanggal = ${tanggal} LIMIT 1`;
      if (existing.length && existing[0].jam_masuk) return errorResponse('Anda sudah absensi masuk hari ini', 409);

      const settingsRows = await sql`SELECT * FROM absensi_settings WHERE id = 1`;
      const settings = settingsRows[0];

      const isJumat = new Date(`${tanggal}T00:00:00`).getDay() === 5;
      const batasAwalMasuk = isJumat ? settings.jam_masuk_awal_jumat : settings.jam_masuk_awal_senin_kamis;
      const batasAkhirMasuk = isJumat ? settings.jam_masuk_akhir_jumat : settings.jam_masuk_akhir_senin_kamis;
      const jendela = cekJendelaWaktu(tanggal, jam, batasAwalMasuk, batasAkhirMasuk);
      if (!jendela.boleh) {
        return errorResponse(
          jendela.alasan === 'akhir'
            ? `Sudah lewat batas waktu absensi masuk (sampai jam ${jendela.batas} WITA). Hubungi admin untuk input manual.`
            : `Belum waktunya absensi masuk (mulai jam ${jendela.batas} WITA)`,
          400,
        );
      }

      const { terlambat, menit_terlambat } = hitungTerlambat(tanggal, jam, settings);

      let row;
      if (existing.length) {
        const rows = await sql`
          UPDATE absensi SET jam_masuk = ${jam}, status = 'hadir',
            terlambat = ${terlambat}, menit_terlambat = ${menit_terlambat},
            input_by = ${auth.id}, updated_at = NOW()
          WHERE id = ${existing[0].id}
          RETURNING *
        `;
        row = rows[0];
      } else {
        const rows = await sql`
          INSERT INTO absensi (user_id, tanggal, jam_masuk, status, terlambat, menit_terlambat, input_by)
          VALUES (${auth.id}, ${tanggal}, ${jam}, 'hadir', ${terlambat}, ${menit_terlambat}, ${auth.id})
          RETURNING *
        `;
        row = rows[0];
      }
      return jsonResponse({ absensi: row });
    } catch (err) {
      console.error('[POST /api/absensi/checkin]', err);
      return errorResponse('Gagal mencatat absensi masuk');
    }
  }

  if (isCheckout && event.httpMethod === 'PUT') {
    try {
      const tanggal = todayStr();
      let body = {};
      try { body = JSON.parse(event.body || '{}'); } catch { /* noop */ }
      const jamInput = typeof body.jam === 'string' ? body.jam.trim() : '';
      if (jamInput && !/^([01]\d|2[0-3]):[0-5]\d$/.test(jamInput)) return errorResponse('Format jam tidak valid (HH:MM)', 400);
      const jam = jamInput || nowTimeStr();
      const existing = await sql`SELECT id, jam_masuk, jam_keluar FROM absensi WHERE user_id = ${auth.id} AND tanggal = ${tanggal} LIMIT 1`;
      if (!existing.length || !existing[0].jam_masuk) return errorResponse('Anda belum absensi masuk hari ini', 400);
      if (existing[0].jam_keluar) return errorResponse('Anda sudah absensi keluar hari ini', 409);

      const settingsRows = await sql`SELECT * FROM absensi_settings WHERE id = 1`;
      const settings = settingsRows[0];
      const isJumat = new Date(`${tanggal}T00:00:00`).getDay() === 5;
      const batasAwalPulang = isJumat ? settings.jam_pulang_jumat : settings.jam_pulang_senin_kamis;
      const batasAkhirPulang = isJumat ? settings.jam_pulang_akhir_jumat : settings.jam_pulang_akhir_senin_kamis;
      const jendela = cekJendelaWaktu(tanggal, jam, batasAwalPulang, batasAkhirPulang);
      if (!jendela.boleh) {
        return errorResponse(
          jendela.alasan === 'akhir'
            ? `Sudah lewat batas waktu absensi keluar (sampai jam ${jendela.batas} WITA). Hubungi admin untuk input manual.`
            : `Belum waktunya absensi keluar (mulai jam ${jendela.batas} WITA)`,
          400,
        );
      }

      const rows = await sql`
        UPDATE absensi SET jam_keluar = ${jam}, updated_at = NOW()
        WHERE id = ${existing[0].id}
        RETURNING *
      `;
      return jsonResponse({ absensi: rows[0] });
    } catch (err) {
      console.error('[PUT /api/absensi/checkout]', err);
      return errorResponse('Gagal mencatat absensi pulang');
    }
  }

  if (isRekap && event.httpMethod === 'GET') {
    const { user_id, bulan, tahun, bidang_id } = event.queryStringParameters || {};
    const targetUserId = full ? (user_id ? parseInt(user_id) : null) : auth.id;
    if (!full && user_id && parseInt(user_id) !== auth.id) return errorResponse('Unauthorized', 401);
    const bidangId = full && bidang_id ? parseInt(bidang_id) : null;

    const y = tahun ? parseInt(tahun) : parseInt(todayStr().slice(0, 4));
    const bulanDikirim = event.queryStringParameters && Object.prototype.hasOwnProperty.call(event.queryStringParameters, 'bulan');
    const semuaBulan = bulanDikirim && !bulan;
    const m = bulan ? parseInt(bulan) : (semuaBulan ? null : parseInt(todayStr().slice(5, 7)));

    try {
      const mParam = m; 
      const rows = await sql`
        SELECT a.tanggal::text AS tanggal, a.status, a.terlambat, a.menit_terlambat, a.jam_masuk, a.jam_keluar FROM absensi a JOIN users u ON u.id = a.user_id
        WHERE EXTRACT(YEAR FROM a.tanggal) = ${y}
          AND (${mParam}::int IS NULL OR EXTRACT(MONTH FROM a.tanggal) = ${mParam}::int)
          AND (${targetUserId}::int IS NULL OR a.user_id = ${targetUserId}::int)
          AND (${bidangId}::int IS NULL OR u.bidang_id = ${bidangId}::int)
          AND (${targetUserId}::int IS NOT NULL OR EXISTS (SELECT 1 FROM user_permissions up WHERE up.user_id = u.id AND up.menu_key IN ('absensi','absensi.full')))
      `;
      const rekap = { hadir: 0, tugas_luar: 0, cuti: 0, alpa: 0, terlambat: 0, tidak_lengkap: 0, total_menit_terlambat: 0 };
      const hariIniStr = todayStr();
      for (const r of rows) {
        const key = (r.status === 'izin' || r.status === 'sakit') ? 'tugas_luar' : r.status;
        const belumSelesaiTapiHariIni = r.tanggal === hariIniStr;
        const isPendingHariIni = key === 'hadir' && (!r.jam_masuk || !r.jam_keluar) && belumSelesaiTapiHariIni;
        if (isPendingHariIni) {
        } else if (key === 'hadir' && (!r.jam_masuk || !r.jam_keluar) && !belumSelesaiTapiHariIni) {
          rekap.tidak_lengkap += 1;
        } else if (key === 'hadir' && r.terlambat) {
          rekap.terlambat += 1;
          rekap.total_menit_terlambat += r.menit_terlambat;
        } else {
          rekap[key] = (rekap[key] || 0) + 1;
        }
      }

      let hariIni = null;
      if (full && !targetUserId) {
        const totalRows = bidangId
          ? await sql`
              SELECT COUNT(*)::int AS c FROM users u
              WHERE u.is_admin = false AND u.bidang_id = ${bidangId}
                AND EXISTS (SELECT 1 FROM user_permissions up WHERE up.user_id = u.id AND up.menu_key IN ('absensi','absensi.full'))
            `
          : await sql`
              SELECT COUNT(*)::int AS c FROM users u
              WHERE u.is_admin = false
                AND EXISTS (SELECT 1 FROM user_permissions up WHERE up.user_id = u.id AND up.menu_key IN ('absensi','absensi.full'))
            `;

        const sudahRows = bidangId
          ? await sql`
              SELECT COUNT(*)::int AS c FROM absensi a JOIN users u ON u.id = a.user_id
              WHERE a.tanggal = ${todayStr()} AND u.bidang_id = ${bidangId}
                AND EXISTS (SELECT 1 FROM user_permissions up WHERE up.user_id = u.id AND up.menu_key IN ('absensi','absensi.full'))
            `
          : await sql`
              SELECT COUNT(*)::int AS c FROM absensi a JOIN users u ON u.id = a.user_id
              WHERE a.tanggal = ${todayStr()}
                AND EXISTS (SELECT 1 FROM user_permissions up WHERE up.user_id = u.id AND up.menu_key IN ('absensi','absensi.full'))
            `;
        hariIni = { total_pegawai: totalRows[0].c, sudah_absen: sudahRows[0].c };
      }

      return jsonResponse({ rekap, bulan: m, tahun: y, hari_ini: hariIni });
    } catch (err) {
      console.error('[GET /api/absensi/rekap]', err);
      return errorResponse('Gagal mengambil rekap');
    }
  }

  if (isRingkasanBulan && event.httpMethod === 'GET') {
    const { user_id, bulan, tahun, bidang_id } = event.queryStringParameters || {};
    if (!bulan || !tahun) return errorResponse('Bulan dan tahun wajib diisi', 400);
    const targetUserId = full ? (user_id ? parseInt(user_id) : null) : auth.id;
    if (!full && user_id && parseInt(user_id) !== auth.id) return errorResponse('Unauthorized', 401);
    const bidangId = full && bidang_id ? parseInt(bidang_id) : null;
    const m = parseInt(bulan), y = parseInt(tahun);

    try {
      const harianRows = await sql`
        SELECT a.tanggal::text AS tanggal, a.status, a.terlambat, a.jam_masuk, a.jam_keluar,
          (a.status = 'hadir' AND (a.jam_masuk IS NULL OR a.jam_keluar IS NULL) AND a.tanggal <> ${todayStr()}::date) AS tidak_lengkap,
          COUNT(*)::int AS jumlah
        FROM absensi a JOIN users u ON u.id = a.user_id
        WHERE EXTRACT(YEAR FROM a.tanggal) = ${y}
          AND EXTRACT(MONTH FROM a.tanggal) = ${m}
          AND (${targetUserId}::int IS NULL OR a.user_id = ${targetUserId}::int)
          AND (${bidangId}::int IS NULL OR u.bidang_id = ${bidangId}::int)
        GROUP BY a.tanggal, a.status, a.terlambat, a.jam_masuk, a.jam_keluar, (a.status = 'hadir' AND (a.jam_masuk IS NULL OR a.jam_keluar IS NULL) AND a.tanggal <> ${todayStr()}::date)
        ORDER BY a.tanggal
      `;
      const todayStrVal = todayStr();
      const harianMap = new Map();
      for (const r of harianRows) {
        const tgl = r.tanggal.slice(0, 10);
        if (!harianMap.has(tgl)) harianMap.set(tgl, { tanggal: tgl, hadir: 0, terlambat: 0, tidak_lengkap: 0, tugas_luar: 0, cuti: 0, alpa: 0 });
        const c = harianMap.get(tgl);
        const key = (r.status === 'izin' || r.status === 'sakit') ? 'tugas_luar' : r.status;
        const isPendingHariIni = key === 'hadir' && (!r.jam_masuk || !r.jam_keluar) && tgl === todayStrVal;
        if (isPendingHariIni) {
        } else if (key === 'hadir') {
          if (r.tidak_lengkap) c.tidak_lengkap += r.jumlah;
          else if (r.terlambat) c.terlambat += r.jumlah;
          else c.hadir += r.jumlah;
        }
        else if (key in c) c[key] += r.jumlah;
      }
      const harian = [...harianMap.values()];

      let ranking_terlambat = [];
      let sudah_absen_user_ids = [];
      if (full && !targetUserId) {
        const rankRows = await sql`
          SELECT a.user_id, u.nama AS user_nama, COUNT(*)::int AS jumlah
          FROM absensi a JOIN users u ON u.id = a.user_id
          WHERE EXTRACT(YEAR FROM a.tanggal) = ${y}
            AND EXTRACT(MONTH FROM a.tanggal) = ${m}
            AND (${targetUserId}::int IS NULL OR a.user_id = ${targetUserId}::int)
            AND (${bidangId}::int IS NULL OR u.bidang_id = ${bidangId}::int)
            AND a.status = 'hadir' AND a.terlambat = true
          GROUP BY a.user_id, u.nama
          ORDER BY jumlah DESC LIMIT 5
        `;
        ranking_terlambat = rankRows;

        const todayRows = bidangId
          ? await sql`
              SELECT a.user_id FROM absensi a JOIN users u ON u.id = a.user_id
              WHERE a.tanggal = ${todayStr()} AND u.bidang_id = ${bidangId}
            `
          : await sql`
              SELECT user_id FROM absensi WHERE tanggal = ${todayStr()}
            `;
        sudah_absen_user_ids = todayRows.map(r => r.user_id);
      }

      return jsonResponse({ harian, ranking_terlambat, sudah_absen_user_ids, bulan: m, tahun: y });
    } catch (err) {
      console.error('[GET /api/absensi/ringkasan-bulan]', err);
      return errorResponse('Gagal mengambil ringkasan bulan');
    }
  }

  if (isJamKerja && event.httpMethod === 'GET') {
    const { user_id, bulan, tahun, bidang_id } = event.queryStringParameters || {};
    const targetUserId = full && user_id ? parseInt(user_id) : (full ? null : auth.id);
    if (!full && user_id && parseInt(user_id) !== auth.id) return errorResponse('Unauthorized', 401);
    const isAgregat = full && !targetUserId;
    const bidangId = full && bidang_id ? parseInt(bidang_id) : null;

    const y = tahun ? parseInt(tahun) : parseInt(todayStr().slice(0, 4));
    const bulanDikirim = event.queryStringParameters && Object.prototype.hasOwnProperty.call(event.queryStringParameters, 'bulan');
    const semuaBulan = bulanDikirim && !bulan;
    const m = bulan ? parseInt(bulan) : (semuaBulan ? null : parseInt(todayStr().slice(5, 7)));

    try {
      const settingsRows = await sql`SELECT * FROM absensi_settings WHERE id = 1`;
      const settings = settingsRows[0];
      const targetMenitSeninKamis = _menitDariJam(settings.jam_pulang_senin_kamis) - _menitDariJam(settings.jam_masuk_senin_kamis);
      const targetMenitJumat = _menitDariJam(settings.jam_pulang_jumat) - _menitDariJam(settings.jam_masuk_jumat);

      const liburRows = await sql`
        SELECT tanggal::text AS tanggal FROM hari_libur
        WHERE EXTRACT(YEAR FROM tanggal) = ${y}
      `;
      const liburSet = new Set(liburRows.map(r => r.tanggal));

      const bulanList = m ? [m] : Array.from({ length: 12 }, (_, i) => i + 1);
      let hariKerjaTotal = 0, targetMenitPerPegawai = 0;
      for (const bln of bulanList) {
        const totalHariBulan = new Date(y, bln, 0).getDate();
        for (let d = 1; d <= totalHariBulan; d++) {
          const tgl = `${y}-${String(bln).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
          const dow = new Date(Date.UTC(y, bln - 1, d)).getUTCDay();
          if (dow === 0 || dow === 6) continue;
          if (liburSet.has(tgl)) continue;
          hariKerjaTotal += 1;
          targetMenitPerPegawai += (dow === 5) ? targetMenitJumat : targetMenitSeninKamis;
        }
      }

      let jumlahPegawai = 1;
      let userIdFilter = [targetUserId];
      if (isAgregat) {
        const pegawaiRows = await sql`
          SELECT id FROM users u
          WHERE u.is_admin = false
            AND (${bidangId}::int IS NULL OR u.bidang_id = ${bidangId}::int)
            AND EXISTS (SELECT 1 FROM user_permissions up WHERE up.user_id = u.id AND up.menu_key IN ('absensi','absensi.full'))
        `;
        userIdFilter = pegawaiRows.map(r => r.id);
        jumlahPegawai = userIdFilter.length || 1;
      }
      const targetMenit = targetMenitPerPegawai * jumlahPegawai;

      const rows = isAgregat
        ? (m
            ? await sql`
                SELECT tanggal::text AS tanggal, status, jam_masuk, jam_keluar
                FROM absensi
                WHERE user_id = ANY(${userIdFilter}::int[])
                  AND EXTRACT(YEAR FROM tanggal) = ${y} AND EXTRACT(MONTH FROM tanggal) = ${m}
              `
            : await sql`
                SELECT tanggal::text AS tanggal, status, jam_masuk, jam_keluar
                FROM absensi
                WHERE user_id = ANY(${userIdFilter}::int[])
                  AND EXTRACT(YEAR FROM tanggal) = ${y}
              `)
        : (m
            ? await sql`
                SELECT tanggal::text AS tanggal, status, jam_masuk, jam_keluar
                FROM absensi
                WHERE user_id = ${targetUserId}
                  AND EXTRACT(YEAR FROM tanggal) = ${y} AND EXTRACT(MONTH FROM tanggal) = ${m}
              `
            : await sql`
                SELECT tanggal::text AS tanggal, status, jam_masuk, jam_keluar
                FROM absensi
                WHERE user_id = ${targetUserId}
                  AND EXTRACT(YEAR FROM tanggal) = ${y}
              `);
      let aktualMenit = 0, hariHadirLengkap = 0, hariCutiTugasLuar = 0;
      for (const r of rows) {
        const dow = new Date(`${r.tanggal}T00:00:00Z`).getUTCDay();
        const isJumatRow = dow === 5;
        const targetHari = isJumatRow ? targetMenitJumat : targetMenitSeninKamis;
        if (r.status === 'hadir' && r.jam_masuk && r.jam_keluar) {
          const standarMasuk  = _menitDariJam(isJumatRow ? settings.jam_masuk_jumat  : settings.jam_masuk_senin_kamis);
          const standarPulang = _menitDariJam(isJumatRow ? settings.jam_pulang_jumat : settings.jam_pulang_senin_kamis);
          const masukEfektif  = Math.max(_menitDariJam(r.jam_masuk), standarMasuk);
          const pulangEfektif = Math.min(_menitDariJam(r.jam_keluar), standarPulang);
          const durasi = pulangEfektif - masukEfektif;
          if (durasi > 0) { aktualMenit += durasi; hariHadirLengkap += 1; }
        } else if (['cuti', 'tugas_luar', 'izin', 'sakit'].includes(r.status)) {
          aktualMenit += targetHari;
          hariCutiTugasLuar += 1;
        }
      }

      const persentase = targetMenit > 0 ? Math.round((aktualMenit / targetMenit) * 1000) / 10 : 0;

      return jsonResponse({
        bulan: m, tahun: y,
        target_menit: targetMenit,
        aktual_menit: aktualMenit,
        persentase,
        hari_kerja_total: hariKerjaTotal,
        hari_hadir_lengkap: hariHadirLengkap,
        hari_cuti_tugas_luar: hariCutiTugasLuar,
        agregat: isAgregat,
        jumlah_pegawai: isAgregat ? jumlahPegawai : undefined,
      });
    } catch (err) {
      console.error('[GET /api/absensi/jam-kerja]', err);
      return errorResponse('Gagal mengambil rekap jam kerja');
    }
  }

  if (isTahunTersedia && event.httpMethod === 'GET') {
    const { user_id } = event.queryStringParameters || {};
    const targetUserId = full ? (user_id ? parseInt(user_id) : null) : auth.id;
    if (!full && user_id && parseInt(user_id) !== auth.id) return errorResponse('Unauthorized', 401);

    try {
      const rows = await sql`
        SELECT DISTINCT EXTRACT(YEAR FROM a.tanggal)::int AS tahun FROM absensi a JOIN users u ON u.id = a.user_id
        WHERE (${targetUserId}::int IS NULL OR a.user_id = ${targetUserId}::int)
          AND (${targetUserId}::int IS NOT NULL OR EXISTS (SELECT 1 FROM user_permissions up WHERE up.user_id = u.id AND up.menu_key IN ('absensi','absensi.full')))
        ORDER BY tahun DESC
      `;
      return jsonResponse({ tahun: rows.map(r => r.tahun) });
    } catch (err) {
      console.error('[GET /api/absensi/tahun-tersedia]', err);
      return errorResponse('Gagal mengambil daftar tahun');
    }
  }

    if (isBulanTersedia && event.httpMethod === 'GET') {
    const { tahun, user_id, bidang_id } = event.queryStringParameters || {};
    if (!tahun) return errorResponse('Tahun wajib diisi', 400);
    const targetUserId = full ? (user_id ? parseInt(user_id) : null) : auth.id;
    if (!full && user_id && parseInt(user_id) !== auth.id) return errorResponse('Unauthorized', 401);
    const bidangId = full && bidang_id ? parseInt(bidang_id) : null;

    try {
      const tahunVal = parseInt(tahun);
      const rows = await sql`
        SELECT DISTINCT EXTRACT(MONTH FROM a.tanggal)::int AS bulan FROM absensi a JOIN users u ON u.id = a.user_id
        WHERE EXTRACT(YEAR FROM a.tanggal) = ${tahunVal}
          AND (${targetUserId}::int IS NULL OR a.user_id = ${targetUserId}::int)
          AND (${bidangId}::int IS NULL OR u.bidang_id = ${bidangId}::int)
          AND (${targetUserId}::int IS NOT NULL OR EXISTS (SELECT 1 FROM user_permissions up WHERE up.user_id = u.id AND up.menu_key IN ('absensi','absensi.full')))
        ORDER BY bulan
      `;
      return jsonResponse({ bulan: rows.map(r => r.bulan) });
    } catch (err) {
      console.error('[GET /api/absensi/bulan-tersedia]', err);
      return errorResponse('Gagal mengambil daftar bulan');
    }
  }

  if (isBidangTersedia && event.httpMethod === 'GET') {
    if (!full) return errorResponse('Unauthorized', 401);
    const { tahun, user_id } = event.queryStringParameters || {};
    if (!tahun) return errorResponse('Tahun wajib diisi', 400);
    const targetUserId = user_id ? parseInt(user_id) : null;

    try {
      const tahunVal = parseInt(tahun);
      const rows = await sql`
        SELECT DISTINCT b.id, b.nama FROM absensi a
          JOIN users u ON u.id = a.user_id
          JOIN bidang b ON b.id = u.bidang_id
        WHERE EXTRACT(YEAR FROM a.tanggal) = ${tahunVal}
          AND (${targetUserId}::int IS NULL OR a.user_id = ${targetUserId}::int)
          AND (${targetUserId}::int IS NOT NULL OR EXISTS (SELECT 1 FROM user_permissions up WHERE up.user_id = u.id AND up.menu_key IN ('absensi','absensi.full')))
        ORDER BY b.nama
      `;
      return jsonResponse({ bidang: rows });
    } catch (err) {
      console.error('[GET /api/absensi/bidang-tersedia]', err);
      return errorResponse('Gagal mengambil daftar unit kerja');
    }
  }

  if (isStatusTersedia && event.httpMethod === 'GET') {
    const { bulan, tahun, user_id, bidang_id } = event.queryStringParameters || {};
    const targetUserId = full ? (user_id ? parseInt(user_id) : null) : auth.id;
    if (!full && user_id && parseInt(user_id) !== auth.id) return errorResponse('Unauthorized', 401);
    const bidangId = full && bidang_id ? parseInt(bidang_id) : null;
    const effYear = tahun ? parseInt(tahun) : null;
    const effMonth = bulan ? parseInt(bulan) : null;

    try {
      const todayVal = todayStr();
      const rows = await sql`
        SELECT DISTINCT
          CASE
            WHEN a.status = 'hadir' AND a.terlambat = false AND a.jam_masuk IS NOT NULL AND a.jam_keluar IS NOT NULL THEN 'hadir'
            WHEN a.status = 'hadir' AND a.terlambat = true THEN 'terlambat'
            WHEN a.status = 'hadir' AND (a.jam_masuk IS NULL OR a.jam_keluar IS NULL) AND a.tanggal <> ${todayVal}::date THEN 'tidak_lengkap'
            WHEN a.status = 'hadir' AND a.jam_masuk IS NOT NULL AND a.jam_keluar IS NULL AND a.tanggal = ${todayVal}::date THEN 'pending'
            WHEN a.status IN ('tugas_luar','izin','sakit') THEN 'tugas_luar'
            WHEN a.status = 'cuti' THEN 'cuti'
            WHEN a.status = 'alpa' THEN 'alpa'
          END AS status_key
        FROM absensi a JOIN users u ON u.id = a.user_id
        WHERE (${targetUserId}::int IS NULL OR a.user_id = ${targetUserId}::int)
          AND (${bidangId}::int IS NULL OR u.bidang_id = ${bidangId}::int)
          AND (${effYear}::int IS NULL OR EXTRACT(YEAR FROM a.tanggal) = ${effYear}::int)
          AND (${effMonth}::int IS NULL OR EXTRACT(MONTH FROM a.tanggal) = ${effMonth}::int)
          AND (${targetUserId}::int IS NOT NULL OR EXISTS (SELECT 1 FROM user_permissions up WHERE up.user_id = u.id AND up.menu_key IN ('absensi','absensi.full')))
      `;
      const statusAda = rows.map(r => r.status_key).filter(Boolean);
      return jsonResponse({ status: statusAda });
    } catch (err) {
      console.error('[GET /api/absensi/status-tersedia]', err);
      return errorResponse('Gagal mengambil daftar status');
    }
  }


  if (event.httpMethod === 'GET' && !recordId) {
    const { user_id, dari, sampai, bulan, tahun, page, bidang_id, status } = event.queryStringParameters || {};
    const targetUserId = full ? (user_id ? parseInt(user_id) : null) : auth.id;
    if (!full && user_id && parseInt(user_id) !== auth.id) return errorResponse('Unauthorized', 401);
    const bidangId = full && bidang_id ? parseInt(bidang_id) : null;
    const statusFilter = status || null;

    const limit = 10; 
    const offset = ((parseInt(page) || 1) - 1) * limit;

    try {
      let effYear = null, effMonth = null, effDari = null, effSampai = null;
      if (bulan && tahun) {
        effYear = parseInt(tahun); effMonth = parseInt(bulan);
      } else if (dari && sampai) {
        effDari = dari; effSampai = sampai;
      } else if (tahun) {
        effYear = parseInt(tahun);
      }
      const todayVal = todayStr();

      const rows = await sql`
        SELECT a.*, u.nama AS user_nama FROM absensi a JOIN users u ON u.id = a.user_id
        WHERE (${targetUserId}::int IS NULL OR a.user_id = ${targetUserId}::int)
          AND (${bidangId}::int IS NULL OR u.bidang_id = ${bidangId}::int)
          AND (${effYear}::int IS NULL OR EXTRACT(YEAR FROM a.tanggal) = ${effYear}::int)
          AND (${effMonth}::int IS NULL OR EXTRACT(MONTH FROM a.tanggal) = ${effMonth}::int)
          AND (${effDari}::date IS NULL OR a.tanggal >= ${effDari}::date)
          AND (${effSampai}::date IS NULL OR a.tanggal <= ${effSampai}::date)
          AND (${targetUserId}::int IS NOT NULL OR EXISTS (SELECT 1 FROM user_permissions up WHERE up.user_id = u.id AND up.menu_key IN ('absensi','absensi.full')))
          AND (
            ${statusFilter}::text IS NULL
            OR (${statusFilter}::text = 'hadir' AND a.status = 'hadir' AND a.terlambat = false AND a.jam_masuk IS NOT NULL AND a.jam_keluar IS NOT NULL)
            OR (${statusFilter}::text = 'terlambat' AND a.status = 'hadir' AND a.terlambat = true)
            OR (${statusFilter}::text = 'tidak_lengkap' AND a.status = 'hadir' AND (a.jam_masuk IS NULL OR a.jam_keluar IS NULL) AND a.tanggal <> ${todayVal}::date)
            OR (${statusFilter}::text = 'pending' AND a.status = 'hadir' AND a.jam_masuk IS NOT NULL AND a.jam_keluar IS NULL AND a.tanggal = ${todayVal}::date)
            OR (${statusFilter}::text = 'tugas_luar' AND a.status IN ('tugas_luar','izin','sakit'))
            OR (${statusFilter}::text = 'cuti' AND a.status = 'cuti')
            OR (${statusFilter}::text = 'alpa' AND a.status = 'alpa')
          )
        ORDER BY a.tanggal DESC, u.nama ASC LIMIT ${limit} OFFSET ${offset}
      `;
      const countRows = await sql`
        SELECT COUNT(*) FROM absensi a JOIN users u ON u.id = a.user_id
        WHERE (${targetUserId}::int IS NULL OR a.user_id = ${targetUserId}::int)
          AND (${bidangId}::int IS NULL OR u.bidang_id = ${bidangId}::int)
          AND (${effYear}::int IS NULL OR EXTRACT(YEAR FROM a.tanggal) = ${effYear}::int)
          AND (${effMonth}::int IS NULL OR EXTRACT(MONTH FROM a.tanggal) = ${effMonth}::int)
          AND (${effDari}::date IS NULL OR a.tanggal >= ${effDari}::date)
          AND (${effSampai}::date IS NULL OR a.tanggal <= ${effSampai}::date)
          AND (${targetUserId}::int IS NOT NULL OR EXISTS (SELECT 1 FROM user_permissions up WHERE up.user_id = u.id AND up.menu_key IN ('absensi','absensi.full')))
          AND (
            ${statusFilter}::text IS NULL
            OR (${statusFilter}::text = 'hadir' AND a.status = 'hadir' AND a.terlambat = false AND a.jam_masuk IS NOT NULL AND a.jam_keluar IS NOT NULL)
            OR (${statusFilter}::text = 'terlambat' AND a.status = 'hadir' AND a.terlambat = true)
            OR (${statusFilter}::text = 'tidak_lengkap' AND a.status = 'hadir' AND (a.jam_masuk IS NULL OR a.jam_keluar IS NULL) AND a.tanggal <> ${todayVal}::date)
            OR (${statusFilter}::text = 'pending' AND a.status = 'hadir' AND a.jam_masuk IS NOT NULL AND a.jam_keluar IS NULL AND a.tanggal = ${todayVal}::date)
            OR (${statusFilter}::text = 'tugas_luar' AND a.status IN ('tugas_luar','izin','sakit'))
            OR (${statusFilter}::text = 'cuti' AND a.status = 'cuti')
            OR (${statusFilter}::text = 'alpa' AND a.status = 'alpa')
          )
      `;
      return jsonResponse({ absensi: rows, total: parseInt(countRows[0].count) });
    } catch (err) {
      console.error('[GET /api/absensi]', err);
      return errorResponse('Gagal mengambil data absensi');
    }
  }

  if (event.httpMethod === 'POST' && !recordId && !isCheckin) {
    if (!full) return errorResponse('Unauthorized', 401);
    const { user_id, tanggal, tanggal_selesai, jam_masuk, jam_keluar, status, keterangan, data_dukung_url, data_dukung_nama } = parseBody(event);
    if (!user_id || !tanggal) return errorResponse('Pegawai dan tanggal wajib diisi', 400);
    if (status && !STATUS_VALID.includes(status)) return errorResponse('Status tidak valid', 400);

    const isRentang = !!tanggal_selesai && tanggal_selesai !== tanggal;
    if (isRentang) {
      if (status !== 'tugas_luar' && status !== 'cuti') {
        return errorResponse('Rentang tanggal cuma berlaku utk status Tugas Luar/Cuti', 400);
      }
      if (tanggal_selesai < tanggal) {
        return errorResponse('Tanggal selesai tidak boleh sebelum tanggal mulai', 400);
      }
      if (!data_dukung_url) {
        return errorResponse('Data dukung wajib diisi untuk input rentang Tugas Luar/Cuti', 400);
      }

      const tanggalList = _rentangTanggalYMD(tanggal, tanggal_selesai);
      try {
        const bentrok = await sql`
          SELECT id, tanggal::text AS tanggal, status, input_by, keterangan
          FROM absensi WHERE user_id = ${user_id} AND tanggal = ANY(${tanggalList}::date[])
        `;
        const blocking = bentrok.filter(r => !isCronAlpaRow(r));
        if (blocking.length) {
          const daftar = blocking.map(r => r.tanggal).join(', ');
          return errorResponse(`Sudah ada absensi pada tanggal: ${daftar}. Edit/hapus dulu sebelum input rentang ini.`, 409);
        }
        const overwriteMap = new Map(bentrok.map(r => [r.tanggal, r.id]));

        const inserted = [];
        for (const tgl of tanggalList) {
          const existingId = overwriteMap.get(tgl);
          const rows = existingId
            ? await sql`
                UPDATE absensi SET
                  jam_masuk = NULL, jam_keluar = NULL, status = ${status},
                  terlambat = false, menit_terlambat = 0,
                  keterangan = ${keterangan || null},
                  data_dukung_url = ${data_dukung_url || null}, data_dukung_nama = ${data_dukung_nama || null},
                  input_by = ${auth.id}, updated_at = NOW()
                WHERE id = ${existingId}
                RETURNING *
              `
            : await sql`
                INSERT INTO absensi (user_id, tanggal, jam_masuk, jam_keluar, status, terlambat, menit_terlambat, keterangan, data_dukung_url, data_dukung_nama, input_by)
                VALUES (${user_id}, ${tgl}, NULL, NULL, ${status}, false, 0, ${keterangan || null}, ${data_dukung_url || null}, ${data_dukung_nama || null}, ${auth.id})
                RETURNING *
              `;
          inserted.push(rows[0]);
        }
        await logAudit(sql, event, {
          user_id: auth.id, nama: auth.nama, email: auth.email,
          aksi: 'create_absensi_rentang', entitas: 'absensi', entitas_id: inserted[0]?.id,
          detail: { user_id, tanggal, tanggal_selesai, status, jumlah_hari: tanggalList.length, jumlah_overwrite_alpa: overwriteMap.size },
        });
        return jsonResponse({ absensi: inserted }, 201);
      } catch (err) {
        console.error('[POST /api/absensi] rentang', err);
        return errorResponse('Gagal menambah absensi rentang');
      }
    }

    const dowInput = new Date(`${tanggal}T00:00:00`).getDay();
    if (dowInput === 0 || dowInput === 6) {
      return errorResponse('Tanggal tersebut akhir pekan, absensi tidak diperlukan', 400);
    }
    const liburInput = await sql`SELECT keterangan FROM hari_libur WHERE tanggal = ${tanggal} LIMIT 1`;
    if (liburInput.length) {
      return errorResponse(`Tanggal tersebut hari libur (${liburInput[0].keterangan}), absensi tidak diperlukan`, 400);
    }

    try {
      const exist = await sql`
        SELECT id, status, input_by, keterangan FROM absensi
        WHERE user_id = ${user_id} AND tanggal = ${tanggal} LIMIT 1
      `;
      let overwriteId = null;
      if (exist.length) {
        if (!isCronAlpaRow(exist[0])) {
          return errorResponse('Absensi pegawai untuk tanggal tersebut sudah ada, silakan edit', 409);
        }
        overwriteId = exist[0].id; 
      }

      const settingsRows = await sql`SELECT * FROM absensi_settings WHERE id = 1`;

      const finalStatus = status || 'hadir';
      const { terlambat, menit_terlambat } = finalStatus === 'hadir'
        ? hitungTerlambat(tanggal, jam_masuk, settingsRows[0])
        : { terlambat: false, menit_terlambat: 0 };

      const rows = overwriteId
        ? await sql`
            UPDATE absensi SET
              jam_masuk = ${jam_masuk || null}, jam_keluar = ${jam_keluar || null},
              status = ${finalStatus}, terlambat = ${terlambat}, menit_terlambat = ${menit_terlambat},
              keterangan = ${keterangan || null},
              data_dukung_url = ${data_dukung_url || null}, data_dukung_nama = ${data_dukung_nama || null},
              input_by = ${auth.id}, updated_at = NOW()
            WHERE id = ${overwriteId}
            RETURNING *
          `
        : await sql`
            INSERT INTO absensi (user_id, tanggal, jam_masuk, jam_keluar, status, terlambat, menit_terlambat, keterangan, data_dukung_url, data_dukung_nama, input_by)
            VALUES (${user_id}, ${tanggal}, ${jam_masuk || null}, ${jam_keluar || null}, ${finalStatus}, ${terlambat}, ${menit_terlambat}, ${keterangan || null}, ${data_dukung_url || null}, ${data_dukung_nama || null}, ${auth.id})
            RETURNING *
          `;
      await logAudit(sql, event, {
        user_id: auth.id, nama: auth.nama, email: auth.email,
        aksi: overwriteId ? 'overwrite_absensi_cron_alpa' : 'create_absensi', entitas: 'absensi', entitas_id: rows[0].id,
        detail: { user_id, tanggal, status: finalStatus },
      });
      return jsonResponse({ absensi: rows[0] }, overwriteId ? 200 : 201);
    } catch (err) {
      console.error('[POST /api/absensi]', err);
      return errorResponse('Gagal menambah absensi');
    }
  }

  if (event.httpMethod === 'PUT' && recordId) {
    if (!full) return errorResponse('Unauthorized', 401);
    const { jam_masuk, jam_keluar, status, keterangan, data_dukung_url, data_dukung_nama, clear_data_dukung } = parseBody(event);
    if (status && !STATUS_VALID.includes(status)) return errorResponse('Status tidak valid', 400);

    try {
      const existing = await sql`SELECT *, tanggal::text AS tanggal FROM absensi WHERE id = ${recordId} LIMIT 1`;
      if (!existing.length) return errorResponse('Data absensi tidak ditemukan', 404);

      const finalStatus = status !== undefined ? (status || 'hadir') : existing[0].status;
      const finalJamMasuk = jam_masuk !== undefined ? (jam_masuk || null) : existing[0].jam_masuk;
      const finalJamKeluar = jam_keluar !== undefined ? (jam_keluar || null) : existing[0].jam_keluar;
      const finalDukungUrl = clear_data_dukung ? null : (data_dukung_url !== undefined ? (data_dukung_url || null) : existing[0].data_dukung_url);
      const finalDukungNama = clear_data_dukung ? null : (data_dukung_nama !== undefined ? (data_dukung_nama || null) : existing[0].data_dukung_nama);
      const tanggalStr = existing[0].tanggal;
      const settingsRows = await sql`SELECT * FROM absensi_settings WHERE id = 1`;

      const { terlambat, menit_terlambat } = finalStatus === 'hadir'
        ? hitungTerlambat(tanggalStr, finalJamMasuk, settingsRows[0])
        : { terlambat: false, menit_terlambat: 0 };

      const rows = await sql`
        UPDATE absensi SET
          jam_masuk  = ${finalJamMasuk},
          jam_keluar = ${finalJamKeluar},
          status     = ${finalStatus},
          terlambat  = ${terlambat},
          menit_terlambat = ${menit_terlambat},
          keterangan = ${keterangan !== undefined ? (keterangan || null) : existing[0].keterangan},
          data_dukung_url  = ${finalDukungUrl},
          data_dukung_nama = ${finalDukungNama},
          input_by   = ${auth.id},
          updated_at = NOW()
        WHERE id = ${recordId}
        RETURNING *
      `;
      if (existing[0].data_dukung_url && existing[0].data_dukung_url !== finalDukungUrl) {
        await deleteFromCloudinary(existing[0].data_dukung_url).catch(() => {});
      }
      await logAudit(sql, event, {
        user_id: auth.id, nama: auth.nama, email: auth.email,
        aksi: 'update_absensi', entitas: 'absensi', entitas_id: recordId,
        detail: { status: finalStatus },
      });
      return jsonResponse({ absensi: rows[0] });
    } catch (err) {
      console.error('[PUT /api/absensi/:id]', err);
      return errorResponse('Gagal mengupdate absensi');
    }
  }

  if (event.httpMethod === 'DELETE' && recordId) {
    if (!full) return errorResponse('Unauthorized', 401);
    try {
      const existing = await sql`SELECT id, data_dukung_url, pengajuan_id FROM absensi WHERE id = ${recordId} LIMIT 1`;
      if (!existing.length) return errorResponse('Data absensi tidak ditemukan', 404);
      await sql`DELETE FROM absensi WHERE id = ${recordId}`;
      if (existing[0].data_dukung_url) {
        await deleteFromCloudinary(existing[0].data_dukung_url).catch(() => {});
      }

      if (existing[0].pengajuan_id) {
        const sisa = await sql`SELECT id FROM absensi WHERE pengajuan_id = ${existing[0].pengajuan_id} LIMIT 1`;
        if (!sisa.length) {
          await sql`DELETE FROM absensi_pengajuan WHERE id = ${existing[0].pengajuan_id}`;
        }
      }
      await logAudit(sql, event, {
        user_id: auth.id, nama: auth.nama, email: auth.email,
        aksi: 'delete_absensi', entitas: 'absensi', entitas_id: recordId,
      });
      return jsonResponse({ ok: true });
    } catch (err) {
      console.error('[DELETE /api/absensi/:id]', err);
      return errorResponse('Gagal menghapus absensi');
    }
  }

  return errorResponse('Not found', 404);
};