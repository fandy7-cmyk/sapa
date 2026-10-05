'use strict';
/* ============================================================================
   Pemantauan Sistem (monitoring / observability)
   1) Instrumentasi: bungkus fetch (ukur durasi /api/*, laporkan 5xx), tangkap error JS & promise.
   2) Halaman admin "Pemantauan Sistem" (Ringkasan, Error Log, Performa, Kesehatan, Penggunaan, Keamanan).
   3) Badge jumlah error baru di sidebar.
   Muat file ini SEBELUM js/app.js supaya semua fetch ikut terukur.
   ============================================================================ */
(function () {
  if (window.__sapaMon) return;
  window.__sapaMon = true;

  const MON = '/api/monitoring';
  const _of = window.fetch.bind(window);

  const monEsc = (s) => (typeof esc === 'function' ? esc(s)
    : String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])));

  function monToken() {
    try { if (typeof _token !== 'undefined' && _token) return _token; } catch (e) {}
    try { return sessionStorage.getItem('sapa_token'); } catch (e) { return null; }
  }
  function monIsAdmin() {
    try { return !!(monToken() && typeof _user !== 'undefined' && _user && _user.is_admin); } catch (e) { return false; }
  }
  function monHeaders() {
    const t = monToken();
    return t ? { 'Content-Type': 'application/json', Authorization: 'Bearer ' + t } : { 'Content-Type': 'application/json' };
  }
  function apiPath(input) {
    try {
      const u = typeof input === 'string' ? input : (input && input.url) || '';
      const x = new URL(u, location.origin);
      return x.origin === location.origin && x.pathname.startsWith('/api/') ? x.pathname : null;
    } catch (e) { return null; }
  }

  /* ───────────── 1. Instrumentasi ───────────── */
  const perfBuf = [];
  let laporanSesi = 0;
  const sudahDilapor = new Set();

  function pushPerf(endpoint, method, status, ms) {
    if (perfBuf.length >= 200) perfBuf.shift();
    perfBuf.push({ endpoint, method, status, ms });
  }

  function flushPerf() {
    if (!perfBuf.length || !monToken()) return;
    const items = perfBuf.splice(0, 60);
    _of(MON + '/perf', { method: 'POST', headers: monHeaders(), body: JSON.stringify({ items }), keepalive: true }).catch(() => {});
  }
  setInterval(flushPerf, 60000);
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') flushPerf(); });

  function halamanAktif() {
    let sub = '';
    try { sub = typeof _activeSubId !== 'undefined' ? _activeSubId : ''; } catch (e) {}
    return (location.pathname || '/') + (sub ? ' #' + sub : '');
  }

  function laporError(p) {
    try {
      if (!p || !p.message) return;
      if (laporanSesi >= 20) return;                      // batas per sesi halaman
      const kunci = p.source + '|' + String(p.message).slice(0, 120);
      if (sudahDilapor.has(kunci)) return;                // sudah dikirim di sesi ini
      sudahDilapor.add(kunci); laporanSesi++;
      _of(MON + '/error', {
        method: 'POST', headers: monHeaders(), keepalive: true,
        body: JSON.stringify({ ...p, message: String(p.message).slice(0, 500), page: halamanAktif() }),
      }).catch(() => {});
    } catch (e) {}
  }

  async function laporHttp(path, method, res) {
    try {
      let t = await res.clone().text();
      try { t = JSON.parse(t).error || t; } catch (e) { t = String(t).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim(); }
      laporError({ source: 'api', message: `${method} ${path} → ${res.status}: ${String(t).slice(0, 250)}`, endpoint: path, http_status: res.status });
    } catch (e) {}
  }

  window.fetch = function (input, init) {
    const path = apiPath(input);
    if (!path || path.startsWith(MON)) return _of(input, init);
    const method = String((init && init.method) || (input && input.method) || 'GET').toUpperCase();
    const t0 = performance.now();
    return _of(input, init).then(res => {
      try {
        pushPerf(path, method, res.status, Math.round(performance.now() - t0));
        if (res.status >= 500) laporHttp(path, method, res);
      } catch (e) {}
      return res;
    }, err => {
      try {
        if (!(err && err.name === 'AbortError')) {
          pushPerf(path, method, 0, Math.round(performance.now() - t0));
          if (navigator.onLine !== false) {
            laporError({ source: 'network', message: `Gagal terhubung: ${method} ${path} (${(err && err.message) || 'network error'})`, endpoint: path, http_status: 0 });
          }
        }
      } catch (e) {}
      throw err;
    });
  };

  window.addEventListener('error', (e) => {
    if (e.target && e.target !== window) return;          // gagal muat gambar/script: abaikan
    const msg = e.message || '';
    if (!msg || /ResizeObserver loop|^Script error\.?$/i.test(msg)) return;
    if (e.filename && !e.filename.startsWith(location.origin)) return;   // ekstensi browser / pihak ketiga
    laporError({ source: 'client', message: msg, stack: e.error && e.error.stack });
  }, true);

  window.addEventListener('unhandledrejection', (e) => {
    const r = e.reason;
    const msg = (r && r.message) || (typeof r === 'string' ? r : '');
    if (!msg || (r && r.name === 'AbortError')) return;
    if (/Failed to fetch|NetworkError|Load failed|network error/i.test(msg)) return;   // sudah dicatat wrapper fetch
    laporError({ source: 'promise', message: msg, stack: r && r.stack });
  });

  /* ───────────── 2. Halaman admin ───────────── */
  const CSS = `
  #page-pemantauan-sistem .card-title-sm{font-size:.95rem;font-weight:700}
  #page-pemantauan-sistem .card-header{margin-bottom:var(--sp-3)}
  #page-pemantauan-sistem .card{margin-bottom:var(--sp-4)}
  /* Semua tabel di Pemantauan Sistem: judul kolom & isi sel rata tengah */
  #page-pemantauan-sistem .freeze-table th,#page-pemantauan-sistem .freeze-table td{text-align:center;vertical-align:middle}
  #page-pemantauan-sistem .freeze-table .mon-cellbar{justify-content:center}
  #page-pemantauan-sistem .freeze-table .mon-pre{text-align:left}
  .mon-tabs{display:flex;gap:4px;padding:5px;margin-bottom:var(--sp-4);width:fit-content;max-width:100%;overflow-x:auto;-webkit-overflow-scrolling:touch;scrollbar-width:none;background:rgba(255,255,255,.85);backdrop-filter:blur(10px);border:1.5px solid rgba(255,255,255,.8);border-radius:var(--r-md,14px);box-shadow:var(--shadow-sm)}
  .mon-tabs::-webkit-scrollbar{display:none}
  .mon-tab{display:inline-flex;align-items:center;gap:8px;flex-shrink:0;white-space:nowrap;padding:5px 14px 5px 6px;border:none;border-radius:10px;background:transparent;color:var(--teks-mid);font-family:inherit;font-size:var(--fs-base);font-weight:600;cursor:pointer;transition:background .18s,color .18s}
  .mon-tab-ic{display:flex;align-items:center;justify-content:center;width:26px;height:26px;border-radius:8px;background:var(--abu-1);color:var(--teks-muted);transition:background .18s,color .18s}
  .mon-tab:hover{background:var(--abu-1);color:var(--teks)}
  .mon-tab:hover .mon-tab-ic{background:#fff}
  .mon-tab.active{background:var(--hijau-light);color:var(--hijau);font-weight:700}
  .mon-tab.active .mon-tab-ic{background:var(--hijau);color:#fff}
  .t-ok{--tone:#16a34a;--tone-bg:#f0fdf4}.t-warn{--tone:#d97706;--tone-bg:#fffbeb}.t-bad{--tone:#dc2626;--tone-bg:#fef2f2}.t-info{--tone:#2563eb;--tone-bg:#eff6ff}.t-abu{--tone:#64748b;--tone-bg:#f8fafc}
  .mon-hero{position:relative;overflow:hidden;display:flex;align-items:center;gap:var(--sp-4);flex-wrap:wrap;padding:var(--sp-4) var(--sp-5) var(--sp-4) var(--sp-4);margin-bottom:var(--sp-4);background:var(--tone-bg);border:1.5px solid color-mix(in srgb,var(--tone) 28%,#fff);border-left:4px solid var(--tone);border-radius:var(--r-lg)}
  .mon-hero>*{position:relative;z-index:1}
  .mon-pulse{flex-shrink:0;width:10px;height:10px;border-radius:50%;background:var(--tone);box-shadow:0 0 0 0 color-mix(in srgb,var(--tone) 55%,transparent);animation:monPulse 2.2s ease-out infinite}
  @keyframes monPulse{70%{box-shadow:0 0 0 9px transparent}100%{box-shadow:0 0 0 0 transparent}}
  .mon-hero-main{flex:1;min-width:240px}
  .mon-hero-title{font-size:1rem;font-weight:700;color:var(--teks);line-height:1.25}
  .mon-hero-text{font-size:var(--fs-sm);color:var(--teks-muted);margin-top:3px;line-height:1.5;max-width:70ch}
  .mon-hero-text b{color:var(--teks)}
  .mon-hero-aside{display:flex;flex-direction:column;align-items:flex-end;gap:4px;text-align:right}
  .mon-ecg{position:absolute!important;right:0;bottom:0;width:46%;height:70%;pointer-events:none;z-index:0!important}
  .mon-ecg polyline{fill:none;stroke:var(--tone);stroke-width:2;opacity:.2;vector-effect:non-scaling-stroke;stroke-linejoin:round}
  .mon-pills{display:flex;flex-wrap:wrap;gap:6px;margin-top:var(--sp-3)}
  .mon-pill{display:inline-flex;align-items:center;gap:6px;padding:3px 10px;border-radius:999px;background:#fff;border:1px solid var(--abu-2);font-size:var(--fs-sm);font-weight:600;color:var(--teks)}
  .mon-pill i{width:8px;height:8px;border-radius:50%;flex-shrink:0}
  .mon-pill b{font-weight:700;color:var(--teks-muted)}
  .mon-kpis{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:var(--sp-4);margin-bottom:var(--sp-4)}
  .mon-kpi{display:flex;flex-direction:column;gap:3px;padding:var(--sp-4) var(--sp-5);background:#fff;border:1.5px solid var(--abu-2);border-radius:var(--r-md);min-width:0;transition:border-color .18s,box-shadow .18s}
  .mon-kpi[onclick]{cursor:pointer}
  .mon-kpi[onclick]:hover{border-color:var(--c);box-shadow:var(--shadow-md)}
  .mon-kpi-top{display:flex;align-items:center;justify-content:space-between;gap:8px;font-size:var(--fs-sm);font-weight:600;color:var(--teks-muted)}
  .mon-kpi-ic{display:flex;align-items:center;justify-content:center;width:28px;height:28px;border-radius:8px;flex-shrink:0}
  .mon-kpi-val{font-size:var(--fs-2xl);font-weight:800;line-height:1.15;color:var(--teks);white-space:nowrap}
  .mon-kpi-foot{display:flex;align-items:flex-end;justify-content:space-between;gap:8px;min-height:28px}
  .mon-kpi-sub{font-size:var(--fs-xs);color:var(--teks-muted);line-height:1.4}
  .mon-kpi-sp{flex-shrink:0}
  .mon-cols{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,340px),1fr));gap:var(--sp-4);margin-bottom:var(--sp-4)}
  .mon-cols.wide{grid-template-columns:minmax(0,1.618fr) minmax(0,1fr)}
  @media(max-width:900px){.mon-cols.wide{grid-template-columns:minmax(0,1fr)}.mon-hero-aside{align-items:flex-start;text-align:left}}
  #page-pemantauan-sistem .mon-cols>.card{margin-bottom:0;min-width:0}
  .mon-chart{width:100%;height:auto;display:block;overflow:visible}
  .mon-ax{font-size:10px;fill:var(--teks-muted)}
  .mon-gl{stroke:rgba(15,23,42,.08);stroke-dasharray:3 3}
  .mon-hit{fill:transparent}.mon-hit:hover{fill:rgba(15,23,42,.06)}
  .mon-legend{display:flex;flex-wrap:wrap;gap:4px 14px;font-size:var(--fs-sm);color:var(--teks-muted);margin-top:var(--sp-3)}
  .mon-legend i{display:inline-block;width:9px;height:9px;border-radius:3px;margin-right:5px;vertical-align:-1px}
  .mon-donut{display:flex;align-items:center;gap:var(--sp-5);flex-wrap:wrap}
  .mon-donut svg{width:132px;height:132px;flex-shrink:0}
  .mon-dl{flex:1;min-width:150px;display:flex;flex-direction:column;gap:7px}
  .mon-dl div{display:flex;align-items:center;gap:8px;font-size:var(--fs-base)}
  .mon-dl i{width:10px;height:10px;border-radius:3px;flex-shrink:0}
  .mon-dl span{flex:1;color:var(--teks)}.mon-dl b{font-weight:700}.mon-dl em{font-style:normal;color:var(--teks-muted);font-size:var(--fs-sm);min-width:38px;text-align:right}
  .mon-hb{padding:8px 0;border-bottom:1px solid rgba(0,0,0,.05)}.mon-hb:last-child{border-bottom:none}
  .mon-hb-top{display:flex;justify-content:space-between;align-items:center;gap:10px;font-size:var(--fs-base)}
  .mon-hb-l{font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;min-width:0}
  .mon-hb-r{flex-shrink:0;font-size:var(--fs-sm);color:var(--teks-muted)}
  .mon-hb-track{height:7px;border-radius:99px;background:rgba(0,0,0,.06);margin-top:5px;overflow:hidden}
  .mon-hb-track i{display:block;height:100%;border-radius:99px}
  .mon-stack{display:flex;height:18px;border-radius:99px;overflow:hidden;background:rgba(0,0,0,.06)}
  .mon-stack i{display:block;height:100%}
  .mon-ins{display:flex;gap:10px;align-items:flex-start;padding:9px 12px;border-radius:var(--r-sm);background:var(--tone-bg);font-size:var(--fs-base);color:var(--teks);margin-bottom:6px}
  .mon-ins:last-child{margin-bottom:0}
  .mon-ins i{flex-shrink:0;width:8px;height:8px;border-radius:50%;background:var(--tone);margin-top:6px}
  .mon-ins b{font-weight:700}
  .mon-row{font-size:.78rem;display:flex;align-items:center;justify-content:space-between;gap:12px;padding:10px 0;border-bottom:1px solid rgba(0,0,0,.06)}
  .mon-row:last-child{border-bottom:none}
  .mon-row-sub{font-size:var(--fs-xs);color:var(--teks-muted);margin-top:2px}
  .mon-pre{white-space:pre-wrap;word-break:break-word;font-size:.7rem;background:rgba(0,0,0,.05);padding:8px;border-radius:var(--r-sm);margin:6px 0 0;max-height:220px;overflow:auto}
  .mon-msg{max-width:460px;word-break:break-word}
  .mon-src{display:inline-block;padding:2px 9px;border-radius:99px;font-size:var(--fs-xs);font-weight:700;background:color-mix(in srgb,var(--c) 14%,#fff);color:var(--c);flex-shrink:0}
  .mon-feed{display:flex;gap:10px;align-items:flex-start;padding:9px 0;border-bottom:1px solid rgba(0,0,0,.06);cursor:pointer}
  .mon-feed:last-child{border-bottom:none}.mon-feed:hover .mon-feed-m{color:var(--hijau)}
  .mon-feed-b{min-width:0;flex:1}
  .mon-feed-m{font-size:var(--fs-base);font-weight:600;overflow:hidden;text-overflow:ellipsis;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical}
  .mon-user{display:flex;align-items:center;gap:10px;padding:7px 0}
  .mon-av{display:flex;align-items:center;justify-content:center;width:32px;height:32px;border-radius:50%;background:var(--hijau-light);color:var(--hijau);font-size:var(--fs-sm);font-weight:800;flex-shrink:0}
  .mon-user-n{font-size:var(--fs-base);font-weight:600}
  .mon-cellbar{display:flex;align-items:center;gap:8px;min-width:140px}
  .mon-cellbar .mon-hb-track{flex:1;margin:0;height:6px}
  .mon-checks{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,260px),1fr));gap:var(--sp-4);margin-bottom:var(--sp-4)}
  .mon-check{padding:var(--sp-4) var(--sp-5);background:#fff;border:1.5px solid var(--abu-2);border-top:4px solid var(--tone);border-radius:var(--r-md)}
  .mon-check-h{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:var(--sp-3);font-weight:700;font-size:var(--fs-base)}
  .mon-check-ms{font-size:var(--fs-2xl);font-weight:800;line-height:1.1}
  .mon-check-ms small{font-size:var(--fs-sm);font-weight:600;color:var(--teks-muted);margin-left:3px}
  .mon-todo{display:flex;align-items:flex-start;gap:10px;padding:8px 0;border-bottom:1px solid rgba(0,0,0,.05);font-size:var(--fs-base)}
  .mon-todo:last-child{border-bottom:none}
  .mon-dot{flex-shrink:0;width:18px;height:18px;border-radius:50%;display:flex;align-items:center;justify-content:center;margin-top:1px;background:var(--tone);color:#fff}
  .mon-code{display:flex;gap:8px;align-items:center;flex-wrap:wrap}
  .mon-code code{padding:6px 10px;border-radius:var(--r-sm);background:rgba(0,0,0,.05);font-size:var(--fs-sm);word-break:break-all}
  .mon-bar-wrap{background:rgba(0,0,0,.06);border-radius:var(--r-full);height:8px;min-width:90px;flex:1}
  .mon-badge{margin-left:auto;flex-shrink:0;min-width:18px;height:18px;padding:0 5px;border-radius:9px;background:#dc2626;color:#fff;font-size:11px;font-weight:700;line-height:18px;text-align:center}
  .mon-badge.warn{background:#d97706}
  .sidebar.collapsed .mon-badge{display:none}
  .mon-muted{color:var(--teks-muted);font-size:var(--fs-sm)}
  .mon-empty{padding:24px;text-align:center;color:var(--teks-muted)}
  @media(prefers-reduced-motion:reduce){.mon-pulse{animation:none}}
  `;

  const TABS = [
    ['ringkasan', 'Ringkasan'], ['error', 'Error Log'], ['performa', 'Performa'],
    ['kesehatan', 'Kesehatan'], ['penggunaan', 'Penggunaan'], ['keamanan', 'Keamanan'],
  ];
  let monTab = 'ringkasan';
  let monErrPage = 1;
  const MON_ERR_LIMIT = 5;
  let monErrTimer = null;
  const TZ = 'Asia/Makassar';

  function ensureStyle() {
    if (document.getElementById('mon-style')) return;
    const st = document.createElement('style'); st.id = 'mon-style'; st.textContent = CSS;
    document.head.appendChild(st);
  }

  function ensurePage() {
    ensureStyle();
    if (document.getElementById('page-pemantauan-sistem')) return true;
    const ref = document.getElementById('page-audit-trail');
    const parent = ref ? ref.parentNode : document.querySelector('.content');
    if (!parent) return false;
    const div = document.createElement('div');
    div.className = 'page'; div.id = 'page-pemantauan-sistem';
    div.innerHTML = `
      <div class="page-title" style="display:flex;align-items:center;gap:10px">
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0;opacity:.85"><polyline points="3 12 7 12 10 5 14 19 17 12 21 12"/></svg>
        Pemantauan Sistem
      </div>
      <div class="page-subtitle">Error, performa, kesehatan layanan, penggunaan, dan keamanan dalam satu tempat</div>
      <div class="mon-tabs" id="monTabs"></div>
      <div id="monBody"></div>`;
    parent.appendChild(div);
    new MutationObserver(monFixSoon).observe(div.querySelector('#monBody'), { childList: true, subtree: true });
    return true;
  }

  async function monGet(url) {
    const r = await fetch(url, { headers: monHeaders() });
    if (!r.ok) { let m = ''; try { m = (await r.json()).error; } catch (e) {} throw new Error(m || ('HTTP ' + r.status)); }
    return r.json();
  }
  async function monSend(method, url, body) {
    const r = await fetch(url, { method, headers: monHeaders(), body: body ? JSON.stringify(body) : undefined });
    let d = {}; try { d = await r.json(); } catch (e) {}
    if (!r.ok) throw new Error(d.error || d.alasan || ('HTTP ' + r.status));
    return d;
  }

  /* ── Format & helper ── */
  const PAL = { ok: '#16a34a', warn: '#d97706', bad: '#dc2626', info: '#2563eb', teal: '#047D78', ungu: '#7c3aed', abu: '#64748b' };
  const SRC = { client: 'Browser', promise: 'Promise', api: 'API 5xx', network: 'Jaringan' };
  const SRC_COL = { client: PAL.info, promise: PAL.ungu, api: PAL.bad, network: PAL.abu };
  const nf = (n) => Number(n || 0).toLocaleString('id-ID');
  // Tanggal + jam 24 jam WITA, mis. "04 Okt 2026, 14:30 WITA"
  const _fmtWaktuDtf = new Intl.DateTimeFormat('id-ID', { timeZone: TZ, day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });
  const fmtWaktu = (ts) => {
    if (!ts) return '-';
    const d = new Date(ts);
    if (isNaN(d)) return '-';
    const p = {};
    _fmtWaktuDtf.formatToParts(d).forEach(x => { p[x.type] = x.value; });
    return `${p.day} ${p.month} ${p.year}, ${p.hour}:${p.minute} WITA`;
  };
  const jam24 = (ts) => new Date(ts * 1000).toLocaleTimeString('id-ID', { timeZone: TZ, hour: '2-digit', minute: '2-digit' }).replace(/\./g, ':');
  const tglJam = (ts) => new Date(ts * 1000).toLocaleString('id-ID', { timeZone: TZ, day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }).replace(/\./g, ':');
  function fmtAgo(ts) {
    if (!ts) return '-';
    const s = Math.max(0, (Date.now() - new Date(ts).getTime()) / 1000);
    if (s < 60) return 'baru saja';
    if (s < 3600) return Math.floor(s / 60) + ' menit lalu';
    if (s < 86400) return Math.floor(s / 3600) + ' jam lalu';
    return Math.floor(s / 86400) + ' hari lalu';
  }
  const fmtMs = (n) => n == null ? '-' : (n >= 1000 ? (n / 1000).toFixed(1) + ' dtk' : n + ' ms');
  const pct = (a, b) => b ? Math.round(a * 100 / b) : 0;
  const inisial = (n) => String(n || '?').trim().split(/\s+/).slice(0, 2).map(w => w[0]).join('').toUpperCase() || '?';
  function uaShort(ua) {
    if (!ua) return '';
    const b = /Edg\//.test(ua) ? 'Edge' : /OPR\//.test(ua) ? 'Opera' : /Chrome\//.test(ua) ? 'Chrome' : /Firefox\//.test(ua) ? 'Firefox' : /Safari\//.test(ua) ? 'Safari' : 'Browser';
    const o = /Android/.test(ua) ? 'Android' : /iPhone|iPad/.test(ua) ? 'iOS' : /Windows/.test(ua) ? 'Windows' : /Mac OS/.test(ua) ? 'macOS' : /Linux/.test(ua) ? 'Linux' : '';
    return b + (o ? ' di ' + o : '');
  }
  const loading = () => `<div class="mon-empty"><span class="btn-spin" style="width:11px;height:11px;vertical-align:-1px;margin-right:6px"></span>Memuat data...</div>`;
  const gagal = (e) => `<div class="mon-empty">Gagal memuat: ${monEsc(e && e.message)}</div>`;

  function badgeStatusCek(s) {
    const m = { ok: ['badge-hijau', 'Normal'], warn: ['badge-yellow', 'Peringatan'], down: ['badge-merah', 'Bermasalah'], unknown: ['badge-abu', 'Belum ada data'] }[s] || ['badge-abu', s];
    return `<span class="badge ${m[0]}">${m[1]}</span>`;
  }
  function badgeStatusSistem(s) {
    const m = { ok: ['badge-hijau', 'Sehat'], degraded: ['badge-yellow', 'Menurun'], down: ['badge-merah', 'Down'] }[s] || ['badge-abu', 'Belum ada data'];
    return `<span class="badge ${m[0]}">${m[1]}</span>`;
  }
  const badgeP95 = (ms) => `<span class="badge ${ms > 2000 ? 'badge-merah' : ms > 800 ? 'badge-yellow' : 'badge-hijau'}">${fmtMs(ms)}</span>`;
  const axMs = (v) => v >= 1000 ? (v / 1000).toLocaleString('id-ID') + ' dtk' : v + ' ms';
  const colP95 = (ms) => ms > 2000 ? PAL.bad : ms > 800 ? PAL.warn : PAL.ok;
  const toneCek = (s) => ({ ok: 'ok', warn: 'warn', down: 'bad' })[s] || 'abu';

  const IC = {
    err: '<circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>',
    sehat: '<path d="M22 12h-4l-3 9L9 3l-3 9H2"/>',
    cepat: '<circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>',
    user: '<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>',
    lock: '<rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>',
    req: '<path d="M4 4v16h16"/><path d="M8 15l3-4 3 3 5-7"/>',
    db: '<ellipse cx="12" cy="5" rx="8" ry="3"/><path d="M4 5v6c0 1.7 3.6 3 8 3s8-1.3 8-3V5"/><path d="M4 11v6c0 1.7 3.6 3 8 3s8-1.3 8-3v-6"/>',
    cloud: '<path d="M18 10h-1.3A7 7 0 1 0 5 15.3 4.5 4.5 0 0 0 6.5 20H18a5 5 0 0 0 0-10z"/>',
    send: '<path d="M22 2L11 13"/><path d="M22 2l-7 20-4-9-9-4 20-7z"/>',
    key: '<path d="M21 2l-2 2m-7.6 7.6a5.5 5.5 0 1 1-7.8 7.8 5.5 5.5 0 0 1 7.8-7.8zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4"/>',
  };
  const svgIc = (k, c, s) => `<svg xmlns="http://www.w3.org/2000/svg" width="${s || 15}" height="${s || 15}" fill="none" viewBox="0 0 24 24" stroke="${c}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${IC[k] || IC.sehat}</svg>`;
  const TAB_IC = {
    ringkasan: '<rect x="3" y="3" width="7" height="9" rx="1"/><rect x="14" y="3" width="7" height="5" rx="1"/><rect x="14" y="12" width="7" height="9" rx="1"/><rect x="3" y="16" width="7" height="5" rx="1"/>',
    error: '<path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>',
    performa: '<polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>',
    kesehatan: '<polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>',
    penggunaan: IC.user,
    keamanan: '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>'
  };
  function renderTabs() {
    const el = document.getElementById('monTabs'); if (!el) return;
    el.innerHTML = TABS.map(([k, l]) => `<button class="mon-tab${k === monTab ? ' active' : ''}" onclick="monPilihTab('${k}')"><span class="mon-tab-ic"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${TAB_IC[k] || ''}</svg></span>${l}</button>`).join('');
  }

  window.monPilihTab = function (k) {
    monTab = k; renderTabs();
    const body = document.getElementById('monBody'); if (!body) return;
    body.innerHTML = loading();
    ({ ringkasan: tabRingkasan, error: tabError, performa: tabPerforma, kesehatan: tabKesehatan, penggunaan: tabPenggunaan, keamanan: tabKeamanan })[k]();
  };
  window.monReload = () => window.monPilihTab(monTab);

  window.loadPemantauanSistem = function () {
    if (!ensurePage()) return;
    monTab = 'ringkasan'; renderTabs();
    window.monPilihTab('ringkasan');
    monRefreshBadge();
  };

  const body$ = () => document.getElementById('monBody');

  /* ── Komponen visual ── */
  const ECG = '<svg class="mon-ecg" viewBox="0 0 400 60" preserveAspectRatio="none" aria-hidden="true"><polyline points="0,30 90,30 110,30 125,8 140,52 155,30 250,30 270,30 285,14 298,44 310,30 400,30"/></svg>';
  const hero = ({ tone, title, text, pills }) => `
    <div class="mon-hero t-${tone}"><span class="mon-pulse"></span>
      <div class="mon-hero-main"><div class="mon-hero-title">${title}</div><div class="mon-hero-text">${text || ''}</div>
        ${pills && pills.length ? `<div class="mon-pills">${pills.join('')}</div>` : ''}</div>
      <div class="mon-hero-aside"><button class="btn btn-sm btn-outline-hijau" onclick="monReload()"><svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5" style="margin-right:5px;vertical-align:-2px"><path stroke-linecap="round" stroke-linejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg>Muat ulang</button><div class="mon-row-sub">Diperbarui ${jam24(Date.now() / 1000)} WITA</div></div>
      ${ECG}
    </div>`;
  const pill = (label, val, color) => `<span class="mon-pill"><i style="background:${color}"></i>${label}${val != null ? ` <b>${val}</b>` : ''}</span>`;
  const insight = (tone, html) => `<div class="mon-ins t-${tone}"><i></i><span>${html}</span></div>`;
  const panel = (title, sub, inner, head) => `<div class="card"><div class="card-header"><div><div class="card-title-sm">${title}</div>${sub ? `<div class="mon-row-sub">${sub}</div>` : ''}</div>${head || ''}</div>${inner}</div>`;
  const kpi = ({ label, val, sub, color, icon, spark: sp, onclick }) => {
    color = color || PAL.teal;
    return `<div class="mon-kpi" style="--c:${color}"${onclick ? ` onclick="${onclick}" role="button" tabindex="0"` : ''}>
      <div class="mon-kpi-top"><span>${label}</span><span class="mon-kpi-ic" style="background:${color}1f">${svgIc(icon, color, 15)}</span></div>
      <div class="mon-kpi-val">${val}</div>
      <div class="mon-kpi-foot"><div class="mon-kpi-sub">${sub || ''}</div>${sp ? `<div class="mon-kpi-sp">${sp}</div>` : ''}</div>
    </div>`;
  };

  function niceMax(v) { const p = Math.pow(10, Math.floor(Math.log10(Math.max(v, 1)))); const f = v / p; return (f <= 1 ? 1 : f <= 2 ? 2 : f <= 5 ? 5 : 10) * p; }

  function spark(vals, color, w, h) {
    w = w || 84; h = h || 28;
    vals = (vals || []).map(v => Number(v) || 0);
    if (vals.length < 2) return '';
    const max = Math.max(...vals, 1), st = w / (vals.length - 1);
    const pts = vals.map((v, i) => [i * st, h - 3 - (v / max) * (h - 7)]);
    const line = 'M' + pts.map(p => p[0].toFixed(1) + ',' + p[1].toFixed(1)).join('L');
    return `<svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" aria-hidden="true"><path d="${line}L${w},${h}L0,${h}Z" fill="${color}" opacity=".13"/><path d="${line}" fill="none" stroke="${color}" stroke-width="1.8" stroke-linejoin="round" stroke-linecap="round"/></svg>`;
  }

  function areaChart({ labels, series, h, fmt, afmt, fill }) {
    const W = 640, H = h || 190, pl = 56, pr = 10, pt = 10, pb = 24, iw = W - pl - pr, ih = H - pt - pb, n = labels.length;
    fmt = fmt || nf; afmt = afmt || fmt;
    const all = series.flatMap(s => s.values.filter(v => v != null));
    const max = niceMax(Math.max(1, ...all));
    const x = (i) => pl + (n < 2 ? 0 : i * iw / (n - 1)), y = (v) => pt + ih - (v / max) * ih;
    let g = '';
    for (let k = 0; k <= 4; k++) { const v = max * k / 4, yy = y(v); g += `<line class="mon-gl" x1="${pl}" x2="${W - pr}" y1="${yy}" y2="${yy}"/><text class="mon-ax" x="${pl - 6}" y="${yy + 3}" text-anchor="end">${afmt(Math.round(v))}</text>`; }
    const stepX = Math.max(1, Math.ceil(n / 6));
    let xl = ''; for (let i = 0; i < n; i += stepX) xl += `<text class="mon-ax" x="${x(i)}" y="${H - 6}" text-anchor="middle">${monEsc(labels[i].short || labels[i])}</text>`;
    let paths = '';
    series.forEach((s, si) => {
      const segs = []; let cur = [];
      s.values.forEach((v, i) => { if (v == null) { if (cur.length) segs.push(cur); cur = []; } else cur.push([x(i), y(v)]); });
      if (cur.length) segs.push(cur);
      segs.forEach(sg => {
        const d = 'M' + sg.map(p => p[0].toFixed(1) + ',' + p[1].toFixed(1)).join('L');
        if (fill !== false && si === 0 && sg.length > 1) paths += `<path d="${d}L${sg[sg.length - 1][0].toFixed(1)},${pt + ih}L${sg[0][0].toFixed(1)},${pt + ih}Z" fill="${s.color}" opacity=".12"/>`;
        paths += sg.length > 1 ? `<path d="${d}" fill="none" stroke="${s.color}" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"${s.dash ? ' stroke-dasharray="5 4"' : ''}/>` : `<circle cx="${sg[0][0]}" cy="${sg[0][1]}" r="2.5" fill="${s.color}"/>`;
      });
    });
    const bw = iw / Math.max(n - 1, 1);
    let hit = '';
    for (let i = 0; i < n; i++) hit += `<rect class="mon-hit" x="${(x(i) - bw / 2).toFixed(1)}" y="${pt}" width="${bw.toFixed(1)}" height="${ih}"><title>${monEsc(labels[i].full || labels[i])}\n${series.map(s => s.name + ': ' + (s.values[i] == null ? '-' : fmt(s.values[i]))).join('\n')}</title></rect>`;
    return `<svg class="mon-chart" viewBox="0 0 ${W} ${H}" role="img">${g}${paths}${xl}${hit}</svg>`;
  }

  function barChart({ labels, values, color, h, fmt, hi, unit }) {
    const W = 640, H = h || 130, pl = 34, pr = 6, pt = 8, pb = 22, iw = W - pl - pr, ih = H - pt - pb, n = values.length;
    fmt = fmt || nf;
    const max = niceMax(Math.max(1, ...values)), bw = iw / n;
    let g = '';
    for (let k = 0; k <= 2; k++) { const v = max * k / 2, yy = pt + ih - (v / max) * ih; g += `<line class="mon-gl" x1="${pl}" x2="${W - pr}" y1="${yy}" y2="${yy}"/><text class="mon-ax" x="${pl - 5}" y="${yy + 3}" text-anchor="end">${fmt(Math.round(v))}</text>`; }
    const stepX = Math.max(1, Math.ceil(n / 8));
    let bars = '';
    values.forEach((v, i) => {
      const hh = Math.max(v > 0 ? 2 : 0, (v / max) * ih), xx = pl + i * bw + bw * .14;
      bars += `<rect x="${xx.toFixed(1)}" y="${(pt + ih - hh).toFixed(1)}" width="${(bw * .72).toFixed(1)}" height="${hh.toFixed(1)}" rx="2.5" fill="${i === hi ? PAL.warn : color}"${i === hi ? '' : ' opacity=".85"'}><title>${monEsc(labels[i])}: ${fmt(v)}${unit ? ' ' + unit : ''}</title></rect>`;
      if (i % stepX === 0) bars += `<text class="mon-ax" x="${(pl + i * bw + bw / 2).toFixed(1)}" y="${H - 6}" text-anchor="middle">${monEsc(labels[i])}</text>`;
    });
    return `<svg class="mon-chart" viewBox="0 0 ${W} ${H}" role="img">${g}${bars}</svg>`;
  }

  function donut(items, centerVal, centerLbl) {
    const tot = items.reduce((a, b) => a + b.value, 0), R = 46, C = 2 * Math.PI * R;
    let off = 0;
    const arcs = tot ? items.filter(i => i.value > 0).map(i => {
      const len = i.value / tot * C;
      const s = `<circle cx="60" cy="60" r="${R}" fill="none" stroke="${i.color}" stroke-width="16" stroke-dasharray="${len.toFixed(2)} ${(C - len).toFixed(2)}" stroke-dashoffset="${(-off).toFixed(2)}" transform="rotate(-90 60 60)"><title>${monEsc(i.label)}: ${nf(i.value)}</title></circle>`;
      off += len; return s;
    }).join('') : '';
    return `<div class="mon-donut"><svg viewBox="0 0 120 120" role="img"><circle cx="60" cy="60" r="${R}" fill="none" stroke="#eef2f6" stroke-width="16"/>${arcs}
      <text x="60" y="58" text-anchor="middle" style="font-size:19px;font-weight:800;fill:var(--teks)">${centerVal}</text><text x="60" y="73" text-anchor="middle" class="mon-ax">${centerLbl || ''}</text></svg>
      <div class="mon-dl">${items.map(i => `<div><i style="background:${i.color}"></i><span>${monEsc(i.label)}</span><b>${nf(i.value)}</b><em>${pct(i.value, tot)}%</em></div>`).join('')}</div></div>`;
  }

  function hbars(items, kosong) {
    if (!items.length) return `<div class="mon-empty">${kosong || 'Belum ada data'}</div>`;
    return items.map(i => `<div class="mon-hb"><div class="mon-hb-top"><span class="mon-hb-l" title="${monEsc(i.label)}">${monEsc(i.label)}</span><span class="mon-hb-r">${i.right || ''}</span></div><div class="mon-hb-track"><i style="width:${Math.max(2, Math.round(i.value * 100 / (i.max || 1)))}%;background:${i.color || PAL.teal}"></i></div>${i.sub ? `<div class="mon-row-sub">${i.sub}</div>` : ''}</div>`).join('');
  }
  const legend = (arr) => `<div class="mon-legend">${arr.map(([c, l]) => `<span><i style="background:${c}"></i>${l}</span>`).join('')}</div>`;

  function fillSeries(rows, jam, b) {
    const end = Math.floor(Date.now() / 1000 / b) * b, cnt = Math.max(2, Math.ceil(jam * 3600 / b));
    const map = new Map((rows || []).map(r => [Number(r.ts), r]));
    return Array.from({ length: cnt }, (_, i) => { const ts = end - (cnt - 1 - i) * b; return { ts, ...(map.get(ts) || { n: 0, avg_ms: null, p95_ms: null, n_error: 0 }) }; });
  }
  function hariTerakhir(n) {
    const out = [];
    for (let i = n - 1; i >= 0; i--) out.push(new Date(Date.now() - i * 86400000).toLocaleDateString('en-CA', { timeZone: TZ }));
    return out;
  }
  const lblHari = (s) => new Date(s + 'T12:00:00').toLocaleDateString('id-ID', { day: '2-digit', month: 'short' });

  // Teks sumbu dijaga ukurannya di layar (SVG ikut melebar mengikuti kartu, teks tidak boleh ikut).
  function monFixText() {
    document.querySelectorAll('#monBody svg.mon-chart').forEach(svg => {
      const vb = svg.viewBox && svg.viewBox.baseVal, w = svg.getBoundingClientRect().width;
      if (!vb || !vb.width || !w) return;
      const scale = w / vb.width, px = scale < .8 ? 9 : 11;
      const fs = (px / scale).toFixed(2) + 'px';
      svg.querySelectorAll('.mon-ax').forEach(t => { t.style.fontSize = fs; });
    });
  }
  let monFixRaf = 0;
  const monFixSoon = () => { cancelAnimationFrame(monFixRaf); monFixRaf = requestAnimationFrame(monFixText); };
  window.addEventListener('resize', monFixSoon);

  const MON_PER = 5;
  function monPaged(items, rowFn, bodyId, pagId, kosong) {
    const draw = (p) => {
      const el = document.getElementById(bodyId); if (!el) return;
      el.innerHTML = items.length ? items.slice((p - 1) * MON_PER, p * MON_PER).map(rowFn).join('') : kosong;
      if (typeof renderPagination === 'function') renderPagination(pagId, items.length, p, MON_PER, draw);
    };
    draw(1);
  }
  const monPagedHb = (items, bodyId, pagId, kosong) => monPaged(items, i => hbars([i]), bodyId, pagId, `<div class="mon-empty">${kosong}</div>`);
  const secAmbil = (sec, a) => (sec && sec.ringkasan && sec.ringkasan.find(r => r.aksi === a)) || { h24: 0, h7: 0 };

  /* ── Ringkasan ── */
  async function tabRingkasan() {
    try {
      const [sum, hl, perf, use, errs, sec] = await Promise.all([
        monGet(MON + '/summary'),
        monGet('/api/health?detail=1').catch(() => null),
        monGet(MON + '/performance?jam=24'),
        monGet(MON + '/usage?hari=1'),
        monGet(MON + '/errors?limit=25&status=baru').catch(() => null),
        monGet(MON + '/security').catch(() => null),
      ]);
      if (monTab !== 'ringkasan' || !body$()) return;
      const st = hl ? hl.status : sum.health;
      const tone = { ok: 'ok', degraded: 'warn', down: 'bad' }[st] || 'abu';
      const judul = { ok: 'Semua layanan berjalan normal', degraded: 'Ada layanan yang perlu diperhatikan', down: 'Ada layanan yang bermasalah' }[st] || 'Status layanan belum diketahui';
      const b = perf.bucket_detik || 3600, ser = fillSeries(perf.series, 24, b);
      const lbl = ser.map(r => ({ short: jam24(r.ts), full: tglJam(r.ts) }));
      const gagalPct = pct(perf.total.n_error || 0, perf.total.n);
      const sf = secAmbil(sec, 'login_failed').h24, sb = secAmbil(sec, 'login_blocked').h24;
      const eStat = (errs && errs.stats) || null;
      const errSp = eStat && eStat.per_jam ? fillSeries(eStat.per_jam, 24, 3600).map(r => r.n) : [];
      const aktif = (use.aktif_sekarang || []);
      body$().innerHTML = `
        ${hero({
          tone, title: judul,
          text: `${sum.error_baru > 0 ? `<b>${sum.error_baru} error baru</b> menunggu ditinjau` : 'Tidak ada error baru'}. Dalam 24 jam terakhir ada <b>${nf(perf.total.n)}</b> permintaan dengan waktu respons p95 <b>${fmtMs(perf.total.p95_ms)}</b>${perf.total.n ? ` dan <b>${gagalPct}%</b> gagal` : ''}.${hl ? '' : (sum.health_updated ? ' Status dari cek terjadwal ' + fmtAgo(sum.health_updated) + '.' : ' Cron pemantauan belum jalan.')}`,
          pills: hl ? hl.checks.map(c => pill(monEsc(c.nama.replace(/\s*\(.*\)/, '')), c.ms != null ? c.ms + ' ms' : null, PAL[toneCek(c.status)] || PAL.abu)) : [],
        })}
        <div class="mon-kpis">
          ${kpi({ label: 'Error baru', val: nf(sum.error_baru), sub: `${nf(sum.error_24h)} muncul dalam 24 jam`, color: sum.error_baru > 0 ? PAL.bad : PAL.ok, icon: 'err', spark: spark(errSp, sum.error_baru > 0 ? PAL.bad : PAL.ok), onclick: "monPilihTab('error')" })}
          ${kpi({ label: 'Permintaan (24 jam)', val: nf(perf.total.n), sub: `${gagalPct}% gagal`, color: PAL.teal, icon: 'req', spark: spark(ser.map(r => r.n), PAL.teal), onclick: "monPilihTab('performa')" })}
          ${kpi({ label: 'Respons p95', val: fmtMs(perf.total.p95_ms), sub: `rata-rata ${fmtMs(perf.total.avg_ms)}`, color: colP95(perf.total.p95_ms), icon: 'cepat', spark: spark(ser.map(r => r.p95_ms || 0), colP95(perf.total.p95_ms)), onclick: "monPilihTab('performa')" })}
          ${kpi({ label: 'Pengguna aktif', val: nf(aktif.length), sub: `${nf(use.pengguna_24h)} pengguna unik dalam 24 jam`, color: PAL.info, icon: 'user', spark: spark((use.per_jam || []).map(x => x.u || 0), PAL.info), onclick: "monPilihTab('penggunaan')" })}
          ${kpi({ label: 'Login gagal (24 jam)', val: nf(sf), sub: sb ? `${sb} login diblokir` : 'Tidak ada pemblokiran', color: sf + sb > 0 ? PAL.warn : PAL.ok, icon: 'lock', onclick: "monPilihTab('keamanan')" })}
        </div>
        <div class="mon-cols">
          ${panel('Permintaan per jam', '24 jam terakhir, dihitung dari browser pengguna', areaChart({ labels: lbl, series: [{ name: 'Permintaan', color: PAL.teal, values: ser.map(r => r.n) }] }))}
          ${panel('Waktu respons', 'p95 dan rata-rata per jam, dalam milidetik', areaChart({ labels: lbl, series: [{ name: 'p95', color: PAL.warn, values: ser.map(r => r.p95_ms) }, { name: 'Rata-rata', color: PAL.info, values: ser.map(r => r.avg_ms), dash: true }], fmt: fmtMs, afmt: axMs }) + legend([[PAL.warn, 'p95'], [PAL.info, 'Rata-rata']]))}
        </div>
        <div class="mon-cols wide">
          ${panel('Endpoint paling lambat', 'Berdasarkan p95', '<div id="monRkEpBody"></div><div id="monRkEpPagination"></div>')}
          ${panel('Error menurut sumber', 'Semua error yang tercatat', eStat && eStat.sumber && eStat.sumber.length ? donut(eStat.sumber.map(s => ({ label: SRC[s.source] || s.source, value: s.n, color: SRC_COL[s.source] || PAL.abu })), nf(eStat.sumber.reduce((a, s) => a + s.n, 0)), 'jenis error') : '<div class="mon-empty">Belum ada error tercatat</div>')}
        </div>
        <div class="mon-cols">
          ${panel('Error baru terbaru', 'Klik untuk membuka Error Log', '<div id="monRkErrBody"></div><div id="monRkErrPagination"></div>')}
          ${hl ? panel('Pemeriksaan kesehatan', 'Dicek barusan', '<div id="monRkCekBody"></div><div id="monRkCekPagination"></div>') : panel('Pemeriksaan kesehatan', '', '<div class="mon-empty">Tidak dapat memeriksa kesehatan saat ini</div>')}
          ${panel('Sedang aktif', '15 menit terakhir', '<div id="monRkAktifBody"></div><div id="monRkAktifPagination"></div>')}
        </div>`;
      monPaged((errs && errs.errors) || [], e => `<div class="mon-feed" onclick="monPilihTab('error')"><span class="mon-src" style="--c:${SRC_COL[e.source] || PAL.abu}">${monEsc(SRC[e.source] || e.source)}</span><div class="mon-feed-b"><div class="mon-feed-m">${monEsc(e.message)}</div><div class="mon-row-sub">${e.endpoint ? monEsc(e.endpoint) + ' · ' : ''}${e.occurrences}x · ${fmtAgo(e.last_seen)}</div></div></div>`, 'monRkErrBody', 'monRkErrPagination', '<div class="mon-empty">Tidak ada error baru</div>');
      const epAll = perf.endpoints || [], epMax = Math.max(1, ...epAll.map(x => x.p95_ms));
      monPagedHb(epAll.map(e => ({ label: e.endpoint, value: e.p95_ms, max: epMax, color: colP95(e.p95_ms), right: badgeP95(e.p95_ms), sub: `${nf(e.n)} permintaan, rata-rata ${fmtMs(e.avg_ms)}${e.n_error ? `, ${e.n_error} gagal` : ''}` })), 'monRkEpBody', 'monRkEpPagination', 'Belum ada data performa. Data terkumpul saat pengguna memakai aplikasi.');
      if (hl) monPaged(hl.checks, rowCek, 'monRkCekBody', 'monRkCekPagination', '<div class="mon-empty">Belum ada data</div>');
      monPaged(aktif, a => `<div class="mon-user"><span class="mon-av">${monEsc(inisial(a.nama))}</span><div><div class="mon-user-n">${monEsc(a.nama || ('ID ' + a.user_id))}</div><div class="mon-row-sub">${fmtAgo(a.terakhir)}</div></div></div>`, 'monRkAktifBody', 'monRkAktifPagination', '<div class="mon-empty">Tidak ada pengguna aktif</div>');
    } catch (e) { if (body$()) body$().innerHTML = gagal(e); }
  }

  /* ── Error Log ── */
  function renderErrStats(s) {
    const el = document.getElementById('monErrStats'); if (!el || !s) return;
    const sj = fillSeries(s.per_jam, 24, 3600);
    const stt = s.status || {};
    const lbl = sj.map(r => jam24(r.ts));
    const top = s.endpoint || [];
    const maxO = Math.max(1, ...top.map(x => x.occ));
    el.innerHTML = `
      <div class="mon-kpis">
        ${kpi({ label: 'Baru', val: nf(stt.baru), sub: 'Belum ditinjau', color: stt.baru > 0 ? PAL.bad : PAL.ok, icon: 'err' })}
        ${kpi({ label: 'Dilihat', val: nf(stt.dilihat), sub: 'Sudah dibaca, belum selesai', color: PAL.warn, icon: 'cepat' })}
        ${kpi({ label: 'Selesai', val: nf(stt.selesai), sub: 'Sudah ditangani', color: PAL.ok, icon: 'sehat' })}
        ${kpi({ label: 'Total kejadian', val: nf(s.occ_total), sub: `${nf(s.occ_24h)} dalam 24 jam, ${nf((stt.baru || 0) + (stt.dilihat || 0) + (stt.selesai || 0))} jenis error`, color: PAL.info, icon: 'req', spark: spark(sj.map(r => r.n), PAL.info) })}
      </div>
      <div class="mon-cols">
        ${panel('Error aktif per jam', 'Dihitung dari kemunculan terakhir tiap error', barChart({ labels: lbl, values: sj.map(r => r.n), color: PAL.bad, h: 150 }))}
        ${panel('Menurut sumber', 'Siapa yang melaporkan', (s.sumber || []).length ? donut(s.sumber.map(x => ({ label: SRC[x.source] || x.source, value: x.occ, color: SRC_COL[x.source] || PAL.abu })), nf(s.occ_total), 'kejadian') : '<div class="mon-empty">Belum ada data</div>')}
        ${panel('Endpoint paling bermasalah', 'Berdasarkan jumlah kejadian', '<div id="monErrEpBody"></div><div id="monErrEpPagination"></div>')}
      </div>`;
    monPagedHb(top.map(x => ({ label: x.endpoint, value: x.occ, max: maxO, color: PAL.bad, right: nf(x.occ) + 'x', sub: `${x.n} jenis error` })), 'monErrEpBody', 'monErrEpPagination', 'Tidak ada error dari endpoint API');
  }

  async function tabError() {
    body$().innerHTML = `
      <div id="monErrHero"></div>
      <div id="monErrStats"></div>
      <div class="toolbar" style="flex-wrap:wrap;gap:8px">
        <div class="search-wrap"><svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-4.35-4.35"/></svg><input type="text" id="monErrQ" placeholder="Cari pesan, endpoint, atau pengguna…" oninput="monCariError()" /></div>
        <div class="select-wrap" style="min-width:170px">
          <select id="monErrStatus" onchange="monMuatError(1)">
            <option value="">Semua status</option><option value="baru" selected>Baru</option><option value="dilihat">Dilihat</option><option value="selesai">Selesai</option>
          </select>
        </div>
        <div class="select-wrap" style="min-width:150px">
          <select id="monErrSrc" onchange="monMuatError(1)">
            <option value="">Semua sumber</option><option value="client">Browser</option><option value="promise">Promise</option><option value="api">API 5xx</option><option value="network">Jaringan</option>
          </select>
        </div>
        <button class="btn btn-sm btn-outline-hijau" onclick="monTandaiSemua()"><svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5" style="margin-right:5px;vertical-align:-2px"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"/></svg>Tandai semua dilihat</button>
        <button class="btn btn-sm btn-outline-hijau" onclick="monMuatUlangError()"><svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5" style="margin-right:5px;vertical-align:-2px"><path stroke-linecap="round" stroke-linejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg>Muat ulang</button>
      </div>
      <div class="card" style="padding:0;overflow:auto;-webkit-overflow-scrolling:touch">
        <table class="freeze-table"><thead><tr><th>Terakhir</th><th>Error</th><th>Pengguna</th><th>Jumlah</th><th>Status</th><th>Aksi</th></tr></thead>
        <tbody id="monErrBody"><tr class="empty-row"><td colspan="6">Memuat data...</td></tr></tbody></table>
      </div>
      <div id="monErrPagination"></div>`;
    if (typeof window.initCustomSelects === 'function') window.initCustomSelects();
    monMuatError(1);
  }
  window.monMuatUlangError = function () { monMuatError(monErrPage); };
  window.monCariError = function () { clearTimeout(monErrTimer); monErrTimer = setTimeout(() => monMuatError(1), 400); };

  const STATUS_BADGE = { baru: 'badge-merah', dilihat: 'badge-yellow', selesai: 'badge-hijau' };
  const STATUS_COL = { baru: PAL.bad, dilihat: PAL.warn, selesai: PAL.ok };

  window.monMuatError = async function (page) {
    monErrPage = page || 1;
    const tb = document.getElementById('monErrBody'); if (!tb) return;
    const q = document.getElementById('monErrQ')?.value || '';
    const st = document.getElementById('monErrStatus')?.value || '';
    const src = document.getElementById('monErrSrc')?.value || '';
    try {
      const d = await monGet(`${MON}/errors?${new URLSearchParams({ page: monErrPage, limit: MON_ERR_LIMIT, q, status: st, source: src })}`);
      if (monTab !== 'error') return;
      if (d.stats) {
        renderErrStats(d.stats);
        const hr = document.getElementById('monErrHero');
        if (hr) {
          const b = d.stats.status?.baru || 0, kb = (d.stats.kambuh || 0);
          hr.innerHTML = hero({
            tone: b > 0 ? 'bad' : 'ok', title: b > 0 ? `${b} error menunggu ditinjau` : 'Tidak ada error baru',
            text: b > 0 ? `Ada <b>${nf(d.stats.occ_24h)}</b> kejadian dalam 24 jam terakhir.${kb ? ` <b>${kb}</b> error yang sudah ditandai selesai muncul lagi.` : ''} Tinjau, lalu tandai dilihat atau selesai.` : `Semua error sudah ditinjau. Total ${nf(d.stats.occ_total)} kejadian tercatat sejak awal.`,
            pills: (d.stats.sumber || []).map(s => pill(SRC[s.source] || s.source, nf(s.n), SRC_COL[s.source] || PAL.abu)),
          });
        }
      }
      tb.innerHTML = d.errors.length ? d.errors.map(e => `
        <tr style="box-shadow:inset 4px 0 0 ${STATUS_COL[e.status] || PAL.abu}">
          <td style="white-space:nowrap">${fmtWaktu(e.last_seen)}<div class="mon-row-sub">${fmtAgo(e.last_seen)}</div></td>
          <td class="mon-msg">
            <span class="mon-src" style="--c:${SRC_COL[e.source] || PAL.abu}">${monEsc(SRC[e.source] || e.source)}</span>
            ${e.http_status ? `<span class="badge badge-merah">${e.http_status}</span>` : ''}
            <div style="margin-top:4px">${monEsc(e.message)}</div>
            <div class="mon-row-sub">${e.endpoint ? monEsc(e.endpoint) + ' · ' : ''}${e.page ? 'Halaman ' + monEsc(e.page) : ''}${e.ua ? ' · ' + monEsc(uaShort(e.ua)) : ''}</div>
            ${e.stack ? `<details><summary class="mon-row-sub" style="cursor:pointer">Stack trace</summary><pre class="mon-pre">${monEsc(e.stack)}</pre></details>` : ''}
          </td>
          <td>${monEsc(e.nama || '-')}</td>
          <td><b>${nf(e.occurrences)}x</b><div class="mon-row-sub">sejak ${fmtWaktu(e.first_seen)}</div></td>
          <td><span class="badge ${STATUS_BADGE[e.status] || 'badge-abu'}">${monEsc(e.status)}</span></td>
          <td style="white-space:nowrap">
            ${e.status !== 'dilihat' && e.status !== 'selesai' ? `<button class="btn btn-sm btn-outline-hijau" onclick="monUbahError(${e.id},'dilihat')"><svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5" style="margin-right:5px;vertical-align:-2px"><path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg>Dilihat</button> ` : ''}
            ${e.status !== 'selesai' ? `<button class="btn btn-sm btn-primary" onclick="monUbahError(${e.id},'selesai')"><svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5" style="margin-right:5px;vertical-align:-2px"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"/></svg>Selesai</button>` : `<button class="btn btn-sm btn-outline-hijau" onclick="monUbahError(${e.id},'baru')"><svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5" style="margin-right:5px;vertical-align:-2px"><path stroke-linecap="round" stroke-linejoin="round" d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6"/></svg>Buka lagi</button>`}
          </td>
        </tr>`).join('')
        : `<tr class="empty-row"><td colspan="6">Tidak ada error pada filter ini 🎉</td></tr>`;
      if (typeof renderPagination === 'function') renderPagination('monErrPagination', d.total, d.page, d.limit, (p) => monMuatError(p));
    } catch (e) { tb.innerHTML = `<tr class="empty-row"><td colspan="6">Gagal memuat: ${monEsc(e.message)}</td></tr>`; }
  };

  window.monUbahError = async function (id, status) {
    try { await monSend('PATCH', `${MON}/errors/${id}`, { status }); monMuatError(monErrPage); monRefreshBadge(); }
    catch (e) { if (typeof toast === 'function') toast('Gagal mengubah status: ' + e.message, 'error'); }
  };
  window.monTandaiSemua = async function () {
    try {
      const d = await monSend('POST', `${MON}/errors/mark-all`, { dari: 'baru', ke: 'dilihat' });
      if (typeof toast === 'function') toast(`${d.diubah} error ditandai dilihat`);
      monMuatError(1); monRefreshBadge();
    } catch (e) { if (typeof toast === 'function') toast('Gagal: ' + e.message, 'error'); }
  };

  /* ── Performa ── */
  async function tabPerforma(jam) {
    jam = jam || 24;
    try {
      const d = await monGet(`${MON}/performance?jam=${jam}`);
      if (monTab !== 'performa' || !body$()) return;
      const t = d.total, eps = d.endpoints || [];
      const b = d.bucket_detik || 3600, ser = fillSeries(d.series, jam, b);
      const lbl = ser.map(r => ({ short: jam > 24 ? tglJam(r.ts).split(' ').slice(0, 2).join(' ') : jam24(r.ts), full: tglJam(r.ts) }));
      const gagalPct = pct(t.n_error || 0, t.n);
      const tone = gagalPct >= 5 || t.p95_ms > 2000 ? 'bad' : (gagalPct >= 1 || t.p95_ms > 800) ? 'warn' : t.n ? 'ok' : 'abu';
      const judul = { ok: 'Respons cepat dan stabil', warn: 'Sebagian permintaan melambat', bad: 'Performa menurun', abu: 'Belum ada data performa' }[tone];
      const kc = d.status_kelas || [], kcol = { '2xx': PAL.ok, '3xx': PAL.info, '4xx': PAL.warn, '5xx': PAL.bad, gagal: PAL.abu };
      const kp = d.kecepatan || null;
      const lambat = eps[0], ramai = [...eps].sort((a, z) => z.n - a.n)[0], sering = [...eps].filter(e => e.n_error).sort((a, z) => z.n_error - a.n_error)[0];
      const ins = [];
      if (lambat) ins.push(insight(lambat.p95_ms > 2000 ? 'bad' : lambat.p95_ms > 800 ? 'warn' : 'ok', `Paling lambat: <b>${monEsc(lambat.endpoint)}</b> dengan p95 ${fmtMs(lambat.p95_ms)} dari ${nf(lambat.n)} permintaan.`));
      if (ramai) ins.push(insight('info', `Paling ramai: <b>${monEsc(ramai.endpoint)}</b> dengan ${nf(ramai.n)} permintaan (${pct(ramai.n, t.n)}% dari total).`));
      if (sering) ins.push(insight('bad', `Paling sering gagal: <b>${monEsc(sering.endpoint)}</b>, ${sering.n_error} dari ${nf(sering.n)} permintaan (${pct(sering.n_error, sering.n)}%).`));
      else if (t.n) ins.push(insight('ok', 'Tidak ada permintaan gagal pada rentang ini.'));
      const maxP = Math.max(1, ...eps.map(e => e.p95_ms));
      body$().innerHTML = `
        ${hero({ tone, title: judul, text: t.n ? `<b>${nf(t.n)}</b> permintaan dalam ${jam >= 24 ? (jam / 24) + ' hari' : jam + ' jam'} terakhir, p95 <b>${fmtMs(t.p95_ms)}</b>, rata-rata <b>${fmtMs(t.avg_ms)}</b>, <b>${gagalPct}%</b> gagal.` : 'Data terkumpul saat pengguna memakai aplikasi.', pills: [pill('Cepat di bawah 300 ms', kp ? nf(kp.cepat) : null, PAL.ok), pill('Lambat di atas 800 ms', kp ? nf((kp.lambat || 0) + (kp.kritis || 0)) : null, PAL.warn)] })}
        <div class="toolbar" style="gap:8px;flex-wrap:wrap">
          <div class="select-wrap" style="min-width:170px">
            <select id="monPerfJam" onchange="monGantiJam(this.value)">
              ${[[1, '1 jam terakhir'], [6, '6 jam terakhir'], [24, '24 jam terakhir'], [72, '3 hari terakhir'], [168, '7 hari terakhir']].map(([v, l]) => `<option value="${v}" ${v == jam ? 'selected' : ''}>${l}</option>`).join('')}
            </select>
          </div>
        </div>
        <div class="mon-kpis">
          ${kpi({ label: 'Permintaan', val: nf(t.n), sub: `${nf(eps.length)} endpoint aktif`, color: PAL.teal, icon: 'req', spark: spark(ser.map(r => r.n), PAL.teal) })}
          ${kpi({ label: 'Rata-rata', val: fmtMs(t.avg_ms), sub: 'Termasuk waktu jaringan', color: PAL.info, icon: 'cepat', spark: spark(ser.map(r => r.avg_ms || 0), PAL.info) })}
          ${kpi({ label: 'p95', val: fmtMs(t.p95_ms), sub: '95% permintaan lebih cepat dari ini', color: colP95(t.p95_ms), icon: 'sehat', spark: spark(ser.map(r => r.p95_ms || 0), colP95(t.p95_ms)) })}
          ${kpi({ label: 'Tingkat gagal', val: gagalPct + '%', sub: `${nf(t.n_error || 0)} permintaan 5xx atau putus`, color: gagalPct >= 5 ? PAL.bad : gagalPct >= 1 ? PAL.warn : PAL.ok, icon: 'err', spark: spark(ser.map(r => r.n_error || 0), PAL.bad) })}
          ${kpi({ label: 'Terlama', val: fmtMs(t.max_ms), sub: 'Satu permintaan paling lambat', color: PAL.warn, icon: 'lock' })}
        </div>
        <div class="mon-cols wide">
          ${panel('Tren waktu respons', 'p95 dan rata-rata per periode', areaChart({ labels: lbl, series: [{ name: 'p95', color: PAL.warn, values: ser.map(r => r.p95_ms) }, { name: 'Rata-rata', color: PAL.info, values: ser.map(r => r.avg_ms), dash: true }], fmt: fmtMs, afmt: axMs, h: 210 }) + legend([[PAL.warn, 'p95'], [PAL.info, 'Rata-rata']]))}
          ${panel('Hasil permintaan', 'Menurut kelas status HTTP', kc.length ? donut(kc.map(x => ({ label: x.kelas === 'gagal' ? 'Putus / gagal' : x.kelas, value: x.n, color: kcol[x.kelas] || PAL.abu })), nf(t.n), 'permintaan') : '<div class="mon-empty">Belum ada data</div>')}
        </div>
        <div class="mon-cols">
          ${panel('Volume permintaan', 'Jumlah per periode', barChart({ labels: lbl.map(l => l.short), values: ser.map(r => r.n), color: PAL.teal, h: 150 }))}
          ${panel('Sebaran kecepatan', 'Berapa banyak permintaan di tiap kelas', kp ? `<div class="mon-stack">${[['cepat', PAL.ok], ['sedang', PAL.info], ['lambat', PAL.warn], ['kritis', PAL.bad]].map(([k, c]) => `<i style="width:${pct(kp[k], t.n)}%;background:${c}" title="${k}: ${nf(kp[k])}"></i>`).join('')}</div>
            ${legend([[PAL.ok, `Cepat (&lt;300 ms) ${nf(kp.cepat)}`], [PAL.info, `Sedang (300-800 ms) ${nf(kp.sedang)}`], [PAL.warn, `Lambat (0,8-2 dtk) ${nf(kp.lambat)}`], [PAL.bad, `Kritis (&gt;2 dtk) ${nf(kp.kritis)}`]])}
            <div style="margin-top:var(--sp-4)">${ins.join('')}</div>` : `<div style="margin-top:4px">${ins.join('') || '<div class="mon-empty">Belum ada data</div>'}</div>`)}
        </div>
        <div class="card" style="padding:0;overflow:auto;-webkit-overflow-scrolling:touch">
          <table class="freeze-table"><thead><tr><th>Endpoint</th><th>Permintaan</th><th>Rata-rata</th><th>p95</th><th>Terlama</th><th>Gagal</th></tr></thead><tbody id="monPerfBody"></tbody></table>
        </div>
        <div id="monPerfPagination"></div>
        <div class="mon-muted" style="margin-top:8px">Diukur dari browser pengguna, jadi sudah termasuk waktu jaringan. Gagal = status 5xx atau koneksi putus. Data disimpan 7 hari.</div>`;
      if (typeof window.initCustomSelects === 'function') window.initCustomSelects();
      monPaged(eps, e => `<tr><td><b>${monEsc(e.endpoint)}</b></td><td>${nf(e.n)}<div class="mon-row-sub">${pct(e.n, t.n)}% dari total</div></td><td>${fmtMs(e.avg_ms)}</td><td><div class="mon-cellbar">${badgeP95(e.p95_ms)}<div class="mon-hb-track"><i style="width:${Math.max(3, Math.round(e.p95_ms * 100 / maxP))}%;background:${colP95(e.p95_ms)}"></i></div></div></td><td>${fmtMs(e.max_ms)}</td><td>${e.n_error ? `<span class="badge badge-merah">${e.n_error} (${pct(e.n_error, e.n)}%)</span>` : '0'}</td></tr>`, 'monPerfBody', 'monPerfPagination', '<tr class="empty-row"><td colspan="6">Belum ada data pada rentang ini</td></tr>');
    } catch (e) { if (body$()) body$().innerHTML = gagal(e); }
  }
  window.monGantiJam = (v) => tabPerforma(parseInt(v));

  /* ── Kesehatan ── */
  function rowCek(c) {
    return `<div class="mon-row"><div><div style="font-weight:600">${monEsc(c.nama)}</div><div class="mon-row-sub">${monEsc(c.info || '')}${c.ms != null ? ' · ' + c.ms + ' ms' : ''}${c.last_run ? ' · ' + fmtWaktu(c.last_run) : ''}</div></div>${badgeStatusCek(c.status)}</div>`;
  }
  const HB_NAMA = { 'absensi-cron-alpa': 'Cron Absensi (alpa otomatis)', 'monitoring-cron': 'Cron Pemantauan (cek berkala)' };
  const BATAS_MS = { database: 1500, cloudinary: 2500 };
  async function tabKesehatan() {
    try {
      const [h, sum] = await Promise.all([monGet('/api/health?detail=1'), monGet(MON + '/summary')]);
      if (monTab !== 'kesehatan' || !body$()) return;
      const tone = { ok: 'ok', degraded: 'warn', down: 'bad' }[h.status] || 'abu';
      const masalah = h.checks.filter(c => c.status === 'down' || c.status === 'warn');
      const tg = !!h.notifikasi?.telegram;
      const hbs = sum.heartbeats || [];
      const cronMon = hbs.find(x => x.name === 'monitoring-cron');
      const todo = [
        [h.checks.find(c => c.key === 'database')?.status === 'ok', 'Database terhubung', 'Neon PostgreSQL menjawab dengan normal.'],
        [h.checks.find(c => c.key === 'cloudinary')?.status === 'ok', 'Penyimpanan file siap', 'Variabel CLOUDINARY_* lengkap dan API menjawab.'],
        [tg, 'Notifikasi Telegram aktif', 'Isi TELEGRAM_BOT_TOKEN dan TELEGRAM_CHAT_ID, lalu restart.'],
        [!!cronMon && cronMon.ok, 'Cek terjadwal berjalan', 'monitoring-cron perlu aktif agar status dicek otomatis.'],
      ];
      const ok = (v) => v ? 'ok' : 'warn';
      body$().innerHTML = `
        ${hero({
          tone, title: { ok: 'Semua layanan sehat', degraded: 'Sebagian layanan menurun', down: 'Ada layanan yang down' }[h.status] || 'Status belum diketahui',
          text: masalah.length ? `Perlu dicek: ${masalah.map(c => `<b>${monEsc(c.nama)}</b> (${monEsc(c.info || c.status)})`).join(', ')}.` : `Database, penyimpanan file, dan cron berjalan normal. Cek terjadwal terakhir: ${sum.health_updated ? fmtAgo(sum.health_updated) : 'belum pernah'}.`,
          pills: h.checks.map(c => pill(monEsc(c.nama.replace(/\s*\(.*\)/, '')), c.ms != null ? c.ms + ' ms' : null, PAL[toneCek(c.status)] || PAL.abu)),
        })}
        <div class="mon-checks">${h.checks.map(c => {
          const lim = BATAS_MS[c.key], icon = c.key === 'database' ? 'db' : c.key === 'cloudinary' ? 'cloud' : 'cepat';
          return `<div class="mon-check t-${toneCek(c.status)}">
            <div class="mon-check-h"><span style="display:flex;align-items:center;gap:8px">${svgIc(icon, 'currentColor', 17)}${monEsc(c.nama)}</span>${badgeStatusCek(c.status)}</div>
            ${c.ms != null ? `<div class="mon-check-ms">${c.ms}<small>ms</small></div>${lim ? `<div class="mon-hb-track" style="margin:8px 0 4px"><i style="width:${Math.min(100, Math.round(c.ms * 100 / lim))}%;background:var(--tone)"></i></div><div class="mon-row-sub">Batas peringatan ${lim} ms</div>` : ''}` : `<div class="mon-check-ms" style="font-size:var(--fs-lg)">${c.last_run ? fmtAgo(c.last_run) : 'Belum ada catatan'}</div><div class="mon-row-sub">${c.last_run ? 'Terakhir jalan ' + fmtWaktu(c.last_run) : ''}</div>`}
            <div class="mon-row-sub" style="margin-top:6px;font-size:var(--fs-sm)">${monEsc(c.info || '')}</div>
          </div>`;
        }).join('')}</div>
        <div class="mon-cols">
          ${panel('Tugas terjadwal', 'Denyut terakhir tiap cron', '<div id="monHbBody"></div><div id="monHbPagination"></div>', `<button class="btn btn-sm btn-outline-hijau" onclick="monPilihTab('kesehatan')"><svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5" style="margin-right:5px;vertical-align:-2px"><path stroke-linecap="round" stroke-linejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg>Cek ulang</button>`)}
          ${panel('Kesiapan sistem', `${todo.filter(t => t[0]).length} dari ${todo.length} siap`, todo.map(([v, a, b]) => `<div class="mon-todo t-${ok(v)}"><span class="mon-dot">${v ? '✓' : '!'}</span><div><div style="font-weight:600">${a}</div>${v ? '' : `<div class="mon-row-sub">${b}</div>`}</div></div>`).join(''))}
          ${panel('Notifikasi Telegram', '', tg ? `<span class="badge badge-hijau">Aktif</span><div class="mon-muted" style="margin-top:8px">Admin dikabari saat ada error baru, error yang berulang, dan saat status sistem berubah.</div><div style="margin-top:var(--sp-4)"><button class="btn btn-sm btn-outline-hijau" onclick="monTesNotif()"><svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5" style="margin-right:5px;vertical-align:-2px"><path stroke-linecap="round" stroke-linejoin="round" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"/></svg>Kirim pesan tes</button></div>` : `<span class="badge badge-abu">Belum aktif</span><div class="mon-muted" style="margin-top:8px">Isi environment variable <b>TELEGRAM_BOT_TOKEN</b> (dari @BotFather) dan <b>TELEGRAM_CHAT_ID</b> (ID chat/grup tujuan), lalu restart.</div>`)}
        </div>
        ${panel('Uptime monitor eksternal', 'Untuk UptimeRobot atau sejenisnya', `<div class="mon-code"><code id="monHealthUrl">${monEsc(location.origin)}/api/health</code><button class="btn btn-sm btn-outline-hijau" onclick="monSalin()"><svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5" style="margin-right:5px;vertical-align:-2px"><path stroke-linecap="round" stroke-linejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"/></svg>Salin</button></div><div class="mon-muted" style="margin-top:8px">Publik, hanya mengecek database. Mengembalikan 503 jika database mati.</div>`)}`;
      monPaged(hbs, x => `<div class="mon-row"><div><div style="font-weight:600">${monEsc(HB_NAMA[x.name] || x.name)}</div><div class="mon-row-sub">${fmtAgo(x.last_run)} (${fmtWaktu(x.last_run)})${x.info ? ' · ' + monEsc(x.info) : ''}</div></div><span class="badge ${x.ok ? 'badge-hijau' : 'badge-merah'}">${x.ok ? 'Berhasil' : 'Gagal'}</span></div>`, 'monHbBody', 'monHbPagination', '<div class="mon-empty">Belum ada cron yang tercatat</div>');
    } catch (e) { if (body$()) body$().innerHTML = gagal(e); }
  }
  window.monSalin = function () {
    const t = document.getElementById('monHealthUrl')?.textContent || '';
    (navigator.clipboard ? navigator.clipboard.writeText(t) : Promise.reject()).then(() => { if (typeof toast === 'function') toast('URL disalin'); }, () => { if (typeof toast === 'function') toast('Gagal menyalin', 'error'); });
  };
  window.monTesNotif = async function () {
    try { await monSend('POST', MON + '/test-notif'); if (typeof toast === 'function') toast('Pesan tes terkirim ke Telegram'); }
    catch (e) { if (typeof toast === 'function') toast('Gagal kirim: ' + e.message, 'error'); }
  };

  /* ── Penggunaan ── */
  const MODUL_COL = [PAL.teal, PAL.info, PAL.ungu, PAL.warn, '#0891b2', '#db2777', '#65a30d', PAL.abu];
  async function tabPenggunaan(hari) {
    hari = hari || 7;
    try {
      const d = await monGet(`${MON}/usage?hari=${hari}`);
      if (monTab !== 'penggunaan' || !body$()) return;
      const jam = Array.from({ length: 24 }, (_, i) => d.per_jam.find(x => x.jam === i) || { jam: i, n: 0, u: 0 });
      const maxJam = Math.max(...jam.map(x => x.n)), puncak = maxJam > 0 ? jam.findIndex(x => x.n === maxJam) : -1;
      const total = d.total_hits != null ? d.total_hits : d.modul.reduce((a, m) => a + m.hits, 0);
      const maxHits = Math.max(1, ...d.modul.map(m => m.hits));
      const aktif = d.aktif_sekarang || [];
      const hs = hariTerakhir(Math.min(hari, 30)), hmap = new Map((d.harian || []).map(x => [x.hari, x]));
      const harian = hs.map(s => hmap.get(s) || { hari: s, n: 0, u: 0 });
      const rata = d.pengguna_periode ? Math.round(total / d.pengguna_periode) : 0;
      const top = d.modul[0];
      const ins = [];
      if (puncak >= 0) ins.push(insight('info', `Jam tersibuk <b>${String(puncak).padStart(2, '0')}:00 WITA</b> dengan ${nf(maxJam)} permintaan.`));
      if (top) ins.push(insight('ok', `Modul paling sering dipakai: <b>${monEsc(top.modul)}</b> (${pct(top.hits, total)}% dari semua permintaan, ${top.pengguna} pengguna).`));
      const hsib = [...harian].sort((a, z) => z.n - a.n)[0];
      if (hari > 1 && hsib && hsib.n) ins.push(insight('info', `Hari tersibuk <b>${lblHari(hsib.hari)}</b> dengan ${nf(hsib.n)} permintaan dari ${hsib.u} pengguna.`));
      body$().innerHTML = `
        ${hero({ tone: aktif.length ? 'info' : 'abu', title: aktif.length ? `${aktif.length} pengguna sedang aktif` : 'Tidak ada pengguna aktif sekarang', text: `<b>${nf(d.pengguna_24h)}</b> pengguna unik dalam 24 jam terakhir, <b>${nf(total)}</b> permintaan dalam ${hari === 1 ? '24 jam' : hari + ' hari'}.`, pills: aktif.slice(0, 6).map(a => pill(monEsc(a.nama || ('ID ' + a.user_id)), fmtAgo(a.terakhir), PAL.ok)) })}
        <div class="toolbar" style="gap:8px">
          <div class="select-wrap" style="min-width:170px">
            <select onchange="monGantiHari(this.value)">
              ${[[1, '24 jam terakhir'], [7, '7 hari terakhir'], [30, '30 hari terakhir']].map(([v, l]) => `<option value="${v}" ${v == hari ? 'selected' : ''}>${l}</option>`).join('')}
            </select>
          </div>
        </div>
        <div class="mon-kpis">
          ${kpi({ label: 'Pengguna unik (24 jam)', val: nf(d.pengguna_24h), sub: d.pengguna_periode ? `${nf(d.pengguna_periode)} pengguna dalam rentang ini` : '', color: PAL.info, icon: 'user', spark: spark(harian.map(x => x.u), PAL.info) })}
          ${kpi({ label: 'Aktif 15 menit terakhir', val: nf(aktif.length), sub: aktif.map(a => monEsc(a.nama || ('ID ' + a.user_id))).slice(0, 3).join(', ') || 'Tidak ada', color: PAL.ok, icon: 'sehat' })}
          ${kpi({ label: 'Total permintaan', val: nf(total), sub: rata ? `rata-rata ${nf(rata)} per pengguna` : '', color: PAL.teal, icon: 'req', spark: spark(harian.map(x => x.n), PAL.teal) })}
          ${kpi({ label: 'Jam tersibuk', val: puncak >= 0 ? String(puncak).padStart(2, '0') + ':00' : '-', sub: puncak >= 0 ? `${nf(maxJam)} permintaan` : 'Belum ada data', color: PAL.warn, icon: 'cepat' })}
        </div>
        <div class="mon-cols wide">
          ${hari > 1 ? panel('Aktivitas harian', 'Permintaan dan pengguna per hari (WITA)', areaChart({ labels: harian.map(x => ({ short: lblHari(x.hari), full: lblHari(x.hari) })), series: [{ name: 'Permintaan', color: PAL.teal, values: harian.map(x => x.n) }, { name: 'Pengguna', color: PAL.info, values: harian.map(x => x.u), dash: true }], h: 200 }) + legend([[PAL.teal, 'Permintaan'], [PAL.info, 'Pengguna unik']])) : panel('Aktivitas per jam', 'Sorotan kuning menandai jam tersibuk', barChart({ labels: jam.map(x => String(x.jam).padStart(2, '0')), values: jam.map(x => x.n), color: PAL.teal, h: 200, hi: puncak, unit: 'permintaan' }))}
          ${panel('Sorotan', '', ins.join('') || '<div class="mon-empty">Belum ada data penggunaan</div>')}
        </div>
        ${hari > 1 ? panel('Jam sibuk (WITA)', 'Akumulasi seluruh hari dalam rentang. Sorotan kuning menandai puncak.', barChart({ labels: jam.map(x => String(x.jam).padStart(2, '0')), values: jam.map(x => x.n), color: PAL.teal, h: 150, hi: puncak, unit: 'permintaan' })) : ''}
        <div class="mon-cols wide">
          ${panel('Modul paling sering dipakai', `${d.modul.length} modul`, '<div id="monModulBody"></div><div id="monModulPagination"></div>')}
          ${panel('Pengguna paling aktif', `Dalam ${hari === 1 ? '24 jam' : hari + ' hari'}`, '<div id="monTopUBody"></div><div id="monTopUPagination"></div>')}
        </div>`;
      if (typeof window.initCustomSelects === 'function') window.initCustomSelects();
      monPaged(d.modul, (m) => { const i = d.modul.indexOf(m); return `<div class="mon-hb"><div class="mon-hb-top"><span class="mon-hb-l">${monEsc(m.modul)}</span><span class="mon-hb-r"><b>${nf(m.hits)}</b> permintaan · ${m.pengguna} pengguna · ${pct(m.hits, total)}%</span></div><div class="mon-hb-track"><i style="width:${Math.max(3, Math.round(m.hits * 100 / maxHits))}%;background:${MODUL_COL[i % MODUL_COL.length]}"></i></div></div>`; }, 'monModulBody', 'monModulPagination', '<div class="mon-empty">Belum ada data penggunaan</div>');
      const topU = d.pengguna_top || [];
      monPagedHb(topU.map(u => ({ label: u.nama || ('ID ' + u.user_id), value: u.hits, max: topU[0].hits, color: PAL.info, right: nf(u.hits) + ' permintaan', sub: 'Terakhir ' + fmtAgo(u.terakhir) })), 'monTopUBody', 'monTopUPagination', 'Belum ada data');
    } catch (e) { if (body$()) body$().innerHTML = gagal(e); }
  }
  window.monGantiHari = (v) => tabPenggunaan(parseInt(v));

  /* ── Keamanan ── */
  async function tabKeamanan() {
    try {
      const d = await monGet(MON + '/security');
      if (monTab !== 'keamanan' || !body$()) return;
      const label = (a) => (typeof AKSI_LABEL !== 'undefined' && AKSI_LABEL[a]) || a;
      const A = (a) => secAmbil(d, a);
      const f = A('login_failed'), bl = A('login_blocked'), ru = A('refresh_token_reuse_detected'), fl = A('force_logout'), ul = A('unlock_login');
      const tone = (bl.h24 + ru.h24) > 0 ? 'bad' : f.h24 >= 5 ? 'warn' : 'ok';
      const judul = { ok: 'Tidak ada ancaman terdeteksi', warn: 'Banyak percobaan login gagal', bad: 'Ada kejadian keamanan serius' }[tone];
      const hs = hariTerakhir(7), hm = {};
      (d.harian || []).forEach(r => { (hm[r.hari] = hm[r.hari] || {})[r.aksi] = r.n; });
      const ser = (a) => hs.map(s => (hm[s] && hm[s][a]) || 0);
      const tot7 = f.h7 + bl.h7 + ru.h7;
      const ipTop = d.ip_top || [], akunTop = d.akun_top || [];
      const ins = [];
      if (ipTop[0] && ipTop[0].n >= 3) ins.push(insight('warn', `IP <b>${monEsc(ipTop[0].ip)}</b> memicu ${ipTop[0].n} kejadian dalam 7 hari. Pantau, dan pertimbangkan memblokir jika terus berulang.`));
      if (akunTop[0] && akunTop[0].n >= 3) ins.push(insight('warn', `Akun <b>${monEsc(akunTop[0].akun)}</b> paling sering jadi sasaran (${akunTop[0].n} kejadian).`));
      if (ru.h7) ins.push(insight('bad', `<b>${ru.h7}</b> kali refresh token dipakai ulang dalam 7 hari. Ini bisa berarti token dicuri, sebaiknya paksa logout akun terkait.`));
      if (ul.h7) ins.push(insight('info', `Admin membuka kunci login <b>${ul.h7}</b> kali dalam 7 hari.`));
      if (!ins.length) ins.push(insight('ok', 'Tidak ada pola mencurigakan pada 7 hari terakhir.'));
      body$().innerHTML = `
        ${hero({ tone, title: judul, text: `<b>${nf(f.h24)}</b> login gagal dan <b>${nf(bl.h24)}</b> login diblokir dalam 24 jam terakhir. Dalam 7 hari total <b>${nf(tot7)}</b> kejadian.`, pills: [pill('Login gagal', f.h7, PAL.warn), pill('Diblokir', bl.h7, PAL.bad), pill('Token dipakai ulang', ru.h7, PAL.ungu), pill('Paksa logout', fl.h7, PAL.info)] })}
        <div class="mon-kpis">
          ${kpi({ label: 'Login gagal', val: nf(f.h24), sub: `${f.h7} dalam 7 hari`, color: f.h24 ? PAL.warn : PAL.ok, icon: 'lock', spark: spark(ser('login_failed'), PAL.warn) })}
          ${kpi({ label: 'Login diblokir', val: nf(bl.h24), sub: `${bl.h7} dalam 7 hari`, color: bl.h24 ? PAL.bad : PAL.ok, icon: 'lock', spark: spark(ser('login_blocked'), PAL.bad) })}
          ${kpi({ label: 'Token dipakai ulang', val: nf(ru.h24), sub: `${ru.h7} dalam 7 hari`, color: ru.h24 ? PAL.bad : PAL.ok, icon: 'key', spark: spark(ser('refresh_token_reuse_detected'), PAL.ungu) })}
          ${kpi({ label: 'Paksa logout', val: nf(fl.h24), sub: `${fl.h7} dalam 7 hari`, color: PAL.info, icon: 'user' })}
          ${kpi({ label: 'Kunci dibuka admin', val: nf(ul.h24), sub: `${ul.h7} dalam 7 hari`, color: PAL.teal, icon: 'key' })}
        </div>
        <div class="mon-cols wide">
          ${panel('Kejadian per hari', '7 hari terakhir (WITA)', areaChart({ labels: hs.map(s => ({ short: lblHari(s), full: lblHari(s) })), series: [{ name: 'Login gagal', color: PAL.warn, values: ser('login_failed') }, { name: 'Diblokir', color: PAL.bad, values: ser('login_blocked') }, { name: 'Token dipakai ulang', color: PAL.ungu, values: ser('refresh_token_reuse_detected'), dash: true }], h: 200 }) + legend([[PAL.warn, 'Login gagal'], [PAL.bad, 'Diblokir'], [PAL.ungu, 'Token dipakai ulang']]))}
          ${panel('Komposisi kejadian', '7 hari terakhir', tot7 ? donut([{ label: 'Login gagal', value: f.h7, color: PAL.warn }, { label: 'Diblokir', value: bl.h7, color: PAL.bad }, { label: 'Token dipakai ulang', value: ru.h7, color: PAL.ungu }], nf(tot7), 'kejadian') : '<div class="mon-empty">Tidak ada kejadian</div>')}
        </div>
        <div class="mon-cols">
          ${panel('IP paling sering bermasalah', '7 hari terakhir', '<div id="monIpBody"></div><div id="monIpPagination"></div>')}
          ${panel('Akun paling sering jadi sasaran', '7 hari terakhir', '<div id="monAkunBody"></div><div id="monAkunPagination"></div>')}
          ${panel('Sorotan', '', ins.join(''))}
        </div>
        <div class="card" style="padding:0;overflow:auto;-webkit-overflow-scrolling:touch">
          <table class="freeze-table"><thead><tr><th>Waktu</th><th>Kejadian</th><th>Pengguna</th><th>IP</th><th>Lokasi</th></tr></thead><tbody id="monSecBody"></tbody></table>
        </div>
        <div id="monSecPagination"></div>
        <div class="mon-muted" style="margin-top:8px">Sumber: Audit Trail. Untuk detail lengkap, buka menu Audit Trail.</div>`;
      const aksiBadge = { login_failed: 'badge-yellow', login_blocked: 'badge-merah', refresh_token_reuse_detected: 'badge-ungu' };
      monPaged(d.terbaru, r => `<tr><td style="white-space:nowrap">${fmtWaktu(r.created_at)}<div class="mon-row-sub">${fmtAgo(r.created_at)}</div></td><td><span class="badge ${aksiBadge[r.aksi] || 'badge-merah'}">${monEsc(label(r.aksi))}</span></td><td>${monEsc(r.nama || r.email || '-')}${r.nama && r.email ? `<div class="mon-row-sub">${monEsc(r.email)}</div>` : ''}</td><td>${monEsc(r.ip_address || '-')}</td><td>${monEsc(r.lokasi || '-')}</td></tr>`, 'monSecBody', 'monSecPagination', '<tr class="empty-row"><td colspan="5">Tidak ada kejadian keamanan</td></tr>');
      monPagedHb(ipTop.map(x => ({ label: x.ip, value: x.n, max: ipTop[0].n, color: PAL.warn, right: nf(x.n) + 'x', sub: 'Terakhir ' + fmtAgo(x.terakhir) })), 'monIpBody', 'monIpPagination', 'Tidak ada IP yang mencurigakan');
      monPagedHb(akunTop.map(x => ({ label: x.akun, value: x.n, max: akunTop[0].n, color: PAL.bad, right: nf(x.n) + 'x', sub: 'Terakhir ' + fmtAgo(x.terakhir) })), 'monAkunBody', 'monAkunPagination', 'Tidak ada akun yang menonjol');
    } catch (e) { if (body$()) body$().innerHTML = gagal(e); }
  }

  /* ───────────── 3. Badge sidebar ───────────── */
  let badgeState = { baru: 0, health: null };

  function terapkanBadge() {
    document.querySelectorAll('.mon-badge').forEach(n => n.remove());
    if (!monIsAdmin()) return;
    const { baru, health } = badgeState;
    const teks = baru > 0 ? (baru > 99 ? '99+' : String(baru)) : (health === 'down' ? '!' : '');
    if (!teks) return;
    const warn = baru === 0 && health === 'degraded';
    const targets = document.querySelectorAll('[data-sub="pemantauan-sistem"], [data-sub="master-general"], [data-group="master"]');
    targets.forEach(t => {
      const b = document.createElement('span');
      b.className = 'mon-badge' + (warn ? ' warn' : '');
      b.textContent = teks;
      t.appendChild(b);
    });
  }

  async function monRefreshBadge() {
    if (!monIsAdmin() || document.hidden) return;
    try {
      const r = await fetch(MON + '/summary', { headers: monHeaders() });
      if (!r.ok) return;
      const d = await r.json();
      badgeState = { baru: d.error_baru || 0, health: d.health || null };
      terapkanBadge();
    } catch (e) {}
  }
  window.monRefreshBadge = monRefreshBadge;

  function init() {
    ensurePage();
    const nav = document.getElementById('sidebarNav');
    if (nav) new MutationObserver(() => { terapkanBadge(); }).observe(nav, { childList: true });   // sidebar dibangun ulang -> pasang badge lagi
    setTimeout(monRefreshBadge, 3000);
    setInterval(monRefreshBadge, 60000);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
