// ═══════════════════════════════════════════════════════════════════════════
// PERJADIN (Perjalanan Dinas)
//  1. Halaman rekap Perjadin (admin): filter, KPI, tabel, verifikasi, tambah/edit/duplikat/hapus
//  2. Form Perjalanan Dinas yang dipakai dua tempat dengan generator yang sama:
//       - modal admin (#modalPerjadin, prefix 'pjA')
//       - bagian di modal pengajuan Tugas Luar di menu Absensi (#pengPerjadinForm, prefix 'pjU')
//       - bagian di modal Tambah/Edit Absensi (admin) saat status Tugas Luar (#absPerjadinForm, prefix 'pjE')
// Semua nama global di file ini berawalan pj / _pj / PJ_ supaya tidak bentrok dengan modul lain.
// ═══════════════════════════════════════════════════════════════════════════

const PJ_JENIS = ['Dalam Kota', 'Luar Kota Dalam Provinsi', 'Luar Provinsi'];
const PJ_KENDARAAN = ['Dinas', 'Pribadi', 'Sewa', 'Travel'];
const PJ_BULAN = ['', 'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
const PJ_STATUS_LABEL = { menunggu: 'Menunggu Persetujuan', terverifikasi: 'Disetujui', ditolak: 'Ditolak' };
const PJ_STATUS_BADGE = { menunggu: 'badge-warning', terverifikasi: 'badge-hijau', ditolak: 'badge-merah' };
const PJ_KOTA_ASAL_DEFAULT = 'Banggai Laut';   // hanya prefill; bisa diubah

// Kunci field rincian biaya. Harus sama dengan DETAIL_* di netlify/functions/_perjadin.js.
const PJ_D_RP = ['udara_pergi_rp', 'udara_pulang_rp', 'darat_pergi_rp', 'darat_pulang_rp', 'laut_pergi_rp', 'laut_pulang_rp',
  'taksi_pergi_rp', 'taksi_pulang_rp', 'uang_harian_rp', 'uang_representasi_rp', 'penginapan_rp', 'penginapan_30_rp', 'lain_rp'];
const PJ_D_DATE = ['penginapan_checkin', 'penginapan_checkout'];
const PJ_D_TEXT = [
  ...['udara_pergi', 'udara_pulang'].flatMap((p) => ['asal', 'transit', 'tujuan'].flatMap((l) => [`${p}_${l}`, `${p}_${l}_maskapai`, `${p}_${l}_tiket`])),
  'darat_pergi_kendaraan', 'darat_pergi_plat', 'darat_pulang_kendaraan', 'darat_pulang_plat', 'darat_bbm_pergi', 'darat_bbm_pulang',
  'laut_pergi_perusahaan', 'laut_pulang_perusahaan', 'penginapan_nama', 'penginapan_cabang', 'lain_keterangan',
];

const PJ_ICON = {
  edit: '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4Z"/></svg>',
  copy: '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="14" height="14" x="8" y="8" rx="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>',
  check: '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M5 13l4 4L19 7"/></svg>',
  x: '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M6 18L18 6M6 6l12 12"/></svg>',
  undo: '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6"/></svg>',
  trash: '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" x2="10" y1="11" y2="17"/><line x1="14" x2="14" y1="11" y2="17"/></svg>',
  kpiTrip: '<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="20" height="14" x="2" y="7" rx="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg>',
  kpiRp: '<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="20" height="12" x="2" y="6" rx="2"/><circle cx="12" cy="12" r="2"/><path d="M6 12h.01M18 12h.01"/></svg>',
  kpiWait: '<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3.5 2"/></svg>',
  kpiOk: '<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><path d="m9 11 3 3L22 4"/></svg>',
};

// ── Util ──────────────────────────────────────────────────────────────────
// Admin Penuh Perjadin: Super Admin atau permission 'perjadin.full'. Permission 'perjadin' (dasar) = lihat data sendiri saja.
function pjIsAdmin() { return !!(_user && (_user.is_admin || hasAccess('perjadin.full'))); }
function pjCanView() { return !!(_user && (_user.is_admin || hasAccess('perjadin.full') || hasAccess('perjadin'))); }
function pjFmtRp(n) { return 'Rp ' + (Number(n) || 0).toLocaleString('id-ID'); }
function pjFmtTgl(s) {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s || '');
  return m ? `${m[3]} ${PJ_BULAN[+m[2]].slice(0, 3)} ${m[1]}` : '-';
}
function pjFmtNum(n) { const v = Number(n) || 0; return v ? v.toLocaleString('id-ID') : '-'; }
// Pecahan biaya satu baris (sama dengan pengelompokan di backend hitungTotal & laporan)
function _pjBiaya(r) {
  const d = _pjDetailOf(r);
  const n = (k) => Number(d[k]) || 0;
  return {
    transport: (Number(r.jumlah_transport) || 0) + (Number(r.jumlah_taksi) || 0),
    uang: n('uang_harian_rp') + n('uang_representasi_rp'),
    inap: n('penginapan_rp') + n('penginapan_30_rp'),
    total: Number(r.jumlah_biaya) || 0,
  };
}
function _pjById(id) { return document.getElementById(id); }
function _pjThisYear() {
  try { return new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Makassar' }).slice(0, 4); }
  catch { return String(new Date().getFullYear()); }
}

// ── Input Rupiah (ribuan otomatis) ────────────────────────────────────────
function pjRpInput(el) {
  const d = el.value.replace(/\D/g, '');
  el.value = d ? Number(d).toLocaleString('id-ID') : '';
  if (el.dataset.pj) pjUpdateTotal(el.dataset.pj);
}
function _pjRpVal(id) { const v = (_pjById(id)?.value || '').replace(/\D/g, ''); return v ? parseInt(v, 10) : 0; }
function _pjSetRp(id, n) { const el = _pjById(id); if (el) el.value = Number(n) ? Number(n).toLocaleString('id-ID') : ''; }

// ── Generator field form ──────────────────────────────────────────────────
function _pjReq(req) { return req ? ' <span style="color:var(--merah)">*</span>' : ''; }
function _pjIn(p, k, label, { ph = '', req = false, max = 300, upper = false } = {}) {
  return `<div class="field"><label for="${p}_${k}">${label}${_pjReq(req)}</label>
    <input type="text" id="${p}_${k}" placeholder="${esc(ph)}" maxlength="${max}" autocomplete="off"${upper ? ' style="text-transform:uppercase"' : ''} /></div>`;
}
function _pjArea(p, k, label, { req = false, ph = '' } = {}) {
  return `<div class="field"><label for="${p}_${k}">${label}${_pjReq(req)}</label>
    <textarea id="${p}_${k}" placeholder="${esc(ph)}" maxlength="1500"></textarea></div>`;
}
function _pjRp(p, k, label) {
  return `<div class="field"><label for="${p}_${k}">${label}</label>
    <input type="text" inputmode="numeric" class="pj-rp" id="${p}_${k}" data-pj="${p}" placeholder="0" autocomplete="off" oninput="pjRpInput(this)" /></div>`;
}
function _pjDate(p, k, label, { req = false } = {}) {
  return `<div class="field"><label>${label}${_pjReq(req)}</label>
    <div id="cdtp_${p}_${k}" class="cdtp-mount" data-cdtp="${p}_${k}" data-cdtp-date="1" data-placeholder="Pilih tanggal"></div>
    <input type="hidden" id="${p}_${k}" /></div>`;
}
function _pjSel(p, k, label, options, { req = false, ph = '- Pilih -', searchable = false, onchange = '' } = {}) {
  return `<div class="field"><label>${label}${_pjReq(req)}</label>
    <div class="select-wrap"><select id="${p}_${k}" data-searchable="${searchable ? 1 : 0}"${onchange ? ` onchange="${onchange}"` : ''}>
      <option value="">${esc(ph)}</option>${options.map((o) => `<option value="${esc(o)}">${esc(o)}</option>`).join('')}
    </select></div></div>`;
}
function _pjSec(title, body, open = false) {
  return `<details class="pj-sec"${open ? ' open' : ''}><summary>${title}</summary><div class="pj-sec-body">${body}</div></details>`;
}
function _pjUdara(p, dir, title) {
  const k = `udara_${dir}`;
  const leg = (l, label) => `<div class="pj-grid3">
      ${_pjIn(p, `${k}_${l}`, `Kode Bandara ${label}`, { ph: 'mis. LUW', max: 5, upper: true })}
      ${_pjIn(p, `${k}_${l}_maskapai`, 'Maskapai')}
      ${_pjIn(p, `${k}_${l}_tiket`, 'No. Tiket')}</div>`;
  return `<div class="pj-sub">${title}</div>${_pjRp(p, `${k}_rp`, `Biaya ${dir === 'pergi' ? 'Pergi' : 'Pulang'} (Rp)`)}
    ${leg('asal', 'Asal')}${leg('transit', 'Transit')}${leg('tujuan', 'Tujuan')}`;
}

// admin=true menambah field khusus admin (SKPD/SP2D, pelaksana, tanggal, uang harian, dst).
// Pada form user, pelaksana & tanggal pelaksanaan diambil server dari akun & tanggal pengajuan.
function pjFormHTML(p, admin) {
  const surat = `
    ${admin ? `<div class="pj-grid2">${_pjIn(p, 'nama_skpd', 'Nama SKPD')}${p === 'pjA'
        ? _pjSel(p, 'sub_unit', 'Sub Unit SKPD', _pjSubUnitOpts, { ph: '- Pilih Unit Kerja -', searchable: true, onchange: 'pjOnSubUnitChange()' })
        : _pjIn(p, 'sub_unit', 'Sub Unit SKPD')}</div>
      <div id="${p}_sp2d"><div class="pj-grid2">${_pjIn(p, 'no_sp2d', 'No. SP2D')}${_pjDate(p, 'tgl_sp2d', 'Tanggal SP2D')}</div>
        ${_pjSel(p, 'sumber_dana', 'Sumber Dana', _pjSumberDanaOpts, { ph: '- Pilih Sumber Dana -', searchable: true })}</div>` : ''}
    <div class="pj-grid2">${_pjIn(p, 'no_surat_tugas', 'No. Surat Tugas', { req: p === 'pjE' })}${_pjDate(p, 'tgl_surat_tugas', 'Tanggal Surat Tugas', { req: p === 'pjE' })}</div>
    ${_pjArea(p, 'rincian_kegiatan', 'Rincian Kegiatan', { req: true })}
    ${_pjSel(p, 'jenis_perjadin', 'Jenis Perjalanan Dinas', PJ_JENIS, { req: true })}
    <div class="pj-grid2">
      ${_pjIn(p, 'kota_asal', 'Dari (Ibukota Kabupaten Asal)', { req: true, max: 100 })}
      ${_pjIn(p, 'kota_tujuan', 'Tujuan (Ibukota Kabupaten Tujuan)', { req: true, max: 100 })}
    </div>`;

  const pelaksana = admin ? _pjSec('Pelaksana &amp; Waktu Pelaksanaan', `
    <div class="field"><label>Pilih Pegawai</label>
      <div class="select-wrap"><select id="${p}_user_id" data-searchable="1" data-search-placeholder="Cari pegawai…" onchange="pjOnPelaksanaChange()">
        <option value="">- Pilih Pegawai -</option></select></div>
      <div class="field-hint">Pilih Sub Unit SKPD dulu, daftar pegawai hanya dari unit tersebut. Memilih pegawai mengisi otomatis nama dan NIP. Semuanya tetap bisa diubah.</div></div>
    <div class="pj-grid2">${_pjIn(p, 'pelaksana_nama', 'Nama Pelaksana (Tanpa Gelar)', { req: true, max: 200 })}${_pjIn(p, 'pelaksana_nip', 'NIP / NIPPPK', { max: 40 })}</div>
    <div class="pj-grid2">${_pjDate(p, 'tgl_mulai', 'Tanggal Pelaksanaan (Mulai)', { req: true })}${_pjDate(p, 'tgl_selesai', 'Tanggal Pelaksanaan (Selesai)', { req: true })}</div>
    <div class="field-hint" id="${p}_hari" style="margin-top:-6px"></div>`, true) : '';

  const udara = _pjSec('Transportasi Udara', `${_pjUdara(p, 'pergi', 'Udara Berangkat')}${_pjUdara(p, 'pulang', 'Udara Kembali')}`);

  const darat = (dir, label) => `
    <div class="pj-sub">Darat ${label}</div>
    <div class="pj-grid3">${_pjRp(p, `darat_${dir}_rp`, 'Biaya (Rp)')}
      ${_pjSel(p, `darat_${dir}_kendaraan`, 'Kendaraan', PJ_KENDARAAN)}${_pjIn(p, `darat_${dir}_plat`, 'Plat Nomor', { max: 20, upper: true })}</div>`;
  const daratLaut = _pjSec('Transportasi Darat &amp; Laut', `
    ${darat('pergi', 'Pergi')}${darat('pulang', 'Pulang')}
    <div class="pj-grid2">${_pjIn(p, 'darat_bbm_pergi', 'BBM Pergi')}${_pjIn(p, 'darat_bbm_pulang', 'BBM Pulang')}</div>
    <div class="pj-sub">Laut</div>
    <div class="pj-grid2">${_pjRp(p, 'laut_pergi_rp', 'Pergi (Rp)')}${_pjIn(p, 'laut_pergi_perusahaan', 'Nama Perusahaan (Pergi)')}</div>
    <div class="pj-grid2">${_pjRp(p, 'laut_pulang_rp', 'Pulang (Rp)')}${_pjIn(p, 'laut_pulang_perusahaan', 'Nama Perusahaan (Pulang)')}</div>`);

  const taksi = _pjSec('Taksi', `<div class="pj-grid2">${_pjRp(p, 'taksi_pergi_rp', 'Pergi (Rp)')}${_pjRp(p, 'taksi_pulang_rp', 'Pulang (Rp)')}</div>`);

  const inap = _pjSec('Penginapan &amp; Biaya Lain', `
    <div class="pj-grid2">${_pjIn(p, 'penginapan_nama', 'Nama Penginapan')}${_pjIn(p, 'penginapan_cabang', 'Cabang (jika ada beberapa cabang di 1 kota)')}</div>
    <div class="pj-grid2">${_pjDate(p, 'penginapan_checkin', 'Waktu Check-In')}${_pjDate(p, 'penginapan_checkout', 'Waktu Check-Out')}</div>
    <div class="pj-grid2">${_pjRp(p, 'penginapan_rp', 'Biaya Penginapan (Rp)')}${admin ? _pjRp(p, 'penginapan_30_rp', 'Biaya 30% Penginapan (Rp)') : ''}</div>
    ${admin ? `<div class="pj-grid2">${_pjRp(p, 'uang_harian_rp', 'Uang Harian (Rp)')}${_pjRp(p, 'uang_representasi_rp', 'Uang Representasi (Rp)')}</div>` : ''}
    <div class="pj-grid2">${_pjRp(p, 'lain_rp', 'Biaya Lain-Lain (Rp)')}${_pjIn(p, 'lain_keterangan', 'Keterangan Biaya Lain-Lain')}</div>
    ${admin ? '' : '<div class="field-hint">Uang harian, uang representasi, dan biaya 30% penginapan diisi admin.</div>'}`);

  // Di modal Absensi (pjE): surat tugas & kegiatan wajib diisi dulu, baru ditanya apakah perlu dipertanggungjawabkan
  // (Ya -> bagian anggaran muncul, Tidak -> langsung simpan).
  const tanya = (p === 'pjU') ? `
    <div class="field" style="margin-top:14px">
      <label>Perjalanan dinas ini perlu dipertanggungjawabkan?</label>
      <div class="pj-yn" id="${p}_yn" role="radiogroup" aria-label="Perlu dipertanggungjawabkan">
        <button type="button" class="pj-yn-btn" data-val="ya" role="radio" onclick="pjSetYN('${p}', 'ya')">Ya</button>
        <button type="button" class="pj-yn-btn active" data-val="tidak" role="radio" onclick="pjSetYN('${p}', 'tidak')">Tidak</button>
      </div>
      <div class="field-hint">Pilih Ya untuk mengisi rincian anggaran perjalanan dinas. Pilih Tidak kalau bisa langsung disimpan.</div>
    </div>` : '';

  return `${_pjSec('Surat Tugas &amp; Kegiatan', surat, true)}${pelaksana}${tanya}
    <div id="${p}_anggaran">${udara}${daratLaut}${taksi}${inap}
    <div class="pj-total" id="${p}_total"></div></div>`;
}

// Jawaban "perlu dipertanggungjawabkan?" per form: pjA (menu Perjadin), pjE (modal Absensi), pjU (modal pengajuan user).
// Ya -> No./Tanggal SP2D + rincian anggaran tampil. Tidak -> disembunyikan, langsung simpan.
const _pjYN = { pjA: 'ya', pjE: 'tidak', pjU: 'tidak' };
function pjSetYN(p, v) {
  _pjYN[p] = v === 'ya' ? 'ya' : 'tidak';
  _pjById(`${p}_yn`)?.querySelectorAll('.pj-yn-btn').forEach((b) => {
    const on = b.dataset.val === _pjYN[p];
    b.classList.toggle('active', on);
    b.setAttribute('aria-checked', on ? 'true' : 'false');
  });
  pjYNSync(p);
}
function pjYNSync(p) {
  const show = (p !== 'pjU' || _pjYN[p] === 'ya') ? '' : 'none';   // form admin (pjA, pjE): selalu tampil; toggle Ya/Tidak hanya di form pengajuan user (pjU)
  const ang = _pjById(`${p}_anggaran`); if (ang) ang.style.display = show;
  const sp2d = _pjById(`${p}_sp2d`); if (sp2d) sp2d.style.display = show;
}
// Buka otomatis section rincian biaya (Udara, Darat & Laut, Taksi, Penginapan) yang sudah ada isinya, supaya langsung kelihatan saat Edit.
function pjOpenFilledSections(p) {
  _pjById(`${p}_anggaran`)?.querySelectorAll('details.pj-sec').forEach((d) => {
    const filled = [...d.querySelectorAll('input:not([type=hidden]), select, textarea')].some((el) => {
      const v = String(el.value || '').trim(); return v && v !== '0';
    }) || [...d.querySelectorAll('input[type=hidden]')].some((el) => String(el.value || '').trim());
    if (filled) d.open = true;
  });
}
// `detail` normalnya object, tapi kalau tersimpan/terkirim sebagai string JSON (bahkan dobel) form edit jadi kosong. Selalu dinormalkan ke object.
function _pjDetailOf(row) {
  let d = row?.detail;
  for (let i = 0; i < 3 && typeof d === 'string'; i++) { try { d = JSON.parse(d); } catch { d = {}; } }
  return d && typeof d === 'object' && !Array.isArray(d) ? d : {};
}
function _pjAdaAnggaran(row) {
  return !!(row && (Object.keys(_pjDetailOf(row)).length || row.no_sp2d || row.tgl_sp2d || row.sumber_dana));
}

function pjUpdateTotal(p) {
  const t = _pjById(`${p}_total`);
  if (!t) return;
  const sum = PJ_D_RP.reduce((a, k) => a + _pjRpVal(`${p}_${k}`), 0);
  t.innerHTML = `<span>${p === 'pjU' ? 'Perkiraan Total Biaya' : 'Jumlah Biaya'}</span><b>${pjFmtRp(sum)}</b>`;
}

// Pasang date picker (cdtp) & custom select pada form yang baru dirender.
function _pjMountWidgets(p) {
  if (typeof initCdtp === 'function') initCdtp();
  if (typeof initCustomSelects === 'function') initCustomSelects();
  const hari = () => pjUpdateHari(p);
  ['tgl_mulai', 'tgl_selesai'].forEach((k) => _pjById(`${p}_${k}`)?.addEventListener('change', hari));
}
function _pjDateSet(p, k, v) {
  const el = _pjById(`${p}_${k}`);
  if (el) el.value = v || '';
  _pjById(`cdtp_${p}_${k}`)?._cdtp?.set(v || null);
}
function _pjCommitDates(p) {
  [...(_pjById(p === 'pjA' ? 'pjFormBody' : p === 'pjE' ? 'absPerjadinForm' : 'pengPerjadinForm')?.querySelectorAll('.cdtp-mount') || [])].forEach((m) => m._cdtp?.commit?.());
}
function pjUpdateHari(p) {
  const a = _pjById(`${p}_tgl_mulai`)?.value, b = _pjById(`${p}_tgl_selesai`)?.value, el = _pjById(`${p}_hari`);
  if (!el) return;
  if (!a || !b || b < a) { el.textContent = ''; return; }
  const d = Math.round((Date.parse(b) - Date.parse(a)) / 86400000) + 1;
  el.textContent = `Jumlah hari: ${d} hari`;
}

// Isi form dari satu baris data (untuk edit/duplikat).
function pjFillForm(p, row, admin) {
  const set = (k, v) => { const el = _pjById(`${p}_${k}`); if (el) el.value = v ?? ''; };
  ['no_surat_tugas', 'rincian_kegiatan', 'jenis_perjadin', 'kota_asal', 'kota_tujuan'].forEach((k) => set(k, row?.[k]));
  if (admin) ['nama_skpd', 'sub_unit', 'no_sp2d', 'sumber_dana', 'pelaksana_nama', 'pelaksana_nip'].forEach((k) => set(k, row?.[k]));
  const d = _pjDetailOf(row);
  PJ_D_TEXT.forEach((k) => set(k, d[k]));
  PJ_D_RP.forEach((k) => _pjSetRp(`${p}_${k}`, d[k]));
  _pjDateSet(p, 'tgl_surat_tugas', row?.tgl_surat_tugas);
  PJ_D_DATE.forEach((k) => _pjDateSet(p, k, d[k]));
  if (admin) {
    _pjDateSet(p, 'tgl_sp2d', row?.tgl_sp2d);
    _pjDateSet(p, 'tgl_mulai', row?.tgl_mulai);
    _pjDateSet(p, 'tgl_selesai', row?.tgl_selesai);
    pjUpdateHari(p);
  }
  ['jenis_perjadin', 'darat_pergi_kendaraan', 'darat_pulang_kendaraan'].forEach((k) => syncCustomSelect?.(`${p}_${k}`));
  if (_pjById(`${p}_sub_unit`)?.tagName === 'SELECT') syncCustomSelect?.(`${p}_sub_unit`);
  pjUpdateTotal(p);
}

// Baca isi form -> objek yang dikirim ke API.
function pjCollect(p, admin) {
  _pjCommitDates(p);
  const val = (k) => (_pjById(`${p}_${k}`)?.value || '').trim();
  const detail = {};
  PJ_D_TEXT.forEach((k) => { if (_pjById(`${p}_${k}`)) detail[k] = val(k); });
  PJ_D_RP.forEach((k) => { if (_pjById(`${p}_${k}`)) detail[k] = _pjRpVal(`${p}_${k}`); });
  PJ_D_DATE.forEach((k) => { if (_pjById(`${p}_${k}`)) detail[k] = val(k); });
  const out = {
    no_surat_tugas: val('no_surat_tugas'), tgl_surat_tugas: val('tgl_surat_tugas'),
    rincian_kegiatan: val('rincian_kegiatan'), jenis_perjadin: val('jenis_perjadin'),
    kota_asal: val('kota_asal'), kota_tujuan: val('kota_tujuan'), detail,
  };
  if (admin) {
    Object.assign(out, {
      nama_skpd: val('nama_skpd'), sub_unit: val('sub_unit'), no_sp2d: val('no_sp2d'), tgl_sp2d: val('tgl_sp2d'), sumber_dana: val('sumber_dana'),
      user_id: val('user_id') || null, pelaksana_nama: val('pelaksana_nama'), pelaksana_nip: val('pelaksana_nip'),
      tgl_mulai: val('tgl_mulai'), tgl_selesai: val('tgl_selesai'),
    });
  }
  return out;
}

// Validasi sisi client (server tetap memvalidasi ulang). Return pesan error atau ''.
function pjValidate(d, admin) {
  if (admin) {
    if (!d.pelaksana_nama) return 'Nama pelaksana wajib diisi';
    if (!d.tgl_mulai || !d.tgl_selesai) return 'Tanggal pelaksanaan (mulai dan selesai) wajib diisi';
    if (d.tgl_selesai < d.tgl_mulai) return 'Tanggal selesai tidak boleh sebelum tanggal mulai';
  }
  if (!d.rincian_kegiatan) return 'Rincian kegiatan wajib diisi';
  if (!d.jenis_perjadin) return 'Jenis perjalanan dinas wajib dipilih';
  if (!d.kota_asal) return 'Kota asal wajib diisi';
  if (!d.kota_tujuan) return 'Kota tujuan wajib diisi';
  const dt = d.detail || {};
  if (dt.penginapan_checkin && dt.penginapan_checkout && dt.penginapan_checkout < dt.penginapan_checkin) return 'Check-out penginapan tidak boleh sebelum check-in';
  return '';
}

// ═══════════════════════════════════════════════════════════════════════════
// 1. HALAMAN REKAP PERJADIN (admin)
// ═══════════════════════════════════════════════════════════════════════════
const PJ_PAGE_SIZE = 10;
let _pjPage = 1;
let _pjRows = [];
let _pjReady = false;
let _pjSubAsli = null;
let _pjTahunInit = false;
let _pjPelaksana = null;      // cache daftar pegawai untuk dropdown
let _pjSkpdDefault = '';
const _pjF = { q: '', tahun: '', bulan: '', jenis: '', status: '' };

function _pjFillSelect(id, html, value) {
  const sel = _pjById(id);
  if (!sel) return;
  sel.innerHTML = html;
  sel.value = value;
  syncCustomSelect?.(id);
}

// Isi dropdown filter hanya dengan nilai yang ada datanya (dari /api/perjadin/opsi).
// Nilai filter yang sudah tidak ada datanya otomatis dilepas.
async function _pjBuildFilters() {
  let o = { tahun: [], bulan: [], jenis: [], status: [] };
  for (let i = 0; i < 3; i++) {
    const qs = new URLSearchParams();
    if (_pjF.tahun) qs.set('tahun', _pjF.tahun);
    if (_pjF.bulan) qs.set('bulan', _pjF.bulan);
    try {
      const r = await fetch(`/api/perjadin/opsi?${qs}`, { headers: authHeaders() });
      if (r.ok) o = await r.json();
    } catch (err) { console.error('[pjBuildFilters]', err); }
    let changed = false;
    if (!_pjTahunInit) {
      // Pertama kali: tahun berjalan kalau ada datanya, kalau tidak tahun terbaru yang ada datanya.
      const y = parseInt(_pjThisYear(), 10);
      _pjF.tahun = o.tahun.includes(y) ? String(y) : (o.tahun[0] ? String(o.tahun[0]) : '');
      _pjTahunInit = true; changed = true;
    } else if (_pjF.tahun && !o.tahun.includes(parseInt(_pjF.tahun, 10))) { _pjF.tahun = ''; changed = true; }
    if (_pjF.bulan && !o.bulan.includes(parseInt(_pjF.bulan, 10))) { _pjF.bulan = ''; changed = true; }
    if (!changed) break;
  }
  if (_pjF.jenis && !o.jenis.includes(_pjF.jenis)) _pjF.jenis = '';
  if (_pjF.status && !o.status.includes(_pjF.status)) _pjF.status = '';

  _pjFillSelect('pjFilterTahun', '<option value="">Semua Tahun</option>' + o.tahun.map((t) => `<option value="${t}">${t}</option>`).join(''), _pjF.tahun);
  _pjFillSelect('pjFilterBulan', '<option value="">Semua Bulan</option>' + o.bulan.map((m) => `<option value="${m}">${PJ_BULAN[m]}</option>`).join(''), _pjF.bulan);
  _pjFillSelect('pjFilterJenis', '<option value="">Semua Jenis</option>' + PJ_JENIS.filter((j) => o.jenis.includes(j)).map((j) => `<option value="${esc(j)}">${esc(j)}</option>`).join(''), _pjF.jenis);
  _pjFillSelect('pjFilterStatus', '<option value="">Semua Status</option>' + ['menunggu', 'terverifikasi', 'ditolak'].filter((s) => o.status.includes(s)).map((s) => `<option value="${s}">${PJ_STATUS_LABEL[s]}</option>`).join(''), _pjF.status);
}

// Mode lihat-saja untuk user dengan akses dasar: sembunyikan Tambah & kolom Aksi, ubah subjudul.
function _pjApplyMode() {
  const page = _pjById('page-perjadin');
  if (!page) return;
  const admin = pjIsAdmin();
  page.classList.toggle('pj-readonly', !admin);
  page.querySelector('table thead tr th:last-child')?.classList.add('pj-aksi-col');
  const sub = page.querySelector('.page-subtitle');
  if (sub) {
    if (_pjSubAsli === null) _pjSubAsli = sub.innerHTML;
    sub.innerHTML = admin ? _pjSubAsli : 'Data perjalanan dinas Anda';
  }
  // User akses dasar tidak bisa tambah langsung; pengajuannya lewat form Tugas Luar di menu Absensi (modal yang sama).
  const btnAjukan = _pjById('pjBtnAjukan');
  if (btnAjukan) btnAjukan.style.display = admin ? 'none' : '';
  // Tombol Persetujuan Pengajuan: pakai izin yang sama dengan endpoint approve/reject (admin absensi penuh).
  const btnSetuju = _pjById('pjBtnPersetujuan');
  const bolehSetuju = typeof isAbsensiFull === 'function' && isAbsensiFull();
  if (btnSetuju) btnSetuju.style.display = bolehSetuju ? '' : 'none';
  if (bolehSetuju && typeof refreshPengajuanPendingBadge === 'function') refreshPengajuanPendingBadge();
}

// Tombol "Ajukan Perjalanan Dinas" (user akses dasar): buka modal pengajuan Tugas Luar milik menu Absensi.
// Pengajuan yang tersimpan langsung membuat baris Perjadin "menunggu", jadi tabel di-refresh begitu modal ditutup.
function pjAjukanDariMenu() {
  if (typeof openPengajuanModal !== 'function') { toast('Form pengajuan belum siap, muat ulang halaman', 'error'); return; }
  openPengajuanModal();
  // Dari menu Perjadin jenisnya pasti Tugas Luar: sembunyikan pilihan Jenis (tidak ada Cuti) dan ganti judul.
  const st = _pjById('pengStatus');
  if (st) st.value = 'tugas_luar';
  if (typeof syncCustomSelect === 'function') syncCustomSelect('pengStatus');
  const jw = _pjById('pengJenisWrap');
  if (jw) jw.style.display = 'none';
  const judul = _pjById('pengModalTitle');
  if (judul) judul.textContent = 'Ajukan Tugas Luar';
  pjPengSync();
  const hooks = (window._modalCloseHooks = window._modalCloseHooks || {});
  if (hooks.modalPengajuanAbsen?._pjWrapped) return;
  const prev = hooks.modalPengajuanAbsen;
  const wrapped = () => { try { prev?.(); } finally { pjRefreshSetelahPengajuan(); } };
  wrapped._pjWrapped = true;
  hooks.modalPengajuanAbsen = wrapped;
}

// Dipanggil dari approvePengajuan / submitTolakPengajuan (absensi_frontend.js) supaya tabel Perjadin ikut ter-update.
async function pjRefreshSetelahPengajuan() {
  if (!_pjReady) return;
  try { await _pjBuildFilters(); await pjLoadTable(_pjPage || 1); } catch (e) { console.error('[pj refresh]', e); }
}

async function loadPerjadin() {
  if (!pjCanView()) return;
  _pjApplyMode();
  if (!_pjReady) { await _pjBuildFilters(); _pjReady = true; }
  await pjLoadTable(_pjPage || 1);
}

async function pjSetFilter() {
  const prev = { tahun: _pjF.tahun, bulan: _pjF.bulan };
  _pjF.q = (_pjById('pjSearch')?.value || '').trim();
  _pjF.tahun = _pjById('pjFilterTahun')?.value || '';
  _pjF.bulan = _pjById('pjFilterBulan')?.value || '';
  _pjF.jenis = _pjById('pjFilterJenis')?.value || '';
  _pjF.status = _pjById('pjFilterStatus')?.value || '';
  // Tahun/bulan berubah -> opsi bulan, jenis, status ikut menyesuaikan data.
  if (_pjF.tahun !== prev.tahun || _pjF.bulan !== prev.bulan) await _pjBuildFilters();
  pjLoadTable(1);
}

function _pjParams(extra = {}) {
  const p = new URLSearchParams(extra);
  Object.entries(_pjF).forEach(([k, v]) => { if (v) p.set(k, v); });
  return p;
}

function _pjRenderKpi(s) {
  const box = _pjById('pjKpiBox');
  if (!box || typeof _kpiCard !== 'function') return;
  box.innerHTML =
    _kpiCard({ icon: PJ_ICON.kpiTrip, label: 'Perjalanan Dinas', value: s.total, color: 'teal' }) +
    _kpiCard({ icon: PJ_ICON.kpiRp, label: 'Total Biaya', value: pjFmtRp(s.total_biaya), color: 'blue' }) +
    _kpiCard({ icon: PJ_ICON.kpiWait, label: 'Menunggu Persetujuan', value: s.menunggu, color: 'amber' }) +
    _kpiCard({ icon: PJ_ICON.kpiOk, label: 'Disetujui', value: s.terverifikasi, color: 'green' });
}

async function pjLoadTable(page = 1) {
  _pjPage = page;
  const tbody = _pjById('pjTableBody');
  if (!tbody) return;
  tbody.innerHTML = '<tr class="empty-row"><td colspan="15"><span class="btn-spin" style="width:11px;height:11px;vertical-align:-1px;margin-right:6px"></span>Memuat data...</td></tr>';
  try {
    const r = await fetch(`/api/perjadin?${_pjParams({ page, limit: PJ_PAGE_SIZE })}`, { headers: authHeaders() });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    const d = await r.json();
    _pjRows = d.perjadin || [];
    _pjRenderKpi(d.summary || { total: 0, total_biaya: 0, menunggu: 0, terverifikasi: 0 });
    if (!_pjRows.length) {
      tbody.innerHTML = '<tr class="empty-row"><td colspan="15">Belum ada data perjalanan dinas pada filter ini</td></tr>';
      renderPagination('pjPagination', d.total || 0, page, PJ_PAGE_SIZE, 'goPjPage');
      return;
    }
    const start = (page - 1) * PJ_PAGE_SIZE;
    tbody.innerHTML = _pjRows.map((r, i) => {
      const st = r.status_verifikasi;
      const admin = pjIsAdmin();
      const b = _pjBiaya(r);
      const aksiVerif = st === 'menunggu'
        ? `<button class="btn btn-ghost btn-sm" data-tip="Verifikasi" onclick="pjOpenVerif(${r.id})">${PJ_ICON.check}</button>`
        : st === 'terverifikasi'
          ? `<button class="btn btn-ghost btn-sm" data-tip="Batalkan verifikasi" onclick="pjVerifikasi(${r.id}, 'menunggu')">${PJ_ICON.undo}</button>`
          : (st === 'ditolak' && r.pengajuan_status !== 'ditolak')
            ? `<button class="btn btn-ghost btn-sm" data-tip="Batalkan penolakan" onclick="pjVerifikasi(${r.id}, 'menunggu')">${PJ_ICON.undo}</button>` : '';
      return `<tr>
        <td style="text-align:center">${start + i + 1}</td>
        <td style="text-align:left"><div style="font-weight:600">${esc(r.pelaksana_nama)}</div>
          <div class="pj-cell-sub">${[r.pelaksana_nip ? 'NIP. ' + esc(r.pelaksana_nip) : ''].filter(Boolean).join(' · ')}</div></td>
        <td style="text-align:left">${esc(r.no_surat_tugas || '-')}</td>
        <td style="text-align:left"><div class="pj-ket" data-tip="${esc(r.rincian_kegiatan || '')}">${esc(r.rincian_kegiatan || '-')}</div></td>
        <td style="text-align:center">${esc(r.kota_tujuan || '-')}</td>
        <td style="text-align:center;white-space:nowrap">${pjFmtTgl(r.tgl_mulai)}</td>
        <td style="text-align:center;white-space:nowrap">${pjFmtTgl(r.tgl_selesai)}</td>
        <td style="text-align:right;white-space:nowrap">${pjFmtNum(b.transport)}</td>
        <td style="text-align:right;white-space:nowrap">${pjFmtNum(b.uang)}</td>
        <td style="text-align:right;white-space:nowrap">${pjFmtNum(b.inap)}</td>
        <td style="text-align:right;white-space:nowrap;font-weight:700">${pjFmtNum(b.total)}</td>
        <td style="text-align:center">${_pjAdaAnggaran(r) ? '<span class="badge badge-hijau">Ya</span>' : '<span class="badge badge-abu">Tidak</span>'}</td>
        <td style="text-align:center">${esc(r.sumber_dana || '-')}</td>
        <td style="text-align:center"><span class="badge ${PJ_STATUS_BADGE[st] || 'badge-abu'}"${r.catatan_admin ? ` data-tip="${esc(r.catatan_admin)}"` : ''}>${PJ_STATUS_LABEL[st] || esc(st)}</span></td>
        <td class="pj-aksi-col" style="text-align:center;white-space:nowrap">${admin ? `${aksiVerif}
          <button class="btn btn-ghost btn-sm" data-tip="Edit" onclick="openPerjadinModal(${r.id})">${PJ_ICON.edit}</button>
          <button class="btn btn-ghost btn-sm" data-tip="Duplikat (pelaksana lain)" onclick="openPerjadinModal(${r.id}, true)">${PJ_ICON.copy}</button>
          <button class="btn-hapus" data-tip="Hapus" onclick="pjDelete(${r.id})">${PJ_ICON.trash}</button>` : ''}</td>
      </tr>`;
    }).join('');
    renderPagination('pjPagination', d.total || 0, page, PJ_PAGE_SIZE, 'goPjPage');
  } catch (err) {
    console.error('[pjLoadTable]', err);
    tbody.innerHTML = '<tr class="empty-row"><td colspan="15">Gagal memuat data</td></tr>';
  }
}
window.goPjPage = (p) => pjLoadTable(p);

async function pjVerifikasi(id, status, catatan = '') {
  try {
    const r = await fetch(`/api/perjadin/${id}/verifikasi`, { method: 'PUT', headers: authHeaders(), body: JSON.stringify({ status, catatan }) });
    const d = await r.json();
    if (!r.ok) { toast(d.error || 'Gagal memperbarui status', 'error'); return false; }
    toast(status === 'terverifikasi' ? 'Data perjalanan dinas disetujui'
      : status === 'ditolak' ? 'Data perjalanan dinas ditolak' : 'Status dikembalikan ke menunggu persetujuan', 'success');
    await _pjBuildFilters();
    await pjLoadTable(_pjPage);
    return true;
  } catch { toast('Gagal memperbarui status', 'error'); return false; }
}

// Icon tombol submit modal Verifikasi (teks tombolnya ganti Setujui/Tolak, jadi icon ikut diganti lewat innerHTML).
const PJ_BTN_ICON_CHECK = '<svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5" style="margin-right:5px;vertical-align:-2px"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"/></svg>';
const PJ_BTN_ICON_X = '<svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5" style="margin-right:5px;vertical-align:-2px"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>';
let _pjVerifPilih = 'setuju';
function pjOpenVerif(id) {
  const row = _pjRows.find((x) => x.id === id);
  _pjById('pjVerifId').value = id;
  _pjById('pjVerifInfo').innerHTML = row ? `<b>${esc(row.pelaksana_nama || '')}</b> ke <b>${esc(row.kota_tujuan || '')}</b>` : '';
  _pjById('pjVerifCatatan').value = '';
  pjVerifPilih('setuju');
  openModal('modalVerifPerjadin');
}

function pjVerifPilih(v) {
  _pjVerifPilih = v === 'tolak' ? 'tolak' : 'setuju';
  _pjById('pjVerifPilih')?.querySelectorAll('.pj-yn-btn').forEach((b) => {
    const on = b.dataset.val === _pjVerifPilih;
    b.classList.toggle('active', on);
    b.setAttribute('aria-checked', on ? 'true' : 'false');
  });
  _pjById('pjVerifCatatanWrap').style.display = _pjVerifPilih === 'tolak' ? '' : 'none';
  const btn = _pjById('btnSubmitVerifPerjadin');
  btn.innerHTML = _pjVerifPilih === 'tolak' ? PJ_BTN_ICON_X + 'Tolak' : PJ_BTN_ICON_CHECK + 'Setujui';
  btn.className = _pjVerifPilih === 'tolak' ? 'btn btn-danger' : 'btn btn-primary';
  if (_pjVerifPilih === 'tolak') _pjById('pjVerifCatatan').focus();
}

async function pjSubmitVerif() {
  const id = parseInt(_pjById('pjVerifId').value, 10);
  if (!id) return;
  const tolak = _pjVerifPilih === 'tolak';
  const catatan = _pjById('pjVerifCatatan').value.trim();
  if (tolak && !catatan) { toast('Catatan penolakan wajib diisi', 'error'); _pjById('pjVerifCatatan').focus(); return; }
  const btn = _pjById('btnSubmitVerifPerjadin');
  btn.disabled = true;
  try {
    if (await pjVerifikasi(id, tolak ? 'ditolak' : 'terverifikasi', tolak ? catatan : '')) closeModal('modalVerifPerjadin');
  } finally { btn.disabled = false; }
}

async function pjDelete(id) {
  const row = _pjRows.find((x) => x.id === id);
  const ok = await showConfirm({
    title: 'Hapus Data Perjalanan Dinas',
    msg: `Data perjalanan dinas <b>${esc(row?.pelaksana_nama || '')}</b> ke <b>${esc(row?.kota_tujuan || '')}</b> akan dihapus permanen, termasuk data Tugas Luar-nya di menu Absensi.`,
    okText: 'Ya, Hapus',
  });
  if (!ok) return;
  try {
    const r = await fetch(`/api/perjadin/${id}`, { method: 'DELETE', headers: authHeaders() });
    const d = await r.json();
    if (!r.ok) { toast(d.error || 'Gagal menghapus', 'error'); return; }
    toast('Data perjalanan dinas dihapus', 'success');
    // Kalau yang dihapus satu-satunya baris di halaman ini, mundur satu halaman.
    await _pjBuildFilters();
    await pjLoadTable(_pjRows.length === 1 && _pjPage > 1 ? _pjPage - 1 : _pjPage);
  } catch { toast('Gagal menghapus', 'error'); }
}

// ── Modal tambah/edit/duplikat (admin) ──
async function _pjEnsurePelaksana() {
  if (_pjPelaksana) return;
  try {
    const r = await fetch('/api/perjadin/pelaksana', { headers: authHeaders() });
    const d = await r.json();
    _pjPelaksana = d.pelaksana || [];
    _pjSkpdDefault = d.skpd_default || '';
  } catch { _pjPelaksana = []; }
}

// Daftar Sumber Dana (master Sumber Dana e-Planning) untuk dropdown Sumber Dana. Nilai yang disimpan = label ("kode - nama").
let _pjSumberDanaOpts = [];
let _pjSumberDanaLoaded = false;
async function _pjEnsureSumberDana() {
  if (_pjSumberDanaLoaded) return;
  try {
    const r = await fetch('/api/perjadin/sumberdana', { headers: authHeaders() });
    const d = await r.json();
    _pjSumberDanaOpts = (d.sumberdana || []).map((s) => s.label).filter(Boolean);
    _pjSumberDanaLoaded = r.ok;
  } catch { _pjSumberDanaOpts = []; }
}
// Isi ulang opsi select Sumber Dana di form `p`; nilai lama yang sudah tidak ada di master tetap ikut tampil.
function _pjRenderSumberDana(p, current) {
  const sel = _pjById(`${p}_sumber_dana`);
  if (!sel) return;
  const cur = current !== undefined ? (current || '') : sel.value;
  const opts = [..._pjSumberDanaOpts];
  if (cur && !opts.includes(cur)) opts.push(cur);
  sel.innerHTML = '<option value="">- Pilih Sumber Dana -</option>' + opts.map((o) => `<option value="${esc(o)}">${esc(o)}</option>`).join('');
  sel.value = cur;
  syncCustomSelect?.(`${p}_sumber_dana`);
}

// Daftar unit kerja (nama bidang) untuk dropdown Sub Unit SKPD.
let _pjBidang = null;
let _pjSubUnitOpts = [];
// Menu Perjadin hanya untuk unit ini: dropdown Sub Unit SKPD cuma berisi unit ini, dropdown pegawai cuma pegawai unit ini.
const PJ_UNIT_UTAMA = 'Sub Bagian Perencanaan';
function _pjUnitUtama() {
  const l = (x) => String(x || '').trim().toLowerCase();
  const nama = (_pjBidang || []).find((n) => l(n) === l(PJ_UNIT_UTAMA))
    || (_pjBidang || []).find((n) => l(n).includes('perencanaan'));
  return nama || PJ_UNIT_UTAMA;
}
async function _pjEnsureBidang() {
  if (_pjBidang) return;
  try {
    const r = await fetch('/api/bidang', { headers: authHeaders() });
    const d = await r.json();
    _pjBidang = (d.bidang || []).map((b) => b.nama).filter(Boolean);
  } catch { _pjBidang = []; }
}

let _pjEditId = null;
async function openPerjadinModal(id = null, duplicate = false) {
  _pjEditId = (id && !duplicate) ? id : null;
  const src = id ? _pjRows.find((x) => x.id === id) : null;
  await _pjEnsurePelaksana();
  await _pjEnsureBidang();
  await _pjEnsureSumberDana();
  _pjSubUnitOpts = [_pjUnitUtama()];
  if (src?.sub_unit && !_pjSubUnitOpts.includes(src.sub_unit)) _pjSubUnitOpts.push(src.sub_unit);   // nilai lama tidak hilang
  _pjById('modalPerjadinTitle').textContent = _pjEditId ? 'Edit Perjalanan Dinas' : (duplicate ? 'Duplikat Perjalanan Dinas' : 'Tambah Perjalanan Dinas');
  _pjById('pjFormBody').innerHTML = pjFormHTML('pjA', true);

  const sel = _pjById('pjA_user_id');
  sel.innerHTML = '<option value="">- Pilih Pegawai -</option>' +
    _pjPelaksana.map((u) => `<option value="${u.id}">${esc(u.nama)}${u.nip ? ' - ' + esc(u.nip) : ''}</option>`).join('');

  let row = src;
  if (duplicate && src) {
    // Salinan: identitas pelaksana, SP2D, dan nomor tiket dikosongkan; sisanya dibawa.
    row = { ...src, user_id: null, pelaksana_nama: '', pelaksana_nip: '', no_sp2d: '', tgl_sp2d: '', detail: { ..._pjDetailOf(src) } };
    Object.keys(row.detail).forEach((k) => { if (k.endsWith('_tiket')) delete row.detail[k]; });
  }
  openModal('modalPerjadin');
  _pjMountWidgets('pjA');
  pjFillForm('pjA', row, true);
  _pjRenderSumberDana('pjA', row?.sumber_dana || '');
  if (!row) _pjById('pjA_kota_asal').value = PJ_KOTA_ASAL_DEFAULT;
  // Nama SKPD hanya baca (selalu nama dinas).
  const skpd = _pjById('pjA_nama_skpd');
  skpd.value = _pjSkpdDefault || skpd.value;
  skpd.readOnly = true; skpd.style.background = 'var(--abu-1)'; skpd.style.cursor = 'default';
  sel.value = row?.user_id ? String(row.user_id) : '';
  // Data baru: Sub Unit langsung terisi unit utama supaya daftar pegawainya langsung muncul.
  const suEl = _pjById('pjA_sub_unit');
  if (suEl && !suEl.value) { suEl.value = _pjSubUnitOpts[0]; syncCustomSelect?.('pjA_sub_unit'); }
  _pjRenderPelaksanaOpts();   // saring daftar pegawai sesuai Sub Unit yang terpilih
  pjUpdateTotal('pjA');
  pjOpenFilledSections('pjA');
}

// Dropdown "Pilih Pegawai" hanya berisi pegawai dari Sub Unit SKPD (unit kerja) yang sedang dipilih.
// Unit belum dipilih -> daftar pegawai kosong (isi manual tetap bisa). Pegawai yang sudah terpilih selalu ikut tampil.
function _pjRenderPelaksanaOpts() {
  const sel = _pjById('pjA_user_id');
  if (!sel) return;
  const unit = _pjById('pjA_sub_unit')?.value || '';
  const cur = sel.value;
  const list = (_pjPelaksana || []).filter((u) => (unit && u.sub_unit === unit) || String(u.id) === cur);
  sel.innerHTML = `<option value="">${unit ? '- Pilih Pegawai -' : '- Pilih Sub Unit SKPD dulu -'}</option>` +
    list.map((u) => `<option value="${u.id}">${esc(u.nama)}${u.nip ? ' - ' + esc(u.nip) : ''}</option>`).join('');
  sel.value = list.some((u) => String(u.id) === cur) ? cur : '';
  syncCustomSelect?.('pjA_user_id');
}

// Ganti unit kerja -> pegawai yang tidak berasal dari unit itu dilepas, daftar pegawai ikut menyesuaikan.
function pjOnSubUnitChange() {
  const sel = _pjById('pjA_user_id');
  const unit = _pjById('pjA_sub_unit')?.value || '';
  const u = (_pjPelaksana || []).find((x) => String(x.id) === sel?.value);
  if (u && unit && u.sub_unit !== unit) {
    sel.value = '';
    ['nama', 'nip'].forEach((k) => { const el = _pjById(`pjA_pelaksana_${k}`); if (el) el.value = ''; });
  }
  _pjRenderPelaksanaOpts();
}

function pjOnPelaksanaChange() {
  const u = (_pjPelaksana || []).find((x) => String(x.id) === _pjById('pjA_user_id').value);
  if (!u) return;
  _pjById('pjA_pelaksana_nama').value = u.nama || '';
  _pjById('pjA_pelaksana_nip').value = u.nip || '';
  if (u.sub_unit) {
    const su = _pjById('pjA_sub_unit');
    if (su && ![...su.options].some((o) => o.value === u.sub_unit)) su.add(new Option(u.sub_unit, u.sub_unit));
    su.value = u.sub_unit;
    syncCustomSelect?.('pjA_sub_unit');
    _pjRenderPelaksanaOpts();
  }
}

async function savePerjadin() {
  const data = pjCollect('pjA', true);
  const err = pjValidate(data, true);
  if (err) { toast(err, 'error'); return; }
  const btn = _pjById('btnSavePerjadin');
  btn.disabled = true;
  try {
    const r = await fetch(_pjEditId ? `/api/perjadin/${_pjEditId}` : '/api/perjadin', {
      method: _pjEditId ? 'PUT' : 'POST', headers: authHeaders(), body: JSON.stringify(data),
    });
    const d = await r.json();
    if (!r.ok) { toast(d.error || 'Gagal menyimpan', 'error'); return; }
    toast(_pjEditId ? 'Perubahan disimpan' : 'Data perjalanan dinas ditambahkan', 'success');
    closeModal('modalPerjadin');
    await _pjBuildFilters();
    await pjLoadTable(_pjEditId ? _pjPage : 1);
  } catch { toast('Gagal menyimpan', 'error'); }
  finally { btn.disabled = false; }
}

// ═══════════════════════════════════════════════════════════════════════════
// 2. INTEGRASI MENU ABSENSI: form Perjalanan Dinas di modal pengajuan Tugas Luar
// ═══════════════════════════════════════════════════════════════════════════
// Dipanggil dari openPengajuanModal() / savePengajuan() di absensi_frontend.js.
function pjPengInit() {
  const box = _pjById('pengPerjadinForm');
  if (!box) return;
  // Selalu mulai dari bentuk lengkap (Tugas Luar / Cuti); pjAjukanDariMenu() menyempitkannya setelah modal dibuka.
  const jw = _pjById('pengJenisWrap');
  if (jw) jw.style.display = '';
  box.innerHTML = pjFormHTML('pjU', false);
  _pjMountWidgets('pjU');
  pjUpdateTotal('pjU');
  pjSetYN('pjU', 'tidak');   // default Tidak; user pilih Ya kalau perlu mengisi rincian anggaran
  pjPengSync();
}

// Tugas Luar selalu perjalanan dinas: form Perjalanan Dinas tampil kalau jenis pengajuan = Tugas Luar.
function pjPengSync() {
  const wrap = _pjById('pengPerjadinWrap');
  if (!wrap) return;
  const tl = _pjById('pengStatus')?.value === 'tugas_luar';
  wrap.style.display = tl ? '' : 'none';
  // Tugas Luar: Keterangan diganti Rincian Kegiatan (sama seperti form edit Tugas Luar). Cuti tetap pakai Keterangan.
  const ket = _pjById('pengKeteranganWrap');
  if (ket) ket.style.display = tl ? 'none' : '';
}

// Return objek perjadin untuk dikirim bersama pengajuan Tugas Luar, null kalau bukan Tugas Luar,
// atau { error } kalau isian belum lengkap.
function pjPengCollect() {
  if (_pjById('pengStatus')?.value !== 'tugas_luar') return null;
  const data = pjCollect('pjU', false);
  const err = pjValidate(data, false);
  if (err) return { error: err };
  // Tidak perlu dipertanggungjawabkan -> rincian anggaran tidak dikirim.
  if (_pjYN.pjU !== 'ya') delete data.detail;
  return data;
}

// ═══════════════════════════════════════════════════════════════════════════
// 3. INTEGRASI MODAL TAMBAH/EDIT ABSENSI (admin): form Perjalanan Dinas saat status = Tugas Luar
// ═══════════════════════════════════════════════════════════════════════════
// Pelaksana & tanggal selalu diambil server dari absensi yang disimpan, jadi bagian "Pelaksana & Waktu" disembunyikan.
async function pjAbsInit(pjRow, userId = null) {
  const box = _pjById('absPerjadinForm');
  if (!box) return;
  box.innerHTML = pjFormHTML('pjE', true);
  _pjMountWidgets('pjE');
  box.querySelectorAll('details.pj-sec').forEach((d) => {
    if (/^Pelaksana/i.test(d.querySelector('summary')?.textContent || '')) d.style.display = 'none';
  });
  if (pjRow) pjFillForm('pjE', pjRow, true);
  else { _pjById('pjE_kota_asal').value = PJ_KOTA_ASAL_DEFAULT; pjUpdateTotal('pjE'); }
  _pjRenderSumberDana('pjE', pjRow?.sumber_dana || '');   // opsi master dimuat di bawah, nilai lama dijaga
  pjOpenFilledSections('pjE');
  // Nama SKPD hanya baca; Sub Unit SKPD otomatis dari unit kerja pegawai.
  ['nama_skpd', 'sub_unit'].forEach((k) => {
    const el = _pjById(`pjE_${k}`);
    if (el) { el.readOnly = true; el.style.background = 'var(--abu-1)'; el.style.cursor = 'default'; }
  });
  await _pjEnsurePelaksana();
  await _pjEnsureSumberDana();
  _pjRenderSumberDana('pjE');
  const skpd = _pjById('pjE_nama_skpd');
  if (skpd) skpd.value = _pjSkpdDefault || skpd.value || 'Dinas Kesehatan, Pengendalian Penduduk dan Keluarga Berencana';
  pjAbsSetPegawai(userId);
}

// Dipanggil saat pegawai di modal absensi dipilih/diganti (mode tambah) dan saat modal edit dibuka.
function pjAbsSetPegawai(userId) {
  const el = _pjById('pjE_sub_unit');
  if (!el) return;
  const u = (_pjPelaksana || []).find((x) => String(x.id) === String(userId));
  el.value = u?.sub_unit || '';
}

function pjAbsSync() {
  const wrap = _pjById('absPerjadinWrap');
  if (!wrap) return;
  const tl = _pjById('absStatus')?.value === 'tugas_luar';
  wrap.style.display = tl ? '' : 'none';
  pjYNSync('pjE');
  if (tl) {
    const r = _pjById('pjE_rincian_kegiatan');
    if (r && !r.value.trim()) r.value = (_pjById('absKeterangan')?.value || '').trim();
  }
}

// null = bukan Tugas Luar / form belum siap, { error } = isian belum lengkap, selain itu objek perjadin.
// Surat Tugas & Kegiatan wajib untuk semua Tugas Luar; rincian anggaran hanya dikirim kalau jawabannya Ya.
function pjAbsCollect() {
  if (_pjById('absStatus')?.value !== 'tugas_luar' || !_pjById('pjE_rincian_kegiatan')) return null;
  const data = pjCollect('pjE', true);
  ['user_id', 'pelaksana_nama', 'pelaksana_nip', 'tgl_mulai', 'tgl_selesai'].forEach((k) => delete data[k]);
  if (!data.sub_unit) delete data.sub_unit;
  if (!data.no_surat_tugas) return { error: 'No. Surat Tugas wajib diisi' };
  if (!data.tgl_surat_tugas) return { error: 'Tanggal Surat Tugas wajib diisi' };
  const err = pjValidate(data, false);
  if (err) return { error: err };
  return data;
}
