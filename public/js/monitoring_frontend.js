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
  .mon-tabs{display:flex;gap:4px;padding:5px;margin-bottom:var(--sp-4);width:fit-content;max-width:100%;overflow-x:auto;-webkit-overflow-scrolling:touch;scrollbar-width:none;background:rgba(255,255,255,.85);backdrop-filter:blur(10px);border:1.5px solid rgba(255,255,255,.8);border-radius:var(--r-md,14px);box-shadow:var(--shadow-sm)}
  .mon-tabs::-webkit-scrollbar{display:none}
  .mon-tab{display:inline-flex;align-items:center;gap:8px;flex-shrink:0;white-space:nowrap;padding:5px 14px 5px 6px;border:none;border-radius:10px;background:transparent;color:var(--teks-mid);font-family:inherit;font-size:var(--fs-base);font-weight:600;cursor:pointer;transition:background .18s,color .18s}
  .mon-tab-ic{display:flex;align-items:center;justify-content:center;width:26px;height:26px;border-radius:8px;background:var(--abu-1);color:var(--teks-muted);transition:background .18s,color .18s}
  .mon-tab:hover{background:var(--abu-1);color:var(--teks)}
  .mon-tab:hover .mon-tab-ic{background:#fff}
  .mon-tab.active{background:var(--hijau-light);color:var(--hijau);font-weight:700}
  .mon-tab.active .mon-tab-ic{background:var(--hijau);color:#fff}
  .stat-grid.mon-grid{grid-template-columns:repeat(auto-fit,minmax(220px,1fr))}
  #page-pemantauan-sistem .card-title-sm{font-size:.95rem;font-weight:700}
  #page-pemantauan-sistem .card-header{margin-bottom:var(--sp-3)}
  .mon-stat-sub{font-size:var(--fs-xs);color:var(--teks-muted);margin-top:4px}
  .mon-row{font-size:.78rem;display:flex;align-items:center;justify-content:space-between;gap:12px;padding:10px 0;border-bottom:1px solid rgba(0,0,0,.06)}
  .mon-row:last-child{border-bottom:none}
  .mon-row-sub{font-size:var(--fs-xs);color:var(--teks-muted);margin-top:2px}
  .mon-pre{white-space:pre-wrap;word-break:break-word;font-size:.7rem;background:rgba(0,0,0,.05);padding:8px;border-radius:var(--r-sm);margin:6px 0 0;max-height:220px;overflow:auto}
  .mon-msg{max-width:460px;word-break:break-word}
  .mon-bar-wrap{background:rgba(0,0,0,.06);border-radius:var(--r-full);height:8px;min-width:90px;flex:1}
  .mon-bar{background:var(--hijau);height:8px;border-radius:var(--r-full)}
  .mon-hours{display:flex;align-items:flex-end;gap:3px;height:120px;margin-top:8px}
  .mon-hours>div{flex:1;display:flex;flex-direction:column;justify-content:flex-end;align-items:center;height:100%;font-size:9px;color:var(--teks-muted)}
  .mon-hours i{display:block;width:100%;background:var(--hijau);border-radius:3px 3px 0 0;min-height:2px}
  .mon-badge{margin-left:auto;flex-shrink:0;min-width:18px;height:18px;padding:0 5px;border-radius:9px;background:#dc2626;color:#fff;font-size:11px;font-weight:700;line-height:18px;text-align:center}
  .mon-badge.warn{background:#d97706}
  .sidebar.collapsed .mon-badge{display:none}
  .mon-muted{color:var(--teks-muted);font-size:var(--fs-sm)}
  .mon-empty{padding:24px;text-align:center;color:var(--teks-muted)}
  `;

  const TABS = [
    ['ringkasan', 'Ringkasan'], ['error', 'Error Log'], ['performa', 'Performa'],
    ['kesehatan', 'Kesehatan'], ['penggunaan', 'Penggunaan'], ['keamanan', 'Keamanan'],
  ];
  let monTab = 'ringkasan';
  let monErrPage = 1;
  const MON_ERR_LIMIT = 12;
  let monErrTimer = null;

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

  const fmtWaktu = (ts) => ts ? new Date(ts).toLocaleString('id-ID', { timeZone: 'Asia/Makassar', day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : '-';
  function fmtAgo(ts) {
    if (!ts) return '-';
    const s = Math.max(0, (Date.now() - new Date(ts).getTime()) / 1000);
    if (s < 60) return 'baru saja';
    if (s < 3600) return Math.floor(s / 60) + ' menit lalu';
    if (s < 86400) return Math.floor(s / 3600) + ' jam lalu';
    return Math.floor(s / 86400) + ' hari lalu';
  }
  const fmtMs = (n) => n == null ? '-' : (n >= 1000 ? (n / 1000).toFixed(1) + ' dtk' : n + ' ms');
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

  const TAB_IC = {
    ringkasan: '<rect x="3" y="3" width="7" height="9" rx="1"/><rect x="14" y="3" width="7" height="5" rx="1"/><rect x="14" y="12" width="7" height="9" rx="1"/><rect x="3" y="16" width="7" height="5" rx="1"/>',
    error: '<path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>',
    performa: '<polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>',
    kesehatan: '<polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>',
    penggunaan: '<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>',
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

  window.loadPemantauanSistem = function () {
    if (!ensurePage()) return;
    monTab = 'ringkasan'; renderTabs();
    window.monPilihTab('ringkasan');
    monRefreshBadge();
  };

  const body$ = () => document.getElementById('monBody');
  const IC = {
    err: '<circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>',
    sehat: '<path d="M22 12h-4l-3 9L9 3l-3 9H2"/>',
    cepat: '<circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>',
    user: '<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>',
    lock: '<rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>'
  };
  const statCard = (label, val, sub, onclick, color, icon) => {
    color = color || '#0f766e';
    return `<div class="stat-card" style="border-left-color:${color}${onclick ? ';cursor:pointer' : ''}"${onclick ? ` onclick="${onclick}"` : ''}>
      <div class="stat-card-body">
        <div class="stat-label">${label}</div>
        <div class="stat-value" style="color:${color}">${val}</div>
        <div class="mon-stat-sub">${sub || ''}</div>
      </div>
      <div class="stat-icon" style="background:${color}1f;opacity:1">
        <svg xmlns="http://www.w3.org/2000/svg" width="17" height="17" fill="none" viewBox="0 0 24 24" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${IC[icon] || IC.sehat}</svg>
      </div>
    </div>`;
  };

  const MON_PER = 10;
  function monPaged(items, rowFn, bodyId, pagId, kosong) {
    const draw = (p) => {
      const el = document.getElementById(bodyId); if (!el) return;
      el.innerHTML = items.length ? items.slice((p - 1) * MON_PER, p * MON_PER).map(rowFn).join('') : kosong;
      if (typeof renderPagination === 'function') renderPagination(pagId, items.length, p, MON_PER, draw);
    };
    draw(1);
  }

  /* ── Ringkasan ── */
  async function tabRingkasan() {
    try {
      const [sum, hl, perf, use] = await Promise.all([
        monGet(MON + '/summary'),
        monGet('/api/health?detail=1').catch(() => null),
        monGet(MON + '/performance?jam=24'),
        monGet(MON + '/usage?hari=1'),
      ]);
      if (monTab !== 'ringkasan' || !body$()) return;
      const lambat = (perf.endpoints || []).slice(0, 5);
      body$().innerHTML = `
        <div class="stat-grid mon-grid">
          ${statCard('Error baru', sum.error_baru, `${sum.error_24h} muncul dalam 24 jam`, "monPilihTab('error')", sum.error_baru > 0 ? '#dc2626' : '#16a34a', 'err')}
          ${statCard('Status sistem', hl ? badgeStatusSistem(hl.status) : badgeStatusSistem(sum.health), hl ? 'Dicek barusan' : (sum.health_updated ? 'Cek terjadwal ' + fmtAgo(sum.health_updated) : 'Cron monitoring belum jalan'), "monPilihTab('kesehatan')", ({ ok: '#16a34a', degraded: '#d97706', down: '#dc2626' })[hl ? hl.status : sum.health] || '#64748b', 'sehat')}
          ${statCard('Waktu respons p95', fmtMs(perf.total.p95_ms), `rata-rata ${fmtMs(perf.total.avg_ms)} · ${perf.total.n} permintaan (24 jam)`, "monPilihTab('performa')", '#d97706', 'cepat')}
          ${statCard('Aktif sekarang', (use.aktif_sekarang || []).length, `${use.pengguna_24h} pengguna unik dalam 24 jam`, "monPilihTab('penggunaan')", '#2563eb', 'user')}
        </div>
        <div class="card">
          <div class="card-header"><div class="card-title-sm">Endpoint paling lambat (24 jam)</div></div>
          ${lambat.length ? lambat.map(e => `<div class="mon-row"><div><div style="font-weight:600">${monEsc(e.endpoint)}</div><div class="mon-row-sub">${e.n} permintaan · rata-rata ${fmtMs(e.avg_ms)}</div></div>${badgeP95(e.p95_ms)}</div>`).join('')
            : '<div class="mon-empty">Belum ada data performa. Data terkumpul saat pengguna memakai aplikasi.</div>'}
        </div>
        ${hl ? `<div class="card"><div class="card-header"><div class="card-title-sm">Pemeriksaan kesehatan</div></div>${hl.checks.map(rowCek).join('')}</div>` : ''}`;
    } catch (e) { if (body$()) body$().innerHTML = gagal(e); }
  }

  /* ── Error Log ── */
  async function tabError() {
    body$().innerHTML = `
      <div class="toolbar" style="flex-wrap:wrap;gap:8px">
        <div class="search-wrap"><svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-4.35-4.35"/></svg><input type="text" id="monErrQ" placeholder="Cari pesan, endpoint, atau pengguna…" oninput="monCariError()" /></div>
        <div class="select-wrap" style="min-width:170px">
          <select id="monErrStatus" onchange="monMuatError(1)">
            <option value="">Semua status</option><option value="baru" selected>Baru</option><option value="dilihat">Dilihat</option><option value="selesai">Selesai</option>
          </select>
        </div>
        <button class="btn btn-sm btn-outline-hijau" onclick="monTandaiSemua()">Tandai semua dilihat</button>
        <button class="btn btn-sm btn-outline-hijau" onclick="monMuatUlangError()">Muat ulang</button>
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

  const SRC = { client: 'Browser', promise: 'Promise', api: 'API 5xx', network: 'Jaringan' };
  const STATUS_BADGE = { baru: 'badge-merah', dilihat: 'badge-yellow', selesai: 'badge-hijau' };

  window.monMuatError = async function (page) {
    monErrPage = page || 1;
    const tb = document.getElementById('monErrBody'); if (!tb) return;
    const q = document.getElementById('monErrQ')?.value || '';
    const st = document.getElementById('monErrStatus')?.value || '';
    try {
      const d = await monGet(`${MON}/errors?${new URLSearchParams({ page: monErrPage, limit: MON_ERR_LIMIT, q, status: st })}`);
      tb.innerHTML = d.errors.length ? d.errors.map(e => `
        <tr>
          <td style="white-space:nowrap">${fmtWaktu(e.last_seen)}<div class="mon-row-sub">${fmtAgo(e.last_seen)}</div></td>
          <td class="mon-msg">
            <span class="badge badge-abu">${monEsc(SRC[e.source] || e.source)}</span>
            ${e.http_status ? `<span class="badge badge-merah">${e.http_status}</span>` : ''}
            <div style="margin-top:4px">${monEsc(e.message)}</div>
            <div class="mon-row-sub">${e.endpoint ? monEsc(e.endpoint) + ' · ' : ''}${e.page ? 'Halaman ' + monEsc(e.page) : ''}</div>
            ${e.stack ? `<details><summary class="mon-row-sub" style="cursor:pointer">Stack trace</summary><pre class="mon-pre">${monEsc(e.stack)}</pre></details>` : ''}
          </td>
          <td>${monEsc(e.nama || '-')}</td>
          <td><b>${e.occurrences}x</b><div class="mon-row-sub">sejak ${fmtWaktu(e.first_seen)}</div></td>
          <td><span class="badge ${STATUS_BADGE[e.status] || 'badge-abu'}">${monEsc(e.status)}</span></td>
          <td style="white-space:nowrap">
            ${e.status !== 'dilihat' && e.status !== 'selesai' ? `<button class="btn btn-sm btn-outline-hijau" onclick="monUbahError(${e.id},'dilihat')">Dilihat</button> ` : ''}
            ${e.status !== 'selesai' ? `<button class="btn btn-sm btn-primary" onclick="monUbahError(${e.id},'selesai')">Selesai</button>` : `<button class="btn btn-sm btn-outline-hijau" onclick="monUbahError(${e.id},'baru')">Buka lagi</button>`}
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
      body$().innerHTML = `
        <div class="toolbar" style="gap:8px;flex-wrap:wrap">
          <div class="select-wrap" style="min-width:170px">
            <select id="monPerfJam" onchange="monGantiJam(this.value)">
              ${[[1, '1 jam terakhir'], [6, '6 jam terakhir'], [24, '24 jam terakhir'], [72, '3 hari terakhir'], [168, '7 hari terakhir']].map(([v, l]) => `<option value="${v}" ${v == jam ? 'selected' : ''}>${l}</option>`).join('')}
            </select>
          </div>
          <span class="mon-muted">${d.total.n} permintaan · p95 ${fmtMs(d.total.p95_ms)} · rata-rata ${fmtMs(d.total.avg_ms)}</span>
        </div>
        <div class="card" style="padding:0;overflow:auto;-webkit-overflow-scrolling:touch">
          <table class="freeze-table"><thead><tr><th>Endpoint</th><th>Permintaan</th><th>Rata-rata</th><th>p95</th><th>Terlama</th><th>Gagal</th></tr></thead><tbody id="monPerfBody"></tbody></table>
        </div>
        <div id="monPerfPagination"></div>
        <div class="mon-muted" style="margin-top:8px">Diukur dari browser pengguna, jadi sudah termasuk waktu jaringan. Gagal = status 5xx atau koneksi putus. Data disimpan 7 hari.</div>`;
      if (typeof window.initCustomSelects === 'function') window.initCustomSelects();
      monPaged(d.endpoints, e => `<tr><td>${monEsc(e.endpoint)}</td><td>${e.n}</td><td>${fmtMs(e.avg_ms)}</td><td>${badgeP95(e.p95_ms)}</td><td>${fmtMs(e.max_ms)}</td><td>${e.n_error ? `<span class="badge badge-merah">${e.n_error} (${Math.round(e.n_error * 100 / e.n)}%)</span>` : '0'}</td></tr>`, 'monPerfBody', 'monPerfPagination', '<tr class="empty-row"><td colspan="6">Belum ada data pada rentang ini</td></tr>');
    } catch (e) { if (body$()) body$().innerHTML = gagal(e); }
  }
  window.monGantiJam = (v) => tabPerforma(parseInt(v));

  /* ── Kesehatan ── */
  function rowCek(c) {
    return `<div class="mon-row"><div><div style="font-weight:600">${monEsc(c.nama)}</div><div class="mon-row-sub">${monEsc(c.info || '')}${c.ms != null ? ' · ' + c.ms + ' ms' : ''}${c.last_run ? ' · ' + fmtWaktu(c.last_run) : ''}</div></div>${badgeStatusCek(c.status)}</div>`;
  }
  async function tabKesehatan() {
    try {
      const [h, sum] = await Promise.all([monGet('/api/health?detail=1'), monGet(MON + '/summary')]);
      if (monTab !== 'kesehatan' || !body$()) return;
      body$().innerHTML = `
        <div class="card">
          <div class="card-header"><div class="card-title-sm">Status keseluruhan: ${badgeStatusSistem(h.status)}</div>
            <button class="btn btn-sm btn-outline-hijau" onclick="monPilihTab('kesehatan')">Cek ulang</button></div>
          ${h.checks.map(rowCek).join('')}
          <div class="mon-muted" style="margin-top:10px">Cek terjadwal terakhir: ${sum.health_updated ? fmtAgo(sum.health_updated) : 'belum pernah (cron monitoring-cron belum aktif)'}.</div>
        </div>
        <div class="card">
          <div class="card-header"><div class="card-title-sm">Notifikasi Telegram</div>
            ${h.notifikasi?.telegram ? `<button class="btn btn-sm btn-outline-hijau" onclick="monTesNotif()">Kirim pesan tes</button>` : ''}</div>
          ${h.notifikasi?.telegram
            ? '<span class="badge badge-hijau">Aktif</span> <span class="mon-muted">Admin dikabari saat ada error baru, error yang berulang, dan saat status sistem berubah.</span>'
            : `<span class="badge badge-abu">Belum aktif</span>
               <div class="mon-muted" style="margin-top:8px">Isi environment variable <b>TELEGRAM_BOT_TOKEN</b> (dari @BotFather) dan <b>TELEGRAM_CHAT_ID</b> (ID chat/grup tujuan), lalu restart.</div>`}
        </div>
        <div class="mon-muted">URL untuk uptime monitor eksternal: <b>/api/health</b> (publik, hanya cek database, 503 jika database mati).</div>`;
    } catch (e) { if (body$()) body$().innerHTML = gagal(e); }
  }
  window.monTesNotif = async function () {
    try { await monSend('POST', MON + '/test-notif'); if (typeof toast === 'function') toast('Pesan tes terkirim ke Telegram'); }
    catch (e) { if (typeof toast === 'function') toast('Gagal kirim: ' + e.message, 'error'); }
  };

  /* ── Penggunaan ── */
  async function tabPenggunaan(hari) {
    hari = hari || 7;
    try {
      const d = await monGet(`${MON}/usage?hari=${hari}`);
      if (monTab !== 'penggunaan' || !body$()) return;
      const maxHits = Math.max(1, ...d.modul.map(m => m.hits));
      const jam = Array.from({ length: 24 }, (_, i) => d.per_jam.find(x => x.jam === i) || { jam: i, n: 0 });
      const maxJam = Math.max(1, ...jam.map(x => x.n));
      body$().innerHTML = `
        <div class="toolbar" style="gap:8px">
          <div class="select-wrap" style="min-width:170px">
            <select onchange="monGantiHari(this.value)">
              ${[[1, '24 jam terakhir'], [7, '7 hari terakhir'], [30, '30 hari terakhir']].map(([v, l]) => `<option value="${v}" ${v == hari ? 'selected' : ''}>${l}</option>`).join('')}
            </select>
          </div>
        </div>
        <div class="stat-grid mon-grid">
          ${statCard('Pengguna unik (24 jam)', d.pengguna_24h, '', null, '#2563eb', 'user')}
          ${statCard('Aktif 15 menit terakhir', d.aktif_sekarang.length, d.aktif_sekarang.map(a => monEsc(a.nama || ('ID ' + a.user_id))).join(', ') || 'Tidak ada', null, '#16a34a', 'sehat')}
        </div>
        <div class="card">
          <div class="card-header"><div class="card-title-sm">Modul paling sering dipakai</div></div>
          <div id="monModulBody"></div>
          <div id="monModulPagination"></div>
        </div>
        <div class="card">
          <div class="card-header"><div class="card-title-sm">Jam sibuk (WITA)</div></div>
          <div class="mon-hours">${jam.map(x => `<div title="Jam ${x.jam}:00 · ${x.n} permintaan"><i style="height:${Math.round(x.n * 100 / maxJam)}%"></i>${x.jam}</div>`).join('')}</div>
        </div>`;
      if (typeof window.initCustomSelects === 'function') window.initCustomSelects();
      monPaged(d.modul, m => `<div class="mon-row"><div style="min-width:120px;font-weight:600">${monEsc(m.modul)}</div><div class="mon-bar-wrap"><div class="mon-bar" style="width:${Math.max(3, Math.round(m.hits * 100 / maxHits))}%"></div></div><div class="mon-row-sub" style="min-width:130px;text-align:right">${m.hits} permintaan · ${m.pengguna} pengguna</div></div>`, 'monModulBody', 'monModulPagination', '<div class="mon-empty">Belum ada data penggunaan</div>');
    } catch (e) { if (body$()) body$().innerHTML = gagal(e); }
  }
  window.monGantiHari = (v) => tabPenggunaan(parseInt(v));

  /* ── Keamanan ── */
  async function tabKeamanan() {
    try {
      const d = await monGet(MON + '/security');
      if (monTab !== 'keamanan' || !body$()) return;
      const label = (a) => (typeof AKSI_LABEL !== 'undefined' && AKSI_LABEL[a]) || a;
      const ambil = (a) => d.ringkasan.find(r => r.aksi === a) || { h24: 0, h7: 0 };
      const kartu = [['login_failed', 'Login gagal'], ['login_blocked', 'Login diblokir'], ['refresh_token_reuse_detected', 'Token dipakai ulang'], ['force_logout', 'Paksa logout']];
      body$().innerHTML = `
        <div class="stat-grid mon-grid">${kartu.map(([a, l]) => statCard(l, ambil(a).h24, `${ambil(a).h7} dalam 7 hari`, null, '#dc2626', 'lock')).join('')}</div>
        <div class="card" style="padding:0;overflow:auto;-webkit-overflow-scrolling:touch">
          <table class="freeze-table"><thead><tr><th>Waktu</th><th>Kejadian</th><th>Pengguna</th><th>IP</th><th>Lokasi</th></tr></thead><tbody id="monSecBody"></tbody></table>
        </div>
        <div id="monSecPagination"></div>
        <div class="mon-muted" style="margin-top:8px">Sumber: Audit Trail. Untuk detail lengkap, buka menu Audit Trail.</div>`;
      monPaged(d.terbaru, r => `<tr><td style="white-space:nowrap">${fmtWaktu(r.created_at)}</td><td><span class="badge badge-merah">${monEsc(label(r.aksi))}</span></td><td>${monEsc(r.nama || r.email || '-')}</td><td>${monEsc(r.ip_address || '-')}</td><td>${monEsc(r.lokasi || '-')}</td></tr>`, 'monSecBody', 'monSecPagination', '<tr class="empty-row"><td colspan="5">Tidak ada kejadian keamanan</td></tr>');
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
