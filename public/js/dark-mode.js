/*
 * dark-mode.js - tema Terang / Gelap / Ikuti Sistem (SAPA)
 * Preferensi disimpan di localStorage 'sapa_theme' ('auto' | 'light' | 'dark' | 'system').
 * Default (belum pernah memilih) = 'auto': gelap otomatis pukul 18:00-06:00 WITA, terang di luar jam itu.
 * Pilihan manual user (Terang / Gelap / Sistem) selalu mengalahkan 'auto' sampai user memilih Otomatis lagi. Atribut data-theme di <html> selalu
 * berisi hasil akhir ('light' | 'dark'); data-theme-pref berisi pilihan user.
 * Skrip inline mini di <head> tiap halaman memasang atribut lebih awal (anti kedip);
 * file ini mengurus toggle, UI, sinkron antar tab, dan perubahan tema sistem.
 */
(function () {
  'use strict';
  var KEY = 'sapa_theme';
  var root = document.documentElement;
  var mq = window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)') : null;
  var switchTimer = null;
  var autoTimer = null;
  var WITA_MS = 8 * 3600 * 1000;   // WITA = UTC+8 (tidak bergantung zona waktu perangkat)
  var DAY_MS = 24 * 3600 * 1000;
  var NIGHT_START = 18, NIGHT_END = 6;  // gelap 18:00 - 05:59 WITA

  function isNightWita() {
    var h = new Date(Date.now() + WITA_MS).getUTCHours();
    return h >= NIGHT_START || h < NIGHT_END;
  }
  // Jadwalkan pengecekan ulang tepat di pergantian 06:00 / 18:00 WITA (hanya saat pilihan 'auto')
  function scheduleAuto() {
    clearTimeout(autoTimer);
    autoTimer = null;
    if (getPref() !== 'auto') return;
    var ms = (Date.now() + WITA_MS) % DAY_MS;
    var target = ms < NIGHT_END * 3600000 ? NIGHT_END * 3600000
               : ms < NIGHT_START * 3600000 ? NIGHT_START * 3600000
               : DAY_MS + NIGHT_END * 3600000;
    autoTimer = setTimeout(function () { apply(true); }, target - ms + 500);
  }

  function getPref() {
    try {
      var v = localStorage.getItem(KEY);
      if (v === 'dark' || v === 'light' || v === 'system' || v === 'auto') return v;
    } catch (e) {}
    return 'auto';
  }
  function resolve(pref) {
    if (pref === 'auto') return isNightWita() ? 'dark' : 'light';
    if (pref === 'system') return mq && mq.matches ? 'dark' : 'light';
    return pref;
  }
  function syncUI(pref, resolved) {
    var btn = document.getElementById('btnThemeToggle');
    if (btn) {
      var label = resolved === 'dark' ? 'Ganti ke tema terang' : 'Ganti ke tema gelap';
      btn.setAttribute('aria-label', label);
      btn.setAttribute('data-tip', label); // tooltip custom (bukan title bawaan browser)
      btn.setAttribute('aria-pressed', resolved === 'dark' ? 'true' : 'false');
    }
    var opts = document.querySelectorAll('[data-theme-opt]');
    for (var i = 0; i < opts.length; i++) {
      var on = opts[i].getAttribute('data-theme-opt') === pref;
      opts[i].classList.toggle('active', on);
      opts[i].setAttribute('aria-pressed', on ? 'true' : 'false');
    }
  }

  /* ───────────────────────────────────────────────────────────────────────
   * Adapter warna inline dinamis.
   * css/dark.css (hasil tools/gen-dark.js) hanya bisa menjangkau warna yang
   * tertulis literal. Warna yang dirakit JS saat render (mis. stat-card:
   * style="background:${bg}" dari palet pastel) baru ketahuan setelah masuk
   * DOM, jadi di mode gelap dipetakan di sini, memakai aturan peta yang sama
   * dengan generator. Nilai asli disimpan & dikembalikan saat balik ke Terang.
   * Lewati elemen dengan [data-no-dark] atau di dalam .share-qr-box.
   * ─────────────────────────────────────────────────────────────────────── */
  var SURF = [17, 24, 39];
  var FAM_BASE = { red: [239, 68, 68], amber: [245, 158, 11], green: [34, 197, 94], teal: [45, 212, 191], blue: [96, 165, 250], purple: [168, 85, 247] };
  var FAM_TEXT = { red: '#fca5a5', amber: '#fcd34d', green: '#6ee7b7', teal: '#2dd4bf', blue: '#93c5fd', purple: '#d8b4fe' };
  function lum(c) {
    var f = function (v) { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
    return 0.2126 * f(c.r) + 0.7152 * f(c.g) + 0.0722 * f(c.b);
  }
  function toHsl(c) {
    var r = c.r / 255, g = c.g / 255, b = c.b / 255, mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2, h = 0, s = 0;
    if (mx !== mn) {
      var d = mx - mn;
      s = l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn);
      if (mx === r) h = (g - b) / d + (g < b ? 6 : 0); else if (mx === g) h = (b - r) / d + 2; else h = (r - g) / d + 4;
      h *= 60;
    }
    return { h: h, s: s, l: l };
  }
  function hx(v) { v = Math.round(Math.max(0, Math.min(255, v))); return (v < 16 ? '0' : '') + v.toString(16); }
  function mixSurf(base, t) { return '#' + hx(SURF[0] * (1 - t) + base[0] * t) + hx(SURF[1] * (1 - t) + base[1] * t) + hx(SURF[2] * (1 - t) + base[2] * t); }
  function family(h) { if (h < 15 || h >= 345) return 'red'; if (h < 70) return 'amber'; if (h < 165) return 'green'; if (h < 200) return 'teal'; if (h < 262) return 'blue'; return 'purple'; }
  function isNeutral(c) {
    var C = (Math.max(c.r, c.g, c.b) - Math.min(c.r, c.g, c.b)) / 255;
    if (C < 0.04) return true;
    var h = toHsl(c).h;
    return C < 0.1 && h >= 195 && h <= 262;
  }
  function isWhiteish(c) { return c.r >= 250 && c.g >= 250 && c.b >= 250; }
  function mapBg(c) {
    if (c.a < 1) return (isWhiteish(c) && c.a >= 0.6) ? 'rgba(17,24,39,' + (+c.a.toFixed(2)) + ')' : null;
    var Y = lum(c), hs = toHsl(c);
    if (isNeutral(c)) {
      if (Y > 0.985) return '#111827'; if (Y > 0.93) return '#0e1624'; if (Y > 0.85) return '#1a2335';
      if (Y > 0.7) return '#243044'; if (Y > 0.5) return '#334155'; return null;
    }
    if (Y <= 0.6 || hs.l < 0.75) return null;
    return mixSurf(FAM_BASE[family(hs.h)], hs.l > 0.93 ? 0.1 : hs.l > 0.88 ? 0.16 : 0.22);
  }
  function mapText(c) {
    if (c.a < 1) return null;
    var Y = lum(c), hs = toHsl(c);
    if (Y > 0.5) return null;
    if (hs.s < 0.3 || Y < 0.06) {
      if (Y < 0.03) return '#e5e7eb'; if (Y < 0.06) return '#d5dce6'; if (Y < 0.12) return '#c0cad8'; return '#94a3b8';
    }
    return FAM_TEXT[family(hs.h)];
  }
  function mapBorder(c) {
    if (c.a < 1) return (isWhiteish(c) && c.a >= 0.6) ? 'rgba(17,24,39,' + (+c.a.toFixed(2)) + ')' : null;
    var Y = lum(c), hs = toHsl(c);
    if (isNeutral(c)) {
      if (Y > 0.985) return '#111827'; if (Y > 0.85) return '#1e293b'; if (Y > 0.7) return '#263244'; if (Y > 0.5) return '#334155'; return null;
    }
    if (Y <= 0.45) return null;
    return mixSurf(FAM_BASE[family(hs.h)], 0.35);
  }
  function mapFill(c) {
    if (c.a < 1 || isWhiteish(c)) return null;
    if (isNeutral(c) && lum(c) > 0.5) return mapBorder(c);
    return mapText(c);
  }
  function roleOf(prop) {
    if (/^--[\w-]*bg/.test(prop)) return mapBg; // custom property latar: --kc-bg, --iku-col-bg, ...
    if (prop === 'background-color' || prop === 'background-image') return mapBg;
    if (prop === 'color' || prop === 'caret-color' || prop === 'text-decoration-color') return mapText;
    if (prop === 'fill' || prop === 'stroke' || prop === 'stop-color') return mapFill;
    if (/^(border|outline)(-(top|right|bottom|left))?-color$/.test(prop) || prop === 'column-rule-color') return mapBorder;
    return null;
  }
  var RGB_RE = /rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*([\d.]+)\s*)?\)/g;
  var HEX_RE = /#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})\b/g;
  function hexToRgb(h) {
    if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
    return { r: parseInt(h.slice(0, 2), 16), g: parseInt(h.slice(2, 4), 16), b: parseInt(h.slice(4, 6), 16), a: 1 };
  }
  function mapValue(prop, val) {
    var fn = roleOf(prop);
    if (!fn || !val) return val;
    val = val.replace(RGB_RE, function (m, r, g, b, a) {
      return fn({ r: +r, g: +g, b: +b, a: a === undefined ? 1 : +a }) || m;
    });
    // custom property disimpan mentah (hex apa adanya), jadi hex juga perlu dipetakan
    if (prop.charAt(0) === '-') {
      val = val.replace(HEX_RE, function (m, h) { return fn(hexToRgb(h)) || m; });
    }
    return val;
  }
  function skipEl(el) {
    return !!(el.closest && el.closest('.share-qr-box, [data-no-dark]'));
  }
  function processEl(el) {
    if (el.nodeType !== 1 || !el.style || !el.style.length || skipEl(el)) return;
    var st = el.style, rec = el.__dm, props = [], i;
    for (i = 0; i < st.length; i++) props.push(st[i]);
    for (i = 0; i < props.length; i++) {
      var prop = props[i];
      if (!roleOf(prop)) continue;
      var cur = st.getPropertyValue(prop);
      if (!cur) continue;
      if (rec && rec[prop] && rec[prop].mapped === cur) continue; // hasil kita sendiri
      var nv = mapValue(prop, cur);
      if (nv === cur) { if (rec && rec[prop]) delete rec[prop]; continue; }
      var pri = st.getPropertyPriority(prop);
      if (!rec) rec = el.__dm = {};
      st.setProperty(prop, nv, 'important');
      rec[prop] = { orig: cur, pri: pri, mapped: st.getPropertyValue(prop) };
      el.setAttribute('data-dm', '1');
    }
  }
  function processTree(node) {
    if (!node) return;
    if (node.nodeType === 1) {
      processEl(node);
      var all = node.querySelectorAll('[style]');
      for (var i = 0; i < all.length; i++) processEl(all[i]);
    }
  }
  function restoreAll() {
    var els = document.querySelectorAll('[data-dm]');
    for (var i = 0; i < els.length; i++) {
      var el = els[i], rec = el.__dm;
      if (rec) {
        for (var p in rec) {
          if (el.style.getPropertyValue(p) === rec[p].mapped) el.style.setProperty(p, rec[p].orig, rec[p].pri);
        }
      }
      el.__dm = null;
      el.removeAttribute('data-dm');
    }
  }
  var mo = null, adapting = false;
  function onMutations(recs) {
    if (adapting) return;
    adapting = true;
    try {
      for (var i = 0; i < recs.length; i++) {
        var r = recs[i];
        if (r.type === 'attributes') processEl(r.target);
        else for (var j = 0; j < r.addedNodes.length; j++) processTree(r.addedNodes[j]);
      }
    } finally {
      if (mo) mo.takeRecords();
      adapting = false;
    }
  }
  function adapterSync(isDark) {
    if (!window.MutationObserver) return;
    if (isDark) {
      if (!mo) mo = new MutationObserver(onMutations);
      mo.disconnect();
      adapting = true;
      try { processTree(document.body); } finally { adapting = false; }
      mo.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['style'] });
    } else {
      if (mo) mo.disconnect();
      restoreAll();
    }
  }

  function apply(animate) {
    var pref = getPref();
    var resolved = resolve(pref);
    scheduleAuto();
    var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
    var changed = root.getAttribute('data-theme') !== resolved;
    function commit() {
      if (root.getAttribute('data-theme') !== resolved) root.setAttribute('data-theme', resolved);
      root.setAttribute('data-theme-pref', pref);
      syncUI(pref, resolved);
      if (document.body) adapterSync(resolved === 'dark');
      try { window.dispatchEvent(new CustomEvent('sapa-theme-change', { detail: { pref: pref, theme: resolved } })); } catch (e) {}
    }
    // Browser yang mendukung: crossfade snapshot halaman (dikerjakan GPU), jadi tidak ada
    // ribuan elemen yang bertransisi warna satu-satu (itu yang bikin terasa delay/patah-patah).
    // Tab sedang tersembunyi (timer 06:00/18:00 WITA, sinkron antar tab, perubahan tema sistem): browser
    // langsung membatalkan transisi dan promise-nya reject "Transition was aborted ... Document hidden"
    // (unhandled rejection yang ikut tercatat di Pemantauan Sistem). Tidak ada yang bisa dilihat di tab
    // tersembunyi, jadi lewati animasi dan terapkan tema langsung.
    var canAnimate = animate && changed && !reduce && !document.hidden;
    if (canAnimate && document.startViewTransition) {
      var vt = null;
      try { vt = document.startViewTransition(commit); } catch (e) { vt = null; }
      if (vt) {
        // Transisi bisa dibatalkan browser kapan saja (tab disembunyikan di tengah jalan, transisi baru
        // menimpa yang lama). Tema tetap terpasang lewat commit, jadi penolakan promise cukup diabaikan.
        var noop = function () {};
        if (vt.ready && vt.ready.catch) vt.ready.catch(noop);
        if (vt.finished && vt.finished.catch) vt.finished.catch(noop);
        if (vt.updateCallbackDone && vt.updateCallbackDone.catch) vt.updateCallbackDone.catch(noop);
        return;
      }
      commit();
      return;
    }
    // Fallback (browser lama): transisi warna per-elemen lewat class .theme-switching.
    if (canAnimate) {
      root.classList.add('theme-switching');
      clearTimeout(switchTimer);
      switchTimer = setTimeout(function () { root.classList.remove('theme-switching'); }, 350);
    }
    commit();
  }
  function set(pref) {
    if (pref !== 'dark' && pref !== 'light' && pref !== 'system' && pref !== 'auto') pref = 'auto';
    try { localStorage.setItem(KEY, pref); } catch (e) {}
    apply(true);
  }
  // klik tombol topbar: balik tema yang sedang tampil (jadi pilihan eksplisit)
  function toggle() { set(resolve(getPref()) === 'dark' ? 'light' : 'dark'); }

  window.SAPA_THEME = { get: getPref, set: set, toggle: toggle, resolved: function () { return resolve(getPref()); } };

  if (mq) {
    var onSys = function () { if (getPref() === 'system') apply(true); };
    if (mq.addEventListener) mq.addEventListener('change', onSys);
    else if (mq.addListener) mq.addListener(onSys);
  }
  // sinkron antar tab / jendela
  window.addEventListener('storage', function (e) { if (e.key === KEY) apply(true); });
  // timer bisa tertahan saat tab di background / perangkat tidur: cek ulang begitu tab aktif lagi
  document.addEventListener('visibilitychange', function () {
    if (!document.hidden && getPref() === 'auto') apply(true);
  });


  /* ───────────────────────────────────────────────────────────────────────
   * Tooltip custom ringan untuk halaman tanpa app.js (login, landing, bundle).
   * Memakai atribut data-tip yang sama dengan app (qtip di app.js), jadi tidak ada
   * lagi tooltip bawaan browser. Di app.html fungsi ini tidak aktif karena
   * app.js sudah memasang qtip sendiri.
   * ─────────────────────────────────────────────────────────────────────── */
  function bindLiteTip() {
    if (typeof window._bindQtips === 'function' || document.body._liteTipBound) return;
    document.body._liteTipBound = true;
    var tip = null, target = null, lastTouch = 0;
    function el() {
      if (tip) return tip;
      tip = document.createElement('div');
      tip.className = 'fab-tip';
      tip.setAttribute('role', 'tooltip');
      document.body.appendChild(tip);
      return tip;
    }
    function hide() { if (tip) tip.classList.remove('show'); target = null; }
    function place(t) {
      var b = el(), r = t.getBoundingClientRect(), br = b.getBoundingClientRect();
      var top = r.top - br.height - 8, dir = 'fab-tip-top';
      if (top < 4) { top = r.bottom + 8; dir = 'fab-tip-bottom'; }
      var left = Math.max(6, Math.min(r.left + r.width / 2 - br.width / 2, window.innerWidth - br.width - 6));
      b.classList.remove('fab-tip-top', 'fab-tip-bottom');
      b.classList.add(dir);
      b.style.left = left + 'px';
      b.style.top = top + 'px';
      b.style.setProperty('--fab-arrow-left', Math.max(10, Math.min(r.left + r.width / 2 - left, br.width - 10)) + 'px');
    }
    function show(t) {
      var b = el();
      b.textContent = t.getAttribute('data-tip');
      b.classList.add('show');
      target = t;
      place(t);
    }
    var isTouch = function () { return Date.now() - lastTouch < 800; };
    function tipTarget(e) { return e.target && e.target.closest ? e.target.closest('[data-tip]') : null; }
    document.body.addEventListener('mouseover', function (e) {
      if (isTouch()) return;
      var t = tipTarget(e);
      if (t && t.getAttribute('data-tip')) show(t);
    });
    document.body.addEventListener('mouseout', function (e) {
      var t = tipTarget(e);
      if (t && !t.contains(e.relatedTarget)) hide();
    });
    document.body.addEventListener('focusin', function (e) {
      var t = tipTarget(e);
      if (t && t.getAttribute('data-tip') && t.matches && t.matches(':focus-visible')) show(t);
    });
    document.body.addEventListener('focusout', hide);
    document.body.addEventListener('mousedown', function () { if (!isTouch()) hide(); }, true);
    document.body.addEventListener('touchstart', function (e) {
      lastTouch = Date.now();
      var t = tipTarget(e);
      if (!t || !t.getAttribute('data-tip')) { hide(); return; }
      if (tip && tip.classList.contains('show') && target === t) hide(); else show(t);
    }, { passive: true });
    document.body.addEventListener('click', function (e) {
      var t = tipTarget(e);
      if (!t || t.closest('button, a, [onclick], [role="button"]')) hide();
    }, true);
    window.addEventListener('scroll', hide, true);
    window.addEventListener('blur', hide);
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') hide(); });
  }

  function init() {
    var opts = document.querySelectorAll('[data-theme-opt]');
    for (var i = 0; i < opts.length; i++) {
      opts[i].addEventListener('click', function (ev) {
        ev.stopPropagation();
        set(this.getAttribute('data-theme-opt'));
      });
    }
    bindLiteTip();
    apply(false);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
