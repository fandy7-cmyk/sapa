/* Maskot SAPA: ilustrasi untuk baris tabel kosong/gagal (tr.empty-row), tampilan memuat
   (menggantikan spinner level blok) dan ikon toast. Spinner di dalam tombol tidak diubah.
   Berdiri sendiri, tidak mengubah modul lain. Hapus <script> ini untuk menonaktifkan. */
(function () {
  'use strict';
  if (window.__maskotAktif) return;
  window.__maskotAktif = true;

  var BASE = '/img/maskot/';
  var RE_SUKSES = /tidak ada (error|kesalahan|galat)/i;
  var RE_GALAT  = /gagal|galat|error|kesalahan|tidak dapat/i;
  var RE_KOSONG = /belum ada|tidak ada|tidak ditemukan|belum ditemukan|belum tersedia|kosong/i;
  var RE_MUAT   = /memuat|memproses|menyiapkan|mengambil data/i;
  var rusak = {}; // pose yang gagal dimuat (mis. 403/404): tidak dicoba lagi, tampilan lama dipertahankan
  var TOAST_POSE = { success: 'sukses', error: 'galat', info: 'sapa', warning: 'sapa' };

  var st = document.createElement('style');
  st.setAttribute('data-maskot', '');
  st.textContent =
    '.mk-kosong{display:flex;flex-direction:column;align-items:center;gap:6px}' +
    '.mk-kosong>span{text-align:center}' +
    '.mk-kosong img{width:60px;height:60px;display:block;pointer-events:none;user-select:none}' +
    '.mk-kosong.mk-muat img{width:36px;height:36px;animation:mkBob 1.6s ease-in-out infinite}' +
    '@keyframes mkBob{0%,100%{transform:translateY(0)}50%{transform:translateY(-4px)}}' +
    '@media (prefers-reduced-motion:reduce){.mk-kosong.mk-muat img{animation:none}}' +
    '@media (max-width:640px){.mk-kosong img{width:48px;height:48px}.mk-kosong.mk-muat img{width:32px;height:32px}}' +
    '.toast .toast-icon.mk-ti{background:transparent!important;width:36px;height:36px}' +
    '@media (max-width:640px){.toast .toast-icon.mk-ti{width:32px;height:32px}}' +
    '.toast .toast-icon.mk-ti img{width:100%;height:100%;display:block;pointer-events:none;user-select:none}';
  document.head.appendChild(st);

  function buatImg(pose, lazy, gagal) {
    var img = new Image();
    if (gagal) img.onerror = function () { img.onerror = null; gagal(img); };
    img.src = BASE + pose + '.svg';
    img.alt = '';
    img.setAttribute('aria-hidden', 'true');
    if (lazy) img.loading = 'lazy';
    img.decoding = 'async';
    return img;
  }

  function bungkus(el, pose, spin) {
    var wrap = document.createElement('div');
    wrap.className = 'mk-kosong' + (pose === 'loading' ? ' mk-muat' : '');
    var span = document.createElement('span');
    while (el.firstChild) {
      if (spin && el.firstChild === spin) el.removeChild(spin);
      else span.appendChild(el.firstChild);
    }
    wrap.appendChild(buatImg(pose, pose !== 'loading', function () {
      // gambar gagal dimuat: kembalikan isi semula (termasuk spinner) dan jangan dibungkus lagi
      rusak[pose] = true;
      if (!wrap.parentNode) return;
      if (spin) { spin.setAttribute('data-mk-skip', '1'); span.insertBefore(spin, span.firstChild); }
      while (span.firstChild) wrap.parentNode.insertBefore(span.firstChild, wrap);
      wrap.parentNode.removeChild(wrap);
    }));
    wrap.appendChild(span);
    el.appendChild(wrap);
  }

  // baris tabel kosong / gagal / memuat tanpa spinner
  function pasang(tr) {
    var td = tr.querySelector('td');
    if (!td) return;
    if (td.querySelector('.btn-spin,.lap-spinner') || td.querySelector('img,svg')) return;
    var teks = (td.textContent || '').trim();
    if (!teks) return;
    var pose = RE_SUKSES.test(teks) ? 'sukses'
      : (RE_GALAT.test(teks) ? 'galat'
      : (RE_KOSONG.test(teks) ? 'kosong'
      : (RE_MUAT.test(teks) ? 'loading' : null)));
    if (!pose || rusak[pose]) return;
    tr.setAttribute('data-mk', pose);
    bungkus(td, pose, null);
  }

  // spinner level blok (baris tabel, div) diganti maskot; spinner di tombol / combobox / inline dilewati
  function pasangMuat(sp) {
    if (rusak.loading || sp.getAttribute('data-mk-skip')) return;
    var p = sp.parentElement;
    if (!p || (p.tagName !== 'DIV' && p.tagName !== 'TD')) return;
    if (p.querySelector('.mk-kosong')) return;
    if (p.closest('button,a,label,.csel-empty,.field-hint')) return;
    var teks = (p.textContent || '').trim();
    if (!teks || teks.length > 80 || !RE_MUAT.test(teks)) return;
    bungkus(p, 'loading', sp);
  }

  // ikon toast diganti maskot sesuai tipe
  function pasangToast(t) {
    var ic = t.querySelector('.toast-icon');
    if (!ic || ic.classList.contains('mk-ti')) return;
    var pose = 'sapa';
    for (var k in TOAST_POSE) {
      if (t.classList.contains(k)) { pose = TOAST_POSE[k]; break; }
    }
    if (rusak[pose]) return;
    var asli = ic.innerHTML;
    ic.classList.add('mk-ti');
    ic.textContent = '';
    ic.appendChild(buatImg(pose, false, function () {
      rusak[pose] = true;
      ic.classList.remove('mk-ti');
      ic.innerHTML = asli;
    }));
  }

  function periksa(n) {
    if (n && n.nodeType === 3) n = n.parentElement;
    if (!n || n.nodeType !== 1) return;
    var i, list;
    if (n.closest) {
      var tr = n.closest('tr.empty-row');
      if (tr) pasang(tr);
      var tt = n.closest('.toast');
      if (tt) pasangToast(tt);
    }
    if (n.matches && n.matches('.btn-spin,.lap-spinner')) pasangMuat(n);
    if (n.querySelectorAll) {
      list = n.querySelectorAll('.btn-spin,.lap-spinner');
      for (i = 0; i < list.length; i++) pasangMuat(list[i]);
      list = n.querySelectorAll('tr.empty-row');
      for (i = 0; i < list.length; i++) pasang(list[i]);
      list = n.querySelectorAll('.toast');
      for (i = 0; i < list.length; i++) pasangToast(list[i]);
    }
  }

  function mulai() {
    new MutationObserver(function (muts) {
      for (var i = 0; i < muts.length; i++) {
        var added = muts[i].addedNodes;
        for (var j = 0; j < added.length; j++) periksa(added[j]);
      }
    }).observe(document.body, { childList: true, subtree: true });
    periksa(document.body);
  }

  if (document.body) mulai();
  else document.addEventListener('DOMContentLoaded', mulai);
})();
