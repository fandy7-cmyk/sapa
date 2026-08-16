// ── Toggle label helper ──────────────────────────────────
function _updateToggleLabel(id) {
  const el = document.getElementById(id);
  if (!el) return;
  const lbl = document.querySelector(`label[for="${id}"]`);
  if (lbl) lbl.textContent = el.checked ? 'Aktif' : 'Nonaktif';
}

// ── Cek link kedaluwarsa (expired_at lewat), lepas dari flag aktif mentah ──
function _linkIsExpired(l) {
  return !!l.expired_at && new Date(l.expired_at) < new Date();
}

// ── Cek bundle kedaluwarsa (sama logikanya kayak link) ──
function _bundleIsExpired(b) {
  return !!b.expired_at && new Date(b.expired_at) < new Date();
}

// ── Status dropdown: hanya tampilkan opsi yang ada datanya ──
// "Semua Status" cuma ditampilkan kalau statusnya lebih dari 1 macam
// ── Status dropdown: hanya Aktif & Kedaluwarsa (samain dgn badge di tabel) ──
// "Semua Status" cuma ditampilkan kalau statusnya lebih dari 1 macam
function _buildStatusOptions(data, getAktif = d => d.aktif, getExpired = () => false) {
  const kedaluwarsaCount = data.filter(d => getExpired(d)).length;
  const aktifCount       = data.filter(d => !getExpired(d) && getAktif(d)).length;
  const jumlahStatus = (aktifCount ? 1 : 0) + (kedaluwarsaCount ? 1 : 0);
  let opts = jumlahStatus > 1 ? `<option value="">Semua Status</option>` : '';
  if (aktifCount)       opts += `<option value="aktif">Aktif</option>`;
  if (kedaluwarsaCount) opts += `<option value="kedaluwarsa">Kedaluwarsa</option>`;
  return opts || `<option value="">Semua Status</option>`;
}

// ── Debounce helper ──────────────────────────────────────
function _debounce(fn, delay = 400) {
  let timer;
  return function (...args) {
    clearTimeout(timer);
    timer = setTimeout(() => fn.apply(this, args), delay);
  };
}

// ── Format tanggal+jam WITA (dipakai list Link, mirip s.id) ──
function _fmtWita(iso) {
  if (!iso) return '-';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '-';
  try {
    const parts = new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Asia/Makassar', day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit', hour12: false,
    }).formatToParts(d);
    const get = t => parts.find(p => p.type === t)?.value || '';
    return `${get('day')} ${get('month')} ${get('year')} ${get('hour')}:${get('minute')} WITA`;
  } catch { return '-'; }
}

// ── Slug availability checker (dipakai Link & Bundle) ────
const SlugIcons = {
  check: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>`,
  cross: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18M6 6l12 12"/></svg>`,
  spin: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"><path d="M21 12a9 9 0 1 1-9-9"/></svg>`,
};

/**
 * Cek ketersediaan slug ke backend & update UI status + tombol simpan.
 * @param {string} endpoint - '/api/links' atau '/api/bundles'
 * @param {string} rawSlug - nilai slug mentah dari input
 * @param {string|number|null} excludeId - id record saat ini (mode edit)
 * @param {string} statusElId - id elemen div status
 * @param {string} btnId - id tombol simpan
 * @param {(available: boolean|null) => void} onResult - callback simpan state availability
 */
async function _checkSlugAvailability(endpoint, rawSlug, excludeId, statusElId, btnId, onResult) {
  const statusEl = document.getElementById(statusElId);
  const btn = document.getElementById(btnId);
  const slug = (rawSlug || '').trim();

  if (!slug) {
    // Slug kosong = tidak masalah (khusus link, opsional). Selalu boleh simpan.
    if (statusEl) { statusEl.className = 'slug-status'; statusEl.innerHTML = ''; }
    if (btn) btn.disabled = false;
    onResult(true);
    return;
  }

  if (statusEl) {
    statusEl.className = 'slug-status checking';
    statusEl.innerHTML = `${SlugIcons.spin} Mengecek ketersediaan...`;
  }
  if (btn) btn.disabled = true;

  try {
    const qs = new URLSearchParams({ slug });
    if (excludeId) qs.set('excludeId', excludeId);
    const r = await fetch(`${endpoint}/check-slug?${qs.toString()}`, { headers: authHeaders() });
    const d = await r.json();
    const available = d.available;
    if (statusEl) {
      if (available === true) {
        statusEl.className = 'slug-status available';
        statusEl.innerHTML = `${SlugIcons.check} Slug tersedia`;
      } else if (available === false) {
        statusEl.className = 'slug-status taken';
        statusEl.innerHTML = `${SlugIcons.cross} Slug sudah digunakan`;
      } else {
        statusEl.className = 'slug-status'; statusEl.innerHTML = '';
      }
    }
    if (btn) btn.disabled = available === false;
    onResult(available !== false);
  } catch {
    // Gagal cek (mis. offline) - jangan blokir user, biarkan validasi final terjadi di server saat submit
    if (statusEl) { statusEl.className = 'slug-status'; statusEl.innerHTML = ''; }
    if (btn) btn.disabled = false;
    onResult(true);
  }
}

// ═══════════════════════════════════════════
// LINKS (data source) - dipakai bareng oleh halaman Shortlink
// ═══════════════════════════════════════════
let _links = [];
let _linkSlugAvailable = true;
const _checkLinkSlugDebounced = _debounce(function () {
  const val = document.getElementById('linkSlug').value.trim();
  const excludeId = document.getElementById('linkId').value || null;
  _checkSlugAvailability('/api/links', val, excludeId, 'linkSlugStatus', 'btnSaveLink', (avail) => {
    _linkSlugAvailable = avail;
  });
}, 450);

async function loadLinks() {
  try {
    const lr = await fetch('/api/links', { headers: authHeaders() });
    const ld = await lr.json();
    _links = ld.links || [];
    // Rebuild filter status dropdown - hanya tampilkan opsi yg ada datanya
    const slfs = document.getElementById('slFilterStatus');
    if (slfs) slfs.innerHTML = _buildStatusOptions(_links, l => l.aktif, l => _linkIsExpired(l));
  } catch (e) { console.error(e); }
}

function openLinkModal(id) {
  document.getElementById('linkId').value = '';
  document.getElementById('linkUrl').value = '';
  document.getElementById('linkSlug').value = '';
  document.getElementById('slugPreview').textContent = '-';
  document.getElementById('linkSlugStatus').className = 'slug-status';
  document.getElementById('linkSlugStatus').innerHTML = '';
  _linkSlugAvailable = true;
  document.getElementById('btnSaveLink').disabled = false;
  document.getElementById('linkExpiredAt').value = '';
  document.getElementById('linkExpiredToggle').checked = false;
  document.getElementById('linkExpiredField').style.display = 'none';
  document.getElementById('linkProtected').checked = false;
  document.getElementById('linkPassword').value = '';
  document.getElementById('linkPasswordHint').textContent = 'Pengunjung wajib memasukkan password ini sebelum diarahkan ke tautan tujuan.';
  _linkWasProtected = false;
  _toggleLinkPasswordField();
  document.getElementById('modalLinkTitle').textContent = 'Tambah Link';
  openModal('modalLink');
  setTimeout(() => {
    if (typeof initCdtp === 'function') initCdtp();
    const m = document.getElementById('cdtp_linkExpired');
    if (m?._cdtp) m._cdtp.clear();
  }, 30);
}

function _toggleLinkExpiredField() {
  const on = document.getElementById('linkExpiredToggle').checked;
  document.getElementById('linkExpiredField').style.display = on ? '' : 'none';
  if (!on) {
    document.getElementById('linkExpiredAt').value = '';
    const m = document.getElementById('cdtp_linkExpired');
    if (m?._cdtp) m._cdtp.clear();
  }
}

let _linkWasProtected = false;

function _toggleLinkPasswordField() {
  const on = document.getElementById('linkProtected').checked;
  document.getElementById('linkPasswordField').style.display = on ? '' : 'none';
  document.getElementById('linkPassword').placeholder = (on && _linkWasProtected)
    ? 'Kosongkan jika tidak ingin mengganti password' : 'Masukkan password baru';
}

// datetime-local butuh format lokal 'YYYY-MM-DDTHH:mm' tanpa timezone
function _isoToLocalInput(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  const pad = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function editLink(id) {
  const l = _links.find(x => x.id === id); if (!l) return;
  document.getElementById('linkId').value = l.id;
  document.getElementById('linkUrl').value = l.url;
  document.getElementById('linkSlug').value = l.slug_pendek || '';
  document.getElementById('slugPreview').textContent = l.slug_pendek || '-';
  document.getElementById('linkSlugStatus').className = 'slug-status';
  document.getElementById('linkSlugStatus').innerHTML = '';
  _linkSlugAvailable = true;
  document.getElementById('btnSaveLink').disabled = false;
  document.getElementById('linkExpiredAt').value = _isoToLocalInput(l.expired_at);
  document.getElementById('linkExpiredToggle').checked = !!l.expired_at;
  document.getElementById('linkExpiredField').style.display = l.expired_at ? '' : 'none';
  _linkWasProtected = !!l.is_protected;
  document.getElementById('linkProtected').checked = _linkWasProtected;
  document.getElementById('linkPassword').value = '';
  document.getElementById('linkPasswordHint').textContent = _linkWasProtected
    ? 'Sudah diproteksi. Isi untuk ganti password, atau matikan toggle utk menghapus proteksi.'
    : 'Pengunjung wajib memasukkan password ini sebelum diarahkan ke tautan tujuan.';
  _toggleLinkPasswordField();
  document.getElementById('modalLinkTitle').textContent = 'Edit Link';
  openModal('modalLink');
  setTimeout(() => {
    if (typeof initCdtp === 'function') initCdtp();
    const m = document.getElementById('cdtp_linkExpired');
    if (m?._cdtp) m._cdtp.set(l.expired_at || null);
  }, 30);
}

document.getElementById('linkSlug').addEventListener('input', function() {
  document.getElementById('slugPreview').textContent = this.value || '-';
  _checkLinkSlugDebounced();
});

function _autoJudulLink(url, slug) {
  if (slug) return slug;
  try {
    const u = new URL(url);
    return u.hostname.replace(/^www\./, '');
  } catch { return (url || '').slice(0, 40) || 'Link'; }
}

async function saveLink() {
  // Auto-commit picker yang masih terbuka (user belum klik "Pilih")
  const mExp = document.getElementById('cdtp_linkExpired');
  if (mExp?._cdtp?.commit) mExp._cdtp.commit();

  const id  = document.getElementById('linkId').value;
  const url  = document.getElementById('linkUrl').value.trim();
  const slug = document.getElementById('linkSlug').value.trim() || null;
  const expiredOn    = document.getElementById('linkExpiredToggle').checked;
  const expiredLocal = document.getElementById('linkExpiredAt').value;
  const protectedNow  = document.getElementById('linkProtected').checked;
  const pwInput = document.getElementById('linkPassword').value;
  const body = {
    judul:      _autoJudulLink(url, slug),
    url,
    aktif:      true,
    slug_pendek:slug,
    expired_at: (expiredOn && expiredLocal) ? new Date(expiredLocal).toISOString() : null,
  };
  if (!protectedNow) {
    body.clear_password = true;
  } else if (pwInput) {
    body.password = pwInput;
  } // kalau protectedNow true & pwInput kosong (edit, sudah ada password) -> jangan diubah
  if (!body.url) { toast('URL wajib diisi', 'error'); return; }
  if (protectedNow && !pwInput && !_linkWasProtected) { toast('Isi password utk proteksi tautan', 'error'); return; }
  if (!_linkSlugAvailable) { toast('Slug pendek sudah digunakan, ganti dulu', 'error'); return; }
  try {
    const r = await fetch(id ? `/api/links/${id}` : '/api/links', {
      method: id ? 'PUT' : 'POST', headers: authHeaders(), body: JSON.stringify(body),
    });
    const d = await r.json();
    if (!r.ok) { toast(d.error || 'Gagal menyimpan', 'error'); return; }
    toast(id ? 'Link diperbarui' : 'Link ditambahkan');
    closeModal('modalLink');
    await loadLinks();
    if (document.getElementById('page-shortlink')?.classList.contains('active')) filterShortlinks();
  } catch { toast('Gagal menyimpan', 'error'); }
}

async function deleteLink(id) {
  const ok = await showConfirm({ title: 'Hapus Link', msg: 'Link ini akan dihapus permanen. Lanjutkan?', okText: 'Ya, Hapus', icon: 'trash' });
  if (!ok) return;
  try {
    await fetch(`/api/links/${id}`, { method: 'DELETE', headers: authHeaders() });
    toast('Link berhasil dihapus');
    await loadLinks();
    if (document.getElementById('page-shortlink')?.classList.contains('active')) filterShortlinks();
  } catch { toast('Gagal menghapus', 'error'); }
}

// ═══════════════════════════════════════════
// SHORTLINK - halaman unified: semua link + shortlink
// ═══════════════════════════════════════════
let _slFiltered = [], _slPage = 1, _slPageSize = 10;

async function loadShortlinks() {
  const tb0 = document.getElementById('slTableBody');
  if (tb0) tb0.innerHTML = `<tr class="empty-row"><td colspan="4"><span class="btn-spin" style="width:11px;height:11px;vertical-align:-1px;margin-right:6px"></span>Memuat data...</td></tr>`;
  await loadLinks();
  filterShortlinks();
}

function filterShortlinks() {
  const q      = document.getElementById('slSearch').value.toLowerCase();
  const status = document.getElementById('slFilterStatus')?.value || '';
  _slFiltered = _links.filter(l => {
    const matchQ = l.judul.toLowerCase().includes(q) ||
                   l.url.toLowerCase().includes(q) ||
                   (l.slug_pendek||'').toLowerCase().includes(q);
    const matchS = !status ||
      (status === 'aktif' ? (l.aktif && !_linkIsExpired(l)) : _linkIsExpired(l));
    return matchQ && matchS;
  });
  _slPage = 1;
  renderShortlinks();
}

window.goSlPage = (p) => { _slPage = p; renderShortlinks(); };

function renderShortlinks() {
  const tb = document.getElementById('slTableBody');
  const start = (_slPage - 1) * _slPageSize;
  const slice = _slFiltered.slice(start, start + _slPageSize);
  tb.innerHTML = slice.length ? slice.map(l => `
    <tr>
      <td>
        <div style="display:flex;align-items:center;gap:4px;flex-wrap:wrap">
          ${l.slug_pendek
            ? `<code style="font-size:.8rem;font-weight:700;color:var(--hijau);background:var(--hijau-light);padding:2px 8px;border-radius:5px;font-family:'Plus Jakarta Sans',sans-serif">/${esc(l.slug_pendek)}</code>`
            : `<span style="color:var(--teks-muted);font-size:.78rem">Tanpa shortlink</span>`}
        </div>
        <a href="${esc(l.url)}" target="_blank" style="display:block;color:var(--teks-muted);font-size:.74rem;margin-top:3px;max-width:380px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(l.url)}</a>
        <div style="display:flex;align-items:center;gap:4px;color:var(--teks-muted);font-size:.7rem;margin-top:3px">
          <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 3"/></svg>
          ${esc(_fmtWita(l.created_at))}
        </div>
      </td>
      <td>${_linkIsExpired(l)
          ? `<span class="badge badge-red" data-tip="Berlaku s.d ${esc(fmtDate(l.expired_at))}">Kedaluwarsa</span>`
          : `<span class="badge ${l.aktif?'badge-green':'badge-red'}">${l.aktif?'Aktif':'Nonaktif'}</span>`}</td>
      <td class="col-admin-only" style="color:var(--teks-muted);font-size:.78rem">${l.created_by_nama ? esc(l.created_by_nama) : '-'}</td>
      <td style="white-space:nowrap">${l.slug_pendek ? `
          <button class="btn btn-ghost btn-sm icon-status${l.expired_at ? ' active' : ''}" data-tip="${l.expired_at ? 'Berlaku s.d ' + esc(fmtDate(l.expired_at)) : 'Tautan berjangka'}" onclick="editLink(${l.id})"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 3"/></svg></button>
          <button class="btn btn-ghost btn-sm icon-status${l.is_protected ? ' active' : ''}" data-tip="${l.is_protected ? 'Tautan diproteksi' : 'Tautan tanpa proteksi'}" onclick="editLink(${l.id})"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="10" width="16" height="10" rx="2"/><path d="M7 10V7a5 5 0 0110 0v3"/></svg></button>
          <button class="btn btn-ghost btn-sm" data-tip="Bagikan" data-share-trigger onclick="toggleShareMenu(event,'link', ${l.id})"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8a3 3 0 1 0-2.83-4H15a3 3 0 0 0 .05.54L8.09 8.49a3 3 0 1 0 0 7.02l6.96 3.95A3 3 0 1 0 15.83 18l-6.96-3.95a3 3 0 0 0 0-2.1L15.83 8A3 3 0 0 0 18 8z"/></svg></button>
          <button class="btn btn-ghost btn-sm" data-tip="QR Code" onclick="openShareModal('link', ${l.id})"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><path d="M14 14h3v3h-3zM19 14h2v2h-2zM14 19h2v2h-2zM19 19h2v2h-2z"/></svg></button>
          <button class="btn btn-ghost btn-sm" data-tip="Detail" onclick="openLinkDetail(${l.id})" style="gap:3px">Detail<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M9 6l6 6-6 6"/></svg></button>` : ''}
          <button class="btn btn-ghost btn-sm" data-tip="Edit" onclick="editLink(${l.id})"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg></button>
          <button class="btn-hapus" data-tip="Hapus" onclick="deleteLink(${l.id})"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path stroke-linecap="round" stroke-linejoin="round" d="M19 6l-1 14H6L5 6"/><path stroke-linecap="round" stroke-linejoin="round" d="M10 11v6m4-6v6"/><path stroke-linecap="round" stroke-linejoin="round" d="M9 6V4h6v2"/></svg></button></td>
    </tr>`).join('')
    : '<tr class="empty-row"><td colspan="4">Tidak ada link</td></tr>';
  renderPagination('slPagination', _slFiltered.length, _slPage, _slPageSize, 'goSlPage');
}

function copySlug(slug) {
  const url = location.origin + '/' + slug;
  navigator.clipboard.writeText(url).then(() => toast('URL disalin: ' + url));
}

// ═══════════════════════════════════════════
// BUNDLES
// ═══════════════════════════════════════════
let _bundles = [], _bundlesFiltered = [], _bundlePage = 1, _bundlePageSize = 10;
let _currentBundleId = null;
let _currentBundleItems = [];

async function loadBundles() {
  const tb0 = document.getElementById('bundleTableBody');
  if (tb0) tb0.innerHTML = `<tr class="empty-row"><td colspan="4"><span class="btn-spin" style="width:11px;height:11px;vertical-align:-1px;margin-right:6px"></span>Memuat data...</td></tr>`;
  try {
    const r = await fetch('/api/bundles', { headers: authHeaders() });
    const d = await r.json();
    _bundles = d.bundles || [];
    _bundlesFiltered = [..._bundles]; _bundlePage = 1;
    renderBundles();
    // Rebuild filter dropdowns - hanya tampilkan opsi yg ada datanya
    const bfs = document.getElementById('bundleFilterStatus');
    if (bfs) bfs.innerHTML = _buildStatusOptions(_bundles, b => b.aktif, b => _bundleIsExpired(b));
  } catch {}
}

function filterBundles() {
  const q      = (document.getElementById('bundleSearch')?.value || '').toLowerCase();
  const status = document.getElementById('bundleFilterStatus')?.value || '';
  _bundlesFiltered = _bundles.filter(b => {
    if (status) {
      const matchS = status === 'aktif' ? (b.aktif && !_bundleIsExpired(b)) : _bundleIsExpired(b);
      if (!matchS) return false;
    }
    const matchQ = b.judul.toLowerCase().includes(q) || b.slug.toLowerCase().includes(q);
    return matchQ;
  });
  _bundlePage = 1; renderBundles();
}

function renderBundles() {
  const start = (_bundlePage - 1) * _bundlePageSize;
  const slice = _bundlesFiltered.slice(start, start + _bundlePageSize);
  const tb = document.getElementById('bundleTableBody');
  tb.innerHTML = slice.length ? slice.map(b => `
    <tr>
      <td>
        <div style="font-weight:700;color:var(--teks);font-size:.85rem">${esc(b.judul)}</div>
        <div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;margin-top:3px">
          <code style="font-size:.75rem;font-weight:600;color:var(--hijau);background:var(--hijau-light);padding:2px 8px;border-radius:5px;font-family:'Plus Jakarta Sans',sans-serif">/${esc(b.slug)}</code>
          <span style="color:var(--teks-muted);font-size:.72rem">${b.jumlah_item ?? 0} item</span>
        </div>
        <div style="display:flex;align-items:center;gap:4px;color:var(--teks-muted);font-size:.7rem;margin-top:3px">
          <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 3"/></svg>
          ${esc(_fmtWita(b.created_at))}
        </div>
      </td>
      <td>${_bundleIsExpired(b)
          ? `<span class="badge badge-red" data-tip="Berlaku s.d ${esc(fmtDate(b.expired_at))}">Kedaluwarsa</span>`
          : `<span class="badge ${b.aktif?'badge-green':'badge-red'}">${b.aktif?'Aktif':'Nonaktif'}</span>`}</td>
      <td class="col-admin-only" style="color:var(--teks-muted);font-size:.78rem">${b.created_by_nama ? esc(b.created_by_nama) : '-'}</td>
      <td style="white-space:nowrap">
        <button class="btn btn-ghost btn-sm icon-status${b.expired_at ? ' active' : ''}" data-tip="${b.expired_at ? 'Berlaku s.d ' + esc(fmtDate(b.expired_at)) : 'Bundle berjangka'}" onclick="editBundle(${b.id})"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 3"/></svg></button>
        <button class="btn btn-ghost btn-sm icon-status${b.is_protected ? ' active' : ''}" data-tip="${b.is_protected ? 'Bundle diproteksi' : 'Bundle tanpa proteksi'}" onclick="editBundle(${b.id})"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="10" width="16" height="10" rx="2"/><path d="M7 10V7a5 5 0 0110 0v3"/></svg></button>
        <button class="btn btn-ghost btn-sm" data-tip="Bagikan" data-share-trigger onclick="toggleShareMenu(event,'bundle', ${b.id})"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8a3 3 0 1 0-2.83-4H15a3 3 0 0 0 .05.54L8.09 8.49a3 3 0 1 0 0 7.02l6.96 3.95A3 3 0 1 0 15.83 18l-6.96-3.95a3 3 0 0 0 0-2.1L15.83 8A3 3 0 0 0 18 8z"/></svg></button>
        <button class="btn btn-ghost btn-sm" data-tip="QR Code" onclick="openShareModal('bundle', ${b.id})"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><path d="M14 14h3v3h-3zM19 14h2v2h-2zM14 19h2v2h-2zM19 19h2v2h-2z"/></svg></button>
        <button class="btn btn-ghost btn-sm" data-tip="Detail" onclick="openBundleDetail(${b.id})" style="gap:3px">Detail<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M9 6l6 6-6 6"/></svg></button>
        <button class="btn btn-ghost btn-sm" data-tip="Edit" onclick="editBundle(${b.id})"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg></button>
        <button class="btn-hapus" data-tip="Hapus" onclick="deleteBundle(${b.id})"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path stroke-linecap="round" stroke-linejoin="round" d="M19 6l-1 14H6L5 6"/><path stroke-linecap="round" stroke-linejoin="round" d="M10 11v6m4-6v6"/><path stroke-linecap="round" stroke-linejoin="round" d="M9 6V4h6v2"/></svg></button>
      </td>
    </tr>`).join('')
    : '<tr class="empty-row"><td colspan="4">Tidak ada bundle</td></tr>';
  renderPagination('bundlePagination', _bundlesFiltered.length, _bundlePage, _bundlePageSize, 'goBundlePage');
}

window.goBundlePage = (p) => { _bundlePage = p; renderBundles(); };

function copyBundleUrl(slug) {
  const url = location.origin + '/' + slug;
  navigator.clipboard.writeText(url).then(() => toast('URL disalin: ' + url));
}

function _setBundleItemsLocked(locked) {
  // Kunci/unlock tombol tambah item & form inline
  const btn = document.getElementById('btnTambahItem');
  const hint = document.getElementById('bundleSaveHint');
  if (locked) {
    btn.disabled = true; btn.style.opacity = '.45'; btn.style.cursor = 'not-allowed';
    hint.style.display = 'block';
  } else {
    btn.disabled = false; btn.style.opacity = ''; btn.style.cursor = '';
    hint.style.display = 'none';
  }
}

let _bundleSlugAvailable = true;
const _checkBundleSlugDebounced = _debounce(function () {
  const explicit = document.getElementById('bundleSlug').value.trim();
  const judul = document.getElementById('bundleJudul').value;
  // Kalau field slug dikosongkan, backend auto-generate dari judul → cek slug hasil generate itu
  const val = explicit || judul.toLowerCase().replace(/[^a-z0-9\s-]/g,'').trim().replace(/\s+/g,'-').substring(0,60);
  const excludeId = document.getElementById('bundleId').value || null;
  _checkSlugAvailability('/api/bundles', val, excludeId, 'bundleSlugStatus', 'btnSaveBundle', (avail) => {
    _bundleSlugAvailable = avail;
  });
}, 450);

function openBundleModal() {
  _currentBundleId = null; _currentBundleItems = [];
  document.getElementById('bundleId').value = '';
  document.getElementById('bundleJudul').value = '';
  document.getElementById('bundleSlug').value = '';
  document.getElementById('bundleDeskripsi').value = '';
  document.getElementById('bundleSlugPreview').textContent = '-';
  document.getElementById('bundleSlugStatus').className = 'slug-status';
  document.getElementById('bundleSlugStatus').innerHTML = '';
  _bundleSlugAvailable = true;
  document.getElementById('btnSaveBundle').disabled = false;
  document.getElementById('bundleExpiredAt').value = '';
  document.getElementById('bundleExpiredToggle').checked = false;
  document.getElementById('bundleExpiredField').style.display = 'none';
  document.getElementById('bundleProtected').checked = false;
  document.getElementById('bundlePassword').value = '';
  document.getElementById('bundlePasswordHint').textContent = 'Pengunjung wajib memasukkan password ini sebelum bundle bisa dibuka.';
  _bundleWasProtected = false;
  _toggleBundlePasswordField();
  document.getElementById('bundleItemsList').innerHTML =
    '<div style="text-align:center;color:var(--teks-muted);padding:16px;font-size:.82rem">Simpan info bundle dulu untuk mulai menambah item.</div>';
  document.getElementById('bundleInlineItemForm').style.display = 'none';
  document.getElementById('modalBundleTitle').textContent = 'Buat Bundle';
  document.getElementById('btnSaveBundle').innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5" style="margin-right:5px;vertical-align:-2px"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"/></svg>Simpan Info';
  document.getElementById('bundleItemCount').textContent = '';
  _setBundleItemsLocked(true);
  openModal('modalBundle');
  setTimeout(() => {
    if (typeof initCdtp === 'function') initCdtp();
    const m = document.getElementById('cdtp_bundleExpired');
    if (m?._cdtp) m._cdtp.clear();
  }, 30);
}

function _toggleBundleExpiredField() {
  const on = document.getElementById('bundleExpiredToggle').checked;
  document.getElementById('bundleExpiredField').style.display = on ? '' : 'none';
  if (!on) {
    document.getElementById('bundleExpiredAt').value = '';
    const m = document.getElementById('cdtp_bundleExpired');
    if (m?._cdtp) m._cdtp.clear();
  }
}

let _bundleWasProtected = false;

function _toggleBundlePasswordField() {
  const on = document.getElementById('bundleProtected').checked;
  document.getElementById('bundlePasswordField').style.display = on ? '' : 'none';
  document.getElementById('bundlePassword').placeholder = (on && _bundleWasProtected)
    ? 'Kosongkan jika tidak ingin mengganti password' : 'Masukkan password baru';
}

document.getElementById('bundleJudul').addEventListener('input', function() {
  if (!document.getElementById('bundleSlug').value) {
    const slug = this.value.toLowerCase().replace(/[^a-z0-9\s-]/g,'').trim().replace(/\s+/g,'-').substring(0,60);
    document.getElementById('bundleSlugPreview').textContent = slug || '-';
    _checkBundleSlugDebounced();
  }
});

document.getElementById('bundleSlug').addEventListener('input', function() {
  document.getElementById('bundleSlugPreview').textContent = this.value || '-';
  _checkBundleSlugDebounced();
});

async function editBundle(id) {
  const b = _bundles.find(x => x.id === id); if (!b) return;
  _currentBundleId = id;
  document.getElementById('bundleId').value = b.id;
  document.getElementById('bundleJudul').value = b.judul;
  document.getElementById('bundleSlug').value = b.slug;
  document.getElementById('bundleDeskripsi').value = b.deskripsi || '';
  document.getElementById('bundleSlugPreview').textContent = b.slug;
  document.getElementById('bundleSlugStatus').className = 'slug-status';
  document.getElementById('bundleSlugStatus').innerHTML = '';
  _bundleSlugAvailable = true;
  document.getElementById('btnSaveBundle').disabled = false;
  document.getElementById('modalBundleTitle').textContent = 'Edit Bundle';
  document.getElementById('btnSaveBundle').innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5" style="margin-right:5px;vertical-align:-2px"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"/></svg>Simpan Info';
  document.getElementById('bundleInlineItemForm').style.display = 'none';
  document.getElementById('bundleExpiredAt').value = _isoToLocalInput(b.expired_at);
  document.getElementById('bundleExpiredToggle').checked = !!b.expired_at;
  document.getElementById('bundleExpiredField').style.display = b.expired_at ? '' : 'none';
  _bundleWasProtected = !!b.is_protected;
  document.getElementById('bundleProtected').checked = _bundleWasProtected;
  document.getElementById('bundlePassword').value = '';
  document.getElementById('bundlePasswordHint').textContent = _bundleWasProtected
    ? 'Sudah diproteksi. Isi untuk ganti password, atau matikan toggle utk menghapus proteksi.'
    : 'Pengunjung wajib memasukkan password ini sebelum bundle bisa dibuka.';
  _toggleBundlePasswordField();
  _setBundleItemsLocked(false);
  try {
    const r = await fetch(`/api/bundles/${id}`, { headers: authHeaders() });
    const d = await r.json();
    _currentBundleItems = d.items || [];
    renderBundleItems();
  } catch {}
  openModal('modalBundle');
  setTimeout(() => {
    if (typeof initCdtp === 'function') initCdtp();
    const m = document.getElementById('cdtp_bundleExpired');
    if (m?._cdtp) m._cdtp.set(b.expired_at || null);
  }, 30);
}

function renderBundleItems() {
  const c = document.getElementById('bundleItemsList');
  document.getElementById('bundleItemCount').textContent =
    _currentBundleItems.length ? `(${_currentBundleItems.length})` : '';
  c.innerHTML = _currentBundleItems.length ? _currentBundleItems.map(item => `
    <div style="display:flex;align-items:center;gap:10px;padding:8px 10px;border-radius:9px;border:1.5px solid var(--abu-2);margin-bottom:7px;background:#fff">
      <span style="font-size:18px;flex-shrink:0;display:flex;align-items:center"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"/></svg></span>
      <div style="flex:1;min-width:0">
        <div style="font-size:.82rem;font-weight:700">${esc(item.judul)}</div>
        <div style="font-size:.72rem;color:var(--teks-muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(item.url)}</div>
        ${item.deskripsi ? `<div style="font-size:.72rem;color:var(--teks-muted)">${esc(item.deskripsi)}</div>` : ''}
      </div>
      <button class="btn btn-ghost btn-sm" data-tip="Edit" onclick="editBundleItem(${item.id})"><svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg></button>
      <button class="btn-hapus" onclick="deleteBundleItem(${item.id})"><svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/></svg></button>
    </div>`).join('')
    : '<div style="text-align:center;color:var(--teks-muted);padding:16px;font-size:.82rem">Belum ada item</div>';
}

async function saveBundle() {
  // Auto-commit picker yang masih terbuka (user belum klik "Pilih")
  const mExp = document.getElementById('cdtp_bundleExpired');
  if (mExp?._cdtp?.commit) mExp._cdtp.commit();

  const id = document.getElementById('bundleId').value;
  const judul = document.getElementById('bundleJudul').value.trim();
  const slug = document.getElementById('bundleSlug').value.trim();
  const aktif = true;
  const deskripsi = document.getElementById('bundleDeskripsi').value.trim() || null;
  const expiredOn    = document.getElementById('bundleExpiredToggle').checked;
  const expiredLocal = document.getElementById('bundleExpiredAt').value;
  const protectedNow = document.getElementById('bundleProtected').checked;
  const pwInput = document.getElementById('bundlePassword').value;
  if (!judul) { toast('Judul wajib diisi', 'error'); return; }
  if (!_bundleSlugAvailable) { toast('Slug sudah digunakan, ganti dulu', 'error'); return; }
  if (protectedNow && !pwInput && !_bundleWasProtected) { toast('Isi password utk proteksi bundle', 'error'); return; }
  const body = {
    judul, deskripsi, slug: slug || undefined, aktif,
    expired_at: (expiredOn && expiredLocal) ? new Date(expiredLocal).toISOString() : null,
  };
  if (!protectedNow) {
    body.clear_password = true;
  } else if (pwInput) {
    body.password = pwInput;
  } // kalau protectedNow true & pwInput kosong (edit, sudah ada password) -> jangan diubah
  try {
    const r = await fetch(id ? `/api/bundles/${id}` : '/api/bundles', {
      method: id ? 'PUT' : 'POST', headers: authHeaders(),
      body: JSON.stringify(body),
    });
    const d = await r.json();
    if (!r.ok) { toast(d.error || 'Gagal', 'error'); return; }
    toast(id ? 'Bundle diperbarui' : 'Bundle dibuat');
    loadBundles();
    if (id) {
      // Edit: tutup modal langsung
      closeModal('modalBundle');
    } else {
      // Buat baru: tetap buka modal agar bisa langsung tambah items
      _currentBundleId = d.bundle.id;
      document.getElementById('bundleId').value = d.bundle.id;
      document.getElementById('bundleSlug').value = d.bundle.slug;
      document.getElementById('bundleSlugPreview').textContent = d.bundle.slug;
      document.getElementById('modalBundleTitle').textContent = 'Edit Bundle';
      document.getElementById('btnSaveBundle').innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5" style="margin-right:5px;vertical-align:-2px"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"/></svg>Simpan';
      document.getElementById('bundleItemsList').innerHTML =
        '<div style="text-align:center;color:var(--teks-muted);padding:16px;font-size:.82rem">Belum ada item</div>';
      _setBundleItemsLocked(false);
    }
  } catch { toast('Gagal menyimpan', 'error'); }
}

async function deleteBundle(id) {
  const ok = await showConfirm({ title: 'Hapus Bundle', msg: 'Bundle beserta semua item di dalamnya akan dihapus permanen.', okText: 'Ya, Hapus', icon: 'trash' });
  if (!ok) return;
  await fetch(`/api/bundles/${id}`, { method: 'DELETE', headers: authHeaders() });
  toast('Bundle berhasil dihapus'); loadBundles();
}

// ── Bundle Items (inline form) ──────────────────────────
function showInlineItemForm() {
  document.getElementById('bundleItemId').value = '';
  document.getElementById('biJudul').value = '';
  document.getElementById('biUrl').value = '';
  document.getElementById('bundleInlineItemForm').style.display = 'block';
  document.getElementById('biJudul').focus();
}

function hideInlineItemForm() {
  document.getElementById('bundleInlineItemForm').style.display = 'none';
}

function editBundleItem(itemId) {
  const item = _currentBundleItems.find(x => x.id === itemId); if (!item) return;
  document.getElementById('bundleItemId').value = item.id;
  document.getElementById('biJudul').value = item.judul;
  document.getElementById('biUrl').value = item.url;
  document.getElementById('bundleInlineItemForm').style.display = 'block';
  document.getElementById('biJudul').focus();
  document.getElementById('bundleInlineItemForm').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

async function saveBundleItem() {
  const itemId = document.getElementById('bundleItemId').value;
  const body = {
    judul: document.getElementById('biJudul').value.trim(),
    url: document.getElementById('biUrl').value.trim(),
  };
  if (!body.judul || !body.url) { toast('Judul dan URL wajib diisi', 'error'); return; }
  const endpoint = itemId
    ? `/api/bundles/${_currentBundleId}/items/${itemId}`
    : `/api/bundles/${_currentBundleId}/items`;
  try {
    const r = await fetch(endpoint, { method: itemId ? 'PUT' : 'POST', headers: authHeaders(), body: JSON.stringify(body) });
    const d = await r.json();
    if (!r.ok) { toast(d.error || 'Gagal', 'error'); return; }
    toast(itemId ? 'Item diperbarui' : 'Item ditambahkan');
    hideInlineItemForm();
    const rr = await fetch(`/api/bundles/${_currentBundleId}`, { headers: authHeaders() });
    const dd = await rr.json();
    _currentBundleItems = dd.items || [];
    renderBundleItems();
    loadBundles();
  } catch { toast('Gagal menyimpan', 'error'); }
}

async function deleteBundleItem(itemId) {
  const ok = await showConfirm({ title: 'Hapus Item', msg: 'Item bundle ini akan dihapus.', okText: 'Ya, Hapus', icon: 'trash' });
  if (!ok) return;
  await fetch(`/api/bundles/${_currentBundleId}/items/${itemId}`, { method: 'DELETE', headers: authHeaders() });
  toast('Item dihapus');
  const rr = await fetch(`/api/bundles/${_currentBundleId}`, { headers: authHeaders() });
  const dd = await rr.json();
  _currentBundleItems = dd.items || [];
  renderBundleItems();
  loadBundles();
}

// ═══════════════════════════════════════════
// SHARE MODAL - QR code + copy + WhatsApp (mirip s.id)
// dipakai bareng oleh Shortlink & Bundle
// ═══════════════════════════════════════════
let _shareUrl = '';

// Helper reusable: render QR (dgn logo di tengah) ke dalam sebuah box.
// url yg di-encode ke QR beda dari _shareUrl (ditambah ?src=qr) biar kunjungan lewat
// scan QR bisa dibedakan dari klik link biasa di statistik "QR Code Visitor".
function _renderQrCode(box, url, opts = {}) {
  const { size = 260, logoSize = 48, logoPad = 12, radius = 10 } = opts;
  box.innerHTML = '';
  box.style.position = 'relative';
  if (typeof QRCode === 'undefined') {
    box.innerHTML = '<div style="padding:24px;color:var(--teks-muted);font-size:.8rem">QR code gagal dimuat, cek koneksi internet</div>';
    return;
  }
  new QRCode(box, {
    text: url, width: size, height: size,
    colorDark: '#000000', colorLight: '#ffffff',
    correctLevel: QRCode.CorrectLevel.H, // H = koreksi tinggi, wajib krn ketiban logo
  });
  // Icon aplikasi di tengah QR (mirip s.id)
  const logo = document.createElement('img');
  logo.src = '/favicon.png';
  logo.alt = 'SAPA';
  logo.className = 'share-qr-logo';
  logo.style.cssText = `position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);` +
    `width:${logoSize}px;height:${logoSize}px;object-fit:contain;background:#fff;padding:${logoPad}px;` +
    `border-radius:${radius}px;box-shadow:0 2px 8px rgba(0,0,0,.25);`;
  box.appendChild(logo);
}

function _qrTrackUrl(url) {
  return url + (url.includes('?') ? '&' : '?') + 'src=qr';
}

// Ambil {judul, url} target share dari Link/Bundle - dipakai openShareModal & menu dropdown Bagikan
function _resolveShareTarget(type, id) {
  if (type === 'link') {
    const l = _links.find(x => x.id === id);
    if (!l || !l.slug_pendek) return null;
    return { judul: l.judul, url: location.origin + '/' + l.slug_pendek };
  }
  const b = _bundles.find(x => x.id === id);
  if (!b) return null;
  return { judul: b.judul, url: location.origin + '/' + b.slug };
}

function openShareModal(type, id) {
  const target = _resolveShareTarget(type, id);
  if (!target) return;
  const { judul, url } = target;
  _shareUrl = url;

  document.getElementById('shareTitle').textContent = judul || '';
  document.getElementById('shareUrlInput').value = _shareUrl;
  document.getElementById('shareWaBtn').href =
    'https://wa.me/?text=' + encodeURIComponent(`${judul || ''}\n${_shareUrl}`.trim());

  _renderQrCode(document.getElementById('shareQrBox'), _qrTrackUrl(_shareUrl), { size: 260, logoSize: 48, logoPad: 12, radius: 10 });
  openModal('modalShare');
}

function copyShareUrl() {
  if (!_shareUrl) return;
  navigator.clipboard.writeText(_shareUrl).then(() => toast('URL disalin: ' + _shareUrl));
}

// ═══════════════════════════════════════════
// SHARE DROPDOWN MENU (mirip s.id): tombol "Bagikan" di row Link/Bundle
// buka menu quick-share (Share ke lainnya, Facebook, X, WhatsApp, Salin,
// Kode QR) alih-alih langsung buka modal QR.
// ═══════════════════════════════════════════
let _shareMenuEl = null;
let _shareMenuCtx = null; // { type, id }

const _shareMenuIcons = {
  native:   `<svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8a3 3 0 1 0-2.83-4H15a3 3 0 0 0 .05.54L8.09 8.49a3 3 0 1 0 0 7.02l6.96 3.95A3 3 0 1 0 15.83 18l-6.96-3.95a3 3 0 0 0 0-2.1L15.83 8A3 3 0 0 0 18 8z"/></svg>`,
  facebook: `<svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><path d="M22 12.06C22 6.5 17.52 2 12 2S2 6.5 2 12.06c0 5 3.66 9.15 8.44 9.94v-7.03H7.9v-2.91h2.54V9.85c0-2.5 1.49-3.89 3.77-3.89 1.09 0 2.24.2 2.24.2v2.46h-1.26c-1.24 0-1.63.77-1.63 1.56v1.88h2.78l-.44 2.91h-2.34V22c4.78-.79 8.44-4.94 8.44-9.94z"/></svg>`,
  twitter:  `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M18.9 2H22l-7.6 8.7L23.3 22h-7.1l-5.5-7.2L4.4 22H1.3l8.1-9.3L1 2h7.3l5 6.6L18.9 2zm-1.2 18h1.7L7.4 4h-1.8l12.1 16z"/></svg>`,
  whatsapp: `<svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 21l1.65-3.8a9 9 0 1 1 3.4 3.4L3 21"/><path d="M9 10a.5.5 0 0 0 1 0V9a.5.5 0 0 0-1 0v1zm0 0c0 2 2 4 4 4h1a.5.5 0 0 0 0-1h-1a.5.5 0 0 1 0-1"/></svg>`,
  copy:     `<svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="12" height="12" rx="2.5"/><path d="M15 5H6a2 2 0 0 0-2 2v9"/></svg>`,
  qr:       `<svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><path d="M14 14h3v3h-3zM19 14h2v2h-2zM14 19h2v2h-2zM19 19h2v2h-2z"/></svg>`,
};

function _ensureShareMenu() {
  if (_shareMenuEl) return _shareMenuEl;
  const el = document.createElement('div');
  el.className = 'share-menu';
  el.innerHTML = `
    <button type="button" class="share-menu-item" data-act="native">${_shareMenuIcons.native}Share ke lainnya</button>
    <button type="button" class="share-menu-item" data-act="facebook">${_shareMenuIcons.facebook}Facebook</button>
    <button type="button" class="share-menu-item" data-act="twitter">${_shareMenuIcons.twitter}Twitter X</button>
    <button type="button" class="share-menu-item" data-act="whatsapp">${_shareMenuIcons.whatsapp}WhatsApp</button>
    <div class="share-menu-divider"></div>
    <button type="button" class="share-menu-item" data-act="copy">${_shareMenuIcons.copy}Salin URL</button>
    <button type="button" class="share-menu-item" data-act="qr">${_shareMenuIcons.qr}Kode QR</button>
  `;
  el.addEventListener('click', (e) => {
    const btn = e.target.closest('.share-menu-item');
    if (!btn || !_shareMenuCtx) return;
    _runShareAction(btn.dataset.act, _shareMenuCtx.type, _shareMenuCtx.id);
    closeShareMenu();
  });
  document.body.appendChild(el);
  _shareMenuEl = el;
  return el;
}

function _positionShareMenu(btn) {
  const r = btn.getBoundingClientRect();
  const menuW = 210;
  let left = r.right - menuW;
  if (left < 8) left = 8;
  if (left + menuW > window.innerWidth - 8) left = window.innerWidth - menuW - 8;
  _shareMenuEl.style.left = left + 'px';
  _shareMenuEl.style.top = (r.bottom + 6) + 'px';
  requestAnimationFrame(() => {
    const menuH = _shareMenuEl.offsetHeight;
    if (r.bottom + 6 + menuH > window.innerHeight - 8) {
      _shareMenuEl.style.top = Math.max(8, r.top - menuH - 6) + 'px';
    }
  });
}

function toggleShareMenu(ev, type, id) {
  ev.stopPropagation();
  const btn = ev.currentTarget;
  const menu = _ensureShareMenu();
  const alreadyOpenSame = menu.classList.contains('open') && _shareMenuCtx?.type === type && _shareMenuCtx?.id === id;
  if (alreadyOpenSame) { closeShareMenu(); return; }
  _shareMenuCtx = { type, id };
  _positionShareMenu(btn);
  menu.classList.add('open');
}

function closeShareMenu() {
  if (_shareMenuEl) _shareMenuEl.classList.remove('open');
}

document.addEventListener('click', (e) => {
  if (_shareMenuEl && _shareMenuEl.classList.contains('open') &&
      !e.target.closest('.share-menu') && !e.target.closest('[data-share-trigger]')) {
    closeShareMenu();
  }
});
window.addEventListener('scroll', closeShareMenu, true);
window.addEventListener('resize', closeShareMenu);

function _runShareAction(act, type, id) {
  const target = _resolveShareTarget(type, id);
  if (!target) return;
  const { judul, url } = target;
  switch (act) {
    case 'native':
      if (navigator.share) {
        navigator.share({ title: judul || 'SAPA', url }).catch(() => {});
      } else {
        navigator.clipboard.writeText(url).then(() => toast('URL disalin: ' + url));
      }
      break;
    case 'facebook':
      window.open('https://www.facebook.com/sharer/sharer.php?u=' + encodeURIComponent(url), '_blank', 'noopener,width=600,height=520');
      break;
    case 'twitter':
      window.open('https://twitter.com/intent/tweet?text=' + encodeURIComponent(judul || '') + '&url=' + encodeURIComponent(url), '_blank', 'noopener,width=600,height=520');
      break;
    case 'whatsapp':
      window.open('https://wa.me/?text=' + encodeURIComponent(`${judul || ''}\n${url}`.trim()), '_blank', 'noopener');
      break;
    case 'copy':
      navigator.clipboard.writeText(url).then(() => toast('URL disalin: ' + url));
      break;
    case 'qr':
      openShareModal(type, id);
      break;
  }
}

// ═══════════════════════════════════════════
// LINK DETAIL (mirip s.id: QR, status proteksi/berjangka, Analytics)
// ═══════════════════════════════════════════
let _ldCurrentId = null;
let _ldCurrentType = 'link'; // 'link' | 'bundle'

function openLinkDetail(id) {
  const l = _links.find(x => x.id === id); if (!l || !l.slug_pendek) return;
  _openItemDetail('link', id, {
    slug: l.slug_pendek,
    url: l.url,
    created_at: l.created_at,
    is_protected: l.is_protected,
    expired_at: l.expired_at,
  });
}

function openBundleDetail(id) {
  const b = _bundles.find(x => x.id === id); if (!b) return;
  _openItemDetail('bundle', id, {
    slug: b.slug,
    url: b.judul, // dipakai sebagai baris kedua (deskripsi singkat), bukan tautan tujuan
    created_at: b.created_at,
    is_protected: b.is_protected,
    expired_at: b.expired_at,
  });
}

function _openItemDetail(type, id, info) {
  _ldCurrentType = type;
  _ldCurrentId = id;
  document.getElementById('ldLinkId').value = id;
  const url = location.origin + '/' + info.slug;

  document.getElementById('ldTitle').innerHTML =
    `<span style="color:var(--merah,#dc2626)">${esc(location.host)}</span>/${esc(info.slug)}`;
  document.getElementById('ldUrl').textContent = info.url;
  document.getElementById('ldUrl').title = info.url;
  document.getElementById('ldDate').textContent = fmtDate(info.created_at);

  _renderQrCode(document.getElementById('ldQrBox'), _qrTrackUrl(url), { size: 88, logoSize: 22, logoPad: 5, radius: 6 });

  const ldModalTitleEl = document.querySelector('#modalLinkDetail .modal-title');
  if (ldModalTitleEl) ldModalTitleEl.textContent = type === 'bundle' ? 'Bundle Detail' : 'Link Detail';

  const label = type === 'bundle' ? 'bundle' : 'link';
  const pTitle = document.getElementById('ldProtectedTitle');
  const pBtn   = document.getElementById('ldProtectedBtn');
  if (info.is_protected) { pTitle.textContent = `This ${label} is protected`; pBtn.textContent = 'Ganti Password'; }
  else { pTitle.textContent = `This ${label} is not protected`; pBtn.textContent = 'Set Password'; }

  const eTitle = document.getElementById('ldExpiryTitle');
  const eBtn   = document.getElementById('ldExpiryBtn');
  if (info.expired_at) {
    const expired = new Date(info.expired_at) < new Date();
    eTitle.textContent = (expired ? 'Expired on ' : 'Active until ') + fmtDate(info.expired_at);
    eBtn.textContent = 'Ubah Waktu';
  } else { eTitle.textContent = 'No expiration set'; eBtn.textContent = 'Set Time'; }

  openModal('modalLinkDetail');

  // Default rentang Analytics: 7 hari terakhir
  const today = new Date();
  const weekAgo = new Date(today.getTime() - 6 * 86400000);
  const todayIso = today.toISOString();
  const weekAgoIso = weekAgo.toISOString();
  setTimeout(() => {
    if (typeof initCdtp === 'function') initCdtp();
    const mDari = document.getElementById('cdtp_ldDari');
    const mSampai = document.getElementById('cdtp_ldSampai');
    if (mDari?._cdtp) mDari._cdtp.set(weekAgoIso);
    if (mSampai?._cdtp) mSampai._cdtp.set(todayIso);
    const dariEl = document.getElementById('ldRangeDari');
    const sampaiEl = document.getElementById('ldRangeSampai');
    if (dariEl && !dariEl._ldBound) {
      dariEl.addEventListener('change', () => _ldReloadAnalytics());
      sampaiEl.addEventListener('change', () => _ldReloadAnalytics());
      dariEl._ldBound = true;
    }
    // Load pertama: kirim tanggal yang kita hitung sendiri (todayIso/weekAgoIso),
    // JANGAN baca dari hidden input ldRangeDari/ldRangeSampai - widget CDTP
    // nulis ke situ secara async, jadi 30ms setelah .set() belum tentu sempat
    // ke-commit. Kalau masih kebaca kosong, _ldReloadAnalytics langsung
    // return duluan tanpa pernah fetch (makanya total visitor diem di 0
    // walau data klik-nya ada). Baca-dari-DOM tetap dipakai buat perubahan
    // manual lewat date picker (event 'change' di atas).
    _ldReloadAnalytics(_ldDateOnly(weekAgoIso), _ldDateOnly(todayIso));
  }, 30);
}

function _ldCopy() {
  if (_ldCurrentType === 'bundle') {
    const b = _bundles.find(x => x.id === _ldCurrentId); if (b) copyBundleUrl(b.slug);
  } else {
    const l = _links.find(x => x.id === _ldCurrentId); if (l) copySlug(l.slug_pendek);
  }
}
function _ldEdit() {
  if (!_ldCurrentId) return;
  closeModal('modalLinkDetail');
  if (_ldCurrentType === 'bundle') editBundle(_ldCurrentId); else editLink(_ldCurrentId);
}
function _ldQrStyle() {
  if (!_ldCurrentId) return;
  closeModal('modalLinkDetail');
  openShareModal(_ldCurrentType, _ldCurrentId);
}

function _ldDateOnly(v) {
  if (!v) return '';
  // v adalah ISO timestamp UTC (dari toISOString()/CDTP). Geser +8 jam ke WITA
  // dulu sebelum ambil tanggalnya - kalau langsung split('T')[0] dari ISO UTC,
  // klik yang terjadi dini hari WITA (00:00-08:00, masih "kemarin" di UTC)
  // bisa kepotong dari rentang query analytics dan kebaca 0.
  const d = new Date(v);
  if (isNaN(d.getTime())) return v.split('T')[0];
  return new Date(d.getTime() + 8 * 3600000).toISOString().slice(0, 10);
}

async function _ldReloadAnalytics(dariOverride, sampaiOverride) {
  if (!_ldCurrentId) return;
  const dari   = dariOverride   || _ldDateOnly(document.getElementById('ldRangeDari').value);
  const sampai = sampaiOverride || _ldDateOnly(document.getElementById('ldRangeSampai').value);
  if (!dari || !sampai) return;
  const params = new URLSearchParams({ dari, sampai });
  const base = _ldCurrentType === 'bundle' ? '/api/bundles' : '/api/links';
  try {
    const r = await fetch(`${base}/${_ldCurrentId}/analytics?${params}`, { headers: authHeaders() });
    const d = await r.json();
    if (!r.ok) throw new Error(d.error || 'Gagal memuat');
    document.getElementById('ldStatTotal').textContent  = d.total_visitor ?? 0;
    document.getElementById('ldStatUnique').textContent = d.unique_visitor ?? 0;
    document.getElementById('ldStatQr').textContent     = d.qr_visitor ?? 0;
    _renderLdChart(d.daily || [], dari, sampai);
  } catch (err) {
    document.getElementById('ldChartBox').innerHTML = '<div class="ld-chart-empty">Gagal memuat data</div>';
  }
}

function _renderLdChart(daily, dari, sampai) {
  const box = document.getElementById('ldChartBox');
  const days = [];
  const cur = new Date(dari + 'T00:00:00');
  const end = new Date(sampai + 'T00:00:00');
  while (cur <= end && days.length < 120) {
    // Pakai komponen tanggal lokal langsung, JANGAN toISOString() - itu geser
    // ke UTC dulu, jadi "hari ini" WITA bisa kebaca mundur satu hari dan
    // nggak pernah match sama key tanggal WITA yang dikirim backend (bikin
    // grafik keliatan "Empty Data" walau total visitor-nya udah kehitung).
    const key = `${cur.getFullYear()}-${String(cur.getMonth() + 1).padStart(2, '0')}-${String(cur.getDate()).padStart(2, '0')}`;
    const found = daily.find(d => d.tanggal === key);
    days.push({ tanggal: key, klik: found ? found.klik : 0 });
    cur.setDate(cur.getDate() + 1);
  }
  if (!days.length || days.every(d => d.klik === 0)) {
    box.innerHTML = `<div class="ld-chart-empty">
      <svg xmlns="http://www.w3.org/2000/svg" width="26" height="26" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8"><line x1="12" y1="20" x2="12" y2="10"/><line x1="18" y1="20" x2="18" y2="4"/><line x1="6" y1="20" x2="6" y2="16"/></svg>
      <span>Empty Data</span>
    </div>`;
    return;
  }
  const w = 100, h = 34, barGap = 0.6;
  const barW = (w / days.length) - barGap;
  const max = Math.max(...days.map(d => d.klik), 1);
  const bars = days.map((d, i) => {
    const barH = Math.max(0.6, (d.klik / max) * (h - 4));
    const x = i * (barW + barGap);
    const y = h - barH;
    const label = new Date(d.tanggal).toLocaleDateString('id-ID', { day: '2-digit', month: 'short' });
    return `<rect x="${x}" y="${y}" width="${barW}" height="${barH}" rx="0.6" fill="var(--hijau,#0f766e)"><title>${label}: ${d.klik}</title></rect>`;
  }).join('');
  box.innerHTML = `<svg viewBox="0 0 ${w} ${h}" width="100%" height="120" preserveAspectRatio="none">${bars}</svg>`;
}

function downloadShareQr() {
  const box = document.getElementById('shareQrBox');
  const canvas = box.querySelector('canvas');
  const logo = box.querySelector('img.share-qr-logo');
  const fallbackImg = box.querySelector('img:not(.share-qr-logo)');

  const finishDownload = (src) => {
    if (!src) { toast('QR belum siap, coba lagi', 'error'); return; }
    const a = document.createElement('a');
    a.href = src;
    a.download = `qr-${(_shareUrl.split('/').pop() || 'link')}.png`;
    document.body.appendChild(a); a.click(); a.remove();
  };

  if (!canvas) { finishDownload(fallbackImg ? fallbackImg.src : null); return; }

  // Upscale 4x biar hasil unduhan tajam & gede (~1040px), setara s.id, bukan cuma 260px display size
  const scale = 4;
  const qrPixel = canvas.width * scale;
  const margin = qrPixel * 0.08; // quiet zone putih di pinggir, biar ga mepet kayak s.id
  const out = document.createElement('canvas');
  out.width = qrPixel + margin * 2; out.height = qrPixel + margin * 2;
  const ctx = out.getContext('2d');
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, out.width, out.height);
  ctx.imageSmoothingEnabled = false; // jaga modul QR tetap tajam (kotak2), gak blur
  ctx.drawImage(canvas, margin, margin, qrPixel, qrPixel);

  if (logo && logo.complete && logo.naturalWidth > 0) {
    const size = qrPixel * 0.17;
    const pad = size * 0.32;
    const x = (out.width - size) / 2, y = (out.height - size) / 2;
    ctx.fillStyle = '#fff';
    if (ctx.roundRect) {
      ctx.beginPath();
      ctx.roundRect(x - pad, y - pad, size + pad * 2, size + pad * 2, 6 * scale);
      ctx.fill();
    } else {
      ctx.fillRect(x - pad, y - pad, size + pad * 2, size + pad * 2);
    }
    ctx.drawImage(logo, x, y, size, size);
  }
  finishDownload(out.toDataURL('image/png'));
}