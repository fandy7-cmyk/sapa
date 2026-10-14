let _lemburFull = false;
let _lemburKegiatanList = [];
let _lemburKegiatanPage = 1;
const _lemburKegiatanLimit = 10;
let _lemburKegiatanEditId = null;
let _lemburKegiatanEditSesiId = null;
let _lemburView = 'kegiatan';
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

function _lemburSaveState() {
  try {
    if (_lemburActiveKegiatan) {
      sessionStorage.setItem('sapa_lembur_state', JSON.stringify({
        kegiatanId: _lemburActiveKegiatan.id,
        sesiId: _lemburActiveSesi ? _lemburActiveSesi.id : null
      }));
    } else {
      sessionStorage.removeItem('sapa_lembur_state');
    }
  } catch(e) {}
}
function _lemburClearState() {
  try { sessionStorage.removeItem('sapa_lembur_state'); } catch(e) {}
}
async function _lemburRestoreState() {
  let saved;
  try { saved = JSON.parse(sessionStorage.getItem('sapa_lembur_state') || 'null'); } catch(e) { saved = null; }
  if (!saved || !saved.kegiatanId) return;
  const sesiIdTarget = saved.sesiId;
  const k = _lemburKegiatanList.find(x => x.id === saved.kegiatanId);
  if (!k) { _lemburClearState(); return; }
  await _lemburOpenKegiatan(saved.kegiatanId);
  if (sesiIdTarget && _lemburSesiList.some(s => s.id === sesiIdTarget)) {
    await _lemburOpenSesi(sesiIdTarget);
  }
}
function _lemburKembaliDaftar() {
  _lemburClearState();
  _lemburActiveKegiatan = null;
  _lemburActiveSesi = null;
  loadLemburKegiatan(false);
}

function _lemburTodayKey() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
function _lemburIsTanggalFuture(tgl) {
  return _lemburDateKey(tgl) > _lemburTodayKey();
}

function _lemburSortByUrutanLaporan(arr) {
  return [...arr].sort((a, b) => {
    const ua = a.urutan_laporan, ub = b.urutan_laporan;
    if (ua != null && ub != null) return ua - ub;
    if (ua != null) return -1;
    if (ub != null) return 1;
    return (a.nama || '').localeCompare(b.nama || '');
  });
}

function _lemburDateKey(tgl) {
  if (!tgl) return null;
  const s = String(tgl);
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  const d = new Date(s);
  if (isNaN(d)) return s.slice(0, 10);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

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

async function loadLemburKegiatan(autoRestore = true) {
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
  if (autoRestore) await _lemburRestoreState();
}

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

function _lemburKalenderKlikTanggal(kegiatanId, sesiId) {
  navigateTo('lembur-kegiatan', 'Kegiatan Lembur', () => {
    loadLemburKegiatan(false).then(() => _lemburBukaDariKalender(kegiatanId, sesiId));
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

const _LEMBUR_STAT_ICON = {
  clip:  '<path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><rect x="8" y="2" width="8" height="4" rx="1"/><path d="M9 12h6"/><path d="M9 16h6"/>',
  cal:   '<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4"/><path d="M8 2v4"/><path d="M3 10h18"/><path d="M8 14h.01"/><path d="M12 14h.01"/><path d="M16 14h.01"/><path d="M8 18h.01"/><path d="M12 18h.01"/>',
  calp:  '<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4"/><path d="M8 2v4"/><path d="M3 10h18"/><path d="M12 14v4"/><path d="M10 16h4"/>',
  pulse: '<path d="M22 12h-4l-3 9L9 3l-3 9H2"/>',
  users: '<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>',
  photo: '<path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/>',
  warn:  '<path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>',
  ok:    '<path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>',
  edit:  '<path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/>',
  clock: '<circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>'
};

function _lemburStatCardsHtml(cards) {
  const fmt = n => Number(n).toLocaleString('id-ID');
  return `
    <div class="stat-grid" style="grid-template-columns:repeat(auto-fit,minmax(150px,1fr))">
      ${cards.map(([value, label, color, bg, icon]) => `
      <div class="stat-card" style="border-left-color:${color}">
        <div class="stat-card-body">
          <div class="stat-label">${label}</div>
          <div class="stat-value" style="color:${color}">${typeof value === 'number' ? fmt(value) : value}</div>
        </div>
        <div class="stat-icon" style="background:${bg};opacity:1">
          <svg xmlns="http://www.w3.org/2000/svg" width="17" height="17" fill="none" viewBox="0 0 24 24" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${_LEMBUR_STAT_ICON[icon]}</svg>
        </div>
      </div>`).join('')}
    </div>`;
}

const _LEMBUR_STAT_C = {
  hijau:  ['var(--hijau)', 'rgba(15,118,110,.12)'],
  ungu:   ['#7c3aed', 'rgba(124,58,237,.12)'],
  cyan:   ['#0891b2', 'rgba(8,145,178,.12)'],
  biru:   ['#2563eb', 'rgba(37,99,235,.12)'],
  amber:  ['#d97706', 'rgba(217,119,6,.12)'],
  hijauOk:['#16a34a', 'rgba(22,163,74,.12)']
};
const _lemburKartu = (k, v, label, icon) => [v, label, ..._LEMBUR_STAT_C[k], icon];

function _lemburStatsHtml(list) {
  const totalHari = list.reduce((a, k) => a + (Number(k.jumlah_sesi) || 0), 0);
  const hariBulanIni     = list.reduce((a, k) => a + (Number(k.sesi_bulan_ini) || 0), 0);
  const kegiatanBulanIni = list.filter(k => (Number(k.sesi_bulan_ini) || 0) > 0).length;
  return _lemburStatCardsHtml([
    _lemburKartu('hijau', list.length, 'Total Kegiatan', 'clip'),
    _lemburKartu('ungu',  totalHari, _lemburFull ? 'Total Hari Lembur' : 'Hari Lembur Saya', 'cal'),
    _lemburKartu('cyan',  kegiatanBulanIni, 'Kegiatan Bulan Ini', 'pulse'),
    _lemburKartu('biru',  hariBulanIni, _lemburFull ? 'Hari Lembur Bulan Ini' : 'Lembur Saya Bulan Ini', 'calp')
  ]);
}

function _lemburSesiStatsHtml(list) {
  const n = list.length;
  const totalPeserta = list.reduce((a, s) => a + (Number(s.jumlah_peserta) || 0), 0);
  const rata = n ? (totalPeserta / n).toLocaleString('id-ID', { maximumFractionDigits: 1 }) : 0;
  const totalFoto = list.reduce((a, s) => a + (Number(s.jumlah_dokumentasi) || 0), 0);
  const tanpaDok  = list.filter(s => !(Number(s.jumlah_dokumentasi) > 0)).length;
  return _lemburStatCardsHtml([
    _lemburKartu('hijau', n, _lemburFull ? 'Total Hari Lembur' : 'Hari Lembur Saya', 'cal'),
    _lemburKartu('ungu',  rata, 'Rata-rata Peserta/Hari', 'users'),
    _lemburKartu('biru',  totalFoto, 'Foto Dokumentasi', 'photo'),
    _lemburKartu('amber', tanpaDok, 'Hari Tanpa Dokumentasi', 'warn')
  ]);
}

function _lemburEntryStatsHtml() {
  if (!_lemburFull) return '';
  const s = _lemburActiveSesi || {};
  const list = _lemburEntries || [];
  const toMin = t => { const [h, m] = String(t).slice(0, 5).split(':').map(Number); return h * 60 + m; };
  let menit = 0;
  list.forEach(e => {
    const jm = e.jam_mulai || s.jam_mulai, js = e.jam_selesai || s.jam_selesai;
    if (!jm || !js) return;
    const d = toMin(js) - toMin(jm);
    if (!isNaN(d)) menit += (d + 1440) % 1440;
  });
  const jam = (menit / 60).toLocaleString('id-ID', { maximumFractionDigits: 1 }) + ' jam';
  const terisi = list.filter(e => String(e.uraian_tugas || '').trim()).length;
  return _lemburStatCardsHtml([
    _lemburKartu('hijau',   list.length, 'Peserta', 'users'),
    _lemburKartu('hijauOk', terisi, 'Uraian Terisi', 'ok'),
    _lemburKartu('amber',   list.length - terisi, 'Belum Ada Uraian', 'edit'),
    _lemburKartu('ungu',    jam, 'Total Jam Lembur', 'clock')
  ]);
}

function _lemburRefreshEntryStats() {
  const el = document.getElementById('lemburEntryStats');
  if (el) el.innerHTML = _lemburEntryStatsHtml();
}

async function _lemburRenderKegiatanList() {
  await _lemburFetchKegiatan();
  const body = document.getElementById('lemburBody');
  if (!body) return;

  const addBtn = _lemburFull
    ? `<button class="btn btn-primary btn-sm" onclick="_lemburOpenTambahKegiatan()"><svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5" style="margin-right:5px;vertical-align:-2px"><path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4"/></svg>Kegiatan Lembur</button>`
    : '';

  const total = _lemburKegiatanList.length;
  const pages = Math.max(1, Math.ceil(total / _lemburKegiatanLimit));
  if (_lemburKegiatanPage > pages) _lemburKegiatanPage = pages;
  const start = (_lemburKegiatanPage - 1) * _lemburKegiatanLimit;
  const pageItems = _lemburKegiatanList.slice(start, start + _lemburKegiatanLimit);

  const rows = pageItems.length
    ? pageItems.map((k, i) => `
        <tr class="lembur-row-plain">
          <td class="td-sticky-no" style="width:44px;text-align:center;color:var(--teks-muted)">${start + i + 1}</td>
          <td class="td-sticky-name">${esc(k.nama_kegiatan)}</td>
          <td style="text-align:center">${k.jumlah_sesi} hari${k.maks_hari ? `<div style="font-size:.7rem;color:var(--teks-muted);margin-top:2px">maks. ${k.maks_hari} hari/orang</div>` : ''}</td>
          <td style="text-align:center">${k.created_at ? fmtDate(k.created_at) : '-'}</td>
          <td style="text-align:center;white-space:nowrap">
            <button class="btn-buka" data-tip="Buka" onclick="_lemburOpenKegiatan(${k.id})"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M6 14l1.45-2.9A2 2 0 019.24 10H20a2 2 0 011.94 2.5l-1.54 6a2 2 0 01-1.94 1.5H4a2 2 0 01-2-2V5a2 2 0 012-2h3.9a2 2 0 011.69.9l.81 1.2a2 2 0 001.67.9H18a2 2 0 012 2v2"/></svg></button>
            <button class="btn-download" data-tip="Download Laporan" onclick="_lemburDownloadKegiatan(${k.id})"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-8-4V4m0 8l-3-3m3 3l3-3"/></svg></button>
            ${_lemburFull ? `<button class="btn-edit" data-tip="Ubah" onclick="_lemburOpenEditKegiatan(${k.id})"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg></button>` : ''}
            ${_lemburFull ? `<button class="btn-hapus" data-tip="Hapus" onclick="_lemburHapusKegiatan(${k.id})"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path stroke-linecap="round" stroke-linejoin="round" d="M19 6l-1 14H6L5 6"/><path stroke-linecap="round" stroke-linejoin="round" d="M10 11v6m4-6v6"/><path stroke-linecap="round" stroke-linejoin="round" d="M9 6V4h6v2"/></svg></button>` : ''}
          </td>
        </tr>
      `).join('')
    : `<tr><td colspan="5" style="text-align:center;color:var(--teks-muted)">Belum ada kegiatan lembur${_lemburFull ? '. Klik "+ Kegiatan Lembur" untuk mulai.' : '.'}</td></tr>`;

  body.innerHTML = `
    ${_lemburStatsHtml(_lemburKegiatanList)}
    <div class="lembur-toolbar" style="display:flex;justify-content:flex-end;margin-bottom:12px">${addBtn}</div>
    <div class="card" style="padding:0;overflow:auto;-webkit-overflow-scrolling:touch">
      <table class="surat-table">
        <thead><tr><th class="th-sticky-no" style="width:44px;text-align:center">No</th><th class="th-sticky-name">Nama Kegiatan</th><th>Jumlah Hari</th><th>Dibuat</th><th style="width:120px">Aksi</th></tr></thead>
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
  document.getElementById('lemburKegiatanMaksHari').value = '';
  document.querySelector('#modalLemburKegiatan .modal-title').textContent = 'Kegiatan Lembur Baru';
  document.getElementById('lemburKegiatanTanggalWrap').style.display = '';
  document.getElementById('lemburKegiatanJamWrap').style.display = '';
  document.getElementById('lemburKegiatanPesertaWrap').style.display = '';
  document.getElementById('lemburKegiatanDokWrap').style.display = '';
  document.getElementById('btnLemburTanggalTambah').style.display = '';
  document.getElementById('lemburKegiatanTanggalHint').style.display = '';
  if (typeof initCdtp === 'function') initCdtp();
  { const _c = document.getElementById('cdtp_lemburKegiatanTanggal')?._cdtp; if (_c) _c.clear(); }
  _lemburSetJamPairSilent('lemburKegiatanJamMulai', 'lemburKegiatanJamSelesai', '16:30', '19:30');
  _lemburKegiatanTanggalList = [];
  _lemburRenderTanggalChips();
  _lemburKegiatanPesertaSelected = new Set();
  _lemburKegiatanDokFiles = [];
  _lemburRenderKegiatanDokPreview();
  document.getElementById('lemburKegiatanPesertaGrid').innerHTML = '';
  { const _q = document.getElementById('lemburKegiatanPesertaSearch'); if (_q) _q.value = ''; }
  openModal('modalLemburKegiatan');
  _lemburPegawai = [];
  _lemburRenderKegiatanPesertaGrid();
}

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
  onPick: (input, x) => { input.value = x.nama; _lemburUpdateKegiatanDokVisibility(); },
  canDelete: x => _lemburNamaCustom.includes(x.nama) && !(_lemburKegiatanList || []).some(k => k.nama_kegiatan === x.nama),
  onDelete: (x) => { const i = _lemburNamaCustom.indexOf(x.nama); if (i !== -1) _lemburNamaCustom.splice(i, 1); },
}) : null;
function lemburSearchNamaKegiatan() { _lemburNamaCombo?.search(); }
document.addEventListener('input', (e) => {
  if (e.target.id === 'lemburKegiatanNama') _lemburUpdateKegiatanDokVisibility();
});
function lemburFocusNamaKegiatanBaru(e) {
  e.preventDefault();
  e.stopPropagation();
  _lemburNamaCombo?.close();
  document.getElementById('lemburNamaKegiatanBaru').value = '';
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
  document.getElementById('lemburKegiatanNama').value = nilai;
  _lemburUpdateKegiatanDokVisibility();
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
  const lebihDariSatuHari = _lemburKegiatanTanggalList.length > 1;
  const pesertaWrap = document.getElementById('lemburKegiatanPesertaWrap');
  if (pesertaWrap) {
    pesertaWrap.style.display = lebihDariSatuHari ? 'none' : '';
    if (lebihDariSatuHari && _lemburKegiatanPesertaSelected.size) _lemburKegiatanPesertaSelected = new Set();
  }
  _lemburUpdateKegiatanDokVisibility();
}

function _lemburUpdateKegiatanDokVisibility() {
  const dokWrap = document.getElementById('lemburKegiatanDokWrap');
  if (!dokWrap) return;
  const nama = document.getElementById('lemburKegiatanNama')?.value.trim();
  const tanggalOk = _lemburKegiatanTanggalList.length === 1;
  const pesertaOk = _lemburKegiatanPesertaSelected.size > 0;
  const tampil = !!nama && tanggalOk && pesertaOk;
  dokWrap.style.display = tampil ? '' : 'none';
  if (!tampil && _lemburKegiatanDokFiles.length) {
    _lemburKegiatanDokFiles = [];
    _lemburRenderKegiatanDokPreview();
  }
}

function _lemburAddTanggalChip() {
  const tgl = document.getElementById('lemburKegiatanTanggal').value;
  if (!tgl) { toast('Pilih tanggal terlebih dahulu', 'error'); return; }
  if (_lemburIsTanggalFuture(tgl)) { toast('Tanggal belum bisa dipilih - lembur cuma bisa dicatat untuk tanggal yang sudah terjadi', 'error'); return; }
  if (_lemburKegiatanTanggalList.includes(tgl)) { toast('Tanggal itu sudah ditambahkan', 'error'); return; }
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
  document.getElementById('lemburKegiatanMaksHari').value = k.maks_hari || '';
  document.querySelector('#modalLemburKegiatan .modal-title').textContent = 'Ubah Kegiatan';
  document.getElementById('lemburKegiatanTanggalWrap').style.display = 'none';
  document.getElementById('lemburKegiatanJamWrap').style.display = 'none';
  document.getElementById('lemburKegiatanPesertaWrap').style.display = 'none';
  document.getElementById('lemburKegiatanDokWrap').style.display = 'none';
  openModal('modalLemburKegiatan');
}

async function _lemburSubmitTambahKegiatan() {
  const nama = document.getElementById('lemburKegiatanNama').value.trim();
  if (!nama) { toast('Nama kegiatan wajib diisi', 'error'); return; }
  const maksRaw = document.getElementById('lemburKegiatanMaksHari').value.trim();
  if (maksRaw !== '' && (!/^\d+$/.test(maksRaw) || +maksRaw < 1 || +maksRaw > 365)) { toast('Maksimal hari harus angka bulat 1-365, atau kosongkan', 'error'); return; }
  const maks_hari = maksRaw === '' ? null : +maksRaw;

  const sudahAda = (_lemburKegiatanList || []).some(k =>
    k.nama_kegiatan.trim().toLowerCase() === nama.toLowerCase() && k.id !== _lemburKegiatanEditId
  );
  if (sudahAda) {
    toast(`Kegiatan "${nama}" sudah ada. Pakai "+ Tambah Hari Lembur" di kegiatan itu buat nambah tanggal lagi.`, 'error');
    return;
  }

  if (_lemburKegiatanEditId) {
    closeModal('modalLemburKegiatan');
    _lemburUpdateKegiatan(_lemburKegiatanEditId, nama, maks_hari);
    return;
  }

  const tanggalPicker = document.getElementById('lemburKegiatanTanggal').value;
  let tanggalList = [..._lemburKegiatanTanggalList];
  if (!tanggalList.length && tanggalPicker) tanggalList = [tanggalPicker];
  if (!tanggalList.length) { toast('Tanggal lembur wajib diisi', 'error'); return; }
  const tglFuture = tanggalList.find(t => _lemburIsTanggalFuture(t));
  if (tglFuture) {
    const label = new Date(tglFuture).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
    toast(`${label} belum terjadi - lembur cuma bisa dicatat untuk tanggal yang sudah lewat`, 'error');
    return;
  }

  const btn = document.getElementById('btnSaveLemburKegiatan');
  const _btnOrigHtml = btn ? btn.innerHTML : null;
  if (btn) { btn.disabled = true; btn.innerHTML = `<span class="btn-spin" style="width:11px;height:11px"></span> Mengecek...`; }
  try {
    const hasilCek = await Promise.all(tanggalList.map(async tanggal => {
      try {
        const r = await fetch(`/api/lembur/cek-tanggal?tanggal=${tanggal}`, { headers: authHeaders() });
        const d = await r.json();
        return { tanggal, terpakai: !!(r.ok && d.terpakai), nama_kegiatan: d.nama_kegiatan || null };
      } catch { return { tanggal, terpakai: false, nama_kegiatan: null }; }
    }));
    const bentrok = hasilCek.filter(h => h.terpakai);
    if (bentrok.length) {
      const detail = bentrok.map(h => `${new Date(h.tanggal).toLocaleDateString('id-ID', { day: 'numeric', month: 'long' })} (di kegiatan "${h.nama_kegiatan}")`).join(', ');
      toast(`Tanggal bentrok, belum disimpan: ${detail}. Ganti atau hapus tanggal itu dulu.`, 'error');
      return;
    }
  } finally { if (btn) btn.disabled = false; }

  const jam_mulai = tpGetValue('lemburKegiatanJamMulai');
  let jam_selesai = tpGetValue('lemburKegiatanJamSelesai');
  const jamSelesaiMax = _lemburJamSelesaiMax3(jam_mulai, jam_selesai);
  if (jamSelesaiMax !== jam_selesai) {
    jam_selesai = jamSelesaiMax;
    tpSetValue('lemburKegiatanJamSelesai', jam_selesai);
    toast('Durasi lembur maksimal 3 jam - jam selesai otomatis disesuaikan', 'error');
  }
  const peserta_ids = [..._lemburKegiatanPesertaSelected];
  const dokFiles = _lemburKegiatanDokFiles;
  closeModal('modalLemburKegiatan');
  _lemburCreateKegiatanMulti(nama, tanggalList, jam_mulai, jam_selesai, peserta_ids, dokFiles, maks_hari);
}

async function _lemburUpdateKegiatan(id, nama_kegiatan, maks_hari = null) {
  try {
    const r = await fetch(`/api/lembur/kegiatan/${id}`, { method: 'PUT', headers: { ...authHeaders(), 'Content-Type': 'application/json' }, body: JSON.stringify({ nama_kegiatan, maks_hari }) });
    const d = await r.json();
    if (!r.ok) { toast(d.error || 'Gagal mengubah kegiatan', 'error'); return; }

    toast('Kegiatan diperbarui', 'success');
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

async function _lemburCreateKegiatanMulti(nama_kegiatan, tanggalList, jam_mulai, jam_selesai, peserta_ids = [], dokFiles = [], maks_hari = null) {
  try {
    const r = await fetch('/api/lembur/kegiatan', { method: 'POST', headers: { ...authHeaders(), 'Content-Type': 'application/json' }, body: JSON.stringify({ nama_kegiatan, maks_hari }) });
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

    if (firstSesi) {
      for (const f of dokFiles) { await _lemburUploadOneDokTo(firstSesi.id, f); }
    }

    if (!firstSesi) { toast(gagalDetail.length ? `Gagal: ${gagalDetail.join(', ')}` : 'Gagal menyimpan hari lembur', 'error'); return; }
    toast(gagal
      ? `${sukses} hari lembur ditambahkan. Gagal: ${gagalDetail.join(', ')}`
      : 'Kegiatan lembur ditambahkan', gagal ? 'error' : 'success');

    _lemburView = 'kegiatan';
    await _lemburRenderKegiatanList();
  } catch { toast('Gagal menyimpan kegiatan', 'error'); }
}

function _lemburFilterPegawai(list, inputId) {
  const q = (document.getElementById(inputId)?.value || '').toLowerCase().trim();
  if (!q) return list;
  const tokens = q.split(/\s+/);
  return list.filter(p => {
    const hay = ((p.nama || '') + ' ' + (p.nip || '')).toLowerCase();
    return tokens.every(t => hay.includes(t));
  });
}

function _lemburRenderKegiatanPesertaGrid() {
  const grid = document.getElementById('lemburKegiatanPesertaGrid');
  if (!grid) return;
  const belumPilihTanggal = !document.getElementById('lemburKegiatanTanggal')?.value;
  _lemburPegawai.forEach(p => { if (_lemburStatusAbsensi(p.absensi_status)) _lemburKegiatanPesertaSelected.delete(p.id); });
  const tampil = _lemburFilterPegawai(_lemburPegawai, 'lemburKegiatanPesertaSearch');
  grid.innerHTML = tampil.length
    ? tampil.map(p => {
        const st = _lemburStatusAbsensi(p.absensi_status);
        return `
        <div class="perm-item${_lemburKegiatanPesertaSelected.has(p.id) ? ' selected' : ''}" style="${st ? 'opacity:.55;cursor:not-allowed' : ''}" ${st ? '' : `onclick="_lemburToggleKegiatanPeserta(${p.id}, this)"`}>
          <div class="perm-check"></div>
          <div>
            <div class="perm-name" style="display:flex;align-items:center;gap:6px;flex-wrap:wrap">${esc(p.nama)}${st ? ` <span class="badge ${st.badge}" style="font-size:.68em;padding:2px 8px">${st.label}</span>` : ''}</div>
            <div class="perm-desc">${p.nip ? 'NIP. ' + esc(p.nip) : ''}</div>
          </div>
        </div>`;
      }).join('')
    : _lemburPegawai.length
      ? `<div style="text-align:center;color:var(--teks-muted);padding:8px;font-size:.82rem">Tidak ada pegawai yang cocok.</div>`
      : belumPilihTanggal
      ? `<div style="text-align:center;color:var(--teks-muted);padding:8px;font-size:.82rem">Pilih tanggal lembur dulu untuk menampilkan daftar peserta.</div>`
      : `<div style="text-align:center;color:var(--teks-muted);padding:8px;font-size:.82rem">Belum ada data pegawai.</div>`;
  _lemburUpdateKegiatanSelectAllLabel();
  _lemburUpdateKegiatanDokVisibility();
}

function _lemburToggleKegiatanPeserta(id, el) {
  if (_lemburKegiatanPesertaSelected.has(id)) { _lemburKegiatanPesertaSelected.delete(id); el.classList.remove('selected'); }
  else { _lemburKegiatanPesertaSelected.add(id); el.classList.add('selected'); }
  _lemburUpdateKegiatanSelectAllLabel();
  _lemburUpdateKegiatanDokVisibility();
}

function _lemburUpdateKegiatanSelectAllLabel() {
  const label = document.getElementById('lemburKegiatanPesertaSelectAll');
  if (!label) return;
  label.style.display = _lemburPegawai.length ? '' : 'none';
  const selectable = _lemburFilterPegawai(_lemburPegawai, 'lemburKegiatanPesertaSearch').filter(p => !_lemburStatusAbsensi(p.absensi_status));
  const allSelected = selectable.length > 0 && selectable.every(p => _lemburKegiatanPesertaSelected.has(p.id));
  label.textContent = allSelected ? 'Batalkan Semua' : 'Pilih Semua';
}

function _lemburToggleSelectAllKegiatanPeserta() {
  const grid = document.getElementById('lemburKegiatanPesertaGrid');
  if (!grid) return;
  const selectable = _lemburFilterPegawai(_lemburPegawai, 'lemburKegiatanPesertaSearch').filter(p => !_lemburStatusAbsensi(p.absensi_status));
  const allSelected = selectable.length > 0 && selectable.every(p => _lemburKegiatanPesertaSelected.has(p.id));
  if (allSelected) selectable.forEach(p => _lemburKegiatanPesertaSelected.delete(p.id));
  else selectable.forEach(p => _lemburKegiatanPesertaSelected.add(p.id));
  _lemburRenderKegiatanPesertaGrid();
  _lemburUpdateKegiatanDokVisibility();
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
  _lemburActiveSesi = null;
  _lemburView = 'sesi';
  _lemburSaveState();
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
    ? `<button class="btn btn-primary btn-sm" onclick="_lemburOpenTambahSesi()"><svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5" style="margin-right:5px;vertical-align:-2px"><path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4"/></svg>Tambah Hari Lembur</button>`
    : '';

  const daftarSesi = _lemburFull ? _lemburSesiList : _lemburSesiList.filter(s => s.is_peserta);

  const rows = daftarSesi.length
    ? daftarSesi.map((s, i) => `
        <tr class="lembur-row-plain" data-sesi-id="${s.id}">
          <td class="td-sticky-no" style="width:44px;text-align:center;color:var(--teks-muted)">${i + 1}</td>
          <td class="td-sticky-name" style="text-align:center">${new Date(s.tanggal).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</td>
          <td style="text-align:center">${s.jam_mulai ? s.jam_mulai.slice(0,5) : '-'} WITA - ${s.jam_selesai ? s.jam_selesai.slice(0,5) : '-'} WITA</td>
          <td style="text-align:center">${s.jumlah_peserta} pegawai</td>
          <td style="text-align:center;white-space:nowrap" data-col="dok">
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
          <td style="text-align:center;white-space:nowrap">
            <button class="btn-buka" data-tip="Buka" onclick="_lemburOpenSesi(${s.id})"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M6 14l1.45-2.9A2 2 0 019.24 10H20a2 2 0 011.94 2.5l-1.54 6a2 2 0 01-1.94 1.5H4a2 2 0 01-2-2V5a2 2 0 012-2h3.9a2 2 0 011.69.9l.81 1.2a2 2 0 001.67.9H18a2 2 0 012 2v2"/></svg></button>
            <button class="btn-download" data-tip="Download Laporan" onclick="_lemburDownloadSesi(${s.id})"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-8-4V4m0 8l-3-3m3 3l3-3"/></svg></button>
            <button class="btn-edit" data-tip="Ubah Tanggal/Jam" onclick="_lemburEditJam(${s.id})"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg></button>
            <button class="btn-hapus" data-tip="Hapus Hari Ini" onclick="_lemburHapusSesiIni(${s.id})"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path stroke-linecap="round" stroke-linejoin="round" d="M19 6l-1 14H6L5 6"/><path stroke-linecap="round" stroke-linejoin="round" d="M10 11v6m4-6v6"/><path stroke-linecap="round" stroke-linejoin="round" d="M9 6V4h6v2"/></svg></button>
          </td>` : `
          <td style="text-align:center;white-space:nowrap">
            <button class="btn-buka" data-tip="Isi Uraian Tugas" onclick="_lemburOpenSesi(${s.id})"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M6 14l1.45-2.9A2 2 0 019.24 10H20a2 2 0 011.94 2.5l-1.54 6a2 2 0 01-1.94 1.5H4a2 2 0 01-2-2V5a2 2 0 012-2h3.9a2 2 0 011.69.9l.81 1.2a2 2 0 001.67.9H18a2 2 0 012 2v2"/></svg></button>
            <button class="btn-download" data-tip="Download Laporan" onclick="_lemburDownloadSesi(${s.id})"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-8-4V4m0 8l-3-3m3 3l3-3"/></svg></button>
          </td>`}
        </tr>
      `).join('')
    : `<tr><td colspan="6" style="text-align:center;color:var(--teks-muted)">Belum ada hari lembur tercatat.</td></tr>`;

  body.innerHTML = `
    ${_lemburSesiStatsHtml(daftarSesi)}
    <div class="lembur-toolbar" style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;margin-bottom:12px">
      <button class="btn btn-sm lembur-btn-kembali" onclick="_lemburKembaliDaftar()"><svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.4"><path stroke-linecap="round" stroke-linejoin="round" d="M19 12H5m0 0l6-6m-6 6l6 6"/></svg>Kembali</button>
      ${_lemburActiveKegiatan?.maks_hari ? `<span class="periode-info-bar"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path stroke-linecap="round" stroke-linejoin="round" d="M12 16v-4m0-4h.01"/></svg>Maksimal ${_lemburActiveKegiatan.maks_hari} hari per orang</span>` : ''}
      ${addBtn}
    </div>
    <div class="card" style="padding:0;overflow:auto;-webkit-overflow-scrolling:touch">
      <table class="surat-table">
        <thead><tr><th class="th-sticky-no" style="width:44px;text-align:center">No</th><th class="th-sticky-name">Tanggal</th><th>Jam Lembur</th><th>Peserta</th><th>Dokumentasi</th><th style="width:170px">Aksi</th></tr></thead>
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
  _lemburSetJamPairSilent('lemburSesiJamMulai', 'lemburSesiJamSelesai', '16:30', '19:30');
  _lemburPesertaSelected = new Set();
  document.getElementById('lemburSesiPesertaGrid').innerHTML = '';
  { const _q = document.getElementById('lemburSesiPesertaSearch'); if (_q) _q.value = ''; }
  document.getElementById('btnSaveLemburSesi').setAttribute('onclick', '_lemburSubmitSesi()');
  openModal('modalLemburSesi');
  await _lemburFetchPegawai(document.getElementById('lemburSesiTanggal').value);
  _lemburRenderSesiPesertaGrid();
}

function _lemburRenderSesiPesertaGrid(excludeIds = []) {
  const grid = document.getElementById('lemburSesiPesertaGrid');
  if (!grid) return;
  const exclude = new Set(excludeIds);
  const semua = _lemburPegawai.filter(p => !exclude.has(p.id));
  semua.forEach(p => { if (_lemburStatusAbsensi(p.absensi_status)) _lemburPesertaSelected.delete(p.id); });
  const options = _lemburFilterPegawai(semua, 'lemburSesiPesertaSearch');
  grid.innerHTML = options.length
    ? options.map(p => {
        const st = _lemburStatusAbsensi(p.absensi_status);
        return `
        <div class="perm-item${_lemburPesertaSelected.has(p.id) ? ' selected' : ''}" style="${st ? 'opacity:.55;cursor:not-allowed' : ''}" ${st ? '' : `onclick="_lemburToggleSesiPeserta(${p.id}, this)"`}>
          <div class="perm-check"></div>
          <div>
            <div class="perm-name" style="display:flex;align-items:center;gap:6px;flex-wrap:wrap">${esc(p.nama)}${st ? ` <span class="badge ${st.badge}" style="font-size:.68em;padding:2px 8px">${st.label}</span>` : ''}</div>
            <div class="perm-desc">${p.nip ? 'NIP. ' + esc(p.nip) : ''}</div>
          </div>
        </div>`;
      }).join('')
    : semua.length
      ? `<div style="text-align:center;color:var(--teks-muted);padding:8px;font-size:.82rem">Tidak ada pegawai yang cocok.</div>`
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
  label.style.display = _lemburPegawai.length ? '' : 'none';
  const selectable = (options || _lemburFilterPegawai(_lemburPegawai, 'lemburSesiPesertaSearch')).filter(p => !_lemburStatusAbsensi(p.absensi_status));
  const allSelected = selectable.length > 0 && selectable.every(p => _lemburPesertaSelected.has(p.id));
  label.textContent = allSelected ? 'Batalkan Semua' : 'Pilih Semua';
}

function _lemburToggleSelectAllSesiPeserta() {
  const grid = document.getElementById('lemburSesiPesertaGrid');
  if (!grid) return;
  const selectable = _lemburFilterPegawai(_lemburPegawai, 'lemburSesiPesertaSearch').filter(p => !_lemburStatusAbsensi(p.absensi_status));
  const allSelected = selectable.length > 0 && selectable.every(p => _lemburPesertaSelected.has(p.id));
  if (allSelected) selectable.forEach(p => _lemburPesertaSelected.delete(p.id));
  else selectable.forEach(p => _lemburPesertaSelected.add(p.id));
  _lemburRenderSesiPesertaGrid();
}

function _lemburSubmitSesi() {
  const tanggal = document.getElementById('lemburSesiTanggal').value;
  const jam_mulai = document.getElementById('lemburSesiJamMulai').value;
  let jam_selesai = document.getElementById('lemburSesiJamSelesai').value;
  if (!tanggal) { toast('Tanggal wajib diisi', 'error'); return; }
  if (_lemburIsTanggalFuture(tanggal)) { toast('Tanggal belum bisa dipilih - lembur cuma bisa dicatat untuk tanggal yang sudah terjadi', 'error'); return; }
  const jamSelesaiMax = _lemburJamSelesaiMax3(jam_mulai, jam_selesai);
  if (jamSelesaiMax !== jam_selesai) {
    jam_selesai = jamSelesaiMax;
    tpSetValue('lemburSesiJamSelesai', jam_selesai);
    toast('Durasi lembur maksimal 3 jam - jam selesai otomatis disesuaikan', 'error');
  }
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

function _lemburStatusAbsensi(status) {
  if (status === 'cuti') return { label: 'Cuti', badge: 'badge-fuchsia' };
  if (status === 'alpa') return { label: 'Alpa', badge: 'badge-merah' };
  if (status === 'tugas_luar' || status === 'izin' || status === 'sakit') return { label: 'Tugas Luar', badge: 'badge-biru' };
  return null;
}

async function _lemburOnKegiatanTanggalChange() {
  if (!_lemburFull) return;
  const tgl = document.getElementById('lemburKegiatanTanggal').value;
  if (!tgl) {
    _lemburPegawai = [];
    _lemburKegiatanPesertaSelected = new Set();
    _lemburRenderKegiatanPesertaGrid();
    return;
  }
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
  _lemburSaveState();
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

  const pesertaTampil = _lemburFull ? _lemburEntries : _lemburEntries.filter(e => e.user_id === _user.id);

  const pesertaRows = pesertaTampil.map((e, i) => {
    const bisaEdit = _lemburFull || e.user_id === _user.id;
    const jamCellHtml = _lemburFull
      ? `<div style="display:flex;align-items:center;justify-content:center;gap:4px">
            ${_lemburJamPairHtml(e.id, 'jam_mulai', e.jam_mulai, s.jam_mulai)}
            <span style="color:var(--teks-muted);font-size:.72rem">–</span>
            ${_lemburJamPairHtml(e.id, 'jam_selesai', e.jam_selesai, s.jam_selesai)}
          </div>`
      : `${(e.jam_mulai || s.jam_mulai) ? (e.jam_mulai || s.jam_mulai).slice(0,5) : '-'} WITA - ${(e.jam_selesai || s.jam_selesai) ? (e.jam_selesai || s.jam_selesai).slice(0,5) : '-'} WITA`;
    const hapusBtn = _lemburFull ? `<button class="btn-hapus" data-tip="Hapus Peserta" onclick="_lemburHapusPeserta(${e.id})"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path stroke-linecap="round" stroke-linejoin="round" d="M19 6l-1 14H6L5 6"/><path stroke-linecap="round" stroke-linejoin="round" d="M10 11v6m4-6v6"/><path stroke-linecap="round" stroke-linejoin="round" d="M9 6V4h6v2"/></svg></button>` : '';
    return `
      <tr>
        <td class="td-sticky-no" style="width:44px;text-align:center;color:var(--teks-muted);vertical-align:top">${i + 1}</td>
        <td class="td-sticky-name" style="vertical-align:top">
          <div style="display:flex;align-items:center;gap:10px">
            <div class="lembur-peserta-avatar" style="flex-shrink:0">${_lemburAvatarHtml(e)}</div>
            <div style="min-width:0">
              <div class="lembur-peserta-nama" style="white-space:normal;overflow-wrap:break-word">${esc(e.nama)}</div>
              <div class="lembur-peserta-nip">NIP. ${esc(e.nip || '-')}</div>
            </div>
          </div>
        </td>
        <td style="vertical-align:top;text-align:center">${tanggalCell}</td>
        <td style="vertical-align:top;text-align:center">${jamCellHtml}</td>
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
    <div id="lemburEntryStats">${_lemburEntryStatsHtml()}</div>
    <div class="lembur-toolbar" style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">
      <button class="btn btn-sm lembur-btn-kembali" onclick="_lemburOpenKegiatan(${_lemburActiveKegiatan.id})"><svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.4"><path stroke-linecap="round" stroke-linejoin="round" d="M19 12H5m0 0l6-6m-6 6l6 6"/></svg>Kembali</button>
      ${_lemburFull ? `<button class="btn btn-primary btn-sm" onclick="_lemburEditJam()"><svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5" style="margin-right:5px;vertical-align:-2px"><path stroke-linecap="round" stroke-linejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"/></svg>Kelola Peserta</button>` : ''}
    </div>
    <div class="card" style="padding:0;overflow:auto;-webkit-overflow-scrolling:touch">
      <table class="surat-table" style="table-layout:fixed;width:100%;min-width:700px">
        <thead>
          <tr><th class="th-sticky-no" style="width:44px;text-align:center">No</th><th class="th-sticky-name">Pegawai</th><th style="width:12%;text-align:center">Tanggal</th><th style="width:${_lemburFull ? '17' : '14'}%;text-align:center">Jam Lembur</th><th style="width:${_lemburFull ? '23' : '29'}%">Uraian Tugas</th><th style="width:${_lemburFull ? '15' : '18'}%">Catatan</th>${_lemburFull ? '<th style="width:6%;text-align:center">Aksi</th>' : ''}</tr>
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
    const en = (_lemburEntries || []).find(e => e.id === entryId);
    if (en) { en.uraian_tugas = uraian_tugas; _lemburRefreshEntryStats(); }
  } catch { toast('Gagal menyimpan uraian tugas', 'error'); }
}

async function _lemburSaveCatatan(entryId, catatan) {
  try {
    const r = await fetch(`/api/lembur/entries/${entryId}`, { method: 'PUT', headers: { ...authHeaders(), 'Content-Type': 'application/json' }, body: JSON.stringify({ catatan }) });
    const d = await r.json();
    if (!r.ok) { toast(d.error || 'Gagal menyimpan catatan', 'error'); return; }
    toast('Catatan tersimpan', 'success');
  } catch { toast('Gagal menyimpan catatan', 'error'); }
}

function _lemburJamSelesaiMax3(jamMulai, jamSelesai) {
  if (!jamMulai || !jamSelesai) return jamSelesai;
  const [h1, m1] = jamMulai.split(':').map(Number);
  const [h2, m2] = jamSelesai.split(':').map(Number);
  let menit = (h2 * 60 + m2) - (h1 * 60 + m1);
  if (menit < 0) menit += 24 * 60;
  if (menit <= 180) return jamSelesai;
  let total = ((h1 * 60 + m1) + 180) % (24 * 60);
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
}

let _lemburSuppressJamChange = false;
let _lemburJamValidasiTimer = null;
document.addEventListener('change', (e) => {
  if (_lemburSuppressJamChange) return;
  const pasangan = {
    lemburKegiatanJamMulai: 'lemburKegiatanJamSelesai', lemburKegiatanJamSelesai: 'lemburKegiatanJamMulai',
    lemburSesiJamMulai: 'lemburSesiJamSelesai', lemburSesiJamSelesai: 'lemburSesiJamMulai',
  };
  if (!(e.target.id in pasangan)) return;
  const mulaiId = e.target.id.endsWith('JamMulai') ? e.target.id : pasangan[e.target.id];
  const selesaiId = e.target.id.endsWith('JamSelesai') ? e.target.id : pasangan[e.target.id];
  clearTimeout(_lemburJamValidasiTimer);
  _lemburJamValidasiTimer = setTimeout(() => {
    const jamMulai = tpGetValue(mulaiId);
    const jamSelesai = tpGetValue(selesaiId);
    const jamSelesaiMax = _lemburJamSelesaiMax3(jamMulai, jamSelesai);
    if (jamSelesaiMax !== jamSelesai) {
      tpSetValue(selesaiId, jamSelesaiMax);
      toast('Durasi lembur maksimal 3 jam - jam selesai otomatis disesuaikan', 'error');
    }
  }, 700);
});

function _lemburSetJamPairSilent(mulaiId, selesaiId, jamMulai, jamSelesai) {
  clearTimeout(_lemburJamValidasiTimer);
  _lemburSuppressJamChange = true;
  tpSetValue(mulaiId, jamMulai);
  tpSetValue(selesaiId, jamSelesai);
  _lemburSuppressJamChange = false;
}

function _lemburJamPairHtml(entryId, field, rawValue, sesiValue) {
  const tampil = rawValue || sesiValue || '';
  const hh = tampil ? tampil.slice(0, 2) : '';
  const mm = tampil ? tampil.slice(3, 5) : '';
  const inputStyle = 'width:26px;font-size:.75rem;padding:3px 2px;border:1px solid var(--border);border-radius:5px;font-family:inherit;text-align:center';
  return `<span class="lembur-jam-pair" data-tampil="${tampil}" data-tip="Jam khusus peserta ini - kosongkan untuk ikut jam sesi" onfocusout="_lemburJamPairFocusOut(event, ${entryId}, '${field}')">
    <input type="text" inputmode="numeric" maxlength="2" placeholder="00" value="${hh}" style="${inputStyle}"
      id="lemburJamH_${entryId}_${field}">
    <span style="color:var(--teks-muted);font-size:.72rem">:</span>
    <input type="text" inputmode="numeric" maxlength="2" placeholder="00" value="${mm}" style="${inputStyle}"
      id="lemburJamM_${entryId}_${field}">
  </span>`;
}

function _lemburJamPairFocusOut(e, entryId, field) {
  const wrap = e.currentTarget;
  setTimeout(() => {
    if (wrap.contains(document.activeElement)) return;
    _lemburJamPartCommit(entryId, field);
  }, 0);
}

function _lemburJamPartCommit(entryId, field) {
  const h = document.getElementById(`lemburJamH_${entryId}_${field}`);
  const m = document.getElementById(`lemburJamM_${entryId}_${field}`);
  if (!h || !m) return;
  const wrap = h.closest('.lembur-jam-pair');
  const tampilAwal = wrap ? wrap.dataset.tampil : '';
  const hv = h.value.trim();
  const mv = m.value.trim();

  if (hv === '' && mv === '') {
    if (tampilAwal === '') return;
    wrap.dataset.tampil = '';
    _lemburSaveJamPeserta(entryId, field, '');
    return;
  }

  let hn = parseInt(hv, 10); if (isNaN(hn)) hn = 0;
  let mn = parseInt(mv, 10); if (isNaN(mn)) mn = 0;
  hn = Math.min(23, Math.max(0, hn));
  mn = Math.min(59, Math.max(0, mn));
  let hasil = `${String(hn).padStart(2, '0')}:${String(mn).padStart(2, '0')}`;

  const entry = _lemburEntries.find(e => e.id === entryId) || {};
  const s = _lemburActiveSesi || {};
  const otherField = field === 'jam_mulai' ? 'jam_selesai' : 'jam_mulai';
  const otherRaw = entry[otherField] || s[otherField] || '';
  const other = otherRaw ? otherRaw.slice(0, 5) : '';
  if (other) {
    const jamMulai = field === 'jam_mulai' ? hasil : other;
    const jamSelesaiLama = field === 'jam_selesai' ? hasil : other;
    const jamSelesaiMax = _lemburJamSelesaiMax3(jamMulai, jamSelesaiLama);
    if (jamSelesaiMax !== jamSelesaiLama) {
      toast('Durasi lembur maksimal 3 jam - jam selesai otomatis disesuaikan', 'error');
      if (field === 'jam_selesai') {
        hasil = jamSelesaiMax;
        h.value = jamSelesaiMax.slice(0, 2);
        m.value = jamSelesaiMax.slice(3, 5);
      } else {
        const hSel = document.getElementById(`lemburJamH_${entryId}_jam_selesai`);
        const mSel = document.getElementById(`lemburJamM_${entryId}_jam_selesai`);
        const wrapSel = hSel ? hSel.closest('.lembur-jam-pair') : null;
        if (hSel && mSel) { hSel.value = jamSelesaiMax.slice(0, 2); mSel.value = jamSelesaiMax.slice(3, 5); }
        if (wrapSel) wrapSel.dataset.tampil = jamSelesaiMax;
        entry.jam_selesai = jamSelesaiMax;
        _lemburSaveJamPeserta(entryId, 'jam_selesai', jamSelesaiMax);
      }
    }
  }

  h.value = hasil.slice(0, 2);
  m.value = hasil.slice(3, 5);

  if (hasil === tampilAwal) return;
  wrap.dataset.tampil = hasil;
  entry[field] = hasil;
  _lemburSaveJamPeserta(entryId, field, hasil);
}

async function _lemburSaveJamPeserta(entryId, field, value) {
  try {
    const r = await fetch(`/api/lembur/entries/${entryId}`, { method: 'PUT', headers: { ...authHeaders(), 'Content-Type': 'application/json' }, body: JSON.stringify({ [field]: value || null }) });
    const d = await r.json();
    if (!r.ok) { toast(d.error || 'Gagal menyimpan jam', 'error'); return; }
    const idx = _lemburEntries.findIndex(e => e.id === entryId);
    if (idx > -1) _lemburEntries[idx] = { ..._lemburEntries[idx], [field]: d.entry[field], updated_at: d.entry.updated_at };
    _lemburRenderSesiDetailJagaFokus();
    toast('Jam tersimpan', 'success', 'lembur-jam-tersimpan');
  } catch { toast('Gagal menyimpan jam', 'error'); }
}

function _lemburRenderSesiDetailJagaFokus() {
  const activeEl = document.activeElement;
  const activeId = activeEl && activeEl.id;
  const activeIsJamInput = activeId && /^lemburJam[HM]_/.test(activeId);
  const selStart = activeIsJamInput ? activeEl.selectionStart : null;
  const selEnd = activeIsJamInput ? activeEl.selectionEnd : null;
  _lemburRenderSesiDetail();
  if (activeIsJamInput) {
    const el = document.getElementById(activeId);
    if (el) {
      el.focus();
      try { el.setSelectionRange(selStart, selEnd); } catch(e) {}
    }
  }
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
  _lemburSetJamPairSilent('lemburSesiJamMulai', 'lemburSesiJamSelesai',
    _lemburActiveSesi.jam_mulai ? _lemburActiveSesi.jam_mulai.slice(0,5) : '00:00',
    _lemburActiveSesi.jam_selesai ? _lemburActiveSesi.jam_selesai.slice(0,5) : '00:00');
  document.getElementById('btnSaveLemburSesi').setAttribute('onclick', '_lemburSubmitEditJam()');
  openModal('modalLemburSesi');

  if (_lemburFull) {
    _lemburPesertaSelected = new Set();
    { const _q = document.getElementById('lemburSesiPesertaSearch'); if (_q) _q.value = ''; }
    document.getElementById('lemburSesiPesertaGrid').innerHTML = `<div style="text-align:center;color:var(--teks-muted);padding:8px;font-size:.82rem"><span class="btn-spin" style="width:11px;height:11px;vertical-align:-2px;margin-right:4px"></span>Memuat peserta...</div>`;
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
  let jam_selesai = document.getElementById('lemburSesiJamSelesai').value;
  if (!tanggal) { toast('Tanggal wajib diisi', 'error'); return; }
  const jamSelesaiMax = _lemburJamSelesaiMax3(jam_mulai, jam_selesai);
  if (jamSelesaiMax !== jam_selesai) {
    jam_selesai = jamSelesaiMax;
    tpSetValue('lemburSesiJamSelesai', jam_selesai);
    toast('Durasi lembur maksimal 3 jam - jam selesai otomatis disesuaikan', 'error');
  }
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

function _uploadFileWithProgress(file, kategori, onProgress) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    const fd  = new FormData();
    fd.append('file', file);
    fd.append('kategori', kategori);
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

function _lemburDokUrlCetak(url) {
  if (!url || !url.includes('/upload/')) return url;
  return url.replace('/upload/', '/upload/f_auto,q_auto,w_1000,c_limit/');
}

function _lemburHalamanSesiHtml(s, entries, dok, namaTtd, nipTtd, pageBreak) {
  const tgl = new Date(s.tanggal).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  const tglTtd = new Date(s.tanggal).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
  const rowsHtml = entries.map((e, i) => {
    const jm = e.jam_mulai || s.jam_mulai;
    const js = e.jam_selesai || s.jam_selesai;
    return `
    <tr>
      <td style="padding:5px 6px;border:1px solid #000;text-align:center;font-size:9px;vertical-align:top">${i+1}</td>
      <td style="padding:5px 6px;border:1px solid #000;font-size:9px;vertical-align:top">${esc(e.nama)}<br><span style="color:#64748b">${e.nip ? 'NIP. ' + esc(e.nip) : ''}</span></td>
      <td style="padding:5px 6px;border:1px solid #000;text-align:center;font-size:9px;vertical-align:top">${jm ? jm.slice(0,5) + ' WITA' : ''}</td>
      <td style="padding:5px 6px;border:1px solid #000;text-align:center;font-size:9px;vertical-align:top">${js ? js.slice(0,5) + ' WITA' : ''}</td>
      <td style="padding:5px 6px;border:1px solid #000;font-size:9px;vertical-align:top">${e.uraian_tugas ? _lapMdToHtml(e.uraian_tugas, true) : ''}</td>
      <td style="padding:5px 6px;border:1px solid #000;vertical-align:top"></td>
    </tr>`;
  }).join('');

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
