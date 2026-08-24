
import { getDb, jsonResponse, errorResponse } from './_db.js';
import crypto from 'node:crypto';

function escHtml(str) {
  return String(str || '').replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
}

function getBundleHtml() {
  return `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8" />
  <script>
  // Sama kayak bundle.html - halaman ini cuma mau efek partikel tema di
  // header, bukan pill/banner mengambang atau background penuh.
  window.SAPA_TEMA_PARTIKEL_ONLY = true;
  </script>
  <script>
  // Prefetch tema musiman sedini mungkin - lihat komentar sama di
  // bundle.html/login.html soal cache localStorage (biar gak ada jeda
  // "halaman polos dulu baru tema muncul" akibat cold-start function/DB).
  (function () {
    var CACHE_KEY = 'sapa_tema_cache_v1';
    var CACHE_TTL = 6 * 60 * 60 * 1000; // 6 jam

    function preloadGambar(theme) {
      if (theme && theme.gambar_url) {
        var link = document.createElement('link');
        link.rel = 'preload';
        link.as = 'image';
        link.href = theme.gambar_url;
        document.head.appendChild(link);
      }
    }

    function bacaCache() {
      try {
        var raw = localStorage.getItem(CACHE_KEY);
        if (!raw) return null;
        var parsed = JSON.parse(raw);
        if (!parsed || !parsed.ts || (Date.now() - parsed.ts) > CACHE_TTL) return null;
        return parsed.data;
      } catch (e) { return null; }
    }

    function tulisCache(data) {
      try { localStorage.setItem(CACHE_KEY, JSON.stringify({ ts: Date.now(), data: data })); } catch (e) {}
    }

    var freshPromise = fetch('/api/landing/tema-aktif?_=' + Date.now(), { cache: 'no-store' })
      .then(function (r) { return r.ok ? r.json() : { theme: null }; })
      .then(function (d) {
        tulisCache(d);
        preloadGambar(d && d.theme);
        return d;
      })
      .catch(function (e) {
        console.warn('[theme-engine] prefetch awal gagal:', e);
        return { theme: null };
      });

    // Cache localStorage cuma dipakai buat preload gambar lebih awal
    // (biar gak ada jeda render). Tema yang BENERAN diterapkan selalu
    // nunggu freshPromise (fetch tanpa cache) - biar status Aktif/
    // Nonaktif/Terjadwal selalu akurat sesuai tanggal & toggle terbaru
    // tiap kali halaman di-refresh, sama kayak di topbar app.html.
    var cached = bacaCache();
    if (cached) preloadGambar(cached.theme);
    // Diekspos biar theme-engine.js bisa render tema cache ini SINKRON
    // (instan, gak nunggu network) sambil tetep reconcile ke data fresh
    // begitu freshPromise selesai - lihat init() di theme-engine.js.
    window.__sapaTemaCache = cached;
    window.__sapaTemaPromise = freshPromise;
  })();
  </script>
  <!-- Preload file theme-engine.js juga, paralel dari awal - jangan
       nunggu parser sampe ke <script> di akhir body baru mulai narik. -->
  <link rel="preload" as="script" href="/js/theme-engine.js?v=1.5.0" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>SAPA Perencanaan</title>
  <!-- Open Graph / WhatsApp Preview -->
  <meta property="og:type"         content="website" />
  <meta property="og:site_name"    content="SAPA Perencanaan" />
  <meta property="og:title"        content="SAPA Perencanaan" />
  <meta property="og:description"  content="Portal link resmi Sub Bagian Perencanaan Dinas Kesehatan PPKB Kabupaten Banggai Laut" />
  <meta property="og:image"        content="https://sapa-dinkesp2kb.netlify.app/favicon.png" />
  <meta property="og:image:width"  content="512" />
  <meta property="og:image:height" content="512" />
  <meta property="og:url"          content="https://sapa-dinkesp2kb.netlify.app" />
  <!-- Twitter Card -->
  <meta name="twitter:card"        content="summary" />
  <meta name="twitter:title"       content="SAPA Perencanaan" />
  <meta name="twitter:image"       content="https://sapa-dinkesp2kb.netlify.app/favicon.png" />
  <link rel="icon" type="image/png" href="/favicon.png" />
  <link rel="apple-touch-icon" href="/favicon.png" />
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
  <link rel="stylesheet" href="/css/styles.css" />
  <style>
    /* ── Logo brand-footer: animasi sama persis kayak .topbar-icon-wrap di
       landing.html (ring spin conic-gradient + partikel orbit berkedip +
       loop fade-in/scale/glow tiap 6 detik) - di-prefix "bf-" biar gak
       nabrak style lain yang mungkin dipakai css/styles.css. ── */
    .bf-icon-wrap {
      position: relative;
      display: inline-flex; align-items: center; justify-content: center;
      width: 32px; height: 32px;
      margin-bottom: 10px;
      animation: bfIconLoop 6s cubic-bezier(0.34,1.56,0.64,1) infinite;
    }
    .bf-icon-wrap img {
      width: 32px; height: 32px; object-fit: contain;
      position: relative; z-index: 2;
    }
    .bf-ring-spin {
      position: absolute; inset: -6px;
      border-radius: 50%;
      background: conic-gradient(from 0deg, transparent 0%, rgba(20,184,166,.7) 14%, rgba(45,212,191,.9) 22%, transparent 34%, transparent 55%, rgba(13,148,136,.6) 68%, rgba(45,212,191,.8) 76%, transparent 88%);
      -webkit-mask: radial-gradient(farthest-side, transparent calc(100% - 2px), #000 calc(100% - 2px));
              mask: radial-gradient(farthest-side, transparent calc(100% - 2px), #000 calc(100% - 2px));
      animation: bfRingSpin 2.6s linear infinite;
      pointer-events: none;
      z-index: 0;
    }
    .bf-particles-mini { position: absolute; inset: -14px; pointer-events: none; z-index: 1; }
    .bfp {
      position: absolute; top: 50%; left: 50%;
      border-radius: 50%;
      transform-origin: 0 0;
      animation: bfOrbit linear infinite, bfTwinkle ease-in-out infinite;
    }
    .bfp-1 { --r: 17px; width: 1.5px; height: 1.5px; background: #2dd4bf; box-shadow: 0 0 3px 1px rgba(45,212,191,.8); animation-duration: 4.6s, 1.9s; animation-delay: -1.6s, -.4s; }
    .bfp-2 { --r: 22px; width: 2px;   height: 2px;   background: #0d9488; box-shadow: 0 0 3px 1px rgba(13,148,136,.7); animation-duration: 5.5s, 2.3s; animation-delay: -2.3s, -.6s; }
    .bfp-3 { --r: 14px; width: 1.5px; height: 1.5px; background: #fff; box-shadow: 0 0 3px 1px rgba(255,255,255,.85); animation-duration: 3.9s, 1.6s; animation-delay: -1.1s, -.3s; }
    .bfp-4 { --r: 25px; width: 1.5px; height: 1.5px; background: #5eead4; box-shadow: 0 0 3px 1px rgba(94,234,212,.7); animation-duration: 6.2s, 2.6s; animation-delay: -2.8s, -.7s; }
    .bfp-5 { --r: 19px; width: 2px;   height: 2px;   background: #14b8a6; box-shadow: 0 0 3px 1px rgba(20,184,166,.75); animation-duration: 4.9s, 2.1s; animation-delay: -1.9s, -.5s; }

    @keyframes bfRingSpin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
    @keyframes bfOrbit {
      from { transform: rotate(0deg)   translateX(var(--r, 20px)) rotate(0deg); }
      to   { transform: rotate(360deg) translateX(var(--r, 20px)) rotate(-360deg); }
    }
    @keyframes bfTwinkle {
      0%, 100% { opacity: .25; }
      50%      { opacity: 1; }
    }
    @keyframes bfIconLoop {
      0%   { opacity: 0; transform: scale(0.6); filter: drop-shadow(0 0 0px rgba(13,148,136,0)); }
      12%  { opacity: 1; transform: scale(1.12); filter: drop-shadow(0 4px 10px rgba(0,0,0,.15)) drop-shadow(0 0 12px rgba(13,148,136,.5)); }
      18%  { transform: scale(1); }
      50%  { filter: drop-shadow(0 2px 8px rgba(0,0,0,.12)) drop-shadow(0 0 8px rgba(13,148,136,.35)); }
      82%  { opacity: 1; transform: scale(1); }
      92%  { opacity: 0; transform: scale(0.75); }
      100% { opacity: 0; transform: scale(0.6); }
    }
    /* Icon link default di item-card: paksa ikut warna tema app (teal), bukan
       warna ungu/lavender yang kebawa dari style lain. */
    .item-card .item-icon { color: var(--hijau, #0f766e); }
    .item-card .item-icon svg { color: var(--hijau, #0f766e); stroke: currentColor; }
  </style>
</head>
<body class="bundle-page">
<div class="page-wrap">

  <!-- HEADER -->
  <div class="bundle-header" id="topbar">
    <div class="logo-partner-row">
      <img src="/logokemenkes.png" alt="Kemenkes RI" />
      <div class="logo-divider"></div>
      <img src="/logobkkbn.png" alt="BKKBN" />
      <div class="logo-divider"></div>
      <img src="/logobalut.png" alt="Kabupaten Banggai Laut" />
    </div>
    <div id="headerContent">
      <div class="skeleton" style="height:22px;width:60%;margin:0 auto 10px;border-radius:8px"></div>
      <div class="skeleton" style="height:14px;width:80%;margin:0 auto;border-radius:6px"></div>
    </div>
  </div>

  <!-- ITEMS -->
  <div id="itemsContainer">
    <div class="items-list">
      <div style="display:flex;align-items:center;gap:14px;background:var(--putih);border-radius:var(--radius);padding:14px 18px;box-shadow:var(--shadow-sm)">
        <div class="skeleton" style="width:42px;height:42px;border-radius:10px;flex-shrink:0"></div>
        <div style="flex:1"><div class="skeleton" style="height:14px;width:70%;margin-bottom:8px;border-radius:6px"></div><div class="skeleton" style="height:10px;width:45%;border-radius:6px"></div></div>
      </div>
      <div style="display:flex;align-items:center;gap:14px;background:var(--putih);border-radius:var(--radius);padding:14px 18px;box-shadow:var(--shadow-sm)">
        <div class="skeleton" style="width:42px;height:42px;border-radius:10px;flex-shrink:0"></div>
        <div style="flex:1"><div class="skeleton" style="height:14px;width:55%;margin-bottom:8px;border-radius:6px"></div><div class="skeleton" style="height:10px;width:40%;border-radius:6px"></div></div>
      </div>
      <div style="display:flex;align-items:center;gap:14px;background:var(--putih);border-radius:var(--radius);padding:14px 18px;box-shadow:var(--shadow-sm)">
        <div class="skeleton" style="width:42px;height:42px;border-radius:10px;flex-shrink:0"></div>
        <div style="flex:1"><div class="skeleton" style="height:14px;width:65%;margin-bottom:8px;border-radius:6px"></div><div class="skeleton" style="height:10px;width:35%;border-radius:6px"></div></div>
      </div>
    </div>
  </div>

</div>

<div id="toastContainer"></div>

<!-- BRAND FOOTER -->
<div class="brand-footer">
  <span class="bf-icon-wrap">
    <span class="bf-ring-spin"></span>
    <span class="bf-particles-mini">
      <span class="bfp bfp-1"></span>
      <span class="bfp bfp-2"></span>
      <span class="bfp bfp-3"></span>
      <span class="bfp bfp-4"></span>
      <span class="bfp bfp-5"></span>
    </span>
    <img src="/favicon.png" alt="SAPA" />
  </span>
  <span>Sub Bagian Perencanaan</span>
  <span>Dinas Kesehatan, Pengendalian Penduduk dan Keluarga Berencana</span>
  <span>Kabupaten Banggai Laut</span>
  <span>© 2026 All rights reserved</span>
</div>

<script>
function esc(str) {
  return String(str||'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}
function toast(msg, type='success') {
  const c = document.getElementById('toastContainer');
  const t = document.createElement('div');
  t.className = 'toast ' + type;
  t.textContent = msg;
  c.appendChild(t);
  setTimeout(() => { t.style.animation='toastOut .3s ease forwards'; setTimeout(()=>t.remove(),300); }, 2500);
}

const _params = new URLSearchParams(location.search);
const _pathSlug = location.pathname.split('/').filter(Boolean)[0] || '';
const slug = _params.get('slug') || _pathSlug;

const _viaQr = _params.get('src') === 'qr';

if (!slug) {
  document.getElementById('headerContent').innerHTML = \`
    <div class="state-box">
      <div class="state-icon"><svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" fill="none" viewBox="0 0 24 24" stroke="var(--teks-muted)" stroke-width="1.5"><path stroke-linecap="round" stroke-linejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"/></svg></div>
      <h2>Bundle tidak ditemukan</h2>
      <p>Alamat bundle tidak valid.</p>
    </div>\`;
  document.getElementById('itemsContainer').innerHTML = '';
} else {
  loadBundle(slug);
}

function renderBundlePasswordPrompt(slug, wrong) {
  document.getElementById('headerContent').innerHTML = \`
    <div class="state-box">
      <div class="state-icon"><svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" fill="none" viewBox="0 0 24 24" stroke="#0284c7" stroke-width="1.5"><rect x="5" y="11" width="14" height="9" rx="2"/><path stroke-linecap="round" stroke-linejoin="round" d="M8 11V7a4 4 0 018 0v4"/></svg></div>
      <h2>Bundle Diproteksi</h2>
      <p>Masukkan password untuk membuka bundle ini.</p>
    </div>\`;
  document.getElementById('itemsContainer').innerHTML = \`
    <form id="bundlePwForm" style="max-width:320px;margin:0 auto;display:flex;flex-direction:column;gap:10px">
      \${wrong ? '<div style="color:#ef4444;font-size:.78rem">Password salah, coba lagi.</div>' : ''}
      <input type="password" id="bundlePwInput" placeholder="Password" required autofocus
        style="border:1.5px solid \${wrong ? '#fca5a5' : '#e2e8f0'};border-radius:10px;padding:11px 14px;font-size:.88rem;font-family:inherit;outline:none" />
      <button type="submit" style="background:#0f766e;color:#fff;border:none;border-radius:10px;padding:12px;font-size:.88rem;font-weight:600;font-family:inherit;cursor:pointer">Buka Bundle</button>
    </form>\`;
  const form = document.getElementById('bundlePwForm');
  form.addEventListener('submit', function (e) {
    e.preventDefault();
    const pw = document.getElementById('bundlePwInput').value;
    loadBundle(slug, pw);
  });
}

async function loadBundle(slug, pw) {
  try {
    const qs = new URLSearchParams();
    if (pw) qs.set('pw', pw);
    if (_viaQr) qs.set('src', 'qr');
    const qsStr = qs.toString();
    const r = await fetch(\`/api/bundles/\${slug}\${qsStr ? '?' + qsStr : ''}\`);
    if (r.status === 401) {
      const dj = await r.json().catch(() => ({}));
      renderBundlePasswordPrompt(slug, !!dj.wrong);
      return;
    }
    if (!r.ok) {
      const dj = await r.json().catch(() => ({}));
      const reason = dj.reason || (r.status === 403 ? 'inactive' : 'not_found');
      const isInactive = reason === 'inactive';
      const isExpired = reason === 'expired';
      document.getElementById('headerContent').innerHTML = \`
        <div class="state-box">
          <div class="state-icon">
            \${(isInactive || isExpired)
              ? \`<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" fill="none" viewBox="0 0 24 24" stroke="#f59e0b" stroke-width="1.5"><path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>\`
              : \`<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" fill="none" viewBox="0 0 24 24" stroke="var(--teks-muted)" stroke-width="1.5"><circle cx="11" cy="11" r="8"/><path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-4.35-4.35M11 8v3m0 3h.01"/></svg>\`
            }
          </div>
          <h2>\${isExpired ? 'Bundle Kedaluwarsa' : isInactive ? 'Bundle Tidak Tersedia' : 'Bundle Tidak Ditemukan'}</h2>
          <p>\${isExpired
            ? 'Bundle ini sudah melewati masa berlakunya dan tidak dapat diakses lagi.'
            : isInactive
            ? 'Bundle link ini sedang dinonaktifkan dan tidak dapat diakses saat ini.'
            : 'Link bundle mungkin sudah tidak aktif atau alamatnya salah.'
          }</p>
        </div>\`;
      document.getElementById('itemsContainer').innerHTML = '';
      return;
    }
    const { bundle, items } = await r.json();

    document.title = \`SAPA Perencanaan\`;

    document.getElementById('headerContent').innerHTML = \`
      <div class="bundle-brand-name">\${esc(bundle.judul)}</div>
      \${bundle.deskripsi ? \`<div class="bundle-brand-sub">\${esc(bundle.deskripsi)}</div>\` : ''}\`;

    if (!items.length) {
      document.getElementById('itemsContainer').innerHTML = \`
        <div class="state-box">
          <div class="state-icon"><svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" fill="none" viewBox="0 0 24 24" stroke="var(--teks-muted)" stroke-width="1.5"><path stroke-linecap="round" stroke-linejoin="round" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"/></svg></div>
          <h2>Bundle masih kosong</h2>
          <p>Belum ada link yang ditambahkan ke bundle ini.</p>
        </div>\`;
      return;
    }

    document.getElementById('itemsContainer').innerHTML = \`
      <div class="items-list">
        \${items.map((item, i) => \`
          <a class="item-card" href="\${esc(item.url)}" target="_blank" rel="noopener"
             style="animation-delay:\${i * 0.05}s">
            <div class="item-icon">\${item.ikon && item.ikon.includes('<svg') ? item.ikon : \`<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"/></svg>\`}</div>
            <div class="item-body">
              <div class="item-title">\${esc(item.judul)}</div>
              \${item.deskripsi ? \`<div class="item-desc">\${esc(item.deskripsi)}</div>\` : ''}
            </div>
            <div class="item-arrow"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7"/></svg></div>
          </a>\`).join('')}
      </div>\`;

  } catch (err) {
    console.error(err);
    document.getElementById('headerContent').innerHTML = \`
      <div class="state-box">
        <div class="state-icon"><svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" fill="none" viewBox="0 0 24 24" stroke="var(--teks-muted)" stroke-width="1.5"><path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg></div>
        <h2>Gagal memuat bundle</h2>
        <p>Terjadi kesalahan koneksi. Coba muat ulang halaman.</p>
      </div>\`;
    document.getElementById('itemsContainer').innerHTML = '';
  }
}
</script>
<script src="/js/theme-engine.js"></script>
</body>
</html>`;
}

function getStatusHtml({ icon, title, message }) {
  return `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>SAPA Perencanaan</title>
  <link rel="icon" type="image/png" href="/favicon.png" />
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
  <link rel="stylesheet" href="/css/styles.css" />
  <style>
    body { min-height: 100vh; display: flex; flex-direction: column; align-items: center; justify-content: center; background: linear-gradient(135deg,#f0fdfc 0%,#ccfbf1 50%,#99f6e4 100%); font-family: 'Plus Jakarta Sans', sans-serif; padding: 24px; }
    .card { background: #fff; border-radius: 20px; box-shadow: 0 8px 40px rgba(0,0,0,.10); padding: 48px 40px; max-width: 420px; width: 100%; text-align: center; }
    .icon-wrap { width: 72px; height: 72px; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 20px; }
    .icon-wrap.yellow { background: #fef9c3; }
    .icon-wrap.red    { background: #fee2e2; }
    h2 { font-size: 1.25rem; font-weight: 700; color: #0f172a; margin: 0 0 10px; }
    p  { font-size: .88rem; color: #64748b; margin: 0 0 28px; line-height: 1.6; }
    .logo-row { display: flex; align-items: center; justify-content: center; gap: 12px; margin-bottom: 20px; }
    .logo-row img { height: 36px; object-fit: contain; }
    .logo-divider { width: 1px; height: 28px; background: #e2e8f0; }
    .brand-footer { margin-top: 40px; display: flex; flex-direction: column; align-items: center; gap: 3px; font-size: .72rem; color: #94a3b8; text-align: center; }
    /* Logo brand-footer: animasi sama persis kayak di halaman bundle aktif
       (ring spin conic-gradient + partikel orbit berkedip + loop
       fade-in/scale/glow tiap 6 detik), biar konsisten di semua halaman
       publik -- sebelumnya cuma statis di sini. */
    .bf-icon-wrap {
      position: relative;
      display: inline-flex; align-items: center; justify-content: center;
      width: 32px; height: 32px;
      margin-bottom: 10px;
      animation: bfIconLoop 6s cubic-bezier(0.34,1.56,0.64,1) infinite;
    }
    .bf-icon-wrap img {
      width: 32px; height: 32px; object-fit: contain;
      position: relative; z-index: 2;
      margin-bottom: 0; opacity: 1;
    }
    .bf-ring-spin {
      position: absolute; inset: -6px;
      border-radius: 50%;
      background: conic-gradient(from 0deg, transparent 0%, rgba(20,184,166,.7) 14%, rgba(45,212,191,.9) 22%, transparent 34%, transparent 55%, rgba(13,148,136,.6) 68%, rgba(45,212,191,.8) 76%, transparent 88%);
      -webkit-mask: radial-gradient(farthest-side, transparent calc(100% - 2px), #000 calc(100% - 2px));
              mask: radial-gradient(farthest-side, transparent calc(100% - 2px), #000 calc(100% - 2px));
      animation: bfRingSpin 2.6s linear infinite;
      pointer-events: none;
      z-index: 0;
    }
    .bf-particles-mini { position: absolute; inset: -14px; pointer-events: none; z-index: 1; }
    .bfp {
      position: absolute; top: 50%; left: 50%;
      border-radius: 50%;
      transform-origin: 0 0;
      animation: bfOrbit linear infinite, bfTwinkle ease-in-out infinite;
    }
    .bfp-1 { --r: 17px; width: 1.5px; height: 1.5px; background: #2dd4bf; box-shadow: 0 0 3px 1px rgba(45,212,191,.8); animation-duration: 4.6s, 1.9s; animation-delay: -1.6s, -.4s; }
    .bfp-2 { --r: 22px; width: 2px;   height: 2px;   background: #0d9488; box-shadow: 0 0 3px 1px rgba(13,148,136,.7); animation-duration: 5.5s, 2.3s; animation-delay: -2.3s, -.6s; }
    .bfp-3 { --r: 14px; width: 1.5px; height: 1.5px; background: #fff; box-shadow: 0 0 3px 1px rgba(255,255,255,.85); animation-duration: 3.9s, 1.6s; animation-delay: -1.1s, -.3s; }
    .bfp-4 { --r: 25px; width: 1.5px; height: 1.5px; background: #5eead4; box-shadow: 0 0 3px 1px rgba(94,234,212,.7); animation-duration: 6.2s, 2.6s; animation-delay: -2.8s, -.7s; }
    .bfp-5 { --r: 19px; width: 2px;   height: 2px;   background: #14b8a6; box-shadow: 0 0 3px 1px rgba(20,184,166,.75); animation-duration: 4.9s, 2.1s; animation-delay: -1.9s, -.5s; }

    @keyframes bfRingSpin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
    @keyframes bfOrbit {
      from { transform: rotate(0deg)   translateX(var(--r, 20px)) rotate(0deg); }
      to   { transform: rotate(360deg) translateX(var(--r, 20px)) rotate(-360deg); }
    }
    @keyframes bfTwinkle {
      0%, 100% { opacity: .25; }
      50%      { opacity: 1; }
    }
    @keyframes bfIconLoop {
      0%   { opacity: 0; transform: scale(0.6); filter: drop-shadow(0 0 0px rgba(13,148,136,0)); }
      12%  { opacity: 1; transform: scale(1.12); filter: drop-shadow(0 4px 10px rgba(0,0,0,.15)) drop-shadow(0 0 12px rgba(13,148,136,.5)); }
      18%  { transform: scale(1); }
      50%  { filter: drop-shadow(0 2px 8px rgba(0,0,0,.12)) drop-shadow(0 0 8px rgba(13,148,136,.35)); }
      82%  { opacity: 1; transform: scale(1); }
      92%  { opacity: 0; transform: scale(0.75); }
      100% { opacity: 0; transform: scale(0.6); }
    }
  </style>
</head>
<body>
  <div class="card">
    <div class="logo-row">
      <img src="/logokemenkes.png" alt="Kemenkes" />
      <div class="logo-divider"></div>
      <img src="/logobkkbn.png" alt="BKKBN" />
      <div class="logo-divider"></div>
      <img src="/logobalut.png" alt="Banggai Laut" />
    </div>
    <div class="icon-wrap ${icon === 'not-found' ? 'red' : 'yellow'}">
      ${icon === 'not-found'
        ? `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" fill="none" viewBox="0 0 24 24" stroke="#ef4444" stroke-width="1.5"><path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-4.35-4.35M11 8v3m0 3h.01M11 3a8 8 0 100 16A8 8 0 0011 3z"/></svg>`
        : `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" fill="none" viewBox="0 0 24 24" stroke="#f59e0b" stroke-width="1.5"><path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>`
      }
    </div>
    <h2>${title}</h2>
    <p>${message}</p>
  </div>
  <div class="brand-footer">
    <span class="bf-icon-wrap">
      <span class="bf-ring-spin"></span>
      <span class="bf-particles-mini">
        <span class="bfp bfp-1"></span>
        <span class="bfp bfp-2"></span>
        <span class="bfp bfp-3"></span>
        <span class="bfp bfp-4"></span>
        <span class="bfp bfp-5"></span>
      </span>
      <img src="/favicon.png" alt="SAPA" />
    </span>
    <span>Sub Bagian Perencanaan</span>
    <span>Dinas Kesehatan, Pengendalian Penduduk dan Keluarga Berencana</span>
    <span>Kabupaten Banggai Laut</span>
    <span>© 2026 All rights reserved</span>
  </div>
</body>
</html>`;
}

function getPasswordPromptHtml({ slug, error, viaQr }) {
  return `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>SAPA Perencanaan</title>
  <link rel="icon" type="image/png" href="/favicon.png" />
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
  <link rel="stylesheet" href="/css/styles.css" />
  <style>
    body { min-height: 100vh; display: flex; flex-direction: column; align-items: center; justify-content: center; background: linear-gradient(135deg,#f0fdfc 0%,#ccfbf1 50%,#99f6e4 100%); font-family: 'Plus Jakarta Sans', sans-serif; padding: 24px; }
    .card { background: #fff; border-radius: 20px; box-shadow: 0 8px 40px rgba(0,0,0,.10); padding: 48px 40px; max-width: 380px; width: 100%; text-align: center; }
    .icon-wrap { width: 72px; height: 72px; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 20px; background: #e0f2fe; }
    h2 { font-size: 1.15rem; font-weight: 700; color: #0f172a; margin: 0 0 8px; }
    p  { font-size: .84rem; color: #64748b; margin: 0 0 24px; line-height: 1.6; }
    .logo-row { display: flex; align-items: center; justify-content: center; gap: 12px; margin-bottom: 20px; }
    .logo-row img { height: 36px; object-fit: contain; }
    .logo-divider { width: 1px; height: 28px; background: #e2e8f0; }
    form { display: flex; flex-direction: column; gap: 10px; }
    input[type=password] { border: 1.5px solid ${error ? '#fca5a5' : '#e2e8f0'}; border-radius: 10px; padding: 11px 14px; font-size: .88rem; font-family: inherit; outline: none; }
    input[type=password]:focus { border-color: #14b8a6; }
    .err-msg { color: #ef4444; font-size: .76rem; margin: -2px 0 2px; text-align: left; }
    button { background: #0f766e; color: #fff; border: none; border-radius: 10px; padding: 12px; font-size: .88rem; font-weight: 600; font-family: inherit; cursor: pointer; }
    button:hover { background: #0d5f58; }
    .brand-footer { margin-top: 32px; display: flex; flex-direction: column; align-items: center; gap: 3px; font-size: .72rem; color: #94a3b8; text-align: center; }
  </style>
</head>
<body>
  <div class="card">
    <div class="logo-row">
      <img src="/logokemenkes.png" alt="Kemenkes" />
      <div class="logo-divider"></div>
      <img src="/logobkkbn.png" alt="BKKBN" />
      <div class="logo-divider"></div>
      <img src="/logobalut.png" alt="Banggai Laut" />
    </div>
    <div class="icon-wrap">
      <svg xmlns="http://www.w3.org/2000/svg" width="30" height="30" fill="none" viewBox="0 0 24 24" stroke="#0284c7" stroke-width="1.7"><rect x="5" y="11" width="14" height="9" rx="2"/><path stroke-linecap="round" stroke-linejoin="round" d="M8 11V7a4 4 0 018 0v4"/></svg>
    </div>
    <h2>Tautan Diproteksi</h2>
    <p>Masukkan password untuk membuka tautan ini.</p>
    <form method="GET" action="/${escHtml(slug)}">
      ${error ? '<div class="err-msg">Password salah, coba lagi.</div>' : ''}
      ${viaQr ? '<input type="hidden" name="src" value="qr" />' : ''}
      <input type="password" name="pw" placeholder="Password" required autofocus />
      <button type="submit">Buka Tautan</button>
    </form>
  </div>
  <div class="brand-footer">
    <span>Sub Bagian Perencanaan</span>
    <span>Dinas Kesehatan, Pengendalian Penduduk dan Keluarga Berencana</span>
    <span>Kabupaten Banggai Laut</span>
    <span>© 2026 All rights reserved</span>
  </div>
</body>
</html>`;
}

const HTML_HEADERS = { 'Content-Type': 'text/html; charset=utf-8' };

export const handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return jsonResponse({});
  if (event.httpMethod !== 'GET') return errorResponse('Method not allowed', 405);

  const sql = getDb();

  const rawPath = event.path || '';
  const slug = rawPath
    .replace(/^\/.netlify\/functions\/redirect/, '')
    .replace(/^\//, '')
    .replace(/\/$/, '')
    .trim();

  if (!slug) {
    return { statusCode: 302, headers: { Location: '/' }, body: '' };
  }

  try {
    const bundles = await sql`
      SELECT id, aktif, expired_at FROM bundles WHERE slug = ${slug} LIMIT 1
    `;

    if (bundles.length) {
      if (!bundles[0].aktif) {
        return {
          statusCode: 200,
          headers: HTML_HEADERS,
          body: getStatusHtml({
            icon: 'inactive',
            title: 'Bundle Tidak Tersedia',
            message: 'Bundle link ini sedang dinonaktifkan dan tidak dapat diakses saat ini. Hubungi pengelola jika Anda membutuhkan akses.',
          }),
        };
      }

      if (bundles[0].expired_at && new Date(bundles[0].expired_at) < new Date()) {
        return {
          statusCode: 200,
          headers: HTML_HEADERS,
          body: getStatusHtml({
            icon: 'inactive',
            title: 'Bundle Kedaluwarsa',
            message: 'Bundle ini sudah melewati masa berlakunya dan tidak dapat diakses lagi. Hubungi pengelola jika Anda membutuhkan akses.',
          }),
        };
      }

      return {
        statusCode: 200,
        headers: HTML_HEADERS,
        body: getBundleHtml(),
      };
    }

    const links = await sql`
      SELECT id, url, aktif, expired_at, password_hash FROM links WHERE slug_pendek = ${slug} LIMIT 1
    `;

    if (links.length) {
      const link = links[0];
      if (!link.aktif) {
        return {
          statusCode: 200,
          headers: HTML_HEADERS,
          body: getStatusHtml({
            icon: 'inactive',
            title: 'Link Tidak Tersedia',
            message: 'Shortlink ini sedang dinonaktifkan dan tidak dapat diakses saat ini. Hubungi pengelola jika Anda membutuhkan akses.',
          }),
        };
      }

      if (link.expired_at && new Date(link.expired_at) < new Date()) {
        return {
          statusCode: 200,
          headers: HTML_HEADERS,
          body: getStatusHtml({
            icon: 'inactive',
            title: 'Tautan Kedaluwarsa',
            message: 'Tautan ini sudah melewati masa berlakunya dan tidak dapat diakses lagi. Hubungi pengelola jika Anda membutuhkan akses.',
          }),
        };
      }

      const qsAll = event.queryStringParameters || {};
      const viaQr = qsAll.src === 'qr';
      if (link.password_hash) {
        const pw = (qsAll.pw || '').trim();
        const pwHash = pw ? crypto.createHash('sha256').update(pw).digest('hex') : null;
        if (!pw || pwHash !== link.password_hash) {
          return {
            statusCode: 200,
            headers: HTML_HEADERS,
            body: getPasswordPromptHtml({ slug, error: !!pw, viaQr }),
          };
        }
      }

      const ip  = event.headers['x-forwarded-for']?.split(',')[0]?.trim() || '';
      const ua  = event.headers['user-agent'] || '';
      const ref = event.headers['referer'] || '';
      await sql`
        INSERT INTO klik_log (link_id, ip_address, user_agent, referer, via_qr)
        VALUES (${link.id}, ${ip}, ${ua}, ${ref}, ${viaQr})
      `;
      return {
        statusCode: 302,
        headers: { Location: link.url },
        body: '',
      };
    }

    return {
      statusCode: 404,
      headers: HTML_HEADERS,
      body: getStatusHtml({
        icon: 'not-found',
        title: 'Halaman Tidak Ditemukan',
        message: `Slug <strong>/${escHtml(slug)}</strong> tidak terdaftar di sistem SAPA. Periksa kembali alamat yang Anda gunakan.`,
      }),
    };

  } catch (err) {
    console.error('[redirect.js]', err);
    return errorResponse('Server error', 500);
  }
};