#!/usr/bin/env node
/*
 * gen-dark.js - generator css/dark.css (dark mode SAPA)
 *
 * Baca css/styles.css (+ inline style di app.html & js/*.js) -> hasilkan aturan
 * override `html[data-theme="dark"] ...` yang cuma mengubah properti warna.
 * Jalankan ulang tiap selesai ngubah styles.css / warna inline:
 *
 *     cd tools && npm i && node gen-dark.js
 *
 * Output: public/css/dark.css  (jangan diedit tangan; edit tools/dark-manual-*.css)
 */
const fs = require('fs');
const path = require('path');
const postcss = require('postcss');

const ROOT = path.join(__dirname, '..');
const PUB = path.join(ROOT, 'public');
const SCOPE = 'html[data-theme="dark"]';
const SURF = [17, 24, 39]; // #111827 permukaan kartu

// ───────────────────────── util warna ─────────────────────────
function parseHex(h) {
  h = h.slice(1);
  if (h.length === 3 || h.length === 4) h = h.split('').map(c => c + c).join('');
  if (h.length !== 6 && h.length !== 8) return null;
  const n = i => parseInt(h.slice(i, i + 2), 16);
  return { r: n(0), g: n(2), b: n(4), a: h.length === 8 ? n(6) / 255 : 1 };
}
function lum({ r, g, b }) {
  const f = v => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
}
function hsl({ r, g, b }) {
  r /= 255; g /= 255; b /= 255;
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2;
  let h = 0, s = 0;
  if (mx !== mn) {
    const d = mx - mn;
    s = l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn);
    if (mx === r) h = (g - b) / d + (g < b ? 6 : 0);
    else if (mx === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h *= 60;
  }
  return { h, s, l };
}
const hx = v => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, '0');
const toHex = (r, g, b) => '#' + hx(r) + hx(g) + hx(b);
const mix = (base, t) => toHex(SURF[0] * (1 - t) + base[0] * t, SURF[1] * (1 - t) + base[1] * t, SURF[2] * (1 - t) + base[2] * t);

// netral = abu murni, atau abu-kebiruan khas Tailwind slate (kroma kecil, hue biru)
function isNeutral(c) {
  const C = (Math.max(c.r, c.g, c.b) - Math.min(c.r, c.g, c.b)) / 255;
  if (C < 0.04) return true;
  const { h } = hsl(c);
  return C < 0.1 && h >= 195 && h <= 262;
}
function family(h) {
  if (h < 15 || h >= 345) return 'red';
  if (h < 70) return 'amber';
  if (h < 165) return 'green';
  if (h < 200) return 'teal';
  if (h < 262) return 'blue';
  return 'purple';
}
const FAM_BASE = { red: [239, 68, 68], amber: [245, 158, 11], green: [34, 197, 94], teal: [45, 212, 191], blue: [96, 165, 250], purple: [168, 85, 247] };
const FAM_TEXT = { red: '#fca5a5', amber: '#fcd34d', green: '#6ee7b7', teal: '#2dd4bf', blue: '#93c5fd', purple: '#d8b4fe' };

// ───────────────────────── mapper per peran ─────────────────────────
function bgMap(c) {
  if (c.a < 1) {
    if (c.r >= 250 && c.g >= 250 && c.b >= 250 && c.a >= 0.6) return `rgba(${SURF.join(',')},${+c.a.toFixed(2)})`;
    return null;
  }
  const Y = lum(c), { h, s, l } = hsl(c);
  if (isNeutral(c)) {
    if (Y > 0.985) return '#111827';
    if (Y > 0.93) return '#0e1624';
    if (Y > 0.85) return '#1a2335';
    if (Y > 0.7) return '#243044';
    if (Y > 0.5) return '#334155';
    return null;
  }
  if (Y <= 0.6 || l < 0.75) return null; // aksen cerah (5eead4, 4ade80) dibiarkan
  const t = l > 0.93 ? 0.1 : l > 0.88 ? 0.16 : 0.22;
  return mix(FAM_BASE[family(h)], t);
}
function textMap(c) {
  if (c.a < 1) return null;
  const Y = lum(c), { h, s } = hsl(c);
  if (Y > 0.5) return null;
  if (s < 0.3 || Y < 0.06) {
    if (Y < 0.03) return '#e5e7eb';
    if (Y < 0.06) return '#d5dce6';
    if (Y < 0.12) return '#c0cad8';
    return '#94a3b8';
  }
  return FAM_TEXT[family(h)];
}
function borderMap(c) {
  if (c.a < 1) {
    if (c.r >= 250 && c.g >= 250 && c.b >= 250 && c.a >= 0.6) return `rgba(${SURF.join(',')},${+c.a.toFixed(2)})`;
    return null;
  }
  const Y = lum(c), { h } = hsl(c);
  if (isNeutral(c)) {
    if (Y > 0.985) return '#111827';
    if (Y > 0.85) return '#1e293b';
    if (Y > 0.7) return '#263244';
    if (Y > 0.5) return '#334155';
    return null;
  }
  if (Y <= 0.45) return null;
  return mix(FAM_BASE[family(h)], 0.35);
}
function fillMap(c) {
  if (c.a < 1) return null;
  if (c.r > 250 && c.g > 250 && c.b > 250) return null; // putih tetap (ikon di atas warna)
  if (isNeutral(c) && lum(c) > 0.5) return borderMap(c);
  return textMap(c);
}

let DEFINED_VARS = new Set();
const SKIP_SEL = /(spark|sbpp|particle|bfp|twinkle|aurora|constellation)/i;
const MAPPERS = { bg: bgMap, text: textMap, border: borderMap, fill: fillMap };
const ROLE_VARS = {
  bg: { '--putih': '#111827' },
  border: { '--putih': '#111827' },
  text: { '--hijau': '#2dd4bf', '--aksen': '#2dd4bf', '--hijau-mid': '#2dd4bf', '--sukses': '#6ee7b7', '--cyan': '#2dd4bf', '--blue': '#2dd4bf', '--green': '#2dd4bf', '--merah': '#fca5a5', '--red': '#fca5a5', '--kuning': '#fcd34d' },
  fill: { '--hijau': '#2dd4bf', '--aksen': '#2dd4bf', '--hijau-mid': '#2dd4bf', '--sukses': '#6ee7b7', '--merah': '#fca5a5' },
};

let ACTIVE_RV = ROLE_VARS;
function withRoleVars(extra) {
  if (!extra) return ROLE_VARS;
  const o = {};
  for (const k of Object.keys(ROLE_VARS)) o[k] = Object.assign({}, ROLE_VARS[k], extra[k] || {});
  return o;
}

function roleOf(prop) {
  prop = prop.toLowerCase();
  if (/^--[\w-]*bg/.test(prop)) return 'bg'; // custom property latar, mis. --kc-bg, --tone-bg, --iku-col-bg
  if (prop === 'background' || prop === 'background-color' || prop === 'background-image') return 'bg';
  if (prop === 'color' || prop === 'caret-color' || prop === 'text-decoration-color' || prop === '-webkit-text-fill-color') return 'text';
  if (prop === 'fill' || prop === 'stroke' || prop === 'stop-color') return 'fill';
  if (prop === 'scrollbar-color' || prop === 'outline' || prop === 'outline-color' || prop === 'column-rule' || prop === 'column-rule-color' || /^border(-(top|right|bottom|left|block|inline)(-(start|end))?)?(-color)?$/.test(prop)) return 'border';
  return null;
}

const COLOR_RE = /#[0-9a-fA-F]{3,8}\b|rgba?\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*(?:,\s*[\d.]+\s*)?\)|\bwhite\b|var\(\s*--[\w-]+\s*(?:,[^)]*)?\)/g;

function mapToken(tok, role) {
  const map = MAPPERS[role];
  if (tok[0] === '#') {
    const c = parseHex(tok);
    return c ? (map(c) || tok) : tok;
  }
  if (tok.startsWith('rgb')) {
    const n = tok.match(/[\d.]+/g).map(Number);
    const c = { r: n[0], g: n[1], b: n[2], a: n.length > 3 ? n[3] : 1 };
    return map(c) || tok;
  }
  if (tok === 'white') return map({ r: 255, g: 255, b: 255, a: 1 }) || tok;
  if (tok.startsWith('var(')) {
    const m = tok.match(/^var\(\s*(--[\w-]+)\s*(?:,\s*([^)]*))?\)$/);
    if (!m) return tok;
    const rv = ACTIVE_RV[role] || {};
    if (rv[m[1]]) return rv[m[1]];
    if (m[2] && !DEFINED_VARS.has(m[1]) && /^#[0-9a-fA-F]{3,8}$/.test(m[2].trim())) {
      const mapped = mapToken(m[2].trim(), role);
      if (mapped !== m[2].trim()) return `var(${m[1]},${mapped})`;
    }
  }
  return tok;
}
function mapValue(prop, value) {
  const role = roleOf(prop);
  if (!role) return value;
  // url(...) jangan disentuh
  const parts = value.split(/(url\([^)]*\))/);
  return parts.map(p => (p.startsWith('url(') ? p : p.replace(COLOR_RE, m => mapToken(m, role)))).join('');
}

// ───────────────────────── CSS -> CSS gelap ─────────────────────────
const SKIP_AT = /^(keyframes|-webkit-keyframes|font-face|page|counter-style|property)$/i;

function scopeSel(sel) {
  sel = sel.trim();
  if (!sel) return null;
  if (/^(html|:root)\b/.test(sel)) return sel.replace(/^(html|:root)/, SCOPE);
  return `${SCOPE} ${sel}`;
}
function splitSelectors(sel) {
  // pecah by koma tingkat-atas (abaikan koma di dalam () / [])
  const out = []; let d = 0, cur = '';
  for (const ch of sel) {
    if (ch === '(' || ch === '[') d++;
    if (ch === ')' || ch === ']') d--;
    if (ch === ',' && d === 0) { out.push(cur); cur = ''; } else cur += ch;
  }
  if (cur.trim()) out.push(cur);
  return out;
}

function genFromCss(cssText, from, extraRV) {
  ACTIVE_RV = withRoleVars(extraRV);
  const root = postcss.parse(cssText, { from });
  DEFINED_VARS = new Set((cssText.match(/--[\w-]+(?=\s*:)/g) || []));
  const roleChanged = new Set(); // peran warna yg sudah pernah dipetakan
  let out = '';

  function walk(container, ctx) {
    let buf = '';
    container.each(node => {
      if (node.type === 'rule') {
        if (node.parent && node.parent.type === 'atrule' && SKIP_AT.test(node.parent.name)) return;
        const sels = splitSelectors(node.selector);
        const decls = [];
        if (sels.every(s => SKIP_SEL.test(s))) return;
        const isDecoPseudo = sels.every(s => /::?(before|after)\s*$|::-webkit-slider-thumb|::-moz-range-thumb/.test(s.trim()));
        // pasangan bg-teks: kalau bg-nya warna cerah yg TIDAK dipetakan (mis. #4ade80),
        // teks gelapnya dibiarkan supaya kontras tetap terjaga.
        let keepText = false;
        node.each(d => {
          if (d.type === 'decl' && /^background(-color)?$/i.test(d.prop) && /^#[0-9a-fA-F]{3,8}$/.test(d.value.trim())) {
            const c = parseHex(d.value.trim());
            if (c && c.a === 1 && !bgMap(c) && lum(c) > 0.3) keepText = true;
          }
        });
        node.each(d => {
          if (d.type !== 'decl') return;
          const prop = d.prop;
          if (!roleOf(prop)) return;
          if (keepText && prop.toLowerCase() === 'color') return;
          const orig = d.value;
          if (/radial-gradient/i.test(orig)) return;
          let nv = mapValue(prop, orig);
          // bulatan putih (knob/dot) tetap putih
          if (isDecoPseudo && roleOf(prop) === 'bg' && /^(#fff|#ffffff|white)$/i.test(orig.trim())) nv = orig;
          // Jaga urutan cascade: semua deklarasi warna ikut diberi awalan yang sama.
          // Begitu satu deklarasi peran ini (bg/teks/border/fill) pernah dipetakan, deklarasi
          // peran sama yang TIDAK berubah (mis. background:var(--hijau) yang menimpa
          // background:#fff dari aturan sebelumnya) ditegaskan ulang apa adanya.
          const role = roleOf(prop);
          if (nv !== orig) {
            decls.push(`${prop}:${nv}${d.important ? '!important' : ''}`);
            roleChanged.add(role);
          } else if (roleChanged.has(role)) {
            decls.push(`${prop}:${orig}${d.important ? '!important' : ''}`);
          }
        });
        if (!decls.length) return;
        const sel = sels.map(scopeSel).filter(Boolean).join(',');
        buf += `${sel}{${decls.join(';')}}\n`;
      } else if (node.type === 'atrule') {
        if (SKIP_AT.test(node.name)) return;
        if (node.name === 'media' && /\bprint\b/.test(node.params) && !/not\s+print/.test(node.params)) return; // cetak tetap terang
        if (!node.nodes) return;
        const inner = walk(node, ctx + '@' + node.name + node.params);
        if (inner) buf += `@${node.name} ${node.params}{\n${inner}}\n`;
      }
    });
    return buf;
  }
  out = walk(root, '');
  return out;
}

// ───────────────────────── inline style scanner ─────────────────────────
const INLINE_RE = /(?<![\w-])((?:background(?:-color)?|color|border(?:-(?:top|right|bottom|left))?(?:-color)?|outline|fill|stroke|stop-color))\s*:\s*([^;"'`{}\\]+)/g;
function genInline(files, extraRV) {
  ACTIVE_RV = withRoleVars(extraRV);
  const rules = new Map();
  for (const f of files) {
    const txt = fs.readFileSync(f, 'utf8');
    let m;
    INLINE_RE.lastIndex = 0;
    while ((m = INLINE_RE.exec(txt))) {
      const prop = m[1];
      let val = m[2].replace(/\s+$/, '');
      if (val.includes('${') || val.includes('\n') || val.length > 120) continue;
      if (!COLOR_RE.test(val)) { COLOR_RE.lastIndex = 0; continue; }
      COLOR_RE.lastIndex = 0;
      const nv = mapValue(prop, val);
      if (nv === val) continue;
      const needle = m[0].replace(/\s+$/, '');
      if (needle.includes('"')) continue;
      rules.set(needle, `${prop}:${nv}!important`);
    }
    // atribut SVG: fill="#xxx" stroke='#xxx'
    const ATTR = /\b(fill|stroke|stop-color)=["'](#[0-9a-fA-F]{3,8})["']/g;
    while ((m = ATTR.exec(txt))) {
      const nv = mapValue(m[1], m[2]);
      if (nv === m[2]) continue;
      rules.set('@attr:' + m[1] + '=' + m[2], `${m[1]}:${nv}`);
    }
  }
  let out = '';
  for (const [needle, decl] of rules) {
    if (needle.startsWith('@attr:')) {
      const [, a, v] = needle.match(/^@attr:([\w-]+)=(.*)$/);
      out += `${SCOPE} [${a}="${v}"]{${decl}}\n`;
    } else {
      out += `${SCOPE} [style*="${needle}"]{${decl}}\n`;
    }
  }
  return { css: out, count: rules.size };
}

module.exports = { genFromCss, genInline, SCOPE };

// ───────────────────────── CSS yang tertanam di file JS ─────────────────────────
// Banyak modul menyuntik <style> sendiri dari string/template literal (dashboard.js,
// monitoring_frontend.js, kinerja.js, laporan.js, ...). Blok-blok itu diambil di sini.
const JS_CSS_SKIP = [/lap-md-list/, /xl-tbl/]; // dokumen cetak / ekspor: berdiri sendiri, tetap terang
function jsCssBlocks(file) {
  const t = fs.readFileSync(file, 'utf8');
  const re = /`((?:\\[\s\S]|[^`\\])*)`/g;
  const out = [];
  let m;
  while ((m = re.exec(t))) {
    const b = m[1];
    if (b.includes('${') || /<(div|span|td|tr|button|table|html|body)\b/i.test(b)) continue;
    if (JS_CSS_SKIP.some(r => r.test(b))) continue;
    const rules = b.match(/[^{}]+\{[^{}]*:[^{}]*\}/g) || [];
    if (rules.length < 3) continue;
    const cov = rules.join('').length / b.length;
    if (cov < 0.6) continue;
    out.push(b);
  }
  return out;
}

// ───────────────────────── main ─────────────────────────
function styleBlocks(htmlPath) {
  const txt = fs.readFileSync(htmlPath, 'utf8');
  const out = [];
  const re = /<style[^>]*>([\s\S]*?)<\/style>/g;
  let m;
  while ((m = re.exec(txt))) {
    if (/data-theme="dark"/.test(m[1])) continue; // style anti-kedip buatan sendiri
    out.push(m[1]);
  }
  return out.join('\n');
}

if (require.main === module) {
  const read = f => fs.readFileSync(path.join(__dirname, f), 'utf8');
  const HEADER = '/* DIHASILKAN OTOMATIS oleh tools/gen-dark.js - jangan diedit tangan.\n   Edit tools/dark-manual-*.css lalu jalankan ulang generator. */\n';
  const wrap = body => HEADER + '@media screen {\n' + body + '\n}\n';
  const jsFiles = fs.readdirSync(path.join(PUB, 'js')).filter(f => f.endsWith('.js') && f !== 'theme-engine.js' && f !== 'dark-mode.js').map(f => path.join(PUB, 'js', f));

  // 1) dark.css : styles.css + <style> app.html + inline (app.html & js)
  const stylesPath = path.join(PUB, 'css/styles.css');
  const appPath = path.join(PUB, 'app.html');
  const jsCss = jsFiles.map(f => jsCssBlocks(f).join('\n')).join('\n');
  console.log('CSS dari JS:', (jsCss.length / 1024).toFixed(0) + ' KB');
  const main = genFromCss(fs.readFileSync(stylesPath, 'utf8') + '\n' + styleBlocks(appPath) + '\n' + jsCss, stylesPath);
  const inl = genInline([appPath].concat(jsFiles));
  fs.writeFileSync(path.join(PUB, 'css/dark.css'), wrap(read('dark-manual-base.css') + '\n' + main + inl.css + read('dark-manual-after.css')));
  console.log('dark.css', (fs.statSync(path.join(PUB, 'css/dark.css')).size / 1024).toFixed(0) + ' KB; inline rules:', inl.count);

  // 2) halaman lain: <style> + inline milik halaman itu sendiri
  const LANDING_RV = {
    bg: { '--white': '#111827', '--slate-50': '#0e1624', '--slate-100': '#1a2335', '--slate-300': '#334155', '--teal-50': '#0f2a2a', '--teal-100': '#123a38', '--teal-200': '#164e4a' },
    border: { '--white': '#111827', '--slate-50': '#1e293b', '--slate-100': '#1e293b', '--slate-300': '#334155', '--teal-50': '#164e4a', '--teal-100': '#1b5a5c', '--teal-200': '#1b5a5c' },
    text: { '--slate-900': '#e5e7eb', '--slate-700': '#cbd5e1', '--slate-500': '#94a3b8', '--teal-500': '#2dd4bf', '--teal-600': '#2dd4bf', '--teal-700': '#2dd4bf', '--teal-800': '#5eead4', '--red': '#fca5a5', '--amber': '#fcd34d', '--copper': '#fdba74', '--gold-tua': '#fcd34d' },
    fill: { '--teal-500': '#2dd4bf', '--teal-600': '#2dd4bf', '--teal-700': '#2dd4bf', '--slate-900': '#e5e7eb', '--slate-700': '#cbd5e1', '--slate-500': '#94a3b8' },
  };
  const pages = [
    { file: 'landing.html', out: 'css/dark-landing.css', rv: LANDING_RV, base: 'dark-manual-landing.css' },
    { file: 'login.html', out: 'css/dark-login.css', rv: null, base: null },
    { file: 'bundle.html', out: 'css/dark-bundle.css', rv: null, base: null },
  ];
  for (const pg of pages) {
    const hp = path.join(PUB, pg.file);
    const body = genFromCss(styleBlocks(hp), hp, pg.rv);
    const inl2 = genInline([hp], pg.rv);
    fs.writeFileSync(path.join(PUB, pg.out), wrap((pg.base ? read(pg.base) + '\n' : '') + body + inl2.css));
    console.log(pg.out, (fs.statSync(path.join(PUB, pg.out)).size / 1024).toFixed(1) + ' KB; inline rules:', inl2.count);
  }
}
