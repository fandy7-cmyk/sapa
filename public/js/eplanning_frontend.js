

const EP_ICON_EDIT = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>`;
const EP_ICON_TRASH = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path stroke-linecap="round" stroke-linejoin="round" d="M19 6l-1 14H6L5 6"/><path stroke-linecap="round" stroke-linejoin="round" d="M10 11v6m4-6v6"/><path stroke-linecap="round" stroke-linejoin="round" d="M9 6V4h6v2"/></svg>`;
const EP_ICON_CHECK = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"/></svg>`;
const EP_ICON_BACK = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M9 14l-4-4m0 0l4-4m-4 4h11a4 4 0 010 8h-1"/></svg>`;
const EP_ICON_LIST = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/></svg>`;
const EP_ICON_COPY = `<svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="14" height="14" x="8" y="8" rx="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>`;
const EP_ICON_SEND = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"/></svg>`;
const EP_ICON_POWER_ON = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18.36 6.64A9 9 0 0 1 20.77 15"/><path d="M6.16 6.16a9 9 0 1 0 12.68 12.68"/><path d="M12 2v4"/><path d="M2 12h4"/></svg>`;
const EP_ICON_POWER_OFF = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 12l2 2 4-4"/><circle cx="12" cy="12" r="10"/></svg>`;

function epFmtRupiah(n) {
  const v = Number(n) || 0;
  return 'Rp ' + v.toLocaleString('id-ID');
}

function epRenderSumberDanaRingkasan(summary) {
  const el = document.getElementById('epSumberDanaRingkasan');
  if (!el) return;
  if (!summary || !summary.length) {
    el.textContent = 'Belum ada Rincian Anggaran.';
    return;
  }
  el.innerHTML = summary.map(s => `<div style="display:flex;justify-content:space-between;gap:12px">
    <span>${esc(s.nama)}</span><span style="font-weight:600;white-space:nowrap">${epFmtRupiah(s.total)}</span>
  </div>`).join('');
}

// Samain persis sama getRole() di netlify/functions/eplanning.js - superadmin SAPA
// otomatis isAdmin penuh, TAPI bukan isKabid/isOperator (hasAccess() bypass semua
// key buat admin, jadi gak bisa dipakai langsung di sini atau superadmin ikut
// keanggap Kabid & Operator sekaligus, padahal cuma admin doang).
function epRole() {
  if (_user.is_admin) return { isAdmin: true, isKabid: false, isOperator: false, isSekretaris: false };
  return {
    isAdmin: hasAccess('eplanning.admin'),
    isKabid: hasAccess('eplanning.kabid'),
    isOperator: hasAccess('eplanning.operator'),
    isSekretaris: hasAccess('eplanning.sekretaris'),
  };
}

function isEpMenungguKepala(status) {
  return typeof status === 'string' && status.startsWith('MENUNGGU KEPALA');
}

function epStatusBadge(status) {
  const FIXED = {
    'DRAFT':              ['badge-yellow', 'Draft'],
    'MENUNGGU SEKRETARIS': ['badge-blue',  'Menunggu Sekretaris'],
    'MENUNGGU ADMIN':      ['badge-blue',  'Menunggu Admin'],
    'SELESAI':            ['badge-green',  'Selesai'],
    'DITOLAK':            ['badge-red',    'Ditolak'],
  };
  if (FIXED[status]) {
    const [cls, label] = FIXED[status];
    return `<span class="badge ${cls}">${label}</span>`;
  }
  
  if (typeof status === 'string' && status.startsWith('MENUNGGU KEPALA')) {
    const label = status.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
    return `<span class="badge badge-blue">${label}</span>`;
  }
  return `<span class="badge badge-yellow">${status || '-'}</span>`;
}

const EP_STATUS_ORDER = [
  ['DRAFT',                       'Draft'],
  ['MENUNGGU KEPALA PUSKESMAS',   'Menunggu Kepala Puskesmas'],
  ['MENUNGGU KEPALA BIDANG',      'Menunggu Kepala Bidang'],
  ['MENUNGGU KEPALA SUB BAGIAN',  'Menunggu Kepala Sub Bagian'],
  ['MENUNGGU SEKRETARIS',         'Menunggu Sekretaris'],
  ['MENUNGGU ADMIN',              'Menunggu Admin'],
  ['DITOLAK',                     'Ditolak'],
  ['SELESAI',                     'Selesai'],
];

let _epUsulanList = [];
let _epFilterStatus = '';
let _epFilterBidang = '';   // '' | bidang_id (string, dari <option value>)
let _epSearchText   = '';   // pencarian sub kegiatan (client-side)
let _epPage         = 1;
const _epPageSize   = 10;

// ── Dropdown Tahun global (e-Planning) - 1 filter yg ngefek ke Usulan + Standar Harga
// sekaligus (niru dropdown Tahun di SIPD). State-nya disimpen di localStorage biar
// tetap sama pas pindah antar sub-halaman (Usulan ⇄ Standar Harga), 2 <select> yg beda
// DOM (epTahunAktif di halaman Usulan, epShTahunAktif di halaman Standar Harga) tapi
// selalu disinkronin ke 1 variabel yg sama.
let _epTahunList = [];
let _epTahunAktif = parseInt(localStorage.getItem('ep_tahun_aktif')) || null;
let _epTahunLoaded = false;

async function epEnsureTahunList() {
  if (_epTahunLoaded && _epTahunList.length) { _renderEpTahunDropdowns(); return; }
  try {
    const r = await fetch('/api/eplanning/tahun', { headers: authHeaders() });
    const d = await r.json();
    _epTahunList = d.tahun || [];
  } catch { _epTahunList = []; }
  if (!_epTahunList.length) _epTahunList = [new Date().getFullYear() + 1];
  if (!_epTahunAktif || !_epTahunList.includes(_epTahunAktif)) {
    _epTahunAktif = _epTahunList[0];
    localStorage.setItem('ep_tahun_aktif', String(_epTahunAktif));
  }
  _epTahunLoaded = true;
  _renderEpTahunDropdowns();
}

function _renderEpTahunDropdowns() {
  ['epTahunAktif', 'epShTahunAktif'].forEach(id => {
    const sel = document.getElementById(id);
    if (!sel) return;
    sel.innerHTML = _epTahunList.map(t => `<option value="${t}">${t}</option>`).join('');
    sel.value = _epTahunAktif;
    const wrap = sel.closest('.select-wrap');
    if (wrap) {
      wrap.querySelector('.csel-trigger')?.remove();
      wrap.querySelector('.csel-panel')?.remove();
      if (typeof window.initCustomSelects === 'function') window.initCustomSelects();
    }
  });
}

function setEpTahunAktif(val) {
  _epTahunAktif = parseInt(val);
  localStorage.setItem('ep_tahun_aktif', String(_epTahunAktif));
  _renderEpTahunDropdowns();
  const pageUsulan = document.getElementById('page-eplanning');
  const pageSh = document.getElementById('page-eplanning-standarharga');
  if (pageUsulan && pageUsulan.classList.contains('active')) loadEplanning();
  if (pageSh && pageSh.classList.contains('active')) epLoadStandarHarga(1);
}

async function loadEplanning() {
  
  
  
  const btnTambah = document.getElementById('btnTambahEpUsulan');
  const tbody = document.getElementById('epTableBody');
  if (tbody) tbody.innerHTML = `<tr class="empty-row"><td colspan="7">Memuat data...</td></tr>`;

  
  
  
  
  
  const [periodeList] = await Promise.all([_epFetchPeriodeAktif(), epEnsureTahunList()]);
  _epApplyPeriodeAktif(periodeList);
  if (btnTambah) btnTambah.style.display = (epRole().isOperator && _epPeriodeAktif) ? '' : 'none';
  renderEpPeriodeBanner();

  try {
    
    
    const qs = new URLSearchParams(_epTahunAktif ? { tahun: _epTahunAktif } : {});
    const r = await fetch(`/api/eplanning/usulan?${qs}`, { headers: authHeaders() });
    const d = await r.json();
    if (!r.ok) throw new Error(d.error || 'Gagal memuat data');
    _epUsulanList = d.usulan || [];
    _epPage = 1;
    _rebuildEpFilterBidang();
    _rebuildEpFilterStatus();
    renderEplanningTable();
  } catch (err) {
    if (tbody) tbody.innerHTML = `<tr class="empty-row"><td colspan="7">${esc(err.message)}</td></tr>`;
  }
}

function _rebuildEpFilterBidang() {
  const sel = document.getElementById('epFilterBidang');
  if (!sel) return;
  const wrap = sel.closest('.select-wrap') || sel;
  const current = _epFilterBidang;
  const map = new Map(); 
  _epUsulanList.forEach(u => { if (u.bidang_id != null) map.set(String(u.bidang_id), u.bidang_nama || '-'); });

  wrap.style.display = '';
  const opts = [...map.entries()]
    .sort((a, b) => a[1].localeCompare(b[1], 'id'))
    .map(([id, nama]) => `<option value="${id}">${esc(nama)}</option>`)
    .join('');
  sel.innerHTML = `<option value="">Semua Unit Kerja</option>` + opts;

  if (map.size === 1) {
    // Cuma ada 1 unit kerja di data → langsung ke-select otomatis ke unit itu
    _epFilterBidang = [...map.keys()][0];
  } else if (current && !map.has(current)) {
    // Bidang yang lagi dipilih ternyata udah gak ada di data baru → reset ke "Semua"
    _epFilterBidang = '';
  } else {
    _epFilterBidang = current;
  }
  sel.value = _epFilterBidang;
}

// Isi dropdown "Status" cuma dengan status yang benar-benar ada di data usulan saat ini,
// urutannya ngikutin alur proses (Draft → Diajukan → Perlu Koreksi → Disetujui → Ditolak).
// - Kalau cuma ada 1 status di data → langsung ke-select otomatis ke status itu.
// - Kalau lebih dari 1 status → default balik ke "Semua Status".
function _rebuildEpFilterStatus() {
  const sel = document.getElementById('epFilterStatus');
  if (!sel) return;
  const present = new Set(_epUsulanList.map(u => u.status));

  const opts = EP_STATUS_ORDER
    .filter(([code]) => present.has(code))
    .map(([code, label]) => `<option value="${code}">${esc(label)}</option>`)
    .join('');
  sel.innerHTML = `<option value="">Semua Status</option>` + opts;

  if (present.size === 1) {
    _epFilterStatus = [...present][0];
  } else {
    _epFilterStatus = '';
  }
  sel.value = _epFilterStatus;
}

// ── Kartu periode "Pengusulan e-Planning" - versi card + countdown + progress bar
//    (dipakai style-nya sama seperti kartu periode di modul Kinerja: .kperiode-*)
let _epCountdownTimer = null;

function renderEpPeriodeBanner() {
  const el = document.getElementById('epPeriodeBanner');
  if (!el) return;
  const p = _epPeriodeAktif;

  if (_epCountdownTimer) { clearInterval(_epCountdownTimer); _epCountdownTimer = null; }

  if (!p) {
    el.innerHTML = '';
    return;
  }

  const closeMs = p.close_at ? new Date(p.close_at).getTime() : null;
  const openMs  = p.open_at  ? new Date(p.open_at).getTime()  : null;
  const openLabel  = p.open_at  ? new Date(p.open_at).toLocaleString('id-ID', { day:'2-digit', month:'long', year:'numeric', hour:'2-digit', minute:'2-digit', timeZone: 'Asia/Makassar' }).replace(' pukul','') + ' WITA' : '-';
  const closeLabel = p.close_at ? new Date(p.close_at).toLocaleString('id-ID', { day:'2-digit', month:'long', year:'numeric', hour:'2-digit', minute:'2-digit', timeZone: 'Asia/Makassar' }).replace(' pukul','') + ' WITA' : '-';

  el.innerHTML = `
    <div class="kperiode-card" id="epPeriode_card">
      <div class="kperiode-header">
        <span class="kperiode-header-title">
          <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M8 2v4"/><path d="M16 2v4"/><path d="M3 10h18"/></svg>
          Periode Pengusulan ${p.tahun}
        </span>
        <span class="kperiode-header-timer" id="epPeriode_timer">…</span>
      </div>
      <div class="kperiode-body">
        <div class="kperiode-action-label">
          <span class="kperiode-jenis-pill" style="background:#dcfce7;color:#15803d">
            <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M9 11l3 3L22 4"/><path stroke-linecap="round" stroke-linejoin="round" d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>
            USULAN
          </span>
          PENGUSULAN ANGGARAN
        </div>
        <div class="kperiode-progress-track">
          <div class="kperiode-progress-fill ok" id="epPeriode_fill" style="width:0%"></div>
        </div>
        <div class="kperiode-window-row">
          <span class="kperiode-window-open">
            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 9.9-1"/></svg>
            ${openLabel}
          </span>
          <span class="kperiode-window-close">
            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
            ${closeLabel}
          </span>
        </div>
        <div class="kperiode-expired-msg" id="epPeriode_expired" style="display:none">
          Waktu pengusulan telah <strong>ditutup</strong>. Usulan tidak bisa diajukan/diedit lagi.
        </div>
      </div>
    </div>`;

  if (!closeMs) return; 

  function _tick() {
    const now  = Date.now();
    const diff = closeMs - now;
    const timerEl   = document.getElementById('epPeriode_timer');
    const fillEl    = document.getElementById('epPeriode_fill');
    const cardEl    = document.getElementById('epPeriode_card');
    const expiredEl = document.getElementById('epPeriode_expired');
    if (!timerEl || !fillEl || !cardEl) { clearInterval(_epCountdownTimer); _epCountdownTimer = null; return; }

    if (diff <= 0) {
      timerEl.textContent = 'Ditutup';
      cardEl.className = 'kperiode-card expired';
      fillEl.style.width = '100%';
      if (expiredEl) expiredEl.style.display = 'block';
      clearInterval(_epCountdownTimer);
      _epCountdownTimer = null;
      return;
    }

    const hari  = Math.floor(diff / 86400000);
    const jam   = Math.floor((diff % 86400000) / 3600000);
    const menit = Math.floor((diff % 3600000) / 60000);
    const detik = Math.floor((diff % 60000) / 1000);
    const pad = n => String(n).padStart(2, '0');

    const total   = openMs && closeMs > openMs ? (closeMs - openMs) : null;
    const sisaPct = total ? (diff / total) * 100 : 100;
    let urgency = 'ok';
    if (diff < 86400000 * 3 || sisaPct <= 10) urgency = 'urgent';      
    else if (diff < 86400000 * 14 || sisaPct <= 25) urgency = 'warn';  

    timerEl.textContent = hari > 0
      ? `${hari}h ${pad(jam)}:${pad(menit)}:${pad(detik)}`
      : `${pad(jam)}:${pad(menit)}:${pad(detik)}`;
    cardEl.className = `kperiode-card ${urgency}`;
    fillEl.className = `kperiode-progress-fill ${urgency}`;

    if (openMs && closeMs > openMs) {
      const pct = Math.min(100, Math.max(0, ((now - openMs) / (closeMs - openMs)) * 100));
      fillEl.style.width = pct + '%';
    } else {
      fillEl.style.width = '100%';
    }
  }

  _tick();
  _epCountdownTimer = setInterval(_tick, 1000);
}

function setEpFilterStatus(status) {
  _epFilterStatus = status;
  _epPage = 1;
  renderEplanningTable();
}

function setEpFilterBidang(bidangId) {
  _epFilterBidang = bidangId;
  _epPage = 1;
  renderEplanningTable();
}

function setEpSearchText(text) {
  _epSearchText = (text || '').trim();
  _epPage = 1;
  renderEplanningTable();
}

function _epFilteredList() {
  const q = _epSearchText.toLowerCase();
  return _epUsulanList.filter(u => {
    if (_epFilterStatus && u.status !== _epFilterStatus) return false;
    if (_epFilterBidang && String(u.bidang_id) !== _epFilterBidang) return false;
    if (q && !(u.sub_kegiatan || '').toLowerCase().includes(q)) return false;
    return true;
  });
}

function renderEplanningTable() {
  const tbody = document.getElementById('epTableBody');
  if (!tbody) return;
  const role = epRole();
  const filtered = _epFilteredList();
  if (!_epUsulanList.length) {
    tbody.innerHTML = `<tr class="empty-row"><td colspan="7">Belum ada usulan</td></tr>`;
    renderPagination('epPagination', 0, 1, _epPageSize, 'goEpPage');
    return;
  }
  if (!filtered.length) {
    tbody.innerHTML = `<tr class="empty-row"><td colspan="7">Tidak ada usulan yang cocok dengan filter</td></tr>`;
    renderPagination('epPagination', 0, 1, _epPageSize, 'goEpPage');
    return;
  }
  const totalPages = Math.max(1, Math.ceil(filtered.length / _epPageSize));
  if (_epPage > totalPages) _epPage = totalPages;
  const start = (_epPage - 1) * _epPageSize;
  const list = filtered.slice(start, start + _epPageSize);
  tbody.innerHTML = list.map((u, i) => {
    const canEdit = ['DRAFT', 'DITOLAK'].includes(u.status) &&
      (role.isAdmin || (role.isOperator && u.pembuat_user_id === _user.id));
    
    
    const canDelete = _user.is_admin || canEdit;
    const canSubmit = u.status === 'DRAFT' &&
      (role.isAdmin || (role.isOperator && u.pembuat_user_id === _user.id));
    const canApproveKabid = role.isKabid && isEpMenungguKepala(u.status);
    const canApproveSekretaris = (role.isAdmin || role.isSekretaris) && u.status === 'MENUNGGU SEKRETARIS';
    const canApproveAdmin = role.isAdmin && u.status === 'MENUNGGU ADMIN';
    const canTolak = (role.isAdmin && (u.status === 'MENUNGGU ADMIN' || u.status === 'MENUNGGU SEKRETARIS')) ||
      (role.isSekretaris && u.status === 'MENUNGGU SEKRETARIS') ||
      (role.isKabid && isEpMenungguKepala(u.status));
    return `<tr>
      <td>${start + i + 1}</td>
      <td>
        <div style="font-weight:600">${esc(u.sub_kegiatan || '-')}</div>
        <div style="font-size:12px;color:var(--text-secondary,#64748b)">${esc(u.indikator || '')}</div>
      </td>
      <td>${esc(u.bidang_nama || '-')}</td>
      <td>${esc(u.pembuat_nama || '-')}</td>
      <td style="white-space:nowrap;font-weight:600">${epFmtRupiah(u.total_anggaran)}</td>
      <td>${epStatusBadge(u.status)}</td>
      <td style="white-space:nowrap">
        <button class="btn btn-ghost btn-sm" data-tip="Rincian Anggaran" onclick="openRincianPage('${u.id}')">${EP_ICON_LIST}</button>
        ${canEdit ? `<button class="btn btn-ghost btn-sm" data-tip="Edit" onclick="openUsulanModal('${u.id}')">${EP_ICON_EDIT}</button>` : ''}
        ${canSubmit ? `<button class="btn btn-ghost btn-sm" data-tip="Submit / Ajukan" onclick="epSubmitUsulan('${u.id}')" style="color:#2563eb">${EP_ICON_SEND}</button>` : ''}
        ${canApproveKabid ? `<button class="btn btn-ghost btn-sm" data-tip="Setujui (Kepala)" onclick="openApproveKabidModal('${u.id}')" style="color:#16a34a">${EP_ICON_CHECK}</button>` : ''}
        ${canApproveSekretaris ? `<button class="btn btn-ghost btn-sm" data-tip="Setujui (Sekretaris)" onclick="openApproveSekretarisModal('${u.id}')" style="color:#16a34a">${EP_ICON_CHECK}</button>` : ''}
        ${canApproveAdmin ? `<button class="btn btn-ghost btn-sm" data-tip="Sahkan (Admin)" onclick="openApproveAdminModal('${u.id}')" style="color:#16a34a">${EP_ICON_CHECK}</button>` : ''}
        ${canTolak ? `<button class="btn btn-ghost btn-sm" data-tip="Tolak" onclick="epKirimBalik('${u.id}')" style="color:#dc2626">${EP_ICON_BACK}</button>` : ''}
        ${canDelete ? `<button class="btn-hapus" data-tip="Hapus" onclick="deleteUsulan('${u.id}')">${EP_ICON_TRASH}</button>` : ''}
      </td>
    </tr>`;
  }).join('');
  renderPagination('epPagination', filtered.length, _epPage, _epPageSize, 'goEpPage');
}

window.goEpPage = (p) => { _epPage = p; renderEplanningTable(); };

function _epParseTarget(target) {
  const m = String(target || '').trim().match(/^(-?\d+(?:[.,]\d+)?)\s*(.*)$/);
  if (m) return { angka: m[1].replace(',', '.'), satuan: m[2].trim() };
  return { angka: '', satuan: String(target || '').trim() };
}

async function openUsulanModal(id = null) {
  // id null = mode Tambah (bikin usulan baru) - cuma boleh kalau periode pengusulan lagi buka.
  // Edit usulan yang sudah ada (id terisi) tetap boleh walau periode udah tutup.
  if (!id) {
    if (!_epPeriodeAktif) await epLoadPeriodeAktif();
    if (!_epPeriodeAktif) { toast('Periode pengusulan e-Planning belum/sudah tidak aktif.', 'error'); return; }
  }
  document.getElementById('epUsulanId').value = id || '';
  document.getElementById('epSkpdSubUnit').value = _user.bidang_nama || '-';
  document.getElementById('epSubKegiatan').value = '';
  document.getElementById('epIndikator').value = '';
  document.getElementById('epTarget').value = '';
  document.getElementById('epSatuan').value = '';
  document.getElementById('epWaktuMulaiBulan').value = '';
  document.getElementById('epWaktuSelesaiBulan').value = '';
  document.getElementById('epAnggaranSubKegiatan').value = epFmtRupiah(0);
  epRenderSumberDanaRingkasan([]);
  if (!_epPeriodeAktif) await epLoadPeriodeAktif();
  document.getElementById('epTahunAnggaran').value = _epPeriodeAktif?.tahun || (new Date().getFullYear() + 1);
  epResetFileUpload('Surat');
  epResetFileUpload('Kak');
  epResetFileUpload('DataDukung');
  document.getElementById('epRincianLokasiList').innerHTML = '';
  await epRenderLokasiPelaksanaanSelect('');
  _epClearRefCache();
  await epRenderRefSelects({ prioritasProvId: '', prioritasKabkotaId: '', bidangUrusanId: '' });
  _epSelectedTags = [];
  epRenderTagChips();
  document.getElementById('epAnggaranN1').value = '';
  document.getElementById('epAnggaranN2').value = '';
  document.getElementById('modalEpUsulanTitle').textContent = id ? 'Edit Sub Kegiatan Belanja' : 'Tambah Sub Kegiatan Belanja';
  epUpdateSaveButtonState();

  await epLoadSubkegiatanOptions();

  if (id) {
    const u = _epUsulanList.find(x => x.id === id);
    if (u) {
      const skSel = document.getElementById('epSubKegiatan');
      if (u.sub_kegiatan && ![...skSel.options].some(o => o.value === u.sub_kegiatan)) {
        
        
        skSel.insertAdjacentHTML('beforeend', `<option value="${esc(u.sub_kegiatan)}">${esc(u.sub_kegiatan)}</option>`);
      }
      skSel.value = u.sub_kegiatan || '';
      document.getElementById('epIndikator').value = u.indikator || '';
      const { angka, satuan } = _epParseTarget(u.target);
      document.getElementById('epTarget').value = angka;
      document.getElementById('epSatuan').value = satuan;
      document.getElementById('epTahunAnggaran').value = u.tahun_anggaran || '';
      epSetExistingFile('Surat', u.link_surat_usulan, _epFileNameFromUrl(u.link_surat_usulan));
      epSetExistingFile('Kak', u.link_kak, _epFileNameFromUrl(u.link_kak));
      epSetExistingFile('DataDukung', u.link_datadukung, _epFileNameFromUrl(u.link_datadukung));
      await epRenderLokasiPelaksanaanSelect(u.lokasi_pelaksanaan_kabkota_id || '');
      for (const rl of (u.rincian_lokasi || [])) {
        await epAddRincianLokasiRow(rl);
      }
      await epRenderRefSelects({
        prioritasProvId: u.prioritas_provinsi_id || '',
        prioritasKabkotaId: u.prioritas_kabkota_id || '',
        bidangUrusanId: u.bidang_urusan_id || '',
      });
      _epSelectedTags = (u.tag_belanja || []).slice();
      epRenderTagChips();
      document.getElementById('epAnggaranN1').value = u.anggaran_n1 ?? '';
      document.getElementById('epAnggaranN2').value = u.anggaran_n2 ?? '';
      document.getElementById('epWaktuMulaiBulan').value = u.waktu_mulai_bulan || '';
      document.getElementById('epWaktuSelesaiBulan').value = u.waktu_selesai_bulan || '';
      document.getElementById('epAnggaranSubKegiatan').value = epFmtRupiah(u.total_anggaran || 0);
      epRenderSumberDanaRingkasan(u.sumber_dana_summary || []);
    }
  }
  openModal('modalEpUsulan');
}

async function epLoadSubkegiatanOptions() {
  try {
    const r = await fetch('/api/eplanning/subkegiatan', { headers: authHeaders() });
    const d = await r.json();
    _epSubkegiatan = d.subkegiatan || [];
    const sel = document.getElementById('epSubKegiatan');
    if (sel) {
      sel.innerHTML = '<option value="">- Pilih Sub Kegiatan -</option>' +
        _epSubkegiatan.filter(s => s.aktif !== false).map(s => `<option value="${esc(s.nama_subkegiatan)}">${esc(s.nama_subkegiatan)}</option>`).join('');
    }
  } catch {}
}

function epOnSubKegiatanChange() {
  const val = document.getElementById('epSubKegiatan').value;
  if (!val) return;
  const found = _epSubkegiatan.find(s => s.nama_subkegiatan === val);
  if (found) {
    document.getElementById('epIndikator').value = found.indikator || '';
    document.getElementById('epSatuan').value = found.satuan || '';
  }
}

// ── Lokasi Pelaksanaan Kegiatan & Rincian Lokasi (cascading Kab/Kota → Kecamatan → Desa/Kelurahan) ──
// Cache biar gak fetch ulang kabkota tiap buka modal; kecamatan & desa di-cache per parent_id
// karena satu usulan bisa punya beberapa baris Rincian Lokasi yang mungkin pilih kabkota/kecamatan sama.
let _epKabkotaList = null;
const _epKecamatanCache = {};
const _epDesaCache = {};

async function epLoadKabkotaOptions() {
  if (_epKabkotaList) return _epKabkotaList;
  try {
    const r = await fetch('/api/eplanning/kabkota', { headers: authHeaders() });
    const d = await r.json();
    _epKabkotaList = d.kabkota || [];
  } catch { _epKabkotaList = []; }
  return _epKabkotaList;
}

function _epKabkotaOptionsHtml(selectedId) {
  const opts = ['<option value="">Pilih Lokasi Pelaksanaan Kegiatan...</option>'];
  for (const k of (_epKabkotaList || [])) {
    opts.push(`<option value="${k.id}" ${String(k.id) === String(selectedId) ? 'selected' : ''}>${esc(k.tipe)} ${esc(k.nama)}</option>`);
  }
  return opts.join('');
}

async function epRenderLokasiPelaksanaanSelect(selectedId) {
  await epLoadKabkotaOptions();
  const sel = document.getElementById('epLokasiPelaksanaan');
  if (sel) sel.innerHTML = _epKabkotaOptionsHtml(selectedId);
}

async function _epFetchKecamatan(kabkotaId) {
  if (!kabkotaId) return [];
  if (_epKecamatanCache[kabkotaId]) return _epKecamatanCache[kabkotaId];
  try {
    const r = await fetch(`/api/eplanning/kecamatan?kabkota_id=${kabkotaId}`, { headers: authHeaders() });
    const d = await r.json();
    _epKecamatanCache[kabkotaId] = d.kecamatan || [];
  } catch { _epKecamatanCache[kabkotaId] = []; }
  return _epKecamatanCache[kabkotaId];
}

async function _epFetchDesa(kecamatanId) {
  if (!kecamatanId) return [];
  if (_epDesaCache[kecamatanId]) return _epDesaCache[kecamatanId];
  try {
    const r = await fetch(`/api/eplanning/desakelurahan?kecamatan_id=${kecamatanId}`, { headers: authHeaders() });
    const d = await r.json();
    _epDesaCache[kecamatanId] = d.desakelurahan || [];
  } catch { _epDesaCache[kecamatanId] = []; }
  return _epDesaCache[kecamatanId];
}

function epRincianLokasiRowHtml(idx) {
  return `
    <div class="field-row ep-rl-row" data-idx="${idx}" style="align-items:center">
      <div class="select-wrap"><select class="ep-rl-kabkota" onchange="epOnRincianLokasiKabkotaChange(this)">${_epKabkotaOptionsHtml('')}</select></div>
      <div class="select-wrap"><select class="ep-rl-kecamatan" disabled><option value="">Pilih Kecamatan...</option></select></div>
      <div class="select-wrap"><select class="ep-rl-desa" disabled><option value="">Pilih Desa/Kelurahan...</option></select></div>
      <button type="button" class="btn btn-danger btn-sm" onclick="epRemoveRincianLokasiRow(this)">X</button>
    </div>`;
}

let _epRincianLokasiIdx = 0;

async function epAddRincianLokasiRow(existing) {
  await epLoadKabkotaOptions();
  const list = document.getElementById('epRincianLokasiList');
  if (!list) return;
  const idx = _epRincianLokasiIdx++;
  list.insertAdjacentHTML('beforeend', epRincianLokasiRowHtml(idx));
  const row = list.querySelector(`.ep-rl-row[data-idx="${idx}"]`);
  if (!existing || !existing.kabkota_id) return;

  const kabkotaSel = row.querySelector('.ep-rl-kabkota');
  kabkotaSel.value = existing.kabkota_id;
  await epOnRincianLokasiKabkotaChange(kabkotaSel, existing.kecamatan_id, existing.kecamatan_nama);
  if (existing.kecamatan_id !== undefined) {
    const kecSel = row.querySelector('.ep-rl-kecamatan');
    
    kecSel.value = existing.kecamatan_id === null ? 'SEMUA' : existing.kecamatan_id;
    await epOnRincianLokasiKecamatanChange(kecSel, existing.desa_id);
    if (existing.desa_id !== undefined) {
      const desaSel = row.querySelector('.ep-rl-desa');
      desaSel.value = existing.desa_id === null ? 'SEMUA' : existing.desa_id;
    }
  }
}

async function epOnRincianLokasiKabkotaChange(selectEl, presetKecamatanId) {
  const row = selectEl.closest('.ep-rl-row');
  const kecSel = row.querySelector('.ep-rl-kecamatan');
  const desaSel = row.querySelector('.ep-rl-desa');
  const kabkotaId = selectEl.value;
  desaSel.innerHTML = '<option value="">Pilih Desa/Kelurahan...</option>';
  desaSel.disabled = true;
  if (!kabkotaId) {
    kecSel.innerHTML = '<option value="">Pilih Kecamatan...</option>';
    kecSel.disabled = true;
    return;
  }
  const kecamatanList = await _epFetchKecamatan(kabkotaId);
  kecSel.innerHTML = '<option value="">Pilih Kecamatan...</option>' +
    '<option value="SEMUA">Semua Kecamatan</option>' +
    kecamatanList.map(k => `<option value="${k.id}">${esc(k.nama)}</option>`).join('');
  kecSel.disabled = false;
  if (presetKecamatanId !== undefined) {
    kecSel.value = presetKecamatanId === null ? 'SEMUA' : presetKecamatanId;
  }
}

async function epOnRincianLokasiKecamatanChange(selectEl, presetDesaId) {
  const row = selectEl.closest('.ep-rl-row');
  const desaSel = row.querySelector('.ep-rl-desa');
  const kecamatanId = selectEl.value;
  if (!kecamatanId) {
    desaSel.innerHTML = '<option value="">Pilih Desa/Kelurahan...</option>';
    desaSel.disabled = true;
    return;
  }
  if (kecamatanId === 'SEMUA') {
    
    desaSel.innerHTML = '<option value="SEMUA" selected>Semua Desa/Kelurahan</option>';
    desaSel.disabled = true;
    return;
  }
  const desaList = await _epFetchDesa(kecamatanId);
  desaSel.innerHTML = '<option value="">Pilih Desa/Kelurahan...</option>' +
    '<option value="SEMUA">Semua Desa/Kelurahan</option>' +
    desaList.map(d => `<option value="${d.id}">${esc(d.tipe)} ${esc(d.nama)}</option>`).join('');
  desaSel.disabled = false;
  if (presetDesaId !== undefined) {
    desaSel.value = presetDesaId === null ? 'SEMUA' : presetDesaId;
  }
}

function epRemoveRincianLokasiRow(btn) {
  btn.closest('.ep-rl-row')?.remove();
}

function epCollectRincianLokasi() {
  const rows = [...document.querySelectorAll('#epRincianLokasiList .ep-rl-row')];
  return rows.map(row => {
    const kabkotaSel = row.querySelector('.ep-rl-kabkota');
    const kecSel = row.querySelector('.ep-rl-kecamatan');
    const desaSel = row.querySelector('.ep-rl-desa');
    const kabkotaId = kabkotaSel.value || null;
    const kabkotaNama = kabkotaId ? kabkotaSel.options[kabkotaSel.selectedIndex].textContent : null;
    const kecValue = kecSel.value || null;
    const kecId = kecValue && kecValue !== 'SEMUA' ? kecValue : null;
    const kecNama = kecValue ? (kecValue === 'SEMUA' ? 'Semua Kecamatan' : kecSel.options[kecSel.selectedIndex].textContent) : null;
    const desaValue = desaSel.value || null;
    const desaId = desaValue && desaValue !== 'SEMUA' ? desaValue : null;
    const desaNama = desaValue ? (desaValue === 'SEMUA' ? 'Semua Desa/Kelurahan' : desaSel.options[desaSel.selectedIndex].textContent) : null;
    return {
      kabkota_id: kabkotaId, kabkota_nama: kabkotaNama,
      kecamatan_id: kecId, kecamatan_nama: kecNama,
      desa_id: desaId, desa_nama: desaNama,
    };
  }).filter(r => r.kabkota_id); 
}

const _epRefCache = {}; 

async function _epFetchRef(kategori) {
  if (_epRefCache[kategori]) return _epRefCache[kategori];
  try {
    const r = await fetch(`/api/eplanning/${kategori}`, { headers: authHeaders() });
    const d = await r.json();
    _epRefCache[kategori] = d[kategori] || [];
  } catch { _epRefCache[kategori] = []; }
  return _epRefCache[kategori];
}

function _epClearRefCache() { for (const k of Object.keys(_epRefCache)) delete _epRefCache[k]; }

async function epRenderRefSelects({ prioritasProvId, prioritasKabkotaId, bidangUrusanId }) {
  const [provList, kabkotaList, bidangList] = await Promise.all([
    _epFetchRef('prioritasprov'), _epFetchRef('prioritaskabkota'), _epFetchRef('bidangurusan'),
  ]);
  const provSel = document.getElementById('epPrioritasProv');
  provSel.innerHTML = '<option value="">Prioritas Pembangunan Provinsi...</option>' +
    provList.filter(p => p.aktif || String(p.id) === String(prioritasProvId))
      .map(p => `<option value="${p.id}" ${String(p.id) === String(prioritasProvId) ? 'selected' : ''}>${esc(p.nama)}</option>`).join('');
  const kabkotaSel = document.getElementById('epPrioritasKabkota');
  kabkotaSel.innerHTML = '<option value="">Prioritas Pembangunan Kota/Kabupaten...</option>' +
    kabkotaList.filter(p => p.aktif || String(p.id) === String(prioritasKabkotaId))
      .map(p => `<option value="${p.id}" ${String(p.id) === String(prioritasKabkotaId) ? 'selected' : ''}>${esc(p.nama)}</option>`).join('');
  const bidangSel = document.getElementById('epBidangUrusan');
  bidangSel.innerHTML = '<option value="">- Pilih Bidang Urusan -</option>' +
    bidangList.filter(p => p.aktif || String(p.id) === String(bidangUrusanId))
      .map(p => `<option value="${p.id}" ${String(p.id) === String(bidangUrusanId) ? 'selected' : ''}>${esc(p.nama)}</option>`).join('');
}

// ── Label (Tag) Sub Kegiatan - bisa pilih lebih dari 1, disimpan sbg array snapshot {id, nama} ──
let _epSelectedTags = [];

function epRenderTagChips() {
  const wrap = document.getElementById('epTagBelanjaChips');
  if (!wrap) return;
  wrap.innerHTML = _epSelectedTags.map(t => `
    <span class="badge badge-hijau" style="display:inline-flex;align-items:center;gap:5px">
      ${esc(t.nama)}
      <span style="cursor:pointer;opacity:.75" onclick="epRemoveTag(${t.id})" data-tip="Hapus tag">&times;</span>
    </span>`).join('') || '<span style="opacity:.6;font-size:13px">Belum ada tag dipilih</span>';
}
function epRemoveTag(id) {
  _epSelectedTags = _epSelectedTags.filter(t => String(t.id) !== String(id));
  epRenderTagChips();
}

async function epOpenTagPicker() {
  delete _epRefCache.tagbelanja; // biar tag baru yang ditambah dari picker langsung kelihatan
  const list = await _epFetchRef('tagbelanja');
  const body = document.getElementById('epTagPickerBody');
  body.innerHTML = list.filter(t => t.aktif).map(t => {
    const checked = _epSelectedTags.some(s => String(s.id) === String(t.id));
    return `
      <label style="display:flex;align-items:center;gap:8px;padding:6px 0;cursor:pointer">
        <input type="checkbox" value="${t.id}" data-nama="${esc(t.nama)}" ${checked ? 'checked' : ''} onchange="epToggleTagCheckbox(this)" />
        ${esc(t.nama)}
      </label>`;
  }).join('') || '<div style="opacity:.6;font-size:13px">Belum ada Tag Belanja. Tambah lewat kolom di atas.</div>';
  document.getElementById('epTagNewInput').value = '';
  openModal('modalTagPicker');
}
function epToggleTagCheckbox(cb) {
  const id = cb.value, nama = cb.dataset.nama;
  if (cb.checked) {
    if (!_epSelectedTags.some(t => String(t.id) === String(id))) _epSelectedTags.push({ id, nama });
  } else {
    _epSelectedTags = _epSelectedTags.filter(t => String(t.id) !== String(id));
  }
}
async function epAddNewTagInline() {
  const input = document.getElementById('epTagNewInput');
  const nama = input.value.trim();
  if (!nama) return;
  try {
    const r = await fetch('/api/eplanning/tagbelanja', {
      method: 'POST', headers: { ...authHeaders(), 'Content-Type': 'application/json' }, body: JSON.stringify({ nama }),
    });
    const d = await r.json();
    if (!r.ok) throw new Error(d.error || 'Gagal menambah tag');
    input.value = '';
    await epOpenTagPicker(); // reload daftar checkbox biar tag baru langsung muncul & otomatis ke-cek
    if (d.tagbelanja) {
      _epSelectedTags.push({ id: String(d.tagbelanja.id), nama: d.tagbelanja.nama });
      const cb = document.querySelector(`#epTagPickerBody input[value="${d.tagbelanja.id}"]`);
      if (cb) cb.checked = true;
    }
  } catch (err) { toast(err.message, 'error'); }
}
function epApplyTagPicker() {
  epRenderTagChips();
  closeModal('modalTagPicker');
}

const EP_REF_LABELS = {
  prioritasprov: { judul: 'Prioritas Pembangunan Provinsi', kolom: 'Nama Prioritas', subtitle: 'Master Prioritas Pembangunan Provinsi untuk form Usulan e-Planning' },
  prioritaskabkota: { judul: 'Prioritas Pembangunan Kota/Kabupaten', kolom: 'Nama Prioritas', subtitle: 'Master Prioritas Pembangunan Kota/Kabupaten untuk form Usulan e-Planning' },
  bidangurusan: { judul: 'Bidang Urusan', kolom: 'Nama Bidang Urusan', subtitle: 'Master Bidang Urusan (kodefikasi urusan pemerintahan) untuk form Usulan e-Planning' },
  tagbelanja: { judul: 'Label (Tag) Sub Kegiatan', kolom: 'Nama Tag', subtitle: 'Master Label (Tag) Sub Kegiatan untuk form Usulan e-Planning' },
};

const EP_REF_ICONS = {
  prioritasprov: '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M5.75 1a.75.75 0 0 1 .75.75V3.6l1.72-.344a8.677 8.677 0 0 1 4.925.452l.204.081a7.999 7.999 0 0 0 4.91.334 1.2 1.2 0 0 1 1.491 1.164v7.367c0 .644-.439 1.206-1.064 1.362l-.214.053a8.677 8.677 0 0 1-5.327-.361 8.676 8.676 0 0 0-4.924-.452L6.5 13.6v8.15a.75.75 0 0 1-1.5 0v-20A.75.75 0 0 1 5.75 1Z"/></svg>',
  prioritaskabkota: '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path fill-rule="evenodd" clip-rule="evenodd" d="M12 2c-4.418 0-8 4.003-8 8.5 0 4.462 2.553 9.312 6.537 11.174a3.45 3.45 0 0 0 2.926 0C17.447 19.812 20 14.962 20 10.5 20 6.003 16.418 2 12 2Zm0 10a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z"/></svg>',
  bidangurusan: '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path fill-rule="evenodd" clip-rule="evenodd" d="M10.275 2.255c.084-.005.172-.005.286-.005h2.879c.113 0 .201 0 .285.005a2.75 2.75 0 0 1 2.385 1.72c.031.077.06.16.095.268l.003.01c.084.224.275.479.543.683.03.023.06.044.09.064 2.153.003 3.277.042 4.052.673.16.13.305.275.434.434.673.827.673 2.052.673 4.502 0 .622 0 .932-.15 1.175a.996.996 0 0 1-.1.134c-.19.214-.487.303-1.082.482L16 13.8V13a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v.8l-4.668-1.4c-.595-.179-.893-.268-1.082-.482a1.002 1.002 0 0 1-.1-.134C2 11.541 2 11.231 2 10.609c0-2.45 0-3.675.673-4.502.13-.16.275-.305.434-.434.775-.63 1.899-.67 4.053-.673.03-.02.06-.041.09-.064.267-.204.459-.46.542-.683.038-.114.066-.2.098-.279a2.75 2.75 0 0 1 2.385-1.719Zm4.544 2.563c.024.062.05.122.08.182H9.101c.029-.06.055-.12.08-.182v-.003l.005-.01.005-.012.005-.012.003-.01.002-.005.004-.012.004-.012.002-.006.003-.008.002-.007.002-.006c.039-.116.051-.153.063-.181a1.25 1.25 0 0 1 1.084-.782c.032-.002.072-.002.215-.002h2.838c.143 0 .183 0 .215.002.482.03.904.334 1.085.782.01.028.023.063.062.181l.002.006.002.007.003.008.002.006.004.012.004.012.002.005.004.01.004.012.005.012.004.01.002.003ZM14 12.5h-4a.5.5 0 0 0-.5.5v2.162a.5.5 0 0 0 .314.464l.7.28a4 4 0 0 0 2.972 0l.7-.28a.5.5 0 0 0 .314-.464V13a.5.5 0 0 0-.5-.5Zm-5.99 2.87-5.004-1.502c.03 3.114.212 5.982 1.312 6.96C5.636 22 7.758 22 12 22c4.242 0 6.364 0 7.682-1.172 1.1-.977 1.282-3.846 1.312-6.96l-5.005 1.501a2 2 0 0 1-1.246 1.65l-.7.28a5.5 5.5 0 0 1-4.086 0l-.7-.28a2 2 0 0 1-1.246-1.65Z"/></svg>',
  tagbelanja: '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path fill-rule="evenodd" clip-rule="evenodd" d="M2.123 12.816c.287 1.003 1.06 1.775 2.605 3.32l1.83 1.83C9.248 20.657 10.592 22 12.262 22c1.671 0 3.015-1.345 5.704-4.034C20.657 15.277 22 13.933 22 12.262c0-1.67-1.345-3.015-4.034-5.704l-1.83-1.83c-1.545-1.545-2.317-2.318-3.32-2.605-1.003-.288-2.068-.042-4.197.45l-1.228.283c-1.792.413-2.688.62-3.302 1.233-.613.614-.82 1.51-1.233 3.302l-.284 1.228c-.491 2.13-.737 3.194-.45 4.197Zm8-5.545a2.017 2.017 0 1 1-2.852 2.852 2.017 2.017 0 0 1 2.852-2.852Zm8.928 4.78-6.979 6.98a.75.75 0 0 1-1.06-1.061l6.978-6.98a.75.75 0 0 1 1.061 1.061Z"/></svg>',
};
let _epRefKategori = 'prioritasprov';
let _epRefFull = [];
let _epRefSearch = '';
let _epRefPage = 1;
const _epRefPageSize = 10;

function epRefTabSwitch(kategori) {
  _epRefKategori = kategori;
  delete _epRefCache[kategori]; // biar konsisten sama data yang barusan diedit dari halaman ini
  const meta = EP_REF_LABELS[kategori];
  document.getElementById('epRefPageTitle').textContent = meta.judul;
  document.getElementById('epRefPageSubtitle').textContent = meta.subtitle;
  const iconEl = document.getElementById('epRefPageIcon');
  if (iconEl && EP_REF_ICONS[kategori]) iconEl.innerHTML = EP_REF_ICONS[kategori];
  document.getElementById('epRefKolomNama').textContent = meta.kolom;
  const searchEl = document.getElementById('epRefSearch');
  if (searchEl) { searchEl.value = ''; searchEl.placeholder = `Cari ${meta.judul.toLowerCase()}…`; }
  _epRefSearch = '';
  _epRefPage = 1;
  epLoadMasterReferensi();
}
async function epLoadMasterReferensi() {
  const tb = document.getElementById('epMasterReferensiBody');
  if (tb) tb.innerHTML = `<tr class="empty-row"><td colspan="3">Memuat data...</td></tr>`;
  try {
    const r = await fetch(`/api/eplanning/${_epRefKategori}`, { headers: authHeaders() });
    const d = await r.json();
    _epRefFull = d[_epRefKategori] || [];
    epRenderReferensiTable();
  } catch { if (tb) tb.innerHTML = `<tr class="empty-row"><td colspan="3">Gagal memuat</td></tr>`; }
}
function epFilterReferensi() {
  _epRefSearch = (document.getElementById('epRefSearch')?.value || '').trim().toLowerCase();
  _epRefPage = 1;
  epRenderReferensiTable();
}
function epRenderReferensiTable() {
  const tb = document.getElementById('epMasterReferensiBody');
  if (!tb) return;
  const filtered = _epRefSearch ? _epRefFull.filter(r => r.nama.toLowerCase().includes(_epRefSearch)) : _epRefFull;
  const start = (_epRefPage - 1) * _epRefPageSize;
  const slice = filtered.slice(start, start + _epRefPageSize);
  tb.innerHTML = slice.length ? slice.map(r => `
    <tr>
      <td>${esc(r.nama)}</td>
      <td><span class="badge ${r.aktif ? 'badge-hijau' : 'badge-abu'}">${r.aktif ? 'Aktif' : 'Nonaktif'}</span></td>
      <td style="white-space:nowrap">
        <button class="btn btn-ghost btn-sm" data-tip="${r.aktif ? 'Nonaktifkan' : 'Aktifkan'}" onclick="epToggleReferensi(${r.id}, ${!!r.aktif})">${r.aktif ? EP_ICON_POWER_OFF : EP_ICON_POWER_ON}</button>
        <button class="btn btn-ghost btn-sm" data-tip="Edit" onclick="openReferensiModal(${r.id})">${EP_ICON_EDIT}</button>
        <button class="btn-hapus" data-tip="Hapus" onclick="epDeleteReferensi(${r.id})">${EP_ICON_TRASH}</button>
      </td>
    </tr>`).join('') : `<tr class="empty-row"><td colspan="3">${_epRefSearch ? 'Tidak ada hasil pencarian' : 'Belum ada data'}</td></tr>`;
  renderPagination('epRefPagination', filtered.length, _epRefPage, _epRefPageSize, 'goEpRefPage');
}
window.goEpRefPage = (p) => { _epRefPage = p; epRenderReferensiTable(); };

function openReferensiModal(id = null) {
  const meta = EP_REF_LABELS[_epRefKategori];
  document.getElementById('epRefId').value = '';
  document.getElementById('epRefNama').value = '';
  document.getElementById('epRefAktif').checked = true;
  document.getElementById('epRefAktifLabel').textContent = 'Aktif';
  document.getElementById('epRefNamaLabel').textContent = meta.kolom;
  document.getElementById('modalReferensiTitle').textContent = id ? `Edit ${meta.judul}` : `Tambah ${meta.judul}`;
  if (id) {
    const r = _epRefFull.find(x => x.id === id);
    if (r) {
      document.getElementById('epRefId').value = r.id;
      document.getElementById('epRefNama').value = r.nama;
      document.getElementById('epRefAktif').checked = !!r.aktif;
      document.getElementById('epRefAktifLabel').textContent = r.aktif ? 'Aktif' : 'Nonaktif';
    }
  }
  openModal('modalReferensi');
}
async function epSaveReferensi() {
  const id = document.getElementById('epRefId').value;
  const nama = document.getElementById('epRefNama').value.trim();
  const aktif = document.getElementById('epRefAktif').checked;
  if (!nama) { toast('Nama wajib diisi', 'error'); return; }
  const btn = document.getElementById('btnSaveReferensi');
  btn.disabled = true;
  try {
    const method = id ? 'PUT' : 'POST';
    const url = id ? `/api/eplanning/${_epRefKategori}/${id}` : `/api/eplanning/${_epRefKategori}`;
    const r = await fetch(url, { method, headers: { ...authHeaders(), 'Content-Type': 'application/json' }, body: JSON.stringify({ nama, aktif }) });
    const d = await r.json();
    if (!r.ok) throw new Error(d.error || 'Gagal menyimpan');
    toast(id ? 'Data diperbarui' : 'Data ditambahkan', 'success');
    closeModal('modalReferensi');
    delete _epRefCache[_epRefKategori];
    epLoadMasterReferensi();
  } catch (err) { toast(err.message, 'error'); }
  finally { btn.disabled = false; }
}
async function epToggleReferensi(id, currentAktif) {
  try {
    const r = await fetch(`/api/eplanning/${_epRefKategori}/${id}`, {
      method: 'PUT', headers: { ...authHeaders(), 'Content-Type': 'application/json' }, body: JSON.stringify({ aktif: !currentAktif }),
    });
    const d = await r.json();
    if (!r.ok) throw new Error(d.error || 'Gagal mengubah status');
    toast(!currentAktif ? 'Diaktifkan' : 'Dinonaktifkan', 'success');
    delete _epRefCache[_epRefKategori];
    epLoadMasterReferensi();
  } catch (err) { toast(err.message, 'error'); }
}
async function epDeleteReferensi(id) {
  const r = _epRefFull.find(x => x.id === id);
  const ok = await showConfirm({
    title: `Hapus ${EP_REF_LABELS[_epRefKategori].judul}`,
    msg: `"<b>${esc(r?.nama || '')}</b>" akan dihapus permanen.`,
    okText: 'Ya, Hapus', icon: 'trash',
  });
  if (!ok) return;
  await fetch(`/api/eplanning/${_epRefKategori}/${id}`, { method: 'DELETE', headers: authHeaders() });
  toast('Data dihapus');
  delete _epRefCache[_epRefKategori];
  epLoadMasterReferensi();
}

async function saveUsulan() {
  const id = document.getElementById('epUsulanId').value || null;
  const isNew = !id;
  const subKegiatan = document.getElementById('epSubKegiatan').value.trim();
  if (!subKegiatan) { toast('Sub Kegiatan wajib diisi', 'error'); return; }

  const targetAngka = document.getElementById('epTarget').value.trim();
  const targetSatuan = document.getElementById('epSatuan').value.trim();
  const target = [targetAngka, targetSatuan].filter(Boolean).join(' ');

  const prioProvSel = document.getElementById('epPrioritasProv');
  const prioKabkotaSel = document.getElementById('epPrioritasKabkota');
  const bidangSel = document.getElementById('epBidangUrusan');
  const body = {
    id,
    sub_kegiatan: subKegiatan,
    indikator: document.getElementById('epIndikator').value.trim(),
    target,
    tahun_anggaran: parseInt(document.getElementById('epTahunAnggaran').value) || null,
    link_surat_usulan: document.getElementById('epLinkSurat').value || null,
    link_kak: document.getElementById('epLinkKak').value || null,
    link_datadukung: document.getElementById('epLinkDataDukung').value || null,
    lokasi_pelaksanaan_kabkota_id: document.getElementById('epLokasiPelaksanaan').value || null,
    rincian_lokasi: epCollectRincianLokasi(),
    prioritas_provinsi_id: prioProvSel.value || null,
    prioritas_provinsi_nama: prioProvSel.value ? prioProvSel.options[prioProvSel.selectedIndex].textContent : null,
    prioritas_kabkota_id: prioKabkotaSel.value || null,
    prioritas_kabkota_nama: prioKabkotaSel.value ? prioKabkotaSel.options[prioKabkotaSel.selectedIndex].textContent : null,
    bidang_urusan_id: bidangSel.value || null,
    bidang_urusan_nama: bidangSel.value ? bidangSel.options[bidangSel.selectedIndex].textContent : null,
    tag_belanja: _epSelectedTags,
    anggaran_n1: document.getElementById('epAnggaranN1').value ? parseFloat(document.getElementById('epAnggaranN1').value) : null,
    anggaran_n2: document.getElementById('epAnggaranN2').value ? parseFloat(document.getElementById('epAnggaranN2').value) : null,
    waktu_mulai_bulan: document.getElementById('epWaktuMulaiBulan').value || null,
    waktu_selesai_bulan: document.getElementById('epWaktuSelesaiBulan').value || null,
  };
  try {
    const r = await fetch('/api/eplanning/usulan', {
      method: 'POST', headers: { ...authHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const d = await r.json();
    if (!r.ok) throw new Error(d.error || 'Gagal menyimpan usulan');

    toast('Usulan berhasil disimpan', 'success');
    closeModal('modalEpUsulan');

    if (isNew) {
      // Usulan baru → langsung arahkan ke halaman Rincian Anggaran biar lanjut isi rinciannya.
      openRincianPage(d.usulan.id);
    } else {
      loadEplanning();
    }
  } catch (err) { toast(err.message, 'error'); }
}

async function deleteUsulan(id) {
  const u = _epUsulanList.find(x => x.id === id);
  const forced = u && !['DRAFT', 'DITOLAK'].includes(u.status);
  const ok = await showConfirm({
    title: 'Hapus Usulan',
    msg: forced
      ? `Usulan ini berstatus <b>"${esc(u.status)}"</b> (sudah diajukan). Yakin mau dihapus paksa beserta seluruh rinciannya?`
      : 'Hapus usulan ini beserta seluruh rinciannya?',
    okText: 'Ya, Hapus',
    type: 'danger',
    icon: 'trash',
  });
  if (!ok) return;
  try {
    const r = await fetch(`/api/eplanning/usulan/${id}`, { method: 'DELETE', headers: authHeaders() });
    const d = await r.json();
    if (!r.ok) throw new Error(d.error || 'Gagal menghapus');
    toast('Usulan dihapus', 'success');
    loadEplanning();
  } catch (err) { toast(err.message, 'error'); }
}

// ── Validasi tombol Simpan: disabled sampai Target keisi & ketiga file keupload ──
function epUpdateSaveButtonState() {
  const btn = document.getElementById('btnSimpanUsulan');
  if (!btn) return;
  const targetOk = document.getElementById('epTarget').value.trim() !== '';
  const filesOk  = ['Surat', 'Kak', 'DataDukung'].every(f => (_epFileState[f] || []).length > 0);
  btn.disabled = !(targetOk && filesOk);
}

// ── FILE UPLOAD custom (Surat Usulan / KAK / Data Dukung) - tombol Upload → Uploaded, mirip pola Data Dukung Kinerja ──
// Beda sama epUploadFile (input file polos, masih dipakai buat TTD Kabid/Kadis):
// di sini pakai upload-area + preview card, konsisten sama modul Surat/Kinerja.
// NB: ketiga field (Surat/Kak/DataDukung) boleh lebih dari 1 file (array), makanya link_*
// disimpan sbg beberapa URL digabung koma.
const _epFileState = { Surat: [], Kak: [], DataDukung: [] };

function _epFileNameFromUrl(url) {
  if (!url) return '';
  try {
    const last = decodeURIComponent(url.split('/').pop().split('?')[0]);
    return last.replace(/^\d+_\d+_/, '') || 'Dokumen';
  } catch { return 'Dokumen'; }
}

function epResetFileUpload(field) {
  _epFileState[field] = [];
  _epUploadBatch[field] = null;
  _epRenderFilePreview(field);
  const fi = document.getElementById(`ep${field}FileInput`);
  if (fi) fi.value = '';
  const hidden = document.getElementById(`epLink${field}`);
  if (hidden) hidden.value = '';
}

function epSetExistingFile(field, url) {
  const urls = String(url || '').split(',').map(s => s.trim()).filter(Boolean);
  _epFileState[field] = urls.map(u => ({ url: u, name: _epFileNameFromUrl(u) }));
  const hidden = document.getElementById(`epLink${field}`);
  if (hidden) hidden.value = urls.join(',');
  _epRenderFilePreview(field);
}

function epTriggerUpload(field) {
  document.getElementById(`ep${field}FileInput`)?.click();
}

function _epRenderFilePreview(field) {
  const group = document.getElementById(`ep${field}UploadGroup`);
  if (!group) return;
  epUpdateSaveButtonState();
  const files = _epFileState[field] || [];

  const loadingCount = files.filter(f => f._loading).length;
  const doneFiles = files.filter(f => !f._loading);

  // Cuma 1 chip yang tampil di satu waktu: kalau masih ada yang lagi diupload, tampilin
  // chip "Mengupload…" itu aja (gak bareng sama badge "Uploaded") - biar gak dobel.
  const uploadedBadge = (!loadingCount && doneFiles.length) ? `
    <span style="display:inline-flex;align-items:center;gap:5px;padding:4px 8px 4px 10px;border-radius:6px;background:#d1fae5;color:#065f46;font-size:.75rem;font-weight:600">
      <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"/></svg>
      Uploaded${doneFiles.length > 1 ? ` (${doneFiles.length})` : ''}
      <button type="button" onclick="epPreviewFiles('${field}')" data-tip="Preview"
        style="display:inline-flex;align-items:center;justify-content:center;width:18px;height:18px;border-radius:4px;border:none;cursor:pointer;background:#dbeafe;color:#1d4ed8">
        <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path stroke-linecap="round" stroke-linejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg>
      </button>
      <button type="button" onclick="epRemoveAllFiles('${field}')" data-tip="Hapus semua file"
        style="display:inline-flex;align-items:center;justify-content:center;width:18px;height:18px;border-radius:4px;border:none;cursor:pointer;background:#fee2e2;color:#991b1b">
        <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path stroke-linecap="round" stroke-linejoin="round" d="M19 6l-1 14H6L5 6"/><path stroke-linecap="round" stroke-linejoin="round" d="M10 11v6m4-6v6"/><path stroke-linecap="round" stroke-linejoin="round" d="M9 6V4h6v2"/></svg>
      </button>
    </span>` : '';

  const loadingChip = loadingCount ? `
    <span style="display:inline-flex;align-items:center;gap:5px;padding:4px 10px;border-radius:6px;border:1.5px dashed #fca5a5;font-size:.75rem;font-weight:600;background:#fee2e2;color:#991b1b;opacity:.75">
      <span class="btn-spin" style="width:12px;height:12px"></span>Mengupload…${_epUploadBatch[field]?.total > 1 ? ` (${_epUploadBatch[field].current}/${_epUploadBatch[field].total})` : ''}</span>` : '';

  // Tombol Upload cuma nongol kalau belum ada file yang ke-upload - mau ganti/tambah file
  // harus hapus dulu yang lama (tombol sampah di badge "Uploaded"), baru Upload nongol lagi.
  // Sama polanya kayak Data Dukung di modul Kinerja.
  const uploadBtn = (doneFiles.length || loadingCount) ? '' : `
    <button type="button" class="dukung-upload-btn" onclick="epTriggerUpload('${field}')" data-tip="Upload file"
      style="display:inline-flex;align-items:center;gap:5px;padding:4px 10px;border-radius:6px;border:1.5px dashed #fca5a5;cursor:pointer;font-size:.75rem;font-weight:600;font-family:inherit;background:#fee2e2;color:#991b1b">
      <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"/></svg>
      Upload
    </button>`;

  group.innerHTML = uploadedBadge + loadingChip + uploadBtn + `
    <span style="font-size:.72rem;color:var(--teks-muted,#94a3b8)">PDF, Word, JPG, PNG - maks. 2 MB</span>`;
}

// Upload jalan berurutan (1 file diproses dulu sebelum lanjut ke berikutnya), jadi
// _loading cuma true buat 1 file di satu waktu - makanya progress "sedang ke-berapa
// dari total" dilacak terpisah di sini, biar chip "Mengupload…" bisa nunjukin (2/3) dst.
const _epUploadBatch = { Surat: null, Kak: null, DataDukung: null };

async function epHandleFileSelect(e, field) {
  const files = Array.from(e.target.files || []);
  e.target.value = '';
  let okCount = 0, failMsgs = [];
  _epUploadBatch[field] = { current: 0, total: files.length };
  for (const file of files) { // upload berurutan, boleh pilih banyak sekaligus
    _epUploadBatch[field].current++;
    const err = await epProcessFile(field, file);
    if (err) failMsgs.push(err); else okCount++;
  }
  _epUploadBatch[field] = null;
  // Toast diringkas jadi 1x aja per batch, gak per-file.
  if (failMsgs.length && okCount) {
    toast(`${okCount} file berhasil diunggah, ${failMsgs.length} gagal (${failMsgs[0]})`, 'error');
  } else if (failMsgs.length) {
    toast(failMsgs.length > 1 ? `${failMsgs.length} file gagal diunggah (${failMsgs[0]})` : failMsgs[0], 'error');
  } else if (okCount) {
    toast(okCount > 1 ? `${okCount} file berhasil diunggah` : 'File berhasil diunggah', 'success');
  }
}

async function epProcessFile(field, file) {
  const MAX_MB = 2;
  if (file.size > MAX_MB * 1024 * 1024) return `File terlalu besar (maks ${MAX_MB}MB)`;

  const idx = _epFileState[field].length;
  _epFileState[field].push({ url: null, name: file.name, _loading: true });
  _epRenderFilePreview(field);

  try {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('kategori', 'eplanning');
    const r = await fetch('/api/upload', {
      method: 'POST', headers: { 'Authorization': authHeaders()['Authorization'] }, body: formData,
    });
    const d = await r.json();
    if (!r.ok) throw new Error(d.error || 'Gagal upload');

    _epFileState[field][idx] = { url: d.url, name: d.name || file.name };
    document.getElementById(`epLink${field}`).value = _epFileState[field].map(x => x.url).join(',');
    _epRenderFilePreview(field);
    return null;
  } catch (err) {
    _epFileState[field].splice(idx, 1);
    _epRenderFilePreview(field);
    return err.message;
  }
}

async function epRemoveFile(field, index) {
  const f = _epFileState[field][index];
  if (!f) return;
  if (f.url) {
    const ok = await showConfirm({ title: 'Hapus File', msg: `File "${esc(f.name)}" akan dihapus dari daftar dan dari server.`, okText: 'Ya, Hapus', icon: 'trash' });
    if (!ok) return;
  }
  _epFileState[field].splice(index, 1);
  document.getElementById(`epLink${field}`).value = _epFileState[field].map(x => x.url).join(',');
  _epRenderFilePreview(field);
  if (f.url) {
    const ok = await deleteCloudinaryFile(f.url);
    toast(ok ? 'File berhasil dihapus dari server' : 'File dihapus dari daftar (hapus server gagal)', ok ? 'success' : 'error');
  } else {
    toast('File dihapus');
  }
}

function epPreviewFiles(field) {
  const files = (_epFileState[field] || []).filter(f => !f._loading);
  if (!files.length) return;
  const f = files[files.length - 1];
  viewDoc(f.url, f.name);
}

async function epRemoveAllFiles(field) {
  const files = (_epFileState[field] || []).filter(f => !f._loading);
  if (!files.length) return;
  const ok = await showConfirm({ title: 'Hapus File', msg: `${files.length} file akan dihapus dari daftar dan dari server.`, okText: 'Ya, Hapus', icon: 'trash' });
  if (!ok) return;
  _epFileState[field] = [];
  const hidden = document.getElementById(`epLink${field}`);
  if (hidden) hidden.value = '';
  _epRenderFilePreview(field);
  const results = await Promise.all(files.map(f => deleteCloudinaryFile(f.url)));
  toast(results.every(Boolean) ? 'File berhasil dihapus dari server' : 'File dihapus dari daftar (sebagian gagal dihapus dari server)', results.every(Boolean) ? 'success' : 'error');
}

async function epUploadFile(inputEl, hiddenId) {
  const file = inputEl.files[0];
  if (!file) return;
  const MAX_MB = 2;
  if (file.size > MAX_MB * 1024 * 1024) { toast(`File terlalu besar (maks ${MAX_MB}MB)`, 'error'); return; }
  try {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('kategori', 'eplanning');
    const r = await fetch('/api/upload', {
      method: 'POST', headers: { 'Authorization': authHeaders()['Authorization'] }, body: formData,
    });
    const d = await r.json();
    if (!r.ok) throw new Error(d.error || 'Gagal upload');
    document.getElementById(hiddenId).value = d.url;
    toast('File berhasil diunggah', 'success');
  } catch (err) { toast(err.message, 'error'); }
  inputEl.value = '';
}

// ── APPROVAL: KABID ──────────────────────────────────────────────────────
let _epApproveId = null;
function openApproveKabidModal(id) {
  _epApproveId = id;
  document.getElementById('epKabidNama').value = _user.nama || '';
  document.getElementById('epKabidNip').value = _user.nip || '';
  document.getElementById('epKabidTtd').value = '';
  openModal('modalEpApproveKabid');
}
async function submitApproveKabid() {
  const nama_kabid = document.getElementById('epKabidNama').value.trim();
  const nip_kabid = document.getElementById('epKabidNip').value.trim();
  const link_ttd = document.getElementById('epKabidTtd').value.trim();
  if (!nama_kabid || !nip_kabid) { toast('Nama dan NIP wajib diisi', 'error'); return; }
  try {
    const r = await fetch(`/api/eplanning/usulan/${_epApproveId}/approve-kabid`, {
      method: 'PUT', headers: { ...authHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ nama_kabid, nip_kabid, link_ttd }),
    });
    const d = await r.json();
    if (!r.ok) throw new Error(d.error || 'Gagal menyetujui usulan');
    toast('Usulan disetujui & diajukan ke Admin', 'success');
    closeModal('modalEpApproveKabid');
    loadEplanning();
  } catch (err) { toast(err.message, 'error'); }
}

function openApproveSekretarisModal(id) {
  _epApproveId = id;
  document.getElementById('epSekretarisNama').value = _user.nama || '';
  document.getElementById('epSekretarisNip').value = _user.nip || '';
  document.getElementById('epSekretarisTtd').value = '';
  openModal('modalEpApproveSekretaris');
}
async function submitApproveSekretaris() {
  const nama_sekretaris = document.getElementById('epSekretarisNama').value.trim();
  const nip_sekretaris = document.getElementById('epSekretarisNip').value.trim();
  const link_ttd_sekretaris = document.getElementById('epSekretarisTtd').value.trim();
  if (!nama_sekretaris || !nip_sekretaris) { toast('Nama dan NIP wajib diisi', 'error'); return; }
  try {
    const r = await fetch(`/api/eplanning/usulan/${_epApproveId}/approve-sekretaris`, {
      method: 'PUT', headers: { ...authHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ nama_sekretaris, nip_sekretaris, link_ttd_sekretaris }),
    });
    const d = await r.json();
    if (!r.ok) throw new Error(d.error || 'Gagal menyetujui usulan');
    toast('Usulan disetujui & diajukan ke Admin', 'success');
    closeModal('modalEpApproveSekretaris');
    loadEplanning();
  } catch (err) { toast(err.message, 'error'); }
}

function openApproveAdminModal(id) {
  _epApproveId = id;
  document.getElementById('epKadisNama').value = '';
  document.getElementById('epKadisNip').value = '';
  document.getElementById('epKadisTtd').value = '';
  openModal('modalEpApproveAdmin');
}
async function submitApproveAdmin() {
  const nama_kadis = document.getElementById('epKadisNama').value.trim();
  const nip_kadis = document.getElementById('epKadisNip').value.trim();
  const link_ttd_kadis = document.getElementById('epKadisTtd').value.trim();
  if (!nama_kadis || !nip_kadis) { toast('Nama dan NIP wajib diisi', 'error'); return; }
  try {
    const r = await fetch(`/api/eplanning/usulan/${_epApproveId}/approve-admin`, {
      method: 'PUT', headers: { ...authHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ nama_kadis, nip_kadis, link_ttd_kadis }),
    });
    const d = await r.json();
    if (!r.ok) throw new Error(d.error || 'Gagal mengesahkan usulan');
    toast('Usulan disahkan (SELESAI)', 'success');
    closeModal('modalEpApproveAdmin');
    loadEplanning();
  } catch (err) { toast(err.message, 'error'); }
}

async function epSubmitUsulan(id) {
  const ok = await showConfirm({
    title: 'Submit Usulan',
    msg: 'Usulan akan diajukan ke Kepala unit kerja terkait dan tidak bisa diedit sampai ada keputusan. Lanjutkan?',
    okText: 'Ya, Submit',
    type: 'warning',
  });
  if (!ok) return;
  try {
    const r = await fetch(`/api/eplanning/usulan/${id}/submit`, {
      method: 'PUT', headers: authHeaders(),
    });
    const d = await r.json();
    if (!r.ok) throw new Error(d.error || 'Gagal submit usulan');
    toast('Usulan diajukan', 'success');
    loadEplanning();
  } catch (err) { toast(err.message, 'error'); }
}

async function epKirimBalik(id) {
  const catatan = (prompt('Catatan alasan penolakan (wajib diisi):') || '').trim();
  if (!catatan) { toast('Catatan alasan penolakan wajib diisi', 'error'); return; }
  try {
    const r = await fetch(`/api/eplanning/usulan/${id}/status`, {
      method: 'PUT', headers: { ...authHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'DITOLAK', catatan_koreksi: catatan }),
    });
    const d = await r.json();
    if (!r.ok) throw new Error(d.error || 'Gagal menolak usulan');
    toast('Usulan ditolak, dikirim balik ke operator', 'success');
    loadEplanning();
  } catch (err) { toast(err.message, 'error'); }
}

let _epCurrentUsulan = null;
let _epRincianList = [];

async function openRincianPage(usulanId) {
  _epCurrentUsulan = _epUsulanList.find(u => u.id === usulanId) || { id: usulanId };
  navigateTo('eplanning-rincian', 'Rincian Anggaran', () => loadRincian(usulanId), 'eplanning', 'page-eplanning-rincian');
}

async function loadRincian(usulanId) {
  document.getElementById('epRincianJudul').textContent = _epCurrentUsulan.sub_kegiatan || '-';
  document.getElementById('epRincianBidang').textContent = _epCurrentUsulan.bidang_nama || '-';
  const tbody = document.getElementById('epRincianTableBody');
  tbody.innerHTML = `<tr class="empty-row"><td colspan="7">Memuat data...</td></tr>`;
  try {
    const r = await fetch(`/api/eplanning/rincian?usulan_id=${usulanId}`, { headers: authHeaders() });
    const d = await r.json();
    if (!r.ok) throw new Error(d.error || 'Gagal memuat rincian');
    _epRincianList = d.rincian || [];
    renderRincianTable();
  } catch (err) {
    tbody.innerHTML = `<tr class="empty-row"><td colspan="7">${esc(err.message)}</td></tr>`;
  }
}

function renderRincianTable() {
  const tbody = document.getElementById('epRincianTableBody');
  const role = epRole();
  const editable = _epCurrentUsulan && ['DRAFT', 'DITOLAK', undefined].includes(_epCurrentUsulan.status);
  if (!_epRincianList.length) {
    tbody.innerHTML = `<tr class="empty-row"><td colspan="7">Belum ada rincian</td></tr>`;
  } else {
    tbody.innerHTML = _epRincianList.map((r, i) => `<tr>
      <td>${i + 1}</td>
      <td>${esc(r.kode_rekening || '-')}<div style="font-size:11px;color:var(--text-secondary,#64748b)">${esc(r.nama_rekening || '')}</div></td>
      <td>${esc(r.komponen || '-')}<div style="font-size:11px;color:var(--text-secondary,#64748b)">${esc(r.spesifikasi || '')}</div></td>
      <td>${esc(r.sumber_dana || '-')}</td>
      <td>${esc(r.koefisien || '-')}</td>
      <td style="white-space:nowrap;font-weight:600">${epFmtRupiah(r.sub_total)}</td>
      <td style="white-space:nowrap">
        ${editable ? `<button class="btn btn-ghost btn-sm" data-tip="Edit" onclick="openRincianItemModal('${r.id}')">${EP_ICON_EDIT}</button>
        <button class="btn-hapus" data-tip="Hapus" onclick="deleteRincianItem('${r.id}')">${EP_ICON_TRASH}</button>` : ''}
      </td>
    </tr>`).join('');
  }
  const total = _epRincianList.reduce((s, r) => s + (Number(r.sub_total) || 0), 0);
  document.getElementById('epRincianTotal').textContent = epFmtRupiah(total);
}

async function openRincianItemModal(id = null) {
  document.getElementById('epRincianId').value = id || '';
  document.getElementById('epRincKodeRekening').value = '';
  document.getElementById('epRincKomponen').value = '';
  document.getElementById('epRincKategoriStandar').value = '';
  document.getElementById('epRincSpesifikasi').value = '';
  document.getElementById('epRincKeterangan').value = '';
  document.getElementById('epRincSumberDana').value = '';
  document.getElementById('epRincKoefisien').value = '';
  document.getElementById('epRincVolume').value = '';
  document.getElementById('epRincHarga').value = '';
  document.getElementById('btnRekPenyusun').style.display = 'none';
  _epPickedStandarHarga = null;
  document.getElementById('modalEpRincianTitle').textContent = id ? 'Edit Rincian' : 'Tambah Rincian';

  await Promise.all([epLoadSumberDanaOptions(), epLoadSatuanOptions()]);

  if (id) {
    const r = _epRincianList.find(x => x.id === id);
    if (r) {
      document.getElementById('epRincKodeRekening').value = r.kode_rekening || '';
      document.getElementById('epRincKomponen').value = r.komponen || '';
      document.getElementById('epRincSpesifikasi').value = r.spesifikasi || '';
      document.getElementById('epRincKeterangan').value = r.keterangan || '';
      document.getElementById('epRincSumberDana').value = r.sumber_dana || '';
      document.getElementById('epRincKoefisien').value = r.koefisien || '';
      document.getElementById('epRincVolume').value = r.volume || '';
      document.getElementById('epRincHarga').value = r.harga_satuan || '';
    }
  }
  epUpdateRincianSubtotal();
  openModal('modalEpRincian');
}

let _epRincSumberDanaOptions = [];
let _epRincSatuanOptions = [];

async function epLoadSumberDanaOptions() {
  try {
    const r = await fetch('/api/eplanning/sumberdana', { headers: authHeaders() });
    const d = await r.json();
    _epRincSumberDanaOptions = (d.sumberdana || []).filter(s => s.aktif !== false);
  } catch { _epRincSumberDanaOptions = []; }
}

async function epLoadSatuanOptions() {
  try {
    const r = await fetch('/api/eplanning/satuan', { headers: authHeaders() });
    const d = await r.json();
    _epRincSatuanOptions = (d.satuan || []).filter(s => s.aktif !== false);
  } catch { _epRincSatuanOptions = []; }
}

function epUpdateRincianSubtotal(volId = 'epRincVolume', hargaId = 'epRincHarga', outId = 'epRincSubtotalPreview') {
  const v = Number(document.getElementById(volId).value) || 0;
  const h = Number(document.getElementById(hargaId).value) || 0;
  document.getElementById(outId).textContent = epFmtRupiah(v * h);
}

function _epMakeRekeningCombobox(inputId) {
  let panel = null;

  function ensurePanel() {
    if (panel) return panel;
    panel = document.createElement('div');
    panel.className = 'csel-panel csel-panel-fixed';
    panel.style.display = 'none';
    panel.addEventListener('click', e => e.stopPropagation());
    document.body.appendChild(panel);

    
    document.addEventListener('click', (e) => {
      const input = document.getElementById(inputId);
      if (panel.style.display === 'none') return;
      if (e.target === input || panel.contains(e.target)) return;
      close();
    });
    
    
    window.addEventListener('scroll', (e) => {
      if (panel.style.display === 'none') return;
      if (panel.contains(e.target)) return;
      close();
    }, true);
    let lastW = window.innerWidth;
    window.addEventListener('resize', () => {
      if (window.innerWidth === lastW) return;
      lastW = window.innerWidth;
      close();
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') close();
    });

    return panel;
  }

  function close() { if (panel) panel.style.display = 'none'; }

  function position() {
    const input = document.getElementById(inputId);
    const p = ensurePanel();
    const r = input.getBoundingClientRect();
    p.style.width = r.width + 'px';
    p.style.visibility = 'hidden';
    p.style.display = 'block';
    const pr = p.getBoundingClientRect();
    let top = r.bottom + 5;
    if (top + pr.height > window.innerHeight - 8) top = Math.max(8, r.top - pr.height - 5);
    const left = Math.max(6, Math.min(r.left, window.innerWidth - pr.width - 6));
    p.style.top = top + 'px';
    p.style.left = left + 'px';
    p.style.visibility = 'visible';
  }

  function renderState(msg) {
    const p = ensurePanel();
    p.innerHTML = `<div class="csel-empty">${msg}</div>`;
    position();
  }

  function renderList(list) {
    const input = document.getElementById(inputId);
    const p = ensurePanel();
    p.innerHTML = '';
    if (!list.length) {
      p.innerHTML = `<div class="csel-empty">Tidak ditemukan</div>`;
    } else {
      list.forEach(x => {
        const div = document.createElement('div');
        div.className = 'csel-option';
        div.innerHTML = `<span class="csel-option-check"></span><span><b>${esc(x.kode_rekening)}</b> - ${esc(x.nama_rekening)}</span>`;
        div.addEventListener('click', () => {
          input.value = x.nama_rekening;
          input.dataset.kode = x.kode_rekening;
          close();
        });
        p.appendChild(div);
      });
    }
    position();
  }

  async function search() {
    const input = document.getElementById(inputId);
    const q = input.value.trim();
    delete input.dataset.kode; 
    if (q.length === 1) { renderState('Ketik minimal 2 huruf…'); return; }
    renderState(q.length === 0 ? 'Memuat rekening yang sering dipakai…' : 'Mencari…');
    try {
      const r = await fetch(`/api/eplanning/rekening?q=${encodeURIComponent(q)}`, { headers: authHeaders() });
      const d = await r.json();
      
      
      if (input.value.trim() !== q) return;
      renderList(d.rekening || []);
    } catch { renderList([]); }
  }

  return { search, close };
}

const _epRekeningCombo = _epMakeRekeningCombobox('epRincKodeRekening');
function epSearchRekening() { _epRekeningCombo.search(); }

const _epRekeningComboNew = _epMakeRekeningCombobox('epNewRincKodeRekening');
function epSearchRekeningNew() { _epRekeningComboNew.search(); }

function _epMakeRekeningMultiCombobox(inputId, wrapId) {
  let panel = null;
  let selected = []; 

  function ensurePanel() {
    if (panel) return panel;
    panel = document.createElement('div');
    panel.className = 'csel-panel csel-panel-fixed';
    panel.style.display = 'none';
    panel.addEventListener('click', e => e.stopPropagation());
    document.body.appendChild(panel);
    document.addEventListener('click', (e) => {
      const input = document.getElementById(inputId);
      if (panel.style.display === 'none') return;
      if (e.target === input || panel.contains(e.target)) return;
      close();
    });
    window.addEventListener('scroll', (e) => {
      if (panel.style.display === 'none') return;
      if (panel.contains(e.target)) return;
      close();
    }, true);
    let lastW = window.innerWidth;
    window.addEventListener('resize', () => {
      if (window.innerWidth === lastW) return;
      lastW = window.innerWidth;
      close();
    });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') close(); });
    return panel;
  }

  function close() { if (panel) panel.style.display = 'none'; }

  function position() {
    const wrap = document.getElementById(wrapId);
    const p = ensurePanel();
    const r = wrap.getBoundingClientRect();
    p.style.width = r.width + 'px';
    p.style.visibility = 'hidden';
    p.style.display = 'block';
    const pr = p.getBoundingClientRect();
    let top = r.bottom + 5;
    if (top + pr.height > window.innerHeight - 8) top = Math.max(8, r.top - pr.height - 5);
    const left = Math.max(6, Math.min(r.left, window.innerWidth - pr.width - 6));
    p.style.top = top + 'px';
    p.style.left = left + 'px';
    p.style.visibility = 'visible';
  }

  function renderChips() {
    const wrap = document.getElementById(wrapId);
    const input = document.getElementById(inputId);
    if (!wrap || !input) return;
    wrap.querySelectorAll('.chip-multi-item').forEach(el => el.remove());
    selected.forEach((it, idx) => {
      const chip = document.createElement('span');
      chip.className = 'chip-multi-item';
      chip.innerHTML = `<span>${esc(it.kode)}</span>`;
      const x = document.createElement('span');
      x.className = 'chip-multi-remove';
      x.textContent = '×';
      x.onclick = (e) => { e.stopPropagation(); selected.splice(idx, 1); renderChips(); };
      chip.appendChild(x);
      wrap.insertBefore(chip, input);
    });
  }

  function renderState(msg) {
    const p = ensurePanel();
    p.innerHTML = `<div class="csel-empty">${msg}</div>`;
    position();
  }

  function renderList(list) {
    const input = document.getElementById(inputId);
    const p = ensurePanel();
    const avail = list.filter(x => !selected.some(s => s.kode === x.kode_rekening));
    p.innerHTML = '';
    if (!avail.length) {
      p.innerHTML = `<div class="csel-empty">${list.length ? 'Semua hasil udah dipilih' : 'Tidak ditemukan'}</div>`;
    } else {
      avail.forEach(x => {
        const div = document.createElement('div');
        div.className = 'csel-option';
        div.innerHTML = `<span class="csel-option-check"></span><span><b>${esc(x.kode_rekening)}</b> - ${esc(x.nama_rekening)}</span>`;
        div.addEventListener('click', () => {
          selected.push({ kode: x.kode_rekening, nama: x.nama_rekening });
          renderChips();
          input.value = '';
          input.focus();
          search();
        });
        p.appendChild(div);
      });
    }
    position();
  }

  async function search() {
    const input = document.getElementById(inputId);
    const q = input.value.trim();
    if (q.length === 1) { renderState('Ketik minimal 2 huruf…'); return; }
    renderState(q.length === 0 ? 'Memuat rekening yang sering dipakai…' : 'Mencari…');
    try {
      const r = await fetch(`/api/eplanning/rekening?q=${encodeURIComponent(q)}`, { headers: authHeaders() });
      const d = await r.json();
      if (input.value.trim() !== q) return;
      renderList(d.rekening || []);
    } catch { renderList([]); }
  }

  function removeLast() {
    if (selected.length) { selected.pop(); renderChips(); }
  }

  function getValue() { return selected.map(s => s.kode).join(','); }

  // Set dari string "kode1,kode2,…" - nama-nya belum tentu ada (data lama dari
  // import/isi manual), jadi chip cukup tampilin kode-nya aja dulu.
  function setValue(str) {
    selected = (str || '').split(',').map(s => s.trim()).filter(Boolean).map(kode => ({ kode, nama: '' }));
    renderChips();
  }

  return { search, close, getValue, setValue, removeLast };
}

const _epShRekeningMulti = _epMakeRekeningMultiCombobox('epShKodeRekeningInput', 'epShKodeRekeningWrap');
function epSearchShKodeRekening() { _epShRekeningMulti.search(); }
function epShKodeRekeningKeydown(e) {
  if (e.key === 'Backspace' && !e.target.value) _epShRekeningMulti.removeLast();
  if (e.key === 'Escape') _epShRekeningMulti.close();
}

// ── Sumber Dana & Koefisien(Satuan) - combobox lokal, "sesuai dengan rekening":
// panel & interaksi (.csel-*, klik-luar, scroll, resize, Esc, posisi fixed)
// sama persis kayak Kode Rekening di atas. Bedanya cuma sumber datanya -
// Sumber Dana & Satuan sudah dimuat sekaligus ke memory pas modal dibuka
// (epLoadSumberDanaOptions/epLoadSatuanOptions), jadi difilter di client,
// gak perlu fetch live per ketikan kayak Rekening yang ~13rb baris. Tetap
// free-text (gak wajib pilih dari master), sama kayak field Sumber Dana.
function _epMakeLocalCombobox({ inputId, getOptions, matchText, renderOption, onPick }) {
  let panel = null;
  let bound = false;

  function ensurePanel() {
    if (panel) return panel;
    panel = document.createElement('div');
    panel.className = 'csel-panel csel-panel-fixed';
    panel.style.display = 'none';
    panel.addEventListener('click', e => e.stopPropagation());
    document.body.appendChild(panel);

    if (!bound) {
      bound = true;
      document.addEventListener('click', (e) => {
        const input = document.getElementById(inputId);
        if (panel.style.display === 'none') return;
        if (e.target === input || panel.contains(e.target)) return;
        close();
      });
      window.addEventListener('scroll', (e) => {
        if (panel.style.display === 'none') return;
        if (panel.contains(e.target)) return;
        close();
      }, true);
      let lastW = window.innerWidth;
      window.addEventListener('resize', () => {
        if (window.innerWidth === lastW) return;
        lastW = window.innerWidth;
        close();
      });
      document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') close();
      });
    }
    return panel;
  }

  function close() { if (panel) panel.style.display = 'none'; }

  function position() {
    const input = document.getElementById(inputId);
    const p = ensurePanel();
    const r = input.getBoundingClientRect();
    p.style.width = r.width + 'px';
    p.style.visibility = 'hidden';
    p.style.display = 'block';
    const pr = p.getBoundingClientRect();
    let top = r.bottom + 5;
    if (top + pr.height > window.innerHeight - 8) top = Math.max(8, r.top - pr.height - 5);
    const left = Math.max(6, Math.min(r.left, window.innerWidth - pr.width - 6));
    p.style.top = top + 'px';
    p.style.left = left + 'px';
    p.style.visibility = 'visible';
  }

  function search() {
    const input = document.getElementById(inputId);
    const q = input.value.trim().toLowerCase();
    const all = getOptions();
    const list = q ? all.filter(x => matchText(x).toLowerCase().includes(q)) : all;
    const p = ensurePanel();
    p.innerHTML = '';
    if (!list.length) {
      p.innerHTML = `<div class="csel-empty">${all.length ? 'Tidak ditemukan' : 'Belum ada data master'}</div>`;
    } else {
      list.forEach(x => {
        const div = document.createElement('div');
        div.className = 'csel-option';
        div.innerHTML = `<span class="csel-option-check"></span><span>${renderOption(x)}</span>`;
        div.addEventListener('click', () => {
          onPick(input, x);
          close();
        });
        p.appendChild(div);
      });
    }
    position();
  }

  return { search, close };
}

const _epSumberDanaCombo = _epMakeLocalCombobox({
  inputId: 'epRincSumberDana',
  getOptions: () => _epRincSumberDanaOptions,
  matchText: x => x.nama,
  renderOption: x => esc(x.nama),
  onPick: (input, x) => { input.value = x.nama; },
});
function epSearchSumberDana() { _epSumberDanaCombo.search(); }

const _epKoefisienCombo = _epMakeLocalCombobox({
  inputId: 'epRincKoefisien',
  getOptions: () => _epRincSatuanOptions,
  matchText: x => x.nama,
  renderOption: x => esc(x.nama),
  onPick: (input, x) => { input.value = x.nama; },
});
function epSearchKoefisienSatuan() { _epKoefisienCombo.search(); }

// Instance kedua buat field rincian pertama di modal Usulan gabungan.
const _epSumberDanaComboNew = _epMakeLocalCombobox({
  inputId: 'epNewRincSumberDana',
  getOptions: () => _epRincSumberDanaOptions,
  matchText: x => x.nama,
  renderOption: x => esc(x.nama),
  onPick: (input, x) => { input.value = x.nama; },
});
function epSearchSumberDanaNew() { _epSumberDanaComboNew.search(); }

const _epKoefisienComboNew = _epMakeLocalCombobox({
  inputId: 'epNewRincKoefisien',
  getOptions: () => _epRincSatuanOptions,
  matchText: x => x.nama,
  renderOption: x => esc(x.nama),
  onPick: (input, x) => { input.value = x.nama; },
});
function epSearchKoefisienSatuanNew() { _epKoefisienComboNew.search(); }

async function saveRincianItem() {
  const id = document.getElementById('epRincianId').value || null;
  const kodeInput = document.getElementById('epRincKodeRekening');
  const kode_rekening = kodeInput.dataset.kode || kodeInput.value.trim();
  const komponen = document.getElementById('epRincKomponen').value.trim();
  if (!komponen) { toast('Komponen wajib diisi', 'error'); return; }
  const body = {
    id,
    usulan_id: _epCurrentUsulan.id,
    kode_rekening,
    komponen,
    spesifikasi: document.getElementById('epRincSpesifikasi').value.trim(),
    keterangan: document.getElementById('epRincKeterangan').value.trim(),
    sumber_dana: document.getElementById('epRincSumberDana').value.trim(),
    koefisien: document.getElementById('epRincKoefisien').value.trim(),
    volume: document.getElementById('epRincVolume').value,
    harga_satuan: document.getElementById('epRincHarga').value,
  };
  try {
    const r = await fetch('/api/eplanning/rincian', {
      method: 'POST', headers: { ...authHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const d = await r.json();
    if (!r.ok) throw new Error(d.error || 'Gagal menyimpan rincian');
    toast('Rincian tersimpan', 'success');
    closeModal('modalEpRincian');
    loadRincian(_epCurrentUsulan.id);
  } catch (err) { toast(err.message, 'error'); }
}

async function deleteRincianItem(id) {
  if (!confirm('Hapus rincian ini?')) return;
  try {
    const r = await fetch(`/api/eplanning/rincian/${id}`, { method: 'DELETE', headers: authHeaders() });
    const d = await r.json();
    if (!r.ok) throw new Error(d.error || 'Gagal menghapus rincian');
    toast('Rincian dihapus', 'success');
    loadRincian(_epCurrentUsulan.id);
  } catch (err) { toast(err.message, 'error'); }
}

// ── MASTER DATA (admin only): Sub Kegiatan, Sumber Dana, Satuan, Pengaturan ──
// Catatan: sekarang masing-masing punya halaman & submenu sendiri (dipisah
// karena Satuan isinya ratusan baris, numpuk kalau digabung 1 halaman).

// ── SUB KEGIATAN (table + search + pagination) ──────────────────────────
let _epSubkegiatanFull = [];
let _epSubkegiatanSearch = '';
let _epSubkegiatanPage = 1;
const _epSubkegiatanPageSize = 10;

async function epLoadMasterSubkegiatan() {
  const tbody = document.getElementById('epMasterSubkegiatanBody');
  if (tbody) tbody.innerHTML = `<tr class="empty-row"><td colspan="6">Memuat...</td></tr>`;
  try {
    const r = await fetch('/api/eplanning/subkegiatan', { headers: authHeaders() });
    const d = await r.json();
    _epSubkegiatanFull = d.subkegiatan || [];
    _epSubkegiatanSearch = '';
    _epSubkegiatanPage = 1;
    const searchEl = document.getElementById('epSubkegiatanSearch');
    if (searchEl) searchEl.value = '';
    epRenderSubkegiatanTable();
  } catch { if (tbody) tbody.innerHTML = `<tr class="empty-row"><td colspan="6">Gagal memuat</td></tr>`; }
}
function epFilterSubkegiatan() {
  _epSubkegiatanSearch = (document.getElementById('epSubkegiatanSearch')?.value || '').trim().toLowerCase();
  _epSubkegiatanPage = 1;
  epRenderSubkegiatanTable();
}
function epRenderSubkegiatanTable() {
  const tbody = document.getElementById('epMasterSubkegiatanBody');
  if (!tbody) return;
  const q = _epSubkegiatanSearch;
  const filtered = q
    ? _epSubkegiatanFull.filter(s =>
        s.kode_subkegiatan.toLowerCase().includes(q) ||
        s.nama_subkegiatan.toLowerCase().includes(q) ||
        (s.indikator || '').toLowerCase().includes(q))
    : _epSubkegiatanFull;
  const start = (_epSubkegiatanPage - 1) * _epSubkegiatanPageSize;
  const slice = filtered.slice(start, start + _epSubkegiatanPageSize);
  tbody.innerHTML = slice.length ? slice.map(s => `<tr>
      <td>${esc(s.kode_subkegiatan)}</td><td>${esc(s.nama_subkegiatan)}</td><td>${esc(s.indikator||'-')}</td><td>${esc(s.satuan||'-')}</td>
      <td><span class="badge ${s.aktif ? 'badge-hijau' : 'badge-abu'}">${s.aktif ? 'Aktif' : 'Nonaktif'}</span></td>
      <td style="white-space:nowrap">
        <button class="btn btn-ghost btn-sm" data-tip="${s.aktif ? 'Nonaktifkan' : 'Aktifkan'}" onclick="epToggleSubkegiatan('${esc(s.kode_subkegiatan)}', ${!!s.aktif})">${s.aktif ? EP_ICON_POWER_OFF : EP_ICON_POWER_ON}</button>
        <button class="btn btn-ghost btn-sm" data-tip="Edit" onclick="openSubkegiatanModal('${esc(s.kode_subkegiatan)}')">${EP_ICON_EDIT}</button>
        <button class="btn-hapus" data-tip="Hapus" onclick="epDeleteSubkegiatan('${esc(s.kode_subkegiatan)}')">${EP_ICON_TRASH}</button>
      </td>
    </tr>`).join('') : `<tr class="empty-row"><td colspan="6">${q ? 'Tidak ada hasil pencarian' : 'Belum ada data'}</td></tr>`;
  renderPagination('epSubkegiatanPagination', filtered.length, _epSubkegiatanPage, _epSubkegiatanPageSize, 'goEpSubkegiatanPage');
}
window.goEpSubkegiatanPage = (p) => { _epSubkegiatanPage = p; epRenderSubkegiatanTable(); };

function openSubkegiatanModal(kode = null) {
  document.getElementById('epSubkegiatanKodeAsli').value = '';
  document.getElementById('epSubkegiatanKode').value = '';
  document.getElementById('epSubkegiatanKode').disabled = false;
  document.getElementById('epSubkegiatanNama').value = '';
  document.getElementById('epSubkegiatanIndikator').value = '';
  document.getElementById('epSubkegiatanSatuan').value = '';
  document.getElementById('epSubkegiatanAktif').checked = true;
  document.getElementById('epSubkegiatanAktifLabel').textContent = 'Aktif';
  document.getElementById('modalSubkegiatanTitle').textContent = kode ? 'Edit Sub Kegiatan' : 'Tambah Sub Kegiatan';
  if (kode) {
    const s = _epSubkegiatanFull.find(x => x.kode_subkegiatan === kode);
    if (s) {
      document.getElementById('epSubkegiatanKodeAsli').value = s.kode_subkegiatan;
      document.getElementById('epSubkegiatanKode').value = s.kode_subkegiatan;
      document.getElementById('epSubkegiatanKode').disabled = true;
      document.getElementById('epSubkegiatanNama').value = s.nama_subkegiatan;
      document.getElementById('epSubkegiatanIndikator').value = s.indikator || '';
      document.getElementById('epSubkegiatanSatuan').value = s.satuan || '';
      document.getElementById('epSubkegiatanAktif').checked = !!s.aktif;
      document.getElementById('epSubkegiatanAktifLabel').textContent = s.aktif ? 'Aktif' : 'Nonaktif';
    }
  }
  openModal('modalSubkegiatan');
}

async function epSaveSubkegiatan() {
  const kodeAsli = document.getElementById('epSubkegiatanKodeAsli').value;
  const kode = document.getElementById('epSubkegiatanKode').value.trim();
  const nama = document.getElementById('epSubkegiatanNama').value.trim();
  const indikator = document.getElementById('epSubkegiatanIndikator').value.trim();
  const satuan = document.getElementById('epSubkegiatanSatuan').value.trim();
  const aktif = document.getElementById('epSubkegiatanAktif').checked;
  if (!kode || !nama) { toast('Kode dan nama wajib diisi', 'error'); return; }
  const btn = document.getElementById('btnSaveSubkegiatan');
  btn.disabled = true;
  try {
    const method = kodeAsli ? 'PUT' : 'POST';
    const url = kodeAsli ? `/api/eplanning/subkegiatan/${encodeURIComponent(kodeAsli)}` : '/api/eplanning/subkegiatan';
    const body = kodeAsli
      ? { nama_subkegiatan: nama, indikator, satuan, aktif }
      : { kode_subkegiatan: kode, nama_subkegiatan: nama, indikator, satuan, aktif };
    const r = await fetch(url, { method, headers: { ...authHeaders(), 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    const d = await r.json();
    if (!r.ok) throw new Error(d.error || 'Gagal menyimpan');
    toast(kodeAsli ? 'Sub kegiatan diperbarui' : 'Sub kegiatan ditambahkan', 'success');
    closeModal('modalSubkegiatan');
    epLoadMasterSubkegiatan();
  } catch (err) { toast(err.message, 'error'); }
  finally { btn.disabled = false; }
}
async function epToggleSubkegiatan(kode, currentAktif) {
  try {
    const r = await fetch(`/api/eplanning/subkegiatan/${encodeURIComponent(kode)}`, {
      method: 'PUT', headers: { ...authHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ aktif: !currentAktif }),
    });
    const d = await r.json();
    if (!r.ok) throw new Error(d.error || 'Gagal mengubah status');
    toast(!currentAktif ? 'Sub kegiatan diaktifkan' : 'Sub kegiatan dinonaktifkan', 'success');
    epLoadMasterSubkegiatan();
  } catch (err) { toast(err.message, 'error'); }
}
async function epDeleteSubkegiatan(kode) {
  const s = _epSubkegiatanFull.find(x => x.kode_subkegiatan === kode);
  const ok = await showConfirm({
    title: 'Hapus Sub Kegiatan',
    msg: `Sub kegiatan "<b>${esc(s?.nama_subkegiatan || kode)}</b>" akan dihapus permanen.`,
    okText: 'Ya, Hapus', icon: 'trash',
  });
  if (!ok) return;
  await fetch(`/api/eplanning/subkegiatan/${encodeURIComponent(kode)}`, { method: 'DELETE', headers: authHeaders() });
  toast('Sub kegiatan dihapus');
  epLoadMasterSubkegiatan();
}

// ── Impor Excel Sub Kegiatan ─────────────────────────────────────────────
const EP_SUBKEG_COLMAP = {
  'KODE': 'kode_subkegiatan',
  'KODE SUB KEGIATAN': 'kode_subkegiatan',
  'KODE SUBKEGIATAN': 'kode_subkegiatan',
  'NAMA': 'nama_subkegiatan',
  'NAMA SUB KEGIATAN': 'nama_subkegiatan',
  'NAMA SUBKEGIATAN': 'nama_subkegiatan',
  'INDIKATOR': 'indikator',
  'SATUAN': 'satuan',
};

function openImporSubkegiatanModal() {
  document.getElementById('epImpSubkegFile').value = '';
  epImpSubkegResetFileText();
  document.getElementById('epImpSubkegProgress').style.display = 'none';
  document.getElementById('epImpSubkegProgressBar').style.width = '0%';
  openModal('modalImporSubkegiatan');
}

function epImpSubkegResetFileText() {
  const t = document.getElementById('epImpSubkegFileText');
  if (t) t.innerHTML = '<strong>Klik atau drag &amp; drop</strong> file di sini';
}

function epImpSubkegFileChange(input) {
  const t = document.getElementById('epImpSubkegFileText');
  if (t) t.innerHTML = input.files?.[0] ? `<strong>${esc(input.files[0].name)}</strong>` : '<strong>Klik atau drag &amp; drop</strong> file di sini';
}

function epImpSubkegFileDragOver(e) {
  e.preventDefault();
  document.getElementById('epImpSubkegUploadArea')?.classList.add('drag-over');
}

function epImpSubkegFileDragLeave(e) {
  e.preventDefault();
  document.getElementById('epImpSubkegUploadArea')?.classList.remove('drag-over');
}

function epImpSubkegFileDrop(e) {
  e.preventDefault();
  document.getElementById('epImpSubkegUploadArea')?.classList.remove('drag-over');
  const input = document.getElementById('epImpSubkegFile');
  if (e.dataTransfer?.files?.length) {
    input.files = e.dataTransfer.files;
    epImpSubkegFileChange(input);
  }
}

function _epParseSubkegiatanSheet(arrayBuffer) {
  const wb = XLSX.read(arrayBuffer, { type: 'array' });
  const ws = wb.Sheets[wb.SheetNames[0]];
  const raw = XLSX.utils.sheet_to_json(ws, { header: 1, raw: true, defval: '' });
  if (!raw.length) return [];
  const headerRow = raw[0].map(h => String(h || '').trim().toUpperCase());
  const idxMap = {};
  headerRow.forEach((h, i) => { if (EP_SUBKEG_COLMAP[h]) idxMap[EP_SUBKEG_COLMAP[h]] = i; });
  const rows = [];
  for (let i = 1; i < raw.length; i++) {
    const r = raw[i];
    if (!r || !r.length) continue;
    const kode = idxMap.kode_subkegiatan != null ? String(r[idxMap.kode_subkegiatan] ?? '').trim() : '';
    const nama = idxMap.nama_subkegiatan != null ? String(r[idxMap.nama_subkegiatan] ?? '').trim() : '';
    if (!kode || !nama) continue; // baris kosong / tanpa kode-nama, skip
    rows.push({
      kode_subkegiatan: kode,
      nama_subkegiatan: nama,
      indikator: idxMap.indikator != null ? String(r[idxMap.indikator] ?? '').trim() : '',
      satuan: idxMap.satuan != null ? String(r[idxMap.satuan] ?? '').trim() : '',
    });
  }
  return rows;
}

async function epSubmitImporSubkegiatan() {
  const fileInput = document.getElementById('epImpSubkegFile');
  const file = fileInput.files && fileInput.files[0];
  if (!file) { toast('Pilih file Excel dulu', 'error'); return; }

  const btn = document.getElementById('btnMulaiImporSubkeg');
  const btnBatal = document.getElementById('btnBatalImporSubkeg');
  const progWrap = document.getElementById('epImpSubkegProgress');
  const progBar = document.getElementById('epImpSubkegProgressBar');
  const progText = document.getElementById('epImpSubkegProgressText');
  btn.disabled = true; btnBatal.disabled = true;
  progWrap.style.display = 'block';
  progText.textContent = 'Membaca file…';

  try {
    const buf = await file.arrayBuffer();
    const rows = _epParseSubkegiatanSheet(buf);
    if (!rows.length) throw new Error('Tidak ada baris data yang bisa dibaca dari file ini (pastikan ada kolom Kode & Nama)');

    const CHUNK = 500;
    const totalChunks = Math.ceil(rows.length / CHUNK);
    let inserted = 0;
    for (let c = 0; c < totalChunks; c++) {
      const chunk = rows.slice(c * CHUNK, (c + 1) * CHUNK);
      const r = await fetch('/api/eplanning/subkegiatan/import', {
        method: 'POST', headers: { ...authHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ rows: chunk }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || `Gagal impor batch ke-${c + 1}`);
      inserted += d.inserted || chunk.length;
      const pct = Math.round(((c + 1) / totalChunks) * 100);
      progBar.style.width = pct + '%';
      progText.textContent = `Mengimpor… ${Math.min((c + 1) * CHUNK, rows.length)} / ${rows.length} baris`;
    }
    toast(`Impor selesai - ${inserted} sub kegiatan tersimpan`, 'success');
    closeModal('modalImporSubkegiatan');
    epLoadMasterSubkegiatan();
  } catch (err) {
    toast(err.message, 'error');
  } finally {
    btn.disabled = false; btnBatal.disabled = false;
  }
}

let _epSumberDanaFull = [];
let _epSumberDanaSearch = '';
let _epSumberDanaPage = 1;
const _epSumberDanaPageSize = 10;

async function epLoadMasterSumberDana() {
  const tb = document.getElementById('epMasterSumberDanaBody');
  if (tb) tb.innerHTML = `<tr class="empty-row"><td colspan="4">Memuat data...</td></tr>`;
  try {
    const r = await fetch('/api/eplanning/sumberdana', { headers: authHeaders() });
    const d = await r.json();
    _epSumberDanaFull = d.sumberdana || [];
    _epSumberDanaSearch = '';
    _epSumberDanaPage = 1;
    const searchEl = document.getElementById('epSumberDanaSearch');
    if (searchEl) searchEl.value = '';
    epRenderSumberDanaTable();
  } catch { if (tb) tb.innerHTML = `<tr class="empty-row"><td colspan="4">Gagal memuat</td></tr>`; }
}
function epFilterSumberDana() {
  _epSumberDanaSearch = (document.getElementById('epSumberDanaSearch')?.value || '').trim().toLowerCase();
  _epSumberDanaPage = 1;
  epRenderSumberDanaTable();
}
function epRenderSumberDanaTable() {
  const tb = document.getElementById('epMasterSumberDanaBody');
  if (!tb) return;
  const filtered = _epSumberDanaSearch
    ? _epSumberDanaFull.filter(s => s.nama.toLowerCase().includes(_epSumberDanaSearch) || (s.kode || '').toLowerCase().includes(_epSumberDanaSearch))
    : _epSumberDanaFull;
  const start = (_epSumberDanaPage - 1) * _epSumberDanaPageSize;
  const slice = filtered.slice(start, start + _epSumberDanaPageSize);
  tb.innerHTML = slice.length ? slice.map(s => `
    <tr>
      <td>${esc(s.kode || '-')}</td>
      <td>${esc(s.nama)}</td>
      <td><span class="badge ${s.aktif ? 'badge-hijau' : 'badge-abu'}">${s.aktif ? 'Aktif' : 'Nonaktif'}</span></td>
      <td style="white-space:nowrap">
        <button class="btn btn-ghost btn-sm" data-tip="${s.aktif ? 'Nonaktifkan' : 'Aktifkan'}" onclick="epToggleSumberDana(${s.id}, ${!!s.aktif})">${s.aktif ? EP_ICON_POWER_OFF : EP_ICON_POWER_ON}</button>
        <button class="btn btn-ghost btn-sm" data-tip="Edit" onclick="openSumberDanaModal(${s.id})">${EP_ICON_EDIT}</button>
        <button class="btn-hapus" data-tip="Hapus" onclick="epDeleteSumberDana(${s.id})">${EP_ICON_TRASH}</button>
      </td>
    </tr>`).join('') : `<tr class="empty-row"><td colspan="4">${_epSumberDanaSearch ? 'Tidak ada hasil pencarian' : 'Belum ada data'}</td></tr>`;
  renderPagination('epSumberDanaPagination', filtered.length, _epSumberDanaPage, _epSumberDanaPageSize, 'goEpSumberDanaPage');
}
window.goEpSumberDanaPage = (p) => { _epSumberDanaPage = p; epRenderSumberDanaTable(); };

function openSumberDanaModal(id = null) {
  document.getElementById('epSumberDanaId').value = '';
  document.getElementById('epSumberDanaKode').value = '';
  document.getElementById('epSumberDanaNama').value = '';
  document.getElementById('epSumberDanaAktif').checked = true;
  document.getElementById('epSumberDanaAktifLabel').textContent = 'Aktif';
  document.getElementById('modalSumberDanaTitle').textContent = id ? 'Edit Sumber Dana' : 'Tambah Sumber Dana';
  if (id) {
    const s = _epSumberDanaFull.find(x => x.id === id);
    if (s) {
      document.getElementById('epSumberDanaId').value = s.id;
      document.getElementById('epSumberDanaKode').value = s.kode || '';
      document.getElementById('epSumberDanaNama').value = s.nama;
      document.getElementById('epSumberDanaAktif').checked = !!s.aktif;
      document.getElementById('epSumberDanaAktifLabel').textContent = s.aktif ? 'Aktif' : 'Nonaktif';
    }
  }
  openModal('modalSumberDana');
}

async function epSaveSumberDana() {
  const id = document.getElementById('epSumberDanaId').value;
  const kode = document.getElementById('epSumberDanaKode').value.trim();
  const nama = document.getElementById('epSumberDanaNama').value.trim();
  const aktif = document.getElementById('epSumberDanaAktif').checked;
  if (!nama) { toast('Nama wajib diisi', 'error'); return; }
  const btn = document.getElementById('btnSaveSumberDana');
  btn.disabled = true;
  try {
    const method = id ? 'PUT' : 'POST';
    const url = id ? `/api/eplanning/sumberdana/${id}` : '/api/eplanning/sumberdana';
    const r = await fetch(url, { method, headers: { ...authHeaders(), 'Content-Type': 'application/json' }, body: JSON.stringify({ nama, kode, aktif }) });
    const d = await r.json();
    if (!r.ok) throw new Error(d.error || 'Gagal menyimpan');
    toast(id ? 'Sumber dana diperbarui' : 'Sumber dana ditambahkan', 'success');
    closeModal('modalSumberDana');
    epLoadMasterSumberDana();
  } catch (err) { toast(err.message, 'error'); }
  finally { btn.disabled = false; }
}
async function epToggleSumberDana(id, currentAktif) {
  try {
    const r = await fetch(`/api/eplanning/sumberdana/${id}`, {
      method: 'PUT', headers: { ...authHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ aktif: !currentAktif }),
    });
    const d = await r.json();
    if (!r.ok) throw new Error(d.error || 'Gagal mengubah status');
    toast(!currentAktif ? 'Sumber dana diaktifkan' : 'Sumber dana dinonaktifkan', 'success');
    epLoadMasterSumberDana();
  } catch (err) { toast(err.message, 'error'); }
}
async function epDeleteSumberDana(id) {
  const s = _epSumberDanaFull.find(x => x.id === id);
  const ok = await showConfirm({
    title: 'Hapus Sumber Dana',
    msg: `Sumber dana "<b>${esc(s?.nama || '')}</b>" akan dihapus permanen.`,
    okText: 'Ya, Hapus', icon: 'trash',
  });
  if (!ok) return;
  await fetch(`/api/eplanning/sumberdana/${id}`, { method: 'DELETE', headers: authHeaders() });
  toast('Sumber dana dihapus');
  epLoadMasterSumberDana();
}

// ── Impor Excel Sumber Dana ──────────────────────────────────────────────
const EP_SUMBERDANA_COLMAP = {
  'NAMA': 'nama',
  'SUMBER DANA': 'nama',
  'NAMA SUMBER DANA': 'nama',
  'KODE': 'kode',
  'KODE SUMBER DANA': 'kode',
};

function openImporSumberDanaModal() {
  document.getElementById('epImpSdFile').value = '';
  epImpSdResetFileText();
  document.getElementById('epImpSdProgress').style.display = 'none';
  document.getElementById('epImpSdProgressBar').style.width = '0%';
  openModal('modalImporSumberDana');
}

function epImpSdResetFileText() {
  const t = document.getElementById('epImpSdFileText');
  if (t) t.innerHTML = '<strong>Klik atau drag &amp; drop</strong> file di sini';
}

function epImpSdFileChange(input) {
  const t = document.getElementById('epImpSdFileText');
  if (t) t.innerHTML = input.files?.[0] ? `<strong>${esc(input.files[0].name)}</strong>` : '<strong>Klik atau drag &amp; drop</strong> file di sini';
}

function epImpSdFileDragOver(e) {
  e.preventDefault();
  document.getElementById('epImpSdUploadArea')?.classList.add('drag-over');
}

function epImpSdFileDragLeave(e) {
  e.preventDefault();
  document.getElementById('epImpSdUploadArea')?.classList.remove('drag-over');
}

function epImpSdFileDrop(e) {
  e.preventDefault();
  document.getElementById('epImpSdUploadArea')?.classList.remove('drag-over');
  const input = document.getElementById('epImpSdFile');
  if (e.dataTransfer?.files?.length) {
    input.files = e.dataTransfer.files;
    epImpSdFileChange(input);
  }
}

function _epParseSumberDanaSheet(arrayBuffer) {
  const wb = XLSX.read(arrayBuffer, { type: 'array' });
  const ws = wb.Sheets[wb.SheetNames[0]];
  const raw = XLSX.utils.sheet_to_json(ws, { header: 1, raw: true, defval: '' });
  if (!raw.length) return [];
  const headerRow = raw[0].map(h => String(h || '').trim().toUpperCase());
  let namaIdx = headerRow.findIndex(h => EP_SUMBERDANA_COLMAP[h] === 'nama');
  let kodeIdx = headerRow.findIndex(h => EP_SUMBERDANA_COLMAP[h] === 'kode');
  let startRow = 1;
  if (namaIdx === -1) {
    // Gak ada header yang cocok - anggap file cuma 1 kolom nama tanpa header, baca dari baris pertama
    namaIdx = 0;
    kodeIdx = -1;
    startRow = 0;
  }
  const rows = [];
  for (let i = startRow; i < raw.length; i++) {
    const r = raw[i];
    if (!r || !r.length) continue;
    const nama = String(r[namaIdx] ?? '').trim();
    if (!nama) continue;
    const kode = kodeIdx !== -1 ? String(r[kodeIdx] ?? '').trim() : '';
    rows.push({ kode, nama });
  }
  return rows;
}

async function epSubmitImporSumberDana() {
  const fileInput = document.getElementById('epImpSdFile');
  const file = fileInput.files && fileInput.files[0];
  if (!file) { toast('Pilih file Excel dulu', 'error'); return; }

  const btn = document.getElementById('btnMulaiImporSd');
  const btnBatal = document.getElementById('btnBatalImporSd');
  const progWrap = document.getElementById('epImpSdProgress');
  const progBar = document.getElementById('epImpSdProgressBar');
  const progText = document.getElementById('epImpSdProgressText');
  btn.disabled = true; btnBatal.disabled = true;
  progWrap.style.display = 'block';
  progText.textContent = 'Membaca file…';

  try {
    const buf = await file.arrayBuffer();
    const rows = _epParseSumberDanaSheet(buf);
    if (!rows.length) throw new Error('Tidak ada baris data yang bisa dibaca dari file ini');

    const CHUNK = 500;
    const totalChunks = Math.ceil(rows.length / CHUNK);
    let inserted = 0;
    for (let c = 0; c < totalChunks; c++) {
      const chunk = rows.slice(c * CHUNK, (c + 1) * CHUNK);
      const r = await fetch('/api/eplanning/sumberdana/import', {
        method: 'POST', headers: { ...authHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ rows: chunk }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || `Gagal impor batch ke-${c + 1}`);
      inserted += d.inserted || 0;
      const pct = Math.round(((c + 1) / totalChunks) * 100);
      progBar.style.width = pct + '%';
      progText.textContent = `Mengimpor… ${Math.min((c + 1) * CHUNK, rows.length)} / ${rows.length} baris`;
    }
    toast(`Impor selesai - ${inserted} sumber dana baru ditambahkan`, 'success');
    closeModal('modalImporSumberDana');
    epLoadMasterSumberDana();
  } catch (err) {
    toast(err.message, 'error');
  } finally {
    btn.disabled = false; btnBatal.disabled = false;
  }
}

let _epSatuanFull = [];
let _epSatuanSearchQ = '';
let _epSatuanPage = 1;
const _epSatuanPageSize = 10;

async function epLoadMasterSatuan() {
  const tb = document.getElementById('epMasterSatuanBody');
  if (tb) tb.innerHTML = `<tr class="empty-row"><td colspan="3">Memuat data...</td></tr>`;
  try {
    const r = await fetch('/api/eplanning/satuan', { headers: authHeaders() });
    const d = await r.json();
    _epSatuanFull = d.satuan || [];
    _epSatuanSearchQ = '';
    _epSatuanPage = 1;
    const searchEl = document.getElementById('epSatuanSearch');
    if (searchEl) searchEl.value = '';
    epRenderSatuanTable();
  } catch { if (tb) tb.innerHTML = `<tr class="empty-row"><td colspan="3">Gagal memuat</td></tr>`; }
}
function epFilterSatuan() {
  _epSatuanSearchQ = (document.getElementById('epSatuanSearch')?.value || '').trim().toLowerCase();
  _epSatuanPage = 1;
  epRenderSatuanTable();
}
function epRenderSatuanTable() {
  const tb = document.getElementById('epMasterSatuanBody');
  if (!tb) return;
  const filtered = _epSatuanSearchQ
    ? _epSatuanFull.filter(s => s.nama.toLowerCase().includes(_epSatuanSearchQ))
    : _epSatuanFull;
  const start = (_epSatuanPage - 1) * _epSatuanPageSize;
  const slice = filtered.slice(start, start + _epSatuanPageSize);
  tb.innerHTML = slice.length ? slice.map(s => `
    <tr>
      <td>${esc(s.nama)}</td>
      <td><span class="badge ${s.aktif ? 'badge-hijau' : 'badge-abu'}">${s.aktif ? 'Aktif' : 'Nonaktif'}</span></td>
      <td style="white-space:nowrap">
        <button class="btn btn-ghost btn-sm" data-tip="${s.aktif ? 'Nonaktifkan' : 'Aktifkan'}" onclick="epToggleSatuan(${s.id}, ${!!s.aktif})">${s.aktif ? EP_ICON_POWER_OFF : EP_ICON_POWER_ON}</button>
        <button class="btn btn-ghost btn-sm" data-tip="Edit" onclick="openSatuanModal(${s.id})">${EP_ICON_EDIT}</button>
        <button class="btn-hapus" data-tip="Hapus" onclick="epDeleteSatuan(${s.id})">${EP_ICON_TRASH}</button>
      </td>
    </tr>`).join('') : `<tr class="empty-row"><td colspan="3">${_epSatuanSearchQ ? 'Tidak ada satuan yang cocok' : 'Belum ada data'}</td></tr>`;
  renderPagination('epSatuanPagination', filtered.length, _epSatuanPage, _epSatuanPageSize, 'goEpSatuanPage');
}
window.goEpSatuanPage = (p) => { _epSatuanPage = p; epRenderSatuanTable(); };

function openSatuanModal(id = null) {
  document.getElementById('epSatuanId').value = '';
  document.getElementById('epSatuanNama').value = '';
  document.getElementById('epSatuanAktif').checked = true;
  document.getElementById('epSatuanAktifLabel').textContent = 'Aktif';
  document.getElementById('modalSatuanTitle').textContent = id ? 'Edit Satuan' : 'Tambah Satuan';
  if (id) {
    const s = _epSatuanFull.find(x => x.id === id);
    if (s) {
      document.getElementById('epSatuanId').value = s.id;
      document.getElementById('epSatuanNama').value = s.nama;
      document.getElementById('epSatuanAktif').checked = !!s.aktif;
      document.getElementById('epSatuanAktifLabel').textContent = s.aktif ? 'Aktif' : 'Nonaktif';
    }
  }
  openModal('modalSatuan');
}

async function epSaveSatuan() {
  const id = document.getElementById('epSatuanId').value;
  const nama = document.getElementById('epSatuanNama').value.trim();
  const aktif = document.getElementById('epSatuanAktif').checked;
  if (!nama) { toast('Nama satuan wajib diisi', 'error'); return; }
  const btn = document.getElementById('btnSaveSatuan');
  btn.disabled = true;
  try {
    const method = id ? 'PUT' : 'POST';
    const url = id ? `/api/eplanning/satuan/${id}` : '/api/eplanning/satuan';
    const r = await fetch(url, { method, headers: { ...authHeaders(), 'Content-Type': 'application/json' }, body: JSON.stringify({ nama, aktif }) });
    const d = await r.json();
    if (!r.ok) throw new Error(d.error || 'Gagal menyimpan');
    toast(id ? 'Satuan diperbarui' : 'Satuan ditambahkan', 'success');
    closeModal('modalSatuan');
    epLoadMasterSatuan();
  } catch (err) { toast(err.message, 'error'); }
  finally { btn.disabled = false; }
}
async function epToggleSatuan(id, currentAktif) {
  try {
    const r = await fetch(`/api/eplanning/satuan/${id}`, {
      method: 'PUT', headers: { ...authHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ aktif: !currentAktif }),
    });
    const d = await r.json();
    if (!r.ok) throw new Error(d.error || 'Gagal mengubah status');
    toast(!currentAktif ? 'Satuan diaktifkan' : 'Satuan dinonaktifkan', 'success');
    epLoadMasterSatuan();
  } catch (err) { toast(err.message, 'error'); }
}
async function epDeleteSatuan(id) {
  const s = _epSatuanFull.find(x => x.id === id);
  const ok = await showConfirm({
    title: 'Hapus Satuan',
    msg: `Satuan "<b>${esc(s?.nama || '')}</b>" akan dihapus permanen.`,
    okText: 'Ya, Hapus', icon: 'trash',
  });
  if (!ok) return;
  await fetch(`/api/eplanning/satuan/${id}`, { method: 'DELETE', headers: authHeaders() });
  toast('Satuan dihapus');
  epLoadMasterSatuan();
}

// Tarik manual semua satuan yang UDAH ada di data Standar Harga (SSH/HSPK/ASB/SBU)
// yang sudah terupload - termasuk yang diimpor SEBELUM fitur auto-sync-saat-impor
// ditambahkan. Yang belum ada di master langsung ditambahin.
async function epSyncSatuanDariStandarHarga() {
  try {
    const r = await fetch('/api/eplanning/satuan/sync-dari-standarharga', { method: 'POST', headers: authHeaders() });
    const d = await r.json();
    if (!r.ok) throw new Error(d.error || 'Gagal sinkronisasi');
    toast(d.added ? `${d.added} satuan baru ditambahkan dari Standar Harga` : 'Semua satuan sudah tersinkron, tidak ada yang baru', 'success');
    epLoadMasterSatuan();
  } catch (err) { toast(err.message, 'error'); }
}

let _epRekeningPage = 1;
const _epRekeningPageSize = 10;
let _epRekeningCache = {}; 

async function epLoadMasterRekening(page = 1) {
  _epRekeningPage = page;
  const tb = document.getElementById('epMasterRekeningBody');
  if (tb) tb.innerHTML = `<tr class="empty-row"><td colspan="4">Memuat data...</td></tr>`;
  const search = (document.getElementById('epRekeningSearch')?.value || '').trim();
  try {
    const qs = new URLSearchParams({ page, pageSize: _epRekeningPageSize, search });
    const r = await fetch(`/api/eplanning/rekening?${qs}`, { headers: authHeaders() });
    const d = await r.json();
    if (!r.ok) throw new Error(d.error || 'Gagal memuat');
    const rows = d.rekening || [];
    _epRekeningCache = {};
    rows.forEach(x => { _epRekeningCache[x.kode_rekening] = x; });
    if (tb) {
      tb.innerHTML = rows.length ? rows.map(x => `
        <tr>
          <td style="white-space:nowrap">${esc(x.kode_rekening)}</td>
          <td>${esc(x.nama_rekening)}</td>
          <td><span class="badge ${x.aktif ? 'badge-hijau' : 'badge-abu'}">${x.aktif ? 'Aktif' : 'Nonaktif'}</span></td>
          <td style="white-space:nowrap">
            <button class="btn btn-ghost btn-sm" data-tip="${x.aktif ? 'Nonaktifkan' : 'Aktifkan'}" onclick="epToggleRekening('${x.kode_rekening}', ${!!x.aktif})">${x.aktif ? EP_ICON_POWER_OFF : EP_ICON_POWER_ON}</button>
            <button class="btn btn-ghost btn-sm" data-tip="Edit" onclick="openRekeningModal('${x.kode_rekening}')">${EP_ICON_EDIT}</button>
            <button class="btn-hapus" data-tip="Hapus" onclick="epDeleteRekening('${x.kode_rekening}')">${EP_ICON_TRASH}</button>
          </td>
        </tr>`).join('') : `<tr class="empty-row"><td colspan="4">${search ? 'Tidak ada rekening yang cocok' : 'Belum ada data'}</td></tr>`;
    }
    renderPagination('epRekeningPagination', d.total || 0, _epRekeningPage, _epRekeningPageSize, (p) => epLoadMasterRekening(p));
  } catch (err) {
    if (tb) tb.innerHTML = `<tr class="empty-row"><td colspan="4">Gagal memuat</td></tr>`;
    toast(err.message, 'error');
  }
}

function openRekeningModal(kode = null) {
  document.getElementById('epRekeningKode').value = '';
  document.getElementById('epRekeningKode').disabled = false;
  document.getElementById('epRekeningNama').value = '';
  document.getElementById('epRekeningAktif').checked = true;
  document.getElementById('epRekeningAktifLabel').textContent = 'Aktif';
  document.getElementById('modalRekeningTitle').textContent = kode ? 'Edit Rekening' : 'Tambah Rekening';
  if (kode) {
    const x = _epRekeningCache[kode];
    if (x) {
      document.getElementById('epRekeningKode').value = x.kode_rekening;
      document.getElementById('epRekeningKode').disabled = true; // kode = primary key, gak bisa diubah pas edit
      document.getElementById('epRekeningNama').value = x.nama_rekening;
      document.getElementById('epRekeningAktif').checked = !!x.aktif;
      document.getElementById('epRekeningAktifLabel').textContent = x.aktif ? 'Aktif' : 'Nonaktif';
    }
  }
  openModal('modalRekening');
}

async function epSaveRekening() {
  const kodeInput = document.getElementById('epRekeningKode');
  const isEdit = kodeInput.disabled;
  const kode = kodeInput.value.trim();
  const nama = document.getElementById('epRekeningNama').value.trim();
  const aktif = document.getElementById('epRekeningAktif').checked;
  if (!kode || !nama) { toast('Kode dan nama rekening wajib diisi', 'error'); return; }
  const btn = document.getElementById('btnSaveRekening');
  btn.disabled = true;
  try {
    const method = isEdit ? 'PUT' : 'POST';
    const url = isEdit ? `/api/eplanning/rekening/${encodeURIComponent(kode)}` : '/api/eplanning/rekening';
    const body = isEdit ? { nama_rekening: nama, aktif } : { kode_rekening: kode, nama_rekening: nama };
    const r = await fetch(url, { method, headers: { ...authHeaders(), 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    const d = await r.json();
    if (!r.ok) throw new Error(d.error || 'Gagal menyimpan');
    toast(isEdit ? 'Rekening diperbarui' : 'Rekening ditambahkan', 'success');
    closeModal('modalRekening');
    epLoadMasterRekening(_epRekeningPage);
  } catch (err) { toast(err.message, 'error'); }
  finally { btn.disabled = false; }
}

async function epToggleRekening(kode, currentAktif) {
  try {
    const r = await fetch(`/api/eplanning/rekening/${encodeURIComponent(kode)}`, {
      method: 'PUT', headers: { ...authHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ aktif: !currentAktif }),
    });
    const d = await r.json();
    if (!r.ok) throw new Error(d.error || 'Gagal mengubah status');
    toast(!currentAktif ? 'Rekening diaktifkan' : 'Rekening dinonaktifkan', 'success');
    epLoadMasterRekening(_epRekeningPage);
  } catch (err) { toast(err.message, 'error'); }
}

async function epDeleteRekening(kode) {
  const x = _epRekeningCache[kode];
  const ok = await showConfirm({
    title: 'Hapus Rekening',
    msg: `Rekening "<b>${esc(kode)} - ${esc(x?.nama_rekening || '')}</b>" akan dihapus permanen.`,
    okText: 'Ya, Hapus', icon: 'trash',
  });
  if (!ok) return;
  await fetch(`/api/eplanning/rekening/${encodeURIComponent(kode)}`, { method: 'DELETE', headers: authHeaders() });
  toast('Rekening dihapus');
  epLoadMasterRekening(_epRekeningPage);
}

// Periode e-Planning (jenis='eplanning', tahunan) kini dikelola lewat
// Master Data → Periode. Helper ini cuma baca window aktifnya untuk dipakai
// sebagai default tahun anggaran di form usulan + info banner di halaman usulan.
let _epPeriodeAktif = null; // { id, tahun, open_at, close_at, label } | null
// Dipecah jadi fetch (network) + apply (filter pakai _epTahunAktif) supaya
// loadEplanning() bisa nembak request ini BARENGAN dgn epEnsureTahunList(),
// baru filter-nya dijalankan setelah _epTahunAktif final (hindari race kalau
// _epTahunAktif ternyata dikoreksi sama epEnsureTahunList).
async function _epFetchPeriodeAktif() {
  try {
    const r = await fetch('/api/periode/aktif', { headers: authHeaders() });
    const d = await r.json();
    return d.periode || [];
  } catch { return []; }
}

function _epApplyPeriodeAktif(list) {
  // Cocokin ke Tahun Anggaran yang lagi dipilih di switcher - /api/periode/aktif
  // ngembaliin SEMUA periode yg window-nya lagi kebuka lintas tahun, jadi tanpa
  // filter ini bisa numpang nampilin periode tahun lain (mis. milih 2027 tapi
  // yg ketampil periode 2026 karena itu yg kebetulan lagi buka). Kalau tahun
  // belum ke-set (_epTahunAktif null, kondisi awal sebelum switcher ke-load),
  // fallback ke perilaku lama (ambil yg pertama ketemu).
  _epPeriodeAktif = (list || []).find(p => p.jenis === 'eplanning' && (!_epTahunAktif || p.tahun === _epTahunAktif)) || null;
  return _epPeriodeAktif;
}

async function epLoadPeriodeAktif() {
  const list = await _epFetchPeriodeAktif();
  return _epApplyPeriodeAktif(list);
}
// ═══════════════════════════════════════════════════════════════════════
// STANDAR HARGA SATUAN (SSH/HSPK/ASB/SBU) - referensi harga hasil export
// SIPD. Dipakai di 2 tempat:
//  1) Combobox "Komponen" di form Tambah/Edit Rincian (search-as-you-type,
//     server-side, mirip pola Kode Rekening - datanya bisa ribuan baris).
//  2) Halaman Master Data → Standar Harga Satuan (admin: tambah/edit/hapus/impor,
//     role lain: lihat-lihat aja buat referensi).
// ═══════════════════════════════════════════════════════════════════════

// ── Combobox Komponen (di modal Rincian) ────────────────────────────────
let _epPickedStandarHarga = null; // item terakhir yg dipilih dari daftar (buat tombol "Rekening Penyusun")

function _epMakeStandarHargaCombobox(inputId, kategoriSelectId, opts = {}) {
  let panel = null;

  function ensurePanel() {
    if (panel) return panel;
    panel = document.createElement('div');
    panel.className = 'csel-panel csel-panel-fixed';
    panel.style.display = 'none';
    panel.addEventListener('click', e => e.stopPropagation());
    document.body.appendChild(panel);
    document.addEventListener('click', (e) => {
      const input = document.getElementById(inputId);
      if (panel.style.display === 'none') return;
      if (e.target === input || panel.contains(e.target)) return;
      close();
    });
    window.addEventListener('scroll', (e) => {
      if (panel.style.display === 'none') return;
      if (panel.contains(e.target)) return;
      close();
    }, true);
    let lastW = window.innerWidth;
    window.addEventListener('resize', () => {
      if (window.innerWidth === lastW) return;
      lastW = window.innerWidth;
      close();
    });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') close(); });
    return panel;
  }

  function close() { if (panel) panel.style.display = 'none'; }

  function position() {
    const input = document.getElementById(inputId);
    const p = ensurePanel();
    const r = input.getBoundingClientRect();
    p.style.width = Math.max(r.width, 320) + 'px';
    p.style.visibility = 'hidden';
    p.style.display = 'block';
    const pr = p.getBoundingClientRect();
    let top = r.bottom + 5;
    if (top + pr.height > window.innerHeight - 8) top = Math.max(8, r.top - pr.height - 5);
    const left = Math.max(6, Math.min(r.left, window.innerWidth - pr.width - 6));
    p.style.top = top + 'px';
    p.style.left = left + 'px';
    p.style.visibility = 'visible';
  }

  function renderState(msg) {
    const p = ensurePanel();
    p.innerHTML = `<div class="csel-empty">${msg}</div>`;
    position();
  }

  function renderList(list) {
    const input = document.getElementById(inputId);
    const p = ensurePanel();
    p.innerHTML = '';
    if (!list.length) {
      p.innerHTML = `<div class="csel-empty">Tidak ditemukan - bisa isi manual</div>`;
    } else {
      list.forEach(x => {
        const div = document.createElement('div');
        div.className = 'csel-option';
        const hargaFmt = epFmtRupiah(Number(x.harga_satuan) || 0);
        div.innerHTML = `<span class="csel-option-check"></span><span>
          <b>${esc(x.uraian_barang)}</b>
          ${x.spesifikasi ? ` <span style="color:var(--text-secondary,#64748b)">(${esc(x.spesifikasi)})</span>` : ''}
          <br><span style="font-size:11.5px;color:var(--text-secondary,#64748b)">${esc(x.kategori)} · ${esc(x.satuan || '-')} · ${hargaFmt}</span>
        </span>`;
        div.addEventListener('click', () => {
          input.value = x.uraian_barang;
          if (opts.onPick) opts.onPick(x);
          close();
        });
        p.appendChild(div);
      });
    }
    position();
  }

  async function search() {
    const input = document.getElementById(inputId);
    const q = input.value.trim();
    const kategori = kategoriSelectId ? (document.getElementById(kategoriSelectId)?.value || '') : '';
    // Scope ke tahun anggaran usulan yg lagi diisi rinciannya (bukan dropdown tahun global -
    // rincian usulan tahun 2027 tetap harus nyari dari Standar Harga tahun 2027 walaupun user
    // lagi browsing tahun lain). Fallback ke dropdown global kalau _epCurrentUsulan belum keisi.
    const tahun = (typeof _epCurrentUsulan !== 'undefined' && _epCurrentUsulan?.tahun_anggaran)
      ? _epCurrentUsulan.tahun_anggaran
      : (typeof _epTahunAktif !== 'undefined' ? _epTahunAktif : '');
    if (opts.onTyping) opts.onTyping();
    if (q.length === 1) { renderState('Ketik minimal 2 huruf…'); return; }
    renderState(q.length === 0 ? 'Memuat komponen…' : 'Mencari…');
    try {
      const qs = new URLSearchParams({ q, kategori, ...(tahun ? { tahun } : {}) });
      const r = await fetch(`/api/eplanning/standarharga?${qs}`, { headers: authHeaders() });
      const d = await r.json();
      if (input.value.trim() !== q) return; // hasil basi, user udah lanjut ngetik
      renderList(d.standarharga || []);
    } catch { renderList([]); }
  }

  return { search, close };
}

const _epStandarHargaCombo = _epMakeStandarHargaCombobox('epRincKomponen', 'epRincKategoriStandar', {
  onPick: (x) => {
    _epPickedStandarHarga = x;
    document.getElementById('epRincSpesifikasi').value = x.spesifikasi || '';
    document.getElementById('epRincKoefisien').value = x.satuan || '';
    document.getElementById('epRincHarga').value = x.harga_satuan || 0;
    epUpdateRincianSubtotal();

    const btn = document.getElementById('btnRekPenyusun');
    const kodeList = (x.kode_rekening || '').split(',').map(s => s.trim()).filter(Boolean);
    if (kodeList.length) {
      btn.style.display = '';
      if (kodeList.length === 1) {
        // Cuma 1 kode rekening → langsung isi otomatis, gak perlu buka modal pilihan.
        const kodeInput = document.getElementById('epRincKodeRekening');
        kodeInput.dataset.kode = kodeList[0];
        
        fetch(`/api/eplanning/rekening?q=${encodeURIComponent(kodeList[0])}`, { headers: authHeaders() })
          .then(r => r.json())
          .then(d => {
            const match = (d.rekening || []).find(r => r.kode_rekening === kodeList[0]);
            kodeInput.value = match ? match.nama_rekening : kodeList[0];
          })
          .catch(() => { kodeInput.value = kodeList[0]; });
      }
    } else {
      btn.style.display = 'none';
    }
  },
  onTyping: () => {
    
    
    _epPickedStandarHarga = null;
    document.getElementById('btnRekPenyusun').style.display = 'none';
  },
});
function epSearchKomponenStandar() { _epStandarHargaCombo.search(); }

function epOpenRekeningPenyusun() {
  const x = _epPickedStandarHarga;
  if (!x) return;
  document.getElementById('epRekPenyusunNama').textContent = x.uraian_barang || '-';
  document.getElementById('epRekPenyusunSpek').textContent = x.spesifikasi || '-';
  document.getElementById('epRekPenyusunSatuan').textContent = x.satuan || '-';
  const kodeList = (x.kode_rekening || '').split(',').map(s => s.trim()).filter(Boolean);
  const listEl = document.getElementById('epRekPenyusunList');
  listEl.innerHTML = kodeList.map(kode => `
    <div class="csel-option" style="border:1px solid var(--border,#e2e8f0);border-radius:8px;margin-bottom:6px;padding:10px" onclick="epPickRekeningPenyusun('${esc(kode)}', this)">
      <b>${esc(kode)}</b><br><span style="font-size:12px;color:var(--text-secondary,#64748b)" data-nama-rekening="${esc(kode)}">Memuat nama rekening…</span>
    </div>`).join('');
  // Resolve nama rekening per kode (best-effort, biar user tau ini rekening apa)
  Promise.all(kodeList.map(async kode => {
    try {
      const r = await fetch(`/api/eplanning/rekening?q=${encodeURIComponent(kode)}`, { headers: authHeaders() });
      const d = await r.json();
      const match = (d.rekening || []).find(rk => rk.kode_rekening === kode);
      const el = listEl.querySelector(`[data-nama-rekening="${CSS.escape(kode)}"]`);
      if (el) el.textContent = match ? match.nama_rekening : '(tidak ada di master rekening)';
    } catch {}
  }));
  openModal('modalEpRekeningPenyusun');
}

function epPickRekeningPenyusun(kode) {
  const kodeInput = document.getElementById('epRincKodeRekening');
  kodeInput.dataset.kode = kode;
  const el = document.querySelector(`#epRekPenyusunList [data-nama-rekening="${CSS.escape(kode)}"]`);
  kodeInput.value = (el && el.textContent && !el.textContent.startsWith('Memuat') && !el.textContent.startsWith('(tidak')) ? el.textContent : kode;
  closeModal('modalEpRekeningPenyusun');
}

let _epTampilRekList = [];
let _epTampilRekPage = 1;
const _epTampilRekPageSize = 5;

function epOpenTampilkanRekening(id) {
  const x = _epShCache[id];
  if (!x) return;
  document.getElementById('epTampilRekNama').textContent = x.uraian_barang || '-';
  document.getElementById('epTampilRekSpek').textContent = x.spesifikasi || '-';
  document.getElementById('epTampilRekSatuan').textContent = x.satuan || '-';
  const kodeList = (x.kode_rekening || '').split(',').map(s => s.trim()).filter(Boolean);
  _epTampilRekList = kodeList.map(kode => ({ kode, nama: 'Memuat nama rekening…' }));
  _epTampilRekPage = 1;
  const searchInput = document.getElementById('epTampilRekSearch');
  if (searchInput) searchInput.value = '';
  _epRenderTampilRekening();
  openModal('modalEpTampilkanRekening');

  
  Promise.all(kodeList.map(async kode => {
    try {
      const r = await fetch(`/api/eplanning/rekening?q=${encodeURIComponent(kode)}`, { headers: authHeaders() });
      const d = await r.json();
      const match = (d.rekening || []).find(rk => rk.kode_rekening === kode);
      const item = _epTampilRekList.find(it => it.kode === kode);
      if (item) item.nama = match ? match.nama_rekening : '(tidak ada di master rekening)';
      _epRenderTampilRekening();
    } catch {}
  }));
}

function _epTampilRekFiltered() {
  const q = (document.getElementById('epTampilRekSearch')?.value || '').trim().toLowerCase();
  if (!q) return _epTampilRekList;
  return _epTampilRekList.filter(it => it.kode.toLowerCase().includes(q) || (it.nama || '').toLowerCase().includes(q));
}

function epSearchTampilkanRekening() {
  _epTampilRekPage = 1;
  _epRenderTampilRekening();
}

function _epRenderTampilRekening() {
  const filtered = _epTampilRekFiltered();
  const total = filtered.length;
  const pages = Math.max(1, Math.ceil(total / _epTampilRekPageSize));
  if (_epTampilRekPage > pages) _epTampilRekPage = pages;
  const pageItems = filtered.slice((_epTampilRekPage - 1) * _epTampilRekPageSize, _epTampilRekPage * _epTampilRekPageSize);

  const tb = document.getElementById('epTampilRekBody');
  if (tb) {
    tb.innerHTML = pageItems.length ? pageItems.map(it => `
      <tr>
        <td>${esc(it.kode)}${it.nama ? ' ' + esc(it.nama) : ''}</td>
        <td style="text-align:right"><button class="btn btn-ghost btn-sm" data-tip="Salin kode" onclick="epCopyKodeRekening('${esc(it.kode)}')">${EP_ICON_COPY}</button></td>
      </tr>`).join('') : `<tr class="empty-row"><td colspan="2">${document.getElementById('epTampilRekSearch')?.value?.trim() ? 'Tidak ditemukan' : 'Belum ada rekening'}</td></tr>`;
  }

  renderPagination('epTampilRekPagination', total, _epTampilRekPage, _epTampilRekPageSize, (p) => {
    _epTampilRekPage = p;
    _epRenderTampilRekening();
  });
}

function epCopyKodeRekening(kode) {
  navigator.clipboard?.writeText(kode).then(() => toast('Kode rekening disalin', 'success')).catch(() => {});
}

// ── Halaman Master Data: Standar Harga Satuan (tab SSH/HSPK/ASB/SBU) ───
let _epShKategori = 'SSH';
let _epShPage = 1;
let _epShPageSize = 20;
let _epShCache = {}; // id -> row, buat modal edit tanpa fetch ulang

// Unduh daftar Standar Harga Satuan (sesuai filter yg lagi aktif: kategori/tahun/
// search/status/satuan) sebagai PDF (kop surat + tabel, lewat print-preview window,
// pola yg sama dgn Laporan Surat/Kinerja) - biar user bisa lihat2 referensi harga
// tanpa perlu buka aplikasi. Data dipaginasi di backend (max 100 baris/request),
// jadi di sini di-loop ambil semua halaman dulu baru digabung jadi satu tabel.
async function epDownloadStandarHargaPDF(btnEl) {
  const originalHtml = btnEl ? btnEl.innerHTML : null;
  if (btnEl) { btnEl.disabled = true; btnEl.innerHTML = `<span class="btn-spin" style="width:12px;height:12px"></span> Menyiapkan...`; }
  try {
    const search = (document.getElementById('epShSearch')?.value || '').trim();
    const status = document.getElementById('epShFilterStatus')?.value || '';
    const satuan = document.getElementById('epShFilterSatuan')?.value || '';
    const pageSize = 100;
    // Halaman 1 dulu (buat tau total & totalPages), sisanya ditembak PARALEL
    // (dibatasi 6 bareng) - dulu semua halaman diambil satu-satu berurutan.
    const _epShQS = (page) => new URLSearchParams({ page, pageSize, search, kategori: _epShKategori, status, satuan, ...(_epTahunAktif ? { tahun: _epTahunAktif } : {}) });
    const r1 = await fetch(`/api/eplanning/standarharga?${_epShQS(1)}`, { headers: authHeaders() });
    const d1 = await r1.json();
    if (!r1.ok) throw new Error(d1.error || 'Gagal memuat data');
    const allRows = [...(d1.standarharga || [])];
    const total = d1.total || 0;
    const totalPages = Math.max(1, Math.ceil(total / pageSize));

    if (totalPages > 1) {
      const restPages = Array.from({ length: totalPages - 1 }, (_, i) => i + 2); // halaman 2..totalPages
      const pageResults = new Array(restPages.length);
      let idx = 0;
      async function _epShWorker() {
        while (idx < restPages.length) {
          const myIdx = idx++;
          try {
            const r = await fetch(`/api/eplanning/standarharga?${_epShQS(restPages[myIdx])}`, { headers: authHeaders() });
            const d = await r.json();
            pageResults[myIdx] = d.standarharga || [];
          } catch { pageResults[myIdx] = []; }
        }
      }
      await Promise.all(Array.from({ length: Math.min(6, restPages.length) }, () => _epShWorker()));
      pageResults.forEach(rows => allRows.push(...rows));
    }
    if (!allRows.length) { toast('Tidak ada data untuk diunduh sesuai filter saat ini.', 'error'); return; }

    const kategoriLabel = (typeof EP_SH_KATEGORI_LABEL !== 'undefined' && EP_SH_KATEGORI_LABEL[_epShKategori]) || _epShKategori;
    const tahunLabel = _epTahunAktif ? `Tahun ${_epTahunAktif}` : 'Semua Tahun';
    const judulDoc = `Standar Harga Satuan_${_epShKategori}_${tahunLabel}`;
    const fmtRupiah = n => 'Rp ' + (Number(n) || 0).toLocaleString('id-ID');

    const detailRows = allRows.map((x, i) => {
      const statusBadge = x.aktif
        ? `<span style="background:#d1fae5;color:#065f46;padding:1px 6px;border-radius:99px;font-size:7.5px;white-space:nowrap">Aktif</span>`
        : `<span style="background:#fee2e2;color:#991b1b;padding:1px 6px;border-radius:99px;font-size:7.5px;white-space:nowrap">Nonaktif</span>`;
      return `<tr>
        <td style="padding:4px 6px;border:1px solid #000;text-align:center;font-size:8px;white-space:nowrap">${i + 1}</td>
        <td style="padding:4px 6px;border:1px solid #000;font-size:8px">${(x.rekening_label || x.kode_rekening || '-').split('\u241E').join('<br>')}</td>
        <td style="padding:4px 6px;border:1px solid #000;font-size:8px;white-space:nowrap">${x.kode_barang || '-'}</td>
        <td style="padding:4px 6px;border:1px solid #000;font-size:8px">${x.uraian_barang || '-'}</td>
        <td style="padding:4px 6px;border:1px solid #000;font-size:8px">${x.spesifikasi || '-'}</td>
        <td style="padding:4px 6px;border:1px solid #000;text-align:center;font-size:8px;white-space:nowrap">${x.satuan || '-'}</td>
        <td style="padding:4px 6px;border:1px solid #000;text-align:right;font-size:8px;white-space:nowrap">${fmtRupiah(x.harga_satuan)}</td>
        <td style="padding:4px 6px;border:1px solid #000;text-align:center;font-size:8px;white-space:nowrap">${x.tkdn != null && x.tkdn !== '' ? Number(x.tkdn) + '%' : '-'}</td>
        <td style="padding:4px 6px;border:1px solid #000;text-align:center">${statusBadge}</td>
      </tr>`;
    }).join('');

    const bodyHtml = `
      ${_kopSuratHtml()}
      <div style="text-align:center;margin:14px 0 12px">
        <div style="font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:.5px">Standar Harga Satuan</div>
        <div style="font-size:11px;color:#64748b;margin-top:4px">${kategoriLabel} - ${tahunLabel}</div>
      </div>
      <table>
        <thead>
          <tr style="background:#0d9488">
            <th style="color:white;padding:5px 6px;border:1px solid #000;text-align:center;font-size:8px;width:42px">NO</th>
            <th style="color:white;padding:5px 6px;border:1px solid #000;text-align:center;font-size:8px;width:150px">KODE REKENING</th>
            <th style="color:white;padding:5px 6px;border:1px solid #000;text-align:center;font-size:8px;width:90px">KODE KOMPONEN</th>
            <th style="color:white;padding:5px 6px;border:1px solid #000;text-align:center;font-size:8px">URAIAN KOMPONEN</th>
            <th style="color:white;padding:5px 6px;border:1px solid #000;text-align:center;font-size:8px;width:100px">SPESIFIKASI</th>
            <th style="color:white;padding:5px 6px;border:1px solid #000;text-align:center;font-size:8px;width:56px">SATUAN</th>
            <th style="color:white;padding:5px 6px;border:1px solid #000;text-align:center;font-size:8px;width:88px">HARGA SATUAN</th>
            <th style="color:white;padding:5px 6px;border:1px solid #000;text-align:center;font-size:8px;width:52px">TKDN</th>
            <th style="color:white;padding:5px 6px;border:1px solid #000;text-align:center;font-size:8px;width:64px">STATUS</th>
          </tr>
        </thead>
        <tbody>${detailRows}</tbody>
      </table>`;

    _bukaPreviewPDF(bodyHtml, judulDoc, 'landscape');
  } catch (err) {
    toast(err.message || 'Gagal menyiapkan PDF', 'error');
  } finally {
    if (btnEl) { btnEl.disabled = false; btnEl.innerHTML = originalHtml; }
  }
}

async function epLoadStandarHargaCounts() {
  try {
    const qs = new URLSearchParams(_epTahunAktif ? { tahun: _epTahunAktif } : {});
    const r = await fetch(`/api/eplanning/standarharga/count?${qs}`, { headers: authHeaders() });
    const d = await r.json();
    const map = {}; (d.count || []).forEach(x => { map[x.kategori] = x.total; });
    ['SSH', 'HSPK', 'ASB', 'SBU'].forEach(k => {
      const el = document.getElementById(`ephkCount-${k}`);
      if (el) el.textContent = map[k] != null ? map[k] : '0';
    });
  } catch {}
}

const EP_SH_KATEGORI_LABEL = {
  SSH: 'SSH - Standar Satuan Harga',
  HSPK: 'HSPK - Harga Satuan Pokok Kegiatan',
  ASB: 'ASB - Analisis Standar Belanja',
  SBU: 'SBU - Standar Biaya Umum',
};

const EP_SH_KATEGORI_ICON_PATH = {
  SSH: 'M11.0049 20.9997C11.0049 20.1712 10.3333 19.4997 9.50488 19.4997C8.67646 19.4997 8.00488 20.1712 8.00488 20.9997H3.00488C2.4526 20.9997 2.00488 20.5519 2.00488 19.9997V3.99966C2.00488 3.44738 2.4526 2.99966 3.00488 2.99966H8.00488C8.00488 3.82809 8.67646 4.49966 9.50488 4.49966C10.3333 4.49966 11.0049 3.82809 11.0049 2.99966H21.0049C21.5572 2.99966 22.0049 3.44738 22.0049 3.99966V9.49966C20.6242 9.49966 19.5049 10.619 19.5049 11.9997C19.5049 13.3804 20.6242 14.4997 22.0049 14.4997V19.9997C22.0049 20.5519 21.5572 20.9997 21.0049 20.9997H11.0049ZM9.50488 10.4997C10.3333 10.4997 11.0049 9.82809 11.0049 8.99966C11.0049 8.17124 10.3333 7.49966 9.50488 7.49966C8.67646 7.49966 8.00488 8.17124 8.00488 8.99966C8.00488 9.82809 8.67646 10.4997 9.50488 10.4997ZM9.50488 16.4997C10.3333 16.4997 11.0049 15.8281 11.0049 14.9997C11.0049 14.1712 10.3333 13.4997 9.50488 13.4997C8.67646 13.4997 8.00488 14.1712 8.00488 14.9997C8.00488 15.8281 8.67646 16.4997 9.50488 16.4997Z',
  HSPK: 'M15 21H9V10H15V21ZM17 21V10H22V20C22 20.5523 21.5523 21 21 21H17ZM7 21H3C2.44772 21 2 20.5523 2 20V10H7V21ZM22 8H2V4C2 3.44772 2.44772 3 3 3H21C21.5523 3 22 3.44772 22 4V8Z',
  ASB: 'M3 12H7V21H3V12ZM17 8H21V21H17V8ZM10 2H14V21H10V2Z',
  SBU: 'M17 15.2454V22.1169C17 22.393 16.7761 22.617 16.5 22.617C16.4094 22.617 16.3205 22.5923 16.2428 22.5457L12 20L7.75725 22.5457C7.52046 22.6877 7.21333 22.6109 7.07125 22.3742C7.02463 22.2964 7 22.2075 7 22.1169V15.2454C5.17107 13.7793 4 11.5264 4 9C4 4.58172 7.58172 1 12 1C16.4183 1 20 4.58172 20 9C20 11.5264 18.8289 13.7793 17 15.2454ZM12 15C15.3137 15 18 12.3137 18 9C18 5.68629 15.3137 3 12 3C8.68629 3 6 5.68629 6 9C6 12.3137 8.68629 15 12 15ZM12 13C9.79086 13 8 11.2091 8 9C8 6.79086 9.79086 5 12 5C14.2091 5 16 6.79086 16 9C16 11.2091 14.2091 13 12 13Z',
};

function epShTabSwitch(kategori) {
  _epShKategori = kategori;
  const label = EP_SH_KATEGORI_LABEL[kategori] || kategori;
  const titleEl = document.getElementById('epShPageTitle');
  const subtitleEl = document.getElementById('epShPageSubtitle');
  const iconEl = document.getElementById('epShPageIcon');
  if (titleEl) titleEl.textContent = label;
  if (subtitleEl) subtitleEl.textContent = `Referensi harga (${label}) hasil export SIPD - dipakai buat auto-isi form Rincian Anggaran`;
  if (iconEl) {
    const d = EP_SH_KATEGORI_ICON_PATH[kategori];
    if (d) iconEl.innerHTML = `<path d="${d}"/>`;
  }
  const searchEl = document.getElementById('epShSearch');
  if (searchEl) searchEl.value = '';
  epEnsureTahunList().then(() => {
    epLoadStandarHargaMeta();
    epLoadStandarHarga(1);
  });
}

// Isi dropdown Status & Satuan sesuai data yang benar-benar ada di kategori aktif.
// Kalau nilainya cuma 1 macam, langsung terselect ke nilai itu; kalau lebih dari 1,
// default-nya "Semua Status" / "Semua Satuan" yang terselect.
async function epLoadStandarHargaMeta() {
  const selStatus = document.getElementById('epShFilterStatus');
  const selSatuan = document.getElementById('epShFilterSatuan');
  if (selStatus) selStatus.innerHTML = `<option value="">Semua Status</option>`;
  if (selSatuan) selSatuan.innerHTML = `<option value="">Semua Satuan</option>`;
  try {
    const qs = new URLSearchParams({ kategori: _epShKategori, ...(_epTahunAktif ? { tahun: _epTahunAktif } : {}) });
    const r = await fetch(`/api/eplanning/standarharga/meta?${qs}`, { headers: authHeaders() });
    const d = await r.json();
    const satuanList = d.satuan || [];
    const statusList = d.status || [];

    if (selSatuan) {
      selSatuan.innerHTML = `<option value="">Semua Satuan</option>` +
        satuanList.map(s => `<option value="${esc(s)}">${esc(s)}</option>`).join('');
      selSatuan.value = satuanList.length === 1 ? satuanList[0] : '';
    }
    if (selStatus) {
      selStatus.innerHTML = `<option value="">Semua Status</option>` +
        statusList.map(s => `<option value="${s}">${s ? 'Aktif' : 'Nonaktif'}</option>`).join('');
      selStatus.value = statusList.length === 1 ? String(statusList[0]) : '';
    }
  } catch {}
}

// Pagination khusus Standar Harga Satuan - sama pola tombolnya kayak
// renderPagination() global, tapi nambahin dropdown "Item per halaman"
// (10/20/50/100) di sisi kiri, dan tetap tampil walau cuma 1 halaman.
function epShChangePageSize(val) {
  _epShPageSize = parseInt(val, 10) || 20;
  epLoadStandarHarga(1);
}
function renderShPagination(total) {
  const c = document.getElementById('epStandarHargaPagination');
  if (!c) return;
  const limit = _epShPageSize;
  const page = _epShPage;
  const pages = Math.max(1, Math.ceil(total / limit));
  const from = total === 0 ? 0 : (page - 1) * limit + 1;
  const to = Math.min(page * limit, total);

  const sizeOpts = [10, 20, 50, 100].map(n =>
    `<option value="${n}"${n === limit ? ' selected' : ''}>${n}</option>`).join('');
  const sizeSelect = `<div class="ep-sh-pagesize" style="display:flex;align-items:center;gap:6px;font-size:var(--fs-sm);color:var(--teks-muted);padding-right:var(--sp-3);border-right:1px solid var(--abu-2)">
      <span>Item per halaman</span>
      <div class="select-wrap ep-sh-pagesize-select" style="width:60px"><select onchange="epShChangePageSize(this.value)">${sizeOpts}</select></div>
    </div>`;
  const info = `<div class="pagination-info">${total > 0 ? `${from}-${to} dari ${total} data` : '0 data'}</div>`;

  const btn = (disabled, onclick, svg) =>
    `<button class="page-btn" ${disabled ? 'disabled' : ''} onclick="${onclick}">${svg}</button>`;
  const svgFirst = `<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M11 19l-7-7 7-7M18 19l-7-7 7-7"/></svg>`;
  const svgPrev  = `<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7"/></svg>`;
  const svgNext  = `<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7"/></svg>`;
  const svgLast  = `<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M6 5l7 7-7 7M13 5l7 7-7 7"/></svg>`;
  let nav = '<div class="pagination">';
  nav += btn(page === 1,     `epLoadStandarHarga(1)`,        svgFirst);
  nav += btn(page === 1,     `epLoadStandarHarga(${page - 1})`, svgPrev);
  for (let i = 1; i <= pages; i++) {
    if (pages > 7 && Math.abs(i - page) > 2 && i !== 1 && i !== pages) {
      if (i === 2 || i === pages - 1) nav += '<span style="color:var(--teks-muted);padding:0 4px">…</span>';
      continue;
    }
    nav += `<button class="page-btn${i === page ? ' active' : ''}" onclick="epLoadStandarHarga(${i})">${i}</button>`;
  }
  nav += btn(page === pages, `epLoadStandarHarga(${page + 1})`, svgNext);
  nav += btn(page === pages, `epLoadStandarHarga(${pages})`,    svgLast);
  nav += '</div>';

  c.innerHTML = `<div class="pagination-wrap">${sizeSelect}${info}${nav}</div>`;
  // Select item-per-halaman dirender ulang tiap load - build ulang jadi custom
  // dropdown biar stylenya konsisten (bukan tampilan <select> bawaan browser),
  // sama pola kayak dropdown lain di seluruh app (lihat buildCustomSelect di app.html).
  if (typeof window.initCustomSelects === 'function') window.initCustomSelects();
  
  
  
  
  
  const psWrap = c.querySelector('.ep-sh-pagesize-select');
  if (psWrap && psWrap._cselPanel) psWrap._cselPanel.classList.add('ep-sh-pagesize-panel');
}

async function epLoadStandarHarga(page = 1) {
  _epShPage = page;
  const tb = document.getElementById('epStandarHargaBody');
  if (tb) tb.innerHTML = `<tr class="empty-row"><td colspan="9">Memuat data...</td></tr>`;
  await epEnsureTahunList();
  const search = (document.getElementById('epShSearch')?.value || '').trim();
  const status = document.getElementById('epShFilterStatus')?.value || '';
  const satuan = document.getElementById('epShFilterSatuan')?.value || '';
  const isAdmin = _user.is_admin || (typeof hasAccess === 'function' && hasAccess('eplanning.admin'));
  try {
    const qs = new URLSearchParams({ page, pageSize: _epShPageSize, search, kategori: _epShKategori, status, satuan, ...(_epTahunAktif ? { tahun: _epTahunAktif } : {}) });
    const r = await fetch(`/api/eplanning/standarharga?${qs}`, { headers: authHeaders() });
    const d = await r.json();
    if (!r.ok) throw new Error(d.error || 'Gagal memuat');
    const rows = d.standarharga || [];
    _epShCache = {};
    rows.forEach(x => { _epShCache[x.id] = x; });
    if (tb) {
      
      
      let lastRek = undefined;
      tb.innerHTML = rows.length ? rows.map(x => {
        const rekKey = x.kode_rekening || '';
        let groupHtml = '';
        if (rekKey !== lastRek) {
          lastRek = rekKey;
          const rekItems = (x.rekening_label || rekKey).split('\u241E').map(s => s.trim()).filter(Boolean);
          const label = rekKey
            ? (rekItems.length > 1
                ? `<div style="display:flex;flex-direction:column;gap:3px">${rekItems.map(it => `<div>${esc(it)}</div>`).join('')}</div>`
                : esc(rekItems[0] || rekKey))
            : 'Tanpa Kode Rekening';
          groupHtml = `<tr class="ep-sh-group-row"><td colspan="9" style="background:var(--bg-hover,#f8fafc);font-weight:700;font-size:12.5px;padding:9px 14px;border-top:1px solid var(--border,#e2e8f0)">${label}</td></tr>`;
        }
        return `${groupHtml}
        <tr>
          <td style="white-space:nowrap;font-size:12.5px">${esc(x.kode_barang || '-')}</td>
          <td>${esc(x.uraian_barang)}</td>
          <td>${esc(x.spesifikasi || '-')}</td>
          <td>${esc(x.satuan || '-')}</td>
          <td style="white-space:nowrap">${epFmtRupiah(Number(x.harga_satuan) || 0)}</td>
          <td>${x.tkdn != null && x.tkdn !== '' ? esc(Number(x.tkdn)) + '%' : '-'}</td>
          <td style="white-space:nowrap">${esc(x.tahun || 2027)}</td>
          <td><span class="badge ${x.aktif ? 'badge-hijau' : 'badge-abu'}">${x.aktif ? 'Aktif' : 'Nonaktif'}</span></td>
          <td style="white-space:nowrap">
            ${x.kode_rekening ? `<button class="btn btn-ghost btn-sm" data-tip="Tampilkan Rekening" onclick="epOpenTampilkanRekening(${x.id})">${EP_ICON_LIST}</button>` : ''}
            ${isAdmin ? `
            <button class="btn btn-ghost btn-sm" data-tip="${x.aktif ? 'Nonaktifkan' : 'Aktifkan'}" onclick="epToggleStandarHarga(${x.id}, ${!!x.aktif})">${x.aktif ? EP_ICON_POWER_OFF : EP_ICON_POWER_ON}</button>
            <button class="btn btn-ghost btn-sm" data-tip="Edit" onclick="openStandarHargaModal(${x.id})">${EP_ICON_EDIT}</button>
            <button class="btn-hapus" data-tip="Hapus" onclick="epDeleteStandarHarga(${x.id})">${EP_ICON_TRASH}</button>
            ` : (x.kode_rekening ? '' : '<span style="color:var(--text-secondary,#64748b);font-size:12px">-</span>')}
          </td>
        </tr>`;
      }).join('') : `<tr class="empty-row"><td colspan="9">${search ? 'Tidak ada komponen yang cocok' : 'Belum ada data - impor dari Excel dulu'}</td></tr>`;
    }
    renderShPagination(d.total || 0);
  } catch (err) {
    if (tb) tb.innerHTML = `<tr class="empty-row"><td colspan="9">Gagal memuat</td></tr>`;
    toast(err.message, 'error');
  }
  epLoadStandarHargaCounts();
  // Sembunyikan aksi kelola (Tambah/Impor) buat non-admin, biar jelas ini cuma buat lihat referensi.
  const isAdminNow = _user.is_admin || (typeof hasAccess === 'function' && hasAccess('eplanning.admin'));
  const btnImp = document.getElementById('btnImporStandarHarga');
  const btnAdd = document.getElementById('btnTambahStandarHarga');
  if (btnImp) btnImp.style.display = isAdminNow ? '' : 'none';
  if (btnAdd) btnAdd.style.display = isAdminNow ? '' : 'none';
}

function openStandarHargaModal(id = null) {
  document.getElementById('epShId').value = id || '';
  document.getElementById('epShKategori').value = _epShKategori;
  document.getElementById('epShTahun').value = _epTahunAktif || '';
  document.getElementById('epShKodeKelompok').value = '';
  document.getElementById('epShUraianKelompok').value = '';
  document.getElementById('epShKodeBarang').value = '';
  document.getElementById('epShIdStandar').value = '';
  document.getElementById('epShUraian').value = '';
  document.getElementById('epShSpesifikasi').value = '';
  document.getElementById('epShSatuan').value = '';
  document.getElementById('epShHarga').value = '';
  document.getElementById('epShTkdn').value = '';
  _epShRekeningMulti.setValue('');
  document.getElementById('epShKodeRekeningInput').value = '';
  document.getElementById('epShAktif').checked = true;
  document.getElementById('epShAktifLabel').textContent = 'Aktif';
  document.getElementById('modalStandarHargaTitle').textContent = id ? 'Edit Standar Harga' : 'Tambah Standar Harga';
  if (id) {
    const x = _epShCache[id];
    if (x) {
      document.getElementById('epShKategori').value = x.kategori;
      document.getElementById('epShTahun').value = x.tahun || 2027;
      document.getElementById('epShKodeKelompok').value = x.kode_kelompok_barang || '';
      document.getElementById('epShUraianKelompok').value = x.uraian_kelompok_barang || '';
      document.getElementById('epShKodeBarang').value = x.kode_barang || '';
      document.getElementById('epShIdStandar').value = x.id_standar_harga || '';
      document.getElementById('epShUraian').value = x.uraian_barang || '';
      document.getElementById('epShSpesifikasi').value = x.spesifikasi || '';
      document.getElementById('epShSatuan').value = x.satuan || '';
      document.getElementById('epShHarga').value = x.harga_satuan || '';
      document.getElementById('epShTkdn').value = x.tkdn != null ? x.tkdn : '';
      _epShRekeningMulti.setValue(x.kode_rekening || '');
      document.getElementById('epShAktif').checked = !!x.aktif;
      document.getElementById('epShAktifLabel').textContent = x.aktif ? 'Aktif' : 'Nonaktif';
    }
  }
  openModal('modalStandarHarga');
}

async function epSaveStandarHarga() {
  const id = document.getElementById('epShId').value || null;
  const body = {
    kategori: document.getElementById('epShKategori').value,
    tahun: document.getElementById('epShTahun').value,
    kode_kelompok_barang: document.getElementById('epShKodeKelompok').value.trim(),
    uraian_kelompok_barang: document.getElementById('epShUraianKelompok').value.trim(),
    kode_barang: document.getElementById('epShKodeBarang').value.trim(),
    id_standar_harga: document.getElementById('epShIdStandar').value.trim(),
    uraian_barang: document.getElementById('epShUraian').value.trim(),
    spesifikasi: document.getElementById('epShSpesifikasi').value.trim(),
    satuan: document.getElementById('epShSatuan').value.trim(),
    harga_satuan: document.getElementById('epShHarga').value,
    tkdn: document.getElementById('epShTkdn').value.trim(),
    kode_rekening: _epShRekeningMulti.getValue(),
    aktif: document.getElementById('epShAktif').checked,
  };
  if (!body.uraian_barang || !body.harga_satuan) { toast('Uraian barang dan harga satuan wajib diisi', 'error'); return; }
  if (!id && !body.tahun) { toast('Tahun wajib diisi', 'error'); return; }
  const btn = document.getElementById('btnSaveStandarHarga');
  btn.disabled = true;
  try {
    const method = id ? 'PUT' : 'POST';
    const url = id ? `/api/eplanning/standarharga/${id}` : '/api/eplanning/standarharga';
    const r = await fetch(url, { method, headers: { ...authHeaders(), 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    const d = await r.json();
    if (!r.ok) throw new Error(d.error || 'Gagal menyimpan');
    toast(id ? 'Data diperbarui' : 'Data ditambahkan', 'success');
    closeModal('modalStandarHarga');
    epLoadStandarHarga(_epShPage);
  } catch (err) { toast(err.message, 'error'); }
  finally { btn.disabled = false; }
}

async function epToggleStandarHarga(id, currentAktif) {
  try {
    const r = await fetch(`/api/eplanning/standarharga/${id}`, {
      method: 'PUT', headers: { ...authHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ aktif: !currentAktif }),
    });
    const d = await r.json();
    if (!r.ok) throw new Error(d.error || 'Gagal mengubah status');
    toast(!currentAktif ? 'Diaktifkan' : 'Dinonaktifkan', 'success');
    epLoadStandarHarga(_epShPage);
  } catch (err) { toast(err.message, 'error'); }
}

async function epDeleteStandarHarga(id) {
  const x = _epShCache[id];
  const ok = await showConfirm({
    title: 'Hapus Standar Harga',
    msg: `"<b>${esc(x?.uraian_barang || '')}</b>" akan dihapus permanen.`,
    okText: 'Ya, Hapus', icon: 'trash',
  });
  if (!ok) return;
  await fetch(`/api/eplanning/standarharga/${id}`, { method: 'DELETE', headers: authHeaders() });
  toast('Data dihapus');
  epLoadStandarHarga(_epShPage);
}

// ── Impor Excel (export SIPD apa adanya) ────────────────────────────────
// Header kolom export SIPD (urutan tetap, tapi kita cocokkan by nama biar aman
// kalau suatu saat urutannya beda): KODE KELOMPOK BARANG, URAIAN KELOMPOK BARANG,
// ID STANDAR HARGA, KODE BARANG, URAIAN BARANG, SPESIFIKASI, SATUAN, HARGA SATUAN,
// KODE REKENING.
const EP_SH_COLMAP = {
  'KODE KELOMPOK BARANG': 'kode_kelompok_barang',
  'URAIAN KELOMPOK BARANG': 'uraian_kelompok_barang',
  'ID STANDAR HARGA': 'id_standar_harga',
  'KODE BARANG': 'kode_barang',
  'URAIAN BARANG': 'uraian_barang',
  'SPESIFIKASI': 'spesifikasi',
  'SATUAN': 'satuan',
  'HARGA SATUAN': 'harga_satuan',
  'KODE REKENING': 'kode_rekening',
  'TKDN': 'tkdn',
};

function openImporStandarHargaModal() {
  document.getElementById('epImpKategori').value = _epShKategori;
  if (typeof syncCustomSelect === 'function') syncCustomSelect('epImpKategori');
  document.getElementById('epImpTahun').value = _epTahunAktif || '';
  document.getElementById('epImpFile').value = '';
  epImpResetFileText();
  document.getElementById('epImpReplace').checked = true;
  document.getElementById('epImpProgress').style.display = 'none';
  document.getElementById('epImpProgressBar').style.width = '0%';
  openModal('modalImporStandarHarga');
}

function epImpResetFileText() {
  const t = document.getElementById('epImpFileText');
  if (t) t.innerHTML = '<strong>Klik atau drag &amp; drop</strong> file di sini';
}

function epImpFileChange(input) {
  const t = document.getElementById('epImpFileText');
  if (t) t.innerHTML = input.files?.[0] ? `<strong>${esc(input.files[0].name)}</strong>` : '<strong>Klik atau drag &amp; drop</strong> file di sini';
}

function epImpFileDragOver(e) {
  e.preventDefault();
  document.getElementById('epImpUploadArea')?.classList.add('drag-over');
}

function epImpFileDragLeave(e) {
  e.preventDefault();
  document.getElementById('epImpUploadArea')?.classList.remove('drag-over');
}

function epImpFileDrop(e) {
  e.preventDefault();
  document.getElementById('epImpUploadArea')?.classList.remove('drag-over');
  const input = document.getElementById('epImpFile');
  if (e.dataTransfer?.files?.length) {
    input.files = e.dataTransfer.files;
    epImpFileChange(input);
  }
}

function _epParseStandarHargaSheet(arrayBuffer) {
  const wb = XLSX.read(arrayBuffer, { type: 'array' });
  const ws = wb.Sheets[wb.SheetNames[0]];
  const raw = XLSX.utils.sheet_to_json(ws, { header: 1, raw: true, defval: '' });
  if (!raw.length) return [];
  const headerRow = raw[0].map(h => String(h || '').trim().toUpperCase());
  const idxMap = {};
  headerRow.forEach((h, i) => { if (EP_SH_COLMAP[h]) idxMap[EP_SH_COLMAP[h]] = i; });
  const rows = [];
  for (let i = 1; i < raw.length; i++) {
    const r = raw[i];
    if (!r || !r.length) continue;
    const uraian = idxMap.uraian_barang != null ? String(r[idxMap.uraian_barang] ?? '').trim() : '';
    if (!uraian) continue; // baris kosong / header kelompok tanpa item, skip
    rows.push({
      kode_kelompok_barang: idxMap.kode_kelompok_barang != null ? String(r[idxMap.kode_kelompok_barang] ?? '').trim() : '',
      uraian_kelompok_barang: idxMap.uraian_kelompok_barang != null ? String(r[idxMap.uraian_kelompok_barang] ?? '').trim() : '',
      id_standar_harga: idxMap.id_standar_harga != null ? String(r[idxMap.id_standar_harga] ?? '').trim() : '',
      kode_barang: idxMap.kode_barang != null ? String(r[idxMap.kode_barang] ?? '').trim() : '',
      uraian_barang: uraian,
      spesifikasi: idxMap.spesifikasi != null ? String(r[idxMap.spesifikasi] ?? '').trim() : '',
      satuan: idxMap.satuan != null ? String(r[idxMap.satuan] ?? '').trim() : '',
      harga_satuan: idxMap.harga_satuan != null ? (Number(r[idxMap.harga_satuan]) || 0) : 0,
      kode_rekening: idxMap.kode_rekening != null ? String(r[idxMap.kode_rekening] ?? '').trim() : '',
      // TKDN di export SIPD biasa ditulis kayak "0%" / "35%" - kita bersihin simbol %-nya,
      // atau kalau sel-nya format persen bawaan Excel, angkanya udah desimal (0.35) jadi dikali 100.
      tkdn: (() => {
        if (idxMap.tkdn == null) return null;
        let v = r[idxMap.tkdn];
        if (v === '' || v == null) return null;
        if (typeof v === 'string') v = v.replace('%', '').trim();
        let n = Number(v);
        if (!isFinite(n)) return null;
        if (n > 0 && n <= 1) n = n * 100; // sel format persen Excel (0.35 = 35%)
        return n;
      })(),
    });
  }
  return rows;
}

async function epSubmitImporStandarHarga() {
  const kategori = document.getElementById('epImpKategori').value;
  const tahun = parseInt(document.getElementById('epImpTahun').value) || null;
  const fileInput = document.getElementById('epImpFile');
  const file = fileInput.files && fileInput.files[0];
  const replace = document.getElementById('epImpReplace').checked;
  if (!tahun) { toast('Tahun anggaran wajib diisi', 'error'); return; }
  if (!file) { toast('Pilih file Excel dulu', 'error'); return; }

  const btn = document.getElementById('btnMulaiImporSh');
  const btnBatal = document.getElementById('btnBatalImporSh');
  const progWrap = document.getElementById('epImpProgress');
  const progBar = document.getElementById('epImpProgressBar');
  const progText = document.getElementById('epImpProgressText');
  btn.disabled = true; btnBatal.disabled = true;
  progWrap.style.display = 'block';
  progText.textContent = 'Membaca file…';

  try {
    const buf = await file.arrayBuffer();
    const rows = _epParseStandarHargaSheet(buf);
    if (!rows.length) throw new Error('Tidak ada baris data yang bisa dibaca dari file ini');

    if (replace) {
      progText.textContent = `Menghapus data lama kategori ${kategori} tahun ${tahun}…`;
      await fetch(`/api/eplanning/standarharga?kategori=${encodeURIComponent(kategori)}&tahun=${tahun}`, { method: 'DELETE', headers: authHeaders() });
    }

    const CHUNK = 500;
    const totalChunks = Math.ceil(rows.length / CHUNK);
    let inserted = 0;
    let satuanAdded = 0;
    for (let c = 0; c < totalChunks; c++) {
      const chunk = rows.slice(c * CHUNK, (c + 1) * CHUNK);
      const r = await fetch('/api/eplanning/standarharga/import', {
        method: 'POST', headers: { ...authHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ kategori, tahun, rows: chunk }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || `Gagal impor batch ke-${c + 1}`);
      inserted += chunk.length;
      satuanAdded += d.satuanAdded || 0;
      const pct = Math.round(((c + 1) / totalChunks) * 100);
      progBar.style.width = pct + '%';
      progText.textContent = `Mengimpor… ${inserted} / ${rows.length} baris`;
    }
    toast(`Impor selesai - ${inserted} baris ${kategori} tahun ${tahun} tersimpan${satuanAdded ? `, ${satuanAdded} satuan baru ditambahkan ke master` : ''}`, 'success');
    closeModal('modalImporStandarHarga');
    _epTahunLoaded = false; 
    if (_epShKategori === kategori) epLoadStandarHarga(1); else epShTabSwitch(kategori);
  } catch (err) {
    toast(err.message, 'error');
  } finally {
    btn.disabled = false; btnBatal.disabled = false;
  }
}
