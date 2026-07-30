// js/audit_frontend.js
// Audit Trail — log login & aksi sistem — admin only

'use strict';

let _auditPage  = 1;
let _auditLimit = 15;
let _auditTotal = 0;

const AKSI_LABEL = {
  login_success:      'Login Berhasil',
  login_failed:        'Login Gagal',
  login_blocked:        'Login Diblokir (Rate Limit)',
  change_password:    'Ganti Password',
  create:              'Tambah Surat',
  update:              'Update Surat',
  delete:              'Hapus Surat',
  update_status:       'Update Status Selesai',
  create_user:         'Tambah Pengguna',
  update_user:         'Update Pengguna',
  update_permissions:  'Update Hak Akses',
  reset_password:      'Reset Password Pengguna',
  delete_user:         'Hapus Pengguna',
  update_indikator:    'Update Indikator Pengguna',
  force_logout:         'Paksa Logout Pengguna',
  logout_all:           'Logout Semua Sesi',
  refresh_token_reuse_detected: 'Sesi Dicurigai Dibajak',
};

function _auditAksiBadge(aksi) {
  const map = {
    login_success:       'badge-hijau',
    login_failed:         'badge-merah',
    login_blocked:         'badge-merah',
    change_password:     'badge-abu',
    create:               'badge-hijau',
    update:               'badge-kuning',
    delete:               'badge-merah',
    update_status:        'badge-kuning',
    create_user:          'badge-hijau',
    update_user:          'badge-kuning',
    update_permissions:   'badge-kuning',
    reset_password:       'badge-merah',
    delete_user:          'badge-merah',
    update_indikator:     'badge-kuning',
    force_logout:         'badge-merah',
    logout_all:           'badge-abu',
    refresh_token_reuse_detected: 'badge-merah',
  };
  const cls = map[aksi] || 'badge-abu';
  const label = AKSI_LABEL[aksi] || aksi;
  return `<span class="badge ${cls}">${esc(label)}</span>`;
}

function filterAuditTrail() {
  _auditPage = 1;
  loadAuditTrail();
}

let _auditFiltersBound = false;
function _initAuditFilters() {
  if (_auditFiltersBound) return;
  if (typeof initCdtp === 'function') initCdtp();
  const dari   = document.getElementById('auditFilterDari');
  const sampai = document.getElementById('auditFilterSampai');
  dari?.addEventListener('change', filterAuditTrail);
  sampai?.addEventListener('change', filterAuditTrail);
  buildAuditAksiFilter();
  _auditFiltersBound = true;
}

// Rebuild dropdown "Semua Aksi" — hanya tampilkan aksi yang benar-benar ada di data.
// "Semua Aksi" sendiri cuma ditampilkan kalau aksinya lebih dari 1 macam.
async function buildAuditAksiFilter() {
  const sel = document.getElementById('auditFilterAksi');
  if (!sel) return;
  const current = sel.value;
  try {
    const r = await fetch('/api/audit-trail/aksi-list', { headers: authHeaders() });
    if (!r.ok) return;
    const { aksi } = await r.json();
    const list = aksi || [];
    let opts = list.length > 1 ? `<option value="">Semua Aksi</option>` : '';
    opts += list.map(a => `<option value="${esc(a)}" ${current === a ? 'selected' : ''}>${esc(AKSI_LABEL[a] || a)}</option>`).join('');
    sel.innerHTML = opts || `<option value="">Semua Aksi</option>`;
    const options = [...sel.options];
    if (!options.some(o => o.value === current)) sel.value = options[0]?.value ?? '';
    if (typeof syncCustomSelect === 'function') syncCustomSelect('auditFilterAksi');
    // Kalau nilai auto berubah (bukan pilihan user), reload data biar sinkron dgn filter
    if (sel.value !== current) filterAuditTrail();
  } catch (err) {
    console.error('[buildAuditAksiFilter]', err);
  }
}

// Ambil bagian tanggal saja (YYYY-MM-DD) dari nilai hidden CDTP (YYYY-MM-DDTHH:mm)
function _auditDateOnly(val) {
  return val ? val.split('T')[0] : '';
}

async function loadAuditTrail(page = _auditPage) {
  _initAuditFilters();
  _auditPage = page;
  const q       = document.getElementById('auditSearch')?.value || '';
  const aksi    = document.getElementById('auditFilterAksi')?.value || '';
  const dari    = _auditDateOnly(document.getElementById('auditFilterDari')?.value);
  const sampai  = _auditDateOnly(document.getElementById('auditFilterSampai')?.value);

  const params = new URLSearchParams({
    page: _auditPage, limit: _auditLimit, q,
    aksi, tanggal_dari: dari, tanggal_sampai: sampai,
  });

  const tb = document.getElementById('auditTableBody');
  if (tb) tb.innerHTML = `<tr class="empty-row"><td colspan="6"><span class="btn-spin" style="width:11px;height:11px;vertical-align:-1px;margin-right:6px"></span>Memuat data...</td></tr>`;

  try {
    const r = await fetch(`/api/audit-trail?${params}`, { headers: authHeaders() });
    if (!r.ok) throw new Error(await r.text());
    const { logs, total } = await r.json();
    _auditTotal = total;
    renderAuditTrailTable(logs || []);
    renderPagination('auditPagination', _auditTotal, _auditPage, _auditLimit, (p) => loadAuditTrail(p));
  } catch (err) {
    console.error('[loadAuditTrail]', err);
    if (tb) tb.innerHTML = `<tr class="empty-row"><td colspan="6">Gagal memuat data</td></tr>`;
  }
}

function _auditDetailText(aksi, detail) {
  if (!detail) return '—';
  switch (aksi) {
    case 'login_failed':
      return detail.reason === 'email_not_found' ? 'Email tidak terdaftar'
           : detail.reason === 'wrong_password'  ? 'Password salah'
           : '—';
    case 'create':
    case 'update':
      return [detail.no_agenda, detail.perihal].filter(Boolean).join(' — ') || '—';
    case 'delete':
      return [detail.no_agenda, detail.perihal || detail.asal_surat || detail.tujuan_surat].filter(Boolean).join(' — ') || '—';
    case 'update_status':
      return detail.selesai ? 'Ditandai selesai' : 'Ditandai belum selesai';
    case 'create_user':
    case 'update_user':
      return [detail.nama, detail.email].filter(Boolean).join(' — ') || '—';
    case 'update_permissions':
      return Array.isArray(detail.permissions) ? `${detail.permissions.length} hak akses` : '—';
    case 'update_indikator':
      return Array.isArray(detail.indikator_ids) ? `${detail.indikator_ids.length} indikator` : '—';
    case 'force_logout':
      return detail.target_nama ? `${detail.target_nama} — ${detail.sesi_dicabut ?? 0} sesi dicabut` : '—';
    default:
      return '—';
  }
}

// Ikon penanda sumber/akurasi lokasi, dideteksi dari FORMAT TEKSNYA sendiri
// (tanpa kolom DB tambahan): lokasi dari GPS browser (reverse-geocode.js)
// selalu diawali level Kecamatan; fallback IP (_audit.js → ip-api.com) cuma
// sampai level Kabupaten/Kota, gak pernah ada kata "Kecamatan".
// true (ada "Kecamatan") → check-circle hijau, "Lokasi akurat (GPS perangkat)"
// false (gak ada)        → alert-triangle kuning, "Lokasi perkiraan dari IP, bisa kurang akurat"
function _lokasiIsAkurat(lokasi) {
  return /\bkecamatan\b/i.test(lokasi || '');
}

function _lokasiAkuratIcon(akurat) {
  if (akurat) {
    return `<svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="#16a34a" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0" data-tip="Lokasi akurat (GPS perangkat)"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>`;
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="#d97706" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0" data-tip="Lokasi perkiraan dari IP, bisa kurang akurat"><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`;
}

function renderAuditTrailTable(logs) {
  const tb = document.getElementById('auditTableBody');
  if (!tb) return;

  if (!logs.length) {
    tb.innerHTML = `<tr class="empty-row"><td colspan="6">Tidak ada data audit trail</td></tr>`;
    return;
  }

  tb.innerHTML = logs.map(l => {
    const waktu = new Date(l.created_at).toLocaleString('id-ID', {
      timeZone: 'Asia/Makassar',
      day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
    }) + ' WITA';
    const detail = l.detail ? (typeof l.detail === 'string' ? JSON.parse(l.detail) : l.detail) : null;
    const detailText = _auditDetailText(l.aksi, detail);
    const lokasiText = l.lokasi || '—';
    const lokasiIcon = l.lokasi ? _lokasiAkuratIcon(_lokasiIsAkurat(l.lokasi)) : '';
    return `
      <tr>
        <td style="font-size:.8rem;color:var(--teks-muted);white-space:nowrap">${waktu}</td>
        <td>
          <div style="font-weight:600;color:var(--teks)">${esc(l.nama || '—')}</div>
          <div style="font-size:.76rem;color:var(--teks-muted)">${esc(l.email || '—')}</div>
        </td>
        <td>${_auditAksiBadge(l.aksi)}</td>
        <td style="font-size:.8rem;color:var(--teks-muted)">${esc(detailText)}</td>
        <td style="font-size:.8rem;color:var(--teks-muted)">${esc(l.ip_address || '—')}</td>
        <td style="font-size:.8rem;color:var(--teks-muted)"><span style="display:inline-flex;align-items:center;gap:5px">${lokasiIcon}${esc(lokasiText)}</span></td>
      </tr>`;
  }).join('');
}