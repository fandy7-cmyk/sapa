// ── Helper ───────────────────────────────────────────────────────────────
function normTarget(r) {
  if (r.target_tahun != null) r.target_tahun = parseFloat(r.target_tahun);
  if (r.target_display == null && r.target_tahun != null) r.target_display = null;
  r.bermakna_negatif = r.bermakna_negatif === true || r.bermakna_negatif === 'true';
  r.tipe_nilai = r.tipe_nilai === 'predikat' ? 'predikat' : 'angka';
  // Parse jenis_custom: Neon JSONB bisa datang sebagai string
  if (typeof r.jenis_custom === 'string') {
    try { r.jenis_custom = JSON.parse(r.jenis_custom); } catch { r.jenis_custom = []; }
  }
  if (!Array.isArray(r.jenis_custom)) r.jenis_custom = [];
  return r;
}

// Predikat SAKIP — dipakai untuk indikator bertipe_nilai 'predikat' (realisasi/target
// berupa huruf predikat, bukan angka bebas). Tingkatan dari terendah ke tertinggi.
// Angka "tier" ini yang disimpan di kolom numerik (realisasi/target) supaya semua
// rumus capaian (kumulatif, rata-rata, bermakna_negatif, dst) yang sudah ada tetap
// jalan tanpa perlu diubah — hanya LABEL tampilannya (realisasi_display/target_display)
// yang berupa huruf predikat.
const PREDIKAT_LEVELS = [
  { label: 'D',  tier: 1 },
  { label: 'C',  tier: 2 },
  { label: 'CC', tier: 3 },
  { label: 'B',  tier: 4 },
  { label: 'BB', tier: 5 },
  { label: 'A',  tier: 6 },
  { label: 'AA', tier: 7 },
];
const PREDIKAT_TIER_BY_LABEL = Object.fromEntries(PREDIKAT_LEVELS.map(p => [p.label, p.tier]));

// Fallback: kalau target_tahun (kolom numerik) kosong/NaN — biasanya karena data
// lama yang ke-input sebelum fitur predikat ada, atau target_display sempat
// disimpan manual sebagai teks tanpa tier-nya — coba rekonstruksi tier dari label
// huruf predikat (target_display). Dipakai di semua tempat yang butuh target
// numerik untuk hitung capaian (preview, validasi simpan, dsb) supaya indikator
// bertarget huruf (BB, CC, dst.) tidak macet nunjukkin "—" gara-gara data lama.
function _targetNumForRow(row) {
  let t = parseFloat(row?.target_tahun);
  if (isNaN(t) && row?.tipe_nilai === 'predikat' && row?.target_display) {
    const tier = PREDIKAT_TIER_BY_LABEL[String(row.target_display).trim().toUpperCase()];
    if (tier != null) t = tier;
  }
  return t;
}

function _predikatOptionsHtml(selectedTier) {
  const sel = (selectedTier != null && selectedTier !== '') ? Number(selectedTier) : null;
  return `<option value="">-</option>` + PREDIKAT_LEVELS.map(p =>
    `<option value="${p.tier}" ${sel === p.tier ? 'selected' : ''}>${p.label}</option>`
  ).join('');
}

// Render cell input realisasi: dropdown predikat kalau row.tipe_nilai === 'predikat',
// input number seperti biasa kalau tidak. onchangeFn = nama fungsi global (string),
// dipanggil dengan row.id sebagai argumen — sama seperti input number sebelumnya.
function _renderRealisasiInputCell(row, idPrefix, onchangeFn) {
  const id = `${idPrefix}_${row.id}`;
  const disabled = !!row.realisasi_id;
  if (row.tipe_nilai === 'predikat') {
    // Belum PERNAH diisi sama sekali (gak ada baris realisasi tersimpan sama sekali,
    // termasuk yang sengaja dikosongkan/"-") → trigger custom select tampilkan
    // placeholder netral ("Pilih Peringkat"), BUKAN "-", supaya user gak salah kira
    // "-" itu udah kepilih otomatis. Begitu user aktif milih apapun (termasuk "-"),
    // data-placeholder ini dihapus di sisi klik (lihat buildCustomSelect/app.html)
    // dan tampilannya balik jadi teks opsi asli ("-", "D", dst) — perilaku sama
    // persis kayak sebelumnya begitu user sudah menentukan pilihan.
    const belumPernahDiisi = row.realisasi == null && !row.realisasi_id;
    const selectEl = `<select id="${id}" ${disabled ? 'disabled readonly' : ''}
             ${belumPernahDiisi ? 'data-placeholder="Pilih Peringkat"' : ''}
             data-tip="${disabled ? 'Klik tombol Edit untuk mengisi realisasi' : ''}"
             style="${disabled ? 'cursor:not-allowed' : ''}"
             onchange="${onchangeFn}(${row.id})">${_predikatOptionsHtml(row.realisasi != null ? row.realisasi : null)}</select>`;
    // Selalu dibungkus .select-wrap (termasuk saat disabled/terkunci) supaya custom
    // select engine (initCustomSelects) langsung membangun trigger custom-nya sejak
    // render awal. Trigger sendiri sudah dibikin menghormati select.disabled (lihat
    // guard di buildCustomSelect/app.html) jadi tetap gak bisa diutak-atik selagi
    // terkunci — cuma sekarang tampilannya konsisten custom, bukan dropdown bawaan
    // browser begitu baris dibuka lewat tombol Edit.
    return `<div class="select-wrap" style="min-width:110px">${selectEl}</div>`;
  }
  return `<input type="number" id="${id}" value="${row.realisasi_display != null ? row.realisasi_display : (row.realisasi != null ? parseFloat(row.realisasi) : '')}"
             placeholder="0" step="0.01" ${disabled ? 'readonly' : ''}
             data-tip="${disabled ? 'Klik tombol Edit untuk mengisi realisasi' : ''}"
             style="${disabled ? 'cursor:not-allowed' : ''}"
             oninput="${onchangeFn}(${row.id})">`;
}

// Ambil label tampilan realisasi buat dikirim sebagai realisasi_display: kalau
// predikat, ambil teks label dari <option> yang lagi dipilih (bukan angka tier-nya);
// kalau angka biasa, pakai raw value dari input apa adanya (perilaku lama).
function _getRealisasiDisplayFromEl(realEl, row, rawVal) {
  if (row?.tipe_nilai === 'predikat' && realEl?.tagName === 'SELECT') {
    return realEl.selectedOptions?.[0]?.text || null;
  }
  return rawVal !== '' && rawVal != null ? rawVal : null;
}

// State target per tahun untuk modal indikator
let _targetRows = []; // [{id?, tahun, target, target_display}]
let _targetMap  = {}; // {indikator_id: [{tahun, target, target_display}]}

// ═══════════════════════════════════════════════════════════════════════════
// KINERJA — state
// ═══════════════════════════════════════════════════════════════════════════
let _kinerja_bulan  = new Date().getMonth() + 1;   // 1–12
let _kinerja_tahun  = new Date().getFullYear();
let _kinerjaData    = [];
let _kinerjaSearch  = '';   // teks pencarian indikator (tabel rekap IKU)
let _indikatorList  = [];
let _groupList      = [];
let _bidangListKinerja = [];   // cache bidang untuk dropdown PJ indikator
let _editingIndikatorId = null;
let _editingGroupId     = null;

// ── IKK state ────────────────────────────────────────────────────────────
let _ikk_bulan  = new Date().getMonth() + 1;   // 1–12
let _ikk_tahun = new Date().getFullYear();
let _ikkData   = [];
let _ikkSearch = '';   // teks pencarian indikator (tabel rekap IKK)

// ── SPM state ────────────────────────────────────────────────────────────
let _spm_bulan  = new Date().getMonth() + 1;   // 1–12
let _spm_tahun  = new Date().getFullYear();
let _spmData    = [];
let _spmSearch  = '';   // teks pencarian indikator (tabel rekap SPM)

// ── Pagination & search — Indikator Admin ────────────────────────────────
let _indikatorPage      = 1;
const _indikatorPageSize = 15;
let _indikatorSearch    = '';
let _indikatorFilterJenis = '';   // '', 'monev', 'ikk', 'none'
let _indikatorFilterMakna = '';   // '', 'positif', 'negatif'
let _indikatorFilterPJ    = '';   // '' atau nama PJ
let _indikatorFilterTahun = '';   // '' atau tahun (string)
let _indikatorSort        = 'urutan'; // 'urutan' | 'nama_asc' | 'nama_desc' | 'terbaru' | 'terlama' | 'target_desc' | 'target_asc' | 'jenis_kinerja'

// ── Pagination & search — Group Admin ───────────────────────────────────
let _groupPage      = 1;
const _groupPageSize = 15;
let _groupSearch    = '';

// ── Jenis label & style ──────────────────────────────────────────────────
const JENIS_META = {
  tujuan:   { label: 'Tujuan',            cls: 'group-tujuan'   },
  sasaran:  { label: 'Sasaran Strategis', cls: 'group-sasaran'  },
  program:  { label: 'Program',           cls: 'group-program'  },
  kegiatan: { label: 'Kegiatan',          cls: 'group-kegiatan' },
};

// ── Jenis Kinerja — state dinamis ────────────────────────────────────────
// Diisi dari API /api/kinerja/jenis-kinerja saat loadIndikatorAdmin
let _jenisList = [];  // [{id, kode, label, warna_bg, warna_teks, urutan, aktif, is_builtin}]
let _editingJenisId = null;

// Helper: render badge jenis untuk satu row indikator
function _renderJenisBadges(row) {
  const badges = [];
  for (const j of _jenisList) {
    if (!j.aktif) continue;
    let aktif = false;
    if (j.kode === 'iku') aktif = !!row.jenis_monev;
    else if (j.kode === 'ikk') aktif = !!row.jenis_ikk;
    else if (j.kode === 'spm') aktif = !!row.jenis_spm;
    else aktif = Array.isArray(row.jenis_custom) && row.jenis_custom.includes(j.kode);
    if (aktif) {
      badges.push(`<span style="display:inline-flex;align-items:center;font-size:.7rem;font-weight:700;color:${j.warna_teks};background:${j.warna_bg};padding:2px 7px;border-radius:5px;margin-right:3px">${escHtml(j.label)}</span>`);
    }
  }
  return badges.length ? badges.join('') : '<span style="color:var(--teks-muted);font-size:.75rem">—</span>';
}

// Helper: apakah row punya setidaknya satu jenis aktif
function _rowHasJenis(row, kode) {
  if (kode === 'iku') return !!row.jenis_monev;
  if (kode === 'ikk')   return !!row.jenis_ikk;
  if (kode === 'spm')   return !!row.jenis_spm;
  return Array.isArray(row.jenis_custom) && row.jenis_custom.includes(kode);
}

// ── Cek apakah window input untuk bulan tertentu sedang terbuka (non-admin) ──
// Jika bulan tidak diberikan, cek bulan yang sedang dipilih (_kinerja_bulan)
function _isKinerjaInputOpen(bulan, jenis) {
  // Admin selalu bisa input kapan saja
  if (_user?.is_admin) return true;
  const targetBulan = bulan != null ? bulan : jenis === 'spm' ? _spm_bulan : jenis === 'ikk' ? _ikk_bulan : _kinerja_bulan;
  // Cari periode yang cocok bulan DAN jenis-nya
  return _periodeListTerbuka.some(p =>
    p.bulan === targetBulan &&
    (jenis ? p.jenis === jenis : true) &&
    isPeriodeInputOpen(p)
  );
}
// Helper shorthand per jenis
function _isMonevInputOpen(bulan) { return _isKinerjaInputOpen(bulan, 'monev'); }
function _isIkkInputOpen(bulan)   { return _isKinerjaInputOpen(bulan, 'ikk');   }

// Cache daftar periode yang sedang terbuka (diisi oleh loadPeriodeAktif)
let _periodeListTerbuka = [];
let _allPeriodeList     = [];  // semua periode dari DB (untuk admin year selector)
let _userIndikatorIds   = null; // Set<number> assigned indikator untuk non-admin, null = belum load

// Load assigned indikator IDs untuk user non-admin (idempotent — skip jika sudah di-load)
async function _ensureUserIndikatorIds() {
  if (_user?.is_admin) return;                 // admin tidak perlu filter
  if (_userIndikatorIds !== null) return;      // sudah di-load sebelumnya
  if (!_user?.id) { _userIndikatorIds = new Set(); return; }
  try {
    const r = await fetch(`/api/users/${_user.id}/indikator`, { headers: authHeaders() });
    const d = await r.json();
    _userIndikatorIds = new Set((d.indikator_ids || []).map(Number));
  } catch { _userIndikatorIds = new Set(); }
}

function _renderKinerjaWindowBanner(containerId, jenis) {
  const wrap = document.getElementById(containerId);
  if (!wrap) return;

  // Admin → tidak tampilkan banner
  if (_user?.is_admin) { wrap.innerHTML = ''; return; }

  const fmtDT = iso => iso ? new Date(iso).toLocaleString('id-ID', { day:'2-digit', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit' }) : '—';

  // Cari periode untuk bulan yang sedang dipilih, filter by jenis
  const targetBulan = jenis === 'ikk' ? _ikk_bulan : jenis === 'spm' ? _spm_bulan : _kinerja_bulan;
  const pa = _periodeListTerbuka.find(p => p.bulan === targetBulan && (!jenis || p.jenis === jenis)) ?? null;
  // Apakah sama sekali tidak ada periode terbuka untuk jenis ini?
  const adaPeriodeJenis = _periodeListTerbuka.some(p => !jenis || p.jenis === jenis);

  if (!pa && !adaPeriodeJenis) {
    wrap.innerHTML = `
      <div style="display:flex;align-items:center;gap:8px;padding:10px 14px;border-radius:8px;background:#fff7ed;border:1px solid #fed7aa;color:#9a3412;font-size:.83rem;margin-bottom:10px">
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/></svg>
        <span>Tidak ada periode input yang sedang terbuka. Hubungi Admin untuk mengatur window periode.</span>
      </div>`;
    return;
  }

  if (!pa) {
    // Ada periode terbuka tapi bukan untuk bulan ini
    wrap.innerHTML = `
      <div style="display:flex;align-items:center;gap:8px;padding:10px 14px;border-radius:8px;background:#fffbeb;border:1px solid #fde68a;color:#92400e;font-size:.83rem;margin-bottom:10px">
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
        <span>Bulan ini belum ada window input yang terbuka. Pilih bulan lain yang tersedia.</span>
      </div>`;
    return;
  }

  wrap.innerHTML = `
    <div style="display:flex;align-items:center;gap:8px;padding:10px 14px;border-radius:8px;background:#f0fdf4;border:1px solid #bbf7d0;color:#166534;font-size:.83rem;margin-bottom:10px">
      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
      <span>Input <strong>terbuka</strong> — batas pengisian hingga <strong>${fmtDT(pa.close_at)}</strong></span>
    </div>`;
}

// ── Countdown timer sisa waktu periode input ─────────────────────────────
let _kinerjaCountdownTimer = null;
const _kinerjaCountdownTimers = {};

function _kperiodeJenisMeta(jenis) {
  const checklistIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M9 11l3 3L22 4"/><path stroke-linecap="round" stroke-linejoin="round" d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>`;
  if (jenis === 'monev') return { label: 'IKU', bg: '#dbeafe', fg: '#1d4ed8', icon: checklistIcon };
  if (jenis === 'ikk') return { label: 'IKK', bg: '#ede9fe', fg: '#7c3aed', icon: checklistIcon };
  if (jenis === 'spm') return { label: 'SPM', bg: '#fef3c7', fg: '#b45309', icon: checklistIcon };
  return { label: 'INPUT', bg: '#f1f5f9', fg: '#64748b', icon: checklistIcon };
}

function _renderKinerjaCountdown(containerId, jenis) {
  const wrap = document.getElementById(containerId);
  if (!wrap) return;

  // Admin → sembunyikan
  if (_user?.is_admin) { wrap.style.display = 'none'; wrap.innerHTML = ''; return; }

  // Cari periode aktif untuk bulan yg dipilih, filter by jenis
  const targetBulan = jenis === 'ikk' ? _ikk_bulan : jenis === 'spm' ? _spm_bulan : _kinerja_bulan;
  const pa = _periodeListTerbuka.find(p => p.bulan === targetBulan && (!jenis || p.jenis === jenis)) ?? null;

  // Jika tidak ada periode aktif untuk bulan ini, sembunyikan
  if (!pa || !pa.close_at) { wrap.style.display = 'none'; wrap.innerHTML = ''; return; }

  const closeMs = new Date(pa.close_at).getTime();
  const openMs  = pa.open_at ? new Date(pa.open_at).getTime() : null;
  const openLabel  = pa.open_at  ? new Date(pa.open_at).toLocaleString('id-ID', { day:'2-digit', month:'long', year:'numeric', hour:'2-digit', minute:'2-digit' }).replace(' pukul','') : '—';
  const closeLabel = new Date(pa.close_at).toLocaleString('id-ID', { day:'2-digit', month:'long', year:'numeric', hour:'2-digit', minute:'2-digit' }).replace(' pukul','');
  const bulanTahunLabel = `${BULAN_FULL[pa.bulan]} ${pa.tahun}`;
  const jm = _kperiodeJenisMeta(jenis);

  wrap.style.display = 'block';
  wrap.style.marginTop = '18px';
  wrap.innerHTML = `
    <div class="kperiode-card" id="${containerId}_card">
      <div class="kperiode-header">
        <span class="kperiode-header-title">
          <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M8 2v4"/><path d="M16 2v4"/><path d="M3 10h18"/></svg>
          ${bulanTahunLabel}
        </span>
        <span class="kperiode-header-timer" id="${containerId}_timer">…</span>
      </div>
      <div class="kperiode-body">
        <div class="kperiode-action-label">
          <span class="kperiode-jenis-pill" style="background:${jm.bg};color:${jm.fg}">${jm.icon}${jm.label}</span>
          PENGISIAN INDIKATOR
        </div>
        <div class="kperiode-progress-track">
          <div class="kperiode-progress-fill ok" id="${containerId}_fill" style="width:0%"></div>
        </div>
        <div class="kperiode-window-row">
          <span class="kperiode-window-open">
            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 9.9-1"/></svg>
            ${openLabel} WITA
          </span>
          <span class="kperiode-window-close">
            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
            ${closeLabel} WITA
          </span>
        </div>
        <div class="kperiode-expired-msg" id="${containerId}_expired" style="display:none">
          Waktu input telah <strong>ditutup</strong>. Periode ini tidak bisa diisi lagi.
        </div>
      </div>
    </div>`;

  function _tick() {
    const now  = Date.now();
    const diff = closeMs - now;
    const timerEl    = document.getElementById(`${containerId}_timer`);
    const fillEl     = document.getElementById(`${containerId}_fill`);
    const cardEl     = document.getElementById(`${containerId}_card`);
    const expiredEl  = document.getElementById(`${containerId}_expired`);
    if (!timerEl || !fillEl || !cardEl) { clearInterval(_kinerjaCountdownTimers[containerId]); return; }

    if (diff <= 0) {
      // Waktu habis
      timerEl.textContent = 'Ditutup';
      cardEl.className = 'kperiode-card expired';
      fillEl.style.width = '100%';
      if (expiredEl) expiredEl.style.display = 'block';
      clearInterval(_kinerjaCountdownTimers[containerId]);
      _kinerjaCountdownTimers[containerId] = null;
      // Hapus periode ini dari list terbuka → button bulan langsung disabled
      _periodeListTerbuka = _periodeListTerbuka.filter(p => p.bulan !== _kinerja_bulan);
      _syncBulanButtons();
      _renderPeriodeInfo();
      return;
    }

    const hari  = Math.floor(diff / 86400000);
    const jam   = Math.floor((diff % 86400000) / 3600000);
    const menit = Math.floor((diff % 3600000) / 60000);
    const detik = Math.floor((diff % 60000) / 1000);
    const pad = n => String(n).padStart(2, '0');

    // Urgency relatif terhadap panjang periode (bukan patokan jam absolut aja),
    // sinkron dgn perhitungan di halaman Kelola Periode (admin).
    const total   = openMs && closeMs > openMs ? (closeMs - openMs) : null;
    const sisaPct = total ? (diff / total) * 100 : 100;
    let urgency = 'ok';
    if (diff < 3600000 || sisaPct <= 10) urgency = 'urgent';       // sisa < 1 jam ATAU < 10% durasi
    else if (diff < 86400000 || sisaPct <= 25) urgency = 'warn';   // sisa < 1 hari ATAU < 25% durasi

    timerEl.textContent = hari > 0
      ? `${hari}h ${pad(jam)}:${pad(menit)}:${pad(detik)}`
      : `${pad(jam)}:${pad(menit)}:${pad(detik)}`;
    cardEl.className = `kperiode-card ${urgency}`;
    fillEl.className = `kperiode-progress-fill ${urgency}`;

    if (openMs && closeMs > openMs) {
      const pct = Math.min(100, Math.max(0, ((now - openMs) / (closeMs - openMs)) * 100));
      fillEl.style.width = pct + '%';
    } else {
      fillEl.style.width = '100%';
    }
  }

  // Clear timer sebelumnya jika ada (per container)
  if (_kinerjaCountdownTimers[containerId]) clearInterval(_kinerjaCountdownTimers[containerId]);
  _tick();
  _kinerjaCountdownTimers[containerId] = setInterval(_tick, 1000);
}

// ── Year selector — diisi dari daftar periode di DB ──────────────────────
async function initKinerjaControls() {
  // Ambil semua periode yang window-nya terbuka sekarang
  try {
    const r = await fetch('/api/periode/aktif');
    if (r.ok) {
      const d = await r.json();
      _periodeListTerbuka = d.periode || [];
    }
  } catch { _periodeListTerbuka = []; }

  // Non-admin: load assigned indikator IDs
  await _ensureUserIndikatorIds();

  // Admin: fetch semua periode untuk year selector
  if (_user?.is_admin) {
    try {
      const r = await fetch('/api/periode', { headers: authHeaders() });
      if (r.ok) {
        const d = await r.json();
        _allPeriodeList = d.periode || [];
      }
    } catch { _allPeriodeList = []; }
    _populateTahunSelector('kinerjaTahunSelect', _kinerja_tahun, setKinerjaTahun);
  }

  // Jika ada periode monev terbuka, set tahun & bulan dari periode monev (terlama dulu)
  const _monevTerbuka = _periodeListTerbuka.filter(p => p.jenis === 'monev')
    .sort((a, b) => a.tahun !== b.tahun ? a.tahun - b.tahun : a.bulan - b.bulan);
  if (_monevTerbuka.length) {
    _kinerja_tahun = _monevTerbuka[0].tahun;
    _kinerja_bulan = _monevTerbuka[0].bulan;
    _periodeAktif  = _monevTerbuka[0]; // kompatibilitas
  } else if (_user?.is_admin) {
    // Admin: pakai tahun & bulan sekarang sebagai default
    _kinerja_tahun = new Date().getFullYear();
    _kinerja_bulan = new Date().getMonth() + 1;
  }

  // Non-admin: populate dropdown tahun (hanya tahun-tahun yang punya periode monev terbuka)
  if (!_user?.is_admin && _monevTerbuka.length) {
    const _tahunNonAdmin = [...new Set(_monevTerbuka.map(p => p.tahun))].sort((a, b) => a - b);
    _populateTahunSelector('kinerjaTahunSelect', _kinerja_tahun, setKinerjaTahun, _tahunNonAdmin);
  }

  // Sync tahun selector ke nilai aktif
  const kSel = document.getElementById('kinerjaTahunSelect');
  if (kSel) kSel.value = _kinerja_tahun;

  _syncBulanButtons();
  _renderPeriodeInfo();
  _renderKinerjaCountdown('kinerjaCountdownBar', 'monev');
  _renderKinerjaCountdown('ikkCountdownBar', 'ikk');
  // Refresh timer di topbar dengan data terbaru
  if (typeof _startPeriodeTimer === 'function') _startPeriodeTimer();
}

// Populate tahun dropdown dari _allPeriodeList (admin) atau list eksplisit (non-admin, dari periode terbuka)
function _populateTahunSelector(elId, currentTahun, onChangeFn, tahunListOverride) {
  const sel = document.getElementById(elId);
  if (!sel) return;
  const tahunList = tahunListOverride || [...new Set(_allPeriodeList.map(p => p.tahun))].sort((a, b) => a - b);
  // Fallback: jika tidak ada periode di DB, pakai tahun sekarang
  const list = tahunList.length ? tahunList : [new Date().getFullYear()];
  sel.innerHTML = list.map(t =>
    `<option value="${t}" ${t === currentTahun ? 'selected' : ''}>${t}</option>`
  ).join('');
  // Tampilkan wrapper container (div#kinerjaTahunWrap / div#ikkTahunWrap)
  const wrap = sel.closest('.select-wrap');
  const outerWrap = wrap ? wrap.parentElement : null;
  if (outerWrap && (outerWrap.id === 'kinerjaTahunWrap' || outerWrap.id === 'ikkTahunWrap')) {
    outerWrap.style.display = 'flex';
  } else if (wrap) {
    wrap.style.display = '';
  }
  sel.onchange = () => onChangeFn(parseInt(sel.value));
  // Sync custom select jika sudah diinit
  if (typeof syncCustomSelect === 'function') syncCustomSelect(elId);
}

function setKinerjaTahun(tahun) {
  _kinerja_tahun = tahun;
  if (!_user?.is_admin) {
    // Non-admin: pilih bulan pertama yang periodenya terbuka untuk tahun ini
    const periodeThnIni = _periodeListTerbuka.filter(p => p.jenis === 'monev' && p.tahun === tahun)
      .sort((a, b) => a.bulan - b.bulan);
    if (periodeThnIni.length) _kinerja_bulan = periodeThnIni[0].bulan;
  } else {
    _kinerja_bulan = 1;
  }
  _syncBulanButtons();
  _renderPeriodeInfo();
  loadKinerjaRekap();
}

function setIkkTahun(tahun) {
  _ikk_tahun = tahun;
  if (!_user?.is_admin) {
    const periodeThnIni = _periodeListTerbuka.filter(p => p.jenis === 'ikk' && p.tahun === tahun)
      .sort((a, b) => a.bulan - b.bulan);
    if (periodeThnIni.length) _ikk_bulan = periodeThnIni[0].bulan;
  } else {
    _ikk_bulan = 1;
  }
  _syncIkkBulanButtons();
  _renderIkkPeriodeInfo();
  loadIkkRekap();
}

// Label bulan Indonesia
const BULAN_LABEL = ['','Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agu','Sep','Okt','Nov','Des'];
const BULAN_FULL  = ['','Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];

function _syncBulanButtons() {
  const sel = document.getElementById('bulanSelector');
  if (!sel) return;
  // Kumpulkan semua bulan yang periodenya sedang terbuka (bisa lebih dari 1)
  const bulanTerbuka = new Set(_periodeListTerbuka.filter(p => p.jenis === 'monev').map(p => p.bulan));
  const items = [];
  for (let bulan = 1; bulan <= 12; bulan++) {
    // Admin: tampilkan semua 12 bulan tanpa pembatasan. Non-admin: hanya bulan yang periodenya terbuka.
    const isTampil = _user?.is_admin ? true : bulanTerbuka.has(bulan);
    if (!isTampil) continue;
    // Tampilkan label "NamaBulan Tahun" sesuai periode yang cocok
    const periodeMatch = _user?.is_admin
      ? _allPeriodeList.find(p => p.jenis === 'monev' && p.bulan === bulan && p.tahun === _kinerja_tahun)
      : _periodeListTerbuka.find(p => p.jenis === 'monev' && p.bulan === bulan);
    const tahunLabel = periodeMatch ? periodeMatch.tahun : _kinerja_tahun;
    items.push({ bulan, tahun: tahunLabel });
  }
  // Urutkan: tahun ASC, bulan ASC (admin cukup urut nomor bulan)
  items.sort((a, b) => _user?.is_admin ? (a.bulan - b.bulan) : ((a.tahun * 100 + a.bulan) - (b.tahun * 100 + b.bulan)));
  sel.innerHTML = items.map(it =>
    `<option value="${it.bulan}"${it.bulan === _kinerja_bulan ? ' selected' : ''}>${BULAN_FULL[it.bulan]}</option>`
  ).join('');
  sel.onchange = () => setKinerjaBulan(parseInt(sel.value));
  if (typeof syncCustomSelect === 'function') syncCustomSelect('bulanSelector');
}

function _renderPeriodeInfo() {
  const el = document.getElementById('kinerjaActivePeriodeInfo');
  const kWrapper = document.getElementById('kinerjaBulanWrapper');
  const tahunWrap = document.getElementById('kinerjaTahunWrap');

  // Badge teks "Periode input: ..." sudah tidak dipakai — selalu pakai dropdown tahun & bulan
  if (el) el.style.display = 'none';

  if (_user?.is_admin) {
    if (kWrapper) kWrapper.style.display = '';
    if (tahunWrap) tahunWrap.style.display = 'flex';
    return;
  }

  // Non-admin: sembunyikan wrapper kalau tidak ada periode monev aktif
  const _monevAktif = _periodeListTerbuka.filter(p => p.jenis === 'monev');
  if (_monevAktif.length === 0) {
    if (kWrapper) kWrapper.style.display = 'none';
    return;
  }
  if (kWrapper) kWrapper.style.display = '';
  if (tahunWrap) tahunWrap.style.display = 'flex';
}

function setKinerjaBulan(bulan) {
  // Guard: bulan tidak boleh dipilih jika bukan admin dan bukan bulan terbuka
  if (!_user?.is_admin) {
    const bulanTerbuka = new Set(_periodeListTerbuka.filter(p => p.jenis === 'monev').map(p => p.bulan));
    if (!bulanTerbuka.has(bulan)) return;
    // Sync tahun ke periode Monev yang sesuai bulan yang dipilih
    const periodeMatch = _periodeListTerbuka.find(p => p.jenis === 'monev' && p.bulan === bulan);
    if (periodeMatch) _kinerja_tahun = periodeMatch.tahun;
  }
  _kinerja_bulan = bulan;
  _syncBulanButtons();
  _renderPeriodeInfo();   
  _renderKinerjaCountdown('kinerjaCountdownBar', 'monev');
  _renderKinerjaCountdown('ikkCountdownBar', 'ikk');
  loadKinerjaRekap();
}

// ═══════════════════════════════════════════════════════════════════════════
// REKAP (halaman utama kinerja)
// ═══════════════════════════════════════════════════════════════════════════
async function loadKinerjaRekap() {
  const tbody = document.getElementById('kinerjaTableBody');
  if (!tbody) return;

  // Guard: non-admin tidak perlu lihat tabel kalau tidak ada periode aktif sama sekali
  if (!_user?.is_admin && !_periodeListTerbuka.some(p => p.jenis === 'monev')) {
    // Sembunyikan card tabel (termasuk thead), tampilkan pesan di luarnya
    const tableCard = tbody.closest('.card');
    if (tableCard) tableCard.style.display = 'none';
    let msgEl = document.getElementById('kinerjaNoperiodeMsg');
    if (!msgEl) {
      msgEl = document.createElement('div');
      msgEl.id = 'kinerjaNoperiodeMsg';
      tableCard ? tableCard.parentNode.insertBefore(msgEl, tableCard) : tbody.parentNode.insertBefore(msgEl, tbody.parentNode.firstChild);
    }
    msgEl.innerHTML = `
      <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;gap:10px;padding:48px 20px;color:#94a3b8;background:#fff;border-radius:12px;border:1.5px solid #f1f5f9">
        <svg xmlns="http://www.w3.org/2000/svg" width="44" height="44" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.2" opacity=".35">
          <path stroke-linecap="round" stroke-linejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/>
        </svg>
        <div style="font-size:.95rem;font-weight:600;color:#64748b">Belum ada periode input yang aktif</div>
        <div style="font-size:.82rem;color:#94a3b8;text-align:center">Input data kinerja belum dapat dilakukan.<br>Hubungi Admin untuk membuka periode pengisian.</div>
      </div>`;
    msgEl.style.display = '';
    return;
  }
  // Kalau ada periode aktif, pastikan card & pesan kembali normal
  const _tableCard = tbody.closest('.card');
  if (_tableCard) _tableCard.style.display = '';
  const _msgEl = document.getElementById('kinerjaNoperiodeMsg');
  if (_msgEl) _msgEl.style.display = 'none';

  tbody.innerHTML = `<tr class="empty-row"><td colspan="11"><span class="btn-spin" style="width:11px;height:11px;vertical-align:-1px;margin-right:6px"></span>Memuat data...</td></tr>`;
  try {
    const r = await fetch(`/api/kinerja/rekap?bulan=${_kinerja_bulan}&tahun=${_kinerja_tahun}`, { headers: authHeaders() });
    const d = await r.json();
    if (!r.ok) { tbody.innerHTML = `<tr class="empty-row"><td colspan="11">${d.error || 'Gagal memuat'}</td></tr>`; return; }
    let rekap = d.rekap || [];

    // Filter per assigned indikator user (non-admin hanya lihat indikator yg di-assign)
    if (!_user?.is_admin) {
      if (_userIndikatorIds && _userIndikatorIds.size > 0) {
        rekap = rekap.filter(row => _userIndikatorIds.has(Number(row.id)));
      } else {
        rekap = [];
      }
    }

    _kinerjaData = rekap;
    _ikuPage = 1;
    renderKinerjaTable(tbody);
  } catch (err) {
    tbody.innerHTML = `<tr class="empty-row"><td colspan="11">Error: ${err.message}</td></tr>`;
  }
}

// Helper: trigger file picker langsung dari tombol Upload row-baru (baca tw/tahun/source dari data-attr)
function _openDukungFromBtn(btn) {
  const id     = parseInt(btn.dataset.indikatorId);
  const tw     = parseInt(btn.dataset.tw);
  const tahun  = parseInt(btn.dataset.tahun);
  const source = btn.dataset.source;
  triggerDukungUpload(id, tw, tahun, source);
}

// Kunci kembali tombol "Uploaded" / "Upload" data dukung untuk satu baris
// (dipanggil setelah Simpan, supaya kembali ke tampilan default/disabled
// persis seperti saat toggleEditRow keluar dari mode edit)
function _lockDukungButtons(indikatorId) {
  const dukungBtn     = document.querySelector(`[data-dukung-id="${indikatorId}"] .dukung-uploaded-btn`);
  const uploadOnlyBtn = document.querySelector(`tr[data-id="${indikatorId}"] .dukung-upload-btn`);
  const deleteBtn     = document.querySelector(`tr[data-id="${indikatorId}"] .dukung-delete-btn`);

  if (dukungBtn) {
    dukungBtn.disabled = true;
    dukungBtn.style.cursor = 'not-allowed';
    dukungBtn.style.opacity = '.85';
    dukungBtn.dataset.tip = 'Klik Edit terlebih dahulu untuk mengganti file';
    dukungBtn.onclick = null;
  }
  if (deleteBtn) {
    deleteBtn.disabled = true;
    deleteBtn.style.cursor = 'not-allowed';
    deleteBtn.style.opacity = '.5';
    deleteBtn.dataset.tip = 'Klik Edit terlebih dahulu untuk menghapus file';
    deleteBtn.onclick = null;
  }
  if (uploadOnlyBtn) {
    uploadOnlyBtn.disabled = true;
    uploadOnlyBtn.style.cursor = 'not-allowed';
    uploadOnlyBtn.style.opacity = '.65';
    uploadOnlyBtn.style.borderStyle = 'dashed';
    uploadOnlyBtn.style.borderColor = '#fca5a5';
    uploadOnlyBtn.style.background = '#fee2e2';
    uploadOnlyBtn.style.color = '#991b1b';
    uploadOnlyBtn.dataset.tip = 'Klik Edit terlebih dahulu untuk mengupload file';
    uploadOnlyBtn.onclick = null;
  }
}

// Suntik tombol Reset (admin) ke baris setelah Simpan sukses, tanpa perlu reload
function _ensureResetBtn(indikatorId, prefix, jenis) {
  if (!_user?.is_admin) return;
  if (document.getElementById(`${prefix}resetbtn_${indikatorId}`)) return;
  const saveBtn = document.getElementById(`${prefix}savebtn_${indikatorId}`);
  if (!saveBtn) return;
  saveBtn.insertAdjacentHTML('afterend', `
    <button class="btn-reset-row" id="${prefix}resetbtn_${indikatorId}" data-tip="Reset data realisasi baris ini (admin)"
      onclick="resetRealisasiRow(${indikatorId}, '${jenis}')">
      <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg>
      Reset
    </button>`);
}

function _renderDukungBtn(row, tw, tahun, source, initialEditable = false) {
  let files = [];
  if (row.data_dukung_url) {
    try {
      const p = JSON.parse(row.data_dukung_url);
      files = Array.isArray(p) ? p.filter(f => f && f.url) : [{ url: row.data_dukung_url, name: row.data_dukung_nama || 'Dokumen' }];
    } catch { files = [{ url: row.data_dukung_url, name: row.data_dukung_nama || 'Dokumen' }]; }
  }
  const fileCount = files.length;
  const twVal    = tw    ?? _kinerja_bulan;
  const tahunVal = tahun ?? _kinerja_tahun;
  const fn       = source === 'ikk' ? 'openIkkDukungModal' : 'openDukungModal';

  if (fileCount > 0) {
    const previewFn  = `openDukungPreview(${row.id}, ${twVal}, ${tahunVal}, '${source}')`;
    const uploadFnAlt = source === 'ikk' ? `openIkkDukungModal(${row.id}, ${twVal}, ${tahunVal})` : `openDukungModal(${row.id}, ${twVal}, ${tahunVal}, '${source}')`;
    const label = 'Uploaded';
    // Baris yang belum disimpan (belum punya realisasi_id) tetap dalam mode edit aktif,
    // jadi tombol ganti/hapus file harus tetap terbuka tanpa perlu klik Edit dulu.
    const isEditable = initialEditable;

    // Tombol Uploaded: locked by default — hanya bisa diklik jika row dalam mode edit atau initialEditable
    return `<span style="display:inline-flex;align-items:center;gap:3px" data-dukung-id="${row.id}">
      <button
        class="dukung-uploaded-btn"
        data-indikator-id="${row.id}" data-tw="${twVal}" data-tahun="${tahunVal}" data-source="${source}"
        data-tip="${isEditable ? 'Kelola / ganti file' : 'Klik Edit terlebih dahulu untuk mengganti file'}"
        ${isEditable ? `onclick="${uploadFnAlt}"` : 'disabled'}
        style="display:inline-flex;align-items:center;gap:5px;padding:4px 10px;border-radius:6px;border:none;${isEditable ? 'cursor:pointer' : 'cursor:not-allowed'};font-size:.75rem;font-weight:600;font-family:inherit;background:#d1fae5;color:#065f46;opacity:.85">
        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"/></svg>
        ${label}
      </button>
      <button onclick="${previewFn}" data-tip="Preview data dukung"
        style="display:inline-flex;align-items:center;justify-content:center;width:26px;height:26px;border-radius:6px;border:none;cursor:pointer;background:#dbeafe;color:#1d4ed8">
        <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path stroke-linecap="round" stroke-linejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg>
      </button>
      <button class="dukung-delete-btn" ${isEditable ? '' : 'disabled'}
        data-indikator-id="${row.id}" data-tw="${twVal}" data-tahun="${tahunVal}" data-source="${source}"
        data-tip="${isEditable ? 'Hapus file' : 'Klik Edit terlebih dahulu untuk menghapus file'}"
        ${isEditable ? `onclick="deleteDukungAll(${row.id}, ${twVal}, ${tahunVal}, '${source}')"` : ''}
        style="display:inline-flex;align-items:center;justify-content:center;width:26px;height:26px;border-radius:6px;border:none;${isEditable ? 'cursor:pointer' : 'cursor:not-allowed'};background:#fee2e2;color:#991b1b;${isEditable ? '' : 'opacity:.5'}">
        <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path stroke-linecap="round" stroke-linejoin="round" d="M19 6l-1 14H6L5 6"/><path stroke-linecap="round" stroke-linejoin="round" d="M10 11v6m4-6v6"/><path stroke-linecap="round" stroke-linejoin="round" d="M9 6V4h6v2"/></svg>
      </button>
    </span>`;
  }

  if (initialEditable) {
    return `<button class="dukung-upload-btn" disabled
      data-indikator-id="${row.id}" data-tw="${twVal}" data-tahun="${tahunVal}" data-source="${source}"
      data-tip="Isi realisasi dan field wajib terlebih dahulu"
      style="display:inline-flex;align-items:center;gap:5px;padding:4px 10px;border-radius:6px;border:1.5px dashed #fca5a5;cursor:not-allowed;font-size:.75rem;font-weight:600;font-family:inherit;background:#fee2e2;color:#991b1b;opacity:.65">
      <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"/></svg>
      Upload
    </button>`;
  }
  return `<button class="dukung-upload-btn" disabled
    data-indikator-id="${row.id}" data-tw="${twVal}" data-tahun="${tahunVal}" data-source="${source}"
    data-tip="Klik Edit terlebih dahulu untuk mengupload file"
    style="display:inline-flex;align-items:center;gap:5px;padding:4px 10px;border-radius:6px;border:1.5px dashed #fca5a5;cursor:not-allowed;font-size:.75rem;font-weight:600;font-family:inherit;background:#fee2e2;color:#991b1b;opacity:.65">
    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"/></svg>
    Upload
  </button>`;
}


// ── Pagination — IKU / IKK / IKK ─────────────────────────────────────────
let _ikuPage = 1; const _ikuPageSize = 10;
let _ikkPage = 1; const _ikkPageSize = 10;
let _spmPage = 1; const _spmPageSize = 10;
function _goIkuPage(p) { _ikuPage = p; renderKinerjaTable(document.getElementById('kinerjaTableBody')); }
function _goIkkPage(p) { _ikkPage = p; _renderIkkTable(document.getElementById('ikkTableBody')); }
function _goSpmPage(p) { _spmPage = p; _renderSpmTable(document.getElementById('spmTableBody')); }


// Dipanggil dari input #kinerjaSearch (sejajar Tahun/Bulan) — filter tabel rekap IKU
function filterKinerjaTable() {
  _kinerjaSearch = (document.getElementById('kinerjaSearch')?.value || '').trim().toLowerCase();
  _ikuPage = 1;
  renderKinerjaTable(document.getElementById('kinerjaTableBody'));
}

function renderKinerjaTable(tbody) {
  if (!_kinerjaData.length) {
    let emptyMsg = 'Belum ada indikator aktif. Admin perlu menambahkan indikator terlebih dahulu.';
    if (!_user?.is_admin) {
      if (!_userIndikatorIds || _userIndikatorIds.size === 0) {
        emptyMsg = 'Belum ada indikator yang di-assign ke akun Anda. Hubungi Admin untuk mengatur assignment indikator.';
      } else {
        emptyMsg = 'Tidak ada indikator yang di-assign ke akun Anda pada periode ini.';
      }
    }
    tbody.innerHTML = `<tr class="empty-row"><td colspan="11">${emptyMsg}</td></tr>`;
    return;
  }

  // Filter berdasarkan kata kunci pencarian (nama indikator, satuan, bidang/PJ)
  const _filtered = _kinerjaSearch
    ? _kinerjaData.filter(row =>
        (row.indikator_kinerja || '').toLowerCase().includes(_kinerjaSearch) ||
        (row.satuan || '').toLowerCase().includes(_kinerjaSearch) ||
        (row.penanggung_jawab || '').toLowerCase().includes(_kinerjaSearch)
      )
    : _kinerjaData;

  if (!_filtered.length) {
    tbody.innerHTML = `<tr class="empty-row"><td colspan="11">Tidak ada indikator yang cocok dengan pencarian "${escHtml(_kinerjaSearch)}".</td></tr>`;
    renderPagination('ikuPagination', 0, 1, _ikuPageSize, '_goIkuPage');
    return;
  }

  const canEdit = _isMonevInputOpen();
  let html = '';
  let lastGroupId = null;
  let no = 0;

  const _ikuStart = (_ikuPage - 1) * _ikuPageSize;
  const _ikuRows  = _filtered.slice(_ikuStart, _ikuStart + _ikuPageSize);

  _ikuRows.forEach(row => {
    // Baris group header jika group berubah
    if (row.group_id !== lastGroupId) {
      lastGroupId = row.group_id;
      if (row.group_nama) {
        const meta  = JENIS_META[row.group_jenis] || { label: row.group_jenis, cls: 'group-sasaran' };
        html += `
          <tr class="group-header-row ${meta.cls}">
            <td colspan="11">
              <span class="group-jenis-badge">${escHtml(meta.label)}</span>
              ${escHtml(row.group_nama)}
            </td>
          </tr>`;
      }
    }

    no++;
    const capaian = (row.realisasi_id && row.capaian_persen != null) ? Number(row.capaian_persen) : null;
    let badgeClass = 'na', badgeText = '—';
    if (capaian !== null && !isNaN(capaian)) {
      badgeText = capaian.toFixed(1) + '%';
      badgeClass = capaian >= 91 ? 'st' : capaian >= 76 ? 'ti' : capaian >= 66 ? 'sd' : capaian >= 51 ? 'rd' : 'sr';
    }
    const negBadge = row.bermakna_negatif ? `<span data-tip="Bermakna Negatif" data-tip-variant="danger" style="display:inline-flex;align-items:center;justify-content:center;width:16px;height:16px;background:#fee2e2;border-radius:50%;margin-left:5px;vertical-align:middle;flex-shrink:0"><svg xmlns=\"http://www.w3.org/2000/svg\" width=\"9\" height=\"9\" fill=\"none\" viewBox=\"0 0 24 24\" stroke=\"#991b1b\" stroke-width=\"2.8\"><path stroke-linecap=\"round\" stroke-linejoin=\"round\" d=\"M19 14l-7 7m0 0l-7-7m7 7V3\"/></svg></span>` : `<span data-tip="Bermakna Positif" data-tip-variant="success" style="display:inline-flex;align-items:center;justify-content:center;width:16px;height:16px;background:#d1fae5;border-radius:50%;margin-left:5px;vertical-align:middle;flex-shrink:0"><svg xmlns=\"http://www.w3.org/2000/svg\" width=\"9\" height=\"9\" fill=\"none\" viewBox=\"0 0 24 24\" stroke=\"#065f46\" stroke-width=\"2.8\"><path stroke-linecap=\"round\" stroke-linejoin=\"round\" d=\"M5 10l7-7m0 0l7 7m-7-7v18\"/></svg></span>`;

    // Format target: dari JOIN kinerja_target (tahun aktif)
    const _targetNum = row.target_tahun != null ? Number(row.target_tahun) : null;
    const targetFmt = row.target_display != null
      ? String(row.target_display)
      : (_targetNum != null && !isNaN(_targetNum)
          ? (Number.isInteger(_targetNum) ? String(_targetNum) : _targetNum.toFixed(2))
          : '—');

    // Tentukan row state class berdasarkan status data
    const rowStateClass = row.realisasi_id ? 'row-state-saved' : 'row-state-default';

    html += `<tr data-id="${row.id}" class="${rowStateClass}">
      <td class="td-sticky-no" style="text-align:center;color:var(--teks-muted);position:sticky;left:0;z-index:3">${no}</td>
      <td class="td-sticky-name" style="position:sticky;left:34px;z-index:3"><div style="font-weight:600;line-height:1.6"><span>${escHtml(row.indikator_kinerja)}</span>${negBadge}</div><div style="display:flex;align-items:center;gap:6px;margin-top:5px">${row.formula ? `<div class="fx-wrap"><button style="display:inline-flex;align-items:center;justify-content:center;gap:4px;box-sizing:border-box;height:24px;font-size:0.62rem;font-weight:700;line-height:1;color:#0f766e;background:#f0fdfa;border:1px solid #99f6e4;border-radius:4px;padding:0 8px;cursor:pointer;font-family:inherit;appearance:none;-webkit-appearance:none;margin:0" data-tip="Lihat formula perhitungan" data-formula="${escHtml(row.formula)}" onclick="toggleFormulaPanel(this)"><span>Σ</span><span class=\"fx-arrow\" style=\"display:inline-block;transition:transform .2s;font-style:normal\">▾</span></button></div>` : ''}${_tipeBadge(row.tipe_perhitungan)}</div></td>
      <td class="td-satuan">${escHtml(row.satuan || '')}</td>
      <td class="td-target" style="font-weight:700">${targetFmt}</td>
      ${_user?.is_admin ? `<td class="td-bidang" style="color:var(--teks-mid)">${escHtml(row.penanggung_jawab || '—')}</td>` : ''}
      <td class="realisasi-input-cell">
        ${_renderRealisasiInputCell(row, 'real', 'markDirty')}
      </td>
      <td style="text-align:center">
        <span class="capaian-badge ${badgeClass}" id="badge_${row.id}">${badgeText}</span>
      </td>
      <td class="textarea-cell" style="text-align:left;vertical-align:top">
        ${_renderPSCell('fpenghambat', row.id, row.f_penghambat, capaian, canEdit, 'faktor penghambat', 'markDirty', !!row.realisasi_id, false, row.tipe_nilai === 'predikat', row.realisasi == null && !row.realisasi_id)}
      </td>
      <td class="textarea-cell" style="text-align:left;vertical-align:top">
        ${_renderPSCell('solusi', row.id, row.solusi, capaian, canEdit, 'solusi', 'markDirty', !!row.realisasi_id, false, row.tipe_nilai === 'predikat', row.realisasi == null && !row.realisasi_id)}
      </td>
      <td class="textarea-cell" style="text-align:left;vertical-align:top">
        ${_renderPSCell('fpendukung', row.id, row.f_pendukung, capaian, canEdit, 'faktor pendukung', 'markDirty', !!row.realisasi_id, true, row.tipe_nilai === 'predikat', row.realisasi == null && !row.realisasi_id)}
      </td>
      <td class="textarea-cell" style="text-align:left;vertical-align:top">
        ${_renderPSCell('rencana', row.id, row.rencana_tl, capaian, canEdit, 'rencana tindak lanjut', 'markDirty', !!row.realisasi_id, true, row.tipe_nilai === 'predikat', row.realisasi == null && !row.realisasi_id)}
      </td>
      <td style="text-align:center" data-col="dukung">
        ${_renderDukungBtn(row, _kinerja_bulan, _kinerja_tahun, 'monev', !row.realisasi_id)}
      </td>
      <td style="text-align:center;white-space:nowrap">
        ${canEdit ? `
          <button class="btn-edit-row" id="editbtn_${row.id}" data-tip="Edit baris ini"
            onclick="toggleEditRow(${row.id})"
            style="${row.realisasi_id ? '' : 'display:none'}">
            <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>
            Edit
          </button>
          <button class="save-row-btn" id="savebtn_${row.id}" disabled
            onclick="saveRealisasiRow(${row.id})" data-tip="Simpan"
            style="font-family:'Plus Jakarta Sans',sans-serif!important;${row.realisasi_id ? 'background:var(--sukses);color:#fff' : ''}">
            ${row.realisasi_id
  ? '<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M15.2 3a2 2 0 0 1 1.4.6l3.8 3.8a2 2 0 0 1 .6 1.4V19a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z"/><path d="M17 21v-7a1 1 0 0 0-1-1H8a1 1 0 0 0-1 1v7"/><path d="M7 3v4a1 1 0 0 0 1 1h7"/></svg> Tersimpan'
  : '<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M15.2 3a2 2 0 0 1 1.4.6l3.8 3.8a2 2 0 0 1 .6 1.4V19a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z"/><path d="M17 21v-7a1 1 0 0 0-1-1H8a1 1 0 0 0-1 1v7"/><path d="M7 3v4a1 1 0 0 0 1 1h7"/></svg> Simpan'}
          </button>
        ` : ''}
        ${_user?.is_admin && row.realisasi_id ? `
          <button class="btn-reset-row" id="resetbtn_${row.id}" data-tip="Reset data realisasi baris ini (admin)"
            onclick="resetRealisasiRow(${row.id}, 'monev')">
            <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg>
            Reset
          </button>
        ` : ''}
      </td>
    </tr>`;
  });
  tbody.innerHTML = html;
  if (typeof window.initCustomSelects === 'function') window.initCustomSelects();
  // Toggle header kolom Bidang / Sub Bagian (hanya tampil untuk admin)
  document.querySelectorAll('.col-bidang-iku').forEach(el => { el.style.display = _user?.is_admin ? '' : 'none'; });
  renderPagination('ikuPagination', _filtered.length, _ikuPage, _ikuPageSize, '_goIkuPage');
  // Tampilkan warning di kolom Data Dukung untuk baris yang sudah tersimpan
  // tapi belum punya file dukung
  if (canEdit) {
    _kinerjaData.forEach(row => {
      if (row.realisasi_id && !row.data_dukung_url) {
        const dukungCell = document.querySelector(`tr[data-id="${row.id}"] td[data-col="dukung"]`);
        if (dukungCell && !dukungCell.querySelector('.dukung-warning')) {
          dukungCell.insertAdjacentHTML('beforeend', `
            <div class="dukung-warning" data-tip="Data dukung belum diupload untuk indikator ini">
              <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/></svg>
              Belum diupload
            </div>`);
        }
      }
    });
  }
}

function toggleEditRow(indikatorId) {
  // Guard: non-admin tidak bisa edit di luar window monev
  if (!_user?.is_admin && !_isMonevInputOpen()) {
    const pa = _periodeListTerbuka.find(p => p.jenis === 'monev' && p.bulan === _kinerja_bulan) ?? null;
    const close = pa?.close_at ? new Date(pa.close_at) : null;
    const now   = new Date();
    if (close && now > close) {
      toast('Periode input sudah ditutup. Data tidak dapat diubah.', 'error');
    } else {
      toast('Periode input belum dibuka.', 'info');
    }
    return;
  }

  const realEl  = document.getElementById(`real_${indikatorId}`);
  const probEl  = document.getElementById(`fpenghambat_${indikatorId}`);
  const solEl   = document.getElementById(`solusi_${indikatorId}`);
  const pendEl  = document.getElementById(`fpendukung_${indikatorId}`);
  const rtlEl   = document.getElementById(`rencana_${indikatorId}`);
  const editBtn = document.getElementById(`editbtn_${indikatorId}`);
  const saveBtn = document.getElementById(`savebtn_${indikatorId}`);
  const tr      = document.querySelector(`tr[data-id="${indikatorId}"]`);
  const isReadonly = realEl?.hasAttribute('readonly');

  [realEl, probEl, solEl, pendEl, rtlEl].forEach(el => {
    if (!el) return;
    if (isReadonly) {
      el.removeAttribute('readonly');
      if (el.tagName === 'SELECT') el.disabled = false; // predikat: <select> pakai disabled, bukan readonly
      if (el.classList.contains('ps-rte')) el.contentEditable = 'true';
      el.style.background = 'var(--putih)';
      el.style.cursor = '';
      el.style.resize = '';
      el.dataset.tip = '';
    } else {
      el.setAttribute('readonly', '');
      if (el.tagName === 'SELECT') el.disabled = true; // predikat: kunci balik pakai disabled
      if (el.classList.contains('ps-rte')) el.contentEditable = 'false';
      el.style.background = '';
      el.style.cursor = 'not-allowed';
      if (el.tagName === 'TEXTAREA') el.style.resize = 'none';
      el.dataset.tip = 'Klik tombol Edit untuk mengisi';
    }
  });


  // Switch ps-cell-wrap antara view mode (ps-read) dan edit mode (textarea)
  const psCells = document.querySelectorAll(`tr[data-id="${indikatorId}"] .ps-cell-wrap`);
  psCells.forEach(wrap => {
    const readEl = wrap.querySelector('.ps-read');
    const taEl   = wrap.querySelector('.ps-rte');
    if (!taEl) return;
    if (isReadonly) {
      // Masuk edit mode: sembunyikan view, tampilkan editor — skip wrap yg hidden
      if (wrap.style.display === 'none') return;
      if (readEl) readEl.style.display = 'none';
      taEl.style.display = '';
      taEl.contentEditable = 'true';
    } else {
      // Keluar edit mode: update view text lalu tampilkan kembali
      const val = taEl.value || '';
      const LIMIT = 80;
      const shortEl = wrap.querySelector('[id$="short_' + indikatorId + '"]');
      const fullEl  = wrap.querySelector('[id$="full_' + indikatorId + '"]');
      const moreBtn = wrap.querySelector('.ps-more-btn');
      if (shortEl) { shortEl.innerHTML = _mdToHtmlDisplay(val.slice(0, LIMIT)); shortEl.style.display = ''; }
      if (fullEl)  { fullEl.innerHTML = _mdToHtmlDisplay(val); fullEl.style.display = 'none'; }
      if (moreBtn) { moreBtn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9l6 6 6-6"/></svg>'; moreBtn.setAttribute('data-tip','Selengkapnya'); moreBtn.style.display = val.length > LIMIT ? '' : 'none'; }
      if (readEl)  { readEl.style.display = val.trim() ? '' : 'none'; }
      taEl.style.display = 'none';
      taEl.setAttribute('readonly', '');
      taEl.contentEditable = 'false';
      taEl.style.cursor = 'not-allowed';
    }
  });
  // Unlock / lock tombol data dukung (Uploaded & Upload)
  const dukungBtn     = document.querySelector(`[data-dukung-id="${indikatorId}"] .dukung-uploaded-btn`);
  const uploadOnlyBtn = document.querySelector(`tr[data-id="${indikatorId}"] .dukung-upload-btn`);

  if (dukungBtn) {
    if (isReadonly) {
      dukungBtn.disabled = false;
      dukungBtn.style.cursor = 'pointer';
      dukungBtn.style.opacity = '1';
      dukungBtn.dataset.tip = 'Kelola / ganti file data dukung';
      const twV = dukungBtn.dataset.tw;
      const tahunV = dukungBtn.dataset.tahun;
      dukungBtn.onclick = () => openDukungModal(indikatorId, parseInt(twV), parseInt(tahunV));
    } else {
      dukungBtn.disabled = true;
      dukungBtn.style.cursor = 'not-allowed';
      dukungBtn.style.opacity = '.85';
      dukungBtn.dataset.tip = 'Klik Edit terlebih dahulu untuk mengganti file';
      dukungBtn.onclick = null;
    }
  }

  const deleteBtn = document.querySelector(`tr[data-id="${indikatorId}"] .dukung-delete-btn`);
  if (deleteBtn) {
    if (isReadonly) {
      deleteBtn.disabled = false;
      deleteBtn.style.cursor = 'pointer';
      deleteBtn.style.opacity = '1';
      deleteBtn.dataset.tip = 'Hapus semua file data dukung';
      const twV    = deleteBtn.dataset.tw;
      const tahunV = deleteBtn.dataset.tahun;
      const srcV   = deleteBtn.dataset.source;
      deleteBtn.onclick = () => deleteDukungAll(indikatorId, parseInt(twV), parseInt(tahunV), srcV);
    } else {
      deleteBtn.disabled = true;
      deleteBtn.style.cursor = 'not-allowed';
      deleteBtn.style.opacity = '.5';
      deleteBtn.dataset.tip = 'Klik Edit terlebih dahulu untuk menghapus file';
      deleteBtn.onclick = null;
    }
  }

  if (uploadOnlyBtn) {
    if (isReadonly) {
      // Masuk mode edit → aktifkan tombol Upload
      uploadOnlyBtn.disabled = false;
      uploadOnlyBtn.style.cursor = 'pointer';
      uploadOnlyBtn.style.opacity = '1';
      uploadOnlyBtn.style.borderStyle = 'solid';
      uploadOnlyBtn.dataset.tip = 'Upload file data dukung';
      const twV    = uploadOnlyBtn.dataset.tw;
      const tahunV = uploadOnlyBtn.dataset.tahun;
      const src    = uploadOnlyBtn.dataset.source;
      uploadOnlyBtn.onclick = () => triggerDukungUpload(indikatorId, parseInt(twV), parseInt(tahunV), src);
    } else {
      // Keluar mode edit → kunci kembali
      uploadOnlyBtn.disabled = true;
      uploadOnlyBtn.style.cursor = 'not-allowed';
      uploadOnlyBtn.style.opacity = '.65';
      uploadOnlyBtn.style.borderStyle = 'dashed';
      uploadOnlyBtn.dataset.tip = 'Klik Edit terlebih dahulu untuk mengupload file';
      uploadOnlyBtn.onclick = null;
    }
  }

  if (isReadonly) {
    // ── Masuk mode edit ──────────────────────────────────────────────────────
    // Warna baris → orange (editing)
    if (tr) {
      tr.classList.remove('row-state-default', 'row-state-saved');
      tr.classList.add('row-state-editing');
    }
    // Tombol Edit → badge "Sedang Diedit"
    if (editBtn) {
      editBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg> Sedang Diedit`;
      editBtn.classList.add('btn-edit-row--active');
      editBtn.dataset.tip = 'Klik untuk batalkan edit';
    }
    if (saveBtn) {
      saveBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M15.2 3a2 2 0 0 1 1.4.6l3.8 3.8a2 2 0 0 1 .6 1.4V19a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z"/><path d="M17 21v-7a1 1 0 0 0-1-1H8a1 1 0 0 0-1 1v7"/><path d="M7 3v4a1 1 0 0 0 1 1h7"/></svg> Simpan`;
      saveBtn.style.background = '';
      saveBtn.style.color = '';
    }
    if (realEl) realEl.focus();
    _updateSaveBtnState(indikatorId);
  } else {
    // ── Keluar mode edit (batal) ─────────────────────────────────────────────
    // Kembalikan warna ke default (bukan saved karena user batal)
    const row = _kinerjaData.find(r => r.id === indikatorId);
    if (tr) {
      tr.classList.remove('row-state-editing');
      tr.classList.add(row?.realisasi_id ? 'row-state-saved' : 'row-state-default');
    }
    // Tombol Edit → kembali normal dengan SVG + teks "Edit"
    if (editBtn) {
      editBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg> Edit`;
      editBtn.classList.remove('btn-edit-row--active');
      editBtn.dataset.tip = 'Edit baris ini';
    }
    if (saveBtn) {
      saveBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M15.2 3a2 2 0 0 1 1.4.6l3.8 3.8a2 2 0 0 1 .6 1.4V19a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z"/><path d="M17 21v-7a1 1 0 0 0-1-1H8a1 1 0 0 0-1 1v7"/><path d="M7 3v4a1 1 0 0 0 1 1h7"/></svg> Simpan`;
      saveBtn.style.background = '';
      saveBtn.style.color = '';
      saveBtn.disabled = true;
    }
  }
}

function toggleIkkEditRow(indikatorId) {
  // Guard: non-admin tidak bisa edit di luar window ikk
  if (!_user?.is_admin && !_isIkkInputOpen()) {
    const pa = _periodeListTerbuka.find(p => p.jenis === 'ikk' && p.bulan === _ikk_bulan) ?? null;
    const close = pa?.close_at ? new Date(pa.close_at) : null;
    const now   = new Date();
    if (close && now > close) {
      toast('Periode input sudah ditutup. Data tidak dapat diubah.', 'error');
    } else {
      toast('Periode input belum dibuka.', 'info');
    }
    return;
  }

  const realEl  = document.getElementById(`ikk_real_${indikatorId}`);
  const probEl  = document.getElementById(`ikk_fpenghambat_${indikatorId}`);
  const solEl   = document.getElementById(`ikk_solusi_${indikatorId}`);
  const pendEl  = document.getElementById(`ikk_fpendukung_${indikatorId}`);
  const rtlEl   = document.getElementById(`ikk_rencana_${indikatorId}`);
  const editBtn = document.getElementById(`ikk_editbtn_${indikatorId}`);
  const saveBtn = document.getElementById(`ikk_savebtn_${indikatorId}`);
  const tr      = document.querySelector(`tr[data-id="${indikatorId}"]`);
  const isReadonly = realEl?.hasAttribute('readonly');

  [realEl, probEl, solEl, pendEl, rtlEl].forEach(el => {
    if (!el) return;
    if (isReadonly) {
      el.removeAttribute('readonly');
      if (el.tagName === 'SELECT') el.disabled = false; // predikat: <select> pakai disabled, bukan readonly
      if (el.classList.contains('ps-rte')) el.contentEditable = 'true';
      el.style.background = 'var(--putih)';
      el.style.cursor = '';
      el.style.resize = '';
      el.dataset.tip = '';
    } else {
      el.setAttribute('readonly', '');
      if (el.tagName === 'SELECT') el.disabled = true; // predikat: kunci balik pakai disabled
      if (el.classList.contains('ps-rte')) el.contentEditable = 'false';
      el.style.background = '';
      el.style.cursor = 'not-allowed';
      if (el.tagName === 'TEXTAREA') el.style.resize = 'none';
      el.dataset.tip = 'Klik tombol Edit untuk mengisi';
    }
  });


  // Switch ps-cell-wrap antara view mode (ps-read) dan edit mode (textarea)
  const psCells = document.querySelectorAll(`tr[data-id="${indikatorId}"] .ps-cell-wrap`);
  psCells.forEach(wrap => {
    const readEl = wrap.querySelector('.ps-read');
    const taEl   = wrap.querySelector('.ps-rte');
    if (!taEl) return;
    if (isReadonly) {
      // Masuk edit mode: sembunyikan view, tampilkan editor — skip wrap yg hidden
      if (wrap.style.display === 'none') return;
      if (readEl) readEl.style.display = 'none';
      taEl.style.display = '';
      taEl.contentEditable = 'true';
    } else {
      // Keluar edit mode: update view text lalu tampilkan kembali
      const val = taEl.value || '';
      const LIMIT = 80;
      const shortEl = wrap.querySelector('[id$="short_' + indikatorId + '"]');
      const fullEl  = wrap.querySelector('[id$="full_' + indikatorId + '"]');
      const moreBtn = wrap.querySelector('.ps-more-btn');
      if (shortEl) { shortEl.innerHTML = _mdToHtmlDisplay(val.slice(0, LIMIT)); shortEl.style.display = ''; }
      if (fullEl)  { fullEl.innerHTML = _mdToHtmlDisplay(val); fullEl.style.display = 'none'; }
      if (moreBtn) { moreBtn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9l6 6 6-6"/></svg>'; moreBtn.setAttribute('data-tip','Selengkapnya'); moreBtn.style.display = val.length > LIMIT ? '' : 'none'; }
      if (readEl)  { readEl.style.display = val.trim() ? '' : 'none'; }
      taEl.style.display = 'none';
      taEl.setAttribute('readonly', '');
      taEl.contentEditable = 'false';
      taEl.style.cursor = 'not-allowed';
    }
  });
  // Unlock / lock tombol data dukung IKK (Uploaded & Upload)
  const ikkDukungBtn     = document.querySelector(`[data-dukung-id="${indikatorId}"] .dukung-uploaded-btn`);
  const ikkUploadOnlyBtn = document.querySelector(`tr[data-id="${indikatorId}"] .dukung-upload-btn`);

  if (ikkDukungBtn) {
    if (isReadonly) {
      ikkDukungBtn.disabled = false;
      ikkDukungBtn.style.cursor = 'pointer';
      ikkDukungBtn.style.opacity = '1';
      ikkDukungBtn.dataset.tip = 'Kelola / ganti file data dukung';
      const twV = ikkDukungBtn.dataset.tw;
      const tahunV = ikkDukungBtn.dataset.tahun;
      ikkDukungBtn.onclick = () => openIkkDukungModal(indikatorId, parseInt(twV), parseInt(tahunV));
    } else {
      ikkDukungBtn.disabled = true;
      ikkDukungBtn.style.cursor = 'not-allowed';
      ikkDukungBtn.style.opacity = '.85';
      ikkDukungBtn.dataset.tip = 'Klik Edit terlebih dahulu untuk mengganti file';
      ikkDukungBtn.onclick = null;
    }
  }

  const ikkDeleteBtn = document.querySelector(`tr[data-id="${indikatorId}"] .dukung-delete-btn`);
  if (ikkDeleteBtn) {
    if (isReadonly) {
      ikkDeleteBtn.disabled = false;
      ikkDeleteBtn.style.cursor = 'pointer';
      ikkDeleteBtn.style.opacity = '1';
      ikkDeleteBtn.dataset.tip = 'Hapus semua file data dukung';
      const twV    = ikkDeleteBtn.dataset.tw;
      const tahunV = ikkDeleteBtn.dataset.tahun;
      const srcV   = ikkDeleteBtn.dataset.source;
      ikkDeleteBtn.onclick = () => deleteDukungAll(indikatorId, parseInt(twV), parseInt(tahunV), srcV);
    } else {
      ikkDeleteBtn.disabled = true;
      ikkDeleteBtn.style.cursor = 'not-allowed';
      ikkDeleteBtn.style.opacity = '.5';
      ikkDeleteBtn.dataset.tip = 'Klik Edit terlebih dahulu untuk menghapus file';
      ikkDeleteBtn.onclick = null;
    }
  }

  if (ikkUploadOnlyBtn) {
    if (isReadonly) {
      ikkUploadOnlyBtn.disabled = false;
      ikkUploadOnlyBtn.style.cursor = 'pointer';
      ikkUploadOnlyBtn.style.opacity = '1';
      ikkUploadOnlyBtn.style.borderStyle = 'solid';
      ikkUploadOnlyBtn.dataset.tip = 'Upload file data dukung';
      const twV    = ikkUploadOnlyBtn.dataset.tw;
      const tahunV = ikkUploadOnlyBtn.dataset.tahun;
      const src    = ikkUploadOnlyBtn.dataset.source;
      ikkUploadOnlyBtn.onclick = () => triggerDukungUpload(indikatorId, parseInt(twV), parseInt(tahunV), src);
    } else {
      ikkUploadOnlyBtn.disabled = true;
      ikkUploadOnlyBtn.style.cursor = 'not-allowed';
      ikkUploadOnlyBtn.style.opacity = '.65';
      ikkUploadOnlyBtn.style.borderStyle = 'dashed';
      ikkUploadOnlyBtn.dataset.tip = 'Klik Edit terlebih dahulu untuk mengupload file';
      ikkUploadOnlyBtn.onclick = null;
    }
  }

  if (isReadonly) {
    // ── Masuk mode edit ──────────────────────────────────────────────────────
    if (tr) {
      tr.classList.remove('row-state-default', 'row-state-saved');
      tr.classList.add('row-state-editing');
    }
    if (editBtn) {
      editBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg> Sedang Diedit`;
      editBtn.classList.add('btn-edit-row--active');
      editBtn.dataset.tip = 'Klik untuk batalkan edit';
    }
    if (saveBtn) {
      saveBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M15.2 3a2 2 0 0 1 1.4.6l3.8 3.8a2 2 0 0 1 .6 1.4V19a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z"/><path d="M17 21v-7a1 1 0 0 0-1-1H8a1 1 0 0 0-1 1v7"/><path d="M7 3v4a1 1 0 0 0 1 1h7"/></svg> Simpan`;
      saveBtn.disabled = true;
      saveBtn.style.background = '';
      saveBtn.style.color = '';
    }
    if (realEl) realEl.focus();
    _updateIkkSaveBtnState(indikatorId);
  } else {
    // ── Keluar mode edit (batal) ─────────────────────────────────────────────
    const row = _ikkData.find(r => r.id === indikatorId);
    if (tr) {
      tr.classList.remove('row-state-editing');
      tr.classList.add(row?.realisasi_id ? 'row-state-saved' : 'row-state-default');
    }
    if (editBtn) {
      editBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg> Edit`;
      editBtn.classList.remove('btn-edit-row--active');
      editBtn.dataset.tip = 'Edit baris ini';
    }
    if (saveBtn) {
      saveBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M15.2 3a2 2 0 0 1 1.4.6l3.8 3.8a2 2 0 0 1 .6 1.4V19a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z"/><path d="M17 21v-7a1 1 0 0 0-1-1H8a1 1 0 0 0-1 1v7"/><path d="M7 3v4a1 1 0 0 0 1 1h7"/></svg> Simpan`;
      saveBtn.style.background = '';
      saveBtn.style.color = '';
      saveBtn.disabled = true;
    }
  }
}

function markDirty(indikatorId) {
  previewCapaian(indikatorId);
  _updateSaveBtnState(indikatorId);
}

// Cek apakah teks cuma berisi simbol/tanda baca (-, :, ., dst.) tanpa
// huruf/angka asli — dianggap tidak bermakna sebagai keterangan.
function _isSymbolOnly(val) {
  const v = (val || '').trim();
  if (!v) return true;
  return !/[a-zA-Z0-9]/.test(v);
}

// Warning real-time saat user mengetik di Faktor Penghambat/Solusi/dst:
// kalau isiannya cuma simbol (mis. "-", ";", "?") tanpa disambung teks,
// kasih toast supaya user langsung sadar — bukan nunggu sampai klik Simpan.
// Map menyimpan NILAI terakhir yang sudah di-warn (bukan cuma flag boolean),
// supaya ganti ke simbol lain (mis. "-" -> "?") tetap memicu toast baru,
// tapi mengetik ulang nilai yang sama persis tidak nge-spam toast.
const _symbolWarnTimers = {};
const _symbolWarnedVal  = new Map();
function _checkSymbolOnlyInput(el, label) {
  if (!el) return;
  const key = el.id;
  clearTimeout(_symbolWarnTimers[key]);
  _symbolWarnTimers[key] = setTimeout(() => {
    const val = (el.value || '').trim();
    if (!val) { _symbolWarnedVal.delete(key); return; }
    if (_isSymbolOnly(val)) {
      if (_symbolWarnedVal.get(key) !== val) {
        toast(`${label.charAt(0).toUpperCase() + label.slice(1)} tidak boleh hanya berisi simbol atau tanda baca.`, 'error');
        _symbolWarnedVal.set(key, val);
      }
    } else {
      _symbolWarnedVal.delete(key);
    }
  }, 600);
}

// Cek apakah baris boleh disimpan: realisasi harus diisi,
// serta field wajib sesuai kondisi capaian.
function _canSaveRow({ row, realVal, targetVal, bermakna_negatif, fpenghambatVal, solusiVal, fpendukungVal, rencanaVal, hasDukung }, requireDukung = true) {
  const realEmpty = realVal === '' || realVal === null || realVal === undefined;
  if (realEmpty) {
    // Indikator bertipe predikat (mis. Peringkat SAKIP) sering baru dinilai di
    // akhir tahun — untuk bulan-bulan menunggu penilaian, realisasi boleh
    // dikosongkan ("-") asal Faktor Penghambat & Solusi tetap dijelaskan
    // (mis. "menunggu hasil penilaian"), supaya baris tetap bisa disimpan.
    if (row?.tipe_nilai !== 'predikat') return false;
    if (_isSymbolOnly(fpenghambatVal) || _isSymbolOnly(solusiVal)) return false;
    if (requireDukung && !hasDukung) return false;
    return true;
  }
  const r = parseFloat(realVal);
  const t = parseFloat(targetVal);
  if (isNaN(r) || isNaN(t)) return false;
  // target=0 berarti "belum ada sasaran tahun ini" (bukan data invalid) — capaian
  // memang tidak bisa dihitung (lihat guard `t = 0` di query capaian_persen backend),
  // jadi lewati pengecekan bucket capaian (<100 vs >=100) di bawah ini. Tanpa guard
  // ini, tombol Simpan macet permanen untuk indikator bertarget 0 walau realisasi &
  // data dukung sudah lengkap.
  if (t !== 0) {
    // Pakai realisasi EFEKTIF (basis kumulatif/rata-rata lintas bulan), sama seperti
    // yang dipakai previewCapaian/saveRealisasiRow — supaya kondisi field wajib
    // (capaian < 100 vs >= 100) konsisten dengan capaian yang ditampilkan ke user.
    // Tanpa ini, tombol Simpan bisa nge-cek bucket capaian yang salah begitu masuk
    // bulan ke-2 dst pada indikator Kumulatif/Rata-rata, dan macet permanen.
    const rEfektif = row ? _hitungRealisasiEfektifPreview(row, r) : r;
    const capaian = bermakna_negatif ? ((t - (rEfektif - t)) / t) * 100 : (rEfektif / t) * 100;
    if (capaian < 100) {
      // Wajib: f_penghambat + solusi, dan tidak boleh cuma simbol
      if (_isSymbolOnly(fpenghambatVal) || _isSymbolOnly(solusiVal)) return false;
    } else {
      // Wajib: f_pendukung + rencana_tl, dan tidak boleh cuma simbol
      if (_isSymbolOnly(fpendukungVal) || _isSymbolOnly(rencanaVal)) return false;
    }
  }
  // Wajib: data dukung harus sudah diupload (hanya untuk tombol Simpan,
  // bukan untuk tombol Upload itu sendiri — kalau tidak, jadi lingkaran:
  // upload baru aktif kalau sudah upload)
  if (requireDukung && !hasDukung) return false;
  return true;
}

function _updateSaveBtnState(indikatorId) {
  const btn = document.getElementById(`savebtn_${indikatorId}`);
  if (!btn) return;
  const row    = _kinerjaData.find(r => r.id === indikatorId);
  const realEl = document.getElementById(`real_${indikatorId}`);
  const fieldArgs = {
    row,
    realVal: realEl?.value,
    targetVal: _targetNumForRow(row),
    bermakna_negatif: row?.bermakna_negatif,
    fpenghambatVal: document.getElementById(`fpenghambat_${indikatorId}`)?.value ?? '',
    solusiVal:      document.getElementById(`solusi_${indikatorId}`)?.value ?? '',
    fpendukungVal:  document.getElementById(`fpendukung_${indikatorId}`)?.value ?? '',
    rencanaVal:     document.getElementById(`rencana_${indikatorId}`)?.value ?? '',
    hasDukung:      !!row?.data_dukung_url,
  };
  const ok = _canSaveRow(fieldArgs);
  const okUpload = _canSaveRow(fieldArgs, false);
  btn.disabled         = !ok;
  btn.style.background = ok ? '#0d9488' : '';
  btn.style.color      = ok ? '#fff'    : '';
  btn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M15.2 3a2 2 0 0 1 1.4.6l3.8 3.8a2 2 0 0 1 .6 1.4V19a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z"/><path d="M17 21v-7a1 1 0 0 0-1-1H8a1 1 0 0 0-1 1v7"/><path d="M7 3v4a1 1 0 0 0 1 1h7"/></svg> Simpan`;

  // Enable/disable tombol Upload berdasarkan kondisi field wajib
  const _uploadBtn_iku = document.querySelector(`tr[data-id="${indikatorId}"] .dukung-upload-btn`);
  if (_uploadBtn_iku && !_uploadBtn_iku.classList.contains('dukung-uploaded-btn')) {
    if (okUpload) {
      _uploadBtn_iku.disabled = false;
      _uploadBtn_iku.style.cursor = 'pointer';
      _uploadBtn_iku.style.opacity = '1';
      _uploadBtn_iku.style.borderStyle = 'dashed';
      _uploadBtn_iku.style.borderColor = '#6ee7b7';
      _uploadBtn_iku.style.background = '#ecfdf5';
      _uploadBtn_iku.style.color = '#065f46';
      _uploadBtn_iku.dataset.tip = 'Upload data dukung';
      _uploadBtn_iku.onclick = () => _openDukungFromBtn(_uploadBtn_iku);
    } else {
      _uploadBtn_iku.disabled = true;
      _uploadBtn_iku.style.cursor = 'not-allowed';
      _uploadBtn_iku.style.opacity = '.65';
      _uploadBtn_iku.style.borderStyle = 'dashed';
      _uploadBtn_iku.style.borderColor = '#fca5a5';
      _uploadBtn_iku.style.background = '#fee2e2';
      _uploadBtn_iku.style.color = '#991b1b';
      _uploadBtn_iku.dataset.tip = 'Isi realisasi dan field wajib terlebih dahulu';
      _uploadBtn_iku.onclick = null;
    }
  }
}

// Untuk indikator bertipe "Jumlah..." (akumulasi kumulatif lintas bulan) ATAU
// bertipe "Rata-rata" (rata-rata lintas bulan): hitung nilai realisasi "efektif"
// untuk preview live capaian, yaitu basis bulan-bulan lain (selain bulan yang
// sedang diketik) dikombinasikan dengan nilai yang sedang diketik.
// row.capaian_persen (raw dari server) merepresentasikan kumulatif/rata-rata s.d. bulan ini
// SEBELUM nilai baru yang sedang diketik disimpan — jadi basis bulan lain bisa diturunkan dari situ.
function _hitungRealisasiEfektifPreview(row, realisasiInput) {
  const tipe = row.tipe_perhitungan;
  if (tipe !== 'kumulatif' && tipe !== 'rata_rata') return realisasiInput;

  const target = _targetNumForRow(row);
  const capPersenRaw = row.capaian_persen != null ? Number(row.capaian_persen) : null;
  const savedThisMonth = row.realisasi_id ? (parseFloat(row.realisasi) || 0) : 0;
  const sudahTerisiBulanIni = !!row.realisasi_id;

  // Balikkan capaian_persen (dari server) jadi angka realisasi kumulatif/rata-rata
  // aktual. Untuk indikator bermakna_negatif, rumus capaian di server dibalik
  // (capaian = (2*target - realisasi) / target * 100), jadi rekonstruksinya juga
  // harus dibalik — kalau tetap pakai rumus positif, basis bulan lain jadi salah
  // dan preview capaian bakal beda dengan hasil hitung ulang server setelah Simpan.
  const _reconstructActual = (capPersen) => row.bermakna_negatif
    ? target * (2 - capPersen / 100)
    : (capPersen / 100) * target;

  if (tipe === 'kumulatif') {
    let basisBulanLain = 0;
    if (capPersenRaw != null && !isNaN(capPersenRaw) && !isNaN(target) && target !== 0) {
      basisBulanLain = _reconstructActual(capPersenRaw) - savedThisMonth;
      if (isNaN(basisBulanLain) || basisBulanLain < 0) basisBulanLain = 0;
    }
    return basisBulanLain + realisasiInput;
  }

  // rata_rata: rekonstruksi jumlah (sum) dari rata-rata lama, lalu hitung rata-rata baru
  // setelah nilai bulan ini diganti/ditambahkan dengan realisasiInput.
  const oldCount = Number(row.bulan_terisi_count) || 0;
  if (capPersenRaw == null || isNaN(capPersenRaw) || isNaN(target) || target === 0 || oldCount === 0) {
    return realisasiInput;
  }
  const avgOld = _reconstructActual(capPersenRaw);
  const sumOld = avgOld * oldCount;
  const sumBulanLain = Math.max(0, sumOld - savedThisMonth);
  const newCount = sudahTerisiBulanIni ? oldCount : oldCount + 1;
  return (sumBulanLain + realisasiInput) / newCount;
}

function previewCapaian(indikatorId) {
  const row = _kinerjaData.find(r => r.id === indikatorId);
  if (!row) return;
  const realEl = document.getElementById(`real_${indikatorId}`);
  if (!realEl) return;
  const realisasi = parseFloat(realEl.value);
  const target    = _targetNumForRow(row);
  const badge     = document.getElementById(`badge_${indikatorId}`);
  if (!badge) return;
  if (isNaN(realisasi) || isNaN(target) || target === 0) {
    badge.textContent = '—'; badge.className = 'capaian-badge na';
    _togglePermasalahanSolusi('', indikatorId, null);
    return;
  }
  let capaian = row.bermakna_negatif
    ? ((target - (_hitungRealisasiEfektifPreview(row, realisasi) - target)) / target) * 100
    : (_hitungRealisasiEfektifPreview(row, realisasi) / target) * 100;
  badge.textContent = capaian.toFixed(1) + '%';
  badge.className = 'capaian-badge ' + (capaian >= 91 ? 'st' : capaian >= 76 ? 'ti' : capaian >= 66 ? 'sd' : capaian >= 51 ? 'rd' : 'sr');
  _togglePermasalahanSolusi('', indikatorId, capaian);
}

async function saveRealisasiRow(indikatorId) {
  const btn  = document.getElementById(`savebtn_${indikatorId}`);
  const realEl = document.getElementById(`real_${indikatorId}`);
  const real = realEl?.value;
  let fpenghambat = document.getElementById(`fpenghambat_${indikatorId}`)?.value?.trim();
  let solusi      = document.getElementById(`solusi_${indikatorId}`)?.value?.trim();
  let fpendukung  = document.getElementById(`fpendukung_${indikatorId}`)?.value?.trim();
  let rencana     = document.getElementById(`rencana_${indikatorId}`)?.value?.trim();

  const row = _kinerjaData.find(r => r.id === indikatorId);

  // Validasi field wajib — hitung capaian dari nilai input vs target
  // (untuk kumulatif/rata_rata, pakai basis efektif lintas bulan, bukan angka bulan ini saja)
  const _realVal  = parseFloat(real);
  const _targetVal = _targetNumForRow(row);
  if (!isNaN(_realVal) && !isNaN(_targetVal) && _targetVal !== 0) {
    const _realEfektif = _hitungRealisasiEfektifPreview(row, _realVal);
    const _capaian = row?.bermakna_negatif
      ? ((_targetVal - (_realEfektif - _targetVal)) / _targetVal) * 100
      : (_realEfektif / _targetVal) * 100;
    if (_capaian < 100) {
      if (!fpenghambat || _isSymbolOnly(fpenghambat)) { toast('Faktor Penghambat wajib diisi, tidak boleh hanya simbol/tanda baca.', 'error'); return; }
      if (!solusi || _isSymbolOnly(solusi))           { toast('Solusi wajib diisi, tidak boleh hanya simbol/tanda baca.', 'error'); return; }
      fpendukung = ''; rencana = '';
    } else {
      if (!fpendukung || _isSymbolOnly(fpendukung)) { toast('Faktor Pendukung wajib diisi, tidak boleh hanya simbol/tanda baca.', 'error'); return; }
      if (!rencana || _isSymbolOnly(rencana))       { toast('Rencana Tindak Lanjut wajib diisi, tidak boleh hanya simbol/tanda baca.', 'error'); return; }
      fpenghambat = ''; solusi = '';
    }
  }

  if (btn) {
    btn.disabled = true;
    btn.innerHTML = `<span class="btn-spin" style="width:11px;height:11px"></span> Menyimpan...`;
  }
  try {
    const r = await fetch('/api/kinerja/realisasi', {
      method: 'POST', headers: authHeaders(),
      body: JSON.stringify({
        indikator_id: indikatorId, bulan: _kinerja_bulan, tahun: _kinerja_tahun,
        realisasi: real !== '' ? parseFloat(real) : null,
        realisasi_display: _getRealisasiDisplayFromEl(realEl, row, real),
        f_penghambat: fpenghambat || null, solusi: solusi || null, f_pendukung: fpendukung || null, rencana_tl: rencana || null,
      }),
    });
    const d = await r.json();
    if (!r.ok) { toast(d.error || 'Gagal menyimpan', 'error'); if (btn) { btn.disabled = false; btn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M15.2 3a2 2 0 0 1 1.4.6l3.8 3.8a2 2 0 0 1 .6 1.4V19a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z"/><path d="M17 21v-7a1 1 0 0 0-1-1H8a1 1 0 0 0-1 1v7"/><path d="M7 3v4a1 1 0 0 0 1 1h7"/></svg> Simpan`; } }
    else {
      toast('Tersimpan');
      // Invalidate cache chart dashboard supaya Pantau Indikator fetch data fresh
      if (typeof _invalidateKinerjaDashboardCache === 'function') _invalidateKinerjaDashboardCache(_kinerja_tahun);
      // Kunci kembali input setelah simpan
      ['real_', 'fpenghambat_', 'solusi_', 'fpendukung_', 'rencana_'].forEach(prefix => {
        const el = document.getElementById(`${prefix}${indikatorId}`);
        if (el) {
          el.setAttribute('readonly', '');
          if (el.tagName === 'SELECT') el.disabled = true; // predikat: <select> pakai disabled, bukan readonly
          el.style.background = '';
          el.style.cursor = 'not-allowed';
          if (el.classList.contains('ps-rte')) { el.style.resize = 'none'; el.style.display = 'none'; el.contentEditable = 'false'; }
          el.dataset.tip = 'Klik tombol Edit untuk mengisi';
        }
      });
      // Kunci kembali tombol data dukung (Upload kembali ke warna default)
      _lockDukungButtons(indikatorId);
      // Tampilkan tombol Reset (admin) tanpa perlu reload
      _ensureResetBtn(indikatorId, '', 'monev');
      // Update warna baris → hijau (tersimpan)
      const tr = document.querySelector(`tr[data-id="${indikatorId}"]`);
      if (tr) {
        tr.classList.remove('row-state-default', 'row-state-editing');
        tr.classList.add('row-state-saved');
      }
      const editBtn = document.getElementById(`editbtn_${indikatorId}`);
      if (editBtn) {
        editBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg> Edit`;
        editBtn.classList.remove('btn-edit-row--active');
        editBtn.dataset.tip = 'Edit baris ini';
        editBtn.style.display = ''; // tampilkan tombol Edit setelah data tersimpan
      }
      if (btn) {
        btn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M15.2 3a2 2 0 0 1 1.4.6l3.8 3.8a2 2 0 0 1 .6 1.4V19a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z"/><path d="M17 21v-7a1 1 0 0 0-1-1H8a1 1 0 0 0-1 1v7"/><path d="M7 3v4a1 1 0 0 0 1 1h7"/></svg> Tersimpan`;
        btn.style.background = 'var(--sukses)';
        btn.style.color = '#fff';
        btn.disabled = true;
      }
      const idx = _kinerjaData.findIndex(x => x.id === indikatorId);
      if (idx >= 0) {
        _kinerjaData[idx].realisasi         = d.realisasi?.realisasi ?? null;
        _kinerjaData[idx].realisasi_display = d.realisasi?.realisasi_display ?? null;
        _kinerjaData[idx].f_penghambat      = d.realisasi?.f_penghambat ?? null;
        _kinerjaData[idx].solusi            = d.realisasi?.solusi ?? null;
        _kinerjaData[idx].f_pendukung       = d.realisasi?.f_pendukung ?? null;
        _kinerjaData[idx].rencana_tl        = d.realisasi?.rencana_tl ?? null;
        _kinerjaData[idx].realisasi_id      = d.realisasi?.id ?? _kinerjaData[idx].realisasi_id;
      }
      // Refresh capaian_persen dari server (hitung ulang kumulatif lintas bulan)
      // lakukan background — tidak mengubah UI state yang sudah dikunci
      fetch(`/api/kinerja/rekap?bulan=${_kinerja_bulan}&tahun=${_kinerja_tahun}`, { headers: authHeaders() })
        .then(res => res.ok ? res.json() : null)
        .then(fresh => {
          if (!fresh?.rekap) return;
          for (const freshRow of fresh.rekap) {
            const i = _kinerjaData.findIndex(x => x.id === freshRow.id);
            if (i >= 0) _kinerjaData[i].capaian_persen = freshRow.capaian_persen;
            // Update badge capaian di DOM untuk semua row (termasuk indikator kumulatif)
            // — hanya jika baris tersebut sudah punya realisasi tersimpan untuk bulan ini
            const badge = document.getElementById(`badge_${freshRow.id}`);
            if (badge) {
              const cap = (freshRow.realisasi_id && freshRow.capaian_persen != null) ? Number(freshRow.capaian_persen) : null;
              if (cap === null || isNaN(cap)) {
                badge.textContent = '—'; badge.className = 'capaian-badge na';
              } else {
                badge.textContent = cap.toFixed(1) + '%';
                badge.className = 'capaian-badge ' + (cap >= 91 ? 'st' : cap >= 76 ? 'ti' : cap >= 66 ? 'sd' : cap >= 51 ? 'rd' : 'sr');
              }
            }
          }
        }).catch(() => {}); // silent fail — badge tetap dari previewCapaian
      // Update visibility ps-read dan wrap setelah save
      const _savedRow = _kinerjaData[idx >= 0 ? idx : -1];
      const _realVal2  = parseFloat(_savedRow?.realisasi ?? '');
      const _targetVal2 = _targetNumForRow(_savedRow);
      if (!isNaN(_realVal2) && !isNaN(_targetVal2) && _targetVal2 !== 0) {
        const _capaianFinal = _savedRow?.bermakna_negatif
          ? ((_targetVal2 - (_realVal2 - _targetVal2)) / _targetVal2) * 100
          : (_realVal2 / _targetVal2) * 100;
        _togglePermasalahanSolusi('', indikatorId, _capaianFinal);
        // Update ps-read content & visibility (dengan truncation + tombol Selengkapnya)
        [['fpenghambat', _savedRow?.f_penghambat], ['solusi', _savedRow?.solusi],
         ['fpendukung', _savedRow?.f_pendukung], ['rencana', _savedRow?.rencana_tl]].forEach(([base, val]) => {
          _updatePSReadAfterSave(base, indikatorId, val);
        });
      }
      // Tampilkan warning di kolom Data Dukung jika belum ada file
      if (!row?.data_dukung_url) {
        const dukungCell = document.querySelector(`tr[data-id="${indikatorId}"] td[data-col="dukung"]`);
        if (dukungCell && !dukungCell.querySelector('.dukung-warning')) {
          dukungCell.insertAdjacentHTML('beforeend', `
            <div class="dukung-warning" data-tip="Data dukung belum diupload untuk indikator ini">
              <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/></svg>
              Belum diupload
            </div>`);
        }
      }
    }
  } catch (err) {
    toast('Error: ' + err.message, 'error');
    if (btn) { btn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M15.2 3a2 2 0 0 1 1.4.6l3.8 3.8a2 2 0 0 1 .6 1.4V19a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z"/><path d="M17 21v-7a1 1 0 0 0-1-1H8a1 1 0 0 0-1 1v7"/><path d="M7 3v4a1 1 0 0 0 1 1h7"/></svg> Simpan`; btn.disabled = false; }
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// ADMIN: KELOLA GROUP
// ═══════════════════════════════════════════════════════════════════════════
async function loadGroupAdmin() {
  const tbody = document.getElementById('groupAdminBody');
  if (!tbody) return;
  tbody.innerHTML = `<tr class="empty-row"><td colspan="5"><span class="btn-spin" style="width:11px;height:11px;vertical-align:-1px;margin-right:6px"></span>Memuat...</td></tr>`;
  try {
    const r = await fetch('/api/kinerja/group', { headers: authHeaders() });
    const d = await r.json();
    _groupList   = d.group || [];
    _groupPage   = 1;
    _groupSearch = '';
    const searchEl = document.getElementById('groupSearch');
    if (searchEl) searchEl.value = '';
    renderGroupAdmin();
  } catch (err) {
    tbody.innerHTML = `<tr class="empty-row"><td colspan="6">Gagal: ${err.message}</td></tr>`;
  }
}

function filterGroup() {
  _groupSearch = document.getElementById('groupSearch')?.value?.toLowerCase() || '';
  _groupPage   = 1;
  renderGroupAdmin();
}
window.goGroupPage = (p) => { _groupPage = p; renderGroupAdmin(); };

function renderGroupAdmin() {
  const tbody = document.getElementById('groupAdminBody');
  if (!tbody) return;

  const filtered = _groupList.filter(g => {
    if (!_groupSearch) return true;
    const meta = JENIS_META[g.jenis] || { label: g.jenis };
    return (
      g.nama.toLowerCase().includes(_groupSearch) ||
      meta.label.toLowerCase().includes(_groupSearch)
    );
  });

  if (!filtered.length) {
    tbody.innerHTML = `<tr class="empty-row"><td colspan="5">${_groupSearch ? 'Tidak ada hasil pencarian.' : 'Belum ada group. Klik "+ Tambah Group".'}</td></tr>`;
    renderPagination('groupPagination', 0, 1, _groupPageSize, 'goGroupPage');
    return;
  }

  const start = (_groupPage - 1) * _groupPageSize;
  const slice = filtered.slice(start, start + _groupPageSize);

  tbody.innerHTML = slice.map((g, i) => {
    const meta = JENIS_META[g.jenis] || { label: g.jenis, cls: '' };
    return `
      <tr>
        <td style="text-align:center;color:var(--teks-muted)">${start + i + 1}</td>
        <td><span class="group-jenis-badge ${meta.cls}">${escHtml(meta.label)}</span></td>
        <td>${escHtml(g.nama)}</td>
        <td style="text-align:center">${g.urutan}</td>
        <td style="white-space:nowrap">
          <button class="btn btn-ghost btn-sm" data-tip="Edit" onclick="openGroupModal(${g.id})"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg></button>
          <button class="btn btn-danger btn-sm" data-tip="Hapus" onclick="deleteGroup(${g.id})"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path stroke-linecap="round" stroke-linejoin="round" d="M19 6l-1 14H6L5 6"/><path stroke-linecap="round" stroke-linejoin="round" d="M10 11v6m4-6v6"/><path stroke-linecap="round" stroke-linejoin="round" d="M9 6V4h6v2"/></svg></button>
        </td>
      </tr>`;
  }).join('');
  renderPagination('groupPagination', filtered.length, _groupPage, _groupPageSize, 'goGroupPage');
}

function openGroupModal(id) {
  _editingGroupId = id || null;
  document.getElementById('modalGroupTitle').textContent = id ? 'Edit Group' : 'Tambah Group';
  const g = id ? _groupList.find(x => x.id === id) : null;
  document.getElementById('groupId').value      = g?.id || '';
  document.getElementById('groupNama').value    = g?.nama || '';
  document.getElementById('groupJenis').value   = g?.jenis || 'sasaran';
  document.getElementById('groupUrutan') && (document.getElementById('groupUrutan').value = g?.urutan ?? 0);
  document.getElementById('groupAktif') && (document.getElementById('groupAktif').checked = g ? g.aktif : true);
  openModal('modalGroup');
}

async function saveGroup() {
  const body = {
    nama:   document.getElementById('groupNama').value.trim(),
    jenis:  document.getElementById('groupJenis').value,
  };
  if (!body.nama) { toast('Nama group wajib diisi', 'error'); return; }
  const id     = _editingGroupId;
  const url    = id ? `/api/kinerja/group/${id}` : '/api/kinerja/group';
  const method = id ? 'PUT' : 'POST';
  try {
    const r = await fetch(url, { method, headers: authHeaders(), body: JSON.stringify(body) });
    const d = await r.json();
    if (!r.ok) { toast(d.error || 'Gagal simpan', 'error'); return; }
    toast(id ? 'Group diperbarui' : 'Group ditambahkan');
    closeModal('modalGroup');
    loadGroupAdmin();
  } catch (err) { toast('Error: ' + err.message, 'error'); }
}

async function deleteGroup(id) {
  const g  = _groupList.find(x => x.id === id);
  const ok = await showConfirm({
    title:  'Hapus Group',
    msg:    `Group "<b>${escHtml(g?.nama || '')}</b>" akan dihapus. Indikator di dalamnya tidak ikut terhapus.`,
    okText: 'Ya, Hapus', icon: 'trash',
  });
  if (!ok) return;
  await fetch(`/api/kinerja/group/${id}`, { method: 'DELETE', headers: authHeaders() });
  toast('Group dihapus');
  loadGroupAdmin();
}

// ═══════════════════════════════════════════════════════════════════════════
// ADMIN: KELOLA INDIKATOR
// ═══════════════════════════════════════════════════════════════════════════
async function loadIndikatorAdmin({ keepFilter = false } = {}) {
  const tbody = document.getElementById('indikatorAdminBody');
  if (!tbody) return;
  tbody.innerHTML = `<tr class="empty-row"><td colspan="9"><span class="btn-spin" style="width:11px;height:11px;vertical-align:-1px;margin-right:6px"></span>Memuat...</td></tr>`;
  try {
    const [ri, rg, rb, rt, rj] = await Promise.all([
      fetch('/api/kinerja/indikator',        { headers: authHeaders() }),
      fetch('/api/kinerja/group',            { headers: authHeaders() }),
      fetch('/api/bidang',                   { headers: authHeaders() }),
      fetch('/api/kinerja/target?all=1',     { headers: authHeaders() }),
      fetch('/api/kinerja/jenis-kinerja',    { headers: authHeaders() }),
    ]);
    const di = await ri.json();
    const dg = await rg.json();
    const db = await rb.json();
    const dt = await rt.json();
    const dj = await rj.json();
    _indikatorList     = (di.indikator || []).map(normTarget);
    _groupList         = dg.group    || [];
    _bidangListKinerja = db.bidang   || [];
    _jenisList         = (dj.jenis   || []).filter(j => j.aktif);
    // Build targetMap: { indikator_id: [{tahun, target, target_display}] }
    _targetMap = {};
    for (const t of (dt.target || [])) {
      if (!_targetMap[t.indikator_id]) _targetMap[t.indikator_id] = [];
      _targetMap[t.indikator_id].push(t);
    }
    _indikatorPage = 1;
    if (!keepFilter) {
      _indikatorSearch      = '';
      _indikatorFilterJenis = '';
      _indikatorFilterMakna = '';
      _indikatorFilterPJ    = '';
      _indikatorFilterTahun = '';
      _indikatorSort        = 'urutan';
      const searchEl = document.getElementById('indikatorSearch');
      if (searchEl) searchEl.value = '';
      const jenisEl = document.getElementById('indikatorFilterJenis');
      if (jenisEl) jenisEl.value = '';
      const maknaEl = document.getElementById('indikatorFilterMakna');
      if (maknaEl) maknaEl.value = '';
      const sortEl = document.getElementById('indikatorSort');
      if (sortEl) sortEl.value = 'urutan';
    } else {
      const sortEl = document.getElementById('indikatorSort');
      if (sortEl) sortEl.value = _indikatorSort;
    }
    // Populate filter Jenis Kinerja secara dinamis
    const jenisFilterEl = document.getElementById('indikatorFilterJenis');
    if (jenisFilterEl) {
      const all = (dj.jenis || []).filter(j => j.aktif);
      jenisFilterEl.innerHTML =
        '<option value="">Semua Jenis</option>' +
        all.map(j => `<option value="${escHtml(j.kode)}">${escHtml(j.label)}</option>`).join('') +
        '<option value="none">Tanpa Jenis</option>';
      if (keepFilter && _indikatorFilterJenis) jenisFilterEl.value = _indikatorFilterJenis;
    }
    // Populate tahun dropdown dari targetMap
    const tahunSet = new Set();
    for (const targets of Object.values(_targetMap)) {
      for (const t of targets) if (t.tahun) tahunSet.add(t.tahun);
    }
    const tahunEl = document.getElementById('indikatorFilterTahun');
    if (tahunEl) {
      const sorted = [...tahunSet].sort((a, b) => a - b);
      const thisYear = new Date().getFullYear();
      const prevTahun = keepFilter ? _indikatorFilterTahun : '';
      tahunEl.innerHTML = '<option value="">Semua Tahun</option>' +
        sorted.map(y => `<option value="${y}" ${String(y) === String(prevTahun || thisYear) ? 'selected' : ''}>${y}</option>`).join('');
      _indikatorFilterTahun = tahunEl.value;
    }
    renderIndikatorAdmin();
  } catch (err) {
    tbody.innerHTML = `<tr class="empty-row"><td colspan="8">Gagal: ${err.message}</td></tr>`;
  }
}

function filterIndikator() {
  _indikatorSearch      = document.getElementById('indikatorSearch')?.value?.toLowerCase() || '';
  _indikatorFilterJenis = document.getElementById('indikatorFilterJenis')?.value || '';
  _indikatorFilterMakna = document.getElementById('indikatorFilterMakna')?.value || '';
  _indikatorFilterPJ    = document.getElementById('indikatorFilterPJ')?.value || '';
  _indikatorFilterTahun = document.getElementById('indikatorFilterTahun')?.value || '';
  _indikatorSort        = document.getElementById('indikatorSort')?.value || 'urutan';
  _indikatorPage        = 1;
  renderIndikatorAdmin();
}

// Helper: ambil nilai target numerik indikator untuk kebutuhan sort
// (pakai target tahun filter kalau ada, kalau tidak pakai tahun terbaru yang tersedia)
function _indikatorSortTargetVal(row) {
  const targets = _targetMap[row.id] || [];
  if (!targets.length) return null;
  let t;
  if (_indikatorFilterTahun) {
    t = targets.find(t => String(t.tahun) === _indikatorFilterTahun);
  } else {
    t = [...targets].sort((a, b) => b.tahun - a.tahun)[0];
  }
  if (!t) return null;
  const raw = t.target != null ? t.target : t.target_display;
  const num = parseFloat(String(raw).replace(/[^\d.-]/g, ''));
  return isNaN(num) ? null : num;
}

// Helper: ranking jenis kinerja untuk sort — ikut urutan _jenisList (IKU/IKK/SPM/custom sesuai `urutan`),
// baris tanpa jenis apapun ditaruh paling akhir
function _indikatorSortJenisRank(row) {
  for (let i = 0; i < _jenisList.length; i++) {
    if (_rowHasJenis(row, _jenisList[i].kode)) return i;
  }
  return Infinity;
}

// Sort array baris indikator sesuai _indikatorSort (dipakai bareng oleh tabel & download PDF biar konsisten)
function _sortIndikatorRows(rows) {
  const sorted = [...rows];
  switch (_indikatorSort) {
    case 'nama_asc':
      sorted.sort((a, b) => (a.indikator_kinerja || '').localeCompare(b.indikator_kinerja || '', 'id'));
      break;
    case 'nama_desc':
      sorted.sort((a, b) => (b.indikator_kinerja || '').localeCompare(a.indikator_kinerja || '', 'id'));
      break;
    case 'terbaru':
      sorted.sort((a, b) => (b.id || 0) - (a.id || 0));
      break;
    case 'terlama':
      sorted.sort((a, b) => (a.id || 0) - (b.id || 0));
      break;
    case 'target_desc':
      sorted.sort((a, b) => {
        const va = _indikatorSortTargetVal(a), vb = _indikatorSortTargetVal(b);
        if (va == null && vb == null) return 0;
        if (va == null) return 1;
        if (vb == null) return -1;
        return vb - va;
      });
      break;
    case 'target_asc':
      sorted.sort((a, b) => {
        const va = _indikatorSortTargetVal(a), vb = _indikatorSortTargetVal(b);
        if (va == null && vb == null) return 0;
        if (va == null) return 1;
        if (vb == null) return -1;
        return va - vb;
      });
      break;
    case 'jenis_kinerja': {
      // Rank berdasar urutan jenis (IKU/IKK/SPM/custom, "Tanpa Jenis" di akhir).
      // Sesama jenis TIDAK diurutkan alfabet — dibiarkan ikut urutan default (group/urutan/id),
      // supaya indikator yang baru dipindah jenis-nya (mis. dari IKK ke IKU) gak lompat ke
      // posisi No. 1 cuma karena namanya diawali huruf "A", tapi tetap di posisi urutan aslinya.
      const ranked = sorted.map((row, idx) => ({ row, idx, rank: _indikatorSortJenisRank(row) }));
      ranked.sort((a, b) => (a.rank - b.rank) || (a.idx - b.idx));
      return ranked.map(x => x.row);
    }
    case 'urutan':
    default:
      // biarkan urutan default dari backend (group/urutan/id)
      break;
  }
  return sorted;
}
window.goIndikatorPage = (p) => { _indikatorPage = p; renderIndikatorAdmin(); };
window.openJenisModal       = openJenisModal;
window.saveJenis            = saveJenis;
window.deleteJenis          = deleteJenis;
window.loadKelolaJenis      = loadKelolaJenis;
window._updateJenisPreview  = _updateJenisPreview;
window._onJenisCbChange     = _onJenisCbChange;

// Badge kecil penanda tipe perhitungan (Kumulatif / Rata-rata / Non-Kumulatif)
// dipakai di tabel Kelola Indikator & tabel isi realisasi (biar user non-admin tahu)
const TIPE_PERHITUNGAN_INFO = {
  kumulatif:     { label: 'Kumulatif',     bg: '#eff6ff', teks: '#1d4ed8', border: '#bfdbfe', title: 'Nilai capaian dijumlahkan berjalan dari Januari s.d. bulan yang diisi' },
  rata_rata:     { label: 'Rata-rata',     bg: '#fffbeb', teks: '#b45309', border: '#fde68a', title: 'Nilai capaian dihitung rata-rata dari bulan-bulan yang sudah diisi' },
  non_kumulatif: { label: 'Non-Kumulatif', bg: '#fdf4ff', teks: '#a21caf', border: '#f5d0fe', title: 'Nilai capaian berdiri sendiri per bulan, tidak dijumlah/dirata-rata' },
};
function _tipeBadge(tipe) {
  const info = TIPE_PERHITUNGAN_INFO[tipe] || TIPE_PERHITUNGAN_INFO.non_kumulatif;
  return `<span data-tip="${escHtml(info.title)}" style="display:inline-flex;align-items:center;justify-content:center;box-sizing:border-box;height:24px;font-size:.62rem;font-weight:600;line-height:1;padding:0 8px;border-radius:5px;background:${info.bg};color:${info.teks};border:1px solid ${info.border};white-space:nowrap;flex-shrink:0;cursor:default">${info.label}</span>`;
}

// Render formula sebagai pecahan matematis
// Format input: "Pembilang / Penyebut × konstanta"
// Contoh: "Jumlah kematian bayi / Jumlah kelahiran hidup × 1000 KH"
function _renderFormulaMath(formula, _unused) {
  if (!formula) return '';
  // Parse JSON format baru: {nama, pembilang, penyebut, pengali}
  let f = null;
  try { f = JSON.parse(formula); } catch(e) {}
  // Fallback: format lama (teks biasa)
  if (!f || typeof f !== 'object') {
    return `<div style="font-size:0.60rem;font-style:italic;color:#0f766e;line-height:1.4;padding:2px 5px;background:#f0fdfa;border-left:2px solid #14b8a6;border-radius:0 4px 4px 0">${escHtml(formula)}</div>`;
  }
  const { nama, pembilang, penyebut, pengali } = f;
  // Kalau tidak ada pembilang/penyebut, tampil teks biasa
  if (!pembilang && !penyebut) {
    return `<div style="font-size:0.60rem;font-style:italic;color:#0f766e;line-height:1.4;padding:2px 5px;background:#f0fdfa;border-left:2px solid #14b8a6;border-radius:0 4px 4px 0">${escHtml(nama||'')}</div>`;
  }
  const namaHtml = nama
    ? `<div style="font-size:0.60rem;font-style:italic;color:#0f766e;white-space:normal;word-break:break-word;overflow-wrap:anywhere;max-width:80px;flex-shrink:0;align-self:center;margin-right:5px;line-height:1.35">${escHtml(nama)}</div>`
    : '';
  const mulHtml = pengali
    ? `<div style="font-size:0.60rem;font-style:italic;color:#0f766e;margin-left:6px;white-space:nowrap;align-self:center">× ${escHtml(pengali)}</div>`
    : '';
  return `<div style="padding:3px 5px;background:#f0fdfa;border-left:2px solid #14b8a6;border-radius:0 4px 4px 0">
    <div style="display:flex;align-items:center">
      ${namaHtml}
      <div style="display:flex;flex-direction:column;align-items:center;flex:1">
        <div style="font-size:0.60rem;font-style:italic;color:#0f766e;text-align:center;padding:0 4px;line-height:1.4;white-space:normal;overflow-wrap:normal">${escHtml(pembilang||'')}</div>
        <div style="width:100%;height:1px;background:#14b8a6;margin:2px 0"></div>
        <div style="font-size:0.60rem;font-style:italic;color:#0f766e;text-align:center;padding:0 4px;line-height:1.4;white-space:normal;overflow-wrap:normal">${escHtml(penyebut||'')}</div>
      </div>
      ${mulHtml}
    </div>
  </div>`;
}

// ── Panel formula (dropdown "Σ") — dirender floating position:fixed di document.body,
// bukan nested di dalam td sticky, biar gak ikut kena overflow:hidden / gak dorong tinggi baris. ──
let _fxPanelEl  = null;
let _fxOwnerBtn = null;
function _ensureFxPanelEl() {
  if (_fxPanelEl) return _fxPanelEl;
  const el = document.createElement('div');
  el.className = 'fx-float-panel';
  document.body.appendChild(el);
  document.addEventListener('click', (e) => {
    if (!_fxPanelEl || !_fxPanelEl.classList.contains('show')) return;
    if (_fxPanelEl.contains(e.target)) return;
    if (_fxOwnerBtn && _fxOwnerBtn.contains(e.target)) return;
    _closeFxPanel();
  });
  window.addEventListener('scroll', () => _closeFxPanel(), true);
  window.addEventListener('resize', () => _closeFxPanel());
  _fxPanelEl = el;
  return el;
}
function _closeFxPanel() {
  if (_fxPanelEl) _fxPanelEl.classList.remove('show');
  if (_fxOwnerBtn) {
    const arrow = _fxOwnerBtn.querySelector('.fx-arrow');
    if (arrow) arrow.style.transform = 'rotate(0deg)';
  }
  _fxOwnerBtn = null;
}
function toggleFormulaPanel(btn) {
  const panel = _ensureFxPanelEl();
  if (_fxOwnerBtn === btn && panel.classList.contains('show')) { _closeFxPanel(); return; }
  _closeFxPanel();
  panel.innerHTML = _renderFormulaMath(btn.dataset.formula || '', '');
  panel.style.left = '-9999px';
  panel.style.top  = '-9999px';
  panel.classList.add('show');
  const pr = panel.getBoundingClientRect();
  const r  = btn.getBoundingClientRect();
  let top = r.bottom + 6;
  if (top + pr.height > window.innerHeight - 8) top = Math.max(8, r.top - pr.height - 6);
  let left = Math.max(6, Math.min(r.left, window.innerWidth - pr.width - 6));
  panel.style.top  = top + 'px';
  panel.style.left = left + 'px';
  _fxOwnerBtn = btn;
  const arrow = btn.querySelector('.fx-arrow');
  if (arrow) arrow.style.transform = 'rotate(180deg)';
}
window.toggleFormulaPanel = toggleFormulaPanel;

// Preview live di modal
function _previewFormula() {
  const nama      = document.getElementById('fNama')?.value.trim() || '';
  const pembilang = document.getElementById('fPembilang')?.value.trim() || '';
  const penyebut  = document.getElementById('fPenyebut')?.value.trim() || '';
  const pengali   = document.getElementById('fPengali')?.value.trim() || '';
  // Update hidden input sebagai JSON
  const obj = { nama, pembilang, penyebut, pengali };
  const hidden = document.getElementById('indikatorFormula');
  if (hidden) hidden.value = (pembilang || penyebut || nama) ? JSON.stringify(obj) : '';
  // Render preview
  const prev = document.getElementById('formulaPreview');
  if (!prev) return;
  if (!pembilang && !penyebut && !nama) { prev.style.display = 'none'; return; }
  prev.style.display = 'block';
  prev.innerHTML = `<div style="font-size:0.68rem;font-weight:700;color:var(--hijau);letter-spacing:.05em;margin-bottom:6px;text-transform:uppercase">Preview</div>` + _renderFormulaMath(hidden.value);
}

function renderIndikatorAdmin() {
  const tbody = document.getElementById('indikatorAdminBody');
  if (!tbody) return;

  // Update header kolom Target biar selalu sinkron sama _indikatorFilterTahun
  // (dipanggil dari filterIndikator() maupun loadIndikatorAdmin() saat load awal)
  const thTargetEl = document.getElementById('thTarget');
  if (thTargetEl) thTargetEl.textContent = _indikatorFilterTahun ? `Target ${_indikatorFilterTahun}` : 'Target';

  // Populate PJ dropdown (deduplicated)
  const pjSelect = document.getElementById('indikatorFilterPJ');
  if (pjSelect) {
    const pjList = [...new Set(
      _indikatorList.map(r => r.penanggung_jawab).filter(Boolean)
    )].sort();
    const currentPJ = pjSelect.value;
    pjSelect.innerHTML = '<option value="">Semua Bidang</option>' +
      pjList.map(pj => `<option value="${escHtml(pj)}" ${pj === currentPJ ? 'selected' : ''}>${escHtml(pj)}</option>`).join('');
  }

  const filtered = _indikatorList.filter(row => {
    // Text search
    if (_indikatorSearch && !(
      row.indikator_kinerja.toLowerCase().includes(_indikatorSearch) ||
      (row.penanggung_jawab || '').toLowerCase().includes(_indikatorSearch) ||
      (row.satuan || '').toLowerCase().includes(_indikatorSearch) ||
      (Array.isArray(row.pic_users) && row.pic_users.some(n => (n || '').toLowerCase().includes(_indikatorSearch)))
    )) return false;
    // Jenis Kinerja — dinamis
    if (_indikatorFilterJenis === 'none') {
      const anyJenis = _jenisList.some(j => _rowHasJenis(row, j.kode));
      if (anyJenis) return false;
    } else if (_indikatorFilterJenis) {
      if (!_rowHasJenis(row, _indikatorFilterJenis)) return false;
    }
    // Makna
    if (_indikatorFilterMakna === 'negatif' && !row.bermakna_negatif)  return false;
    if (_indikatorFilterMakna === 'positif' &&  row.bermakna_negatif)  return false;
    // Penanggung Jawab
    if (_indikatorFilterPJ && (row.penanggung_jawab || '') !== _indikatorFilterPJ) return false;
    return true;
  });

  if (!filtered.length) {
    tbody.innerHTML = `<tr class="empty-row"><td colspan="9">${_indikatorSearch ? 'Tidak ada hasil pencarian.' : 'Belum ada indikator. Klik "+ Tambah Indikator".'}</td></tr>`;
    renderPagination('indikatorPagination', 0, 1, _indikatorPageSize, 'goIndikatorPage');
    return;
  }

  const sortedFiltered = _sortIndikatorRows(filtered);
  const start  = (_indikatorPage - 1) * _indikatorPageSize;
  const slice  = sortedFiltered.slice(start, start + _indikatorPageSize);
  // Offset nomor urut
  let rows = '';
  slice.forEach((row, i) => {
    const no = start + i + 1;
    rows += `
      <tr>
        <td class="td-sticky-no" style="text-align:center;color:var(--teks-muted);position:sticky;left:0;z-index:3">${no}</td>
        <td class="td-sticky-name" style="position:sticky;left:34px;z-index:3"><div style="font-weight:600">${escHtml(row.indikator_kinerja)}</div><div style="display:flex;align-items:center;gap:6px;margin-top:5px">${row.formula ? `<div class="fx-wrap"><button style="display:inline-flex;align-items:center;justify-content:center;gap:4px;box-sizing:border-box;height:24px;font-size:0.62rem;font-weight:700;line-height:1;color:#0f766e;background:#f0fdfa;border:1px solid #99f6e4;border-radius:4px;padding:0 8px;cursor:pointer;font-family:inherit;appearance:none;-webkit-appearance:none;margin:0" data-tip="Lihat formula perhitungan" data-formula="${escHtml(row.formula)}" onclick="toggleFormulaPanel(this)"><span>Σ</span><span class="fx-arrow" style="display:inline-block;transition:transform .2s;font-style:normal">▾</span></button></div>` : ''}${_tipeBadge(row.tipe_perhitungan)}</div></td>
        <td class="td-satuan">${escHtml(row.satuan)}</td>
        <td style="white-space:nowrap">${(() => {
          const targets = _targetMap[row.id] || [];
          if (!targets.length) return '<span style="color:var(--teks-muted)">—</span>';
          if (_indikatorFilterTahun) {
            // Hanya tampilkan target untuk tahun yang dipilih
            const t = targets.find(t => String(t.tahun) === _indikatorFilterTahun);
            if (!t) return '<span style="color:var(--teks-muted);font-size:.72rem">—</span>';
            const val = t.target_display != null ? String(t.target_display) : (t.target != null ? String(t.target) : '—');
            return `<span style="display:inline-flex;align-items:center;gap:3px;font-size:.82rem;font-weight:600;color:#0f766e">${escHtml(val)}</span>`;
          }
          const thisYear = new Date().getFullYear();
          // Urutkan: tahun terdekat dari sekarang ke atas dulu, lalu ke bawah
          const sorted = [...targets].sort((a, b) => Math.abs(a.tahun - thisYear) - Math.abs(b.tahun - thisYear));
          const shown  = sorted.slice(0, 3).sort((a, b) => a.tahun - b.tahun);
          const rest   = targets.length - 3;
          const badges = shown.map(t => {
            const val = t.target_display != null ? String(t.target_display) : (t.target != null ? String(t.target) : '—');
            return `<span style="display:inline-flex;align-items:center;gap:3px;font-size:.72rem;font-weight:600;background:#f0fdfa;color:#0f766e;border:1px solid #99f6e4;border-radius:5px;padding:2px 6px;margin:1px 2px 1px 0">${t.tahun}<span style="color:#64748b;font-weight:400">:</span>${escHtml(val)}</span>`;
          }).join('');
          const moreBadge = rest > 0
            ? `<span data-tip="Buka edit untuk lihat semua target" style="display:inline-flex;align-items:center;font-size:.72rem;font-weight:600;background:#f1f5f9;color:#64748b;border:1px solid #e2e8f0;border-radius:5px;padding:2px 6px;margin:1px 0;cursor:default">+${rest} lagi</span>`
            : '';
          return badges + moreBadge;
        })()}</td>
        <td>${escHtml(row.penanggung_jawab || '—')}</td>
        <td>${(() => {
          const pics = Array.isArray(row.pic_users) ? row.pic_users.filter(Boolean) : [];
          if (!pics.length) return '<span style="color:var(--teks-muted);font-size:.75rem">—</span>';
          return pics.map(nama => `<span style="display:inline-flex;align-items:center;font-size:.7rem;font-weight:600;background:#eff6ff;color:#1e40af;border:1px solid #bfdbfe;border-radius:5px;padding:2px 7px;margin:1px 3px 1px 0">${escHtml(nama)}</span>`).join('');
        })()}</td>
        <td>
          ${_renderJenisBadges(row)}
        </td>
        <td class="neg-col">
          ${row.bermakna_negatif
            ? `<span style="display:inline-flex;align-items:center;gap:3px;font-size:.7rem;font-weight:700;color:#991b1b;background:#fee2e2;padding:2px 7px;border-radius:5px">
                <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M19 14l-7 7m0 0l-7-7m7 7V3"/></svg>
                Negatif</span>`
            : `<span style="display:inline-flex;align-items:center;gap:3px;font-size:.7rem;font-weight:700;color:#065F46;background:#D1FAE5;padding:2px 7px;border-radius:5px">
                <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M5 10l7-7m0 0l7 7m-7-7v18"/></svg>
                Positif</span>`
          }
        </td>
        <td style="white-space:nowrap">
          <button class="btn btn-ghost btn-sm" data-tip="Edit" onclick="openIndikatorModal(${row.id})"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg></button>
          <button class="btn btn-danger btn-sm" data-tip="Hapus" onclick="deleteIndikator(${row.id})"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path stroke-linecap="round" stroke-linejoin="round" d="M19 6l-1 14H6L5 6"/><path stroke-linecap="round" stroke-linejoin="round" d="M10 11v6m4-6v6"/><path stroke-linecap="round" stroke-linejoin="round" d="M9 6V4h6v2"/></svg></button>
        </td>
      </tr>`;
  });
  tbody.innerHTML = rows;
  renderPagination('indikatorPagination', filtered.length, _indikatorPage, _indikatorPageSize, 'goIndikatorPage');
}

// Filter (+ sort) list indikator mengikuti filter/sort yang sedang aktif di tabel Kelola Indikator
// dipakai buat download PDF biar urutannya sama persis kayak yang lagi dilihat user di tabel
function _getFilteredIndikatorRows() {
  const filtered = _indikatorList.filter(row => {
    if (_indikatorSearch && !(
      row.indikator_kinerja.toLowerCase().includes(_indikatorSearch) ||
      (row.penanggung_jawab || '').toLowerCase().includes(_indikatorSearch) ||
      (row.satuan || '').toLowerCase().includes(_indikatorSearch) ||
      (Array.isArray(row.pic_users) && row.pic_users.some(n => (n || '').toLowerCase().includes(_indikatorSearch)))
    )) return false;
    if (_indikatorFilterJenis === 'none') {
      const anyJenis = _jenisList.some(j => _rowHasJenis(row, j.kode));
      if (anyJenis) return false;
    } else if (_indikatorFilterJenis) {
      if (!_rowHasJenis(row, _indikatorFilterJenis)) return false;
    }
    if (_indikatorFilterMakna === 'negatif' && !row.bermakna_negatif)  return false;
    if (_indikatorFilterMakna === 'positif' &&  row.bermakna_negatif)  return false;
    if (_indikatorFilterPJ && (row.penanggung_jawab || '') !== _indikatorFilterPJ) return false;
    return true;
  });
  return _sortIndikatorRows(filtered);
}

// ══════════════════════════════════════════════════════
//  DOWNLOAD KELOLA INDIKATOR — PDF (gaya sama dengan laporan.js:
//  kop surat resmi + tabel + tanda tangan, dibuka di tab baru untuk di-print/Save as PDF)
// ══════════════════════════════════════════════════════
async function downloadIndikatorPDF(btnEl) {
  if (!_indikatorList.length) { toast('Belum ada data indikator untuk didownload.', 'error'); return; }

  const originalHtml = btnEl ? btnEl.innerHTML : null;
  if (btnEl) { btnEl.disabled = true; btnEl.innerHTML = `<span class="btn-spin" style="width:12px;height:12px"></span> Memuat...`; }

  try {
    const filtered = _getFilteredIndikatorRows();
    if (!filtered.length) { toast('Tidak ada data sesuai filter saat ini.', 'error'); return; }

    const tahunLabel = _indikatorFilterTahun || new Date().getFullYear();
    const targetHeaderLabel = _indikatorFilterTahun ? `TARGET ${_indikatorFilterTahun}` : 'TARGET';

    const bodyRows = filtered.map((row, i) => {
      const targets = _targetMap[row.id] || [];
      let targetStr = '—';
      if (targets.length) {
        if (_indikatorFilterTahun) {
          const t = targets.find(t => String(t.tahun) === _indikatorFilterTahun);
          targetStr = t ? String(t.target_display != null ? t.target_display : (t.target != null ? t.target : '—')) : '—';
        } else {
          targetStr = [...targets]
            .sort((a, b) => a.tahun - b.tahun)
            .map(t => `${t.tahun}: ${t.target_display != null ? t.target_display : (t.target != null ? t.target : '—')}`)
            .join('; ');
        }
      }
      const pics = Array.isArray(row.pic_users) ? row.pic_users.filter(Boolean) : [];

      // Badge Jenis Kinerja — sama persis kayak style di UI (_renderJenisBadges), pakai warna dinamis dari _jenisList
      const jenisBadgeHtml = _jenisList
        .filter(j => j.aktif && _rowHasJenis(row, j.kode))
        .map(j => `<span style="display:inline-block;font-size:8px;font-weight:700;color:${j.warna_teks};background:${j.warna_bg};padding:2px 6px;border-radius:4px;margin:1px 2px 1px 0">${escHtml(j.label)}</span>`)
        .join('');

      // Badge Makna Indikator — sama persis kayak style di UI (pill + panah)
      const maknaBadgeHtml = row.bermakna_negatif
        ? `<span style="display:inline-block;font-size:8px;font-weight:700;color:#991b1b;background:#fee2e2;padding:2px 6px;border-radius:4px">&darr; Negatif</span>`
        : `<span style="display:inline-block;font-size:8px;font-weight:700;color:#065f46;background:#d1fae5;padding:2px 6px;border-radius:4px">&uarr; Positif</span>`;

      return `<tr style="background:white">
        <td style="padding:4px 5px;border:1px solid #000;text-align:center;font-size:9px">${i + 1}</td>
        <td style="padding:4px 6px;border:1px solid #000;font-size:9px">${row.indikator_kinerja || ''}</td>
        <td style="padding:4px 4px;border:1px solid #000;text-align:center;font-size:9px">${row.satuan || '—'}</td>
        <td style="padding:4px 4px;border:1px solid #000;text-align:center;font-size:9px;white-space:nowrap">${targetStr}</td>
        <td style="padding:4px 6px;border:1px solid #000;font-size:9px">${row.penanggung_jawab || '—'}</td>
        <td style="padding:4px 6px;border:1px solid #000;font-size:9px">${pics.length ? pics.join(', ') : '—'}</td>
        <td style="padding:4px 4px;border:1px solid #000;text-align:center;font-size:9px">${jenisBadgeHtml || '—'}</td>
        <td style="padding:4px 4px;border:1px solid #000;text-align:center;font-size:9px">${maknaBadgeHtml}</td>
      </tr>`;
    }).join('');

    const bodyHtml = `
      ${_kopSuratHtml()}
      <div style="text-align:center;margin:18px 0 14px">
        <div style="font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:.5px">Kelola Indikator Kinerja</div>
        <div style="font-size:10px;color:#475569;margin-top:3px">Tahun ${tahunLabel}</div>
      </div>
      <table style="border-collapse:collapse;border-spacing:0;width:100%;table-layout:auto">
        <thead>
          <tr style="background:#0d9488">
            <th style="color:white;padding:5px 4px;border:1px solid #000;text-align:center;font-size:9px;width:32px">NO</th>
            <th style="color:white;padding:5px 4px;border:1px solid #000;text-align:center;font-size:9px;min-width:150px">INDIKATOR KINERJA</th>
            <th style="color:white;padding:5px 4px;border:1px solid #000;text-align:center;font-size:9px;width:50px">SATUAN</th>
            <th style="color:white;padding:5px 4px;border:1px solid #000;text-align:center;font-size:9px;width:60px">${targetHeaderLabel}</th>
            <th style="color:white;padding:5px 4px;border:1px solid #000;text-align:center;font-size:9px;min-width:110px">BIDANG / SUB BAGIAN</th>
            <th style="color:white;padding:5px 4px;border:1px solid #000;text-align:center;font-size:9px;min-width:100px">PENANGGUNG JAWAB (USER)</th>
            <th style="color:white;padding:5px 4px;border:1px solid #000;text-align:center;font-size:9px;width:70px">JENIS KINERJA</th>
            <th style="color:white;padding:5px 4px;border:1px solid #000;text-align:center;font-size:9px;width:60px">MAKNA INDIKATOR</th>
          </tr>
        </thead>
        <tbody>${bodyRows}</tbody>
      </table>`;

    _bukaPreviewPDF(bodyHtml, `Kelola Indikator Kinerja Tahun ${tahunLabel}`, 'landscape');
  } catch (err) {
    toast('Gagal membuat PDF: ' + err.message, 'error');
  } finally {
    if (btnEl) { btnEl.disabled = false; btnEl.innerHTML = originalHtml; }
  }
}
window.downloadIndikatorPDF = downloadIndikatorPDF;

function _buildBidangOptions(selectedNama) {
  const none = `<option value="">— Pilih Bidang / Sub Bagian —</option>`;
  const opts = _bidangListKinerja
    .filter(b => b.aktif)
    .map(b => {
      const sel = b.nama === selectedNama ? 'selected' : '';
      return `<option value="${escHtml(b.nama)}" ${sel}>${escHtml(b.nama)}</option>`;
    }).join('');
  return none + opts;
}

// Searchable dropdown untuk #indikatorPJ — sama dengan initBidangSearchable di users_frontend.js
function initIndikatorPJSearchable() {
  const sel = document.getElementById('indikatorPJ');
  if (!sel) return;
  const wrap = sel.closest('.select-wrap');
  if (!wrap) return;

  // Bersihkan custom UI lama
  wrap.querySelectorAll('.bsel-trigger, .bsel-panel, .csel-trigger, .csel-panel').forEach(el => el.remove());
  // Panel dari buildCustomSelect (generic engine) dirender floating di document.body,
  // jadi gak ke-cover querySelectorAll di atas — bersihkan lewat referensinya biar gak orphan.
  if (wrap._cselPanel) { wrap._cselPanel.remove(); wrap._cselPanel = null; }
  wrap.classList.remove('csel-ready');
  // Fungsi ini dipanggil ulang tiap modal indikator dibuka — buang listener
  // window/document dari instance sebelumnya dulu, biar gak numpuk (memory leak
  // & bisa salah nutup panel punya instance lama).
  if (wrap._bselOutside)  document.removeEventListener('click', wrap._bselOutside);
  if (wrap._bselScroll)   window.removeEventListener('scroll', wrap._bselScroll, true);
  if (wrap._bselResize)   window.removeEventListener('resize', wrap._bselResize, true);

  const selectedOpt = sel.options[sel.selectedIndex];
  const selectedText = (selectedOpt && selectedOpt.value !== '') ? selectedOpt.text : null;

  // Trigger button
  const trigger = document.createElement('button');
  trigger.type = 'button';
  trigger.className = 'bsel-trigger csel-trigger';
  trigger.innerHTML = `<span class="bsel-trigger-text csel-trigger-text${selectedText ? '' : ' placeholder'}">${selectedText || '— Pilih Bidang / Sub Bagian —'}</span>
    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5" class="csel-chev"><path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7"/></svg>`;
  wrap.appendChild(trigger);

  // Panel
  const panel = document.createElement('div');
  panel.className = 'bsel-panel csel-panel';
  panel.style.cssText = 'display:none;padding:0';

  // Search input
  const searchWrap = document.createElement('div');
  searchWrap.style.cssText = 'padding:8px 10px;border-bottom:1px solid var(--border,#e2e8f0);position:sticky;top:0;background:#fff;z-index:1';
  const searchInp = document.createElement('input');
  searchInp.type = 'text';
  searchInp.placeholder = 'Cari bidang...';
  searchInp.className = 'bsel-search';
  searchInp.style.cssText = 'width:100%;border:1px solid var(--border,#e2e8f0);border-radius:6px;padding:5px 10px;font-size:.83rem;outline:none;color:var(--text-primary,#1e293b);background:var(--bg-input,#f8fafc)';
  searchWrap.appendChild(searchInp);
  panel.appendChild(searchWrap);

  // Options list
  const listEl = document.createElement('div');
  listEl.className = 'bsel-list';
  listEl.style.cssText = 'max-height:220px;overflow-y:scroll;overscroll-behavior:contain';
  panel.appendChild(listEl);

  wrap.appendChild(panel);

  function renderList(query) {
    const q = (query || '').toLowerCase();
    listEl.innerHTML = '';
    let hasResult = false;
    Array.from(sel.options).forEach((opt, i) => {
      const text = opt.text;
      const val  = opt.value;
      if (q && val === '') return;
      if (q && !text.toLowerCase().includes(q)) return;
      hasResult = true;
      const isSelected = sel.selectedIndex === i;
      const isPlaceholder = val === '';
      const div = document.createElement('div');
      div.className = 'csel-option' + (isSelected ? ' selected' : '') + (isPlaceholder ? ' placeholder-opt' : '');
      div.innerHTML = `<span class="csel-option-check"><svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="3"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"/></svg></span><span>${text}</span>`;
      div.addEventListener('click', () => {
        sel.selectedIndex = i;
        sel.dispatchEvent(new Event('change', { bubbles: true }));
        const textEl = trigger.querySelector('.bsel-trigger-text');
        if (!opt || opt.value === '') {
          textEl.textContent = opt ? opt.text : '—';
          textEl.classList.add('placeholder');
        } else {
          textEl.textContent = opt.text;
          textEl.classList.remove('placeholder');
        }
        closePanel();
      });
      listEl.appendChild(div);
    });
    if (!hasResult) {
      listEl.innerHTML = '<div style="padding:10px 14px;font-size:.83rem;color:var(--text-secondary,#64748b)">Tidak ditemukan</div>';
    }
  }

  function openPanel() {
    document.querySelectorAll('.bsel-panel, .csel-panel').forEach(p => {
      if (p !== panel) {
        p.style.display = 'none';
        p.parentElement?.querySelector('.csel-trigger, .bsel-trigger')?.classList.remove('open');
      }
    });
    document.body.appendChild(panel);
    const rect = trigger.getBoundingClientRect();
    const vw = window.innerWidth;
    const panelW = Math.min(rect.width, vw - 16);
    const panelLeft = Math.min(rect.left, vw - panelW - 8);
    panel.style.cssText = [
      'display:block',
      'position:fixed',
      'top:' + (rect.bottom + 5) + 'px',
      'left:' + panelLeft + 'px',
      'width:' + panelW + 'px',
      'z-index:99999',
      'padding:0',
      'background:#fff',
      'border:1.5px solid #e2e8f0',
      'border-radius:8px',
      'box-shadow:0 8px 24px rgba(6,95,70,.13),0 2px 8px rgba(0,0,0,.07)',
      'overflow:hidden',
    ].join(';');
    trigger.classList.add('open');
    searchInp.value = '';
    renderList('');
    setTimeout(() => searchInp.focus(), 50);
  }

  function closePanel() {
    panel.style.display = 'none';
    trigger.classList.remove('open');
    if (panel.parentElement === document.body) wrap.appendChild(panel);
  }

  trigger.addEventListener('click', e => {
    e.stopPropagation();
    panel.style.display === 'none' ? openPanel() : closePanel();
  });
  searchInp.addEventListener('input', () => renderList(searchInp.value));
  searchInp.addEventListener('keydown', e => {
    if (e.key === 'Escape') closePanel();
    e.stopPropagation();
  });
  searchInp.addEventListener('click', e => e.stopPropagation());
  panel.addEventListener('click', e => e.stopPropagation());
  const outsideHandler = (e) => {
    if (!panel.contains(e.target) && !trigger.contains(e.target)) closePanel();
  };
  const scrollHandler = (e) => { if (!panel.contains(e.target)) closePanel(); };
  document.addEventListener('click', outsideHandler, { once: false });
  window.addEventListener('scroll', scrollHandler, true);
  window.addEventListener('resize', closePanel, true);
  // simpan referensi biar bisa di-cleanup di panggilan initIndikatorPJSearchable berikutnya
  wrap._bselOutside = outsideHandler;
  wrap._bselScroll  = scrollHandler;
  wrap._bselResize  = closePanel;
  wrap.classList.add('csel-ready');
  renderList('');
}

function _buildGroupOptions(selectedId) {
  const none = `<option value="">— Tanpa Group —</option>`;
  const opts = _groupList
    .filter(g => g.aktif)
    .map(g => {
      const meta = JENIS_META[g.jenis] || { label: g.jenis };
      const sel  = g.id === selectedId ? 'selected' : '';
      return `<option value="${g.id}" ${sel}>[${escHtml(meta.label)}] ${escHtml(g.nama)}</option>`;
    }).join('');
  return none + opts;
}

function openIndikatorModal(id) {
  _editingIndikatorId = id || null;
  document.getElementById('modalIndikatorTitle').textContent = id ? 'Edit Indikator' : 'Tambah Indikator';
  const row = id ? _indikatorList.find(r => r.id === id) : null;

  document.getElementById('indikatorGroup').value      = row?.group_id || '';
  document.getElementById('indikatorId').value        = row?.id || '';
  document.getElementById('indikatorNama').value      = row?.indikator_kinerja || '';
  document.getElementById('indikatorSatuan').value    = row?.satuan || '';
  document.getElementById('indikatorPJ').innerHTML    = _buildBidangOptions(row?.penanggung_jawab || null);
  document.getElementById('indikatorUrutan') && (document.getElementById('indikatorUrutan').value = row?.urutan ?? 0);
  document.getElementById('indikatorNegatif').value   = row?.bermakna_negatif ? 'negatif' : 'positif';
  document.getElementById('indikatorTipePerhitungan').value = row?.tipe_perhitungan || 'non_kumulatif';
  document.getElementById('indikatorTipeNilai') && (document.getElementById('indikatorTipeNilai').value = row?.tipe_nilai || 'angka');
  // Set .value langsung gak kedetect MutationObserver custom-select (yg cuma
  // nangkep perubahan childList/attribute, bukan property .value) — trigger
  // visualnya jadi gak ke-update dan tetep nunjukin opsi default/lama. Sync
  // manual di sini biar kotak dropdown-nya beneran nampilin nilai yg baru di-set.
  if (typeof syncCustomSelect === 'function') {
    syncCustomSelect('indikatorNegatif');
    syncCustomSelect('indikatorTipePerhitungan');
    syncCustomSelect('indikatorTipeNilai');
  }
  document.getElementById('indikatorAktif') && (document.getElementById('indikatorAktif').checked = row ? row.aktif : true);
  // Jenis kinerja checkboxes — dinamis dari _jenisList
  const jenisWrap = document.getElementById('indikatorJenisWrap');
  if (jenisWrap) {
    const customArr = Array.isArray(row?.jenis_custom) ? row.jenis_custom : [];
    jenisWrap.innerHTML = _jenisList.map(j => {
      let checked = false;
      if (j.kode === 'iku') checked = row ? !!row.jenis_monev : false;
      else if (j.kode === 'ikk') checked = row ? !!row.jenis_ikk : false;
      else if (j.kode === 'spm') checked = row ? !!row.jenis_spm : false;
      else checked = customArr.includes(j.kode);
      const chipColor = checked
        ? `background:${j.warna_bg};border-color:${j.warna_teks}40;color:${j.warna_teks}`
        : '';
      return `<label class="jenis-chip" data-kode="${escHtml(j.kode)}"
        style="display:flex;align-items:center;gap:7px;cursor:pointer;font-size:.85rem;font-weight:500;padding:6px 12px;border-radius:8px;border:1.5px solid #e2e8f0;background:#f8fafc;transition:background .2s,border-color .2s;${chipColor ? chipColor : ''}">
        <input type="checkbox" class="jenis-cb-input" data-kode="${escHtml(j.kode)}"
          ${checked ? 'checked' : ''}
          onchange="_onJenisCbChange(this)"
          style="width:14px;height:14px;accent-color:${j.warna_teks};flex-shrink:0">
        <span>${escHtml(j.label)}</span>
        ${j.is_builtin ? '' : `<span data-tip="Jenis kustom" style="font-size:.62rem;color:${j.warna_teks};opacity:.7">✦</span>`}
      </label>`;
    }).join('')
    || '<span style="color:var(--teks-muted);font-size:.82rem">Belum ada jenis. Tambah dari bagian Kelola Jenis di bawah.</span>';
  }
  // Formula — parse JSON ke 4 field
  const fHidden = document.getElementById('indikatorFormula');
  const fNama      = document.getElementById('fNama');
  const fPembilang = document.getElementById('fPembilang');
  const fPenyebut  = document.getElementById('fPenyebut');
  const fPengali   = document.getElementById('fPengali');
  let fObj = { nama: '', pembilang: '', penyebut: '', pengali: '' };
  if (row?.formula) {
    try { fObj = { ...fObj, ...JSON.parse(row.formula) }; } catch(e) {
      fObj.nama = row.formula;
    }
  }
  if (fHidden)   fHidden.value    = row?.formula || '';
  if (fNama)      fNama.value      = fObj.nama;
  if (fPembilang) fPembilang.value = fObj.pembilang;
  if (fPenyebut)  fPenyebut.value  = fObj.penyebut;
  if (fPengali)   fPengali.value   = fObj.pengali;
  setTimeout(_previewFormula, 50);
  initIndikatorPJSearchable();

  openModal('modalIndikator');
}

// ── Target Per Tahun helpers ──────────────────────────────────────────────
function _renderTargetRows() {
  const tbody = document.getElementById('targetTahunTbody');
  if (!tbody) return;
  if (_targetRows.length === 0) {
    tbody.innerHTML = `<tr><td colspan="4" style="text-align:center;color:var(--teks-muted);font-size:.82rem;padding:12px">Belum ada target. Klik "+ Tambah" untuk menambahkan.</td></tr>`;
    return;
  }
  tbody.innerHTML = _targetRows.map((t, i) => `
    <tr>
      <td><input type="number" min="2000" max="2100" step="1" value="${t.tahun || ''}" placeholder="2025"
        oninput="_targetRows[${i}].tahun=parseInt(this.value)||''"
        style="width:80px;padding:5px 8px;border:1.5px solid #e2e8f0;border-radius:6px;font-size:.83rem;text-align:center"></td>
      <td><input type="text" value="${escHtml(String(t.target_display || t.target || ''))}" placeholder="cth: 73.87, &lt;1, &gt;90"
        oninput="_targetRows[${i}].target_display=this.value;_targetRows[${i}].target=this.value"
        style="width:120px;padding:5px 8px;border:1.5px solid #e2e8f0;border-radius:6px;font-size:.83rem"></td>
      <td style="text-align:center">
        <button onclick="_removeTargetRow(${i})" data-tip="Hapus" style="background:none;border:none;cursor:pointer;color:var(--merah);padding:2px 6px;font-size:1rem">&#x2715;</button>
      </td>
    </tr>`).join('');
}

function _addTargetRow() {
  _targetRows.push({ tahun: '', target: '', target_display: '' });
  _renderTargetRows();
  // focus tahun input di baris terakhir
  const inputs = document.querySelectorAll('#targetTahunTbody input[type="number"]');
  if (inputs.length) inputs[inputs.length - 1].focus();
}

function _removeTargetRow(i) {
  _targetRows.splice(i, 1);
  _renderTargetRows();
}

async function saveIndikator() {
  const groupVal = document.getElementById('indikatorGroup').value;
  // Collect jenis dari checkboxes dinamis
  const jenisChecked = new Set(
    [...document.querySelectorAll('#indikatorJenisWrap input.jenis-cb-input:checked')]
      .map(cb => cb.dataset.kode)
  );
  const body = {
    group_id:          groupVal ? parseInt(groupVal) : null,
    indikator_kinerja: document.getElementById('indikatorNama').value.trim(),
    satuan:            document.getElementById('indikatorSatuan').value.trim(),
    penanggung_jawab:  document.getElementById('indikatorPJ').value.trim() || null,
    bermakna_negatif:  document.getElementById('indikatorNegatif').value === 'negatif',
    tipe_perhitungan:  document.getElementById('indikatorTipePerhitungan').value,
    tipe_nilai:        document.getElementById('indikatorTipeNilai')?.value || 'angka',
    jenis_monev:       jenisChecked.has('iku'),
    jenis_ikk:         jenisChecked.has('ikk'),
    jenis_spm:         jenisChecked.has('spm'),
    jenis_custom:      [...jenisChecked].filter(k => !['iku','ikk','spm'].includes(k)),
    formula:           document.getElementById('indikatorFormula').value.trim() || null,
  };
  if (!body.indikator_kinerja || !body.satuan) { toast('Indikator dan satuan wajib diisi', 'error'); return; }

  const id     = _editingIndikatorId;
  const url    = id ? `/api/kinerja/indikator/${id}` : '/api/kinerja/indikator';
  const method = id ? 'PUT' : 'POST';
  try {
    const r = await fetch(url, { method, headers: authHeaders(), body: JSON.stringify(body) });
    const d = await r.json();
    if (!r.ok) { toast(d.error || 'Gagal simpan', 'error'); return; }

    toast(id ? 'Indikator diperbarui' : 'Indikator ditambahkan. Atur target di menu "Kelola Target".');
    closeModal('modalIndikator');
    loadIndikatorAdmin({ keepFilter: true });
    // Refresh juga tabel realisasi IKU/IKK/SPM (kalau lagi dimuat) — supaya capaian
    // langsung ikut ke-update begitu tipe_perhitungan / bermakna_negatif / target diubah,
    // tanpa user harus manual reload/pindah bulan dulu.
    try { if (typeof loadKinerjaRekap === 'function') await loadKinerjaRekap(); } catch (_) {}
    try { if (typeof loadIkkRekap === 'function') await loadIkkRekap(); } catch (_) {}
    try { if (typeof loadSpmRekap === 'function') await loadSpmRekap(); } catch (_) {}
  } catch (err) { toast('Error: ' + err.message, 'error'); }
}

async function deleteIndikator(id) {
  const row = _indikatorList.find(r => r.id === id);
  const ok  = await showConfirm({
    title:  'Hapus Indikator',
    msg:    `Indikator "<b>${escHtml(row?.indikator_kinerja || '')}</b>" dan semua data realisasinya akan dihapus permanen.`,
    okText: 'Ya, Hapus', icon: 'trash',
  });
  if (!ok) return;
  await fetch(`/api/kinerja/indikator/${id}`, { method: 'DELETE', headers: authHeaders() });
  toast('Indikator dihapus');
  loadIndikatorAdmin({ keepFilter: true });
}

// ── Helper: toggle warna chip saat checkbox jenis di-klik ────────────────
function _onJenisCbChange(cb) {
  const kode  = cb.dataset.kode;
  const label = _jenisList.find(j => j.kode === kode);
  const chip  = cb.closest('.jenis-chip');
  if (!chip || !label) return;
  if (cb.checked) {
    chip.style.background   = label.warna_bg;
    chip.style.borderColor  = label.warna_teks + '60';
    chip.style.color        = label.warna_teks;
  } else {
    chip.style.background   = '#f8fafc';
    chip.style.borderColor  = '#e2e8f0';
    chip.style.color        = '';
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// KELOLA JENIS KINERJA — halaman tersendiri di Master Data
// ═══════════════════════════════════════════════════════════════════════════
let _allJenisList = []; // semua jenis termasuk nonaktif (untuk section kelola jenis)

async function loadKelolaJenis() {
  try {
    const r = await fetch('/api/kinerja/jenis-kinerja', { headers: authHeaders() });
    if (!r.ok) throw new Error('Gagal memuat jenis kinerja');
    const data = await r.json();
    renderKelolJenisSection(data.jenis || data || []);
  } catch (err) {
    const wrap = document.getElementById('kelolJenisSection');
    if (wrap) wrap.innerHTML = `<p style="color:var(--merah);padding:16px">Gagal: ${err.message}</p>`;
  }
}

function renderKelolJenisSection(allJenis) {
  _allJenisList = allJenis;
  const wrap = document.getElementById('kelolJenisSection');
  if (!wrap) return;

  const rows = allJenis.map((j, i) => `
    <tr>
      <td style="text-align:center;color:var(--teks-muted);font-size:.8rem">${i + 1}</td>
      <td style="text-align:center">
        <span style="display:inline-flex;align-items:center;font-size:.78rem;font-weight:700;
          color:${j.warna_teks};background:${j.warna_bg};padding:3px 10px;border-radius:6px">
          ${escHtml(j.label)}
        </span>
      </td>
      <td style="text-align:center;font-size:.78rem;color:var(--teks-muted);font-family:monospace">${escHtml(j.kode)}</td>
      <td style="text-align:center">${j.deskripsi ? `<span style="font-size:.78rem;color:var(--teks-muted)">${escHtml(j.deskripsi)}</span>` : '—'}</td>
      <td style="text-align:center">
        <span style="font-size:.72rem;font-weight:600;padding:2px 8px;border-radius:5px;
          ${j.aktif ? 'background:#d1fae5;color:#065f46' : 'background:#f1f5f9;color:#94a3b8'}">
          ${j.aktif ? 'Aktif' : 'Nonaktif'}
        </span>
      </td>
      <td style="white-space:nowrap">
        <button class="btn btn-ghost btn-sm" data-tip="Edit" onclick="openJenisModal(${j.id})">
          <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>
        </button>
        ${j.is_builtin ? '' : `
        <button class="btn btn-danger btn-sm" data-tip="Hapus" onclick="deleteJenis(${j.id}, '${escHtml(j.label)}')">
          <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path stroke-linecap="round" stroke-linejoin="round" d="M19 6l-1 14H6L5 6"/><path stroke-linecap="round" stroke-linejoin="round" d="M10 11v6m4-6v6"/><path stroke-linecap="round" stroke-linejoin="round" d="M9 6V4h6v2"/></svg>
        </button>`}
      </td>
    </tr>
  `).join('');

  wrap.innerHTML = `
    <div class="page-title" style="display:flex;align-items:center;gap:10px">
      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0;opacity:.85"><path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2"/><rect width="6" height="4" x="9" y="3" rx="1"/><path d="M9 12h6"/><path d="M9 16h4"/></svg>
      Kelola Jenis Kinerja
    </div>
    <div class="page-subtitle">Tambah atau ubah jenis kinerja yang tersedia di checkbox indikator</div>
    <div style="display:flex;justify-content:flex-end;margin-top:14px;margin-bottom:16px">
      <button class="btn btn-primary btn-sm" onclick="openJenisModal()">
        <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5" style="margin-right:5px;vertical-align:-2px"><path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4"/></svg>
        Tambah Jenis
      </button>
    </div>
    <div class="card" style="padding:0;overflow:auto;-webkit-overflow-scrolling:touch">
      <table class="kinerja-table">
        <thead>
          <tr>
            <th style="width:36px">No</th>
            <th>Label</th>
            <th style="width:120px">Kode</th>
            <th>Deskripsi</th>
            <th style="width:80px">Status</th>
            <th style="width:90px">Aksi</th>
          </tr>
        </thead>
        <tbody>${rows || '<tr class="empty-row"><td colspan="6">Belum ada jenis kinerja.</td></tr>'}</tbody>
      </table>
    </div>
  `;
}

function openJenisModal(id) {
  _editingJenisId = id || null;
  const j = id ? _allJenisList.find(x => x.id === id) : null;

  document.getElementById('modalJenisTitle').textContent = id ? 'Edit Jenis Kinerja' : 'Tambah Jenis Kinerja';
  document.getElementById('jenisLabel').value      = j?.label      || '';
  document.getElementById('jenisDeskripsi').value  = j?.deskripsi  || '';
  document.getElementById('jenisWarnaBg').value    = j?.warna_bg   || '#e2e8f0';
  document.getElementById('jenisWarnaTeks').value  = j?.warna_teks || '#334155';
  document.getElementById('jenisUrutan').value     = j?.urutan ?? 99;
  document.getElementById('jenisAktif').checked    = j ? j.aktif : true;

  const kodeRow = document.getElementById('jenisKodeRow');
  const kodeEl  = document.getElementById('jenisKodeDisplay');
  if (j) {
    if (kodeRow) kodeRow.style.display = '';
    if (kodeEl)  kodeEl.textContent = j.kode;
  } else {
    if (kodeRow) kodeRow.style.display = 'none';
  }

  const isBuiltin = j?.is_builtin;
  document.getElementById('jenisLabel').disabled     = !!isBuiltin;
  document.getElementById('jenisWarnaBg').disabled   = false;
  document.getElementById('jenisWarnaTeks').disabled = false;

  _updateJenisPreview();
  openModal('modalJenis');
}

function _updateJenisPreview() {
  const label = document.getElementById('jenisLabel').value || 'Label';
  const bg    = document.getElementById('jenisWarnaBg').value    || '#e2e8f0';
  const teks  = document.getElementById('jenisWarnaTeks').value  || '#334155';
  const prev  = document.getElementById('jenisBadgePreview');
  if (prev) {
    prev.textContent   = label;
    prev.style.background = bg;
    prev.style.color      = teks;
  }
}

async function saveJenis() {
  const label     = document.getElementById('jenisLabel').value.trim();
  const deskripsi = document.getElementById('jenisDeskripsi').value.trim();
  const warna_bg  = document.getElementById('jenisWarnaBg').value;
  const warna_teks= document.getElementById('jenisWarnaTeks').value;
  const urutan    = parseInt(document.getElementById('jenisUrutan').value) || 99;
  const aktif     = document.getElementById('jenisAktif').checked;

  if (!label) { toast('Label wajib diisi', 'error'); return; }

  const id     = _editingJenisId;
  const url    = id ? `/api/kinerja/jenis-kinerja/${id}` : '/api/kinerja/jenis-kinerja';
  const method = id ? 'PUT' : 'POST';
  const body   = { label, deskripsi: deskripsi || null, warna_bg, warna_teks, urutan, aktif };

  try {
    const r = await fetch(url, { method, headers: authHeaders(), body: JSON.stringify(body) });
    const d = await r.json();
    if (!r.ok) { toast(d.error || 'Gagal simpan', 'error'); return; }
    toast(id ? 'Jenis diperbarui' : `Jenis "${d.jenis?.label}" ditambahkan`);
    closeModal('modalJenis');
    loadKelolaJenis();
    loadIndikatorAdmin({ keepFilter: true });
  } catch (err) { toast('Error: ' + err.message, 'error'); }
}

async function deleteJenis(id, label) {
  const okAwal = await showConfirm({
    title:  'Hapus Jenis Kinerja',
    msg:    `Jenis "<b>${escHtml(label)}</b>" akan dihapus permanen.`,
    okText: 'Ya, Hapus', okClass: 'btn-danger', icon: 'trash',
  });
  if (!okAwal) return;

  // Pertama cek ke server apakah masih dipakai
  const r = await fetch(`/api/kinerja/jenis-kinerja/${id}`, { method: 'DELETE', headers: authHeaders() });
  const d = await r.json();

  if (r.status === 409 && d.error === 'JENIS_MASIH_DIPAKAI') {
    // Tampilkan dialog konfirmasi dengan daftar indikator yang terpengaruh
    const daftarInd = d.indikator.slice(0, 5).map(x => `• ${escHtml(x.nama)}`).join('<br>');
    const more = d.count > 5 ? `<br><span style="color:var(--teks-muted)">...dan ${d.count - 5} lainnya</span>` : '';
    const ok = await showConfirm({
      title:  `Jenis "${label}" Masih Dipakai`,
      msg:    `Jenis ini masih digunakan oleh <b>${d.count} indikator</b>:<br><br>
               <div style="max-height:120px;overflow:auto;font-size:.83rem;color:var(--teks-muted)">${daftarInd}${more}</div><br>
               Hapus jenis ini akan menghapus keterangan jenis dari semua indikator tersebut. Lanjutkan?`,
      okText: 'Hapus & Bersihkan', okClass: 'btn-danger', icon: 'trash',
    });
    if (!ok) return;
    // Force delete via query param
    const r2 = await fetch(`/api/kinerja/jenis-kinerja/${id}?force=1`, { method: 'DELETE', headers: authHeaders() });
    if (!r2.ok) { toast('Gagal menghapus jenis', 'error'); return; }
    toast(`Jenis "${label}" dihapus`);
    loadKelolaJenis();
    loadIndikatorAdmin({ keepFilter: true });
    return;
  }
  if (!r.ok) { toast(d.error || 'Gagal menghapus', 'error'); return; }
  toast(`Jenis "${label}" dihapus`);
  loadKelolaJenis();
  loadIndikatorAdmin({ keepFilter: true });
}
// ═══════════════════════════════════════════════════════════════════════════
// State: satu objek per indikator, targets = { [tahun]: {id, target, target_display} }
let _ktIndList    = [];   // [{id, indikator_kinerja, satuan, jenis_monev, jenis_ikk, jenis_spm, targets:{tahun:row}}]
let _ktAllTahun   = [];   // sorted list semua tahun yang ada di DB
let _ktTahunDari  = null; // int | null
let _ktTahunSampai= null; // int | null
let _ktSearch     = '';
let _ktFilterJenis= '';
let _ktPage       = 1;
const _ktPageSize = 15;

async function loadKelolaTarget() {
  const container = document.getElementById('ktCardContainer');
  if (!container) return;
  container.innerHTML = '<div style="text-align:center;padding:32px;color:var(--teks-muted)"><span class="btn-spin" style="width:12px;height:12px;vertical-align:-1px;margin-right:6px"></span>Memuat…</div>';
  try {
    const [ri, rt] = await Promise.all([
      fetch('/api/kinerja/indikator',    { headers: authHeaders() }),
      fetch('/api/kinerja/target?all=1', { headers: authHeaders() }),
    ]);
    const di = await ri.json();
    const dt = await rt.json();
    const indikatorList = di.indikator || [];
    const targetList    = dt.target    || [];

    // Build targetMap per indikator: { indikator_id: { tahun: {id,target,target_display} } }
    const tMap = {};
    for (const t of targetList) {
      if (!tMap[t.indikator_id]) tMap[t.indikator_id] = {};
      tMap[t.indikator_id][t.tahun] = t;
    }

    // Semua tahun yang ada, sorted
    _ktAllTahun = [...new Set(targetList.map(t => t.tahun))].sort((a, b) => a - b);

    // Build _ktIndList
    _ktIndList = indikatorList.map(ind => ({
      id:               ind.id,
      indikator_kinerja: ind.indikator_kinerja,
      satuan:           ind.satuan,
      jenis_monev:      ind.jenis_monev,
      jenis_ikk:        ind.jenis_ikk,
      jenis_spm:        ind.jenis_spm,
      tipe_nilai:       ind.tipe_nilai,
      targets:          tMap[ind.id] || {},
    }));

    // Populate Dari / Sampai dropdowns
    const thisYear = new Date().getFullYear();
    const dariEl   = document.getElementById('ktTahunDari');
    const sampaiEl = document.getElementById('ktTahunSampai');
    if (dariEl && sampaiEl && _ktAllTahun.length) {
      const opts = _ktAllTahun.map(y => `<option value="${y}">${y}</option>`).join('');
      dariEl.innerHTML   = opts;
      sampaiEl.innerHTML = opts;
      // Default: tahun berjalan sampai 4 tahun ke depan (atau semua kalau < 4)
      const defDari   = _ktAllTahun.find(y => y >= thisYear) ?? _ktAllTahun[0];
      const defSampai = _ktAllTahun[_ktAllTahun.length - 1];
      dariEl.value   = defDari;
      sampaiEl.value = defSampai;
    }

    _ktPage        = 1;
    _ktSearch      = '';
    _ktFilterJenis = '';
    _ktTahunDari   = dariEl  ? parseInt(dariEl.value)   || null : null;
    _ktTahunSampai = sampaiEl ? parseInt(sampaiEl.value) || null : null;
    const searchEl = document.getElementById('ktSearch');
    if (searchEl) searchEl.value = '';
    const jenisEl = document.getElementById('ktFilterJenis');
    if (jenisEl) jenisEl.value = '';

    renderKelolaTarget();
  } catch (err) {
    if (container) container.innerHTML = `<div style="padding:24px;color:var(--merah)">Gagal: ${err.message}</div>`;
  }
}

function filterKelolaTarget() {
  _ktSearch      = document.getElementById('ktSearch')?.value?.toLowerCase() || '';
  _ktFilterJenis = document.getElementById('ktFilterJenis')?.value || '';
  const dariEl   = document.getElementById('ktTahunDari');
  const sampaiEl = document.getElementById('ktTahunSampai');
  _ktTahunDari   = dariEl   ? parseInt(dariEl.value)   || null : null;
  _ktTahunSampai = sampaiEl ? parseInt(sampaiEl.value) || null : null;
  // Swap kalau terbalik
  if (_ktTahunDari && _ktTahunSampai && _ktTahunDari > _ktTahunSampai) {
    [_ktTahunDari, _ktTahunSampai] = [_ktTahunSampai, _ktTahunDari];
    if (dariEl)   dariEl.value   = _ktTahunDari;
    if (sampaiEl) sampaiEl.value = _ktTahunSampai;
  }
  _ktPage = 1;
  renderKelolaTarget();
}

function renderKelolaTarget() {
  const container = document.getElementById('ktCardContainer');
  if (!container) return;

  // Tentukan kolom tahun yang ditampilkan
  const visibleTahun = _ktAllTahun.filter(y => {
    if (_ktTahunDari   && y < _ktTahunDari)   return false;
    if (_ktTahunSampai && y > _ktTahunSampai) return false;
    return true;
  });

  // Filter indikator
  let filtered = _ktIndList.filter(ind => {
    if (_ktSearch && !ind.indikator_kinerja.toLowerCase().includes(_ktSearch)) return false;
    if (_ktFilterJenis === 'iku' && !ind.jenis_monev) return false;
    if (_ktFilterJenis === 'ikk' && !ind.jenis_ikk)   return false;
    if (_ktFilterJenis === 'spm' && !ind.jenis_spm)   return false;
    return true;
  });

  if (!filtered.length) {
    container.innerHTML = `<div style="text-align:center;padding:40px;color:var(--teks-muted)">Tidak ada indikator.</div>`;
    renderPagination('ktPagination', 0, 1, _ktPageSize, 'goKtPage');
    return;
  }

  const start = (_ktPage - 1) * _ktPageSize;
  const slice = filtered.slice(start, start + _ktPageSize);

  const jenisBadge = ind => [
    ind.jenis_monev ? `<span style="font-size:.67rem;font-weight:700;color:#1e40af;background:#dbeafe;padding:1px 5px;border-radius:4px">IKU</span>` : '',
    ind.jenis_ikk   ? `<span style="font-size:.67rem;font-weight:700;color:#065f46;background:#d1fae5;padding:1px 5px;border-radius:4px">IKK</span>` : '',
    ind.jenis_spm   ? `<span style="font-size:.67rem;font-weight:700;color:#b45309;background:#fef3c7;padding:1px 5px;border-radius:4px">SPM</span>` : '',
  ].filter(Boolean).join(' ') || '<span style="color:var(--teks-muted);font-size:.75rem">—</span>';

  // Header kolom tahun — ikut style .kinerja-table th (var(--hijau), #fff)
  const COL_W = 110; // px per kolom tahun
  const tahunHeaders = visibleTahun.map(y =>
    `<th style="min-width:${COL_W}px;width:${COL_W}px;text-align:center;border-left:1px solid rgba(255,255,255,.15)">${y}</th>`
  ).join('');
  const addColHeader = `<th style="width:80px;text-align:center;border-left:1px solid rgba(255,255,255,.15)">Aksi</th>`;

  const rows = slice.map((ind, i) => {
    const no = start + i + 1;
    const targetCells = visibleTahun.map(y => {
      const t = ind.targets[y];
      const val = t ? (t.target_display != null ? String(t.target_display) : (t.target != null ? String(t.target) : '')) : '';
      const isPredikat = ind.tipe_nilai === 'predikat';
      // Kasus "kejebak": target_display sudah ada teks (kelihatan terisi di kotak),
      // tapi kolom target numerik yang beneran dipakai untuk hitung capaian masih
      // NULL di database — ini terjadi kalau user ngetik nilai yang PERSIS SAMA
      // dengan nilai default yang sudah tampil, sehingga event onchange browser
      // tidak pernah kepicu dan saveKtTarget()/saveKtTargetNew() tidak pernah
      // terpanggil. Tandai dengan border oranye + ikon ⚠️ yang bisa diklik untuk
      // force-save tanpa harus ngetik ulang manual (trik ganti-ke-nilai-lain-lalu-
      // balik-lagi).
      const isStuck = t && t.target == null && t.target_display != null && String(t.target_display).trim() !== '';
      if (t) {
        return `<td style="text-align:center;border-left:1px solid var(--abu-1)">
          <div style="position:relative;display:inline-block">
          ${isPredikat
            ? `<div class="select-wrap" style="width:82px;display:inline-block">
                 <select data-tid="${t.id}" data-iid="${ind.id}" onchange="saveKtTarget(this)"
                 style="width:82px;text-align:center;padding:4px 6px;border:1.5px solid ${isStuck ? '#f59e0b' : '#e2e8f0'};border-radius:6px;font-size:.82rem;font-family:inherit">${_predikatOptionsHtml(t.target)}</select>
               </div>`
            : `<input type="text" value="${escHtml(val)}"
            data-tid="${t.id}" data-iid="${ind.id}"
            onchange="saveKtTarget(this)"
            onfocus="this.style.borderColor='var(--hijau)'" onblur="this.style.borderColor='${isStuck ? '#f59e0b' : ''}'"
            style="width:82px;text-align:center;padding:4px 6px;border:1.5px solid ${isStuck ? '#f59e0b' : '#e2e8f0'};border-radius:6px;font-size:.82rem;font-family:inherit;transition:border-color .15s">`}
          ${isStuck ? `<span onclick="forceSaveKtTarget(${t.id},${ind.id})" data-tip="Belum tersimpan ke database — klik untuk simpan ulang" style="position:absolute;top:-7px;right:-7px;width:16px;height:16px;background:#f59e0b;color:#fff;border-radius:50%;font-size:.62rem;font-weight:700;display:flex;align-items:center;justify-content:center;cursor:pointer;box-shadow:0 1px 3px rgba(0,0,0,.25)">!</span>` : ''}
          </div>
        </td>`;
      } else {
        return `<td style="text-align:center;border-left:1px solid var(--abu-1)">
          ${isPredikat
            ? `<div class="select-wrap" style="width:82px;display:inline-block">
                 <select data-iid="${ind.id}" data-tahun="${y}" onchange="saveKtTargetNew(this)"
                 style="width:82px;text-align:center;padding:4px 6px;border:1.5px dashed #d1d5db;border-radius:6px;font-size:.82rem;font-family:inherit;color:#94a3b8;background:#f8fafc">${_predikatOptionsHtml(null)}</select>
               </div>`
            : `<input type="text" value="" placeholder="—"
            data-iid="${ind.id}" data-tahun="${y}"
            onchange="saveKtTargetNew(this)"
            onfocus="this.style.borderColor='var(--hijau)';this.placeholder=''" onblur="this.style.borderColor='';this.placeholder='—'"
            style="width:82px;text-align:center;padding:4px 6px;border:1.5px dashed #d1d5db;border-radius:6px;font-size:.82rem;font-family:inherit;color:#94a3b8;background:#f8fafc;transition:border-color .15s">`}
        </td>`;
      }
    }).join('');

    const hasAnyTarget = Object.keys(ind.targets).length > 0;
    const addCell = `<td style="text-align:center;border-left:1px solid var(--abu-1)">
      <div style="display:inline-flex;align-items:center;gap:6px">
        <button class="btn btn-ghost btn-sm" data-tip="Tambah tahun lain" onclick="openKtAddTarget(${ind.id})"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4"/></svg></button>
        <button class="btn btn-danger btn-sm" data-tip="Hapus target" ${!hasAnyTarget ? 'disabled' : ''} onclick="openKtDeleteTarget(${ind.id})"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path stroke-linecap="round" stroke-linejoin="round" d="M19 6l-1 14H6L5 6"/><path stroke-linecap="round" stroke-linejoin="round" d="M10 11v6m4-6v6"/><path stroke-linecap="round" stroke-linejoin="round" d="M9 6V4h6v2"/></svg></button>
      </div>
    </td>`;

    return `<tr>
      <td class="td-sticky-no" style="text-align:center;color:var(--teks-muted);position:sticky;left:0;z-index:3">${no}</td>
      <td class="td-sticky-name" style="position:sticky;left:34px;z-index:3">
        <div style="font-weight:600;line-height:1.3">${escHtml(ind.indikator_kinerja)}</div>
        <div style="margin-top:3px;display:flex;align-items:center;gap:5px">
          <span style="font-size:.74rem;color:var(--teks-muted)">${escHtml(ind.satuan)}</span>
          <span style="color:#e2e8f0">·</span>
          ${jenisBadge(ind)}
        </div>
      </td>
      ${targetCells}
      ${addCell}
    </tr>`;
  }).join('');

  container.innerHTML = `
    <div class="kinerja-table-wrap card" style="padding:0">
      <table class="kinerja-table">
        <thead>
          <tr>
            <th style="width:34px;text-align:center;position:sticky;left:0;z-index:3">No</th>
            <th style="min-width:220px;position:sticky;left:34px;z-index:3">Indikator Kinerja</th>
            ${tahunHeaders}
            ${addColHeader}
          </tr>
        </thead>
        <tbody>${rows || '<tr><td colspan="99" style="text-align:center;padding:24px;color:var(--teks-muted)">Tidak ada data.</td></tr>'}</tbody>
      </table>
    </div>`;

  renderPagination('ktPagination', filtered.length, _ktPage, _ktPageSize, 'goKtPage');
  if (typeof window.initCustomSelects === 'function') window.initCustomSelects();
}

window.goKtPage = (p) => { _ktPage = p; renderKelolaTarget(); };

async function saveKtTarget(input) {
  const tid  = parseInt(input.dataset.tid);
  const iid  = parseInt(input.dataset.iid);
  let val, tNum;
  if (input.tagName === 'SELECT') {
    // Predikat: value select = angka tier, label tampilan diambil dari teks opsi terpilih
    tNum = input.value ? parseInt(input.value) : NaN;
    val  = input.selectedOptions?.[0]?.text || '';
  } else {
    val  = input.value.trim();
    tNum = parseFloat(val.replace(/[^0-9.\-]/g, ''));
  }
  try {
    const r = await fetch(`/api/kinerja/target/${tid}`, {
      method: 'PUT',
      headers: authHeaders(),
      body: JSON.stringify({ target: isNaN(tNum) ? null : tNum, target_display: val || null }),
    });
    if (!r.ok) { toast('Gagal simpan target', 'error'); input.style.borderColor = 'var(--merah)'; return; }
    toast('Target diperbarui');
    input.style.borderColor = '#0d9488';
    setTimeout(() => { input.style.borderColor = ''; }, 1200);
    // Update cache
    const ind = _ktIndList.find(x => x.id === iid);
    if (ind) {
      const t = Object.values(ind.targets).find(x => x.id === tid);
      if (t) { t.target = isNaN(tNum) ? null : tNum; t.target_display = val || null; }
    }
    if (_targetMap[iid]) {
      const t = _targetMap[iid].find(x => x.id === tid);
      if (t) { t.target = isNaN(tNum) ? null : tNum; t.target_display = val || null; }
    }
  } catch (err) { toast('Error: ' + err.message, 'error'); }
}

// Perbaiki target yang "kejebak": target_display sudah tampil ada isinya di kotak,
// tapi kolom target numerik masih NULL di database karena event onchange tidak
// pernah kepicu (user mengetik nilai yang sama persis dengan yang sudah tampil).
// Dipanggil dari ikon ⚠️ di renderKelolaTarget — langsung PUT ulang target_display
// yang ada supaya ke-parse jadi angka, tanpa perlu user ngetik ulang manual.
async function forceSaveKtTarget(tid, iid) {
  const ind = _ktIndList.find(x => x.id === iid);
  if (!ind) { toast('Data indikator tidak ditemukan', 'error'); return; }
  const t = Object.values(ind.targets).find(x => x.id === tid);
  if (!t) { toast('Data target tidak ditemukan', 'error'); return; }
  const val = String(t.target_display || '').trim();
  const tNum = parseFloat(val.replace(/[^0-9.\-]/g, ''));
  try {
    const r = await fetch(`/api/kinerja/target/${tid}`, {
      method: 'PUT',
      headers: authHeaders(),
      body: JSON.stringify({ target: isNaN(tNum) ? null : tNum, target_display: val || null }),
    });
    if (!r.ok) { toast('Gagal simpan ulang target', 'error'); return; }
    toast('Target berhasil disimpan ulang');
    t.target = isNaN(tNum) ? null : tNum;
    if (_targetMap[iid]) {
      const tm = _targetMap[iid].find(x => x.id === tid);
      if (tm) tm.target = isNaN(tNum) ? null : tNum;
    }
    renderKelolaTarget();
  } catch (err) { toast('Error: ' + err.message, 'error'); }
}

async function saveKtTargetNew(input) {
  const iid   = parseInt(input.dataset.iid);
  const tahun = parseInt(input.dataset.tahun);
  let val, tNum;
  if (input.tagName === 'SELECT') {
    if (!input.value) return; // ignore jika belum dipilih
    tNum = parseInt(input.value);
    val  = input.selectedOptions?.[0]?.text || '';
  } else {
    val = input.value.trim();
    if (!val) return; // ignore jika kosong
    tNum = parseFloat(val.replace(/[^0-9.\-]/g, ''));
  }
  try {
    const r = await fetch('/api/kinerja/target', {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ indikator_id: iid, tahun, target: isNaN(tNum) ? null : tNum, target_display: val || null }),
    });
    const d = await r.json();
    if (!r.ok) { toast('Gagal simpan target', 'error'); return; }
    toast('Target disimpan');

    const newRow = { ...d.target, target: d.target?.target != null ? parseFloat(d.target.target) : null };

    // Update cache _ktIndList
    const ind = _ktIndList.find(x => x.id === iid);
    if (ind) ind.targets[tahun] = newRow;

    // Update cache _targetMap
    if (!_targetMap[iid]) _targetMap[iid] = [];
    const existing = _targetMap[iid].find(x => x.tahun === tahun);
    if (existing) Object.assign(existing, newRow);
    else _targetMap[iid].push(newRow);

    // Tambahkan kolom tahun baru jika belum ada
    if (!_ktAllTahun.includes(tahun)) {
      _ktAllTahun = [..._ktAllTahun, tahun].sort((a, b) => a - b);
      const opts = _ktAllTahun.map(y => `<option value="${y}">${y}</option>`).join('');
      const dariEl   = document.getElementById('ktTahunDari');
      const sampaiEl = document.getElementById('ktTahunSampai');
      if (dariEl)   { const v = dariEl.value;   dariEl.innerHTML   = opts; dariEl.value   = v; }
      if (sampaiEl) { const v = sampaiEl.value; sampaiEl.innerHTML = opts; sampaiEl.value = v; }
    }

    renderKelolaTarget();
  } catch (err) { toast('Error: ' + err.message, 'error'); }
}

function openKtDeleteTarget(iid) {
  const ind = _ktIndList.find(r => r.id === iid);
  if (!ind) return;
  const tahunList = Object.keys(ind.targets).map(Number).sort((a, b) => a - b);
  if (!tahunList.length) return;

  document.getElementById('ktDeleteTargetIndId').value = iid;
  const sub = document.getElementById('modalKtDeleteTargetSubtitle');
  if (sub) sub.textContent = ind.indikator_kinerja;

  const list = document.getElementById('ktDeleteTargetList');
  if (list) {
    list.innerHTML = tahunList.map(y => {
      const t = ind.targets[y];
      const val = t.target_display != null ? String(t.target_display) : (t.target != null ? String(t.target) : '—');
      return `<label style="display:flex;align-items:center;justify-content:space-between;gap:10px;padding:8px 10px;border:1.5px solid #e2e8f0;border-radius:6px;cursor:pointer;font-size:.85rem">
        <span style="display:flex;align-items:center;gap:8px">
          <input type="checkbox" class="ktDelYear" value="${t.id}" data-tahun="${y}" style="width:15px;height:15px;accent-color:var(--merah);cursor:pointer">
          <span style="font-weight:600">${y}</span>
        </span>
        <span style="color:var(--teks-muted)">${escHtml(val)}</span>
      </label>`;
    }).join('');
  }
  const all = document.getElementById('ktDeleteTargetAll');
  if (all) all.checked = false;

  openModal('modalKtDeleteTarget');
}

function toggleKtDeleteTargetAll(checked) {
  document.querySelectorAll('.ktDelYear').forEach(cb => { cb.checked = checked; });
}

async function saveKtDeleteTarget() {
  const iid = parseInt(document.getElementById('ktDeleteTargetIndId').value);
  const checked = [...document.querySelectorAll('.ktDelYear:checked')];
  if (!checked.length) { toast('Pilih minimal 1 tahun', 'error'); return; }

  const ind = _ktIndList.find(r => r.id === iid);
  const tahunStr = checked.map(cb => cb.dataset.tahun).join(', ');
  const ok = await showConfirm({
    title: 'Hapus Target',
    msg: `Hapus target tahun <b>${tahunStr}</b> untuk <b>${escHtml(ind?.indikator_kinerja || '')}</b>?`,
    okText: 'Ya, Hapus', icon: 'trash',
  });
  if (!ok) return;

  await Promise.all(checked.map(cb => fetch(`/api/kinerja/target/${cb.value}`, { method: 'DELETE', headers: authHeaders() })));
  toast(`${checked.length} target dihapus`);
  closeModal('modalKtDeleteTarget');
  loadKelolaTarget();
}

function openKtAddTarget(indikatorId) {
  const ind  = _ktIndList.find(r => r.id === indikatorId);
  const nama = ind?.indikator_kinerja || '';
  document.getElementById('ktAddTargetIndId').value      = indikatorId;
  document.getElementById('ktAddTargetTahun').value      = '';
  document.getElementById('ktAddTargetVal').value        = '';
  const sub = document.getElementById('modalKtAddTargetSubtitle');
  if (sub) sub.textContent = nama;
  openModal('modalKtAddTarget');
  setTimeout(() => document.getElementById('ktAddTargetTahun')?.focus(), 100);
}

async function saveKtAddTarget() {
  const iid   = parseInt(document.getElementById('ktAddTargetIndId').value);
  const tahun = parseInt(document.getElementById('ktAddTargetTahun').value);
  const val   = document.getElementById('ktAddTargetVal').value.trim();
  if (!tahun || tahun < 2000 || tahun > 2100) { toast('Tahun tidak valid', 'error'); return; }
  if (!val) { toast('Target wajib diisi', 'error'); return; }
  const tNum = parseFloat(val.replace(/[^0-9.\-]/g, ''));
  try {
    const r = await fetch('/api/kinerja/target', {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ indikator_id: iid, tahun, target: isNaN(tNum) ? null : tNum, target_display: val }),
    });
    const d = await r.json();
    if (!r.ok) { toast(d.error || 'Gagal tambah target', 'error'); return; }
    toast('Target ditambahkan');
    closeModal('modalKtAddTarget');
    loadKelolaTarget();
  } catch (err) { toast('Error: ' + err.message, 'error'); }
}

// Tombol "Kelola Target" di modal indikator → tutup modal, navigasi ke kelola-target, filter by indikator
function _goKelolaTarget() {
  const id = _editingIndikatorId;
  closeModal('modalIndikator');
  navigateTo('kelola-target', 'Kelola Target', loadKelolaTarget);
  if (id) {
    setTimeout(() => {
      const ind = _indikatorList.find(r => r.id === id);
      if (ind) {
        const el = document.getElementById('ktSearch');
        if (el) { el.value = ind.indikator_kinerja; filterKelolaTarget(); }
      }
    }, 400);
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// DATA DUKUNG KINERJA — MULTI-FILE
// ═══════════════════════════════════════════════════════════════════════════
let _dukungState = { indikatorId: null, tw: null, tahun: null, files: [] };

// Tombol Upload (belum ada file) → langsung buka file picker, tanpa modal
function triggerDukungUpload(indikatorId, tw, tahun, source) {
  const dataArr = source === 'ikk' ? _ikkData : source === 'spm' ? _spmData : _kinerjaData;
  const row = dataArr.find(r => r.id === indikatorId);
  // Inisialisasi state dengan file yang sudah ada (jika ada)
  let existingFiles = [];
  if (row?.data_dukung_url) {
    try {
      const p = JSON.parse(row.data_dukung_url);
      existingFiles = Array.isArray(p) ? p.filter(f => f && f.url) : [{ url: row.data_dukung_url, name: row.data_dukung_nama || 'Dokumen' }];
    } catch { existingFiles = [{ url: row.data_dukung_url, name: row.data_dukung_nama || 'Dokumen' }]; }
  }
  _dukungState = { indikatorId, tw, tahun, files: existingFiles, _source: source, _autoSave: true };

  // Reset & trigger file input langsung
  const fi = document.getElementById('dukungFileInput');
  if (!fi) return;
  fi.value = '';
  fi.click();
}

async function openDukungModal(indikatorId, tw, tahun) {
  _dukungState = { indikatorId, tw, tahun, files: [] };

  // Reset UI
  const area = document.getElementById('dukungUploadArea');
  const fi   = document.getElementById('dukungFileInput');
  const pw   = document.getElementById('dukungProgressWrap');
  if (area) { area.classList.remove('drag-over'); area.style.display = ''; }
  if (fi)   fi.value = '';
  if (pw)   pw.style.display = 'none';

  // Load existing files (format JSON array atau single URL lama)
  const row = _kinerjaData.find(r => r.id === indikatorId);
  document.getElementById('dukungIndikatorLabel').textContent = row?.indikator_kinerja || '';
  document.getElementById('dukungTwLabel').textContent = `TW ${['','I','II','III','IV'][tw]} ${tahun}`;

  if (row?.data_dukung_url) {
    try {
      const parsed = JSON.parse(row.data_dukung_url);
      _dukungState.files = Array.isArray(parsed) ? parsed.filter(f => f && f.url) : [];
    } catch {
      _dukungState.files = [{ url: row.data_dukung_url, name: row.data_dukung_nama || 'Dokumen' }];
    }
  }
  _renderDukungList();
  openModal('modalDukung');
}

// Preview-only — selalu buka docPreviewPanel dengan navigasi multi-file
function openDukungPreview(indikatorId, tw, tahun, source) {
  const data = source === 'ikk' ? _ikkData : _kinerjaData;
  const row  = data.find(r => r.id === indikatorId);
  if (!row) return;

  let files = [];
  try {
    const parsed = JSON.parse(row.data_dukung_url);
    files = Array.isArray(parsed) ? parsed.filter(f => f && f.url) : [];
  } catch {
    if (row.data_dukung_url) files = [{ url: row.data_dukung_url, name: row.data_dukung_nama || 'Dokumen' }];
  }
  if (!files.length) return;

  const periodeLabel = `Data Dukung — ${row.indikator_kinerja || ''}`;
  viewDocMulti(files, 0, periodeLabel);
}

function _renderDukungList() {
  const container = document.getElementById('dukungFilePreview');
  if (!container) return;
  if (!_dukungState.files.length) {
    container.innerHTML = '';
    return;
  }
  container.innerHTML = `
    <div class="multi-file-list" style="margin-top:10px">
      ${_dukungState.files.map((f, idx) => {
        const ext = (f.name||'').split('.').pop().toLowerCase();
        const iconColor = { pdf:'#ef4444', doc:'#3b82f6', docx:'#3b82f6', xls:'#22c55e', xlsx:'#22c55e', jpg:'#f59e0b', jpeg:'#f59e0b', png:'#f59e0b' }[ext] || '#64748b';
        const isImg = ['jpg','jpeg','png','gif','webp'].includes(ext);
        return `
          <div class="multi-file-card">
            ${isImg && f.url
              ? `<div class="mfc-thumb" style="background-image:url('${escHtml(f.url)}')"></div>`
              : `<div class="mfc-icon" style="background:${iconColor}"><span>${ext.toUpperCase()}</span></div>`
            }
            <div class="mfc-info">
              <div class="mfc-name" data-tip="${escHtml(f.name)}">${f._loading ? '<em>Mengupload...</em>' : escHtml(f.name)}</div>
            </div>
            <div class="mfc-actions">
              ${f.url && !f._loading ? `<button type="button" class="btn btn-ghost btn-sm" data-tip="Preview" onclick="viewDoc(decodeURIComponent('${encodeURIComponent(f.url)}'), decodeURIComponent('${encodeURIComponent(f.name || "")}'))">
                <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path stroke-linecap="round" stroke-linejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg>
              </button>` : ''}
              ${!f._loading ? `<button type="button" class="btn btn-ghost btn-sm" data-tip="Hapus" onclick="_removeDukungFile(${idx})">
                <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>
              </button>` : ''}
            </div>
          </div>`;
      }).join('')}
    </div>`;
}

function handleDukungFileSelect(e) {
  Array.from(e.target.files || []).forEach(f => _processDukungFile(f));
  e.target.value = '';
}
function handleDukungDragOver(e) { e.preventDefault(); document.getElementById('dukungUploadArea')?.classList.add('drag-over'); }
function handleDukungDragLeave(e) { document.getElementById('dukungUploadArea')?.classList.remove('drag-over'); }
function handleDukungDrop(e) {
  e.preventDefault();
  document.getElementById('dukungUploadArea')?.classList.remove('drag-over');
  Array.from(e.dataTransfer?.files || []).forEach(f => _processDukungFile(f));
}

// Upload file via XHR (bukan fetch) supaya bisa dapat progress asli dari browser
function _uploadFileWithProgress(file, kategori, onProgress) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    const fd  = new FormData();
    fd.append('file', file);
    fd.append('kategori', kategori);
    xhr.open('POST', '/api/upload');
    const auth = authHeaders()['Authorization'];
    if (auth) xhr.setRequestHeader('Authorization', auth);
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable && onProgress) onProgress(Math.round((e.loaded / e.total) * 100));
    };
    xhr.onload = () => {
      let data = {};
      try { data = JSON.parse(xhr.responseText); } catch {}
      if (xhr.status >= 200 && xhr.status < 300) resolve(data);
      else reject(new Error(data.error || 'Gagal upload'));
    };
    xhr.onerror = () => reject(new Error('Gagal upload (koneksi bermasalah)'));
    xhr.send(fd);
  });
}

async function _processDukungFile(file) {
  if (file.size > 2 * 1024 * 1024) { toast(`${file.name}: terlalu besar (maks. 2 MB)`, 'error'); return; }

  const isAutoSave = _dukungState._autoSave;
  const { indikatorId, _source } = _dukungState;

  // Jika mode autoSave (dipanggil dari tombol tabel langsung), tunjukkan status di tombol tabel
  if (isAutoSave) {
    const dataArr = _source === 'ikk' ? _ikkData : _kinerjaData;
    const rowIdx  = dataArr.findIndex(r => r.id === indikatorId);
    // Cari td kolom data dukung — tombol ada di sana
    const tr = document.querySelector(`[data-id="${indikatorId}"]`);
    const dukungTd = tr?.querySelector('td[data-col="dukung"]');
    if (dukungTd) {
      dukungTd.innerHTML = `<button disabled style="display:inline-flex;align-items:center;gap:5px;padding:4px 10px;border-radius:6px;border:none;font-size:.75rem;font-weight:600;font-family:inherit;background:#fef3c7;color:#92400e">
        <svg width="12" height="12" viewBox="0 0 36 36" style="display:inline-block;flex-shrink:0">
          <circle cx="18" cy="18" r="15" fill="none" stroke="#d1e9e4" stroke-width="5"/>
          <circle id="dukungRing_${indikatorId}" cx="18" cy="18" r="15" fill="none" stroke="#0f766e" stroke-width="5"
            stroke-linecap="round" pathLength="100" stroke-dasharray="100" stroke-dashoffset="100"
            transform="rotate(-90 18 18)" style="transition:stroke-dashoffset .15s linear"></circle>
        </svg>
        Mengupload...
      </button>`;
    }
  }

  // Tambah placeholder loading (untuk modal jika terbuka)
  const idx = _dukungState.files.length;
  _dukungState.files.push({ url: null, name: file.name, _loading: true });
  if (!isAutoSave) _renderDukungList();

  const pw = document.getElementById('dukungProgressWrap');
  const pb = document.getElementById('dukungProgressBar');
  if (!isAutoSave && pw) pw.style.display = '';
  if (!isAutoSave && pb) pb.style.width = '0%';

  const onProgress = (pct) => {
    if (isAutoSave) {
      const ring = document.getElementById(`dukungRing_${indikatorId}`);
      if (ring) ring.setAttribute('stroke-dashoffset', String(100 - pct));
    } else if (pb) {
      pb.style.width = pct + '%';
    }
  };

  try {
    const kategori = _source === 'ikk' ? 'kinerja_ikk' : _source === 'spm' ? 'kinerja_spm' : 'kinerja_iku';
    const d = await _uploadFileWithProgress(file, kategori, onProgress);
    if (!isAutoSave && pb) { pb.style.width = '100%'; setTimeout(() => { if (pw) pw.style.display = 'none'; }, 600); }
    _dukungState.files[idx] = { url: d.url, name: d.name || file.name };
    if (!isAutoSave) {
      _renderDukungList();
      toast(`${file.name} berhasil diupload`);
    } else {
      // Auto-save hanya setelah SEMUA file selesai upload (cegah toast berganda)
      const stillLoading = _dukungState.files.some(f => f._loading);
      if (!stillLoading) await _autoSaveDukung();
    }
  } catch (err) {
    if (!isAutoSave && pw) pw.style.display = 'none';
    _dukungState.files.splice(idx, 1);
    if (!isAutoSave) _renderDukungList();
    else {
      // Kembalikan tombol Upload jika gagal
      const dataArr = _source === 'ikk' ? _ikkData : _kinerjaData;
      const source  = _source;
      const { tw, tahun } = _dukungState;
      const rowObj  = dataArr.find(r => r.id === indikatorId);
      const tr = document.querySelector(`[data-id="${indikatorId}"]`);
      const dukungTd = tr?.querySelector('td[data-col="dukung"]');
      if (dukungTd && rowObj) dukungTd.innerHTML = _renderDukungBtn(rowObj, tw, tahun, source, !rowObj.realisasi_id);
    }
    toast(err.message || 'Gagal upload', 'error');
  }
}

// Simpan data dukung ke API tanpa buka modal (dipanggil setelah upload sukses di mode autoSave)
async function _autoSaveDukung() {
  const { indikatorId, tw, tahun, files, _source } = _dukungState;
  const doneFiles = files.filter(f => f.url && !f._loading);
  const urlJson   = doneFiles.length ? JSON.stringify(doneFiles) : null;
  const nameStr   = doneFiles.length ? doneFiles.map(f => f.name).join(', ') : null;
  try {
    const r = await fetch('/api/kinerja/realisasi', {
      method: 'POST', headers: authHeaders(),
      body: JSON.stringify({ indikator_id: indikatorId, bulan: tw, tahun, data_dukung_url: urlJson, data_dukung_nama: nameStr }),
    });
    const d = await r.json();
    if (!r.ok) { toast(d.error || 'Gagal menyimpan', 'error'); return; }
    toast('Data dukung tersimpan');
    // Update cache & re-render baris
    const dataArr = _source === 'ikk' ? _ikkData : _source === 'spm' ? _spmData : _kinerjaData;
    const rowIdx  = dataArr.findIndex(x => x.id === indikatorId);
    if (rowIdx >= 0) {
      dataArr[rowIdx].data_dukung_url  = urlJson;
      dataArr[rowIdx].data_dukung_nama = nameStr;
    }
    // Re-render hanya tombol di baris yang bersangkutan
    const tr = document.querySelector(`[data-id="${indikatorId}"]`);
    const dukungTd = tr?.querySelector('td[data-col="dukung"]');
    if (dukungTd && rowIdx >= 0) {
      dukungTd.innerHTML = _renderDukungBtn(dataArr[rowIdx], tw, tahun, _source, !dataArr[rowIdx].realisasi_id);
    }
    // Refresh status tombol Simpan (data dukung sudah ada)
    if (_source === 'spm') _updateSpmSaveBtnState(indikatorId);
    else if (_source === 'ikk') _updateIkkSaveBtnState(indikatorId);
    else _updateSaveBtnState(indikatorId);
  } catch { toast('Gagal menyimpan data dukung', 'error'); }
}

async function deleteDukungAll(indikatorId, tw, tahun, source) {
  const ok = await showConfirm({
    title:  'Hapus Data Dukung',
    msg:    'Semua file data dukung untuk indikator ini akan dihapus permanen.',
    okText: 'Ya, Hapus', icon: 'trash',
  });
  if (!ok) return;
  try {
    const r = await fetch('/api/kinerja/realisasi', {
      method: 'POST', headers: authHeaders(),
      body: JSON.stringify({
        indikator_id: indikatorId, bulan: tw, tahun,
        data_dukung_url: null, data_dukung_nama: null,
        clear_data_dukung: true,
      }),
    });
    const d = await r.json();
    if (!r.ok) { toast(d.error || 'Gagal menghapus', 'error'); return; }
    toast('Data dukung dihapus');
    const dataArr = source === 'ikk' ? _ikkData : source === 'spm' ? _spmData : _kinerjaData;
    const rowIdx  = dataArr.findIndex(x => x.id === indikatorId);
    if (rowIdx >= 0) {
      dataArr[rowIdx].data_dukung_url  = null;
      dataArr[rowIdx].data_dukung_nama = null;
    }
    // Re-render tombol di baris
    const tr = document.querySelector(`[data-id="${indikatorId}"]`);
    const dukungTd = tr?.querySelector('td[data-col="dukung"]');
    if (dukungTd && rowIdx >= 0) {
      dukungTd.innerHTML = _renderDukungBtn(dataArr[rowIdx], tw, tahun, source, !dataArr[rowIdx].realisasi_id);
      // Tetap unlock tombol Upload karena masih dalam mode edit
      const uploadBtn = dukungTd.querySelector('.dukung-upload-btn');
      if (uploadBtn) {
        uploadBtn.disabled = false;
        uploadBtn.style.cursor = 'pointer';
        uploadBtn.style.opacity = '1';
        uploadBtn.style.borderStyle = 'solid';
        uploadBtn.dataset.tip = 'Upload file data dukung';
        uploadBtn.onclick = () => triggerDukungUpload(indikatorId, tw, tahun, source);
      }
    }
    // Data dukung dihapus → Simpan harus ke-disable kembali
    if (source === 'spm') _updateSpmSaveBtnState(indikatorId);
    else if (source === 'ikk') _updateIkkSaveBtnState(indikatorId);
    else _updateSaveBtnState(indikatorId);
  } catch (err) { toast('Error: ' + err.message, 'error'); }
}

function _removeDukungFile(idx) {
  _dukungState.files.splice(idx, 1);
  _renderDukungList();
  toast('File dihapus');
}

async function saveDukung() {
  const { indikatorId, tw, tahun, files, _source } = _dukungState;
  const doneFiles = files.filter(f => f.url && !f._loading);
  const urlJson  = doneFiles.length ? JSON.stringify(doneFiles) : null;
  const nameStr  = doneFiles.length ? doneFiles.map(f => f.name).join(', ') : null;
  try {
    const r = await fetch('/api/kinerja/realisasi', {
      method: 'POST', headers: authHeaders(),
      body: JSON.stringify({
        indikator_id: indikatorId, bulan: tw, tahun,
        data_dukung_url:  urlJson,
        data_dukung_nama: nameStr,
      }),
    });
    const d = await r.json();
    if (!r.ok) { toast(d.error || 'Gagal menyimpan', 'error'); return; }
    toast('Data dukung tersimpan');
    // Update cache sesuai sumber
    const dataArr = _source === 'ikk' ? _ikkData : _kinerjaData;
    const renderFn = _source === 'ikk'
      ? () => _renderIkkTable(document.getElementById('ikkTableBody'))
      : () => renderKinerjaTable(document.getElementById('kinerjaTableBody'));
    const idx = dataArr.findIndex(x => x.id === indikatorId);
    if (idx >= 0) {
      dataArr[idx].data_dukung_url  = urlJson;
      dataArr[idx].data_dukung_nama = nameStr;
    }
    closeModal('modalDukung');
    renderFn();
  } catch { toast('Gagal menyimpan data dukung', 'error'); }
}
// ═══════════════════════════════════════════════════════════════════════════
// REALISASI IKK — halaman terpisah, logika mirip Monev Kinerja
// ═══════════════════════════════════════════════════════════════════════════
async function initIkkControls() {
  // Pastikan _periodeListTerbuka sudah terisi (bisa jadi initKinerjaControls belum dipanggil)
  if (!_periodeListTerbuka.length) {
    try {
      const r = await fetch('/api/periode/aktif');
      if (r.ok) {
        const d = await r.json();
        _periodeListTerbuka = d.periode || [];
      }
    } catch { _periodeListTerbuka = []; }
  }
  await _ensureUserIndikatorIds();
  // Admin: pastikan _allPeriodeList sudah terisi
  if (_user?.is_admin && !_allPeriodeList.length) {
    try {
      const r = await fetch('/api/periode', { headers: authHeaders() });
      if (r.ok) {
        const d = await r.json();
        _allPeriodeList = d.periode || [];
      }
    } catch {}
  }
  // Set bulan & tahun IKK ke periode pertama yang terbuka (jika ada)
  const _ikkTerbuka = _periodeListTerbuka.filter(p => p.jenis === 'ikk')
    .sort((a, b) => a.tahun !== b.tahun ? a.tahun - b.tahun : a.bulan - b.bulan);
  if (_ikkTerbuka.length) {
    _ikk_tahun = _ikkTerbuka[0].tahun;
    _ikk_bulan = _ikkTerbuka[0].bulan;
  } else if (_user?.is_admin) {
    // Admin: default ke tahun & bulan sekarang
    _ikk_tahun = new Date().getFullYear();
    _ikk_bulan = new Date().getMonth() + 1;
  }
  // Admin: populate tahun selector IKK
  if (_user?.is_admin) {
    _populateTahunSelector('ikkTahunSelect', _ikk_tahun, setIkkTahun);
  } else if (_ikkTerbuka.length) {
    // Non-admin: populate dropdown tahun (hanya tahun-tahun yang punya periode ikk terbuka)
    const _tahunNonAdmin = [...new Set(_ikkTerbuka.map(p => p.tahun))].sort((a, b) => a - b);
    _populateTahunSelector('ikkTahunSelect', _ikk_tahun, setIkkTahun, _tahunNonAdmin);
  }
  _syncIkkBulanButtons();
  _renderIkkPeriodeInfo();
  _renderKinerjaCountdown('ikkCountdownBar', 'ikk');
}

function _syncIkkBulanButtons() {
  const sel = document.getElementById('ikkBulanSelector');
  if (!sel) return;
  // Gunakan daftar semua bulan terbuka (sama seperti Monev) — bukan hanya 1 periode pertama
  const bulanTerbuka = new Set(_periodeListTerbuka.filter(p => p.jenis === 'ikk').map(p => p.bulan));
  const items = [];
  for (let bulan = 1; bulan <= 12; bulan++) {
    const isTampil = _user?.is_admin ? true : bulanTerbuka.has(bulan);
    if (!isTampil) continue;
    const periodeMatch = _user?.is_admin
      ? _allPeriodeList.find(p => p.jenis === 'ikk' && p.bulan === bulan && p.tahun === _ikk_tahun)
      : _periodeListTerbuka.find(p => p.jenis === 'ikk' && p.bulan === bulan);
    const tahunLabel = periodeMatch ? periodeMatch.tahun : _ikk_tahun;
    items.push({ bulan, tahun: tahunLabel });
  }
  items.sort((a, b) => _user?.is_admin ? (a.bulan - b.bulan) : ((a.tahun * 100 + a.bulan) - (b.tahun * 100 + b.bulan)));
  sel.innerHTML = items.map(it =>
    `<option value="${it.bulan}"${it.bulan === _ikk_bulan ? ' selected' : ''}>${BULAN_FULL[it.bulan]}</option>`
  ).join('');
  sel.onchange = () => setIkkBulan(parseInt(sel.value));
  if (typeof syncCustomSelect === 'function') syncCustomSelect('ikkBulanSelector');
}

function _renderIkkPeriodeInfo() {
  const el = document.getElementById('ikkActivePeriodeInfo');
  const iWrapper = document.getElementById('ikkBulanWrapper');
  const tahunWrap = document.getElementById('ikkTahunWrap');

  // Badge teks "Periode input: ..." sudah tidak dipakai — selalu pakai dropdown tahun & bulan
  if (el) el.style.display = 'none';

  if (_user?.is_admin) {
    if (iWrapper) iWrapper.style.display = '';
    if (tahunWrap) tahunWrap.style.display = 'flex';
    return;
  }

  // Non-admin: sembunyikan wrapper kalau tidak ada periode ikk aktif
  const _ikkAktif = _periodeListTerbuka.filter(p => p.jenis === 'ikk');
  if (_ikkAktif.length === 0) {
    if (iWrapper) iWrapper.style.display = 'none';
    return;
  }
  if (iWrapper) iWrapper.style.display = '';
  if (tahunWrap) tahunWrap.style.display = 'flex';
}

function setIkkBulan(bulan) {
  // Guard: non-admin tidak bisa pilih bulan yang tidak ada dalam daftar terbuka
  if (!_user?.is_admin) {
    const bulanTerbuka = new Set(_periodeListTerbuka.filter(p => p.jenis === 'ikk').map(p => p.bulan));
    if (!bulanTerbuka.has(bulan)) return;
    // Sync tahun ke periode IKK yang sesuai bulan yang dipilih
    const periodeMatch = _periodeListTerbuka.find(p => p.jenis === 'ikk' && p.bulan === bulan);
    if (periodeMatch) _ikk_tahun = periodeMatch.tahun;
  }
  _ikk_bulan = bulan;
  _syncIkkBulanButtons();
  _renderIkkPeriodeInfo();
  _renderKinerjaCountdown('ikkCountdownBar', 'ikk');
  loadIkkRekap();
}

async function loadIkkRekap() {
  const tbody = document.getElementById('ikkTableBody');
  if (!tbody) return;

  // Guard: non-admin tidak perlu lihat tabel kalau tidak ada periode aktif sama sekali
  if (!_user?.is_admin && !_periodeListTerbuka.some(p => p.jenis === 'ikk')) {
    // Sembunyikan card tabel, tampilkan pesan di luarnya
    const tableCard = tbody.closest('.card');
    if (tableCard) tableCard.style.display = 'none';
    let msgEl = document.getElementById('ikkNoperiodeMsg');
    if (!msgEl) {
      msgEl = document.createElement('div');
      msgEl.id = 'ikkNoperiodeMsg';
      tableCard ? tableCard.parentNode.insertBefore(msgEl, tableCard) : tbody.parentNode.insertBefore(msgEl, tbody.parentNode.firstChild);
    }
    msgEl.innerHTML = `
      <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;gap:10px;padding:48px 20px;color:#94a3b8;background:#fff;border-radius:12px;border:1.5px solid #f1f5f9">
        <svg xmlns="http://www.w3.org/2000/svg" width="44" height="44" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.2" opacity=".35">
          <path stroke-linecap="round" stroke-linejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/>
        </svg>
        <div style="font-size:.95rem;font-weight:600;color:#64748b">Belum ada periode input yang aktif</div>
        <div style="font-size:.82rem;color:#94a3b8;text-align:center">Input data kinerja belum dapat dilakukan.<br>Hubungi Admin untuk membuka periode pengisian.</div>
      </div>`;
    msgEl.style.display = '';
    return;
  }
  // Kalau ada periode aktif, pastikan card & pesan kembali normal
  const _tableCard = tbody.closest('.card');
  if (_tableCard) _tableCard.style.display = '';
  const _msgEl = document.getElementById('ikkNoperiodeMsg');
  if (_msgEl) _msgEl.style.display = 'none';

  tbody.innerHTML = `<tr class="empty-row"><td colspan="11"><span class="btn-spin" style="width:11px;height:11px;vertical-align:-1px;margin-right:6px"></span>Memuat data...</td></tr>`;
  try {
    const r = await fetch(`/api/kinerja/rekap?bulan=${_ikk_bulan}&tahun=${_ikk_tahun}&jenis=ikk`, { headers: authHeaders() });
    const d = await r.json();
    if (!r.ok) { tbody.innerHTML = `<tr class="empty-row"><td colspan="11">${d.error || 'Gagal memuat'}</td></tr>`; return; }
    let rekap = d.rekap || [];

    // Filter per assigned indikator user (non-admin hanya lihat indikator yg di-assign)
    if (!_user?.is_admin) {
      if (_userIndikatorIds && _userIndikatorIds.size > 0) {
        rekap = rekap.filter(row => _userIndikatorIds.has(Number(row.id)));
      } else {
        rekap = [];
      }
    }
    _ikkData = rekap;
    _ikkPage = 1;
    _renderIkkTable(tbody);
  } catch (err) {
    tbody.innerHTML = `<tr class="empty-row"><td colspan="11">Error: ${err.message}</td></tr>`;
  }
}

// Dipanggil dari input #ikkSearch (sejajar Tahun/Bulan) — filter tabel rekap IKK
function filterIkkTable() {
  _ikkSearch = (document.getElementById('ikkSearch')?.value || '').trim().toLowerCase();
  _ikkPage = 1;
  _renderIkkTable(document.getElementById('ikkTableBody'));
}

function _renderIkkTable(tbody) {
  if (!_ikkData.length) {
    let emptyMsg = 'Belum ada indikator IKK aktif. Admin perlu menambahkan indikator dengan jenis IKK.';
    if (!_user?.is_admin) {
      if (!_userIndikatorIds || _userIndikatorIds.size === 0) {
        emptyMsg = 'Belum ada indikator yang di-assign ke akun Anda. Hubungi Admin untuk mengatur assignment indikator.';
      } else {
        emptyMsg = 'Tidak ada indikator IKK yang di-assign ke akun Anda pada periode ini.';
      }
    }
    tbody.innerHTML = `<tr class="empty-row"><td colspan="11">${emptyMsg}</td></tr>`;
    return;
  }

  const _filtered = _ikkSearch
    ? _ikkData.filter(row =>
        (row.indikator_kinerja || '').toLowerCase().includes(_ikkSearch) ||
        (row.satuan || '').toLowerCase().includes(_ikkSearch) ||
        (row.penanggung_jawab || '').toLowerCase().includes(_ikkSearch)
      )
    : _ikkData;

  if (!_filtered.length) {
    tbody.innerHTML = `<tr class="empty-row"><td colspan="11">Tidak ada indikator yang cocok dengan pencarian "${escHtml(_ikkSearch)}".</td></tr>`;
    renderPagination('ikkPagination', 0, 1, _ikkPageSize, '_goIkkPage');
    return;
  }

  const canEdit = _isIkkInputOpen();
  let html = '';
  let lastGroupId = null;
  let no = 0;

  const _ikkStart = (_ikkPage - 1) * _ikkPageSize;
  const _ikkRows  = _filtered.slice(_ikkStart, _ikkStart + _ikkPageSize);

  _ikkRows.forEach(row => {
    if (row.group_id !== lastGroupId) {
      lastGroupId = row.group_id;
      if (row.group_nama) {
        const meta = JENIS_META[row.group_jenis] || { label: row.group_jenis, cls: 'group-sasaran' };
        html += `
          <tr class="group-header-row ${meta.cls}">
            <td colspan="11">
              <span class="group-jenis-badge">${escHtml(meta.label)}</span>
              ${escHtml(row.group_nama)}
            </td>
          </tr>`;
      }
    }

    no++;
    const capaian = (row.realisasi_id && row.capaian_persen != null) ? Number(row.capaian_persen) : null;
    let badgeClass = 'na', badgeText = '—';
    if (capaian !== null && !isNaN(capaian)) {
      badgeText = capaian.toFixed(1) + '%';
      badgeClass = capaian >= 91 ? 'st' : capaian >= 76 ? 'ti' : capaian >= 66 ? 'sd' : capaian >= 51 ? 'rd' : 'sr';
    }

    const _targetNum = row.target_tahun != null ? Number(row.target_tahun) : null;
    const targetFmt = row.target_display != null
      ? String(row.target_display)
      : (_targetNum != null && !isNaN(_targetNum)
          ? (Number.isInteger(_targetNum) ? String(_targetNum) : _targetNum.toFixed(2))
          : '—');

    // Tentukan row state class untuk IKK
    const ikkRowStateClass = row.realisasi_id ? 'row-state-saved' : 'row-state-default';

    // Reuse dukung button (references _ikkData so we need a separate handler)
    html += `<tr data-id="${row.id}" class="${ikkRowStateClass}">
      <td class="td-sticky-no" style="text-align:center;color:var(--teks-muted);position:sticky;left:0;z-index:3">${no}</td>
      <td class="td-sticky-name" style="position:sticky;left:34px;z-index:3"><div style="font-weight:600;line-height:1.6"><span>${escHtml(row.indikator_kinerja)}</span>${row.bermakna_negatif ? `<span data-tip="Bermakna Negatif" data-tip-variant="danger" style="display:inline-flex;align-items:center;justify-content:center;width:16px;height:16px;background:#fee2e2;border-radius:50%;margin-left:5px;vertical-align:middle;flex-shrink:0"><svg xmlns=\"http://www.w3.org/2000/svg\" width=\"9\" height=\"9\" fill=\"none\" viewBox=\"0 0 24 24\" stroke=\"#991b1b\" stroke-width=\"2.8\"><path stroke-linecap=\"round\" stroke-linejoin=\"round\" d=\"M19 14l-7 7m0 0l-7-7m7 7V3\"/></svg></span>` : `<span data-tip="Bermakna Positif" data-tip-variant="success" style="display:inline-flex;align-items:center;justify-content:center;width:16px;height:16px;background:#d1fae5;border-radius:50%;margin-left:5px;vertical-align:middle;flex-shrink:0"><svg xmlns=\"http://www.w3.org/2000/svg\" width=\"9\" height=\"9\" fill=\"none\" viewBox=\"0 0 24 24\" stroke=\"#065f46\" stroke-width=\"2.8\"><path stroke-linecap=\"round\" stroke-linejoin=\"round\" d=\"M5 10l7-7m0 0l7 7m-7-7v18\"/></svg></span>`}</div><div style="display:flex;align-items:center;gap:6px;margin-top:5px">${row.formula ? `<div class="fx-wrap"><button style="display:inline-flex;align-items:center;justify-content:center;gap:4px;box-sizing:border-box;height:24px;font-size:0.62rem;font-weight:700;line-height:1;color:#0f766e;background:#f0fdfa;border:1px solid #99f6e4;border-radius:4px;padding:0 8px;cursor:pointer;font-family:inherit;appearance:none;-webkit-appearance:none;margin:0" data-tip="Lihat formula perhitungan" data-formula="${escHtml(row.formula)}" onclick="toggleFormulaPanel(this)"><span>Σ</span><span class=\"fx-arrow\" style=\"display:inline-block;transition:transform .2s;font-style:normal\">▾</span></button></div>` : ''}${_tipeBadge(row.tipe_perhitungan)}</div></td>
      <td class="td-satuan">${escHtml(row.satuan || '')}</td>
      <td class="td-target" style="font-weight:700">${targetFmt}</td>
      ${_user?.is_admin ? `<td class="td-bidang" style="color:var(--teks-mid)">${escHtml(row.penanggung_jawab || '—')}</td>` : ''}
      <td class="realisasi-input-cell">
        ${_renderRealisasiInputCell(row, 'ikk_real', 'markIkkDirty')}
      </td>
      <td style="text-align:center">
        <span class="capaian-badge ${badgeClass}" id="ikk_badge_${row.id}">${badgeText}</span>
      </td>
      <td class="textarea-cell" style="text-align:left;vertical-align:top">
        ${_renderPSCell('ikk_fpenghambat', row.id, row.f_penghambat, capaian, canEdit, 'faktor penghambat', 'markIkkDirty', !!row.realisasi_id, false, row.tipe_nilai === 'predikat', row.realisasi == null && !row.realisasi_id)}
      </td>
      <td class="textarea-cell" style="text-align:left;vertical-align:top">
        ${_renderPSCell('ikk_solusi', row.id, row.solusi, capaian, canEdit, 'solusi', 'markIkkDirty', !!row.realisasi_id, false, row.tipe_nilai === 'predikat', row.realisasi == null && !row.realisasi_id)}
      </td>
      <td class="textarea-cell" style="text-align:left;vertical-align:top">
        ${_renderPSCell('ikk_fpendukung', row.id, row.f_pendukung, capaian, canEdit, 'faktor pendukung', 'markIkkDirty', !!row.realisasi_id, true, row.tipe_nilai === 'predikat', row.realisasi == null && !row.realisasi_id)}
      </td>
      <td class="textarea-cell" style="text-align:left;vertical-align:top">
        ${_renderPSCell('ikk_rencana', row.id, row.rencana_tl, capaian, canEdit, 'rencana tindak lanjut', 'markIkkDirty', !!row.realisasi_id, true, row.tipe_nilai === 'predikat', row.realisasi == null && !row.realisasi_id)}
      </td>
      <td style="text-align:center" data-col="dukung">${_renderDukungBtn(row, _ikk_bulan, _ikk_tahun, 'ikk', !row.realisasi_id)}</td>
      <td style="text-align:center;white-space:nowrap">
        ${canEdit ? `
          <button class="btn-edit-row" id="ikk_editbtn_${row.id}" data-tip="Edit baris ini"
            onclick="toggleIkkEditRow(${row.id})"
            style="${row.realisasi_id ? '' : 'display:none'}">
            <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>
            Edit
          </button>
          <button class="save-row-btn" id="ikk_savebtn_${row.id}" disabled
            onclick="saveIkkRealisasiRow(${row.id})" data-tip="Simpan"
            style="font-family:'Plus Jakarta Sans',sans-serif!important;${row.realisasi_id ? 'background:var(--sukses);color:#fff' : ''}">
            ${row.realisasi_id
  ? '<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M15.2 3a2 2 0 0 1 1.4.6l3.8 3.8a2 2 0 0 1 .6 1.4V19a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z"/><path d="M17 21v-7a1 1 0 0 0-1-1H8a1 1 0 0 0-1 1v7"/><path d="M7 3v4a1 1 0 0 0 1 1h7"/></svg> Tersimpan'
  : '<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M15.2 3a2 2 0 0 1 1.4.6l3.8 3.8a2 2 0 0 1 .6 1.4V19a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z"/><path d="M17 21v-7a1 1 0 0 0-1-1H8a1 1 0 0 0-1 1v7"/><path d="M7 3v4a1 1 0 0 0 1 1h7"/></svg> Simpan'}
          </button>
        ` : ''}
        ${_user?.is_admin && row.realisasi_id ? `
          <button class="btn-reset-row" id="ikk_resetbtn_${row.id}" data-tip="Reset data realisasi baris ini (admin)"
            onclick="resetRealisasiRow(${row.id}, 'ikk')">
            <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg>
            Reset
          </button>
        ` : ''}
      </td>
    </tr>`;
  });
  tbody.innerHTML = html;
  if (typeof window.initCustomSelects === 'function') window.initCustomSelects();
  // Toggle header kolom Bidang / Sub Bagian (hanya tampil untuk admin)
  document.querySelectorAll('.col-bidang-ikk').forEach(el => { el.style.display = _user?.is_admin ? '' : 'none'; });
  renderPagination('ikkPagination', _filtered.length, _ikkPage, _ikkPageSize, '_goIkkPage');
  // Sinkronkan status tombol Upload/Simpan begitu tabel selesai di-render, supaya
  // baris yang sudah punya realisasi (mis. dari reload/edit) langsung tampil status
  // tombol yang benar tanpa nunggu user ngetik ulang buat memicu event onchange.
  _ikkRows.forEach(row => { if (document.getElementById(`ikk_savebtn_${row.id}`)) _updateIkkSaveBtnState(row.id); });
}

function markIkkDirty(indikatorId) {
  const btn = document.getElementById(`ikk_savebtn_${indikatorId}`);
  if (btn) {
    btn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M15.2 3a2 2 0 0 1 1.4.6l3.8 3.8a2 2 0 0 1 .6 1.4V19a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z"/><path d="M17 21v-7a1 1 0 0 0-1-1H8a1 1 0 0 0-1 1v7"/><path d="M7 3v4a1 1 0 0 0 1 1h7"/></svg> Simpan`;
  }
  // Preview capaian IKK
  const row = _ikkData.find(r => r.id === indikatorId);
  if (!row) return;
  const realEl = document.getElementById(`ikk_real_${indikatorId}`);
  if (!realEl) return;
  const realisasi = parseFloat(realEl.value);
  const target    = _targetNumForRow(row);
  const badge     = document.getElementById(`ikk_badge_${indikatorId}`);
  if (!badge) return;
  if (isNaN(realisasi) || isNaN(target) || target === 0) {
    badge.textContent = '—'; badge.className = 'capaian-badge na';
    _togglePermasalahanSolusi('ikk', indikatorId, null);
    // Tetap update status tombol Upload/Simpan walau capaian gak bisa dihitung
    // (mis. target=0 = "belum ada sasaran") — tanpa ini tombol Upload macet
    // permanen karena _updateIkkSaveBtnState gak pernah kepanggil.
    _updateIkkSaveBtnState(indikatorId);
    return;
  }
  let capaian = row.bermakna_negatif
    ? ((target - (_hitungRealisasiEfektifPreview(row, realisasi) - target)) / target) * 100
    : (_hitungRealisasiEfektifPreview(row, realisasi) / target) * 100;
  badge.textContent = capaian.toFixed(1) + '%';
  badge.className = 'capaian-badge ' + (capaian >= 91 ? 'st' : capaian >= 76 ? 'ti' : capaian >= 66 ? 'sd' : capaian >= 51 ? 'rd' : 'sr');
  _togglePermasalahanSolusi('ikk', indikatorId, capaian);
  _updateIkkSaveBtnState(indikatorId);
}

function _updateIkkSaveBtnState(indikatorId) {
  const btn = document.getElementById(`ikk_savebtn_${indikatorId}`);
  if (!btn) return;
  const row  = _ikkData.find(r => r.id === indikatorId);
  const fieldArgs = {
    row,
    realVal: document.getElementById(`ikk_real_${indikatorId}`)?.value,
    targetVal: _targetNumForRow(row),
    bermakna_negatif: row?.bermakna_negatif,
    fpenghambatVal: document.getElementById(`ikk_fpenghambat_${indikatorId}`)?.value ?? '',
    solusiVal:      document.getElementById(`ikk_solusi_${indikatorId}`)?.value ?? '',
    fpendukungVal:  document.getElementById(`ikk_fpendukung_${indikatorId}`)?.value ?? '',
    rencanaVal:     document.getElementById(`ikk_rencana_${indikatorId}`)?.value ?? '',
    hasDukung:      !!row?.data_dukung_url,
  };
  const ok = _canSaveRow(fieldArgs);
  const okUpload = _canSaveRow(fieldArgs, false);
  btn.disabled         = !ok;
  btn.style.background = ok ? '#0d9488' : '';
  btn.style.color      = ok ? '#fff'    : '';

  // Enable/disable tombol Upload berdasarkan kondisi field wajib
  const _uploadBtn_ikk = document.querySelector(`tr[data-id="${indikatorId}"] .dukung-upload-btn`);
  if (_uploadBtn_ikk && !_uploadBtn_ikk.classList.contains('dukung-uploaded-btn')) {
    if (okUpload) {
      _uploadBtn_ikk.disabled = false;
      _uploadBtn_ikk.style.cursor = 'pointer';
      _uploadBtn_ikk.style.opacity = '1';
      _uploadBtn_ikk.style.borderStyle = 'dashed';
      _uploadBtn_ikk.style.borderColor = '#6ee7b7';
      _uploadBtn_ikk.style.background = '#ecfdf5';
      _uploadBtn_ikk.style.color = '#065f46';
      _uploadBtn_ikk.dataset.tip = 'Upload data dukung';
      _uploadBtn_ikk.onclick = () => _openDukungFromBtn(_uploadBtn_ikk);
    } else {
      _uploadBtn_ikk.disabled = true;
      _uploadBtn_ikk.style.cursor = 'not-allowed';
      _uploadBtn_ikk.style.opacity = '.65';
      _uploadBtn_ikk.style.borderStyle = 'dashed';
      _uploadBtn_ikk.style.borderColor = '#fca5a5';
      _uploadBtn_ikk.style.background = '#fee2e2';
      _uploadBtn_ikk.style.color = '#991b1b';
      _uploadBtn_ikk.dataset.tip = 'Isi realisasi dan field wajib terlebih dahulu';
      _uploadBtn_ikk.onclick = null;
    }
  }
}

async function saveIkkRealisasiRow(indikatorId) {
  const btn  = document.getElementById(`ikk_savebtn_${indikatorId}`);
  const realEl = document.getElementById(`ikk_real_${indikatorId}`);
  const real = realEl?.value;
  let fpenghambat = document.getElementById(`ikk_fpenghambat_${indikatorId}`)?.value?.trim();
  let solusi      = document.getElementById(`ikk_solusi_${indikatorId}`)?.value?.trim();
  let fpendukung  = document.getElementById(`ikk_fpendukung_${indikatorId}`)?.value?.trim();
  let rencana     = document.getElementById(`ikk_rencana_${indikatorId}`)?.value?.trim();

  const rowIkk = _ikkData.find(r => r.id === indikatorId);
  // Validasi field wajib — hitung capaian dari nilai input vs target
  // (untuk kumulatif/rata_rata, pakai basis efektif lintas bulan, bukan angka bulan ini saja)
  const _realIkk   = parseFloat(real);
  const _targetIkk = _targetNumForRow(rowIkk);
  if (!isNaN(_realIkk) && !isNaN(_targetIkk) && _targetIkk !== 0) {
    const _realIkkEfektif = _hitungRealisasiEfektifPreview(rowIkk, _realIkk);
    const _capaianIkk = rowIkk?.bermakna_negatif
      ? ((_targetIkk - (_realIkkEfektif - _targetIkk)) / _targetIkk) * 100
      : (_realIkkEfektif / _targetIkk) * 100;
    if (_capaianIkk < 100) {
      if (!fpenghambat || _isSymbolOnly(fpenghambat)) { toast('Faktor Penghambat wajib diisi, tidak boleh hanya simbol/tanda baca.', 'error'); return; }
      if (!solusi || _isSymbolOnly(solusi))           { toast('Solusi wajib diisi, tidak boleh hanya simbol/tanda baca.', 'error'); return; }
      fpendukung = ''; rencana = '';
    } else {
      if (!fpendukung || _isSymbolOnly(fpendukung)) { toast('Faktor Pendukung wajib diisi, tidak boleh hanya simbol/tanda baca.', 'error'); return; }
      if (!rencana || _isSymbolOnly(rencana))       { toast('Rencana Tindak Lanjut wajib diisi, tidak boleh hanya simbol/tanda baca.', 'error'); return; }
      fpenghambat = ''; solusi = '';
    }
  }

  if (btn) { btn.disabled = true; btn.innerHTML = `<span class="btn-spin" style="width:11px;height:11px"></span> Menyimpan...`; }
  try {
    const r = await fetch('/api/kinerja/realisasi', {
      method: 'POST', headers: authHeaders(),
      body: JSON.stringify({
        indikator_id: indikatorId, bulan: _ikk_bulan, tahun: _ikk_tahun,
        realisasi: real !== '' ? parseFloat(real) : null,
        realisasi_display: _getRealisasiDisplayFromEl(realEl, rowIkk, real),
        f_penghambat: fpenghambat || null, solusi: solusi || null, f_pendukung: fpendukung || null, rencana_tl: rencana || null,
      }),
    });
    const d = await r.json();
    if (!r.ok) { toast(d.error || 'Gagal menyimpan', 'error'); if (btn) { btn.disabled = false; btn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M15.2 3a2 2 0 0 1 1.4.6l3.8 3.8a2 2 0 0 1 .6 1.4V19a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z"/><path d="M17 21v-7a1 1 0 0 0-1-1H8a1 1 0 0 0-1 1v7"/><path d="M7 3v4a1 1 0 0 0 1 1h7"/></svg> Simpan`; } }
    else {
      toast('Tersimpan');
      // Invalidate cache chart dashboard supaya Pantau Indikator fetch data fresh
      if (typeof _invalidateKinerjaDashboardCache === 'function') _invalidateKinerjaDashboardCache(_ikk_tahun);
      // Kunci kembali input setelah simpan
      ['ikk_real_', 'ikk_fpenghambat_', 'ikk_solusi_', 'ikk_fpendukung_', 'ikk_rencana_'].forEach(prefix => {
        const el = document.getElementById(`${prefix}${indikatorId}`);
        if (el) {
          el.setAttribute('readonly', '');
          if (el.tagName === 'SELECT') el.disabled = true; // predikat: <select> pakai disabled, bukan readonly
          el.style.background = '';
          el.style.cursor = 'not-allowed';
          if (el.classList.contains('ps-rte')) { el.style.resize = 'none'; el.style.display = 'none'; el.contentEditable = 'false'; }
          el.dataset.tip = 'Klik tombol Edit untuk mengisi';
        }
      });
      // Update warna baris → hijau (tersimpan)
      const tr = document.querySelector(`tr[data-id="${indikatorId}"]`);
      if (tr) {
        tr.classList.remove('row-state-default', 'row-state-editing');
        tr.classList.add('row-state-saved');
      }
      const editBtn = document.getElementById(`ikk_editbtn_${indikatorId}`);
      if (editBtn) {
        editBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg> Edit`;
        editBtn.classList.remove('btn-edit-row--active');
        editBtn.dataset.tip = 'Edit baris ini';
        editBtn.style.display = ''; // tampilkan tombol Edit setelah data tersimpan
      }
      if (btn) {
        btn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M15.2 3a2 2 0 0 1 1.4.6l3.8 3.8a2 2 0 0 1 .6 1.4V19a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z"/><path d="M17 21v-7a1 1 0 0 0-1-1H8a1 1 0 0 0-1 1v7"/><path d="M7 3v4a1 1 0 0 0 1 1h7"/></svg> Tersimpan`;
        btn.style.background = 'var(--sukses)';
        btn.style.color = '#fff';
        btn.disabled = true;
      }
      const idx = _ikkData.findIndex(x => x.id === indikatorId);
      if (idx >= 0) {
        _ikkData[idx].realisasi         = d.realisasi?.realisasi ?? null;
        _ikkData[idx].realisasi_display = d.realisasi?.realisasi_display ?? null;
        _ikkData[idx].f_penghambat      = d.realisasi?.f_penghambat ?? null;
        _ikkData[idx].solusi            = d.realisasi?.solusi ?? null;
        _ikkData[idx].f_pendukung       = d.realisasi?.f_pendukung ?? null;
        _ikkData[idx].rencana_tl        = d.realisasi?.rencana_tl ?? null;
        _ikkData[idx].realisasi_id      = d.realisasi?.id ?? _ikkData[idx].realisasi_id;
      }
      // Refresh capaian_persen dari server (hitung ulang kumulatif lintas bulan)
      fetch(`/api/kinerja/rekap?bulan=${_ikk_bulan}&tahun=${_ikk_tahun}&jenis=ikk`, { headers: authHeaders() })
        .then(res => res.ok ? res.json() : null)
        .then(fresh => {
          if (!fresh?.rekap) return;
          for (const freshRow of fresh.rekap) {
            const i = _ikkData.findIndex(x => x.id === freshRow.id);
            if (i >= 0) _ikkData[i].capaian_persen = freshRow.capaian_persen;
            const badge = document.getElementById(`ikk_badge_${freshRow.id}`);
            if (badge) {
              const cap = (freshRow.realisasi_id && freshRow.capaian_persen != null) ? Number(freshRow.capaian_persen) : null;
              if (cap === null || isNaN(cap)) {
                badge.textContent = '—'; badge.className = 'capaian-badge na';
              } else {
                badge.textContent = cap.toFixed(1) + '%';
                badge.className = 'capaian-badge ' + (cap >= 91 ? 'st' : cap >= 76 ? 'ti' : cap >= 66 ? 'sd' : cap >= 51 ? 'rd' : 'sr');
              }
            }
          }
        }).catch(() => {});
      // Kunci kembali tombol data dukung (Upload kembali ke warna default)
      _lockDukungButtons(indikatorId);
      // Tampilkan tombol Reset (admin) tanpa perlu reload
      _ensureResetBtn(indikatorId, 'ikk_', 'ikk');
      const _savedIkk = _ikkData[idx >= 0 ? idx : -1];
      const _rIkk = parseFloat(_savedIkk?.realisasi ?? '');
      const _tIkk = _targetNumForRow(_savedIkk);
      if (!isNaN(_rIkk) && !isNaN(_tIkk) && _tIkk !== 0) {
        const _cIkk = _savedIkk?.bermakna_negatif
          ? ((_tIkk - (_rIkk - _tIkk)) / _tIkk) * 100
          : (_rIkk / _tIkk) * 100;
        _togglePermasalahanSolusi('ikk', indikatorId, _cIkk);
        [['ikk_fpenghambat', _savedIkk?.f_penghambat], ['ikk_solusi', _savedIkk?.solusi],
         ['ikk_fpendukung', _savedIkk?.f_pendukung], ['ikk_rencana', _savedIkk?.rencana_tl]].forEach(([base, val]) => {
          _updatePSReadAfterSave(base, indikatorId, val);
        });
      }
    }
  } catch (err) { toast('Error: ' + err.message, 'error'); if (btn) { btn.disabled = false; btn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M15.2 3a2 2 0 0 1 1.4.6l3.8 3.8a2 2 0 0 1 .6 1.4V19a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z"/><path d="M17 21v-7a1 1 0 0 0-1-1H8a1 1 0 0 0-1 1v7"/><path d="M7 3v4a1 1 0 0 0 1 1h7"/></svg> Simpan`; } }
}

// Data dukung IKK — reuse modal yang sama, tapi update _ikkData
async function openIkkDukungModal(indikatorId, bulan, tahun) {
  _dukungState = { indikatorId, tw: bulan, tahun, files: [], _source: 'ikk' };
  const area = document.getElementById('dukungUploadArea');
  const fi   = document.getElementById('dukungFileInput');
  const pw   = document.getElementById('dukungProgressWrap');
  if (area) { area.classList.remove('drag-over'); area.style.display = ''; }
  if (fi)   fi.value = '';
  if (pw)   pw.style.display = 'none';

  const row = _ikkData.find(r => r.id === indikatorId);
  document.getElementById('dukungIndikatorLabel').textContent = row?.indikator_kinerja || '';
  document.getElementById('dukungTwLabel').textContent = `${BULAN_FULL[bulan] || bulan} ${tahun} — IKK`;

  if (row?.data_dukung_url) {
    try {
      const parsed = JSON.parse(row.data_dukung_url);
      _dukungState.files = Array.isArray(parsed) ? parsed.filter(f => f && f.url) : [];
    } catch {
      _dukungState.files = [{ url: row.data_dukung_url, name: row.data_dukung_nama || 'Dokumen' }];
    }
  }
  _renderDukungList();
  openModal('modalDukung');
}


function escHtml(str) {
  if (!str) return '';
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// Aman dipakai di dalam onclick='...(${_jsAttr(val)})' — JSON.stringify menghasilkan
// tanda kutip ganda, jadi attribute HTML-nya WAJIB pakai kutip tunggal (onclick='...').
function _jsAttr(val) {
  return JSON.stringify(val).replace(/'/g, '&#39;');
}

// ── Permasalahan & Solusi: hanya tampil jika capaian < 100% ───────────────
// Jika capaian >= 100% (target tercapai), editor disembunyikan & diganti
// catatan "Target tercapai". Jika capaian null/NaN (belum diisi), editor tetap tampil.
// Auto-resize textarea mengikuti konten (tanpa scroll) — dipertahankan untuk
// kompatibilitas, tapi .ps-rte (div contenteditable) sudah tumbuh natural jadi no-op.
function _autoResizeTA(el) {
  if (!el || el.tagName !== 'TEXTAREA') return;
  el.style.height = 'auto';
  el.style.height = el.scrollHeight + 'px';
}
function _autoResizeAllTA(tr) {
  if (!tr) return;
  tr.querySelectorAll('.textarea-cell textarea').forEach(_autoResizeTA);
}

// ══════════════════════════════════════════════════════════════════════════
// Rich text (markdown-lite) untuk Faktor Penghambat / Solusi / Faktor
// Pendukung / Rencana Tindak Lanjut — dipakai di modul IKU, IKK, dan SPM.
// Disimpan di DB sbg teks markdown-lite biasa (kompatibel dgn data lama):
//   **tebal**   _miring_   "- item" (daftar simbol)   "1. item" (bernomor)
// Toolbar melayang muncul saat teks di-select (mirip Notion), tombol:
// Bold, Italic, Daftar simbol, Daftar bernomor.
// ══════════════════════════════════════════════════════════════════════════

function _escMd2Html(str) {
  return String(str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// markdown-lite -> HTML aman (dipakai utk isi awal .ps-rte & tampilan ps-read)
function _mdToHtml(md) {
  if (!md) return '';
  return String(md).split('\n').map(line => {
    let h = _escMd2Html(line);
    h = h.replace(/\*\*([^\n]+?)\*\*/g, '<strong>$1</strong>');
    h = h.replace(/(^|[^_])_([^_\n]+?)_(?!_)/g, '$1<em>$2</em>');
    return h;
  }).join('<br>');
}

// Sama seperti _mdToHtml, tapi khusus buat tampilan baca (ps-read-full / "Selengkapnya").
// Baris "1. " / "- " yang berurutan dikelompokkan jadi <ol>/<ul> beneran (bukan cuma
// teks angka + <br>) supaya saat teks panjang wrap ke baris berikutnya, lekukannya rapi
// (hanging indent) — bukan nempel ke margin kiri kayak _mdToHtml biasa.
function _mdToHtmlDisplay(md) {
  if (!md) return '';
  const inlineFmt = (line) => {
    let h = _escMd2Html(line);
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
      if (listType !== 'ol') { closeList(); html += '<ol class="md-list">'; listType = 'ol'; }
      html += `<li>${inlineFmt(numM[2])}</li>`;
    } else if (bulM) {
      if (listType !== 'ul') { closeList(); html += '<ul class="md-list">'; listType = 'ul'; }
      html += `<li>${inlineFmt(bulM[1])}</li>`;
    } else {
      closeList();
      const h = inlineFmt(line);
      html += `<div class="md-line">${h || '<br>'}</div>`;
    }
  });
  closeList();
  return html;
}

// Markdown-lite -> HTML khusus buat isi .ps-rte (editor contenteditable).
// Setiap baris dibungkus <div class="rte-line"> sendiri-sendiri (bukan cuma
// dipisah <br> kayak _mdToHtml) supaya baris "1. " / "- " bisa dikasih CSS
// hanging-indent (.rte-line--list) — pas teksnya panjang dan wrap ke baris
// berikutnya, lekukannya nyambung rapi di bawah kata pertama, bukan nempel
// ke margin kiri.
function _mdToRteHtml(md) {
  if (!md) return '';
  const inlineFmt = (line) => {
    let h = _escMd2Html(line);
    h = h.replace(/\*\*([^\n]+?)\*\*/g, '<strong>$1</strong>');
    h = h.replace(/(^|[^_])_([^_\n]+?)_(?!_)/g, '$1<em>$2</em>');
    return h;
  };
  // Marker ("1."/"-") dibungkus <span class="rte-marker"> terpisah dari sisa
  // teks (bukan cuma nempel jadi bagian dari teks baris kayak sebelumnya)
  // supaya bisa di-render rata kanan dalam kotak lebar tetap lewat CSS --
  // titik di belakang nomor 1 digit ("1.") & 2 digit ("10.") jadi sejajar,
  // gak geser kayak dulu (marker cuma teks polos, lebarnya ikut jumlah digit).
  return String(md).split('\n').map(line => {
    const m = line.match(/^(\d+\.|-)[ \u00A0](.*)$/);
    if (m) {
      const marker = _escMd2Html(m[1]);
      const rest = inlineFmt(m[2]);
      const ulCls = m[1] === '-' ? ' rte-marker--ul' : '';
      return `<div class="rte-line rte-line--list"><span class="rte-marker${ulCls}">${marker}</span>\u00A0${rest || '<br>'}</div>`;
    }
    const h = inlineFmt(line);
    return `<div class="rte-line">${h || '<br>'}</div>`;
  }).join('');
}

// HTML (isi .ps-rte) -> markdown-lite (dipakai saat kode lain baca `.value`)
function _htmlToMd(el) {
  function walk(node) {
    let out = '';
    node.childNodes.forEach(n => {
      if (n.nodeType === 3) { out += n.nodeValue; return; }
      if (n.nodeType !== 1) return;
      const tag = n.tagName;
      if (tag === 'BR') { out += '\n'; return; }
      if (tag === 'STRONG' || tag === 'B') { out += '**' + walk(n) + '**'; return; }
      if (tag === 'EM' || tag === 'I')     { out += '_' + walk(n) + '_'; return; }
      if (tag === 'DIV' || tag === 'P') {
        // Baris kosong dirender sebagai <div><br></div> (placeholder biar
        // tingginya tetap kelihatan) — jangan sampai <br> placeholder ini
        // ikut ditambahin sebagai baris kosong ekstra ("\n" dobel).
        const isEmptyLine = n.childNodes.length === 1 && n.firstChild.nodeType === 1 && n.firstChild.tagName === 'BR';
        out += (out ? '\n' : '') + (isEmptyLine ? '' : walk(n));
        return;
      }
      out += walk(n);
    });
    return out;
  }
  return walk(el);
}

// Textarea lama & elemen lain di seluruh app baca/tulis `.value` (mis.
// document.getElementById('solusi_1').value). Daripada ubah ratusan
// pemanggilan itu satu-satu, kita definisikan getter/setter `value` di atas
// div contenteditable supaya perilakunya transparan sama seperti textarea.
function _installRteValueShim(el) {
  if (!el || el._rteShimmed) return;
  el._rteShimmed = true;
  Object.defineProperty(el, 'value', {
    get() { return _htmlToMd(el); },
    set(md) { el.innerHTML = _mdToRteHtml(md || ''); },
    configurable: true,
  });
}
// Pasang shim otomatis begitu ada .ps-rte baru masuk ke DOM (row di-render ulang, dst).
(function _watchRteElements() {
  if (typeof document === 'undefined' || !document.body) return;
  document.querySelectorAll('.ps-rte').forEach(_installRteValueShim);
  new MutationObserver(muts => {
    muts.forEach(m => m.addedNodes.forEach(node => {
      if (node.nodeType !== 1) return;
      if (node.classList?.contains('ps-rte')) _installRteValueShim(node);
      node.querySelectorAll?.('.ps-rte').forEach(_installRteValueShim);
    }));
  }).observe(document.body, { childList: true, subtree: true });
})();

// Enter di dalam .ps-rte selalu jadi <br> (bukan <div> baru bawaan browser)
// supaya struktur DOM tetap flat & gampang dikonversi ke markdown-lite.
// Kalau baris saat ini list ("- " / "1. "), Enter otomatis lanjut ke marker
// berikutnya (mirip Notion/editor lain) — Enter di baris list yang kosong
// (cuma marker doang, belum diisi apa2) keluar dari mode list.
document.addEventListener('keydown', function(e) {
  const el = e.target;
  if (e.key !== 'Enter' || !el?.classList?.contains?.('ps-rte')) return;
  e.preventDefault();
  const sel = window.getSelection();
  if (!sel.rangeCount) return;
  const range = sel.getRangeAt(0);

  // .ps-rte yang baru mulai diketik dari kosong (belum pernah lewat
  // _mdToRteHtml) belum punya wrapper <div class="rte-line"> sama sekali --
  // bungkus dulu isinya jadi satu baris, sama kayak _rteToggleListPrefix,
  // supaya closest('.rte-line') di bawah gak gagal & Enter gak ke-block.
  if (!el.querySelector(':scope > .rte-line')) {
    const wrap = document.createElement('div');
    wrap.className = 'rte-line';
    while (el.firstChild) wrap.appendChild(el.firstChild);
    el.appendChild(wrap);
    range.selectNodeContents(wrap);
    range.collapse(false);
  }

  let lineDiv = range.startContainer.nodeType === 1 ? range.startContainer : range.startContainer.parentElement;
  lineDiv = lineDiv ? lineDiv.closest('.rte-line') : null;
  if (!lineDiv || !el.contains(lineDiv)) return;

  const lineText  = lineDiv.textContent || '';
  const bulletM   = lineText.match(/^-\s/);
  const numM      = lineText.match(/^(\d+)\.\s/);
  const markerLen = bulletM ? bulletM[0].length : (numM ? numM[0].length : 0);
  const lineEmpty = markerLen > 0 && lineText.slice(markerLen).trim().length === 0;

  if (markerLen > 0 && lineEmpty) {
    // Baris list kosong -> keluar dari list, hapus marker & class-nya, jangan lanjut
    lineDiv.textContent = '';
    lineDiv.appendChild(document.createElement('br'));
    lineDiv.classList.remove('rte-line--list');
    const r = document.createRange();
    r.setStart(lineDiv, 0);
    r.collapse(true);
    sel.removeAllRanges();
    sel.addRange(r);
    el.dispatchEvent(new Event('input', { bubbles: true }));
    return;
  }

  // Pisah baris di posisi caret: sisa sebelum caret tetap di lineDiv,
  // sisa sesudah caret pindah ke <div class="rte-line"> baru.
  const afterRange = range.cloneRange();
  afterRange.setEndAfter(lineDiv.lastChild || lineDiv);
  const afterFrag = afterRange.extractContents();

  if (!lineDiv.childNodes.length) lineDiv.appendChild(document.createElement('br'));

  const newLine = document.createElement('div');
  newLine.className = 'rte-line';
  newLine.appendChild(afterFrag);
  lineDiv.after(newLine);

  const newRange = document.createRange();
  if (markerLen > 0) {
    // Marker dibungkus <span class="rte-marker"> (rata kanan lewat CSS) biar
    // titik di belakang nomor sejajar walau digitnya beda jumlah (1 vs 2).
    const nextMarkerText = bulletM ? '-' : `${parseInt(numM[1], 10) + 1}.`;
    const sep = _rteInsertMarker(newLine, nextMarkerText);
    newRange.setStart(sep, sep.length);
  } else {
    newLine.classList.remove('rte-line--list');
    // Baris baru non-list yang masih kosong butuh <br> placeholder biar
    // div-nya gak collapse (tingginya ilang) selama belum ada teks diketik.
    // Kalau markerLen>0, marker text node sendiri udah jadi konten -> gak
    // perlu <br>, soalnya <br> nyempil abis marker bisa ke-translate jadi
    // baris baru kosong beneran pas HTML<->markdown round-trip (bug lama).
    if (!newLine.childNodes.length) newLine.appendChild(document.createElement('br'));
    newRange.setStart(newLine, 0);
  }
  newRange.collapse(true);
  sel.removeAllRanges();
  sel.addRange(newRange);
  el.dispatchEvent(new Event('input', { bubbles: true }));
});

// Ketik "1. "/"- " langsung di awal baris (bukan lewat Enter/toolbar) --
// sebelumnya cuma teks polos nempel, gak ke-convert jadi <span
// class="rte-marker"> sama sekali, jadi "1."-nya gak sejajar (gak rata
// kanan) sama nomor baris berikutnya yang dibuat via Enter. Begitu user
// baru aja ngetik spasi setelah marker ("1."/"-"), convert baris itu di
// tempat, sama persis strukturnya kayak yang dibuat _rteInsertMarker
// (span marker + NBSP pemisah + sisa teks).
document.addEventListener('input', function(e) {
  const el = e.target;
  if (!el?.classList?.contains?.('ps-rte')) return;
  const sel = window.getSelection();
  if (!sel || !sel.rangeCount || !sel.isCollapsed) return;
  const range = sel.getRangeAt(0);
  const node = range.startContainer;

  // .ps-rte yang baru mulai diketik dari kosong (baris pertama) belum
  // punya wrapper <div class="rte-line"> sama sekali -- bungkus dulu sama
  // kayak fix yang sama di handler Enter/paste, biar closest('.rte-line')
  // di bawah ketemu. Tanpa ini baris pertama gak pernah ke-convert (cuma
  // baris ke-2 dst hasil Enter yang kepasang benar).
  if (!el.querySelector(':scope > .rte-line')) {
    const wrap = document.createElement('div');
    wrap.className = 'rte-line';
    while (el.firstChild) wrap.appendChild(el.firstChild);
    el.appendChild(wrap);
  }

  const lineDiv = (node.nodeType === 1 ? node : node.parentElement)?.closest('.rte-line');
  if (!lineDiv || !el.contains(lineDiv) || _rteMarkerSpan(lineDiv)) return;
  const first = lineDiv.firstChild;
  if (!first || first.nodeType !== 3) return;
  const m = first.nodeValue.match(/^(\d+\.|-)[ \u00A0]/);
  // Convert cuma pas caret persis di akhir marker+spasi yang baru diketik
  // (bukan pas masih ngetik digit nomornya, mis. "1" sebelum titik/spasi).
  if (!m || range.startContainer !== first || range.startOffset !== m[0].length) return;

  const span = document.createElement('span');
  span.className = 'rte-marker' + (m[1] === '-' ? ' rte-marker--ul' : '');
  span.textContent = m[1];
  first.nodeValue = first.nodeValue.slice(m[0].length);
  lineDiv.insertBefore(span, first);
  lineDiv.insertBefore(document.createTextNode('\u00A0'), first);
  lineDiv.classList.add('rte-line--list');

  const newRange = document.createRange();
  newRange.setStart(first, 0);
  newRange.collapse(true);
  sel.removeAllRanges();
  sel.addRange(newRange);
});

// Paste di dalam .ps-rte dipaksa jadi plain text (baris dipertahankan via <br>).
// Tanpa ini, paste dari Word/Google Docs bawa HTML asli (list, underline, dst)
// yang gak dikenal skema markdown-lite kita -> struktur rusak begitu disimpan.
document.addEventListener('paste', function(e) {
  const el = e.target;
  if (!el?.classList?.contains?.('ps-rte')) return;
  e.preventDefault();
  const text = (e.clipboardData || window.clipboardData)?.getData('text/plain') || '';
  const sel = window.getSelection();
  if (!sel.rangeCount) return;
  const range = sel.getRangeAt(0);
  const lines = text.split(/\r\n|\r|\n/);

  // Sama kayak fix di handler Enter: kalau .ps-rte masih polos (belum
  // pernah lewat _mdToRteHtml, belum ada wrapper .rte-line sama sekali)
  // tapi udah ada teks di dalamnya, bungkus dulu isinya jadi satu baris --
  // jangan bikin div baru kosong yang malah misahin teks lama dari baris.
  if (!el.querySelector(':scope > .rte-line')) {
    const wrap = document.createElement('div');
    wrap.className = 'rte-line';
    const hadContent = !!el.firstChild;
    while (el.firstChild) wrap.appendChild(el.firstChild);
    el.appendChild(wrap);
    if (hadContent) { range.selectNodeContents(wrap); range.collapse(false); }
  }

  let lineDiv = range.startContainer.nodeType === 1 ? range.startContainer : range.startContainer.parentElement;
  lineDiv = lineDiv ? lineDiv.closest('.rte-line') : null;
  if (!lineDiv || !el.contains(lineDiv)) {
    // Gak ketemu baris (elemen kosong) -> buat baris pertama dulu.
    lineDiv = document.createElement('div');
    lineDiv.className = 'rte-line';
    el.appendChild(lineDiv);
    range.selectNodeContents(lineDiv);
    range.collapse(true);
  }

  if (lines.length === 1) {
    // Paste satu baris: cukup sisipkan teks di posisi caret, gak perlu baris baru.
    range.deleteContents();
    const tn = document.createTextNode(lines[0]);
    range.insertNode(tn);
    range.setStartAfter(tn);
    range.collapse(true);
    sel.removeAllRanges();
    sel.addRange(range);
    el.dispatchEvent(new Event('input', { bubbles: true }));
    return;
  }

  // Paste banyak baris: sisa teks setelah caret di baris ini dipindah ke
  // baris terakhir hasil paste, baris tengah jadi <div class="rte-line"> baru.
  const afterRange = range.cloneRange();
  afterRange.setEndAfter(lineDiv.lastChild || lineDiv);
  const afterFrag = afterRange.extractContents();
  if (!lineDiv.childNodes.length) lineDiv.appendChild(document.createElement('br'));

  range.deleteContents();
  const firstTn = document.createTextNode(lines[0]);
  range.insertNode(firstTn);
  // Baris pertama (lineDiv) isinya gabungan teks lama + lines[0] yang baru
  // dipaste -> cek ulang seluruh teksnya buat nentuin format list, bukan
  // cuma lines[0] doang (yang bisa aja cuma potongan tengah kalimat).
  lineDiv.classList.toggle('rte-line--list', /^(\d+\.\s|-\s)/.test(lineDiv.textContent || ''));
  // Bungkus markernya jadi <span class="rte-marker"> (rata kanan lewat CSS)
  // biar list yang di-paste align-nya sama kayak list yang diketik langsung.
  _rteWrapMarker(lineDiv);

  let anchor = lineDiv;
  let lastNewLine = null;
  for (let i = 1; i < lines.length; i++) {
    const div = document.createElement('div');
    div.className = 'rte-line';
    // Deteksi format list ("1. "/"- ") per baris hasil paste, biar
    // hanging-indent (.rte-line--list) tetap kepasang -- tanpa ini, list
    // panjang yang di-paste bakal keliatan patah/gak rata pas teksnya wrap.
    if (/^(\d+\.\s|-\s)/.test(lines[i])) div.classList.add('rte-line--list');
    div.appendChild(document.createTextNode(lines[i]));
    if (i === lines.length - 1) div.appendChild(afterFrag);
    if (!div.childNodes.length) div.appendChild(document.createElement('br'));
    _rteWrapMarker(div);
    anchor.after(div);
    anchor = div;
    lastNewLine = div;
  }

  const newRange = document.createRange();
  newRange.setStart(lastNewLine, Math.min(1, lastNewLine.childNodes.length));
  newRange.collapse(true);
  sel.removeAllRanges();
  sel.addRange(newRange);
  el.dispatchEvent(new Event('input', { bubbles: true }));
});

// ── Floating toolbar ────────────────────────────────────────────────────
let _rteToolbarEl = null, _rteActiveEl = null;
function _ensureRteToolbar() {
  if (_rteToolbarEl) return _rteToolbarEl;
  const tb = document.createElement('div');
  tb.className = 'rte-toolbar';
  tb.innerHTML = `
    <button type="button" data-cmd="bold" data-tip="Tebal"><svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round"><path d="M14 12a4 4 0 0 0 0-8H6v8"/><path d="M15 20a4 4 0 0 0 0-8H6v8Z"/></svg></button>
    <button type="button" data-cmd="italic" data-tip="Miring"><svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round"><line x1="19" x2="10" y1="4" y2="4"/><line x1="14" x2="5" y1="20" y2="20"/><line x1="15" x2="9" y1="4" y2="20"/></svg></button>
    <span class="rte-sep"></span>
    <button type="button" data-cmd="ul" data-tip="Daftar simbol"><svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12h.01"/><path d="M3 18h.01"/><path d="M3 6h.01"/><path d="M8 12h13"/><path d="M8 18h13"/><path d="M8 6h13"/></svg></button>
    <button type="button" data-cmd="ol" data-tip="Daftar bernomor"><svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round"><path d="M10 12h11"/><path d="M10 18h11"/><path d="M10 6h11"/><path d="M4 10h2"/><path d="M4 6h1v4"/><path d="M6 18H4c0-1 2-2 2-3s-1-1.5-2-1"/></svg></button>
  `;
  tb.addEventListener('mousedown', e => e.preventDefault()); // jangan hilangkan selection user
  tb.addEventListener('click', e => {
    const btn = e.target.closest('button[data-cmd]');
    if (!btn) return;
    _rteApplyCmd(btn.dataset.cmd);
  });
  document.body.appendChild(tb);
  _rteToolbarEl = tb;
  return tb;
}
function _hideRteToolbar() { if (_rteToolbarEl) _rteToolbarEl.style.display = 'none'; }

document.addEventListener('selectionchange', () => {
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0 || sel.isCollapsed) { _hideRteToolbar(); return; }
  const anchor = sel.anchorNode;
  const node = anchor && (anchor.nodeType === 1 ? anchor : anchor.parentElement);
  const el = node ? node.closest('.ps-rte[contenteditable="true"]') : null;
  if (!el) { _hideRteToolbar(); return; }
  _rteActiveEl = el;
  const range = sel.getRangeAt(0);
  const rect = range.getBoundingClientRect();
  if (!rect || (rect.width === 0 && rect.height === 0)) { _hideRteToolbar(); return; }
  const tb = _ensureRteToolbar();
  tb.style.display = 'flex';
  const top  = rect.top + window.scrollY - tb.offsetHeight - 8;
  let left   = rect.left + window.scrollX + rect.width / 2 - tb.offsetWidth / 2;
  left = Math.max(8, Math.min(left, window.innerWidth - tb.offsetWidth - 8));
  tb.style.top  = `${Math.max(8, top)}px`;
  tb.style.left = `${left}px`;
  _rteUpdateToolbarState(tb);
});

// Tandai tombol Tebal/Miring/Daftar simbol/Daftar bernomor aktif (state
// "pressed") kalau teks/baris yang lagi di-select emang udah dalam format
// itu -- sebelumnya cuma Tebal/Miring yang kelihatan aktif, Daftar simbol &
// Daftar bernomor gak pernah nyala walau cursor lagi di baris list, jadi
// toolbar-nya gak mencerminkan format yang lagi aktif secara konsisten.
// Tebal/Miring pakai queryCommandState (native, baca computed style
// font-weight/font-style di selection) -- tetap akurat walau STRONG/EM-nya
// dipasang manual (bukan execCommand), karena tag itu sendiri emang bikin
// computed style-nya bold/italic. Daftar simbol/bernomor dicek dari marker
// baris tempat cursor/selection berada (sama kayak _rteToggleListPrefix).
function _rteUpdateToolbarState(tb) {
  let boldOn = false, italicOn = false;
  try { boldOn = document.queryCommandState('bold'); } catch { /* no-op */ }
  try { italicOn = document.queryCommandState('italic'); } catch { /* no-op */ }
  tb.querySelector('button[data-cmd="bold"]')?.classList.toggle('active', boldOn);
  tb.querySelector('button[data-cmd="italic"]')?.classList.toggle('active', italicOn);

  let ulOn = false, olOn = false;
  const sel = window.getSelection();
  if (sel && sel.rangeCount) {
    const range = sel.getRangeAt(0);
    const node = range.startContainer.nodeType === 1 ? range.startContainer : range.startContainer.parentElement;
    const lineDiv = node ? node.closest('.rte-line') : null;
    const marker = lineDiv ? _rteMarkerSpan(lineDiv) : null;
    const markerTxt = marker ? marker.textContent : '';
    ulOn = markerTxt === '-';
    olOn = /^\d+\.$/.test(markerTxt);
  }
  tb.querySelector('button[data-cmd="ul"]')?.classList.toggle('active', ulOn);
  tb.querySelector('button[data-cmd="ol"]')?.classList.toggle('active', olOn);
}

function _rteApplyCmd(cmd) {
  const el = _rteActiveEl;
  if (!el) return;
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0) return;
  const range = sel.getRangeAt(0);
  if (cmd === 'bold')       _rteToggleInline(range, 'STRONG');
  else if (cmd === 'italic') _rteToggleInline(range, 'EM');
  else if (cmd === 'ul' || cmd === 'ol') _rteToggleListPrefix(el, range, cmd);
  el.dispatchEvent(new Event('input', { bubbles: true }));
  if (_rteToolbarEl) _rteUpdateToolbarState(_rteToolbarEl);
}

// Bold/italic: bungkus (atau lepas bungkus, kalau selection udah persis di
// dalam tag yang sama) selection dengan STRONG/EM.
function _rteToggleInline(range, tagName) {
  const findTag = (node) => {
    const n = node.nodeType === 1 ? node : node.parentElement;
    return n ? n.closest(tagName.toLowerCase()) : null;
  };
  const startTag = findTag(range.startContainer);
  const endTag   = findTag(range.endContainer);
  if (startTag && startTag === endTag) {
    const parent = startTag.parentNode;
    while (startTag.firstChild) parent.insertBefore(startTag.firstChild, startTag);
    parent.removeChild(startTag);
    return;
  }
  if (range.collapsed) return;
  const frag = range.extractContents();
  const wrapper = document.createElement(tagName);
  wrapper.appendChild(frag);
  range.insertNode(wrapper);
  const sel = window.getSelection();
  sel.removeAllRanges();
  const newRange = document.createRange();
  newRange.selectNodeContents(wrapper);
  sel.addRange(newRange);
}

// Cari batas "baris" saat ini di dalam .ps-rte (dipisah oleh <br>, struktur flat).
// Sebelumnya ini coba nebak "node anak-langsung el tempat caret berada" dari
// range.startContainer secara manual (jalan-jalan lewat parentElement) — rapuh
// banget, karena bentuk container beda-beda tergantung browser habis kita
// insertNode/setStartAfter (kadang text node baris, kadang node hasil merge,
// kadang element itu sendiri), dan salah tebak bikin baris salah kedeteksi
// (nomor macet di angka tertentu / marker gak ke-generate sama sekali).
// Sekarang pakai Range.compareBoundaryPoints: bandingin POSISI caret langsung
// terhadap posisi tiap <br>, gak peduli node macam apa containernya.
function _rteLineBounds(el, range) {
  const kids = Array.from(el.childNodes);
  const point = document.createRange();
  try { point.setStart(range.startContainer, range.startOffset); }
  catch { point.selectNodeContents(el); }
  point.collapse(true);

  let end = kids.length;
  for (let i = 0; i < kids.length; i++) {
    if (kids[i].nodeName !== 'BR') continue;
    const brPoint = document.createRange();
    brPoint.setStartBefore(kids[i]);
    brPoint.collapse(true);
    // Caret ada di titik ini atau sebelum <br> ini -> <br> ini batas akhir baris caret.
    if (point.compareBoundaryPoints(Range.START_TO_START, brPoint) <= 0) { end = i; break; }
  }
  let start = 0;
  for (let i = end - 1; i >= 0; i--) { if (kids[i].nodeName === 'BR') { start = i + 1; break; } }
  return { start, end, kids };
}

// ── Marker list ("1."/"-") sebagai <span class="rte-marker"> ──────────────
// Dipisah dari teks baris (bukan nempel jadi teks polos) supaya bisa
// di-render rata kanan dalam kotak lebar tetap lewat CSS: titik di belakang
// nomor 1 digit & 2 digit jadi sejajar. Helper2 ini dipakai di 3 tempat
// yang bikin/lepas marker secara langsung di DOM: Enter, paste, & toolbar.
function _rteMarkerSpan(lineDiv) {
  const first = lineDiv && lineDiv.firstChild;
  return (first && first.nodeType === 1 && first.classList && first.classList.contains('rte-marker')) ? first : null;
}
function _rteRemoveMarker(lineDiv) {
  const span = _rteMarkerSpan(lineDiv);
  if (span) {
    // NBSP pemisah tepat setelah span (kalau ada) ikut dibuang juga.
    const next = span.nextSibling;
    if (next && next.nodeType === 3 && next.nodeValue.charAt(0) === '\u00A0') {
      next.nodeValue = next.nodeValue.slice(1);
    }
    span.remove();
  }
  lineDiv.classList.remove('rte-line--list');
}
function _rteInsertMarker(lineDiv, text) {
  const span = document.createElement('span');
  span.className = 'rte-marker' + (text === '-' ? ' rte-marker--ul' : '');
  span.textContent = text;
  const sep = document.createTextNode('\u00A0');
  lineDiv.insertBefore(sep, lineDiv.firstChild);
  lineDiv.insertBefore(span, sep);
  lineDiv.classList.add('rte-line--list');
  return sep;
}
// Bungkus marker teks polos ("1. "/"- ") yang belum dibungkus <span> (mis.
// baris hasil paste dari luar) jadi rte-marker, supaya alignment-nya
// konsisten sama baris yang dibuat lewat Enter/toolbar. No-op kalau bukan
// baris list, atau markernya udah dibungkus, atau gak ketemu pola marker.
function _rteWrapMarker(lineDiv) {
  if (!lineDiv || !lineDiv.classList.contains('rte-line--list')) return;
  if (_rteMarkerSpan(lineDiv)) return;
  const first = lineDiv.firstChild;
  if (!first || first.nodeType !== 3) return;
  const m = first.nodeValue.match(/^(\d+\.|-)[ \u00A0]/);
  if (!m) return;
  const span = document.createElement('span');
  span.className = 'rte-marker' + (m[1] === '-' ? ' rte-marker--ul' : '');
  span.textContent = m[1];
  first.nodeValue = first.nodeValue.slice(m[1].length);
  lineDiv.insertBefore(span, first);
}

// Toggle "- " (bullet) atau "1. " (nomor) di depan baris tempat cursor/selection berada.
function _rteToggleListPrefix(el, range, mode) {
  // .ps-rte yang baru mulai diketik (belum pernah lewat _mdToRteHtml) belum
  // punya wrapper <div class="rte-line"> sama sekali — bungkus dulu isinya
  // jadi satu baris supaya closest('.rte-line') di bawah bisa nemuin induknya.
  if (!el.querySelector(':scope > .rte-line')) {
    const wrap = document.createElement('div');
    wrap.className = 'rte-line';
    while (el.firstChild) wrap.appendChild(el.firstChild);
    el.appendChild(wrap);
  }

  // Cari SEMUA baris yang kena selection (bukan cuma baris tempat selection
  // mulai) -- sebelumnya di sini cuma baris pertama yang diproses, makanya
  // toggle bullet/nomor di teks yang di-select beberapa baris cuma nempel
  // ke baris pertama doang, sisanya dianggurin.
  const findLine = (node) => {
    const n = node && (node.nodeType === 1 ? node : node.parentElement);
    return n ? n.closest('.rte-line') : null;
  };
  const startLine = findLine(range.startContainer);
  const endLine   = findLine(range.endContainer) || startLine;
  if (!startLine || !el.contains(startLine)) return;

  const allLines = Array.from(el.querySelectorAll(':scope > .rte-line'));
  const startIdx = allLines.indexOf(startLine);
  let   endIdx   = allLines.indexOf(endLine);
  if (endIdx === -1) endIdx = startIdx;
  const lo = Math.min(startIdx, endIdx);
  const hi = Math.max(startIdx, endIdx);
  const lines = allLines.slice(lo, hi + 1);
  if (!lines.length) return;

  // Marker sekarang disimpan sebagai <span class="rte-marker"> (bukan teks
  // polos nempel di depan baris) supaya rata-kanan lewat CSS jalan -- deteksi
  // & lepas/pasangnya juga lewat span itu, bukan regex di text node depan.
  const isOlMarker = (txt) => /^\d+\.$/.test(txt);
  const isUlMarker = (txt) => txt === '-';
  const markerTextOf = (lineDiv) => { const s = _rteMarkerSpan(lineDiv); return s ? s.textContent : ''; };

  // Toggle ditentukan dari baris PERTAMA yang di-select: kalau udah punya
  // prefix sesuai mode ini, semua baris terpilih dilepas; kalau belum,
  // semua baris terpilih dikasih prefix (nomor urut buat mode 'ol').
  const firstMarkerText = markerTextOf(lines[0]);
  const isRemoving = mode === 'ul' ? isUlMarker(firstMarkerText) : isOlMarker(firstMarkerText);

  let n = 1;
  lines.forEach(lineDiv => {
    if (isRemoving) {
      _rteRemoveMarker(lineDiv);
    } else {
      // Kalau baris ini kebetulan udah pakai format list satunya (mis.
      // lagi "- " terus yang diminta "ol"), lepas dulu biar gak dobel prefix.
      const existing = markerTextOf(lineDiv);
      const hasOther = mode === 'ul' ? isOlMarker(existing) : isUlMarker(existing);
      if (hasOther) _rteRemoveMarker(lineDiv);
      _rteInsertMarker(lineDiv, mode === 'ul' ? '-' : `${n}.`);
      n++;
    }
  });
}

function _renderPSCell(idBase, indikatorId, value, capaian, canEdit, label, onchangeFn, locked = true, tercapaiCol = false, isPredikat = false, belumPernahDiisi = false) {
  const tercapai  = capaian !== null && !isNaN(capaian) && capaian >= 100;
  const belumIsi  = capaian === null || isNaN(capaian);
  // Indikator predikat (mis. Peringkat SAKIP) yang realisasinya sengaja
  // dikosongkan ("-", menunggu penilaian akhir tahun) tetap perlu bisa diisi
  // Faktor Penghambat & Solusi untuk menjelaskan progresnya — jangan
  // disembunyikan total seperti indikator angka biasa yang belum diisi apa-apa.
  // TAPI kalau user belum PERNAH sama sekali interaksi sama dropdown peringkat
  // (belumPernahDiisi: gak ada realisasi_id sama sekali, baris masih perawan),
  // tetap sembunyikan dulu — jangan langsung aktif dari awal sebelum user
  // menentukan pilihan apapun (termasuk "-"). Begitu user pilih apapun di
  // dropdown, _togglePermasalahanSolusi() di runtime yang nampilin fieldnya.
  const predikatBelumDisentuh = isPredikat && belumPernahDiisi;
  const hideTA    = tercapaiCol
    ? !tercapai
    : (tercapai || (belumIsi && (!isPredikat || predikatBelumDisentuh)));
  const showNote  = !tercapaiCol && tercapai;
  const hasValue  = (value || '').trim().length > 0;
  const LIMIT     = 80; // karakter (markdown-lite) sebelum dipotong
  const needsTrunc = locked && hasValue && !hideTA && (value || '').length > LIMIT;
  const startCollapsed = needsTrunc; // collapsed hanya kalau teks panjang
  const previewText = needsTrunc
    ? _mdToHtmlDisplay((value || '').slice(0, LIMIT))
    : _mdToHtmlDisplay(value || '');
  return `<div class="ps-cell-wrap${startCollapsed ? ' ps-collapsed' : ''}" id="${idBase}wrap_${indikatorId}" style="${hideTA ? 'display:none' : ''}">
            <!-- View mode: teks (markdown-lite dirender) + Selengkapnya -->
            <div class="ps-read" id="${idBase}read_${indikatorId}" style="${!locked || !hasValue || hideTA ? 'display:none' : ''}">
              <div class="ps-read-text" id="${idBase}short_${indikatorId}">${previewText}</div>
              <div class="ps-read-full" id="${idBase}full_${indikatorId}" style="display:none">${_mdToHtmlDisplay(value || '')}</div>
              ${needsTrunc ? `<button type="button" class="ps-more-btn" id="${idBase}morebtn_${indikatorId}" data-tip="Selengkapnya"
                onclick="_togglePSExpand('${idBase}', ${indikatorId}, event)"><svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9l6 6 6-6"/></svg></button>` : ''}
            </div>
            <!-- Edit mode: rich text editor (markdown-lite: **tebal**, _miring_, "- "/"1. " daftar) -->
            <div class="ps-rte" id="${idBase}_${indikatorId}" contenteditable="${locked ? 'false' : 'true'}"
              data-placeholder="${canEdit ? 'Ketik di sini...' : '—'}"
              ${locked ? 'readonly' : ''}
              data-tip="${locked ? `Klik tombol Edit untuk mengisi ${label}` : ''}"
              style="${locked ? 'cursor:not-allowed;display:none;' : ''}"
              oninput="_checkSymbolOnlyInput(this, '${label}'); ${onchangeFn}(${indikatorId})">${_mdToRteHtml(value || '')}</div>
          </div>
          <div id="${idBase}note_${indikatorId}" class="ps-tercapai-note" style="${showNote && hasValue ? '' : 'display:none'}">
            —
          </div>`;
}

// Update konten + truncation ps-read setelah save (dipakai IKU/IKK/SPM) — samain
// logic-nya dengan _renderPSCell supaya "Selengkapnya" langsung muncul tanpa reload.
function _updatePSReadAfterSave(base, indikatorId, val) {
  const LIMIT   = 80;
  const wrapEl  = document.getElementById(`${base}wrap_${indikatorId}`);
  const readEl  = document.getElementById(`${base}read_${indikatorId}`);
  const shortEl = document.getElementById(`${base}short_${indikatorId}`);
  const fullEl  = document.getElementById(`${base}full_${indikatorId}`);
  let   moreBtn = document.getElementById(`${base}morebtn_${indikatorId}`);
  if (!readEl || !shortEl) return;
  const v = val || '';
  const hasVal = v.trim().length > 0;
  const needsTrunc = hasVal && v.length > LIMIT;

  shortEl.innerHTML = _mdToHtmlDisplay(v.slice(0, LIMIT));
  shortEl.style.display = '';
  if (fullEl) { fullEl.innerHTML = _mdToHtmlDisplay(v); fullEl.style.display = 'none'; }
  if (wrapEl) wrapEl.classList.toggle('ps-collapsed', needsTrunc);

  if (needsTrunc && !moreBtn) {
    moreBtn = document.createElement('button');
    moreBtn.type = 'button';
    moreBtn.className = 'ps-more-btn';
    moreBtn.id = `${base}morebtn_${indikatorId}`;
    moreBtn.setAttribute('onclick', `_togglePSExpand('${base}', ${indikatorId}, event)`);
    readEl.appendChild(moreBtn);
  }
  if (moreBtn) { moreBtn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9l6 6 6-6"/></svg>'; moreBtn.setAttribute('data-tip','Selengkapnya'); moreBtn.style.display = needsTrunc ? '' : 'none'; }

  readEl.style.display = hasVal ? '' : 'none';
}

// Simpan referensi ps-read yang sedang expanded (untuk auto-collapse saat klik luar)
let _psExpandedEl = null;

function _collapsePSExpand(readEl) {
  if (!readEl) return;
  const shortEl = readEl.querySelector('.ps-read-text');
  const fullEl  = readEl.querySelector('.ps-read-full');
  const btn     = readEl.querySelector('.ps-more-btn');
  if (fullEl)  fullEl.style.display = 'none';
  if (shortEl) shortEl.style.display = '';
  if (btn)     { btn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9l6 6 6-6"/></svg>'; btn.setAttribute('data-tip','Selengkapnya'); }
  _psExpandedEl = null;
}

function _togglePSExpand(idBase, indikatorId, event) {
  if (event) event.stopPropagation();
  const readEl  = document.getElementById(`${idBase}read_${indikatorId}`);
  const shortEl = document.getElementById(`${idBase}short_${indikatorId}`);
  const fullEl  = document.getElementById(`${idBase}full_${indikatorId}`);
  const btn     = document.getElementById(`${idBase}morebtn_${indikatorId}`);
  if (!fullEl) return;
  const expanded = fullEl.style.display !== 'none';
  if (!expanded) {
    // Collapse yang sebelumnya expand dulu
    if (_psExpandedEl && _psExpandedEl !== readEl) _collapsePSExpand(_psExpandedEl);
    fullEl.style.display = '';
    if (shortEl) shortEl.style.display = 'none';
    if (btn) { btn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M18 15l-6-6-6 6"/></svg>'; btn.setAttribute('data-tip','Sembunyikan'); }
    _psExpandedEl = readEl;
  } else {
    _collapsePSExpand(readEl);
  }
}

// Klik di luar ps-read yang expand → otomatis collapse
document.addEventListener('click', function(e) {
  if (!_psExpandedEl) return;
  if (!_psExpandedEl.contains(e.target)) _collapsePSExpand(_psExpandedEl);
});

// Toggle tampilan textarea Permasalahan/Solusi vs catatan "Target tercapai"
// berdasarkan nilai capaian terbaru (dipanggil saat preview capaian live)
function _togglePermasalahanSolusi(prefix, indikatorId, capaian) {
  const dataArr = prefix === 'ikk' ? _ikkData : prefix === 'spm' ? _spmData : _kinerjaData;
  const row = dataArr.find(r => r.id === indikatorId);
  const isPredikat = row?.tipe_nilai === 'predikat';
  const tercapai = capaian !== null && !isNaN(capaian) && capaian >= 100;
  const belumIsi = capaian === null || isNaN(capaian);
  const p = prefix ? prefix + '_' : '';
  // Kolom < 100: f_penghambat, solusi — untuk indikator predikat yang realisasinya
  // sengaja dikosongkan ("-", menunggu penilaian akhir tahun), tetap tampilkan
  // supaya user bisa menjelaskan progres, bukan disembunyikan total. TAPI kalau
  // dropdown-nya masih data-placeholder (belum pernah disentuh user sama sekali),
  // tetap sembunyikan dulu — samain dengan logic initial render di _renderPSCell.
  const realEl = isPredikat ? document.getElementById(`${p}real_${indikatorId}`) : null;
  const predikatBelumDisentuh = isPredikat && realEl?.tagName === 'SELECT' && !!realEl.dataset.placeholder;
  const hideBawah  = tercapai || (belumIsi && (!isPredikat || predikatBelumDisentuh));
  // Kolom >= 100: f_pendukung, rencana_tl
  const hideAtas   = belumIsi || !tercapai;
  const tr = document.querySelector(`tr[data-id="${indikatorId}"]`);
  const isEditingRow = !!tr?.classList.contains('row-state-editing');

  // Kalau baris lagi diedit dan wrap ini baru kelihatan (mis. gara-gara realisasi
  // naik/turun ngelewatin ambang 100% pas edit), pastikan textarea-nya ikut
  // ke-switch ke mode edit. Tanpa ini, wrap yang masih hidden pas tombol Edit
  // diklik (di-skip sama toggleEditRow) bakal macet nunjukkin "—" tanpa bisa
  // diisi, dan tombol Simpan gak akan pernah aktif walau user udah ganti target.
  const syncWrapEditMode = (wrap) => {
    if (!isEditingRow || !wrap || wrap.style.display === 'none') return;
    const readEl = wrap.querySelector('.ps-read');
    const taEl   = wrap.querySelector('.ps-rte');
    if (!taEl || taEl.style.display !== 'none') return;
    if (readEl) readEl.style.display = 'none';
    taEl.removeAttribute('readonly');
    taEl.contentEditable = 'true';
    taEl.style.cursor = '';
    taEl.style.display = '';
  };

  ['fpenghambat', 'solusi'].forEach(base => {
    const wrap = document.getElementById(`${p}${base}wrap_${indikatorId}`);
    if (wrap) wrap.style.display = hideBawah ? 'none' : '';
    syncWrapEditMode(wrap);
    const note = document.getElementById(`${p}${base}note_${indikatorId}`);
    if (note) {
      // Tampilkan "—" hanya kalau tercapai DAN sebelumnya ada nilai tersimpan
      const ta = document.getElementById(`${p}${base}_${indikatorId}`);
      const hasVal = (ta?.value || '').trim().length > 0;
      note.style.display = (tercapai && hasVal) ? '' : 'none';
    }
  });
  ['fpendukung', 'rencana'].forEach(base => {
    const wrap = document.getElementById(`${p}${base}wrap_${indikatorId}`);
    if (wrap) wrap.style.display = hideAtas ? 'none' : '';
    syncWrapEditMode(wrap);
  });
}


function showPage(pageId) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  const el = document.getElementById(pageId);
  if (el) el.classList.add('active');
  if (pageId === 'page-kinerja-admin') {
    switchKinerjaAdminTab('indikator');
    document.getElementById('btnKelolIndikator').style.display = 'none';
  } else if (pageId === 'page-kinerja') {
    document.getElementById('btnKelolIndikator').style.display = _user?.is_admin ? '' : 'none';
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// MONITORING PENGISIAN KINERJA — Admin Only
// ═══════════════════════════════════════════════════════════════════════════

let _mon_bulan  = new Date().getMonth() + 1;
let _mon_tahun  = new Date().getFullYear();
let _mon_jenis  = 'all';   // 'monev' | 'ikk' | 'all'
let _mon_status = 'all';     // 'all' | 'terisi' | 'belum'
let _mon_pj     = '';
let _mon_user   = '';   // filter by individual user (PIC)
let _mon_search = '';
let _mon_page   = 1;
const _MON_PER_PAGE = 15;
let _mon_data   = null;

const _MON_BULAN_NAMA = ['','Januari','Februari','Maret','April','Mei','Juni',
                         'Juli','Agustus','September','Oktober','November','Desember'];

// ── Populate tahun dari _allPeriodeList ───────────────────────────────────
function _monPopulateTahun() {
  const sel = document.getElementById('monTahunSelect');
  if (!sel) return;
  const tahunList = [...new Set(_allPeriodeList.map(p => p.tahun))].sort((a, b) => a - b);
  const yr = new Date().getFullYear();
  const list = tahunList.length ? tahunList : [yr];
  sel.innerHTML = '<option value="">Semua Tahun</option>' +
    list.map(t => `<option value="${t}"${t === (_mon_tahun || yr) ? ' selected' : ''}>${t}</option>`).join('');
  if (typeof syncCustomSelect === 'function') syncCustomSelect('monTahunSelect');
}

// ── Populate bulan dari periode yang ada di tahun terpilih ────────────────
function _monPopulateBulan() {
  const sel = document.getElementById('monBulanSelect');
  if (!sel) return;
  // Kumpulkan bulan dari _allPeriodeList untuk tahun yang dipilih
  // Kalau _mon_tahun kosong (Semua Tahun), tampilkan semua bulan yang pernah ada
  const bulanSet = _mon_tahun
    ? new Set(_allPeriodeList.filter(p => p.tahun === _mon_tahun).map(p => p.bulan))
    : new Set(_allPeriodeList.map(p => p.bulan));
  const BULAN_NAMES = ['','Januari','Februari','Maret','April','Mei','Juni',
                       'Juli','Agustus','September','Oktober','November','Desember'];
  const opts = ['<option value="">Semua Bulan</option>'];
  for (let b = 1; b <= 12; b++) {
    if (bulanSet.has(b)) opts.push(`<option value="${b}">${BULAN_NAMES[b]}</option>`);
  }
  sel.innerHTML = opts.join('');
  // Pertahankan pilihan bulan sebelumnya jika masih valid
  if (_mon_bulan && bulanSet.has(_mon_bulan)) {
    sel.value = _mon_bulan;
  } else {
    _mon_bulan = '';
    sel.value = '';
  }
  if (typeof syncCustomSelect === 'function') syncCustomSelect('monBulanSelect');
}

// ── Init saat halaman pertama kali dibuka ─────────────────────────────────
async function initMonitoringKinerja() {
  // Pastikan _allPeriodeList sudah terisi (bisa jadi initKinerjaControls belum selesai)
  if (!_allPeriodeList.length) {
    try {
      const r = await fetch('/api/periode', { headers: authHeaders() });
      if (r.ok) { const d = await r.json(); _allPeriodeList = d.periode || []; }
    } catch { _allPeriodeList = []; }
  }

  // Populate dari data periode (bukan hardcode)
  _monPopulateTahun();
  _monPopulateBulan();
  _mon_tahun = document.getElementById('monTahunSelect')?.value
    ? parseInt(document.getElementById('monTahunSelect').value) : '';

  // Sync tombol jenis & status
  _monSyncJenisBtn();
  _monSyncStatusBtn();
  // Load
  loadMonitoringKinerja();
}

async function loadMonitoringKinerja() {
  _mon_page = 1;
  const body = document.getElementById('monTableBody');
  if (!body) return;
  body.innerHTML = `<tr><td colspan="7" style="text-align:center;padding:28px;color:#94a3b8">
    <span class="btn-spin" style="width:14px;height:14px;vertical-align:-2px;margin-right:6px"></span>
    Memuat data monitoring…</td></tr>`;

  try {
    const _monBuildUrl = () => {
      const params = new URLSearchParams({ jenis: _mon_jenis || 'all' });
      if (_mon_tahun !== '' && _mon_tahun != null) params.set('tahun', _mon_tahun);
      if (_mon_bulan !== '' && _mon_bulan != null) params.set('bulan', _mon_bulan);
      return `/api/kinerja/monitoring?${params}`;
    };
    const res = await fetch(_monBuildUrl(), { headers: authHeaders() });
    const d = await res.json();
    if (!res.ok) { toast(d.error || 'Gagal memuat monitoring', 'error'); return; }
    _mon_data = d;
  } catch (err) {
    toast('Error: ' + err.message, 'error');
    body.innerHTML = `<tr><td colspan="7" style="text-align:center;padding:24px;color:#ef4444">Gagal memuat data.</td></tr>`;
    return;
  }

  _monRenderSummary();
  _monRenderPJCards();
  _monPopulateUserSelect();
  _monRenderUserCards();
  _monRenderTable();
}

// ── Summary cards ─────────────────────────────────────────────────────────
function _monRenderSummary() {
  const el = document.getElementById('monSummaryCards');
  if (!el || !_mon_data) return;
  const { summary, bulan, tahun, jenis } = _mon_data;
  const pct = summary.total ? Math.round(summary.terisi / summary.total * 100) : 0;
  const tone = pct >= 80 ? { c: '#16a34a', c2: '#22c55e', bg: 'rgba(22,163,74,.1)' }
             : pct >= 50 ? { c: '#d97706', c2: '#f59e0b', bg: 'rgba(217,119,6,.1)' }
             :             { c: '#dc2626', c2: '#ef4444', bg: 'rgba(220,38,38,.1)' };

  const kpi = (value, label, color, bg, iconSvg) => `
    <div class="stat-card" style="border-left-color:${color};flex:1 1 150px;min-width:150px">
      <div class="stat-card-body">
        <div class="stat-label">${label}</div>
        <div class="stat-value" style="color:${color}">${value}</div>
      </div>
      <div class="stat-icon" style="background:${bg};opacity:1">
        <svg xmlns="http://www.w3.org/2000/svg" width="17" height="17" fill="none" viewBox="0 0 24 24" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${iconSvg}</svg>
      </div>
    </div>`;

  el.innerHTML = `
    <div style="display:flex;flex-wrap:wrap;gap:var(--sp-4);align-items:stretch;margin-bottom:var(--sp-5)">
      ${kpi(summary.terisi, 'Terinput', '#16a34a', 'rgba(22,163,74,.12)',
        '<path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>')}
      ${kpi(summary.belum, 'Belum Input', '#d97706', 'rgba(217,119,6,.12)',
        '<circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>')}
      ${kpi(summary.total, 'Total', 'var(--hijau)', 'rgba(15,118,110,.12)',
        '<path d="M3 3v18h18"/><path d="M18 17V9"/><path d="M13 17V5"/><path d="M8 17v-3"/>')}

      <div class="stat-card" style="flex:2 1 260px;min-width:240px;flex-direction:column;align-items:stretch;border-left-color:${tone.c}">
        <div style="display:flex;justify-content:space-between;align-items:baseline;gap:var(--sp-3)">
          <span class="stat-label">Progress Pengisian</span>
          <span style="font-size:var(--fs-lg);font-weight:800;color:${tone.c};font-variant-numeric:tabular-nums">${pct}%</span>
        </div>
        <div style="background:var(--abu-2);border-radius:99px;height:9px;overflow:hidden;margin-top:var(--sp-3);box-shadow:inset 0 1px 2px rgba(0,0,0,.06)">
          <div style="width:${pct}%;height:100%;border-radius:99px;background:linear-gradient(90deg,${tone.c},${tone.c2});transition:width .5s cubic-bezier(.4,0,.2,1)"></div>
        </div>
        <div style="font-size:var(--fs-xs);color:var(--teks-muted);margin-top:var(--sp-3);display:flex;align-items:center;gap:5px">
          <span>${bulan ? _MON_BULAN_NAMA[bulan] : 'Semua Bulan'} ${tahun || 'Semua Tahun'}</span>
          <span style="color:var(--abu-2)">&bull;</span>
          <span>${jenis === 'monev' ? 'IKU' : jenis === 'ikk' ? 'IKK' : jenis === 'spm' ? 'SPM' : 'Semua Jenis'}</span>
        </div>
      </div>
    </div>`;
}

// ── Populate filter User dari data yang sedang termuat (scoped ke Bidang aktif) ──
function _monPopulateUserSelect() {
  const sel = document.getElementById('monUserSelect');
  if (!sel || !_mon_data) return;
  const rows = _mon_pj
    ? (_mon_data.indikator || []).filter(r => r.penanggung_jawab === _mon_pj)
    : (_mon_data.indikator || []);
  const users = new Set();
  rows.forEach(r => (Array.isArray(r.pic_users) ? r.pic_users : []).forEach(u => u && users.add(u)));
  const list = [...users].sort((a, b) => a.localeCompare(b, 'id'));
  // Reset kalau user yang lagi difilter sudah tidak relevan lagi (mis. ganti bidang)
  if (_mon_user && !list.includes(_mon_user)) _mon_user = '';
  sel.innerHTML = '<option value="">Semua User</option>' +
    list.map(u => `<option value="${escHtml(u)}"${u === _mon_user ? ' selected' : ''}>${escHtml(u)}</option>`).join('');
  sel.disabled = !list.length;
  if (typeof syncCustomSelect === 'function') syncCustomSelect('monUserSelect');
}

// ── Progress per Bidang / Sub Bagian ─────────────────────────────────────────
function _monRenderPJCards() {
  const el = document.getElementById('monPJCards');
  if (!el) return;
  const list = _mon_data?.summary_pj;
  if (!list?.length) { el.innerHTML = ''; return; }

  const R = 19, C = 2 * Math.PI * R;

  const cards = list.map(pj => {
    const pct = pj.total ? Math.round(pj.terisi / pj.total * 100) : 0;
    const tone = pct >= 91 ? { c: '#16a34a', c2: '#4ade80' }  // Sangat Tinggi 91-100
               : pct >= 76 ? { c: '#65a30d', c2: '#a3e635' }  // Tinggi        76-90
               : pct >= 66 ? { c: '#ca8a04', c2: '#eab308' }  // Sedang        66-75
               : pct >= 51 ? { c: '#ea580c', c2: '#f97316' }  // Rendah        51-65
               :             { c: '#dc2626', c2: '#ef4444' }; // Sangat Rendah <=50
    const isActive = _mon_pj === pj.penanggung_jawab;
    const dashOffset = C - (pct / 100) * C;

    const ring = `
      <svg width="52" height="52" viewBox="0 0 52 52" style="flex-shrink:0">
        <circle cx="26" cy="26" r="${R}" fill="none" stroke="var(--abu-2)" stroke-width="5"/>
        <circle cx="26" cy="26" r="${R}" fill="none" stroke="${tone.c}" stroke-width="5" stroke-linecap="round"
          stroke-dasharray="${C.toFixed(2)}" stroke-dashoffset="${dashOffset.toFixed(2)}"
          transform="rotate(-90 26 26)" style="transition:stroke-dashoffset .6s cubic-bezier(.4,0,.2,1)"/>
        <text x="26" y="30.5" text-anchor="middle" font-size="10.5" font-weight="800" fill="${tone.c}" font-family="inherit">${pct}%</text>
      </svg>`;

    return `<div onclick='setMonPJ(${_jsAttr(pj.penanggung_jawab)})' data-tip="Klik untuk filter"
         style="cursor:pointer;position:relative;overflow:hidden;background:${isActive ? 'linear-gradient(135deg,rgba(15,118,110,.07),rgba(255,255,255,.95))' : '#fff'};
                border:1.5px solid ${isActive ? 'var(--hijau)' : 'var(--abu-2)'};
                border-radius:var(--r-md);flex:1;min-width:210px;max-width:280px;
                box-shadow:${isActive ? '0 0 0 3px rgba(13,148,136,.12), var(--shadow-sm)' : 'var(--shadow-sm)'};
                transition:box-shadow var(--transition), transform var(--transition), border-color var(--transition)"
         onmouseover="this.style.boxShadow='var(--shadow-md)';this.style.transform='translateY(-2px)'"
         onmouseout="this.style.boxShadow='${isActive ? '0 0 0 3px rgba(13,148,136,.12), var(--shadow-sm)' : 'var(--shadow-sm)'}';this.style.transform='none'">
      <div style="height:3px;background:linear-gradient(90deg,${tone.c},${tone.c2})"></div>
      <div style="padding:var(--sp-4);display:flex;align-items:flex-start;gap:var(--sp-4)">
        ${ring}
        <div style="min-width:0;flex:1">
          <div style="font-size:var(--fs-sm);font-weight:700;color:var(--teks);white-space:normal;word-break:break-word;line-height:1.35">
            ${escHtml(pj.penanggung_jawab)}
          </div>
          <div style="font-size:var(--fs-xs);color:var(--teks-muted);margin-top:var(--sp-2);font-variant-numeric:tabular-nums;display:flex;align-items:center;gap:4px">
            <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0;opacity:.6"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>
            <span>${pj.terisi} dari ${pj.total} terinput</span>
          </div>
        </div>
      </div>
    </div>`;
  }).join('');

  el.innerHTML = `
    <div style="margin-bottom:var(--sp-5)">
      <div style="font-size:var(--fs-sm);font-weight:700;color:var(--teks);margin-bottom:var(--sp-3);display:flex;align-items:center;gap:var(--sp-2)">
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="var(--hijau)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></svg>
        <span>Progress per Bidang / Sub Bagian</span>
        ${_mon_pj ? `<button onclick="setMonPJ('')" style="font-size:var(--fs-xs);background:var(--hijau-light);border:none;border-radius:999px;padding:2px 10px;cursor:pointer;color:var(--hijau);font-weight:700;display:inline-flex;align-items:center;gap:3px">✕ Reset</button>` : ''}
      </div>
      <div style="display:flex;flex-wrap:wrap;gap:var(--sp-3)">${cards}</div>
    </div>`;
}

// ── Progress per User — muncul saat salah satu Bidang/Sub Bagian dipilih ──
function _monRenderUserCards() {
  const el = document.getElementById('monUserCards');
  if (!el) return;

  if (!_mon_pj || !_mon_data) { el.innerHTML = ''; return; }

  const rows = (_mon_data.indikator || []).filter(r => r.penanggung_jawab === _mon_pj);
  const userMap = {};
  rows.forEach(r => {
    const users = Array.isArray(r.pic_users) ? r.pic_users.filter(Boolean) : [];
    if (!users.length) return;
    users.forEach(u => {
      if (!userMap[u]) userMap[u] = { nama: u, total: 0, terisi: 0 };
      userMap[u].total++;
      if (r.status === 'terisi') userMap[u].terisi++;
    });
  });
  const list = Object.values(userMap).sort((a, b) => {
    const pctA = a.total ? a.terisi / a.total : 0;
    const pctB = b.total ? b.terisi / b.total : 0;
    return pctA - pctB || a.nama.localeCompare(b.nama, 'id');
  });

  if (!list.length) {
    el.innerHTML = `
      <div style="margin-bottom:var(--sp-5)">
        <div style="font-size:var(--fs-sm);font-weight:700;color:var(--teks);margin-bottom:var(--sp-3)">Progress per User — ${escHtml(_mon_pj)}</div>
        <div style="font-size:var(--fs-xs);color:var(--teks-muted);font-style:italic">Belum ada user yang ditugaskan di bidang ini.</div>
      </div>`;
    return;
  }

  const cards = list.map(u => {
    const pct = u.total ? Math.round(u.terisi / u.total * 100) : 0;
    const isActive = _mon_user === u.nama;
    const done = u.terisi === u.total;
    const tone = done ? { c: '#16a34a', bg: '#dcfce7' } : (u.terisi > 0 ? { c: '#d97706', bg: '#fef3c7' } : { c: '#dc2626', bg: '#fee2e2' });
    const icon = done
      ? '<path stroke-linecap="round" stroke-linejoin="round" d="M4.5 12.75l6 6 9-13.5"/>'
      : '<circle cx="12" cy="12" r="9"/><path stroke-linecap="round" stroke-linejoin="round" d="M12 7.5v5l3 2"/>';

    return `<div onclick='setMonUser(${_jsAttr(isActive ? '' : u.nama)})' data-tip="Klik untuk filter tabel"
         style="cursor:pointer;display:flex;align-items:center;gap:10px;background:${isActive ? 'linear-gradient(135deg,rgba(15,118,110,.07),rgba(255,255,255,.95))' : '#fff'};
                border:1.5px solid ${isActive ? 'var(--hijau)' : 'var(--abu-2)'};border-radius:var(--r-md);
                padding:10px 14px;flex:1;min-width:210px;max-width:280px;box-shadow:${isActive ? '0 0 0 3px rgba(13,148,136,.12), var(--shadow-sm)' : 'var(--shadow-sm)'};
                transition:box-shadow var(--transition), transform var(--transition), border-color var(--transition)"
         onmouseover="this.style.boxShadow='var(--shadow-md)';this.style.transform='translateY(-2px)'"
         onmouseout="this.style.boxShadow='${isActive ? '0 0 0 3px rgba(13,148,136,.12), var(--shadow-sm)' : 'var(--shadow-sm)'}';this.style.transform='none'">
      <div style="width:30px;height:30px;border-radius:50%;background:${tone.bg};display:flex;align-items:center;justify-content:center;flex-shrink:0">
        <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="${tone.c}" stroke-width="2.2">${icon}</svg>
      </div>
      <div style="min-width:0;flex:1">
        <div style="font-size:.78rem;font-weight:700;color:var(--teks);white-space:normal;word-break:break-word;line-height:1.3">${escHtml(u.nama)}</div>
        <div style="font-size:.68rem;color:${tone.c};font-weight:600;margin-top:2px">${u.terisi} dari ${u.total} terinput (${pct}%)</div>
      </div>
    </div>`;
  }).join('');

  el.innerHTML = `
    <div style="margin-bottom:var(--sp-5)">
      <div style="font-size:var(--fs-sm);font-weight:700;color:var(--teks);margin-bottom:var(--sp-3);display:flex;align-items:center;gap:var(--sp-2)">
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="var(--hijau)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
        <span>Progress per User — ${escHtml(_mon_pj)}</span>
        ${_mon_user ? `<button onclick="setMonUser('')" style="font-size:var(--fs-xs);background:var(--hijau-light);border:none;border-radius:999px;padding:2px 10px;cursor:pointer;color:var(--hijau);font-weight:700;display:inline-flex;align-items:center;gap:3px">✕ Reset</button>` : ''}
      </div>
      <div style="display:flex;flex-wrap:wrap;gap:var(--sp-3)">${cards}</div>
    </div>`;
}
// ── Tabel detail ──────────────────────────────────────────────────────────
function _monGoPage(p) {
  _mon_page = p;
  _monRenderTable();
}

function _monRenderTable() {
  const body = document.getElementById('monTableBody');
  if (!body || !_mon_data) return;

  // Mode semua bulan: tampilkan kolom Bulan ekstra
  const isAllBulan = (_mon_bulan === '' || _mon_bulan == null);
  const colCount = isAllBulan ? 8 : 7;

  // Update thead dinamis
  const thead = body.closest('table')?.querySelector('thead tr');
  if (thead) {
    if (isAllBulan && !thead.querySelector('th[data-bulan-col]')) {
      const th = document.createElement('th');
      th.setAttribute('data-bulan-col', '1');
      th.style.cssText = 'width:90px;text-align:center';
      th.textContent = 'Bulan';
      thead.insertBefore(th, thead.children[4]); // sebelum kolom Status
    } else if (!isAllBulan && thead.querySelector('th[data-bulan-col]')) {
      thead.querySelector('th[data-bulan-col]').remove();
    }
  }

  let rows = [...(_mon_data.indikator || [])];

  // Filter status
  if (_mon_status === 'terisi') rows = rows.filter(r => r.status === 'terisi');
  if (_mon_status === 'belum')  rows = rows.filter(r => r.status === 'belum');

  // Filter PJ (Bidang / Sub Bagian)
  if (_mon_pj) rows = rows.filter(r => r.penanggung_jawab === _mon_pj);

  // Filter User (PIC)
  if (_mon_user) rows = rows.filter(r => Array.isArray(r.pic_users) && r.pic_users.includes(_mon_user));

  // Filter search
  if (_mon_search) {
    const q = _mon_search.toLowerCase();
    rows = rows.filter(r =>
      (r.indikator_kinerja || '').toLowerCase().includes(q) ||
      (r.penanggung_jawab  || '').toLowerCase().includes(q) ||
      (Array.isArray(r.pic_users) ? r.pic_users.join(' ') : '').toLowerCase().includes(q)
    );
  }

  if (!rows.length) {
    body.innerHTML = `<tr><td colspan="${colCount}" style="text-align:center;padding:28px;color:#94a3b8">Tidak ada data sesuai filter.</td></tr>`;
    if (typeof renderPagination === 'function') renderPagination('monPagination', 0, 1, _MON_PER_PAGE, '_monGoPage');
    return;
  }

  // Pagination
  const total = rows.length;
  const pages = Math.ceil(total / _MON_PER_PAGE);
  if (_mon_page > pages) _mon_page = pages;
  const start = (_mon_page - 1) * _MON_PER_PAGE;
  rows = rows.slice(start, start + _MON_PER_PAGE);

  const fmtDT = iso => iso
    ? new Date(iso).toLocaleString('id-ID', { day:'2-digit', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit' }) + ' WITA'
    : '—';

  let html = '';
  let no = 0;
  let lastGroup = null;

  for (const r of rows) {
    // Group header row
    if (r.group_nama && r.group_nama !== lastGroup) {
      lastGroup = r.group_nama;
      html += `<tr style="background:#f1f5f9">
        <td colspan="${colCount}" style="padding:7px 12px;font-size:.73rem;font-weight:700;color:#475569;letter-spacing:.04em">
          ${escHtml(r.group_nama)}
        </td>
      </tr>`;
    }

    no++;
    const isTerisi = r.status === 'terisi';

    const statusBadge = isTerisi
      ? `<span style="display:inline-block;background:#dcfce7;color:#15803d;border-radius:6px;padding:3px 9px;font-size:.71rem;font-weight:700">Terinput</span>`
      : `<span style="display:inline-block;background:#fef2f2;color:#b91c1c;border-radius:6px;padding:3px 9px;font-size:.71rem;font-weight:700">Belum Input</span>`;

    const picList = Array.isArray(r.pic_users) ? r.pic_users.filter(Boolean) : [];
    const picInfo = picList.length
      ? picList.map(n => `<div style="font-size:.74rem;font-weight:600;color:#1e293b;line-height:1.4">${escHtml(n)}</div>`).join('')
        + (isTerisi && r.diisi_pada ? `<div style="font-size:.65rem;color:#94a3b8;margin-top:2px">${fmtDT(r.diisi_pada)}</div>` : '')
      : `<span style="font-size:.72rem;color:#94a3b8;font-style:italic">Belum ditugaskan</span>`;

    const jenisBadges = [
      r.jenis_monev ? `<span style="background:#dbeafe;color:#1d4ed8;border-radius:4px;padding:1px 5px;font-size:.63rem;font-weight:700">IKU</span>` : '',
      r.jenis_ikk   ? `<span style="background:#ede9fe;color:#7c3aed;border-radius:4px;padding:1px 5px;font-size:.63rem;font-weight:700">IKK</span>`   : '',
      r.jenis_spm   ? `<span style="background:#fef3c7;color:#b45309;border-radius:4px;padding:1px 5px;font-size:.63rem;font-weight:700">SPM</span>`   : '',
    ].filter(Boolean).join(' ');

    const capaian = r.capaian_persen != null
      ? `<span class="capaian-badge ${r.capaian_persen >= 100 ? 'ok' : r.capaian_persen >= 75 ? 'mid' : 'low'}">${r.capaian_persen}%</span>`
      : `<span class="capaian-badge na">—</span>`;

    const targetTx = escHtml(
      r.target_display != null ? String(r.target_display)
      : r.target_tahun  != null ? String(r.target_tahun)
      : '—'
    );
    const tipeInfo   = TIPE_PERHITUNGAN_INFO[r.tipe_perhitungan] || TIPE_PERHITUNGAN_INFO.non_kumulatif;
    const tipeBadge  = `<span data-tip="${escHtml(tipeInfo.title)}" style="display:inline-flex;align-items:center;background:${tipeInfo.bg};color:${tipeInfo.teks};border:1px solid ${tipeInfo.border};border-radius:4px;padding:1px 5px;font-size:.63rem;font-weight:700">${tipeInfo.label}</span>`;
    const maknaIcon = r.bermakna_negatif
      ? `<span data-tip="Bermakna Negatif" data-tip-variant="danger" style="display:inline-flex;align-items:center;justify-content:center;width:16px;height:16px;background:#fee2e2;border-radius:50%;margin-left:5px;vertical-align:middle;flex-shrink:0"><svg xmlns="http://www.w3.org/2000/svg" width="9" height="9" fill="none" viewBox="0 0 24 24" stroke="#991b1b" stroke-width="2.8"><path stroke-linecap="round" stroke-linejoin="round" d="M19 14l-7 7m0 0l-7-7m7 7V3"/></svg></span>`
      : `<span data-tip="Bermakna Positif" data-tip-variant="success" style="display:inline-flex;align-items:center;justify-content:center;width:16px;height:16px;background:#d1fae5;border-radius:50%;margin-left:5px;vertical-align:middle;flex-shrink:0"><svg xmlns="http://www.w3.org/2000/svg" width="9" height="9" fill="none" viewBox="0 0 24 24" stroke="#065f46" stroke-width="2.8"><path stroke-linecap="round" stroke-linejoin="round" d="M5 10l7-7m0 0l7 7m-7-7v18"/></svg></span>`;

    // Kolom bulan (hanya saat mode semua bulan)
    const bulanCell = isAllBulan
      ? `<td style="text-align:center;font-size:.75rem;font-weight:600;color:#475569;padding:10px 8px;white-space:nowrap">
           ${r.bulan ? _MON_BULAN_NAMA[r.bulan] : '—'}
         </td>`
      : '';

    html += `<tr style="${isTerisi ? '' : 'background:#fffbf7'}">
      <td style="text-align:center;font-size:.78rem;color:#94a3b8;padding:10px 8px">${no}</td>
      <td style="padding:10px 10px">
        <div style="font-size:.82rem;font-weight:600;color:#1e293b;line-height:1.4;white-space:normal;word-break:break-word"><span>${escHtml(r.indikator_kinerja)}</span>${maknaIcon}</div>
        <div style="margin-top:3px;display:flex;align-items:center;gap:3px;flex-wrap:wrap">${tipeBadge}${jenisBadges}</div>
      </td>
      <td style="font-size:.78rem;color:#64748b;padding:10px 8px;word-break:break-word;white-space:normal">${escHtml(r.penanggung_jawab || '—')}</td>
      <td style="font-size:.78rem;padding:10px 8px;white-space:nowrap">${targetTx}</td>
      ${bulanCell}
      <td style="text-align:center;padding:10px 8px">${statusBadge}</td>
      <td style="padding:10px 8px">${picInfo}</td>
      <td style="text-align:center;padding:10px 8px">${capaian}</td>
    </tr>`;
  }

  body.innerHTML = html;

  // Render pagination
  if (typeof renderPagination === 'function') renderPagination('monPagination', total, _mon_page, _MON_PER_PAGE, '_monGoPage');
}

// ── Filter handlers ───────────────────────────────────────────────────────
function setMonBulan(b) {
  _mon_bulan = b === '' ? '' : parseInt(b);
  _monSyncBulanBtn();
  loadMonitoringKinerja();
}

function setMonTahun(t) {
  _mon_tahun = t === '' ? '' : parseInt(t);
  // Re-populate bulan sesuai tahun yang dipilih
  _monPopulateBulan();
  loadMonitoringKinerja();
}

function setMonFilterJenis(j) {
  _mon_jenis = j === '' ? 'all' : j;
  _monSyncJenisBtn();
  loadMonitoringKinerja();
}

function setMonFilterStatus(s) {
  _mon_page = 1;
  _mon_status = s === '' ? 'all' : s;
  _monSyncStatusBtn();
  _monRenderTable();
}

function setMonPJ(pj) {
  _mon_page = 1;
  _mon_pj = _mon_pj === pj ? '' : pj;
  _mon_user = ''; // reset filter user saat ganti bidang
  _monRenderPJCards();
  _monPopulateUserSelect();
  _monRenderUserCards();
  _monRenderTable();
}

function setMonUser(u) {
  _mon_page = 1;
  _mon_user = u || '';
  _monPopulateUserSelect();
  _monRenderUserCards();
  _monRenderTable();
}

function setMonSearch(val) {
  _mon_page = 1;
  _mon_search = (val || '').trim();
  _monRenderTable();
}

// ── Sync tombol aktif ─────────────────────────────────────────────────────
function _monSyncBulanBtn() {
  const sel = document.getElementById('monBulanSelect');
  if (sel) sel.value = _mon_bulan === '' ? '' : _mon_bulan;
  if (typeof syncCustomSelect === 'function') syncCustomSelect('monBulanSelect');
}

function _monSyncJenisBtn() {
  const sel = document.getElementById('monJenisSelect');
  if (sel) sel.value = (_mon_jenis === 'all') ? '' : _mon_jenis;
  if (typeof syncCustomSelect === 'function') syncCustomSelect('monJenisSelect');
}

function _monSyncStatusBtn() {
  const sel = document.getElementById('monStatusSelect');
  if (sel) sel.value = (_mon_status === 'all') ? '' : _mon_status;
  if (typeof syncCustomSelect === 'function') syncCustomSelect('monStatusSelect');
}

// ═══════════════════════════════════════════════════════════════════════════
// SPM — Standar Pelayanan Minimal
// ═══════════════════════════════════════════════════════════════════════════

async function initSpmControls() {
  if (!_periodeListTerbuka.length) {
    try {
      const r = await fetch('/api/periode/aktif');
      if (r.ok) {
        const d = await r.json();
        _periodeListTerbuka = d.periode || [];
      }
    } catch { _periodeListTerbuka = []; }
  }
  await _ensureUserIndikatorIds();
  if (_user?.is_admin && !_allPeriodeList.length) {
    try {
      const r = await fetch('/api/periode', { headers: authHeaders() });
      if (r.ok) {
        const d = await r.json();
        _allPeriodeList = d.periode || [];
      }
    } catch {}
  }
  const _spmTerbuka = _periodeListTerbuka.filter(p => p.jenis === 'spm')
    .sort((a, b) => a.tahun !== b.tahun ? a.tahun - b.tahun : a.bulan - b.bulan);
  if (_spmTerbuka.length) {
    _spm_tahun = _spmTerbuka[0].tahun;
    _spm_bulan = _spmTerbuka[0].bulan;
  } else if (_user?.is_admin) {
    _spm_tahun = new Date().getFullYear();
    _spm_bulan = new Date().getMonth() + 1;
  }
  if (_user?.is_admin) {
    _populateTahunSelector('spmTahunSelect', _spm_tahun, setSpmTahun);
    const tw = document.getElementById('spmTahunWrap');
    if (tw) tw.style.display = 'flex';
  } else if (_spmTerbuka.length) {
    // Non-admin: populate dropdown tahun (hanya tahun-tahun yang punya periode spm terbuka)
    const _tahunNonAdmin = [...new Set(_spmTerbuka.map(p => p.tahun))].sort((a, b) => a - b);
    _populateTahunSelector('spmTahunSelect', _spm_tahun, setSpmTahun, _tahunNonAdmin);
  }
  _syncSpmBulanButtons();
  _renderSpmPeriodeInfo();
  _renderKinerjaCountdown && _renderKinerjaCountdown('spmCountdownBar', 'spm');
}

function setSpmTahun(tahun) {
  _spm_tahun = tahun;
  if (_user?.is_admin) {
    _populateTahunSelector('spmTahunSelect', _spm_tahun, setSpmTahun);
  } else {
    // Non-admin: pilih bulan pertama yang periodenya terbuka untuk tahun ini
    const periodeThnIni = _periodeListTerbuka.filter(p => p.jenis === 'spm' && p.tahun === tahun)
      .sort((a, b) => a.bulan - b.bulan);
    if (periodeThnIni.length) _spm_bulan = periodeThnIni[0].bulan;
  }
  _syncSpmBulanButtons();
  _renderSpmPeriodeInfo();
  _renderKinerjaCountdown && _renderKinerjaCountdown('spmCountdownBar', 'spm');
  loadSpmRekap();
}

function setSpmBulan(bulan) {
  if (!_user?.is_admin) {
    const bulanTerbuka = new Set(_periodeListTerbuka.filter(p => p.jenis === 'spm').map(p => p.bulan));
    if (!bulanTerbuka.has(bulan)) return;
    const periodeMatch = _periodeListTerbuka.find(p => p.jenis === 'spm' && p.bulan === bulan);
    if (periodeMatch) _spm_tahun = periodeMatch.tahun;
  }
  _spm_bulan = bulan;
  _syncSpmBulanButtons();
  _renderSpmPeriodeInfo();
  _renderKinerjaCountdown && _renderKinerjaCountdown('spmCountdownBar', 'spm');
  loadSpmRekap();
}

function _syncSpmBulanButtons() {
  const sel = document.getElementById('spmBulanSelector');
  if (!sel) return;
  const bulanTerbuka = new Set(_periodeListTerbuka.filter(p => p.jenis === 'spm').map(p => p.bulan));
  const items = [];
  for (let bulan = 1; bulan <= 12; bulan++) {
    const isTampil = _user?.is_admin ? true : bulanTerbuka.has(bulan);
    if (!isTampil) continue;
    const periodeMatch = _user?.is_admin
      ? _allPeriodeList.find(p => p.jenis === 'spm' && p.bulan === bulan && p.tahun === _spm_tahun)
      : _periodeListTerbuka.find(p => p.jenis === 'spm' && p.bulan === bulan);
    const tahunLabel = periodeMatch ? periodeMatch.tahun : _spm_tahun;
    items.push({ bulan, tahun: tahunLabel });
  }
  items.sort((a, b) => _user?.is_admin ? (a.bulan - b.bulan) : ((a.tahun * 100 + a.bulan) - (b.tahun * 100 + b.bulan)));
  sel.innerHTML = items.map(it =>
    `<option value="${it.bulan}"${it.bulan === _spm_bulan ? ' selected' : ''}>${BULAN_FULL[it.bulan]}</option>`
  ).join('');
  sel.onchange = () => setSpmBulan(parseInt(sel.value));
  if (typeof syncCustomSelect === 'function') syncCustomSelect('spmBulanSelector');
}

function _renderSpmPeriodeInfo() {
  const el       = document.getElementById('spmActivePeriodeInfo');
  const wrapper  = document.getElementById('spmBulanWrapper');
  const tahunWrap = document.getElementById('spmTahunWrap');

  // Badge teks "Periode input: ..." sudah tidak dipakai — selalu pakai dropdown tahun & bulan
  if (el) el.style.display = 'none';

  if (_user?.is_admin) {
    if (wrapper) wrapper.style.display = '';
    if (tahunWrap) tahunWrap.style.display = 'flex';
    return;
  }

  const _spmAktif = _periodeListTerbuka.filter(p => p.jenis === 'spm');
  if (_spmAktif.length === 0) {
    if (wrapper) wrapper.style.display = 'none';
    return;
  }
  if (wrapper) wrapper.style.display = '';
  if (tahunWrap) tahunWrap.style.display = 'flex';
}

async function loadSpmRekap() {
  const tbody = document.getElementById('spmTableBody');
  if (!tbody) return;

  if (!_user?.is_admin && !_periodeListTerbuka.some(p => p.jenis === 'spm')) {
    const tableCard = tbody.closest('.card');
    if (tableCard) tableCard.style.display = 'none';
    let msgEl = document.getElementById('spmNoperiodeMsg');
    if (!msgEl) {
      msgEl = document.createElement('div');
      msgEl.id = 'spmNoperiodeMsg';
      tableCard ? tableCard.parentNode.insertBefore(msgEl, tableCard) : tbody.parentNode.insertBefore(msgEl, tbody.parentNode.firstChild);
    }
    msgEl.innerHTML = `
      <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;gap:10px;padding:48px 20px;color:#94a3b8;background:#fff;border-radius:12px;border:1.5px solid #f1f5f9">
        <svg xmlns="http://www.w3.org/2000/svg" width="44" height="44" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.2" opacity=".35">
          <path stroke-linecap="round" stroke-linejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/>
        </svg>
        <div style="font-size:.95rem;font-weight:600;color:#64748b">Belum ada periode input yang aktif</div>
        <div style="font-size:.82rem;color:#94a3b8;text-align:center">Input data SPM belum dapat dilakukan.<br>Hubungi Admin untuk membuka periode pengisian.</div>
      </div>`;
    msgEl.style.display = '';
    return;
  }
  const _tableCard = tbody.closest('.card');
  if (_tableCard) _tableCard.style.display = '';
  const _msgEl = document.getElementById('spmNoperiodeMsg');
  if (_msgEl) _msgEl.style.display = 'none';

  tbody.innerHTML = `<tr class="empty-row"><td colspan="11"><span class="btn-spin" style="width:11px;height:11px;vertical-align:-1px;margin-right:6px"></span>Memuat data...</td></tr>`;
  try {
    const r = await fetch(`/api/kinerja/rekap?bulan=${_spm_bulan}&tahun=${_spm_tahun}&jenis=spm`, { headers: authHeaders() });
    const d = await r.json();
    if (!r.ok) { tbody.innerHTML = `<tr class="empty-row"><td colspan="11">${d.error || 'Gagal memuat'}</td></tr>`; return; }
    let rekap = d.rekap || [];

    // Filter per assigned indikator user (non-admin hanya lihat indikator yg di-assign)
    if (!_user?.is_admin) {
      if (_userIndikatorIds && _userIndikatorIds.size > 0) {
        rekap = rekap.filter(row => _userIndikatorIds.has(Number(row.id)));
      } else {
        rekap = [];
      }
    }
    _spmData = rekap;
    _spmPage = 1;
    _renderSpmTable(tbody);
  } catch (err) {
    tbody.innerHTML = `<tr class="empty-row"><td colspan="11">Error: ${err.message}</td></tr>`;
  }
}

// Dipanggil dari input #spmSearch (sejajar Tahun/Bulan) — filter tabel rekap SPM
function filterSpmTable() {
  _spmSearch = (document.getElementById('spmSearch')?.value || '').trim().toLowerCase();
  _spmPage = 1;
  _renderSpmTable(document.getElementById('spmTableBody'));
}

function _renderSpmTable(tbody) {
  if (!_spmData.length) {
    let emptyMsg = 'Belum ada indikator SPM aktif. Admin perlu menambahkan indikator dengan jenis SPM.';
    if (!_user?.is_admin) {
      if (!_userIndikatorIds || _userIndikatorIds.size === 0) {
        emptyMsg = 'Belum ada indikator yang di-assign ke akun Anda. Hubungi Admin untuk mengatur assignment indikator.';
      } else {
        emptyMsg = 'Tidak ada indikator SPM yang di-assign ke akun Anda pada periode ini.';
      }
    }
    tbody.innerHTML = `<tr class="empty-row"><td colspan="11">${emptyMsg}</td></tr>`;
    return;
  }

  const _filtered = _spmSearch
    ? _spmData.filter(row =>
        (row.nama_indikator || row.indikator_kinerja || '').toLowerCase().includes(_spmSearch) ||
        (row.satuan || '').toLowerCase().includes(_spmSearch) ||
        (row.penanggung_jawab || '').toLowerCase().includes(_spmSearch)
      )
    : _spmData;

  if (!_filtered.length) {
    tbody.innerHTML = `<tr class="empty-row"><td colspan="11">Tidak ada indikator yang cocok dengan pencarian "${escHtml(_spmSearch)}".</td></tr>`;
    renderPagination('spmPagination', 0, 1, _spmPageSize, '_goSpmPage');
    return;
  }

  const canEdit = _isKinerjaInputOpen(null, 'spm');
  let html = '';
  const _spmStart = (_spmPage - 1) * _spmPageSize;
  const _spmRows  = _filtered.slice(_spmStart, _spmStart + _spmPageSize);
  let i = _spmStart;

  _spmRows.forEach(row => {
    i++;
    const capaian = (row.realisasi_id && row.capaian_persen != null) ? Number(row.capaian_persen) : null;
    let badgeClass = 'na', badgeText = '—';
    if (capaian !== null && !isNaN(capaian)) {
      badgeText = capaian.toFixed(1) + '%';
      badgeClass = capaian >= 91 ? 'st' : capaian >= 76 ? 'ti' : capaian >= 66 ? 'sd' : capaian >= 51 ? 'rd' : 'sr';
    }
    const _targetNum = row.target_tahun != null ? Number(row.target_tahun) : null;
    const targetFmt = row.target_display != null
      ? String(row.target_display)
      : (_targetNum != null && !isNaN(_targetNum)
          ? (Number.isInteger(_targetNum) ? String(_targetNum) : _targetNum.toFixed(2))
          : '—');
    const rowStateClass = row.realisasi_id ? 'row-state-saved' : 'row-state-default';
    html += `<tr data-id="${row.id}" class="${rowStateClass}">
      <td class="td-sticky-no" style="text-align:center;color:var(--teks-muted);position:sticky;left:0;z-index:3">${i}</td>
      <td class="td-sticky-name" style="position:sticky;left:34px;z-index:3"><div style="font-weight:600;line-height:1.6"><span>${escHtml(row.nama_indikator || row.indikator_kinerja || '')}</span>${row.bermakna_negatif ? `<span data-tip="Bermakna Negatif" data-tip-variant="danger" style="display:inline-flex;align-items:center;justify-content:center;width:16px;height:16px;background:#fee2e2;border-radius:50%;margin-left:5px;vertical-align:middle;flex-shrink:0"><svg xmlns=\"http://www.w3.org/2000/svg\" width=\"9\" height=\"9\" fill=\"none\" viewBox=\"0 0 24 24\" stroke=\"#991b1b\" stroke-width=\"2.8\"><path stroke-linecap=\"round\" stroke-linejoin=\"round\" d=\"M19 14l-7 7m0 0l-7-7m7 7V3\"/></svg></span>` : `<span data-tip="Bermakna Positif" data-tip-variant="success" style="display:inline-flex;align-items:center;justify-content:center;width:16px;height:16px;background:#d1fae5;border-radius:50%;margin-left:5px;vertical-align:middle;flex-shrink:0"><svg xmlns=\"http://www.w3.org/2000/svg\" width=\"9\" height=\"9\" fill=\"none\" viewBox=\"0 0 24 24\" stroke=\"#065f46\" stroke-width=\"2.8\"><path stroke-linecap=\"round\" stroke-linejoin=\"round\" d=\"M5 10l7-7m0 0l7 7m-7-7v18\"/></svg></span>`}</div><div style="display:flex;align-items:center;gap:6px;margin-top:5px">${row.formula ? `<div class="fx-wrap"><button style="display:inline-flex;align-items:center;justify-content:center;gap:4px;box-sizing:border-box;height:24px;font-size:0.62rem;font-weight:700;line-height:1;color:#0f766e;background:#f0fdfa;border:1px solid #99f6e4;border-radius:4px;padding:0 8px;cursor:pointer;font-family:inherit;appearance:none;-webkit-appearance:none;margin:0" data-tip="Lihat formula perhitungan" data-formula="${escHtml(row.formula)}" onclick="toggleFormulaPanel(this)"><span>Σ</span><span class=\"fx-arrow\" style=\"display:inline-block;transition:transform .2s;font-style:normal\">▾</span></button></div>` : ''}${_tipeBadge(row.tipe_perhitungan)}</div></td>
      <td class="td-satuan">${escHtml(row.satuan || '')}</td>
      <td class="td-target" style="font-weight:700">${targetFmt}</td>
      ${_user?.is_admin ? `<td class="td-bidang" style="color:var(--teks-mid)">${escHtml(row.penanggung_jawab || '—')}</td>` : ''}
      <td class="realisasi-input-cell">
        ${_renderRealisasiInputCell(row, 'spm_real', 'markSpmDirty')}
      </td>
      <td style="text-align:center">
        <span class="capaian-badge ${badgeClass}" id="spm_badge_${row.id}">${badgeText}</span>
      </td>
      <td class="textarea-cell" style="text-align:left;vertical-align:top">
        ${_renderPSCell('spm_fpenghambat', row.id, row.f_penghambat, capaian, canEdit, 'faktor penghambat', 'markSpmDirty', !!row.realisasi_id, false, row.tipe_nilai === 'predikat', row.realisasi == null && !row.realisasi_id)}
      </td>
      <td class="textarea-cell" style="text-align:left;vertical-align:top">
        ${_renderPSCell('spm_solusi', row.id, row.solusi, capaian, canEdit, 'solusi', 'markSpmDirty', !!row.realisasi_id, false, row.tipe_nilai === 'predikat', row.realisasi == null && !row.realisasi_id)}
      </td>
      <td class="textarea-cell" style="text-align:left;vertical-align:top">
        ${_renderPSCell('spm_fpendukung', row.id, row.f_pendukung, capaian, canEdit, 'faktor pendukung', 'markSpmDirty', !!row.realisasi_id, true, row.tipe_nilai === 'predikat', row.realisasi == null && !row.realisasi_id)}
      </td>
      <td class="textarea-cell" style="text-align:left;vertical-align:top">
        ${_renderPSCell('spm_rencana', row.id, row.rencana_tl, capaian, canEdit, 'rencana tindak lanjut', 'markSpmDirty', !!row.realisasi_id, true, row.tipe_nilai === 'predikat', row.realisasi == null && !row.realisasi_id)}
      </td>
      <td style="text-align:center" data-col="dukung">
        ${_renderDukungBtn(row, _spm_bulan, _spm_tahun, 'spm', !row.realisasi_id)}
      </td>
      <td style="text-align:center;white-space:nowrap">
        ${canEdit ? `
          <button class="btn-edit-row" id="spm_editbtn_${row.id}" data-tip="Edit baris ini"
            onclick="toggleSpmEditRow(${row.id})"
            style="${row.realisasi_id ? '' : 'display:none'}">
            <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>
            Edit
          </button>
          <button class="save-row-btn" id="spm_savebtn_${row.id}" disabled
            onclick="saveSpmRealisasiRow(${row.id})" data-tip="Simpan"
            style="font-family:'Plus Jakarta Sans',sans-serif!important;${row.realisasi_id ? 'background:var(--sukses);color:#fff' : ''}">
            ${row.realisasi_id
  ? '<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M15.2 3a2 2 0 0 1 1.4.6l3.8 3.8a2 2 0 0 1 .6 1.4V19a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z"/><path d="M17 21v-7a1 1 0 0 0-1-1H8a1 1 0 0 0-1 1v7"/><path d="M7 3v4a1 1 0 0 0 1 1h7"/></svg> Tersimpan'
  : '<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M15.2 3a2 2 0 0 1 1.4.6l3.8 3.8a2 2 0 0 1 .6 1.4V19a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z"/><path d="M17 21v-7a1 1 0 0 0-1-1H8a1 1 0 0 0-1 1v7"/><path d="M7 3v4a1 1 0 0 0 1 1h7"/></svg> Simpan'}
          </button>
        ` : ''}
        ${_user?.is_admin && row.realisasi_id ? `
          <button class="btn-reset-row" id="spm_resetbtn_${row.id}" data-tip="Reset data realisasi baris ini (admin)"
            onclick="resetRealisasiRow(${row.id}, 'spm')">
            <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg>
            Reset
          </button>
        ` : ''}
      </td>
    </tr>`;
  });
  tbody.innerHTML = html;
  if (typeof window.initCustomSelects === 'function') window.initCustomSelects();
  // Toggle header kolom Bidang / Sub Bagian (hanya tampil untuk admin)
  document.querySelectorAll('.col-bidang-spm').forEach(el => {
    el.style.display = _user?.is_admin ? '' : 'none';
  });
  renderPagination('spmPagination', _filtered.length, _spmPage, _spmPageSize, '_goSpmPage');
  // Warning "Belum diupload" untuk baris yang tersimpan tapi belum ada file dukung
  if (canEdit) {
    _spmData.forEach(row => {
      if (row.realisasi_id && !row.data_dukung_url) {
        const dukungCell = document.querySelector(`tr[data-id="${row.id}"] td[data-col="dukung"]`);
        if (dukungCell && !dukungCell.querySelector('.dukung-warning')) {
          dukungCell.insertAdjacentHTML('beforeend', `
            <div class="dukung-warning" data-tip="Data dukung belum diupload untuk indikator ini">
              <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/></svg>
              Belum diupload
            </div>`);
        }
      }
    });
  }
}

function toggleSpmEditRow(indikatorId) {
  if (!_user?.is_admin && !_isKinerjaInputOpen(null, 'spm')) {
    const pa = _periodeListTerbuka.find(p => p.jenis === 'spm' && p.bulan === _spm_bulan) ?? null;
    const close = pa?.close_at ? new Date(pa.close_at) : null;
    if (close && new Date() > close) {
      toast('Periode input sudah ditutup. Data tidak dapat diubah.', 'error');
    } else {
      toast('Periode input belum dibuka.', 'info');
    }
    return;
  }

  const realEl  = document.getElementById(`spm_real_${indikatorId}`);
  const probEl  = document.getElementById(`spm_fpenghambat_${indikatorId}`);
  const solEl   = document.getElementById(`spm_solusi_${indikatorId}`);
  const pendEl  = document.getElementById(`spm_fpendukung_${indikatorId}`);
  const rtlEl   = document.getElementById(`spm_rencana_${indikatorId}`);
  const editBtn = document.getElementById(`spm_editbtn_${indikatorId}`);
  const saveBtn = document.getElementById(`spm_savebtn_${indikatorId}`);
  const tr      = document.querySelector(`tr[data-id="${indikatorId}"]`);
  const isReadonly = realEl?.hasAttribute('readonly');

  [realEl, probEl, solEl, pendEl, rtlEl].forEach(el => {
    if (!el) return;
    if (isReadonly) {
      el.removeAttribute('readonly');
      if (el.tagName === 'SELECT') el.disabled = false; // predikat: <select> pakai disabled, bukan readonly
      if (el.classList.contains('ps-rte')) el.contentEditable = 'true';
      el.style.background = 'var(--putih)';
      el.style.cursor = '';
      el.style.resize = '';
      el.dataset.tip = '';
    } else {
      el.setAttribute('readonly', '');
      if (el.tagName === 'SELECT') el.disabled = true; // predikat: kunci balik pakai disabled
      if (el.classList.contains('ps-rte')) el.contentEditable = 'false';
      el.style.background = '';
      el.style.cursor = 'not-allowed';
      if (el.tagName === 'TEXTAREA') el.style.resize = 'none';
      el.dataset.tip = 'Klik tombol Edit untuk mengisi';
    }
  });


  // Switch ps-cell-wrap antara view mode (ps-read) dan edit mode (textarea)
  const psCells = document.querySelectorAll(`tr[data-id="${indikatorId}"] .ps-cell-wrap`);
  psCells.forEach(wrap => {
    const readEl = wrap.querySelector('.ps-read');
    const taEl   = wrap.querySelector('.ps-rte');
    if (!taEl) return;
    if (isReadonly) {
      // Masuk edit mode: sembunyikan view, tampilkan editor — skip wrap yg hidden
      if (wrap.style.display === 'none') return;
      if (readEl) readEl.style.display = 'none';
      taEl.style.display = '';
      taEl.contentEditable = 'true';
    } else {
      // Keluar edit mode: update view text lalu tampilkan kembali
      const val = taEl.value || '';
      const LIMIT = 80;
      const shortEl = wrap.querySelector('[id$="short_' + indikatorId + '"]');
      const fullEl  = wrap.querySelector('[id$="full_' + indikatorId + '"]');
      const moreBtn = wrap.querySelector('.ps-more-btn');
      if (shortEl) { shortEl.innerHTML = _mdToHtmlDisplay(val.slice(0, LIMIT)); shortEl.style.display = ''; }
      if (fullEl)  { fullEl.innerHTML = _mdToHtmlDisplay(val); fullEl.style.display = 'none'; }
      if (moreBtn) { moreBtn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9l6 6 6-6"/></svg>'; moreBtn.setAttribute('data-tip','Selengkapnya'); moreBtn.style.display = val.length > LIMIT ? '' : 'none'; }
      if (readEl)  { readEl.style.display = val.trim() ? '' : 'none'; }
      taEl.style.display = 'none';
      taEl.setAttribute('readonly', '');
      taEl.contentEditable = 'false';
      taEl.style.cursor = 'not-allowed';
    }
  });
  // Unlock / lock tombol data dukung
  const dukungBtn     = document.querySelector(`[data-dukung-id="${indikatorId}"] .dukung-uploaded-btn`);
  const uploadOnlyBtn = document.querySelector(`tr[data-id="${indikatorId}"] .dukung-upload-btn`);
  const deleteBtn     = document.querySelector(`tr[data-id="${indikatorId}"] .dukung-delete-btn`);

  if (dukungBtn) {
    if (isReadonly) {
      dukungBtn.disabled = false;
      dukungBtn.style.cursor = 'pointer';
      dukungBtn.style.opacity = '1';
      dukungBtn.dataset.tip = 'Kelola / ganti file data dukung';
      const twV = dukungBtn.dataset.tw;
      const tahunV = dukungBtn.dataset.tahun;
      dukungBtn.onclick = () => openSpmDukungModal(indikatorId, parseInt(twV), parseInt(tahunV));
    } else {
      dukungBtn.disabled = true;
      dukungBtn.style.cursor = 'not-allowed';
      dukungBtn.style.opacity = '.85';
      dukungBtn.dataset.tip = 'Klik Edit terlebih dahulu untuk mengganti file';
      dukungBtn.onclick = null;
    }
  }

  if (deleteBtn) {
    if (isReadonly) {
      deleteBtn.disabled = false;
      deleteBtn.style.cursor = 'pointer';
      deleteBtn.style.opacity = '1';
      deleteBtn.dataset.tip = 'Hapus semua file data dukung';
      const twV    = deleteBtn.dataset.tw;
      const tahunV = deleteBtn.dataset.tahun;
      const srcV   = deleteBtn.dataset.source;
      deleteBtn.onclick = () => deleteDukungAll(indikatorId, parseInt(twV), parseInt(tahunV), srcV);
    } else {
      deleteBtn.disabled = true;
      deleteBtn.style.cursor = 'not-allowed';
      deleteBtn.style.opacity = '.5';
      deleteBtn.dataset.tip = 'Klik Edit terlebih dahulu untuk menghapus file';
      deleteBtn.onclick = null;
    }
  }

  if (uploadOnlyBtn) {
    if (isReadonly) {
      uploadOnlyBtn.disabled = false;
      uploadOnlyBtn.style.cursor = 'pointer';
      uploadOnlyBtn.style.opacity = '1';
      uploadOnlyBtn.style.borderStyle = 'solid';
      uploadOnlyBtn.dataset.tip = 'Upload file data dukung';
      const twV    = uploadOnlyBtn.dataset.tw;
      const tahunV = uploadOnlyBtn.dataset.tahun;
      const src    = uploadOnlyBtn.dataset.source;
      uploadOnlyBtn.onclick = () => triggerDukungUpload(indikatorId, parseInt(twV), parseInt(tahunV), src);
    } else {
      uploadOnlyBtn.disabled = true;
      uploadOnlyBtn.style.cursor = 'not-allowed';
      uploadOnlyBtn.style.opacity = '.65';
      uploadOnlyBtn.style.borderStyle = 'dashed';
      uploadOnlyBtn.dataset.tip = 'Klik Edit terlebih dahulu untuk mengupload file';
      uploadOnlyBtn.onclick = null;
    }
  }

  if (isReadonly) {
    if (tr) { tr.classList.remove('row-state-default', 'row-state-saved'); tr.classList.add('row-state-editing'); }
    if (editBtn) {
      editBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg> Sedang Diedit`;
      editBtn.classList.add('btn-edit-row--active');
      editBtn.dataset.tip = 'Klik untuk batalkan edit';
    }
    if (saveBtn) {
      saveBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M15.2 3a2 2 0 0 1 1.4.6l3.8 3.8a2 2 0 0 1 .6 1.4V19a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z"/><path d="M17 21v-7a1 1 0 0 0-1-1H8a1 1 0 0 0-1 1v7"/><path d="M7 3v4a1 1 0 0 0 1 1h7"/></svg> Simpan`;
      saveBtn.disabled = true;
      saveBtn.style.background = '';
      saveBtn.style.color = '';
    }
    if (realEl) realEl.focus();
    _updateSpmSaveBtnState(indikatorId);
  } else {
    const row = _spmData.find(r => r.id === indikatorId);
    if (tr) { tr.classList.remove('row-state-editing'); tr.classList.add(row?.realisasi_id ? 'row-state-saved' : 'row-state-default'); }
    if (editBtn) {
      editBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg> Edit`;
      editBtn.classList.remove('btn-edit-row--active');
      editBtn.dataset.tip = 'Edit baris ini';
    }
    if (saveBtn) {
      saveBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M15.2 3a2 2 0 0 1 1.4.6l3.8 3.8a2 2 0 0 1 .6 1.4V19a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z"/><path d="M17 21v-7a1 1 0 0 0-1-1H8a1 1 0 0 0-1 1v7"/><path d="M7 3v4a1 1 0 0 0 1 1h7"/></svg> Simpan`;
      saveBtn.style.background = '';
      saveBtn.style.color = '';
      saveBtn.disabled = true;
    }
  }
}

function markSpmDirty(indikatorId) {
  previewSpmCapaian(indikatorId);
  _updateSpmSaveBtnState(indikatorId);
}

function _updateSpmSaveBtnState(indikatorId) {
  const btn = document.getElementById(`spm_savebtn_${indikatorId}`);
  if (!btn) return;
  const row  = _spmData.find(r => r.id === indikatorId);
  const fieldArgs = {
    row,
    realVal: document.getElementById(`spm_real_${indikatorId}`)?.value,
    targetVal: _targetNumForRow(row),
    bermakna_negatif: row?.bermakna_negatif,
    fpenghambatVal: document.getElementById(`spm_fpenghambat_${indikatorId}`)?.value ?? '',
    solusiVal:      document.getElementById(`spm_solusi_${indikatorId}`)?.value ?? '',
    fpendukungVal:  document.getElementById(`spm_fpendukung_${indikatorId}`)?.value ?? '',
    rencanaVal:     document.getElementById(`spm_rencana_${indikatorId}`)?.value ?? '',
    hasDukung:      !!row?.data_dukung_url,
  };
  const ok = _canSaveRow(fieldArgs);
  const okUpload = _canSaveRow(fieldArgs, false);
  btn.disabled         = !ok;
  btn.style.background = ok ? '#0d9488' : '';
  btn.style.color      = ok ? '#fff'    : '';
  btn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M15.2 3a2 2 0 0 1 1.4.6l3.8 3.8a2 2 0 0 1 .6 1.4V19a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z"/><path d="M17 21v-7a1 1 0 0 0-1-1H8a1 1 0 0 0-1 1v7"/><path d="M7 3v4a1 1 0 0 0 1 1h7"/></svg> Simpan`;

  // Enable/disable tombol Upload berdasarkan kondisi field wajib
  const _uploadBtn_spm = document.querySelector(`tr[data-id="${indikatorId}"] .dukung-upload-btn`);
  if (_uploadBtn_spm && !_uploadBtn_spm.classList.contains('dukung-uploaded-btn')) {
    if (okUpload) {
      _uploadBtn_spm.disabled = false;
      _uploadBtn_spm.style.cursor = 'pointer';
      _uploadBtn_spm.style.opacity = '1';
      _uploadBtn_spm.style.borderStyle = 'dashed';
      _uploadBtn_spm.style.borderColor = '#6ee7b7';
      _uploadBtn_spm.style.background = '#ecfdf5';
      _uploadBtn_spm.style.color = '#065f46';
      _uploadBtn_spm.dataset.tip = 'Upload data dukung';
      _uploadBtn_spm.onclick = () => _openDukungFromBtn(_uploadBtn_spm);
    } else {
      _uploadBtn_spm.disabled = true;
      _uploadBtn_spm.style.cursor = 'not-allowed';
      _uploadBtn_spm.style.opacity = '.65';
      _uploadBtn_spm.style.borderStyle = 'dashed';
      _uploadBtn_spm.style.borderColor = '#fca5a5';
      _uploadBtn_spm.style.background = '#fee2e2';
      _uploadBtn_spm.style.color = '#991b1b';
      _uploadBtn_spm.dataset.tip = 'Isi realisasi dan field wajib terlebih dahulu';
      _uploadBtn_spm.onclick = null;
    }
  }
}

function previewSpmCapaian(indikatorId) {
  const row = _spmData.find(r => r.id === indikatorId);
  if (!row) return;
  const realEl = document.getElementById(`spm_real_${indikatorId}`);
  if (!realEl) return;
  const realisasi = parseFloat(realEl.value);
  const target    = _targetNumForRow(row);
  const badge     = document.getElementById(`spm_badge_${indikatorId}`);
  if (!badge) return;
  if (isNaN(realisasi) || isNaN(target) || target === 0) {
    badge.textContent = '—'; badge.className = 'capaian-badge na';
    _togglePermasalahanSolusi('spm', indikatorId, null);
    return;
  }
  let capaian = row.bermakna_negatif
    ? ((target - (_hitungRealisasiEfektifPreview(row, realisasi) - target)) / target) * 100
    : (_hitungRealisasiEfektifPreview(row, realisasi) / target) * 100;
  badge.textContent = capaian.toFixed(1) + '%';
  badge.className = 'capaian-badge ' + (capaian >= 91 ? 'st' : capaian >= 76 ? 'ti' : capaian >= 66 ? 'sd' : capaian >= 51 ? 'rd' : 'sr');
  _togglePermasalahanSolusi('spm', indikatorId, capaian);
}

async function saveSpmRealisasiRow(indikatorId) {
  const btn    = document.getElementById(`spm_savebtn_${indikatorId}`);
  const realEl = document.getElementById(`spm_real_${indikatorId}`);
  const real   = realEl?.value;
  let fpenghambat = document.getElementById(`spm_fpenghambat_${indikatorId}`)?.value?.trim();
  let solusi      = document.getElementById(`spm_solusi_${indikatorId}`)?.value?.trim();
  let fpendukung  = document.getElementById(`spm_fpendukung_${indikatorId}`)?.value?.trim();
  let rencana     = document.getElementById(`spm_rencana_${indikatorId}`)?.value?.trim();

  const row = _spmData.find(r => r.id === indikatorId);
  // Validasi field wajib — hitung capaian dari nilai input vs target
  // (untuk kumulatif/rata_rata, pakai basis efektif lintas bulan, bukan angka bulan ini saja)
  const _realVal   = parseFloat(real);
  const _targetVal = _targetNumForRow(row);
  if (!isNaN(_realVal) && !isNaN(_targetVal) && _targetVal !== 0) {
    const _realEfektif = _hitungRealisasiEfektifPreview(row, _realVal);
    const _capaian = row?.bermakna_negatif
      ? ((_targetVal - (_realEfektif - _targetVal)) / _targetVal) * 100
      : (_realEfektif / _targetVal) * 100;
    if (_capaian < 100) {
      if (!fpenghambat || _isSymbolOnly(fpenghambat)) { toast('Faktor Penghambat wajib diisi, tidak boleh hanya simbol/tanda baca.', 'error'); return; }
      if (!solusi || _isSymbolOnly(solusi))           { toast('Solusi wajib diisi, tidak boleh hanya simbol/tanda baca.', 'error'); return; }
      fpendukung = ''; rencana = '';
    } else {
      if (!fpendukung || _isSymbolOnly(fpendukung)) { toast('Faktor Pendukung wajib diisi, tidak boleh hanya simbol/tanda baca.', 'error'); return; }
      if (!rencana || _isSymbolOnly(rencana))       { toast('Rencana Tindak Lanjut wajib diisi, tidak boleh hanya simbol/tanda baca.', 'error'); return; }
      fpenghambat = ''; solusi = '';
    }
  }

  if (btn) { btn.disabled = true; btn.innerHTML = `<span class="btn-spin" style="width:11px;height:11px"></span> Menyimpan...`; }
  try {
    const r = await fetch('/api/kinerja/realisasi', {
      method: 'POST', headers: authHeaders(),
      body: JSON.stringify({
        indikator_id: indikatorId, bulan: _spm_bulan, tahun: _spm_tahun,
        realisasi: real !== '' ? parseFloat(real) : null,
        realisasi_display: _getRealisasiDisplayFromEl(realEl, row, real),
        f_penghambat: fpenghambat || null, solusi: solusi || null, f_pendukung: fpendukung || null, rencana_tl: rencana || null,
      }),
    });
    const d = await r.json();
    if (!r.ok) {
      toast(d.error || 'Gagal menyimpan', 'error');
      if (btn) { btn.disabled = false; btn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M15.2 3a2 2 0 0 1 1.4.6l3.8 3.8a2 2 0 0 1 .6 1.4V19a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z"/><path d="M17 21v-7a1 1 0 0 0-1-1H8a1 1 0 0 0-1 1v7"/><path d="M7 3v4a1 1 0 0 0 1 1h7"/></svg> Simpan`; }
    } else {
      toast('Tersimpan');
      // Invalidate cache chart dashboard supaya Pantau Indikator fetch data fresh
      if (typeof _invalidateKinerjaDashboardCache === 'function') _invalidateKinerjaDashboardCache(_spm_tahun);
      ['spm_real_', 'spm_fpenghambat_', 'spm_solusi_', 'spm_fpendukung_', 'spm_rencana_'].forEach(prefix => {
        const el = document.getElementById(`${prefix}${indikatorId}`);
        if (el) {
          el.setAttribute('readonly', '');
          if (el.tagName === 'SELECT') el.disabled = true; // predikat: <select> pakai disabled, bukan readonly
          el.style.background = '';
          el.style.cursor = 'not-allowed';
          if (el.classList.contains('ps-rte')) { el.style.resize = 'none'; el.style.display = 'none'; el.contentEditable = 'false'; }
          el.dataset.tip = 'Klik tombol Edit untuk mengisi';
        }
      });
      // Kunci kembali tombol data dukung (Upload kembali ke warna default)
      _lockDukungButtons(indikatorId);
      // Tampilkan tombol Reset (admin) tanpa perlu reload
      _ensureResetBtn(indikatorId, 'spm_', 'spm');
      const tr = document.querySelector(`tr[data-id="${indikatorId}"]`);
      if (tr) { tr.classList.remove('row-state-default', 'row-state-editing'); tr.classList.add('row-state-saved'); }
      const editBtn = document.getElementById(`spm_editbtn_${indikatorId}`);
      if (editBtn) {
        editBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg> Edit`;
        editBtn.classList.remove('btn-edit-row--active');
        editBtn.dataset.tip = 'Edit baris ini';
        editBtn.style.display = ''; // tampilkan tombol Edit setelah data tersimpan
      }
      if (btn) {
        btn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M15.2 3a2 2 0 0 1 1.4.6l3.8 3.8a2 2 0 0 1 .6 1.4V19a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z"/><path d="M17 21v-7a1 1 0 0 0-1-1H8a1 1 0 0 0-1 1v7"/><path d="M7 3v4a1 1 0 0 0 1 1h7"/></svg> Tersimpan`;
        btn.style.background = 'var(--sukses)';
        btn.style.color = '#fff';
        btn.disabled = true;
      }
      const idx = _spmData.findIndex(x => x.id === indikatorId);
      if (idx >= 0) {
        _spmData[idx].realisasi         = d.realisasi?.realisasi ?? null;
        _spmData[idx].realisasi_display = d.realisasi?.realisasi_display ?? null;
        _spmData[idx].f_penghambat      = d.realisasi?.f_penghambat ?? null;
        _spmData[idx].solusi            = d.realisasi?.solusi ?? null;
        _spmData[idx].f_pendukung       = d.realisasi?.f_pendukung ?? null;
        _spmData[idx].rencana_tl        = d.realisasi?.rencana_tl ?? null;
        _spmData[idx].realisasi_id      = d.realisasi?.id ?? _spmData[idx].realisasi_id;
      }
      // Refresh capaian_persen dari server (hitung ulang kumulatif lintas bulan)
      fetch(`/api/kinerja/rekap?bulan=${_spm_bulan}&tahun=${_spm_tahun}&jenis=spm`, { headers: authHeaders() })
        .then(res => res.ok ? res.json() : null)
        .then(fresh => {
          if (!fresh?.rekap) return;
          for (const freshRow of fresh.rekap) {
            const i = _spmData.findIndex(x => x.id === freshRow.id);
            if (i >= 0) _spmData[i].capaian_persen = freshRow.capaian_persen;
            const badge = document.getElementById(`spm_badge_${freshRow.id}`);
            if (badge) {
              const cap = (freshRow.realisasi_id && freshRow.capaian_persen != null) ? Number(freshRow.capaian_persen) : null;
              if (cap === null || isNaN(cap)) {
                badge.textContent = '—'; badge.className = 'capaian-badge na';
              } else {
                badge.textContent = cap.toFixed(1) + '%';
                badge.className = 'capaian-badge ' + (cap >= 91 ? 'st' : cap >= 76 ? 'ti' : cap >= 66 ? 'sd' : cap >= 51 ? 'rd' : 'sr');
              }
            }
          }
        }).catch(() => {});
      const _savedSpm = _spmData[idx >= 0 ? idx : -1];
      const _rSpm = parseFloat(_savedSpm?.realisasi ?? '');
      const _tSpm = _targetNumForRow(_savedSpm);
      if (!isNaN(_rSpm) && !isNaN(_tSpm) && _tSpm !== 0) {
        const _cSpm = _savedSpm?.bermakna_negatif
          ? ((_tSpm - (_rSpm - _tSpm)) / _tSpm) * 100
          : (_rSpm / _tSpm) * 100;
        _togglePermasalahanSolusi('spm', indikatorId, _cSpm);
        [['spm_fpenghambat', _savedSpm?.f_penghambat], ['spm_solusi', _savedSpm?.solusi],
         ['spm_fpendukung', _savedSpm?.f_pendukung], ['spm_rencana', _savedSpm?.rencana_tl]].forEach(([base, val]) => {
          _updatePSReadAfterSave(base, indikatorId, val);
        });
      }
      // Warning data dukung belum diupload
      if (!row?.data_dukung_url) {
        const dukungCell = document.querySelector(`tr[data-id="${indikatorId}"] td[data-col="dukung"]`);
        if (dukungCell && !dukungCell.querySelector('.dukung-warning')) {
          dukungCell.insertAdjacentHTML('beforeend', `
            <div class="dukung-warning" data-tip="Data dukung belum diupload untuk indikator ini">
              <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/></svg>
              Belum diupload
            </div>`);
        }
      }
    }
  } catch (err) {
    toast('Error: ' + err.message, 'error');
    if (btn) { btn.disabled = false; btn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M15.2 3a2 2 0 0 1 1.4.6l3.8 3.8a2 2 0 0 1 .6 1.4V19a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z"/><path d="M17 21v-7a1 1 0 0 0-1-1H8a1 1 0 0 0-1 1v7"/><path d="M7 3v4a1 1 0 0 0 1 1h7"/></svg> Simpan`; }
  }
}

// ── Reset realisasi row (admin only) ────────────────────────────────────────
const _RESET_BTN_IDLE_HTML = `<svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg>\n      Reset`;

async function resetRealisasiRow(indikatorId, jenis) {
  if (!_user?.is_admin) return;
  const ok = await showConfirm({ title: 'Reset Realisasi', msg: 'Data realisasi baris ini akan dihapus dan baris kembali kosong.', okText: 'Ya, Reset', icon: 'trash' }); if (!ok) return;

  const dataArr = jenis === 'ikk' ? _ikkData : jenis === 'spm' ? _spmData : _kinerjaData;
  const row = dataArr.find(r => r.id === indikatorId);
  if (!row?.realisasi_id) return;

  const prefix = jenis === 'ikk' ? 'ikk_' : jenis === 'spm' ? 'spm_' : '';
  const resetBtn = document.getElementById(`${prefix}resetbtn_${indikatorId}`);
  if (resetBtn) {
    resetBtn.disabled = true;
    resetBtn.innerHTML = `<span class="btn-spin" style="width:11px;height:11px"></span> Mereset...`;
  }

  try {
    const r = await fetch(`/api/kinerja/realisasi/${row.realisasi_id}`, {
      method: 'DELETE',
      headers: authHeaders()
    });
    if (!r.ok) {
      const d = await r.json().catch(() => ({}));
      toast(d.error || 'Gagal mereset data', 'error');
      if (resetBtn) { resetBtn.disabled = false; resetBtn.innerHTML = _RESET_BTN_IDLE_HTML; }
      return;
    }
    toast('Data realisasi berhasil direset');
    // Reload dari server agar state sinkron
    if (jenis === 'ikk') {
      await loadIkkRekap();
    } else if (jenis === 'spm') {
      await loadSpmRekap();
    } else {
      await loadKinerjaRekap();
    }
  } catch (err) {
    toast('Error: ' + err.message, 'error');
    if (resetBtn) { resetBtn.disabled = false; resetBtn.innerHTML = _RESET_BTN_IDLE_HTML; }
  }
}

async function openSpmDukungModal(indikatorId, bulan, tahun) {
  _dukungState = { indikatorId, tw: bulan, tahun, files: [], _source: 'spm' };
  const area = document.getElementById('dukungUploadArea');
  const fi   = document.getElementById('dukungFileInput');
  const pw   = document.getElementById('dukungProgressWrap');
  if (area) { area.classList.remove('drag-over'); area.style.display = ''; }
  if (fi)   fi.value = '';
  if (pw)   pw.style.display = 'none';

  const row = _spmData.find(r => r.id === indikatorId);
  document.getElementById('dukungIndikatorLabel').textContent = row?.nama_indikator || row?.indikator_kinerja || '';
  document.getElementById('dukungTwLabel').textContent = `${BULAN_FULL[bulan] || bulan} ${tahun} — SPM`;

  if (row?.data_dukung_url) {
    try {
      const parsed = JSON.parse(row.data_dukung_url);
      _dukungState.files = Array.isArray(parsed) ? parsed.filter(f => f && f.url) : [];
    } catch {
      _dukungState.files = [{ url: row.data_dukung_url, name: row.data_dukung_nama || 'Dokumen' }];
    }
  }
  _renderDukungList();
  openModal('modalDukung');
}