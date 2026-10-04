
import bcrypt from 'bcryptjs';
import { getDb, jsonResponse, errorResponse, parseBody, runOnce } from './_db.js';
import { requireAdmin, requireAuth } from './_auth.js';
import { logAudit, _hitungKunci, LOGIN_HISTORY_HOURS } from './_audit.js';
import { cleanupReplacedFile } from './_cloudinary.js';

const DEFAULT_PASSWORD = 'Balut2026';

export const handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return jsonResponse({});

  const auth = requireAuth(event);
  if (!auth) return errorResponse('Unauthorized', 401);

  const sql = getDb();
  const rawPath = event.path.replace(/.*\/users/, '') || '/';
  const segments = rawPath.split('/').filter(Boolean);

  const isPermissions = segments[1] === 'permissions';
  const isResetPassword = segments[1] === 'reset-password';
  const isForceLogout = segments[1] === 'force-logout';
  const isUnlockLogin = segments[1] === 'unlock-login';
  const isPerencanaan = segments[0] === 'perencanaan';
  const userId = segments[0] && !isNaN(segments[0]) ? parseInt(segments[0]) : null;

  if (event.httpMethod === 'GET' && isPerencanaan) {
    try {
      const rows = await sql`
        SELECT u.nama FROM users u
        LEFT JOIN bidang b ON b.id = u.bidang_id
        WHERE u.is_admin = FALSE
          AND b.nama ILIKE '%perencanaan%'
        ORDER BY u.nama ASC
      `;
      return jsonResponse({ pegawai: rows.map(r => r.nama) });
    } catch (err) {
      console.error('[GET /api/users/perencanaan]', err);
      return errorResponse('Gagal mengambil data pegawai');
    }
  }

  if (event.httpMethod === 'GET' && userId && segments[1] === 'indikator') {
    if (auth.id !== userId && !auth.is_admin) return errorResponse('Unauthorized', 401);
    try {
      // LEFT JOIN supaya indikator_ids tetap identik; flag jenis dipakai frontend buat menentukan
      // menu Kinerja (IKU/IKK/SPM) tanpa harus narik seluruh daftar indikator.
      let rows = await sql`
        SELECT ui.indikator_id, ki.jenis_monev, ki.jenis_ikk, ki.jenis_spm, ki.jenis_custom
        FROM user_indikator ui
        LEFT JOIN kinerja_indikator ki ON ki.id = ui.indikator_id
        WHERE ui.user_id = ${userId}
      `;
      // Pimpinan tanpa indikator ter-assign (hanya-lihat):
      //  'kinerja.pantau' = indikator aktif di unit kerjanya; 'kinerja.pantau.semua' = unit kerja pilihan
      //  (Sekretaris Dinas), dipilih lewat permission 'kinerja.pantau.unit.<bidang_id>'.
      if (rows.length === 0) {
        const perm = await sql`
          SELECT menu_key FROM user_permissions
          WHERE user_id = ${userId}
            AND (menu_key IN ('kinerja.pantau', 'kinerja.pantau.semua') OR menu_key LIKE 'kinerja.pantau.unit.%')
        `;
        const keys = perm.map(r => r.menu_key);
        const unitIds = keys
          .filter(k => k.startsWith('kinerja.pantau.unit.'))
          .map(k => parseInt(k.slice('kinerja.pantau.unit.'.length), 10))
          .filter(n => Number.isInteger(n) && n > 0);
        if (keys.includes('kinerja.pantau.semua') && unitIds.length) {
          rows = await sql`
            SELECT ki.id AS indikator_id, ki.jenis_monev, ki.jenis_ikk, ki.jenis_spm, ki.jenis_custom
            FROM kinerja_indikator ki
            WHERE ki.aktif = TRUE
              AND TRIM(ki.penanggung_jawab) IN (SELECT TRIM(b.nama) FROM bidang b WHERE b.id = ANY(${unitIds}::int[]))
          `;
        } else if (keys.includes('kinerja.pantau')) {
          rows = await sql`
            SELECT ki.id AS indikator_id, ki.jenis_monev, ki.jenis_ikk, ki.jenis_spm, ki.jenis_custom
            FROM kinerja_indikator ki
            JOIN users u ON u.id = ${userId}
            JOIN bidang b ON b.id = u.bidang_id
            WHERE ki.aktif = TRUE AND TRIM(ki.penanggung_jawab) = TRIM(b.nama)
          `;
        }
      }
      return jsonResponse({
        indikator_ids: rows.map(r => r.indikator_id),
        jenis: {
          monev: rows.some(r => !!r.jenis_monev),
          ikk:   rows.some(r => !!r.jenis_ikk),
          spm:   rows.some(r => !!r.jenis_spm),
          subkeg: rows.some(r => {
            let jc = r.jenis_custom;
            if (typeof jc === 'string') { try { jc = JSON.parse(jc); } catch { jc = []; } }
            return Array.isArray(jc) && jc.includes('subkeg');
          }),
        },
      });
    } catch (err) {
      console.error('[GET /api/users/:id/indikator]', err);
      return errorResponse('Gagal mengambil data indikator');
    }
  }

  if (event.httpMethod === 'GET' && userId && segments[1] === 'foto') {
    if (auth.id !== userId && !auth.is_admin) return errorResponse('Unauthorized', 401);
    try {
      await runOnce('users.avatar_url', () => sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_url TEXT`);
      const rows = await sql`
        SELECT u.avatar_url, p.foto_url AS pegawai_foto_url
        FROM users u
        LEFT JOIN pegawai p ON REGEXP_REPLACE(p.nip, '[^0-9]', '', 'g') = REGEXP_REPLACE(u.nip, '[^0-9]', '', 'g') AND p.aktif = TRUE
        WHERE u.id = ${userId}
        LIMIT 1
      `;
      const fotoUrl = rows[0]?.avatar_url || rows[0]?.pegawai_foto_url || null;
      return jsonResponse({ foto_url: fotoUrl });
    } catch (err) {
      console.error('[GET /api/users/:id/foto]', err);
      return jsonResponse({ foto_url: null });
    }
  }

  if (event.httpMethod === 'PUT' && userId && segments[1] === 'avatar') {
    if (auth.id !== userId && !auth.is_admin) return errorResponse('Unauthorized', 401);
    const { avatar_url } = parseBody(event);
    try {
      await runOnce('users.avatar_url', () => sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_url TEXT`);
      const val = (avatar_url && avatar_url.trim()) ? avatar_url.trim() : null;
      const prev = await sql`SELECT avatar_url FROM users WHERE id = ${userId} LIMIT 1`;
      await sql`UPDATE users SET avatar_url = ${val} WHERE id = ${userId}`;
      if (prev[0]?.avatar_url) await cleanupReplacedFile(sql, prev[0].avatar_url, val);
      return jsonResponse({ ok: true, avatar_url: val });
    } catch (err) {
      console.error('[PUT /api/users/:id/avatar]', err);
      return errorResponse('Gagal menyimpan foto profil');
    }
  }

  // Tanda tangan pribadi user (dipakai buat syarat wajib tanda tangan sebelum
  // mengajukan/memverifikasi usulan e-Planning) - pola sama kayak avatar di atas.
  if (event.httpMethod === 'GET' && userId && segments[1] === 'tanda-tangan') {
    if (auth.id !== userId && !auth.is_admin) return errorResponse('Unauthorized', 401);
    try {
      await runOnce('users.tanda_tangan', () => sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS tanda_tangan TEXT`);
      const rows = await sql`SELECT tanda_tangan FROM users WHERE id = ${userId} LIMIT 1`;
      return jsonResponse({ tanda_tangan: rows[0]?.tanda_tangan || null });
    } catch (err) {
      console.error('[GET /api/users/:id/tanda-tangan]', err);
      return jsonResponse({ tanda_tangan: null });
    }
  }

  if (event.httpMethod === 'PUT' && userId && segments[1] === 'tanda-tangan') {
    if (auth.id !== userId && !auth.is_admin) return errorResponse('Unauthorized', 401);
    const { tanda_tangan } = parseBody(event);
    try {
      await runOnce('users.tanda_tangan', () => sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS tanda_tangan TEXT`);
      const val = (tanda_tangan && tanda_tangan.trim()) ? tanda_tangan.trim() : null;
      const prev = await sql`SELECT tanda_tangan FROM users WHERE id = ${userId} LIMIT 1`;
      await sql`UPDATE users SET tanda_tangan = ${val} WHERE id = ${userId}`;
      if (prev[0]?.tanda_tangan) await cleanupReplacedFile(sql, prev[0].tanda_tangan, val);
      return jsonResponse({ ok: true, tanda_tangan: val });
    } catch (err) {
      console.error('[PUT /api/users/:id/tanda-tangan]', err);
      return errorResponse('Gagal menyimpan tanda tangan');
    }
  }

  if (event.httpMethod === 'GET' && !userId) {
    // Selain admin, staf yang punya permission 'absensi.full' juga boleh akses
    // list ini (dipakai buat isi dropdown "Pilih Pegawai" di modal Tambah/Edit
    // Absensi). Untuk non-admin, field yang dibalikin dibatasin (gak ada
    // email/nip/tanda_tangan/dll) biar gak bocor data sensitif ke staf biasa.
    // bidang_id ikut dibalikin karena dropdown "Semua Pegawai" di halaman Absensi menyaring
    // nama per Unit Kerja (kalau kosong, daftar nama jadi kosong pas filter Unit Kerja aktif).
    let isFullAccess = auth.is_admin;
    if (!isFullAccess) {
      const rows = await sql`
        SELECT 1 FROM user_permissions
        WHERE user_id = ${auth.id} AND menu_key = 'absensi.full' LIMIT 1
      `;
      isFullAccess = rows.length > 0;
    }
    if (!isFullAccess) return errorResponse('Unauthorized', 401);

    try {
      if (!auth.is_admin) {
        const users = await sql`
          SELECT u.id, u.nama, u.is_admin, u.bidang_id,
                 COALESCE(
                   (SELECT array_agg(up.menu_key) FROM user_permissions up WHERE up.user_id = u.id),
                   '{}'
                 ) AS permissions
          FROM users u
          ORDER BY u.is_admin DESC, u.nama ASC
        `;
        return jsonResponse({ users });
      }

      await runOnce('users.urutan_laporan', () => sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS urutan_laporan INTEGER`);
      await runOnce('users.avatar_url', () => sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_url TEXT`);
      await runOnce('users.tanda_tangan', () => sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS tanda_tangan TEXT`);
      await runOnce('users.is_active', () => sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE`);
      await runOnce('users.jabatan', () => sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS jabatan TEXT`);
      const users = await sql`
        SELECT u.id, u.nama, u.nip, u.email, u.is_admin, u.last_login, u.created_at,
               u.bidang_id, b.nama AS bidang_nama, b.singkatan AS bidang_singkatan,
               u.jabatan,
               u.urutan_laporan, u.is_active,
               u.tanda_tangan,
               COALESCE(u.avatar_url, p.foto_url) AS foto_url,
               COALESCE(
                 (SELECT array_agg(up.menu_key) FROM user_permissions up WHERE up.user_id = u.id),
                 '{}'
               ) AS permissions
        FROM users u
        LEFT JOIN bidang b ON b.id = u.bidang_id
        LEFT JOIN pegawai p ON REGEXP_REPLACE(p.nip, '[^0-9]', '', 'g') = REGEXP_REPLACE(u.nip, '[^0-9]', '', 'g') AND p.aktif = TRUE
        ORDER BY u.is_admin DESC, u.nama ASC
      `;
      // Status kunci login (rate limit bertingkat) - gagal di sini jangan sampai bikin list user ikut gagal.
      try {
        const att = await sql`
          SELECT email, EXTRACT(EPOCH FROM (NOW() - attempted_at))::float AS age_sec
          FROM login_attempts
          WHERE attempted_at >= NOW() - (${LOGIN_HISTORY_HOURS}::text || ' hours')::interval
          ORDER BY email, attempted_at ASC
        `;
        const byNip = {};
        for (const a of att) (byNip[a.email] ||= []).push(Number(a.age_sec));
        for (const u of users) {
          const st = u.nip && byNip[u.nip] ? _hitungKunci(byNip[u.nip]) : null;
          u.login_terkunci_detik = st && !st.allowed ? st.retryAfterSec : 0;
        }
      } catch (e) { console.error('[GET /api/users lock-status]', e); }
      return jsonResponse({ users });
    } catch (err) {
      console.error('[GET /api/users]', err);
      return errorResponse('Gagal mengambil data pengguna');
    }
  }

  const admin = requireAdmin(event);
  if (!admin) return errorResponse('Unauthorized', 401);

  if (event.httpMethod === 'PUT' && !userId && segments[0] === 'urutan-laporan') {
    const { order } = parseBody(event);
    if (!Array.isArray(order)) return errorResponse('Format urutan tidak valid', 400);
    try {
      await runOnce('users.urutan_laporan', () => sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS urutan_laporan INTEGER`);
      for (let i = 0; i < order.length; i++) {
        await sql`UPDATE users SET urutan_laporan = ${i} WHERE id = ${order[i]}`;
      }
      await logAudit(sql, event, {
        user_id: admin.id, nama: admin.nama, email: admin.email,
        aksi: 'update_urutan_laporan', entitas: 'user',
        detail: { order }
      });
      return jsonResponse({ ok: true });
    } catch (err) {
      console.error('[PUT /api/users/urutan-laporan]', err);
      return errorResponse('Gagal menyimpan urutan laporan');
    }
  }

  if (event.httpMethod === 'GET' && userId && isPermissions) {
    try {
      const perms = await sql`
        SELECT menu_key FROM user_permissions WHERE user_id = ${userId}
      `;
      return jsonResponse({ permissions: perms.map(p => p.menu_key) });
    } catch (err) {
      console.error('[GET /api/users/:id/permissions]', err);
      return errorResponse('Gagal mengambil hak akses');
    }
  }

  // Email opsional: kosong / "-" dianggap tidak diisi -> disimpan NULL (cek duplikat dilewati).
  const normEmail = (v) => {
    const e = (v == null ? '' : String(v)).trim().toLowerCase();
    return (!e || e === '-') ? null : e;
  };

  // Jabatan opsional: kosong / "-" dianggap tidak diisi -> NULL (tampilan profil jatuh ke Unit Kerja).
  const normJabatan = (v) => {
    const j = (v == null ? '' : String(v)).replace(/\s+/g, ' ').trim().slice(0, 150);
    return (!j || j === '-') ? null : j;
  };

  if (event.httpMethod === 'POST' && !userId) {
    const { nama, nip, bidang_id } = parseBody(event);
    const emailVal = normEmail(parseBody(event).email);
    const jabatanVal = normJabatan(parseBody(event).jabatan);
    if (!nama || !nip) {
      return errorResponse('Nama dan NIP wajib diisi', 400);
    }
    try {
      await runOnce('users.email_nullable', () => sql`ALTER TABLE users ALTER COLUMN email DROP NOT NULL`);
      await runOnce('users.jabatan', () => sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS jabatan TEXT`);
      if (emailVal) {
        const exist = await sql`SELECT id FROM users WHERE email = ${emailVal} LIMIT 1`;
        if (exist.length) return errorResponse('Email sudah terdaftar', 409);
      }

      const existNip = await sql`SELECT id FROM users WHERE nip = ${nip.trim()} LIMIT 1`;
      if (existNip.length) return errorResponse('NIP sudah terdaftar', 409);

      const hash = await bcrypt.hash(DEFAULT_PASSWORD, 10);
      const bidangVal = bidang_id ? parseInt(bidang_id) : null;
      const rows = await sql`
        INSERT INTO users (nama, nip, email, password_hash, is_admin, bidang_id, jabatan)
        VALUES (${nama.trim()}, ${nip.trim()}, ${emailVal}, ${hash}, FALSE, ${bidangVal}, ${jabatanVal})
        RETURNING id, nama, nip, email, is_admin, last_login, created_at, bidang_id, jabatan
      `;
      await logAudit(sql, event, {
        user_id: admin.id, nama: admin.nama, email: admin.email,
        aksi: 'create_user', entitas: 'user', entitas_id: rows[0].id,
        detail: { nama: nama.trim(), nip: nip.trim(), email: emailVal, jabatan: jabatanVal }
      });
      return jsonResponse({ user: rows[0] }, 201);
    } catch (err) {
      console.error('[POST /api/users]', err);
      return errorResponse('Gagal menambah pengguna');
    }
  }

  if (event.httpMethod === 'PUT' && userId && !isPermissions && segments[1] !== 'indikator' && segments[1] !== 'status') {
    const { nama, nip, bidang_id } = parseBody(event);
    const bodyPut        = parseBody(event);
    const emailProvided  = bodyPut.email !== undefined;   // undefined = jangan diubah; ''/'-' = kosongkan
    const emailVal       = normEmail(bodyPut.email);
    const jabatanProvided = bodyPut.jabatan !== undefined;   // undefined = jangan diubah; ''/'-' = kosongkan
    const jabatanVal      = normJabatan(bodyPut.jabatan);
    try {
      await runOnce('users.email_nullable', () => sql`ALTER TABLE users ALTER COLUMN email DROP NOT NULL`);
      await runOnce('users.jabatan', () => sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS jabatan TEXT`);
      if (emailVal) {
        const exist = await sql`
          SELECT id FROM users WHERE email = ${emailVal} AND id != ${userId} LIMIT 1
        `;
        if (exist.length) return errorResponse('Email sudah digunakan', 409);
      }
      if (nip) {
        const existNip = await sql`
          SELECT id FROM users WHERE nip = ${nip.trim()} AND id != ${userId} LIMIT 1
        `;
        if (existNip.length) return errorResponse('NIP sudah digunakan', 409);
      }

      const bidangVal = bidang_id !== undefined
        ? (bidang_id ? parseInt(bidang_id) : null)
        : undefined;

      const rows = await sql`
        UPDATE users SET
          nama      = COALESCE(${nama?.trim() || null}, nama),
          nip       = COALESCE(${nip?.trim() || null}, nip),
          email     = ${emailProvided ? emailVal : sql`email`},
          bidang_id = ${bidangVal !== undefined ? bidangVal : sql`bidang_id`},
          jabatan   = ${jabatanProvided ? jabatanVal : sql`jabatan`}
        WHERE id = ${userId} AND is_admin = FALSE
        RETURNING id, nama, nip, email, is_admin, last_login, created_at, bidang_id
      `;
      if (!rows.length) return errorResponse('Pengguna tidak ditemukan atau tidak dapat diedit', 404);

      const fullRows = await sql`
        SELECT u.id, u.nama, u.nip, u.email, u.is_admin, u.last_login, u.created_at,
               u.bidang_id, b.nama AS bidang_nama, b.singkatan AS bidang_singkatan, u.jabatan
        FROM users u
        LEFT JOIN bidang b ON b.id = u.bidang_id
        WHERE u.id = ${rows[0].id} LIMIT 1
      `;
      await logAudit(sql, event, {
        user_id: admin.id, nama: admin.nama, email: admin.email,
        aksi: 'update_user', entitas: 'user', entitas_id: userId,
        detail: { nama: fullRows[0].nama, nip: fullRows[0].nip, email: fullRows[0].email, jabatan: fullRows[0].jabatan }
      });
      return jsonResponse({ user: fullRows[0] });
    } catch (err) {
      console.error('[PUT /api/users/:id]', err);
      return errorResponse('Gagal mengupdate pengguna');
    }
  }

  if (event.httpMethod === 'PUT' && userId && isPermissions) {
    const { permissions } = parseBody(event);
    if (!Array.isArray(permissions)) return errorResponse('Format permissions tidak valid', 400);
    try {
      await sql`DELETE FROM user_permissions WHERE user_id = ${userId}`;
      if (permissions.length > 0) {
        for (const key of permissions) {
          await sql`
            INSERT INTO user_permissions (user_id, menu_key)
            VALUES (${userId}, ${key})
            ON CONFLICT DO NOTHING
          `;
        }
      }
      await logAudit(sql, event, {
        user_id: admin.id, nama: admin.nama, email: admin.email,
        aksi: 'update_permissions', entitas: 'user', entitas_id: userId,
        detail: { permissions }
      });
      return jsonResponse({ ok: true, permissions });
    } catch (err) {
      console.error('[PUT /api/users/:id/permissions]', err);
      return errorResponse('Gagal menyimpan hak akses');
    }
  }

  if (event.httpMethod === 'POST' && userId && isResetPassword) {
    try {
      const check = await sql`SELECT id, is_admin FROM users WHERE id = ${userId} LIMIT 1`;
      if (!check.length) return errorResponse('Pengguna tidak ditemukan', 404);
      if (check[0].is_admin) return errorResponse('Tidak dapat mereset password Super Admin', 403);

      const hash = await bcrypt.hash(DEFAULT_PASSWORD, 10);
      await sql`UPDATE users SET password_hash = ${hash} WHERE id = ${userId}`;
      // Password baru = kesempatan baru: hapus riwayat salah login user ini
      try {
        const u = await sql`SELECT nip FROM users WHERE id = ${userId} LIMIT 1`;
        if (u[0]?.nip) await sql`DELETE FROM login_attempts WHERE email = ${String(u[0].nip).trim()}`;
      } catch (e) { console.error('[reset-password clear login_attempts]', e); }
      await logAudit(sql, event, {
        user_id: admin.id, nama: admin.nama, email: admin.email,
        aksi: 'reset_password', entitas: 'user', entitas_id: userId
      });
      return jsonResponse({ ok: true, default_password: DEFAULT_PASSWORD });
    } catch (err) {
      console.error('[POST /api/users/:id/reset-password]', err);
      return errorResponse('Gagal mereset password');
    }
  }

  if (event.httpMethod === 'PUT' && userId && segments[1] === 'status') {
    const { is_active } = parseBody(event);
    if (typeof is_active !== 'boolean') return errorResponse('Format status tidak valid', 400);
    try {
      await runOnce('users.is_active', () => sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE`);
      const check = await sql`SELECT id, nama, is_admin FROM users WHERE id = ${userId} LIMIT 1`;
      if (!check.length) return errorResponse('Pengguna tidak ditemukan', 404);
      if (check[0].is_admin) return errorResponse('Tidak dapat menonaktifkan Super Admin', 403);

      await sql`UPDATE users SET is_active = ${is_active} WHERE id = ${userId}`;
      // Nonaktif -> cabut semua sesi (refresh token) biar gak bisa perpanjang sesi.
      if (!is_active) {
        await sql`UPDATE refresh_tokens SET revoked_at = NOW() WHERE user_id = ${userId} AND revoked_at IS NULL`;
      }
      await logAudit(sql, event, {
        user_id: admin.id, nama: admin.nama, email: admin.email,
        aksi: is_active ? 'activate_user' : 'deactivate_user', entitas: 'user', entitas_id: userId,
        detail: { target_nama: check[0].nama }
      });
      return jsonResponse({ ok: true, is_active });
    } catch (err) {
      console.error('[PUT /api/users/:id/status]', err);
      return errorResponse('Gagal mengubah status pengguna');
    }
  }

  if (event.httpMethod === 'POST' && userId && isUnlockLogin) {
    try {
      const check = await sql`SELECT id, nama, nip, email FROM users WHERE id = ${userId} LIMIT 1`;
      if (!check.length) return errorResponse('Pengguna tidak ditemukan', 404);
      if (!check[0].nip) return errorResponse('Pengguna ini tidak punya NIP/username', 400);

      const dihapus = await sql`
        DELETE FROM login_attempts WHERE email = ${String(check[0].nip).trim()} RETURNING 1
      `;
      await logAudit(sql, event, {
        user_id: admin.id, nama: admin.nama, email: admin.email,
        aksi: 'unlock_login', entitas: 'user', entitas_id: userId,
        detail: { target_nama: check[0].nama, target_email: check[0].email, percobaan_dihapus: dihapus.length }
      });
      return jsonResponse({ ok: true, percobaan_dihapus: dihapus.length });
    } catch (err) {
      console.error('[POST /api/users/:id/unlock-login]', err);
      return errorResponse('Gagal membuka kunci login');
    }
  }

  if (event.httpMethod === 'POST' && userId && isForceLogout) {
    try {
      const check = await sql`SELECT id, nama, email FROM users WHERE id = ${userId} LIMIT 1`;
      if (!check.length) return errorResponse('Pengguna tidak ditemukan', 404);

      const revoked = await sql`
        UPDATE refresh_tokens SET revoked_at = NOW()
        WHERE user_id = ${userId} AND revoked_at IS NULL
        RETURNING id
      `;
      await logAudit(sql, event, {
        user_id: admin.id, nama: admin.nama, email: admin.email,
        aksi: 'force_logout', entitas: 'user', entitas_id: userId,
        detail: { target_nama: check[0].nama, target_email: check[0].email, sesi_dicabut: revoked.length }
      });
      return jsonResponse({ ok: true, sesi_dicabut: revoked.length });
    } catch (err) {
      console.error('[POST /api/users/:id/force-logout]', err);
      return errorResponse('Gagal memaksa logout pengguna');
    }
  }

  if (event.httpMethod === 'DELETE' && userId) {
    try {
      const check = await sql`SELECT is_admin FROM users WHERE id = ${userId} LIMIT 1`;
      if (!check.length) return errorResponse('Pengguna tidak ditemukan', 404);
      if (check[0].is_admin) return errorResponse('Tidak dapat menghapus Super Admin', 403);

      let oldFiles = [];
      try {
        const f = await sql`SELECT avatar_url, tanda_tangan FROM users WHERE id = ${userId} LIMIT 1`;
        oldFiles = [f[0]?.avatar_url, f[0]?.tanda_tangan].filter(Boolean);
      } catch { /* kolom belum ada -> tidak ada file */ }
      await sql`DELETE FROM user_permissions WHERE user_id = ${userId}`;
      await sql`DELETE FROM users WHERE id = ${userId}`;
      for (const u of oldFiles) await cleanupReplacedFile(sql, u, null);
      await logAudit(sql, event, {
        user_id: admin.id, nama: admin.nama, email: admin.email,
        aksi: 'delete_user', entitas: 'user', entitas_id: userId
      });
      return jsonResponse({ ok: true });
    } catch (err) {
      console.error('[DELETE /api/users/:id]', err);
      return errorResponse('Gagal menghapus pengguna');
    }
  }

  if (event.httpMethod === 'PUT' && userId && segments[1] === 'indikator') {
    const { indikator_ids } = parseBody(event);
    if (!Array.isArray(indikator_ids)) return errorResponse('Format indikator_ids tidak valid', 400);
    try {
      await sql`DELETE FROM user_indikator WHERE user_id = ${userId}`;
      for (const iid of indikator_ids) {
        await sql`
          INSERT INTO user_indikator (user_id, indikator_id)
          VALUES (${userId}, ${iid})
          ON CONFLICT DO NOTHING
        `;
      }
      await logAudit(sql, event, {
        user_id: admin.id, nama: admin.nama, email: admin.email,
        aksi: 'update_indikator', entitas: 'user', entitas_id: userId,
        detail: { indikator_ids }
      });
      return jsonResponse({ ok: true, indikator_ids });
    } catch (err) {
      console.error('[PUT /api/users/:id/indikator]', err);
      return errorResponse('Gagal menyimpan indikator');
    }
  }

  return errorResponse('Not found', 404);
};