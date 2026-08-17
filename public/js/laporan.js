// ── Inject CSS untuk Month Picker Laporan ────────────────────────────────
(function() {
  if (document.getElementById('lap-mp-style')) return;
  const s = document.createElement('style');
  s.id = 'lap-mp-style';
  s.textContent = `
    .lap-mp { position:relative; display:inline-flex; align-items:center; gap:6px; padding:5px 12px; border:1.5px solid #e2e8f0; border-radius:8px; background:#fff; cursor:pointer; font-size:0.84rem; font-weight:600; color:#0f172a; user-select:none; transition:border-color .15s,box-shadow .15s; min-width:110px; }
    .lap-mp:hover { border-color:#0d9488; }
    .lap-mp.open  { border-color:#0d9488; box-shadow:0 0 0 3px rgba(13,148,136,.10); }
    .lap-mp-label { flex:1; }
    .lap-mp-caret { opacity:.4; flex-shrink:0; }
    .lap-mp-panel { position:absolute; top:calc(100% + 6px); left:0; z-index:1100; background:#fff; border:1.5px solid #e2e8f0; border-radius:14px; box-shadow:0 10px 30px rgba(0,0,0,.13); padding:12px; display:none; min-width:200px; }
    .lap-mp.open .lap-mp-panel { display:block; }
    .lap-mp-nav { display:flex; align-items:center; justify-content:space-between; margin-bottom:10px; }
    .lap-mp-year { font-size:0.9rem; font-weight:800; color:#0f172a; }
    .lap-mp-nav-btn { background:none; border:none; cursor:pointer; padding:4px 6px; border-radius:6px; display:flex; align-items:center; color:#64748b; transition:background .12s; }
    .lap-mp-nav-btn:hover:not(:disabled) { background:#f1f5f9; color:#0d9488; }
    .lap-mp-nav-btn:disabled { opacity:.25; cursor:default; }
    .lap-mp-grid { display:grid; grid-template-columns:repeat(4,1fr); gap:4px; }
    .lap-mp-cell { padding:7px 4px; text-align:center; border-radius:8px; font-size:0.78rem; font-weight:600; color:#374151; cursor:pointer; transition:background .12s,color .12s; }
    .lap-mp-cell:hover:not(.disabled) { background:#f0fdfa; color:#0d9488; }
    .lap-mp-cell.active { background:#0d9488; color:#fff !important; }
    .lap-mp-cell.disabled { color:#cbd5e1; cursor:default; }
    .lap-range-filter { display:inline-flex; align-items:center; gap:8px; flex-wrap:wrap; width:fit-content; max-width:100%; padding:5px 10px 5px 8px; background:#f8fafc; border:1.5px solid #e2e8f0; border-radius:10px; box-sizing:border-box; }
    .lap-range-icon { display:flex; align-items:center; justify-content:center; flex-shrink:0; width:26px; height:26px; border-radius:7px; background:#f0fdfa; color:#0d9488; }
    .lap-range-icon svg { width:15px; height:15px; }
    .lap-range-group { display:flex; align-items:center; gap:7px; flex:0 1 auto; min-width:0; }
    .lap-range-label { font-size:0.72rem; font-weight:700; color:#64748b; white-space:nowrap; flex-shrink:0; }
    .lap-range-group .lap-mp { flex:1 1 auto; min-width:0; border-color:transparent; background:#fff; }
    @media (max-width: 900px) {
      .lap-range-filter { width:100%; max-width:100%; }
      .lap-range-group { flex:1 1 calc(50% - 30px); }
    }
    @media (max-width: 480px) {
      .lap-range-filter { gap:6px; flex-wrap:nowrap; padding:5px 8px; }
      .lap-range-icon { display:none; }
      .lap-range-group { flex:1 1 50%; min-width:0; }
      .lap-range-label { font-size:0.66rem; }
      .lap-mp { min-width:0; width:100%; padding:6px 8px; box-sizing:border-box; gap:4px; }
      .lap-mp-label { overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
      .lap-mp-panel { left:0; right:auto; min-width:0; width:200px; }
    }
  `;
  document.head.appendChild(s);
})();

// laporan.js - Fungsi Laporan Surat & Laporan Kinerja

// ══════════════════════════════════════════════════════
//  LAPORAN ABSENSI
// ══════════════════════════════════════════════════════

let _lapAbsPage = 1;
let _lapAbsFilterBidang = '';
let _lapAbsFilterStatus = '';
let _lapAbsAllPegawai = [];   // cache semua pegawai (non-admin) beserta bidang_id, buat narrow-in filter Unit Kerja

async function _populateLapAbsFilters() {
  const bulanSel = document.getElementById('lapAbsBulan');
  const tahunSel = document.getElementById('lapAbsTahun');
  const bidangWrap = document.getElementById('lapAbsBidangWrap');
  const pegawaiWrap = document.getElementById('lapAbsPegawaiWrap');
  const thNama = document.getElementById('lapAbsThNama');
  const now = new Date();
  const full = typeof isAbsensiFull === 'function' && isAbsensiFull();

  if (tahunSel && !tahunSel.dataset.rebuilt) {
    tahunSel.dataset.rebuilt = '1';
    await _rebuildLapAbsFilterTahun();
  }

  if (bidangWrap) bidangWrap.style.display = full ? '' : 'none';
  if (pegawaiWrap) pegawaiWrap.style.display = full ? '' : 'none';
  if (thNama) thNama.style.display = full ? '' : 'none';

  if (full) {
    if (!document.getElementById('lapAbsBidang')?.dataset.rebuilt) {
      if (document.getElementById('lapAbsBidang')) document.getElementById('lapAbsBidang').dataset.rebuilt = '1';
      await _rebuildLapAbsFilterBidang();
    }
    await _populateLapAbsPegawai();
  }

  // Dropdown bulan cuma di-rebuild sekali per kunjungan halaman - perubahan
  // filter Unit Kerja/Pegawai/Tahun setelahnya masing-masing manggil ulang
  // _rebuildLapAbsFilterBulan() lewat handler-nya sendiri.
  if (bulanSel && !bulanSel.dataset.rebuilt) {
    bulanSel.dataset.rebuilt = '1';
    await _rebuildLapAbsFilterBulan();
  }

  const statusSel = document.getElementById('lapAbsStatus');
  if (statusSel && !statusSel.dataset.rebuilt) {
    statusSel.dataset.rebuilt = '1';
    await _rebuildLapAbsFilterStatus();
  }
}

// Dropdown Tahun menyesuaikan data yg ADA (& pegawai yg sedang difilter) -
// bukan 4 tahun statis. Sama seperti di halaman Absensi.
async function _rebuildLapAbsFilterTahun() {
  const sel = document.getElementById('lapAbsTahun');
  if (!sel) return;
  const full = typeof isAbsensiFull === 'function' && isAbsensiFull();
  const pegawaiId = full ? (document.getElementById('lapAbsPegawai')?.value || '') : '';

  let tahunPresent = [];
  try {
    const params = new URLSearchParams();
    if (pegawaiId) params.set('user_id', pegawaiId);
    const r = await fetch(`/api/absensi/tahun-tersedia?${params}`, { headers: authHeaders() });
    const d = await r.json();
    tahunPresent = d.tahun || [];
  } catch { tahunPresent = []; }

  const cur = sel.value ? parseInt(sel.value) : new Date().getFullYear();
  let opts;
  if (tahunPresent.length <= 1) {
    opts = [tahunPresent[0] || new Date().getFullYear()];
  } else {
    opts = tahunPresent;
  }
  sel.innerHTML = opts.map(y => `<option value="${y}">${y}</option>`).join('');
  sel.value = tahunPresent.length <= 1
    ? (tahunPresent[0] || new Date().getFullYear())
    : (tahunPresent.includes(cur) ? cur : tahunPresent[0]);
  syncCustomSelect?.('lapAbsTahun');
}

// Dropdown Unit Kerja menyesuaikan data yg ADA utk tahun (& pegawai yg sedang
// difilter) terpilih - sama kayak dropdown bulan, bukan daftar statis semua
// unit kerja di master data.
async function _rebuildLapAbsFilterBidang() {
  const sel = document.getElementById('lapAbsBidang');
  if (!sel) return;
  const tahun = document.getElementById('lapAbsTahun')?.value || new Date().getFullYear();
  const pegawaiId = document.getElementById('lapAbsPegawai')?.value || '';

  let bidangList = [];
  try {
    const params = new URLSearchParams({ tahun });
    if (pegawaiId) params.set('user_id', pegawaiId);
    const r = await fetch(`/api/absensi/bidang-tersedia?${params}`, { headers: authHeaders() });
    const d = await r.json();
    bidangList = d.bidang || [];
  } catch { bidangList = []; }

  const cur = sel.value;
  if (bidangList.length === 1) {
    sel.innerHTML = `<option value="${bidangList[0].id}">${esc(bidangList[0].nama)}</option>`;
    sel.value = String(bidangList[0].id);
    _lapAbsFilterBidang = String(bidangList[0].id);
  } else {
    sel.innerHTML = '<option value="">Semua Unit Kerja</option>' +
      bidangList.map(b => `<option value="${b.id}">${esc(b.nama)}</option>`).join('');
    const keepCur = bidangList.some(b => String(b.id) === String(cur));
    sel.value = keepCur ? cur : '';
    _lapAbsFilterBidang = keepCur ? cur : '';
  }
  syncCustomSelect?.('lapAbsBidang');
}

async function _populateLapAbsPegawai() {
  const sel = document.getElementById('lapAbsPegawai');
  if (!sel) return;
  if (!sel.dataset.fetched) {
    try {
      const r = await fetch('/api/users', { headers: authHeaders() });
      const d = await r.json();
      _lapAbsAllPegawai = (d.users || []).filter(u => !u.is_admin);
      sel.dataset.fetched = '1';
    } catch { _lapAbsAllPegawai = []; }
  }
  _renderLapAbsPegawaiOptions();
}

function _renderLapAbsPegawaiOptions() {
  const sel = document.getElementById('lapAbsPegawai');
  if (!sel) return;
  const list = _lapAbsFilterBidang
    ? _lapAbsAllPegawai.filter(u => String(u.bidang_id) === String(_lapAbsFilterBidang))
    : _lapAbsAllPegawai;
  const cur = sel.value;
  const keepVal = list.some(u => String(u.id) === String(cur)) ? cur : '';
  sel.innerHTML = '<option value="">Semua Pegawai</option>' +
    list.map(u => `<option value="${u.id}">${esc(u.nama)}</option>`).join('');
  sel.value = keepVal;
  syncCustomSelect?.('lapAbsPegawai');
}

// Dropdown bulan menyesuaikan data yg ADA utk tahun (& pegawai/unit kerja yg
// sedang difilter) - bukan 12 bulan statis. Sama seperti di halaman Absensi.
async function _rebuildLapAbsFilterBulan() {
  const bulanSel = document.getElementById('lapAbsBulan');
  if (!bulanSel) return;
  const full = typeof isAbsensiFull === 'function' && isAbsensiFull();
  const tahun = document.getElementById('lapAbsTahun')?.value || new Date().getFullYear();
  const pegawaiId = full ? (document.getElementById('lapAbsPegawai')?.value || '') : (_user?.id || '');

  let bulanPresent = [];
  try {
    const params = new URLSearchParams({ tahun });
    if (pegawaiId) params.set('user_id', pegawaiId);
    if (full && _lapAbsFilterBidang) params.set('bidang_id', _lapAbsFilterBidang);
    const r = await fetch(`/api/absensi/bulan-tersedia?${params}`, { headers: authHeaders() });
    const d = await r.json();
    bulanPresent = d.bulan || [];
  } catch { bulanPresent = []; }

  const curVal = bulanSel.value ? parseInt(bulanSel.value) : (new Date().getMonth() + 1);
  let opts;
  if (bulanPresent.length <= 1) {
    const m = bulanPresent[0] || (new Date().getMonth() + 1);
    opts = [{ value: m, label: ABS_BULAN_NAMA[m] }];
  } else {
    opts = [{ value: '', label: 'Semua Bulan' }, ...bulanPresent.map(m => ({ value: m, label: ABS_BULAN_NAMA[m] }))];
  }
  bulanSel.innerHTML = opts.map(o => `<option value="${o.value}">${o.label}</option>`).join('');
  bulanSel.value = bulanPresent.length <= 1
    ? (bulanPresent[0] || (new Date().getMonth() + 1))
    : (bulanPresent.includes(curVal) ? curVal : '');
  syncCustomSelect?.('lapAbsBulan');
}

// Sama kayak _rebuildLapAbsFilterBulan - cuma tampilin opsi status yg beneran
// ada datanya di bulan/tahun (& pegawai/unit kerja) yg lagi difilter
async function _rebuildLapAbsFilterStatus() {
  const sel = document.getElementById('lapAbsStatus');
  if (!sel) return;
  const full = typeof isAbsensiFull === 'function' && isAbsensiFull();
  const tahun = document.getElementById('lapAbsTahun')?.value || new Date().getFullYear();
  const bulan = document.getElementById('lapAbsBulan')?.value || '';
  const pegawaiId = full ? (document.getElementById('lapAbsPegawai')?.value || '') : (_user?.id || '');

  let statusPresent = [];
  try {
    const params = new URLSearchParams({ tahun });
    if (bulan) params.set('bulan', bulan);
    if (pegawaiId) params.set('user_id', pegawaiId);
    if (full && _lapAbsFilterBidang) params.set('bidang_id', _lapAbsFilterBidang);
    const r = await fetch(`/api/absensi/status-tersedia?${params}`, { headers: authHeaders() });
    const d = await r.json();
    statusPresent = d.status || [];
  } catch { statusPresent = []; }

  const present = STATUS_FILTER_ORDER.filter(k => statusPresent.includes(k));
  const opts = [{ value: '', label: 'Semua Status' }, ...present.map(k => ({ value: k, label: STATUS_FILTER_LABEL[k] }))];
  if (_lapAbsFilterStatus && !present.includes(_lapAbsFilterStatus)) _lapAbsFilterStatus = '';

  sel.innerHTML = opts.map(o => `<option value="${o.value}">${o.label}</option>`).join('');
  sel.value = _lapAbsFilterStatus;
  syncCustomSelect?.('lapAbsStatus');
}

// Ganti bulan langsung (opsi yg ditampilkan sudah pasti ada datanya) - gak perlu rebuild dropdown bulan,
// tapi opsi Status yg tersedia bisa berubah
async function setLapAbsFilterBulan() {
  await _rebuildLapAbsFilterStatus();
  loadLaporanAbsensi(1);
}

// Filter Status cuma mempersempit tabel detail - kartu rekap (KPI) di atas tetap
// nunjukin total keseluruhan bulan itu
function setLapAbsFilterStatus() {
  _lapAbsFilterStatus = document.getElementById('lapAbsStatus')?.value || '';
  loadLaporanAbsensi(1);
}

// Ganti tahun → daftar bulan & unit kerja yg ada datanya bisa berubah, rebuild dropdown dulu
async function setLapAbsFilterTahun() {
  await _rebuildLapAbsFilterBidang();
  await _rebuildLapAbsFilterBulan();
  await _rebuildLapAbsFilterStatus();
  loadLaporanAbsensi(1);
}

// Ganti Pegawai → daftar tahun & bulan yg ada datanya bisa berubah juga
async function setLapAbsFilterPegawai() {
  await _rebuildLapAbsFilterTahun();
  await _rebuildLapAbsFilterBulan();
  await _rebuildLapAbsFilterStatus();
  loadLaporanAbsensi(1);
}

// Ganti Unit Kerja → narrow-in dropdown Pegawai ke bidang terpilih, lalu rebuild dropdown bulan
async function setLapAbsFilterBidang() {
  _lapAbsFilterBidang = document.getElementById('lapAbsBidang')?.value || '';
  _renderLapAbsPegawaiOptions();
  await _rebuildLapAbsFilterBulan();
  await _rebuildLapAbsFilterStatus();
  loadLaporanAbsensi(1);
}

// ══════════════════════════════════════════════════════
//  DOWNLOAD / PREVIEW LAPORAN ABSENSI - PDF
// ══════════════════════════════════════════════════════

// ── Filter rentang tanggal (dari-sampai) - alternatif Bulan/Tahun ──
function _rentangTanggalYMDLap(mulaiStr, selesaiStr) {
  const parse = (s) => { const [y, m, d] = s.split('-').map(Number); return Date.UTC(y, m - 1, d); };
  const fmt = (t) => {
    const dt = new Date(t);
    const y = dt.getUTCFullYear();
    const m = String(dt.getUTCMonth() + 1).padStart(2, '0');
    const d = String(dt.getUTCDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  };
  const list = [];
  for (let t = parse(mulaiStr); t <= parse(selesaiStr); t += 86400000) list.push(fmt(t));
  return list;
}

function _lapAbsRangeToggleClearBtn() {
  const dari = document.getElementById('lapAbsDari')?.value || '';
  const sampai = document.getElementById('lapAbsSampai')?.value || '';
  const btn = document.getElementById('lapAbsRangeClearBtn');
  if (btn) btn.style.display = (dari || sampai) ? '' : 'none';
}

function _lapAbsRangeClear() {
  document.getElementById('lapAbsDari').value = '';
  document.getElementById('lapAbsSampai').value = '';
  document.getElementById('cdtp_lapAbsDari')?._cdtp?.set(null);
  document.getElementById('cdtp_lapAbsSampai')?._cdtp?.set(null);
  _lapAbsRangeToggleClearBtn();
}

async function downloadLaporanAbsensiPDF(btnEl) {
  const full = typeof isAbsensiFull === 'function' && isAbsensiFull();
  document.getElementById('cdtp_lapAbsDari')?._cdtp?.commit();
  document.getElementById('cdtp_lapAbsSampai')?._cdtp?.commit();
  const dari = document.getElementById('lapAbsDari')?.value || '';
  const sampai = document.getElementById('lapAbsSampai')?.value || '';
  const rangeMode = !!(dari && sampai);
  const bulan = document.getElementById('lapAbsBulan')?.value || '';
  const tahun = parseInt(document.getElementById('lapAbsTahun')?.value || new Date().getFullYear());
  const pegawaiId = full ? (document.getElementById('lapAbsPegawai')?.value || '') : String(_user.id);
  const bidangId = full ? (document.getElementById('lapAbsBidang')?.value || '') : '';

  if (rangeMode && sampai < dari) {
    toast('Sampai Tanggal tidak boleh sebelum Dari Tanggal', 'error');
    return;
  }
  if (!rangeMode && !bulan) {
    toast('Pilih bulan tertentu dulu (bukan "Semua Bulan"), atau isi rentang tanggal, untuk cetak laporan ini', 'error');
    return;
  }
  const bulanInt = parseInt(bulan);

  const originalHtml = btnEl ? btnEl.innerHTML : '';
  if (btnEl) { btnEl.disabled = true; btnEl.innerHTML = `<span class="btn-spin" style="width:12px;height:12px"></span> Memuat data...`; }

  try {
    // ── Daftar pegawai yg ditampilkan (baris) - semua pegawai dlm scope filter,
    // bukan cuma yg kebetulan punya baris absensi bulan ini ──
    let pegawaiList;
    if (full) {
      pegawaiList = pegawaiId
        ? _lapAbsAllPegawai.filter(u => String(u.id) === String(pegawaiId))
        : (bidangId ? _lapAbsAllPegawai.filter(u => String(u.bidang_id) === String(bidangId)) : _lapAbsAllPegawai);
    } else {
      pegawaiList = [{ id: _user.id, nama: _user.nama }];
    }
    // Urutan tampil: pegawai yang sudah diatur manual (urutan_laporan) tampil
    // sesuai urutan itu duluan; sisanya yang belum diatur nyusul di-sort A-Z.
    pegawaiList = [...pegawaiList].sort((a, b) => {
      const ua = a.urutan_laporan, ub = b.urutan_laporan;
      if (ua != null && ub != null) return ua - ub;
      if (ua != null) return -1;
      if (ub != null) return 1;
      return (a.nama || '').localeCompare(b.nama || '');
    });

    if (!pegawaiList.length) {
      toast('Tidak ada pegawai pada Unit Kerja yang dipilih', 'error');
      return;
    }

    // ── Jam Kerja per pegawai (kolom rekap tambahan) - cuma dihitung kalau BUKAN
    // mode rentang tanggal custom, krn endpoint /api/absensi/jam-kerja cuma
    // terima bulan+tahun (bukan rentang tanggal bebas). Mode rentang tampil "-".
    let jamKerjaMap = new Map();
    if (!rangeMode) {
      const hasilJK = await Promise.all(pegawaiList.map(async (peg) => {
        try {
          const jr = await fetch(`/api/absensi/jam-kerja?bulan=${bulanInt}&tahun=${tahun}&user_id=${peg.id}`, { headers: authHeaders() });
          if (!jr.ok) throw new Error(`HTTP ${jr.status}`);
          return [peg.id, await jr.json()];
        } catch { return [peg.id, null]; }
      }));
      jamKerjaMap = new Map(hasilJK);
    }

    // ── Ambil semua baris absensi periode ini (server dipaginasi 10/hal) ──
    // Dulu: loop semua halaman BERURUTAN (satu-satu nunggu round-trip
    // sebelumnya) - buat laporan sebulan penuh × banyak pegawai bisa jadi
    // puluhan request berantai. Sekarang: halaman 1 diambil dulu (buat tau
    // totalPages), sisanya (2..N) ditembak PARALEL (dibatasi 6 bareng biar
    // gak nge-flood function/DB).
    const _lapAbsQS = (page) => {
      const qs = rangeMode
        ? new URLSearchParams({ dari, sampai, page })
        : new URLSearchParams({ bulan, tahun, page });
      if (bidangId) qs.set('bidang_id', bidangId);
      if (pegawaiId) qs.set('user_id', pegawaiId);
      return qs;
    };
    const r1 = await fetch(`/api/absensi?${_lapAbsQS(1)}`, { headers: authHeaders() });
    const d1 = await r1.json();
    let allRows = d1.absensi || [];
    const totalPages = Math.max(1, Math.ceil((d1.total || 0) / 10));

    if (totalPages > 1) {
      const restPages = Array.from({ length: totalPages - 1 }, (_, i) => i + 2); // halaman 2..totalPages
      const pageResults = new Array(restPages.length);
      let idx = 0;
      async function _lapAbsWorker() {
        while (idx < restPages.length) {
          const myIdx = idx++;
          try {
            const r = await fetch(`/api/absensi?${_lapAbsQS(restPages[myIdx])}`, { headers: authHeaders() });
            const d = await r.json();
            pageResults[myIdx] = d.absensi || [];
          } catch { pageResults[myIdx] = []; }
        }
      }
      await Promise.all(Array.from({ length: Math.min(6, restPages.length) }, () => _lapAbsWorker()));
      pageResults.forEach(rows => { allRows = allRows.concat(rows); });
    }

    // ── Hari libur periode ini (tetap ditampilkan, tapi dikasih warna khusus) ──
    let liburMap = new Map();
    try {
      if (rangeMode) {
        const tahunAwal = parseInt(dari.slice(0, 4));
        const tahunAkhir = parseInt(sampai.slice(0, 4));
        for (let ty = tahunAwal; ty <= tahunAkhir; ty++) {
          const lr = await fetch(`/api/absensi/libur?tahun=${ty}`, { headers: authHeaders() });
          const ld = await lr.json();
          (ld.libur || []).forEach(l => {
            const ymd = _absLiburLocalYMD(l.tanggal);
            if (ymd >= dari && ymd <= sampai) liburMap.set(ymd, l.keterangan || 'Libur');
          });
        }
      } else {
        const lr = await fetch(`/api/absensi/libur?tahun=${tahun}&bulan=${bulanInt}`, { headers: authHeaders() });
        const ld = await lr.json();
        (ld.libur || []).forEach(l => liburMap.set(_absLiburLocalYMD(l.tanggal), l.keterangan || 'Libur'));
      }
    } catch { liburMap = new Map(); }

    // ── Kolom tanggal: SEMUA tanggal dalam periode ini (termasuk weekend & libur) ──
    const DOW_NAMA = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];
    const kolomTanggal = [];
    if (rangeMode) {
      for (const ymd of _rentangTanggalYMDLap(dari, sampai)) {
        const [ty, tm, td] = ymd.split('-').map(Number);
        const dow = new Date(ty, tm - 1, td).getDay();
        const isWeekend = dow === 0 || dow === 6;
        const isLibur = liburMap.has(ymd);
        kolomTanggal.push({ hari: td, ymd, dowLabel: DOW_NAMA[dow], isWeekend, isLibur, liburKet: liburMap.get(ymd) || '' });
      }
    } else {
      const jumlahHari = new Date(tahun, bulanInt, 0).getDate();
      for (let d = 1; d <= jumlahHari; d++) {
        const dow = new Date(tahun, bulanInt - 1, d).getDay();
        const ymd = `${tahun}-${String(bulanInt).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
        const isWeekend = dow === 0 || dow === 6;
        const isLibur = liburMap.has(ymd);
        kolomTanggal.push({ hari: d, ymd, dowLabel: DOW_NAMA[dow], isWeekend, isLibur, liburKet: liburMap.get(ymd) || '' });
      }
    }

    // ── Peta absensi: "user_id|YYYY-MM-DD" → baris ──
    const absMap = new Map();
    allRows.forEach(a => {
      const ymd = _absLiburLocalYMD(a.tanggal);
      absMap.set(`${a.user_id}|${ymd}`, a);
    });

    // Warna per status: fill (background) + teks. Warna netral abu-abu utk
    // hari yg emang bukan hari kerja (weekend/libur) & belum ada catatan.
    const KODE = {
      hadir_ontime: { txt: '✓', bg: '#d1fae5', color: '#059669' },
      terlambat:    { txt: 'T',  bg: '#fef3c7', color: '#b45309' },
      tidak_lengkap:{ txt: '!',  bg: '#ede9fe', color: '#6d28d9' },
      tugas_luar:   { txt: 'TL', bg: '#dbeafe', color: '#1d4ed8' },
      cuti:         { txt: 'C',  bg: '#fae8ff', color: '#a21caf' },
      alpa:         { txt: 'A',  bg: '#fee2e2', color: '#b91c1c' },
    };
    const svgHadirIcon     = `<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="${KODE.hadir_ontime.color}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M9 12l2 2 4-4"/><circle cx="12" cy="12" r="10"/></svg>`;
    const svgTerlambatIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="${KODE.terlambat.color}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><polyline points="12 7 12 12 16 14"/></svg>`;
    const svgTidakLengkapIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="${KODE.tidak_lengkap.color}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect width="8" height="4" x="8" y="2" rx="1" ry="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><path d="m15 11-6 6"/><path d="m9 11 6 6"/></svg>`;
    const svgTugasIcon     = `<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="${KODE.tugas_luar.color}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect width="20" height="14" x="2" y="7" rx="2" ry="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg>`;
    const svgCutiIcon      = `<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="${KODE.cuti.color}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="18" x="3" y="4" rx="2"/><path d="M3 10h18"/><path d="M8 2v4"/><path d="M16 2v4"/></svg>`;
    const svgAlpaIcon      = `<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="${KODE.alpa.color}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3"/><line x1="12" x2="12" y1="9" y2="13"/><line x1="12" x2="12.01" y1="17" y2="17"/></svg>`;
    KODE.hadir_ontime.icon = svgHadirIcon;
    KODE.terlambat.icon    = svgTerlambatIcon;
    KODE.tidak_lengkap.icon= svgTidakLengkapIcon;
    KODE.tugas_luar.icon   = svgTugasIcon;
    KODE.cuti.icon         = svgCutiIcon;
    KODE.alpa.icon         = svgAlpaIcon;
    const WARNA_LIBUR   = { bg: '#fee2e2', color: '#b91c1c' };
    const WARNA_WEEKEND = { bg: '#fef2f2', color: '#ef4444' };
    const svgWeekendCell = `<svg xmlns="http://www.w3.org/2000/svg" width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="${WARNA_WEEKEND.color}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/></svg>`;
    const svgLiburCell   = `<svg xmlns="http://www.w3.org/2000/svg" width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="${WARNA_LIBUR.color}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" x2="4" y1="22" y2="15"/></svg>`;

    const bulanLabel = ABS_BULAN_NAMA[bulanInt];
    const _fmtLapTgl = (ymd) => { const [y, m, d] = ymd.split('-').map(Number); return `${String(d).padStart(2, '0')} ${ABS_BULAN_NAMA[m]} ${y}`; };
    const periodeLabel = rangeMode
      ? (dari === sampai ? _fmtLapTgl(dari) : `${_fmtLapTgl(dari)} – ${_fmtLapTgl(sampai)}`)
      : `${bulanLabel} ${tahun}`;
    const unitLabel = full ? (document.getElementById('lapAbsBidang')?.selectedOptions?.[0]?.textContent || 'Semua Unit Kerja') : '';
    const kepalaDinas = await _fetchKepalaDinas();
    const nowStrTtd = new Date().toLocaleDateString('id-ID', { day:'2-digit', month:'long', year:'numeric' });

    const svgHadirHdr     = `<svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M9 12l2 2 4-4"/><circle cx="12" cy="12" r="10"/></svg>`;
    const svgTerlambatHdr = `<svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><polyline points="12 7 12 12 16 14"/></svg>`;
    const svgTidakLengkapHdr = `<svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect width="8" height="4" x="8" y="2" rx="1" ry="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><path d="m15 11-6 6"/><path d="m9 11 6 6"/></svg>`;
    const svgTugasHdr     = `<svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect width="20" height="14" x="2" y="7" rx="2" ry="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg>`;
    const svgCutiHdr      = `<svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="18" x="3" y="4" rx="2"/><path d="M3 10h18"/><path d="M8 2v4"/><path d="M16 2v4"/></svg>`;
    const svgAlpaHdr      = `<svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3"/><line x1="12" x2="12" y1="9" y2="13"/><line x1="12" x2="12.01" y1="17" y2="17"/></svg>`;
    const svgTotalHdr     = `<svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M3 3v18h18"/><path d="M18 17V9"/><path d="M13 17V5"/><path d="M8 17v-3"/></svg>`;
    const svgTotalLegend  = `<svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#0f766e" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M3 3v18h18"/><path d="M18 17V9"/><path d="M13 17V5"/><path d="M8 17v-3"/></svg>`;
    const svgJamKerjaHdr    = `<svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="10" x2="14" y1="2" y2="2"/><line x1="12" x2="15" y1="14" y2="11"/><circle cx="12" cy="14" r="8"/></svg>`;
    const svgJamKerjaLegend = `<svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#0f766e" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="10" x2="14" y1="2" y2="2"/><line x1="12" x2="15" y1="14" y2="11"/><circle cx="12" cy="14" r="8"/></svg>`;

    // ── Baris per pegawai ──
    const bodyRows = pegawaiList.map((peg, i) => {
      let cHadir = 0, cTerlambat = 0, cTidakLengkap = 0, cTugas = 0, cCuti = 0, cAlpa = 0;
      const cells = kolomTanggal.map(k => {
        const a = absMap.get(`${peg.id}|${k.ymd}`);
        if (a) {
          const isToday = k.ymd === todayISO();
          // Hari ini + udah absensi masuk tapi belum absensi keluar → masih "Menunggu Absensi
          // Keluar" (proses), BUKAN langsung Tepat Waktu - baru dihitung Tepat Waktu/
          // Tidak Lengkap setelah absensi keluar tercatat (lihat isPending di tabel Laporan
          // Absensi biasa, versi cetak PDF ini sempet ketinggalan nyontek logikanya).
          const isPending = isToday && a.status === 'hadir' && a.jam_masuk && !a.jam_keluar;
          const isTidakLengkap = !isPending && a.status === 'hadir' && (!a.jam_masuk || !a.jam_keluar) && !isToday;
          const isTerlambat = a.status === 'hadir' && a.terlambat;
          if (isPending) { /* belum ditotal ke rekap kolom manapun sampai absensi keluar tercatat */ }
          else if (isTidakLengkap) cTidakLengkap++;
          else if (isTerlambat) cTerlambat++;
          else if (a.status === 'hadir') cHadir++;
          else if (a.status === 'tugas_luar') cTugas++;
          else if (a.status === 'cuti') cCuti++;
          else if (a.status === 'alpa') cAlpa++;
          // Pending → sel dikosongin aja, sama kayak hari yg belum ada catatan sama
          // sekali; nunjukkin status "menunggu" di sini kurang informatif buat dibaca.
          if (isPending) return `<td style="border:1px solid #0f766e;text-align:center;font-size:8px;height:22px">&nbsp;</td>`;
          const kode = isTidakLengkap ? KODE.tidak_lengkap : isTerlambat ? KODE.terlambat : (a.status === 'tugas_luar' ? KODE.tugas_luar : a.status === 'cuti' ? KODE.cuti : a.status === 'alpa' ? KODE.alpa : KODE.hadir_ontime);
          const adaJam = a.status === 'hadir'; // cuma status hadir yg punya jam_masuk/jam_keluar
          const isiSel = kode.icon;
          return `<td style="border:1px solid #0f766e;text-align:center;background:${kode.bg};padding:1px 0;overflow:hidden;height:22px">${isiSel}</td>`;
        }
        if (k.isLibur) return `<td title="${esc(k.liburKet)}" style="border:1px solid #0f766e;background:${WARNA_LIBUR.bg};text-align:center;height:22px">${svgLiburCell}</td>`;
        if (k.isWeekend) return `<td style="border:1px solid #0f766e;background:${WARNA_WEEKEND.bg};text-align:center;height:22px">${svgWeekendCell}</td>`;
        return `<td style="border:1px solid #0f766e;text-align:center;font-size:8px;height:22px">&nbsp;</td>`;
      }).join('');
      const jumlahKehadiran = cHadir + cTerlambat + cTidakLengkap;
      const jk = jamKerjaMap.get(peg.id);
      const jkPct = jk ? Math.max(0, jk.persentase || 0) : 0;
      const jkWarna = (!rangeMode && jk && typeof _kinerjaSkalaWarna === 'function') ? _kinerjaSkalaWarna(jkPct).warna : null;
      const jamKerjaTxt = rangeMode
        ? '-'
        : (jk ? `${esc(_absFmtJam(jk.aktual_menit || 0))}<div style="font-size:7px;font-weight:400;color:${jkWarna || '#64748b'}">${Math.round(jkPct)}%</div>` : '-');
      const rekapCell = (val, highlight, color) => `<td style="border:1px solid #0f766e;text-align:center;font-size:9px;font-weight:${highlight ? 700 : 400};color:${color || '#0f766e'};background:${highlight ? '#f0fdfa' : '#fff'};padding:3px 4px;vertical-align:middle">${val}</td>`;
      return `<tr>
        <td style="border:1px solid #0f766e;text-align:center;font-size:8px;padding:3px 4px;vertical-align:middle;height:22px">${i + 1}</td>
        <td style="border:1px solid #0f766e;font-size:8px;padding:3px 6px;white-space:nowrap;vertical-align:middle;height:22px">
          <div>${esc(peg.nama || '')}</div>
          ${peg.nip ? `<div style="font-size:7px;color:#64748b;font-weight:400">NIP. ${esc(peg.nip)}</div>` : ''}
        </td>
        ${cells}
        ${rekapCell(cHadir)}${rekapCell(cTerlambat)}${rekapCell(cTidakLengkap)}${rekapCell(cTugas)}${rekapCell(cCuti)}${rekapCell(cAlpa)}${rekapCell(jumlahKehadiran, true)}${rekapCell(jamKerjaTxt, true, jkWarna)}
      </tr>`;
    }).join('');

    // ── Header 3 baris: judul bulan / "Tanggal" / no urut tanggal / hari ──
    // Header dibuat seragam (gak dibedain warnanya per weekend/libur) - pembeda
    // weekend/libur cukup di sel body pakai ikon + warna, biar header tetap bersih.
    const REKAP_KOLOM = [
      { icon: svgHadirHdr,     title: 'Tepat Waktu' },
      { icon: svgTerlambatHdr, title: 'Terlambat' },
      { icon: svgTidakLengkapHdr, title: 'Tidak Lengkap' },
      { icon: svgTugasHdr,     title: 'Tugas Luar' },
      { icon: svgCutiHdr,      title: 'Cuti' },
      { icon: svgAlpaHdr,      title: 'Alpa' },
      { icon: svgTotalHdr,     title: 'Jumlah Kehadiran' },
      { icon: svgJamKerjaHdr,  title: 'Jam Kerja' },
    ];
    const headerHtml = `
      <thead>
        <tr>
          <th rowspan="3" style="border:1px solid #0f766e;background:#0d9488;color:#fff;font-size:8px;padding:3px 4px">NO</th>
          <th rowspan="3" style="border:1px solid #0f766e;background:#0d9488;color:#fff;font-size:8px;padding:3px 6px">NAMA</th>
          <th colspan="${kolomTanggal.length}" style="border:1px solid #0f766e;background:#0d9488;color:#fff;font-size:8px;padding:4px">TANGGAL</th>
          <th colspan="${REKAP_KOLOM.length}" style="border:1px solid #0f766e;background:#0d9488;color:#fff;font-size:8px;padding:4px">REKAP</th>
        </tr>
        <tr>
          ${kolomTanggal.map(k => `<th style="border:1px solid #0f766e;background:#0d9488;color:#fff;font-size:8px;padding:2px">${k.hari}</th>`).join('')}
          ${REKAP_KOLOM.map(r => `<th rowspan="2" title="${r.title}" style="border:1px solid #0f766e;background:#0d9488;color:#fff;font-size:8px;padding:2px;min-width:22px">${r.icon}</th>`).join('')}
        </tr>
        <tr>
          ${kolomTanggal.map(k => `<th style="border:1px solid #0f766e;background:#0d9488;color:#fff;font-size:8px;padding:2px">${k.dowLabel}</th>`).join('')}
        </tr>
      </thead>`;

    // ── Keterangan pakai ikon SVG kecil, bukan huruf ──
    const svgHadir = `<svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="${KODE.hadir_ontime.color}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M9 12l2 2 4-4"/><circle cx="12" cy="12" r="10"/></svg>`;
    const svgTerlambat = `<svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="${KODE.terlambat.color}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><polyline points="12 7 12 12 16 14"/></svg>`;
    const svgTidakLengkap = `<svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="${KODE.tidak_lengkap.color}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect width="8" height="4" x="8" y="2" rx="1" ry="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><path d="m15 11-6 6"/><path d="m9 11 6 6"/></svg>`;
    const svgTugas = `<svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="${KODE.tugas_luar.color}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect width="20" height="14" x="2" y="7" rx="2" ry="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg>`;
    const svgCuti = `<svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="${KODE.cuti.color}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="18" x="3" y="4" rx="2"/><path d="M3 10h18"/><path d="M8 2v4"/><path d="M16 2v4"/></svg>`;
    const svgAlpa = `<svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="${KODE.alpa.color}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3"/><line x1="12" x2="12" y1="9" y2="13"/><line x1="12" x2="12.01" y1="17" y2="17"/></svg>`;

    const bodyHtml = `
      ${_kopSuratHtml()}
      <div style="text-align:center;margin:14px 0 12px">
        <div style="font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:.5px">Laporan Absensi</div>
        <div style="font-size:11px;color:#64748b;margin-top:4px">Periode : ${periodeLabel}${full ? `&nbsp;&nbsp;&nbsp;&nbsp;Unit Kerja : ${unitLabel}` : ''}</div>
      </div>
      <table style="border-collapse:collapse">
        ${headerHtml}
        <tbody>${bodyRows}</tbody>
      </table>
      <div style="margin-top:8px;display:flex;align-items:flex-start;justify-content:space-between">
        <div style="font-size:8px;color:#475569">
          <div style="font-weight:700;margin-bottom:4px">Keterangan:</div>
          <div style="display:grid;grid-template-columns:repeat(2,1fr);gap:4px 16px">
            <div style="display:flex;align-items:center;gap:5px"><span style="display:inline-flex;align-items:center;justify-content:center;width:12px;flex-shrink:0">${svgHadir}</span>Tepat Waktu</div>
            <div style="display:flex;align-items:center;gap:5px"><span style="display:inline-flex;align-items:center;justify-content:center;width:12px;flex-shrink:0">${svgTerlambat}</span>Terlambat</div>
            <div style="display:flex;align-items:center;gap:5px"><span style="display:inline-flex;align-items:center;justify-content:center;width:12px;flex-shrink:0">${svgTidakLengkap}</span>Tidak Lengkap</div>
            <div style="display:flex;align-items:center;gap:5px"><span style="display:inline-flex;align-items:center;justify-content:center;width:12px;flex-shrink:0">${svgTugas}</span>Tugas Luar</div>
            <div style="display:flex;align-items:center;gap:5px"><span style="display:inline-flex;align-items:center;justify-content:center;width:12px;flex-shrink:0">${svgCuti}</span>Cuti</div>
            <div style="display:flex;align-items:center;gap:5px"><span style="display:inline-flex;align-items:center;justify-content:center;width:12px;flex-shrink:0">${svgAlpa}</span>Alpa</div>
            <div style="display:flex;align-items:center;gap:5px"><span style="display:inline-flex;align-items:center;justify-content:center;width:12px;flex-shrink:0">${svgWeekendCell}</span>Akhir Pekan</div>
            <div style="display:flex;align-items:center;gap:5px"><span style="display:inline-flex;align-items:center;justify-content:center;width:12px;flex-shrink:0">${svgLiburCell}</span>Hari Libur</div>
            <div style="display:flex;align-items:center;gap:5px"><span style="display:inline-flex;align-items:center;justify-content:center;width:12px;flex-shrink:0">${svgTotalLegend}</span>Jumlah Kehadiran</div>
            <div style="display:flex;align-items:center;gap:5px"><span style="display:inline-flex;align-items:center;justify-content:center;width:12px;flex-shrink:0">${svgJamKerjaLegend}</span>Jam Kerja</div>
          </div>
        </div>
        ${_ttdHtml(kepalaDinas, nowStrTtd, 0, 8)}
      </div>`;

    _bukaPreviewPDF(bodyHtml, `Laporan Absensi ${periodeLabel}`, 'landscape');
  } catch (err) {
    console.error('[downloadLaporanAbsensiPDF]', err);
    toast('Gagal menyiapkan laporan absensi', 'error');
  } finally {
    if (btnEl) { btnEl.disabled = false; btnEl.innerHTML = originalHtml; }
  }
}

// Kartu ke-7 "Jam Kerja" di Laporan - style & skala warna sama persis kayak
// _absJamKerjaCard() di absensi_frontend.js, tapi pakai filter lapAbsBulan/
// lapAbsTahun/lapAbsPegawai/lapAbsBidang milik halaman Laporan sendiri (bukan
// filter halaman Absensi) supaya konsisten sama apa yg lagi ditampilin di sini.
async function _lapAbsJamKerjaCardHtml(bulan, tahun, pegawaiId, bidangId, full) {
  try {
    const params = new URLSearchParams({ bulan, tahun });
    if (full && pegawaiId) params.set('user_id', pegawaiId);
    if (!full) params.set('user_id', pegawaiId);
    if (full && bidangId) params.set('bidang_id', bidangId);
    const r = await fetch(`/api/absensi/jam-kerja?${params}`, { headers: authHeaders() });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    const d = await r.json();
    const pctAsli = Math.max(0, d.persentase || 0);
    const pct = Math.min(100, pctAsli); // buat teks & lebar bar (bar mentok 100%)
    const iconJam = `<svg xmlns="http://www.w3.org/2000/svg" width="17" height="17" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="10" x2="14" y1="2" y2="2"/><line x1="12" x2="15" y1="14" y2="11"/><circle cx="12" cy="14" r="8"/></svg>`;
    const periodeLabel = d.bulan ? ABS_BULAN_NAMA[d.bulan] : `Tahun ${d.tahun}`;
    const label = d.agregat ? `Total Jam Kerja ${periodeLabel}` : `Jam Kerja ${periodeLabel}`;
    const sub = d.agregat
      ? `${pct}% dari target ${_absFmtJam(d.target_menit)} · ${d.hari_kerja_total} hari kerja · total dari ${d.jumlah_pegawai} pegawai`
      : `${pct}% dari target ${_absFmtJam(d.target_menit)} · ${d.hari_kerja_total} hari kerja ${d.bulan ? 'bulan ini' : 'tahun ini'}`;
    // Satu warna aja utk seluruh kartu (border, angka, ikon, progress bar) -
    // ngikutin Skala Nilai Peringkat Kinerja (sama kayak _absJamKerjaCard()).
    const { warna } = _kinerjaSkalaWarna(pctAsli);
    const kartu = `
      <div class="dash-kpi-card" style="border-left-color:${warna}">
        <div class="dash-kpi-body">
          <div class="dash-kpi-lbl">${esc(label)}</div>
          <div class="dash-kpi-val" style="color:${warna}">${esc(_absFmtJam(d.aktual_menit))}</div>
          <div class="dash-kpi-sub" style="font-weight:400">${esc(sub)}</div>
        </div>
        <div class="dash-kpi-icon" style="color:${warna}">${iconJam}</div>
      </div>`;
    return `<div class="abs-jamkerja-wrap" style="--jk-warna:${warna}">
      ${kartu}
      <div class="abs-jamkerja-progress">
        <div class="abs-jamkerja-progress-track">
          <div class="abs-jamkerja-progress-fill" style="width:${pct}%;background:${warna}"></div>
        </div>
      </div>
    </div>`;
  } catch (err) {
    console.error('[_lapAbsJamKerjaCardHtml]', err);
    return '';
  }
}

async function loadLaporanAbsensi(page = 1) {
  _lapAbsPage = page;
  const tbody = document.getElementById('lapAbsTableBody');
  const rekapBox = document.getElementById('lapAbsRekapBox');
  if (!tbody) return;
  if (typeof initCdtp === 'function') initCdtp();
  if (!document.getElementById('lapAbsDari')?.dataset.rangeBound) {
    ['lapAbsDari', 'lapAbsSampai'].forEach(id => {
      document.getElementById(id)?.addEventListener('change', _lapAbsRangeToggleClearBtn);
    });
    if (document.getElementById('lapAbsDari')) document.getElementById('lapAbsDari').dataset.rangeBound = '1';
  }
  _lapAbsRangeToggleClearBtn();

  await _populateLapAbsFilters();
  const full = typeof isAbsensiFull === 'function' && isAbsensiFull();

  tbody.innerHTML = `<tr><td colspan="6"><div class="lap-loading-wrap"><div class="lap-spinner"></div><div style="margin-top:.75rem;color:#64748b;font-size:.85rem">Memuat data...</div></div></td></tr>`;

  const bulan = document.getElementById('lapAbsBulan').value;
  const tahun = document.getElementById('lapAbsTahun').value;
  const pegawaiId = full ? (document.getElementById('lapAbsPegawai')?.value || '') : _user.id;
  const bidangId = full ? (document.getElementById('lapAbsBidang')?.value || '') : '';

  // Rekap kartu - fetch rekap (6 kartu) & jam-kerja (kartu ke-7) PARALEL, baru
  // di-render bareng sekali innerHTML. Dulu jam-kerja nyusul via fetch terpisah
  // stlh innerHTML 6 kartu di-set duluan → kartu ke-7 sempet hilang tiap ganti
  // filter (ke-reset barengan overwrite, baru numpul lagi pas fetch-nya kelar).
  try {
    const rp = new URLSearchParams({ user_id: pegawaiId, bulan, tahun });
    if (bidangId) rp.set('bidang_id', bidangId);
    const [rr, jamKerjaHtml] = await Promise.all([
      fetch(`/api/absensi/rekap?${rp}`, { headers: authHeaders() }),
      _lapAbsJamKerjaCardHtml(bulan, tahun, pegawaiId, bidangId, full),
    ]);
    const rd = await rr.json();
    const rk = rd.rekap || {};
    const iconHadir = `<svg xmlns="http://www.w3.org/2000/svg" width="17" height="17" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 12l2 2 4-4"/><circle cx="12" cy="12" r="10"/></svg>`;
    const iconClock = `<svg xmlns="http://www.w3.org/2000/svg" width="17" height="17" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>`;
    const iconTidakLengkap = `<svg xmlns="http://www.w3.org/2000/svg" width="17" height="17" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="8" height="4" x="8" y="2" rx="1" ry="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><path d="m15 11-6 6"/><path d="m9 11 6 6"/></svg>`;
    const iconTugas = `<svg xmlns="http://www.w3.org/2000/svg" width="17" height="17" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="20" height="14" x="2" y="7" rx="2" ry="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg>`;
    const iconCuti = `<svg xmlns="http://www.w3.org/2000/svg" width="17" height="17" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="18" x="3" y="4" rx="2"/><path d="M3 10h18"/><path d="M8 2v4"/><path d="M16 2v4"/></svg>`;
    const iconWarn = `<svg xmlns="http://www.w3.org/2000/svg" width="17" height="17" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3"/><line x1="12" x2="12" y1="9" y2="13"/><line x1="12" x2="12.01" y1="17" y2="17"/></svg>`;
    if (rekapBox) rekapBox.innerHTML =
      _kpiCard({ icon: iconHadir, label: 'Tepat Waktu', value: rk.hadir || 0, color: 'green' }) +
      _kpiCard({ icon: iconClock, label: 'Terlambat', value: rk.terlambat || 0, color: 'amber' }) +
      _kpiCard({ icon: iconTidakLengkap, label: 'Tidak Lengkap', value: rk.tidak_lengkap || 0, color: 'purple' }) +
      _kpiCard({ icon: iconTugas, label: 'Tugas Luar', value: rk.tugas_luar || 0, color: 'biruMuda' }) +
      _kpiCard({ icon: iconCuti, label: 'Cuti', value: rk.cuti || 0, color: 'fuchsia' }) +
      _kpiCard({ icon: iconWarn, label: 'Alpa', value: rk.alpa || 0, color: 'red' }) +
      jamKerjaHtml;
  } catch { if (rekapBox) rekapBox.innerHTML = ''; }

  // Tabel detail
  try {
    const qs = new URLSearchParams({ bulan, tahun, page });
    if (pegawaiId) qs.set('user_id', pegawaiId);
    if (bidangId) qs.set('bidang_id', bidangId);
    if (_lapAbsFilterStatus) qs.set('status', _lapAbsFilterStatus);
    const r = await fetch(`/api/absensi?${qs}`, { headers: authHeaders() });
    const d = await r.json();
    const rows = d.absensi || [];
    if (!rows.length) {
      tbody.innerHTML = `<tr class="empty-row"><td colspan="6">Belum ada data absensi</td></tr>`;
    } else {
      tbody.innerHTML = rows.map((a, i) => {
        const tglRow = new Date(a.tanggal);
        const tglRowISO = `${tglRow.getFullYear()}-${String(tglRow.getMonth() + 1).padStart(2, '0')}-${String(tglRow.getDate()).padStart(2, '0')}`;
        const isToday = tglRowISO === todayISO();
        const isPending = isToday && a.status === 'hadir' && a.jam_masuk && !a.jam_keluar;
        const isTidakLengkap = a.status === 'hadir' && (!a.jam_masuk || !a.jam_keluar) && !isToday;
        const isTerlambat = a.status === 'hadir' && a.terlambat;
        const statusKey = isPending ? 'pending' : isTidakLengkap ? 'tidak_lengkap' : isTerlambat ? 'terlambat' : a.status;
        const statusLabel = isPending ? 'Menunggu Absensi Keluar' : isTidakLengkap ? 'Tidak Lengkap' : isTerlambat ? 'Terlambat' : STATUS_LABEL[a.status];
        const statusBadge = isPending ? 'badge-warning' : isTidakLengkap ? 'badge-ungu' : isTerlambat ? 'badge-warning' : STATUS_BADGE[a.status];
        const statusIcon = STATUS_ICON[statusKey] || '';
        const jamKeluarCell = a.jam_keluar
          ? `${a.jam_keluar.slice(0,5)} WITA`
          : (isToday && a.status === 'hadir'
              ? `<span data-tip="Belum absensi pulang" style="display:inline-flex;color:var(--kuning);cursor:default"><svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 22h14"/><path d="M5 2h14"/><path d="M17 22v-4.172a2 2 0 0 0-.586-1.414L12 12l-4.414 4.414A2 2 0 0 0 7 17.828V22"/><path d="M7 2v4.172a2 2 0 0 0 .586 1.414L12 12l4.414-4.414A2 2 0 0 0 17 6.172V2"/></svg></span>`
              : '-');
        const tipParts = [];
        if (isTerlambat) tipParts.push(`Telat ${a.menit_terlambat} menit`);
        if (isTidakLengkap) tipParts.push(!a.jam_masuk ? 'Absensi masuk belum tercatat' : 'Absensi pulang belum tercatat');
        if (isPending) tipParts.push('Absensi pulang baru bisa dicatat mulai jam pulang');
        const statusTip = tipParts.length ? ` data-tip="${tipParts.join(' • ')}"` : '';
        return `
        <tr>
          <td style="text-align:center">${(page - 1) * 10 + i + 1}</td>
          <td style="display:${full ? '' : 'none'}">${esc(a.user_nama || '')}</td>
          <td style="text-align:center">${new Date(a.tanggal).toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' })}</td>
          <td style="text-align:center">${a.jam_masuk ? a.jam_masuk.slice(0,5) + ' WITA' : '-'}</td>
          <td style="text-align:center">${jamKeluarCell}</td>
          <td style="text-align:left"><span class="badge ${statusBadge}"${statusTip}>${statusIcon}${statusLabel}</span></td>
        </tr>`;
      }).join('');
    }
    if (document.getElementById('lapAbsPagination') && typeof renderPagination === 'function') {
      renderPagination('lapAbsPagination', d.total || 0, page, 10, 'loadLaporanAbsensi');
    }
  } catch (err) {
    console.error('[loadLaporanAbsensi]', err);
    tbody.innerHTML = `<tr class="empty-row"><td colspan="6">Gagal memuat data</td></tr>`;
  }
}

// ══════════════════════════════════════════════════════
//  LAPORAN SURAT
// ══════════════════════════════════════════════════════

const BULAN_NAMA = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];

let _laporanSuratFilterReady = false;
let _lapSuratPage = 1;
const _LAP_SURAT_PER_PAGE = 10;

async function _initLaporanSuratFilter(smRows, skRows) {
  const sel = document.getElementById('laporanSuratTahun');
  if (!sel) return;

  // Simpan pilihan user sebelum rebuild
  const currentVal = sel.value;

  // Kumpulkan tahun dari data surat yang benar-benar ada
  const tahunSet = new Set();
  smRows.forEach(r => { if (r.tanggal_terima) tahunSet.add(new Date(r.tanggal_terima).getFullYear()); });
  skRows.forEach(r => { if (r.tanggal_surat)  tahunSet.add(new Date(r.tanggal_surat ).getFullYear()); });
  const tahunList = [...tahunSet].sort((a, b) => b - a);

  // Rebuild options
  sel.innerHTML = '';

  // "Semua Tahun" selalu di atas, dan jadi default
  const optSemua = document.createElement('option');
  optSemua.value = '';
  optSemua.textContent = 'Semua Tahun';
  sel.appendChild(optSemua);

  tahunList.forEach(y => {
    const opt = document.createElement('option');
    opt.value = y;
    opt.textContent = y;
    sel.appendChild(opt);
  });

  // Pertahankan pilihan user jika masih valid, selainnya default ke "Semua Tahun"
  // (kecuali cuma ada 1 tahun tersedia → langsung auto-select tahun itu)
  if (currentVal && tahunList.includes(parseInt(currentVal))) {
    sel.value = currentVal;
  } else if (tahunList.length === 1) {
    sel.value = String(tahunList[0]);
  } else {
    sel.value = '';
  }

  _laporanSuratFilterReady = true;
}

// Rebuild dropdown Jenis (Semua/Masuk/Keluar) - opsi yang datanya kosong
// (untuk tahun yang sedang dipilih) tidak ditampilkan.
function _initLaporanSuratJenisFilter(smRows, skRows) {
  const sel = document.getElementById('laporanSuratJenis');
  if (!sel) return;

  const current = sel.value;
  const hasMasuk  = smRows.length > 0;
  const hasKeluar = skRows.length > 0;

  let opts = '';
  if (hasMasuk && hasKeluar) opts += '<option value="">Semua Jenis</option>';
  if (hasMasuk)  opts += '<option value="masuk">Surat Masuk</option>';
  if (hasKeluar) opts += '<option value="keluar">Surat Keluar</option>';
  sel.innerHTML = opts || '<option value="">Semua Jenis</option>';

  // Pertahankan pilihan user jika masih valid, selainnya jatuh ke opsi pertama yang tersedia
  if ([...sel.options].some(o => o.value === current)) {
    sel.value = current;
  } else {
    sel.value = sel.options[0]?.value ?? '';
  }
}

// ── Spinner helper untuk Laporan Surat ────────────────────────────────────
function _showLaporanSuratLoading() {
  const stats = document.getElementById('laporanSuratStats');
  const tbody = document.getElementById('laporanSuratTableBody');
  if (stats) stats.innerHTML = '';
  if (tbody) tbody.innerHTML = `
    <tr>
      <td colspan="8">
        <div class="lap-loading-wrap">
          <div class="lap-spinner"></div>
          <div style="margin-top:.75rem;color:#64748b;font-size:.85rem">Memuat data...</div>
        </div>
      </td>
    </tr>`;
}

async function loadLaporanSurat() {
  _showLaporanSuratLoading();
  // ── Fetch data dulu ──
  let smRows = [], skRows = [];
  try {
    const [smRes, skRes] = await Promise.all([
      fetch(`/.netlify/functions/surat-masuk?limit=9999&page=1`, { headers: authHeaders() }),
      fetch(`/.netlify/functions/surat-keluar?limit=9999&page=1`, { headers: authHeaders() }),
    ]);
    if (smRes.ok) { const d = await smRes.json(); smRows = d.surat || []; }
    if (skRes.ok) { const d = await skRes.json(); skRows = d.surat || []; }
  } catch (err) {
    console.error('[loadLaporanSurat]', err);
  }

  // ── Bangun dropdown tahun dari data nyata ──
  await _initLaporanSuratFilter(smRows, skRows);

  const tahunRaw = document.getElementById('laporanSuratTahun')?.value || '';
  const tahun  = tahunRaw ? parseInt(tahunRaw) : null;
  const status = document.getElementById('laporanSuratStatus')?.value || '';

  // Filter tahun (null = Semua Tahun, tidak difilter)
  let smFiltered = smRows, skFiltered = skRows;
  if (tahun) {
    smFiltered = smRows.filter(r => r.tanggal_terima && new Date(r.tanggal_terima).getFullYear() === tahun);
    skFiltered = skRows.filter(r => r.tanggal_surat  && new Date(r.tanggal_surat ).getFullYear() === tahun);
  }

  // ── Bangun dropdown jenis dari data yang benar-benar ada (setelah filter tahun) ──
  _initLaporanSuratJenisFilter(smFiltered, skFiltered);
  const jenis = document.getElementById('laporanSuratJenis')?.value || '';

  // ── Summary cards (dari data lengkap sebelum filter status) ──
  const totalSM   = smFiltered.length;
  const selesaiSM = smFiltered.filter(r => r.selesai).length;
  const belumSM   = totalSM - selesaiSM;
  const totalSK   = skFiltered.length;
  const now       = new Date();
  const terlambat = smFiltered.filter(r => !r.selesai && r.batas_waktu && new Date(r.batas_waktu) < now).length;

  // ── Gabung & normalisasi semua baris ──
  let allRows = [];

  if (jenis !== 'keluar') {
    smFiltered.forEach(r => {
      const isTerlambat = !r.selesai && r.batas_waktu && new Date(r.batas_waktu) < now;
      allRows.push({
        _jenis: 'masuk',
        no_surat: r.no_surat || r.nomor_surat || '-',
        perihal: r.perihal || r.subject || '-',
        tanggal: r.tanggal_terima || r.tanggal || null,
        pengirim_tujuan: r.asal_surat || r.pengirim || r.asal || '-',
        batas_waktu: r.batas_waktu || null,
        selesai: !!r.selesai,
        terlambat: !!isTerlambat,
      });
    });
  }
  if (jenis !== 'masuk') {
    skFiltered.forEach(r => {
      allRows.push({
        _jenis: 'keluar',
        no_surat: r.no_surat || r.nomor_surat || '-',
        perihal: r.perihal || r.subject || '-',
        tanggal: r.tanggal_surat || r.tanggal || null,
        pengirim_tujuan: r.tujuan_surat || r.tujuan || r.kepada || '-',
        batas_waktu: null,
        selesai: true,
        terlambat: false,
      });
    });
  }

  // Urutkan terbaru dulu
  allRows.sort((a, b) => new Date(b.tanggal || 0) - new Date(a.tanggal || 0));

  // ── Filter status ──
  let filteredRows = allRows;
  if (status === 'belum')          filteredRows = allRows.filter(r => r._jenis === 'masuk' && !r.selesai);
  else if (status === 'selesai')   filteredRows = allRows.filter(r => r.selesai);
  else if (status === 'terlambat') filteredRows = allRows.filter(r => r.terlambat);

  // ── Tabel detail (dengan pagination) ──
  _lapSuratPage = 1;
  _lapRenderSuratTbody(filteredRows);

  // Simpan data (rekap bulanan tetap untuk PDF)
  const rekap = Array.from({ length: 12 }, (_, idx) => ({
    bulan: idx + 1, masuk: 0, selesai: 0, belum: 0, keluar: 0,
  }));
  allRows.forEach(r => {
    if (!r.tanggal) return;
    const b = new Date(r.tanggal).getMonth();
    if (r._jenis === 'masuk') { rekap[b].masuk++; r.selesai ? rekap[b].selesai++ : rekap[b].belum++; }
    else { rekap[b].keluar++; }
  });
  // ── Rebuild opsi filter status sesuai data yang ada ──
  _rebuildSuratStatusOptions(allRows, status);

  window._laporanSuratData = { rekap, allRows, filteredRows, tahun, jenis, status };
}


// Render tbody Laporan Surat dengan pagination (10 baris/halaman)
function _lapRenderSuratTbody(rows) {
  const tbody = document.getElementById('laporanSuratTableBody');
  if (!tbody) return;

  const total = rows.length;
  if (!total) {
    tbody.innerHTML = `<tr class="empty-row"><td colspan="8">Tidak ada data untuk filter yang dipilih</td></tr>`;
    if (typeof renderPagination === 'function') renderPagination('laporanSuratPagination', 0, 1, _LAP_SURAT_PER_PAGE, '_lapSuratGoPage');
    return;
  }

  const pages = Math.ceil(total / _LAP_SURAT_PER_PAGE);
  if (_lapSuratPage > pages) _lapSuratPage = pages;
  if (_lapSuratPage < 1)     _lapSuratPage = 1;
  const start = (_lapSuratPage - 1) * _LAP_SURAT_PER_PAGE;
  const pageRows = rows.slice(start, start + _LAP_SURAT_PER_PAGE);

  tbody.innerHTML = pageRows.map((r, i) => {
    const tgl = r.tanggal
      ? new Date(r.tanggal).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })
      : '-';
    const batas = r.batas_waktu
      ? new Date(r.batas_waktu).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })
      : '-';
    const jenisBadge = r._jenis === 'masuk'
      ? `<span style="background:#d1fae5;color:#065f46;padding:2px 8px;border-radius:99px;font-size:.7rem">Masuk</span>`
      : `<span style="background:#ede9fe;color:#4c1d95;padding:2px 8px;border-radius:99px;font-size:.7rem">Keluar</span>`;
    let statusBadge;
    if (r._jenis === 'keluar') {
      statusBadge = `<span style="background:#dbeafe;color:#1e40af;padding:2px 8px;border-radius:99px;font-size:.7rem">Terkirim</span>`;
    } else if (r.terlambat) {
      statusBadge = `<span style="background:#fee2e2;color:#991b1b;padding:2px 8px;border-radius:99px;font-size:.7rem">Terlambat</span>`;
    } else if (r.selesai) {
      statusBadge = `<span style="background:#d1fae5;color:#065f46;padding:2px 8px;border-radius:99px;font-size:.7rem">Selesai</span>`;
    } else {
      statusBadge = `<span style="background:#fef3c7;color:#92400e;padding:2px 8px;border-radius:99px;font-size:.7rem">Belum Selesai</span>`;
    }
    return `<tr>
      <td style="text-align:center">${start + i + 1}</td>
      <td>${r.no_surat}</td>
      <td>${r.perihal}</td>
      <td style="text-align:center">${jenisBadge}</td>
      <td style="text-align:center">${tgl}</td>
      <td>${r.pengirim_tujuan}</td>
      <td style="text-align:center;white-space:nowrap;color:${r.terlambat ? '#ef4444' : 'inherit'}">${batas}</td>
      <td style="text-align:center;white-space:nowrap">${statusBadge}</td>
    </tr>`;
  }).join('');

  if (typeof renderPagination === 'function') renderPagination('laporanSuratPagination', total, _lapSuratPage, _LAP_SURAT_PER_PAGE, '_lapSuratGoPage');
}

// Pindah halaman tabel Laporan Surat (tanpa fetch ulang)
function _lapSuratGoPage(p) {
  _lapSuratPage = p;
  const data = window._laporanSuratData;
  if (!data) return;
  _lapRenderSuratTbody(data.filteredRows);
}

function _renderSuratChart(rekap, jenis) {
  const el = document.getElementById('laporanSuratChart');
  if (!el) return;
  const maxVal = Math.max(...rekap.map(r => Math.max(r.masuk, r.keluar)), 1);
  const W = 660, H = 180, padL = 30, padB = 28, padT = 10;
  const barW = Math.floor((W - padL) / 12);
  const scale = v => padT + (H - padT - padB) * (1 - v / maxVal);

  let bars = '';
  rekap.forEach((r, i) => {
    const x = padL + i * barW;
    if (jenis !== 'keluar' && r.masuk) {
      bars += `<rect x="${x+4}" y="${scale(r.masuk)}" width="${barW/2-4}" height="${H - padB - scale(r.masuk)}" fill="#10b981" rx="2" opacity=".85"><title>Masuk: ${r.masuk}</title></rect>`;
    }
    if (jenis !== 'masuk' && r.keluar) {
      bars += `<rect x="${x+barW/2+2}" y="${scale(r.keluar)}" width="${barW/2-4}" height="${H - padB - scale(r.keluar)}" fill="#8b5cf6" rx="2" opacity=".85"><title>Keluar: ${r.keluar}</title></rect>`;
    }
    bars += `<text x="${x+barW/2}" y="${H-padB+14}" text-anchor="middle" font-size="9" fill="currentColor" opacity=".6">${BULAN_NAMA[i].slice(0,3)}</text>`;
  });

  // Y axis labels
  let yLabels = '';
  for (let v = 0; v <= maxVal; v += Math.ceil(maxVal / 4)) {
    const y = scale(v);
    yLabels += `<text x="${padL-4}" y="${y+4}" text-anchor="end" font-size="9" fill="currentColor" opacity=".6">${v}</text>`;
    yLabels += `<line x1="${padL}" y1="${y}" x2="${W}" y2="${y}" stroke="currentColor" stroke-width=".5" opacity=".15"/>`;
  }

  const legend = !jenis ? `
    <circle cx="${W-100}" cy="12" r="5" fill="#10b981"/>
    <text x="${W-92}" y="16" font-size="10" fill="currentColor" opacity=".8">Masuk</text>
    <circle cx="${W-48}" cy="12" r="5" fill="#8b5cf6"/>
    <text x="${W-40}" y="16" font-size="10" fill="currentColor" opacity=".8">Keluar</text>
  ` : (jenis === 'masuk'
    ? `<circle cx="${W-60}" cy="12" r="5" fill="#10b981"/><text x="${W-52}" y="16" font-size="10" fill="currentColor" opacity=".8">Masuk</text>`
    : `<circle cx="${W-60}" cy="12" r="5" fill="#8b5cf6"/><text x="${W-52}" y="16" font-size="10" fill="currentColor" opacity=".8">Keluar</text>`);

  el.innerHTML = `<svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" style="width:100%;min-width:380px;max-height:200px">${yLabels}${bars}${legend}</svg>`;
}



// ══════════════════════════════════════════════════════
//  LAPORAN KINERJA
// ══════════════════════════════════════════════════════

let _laporanKinerjaFilterReady = false;
let _lapKinerjaTahunList = [];
// State range bulan: { bulan:1..12, tahun:YYYY, key:'YYYY-MM' }
let _lapRangeFrom = null;
let _lapRangeTo   = null;

// ── State pagination tabel Laporan Kinerja ───────────────────────────────
let _lapKinerjaPage = 1;
const _LAP_KINERJA_PER_PAGE = 15;
let _lapKinerjaBulanTampil = [];
let _lapKinerjaColspan = 12;

const _LAP_ROMAWI = ['I', 'II', 'III', 'IV'];

// Render satu baris tabel Laporan Kinerja
// Escape karakter HTML biar isian user (mis. ada "<" atau "&") gak bikin tabel laporan rusak.
function _lapEscHtml(s) {
  return String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// Render teks markdown-lite dari kolom Faktor Penghambat/Solusi/Faktor Pendukung/
// Rencana Tindak Lanjut jadi HTML buat laporan (preview & PDF). Sebelumnya kolom-kolom
// ini nampilin teks mentah apa adanya (termasuk newline-nya) di dalam <td> dengan
// white-space:normal, jadi baris "1. ...\n2. ..." ke-collapse jadi satu baris nyambung
// tanpa nomor kebaca sama sekali. Sekarang baris "1. " / "- " yang berurutan
// dikelompokkan jadi <ol>/<ul><li> beneran (sama kayak _mdToHtmlDisplay di kinerja.js)
// supaya rapi & hanging-indent pas wrap.
function _lapMdToHtml(md) {
  if (!md) return '';
  const inlineFmt = (line) => {
    let h = _lapEscHtml(line);
    h = h.replace(/\*\*([^\n]+?)\*\*/g, '<strong>$1</strong>');
    h = h.replace(/(^|[^_])_([^_\n]+?)_(?!_)/g, '$1<em>$2</em>');
    return h;
  };
  let html = '';
  let listType = null; // 'ol' | 'ul' | null
  const closeList = () => { if (listType) { html += `</${listType}>`; listType = null; } };
  String(md).split('\n').forEach(line => {
    const numM = line.match(/^(\d+)\.\s+(.*)$/);
    const bulM = line.match(/^-\s+(.*)$/);
    if (numM) {
      if (listType !== 'ol') { closeList(); html += '<ol class="lap-md-list">'; listType = 'ol'; }
      html += `<li>${inlineFmt(numM[2])}</li>`;
    } else if (bulM) {
      if (listType !== 'ul') { closeList(); html += '<ul class="lap-md-list">'; listType = 'ul'; }
      html += `<li>${inlineFmt(bulM[1])}</li>`;
    } else {
      closeList();
      html += `<div class="lap-md-line">${inlineFmt(line) || '&nbsp;'}</div>`;
    }
  });
  closeList();
  return html;
}

function _lapKinerjaRowHtml(r, no, bulanTampil) {
  const bulanCells = bulanTampil.map(b => {
    const v = r.realisasiPerBulan[b];
    const isEmpty = v === null || v === undefined || v === '';
    return `<td style="text-align:center;font-size:.75rem;color:${isEmpty ? '#000000' : '#1e293b'}">${isEmpty ? '-' : v}</td>`;
  }).join('');
  const sdPelaporan = r._realisasiSd ?? '-';
  const capaian     = r._capaian !== null ? r._capaian + '%' : '-';
  const capColor    = r._capaian === null ? '#000000'
    : parseFloat(r._capaian) >= 100 ? '#059669'
    : parseFloat(r._capaian) >= 80  ? '#2563eb'
    : parseFloat(r._capaian) >= 60  ? '#d97706' : '#dc2626';
  const negBadge = r.bermakna_negatif
    ? `<span data-tip="Bermakna Negatif" data-tip-variant="danger" style="display:inline-flex;align-items:center;justify-content:center;width:16px;height:16px;background:#fee2e2;border-radius:50%;margin-left:5px;vertical-align:middle;flex-shrink:0"><svg xmlns="http://www.w3.org/2000/svg" width="9" height="9" fill="none" viewBox="0 0 24 24" stroke="#991b1b" stroke-width="2.8"><path stroke-linecap="round" stroke-linejoin="round" d="M19 14l-7 7m0 0l-7-7m7 7V3"/></svg></span>`
    : `<span data-tip="Bermakna Positif" data-tip-variant="success" style="display:inline-flex;align-items:center;justify-content:center;width:16px;height:16px;background:#d1fae5;border-radius:50%;margin-left:5px;vertical-align:middle;flex-shrink:0"><svg xmlns="http://www.w3.org/2000/svg" width="9" height="9" fill="none" viewBox="0 0 24 24" stroke="#065f46" stroke-width="2.8"><path stroke-linecap="round" stroke-linejoin="round" d="M5 10l7-7m0 0l7 7m-7-7v18"/></svg></span>`;
  const tipeBadge = typeof _tipeBadge === 'function' ? _tipeBadge(r.tipe_perhitungan) : '';
  const jenisBadges = [
    r.jenis_monev ? `<span style="background:#dbeafe;color:#1d4ed8;border-radius:4px;padding:1px 5px;font-size:.63rem;font-weight:700">IKU</span>` : '',
    r.jenis_ikk   ? `<span style="background:#ede9fe;color:#7c3aed;border-radius:4px;padding:1px 5px;font-size:.63rem;font-weight:700">IKK</span>`   : '',
    r.jenis_spm   ? `<span style="background:#fef3c7;color:#b45309;border-radius:4px;padding:1px 5px;font-size:.63rem;font-weight:700">SPM</span>`   : '',
  ].filter(Boolean).join('');
  return `<tr>
    <td class="td-sticky-no" style="text-align:center;position:sticky;left:0;z-index:3">${no}</td>
    <td class="td-sticky-name" style="position:sticky;left:34px;z-index:3">
      <div style="font-weight:600;line-height:1.6"><span>${r.nama_indikator}</span>${negBadge}</div>
      <div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;margin-top:5px">${tipeBadge}${jenisBadges}</div>
    </td>
    <td style="text-align:center;color:#000000">${r.target ?? '-'}</td>
    <td style="text-align:center;color:#000000">${r.satuan || '-'}</td>
    <td class="td-bidang" style="font-size:.75rem;color:${r.penanggung_jawab?'#1e293b':'#94a3b8'}">${r.penanggung_jawab || '-'}</td>
    ${bulanCells}
    <td style="text-align:center;font-weight:600;color:${sdPelaporan==='-'?'#000000':'#1e293b'}">${sdPelaporan}</td>
    <td style="text-align:center;font-weight:700;color:${capColor}">${capaian}</td>
    <td style="font-size:.75rem;text-align:${r._fpenghambat?'left':'center'};color:${r._fpenghambat?'#1e293b':'#000000'};max-width:180px;word-break:break-word;overflow-wrap:anywhere">${r._fpenghambat ? _lapMdToHtml(r._fpenghambat) : '-'}</td>
    <td style="font-size:.75rem;text-align:${r._solusi?'left':'center'};color:${r._solusi?'#1e293b':'#000000'};max-width:180px;word-break:break-word;overflow-wrap:anywhere">${r._solusi ? _lapMdToHtml(r._solusi) : '-'}</td>
    <td style="font-size:.75rem;text-align:${r._fpendukung?'left':'center'};color:${r._fpendukung?'#1e293b':'#000000'};max-width:180px;word-break:break-word;overflow-wrap:anywhere">${r._fpendukung ? _lapMdToHtml(r._fpendukung) : '-'}</td>
    <td style="font-size:.75rem;text-align:${r._rencana_tl?'left':'center'};color:${r._rencana_tl?'#1e293b':'#000000'};max-width:180px;word-break:break-word;overflow-wrap:anywhere">${r._rencana_tl ? _lapMdToHtml(r._rencana_tl) : '-'}</td>
  </tr>`;
}

// Render tbody Laporan Kinerja dengan pagination
function _lapRenderKinerjaTbody(rows, bulanTampil, colspanTotal, emptyMsg) {
  _lapKinerjaBulanTampil = bulanTampil;
  _lapKinerjaColspan     = colspanTotal;

  const tbody = document.getElementById('laporanKinerjaTableBody');
  if (!tbody) return;

  const total = rows.length;
  if (!total) {
    tbody.innerHTML = `<tr class="empty-row"><td colspan="${colspanTotal}">${emptyMsg || 'Tidak ada data'}</td></tr>`;
    if (typeof renderPagination === 'function') renderPagination('laporanKinerjaPagination', 0, 1, _LAP_KINERJA_PER_PAGE, '_lapKinerjaGoPage');
    return;
  }

  const pages = Math.ceil(total / _LAP_KINERJA_PER_PAGE);
  if (_lapKinerjaPage > pages) _lapKinerjaPage = pages;
  if (_lapKinerjaPage < 1)     _lapKinerjaPage = 1;
  const start = (_lapKinerjaPage - 1) * _LAP_KINERJA_PER_PAGE;
  const pageRows = rows.slice(start, start + _LAP_KINERJA_PER_PAGE);

  tbody.innerHTML = pageRows.map((r, i) => _lapKinerjaRowHtml(r, start + i + 1, bulanTampil)).join('');

  if (typeof renderPagination === 'function') renderPagination('laporanKinerjaPagination', total, _lapKinerjaPage, _LAP_KINERJA_PER_PAGE, '_lapKinerjaGoPage');
}

// Pindah halaman tabel Laporan Kinerja (tanpa fetch ulang)
function _lapKinerjaGoPage(p) {
  _lapKinerjaPage = p;
  const data = window._laporanKinerjaData;
  if (!data) return;
  const bidang = document.getElementById('laporanKinerjaBidang')?.value || '';
  const rows = bidang ? data.rows.filter(r => r.penanggung_jawab === bidang) : data.rows;
  _lapRenderKinerjaTbody(rows, _lapKinerjaBulanTampil, _lapKinerjaColspan);
}

// ── Month Picker (ported from dashboard) ─────────────────────────────────
window._lapMpData = window._lapMpData || {};

function _lapMonthPicker(id, tahunList, activeVal, onPickFn) {
  const _BL = ['','Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agu','Sep','Okt','Nov','Des'];
  const activeY = activeVal ? parseInt(activeVal.split('-')[0]) : (tahunList[tahunList.length-1] || new Date().getFullYear());
  const activeM = activeVal ? parseInt(activeVal.split('-')[1]) : 0;
  window._lapMpData[id] = { onPickFn, tahunList, activeVal: activeVal || '', viewYear: activeY };
  const lbl = activeVal ? `${_BL[activeM]} ${activeY}` : '- Pilih -';
  return `<div class="lap-mp" id="${id}" onclick="event.stopPropagation();_lapMpToggle('${id}')">
      <span class="lap-mp-label">${lbl}</span>
      <svg class="lap-mp-caret" width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7"/></svg>
    </div>`;
}

function _lapMpToggle(id) {
  const el = document.getElementById(id);
  if (!el) return;
  if (el.classList.contains('open')) { el.classList.remove('open'); return; }
  document.querySelectorAll('.lap-mp.open').forEach(x => x.classList.remove('open'));
  _lapMpRenderPanel(el);
  el.classList.add('open');
}

function _lapMpRenderPanel(el) {
  const _BL = ['','Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agu','Sep','Okt','Nov','Des'];
  const id = el.id;
  const data = window._lapMpData?.[id] || {};
  const tahunList = data.tahunList || [];
  const activeVal = data.activeVal || '';
  const viewYear  = data.viewYear || tahunList[tahunList.length-1] || new Date().getFullYear();
  const activeY   = activeVal ? parseInt(activeVal.split('-')[0]) : 0;
  const activeM   = activeVal ? parseInt(activeVal.split('-')[1]) : 0;
  const minYear   = tahunList[0] || viewYear;
  const maxYear   = tahunList[tahunList.length-1] || viewYear;

  // Untuk picker "Sampai": disabled bulan < fromKey (jika id === lapMpTo)
  const fromKey = _lapRangeFrom ? _lapRangeFrom.tahun * 100 + _lapRangeFrom.bulan : 0;
  // Untuk picker "Dari": disabled bulan > toKey (jika id === lapMpFrom)
  const toKey   = _lapRangeTo   ? _lapRangeTo.tahun   * 100 + _lapRangeTo.bulan   : 9999;

  let grid = '';
  for (let m = 1; m <= 12; m++) {
    const key     = `${viewYear}-${String(m).padStart(2,'0')}`;
    const thisKey = viewYear * 100 + m;
    const isActive = (viewYear === activeY && m === activeM);
    const isDisabled = id === 'lapMpFrom' ? thisKey > toKey : thisKey < fromKey;
    const cls = isActive ? 'lap-mp-cell active' : isDisabled ? 'lap-mp-cell disabled' : 'lap-mp-cell';
    const handler = !isDisabled ? `onclick="event.stopPropagation();_lapMpPick('${id}','${key}')"` : '';
    grid += `<div class="${cls}" ${handler}>${_BL[m]}</div>`;
  }

  const canPrev = viewYear > minYear;
  const canNext = viewYear < maxYear;
  let panel = el.querySelector('.lap-mp-panel');
  if (!panel) { panel = document.createElement('div'); panel.className = 'lap-mp-panel'; el.appendChild(panel); }
  panel.innerHTML = `
    <div class="lap-mp-nav">
      <button class="lap-mp-nav-btn" ${canPrev ? `onclick="event.stopPropagation();_lapMpNav('${id}',-1)"` : 'disabled'}>
        <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7"/></svg>
      </button>
      <span class="lap-mp-year">${viewYear}</span>
      <button class="lap-mp-nav-btn" ${canNext ? `onclick="event.stopPropagation();_lapMpNav('${id}',1)"` : 'disabled'}>
        <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7"/></svg>
      </button>
    </div>
    <div class="lap-mp-grid">${grid}</div>`;
}

function _lapMpNav(id, dir) {
  const el = document.getElementById(id);
  if (!el) return;
  const data = window._lapMpData?.[id] || {};
  const tahunList = data.tahunList || [];
  let vy = (data.viewYear || tahunList[0] || new Date().getFullYear()) + dir;
  vy = Math.max(tahunList[0]||vy, Math.min(tahunList[tahunList.length-1]||vy, vy));
  if (window._lapMpData[id]) window._lapMpData[id].viewYear = vy;
  _lapMpRenderPanel(el);
}

function _lapMpPick(id, key) {
  const el = document.getElementById(id);
  if (!el) return;
  el.classList.remove('open');
  const data = window._lapMpData?.[id];
  if (!data) return;
  data.activeVal = key;
  data.viewYear  = parseInt(key.split('-')[0]);
  const _BL = ['','Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agu','Sep','Okt','Nov','Des'];
  const [y, m] = key.split('-').map(Number);
  const labelEl = el.querySelector('.lap-mp-label');
  if (labelEl) labelEl.textContent = `${_BL[m]} ${y}`;
  const fnRef = window[data.onPickFn];
  if (typeof fnRef === 'function') fnRef(key);
}

function _lapSetRangeFrom(key) {
  const [y, m] = key.split('-').map(Number);
  _lapRangeFrom = { bulan: m, tahun: y, key };
  // Jika from > to, geser to ke from
  if (_lapRangeTo && y * 100 + m > _lapRangeTo.tahun * 100 + _lapRangeTo.bulan) {
    _lapRangeTo = { ..._lapRangeFrom };
    // Update label & data picker To
    const toEl = document.getElementById('lapMpTo');
    if (toEl) {
      const _BL = ['','Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agu','Sep','Okt','Nov','Des'];
      const lbl = toEl.querySelector('.lap-mp-label');
      if (lbl) lbl.textContent = `${_BL[m]} ${y}`;
      if (window._lapMpData['lapMpTo']) { window._lapMpData['lapMpTo'].activeVal = key; window._lapMpData['lapMpTo'].viewYear = y; }
    }
  }
  // Re-render panel To agar disable state update
  const toEl = document.getElementById('lapMpTo');
  if (toEl?.classList.contains('open')) _lapMpRenderPanel(toEl);
  loadLaporanKinerja();
}

function _lapSetRangeTo(key) {
  const [y, m] = key.split('-').map(Number);
  _lapRangeTo = { bulan: m, tahun: y, key };
  // Jika to < from, geser from ke to
  if (_lapRangeFrom && y * 100 + m < _lapRangeFrom.tahun * 100 + _lapRangeFrom.bulan) {
    _lapRangeFrom = { ..._lapRangeTo };
    const frEl = document.getElementById('lapMpFrom');
    if (frEl) {
      const _BL = ['','Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agu','Sep','Okt','Nov','Des'];
      const lbl = frEl.querySelector('.lap-mp-label');
      if (lbl) lbl.textContent = `${_BL[m]} ${y}`;
      if (window._lapMpData['lapMpFrom']) { window._lapMpData['lapMpFrom'].activeVal = key; window._lapMpData['lapMpFrom'].viewYear = y; }
    }
  }
  const frEl = document.getElementById('lapMpFrom');
  if (frEl?.classList.contains('open')) _lapMpRenderPanel(frEl);
  loadLaporanKinerja();
}

// ── Render filter bar month picker ke dalam container ────────────────────
function _lapRenderRangeFilter(tahunList) {
  const container = document.getElementById('lapKinerjaRangeFilter');
  if (!container) return;
  const aktif = (typeof getPeriodeAktif === 'function') ? getPeriodeAktif() : null;
  const tahunAktif = aktif?.tahun ?? (tahunList[0] || new Date().getFullYear());
  const periodeAktifBulan = aktif?.bulan ?? 12;

  // Default: snap ke awal TW dari bulan aktif (misal bulan 3 → Jan s.d Mar = TW I)
  const _twStart = bulan => bulan <= 3 ? 1 : bulan <= 6 ? 4 : bulan <= 9 ? 7 : 10;
  if (!_lapRangeFrom) {
    const from = _twStart(periodeAktifBulan);
    _lapRangeFrom = { bulan: from, tahun: tahunAktif, key: `${tahunAktif}-${String(from).padStart(2,'0')}` };
  }
  if (!_lapRangeTo)   _lapRangeTo   = { bulan: periodeAktifBulan, tahun: tahunAktif, key: `${tahunAktif}-${String(periodeAktifBulan).padStart(2,'0')}` };

  container.innerHTML = `
    <div class="lap-range-filter">
      <span class="lap-range-icon">
        <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M8 2v3M16 2v3M3.5 9h17M5 4.5h14A1.5 1.5 0 0 1 20.5 6v13a1.5 1.5 0 0 1-1.5 1.5H5A1.5 1.5 0 0 1 3.5 19V6A1.5 1.5 0 0 1 5 4.5Z"/></svg>
      </span>
      <div class="lap-range-group">
        <span class="lap-range-label">Dari</span>
        ${_lapMonthPicker('lapMpFrom', tahunList, _lapRangeFrom.key, '_lapSetRangeFrom')}
      </div>
      <div class="lap-range-group">
        <span class="lap-range-label">Sampai</span>
        ${_lapMonthPicker('lapMpTo', tahunList, _lapRangeTo.key, '_lapSetRangeTo')}
      </div>
    </div>`;
}

async function _initLaporanKinerjaFilter() {
  if (_laporanKinerjaFilterReady && _lapKinerjaTahunList.length > 0) return;

  // Ambil daftar tahun dari Periode
  let tahunList = [];
  try {
    const res  = await fetch('/.netlify/functions/periode', { headers: authHeaders() });
    const data = await res.json();
    const periodes = data.periode || data.periodes || data.data || [];
    const unik = [...new Set(periodes.map(p => p.tahun))].sort((a, b) => a - b);
    tahunList = unik;
  } catch (_) {}

  if (!tahunList.length) return;

  // Isi dropdown tahun (jika ada, untuk kompatibilitas)
  const sel = document.getElementById('laporanKinerjaTahun');
  if (sel) {
    const aktif = (typeof getPeriodeAktif === 'function') ? getPeriodeAktif() : null;
    const tahunAktif = aktif?.tahun ?? tahunList[tahunList.length-1];
    sel.innerHTML = '';
    [...tahunList].reverse().forEach(y => {
      const opt = document.createElement('option');
      opt.value = y; opt.textContent = 'Tahun ' + y;
      if (y === tahunAktif) opt.selected = true;
      sel.appendChild(opt);
    });
  }

  _lapKinerjaTahunList = tahunList;
  _laporanKinerjaFilterReady = true;

  // Render month picker range filter
  _lapRenderRangeFilter(tahunList);
}

// Tutup picker kalau klik di luar
document.addEventListener('click', function(e) {
  document.querySelectorAll('.lap-mp.open').forEach(mp => {
    if (!mp.contains(e.target)) mp.classList.remove('open');
  });
});

// ── Spinner helper untuk Laporan Kinerja ─────────────────────────────────
function _showLaporanLoading() {
  const stats = document.getElementById('laporanKinerjaStats');
  const tbody = document.getElementById('laporanKinerjaTableBody');
  const thead = document.getElementById('laporanKinerjaThead');
  const pag   = document.getElementById('laporanKinerjaPagination');
  if (stats) stats.innerHTML = '';
  if (thead) thead.innerHTML = '';
  if (pag)   pag.innerHTML = '';
  if (tbody) tbody.innerHTML = `
    <tr>
      <td colspan="21">
        <div class="lap-loading-wrap">
          <div class="lap-spinner"></div>
          <div style="margin-top:.75rem;color:#64748b;font-size:.85rem">Memuat data...</div>
        </div>
      </td>
    </tr>`;
}

async function loadLaporanKinerja() {
  _showLaporanLoading();
  await _initLaporanKinerjaFilter();
  if (!_user?.is_admin && typeof _ensureUserIndikatorIds === 'function') await _ensureUserIndikatorIds();

  // Ambil tahun dari range (gunakan tahun dari, atau fallback ke select)
  const bulanDari   = _lapRangeFrom?.bulan   ?? 1;
  const bulanSampai = _lapRangeTo?.bulan     ?? 12;
  const tahun       = _lapRangeFrom?.tahun   ?? parseInt(document.getElementById('laporanKinerjaTahun')?.value || new Date().getFullYear());
  const bulanPelaporan = bulanSampai; // backward compat untuk PDF/label
  const jenis          = document.getElementById('laporanKinerjaJenis')?.value || 'semua';

  // Fetch semua 12 bulan secara parallel untuk tiap jenis
  const bulanList = [1,2,3,4,5,6,7,8,9,10,11,12];

  // Selalu minta scope=bidang ke backend (superset terluas yang boleh dilihat user utk jenis
  // IKK/SPM: semua indikator di bidang yg sama, bukan cuma yg di-assign). Untuk non-admin, kita
  // filter lagi ke "punya sendiri" di frontend kalau dropdown scope di-set ke 'mine' - jadi cukup
  // satu kali fetch, nggak perlu round-trip dua kali tiap ganti dropdown.
  const fetchBulan = async (b, jenisParam) => {
    try {
      const r = await fetch(`/api/kinerja/rekap?bulan=${b}&tahun=${tahun}&jenis=${jenisParam}&scope=bidang`, { headers: authHeaders() });
      if (!r.ok) return [];
      const d = await r.json();
      return (d.rekap || []).map(row => ({ ...row, _bulan: b }));
    } catch { return []; }
  };

  // Kumpulkan data per indikator: { key: { ...info, realisasiPerBulan: {1:val,...}, ... } }
  const allBulanData = {};

  const jenisParams = [];
  if (jenis !== 'ikk' && jenis !== 'spm') jenisParams.push('monev');
  if (jenis !== 'kinerja' && jenis !== 'spm') jenisParams.push('ikk');
  if (jenis !== 'kinerja' && jenis !== 'ikk') jenisParams.push('spm');

  for (const jenisParam of jenisParams) {
    const results = await Promise.all(bulanList.map(b => fetchBulan(b, jenisParam)));
    results.forEach((bulanRows, idx) => {
      const b = bulanList[idx];
      bulanRows.forEach(row => {
        // Gunakan id indikator saja sebagai key agar tidak duplikat
        // ketika satu indikator memiliki jenis_monev=true DAN jenis_ikk=true
        const key = `${row.id}`;
        if (!allBulanData[key]) {
          allBulanData[key] = {
            ...row,
            _jenis: jenisParam === 'ikk' ? 'IKK' : jenisParam === 'spm' ? 'SPM' : 'IKU',
            realisasiPerBulan:     {},
            fpenghambatPerBulan:   {},
            solusiPerBulan:        {},
            fpendukungPerBulan:    {},
            rencanaTlPerBulan:     {},
          };
        }
        allBulanData[key].realisasiPerBulan[b]   = row.realisasi_display ?? row.realisasi;
        allBulanData[key].fpenghambatPerBulan[b]  = row.f_penghambat;
        allBulanData[key].solusiPerBulan[b]        = row.solusi;
        allBulanData[key].fpendukungPerBulan[b]   = row.f_pendukung;
        allBulanData[key].rencanaTlPerBulan[b]    = row.rencana_tl;
      });
    });
  }

  let rows = Object.values(allBulanData);

  // Non-admin: hasil fetch di atas (scope=bidang) sudah berisi SEMUA indikator IKK/SPM
  // di bidang yang sama dengan tanggung jawab user (dari backend), plus semua IKU.
  // Dropdown "Indikator Saya" vs "Semua Indikator Bidang" tinggal milih mau ditampilin
  // full (bidang) atau dipersempit ke yang eksplisit di-assign ke akunnya (mine).
  if (!_user?.is_admin) {
    const bidangRows = rows; // superset dari backend (scope=bidang)
    const myRows = (_userIndikatorIds && _userIndikatorIds.size > 0)
      ? bidangRows.filter(row => _userIndikatorIds.has(Number(row.id)))
      : [];

    const scopeSel = document.getElementById('laporanKinerjaScope');
    const scope = scopeSel?.value || 'mine';
    rows = scope === 'bidang' ? bidangRows : myRows;

    // Dropdown scope cuma relevan kalau bidang si-user beranggotakan indikator
    // lain di luar miliknya sendiri - kalau enggak, "Semua Indikator Bidang" bakal
    // sama persis hasilnya dgn "Indikator Saya", jadi disembunyikan aja.
    const scopeWrap = document.getElementById('laporanKinerjaScopeWrap');
    if (scopeWrap) {
      const showScope = bidangRows.length > myRows.length;
      scopeWrap.style.display = showScope ? '' : 'none';
      if (!showScope && scopeSel) scopeSel.value = 'mine';
    }
  } else {
    const scopeWrap = document.getElementById('laporanKinerjaScopeWrap');
    if (scopeWrap) scopeWrap.style.display = 'none';
  }

  // Hitung realisasi & capaian s.d bulan pelaporan (bulan terakhir yang ada data)
  const fmtNum = v => {
    if (v === null || v === undefined || v === '') return null;
    const n = parseFloat(v);
    return isNaN(n) ? String(v) : parseFloat(n.toFixed(4)).toString();
  };

  rows.forEach(row => {
    const isJumlah = (row.indikator_kinerja || row.nama_indikator || '').toLowerCase().startsWith('jumlah');

    let lastVal = null, lastFpenghambat = null, lastSolusi = null, lastFpendukung = null, lastRencanaTl = null;
    for (let b = bulanSampai; b >= bulanDari; b--) {
      const v = row.realisasiPerBulan[b];
      if (v !== null && v !== undefined && v !== '') {
        lastFpenghambat = row.fpenghambatPerBulan[b];
        lastSolusi      = row.solusiPerBulan[b];
        lastFpendukung  = row.fpendukungPerBulan[b];
        lastRencanaTl   = row.rencanaTlPerBulan[b];
        if (!isJumlah) { lastVal = v; break; }
        // Untuk indikator Jumlah: terus loop untuk ambil data teks dari bulan terakhir
        if (lastVal === null) lastVal = v; // simpan bulan terakhir untuk fallback
      }
    }

    // Untuk indikator Jumlah: realisasi = SUM semua bulan dalam range
    if (isJumlah) {
      let sum = 0, hasVal = false;
      for (let b = bulanDari; b <= bulanSampai; b++) {
        const v = row.realisasiPerBulan[b];
        const n = parseFloat(v);
        if (!isNaN(n)) { sum += n; hasVal = true; }
      }
      lastVal = hasVal ? sum : null;
    }

    row._realisasiSd = lastVal;
    row._fpenghambat  = lastFpenghambat;
    row._solusi       = lastSolusi;
    row._fpendukung   = lastFpendukung;
    row._rencana_tl   = lastRencanaTl;
    row.nama_indikator = row.indikator_kinerja || row.nama_indikator || row.indikator || '-';
    row.target         = row.target_display != null ? row.target_display : fmtNum(row.target_tahun ?? row.target);

    const target = parseFloat(row.target_tahun);
    const real   = parseFloat(lastVal);
    if (!isNaN(target) && target !== 0 && !isNaN(real)) {
      row._capaian = row.bermakna_negatif
        ? ((target - (real - target)) / target * 100).toFixed(1)
        : (real / target * 100).toFixed(1);
    } else {
      row._capaian = null;
    }
  });

  // ── Summary ──
  const total      = rows.length;
  const sudahDiisi = rows.filter(r => r._realisasiSd !== null && r._realisasiSd !== undefined && r._realisasiSd !== '').length;
  const belumDiisi = total - sudahDiisi;
  const capRows    = rows.filter(r => r._capaian !== null);
  const rataCapaian = capRows.length
    ? (capRows.reduce((s, r) => s + parseFloat(r._capaian), 0) / capRows.length).toFixed(1)
    : '-';

  // ── Render tabel - kolom bulan dibatasi s.d bulanPelaporan ──
  const BULAN_PENDEK  = ['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agu','Sep','Okt','Nov','Des'];
  const BULAN_PANJANG = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];
  const bulanTampil   = bulanList.filter(b => b >= bulanDari && b <= bulanSampai);

  // Hitung colspan per TW sesuai bulan yang tampil
  const twRanges = [[1,3],[4,6],[7,9],[10,12]];
  const twHeaders = twRanges.map(([s, e], twIdx) => {
    const cols = bulanTampil.filter(b => b >= s && b <= e).length;
    return cols > 0 ? `<th colspan="${cols}" style="text-align:center;background:var(--hijau);color:#fff">TW ${_LAP_ROMAWI[twIdx]}</th>` : '';
  }).join('');

  const bulanSubHeaders = bulanTampil.map(b =>
    `<th style="width:45px;text-align:center;background:var(--hijau);color:#fff">${BULAN_PANJANG[b-1]}</th>`
  ).join('');

  const colspanTotal = 5 + bulanTampil.length + 6; // No+Indikator+Target+Satuan+Bidang + bulan + Realisasi+Capaian+F.Penghambat+Solusi+F.Pendukung+RencanaTL

  const thead = document.getElementById('laporanKinerjaThead');
  if (thead) {
    thead.innerHTML = `
      <tr class="lap-th-row1" style="background:var(--hijau)">
        <th rowspan="2" style="width:34px;text-align:center;position:sticky;left:0;z-index:3">No</th>
        <th rowspan="2" style="min-width:220px;position:sticky;left:34px;z-index:3">Indikator Kinerja</th>
        <th rowspan="2" style="width:65px;text-align:center">Target Tahunan</th>
        <th rowspan="2" style="width:55px;text-align:center">Satuan</th>
        <th rowspan="2" style="min-width:130px">Unit Kerja</th>
        ${twHeaders}
        <th rowspan="2" style="width:75px;text-align:center">Realisasi s.d ${BULAN_PANJANG[bulanSampai-1]}</th>
        <th rowspan="2" style="width:65px;text-align:center">Capaian</th>
        <th rowspan="2" style="min-width:100px">Faktor Penghambat</th>
        <th rowspan="2" style="min-width:100px">Solusi</th>
        <th rowspan="2" style="min-width:100px">Faktor Pendukung</th>
        <th rowspan="2" style="min-width:100px">Rencana Tindak Lanjut</th>
      </tr>
      <tr class="lap-th-row2" style="background:var(--hijau)">${bulanSubHeaders}</tr>`;
    // Fix gap putih di pojok thead: set teal di table, reset di tbody
    const teal = getComputedStyle(document.documentElement).getPropertyValue('--hijau').trim() || '#0d9488';
    thead.style.background = teal;
    thead.style.backgroundColor = teal;
    const tbl = thead.closest('table');
    if (tbl) {
      tbl.style.background = teal;
      tbl.style.backgroundColor = teal;
      const tb = tbl.querySelector('tbody');
      if (tb) { tb.style.background = '#fff'; tb.style.backgroundColor = '#fff'; }
    }
    // Baris 2 (nama bulan) harus sticky NEMPEL DI BAWAH baris 1 (TW), bukan
    // top:0 juga - kalau top:0 dua-duanya, pas discroll baris bulan numpuk
    // balik ke atas nabrak baris TW alih-alih nempel di bawahnya.
    // Tinggi baris 1 diukur dinamis (bukan hardcode) karena tergantung
    // konten (mis. "Indikator Kinerja" bisa wrap 2 baris di layar sempit).
    const row1 = thead.querySelector('tr.lap-th-row1');
    const row2 = thead.querySelector('tr.lap-th-row2');
    if (row1 && row2) {
      requestAnimationFrame(() => {
        const h1 = row1.getBoundingClientRect().height;
        row2.querySelectorAll('th').forEach(th => { th.style.top = h1 + 'px'; });
      });
    }
  }

  // ── Sesuaikan dropdown Jenis untuk user non-admin: hanya tampilkan jenis
  //    (IKU/IKK/SPM) yang benar-benar menjadi tanggung jawab user, berdasarkan
  //    hasil fetch "Semua Jenis" (baseline lengkap sebelum difilter jenis tertentu) ──
  if (!_user?.is_admin && jenis === 'semua') {
    const jenisSel = document.getElementById('laporanKinerjaJenis');
    if (jenisSel) {
      const present  = new Set(rows.map(r => r._jenis));
      const optsMap  = [['kinerja', 'IKU'], ['ikk', 'IKK'], ['spm', 'SPM']];
      const relevant = optsMap.filter(([, label]) => present.has(label));
      let optsHtml = relevant.length > 1 ? `<option value="semua">Semua Jenis</option>` : '';
      optsHtml += relevant.map(([val, label]) => `<option value="${val}">${label}</option>`).join('');
      if (optsHtml && jenisSel.innerHTML !== optsHtml) {
        const cur = jenisSel.value;
        jenisSel.innerHTML = optsHtml;
        jenisSel.value = [...jenisSel.options].some(o => o.value === cur) ? cur : (relevant[0]?.[0] || 'semua');
      }
      // Kalau cuma 1 jenis, kunci dropdown-nya (tetap kelihatan nilainya) alih-alih disembunyikan,
      // biar user tetap tau laporan yang sedang ditampilkan itu jenis apa.
      jenisSel.disabled = relevant.length <= 1;
      if (typeof syncCustomSelect === 'function') syncCustomSelect('laporanKinerjaJenis');
    }
  } else if (_user?.is_admin) {
    const jenisSel = document.getElementById('laporanKinerjaJenis');
    if (jenisSel) jenisSel.disabled = false;
  }

  // ── Populate dropdown Bidang. Untuk non-admin: opsi cuma bidang yang ada di
  //    antara indikator yang di-assign ke dia (rows sudah di-scope di atas).
  //    Kalau cuma 1 bidang, langsung ke-select otomatis & dropdown dikunci (disabled) ──
  const bidangSel = document.getElementById('laporanKinerjaBidang');
  // Dropdown Bidang tetap tampil, tapi cuma untuk admin; non-admin sudah digantikan
  // dropdown scope "Tanggung Jawab Saya" / "Semua di Bidang Saya".
  const bidangWrapEl = bidangSel?.closest('.select-wrap');
  if (!_user?.is_admin) {
    if (bidangWrapEl) bidangWrapEl.style.display = 'none';
  } else {
    if (bidangWrapEl) bidangWrapEl.style.display = '';
  }
  if (bidangSel) {
    const currentBidang = bidangSel.value;
    const bidangList = [...new Set(rows.map(r => r.penanggung_jawab).filter(Boolean))].sort();
    const optsHtml = `<option value="">Semua Unit Kerja</option>` +
      bidangList.map(b => `<option value="${b}"${b === currentBidang ? ' selected' : ''}>${b}</option>`).join('');
    if (bidangSel.innerHTML !== optsHtml) {
      bidangSel.innerHTML = optsHtml;
      if ([...bidangSel.options].some(o => o.value === currentBidang)) bidangSel.value = currentBidang;
    }
    if (!_user?.is_admin) {
      if (bidangList.length <= 1) bidangSel.value = bidangList[0] || '';
      // Kalau cuma 1 bidang, kunci dropdown-nya (tetap kelihatan nilainya) alih-alih disembunyikan.
      bidangSel.disabled = bidangList.length <= 1;
    } else {
      bidangSel.disabled = false;
    }
    // Rebuild custom select widget dari nol (bukan cuma sync nilai terpilih) supaya
    // daftar opsi Bidang yang baru ikut ter-render di panel dropdown-nya.
    const bidangWrap = bidangSel.closest('.select-wrap');
    if (bidangWrap) {
      bidangWrap.querySelector('.csel-trigger')?.remove();
      bidangWrap.querySelector('.csel-panel')?.remove();
      if (typeof window.initCustomSelects === 'function') window.initCustomSelects();
    } else if (typeof syncCustomSelect === 'function') {
      syncCustomSelect('laporanKinerjaBidang');
    }
  }

  window._laporanKinerjaData = { rows, tahun, bulanPelaporan, bulanDari, bulanSampai, jenis };

  const filteredRows = _applyLaporanKinerjaFilters(rows);

  _lapKinerjaPage = 1;
  const emptyMsg = (!_user?.is_admin && (!_userIndikatorIds || _userIndikatorIds.size === 0))
    ? 'Belum ada indikator yang di-assign ke akun Anda. Hubungi Admin untuk mengatur assignment indikator.'
    : 'Tidak ada data untuk filter ini';
  if (typeof syncCustomSelect === 'function') syncCustomSelect('laporanKinerjaScope');
  _lapRenderKinerjaTbody(filteredRows, bulanTampil, colspanTotal, emptyMsg);
}

function _renderKinerjaEmpty(tahun) {
  const statsEl = document.getElementById('laporanKinerjaStats');
  if (statsEl) statsEl.innerHTML = _statCard('Total Indikator', 0, '#10b981', `<path stroke-linecap="round" stroke-linejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2"/>`);
  const tbody = document.getElementById('laporanKinerjaTableBody');
  if (tbody) tbody.innerHTML = `<tr class="empty-row"><td colspan="21">Tidak ada data untuk tahun ${tahun}</td></tr>`;
}


function _statusBadge(capaian) {
  if (capaian === null || capaian === undefined || capaian === '')
    return `<span style="background:#e5e7eb;color:#6b7280;padding:2px 8px;border-radius:99px;font-size:.7rem">Belum</span>`;
  const c = parseFloat(capaian);
  if (c >= 100) return `<span style="background:#d1fae5;color:#065f46;padding:2px 8px;border-radius:99px;font-size:.7rem">Tercapai</span>`;
  if (c >= 80)  return `<span style="background:#dbeafe;color:#1e40af;padding:2px 8px;border-radius:99px;font-size:.7rem">Mendekati</span>`;
  if (c >= 60)  return `<span style="background:#fef3c7;color:#92400e;padding:2px 8px;border-radius:99px;font-size:.7rem">Cukup</span>`;
  return `<span style="background:#fee2e2;color:#991b1b;padding:2px 8px;border-radius:99px;font-size:.7rem">Rendah</span>`;
}



// ══════════════════════════════════════════════════════
//  SHARED - PDF HELPER (kop surat + print window)
// ══════════════════════════════════════════════════════

function _kopSuratHtml() {
  const logoSrc = (typeof window !== 'undefined' && window.location)
    ? window.location.origin + '/logobalut.png'
    : '/logobalut.png';
  return `
    <div style="padding-bottom:10px;margin-bottom:14px;border-bottom:2px solid #1e293b">
      <div style="position:relative;width:100%;min-height:76px;display:flex;align-items:center;justify-content:center">
        <img src="${logoSrc}" style="position:absolute;left:220px;top:50%;transform:translateY(-50%);width:72px;height:72px;object-fit:contain" onerror="this.style.display='none'">
        <div style="text-align:center;line-height:1.1">
          <div style="font-family:'Bookman Old Style',Bookman,serif;font-size:12px;font-weight:400;text-transform:uppercase;letter-spacing:0.3px">PEMERINTAH KABUPATEN BANGGAI LAUT</div>
          <div style="font-family:'Bookman Old Style',Bookman,serif;font-size:14px;font-weight:700;text-transform:uppercase;letter-spacing:0.2px">DINAS KESEHATAN, PENGENDALIAN PENDUDUK</div>
          <div style="font-family:'Bookman Old Style',Bookman,serif;font-size:14px;font-weight:700;text-transform:uppercase;letter-spacing:0.2px">DAN KELUARGA BERENCANA</div>
          <div style="font-family:'Bookman Old Style',Bookman,serif;font-size:10px;font-weight:400;margin-top:2px">Jl. KM 7 Adean, Banggai Tengah, Banggai Laut, Sulawesi Tengah 94895</div>
          <div style="font-family:'Bookman Old Style',Bookman,serif;font-size:10px;font-weight:400">Pos-el: <span style="color:#1a56db;text-decoration:underline">dinkeskb.balutsulteng@gmail.com</span></div>
        </div>
      </div>
    </div>`;
}

// Buka tab preview - user bisa lihat, lalu Ctrl+P / Save as PDF
function _bukaPreviewPDF(htmlBody, judulDokumen, orientation) {
  const ori = orientation || 'landscape';
  const fullHtml = `<!DOCTYPE html>
<html lang="id">
<head>
<meta charset="UTF-8">
<title>${judulDokumen}</title>
<style>
  * { margin:0; padding:0; box-sizing:border-box; }
  body {
    font-family:Arial,sans-serif; color:#1e293b; background:#f1f5f9; font-size:11px;
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
  /* Paksa semua elemen cetak warna & background */
  *, *::before, *::after {
    -webkit-print-color-adjust:exact !important;
    print-color-adjust:exact !important;
    color-adjust:exact !important;
  }
  @page { size:A4 ${ori}; margin:10mm 14mm; }
  @media print {
    body { background:white; }
    .sheet { margin:0; padding:0; box-shadow:none; width:100%; border-radius:0; }
  }
  table { border-collapse:collapse; width:100%; }
  th, td { font-size:10px; }
  td { word-break:break-word; overflow-wrap:break-word; }
  .lap-md-line { white-space:pre-wrap; }
  .lap-md-list { margin:1px 0 3px; padding-left:1.2em; text-align:left; }
  .lap-md-list li { margin-bottom:2px; padding-left:2px; }
  /* Daftar bernomor: rata kanan dalam kotak lebar tetap biar titik di
     belakang nomor 1 & 2 digit sejajar (konsisten sama editor & preview
     layar). Cuma <ol> yang disentuh, <ul> (bullet simbol) tetap seperti
     semula. Hex langsung (bukan var(--hijau)) karena dokumen PDF ini
     berdiri sendiri, gak ikut :root variabel tema app utama. */
  ol.lap-md-list { list-style:none; counter-reset:lapmdnum; padding-left:1.4em; }
  ol.lap-md-list > li { counter-increment:lapmdnum; position:relative; }
  ol.lap-md-list > li::before {
    content:counter(lapmdnum) ".";
    position:absolute;
    left:-1.4em;
    width:1.3em;
    text-align:right;
    white-space:nowrap;
    color:#0f172a;
    font-weight:400;
  }
  .lap-md-list li:last-child { margin-bottom:0; }
</style>
</head>
<body>
<div class="sheet">
  ${htmlBody}
</div>
<script>
  // Tunggu semua aset (logo) selesai load, lalu langsung buka dialog print
  window.addEventListener('load', function() {
    setTimeout(function() { window.print(); }, 400);
  });
<\/script>
</body>
</html>`;

  const previewWin = window.open('', '_blank');
  if (!previewWin) {
    toast('Pop-up diblokir browser. Izinkan pop-up untuk situs ini.', 'error');
    return;
  }
  previewWin.document.open();
  previewWin.document.write(fullHtml);
  previewWin.document.close();
}


// ══════════════════════════════════════════════════════
//  DOWNLOAD / PREVIEW LAPORAN SURAT - PDF
// ══════════════════════════════════════════════════════

function downloadLaporanSuratPDF(btnEl) {
  const data = window._laporanSuratData;
  if (!data) { toast('Muat data laporan terlebih dahulu', 'error'); return; }

  const { rekap, allRows, tahun, jenis, status } = data;
  const tahunLabel = tahun ? 'Tahun ' + tahun : 'Semua Tahun';

  // Subtitle fleksibel sesuai filter aktif
  const jenisLabel  = jenis === 'masuk' ? 'Surat Masuk' : jenis === 'keluar' ? 'Surat Keluar' : 'Surat Masuk & Keluar';
  const statusLabel = status === 'selesai' ? ' · Selesai' : status === 'belum' ? ' · Belum Selesai' : status === 'terlambat' ? ' · Terlambat' : '';
  const subtitleLabel = `${jenisLabel}${statusLabel} - ${tahunLabel}`;
  const judulDoc = `Laporan Surat - ${tahunLabel}`;

  // ── Rekap bulanan (hanya untuk summary, tidak ditampilkan di PDF) ──
  let totalMasuk = 0, totalSelesai = 0, totalBelum = 0, totalKeluar = 0;
  rekap.forEach(r => { totalMasuk += r.masuk; totalSelesai += r.selesai; totalBelum += r.belum; totalKeluar += r.keluar; });

  // ── Tabel detail surat ──
  const now = new Date();
  const detailRows = (allRows || []).map((r, i) => {
    const tgl   = r.tanggal   ? new Date(r.tanggal  ).toLocaleDateString('id-ID', { day:'2-digit', month:'short', year:'numeric' }) : '-';
    const batas = r.batas_waktu ? new Date(r.batas_waktu).toLocaleDateString('id-ID', { day:'2-digit', month:'short', year:'numeric' }) : '-';
    const bg    = 'white';

    const jenisBadge = r._jenis === 'masuk'
      ? `<span style="background:#d1fae5;color:#065f46;padding:1px 6px;border-radius:99px;font-size:7.5px;white-space:nowrap">Masuk</span>`
      : `<span style="background:#ede9fe;color:#4c1d95;padding:1px 6px;border-radius:99px;font-size:7.5px;white-space:nowrap">Keluar</span>`;

    let statusBadge;
    if (r._jenis === 'keluar') {
      statusBadge = `<span style="background:#dbeafe;color:#1e40af;padding:1px 6px;border-radius:99px;font-size:7.5px;white-space:nowrap">Terkirim</span>`;
    } else if (r.terlambat) {
      statusBadge = `<span style="background:#fee2e2;color:#991b1b;padding:1px 6px;border-radius:99px;font-size:7.5px;white-space:nowrap">Terlambat</span>`;
    } else if (r.selesai) {
      statusBadge = `<span style="background:#d1fae5;color:#065f46;padding:1px 6px;border-radius:99px;font-size:7.5px;white-space:nowrap">Selesai</span>`;
    } else {
      statusBadge = `<span style="background:#fef3c7;color:#92400e;padding:1px 6px;border-radius:99px;font-size:7.5px;white-space:nowrap">Belum Selesai</span>`;
    }

    return `<tr style="background:${bg}">
      <td style="padding:4px 6px;border:1px solid #000;text-align:center;font-size:8px">${i + 1}</td>
      <td style="padding:4px 6px;border:1px solid #000;font-size:8px;white-space:nowrap">${r.no_surat}</td>
      <td style="padding:4px 6px;border:1px solid #000;font-size:8px">${r.perihal}</td>
      <td style="padding:4px 6px;border:1px solid #000;text-align:center">${jenisBadge}</td>
      <td style="padding:4px 6px;border:1px solid #000;text-align:center;font-size:8px;white-space:nowrap">${tgl}</td>
      <td style="padding:4px 6px;border:1px solid #000;font-size:8px">${r.pengirim_tujuan}</td>
      <td style="padding:4px 6px;border:1px solid #000;text-align:center;font-size:8px;white-space:nowrap;color:${r.terlambat ? '#ef4444' : 'inherit'}">${batas}</td>
      <td style="padding:4px 6px;border:1px solid #000;text-align:center">${statusBadge}</td>
    </tr>`;
  }).join('');

  const nowStr = new Date().toLocaleDateString('id-ID', { day:'2-digit', month:'long', year:'numeric' });

  const bodyHtml = `
    ${_kopSuratHtml()}
    <div style="text-align:center;margin:14px 0 12px">
      <div style="font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:.5px">Laporan Surat</div>
      <div style="font-size:11px;color:#64748b;margin-top:4px">Rekap ${subtitleLabel}</div>
    </div>

    ${detailRows ? `
    <table>
      <thead>
        <tr style="background:#0d9488">
          <th style="color:white;padding:5px 6px;border:1px solid #000;text-align:center;font-size:8px;width:36px">NO</th>
          <th style="color:white;padding:5px 6px;border:1px solid #000;text-align:center;font-size:8px;width:130px">NOMOR SURAT</th>
          <th style="color:white;padding:5px 6px;border:1px solid #000;text-align:center;font-size:8px">PERIHAL</th>
          <th style="color:white;padding:5px 6px;border:1px solid #000;text-align:center;font-size:8px;width:52px">JENIS</th>
          <th style="color:white;padding:5px 6px;border:1px solid #000;text-align:center;font-size:8px;width:72px">TANGGAL</th>
          <th style="color:white;padding:5px 6px;border:1px solid #000;text-align:center;font-size:8px;width:150px">PENGIRIM / TUJUAN</th>
          <th style="color:white;padding:5px 6px;border:1px solid #000;text-align:center;font-size:8px;width:72px">BATAS WAKTU</th>
          <th style="color:white;padding:5px 6px;border:1px solid #000;text-align:center;font-size:8px;width:82px">STATUS</th>
        </tr>
      </thead>
      <tbody>${detailRows}</tbody>
    </table>` : ''}`;

  _bukaPreviewPDF(bodyHtml, judulDoc, 'landscape');
}


// ══════════════════════════════════════════════════════
//  HELPER - Rebuild filter status dinamis
// ══════════════════════════════════════════════════════

function _rebuildSuratStatusOptions(allRows, currentVal) {
  const sel = document.getElementById('laporanSuratStatus');
  if (!sel) return;

  // Deteksi status yang benar-benar ada di data
  const adaBelum     = allRows.some(r => r._jenis === 'masuk' && !r.selesai && !r.terlambat);
  const adaSelesai   = allRows.some(r => r.selesai);
  const adaTerlambat = allRows.some(r => r.terlambat);
  const jumlahStatus = [adaBelum, adaSelesai, adaTerlambat].filter(Boolean).length;

  // "Semua Status" cuma ditampilkan kalau statusnya lebih dari 1 macam
  const opts = [];
  if (jumlahStatus > 1) opts.push({ val: '', label: 'Semua Status' });
  if (adaBelum)     opts.push({ val: 'belum',     label: 'Belum Selesai' });
  if (adaSelesai)   opts.push({ val: 'selesai',   label: 'Selesai' });
  if (adaTerlambat) opts.push({ val: 'terlambat', label: 'Terlambat' });
  if (!opts.length) opts.push({ val: '', label: 'Semua Status' });

  // Jika nilai terpilih sudah tidak relevan, jatuh ke opsi pertama yang tersedia
  const validVals = opts.map(o => o.val);
  const safeVal = validVals.includes(currentVal) ? currentVal : opts[0].val;

  sel.innerHTML = opts.map(o =>
    `<option value="${o.val}"${o.val === safeVal ? ' selected' : ''}>${o.label}</option>`
  ).join('');

  // Rebuild custom select supaya tampilan ikut update
  const wrap = sel.closest('.select-wrap');
  if (wrap) {
    wrap.querySelector('.csel-trigger')?.remove();
    wrap.querySelector('.csel-panel')?.remove();
    if (typeof window.initCustomSelects === 'function') window.initCustomSelects();
  }
}

function _rebuildKinerjaStatusOptions(allRows, currentVal) {
  const sel = document.getElementById('laporanKinerjaStatus');
  if (!sel) return;

  const adaBelum     = allRows.some(r => r.realisasi === null || r.realisasi === undefined || r.realisasi === '');
  const adaTercapai  = allRows.some(r => r.capaian != null && parseFloat(r.capaian) >= 100);
  const adaMendekati = allRows.some(r => r.capaian != null && parseFloat(r.capaian) >= 80 && parseFloat(r.capaian) < 100);
  const adaCukup     = allRows.some(r => r.capaian != null && parseFloat(r.capaian) >= 60 && parseFloat(r.capaian) < 80);
  const adaRendah    = allRows.some(r => r.capaian != null && parseFloat(r.capaian) < 60);

  const opts = [{ val: 'semua', label: 'Semua Status' }];
  if (adaBelum)     opts.push({ val: 'belum',     label: 'Belum Diisi' });
  if (adaTercapai)  opts.push({ val: 'tercapai',  label: 'Tercapai' });
  if (adaMendekati) opts.push({ val: 'mendekati', label: 'Mendekati' });
  if (adaCukup)     opts.push({ val: 'cukup',     label: 'Cukup' });
  if (adaRendah)    opts.push({ val: 'rendah',    label: 'Rendah' });

  const validVals = opts.map(o => o.val);
  const safeVal = validVals.includes(currentVal) ? currentVal : 'semua';

  sel.innerHTML = opts.map(o =>
    `<option value="${o.val}"${o.val === safeVal ? ' selected' : ''}>${o.label}</option>`
  ).join('');
}


function _statCard(label, value, color, iconPath) {
  return `<div class="stat-card" style="border-left-color:${color}">
    <div class="stat-card-body">
      <div class="stat-label">${label}</div>
      <div class="stat-value" style="color:${color}">${value}</div>
    </div>
    <div class="stat-icon">
      <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="${color}" stroke-width="2" opacity=".65">${iconPath}</svg>
    </div>
  </div>`;
}
// ── Helper TTD (tanda tangan kepala dinas) ────────────────────────────────
function _ttdHtml(pegawai, tanggalStr, marginTop = 24, fontSize = 10) {
  const nama     = pegawai?.nama     || '';
  const nip      = pegawai?.nip      || '';
  const golongan = pegawai?.golongan || '';
  const jabatan  = 'Kepala Dinas Kesehatan, Pengendalian Penduduk dan<br>Keluarga Berencana Kabupaten Banggai Laut';
  return `
    <div style="margin-top:${marginTop}px;display:flex;justify-content:flex-end;padding-right:60px">
      <div style="text-align:center;min-width:220px">
        <div style="font-size:${fontSize}px">Adean, ${tanggalStr}</div>
        <div style="font-size:${fontSize}px">${jabatan}</div>
        <div style="height:64px"></div>
        <div style="font-size:${fontSize}px;font-weight:700;text-decoration:underline">${nama}</div>
        ${golongan ? `<div style="font-size:${fontSize}px">${golongan}</div>` : ''}
        ${nip ? `<div style="font-size:${fontSize}px">NIP. ${nip}</div>` : ''}
      </div>
    </div>`;
}

// ── Fetch kepala dinas (root pegawai, urutan terkecil / parent_id null) ───
async function _fetchKepalaDinas() {
  try {
    const r = await fetch('/api/pegawai', { headers: authHeaders() });
    if (!r.ok) return null;
    const { pegawai } = await r.json();
    // Kepala = parent_id null, urutan terkecil
    const roots = (pegawai || []).filter(p => !p.parent_id && p.aktif);
    if (!roots.length) return null;
    roots.sort((a, b) => (a.urutan ?? 999) - (b.urutan ?? 999));
    return roots[0];
  } catch { return null; }
}

// Dipanggil saat dropdown Bidang berubah: refresh tabel.
function _filterLaporanKinerjaByBidang() {
  _renderLaporanKinerjaFiltered();
}

// Terapkan filter Bidang yang sedang aktif ke rows lengkap, lalu render ulang tabel.
function _renderLaporanKinerjaFiltered() {
  const data = window._laporanKinerjaData;
  if (!data) return;
  const { rows, bulanDari, bulanSampai } = data;
  const filtered = _applyLaporanKinerjaFilters(rows);

  const bulanList   = Array.from({length: 12}, (_, i) => i + 1);
  const bulanTampil = bulanList.filter(b => b >= bulanDari && b <= bulanSampai);
  const colspanTotal = 5 + bulanTampil.length + 6;
  _lapKinerjaPage = 1;
  _lapRenderKinerjaTbody(filtered, bulanTampil, colspanTotal, 'Tidak ada data untuk filter ini');
}

// Filter rows berdasarkan pilihan dropdown Bidang yang sedang aktif.
function _applyLaporanKinerjaFilters(rows) {
  const bidangValue = document.getElementById('laporanKinerjaBidang')?.value || '';
  return bidangValue ? rows.filter(r => r.penanggung_jawab === bidangValue) : rows;
}

// ══════════════════════════════════════════════════════
//  DOWNLOAD LAPORAN PER URUSAN - PDF
//  Struktur: header urusan + baris indikator (sama seperti laporan utama)
// ══════════════════════════════════════════════════════

// Badge inline "Makna Indikator" (circle panah) & "Tipe Perhitungan" + "Jenis" (pill) -
// ditempel langsung di sel INDIKATOR KINERJA, gaya sama persis dengan tampilan di app
// (bukan kolom terpisah), biar layout tabel PDF gak melebar.
function _lapMaknaBadgeHtml(bermaknaNegatif) {
  return bermaknaNegatif
    ? `<span style="display:inline-flex;align-items:center;justify-content:center;width:15px;height:15px;background:#fee2e2;border-radius:50%;flex-shrink:0"><svg xmlns="http://www.w3.org/2000/svg" width="8" height="8" fill="none" viewBox="0 0 24 24" stroke="#991b1b" stroke-width="3"><path stroke-linecap="round" stroke-linejoin="round" d="M19 14l-7 7m0 0l-7-7m7 7V3"/></svg></span>`
    : `<span style="display:inline-flex;align-items:center;justify-content:center;width:15px;height:15px;background:#d1fae5;border-radius:50%;flex-shrink:0"><svg xmlns="http://www.w3.org/2000/svg" width="8" height="8" fill="none" viewBox="0 0 24 24" stroke="#065f46" stroke-width="3"><path stroke-linecap="round" stroke-linejoin="round" d="M5 10l7-7m0 0l7 7m-7-7v18"/></svg></span>`;
}
const _LAP_TIPE_PERHITUNGAN_INFO = {
  kumulatif:     { label: 'Kumulatif',     bg: '#eff6ff', teks: '#1d4ed8', border: '#bfdbfe' },
  rata_rata:     { label: 'Rata-rata',     bg: '#fffbeb', teks: '#b45309', border: '#fde68a' },
  non_kumulatif: { label: 'Non-Kumulatif', bg: '#fdf4ff', teks: '#a21caf', border: '#f5d0fe' },
};
function _lapPillHtml(label, info) {
  return `<span style="display:inline-block;font-size:8px;font-weight:700;color:${info.teks};background:${info.bg};border:1px solid ${info.border};padding:2px 7px;border-radius:8px;white-space:nowrap">${label}</span>`;
}
// Baris badge di bawah nama indikator: pill tipe perhitungan
function _lapIndikatorBadgeRowHtml(r) {
  const tipeInfo = _LAP_TIPE_PERHITUNGAN_INFO[r?.tipe_perhitungan] || _LAP_TIPE_PERHITUNGAN_INFO.non_kumulatif;
  return `<div style="display:flex;gap:4px;margin-top:4px;flex-wrap:wrap">${_lapPillHtml(tipeInfo.label, tipeInfo)}</div>`;
}


// Render baris <tr> untuk satu indikator pada tabel PDF Capaian/Monev Kinerja.
// Dipakai baik di mode ter-grouping (per Urusan/TSP, untuk admin) maupun mode
// flat langsung dari data.rows (untuk non-admin, tanpa perlu template).
function _lapKinerjaPdfRowHtml(r, no, displayCols, namaIndikatorOverride) {
  const bulanCells = displayCols.map(c => {
    const v = c.type === 'tw' ? r.realisasiPerBulan?.[c.lastBulan] : r.realisasiPerBulan?.[c.bulan];
    const empty = v === null || v === undefined || v === '';
    return `<td style="padding:3px 2px;border:1px solid #000;text-align:center;vertical-align:top;font-size:10px;color:${empty ? '#000000' : '#1e293b'};min-width:34px;white-space:nowrap">${empty ? '-' : v}</td>`;
  }).join('');
  const capColor = r._capaian === null ? '#000000'
    : parseFloat(r._capaian) >= 100 ? '#059669'
    : parseFloat(r._capaian) >= 80  ? '#2563eb'
    : parseFloat(r._capaian) >= 60  ? '#d97706' : '#dc2626';
  return `<tr>
    <td style="padding:4px 5px;border:1px solid #000;text-align:center;vertical-align:top;font-size:10px;color:#000000;min-width:36px;white-space:nowrap">${no}</td>
    <td style="padding:4px 5px;border:1px solid #000;vertical-align:top;font-size:10px">
      <div style="display:flex;align-items:center;gap:5px;flex-wrap:wrap"><span>${namaIndikatorOverride || r.nama_indikator}</span>${_lapMaknaBadgeHtml(r.bermakna_negatif)}</div>
      ${_lapIndikatorBadgeRowHtml(r)}
    </td>
    <td style="padding:4px 3px;border:1px solid #000;text-align:center;vertical-align:top;font-size:10px;color:#000000">${r.target ?? '-'}</td>
    <td style="padding:4px 3px;border:1px solid #000;text-align:center;vertical-align:top;font-size:10px;color:#000000">${r.satuan || '-'}</td>
    <td style="padding:4px 5px;border:1px solid #000;text-align:center;vertical-align:top;font-size:10px;color:#1e293b;min-width:110px">${r.penanggung_jawab || '-'}</td>
    ${bulanCells}
    <td style="padding:4px 3px;border:1px solid #000;text-align:center;vertical-align:top;font-size:10px;font-weight:700;color:#000000">${r._realisasiSd ?? '-'}</td>
    <td style="padding:4px 3px;border:1px solid #000;text-align:center;vertical-align:top;font-size:10px;font-weight:700;color:${capColor}">${r._capaian !== null ? r._capaian + '%' : '-'}</td>
    <td style="padding:4px 5px;border:1px solid #000;text-align:${r._fpenghambat?'left':'center'};vertical-align:top;font-size:10px;max-width:220px;word-break:break-word;overflow-wrap:anywhere">${r._fpenghambat ? _lapMdToHtml(r._fpenghambat) : '-'}</td>
    <td style="padding:4px 5px;border:1px solid #000;text-align:${r._solusi?'left':'center'};vertical-align:top;font-size:10px;max-width:220px;word-break:break-word;overflow-wrap:anywhere">${r._solusi ? _lapMdToHtml(r._solusi) : '-'}</td>
    <td style="padding:4px 5px;border:1px solid #000;text-align:${r._fpendukung?'left':'center'};vertical-align:top;font-size:10px;max-width:220px;word-break:break-word;overflow-wrap:anywhere">${r._fpendukung ? _lapMdToHtml(r._fpendukung) : '-'}</td>
    <td style="padding:4px 5px;border:1px solid #000;text-align:${r._rencana_tl?'left':'center'};vertical-align:top;font-size:10px;max-width:220px;word-break:break-word;overflow-wrap:anywhere">${r._rencana_tl ? _lapMdToHtml(r._rencana_tl) : '-'}</td>
  </tr>`;
}

// Baris flat langsung dari data.rows (tanpa grouping Urusan/TSP) - dipakai untuk non-admin,
// yang laporannya cuma berisi indikator tanggung jawabnya sendiri jadi grouping gak diperlukan.
function _lapKinerjaFlatRowsHtml(rows, displayCols) {
  let no = 0;
  return rows.map(r => _lapKinerjaPdfRowHtml(r, ++no, displayCols)).join('');
}

async function downloadLaporanByUrusan(btnEl) {
  const data = window._laporanKinerjaData;
  if (!data || !data.rows) { toast('Muat data laporan terlebih dahulu', 'error'); return; }

  if (btnEl) { btnEl.disabled = true; btnEl.innerHTML = `<span class="btn-spin" style="width:12px;height:12px"></span> Memuat data...`; }
  try {
    // Non-admin: langsung tampilkan indikator tanggung jawabnya sendiri (flat),
    // gak perlu template Urusan yang notabene struktur punya admin/instansi.
    let tplWithIndikator = null;
    if (_user?.is_admin) {
      // Ambil semua template urusan + indikatornya
      const res = await fetch('/api/kinerja/laporan-template?jenis=urusan', { headers: authHeaders() });
      const tplData = await res.json();
      const templates = tplData.templates || [];
      if (!templates.length) { toast('Belum ada template Urusan. Buat dulu di Master Data → Kelola Indikator → Kelola Laporan.', 'error'); return; }

      // Fetch indikator per template
      tplWithIndikator = await Promise.all(templates.map(async t => {
        const r = await fetch(`/api/kinerja/laporan-template/${t.id}/indikator`, { headers: authHeaders() });
        const d = await r.json();
        return { ...t, indikator: d.indikator || [] };
      }));
    }

    const { tahun, bulanDari = 1, bulanSampai = 12 } = data;
    const rowMap = {};
    data.rows.forEach(r => { rowMap[r.indikator_id || r.id] = r; });

    const BULAN_FULL = ['','Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];
    const BULAN_PENDEK = ['JAN','FEB','MAR','APR','MEI','JUN','JUL','AGU','SEP','OKT','NOV','DES'];
    const bulanList = Array.from({length: bulanSampai - bulanDari + 1}, (_, i) => bulanDari + i);
    const sdLabel = bulanDari === bulanSampai
      ? `${BULAN_FULL[bulanSampai]} ${tahun}`
      : `${BULAN_FULL[bulanDari]} - ${BULAN_FULL[bulanSampai]} ${tahun}`;

    const _twDef = [{tw:'I',s:1,e:3},{tw:'II',s:4,e:6},{tw:'III',s:7,e:9},{tw:'IV',s:10,e:12}];
    const _twPdfAktif = _twDef.filter(tw => bulanList.some(b => b >= tw.s && b <= tw.e));
    // TW dianggap "lengkap" jika ketiga bulannya masuk dalam bulanList (range filter)
    const _twLengkap = (tw) => [tw.s, tw.s+1, tw.s+2].every(b => bulanList.includes(b));
    // Kolom yang benar2 ditampilkan: TW lengkap = 1 kolom gabungan, TW belum lengkap = pecah per bulan
    const displayCols = _twPdfAktif.flatMap(tw => {
      if (_twLengkap(tw)) {
        return [{ type: 'tw', tw: tw.tw, lastBulan: tw.e }];
      }
      return bulanList.filter(b => b >= tw.s && b <= tw.e).map(b => ({ type: 'bulan', bulan: b }));
    });
    const bulanHeaderCells = displayCols.filter(c => c.type === 'bulan').map(c =>
      `<th style="color:white;padding:4px 2px;border:1px solid #000;text-align:center;font-size:10px;min-width:34px;white-space:nowrap">${BULAN_PENDEK[c.bulan-1]}</th>`
    ).join('');
    const twJudulColspan = displayCols.length;
    const twJudulHeader = `<th colspan="${twJudulColspan}" style="color:white;padding:4px 3px;border:1px solid #000;text-align:center;font-size:10px;font-weight:700">KINERJA / REALISASI TRIWULAN</th>`;
    const twHeaders = _twPdfAktif.map(tw => {
        const cols = displayCols.filter(c => (c.type === 'tw' && c.tw === tw.tw) || (c.type === 'bulan' && c.bulan >= tw.s && c.bulan <= tw.e)).length;
        const isLengkapTw = _twLengkap(tw);
        return `<th colspan="${cols}" ${isLengkapTw ? 'rowspan="2"' : ''} style="color:white;padding:4px 3px;border:1px solid #000;text-align:center;font-size:10px;min-width:${cols*34}px;white-space:nowrap">${tw.tw}</th>`;
      }).join('');

    let rowsHtml;
    if (tplWithIndikator) {
      // Admin: grouping per template Urusan
      let no = 0;
      rowsHtml = tplWithIndikator.map(tpl => {
        const headerRow = `<tr style="background:#99f6e4">
          <td colspan="${5 + displayCols.length + 6}" style="padding:5px 8px;font-size:10px;font-weight:700;color:#000000;border:1px solid #000;text-transform:uppercase;letter-spacing:.3px">
            ${tpl.nama}
          </td>
        </tr>`;

        const indRows = tpl.indikator.map(ind => {
          const r = data.rows.find(row => row.indikator_id === ind.id || row.id === ind.id);
          if (!r) return '';
          no++;
          return _lapKinerjaPdfRowHtml(r, no, displayCols, r.nama_indikator || ind.indikator_kinerja);
        }).filter(Boolean).join('');

        return headerRow + indRows;
      }).join('');
    } else {
      // Non-admin: flat langsung dari indikator tanggung jawabnya sendiri
      rowsHtml = _lapKinerjaFlatRowsHtml(data.rows, displayCols);
    }

    const _witaOffset = new Date(new Date().getTime() + new Date().getTimezoneOffset() * 60000 + 8 * 3600000);
    const nowStr = new Date().toLocaleDateString('id-ID', { day:'2-digit', month:'long', year:'numeric' });
    const nowJam = `${String(_witaOffset.getHours()).padStart(2,'0')}:${String(_witaOffset.getMinutes()).padStart(2,'0')}:${String(_witaOffset.getSeconds()).padStart(2,'0')} WITA`;

    const kepalaDinas = await _fetchKepalaDinas();

    const bodyHtml = `
      ${_kopSuratHtml()}
      <div style="text-align:center;margin:18px 0 14px">
        <div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.5px">MONITORING DAN EVALUASI CAPAIAN KINERJA</div>
        <div style="font-size:10px;color:#475569;margin-top:3px">${sdLabel}</div>
      </div>
      <table style="border-collapse:collapse;border-spacing:0;width:100%;table-layout:auto">
        <thead>
          <tr style="background:#0d9488">
            <th rowspan="3" style="color:white;padding:5px 4px;border:1px solid #000;text-align:center;font-size:10px;width:36px">NO</th>
            <th rowspan="3" style="color:white;padding:5px 4px;border:1px solid #000;text-align:center;font-size:10px;min-width:150px">INDIKATOR KINERJA</th>
            <th rowspan="3" style="color:white;padding:5px 3px;border:1px solid #000;text-align:center;font-size:10px;width:40px">TARGET ${tahun}</th>
            <th rowspan="3" style="color:white;padding:5px 3px;border:1px solid #000;text-align:center;font-size:10px;width:38px">SATUAN</th>
            <th rowspan="3" style="color:white;padding:5px 3px;border:1px solid #000;text-align:center;font-size:10px;min-width:110px">UNIT KERJA</th>
            ${twJudulHeader}
            <th rowspan="3" style="color:white;padding:5px 3px;border:1px solid #000;text-align:center;font-size:10px;width:50px">REALISASI S.D ${BULAN_FULL[bulanSampai].toUpperCase()}</th>
            <th rowspan="3" style="color:white;padding:5px 3px;border:1px solid #000;text-align:center;font-size:10px;width:45px">CAPAIAN</th>
            <th rowspan="3" style="color:white;padding:5px 4px;border:1px solid #000;text-align:center;font-size:10px;min-width:130px">FAKTOR PENGHAMBAT</th>
            <th rowspan="3" style="color:white;padding:5px 4px;border:1px solid #000;text-align:center;font-size:10px;min-width:130px">SOLUSI</th>
            <th rowspan="3" style="color:white;padding:5px 4px;border:1px solid #000;text-align:center;font-size:10px;min-width:130px">FAKTOR PENDUKUNG</th>
            <th rowspan="3" style="color:white;padding:5px 4px;border:1px solid #000;text-align:center;font-size:10px;min-width:130px">RENCANA TINDAK LANJUT</th>
          </tr>
          <tr style="background:#0d9488">${twHeaders}</tr>
          <tr style="background:#0d9488">${bulanHeaderCells}</tr>
        </thead>
        <tbody>${rowsHtml}</tbody>
      </table>
      ${_ttdHtml(kepalaDinas, nowStr)}`;

    _bukaPreviewPDF(bodyHtml, `Capaian Indikator ${sdLabel}`, 'landscape');
  } catch (e) {
    toast('Gagal generate laporan: ' + e.message, 'error');
  } finally {
    if (btnEl) { btnEl.disabled = false; btnEl.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5"><path stroke-linecap="round" stroke-linejoin="round" d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline stroke-linecap="round" stroke-linejoin="round" points="7 10 12 15 17 10"/><line stroke-linecap="round" stroke-linejoin="round" x1="12" y1="15" x2="12" y2="3"/></svg> Capaian Indikator`; }
  }
}

// ══════════════════════════════════════════════════════
//  DOWNLOAD LAPORAN PER TSP - PDF
//  Struktur: NO | SASARAN STRATEGIS/PROGRAM/KEGIATAN | INDIKATOR | SATUAN | TARGET TAHUN
// ══════════════════════════════════════════════════════

async function downloadLaporanByTSP(btnEl) {
  const data = window._laporanKinerjaData;
  if (!data || !data.rows) { toast('Muat data laporan terlebih dahulu', 'error'); return; }

  if (btnEl) { btnEl.disabled = true; btnEl.innerHTML = `<span class="btn-spin" style="width:12px;height:12px"></span> Memuat data...`; }
  try {
    // Non-admin: langsung tampilkan indikator tanggung jawabnya sendiri (flat),
    // gak perlu template TSP (Tujuan/Sasaran/Program/Kegiatan) yang notabene struktur instansi.
    let orderedTpl = null;
    if (_user?.is_admin) {
      // Ambil SEMUA template kecuali urusan (tujuan + sasaran + program + kegiatan)
      const res = await fetch('/api/kinerja/laporan-template', { headers: authHeaders() });
      const tplData = await res.json();
      const allTemplates = (tplData.templates || []).filter(t => t.jenis !== 'urusan');
      if (!allTemplates.length) { toast('Belum ada template TSP. Buat dulu di Master Data → Kelola Indikator → Kelola Laporan.', 'error'); return; }

      const tplWithIndikator = await Promise.all(allTemplates.map(async t => {
        const r = await fetch(`/api/kinerja/laporan-template/${t.id}/indikator`, { headers: authHeaders() });
        const d = await r.json();
        return { ...t, indikator: d.indikator || [] };
      }));

      // Urutkan hierarkis: build tree dari parent_id, lalu DFS
      const tplMap = {};
      tplWithIndikator.forEach(t => { tplMap[t.id] = { ...t, _children: [] }; });
      const roots = [];
      tplWithIndikator.forEach(t => {
        if (t.parent_id && tplMap[t.parent_id]) {
          tplMap[t.parent_id]._children.push(tplMap[t.id]);
        } else {
          roots.push(tplMap[t.id]);
        }
      });
      const sortByUrutan = arr => arr.sort((a, b) => (a.urutan || 0) - (b.urutan || 0));
      const flattenTree = (nodes) => {
        sortByUrutan(nodes);
        let result = [];
        nodes.forEach(n => {
          result.push(n);
          if (n._children.length) result = result.concat(flattenTree(n._children));
        });
        return result;
      };
      orderedTpl = flattenTree(roots);
    }

    const { tahun, bulanSampai = 12, bulanDari = 1 } = data;
    const BULAN_FULL = ['','Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];
    const sdLabel = bulanDari === bulanSampai
      ? `${BULAN_FULL[bulanSampai]} ${tahun}`
      : `${BULAN_FULL[bulanDari]} - ${BULAN_FULL[bulanSampai]} ${tahun}`;
    const twLabel = bulanSampai <= 3 ? 'TW I' : bulanSampai <= 6 ? 'TW II' : bulanSampai <= 9 ? 'TW III' : 'TW IV';

    const BULAN_PENDEK = ['JAN','FEB','MAR','APR','MEI','JUN','JUL','AGU','SEP','OKT','NOV','DES'];
    const bulanList = Array.from({length: bulanSampai - bulanDari + 1}, (_, i) => bulanDari + i);
    const _twDef2 = [{tw:'I',s:1,e:3},{tw:'II',s:4,e:6},{tw:'III',s:7,e:9},{tw:'IV',s:10,e:12}];
    const _twPdfAktif2 = _twDef2.filter(tw => bulanList.some(b => b >= tw.s && b <= tw.e));
    const _twLengkap2 = (tw) => [tw.s, tw.s+1, tw.s+2].every(b => bulanList.includes(b));
    const displayCols = _twPdfAktif2.flatMap(tw => {
      if (_twLengkap2(tw)) {
        return [{ type: 'tw', tw: tw.tw, lastBulan: tw.e }];
      }
      return bulanList.filter(b => b >= tw.s && b <= tw.e).map(b => ({ type: 'bulan', bulan: b }));
    });
    const bulanHeaderCells = displayCols.filter(c => c.type === 'bulan').map(c =>
      `<th style="color:white;padding:4px 2px;border:1px solid #000;text-align:center;font-size:10px;min-width:34px;white-space:nowrap">${BULAN_PENDEK[c.bulan-1]}</th>`
    ).join('');
    const twJudulColspan = displayCols.length;
    const twJudulHeader = `<th colspan="${twJudulColspan}" style="color:white;padding:4px 3px;border:1px solid #000;text-align:center;font-size:10px;font-weight:700">KINERJA / REALISASI TRIWULAN</th>`;
    const twHeaders = _twPdfAktif2.map(tw => {
        const cols = displayCols.filter(c => (c.type === 'tw' && c.tw === tw.tw) || (c.type === 'bulan' && c.bulan >= tw.s && c.bulan <= tw.e)).length;
        const isLengkapTw = _twLengkap2(tw);
        return `<th colspan="${cols}" ${isLengkapTw ? 'rowspan="2"' : ''} style="color:white;padding:4px 3px;border:1px solid #000;text-align:center;font-size:10px;min-width:${cols*34}px;white-space:nowrap">${tw.tw}</th>`;
      }).join('');

    const _witaOffset = new Date(new Date().getTime() + new Date().getTimezoneOffset() * 60000 + 8 * 3600000);
    const nowStr = new Date().toLocaleDateString('id-ID', { day:'2-digit', month:'long', year:'numeric' });
    const nowJam = `${String(_witaOffset.getHours()).padStart(2,'0')}:${String(_witaOffset.getMinutes()).padStart(2,'0')}:${String(_witaOffset.getSeconds()).padStart(2,'0')} WITA`;

    const kepalaDinas = await _fetchKepalaDinas();

    // Buat lookup map: indikator id (number) → row
    const rowById = {};
    data.rows.forEach(row => {
      // row.id bisa string (key dari object) atau number, normalisasi ke number
      rowById[parseInt(row.id)] = row;
    });

    // Config label per jenis (tanpa fill warna)
    const JENIS_CFG = {
      tujuan:   { label: 'TUJUAN' },
      sasaran:  { label: 'SASARAN STRATEGIS' },
      program:  { label: 'PROGRAM' },
      kegiatan: { label: 'KEGIATAN' },
    };

    // Counter per jenis untuk penomoran
    const jenisCounter = { tujuan: 0, sasaran: 0, program: 0, kegiatan: 0 };
    let kegiatanInGroup = 0; // reset tiap ganti program/sasaran
    let lastParentJenis = null;

    const rowsHtml = !orderedTpl ? _lapKinerjaFlatRowsHtml(data.rows, displayCols) : orderedTpl.map((tpl, tplIdx) => {
      const cfg = JENIS_CFG[tpl.jenis] || { label: tpl.jenis.toUpperCase() };
      if (tpl.jenis in jenisCounter) jenisCounter[tpl.jenis]++;
      const jenisNo = jenisCounter[tpl.jenis] || '';
      const labelWithNo = (tpl.jenis === 'sasaran' || tpl.jenis === 'program') && orderedTpl.filter(t => t.jenis === tpl.jenis).length > 1
        ? `${cfg.label} ${jenisNo}`
        : cfg.label;

      // Untuk kegiatan: reset counter saat parent berubah
      if (tpl.jenis === 'kegiatan') {
        // Cek apakah ini kegiatan pertama setelah parent baru
        const prevNonKegiatan = orderedTpl.slice(0, tplIdx).filter(t => t.jenis !== 'kegiatan').pop();
        if (prevNonKegiatan !== lastParentJenis) {
          lastParentJenis = prevNonKegiatan;
          kegiatanInGroup = 0;
        }
        kegiatanInGroup++;
      }

      if (!tpl.indikator.length) return '';

      // Baris header "KEGIATAN :" untuk kegiatan pertama dalam grup
      const kegiatanHeaderRow = tpl.jenis === 'kegiatan' && kegiatanInGroup === 1
        ? `<tr><td colspan="${12 + displayCols.length}" style="padding:4px 8px;border:1px solid #000;font-size:10px;font-weight:700;color:#000;letter-spacing:.3px">KEGIATAN :</td></tr>`
        : '';

      return tpl.indikator.map((ind, idx) => {
        const r = rowById[parseInt(ind.id)];
        const target    = r?.target  ?? '-';
        const satuan    = r?.satuan  || ind.satuan || '-';
        const namaInd   = r?.nama_indikator || ind.indikator_kinerja || '-';
        const realisasi = r?._realisasiSd ?? '-';
        const capaian   = r?._capaian !== null && r?._capaian !== undefined ? r._capaian + '%' : '-';
        const capColor  = !r?._capaian ? '#000000'
          : parseFloat(r._capaian) >= 100 ? '#059669'
          : parseFloat(r._capaian) >= 80  ? '#2563eb'
          : parseFloat(r._capaian) >= 60  ? '#d97706' : '#dc2626';
        const permasalahan = r?._fpenghambat ? _lapMdToHtml(r._fpenghambat) : '-';
        const solusi       = r?._solusi ? _lapMdToHtml(r._solusi) : '-';
        const fpendukung   = r?._fpendukung ? _lapMdToHtml(r._fpendukung) : '-';
        const rencanaTl    = r?._rencana_tl ? _lapMdToHtml(r._rencana_tl) : '-';
        const bulanCells = displayCols.map(c => {
          const v = c.type === 'tw' ? r?.realisasiPerBulan?.[c.lastBulan] : r?.realisasiPerBulan?.[c.bulan];
          const empty = v === null || v === undefined || v === '';
          return `<td style="padding:5px 2px;border:1px solid #000;text-align:center;font-size:10px;color:${empty ? '#000000' : '#1e293b'};vertical-align:top;min-width:34px;white-space:nowrap">${empty ? '-' : v}</td>`;
        }).join('');

        let groupCell;
        if (tpl.jenis === 'kegiatan') {
          groupCell = idx === 0
            ? `<td style="padding:6px 8px;border:1px solid #000;border-top:1px solid #000;font-size:10px;font-weight:700;vertical-align:top;color:#000;line-height:1.4">
                 <div style="font-size:10px;line-height:1.4">${tpl.nama}</div>
               </td>`
            : `<td style="padding:5px 6px;border:1px solid #000;border-top:none"></td>`;
        } else {
          groupCell = idx === 0
            ? `<td colspan="2" style="padding:6px 8px;border:1px solid #000;border-top:1px solid #000;font-size:10px;font-weight:700;vertical-align:top;color:#000;background:#f8fafc">
                 <div style="font-size:10px;font-weight:700;color:#000;margin-bottom:2px;text-transform:uppercase;letter-spacing:.4px">${labelWithNo}</div>
                 <div style="font-size:10px;line-height:1.4">${tpl.nama}</div>
               </td>`
            : `<td style="padding:5px 6px;border:1px solid #000;border-top:none"></td>`;
        }

        return `${idx === 0 ? kegiatanHeaderRow : ''}<tr>
          ${idx === 0 && tpl.jenis !== 'kegiatan' ? '' : `<td style="padding:6px 8px;border:1px solid #000;text-align:center;font-size:10px;font-weight:700;color:#000000;vertical-align:top;line-height:1.4">${tpl.jenis === 'kegiatan' && idx === 0 ? kegiatanInGroup : ''}</td>`}
          ${groupCell}
          <td style="padding:5px 8px;border:1px solid #000;font-size:10px;vertical-align:top;line-height:1.4">
            <div style="display:flex;align-items:center;gap:5px;flex-wrap:wrap"><span>${namaInd}</span>${_lapMaknaBadgeHtml(r?.bermakna_negatif)}</div>
            ${_lapIndikatorBadgeRowHtml(r)}
          </td>
          <td style="padding:5px 6px;border:1px solid #000;text-align:center;font-size:10px;vertical-align:top">${satuan}</td>
          <td style="padding:5px 6px;border:1px solid #000;text-align:center;font-size:10px;font-weight:700;vertical-align:top">${target}</td>
          <td style="padding:5px 6px;border:1px solid #000;text-align:center;font-size:10px;color:#1e293b;vertical-align:top;min-width:110px">${r?.penanggung_jawab || '-'}</td>
          ${bulanCells}
          <td style="padding:5px 6px;border:1px solid #000;text-align:center;font-size:10px;font-weight:700;vertical-align:top">${realisasi}</td>
          <td style="padding:5px 6px;border:1px solid #000;text-align:center;font-size:10px;font-weight:700;color:${capColor};vertical-align:top">${capaian}</td>
          <td style="padding:5px 7px;border:1px solid #000;text-align:${r?._fpenghambat?'left':'center'};vertical-align:top;font-size:10px;line-height:1.4;max-width:220px;word-break:break-word;overflow-wrap:anywhere">${permasalahan}</td>
          <td style="padding:5px 7px;border:1px solid #000;text-align:${r?._solusi?'left':'center'};vertical-align:top;font-size:10px;line-height:1.4;max-width:220px;word-break:break-word;overflow-wrap:anywhere">${solusi}</td>
          <td style="padding:5px 7px;border:1px solid #000;text-align:${r?._fpendukung?'left':'center'};vertical-align:top;font-size:10px;line-height:1.4;max-width:220px;word-break:break-word;overflow-wrap:anywhere">${fpendukung}</td>
          <td style="padding:5px 7px;border:1px solid #000;text-align:${r?._rencana_tl?'left':'center'};vertical-align:top;font-size:10px;line-height:1.4;max-width:220px;word-break:break-word;overflow-wrap:anywhere">${rencanaTl}</td>
        </tr>`;
      }).join('');
    }).join('');

    // Non-admin gak punya hierarki Tujuan/Sasaran/Program/Kegiatan, jadi kolom
    // grouping-nya di-skip - pakai header tabel yang sama sederhananya kayak
    // laporan Capaian Indikator (flat per-indikator).
    const theadHtml = orderedTpl ? `
          <tr style="background:#0d9488">
            <th rowspan="3" style="color:white;padding:6px 4px;border:1px solid #000;text-align:center;font-size:10px;width:36px">NO</th>
            <th rowspan="3" style="color:white;padding:6px 8px;border:1px solid #000;text-align:center;font-size:10px;width:180px">SASARAN STRATEGIS /<br>PROGRAM / KEGIATAN</th>
            <th rowspan="3" style="color:white;padding:6px 8px;border:1px solid #000;text-align:center;font-size:10px">INDIKATOR KINERJA</th>
            <th rowspan="3" style="color:white;padding:6px 5px;border:1px solid #000;text-align:center;font-size:10px;width:50px">SATUAN</th>
            <th rowspan="3" style="color:white;padding:6px 5px;border:1px solid #000;text-align:center;font-size:10px;width:55px">TARGET ${tahun}</th>
            <th rowspan="3" style="color:white;padding:6px 5px;border:1px solid #000;text-align:center;font-size:10px;min-width:110px">UNIT KERJA</th>
            ${twJudulHeader}
            <th rowspan="3" style="color:white;padding:6px 5px;border:1px solid #000;text-align:center;font-size:10px;width:55px">REALISASI S.D ${BULAN_FULL[bulanSampai].toUpperCase()}</th>
            <th rowspan="3" style="color:white;padding:6px 5px;border:1px solid #000;text-align:center;font-size:10px;width:50px">CAPAIAN</th>
            <th rowspan="3" style="color:white;padding:6px 6px;border:1px solid #000;text-align:center;font-size:10px;min-width:140px">FAKTOR PENGHAMBAT</th>
            <th rowspan="3" style="color:white;padding:6px 6px;border:1px solid #000;text-align:center;font-size:10px;min-width:140px">SOLUSI</th>
            <th rowspan="3" style="color:white;padding:6px 6px;border:1px solid #000;text-align:center;font-size:10px;min-width:140px">FAKTOR PENDUKUNG</th>
            <th rowspan="3" style="color:white;padding:6px 6px;border:1px solid #000;text-align:center;font-size:10px;min-width:140px">RENCANA TINDAK LANJUT</th>
          </tr>
          <tr style="background:#0d9488">${twHeaders}</tr>
          <tr style="background:#0d9488">${bulanHeaderCells}</tr>` : `
          <tr style="background:#0d9488">
            <th rowspan="3" style="color:white;padding:5px 4px;border:1px solid #000;text-align:center;font-size:10px;width:36px">NO</th>
            <th rowspan="3" style="color:white;padding:5px 4px;border:1px solid #000;text-align:center;font-size:10px;min-width:150px">INDIKATOR KINERJA</th>
            <th rowspan="3" style="color:white;padding:5px 3px;border:1px solid #000;text-align:center;font-size:10px;width:40px">TARGET ${tahun}</th>
            <th rowspan="3" style="color:white;padding:5px 3px;border:1px solid #000;text-align:center;font-size:10px;width:38px">SATUAN</th>
            <th rowspan="3" style="color:white;padding:5px 3px;border:1px solid #000;text-align:center;font-size:10px;min-width:110px">UNIT KERJA</th>
            ${twJudulHeader}
            <th rowspan="3" style="color:white;padding:5px 3px;border:1px solid #000;text-align:center;font-size:10px;width:50px">REALISASI S.D ${BULAN_FULL[bulanSampai].toUpperCase()}</th>
            <th rowspan="3" style="color:white;padding:5px 3px;border:1px solid #000;text-align:center;font-size:10px;width:45px">CAPAIAN</th>
            <th rowspan="3" style="color:white;padding:5px 4px;border:1px solid #000;text-align:center;font-size:10px;min-width:130px">FAKTOR PENGHAMBAT</th>
            <th rowspan="3" style="color:white;padding:5px 4px;border:1px solid #000;text-align:center;font-size:10px;min-width:130px">SOLUSI</th>
            <th rowspan="3" style="color:white;padding:5px 4px;border:1px solid #000;text-align:center;font-size:10px;min-width:130px">FAKTOR PENDUKUNG</th>
            <th rowspan="3" style="color:white;padding:5px 4px;border:1px solid #000;text-align:center;font-size:10px;min-width:130px">RENCANA TINDAK LANJUT</th>
          </tr>
          <tr style="background:#0d9488">${twHeaders}</tr>
          <tr style="background:#0d9488">${bulanHeaderCells}</tr>`;

    const bodyHtml = `
      ${_kopSuratHtml()}
      <table style="border-collapse:collapse;width:100%;margin-bottom:12px;font-size:10px">
        <tr>
          <td style="padding:2px 0;width:160px;font-weight:700;font-size:10px">PERANGKAT DAERAH</td>
          <td style="padding:2px 0;width:10px;font-size:10px">:</td>
          <td style="padding:2px 0;font-weight:600;font-size:10px">DINAS KESEHATAN, PENGENDALIAN PENDUDUK DAN KELUARGA BERENCANA</td>
        </tr>
        <tr>
          <td style="padding:2px 0;font-weight:700;font-size:10px">BULAN/TRIWULAN</td>
          <td style="padding:2px 0;font-size:10px">:</td>
          <td style="padding:2px 0;font-weight:600;font-size:10px">${BULAN_FULL[bulanSampai].toUpperCase()} / ${twLabel}</td>
        </tr>
      </table>
      <div style="text-align:center;margin:16px 0 14px">
        <div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.5px">MONITORING DAN EVALUASI CAPAIAN KINERJA</div>
        <div style="font-size:10px;color:#475569;margin-top:3px">${sdLabel}</div>
      </div>
      <table style="border-collapse:collapse;border-spacing:0;width:100%">
        <thead>${theadHtml}</thead>
        <tbody>${rowsHtml}</tbody>
      </table>
      ${_ttdHtml(kepalaDinas, nowStr)}`;

    _bukaPreviewPDF(bodyHtml, `Monev Kinerja ${sdLabel}`, 'landscape');
  } catch (e) {
    toast('Gagal generate laporan: ' + e.message, 'error');
  } finally {
    if (btnEl) { btnEl.disabled = false; btnEl.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5"><path stroke-linecap="round" stroke-linejoin="round" d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline stroke-linecap="round" stroke-linejoin="round" points="7 10 12 15 17 10"/><line stroke-linecap="round" stroke-linejoin="round" x1="12" y1="15" x2="12" y2="3"/></svg> Monev Kinerja`; }
  }
}