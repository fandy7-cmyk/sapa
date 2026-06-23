// ── Toggle label helper ──────────────────────────────────
function _updateToggleLabel(id) {
  const el = document.getElementById(id);
  if (!el) return;
  const lbl = document.querySelector(`label[for="${id}"]`);
  if (lbl) lbl.textContent = el.checked ? 'Aktif' : 'Nonaktif';
}

// ── Status dropdown: hanya tampilkan opsi yang ada datanya ──
function _buildStatusOptions(data, getAktif = d => d.aktif) {
  const aktifCount    = data.filter(d => getAktif(d)).length;
  const nonaktifCount = data.filter(d => !getAktif(d)).length;
  let opts = `<option value="">Semua Status</option>`;
  if (aktifCount)    opts += `<option value="aktif">Aktif</option>`;
  if (nonaktifCount) opts += `<option value="nonaktif">Nonaktif</option>`;
  return opts;
}

// ═══════════════════════════════════════════
// LINKS
// ═══════════════════════════════════════════
let _links = [], _linksFiltered = [], _linkPage = 1, _linkPageSize = 15;

async function loadLinks() {
  try {
    const lr = await fetch('/api/links', { headers: authHeaders() });
    const ld = await lr.json();
    _links = ld.links || [];
    _linksFiltered = [..._links]; _linkPage = 1;
    renderLinks();
    // Rebuild filter dropdowns — hanya tampilkan opsi yg ada datanya
    const lfs = document.getElementById('linkFilterStatus');
    if (lfs) lfs.innerHTML = _buildStatusOptions(_links);
    const slfs = document.getElementById('slFilterStatus');
    if (slfs) slfs.innerHTML = _buildStatusOptions(_links.filter(l => l.slug_pendek));
  } catch (e) { console.error(e); }
}

function filterLinks() {
  const q      = document.getElementById('linkSearch').value.toLowerCase();
  const status = document.getElementById('linkFilterStatus')?.value || '';
  _linksFiltered = _links.filter(l => {
    const matchQ = l.judul.toLowerCase().includes(q) || l.url.toLowerCase().includes(q);
    const matchS = !status || (status === 'aktif' ? l.aktif : !l.aktif);
    return matchQ && matchS;
  });
  _linkPage = 1; renderLinks();
}

function renderLinks() {
  const start = (_linkPage - 1) * _linkPageSize;
  const slice = _linksFiltered.slice(start, start + _linkPageSize);
  const tb = document.getElementById('linkTableBody');
  tb.innerHTML = slice.length ? slice.map(l => `
    <tr>
      <td><span style="display:inline-flex;align-items:center;gap:6px">
        ${l.ikon ? esc(l.ikon) : '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"/></svg>'}
        <strong>${esc(l.judul)}</strong>
      </span></td>
      <td><a href="${esc(l.url)}" target="_blank" style="color:var(--hijau);font-size:.75rem">${esc(l.url.length > 40 ? l.url.slice(0,40)+'…' : l.url)}</a></td>
      <td>${l.slug_pendek ? `<code style="font-size:.78rem;background:var(--abu-1);padding:2px 7px;border-radius:5px">/${esc(l.slug_pendek)}</code>` : '<span style="color:var(--teks-muted)">—</span>'}</td>
      <td><span class="badge badge-blue">${l.total_klik ?? 0}</span></td>
      <td><span class="badge ${l.aktif ? 'badge-green' : 'badge-red'}">${l.aktif ? 'Aktif' : 'Nonaktif'}</span></td>
      <td style="white-space:nowrap">
        <button class="btn btn-ghost btn-sm" title="Edit" onclick="editLink(${l.id})"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg></button>
        <button class="btn btn-danger btn-sm" title="Hapus" onclick="deleteLink(${l.id})"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path stroke-linecap="round" stroke-linejoin="round" d="M19 6l-1 14H6L5 6"/><path stroke-linecap="round" stroke-linejoin="round" d="M10 11v6m4-6v6"/><path stroke-linecap="round" stroke-linejoin="round" d="M9 6V4h6v2"/></svg></button>
      </td>
    </tr>`).join('')
    : '<tr class="empty-row"><td colspan="6">Tidak ada link</td></tr>';
  renderPagination('linkPagination', _linksFiltered.length, _linkPage, _linkPageSize, 'goLinkPage');
}

window.goLinkPage = (p) => { _linkPage = p; renderLinks(); };

function openLinkModal(id) {
  document.getElementById('linkId').value = '';
  document.getElementById('linkJudul').value = '';
  document.getElementById('linkUrl').value = '';
  document.getElementById('linkSlug').value = '';
  document.getElementById('linkAktif').checked = true;
  _updateToggleLabel('linkAktif');
  document.getElementById('slugPreview').textContent = '—';
  document.getElementById('modalLinkTitle').textContent = 'Tambah Link';
  openModal('modalLink');
}

function editLink(id) {
  const l = _links.find(x => x.id === id); if (!l) return;
  document.getElementById('linkId').value = l.id;
  document.getElementById('linkJudul').value = l.judul;
  document.getElementById('linkUrl').value = l.url;
  document.getElementById('linkSlug').value = l.slug_pendek || '';
  document.getElementById('linkAktif').checked = l.aktif === true || l.aktif === 'true';
  _updateToggleLabel('linkAktif');
  document.getElementById('slugPreview').textContent = l.slug_pendek || '—';
  document.getElementById('modalLinkTitle').textContent = 'Edit Link';
  openModal('modalLink');
}

document.getElementById('linkAktif').addEventListener('change', function() {
  _updateToggleLabel('linkAktif');
});

document.getElementById('linkSlug').addEventListener('input', function() {
  document.getElementById('slugPreview').textContent = this.value || '—';
});

async function saveLink() {
  const id  = document.getElementById('linkId').value;
  const body = {
    judul:      document.getElementById('linkJudul').value.trim(),
    url:        document.getElementById('linkUrl').value.trim(),
    aktif:      document.getElementById('linkAktif').checked,
    slug_pendek:document.getElementById('linkSlug').value.trim() || null,
  };
  if (!body.judul || !body.url) { toast('Judul dan URL wajib diisi', 'error'); return; }
  try {
    const r = await fetch(id ? `/api/links/${id}` : '/api/links', {
      method: id ? 'PUT' : 'POST', headers: authHeaders(), body: JSON.stringify(body),
    });
    const d = await r.json();
    if (!r.ok) { toast(d.error || 'Gagal menyimpan', 'error'); return; }
    toast(id ? 'Link diperbarui' : 'Link ditambahkan');
    closeModal('modalLink');
    await loadLinks();
    // Sync shortlink view jika sedang aktif
    _slFiltered = _links.filter(l => l.slug_pendek);
    if (document.getElementById('page-shortlink')?.classList.contains('active')) renderShortlinks();
  } catch { toast('Gagal menyimpan', 'error'); }
}

async function deleteLink(id) {
  const ok = await showConfirm({ title: 'Hapus Link', msg: 'Link ini akan dihapus permanen. Lanjutkan?', okText: 'Ya, Hapus', icon: 'trash' });
  if (!ok) return;
  try {
    await fetch(`/api/links/${id}`, { method: 'DELETE', headers: authHeaders() });
    toast('Link berhasil dihapus');
    await loadLinks();
    _slFiltered = _links.filter(l => l.slug_pendek);
    if (document.getElementById('page-shortlink')?.classList.contains('active')) renderShortlinks();
  } catch { toast('Gagal menghapus', 'error'); }
}

// ═══════════════════════════════════════════
// SHORTLINKS (subset dari links yg punya slug_pendek)
// ═══════════════════════════════════════════
let _slFiltered = [];

async function loadShortlinks() {
  if (!_links.length) await loadLinks();
  _slFiltered = _links.filter(l => l.slug_pendek);
  renderShortlinks();
}

function filterShortlinks() {
  const q      = document.getElementById('slSearch').value.toLowerCase();
  const status = document.getElementById('slFilterStatus')?.value || '';
  _slFiltered = _links.filter(l => l.slug_pendek && (
    l.judul.toLowerCase().includes(q) || l.slug_pendek.toLowerCase().includes(q)
  ) && (!status || (status === 'aktif' ? l.aktif : !l.aktif)));
  renderShortlinks();
}

function renderShortlinks() {
  const tb = document.getElementById('slTableBody');
  tb.innerHTML = _slFiltered.length ? _slFiltered.map(l => `
    <tr>
      <td><span style="display:inline-flex;align-items:center;gap:6px">${l.ikon ? esc(l.ikon) : `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"/></svg>`} <strong>${esc(l.judul)}</strong></span></td>
      <td>
        <code style="font-size:.78rem;background:var(--abu-1);padding:2px 7px;border-radius:5px">/${esc(l.slug_pendek)}</code>
        <button class="btn btn-ghost btn-sm" style="margin-left:4px" title="Salin URL" onclick="copySlug('${esc(l.slug_pendek)}')"><svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path stroke-linecap="round" stroke-linejoin="round" d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg></button>
      </td>
      <td><a href="${esc(l.url)}" target="_blank" style="color:var(--hijau);font-size:.75rem">${esc(l.url.length>35?l.url.slice(0,35)+'…':l.url)}</a></td>
      <td>${l.total_klik ?? 0}</td>
      <td><span class="badge ${l.aktif?'badge-green':'badge-red'}">${l.aktif?'Aktif':'Nonaktif'}</span></td>
      <td><button class="btn btn-ghost btn-sm" title="Edit" onclick="editLink(${l.id}); closeModal('modalLink'); openModal('modalLink')"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg></button>
          <button class="btn btn-danger btn-sm" title="Hapus" onclick="deleteLink(${l.id})"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path stroke-linecap="round" stroke-linejoin="round" d="M19 6l-1 14H6L5 6"/><path stroke-linecap="round" stroke-linejoin="round" d="M10 11v6m4-6v6"/><path stroke-linecap="round" stroke-linejoin="round" d="M9 6V4h6v2"/></svg></button></td>
    </tr>`).join('')
    : '<tr class="empty-row"><td colspan="6">Tidak ada shortlink</td></tr>';
}

function openShortlinkModal() {
  openLinkModal();
  // auto-focus slug
  setTimeout(() => document.getElementById('linkSlug').focus(), 100);
}

function copySlug(slug) {
  const url = location.origin + '/' + slug;
  navigator.clipboard.writeText(url).then(() => toast('URL disalin: ' + url));
}

// ═══════════════════════════════════════════
// BUNDLES
// ═══════════════════════════════════════════
let _bundles = [], _bundlesFiltered = [], _bundlePage = 1, _bundlePageSize = 15;
let _currentBundleId = null;
let _currentBundleItems = [];

async function loadBundles() {
  try {
    const r = await fetch('/api/bundles', { headers: authHeaders() });
    const d = await r.json();
    _bundles = d.bundles || [];
    _bundlesFiltered = [..._bundles]; _bundlePage = 1;
    renderBundles();
    // Rebuild filter dropdowns — hanya tampilkan opsi yg ada datanya
    const bfs = document.getElementById('bundleFilterStatus');
    if (bfs) bfs.innerHTML = _buildStatusOptions(_bundles);
  } catch {}
}

function filterBundles() {
  const q      = (document.getElementById('bundleSearch')?.value || '').toLowerCase();
  const status = document.getElementById('bundleFilterStatus')?.value || '';
  _bundlesFiltered = _bundles.filter(b => {
    const matchQ = b.judul.toLowerCase().includes(q) || b.slug.toLowerCase().includes(q);
    const matchS = !status || (status === 'aktif' ? b.aktif : !b.aktif);
    return matchQ && matchS;
  });
  _bundlePage = 1; renderBundles();
}

function renderBundles() {
  const start = (_bundlePage - 1) * _bundlePageSize;
  const slice = _bundlesFiltered.slice(start, start + _bundlePageSize);
  const tb = document.getElementById('bundleTableBody');
  tb.innerHTML = slice.length ? slice.map(b => `
    <tr>
      <td><strong>${esc(b.judul)}</strong></td>
      <td>
        <code style="font-size:.75rem;background:var(--abu-1);padding:2px 6px;border-radius:5px">/${esc(b.slug)}</code>
        <button class="btn btn-ghost btn-sm" style="margin-left:4px" title="Salin URL" onclick="copyBundleUrl('${esc(b.slug)}')"><svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path stroke-linecap="round" stroke-linejoin="round" d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg></button>
      </td>
      <td>${b.jumlah_item ?? 0} item</td>
      <td><span class="badge ${b.aktif?'badge-green':'badge-red'}">${b.aktif?'Aktif':'Nonaktif'}</span></td>
      <td style="white-space:nowrap">
        <button class="btn btn-ghost btn-sm" title="Edit" onclick="editBundle(${b.id})"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg></button>
        <button class="btn btn-danger btn-sm" title="Hapus" onclick="deleteBundle(${b.id})"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path stroke-linecap="round" stroke-linejoin="round" d="M19 6l-1 14H6L5 6"/><path stroke-linecap="round" stroke-linejoin="round" d="M10 11v6m4-6v6"/><path stroke-linecap="round" stroke-linejoin="round" d="M9 6V4h6v2"/></svg></button>
      </td>
    </tr>`).join('')
    : '<tr class="empty-row"><td colspan="5">Tidak ada bundle</td></tr>';
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

function openBundleModal() {
  _currentBundleId = null; _currentBundleItems = [];
  document.getElementById('bundleId').value = '';
  document.getElementById('bundleJudul').value = '';
  document.getElementById('bundleSlug').value = '';
  document.getElementById('bundleDeskripsi').value = '';
  document.getElementById('bundleAktif').checked = true;
  _updateToggleLabel('bundleAktif');
  document.getElementById('bundleSlugPreview').textContent = '—';
  document.getElementById('bundleItemsList').innerHTML =
    '<div style="text-align:center;color:var(--teks-muted);padding:16px;font-size:.82rem">Simpan info bundle dulu untuk mulai menambah item.</div>';
  document.getElementById('bundleInlineItemForm').style.display = 'none';
  document.getElementById('modalBundleTitle').textContent = 'Buat Bundle';
  document.getElementById('btnSaveBundle').innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5" style="margin-right:5px;vertical-align:-2px"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"/></svg>Simpan Info';
  document.getElementById('bundleItemCount').textContent = '';
  _setBundleItemsLocked(true);
  openModal('modalBundle');
}

document.getElementById('bundleJudul').addEventListener('input', function() {
  if (!document.getElementById('bundleSlug').value) {
    const slug = this.value.toLowerCase().replace(/[^a-z0-9\s-]/g,'').trim().replace(/\s+/g,'-').substring(0,60);
    document.getElementById('bundleSlugPreview').textContent = slug || '—';
  }
});
document.getElementById('bundleAktif').addEventListener('change', function() {
  _updateToggleLabel('bundleAktif');
});

document.getElementById('bundleSlug').addEventListener('input', function() {
  document.getElementById('bundleSlugPreview').textContent = this.value || '—';
});

async function editBundle(id) {
  const b = _bundles.find(x => x.id === id); if (!b) return;
  _currentBundleId = id;
  document.getElementById('bundleId').value = b.id;
  document.getElementById('bundleJudul').value = b.judul;
  document.getElementById('bundleSlug').value = b.slug;
  document.getElementById('bundleDeskripsi').value = b.deskripsi || '';
  document.getElementById('bundleAktif').checked = b.aktif === true || b.aktif === 'true';
  _updateToggleLabel('bundleAktif');
  document.getElementById('bundleSlugPreview').textContent = b.slug;
  document.getElementById('modalBundleTitle').textContent = 'Edit Bundle';
  document.getElementById('btnSaveBundle').innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5" style="margin-right:5px;vertical-align:-2px"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"/></svg>Simpan Info';
  document.getElementById('bundleInlineItemForm').style.display = 'none';
  _setBundleItemsLocked(false);
  try {
    const r = await fetch(`/api/bundles/${id}`, { headers: authHeaders() });
    const d = await r.json();
    _currentBundleItems = d.items || [];
    renderBundleItems();
  } catch {}
  openModal('modalBundle');
}

function renderBundleItems() {
  const c = document.getElementById('bundleItemsList');
  document.getElementById('bundleItemCount').textContent =
    _currentBundleItems.length ? `(${_currentBundleItems.length})` : '';
  c.innerHTML = _currentBundleItems.length ? _currentBundleItems.map(item => `
    <div style="display:flex;align-items:center;gap:10px;padding:8px 10px;border-radius:9px;border:1.5px solid var(--abu-2);margin-bottom:7px;background:#fff">
      <span style="font-size:18px;flex-shrink:0;display:flex;align-items:center">${item.ikon ? esc(item.ikon) : `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"/></svg>`}</span>
      <div style="flex:1;min-width:0">
        <div style="font-size:.82rem;font-weight:700">${esc(item.judul)}</div>
        <div style="font-size:.72rem;color:var(--teks-muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(item.url)}</div>
        ${item.deskripsi ? `<div style="font-size:.72rem;color:var(--teks-muted)">${esc(item.deskripsi)}</div>` : ''}
      </div>
      <button class="btn btn-ghost btn-sm" title="Edit" onclick="editBundleItem(${item.id})"><svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg></button>
      <button class="btn btn-danger btn-sm" onclick="deleteBundleItem(${item.id})"><svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/></svg></button>
    </div>`).join('')
    : '<div style="text-align:center;color:var(--teks-muted);padding:16px;font-size:.82rem">Belum ada item</div>';
}

async function saveBundle() {
  const id = document.getElementById('bundleId').value;
  const judul = document.getElementById('bundleJudul').value.trim();
  const slug = document.getElementById('bundleSlug').value.trim();
  const aktif = document.getElementById('bundleAktif').checked;
  const deskripsi = document.getElementById('bundleDeskripsi').value.trim() || null;
  if (!judul) { toast('Judul wajib diisi', 'error'); return; }
  try {
    const r = await fetch(id ? `/api/bundles/${id}` : '/api/bundles', {
      method: id ? 'PUT' : 'POST', headers: authHeaders(),
      body: JSON.stringify({ judul, deskripsi, slug: slug || undefined, aktif }),
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