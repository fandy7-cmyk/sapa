'use strict';
/* Info Popup: halaman admin, popup untuk user, dan lonceng di topbar. (PRD "Sistem Notifikasi Info Popup SAPA")
   Semua markup baru memakai event delegation (data-action), tanpa inline handler.
   Global yang dipakai dari app.js: authHeaders, toast, esc, openModal, closeModal, showConfirm, renderPagination,
   debounceInput, MENUS, navigateTo, loadDashboard, hasAccess, _user. */
(function () {

/* ══ Util ════════════════════════════════════════════════════════════════ */
const TZ = 'Asia/Makassar';   // WITA, tanpa DST
const MAX_POPUP_PER_KEJADIAN = 5;                 // B4
const POLL_MS = 5 * 60 * 1000;                    // D1
const FETCH_TIMEOUT_MS = 8000;                    // D3
const SVG = (inner, w = 14) => `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${w}" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${inner}</svg>`;
const IC = {
  info:       (w) => SVG('<path d="M18 8a3 3 0 0 1 0 6"/><path d="M10 8v11a1 1 0 0 1-1 1H8a1 1 0 0 1-1-1v-5"/><path d="M12 8h0l4.524-3.77a.9.9 0 0 1 1.476.692v12.156a.9.9 0 0 1-1.476.692L12 14H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1h8"/>', w),
  penting:    (w) => SVG('<path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>', w),
  peringatan: (w) => SVG('<path d="M10 5a2 2 0 1 1 4 0a7 7 0 0 1 4 6v3a4 4 0 0 0 2 3H4a4 4 0 0 0 2-3v-3a7 7 0 0 1 4-6"/><path d="M9 17v1a3 3 0 0 0 6 0v-1"/><path d="M21 6.727a11.05 11.05 0 0 0-2.794-3.727"/><path d="M3 6.727a11.05 11.05 0 0 1 2.792-3.727"/>', w),
  hide:       (w) => SVG('<path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><path d="M1 1l22 22"/>', w),
  edit:       (w) => SVG('<path d="M11 5H6a2 2 0 0 0-2 2v11a2 2 0 0 0 2 2h11a2 2 0 0 0 2-2v-5"/><path d="M18.586 2.586a2 2 0 1 1 2.828 2.828L11.828 15 9 16l1-2.828 8.586-8.586z"/>', w),
  trash:      (w) => SVG('<polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6m4-6v6"/><path d="M9 6V4h6v2"/>', w),
  users:      (w) => SVG('<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>', w),
  eye:        (w) => SVG('<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>', w),
  power:      (w) => SVG('<path d="M18.36 6.64a9 9 0 1 1-12.73 0"/><line x1="12" y1="2" x2="12" y2="12"/>', w),
  ok:         (w) => SVG('<path d="M5 13l4 4L19 7"/>', w),
  plus:       (w) => SVG('<path d="M12 5v14M5 12h14"/>', w),
  ext:        (w) => SVG('<path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><path d="M15 3h6v6"/><path d="M10 14L21 3"/>', w),
  close:      (w) => SVG('<path d="M6 18L18 6M6 6l12 12"/>', w),
  arrow:      (w) => SVG('<path d="M5 12h14M13 6l6 6-6 6"/>', w),
  mail:       (w) => SVG('<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 7l9 6 9-6"/>', w),
};
// Ikon tombol (13px, stroke 2.5, di kiri teks) - pola yang sama dengan tombol lain di app.html.
const BI = (inner) => `<svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="margin-right:5px;vertical-align:-2px" aria-hidden="true">${inner}</svg>`;
const BIC = {
  ok:    BI('<path d="M5 13l4 4L19 7"/>'),
  close: BI('<path d="M6 18L18 6M6 6l12 12"/>'),
  eye:   BI('<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>'),
};
const TIPE = {
  info:       { label: 'Info',       cls: 'ip-t-info' },
  penting:    { label: 'Penting',    cls: 'ip-t-penting' },
  peringatan: { label: 'Peringatan', cls: 'ip-t-peringatan' },
};
const tipeOf = (t) => TIPE[t] ? t : 'info';

const fmtWaktu = (iso) => {
  if (!iso) return '-';
  const d = new Date(iso);
  if (isNaN(d)) return '-';
  const t = d.toLocaleString('id-ID', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false, timeZone: TZ });
  return t.replace(/\./g, ':') + ' WITA';
};
const fmtTgl = (iso) => iso ? new Date(iso).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric', timeZone: TZ }) : '-';
// <input type="datetime-local"> <-> ISO. Nilai input selalu dibaca sebagai WITA.
function isoKeInput(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d)) return '';
  const p = new Intl.DateTimeFormat('sv-SE', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false }).format(d);
  return p.replace(' ', 'T');
}
function inputKeIso(v) {
  if (!v) return null;
  const d = new Date(v + ':00+08:00');
  return isNaN(d) ? null : d.toISOString();
}
// Picker tanggal + jam custom (DatePicker/TimePicker dari app.js) menggantikan <input type="datetime-local">.
// Nilai gabungannya tetap ditulis ke input hidden #ipFormMulai / #ipFormBerakhir dalam format "YYYY-MM-DDTHH:MM",
// jadi isoKeInput/inputKeIso, bacaForm, dan validasiForm tidak berubah.
let _pickerWaktuSiap = false;
function sinkronWaktu(id) {
  const tgl = dpGetValue(id + 'Tgl');
  const jam = tpGetValue(id + 'Jam') || '00:00';
  $(id).value = tgl ? `${tgl}T${jam}` : '';
}
function siapkanPickerWaktu() {
  if (_pickerWaktuSiap) return;
  _pickerWaktuSiap = true;
  ['ipFormMulai', 'ipFormBerakhir'].forEach((id) => {
    initDatePicker(id + 'Tgl', { placeholder: 'Pilih tanggal', onChange: () => sinkronWaktu(id) });
    initTimePicker(id + 'Jam');
    $(id + 'Jam').addEventListener('change', () => sinkronWaktu(id));
  });
}
function isiWaktu(id, iso, jamDefault) {
  const v = isoKeInput(iso);
  dpSetValue(id + 'Tgl', v ? v.slice(0, 10) : null);
  tpSetValue(id + 'Jam', v ? v.slice(11, 16) : jamDefault);
  sinkronWaktu(id);
}
const stripHtml = (html) => { const t = document.createElement('div'); t.innerHTML = html || ''; return (t.textContent || '').replace(/\s+/g, ' ').trim(); };
const $ = (id) => document.getElementById(id);

// Sanitasi sisi klien (pertahanan berlapis; server sudah menyanitasi isi). Dipakai untuk semua isi popup,
// termasuk Pratinjau yang berasal dari editor lokal admin.
const OK_TAG = new Set(['P', 'BR', 'STRONG', 'B', 'EM', 'I', 'U', 'OL', 'UL', 'LI', 'A', 'H3', 'H4']);
const DROP_TAG = new Set(['SCRIPT', 'STYLE', 'IFRAME', 'OBJECT', 'EMBED', 'SVG', 'MATH', 'TEMPLATE', 'NOSCRIPT', 'LINK', 'META']);
function bersihkanHtml(html) {
  const doc = new DOMParser().parseFromString('<body>' + (html || '') + '</body>', 'text/html');
  (function walk(node) {
    [...node.childNodes].forEach((c) => {
      if (c.nodeType === 3) return;
      if (c.nodeType !== 1 || DROP_TAG.has(c.tagName)) { c.remove(); return; }
      walk(c);
      if (!OK_TAG.has(c.tagName)) { c.replaceWith(...c.childNodes); return; }
      [...c.attributes].forEach((a) => {
        const nama = a.name.toLowerCase();
        const aman = (c.tagName === 'A' && nama === 'href' && /^(https?:|mailto:)/i.test(a.value.replace(/[\u0000-\u0020]/g, '')))
          || (nama === 'class' && /^ql-indent-[1-8]$/.test(a.value));
        if (!aman) c.removeAttribute(a.name);
      });
    });
  })(doc.body);
  return doc.body.innerHTML;
}

// Pemanggilan API admin (error dilempar agar bisa ditampilkan lewat toast).
async function api(path, { method = 'GET', body } = {}) {
  const r = await fetch('/api/info-popup' + path, { method, headers: authHeaders(), body: body ? JSON.stringify(body) : undefined });
  let data = {};
  try { data = await r.json(); } catch { /* respons kosong */ }
  if (!r.ok) throw new Error(data.error || ('Gagal (' + r.status + ')'));
  return data;
}

/* ══ Daftar modul & halaman (dari MENUS, sama dengan kunci navigateTo) ═════ */
function daftarModul() {
  const out = [{ id: 'semua', label: 'Semua modul' }, { id: 'dashboard', label: 'Dashboard' }];
  (typeof MENUS !== 'undefined' ? MENUS : []).forEach((g) => out.push({ id: g.id, label: g.label }));
  return out;
}
function daftarHalaman() {
  const out = [{ id: 'dashboard', label: 'Dashboard' }];
  (typeof MENUS !== 'undefined' ? MENUS : []).forEach((g) => (g.children || []).forEach((c) => {
    if (c.children) c.children.forEach((gc) => gc.page && out.push({ id: gc.id, label: `${g.label} › ${c.label} › ${gc.label}` }));
    else if (c.page) out.push({ id: c.id, label: `${g.label} › ${c.label}` });
  }));
  return out;
}
const bolehAkses = (c) => (!c.adminOnly || _user.is_admin) && (!c.key || hasAccess(c.key)) && (!c.showIf || c.showIf());
function bukaHalaman(id) {
  if (id === 'dashboard') { navigateTo('dashboard', 'Dashboard Utama', loadDashboard); return true; }
  for (const g of MENUS) {
    if (g.adminOnly && !_user.is_admin) continue;
    for (const c of (g.children || [])) {
      if (c.children) {
        if (c.adminOnly && !_user.is_admin) continue;
        for (const gc of c.children) {
          if (gc.id === id && gc.page && bolehAkses(gc)) { navigateTo(gc.id, gc.label, gc.loader, g.id, gc.page, c.id); return true; }
        }
      } else if (c.id === id && c.page && bolehAkses(c)) { navigateTo(c.id, c.label, c.loader, g.id, c.page); return true; }
    }
  }
  return false;
}

/* ══ ADMIN: daftar ═══════════════════════════════════════════════════════ */
let _all = [];
let _page = 1;
const PER_PAGE = 15;
const STATUS_LABEL = { berlangsung: ['Aktif', 'badge-hijau'], terjadwal: ['Terjadwal', 'badge-biru'], berakhir: ['Berakhir', 'badge-abu'], nonaktif: ['Nonaktif', 'badge-abu'] };

async function loadInfoPopup({ keepPage = false } = {}) {
  const tb0 = $('ipTableBody');
  if (tb0) tb0.innerHTML = `<tr class="empty-row"><td colspan="7"><span class="btn-spin" style="width:11px;height:11px;vertical-align:-1px;margin-right:6px"></span>Memuat data...</td></tr>`;
  try {
    muatAmbang();
    const { info } = await api('');
    _all = info || [];
    if (!keepPage) _page = 1;
    renderTable();
  } catch (err) {
    console.error('[loadInfoPopup]', err);
    const tb = $('ipTableBody');
    if (tb) tb.innerHTML = `<tr class="empty-row"><td colspan="7">Gagal memuat data</td></tr>`;
  }
}

function renderTable() {
  const tb = $('ipTableBody');
  if (!tb) return;
  const q = ($('ipSearch')?.value || '').toLowerCase();
  const ft = $('ipFilterTipe')?.value || '';
  const fs = $('ipFilterStatus')?.value || '';
  const data = _all.filter((p) =>
    (!q || p.judul.toLowerCase().includes(q) || stripHtml(p.isi).toLowerCase().includes(q)) &&
    (!ft || p.tipe === ft) && (!fs || p.status_jadwal === fs));

  const total = data.length;
  const pages = Math.max(1, Math.ceil(total / PER_PAGE));
  if (_page > pages) _page = pages;
  const rows = data.slice((_page - 1) * PER_PAGE, _page * PER_PAGE);
  const modulLabel = Object.fromEntries(daftarModul().map((m) => [m.id, m.label]));

  if (!rows.length) {
    tb.innerHTML = `<tr class="empty-row"><td colspan="7">Tidak ada info popup</td></tr>`;
  } else {
    tb.innerHTML = rows.map((p) => {
      const t = tipeOf(p.tipe);
      const [stLabel, stCls] = STATUS_LABEL[p.status_jadwal] || ['-', 'badge-abu'];
      const penerima = p.penerima_tipe === 'semua' ? 'Semua user'
        : p.penerima_tipe === 'bidang' ? `${(p.penerima_ids || []).length} Unit Kerja` : `${(p.penerima_ids || []).length} user`;
      const jadwal = `${fmtWaktu(p.mulai_at)}<br><span class="ip-muted">s.d. ${p.berakhir_at ? fmtWaktu(p.berakhir_at) : 'tanpa batas'}</span>`;
      return `<tr>
        <td style="max-width:240px">
          <div style="font-weight:600;color:var(--teks)">${esc(p.judul)}</div>
          <div class="ip-muted ip-clip">${esc(stripHtml(p.isi))}</div>
        </td>
        <td style="text-align:center"><div style="display:inline-flex;align-items:center;justify-content:center;gap:4px;white-space:nowrap"><span class="ip-badge ${TIPE[t].cls}">${IC[t](12)} ${TIPE[t].label}</span>${p.wajib_dibaca ? '<span class="ip-badge ip-t-wajib" data-tip="Wajib dibaca">Wajib</span>' : ''}</div></td>
        <td style="font-size:.8rem;text-align:center">${esc(penerima)}<br><span class="ip-muted">${esc(modulLabel[p.modul_target] || p.modul_target)}</span></td>
        <td style="font-size:.78rem;white-space:nowrap;text-align:center">${jadwal}</td>
        <td style="text-align:center"><span class="badge ${stCls}">${stLabel}</span></td>
        <td style="text-align:center" data-action="ip-detail" data-id="${p.id}">${p.jml_dimengerti} Oke, ${p.jml_disembunyikan} Sembunyi, ${p.jml_belum} Belum (dari ${p.jml_penerima})</td>
        <td>
          <div style="display:flex;gap:6px;justify-content:center">
            <button class="btn btn-ghost btn-sm" data-action="ip-edit" data-id="${p.id}" data-tip="Edit" aria-label="Edit">${IC.edit()}</button>
            <button class="btn btn-ghost btn-sm" data-action="ip-toggle" data-id="${p.id}" data-tip="${p.aktif ? 'Nonaktifkan' : 'Aktifkan'}" aria-label="${p.aktif ? 'Nonaktifkan' : 'Aktifkan'}">${p.aktif ? IC.power() : IC.ok()}</button>
            <button class="btn-hapus" data-action="ip-delete" data-id="${p.id}" data-tip="Hapus" aria-label="Hapus">${IC.trash()}</button>
          </div>
        </td></tr>`;
    }).join('');
  }
  renderPagination('ipPagination', total, _page, PER_PAGE, (p) => { _page = p; renderTable(); });
}

async function toggleAktif(id) {
  const p = _all.find((x) => x.id === id);
  if (!p) return;
  try {
    await api('/' + id, { method: 'PUT', body: { aktif: !p.aktif } });
    toast(p.aktif ? 'Info dinonaktifkan' : 'Info diaktifkan', 'success');
    await loadInfoPopup({ keepPage: true });
    infoPopupCheck('admin');
  } catch (e) { toast(e.message || 'Gagal mengubah status', 'error'); }
}
async function hapusInfo(id) {
  const ok = await showConfirm({ title: 'Hapus Info Popup', msg: 'Info ini tidak akan tampil lagi ke user. Data respons tetap tersimpan.', okText: 'Ya, Hapus' });
  if (!ok) return;
  try {
    await api('/' + id, { method: 'DELETE' });
    toast('Info dihapus', 'success');
    await loadInfoPopup({ keepPage: true });
    infoPopupCheck('admin');
  } catch (e) { toast(e.message || 'Gagal menghapus', 'error'); }
}

/* ══ ADMIN: detail penerima (A12) ═════════════════════════════════════════ */
let _penerima = [];
async function bukaDetail(id) {
  const body = $('ipDetailBody');
  $('ipDetailTitle').textContent = 'Penerima Info';
  body.innerHTML = `<div class="ip-muted" style="padding:20px;text-align:center"><span class="btn-spin" style="width:11px;height:11px;vertical-align:-1px;margin-right:6px"></span>Memuat...</div>`;
  openModal('modalInfoPopupDetail');
  try {
    const d = await api(`/${id}/penerima`);
    _penerima = d.penerima || [];
    $('ipDetailTitle').textContent = d.info.judul;
    renderDetail('');
  } catch (e) { body.innerHTML = `<div class="ip-muted" style="padding:20px;text-align:center">${esc(e.message || 'Gagal memuat penerima')}</div>`; }
}
function renderDetail(filter) {
  const n = { belum: 0, dimengerti: 0, disembunyikan: 0 };
  _penerima.forEach((p) => { n[p.status] = (n[p.status] || 0) + 1; });
  const tab = (key, label, count) => `<button type="button" class="ip-tab${filter === key ? ' active' : ''}" data-action="ip-detail-filter" data-filter="${key}">${label} <b>${count}</b></button>`;
  const list = filter ? _penerima.filter((p) => p.status === filter) : _penerima;
  const stBadge = { belum: ['Belum merespons', 'ip-s-baru'], dimengerti: ['Dimengerti', 'ip-s-ok'], disembunyikan: ['Disembunyikan', 'ip-s-sembunyi'] };
  $('ipDetailBody').innerHTML = `
    <div class="ip-tabs">${tab('', 'Semua', _penerima.length)}${tab('belum', 'Belum', n.belum)}${tab('dimengerti', 'Dimengerti', n.dimengerti)}${tab('disembunyikan', 'Disembunyikan', n.disembunyikan)}</div>
    <div style="overflow:auto;max-height:52vh"><table class="freeze-table"><thead><tr><th>Nama</th><th>Unit Kerja</th><th>Status</th><th>Waktu</th></tr></thead><tbody>
    ${list.length ? list.map((p) => `<tr><td>${esc(p.nama)}</td><td style="font-size:.8rem">${esc(p.bidang_nama || '-')}</td>
      <td><span class="ip-pill ${stBadge[p.status][1]}" style="font-size:.7rem;white-space:nowrap">${stBadge[p.status][0]}</span></td>
      <td style="font-size:.78rem;white-space:nowrap">${p.waktu ? fmtWaktu(p.waktu) : '-'}</td></tr>`).join('')
      : `<tr class="empty-row"><td colspan="4">Tidak ada data</td></tr>`}
    </tbody></table></div>`;
}

/* ══ ADMIN: form tambah/ubah ══════════════════════════════════════════════ */
let _quill = null;
let _aksi = [];
let _ref = null;                       // { bidang: [], users: [] } dimuat sekali saat form pertama dibuka
const _sel = { bidang: new Set(), user: new Set() };

function initQuill() {
  if (_quill || typeof Quill === 'undefined') return;
  _quill = new Quill('#ipEditor', {
    theme: 'snow',
    placeholder: 'Tulis isi info...',
    modules: { toolbar: [[{ header: [3, false] }], ['bold', 'italic', 'underline'], [{ list: 'ordered' }, { list: 'bullet' }], [{ indent: '-1' }, { indent: '+1' }], ['link'], ['clean']] },
  });
}
async function muatReferensi() {
  if (_ref) return _ref;
  const [b, u] = await Promise.allSettled([
    fetch('/api/bidang', { headers: authHeaders() }).then((r) => r.json()),
    fetch('/api/users', { headers: authHeaders() }).then((r) => r.json()),
  ]);
  _ref = {
    bidang: (b.value?.bidang || []),
    users: (u.value?.users || []).filter((x) => x.is_active !== false),
  };
  return _ref;
}
function setOpsi(selectId, html, value) {
  const el = $(selectId);
  if (!el) return;
  el.innerHTML = html;
  el.value = value;
  if (typeof syncCustomSelect === 'function') syncCustomSelect(selectId);
}
function renderPicker() {
  const tipe = $('ipFormPenerimaTipe').value;
  $('ipPickBidangWrap').style.display = tipe === 'bidang' ? '' : 'none';
  $('ipPickUserWrap').style.display = tipe === 'user' ? '' : 'none';
  if (!_ref) return;
  if (tipe === 'bidang') {
    $('ipPickBidang').innerHTML = _ref.bidang.map((b) =>
      `<label class="ip-check"><input type="checkbox" data-ip-pick="bidang" value="${b.id}"${_sel.bidang.has(b.id) ? ' checked' : ''}><span>${esc(b.nama)}</span></label>`).join('')
      || '<div class="ip-muted">Belum ada Unit Kerja</div>';
    $('ipPickBidangCount').textContent = _sel.bidang.size + ' dipilih';
  } else if (tipe === 'user') {
    const q = ($('ipPickUserSearch').value || '').toLowerCase();
    const list = _ref.users.filter((u) => !q || (u.nama || '').toLowerCase().includes(q) || (u.bidang_singkatan || u.bidang_nama || '').toLowerCase().includes(q));
    $('ipPickUser').innerHTML = list.map((u) =>
      `<label class="ip-check"><input type="checkbox" data-ip-pick="user" value="${u.id}"${_sel.user.has(u.id) ? ' checked' : ''}><span>${esc(u.nama)}<small class="ip-muted"> ${esc(u.bidang_singkatan || u.bidang_nama || '')}</small></span></label>`).join('')
      || '<div class="ip-muted">Tidak ada user</div>';
    $('ipPickUserCount').textContent = _sel.user.size + ' dipilih';
  }
}
function renderAksi() {
  const wrap = $('ipAksiList');
  const halaman = daftarHalaman();
  // Panel dropdown custom di-append ke <body>; buang yang lama biar gak numpuk tiap render ulang.
  wrap.querySelectorAll('.select-wrap').forEach((w) => { if (w._cselPanel) w._cselPanel.remove(); });
  wrap.innerHTML = _aksi.length ? _aksi.map((a, i) => `
    <div class="ip-aksi-row">
      <input type="text" data-ip-aksi="${i}:label" value="${esc(a.label)}" maxlength="40" placeholder="Label tombol (mis. Buka e-Planning)" aria-label="Label tombol ${i + 1}">
      <div class="select-wrap"><select data-ip-aksi="${i}:tipe" data-searchable="0" aria-label="Jenis tujuan ${i + 1}">
        <option value="halaman"${a.tipe === 'halaman' ? ' selected' : ''}>Halaman SAPA</option>
        <option value="link"${a.tipe === 'link' ? ' selected' : ''}>Tautan luar</option>
      </select></div>
      ${a.tipe === 'link'
        ? `<input type="text" data-ip-aksi="${i}:tujuan" value="${esc(a.tujuan)}" placeholder="https://..." aria-label="Tautan ${i + 1}">`
        : `<div class="select-wrap"><select data-ip-aksi="${i}:tujuan" data-placeholder="Pilih halaman..." aria-label="Halaman ${i + 1}"><option value="">Pilih halaman...</option>${halaman.map((h) => `<option value="${esc(h.id)}"${a.tujuan === h.id ? ' selected' : ''}>${esc(h.label)}</option>`).join('')}</select></div>`}
      <button type="button" class="btn-hapus" data-tip="Hapus" data-action="ip-aksi-hapus" data-i="${i}" aria-label="Hapus tombol ${i + 1}">${IC.trash(14)}</button>
    </div>`).join('') : `<div class="ip-muted" style="font-size:.78rem">Belum ada tombol aksi.</div>`;
  $('ipAksiTambah').style.display = _aksi.length >= 2 ? 'none' : '';
  if (typeof initCustomSelects === 'function') initCustomSelects();
}

async function bukaForm(id = null) {
  initQuill();
  const p = id ? _all.find((x) => x.id === id) : null;
  $('ipFormId').value = p ? p.id : '';
  $('ipFormTitle').textContent = p ? 'Edit Info Popup' : 'Tambah Info Popup';
  $('ipFormJudul').value = p ? p.judul : '';
  if (_quill) { _quill.setText(''); if (p) _quill.clipboard.dangerouslyPasteHTML(p.isi || ''); }
  setOpsi('ipFormTipe', ['info', 'penting', 'peringatan'].map((t) => `<option value="${t}">${TIPE[t].label}</option>`).join(''), p ? p.tipe : 'info');
  setOpsi('ipFormPenerimaTipe', '<option value="semua">Semua user</option><option value="bidang">Per Unit Kerja</option><option value="user">User tertentu</option>', p ? p.penerima_tipe : 'semua');
  setOpsi('ipFormModul', daftarModul().map((m) => `<option value="${esc(m.id)}">${esc(m.label)}</option>`).join(''), p ? p.modul_target : 'semua');
  setOpsi('ipFormAktif', '<option value="1">Aktif</option><option value="0">Nonaktif</option>', p && !p.aktif ? '0' : '1');
  siapkanPickerWaktu();
  isiWaktu('ipFormMulai', p ? p.mulai_at : new Date().toISOString(), '00:00');
  isiWaktu('ipFormBerakhir', p ? p.berakhir_at : null, '23:59');
  $('ipFormWajib').checked = !!(p && p.wajib_dibaca);
  $('ipFormUlang').checked = false;
  $('ipFormUlangWrap').style.display = p ? '' : 'none';
  _aksi = p && Array.isArray(p.aksi) ? p.aksi.map((a) => ({ label: a.label || '', tipe: a.tipe === 'link' ? 'link' : 'halaman', tujuan: a.tujuan || '' })) : [];
  _sel.bidang = new Set(p && p.penerima_tipe === 'bidang' ? (p.penerima_ids || []).map(Number) : []);
  _sel.user   = new Set(p && p.penerima_tipe === 'user'   ? (p.penerima_ids || []).map(Number) : []);
  $('ipPickUserSearch').value = '';
  renderAksi();
  renderPicker();
  openModal('modalInfoPopup');
  muatReferensi().then(renderPicker);
}

function bacaForm() {
  const penerima_tipe = $('ipFormPenerimaTipe').value;
  return {
    judul: $('ipFormJudul').value.trim(),
    isi: _quill ? _quill.root.innerHTML : '',
    isiTeks: _quill ? _quill.getText().trim() : '',
    tipe: $('ipFormTipe').value,
    penerima_tipe,
    penerima_ids: penerima_tipe === 'bidang' ? [..._sel.bidang] : penerima_tipe === 'user' ? [..._sel.user] : [],
    modul_target: $('ipFormModul').value || 'semua',
    mulai_at: inputKeIso($('ipFormMulai').value),
    berakhir_at: inputKeIso($('ipFormBerakhir').value),
    wajib_dibaca: $('ipFormWajib').checked,
    aktif: $('ipFormAktif').value === '1',
    aksi: _aksi.map((a) => ({ label: a.label.trim(), tipe: a.tipe, tujuan: a.tujuan.trim() })).filter((a) => a.label || a.tujuan),
  };
}
function validasiForm(f) {
  if (!f.judul) return 'Judul wajib diisi';
  if (f.judul.length > 200) return 'Judul maksimal 200 karakter';
  if (!f.isiTeks) return 'Isi wajib diisi';
  if (f.penerima_tipe === 'bidang' && !f.penerima_ids.length) return 'Pilih minimal satu Unit Kerja';
  if (f.penerima_tipe === 'user' && !f.penerima_ids.length) return 'Pilih minimal satu user';
  if (f.berakhir_at && f.mulai_at && new Date(f.berakhir_at) <= new Date(f.mulai_at)) return 'Waktu berakhir harus setelah waktu mulai';
  if (f.berakhir_at && !f.mulai_at && new Date(f.berakhir_at) <= new Date()) return 'Waktu berakhir harus setelah waktu mulai';
  for (const a of f.aksi) {
    if (!a.label || !a.tujuan) return 'Tombol aksi harus punya label dan tujuan';
    if (a.tipe === 'link' && !/^https?:\/\//i.test(a.tujuan)) return 'Tautan tombol aksi harus diawali https:// atau http://';
  }
  return null;
}
async function simpanForm() {
  const f = bacaForm();
  const err = validasiForm(f);
  if (err) { toast(err, 'error'); return; }
  const id = $('ipFormId').value;
  const body = { ...f };
  delete body.isiTeks;
  if (id) body.tampilkan_ulang = $('ipFormUlang').checked;
  const btn = $('ipFormSimpan');
  const awal = btn.innerHTML;
  btn.disabled = true;
  btn.innerHTML = `<span class="btn-spin" style="width:11px;height:11px"></span> Menyimpan...`;
  try {
    await api(id ? '/' + id : '', { method: id ? 'PUT' : 'POST', body });
    toast(id ? 'Info diperbarui' : 'Info ditambahkan', 'success');
    closeModal('modalInfoPopup');
    await loadInfoPopup({ keepPage: true });
    infoPopupCheck('admin');
  } catch (e) { toast(e.message || 'Gagal menyimpan', 'error'); }
  finally { btn.disabled = false; btn.innerHTML = awal; }
}
function pratinjau() {
  const f = bacaForm();
  if (!f.judul && !f.isiTeks) { toast('Isi judul atau isi dulu untuk pratinjau', 'error'); return; }
  tampilkanDialog([{
    id: 0, judul: f.judul || '(tanpa judul)', isi: f.isi, tipe: f.tipe, wajib_dibaca: f.wajib_dibaca,
    aksi: f.aksi.filter((a) => a.label && a.tujuan), status: 'baru', berakhir: false, revisi: 1,
  }], { mode: 'pratinjau' });
}

/* ══ USER: state & pengambilan data ═══════════════════════════════════════ */
let _data = { lonceng: [], popup_ids: [], notif: [], dimute: [] };   // notif = notifikasi modul (tabel notifikasi, /api/notifikasi); dimute = modul yang dinonaktifkan user
let _modul = 'dashboard';
let _fetching = false;
let _recheck = false;
let _kejadianCount = 0;               // popup otomatis yang sudah ditampilkan pada kejadian ini (B4)
const _handled = new Set();           // "id:revisi" yang sudah ditutup di sesi halaman ini
let _queue = [];                      // antrean popup otomatis
let _tampil = null;                   // { items, idx, mode }
let _retryTimer = null;
let _debounceTimer = null;
let _pollTimer = null;
let _lastFocus = null;

const kunci = (it) => `${it.id}:${it.revisi}`;

async function ambilData() {
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), FETCH_TIMEOUT_MS);
  try {
    const r = await fetch('/api/info-popup/saya?modul=' + encodeURIComponent(_modul), { headers: authHeaders(), signal: ctl.signal });
    if (!r.ok) return null;
    return await r.json();
  } catch { return null; }          // gagal diam-diam (D3)
  finally { clearTimeout(t); }
}

// Notifikasi modul (surat masuk, dst.) - sumbernya tabel `notifikasi`, terpisah dari Info Popup.
async function ambilNotif() {
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), FETCH_TIMEOUT_MS);
  try {
    const r = await fetch('/api/notifikasi/saya', { headers: authHeaders(), signal: ctl.signal });
    if (!r.ok) return null;
    return await r.json();
  } catch { return null; }          // gagal diam-diam (D3)
  finally { clearTimeout(t); }
}

async function infoPopupCheck(reason = 'poll') {
  if (!_user) return;
  if (_fetching) { _recheck = true; return; }
  _fetching = true;
  try {
    const [d, nf] = await Promise.all([ambilData(), ambilNotif()]);
    if (!d && !nf) return;
    if (nf) { _data.notif = nf.notifikasi || []; _data.dimute = nf.dimute || []; }
    if (!d) { renderBell(); umumkanPeringatan(); return; }    // Info Popup gagal diambil: tetap tampilkan notifikasi modul
    _data = { lonceng: d.lonceng || [], popup_ids: d.popup_ids || [], notif: _data.notif, dimute: _data.dimute };
    renderBell();
    umumkanPeringatan();
    // Susun antrean: yang berhak tampil, belum ditutup di sesi ini, belum ada di antrean/layar.
    const sedangTampil = new Set((_tampil ? _tampil.items : []).map(kunci));
    const antre = new Set(_queue.map(kunci));
    for (const id of _data.popup_ids) {
      const it = _data.lonceng.find((x) => x.id === id);
      if (!it || _handled.has(kunci(it)) || sedangTampil.has(kunci(it)) || antre.has(kunci(it))) continue;
      if (_kejadianCount + _queue.length >= MAX_POPUP_PER_KEJADIAN) break;   // sisanya hanya di lonceng
      _queue.push(it);
    }
    cobaTampil();
  } finally {
    _fetching = false;
    if (_recheck) { _recheck = false; infoPopupCheck('recheck'); }
  }
}

// B5: tahan sampai tidak ada modal/form lain yang terbuka. Cek ulang tiap detik.
function adaModalTerbuka() {
  return !!document.querySelector('.modal-overlay.open, .modal-overlay-main.open, #confirmOverlay.open');
}
function cobaTampil() {
  clearTimeout(_retryTimer);
  if (_tampil || !_queue.length) return;
  if (document.hidden || adaModalTerbuka()) { _retryTimer = setTimeout(cobaTampil, 1000); return; }
  const items = _queue.splice(0, _queue.length);
  _kejadianCount += items.length;
  tampilkanDialog(items, { mode: 'otomatis' });
}

function infoPopupOnNavigate(modul) {
  const baru = modul || 'dashboard';
  const berubah = baru !== _modul;
  _modul = baru;
  _kejadianCount = 0;                // pergantian modul = kejadian baru (B4)
  if (!berubah && _tampil) return;
  clearTimeout(_debounceTimer);
  _debounceTimer = setTimeout(() => infoPopupCheck('navigate'), 350);
}

function infoPopupInit() {
  if (infoPopupInit._done) return;
  infoPopupInit._done = true;
  pasangGayaNotif();
  _kejadianCount = 0;                // login/muat aplikasi = kejadian baru
  setTimeout(() => infoPopupCheck('boot'), 700);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) infoPopupCheck('visible'); });
  _pollTimer = setInterval(() => { if (!document.hidden) infoPopupCheck('poll'); }, POLL_MS);
}

/* ══ USER: popup ══════════════════════════════════════════════════════════ */
function pecahkanFokus(dialog, e) {
  const fokusable = [...dialog.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])')].filter((el) => !el.disabled && el.offsetParent !== null);
  if (!fokusable.length) { e.preventDefault(); dialog.focus(); return; }
  const first = fokusable[0], last = fokusable[fokusable.length - 1];
  if (e.shiftKey && (document.activeElement === first || document.activeElement === dialog)) { e.preventDefault(); last.focus(); }
  else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
}

function tampilkanDialog(items, { mode }) {
  if (!items.length) return;
  const ov = $('ipOverlay');
  if (!ov) return;
  if (!_tampil) _lastFocus = document.activeElement;
  _tampil = { items, idx: 0, mode };
  ov.hidden = false;                 // harus tampil dulu, kalau tidak focus() ke tombol Oke diabaikan browser
  renderDialog();
  document.body.classList.add('ip-open');
  requestAnimationFrame(() => ov.classList.add('show'));
}

// Perilaku tombol/penutup untuk item yang sedang tampil.
function konteks() {
  const { items, idx, mode } = _tampil;
  const it = items[idx];
  const pratinjau = mode === 'pratinjau';
  const disembunyikan = !pratinjau && it.status === 'disembunyikan';
  const berakhir = !pratinjau && it.berakhir;
  return {
    it, pratinjau, disembunyikan, berakhir,
    // Esc & klik luar = "Oke" (kecuali Wajib dibaca). Info berakhir/tersembunyi dari lonceng cukup ditutup.
    bisaDitutupLuar: !it.wajib_dibaca,
    perluRespons: !pratinjau && !disembunyikan && !berakhir,
    tombolSembunyi: !it.wajib_dibaca && !disembunyikan && !berakhir,
  };
}

function renderDialog() {
  const dlg = $('ipDialog');
  const { items, idx, mode } = _tampil;
  const k = konteks();
  const it = k.it;
  const t = tipeOf(it.tipe);
  const penanda = items.length > 1 ? `<span class="ip-counter" aria-live="polite">${idx + 1} dari ${items.length}</span>` : '';
  const aksi = (it.aksi || []).map((a, i) =>
    `<button type="button" class="btn btn-ghost ip-aksi-btn" data-action="ip-aksi" data-i="${i}">${a.label ? esc(a.label) : ''} ${a.tipe === 'link' ? IC.ext(12) : IC.arrow(12)}</button>`).join('');

  let utama;
  if (k.berakhir) utama = `<button type="button" class="btn btn-primary" data-action="ip-tutup" data-ip-primary>${BIC.close}Tutup</button>`;
  else if (k.disembunyikan) utama = `<button type="button" class="btn btn-ghost" data-action="ip-tutup">${BIC.close}Tutup</button><button type="button" class="btn btn-primary" data-action="ip-tampilkan-lagi" data-ip-primary>${BIC.eye}Tampilkan lagi</button>`;
  else utama = `<button type="button" class="btn btn-primary" data-action="ip-oke" data-ip-primary>${BIC.ok}Oke, dimengerti</button>`;

  dlg.className = `ip-dialog ${TIPE[t].cls}`;
  dlg.innerHTML = `
    <div class="ip-head">
      <span class="ip-badge ${TIPE[t].cls}">${IC[t](14)} ${TIPE[t].label}</span>
      ${k.pratinjau ? '<span class="ip-badge ip-t-pratinjau">Pratinjau</span>' : ''}
      ${k.berakhir ? '<span class="ip-badge ip-t-berakhir">Berakhir</span>' : ''}
      ${penanda}
      ${k.tombolSembunyi ? `<button type="button" class="ip-hide" data-action="ip-sembunyikan" data-tip="Jangan tampilkan lagi" aria-label="Jangan tampilkan lagi">${IC.hide(16)}</button>` : ''}
    </div>
    <h2 class="ip-title" id="ipTitle">${esc(it.judul)}</h2>
    <div class="ip-body" id="ipBody">${bersihkanHtml(it.isi)}</div>
    <div class="ip-foot">${aksi ? `<div class="ip-aksi">${aksi}</div>` : ''}<div class="ip-main">${utama}</div></div>`;
  // Tautan di dalam isi selalu membuka tab baru.
  dlg.querySelectorAll('.ip-body a').forEach((a) => { a.target = '_blank'; a.rel = 'noopener noreferrer'; });
  dlg.setAttribute('aria-labelledby', 'ipTitle');
  dlg.scrollTop = 0;
  const bd = $('ipBody'); if (bd) bd.scrollTop = 0;
  (dlg.querySelector('[data-ip-primary]') || dlg).focus();
}

async function kirimRespons(it, jenis) {
  if (!it.id) return;                // pratinjau
  try { await fetch(`/api/info-popup/${it.id}/${jenis}`, { method: 'POST', headers: authHeaders() }); } catch { /* diam-diam */ }
}
function setStatusLokal(it, status) {
  const src = _data.lonceng.find((x) => x.id === it.id && x.revisi === it.revisi);
  if (src) src.status = status;
  it.status = status;
  renderBell();
}

function lanjutAtauTutup() {
  const s = _tampil;
  if (!s) return;
  if (s.idx + 1 < s.items.length) {
    s.idx++;
    renderDialog();
    return;
  }
  const ov = $('ipOverlay');
  ov.classList.remove('show');
  document.body.classList.remove('ip-open');
  setTimeout(() => { ov.hidden = true; }, 160);
  _tampil = null;
  try { _lastFocus && _lastFocus.focus && _lastFocus.focus(); } catch { /* elemen sudah hilang */ }
  cobaTampil();                      // mungkin ada yang antre
}

// jenis: 'oke' | 'sembunyi' | 'tampilkan-lagi' | 'tutup'
function tutupSatu(jenis) {
  if (!_tampil) return;
  const k = konteks();
  const it = k.it;
  if (!k.pratinjau) {
    if (jenis === 'oke' && k.perluRespons) {
      _handled.add(kunci(it));
      setStatusLokal(it, 'dimengerti');
      kirimRespons(it, 'dimengerti');
    } else if (jenis === 'sembunyi' && k.tombolSembunyi) {
      _handled.add(kunci(it));
      setStatusLokal(it, 'disembunyikan');
      kirimRespons(it, 'sembunyikan');
      toast('Info disembunyikan. Bisa dibuka lagi dari ikon lonceng.', 'info');
    } else if (jenis === 'tampilkan-lagi') {
      _handled.add(kunci(it));
      setStatusLokal(it, 'dimengerti');
      kirimRespons(it, 'tampilkan-lagi');
      toast('Info ditampilkan lagi.', 'success');
    } else if (jenis === 'tutup') {
      _handled.add(kunci(it));
    }
  }
  lanjutAtauTutup();
}
// Esc / klik di luar: sama dengan Oke, kecuali info Wajib dibaca.
function tutupLuar() {
  if (!_tampil) return;
  const k = konteks();
  if (!k.bisaDitutupLuar) return;
  tutupSatu(k.perluRespons ? 'oke' : 'tutup');
}
function jalankanAksi(i) {
  if (!_tampil) return;
  const k = konteks();
  const a = (k.it.aksi || [])[i];
  if (!a) return;
  if (k.pratinjau) { toast('Tombol aksi tidak dijalankan pada pratinjau', 'info'); return; }
  const tujuanLink = a.tipe === 'link';
  tutupSatu(k.perluRespons ? 'oke' : 'tutup');   // klik aksi dihitung sebagai Oke (A7)
  if (tujuanLink) {
    if (/^https?:\/\//i.test(a.tujuan)) window.open(a.tujuan, '_blank', 'noopener,noreferrer');
  } else if (!bukaHalaman(a.tujuan)) {
    toast('Halaman tujuan tidak tersedia untuk akun Anda', 'error');
  }
}

/* ══ USER: lonceng ════════════════════════════════════════════════════════ */
function belumDibaca() { return _data.lonceng.filter((x) => x.status === 'baru' && !x.berakhir).length; }
const notifBelum = () => _data.notif.filter((x) => !x.dibaca_at).length;
let _filter = 'semua';   // 'semua' | 'belum' | kunci modul ('surat-masuk', 'lembur', ..., 'info')
const MODUL_LABEL = { 'surat-masuk': 'Surat Masuk', lembur: 'Lembur', perjadin: 'Perjadin', periode: 'Periode', kinerja: 'Kinerja', absensi: 'Absensi', sistem: 'Sistem', keamanan: 'Keamanan' };

// Gaya tambahan untuk tombol "Tandai semua dibaca" (disuntik dari sini, pola yang sama dengan monitoring_frontend.js).
function pasangGayaNotif() {
  if (document.getElementById('ipNotifStyle')) return;
  const st = document.createElement('style');
  st.id = 'ipNotifStyle';
  st.textContent = '.ip-panel-head.ip-panel-head-act{display:flex;align-items:center;justify-content:space-between;gap:8px}'
    + '.ip-readall{border:0;background:transparent;color:var(--teks-muted);font:inherit;font-size:.72rem;font-weight:700;cursor:pointer;padding:4px 6px;border-radius:6px;white-space:nowrap}'
    + '.ip-readall:hover,.ip-readall:focus-visible{background:var(--abu-1);color:var(--teks);outline:none}'
    + '.ip-readall[hidden]{display:none}'
    + '.ip-filter{display:flex;flex-wrap:wrap;gap:6px;padding:8px 12px;border-bottom:1px solid var(--abu-2)}'
    + '.ip-filter[hidden]{display:none}'
    + '.ip-chip{border:1px solid var(--abu-2);background:transparent;color:var(--teks-muted);font:inherit;font-size:.7rem;font-weight:600;line-height:1;padding:5px 9px;border-radius:999px;cursor:pointer;white-space:nowrap}'
    + '.ip-chip:hover,.ip-chip:focus-visible{background:var(--abu-1);color:var(--teks);outline:none}'
    + '.ip-chip.on{background:var(--hijau);border-color:var(--hijau);color:#fff}';
  document.head.appendChild(st);
}
function pasangTombolBacaSemua() {
  const head = document.querySelector('#ipPanel .ip-panel-head');
  if (!head) return;
  pasangGayaNotif();
  let b = head.querySelector('[data-action="notif-baca-semua"]');
  if (!b) {
    head.classList.add('ip-panel-head-act');
    head.insertAdjacentHTML('beforeend', '<span class="ip-head-btns"><button type="button" class="ip-readall" data-action="notif-baca-semua">'+BIC.ok+'Tandai semua dibaca</button></span>');
    b = head.querySelector('[data-action="notif-baca-semua"]');
  }
  b.hidden = notifBelum() === 0;
}

function renderBell() {
  const btn = $('btnInfoBell');
  if (!btn) return;
  const n = belumDibaca() + notifBelum();   // info belum dibaca + notifikasi modul belum dibaca
  const badge = $('ipBellBadge');
  btn.classList.toggle('has-unread', n > 0);
  badge.hidden = n === 0;
  badge.textContent = n > 9 ? '9+' : String(n);
  btn.setAttribute('aria-label', n ? `Notifikasi, ${n} perlu diperhatikan` : 'Notifikasi');
  if (!$('ipPanel').hidden) renderPanel();
}
const MIN_ITEM_FILTER = 4;   // filter baru tampil bila item cukup banyak (atau saat filter sedang aktif)

function lolosFilter(kunci, belum) {
  return _filter === 'semua' || (_filter === 'belum' && belum) || _filter === kunci;
}
function pasangFilter(total) {
  const list = $('ipPanelList');
  let bar = $('ipFilter');
  if (!bar) {
    bar = document.createElement('div');
    bar.id = 'ipFilter'; bar.className = 'ip-filter';
    bar.setAttribute('role', 'group'); bar.setAttribute('aria-label', 'Saring notifikasi');
    list.insertAdjacentElement('beforebegin', bar);
  }
  const unreadInfo = (it) => it.status === 'baru' && !it.berakhir;
  const modul = [...new Set(_data.notif.map((n) => n.modul))];
  if (_data.lonceng.length) modul.push('info');
  if (_filter !== 'semua' && _filter !== 'belum' && !modul.includes(_filter)) _filter = 'semua';   // modulnya sudah tidak ada
  bar.hidden = total < MIN_ITEM_FILTER && _filter === 'semua';
  if (bar.hidden) return;
  const jml = (kunci) => _data.notif.filter((n) => n.modul === kunci).length + (kunci === 'info' ? _data.lonceng.length : 0);
  const chip = (kunci, label, n) =>
    `<button type="button" class="ip-chip${_filter === kunci ? ' on' : ''}" data-action="ip-filter" data-f="${esc(kunci)}" aria-pressed="${_filter === kunci}">${esc(label)}${n != null ? ` · ${n}` : ''}</button>`;
  bar.innerHTML = chip('semua', 'Semua', total)
    + chip('belum', 'Belum dibaca', notifBelum() + _data.lonceng.filter(unreadInfo).length)
    + modul.map((m) => chip(m, m === 'info' ? 'Info' : (MODUL_LABEL[m] || m), jml(m))).join('');
}

function renderPanel() {
  const list = $('ipPanelList');
  const items = _data.lonceng;
  const notif = _data.notif;
  pasangTombolBacaSemua();
  pasangFilter(items.length + notif.length);
  if (!items.length && !notif.length) { list.innerHTML = `<div class="ip-empty">Belum ada info</div>`; return; }
  const infoBelum = (it) => it.status === 'baru' && !it.berakhir;
  const notifTampil = notif.filter((n) => lolosFilter(n.modul, !n.dibaca_at));
  const infoTampil = items.filter((it) => lolosFilter('info', infoBelum(it)));
  if (!notifTampil.length && !infoTampil.length) { list.innerHTML = `<div class="ip-empty">Tidak ada yang cocok dengan filter ini</div>`; return; }
  const notifHtml = notifTampil.map((n) => {
    const t = tipeOf(n.prioritas);
    const ikon = n.modul === 'surat-masuk' ? IC.mail(16) : IC[t](16);
    const meta = [MODUL_LABEL[n.modul] || n.modul, n.isi].filter(Boolean).join(' · ');
    return `<button type="button" class="ip-item${n.dibaca_at ? '' : ' unread'}" role="listitem" data-action="notif-buka" data-id="${n.id}">
      <span class="ip-item-ic ${TIPE[t].cls}">${ikon}</span>
      <span class="ip-item-main"><span class="ip-item-title">${esc(n.judul)}</span><span class="ip-item-meta">${esc(meta)}</span></span></button>`;
  }).join('');
  list.innerHTML = notifHtml + infoTampil.map((it) => {
    const t = tipeOf(it.tipe);
    return `<button type="button" class="ip-item${infoBelum(it) ? ' unread' : ''}" role="listitem" data-action="ip-buka" data-id="${it.id}" data-rev="${it.revisi}">
      <span class="ip-item-ic ${TIPE[t].cls}">${IC[t](16)}</span>
      <span class="ip-item-main"><span class="ip-item-title">${esc(it.judul)}</span><span class="ip-item-meta">${TIPE[t].label} · ${fmtWaktu(it.mulai_at || it.created_at)}</span></span></button>`;
  }).join('');
}
function togglePanel(force) {
  const panel = $('ipPanel');
  const btn = $('btnInfoBell');
  const buka = typeof force === 'boolean' ? force : panel.hidden;
  panel.hidden = !buka;
  btn.setAttribute('aria-expanded', String(buka));
  if (buka) { renderPanel(); infoPopupCheck('panel'); }
}
function bukaDariPanel(id, rev) {
  const it = _data.lonceng.find((x) => x.id === id && x.revisi === rev);
  if (!it) return;
  togglePanel(false);
  if (_tampil) return;
  tampilkanDialog([{ ...it }], { mode: 'lonceng' });
}

// Peringatan baru (prioritas tertinggi) diumumkan sekali per sesi lewat toast, tanpa membuka panel. Satu toast per
// pengecekan (ringkasan bila lebih dari satu). Kunci = id + tingkat, jadi kenaikan tingkat diumumkan lagi.
function umumkanPeringatan() {
  const panel = $('ipPanel');
  if (panel && !panel.hidden) return;
  const baru = _data.notif.filter((n) => n.prioritas === 'peringatan' && !n.dibaca_at);
  if (!baru.length) return;
  let sudah = [];
  try { sudah = JSON.parse(sessionStorage.getItem('ipNotifDiumumkan') || '[]'); } catch { sudah = []; }
  const kunci = (n) => `${n.id}:${n.tingkat || ''}`;
  const belum = baru.filter((n) => !sudah.includes(kunci(n)));
  if (!belum.length) return;
  try { sessionStorage.setItem('ipNotifDiumumkan', JSON.stringify([...sudah, ...belum.map(kunci)].slice(-200))); } catch { /* storage penuh/dimatikan */ }
  toast(belum.length === 1 ? belum[0].judul : `${belum.length} peringatan baru di Notifikasi`, 'warning', 'notif-peringatan');
}

// Ambang eskalasi surat terlambat: diatur admin di Master Data > Info Popup (kunci settings notif_surat_eskalasi_hari).
let _ambang = null;
async function muatAmbang() {
  const el = $('ipAmbang');
  if (!el) return;
  try {
    const r = await fetch('/api/settings', { headers: authHeaders() });
    if (!r.ok) return;
    const v = parseInt(((await r.json()).settings || {}).notif_surat_eskalasi_hari, 10);
    _ambang = Number.isInteger(v) && v >= 1 && v <= 60 ? v : 3;
    el.value = _ambang;
  } catch { /* abaikan: kolom tetap berisi default */ }
}

async function simpanAmbang() {
  const el = $('ipAmbang');
  const v = parseInt(el && el.value, 10);
  if (!Number.isInteger(v) || v < 1 || v > 60) { toast('Ambang harus antara 1 dan 60 hari', 'error'); return; }
  try {
    const r = await fetch('/api/settings', {
      method: 'PUT', headers: { ...authHeaders(), 'Content-Type': 'application/json' }, body: JSON.stringify({ notif_surat_eskalasi_hari: String(v) }),
    });
    if (!r.ok) throw new Error('HTTP ' + r.status);
    _ambang = v;
    toast('Ambang eskalasi disimpan', 'success');
  } catch { toast('Gagal menyimpan ambang eskalasi', 'error'); }
}


// Notifikasi modul: tandai dibaca (optimistis, POST di belakang layar) lalu buka halaman tujuannya.
function notifApi(path) { return fetch('/api/notifikasi' + path, { method: 'POST', headers: authHeaders() }).catch(() => {}); }
function bukaNotif(id) {
  const n = _data.notif.find((x) => x.id === id);
  if (!n) return;
  togglePanel(false);
  if (!n.dibaca_at) { n.dibaca_at = new Date().toISOString(); renderBell(); notifApi(`/${id}/baca`); }
  const tujuan = n.tautan && n.tautan.halaman;
  // Tautan dengan filter (ringkasan "surat terlambat"): setel filter halaman tujuan sebelum membukanya.
  if (tujuan === 'surat-masuk' && n.tautan.filter && typeof setSMFilter === 'function') setSMFilter(n.tautan.filter);
  if (tujuan && !bukaHalaman(tujuan)) toast('Halaman tujuan tidak tersedia untuk akun Anda', 'error');
}
function bacaSemuaNotif() {
  if (!notifBelum()) return;
  const sekarang = new Date().toISOString();
  _data.notif.forEach((n) => { if (!n.dibaca_at) n.dibaca_at = sekarang; });
  renderBell();
  notifApi('/baca-semua');
}

/* ══ Event delegation ═════════════════════════════════════════════════════ */
document.addEventListener('click', (e) => {
  // Klik di luar popup (pada overlay) = Oke / tutup.
  if (e.target === $('ipOverlay')) { tutupLuar(); return; }
  // Klik di luar panel lonceng menutup panel.
  const panel = $('ipPanel');
  if (panel && !panel.hidden && !e.target.closest('#ipPanel') && !e.target.closest('#btnInfoBell')) togglePanel(false);

  const el = e.target.closest('[data-action]');
  if (!el) return;
  const id = parseInt(el.dataset.id, 10);
  switch (el.dataset.action) {
    case 'ip-bell':            togglePanel(); break;
    case 'ip-buka':            bukaDariPanel(id, parseInt(el.dataset.rev, 10)); break;
    case 'notif-buka':         bukaNotif(id); break;
    case 'notif-baca-semua':   bacaSemuaNotif(); break;
    case 'ip-filter':          _filter = el.dataset.f || 'semua'; renderPanel(); break;
    case 'notif-ambang-simpan': simpanAmbang(); break;
    case 'ip-oke':             tutupSatu('oke'); break;
    case 'ip-sembunyikan':     tutupSatu('sembunyi'); break;
    case 'ip-tampilkan-lagi':  tutupSatu('tampilkan-lagi'); break;
    case 'ip-tutup':           tutupSatu('tutup'); break;
    case 'ip-aksi':            jalankanAksi(parseInt(el.dataset.i, 10)); break;
    // admin
    case 'ip-tambah':          bukaForm(); break;
    case 'ip-edit':            bukaForm(id); break;
    case 'ip-toggle':          toggleAktif(id); break;
    case 'ip-delete':          hapusInfo(id); break;
    case 'ip-detail':          bukaDetail(id); break;
    case 'ip-detail-filter':   renderDetail(el.dataset.filter || ''); break;
    case 'ip-detail-tutup':    closeModal('modalInfoPopupDetail'); break;
    case 'ip-form-tutup':      closeModal('modalInfoPopup'); break;
    case 'ip-form-simpan':     simpanForm(); break;
    case 'ip-form-pratinjau':  pratinjau(); break;
    case 'ip-aksi-tambah':     if (_aksi.length < 2) { _aksi.push({ label: '', tipe: 'halaman', tujuan: '' }); renderAksi(); } break;
    case 'ip-aksi-hapus':      _aksi.splice(parseInt(el.dataset.i, 10), 1); renderAksi(); break;
  }
});

document.addEventListener('keydown', (e) => {
  if (_tampil && !$('ipOverlay').hidden) {
    if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); tutupLuar(); return; }
    if (e.key === 'Tab') { pecahkanFokus($('ipDialog'), e); return; }
  }
  if (e.key === 'Escape' && $('ipPanel') && !$('ipPanel').hidden) { togglePanel(false); $('btnInfoBell')?.focus(); }
}, true);

document.addEventListener('change', (e) => {
  const t = e.target;
  if (!t) return;
  if (t.id === 'ipFilterTipe' || t.id === 'ipFilterStatus') { _page = 1; renderTable(); return; }
  if (t.id === 'ipFormPenerimaTipe') { renderPicker(); return; }
  if (t.dataset.ipPick) {
    const set = _sel[t.dataset.ipPick];
    const v = parseInt(t.value, 10);
    if (t.checked) set.add(v); else set.delete(v);
    const c = $(t.dataset.ipPick === 'bidang' ? 'ipPickBidangCount' : 'ipPickUserCount');
    if (c) c.textContent = set.size + ' dipilih';
    return;
  }
  if (t.dataset.ipAksi) {
    const [i, f] = t.dataset.ipAksi.split(':');
    if (!_aksi[+i]) return;
    _aksi[+i][f] = t.value;
    if (f === 'tipe') { _aksi[+i].tujuan = ''; renderAksi(); }
  }
});
document.addEventListener('input', (e) => {
  const t = e.target;
  if (t.id === 'ipSearch') { debounceInput('ipSearch', () => { _page = 1; renderTable(); }, 180); return; }
  if (t.id === 'ipPickUserSearch') { debounceInput('ipPickUserSearch', renderPicker, 150); return; }
  if (t.dataset && t.dataset.ipAksi) {
    const [i, f] = t.dataset.ipAksi.split(':');
    if (_aksi[+i]) _aksi[+i][f] = t.value;
  }
});

window.loadInfoPopup = loadInfoPopup;
window.infoPopupInit = infoPopupInit;
window.infoPopupOnNavigate = infoPopupOnNavigate;
window.infoPopupCheck = infoPopupCheck;

})();
