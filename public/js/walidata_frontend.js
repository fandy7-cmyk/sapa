// ═══════════════════════════════════════════════════════════════════════════
//  Walidata - Data SSD & Kelola Indikator (SAPA Perencanaan)
//  Memakai helper global SAPA: authHeaders, toast, showConfirm, openModal, closeModal, esc, _loadXlsx, hasAccess
//  Halaman & modal dibuat dinamis, jadi app.html cukup menambah satu <script>.
// ═══════════════════════════════════════════════════════════════════════════
const WD_API = '/.netlify/functions/walidata';

const _wd = {
  tahun: new Date().getFullYear(),
  data: null,              // respons /data
  rows: [],
  page: 1, perPage: 10,
  indPage: 1, indPerPage: 15,   // pagination Kelola Indikator
  unitFilter: '', search: '',
  indikator: [],           // master (Kelola Indikator)
  bidang: [],
  editId: null,
  importRows: [], importHasil: [],
};

const WD_AGREGASI = {
  jumlah: 'Jumlah (penjumlahan)', rata_rata: 'Rata-rata', maksimum: 'Nilai tertinggi',
  minimum: 'Nilai terendah', tidak_diagregasi: 'Tidak diagregasi (lihat per unit)',
};

// ── util ───────────────────────────────────────────────────────────────────
function _wdAdmin()  { return hasAccess('walidata.full'); }
async function _wdFetch(path, opts = {}) {
  const res = await fetch(WD_API + path, { ...opts, headers: { ...authHeaders(), ...(opts.headers || {}) } });
  let body = {};
  try { body = await res.json(); } catch {}
  if (!res.ok) throw new Error(body.error || ('Permintaan gagal (' + res.status + ')'));
  return body;
}
function _wdNum(v) {
  if (v === null || v === undefined || v === '') return '-';
  return Number(v).toLocaleString('id-ID', { maximumFractionDigits: 4 });
}
function _wdDefinisi(txt) {
  // Mengikuti gaya tombol "Σ" formula di Kinerja, tapi ikon info (ⓘ): definisi baru muncul saat ikon diklik (panel floating Kinerja).
  if (!txt) return '';
  const data = esc(JSON.stringify({ nama: String(txt) }));
  return `<div style="display:flex;align-items:center;gap:6px;margin-top:5px"><div class="fx-wrap"><button style="display:inline-flex;align-items:center;justify-content:center;gap:4px;box-sizing:border-box;height:24px;font-size:0.62rem;font-weight:700;line-height:1;color:#0f766e;background:#f0fdfa;border:1px solid #99f6e4;border-radius:4px;padding:0 8px;cursor:pointer;font-family:inherit;appearance:none;-webkit-appearance:none;margin:0" data-tip="Lihat definisi operasional" data-formula="${data}" onclick="toggleFormulaPanel(this)"><svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/></svg><span class="fx-arrow" style="display:inline-block;transition:transform .2s;font-style:normal">▾</span></button></div></div>`;
}
// Dropdown tahun hanya berisi tahun yang punya data (realisasi) atau periode penginputan; bila belum ada sama sekali, tahun berjalan.
function _wdDaftarTahun(daftar, aktif) {
  const t = [...new Set((daftar || []).map(Number).filter(Boolean))].sort((a, b) => b - a);
  return t.length ? t : [aktif];
}
// Gaya input realisasi: sama dengan input realisasi di Kinerja (border tipis abu, fokus hijau lembut), bukan outline hitam bawaan browser.
(function _wdInjectStyle() {
  if (typeof document === 'undefined' || !document.head || document.getElementById('wdStyle')) return;
  const st = document.createElement('style'); st.id = 'wdStyle';
  st.textContent = `.wdEdIn{padding:6px 9px;border:1.5px solid var(--abu-2,#e2e8f0);border-radius:7px;font-size:.82rem;font-family:inherit;color:var(--teks,#1e293b);background:#fff;text-align:center;font-weight:700;outline:none;transition:border-color .15s,box-shadow .15s;box-sizing:border-box}
.wdEdIn:focus{border-color:var(--hijau,#047d78);box-shadow:0 0 0 3px rgba(6,95,70,.08)}
.wdEdIn::placeholder{font-weight:400;color:#94a3b8}`;
  document.head.appendChild(st);
})();
// Sel realisasi dengan mode lihat + tombol Edit (ikon). Klik Edit -> muncul input + ikon Simpan + ikon Batal.
const _WD_IC_SIMPAN = '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"/></svg>';
function _wdEditCell(inputId, nilai, saveCall, inputW = 110) {
  const val = nilai === null || nilai === undefined ? '' : String(nilai).replace('.', ',');
  const lihat = val === '' ? '<span class="badge badge-yellow">Belum diinput</span>' : `<strong>${_wdNum(nilai)}</strong>`;
  return `<div id="${inputId}-wrap">
    <div class="wdEdView" style="display:flex;gap:6px;align-items:center;justify-content:center">${lihat}
      <button class="btn btn-ghost btn-sm" data-tip="Edit" onclick="wdEdMulai('${inputId}')">${_WD_BTN.edit}</button></div>
    <div class="wdEdForm" style="display:none;gap:6px;align-items:center;justify-content:center">
      <input type="text" inputmode="decimal" class="wdEdIn" id="${inputId}" value="${val}" data-awal="${val}" placeholder="Belum diinput" style="width:${inputW}px"
        onkeydown="if(event.key==='Enter')${saveCall};else if(event.key==='Escape')wdEdBatal('${inputId}')" />
      <button class="btn btn-sm btn-primary" data-tip="Simpan" onclick="${saveCall}">${_WD_IC_SIMPAN}</button>
      <button class="btn btn-ghost btn-sm" data-tip="Batal" onclick="wdEdBatal('${inputId}')">${_WD_IC.close}</button></div></div>`;
}
function wdEdMulai(inputId) {
  const w = document.getElementById(inputId + '-wrap'); if (!w) return;
  w.querySelector('.wdEdView').style.display = 'none';
  w.querySelector('.wdEdForm').style.display = 'flex';
  const i = document.getElementById(inputId); i.focus(); i.select();
}
function wdEdBatal(inputId) {
  const w = document.getElementById(inputId + '-wrap'); if (!w) return;
  const i = document.getElementById(inputId); i.value = i.dataset.awal || '';
  w.querySelector('.wdEdForm').style.display = 'none';
  w.querySelector('.wdEdView').style.display = 'flex';
}
function _wdUnitLabel(u) { return u.singkatan || u.nama; }
function _wdToWita(iso) {   // ISO -> value untuk <input type=datetime-local> (WITA, UTC+8)
  if (!iso) return '';
  return new Date(new Date(iso).getTime() + 8 * 3600 * 1000).toISOString().slice(0, 16);
}
function _wdFromWita(local) { return local ? new Date(local + ':00+08:00').toISOString() : null; }
function _wdDebounce(fn, ms = 180) { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; }

const _WD_IC = {
  search: '<svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-4.35-4.35"/></svg>',
  close:  '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>',
  table:  '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="currentColor" style="flex-shrink:0;opacity:.85"><path d="M11 2.04938V13H21.9506C21.4489 18.0533 17.1853 22 12 22C6.47715 22 2 17.5229 2 12C2 6.81465 5.94668 2.5511 11 2.04938ZM13 2.04938C17.7244 2.51845 21.4816 6.27559 21.9506 11H13V2.04938Z"/></svg>',
  monitor: '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="currentColor" style="flex-shrink:0;opacity:.85"><path d="M13 18V20H17V22H7V20H11V18H2.9918C2.44405 18 2 17.5511 2 16.9925V4.00748C2 3.45107 2.45531 3 2.9918 3H21.0082C21.556 3 22 3.44892 22 4.00748V16.9925C22 17.5489 21.5447 18 21.0082 18H13Z"/></svg>',
  list:   '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="currentColor" style="flex-shrink:0;opacity:.85"><path d="M6.17071 18C6.58254 16.8348 7.69378 16 9 16C10.3062 16 11.4175 16.8348 11.8293 18H22V20H11.8293C11.4175 21.1652 10.3062 22 9 22C7.69378 22 6.58254 21.1652 6.17071 20H2V18H6.17071ZM12.1707 11C12.5825 9.83481 13.6938 9 15 9C16.3062 9 17.4175 9.83481 17.8293 11H22V13H17.8293C17.4175 14.1652 16.3062 15 15 15C13.6938 15 12.5825 14.1652 12.1707 13H2V11H12.1707ZM6.17071 4C6.58254 2.83481 7.69378 2 9 2C10.3062 2 11.4175 2.83481 11.8293 4H22V6H11.8293C11.4175 7.16519 10.3062 8 9 8C7.69378 8 6.58254 7.16519 6.17071 6H2V4H6.17071Z"/></svg>',
};

// Ikon judul halaman Dashboard & Laporan (sama dengan modul lain)
_WD_IC.dash = '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="currentColor" style="flex-shrink:0;opacity:.85"><path d="M14 21C13.4477 21 13 20.5523 13 20V12C13 11.4477 13.4477 11 14 11H20C20.5523 11 21 11.4477 21 12V20C21 20.5523 20.5523 21 20 21H14ZM4 13C3.44772 13 3 12.5523 3 12V4C3 3.44772 3.44772 3 4 3H10C10.5523 3 11 3.44772 11 4V12C11 12.5523 10.5523 13 10 13H4ZM9 11V5H5V11H9ZM4 21C3.44772 21 3 20.5523 3 20V16C3 15.4477 3.44772 15 4 15H10C10.5523 15 11 15.4477 11 16V20C11 20.5523 10.5523 21 10 21H4ZM5 19H9V17H5V19ZM15 19H19V13H15V19ZM13 4C13 3.44772 13.4477 3 14 3H20C20.5523 3 21 3.44772 21 4V8C21 8.55228 20.5523 9 20 9H14C13.4477 9 13 8.55228 13 8V4ZM15 5V7H19V5H15Z"/></svg>';
_WD_IC.laporan = '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="currentColor" style="flex-shrink:0;opacity:.85"><path d="M16 2L21 7V21.0082C21 21.556 20.5551 22 20.0066 22H3.9934C3.44476 22 3 21.5447 3 21.0082V2.9918C3 2.44405 3.44495 2 3.9934 2H16ZM11 7V17H13V7H11ZM15 11V17H17V11H15ZM7 13V17H9V13H7Z"/></svg>';

// Ikon tombol - sama dengan gaya tombol di menu Kinerja (13px, margin kanan 5px)
const _wdTbIc = (path, sw = 2.5) => `<svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="${sw}" style="margin-right:5px;vertical-align:-2px">${path}</svg>`;
const _WD_BTN = {
  tambah:   _wdTbIc('<path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4"/>'),
  excel:    _wdTbIc('<path stroke-linecap="round" stroke-linejoin="round" d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><path stroke-linecap="round" d="M8 13h2M8 17h2M14 13h2M14 17h2"/>'),
  unduh:    _wdTbIc('<path stroke-linecap="round" stroke-linejoin="round" d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline stroke-linecap="round" stroke-linejoin="round" points="7 10 12 15 17 10"/><line stroke-linecap="round" stroke-linejoin="round" x1="12" y1="15" x2="12" y2="3"/>', 1.8),
  batal:    _wdTbIc('<path stroke-linecap="round" stroke-linejoin="round" d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6"/>'),
  tutup:    _wdTbIc('<path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/>'),
  pindah:   _wdTbIc('<path stroke-linecap="round" stroke-linejoin="round" d="M5 12h14M13 6l6 6-6 6"/>'),
  simpan:   _wdTbIc('<path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"/>'),
  assign:   '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M19 8v6M22 11h-6"/></svg>',
  edit:     '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>',
  detail:   '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 6h13M8 12h13M8 18h13"/><path d="M3 6h.01M3 12h.01M3 18h.01"/></svg>',
  hapus:    '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path stroke-linecap="round" stroke-linejoin="round" d="M19 6l-1 14H6L5 6"/><path stroke-linecap="round" stroke-linejoin="round" d="M10 11v6m4-6v6"/><path stroke-linecap="round" stroke-linejoin="round" d="M9 6V4h6v2"/></svg>',
};

const _wdBadgeIc = p => `<svg xmlns="http://www.w3.org/2000/svg" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${p}</svg>`;
const _WD_MODAL_IC = {
  modalWdDetail:     _wdBadgeIc('<path d="M8 6h13M8 12h13M8 18h13"/><path d="M3 6h.01M3 12h.01M3 18h.01"/>'),
  modalWdIndikatorT: _wdBadgeIc('<path d="M12 5v14M5 12h14"/>'),
  modalWdIndikatorU: _wdBadgeIc('<path d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>'),
  modalWdAssignUser: _wdBadgeIc('<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M19 8v6M22 11h-6"/>'),
  modalWdImport:     _wdBadgeIc('<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><path d="M8 13h2M8 17h2M14 13h2M14 17h2"/>'),
};
function _wdModal(id, title, subtitle, body, footer, maxW = 560) {
  if (document.getElementById(id)) document.getElementById(id).remove();
  const el = document.createElement('div');
  el.className = 'modal-overlay'; el.id = id;
  el.innerHTML = `<div class="modal" style="max-width:${maxW}px;width:100%">
    <div class="modal-header">
      <div class="modal-title-wrap">${(() => { const ic = _WD_MODAL_IC[id === 'modalWdIndikator' ? (String(title).startsWith('Ubah') ? 'modalWdIndikatorU' : 'modalWdIndikatorT') : id]; return ic ? `<span class="modal-icon-badge">${ic}</span>` : ''; })()}<div><div class="modal-title">${title}</div>${subtitle ? `<div class="modal-subtitle">${subtitle}</div>` : ''}</div></div>
      <button class="btn-close" onclick="closeModal('${id}')">${_WD_IC.close}</button>
    </div>
    <div class="modal-body" style="display:flex;flex-direction:column;gap:14px;max-height:70vh;overflow:auto">${body}</div>
    ${footer ? `<div class="modal-footer">${footer}</div>` : ''}
  </div>`;
  document.body.appendChild(el);
  return el;
}

// ── halaman ────────────────────────────────────────────────────────────────
function _wdEnsurePages() {
  const host = document.querySelector('.content');
  if (!host) return;
  if (!document.getElementById('page-walidata-ssd')) {
    const p = document.createElement('div');
    p.className = 'page'; p.id = 'page-walidata-ssd';
    p.innerHTML = `
      <div class="page-title">${_WD_IC.table}Data Statistik Sektoral Daerah</div>
      <div class="page-subtitle">Realisasi indikator walidata per Kode SSD, unit kerja, dan tahun pelaporan</div>
      <div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap;row-gap:12px;margin-bottom:6px">
        <span style="font-size:.72rem;font-weight:600;color:var(--text-secondary,#64748b);white-space:nowrap;letter-spacing:.01em;margin-right:2px">Tahun</span>
        <div class="select-wrap tahun-select-wrap" style="min-width:88px"><select id="wdTahun" autocomplete="off" onchange="wdGantiTahun(this.value)"></select></div>
        <div class="search-wrap" style="min-width:220px;flex:1;max-width:320px">${_WD_IC.search}<input type="text" id="wdSearch" placeholder="Cari kode SSD, uraian…" /></div>
        <div class="select-wrap" style="min-width:200px" id="wdUnitWrap"><select id="wdUnit"><option value="">Semua Unit Kerja</option></select></div>
        <div style="flex:1"></div>
        <button class="btn btn-sm btn-primary" onclick="wdUnduhRekap()">${_WD_BTN.unduh}Unduh Rekap Excel</button>
      </div>
      <div id="wdCountdownBar" style="display:none"></div>
      <div style="height:12px"></div>
      <div class="kinerja-table-wrap card" style="padding:0;overflow-x:auto">
        <table class="kinerja-table" style="min-width:860px">
          <thead><tr>
            <th style="width:46px">No</th><th style="width:110px">Kode SSD</th><th>Uraian</th>
            <th style="width:100px;text-align:center">Satuan</th><th style="width:220px;text-align:center">Unit Kerja</th>
            <th style="width:200px;text-align:center">Realisasi</th><th style="width:90px;text-align:center">Aksi</th>
          </tr></thead>
          <tbody id="wdBody"></tbody>
        </table>
      </div>
      <div id="wdPagination"></div>`;
    host.appendChild(p);
    document.getElementById('wdSearch').addEventListener('input', _wdDebounce(e => { _wd.search = document.getElementById('wdSearch').value; _wd.page = 1; _wdRenderTable(); }));
    document.getElementById('wdUnit').addEventListener('change', e => { _wd.unitFilter = e.target.value; _wd.page = 1; _wdRenderTable(); });
  }
  if (!document.getElementById('page-walidata-indikator')) {
    const p = document.createElement('div');
    p.className = 'page'; p.id = 'page-walidata-indikator';
    p.innerHTML = `
      <div class="page-title">${_WD_IC.list}Kelola Indikator Walidata</div>
      <div class="page-subtitle">Master indikator berdasarkan Kode SSD, unit kerja, dan metode agregasi</div>
      <div class="toolbar" style="flex-wrap:wrap;margin-bottom:12px">
        <div class="search-wrap">${_WD_IC.search}<input type="text" id="wdiSearch" placeholder="Cari kode SSD, uraian, satuan…" /></div>
        <div style="flex:1"></div>
        <button class="btn btn-primary btn-sm" onclick="wdBukaFormIndikator()">${_WD_BTN.tambah}Tambah Indikator</button>
        <button class="btn btn-primary btn-sm" onclick="wdBukaImport()" data-tip="Impor banyak indikator dan realisasi sekaligus dari file Excel">${_WD_BTN.excel}Import Excel</button>
        <button class="btn btn-primary btn-sm" onclick="wdUnduhTemplate()" data-tip="Unduh template Excel untuk import">${_WD_BTN.unduh}Unduh Template</button>
        <button class="btn btn-primary btn-sm" onclick="wdUnduhIndikatorPDF(this)" data-tip="Download data indikator (sesuai filter) sebagai PDF">${_WD_BTN.unduh}Download Indikator</button>
      </div>
      <div class="kinerja-table-wrap card" style="padding:0;overflow-x:auto">
        <table class="kinerja-table indikator-admin-table" style="min-width:860px">
          <thead><tr>
            <th style="width:46px">No</th><th style="width:110px">Kode SSD</th><th>Uraian</th><th style="width:100px;text-align:center">Satuan</th>
            <th style="width:230px;text-align:center">Unit Kerja</th><th style="width:200px;text-align:center">Penanggung Jawab (User)</th><th style="width:160px">Agregasi</th><th style="width:140px;text-align:center">Aksi</th>
          </tr></thead>
          <tbody id="wdiBody"></tbody>
        </table>
      </div>
      <div id="wdiPagination"></div>`;
    host.appendChild(p);
    document.getElementById('wdiSearch').addEventListener('input', _wdDebounce(() => { _wd.indPage = 1; _wdRenderIndikator(); }));
  }
  if (!document.getElementById('page-walidata-monitoring')) {
    const p = document.createElement('div');
    p.className = 'page'; p.id = 'page-walidata-monitoring';
    p.innerHTML = `
      <div class="page-title" style="display:flex;align-items:center;gap:10px">${_WD_IC.monitor}Monitoring Pengisian Walidata</div>
      <div class="page-subtitle">Pantau indikator mana yang belum diisi dan siapa yang menginput</div>
      <div class="toolbar">
        <div class="select-wrap" style="flex:1"><select id="wdmTahun" autocomplete="off" onchange="wdmSetTahun(this.value)"></select></div>
        <div class="select-wrap" style="flex:1">
          <select id="wdmStatus" onchange="wdmSetStatus(this.value)">
            <option value="">Semua Status</option><option value="belum">Belum Input</option><option value="terisi">Terinput</option>
          </select></div>
        <div class="select-wrap" style="flex:1"><select id="wdmUnit" onchange="wdmSetUnitSelect(this.value)"><option value="">Semua Unit Kerja</option></select></div>
        <div class="select-wrap" style="flex:1"><select id="wdmUser" data-searchable="1" onchange="wdmSetUser(this.value)"><option value="">Semua User</option></select></div>
        <div class="search-wrap" style="flex:1">${_WD_IC.search}<input type="text" id="wdmSearch" placeholder="Cari indikator, unit kerja, atau user…" /></div>
      </div>
      <div id="wdmSummary"></div>
      <div id="wdmUnitCards"></div>
      <div id="wdmUserCards"></div>
      <div class="kinerja-table-wrap card" style="padding:0;overflow-x:auto">
        <table class="kinerja-table" style="min-width:900px">
          <thead><tr>
            <th style="width:46px;text-align:center">No</th><th style="width:110px">Kode SSD</th><th style="min-width:220px">Indikator</th>
            <th style="min-width:180px;white-space:normal;text-align:center">Unit Kerja</th>
            <th style="width:130px;text-align:center">Status</th><th style="min-width:180px;text-align:center">Penanggung Jawab (User)</th>
            <th style="width:120px;text-align:center">Realisasi</th>
          </tr></thead>
          <tbody id="wdmBody"></tbody>
        </table>
      </div>
      <div id="wdmPagination"></div>`;
    host.appendChild(p);
    document.getElementById('wdmSearch').addEventListener('input', _wdDebounce(() => { _wdm.search = document.getElementById('wdmSearch').value.trim(); _wdm.page = 1; _wdmRenderTable(); }));
  }
  if (!document.getElementById('page-walidata-dashboard')) {
    const p = document.createElement('div');
    p.className = 'page'; p.id = 'page-walidata-dashboard';
    p.innerHTML = `
      <div class="page-title" style="display:flex;align-items:center;gap:10px">${_WD_IC.dash}Dashboard</div>
      <div class="page-subtitle" id="wddSub">Ringkasan pengisian data Walidata (Data SSD)</div>
      <div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap;margin-bottom:14px">
        <span style="font-size:.72rem;font-weight:600;color:var(--text-secondary,#64748b);white-space:nowrap;letter-spacing:.01em;margin-right:2px">Tahun</span>
        <div class="select-wrap tahun-select-wrap" style="min-width:88px"><select id="wddTahun" autocomplete="off" onchange="wddGantiTahun(this.value)"></select></div>
      </div>
      <div id="dashWalidataStats"></div>`;
    host.appendChild(p);
  }
  if (!document.getElementById('page-walidata-laporan')) {
    const p = document.createElement('div');
    p.className = 'page'; p.id = 'page-walidata-laporan';
    p.innerHTML = `
      <div class="page-title" style="display:flex;align-items:center;gap:10px">${_WD_IC.laporan}Laporan Walidata</div>
      <div class="page-subtitle" id="wdlSub">Rekap realisasi indikator Walidata per tahun dan unit kerja</div>
      <div id="wdlStats" class="dash-kpi-row"></div>
      <div class="toolbar" style="flex-wrap:wrap;gap:8px;align-items:center">
        <div class="search-wrap" style="flex:2;min-width:200px">${_WD_IC.search}<input type="text" id="wdlSearch" placeholder="Cari kode SSD, uraian, atau unit kerja…" /></div>
        <div class="select-wrap" style="flex:1" id="wdlUnitWrap"><select id="wdlUnit" data-searchable="1" data-search-placeholder="Cari unit kerja…" onchange="wdlSetUnit(this.value)"><option value="">Semua Unit Kerja</option></select></div>
        <div class="select-wrap" style="flex:1"><select id="wdlStatus" onchange="wdlSetStatus(this.value)">
          <option value="">Semua Status</option><option value="terisi">Terinput</option><option value="belum">Belum Input</option></select></div>
        <div class="select-wrap tahun-select-wrap" style="flex:1;min-width:88px"><select id="wdlTahun" autocomplete="off" onchange="wdlGantiTahun(this.value)"></select></div>
        <div style="display:inline-flex;align-items:center;gap:6px;flex-shrink:0" data-tip="Rentang tahun untuk download PDF">
          <span style="font-size:.72rem;font-weight:600;color:var(--text-secondary,#64748b);white-space:nowrap">Download</span>
          <div class="select-wrap tahun-select-wrap" style="min-width:88px"><select id="wdlDari" autocomplete="off" onchange="wdlSetDari(this.value)"></select></div>
          <span style="font-size:.72rem;color:var(--text-secondary,#64748b)">s/d</span>
          <div class="select-wrap tahun-select-wrap" style="min-width:88px"><select id="wdlSampai" autocomplete="off" onchange="wdlSetSampai(this.value)"></select></div>
        </div>
        <button class="btn btn-sm" onclick="wdlUnduhPDF(this)" style="background:#047D78;color:white;border:none;display:inline-flex;align-items:center;gap:6px;font-weight:600;white-space:nowrap;flex-shrink:0">${_WD_BTN.unduh.replace('margin-right:5px;', '')}Laporan Walidata</button>
      </div>
      <div class="kinerja-table-wrap card" style="padding:0;overflow-x:auto">
        <table class="kinerja-table" style="min-width:900px">
          <thead><tr>
            <th style="width:46px;text-align:center">No</th><th style="width:110px">Kode SSD</th><th>Uraian</th>
            <th style="width:90px;text-align:center">Satuan</th><th style="width:210px;text-align:center">Unit Kerja</th>
            <th style="width:130px;text-align:center">Realisasi</th><th style="width:130px;text-align:center" id="wdlThTotal">Capaian</th>
          </tr></thead>
          <tbody id="wdlBody"></tbody>
        </table>
      </div>
      <div id="wdlPagination"></div>`;
    host.appendChild(p);
    document.getElementById('wdlSearch').addEventListener('input', _wdDebounce(() => { _wdl.search = document.getElementById('wdlSearch').value.trim(); _wdl.page = 1; _wdlRender(); }));
  }
}

// ═══ DATA SSD ═══════════════════════════════════════════════════════════════
async function loadWalidataSsd() {
  _wdEnsurePages();
  document.getElementById('wdUnitWrap').style.display = _wdAdmin() ? '' : 'none';
  await _wdMuatData();
}

// silent = refresh setelah simpan: tabel tidak dikosongkan dulu supaya posisi scroll tidak loncat
async function _wdMuatData(silent) {
  const body = document.getElementById('wdBody');
  if (!silent) body.innerHTML = '<tr><td colspan="7" style="text-align:center;padding:24px;color:var(--teks-muted)">Memuat data…</td></tr>';
  try {
    _wd.data = await _wdFetch('/data?tahun=' + _wd.tahun);
    // Tahun terpilih tidak punya data (mis. tahun berjalan masih kosong): pindah ke tahun terbaru yang ada datanya.
    const dt = _wd.data.daftar_tahun || [];
    if (dt.length && !dt.map(Number).includes(_wd.tahun)) {
      _wd.tahun = Math.max(...dt.map(Number));
      _wd.data = await _wdFetch('/data?tahun=' + _wd.tahun);
    }
  } catch (e) {
    body.innerHTML = `<tr><td colspan="7" style="text-align:center;padding:24px;color:#991b1b">${esc(e.message)}</td></tr>`;
    return;
  }
  _wd.rows = _wd.data.rows;
  _wdIsiTahun();
  _wdRenderPeriode();
  if (_wdAdmin()) await _wdIsiFilterUnit();
  _wdRenderTable();
}

function _wdIsiTahun() {
  const sel = document.getElementById('wdTahun');
  // User non-admin tanpa data & tanpa periode terbuka: jangan paksa tampilkan tahun berjalan (periodenya memang belum ada).
  if (!_wd.data?.me?.admin && !(_wd.data?.daftar_tahun || []).length) {
    sel.innerHTML = '<option value="">Belum ada periode</option>';
    sel.disabled = true;
    if (typeof syncCustomSelect === 'function') syncCustomSelect('wdTahun');
    return;
  }
  sel.disabled = false;
  sel.innerHTML = _wdDaftarTahun(_wd.data?.daftar_tahun, _wd.tahun).map(t => `<option value="${t}" ${t === _wd.tahun ? 'selected' : ''}>${t}</option>`).join('');
  if (typeof syncCustomSelect === 'function') syncCustomSelect('wdTahun');
}
function wdGantiTahun(v) { _wd.tahun = parseInt(v, 10); _wd.page = 1; _wdMuatData(); }

let _wdTimer = null;
function _wdRenderPeriode() {
  // Sama seperti Kinerja: kartu periode hanya untuk non-admin dan hanya saat periode terbuka.
  const wrap = document.getElementById('wdCountdownBar');
  if (_wdTimer) { clearInterval(_wdTimer); _wdTimer = null; }
  const pa = _wd.data.periode || {};
  if (_wd.data.me.admin || pa.status !== 'terbuka' || !pa.close_at) { wrap.style.display = 'none'; wrap.innerHTML = ''; return; }

  const fmt = iso => new Date(iso).toLocaleString('id-ID', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Makassar' }).replace(' pukul', '') + ' WITA';
  const openMs = pa.open_at ? new Date(pa.open_at).getTime() : null;
  const closeMs = new Date(pa.close_at).getTime();
  const id = 'wdCountdownBar';
  wrap.style.display = 'block'; wrap.style.marginTop = '18px';
  wrap.innerHTML = `
    <div class="kperiode-card" id="${id}_card">
      <div class="kperiode-header">
        <span class="kperiode-header-title">
          <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M8 2v4"/><path d="M16 2v4"/><path d="M3 10h18"/></svg>
          Tahun ${pa.tahun}
        </span>
        <span class="kperiode-header-timer" id="${id}_timer">…</span>
      </div>
      <div class="kperiode-body">
        <div class="kperiode-action-label">
          <span class="kperiode-jenis-pill" style="background:#ccfbf1;color:#0f766e">Walidata</span>
          Periode Penginputan
        </div>
        <div class="kperiode-progress-track"><div class="kperiode-progress-fill ok" id="${id}_fill" style="width:0%"></div></div>
        <div class="kperiode-window-row">
          <span class="kperiode-window-open">
            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 9.9-1"/></svg>
            ${pa.open_at ? fmt(pa.open_at) : '-'}
          </span>
          <span class="kperiode-window-close">
            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
            ${fmt(pa.close_at)}
          </span>
        </div>
      </div>
    </div>`;

  const tick = () => {
    const now = Date.now(), diff = closeMs - now;
    const timerEl = document.getElementById(id + '_timer'), fillEl = document.getElementById(id + '_fill'), cardEl = document.getElementById(id + '_card');
    if (!timerEl || !fillEl || !cardEl) { clearInterval(_wdTimer); _wdTimer = null; return; }
    if (diff <= 0) {   // baru saja ditutup: sembunyikan kartu & kunci input
      clearInterval(_wdTimer); _wdTimer = null;
      wrap.style.display = 'none'; wrap.innerHTML = '';
      _wdMuatData();
      return;
    }
    const pad = n => String(n).padStart(2, '0');
    const h = Math.floor(diff / 86400000), j = Math.floor((diff % 86400000) / 3600000), m = Math.floor((diff % 3600000) / 60000), d = Math.floor((diff % 60000) / 1000);
    const total = openMs && closeMs > openMs ? closeMs - openMs : null;
    const sisaPct = total ? (diff / total) * 100 : 100;
    const urgency = (diff < 3600000 || sisaPct <= 10) ? 'urgent' : (diff < 86400000 || sisaPct <= 25) ? 'warn' : 'ok';
    timerEl.textContent = h > 0 ? `${h}h ${pad(j)}:${pad(m)}:${pad(d)}` : `${pad(j)}:${pad(m)}:${pad(d)}`;
    cardEl.className = 'kperiode-card ' + urgency;
    fillEl.className = 'kperiode-progress-fill ' + urgency;
    fillEl.style.width = total ? Math.min(100, Math.max(0, ((now - openMs) / total) * 100)) + '%' : '100%';
  };
  tick();
  _wdTimer = setInterval(tick, 1000);
}

async function _wdIsiFilterUnit() {
  if (!_wd.bidang.length) {
    try { _wd.bidang = (await (await fetch('/api/bidang', { headers: authHeaders() })).json()).bidang || []; } catch {}
  }
  const sel = document.getElementById('wdUnit');
  const cur = _wd.unitFilter;
  sel.innerHTML = '<option value="">Semua Unit Kerja</option>' +
    _wd.bidang.map(b => `<option value="${b.id}" ${String(b.id) === String(cur) ? 'selected' : ''}>${esc(b.nama)}</option>`).join('');
}

function _wdFiltered() {
  const q = _wd.search.trim().toLowerCase();
  return _wd.rows.filter(r => {
    if (q && !(`${r.kode_ssd} ${r.uraian} ${r.definisi || ''}`.toLowerCase().includes(q))) return false;
    if (_wd.unitFilter && !r.detail.some(d => d.pengampu && String(d.bidang_id) === String(_wd.unitFilter))) return false;
    return true;
  });
}

// Periode input sudah ditutup: kolom Aksi tidak dikosongkan (sama dengan Kinerja).
// Sudah ada realisasi -> "Tersimpan"; belum diisi -> "Ditutup".
function _wdAksiTutupBadge(saved) {
  const svgOpen = '<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">';
  if (saved) {
    return '<span class="aksi-tutup-badge aksi-tutup-badge--saved" data-tip="Data sudah tersimpan. Periode input sudah ditutup, data tidak bisa diubah lagi.">'
      + svgOpen + '<path d="M20 6 9 17l-5-5"/></svg>Tersimpan</span>';
  }
  return '<span class="aksi-tutup-badge" data-tip="Periode input sudah ditutup. Data tidak bisa diisi lagi.">'
    + svgOpen + '<rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>Ditutup</span>';
}
function _wdAksiCell(r) {
  const me = _wd.data.me;
  if (me.admin) return `<button class="btn btn-ghost btn-sm" data-tip="Detail" onclick="wdBukaDetail(${r.id})">${_WD_BTN.detail}</button>`;
  const mine = r.detail[0];
  if (mine && !me.can_input) return _wdAksiTutupBadge(mine.nilai !== null);
  return '';
}

function _wdRealisasiCell(r) {
  const me = _wd.data.me;
  if (me.admin) {
    if (r.agregasi === 'tidak_diagregasi') return `<span style="color:var(--teks-muted);font-size:.75rem">Lihat per unit</span>`;
    if (r.total === null) return `<span class="badge badge-yellow">Belum diinput</span>`;
    const parsial = r.jumlah_terisi < r.jumlah_pengampu
      ? `<div style="font-size:.66rem;color:#92400e;margin-top:2px">${r.jumlah_terisi}/${r.jumlah_pengampu} unit terisi</div>` : '';
    return `<div style="font-weight:700">${_wdNum(r.total)}</div>${parsial}`;
  }
  const mine = r.detail[0];
  if (!mine) return '-';
  if (!me.can_input) return mine.nilai === null ? '<span class="badge badge-yellow">Belum diinput</span>' : `<strong>${_wdNum(mine.nilai)}</strong>`;
  return _wdEditCell('wdIn-' + r.id, mine.nilai, `wdSimpanUser(${r.id},${mine.bidang_id})`, 100);
}

function _wdRenderTable() {
  const body = document.getElementById('wdBody');
  const list = _wdFiltered();
  const total = list.length;
  const pages = Math.max(1, Math.ceil(total / _wd.perPage));
  if (_wd.page > pages) _wd.page = pages;
  const start = (_wd.page - 1) * _wd.perPage;
  const slice = list.slice(start, start + _wd.perPage);
  if (!slice.length) {
    body.innerHTML = `<tr><td colspan="7" style="text-align:center;padding:28px;color:var(--teks-muted)">${
      _wd.rows.length ? 'Tidak ada indikator yang cocok.' : (_wdAdmin() ? 'Belum ada indikator. Tambahkan lewat Master Data → Walidata → Kelola Indikator.' : 'Belum ada indikator yang di-assign ke akun Anda.')}</td></tr>`;
    renderPagination('wdPagination', 0, 1, _wd.perPage, 'wdKePage');
    return;
  }
  body.innerHTML = slice.map((r, i) => {
    const unit = r.detail.filter(d => d.pengampu).map(_wdUnitLabel).map(esc).join(', ') || '<span style="color:var(--teks-muted);font-style:italic">Belum ditetapkan</span>';
    return `<tr>
      <td style="text-align:center">${start + i + 1}</td>
      <td style="font-weight:600">${esc(r.kode_ssd)}</td>
      <td><div style="font-weight:600;line-height:1.5">${esc(r.uraian)}</div>${_wdDefinisi(r.definisi)}</td>
      <td style="text-align:center">${esc(r.satuan || '-')}</td>
      <td style="font-size:.78rem;text-align:center">${unit}</td>
      <td style="text-align:center">${_wdRealisasiCell(r)}</td>
      <td style="text-align:center;white-space:nowrap">${_wdAksiCell(r)}</td>
    </tr>`;
  }).join('');
  renderPagination('wdPagination', total, _wd.page, _wd.perPage, 'wdKePage');
}
function wdKePage(n) { _wd.page = n; _wdRenderTable(); }

async function wdSimpanUser(indikatorId, bidangId) {
  const inp = document.getElementById('wdIn-' + indikatorId);
  try {
    const r = await _wdFetch('/realisasi', { method: 'PUT', body: JSON.stringify({
      indikator_id: indikatorId, bidang_id: bidangId, tahun: _wd.tahun, nilai: inp.value.trim() === '' ? null : inp.value }) });
    toast(r.nilai === null ? 'Realisasi dikosongkan' : 'Realisasi tersimpan');
    await _wdMuatData(true);
  } catch (e) { toast(e.message, 'error'); }
}

// ── Detail per unit (admin) ────────────────────────────────────────────────
const _wdDtTh = 'padding:10px 12px;white-space:nowrap';
const _wdDtTd = 'padding:10px 12px;border-bottom:1px solid #f1f5f9;vertical-align:middle;overflow:visible';

function _wdDetailBody(r) {
  const pengampuList = r.detail.filter(x => x.pengampu);
  const baris = r.detail.map(d => {
    const val = d.nilai === null ? '' : String(d.nilai).replace('.', ',');
    const badge = d.pengampu ? ''
      : d.tanpa_unit ? ' <span class="badge badge-yellow" data-tip="Unit kerja belum ditetapkan. Ikut dihitung di total.">Perlu ditetapkan</span>'
      : ' <span class="badge badge-yellow" data-tip="Bukan pengampu lagi - tidak masuk total">Riwayat</span>';
    let isi;
    if (d.tanpa_unit) {
      isi = pengampuList.length
        ? `<div style="display:flex;gap:6px;align-items:center;justify-content:center;flex-wrap:wrap"><strong>${_wdNum(d.nilai)}</strong>
             <select id="wdPindah-${r.id}" class="input" style="padding:5px 8px;max-width:170px">${pengampuList.map(u => `<option value="${u.bidang_id}">${esc(u.nama)}</option>`).join('')}</select>
             <button class="btn btn-sm" onclick="wdPindahTanpaUnit(${r.id})">${_WD_BTN.pindah}Pindahkan</button></div>`
        : `<strong>${_wdNum(d.nilai)}</strong><div style="font-size:.7rem;color:var(--teks-muted);margin-top:2px">Tetapkan unit kerja di Kelola Indikator</div>`;
    } else if (d.pengampu) {
      isi = _wdEditCell('wdDt-' + d.bidang_id, d.nilai, `wdSimpanDetail(${r.id},${d.bidang_id})`, 130);
    } else {
      isi = `<strong>${_wdNum(d.nilai)}</strong>`;
    }
    return `<tr>
      <td style="${_wdDtTd}"><div style="font-weight:600;line-height:1.4">${esc(d.nama)}${badge}</div>${d.singkatan ? `<div style="font-size:.7rem;color:var(--teks-muted)">${esc(d.singkatan)}</div>` : ''}</td>
      <td style="${_wdDtTd};text-align:center;white-space:nowrap">${isi}</td>
      <td style="${_wdDtTd};text-align:center;white-space:nowrap;font-size:.72rem;color:var(--teks-muted)">${d.updated_at ? fmtDate(d.updated_at) : '-'}</td></tr>`;
  }).join('') || `<tr><td colspan="3" style="${_wdDtTd};text-align:center;color:var(--teks-muted)">Unit kerja belum ditetapkan. Atur di Kelola Indikator.</td></tr>`;
  // Info ringkas tanpa kotak/border: label abu-abu, nilai tebal.
  const info = (label, nilai) => `<div style="font-size:.8rem;color:#64748b">${label}: <strong style="color:var(--teks,#1e293b)">${nilai}</strong></div>`;
  return `
    <div><div style="font-weight:700;color:#0f766e">${esc(r.kode_ssd)}</div>
      <div style="font-weight:600;line-height:1.5">${esc(r.uraian)}</div>${_wdDefinisi(r.definisi)}</div>
    <div style="display:flex;gap:6px 22px;flex-wrap:wrap">
      ${info('Tahun', _wd.tahun)}${info('Satuan', esc(r.satuan || '-'))}${info('Agregasi', esc(WD_AGREGASI[r.agregasi] || r.agregasi))}
      ${info('Total', r.agregasi === 'tidak_diagregasi' ? '-' : (r.total === null ? 'Belum diinput' : _wdNum(r.total)))}</div>
    <div style="border:1px solid #e2e8f0;border-radius:8px;overflow-x:auto;-webkit-overflow-scrolling:touch"><table class="kinerja-table" style="margin:0;width:100%;min-width:600px">
      <thead><tr><th style="${_wdDtTh};text-align:left;min-width:180px">Unit Kerja</th><th style="${_wdDtTh};text-align:center;min-width:260px">Realisasi</th><th style="${_wdDtTh};text-align:center;min-width:110px">Diperbarui</th></tr></thead>
      <tbody>${baris}</tbody></table></div>
    <div style="font-size:.72rem;color:var(--teks-muted)">Kosongkan isian lalu Simpan untuk mengembalikan ke "belum diinput". Unit yang belum diinput tidak dihitung sebagai nol.</div>`;
}
function wdBukaDetail(indikatorId) {
  const r = _wd.rows.find(x => x.id === indikatorId);
  if (!r) return;
  _wdModal('modalWdDetail', 'Rincian Realisasi per Unit Kerja', 'Data SSD tahun ' + _wd.tahun, _wdDetailBody(r),
    `<button class="btn btn-ghost" onclick="closeModal('modalWdDetail')">${_WD_BTN.tutup}Tutup</button>`, 820);
  openModal('modalWdDetail');
}
// Setelah simpan/pindah: muat ulang data di belakang dan segarkan isi modal di tempat (modal tidak ditutup-buka lagi, scroll tetap).
async function _wdSegarkanDetail(indikatorId) {
  await _wdMuatData(true);
  const body = document.querySelector('#modalWdDetail .modal-body');
  const r = _wd.rows.find(x => x.id === indikatorId);
  if (!body || !r) return;
  const top = body.scrollTop;
  body.innerHTML = _wdDetailBody(r);
  body.scrollTop = top;
}
async function wdPindahTanpaUnit(indikatorId) {
  const bid = document.getElementById('wdPindah-' + indikatorId)?.value;
  if (!bid) return;
  if (!await showConfirm({ title: 'Pindahkan Realisasi', type: 'warning', icon: 'trash', okText: 'Ya, Pindahkan',
    msg: 'Seluruh realisasi (semua tahun) yang belum ditetapkan unitnya akan dipindahkan ke unit kerja yang dipilih. Lanjutkan?' })) return;
  try {
    const r = await _wdFetch('/realisasi/pindah', { method: 'POST', body: JSON.stringify({ indikator_id: indikatorId, bidang_id: parseInt(bid, 10) }) });
    toast(`${r.dipindah} data dipindahkan` + (r.bentrok ? `, ${r.bentrok} dilewati karena unit tujuan sudah punya nilai di tahun yang sama` : ''));
    await _wdSegarkanDetail(indikatorId);
  } catch (e) { toast(e.message, 'error'); }
}
async function wdSimpanDetail(indikatorId, bidangId) {
  const v = document.getElementById('wdDt-' + bidangId).value.trim();
  try {
    await _wdFetch('/realisasi', { method: 'PUT', body: JSON.stringify({ indikator_id: indikatorId, bidang_id: bidangId, tahun: _wd.tahun, nilai: v === '' ? null : v }) });
    toast(v === '' ? 'Realisasi dikosongkan' : 'Realisasi tersimpan');
    await _wdSegarkanDetail(indikatorId);
  } catch (e) { toast(e.message, 'error'); }
}

// ── Rekap Excel ────────────────────────────────────────────────────────────
async function wdUnduhRekap() {
  try {
    await _loadXlsx();
    const out = [['Tahun', 'Kode SSD', 'Uraian', 'Definisi Operasional', 'Satuan', 'Unit Kerja', 'Realisasi Unit', 'Total Realisasi']];
    for (const r of _wdFiltered()) {
      const rows = r.detail.length ? r.detail : [{ nama: '-', nilai: null }];
      rows.forEach((d, i) => out.push([_wd.tahun, r.kode_ssd, r.uraian, r.definisi || '', r.satuan || '',
        d.nama + (d.pengampu === false ? ' (riwayat)' : ''), d.nilai, i === 0 ? r.total : '']));
    }
    const ws = XLSX.utils.aoa_to_sheet(out);
    ws['!cols'] = [{ wch: 7 }, { wch: 12 }, { wch: 46 }, { wch: 40 }, { wch: 12 }, { wch: 32 }, { wch: 14 }, { wch: 14 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Rekap ' + _wd.tahun);
    XLSX.writeFile(wb, `Rekap_Walidata_${_wd.tahun}.xlsx`);
  } catch (e) { toast(e.message, 'error'); }
}

// ═══ KELOLA INDIKATOR ═══════════════════════════════════════════════════════
async function loadWalidataIndikator() {
  _wdEnsurePages();
  const body = document.getElementById('wdiBody');
  body.innerHTML = '<tr><td colspan="8" style="text-align:center;padding:24px;color:var(--teks-muted)">Memuat data…</td></tr>';
  try {
    const [ind, bid] = await Promise.all([_wdFetch('/indikator'), fetch('/api/bidang', { headers: authHeaders() }).then(r => r.json())]);
    _wd.indikator = ind.indikator; _wd.bidang = (bid.bidang || []).filter(b => b.aktif !== false);
  } catch (e) {
    body.innerHTML = `<tr><td colspan="8" style="text-align:center;padding:24px;color:#991b1b">${esc(e.message)}</td></tr>`; return;
  }
  _wdRenderIndikator();
}
function _wdiFiltered() {
  const q = (document.getElementById('wdiSearch')?.value || '').trim().toLowerCase();
  return (_wd.indikator || []).filter(i => !q || `${i.kode_ssd} ${i.uraian} ${i.satuan || ''} ${i.definisi || ''} ${(i.pic_users || []).join(' ')}`.toLowerCase().includes(q));
}
function _wdRenderIndikator() {
  const list = _wdiFiltered();
  const body = document.getElementById('wdiBody');
  if (!list.length) { body.innerHTML = '<tr><td colspan="8" style="text-align:center;padding:28px;color:var(--teks-muted)">Belum ada indikator.</td></tr>'; renderPagination('wdiPagination', 0, 1, _wd.indPerPage, 'wdiKePage'); return; }
  const pages = Math.max(1, Math.ceil(list.length / _wd.indPerPage));
  if (_wd.indPage > pages) _wd.indPage = pages;
  const start = (_wd.indPage - 1) * _wd.indPerPage;
  body.innerHTML = list.slice(start, start + _wd.indPerPage).map((i, n) => `<tr>
    <td style="text-align:center">${start + n + 1}</td>
    <td style="font-weight:600">${esc(i.kode_ssd)}</td>
    <td><div style="font-weight:600;line-height:1.5">${esc(i.uraian)}</div>${_wdDefinisi(i.definisi)}</td>
    <td style="text-align:center">${esc(i.satuan || '-')}</td>
    <td style="font-size:.78rem;text-align:center">${(i.unit || []).map(_wdUnitLabel).map(esc).join(', ') || '<span style="color:var(--teks-muted);font-style:italic">Belum ditetapkan</span>'}</td>
    <td style="text-align:center">${(() => {
      const pics = Array.isArray(i.pic_users) ? i.pic_users.filter(Boolean) : [];
      if (!pics.length) return '<span style="color:var(--teks-muted);font-size:.75rem">-</span>';
      return pics.map(nama => `<span style="display:inline-flex;align-items:center;font-size:.7rem;font-weight:600;background:#eff6ff;color:#1e40af;border:1px solid #bfdbfe;border-radius:5px;padding:2px 7px;margin:1px 3px 1px 0">${esc(nama)}</span>`).join('');
    })()}</td>
    <td style="font-size:.78rem">${WD_AGREGASI[i.agregasi] || i.agregasi}</td>
    <td style="text-align:center;white-space:nowrap">
      <button class="btn btn-ghost btn-sm" data-tip="Assign User" onclick="wdBukaAssignUser(${i.id})">${_WD_BTN.assign}</button>
      <button class="btn btn-ghost btn-sm" data-tip="Edit" onclick="wdBukaFormIndikator(${i.id})">${_WD_BTN.edit}</button>
      <button class="btn-hapus" data-tip="Hapus" onclick="wdHapusIndikator(${i.id})">${_WD_BTN.hapus}</button></td></tr>`).join('');
  renderPagination('wdiPagination', list.length, _wd.indPage, _wd.indPerPage, 'wdiKePage');
}

function wdiKePage(n) { _wd.indPage = n; _wdRenderIndikator(); }

// ── Download Kelola Indikator - PDF (gaya sama dengan downloadIndikatorPDF di Kinerja:
//    kop surat resmi + tabel, dibuka di tab baru untuk di-print / Save as PDF) ──
async function wdUnduhIndikatorPDF(btnEl) {
  if (!(_wd.indikator || []).length) { toast('Belum ada data indikator untuk didownload.', 'error'); return; }
  const originalHtml = btnEl ? btnEl.innerHTML : null;
  if (btnEl) { btnEl.disabled = true; btnEl.innerHTML = `<span class="btn-spin" style="width:12px;height:12px"></span> Memuat data...`; }
  try {
    const list = _wdiFiltered();
    if (!list.length) { toast('Tidak ada data sesuai filter saat ini.', 'error'); return; }
    const td = 'padding:4px 6px;border:1px solid #000;font-size:9px';
    const th = 'color:white;padding:5px 4px;border:1px solid #000;text-align:center;font-size:9px';
    const bodyRows = list.map((i, n) => {
      const pics = Array.isArray(i.pic_users) ? i.pic_users.filter(Boolean) : [];
      const unit = (i.unit || []).map(_wdUnitLabel).join(', ');
      return `<tr style="background:white">
        <td style="${td};text-align:center;width:32px">${n + 1}</td>
        <td style="${td};white-space:nowrap">${esc(i.kode_ssd)}</td>
        <td style="${td}">${esc(i.uraian)}</td>
        <td style="${td}">${esc(i.definisi || '-')}</td>
        <td style="${td};text-align:center">${esc(i.satuan || '-')}</td>
        <td style="${td};text-align:center">${esc(unit) || '-'}</td>
        <td style="${td}">${pics.length ? esc(pics.join(', ')) : '-'}</td>
      </tr>`;
    }).join('');
    const bodyHtml = `
      ${_kopSuratHtml()}
      <div style="text-align:center;margin:18px 0 14px">
        <div style="font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:.5px">Kelola Indikator Walidata</div>
      </div>
      <table style="border-collapse:collapse;border-spacing:0;width:100%;table-layout:auto">
        <thead>
          <tr style="background:#0d9488">
            <th style="${th};width:32px">NO</th>
            <th style="${th};width:70px">KODE SSD</th>
            <th style="${th};min-width:180px">URAIAN</th>
            <th style="${th};min-width:180px">DEFINISI OPERASIONAL</th>
            <th style="${th};width:60px">SATUAN</th>
            <th style="${th};min-width:120px">UNIT KERJA</th>
            <th style="${th};min-width:110px">PENANGGUNG JAWAB (USER)</th>
          </tr>
        </thead>
        <tbody>${bodyRows}</tbody>
      </table>`;
    _bukaPreviewPDF(bodyHtml, 'Kelola Indikator Walidata', 'landscape');
  } catch (err) {
    toast('Gagal membuat PDF: ' + err.message, 'error');
  } finally {
    if (btnEl) { btnEl.disabled = false; btnEl.innerHTML = originalHtml; }
  }
}

function wdFilterUnit(q) {
  q = (q || '').toLowerCase().trim();
  let ada = 0;
  document.querySelectorAll('#wdfUnitList .wdUnitRow').forEach(r => {
    const cocok = !q || r.dataset.nama.includes(q);
    r.style.display = cocok ? 'flex' : 'none';
    if (cocok) ada++;
  });
  const k = document.getElementById('wdfUnitKosong');
  if (k) k.style.display = ada ? 'none' : 'block';
}

function wdBukaFormIndikator(id) {
  const i = id ? _wd.indikator.find(x => x.id === id) : null;
  _wd.editId = id || null;
  const terpilih = new Set((i?.unit || []).map(u => u.bidang_id));
  // Unit yang sudah terpilih dinaikkan ke atas saat modal dibuka (urutan asli tetap dijaga di dalam tiap kelompok),
  // supaya user tidak perlu mencari/scroll ke bawah. Centang/lepas di dalam modal tidak mengubah urutan.
  const bidangUrut = [..._wd.bidang].sort((a, b) => (terpilih.has(b.id) - terpilih.has(a.id)));
  const unitHtml = bidangUrut.map(b => `<label class="wdUnitRow" data-nama="${esc(b.nama.toLowerCase())}" style="display:flex;align-items:center;gap:10px;margin:0;padding:8px 6px;font-size:.82rem;font-weight:500;line-height:1.35;cursor:pointer;border-bottom:1px solid #f1f5f9">
      <input type="checkbox" class="chk wdUnitChk" style="padding:0;margin:0" value="${b.id}" ${terpilih.has(b.id) ? 'checked' : ''}><span style="flex:1;min-width:0">${esc(b.nama)}</span></label>`).join('');
  const body = `
    <div class="field"><label>Kode SSD <span style="color:var(--merah)">*</span></label>
      <input type="text" id="wdfKode" class="input" value="${esc(i?.kode_ssd || '')}" placeholder="Contoh: 1.01.001" maxlength="60"></div>
    <div class="field"><label>Uraian Indikator <span style="color:var(--merah)">*</span></label>
      <textarea id="wdfUraian" class="input" rows="2">${esc(i?.uraian || '')}</textarea></div>
    <div class="field"><label>Definisi Operasional</label>
      <textarea id="wdfDef" class="input" rows="3">${esc(i?.definisi || '')}</textarea></div>
    <div style="display:flex;gap:14px;flex-wrap:wrap">
      <div class="field" style="flex:1;min-width:140px"><label>Satuan</label>
        <input type="text" id="wdfSatuan" class="input" value="${esc(i?.satuan || '')}" placeholder="Orang, Unit, %…"></div>
      <div class="field" style="flex:1;min-width:200px"><label>Metode Agregasi</label>
        <div class="select-wrap"><select id="wdfAgr" data-searchable="0">${Object.entries(WD_AGREGASI).map(([k, v]) =>
          `<option value="${k}" ${(i?.agregasi || 'jumlah') === k ? 'selected' : ''}>${v}</option>`).join('')}</select></div></div>
    </div>
    <div class="field"><label>Unit Kerja <span style="font-weight:400;color:var(--teks-muted)">(boleh dikosongkan)</span></label>
      <div class="search-wrap" style="min-width:0;margin-bottom:6px">${_WD_IC.search}<input type="text" id="wdfUnitSearch" placeholder="Cari unit kerja..." oninput="wdFilterUnit(this.value)" style="width:100%;box-sizing:border-box"></div>
      <div id="wdfUnitList" style="max-height:220px;overflow:auto;border:1px solid #e2e8f0;border-radius:8px;padding:2px 10px;background:#fff">${unitHtml}<div id="wdfUnitKosong" style="display:none;padding:14px;text-align:center;color:var(--teks-muted);font-size:.8rem">Unit kerja tidak ditemukan</div></div>
      <div style="font-size:.72rem;color:var(--teks-muted);margin-top:3px">Bila hanya satu unit dipilih, realisasi hasil import yang belum punya unit otomatis dipindahkan ke unit itu. Melepas unit tidak menghapus realisasi yang pernah diinput; datanya tersimpan sebagai riwayat dan tidak masuk total. Penanggung jawab (user) diatur lewat tombol Assign User di daftar indikator.</div></div>`;
  _wdModal('modalWdIndikator', i ? 'Ubah Indikator' : 'Tambah Indikator', 'Master indikator Walidata', body,
    `<button class="btn btn-ghost" onclick="closeModal('modalWdIndikator')">${_WD_BTN.batal}Batal</button>
     <button class="btn btn-primary" onclick="wdSimpanIndikator()">${_WD_BTN.simpan}Simpan</button>`, 580);
  openModal('modalWdIndikator');
}
// ── Assign User per Indikator (sama dengan "Assign User" di Kinerja; tabel walidata_indikator_user) ──
let _wdAuiId = null, _wdAuiUsers = [], _wdAuiSelected = new Set(), _wdAuiPinned = new Set(), _wdAuiLoaded = false, _wdAuiSeq = 0;

async function wdBukaAssignUser(id) {
  const seq = ++_wdAuiSeq;
  const row = _wd.indikator.find(x => x.id === id);
  _wdAuiId = id; _wdAuiUsers = []; _wdAuiSelected = new Set(); _wdAuiPinned = new Set(); _wdAuiLoaded = false;
  const body = `
    <div style="font-size:.82rem;color:#64748b">Indikator: <strong>${esc(row ? row.kode_ssd + ' - ' + row.uraian : '')}</strong></div>
    <div class="search-wrap" style="min-width:0">${_WD_IC.search}<input type="text" id="wdAuiSearch" placeholder="Cari nama atau NIP..." style="width:100%;box-sizing:border-box"></div>
    <div style="font-size:.75rem;color:var(--hijau);font-weight:600;text-align:right;margin-top:-8px"><span id="wdAuiCounter">0 dipilih</span></div>
    <div id="wdAuiList" style="max-height:340px;overflow-y:auto;border-top:1px solid #e2e8f0;border-bottom:1px solid #e2e8f0"></div>
    <div style="font-size:.72rem;color:var(--teks-muted)">Kandidat: user dari unit kerja indikator ini. Hanya user yang ter-assign yang melihat dan menginput indikator ini di akunnya; bila belum ada yang di-assign, indikator tidak muncul di akun user manapun.</div>`;
  _wdModal('modalWdAssignUser', 'Assign User', 'Penanggung jawab (user) indikator Walidata', body,
    `<button class="btn btn-ghost" onclick="closeModal('modalWdAssignUser')">${_WD_BTN.batal}Batal</button>
     <button class="btn btn-primary" id="wdAuiSave" onclick="wdSimpanAssignUser()" disabled>${_WD_BTN.simpan}Simpan</button>`, 560);
  document.getElementById('wdAuiSearch').addEventListener('input', _wdAuiRender);
  document.getElementById('wdAuiList').innerHTML = '<div style="padding:18px;text-align:center;color:var(--teks-muted);font-size:.85rem">Memuat data...</div>';
  openModal('modalWdAssignUser');
  try {
    const d = await _wdFetch('/indikator/' + id + '/users');
    if (seq !== _wdAuiSeq) return;
    _wdAuiUsers = d.users || [];
    _wdAuiSelected = new Set((d.user_ids || []).map(Number));
    _wdAuiPinned = new Set(_wdAuiSelected);   // yang sudah ter-assign dinaikkan ke atas saat modal dibuka
    _wdAuiLoaded = true;
    document.getElementById('wdAuiSave').disabled = false;
    _wdAuiRender();
  } catch {
    if (seq !== _wdAuiSeq) return;
    // Gagal muat: Simpan tetap terkunci supaya assignment lama tidak tertimpa daftar kosong.
    document.getElementById('wdAuiList').innerHTML = '<div style="padding:18px;text-align:center;color:var(--merah);font-size:.85rem">Gagal memuat user. Tutup lalu coba lagi.</div>';
  }
}
function _wdAuiRender() {
  const q = (document.getElementById('wdAuiSearch')?.value || '').toLowerCase().trim();
  const list = _wdAuiUsers
    .filter(u => !q || (u.nama || '').toLowerCase().includes(q) || (u.nip || '').toLowerCase().includes(q))
    .sort((a, b) => (_wdAuiPinned.has(Number(b.id)) - _wdAuiPinned.has(Number(a.id))) || (a.nama || '').localeCompare(b.nama || ''));
  document.getElementById('wdAuiCounter').textContent = `${_wdAuiSelected.size} dipilih`;
  document.getElementById('wdAuiList').innerHTML = list.length
    ? list.map(u => `
      <label style="display:flex;align-items:center;gap:10px;padding:9px 16px;border-bottom:1px solid #f1f5f9;cursor:pointer;${_wdAuiSelected.has(Number(u.id)) ? 'background:#f0fdfa' : ''}"
             onmouseenter="this.style.background=this.querySelector('input').checked?'#f0fdfa':'#f8fafc'"
             onmouseleave="this.style.background=this.querySelector('input').checked?'#f0fdfa':''">
        <input type="checkbox" class="chk" ${_wdAuiSelected.has(Number(u.id)) ? 'checked' : ''} onchange="_wdAuiToggle(${u.id}, this.checked); this.closest('label').style.background = this.checked ? '#f0fdfa' : ''">
        <span style="flex:1;min-width:0">
          <span style="font-weight:600;font-size:.85rem">${esc(u.nama)}</span>${u.is_active === false ? ' <span class="badge badge-abu" style="margin-left:4px">Nonaktif</span>' : ''}
          <span style="display:block;font-size:.72rem;color:var(--teks-muted)">${esc(u.nip || '-')}${u.bidang_nama ? ' · ' + esc(u.bidang_nama) : ''}</span>
        </span>
      </label>`).join('')
    : '<div style="padding:18px;text-align:center;color:var(--teks-muted);font-size:.85rem">Tidak ada user untuk unit kerja ini</div>';
}
function _wdAuiToggle(uid, on) {
  uid = Number(uid);
  if (on) _wdAuiSelected.add(uid); else _wdAuiSelected.delete(uid);
  document.getElementById('wdAuiCounter').textContent = `${_wdAuiSelected.size} dipilih`;
}
async function wdSimpanAssignUser() {
  if (!_wdAuiLoaded || !_wdAuiId) return;
  const btn = document.getElementById('wdAuiSave');
  btn.disabled = true;
  try {
    await _wdFetch('/indikator/' + _wdAuiId + '/users', { method: 'PUT', body: JSON.stringify({ user_ids: [..._wdAuiSelected] }) });
    toast('Assign user berhasil disimpan', 'success');
    closeModal('modalWdAssignUser');
    await loadWalidataIndikator();
  } catch (e) { toast(e.message || 'Gagal menyimpan', 'error'); btn.disabled = false; }
}

async function wdSimpanIndikator() {
  const payload = {
    kode_ssd: document.getElementById('wdfKode').value, uraian: document.getElementById('wdfUraian').value,
    definisi: document.getElementById('wdfDef').value, satuan: document.getElementById('wdfSatuan').value,
    agregasi: document.getElementById('wdfAgr').value,
    unit_ids: [...document.querySelectorAll('.wdUnitChk:checked')].map(c => parseInt(c.value, 10)),
  };
  try {
    const r = await _wdFetch(_wd.editId ? '/indikator/' + _wd.editId : '/indikator', { method: _wd.editId ? 'PUT' : 'POST', body: JSON.stringify(payload) });
    toast(r.dipulihkan ? 'Indikator lama dengan kode ini dipulihkan beserta riwayat realisasinya'
      : r.pindah?.dipindah ? `Indikator tersimpan; ${r.pindah.dipindah} realisasi dipindahkan ke unit kerja` : 'Indikator tersimpan');
    closeModal('modalWdIndikator');
    await loadWalidataIndikator();
  } catch (e) { toast(e.message, 'error'); }
}
async function wdHapusIndikator(id) {
  const i = _wd.indikator.find(x => x.id === id);
  const ada = i?.jumlah_realisasi ? `<br><br>Indikator ini punya <b>${i.jumlah_realisasi}</b> data realisasi. Data tidak dihapus: indikator hanya diarsipkan dan dipulihkan otomatis bila Kode SSD yang sama ditambahkan lagi.` : '';
  if (!await showConfirm({ title: 'Hapus Indikator', msg: `Hapus indikator <b>${esc(i?.kode_ssd)}</b>?${ada}`, okText: 'Ya, Hapus' })) return;
  try { await _wdFetch('/indikator/' + id, { method: 'DELETE' }); toast('Indikator dihapus'); await loadWalidataIndikator(); }
  catch (e) { toast(e.message, 'error'); }
}

// ── Template & Import Excel ────────────────────────────────────────────────
// Format utama (lebar): No | Kode DSSD | Uraian DSSD | Satuan | Definisi Operasional | 2017 | 2018 | ...
// Kolom "Unit Kerja" bersifat opsional; bila tidak ada, unit dipilih di jendela import.
// Format panjang (Tahun + Realisasi per baris) tetap didukung.
const WD_ALIAS = {
  kode_ssd:   ['kodessd', 'kodedssd', 'kode'],
  uraian:     ['uraian', 'uraiandssd', 'uraianssd', 'uraianindikator'],
  definisi:   ['definisioperasional', 'definisi'],
  satuan:     ['satuan'],
  unit_kerja: ['unitkerja', 'unit', 'opd', 'bidang'],
  tahun:      ['tahun'],
  realisasi:  ['realisasi'],
};
const _wdIsYear = h => /^\s*(19|20)\d{2}\s*$/.test(String(h ?? ''));
const _wdKosong = v => v === '' || v === null || v === undefined || (typeof v === 'string' && v.trim() === '');

async function wdUnduhTemplate() {
  try {
    await _loadXlsx();
    const thn = new Date().getFullYear();
    const tahun = Array.from({ length: 9 }, (_, i) => thn - 9 + i);
    const kepala = ['No', 'Kode DSSD', 'Uraian DSSD', 'Satuan', 'Definisi Operasional', ...tahun];
    const contoh = [kepala,
      [1, '1.02.000001', 'Contoh indikator A', 'Orang', 'Definisi operasional indikator A', ...tahun.map((_, i) => 100 + i * 10)],
      [2, '1.02.000002', 'Contoh indikator B (tahun awal belum ada data)', 'Unit', 'Definisi operasional indikator B', '', '', 0, 5, ...tahun.slice(4).map((_, i) => 5 + i)]];
    const petunjuk = [['Petunjuk'],
      ['1. Satu baris = satu indikator; setiap tahun menjadi satu kolom (angka 4 digit pada baris judul).'],
      ['2. Kolom wajib: Kode DSSD. Uraian wajib untuk Kode yang belum ada di sistem.'],
      ['3. Sel tahun kosong = belum diinput (bukan nol). Isi 0 bila memang nol.'],
      ['4. Unit Kerja bersifat opsional. Tambahkan kolom "Unit Kerja" (nama atau singkatan sesuai Master Data) bila tiap baris berbeda unit; bila tidak ada, pilih satu unit di jendela Import atau biarkan kosong dan tetapkan pengampu nanti di Kelola Indikator.'],
      ['5. Data yang sudah ada tidak ditimpa kecuali Anda mengonfirmasinya di pratinjau.']];
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(contoh);
    ws['!cols'] = [{ wch: 5 }, { wch: 14 }, { wch: 44 }, { wch: 12 }, { wch: 50 }, ...tahun.map(() => ({ wch: 9 }))];
    XLSX.utils.book_append_sheet(wb, ws, 'Data');
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(petunjuk), 'Petunjuk');
    XLSX.writeFile(wb, 'Template_Import_Walidata.xlsx');
  } catch (e) { toast(e.message, 'error'); }
}

function wdBukaImport() {
  _wd.importRows = []; _wd.importHasil = []; _wd.importRaw = null; _wd.importMaster = new Map();
  const unitOpt = _wd.bidang.map(b => `<option value="${b.id}">${esc(b.nama)}</option>`).join('');
  const body = `
    <div class="field"><label>File Excel (.xlsx)</label>
      <input type="file" id="wdImpFile" accept=".xlsx,.xls" onchange="wdImportPilihFile(this)"></div>
    <div class="field"><label>Unit Kerja untuk seluruh data di file <span style="font-weight:400;color:var(--teks-muted)">(opsional)</span></label>
      <select id="wdImpUnit" class="input" onchange="wdImportProses()"><option value="">Belum ditetapkan (admin set manual nanti)</option>${unitOpt}</select>
      <div style="font-size:.72rem;color:var(--teks-muted);margin-top:3px">Dipakai bila file tidak punya kolom "Unit Kerja". Bila dikosongkan, realisasi tersimpan sebagai "Belum ditetapkan unit" dan ikut dihitung di total; setelah unit kerja ditetapkan di Kelola Indikator, datanya dipindahkan ke unit tersebut.</div></div>
    <div id="wdImpPreview"></div>`;
  _wdModal('modalWdImport', 'Import Excel Walidata', 'Master indikator & realisasi tahun-tahun sebelumnya (tetap bisa saat periode ditutup)', body,
    `<button class="btn btn-ghost" onclick="closeModal('modalWdImport')">${_WD_BTN.batal}Batal</button>
     <button class="btn btn-primary" id="wdImpSimpan" disabled onclick="wdImportSimpan()">${_WD_BTN.simpan}Simpan</button>`, 980);
  openModal('modalWdImport');
}

async function wdImportPilihFile(input) {
  const f = input.files[0]; if (!f) return;
  const prev = document.getElementById('wdImpPreview');
  prev.innerHTML = '<div style="padding:12px;color:var(--teks-muted)">Membaca file…</div>';
  try {
    await _loadXlsx();
    const wb = XLSX.read(await f.arrayBuffer(), { type: 'array' });
    _wd.importRaw = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { header: 1, raw: true, defval: '' });
    await wdImportProses();
  } catch (e) {
    prev.innerHTML = `<div style="padding:12px;color:#991b1b">${esc(e.message)}</div>`;
    document.getElementById('wdImpSimpan').disabled = true;
  }
}

// Ubah isi sheet jadi baris import (format lebar atau panjang), lalu validasi ke server.
async function wdImportProses() {
  const raw = _wd.importRaw;
  const prev = document.getElementById('wdImpPreview');
  const btn = document.getElementById('wdImpSimpan');
  if (!raw) return;
  btn.disabled = true;
  try {
    const norm = x => String(x ?? '').toLowerCase().replace(/[^a-z]/g, '');
    const head = raw[0] || [];
    const idx = {};
    for (const [k, alias] of Object.entries(WD_ALIAS)) idx[k] = head.findIndex(h => !_wdIsYear(h) && alias.includes(norm(h)));
    if (idx.kode_ssd < 0) throw new Error('Kolom "Kode DSSD" / "Kode SSD" tidak ditemukan di baris pertama. Gunakan template yang disediakan.');
    const yearCols = head.map((h, i) => (_wdIsYear(h) ? { i, tahun: parseInt(h, 10) } : null)).filter(Boolean);
    const panjang = idx.tahun >= 0 && idx.realisasi >= 0;
    if (!panjang && !yearCols.length) throw new Error('Kolom tahun (mis. 2017, 2018, …) tidak ditemukan di baris pertama.');

    let unitDefault = '';
    if (idx.unit_kerja < 0) {
      const id = document.getElementById('wdImpUnit').value;
      unitDefault = id ? (_wd.bidang.find(b => String(b.id) === String(id))?.nama || '') : '';
    }
    prev.innerHTML = '<div style="padding:12px;color:var(--teks-muted)">Memvalidasi…</div>';

    const get = (row, k) => (idx[k] >= 0 ? row[idx[k]] : '');
    const rows = [], master = new Map(), sudahKode = new Set();
    raw.slice(1).forEach((row, n) => {
      const kode = String(get(row, 'kode_ssd') ?? '').trim();
      if (!kode) return;
      const unit = idx.unit_kerja >= 0 ? get(row, 'unit_kerja') : unitDefault;
      const m = { uraian: get(row, 'uraian'), definisi: get(row, 'definisi'), satuan: get(row, 'satuan') };
      if (!master.has(kode.toLowerCase())) master.set(kode.toLowerCase(), m);
      const first = !sudahKode.has(kode.toLowerCase());
      sudahKode.add(kode.toLowerCase());
      const base = { _baris: n + 2, kode_ssd: kode, unit_kerja: unit };
      if (panjang) { rows.push({ ...base, ...m, tahun: get(row, 'tahun'), realisasi: get(row, 'realisasi') }); return; }
      let ada = false, bawaMaster = first;   // uraian/definisi/satuan hanya dibawa baris pertama tiap kode
      for (const yc of yearCols) {
        const v = row[yc.i];
        if (_wdKosong(v)) continue;
        ada = true;
        rows.push({ ...base, ...(bawaMaster ? m : {}), tahun: yc.tahun, realisasi: v });
        bawaMaster = false;
      }
      if (!ada) rows.push({ ...base, ...m, tahun: '', realisasi: '' });   // hanya master
    });
    if (!rows.length) throw new Error('File tidak berisi data.');
    if (rows.length > 8000) throw new Error('Maksimal 8000 baris data per impor (hasil perluasan kolom tahun). Pecah file menjadi beberapa bagian.');
    _wd.importRows = rows; _wd.importMaster = master;

    const r = await _wdFetch('/import', { method: 'POST', body: JSON.stringify({ mode: 'validate', rows }) });
    _wd.importHasil = r.hasil;
    _wdRenderPreviewImport(r.ringkas);
  } catch (e) {
    prev.innerHTML = `<div style="padding:12px;color:#991b1b">${esc(e.message)}</div>`;
    btn.disabled = true;
  }
}

const WD_IMP_BADGE = { baru: ['badge-green', 'Baru'], master: ['badge-blue', 'Master'], sama: ['badge-yellow', 'Sama'], konflik: ['badge-yellow', 'Sudah ada'], error: ['badge-red', 'Error'] };
function _wdRenderPreviewImport(ringkas) {
  const h = _wd.importHasil;
  const chip = (k, label) => ringkas[k] ? `<span class="badge ${WD_IMP_BADGE[k][0]}">${ringkas[k]} ${label}</span>` : '';
  // ringkas per Kode SSD supaya file ribuan baris tetap terbaca
  const per = new Map();
  for (const r of h) {
    const g = per.get(r.kode_ssd) || { kode: r.kode_ssd, uraian: r.uraian, unit: r.unit_nama, n: {}, tahun: [], pesan: new Set(), baru: r.master_baru };
    g.n[r.status] = (g.n[r.status] || 0) + 1;
    if (r.nilai !== null && r.tahun) g.tahun.push(r.tahun);
    if (!g.uraian) g.uraian = r.uraian;
    if (r.status === 'error') r.pesan.forEach(p => g.pesan.add(`Baris ${r.baris}: ${p}`));
    per.set(r.kode_ssd, g);
  }
  const daftar = [...per.values()];
  daftar.sort((a, b) => (b.n.error ? 1 : 0) - (a.n.error ? 1 : 0));   // yang bermasalah di atas
  const tampil = daftar.slice(0, 200);
  const range = g => g.tahun.length ? `${Math.min(...g.tahun)}–${Math.max(...g.tahun)} (${g.tahun.length} thn)` : '-';
  document.getElementById('wdImpPreview').innerHTML = `
    <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:10px;align-items:center">
      <span style="font-size:.8rem"><b>${daftar.length}</b> indikator · <b>${h.filter(x => x.nilai !== null).length}</b> data realisasi</span>
      ${chip('baru', 'baru')}${chip('master', 'master')}${chip('konflik', 'sudah ada')}${chip('sama', 'sama (dilewati)')}${chip('error', 'error (dilewati)')}</div>
    ${ringkas.konflik ? `<label style="display:flex;gap:8px;align-items:center;font-size:.82rem;margin-bottom:10px;padding:8px 10px;background:#fef3c7;border-radius:8px">
      <input type="checkbox" id="wdImpTimpa"> Timpa ${ringkas.konflik} data yang sudah tersimpan dengan nilai dari file ini</label>` : ''}
    <div style="max-height:44vh;overflow:auto"><table class="kinerja-table" style="font-size:.76rem"><thead><tr>
      <th>Kode SSD</th><th>Uraian</th><th>Unit Kerja</th><th>Tahun terisi</th><th>Status</th><th>Keterangan</th></tr></thead><tbody>
      ${tampil.map(g => `<tr><td>${esc(g.kode)}</td><td>${esc(g.uraian || '')}</td><td>${esc(g.unit)}</td><td>${range(g)}</td>
        <td style="white-space:nowrap">${Object.entries(g.n).map(([k, v]) => `<span class="badge ${WD_IMP_BADGE[k][0]}">${v} ${WD_IMP_BADGE[k][1]}</span>`).join(' ')}</td>
        <td>${esc([...g.pesan].slice(0, 2).join('; '))}</td></tr>`).join('')}
    </tbody></table></div>
    ${daftar.length > tampil.length ? `<div style="font-size:.72rem;color:var(--teks-muted);margin-top:6px">Menampilkan ${tampil.length} dari ${daftar.length} indikator (yang bermasalah ditaruh di atas).</div>` : ''}`;
  const layak = h.filter(x => ['baru', 'master', 'konflik'].includes(x.status)).length;
  document.getElementById('wdImpSimpan').disabled = layak === 0;
}

async function wdImportSimpan() {
  const timpa = !!document.getElementById('wdImpTimpa')?.checked;
  if (timpa && !await showConfirm({ title: 'Timpa Data', type: 'warning', icon: 'trash', okText: 'Ya, Timpa',
    msg: 'Nilai realisasi yang sudah tersimpan akan diganti dengan nilai dari file. Perubahan tercatat di riwayat. Lanjutkan?' })) return;
  const btn = document.getElementById('wdImpSimpan');
  btn.disabled = true; btn.innerHTML = _WD_BTN.simpan + 'Menyimpan…';
  const total = { master_baru: 0, realisasi_disimpan: 0, ditimpa: 0, dilewati: 0 };
  try {
    const CHUNK = 150;
    for (let i = 0; i < _wd.importRows.length; i += CHUNK) {
      btn.innerHTML = `${_WD_BTN.simpan}Menyimpan… ${Math.min(i + CHUNK, _wd.importRows.length)}/${_wd.importRows.length}`;
      // baris lanjutan tidak membawa uraian/definisi: sertakan data master pada kemunculan pertama tiap kode di potongan ini
      const sudah = new Set();
      const rows = _wd.importRows.slice(i, i + CHUNK).map(r => {
        const k = String(r.kode_ssd).toLowerCase();
        if (sudah.has(k)) return r;
        sudah.add(k);
        return r.uraian ? r : { ...r, ...(_wd.importMaster.get(k) || {}) };
      });
      const r = await _wdFetch('/import', { method: 'POST', body: JSON.stringify({ mode: 'commit', overwrite: timpa, rows }) });
      for (const k of Object.keys(total)) total[k] += r.ringkas[k] || 0;
    }
    toast(`Import selesai: ${total.realisasi_disimpan} realisasi, ${total.master_baru} indikator baru`);
    closeModal('modalWdImport');
    await loadWalidataIndikator();
  } catch (e) {
    toast(e.message + ' — sebagian data mungkin sudah tersimpan, ulangi impor untuk melanjutkan.', 'error');
    btn.disabled = false; btn.innerHTML = _WD_BTN.simpan + 'Simpan';
  }
}

// Buat container halaman sejak awal (navigateTo mengaktifkan halaman SEBELUM loader jalan, mis. saat restore setelah reload)
_wdEnsurePages();

// ═══ MONITORING PENGISIAN (padanan Monitoring Pengisian di Kinerja) ═════════
const _wdm = { tahun: new Date().getFullYear(), status: '', unit: '', user: '', search: '', page: 1, perPage: 10, data: null, loadedAt: null };
const _wdmAttr = v => esc(JSON.stringify(v));

async function loadWalidataMonitoring() {
  _wdEnsurePages();
  const body = document.getElementById('wdmBody');
  body.innerHTML = `<tr><td colspan="7" style="text-align:center;padding:28px;color:#94a3b8"><span class="btn-spin" style="width:14px;height:14px;vertical-align:-2px;margin-right:6px"></span>Memuat data monitoring…</td></tr>`;
  renderPagination('wdmPagination', 0, 1, _wdm.perPage, 'wdmGoPage');
  _wdm.page = 1;
  try {
    _wdm.data = await _wdFetch('/monitoring?tahun=' + _wdm.tahun);
    const dt = _wdm.data.daftar_tahun || [];
    if (dt.length && !dt.map(Number).includes(_wdm.tahun)) {
      _wdm.tahun = Math.max(...dt.map(Number));
      _wdm.data = await _wdFetch('/monitoring?tahun=' + _wdm.tahun);
    }
    _wdm.loadedAt = new Date();
  } catch (e) {
    toast(e.message, 'error');
    body.innerHTML = `<tr><td colspan="7" style="text-align:center;padding:24px;color:#ef4444">Gagal memuat data.</td></tr>`;
    return;
  }
  _wdmPopulateTahun();
  _wdmSyncStatus();
  _wdmRenderAll();
}
function _wdmRenderAll() {
  _wdmRenderSummary(); _wdmPopulateUnit(); _wdmRenderUnitCards(); _wdmPopulateUser(); _wdmRenderUserCards(); _wdmRenderTable();
}
function _wdmSync(id) { if (typeof syncCustomSelect === 'function') syncCustomSelect(id); }
function _wdmPopulateTahun() {
  document.getElementById('wdmTahun').innerHTML = _wdDaftarTahun(_wdm.data?.daftar_tahun, _wdm.tahun).map(t => `<option value="${t}" ${t === _wdm.tahun ? 'selected' : ''}>${t}</option>`).join('');
  _wdmSync('wdmTahun');
}
function _wdmSyncStatus() { const s = document.getElementById('wdmStatus'); if (s) s.value = _wdm.status; _wdmSync('wdmStatus'); }
function _wdmLastUpdate() {
  if (!_wdm.loadedAt) return '-';
  const tgl = _wdm.loadedAt.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'Asia/Makassar' });
  const jam = _wdm.loadedAt.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', hourCycle: 'h23', timeZone: 'Asia/Makassar' }).replace('.', ':');
  return `${tgl} | ${jam} WITA`;
}
const _wdmClock = '<svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>';
const _wdmLastHtml = () => `<span style="font-size:var(--fs-xs);font-weight:500;color:var(--teks-muted);display:inline-flex;align-items:center;gap:4px;font-variant-numeric:tabular-nums">${_wdmClock}Update terakhir: <span style="color:var(--teks);font-weight:600">${_wdmLastUpdate()}</span></span>`;
const _wdmResetBtn = (fn) => `<button onclick="${fn}('')" style="font-size:var(--fs-xs);background:var(--hijau-light);border:none;border-radius:999px;padding:2px 10px;cursor:pointer;color:var(--hijau);font-weight:700;display:inline-flex;align-items:center;gap:3px"><svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/></svg>Reset</button>`;

function _wdmRows() { return _wdm.data?.indikator || []; }

function _wdmRenderSummary() {
  const el = document.getElementById('wdmSummary');
  if (!el || !_wdm.data) return;
  let summary = _wdm.data.summary;
  if (_wdm.unit || _wdm.user) {
    let rows = _wdmRows();
    if (_wdm.unit) rows = rows.filter(r => r.unit === _wdm.unit);
    if (_wdm.user) rows = rows.filter(r => r.pic_users.includes(_wdm.user));
    const terisi = rows.filter(r => r.status === 'terisi').length;
    summary = { total: rows.length, terisi, belum: rows.length - terisi };
  }
  const pct = summary.total ? Math.round(summary.terisi / summary.total * 100) : 0;
  const tone = pct >= 80 ? { c: '#16a34a', c2: '#22c55e' } : pct >= 50 ? { c: '#d97706', c2: '#f59e0b' } : { c: '#dc2626', c2: '#ef4444' };
  // Card KPI: gaya sama dengan Monitoring Pengisian di Kinerja (.stat-card, garis aksen kiri)
  const kpi = (value, label, color, bg, iconSvg) => `
    <div class="stat-card" style="border-left-color:${color}">
      <div class="stat-card-body">
        <div class="stat-label">${label}</div>
        <div class="stat-value" style="color:${color}">${value}</div>
      </div>
      <div class="stat-icon" style="background:${bg};opacity:1">
        <svg xmlns="http://www.w3.org/2000/svg" width="17" height="17" fill="none" viewBox="0 0 24 24" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${iconSvg}</svg>
      </div>
    </div>`;
  el.innerHTML = `
    <div class="mon-kpi-grid">
      ${kpi(summary.terisi, 'Terinput', '#16a34a', 'rgba(22,163,74,.12)',
        '<path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>')}
      ${kpi(summary.belum, 'Belum Input', '#d97706', 'rgba(217,119,6,.12)',
        '<circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>')}
      ${kpi(summary.total, 'Total', 'var(--hijau)', 'rgba(15,118,110,.12)',
        '<path d="M3 3v18h18"/><path d="M18 17V9"/><path d="M13 17V5"/><path d="M8 17v-3"/>')}

      <div class="stat-card mon-kpi-progress" style="flex-direction:column;align-items:stretch;border-left-color:${tone.c}">
        <div style="display:flex;justify-content:space-between;align-items:baseline;gap:var(--sp-3)">
          <span class="stat-label">Progress Pengisian</span>
          <span style="font-size:var(--fs-lg);font-weight:800;color:${tone.c};font-variant-numeric:tabular-nums">${pct}%</span>
        </div>
        <div style="background:var(--abu-2);border-radius:99px;height:9px;overflow:hidden;margin-top:var(--sp-3);box-shadow:inset 0 1px 2px rgba(0,0,0,.06)">
          <div style="width:${pct}%;height:100%;border-radius:99px;background:linear-gradient(90deg,${tone.c},${tone.c2});transition:width .5s cubic-bezier(.4,0,.2,1)"></div>
        </div>
        <div style="font-size:var(--fs-xs);color:var(--teks-muted);margin-top:var(--sp-3);display:flex;align-items:center;flex-wrap:wrap;gap:5px;font-variant-numeric:tabular-nums">
          <span>Tahun ${_wdm.data.tahun}</span>
          <span style="color:var(--abu-2)">&bull;</span>
          <span style="display:inline-flex;align-items:center;gap:4px">${_wdmClock}Update terakhir: <span style="color:var(--teks);font-weight:600">${_wdmLastUpdate()}</span></span>
        </div>
      </div>
    </div>`;
}

function _wdmPopulateUnit() {
  const sel = document.getElementById('wdmUnit');
  if (!sel || !_wdm.data) return;
  const NO = '- Tanpa Unit -';
  const list = (_wdm.data.summary_unit || []).map(p => p.unit).filter(Boolean)
    .sort((a, b) => ((a === NO) - (b === NO)) || a.localeCompare(b, 'id'));
  if (_wdm.unit && !list.includes(_wdm.unit)) _wdm.unit = '';
  sel.innerHTML = '<option value="">Semua Unit Kerja</option>' + list.map(n => `<option value="${esc(n)}"${n === _wdm.unit ? ' selected' : ''}>${esc(n)}</option>`).join('');
  sel.value = _wdm.unit; sel.disabled = !list.length; _wdmSync('wdmUnit');
}
function _wdmPopulateUser() {
  const sel = document.getElementById('wdmUser');
  if (!sel || !_wdm.data) return;
  const rows = _wdm.unit ? _wdmRows().filter(r => r.unit === _wdm.unit) : _wdmRows();
  const users = new Set();
  rows.forEach(r => r.pic_users.forEach(u => u && users.add(u)));
  const list = [...users].sort((a, b) => a.localeCompare(b, 'id'));
  if (_wdm.user && !list.includes(_wdm.user)) _wdm.user = '';
  sel.innerHTML = '<option value="">Semua User</option>' + list.map(u => `<option value="${esc(u)}"${u === _wdm.user ? ' selected' : ''}>${esc(u)}</option>`).join('');
  sel.value = _wdm.user; sel.disabled = !list.length; _wdmSync('wdmUser');
}

function _wdmRenderUnitCards() {
  const el = document.getElementById('wdmUnitCards');
  if (!el) return;
  const list = _wdm.data?.summary_unit;
  if (!list?.length) { el.innerHTML = ''; return; }
  const R = 19, C = 2 * Math.PI * R;
  const cards = list.map(p => {
    const pct = p.total ? Math.round(p.terisi / p.total * 100) : 0;
    const tone = pct >= 91 ? { c: '#16a34a', c2: '#4ade80' } : pct >= 76 ? { c: '#65a30d', c2: '#a3e635' } : pct >= 66 ? { c: '#ca8a04', c2: '#eab308' }
               : pct >= 51 ? { c: '#ea580c', c2: '#f97316' } : { c: '#dc2626', c2: '#ef4444' };
    const act = _wdm.unit === p.unit;
    const off = C - (pct / 100) * C;
    const sh = act ? '0 0 0 3px rgba(13,148,136,.12), var(--shadow-sm)' : 'var(--shadow-sm)';
    return `<div class="mon-pj-card" onclick="wdmSetUnit(${_wdmAttr(p.unit)})" data-tip="Klik untuk filter"
         style="cursor:pointer;position:relative;overflow:hidden;background:${act ? 'linear-gradient(135deg,rgba(15,118,110,.07),rgba(255,255,255,.95))' : '#fff'};border:1.5px solid ${act ? 'var(--hijau)' : 'var(--abu-2)'};border-radius:var(--r-md);box-shadow:${sh};transition:box-shadow var(--transition), transform var(--transition), border-color var(--transition)"
         onmouseover="this.style.boxShadow='var(--shadow-md)';this.style.transform='translateY(-2px)'" onmouseout="this.style.boxShadow='${sh}';this.style.transform='none'">
      <div style="height:3px;background:linear-gradient(90deg,${tone.c},${tone.c2})"></div>
      <div style="padding:var(--sp-4);display:flex;align-items:flex-start;gap:var(--sp-4)">
        <svg width="52" height="52" viewBox="0 0 52 52" style="flex-shrink:0">
          <circle cx="26" cy="26" r="${R}" fill="none" stroke="var(--abu-2)" stroke-width="5"/>
          <circle cx="26" cy="26" r="${R}" fill="none" stroke="${tone.c}" stroke-width="5" stroke-linecap="round" stroke-dasharray="${C.toFixed(2)}" stroke-dashoffset="${off.toFixed(2)}" transform="rotate(-90 26 26)" style="transition:stroke-dashoffset .6s cubic-bezier(.4,0,.2,1)"/>
          <text x="26" y="30.5" text-anchor="middle" font-size="10.5" font-weight="800" fill="${tone.c}" font-family="inherit">${pct}%</text>
        </svg>
        <div style="min-width:0;flex:1">
          <div style="font-size:var(--fs-sm);font-weight:700;color:var(--teks);white-space:normal;word-break:break-word;line-height:1.35">${esc(p.unit)}</div>
          <div style="font-size:var(--fs-xs);color:var(--teks-muted);margin-top:var(--sp-2);font-variant-numeric:tabular-nums;display:flex;align-items:center;gap:4px">
            <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0;opacity:.6"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>
            <span>${p.terisi} dari ${p.total} terinput</span>
          </div>
        </div>
      </div>
    </div>`;
  }).join('');
  el.innerHTML = `
    <div style="margin-bottom:var(--sp-5)">
      <div style="font-size:var(--fs-sm);font-weight:700;color:var(--teks);margin-bottom:var(--sp-3);display:flex;align-items:center;gap:var(--sp-2)">
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="var(--hijau)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></svg><span>Progress per Unit Kerja</span>${_wdm.unit ? _wdmLastHtml() + _wdmResetBtn('wdmSetUnit') : ''}
      </div>
      <div class="mon-card-grid">${cards}</div>
    </div>`;
}

function _wdmRenderUserCards() {
  const el = document.getElementById('wdmUserCards');
  if (!el) return;
  if (!_wdm.unit || !_wdm.data) { el.innerHTML = ''; return; }
  const map = {};
  _wdmRows().filter(r => r.unit === _wdm.unit).forEach(r => r.pic_users.filter(Boolean).forEach(u => {
    map[u] = map[u] || { nama: u, total: 0, terisi: 0 };
    map[u].total++; if (r.status === 'terisi') map[u].terisi++;
  }));
  const list = Object.values(map).sort((a, b) => (a.terisi / a.total) - (b.terisi / b.total) || a.nama.localeCompare(b.nama, 'id'));
  const head = `<div style="font-size:var(--fs-sm);font-weight:700;color:var(--teks);margin-bottom:var(--sp-3);display:flex;align-items:center;gap:var(--sp-2)"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="var(--hijau)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg><span>Progress per User - ${esc(_wdm.unit)}</span>${_wdmLastHtml()}${_wdm.user ? _wdmResetBtn('wdmSetUser') : ''}</div>`;
  if (!list.length) { el.innerHTML = `<div style="margin-bottom:var(--sp-5)">${head}<div style="font-size:var(--fs-xs);color:var(--teks-muted);font-style:italic">Belum ada user yang ditugaskan di unit kerja ini.</div></div>`; return; }
  const cards = list.map(u => {
    const pct = u.total ? Math.round(u.terisi / u.total * 100) : 0;
    const act = _wdm.user === u.nama, done = u.terisi === u.total;
    const tone = done ? { c: '#16a34a', bg: '#dcfce7' } : (u.terisi > 0 ? { c: '#d97706', bg: '#fef3c7' } : { c: '#dc2626', bg: '#fee2e2' });
    const icon = done ? '<path stroke-linecap="round" stroke-linejoin="round" d="M4.5 12.75l6 6 9-13.5"/>' : '<circle cx="12" cy="12" r="9"/><path stroke-linecap="round" stroke-linejoin="round" d="M12 7.5v5l3 2"/>';
    const sh = act ? '0 0 0 3px rgba(13,148,136,.12), var(--shadow-sm)' : 'var(--shadow-sm)';
    return `<div onclick="wdmSetUser(${_wdmAttr(act ? '' : u.nama)})" data-tip="Klik untuk filter tabel"
         style="cursor:pointer;display:flex;align-items:center;gap:10px;background:${act ? 'linear-gradient(135deg,rgba(15,118,110,.07),rgba(255,255,255,.95))' : '#fff'};border:1.5px solid ${act ? 'var(--hijau)' : 'var(--abu-2)'};border-radius:var(--r-md);padding:10px 14px;box-shadow:${sh};transition:box-shadow var(--transition), transform var(--transition), border-color var(--transition)"
         onmouseover="this.style.boxShadow='var(--shadow-md)';this.style.transform='translateY(-2px)'" onmouseout="this.style.boxShadow='${sh}';this.style.transform='none'">
      <div style="width:30px;height:30px;border-radius:50%;background:${tone.bg};display:flex;align-items:center;justify-content:center;flex-shrink:0"><svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="${tone.c}" stroke-width="2.2">${icon}</svg></div>
      <div style="min-width:0;flex:1">
        <div style="font-size:.78rem;font-weight:700;color:var(--teks);white-space:normal;word-break:break-word;line-height:1.3">${esc(u.nama)}</div>
        <div style="font-size:.68rem;color:${tone.c};font-weight:600;margin-top:2px">${u.terisi} dari ${u.total} terinput (${pct}%)</div>
      </div>
    </div>`;
  }).join('');
  el.innerHTML = `<div style="margin-bottom:var(--sp-5)">${head}<div class="mon-card-grid">${cards}</div></div>`;
}

function wdmGoPage(p) { _wdm.page = p; _wdmRenderTable(); }

function _wdmRenderTable() {
  const body = document.getElementById('wdmBody');
  if (!body || !_wdm.data) return;
  let rows = _wdmRows();
  if (_wdm.status) rows = rows.filter(r => r.status === _wdm.status);
  if (_wdm.unit) rows = rows.filter(r => r.unit === _wdm.unit);
  if (_wdm.user) rows = rows.filter(r => r.pic_users.includes(_wdm.user));
  if (_wdm.search) {
    const q = _wdm.search.toLowerCase();
    rows = rows.filter(r => `${r.kode_ssd} ${r.uraian} ${r.unit} ${r.pic_users.join(' ')}`.toLowerCase().includes(q));
  }
  if (!rows.length) {
    body.innerHTML = `<tr><td colspan="7" style="text-align:center;padding:28px;color:#94a3b8">Tidak ada data sesuai filter.</td></tr>`;
    renderPagination('wdmPagination', 0, 1, _wdm.perPage, 'wdmGoPage');
    return;
  }
  const total = rows.length, pages = Math.ceil(total / _wdm.perPage);
  if (_wdm.page > pages) _wdm.page = pages;
  const start = (_wdm.page - 1) * _wdm.perPage;
  const fmtDT = iso => iso ? new Date(iso).toLocaleString('id-ID', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Makassar' }).replace(' pukul', '').replace(/(\d{1,2})\.(\d{2})$/, '$1:$2') + ' WITA' : '-';
  body.innerHTML = rows.slice(start, start + _wdm.perPage).map((r, i) => {
    const ok = r.status === 'terisi';
    const badge = ok
      ? `<span style="display:inline-block;background:#dcfce7;color:#15803d;border-radius:6px;padding:3px 9px;font-size:.71rem;font-weight:700">Terinput</span>`
      : `<span style="display:inline-block;background:#fef2f2;color:#b91c1c;border-radius:6px;padding:3px 9px;font-size:.71rem;font-weight:700">Belum Input</span>`;
    const pic = r.pic_users.length
      ? r.pic_users.map(n => `<div style="font-size:.74rem;font-weight:600;color:#1e293b;line-height:1.4">${esc(n)}</div>`).join('') + (ok && r.diisi_pada ? `<div style="font-size:.65rem;color:#94a3b8;margin-top:2px">${fmtDT(r.diisi_pada)}</div>` : '')
      : `<span style="font-size:.72rem;color:#94a3b8;font-style:italic">Belum ditugaskan</span>`;
    const nilai = ok ? `<strong>${_wdNum(r.nilai)}</strong>${r.satuan ? ` <span style="font-size:.68rem;color:var(--teks-muted)">${esc(r.satuan)}</span>` : ''}` : '<span class="capaian-badge na">-</span>';
    return `<tr style="${ok ? '' : 'background:#fffbf7'}">
      <td style="text-align:center;font-size:.78rem;color:#94a3b8;padding:10px 8px">${start + i + 1}</td>
      <td style="font-weight:600;padding:10px 8px">${esc(r.kode_ssd)}</td>
      <td style="padding:10px 10px"><div style="font-size:.82rem;font-weight:600;color:#1e293b;line-height:1.4;white-space:normal;word-break:break-word">${esc(r.uraian)}</div>${_wdDefinisi(r.definisi)}</td>
      <td style="font-size:.78rem;color:#64748b;padding:10px 8px;text-align:center;white-space:normal"><div style="max-width:220px;margin:0 auto;line-height:1.4;overflow-wrap:anywhere">${esc(r.unit || '-')}</div></td>
      <td style="text-align:center;padding:10px 8px">${badge}</td>
      <td style="padding:10px 8px;text-align:center">${pic}</td>
      <td style="text-align:center;padding:10px 8px">${nilai}</td>
    </tr>`;
  }).join('');
  renderPagination('wdmPagination', total, _wdm.page, _wdm.perPage, 'wdmGoPage');
}

// ── Filter handlers ────────────────────────────────────────────────────────
function wdmSetTahun(t) { _wdm.tahun = parseInt(t, 10); loadWalidataMonitoring(); }
function wdmSetStatus(s) { _wdm.page = 1; _wdm.status = s || ''; _wdmRenderTable(); }
function wdmSetUnit(u) {   // toggle (klik kartu); '' = reset
  _wdm.page = 1;
  _wdm.unit = (_wdm.unit === u) ? '' : (u || '');
  _wdm.user = '';
  _wdmRenderAll();
}
function wdmSetUnitSelect(v) { _wdm.unit = ''; wdmSetUnit(v || ''); }
function wdmSetUser(u) {
  _wdm.page = 1; _wdm.user = u || '';
  _wdmPopulateUser(); _wdmRenderSummary(); _wdmRenderUserCards(); _wdmRenderTable();
}
