
(function () {
  'use strict';

  var CSS_ANIM = '' +
    '@keyframes sapaTemaFadeLoop{0%,100%{opacity:1}50%{opacity:.65}}' +
    '@keyframes sapaTemaFloatLoop{0%,100%{transform:translate(-50%,0)}50%{transform:translate(-50%,-8px)}}' +
    '@keyframes sapaTemaFloatLoopPlain{0%,100%{transform:translateY(0)}50%{transform:translateY(-8px)}}' +
    '@keyframes sapaTemaSwayLoop{0%,100%{transform:translate(-50%,0)}25%{transform:translate(calc(-50% + 6px),0)}75%{transform:translate(calc(-50% - 6px),0)}}' +
    '@keyframes sapaTemaSwayLoopPlain{0%,100%{transform:translateX(0)}25%{transform:translateX(6px)}75%{transform:translateX(-6px)}}' +
    '@keyframes sapaTemaBounceLoop{0%,100%{transform:translate(-50%,0)}30%{transform:translate(-50%,-8px)}50%{transform:translate(-50%,0)}65%{transform:translate(-50%,-3px)}80%{transform:translate(-50%,0)}}' +
    '@keyframes sapaTemaBounceLoopPlain{0%,100%{transform:translateY(0)}30%{transform:translateY(-8px)}50%{transform:translateY(0)}65%{transform:translateY(-3px)}80%{transform:translateY(0)}}' +
    '@keyframes sapaTemaPulse{0%,100%{filter:brightness(1) saturate(1);transform:translateX(-50%) scale(1)}50%{filter:brightness(1.1) saturate(1.12);transform:translateX(-50%) scale(1.018)}}' +
    '@keyframes sapaTemaPulsePlain{0%,100%{filter:brightness(1) saturate(1);transform:scale(1)}50%{filter:brightness(1.1) saturate(1.12);transform:scale(1.018)}}' +
    '@keyframes sapaTemaKibas{0%,100%{transform:translateX(-50%) rotate(0deg) skewX(0deg)}25%{transform:translateX(-50%) rotate(.5deg) skewX(1deg)}75%{transform:translateX(-50%) rotate(-.5deg) skewX(-1deg)}}' +
    '@keyframes sapaTemaKibasPlain{0%,100%{transform:rotate(0deg) skewX(0deg)}25%{transform:rotate(.5deg) skewX(1deg)}75%{transform:rotate(-.5deg) skewX(-1deg)}}' +
    '@keyframes sapaTemaKerlip{0%,100%{filter:brightness(1) saturate(1)}50%{filter:brightness(1.18) saturate(1.12)}}';

  function ensureAnimStyles() {
    if (document.getElementById('sapaTemaAnimStyles')) return;
    var st = document.createElement('style');
    st.id = 'sapaTemaAnimStyles';
    st.textContent = CSS_ANIM;
    document.head.appendChild(st);
  }

  function applyEfek(el, efek, centered) {
    if (!efek || efek === 'none') return;
    ensureAnimStyles();
    switch (efek) {
      case 'fade':
        el.style.animation = 'sapaTemaFadeLoop 3s ease-in-out infinite';
        break;
      case 'slide-turun':
        el.style.animation = (centered ? 'sapaTemaFloatLoop' : 'sapaTemaFloatLoopPlain') + ' 2.8s ease-in-out infinite';
        break;
      case 'slide-samping':
        el.style.animation = (centered ? 'sapaTemaSwayLoop' : 'sapaTemaSwayLoopPlain') + ' 3.4s ease-in-out infinite';
        break;
      case 'bounce':
        el.style.animation = (centered ? 'sapaTemaBounceLoop' : 'sapaTemaBounceLoopPlain') + ' 2.4s ease-in-out infinite';
        break;
      case 'pulse':
        el.style.animation = (centered ? 'sapaTemaPulse' : 'sapaTemaPulsePlain') + ' 2.6s ease-in-out infinite';
        break;
      case 'kibas':
        el.style.animation = (centered ? 'sapaTemaKibas' : 'sapaTemaKibasPlain') + ' 2.8s ease-in-out infinite';
        el.style.transformOrigin = 'center';
        break;
      case 'kerlip':
        el.style.animation = 'sapaTemaKerlip 2.2s ease-in-out infinite';
        break;
    }
  }

  var PARTIKEL_CONFIG = {
    'konfeti-merah-putih': { arah: 'jatuh', tipe: 'confetti', warna: ['#e11d2e', '#ffffff', '#e11d2e'] },
    'kembang-api': { arah: 'burst', tipe: 'emoji', isi: ['🎆', '🎇', '✨'] },
    'balon': { arah: 'naik', tipe: 'emoji', isi: ['🎈'] },
    'pita-bendera': { arah: 'jatuh', tipe: 'rect', warna: ['#e11d2e', '#ffffff'], sempit: true },
    'lentera': { arah: 'naik', tipe: 'emoji', isi: ['🏮'] },
    'kerlip-bintang': { arah: 'ambang', tipe: 'emoji', isi: ['✨', '⭐'] },
    'ketupat': { arah: 'jatuh', tipe: 'ketupat', warna: ['#d9a441', '#c98a2e'] },
    'konfeti-hijau-emas': { arah: 'jatuh', tipe: 'confetti', warna: ['#16a34a', '#d4af37', '#ffffff'] },
    'bulan-bintang': { arah: 'ambang', tipe: 'emoji', isi: ['🌙', '⭐'] },
    'salju': { arah: 'jatuh', tipe: 'emoji', isi: ['❄️'] },
    'lonceng-bintang': { arah: 'jatuh', tipe: 'emoji', isi: ['🔔', '⭐'] },
    'konfeti-emas-perak': { arah: 'jatuh', tipe: 'confetti', warna: ['#d4af37', '#c0c0c0', '#ffffff'] },
    'kelopak-kamboja': { arah: 'jatuh', tipe: 'petal', warna: ['#fff7ed', '#fecdd3'] },
    'asap-dupa': { arah: 'naik', tipe: 'wisp', warna: ['rgba(200,200,200,.35)'] },
    'kunang-kunang': { arah: 'ambang', tipe: 'dot', warna: ['#eab308'] },
    'riak-air': { arah: 'ambang', tipe: 'dot', warna: ['rgba(125,211,252,.5)'], besar: true },
    'lampion-terbang': { arah: 'naik', tipe: 'emoji', isi: ['🏮'] },
    'kelopak-teratai': { arah: 'jatuh', tipe: 'petal', warna: ['#fbcfe8', '#fff1f2'] },
    'cahaya-keemasan': { arah: 'ambang', tipe: 'dot', warna: ['#fbbf24'] },
    'konfeti-kuning-safron': { arah: 'jatuh', tipe: 'confetti', warna: ['#f59e0b', '#fbbf24', '#fde68a'] },
    'konfeti-merah-emas': { arah: 'jatuh', tipe: 'confetti', warna: ['#e11d2e', '#d4af37'] },
    'koin-angpao': { arah: 'jatuh', tipe: 'emoji', isi: ['🧧'] },
    'kelopak-sakura': { arah: 'jatuh', tipe: 'petal', warna: ['#fbcfe8', '#f9a8d4'] },
    'konfeti-pastel': { arah: 'jatuh', tipe: 'confetti', warna: ['#fbcfe8', '#bfdbfe', '#fef08a', '#bbf7d0'] },
    'kelopak-pastel': { arah: 'jatuh', tipe: 'petal', warna: ['#fbcfe8', '#bfdbfe', '#fef08a'] },
    'kupu-kupu': { arah: 'ambang', tipe: 'emoji', isi: ['🦋'] },
    'kerlip-generik': { arah: 'ambang', tipe: 'emoji', isi: ['✨'] },
    'konfeti-pelangi': { arah: 'jatuh', tipe: 'confetti', warna: ['#ef4444', '#f97316', '#eab308', '#22c55e', '#3b82f6', '#a855f7'] },
    'gelembung': { arah: 'naik', tipe: 'bubble', warna: ['rgba(255,255,255,.5)'] },
    'daun-jatuh': { arah: 'jatuh', tipe: 'emoji', isi: ['🍂', '🍁'] },
    'kelopak-bunga': { arah: 'jatuh', tipe: 'petal', warna: ['#fecdd3', '#fff7ed'] },
  };

  var CSS_PARTIKEL = '' +
    '@keyframes sapaPtkJatuh{0%{top:-15%;opacity:0;transform:rotate(0deg)}10%{opacity:1}88%{opacity:1}100%{top:125%;opacity:0;transform:rotate(380deg)}}' +
    '@keyframes sapaPtkNaik{0%{top:120%;opacity:0;transform:scale(.9)}10%{opacity:1}88%{opacity:1}100%{top:-20%;opacity:0;transform:scale(1.05)}}' +
    '@keyframes sapaPtkAmbang{0%,100%{opacity:.3;transform:scale(.92)}50%{opacity:.8;transform:scale(1.06)}}' +
    '@keyframes sapaPtkBurst{0%{opacity:0;transform:scale(.2)}18%{opacity:1;transform:scale(1)}40%{opacity:0;transform:scale(1.5)}100%{opacity:0;transform:scale(1.5)}}' +
    '@keyframes sapaPtkSway{0%,100%{margin-left:0}50%{margin-left:9px}}' +
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

  function makePartikelVisual(cfg) {
    var el = document.createElement('span');
    el.className = 'sapaPtkInner';
    var size = rand(10, 18);
    switch (cfg.tipe) {
      case 'emoji':
        el.textContent = pick(cfg.isi);
        el.style.cssText = 'font-size:' + size + 'px;line-height:1;filter:drop-shadow(0 1px 2px rgba(0,0,0,.15))';
        break;
      case 'rect':
        var w = cfg.sempit ? rand(4, 6) : rand(6, 10);
        var rrot = rand(0, 360);
        el.style.cssText = 'width:' + w + 'px;height:' + rand(8, 14) + 'px;background:' + pick(cfg.warna) + ';border-radius:1px;transform:rotate(' + rrot + 'deg)';
        break;
      case 'petal':
        var ps = rand(8, 14);
        var prot = rand(0, 360);
        el.style.cssText = 'width:' + ps + 'px;height:' + (ps * 0.7) + 'px;background:' + pick(cfg.warna) + ';border-radius:70% 30% 70% 30%;transform:rotate(' + prot + 'deg)';
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
      case 'ketupat':
        var ks = rand(9, 14);
        var kBase = pick(cfg.warna);
        el.style.cssText = 'width:' + ks + 'px;height:' + ks + 'px;transform:rotate(45deg);' +
          'border-radius:2px;background:' + kBase + ';' +
          'background-image:repeating-linear-gradient(45deg, rgba(255,255,255,.35) 0 1.5px, transparent 1.5px 4px), ' +
          'repeating-linear-gradient(-45deg, rgba(0,0,0,.18) 0 1.5px, transparent 1.5px 4px);' +
          'box-shadow:inset 0 0 1px rgba(0,0,0,.3);';
        break;
      case 'confetti':
        var ccolor = pick(cfg.warna);
        var crot = rand(0, 360);
        var croll = Math.random();
        if (croll < 0.4) {
          var cw = rand(6, 11);
          el.style.cssText = 'width:' + cw + 'px;height:' + cw + 'px;background:' + ccolor + ';border-radius:1px;transform:rotate(' + crot + 'deg)';
        } else if (croll < 0.72) {
          var cd = rand(5, 9);
          el.style.cssText = 'width:' + cd + 'px;height:' + cd + 'px;background:' + ccolor + ';border-radius:50%';
        } else {
          el.style.cssText = 'width:' + rand(3, 5) + 'px;height:' + rand(10, 16) + 'px;background:' + ccolor + ';border-radius:1px;transform:rotate(' + crot + 'deg)';
        }
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
      dur = cfg.arah === 'burst' ? rand(2.4, 4.2) : rand(2.2, 4.4);
      delay = -rand(0, dur);
      anim = cfg.arah === 'burst' ? 'sapaPtkBurst' : 'sapaPtkAmbang';
      outer.style.cssText = 'left:' + leftPct + '%;top:' + topPct + '%;animation:' + anim + ' ' + dur + 's ease-in-out infinite;animation-delay:' + delay + 's';
      outer.appendChild(makePartikelVisual(cfg));
    } else {
      var travelPx = (containerH || 240) * 1.4;
      var speedPxPerSec = rand(12, 24);
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

    var count = densitas === 'rendah' ? 5 : densitas === 'tinggi' ? 14 : 9;
    for (var i = 0; i < count; i++) layer.appendChild(makePartikelEl(cfg, containerH));
    container.appendChild(layer);
  }

  function init() {
    // Render cache dulu SINKRON kalau ada (instan, gak nunggu network -
    // biar gak ada jeda "halaman polos dulu baru tema muncul"). Begitu
    // fetch fresh (no-store, selalu akurat) selesai, cuma REPLACE kalau
    // hasilnya beda dari yang udah kepasang (beda id tema, atau salah
    // satunya null) - biar gak ada re-render/flicker yang gak perlu
    // kalau ternyata cache-nya udah sesuai sama data terbaru.
    var cachedData  = window.__sapaTemaCache || null;
    var cachedTheme = cachedData && cachedData.theme;
    var cachedId    = cachedTheme ? cachedTheme.id : null;
    if (cachedTheme) applyTheme(cachedTheme);

    var pre = window.__sapaTemaPromise;
    var p = (pre && typeof pre.then === 'function')
      ? pre
      : fetch('/api/landing/tema-aktif?_=' + Date.now(), { cache: 'no-store' })
          .then(function (r) { return r.ok ? r.json() : { theme: null }; });

    p.then(function (d) {
      var freshTheme = d && d.theme;
      var freshId = freshTheme ? freshTheme.id : null;
      if (freshId === cachedId) return; // sama persis, gak perlu re-render
      removeActiveVisuals();
      applyTheme(freshTheme);
    }).catch(function (e) {
        console.warn('[theme-engine] gagal load/terapkan tema:', e);
      });
  }

  function removeActiveVisuals() {
    var banner = document.getElementById('temaMusimanBanner');
    if (banner) banner.remove();

    var layers = document.querySelectorAll('.sapaPartikelLayer');
    for (var i = 0; i < layers.length; i++) layers[i].remove();

    var panelLeft = document.getElementById('panelLeft');
    if (panelLeft) {
      panelLeft.classList.remove('has-tema-bg');
      panelLeft.style.backgroundImage = '';
      panelLeft.style.animation = '';
    }

    var panelRight = document.querySelector('#loginOverlay .panel-right');
    if (panelRight) {
      panelRight.classList.remove('has-tema-bg-mobile');
      panelRight.style.removeProperty('background-image');
      panelRight.style.removeProperty('background-size');
      panelRight.style.removeProperty('background-position');
      panelRight.style.removeProperty('background-repeat');
    }
  }

  function refreshTema() {
    removeActiveVisuals();
    fetch('/api/landing/tema-aktif?_=' + Date.now(), { cache: 'no-store' })
      .then(function (r) { return r.ok ? r.json() : { theme: null }; })
      .then(function (d) { applyTheme(d && d.theme); })
      .catch(function (e) {
        console.warn('[theme-engine] gagal refresh tema:', e);
      });
  }

  // Dipanggil dari halaman admin (tema_musiman_frontend.js) tiap kali
  // tema ditambah/diubah/dihapus/toggle, biar topbar/banner langsung
  // sinkron tanpa perlu reload halaman.
  window.sapaTemaRefresh = refreshTema;

  // ── Preview modal admin ──────────────────────────────────────────
  // Versi ringan dari renderPill/renderBannerAtas/renderRibbonPojok/
  // renderLoginPanelTheme, tapi digambar position:absolute di dalam
  // container preview (bukan position:fixed ke document.body) dan
  // tanpa tombol close/dismiss. Efek animasi & partikel dipakai ulang
  // apa adanya dari applyEfek()/applyPartikel() biar preview 1:1 sama
  // kayak tampilan asli.
  function buildPreviewBar(theme, posisi) {
    var isBanner = posisi === 'banner-atas';
    var isRibbon = posisi === 'ribbon-pojok';
    var isBottom = posisi === 'pill-bawah';

    var bar = document.createElement('div');
    bar.style.cssText = [
      'position:absolute',
      isBanner ? 'left:0;right:0' : (isRibbon ? 'right:8px' : 'left:50%'),
      isBottom ? 'bottom:8px' : 'top:8px',
      (!isBanner && !isRibbon) ? 'transform:translateX(-50%)' : '',
      'display:flex', 'align-items:center', 'gap:8px', 'max-width:85%',
      'background:#0f172a', 'color:#fff',
      isBanner ? 'border-radius:0' : (isRibbon ? 'border-radius:10px' : 'border-radius:999px'),
      'box-shadow:0 6px 16px rgba(0,0,0,.28)',
      isBanner ? 'padding:6px 14px' : 'padding:5px 12px 5px 5px',
      'font-family:inherit', 'font-size:11px', 'z-index:2',
    ].join(';');

    if (theme.gambar_url) {
      var img = document.createElement('img');
      img.src = theme.gambar_url;
      img.alt = '';
      img.style.cssText = 'width:24px;height:24px;border-radius:50%;object-fit:cover;flex-shrink:0';
      bar.appendChild(img);
    }

    if (theme.nama) {
      var label = document.createElement('span');
      label.textContent = theme.nama;
      label.style.cssText = 'font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis';
      bar.appendChild(label);
    }

    return bar;
  }

  function clearPreview(container) {
    if (!container) return;
    container.innerHTML = '';
    container.style.backgroundImage = '';
  }

  function renderPreviewInto(container, theme) {
    clearPreview(container);
    if (!container || !theme) return;

    var cs = window.getComputedStyle(container);
    if (cs.position === 'static') container.style.position = 'relative';

    var posisi = theme.posisi || 'pill-atas';

    if (posisi === 'panel-login-saja') {
      if (theme.gambar_url) {
        container.style.backgroundImage = "url('" + theme.gambar_url + "')";
        container.style.backgroundSize = 'cover';
        container.style.backgroundPosition = 'center';
        applyEfek(container, theme.efek, false);
      }
    } else if (theme.gambar_url || theme.nama) {
      var bar = buildPreviewBar(theme, posisi);
      container.appendChild(bar);
      applyEfek(bar, theme.efek, posisi !== 'banner-atas' && posisi !== 'ribbon-pojok');
    }

    applyPartikel(container, theme.partikel, theme.partikel_densitas);
  }

  window.SapaTemaPreview = { render: renderPreviewInto, clear: clearPreview };

  function renderTopbarPartikel(theme) {
    var topbar = document.getElementById('topbar');
    if (!topbar) return;
    applyPartikel(topbar, theme.partikel, theme.partikel_densitas);
  }

  function applyTheme(theme) {
    if (!theme || !theme.id) return;

    renderTopbarPartikel(theme);

    var panelLeft = document.getElementById('panelLeft');
    if (panelLeft) {
      if (isPanelVisible(panelLeft)) {
        renderLoginPanelTheme(theme, panelLeft);
      } else {
        renderLoginMobileBackground(theme);
      }
      return;
    }

    if (window.SAPA_TEMA_PARTIKEL_ONLY) return;
    if (theme.posisi === 'panel-login-saja') return;

    var dismissKey = 'sapaTemaDismissed_' + theme.id;
    var dismissed = false;
    try { dismissed = sessionStorage.getItem(dismissKey) === '1'; } catch (e) {}

    if (theme.gambar_url && !dismissed) renderTheme(theme);
  }

  function isPanelVisible(el) {
    if (!el.offsetParent && el.offsetWidth === 0 && el.offsetHeight === 0) return false;
    try {
      var cs = window.getComputedStyle(el);
      if (cs.display === 'none' || cs.visibility === 'hidden') return false;
    } catch (e) {}
    return true;
  }

  function renderLoginPanelTheme(theme, panelLeft) {
    if (theme.gambar_url) {
      panelLeft.style.backgroundImage = "url('" + theme.gambar_url + "')";
      panelLeft.classList.add('has-tema-bg');
      applyEfek(panelLeft, theme.efek, false);
      applyPartikel(panelLeft, theme.partikel, theme.partikel_densitas);
    }
  }

  function renderLoginMobileBackground(theme) {
    if (!theme.gambar_url) return;
    var panelRight = document.querySelector('#loginOverlay .panel-right');
    if (!panelRight) return;
    var img = theme.gambar_url.replace(/'/g, "\\'");
    var bgValue =
      'linear-gradient(180deg, rgba(4,15,14,.32) 0%, rgba(4,15,14,.45) 55%, rgba(4,15,14,.6) 100%), ' +
      "url('" + img + "')";
    panelRight.style.setProperty('background-image', bgValue, 'important');
    panelRight.style.setProperty('background-size', 'cover', 'important');
    panelRight.style.setProperty('background-position', 'center', 'important');
    panelRight.style.setProperty('background-repeat', 'no-repeat', 'important');
    panelRight.classList.add('has-tema-bg-mobile');
    applyPartikel(panelRight, theme.partikel, theme.partikel_densitas);
  }

  function renderTheme(theme) {
    var posisi = theme.posisi || 'pill-atas';
    if (posisi === 'banner-atas') return renderBannerAtas(theme);
    if (posisi === 'ribbon-pojok') return renderRibbonPojok(theme);
    if (posisi === 'pill-bawah') return renderPill(theme, false);
    return renderPill(theme, true);
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
