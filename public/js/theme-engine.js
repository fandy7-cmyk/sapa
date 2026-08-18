// public/js/theme-engine.js
// Engine tema musiman SAPA (mis. Ramadhan, HUT RI, dll).
// Dipasang di landing.html (publik, sebelum login) DAN app.html (setelah
// login) - keduanya cukup include script ini, gak perlu setup apa-apa lagi.
//
// Cara kerja:
//   1. Fetch GET /api/landing/tema-aktif (endpoint publik, tanpa auth).
//   2. Kalau ada tema aktif hari ini:
//      - Di app.html (ada panel kiri halaman login, DAN kelihatan - layar
//        lebar) → gambar tema jadi background panel kiri (menggantikan
//        gradient hijau default), animasi (`efek`) diterapkan langsung
//        ke panel itu — gak ada banner/pill teks tambahan.
//      - Di app.html mobile (panel kiri disembunyikan CSS, layar ≤640px)
//        → gambar tema jadi background panel KANAN (form login, satu-
//        satunya panel yang kelihatan di mobile) - overlay terang biar
//        teks gelapnya tetap kebaca.
//      - Di halaman lain (landing.html, atau app.html setelah login
//        dimana panel kiri gak kelihatan lagi) → tampil sesuai `posisi`
//        yang diatur admin (pill mengambang, banner penuh, ribbon pojok),
//        kecuali posisi = 'panel-login-saja' → gak ada elemen tambahan
//        sama sekali di halaman ini.
//      - Animasi diatur lewat `efek` (fade, slide, bounce, pulse, kibas,
//        kerlip) - SEMUANYA loop terus-menerus selama tema aktif, bukan
//        cuma sekali muncul (lihat CSS_ANIM di bawah).
//   3. Admin atur tema (gambar, tanggal mulai/selesai, posisi, efek) lewat
//      halaman admin "Tema Musiman" → tersimpan di tabel settings, dibaca
//      ulang tiap kali halaman ini dimuat.
//
// Pill/banner (kalau dipakai) bisa ditutup sementara oleh pengunjung
// (tersimpan di sessionStorage per id tema, muncul lagi kalau buka tab
// baru).

(function () {
  'use strict';

  var CSS_ANIM = '' +
    '@keyframes sapaTemaFadeLoop{0%,100%{opacity:1}50%{opacity:.55}}' +
    '@keyframes sapaTemaFloatLoop{0%,100%{transform:translate(-50%,0)}50%{transform:translate(-50%,-8px)}}' +
    '@keyframes sapaTemaFloatLoopPlain{0%,100%{transform:translateY(0)}50%{transform:translateY(-8px)}}' +
    '@keyframes sapaTemaSwayLoop{0%,100%{transform:translate(-50%,0)}25%{transform:translate(calc(-50% + 6px),0)}75%{transform:translate(calc(-50% - 6px),0)}}' +
    '@keyframes sapaTemaSwayLoopPlain{0%,100%{transform:translateX(0)}25%{transform:translateX(6px)}75%{transform:translateX(-6px)}}' +
    '@keyframes sapaTemaBounceLoop{0%,100%{transform:translate(-50%,0)}30%{transform:translate(-50%,-12px)}50%{transform:translate(-50%,0)}65%{transform:translate(-50%,-4px)}80%{transform:translate(-50%,0)}}' +
    '@keyframes sapaTemaBounceLoopPlain{0%,100%{transform:translateY(0)}30%{transform:translateY(-12px)}50%{transform:translateY(0)}65%{transform:translateY(-4px)}80%{transform:translateY(0)}}' +
    '@keyframes sapaTemaPulse{0%,100%{filter:brightness(1) saturate(1);transform:translateX(-50%) scale(1)}50%{filter:brightness(1.14) saturate(1.2);transform:translateX(-50%) scale(1.025)}}' +
    '@keyframes sapaTemaPulsePlain{0%,100%{filter:brightness(1) saturate(1);transform:scale(1)}50%{filter:brightness(1.14) saturate(1.2);transform:scale(1.025)}}' +
    '@keyframes sapaTemaKibas{0%,100%{transform:translateX(-50%) rotate(0deg) skewX(0deg)}25%{transform:translateX(-50%) rotate(.6deg) skewX(1.2deg)}75%{transform:translateX(-50%) rotate(-.6deg) skewX(-1.2deg)}}' +
    '@keyframes sapaTemaKibasPlain{0%,100%{transform:rotate(0deg) skewX(0deg)}25%{transform:rotate(.6deg) skewX(1.2deg)}75%{transform:rotate(-.6deg) skewX(-1.2deg)}}' +
    '@keyframes sapaTemaKerlip{0%,100%{filter:brightness(1) saturate(1)}50%{filter:brightness(1.35) saturate(1.25)}}';

  function ensureAnimStyles() {
    if (document.getElementById('sapaTemaAnimStyles')) return;
    var st = document.createElement('style');
    st.id = 'sapaTemaAnimStyles';
    st.textContent = CSS_ANIM;
    document.head.appendChild(st);
  }

  // Terapkan animasi ke elemen - SEMUA animasi loop terus-menerus (biar
  // "hidup", gak cuma nongol sekali terus diem). `centered` = true kalau
  // elemen dipusatkan pakai translateX(-50%) (pill atas/bawah), supaya
  // animasi gak menghapus transform posisinya.
  function applyEfek(el, efek, centered) {
    if (!efek || efek === 'none') return;
    ensureAnimStyles();
    switch (efek) {
      case 'fade':
        el.style.animation = 'sapaTemaFadeLoop 2.4s ease-in-out infinite';
        break;
      case 'slide-turun':
        el.style.animation = (centered ? 'sapaTemaFloatLoop' : 'sapaTemaFloatLoopPlain') + ' 2.6s ease-in-out infinite';
        break;
      case 'slide-samping':
        el.style.animation = (centered ? 'sapaTemaSwayLoop' : 'sapaTemaSwayLoopPlain') + ' 3s ease-in-out infinite';
        break;
      case 'bounce':
        el.style.animation = (centered ? 'sapaTemaBounceLoop' : 'sapaTemaBounceLoopPlain') + ' 1.8s ease-in-out infinite';
        break;
      case 'pulse':
        el.style.animation = (centered ? 'sapaTemaPulse' : 'sapaTemaPulsePlain') + ' 2.2s ease-in-out infinite';
        break;
      case 'kibas':
        el.style.animation = (centered ? 'sapaTemaKibas' : 'sapaTemaKibasPlain') + ' 2.4s ease-in-out infinite';
        el.style.transformOrigin = 'center';
        break;
      case 'kerlip':
        el.style.animation = 'sapaTemaKerlip 1.6s ease-in-out infinite';
        break;
    }
  }

  // ── Efek Partikel ────────────────────────────────────────────────
  // Beda sama `efek` (animasi) di atas: `efek` gerakin PANEL/GAMBAR itu
  // sendiri, partikel ini nambahin lapisan hiasan kecil (konfeti, kembang
  // api, kelopak, dll) yang MENGAMBANG DI ATAS gambar, independen dari
  // animasi gambar - dua-duanya bisa jalan bareng atau salah satu aja.
  //
  // Tiap preset udah bundle bentuk+warna+arah gerak jadi satu, admin
  // tinggal pilih nama (mis. "Kembang Api") tanpa perlu atur detail.
  // arah: 'jatuh' (atas→bawah), 'naik' (bawah→atas), 'ambang' (diam di
  // tempat, kerlap-kerlip/berdenyut), 'burst' (muncul-membesar-hilang di
  // titik acak, buat kembang api).
  var PARTIKEL_CONFIG = {
    'konfeti-merah-putih': { arah: 'jatuh', tipe: 'rect', warna: ['#e11d2e', '#ffffff', '#e11d2e'] },
    'kembang-api': { arah: 'burst', tipe: 'emoji', isi: ['🎆', '🎇', '✨'] },
    'balon': { arah: 'naik', tipe: 'emoji', isi: ['🎈'] },
    'pita-bendera': { arah: 'jatuh', tipe: 'rect', warna: ['#e11d2e', '#ffffff'], sempit: true },
    'lentera': { arah: 'naik', tipe: 'emoji', isi: ['🏮'] },
    'kerlip-bintang': { arah: 'ambang', tipe: 'emoji', isi: ['✨', '⭐'] },
    'ketupat': { arah: 'jatuh', tipe: 'emoji', isi: ['🟨'] },
    'bulan-bintang': { arah: 'ambang', tipe: 'emoji', isi: ['🌙', '⭐'] },
    'salju': { arah: 'jatuh', tipe: 'emoji', isi: ['❄️'] },
    'lonceng-bintang': { arah: 'jatuh', tipe: 'emoji', isi: ['🔔', '⭐'] },
    'konfeti-emas-perak': { arah: 'jatuh', tipe: 'rect', warna: ['#d4af37', '#c0c0c0'] },
    'kelopak-kamboja': { arah: 'jatuh', tipe: 'petal', warna: ['#fff7ed', '#fecdd3'] },
    'asap-dupa': { arah: 'naik', tipe: 'wisp', warna: ['rgba(200,200,200,.35)'] },
    'kunang-kunang': { arah: 'ambang', tipe: 'dot', warna: ['#eab308'] },
    'riak-air': { arah: 'ambang', tipe: 'dot', warna: ['rgba(125,211,252,.5)'], besar: true },
    'lampion-terbang': { arah: 'naik', tipe: 'emoji', isi: ['🏮'] },
    'kelopak-teratai': { arah: 'jatuh', tipe: 'petal', warna: ['#fbcfe8', '#fff1f2'] },
    'cahaya-keemasan': { arah: 'ambang', tipe: 'dot', warna: ['#fbbf24'] },
    'konfeti-merah-emas': { arah: 'jatuh', tipe: 'rect', warna: ['#e11d2e', '#d4af37'] },
    'koin-angpao': { arah: 'jatuh', tipe: 'emoji', isi: ['🧧'] },
    'kelopak-sakura': { arah: 'jatuh', tipe: 'petal', warna: ['#fbcfe8', '#f9a8d4'] },
    'kelopak-pastel': { arah: 'jatuh', tipe: 'petal', warna: ['#fbcfe8', '#bfdbfe', '#fef08a'] },
    'kupu-kupu': { arah: 'ambang', tipe: 'emoji', isi: ['🦋'] },
    'kerlip-generik': { arah: 'ambang', tipe: 'emoji', isi: ['✨'] },
    'gelembung': { arah: 'naik', tipe: 'bubble', warna: ['rgba(255,255,255,.5)'] },
    'daun-jatuh': { arah: 'jatuh', tipe: 'emoji', isi: ['🍂', '🍁'] },
    'kelopak-bunga': { arah: 'jatuh', tipe: 'petal', warna: ['#fecdd3', '#fff7ed'] },
  };

  var CSS_PARTIKEL = '' +
    '@keyframes sapaPtkJatuh{0%{top:-15%;opacity:0;transform:rotate(0deg)}10%{opacity:1}88%{opacity:1}100%{top:125%;opacity:0;transform:rotate(220deg)}}' +
    '@keyframes sapaPtkNaik{0%{top:120%;opacity:0;transform:scale(.9)}10%{opacity:1}88%{opacity:1}100%{top:-20%;opacity:0;transform:scale(1.05)}}' +
    '@keyframes sapaPtkAmbang{0%,100%{opacity:.25;transform:scale(.85)}50%{opacity:1;transform:scale(1.15)}}' +
    '@keyframes sapaPtkBurst{0%{opacity:0;transform:scale(.2)}18%{opacity:1;transform:scale(1)}40%{opacity:0;transform:scale(1.5)}100%{opacity:0;transform:scale(1.5)}}' +
    '@keyframes sapaPtkSway{0%,100%{margin-left:0}50%{margin-left:14px}}' +
    '.sapaPtkOuter{position:absolute;top:0;will-change:transform,opacity}' +
    '.sapaPtkInner{display:block}';

  function ensurePartikelStyles() {
    if (document.getElementById('sapaPartikelStyles')) return;
    var st = document.createElement('style');
    st.id = 'sapaPartikelStyles';
    st.textContent = CSS_PARTIKEL;
    document.head.appendChild(st);
  }

  function prefersReducedMotion() {
    try { return window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches; }
    catch (e) { return false; }
  }

  function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
  function rand(min, max) { return min + Math.random() * (max - min); }

  // Isi visual satu partikel (emoji / div bentuk), tanpa animasi - animasi
  // dipasang di elemen pembungkusnya (outer/inner), biar gak tabrakan
  // sama transform lain (pola yang sama kayak `applyEfek` di atas).
  function makePartikelVisual(cfg) {
    var el = document.createElement('span');
    el.className = 'sapaPtkInner';
    var size = rand(14, 26);
    switch (cfg.tipe) {
      case 'emoji':
        el.textContent = pick(cfg.isi);
        el.style.cssText = 'font-size:' + size + 'px;line-height:1;filter:drop-shadow(0 1px 2px rgba(0,0,0,.15))';
        break;
      case 'rect':
        var w = cfg.sempit ? rand(4, 6) : rand(6, 10);
        el.style.cssText = 'width:' + w + 'px;height:' + rand(8, 14) + 'px;background:' + pick(cfg.warna) + ';border-radius:1px';
        break;
      case 'petal':
        var ps = rand(8, 14);
        el.style.cssText = 'width:' + ps + 'px;height:' + (ps * 0.7) + 'px;background:' + pick(cfg.warna) + ';border-radius:70% 30% 70% 30%';
        break;
      case 'dot':
        var ds = cfg.besar ? rand(10, 18) : rand(4, 8);
        el.style.cssText = 'width:' + ds + 'px;height:' + ds + 'px;border-radius:50%;background:' + pick(cfg.warna) + ';box-shadow:0 0 ' + (ds * 1.2) + 'px ' + pick(cfg.warna);
        break;
      case 'bubble':
        var bs = rand(8, 20);
        el.style.cssText = 'width:' + bs + 'px;height:' + bs + 'px;border-radius:50%;border:1px solid rgba(255,255,255,.7);background:' + pick(cfg.warna);
        break;
      case 'wisp':
        el.style.cssText = 'width:' + rand(6, 10) + 'px;height:' + rand(28, 44) + 'px;border-radius:50%;background:' + pick(cfg.warna) + ';filter:blur(3px)';
        break;
    }
    return el;
  }

  function makePartikelEl(cfg, containerH) {
    var outer = document.createElement('span');
    outer.className = 'sapaPtkOuter';
    var leftPct = rand(2, 92);
    var topPct = rand(5, 85);
    var dur, delay, anim;

    if (cfg.arah === 'ambang' || cfg.arah === 'burst') {
      dur = cfg.arah === 'burst' ? rand(2.4, 4.2) : rand(1.6, 3.2);
      delay = -rand(0, dur);
      anim = cfg.arah === 'burst' ? 'sapaPtkBurst' : 'sapaPtkAmbang';
      outer.style.cssText = 'left:' + leftPct + '%;top:' + topPct + '%;animation:' + anim + ' ' + dur + 's ease-in-out infinite;animation-delay:' + delay + 's';
      outer.appendChild(makePartikelVisual(cfg));
    } else {
      // Durasi jatuh/naik di-skalain dari TINGGI CONTAINER, bukan angka
      // fix - kalau dipatok fix (mis. 5-10s) bakal kelihatan natural di
      // panel login yang tinggi ratusan px, tapi di topbar yang cuma
      // ~55px jaraknya kependekan buat durasi segitu jadi kesannya
      // hampir gak gerak/kaku. Dengan nyasar ke kecepatan (px/detik) yang
      // konsisten, container pendek otomatis dapet durasi lebih cepat
      // biar tetap kerasa "jatuh", bukan diem.
      var travelPx = (containerH || 240) * 1.4;
      var speedPxPerSec = rand(16, 30);
      dur = Math.max(1.6, Math.min(travelPx / speedPxPerSec, 14));
      delay = -rand(0, dur);
      anim = cfg.arah === 'naik' ? 'sapaPtkNaik' : 'sapaPtkJatuh';
      outer.style.cssText = 'left:' + leftPct + '%;animation:' + anim + ' ' + dur + 's ease-in-out infinite;animation-delay:' + delay + 's';
      var inner = makePartikelVisual(cfg);
      inner.style.animation = 'sapaPtkSway ' + rand(2.2, 3.8) + 's ease-in-out infinite';
      inner.style.animationDelay = -rand(0, 3.8) + 's';
      outer.appendChild(inner);
    }
    return outer;
  }

  // Pasang lapisan partikel di atas `container` (panel login, bar pill/
  // banner/ribbon, topbar). Di-skip kalau kontainernya kekecilan (partikel
  // bakal keliatan norak di elemen mini kayak ribbon/pill) atau kalau OS
  // user minta reduced motion.
  // Ambang tinggi 48px: nyisihin pill/banner/ribbon (40-46px, sengaja gak
  // dikasih partikel karena kekecilan) tapi tetap loloskan topbar (55px).
  function applyPartikel(container, jenis, densitas) {
    if (!jenis || jenis === 'none' || !container) return;
    var cfg = PARTIKEL_CONFIG[jenis];
    if (!cfg) return;
    if (prefersReducedMotion()) return;
    var containerH = container.offsetHeight;
    if (containerH < 48 || container.offsetWidth < 60) return;

    ensurePartikelStyles();
    var cs = window.getComputedStyle(container);
    if (cs.position === 'static') container.style.position = 'relative';

    var layer = document.createElement('div');
    layer.className = 'sapaPartikelLayer';
    layer.style.cssText = 'position:absolute;inset:0;overflow:hidden;pointer-events:none;z-index:3;border-radius:inherit';

    var count = densitas === 'rendah' ? 7 : densitas === 'tinggi' ? 22 : 13;
    for (var i = 0; i < count; i++) layer.appendChild(makePartikelEl(cfg, containerH));
    container.appendChild(layer);
  }

  function init() {
    // app.html & landing.html udah mulai fetch tema ini SEDINI MUNGKIN di
    // <head> (lihat inline <script> paling atas), jauh sebelum script ini
    // sendiri sempat dimuat (dia ditaruh di akhir body, setelah 15+ script
    // lain). Pakai hasil prefetch itu kalau ada - biar gak fetch dobel dan
    // biar tema kelihatan lebih cepat (data udah/hampir siap saat sampai
    // sini). Fallback fetch langsung tetap ada buat halaman yang belum
    // sempat dikasih prefetch itu.
    var pre = window.__sapaTemaPromise;
    var p = (pre && typeof pre.then === 'function')
      ? pre
      : fetch('/api/landing/tema-aktif?_=' + Date.now(), { cache: 'no-store' })
          .then(function (r) { return r.ok ? r.json() : { theme: null }; });

    p.then(function (d) { applyTheme(d && d.theme); })
      .catch(function (e) {
        // Dulu diem-diam skip total (susah didebug kalau ada error beneran).
        // Sekarang tetap gak ganggu user, tapi errornya kelihatan di console.
        console.warn('[theme-engine] gagal load/terapkan tema:', e);
      });
  }

  // ── Topbar aplikasi (app.html setelah login) - dikasih lapisan partikel
  // aja, gambar background & efek gerak dibiarin default (topbar udah ada
  // logo, judul, profil, jangan sampe ketutupan). Dipanggil UNCONDITIONAL
  // di applyTheme, gak peduli `posisi` yang dipilih admin buat pill/
  // banner/ribbon - topbar selalu keliatan selama user login jadi tempat
  // paling pas buat aksen tema, beda dari pill/banner yang bisa ditutup.
  function renderTopbarPartikel(theme) {
    var topbar = document.getElementById('topbar');
    if (!topbar) return;
    // Sengaja gak dicek isPanelVisible(topbar) di sini: pas theme-engine
    // jalan pertama kali (page load), topbar biasanya masih
    // visibility:hidden (appShell) karena user belum login - tapi ukuran
    // elemennya tetep kehitung normal (visibility:hidden ≠ display:none).
    // Partikel yang dipasang sekarang bakal ikut kebawa "visible" pas
    // appShell-nya di-toggle visible setelah login (visibility itu
    // inherited), tanpa perlu re-run applyTheme lagi.
    applyPartikel(topbar, theme.partikel, theme.partikel_densitas);
  }

  function applyTheme(theme) {
    if (!theme || !theme.id) return;

    renderTopbarPartikel(theme);

    // Kalau ada panel login (app.html, panel kiri) → gambar tema jadi
    // background panel itu (menggantikan gradient hijau default), dan
    // animasi (`efek`) diterapkan LANGSUNG ke panel itu sendiri (bukan
    // banner teks terpisah - di halaman login gak ada banner tambahan
    // sama sekali, cukup panel gambarnya yang beranimasi).
    var panelLeft = document.getElementById('panelLeft');
    if (panelLeft) {
      if (isPanelVisible(panelLeft)) {
        renderLoginPanelTheme(theme, panelLeft);
      } else if (theme.posisi !== 'panel-login-saja') {
        // Panel ada tapi disembunyikan CSS (mobile ≤640px) → panel kiri
        // gak bisa jadi background, tapi panel KANAN (form login) itu
        // yang kelihatan di mobile - jadi gambar tema dipasang di situ,
        // sama prinsipnya kayak panel kiri di desktop (background), cuma
        // pindah sisi karena di mobile sisi kanan yang tampil.
        renderLoginMobileBackground(theme);
      }
      return;
    }

    // Halaman lain (gak ada panel login sama sekali, mis. landing.html
    // atau app.html setelah login) → tampil sesuai posisi yang diatur
    // admin (pill/banner/ribbon), kecuali 'panel-login-saja'.
    // Landing.html set `window.SAPA_TEMA_PARTIKEL_ONLY = true` sebelum
    // script ini dimuat - halaman itu cuma mau partikel di topbar
    // (udah dipasang di atas), gak mau pill/banner/ribbon ngambang.
    if (window.SAPA_TEMA_PARTIKEL_ONLY) return;
    if (theme.posisi === 'panel-login-saja') return;

    var dismissKey = 'sapaTemaDismissed_' + theme.id;
    var dismissed = false;
    try { dismissed = sessionStorage.getItem(dismissKey) === '1'; } catch (e) {}

    if (theme.gambar_url && !dismissed) renderTheme(theme);
  }

  // Cek apakah panel beneran kelihatan (bukan cuma ada di DOM) - CSS bisa
  // display:none di layar sempit (mobile login), walau elemennya tetap ada.
  function isPanelVisible(el) {
    if (!el.offsetParent && el.offsetWidth === 0 && el.offsetHeight === 0) return false;
    try {
      var cs = window.getComputedStyle(el);
      if (cs.display === 'none' || cs.visibility === 'hidden') return false;
    } catch (e) {}
    return true;
  }

  // ── Gambar tema jadi background panel kiri halaman login (app.html),
  // animasi diterapkan ke panel itu sendiri (bukan banner terpisah) ──
  function renderLoginPanelTheme(theme, panelLeft) {
    if (theme.gambar_url) {
      panelLeft.style.backgroundImage = "url('" + theme.gambar_url + "')";
      panelLeft.classList.add('has-tema-bg');
      applyEfek(panelLeft, theme.efek, false);
      applyPartikel(panelLeft, theme.partikel, theme.partikel_densitas);
    }
  }

  // ── Fallback mobile: panel kiri disembunyikan CSS (layar ≤640px), jadi
  // panel KANAN (form login, satu-satunya yang kelihatan di mobile) yang
  // dipasangin gambar tema sebagai background-nya - sama kayak perlakuan
  // panel kiri di desktop, cuma pindah sisi. Overlay-nya dibikin TERANG
  // (bukan gelap kayak panel kiri) karena teks di panel kanan warnanya
  // gelap (Selamat Datang, label field, dll) - butuh dasar terang biar
  // tetap kebaca, gambar temanya tetap kelihatan lewat transparansinya.
  // Pakai setProperty(...,'important') karena ada rule
  // `#loginOverlay .panel-right { background:#f8fafa !important }` yang
  // kalau gak dilawan pakai important juga bakal menang lawan inline style.
  function renderLoginMobileBackground(theme) {
    if (!theme.gambar_url) return;
    var panelRight = document.querySelector('#loginOverlay .panel-right');
    if (!panelRight) return;
    var img = theme.gambar_url.replace(/'/g, "\\'");
    var bgValue =
      'linear-gradient(180deg, rgba(255,255,255,.9) 0%, rgba(255,255,255,.8) 45%, rgba(255,255,255,.92) 100%), ' +
      "url('" + img + "')";
    panelRight.style.setProperty('background-image', bgValue, 'important');
    panelRight.style.setProperty('background-size', 'cover', 'important');
    panelRight.style.setProperty('background-position', 'center', 'important');
    panelRight.style.setProperty('background-repeat', 'no-repeat', 'important');
    applyPartikel(panelRight, theme.partikel, theme.partikel_densitas);
  }

  function renderTheme(theme) {
    var posisi = theme.posisi || 'pill-atas';
    if (posisi === 'banner-atas') return renderBannerAtas(theme);
    if (posisi === 'ribbon-pojok') return renderRibbonPojok(theme);
    if (posisi === 'pill-bawah') return renderPill(theme, false);
    return renderPill(theme, true); // default: pill-atas
  }

  function dismiss(theme, el) {
    try { sessionStorage.setItem('sapaTemaDismissed_' + theme.id, '1'); } catch (e) {}
    el.remove();
  }

  function makeCloseBtn(theme, el, extraCss) {
    var closeBtn = document.createElement('button');
    closeBtn.setAttribute('aria-label', 'Tutup');
    closeBtn.innerHTML = '&times;';
    closeBtn.style.cssText = [
      'position:absolute', 'width:22px', 'height:22px', 'border-radius:50%', 'border:none',
      'background:rgba(255,255,255,.15)', 'color:#fff', 'font-size:16px', 'line-height:1',
      'cursor:pointer', 'display:flex', 'align-items:center', 'justify-content:center',
    ].join(';') + ';' + (extraCss || '');
    closeBtn.onclick = function () { dismiss(theme, el); };
    return closeBtn;
  }

  // ── Posisi: pill mengambang (atas atau bawah) ───────────────────────
  function renderPill(theme, top) {
    var bar = document.createElement('div');
    bar.id = 'temaMusimanBanner';
    bar.setAttribute('role', 'banner');
    bar.style.cssText = [
      'position:fixed', top ? 'top:14px' : 'bottom:14px', 'left:50%', 'transform:translateX(-50%)',
      'max-width:min(92vw,420px)', 'display:flex', 'align-items:center', 'gap:10px',
      'background:#0f172a', 'color:#fff', 'border-radius:999px',
      'box-shadow:0 8px 24px rgba(0,0,0,.28)', 'padding:6px 40px 6px 6px',
      'font-family:inherit', 'font-size:13px', 'z-index:2147483000',
    ].join(';');

    if (theme.gambar_url) {
      var img = document.createElement('img');
      img.src = theme.gambar_url;
      img.alt = '';
      img.style.cssText = 'width:34px;height:34px;border-radius:50%;object-fit:cover;flex-shrink:0';
      bar.appendChild(img);
    }

    if (theme.nama) {
      var label = document.createElement('span');
      label.textContent = theme.nama;
      label.style.cssText = 'font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis';
      bar.appendChild(label);
    }

    bar.appendChild(makeCloseBtn(theme, bar, 'top:50%;right:6px;transform:translateY(-50%)'));
    document.body.appendChild(bar);
    applyEfek(bar, theme.efek, true);
    applyPartikel(bar, theme.partikel, theme.partikel_densitas);
  }

  // ── Posisi: banner penuh di atas layar ──────────────────────────────
  function renderBannerAtas(theme) {
    var bar = document.createElement('div');
    bar.id = 'temaMusimanBanner';
    bar.setAttribute('role', 'banner');
    bar.style.cssText = [
      'position:fixed', 'top:0', 'left:0', 'right:0', 'display:flex', 'align-items:center',
      'justify-content:center', 'gap:10px', 'background:#0f172a', 'color:#fff',
      'box-shadow:0 4px 16px rgba(0,0,0,.22)', 'padding:8px 40px', 'font-family:inherit',
      'font-size:13px', 'z-index:2147483000',
    ].join(';');

    if (theme.gambar_url) {
      var img = document.createElement('img');
      img.src = theme.gambar_url;
      img.alt = '';
      img.style.cssText = 'width:28px;height:28px;border-radius:50%;object-fit:cover;flex-shrink:0';
      bar.appendChild(img);
    }

    if (theme.nama) {
      var label = document.createElement('span');
      label.textContent = theme.nama;
      label.style.cssText = 'font-weight:600';
      bar.appendChild(label);
    }

    bar.appendChild(makeCloseBtn(theme, bar, 'top:50%;right:10px;transform:translateY(-50%)'));
    document.body.appendChild(bar);
    applyEfek(bar, theme.efek, false);
    applyPartikel(bar, theme.partikel, theme.partikel_densitas);
  }

  // ── Posisi: ribbon kecil di pojok kanan atas ────────────────────────
  function renderRibbonPojok(theme) {
    var bar = document.createElement('div');
    bar.id = 'temaMusimanBanner';
    bar.setAttribute('role', 'banner');
    bar.style.cssText = [
      'position:fixed', 'top:14px', 'right:14px', 'max-width:min(80vw,300px)',
      'display:flex', 'align-items:center', 'gap:8px', 'background:#0f172a', 'color:#fff',
      'border-radius:12px', 'box-shadow:0 8px 24px rgba(0,0,0,.28)', 'padding:6px 34px 6px 6px',
      'font-family:inherit', 'font-size:12px', 'z-index:2147483000',
    ].join(';');

    if (theme.gambar_url) {
      var img = document.createElement('img');
      img.src = theme.gambar_url;
      img.alt = '';
      img.style.cssText = 'width:28px;height:28px;border-radius:8px;object-fit:cover;flex-shrink:0';
      bar.appendChild(img);
    }

    if (theme.nama) {
      var label = document.createElement('span');
      label.textContent = theme.nama;
      label.style.cssText = 'font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis';
      bar.appendChild(label);
    }

    bar.appendChild(makeCloseBtn(theme, bar, 'top:50%;right:6px;transform:translateY(-50%)'));
    document.body.appendChild(bar);
    applyEfek(bar, theme.efek, false);
    applyPartikel(bar, theme.partikel, theme.partikel_densitas);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
