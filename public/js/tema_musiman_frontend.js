
let _temaList = [];

async function loadTemaMusiman() {
  const tb = document.getElementById('temaMusimanTableBody');
  if (tb) tb.innerHTML = `<tr class="empty-row"><td colspan="5"><span class="btn-spin" style="width:11px;height:11px;vertical-align:-1px;margin-right:6px"></span>Memuat data...</td></tr>`;
  try {
    const r = await fetch('/api/settings', { headers: authHeaders() });
    const d = await r.json();
    if (!r.ok) throw new Error(d.error || 'Gagal memuat');
    _temaList = parseTemaValue(d.settings ? d.settings.tema_musiman : null);
    renderTemaMusimanTable();
  } catch (err) {
    if (tb) tb.innerHTML = `<tr class="empty-row"><td colspan="5">Gagal memuat data tema</td></tr>`;
    toast('Gagal memuat tema musiman: ' + err.message, 'error');
  }
}

function parseTemaValue(raw) {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw;
  try { const p = JSON.parse(raw); return Array.isArray(p) ? p : []; } catch { return []; }
}

function _todayWita() {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Makassar' });
}

// Status ditampilkan berdasarkan kombinasi toggle manual (t.aktif) DAN rentang
// tanggal, biar sama persis dengan logika pemilihan tema di landing.js
// (tema-aktif). Toggle mati -> selalu Nonaktif. Toggle nyala tapi belum/sudah
// lewat periode -> Terjadwal/Nonaktif. Toggle nyala + dalam periode -> Aktif.
function temaStatus(t) {
  if (t.aktif === false) return { label: 'Nonaktif', cls: 'badge-abu' };
  const today = _todayWita();
  if (t.tanggal_mulai && today < t.tanggal_mulai) return { label: 'Terjadwal', cls: 'badge-yellow' };
  if (t.tanggal_selesai && today > t.tanggal_selesai) return { label: 'Nonaktif', cls: 'badge-abu' };
  return { label: 'Aktif', cls: 'badge-hijau' };
}

function fmtTgl(s) {
  if (!s) return '-';
  const [y, m, d] = s.split('-');
  const bulan = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
  return `${d} ${bulan[parseInt(m, 10) - 1]} ${y}`;
}

function renderTemaMusimanTable() {
  const tb = document.getElementById('temaMusimanTableBody');
  if (!tb) return;
  if (!_temaList.length) {
    tb.innerHTML = `<tr class="empty-row"><td colspan="4">Belum ada tema musiman. Klik "Tambah Tema" untuk membuat.</td></tr>`;
    return;
  }
  const sorted = [..._temaList].sort((a, b) => (a.tanggal_mulai || '').localeCompare(b.tanggal_mulai || ''));
  tb.innerHTML = sorted.map(t => {
    const st = temaStatus(t);
    return `
      <tr>
        <td style="display:flex;align-items:center;gap:10px">
          ${t.gambar_url ? `<img src="${t.gambar_url}" style="width:56px;height:32px;object-fit:cover;border-radius:6px;flex-shrink:0" />` : `<div style="width:56px;height:32px;border-radius:6px;background:var(--teal-50);flex-shrink:0"></div>`}
          <span>${escapeHtml(t.nama || '(tanpa nama)')}</span>
        </td>
        <td>${fmtTgl(t.tanggal_mulai)} &ndash; ${fmtTgl(t.tanggal_selesai)}</td>
        <td><span class="badge ${st.cls}">${st.label}</span></td>
        <td>
          <button class="btn-edit" data-tip="Edit" onclick="editTemaMusiman('${t.id}')"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg></button>
          <button class="btn btn-ghost btn-sm" onclick="toggleTemaMusiman('${t.id}', ${!!t.aktif})" data-tip="${t.aktif ? 'Nonaktifkan' : 'Aktifkan'}">
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${t.aktif ? '<path d="M18.36 6.64A9 9 0 0 1 20.77 15"/><path d="M6.16 6.16a9 9 0 1 0 12.68 12.68"/><path d="M12 2v4"/><path d="M2 12h4"/>' : '<path d="M9 12l2 2 4-4"/><circle cx="12" cy="12" r="10"/>'}</svg>
          </button>
          <button class="btn-hapus" data-tip="Hapus" onclick="deleteTemaMusiman('${t.id}')"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6M9 7V4a1 1 0 011-1h4a1 1 0 011 1v3M4 7h16"/></svg></button>
        </td>
      </tr>`;
  }).join('');
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function openTemaMusimanModal() {
  document.getElementById('temaId').value = '';
  document.getElementById('temaNama').value = '';
  dpSetValue('temaTanggalMulai', null);
  dpSetValue('temaTanggalSelesai', null);
  document.getElementById('temaGambarUrl').value = '';
  document.getElementById('temaAktif').value = '1';
  document.getElementById('temaPosisi').value = 'pill-atas';
  document.getElementById('temaAnimasi').value = 'none';
  document.getElementById('temaPartikel').value = 'none';
  document.getElementById('temaPartikelDensitas').value = 'sedang';
  _setTemaPreview('');
  document.getElementById('modalTemaMusimanTitle').textContent = 'Tambah Tema';
  openModal('modalTemaMusiman');
  if (typeof initCustomSelects === 'function') initCustomSelects();
  if (typeof syncCustomSelect === 'function') { syncCustomSelect('temaPosisi'); syncCustomSelect('temaAnimasi'); syncCustomSelect('temaPartikel'); syncCustomSelect('temaPartikelDensitas'); }
  _updateTemaPreview();
}

function _setTemaPreview(url) {
  const wrap = document.getElementById('temaGambarPreviewWrap');
  const prev = document.getElementById('temaGambarPreview');
  if (!wrap || !prev) return;
  if (url) { prev.src = url; wrap.style.display = 'block'; }
  else { prev.src = ''; wrap.style.display = 'none'; }
}

function _updateTemaPreview() {
  const panel = document.getElementById('temaPreviewPanel');
  if (!panel || typeof SapaTemaPreview === 'undefined') return;
  const posisi = document.getElementById('temaPosisi')?.value || 'pill-atas';

  // "panel-login-saja" = background penuh panel kiri halaman login, yang
  // bentuknya portrait (tinggi), beda sama pill/banner/ribbon yang landscape.
  // Preview ikut nyesuain orientasi biar keliatan bener gambar bakal
  // dipotong/di-cover kayak apa.
  if (posisi === 'panel-login-saja') {
    panel.style.height = '220px';
    panel.style.width = '150px';
    panel.style.margin = '0 auto';
  } else {
    panel.style.height = '110px';
    panel.style.width = '100%';
    panel.style.margin = '0';
  }

  const theme = {
    nama: document.getElementById('temaNama')?.value.trim() || '',
    gambar_url: document.getElementById('temaGambarUrl')?.value.trim() || '',
    posisi,
    efek: document.getElementById('temaAnimasi')?.value || 'none',
    partikel: document.getElementById('temaPartikel')?.value || 'none',
    partikel_densitas: document.getElementById('temaPartikelDensitas')?.value || 'sedang',
  };
  if (!theme.gambar_url) { SapaTemaPreview.clear(panel); return; }
  SapaTemaPreview.render(panel, theme);
}

function removeTemaGambar() {
  document.getElementById('temaGambarUrl').value = '';
  _setTemaPreview('');
  _updateTemaPreview();
}

function editTemaMusiman(id) {
  const t = _temaList.find(x => String(x.id) === String(id));
  if (!t) return;
  document.getElementById('temaId').value = t.id;
  document.getElementById('temaNama').value = t.nama || '';
  dpSetValue('temaTanggalMulai', t.tanggal_mulai || null);
  dpSetValue('temaTanggalSelesai', t.tanggal_selesai || null);
  document.getElementById('temaGambarUrl').value = t.gambar_url || '';
  document.getElementById('temaAktif').value = t.aktif !== false ? '1' : '0';
  document.getElementById('temaPosisi').value = t.posisi || 'pill-atas';
  document.getElementById('temaAnimasi').value = t.efek || 'none';
  document.getElementById('temaPartikel').value = t.partikel || 'none';
  document.getElementById('temaPartikelDensitas').value = t.partikel_densitas || 'sedang';
  _setTemaPreview(t.gambar_url || '');
  document.getElementById('modalTemaMusimanTitle').textContent = 'Edit Tema';
  openModal('modalTemaMusiman');
  if (typeof initCustomSelects === 'function') initCustomSelects();
  if (typeof syncCustomSelect === 'function') { syncCustomSelect('temaPosisi'); syncCustomSelect('temaAnimasi'); syncCustomSelect('temaPartikel'); syncCustomSelect('temaPartikelDensitas'); }
  _updateTemaPreview();
}

function onTemaGambarChange(input) {
  const file = input.files?.[0];
  input.value = '';
  if (file) _uploadTemaGambar(file);
}

function handleTemaGambarDragOver(e) { e.preventDefault(); document.getElementById('temaGambarUploadArea')?.classList.add('drag-over'); }
function handleTemaGambarDragLeave(e) { document.getElementById('temaGambarUploadArea')?.classList.remove('drag-over'); }
function handleTemaGambarDrop(e) {
  e.preventDefault();
  document.getElementById('temaGambarUploadArea')?.classList.remove('drag-over');
  const file = e.dataTransfer?.files?.[0];
  if (file) _uploadTemaGambar(file);
}

async function _uploadTemaGambar(file) {
  const MAX_MB = 2;
  if (!file.type.startsWith('image/')) {
    toast('File harus berupa gambar (JPG/PNG/WebP)', 'error');
    return;
  }
  if (file.size > MAX_MB * 1024 * 1024) {
    toast(`Gambar terlalu besar (maks. ${MAX_MB} MB)`, 'error');
    return;
  }

  const prog = document.getElementById('temaGambarProgress');
  const bar  = document.getElementById('temaGambarProgressBar');
  if (prog) prog.style.display = '';
  if (bar) bar.style.width = '30%';

  try {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('kategori', 'tema_musiman');
    const r = await fetch('/api/upload', {
      method: 'POST',
      headers: { 'Authorization': authHeaders()['Authorization'] },
      body: formData,
    });
    if (bar) bar.style.width = '90%';
    const d = await r.json();
    if (!r.ok) throw new Error(d.error || 'Gagal upload');
    if (bar) { bar.style.width = '100%'; setTimeout(() => { if (prog) prog.style.display = 'none'; }, 600); }
    document.getElementById('temaGambarUrl').value = d.url;
    _setTemaPreview(d.url);
    _updateTemaPreview();
    toast('Gambar berhasil diupload', 'success');
  } catch (err) {
    if (prog) prog.style.display = 'none';
    toast('Gagal upload gambar: ' + err.message, 'error');
  }
}

async function saveTemaMusiman() {
  const id = document.getElementById('temaId').value;
  const nama = document.getElementById('temaNama').value.trim();
  const mulai = dpGetValue('temaTanggalMulai') || '';
  const selesai = dpGetValue('temaTanggalSelesai') || '';
  const gambar_url = document.getElementById('temaGambarUrl').value.trim();
  const aktif = document.getElementById('temaAktif').value === '1';
  const posisi = document.getElementById('temaPosisi').value;
  const efek = document.getElementById('temaAnimasi').value;
  const partikel = document.getElementById('temaPartikel').value;
  const partikel_densitas = document.getElementById('temaPartikelDensitas').value;

  if (!nama) { toast('Nama tema wajib diisi', 'error'); return; }
  if (!mulai || !selesai) { toast('Tanggal mulai & selesai wajib diisi', 'error'); return; }
  if (mulai > selesai) { toast('Tanggal mulai tidak boleh setelah tanggal selesai', 'error'); return; }
  if (!gambar_url) { toast('Upload gambar tema terlebih dahulu', 'error'); return; }

  const payload = { nama, tanggal_mulai: mulai, tanggal_selesai: selesai, gambar_url, aktif, posisi, efek, partikel, partikel_densitas };

  if (id) {
    const idx = _temaList.findIndex(x => String(x.id) === String(id));
    if (idx > -1) _temaList[idx] = { ..._temaList[idx], ...payload };
  } else {
    payload.id = 'tm_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
    _temaList.push(payload);
  }

  try {
    const r = await fetch('/api/settings', {
      method: 'PUT',
      headers: authHeaders(),
      body: JSON.stringify({ tema_musiman: JSON.stringify(_temaList) }),
    });
    const d = await r.json();
    if (!r.ok) throw new Error(d.error || 'Gagal menyimpan');
    toast(id ? 'Tema diperbarui' : 'Tema ditambahkan');
    closeModal('modalTemaMusiman');
    renderTemaMusimanTable();
    if (typeof sapaTemaRefresh === 'function') sapaTemaRefresh();
  } catch (err) {
    toast('Gagal menyimpan tema: ' + err.message, 'error');
  }
}

async function toggleTemaMusiman(id, currentAktif) {
  const idx = _temaList.findIndex(x => String(x.id) === String(id));
  if (idx === -1) return;
  const next = [..._temaList];
  next[idx] = { ...next[idx], aktif: !currentAktif };

  try {
    const r = await fetch('/api/settings', {
      method: 'PUT',
      headers: authHeaders(),
      body: JSON.stringify({ tema_musiman: JSON.stringify(next) }),
    });
    const d = await r.json();
    if (!r.ok) throw new Error(d.error || 'Gagal mengubah status');
    _temaList = next;
    toast(!currentAktif ? 'Tema diaktifkan' : 'Tema dinonaktifkan');
    renderTemaMusimanTable();
    if (typeof sapaTemaRefresh === 'function') sapaTemaRefresh();
  } catch (err) {
    toast('Gagal mengubah status tema: ' + err.message, 'error');
  }
}

async function deleteTemaMusiman(id) {
  const ok = await showConfirm({
    title: 'Hapus Tema Musiman',
    msg: 'Tema ini akan dihapus dan tidak akan ditampilkan lagi.',
    okText: 'Ya, Hapus',
    icon: 'trash',
  });
  if (!ok) return;

  const next = _temaList.filter(x => String(x.id) !== String(id));
  try {
    const r = await fetch('/api/settings', {
      method: 'PUT',
      headers: authHeaders(),
      body: JSON.stringify({ tema_musiman: JSON.stringify(next) }),
    });
    const d = await r.json();
    if (!r.ok) throw new Error(d.error || 'Gagal menghapus');
    _temaList = next;
    toast('Tema berhasil dihapus');
    renderTemaMusimanTable();
    if (typeof sapaTemaRefresh === 'function') sapaTemaRefresh();
  } catch (err) {
    toast('Gagal menghapus tema: ' + err.message, 'error');
  }
}
