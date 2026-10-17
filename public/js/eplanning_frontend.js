

const EP_ICON_EDIT = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>`;
const EP_ICON_ADD = `<svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14M5 12h14"/></svg>`;
const EP_ICON_CHEVRON_DOWN = `<svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9l6 6 6-6"/></svg>`;
const EP_ICON_CHEVRON_UP = `<svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M18 15l-6-6-6 6"/></svg>`;
const EP_ICON_TRASH = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path stroke-linecap="round" stroke-linejoin="round" d="M19 6l-1 14H6L5 6"/><path stroke-linecap="round" stroke-linejoin="round" d="M10 11v6m4-6v6"/><path stroke-linecap="round" stroke-linejoin="round" d="M9 6V4h6v2"/></svg>`;
const EP_ICON_CHECK = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"/></svg>`;
const EP_ICON_REJECT = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>`;
const EP_ICON_BACK = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M9 14l-4-4m0 0l4-4m-4 4h11a4 4 0 010 8h-1"/></svg>`;
const EP_ICON_LIST = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/></svg>`;
const EP_ICON_SPINNER = `<span class="btn-spin"></span>`;
const EP_ICON_COPY = `<svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="14" height="14" x="8" y="8" rx="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>`;
const EP_ICON_SEND = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"/></svg>`;
const EP_ICON_RESEND = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><g transform="translate(-1.6 5.4) scale(.8)" stroke-width="3" stroke-opacity=".45"><path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/></g><g transform="translate(4 -1) scale(.8)" stroke-width="3"><path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/></g></svg>`;
const EP_ICON_POWER_ON = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2v10"/><path d="M18.4 6.6a9 9 0 1 1-12.77.04"/></svg>`;
const EP_ICON_POWER_OFF = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18.36 6.64A9 9 0 0 1 20.77 15"/><path d="M6.16 6.16a9 9 0 1 0 12.68 12.68"/><path d="M12 2v4"/><path d="m2 2 20 20"/></svg>`;
const EP_ICON_MESSAGE = `<svg xmlns="http://www.w3.org/2000/svg" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z"/><path d="M12 8v4"/><path d="M12 16h.01"/></svg>`;
const EP_ICON_MESSAGE_SM = `<svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z"/><path d="M12 8v4"/><path d="M12 16h.01"/></svg>`;
const EP_ICON_UK_DRAFT = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/><path d="M9 13h6M9 17h6"/></svg>`;
const EP_ICON_UK_SEND = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"/></svg>`;
const EP_ICON_UK_CHAT = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z"/><path d="M12 8v4"/><path d="M12 16h.01"/></svg>`;
const EP_ICON_UK_SHIELD = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z"/><path d="M9 12l2 2 4-4"/></svg>`;
const EP_ICON_UK_FLAG = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 22V4"/><path d="M4 4h14l-2.5 4L18 12H4"/></svg>`;

const EP_USULANKU_TABS = [
  { id: 'praunsulan', tabEl: 'page-eplanning-praunsulan', label: 'Pra Usulan', icon: EP_ICON_UK_DRAFT,  loader: () => loadEplanningPraUsulan(), getList: () => _epPraList },
  { id: 'usulan',     tabEl: 'page-eplanning',            label: 'Usulan',     icon: EP_ICON_UK_SEND,   loader: () => loadEplanning(),          getList: () => _epUsulanList },
  { id: 'pembahasan', tabEl: 'page-eplanning-pembahasan', label: 'Pembahasan', icon: EP_ICON_UK_CHAT,   loader: () => loadEplanningPembahasan(), getList: () => _epPemList },
  { id: 'prafinal',   tabEl: 'page-eplanning-prafinal',   label: 'Pra Final',  icon: EP_ICON_UK_SHIELD, loader: () => loadEplanningPrafinal(),   getList: () => _epPfList },
  { id: 'final',      tabEl: 'page-eplanning-final',      label: 'Final',      icon: EP_ICON_UK_FLAG,   loader: () => loadEplanningFinal(),      getList: () => _epFinList },
];
let _epUsulankuActiveTab = 'praunsulan';

function _epUsulankuRenderTimeline() {
  const wrap = document.getElementById('epUsulankuTimeline');
  if (!wrap) return;
  const activeIdx = EP_USULANKU_TABS.findIndex(t => t.id === _epUsulankuActiveTab);
  const visible = EP_USULANKU_TABS.filter((t, i) => {
    if (i <= activeIdx) return true;
    const list = t.getList();
    return Array.isArray(list) && list.length > 0;
  });
  wrap.innerHTML = visible.map((t, vi) => {
    const i = EP_USULANKU_TABS.indexOf(t);
    const state = i < activeIdx ? 'done' : (i === activeIdx ? 'active' : 'upcoming');
    const dotContent = state === 'done' ? EP_ICON_CHECK : t.icon;
    return `
    <div class="ep-uk-step ${state}" data-tab="${t.id}" onclick="epUsulankuGoTo('${t.id}')">
      <span class="ep-uk-step-dot">${dotContent}</span>
      <span class="ep-uk-step-label">${esc(t.label)}</span>
    </div>${vi < visible.length - 1 ? `<div class="ep-uk-step-line${i < activeIdx ? ' done' : ''}"></div>` : ''}`;
  }).join('');
}

const _EP_UK_STAT_ICON = {
  list:   '<line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/>',
  draft:  '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="9" y1="13" x2="15" y2="13"/><line x1="9" y1="17" x2="13" y2="17"/>',
  clock:  '<circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>',
  reject: '<circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/>',
  ok:     '<path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>',
  wallet: '<path d="M20 12V8H6a2 2 0 0 1-2-2c0-1.1.9-2 2-2h12v4"/><path d="M4 6v12c0 1.1.9 2 2 2h14v-4"/><path d="M18 12a2 2 0 0 0-2 2c0 1.1.9 2 2 2h4v-4h-4z"/>',
  star:   '<polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>',
  avg:    '<line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/>'
};

function _epUkFmtRupiahRingkas(n) {
  const v = Number(n) || 0;
  const f = (x, suf) => 'Rp ' + x.toLocaleString('id-ID', { maximumFractionDigits: 2 }) + ' ' + suf;
  if (v >= 1e12) return f(v / 1e12, 'T');
  if (v >= 1e9)  return f(v / 1e9,  'M');
  if (v >= 1e6)  return f(v / 1e6,  'jt');
  return epFmtRupiah(v);
}

function _epUkStatCard(value, label, color, bg, icon, opts) {
  const o = opts || {};
  return `
    <div class="stat-card" style="border-left-color:${color}"${o.tip ? ` data-tip="${esc(o.tip)}"` : ''}>
      <div class="stat-card-body">
        <div class="stat-label">${label}</div>
        <div class="stat-value" style="color:${color}${o.small ? ';font-size:var(--fs-xl)' : ''}">${value}</div>
      </div>
      <div class="stat-icon" style="background:${bg};opacity:1">
        <svg xmlns="http://www.w3.org/2000/svg" width="17" height="17" fill="none" viewBox="0 0 24 24" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${_EP_UK_STAT_ICON[icon]}</svg>
      </div>
    </div>`;
}

function _epUkEnsureStatGrid() {
  let el = document.getElementById('epUkStats');
  if (el) return el;
  const timeline = document.getElementById('epUsulankuTimeline');
  if (!timeline) return null;
  el = document.createElement('div');
  el.id = 'epUkStats';
  el.className = 'stat-grid';
  el.style.gridTemplateColumns = 'repeat(auto-fit, minmax(170px, 1fr))';
  timeline.parentNode.insertBefore(el, timeline);
  return el;
}

function _epUkRenderStats(tabId) {
  const cfg = EP_USULANKU_TABS.find(t => t.id === tabId);
  if (!cfg || tabId !== _epUsulankuActiveTab) return;
  const el = _epUkEnsureStatGrid();
  if (!el) return;
  const list = cfg.getList() || [];
  const fmt = n => Number(n).toLocaleString('id-ID');
  const total = list.length;
  const sum = list.reduce((a, u) => a + (Number(u.total_anggaran) || 0), 0);
  const HIJAU = ['var(--hijau)', 'rgba(15,118,110,.12)'];
  const AMBER = ['#d97706', 'rgba(217,119,6,.12)'];
  const BLUE  = ['#2563eb', 'rgba(37,99,235,.12)'];
  const RED   = ['#dc2626', 'rgba(220,38,38,.12)'];
  const GREEN = ['#16a34a', 'rgba(22,163,74,.12)'];
  const card = (v, label, c, icon, o) => _epUkStatCard(v, label, c[0], c[1], icon, o);
  const totalCard = card(fmt(total), 'Total Usulan', HIJAU, 'list');
  const sumCard = card(_epUkFmtRupiahRingkas(sum), 'Total Anggaran', HIJAU, 'wallet', { small: true, tip: epFmtRupiah(sum) });
  let cards;
  if (tabId === 'praunsulan') {
    const draft   = list.filter(u => u.status === 'DRAFT').length;
    const verif   = list.filter(u => String(u.status || '').startsWith('MENUNGGU')).length;
    const ditolak = list.filter(u => u.status === 'DITOLAK').length;
    cards = [totalCard,
      card(fmt(draft),   'Draft',           AMBER, 'draft'),
      card(fmt(verif),   'Dalam Verifikasi', BLUE,  'clock'),
      card(fmt(ditolak), 'Ditolak',         RED,   'reject'),
      sumCard];
  } else if (tabId === 'usulan') {
    const sudah = list.filter(u => u.skala_prioritas != null).length;
    cards = [totalCard, sumCard,
      card(fmt(sudah),         'Sudah Prioritas', GREEN, 'ok'),
      card(fmt(total - sudah), 'Belum Prioritas', AMBER, 'star')];
  } else {
    const avg = total ? sum / total : 0;
    cards = [totalCard, sumCard,
      card(_epUkFmtRupiahRingkas(avg), 'Rata-rata / Usulan', BLUE, 'avg', { small: true, tip: epFmtRupiah(avg) })];
  }
  el.innerHTML = cards.join('');
}

function loadEplanningUsulanku() {
  _epUsulankuRenderTimeline();
  epUsulankuGoTo(_epUsulankuActiveTab || 'praunsulan');
}

function epUsulankuGoTo(tabId) {
  const cfg = EP_USULANKU_TABS.find(t => t.id === tabId) || EP_USULANKU_TABS[0];
  _epUsulankuActiveTab = cfg.id;
  document.querySelectorAll('.ep-usulanku-tab').forEach(el => el.classList.remove('active'));
  const el = document.getElementById(cfg.tabEl);
  if (el) el.classList.add('active');
  _epUsulankuRenderTimeline();
  _epUkRenderStats(cfg.id);
  cfg.loader();
}

function epUsulankuOpenTab(tabId) {
  navigateTo('eplanning-usulanku', 'e-Planning', () => epUsulankuGoTo(tabId), 'eplanning', 'page-eplanning-usulanku');
}

function showEpPrompt({ title = 'Input', msg = '', placeholder = '', okText = 'Kirim', required = true } = {}) {
  return new Promise((resolve) => {
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay open';
    overlay.style.zIndex = '2000';
    overlay.innerHTML = `
      <div class="modal" style="max-width:460px">
        <div class="modal-header">
          <div class="modal-title-wrap">
            <span class="modal-icon-badge modal-icon-badge--red">${EP_ICON_MESSAGE}</span>
            <div class="modal-title">${esc(title)}</div>
          </div>
          <button type="button" class="btn-close" data-act="cancel">${EP_ICON_REJECT}</button>
        </div>
        <div class="modal-body">
          ${msg ? `<div style="font-size:.85rem;color:var(--teks-muted,#64748b);margin-bottom:10px">${esc(msg)}</div>` : ''}
          <div class="field" style="margin-bottom:0">
            <textarea id="epPromptInput" rows="3" placeholder="${esc(placeholder)}" style="resize:vertical"></textarea>
            <div id="epPromptErr" style="display:none;color:var(--merah,#dc2626);font-size:.78rem;font-weight:600;margin-top:6px">Wajib diisi.</div>
          </div>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-ghost" data-act="cancel"><svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5" style="margin-right:5px;vertical-align:-2px"><path stroke-linecap="round" stroke-linejoin="round" d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6"/></svg>Batal</button>
          <button type="button" class="btn btn-danger" data-act="ok">${EP_ICON_CHECK} ${okText}</button>
        </div>
      </div>`;
    document.body.appendChild(overlay);

    const ta = overlay.querySelector('#epPromptInput');
    const err = overlay.querySelector('#epPromptErr');
    const cleanup = (val) => { overlay.remove(); document.removeEventListener('keydown', onKey); resolve(val); };
    const submit = () => {
      const v = ta.value.trim();
      if (required && !v) { err.style.display = ''; ta.focus(); return; }
      cleanup(v);
    };
    const onKey = (e) => {
      if (e.key === 'Escape') cleanup(null);
      if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) submit();
    };
    overlay.addEventListener('click', (e) => {
      const act = e.target.closest('[data-act]');
      if (act) return act.dataset.act === 'ok' ? submit() : cleanup(null);
      if (e.target === overlay) cleanup(null);
    });
    document.addEventListener('keydown', onKey);
    ta.addEventListener('input', () => { if (ta.value.trim()) err.style.display = 'none'; });
    setTimeout(() => ta.focus(), 30);
  });
}
const EP_ICON_FILE_PDF = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/><line x1="16" x2="8" y1="13" y2="13"/><line x1="16" x2="8" y1="17" y2="17"/><line x1="10" x2="8" y1="9" y2="9"/></svg>`;
const EP_ICON_CLOCK = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>`;
const EP_ICON_EYE = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg>`;
const EP_ICON_SEARCH = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>`;
const EP_ICON_ZOOM_IN = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/><line x1="11" y1="8" x2="11" y2="14"/><line x1="8" y1="11" x2="14" y2="11"/></svg>`;
const EP_ICON_ZOOM_OUT = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/><line x1="8" y1="11" x2="14" y2="11"/></svg>`;
const EP_ICON_ZOOM_RESET = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/><path d="M8 16H3v5"/></svg>`;
const EP_ICON_DOWNLOAD = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>`;

function epFmtRupiah(n) {
  const v = Number(n) || 0;
  return 'Rp ' + v.toLocaleString('id-ID');
}

function epRenderSumberDanaRingkasan(summary) {
  const el = document.getElementById('epRincianSumberDanaRingkasan');
  if (!el) return;
  if (!summary || !summary.length) {
    el.textContent = 'Belum ada Rincian Anggaran.';
    return;
  }
  el.innerHTML = summary.map(s => `<div style="display:flex;justify-content:space-between;gap:12px">
    <span>${esc(s.nama)}</span><span style="font-weight:600;white-space:nowrap">${epFmtRupiah(s.total)}</span>
  </div>`).join('');
}

let _epSelectedSumberDana = [];
let _epEditingUsulan = null;

function _epParseSumberDanaPilihan(value) {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    if (Array.isArray(parsed)) return parsed.filter(Boolean);
  } catch {}
  return [value];
}

function epRenderSumberDanaSelectOptions() {
  const sel = document.getElementById('epSumberDana');
  if (!sel) return;
  sel.innerHTML = '<option value="">+ Tambah Sumber Dana</option>' +
    _epRincSumberDanaOptions
      .map(s => {
        const kode = s.kode || '';
        const label = kode ? `${kode} - ${s.nama}` : s.nama;
        return { label, kode, nama: s.nama, nonaktif: s.aktif === false };
      })
      .filter(o => !_epSelectedSumberDana.includes(o.label))
      .map(o => `<option value="${esc(o.label)}" data-kode="${esc(o.kode)}" data-nama="${esc(o.nama)}">${esc(o.label)}${o.nonaktif ? ' (Nonaktif)' : ''}</option>`)
      .join('');
  sel.value = '';
  if (typeof syncCustomSelect === 'function') syncCustomSelect('epSumberDana');
}

function epRenderSumberDanaChips() {
  const wrap = document.getElementById('epSumberDanaChips');
  if (!wrap) return;
  wrap.innerHTML = _epSelectedSumberDana.map((label, i) => `
    <span class="badge badge-hijau" style="display:inline-flex;align-items:center;gap:5px">
      ${esc(label)}
      <span style="cursor:pointer;opacity:.75" onclick="epRemoveSumberDana(${i})" data-tip="Hapus">&times;</span>
    </span>`).join('') || '<span style="opacity:.6;font-size:13px">Belum ada sumber dana dipilih</span>';
}

function epOnSumberDanaPick() {
  const sel = document.getElementById('epSumberDana');
  const val = sel.value;
  if (!val) return;
  if (!_epSelectedSumberDana.includes(val)) _epSelectedSumberDana.push(val);
  epRenderSumberDanaSelectOptions();
  epRenderSumberDanaChips();
}

function epRemoveSumberDana(idx) {
  _epSelectedSumberDana.splice(idx, 1);
  epRenderSumberDanaSelectOptions();
  epRenderSumberDanaChips();
}

async function epPrefillSumberDanaKeg(value) {
  const sel = document.getElementById('epSumberDana');
  if (!sel) return;
  if (!_epRincSumberDanaOptions.length) await epLoadSumberDanaOptions();
  _epSelectedSumberDana = _epParseSumberDanaPilihan(value);
  epRenderSumberDanaSelectOptions();
  epRenderSumberDanaChips();
}

function epRole() {
  if (_user.is_admin) return { isAdmin: true, isKabid: false, isOperator: false, isSekretaris: false, bidangId: _user.bidang_id ?? null };
  return {
    isAdmin: hasAccess('eplanning.admin'),
    isKabid: hasAccess('eplanning.kabid'),
    isOperator: hasAccess('eplanning.operator'),
    isSekretaris: hasAccess('eplanning.sekretaris'),
    bidangId: _user.bidang_id ?? null,
  };
}

function isEpMenungguKepala(status) {
  return typeof status === 'string' && status.startsWith('MENUNGGU KEPALA');
}

function epStatusBadge(status) {
  const FIXED = {
    'DRAFT':              ['badge-yellow', 'Draft'],
    'MENUNGGU SEKRETARIS': ['badge-blue',  'Menunggu Sekretaris Dinas'],
    'MENUNGGU ADMIN':      ['badge-blue',  'Menunggu Admin'],
    'SELESAI':            ['badge-green',  'Selesai'],
    'PEMBAHASAN':         ['badge-ungu',   'Pembahasan'],
    'PRA FINAL':          ['badge-blue',   'Pra Final'],
    'FINAL':              ['badge-green',  'Final'],
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
  ['MENUNGGU SEKRETARIS',         'Menunggu Sekretaris Dinas'],
  ['MENUNGGU ADMIN',              'Menunggu Admin'],
  ['DITOLAK',                     'Ditolak'],
  ['SELESAI',                     'Selesai'],
  ['PEMBAHASAN',                  'Pembahasan'],
  ['PRA FINAL',                   'Pra Final'],
  ['FINAL',                       'Final'],
];

let _epUsulanList = [];
let _epFilterStatus = '';
let _epFilterBidang = '';
let _epSearchText   = '';
let _epPage         = 1;
const _epPageSize   = 10;

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

function setEpPemTahunAktif(val) {
  _epTahunAktif = parseInt(val);
  localStorage.setItem('ep_tahun_aktif', String(_epTahunAktif));
  _renderEpTahunDropdowns();
  const el = document.getElementById('epPemTahunAktif');
  if (el) el.value = _epTahunAktif;
  const page = document.getElementById('page-eplanning-pembahasan');
  if (page && page.classList.contains('active')) loadEplanningPembahasan();
}

async function loadEplanning({ keepPage = false } = {}) {
  
  
  
  const btnTambah = document.getElementById('btnTambahEpUsulan');
  const tbody = document.getElementById('epTableBody');
  if (tbody) tbody.innerHTML = `<tr class="empty-row"><td colspan="8"><span class="btn-spin" style="width:11px;height:11px;vertical-align:-1px;margin-right:6px"></span>Memuat data...</td></tr>`;

  
  
  
  
  
  const [periodeList] = await Promise.all([_epFetchPeriodeAktif(), epEnsureTahunList()]);
  _epApplyPeriodeAktif(periodeList);
  if (btnTambah) {
    btnTambah.style.display = (epRole().isOperator && _epPeriodeAktif) ? '' : 'none';
    const ttdOk = _epHasTtd();
    btnTambah.disabled = !ttdOk;
    btnTambah.style.opacity = ttdOk ? '' : '.5';
    btnTambah.style.cursor = ttdOk ? '' : 'not-allowed';
    if (ttdOk) btnTambah.removeAttribute('data-tip');
    else btnTambah.setAttribute('data-tip', 'Upload tanda tangan Anda dulu di Profil');
  }

  try {
    
    
    const qs = new URLSearchParams({ tahap: 'usulanku', ...(_epTahunAktif ? { tahun: String(_epTahunAktif) } : {}) });
    const r = await fetch(`/api/eplanning/usulan?${qs}`, { headers: authHeaders() });
    const d = await r.json();
    if (!r.ok) throw new Error(d.error || 'Gagal memuat data');
    _epUsulanList = d.usulan || [];
    if (!keepPage) _epPage = 1;
    _rebuildEpFilterBidang();
    _rebuildEpFilterStatus();
    renderEplanningTable();
    _epUsulankuRenderTimeline();
  } catch (err) {
    if (tbody) tbody.innerHTML = `<tr class="empty-row"><td colspan="8">${esc(err.message)}</td></tr>`;
  }
}

function _rebuildEpFilterBidang() {
  const sel = document.getElementById('epFilterBidang');
  if (!sel) return;
  const wrap = sel.closest('.select-wrap') || sel;
  const isAdmin = epRole().isAdmin;
  wrap.style.display = isAdmin ? '' : 'none';
  if (!isAdmin) { _epFilterBidang = ''; return; }
  const current = _epFilterBidang;
  const map = new Map(); 
  _epUsulanList.forEach(u => { if (u.bidang_id != null) map.set(String(u.bidang_id), u.bidang_nama || '-'); });

  const opts = [...map.entries()]
    .sort((a, b) => a[1].localeCompare(b[1], 'id'))
    .map(([id, nama]) => `<option value="${id}">${esc(nama)}</option>`)
    .join('');
  sel.innerHTML = `<option value="">Semua Unit Kerja</option>` + opts;

  if (map.size === 1) {
    _epFilterBidang = [...map.keys()][0];
  } else if (current && !map.has(current)) {
    _epFilterBidang = '';
  } else {
    _epFilterBidang = current;
  }
  sel.value = _epFilterBidang;
}

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

let _epCountdownTimer = null;

function renderEpPeriodeBanner(targetId) {
  targetId = targetId || 'epPeriodeBanner';
  const el = document.getElementById(targetId);
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
    if (q && !(u.nama_kegiatan || '').toLowerCase().includes(q) && !(u.sub_kegiatan || '').toLowerCase().includes(q)) return false;
    return true;
  });
}

function renderEplanningTable() {
  _epUkRenderStats('usulan');
  const tbody = document.getElementById('epTableBody');
  if (!tbody) return;
  const role = epRole();
  const isAdmin = role.isAdmin;
  const filtered = _epFilteredList();
  if (!_epUsulanList.length) {
    tbody.innerHTML = `<tr class="empty-row"><td colspan="8">Belum ada usulan</td></tr>`;
    renderPagination('epPagination', 0, 1, _epPageSize, 'goEpPage');
    return;
  }
  if (!filtered.length) {
    tbody.innerHTML = `<tr class="empty-row"><td colspan="8">Tidak ada usulan yang cocok dengan filter</td></tr>`;
    renderPagination('epPagination', 0, 1, _epPageSize, 'goEpPage');
    return;
  }
  const totalPages = Math.max(1, Math.ceil(filtered.length / _epPageSize));
  if (_epPage > totalPages) _epPage = totalPages;
  const start = (_epPage - 1) * _epPageSize;
  const list = filtered.slice(start, start + _epPageSize);
  tbody.innerHTML = list.map((u, i) => {
    const canDelete = _user.is_admin;
    return `<tr>
      <td>${start + i + 1}</td>
      <td>
        <div style="font-weight:600">${esc(u.nama_kegiatan || '-')}</div>
        <div style="font-size:12px;color:var(--text-secondary,#64748b)">${u.kode_subkegiatan ? `<b>${esc(u.kode_subkegiatan)}</b> - ` : ''}${esc(u.sub_kegiatan || '')}</div>
      </td>
      <td style="white-space:normal;word-wrap:break-word;overflow-wrap:break-word;max-width:180px">${esc(u.bidang_nama || '-')}</td>
      <td>${esc(u.pembuat_nama || '-')}</td>
      <td style="white-space:nowrap;font-weight:600">${epFmtRupiah(u.total_anggaran)}</td>
      <td>${epStatusBadge(u.status)}</td>
      <td style="white-space:nowrap;text-align:center">
        ${u.skala_prioritas != null ? `<span class="badge badge-blue">#${u.skala_prioritas}</span>` : `<span style="color:var(--text-secondary,#94a3b8)">-</span>`}
        ${(u.status === 'SELESAI' && (role.isKabid || isAdmin)) ? `<button class="btn btn-ghost btn-sm" data-tip="Isi Skala Prioritas" onclick="epSetPrioritas('${u.id}', ${u.skala_prioritas != null ? u.skala_prioritas : 'null'})">${EP_ICON_EDIT}</button>` : ''}
      </td>
      <td style="white-space:nowrap">
        <button class="btn btn-ghost btn-sm" data-tip="Kelola Dokumen" onclick="epOpenDokumenFor('${u.id}')">${EP_ICON_LIST}</button>
        <button class="btn btn-ghost btn-sm" data-tip="Lihat Dokumen" onclick="openUsulanModal('${u.id}')">${EP_ICON_EDIT}</button>
        <button class="btn btn-ghost btn-sm" data-tip="Riwayat Aktivitas" onclick="epOpenRiwayat('${u.id}')">${EP_ICON_CLOCK}</button>
        ${isAdmin ? (u.skala_prioritas != null
          ? `<button class="btn btn-ghost btn-sm" data-tip="Kirim ke Pembahasan" onclick="kirimKePembahasan('${u.id}')">${EP_ICON_SEND}</button>`
          : `<button class="btn btn-ghost btn-sm" disabled style="opacity:.4;cursor:not-allowed" data-tip="Skala prioritas belum diisi">${EP_ICON_SEND}</button>`) : ''}
        ${canDelete ? `<button class="btn-hapus" data-tip="Hapus" onclick="deleteUsulan('${u.id}')">${EP_ICON_TRASH}</button>` : ''}
      </td>
    </tr>`;
  }).join('');
  renderPagination('epPagination', filtered.length, _epPage, _epPageSize, 'goEpPage');
}

window.goEpPage = (p) => { _epPage = p; renderEplanningTable(); };

async function kirimKePembahasan(id) {
  const ok = await showConfirm({
    title: 'Kirim ke Pembahasan',
    msg: 'Usulan ini akan dipindahkan ke tahap Pembahasan. Lanjutkan?',
    okText: 'Ya, Kirim',
    type: 'warning',
    icon: 'wave',
  });
  if (!ok) return;
  try {
    const r = await fetch(`/api/eplanning/usulan/${id}/kirim-pembahasan`, { method: 'PUT', headers: authHeaders() });
    const d = await r.json();
    if (!r.ok) throw new Error(d.error || 'Gagal mengirim ke Pembahasan');
    toast('Usulan dikirim ke Pembahasan', 'success');
    loadEplanning({ keepPage: true });
  } catch (err) { toast(err.message, 'error'); }
}

let _epPemList = [];
let _epPemFilterBidang = '';
let _epPemSearchText = '';
let _epPemPage = 1;
const _epPemPageSize = 10;

async function loadEplanningPembahasan({ keepPage = false } = {}) {
  const tbody = document.getElementById('epPemTableBody');
  if (tbody) tbody.innerHTML = `<tr class="empty-row"><td colspan="7"><span class="btn-spin" style="width:11px;height:11px;vertical-align:-1px;margin-right:6px"></span>Memuat data...</td></tr>`;
  const [periodeList] = await Promise.all([_epFetchPeriodeAktif(), epEnsureTahunList()]);
  _epApplyPeriodeAktif(periodeList);
  const selTahun = document.getElementById('epPemTahunAktif');
  if (selTahun) {
    selTahun.innerHTML = _epTahunList.map(t => `<option value="${t}">${t}</option>`).join('');
    selTahun.value = _epTahunAktif;
  }
  try {
    const qs = new URLSearchParams({ tahap: 'pembahasan', ...(_epTahunAktif ? { tahun: String(_epTahunAktif) } : {}) });
    const r = await fetch(`/api/eplanning/usulan?${qs}`, { headers: authHeaders() });
    const d = await r.json();
    if (!r.ok) throw new Error(d.error || 'Gagal memuat data');
    _epPemList = d.usulan || [];
    if (!keepPage) _epPemPage = 1;
    _rebuildEpPemFilterBidang();
    renderEplanningPembahasanTable();
    _epUsulankuRenderTimeline();
  } catch (err) {
    if (tbody) tbody.innerHTML = `<tr class="empty-row"><td colspan="7">${esc(err.message)}</td></tr>`;
  }
}

function _rebuildEpPemFilterBidang() {
  const sel = document.getElementById('epPemFilterBidang');
  if (!sel) return;
  const wrap = sel.closest('.select-wrap') || sel;
  const isAdmin = epRole().isAdmin;
  wrap.style.display = isAdmin ? '' : 'none';
  if (!isAdmin) { _epPemFilterBidang = ''; return; }
  const current = _epPemFilterBidang;
  const map = new Map();
  _epPemList.forEach(u => { if (u.bidang_id != null) map.set(String(u.bidang_id), u.bidang_nama || '-'); });

  const opts = [...map.entries()]
    .sort((a, b) => a[1].localeCompare(b[1], 'id'))
    .map(([id, nama]) => `<option value="${id}">${esc(nama)}</option>`)
    .join('');
  sel.innerHTML = `<option value="">Semua Unit Kerja</option>` + opts;

  if (map.size === 1) {
    _epPemFilterBidang = [...map.keys()][0];
  } else if (current && !map.has(current)) {
    _epPemFilterBidang = '';
  } else {
    _epPemFilterBidang = current;
  }
  sel.value = _epPemFilterBidang;
}

function setEpPemFilterBidang(bidangId) {
  _epPemFilterBidang = bidangId;
  _epPemPage = 1;
  renderEplanningPembahasanTable();
}

function setEpPemSearchText(text) {
  _epPemSearchText = (text || '').trim();
  _epPemPage = 1;
  renderEplanningPembahasanTable();
}

function _epPemFilteredList() {
  const q = _epPemSearchText.toLowerCase();
  return _epPemList.filter(u => {
    if (_epPemFilterBidang && String(u.bidang_id) !== _epPemFilterBidang) return false;
    if (q && !(u.nama_kegiatan || '').toLowerCase().includes(q) && !(u.sub_kegiatan || '').toLowerCase().includes(q)) return false;
    return true;
  });
}

function renderEplanningPembahasanTable() {
  _epUkRenderStats('pembahasan');
  const tbody = document.getElementById('epPemTableBody');
  if (!tbody) return;
  const isAdmin = epRole().isAdmin;
  const filtered = _epPemFilteredList();
  if (!_epPemList.length) {
    tbody.innerHTML = `<tr class="empty-row"><td colspan="7">Belum ada usulan di tahap Pembahasan</td></tr>`;
    renderPagination('epPemPagination', 0, 1, _epPemPageSize, 'goEpPemPage');
    return;
  }
  if (!filtered.length) {
    tbody.innerHTML = `<tr class="empty-row"><td colspan="7">Tidak ada usulan yang cocok dengan filter</td></tr>`;
    renderPagination('epPemPagination', 0, 1, _epPemPageSize, 'goEpPemPage');
    return;
  }
  const totalPages = Math.max(1, Math.ceil(filtered.length / _epPemPageSize));
  if (_epPemPage > totalPages) _epPemPage = totalPages;
  const start = (_epPemPage - 1) * _epPemPageSize;
  const list = filtered.slice(start, start + _epPemPageSize);
  tbody.innerHTML = list.map((u, i) => `<tr>
      <td>${start + i + 1}</td>
      <td>
        <div style="font-weight:600">${esc(u.nama_kegiatan || '-')}</div>
        <div style="font-size:12px;color:var(--text-secondary,#64748b)">${u.kode_subkegiatan ? `<b>${esc(u.kode_subkegiatan)}</b> - ` : ''}${esc(u.sub_kegiatan || '')}</div>
      </td>
      <td style="white-space:normal;word-wrap:break-word;overflow-wrap:break-word;max-width:180px">${esc(u.bidang_nama || '-')}</td>
      <td>${esc(u.pembuat_nama || '-')}</td>
      <td style="white-space:nowrap;font-weight:600">${epFmtRupiah(u.total_anggaran)}</td>
      <td>${epStatusBadge(u.status)}</td>
      <td style="white-space:nowrap">
        <button class="btn btn-ghost btn-sm" data-tip="Kelola Dokumen" onclick="epOpenDokumenFor('${u.id}')">${EP_ICON_LIST}</button>
        <button class="btn btn-ghost btn-sm" data-tip="Lihat Dokumen" onclick="openUsulanModal('${u.id}')">${EP_ICON_EDIT}</button>
        <button class="btn btn-ghost btn-sm" data-tip="Riwayat Aktivitas" onclick="epOpenRiwayat('${u.id}')">${EP_ICON_CLOCK}</button>
        ${isAdmin ? `<button class="btn btn-ghost btn-sm" data-tip="Kirim ke Pra Final" onclick="kirimKePrafinal('${u.id}')">${EP_ICON_SEND}</button>` : ''}
      </td>
    </tr>`).join('');
  renderPagination('epPemPagination', filtered.length, _epPemPage, _epPemPageSize, 'goEpPemPage');
}

window.goEpPemPage = (p) => { _epPemPage = p; renderEplanningPembahasanTable(); };

async function kirimKePrafinal(id) {
  const ok = await showConfirm({
    title: 'Kirim ke Pra Final',
    msg: 'Usulan ini akan dipindahkan ke tahap Pra Final untuk diverifikasi Kepala Dinas. Lanjutkan?',
    okText: 'Ya, Kirim',
    type: 'warning',
    icon: 'wave',
  });
  if (!ok) return;
  try {
    const r = await fetch(`/api/eplanning/usulan/${id}/kirim-prafinal`, { method: 'PUT', headers: authHeaders() });
    const d = await r.json();
    if (!r.ok) throw new Error(d.error || 'Gagal mengirim ke Pra Final');
    toast('Usulan dikirim ke Pra Final', 'success');
    loadEplanningPembahasan({ keepPage: true });
  } catch (err) { toast(err.message, 'error'); }
}

let _epPfList = [];
let _epPfFilterBidang = '';
let _epPfSearchText = '';
let _epPfPage = 1;
const _epPfPageSize = 10;

async function loadEplanningPrafinal({ keepPage = false } = {}) {
  const tbody = document.getElementById('epPfTableBody');
  if (tbody) tbody.innerHTML = `<tr class="empty-row"><td colspan="7"><span class="btn-spin" style="width:11px;height:11px;vertical-align:-1px;margin-right:6px"></span>Memuat data...</td></tr>`;
  const [periodeList] = await Promise.all([_epFetchPeriodeAktif(), epEnsureTahunList()]);
  _epApplyPeriodeAktif(periodeList);
  const selTahun = document.getElementById('epPfTahunAktif');
  if (selTahun) {
    selTahun.innerHTML = _epTahunList.map(t => `<option value="${t}">${t}</option>`).join('');
    selTahun.value = _epTahunAktif;
  }
  try {
    const qs = new URLSearchParams({ tahap: 'pra-final', ...(_epTahunAktif ? { tahun: String(_epTahunAktif) } : {}) });
    const r = await fetch(`/api/eplanning/usulan?${qs}`, { headers: authHeaders() });
    const d = await r.json();
    if (!r.ok) throw new Error(d.error || 'Gagal memuat data');
    _epPfList = d.usulan || [];
    if (!keepPage) _epPfPage = 1;
    _rebuildEpPfFilterBidang();
    renderEplanningPrafinalTable();
    _epUsulankuRenderTimeline();
  } catch (err) {
    if (tbody) tbody.innerHTML = `<tr class="empty-row"><td colspan="7">${esc(err.message)}</td></tr>`;
  }
}

function setEpPfTahunAktif(val) {
  _epTahunAktif = parseInt(val);
  localStorage.setItem('ep_tahun_aktif', String(_epTahunAktif));
  _renderEpTahunDropdowns();
  const el = document.getElementById('epPfTahunAktif');
  if (el) el.value = _epTahunAktif;
  loadEplanningPrafinal();
}

function _rebuildEpPfFilterBidang() {
  const sel = document.getElementById('epPfFilterBidang');
  if (!sel) return;
  const wrap = sel.closest('.select-wrap') || sel;
  const isAdmin = epRole().isAdmin;
  wrap.style.display = isAdmin ? '' : 'none';
  if (!isAdmin) { _epPfFilterBidang = ''; return; }
  const current = _epPfFilterBidang;
  const map = new Map();
  _epPfList.forEach(u => { if (u.bidang_id != null) map.set(String(u.bidang_id), u.bidang_nama || '-'); });
  const opts = [...map.entries()]
    .sort((a, b) => a[1].localeCompare(b[1], 'id'))
    .map(([id, nama]) => `<option value="${id}">${esc(nama)}</option>`)
    .join('');
  sel.innerHTML = `<option value="">Semua Unit Kerja</option>` + opts;
  if (map.size === 1) { _epPfFilterBidang = [...map.keys()][0]; }
  else if (current && !map.has(current)) { _epPfFilterBidang = ''; }
  else { _epPfFilterBidang = current; }
  sel.value = _epPfFilterBidang;
}

function setEpPfFilterBidang(bidangId) { _epPfFilterBidang = bidangId; _epPfPage = 1; renderEplanningPrafinalTable(); }
function setEpPfSearchText(text) { _epPfSearchText = (text || '').trim(); _epPfPage = 1; renderEplanningPrafinalTable(); }

function _epPfFilteredList() {
  const q = _epPfSearchText.toLowerCase();
  return _epPfList.filter(u => {
    if (_epPfFilterBidang && String(u.bidang_id) !== _epPfFilterBidang) return false;
    if (q && !(u.nama_kegiatan || '').toLowerCase().includes(q) && !(u.sub_kegiatan || '').toLowerCase().includes(q)) return false;
    return true;
  });
}

function renderEplanningPrafinalTable() {
  _epUkRenderStats('prafinal');
  const tbody = document.getElementById('epPfTableBody');
  if (!tbody) return;
  const isAdmin = epRole().isAdmin;
  const filtered = _epPfFilteredList();
  if (!_epPfList.length) {
    tbody.innerHTML = `<tr class="empty-row"><td colspan="7">Belum ada usulan di tahap Pra Final</td></tr>`;
    renderPagination('epPfPagination', 0, 1, _epPfPageSize, 'goEpPfPage');
    return;
  }
  if (!filtered.length) {
    tbody.innerHTML = `<tr class="empty-row"><td colspan="7">Tidak ada usulan yang cocok dengan filter</td></tr>`;
    renderPagination('epPfPagination', 0, 1, _epPfPageSize, 'goEpPfPage');
    return;
  }
  const totalPages = Math.max(1, Math.ceil(filtered.length / _epPfPageSize));
  if (_epPfPage > totalPages) _epPfPage = totalPages;
  const start = (_epPfPage - 1) * _epPfPageSize;
  const list = filtered.slice(start, start + _epPfPageSize);
  tbody.innerHTML = list.map((u, i) => `<tr>
      <td>${start + i + 1}</td>
      <td>
        <div style="font-weight:600">${esc(u.nama_kegiatan || '-')}</div>
        <div style="font-size:12px;color:var(--text-secondary,#64748b)">${u.kode_subkegiatan ? `<b>${esc(u.kode_subkegiatan)}</b> - ` : ''}${esc(u.sub_kegiatan || '')}</div>
        ${u.catatan_prafinal ? `<div style="font-size:12px;color:var(--merah,#dc2626);margin-top:2px">Catatan sebelumnya: ${esc(u.catatan_prafinal)}</div>` : ''}
      </td>
      <td style="white-space:normal;word-wrap:break-word;overflow-wrap:break-word;max-width:180px">${esc(u.bidang_nama || '-')}</td>
      <td>${esc(u.pembuat_nama || '-')}</td>
      <td style="white-space:nowrap;font-weight:600">${epFmtRupiah(u.total_anggaran)}</td>
      <td>${epStatusBadge(u.status)}</td>
      <td style="white-space:nowrap">
        <button class="btn btn-ghost btn-sm" data-tip="Kelola Dokumen" onclick="epOpenDokumenFor('${u.id}')">${EP_ICON_LIST}</button>
        <button class="btn btn-ghost btn-sm" data-tip="Lihat Dokumen" onclick="openUsulanModal('${u.id}')">${EP_ICON_EDIT}</button>
        <button class="btn btn-ghost btn-sm" data-tip="Riwayat Aktivitas" onclick="epOpenRiwayat('${u.id}')">${EP_ICON_CLOCK}</button>
        ${isAdmin ? `<button class="btn btn-ghost btn-sm" data-tip="Verifikasi (Kepala Dinas)" onclick="epOpenVerifikasiPrafinal('${u.id}')">${EP_ICON_CHECK}</button>` : ''}
      </td>
    </tr>`).join('');
  renderPagination('epPfPagination', filtered.length, _epPfPage, _epPfPageSize, 'goEpPfPage');
}

window.goEpPfPage = (p) => { _epPfPage = p; renderEplanningPrafinalTable(); };

let _epPfVerifId = null;
function epOpenVerifikasiPrafinal(id) {
  _epPfVerifId = id;
  document.getElementById('epPfCatatanPerubahan').value = '';
  document.getElementById('epPfPerubahanField').style.display = 'none';
  const btn = document.getElementById('epPfBtnAdaPerubahan');
  btn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5" style="margin-right:5px;vertical-align:-2px"><path stroke-linecap="round" stroke-linejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>Ya, Ada Perubahan`;
  btn.setAttribute('onclick', 'epTogglePrafinalPerubahan()');
  openModal('modalEpVerifikasiPrafinal');
}
function epTogglePrafinalPerubahan() {
  const field = document.getElementById('epPfPerubahanField');
  const btn = document.getElementById('epPfBtnAdaPerubahan');
  const showing = field.style.display !== 'none';
  if (!showing) {
    field.style.display = '';
    btn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5" style="margin-right:5px;vertical-align:-2px"><path stroke-linecap="round" stroke-linejoin="round" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"/></svg>Kirim Perubahan`;
    btn.setAttribute('onclick', "submitVerifikasiPrafinal('PERUBAHAN')");
    document.getElementById('epPfCatatanPerubahan').focus();
  }
}
async function submitVerifikasiPrafinal(keputusan) {
  const catatan = document.getElementById('epPfCatatanPerubahan').value.trim();
  if (keputusan === 'PERUBAHAN' && !catatan) { toast('Catatan perubahan wajib diisi', 'error'); return; }
  const body = keputusan === 'PERUBAHAN' ? { keputusan, catatan } : { keputusan };
  try {
    const r = await fetch(`/api/eplanning/usulan/${_epPfVerifId}/verifikasi-prafinal`, {
      method: 'PUT', headers: { ...authHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const d = await r.json();
    if (!r.ok) throw new Error(d.error || 'Gagal memverifikasi usulan');
    toast(keputusan === 'FINAL' ? 'Usulan dinyatakan Final' : 'Usulan dikembalikan ke Pembahasan', 'success');
    closeModal('modalEpVerifikasiPrafinal');
    loadEplanningPrafinal({ keepPage: true });
  } catch (err) { toast(err.message, 'error'); }
}

let _epFinList = [];
let _epFinFilterBidang = '';
let _epFinSearchText = '';
let _epFinPage = 1;
const _epFinPageSize = 10;

async function loadEplanningFinal() {
  const tbody = document.getElementById('epFinTableBody');
  if (tbody) tbody.innerHTML = `<tr class="empty-row"><td colspan="7"><span class="btn-spin" style="width:11px;height:11px;vertical-align:-1px;margin-right:6px"></span>Memuat data...</td></tr>`;
  const [periodeList] = await Promise.all([_epFetchPeriodeAktif(), epEnsureTahunList()]);
  _epApplyPeriodeAktif(periodeList);
  const selTahun = document.getElementById('epFinTahunAktif');
  if (selTahun) {
    selTahun.innerHTML = _epTahunList.map(t => `<option value="${t}">${t}</option>`).join('');
    selTahun.value = _epTahunAktif;
  }
  try {
    const qs = new URLSearchParams({ tahap: 'final', ...(_epTahunAktif ? { tahun: String(_epTahunAktif) } : {}) });
    const r = await fetch(`/api/eplanning/usulan?${qs}`, { headers: authHeaders() });
    const d = await r.json();
    if (!r.ok) throw new Error(d.error || 'Gagal memuat data');
    _epFinList = d.usulan || [];
    _epFinPage = 1;
    _rebuildEpFinFilterBidang();
    renderEplanningFinalTable();
    _epUsulankuRenderTimeline();
  } catch (err) {
    if (tbody) tbody.innerHTML = `<tr class="empty-row"><td colspan="7">${esc(err.message)}</td></tr>`;
  }
}

function setEpFinTahunAktif(val) {
  _epTahunAktif = parseInt(val);
  localStorage.setItem('ep_tahun_aktif', String(_epTahunAktif));
  _renderEpTahunDropdowns();
  const el = document.getElementById('epFinTahunAktif');
  if (el) el.value = _epTahunAktif;
  loadEplanningFinal();
}

function _rebuildEpFinFilterBidang() {
  const sel = document.getElementById('epFinFilterBidang');
  if (!sel) return;
  const wrap = sel.closest('.select-wrap') || sel;
  const isAdmin = epRole().isAdmin;
  wrap.style.display = isAdmin ? '' : 'none';
  if (!isAdmin) { _epFinFilterBidang = ''; return; }
  const current = _epFinFilterBidang;
  const map = new Map();
  _epFinList.forEach(u => { if (u.bidang_id != null) map.set(String(u.bidang_id), u.bidang_nama || '-'); });
  const opts = [...map.entries()]
    .sort((a, b) => a[1].localeCompare(b[1], 'id'))
    .map(([id, nama]) => `<option value="${id}">${esc(nama)}</option>`)
    .join('');
  sel.innerHTML = `<option value="">Semua Unit Kerja</option>` + opts;
  if (map.size === 1) { _epFinFilterBidang = [...map.keys()][0]; }
  else if (current && !map.has(current)) { _epFinFilterBidang = ''; }
  else { _epFinFilterBidang = current; }
  sel.value = _epFinFilterBidang;
}

function setEpFinFilterBidang(bidangId) { _epFinFilterBidang = bidangId; _epFinPage = 1; renderEplanningFinalTable(); }
function setEpFinSearchText(text) { _epFinSearchText = (text || '').trim(); _epFinPage = 1; renderEplanningFinalTable(); }

function _epFinFilteredList() {
  const q = _epFinSearchText.toLowerCase();
  return _epFinList.filter(u => {
    if (_epFinFilterBidang && String(u.bidang_id) !== _epFinFilterBidang) return false;
    if (q && !(u.nama_kegiatan || '').toLowerCase().includes(q) && !(u.sub_kegiatan || '').toLowerCase().includes(q)) return false;
    return true;
  });
}

function renderEplanningFinalTable() {
  _epUkRenderStats('final');
  const tbody = document.getElementById('epFinTableBody');
  if (!tbody) return;
  const filtered = _epFinFilteredList();
  if (!_epFinList.length) {
    tbody.innerHTML = `<tr class="empty-row"><td colspan="7">Belum ada usulan Final</td></tr>`;
    renderPagination('epFinPagination', 0, 1, _epFinPageSize, 'goEpFinPage');
    return;
  }
  if (!filtered.length) {
    tbody.innerHTML = `<tr class="empty-row"><td colspan="7">Tidak ada usulan yang cocok dengan filter</td></tr>`;
    renderPagination('epFinPagination', 0, 1, _epFinPageSize, 'goEpFinPage');
    return;
  }
  const totalPages = Math.max(1, Math.ceil(filtered.length / _epFinPageSize));
  if (_epFinPage > totalPages) _epFinPage = totalPages;
  const start = (_epFinPage - 1) * _epFinPageSize;
  const list = filtered.slice(start, start + _epFinPageSize);
  tbody.innerHTML = list.map((u, i) => `<tr>
      <td>${start + i + 1}</td>
      <td>
        <div style="font-weight:600">${esc(u.nama_kegiatan || '-')}</div>
        <div style="font-size:12px;color:var(--text-secondary,#64748b)">${u.kode_subkegiatan ? `<b>${esc(u.kode_subkegiatan)}</b> - ` : ''}${esc(u.sub_kegiatan || '')}</div>
      </td>
      <td style="white-space:normal;word-wrap:break-word;overflow-wrap:break-word;max-width:180px">${esc(u.bidang_nama || '-')}</td>
      <td>${esc(u.pembuat_nama || '-')}</td>
      <td style="white-space:nowrap;font-weight:600">${epFmtRupiah(u.total_anggaran)}</td>
      <td>${epStatusBadge(u.status)}</td>
      <td style="white-space:nowrap">
        <button class="btn btn-ghost btn-sm" data-tip="Kelola Dokumen" onclick="epOpenDokumenFor('${u.id}')">${EP_ICON_LIST}</button>
        <button class="btn btn-ghost btn-sm" data-tip="Lihat Dokumen" onclick="openUsulanModal('${u.id}')">${EP_ICON_EDIT}</button>
        <button class="btn btn-ghost btn-sm" data-tip="Riwayat Aktivitas" onclick="epOpenRiwayat('${u.id}')">${EP_ICON_CLOCK}</button>
      </td>
    </tr>`).join('');
  renderPagination('epFinPagination', filtered.length, _epFinPage, _epFinPageSize, 'goEpFinPage');
}

window.goEpFinPage = (p) => { _epFinPage = p; renderEplanningFinalTable(); };

async function epSetPrioritas(id, current) {
  const val = await showEpPrompt({
    title: 'Isi Skala Prioritas',
    msg: 'Masukkan angka skala prioritas usulan ini (semakin kecil semakin prioritas).',
    placeholder: current != null ? String(current) : 'Contoh: 1',
    okText: 'Simpan',
  });
  if (val === null) return;
  const n = parseInt(val, 10);
  if (!Number.isFinite(n) || n < 1) { toast('Skala prioritas harus angka lebih dari 0', 'error'); return; }
  try {
    const r = await fetch(`/api/eplanning/usulan/${id}/set-prioritas`, {
      method: 'PUT', headers: { ...authHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ skala_prioritas: n }),
    });
    const d = await r.json();
    if (!r.ok) throw new Error(d.error || 'Gagal menyimpan skala prioritas');
    toast('Skala prioritas disimpan', 'success');
    loadEplanning({ keepPage: true });
  } catch (err) { toast(err.message, 'error'); }
}

function _epParseTarget(target) {
  const m = String(target || '').trim().match(/^(-?\d+(?:[.,]\d+)?)\s*(.*)$/);
  if (m) return { angka: m[1].replace(',', '.'), satuan: m[2].trim() };
  return { angka: '', satuan: String(target || '').trim() };
}

async function openUsulanModal(id = null) {
  if (!id) {
    if (!_epHasTtd()) { toast('Upload tanda tangan Anda dulu di Profil sebelum menambah kegiatan.', 'error'); return; }
    if (!_epPeriodeAktif) await epLoadPeriodeAktif();
    if (!_epPeriodeAktif) { toast('Periode pengusulan e-Planning belum/sudah tidak aktif.', 'error'); return; }
  }
  document.getElementById('epUsulanId').value = id || '';
  document.getElementById('epSkpdSubUnit').value = _user.bidang_nama || '-';
  _epEditingUsulan = null;
  document.getElementById('epNamaKegiatan').value = '';
  document.getElementById('epSubKegiatan').value = '';
  document.getElementById('epIndikator').value = '';
  _epAutoGrowIndikator();
  document.getElementById('epSatuan').value = '';
  document.getElementById('epTargetAngka').value = '';
  await epPrefillSumberDanaKeg('');
  if (!_epPeriodeAktif) await epLoadPeriodeAktif();
  document.getElementById('epTahunAnggaran').value = _epPeriodeAktif?.tahun || (new Date().getFullYear() + 1);
  _epClearRefCache();
  _epSelectedTags = [];
  document.getElementById('modalEpUsulanTitle').textContent = id ? 'Edit Kegiatan' : 'Tambah Kegiatan';
  epUpdateSaveButtonState();

  await epLoadSubkegiatanOptions();

  if (id) {
    let u = _epUsulanList.find(x => x.id === id) || _epPraList.find(x => x.id === id);
    if (!u) {
      try {
        const r = await fetch(`/api/eplanning/usulan/${id}`, { headers: authHeaders() });
        const d = await r.json();
        if (r.ok) u = d.usulan;
      } catch {  }
    }
    if (u) {
      _epEditingUsulan = u;
      const skSel = document.getElementById('epSubKegiatan');
      if (u.sub_kegiatan && ![...skSel.options].some(o => o.value === u.sub_kegiatan)) {
        
        
        skSel.insertAdjacentHTML('beforeend', `<option value="${esc(u.sub_kegiatan)}">${esc(u.sub_kegiatan)}</option>`);
      }
      skSel.value = u.sub_kegiatan || '';
      if (typeof syncCustomSelect === 'function') syncCustomSelect('epSubKegiatan');
      document.getElementById('epNamaKegiatan').value = u.nama_kegiatan || '';
      document.getElementById('epSkpdSubUnit').value = u.bidang_nama || '-';
      document.getElementById('epIndikator').value = u.indikator || '';
      _epAutoGrowIndikator();
      document.getElementById('epSatuan').value = _epParseTarget(u.target).satuan;
      document.getElementById('epTargetAngka').value = _epParseTarget(u.target).angka;
      document.getElementById('epTahunAnggaran').value = u.tahun_anggaran || '';
      _epSelectedTags = (u.tag_belanja || []).slice();
      await epPrefillSumberDanaKeg(u.sumber_dana_pilihan || '');
      epUpdateSaveButtonState();
    } else {
      toast('Gagal memuat data kegiatan, coba muat ulang halaman', 'error');
    }
  }
  openModal('modalEpUsulan');
  _epAutoGrowIndikator();
}

async function epLoadSubkegiatanOptions() {
  try {
    const r = await fetch('/api/eplanning/subkegiatan', { headers: authHeaders() });
    const d = await r.json();
    _epSubkegiatan = d.subkegiatan || [];
    const sel = document.getElementById('epSubKegiatan');
    if (sel) {
      sel.innerHTML = '<option value="">- Pilih Sub Kegiatan -</option>' +
        _epSubkegiatan.filter(s => s.aktif !== false).map(s => {
          const kode = s.kode_subkegiatan || '';
          return `<option value="${esc(s.nama_subkegiatan)}" data-kode="${esc(kode)}" data-nama="${esc(s.nama_subkegiatan)}">${kode ? esc(kode) + ' - ' : ''}${esc(s.nama_subkegiatan)}</option>`;
        }).join('');
    }
  } catch {}
}

function _epAutoGrowIndikator() {
  const el = document.getElementById('epIndikator');
  if (!el) return;
  el.style.height = 'auto';
  el.style.height = el.scrollHeight + 'px';
}

function epOnSubKegiatanChange() {
  const val = document.getElementById('epSubKegiatan').value;
  epUpdateSaveButtonState();
  if (!val) return;
  const found = _epSubkegiatan.find(s => s.nama_subkegiatan === val);
  if (found) {
    document.getElementById('epIndikator').value = found.indikator || '';
    document.getElementById('epSatuan').value = found.satuan || '';
    _epAutoGrowIndikator();
  }
}

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
      <button type="button" class="btn-hapus" data-tip="Hapus baris" aria-label="Hapus baris" onclick="epRemoveRincianLokasiRow(this)"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path stroke-linecap="round" stroke-linejoin="round" d="M19 6l-1 14H6L5 6"/><path stroke-linecap="round" stroke-linejoin="round" d="M10 11v6M14 11v6"/><path stroke-linecap="round" stroke-linejoin="round" d="M9 6V4h6v2"/></svg></button>
    </div>`;
}

let _epRincianLokasiIdx = 0;


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
  delete _epRefCache.tagbelanja;
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
    await epOpenTagPicker();
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
  delete _epRefCache[kategori];
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
  if (tb) tb.innerHTML = `<tr class="empty-row"><td colspan="3"><span class="btn-spin" style="width:11px;height:11px;vertical-align:-1px;margin-right:6px"></span>Memuat data...</td></tr>`;
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
  document.getElementById('epRefAktif').value = '1';
  document.getElementById('epRefNamaLabel').textContent = meta.kolom;
  document.getElementById('modalReferensiTitle').textContent = id ? `Edit ${meta.judul}` : `Tambah ${meta.judul}`;
  if (id) {
    const r = _epRefFull.find(x => x.id === id);
    if (r) {
      document.getElementById('epRefId').value = r.id;
      document.getElementById('epRefNama').value = r.nama;
      document.getElementById('epRefAktif').value = r.aktif ? '1' : '0';
    }
  }
  openModal('modalReferensi');
}
async function epSaveReferensi() {
  const id = document.getElementById('epRefId').value;
  const nama = document.getElementById('epRefNama').value.trim();
  const aktif = document.getElementById('epRefAktif').value === '1';
  if (!nama) { toast('Nama wajib diisi', 'error'); return; }
  const btn = document.getElementById('btnSaveReferensi');
  const _btnOrigHtml = btn.innerHTML;
  btn.disabled = true;
  btn.innerHTML = `<span class="btn-spin" style="width:11px;height:11px"></span> Menyimpan...`;
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
  finally { btn.disabled = false; btn.innerHTML = _btnOrigHtml; }
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
  const namaKegiatan = document.getElementById('epNamaKegiatan').value.trim();
  if (!namaKegiatan) { toast('Nama Kegiatan wajib diisi', 'error'); return; }
  const skSelEl = document.getElementById('epSubKegiatan');
  const subKegiatan = skSelEl.value.trim();
  if (!subKegiatan) { toast('Sub Kegiatan wajib diisi', 'error'); return; }
  const skOpt = [...skSelEl.options].find(o => o.value === subKegiatan);
  const kodeSubKegiatan = skOpt?.dataset.kode || '';

  const targetAngka = document.getElementById('epTargetAngka').value.trim();
  const satuan = document.getElementById('epSatuan').value.trim();
  const target = targetAngka ? `${targetAngka} ${satuan}`.trim() : satuan;

  const body = {
    id,
    nama_kegiatan: namaKegiatan,
    sub_kegiatan: subKegiatan,
    kode_subkegiatan: kodeSubKegiatan,
    indikator: document.getElementById('epIndikator').value.trim(),
    target,
    tahun_anggaran: parseInt(document.getElementById('epTahunAnggaran').value) || null,
    lokasi_pelaksanaan_kabkota_id: _epEditingUsulan?.lokasi_pelaksanaan_kabkota_id ?? null,
    rincian_lokasi: _epEditingUsulan?.rincian_lokasi ?? [],
    prioritas_provinsi_id: _epEditingUsulan?.prioritas_provinsi_id ?? null,
    prioritas_provinsi_nama: _epEditingUsulan?.prioritas_provinsi_nama ?? null,
    prioritas_kabkota_id: _epEditingUsulan?.prioritas_kabkota_id ?? null,
    prioritas_kabkota_nama: _epEditingUsulan?.prioritas_kabkota_nama ?? null,
    bidang_urusan_id: _epEditingUsulan?.bidang_urusan_id ?? null,
    bidang_urusan_nama: _epEditingUsulan?.bidang_urusan_nama ?? null,
    sumber_dana_pilihan: _epSelectedSumberDana.length ? JSON.stringify(_epSelectedSumberDana) : null,
    tag_belanja: _epSelectedTags,
    anggaran_n1: _epEditingUsulan?.anggaran_n1 ?? null,
    anggaran_n2: _epEditingUsulan?.anggaran_n2 ?? null,
    waktu_mulai_bulan: _epEditingUsulan?.waktu_mulai_bulan ?? null,
    waktu_selesai_bulan: _epEditingUsulan?.waktu_selesai_bulan ?? null,
    link_surat_usulan: _epEditingUsulan?.link_surat_usulan ?? null,
    link_kak: _epEditingUsulan?.link_kak ?? null,
    link_datadukung: _epEditingUsulan?.link_datadukung ?? null,
    data_surat: _epEditingUsulan?.data_surat ?? {},
    data_tor: _epEditingUsulan?.data_tor ?? {},
  };
  try {
    const r = await fetch('/api/eplanning/usulan', {
      method: 'POST', headers: { ...authHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const d = await r.json();
    if (!r.ok) throw new Error(d.error || 'Gagal menyimpan usulan');

    toast('Usulan berhasil disimpan', 'success');

    if (isNew) {
      document.getElementById('epUsulanId').value = d.usulan.id;
      await epOpenDokumen(true);
    } else {
      closeModal('modalEpUsulan');
    }
    const praPage = document.getElementById('page-eplanning-praunsulan');
    if (praPage && praPage.classList.contains('active')) loadEplanningPraUsulan({ keepPage: true });
    else loadEplanning({ keepPage: true });
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
    loadEplanning({ keepPage: true });
  } catch (err) { toast(err.message, 'error'); }
}

function epUpdateSaveButtonState() {
  const btn = document.getElementById('btnSimpanUsulan');
  if (!btn) return;
  const namaOk = document.getElementById('epNamaKegiatan').value.trim() !== '';
  const subKegiatanOk = document.getElementById('epSubKegiatan').value.trim() !== '';
  btn.disabled = !(namaOk && subKegiatanOk);
}

const _epFileState = { Surat: [], Kak: [], DataDukung: [] };

function _epFileNameFromUrl(url) {
  if (!url) return '';
  try {
    const last = decodeURIComponent(url.split('/').pop().split('?')[0]);
    return last.replace(/^\d+_\d+_/, '') || 'Dokumen';
  } catch { return 'Dokumen'; }
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

  const uploadBtn = (doneFiles.length || loadingCount) ? '' : `
    <button type="button" class="dukung-upload-btn" onclick="epTriggerUpload('${field}')" data-tip="Upload file"
      style="display:inline-flex;align-items:center;gap:5px;padding:4px 10px;border-radius:6px;border:1.5px dashed #fca5a5;cursor:pointer;font-size:.75rem;font-weight:600;font-family:inherit;background:#fee2e2;color:#991b1b">
      <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"/></svg>
      Upload
    </button>`;

  group.innerHTML = uploadedBadge + loadingChip + uploadBtn + `
    <span style="font-size:.72rem;color:var(--teks-muted,#94a3b8)">PDF, Word, JPG, PNG - maks. 2 MB</span>`;
}

const _epUploadBatch = { Surat: null, Kak: null, DataDukung: null };


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
    toast('Usulan disetujui & diajukan ke tahap berikutnya', 'success');
    closeModal('modalEpApproveKabid');
    const praPage = document.getElementById('page-eplanning-praunsulan');
    if (praPage && praPage.classList.contains('active')) loadEplanningPraUsulan({ keepPage: true });
    else loadEplanning({ keepPage: true });
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
    const praPage = document.getElementById('page-eplanning-praunsulan');
    if (praPage && praPage.classList.contains('active')) loadEplanningPraUsulan({ keepPage: true });
    else loadEplanning({ keepPage: true });
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
    const praPage = document.getElementById('page-eplanning-praunsulan');
    if (praPage && praPage.classList.contains('active')) loadEplanningPraUsulan({ keepPage: true });
    else loadEplanning({ keepPage: true });
  } catch (err) { toast(err.message, 'error'); }
}



let _epCurrentUsulan = null;
let _epRincianList = [];
let _epKeteranganRiwayat = [];
let _epUraianPaketRiwayat = [];

async function openRincianPage(usulanId) {
  _epCurrentUsulan = _epUsulanList.find(u => u.id === usulanId) || _epPraList.find(u => u.id === usulanId) || { id: usulanId };
  navigateTo('eplanning-rincian', 'Rincian Anggaran', () => loadRincian(usulanId), 'eplanning', 'page-eplanning-rincian');
}

async function loadRincian(usulanId) {
  document.getElementById('epRincianJudul').textContent = _epCurrentUsulan.sub_kegiatan || '-';
  document.getElementById('epRincianBidang').textContent = _epCurrentUsulan.bidang_nama || '-';
  const tbody = document.getElementById('epRincianTableBody');
  tbody.innerHTML = `<tr class="empty-row"><td colspan="8"><span class="btn-spin" style="width:11px;height:11px;vertical-align:-1px;margin-right:6px"></span>Memuat data...</td></tr>`;
  try {
    const r = await fetch(`/api/eplanning/rincian?usulan_id=${usulanId}`, { headers: authHeaders() });
    const d = await r.json();
    if (!r.ok) throw new Error(d.error || 'Gagal memuat rincian');
    _epRincianList = d.rincian || [];
    renderRincianTable();
  } catch (err) {
    tbody.innerHTML = `<tr class="empty-row"><td colspan="8">${esc(err.message)}</td></tr>`;
  }
  _epLoadRincianRiwayat(usulanId);
}

async function _epLoadRincianRiwayat(usulanId) {
  _epKeteranganRiwayat = [];
  _epUraianPaketRiwayat = [];
  try {
    const r = await fetch(`/api/eplanning/rincian-riwayat?usulan_id=${usulanId}`, { headers: authHeaders() });
    const d = await r.json();
    if (!r.ok) throw new Error(d.error || 'Gagal memuat riwayat keterangan');
    _epKeteranganRiwayat = d.keterangan || [];
    _epUraianPaketRiwayat = d.uraian_paket || [];
  } catch (err) {
  }
}

function renderRincianTable() {
  const tbody = document.getElementById('epRincianTableBody');
  const role = epRole();
  const editable = _epCurrentUsulan && ['DRAFT', 'DITOLAK', undefined].includes(_epCurrentUsulan.status);
  if (!_epRincianList.length) {
    tbody.innerHTML = `<tr class="empty-row"><td colspan="8">Belum ada rincian</td></tr>`;
  } else {
    tbody.innerHTML = _epRincianList.map((r, i) => `<tr>
      <td>${i + 1}</td>
      <td>${r.kategori_standar === 'MANUAL' ? 'Manual (Survei Harga)' : `${esc(r.kode_rekening || '-')}<div style="font-size:11px;color:var(--text-secondary,#64748b)">${esc(r.nama_rekening || '')}</div>`}</td>
      <td>${esc(r.objek_belanja || (r.kategori_standar === 'MANUAL' ? 'Manual (Survei Harga)' : '-'))}</td>
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

  const perSumber = {};
  _epRincianList.forEach(r => {
    const nama = r.sumber_dana || 'Belum ditentukan';
    perSumber[nama] = (perSumber[nama] || 0) + (Number(r.sub_total) || 0);
  });
  epRenderSumberDanaRingkasan(Object.entries(perSumber).map(([nama, total]) => ({ nama, total })));
}

let _epObjekBelanjaTersedia = null;
async function _epLoadObjekBelanjaTersedia() {
  try {
    const r = await fetch('/api/eplanning/rekening?kategoriTersedia=1', { headers: authHeaders() });
    const d = await r.json();
    if (r.ok) _epObjekBelanjaTersedia = d.kategori || [];
  } catch {  }
  if (document.activeElement && document.activeElement.id === 'epRincObjekBelanja') {
    _epObjekBelanjaCombo.search();
  }
}

async function openRincianItemModal(id = null, readonly = false) {
  _epLoadObjekBelanjaTersedia();
  document.getElementById('epRincianId').value = id || '';
  document.getElementById('epRincKodeRekening').value = '';
  delete document.getElementById('epRincKodeRekening').dataset.kode;
  _epRincKodeRekeningActive = '';
  document.getElementById('epRincKomponen').value = '';
  document.getElementById('epRincKategoriStandar').selectedIndex = -1;
  _epSyncKategoriStandarUi();
  _epUpdateKompSearchBtn();
  document.getElementById('epRincTkdn').value = '';
  document.getElementById('epRincSpesifikasi').value = '';
  document.getElementById('epRincSatuan').value = '';
  document.getElementById('epRincKeterangan').value = '';
  document.getElementById('epRincJenisPaket').value = '';
  _epSyncJenisPaketUi();
  document.getElementById('epRincUraianPaket').value = '';
  document.getElementById('epRincSumberDana').value = '';
  document.getElementById('epRincKoefisien').value = '';
  document.getElementById('epRincVolume').value = '';
  document.getElementById('epRincHarga').value = '';
  delete document.getElementById('epRincHarga').dataset.raw;
  document.getElementById('epRincObjekBelanja').value = '';
  delete document.getElementById('epRincObjekBelanja').dataset.manual;
  delete document.getElementById('epRincObjekBelanja').dataset.manualHarga;
  _epSyncKategoriManualOption();
  _epFillKoefisienRows([]);
  document.getElementById('epRincRekeningWrap').style.display = id ? '' : 'none';
  document.getElementById('epRincRestFields').style.display = id ? '' : 'none';
  document.getElementById('epRincPengelompokanWrap').style.display = '';
  document.getElementById('btnRekPenyusun').style.display = 'none';
  _epPickedStandarHarga = null;
  _epSurveiRincianReset();
  document.getElementById('modalEpRincianTitle').textContent = readonly ? 'Lihat Rincian' : (id ? 'Edit Rincian' : 'Tambah Rincian Belanja');

  await Promise.all([epLoadSumberDanaOptions(), epLoadSatuanOptions()]);

  if (id) {
    const r = _epRincianList.find(x => x.id === id);
    if (r) {
      document.getElementById('epRincKodeRekening').value = r.kode_rekening
        ? `${r.kode_rekening}${r.nama_rekening ? ' - ' + r.nama_rekening : ''}`
        : '';
      if (r.kode_rekening) document.getElementById('epRincKodeRekening').dataset.kode = r.kode_rekening;
      _epRincKodeRekeningActive = r.kode_rekening || '';
      _epSyncKategoriManualOption(r.kategori_standar === 'MANUAL');
      document.getElementById('epRincKategoriStandar').value = r.kategori_standar || '';
      _epSyncKategoriStandarUi();
      _epUpdateKompSearchBtn();
      _epUpdateRekeningWrapVisibility(r.kategori_standar || '');
      document.getElementById('epRincKomponen').value = r.komponen || '';
      document.getElementById('epRincSpesifikasi').value = r.spesifikasi || '';
      document.getElementById('epRincSatuan').value = r.satuan || '';
      document.getElementById('epRincKeterangan').value = r.keterangan || '';
      document.getElementById('epRincJenisPaket').value = r.jenis_paket || '';
      _epSyncJenisPaketUi();
      document.getElementById('epRincUraianPaket').value = r.uraian_paket || '';
      document.getElementById('epRincSumberDana').value = r.sumber_dana || '';
      document.getElementById('epRincHarga').value = r.harga_satuan ? epFmtRupiah(r.harga_satuan) : '';
      document.getElementById('epRincHarga').dataset.raw = r.harga_satuan || '';
      document.getElementById('epRincObjekBelanja').value = r.objek_belanja || '';
      if (r.objek_belanja) document.getElementById('epRincObjekBelanja').dataset.manual = '1';
      else _epAutoFillObjekBelanja();
      if (r.kategori_standar === 'MANUAL') {
        if (!r.objek_belanja) {
          document.getElementById('epRincObjekBelanja').value = 'Manual (Survei Harga)';
          document.getElementById('epRincObjekBelanja').dataset.manual = '1';
        }
        document.getElementById('epRincObjekBelanja').dataset.manualHarga = '1';
        document.getElementById('epRincPengelompokanWrap').style.display = 'none';
        _epRincStandarHargaId = r.standar_harga_id || null;
        _epMuatSurveiRincian(r);
      }
      const detail = Array.isArray(r.koefisien_detail) && r.koefisien_detail.length
        ? r.koefisien_detail
        : (r.volume ? [{ volume: Number(r.volume), satuan: r.koefisien || r.satuan || 'Unit' }] : []);
      _epFillKoefisienRows(detail);
    }
  }
  epUpdateRincianSubtotal();
  _epUpdateSaveRincianBtn();
  _epRincianApplyReadonly(readonly);
  openModal('modalEpRincian');
}

let _epSurveiRincianBukti = { 1: [], 2: [], 3: [] };
let _epSurveiRincianToken = 0;
let _epRincStandarHargaId = null;
let _epSurveiRincianItem = null;
function _epSurveiRincianBox() {
  let box = document.getElementById('epRincSurveiBox');
  if (!box) {
    const anchor = document.getElementById('epRincHarga')?.closest('.field');
    if (!anchor) return null;
    box = document.createElement('div');
    box.id = 'epRincSurveiBox';
    box.className = 'field';
    box.style.display = 'none';
    anchor.insertAdjacentElement('afterend', box);
  }
  return box;
}
function _epSurveiRincianReset() {
  _epSurveiRincianToken++;
  _epSurveiRincianBukti = { 1: [], 2: [], 3: [] };
  _epSurveiRincianItem = null;
  _epRincStandarHargaId = null;
  const box = _epSurveiRincianBox();
  if (box) { box.style.display = 'none'; box.innerHTML = ''; }
}
async function _epMuatSurveiRincian(r) {
  const box = _epSurveiRincianBox();
  if (!box) return;
  const token = ++_epSurveiRincianToken;
  box.style.display = '';
  const judul = '<label>Data Survei Harga (3 Toko)</label>';
  box.innerHTML = `${judul}<div class="field-hint" style="margin-top:0"><span class="btn-spin" style="width:11px;height:11px;vertical-align:-2px;margin-right:4px"></span>Memuat data survei...</div>`;
  let item = null;
  try {
    const res = await fetch(`/api/eplanning/standarharga?kategori=MANUAL&q=${encodeURIComponent(r.komponen || '')}`, { headers: authHeaders() });
    const d = await res.json();
    const list = Array.isArray(d.standarharga) ? d.standarharga : [];
    const sama = list.filter(x => (x.uraian_barang || '').trim() === (r.komponen || '').trim() && x.survei_toko);
    sama.sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
    item = (r.standar_harga_id && sama.find(x => String(x.id) === String(r.standar_harga_id)))
      || sama.find(x => Number(x.harga_satuan) === Number(r.harga_satuan)) || sama[0] || null;
  } catch { item = null; }
  if (token !== _epSurveiRincianToken) return;
  _epSurveiRincianItem = item;
  if (item && !_epRincStandarHargaId) _epRincStandarHargaId = item.id;
  let survei = null;
  try { survei = item ? JSON.parse(item.survei_toko) : null; } catch { survei = null; }
  if (!survei || !Array.isArray(survei.toko) || !survei.toko.length) {
    box.innerHTML = `${judul}<div class="field-hint" style="margin-top:0">Data survei 3 toko untuk komponen ini tidak ditemukan (Standar Harga Manual-nya mungkin sudah dihapus/dinonaktifkan).</div>`;
    return;
  }
  const cardStyle = 'border:1px solid var(--border,#e2e8f0);border-radius:10px;padding:10px 12px;margin-bottom:8px;background:#fff';
  const tokoHtml = survei.toko.slice(0, 3).map((t, i) => {
    const n = i + 1;
    const files = _epMuatBuktiToko(t);
    _epSurveiRincianBukti[n] = files;
    const linkOk = t.link && _epLinkTokoValid(t.link);
    const linkHtml = t.link
      ? (linkOk
        ? `<a href="${_epEscHtml(t.link)}" target="_blank" rel="noopener noreferrer" style="color:var(--hijau);word-break:break-all">${_epEscHtml(t.link)}</a>`
        : `<span style="word-break:break-all">${_epEscHtml(t.link)}</span>`)
      : '<span style="color:var(--teks-muted,#94a3b8)">-</span>';
    const buktiHtml = files.length
      ? `<span style="display:inline-flex;align-items:center;gap:3px"><span style="display:inline-flex;align-items:center;padding:4px 10px;border-radius:6px;font-size:.75rem;font-weight:600;background:#d1fae5;color:#065f46;opacity:.85;white-space:nowrap"><svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5" style="margin-right:5px"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"/></svg>${files.length > 1 ? `Uploaded (${files.length})` : 'Uploaded'}</span><button type="button" onclick="epLihatBuktiSurveiRincian(${n})" data-tip="Preview bukti harga" style="display:inline-flex;align-items:center;justify-content:center;width:26px;height:26px;border-radius:6px;border:none;cursor:pointer;background:#dbeafe;color:#1d4ed8"><svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path stroke-linecap="round" stroke-linejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg></button></span>`
      : '<span style="color:var(--teks-muted,#94a3b8)">Tidak ada bukti</span>';
    return `<div style="${cardStyle}">
      <div style="display:flex;justify-content:space-between;gap:8px;font-weight:700">
        <span>Toko ${n} - ${_epEscHtml(t.nama || '-')}</span><span style="white-space:nowrap">${_epRupiah(t.harga)}</span>
      </div>
      <div style="font-size:12.5px;margin-top:6px"><span style="color:var(--teks-muted,#64748b)">Link:</span> ${linkHtml}</div>
      <div style="font-size:12.5px;margin-top:6px;display:flex;align-items:center;gap:8px"><span style="color:var(--teks-muted,#64748b)">Bukti:</span> ${buktiHtml}</div>
    </div>`;
  }).join('');
  const untung = survei.persen_untung != null && survei.persen_untung !== '' ? `${_epEscHtml(survei.persen_untung)}%` : '-';
  box.innerHTML = `${judul}
    ${tokoHtml}
    <table class="mini-table" style="width:100%;font-size:12.5px">
      <tr><td>Ongkos Kirim</td><td style="text-align:right;font-weight:600">${_epRupiah(survei.ongkir)}</td></tr>
      <tr><td>Keuntungan + Overhead</td><td style="text-align:right;font-weight:600">${untung}</td></tr>
      ${item.dibuat_oleh ? `<tr><td>Diinput oleh</td><td style="text-align:right;font-weight:600">${_epEscHtml(item.dibuat_oleh)}</td></tr>` : ''}
    </table>
    ${_epRincReadonly ? '' : !_epBolehUbahSurvei(item) ? `<div class="field-hint">Survei ini diinput oleh ${_epEscHtml(item.dibuat_oleh || 'user lain')}. Hanya penginput dan admin yang bisa mengubahnya - kamu tetap bisa memakainya ulang lewat pilihan Komponen.</div>` : `<button type="button" onclick="epUbahSurveiRincian()" style="display:inline-flex;align-items:center;gap:6px;margin-top:10px;padding:6px 12px;border-radius:8px;border:1.5px solid #99f6e4;background:#ccfbf1;color:#0f766e;cursor:pointer;font-family:inherit;font-size:.75rem;font-weight:600;line-height:1">${EP_ICON_EDIT}Ubah Survei Harga</button>
    <div class="field-hint">Perubahan disimpan ke data survei ini dan langsung dipakai di rincian ini.</div>`}`;
}
function _epBolehUbahSurvei(item) {
  if (!item) return false;
  if (epRole().isAdmin) return true;
  if (item.dibuat_oleh_id) return String(item.dibuat_oleh_id) === String(_user.id);
  return !!item.dibuat_oleh && item.dibuat_oleh === _user.nama;
}
function epUbahSurveiRincian() {
  const item = _epSurveiRincianItem;
  if (!item) return;
  if (!_epBolehUbahSurvei(item)) { toast('Hanya penginput dan admin yang bisa mengubah survei ini', 'error'); return; }
  let survei = null;
  try { survei = JSON.parse(item.survei_toko); } catch { survei = null; }
  if (!survei || !Array.isArray(survei.toko)) return;
  epOpenStandarHargaManualFromRincian();
  document.getElementById('epShId').value = item.id;
  document.getElementById('modalStandarHargaTitle').textContent = 'Ubah Standar Harga Manual (Survei 3 Toko)';
  document.getElementById('epShSpesifikasi').value = item.spesifikasi || '';
  document.getElementById('epShSatuan').value = item.satuan || '';
  document.getElementById('epShTkdn').value = item.tkdn != null ? item.tkdn : '';
  survei.toko.slice(0, 3).forEach((t, idx) => {
    const n = idx + 1;
    document.getElementById(`epShT${n}Nama`).value = t.nama || '';
    _epSetRupiah(`epShT${n}Harga`, t.harga || 0);
    document.getElementById(`epShT${n}Link`).value = t.link || '';
    _epBuktiToko[n] = _epMuatBuktiToko(t);
    _epRenderBuktiTokoUi(n);
  });
  _epSetRupiah('epShOngkir', survei.ongkir || 0);
  document.getElementById('epShPersenUntung').value = survei.persen_untung != null ? survei.persen_untung : '';
  _epSetRupiah('epShHarga', item.harga_satuan);
  epHitungShKalkulator();
}
function epLihatBuktiSurveiRincian(n) {
  const files = (_epSurveiRincianBukti[n] || []).filter(f => f && f.url);
  if (!files.length) return;
  viewDocMulti(files.map(f => ({ url: f.url, name: f.name })), 0, `Bukti Harga Toko ${n}`);
}

let _epRincReadonly = false;
function _epRincianApplyReadonly(readonly) {
  _epRincReadonly = readonly;
  const modal = document.getElementById('modalEpRincian');
  if (modal) modal.classList.toggle('ep-rincian-readonly', readonly);
  const btnBatal = document.getElementById('btnBatalRincian');
  if (btnBatal) btnBatal.innerHTML = readonly ? `<svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5" style="margin-right:5px;vertical-align:-2px"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>Tutup` : `<svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5" style="margin-right:5px;vertical-align:-2px"><path stroke-linecap="round" stroke-linejoin="round" d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6"/></svg>Batal`;
  _epUpdateKompSearchBtn();
  const editableIds = [
    'epRincObjekBelanja', 'epRincKodeRekening', 'epRincJenisPaket', 'epRincUraianPaket',
    'epRincSumberDana', 'epRincKategoriStandar', 'epRincKeterangan',
    'epRincKoefVol1', 'epRincKoefSat1',
  ];
  editableIds.forEach(fid => { const el = document.getElementById(fid); if (el) el.disabled = readonly; });
  if (readonly) {
    ['epRincKoefVol2', 'epRincKoefSat2', 'epRincKoefVol3', 'epRincKoefSat3', 'epRincKoefVol4', 'epRincKoefSat4']
      .forEach(fid => { const el = document.getElementById(fid); if (el) el.disabled = true; });
  }
}

let _epRincSumberDanaOptions = [];
let _epRincSatuanOptions = [];

async function epLoadSumberDanaOptions() {
  try {
    const r = await fetch('/api/eplanning/sumberdana', { headers: authHeaders() });
    const d = await r.json();
    const all = d.sumberdana || [];
    _epRincSumberDanaOptions = epRole().isAdmin ? all : all.filter(s => s.aktif !== false);
  } catch { _epRincSumberDanaOptions = []; }
}

async function epLoadSatuanOptions() {
  try {
    const r = await fetch('/api/eplanning/satuan', { headers: authHeaders() });
    const d = await r.json();
    _epRincSatuanOptions = (d.satuan || []).filter(s => s.aktif !== false);
  } catch { _epRincSatuanOptions = []; }
}

function epUpdateRincianSubtotal() {
  const v = Number(document.getElementById('epRincVolume').value) || 0;
  const h = Number(document.getElementById('epRincHarga').dataset.raw) || 0;
  document.getElementById('epRincTotalBelanja').value = epFmtRupiah(v * h);
}

let _epRincKodeRekeningActive = '';

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
          input.value = `${x.kode_rekening} - ${x.nama_rekening}`;
          input.dataset.kode = x.kode_rekening;
          if (inputId === 'epRincKodeRekening') {
            _epRincKodeRekeningActive = x.kode_rekening || '';
            _epAutoFillObjekBelanja();
            _epRevealRincRestFields();
            _epUpdateSaveRincianBtn();
          }
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
    renderState(q.length === 0 ? '<span class="btn-spin" style="width:11px;height:11px;vertical-align:-1px;margin-right:6px"></span>Memuat rekening yang sering dipakai…' : '<span class="btn-spin" style="width:11px;height:11px;vertical-align:-1px;margin-right:6px"></span>Mencari…');
    let kategoriParam = '';
    if (inputId === 'epRincKodeRekening') {
      const objekBelanja = document.getElementById('epRincObjekBelanja')?.value || '';
      if (objekBelanja) kategoriParam = `&kategori=${encodeURIComponent(objekBelanja)}`;
    }
    try {
      const r = await fetch(`/api/eplanning/rekening?q=${encodeURIComponent(q)}${kategoriParam}`, { headers: authHeaders() });
      const d = await r.json();
      const list = d.rekening || [];
      if (input.value.trim() !== q) return;
      renderList(list);
    } catch { renderList([]); }
  }

  return { search, close };
}

const _epRekeningCombo = _epMakeRekeningCombobox('epRincKodeRekening');
function epSearchRekening() { _epRekeningCombo.search(); }

const _epRekeningComboNew = _epMakeRekeningCombobox('epNewRincKodeRekening');

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
    renderState(q.length === 0 ? '<span class="btn-spin" style="width:11px;height:11px;vertical-align:-1px;margin-right:6px"></span>Memuat rekening yang sering dipakai…' : '<span class="btn-spin" style="width:11px;height:11px;vertical-align:-1px;margin-right:6px"></span>Mencari…');
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

function _epMakeLocalCombobox({ inputId, getOptions, matchText, renderOption, onPick, onDelete, canDelete }) {
  let panel = null;
  let bound = false;
  let inputBound = false;
  let list = [];
  let optionEls = [];
  let activeIndex = -1;
  let emptyCloseTimer = null;

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

  function close() {
    if (emptyCloseTimer) { clearTimeout(emptyCloseTimer); emptyCloseTimer = null; }
    if (panel) panel.style.display = 'none';
    activeIndex = -1;
  }

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

  function setActive(idx) {
    if (optionEls[activeIndex]) {
      optionEls[activeIndex].style.background = '';
      optionEls[activeIndex].classList.remove('csel-option-active');
    }
    activeIndex = idx;
    const el = optionEls[activeIndex];
    if (el) {
      el.style.background = '#e6f7f1';
      el.classList.add('csel-option-active');
      el.scrollIntoView({ block: 'nearest' });
    }
  }

  function selectActive(input) {
    if (activeIndex < 0 || !list[activeIndex]) return false;
    onPick(input, list[activeIndex]);
    close();
    return true;
  }

  function search() {
    const input = document.getElementById(inputId);
    const q = input.value.trim().toLowerCase();
    const all = getOptions();
    const cocok = q ? all.filter(x => matchText(x).toLowerCase().includes(q)) : all;
    const TAMPIL_MAKS = 50;
    list = cocok.slice(0, TAMPIL_MAKS);
    const lebihBanyak = cocok.length - list.length;
    const p = ensurePanel();
    p.innerHTML = '';
    optionEls = [];
    activeIndex = -1;
    if (emptyCloseTimer) { clearTimeout(emptyCloseTimer); emptyCloseTimer = null; }
    if (!list.length) {
      p.innerHTML = `<div class="csel-empty">${all.length ? 'Tidak ditemukan' : 'Belum ada data master'}</div>`;
      if (!all.length) {
        emptyCloseTimer = setTimeout(() => close(), 2000);
      }
    } else {
      list.forEach((x, idx) => {
        const div = document.createElement('div');
        div.className = 'csel-option';
        const bisaHapus = onDelete && (!canDelete || canDelete(x));
        div.innerHTML = `<span class="csel-option-check"></span><span>${renderOption(x)}</span>`
          + (bisaHapus ? `<button type="button" class="csel-option-del" data-tip="Hapus">${EP_ICON_TRASH}</button>` : '');
        div.addEventListener('mouseenter', () => setActive(idx));
        div.addEventListener('mousedown', (e) => {
          if (e.target.closest('.csel-option-del')) return;
          e.preventDefault();
          onPick(input, x);
          close();
        });
        if (bisaHapus) {
          div.querySelector('.csel-option-del').addEventListener('click', (e) => {
            e.stopPropagation();
            onDelete(x);
            search();
          });
        }
        p.appendChild(div);
        optionEls.push(div);
      });
      if (lebihBanyak > 0) {
        const moreEl = document.createElement('div');
        moreEl.className = 'csel-empty';
        moreEl.textContent = `+${lebihBanyak} lainnya - ketik buat mempersempit`;
        p.appendChild(moreEl);
      }
    }
    position();

    if (!inputBound) {
      inputBound = true;
      input.addEventListener('keydown', (e) => {
        if (!panel || panel.style.display === 'none') {
          if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); search(); }
          return;
        }
        if (e.key === 'ArrowDown') {
          e.preventDefault();
          if (!list.length) return;
          setActive(activeIndex < list.length - 1 ? activeIndex + 1 : 0);
        } else if (e.key === 'ArrowUp') {
          e.preventDefault();
          if (!list.length) return;
          setActive(activeIndex > 0 ? activeIndex - 1 : list.length - 1);
        } else if (e.key === 'Enter') {
          if (activeIndex >= 0) { e.preventDefault(); selectActive(input); }
        } else if (e.key === 'Tab') {
          selectActive(input);
        }
      });
    }
  }

  return { search, close };
}

const _epSumberDanaCombo = _epMakeLocalCombobox({
  inputId: 'epRincSumberDana',
  getOptions: () => _epRincSumberDanaOptions,
  matchText: x => `${x.kode || ''} ${x.nama}`,
  renderOption: x => (x.kode ? `<strong>${esc(x.kode)}</strong> - ${esc(x.nama)}` : esc(x.nama)) + (x.aktif === false ? ' <span style="opacity:.6;font-size:11px">(Nonaktif)</span>' : ''),
  onPick: (input, x) => { input.value = x.kode ? `${x.kode} - ${x.nama}` : x.nama; _epAutoFillObjekBelanja(); _epUpdateSaveRincianBtn(); },
});
function epSearchSumberDana() { _epSumberDanaCombo.search(); }

const _epSatuanCombo = _epMakeLocalCombobox({
  inputId: 'epRincSatuan',
  getOptions: () => _epRincSatuanOptions,
  matchText: x => x.nama,
  renderOption: x => esc(x.nama),
  onPick: (input, x) => { input.value = x.nama; epUpdateKoefisien(); },
});

const _epShSatuanCombo = _epMakeLocalCombobox({
  inputId: 'epShSatuan',
  getOptions: () => _epRincSatuanOptions,
  matchText: x => x.nama,
  renderOption: x => esc(x.nama),
  onPick: (input, x) => { input.value = x.nama; },
});
function epSearchShSatuan() {
  if (!_epRincSatuanOptions.length) epLoadSatuanOptions().then(() => _epShSatuanCombo.search());
  else _epShSatuanCombo.search();
}

function _epMakeKoefSatCombo(inputId) {
  return _epMakeLocalCombobox({
    inputId,
    getOptions: () => _epRincSatuanOptions,
    matchText: x => x.nama,
    renderOption: x => esc(x.nama),
    onPick: (input, x) => { input.value = x.nama; epUpdateKoefisien(); },
  });
}
const _epKoefSat1Combo = _epMakeKoefSatCombo('epRincKoefSat1');
const _epKoefSat2Combo = _epMakeKoefSatCombo('epRincKoefSat2');
const _epKoefSat3Combo = _epMakeKoefSatCombo('epRincKoefSat3');
const _epKoefSat4Combo = _epMakeKoefSatCombo('epRincKoefSat4');
function epSearchKoefSat1() { _epKoefSat1Combo.search(); }
function epSearchKoefSat2() { _epKoefSat2Combo.search(); }
function epSearchKoefSat3() { _epKoefSat3Combo.search(); }
function epSearchKoefSat4() { _epKoefSat4Combo.search(); }

let _epKeteranganCustom = [];
const _epKeteranganCombo = _epMakeLocalCombobox({
  inputId: 'epRincKeterangan',
  getOptions: () => {
    const dariRincian = (_epRincianList || []).map(r => r.keterangan).filter(Boolean);
    const dipakai = [..._epKeteranganCustom, ..._epKeteranganRiwayat, ...dariRincian];
    return Array.from(new Set(dipakai)).map(nama => ({ nama }));
  },
  matchText: x => x.nama,
  renderOption: x => esc(x.nama),
  onPick: (input, x) => { input.value = x.nama; },
  canDelete: x => (_epKeteranganCustom.includes(x.nama) || _epKeteranganRiwayat.includes(x.nama))
    && !(_epRincianList || []).some(r => r.keterangan === x.nama),
  onDelete: (x) => {
    let idx = _epKeteranganCustom.indexOf(x.nama);
    if (idx !== -1) _epKeteranganCustom.splice(idx, 1);
    idx = _epKeteranganRiwayat.indexOf(x.nama);
    if (idx !== -1) _epKeteranganRiwayat.splice(idx, 1);
  },
});
function epSearchKeterangan() { _epKeteranganCombo.search(); }
function epFocusKeteranganBaru(e) {
  e.preventDefault();
  e.stopPropagation();
  _epKeteranganCombo.close();
  document.getElementById('epKeteranganBaru').value = '';
  openModal('modalEpKeterangan');
  setTimeout(() => document.getElementById('epKeteranganBaru').focus(), 50);
}
function epSimpanKeteranganBaru() {
  const nilai = document.getElementById('epKeteranganBaru').value.trim();
  if (!nilai) {
    document.getElementById('epKeteranganBaru').focus();
    return;
  }
  const dariRincian = (_epRincianList || []).map(r => r.keterangan).filter(Boolean);
  const sudahAda = [..._epKeteranganCustom, ..._epKeteranganRiwayat, ...dariRincian]
    .some(x => x.trim().toLowerCase() === nilai.toLowerCase());
  if (sudahAda) {
    toast('Keterangan tersebut sudah ada di daftar', 'error');
    document.getElementById('epKeteranganBaru').focus();
    return;
  }
  if (!_epKeteranganCustom.includes(nilai)) _epKeteranganCustom.push(nilai);
  closeModal('modalEpKeterangan');
}

let _epUraianPaketCustom = [];
const _epUraianPaketCombo = _epMakeLocalCombobox({
  inputId: 'epRincUraianPaket',
  getOptions: () => {
    const dariRincian = (_epRincianList || []).map(r => r.uraian_paket).filter(Boolean);
    const dipakai = [..._epUraianPaketCustom, ..._epUraianPaketRiwayat, ...dariRincian];
    return Array.from(new Set(dipakai)).map(nama => ({ nama }));
  },
  matchText: x => x.nama,
  renderOption: x => esc(x.nama),
  onPick: (input, x) => { input.value = x.nama; },
  canDelete: x => (_epUraianPaketCustom.includes(x.nama) || _epUraianPaketRiwayat.includes(x.nama))
    && !(_epRincianList || []).some(r => r.uraian_paket === x.nama),
  onDelete: (x) => {
    let idx = _epUraianPaketCustom.indexOf(x.nama);
    if (idx !== -1) _epUraianPaketCustom.splice(idx, 1);
    idx = _epUraianPaketRiwayat.indexOf(x.nama);
    if (idx !== -1) _epUraianPaketRiwayat.splice(idx, 1);
  },
});
function epSearchUraianPaket() { _epUraianPaketCombo.search(); }
function epFocusUraianPaketBaru(e) {
  e.preventDefault();
  e.stopPropagation();
  _epUraianPaketCombo.close();
  document.getElementById('epUraianPaketBaru').value = '';
  openModal('modalEpUraianPaket');
  setTimeout(() => document.getElementById('epUraianPaketBaru').focus(), 50);
}
function epSimpanUraianPaketBaru() {
  const nilai = document.getElementById('epUraianPaketBaru').value.trim();
  if (!nilai) {
    document.getElementById('epUraianPaketBaru').focus();
    return;
  }
  const dariRincian = (_epRincianList || []).map(r => r.uraian_paket).filter(Boolean);
  const sudahAda = [..._epUraianPaketCustom, ..._epUraianPaketRiwayat, ...dariRincian]
    .some(x => x.trim().toLowerCase() === nilai.toLowerCase());
  if (sudahAda) {
    toast('Uraian tersebut sudah ada di daftar', 'error');
    document.getElementById('epUraianPaketBaru').focus();
    return;
  }
  if (!_epUraianPaketCustom.includes(nilai)) _epUraianPaketCustom.push(nilai);
  closeModal('modalEpUraianPaket');
}

function epUpdateKoefisien() {
  const rows = [1, 2, 3, 4].map(n => ({
    volEl: document.getElementById(`epRincKoefVol${n}`),
    satEl: document.getElementById(`epRincKoefSat${n}`),
  }));
  let totalVolume = 1;
  const parts = [];
  let chainOk = true;
  rows.forEach((r, idx) => {
    if (idx > 0) {
      r.volEl.disabled = !chainOk;
      r.satEl.disabled = !chainOk;
      if (!chainOk) { r.volEl.value = ''; r.satEl.value = ''; }
    }
    const vol = Number(r.volEl.value) || 0;
    const sat = r.satEl.value.trim();
    if (chainOk && vol > 0 && sat) {
      totalVolume *= vol;
      parts.push(`${vol} ${sat}`);
    } else {
      chainOk = false;
    }
  });
  document.getElementById('epRincVolume').value = parts.length ? totalVolume : '';
  document.getElementById('epRincKoefisien').value = parts.join(' x ');
  epUpdateRincianSubtotal();
  _epUpdateSaveRincianBtn();
}
function _epKoefisienDetailFromRows() {
  const rows = [];
  for (let n = 1; n <= 4; n++) {
    const vol = document.getElementById(`epRincKoefVol${n}`).value;
    const sat = document.getElementById(`epRincKoefSat${n}`).value.trim();
    if (vol !== '' && sat) rows.push({ volume: Number(vol), satuan: sat });
  }
  return rows;
}
function _epUpdateSaveRincianBtn() {
  const btn = document.getElementById('btnSimpanRincian');
  if (!btn) return;
  const objekInput = document.getElementById('epRincObjekBelanja');
  const objek = objekInput.value.trim();
  const isManualHarga = objekInput.dataset.manualHarga === '1';
  const kodeInput = document.getElementById('epRincKodeRekening');
  const kode = kodeInput.dataset.kode || kodeInput.value.trim();
  const sumberDana = document.getElementById('epRincSumberDana').value.trim();
  const kategori = document.getElementById('epRincKategoriStandar').value;
  const komponen = document.getElementById('epRincKomponen').value.trim();
  const jenisPaket = document.getElementById('epRincJenisPaket').value;
  const uraianPaket = document.getElementById('epRincUraianPaket').value.trim();
  const koefisienOk = _epKoefisienDetailFromRows().length > 0;
  const kodeOk = kategori === 'MANUAL' || !!kode;
  const pengelompokanOk = isManualHarga || (jenisPaket && uraianPaket);
  btn.disabled = !(objek && kodeOk && sumberDana && kategori && komponen && pengelompokanOk && koefisienOk);
}
function _epFillKoefisienRows(detail) {
  const rows = Array.isArray(detail) ? detail : [];
  for (let n = 1; n <= 4; n++) {
    const row = rows[n - 1];
    document.getElementById(`epRincKoefVol${n}`).value = row ? row.volume : '';
    document.getElementById(`epRincKoefSat${n}`).value = row ? (row.satuan || '') : '';
  }
  epUpdateKoefisien();
}

const _epSumberDanaComboNew = _epMakeLocalCombobox({
  inputId: 'epNewRincSumberDana',
  getOptions: () => _epRincSumberDanaOptions,
  matchText: x => `${x.kode || ''} ${x.nama}`,
  renderOption: x => (x.kode ? `<strong>${esc(x.kode)}</strong> - ${esc(x.nama)}` : esc(x.nama)) + (x.aktif === false ? ' <span style="opacity:.6;font-size:11px">(Nonaktif)</span>' : ''),
  onPick: (input, x) => { input.value = x.kode ? `${x.kode} - ${x.nama}` : x.nama; },
});

const _epKoefisienComboNew = _epMakeLocalCombobox({
  inputId: 'epNewRincKoefisien',
  getOptions: () => _epRincSatuanOptions,
  matchText: x => x.nama,
  renderOption: x => esc(x.nama),
  onPick: (input, x) => { input.value = x.kode ? `${x.kode} - ${x.nama}` : x.nama; },
});

const EP_OBJEK_BELANJA_PREFIX_MAP = [
  ['5.1.05.02', 'Belanja Hibah (Barang/Jasa)'],
  ['5.1.05.01', 'Belanja Hibah (Uang)'],
  ['5.1.06.02', 'Belanja Bantuan Sosial (Barang/Jasa)'],
  ['5.1.06.01', 'Belanja Bantuan Sosial (Uang)'],
  ['5.1.01', 'Belanja Gaji dan Tunjangan ASN'],
  ['5.1.02', 'Belanja Barang Jasa dan Modal'],
  ['5.2', 'Belanja Barang Jasa dan Modal'],
  ['5.1.03', 'Belanja Bunga'],
  ['5.1.04', 'Belanja Subsidi'],
  ['5.1.07', 'Belanja Bagi Hasil'],
  ['5.1.08', 'Belanja Bantuan Keuangan Umum'],
  ['5.1.09', 'Belanja Tidak Terduga (BTT)'],
];
function _epGuessObjekBelanja(kodeRekening, sumberDana) {
  const sd = (sumberDana || '').toUpperCase();
  if (sd.includes('BOS')) return 'Dana BOS (BOS Pusat)';
  if (sd.includes('BLUD')) return 'Belanja Operasional (BLUD)';
  const kode = kodeRekening || '';
  const hit = EP_OBJEK_BELANJA_PREFIX_MAP.find(([prefix]) => kode.startsWith(prefix));
  return hit ? hit[1] : '';
}
const EP_OBJEK_BELANJA_LIST = [
  'Belanja Gaji dan Tunjangan ASN', 'Belanja Barang Jasa dan Modal', 'Belanja Bunga', 'Belanja Subsidi',
  'Belanja Hibah (Barang/Jasa)', 'Belanja Hibah (Uang)', 'Belanja Bantuan Sosial (Barang/Jasa)',
  'Belanja Bantuan Sosial (Uang)', 'Belanja Bagi Hasil', 'Belanja Bantuan Keuangan Umum',
  'Belanja Bantuan Keuangan Khusus', 'Belanja Tidak Terduga (BTT)', 'Dana BOS (BOS Pusat)',
  'Belanja Operasional (BLUD)', 'Pembebasan Tanah/Lahan', 'Manual (Survei Harga)',
];
function _epRevealRekeningWrap() {
  const el = document.getElementById('epRincRekeningWrap');
  if (el) el.style.display = '';
}
function _epRevealRincRestFields() {
  const el = document.getElementById('epRincRestFields');
  if (el) el.style.display = '';
}
const EP_OBJEK_BELANJA_TANPA_PREFIX = ['Dana BOS (BOS Pusat)', 'Belanja Operasional (BLUD)', 'Pembebasan Tanah/Lahan', 'Manual (Survei Harga)'];
const _epObjekBelanjaCombo = _epMakeLocalCombobox({
  inputId: 'epRincObjekBelanja',
  getOptions: () => EP_OBJEK_BELANJA_LIST
    .filter(nama => !_epObjekBelanjaTersedia || EP_OBJEK_BELANJA_TANPA_PREFIX.includes(nama) || _epObjekBelanjaTersedia.includes(nama))
    .map(nama => ({ nama })),
  matchText: x => x.nama,
  renderOption: x => esc(x.nama),
  onPick: (input, x) => {
    input.value = x.nama;
    input.dataset.manual = '1';
    const isManualHarga = x.nama === 'Manual (Survei Harga)';
    input.dataset.manualHarga = isManualHarga ? '1' : '';
    if (!isManualHarga) _epLepasKategoriManual();
    _epSyncKategoriManualOption();
    const pengelompokanWrap = document.getElementById('epRincPengelompokanWrap');
    if (isManualHarga) {
      const rekWrap = document.getElementById('epRincRekeningWrap');
      if (rekWrap) rekWrap.style.display = 'none';
      if (pengelompokanWrap) pengelompokanWrap.style.display = 'none';
      document.getElementById('epRincJenisPaket').value = '';
      _epSyncJenisPaketUi();
      document.getElementById('epRincUraianPaket').value = '';
    } else {
      _epRevealRekeningWrap();
      if (pengelompokanWrap) pengelompokanWrap.style.display = '';
    }
    _epRevealRincRestFields();
    const rekInput = document.getElementById('epRincKodeRekening');
    if (rekInput) { rekInput.value = ''; delete rekInput.dataset.kode; }
    _epRincKodeRekeningActive = '';
    if (isManualHarga) {
      document.getElementById('epRincKategoriStandar').value = 'MANUAL';
      _epSyncKategoriStandarUi();
      _epRincKategoriStandarChanged();
    }
    _epUpdateSaveRincianBtn();
  },
});
function epSearchObjekBelanja() { _epObjekBelanjaCombo.search(); }
function _epAutoFillObjekBelanja() {
  const input = document.getElementById('epRincObjekBelanja');
  if (!input || input.dataset.manual === '1') return;
  const kode = _epRincKodeRekeningActive || document.getElementById('epRincKodeRekening')?.dataset.kode || '';
  const sumberDana = document.getElementById('epRincSumberDana')?.value || '';
  const guess = _epGuessObjekBelanja(kode, sumberDana);
  if (guess) input.value = guess;
}

async function saveRincianItem() {
  if (_epRincReadonly) return;
  const id = document.getElementById('epRincianId').value || null;
  const objekBelanjaInput = document.getElementById('epRincObjekBelanja');
  const objek_belanja = objekBelanjaInput.value.trim();
  if (!objek_belanja) { toast('Objek Belanja wajib dipilih', 'error'); return; }
  const kodeInput = document.getElementById('epRincKodeRekening');
  const kode_rekening = kodeInput.dataset.kode || kodeInput.value.trim();
  const sumber_dana = document.getElementById('epRincSumberDana').value.trim();
  if (!sumber_dana) { toast('Sumber Dana wajib dipilih', 'error'); return; }
  const kategori_standar = document.getElementById('epRincKategoriStandar').value.trim();
  if (!kategori_standar) { toast('Jenis Standar Harga wajib dipilih', 'error'); return; }
  const komponen = document.getElementById('epRincKomponen').value.trim();
  if (!komponen) { toast('Komponen wajib diisi', 'error'); return; }
  const isManualHarga = objekBelanjaInput.dataset.manualHarga === '1';
  const jenis_paket = document.getElementById('epRincJenisPaket').value.trim();
  if (!isManualHarga && !jenis_paket) { toast('Pengelompokan Belanja/Paket Pekerjaan wajib dipilih', 'error'); return; }
  const uraian_paket = document.getElementById('epRincUraianPaket').value.trim();
  if (!isManualHarga && !uraian_paket) { toast('Uraian Pengelompokan Belanja/Paket Pekerjaan wajib diisi', 'error'); return; }
  const keterangan = document.getElementById('epRincKeterangan').value.trim();
  if (keterangan && !_epKeteranganCustom.includes(keterangan)) _epKeteranganCustom.push(keterangan);
  if (uraian_paket && !_epUraianPaketCustom.includes(uraian_paket)) _epUraianPaketCustom.push(uraian_paket);
  const koefisienDetail = _epKoefisienDetailFromRows();
  if (!koefisienDetail.length) { toast('Koefisien (Perkalian) wajib diisi - minimal Volume 1 & Satuan 1', 'error'); return; }
  const body = {
    id,
    usulan_id: _epCurrentUsulan.id,
    kode_rekening,
    komponen,
    spesifikasi: document.getElementById('epRincSpesifikasi').value.trim(),
    satuan: document.getElementById('epRincSatuan').value.trim(),
    keterangan,
    jenis_paket,
    uraian_paket,
    kategori_standar,
    standar_harga_id: kategori_standar === 'MANUAL' ? (_epRincStandarHargaId || null) : null,
    sumber_dana: document.getElementById('epRincSumberDana').value.trim(),
    koefisien: document.getElementById('epRincKoefisien').value.trim(),
    koefisien_detail: koefisienDetail,
    volume: document.getElementById('epRincVolume').value,
    harga_satuan: document.getElementById('epRincHarga').dataset.raw || '',
    objek_belanja: objekBelanjaInput.dataset.manual === '1' ? objek_belanja : '',
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
    if (_epDokUsulan && _epDokUsulan.id === _epCurrentUsulan.id) await _epDokRefreshRincian();
  } catch (err) { toast(err.message, 'error'); }
}

async function deleteRincianItem(id) {
  const ok = await showConfirm({ title: 'Hapus Rincian', msg: 'Rincian ini akan dihapus permanen. Lanjutkan?', okText: 'Ya, Hapus', type: 'danger', icon: 'trash' });
  if (!ok) return;
  try {
    const r = await fetch(`/api/eplanning/rincian/${id}`, { method: 'DELETE', headers: authHeaders() });
    const d = await r.json();
    if (!r.ok) throw new Error(d.error || 'Gagal menghapus rincian');
    toast('Rincian dihapus', 'success');
    loadRincian(_epCurrentUsulan.id);
    if (_epDokUsulan && _epDokUsulan.id === _epCurrentUsulan.id) await _epDokRefreshRincian();
  } catch (err) { toast(err.message, 'error'); }
}


let _epSubkegiatanFull = [];
let _epSubkegiatanSearch = '';
let _epSubkegiatanPage = 1;
const _epSubkegiatanPageSize = 10;

async function epLoadMasterSubkegiatan({ keepFilter = false } = {}) {
  const tbody = document.getElementById('epMasterSubkegiatanBody');
  if (tbody) tbody.innerHTML = `<tr class="empty-row"><td colspan="6"><span class="btn-spin" style="width:11px;height:11px;vertical-align:-1px;margin-right:6px"></span>Memuat data...</td></tr>`;
  try {
    const r = await fetch('/api/eplanning/subkegiatan', { headers: authHeaders() });
    const d = await r.json();
    _epSubkegiatanFull = d.subkegiatan || [];
    if (!keepFilter) {
      _epSubkegiatanSearch = '';
      _epSubkegiatanPage = 1;
      const searchEl = document.getElementById('epSubkegiatanSearch');
      if (searchEl) searchEl.value = '';
    }
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
  _epSubkegiatanPage = Math.min(_epSubkegiatanPage, Math.max(1, Math.ceil(filtered.length / _epSubkegiatanPageSize)));
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
  document.getElementById('epSubkegiatanAktif').value = '1';
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
      document.getElementById('epSubkegiatanAktif').value = s.aktif ? '1' : '0';
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
  const aktif = document.getElementById('epSubkegiatanAktif').value === '1';
  if (!kode || !nama) { toast('Kode dan nama wajib diisi', 'error'); return; }
  const btn = document.getElementById('btnSaveSubkegiatan');
  const _btnOrigHtml = btn.innerHTML;
  btn.disabled = true;
  btn.innerHTML = `<span class="btn-spin" style="width:11px;height:11px"></span> Menyimpan...`;
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
    epLoadMasterSubkegiatan({ keepFilter: true });
  } catch (err) { toast(err.message, 'error'); }
  finally { btn.disabled = false; btn.innerHTML = _btnOrigHtml; }
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
    epLoadMasterSubkegiatan({ keepFilter: true });
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
  epLoadMasterSubkegiatan({ keepFilter: true });
}

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
    if (!kode || !nama) continue;
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
  progText.innerHTML = `<span class="btn-spin" style="width:11px;height:11px;vertical-align:-2px;margin-right:4px"></span>Membaca file…`;

  try {
    const buf = await file.arrayBuffer();
    await _loadXlsx();
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
    epLoadMasterSubkegiatan({ keepFilter: true });
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

async function epLoadMasterSumberDana({ keepFilter = false } = {}) {
  const tb = document.getElementById('epMasterSumberDanaBody');
  if (tb) tb.innerHTML = `<tr class="empty-row"><td colspan="4"><span class="btn-spin" style="width:11px;height:11px;vertical-align:-1px;margin-right:6px"></span>Memuat data...</td></tr>`;
  try {
    const r = await fetch('/api/eplanning/sumberdana', { headers: authHeaders() });
    const d = await r.json();
    _epSumberDanaFull = d.sumberdana || [];
    if (!keepFilter) {
      _epSumberDanaSearch = '';
      _epSumberDanaPage = 1;
      const searchEl = document.getElementById('epSumberDanaSearch');
      if (searchEl) searchEl.value = '';
    }
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
  _epSumberDanaPage = Math.min(_epSumberDanaPage, Math.max(1, Math.ceil(filtered.length / _epSumberDanaPageSize)));
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
  document.getElementById('epSumberDanaAktif').value = '1';
  document.getElementById('modalSumberDanaTitle').textContent = id ? 'Edit Sumber Dana' : 'Tambah Sumber Dana';
  if (id) {
    const s = _epSumberDanaFull.find(x => x.id === id);
    if (s) {
      document.getElementById('epSumberDanaId').value = s.id;
      document.getElementById('epSumberDanaKode').value = s.kode || '';
      document.getElementById('epSumberDanaNama').value = s.nama;
      document.getElementById('epSumberDanaAktif').value = s.aktif ? '1' : '0';
    }
  }
  openModal('modalSumberDana');
}

async function epSaveSumberDana() {
  const id = document.getElementById('epSumberDanaId').value;
  const kode = document.getElementById('epSumberDanaKode').value.trim();
  const nama = document.getElementById('epSumberDanaNama').value.trim();
  const aktif = document.getElementById('epSumberDanaAktif').value === '1';
  if (!nama) { toast('Nama wajib diisi', 'error'); return; }
  const btn = document.getElementById('btnSaveSumberDana');
  const _btnOrigHtml = btn.innerHTML;
  btn.disabled = true;
  btn.innerHTML = `<span class="btn-spin" style="width:11px;height:11px"></span> Menyimpan...`;
  try {
    const method = id ? 'PUT' : 'POST';
    const url = id ? `/api/eplanning/sumberdana/${id}` : '/api/eplanning/sumberdana';
    const r = await fetch(url, { method, headers: { ...authHeaders(), 'Content-Type': 'application/json' }, body: JSON.stringify({ nama, kode, aktif }) });
    const d = await r.json();
    if (!r.ok) throw new Error(d.error || 'Gagal menyimpan');
    toast(id ? 'Sumber dana diperbarui' : 'Sumber dana ditambahkan', 'success');
    closeModal('modalSumberDana');
    epLoadMasterSumberDana({ keepFilter: true });
  } catch (err) { toast(err.message, 'error'); }
  finally { btn.disabled = false; btn.innerHTML = _btnOrigHtml; }
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
    epLoadMasterSumberDana({ keepFilter: true });
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
  epLoadMasterSumberDana({ keepFilter: true });
}

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
  progText.innerHTML = `<span class="btn-spin" style="width:11px;height:11px;vertical-align:-2px;margin-right:4px"></span>Membaca file…`;

  try {
    const buf = await file.arrayBuffer();
    await _loadXlsx();
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
    epLoadMasterSumberDana({ keepFilter: true });
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

async function epLoadMasterSatuan({ keepFilter = false } = {}) {
  const tb = document.getElementById('epMasterSatuanBody');
  if (tb) tb.innerHTML = `<tr class="empty-row"><td colspan="3"><span class="btn-spin" style="width:11px;height:11px;vertical-align:-1px;margin-right:6px"></span>Memuat data...</td></tr>`;
  try {
    const r = await fetch('/api/eplanning/satuan', { headers: authHeaders() });
    const d = await r.json();
    _epSatuanFull = d.satuan || [];
    if (!keepFilter) {
      _epSatuanSearchQ = '';
      _epSatuanPage = 1;
      const searchEl = document.getElementById('epSatuanSearch');
      if (searchEl) searchEl.value = '';
    }
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
  _epSatuanPage = Math.min(_epSatuanPage, Math.max(1, Math.ceil(filtered.length / _epSatuanPageSize)));
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
  document.getElementById('epSatuanAktif').value = '1';
  document.getElementById('modalSatuanTitle').textContent = id ? 'Edit Satuan' : 'Tambah Satuan';
  if (id) {
    const s = _epSatuanFull.find(x => x.id === id);
    if (s) {
      document.getElementById('epSatuanId').value = s.id;
      document.getElementById('epSatuanNama').value = s.nama;
      document.getElementById('epSatuanAktif').value = s.aktif ? '1' : '0';
    }
  }
  openModal('modalSatuan');
}

async function epSaveSatuan() {
  const id = document.getElementById('epSatuanId').value;
  const nama = document.getElementById('epSatuanNama').value.trim();
  const aktif = document.getElementById('epSatuanAktif').value === '1';
  if (!nama) { toast('Nama satuan wajib diisi', 'error'); return; }
  const btn = document.getElementById('btnSaveSatuan');
  const _btnOrigHtml = btn.innerHTML;
  btn.disabled = true;
  btn.innerHTML = `<span class="btn-spin" style="width:11px;height:11px"></span> Menyimpan...`;
  try {
    const method = id ? 'PUT' : 'POST';
    const url = id ? `/api/eplanning/satuan/${id}` : '/api/eplanning/satuan';
    const r = await fetch(url, { method, headers: { ...authHeaders(), 'Content-Type': 'application/json' }, body: JSON.stringify({ nama, aktif }) });
    const d = await r.json();
    if (!r.ok) throw new Error(d.error || 'Gagal menyimpan');
    toast(id ? 'Satuan diperbarui' : 'Satuan ditambahkan', 'success');
    closeModal('modalSatuan');
    epLoadMasterSatuan({ keepFilter: true });
  } catch (err) { toast(err.message, 'error'); }
  finally { btn.disabled = false; btn.innerHTML = _btnOrigHtml; }
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
    epLoadMasterSatuan({ keepFilter: true });
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
  epLoadMasterSatuan({ keepFilter: true });
}

async function epSyncSatuanDariStandarHarga() {
  try {
    const r = await fetch('/api/eplanning/satuan/sync-dari-standarharga', { method: 'POST', headers: authHeaders() });
    const d = await r.json();
    if (!r.ok) throw new Error(d.error || 'Gagal sinkronisasi');
    toast(d.added ? `${d.added} satuan baru ditambahkan dari Standar Harga` : 'Semua satuan sudah tersinkron, tidak ada yang baru', 'success');
    epLoadMasterSatuan({ keepFilter: true });
  } catch (err) { toast(err.message, 'error'); }
}

let _epRekeningPage = 1;
const _epRekeningPageSize = 10;
let _epRekeningCache = {}; 

async function epLoadMasterRekening(page = 1) {
  _epRekeningPage = page;
  const tb = document.getElementById('epMasterRekeningBody');
  if (tb) tb.innerHTML = `<tr class="empty-row"><td colspan="4"><span class="btn-spin" style="width:11px;height:11px;vertical-align:-1px;margin-right:6px"></span>Memuat data...</td></tr>`;
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
  document.getElementById('epRekeningAktif').value = '1';
  document.getElementById('modalRekeningTitle').textContent = kode ? 'Edit Rekening' : 'Tambah Rekening';
  if (kode) {
    const x = _epRekeningCache[kode];
    if (x) {
      document.getElementById('epRekeningKode').value = x.kode_rekening;
      document.getElementById('epRekeningKode').disabled = true;
      document.getElementById('epRekeningNama').value = x.nama_rekening;
      document.getElementById('epRekeningAktif').value = x.aktif ? '1' : '0';
    }
  }
  openModal('modalRekening');
}

async function epSaveRekening() {
  const kodeInput = document.getElementById('epRekeningKode');
  const isEdit = kodeInput.disabled;
  const kode = kodeInput.value.trim();
  const nama = document.getElementById('epRekeningNama').value.trim();
  const aktif = document.getElementById('epRekeningAktif').value === '1';
  if (!kode || !nama) { toast('Kode dan nama rekening wajib diisi', 'error'); return; }
  const btn = document.getElementById('btnSaveRekening');
  const _btnOrigHtml = btn.innerHTML;
  btn.disabled = true;
  btn.innerHTML = `<span class="btn-spin" style="width:11px;height:11px"></span> Menyimpan...`;
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
  finally { btn.disabled = false; btn.innerHTML = _btnOrigHtml; }
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

let _epPeriodeAktif = null;
async function _epFetchPeriodeAktif() {
  try {
    const r = await fetch('/api/periode/aktif', { headers: authHeaders() });
    const d = await r.json();
    return d.periode || [];
  } catch { return []; }
}

function _epApplyPeriodeAktif(list) {
  _epPeriodeAktif = (list || []).find(p => p.jenis === 'eplanning' && (!_epTahunAktif || p.tahun === _epTahunAktif)) || null;
  return _epPeriodeAktif;
}

async function epLoadPeriodeAktif() {
  const list = await _epFetchPeriodeAktif();
  return _epApplyPeriodeAktif(list);
}

let _epPickedStandarHarga = null;

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
    const tahun = (typeof _epCurrentUsulan !== 'undefined' && _epCurrentUsulan?.tahun_anggaran)
      ? _epCurrentUsulan.tahun_anggaran
      : (typeof _epTahunAktif !== 'undefined' ? _epTahunAktif : '');
    if (opts.onTyping) opts.onTyping();
    if (q.length === 1) { renderState('Ketik minimal 2 huruf…'); return; }
    renderState(q.length === 0 ? '<span class="btn-spin" style="width:11px;height:11px;vertical-align:-1px;margin-right:6px"></span>Memuat komponen…' : '<span class="btn-spin" style="width:11px;height:11px;vertical-align:-1px;margin-right:6px"></span>Mencari…');
    const kodeRekening = _epRincKodeRekeningActive || document.getElementById('epRincKodeRekening')?.dataset.kode || '';
    try {
      const qs = new URLSearchParams({ q, kategori, ...(tahun ? { tahun } : {}), ...(kodeRekening ? { kode_rekening: kodeRekening } : {}) });
      const r = await fetch(`/api/eplanning/standarharga?${qs}`, { headers: authHeaders() });
      const d = await r.json();
      if (input.value.trim() !== q) return;
      renderList(d.standarharga || []);
    } catch { renderList([]); }
  }

  return { search, close };
}

function _epApplyStandarHargaPick(x) {
  _epPickedStandarHarga = x;
  _epRincStandarHargaId = x.kategori === 'MANUAL' ? (x.id || null) : null;
  const komponenInput = document.getElementById('epRincKomponen');
  if (komponenInput) komponenInput.value = x.uraian_barang || '';
  document.getElementById('epRincSpesifikasi').value = x.spesifikasi || '';
  document.getElementById('epRincSatuan').value = x.satuan || '';
  document.getElementById('epRincHarga').value = epFmtRupiah(x.harga_satuan || 0);
  document.getElementById('epRincHarga').dataset.raw = x.harga_satuan || 0;
  document.getElementById('epRincTkdn').value = (x.tkdn != null && x.tkdn !== '') ? `${Number(x.tkdn)}%` : '0%';
  epUpdateKoefisien();

  const btn = document.getElementById('btnRekPenyusun');
  const kodeList = (x.kode_rekening || '').split(',').map(s => s.trim()).filter(Boolean);
  if (kodeList.length) {
    btn.style.display = '';
    if (kodeList.length === 1) {
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
}

function _epResetKomponenPick() {
  _epPickedStandarHarga = null;
  document.getElementById('btnRekPenyusun').style.display = 'none';
  document.getElementById('epRincTkdn').value = '';
}

function _epUpdateKompSearchBtn() {
  const kategori = document.getElementById('epRincKategoriStandar').value;
  document.getElementById('btnKompSearch').disabled = !kategori;
  const btnManual = document.getElementById('btnBuatStandarHargaManual');
  if (btnManual) btnManual.style.display = (kategori === 'MANUAL' && !_epRincReadonly) ? '' : 'none';
}

function _epUpdateRekeningWrapVisibility(kategoriStandar) {
  const rekWrap = document.getElementById('epRincRekeningWrap');
  if (!rekWrap) return;
  if (kategoriStandar === 'MANUAL') {
    rekWrap.style.display = 'none';
  } else if (document.getElementById('epRincObjekBelanja').value.trim()) {
    _epRevealRekeningWrap();
  }
}

function _epSyncJenisPaketUi() {
  if (typeof syncCustomSelect === 'function') syncCustomSelect('epRincJenisPaket');
}
function _epSyncKategoriStandarUi() {
  const sel = document.getElementById('epRincKategoriStandar');
  if (!sel) return;
  if (sel.selectedIndex < 0) {
    const wrap = sel.closest('.select-wrap');
    const textEl = wrap?.querySelector('.csel-trigger .csel-trigger-text');
    if (textEl) { textEl.textContent = sel.options[0]?.text || '-'; textEl.classList.add('placeholder'); }
    wrap?._cselPanel?.querySelectorAll('.csel-option').forEach(el => el.classList.remove('selected'));
    return;
  }
  if (typeof syncCustomSelect === 'function') syncCustomSelect('epRincKategoriStandar');
}
let _epKatManualOpt = null;
function _epSyncKategoriManualOption(paksaTampil) {
  const sel = document.getElementById('epRincKategoriStandar');
  if (!sel) return;
  const objekInput = document.getElementById('epRincObjekBelanja');
  const tampil = !!paksaTampil || objekInput?.dataset.manualHarga === '1' || sel.value === 'MANUAL';
  const ada = Array.from(sel.options).find(o => o.value === 'MANUAL');
  if (ada && !_epKatManualOpt) _epKatManualOpt = ada;
  if (tampil === !!ada) return;
  const idxSebelum = sel.selectedIndex;
  if (tampil) sel.appendChild(_epKatManualOpt || new Option('Manual (Survei Harga)', 'MANUAL'));
  else ada.remove();
  if (idxSebelum < 0) {
    sel.selectedIndex = -1;
    queueMicrotask(_epSyncKategoriStandarUi);
  }
}
function _epLepasKategoriManual() {
  const sel = document.getElementById('epRincKategoriStandar');
  if (!sel || sel.value !== 'MANUAL') return;
  sel.selectedIndex = -1;
  ['epRincKomponen', 'epRincSpesifikasi', 'epRincSatuan', 'epRincTkdn'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });
  const harga = document.getElementById('epRincHarga');
  if (harga) { harga.value = ''; delete harga.dataset.raw; }
  _epSurveiRincianReset();
  _epRincKategoriStandarChanged();
  epUpdateKoefisien();
}
function _epRincKategoriStandarChanged() {
  _epSyncKategoriStandarUi();
  const kategoriBaru = document.getElementById('epRincKategoriStandar').value;
  _epResetKomponenPick();
  _epUpdateKompSearchBtn();
  _epUpdateRekeningWrapVisibility(kategoriBaru);
  if (kategoriBaru === 'MANUAL') {
    const rekInput = document.getElementById('epRincKodeRekening');
    if (rekInput) { rekInput.value = ''; delete rekInput.dataset.kode; }
    _epRincKodeRekeningActive = '';
  }
  _epUpdateSaveRincianBtn();
}

const _epStandarHargaCombo = _epMakeStandarHargaCombobox('epRincKomponen', 'epRincKategoriStandar', {
  onPick: (x) => _epApplyStandarHargaPick(x),
  onTyping: () => _epResetKomponenPick(),
});

let _epKompPickPage = 1;
const _epKompPickPageSize = 8;
let _epKompPickRows = [];

function epOpenKomponenPicker() {
  if (!document.getElementById('epRincKategoriStandar').value) return;
  document.getElementById('epKompPickSearch').value = '';
  openModal('modalEpKomponenPicker');
  epLoadKomponenPicker(1);
}

function epSearchKomponenPicker() { epLoadKomponenPicker(1); }
function goEpKomponenPickerPage(p) { epLoadKomponenPicker(p); }

async function epLoadKomponenPicker(page) {
  _epKompPickPage = page;
  const search = document.getElementById('epKompPickSearch').value.trim();
  const kategori = document.getElementById('epRincKategoriStandar').value || 'SSH';
  const kodeRekening = _epRincKodeRekeningActive || document.getElementById('epRincKodeRekening')?.dataset.kode || '';
  const tbody = document.getElementById('epKompPickTbody');
  tbody.innerHTML = `<tr><td colspan="5" style="text-align:center;color:var(--text-secondary,#64748b)"><span class="btn-spin" style="width:11px;height:11px;vertical-align:-1px;margin-right:6px"></span>Memuat data...</td></tr>`;
  try {
    const qs = new URLSearchParams({ page, pageSize: _epKompPickPageSize, search, kategori, ...(_epTahunAktif ? { tahun: _epTahunAktif } : {}), ...(kodeRekening ? { kode_rekening: kodeRekening } : {}) });
    const r = await fetch(`/api/eplanning/standarharga?${qs}`, { headers: authHeaders() });
    const d = await r.json();
    const rows = d.standarharga || [];
    _epKompPickRows = rows;
    if (!rows.length) {
      tbody.innerHTML = `<tr><td colspan="5" style="text-align:center;color:var(--text-secondary,#64748b)">${kodeRekening ? 'Belum ada komponen yang ditag ke Kode Rekening ini' : 'Tidak ditemukan'}</td></tr>`;
    } else {
      tbody.innerHTML = rows.map((x, i) => `
        <tr class="csel-row" style="cursor:pointer" onclick="epPickKomponenFromModal(${i})">
          <td>${esc(x.uraian_barang || '')}</td>
          <td>${esc(x.spesifikasi || '-')}</td>
          <td>${esc(x.satuan || '-')}</td>
          <td>${epFmtRupiah(Number(x.harga_satuan) || 0)}</td>
          <td>${(x.tkdn != null && x.tkdn !== '') ? Number(x.tkdn) + '%' : '0%'}</td>
        </tr>`).join('');
    }
    renderPagination('epKompPickPagination', d.total || 0, page, _epKompPickPageSize, goEpKomponenPickerPage);
  } catch {
    tbody.innerHTML = `<tr><td colspan="5" style="text-align:center;color:var(--merah)">Gagal memuat</td></tr>`;
  }
}

function epPickKomponenFromModal(i) {
  const x = _epKompPickRows[i];
  if (!x) return;
  _epApplyStandarHargaPick(x);
  closeModal('modalEpKomponenPicker');
}

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
      <b>${esc(kode)}</b><br><span style="font-size:12px;color:var(--text-secondary,#64748b)" data-nama-rekening="${esc(kode)}"><span class="btn-spin" style="width:11px;height:11px;vertical-align:-1px;margin-right:6px"></span>Memuat nama rekening…</span>
    </div>`).join('');
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
  _epTampilRekList = kodeList.map(kode => ({ kode, nama: '', loading: true }));
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
      if (item) { item.nama = match ? match.nama_rekening : '(tidak ada di master rekening)'; item.loading = false; }
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
        <td>${esc(it.kode)}${it.loading ? ' <span style="color:var(--teks-muted)"><span class="btn-spin" style="width:11px;height:11px;vertical-align:-1px;margin-right:6px"></span>Memuat nama rekening…</span>' : (it.nama ? ' ' + esc(it.nama) : '')}</td>
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

let _epShKategori = 'SSH';
let _epShPage = 1;
let _epShPageSize = 20;
let _epShCache = {};

async function epDownloadStandarHargaPDF(btnEl) {
  const originalHtml = btnEl ? btnEl.innerHTML : null;
  if (btnEl) { btnEl.disabled = true; btnEl.innerHTML = `<span class="btn-spin" style="width:12px;height:12px"></span> Menyiapkan...`; }
  try {
    const search = (document.getElementById('epShSearch')?.value || '').trim();
    const status = document.getElementById('epShFilterStatus')?.value || '';
    const satuan = document.getElementById('epShFilterSatuan')?.value || '';
    const pageSize = 100;
    const _epShQS = (page) => new URLSearchParams({ page, pageSize, search, kategori: _epShKategori, status, satuan, ...(_epTahunAktif ? { tahun: _epTahunAktif } : {}) });
    const r1 = await fetch(`/api/eplanning/standarharga?${_epShQS(1)}`, { headers: authHeaders() });
    const d1 = await r1.json();
    if (!r1.ok) throw new Error(d1.error || 'Gagal memuat data');
    const allRows = [...(d1.standarharga || [])];
    const total = d1.total || 0;
    const totalPages = Math.max(1, Math.ceil(total / pageSize));

    if (totalPages > 1) {
      const restPages = Array.from({ length: totalPages - 1 }, (_, i) => i + 2);
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
    ['SSH', 'HSPK', 'ASB', 'SBU', 'MANUAL'].forEach(k => {
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
  MANUAL: 'Manual - Survei Harga Pengguna',
};

const EP_SH_KATEGORI_ICON_PATH = {
  SSH: 'M11.0049 20.9997C11.0049 20.1712 10.3333 19.4997 9.50488 19.4997C8.67646 19.4997 8.00488 20.1712 8.00488 20.9997H3.00488C2.4526 20.9997 2.00488 20.5519 2.00488 19.9997V3.99966C2.00488 3.44738 2.4526 2.99966 3.00488 2.99966H8.00488C8.00488 3.82809 8.67646 4.49966 9.50488 4.49966C10.3333 4.49966 11.0049 3.82809 11.0049 2.99966H21.0049C21.5572 2.99966 22.0049 3.44738 22.0049 3.99966V9.49966C20.6242 9.49966 19.5049 10.619 19.5049 11.9997C19.5049 13.3804 20.6242 14.4997 22.0049 14.4997V19.9997C22.0049 20.5519 21.5572 20.9997 21.0049 20.9997H11.0049ZM9.50488 10.4997C10.3333 10.4997 11.0049 9.82809 11.0049 8.99966C11.0049 8.17124 10.3333 7.49966 9.50488 7.49966C8.67646 7.49966 8.00488 8.17124 8.00488 8.99966C8.00488 9.82809 8.67646 10.4997 9.50488 10.4997ZM9.50488 16.4997C10.3333 16.4997 11.0049 15.8281 11.0049 14.9997C11.0049 14.1712 10.3333 13.4997 9.50488 13.4997C8.67646 13.4997 8.00488 14.1712 8.00488 14.9997C8.00488 15.8281 8.67646 16.4997 9.50488 16.4997Z',
  HSPK: 'M15 21H9V10H15V21ZM17 21V10H22V20C22 20.5523 21.5523 21 21 21H17ZM7 21H3C2.44772 21 2 20.5523 2 20V10H7V21ZM22 8H2V4C2 3.44772 2.44772 3 3 3H21C21.5523 3 22 3.44772 22 4V8Z',
  ASB: 'M3 12H7V21H3V12ZM17 8H21V21H17V8ZM10 2H14V21H10V2Z',
  SBU: 'M17 15.2454V22.1169C17 22.393 16.7761 22.617 16.5 22.617C16.4094 22.617 16.3205 22.5923 16.2428 22.5457L12 20L7.75725 22.5457C7.52046 22.6877 7.21333 22.6109 7.07125 22.3742C7.02463 22.2964 7 22.2075 7 22.1169V15.2454C5.17107 13.7793 4 11.5264 4 9C4 4.58172 7.58172 1 12 1C16.4183 1 20 4.58172 20 9C20 11.5264 18.8289 13.7793 17 15.2454ZM12 15C15.3137 15 18 12.3137 18 9C18 5.68629 15.3137 3 12 3C8.68629 3 6 5.68629 6 9C6 12.3137 8.68629 15 12 15ZM12 13C9.79086 13 8 11.2091 8 9C8 6.79086 9.79086 5 12 5C14.2091 5 16 6.79086 16 9C16 11.2091 14.2091 13 12 13Z',
  MANUAL: 'M12.8995 6.85453L17.1421 11.0972L7.24264 20.9967H3V16.754L12.8995 6.85453ZM14.3137 5.44032L16.435 3.319C16.8256 2.92848 17.4587 2.92848 17.8492 3.319L20.6777 6.14743C21.0682 6.53795 21.0682 7.17112 20.6777 7.56164L18.5563 9.68296L14.3137 5.44032Z',
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
  if (typeof window.initCustomSelects === 'function') window.initCustomSelects();
  
  
  
  
  
  const psWrap = c.querySelector('.ep-sh-pagesize-select');
  if (psWrap && psWrap._cselPanel) psWrap._cselPanel.classList.add('ep-sh-pagesize-panel');
}

async function epLoadStandarHarga(page = 1) {
  _epShPage = page;
  const tb = document.getElementById('epStandarHargaBody');
  if (tb) tb.innerHTML = `<tr class="empty-row"><td colspan="9"><span class="btn-spin" style="width:11px;height:11px;vertical-align:-1px;margin-right:6px"></span>Memuat data...</td></tr>`;
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
            : (x.kategori === 'MANUAL' ? 'Manual (Survei Harga)' : 'Tanpa Kode Rekening');
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
    const _shPages = Math.ceil((d.total || 0) / _epShPageSize);
    const _shRestore = (page === 1 && _shPages > 1 && typeof _pgTakeRestore === 'function') ? _pgTakeRestore('epStandarHargaPg', _shPages) : 0;
    if (_shRestore > 1) { epLoadStandarHarga(_shRestore); return; }
    if (d.total > 0 && typeof _pgSave === 'function') _pgSave('epStandarHargaPg', page);
    renderShPagination(d.total || 0);
  } catch (err) {
    if (tb) tb.innerHTML = `<tr class="empty-row"><td colspan="9">Gagal memuat</td></tr>`;
    toast(err.message, 'error');
  }
  epLoadStandarHargaCounts();
  const isAdminNow = _user.is_admin || (typeof hasAccess === 'function' && hasAccess('eplanning.admin'));
  const btnImp = document.getElementById('btnImporStandarHarga');
  const btnAdd = document.getElementById('btnTambahStandarHarga');
  const btnPengaturan = document.getElementById('btnPengaturanKalkulator');
  if (btnImp) btnImp.style.display = isAdminNow ? '' : 'none';
  if (btnAdd) btnAdd.style.display = isAdminNow ? '' : 'none';
  if (btnPengaturan) btnPengaturan.style.display = isAdminNow ? '' : 'none';
}

const _EP_PERSEN_PAJAK_FALLBACK = 12.5;
let _epPengaturanTahunan = [];
let _epPengaturanTahunanLoaded = false;
function _epCariPengaturanTahun(tahun) {
  return _epPengaturanTahunan.find(r => parseInt(r.tahun, 10) === tahun) || null;
}
let _epBuktiToko = { 1: [], 2: [], 3: [] };
function _epEscHtml(s) {
  return String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
async function epLoadPengaturanTahunan(force = false) {
  if (_epPengaturanTahunanLoaded && !force) return _epPengaturanTahunan;
  try {
    const r = await fetch('/api/eplanning/pengaturantahunan', { headers: authHeaders() });
    const d = await r.json();
    if (r.ok && Array.isArray(d.pengaturan)) { _epPengaturanTahunan = d.pengaturan; _epPengaturanTahunanLoaded = true; }
  } catch {  }
  return _epPengaturanTahunan;
}

async function _epLoadKalkulatorSemua(force = false) {
  await epLoadPengaturanTahunan(force);
}

function epToggleShKalkulator() {
  const box = document.getElementById('epShKalkulatorBox');
  const showing = box.style.display !== 'none';
  box.style.display = showing ? 'none' : 'block';
  if (!showing) _epLoadKalkulatorSemua().then(() => epHitungShKalkulator());
}

function _epRupiah(n) {
  return 'Rp' + Math.round(n || 0).toLocaleString('id-ID');
}

function _epFormatRupiahLive(el) {
  const raw = (el.value || '').replace(/[^\d]/g, '');
  el.value = raw ? 'Rp ' + Number(raw).toLocaleString('id-ID') : '';
}
function _epParseRupiah(id) {
  const raw = (document.getElementById(id).value || '').replace(/[^\d]/g, '');
  return raw ? parseInt(raw, 10) : 0;
}
function _epSetRupiah(id, angka) {
  const el = document.getElementById(id);
  if (el) el.value = (angka || angka === 0) ? 'Rp ' + Math.round(angka).toLocaleString('id-ID') : '';
}

const _EP_PERSEN_UNTUNG_MIN = 5, _EP_PERSEN_UNTUNG_MAX = 15;
function _epPersenUntungShKalkulator() {
  const v = parseFloat(document.getElementById('epShPersenUntung').value);
  if (!isFinite(v)) return 0;
  return Math.min(_EP_PERSEN_UNTUNG_MAX, Math.max(_EP_PERSEN_UNTUNG_MIN, v));
}
function _epClampPersenUntung() {
  const el = document.getElementById('epShPersenUntung');
  const v = parseFloat(el.value);
  if (isFinite(v)) el.value = Math.min(_EP_PERSEN_UNTUNG_MAX, Math.max(_EP_PERSEN_UNTUNG_MIN, v));
  else el.value = '';
  epHitungShKalkulator();
}
function _epLinkTokoValid(v) {
  v = (v || '').trim();
  if (!v) return true;
  try {
    const u = new URL(v);
    return (u.protocol === 'http:' || u.protocol === 'https:') && /^[^.\s]+(\.[^.\s]+)+$/.test(u.hostname);
  } catch { return false; }
}
function _epBersihkanErrorLink(el) {
  clearTimeout(el._errTimer);
  el.classList.remove('input-invalid');
  const err = el.parentElement.querySelector('.field-error');
  if (err) err.remove();
}
function _epCekLinkToko(el) {
  _epBersihkanErrorLink(el);
  if (_epLinkTokoValid(el.value)) return true;
  el.classList.add('input-invalid');
  el.insertAdjacentHTML('afterend', '<div class="field-error">Link tidak valid. Awali dengan https:// (contoh: https://katalog.inaproc.id/...)</div>');
  el._errTimer = setTimeout(() => _epBersihkanErrorLink(el), 2000);
  return false;
}
function _epValidasiLinkSemuaToko() {
  let pertama = null;
  [1, 2, 3].forEach(i => {
    const el = document.getElementById(`epShT${i}Link`);
    if (!_epCekLinkToko(el) && !pertama) pertama = { el, i };
  });
  if (pertama) {
    toast(`Link Toko ${pertama.i} tidak valid - harus diawali http:// atau https://`, 'error');
    pertama.el.focus();
    return false;
  }
  return true;
}
function _epValidasiTigaToko() {
  for (let i = 1; i <= 3; i++) {
    const nama = (document.getElementById(`epShT${i}Nama`).value || '').trim();
    const harga = _epParseRupiah(`epShT${i}Harga`);
    if (!nama) {
      toast(`Nama Toko ${i} wajib diisi (survei harus 3 toko)`, 'error');
      document.getElementById(`epShT${i}Nama`).focus();
      return false;
    }
    if (harga <= 0) {
      toast(`Harga Toko ${i} wajib diisi (survei harus 3 toko)`, 'error');
      document.getElementById(`epShT${i}Harga`).focus();
      return false;
    }
    const files = _epBuktiToko[i] || [];
    if (files.some(x => x._loading)) {
      toast(`Bukti Harga Toko ${i} masih diupload, tunggu sampai selesai`, 'error');
      return false;
    }
    if (!files.some(x => x.url)) {
      toast(`Bukti Harga Toko ${i} wajib diupload (survei harus 3 toko)`, 'error');
      document.getElementById(`epShT${i}BuktiBtn`)?.focus();
      return false;
    }
  }
  return true;
}
function _epValidasiPersenUntung() {
  const v = parseFloat(document.getElementById('epShPersenUntung').value);
  if (!isFinite(v) || v < _EP_PERSEN_UNTUNG_MIN || v > _EP_PERSEN_UNTUNG_MAX) {
    toast(`Keuntungan + Overhead wajib diisi (${_EP_PERSEN_UNTUNG_MIN}% - ${_EP_PERSEN_UNTUNG_MAX}%)`, 'error');
    document.getElementById('epShPersenUntung').focus();
    return false;
  }
  return true;
}

function epHitungShKalkulator() {
  const t1 = _epParseRupiah('epShT1Harga');
  const t2 = _epParseRupiah('epShT2Harga');
  const t3 = _epParseRupiah('epShT3Harga');
  const ongkir = _epParseRupiah('epShOngkir');
  const tahunItem = parseInt(document.getElementById('epShTahun').value, 10) || 0;
  const pengaturanTahun = _epCariPengaturanTahun(tahunItem);
  const tahunBerlaku = !!pengaturanTahun;
  const persenUntung = _epPersenUntungShKalkulator();
  const persenPajak = tahunBerlaku ? (Number(pengaturanTahun.persen_pajak) || 0) : _EP_PERSEN_PAJAK_FALLBACK;
  const persenInflasi = tahunBerlaku ? (Number(pengaturanTahun.persen_inflasi) || 0) : 0;

  const isi = [t1, t2, t3].filter(v => v > 0);
  const rata2 = isi.length ? isi.reduce((a, b) => a + b, 0) / isi.length : 0;
  const totalReal = rata2 + ongkir;
  const untung = totalReal * (persenUntung / 100);
  const jumlah = totalReal + untung;
  const ppn = jumlah * (persenPajak / 100);
  const inflasi = jumlah * (persenInflasi / 100);
  const totalHarga = jumlah + ppn + inflasi;
  const bulat = Math.round(totalHarga / 1000) * 1000;

  document.getElementById('epShCalcRata').textContent = _epRupiah(rata2);
  document.getElementById('epShCalcTotalReal').textContent = _epRupiah(totalReal);
  const untungLabelEl = document.getElementById('epShCalcUntungLabel');
  if (untungLabelEl) untungLabelEl.textContent = `Keuntungan + Overhead (${persenUntung}%)`;
  document.getElementById('epShCalcUntung').textContent = _epRupiah(untung);
  document.getElementById('epShCalcJumlah').textContent = _epRupiah(jumlah);
  const ppnLabelEl = document.getElementById('epShCalcPpnLabel');
  if (ppnLabelEl) ppnLabelEl.textContent = tahunBerlaku ? `PPN + PPh (${persenPajak}%)` : `PPN + PPh (${persenPajak}% - belum diatur utk TA ${tahunItem || '-'})`;
  document.getElementById('epShCalcPpn').textContent = _epRupiah(ppn);
  const inflasiLabelEl = document.getElementById('epShCalcInflasiLabel');
  if (inflasiLabelEl) inflasiLabelEl.textContent = tahunBerlaku ? `Indeks Inflasi (${persenInflasi}%)` : `Indeks Inflasi (belum diatur utk TA ${tahunItem || '-'})`;
  document.getElementById('epShCalcInflasi').textContent = _epRupiah(inflasi);
  document.getElementById('epShCalcTotal').textContent = _epRupiah(totalHarga);
  document.getElementById('epShCalcBulat').textContent = _epRupiah(bulat);
  return bulat;
}

function _epRingkasanSurveiKalkulator() {
  const baris = [];
  [1, 2, 3].forEach(i => {
    const nama = (document.getElementById(`epShT${i}Nama`).value || '').trim();
    const harga = _epParseRupiah(`epShT${i}Harga`);
    if (harga > 0) baris.push(`${nama || `Toko ${i}`}: ${_epRupiah(harga)}`);
  });
  const ongkir = _epParseRupiah('epShOngkir');
  const tahunItem = parseInt(document.getElementById('epShTahun').value, 10) || 0;
  const persenUntung = _epPersenUntungShKalkulator();
  const pengaturanTahun = _epCariPengaturanTahun(tahunItem);
  const persenInflasi = pengaturanTahun ? (Number(pengaturanTahun.persen_inflasi) || 0) : 0;
  baris.push(`Ongkir: ${_epRupiah(ongkir)}`, `Keuntungan+Overhead: ${persenUntung}%`, `Indeks Inflasi: ${pengaturanTahun ? `${persenInflasi}%` : `0% (belum diatur utk TA ${tahunItem || '-'})`}`);
  return `Hasil kalkulator survei 3 toko - ${baris.join(', ')}.`;
}

function _epSurveiTokoData() {
  const toko = [1, 2, 3].map(i => {
    const files = (_epBuktiToko[i] || []).filter(f => f.url && !f._loading);
    return {
      nama: (document.getElementById(`epShT${i}Nama`).value || '').trim(),
      harga: _epParseRupiah(`epShT${i}Harga`),
      link: (document.getElementById(`epShT${i}Link`).value || '').trim(),
      bukti_url: files.length ? JSON.stringify(files.map(f => ({ url: f.url, name: f.name }))) : '',
    };
  }).filter(t => t.nama || t.harga || t.link || t.bukti_url);
  return {
    toko,
    ongkir: _epParseRupiah('epShOngkir'),
    persen_untung: _epPersenUntungShKalkulator(),
  };
}

function _epMuatBuktiToko(t) {
  if (!t || !t.bukti_url) return [];
  try {
    const parsed = JSON.parse(t.bukti_url);
    if (Array.isArray(parsed)) return parsed.filter(f => f && f.url);
  } catch {  }
  return [{ url: t.bukti_url, name: t.bukti_name || 'Dokumen' }];
}

let _epBuktiTokoProgress = { 1: null, 2: null, 3: null };
async function epUploadBuktiToko(input, n) {
  const files = Array.from(input.files || []).filter(f => {
    if (f.size > 2 * 1024 * 1024) { toast(`${f.name}: file terlalu besar (maks. 2 MB)`, 'error'); return false; }
    return true;
  });
  if (!files.length) { input.value = ''; return; }
  _epBuktiTokoProgress[n] = { current: 0, total: files.length };
  _epRenderBuktiTokoUi(n);
  let okCount = 0;
  const failMsgs = [];
  for (const file of files) {
    const idx = _epBuktiToko[n].push({ url: null, name: file.name, _loading: true }) - 1;
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('kategori', 'eplanning_survei_harga');
      const r = await fetch('/api/upload', {
        method: 'POST',
        headers: { 'Authorization': authHeaders()['Authorization'] },
        body: formData,
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(d.error || 'Gagal upload');
      _epBuktiToko[n][idx] = { url: d.url, name: d.name || file.name };
      okCount++;
    } catch (err) {
      failMsgs.push(`${file.name}: ${err.message}`);
      _epBuktiToko[n].splice(idx, 1);
    }
    _epBuktiTokoProgress[n].current++;
    _epRenderBuktiTokoUi(n);
  }
  _epBuktiTokoProgress[n] = null;
  _epRenderBuktiTokoUi(n);
  input.value = '';
  if (failMsgs.length && okCount) toast(`${okCount} file berhasil diupload, ${failMsgs.length} gagal (${failMsgs[0]})`, 'error');
  else if (failMsgs.length) toast(failMsgs.length > 1 ? `${failMsgs.length} file gagal diupload (${failMsgs[0]})` : failMsgs[0], 'error');
  else toast(okCount > 1 ? `${okCount} file berhasil diupload` : 'File berhasil diupload');
}

async function epHapusSemuaBuktiToko(n) {
  const ok = await showConfirm({ title: 'Hapus Bukti', msg: 'Hapus semua bukti harga toko ini? File juga akan dihapus permanen dari server.', okText: 'Ya, Hapus', icon: 'trash', type: 'danger' });
  if (!ok) return;
  const toDelete = (_epBuktiToko[n] || []).filter(f => f.url);
  _epBuktiToko[n] = [];
  _epRenderBuktiTokoUi(n);
  await Promise.all(toDelete.map(f => deleteCloudinaryFile(f.url).catch(() => {})));
  toast('Bukti dihapus');
}

function _epRenderBuktiTokoUi(n) {
  const files = _epBuktiToko[n] || [];
  const doneFiles = files.filter(f => f.url && !f._loading);
  const prog = _epBuktiTokoProgress[n];

  const btn = document.getElementById(`epShT${n}BuktiBtn`);
  btn.disabled = !!prog;
  const hideBtn = !!(doneFiles.length && !prog);
  btn.style.display = hideBtn ? 'none' : '';
  if (btn.parentElement) btn.parentElement.style.minHeight = hideBtn ? '0' : '';
  if (prog) {
    btn.style.background = '#fef3c7';
    btn.style.color = '#92400e';
    btn.style.borderColor = 'transparent';
    btn.innerHTML = `${prog.total <= 1 ? `<svg width="12" height="12" viewBox="0 0 36 36" style="display:inline-block;flex-shrink:0;margin-right:5px">
        <circle cx="18" cy="18" r="15" fill="none" stroke="#fde68a" stroke-width="5"/>
        <circle cx="18" cy="18" r="15" fill="none" stroke="#92400e" stroke-width="5"
          stroke-linecap="round" pathLength="100" stroke-dasharray="100" stroke-dashoffset="0"
          transform="rotate(-90 18 18)"></circle>
      </svg>` : `<span class="btn-spin" style="width:12px;height:12px;margin-right:5px"></span>`}<span class="bukti-btn-label">Mengupload…${prog.total > 1 ? ` ${prog.current}/${prog.total}` : ''}</span>`;
  } else {
    btn.style.background = '#fee2e2';
    btn.style.color = '#991b1b';
    btn.style.borderColor = '#fca5a5';
    btn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" style="margin-right:5px"><path stroke-linecap="round" stroke-linejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"/></svg><span class="bukti-btn-label">Upload</span>`;
  }

  const listEl = document.getElementById(`epShT${n}BuktiList`);
  if (!listEl) return;
  if (!doneFiles.length || prog) { listEl.innerHTML = ''; return; }
  const labelTxt = doneFiles.length > 1 ? `Uploaded (${doneFiles.length})` : 'Uploaded';
  listEl.innerHTML = `
    <span style="display:inline-flex;align-items:center;gap:3px;margin-top:6px">
      <span style="display:inline-flex;align-items:center;padding:4px 10px;border-radius:6px;font-size:.75rem;font-weight:600;font-family:inherit;background:#d1fae5;color:#065f46;opacity:.85;white-space:nowrap">
        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5" style="margin-right:5px"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"/></svg>${labelTxt}
      </span>
      <button type="button" onclick="epLihatBuktiToko(${n})" data-tip="Preview bukti harga"
        style="display:inline-flex;align-items:center;justify-content:center;width:26px;height:26px;border-radius:6px;border:none;cursor:pointer;background:#dbeafe;color:#1d4ed8">
        <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path stroke-linecap="round" stroke-linejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg>
      </button>
      <button type="button" onclick="epHapusSemuaBuktiToko(${n})" data-tip="Hapus bukti"
        style="display:inline-flex;align-items:center;justify-content:center;width:26px;height:26px;border-radius:6px;border:none;cursor:pointer;background:#fee2e2;color:#991b1b">
        <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path stroke-linecap="round" stroke-linejoin="round" d="M19 6l-1 14H6L5 6"/><path stroke-linecap="round" stroke-linejoin="round" d="M10 11v6m4-6v6"/><path stroke-linecap="round" stroke-linejoin="round" d="M9 6V4h6v2"/></svg>
      </button>
    </span>`;
}

function epLihatBuktiToko(n, idx = 0) {
  const open = (startIdx) => {
    const files = (_epBuktiToko[n] || []).filter(f => f.url && !f._loading);
    if (!files.length) { closeDocPreview(); return; }
    const start = Math.max(0, Math.min(startIdx, files.length - 1));
    const onDelete = async (i) => {
      const ok = await showConfirm({ title: 'Hapus Bukti', msg: 'Hapus bukti harga ini? File juga akan dihapus permanen dari server.', okText: 'Ya, Hapus', icon: 'trash', type: 'danger' });
      if (!ok) return;
      const target = files[i];
      const realIdx = _epBuktiToko[n].indexOf(target);
      if (realIdx !== -1) _epBuktiToko[n].splice(realIdx, 1);
      _epRenderBuktiTokoUi(n);
      open(i);
      if (target?.url) deleteCloudinaryFile(target.url).catch(() => {});
      toast('Bukti dihapus');
    };
    viewDocMulti(files.map(f => ({ url: f.url, name: f.name })), start, `Bukti Harga Toko ${n}`, onDelete);
  };
  open(idx);
}

function epPakaiHasilShKalkulator() {
  const bulat = epHitungShKalkulator();
  if (!_epValidasiTigaToko()) return;
  if (!bulat) { toast('Isi dulu harga survei ketiga toko', 'error'); return; }
  if (!_epValidasiLinkSemuaToko()) return;
  if (!_epValidasiPersenUntung()) return;
  _epSetRupiah('epShHarga', bulat);
  toast('Harga satuan diisi dari hasil kalkulator survei', 'success');
}

function _epResetShKalkulator() {
  ['epShT1Nama', 'epShT1Harga', 'epShT2Nama', 'epShT2Harga', 'epShT3Nama', 'epShT3Harga',
    'epShT1Link', 'epShT2Link', 'epShT3Link'].forEach(id => {
    document.getElementById(id).value = '';
  });
  [1, 2, 3].forEach(i => {
    _epBersihkanErrorLink(document.getElementById(`epShT${i}Link`));
    _epBuktiToko[i] = [];
    _epRenderBuktiTokoUi(i);
  });
  _epSetRupiah('epShOngkir', 0);
  document.getElementById('epShKalkulatorBox').style.display = 'none';
  document.getElementById('epShPersenUntung').value = '';
  _epLoadKalkulatorSemua().then(() => epHitungShKalkulator());
}

let _epPengaturanTahunanSeq = 0;
const _epPengaturanTahunanPageSize = 5;
let _epPengaturanTahunanPage = 1;
function _epPengaturanTahunanApplyPage() {
  const rows = Array.from(document.querySelectorAll('#epPengaturanTahunanList .ep-pengaturan-tahun-row'));
  const pages = Math.max(1, Math.ceil(rows.length / _epPengaturanTahunanPageSize));
  if (_epPengaturanTahunanPage > pages) _epPengaturanTahunanPage = pages;
  if (_epPengaturanTahunanPage < 1) _epPengaturanTahunanPage = 1;
  const start = (_epPengaturanTahunanPage - 1) * _epPengaturanTahunanPageSize;
  rows.forEach((row, i) => {
    row.style.display = (i >= start && i < start + _epPengaturanTahunanPageSize) ? '' : 'none';
  });
  renderPagination('epPengaturanTahunanPagination', rows.length, _epPengaturanTahunanPage, _epPengaturanTahunanPageSize, 'goEpPengaturanTahunanPage');
}
window.goEpPengaturanTahunanPage = (p) => { _epPengaturanTahunanPage = p; _epPengaturanTahunanApplyPage(); };
function _epPengaturanTahunanViewRowHtml(tahun, pajak, inflasi, rowId) {
  return `<tr class="ep-pengaturan-tahun-row" data-row-id="${rowId}" data-mode="view"
    data-tahun="${esc(tahun ?? '')}" data-pajak="${esc(pajak ?? '')}" data-inflasi="${esc(inflasi ?? '')}">
    <td>${esc(tahun ?? '')}</td>
    <td>${esc(pajak ?? '')}</td>
    <td>${esc(inflasi ?? '')}</td>
    <td class="ep-pt-actions">
      <button type="button" class="btn-edit" data-tip="Edit tahun ini" onclick="_epPengaturanTahunanEditRow(${rowId})">${EP_ICON_EDIT}</button>
      <button type="button" class="btn-hapus" data-tip="Hapus tahun ini" onclick="_epPengaturanTahunanRemoveRow(${rowId})">${EP_ICON_TRASH}</button>
    </td>
  </tr>`;
}
function _epPengaturanTahunanEditRowHtml(tahun, pajak, inflasi, rowId) {
  return `<tr class="ep-pengaturan-tahun-row" data-row-id="${rowId}" data-mode="edit">
    <td><input type="number" class="ep-pt-tahun" placeholder="2026" value="${tahun ?? ''}" min="2000" max="2100" /></td>
    <td><input type="number" class="ep-pt-pajak" placeholder="12.5" value="${pajak ?? ''}" step="0.01" min="0" max="100" /></td>
    <td><input type="number" class="ep-pt-inflasi" placeholder="0" value="${inflasi ?? ''}" step="0.01" min="0" max="100" /></td>
    <td class="ep-pt-actions">
      <button type="button" class="btn-edit ep-pt-btn-simpan-baris" data-tip="Simpan baris ini" onclick="_epPengaturanTahunanSaveRow(${rowId})">${EP_ICON_CHECK}</button>
      <button type="button" class="btn-hapus" data-tip="Hapus tahun ini" onclick="_epPengaturanTahunanRemoveRow(${rowId})">${EP_ICON_TRASH}</button>
    </td>
  </tr>`;
}
function _epPengaturanTahunanAddRow(tahun = '', pajak = '', inflasi = '', mode = 'edit', goToRow = true) {
  const id = ++_epPengaturanTahunanSeq;
  const html = mode === 'view'
    ? _epPengaturanTahunanViewRowHtml(tahun, pajak, inflasi, id)
    : _epPengaturanTahunanEditRowHtml(tahun, pajak, inflasi, id);
  document.getElementById('epPengaturanTahunanList').insertAdjacentHTML('beforeend', html);
  if (goToRow) {
    const total = document.querySelectorAll('#epPengaturanTahunanList .ep-pengaturan-tahun-row').length;
    _epPengaturanTahunanPage = Math.ceil(total / _epPengaturanTahunanPageSize);
    _epPengaturanTahunanApplyPage();
  }
}
function _epPengaturanTahunanRemoveRow(rowId) {
  const el = document.querySelector(`.ep-pengaturan-tahun-row[data-row-id="${rowId}"]`);
  if (el) el.remove();
  _epPengaturanTahunanApplyPage();
}
function _epPengaturanTahunanEditRow(rowId) {
  const el = document.querySelector(`.ep-pengaturan-tahun-row[data-row-id="${rowId}"]`);
  if (!el) return;
  const { tahun, pajak, inflasi } = el.dataset;
  el.outerHTML = _epPengaturanTahunanEditRowHtml(tahun, pajak, inflasi, rowId);
}
async function _epPengaturanTahunanSaveRow(rowId) {
  const rowEl = document.querySelector(`.ep-pengaturan-tahun-row[data-row-id="${rowId}"]`);
  if (!rowEl) return;
  const tahunEl = rowEl.querySelector('.ep-pt-tahun');
  if (tahunEl && (tahunEl.value === '' || rowEl.querySelector('.ep-pt-pajak').value === '')) {
    toast('Tahun dan PPN+PPh wajib diisi', 'error');
    return;
  }
  const rows = _epPengaturanTahunanCollect();
  const btn = rowEl.querySelector('.ep-pt-btn-simpan-baris');
  if (btn) btn.disabled = true;
  try {
    const r = await fetch('/api/eplanning/pengaturantahunan', {
      method: 'PUT', headers: { ...authHeaders(), 'Content-Type': 'application/json' }, body: JSON.stringify({ rows }),
    });
    const d = await r.json();
    if (!r.ok) throw new Error(d.error || 'Gagal menyimpan pengaturan');
    _epPengaturanTahunan = d.pengaturan;
    _epPengaturanTahunanRenderFromData(_epPengaturanTahunan, _epPengaturanTahunanPage);
    toast('Setting tahun ini tersimpan', 'success');
    epHitungShKalkulator();
  } catch (err) { toast(err.message, 'error'); }
  finally { if (btn) btn.disabled = false; }
}
function _epPengaturanTahunanRenderFromData(list, page = 1) {
  document.getElementById('epPengaturanTahunanList').innerHTML = '';
  _epPengaturanTahunanPage = page;
  if (!list.length) {
    _epPengaturanTahunanAddRow('', '', '', 'edit', false);
  } else {
    list.forEach(r => _epPengaturanTahunanAddRow(r.tahun, r.persen_pajak, r.persen_inflasi, 'view', false));
  }
  _epPengaturanTahunanApplyPage();
}
function _epPengaturanTahunanCollect() {
  return Array.from(document.querySelectorAll('.ep-pengaturan-tahun-row')).map(row => {
    if (row.dataset.mode === 'view') {
      return {
        tahun: row.dataset.tahun || '',
        persen_pajak: row.dataset.pajak || '',
        persen_inflasi: row.dataset.inflasi || '',
      };
    }
    return {
      tahun: row.querySelector('.ep-pt-tahun').value,
      persen_pajak: row.querySelector('.ep-pt-pajak').value,
      persen_inflasi: row.querySelector('.ep-pt-inflasi').value,
    };
  }).filter(r => r.tahun !== '' && r.persen_pajak !== '');
}

async function epOpenPengaturanKalkulator() {
  await epLoadPengaturanTahunan(true);
  _epPengaturanTahunanRenderFromData(_epPengaturanTahunan);
  openModal('modalPengaturanKalkulator');
}

async function epSavePengaturanKalkulator() {
  const rows = _epPengaturanTahunanCollect();
  const btn = document.getElementById('btnSavePengaturanKalkulator');
  const _btnOrigHtml = btn.innerHTML;
  btn.disabled = true;
  btn.innerHTML = `<span class="btn-spin" style="width:11px;height:11px"></span> Menyimpan...`;
  try {
    const r = await fetch('/api/eplanning/pengaturantahunan', {
      method: 'PUT', headers: { ...authHeaders(), 'Content-Type': 'application/json' }, body: JSON.stringify({ rows }),
    });
    const d = await r.json();
    if (!r.ok) throw new Error(d.error || 'Gagal menyimpan pengaturan');
    _epPengaturanTahunan = d.pengaturan;
    toast('Parameter kalkulator diperbarui', 'success');
    closeModal('modalPengaturanKalkulator');
    epHitungShKalkulator();
  } catch (err) { toast(err.message, 'error'); }
  finally { btn.disabled = false; btn.innerHTML = _btnOrigHtml; }
}

let _epRincManualMode = false;

function _epUpdateShFieldVisibility() {
  const isManual = document.getElementById('epShKategori').value === 'MANUAL';
  const metaBlock = document.getElementById('epShMetaSipdBlock');
  const tkdnField = document.getElementById('epShTkdnField');
  if (metaBlock) metaBlock.style.display = isManual ? 'none' : '';
  if (tkdnField) tkdnField.style.display = isManual ? 'none' : '';
  const rekField = document.getElementById('epShKodeRekeningField');
  if (rekField) {
    rekField.style.display = isManual ? 'none' : '';
    if (isManual) {
      _epShRekeningMulti.setValue('');
      document.getElementById('epShKodeRekeningInput').value = '';
    }
  }
  const hargaEl = document.getElementById('epShHarga');
  if (hargaEl) {
    hargaEl.readOnly = isManual;
    hargaEl.style.background = isManual ? 'var(--abu-1)' : '';
    hargaEl.style.color = isManual ? 'var(--text-secondary,#64748b)' : '';
    hargaEl.placeholder = isManual ? 'Isi dari kalkulator Survei Harga (3 Toko)' : '';
  }
}

function openStandarHargaModal(id = null) {
  _epResetShKalkulator();
  _epRincManualMode = false;
  if (!_epRincSatuanOptions.length) epLoadSatuanOptions();
  document.getElementById('epShId').value = id || '';
  document.getElementById('epShKategori').disabled = false;
  document.getElementById('epShKategori').value = _epShKategori;
  document.getElementById('epShTahun').value = _epTahunAktif || '';
  document.getElementById('epShTahun').disabled = false;
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
  document.getElementById('epShAktif').value = '1';
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
      _epSetRupiah('epShHarga', x.harga_satuan);
      document.getElementById('epShTkdn').value = x.tkdn != null ? x.tkdn : '';
      _epShRekeningMulti.setValue(x.kode_rekening || '');
      document.getElementById('epShAktif').value = x.aktif ? '1' : '0';
      if (x.kategori === 'MANUAL' && x.survei_toko) {
        let survei = null;
        try { survei = JSON.parse(x.survei_toko); } catch { survei = null; }
        if (survei) {
          (survei.toko || []).forEach((t, idx) => {
            const n = idx + 1;
            if (n > 3) return;
            document.getElementById(`epShT${n}Nama`).value = t.nama || '';
            _epSetRupiah(`epShT${n}Harga`, t.harga || 0);
            document.getElementById(`epShT${n}Link`).value = t.link || '';
            _epBuktiToko[n] = _epMuatBuktiToko(t);
            _epRenderBuktiTokoUi(n);
          });
          _epSetRupiah('epShOngkir', survei.ongkir || 0);
          if (survei.persen_untung) document.getElementById('epShPersenUntung').value = survei.persen_untung;
          document.getElementById('epShKalkulatorBox').style.display = 'block';
          _epLoadKalkulatorSemua().then(() => epHitungShKalkulator());
        }
      }
    }
  }
  _epUpdateShFieldVisibility();
  openModal('modalStandarHarga');
}

function epOpenStandarHargaManualFromRincian() {
  openStandarHargaModal(null);
  _epRincManualMode = true;
  document.getElementById('modalStandarHargaTitle').textContent = 'Standar Harga Manual (Survei 3 Toko)';
  document.getElementById('epShKategori').value = 'MANUAL';
  document.getElementById('epShKategori').disabled = true;
  _epUpdateShFieldVisibility();
  document.getElementById('epShTahun').value = (typeof _epCurrentUsulan !== 'undefined' && _epCurrentUsulan?.tahun_anggaran) || _epTahunAktif || new Date().getFullYear() + 1;
  document.getElementById('epShTahun').disabled = true;
  document.getElementById('epShUraian').value = document.getElementById('epRincKomponen').value || '';
  document.getElementById('epShKalkulatorBox').style.display = 'block';
  _epLoadKalkulatorSemua().then(() => epHitungShKalkulator());
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
    harga_satuan: _epParseRupiah('epShHarga'),
    tkdn: document.getElementById('epShTkdn').value.trim(),
    kode_rekening: _epShRekeningMulti.getValue(),
    aktif: document.getElementById('epShAktif').value === '1',
  };
  if (_epRincManualMode) {
    if (!_epValidasiTigaToko()) return;
    if (!_epValidasiLinkSemuaToko()) return;
    if (!_epValidasiPersenUntung()) return;
    body.catatan_survei = _epRingkasanSurveiKalkulator();
    body.survei_toko = JSON.stringify(_epSurveiTokoData());
    const hasilKalkulator = epHitungShKalkulator();
    if (hasilKalkulator) body.harga_satuan = hasilKalkulator;
  }
  if (!body.uraian_barang || !body.harga_satuan) { toast('Uraian barang dan harga satuan wajib diisi', 'error'); return; }
  if (!id && !body.tahun) { toast('Tahun wajib diisi', 'error'); return; }
  const btn = document.getElementById('btnSaveStandarHarga');
  const _btnOrigHtml = btn.innerHTML;
  btn.disabled = true;
  btn.innerHTML = `<span class="btn-spin" style="width:11px;height:11px"></span> Menyimpan...`;
  try {
    const method = id ? 'PUT' : 'POST';
    const url = id ? `/api/eplanning/standarharga/${id}` : '/api/eplanning/standarharga';
    const r = await fetch(url, { method, headers: { ...authHeaders(), 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    const d = await r.json();
    if (!r.ok) throw new Error(d.error || 'Gagal menyimpan');
    if (_epRincManualMode) {
      _epRincManualMode = false;
      closeModal('modalStandarHarga');
      _epApplyStandarHargaPick(d.standarharga);
      _epMuatSurveiRincian({ komponen: d.standarharga.uraian_barang, harga_satuan: d.standarharga.harga_satuan, standar_harga_id: d.standarharga.id });
      if (id) {
        const jml = Number(d.rincian_diperbarui) || 0;
        toast(jml > 0
          ? `Survei harga diperbarui & dipakai di rincian ini. ${jml} rincian yang memakai survei ini ikut diperbarui harganya.`
          : 'Survei harga diperbarui & dipakai di rincian ini', 'success');
        if (jml > 0 && typeof _epCurrentUsulan !== 'undefined' && _epCurrentUsulan?.id) loadRincian(_epCurrentUsulan.id);
      } else {
        toast('Standar Harga Manual disimpan & dipakai di rincian ini', 'success');
      }
    } else {
      toast(id ? 'Data diperbarui' : 'Data ditambahkan', 'success');
      closeModal('modalStandarHarga');
      epLoadStandarHarga(_epShPage);
    }
  } catch (err) { toast(err.message, 'error'); }
  finally { btn.disabled = false; btn.innerHTML = _btnOrigHtml; }
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
    if (!uraian) continue;
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
      tkdn: (() => {
        if (idxMap.tkdn == null) return null;
        let v = r[idxMap.tkdn];
        if (v === '' || v == null) return null;
        if (typeof v === 'string') v = v.replace('%', '').trim();
        let n = Number(v);
        if (!isFinite(n)) return null;
        if (n > 0 && n <= 1) n = n * 100;
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
  progText.innerHTML = `<span class="btn-spin" style="width:11px;height:11px;vertical-align:-2px;margin-right:4px"></span>Membaca file…`;

  try {
    const buf = await file.arrayBuffer();
    await _loadXlsx();
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

let _epDokUsulan = null;
let _epDokRincian = [];
let _epDokTab = 'surat';
let _epDokUnlocked = { surat: false, tor: false, rab: false };
let _epRabPage = 1;
const _epRabPageSize = 10;

function _epTerbilang(n) {
  const satuan = ['', 'Satu', 'Dua', 'Tiga', 'Empat', 'Lima', 'Enam', 'Tujuh', 'Delapan', 'Sembilan', 'Sepuluh',
    'Sebelas'];
  function t(n) {
    n = Math.floor(n);
    if (n < 12) return satuan[n];
    if (n < 20) return t(n - 10) + ' Belas';
    if (n < 100) return t(Math.floor(n / 10)) + ' Puluh' + (n % 10 ? ' ' + t(n % 10) : '');
    if (n < 200) return 'Seratus' + (n % 100 ? ' ' + t(n % 100) : '');
    if (n < 1000) return t(Math.floor(n / 100)) + ' Ratus' + (n % 100 ? ' ' + t(n % 100) : '');
    if (n < 2000) return 'Seribu' + (n % 1000 ? ' ' + t(n % 1000) : '');
    if (n < 1000000) return t(Math.floor(n / 1000)) + ' Ribu' + (n % 1000 ? ' ' + t(n % 1000) : '');
    if (n < 1000000000) return t(Math.floor(n / 1000000)) + ' Juta' + (n % 1000000 ? ' ' + t(n % 1000000) : '');
    if (n < 1000000000000) return t(Math.floor(n / 1000000000)) + ' Miliar' + (n % 1000000000 ? ' ' + t(n % 1000000000) : '');
    return t(Math.floor(n / 1000000000000)) + ' Triliun' + (n % 1000000000000 ? ' ' + t(n % 1000000000000) : '');
  }
  n = Math.round(Number(n) || 0);
  if (n === 0) return 'Nol Rupiah';
  return t(n).replace(/\s+/g, ' ').trim() + ' Rupiah';
}

async function epOpenDokumenFor(id) {
  document.getElementById('epUsulanId').value = id;
  const btn = event?.currentTarget;
  const original = btn ? btn.innerHTML : null;
  if (btn) { btn.disabled = true; btn.innerHTML = EP_ICON_SPINNER; }
  try {
    await epOpenDokumen(false);
  } finally {
    if (btn) { btn.disabled = false; btn.innerHTML = original; }
  }
}

async function epOpenDokumen(isNew = false) {
  const id = document.getElementById('epUsulanId').value;
  if (!id) { toast('Simpan Sub Kegiatan ini dulu sebelum mengisi dokumen', 'error'); return; }
  try {
    const [ru, rr] = await Promise.all([
      fetch(`/api/eplanning/usulan/${id}`, { headers: authHeaders() }),
      fetch(`/api/eplanning/rincian?usulan_id=${id}`, { headers: authHeaders() }),
      _epLoadKinerjaIndikator(),
      _epLoadKinerjaTarget(),
    ]);
    const du = await ru.json(), dr = await rr.json();
    if (!ru.ok) throw new Error(du.error || 'Gagal memuat usulan');
    _epDokUsulan = du.usulan;
    _epDokRincian = dr.rincian || [];
    _epDokUnlocked = { surat: false, tor: false, rab: false };
    _epRabPage = 1;
    _epDokZoom = { surat: 100, tor: 100, rab: 100 };
    _epDokSetFullscreen(false);
    closeModal('modalEpUsulan');
    const sub = document.getElementById('epDokSubtitle');
    if (sub) {
      if (isNew) { sub.textContent = 'Sub Kegiatan tersimpan. Lengkapi dokumen di bawah, atau isi nanti lewat "Kelola Dokumen".'; sub.style.display = ''; }
      else sub.style.display = 'none';
    }
    epSwitchDokTab('surat');
    _epUpdateDokIndikator();
    openModal('modalEpDokumen');
    const _epDokOverlayEl = document.getElementById('modalEpDokumen');
    if (_epDokOverlayEl) {
      _epDokOverlayEl.style.backdropFilter = 'none';
      _epDokOverlayEl.style.webkitBackdropFilter = 'none';
    }
  } catch (err) { toast(err.message, 'error'); }
}

function _epUpdateDokIndikator() {
  const u = _epDokUsulan;
  if (!u) return;
  const set = (id, ok) => {
    const el = document.getElementById(id);
    if (!el) return;
    el.innerHTML = ok ? EP_ICON_CHECK : '○';
    el.style.color = ok ? '#16a34a' : '#94a3b8';
  };
  set('epDokDotSurat', _epDokOk('surat'));
  set('epDokDotTor', _epDokOk('tor'));
  set('epDokDotRab', _epDokOk('rab'));
  _epRenderDokTabColors();
}

function _epDokTabColorStyle(tipe, active) {
  const ok = _epDokOk(tipe);
  if (ok) {
    return active
      ? 'background:var(--hijau);border-color:var(--hijau);color:#fff'
      : 'background:#f0fdf4;border-color:#86efac;color:#166534';
  }
  return active
    ? 'background:#d97706;border-color:#d97706;color:#fff'
    : 'background:#fffbeb;border-color:#fcd34d;color:#92400e';
}
function _epRenderDokTabColors() {
  [['surat', 'Surat'], ['tor', 'Tor'], ['rab', 'Rab']].forEach(([tipe, suf]) => {
    const btn = document.getElementById(`epDokTabBtn${suf}`);
    if (!btn) return;
    btn.style.cssText = _epDokTabColorStyle(tipe, _epDokTab === tipe);
  });
}

function _epDokEditable(tipe) {
  if (!_epDokUsulan) return false;
  const st = _epDokUsulan.status;
  if (['DRAFT', 'DITOLAK'].includes(st)) return true;
  if (st === 'PRA USULAN') {
    const komp = tipe === 'surat' ? _epDokUsulan.status_surat : tipe === 'tor' ? _epDokUsulan.status_tor : _epDokUsulan.status_rab;
    return ['MENUNGGU', 'DITOLAK'].includes(komp);
  }
  return false;
}

function _epDokOk(tipe) {
  const u = _epDokUsulan;
  if (!u) return false;
  if (tipe === 'surat') return !!(u.data_surat && Object.keys(u.data_surat).length);
  if (tipe === 'tor') return !!(u.data_tor && Object.keys(u.data_tor).length);
  return _epDokRincian.length > 0;
}

function _epDokEffEditable(tipe) {
  if (tipe === 'rab') return _epDokEditable(tipe);
  return _epDokEditable(tipe) && (!_epDokOk(tipe) || !!_epDokUnlocked[tipe]);
}

function epDokUnlock(tipe) {
  _epDokUnlocked[tipe] = true;
  epSwitchDokTab(tipe);
}

const EP_COLLAPSE_LIMIT = 260;
function _epCollapseWrap(wrapId, innerHtml, rawText, forceOpen) {
  const needsCollapse = !forceOpen && (rawText || '').length > EP_COLLAPSE_LIMIT;
  if (!needsCollapse) return innerHtml;
  return `<div class="ep-collapse-wrap" id="${wrapId}">
    <div class="ep-collapse-body">${innerHtml}</div>
    <button type="button" class="ep-collapse-toggle" id="${wrapId}Btn" onclick="_epToggleCollapse('${wrapId}')">Tampilkan selengkapnya ${EP_ICON_CHEVRON_DOWN}</button>
  </div>`;
}
let _epOpenCollapseWraps = new Set();
function _epToggleCollapse(wrapId) {
  const wrap = document.getElementById(wrapId);
  const btn = document.getElementById(`${wrapId}Btn`);
  if (!wrap) return;
  const open = wrap.classList.toggle('ep-collapse-open');
  if (btn) btn.innerHTML = open ? `Sembunyikan ${EP_ICON_CHEVRON_UP}` : `Tampilkan selengkapnya ${EP_ICON_CHEVRON_DOWN}`;
  if (open) _epOpenCollapseWraps.add(wrapId); else _epOpenCollapseWraps.delete(wrapId);
}
document.addEventListener('click', function(e) {
  if (!_epOpenCollapseWraps.size) return;
  for (const wrapId of Array.from(_epOpenCollapseWraps)) {
    const wrap = document.getElementById(wrapId);
    if (!wrap || wrap.contains(e.target)) continue;
    const btn = document.getElementById(`${wrapId}Btn`);
    wrap.classList.remove('ep-collapse-open');
    if (btn) btn.innerHTML = `Tampilkan selengkapnya ${EP_ICON_CHEVRON_DOWN}`;
    _epOpenCollapseWraps.delete(wrapId);
  }
});

let _epDokFullscreen = false;
const EP_ICON_MAXIMIZE = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"/></svg>`;
const EP_ICON_MINIMIZE = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 3v3a2 2 0 0 1-2 2H4M21 8h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 1 2-2h3M3 16h3a2 2 0 0 1 2 2v3"/></svg>`;
function _epDokSetFullscreen(on) {
  _epDokFullscreen = !!on;
  const overlay = document.getElementById('modalEpDokumen');
  const inner = document.getElementById('epDokModalInner');
  const btn = document.getElementById('epDokFullscreenBtn');
  if (overlay) overlay.classList.toggle('modal-overlay-main', _epDokFullscreen);
  if (overlay) overlay.classList.toggle('modal-overlay', !_epDokFullscreen);
  if (inner) inner.classList.toggle('modal-fullmain', _epDokFullscreen);
  if (inner) inner.classList.toggle('modal', !_epDokFullscreen);
  if (inner) inner.classList.toggle('modal-xl', !_epDokFullscreen);
  if (btn) {
    btn.setAttribute('data-tip', _epDokFullscreen ? 'Kembalikan ukuran normal' : 'Perbesar ke layar penuh');
    btn.innerHTML = _epDokFullscreen ? EP_ICON_MINIMIZE : EP_ICON_MAXIMIZE;
  }
  const sidebar = document.getElementById('sidebar');
  const topbar = document.getElementById('topbar');
  if (sidebar) sidebar.classList.toggle('sidebar--locked', _epDokFullscreen);
  if (topbar) topbar.classList.toggle('topbar--locked', _epDokFullscreen);
}
function epDokToggleFullscreen() { _epDokSetFullscreen(!_epDokFullscreen); }

function epCloseDokModal() {
  _epDokSetFullscreen(false);
  closeModal('modalEpDokumen');
}

let _epDokZoom = { surat: 100, tor: 100, rab: 100 };
function _epDokApplyZoom(tab) {
  const wrap = document.getElementById('epDokZoomWrap');
  const label = document.getElementById('epDokZoomLabel');
  const pct = _epDokZoom[tab];
  if (wrap) { if (pct === 100) wrap.style.removeProperty('zoom'); else wrap.style.zoom = pct / 100; }
  if (label) label.textContent = pct + '%';
}
function epDokZoomIn(tab) { _epDokZoom[tab] = Math.min(200, _epDokZoom[tab] + 10); _epDokApplyZoom(tab); }
function epDokZoomOut(tab) { _epDokZoom[tab] = Math.max(50, _epDokZoom[tab] - 10); _epDokApplyZoom(tab); }
function epDokZoomReset(tab) { _epDokZoom[tab] = 100; _epDokApplyZoom(tab); }
function _epDokZoomToolbar(tab, downloadFnCall) {
  return `
    <div style="display:flex;align-items:center;gap:6px;margin-bottom:10px;flex-wrap:nowrap;overflow-x:auto">
      <button type="button" class="btn btn-ghost btn-sm" style="color:#2563eb;flex-shrink:0" data-tip="Perkecil" onclick="epDokZoomOut('${tab}')">${EP_ICON_ZOOM_OUT}</button>
      <span id="epDokZoomLabel" style="font-size:.78rem;font-weight:600;min-width:38px;text-align:center;flex-shrink:0">${_epDokZoom[tab]}%</span>
      <button type="button" class="btn btn-ghost btn-sm" style="color:#16a34a;flex-shrink:0" data-tip="Perbesar" onclick="epDokZoomIn('${tab}')">${EP_ICON_ZOOM_IN}</button>
      <button type="button" class="btn btn-ghost btn-sm" style="color:#f59e0b;flex-shrink:0" data-tip="Reset Zoom" onclick="epDokZoomReset('${tab}')">${EP_ICON_ZOOM_RESET}</button>
      <span style="flex:1;min-width:6px"></span>
      <button type="button" class="btn btn-ghost btn-sm" style="color:#0f766e;flex-shrink:0" data-tip="Download PDF" onclick="${downloadFnCall}">${EP_ICON_DOWNLOAD}</button>
      <button type="button" class="btn btn-ghost btn-sm" id="epDokFullscreenBtn" style="color:#4f46e5;flex-shrink:0" data-tip="${_epDokFullscreen ? 'Kembalikan ukuran normal' : 'Perbesar ke layar penuh'}" onclick="epDokToggleFullscreen()">${_epDokFullscreen ? EP_ICON_MINIMIZE : EP_ICON_MAXIMIZE}</button>
    </div>
    <div style="overflow:auto;max-width:100%"><div id="epDokZoomWrap"${_epDokZoom[tab] !== 100 ? ` style="zoom:${_epDokZoom[tab] / 100}"` : ''}>`;
}
const _epDokZoomToolbarEnd = `</div></div>`;

function _epDokPreviewIframeDoc(innerHtml, orientation) {
  const ori = orientation || 'portrait';
  return `<!DOCTYPE html>
<html lang="id">
<head>
<meta charset="UTF-8">
<style>
  * { margin:0; padding:0; box-sizing:border-box; }
  html, body { background:#f1f5f9; }
  body {
    font-family:Arial,sans-serif; color:#1e293b; font-size:11px;
    -webkit-print-color-adjust:exact !important;
    print-color-adjust:exact !important;
    color-adjust:exact !important;
  }
  .sheet {
    background:white;
    width:${ori === 'landscape' ? '277mm' : '190mm'};
    margin:8px auto;
    padding:8mm 14mm;
    box-shadow:0 4px 24px rgba(0,0,0,.15);
    border-radius:2px;
    -webkit-print-color-adjust:exact !important;
    print-color-adjust:exact !important;
  }
  *, *::before, *::after {
    -webkit-print-color-adjust:exact !important;
    print-color-adjust:exact !important;
    color-adjust:exact !important;
  }
  table { border-collapse:collapse; width:100%; }
  th, td { font-size:10px; }
  td { word-break:break-word; overflow-wrap:break-word; }
  p, span, li, div { overflow-wrap:break-word; word-break:break-word; }
  .lap-md-line { white-space:pre-wrap; }
  .lap-md-list { margin:1px 0 3px; padding-left:1.2em; text-align:left; }
  .lap-md-list li { margin-bottom:2px; padding-left:2px; }
  ol.lap-md-list { list-style:none; counter-reset:lapmdnum; padding-left:1.4em; }
  ol.lap-md-list > li { counter-increment:lapmdnum; position:relative; }
  ol.lap-md-list > li::before {
    content:counter(lapmdnum) ".";
    position:absolute; left:-1.4em; width:1.3em; text-align:left; white-space:nowrap;
    color:#0f172a; font-weight:400;
  }
  ol.lap-md-list--alpha > li::before { content:counter(lapmdnum, lower-alpha) "."; }
  .lap-md-list li:last-child { margin-bottom:0; }
  ol.lap-md-list--flush { padding-left:1.7em; margin:4px 0 8px; }
  ol.lap-md-list--flush > li::before { left:-1.7em; text-align:left; }
  ol.lap-md-list--flush > li { margin-bottom:0; line-height:1.15; }
</style>
</head>
<body>
<div class="sheet">
  ${innerHtml}
</div>
</body>
</html>`;
}

function _epDokPreviewWrap(innerHtml, orientation) {
  const fullHtml = _epDokPreviewIframeDoc(innerHtml, orientation);
  const srcdocEscaped = fullHtml.replace(/'/g, '&#39;');
  return `
    <div style="background:#f1f5f9;border-radius:10px;overflow:hidden">
      <iframe
        srcdoc='${srcdocEscaped}'
        style="width:100%;border:none;display:block;min-height:300px"
        onload="try{ this.style.height = (this.contentWindow.document.documentElement.scrollHeight + 24) + 'px'; }catch(e){}"
      ></iframe>
    </div>`;
}

function epSwitchDokTab(tab) {
  _epDokTab = tab;
  _epOpenCollapseWraps.clear();
  ['Surat', 'Tor', 'Rab'].forEach(t => {
    const btn = document.getElementById(`epDokTabBtn${t}`);
    if (btn) btn.className = 'btn btn-sm';
  });
  _epRenderDokTabColors();
  const el = document.getElementById('epDokContent');
  const terkunci = !_epDokEditable(tab);
  if (tab === 'surat') { el.innerHTML = terkunci ? _epRenderSuratPreviewOnly() : _epRenderSuratForm(); _epUpdateSuratSaveBtn(); }
  else if (tab === 'tor') {
    if (terkunci) { el.innerHTML = _epRenderTorPreviewOnly(); }
    else { el.innerHTML = _epRenderTorForm(); _epRenderTorRows(); _epUpdateTorSaveBtn(); }
  }
  else { el.innerHTML = _epRenderRabTab(); _epRabPaginationRender(); }
  if (typeof window.initCustomSelects === 'function') window.initCustomSelects();
  const focusId = tab === 'surat' ? 'epSrTempatTanggal' : tab === 'tor' ? 'epTrDasarHukum' : null;
  if (focusId) setTimeout(() => { const f = document.getElementById(focusId); if (f && !f.readOnly) f.focus(); }, 30);
}

function _epDokRincianTotal() {
  return _epDokRincian.reduce((s, r) => s + (Number(r.sub_total) || 0), 0);
}

function _epDokStatusBar(tipe) {
  const u = _epDokUsulan;
  const editable = _epDokEditable(tipe);
  const komp = tipe === 'surat' ? u.status_surat : tipe === 'tor' ? u.status_tor : u.status_rab;
  let text, style;
  if (u.status === 'DRAFT') {
    return '';
  } else if (editable) {
    if (komp === 'DITOLAK') {
      text = '✗ Ditolak verifikator - silakan revisi lalu simpan ulang';
      style = 'color:#991b1b;background:#fee2e2';
    } else {
      return '';
    }
  } else {
    return '';
  }
  return `<div style="display:inline-flex;align-items:center;gap:6px;padding:4px 10px;border-radius:6px;font-size:.76rem;font-weight:600;margin-bottom:12px;${style}">${text}</div>`;
}

function _epDokActionsBar(tipe, editableHtml, previewFn) {
  const permEditable = _epDokEditable(tipe);
  if (!permEditable) return '';
  const editable = _epDokEffEditable(tipe);
  const leftHtml = permEditable ? (editable
    ? editableHtml
    : `<span class="ep-dok-badge-saved">${EP_ICON_CHECK} Tersimpan</span>
       <button type="button" class="btn-edit" onclick="epDokUnlock('${tipe}')">${EP_ICON_EDIT} Edit</button>`
  ) : '';
  return `
    <div class="ep-dok-actions-bar">
      <div class="ep-dok-actions-left">${leftHtml}</div>
      <div class="ep-dok-actions-right">
        <button type="button" class="btn btn-ghost btn-sm" data-tip="Preview" onclick="${previewFn}">${EP_ICON_FILE_PDF} Preview / Download PDF</button>
        <button type="button" class="btn btn-ghost btn-sm" onclick="epCloseDokModal()">${EP_ICON_CLOCK} Isi Nanti</button>
      </div>
    </div>`;
}

function _epDefaultIsiSurat(u) {
  const tahun = u.tahun_anggaran || (new Date().getFullYear() + 1);
  return `Dalam rangka penyusunan Rancangan APBD Tahun Anggaran ${tahun}, kami kirimkan usulan kegiatan pada tahun ${tahun} sebagaimana terlampir. Adapun usulan telah disusun berdasarkan prinsip efektivitas, efisiensi, dan sesuai dengan program prioritas nasional dan arah kebijakan pemerintah daerah Kabupaten Banggai Laut pada tahun ${tahun}. Bersama ini kami lampirkan:\n\n1. Kerangka Acuan Kerja/ TOR;\n2. Rencana Anggaran Biaya (RAB);\n3. Usulan standar harga satuan (jika ada).\n\nBesar harapan kami kiranya Bapak dapat menyetujui usulan kegiatan ini pada Rancangan APBD Tahun Anggaran ${tahun}.\n\nDemikian kami sampaikan, atas pertimbangan Bapak diucapkan terimakasih.`;
}

function _epRenderSuratForm() {
  const u = _epDokUsulan;
  const d = u.data_surat || {};
  const permEditable = _epDokEditable('surat');
  const suratOk = _epDokOk('surat');
  const editable = _epDokEffEditable('surat');
  const tahun = u.tahun_anggaran || (new Date().getFullYear() + 1);
  const sifatOpts = ['Biasa', 'Penting', 'Segera', 'Sangat Segera', 'Rahasia'];
  const isiSurat = d.isi_surat || '';
  return `
    ${_epDokStatusBar('surat')}
    <div class="field-row">
      <div class="field"><label>Tempat &amp; Tanggal Surat</label><input type="text" id="epSrTempatTanggal" ${editable ? '' : 'readonly'} oninput="_epUpdateSuratSaveBtn()" value="${esc(d.tempat_tanggal || '')}" placeholder="Banggai Laut, ……………. ${new Date().getFullYear()}" /></div>
      <div class="field"><label>Nomor Surat</label><input type="text" id="epSrNomor" ${editable ? '' : 'readonly'} oninput="_epUpdateSuratSaveBtn()" value="${esc(d.nomor_surat || '')}" placeholder="   /       /          / ${new Date().getFullYear()}" /></div>
    </div>
    <div class="field-row">
      <div class="field"><label>Sifat</label>
        <div class="select-wrap"><select id="epSrSifat" ${editable ? '' : 'disabled'} onchange="_epUpdateSuratSaveBtn()">
          <option value="">Pilih Sifat...</option>
          ${sifatOpts.map(s => `<option value="${esc(s)}" ${d.sifat === s ? 'selected' : ''}>${esc(s)}</option>`).join('')}
        </select></div>
      </div>
      <div class="field"><label>Hal</label><input type="text" id="epSrHal" ${editable ? '' : 'readonly'} oninput="_epUpdateSuratSaveBtn()" value="${esc(d.hal || '')}" placeholder="Usulan Kegiatan Tahun ${tahun}" /></div>
    </div>
    <div class="field-row">
      <div class="field"><label>Lampiran</label><input type="text" id="epSrLampiran" ${editable ? '' : 'readonly'} value="${esc(d.lampiran || '')}" placeholder="1 (satu) berkas" /></div>
    </div>
    <div class="field">
      <label>Isi Surat</label>
      <textarea id="epSrIsi" ${editable ? '' : 'readonly'} oninput="_epUpdateSuratSaveBtn()" rows="8" placeholder="Klik &quot;Pakai redaksi default&quot; di bawah, atau tulis sendiri">${esc(isiSurat)}</textarea>
      <div class="field-hint" style="margin-top:2px">Pisahkan paragraf dengan baris kosong. Baris berformat "1. ...", "2. ..." otomatis dirender sebagai daftar bernomor.</div>
      ${editable ? `<button type="button" class="btn btn-ghost btn-sm" style="margin-top:4px" onclick="epResetIsiSurat()"><svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5" style="margin-right:5px;vertical-align:-2px"><path stroke-linecap="round" stroke-linejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg>Pakai redaksi default</button>` : ''}
    </div>
    ${_epDokActionsBar('surat', `<button type="button" class="btn btn-primary btn-sm" id="btnSimpanSurat" onclick="epSaveDokumen('surat')">${EP_ICON_CHECK} ${suratOk ? 'Simpan Perubahan' : 'Simpan'}</button>`, 'epPreviewSurat()')}`;
}

function _epUpdateSuratSaveBtn() {
  const btn = document.getElementById('btnSimpanSurat');
  if (!btn) return;
  const val = id => document.getElementById(id)?.value.trim() || '';
  const ok = val('epSrTempatTanggal') && val('epSrNomor') && val('epSrSifat') && val('epSrHal') && val('epSrIsi');
  btn.disabled = !ok;
}

function epResetIsiSurat() {
  const el = document.getElementById('epSrIsi');
  if (el) el.value = _epDefaultIsiSurat(_epDokUsulan);
}

function epCollectSuratData() {
  if (!document.getElementById('epSrTempatTanggal')) return _epDokUsulan?.data_surat || {};
  const val = id => document.getElementById(id).value.trim();
  return {
    tempat_tanggal: val('epSrTempatTanggal'),
    nomor_surat: val('epSrNomor'),
    sifat: document.getElementById('epSrSifat').value,
    hal: val('epSrHal'),
    lampiran: val('epSrLampiran'),
    isi_surat: val('epSrIsi'),
  };
}

function _epRenderNarasiHtml(text, indentFirstLine) {
  const segments = String(text || '').split(/\[TABLE\]\n?([\s\S]*?)\n?\[\/TABLE\]/g);
  return segments.map((seg, i) => (i % 2 === 1) ? _epRenderNarasiTable(seg) : _epRenderNarasiTextBlock(seg, indentFirstLine)).join('');
}

function _epRenderNarasiTable(body) {
  const rows = String(body || '').split('\n').map(r => r.split('|').map(c => {
    let cell = c.replace(/\\\|/g, '|');
    let align = 'left';
    const m = cell.match(/^\[(C|R)\]/);
    if (m) { align = m[1] === 'C' ? 'center' : 'right'; cell = cell.slice(3); }
    return { text: cell, align };
  }));
  const trs = rows.map(cols => `<tr>${cols.map(c => `<td style="border:1px solid #cbd5e1;padding:4px 8px;font-size:11px;vertical-align:top;text-align:${c.align}">${esc(c.text)}</td>`).join('')}</tr>`).join('');
  return `<table style="border-collapse:collapse;margin:4px 0 10px"><tbody>${trs}</tbody></table>`;
}

function _epRenderNarasiTextBlock(text, indentFirstLine) {
  const rawLines = String(text || '').split('\n');
  let html = '';
  let group = null;

  const flush = () => {
    if (!group) return;
    if (group.type === 'p') {
      const allCenterOrRight = group.lines.every(l => l.align === 'center' || l.align === 'right');
      const wrapCompensate = indentFirstLine && allCenterOrRight;
      const pStyle = `text-align:justify;margin:0 0 10px${indentFirstLine && !wrapCompensate ? ';text-indent:19px' : ''}`;
      const pHtml = `<p style="${pStyle}">${group.lines.map(l => `<span style="display:block${l.align === 'left' ? '' : `;text-align:${l.align}`}">${esc(l.text)}</span>`).join('')}</p>`;
      html += wrapCompensate ? `<div style="margin-left:-32px;margin-right:-32px">${pHtml}</div>` : pHtml;
    } else {
      const items = group.lines.map(l => `<li style="text-align:justify">${esc(l.text.replace(/^(\d+|[a-z])[.)]\s+/i, ''))}</li>`).join('');
      const cls = group.type === 'alpha' ? 'lap-md-list lap-md-list--flush lap-md-list--alpha' : 'lap-md-list lap-md-list--flush';
      html += `<ol class="${cls}" style="margin:0 0 10px">${items}</ol>`;
    }
    group = null;
  };

  rawLines.forEach(raw => {
    let line = raw.trim();
    const imgM = line.match(/^\[IMG(?:\s+w=(\d+))?(?:\s+align=(left|center|right))?\]([\s\S]*?)\[\/IMG\]$/);
    if (imgM) {
      flush();
      const w = parseInt(imgM[1], 10);
      const align = imgM[2] || 'left';
      const widthStyle = Number.isFinite(w) && w > 0 ? `width:${w}px;` : 'max-width:100%;';
      if (indentFirstLine && (align === 'center' || align === 'right')) {
        html += `<div style="margin-left:-32px;margin-right:-32px;text-align:${align}"><img src="${esc(imgM[3])}" style="${widthStyle}max-height:320px;display:inline-block"></div>`;
      } else {
        const marginStyle = align === 'right' ? 'margin:6px 0 10px auto' : 'margin:6px 0 10px 0';
        html += `<img src="${esc(imgM[3])}" style="${widthStyle}max-height:320px;display:block;${marginStyle}">`;
      }
      return;
    }
    if (!line) {
      if (group && group.type === 'p') flush();
      return;
    }
    let align = 'left';
    const alignM = line.match(/^\[(C|R)\](.*)$/);
    if (alignM) { align = alignM[1] === 'C' ? 'center' : 'right'; line = alignM[2]; }
    const isNum = /^\d+[.)]\s+/.test(line);
    const isAlpha = !isNum && /^[a-z][.)]\s+/i.test(line);
    const type = isNum ? 'num' : (isAlpha ? 'alpha' : 'p');
    if (group && group.type !== type) flush();
    if (!group) group = { type, lines: [] };
    group.lines.push({ text: line, align });
  });
  flush();
  return html;
}

function _epFmtVerifDT(iso) {
  if (!iso) return '';
  return new Date(iso).toLocaleString('id-ID', { day:'2-digit', month:'long', year:'numeric', hour:'2-digit', minute:'2-digit', timeZone: 'Asia/Makassar' }).replace(' pukul','').replace('.', ':') + ' WITA';
}

function _epSignBlockHtml(jabatan, nama, nip, ttdRaw, approvedAt) {
  const ttd = ttdRaw || '';
  const ttdValid = ttd && (ttd.startsWith('data:image') || ttd.startsWith('http'));

  const signImg = ttdValid
    ? `<div style="height:54px;display:flex;align-items:center;justify-content:center;margin-bottom:2px">
         <img src="${esc(ttd)}" style="max-height:50px;max-width:130px;object-fit:contain;display:block;margin:0 auto">
       </div>
       <div style="font-size:8px;color:#0d9488;font-weight:700;margin-bottom:2px;display:flex;align-items:center;justify-content:center;gap:3px">${EP_ICON_CHECK}Diverifikasi: ${_epFmtVerifDT(approvedAt)}</div>`
    : `<div style="height:54px"></div>
       <div style="font-size:8px;color:#0d9488;font-weight:700;margin-bottom:2px;display:flex;align-items:center;justify-content:center;gap:3px">${EP_ICON_CHECK}Diverifikasi: ${_epFmtVerifDT(approvedAt)}</div>`;
  return `
    <div style="flex:1;min-width:0;text-align:center;page-break-inside:avoid">
      <div style="font-size:11px;margin-bottom:2px">${esc(jabatan)}</div>
      ${signImg}
      <div style="font-size:11px;font-weight:700;text-decoration:underline;word-break:break-word">${esc(nama)}</div>
      <div style="font-size:11px">NIP. ${esc(nip || '')}</div>
    </div>`;
}

function _epFullSignRowHtml(u, bidangLabel) {
  const candidates = [
    ['Pengusul', !!u.diajukan_at, u.pembuat_nama, u.pembuat_nip, u.link_ttd_pengusul, u.diajukan_at],
    [`Kepala ${bidangLabel}`, !!u.kabid_approved_at, u.nama_kabid, u.nip_kabid, u.link_ttd, u.kabid_approved_at],
  ];
  if (u.bidang_tipe === 'sub_bagian') {
    candidates.push(['Sekretaris Dinas', !!u.sekretaris_approved_at, u.nama_sekretaris, u.nip_sekretaris, u.link_ttd_sekretaris, u.sekretaris_approved_at]);
  }
  candidates.push(['Verifikator (Kepala Dinas)', !!u.admin_approved_at, u.nama_kadis, u.nip_kadis, u.link_ttd_kadis, u.admin_approved_at]);

  const blocks = candidates
    .filter(([, approved]) => approved)
    .map(([jabatan, , nama, nip, ttd, approvedAt]) => _epSignBlockHtml(jabatan, nama, nip, ttd, approvedAt));
  if (!blocks.length) return '';
  return `<div style="display:flex;justify-content:space-between;align-items:flex-start;gap:10px;margin-top:24px">${blocks.join('')}</div>`;
}

function _epRenderIsiSuratHtml(text) {
  return _epRenderNarasiHtml(text);
}

function _epBuildSuratPreviewHtml(d, u) {
  const bidangLabel = _epBidangLabel(u, '….');
  const isiParasHtml = _epRenderIsiSuratHtml(d.isi_surat || _epDefaultIsiSurat(u));
  return `
    ${_kopSuratHtml()}
    ${u.bidang_tipe === 'puskesmas' ? `<div style="text-align:center;font-weight:700;margin:-10px 0 18px;font-size:13px">PUSKESMAS ${esc((u.bidang_nama || '').toUpperCase())}</div>` : ''}
    <div style="text-align:right;margin-bottom:14px">${esc(d.tempat_tanggal)}</div>
    <table style="width:auto;margin-bottom:14px">
      <tr><td style="width:70px;border:none">Nomor</td><td style="border:none">: ${esc(d.nomor_surat)}</td></tr>
      <tr><td style="border:none">Sifat</td><td style="border:none">: ${esc(d.sifat)}</td></tr>
      <tr><td style="border:none">Lampiran</td><td style="border:none">: ${esc(d.lampiran || '1 (satu) berkas')}</td></tr>
      <tr><td style="border:none">Hal</td><td style="border:none">: <b>${esc(d.hal)}</b></td></tr>
    </table>
    <div style="margin-bottom:14px">Kepada Yth.<br><b>KEPALA DINAS KESEHATAN, PENGENDALIAN PENDUDUK DAN<br>KELUARGA BERENCANA</b><br>di-<br>&emsp;Tempat</div>
    ${isiParasHtml}
    ${_epFullSignRowHtml(u, bidangLabel)}`;
}

function epPreviewSurat() {
  const d = epCollectSuratData();
  const u = _epDokUsulan;
  const html = _epBuildSuratPreviewHtml(d, u);
  _bukaPreviewPDF(html, `Surat Usulan - ${u.nama_kegiatan || u.sub_kegiatan || ''}`, 'portrait');
}

function _epRenderSuratPreviewOnly() {
  const u = _epDokUsulan;
  const d = epCollectSuratData();
  return `${_epDokStatusBar('surat')}${_epDokZoomToolbar('surat', 'epPreviewSurat()')}${_epDokPreviewWrap(_epBuildSuratPreviewHtml(d, u))}${_epDokZoomToolbarEnd}`;
}

let _epTorRows = { iku: [], ikk: [], penerima_manfaat: [], strategi: [] };
let _epKinerjaIndikatorList = [];
let _epKinerjaIndikatorLoaded = false;

let _epKinerjaTargetMap = {};
let _epKinerjaTargetLoaded = false;

async function _epLoadKinerjaIndikator() {
  if (_epKinerjaIndikatorLoaded) return;
  try {
    const r = await fetch('/api/kinerja/indikator', { headers: authHeaders() });
    const d = await r.json();
    if (r.ok) { _epKinerjaIndikatorList = (d.indikator || []).filter(x => x.aktif !== false); _epKinerjaIndikatorLoaded = true; }
  } catch {  }
}

async function _epLoadKinerjaTarget() {
  if (_epKinerjaTargetLoaded) return;
  try {
    const r = await fetch('/api/kinerja/target?all=1', { headers: authHeaders() });
    const d = await r.json();
    if (r.ok) {
      _epKinerjaTargetMap = {};
      for (const t of (d.target || [])) {
        if (!_epKinerjaTargetMap[t.indikator_id]) _epKinerjaTargetMap[t.indikator_id] = {};
        const _ex = _epKinerjaTargetMap[t.indikator_id][t.tahun];
        if (!_ex || (t.triwulan || 4) >= (_ex.triwulan || 4)) _epKinerjaTargetMap[t.indikator_id][t.tahun] = t;
      }
      _epKinerjaTargetLoaded = true;
    }
  } catch {  }
}

function _epAutoTargetFor(namaIndikator, tahun) {
  const ind = _epKinerjaIndikatorList.find(x => x.indikator_kinerja === namaIndikator);
  if (!ind || !tahun) return '';
  const t = (_epKinerjaTargetMap[ind.id] || {})[tahun];
  if (!t) return '';
  const nilai = (t.target_display != null && String(t.target_display).trim() !== '')
    ? t.target_display
    : (t.target != null ? String(t.target) : '');
  if (!nilai) return '';
  return ind.satuan ? `${nilai} ${ind.satuan}` : nilai;
}

function _epRenderTorForm() {
  const u = _epDokUsulan;
  const d = u.data_tor || {};
  _epTorRows = {
    iku: (d.iku || (d.iku_ikk || []).filter(r => _epIndikatorJenis(r.indikator) === 'IKU')).slice(),
    ikk: (d.ikk || (d.iku_ikk || []).filter(r => _epIndikatorJenis(r.indikator) === 'IKK')).slice(),
    penerima_manfaat: (d.penerima_manfaat || []).slice(),
    strategi: (d.strategi || []).slice(),
  };
  const permEditable = _epDokEditable('tor');
  const torOk = _epDokOk('tor');
  const editable = _epDokEffEditable('tor');
  const dasarHukumHtml = `<div class="ps-rte" id="epTrDasarHukum" contenteditable="${editable ? 'true' : 'false'}" spellcheck="false" data-placeholder="Berisi dasar hukum pelaksanaan kegiatan" style="${editable ? 'max-height:220px;overflow-y:auto' : 'cursor:not-allowed'}">${_mdToRteHtml(d.dasar_hukum || '')}</div>`;
  const gambaranUmumHtml = `<div class="ps-rte" id="epTrGambaranUmum" contenteditable="${editable ? 'true' : 'false'}" spellcheck="false" data-placeholder="Berisi gambaran umum terkait kondisi kesehatan di daerah, dalam bentuk data-data kesehatan, yang terkait dengan rincian menu yang diangkat, upaya-upaya yang selama ini sudah dilaksanakan, alasan yang menguatkan mengapa rincian menu tersebut diusulkan, dll" style="${editable ? 'max-height:220px;overflow-y:auto' : 'cursor:not-allowed'}">${_mdToRteHtml(d.gambaran_umum || '')}</div>`;
  const kurunMulai = d.kurun_waktu_mulai ?? u.waktu_mulai_bulan ?? '';
  const kurunSelesai = d.kurun_waktu_selesai ?? u.waktu_selesai_bulan ?? '';
  const bulanOpts = (selected) => EP_BULAN.map((b, i) => i === 0 ? '' : `<option value="${i}" ${Number(selected) === i ? 'selected' : ''}>${b}</option>`).join('');
  return `
    ${_epDokStatusBar('tor')}
    <div class="field"><label>Dasar Hukum</label>${_epCollapseWrap('epDhCollapse', dasarHukumHtml, d.dasar_hukum, editable)}</div>
    <div class="field"><label>Gambaran Umum</label>${_epCollapseWrap('epGuCollapse', gambaranUmumHtml, d.gambaran_umum, editable)}</div>

    <div class="field">
      <label>Dukungan terhadap IKU (Indikator Kinerja Utama)</label>
      <div id="epTrIkuList"></div>
      ${editable ? `<button type="button" class="btn btn-ghost btn-sm" onclick="epTorAddRow('iku')"><svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5" style="margin-right:5px;vertical-align:-2px"><path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4"/></svg>Baris IKU</button>` : ''}
    </div>
    <div class="field">
      <label>Dukungan terhadap IKK (Indikator Kinerja Kunci)</label>
      <div id="epTrIkkList"></div>
      ${editable ? `<button type="button" class="btn btn-ghost btn-sm" onclick="epTorAddRow('ikk')"><svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5" style="margin-right:5px;vertical-align:-2px"><path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4"/></svg>Baris IKK</button>` : ''}
    </div>
    <div class="field">
      <label>Penerima Manfaat</label>
      <div id="epTrPenerimaList"></div>
      ${editable ? `<button type="button" class="btn btn-ghost btn-sm" onclick="epTorAddRow('penerima_manfaat')"><svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5" style="margin-right:5px;vertical-align:-2px"><path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4"/></svg>Baris Penerima Manfaat</button>` : ''}
    </div>
    <div class="field">
      <label>Strategi Pencapaian Keluaran</label>
      <div id="epTrStrategiList"></div>
      ${editable ? `<button type="button" class="btn btn-ghost btn-sm" onclick="epTorAddRow('strategi')"><svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5" style="margin-right:5px;vertical-align:-2px"><path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4"/></svg>Baris Strategi</button>` : ''}
    </div>
    <div class="field">
      <label>Kurun Waktu Pencapaian Keluaran</label>
      <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">
        <div class="select-wrap" style="flex:1;min-width:140px">
          <select id="epTrKurunMulai" ${editable ? '' : 'disabled'} onchange="_epUpdateTorSaveBtn()">
            <option value="">Bulan Mulai</option>
            ${bulanOpts(kurunMulai)}
          </select>
        </div>
        <span style="color:var(--teks-muted,#94a3b8);font-size:.8rem">s/d</span>
        <div class="select-wrap" style="flex:1;min-width:140px">
          <select id="epTrKurunSelesai" ${editable ? '' : 'disabled'} onchange="_epUpdateTorSaveBtn()">
            <option value="">Bulan Selesai</option>
            ${bulanOpts(kurunSelesai)}
          </select>
        </div>
      </div>
    </div>
    <div class="field-hint" style="margin:4px 0 12px">Biaya yang diperlukan otomatis dari total RAB (${epFmtRupiah(_epDokRincianTotal())}).</div>
    ${_epDokActionsBar('tor', `<button type="button" class="btn btn-primary btn-sm" id="btnSimpanTor" onclick="epSaveDokumen('tor')">${EP_ICON_CHECK} ${torOk ? 'Simpan Perubahan' : 'Simpan'}</button>`, 'epPreviewTor()')}`;
}

function _epUpdateTorSaveBtn() {
  const btn = document.getElementById('btnSimpanTor');
  if (!btn) return;
  const rteFilled = id => (document.getElementById(id)?.textContent || '').trim().length > 0;
  const selVal = id => document.getElementById(id)?.value || '';
  const hasIsi = r => Object.entries(r).some(([k, v]) => k !== 'nama_kegiatan' && String(v || '').trim());
  const listOk = key => (_epTorRows[key] || []).some(hasIsi);
  const ok = rteFilled('epTrDasarHukum') && rteFilled('epTrGambaranUmum')
    && selVal('epTrKurunMulai') && selVal('epTrKurunSelesai')
    && listOk('iku') && listOk('ikk') && listOk('penerima_manfaat') && listOk('strategi');
  btn.disabled = !ok;
}
document.addEventListener('input', () => {
  if (_epDokTab === 'tor' && document.getElementById('btnSimpanTor')) _epUpdateTorSaveBtn();
});
document.addEventListener('change', () => {
  if (_epDokTab === 'tor' && document.getElementById('btnSimpanTor')) _epUpdateTorSaveBtn();
});

const EP_TOR_COLS = {
  iku: [['nama_kegiatan', 'Nama Kegiatan'], ['indikator', 'Indikator IKU'], ['target', 'Target']],
  ikk: [['nama_kegiatan', 'Nama Kegiatan'], ['indikator', 'Indikator IKK'], ['target', 'Target']],
  penerima_manfaat: [['jumlah', 'Jumlah Penerima Manfaat'], ['penerima', 'Penerima Manfaat']],
  strategi: [['satuan', 'Satuan'], ['volume', 'Volume'], ['metode', 'Metode Pelaksanaan'], ['tahapan', 'Tahapan Pelaksanaan']],
};
const EP_TOR_TARGETS = { iku: 'epTrIkuList', ikk: 'epTrIkkList', penerima_manfaat: 'epTrPenerimaList', strategi: 'epTrStrategiList' };

function _epIndikatorJenis(nama) {
  const ind = _epKinerjaIndikatorList.find(x => x.indikator_kinerja === nama);
  return ind ? (ind.jenis_monev ? 'IKU' : ind.jenis_ikk ? 'IKK' : '') : '';
}

function _epRenderTorRows() {
  for (const key of Object.keys(EP_TOR_TARGETS)) {
    const wrap = document.getElementById(EP_TOR_TARGETS[key]);
    if (!wrap) continue;
    const editable = _epDokEffEditable('tor');
    if (key === 'iku' || key === 'ikk') {
      const namaOtomatis = _epDokUsulan.nama_kegiatan || _epDokUsulan.sub_kegiatan || '';
      const jenis = key === 'iku' ? 'IKU' : 'IKK';
      const indikatorOpts = _epKinerjaIndikatorList
        .filter(ind => (jenis === 'IKU' ? ind.jenis_monev : ind.jenis_ikk))
        .filter(ind => jenis === 'IKU' || _epDokUsulan.bidang_tipe === 'puskesmas' || !ind.penanggung_jawab || ind.penanggung_jawab === _epDokUsulan.bidang_nama)
        .map(ind => ({ value: ind.indikator_kinerja, label: ind.indikator_kinerja }));
      wrap.innerHTML = _epTorRows[key].map((row, i) => {
        row.nama_kegiatan = namaOtomatis;
        const currentIndikator = row.indikator || '';
        const adaDiList = indikatorOpts.some(o => o.value === currentIndikator);
        const tahun = _epDokUsulan.tahun_anggaran;
        row.target = currentIndikator ? _epAutoTargetFor(currentIndikator, tahun) : '';
        return `
        <div style="display:flex;gap:6px;margin-bottom:6px;align-items:flex-start;min-width:0">
          <div class="field" style="flex:2.4;margin-bottom:0;min-width:0"><div class="select-wrap ep-tor-indikator-wrap"><select ${editable ? '' : 'disabled'} data-searchable="1" data-search-placeholder="Cari indikator ${jenis}…" onchange="_epTorRows['${key}'][${i}]['indikator']=this.value;_epRenderTorRows()">
            <option value="">Pilih Indikator ${jenis}...</option>
            ${!adaDiList && currentIndikator ? `<option value="${esc(currentIndikator)}" selected>${esc(currentIndikator)}</option>` : ''}
            ${indikatorOpts.map(o => `<option value="${esc(o.value)}" ${o.value === currentIndikator ? 'selected' : ''}>${esc(o.label)}</option>`).join('')}
          </select></div></div>
          <input type="text" value="${esc(row.target || '')}" readonly
            placeholder="${currentIndikator ? 'Belum ada' : 'Target'}"
            data-tip="Otomatis dari Kelola Target${tahun ? ' tahun ' + tahun : ''}"
            style="flex:0 0 130px;min-width:0;padding:var(--sp-3) var(--sp-4);border:1.5px solid var(--abu-2);border-radius:var(--r-sm);font-family:inherit;font-size:var(--fs-sm);line-height:1.4;color:var(--teks);box-sizing:border-box;background:var(--abu-1,#f1f5f9)" />
          ${editable ? `<button type="button" class="btn-hapus btn-sm" onclick="epTorRemoveRow('${key}',${i})">${EP_ICON_TRASH}</button>` : ''}
        </div>`;
      }).join('') || `<div style="font-size:.78rem;color:var(--teks-muted,#94a3b8);padding:4px 0">Belum ada baris</div>`;
      continue;
    }
    const cols = EP_TOR_COLS[key];
    const namaOtomatis = _epDokUsulan.nama_kegiatan || _epDokUsulan.sub_kegiatan || '';

    if (key === 'strategi') {
      _epSyncStrategiTahapanFromDom();
      wrap.innerHTML = _epTorRows.strategi.map((row, i) => {
        row.nama_kegiatan = namaOtomatis;
        const tahapanHtml = `<div class="ps-rte" id="epTrTahapan_${i}" contenteditable="${editable ? 'true' : 'false'}" spellcheck="false" data-placeholder="Uraikan tahapan pelaksanaan, mis. 1. ... 2. ..." style="${editable ? 'max-height:160px;overflow-y:auto' : 'cursor:not-allowed'}">${_mdToRteHtml(row.tahapan || '')}</div>`;
        return `
        <div style="border:1.5px solid var(--abu-2);border-radius:var(--r-sm);padding:10px;margin-bottom:8px">
          <div style="display:flex;gap:6px;align-items:center;margin-bottom:8px">
            <input type="text" placeholder="Satuan" value="${esc(row.satuan || '')}" ${editable ? '' : 'readonly'}
              oninput="_epTorRows['strategi'][${i}]['satuan']=this.value" style="flex:1" />
            <input type="text" placeholder="Volume" value="${esc(row.volume || '')}" ${editable ? '' : 'readonly'}
              oninput="_epTorRows['strategi'][${i}]['volume']=this.value" style="flex:0 0 90px" />
            <input type="text" placeholder="Metode Pelaksanaan" value="${esc(row.metode || '')}" ${editable ? '' : 'readonly'}
              oninput="_epTorRows['strategi'][${i}]['metode']=this.value" style="flex:1" />
            ${editable ? `<button type="button" class="btn-hapus btn-sm" onclick="epTorRemoveRow('strategi',${i})">${EP_ICON_TRASH}</button>` : ''}
          </div>
          <label style="font-size:.78rem;color:var(--teks-muted,#94a3b8);display:block;margin-bottom:4px">Tahapan Pelaksanaan</label>
          ${tahapanHtml}
        </div>`;
      }).join('') || `<div style="font-size:.78rem;color:var(--teks-muted,#94a3b8);padding:4px 0">Belum ada baris</div>`;
      continue;
    }

    wrap.innerHTML = _epTorRows[key].map((row, i) => {
      row.nama_kegiatan = namaOtomatis;
      return `
      <div style="display:flex;gap:6px;margin-bottom:6px;align-items:center">
        ${cols.map(([field, label]) => field === 'nama_kegiatan'
          ? `<input type="text" value="${esc(namaOtomatis)}" readonly data-tip="Otomatis dari nama Sub Kegiatan ini" style="flex:1;background:var(--abu-1,#f1f5f9)" />`
          : `<input type="text" placeholder="${esc(label)}" value="${esc(row[field] || '')}" ${editable ? '' : 'readonly'}
            oninput="_epTorRows['${key}'][${i}]['${field}']=this.value" style="flex:1" />`
        ).join('')}
        ${editable ? `<button type="button" class="btn-hapus btn-sm" onclick="epTorRemoveRow('${key}',${i})">${EP_ICON_TRASH}</button>` : ''}
      </div>`;
    }).join('') || `<div style="font-size:.78rem;color:var(--teks-muted,#94a3b8);padding:4px 0">Belum ada baris</div>`;
  }
  if (typeof window.initCustomSelects === 'function') window.initCustomSelects();
}

function _epSyncStrategiTahapanFromDom() {
  _epTorRows.strategi.forEach((row, i) => {
    const el = document.getElementById(`epTrTahapan_${i}`);
    if (el && typeof el.value === 'string') row.tahapan = el.value;
  });
}

function epTorAddRow(key) {
  if (key === 'strategi') _epSyncStrategiTahapanFromDom();
  _epTorRows[key].push({ nama_kegiatan: _epDokUsulan.nama_kegiatan || _epDokUsulan.sub_kegiatan || '' });
  _epRenderTorRows();
  _epUpdateTorSaveBtn();
}
function epTorRemoveRow(key, i) {
  if (key === 'strategi') _epSyncStrategiTahapanFromDom();
  _epTorRows[key].splice(i, 1);
  _epRenderTorRows();
  _epUpdateTorSaveBtn();
}

function epCollectTorData() {
  if (!document.getElementById('epTrDasarHukum')) {
    const raw = _epDokUsulan?.data_tor || {};
    return {
      ...raw,
      iku: raw.iku || (raw.iku_ikk || []).filter(r => _epIndikatorJenis(r.indikator) === 'IKU'),
      ikk: raw.ikk || (raw.iku_ikk || []).filter(r => _epIndikatorJenis(r.indikator) === 'IKK'),
    };
  }
  const hasIsi = r => Object.entries(r).some(([k, v]) => k !== 'nama_kegiatan' && v);
  _epSyncStrategiTahapanFromDom();
  const strategiBersih = _epTorRows.strategi.map(r => ({ ...r, tahapan: (r.tahapan || '').trim() }));
  return {
    dasar_hukum: document.getElementById('epTrDasarHukum').value.trim(),
    gambaran_umum: document.getElementById('epTrGambaranUmum').value.trim(),
    kurun_waktu_mulai: document.getElementById('epTrKurunMulai').value || null,
    kurun_waktu_selesai: document.getElementById('epTrKurunSelesai').value || null,
    iku: _epTorRows.iku.filter(hasIsi),
    ikk: _epTorRows.ikk.filter(hasIsi),
    penerima_manfaat: _epTorRows.penerima_manfaat.filter(hasIsi),
    strategi: strategiBersih.filter(hasIsi),
  };
}

const EP_BULAN = ['', 'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];

function _epBidangLabel(u, fallback) {
  const nama = (u.bidang_nama || fallback || '').trim();
  const prefix = u.bidang_tipe === 'puskesmas' ? 'Puskesmas'
    : u.bidang_tipe === 'sub_bagian' ? 'Sub Bagian'
    : 'Bidang';
  const sudahAdaPrefix = new RegExp(`^${prefix}\\b`, 'i').test(nama);
  return sudahAdaPrefix ? nama : `${prefix} ${nama}`;
}

function _epBuildTorPreviewHtml(d, u) {
  const total = _epDokRincianTotal();
  const bidangLabel = _epBidangLabel(u, '….');
  const kwMulai = d.kurun_waktu_mulai ?? u.waktu_mulai_bulan;
  const kwSelesai = d.kurun_waktu_selesai ?? u.waktu_selesai_bulan;
  const waktu = (kwMulai && kwSelesai)
    ? (Number(kwMulai) === Number(kwSelesai) ? `Bulan ${EP_BULAN[kwMulai]} ${u.tahun_anggaran || ''}` : `Bulan ${EP_BULAN[kwMulai]} - ${EP_BULAN[kwSelesai]} ${u.tahun_anggaran || ''}`)
    : 'Bulan ……..';
  const thStyle = 'border:1px solid #0f766e;background:#0d9488;color:#fff;padding:4px 6px;text-align:center;font-size:11px;text-transform:uppercase';
  const tdStyle = 'border:1px solid #cbd5e1;padding:4px 6px;vertical-align:top;font-size:11px';
  const tdStyleNo = tdStyle + ';text-align:center';
  const EP_TOR_CENTER_FIELDS = new Set(['jumlah', 'penerima', 'satuan', 'volume', 'metode']);
  const cellStyle = (f) => tdStyle + (EP_TOR_CENTER_FIELDS.has(f) ? ';text-align:center' : '');
  const cellHtml = (r, f) => {
    if (f === 'tahapan') return _epRenderNarasiHtml((r.tahapan || '').trim() || '-', false);
    return esc(r[f] || '');
  };
  const rowsHtml = (rows, cols) => rows.length
    ? rows.map((r, i) => `<tr><td style="${tdStyleNo}">${i + 1}</td>${cols.map(([f]) => `<td style="${cellStyle(f)}">${cellHtml(r, f)}</td>`).join('')}</tr>`).join('')
    : `<tr><td colspan="${cols.length + 1}" style="${tdStyle}text-align:center;color:#94a3b8">-</td></tr>`;
  const tdStyleV = 'border-left:1px solid #cbd5e1;border-right:1px solid #cbd5e1;padding:4px 6px;vertical-align:top;font-size:11px';
  const rowsHtmlIkuIkk = (ikuRows, ikkRows) => {
    const namaKegiatan = esc((ikuRows[0] || ikkRows[0] || {}).nama_kegiatan || '');
    const padTop = (isFirst) => isFirst ? '4px' : '2px';
    const EP_IKU_IKK_LABEL = { IKU: 'IKU (Indikator Kinerja Utama)', IKK: 'IKK (Indikator Kinerja Kunci)' };
    const labelTr = (label, isFirst) => `<tr>
        <td style="padding:${padTop(isFirst)} 6px 2px;font-weight:700;font-size:11px">${EP_IKU_IKK_LABEL[label]}</td>
        <td style="padding:${padTop(isFirst)} 6px 2px;border-left:1px solid #cbd5e1"></td>
      </tr>`;
    const itemTr = (r, no, isFirst) => `<tr>
        <td style="padding:${padTop(isFirst)} 6px 2px;vertical-align:top;font-size:11px"><div style="display:flex"><span style="flex:none;width:1.7em;text-align:left">${no}.</span><span style="flex:1">${esc(r.indikator || '-')}</span></div></td>
        <td style="padding:${padTop(isFirst)} 6px 2px;vertical-align:top;border-left:1px solid #cbd5e1;text-align:center;font-size:11px">${esc(r.target || '-')}</td>
      </tr>`;
    const innerRows = !ikuRows.length && !ikkRows.length
      ? `<tr><td style="padding:4px 6px 2px;vertical-align:top;text-align:center;color:#94a3b8;font-size:11px">-</td><td style="padding:4px 6px 2px;vertical-align:top;border-left:1px solid #cbd5e1;text-align:center;color:#94a3b8;font-size:11px">-</td></tr>`
      : [
          ...(ikuRows.length ? [labelTr('IKU', true), ...ikuRows.map((r, i) => itemTr(r, i + 1, false))] : []),
          ...(ikkRows.length ? [labelTr('IKK', !ikuRows.length), ...ikkRows.map((r, i) => itemTr(r, i + 1, false))] : [])
        ].join('');
    return `<tr>
      <td style="${tdStyleV};text-align:center">1</td>
      <td style="${tdStyleV}">${namaKegiatan}</td>
      <td colspan="2" style="border-left:1px solid #cbd5e1;border-right:1px solid #cbd5e1;padding:0;vertical-align:top">
        <table style="width:100%;border-collapse:collapse"><colgroup><col style="width:67.7%"><col style="width:32.3%"></colgroup>
          <tbody>${innerRows}</tbody>
        </table>
      </td>
    </tr>`;
  };
  return `
    <div style="text-align:center;font-weight:700;margin-bottom:2px">KERANGKA ACUAN KERJA/<i>TERM OF REFERENCE</i></div>
    <div style="text-align:center;font-weight:700;margin-bottom:16px;padding-bottom:8px;border-bottom:2px solid #000">TAHUN ANGGARAN ${u.tahun_anggaran || ''}</div>
    <p style="font-weight:700;margin-bottom:4px">A. LATAR BELAKANG</p>
    <p style="font-weight:600;margin:6px 0 2px;margin-left:20px">1. Dasar Hukum</p>
    <div style="margin-left:32px">${_epRenderNarasiHtml(d.dasar_hukum || '-', true)}</div>
    <p style="font-weight:600;margin:6px 0 2px;margin-left:20px">2. Gambaran Umum</p>
    <div style="margin-left:32px">${_epRenderNarasiHtml(d.gambaran_umum || '-', true)}</div>
    <p style="font-weight:600;margin:6px 0 2px;margin-left:20px">3. Dukungan terhadap IKU dan IKK</p>
    <table style="margin:8px 0 14px 32px;width:calc(100% - 32px);border-collapse:collapse;border:1px solid #cbd5e1"><colgroup><col style="width:6%"><col style="width:32%"><col style="width:42%"><col style="width:20%"></colgroup><thead><tr><th style="${thStyle}">No</th><th style="${thStyle}">Nama Kegiatan</th><th style="${thStyle}">Indikator Kinerja yang Didukung</th><th style="${thStyle}">Target ${u.tahun_anggaran || ''}</th></tr></thead>
      <tbody>${rowsHtmlIkuIkk(d.iku || [], d.ikk || [])}</tbody></table>

    <p style="font-weight:700;margin-bottom:4px">B. PENERIMA MANFAAT</p>
    <table style="margin:8px 0 14px 14px;width:calc(100% - 14px);border-collapse:collapse"><thead><tr><th style="${thStyle}">No</th><th style="${thStyle}">Nama Kegiatan</th><th style="${thStyle}">Jumlah Penerima Manfaat</th><th style="${thStyle}">Penerima Manfaat</th></tr></thead>
      <tbody>${rowsHtml(d.penerima_manfaat, [['nama_kegiatan','Nama Kegiatan'], ...EP_TOR_COLS.penerima_manfaat])}</tbody></table>

    <p style="font-weight:700;margin-bottom:4px">C. STRATEGI PENCAPAIAN KELUARAN</p>
    <table style="margin:8px 0 6px 14px;width:calc(100% - 14px);border-collapse:collapse"><colgroup><col style="width:5%"><col style="width:26%"><col style="width:11%"><col style="width:9%"><col style="width:17%"><col style="width:32%"></colgroup><thead>
      <tr><th rowspan="2" style="${thStyle}">No</th><th rowspan="2" style="${thStyle}">Rincian Menu/Komponen</th><th colspan="2" style="${thStyle}">Output</th><th rowspan="2" style="${thStyle}">Metode Pelaksanaan</th><th rowspan="2" style="${thStyle}">Tahapan Pelaksanaan</th></tr>
      <tr><th style="${thStyle}">Satuan</th><th style="${thStyle}">Volume</th></tr>
      </thead>
      <tbody>${rowsHtml(d.strategi, [['nama_kegiatan','Rincian Menu/Komponen'], ...EP_TOR_COLS.strategi])}</tbody></table>
    <p style="font-weight:700;margin:16px 0 4px">D. KURUN WAKTU PENCAPAIAN KELUARAN</p>
    <table style="margin:8px 0 14px 14px;width:calc(100% - 14px);border-collapse:collapse"><thead><tr><th style="${thStyle}">No</th><th style="${thStyle}">Kegiatan yang diusulkan</th><th style="${thStyle}">Rencana Waktu Pelaksanaan</th></tr></thead>
      <tbody><tr><td style="${tdStyleNo}">1</td><td style="${tdStyle}">${esc(u.nama_kegiatan || u.sub_kegiatan || '-')}</td><td style="${tdStyle};text-align:center">${esc(waktu)}</td></tr></tbody></table>

    <p style="font-weight:700;margin-bottom:4px">E. BIAYA YANG DIPERLUKAN</p>
    <p style="text-align:justify;margin-bottom:30px;margin-left:14px">Biaya yang diperlukan untuk usulan kegiatan <b>${esc(u.nama_kegiatan || u.sub_kegiatan || '')}</b> adalah sebesar <b>${epFmtRupiah(total)} (${_epTerbilang(total)})</b> dengan kebutuhan per rincian menu kegiatan terlampir pada RAB.</p>

    ${_epFullSignRowHtml(u, bidangLabel)}`;
}

function epPreviewTor() {
  const d = epCollectTorData();
  const u = _epDokUsulan;
  const html = _epBuildTorPreviewHtml(d, u);
  _bukaPreviewPDF(html, `TOR - ${u.nama_kegiatan || u.sub_kegiatan || ''}`, 'portrait');
}

function _epRenderTorPreviewOnly() {
  const u = _epDokUsulan;
  const d = epCollectTorData();
  return `${_epDokStatusBar('tor')}${_epDokZoomToolbar('tor', 'epPreviewTor()')}${_epDokPreviewWrap(_epBuildTorPreviewHtml(d, u))}${_epDokZoomToolbarEnd}`;
}

function _epRenderRabTab() {
  const totalRows = _epDokRincian.length;
  const totalPages = Math.max(1, Math.ceil(totalRows / _epRabPageSize));
  if (_epRabPage > totalPages) _epRabPage = totalPages;
  const startIdx = (_epRabPage - 1) * _epRabPageSize;
  const pageRows = _epDokRincian.slice(startIdx, startIdx + _epRabPageSize);
  const editable = _epDokEditable('rab');

  let rowsHtml = '';
  let lastUraianPaket = null, lastKeterangan = null, lastKey = null;
  if (!pageRows.length) {
    rowsHtml = `<tr class="empty-row"><td colspan="5">Belum ada rincian belanja</td></tr>`;
  } else {
    pageRows.forEach(r => {
      const uraianPaket = r.uraian_paket || '-';
      if (uraianPaket !== lastUraianPaket) {
        if (r.uraian_paket) rowsHtml += `<tr><td></td><td colspan="4" style="font-weight:700">[#] ${esc(uraianPaket)}</td></tr>`;
        lastUraianPaket = uraianPaket;
        lastKeterangan = null;
        lastKey = null;
      }
      const keterangan = r.keterangan || '-';
      if (keterangan !== lastKeterangan) {
        rowsHtml += `<tr><td></td><td colspan="4" style="font-weight:700;padding-left:12px">[-] ${esc(keterangan)}</td></tr>`;
        lastKeterangan = keterangan;
        lastKey = null;
      }
      const key = r.kategori_standar === 'MANUAL' ? 'MANUAL' : `${r.kode_rekening || ''}||${r.nama_rekening || ''}`;
      if (key !== lastKey) {
        const rekLabel = r.kategori_standar === 'MANUAL' ? 'Manual (Survei Harga)' : `${esc(r.kode_rekening || '-')} ${esc(r.nama_rekening || '')}`;
        rowsHtml += `<tr><td></td><td colspan="4" style="font-weight:700;white-space:nowrap">${rekLabel}</td></tr>`;
        lastKey = key;
      }
      const aksiHtml = `<button class="btn btn-ghost btn-sm" data-tip="Lihat Detail" onclick="_epDokSyncRincianContext();openRincianItemModal('${r.id}', true)">${EP_ICON_SEARCH}</button>
        ${editable ? `<button class="btn btn-ghost btn-sm" data-tip="Edit" onclick="_epDokSyncRincianContext();openRincianItemModal('${r.id}')">${EP_ICON_EDIT}</button>
           <button class="btn-hapus" data-tip="Hapus" onclick="_epDokSyncRincianContext();deleteRincianItem('${r.id}')">${EP_ICON_TRASH}</button>` : ''}`;
      rowsHtml += `<tr>
        <td style="width:90px;white-space:nowrap">${aksiHtml}</td>
        <td>${esc(r.komponen || '-')}<div style="font-size:11px;color:var(--text-secondary,#64748b)">${esc(r.spesifikasi || '')}</div></td>
        <td>${esc(r.koefisien || '-')}</td>
        <td style="white-space:nowrap">${epFmtRupiah(r.harga_satuan)}</td>
        <td style="white-space:nowrap;font-weight:600">${epFmtRupiah(r.sub_total)}</td>
      </tr>`;
    });
  }

  const total = _epDokRincianTotal();

  return `
    ${_epDokStatusBar('rab')}
    <table class="surat-table" style="width:100%">
      <thead><tr>
        <th style="width:40px">Aksi</th>
        <th>Uraian</th>
        <th>Koefisien</th>
        <th>Harga Satuan</th>
        <th>Total</th>
      </tr></thead>
      <tbody>${rowsHtml}</tbody>
      <tfoot><tr><td colspan="4" style="text-align:right;font-weight:700">Total</td><td style="padding:0"><span style="display:block;text-align:center;white-space:nowrap;font-weight:700;color:var(--hijau,#047D78);background:var(--hijau-light,#ccfbf1);padding:6px 12px;border-radius:8px">${epFmtRupiah(total)}</span></td></tr></tfoot>
    </table>
    <div id="epRabPagination" style="margin-top:10px"></div>
    ${_epDokActionsBar('rab', `<button type="button" class="btn btn-primary btn-sm" onclick="_epDokSyncRincianContext();openRincianItemModal()"><svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5" style="margin-right:5px;vertical-align:-2px"><path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4"/></svg>Tambah Rincian</button>`, 'epPreviewRab()')}`;
}

function _epRabPaginationRender() {
  const totalRows = _epDokRincian.length;
  const totalPages = Math.max(1, Math.ceil(totalRows / _epRabPageSize));
  if (_epRabPage > totalPages) _epRabPage = totalPages;
  renderPagination('epRabPagination', totalRows, _epRabPage, _epRabPageSize, 'goEpRabPage');
}
window.goEpRabPage = (p) => {
  _epRabPage = p;
  const el = document.getElementById('epDokContent');
  if (el) { el.innerHTML = _epRenderRabTab(); _epRabPaginationRender(); }
};

function _epDokSyncRincianContext() {
  _epCurrentUsulan = _epDokUsulan;
  _epRincianList = _epDokRincian;
}

async function _epDokRefreshRincian() {
  if (!_epDokUsulan) return;
  try {
    const r = await fetch(`/api/eplanning/rincian?usulan_id=${_epDokUsulan.id}`, { headers: authHeaders() });
    const d = await r.json();
    _epDokRincian = d.rincian || [];
  } catch {  }
  try {
    const ru = await fetch(`/api/eplanning/usulan/${_epDokUsulan.id}`, { headers: authHeaders() });
    const du = await ru.json();
    if (ru.ok) _epDokUsulan = du.usulan;
  } catch {  }
  if (_epDokTab === 'rab') {
    const el = document.getElementById('epDokContent');
    if (el) { el.innerHTML = _epRenderRabTab(); _epRabPaginationRender(); }
  }
  _epUpdateDokIndikator();
}

function _epParseKoefisienSegments(koefisien) {
  const raw = String(koefisien || '').trim();
  if (!raw) return [];
  return raw.split(/\s*[xX]\s*/).map(seg => {
    const m = seg.trim().match(/^(-?\d+(?:[.,]\d+)?)\s*(.*)$/);
    return m ? { num: m[1], unit: m[2].trim() } : { num: '', unit: seg.trim() };
  }).filter(s => s.num || s.unit);
}

function _epBuildRabTable(u, rincian, aksiCellFn) {
  const total = _epDokRincianTotal();
  const target = _epParseTarget(u.target);
  const N = Math.max(1, rincian.length);

  const allSegs = rincian.map(r => _epParseKoefisienSegments(r.koefisien));
  const maxSeg = Math.max(1, ...allSegs.map(s => s.length), 0);
  const volCols = maxSeg * 2 + Math.max(0, maxSeg - 1);

  const td = 'style="border:1px solid #333;padding:2px 4px;font-size:7px;vertical-align:top"';
  const tdC = 'style="border:1px solid #333;padding:2px 4px;font-size:7px;vertical-align:top;text-align:center"';
  const tdR = 'style="border:1px solid #333;padding:2px 4px;font-size:7px;vertical-align:top;text-align:right;white-space:nowrap"';
  const tdNW = 'style="border:1px solid #333;padding:2px 4px;font-size:7px;vertical-align:top;white-space:nowrap"';
  const tdCNW = 'style="border:1px solid #333;padding:2px 4px;font-size:7px;vertical-align:top;text-align:center;white-space:nowrap"';
  const th = 'style="border:1px solid #333;padding:3px 4px;font-size:7px;font-weight:700;text-align:center;text-transform:uppercase;background:#0f766e;color:#fff"';
  const thW = (w) => `style="border:1px solid #333;padding:3px 4px;font-size:7px;font-weight:700;text-align:center;text-transform:uppercase;background:#0f766e;color:#fff;width:${w}"`;

  const rekKeyOf = (r) => r.kategori_standar === 'MANUAL' ? 'MANUAL' : `${r.kode_rekening || ''}||${r.nama_rekening || ''}`;
  const kodeSpan = rincian.map((r, i) => {
    if (i > 0 && rekKeyOf(r) === rekKeyOf(rincian[i - 1])) return 0;
    let span = 1;
    for (let j = i + 1; j < rincian.length && rekKeyOf(rincian[j]) === rekKeyOf(r); j++) span++;
    return span;
  });

  const rowsHtml = rincian.length
    ? rincian.map((r, i) => {
        const segs = _epParseKoefisienSegments(r.koefisien);
        let volCells = '';
        for (let s = 0; s < maxSeg; s++) {
          const seg = segs[s] || { num: '', unit: '' };
          volCells += `<td ${tdCNW}>${esc(seg.num)}</td><td ${tdNW}>${esc(seg.unit)}</td>`;
          if (s < maxSeg - 1) {
            const hasNext = segs[s + 1] && (segs[s + 1].num || segs[s + 1].unit);
            volCells += `<td ${tdCNW}>${(seg.num || seg.unit) && hasNext ? 'x' : ''}</td>`;
          }
        }
        return `<tr>
          ${aksiCellFn ? aksiCellFn(r) : ''}
          ${i === 0 ? `<td ${tdC} rowspan="${N}">1</td><td ${td} rowspan="${N}"><b>${esc(u.nama_kegiatan || '-')}</b></td>` : ''}
          ${kodeSpan[i] > 0 ? (r.kategori_standar === 'MANUAL' ? `<td ${td} colspan="2" rowspan="${kodeSpan[i]}">Manual (Survei Harga)</td>` : `<td ${td} rowspan="${kodeSpan[i]}">${esc(r.kode_rekening || '-')}</td><td ${td} rowspan="${kodeSpan[i]}">${esc(r.nama_rekening || '-')}</td>`) : ''}
          <td ${td}><b>${esc(r.komponen || '-')}</b>${r.spesifikasi ? `<div style="font-style:italic;color:#475569">Spesifikasi: ${esc(r.spesifikasi)}</div>` : ''}</td>
          <td ${tdNW}>${esc(r.satuan || '-')}</td>
          ${volCells}
          <td ${tdR}>${epFmtRupiah(r.harga_satuan)}</td>
          <td ${tdR}><b>${epFmtRupiah(r.sub_total)}</b></td>
          ${i === 0 ? `<td ${tdR} rowspan="${N}"><b>${epFmtRupiah(total)}</b></td>
          <td ${td} rowspan="${N}">${esc(u.sub_kegiatan || '-')}</td>
          <td ${td} rowspan="${N}">${esc(u.indikator || '-')}</td>
          <td ${tdNW} rowspan="${N}">${esc(target.satuan || '-')}</td>
          <td ${tdC} rowspan="${N}">${esc(target.angka || '-')}</td>` : ''}
        </tr>`;
      }).join('')
    : `<tr>${aksiCellFn ? aksiCellFn(null) : ''}<td ${tdC} rowspan="1">1</td><td ${td}><b>${esc(u.nama_kegiatan || '-')}</b></td>
        <td colspan="${4 + volCols + 2}" ${tdC} style="color:#94a3b8">Belum ada rincian</td>
        <td ${tdR}><b>${epFmtRupiah(0)}</b></td>
        <td ${td}>${esc(u.sub_kegiatan || '-')}</td>
        <td ${td}>${esc(u.indikator || '-')}</td>
        <td ${tdNW}>${esc(target.satuan || '-')}</td>
        <td ${tdC}>${esc(target.angka || '-')}</td>
      </tr>`;

  return `
    <table style="width:100%;border-collapse:collapse">
      <thead>
        <tr>
          ${aksiCellFn ? `<th ${th} rowspan="2">Aksi</th>` : ''}
          <th ${thW('2%')} rowspan="2">No</th>
          <th ${thW('10%')} rowspan="2">Nama Kegiatan yang Diusulkan</th>
          <th ${th} colspan="2">Rekening Belanja</th>
          <th ${thW('16%')} rowspan="2">Uraian Belanja</th>
          <th ${th} rowspan="2">Satuan</th>
          <th ${th} colspan="${volCols}" rowspan="2">Rincian Volume</th>
          <th ${th} rowspan="2">Harga Satuan</th>
          <th ${th} rowspan="2">Sub Total</th>
          <th ${th} rowspan="2">Jumlah Total</th>
          <th ${thW('9%')} rowspan="2">Sub Kegiatan SIPD</th>
          <th ${thW('7%')} rowspan="2">Indikator Sub Kegiatan</th>
          <th ${th} rowspan="2">Satuan</th>
          <th style="border:1px solid #333;padding:3px 4px;font-size:7px;font-weight:700;text-align:center;text-transform:uppercase;background:#0f766e;color:#fff;width:3%;white-space:nowrap" rowspan="2">Target</th>
        </tr>
        <tr>
          <th ${thW('6%')}>Kode Rekening</th>
          <th ${thW('7%')}>Detail</th>
        </tr>
      </thead>
      <tbody>${rowsHtml}</tbody>
    </table>`;
}

function epPreviewRab() {
  const u = _epDokUsulan;
  const rincian = _epDokRincian;
  const bidangLabel = _epBidangLabel(u, '-');

  const html = `
    <div style="text-align:center;font-weight:700;font-size:8px;margin-bottom:2px">${esc(bidangLabel.toUpperCase())}</div>
    <div style="text-align:center;font-weight:700;font-size:8px;margin-bottom:10px">RENCANA ANGGARAN BIAYA (RAB)</div>
    ${_epBuildRabTable(u, rincian)}`;
  _bukaPreviewPDF(html, `RAB - ${u.nama_kegiatan || u.sub_kegiatan || ''}`, 'landscape');
}

async function epSaveDokumen(tipe) {
  const id = _epDokUsulan.id;
  const data = tipe === 'surat' ? epCollectSuratData() : epCollectTorData();
  if (tipe === 'surat') {
    const wajibSurat = [
      ['tempat_tanggal', 'epSrTempatTanggal', 'Tempat & Tanggal Surat'],
      ['nomor_surat', 'epSrNomor', 'Nomor Surat'],
      ['sifat', 'epSrSifat', 'Sifat'],
      ['hal', 'epSrHal', 'Hal'],
      ['isi_surat', 'epSrIsi', 'Isi Surat'],
    ];
    for (const [key, elId, label] of wajibSurat) {
      if (!data[key]) {
        toast(`${label} wajib diisi`, 'error');
        document.getElementById(elId)?.focus();
        return;
      }
    }
  }
  try {
    const r = await fetch(`/api/eplanning/usulan/${id}/dokumen`, {
      method: 'PUT', headers: { ...authHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ tipe, data }),
    });
    const d = await r.json();
    if (!r.ok) throw new Error(d.error || 'Gagal menyimpan dokumen');
    _epDokUsulan = d.usulan;
    _epDokUnlocked[tipe] = false;
    const idx = _epUsulanList.findIndex(u => u.id === id);
    if (idx > -1) _epUsulanList[idx] = d.usulan;
    _epUpdateDokIndikator();
    toast(`${tipe === 'surat' ? 'Surat Usulan' : 'TOR'} tersimpan`, 'success');
    const nextTab = tipe === 'surat' ? 'tor' : tipe === 'tor' ? 'rab' : null;
    if (nextTab) epSwitchDokTab(nextTab);
  } catch (err) { toast(err.message, 'error'); }
}

let _epPraList = [];
let _epPraPage = 1;
const _epPraPageSize = 10;
let _epPraFilterBidang = '';
let _epPraFilterStatus = '';
let _epPraSearchText = '';

function setEpPraTahunAktif(val) {
  _epTahunAktif = parseInt(val);
  localStorage.setItem('ep_tahun_aktif', String(_epTahunAktif));
  _renderEpTahunDropdowns();
  const el = document.getElementById('epPraTahunAktif');
  if (el) el.value = _epTahunAktif;
  const page = document.getElementById('page-eplanning-praunsulan');
  if (page && page.classList.contains('active')) loadEplanningPraUsulan();
}

function _epPraIsVerifikator(role) { return role.isAdmin || role.isKabid || role.isSekretaris; }

function _epPraColCount() {
  const role = epRole();
  let n = 5;
  if (role.isAdmin) n++;
  if (_epPraIsVerifikator(role)) n++;
  return n;
}

function _epPraToggleAdminCols() {
  const role = epRole();
  const isAdmin = role.isAdmin;
  const isVerifikator = _epPraIsVerifikator(role);
  const thUnit = document.getElementById('epPraThUnitKerja');
  const thPengusul = document.getElementById('epPraThPengusul');
  if (thUnit) thUnit.style.display = isAdmin ? '' : 'none';
  if (thPengusul) thPengusul.style.display = isVerifikator ? '' : 'none';
  const wrapFilterBidang = document.getElementById('epPraFilterBidangWrap');
  if (wrapFilterBidang) wrapFilterBidang.style.display = isAdmin ? '' : 'none';
}

async function loadEplanningPraUsulan({ keepPage = false } = {}) {
  const btnTambah = document.getElementById('btnTambahEpPraUsulan');
  const tbody = document.getElementById('epPraTableBody');
  _epPraToggleAdminCols();
  if (tbody) tbody.innerHTML = `<tr class="empty-row"><td colspan="${_epPraColCount()}"><span class="btn-spin" style="width:11px;height:11px;vertical-align:-1px;margin-right:6px"></span>Memuat data...</td></tr>`;

  const [periodeList] = await Promise.all([_epFetchPeriodeAktif(), epEnsureTahunList()]);
  _epApplyPeriodeAktif(periodeList);
  const selTahun = document.getElementById('epPraTahunAktif');
  if (selTahun) {
    selTahun.innerHTML = _epTahunList.map(t => `<option value="${t}">${t}</option>`).join('');
    selTahun.value = _epTahunAktif;
  }
  if (btnTambah) {
    _epRefreshBtnTambah();
  }
  const banner = document.getElementById('epPraPeriodeBanner');
  if (banner) renderEpPeriodeBanner('epPraPeriodeBanner');

  try {
    const qs = new URLSearchParams({ tahap: 'pra-usulan', ...(_epTahunAktif ? { tahun: String(_epTahunAktif) } : {}) });
    const r = await fetch(`/api/eplanning/usulan?${qs}`, { headers: authHeaders() });
    const d = await r.json();
    if (!r.ok) throw new Error(d.error || 'Gagal memuat data');
    _epPraList = d.usulan || [];
    if (!keepPage) _epPraPage = 1;
    _rebuildEpPraFilterBidang();
    _rebuildEpPraFilterStatus();
    renderEplanningPraTable();
    _epUsulankuRenderTimeline();
  } catch (err) {
    if (tbody) tbody.innerHTML = `<tr class="empty-row"><td colspan="${_epPraColCount()}">${esc(err.message)}</td></tr>`;
  }
}

const EP_PRA_STATUS_LABEL = {
  DRAFT: 'Draft',
  'MENUNGGU KEPALA PUSKESMAS': 'Menunggu Kepala Puskesmas',
  'MENUNGGU KEPALA BIDANG': 'Menunggu Kepala Bidang',
  'MENUNGGU KEPALA SUB BAGIAN': 'Menunggu Kepala Sub Bagian',
  'MENUNGGU SEKRETARIS': 'Menunggu Sekretaris Dinas',
  'MENUNGGU ADMIN': 'Menunggu Admin (Verifikator)',
  DITOLAK: 'Ditolak',
};

const EP_DITOLAK_OLEH_LABEL = {
  KEPALA_PUSKESMAS: 'Ditolak Kepala Puskesmas',
  KEPALA_BIDANG: 'Ditolak Kepala Bidang',
  KEPALA_SUB_BAGIAN: 'Ditolak Kepala Sub Bagian',
  SEKRETARIS: 'Ditolak Sekretaris Dinas',
  ADMIN: 'Ditolak Verifikator',
  KEPALA: 'Ditolak Kepala',
};

function epShowCatatanTolak(id) {
  const u = _epPraList.find(x => x.id === id) || _epUsulanList.find(x => x.id === id);
  if (!u || !u.catatan_koreksi) return;
  const label = u.ditolak_oleh ? (EP_DITOLAK_OLEH_LABEL[u.ditolak_oleh] || u.ditolak_oleh) : 'Ditolak';
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay open';
  overlay.style.zIndex = '2000';
  overlay.innerHTML = `
    <div class="modal" style="max-width:440px">
      <div class="modal-header">
        <div class="modal-title-wrap">
          <span class="modal-icon-badge modal-icon-badge--red">${EP_ICON_MESSAGE}</span>
          <div class="modal-title">${esc(label)}</div>
        </div>
        <button type="button" class="btn-close" data-act="close">${EP_ICON_REJECT}</button>
      </div>
      <div class="modal-body">
        <div style="font-size:.85rem;color:var(--teks,#1e293b);white-space:pre-wrap;word-break:break-word">${esc(u.catatan_koreksi)}</div>
      </div>
      <div class="modal-footer">
        <button type="button" class="btn btn-ghost" data-act="close"><svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5" style="margin-right:5px;vertical-align:-2px"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>Tutup</button>
      </div>
    </div>`;
  document.body.appendChild(overlay);
  const close = () => overlay.remove();
  overlay.addEventListener('click', (e) => {
    if (e.target.closest('[data-act="close"]') || e.target === overlay) close();
  });
  document.addEventListener('keydown', function onKey(e) {
    if (e.key === 'Escape') { close(); document.removeEventListener('keydown', onKey); }
  });
}

const EP_PRA_STATUS_STYLE = {
  DRAFT: 'background:#f1f5f9;color:#64748b',
  DITOLAK: 'background:#fee2e2;color:#991b1b',
  'MENUNGGU KEPALA PUSKESMAS': 'background:#fef3c7;color:#92400e',
  'MENUNGGU KEPALA BIDANG': 'background:#fef3c7;color:#92400e',
  'MENUNGGU KEPALA SUB BAGIAN': 'background:#fef3c7;color:#92400e',
  'MENUNGGU SEKRETARIS': 'background:#fef3c7;color:#92400e',
  'MENUNGGU ADMIN': 'background:#fef3c7;color:#92400e',
  SELESAI: 'background:#d1fae5;color:#065f46',
};
function _epStatusBadge(status) {
  const style = EP_PRA_STATUS_STYLE[status] || EP_PRA_STATUS_STYLE.DRAFT;
  const label = EP_PRA_STATUS_LABEL[status] || status || '-';
  return `<span style="display:inline-block;padding:2px 8px;border-radius:5px;font-size:.72rem;font-weight:600;white-space:nowrap;${style}">${esc(label)}</span>`;
}

function _rebuildEpPraFilterStatus() {
  const sel = document.getElementById('epPraFilterStatus');
  if (!sel) return;
  const current = _epPraFilterStatus;
  const present = new Set(_epPraList.map(u => u.status).filter(Boolean));
  const opts = Object.keys(EP_PRA_STATUS_LABEL)
    .filter(s => present.has(s))
    .map(s => `<option value="${s}">${esc(EP_PRA_STATUS_LABEL[s])}</option>`).join('');
  sel.innerHTML = `<option value="">Semua Status</option>` + opts;
  if (current && !present.has(current)) { _epPraFilterStatus = ''; }
  sel.value = _epPraFilterStatus;
}

function _rebuildEpPraFilterBidang() {
  const sel = document.getElementById('epPraFilterBidang');
  if (!sel) return;
  const current = _epPraFilterBidang;
  const map = new Map();
  _epPraList.forEach(u => { if (u.bidang_id != null) map.set(String(u.bidang_id), u.bidang_nama || '-'); });
  const opts = [...map.entries()].sort((a, b) => a[1].localeCompare(b[1], 'id'))
    .map(([id, nama]) => `<option value="${id}">${esc(nama)}</option>`).join('');
  sel.innerHTML = `<option value="">Semua Unit Kerja</option>` + opts;
  if (map.size === 1) { _epPraFilterBidang = [...map.keys()][0]; }
  else if (current && !map.has(current)) { _epPraFilterBidang = ''; }
  else { _epPraFilterBidang = current; }
  sel.value = _epPraFilterBidang;
}

function setEpPraFilterBidang(v) { _epPraFilterBidang = v; _epPraPage = 1; renderEplanningPraTable(); }
function setEpPraFilterStatus(v) { _epPraFilterStatus = v; _epPraPage = 1; renderEplanningPraTable(); }
function setEpPraSearchText(v) { _epPraSearchText = (v || '').trim(); _epPraPage = 1; renderEplanningPraTable(); }

function _epPraFilteredList() {
  const q = _epPraSearchText.toLowerCase();
  return _epPraList.filter(u => {
    if (_epPraFilterStatus && u.status !== _epPraFilterStatus) return false;
    if (_epPraFilterBidang && String(u.bidang_id) !== _epPraFilterBidang) return false;
    if (q && !(u.nama_kegiatan || '').toLowerCase().includes(q) && !(u.sub_kegiatan || '').toLowerCase().includes(q)) return false;
    return true;
  });
}

function _epKomponenBadge(status) {
  const map = {
    DISETUJUI: 'background:#d1fae5;color:#065f46',
    DITOLAK: 'background:#fee2e2;color:#991b1b',
    MENUNGGU: 'background:#fef3c7;color:#92400e',
  };
  const style = map[status] || map.MENUNGGU;
  return `<span style="display:inline-block;padding:2px 8px;border-radius:5px;font-size:.72rem;font-weight:600;${style}">${status || 'MENUNGGU'}</span>`;
}

function goEpPraPage(p) { _epPraPage = p; renderEplanningPraTable(); }

function _epHasTtd() { return !!(_user && (_user.is_admin || _user.tanda_tangan)); }

function _epButuhTtd() {
  if (!_user || _user.is_admin) return false;
  const role = epRole();
  return role.isAdmin || role.isKabid || role.isOperator || role.isSekretaris;
}

function _epRefreshBtnTambah() {
  const btnTambah = document.getElementById('btnTambahEpPraUsulan');
  if (!btnTambah) return;
  btnTambah.style.display = (epRole().isOperator && _epPeriodeAktif) ? '' : 'none';
  const ttdOk = _epHasTtd();
  btnTambah.disabled = !ttdOk;
  btnTambah.style.opacity = ttdOk ? '' : '.5';
  btnTambah.style.cursor = ttdOk ? '' : 'not-allowed';
  if (ttdOk) btnTambah.removeAttribute('data-tip');
  else btnTambah.setAttribute('data-tip', 'Upload tanda tangan Anda dulu di Profil');
}

function _cekTtdLoginPopup() {
  try {
    if (document.getElementById('ttdLoginPopup')) return;
    if (!_epButuhTtd()) return;
    if (_epHasTtd()) return;

    const SVG_PEN = '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14.086 18.412A2 2 0 0112.67 19H5v-7.672a2 2 0 01.586-1.414L11.75 3.75a6 6 0 118.49 8.49z"/><path d="M16 8 2 22"/><path d="M17.488 15H9"/></svg>';
    const SVG_PEN_SM = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M14.086 18.412A2 2 0 0112.67 19H5v-7.672a2 2 0 01.586-1.414L11.75 3.75a6 6 0 118.49 8.49z"/><path d="M16 8 2 22"/><path d="M17.488 15H9"/></svg>';

    const popup = document.createElement('div');
    popup.id = 'ttdLoginPopup';
    popup.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:9998;display:flex;align-items:center;justify-content:center;backdrop-filter:blur(3px)';
    popup.innerHTML = `
      <div style="background:var(--putih,#fff);border-radius:var(--r-lg,16px);width:420px;max-width:calc(100vw - 32px);overflow:hidden;box-shadow:0 24px 60px rgba(0,0,0,.3)">
        <div style="background:linear-gradient(135deg,var(--merah,#dc3545),#ef4444);padding:16px 20px;color:#fff">
          <div style="display:flex;align-items:center;gap:10px">
            <span style="display:flex">${SVG_PEN}</span>
            <span style="font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:.5px">Perhatian — Tanda Tangan</span>
          </div>
        </div>
        <div style="padding:20px">
          <div style="display:flex;align-items:flex-start;gap:14px;padding:4px 0 12px">
            <div style="width:44px;height:44px;border-radius:12px;background:#fef2f2;border:1.5px solid #fca5a5;display:flex;align-items:center;justify-content:center;flex-shrink:0;color:var(--merah,#dc3545)">${SVG_PEN}</div>
            <div>
              <div style="font-weight:700;color:var(--teks,#0f172a);font-size:14px;margin-bottom:4px">Tanda Tangan Belum Diupload</div>
              <div style="font-size:13px;color:var(--teks-muted,#64748b);line-height:1.6">Anda belum mengupload <b>tanda tangan</b>. Tanda tangan diperlukan untuk mengajukan atau memverifikasi usulan e-Planning.</div>
            </div>
          </div>
          <div style="background:#fef2f2;border:1px solid #fca5a5;border-radius:8px;padding:10px 14px;font-size:12px;color:#7f1d1d;margin-bottom:4px">
            ⚠️ Upload di: <b>Profil → Tanda Tangan</b>
          </div>
          <div style="display:flex;gap:8px;margin-top:14px">
            <button onclick="document.getElementById('ttdLoginPopup').remove()" style="flex:1;height:42px;background:var(--abu-1,#f8fafc);border:none;border-radius:10px;color:var(--teks-muted,#64748b);font-size:13px;font-weight:600;cursor:pointer;font-family:inherit"><svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5" style="margin-right:5px;vertical-align:-2px"><path stroke-linecap="round" stroke-linejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>Nanti</button>
            <button onclick="document.getElementById('ttdLoginPopup').remove();openTandaTanganUpload()" style="flex:2;height:42px;background:linear-gradient(135deg,var(--merah,#dc3545),#ef4444);border:none;border-radius:10px;color:#fff;font-size:13px;font-weight:700;cursor:pointer;font-family:inherit;display:flex;align-items:center;justify-content:center;gap:6px">${SVG_PEN_SM} Upload Sekarang</button>
          </div>
        </div>
      </div>`;
    popup.addEventListener('click', e => { if (e.target === popup) popup.remove(); });
    document.body.appendChild(popup);
  } catch(e) {}
}

function _epDokLengkap(u) {
  const missing = [];
  if (!u.data_surat || !Object.keys(u.data_surat).length) missing.push('Surat Usulan');
  if (!u.data_tor || !Object.keys(u.data_tor).length) missing.push('TOR');
  if (!(Number(u.total_anggaran) > 0)) missing.push('RAB');
  return { ok: !missing.length, missing };
}

function renderEplanningPraTable() {
  _epUkRenderStats('praunsulan');
  const tbody = document.getElementById('epPraTableBody');
  if (!tbody) return;
  const role = epRole();
  _epPraToggleAdminCols();
  const filtered = _epPraFilteredList();
  if (!_epPraList.length) {
    tbody.innerHTML = `<tr class="empty-row"><td colspan="${_epPraColCount()}">Belum ada usulan di tahap Pra Usulan</td></tr>`;
    renderPagination('epPraPagination', 0, 1, _epPraPageSize, 'goEpPraPage');
    return;
  }
  if (!filtered.length) {
    tbody.innerHTML = `<tr class="empty-row"><td colspan="${_epPraColCount()}">Tidak ada usulan yang cocok dengan filter</td></tr>`;
    renderPagination('epPraPagination', 0, 1, _epPraPageSize, 'goEpPraPage');
    return;
  }
  const totalPages = Math.max(1, Math.ceil(filtered.length / _epPraPageSize));
  if (_epPraPage > totalPages) _epPraPage = totalPages;
  const start = (_epPraPage - 1) * _epPraPageSize;
  const list = filtered.slice(start, start + _epPraPageSize);
  tbody.innerHTML = list.map((u, i) => {
    const canEdit = ['DRAFT', 'DITOLAK'].includes(u.status) &&
      (role.isAdmin || (role.isOperator && u.pembuat_user_id === _user.id));
    const canDelete = _user.is_admin || canEdit;
    const canSubmitRole = ['DRAFT', 'DITOLAK'].includes(u.status) &&
      role.isOperator && u.pembuat_user_id === _user.id;
    const dokStatus = _epDokLengkap(u);
    const hasTtd = _epHasTtd();
    const canSubmit = canSubmitRole && dokStatus.ok && hasTtd;
    const canVerifikasi = isEpMenungguKepala(u.status) && (role.isAdmin || (role.isKabid && role.bidangId === u.bidang_id));
    const canApproveSekretaris = u.status === 'MENUNGGU SEKRETARIS' && (role.isAdmin || role.isSekretaris);
    const canApproveAdmin = u.status === 'MENUNGGU ADMIN' && role.isAdmin;
    const dokBelumDiajukan = ['DRAFT', 'DITOLAK'].includes(u.status);
    const dokTip = dokBelumDiajukan ? 'Kelola Dokumen' : 'Preview Dokumen';
    const dokIcon = dokBelumDiajukan ? EP_ICON_LIST : EP_ICON_EYE;
    return `<tr>
      <td>${start + i + 1}</td>
      <td>
        <div style="font-weight:600">${esc(u.nama_kegiatan || '-')}</div>
        <div style="font-size:12px;color:var(--text-secondary,#64748b)">${u.kode_subkegiatan ? `<b>${esc(u.kode_subkegiatan)}</b> - ` : ''}${esc(u.sub_kegiatan || '')}</div>
      </td>
      ${role.isAdmin ? `<td style="white-space:normal;word-wrap:break-word;overflow-wrap:break-word;max-width:180px">${esc(u.bidang_nama || '-')}</td>` : ''}
      ${_epPraIsVerifikator(role) ? `<td>${esc(u.pembuat_nama || '-')}</td>` : ''}
      <td style="white-space:nowrap;font-weight:600">${epFmtRupiah(u.total_anggaran)}</td>
      <td style="white-space:nowrap">
        ${u.status === 'DITOLAK' && u.catatan_koreksi
          ? `<span onclick="epShowCatatanTolak('${u.id}')" data-tip="Lihat Alasan Penolakan" style="display:inline-flex;align-items:center;gap:5px;padding:2px 8px;border-radius:5px;font-size:.72rem;font-weight:600;white-space:nowrap;background:#fee2e2;color:#991b1b;cursor:pointer">Ditolak ${EP_ICON_MESSAGE_SM}</span>`
          : _epStatusBadge(u.status)}
      </td>
      <td style="white-space:nowrap">
        <button class="btn btn-ghost btn-sm" data-tip="${dokTip}" onclick="epOpenDokumenFor('${u.id}')">${dokIcon}</button>
        ${canEdit ? `<button class="btn btn-ghost btn-sm" data-tip="Edit" onclick="openUsulanModal('${u.id}')">${EP_ICON_EDIT}</button>` : ''}
        ${canSubmit ? `<button class="btn btn-ghost btn-sm" data-tip="${u.status === 'DITOLAK' ? 'Ajukan Kembali' : 'Submit / Ajukan'}" onclick="epSubmitUsulanPra('${u.id}')" style="color:#2563eb">${u.status === 'DITOLAK' ? EP_ICON_RESEND : EP_ICON_SEND}</button>`
          : canSubmitRole ? `<button class="btn btn-ghost btn-sm" disabled data-tip="${!dokStatus.ok ? 'Lengkapi dulu: ' + esc(dokStatus.missing.join(', ')) : 'Upload tanda tangan Anda dulu di Profil'}" style="color:#94a3b8;cursor:not-allowed">${u.status === 'DITOLAK' ? EP_ICON_RESEND : EP_ICON_SEND}</button>` : ''}
        ${canVerifikasi ? (hasTtd
          ? `<button class="btn btn-ghost btn-sm" data-tip="Setujui (Kepala)" onclick="openApproveKabidModal('${u.id}')" style="color:#16a34a">${EP_ICON_CHECK}</button>`
          : `<button class="btn btn-ghost btn-sm" disabled data-tip="Upload tanda tangan Anda dulu di Profil" style="color:#94a3b8;cursor:not-allowed">${EP_ICON_CHECK}</button>`)
        + `<button class="btn-hapus" data-tip="Tolak" onclick="epKirimBalikPra('${u.id}')">${EP_ICON_REJECT}</button>` : ''}
        ${canApproveSekretaris ? (hasTtd
          ? `<button class="btn btn-ghost btn-sm" data-tip="Setujui (Sekretaris Dinas)" onclick="openApproveSekretarisModal('${u.id}')" style="color:#16a34a">${EP_ICON_CHECK}</button>`
          : `<button class="btn btn-ghost btn-sm" disabled data-tip="Upload tanda tangan Anda dulu di Profil" style="color:#94a3b8;cursor:not-allowed">${EP_ICON_CHECK}</button>`)
        + `<button class="btn-hapus" data-tip="Tolak" onclick="epKirimBalikPra('${u.id}')">${EP_ICON_REJECT}</button>` : ''}
        ${canApproveAdmin ? (hasTtd
          ? `<button class="btn btn-ghost btn-sm" data-tip="Setujui (Verifikator)" onclick="openApproveAdminModal('${u.id}')" style="color:#16a34a">${EP_ICON_CHECK}</button>`
          : `<button class="btn btn-ghost btn-sm" disabled data-tip="Upload tanda tangan Anda dulu di Profil" style="color:#94a3b8;cursor:not-allowed">${EP_ICON_CHECK}</button>`)
        + `<button class="btn-hapus" data-tip="Tolak" onclick="epKirimBalikPra('${u.id}')">${EP_ICON_REJECT}</button>` : ''}
        <button class="btn btn-ghost btn-sm" data-tip="Riwayat Aktivitas" onclick="epOpenRiwayat('${u.id}')">${EP_ICON_CLOCK}</button>
        ${canDelete ? `<button class="btn-hapus" data-tip="Hapus" onclick="deleteUsulanPra('${u.id}')">${EP_ICON_TRASH}</button>` : ''}
      </td>
    </tr>`;
  }).join('');
  renderPagination('epPraPagination', filtered.length, _epPraPage, _epPraPageSize, 'goEpPraPage');
}

async function epSubmitUsulanPra(id) {
  const u = _epPraList.find(x => x.id === id);
  const isResubmit = u && u.status === 'DITOLAK';
  const okSubmit = await showConfirm({
    title: isResubmit ? 'Ajukan Kembali Sub Kegiatan' : 'Ajukan Sub Kegiatan',
    msg: isResubmit ? 'Ajukan kembali Sub Kegiatan ini untuk diverifikasi ulang?' : 'Ajukan Sub Kegiatan ini untuk verifikasi Surat Usulan/TOR/RAB?',
    okText: isResubmit ? 'Ya, Ajukan Kembali' : 'Ya, Ajukan', type: 'warning', icon: 'wave',
  });
  if (!okSubmit) return;
  try {
    const r = await fetch(`/api/eplanning/usulan/${id}/submit`, { method: 'PUT', headers: authHeaders() });
    const d = await r.json();
    if (!r.ok) throw new Error(d.error || 'Gagal mengajukan usulan');
    toast('Usulan diajukan, menunggu verifikasi dokumen', 'success');
    loadEplanningPraUsulan({ keepPage: true });
  } catch (err) { toast(err.message, 'error'); }
}

async function deleteUsulanPra(id) {
  const okDel = await showConfirm({ title: 'Hapus Sub Kegiatan', msg: 'Hapus Sub Kegiatan ini beserta seluruh rincian & dokumennya?', okText: 'Ya, Hapus', type: 'danger', icon: 'trash' });
  if (!okDel) return;
  try {
    const r = await fetch(`/api/eplanning/usulan/${id}`, { method: 'DELETE', headers: authHeaders() });
    const d = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(d.error || 'Gagal menghapus usulan');
    toast('Usulan dihapus', 'success');
    loadEplanningPraUsulan({ keepPage: true });
  } catch (err) { toast(err.message, 'error'); }
}

async function epKirimBalikPra(id) {
  const catatan = await showEpPrompt({ title: 'Tolak Sub Kegiatan', msg: 'Catatan alasan penolakan (wajib diisi):', placeholder: 'Tuliskan alasan penolakan...', okText: 'Ya, Tolak' });
  if (catatan === null) return;
  try {
    const r = await fetch(`/api/eplanning/usulan/${id}/status`, {
      method: 'PUT', headers: { ...authHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'DITOLAK', catatan_koreksi: catatan }),
    });
    const d = await r.json();
    if (!r.ok) throw new Error(d.error || 'Gagal menolak usulan');
    toast('Usulan ditolak, dikirim balik ke operator', 'success');
    loadEplanningPraUsulan({ keepPage: true });
  } catch (err) { toast(err.message, 'error'); }
}

const EP_LOG_AKSI_CONFIG = {
  eplanning_create_usulan:     { color: '#0d9488', label: 'Kegiatan Dibuat' },
  eplanning_save_dokumen:      { color: '#0284c7', label: 'Dokumen Disimpan' },
  eplanning_submit:            { color: '#2563eb', label: 'Diajukan' },
  eplanning_resubmit_komponen: { color: '#0284c7', label: 'Ajukan Ulang Komponen' },
  eplanning_verify_komponen:   { color: '#7c3aed', label: 'Verifikasi Komponen' },
  eplanning_approve_kabid:     { color: '#16a34a', label: 'Disetujui Kepala' },
  eplanning_approve_sekretaris:{ color: '#16a34a', label: 'Disetujui Sekretaris Dinas' },
  eplanning_approve_admin:     { color: '#059669', label: 'Disahkan (Selesai)' },
  eplanning_set_status:        { color: '#dc2626', label: 'Ditolak' },
  eplanning_delete_usulan:     { color: '#94a3b8', label: 'Dihapus' },
};

function _epLogDetail(log) {
  if (!log.detail) return '';
  try {
    const d = typeof log.detail === 'string' ? JSON.parse(log.detail) : log.detail;
    if (d.komponen && d.keputusan) return `${d.komponen.toUpperCase()} — ${d.keputusan === 'DISETUJUI' ? 'Disetujui' : 'Ditolak'}`;
    if (d.komponen) return `Komponen: ${d.komponen.toUpperCase()}`;
    if (d.tipe) return `Dokumen: ${d.tipe.toUpperCase()}`;
    if (d.status) return `Status: ${d.status}${d.ditolakOleh ? ' (oleh ' + d.ditolakOleh + ')' : ''}`;
    return '';
  } catch { return ''; }
}

async function epOpenRiwayat(id) {
  const body = document.getElementById('epRiwayatBody');
  body.innerHTML = `<div style="display:flex;align-items:center;justify-content:center;padding:40px 0;gap:8px;color:#64748b;font-size:.85rem">
    <span class="btn-spin" style="width:13px;height:13px"></span>Memuat riwayat...</div>`;
  openModal('modalEpRiwayat');
  try {
    const r = await fetch(`/api/eplanning/usulan/${id}/log`, { headers: authHeaders() });
    const d = await r.json();
    if (!r.ok) throw new Error(d.error || 'Gagal memuat riwayat');
    const logs = d.logs || [];
    if (!logs.length) {
      body.innerHTML = `<div style="text-align:center;padding:30px 0;color:#94a3b8;font-size:.85rem">Belum ada aktivitas</div>`;
      return;
    }
    body.innerHTML = `<div style="display:flex;flex-direction:column;gap:0">${logs.map((log, i) => {
      const cfg = EP_LOG_AKSI_CONFIG[log.aksi] || { color: '#64748b', label: log.aksi };
      const isLast = i === logs.length - 1;
      const detail = _epLogDetail(log);
      return `<div style="display:flex;gap:10px">
        <div style="display:flex;flex-direction:column;align-items:center;flex-shrink:0">
          <div style="width:11px;height:11px;border-radius:50%;background:${cfg.color};margin-top:3px;flex-shrink:0"></div>
          ${!isLast ? `<div style="width:2px;flex:1;background:#e2e8f0;margin:2px 0"></div>` : ''}
        </div>
        <div style="padding-bottom:${isLast ? '0' : '16px'};min-width:0">
          <div style="font-size:.82rem;font-weight:700;color:${cfg.color}">${esc(cfg.label)}</div>
          <div style="font-size:.78rem;color:#334155;margin-top:1px">${esc(log.nama || log.email || '-')}</div>
          ${detail ? `<div style="font-size:.75rem;color:#64748b;margin-top:2px">${esc(detail)}</div>` : ''}
          <div style="font-size:.72rem;color:#94a3b8;margin-top:2px">${fmtDate(log.created_at)}</div>
        </div>
      </div>`;
    }).join('')}</div>`;
  } catch (err) {
    body.innerHTML = `<div style="text-align:center;padding:30px 0;color:#dc2626;font-size:.85rem">${esc(err.message)}</div>`;
  }
}

let _epVerifUsulanId = null;


function _epRenderVerifBody(u) {
  const komponen = [
    { key: 'surat', label: 'Surat Usulan' },
    { key: 'tor', label: 'TOR' },
    { key: 'rab', label: 'RAB' },
  ];
  const body = document.getElementById('epVerifBody');
  body.innerHTML = `
    <div style="font-weight:600;margin-bottom:2px">${esc(u.nama_kegiatan || u.sub_kegiatan || '-')}</div>
    <div style="font-size:.8rem;color:#64748b;margin-bottom:14px">${esc(u.bidang_nama || '-')} - ${esc(u.pembuat_nama || '-')}</div>
    ${komponen.map(k => {
      const status = u[`status_${k.key}`];
      const catatan = u[`catatan_${k.key}`];
      return `
      <div style="border:1px solid var(--border,#e2e8f0);border-radius:var(--r-sm);padding:10px 12px;margin-bottom:10px">
        <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:6px">
          <div style="font-weight:600">${k.label}</div>
          ${_epKomponenBadge(status)}
        </div>
        ${status === 'DITOLAK' && catatan ? `<div style="font-size:.78rem;color:#991b1b;margin-bottom:8px">Catatan: ${esc(catatan)}</div>` : ''}
        <div style="display:flex;gap:6px;flex-wrap:wrap">
          <button type="button" class="btn btn-ghost btn-sm" onclick="epPreview${k.key === 'surat' ? 'Surat' : k.key === 'tor' ? 'Tor' : 'Rab'}FromVerif('${u.id}','${k.key}')"><svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5" style="margin-right:5px;vertical-align:-2px"><path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg>Lihat Dokumen</button>
          ${status === 'MENUNGGU' ? `
            <button type="button" class="btn btn-primary btn-sm" onclick="epVerifKomponen('${k.key}','DISETUJUI')" style="background:#16a34a;border-color:#16a34a"><svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5" style="margin-right:5px;vertical-align:-2px"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"/></svg>Setujui</button>
            <button type="button" class="btn btn-primary btn-sm" onclick="epVerifTolakPrompt('${k.key}')" style="background:#dc2626;border-color:#dc2626"><svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5" style="margin-right:5px;vertical-align:-2px"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>Tolak</button>` : ''}
        </div>
        <div id="epVerifTolak_${k.key}" style="display:none;margin-top:8px">
          <textarea id="epVerifCatatan_${k.key}" rows="2" placeholder="Alasan penolakan..." style="width:100%"></textarea>
          <button type="button" class="btn btn-primary btn-sm" style="margin-top:6px;background:#dc2626;border-color:#dc2626" onclick="epVerifKomponen('${k.key}','DITOLAK')"><svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5" style="margin-right:5px;vertical-align:-2px"><path stroke-linecap="round" stroke-linejoin="round" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"/></svg>Kirim Penolakan</button>
        </div>
      </div>`;
    }).join('')}`;
}


async function _epFetchUsulanDetail(id) {
  try {
    const [ru, rr] = await Promise.all([
      fetch(`/api/eplanning/usulan/${id}`, { headers: authHeaders() }),
      fetch(`/api/eplanning/rincian?usulan_id=${id}`, { headers: authHeaders() }),
    ]);
    const du = await ru.json(), dr = await rr.json();
    if (!ru.ok) throw new Error(du.error || 'Gagal memuat usulan');
    return { usulan: du.usulan, rincian: dr.rincian || [] };
  } catch (err) { toast(err.message, 'error'); return null; }
}

function epVerifTolakPrompt(komponen) {
  const el = document.getElementById(`epVerifTolak_${komponen}`);
  if (el) el.style.display = el.style.display === 'none' ? '' : 'none';
}

async function epVerifKomponen(komponen, keputusan) {
  const id = _epVerifUsulanId;
  const catatanEl = document.getElementById(`epVerifCatatan_${komponen}`);
  const catatan = catatanEl ? catatanEl.value.trim() : '';
  if (keputusan === 'DITOLAK' && !catatan) { toast('Catatan alasan penolakan wajib diisi', 'error'); return; }
  try {
    const r = await fetch(`/api/eplanning/usulan/${id}/verify-komponen`, {
      method: 'PUT', headers: { ...authHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ komponen, keputusan, catatan }),
    });
    const d = await r.json();
    if (!r.ok) throw new Error(d.error || 'Gagal memverifikasi');
    toast(`${komponen.toUpperCase()} ${keputusan === 'DISETUJUI' ? 'disetujui' : 'ditolak'}`, 'success');
    const idx = _epPraList.findIndex(x => x.id === id);
    if (d.usulan.status === 'SELESAI') {
      if (idx > -1) _epPraList.splice(idx, 1);
      closeModal('modalEpVerifikasi');
    } else if (d.usulan.status === 'MENUNGGU SEKRETARIS') {
      if (idx > -1) _epPraList[idx] = d.usulan;
      toast('Semua dokumen disetujui, usulan diteruskan ke Sekretaris Dinas', 'success');
      closeModal('modalEpVerifikasi');
    } else if (d.usulan.status === 'MENUNGGU ADMIN') {
      if (idx > -1) _epPraList[idx] = d.usulan;
      toast('Semua dokumen disetujui, usulan diteruskan ke Admin (Verifikator)', 'success');
      closeModal('modalEpVerifikasi');
    } else {
      if (idx > -1) _epPraList[idx] = d.usulan;
      _epRenderVerifBody(d.usulan);
    }
    renderEplanningPraTable();
  } catch (err) { toast(err.message, 'error'); }
}
