// ═══════════════════════════════════════════════════════════════════════
// MODUL ABSENSI — frontend
// Bergantung pada helper global yang sudah ada di app.js / users_frontend.js:
//   authHeaders(), toast(), showConfirm(), openModal(), closeModal(), esc()
//   _user  (objek user login: { id, nama, is_admin, ... })
//   hasAccess(key)  →  cek permission menu_key
// ═══════════════════════════════════════════════════════════════════════

const ABS_BULAN_NAMA = ['', 'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
const STATUS_LABEL = { hadir: 'Tepat Waktu', tugas_luar: 'Tugas Luar', cuti: 'Cuti', alpa: 'Alpa', izin: 'Tugas Luar', sakit: 'Tugas Luar' }; // izin/sakit: fallback data lama (status sudah dihapus, digabung ke Tugas Luar)
const STATUS_BADGE = { hadir: 'badge-hijau', tugas_luar: 'badge-biru', cuti: 'badge-blue', alpa: 'badge-merah', izin: 'badge-biru', sakit: 'badge-biru' };
const STATUS_ICON = {
  hadir: `<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 12l2 2 4-4"/><circle cx="12" cy="12" r="10"/></svg>`,
  terlambat: `<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>`,
  tidak_lengkap: `<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="8" height="4" x="8" y="2" rx="1" ry="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><path d="m15 11-6 6"/><path d="m9 11 6 6"/></svg>`,
  tugas_luar: `<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="20" height="14" x="2" y="7" rx="2" ry="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg>`,
  izin: `<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="20" height="14" x="2" y="7" rx="2" ry="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg>`,
  sakit: `<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="20" height="14" x="2" y="7" rx="2" ry="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg>`,
  cuti: `<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="18" x="3" y="4" rx="2"/><path d="M3 10h18"/><path d="M8 2v4"/><path d="M16 2v4"/></svg>`,
  alpa: `<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3"/><line x1="12" x2="12" y1="9" y2="13"/><line x1="12" x2="12.01" y1="17" y2="17"/></svg>`,
  pending: `<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 22h14"/><path d="M5 2h14"/><path d="M17 22v-4.172a2 2 0 0 0-.586-1.414L12 12l-4.414 4.414A2 2 0 0 0 7 17.828V22"/><path d="M7 2v4.172a2 2 0 0 0 .586 1.414L12 12l4.414-4.414A2 2 0 0 0 17 6.172V2"/></svg>`,
};

function isAbsensiFull() {
  return !!(_user?.is_admin || hasAccess('absensi.full'));
}

// Pengajuan Tugas Luar/Cuti yang masih "Menunggu Persetujuan" belum kesimpan
// di tabel `absensi` (baru keisi pas admin approve) — jadi kartu Hari Ini &
// reminder absen wajib dicek terpisah ke sini, gak cukup andelin todayRow aja,
// biar tombol Absen Masuk/Keluar gak keliru aktif/nge-reminder selagi nunggu approve.
async function _absCekPengajuanPendingHariIni() {
  try {
    const r = await fetch(`/api/absensi/pengajuan?user_id=${_user.id}&status_persetujuan=pending`, { headers: authHeaders() });
    const d = await r.json();
    const hariIni = todayISO();
    return (d.pengajuan || []).find(p => {
      const mulai = (p.tanggal || '').slice(0, 10);
      const selesai = (p.tanggal_selesai || '').slice(0, 10);
      return mulai <= hariIni && hariIni <= selesai;
    }) || null;
  } catch { return null; }
}

let _absSettings = null;
let _absLiburBulanIni = new Set();       // set tanggal (YYYY-MM-DD) yg libur, untuk bulan yg sedang dilihat
let _absFilterBulan = new Date().getMonth() + 1;
let _absFilterTahun = new Date().getFullYear();
let _absFilterPegawai = '';
let _absFilterBidang = '';
let _absAllPegawai = [];   // cache semua pegawai (non-admin) beserta bidang_id, dipakai buat narrow-in filter Unit Kerja
let _absPage = 1;
const _absPageSize = 10;
let _absEditingId = null;

// ── ENTRY POINT (dipanggil dari loader menu, mis. loader: () => loadAbsensi()) ──
async function loadAbsensi() {
  document.getElementById('absAdminBar').style.display = isAbsensiFull() ? 'flex' : 'none';
  document.getElementById('absBidangFilterWrap').style.display = isAbsensiFull() ? '' : 'none';
  document.getElementById('absPegawaiFilterWrap').style.display = isAbsensiFull() ? '' : 'none';
  const btnAjukan = document.getElementById('btnAjukanPengajuan');
  if (btnAjukan) btnAjukan.style.display = _user.is_admin ? 'none' : '';
  const thNama = document.getElementById('absThNama');
  if (thNama) thNama.style.display = isAbsensiFull() ? '' : 'none';
  const thAksi = document.getElementById('absThAksi');
  if (thAksi) thAksi.style.display = isAbsensiFull() ? '' : 'none';

  await loadAbsSettings();
  await rebuildAbsFilterTahun();
  if (isAbsensiFull()) {
    await rebuildAbsFilterBidang();
    await populateAbsPegawaiFilter();
  }
  await rebuildAbsFilterBulan();

  await renderAbsHariIni();
  await loadAbsRekap();
  await loadAbsTable(1);

  if (!_user.is_admin) await loadPengajuanSaya();
  if (isAbsensiFull()) await refreshPengajuanPendingBadge();
}

// Dropdown Tahun menyesuaikan data yg ADA (& pegawai/unit kerja yg sedang
// difilter) — bukan 4 tahun statis (tahun berjalan s/d 3 tahun ke belakang):
// - data cuma di 1 tahun → langsung ke-select tahun itu (opsi cuma tahun itu sendiri)
// - data di >1 tahun     → tampilkan semua tahun yg ada datanya
// - gak ada data sama sekali → fallback ke tahun berjalan (biar dropdown gak kosong)
async function rebuildAbsFilterTahun() {
  const sel = document.getElementById('absFilterTahun');
  if (!sel) return;

  let tahunPresent = [];
  try {
    const params = new URLSearchParams();
    if (isAbsensiFull() && _absFilterPegawai) params.set('user_id', _absFilterPegawai);
    const r = await fetch(`/api/absensi/tahun-tersedia?${params}`, { headers: authHeaders() });
    const d = await r.json();
    tahunPresent = d.tahun || [];
  } catch { tahunPresent = []; }

  let opts;
  if (tahunPresent.length <= 1) {
    const y = tahunPresent[0] || new Date().getFullYear();
    opts = [y];
    _absFilterTahun = y;
  } else {
    opts = tahunPresent;
    if (!tahunPresent.includes(_absFilterTahun)) _absFilterTahun = tahunPresent[0];
  }

  sel.innerHTML = opts.map(y => `<option value="${y}">${y}</option>`).join('');
  sel.value = _absFilterTahun;
  syncCustomSelect?.('absFilterTahun');
}

// Dropdown bulan menyesuaikan data yg ADA utk tahun (& pegawai, jika filter full-access
// lagi milih pegawai tertentu) yg sedang dipilih — bukan 12 bulan statis:
// - data cuma di 1 bulan → langsung ke-select bulan itu (opsi cuma bulan itu sendiri)
// - data di >1 bulan     → tampilkan semua bulan yg ada datanya, biar bisa dipilih
// - gak ada data sama sekali → fallback ke bulan berjalan (biar dropdown gak kosong)
async function rebuildAbsFilterBulan() {
  const bulanSel = document.getElementById('absFilterBulan');
  if (!bulanSel) return;

  let bulanPresent = [];
  try {
    const params = new URLSearchParams({ tahun: _absFilterTahun });
    if (isAbsensiFull() && _absFilterPegawai) params.set('user_id', _absFilterPegawai);
    if (isAbsensiFull() && _absFilterBidang) params.set('bidang_id', _absFilterBidang);
    const r = await fetch(`/api/absensi/bulan-tersedia?${params}`, { headers: authHeaders() });
    const d = await r.json();
    bulanPresent = d.bulan || [];
  } catch { bulanPresent = []; }

  let opts;
  if (bulanPresent.length <= 1) {
    const m = bulanPresent[0] || (new Date().getMonth() + 1);
    opts = [{ value: m, label: ABS_BULAN_NAMA[m] }];
    _absFilterBulan = m;
  } else {
    opts = [{ value: '', label: 'Semua Bulan' }, ...bulanPresent.map(m => ({ value: m, label: ABS_BULAN_NAMA[m] }))];
    if (!bulanPresent.includes(_absFilterBulan)) _absFilterBulan = '';
  }

  bulanSel.innerHTML = opts.map(o => `<option value="${o.value}">${o.label}</option>`).join('');
  bulanSel.value = _absFilterBulan;
  syncCustomSelect?.('absFilterBulan');
}

// Fetch semua pegawai sekali (di-cache di _absAllPegawai), lalu render opsi
// dropdown — di-narrow ke pegawai dalam Unit Kerja terpilih kalau ada.
async function populateAbsPegawaiFilter() {
  const sel = document.getElementById('absFilterPegawai');
  if (!sel) return;
  if (!sel.dataset.fetched) {
    try {
      const r = await fetch('/api/users', { headers: authHeaders() });
      const d = await r.json();
      _absAllPegawai = (d.users || []).filter(u => !u.is_admin);
      sel.dataset.fetched = '1';
    } catch { _absAllPegawai = []; }
  }
  renderAbsPegawaiFilterOptions();
}

function renderAbsPegawaiFilterOptions() {
  const sel = document.getElementById('absFilterPegawai');
  if (!sel) return;
  const list = _absFilterBidang
    ? _absAllPegawai.filter(u => String(u.bidang_id) === String(_absFilterBidang))
    : _absAllPegawai;
  // Pegawai yg lagi kepilih bisa jadi gak ada lagi di list setelah ganti Unit
  // Kerja (beda bidang) — reset ke "Semua Pegawai" biar gak nyangkut filter usang.
  if (_absFilterPegawai && !list.some(u => String(u.id) === String(_absFilterPegawai))) {
    _absFilterPegawai = '';
  }
  sel.innerHTML = '<option value="">Semua Pegawai</option>' +
    list.map(u => `<option value="${u.id}">${esc(u.nama)}</option>`).join('');
  sel.value = _absFilterPegawai;
  syncCustomSelect?.('absFilterPegawai');
}

// Dropdown Unit Kerja menyesuaikan data yg ADA utk tahun (& pegawai) yg sedang
// dipilih — sama kayak rebuildAbsFilterBulan, bukan daftar seluruh master data bidang:
// - data cuma di 1 unit kerja → langsung ke-select unit itu (gak perlu opsi "Semua Unit Kerja")
// - data di >1 unit kerja     → opsi "Semua Unit Kerja" + daftar unit, default "Semua Unit Kerja"
// - gak ada data sama sekali  → cuma opsi "Semua Unit Kerja"
async function rebuildAbsFilterBidang() {
  const sel = document.getElementById('absFilterBidang');
  if (!sel) return;

  let bidangPresent = [];
  try {
    const params = new URLSearchParams({ tahun: _absFilterTahun });
    if (_absFilterPegawai) params.set('user_id', _absFilterPegawai);
    const r = await fetch(`/api/absensi/bidang-tersedia?${params}`, { headers: authHeaders() });
    const d = await r.json();
    bidangPresent = d.bidang || [];
  } catch { bidangPresent = []; }

  let opts;
  if (bidangPresent.length === 1) {
    opts = [{ value: bidangPresent[0].id, label: bidangPresent[0].nama }];
    _absFilterBidang = String(bidangPresent[0].id);
  } else if (bidangPresent.length > 1) {
    opts = [{ value: '', label: 'Semua Unit Kerja' }, ...bidangPresent.map(b => ({ value: b.id, label: b.nama }))];
    if (!bidangPresent.some(b => String(b.id) === String(_absFilterBidang))) _absFilterBidang = '';
  } else {
    opts = [{ value: '', label: 'Semua Unit Kerja' }];
    _absFilterBidang = '';
  }

  sel.innerHTML = opts.map(o => `<option value="${o.value}">${esc(String(o.label))}</option>`).join('');
  sel.value = _absFilterBidang;
  syncCustomSelect?.('absFilterBidang');
}

// Ganti bulan langsung (opsi yg ditampilkan sudah pasti ada datanya) — gak perlu rebuild dropdown
function setAbsFilterBulan() {
  const v = document.getElementById('absFilterBulan').value;
  _absFilterBulan = v ? parseInt(v) : '';
  loadAbsRekap();
  loadAbsTable(1);
}

// Ganti tahun atau pegawai → daftar bulan yg ada datanya bisa berubah, jadi dropdown
// bulan perlu di-rebuild dulu sebelum reload rekap/tabel
async function setAbsFilterTahunAtauPegawai() {
  _absFilterTahun = parseInt(document.getElementById('absFilterTahun').value);
  _absFilterPegawai = document.getElementById('absFilterPegawai')?.value || '';
  await rebuildAbsFilterTahun();
  if (isAbsensiFull()) {
    await rebuildAbsFilterBidang();
    renderAbsPegawaiFilterOptions();
  }
  await rebuildAbsFilterBulan();
  loadAbsRekap();
  loadAbsTable(1);
}

// Ganti Unit Kerja → narrow-in dropdown Pegawai ke bidang terpilih, lalu
// rebuild dropdown bulan (daftar bulan yg ada datanya bisa berubah juga)
async function setAbsFilterBidang() {
  _absFilterBidang = document.getElementById('absFilterBidang')?.value || '';
  renderAbsPegawaiFilterOptions();
  await rebuildAbsFilterBulan();
  loadAbsRekap();
  loadAbsTable(1);
}

// ── ENTRY POINT: HALAMAN PENGATURAN (sub menu Absensi > Pengaturan) ──────
async function loadAbsPengaturan() {
  await loadAbsSettings();
  const box = document.getElementById('absPengaturanJamKerjaRingkasan');
  if (box) {
    box.innerHTML = _absSettings ? `
      Senin–Kamis: <b>${_absSettings.jam_masuk_senin_kamis.slice(0, 5)} – ${_absSettings.jam_pulang_senin_kamis.slice(0, 5)} WITA</b> ·
      Jumat: <b>${_absSettings.jam_masuk_jumat.slice(0, 5)} – ${_absSettings.jam_pulang_jumat.slice(0, 5)} WITA</b> ·
      Toleransi: <b>${_absSettings.toleransi_menit} menit</b>
    ` : 'Belum diatur';
  }
}

// ── PENGATURAN JAM KERJA ────────────────────────────────────────────────
async function loadAbsSettings() {
  try {
    const r = await fetch('/api/absensi/settings', { headers: authHeaders() });
    const d = await r.json();
    _absSettings = d.settings;
  } catch { _absSettings = null; }
}

// ── KARTU "HARI INI" (checkin / checkout) ───────────────────────────────
async function renderAbsHariIni() {
  const box = document.getElementById('absHariIniBox');
  if (!box) return;

  // Super Admin dikecualikan dari absen mandiri — beda sama user yang cuma
  // dikasih akses "full" (absensi.full) tapi bukan Super Admin, yang tetap
  // wajib absen kayak pegawai biasa.
  if (_user.is_admin) {
    box.style.display = 'none';
    return;
  }

  box.style.display = '';

  const w = _witaNow();
  const dowNames = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
  const tanggalLabel = `${dowNames[w.day]}, ${w.date} ${ABS_BULAN_NAMA[w.month]} ${w.year}`;

  let todayRow = null;
  try {
    const r = await fetch(`/api/absensi?user_id=${_user.id}&dari=${todayISO()}&sampai=${todayISO()}`, { headers: authHeaders() });
    const d = await r.json();
    todayRow = (d.absensi || [])[0] || null;
  } catch { /* noop */ }
  const pengajuanPendingHariIni = await _absCekPengajuanPendingHariIni();

  const isWeekend = w.day === 0 || w.day === 6;
  const isLibur = _absLiburBulanIni.has(todayISO());
  const isJumat = w.day === 5;
  const isCutiOrTugas = todayRow?.status === 'cuti' || todayRow?.status === 'tugas_luar';
  // Pending ikut nonaktifin tombol absen (sama kayak cuti/tugas luar yg udah
  // disetujui), tapi labelnya beda ("Menunggu Persetujuan", bukan langsung Cuti/Tugas Luar)
  const skipAbsenHariIni = isCutiOrTugas || !!pengajuanPendingHariIni;

  // Jendela waktu absen: tombol nonaktif kalau BELUM masuk jam mulai, ATAU
  // udah lewat batas akhir (kalau diatur admin) — di luar itu, tombol
  // di-disable dan pegawai harus minta admin input manual.
  const nowHHMM = w.hhmm;
  const masukAwal = _absSettings ? (isJumat ? _absSettings.jam_masuk_awal_jumat : _absSettings.jam_masuk_awal_senin_kamis)?.slice(0, 5) : null;
  const pulangAwal = _absSettings ? (isJumat ? _absSettings.jam_pulang_jumat : _absSettings.jam_pulang_senin_kamis)?.slice(0, 5) : null;
  const masukAkhir = _absSettings ? (isJumat ? _absSettings.jam_masuk_akhir_jumat : _absSettings.jam_masuk_akhir_senin_kamis)?.slice(0, 5) : null;
  const pulangAkhir = _absSettings ? (isJumat ? _absSettings.jam_pulang_akhir_jumat : _absSettings.jam_pulang_akhir_senin_kamis)?.slice(0, 5) : null;
  const belumWaktuMasuk = masukAwal && nowHHMM < masukAwal;
  const belumWaktuPulang = pulangAwal && nowHHMM < pulangAwal;
  const lewatWaktuMasuk = masukAkhir && nowHHMM > masukAkhir;
  const lewatWaktuPulang = pulangAkhir && nowHHMM > pulangAkhir;

  // Status warna kartu — ngikutin persis cabang countdown di bawah, biar
  // warna cardnya (bukan cuma badge/icon kecil di panel kanan) selalu
  // nyocok sama status jendela absen yang lagi aktif:
  //   netral   → belum waktunya / libur / cuti / tugas luar / pending
  //   merah    → jendela absen masuk terbuka, belum absen masuk (perlu aksi)
  //   terlewat → jendela (masuk ATAU keluar) udah tertutup, belum sempat absen (bermasalah → butuh admin)
  //   oranye   → udah absen masuk, jendela absen keluar belum terbuka (nunggu)
  //   kuning   → udah absen masuk, jendela absen keluar udah terbuka, belum absen keluar (perlu aksi)
  //   hijau    → absen masuk & keluar lengkap
  let cardState = 'netral';
  if (!isWeekend && !isLibur && !skipAbsenHariIni) {
    if (todayRow?.jam_masuk && todayRow?.jam_keluar) {
      cardState = 'hijau';
    } else if (todayRow?.jam_masuk) {
      if (lewatWaktuPulang) cardState = 'terlewat';
      else if (!belumWaktuPulang) cardState = 'kuning';
      else cardState = 'oranye';
    } else {
      if (lewatWaktuMasuk) cardState = 'terlewat';
      else if (!belumWaktuMasuk) cardState = 'merah';
    }
  }
  box.classList.remove(
    'abs-hariini-card--netral', 'abs-hariini-card--merah', 'abs-hariini-card--oranye',
    'abs-hariini-card--hijau', 'abs-hariini-card--kuning', 'abs-hariini-card--terlewat'
  );
  box.classList.add(`abs-hariini-card--${cardState}`);

  // Jadwal jam kerja hari ini (bukan jendela absen — jam kerja standar) buat
  // ditampilin di panel kanan sebagai konteks + basis progress bar.
  const jamMasukHariIni = _absSettings ? (isJumat ? _absSettings.jam_masuk_jumat : _absSettings.jam_masuk_senin_kamis)?.slice(0, 5) : null;
  const jamPulangHariIni = _absSettings ? (isJumat ? _absSettings.jam_pulang_jumat : _absSettings.jam_pulang_senin_kamis)?.slice(0, 5) : null;

  const hhmmDate = (hhmm) => _hhmmWitaToDate(hhmm, todayISO());
  const masukAwalDate = hhmmDate(masukAwal);
  const pulangAwalDate = hhmmDate(pulangAwal);
  const jamMasukStdDate = hhmmDate(jamMasukHariIni);
  const jamPulangStdDate = hhmmDate(jamPulangHariIni);

  // Countdown ke event absen berikutnya (buka jendela masuk/pulang), atau
  // status "sudah bisa" / "selesai" kalau nggak ada yang perlu ditunggu.
  let countdownLabel = null, countdownTargetMs = null, countdownDoneText = null, countdownExpired = false;
  if (!isWeekend && !isLibur && !skipAbsenHariIni) {
    if (!todayRow?.jam_masuk) {
      if (belumWaktuMasuk && masukAwalDate) { countdownLabel = 'Absen Masuk Buka Dalam'; countdownTargetMs = masukAwalDate.getTime(); }
      else if (lewatWaktuMasuk) { countdownDoneText = 'Absen Masuk Sudah Ditutup'; countdownExpired = true; }
      else countdownDoneText = 'Absen Masuk Sudah Bisa';
    } else if (!todayRow?.jam_keluar) {
      if (belumWaktuPulang && pulangAwalDate) { countdownLabel = 'Menuju Absen Keluar'; countdownTargetMs = pulangAwalDate.getTime(); }
      else if (lewatWaktuPulang) { countdownDoneText = 'Absen Keluar Sudah Ditutup'; countdownExpired = true; }
      else countdownDoneText = 'Absen Keluar Sudah Bisa';
    } else {
      countdownDoneText = 'Absensi Hari Ini Selesai';
    }
  }

  // Progress bar hari kerja, dari jam masuk s/d jam pulang standar.
  let progressPct = 0;
  if (jamMasukStdDate && jamPulangStdDate) {
    const total = jamPulangStdDate.getTime() - jamMasukStdDate.getTime();
    const elapsed = Date.now() - jamMasukStdDate.getTime();
    progressPct = total > 0 ? Math.max(0, Math.min(100, (elapsed / total) * 100)) : 0;
  }

  const labelStatusHariIni = pengajuanPendingHariIni
    ? 'Menunggu Persetujuan'
    : (isLibur ? 'Hari Libur' : isWeekend ? 'Akhir Pekan' : STATUS_LABEL[todayRow?.status]);
  const badgeStatusHariIni = pengajuanPendingHariIni ? 'badge-yellow' : 'badge-merah';
  const statusIconSvg = (size) => {
    const attrs = `width="${size}" height="${size}" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"`;
    if (pengajuanPendingHariIni) return `<svg xmlns="http://www.w3.org/2000/svg" ${attrs}><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3.5 2"/></svg>`;
    if (todayRow?.status === 'cuti') return `<svg xmlns="http://www.w3.org/2000/svg" ${attrs}><rect width="18" height="18" x="3" y="4" rx="2"/><path d="M3 10h18"/><path d="M8 2v4"/><path d="M16 2v4"/></svg>`;
    if (todayRow?.status === 'tugas_luar') return `<svg xmlns="http://www.w3.org/2000/svg" ${attrs}><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg>`;
    return `<svg xmlns="http://www.w3.org/2000/svg" ${attrs}><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>`;
  };
  const iconStatusHariIni = `<span style="margin-right:5px;vertical-align:-1px">${statusIconSvg(12)}</span>`;

  const panelKanan = `
    <div class="abs-hariini-right">
      ${isWeekend || isLibur || skipAbsenHariIni
        ? (pengajuanPendingHariIni
            ? `<div class="abs-jadwal-value abs-jadwal-value--pending">Absen Ditahan Sementara</div>`
            : `<div class="abs-jadwal-value abs-jadwal-value--kosong">${statusIconSvg(15)}${labelStatusHariIni}</div>
               <div class="abs-jadwal-label">Tidak ada jadwal absen</div>`)
        : `
        <div class="abs-jam-live-label">${countdownLabel || countdownDoneText}</div>
        ${countdownTargetMs
          ? `<div class="abs-jam-live" id="absCountdown" data-target="${countdownTargetMs}">--:--:--</div>`
          : countdownExpired
            ? `<div class="abs-jam-live abs-jam-live--expired"><span class="abs-jam-live-expired-badge"><svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18M6 6l12 12"/></svg></span></div>`
            : `<div class="abs-jam-live abs-jam-live--done"><span class="abs-jam-live-done-badge"><svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path class="abs-jam-live-done-check" d="M4 12l5 5L20 6"/></svg></span></div>`}
        <div class="abs-jadwal-divider"></div>
        <div class="abs-progress-wrap">
          <div class="abs-progress-track"><div class="abs-progress-fill" id="absProgressFill" data-start="${jamMasukStdDate?.getTime() || ''}" data-end="${jamPulangStdDate?.getTime() || ''}" style="width:${progressPct}%"></div></div>
          <div class="abs-progress-jam"><span>${jamMasukHariIni || '--:--'} WITA</span><span>${jamPulangHariIni || '--:--'} WITA</span></div>
        </div>
        <div class="abs-jadwal-label">Jadwal Hari Ini</div>
        `}
    </div>
  `;

  const panelInfo = (isWeekend || isLibur || skipAbsenHariIni) ? '' : `
    <div class="abs-hariini-info">
      <div class="abs-jadwal-label">Info Jadwal Absen</div>
      <div class="abs-info-row">
        <span class="abs-info-row-label"><svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/><polyline points="10 17 15 12 10 7"/><line x1="15" y1="12" x2="3" y2="12"/></svg>Absen Masuk</span>
        <span class="abs-info-row-value">${masukAwal || '--:--'}${masukAkhir ? `–${masukAkhir}` : ''} WITA</span>
      </div>
      <div class="abs-info-row">
        <span class="abs-info-row-label"><svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>Absen Keluar</span>
        <span class="abs-info-row-value">${pulangAwal || '--:--'}${pulangAkhir ? `–${pulangAkhir}` : ''} WITA</span>
      </div>
      ${_absSettings?.toleransi_menit ? `
      <div class="abs-info-row">
        <span class="abs-info-row-label"><svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3.5 2"/></svg>Toleransi</span>
        <span class="abs-info-row-value">${_absSettings.toleransi_menit} menit</span>
      </div>` : ''}
    </div>
  `;

  const dangerBadge = cardState === 'terlewat'
    ? `<div class="abs-hariini-danger-badge" data-tip="Sudah lewat batas waktu — hubungi admin"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg></div>`
    : '';

  box.innerHTML = `
    ${dangerBadge}
    <div class="abs-hariini-tgl">${tanggalLabel}</div>
    <div class="abs-hariini-main">
      <div class="abs-hariini-left">
        ${isWeekend || isLibur || skipAbsenHariIni
          ? `<div class="abs-hariini-status badge ${badgeStatusHariIni}">${iconStatusHariIni}${pengajuanPendingHariIni ? labelStatusHariIni : 'Absen tidak diperlukan'}</div>`
          : `
          <div class="abs-hariini-jam">
            <div class="abs-jam-item">
              <div class="abs-jam-label">Absen Masuk</div>
              ${todayRow?.jam_masuk
                ? `<div class="abs-jam-value">${todayRow.jam_masuk.slice(0, 5)} WITA</div>${todayRow.terlambat ? `<div class="badge badge-merah">Terlambat ${todayRow.menit_terlambat} mnt</div>` : ''}`
                : `<div id="ctp_absHariMasuk" class="ctp-mount" data-ctp="absHariMasuk" data-placeholder="--:--"></div><input type="hidden" id="absHariMasuk" />`}
            </div>
            <div class="abs-jam-item">
              <div class="abs-jam-label">Absen Keluar</div>
              ${todayRow?.jam_keluar
                ? `<div class="abs-jam-value">${todayRow.jam_keluar.slice(0, 5)} WITA</div>`
                : todayRow?.jam_masuk
                  ? `<div id="ctp_absHariKeluar" class="ctp-mount" data-ctp="absHariKeluar" data-placeholder="--:--"></div><input type="hidden" id="absHariKeluar" />`
                  : `<div class="abs-jam-value">—</div>`}
            </div>
          </div>
          <div class="abs-hariini-aksi">
            ${!todayRow?.jam_masuk ? `
            <button class="btn btn-primary" id="btnAbsMasuk" ${(belumWaktuMasuk || lewatWaktuMasuk) ? 'disabled' : ''} onclick="doAbsCheckin()">
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" style="margin-right:6px;vertical-align:-2px"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/><polyline points="10 17 15 12 10 7"/><line x1="15" y1="12" x2="3" y2="12"/></svg>
              Simpan Absen Masuk
            </button>` : ''}
            ${todayRow?.jam_masuk && !todayRow?.jam_keluar ? `
            <button class="btn btn-secondary" id="btnAbsKeluar" ${(belumWaktuPulang || lewatWaktuPulang) ? 'disabled' : ''} onclick="doAbsCheckout()">
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" style="margin-right:6px;vertical-align:-2px"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
              Simpan Absen Keluar
            </button>` : ''}
            ${todayRow?.jam_masuk && todayRow?.jam_keluar ? `<div class="abs-hariini-status badge badge-hijau">Absensi hari ini lengkap</div>` : ''}
          </div>
          ${belumWaktuMasuk && !todayRow?.jam_masuk ? `<div class="abs-hariini-hint">Absen Masuk baru bisa dicatat mulai jam ${masukAwal} WITA</div>` : ''}
          ${lewatWaktuMasuk && !todayRow?.jam_masuk ? `<div class="abs-hariini-hint">Sudah lewat batas absen masuk (sampai jam ${masukAkhir} WITA). Hubungi admin untuk input manual.</div>` : ''}
          ${belumWaktuPulang && todayRow?.jam_masuk && !todayRow?.jam_keluar ? `<div class="abs-hariini-hint">Absen Keluar baru bisa dicatat mulai jam ${pulangAwal} WITA</div>` : ''}
          ${lewatWaktuPulang && todayRow?.jam_masuk && !todayRow?.jam_keluar ? `<div class="abs-hariini-hint">Sudah lewat batas absen keluar (sampai jam ${pulangAkhir} WITA). Hubungi admin untuk input manual.</div>` : ''}
          ${todayRow?.jam_masuk && !todayRow?.jam_keluar && !belumWaktuPulang && !lewatWaktuPulang ? `<div class="abs-hariini-hint">Isi jam sesuai absen di e-Balimang kamu, lalu simpan</div>` : ''}
          `}
      </div>
      ${panelKanan}
      ${panelInfo}
    </div>
  `;

  // Init time-picker (kalau ada elemen ctp-mount baru di kartu ini)
  if (typeof initCtp === 'function') initCtp();
  // Picker-nya sendiri juga harus nonaktif kalau belum waktunya — sebelumnya
  // cuma tombol "Simpan" yg di-disable, jamnya masih bisa dipilih duluan.
  document.getElementById('ctp_absHariMasuk')?._ctp?.[(belumWaktuMasuk || lewatWaktuMasuk) ? 'disable' : 'enable']();
  document.getElementById('ctp_absHariKeluar')?._ctp?.[(belumWaktuPulang || lewatWaktuPulang) ? 'disable' : 'enable']();

  _startAbsHariIniTicker();
}

// ── TICKER panel kanan kartu "Hari Ini": countdown + progress bar ──────
let _absHariIniTickerInterval = null;
function _startAbsHariIniTicker() {
  if (_absHariIniTickerInterval) clearInterval(_absHariIniTickerInterval);

  function _tick() {
    const cd = document.getElementById('absCountdown');
    const fill = document.getElementById('absProgressFill');
    if (!cd && !fill) { clearInterval(_absHariIniTickerInterval); _absHariIniTickerInterval = null; return; }

    if (cd) {
      const diff = Number(cd.dataset.target) - Date.now();
      if (diff <= 0) {
        clearInterval(_absHariIniTickerInterval);
        _absHariIniTickerInterval = null;
        renderAbsHariIni(); // waktu tunggu abis → refresh kartu ke state berikutnya
        return;
      }
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      cd.textContent = [h, m, s].map(n => String(n).padStart(2, '0')).join(':');
    }

    if (fill) {
      const start = Number(fill.dataset.start), end = Number(fill.dataset.end);
      const total = end - start;
      const pct = total > 0 ? Math.max(0, Math.min(100, ((Date.now() - start) / total) * 100)) : 0;
      fill.style.width = pct + '%';
    }
  }
  _tick();
  _absHariIniTickerInterval = setInterval(_tick, 1000);
}

function todayISO() {
  const w = _witaNow();
  return `${w.year}-${String(w.month).padStart(2, '0')}-${String(w.date).padStart(2, '0')}`;
}

// ── WITA-aware time helpers ──────────────────────────────────────────────
// Semua perhitungan jam absen (jendela masuk/pulang, reminder, dsb) harus
// berbasis WITA (Asia/Makassar, UTC+8), BUKAN timezone lokal device user.
// Kalau device usernya di-set ke zona lain (WIB, atau bahkan salah setting),
// pakai `new Date().getHours()` mentah bakal salah baca "jam sekarang" dan
// bikin notif/tombol absen aktif keliru (kejadian: notif Absen Keluar
// muncul sebelum jam 16:00 WITA beneran).
const ABS_TZ = 'Asia/Makassar';
function _witaNow() {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: ABS_TZ, hour12: false,
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', weekday: 'short'
  }).formatToParts(new Date());
  const get = (t) => parts.find(p => p.type === t)?.value;
  const dowMap = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  const year = parseInt(get('year'), 10);
  const month = parseInt(get('month'), 10);
  const date = parseInt(get('day'), 10);
  const hh = get('hour');
  const mm = get('minute');
  return { year, month, date, day: dowMap[get('weekday')], hh, mm, hhmm: `${hh}:${mm}` };
}
// Konversi "HH:MM" (jam standar/absen, dianggap WITA) + tanggal YYYY-MM-DD →
// epoch ms yang benar, dengan eksplisit offset +08:00 — supaya perbandingan/
// countdown tetap akurat walau device usernya bukan di WITA.
function _hhmmWitaToDate(hhmm, ymd) {
  if (!hhmm) return null;
  const [h, m] = hhmm.split(':').map(Number);
  return new Date(`${ymd}T${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:00+08:00`);
}

async function doAbsCheckin() {
  const jam = document.getElementById('absHariMasuk')?.value || '';
  if (!jam) { toast('Isi jam absen masuk dulu', 'error'); return; }
  try {
    const r = await fetch('/api/absensi/checkin', {
      method: 'POST',
      headers: { ...authHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ jam }),
    });
    const d = await r.json();
    if (!r.ok) { toast(d.error || 'Gagal menyimpan absen masuk', 'error'); return; }
    toast(d.absensi.terlambat ? `Absen masuk tersimpan (terlambat ${d.absensi.menit_terlambat} menit)` : 'Absen masuk tersimpan', d.absensi.terlambat ? 'warning' : 'success');
    await renderAbsHariIni();
    await loadAbsRekap();
      await loadAbsTable(_absPage);
  } catch { toast('Gagal menyimpan absen masuk', 'error'); }
}

async function doAbsCheckout() {
  const jam = document.getElementById('absHariKeluar')?.value || '';
  if (!jam) { toast('Isi jam absen keluar dulu', 'error'); return; }
  try {
    const r = await fetch('/api/absensi/checkout', {
      method: 'PUT',
      headers: { ...authHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ jam }),
    });
    const d = await r.json();
    if (!r.ok) { toast(d.error || 'Gagal menyimpan absen keluar', 'error'); return; }
    toast('Absen keluar tersimpan', 'success');
    await renderAbsHariIni();
    await loadAbsTable(_absPage);
  } catch { toast('Gagal menyimpan absen keluar', 'error'); }
}

// ── REMINDER ABSEN OTOMATIS ──────────────────────────────────────────────
// Dipanggil sekali di boot chain app.js (setelah initAuth sukses). Kalau pas
// dicek sudah masuk jendela absen masuk/keluar tapi belum diisi hari ini,
// langsung munculin modal form-nya — user gak perlu buka menu Absensi dulu.
async function _cekAbsensiReminder() {
  if (!_user) return;
  if (_user.is_admin) return; // Super Admin tidak wajib absen — lihat catatan di renderAbsHariIni()
  try {
    await loadAbsSettings();
    if (!_absSettings) return;

    const w = _witaNow();
    if (w.day === 0 || w.day === 6) return; // akhir pekan
    const isJumat = w.day === 5;

    // Cek hari libur
    try {
      const rl = await fetch(`/api/absensi/libur?tahun=${w.year}&bulan=${w.month}`, { headers: authHeaders() });
      const dl = await rl.json();
      const liburSet = new Set((dl.libur || []).map(l => _absLiburLocalYMD(l.tanggal)));
      if (liburSet.has(todayISO())) return;
    } catch { /* gagal fetch libur → anggap bukan libur, lanjut */ }

    let todayRow = null;
    try {
      const r = await fetch(`/api/absensi?user_id=${_user.id}&dari=${todayISO()}&sampai=${todayISO()}`, { headers: authHeaders() });
      const d = await r.json();
      todayRow = (d.absensi || [])[0] || null;
    } catch { return; }
    if (todayRow?.status === 'cuti' || todayRow?.status === 'tugas_luar') return; // gak wajib absen masuk/keluar
    if (await _absCekPengajuanPendingHariIni()) return; // lagi nunggu persetujuan pengajuan → absen ditahan sementara

    const nowHHMM = w.hhmm;
    const masukAwal = (isJumat ? _absSettings.jam_masuk_awal_jumat : _absSettings.jam_masuk_awal_senin_kamis)?.slice(0, 5);
    const pulangAwal = (isJumat ? _absSettings.jam_pulang_jumat : _absSettings.jam_pulang_senin_kamis)?.slice(0, 5);
    const masukAkhir = (isJumat ? _absSettings.jam_masuk_akhir_jumat : _absSettings.jam_masuk_akhir_senin_kamis)?.slice(0, 5);
    const pulangAkhir = (isJumat ? _absSettings.jam_pulang_akhir_jumat : _absSettings.jam_pulang_akhir_senin_kamis)?.slice(0, 5);

    if (!todayRow?.jam_masuk && masukAwal && nowHHMM >= masukAwal && !(masukAkhir && nowHHMM > masukAkhir)) {
      _openAbsReminder('masuk');
    } else if (todayRow?.jam_masuk && !todayRow?.jam_keluar && pulangAwal && nowHHMM >= pulangAwal && !(pulangAkhir && nowHHMM > pulangAkhir)) {
      _openAbsReminder('keluar');
    }
  } catch { /* reminder gak boleh sampai ganggu boot app kalau error */ }
}

function _openAbsReminder(tipe) {
  const modal = document.getElementById('modalAbsReminder');
  if (!modal) return;
  const label = tipe === 'masuk' ? 'Masuk' : 'Keluar';
  const icon = tipe === 'masuk'
    ? '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" style="margin-right:6px;vertical-align:-2px"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/><polyline points="10 17 15 12 10 7"/><line x1="15" y1="12" x2="3" y2="12"/></svg>'
    : '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" style="margin-right:6px;vertical-align:-2px"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>';
  document.getElementById('absReminderTitle').textContent = `Absen ${label}`;
  document.getElementById('absReminderBody').innerHTML = `
    <p class="abs-reminder-hint">Sudah waktunya absen ${label.toLowerCase()}. Isi jam sesuai absen e-Balimang kamu, lalu simpan.</p>
    <div class="field">
      <label>Jam Absen ${label}</label>
      <div id="ctp_absReminderJam" class="ctp-mount" data-ctp="absReminderJam" data-placeholder="--:--"></div>
      <input type="hidden" id="absReminderJam" />
    </div>
    <button class="btn btn-primary" style="width:100%;margin-top:8px" onclick="_submitAbsReminder('${tipe}')">${icon}Simpan Absen ${label}</button>
  `;
  if (typeof initCtp === 'function') initCtp();
  openModal('modalAbsReminder');
}

async function _submitAbsReminder(tipe) {
  const jam = document.getElementById('absReminderJam')?.value || '';
  if (!jam) { toast('Isi jam absen dulu', 'error'); return; }
  try {
    const url = tipe === 'masuk' ? '/api/absensi/checkin' : '/api/absensi/checkout';
    const method = tipe === 'masuk' ? 'POST' : 'PUT';
    const r = await fetch(url, { method, headers: { ...authHeaders(), 'Content-Type': 'application/json' }, body: JSON.stringify({ jam }) });
    const d = await r.json();
    if (!r.ok) { toast(d.error || 'Gagal menyimpan absen', 'error'); return; }
    toast(tipe === 'masuk'
      ? (d.absensi.terlambat ? `Absen masuk tersimpan (terlambat ${d.absensi.menit_terlambat} menit)` : 'Absen masuk tersimpan')
      : 'Absen keluar tersimpan', tipe === 'masuk' && d.absensi.terlambat ? 'warning' : 'success');
    closeModal('modalAbsReminder');
    await renderAbsHariIni();
    await loadAbsRekap();
      await loadAbsTable(_absPage);
  } catch { toast('Gagal menyimpan absen', 'error'); }
}

// ── RINGKASAN BULANAN ────────────────────────────────────────────────────
async function loadAbsRekap() {
  const box = document.getElementById('absRekapBox');
  if (!box) return;
  const params = new URLSearchParams({ bulan: _absFilterBulan, tahun: _absFilterTahun });
  if (isAbsensiFull()) {
    if (_absFilterPegawai) params.set('user_id', _absFilterPegawai);
    if (_absFilterBidang) params.set('bidang_id', _absFilterBidang);
  } else {
    params.set('user_id', _user.id);
  }
  try {
    const r = await fetch(`/api/absensi/rekap?${params}`, { headers: authHeaders() });
    if (!r.ok) throw new Error(`HTTP ${r.status}: ${(await r.text().catch(() => '')).slice(0, 200)}`);
    const d = await r.json();
    const rk = d.rekap || { hadir: 0, terlambat: 0, tidak_lengkap: 0, tugas_luar: 0, cuti: 0, alpa: 0 };
    const iconHadir = `<svg xmlns="http://www.w3.org/2000/svg" width="17" height="17" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 12l2 2 4-4"/><circle cx="12" cy="12" r="10"/></svg>`;
    const iconClock = `<svg xmlns="http://www.w3.org/2000/svg" width="17" height="17" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>`;
    const iconTidakLengkap = `<svg xmlns="http://www.w3.org/2000/svg" width="17" height="17" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="8" height="4" x="8" y="2" rx="1" ry="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><path d="m15 11-6 6"/><path d="m9 11 6 6"/></svg>`;
    const iconTugas = `<svg xmlns="http://www.w3.org/2000/svg" width="17" height="17" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="20" height="14" x="2" y="7" rx="2" ry="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg>`;
    const iconCuti = `<svg xmlns="http://www.w3.org/2000/svg" width="17" height="17" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="18" x="3" y="4" rx="2"/><path d="M3 10h18"/><path d="M8 2v4"/><path d="M16 2v4"/></svg>`;
    const iconWarn = `<svg xmlns="http://www.w3.org/2000/svg" width="17" height="17" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3"/><line x1="12" x2="12" y1="9" y2="13"/><line x1="12" x2="12.01" y1="17" y2="17"/></svg>`;
    let html =
      _kpiCard({ icon: iconHadir, label: 'Tepat Waktu', value: rk.hadir, color: 'green' }) +
      _kpiCard({ icon: iconClock, label: 'Terlambat', value: rk.terlambat, color: 'amber' }) +
      _kpiCard({ icon: iconTidakLengkap, label: 'Tidak Lengkap', value: rk.tidak_lengkap || 0, color: 'purple' }) +
      _kpiCard({ icon: iconTugas, label: 'Tugas Luar', value: rk.tugas_luar, color: 'biruMuda' }) +
      _kpiCard({ icon: iconCuti, label: 'Cuti', value: rk.cuti, color: 'teal' }) +
      _kpiCard({ icon: iconWarn, label: 'Alpa', value: rk.alpa, color: 'red' });

    // Kartu ke-7: Jam Kerja Bulan Ini vs Target. Kalau admin lagi liat rekap
    // 1 pegawai spesifik (filter pegawai aktif) → tampil sama kayak view
    // personal. Kalau admin liat rekap gabungan (semua pegawai / per unit
    // kerja) → tampil versi rata-rata (lihat _absJamKerjaCard & backend).
    html += await _absJamKerjaCard();

    box.innerHTML = html;
  } catch (err) {
    console.error('[loadAbsRekap]', err);
    box.innerHTML = '';
  }
}

// ── KARTU KE-7: JAM KERJA BULAN INI vs TARGET (nempel di baris KPI di atas) ──
function _absFmtJam(menit) {
  const jam = Math.floor(Math.abs(menit || 0) / 60);
  const sisaMenit = Math.abs(menit || 0) % 60;
  return `${jam}j ${sisaMenit}m`;
}

// Skala Nilai Peringkat Kinerja (Permendagri No. 86/2017) — sama persis dgn
// skala di modul Kinerja (_kwCapaianColor, dashboard.js): 91-100 Sangat Tinggi,
// 76-90 Tinggi, 66-75 Sedang, 51-65 Rendah, ≤50 Sangat Rendah. Persentase yang
// dipakai TIDAK dibatasi ke 100 biar capaian di atas target tetap "Sangat Tinggi".
function _kinerjaSkalaWarna(pctAsli) {
  const c = Number(pctAsli) || 0;
  if (c >= 91) return { warna: '#16a34a', label: 'Sangat Tinggi' };
  if (c >= 76) return { warna: '#4ade80', label: 'Tinggi' };
  if (c >= 66) return { warna: '#eab308', label: 'Sedang' };
  if (c >= 51) return { warna: '#f97316', label: 'Rendah' };
  return { warna: '#ef4444', label: 'Sangat Rendah' };
}

async function _absJamKerjaCard() {
  const params = new URLSearchParams({ bulan: _absFilterBulan, tahun: _absFilterTahun });
  if (isAbsensiFull()) {
    if (_absFilterPegawai) params.set('user_id', _absFilterPegawai);
    if (_absFilterBidang) params.set('bidang_id', _absFilterBidang);
  }
  try {
    const r = await fetch(`/api/absensi/jam-kerja?${params}`, { headers: authHeaders() });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    const d = await r.json();
    const pctAsli = Math.max(0, d.persentase || 0);
    const pct = Math.min(100, pctAsli); // buat teks & lebar bar (bar mentok 100%)
    const iconJam = `<svg xmlns="http://www.w3.org/2000/svg" width="17" height="17" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="10" x2="14" y1="2" y2="2"/><line x1="12" x2="15" y1="14" y2="11"/><circle cx="12" cy="14" r="8"/></svg>`;
    // Teks disamain dgn _absensiJamKerjaPanel (dashboard.js) — cuma tampilan
    // kartunya tetap gaya asli absensi (_kpiCard + progress bar dot).
    const periodeLabel = d.bulan ? ABS_BULAN_NAMA[d.bulan] : `Tahun ${d.tahun}`;
    const label = d.agregat ? `Total Jam Kerja ${periodeLabel}` : `Jam Kerja ${periodeLabel}`;
    const sub = d.agregat
      ? `${pct}% dari target ${_absFmtJam(d.target_menit)} · ${d.hari_kerja_total} hari kerja · total dari ${d.jumlah_pegawai} pegawai`
      : `${pct}% dari target ${_absFmtJam(d.target_menit)} · ${d.hari_kerja_total} hari kerja ${d.bulan ? 'bulan ini' : 'tahun ini'}`;
    // Satu warna aja utk seluruh kartu (border, angka, ikon, progress bar) —
    // ngikutin Skala Nilai Peringkat Kinerja, sama kayak legend di modul Kinerja
    // (bukan lagi biner tercapai/gak tercapai spt sebelumnya).
    const { warna } = _kinerjaSkalaWarna(pctAsli);
    const kartu = `
      <div class="dash-kpi-card" style="border-left-color:${warna}">
        <div class="dash-kpi-body">
          <div class="dash-kpi-lbl">${esc(label)}</div>
          <div class="dash-kpi-val" style="color:${warna}">${esc(_absFmtJam(d.aktual_menit))}</div>
          <div class="dash-kpi-sub" style="font-weight:400">${esc(sub)}</div>
        </div>
        <div class="dash-kpi-icon" style="color:${warna}">${iconJam}</div>
      </div>`;
    // Progress bar capaian, warna ngikutin Skala Nilai Peringkat Kinerja —
    // ditempel visual di bawah kartu (tanpa ubah struktur internal _kpiCard).
    return `<div class="abs-jamkerja-wrap" style="--jk-warna:${warna}">
      ${kartu}
      <div class="abs-jamkerja-progress">
        <div class="abs-jamkerja-progress-track">
          <div class="abs-jamkerja-progress-fill" style="width:${pct}%;background:${warna}"></div>
        </div>
      </div>
    </div>`;
  } catch (err) {
    console.error('[_absJamKerjaCard]', err);
    return '';
  }
}

// ── TABEL RIWAYAT ─────────────────────────────────────────────────────────
async function loadAbsTable(page = 1) {
  _absPage = page;
  const tbody = document.getElementById('absTableBody');
  if (!tbody) return;
  const colCount = isAbsensiFull() ? 7 : 5;
  tbody.innerHTML = `<tr class="empty-row"><td colspan="${colCount}"><span class="btn-spin" style="width:11px;height:11px;vertical-align:-1px;margin-right:6px"></span>Memuat data...</td></tr>`;

  const params = new URLSearchParams({ bulan: _absFilterBulan, tahun: _absFilterTahun, page });
  if (isAbsensiFull()) {
    if (_absFilterPegawai) params.set('user_id', _absFilterPegawai);
    if (_absFilterBidang) params.set('bidang_id', _absFilterBidang);
  } else {
    params.set('user_id', _user.id);
  }

  try {
    const r = await fetch(`/api/absensi?${params}`, { headers: authHeaders() });
    if (!r.ok) throw new Error(`HTTP ${r.status}: ${(await r.text().catch(() => '')).slice(0, 200)}`);
    const d = await r.json();
    const rows = d.absensi || [];
    const total = d.total || 0;
    if (!rows.length) {
      tbody.innerHTML = `<tr class="empty-row"><td colspan="${colCount}">Belum ada data absensi bulan ini</td></tr>`;
      renderPagination('absTablePagination', total, page, _absPageSize, 'goAbsPage');
      return;
    }
    const startNo = (page - 1) * _absPageSize;
    tbody.innerHTML = rows.map((a, i) => {
      const tgl = new Date(a.tanggal);
      const tglLabel = `${String(tgl.getDate()).padStart(2, '0')} ${ABS_BULAN_NAMA[tgl.getMonth() + 1]} ${tgl.getFullYear()}`;
      const tglRowISO = `${tgl.getFullYear()}-${String(tgl.getMonth() + 1).padStart(2, '0')}-${String(tgl.getDate()).padStart(2, '0')}`;
      const isToday = tglRowISO === todayISO();
      const isPending = isToday && a.status === 'hadir' && a.jam_masuk && !a.jam_keluar;
      const isTidakLengkap = a.status === 'hadir' && (!a.jam_masuk || !a.jam_keluar) && !isToday;
      const isTerlambat = a.status === 'hadir' && a.terlambat;
      const statusKey = isPending ? 'pending' : isTidakLengkap ? 'tidak_lengkap' : isTerlambat ? 'terlambat' : a.status;
      const statusLabel = isPending ? 'Menunggu Absen Keluar' : isTidakLengkap ? 'Tidak Lengkap' : isTerlambat ? 'Terlambat' : STATUS_LABEL[a.status];
      const statusBadge = isPending ? 'badge-warning' : isTidakLengkap ? 'badge-ungu' : isTerlambat ? 'badge-warning' : STATUS_BADGE[a.status];
      const statusIcon = STATUS_ICON[statusKey] || '';
      const jamKeluarCell = a.jam_keluar
        ? `${a.jam_keluar.slice(0, 5)} WITA`
        : (isToday && a.status === 'hadir'
            ? `<span data-tip="Belum absen pulang" style="display:inline-flex;color:var(--kuning);cursor:default"><svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 22h14"/><path d="M5 2h14"/><path d="M17 22v-4.172a2 2 0 0 0-.586-1.414L12 12l-4.414 4.414A2 2 0 0 0 7 17.828V22"/><path d="M7 2v4.172a2 2 0 0 0 .586 1.414L12 12l4.414-4.414A2 2 0 0 0 17 6.172V2"/></svg></span>`
            : '—');
      const tipParts = [];
      if (isTerlambat) tipParts.push(`Telat ${a.menit_terlambat} menit`);
      if (isTidakLengkap) tipParts.push(!a.jam_masuk ? 'Absen masuk belum tercatat' : 'Absen pulang belum tercatat');
      if (isPending) tipParts.push('Absen pulang baru bisa dicatat mulai jam pulang');
      const statusTip = tipParts.length ? ` data-tip="${tipParts.join(' • ')}"` : '';
      return `
        <tr>
          <td>${startNo + i + 1}</td>
          ${isAbsensiFull() ? `<td>${esc(a.user_nama)}</td>` : ''}
          <td>${tglLabel}</td>
          <td>${a.jam_masuk ? a.jam_masuk.slice(0, 5) + ' WITA' : '—'}</td>
          <td>${jamKeluarCell}</td>
          <td><span class="badge ${statusBadge}"${statusTip}>${statusIcon}${statusLabel}</span></td>
          ${isAbsensiFull() ? `<td>
            <button class="btn btn-ghost btn-sm" data-tip="Edit" onclick="openAbsModal(${a.id})"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4Z"/></svg></button>
            <button class="btn-hapus" data-tip="Hapus" onclick="deleteAbs(${a.id})"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6m4-6v6"/><path d="M9 6V4h6v2"/></svg></button>
          </td>` : ''}
        </tr>`;
    }).join('');
    renderPagination('absTablePagination', total, page, _absPageSize, 'goAbsPage');
  } catch (err) {
    console.error('[loadAbsTable]', err);
    tbody.innerHTML = `<tr class="empty-row"><td colspan="${colCount}">Gagal memuat data</td></tr>`;
  }
}
window.goAbsPage = (p) => loadAbsTable(p);

// Opsi 'Alpa' bukan pilihan manual (hasil otomatis cron tiap hari kerja yg
// gak ada absen masuk/pulang) — cuma boleh nongol di dropdown kalau baris
// yg lagi diedit emang udah berstatus alpa, biar admin bisa lihat/ubah dari
// situ. Di luar itu (Tambah baru / edit status lain) opsi ini disingkirkan
// dari <select> supaya gak bisa dipilih manual.
function _absSyncAlpaOption(show) {
  const sel = document.getElementById('absStatus');
  if (!sel) return;
  let opt = sel.querySelector('option[value="alpa"]');
  if (show && !opt) {
    opt = document.createElement('option');
    opt.value = 'alpa';
    opt.textContent = 'Alpa';
    sel.appendChild(opt);
  } else if (!show && opt) {
    opt.remove();
  }
}

// Opsi 'Alpa' bukan pilihan manual (hasil otomatis cron tiap hari kerja yg
// gak ada absen masuk/pulang) — cuma boleh nongol di dropdown kalau baris
// yg lagi diedit emang udah berstatus alpa, biar admin bisa lihat/ubah dari
// situ. Di luar itu (Tambah baru / edit status lain) opsi ini disingkirkan
// dari <select> supaya gak bisa dipilih manual.
function _absSyncAlpaOption(show) {
  const sel = document.getElementById('absStatus');
  if (!sel) return;
  let opt = sel.querySelector('option[value="alpa"]');
  if (show && !opt) {
    opt = document.createElement('option');
    opt.value = 'alpa';
    opt.textContent = 'Alpa';
    sel.appendChild(opt);
  } else if (!show && opt) {
    opt.remove();
  }
}

let _absDukung = null; // { url, name } | { name, _loading: true } | null

// Tugas Luar/Cuti gak butuh jam masuk/keluar (gak ada absen fisik) — begitu
// status ini dipilih, field jam disembunyikan. Khusus pas Tambah baru (bukan
// edit satu baris yg udah ada), muncul juga field "Sampai Tanggal" + upload
// Data Dukung, karena rentang tsb bakal di-generate otomatis jadi satu baris
// absensi per hari (lihat saveAbs()) tanpa pegawai perlu absen tiap hari.
function onAbsStatusChange() {
  const status = document.getElementById('absStatus').value;
  const isCutiOrTugas = status === 'tugas_luar' || status === 'cuti';
  const isRentang = isCutiOrTugas && !_absEditingId;

  document.getElementById('absJamRow').style.display = status ? 'none' : '';
  document.getElementById('absDurasiRow').style.display = isRentang ? '' : 'none';
  // Data Dukung ditampilkan baik pas input rentang baru MAUPUN pas edit baris
  // tunggal yg statusnya Cuti/Tugas Luar (biar bisa lihat/ganti file yg sudah ada)
  document.getElementById('absDukungWrap').style.display = isCutiOrTugas ? '' : 'none';

  if (!isCutiOrTugas) {
    document.getElementById('absTanggalSelesai').value = '';
    const mTgl = document.getElementById('cdtp_absTanggalSelesai');
    if (mTgl?._cdtp) mTgl._cdtp.set(null);
    _resetAbsDukung();
  } else {
    _absUpdateSaveBtnState();
  }
}

// Tugas Luar/Cuti (input rentang baru) mewajibkan Data Dukung — tombol Simpan
// di-disable sampai file selesai keupload (bukan cuma dipilih; harus sampai
// _absDukung.url keisi, biar gak kekirim payload tanpa data_dukung_url).
// Saat edit, file lama gak wajib diisi ulang (biar gak kunci data lama yg
// dibuat sebelum aturan ini ada) — tapi tombol tetap dikunci selama upload
// file baru masih berjalan.
function _absUpdateSaveBtnState() {
  const btn = document.getElementById('btnSimpanAbs');
  if (!btn) return;
  const status = document.getElementById('absStatus').value;
  const isCutiOrTugas = status === 'tugas_luar' || status === 'cuti';
  const isRentang = isCutiOrTugas && !_absEditingId;
  const sedangUpload = !!_absDukung?._loading;
  const wajibTapiKosong = isRentang && !_absDukung?.url;
  btn.disabled = !!(sedangUpload || wajibTapiKosong);
}

function _resetAbsDukung() {
  _absDukung = null;
  const area = document.getElementById('absDukungUploadArea');
  const fi   = document.getElementById('absDukungFileInput');
  const pw   = document.getElementById('absDukungProgressWrap');
  if (area) { area.classList.remove('drag-over'); area.style.display = ''; }
  if (fi)   fi.value = '';
  if (pw)   pw.style.display = 'none';
  _renderAbsDukungPreview();
  _absUpdateSaveBtnState();
}

function _renderAbsDukungPreview() {
  const container = document.getElementById('absDukungFilePreview');
  if (!container) return;
  if (!_absDukung) { container.innerHTML = ''; return; }
  const f = _absDukung;
  const ext = (f.name || '').split('.').pop().toLowerCase();
  const iconColor = { pdf:'#ef4444', doc:'#3b82f6', docx:'#3b82f6', xls:'#22c55e', xlsx:'#22c55e', jpg:'#f59e0b', jpeg:'#f59e0b', png:'#f59e0b' }[ext] || '#64748b';
  const isImg = ['jpg','jpeg','png','gif','webp'].includes(ext);
  container.innerHTML = `
    <div class="multi-file-list" style="margin-top:10px">
      <div class="multi-file-card">
        ${isImg && f.url
          ? `<div class="mfc-thumb" style="background-image:url('${esc(f.url)}')"></div>`
          : `<div class="mfc-icon" style="background:${iconColor}"><span>${esc(ext.toUpperCase())}</span></div>`
        }
        <div class="mfc-info">
          <div class="mfc-name" data-tip="${esc(f.name)}">${f._loading ? '<em>Mengupload...</em>' : esc(f.name)}</div>
        </div>
        <div class="mfc-actions">
          ${f.url && !f._loading ? `<button type="button" class="btn btn-ghost btn-sm" data-tip="Preview" onclick="viewDoc(decodeURIComponent('${encodeURIComponent(f.url)}'), decodeURIComponent('${encodeURIComponent(f.name || '')}'))">
            <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path stroke-linecap="round" stroke-linejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg>
          </button>` : ''}
          ${!f._loading ? `<button type="button" class="btn btn-ghost btn-sm" data-tip="Hapus" onclick="_resetAbsDukung()">
            <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>
          </button>` : ''}
        </div>
      </div>
    </div>`;
  // Sembunyikan drop-area begitu ada 1 file (data dukung absensi cuma 1 file)
  const area = document.getElementById('absDukungUploadArea');
  if (area) area.style.display = f._loading || f.url ? 'none' : '';
}

function handleAbsDukungFileSelect(e) {
  const file = e.target.files?.[0];
  if (file) _processAbsDukungFile(file);
  e.target.value = '';
}
function handleAbsDukungDragOver(e) { e.preventDefault(); document.getElementById('absDukungUploadArea')?.classList.add('drag-over'); }
function handleAbsDukungDragLeave(e) { document.getElementById('absDukungUploadArea')?.classList.remove('drag-over'); }
function handleAbsDukungDrop(e) {
  e.preventDefault();
  document.getElementById('absDukungUploadArea')?.classList.remove('drag-over');
  const file = e.dataTransfer?.files?.[0];
  if (file) _processAbsDukungFile(file);
}

// Upload via XHR (bukan fetch) supaya dapat progress asli dari browser —
// pola sama persis kayak _uploadFileWithProgress di kinerja.js. JANGAN pakai
// authHeaders() penuh (nyelipin Content-Type: application/json yg nabrak
// boundary multipart) — ambil cuma header Authorization-nya.
function _absUploadFileWithProgress(file, onProgress) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    const fd  = new FormData();
    fd.append('file', file);
    fd.append('kategori', 'absensi');
    xhr.open('POST', '/api/upload');
    const auth = authHeaders()['Authorization'];
    if (auth) xhr.setRequestHeader('Authorization', auth);
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable && onProgress) onProgress(Math.round((e.loaded / e.total) * 100));
    };
    xhr.onload = () => {
      let data = {};
      try { data = JSON.parse(xhr.responseText); } catch {}
      if (xhr.status >= 200 && xhr.status < 300) resolve(data);
      else reject(new Error(data.error || 'Gagal upload'));
    };
    xhr.onerror = () => reject(new Error('Gagal upload (koneksi bermasalah)'));
    xhr.send(fd);
  });
}

async function _processAbsDukungFile(file) {
  if (file.size > 2 * 1024 * 1024) { toast(`${file.name}: terlalu besar (maks. 2 MB)`, 'error'); return; }

  _absDukung = { url: null, name: file.name, _loading: true };
  _renderAbsDukungPreview();
  _absUpdateSaveBtnState();

  const pw = document.getElementById('absDukungProgressWrap');
  const pb = document.getElementById('absDukungProgressBar');
  if (pw) pw.style.display = '';
  if (pb) pb.style.width = '0%';

  try {
    const d = await _absUploadFileWithProgress(file, (pct) => { if (pb) pb.style.width = pct + '%'; });
    if (pb) { pb.style.width = '100%'; setTimeout(() => { if (pw) pw.style.display = 'none'; }, 600); }
    _absDukung = { url: d.url, name: d.name || file.name };
    _renderAbsDukungPreview();
    _absUpdateSaveBtnState();
    toast(`${file.name} berhasil diupload`);
  } catch (err) {
    toast(err.message || 'Gagal upload data dukung', 'error');
    _resetAbsDukung();
  }
}

// ── MODAL INPUT / EDIT (admin/full) ─────────────────────────────────────
async function openAbsModal(id = null) {
  _absEditingId = id;
  document.getElementById('modalAbsTitle').textContent = id ? 'Edit Absensi' : 'Tambah Absensi';
  document.getElementById('absPegawaiWrap').style.display = id ? 'none' : '';
  document.getElementById('absTanggal').disabled = !!id;

  if (!document.getElementById('absPegawai').dataset.filled) {
    try {
      const r = await fetch('/api/users', { headers: authHeaders() });
      const d = await r.json();
      document.getElementById('absPegawai').innerHTML = '<option value="">— Pilih Pegawai —</option>' +
        (d.users || []).filter(u => !u.is_admin).map(u => `<option value="${u.id}">${esc(u.nama)}</option>`).join('');
      document.getElementById('absPegawai').dataset.filled = '1';
    } catch { /* noop */ }
  }

  let row = null;
  if (id) {
    // ambil dari baris tabel yg sudah dimuat (hindari endpoint detail tambahan)
    const params = new URLSearchParams({ bulan: _absFilterBulan, tahun: _absFilterTahun });
    if (_absFilterPegawai) params.set('user_id', _absFilterPegawai);
    const r = await fetch(`/api/absensi?${params}`, { headers: authHeaders() });
    const d = await r.json();
    row = (d.absensi || []).find(x => x.id === id);
    if (!row) { toast('Data tidak ditemukan', 'error'); return; }
    document.getElementById('absId').value = row.id;
    document.getElementById('absTanggal').value = row.tanggal.slice(0, 10);
    document.getElementById('absJamMasuk').value = row.jam_masuk ? row.jam_masuk.slice(0, 5) : '';
    document.getElementById('absJamKeluar').value = row.jam_keluar ? row.jam_keluar.slice(0, 5) : '';
    // 'hadir' udah gak punya opsi manual di dropdown (otomatis dari jam_masuk) —
    // map ke '' biar csel nampilin placeholder "Otomatis (Hadir/Terlambat)"
    _absSyncAlpaOption(row.status === 'alpa');
    document.getElementById('absStatus').value = row.status === 'hadir' ? '' : row.status;
    document.getElementById('absKeterangan').value = row.keterangan || '';
    document.getElementById('absTanggalSelesai').value = '';
  } else {
    document.getElementById('absId').value = '';
    document.getElementById('absPegawai').value = '';
    document.getElementById('absTanggal').value = todayISO();
    document.getElementById('absJamMasuk').value = '';
    document.getElementById('absJamKeluar').value = '';
    _absSyncAlpaOption(false);
    document.getElementById('absStatus').value = '';
    document.getElementById('absKeterangan').value = '';
    document.getElementById('absTanggalSelesai').value = '';
  }
  _resetAbsDukung();
  if (row?.data_dukung_url) {
    _absDukung = { url: row.data_dukung_url, name: row.data_dukung_nama || 'Data Dukung' };
    _renderAbsDukungPreview();
  }
  syncCustomSelect?.('absPegawai');
  syncCustomSelect?.('absStatus');
  onAbsStatusChange();
  openModal('modalAbs');

  // Init CDTP/CTP (sekali) lalu sync nilai & status enable/disable
  setTimeout(() => {
    if (typeof initCdtp === 'function') initCdtp();
    if (typeof initCtp  === 'function') initCtp();

    const mTgl = document.getElementById('cdtp_absTanggal');
    if (mTgl?._cdtp) {
      mTgl._cdtp.set(document.getElementById('absTanggal').value || null);
      if (id) mTgl._cdtp.disable(); else mTgl._cdtp.enable();
    }
    document.getElementById('cdtp_absTanggalSelesai')?._cdtp?.set(null);
    document.getElementById('ctp_absJamMasuk')?._ctp?.set(document.getElementById('absJamMasuk').value || null);
    document.getElementById('ctp_absJamKeluar')?._ctp?.set(document.getElementById('absJamKeluar').value || null);
  }, 30);
}

async function saveAbs() {
  document.getElementById('cdtp_absTanggal')?._cdtp?.commit();
  document.getElementById('ctp_absJamMasuk')?._ctp?.commit();
  document.getElementById('ctp_absJamKeluar')?._ctp?.commit();
  document.getElementById('cdtp_absTanggalSelesai')?._cdtp?.commit();
  const id = document.getElementById('absId').value;
  const status = document.getElementById('absStatus').value;
  const isRentang = document.getElementById('absDurasiRow').style.display !== 'none';
  const payload = {
    user_id: document.getElementById('absPegawai').value || undefined,
    tanggal: document.getElementById('absTanggal').value,
    jam_masuk: document.getElementById('absJamMasuk').value || null,
    jam_keluar: document.getElementById('absJamKeluar').value || null,
    status,
    keterangan: document.getElementById('absKeterangan').value || null,
  };
  if (!id && !payload.user_id) { toast('Pilih pegawai terlebih dahulu', 'error'); return; }
  if (!payload.tanggal) { toast('Tanggal wajib diisi', 'error'); return; }
  if (isRentang) {
    const tglSelesai = document.getElementById('absTanggalSelesai').value;
    if (!tglSelesai) { toast('Sampai Tanggal wajib diisi', 'error'); return; }
    if (tglSelesai < payload.tanggal) { toast('Sampai Tanggal tidak boleh sebelum Tanggal mulai', 'error'); return; }
    payload.tanggal_selesai = tglSelesai;
    if (_absDukung?.url) {
      payload.data_dukung_url = _absDukung.url;
      payload.data_dukung_nama = _absDukung.name;
    }
  } else if (id && (status === 'tugas_luar' || status === 'cuti')) {
    // Edit baris tunggal yg statusnya Cuti/Tugas Luar — ikut kirim data dukung
    // (baik ganti file baru maupun tetap pakai yg lama), atau clear kalau dihapus.
    if (_absDukung?.url) {
      payload.data_dukung_url = _absDukung.url;
      payload.data_dukung_nama = _absDukung.name;
    } else {
      payload.clear_data_dukung = true;
    }
  }

  try {
    const url = id ? `/api/absensi/${id}` : '/api/absensi';
    const r = await fetch(url, {
      method: id ? 'PUT' : 'POST',
      headers: { ...authHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const d = await r.json();
    if (!r.ok) { toast(d.error || 'Gagal menyimpan absensi', 'error'); return; }
    toast('Absensi berhasil disimpan', 'success');
    closeModal('modalAbs');
    await loadAbsRekap();
    await loadAbsTable(_absPage);
  } catch { toast('Gagal menyimpan absensi', 'error'); }
}

async function deleteAbs(id) {
  const ok = await showConfirm({
    title: 'Hapus Absensi', msg: 'Data absensi ini akan dihapus permanen.',
    okText: 'Ya, Hapus', icon: 'trash', type: 'danger',
  });
  if (!ok) return;
  await fetch(`/api/absensi/${id}`, { method: 'DELETE', headers: authHeaders() });
  toast('Absensi berhasil dihapus', 'success');
  await loadAbsRekap();
  await loadAbsTable(_absPage);
}

// ── PENGATURAN JAM KERJA (modal, admin/full) ─────────────────────────────
const ABS_SET_FIELD_IDS = [
  'absSetMasukAwalSK', 'absSetMasukAwalJumat',
  'absSetMasukSK', 'absSetMasukJumat',
  'absSetMasukAkhirSK', 'absSetMasukAkhirJumat',
  'absSetPulangSK', 'absSetPulangJumat',
  'absSetPulangAkhirSK', 'absSetPulangAkhirJumat',
];

async function openAbsSettingsModal() {
  await loadAbsSettings();
  if (_absSettings) {
    document.getElementById('absSetMasukAwalSK').value = _absSettings.jam_masuk_awal_senin_kamis.slice(0, 5);
    document.getElementById('absSetMasukAwalJumat').value = _absSettings.jam_masuk_awal_jumat.slice(0, 5);
    document.getElementById('absSetMasukSK').value = _absSettings.jam_masuk_senin_kamis.slice(0, 5);
    document.getElementById('absSetMasukJumat').value = _absSettings.jam_masuk_jumat.slice(0, 5);
    document.getElementById('absSetMasukAkhirSK').value = _absSettings.jam_masuk_akhir_senin_kamis?.slice(0, 5) || '';
    document.getElementById('absSetMasukAkhirJumat').value = _absSettings.jam_masuk_akhir_jumat?.slice(0, 5) || '';
    document.getElementById('absSetPulangSK').value = _absSettings.jam_pulang_senin_kamis.slice(0, 5);
    document.getElementById('absSetPulangJumat').value = _absSettings.jam_pulang_jumat.slice(0, 5);
    document.getElementById('absSetPulangAkhirSK').value = _absSettings.jam_pulang_akhir_senin_kamis?.slice(0, 5) || '';
    document.getElementById('absSetPulangAkhirJumat').value = _absSettings.jam_pulang_akhir_jumat?.slice(0, 5) || '';
    document.getElementById('absSetToleransi').value = _absSettings.toleransi_menit;
  }
  openModal('modalAbsSettings');

  setTimeout(() => {
    if (typeof initCtp === 'function') initCtp();
    ABS_SET_FIELD_IDS.forEach(id => {
      document.getElementById('ctp_' + id)?._ctp?.set(document.getElementById(id).value || null);
    });
  }, 30);
}

async function saveAbsSettings() {
  ABS_SET_FIELD_IDS.forEach(id => {
    document.getElementById('ctp_' + id)?._ctp?.commit();
  });
  const payload = {
    jam_masuk_awal_senin_kamis: document.getElementById('absSetMasukAwalSK').value,
    jam_masuk_awal_jumat: document.getElementById('absSetMasukAwalJumat').value,
    jam_masuk_senin_kamis: document.getElementById('absSetMasukSK').value,
    jam_masuk_jumat: document.getElementById('absSetMasukJumat').value,
    jam_masuk_akhir_senin_kamis: document.getElementById('absSetMasukAkhirSK').value,
    jam_masuk_akhir_jumat: document.getElementById('absSetMasukAkhirJumat').value,
    jam_pulang_senin_kamis: document.getElementById('absSetPulangSK').value,
    jam_pulang_jumat: document.getElementById('absSetPulangJumat').value,
    jam_pulang_akhir_senin_kamis: document.getElementById('absSetPulangAkhirSK').value,
    jam_pulang_akhir_jumat: document.getElementById('absSetPulangAkhirJumat').value,
    toleransi_menit: parseInt(document.getElementById('absSetToleransi').value) || 0,
  };
  try {
    const r = await fetch('/api/absensi/settings', {
      method: 'PUT', headers: { ...authHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const d = await r.json();
    if (!r.ok) { toast(d.error || 'Gagal menyimpan pengaturan', 'error'); return; }
    _absSettings = d.settings;
    toast('Pengaturan jam kerja berhasil disimpan', 'success');
    closeModal('modalAbsSettings');
    if (document.getElementById('absPengaturanJamKerjaRingkasan')) loadAbsPengaturan();
  } catch { toast('Gagal menyimpan pengaturan', 'error'); }
}

// ── HARI LIBUR (modal, admin/full) ───────────────────────────────────────
let _absLiburAll   = [];   // seluruh data hari libur tahun berjalan (hasil fetch)
let _absLiburPage  = 1;
const _absLiburLimit = 5;
let _absLiburFilterTahun = new Date().getFullYear();

const ABS_LIBUR_BULAN_LABEL = {
  '01': 'Januari', '02': 'Februari', '03': 'Maret',    '04': 'April',
  '05': 'Mei',     '06': 'Juni',     '07': 'Juli',      '08': 'Agustus',
  '09': 'September', '10': 'Oktober', '11': 'November', '12': 'Desember',
};

// Server balikin `tanggal` sbg timestamp yg sudah di-convert ke UTC (kolom DATE
// di-parse jadi Date object lalu di-JSON-stringify) — potong string mentah
// (slice) bisa salah baca bulan/tanggal krn hasil convert-nya bisa mundur 1 hari
// dari tanggal aslinya. Selalu re-parse via `new Date()` lalu ambil komponen
// LOKAL (bukan UTC) biar konsisten sama tampilan tabel yg pakai toLocaleDateString.
function _absLiburLocalYMD(tanggal) {
  const d = new Date(tanggal);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

// ── Dropdown custom (csel) ringan buat filter Hari Libur ──────────────────
// Pola sama kayak _buildLapParentCsel di app.js, versi sederhana (1 level,
// tanpa cascade) supaya tampilannya konsisten, bukan <select> bawaan browser.
function _buildAbsLiburCsel(wrapId, hiddenId, opts, selectedVal, onChange) {
  const wrap = document.getElementById(wrapId);
  if (!wrap) return;

  // Bersihkan instance sebelumnya (fungsi ini dipanggil ulang tiap modal dibuka)
  if (wrap._cselPanel) { wrap._cselPanel.remove(); wrap._cselPanel = null; }
  if (wrap._cselOutside) document.removeEventListener('click', wrap._cselOutside);
  if (wrap._cselScroll)  window.removeEventListener('scroll', wrap._cselScroll, true);
  if (wrap._cselResize)  window.removeEventListener('resize', wrap._cselScroll, true);
  wrap.innerHTML = '';

  const hidden = document.createElement('input');
  hidden.type  = 'hidden';
  hidden.id    = hiddenId;
  hidden.value = selectedVal != null ? String(selectedVal) : '';
  wrap.appendChild(hidden);

  const selectedOpt = opts.find(o => o.value === hidden.value) || opts[0];

  const trigger = document.createElement('button');
  trigger.type      = 'button';
  trigger.className = 'csel-trigger';
  trigger.innerHTML = `
    <span class="csel-trigger-text">${esc(selectedOpt ? selectedOpt.label : '')}</span>
    <svg class="csel-chevron" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7"/></svg>
  `;
  wrap.appendChild(trigger);

  const panel = document.createElement('div');
  panel.className = 'csel-panel csel-panel-fixed';
  panel.style.display = 'none';

  function selectValue(val, label) {
    hidden.value = val;
    trigger.querySelector('.csel-trigger-text').textContent = label;
    panel.querySelectorAll('.csel-option').forEach(o => o.classList.toggle('selected', o.dataset.value === val));
    closePanel();
    onChange(val);
  }

  opts.forEach(opt => {
    const div = document.createElement('div');
    const isSelected = opt.value === hidden.value;
    div.className = 'csel-option' + (isSelected ? ' selected' : '');
    div.dataset.value = opt.value;
    div.innerHTML = `<span class="csel-option-check"><svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="3"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"/></svg></span><span>${esc(opt.label)}</span>`;
    div.onclick = () => selectValue(opt.value, opt.label);
    panel.appendChild(div);
  });

  function positionPanel() {
    const r = trigger.getBoundingClientRect();
    panel.style.width = Math.max(r.width, 130) + 'px';
    const pr = panel.getBoundingClientRect();
    let top = r.bottom + 5;
    if (top + pr.height > window.innerHeight - 8) top = Math.max(8, r.top - pr.height - 5);
    const left = Math.max(6, Math.min(r.left, window.innerWidth - pr.width - 6));
    panel.style.top  = top + 'px';
    panel.style.left = left + 'px';
  }

  function openPanel() {
    document.querySelectorAll('.csel-panel').forEach(p => {
      if (p !== panel) {
        p.style.display = 'none';
        (p._cselTrigger || p.parentElement?.querySelector('.csel-trigger'))?.classList.remove('open');
      }
    });
    document.body.appendChild(panel);
    wrap._cselPanel = panel;
    panel.style.visibility = 'hidden';
    panel.style.display = 'block';
    positionPanel();
    panel.style.visibility = 'visible';
    trigger.classList.add('open');
  }

  function closePanel() {
    panel.style.display = 'none';
    trigger.classList.remove('open');
    if (panel.parentElement === document.body) wrap.appendChild(panel);
    wrap._cselPanel = null;
  }

  trigger.onclick = (e) => {
    e.stopPropagation();
    panel.style.display !== 'none' ? closePanel() : openPanel();
  };
  panel.addEventListener('click', e => e.stopPropagation());

  const outsideHandler = (e) => {
    if (panel.style.display === 'none') return;
    if (!panel.contains(e.target) && !trigger.contains(e.target)) closePanel();
  };
  const scrollHandler = (e) => {
    if (panel.style.display === 'none') return;
    if (panel.contains(e.target)) return;
    closePanel();
  };
  document.addEventListener('click', outsideHandler);
  window.addEventListener('scroll', scrollHandler, true);
  window.addEventListener('resize', scrollHandler, true);
  wrap._cselOutside = outsideHandler;
  wrap._cselScroll  = scrollHandler;
}

function populateAbsLiburTahunFilter() {
  const y = new Date().getFullYear();
  const tahunOpts = [];
  for (let i = y + 1; i >= y - 3; i--) tahunOpts.push({ value: String(i), label: String(i) });

  _buildAbsLiburCsel('absLiburTahunWrap', 'absLiburFilterTahun', tahunOpts, _absLiburFilterTahun, (val) => {
    _absLiburFilterTahun = parseInt(val) || new Date().getFullYear();
    loadAbsLiburList();
  });
}

// Dropdown bulan menyesuaikan data yg ADA di tahun terpilih (bukan 12 bulan statis):
// - gak ada data sama sekali → cuma opsi "Semua Bulan"
// - data cuma di 1 bulan     → langsung ke-select bulan itu (gak perlu opsi "Semua Bulan")
// - data di >1 bulan         → opsi "Semua Bulan" + bulan-bulan yg ada data, default "Semua Bulan"
function rebuildAbsLiburBulanFilter() {
  const bulanPresent = [...new Set(_absLiburAll.map(l => _absLiburLocalYMD(l.tanggal).slice(5, 7)))].sort();

  let opts, defaultVal;
  if (bulanPresent.length <= 1) {
    opts = bulanPresent.length
      ? [{ value: bulanPresent[0], label: ABS_LIBUR_BULAN_LABEL[bulanPresent[0]] }]
      : [{ value: '', label: 'Semua Bulan' }];
    defaultVal = opts[0].value;
  } else {
    opts = [{ value: '', label: 'Semua Bulan' }, ...bulanPresent.map(m => ({ value: m, label: ABS_LIBUR_BULAN_LABEL[m] }))];
    defaultVal = '';
  }

  _buildAbsLiburCsel('absLiburBulanWrap', 'absLiburFilterBulan', opts, defaultVal, () => {
    filterAbsLiburList();
  });
}

async function openAbsLiburModal() {
  _absLiburFilterTahun = _absFilterTahun || new Date().getFullYear();
  populateAbsLiburTahunFilter();
  await loadAbsLiburList();
  cancelEditAbsLibur();
  openModal('modalAbsLibur');

  setTimeout(() => {
    if (typeof initCdtp === 'function') initCdtp();
    document.getElementById('cdtp_absLiburTanggal')?._cdtp?.clear();
  }, 30);
}

async function loadAbsLiburList() {
  const box = document.getElementById('absLiburList');
  try {
    const r = await fetch(`/api/absensi/libur?tahun=${_absLiburFilterTahun}`, { headers: authHeaders() });
    const d = await r.json();
    _absLiburAll = d.libur || [];
    _absLiburBulanIni = new Set(_absLiburAll.map(l => _absLiburLocalYMD(l.tanggal)));
    _absLiburPage = 1;
    rebuildAbsLiburBulanFilter();
    renderAbsLiburList();
  } catch { box.innerHTML = ''; _absLiburAll = []; rebuildAbsLiburBulanFilter(); renderAbsLiburList(); }
}

function filterAbsLiburList() {
  _absLiburPage = 1;
  renderAbsLiburList();
}

function renderAbsLiburList(page = _absLiburPage) {
  _absLiburPage = page;
  const box   = document.getElementById('absLiburList');
  const bulan = document.getElementById('absLiburFilterBulan')?.value || '';

  const filtered = bulan
    ? _absLiburAll.filter(l => _absLiburLocalYMD(l.tanggal).slice(5, 7) === bulan)
    : _absLiburAll;

  const start = (_absLiburPage - 1) * _absLiburLimit;
  const pageItems = filtered.slice(start, start + _absLiburLimit);

  box.innerHTML = pageItems.length
    ? pageItems.map(l => `
      <tr>
        <td style="font-weight:600;white-space:nowrap">${new Date(l.tanggal).toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' })}</td>
        <td style="color:var(--teks-muted)">${esc(l.keterangan)}</td>
        <td style="text-align:right">
          <div style="display:flex;gap:6px;justify-content:flex-end">
            <button class="btn-edit" data-tip="Edit" onclick="editAbsLibur(${l.id})"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg></button>
            <button class="btn-hapus" data-tip="Hapus" onclick="deleteAbsLibur(${l.id})"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6m4-6v6"/><path d="M9 6V4h6v2"/></svg></button>
          </div>
        </td>
      </tr>`).join('')
    : '<tr class="empty-row"><td colspan="3">Belum ada hari libur tercatat' + (bulan ? ' untuk bulan ini' : ` untuk tahun ${_absLiburFilterTahun}`) + '</td></tr>';

  renderPagination('absLiburPagination', filtered.length, _absLiburPage, _absLiburLimit, (p) => renderAbsLiburList(p));
}

function editAbsLibur(id) {
  const item = _absLiburAll.find(l => l.id === id);
  if (!item) return;
  document.getElementById('absLiburEditId').value = id;
  const ymd = _absLiburLocalYMD(item.tanggal);
  document.getElementById('absLiburTanggal').value = ymd;
  document.getElementById('absLiburKeterangan').value = item.keterangan;
  document.getElementById('cdtp_absLiburTanggal')?._cdtp?.set(ymd);
  document.getElementById('absLiburSaveLabel').textContent = 'Simpan Perubahan';
  document.getElementById('btnCancelEditAbsLibur').style.display = '';
  document.getElementById('absLiburKeterangan').focus();
  document.getElementById('modalAbsLibur').querySelector('.modal-body')?.scrollTo({ top: 0, behavior: 'smooth' });
}

function cancelEditAbsLibur() {
  document.getElementById('absLiburEditId').value = '';
  document.getElementById('absLiburTanggal').value = '';
  document.getElementById('absLiburKeterangan').value = '';
  document.getElementById('cdtp_absLiburTanggal')?._cdtp?.clear();
  document.getElementById('absLiburSaveLabel').textContent = 'Tambah Hari Libur';
  document.getElementById('btnCancelEditAbsLibur').style.display = 'none';
}

async function saveAbsLibur() {
  document.getElementById('cdtp_absLiburTanggal')?._cdtp?.commit();
  const id = document.getElementById('absLiburEditId').value;
  const tanggal = document.getElementById('absLiburTanggal').value;
  const keterangan = document.getElementById('absLiburKeterangan').value.trim();
  if (!tanggal || !keterangan) { toast('Tanggal dan keterangan wajib diisi', 'error'); return; }
  try {
    const r = await fetch(id ? `/api/absensi/libur/${id}` : '/api/absensi/libur', {
      method: id ? 'PUT' : 'POST',
      headers: { ...authHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ tanggal, keterangan }),
    });
    const d = await r.json();
    if (!r.ok) { toast(d.error || (id ? 'Gagal menyimpan perubahan' : 'Gagal menambah hari libur'), 'error'); return; }
    toast(id ? 'Hari libur berhasil diperbarui' : 'Hari libur berhasil ditambahkan', 'success');
    cancelEditAbsLibur();
    await loadAbsLiburList();
  } catch { toast(id ? 'Gagal menyimpan perubahan' : 'Gagal menambah hari libur', 'error'); }
}

async function deleteAbsLibur(id) {
  const ok = await showConfirm({
    title: 'Hapus Hari Libur', msg: 'Tanggal ini tidak lagi ditandai sebagai hari libur.',
    okText: 'Ya, Hapus', icon: 'trash', type: 'danger',
  });
  if (!ok) return;
  await fetch(`/api/absensi/libur/${id}`, { method: 'DELETE', headers: authHeaders() });
  toast('Hari libur berhasil dihapus', 'success');
  await loadAbsLiburList();
}
// ═══════════════════════════════════════════════════════════════════════
// PENGAJUAN TUGAS LUAR/CUTI — self-service (semua pegawai, butuh approval)
// ═══════════════════════════════════════════════════════════════════════
const PENG_STATUS_LABEL = { pending: 'Menunggu Persetujuan', disetujui: 'Disetujui', ditolak: 'Ditolak' };
const PENG_STATUS_BADGE = { pending: 'badge-yellow', disetujui: 'badge-hijau', ditolak: 'badge-merah' };
const PENG_STATUS_ICON = {
  pending: '<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3.5 2"/></svg>',
  disetujui: '<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6L9 17l-5-5"/></svg>',
  ditolak: '<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6L6 18M6 6l12 12"/></svg>',
};

let _pengDukung = null; // { url, name } | { name, _loading: true } | null

function openPengajuanModal() {
  document.getElementById('pengStatus').value = 'tugas_luar';
  document.getElementById('pengTanggal').value = '';
  document.getElementById('pengTanggalSelesai').value = '';
  document.getElementById('pengKeterangan').value = '';
  _resetPengDukung(); // ikut nge-disable tombol Ajukan krn data dukung wajib diisi
  syncCustomSelect?.('pengStatus');
  openModal('modalPengajuanAbsen');

  // Init CDTP (sekali, elemennya baru ada di DOM setelah modal ini pernah dibuka)
  // lalu reset nilainya — pola sama persis kayak openAbsModal().
  setTimeout(() => {
    if (typeof initCdtp === 'function') initCdtp();
    document.getElementById('cdtp_pengTanggal')?._cdtp?.set(null);
    document.getElementById('cdtp_pengTanggalSelesai')?._cdtp?.set(null);
    _bindPengTanggalCekListeners();
  }, 30);
}

// ── Cek bentrok absensi di sisi user, sebelum pengajuan dikirim ────────────
// GET /api/absensi?dari=&sampai= otomatis kefilter ke absensi milik sendiri
// kalau bukan admin/full (lihat backend). Dipanggil tiap tanggal berubah,
// biar user langsung tau kalau tanggalnya udah ada absensinya — gak perlu
// isi form dulu baru ketahuan pas submit.
async function _pengCekBentrokAbsensi(tanggal, tanggal_selesai) {
  try {
    const params = new URLSearchParams({ dari: tanggal, sampai: tanggal_selesai });
    const r = await fetch(`/api/absensi?${params}`, { headers: authHeaders() });
    if (!r.ok) return null; // gagal cek (mis. network) — jangan blokir user, backend tetap validasi ulang
    const d = await r.json();
    return d.absensi || [];
  } catch {
    return null;
  }
}

let _pengTanggalCekBusy = false;
async function _pengOnTanggalChange() {
  const tanggal = document.getElementById('pengTanggal')?.value;
  const tanggal_selesai = document.getElementById('pengTanggalSelesai')?.value;
  if (!tanggal || !tanggal_selesai || tanggal_selesai < tanggal) return;
  if (_pengTanggalCekBusy) return;
  _pengTanggalCekBusy = true;
  const rows = await _pengCekBentrokAbsensi(tanggal, tanggal_selesai);
  _pengTanggalCekBusy = false;
  if (rows && rows.length) {
    const daftar = rows.map(a => fmtTglSingkat(a.tanggal)).join(', ');
    toast(`Sudah ada absensi pada tanggal: ${daftar}. Tidak bisa mengajukan tugas luar/cuti di tanggal itu.`, 'error');
    document.getElementById('cdtp_pengTanggal')?._cdtp?.clear();
    document.getElementById('cdtp_pengTanggalSelesai')?._cdtp?.clear();
  }
}

let _pengTanggalListenersBound = false;
function _bindPengTanggalCekListeners() {
  if (_pengTanggalListenersBound) return;
  document.getElementById('pengTanggal')?.addEventListener('change', _pengOnTanggalChange);
  document.getElementById('pengTanggalSelesai')?.addEventListener('change', _pengOnTanggalChange);
  _pengTanggalListenersBound = true;
}

// Tombol "Ajukan" cuma aktif kalau data dukung udah keupload sukses (ada url)
// dan gak lagi dalam proses upload — cuti/tugas luar wajib ada bukti.
function _updatePengAjukanBtnState() {
  const btn = document.getElementById('btnSimpanPengajuan');
  if (!btn) return;
  btn.disabled = !_pengDukung?.url || !!_pengDukung?._loading;
}

function _resetPengDukung() {
  _pengDukung = null;
  const area = document.getElementById('pengDukungUploadArea');
  const fi   = document.getElementById('pengDukungFileInput');
  const pw   = document.getElementById('pengDukungProgressWrap');
  if (area) { area.classList.remove('drag-over'); area.style.display = ''; }
  if (fi)   fi.value = '';
  if (pw)   pw.style.display = 'none';
  _renderPengDukungPreview();
  _updatePengAjukanBtnState();
}

function _renderPengDukungPreview() {
  const container = document.getElementById('pengDukungFilePreview');
  if (!container) return;
  if (!_pengDukung) { container.innerHTML = ''; return; }
  const f = _pengDukung;
  const ext = (f.name || '').split('.').pop().toLowerCase();
  const iconColor = { pdf:'#ef4444', doc:'#3b82f6', docx:'#3b82f6', xls:'#22c55e', xlsx:'#22c55e', jpg:'#f59e0b', jpeg:'#f59e0b', png:'#f59e0b' }[ext] || '#64748b';
  const isImg = ['jpg','jpeg','png','gif','webp'].includes(ext);
  container.innerHTML = `
    <div class="multi-file-list" style="margin-top:10px">
      <div class="multi-file-card">
        ${isImg && f.url
          ? `<div class="mfc-thumb" style="background-image:url('${esc(f.url)}')"></div>`
          : `<div class="mfc-icon" style="background:${iconColor}"><span>${esc(ext.toUpperCase())}</span></div>`
        }
        <div class="mfc-info">
          <div class="mfc-name" data-tip="${esc(f.name)}">${f._loading ? '<em>Mengupload...</em>' : esc(f.name)}</div>
        </div>
        <div class="mfc-actions">
          ${f.url && !f._loading ? `<button type="button" class="btn btn-ghost btn-sm" data-tip="Preview" onclick="viewDoc(decodeURIComponent('${encodeURIComponent(f.url)}'), decodeURIComponent('${encodeURIComponent(f.name || '')}'))">
            <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path stroke-linecap="round" stroke-linejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg>
          </button>` : ''}
          ${!f._loading ? `<button type="button" class="btn btn-ghost btn-sm" data-tip="Hapus" onclick="_resetPengDukung()">
            <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>
          </button>` : ''}
        </div>
      </div>
    </div>`;
  const area = document.getElementById('pengDukungUploadArea');
  if (area) area.style.display = f._loading || f.url ? 'none' : '';
}

function handlePengDukungFileSelect(e) {
  const file = e.target.files?.[0];
  if (file) _processPengDukungFile(file);
  e.target.value = '';
}
function handlePengDukungDragOver(e) { e.preventDefault(); document.getElementById('pengDukungUploadArea')?.classList.add('drag-over'); }
function handlePengDukungDragLeave(e) { document.getElementById('pengDukungUploadArea')?.classList.remove('drag-over'); }
function handlePengDukungDrop(e) {
  e.preventDefault();
  document.getElementById('pengDukungUploadArea')?.classList.remove('drag-over');
  const file = e.dataTransfer?.files?.[0];
  if (file) _processPengDukungFile(file);
}

async function _processPengDukungFile(file) {
  if (file.size > 2 * 1024 * 1024) { toast(`${file.name}: terlalu besar (maks. 2 MB)`, 'error'); return; }

  _pengDukung = { url: null, name: file.name, _loading: true };
  _renderPengDukungPreview();
  _updatePengAjukanBtnState();

  const pw = document.getElementById('pengDukungProgressWrap');
  const pb = document.getElementById('pengDukungProgressBar');
  if (pw) pw.style.display = '';
  if (pb) pb.style.width = '0%';

  try {
    // Reuse fungsi upload generik yg sama persis dgn milik modal admin
    // (_absUploadFileWithProgress) — endpoint & payloadnya identik.
    const d = await _absUploadFileWithProgress(file, (pct) => { if (pb) pb.style.width = pct + '%'; });
    if (pb) { pb.style.width = '100%'; setTimeout(() => { if (pw) pw.style.display = 'none'; }, 600); }
    _pengDukung = { url: d.url, name: d.name || file.name };
    _renderPengDukungPreview();
    _updatePengAjukanBtnState();
    toast(`${file.name} berhasil diupload`);
  } catch (err) {
    toast(err.message || 'Gagal upload data dukung', 'error');
    _resetPengDukung();
  }
}

async function savePengajuan() {
  document.getElementById('cdtp_pengTanggal')?._cdtp?.commit();
  document.getElementById('cdtp_pengTanggalSelesai')?._cdtp?.commit();

  const status = document.getElementById('pengStatus').value;
  const tanggal = document.getElementById('pengTanggal').value;
  const tanggal_selesai = document.getElementById('pengTanggalSelesai').value;
  const keterangan = document.getElementById('pengKeterangan').value.trim();

  if (!tanggal || !tanggal_selesai) { toast('Tanggal mulai dan selesai wajib diisi', 'error'); return; }
  if (tanggal_selesai < tanggal) { toast('Tanggal selesai tidak boleh sebelum tanggal mulai', 'error'); return; }
  if (_pengDukung?._loading) { toast('Tunggu sampai file selesai diupload', 'error'); return; }
  if (!_pengDukung?.url) { toast('Data dukung wajib diisi', 'error'); return; }

  // Jaga-jaga terakhir sebelum kirim (kalau cek pas ganti tanggal kelewat)
  const bentrok = await _pengCekBentrokAbsensi(tanggal, tanggal_selesai);
  if (bentrok && bentrok.length) {
    const daftar = bentrok.map(a => fmtTglSingkat(a.tanggal)).join(', ');
    toast(`Sudah ada absensi pada tanggal: ${daftar}. Tidak bisa mengajukan tugas luar/cuti di tanggal itu.`, 'error');
    return;
  }

  const btn = document.getElementById('btnSimpanPengajuan');
  btn.disabled = true;
  try {
    const r = await fetch('/api/absensi/pengajuan', {
      method: 'POST',
      headers: { ...authHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify({
        status, tanggal, tanggal_selesai, keterangan,
        data_dukung_url: _pengDukung.url, data_dukung_nama: _pengDukung.name,
      }),
    });
    const d = await r.json();
    if (!r.ok) { toast(d.error || 'Gagal mengajukan', 'error'); return; }
    toast('Pengajuan berhasil dikirim, menunggu persetujuan admin', 'success');
    closeModal('modalPengajuanAbsen');
    await loadPengajuanSaya();
    if (typeof renderAbsHariIni === 'function') renderAbsHariIni();
  } catch { toast('Gagal mengajukan', 'error'); }
  finally { btn.disabled = false; }
}

// ── Daftar pengajuan milik sendiri (kartu di bawah toolbar) ─────────────
async function loadPengajuanSaya() {
  const box = document.getElementById('absPengajuanSayaBox');
  const list = document.getElementById('absPengajuanSayaList');
  if (!box || !list) return;
  try {
    const r = await fetch(`/api/absensi/pengajuan?user_id=${_user.id}`, { headers: authHeaders() });
    const d = await r.json();
    const rows = (d.pengajuan || []).slice(0, 5);
    if (!rows.length) { box.style.display = 'none'; return; }
    box.style.display = '';
    list.innerHTML = rows.map(p => `
      <div style="display:flex;align-items:center;gap:10px;padding:8px 0;border-bottom:1px solid var(--abu-2,#e2e8f0)">
        <div style="flex:1;min-width:0">
          <div style="font-weight:600;font-size:.82rem">${esc(STATUS_LABEL[p.status] || p.status)} — ${fmtTglSingkat(p.tanggal)} s/d ${fmtTglSingkat(p.tanggal_selesai)}</div>
          ${p.catatan_admin ? `<div style="font-size:.72rem;color:var(--teks-muted)">Catatan admin: ${esc(p.catatan_admin)}</div>` : ''}
        </div>
        <span class="badge ${PENG_STATUS_BADGE[p.status_persetujuan]}">${PENG_STATUS_ICON[p.status_persetujuan] || ''}${esc(PENG_STATUS_LABEL[p.status_persetujuan])}</span>
        ${p.status_persetujuan === 'pending' ? `<button class="btn btn-ghost btn-sm" data-tip="Batalkan" onclick="batalkanPengajuan(${p.id})">
          <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>
        </button>` : ''}
        ${p.status_persetujuan === 'ditolak' ? `<button class="btn btn-danger btn-sm" data-tip="Hapus" onclick="hapusPengajuanDitolak(${p.id})">
          <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
        </button>` : ''}
      </div>
    `).join('');
  } catch { box.style.display = 'none'; }
}

async function batalkanPengajuan(id) {
  const ok = await showConfirm({
    title: 'Batalkan Pengajuan', msg: 'Pengajuan yang masih menunggu persetujuan ini akan dibatalkan.',
    okText: 'Ya, Batalkan', icon: 'trash', type: 'danger',
  });
  if (!ok) return;
  try {
    const r = await fetch(`/api/absensi/pengajuan/${id}`, { method: 'DELETE', headers: authHeaders() });
    const d = await r.json();
    if (!r.ok) { toast(d.error || 'Gagal membatalkan pengajuan', 'error'); return; }
    toast('Pengajuan dibatalkan', 'success');
    await loadPengajuanSaya();
    if (typeof renderAbsHariIni === 'function') renderAbsHariIni();
  } catch { toast('Gagal membatalkan pengajuan', 'error'); }
}

async function hapusPengajuanDitolak(id) {
  const ok = await showConfirm({
    title: 'Hapus Pengajuan', msg: 'Pengajuan yang ditolak ini akan dihapus dari riwayat.',
    okText: 'Ya, Hapus', icon: 'trash', type: 'danger',
  });
  if (!ok) return;
  try {
    const r = await fetch(`/api/absensi/pengajuan/${id}`, { method: 'DELETE', headers: authHeaders() });
    const d = await r.json();
    if (!r.ok) { toast(d.error || 'Gagal menghapus pengajuan', 'error'); return; }
    toast('Pengajuan dihapus', 'success');
    await loadPengajuanSaya();
  } catch { toast('Gagal menghapus pengajuan', 'error'); }
}

function fmtTglSingkat(s) {
  if (!s) return '—';
  const d = new Date(s);
  return d.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC' });
}

// ═══════════════════════════════════════════════════════════════════════
// PERSETUJUAN PENGAJUAN — admin/full
// ═══════════════════════════════════════════════════════════════════════
async function refreshPengajuanPendingBadge() {
  const badge = document.getElementById('absPengajuanPendingBadge');
  if (!badge) return;
  try {
    const r = await fetch('/api/absensi/pengajuan?status_persetujuan=pending', { headers: authHeaders() });
    const d = await r.json();
    const n = (d.pengajuan || []).length;
    if (n > 0) { badge.textContent = n; badge.style.display = ''; }
    else { badge.style.display = 'none'; }
  } catch { badge.style.display = 'none'; }
}

// ── NOTIF PENGAJUAN PENDING OTOMATIS (admin/full) ────────────────────────
// Dipanggil sekali di boot chain app.js (setelah initAuth sukses), sama
// pola kayak _cekAbsensiReminder() di sisi user — begitu admin login,
// modal Persetujuan Pengajuan langsung kebuka kalau ada yang pending, jadi
// admin bisa langsung Setujui/Tolak tanpa perlu buka menu Absensi dulu.
async function _cekPengajuanPendingReminder() {
  if (!isAbsensiFull()) return;
  try {
    const r = await fetch('/api/absensi/pengajuan?status_persetujuan=pending', { headers: authHeaders() });
    const d = await r.json();
    const n = (d.pengajuan || []).length;
    const badge = document.getElementById('absPengajuanPendingBadge');
    if (badge) { if (n > 0) { badge.textContent = n; badge.style.display = ''; } else { badge.style.display = 'none'; } }
    if (n > 0) await openPersetujuanModal();
  } catch { /* notif gak boleh sampai ganggu boot app kalau error */ }
}

async function openPersetujuanModal() {
  openModal('modalPersetujuanAbsen');
  await loadPersetujuanList();
}

async function loadPersetujuanList() {
  const container = document.getElementById('absPersetujuanList');
  if (!container) return;
  container.innerHTML = `<div class="skeleton" style="height:60px;border-radius:10px;margin-bottom:10px"></div>`;
  try {
    const r = await fetch('/api/absensi/pengajuan?status_persetujuan=pending', { headers: authHeaders() });
    const d = await r.json();
    const rows = d.pengajuan || [];
    if (!rows.length) {
      // Gak ada lagi yang pending (mis. abis di-setujui/tolak sampai habis)
      // → modal ikutan ditutup, gak perlu nampilin empty state ke admin.
      closeModal('modalPersetujuanAbsen');
      return;
    }
    container.innerHTML = rows.map(p => `
      <div class="card" style="margin-bottom:10px;padding:14px;border-left:3.5px solid #f59e0b">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:10px">
          <div style="min-width:0">
            <div style="font-weight:700;font-size:.85rem">${esc(p.nama_pegawai)}</div>
            <div style="font-size:.78rem;color:var(--teks-muted);margin-top:2px">${esc(STATUS_LABEL[p.status] || p.status)} — ${fmtTglSingkat(p.tanggal)} s/d ${fmtTglSingkat(p.tanggal_selesai)}</div>
            ${p.keterangan ? `<div style="font-size:.78rem;margin-top:4px">${esc(p.keterangan)}</div>` : ''}
            ${p.data_dukung_url ? `<button type="button" class="btn btn-ghost btn-sm" style="margin-top:6px" onclick="viewDoc(decodeURIComponent('${encodeURIComponent(p.data_dukung_url)}'), decodeURIComponent('${encodeURIComponent(p.data_dukung_nama || 'Data Dukung')}'))">
              <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" style="margin-right:4px;vertical-align:-1px"><path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path stroke-linecap="round" stroke-linejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg>Lihat Data Dukung
            </button>` : ''}
          </div>
          <div style="display:flex;gap:6px;flex-shrink:0">
            <button class="btn btn-secondary btn-sm" onclick="openTolakModal(${p.id})"><svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M18 6L6 18M6 6l12 12"/></svg>Tolak</button>
            <button class="btn btn-primary btn-sm" onclick="approvePengajuan(${p.id})"><svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M20 6L9 17l-5-5"/></svg>Setujui</button>
          </div>
        </div>
      </div>
    `).join('');
  } catch {
    container.innerHTML = `<div style="text-align:center;padding:24px;color:var(--teks-muted);font-size:.85rem">Gagal memuat data pengajuan.</div>`;
  }
}

async function approvePengajuan(id) {
  const ok = await showConfirm({
    title: 'Setujui Pengajuan', msg: 'Baris absensi akan otomatis dibuat untuk seluruh rentang tanggal pengajuan ini.',
    okText: 'Ya, Setujui', icon: 'person', type: 'warning',
  });
  if (!ok) return;
  try {
    const r = await fetch(`/api/absensi/pengajuan/${id}/approve`, { method: 'PUT', headers: authHeaders() });
    const d = await r.json();
    if (!r.ok) { toast(d.error || 'Gagal menyetujui pengajuan', 'error'); return; }
    toast('Pengajuan disetujui', 'success');
    await loadPersetujuanList();
    await refreshPengajuanPendingBadge();
    await renderAbsHariIni();
    await loadAbsRekap();
      await loadAbsTable(1);
  } catch { toast('Gagal menyetujui pengajuan', 'error'); }
}

function openTolakModal(id) {
  document.getElementById('tolakPengajuanId').value = id;
  document.getElementById('tolakCatatan').value = '';
  openModal('modalTolakPengajuan');
}

async function submitTolakPengajuan() {
  const id = document.getElementById('tolakPengajuanId').value;
  const catatan_admin = document.getElementById('tolakCatatan').value.trim();
  try {
    const r = await fetch(`/api/absensi/pengajuan/${id}/reject`, {
      method: 'PUT',
      headers: { ...authHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ catatan_admin }),
    });
    const d = await r.json();
    if (!r.ok) { toast(d.error || 'Gagal menolak pengajuan', 'error'); return; }
    toast('Pengajuan ditolak', 'success');
    closeModal('modalTolakPengajuan');
    await loadPersetujuanList();
    await refreshPengajuanPendingBadge();
  } catch { toast('Gagal menolak pengajuan', 'error'); }
}