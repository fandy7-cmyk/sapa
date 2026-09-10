// ============================================================
// LEMBUR — Kegiatan Lembur, Uraian Tugas, Dokumentasi
// ============================================================

let _lemburFull = false;
let _lemburKegiatanList = [];
let _lemburKegiatanPage = 1;
const _lemburKegiatanLimit = 10;
let _lemburKegiatanEditId = null;
let _lemburKegiatanEditSesiId = null;
let _lemburView = 'kegiatan'; // 'kegiatan' | 'sesi'
let _lemburActiveKegiatan = null;
let _lemburSesiList = [];
let _lemburActiveSesi = null;
let _lemburEntries = [];
let _lemburDok = [];
let _lemburPegawai = [];
let _lemburKegiatanPesertaSelected = new Set();
let _lemburKegiatanDokFiles = [];
let _lemburKegiatanTanggalList = [];

function _lemburHasFull() { return !!(_user?.is_admin || hasAccess('lembur.full')); }

// Lembur cuma boleh dicatat buat tanggal yang sudah terjadi (hari ini atau sebelumnya) -
// gak boleh nyatet lembur buat tanggal yang belum kejadian (dipakai di semua tempat yang
// nerima input tanggal lembur: tambah kegiatan baru, tambah hari, ubah tanggal hari).
function _lemburTodayKey() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
function _lemburIsTanggalFuture(tgl) {
  return _lemburDateKey(tgl) > _lemburTodayKey();
}

// Urutkan berdasarkan urutan_laporan yg diatur di "Kelola Pengguna" (sama kayak Laporan
// Absensi) - yg belum diatur (null) ditaruh di belakang, urut nama sbg fallback.
function _lemburSortByUrutanLaporan(arr) {
  return [...arr].sort((a, b) => {
    const ua = a.urutan_laporan, ub = b.urutan_laporan;
    if (ua != null && ub != null) return ua - ub;
    if (ua != null) return -1;
    if (ub != null) return 1;
    return (a.nama || '').localeCompare(b.nama || '');
  });
}

// Ekstrak tanggal kalender LOKAL "YYYY-MM-DD" dari nilai tanggal apapun: string tanggal murni,
// atau ISO datetime yang mungkin keserialize jadi UTC midnight dari kolom DATE Postgres (mis.
// "2026-09-08T16:00:00.000Z" utk tanggal kalender 9 Sept WITA). Naive slice(0,10) di titik-titik
// ini dulu yang bikin tanggal sesi kepeleset mundur sehari (data absensi ikut kebawa salah tanggal,
// bukan cuma tampilan date picker-nya - lihat juga fix serupa di initCdtp._cdtp.set()).
function _lemburDateKey(tgl) {
  if (!tgl) return null;
  const s = String(tgl);
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  const d = new Date(s);
  if (isNaN(d)) return s.slice(0, 10);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// ---------------------------------------------------------------- WARNA KEGIATAN
// Tiap kegiatan lembur dapat warna sendiri yang konsisten dipakai di kalender & legenda.
// Urutan warna ngikutin urutan kegiatan dibuat (created_at/id ascending) biar stabil
// antar render & antar kalender bulan yg beda-beda (lihat _lemburSiapkanWarna, dipanggil
// sekali dari dashboard.js sebelum kalender-kalender bulan dirender).
const LEMBUR_PALET_WARNA = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316', '#6366f1', '#84cc16', '#06b6d4', '#a855f7'];
const _lemburWarnaMap = new Map();
function _lemburSiapkanWarna(kegiatanList) {
  (kegiatanList || []).slice()
    .sort((a, b) => new Date(a.created_at || 0) - new Date(b.created_at || 0) || (a.id || 0) - (b.id || 0))
    .forEach(k => {
      if (k.nama_kegiatan && !_lemburWarnaMap.has(k.nama_kegiatan)) {
        _lemburWarnaMap.set(k.nama_kegiatan, LEMBUR_PALET_WARNA[_lemburWarnaMap.size % LEMBUR_PALET_WARNA.length]);
      }
    });
}
function _lemburWarnaKegiatan(nama) {
  if (!_lemburWarnaMap.has(nama)) _lemburWarnaMap.set(nama, LEMBUR_PALET_WARNA[_lemburWarnaMap.size % LEMBUR_PALET_WARNA.length]);
  return _lemburWarnaMap.get(nama);
}

async function loadLemburKegiatan() {
  _lemburFull = _lemburHasFull();
  _lemburView = 'kegiatan';
  const root = document.getElementById('page-lembur-kegiatan');
  if (!root) return;
  root.innerHTML = `
    <div class="page-title" style="display:flex;align-items:center;gap:10px"><svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="currentColor" style="flex-shrink:0;opacity:.85"><path d="M3 3H21C21.5523 3 22 3.44772 22 4V20C22 20.5523 21.5523 21 21 21H3C2.44772 21 2 20.5523 2 20V4C2 3.44772 2.44772 3 3 3ZM4 5V19H20V5H4ZM6 8H18V10H6V8ZM6 12H14V14H6V12Z"/></svg>Kegiatan Lembur</div>
    <div class="page-subtitle">Catatan aktivitas & dokumentasi lembur</div>
    <div id="lemburBody"></div>
  `;
  await _lemburRenderKegiatanList();
}

// Kalender lembur: hijau kalau ada hari lembur tercatat di tanggal itu, abu2 kalau tidak.
// Klik tanggal yg ada lembur -> langsung buka detail hari lembur itu.
function _lemburKalenderPanel(sesiList, bulan, tahun, liburSet = new Set(), liburMap = new Map()) {
  const daysInMonth = new Date(tahun, bulan, 0).getDate();
  const today = new Date();
  const todayKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  const pad2 = n => String(n).padStart(2, '0');

  const byDay = new Map();
  (sesiList || []).forEach(s => byDay.set(_lemburDateKey(s.tanggal), s));

  const firstDow = new Date(tahun, bulan - 1, 1).getDay();
  const cells = [];
  for (let i = 0; i < firstDow; i++) cells.push(`<div class="dash-heatmap-cell is-empty"></div>`);

  const namaBulanIni = [];
  for (let day = 1; day <= daysInMonth; day++) {
    const key = `${tahun}-${pad2(bulan)}-${pad2(day)}`;
    const dow = new Date(tahun, bulan - 1, day).getDay();
    const isWeekend = dow === 0 || dow === 6;
    const isLiburTanggal = liburSet.has(key);
    const isFuture = key > todayKey;
    const s = byDay.get(key);

    // Weekend/hari libur ditandai duluan (disamain sama Kalender Kehadiran Absensi) -
    // walau ada sesi lembur tercatat di tanggal itu, tetep gak masalah karena
    // klik masih jalan lewat data-tip kalau memang ada s (jarang, tapi jaga-jaga).
    if (isWeekend || isLiburTanggal) {
      const namaLibur = liburMap.get(key) || 'hari libur';
      const liburTip = isWeekend && isLiburTanggal ? `akhir pekan & ${namaLibur}` : isWeekend ? 'Akhir Pekan' : namaLibur;
      if (s) {
        const nama = s.nama_kegiatan || s.kegiatan_nama || '';
        const warna = _lemburWarnaKegiatan(nama);
        if (nama && !namaBulanIni.includes(nama)) namaBulanIni.push(nama);
        cells.push(`<div class="dash-heatmap-cell" style="background:${warna};cursor:pointer" data-tip="Tgl ${day}: ${nama} (${liburTip})" onclick="_lemburKalenderKlikTanggal(${s.kegiatan_id}, ${s.id})">${day}</div>`);
      } else {
        cells.push(`<div class="dash-heatmap-cell is-libur" data-tip="Tgl ${day}: ${liburTip}">${day}</div>`);
      }
      continue;
    }
    if (s) {
      const nama = s.nama_kegiatan || s.kegiatan_nama || '';
      const warna = _lemburWarnaKegiatan(nama);
      if (nama && !namaBulanIni.includes(nama)) namaBulanIni.push(nama);
      const tip = (_lemburHasFull() && s.daftar_peserta)
        ? `Tgl ${day}: ${nama} — Peserta: ${s.daftar_peserta}`
        : `Tgl ${day}: ${nama}`;
      cells.push(`<div class="dash-heatmap-cell" style="background:${warna};cursor:pointer" data-tip="${esc(tip)}" onclick="_lemburKalenderKlikTanggal(${s.kegiatan_id}, ${s.id})">${day}</div>`);
    } else if (isFuture) {
      cells.push(`<div class="dash-heatmap-cell is-future">${day}</div>`);
    } else {
      cells.push(`<div class="dash-heatmap-cell" style="background:#f8fafc;color:#cbd5e1" data-tip="Tgl ${day}: tidak ada lembur">${day}</div>`);
    }
  }

  const legendHtml = namaBulanIni.length
    ? namaBulanIni.map(nama => `<span data-tip="${esc(nama)}"><i style="background:${_lemburWarnaKegiatan(nama)}"></i><span class="dash-heatmap-legend-label">${esc(nama)}</span></span>`).join('')
    : `<span><i style="background:#f8fafc;border:1px solid #e2e8f0"></i>Tidak ada lembur</span>`;

  const icon = `<svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="18" x="3" y="4" rx="2"/><path d="M3 10h18"/><path d="M8 2v4"/><path d="M16 2v4"/></svg>`;
  return `<div class="dash-panel dash-panel--kalender">
    <div class="dash-panel-header">${icon} Kalender Lembur - ${ABS_BULAN_NAMA[bulan]} ${tahun}</div>
    <div class="dash-heatmap">
      <div class="dash-heatmap-dow"><span>Min</span><span>Sen</span><span>Sel</span><span>Rab</span><span>Kam</span><span>Jum</span><span>Sab</span></div>
      <div class="dash-heatmap-grid">${cells.join('')}</div>
    </div>
    <div class="dash-heatmap-legend">${legendHtml}</div>
  </div>`;
}

async function _lemburBukaDariKalender(kegiatanId, sesiId) {
  let k = _lemburKegiatanList.find(x => x.id === kegiatanId);
  if (!k) { await _lemburFetchKegiatan(); k = _lemburKegiatanList.find(x => x.id === kegiatanId); }
  if (!k) return;
  _lemburActiveKegiatan = k;
  _lemburView = 'sesi';
  await _lemburFetchSesi();
  await _lemburOpenSesi(sesiId);
}

// Dipanggil dari kalender lembur di halaman manapun (Dashboard/Kegiatan Lembur) -
// pindah dulu ke halaman Kegiatan Lembur baru buka detail hari itu.
function _lemburKalenderKlikTanggal(kegiatanId, sesiId) {
  navigateTo('lembur-kegiatan', 'Kegiatan Lembur', () => {
    loadLemburKegiatan().then(() => _lemburBukaDariKalender(kegiatanId, sesiId));
  }, 'lembur', 'page-lembur-kegiatan');
}

async function _lemburFetchKegiatan() {
  try {
    const r = await fetch('/api/lembur/kegiatan', { headers: authHeaders() });
    const d = await r.json();
    if (!r.ok) { toast(d.error || 'Gagal mengambil kegiatan lembur', 'error'); return; }
    _lemburKegiatanList = d.kegiatan || [];
  } catch { toast('Gagal mengambil kegiatan lembur', 'error'); }
}

async function _lemburRenderKegiatanList() {
  await _lemburFetchKegiatan();
  const body = document.getElementById('lemburBody');
  if (!body) return;

  const addBtn = _lemburFull
    ? `<button class="btn btn-primary btn-sm" onclick="_lemburOpenTambahKegiatan()">+ Kegiatan Lembur</button>`
    : '';

  const total = _lemburKegiatanList.length;
  const pages = Math.max(1, Math.ceil(total / _lemburKegiatanLimit));
  if (_lemburKegiatanPage > pages) _lemburKegiatanPage = pages;
  const start = (_lemburKegiatanPage - 1) * _lemburKegiatanLimit;
  const pageItems = _lemburKegiatanList.slice(start, start + _lemburKegiatanLimit);

  const rows = pageItems.length
    ? pageItems.map((k, i) => `
        <tr class="lembur-row-plain">
          <td style="width:48px;text-align:center;color:var(--teks-muted)">${start + i + 1}</td>
          <td>${esc(k.nama_kegiatan)}</td>
          <td>${k.jumlah_sesi} hari</td>
          <td>${k.created_at ? fmtDate(k.created_at) : '-'}</td>
          <td style="white-space:nowrap">
            <button class="btn-buka" data-tip="Buka" onclick="_lemburOpenKegiatan(${k.id})"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M6 14l1.45-2.9A2 2 0 019.24 10H20a2 2 0 011.94 2.5l-1.54 6a2 2 0 01-1.94 1.5H4a2 2 0 01-2-2V5a2 2 0 012-2h3.9a2 2 0 011.69.9l.81 1.2a2 2 0 001.67.9H18a2 2 0 012 2v2"/></svg></button>
            <button class="btn-download" data-tip="Download Laporan" onclick="_lemburDownloadKegiatan(${k.id})"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-8-4V4m0 8l-3-3m3 3l3-3"/></svg></button>
            ${_lemburFull ? `<button class="btn-edit" data-tip="Ubah Nama" onclick="_lemburOpenEditKegiatan(${k.id})"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg></button>` : ''}
            ${_lemburFull ? `<button class="btn-hapus" data-tip="Hapus" onclick="_lemburHapusKegiatan(${k.id})"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path stroke-linecap="round" stroke-linejoin="round" d="M19 6l-1 14H6L5 6"/><path stroke-linecap="round" stroke-linejoin="round" d="M10 11v6m4-6v6"/><path stroke-linecap="round" stroke-linejoin="round" d="M9 6V4h6v2"/></svg></button>` : ''}
          </td>
        </tr>
      `).join('')
    : `<tr><td colspan="5" style="text-align:center;color:var(--teks-muted)">Belum ada kegiatan lembur${_lemburFull ? '. Klik "+ Kegiatan Lembur" untuk mulai.' : '.'}</td></tr>`;

  body.innerHTML = `
    <div class="lembur-toolbar" style="display:flex;justify-content:flex-end;margin-bottom:12px">${addBtn}</div>
    <div class="card" style="padding:0;overflow:auto;-webkit-overflow-scrolling:touch">
      <table class="surat-table">
        <thead><tr><th style="width:48px;text-align:center">No</th><th>Nama Kegiatan</th><th>Jumlah Hari</th><th>Dibuat</th><th style="width:120px">Aksi</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
    <div id="lemburKegiatanPagination"></div>
  `;
  renderPagination('lemburKegiatanPagination', total, _lemburKegiatanPage, _lemburKegiatanLimit, (p) => {
    _lemburKegiatanPage = p;
    _lemburRenderKegiatanList();
  });
}

async function _lemburOpenTambahKegiatan() {
  _lemburKegiatanEditId = null;
  _lemburKegiatanEditSesiId = null;
  document.getElementById('lemburKegiatanNama').value = '';
  document.querySelector('#modalLemburKegiatan .modal-title').textContent = 'Kegiatan Lembur Baru';
  document.getElementById('lemburKegiatanTanggalWrap').style.display = '';
  document.getElementById('lemburKegiatanJamWrap').style.display = '';
  document.getElementById('lemburKegiatanPesertaWrap').style.display = '';
  document.getElementById('lemburKegiatanDokWrap').style.display = '';
  document.getElementById('btnLemburTanggalTambah').style.display = '';
  document.getElementById('lemburKegiatanTanggalHint').style.display = '';
  if (typeof initCdtp === 'function') initCdtp();
  { const _c = document.getElementById('cdtp_lemburKegiatanTanggal')?._cdtp; if (_c) _c.clear(); }
  tpSetValue('lemburKegiatanJamMulai', '16:30');
  tpSetValue('lemburKegiatanJamSelesai', '19:30');
  _lemburKegiatanTanggalList = [];
  _lemburRenderTanggalChips();
  _lemburKegiatanPesertaSelected = new Set();
  _lemburKegiatanDokFiles = [];
  _lemburRenderKegiatanDokPreview();
  document.getElementById('lemburKegiatanPesertaGrid').innerHTML = '';
  openModal('modalLemburKegiatan');
  await _lemburFetchPegawai(document.getElementById('lemburKegiatanTanggal').value);
  _lemburRenderKegiatanPesertaGrid();
}

// Nama Kegiatan sekarang combobox: opsi diambil dari nama kegiatan yang udah pernah dipakai
// (bukan master data terpisah), biar penamaan kegiatan yang berulang (mis. "Rapat Koordinasi
// Bulanan") konsisten - sekalian bikin warnanya di kalender konsisten juga. Pola combobox-nya
// sama persis kayak "Keterangan" di e-Planning (pake _epMakeLocalCombobox yang sama).
let _lemburNamaCustom = [];
const _lemburNamaCombo = (typeof _epMakeLocalCombobox === 'function') ? _epMakeLocalCombobox({
  inputId: 'lemburKegiatanNama',
  getOptions: () => {
    const dariKegiatan = (_lemburKegiatanList || []).map(k => k.nama_kegiatan).filter(Boolean);
    const dipakai = [..._lemburNamaCustom, ...dariKegiatan];
    return Array.from(new Set(dipakai)).map(nama => ({ nama }));
  },
  matchText: x => x.nama,
  renderOption: x => esc(x.nama),
  onPick: (input, x) => { input.value = x.nama; },
  canDelete: x => _lemburNamaCustom.includes(x.nama) && !(_lemburKegiatanList || []).some(k => k.nama_kegiatan === x.nama),
  onDelete: (x) => { const i = _lemburNamaCustom.indexOf(x.nama); if (i !== -1) _lemburNamaCustom.splice(i, 1); },
}) : null;
function lemburSearchNamaKegiatan() { _lemburNamaCombo?.search(); }
function lemburFocusNamaKegiatanBaru(e) {
  e.preventDefault();
  e.stopPropagation(); // biar klik-nya gak ke-anggep "klik di luar" sama listener combobox yang langsung nutup lagi panel yang baru kebuka
  _lemburNamaCombo?.close();
  document.getElementById('lemburNamaKegiatanBaru').value = '';
  // Modal "Kegiatan Lembur Baru" disembunyikan dulu (bukan di-closeModal beneran, jadi isian
  // tanggal/jam/peserta yg udah diisi gak ilang) - biar gak numpuk 2 modal-overlay blur bareng,
  // soalnya itu yang bikin ngetik di modal ini kerasa lag (browser ngerender 2 backdrop-blur sekaligus).
  document.getElementById('modalLemburKegiatan')?.classList.remove('open');
  openModal('modalLemburNamaKegiatan');
  setTimeout(() => document.getElementById('lemburNamaKegiatanBaru').focus(), 50);
}
function _lemburTutupNamaKegiatanBaru() {
  closeModal('modalLemburNamaKegiatan');
  document.getElementById('modalLemburKegiatan')?.classList.add('open');
}
function lemburSimpanNamaKegiatanBaru() {
  const nilai = document.getElementById('lemburNamaKegiatanBaru').value.trim();
  if (!nilai) { document.getElementById('lemburNamaKegiatanBaru').focus(); return; }
  const dariKegiatan = (_lemburKegiatanList || []).map(k => k.nama_kegiatan).filter(Boolean);
  const sudahAda = [..._lemburNamaCustom, ...dariKegiatan].some(x => x.trim().toLowerCase() === nilai.toLowerCase());
  if (sudahAda) { toast('Nama kegiatan tersebut sudah ada di daftar', 'error'); document.getElementById('lemburNamaKegiatanBaru').focus(); return; }
  if (!_lemburNamaCustom.includes(nilai)) _lemburNamaCustom.push(nilai);
  // Beda sama pola Keterangan di e-Planning: di sini field Nama Kegiatan cuma satu-satunya &
  // wajib diisi buat lanjut, jadi langsung diisiin ke field-nya biar gak perlu buka dropdown lagi.
  document.getElementById('lemburKegiatanNama').value = nilai;
  _lemburTutupNamaKegiatanBaru();
}

function _lemburRenderTanggalChips() {
  const wrap = document.getElementById('lemburKegiatanTanggalChips');
  if (!wrap) return;
  wrap.innerHTML = _lemburKegiatanTanggalList.map(tgl => `
    <span class="chip-multi-item" style="margin:3px 6px 3px 0">
      <span>${new Date(tgl).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
      <span class="chip-multi-remove" onclick="_lemburRemoveTanggalChip('${tgl}')">&times;</span>
    </span>
  `).join('');
}

async function _lemburAddTanggalChip() {
  const tgl = document.getElementById('lemburKegiatanTanggal').value;
  if (!tgl) { toast('Pilih tanggal terlebih dahulu', 'error'); return; }
  if (_lemburIsTanggalFuture(tgl)) { toast('Tanggal belum bisa dipilih - lembur cuma bisa dicatat untuk tanggal yang sudah terjadi', 'error'); return; }
  if (_lemburKegiatanTanggalList.includes(tgl)) { toast('Tanggal itu sudah ditambahkan', 'error'); return; }
  const btn = document.getElementById('btnLemburTanggalTambah');
  if (btn) btn.disabled = true;
  try {
    const r = await fetch(`/api/lembur/cek-tanggal?tanggal=${tgl}`, { headers: authHeaders() });
    const d = await r.json();
    if (r.ok && d.terpakai) {
      const tglLabel = new Date(tgl).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
      toast(`${tglLabel} sudah ada lembur (kegiatan "${d.nama_kegiatan}")`, 'error');
      return;
    }
  } catch { /* kalau cek gagal, biar tetap bisa lanjut & divalidasi ulang saat submit */ }
  finally { if (btn) btn.disabled = false; }
  _lemburKegiatanTanggalList.push(tgl);
  _lemburKegiatanTanggalList.sort();
  _lemburRenderTanggalChips();
}

function _lemburRemoveTanggalChip(tgl) {
  _lemburKegiatanTanggalList = _lemburKegiatanTanggalList.filter(t => t !== tgl);
  _lemburRenderTanggalChips();
}

function _lemburOpenEditKegiatan(id) {
  const k = (_lemburActiveKegiatan?.id === id) ? _lemburActiveKegiatan : _lemburKegiatanList.find(x => x.id === id);
  if (!k) return;
  _lemburKegiatanEditId = id;
  _lemburKegiatanEditSesiId = null;
  document.getElementById('lemburKegiatanNama').value = k.nama_kegiatan;
  document.querySelector('#modalLemburKegiatan .modal-title').textContent = 'Ubah Nama Kegiatan';
  document.getElementById('lemburKegiatanTanggalWrap').style.display = 'none';
  document.getElementById('lemburKegiatanJamWrap').style.display = 'none';
  document.getElementById('lemburKegiatanPesertaWrap').style.display = 'none';
  document.getElementById('lemburKegiatanDokWrap').style.display = 'none';
  openModal('modalLemburKegiatan');
}

async function _lemburSubmitTambahKegiatan() {
  const nama = document.getElementById('lemburKegiatanNama').value.trim();
  if (!nama) { toast('Nama kegiatan wajib diisi', 'error'); return; }

  // Nama kegiatan harus unik - kalau mau nambah hari lembur ke kegiatan yang udah ada dengan
  // nama yang sama, pakai "+ Tambah Hari Lembur" di kegiatan itu, bukan bikin kegiatan baru lagi.
  const sudahAda = (_lemburKegiatanList || []).some(k =>
    k.nama_kegiatan.trim().toLowerCase() === nama.toLowerCase() && k.id !== _lemburKegiatanEditId
  );
  if (sudahAda) {
    toast(`Kegiatan "${nama}" sudah ada. Pakai "+ Tambah Hari Lembur" di kegiatan itu buat nambah tanggal lagi.`, 'error');
    return;
  }

  if (_lemburKegiatanEditId) {
    closeModal('modalLemburKegiatan');
    _lemburUpdateKegiatan(_lemburKegiatanEditId, nama);
    return;
  }

  const tanggalPicker = document.getElementById('lemburKegiatanTanggal').value;
  // pakai daftar chip tanggal jika ada; kalau kosong, pakai tanggal yang sedang dipilih di picker
  let tanggalList = [..._lemburKegiatanTanggalList];
  if (!tanggalList.length && tanggalPicker) tanggalList = [tanggalPicker];
  if (!tanggalList.length) { toast('Tanggal lembur wajib diisi', 'error'); return; }
  const tglFuture = tanggalList.find(t => _lemburIsTanggalFuture(t));
  if (tglFuture) {
    const label = new Date(tglFuture).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
    toast(`${label} belum terjadi - lembur cuma bisa dicatat untuk tanggal yang sudah lewat`, 'error');
    return;
  }

  // Cek benturan tanggal DULU buat semua tanggal sebelum nyimpen apapun - kalau ada yang bentrok,
  // modal tetap dibuka & belum ada yang disimpan sama sekali, biar user tinggal ganti/hapus chip
  // tanggal yang bentrok itu tanpa kehilangan isian lain (nama, jam, peserta, tanggal lain yang oke).
  const btn = document.getElementById('btnSaveLemburKegiatan');
  if (btn) btn.disabled = true;
  try {
    const hasilCek = await Promise.all(tanggalList.map(async tanggal => {
      try {
        const r = await fetch(`/api/lembur/cek-tanggal?tanggal=${tanggal}`, { headers: authHeaders() });
        const d = await r.json();
        return { tanggal, terpakai: !!(r.ok && d.terpakai), nama_kegiatan: d.nama_kegiatan || null };
      } catch { return { tanggal, terpakai: false, nama_kegiatan: null }; } // gagal cek, biar tetap lanjut & divalidasi ulang saat submit
    }));
    const bentrok = hasilCek.filter(h => h.terpakai);
    if (bentrok.length) {
      const detail = bentrok.map(h => `${new Date(h.tanggal).toLocaleDateString('id-ID', { day: 'numeric', month: 'long' })} (di kegiatan "${h.nama_kegiatan}")`).join(', ');
      toast(`Tanggal bentrok, belum disimpan: ${detail}. Ganti atau hapus tanggal itu dulu.`, 'error');
      return;
    }
  } finally { if (btn) btn.disabled = false; }

  const jam_mulai = tpGetValue('lemburKegiatanJamMulai');
  const jam_selesai = tpGetValue('lemburKegiatanJamSelesai');
  const peserta_ids = [..._lemburKegiatanPesertaSelected];
  const dokFiles = _lemburKegiatanDokFiles;
  closeModal('modalLemburKegiatan');
  _lemburCreateKegiatanMulti(nama, tanggalList, jam_mulai, jam_selesai, peserta_ids, dokFiles);
}

async function _lemburUpdateKegiatan(id, nama_kegiatan) {
  try {
    const r = await fetch(`/api/lembur/kegiatan/${id}`, { method: 'PUT', headers: { ...authHeaders(), 'Content-Type': 'application/json' }, body: JSON.stringify({ nama_kegiatan }) });
    const d = await r.json();
    if (!r.ok) { toast(d.error || 'Gagal mengubah kegiatan', 'error'); return; }

    toast('Nama kegiatan diperbarui', 'success');
    if (_lemburActiveKegiatan?.id === id) {
      _lemburActiveKegiatan = d.kegiatan;
      await _lemburRenderSesiList();
    } else {
      await _lemburRenderKegiatanList();
    }
  } catch { toast('Gagal mengubah kegiatan', 'error'); }
}

async function _lemburHapusKegiatan(id) {
  const ok = await showConfirm({ title: 'Hapus Kegiatan Lembur', msg: 'Hapus kegiatan ini beserta seluruh hari, peserta, dan dokumentasinya?', okText: 'Ya, Hapus', icon: 'trash', type: 'danger' });
  if (!ok) return;
  try {
    const r = await fetch(`/api/lembur/kegiatan/${id}`, { method: 'DELETE', headers: authHeaders() });
    if (!r.ok) { toast('Gagal menghapus kegiatan', 'error'); return; }
    toast('Kegiatan lembur dihapus', 'success');
    await _lemburRenderKegiatanList();
  } catch { toast('Gagal menghapus kegiatan', 'error'); }
}

async function _lemburCreateKegiatanMulti(nama_kegiatan, tanggalList, jam_mulai, jam_selesai, peserta_ids = [], dokFiles = []) {
  try {
    const r = await fetch('/api/lembur/kegiatan', { method: 'POST', headers: { ...authHeaders(), 'Content-Type': 'application/json' }, body: JSON.stringify({ nama_kegiatan }) });
    const d = await r.json();
    if (!r.ok) { toast(d.error || 'Gagal menyimpan kegiatan', 'error'); return; }

    let firstSesi = null, sukses = 0, gagal = 0;
    const gagalDetail = [];
    for (const tanggal of tanggalList) {
      const r2 = await fetch('/api/lembur/sesi', {
        method: 'POST', headers: { ...authHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ kegiatan_id: d.kegiatan.id, tanggal, jam_mulai, jam_selesai }),
      });
      const d2 = await r2.json();
      if (!r2.ok) {
        gagal++;
        const tglLabel = new Date(tanggal).toLocaleDateString('id-ID', { day: 'numeric', month: 'long' });
        gagalDetail.push(`${tglLabel} (${d2.error || 'gagal'})`);
        continue;
      }
      sukses++;
      if (!firstSesi) firstSesi = d2.sesi;
      if (peserta_ids.length) {
        await fetch(`/api/lembur/sesi/${d2.sesi.id}/peserta`, { method: 'POST', headers: { ...authHeaders(), 'Content-Type': 'application/json' }, body: JSON.stringify({ user_ids: peserta_ids }) }).catch(() => {});
      }
    }

    // dokumentasi hanya dilampirkan ke hari lembur pertama yang berhasil dibuat
    if (firstSesi) {
      for (const f of dokFiles) { await _lemburUploadOneDokTo(firstSesi.id, f); }
    }

    if (!firstSesi) { toast(gagalDetail.length ? `Gagal: ${gagalDetail.join(', ')}` : 'Gagal menyimpan hari lembur', 'error'); return; }
    toast(gagal
      ? `${sukses} hari lembur ditambahkan. Gagal: ${gagalDetail.join(', ')}`
      : 'Kegiatan lembur ditambahkan', gagal ? 'error' : 'success');

    // Tetap di list "Kegiatan Lembur" (cuma refresh list-nya) - jangan lsg lompat ke detail
    // sesi, biar user yang milih mau buka kegiatan mana.
    _lemburView = 'kegiatan';
    await _lemburRenderKegiatanList();
  } catch { toast('Gagal menyimpan kegiatan', 'error'); }
}

function _lemburRenderKegiatanPesertaGrid() {
  const grid = document.getElementById('lemburKegiatanPesertaGrid');
  if (!grid) return;
  grid.innerHTML = _lemburPegawai.length
    ? _lemburPegawai.map(p => {
        const st = _lemburStatusAbsensi(p.absensi_status);
        if (st) _lemburKegiatanPesertaSelected.delete(p.id);
        return `
        <div class="perm-item${_lemburKegiatanPesertaSelected.has(p.id) ? ' selected' : ''}" style="${st ? 'opacity:.55;cursor:not-allowed' : ''}" ${st ? '' : `onclick="_lemburToggleKegiatanPeserta(${p.id}, this)"`}>
          <div class="perm-check"></div>
          <div>
            <div class="perm-name" style="display:flex;align-items:center;gap:6px;flex-wrap:wrap">${esc(p.nama)}${st ? ` <span class="badge ${st.badge}" style="font-size:.68em;padding:2px 8px">${st.label}</span>` : ''}</div>
            <div class="perm-desc">${p.nip ? 'NIP. ' + esc(p.nip) : ''}</div>
          </div>
        </div>`;
      }).join('')
    : `<div style="text-align:center;color:var(--teks-muted);padding:8px;font-size:.82rem">Belum ada data pegawai.</div>`;
  _lemburUpdateKegiatanSelectAllLabel();
}

function _lemburToggleKegiatanPeserta(id, el) {
  if (_lemburKegiatanPesertaSelected.has(id)) { _lemburKegiatanPesertaSelected.delete(id); el.classList.remove('selected'); }
  else { _lemburKegiatanPesertaSelected.add(id); el.classList.add('selected'); }
  _lemburUpdateKegiatanSelectAllLabel();
}

function _lemburUpdateKegiatanSelectAllLabel() {
  const label = document.getElementById('lemburKegiatanPesertaSelectAll');
  if (!label) return;
  const selectable = _lemburPegawai.filter(p => !_lemburStatusAbsensi(p.absensi_status));
  const allSelected = selectable.length > 0 && selectable.every(p => _lemburKegiatanPesertaSelected.has(p.id));
  label.textContent = allSelected ? 'Batalkan Semua' : 'Pilih Semua';
}

function _lemburToggleSelectAllKegiatanPeserta() {
  const grid = document.getElementById('lemburKegiatanPesertaGrid');
  if (!grid) return;
  const selectable = _lemburPegawai.filter(p => !_lemburStatusAbsensi(p.absensi_status));
  const allSelected = selectable.length > 0 && selectable.every(p => _lemburKegiatanPesertaSelected.has(p.id));
  if (allSelected) selectable.forEach(p => _lemburKegiatanPesertaSelected.delete(p.id));
  else selectable.forEach(p => _lemburKegiatanPesertaSelected.add(p.id));
  _lemburRenderKegiatanPesertaGrid();
}

function _lemburStageDok(files) {
  if (!files || !files.length) return;
  [...files].forEach(f => {
    if (f.size > 2 * 1024 * 1024) { toast(`${f.name}: terlalu besar (maks. 2 MB)`, 'error'); return; }
    _lemburKegiatanDokFiles.push(f);
  });
  _lemburRenderKegiatanDokPreview();
}

function _lemburUnstageDok(idx) {
  _lemburKegiatanDokFiles.splice(idx, 1);
  _lemburRenderKegiatanDokPreview();
}

function _lemburRenderKegiatanDokPreview() {
  const wrap = document.getElementById('lemburKegiatanDokPreview');
  if (!wrap) return;
  wrap.innerHTML = _lemburKegiatanDokFiles.map((f, i) => `
    <div class="lembur-dok-item">
      <img src="${URL.createObjectURL(f)}" alt="${esc(f.name)}">
      <button class="btn-icon lembur-dok-del" onclick="_lemburUnstageDok(${i})">✕</button>
    </div>
  `).join('');
}

async function _lemburOpenKegiatan(id) {
  _lemburActiveKegiatan = _lemburKegiatanList.find(k => k.id === id);
  if (!_lemburActiveKegiatan) return;
  _lemburView = 'sesi';
  await _lemburRenderSesiList();
}

async function _lemburFetchSesi() {
  try {
    const r = await fetch(`/api/lembur/sesi?kegiatan_id=${_lemburActiveKegiatan.id}`, { headers: authHeaders() });
    const d = await r.json();
    if (!r.ok) { toast(d.error || 'Gagal mengambil sesi lembur', 'error'); return; }
    _lemburSesiList = d.sesi || [];
  } catch { toast('Gagal mengambil sesi lembur', 'error'); }
}

async function _lemburRenderSesiList() {
  await _lemburFetchSesi();
  const body = document.getElementById('lemburBody');
  if (!body) return;

  const addBtn = _lemburFull
    ? `<button class="btn btn-primary btn-sm" onclick="_lemburOpenTambahSesi()">+ Tambah Hari Lembur</button>`
    : '';

  const daftarSesi = _lemburFull ? _lemburSesiList : _lemburSesiList.filter(s => s.is_peserta);

  const rows = daftarSesi.length
    ? daftarSesi.map((s, i) => `
        <tr class="lembur-row-plain" data-sesi-id="${s.id}">
          <td style="width:48px;text-align:center;color:var(--teks-muted)">${i + 1}</td>
          <td>${new Date(s.tanggal).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</td>
          <td>${s.jam_mulai ? s.jam_mulai.slice(0,5) : '-'} WITA - ${s.jam_selesai ? s.jam_selesai.slice(0,5) : '-'} WITA</td>
          <td>${s.jumlah_peserta} pegawai</td>
          <td style="white-space:nowrap" data-col="dok">
            ${_lemburFull ? (s.jumlah_dokumentasi > 0 ? `
              <span style="display:inline-flex;align-items:center;gap:3px">
                <label class="lembur-dok-uploaded-btn" data-tip="Upload lagi">
                  <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"/></svg>
                  ${s.jumlah_dokumentasi} foto
                  <input type="file" accept="image/*" multiple style="display:none" onchange="_lemburUploadDokToList(${s.id}, this.files)">
                </label>
                <button class="lembur-dok-preview-btn" data-tip="Lihat dokumentasi" onclick="_lemburPreviewDokRow(${s.id})"><svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path stroke-linecap="round" stroke-linejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg></button>
              </span>
            ` : `
              <label class="lembur-dok-upload-btn" data-tip="Upload dokumentasi">
                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"/></svg>
                Upload
                <input type="file" accept="image/*" multiple style="display:none" onchange="_lemburUploadDokToList(${s.id}, this.files)">
              </label>
            `) : (s.jumlah_dokumentasi > 0
                ? `<button class="lembur-dok-preview-btn" data-tip="Lihat dokumentasi" onclick="_lemburPreviewDokRow(${s.id})" style="gap:5px;width:auto;padding:4px 10px"><svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path stroke-linecap="round" stroke-linejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg>${s.jumlah_dokumentasi} foto</button>`
                : `${s.jumlah_dokumentasi} foto`)}
          </td>
          ${_lemburFull ? `
          <td style="white-space:nowrap">
            <button class="btn-buka" data-tip="Buka" onclick="_lemburOpenSesi(${s.id})"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M6 14l1.45-2.9A2 2 0 019.24 10H20a2 2 0 011.94 2.5l-1.54 6a2 2 0 01-1.94 1.5H4a2 2 0 01-2-2V5a2 2 0 012-2h3.9a2 2 0 011.69.9l.81 1.2a2 2 0 001.67.9H18a2 2 0 012 2v2"/></svg></button>
            <button class="btn-download" data-tip="Download Laporan" onclick="_lemburDownloadSesi(${s.id})"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-8-4V4m0 8l-3-3m3 3l3-3"/></svg></button>
            <button class="btn-edit" data-tip="Ubah Tanggal/Jam" onclick="_lemburEditJam(${s.id})"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg></button>
            <button class="btn-hapus" data-tip="Hapus Hari Ini" onclick="_lemburHapusSesiIni(${s.id})"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path stroke-linecap="round" stroke-linejoin="round" d="M19 6l-1 14H6L5 6"/><path stroke-linecap="round" stroke-linejoin="round" d="M10 11v6m4-6v6"/><path stroke-linecap="round" stroke-linejoin="round" d="M9 6V4h6v2"/></svg></button>
          </td>` : `
          <td style="white-space:nowrap">
            <button class="btn-buka" data-tip="Isi Uraian Tugas" onclick="_lemburOpenSesi(${s.id})"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M6 14l1.45-2.9A2 2 0 019.24 10H20a2 2 0 011.94 2.5l-1.54 6a2 2 0 01-1.94 1.5H4a2 2 0 01-2-2V5a2 2 0 012-2h3.9a2 2 0 011.69.9l.81 1.2a2 2 0 001.67.9H18a2 2 0 012 2v2"/></svg></button>
            <button class="btn-download" data-tip="Download Laporan" onclick="_lemburDownloadSesi(${s.id})"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-8-4V4m0 8l-3-3m3 3l3-3"/></svg></button>
          </td>`}
        </tr>
      `).join('')
    : `<tr><td colspan="6" style="text-align:center;color:var(--teks-muted)">Belum ada hari lembur tercatat.</td></tr>`;

  body.innerHTML = `
    <div class="lembur-toolbar" style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">
      <button class="btn btn-sm lembur-btn-kembali" onclick="loadLemburKegiatan()"><svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.4"><path stroke-linecap="round" stroke-linejoin="round" d="M19 12H5m0 0l6-6m-6 6l6 6"/></svg>Kembali</button>
      ${addBtn}
    </div>
    <div class="card" style="padding:0;overflow:auto;-webkit-overflow-scrolling:touch">
      <table class="surat-table">
        <thead><tr><th style="width:48px;text-align:center">No</th><th>Tanggal</th><th>Jam Lembur</th><th>Peserta</th><th>Dokumentasi</th><th style="width:170px">Aksi</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
  `;
}

async function _lemburOpenTambahSesi() {
  document.getElementById('modalLemburSesiTitle').textContent = 'Tambah Hari Lembur';
  document.getElementById('lemburSesiTanggalWrap').style.display = '';
  document.getElementById('lemburSesiJamWrap').style.display = '';
  document.getElementById('lemburSesiPesertaWrap').style.display = '';
  if (typeof initCdtp === 'function') initCdtp();
  { const _c = document.getElementById('cdtp_lemburSesiTanggal')?._cdtp; if (_c) { _c.enable(); _c.clear(); } }
  tpSetValue('lemburSesiJamMulai', '16:30');
  tpSetValue('lemburSesiJamSelesai', '19:30');
  _lemburPesertaSelected = new Set();
  document.getElementById('lemburSesiPesertaGrid').innerHTML = '';
  document.getElementById('btnSaveLemburSesi').setAttribute('onclick', '_lemburSubmitSesi()');
  openModal('modalLemburSesi');
  await _lemburFetchPegawai(document.getElementById('lemburSesiTanggal').value);
  _lemburRenderSesiPesertaGrid();
}

function _lemburRenderSesiPesertaGrid(excludeIds = []) {
  const grid = document.getElementById('lemburSesiPesertaGrid');
  if (!grid) return;
  const exclude = new Set(excludeIds);
  const options = _lemburPegawai.filter(p => !exclude.has(p.id));
  grid.innerHTML = options.length
    ? options.map(p => {
        const st = _lemburStatusAbsensi(p.absensi_status);
        if (st) _lemburPesertaSelected.delete(p.id);
        return `
        <div class="perm-item${_lemburPesertaSelected.has(p.id) ? ' selected' : ''}" style="${st ? 'opacity:.55;cursor:not-allowed' : ''}" ${st ? '' : `onclick="_lemburToggleSesiPeserta(${p.id}, this)"`}>
          <div class="perm-check"></div>
          <div>
            <div class="perm-name" style="display:flex;align-items:center;gap:6px;flex-wrap:wrap">${esc(p.nama)}${st ? ` <span class="badge ${st.badge}" style="font-size:.68em;padding:2px 8px">${st.label}</span>` : ''}</div>
            <div class="perm-desc">${p.nip ? 'NIP. ' + esc(p.nip) : ''}</div>
          </div>
        </div>`;
      }).join('')
    : `<div style="text-align:center;color:var(--teks-muted);padding:8px;font-size:.82rem">Semua pegawai sudah ditambahkan.</div>`;
  _lemburUpdateSesiSelectAllLabel(options);
}

function _lemburToggleSesiPeserta(id, el) {
  if (_lemburPesertaSelected.has(id)) { _lemburPesertaSelected.delete(id); el.classList.remove('selected'); }
  else { _lemburPesertaSelected.add(id); el.classList.add('selected'); }
  _lemburUpdateSesiSelectAllLabel();
}

function _lemburUpdateSesiSelectAllLabel(options) {
  const label = document.getElementById('lemburSesiPesertaSelectAll');
  if (!label) return;
  const selectable = (options || _lemburPegawai).filter(p => !_lemburStatusAbsensi(p.absensi_status));
  const allSelected = selectable.length > 0 && selectable.every(p => _lemburPesertaSelected.has(p.id));
  label.textContent = allSelected ? 'Batalkan Semua' : 'Pilih Semua';
}

function _lemburToggleSelectAllSesiPeserta() {
  const grid = document.getElementById('lemburSesiPesertaGrid');
  if (!grid) return;
  const selectable = _lemburPegawai.filter(p => !_lemburStatusAbsensi(p.absensi_status));
  const allSelected = selectable.length > 0 && selectable.every(p => _lemburPesertaSelected.has(p.id));
  if (allSelected) selectable.forEach(p => _lemburPesertaSelected.delete(p.id));
  else selectable.forEach(p => _lemburPesertaSelected.add(p.id));
  _lemburRenderSesiPesertaGrid();
}

function _lemburSubmitSesi() {
  const tanggal = document.getElementById('lemburSesiTanggal').value;
  const jam_mulai = document.getElementById('lemburSesiJamMulai').value;
  const jam_selesai = document.getElementById('lemburSesiJamSelesai').value;
  if (!tanggal) { toast('Tanggal wajib diisi', 'error'); return; }
  if (_lemburIsTanggalFuture(tanggal)) { toast('Tanggal belum bisa dipilih - lembur cuma bisa dicatat untuk tanggal yang sudah terjadi', 'error'); return; }
  const peserta_ids = [..._lemburPesertaSelected];
  closeModal('modalLemburSesi');
  _lemburCreateSesi(tanggal, jam_mulai, jam_selesai, peserta_ids);
}

async function _lemburCreateSesi(tanggal, jam_mulai, jam_selesai, peserta_ids = []) {
  try {
    const r = await fetch('/api/lembur/sesi', {
      method: 'POST', headers: { ...authHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ kegiatan_id: _lemburActiveKegiatan.id, tanggal, jam_mulai, jam_selesai }),
    });
    const d = await r.json();
    if (!r.ok) { toast(d.error || 'Gagal menyimpan hari lembur', 'error'); return; }
    if (peserta_ids.length) {
      const r2 = await fetch(`/api/lembur/sesi/${d.sesi.id}/peserta`, { method: 'POST', headers: { ...authHeaders(), 'Content-Type': 'application/json' }, body: JSON.stringify({ user_ids: peserta_ids }) });
      if (!r2.ok) toast('Hari lembur tersimpan, tapi gagal menambah sebagian peserta', 'error');
    }
    toast('Hari lembur ditambahkan', 'success');
    await _lemburRenderSesiList();
  } catch { toast('Gagal menyimpan hari lembur', 'error'); }
}

async function _lemburFetchPegawai(tanggal) {
  if (!_lemburFull) return;
  try {
    const url = tanggal ? `/api/lembur/pegawai?tanggal=${tanggal}` : '/api/lembur/pegawai';
    const r = await fetch(url, { headers: authHeaders() });
    const d = await r.json();
    if (r.ok) _lemburPegawai = d.pegawai || [];
  } catch {}
}

// Status absensi yang bikin pegawai tidak bisa ditambahkan sbg peserta lembur pd tanggal itu
function _lemburStatusAbsensi(status) {
  if (status === 'cuti') return { label: 'Cuti', badge: 'badge-fuchsia' };
  if (status === 'alpa') return { label: 'Alpa', badge: 'badge-merah' };
  if (status === 'tugas_luar' || status === 'izin' || status === 'sakit') return { label: 'Tugas Luar', badge: 'badge-biru' };
  return null;
}

async function _lemburOnKegiatanTanggalChange() {
  if (!_lemburFull) return;
  const tgl = document.getElementById('lemburKegiatanTanggal').value;
  if (!tgl) return;
  await _lemburFetchPegawai(tgl);
  _lemburRenderKegiatanPesertaGrid();
}

async function _lemburOnSesiTanggalChange() {
  if (!_lemburFull) return;
  const tgl = document.getElementById('lemburSesiTanggal').value;
  if (!tgl) return;
  await _lemburFetchPegawai(tgl);
  _lemburRenderSesiPesertaGrid();
}

async function _lemburOpenSesi(id) {
  _lemburActiveSesi = _lemburSesiList.find(s => s.id === id);
  if (!_lemburActiveSesi) return;
  await Promise.all([_lemburFetchEntries(), _lemburFetchDok(), _lemburFetchPegawai()]);
  _lemburRenderSesiDetail();
}

async function _lemburFetchEntries() {
  try {
    const r = await fetch(`/api/lembur/entries?sesi_id=${_lemburActiveSesi.id}`, { headers: authHeaders() });
    const d = await r.json();
    if (r.ok) _lemburEntries = _lemburSortByUrutanLaporan(d.entries || []);
  } catch {}
}

async function _lemburFetchDok() {
  try {
    const r = await fetch(`/api/lembur/dokumentasi?sesi_id=${_lemburActiveSesi.id}`, { headers: authHeaders() });
    const d = await r.json();
    if (r.ok) _lemburDok = d.dokumentasi || [];
  } catch {}
}

function _lemburInisial(nama) {
  const parts = (nama || '').trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return '?';
  return (parts[0][0] + (parts[1]?.[0] || '')).toUpperCase();
}

function _lemburAvatarHtml(e) {
  if (e.foto_url) {
    return `<img src="${esc(e.foto_url)}" alt="" onerror="this.parentElement.textContent='${esc(_lemburInisial(e.nama))}'">`;
  }
  return esc(_lemburInisial(e.nama));
}

function _lemburRenderSesiDetail() {
  const body = document.getElementById('lemburBody');
  if (!body) return;
  const s = _lemburActiveSesi;

  const tanggalCell = `${new Date(s.tanggal).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}`;
  const jamCell = `${s.jam_mulai ? s.jam_mulai.slice(0,5) : '-'} WITA - ${s.jam_selesai ? s.jam_selesai.slice(0,5) : '-'} WITA`;

  // User non-admin cuma boleh lihat baris dirinya sendiri di sini - punya orang lain gak usah
  // ditampilin sama sekali (bukan cuma dikunci). Dokumen cetak/PDF tetap pakai _lemburEntries
  // yang utuh, karena daftar hadir resmi emang harus nampilin semua peserta buat tanda tangan.
  const pesertaTampil = _lemburFull ? _lemburEntries : _lemburEntries.filter(e => e.user_id === _user.id);

  const pesertaRows = pesertaTampil.map((e, i) => {
    const bisaEdit = _lemburFull || e.user_id === _user.id;
    const hapusBtn = _lemburFull ? `<button class="btn-hapus" data-tip="Hapus Peserta" onclick="_lemburHapusPeserta(${e.id})"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path stroke-linecap="round" stroke-linejoin="round" d="M19 6l-1 14H6L5 6"/><path stroke-linecap="round" stroke-linejoin="round" d="M10 11v6m4-6v6"/><path stroke-linecap="round" stroke-linejoin="round" d="M9 6V4h6v2"/></svg></button>` : '';
    return `
      <tr>
        <td style="width:48px;text-align:center;color:var(--teks-muted);vertical-align:top">${i + 1}</td>
        <td style="vertical-align:top">
          <div style="display:flex;align-items:center;gap:10px">
            <div class="lembur-peserta-avatar" style="flex-shrink:0">${_lemburAvatarHtml(e)}</div>
            <div style="min-width:0">
              <div class="lembur-peserta-nama" style="white-space:normal;overflow-wrap:break-word">${esc(e.nama)}</div>
              <div class="lembur-peserta-nip">NIP. ${esc(e.nip || '-')}</div>
            </div>
          </div>
        </td>
        <td style="vertical-align:top">${tanggalCell}</td>
        <td style="vertical-align:top">${jamCell}</td>
        <td class="textarea-cell" style="text-align:left;vertical-align:top">
          <div class="ps-rte" id="lemburUraian_${e.id}" contenteditable="${bisaEdit ? 'true' : 'false'}" spellcheck="false"
            data-placeholder="${bisaEdit ? 'Uraian tugas selama lembur...' : 'Terkunci — bukan milik Anda'}"
            ${bisaEdit ? '' : 'data-tip="Hanya pemilik atau admin yang bisa mengubah uraian tugas ini" style="cursor:not-allowed"'}
            onblur="_lemburSaveUraian(${e.id}, this.value)">${_mdToRteHtml(e.uraian_tugas || '')}</div>
        </td>
        <td class="textarea-cell" style="text-align:left;vertical-align:top">
          <div class="ps-rte" id="lemburCatatan_${e.id}" contenteditable="${_lemburFull ? 'true' : 'false'}" spellcheck="false"
            data-placeholder="${_lemburFull ? 'Catatan terkait uraian tugas...' : 'Belum ada catatan'}"
            ${_lemburFull ? '' : 'data-tip="Hanya admin yang bisa mengisi catatan" style="cursor:not-allowed"'}
            onblur="_lemburSaveCatatan(${e.id}, this.value)">${_mdToRteHtml(e.catatan || '')}</div>
        </td>
        ${_lemburFull ? `<td style="white-space:nowrap;text-align:center;vertical-align:top">${hapusBtn}</td>` : ''}
      </tr>`;
  }).join('') || `<tr><td colspan="${_lemburFull ? 7 : 6}" style="text-align:center;color:var(--teks-muted)">Belum ada peserta.</td></tr>`;

  body.innerHTML = `
    <div class="lembur-toolbar" style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">
      <button class="btn btn-sm lembur-btn-kembali" onclick="_lemburOpenKegiatan(${_lemburActiveKegiatan.id})"><svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.4"><path stroke-linecap="round" stroke-linejoin="round" d="M19 12H5m0 0l6-6m-6 6l6 6"/></svg>Kembali</button>
      ${_lemburFull ? `<button class="btn btn-primary btn-sm" onclick="_lemburEditJam()">+ Kelola Peserta</button>` : ''}
    </div>
    <div class="card" style="padding:0;overflow:auto;-webkit-overflow-scrolling:touch">
      <table class="surat-table" style="table-layout:fixed">
        <thead>
          <tr><th style="width:4%;text-align:center">No</th><th style="width:22%">Pegawai</th><th style="width:14%">Tanggal</th><th style="width:13%">Jam Lembur</th><th style="width:${_lemburFull ? '25' : '29'}%">Uraian Tugas</th><th style="width:${_lemburFull ? '16' : '18'}%">Catatan</th>${_lemburFull ? '<th style="width:6%;text-align:center">Aksi</th>' : ''}</tr>
        </thead>
        <tbody>${pesertaRows}</tbody>
      </table>
    </div>
  `;
}

async function _lemburSaveUraian(entryId, uraian_tugas) {
  try {
    const r = await fetch(`/api/lembur/entries/${entryId}`, { method: 'PUT', headers: { ...authHeaders(), 'Content-Type': 'application/json' }, body: JSON.stringify({ uraian_tugas }) });
    const d = await r.json();
    if (!r.ok) { toast(d.error || 'Gagal menyimpan uraian tugas', 'error'); return; }
    toast('Uraian tugas tersimpan', 'success');
  } catch { toast('Gagal menyimpan uraian tugas', 'error'); }
}

// Catatan kasubag terkait redaksi uraian tugas - cuma kolom di tampilan layar (tabel Kegiatan
// Lembur), gak ikut ke dokumen Daftar Hadir yang di-download/cetak (lihat _lemburHalamanSesiHtml).
async function _lemburSaveCatatan(entryId, catatan) {
  try {
    const r = await fetch(`/api/lembur/entries/${entryId}`, { method: 'PUT', headers: { ...authHeaders(), 'Content-Type': 'application/json' }, body: JSON.stringify({ catatan }) });
    const d = await r.json();
    if (!r.ok) { toast(d.error || 'Gagal menyimpan catatan', 'error'); return; }
    toast('Catatan tersimpan', 'success');
  } catch { toast('Gagal menyimpan catatan', 'error'); }
}

let _lemburPesertaSelected = new Set();

async function _lemburHapusPeserta(entryId) {
  const ok = await showConfirm({ title: 'Hapus Peserta', msg: 'Hapus pegawai ini dari daftar hadir lembur?', okText: 'Ya, Hapus', icon: 'trash', type: 'danger' });
  if (!ok) return;
  try {
    const r = await fetch(`/api/lembur/entries/${entryId}`, { method: 'DELETE', headers: authHeaders() });
    if (!r.ok) { toast('Gagal menghapus peserta', 'error'); return; }
    await _lemburFetchEntries();
    _lemburRenderSesiDetail();
  } catch { toast('Gagal menghapus peserta', 'error'); }
}

let _lemburSesiActionFromList = false;
let _lemburEditOrigUserIds = [];

async function _lemburEditJam(id) {
  const target = id ? _lemburSesiList.find(x => x.id === id) : _lemburActiveSesi;
  if (!target) return;
  _lemburActiveSesi = target;
  _lemburSesiActionFromList = !!id;
  document.getElementById('modalLemburSesiTitle').textContent = 'Ubah Hari Lembur';
  document.getElementById('lemburSesiTanggalWrap').style.display = '';
  document.getElementById('lemburSesiJamWrap').style.display = '';
  document.getElementById('lemburSesiPesertaWrap').style.display = _lemburFull ? '' : 'none';
  if (typeof initCdtp === 'function') initCdtp();
  { const _c = document.getElementById('cdtp_lemburSesiTanggal')?._cdtp; if (_c) { _c.set(_lemburActiveSesi.tanggal); _c.commit(); _c.disable(); } }
  tpSetValue('lemburSesiJamMulai', _lemburActiveSesi.jam_mulai ? _lemburActiveSesi.jam_mulai.slice(0,5) : '00:00');
  tpSetValue('lemburSesiJamSelesai', _lemburActiveSesi.jam_selesai ? _lemburActiveSesi.jam_selesai.slice(0,5) : '00:00');
  document.getElementById('btnSaveLemburSesi').setAttribute('onclick', '_lemburSubmitEditJam()');
  openModal('modalLemburSesi');

  if (_lemburFull) {
    _lemburPesertaSelected = new Set();
    document.getElementById('lemburSesiPesertaGrid').innerHTML = `<div style="text-align:center;color:var(--teks-muted);padding:8px;font-size:.82rem">Memuat peserta...</div>`;
    try {
      const [, entriesRes] = await Promise.all([
        _lemburFetchPegawai(_lemburDateKey(_lemburActiveSesi.tanggal)),
        fetch(`/api/lembur/entries?sesi_id=${_lemburActiveSesi.id}`, { headers: authHeaders() }).then(r => r.json()),
      ]);
      _lemburEditOrigUserIds = (entriesRes.entries || []).map(e => e.user_id);
    } catch { _lemburEditOrigUserIds = []; }
    _lemburPesertaSelected = new Set(_lemburEditOrigUserIds);
    _lemburRenderSesiPesertaGrid();
  }
}

async function _lemburSubmitEditJam() {
  const tanggal = document.getElementById('lemburSesiTanggal').value;
  const jam_mulai = document.getElementById('lemburSesiJamMulai').value;
  const jam_selesai = document.getElementById('lemburSesiJamSelesai').value;
  if (!tanggal) { toast('Tanggal wajib diisi', 'error'); return; }
  const selectedIds = [..._lemburPesertaSelected];
  const toAdd = _lemburFull ? selectedIds.filter(id => !_lemburEditOrigUserIds.includes(id)) : [];
  const toRemove = _lemburFull ? _lemburEditOrigUserIds.filter(id => !selectedIds.includes(id)) : [];
  closeModal('modalLemburSesi');
  try {
    const r = await fetch(`/api/lembur/sesi/${_lemburActiveSesi.id}`, { method: 'PUT', headers: { ...authHeaders(), 'Content-Type': 'application/json' }, body: JSON.stringify({ tanggal, jam_mulai, jam_selesai }) });
    const d = await r.json();
    if (!r.ok) { toast(d.error || 'Gagal mengubah hari lembur', 'error'); return; }
    if (toAdd.length) {
      const r2 = await fetch(`/api/lembur/sesi/${_lemburActiveSesi.id}/peserta`, { method: 'POST', headers: { ...authHeaders(), 'Content-Type': 'application/json' }, body: JSON.stringify({ user_ids: toAdd }) });
      if (!r2.ok) toast('Gagal menambah sebagian peserta', 'error');
    }
    if (toRemove.length) {
      const delResults = await Promise.all(toRemove.map(uid =>
        fetch(`/api/lembur/sesi/${_lemburActiveSesi.id}/peserta/${uid}`, { method: 'DELETE', headers: authHeaders() })
      ));
      if (delResults.some(res => !res.ok)) toast('Gagal menghapus sebagian peserta', 'error');
    }
    toast('Hari lembur diperbarui', 'success');
    if (_lemburSesiActionFromList) {
      await _lemburRenderSesiList();
    } else {
      await _lemburFetchSesi();
      _lemburActiveSesi = _lemburSesiList.find(s => s.id === d.sesi.id) || d.sesi;
      await Promise.all([_lemburFetchEntries(), _lemburFetchDok()]);
      _lemburRenderSesiDetail();
    }
  } catch { toast('Gagal mengubah hari lembur', 'error'); }
}

async function _lemburHapusSesiIni(id) {
  const target = id ? _lemburSesiList.find(x => x.id === id) : _lemburActiveSesi;
  if (!target) return;
  const ok = await showConfirm({ title: 'Hapus Hari Lembur', msg: 'Hapus hari lembur ini beserta peserta dan dokumentasinya? Hari lembur lain dalam kegiatan ini tidak akan terhapus.', okText: 'Ya, Hapus', icon: 'trash', type: 'danger' });
  if (!ok) return;
  try {
    const r = await fetch(`/api/lembur/sesi/${target.id}`, { method: 'DELETE', headers: authHeaders() });
    if (!r.ok) { toast('Gagal menghapus hari lembur', 'error'); return; }
    toast('Hari lembur dihapus', 'success');
    await _lemburRenderSesiList();
  } catch { toast('Gagal menghapus hari lembur', 'error'); }
}

// Upload dokumentasi langsung dari baris tabel Hari Lembur (tanpa buka detail sesi dulu),
// dengan progress bar niru gaya upload data-dukung di modul Kinerja (ring persen buat 1 file,
// spinner + counter "current/total" buat multi file).
async function _lemburUploadDokToList(sesiId, files) {
  if (!files || !files.length) return;
  const list = [...files];
  const total = list.length;
  const tr = document.querySelector(`tr[data-sesi-id="${sesiId}"]`);
  const td = tr?.querySelector('td[data-col="dok"]');
  let current = 0;

  const renderProgress = (pct = 0) => {
    if (!td) return;
    td.innerHTML = `<button disabled style="display:inline-flex;align-items:center;gap:5px;padding:4px 10px;border-radius:6px;border:none;font-size:.75rem;font-weight:600;font-family:inherit;background:#fef3c7;color:#92400e;white-space:nowrap;cursor:not-allowed">
      ${total <= 1 ? `<svg width="12" height="12" viewBox="0 0 36 36" style="display:inline-block;flex-shrink:0">
        <circle cx="18" cy="18" r="15" fill="none" stroke="#fde68a" stroke-width="5"/>
        <circle cx="18" cy="18" r="15" fill="none" stroke="#92400e" stroke-width="5"
          stroke-linecap="round" pathLength="100" stroke-dasharray="100" stroke-dashoffset="${100 - pct}"
          transform="rotate(-90 18 18)" style="transition:stroke-dashoffset .15s linear"></circle>
      </svg>` : `<span class="btn-spin" style="width:12px;height:12px"></span>`}
      Mengupload…${total > 1 ? ` ${current}/${total}` : ''}
    </button>`;
  };
  renderProgress();

  let sukses = 0;
  const errors = [];
  await Promise.all(list.map(async f => {
    if (f.size > 2 * 1024 * 1024) { errors.push(`${f.name}: terlalu besar (maks. 2 MB)`); current++; renderProgress(); return; }
    try {
      const d = await _uploadFileWithProgress(f, 'lembur', pct => renderProgress(pct));
      const r2 = await fetch('/api/lembur/dokumentasi', {
        method: 'POST', headers: { ...authHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ sesi_id: sesiId, file_url: d.file_url || d.url, file_name: f.name }),
      });
      const d2 = await r2.json();
      if (!r2.ok) throw new Error(d2.error || 'Gagal menyimpan dokumentasi');
      sukses++;
    } catch (err) {
      errors.push(err.message || `${f.name}: gagal diupload`);
    }
    current++;
    renderProgress();
  }));

  if (errors.length && sukses) toast(`${sukses} foto berhasil, ${errors.length} gagal (${errors[0]})`, 'error');
  else if (errors.length) toast(errors.length > 1 ? `${errors.length} foto gagal diupload (${errors[0]})` : errors[0], 'error');
  else toast(sukses > 1 ? `${sukses} foto berhasil diupload` : 'Foto berhasil diupload', 'success');

  await _lemburRenderSesiList();
}

async function _lemburUploadOneDokTo(sesiId, file, refresh = false) {
  if (file.size > 2 * 1024 * 1024) { toast(`${file.name}: terlalu besar (maks. 2 MB)`, 'error'); return; }
  try {
    const fd = new FormData();
    fd.append('file', file);
    fd.append('kategori', 'lembur');
    const r = await fetch('/api/upload', { method: 'POST', headers: { 'Authorization': authHeaders()['Authorization'] }, body: fd });
    const d = await r.json();
    if (!r.ok) { toast(d.error || 'Gagal upload foto', 'error'); return; }
    const r2 = await fetch('/api/lembur/dokumentasi', {
      method: 'POST', headers: { ...authHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ sesi_id: sesiId, file_url: d.file_url || d.url, file_name: file.name }),
    });
    const d2 = await r2.json();
    if (!r2.ok) { toast(d2.error || 'Gagal menyimpan dokumentasi', 'error'); return; }
    if (refresh) { await _lemburFetchDok(); }
  } catch { toast('Gagal upload foto', 'error'); }
}

// Preview dokumentasi langsung dari baris tabel Hari Lembur, pakai lightbox global
// (sama kayak preview data dukung di Kinerja/Surat). Admin/full-access bisa hapus foto
// langsung dari dalam lightbox lewat tombol hapus bawaan panelnya.
async function _lemburPreviewDokRow(sesiId) {
  try {
    const r = await fetch(`/api/lembur/dokumentasi?sesi_id=${sesiId}`, { headers: authHeaders() });
    const d = await r.json();
    if (!r.ok) { toast(d.error || 'Gagal mengambil dokumentasi', 'error'); return; }
    let dok = d.dokumentasi || [];
    if (!dok.length) { toast('Belum ada dokumentasi', 'error'); return; }

    const s = _lemburSesiList.find(x => x.id === sesiId);
    const tglLabel = s ? new Date(s.tanggal).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }) : '';
    const label = `Dokumentasi Lembur${_lemburActiveKegiatan ? ' - ' + _lemburActiveKegiatan.nama_kegiatan : ''}${tglLabel ? ' (' + tglLabel + ')' : ''}`;

    const onDelete = async (idx) => {
      const item = dok[idx];
      if (!item) return;
      const ok = await showConfirm({ title: 'Hapus Dokumentasi', msg: 'Hapus foto ini?', okText: 'Ya, Hapus', icon: 'trash', type: 'danger' });
      if (!ok) return;
      try {
        const rr = await fetch(`/api/lembur/dokumentasi/${item.id}`, { method: 'DELETE', headers: authHeaders() });
        if (!rr.ok) { toast('Gagal menghapus dokumentasi', 'error'); return; }
        toast('Dokumentasi dihapus', 'success');
        dok = dok.filter((_, i) => i !== idx);
        await _lemburRenderSesiList();
        if (dok.length) open(Math.min(idx, dok.length - 1));
        else closeDocPreview();
      } catch { toast('Gagal menghapus dokumentasi', 'error'); }
    };
    const open = (startIdx) => {
      const files = dok.map(x => ({ url: x.file_url, name: x.file_name || 'Dokumentasi' }));
      viewDocMulti(files, startIdx, label, _lemburFull ? onDelete : null);
    };
    open(0);
  } catch { toast('Gagal mengambil dokumentasi', 'error'); }
}

// Cari otomatis Kepala Sub Bagian Perencanaan dari data Struktur/Pegawai,
// supaya penandatangan laporan lembur selalu ikut update kalau ada pergantian.
async function _lemburGetPenandatangan() {
  try {
    const r = await fetch('/api/pegawai', { headers: authHeaders() });
    const d = await r.json();
    const list = d.pegawai || [];
    const kasubbag = list.find(p => p.aktif && (p.jabatan || '').toLowerCase().includes('kepala sub bagian perencanaan'))
      || list.find(p => p.aktif && (p.jabatan || '').toLowerCase().includes('kepala sub bagian'));
    if (kasubbag) return { nama: kasubbag.nama, nip: kasubbag.nip || '' };
  } catch {}
  return null;
}

async function _lemburPromptPenandatangan() {
  const namaDefault = localStorage.getItem('lemburCetakNama') || '';
  const nipDefault = localStorage.getItem('lemburCetakNip') || '';
  const namaTtd = prompt('Nama Penandatangan:', namaDefault);
  if (namaTtd === null) return null;
  if (!namaTtd.trim()) { toast('Nama penandatangan wajib diisi', 'error'); return null; }
  const nipTtd = prompt('NIP Penandatangan (opsional):', nipDefault);
  if (nipTtd === null) return null;
  localStorage.setItem('lemburCetakNama', namaTtd.trim());
  localStorage.setItem('lemburCetakNip', nipTtd.trim());
  return { nama: namaTtd.trim(), nip: nipTtd.trim() };
}

// Download laporan per hari lembur langsung dari baris tabel Hari Lembur
async function _lemburDownloadSesi(id) {
  const s = _lemburSesiList.find(x => x.id === id);
  if (!s) return;
  const prevSesi = _lemburActiveSesi, prevEntries = _lemburEntries, prevDok = _lemburDok;
  _lemburActiveSesi = s;
  try {
    await Promise.all([_lemburFetchEntries(), _lemburFetchDok()]);

    let ttd = await _lemburGetPenandatangan();
    if (!ttd) ttd = await _lemburPromptPenandatangan();
    if (!ttd) return;
    _lemburDoCetak(ttd.nama, ttd.nip);
  } finally {
    _lemburActiveSesi = prevSesi;
    _lemburEntries = prevEntries;
    _lemburDok = prevDok;
  }
}

// ---------------------------------------------------------------- CETAK
async function _lemburCetak() {
  let ttd = await _lemburGetPenandatangan();
  if (!ttd) ttd = await _lemburPromptPenandatangan();
  if (!ttd) return;
  _lemburDoCetak(ttd.nama, ttd.nip);
}

// Foto dokumentasi biasanya langsung dari kamera HP (bisa beberapa MB per file) - preview
// PDF (_bukaPreviewPDF di laporan.js) baru manggil window.print() setelah event 'load' window,
// yang nunggu SEMUA <img> selesai di-download dulu. Kalau dokumentasinya banyak, ini bikin
// "Loading preview..." di dialog print jadi lama banget. Diringkas dulu lewat parameter
// transformasi Cloudinary (resize + kompresi otomatis) sebelum disisipkan ke <img> laporan -
// ukurannya di grid cuma ~1/2 halaman, jadi lebar 1000px udah lebih dari cukup buat kualitas cetak.
function _lemburDokUrlCetak(url) {
  if (!url || !url.includes('/upload/')) return url;
  return url.replace('/upload/', '/upload/f_auto,q_auto,w_1000,c_limit/');
}

function _lemburHalamanSesiHtml(s, entries, dok, namaTtd, nipTtd, pageBreak) {
  const tgl = new Date(s.tanggal).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  const tglTtd = new Date(s.tanggal).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
  const rowsHtml = entries.map((e, i) => `
    <tr>
      <td style="padding:5px 6px;border:1px solid #000;text-align:center;font-size:9px;vertical-align:top">${i+1}</td>
      <td style="padding:5px 6px;border:1px solid #000;font-size:9px;vertical-align:top">${esc(e.nama)}<br><span style="color:#64748b">${e.nip ? 'NIP. ' + esc(e.nip) : ''}</span></td>
      <td style="padding:5px 6px;border:1px solid #000;text-align:center;font-size:9px;vertical-align:top">${s.jam_mulai ? s.jam_mulai.slice(0,5) + ' WITA' : ''}</td>
      <td style="padding:5px 6px;border:1px solid #000;text-align:center;font-size:9px;vertical-align:top">${s.jam_selesai ? s.jam_selesai.slice(0,5) + ' WITA' : ''}</td>
      <td style="padding:5px 6px;border:1px solid #000;font-size:9px;white-space:pre-line;vertical-align:top">${esc(e.uraian_tugas || '')}</td>
      <td style="padding:5px 6px;border:1px solid #000;vertical-align:top"></td>
    </tr>`).join('');

  return `
    <div${pageBreak ? ' style="page-break-before:always"' : ''}>
    ${_kopSuratHtml()}
    <div style="text-align:center;margin:14px 0 12px">
      <div style="font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:.5px">Daftar Hadir Lembur</div>
      <div style="font-size:11px;color:#1e293b;margin-top:4px">${esc(_lemburActiveKegiatan.nama_kegiatan.toUpperCase())}</div>
    </div>
    <div style="font-size:10px;margin-bottom:8px">Hari/Tanggal : ${tgl}</div>
    <table>
      <thead>
        <tr style="background:#0d9488">
          <th rowspan="2" style="color:white;padding:5px 6px;border:1px solid #000;text-align:center;font-size:9px;width:30px">NO</th>
          <th rowspan="2" style="color:white;padding:5px 6px;border:1px solid #000;text-align:center;font-size:9px;width:150px">NAMA/NIP</th>
          <th colspan="2" style="color:white;padding:5px 6px;border:1px solid #000;text-align:center;font-size:9px;width:140px">JAM LEMBUR</th>
          <th rowspan="2" style="color:white;padding:5px 6px;border:1px solid #000;text-align:center;font-size:9px">URAIAN TUGAS</th>
          <th rowspan="2" style="color:white;padding:5px 6px;border:1px solid #000;text-align:center;font-size:9px;width:90px">TANDA TANGAN</th>
        </tr>
        <tr style="background:#0d9488">
          <th style="color:white;padding:5px 6px;border:1px solid #000;text-align:center;font-size:9px;width:70px">MULAI</th>
          <th style="color:white;padding:5px 6px;border:1px solid #000;text-align:center;font-size:9px;width:70px">SELESAI</th>
        </tr>
      </thead>
      <tbody>${rowsHtml}</tbody>
    </table>
    <div style="margin-top:24px;display:flex;justify-content:flex-end;padding-right:60px">
      <div style="text-align:center;min-width:220px">
        <div style="font-size:10px">Adean, ${tglTtd}</div>
        <div style="font-size:10px">Kepala Sub Bagian Perencanaan</div>
        <div style="height:64px"></div>
        <div style="font-size:10px;font-weight:700;text-decoration:underline">${esc(namaTtd)}</div>
        <div style="font-size:10px">NIP. ${esc(nipTtd)}</div>
      </div>
    </div>
    ${dok.length ? (() => {
        const perHalaman = 6;
        const halamanDok = [];
        for (let i = 0; i < dok.length; i += perHalaman) halamanDok.push(dok.slice(i, i + perHalaman));
        return halamanDok.map(grup => `
      <div style="page-break-before:always">
        ${_kopSuratHtml()}
        <div style="text-align:center;margin:14px 0 12px">
          <div style="font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:.5px">Dokumentasi Lembur</div>
          <div style="font-size:11px;color:#1e293b;margin-top:4px">${esc(_lemburActiveKegiatan.nama_kegiatan.toUpperCase())}</div>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;grid-template-rows:repeat(3,1fr);gap:12px;height:230mm">${grup.map(d => `<div style="border:1px solid #000;overflow:hidden"><img src="${_lemburDokUrlCetak(d.file_url)}" style="width:100%;height:100%;object-fit:cover;display:block"></div>`).join('')}</div>
      </div>`).join('');
      })() : ''}
    </div>
  `;
}

function _lemburDoCetak(namaTtd, nipTtd) {
  const bodyHtml = _lemburHalamanSesiHtml(_lemburActiveSesi, _lemburEntries, _lemburDok, namaTtd, nipTtd, false);
  _bukaPreviewPDF(bodyHtml, 'Daftar Hadir Lembur', 'portrait');
}

// Download rekap seluruh hari lembur dalam satu kegiatan (dari tabel Kegiatan Lembur)
async function _lemburDownloadKegiatan(id) {
  const k = _lemburKegiatanList.find(x => x.id === id);
  if (!k) return;
  try {
    const r = await fetch(`/api/lembur/sesi?kegiatan_id=${id}`, { headers: authHeaders() });
    const d = await r.json();
    if (!r.ok) { toast(d.error || 'Gagal mengambil sesi lembur', 'error'); return; }
    const sesiList = d.sesi || [];
    if (!sesiList.length) { toast('Belum ada hari lembur tercatat', 'error'); return; }

    let ttd = await _lemburGetPenandatangan();
    if (!ttd) ttd = await _lemburPromptPenandatangan();
    if (!ttd) return;

    const prevKegiatan = _lemburActiveKegiatan;
    _lemburActiveKegiatan = k;
    try {
      // Sebelumnya sesi di-fetch satu-satu (for loop sequential) - sesi ke-3 baru mulai
      // fetch setelah sesi ke-1 & ke-2 kelar. Sekarang paralel semua sekaligus, dan begitu
      // data dokumentasi satu sesi sampai, foto-fotonya langsung dipreload (new Image()) di
      // background sambil sesi lain masih di-fetch. Jadi pas _bukaPreviewPDF buka window
      // print dan nunggu semua <img> ke-load, sebagian besar udah ke-cache browser duluan -
      // "Loading preview..." di dialog print jadi jauh lebih cepat.
      const dataSesi = await Promise.all(sesiList.map(async (s) => {
        const [rEntries, rDok] = await Promise.all([
          fetch(`/api/lembur/entries?sesi_id=${s.id}`, { headers: authHeaders() }),
          fetch(`/api/lembur/dokumentasi?sesi_id=${s.id}`, { headers: authHeaders() })
        ]);
        const dEntries = await rEntries.json();
        const dDok = await rDok.json();
        const dok = dDok.dokumentasi || [];
        dok.forEach(dd => { const img = new Image(); img.src = _lemburDokUrlCetak(dd.file_url); });
        return { s, entries: _lemburSortByUrutanLaporan(dEntries.entries || []), dok };
      }));
      const halaman = dataSesi.map(({ s, entries, dok }, i) => _lemburHalamanSesiHtml(s, entries, dok, ttd.nama, ttd.nip, i > 0));
      _bukaPreviewPDF(halaman.join(''), 'Daftar Hadir Lembur', 'portrait');
    } finally {
      _lemburActiveKegiatan = prevKegiatan;
    }
  } catch { toast('Gagal membuat laporan', 'error'); }
}
