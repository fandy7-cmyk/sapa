
// Buku Panduan: halaman baca per modul (ditampilkan langsung di dalam SAPA) dan halaman kelola untuk admin.
// Daftar modul diambil dari MENUS (app.js), jadi modul baru otomatis muncul di pilihan admin.

(function _pgInjectCss() {
  if (document.getElementById('panduanCss')) return;
  const s = document.createElement('style');
  s.id = 'panduanCss';
  s.textContent = `
  .pg-wrap{display:flex;gap:var(--sp-4);align-items:flex-start}
  .pg-list{width:260px;flex-shrink:0;display:flex;flex-direction:column;gap:8px}
  .pg-item{display:block;width:100%;text-align:left;padding:10px 12px;border:1px solid var(--abu-2);border-radius:var(--r-md);background:var(--putih);color:var(--teks);cursor:pointer;font:inherit;transition:background .15s,border-color .15s}
  .pg-item:hover{background:var(--abu-1)}
  .pg-item.active{border-color:var(--hijau);background:var(--hijau-pale)}
  .pg-item-t{font-weight:600;font-size:.88rem}
  .pg-item-k{font-size:.76rem;color:var(--teks-muted);margin-top:2px}
  .pg-view{flex:1;min-width:0;padding:0;overflow:hidden}
  .pg-bar{display:flex;align-items:center;gap:10px;padding:10px 14px;border-bottom:1px solid var(--abu-2)}
  .pg-bar-title{flex:1;min-width:0}
  .pg-bar-title b{display:block;font-size:.92rem;color:var(--teks);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
  .pg-bar-title small{display:block;color:var(--teks-muted);font-size:.76rem;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
  .pg-bar-act{display:flex;gap:6px;flex-shrink:0}
  .pg-frame-wrap{position:relative;height:calc(100vh - 250px);min-height:440px;background:var(--abu-1)}
  .pg-frame-wrap:fullscreen{height:100vh}
  .pg-frame-wrap iframe{position:absolute;inset:0;width:100%;height:100%;border:0;background:#fff}
  .pg-loading{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;gap:8px;color:var(--teks-muted);font-size:.85rem;pointer-events:none}
  .pg-noembed{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:12px;height:100%;padding:24px;text-align:center;color:var(--teks-muted);font-size:.88rem}
  .pg-empty{padding:40px 20px;text-align:center;color:var(--teks-muted)}
  .pg-hint{padding:8px 14px;font-size:.74rem;color:var(--teks-muted);border-top:1px solid var(--abu-2)}
  @media (max-width:900px){
    .pg-wrap{flex-direction:column}
    .pg-list{width:100%;flex-direction:row;overflow-x:auto}
    .pg-item{min-width:200px}
    .pg-frame-wrap{height:70vh}
  }`;
  document.head.appendChild(s);
})();

const _PG_HOST_OK = ['drive.google.com', 'docs.google.com', 'res.cloudinary.com'];

function _pgModulList() {
  return (typeof MENUS !== 'undefined' ? MENUS : [])
    .filter(g => !g.adminOnly)
    .map(g => ({ id: g.id, label: g.label }));
}

// Warna badge per modul (kelas badge yang sudah ada). Modul baru tanpa warna otomatis abu.
const _PG_MODUL_WARNA = {
  superlink: 'badge-biru',
  surat:     'badge-ungu',
  absensi:   'badge-hijau',
  perjadin:  'badge-yellow',
  lembur:    'badge-fuchsia',
  kinerja:   'badge-green',
  walidata:  'badge-merah',
  eplanning: 'badge-slate',
};

function _pgModulLabel(id) {
  const g = _pgModulList().find(x => x.id === id);
  return g ? g.label : id;
}

// Mengubah link Drive/Docs/Cloudinary menjadi URL yang bisa ditanam di iframe.
// Mengembalikan { embed: string|null }.
function _pgEmbedInfo(raw) {
  let u;
  try { u = new URL(raw); } catch { return { embed: null }; }
  if (u.protocol !== 'https:' || !_PG_HOST_OK.includes(u.hostname)) return { embed: null };
  const p = u.pathname;
  let m;

  if (u.hostname === 'drive.google.com') {
    m = p.match(/^\/file\/(?:u\/\d+\/)?d\/([^/]+)/);
    if (m) return { embed: `https://drive.google.com/file/d/${m[1]}/preview` };
    const idq = u.searchParams.get('id');
    if ((p === '/open' || p === '/uc') && idq) return { embed: `https://drive.google.com/file/d/${encodeURIComponent(idq)}/preview` };
    m = p.match(/^\/drive\/(?:u\/\d+\/)?folders\/([^/?]+)/);
    if (m) return { embed: `https://drive.google.com/embeddedfolderview?id=${m[1]}#list` };
    return { embed: null };
  }

  if (u.hostname === 'docs.google.com') {
    m = p.match(/^\/(document|spreadsheets|presentation)\/(?:u\/\d+\/)?d\/e\/([^/]+)/);
    if (m) return { embed: u.toString() + (u.search ? '&' : '?') + 'embedded=true' };
    m = p.match(/^\/(document|spreadsheets|presentation)\/(?:u\/\d+\/)?d\/([^/]+)/);
    if (m) {
      const tipe = m[1];
      return { embed: `https://docs.google.com/${tipe}/d/${m[2]}/${tipe === 'presentation' ? 'embed' : 'preview'}` };
    }
    return { embed: null };
  }

  // res.cloudinary.com
  const ext = (p.split('.').pop() || '').toLowerCase();
  if (['doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx'].includes(ext)) {
    return { embed: `https://docs.google.com/gview?embedded=1&url=${encodeURIComponent(u.toString())}` };
  }
  return { embed: u.toString() };
}

/* ───────────────────────── Halaman baca (per modul) ───────────────────────── */

const _pgState = { modul: null, list: [], pilih: {}, req: 0 };

async function loadBukuPanduan(modul) {
  const root = document.getElementById('panduanRoot');
  if (!root) return;
  const my = ++_pgState.req;
  _pgState.modul = modul;
  root.innerHTML = `<div class="pg-empty"><span class="btn-spin" style="width:11px;height:11px;vertical-align:-1px;margin-right:6px"></span>Memuat buku panduan...</div>`;
  try {
    const r = await fetch(`/api/buku-panduan?modul=${encodeURIComponent(modul)}`, { headers: authHeaders() });
    const d = await r.json().catch(() => ({}));
    if (my !== _pgState.req) return;
    if (!r.ok) {
      root.innerHTML = `<div class="pg-empty">${esc(d.error || 'Gagal memuat buku panduan')}</div>`;
      return;
    }
    _pgState.list = d.panduan || [];
    _pgRender();
  } catch (err) {
    if (my !== _pgState.req) return;
    root.innerHTML = `<div class="pg-empty">Gagal memuat buku panduan</div>`;
  }
}

function _pgPilih(id) {
  _pgState.pilih[_pgState.modul] = id;
  _pgRender();
}

function _pgRender() {
  const root = document.getElementById('panduanRoot');
  if (!root) return;
  const { modul, list } = _pgState;
  if (!list.length) {
    root.innerHTML = `<div class="pg-empty">Belum ada buku panduan untuk modul ini.</div>`;
    return;
  }
  const aktif = list.find(x => x.id === _pgState.pilih[modul]) || list[0];
  _pgState.pilih[modul] = aktif.id;
  const info = _pgEmbedInfo(aktif.file_url);

  const daftar = list.length > 1
    ? `<div class="pg-list">${list.map(x => `
        <button type="button" class="pg-item${x.id === aktif.id ? ' active' : ''}" onclick="_pgPilih(${x.id})">
          <div class="pg-item-t">${esc(x.judul)}</div>
          ${x.keterangan ? `<div class="pg-item-k">${esc(x.keterangan)}</div>` : ''}
        </button>`).join('')}</div>`
    : '';

  const ikonBuka = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 3h6v6"/><path d="M10 14 21 3"/><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/></svg>`;
  const ikonFull = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 3H5a2 2 0 0 0-2 2v3"/><path d="M21 8V5a2 2 0 0 0-2-2h-3"/><path d="M3 16v3a2 2 0 0 0 2 2h3"/><path d="M16 21h3a2 2 0 0 0 2-2v-3"/></svg>`;

  const frame = info.embed
    ? `<div class="pg-loading"><span class="btn-spin" style="width:11px;height:11px"></span>Memuat panduan...</div>
       <iframe src="${esc(info.embed)}" title="${esc(aktif.judul)}" loading="lazy" referrerpolicy="no-referrer"
         sandbox="allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox allow-forms allow-downloads"
         onload="var l=this.parentNode.querySelector('.pg-loading');if(l)l.remove()"></iframe>`
    : `<div class="pg-noembed">
         <div>Buku panduan ini tidak bisa ditampilkan langsung di SAPA.</div>
         <a class="btn btn-primary btn-sm" href="${esc(aktif.file_url)}" target="_blank" rel="noopener noreferrer">Buka di tab baru</a>
       </div>`;

  root.innerHTML = `
    <div class="pg-wrap">
      ${daftar}
      <div class="card pg-view">
        <div class="pg-bar">
          <div class="pg-bar-title"><b>${esc(aktif.judul)}</b>${aktif.keterangan ? `<small>${esc(aktif.keterangan)}</small>` : ''}</div>
          <div class="pg-bar-act">
            ${info.embed ? `<button type="button" class="btn btn-ghost btn-sm" onclick="_pgLayarPenuh()" data-tip="Layar penuh">${ikonFull}</button>` : ''}
            <a class="btn btn-ghost btn-sm" href="${esc(aktif.file_url)}" target="_blank" rel="noopener noreferrer" data-tip="Buka di tab baru">${ikonBuka}</a>
          </div>
        </div>
        <div class="pg-frame-wrap" id="pgFrameWrap">${frame}</div>
        <div class="pg-hint">Jika panduan tidak tampil, klik tombol buka di tab baru.</div>
      </div>
    </div>`;
}

function _pgLayarPenuh() {
  const el = document.getElementById('pgFrameWrap');
  if (!el) return;
  if (document.fullscreenElement) { document.exitFullscreen(); return; }
  if (el.requestFullscreen) el.requestFullscreen().catch(() => toast('Layar penuh tidak didukung browser ini', 'error'));
}

/* ───────────────────────── Halaman kelola (admin) ───────────────────────── */

let _pgAdminAll = [];

async function loadBukuPanduanAdmin() {
  const tb = document.getElementById('panduanAdminBody');
  if (tb) tb.innerHTML = `<tr class="empty-row"><td colspan="5"><span class="btn-spin" style="width:11px;height:11px;vertical-align:-1px;margin-right:6px"></span>Memuat data...</td></tr>`;
  try {
    const r = await fetch('/api/buku-panduan/admin', { headers: authHeaders() });
    const d = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(d.error || 'Gagal memuat');
    _pgAdminAll = d.panduan || [];
    _pgBangunFilterModul();
    renderBukuPanduanAdmin();
  } catch (err) {
    if (tb) tb.innerHTML = `<tr class="empty-row"><td colspan="5">${esc(err.message || 'Gagal memuat data')}</td></tr>`;
  }
}

function _pgBangunFilterModul() {
  const sel = document.getElementById('panduanAdminFilterModul');
  if (!sel) return;
  const cur = sel.value;
  const ids = new Set(_pgModulList().map(m => m.id));
  _pgAdminAll.forEach(x => ids.add(x.modul));
  sel.innerHTML = `<option value="">Semua Modul</option>` +
    [...ids].map(id => `<option value="${esc(id)}">${esc(_pgModulLabel(id))}</option>`).join('');
  sel.value = [...ids].includes(cur) ? cur : '';
}

function filterBukuPanduanAdmin() { renderBukuPanduanAdmin(); }

function renderBukuPanduanAdmin() {
  const tb = document.getElementById('panduanAdminBody');
  if (!tb) return;
  const q   = (document.getElementById('panduanAdminSearch')?.value || '').toLowerCase();
  const mod = document.getElementById('panduanAdminFilterModul')?.value || '';
  const data = _pgAdminAll.filter(x =>
    (!mod || x.modul === mod) &&
    (!q || (x.judul || '').toLowerCase().includes(q) || (x.keterangan || '').toLowerCase().includes(q))
  );
  if (!data.length) {
    tb.innerHTML = `<tr class="empty-row"><td colspan="5">Belum ada buku panduan</td></tr>`;
    return;
  }
  const svg = (inner) => `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${inner}</svg>`;
  tb.innerHTML = data.map(x => {
    let host = '';
    try { host = new URL(x.file_url).hostname; } catch {}
    return `
    <tr>
      <td><span class="badge ${_PG_MODUL_WARNA[x.modul] || 'badge-abu'}" style="white-space:nowrap">${esc(_pgModulLabel(x.modul))}</span></td>
      <td style="max-width:280px">
        <div style="font-weight:600;color:var(--teks)">${esc(x.judul)}</div>
        ${x.keterangan ? `<div style="font-size:.76rem;color:var(--teks-muted);margin-top:1px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:260px">${esc(x.keterangan)}</div>` : ''}
      </td>
      <td style="font-size:.8rem;color:var(--teks-muted)">${esc(host)}</td>
      <td><span class="badge ${x.aktif ? 'badge-hijau' : 'badge-abu'}">${x.aktif ? 'Aktif' : 'Nonaktif'}</span></td>
      <td>
        <div style="display:flex;gap:6px">
          <a class="btn btn-ghost btn-sm" href="${esc(x.file_url)}" target="_blank" rel="noopener noreferrer" data-tip="Buka link">${svg('<path d="M15 3h6v6"/><path d="M10 14 21 3"/><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>')}</a>
          <button class="btn btn-ghost btn-sm" onclick="openBukuPanduanModal(${x.id})" data-tip="Edit">${svg('<path d="M11 5H6a2 2 0 0 0-2 2v11a2 2 0 0 0 2 2h11a2 2 0 0 0 2-2v-5"/><path d="M18.586 2.586a2 2 0 1 1 2.828 2.828L11.828 15 9 16l1-2.828z"/>')}</button>
          <button class="btn btn-ghost btn-sm" onclick="toggleBukuPanduan(${x.id})" data-tip="${x.aktif ? 'Nonaktifkan' : 'Aktifkan'}">${svg(x.aktif ? '<path d="M18.36 6.64A9 9 0 0 1 20.77 15"/><path d="M6.16 6.16a9 9 0 1 0 12.68 12.68"/><path d="M12 2v4"/><path d="m2 2 20 20"/>' : '<path d="M12 2v10"/><path d="M18.4 6.6a9 9 0 1 1-12.77.04"/>')}</button>
          <button class="btn-hapus" onclick="deleteBukuPanduan(${x.id})" data-tip="Hapus">${svg('<polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>')}</button>
        </div>
      </td>
    </tr>`;
  }).join('');
}

function openBukuPanduanModal(id = null) {
  const lama = id ? _pgAdminAll.find(x => x.id === id) : null;
  const sel = document.getElementById('bpModul');
  const opsi = _pgModulList();
  if (lama && !opsi.some(m => m.id === lama.modul)) opsi.push({ id: lama.modul, label: lama.modul });
  sel.innerHTML = `<option value="">- Pilih Modul -</option>` +
    opsi.map(m => `<option value="${esc(m.id)}">${esc(m.label)}</option>`).join('');

  document.getElementById('bpId').value         = lama ? lama.id : '';
  sel.value                                     = lama ? lama.modul : (document.getElementById('panduanAdminFilterModul')?.value || '');
  document.getElementById('bpJudul').value      = lama ? (lama.judul || '') : '';
  document.getElementById('bpKeterangan').value = lama ? (lama.keterangan || '') : '';
  document.getElementById('bpUrl').value        = lama ? (lama.file_url || '') : '';
  document.getElementById('bpAktif').value      = lama ? (lama.aktif ? '1' : '0') : '1';
  document.getElementById('modalBukuPanduanTitle').textContent = lama ? 'Edit Buku Panduan' : 'Tambah Buku Panduan';
  openModal('modalBukuPanduan');
}

async function _pgSegarkanSidebar() {
  if (typeof _muatPanduanModul === 'function') {
    await _muatPanduanModul({ force: true });
    if (typeof buildSidebar === 'function') buildSidebar();
  }
}

async function saveBukuPanduan() {
  const id         = document.getElementById('bpId').value;
  const modul      = document.getElementById('bpModul').value;
  const judul      = document.getElementById('bpJudul').value.trim();
  const keterangan = document.getElementById('bpKeterangan').value.trim();
  const fileUrl    = document.getElementById('bpUrl').value.trim();
  const aktif      = document.getElementById('bpAktif').value === '1';

  if (!modul)   { toast('Modul wajib dipilih', 'error'); return; }
  if (!judul)   { toast('Judul wajib diisi', 'error'); return; }
  if (!fileUrl) { toast('Link buku panduan wajib diisi', 'error'); return; }
  let host = '';
  try { const u = new URL(fileUrl); host = u.protocol === 'https:' ? u.hostname : ''; } catch {}
  if (!_PG_HOST_OK.includes(host)) {
    toast('Link harus https dari Google Drive/Docs atau Cloudinary', 'error');
    return;
  }

  const btn = document.getElementById('btnSaveBukuPanduan');
  const orig = btn.innerHTML;
  btn.disabled = true;
  btn.innerHTML = `<span class="btn-spin" style="width:11px;height:11px"></span> Menyimpan...`;
  try {
    const r = await fetch(id ? `/api/buku-panduan/${id}` : '/api/buku-panduan', {
      method: id ? 'PUT' : 'POST',
      headers: { ...authHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ modul, judul, keterangan, file_url: fileUrl, aktif }),
    });
    const d = await r.json().catch(() => ({}));
    if (!r.ok) { toast(d.error || 'Gagal menyimpan', 'error'); return; }
    toast(id ? 'Buku panduan diperbarui' : 'Buku panduan ditambahkan', 'success');
    closeModal('modalBukuPanduan');
    await loadBukuPanduanAdmin();
    _pgSegarkanSidebar();
  } catch (err) {
    toast('Gagal: ' + err.message, 'error');
  } finally {
    btn.disabled = false;
    btn.innerHTML = orig;
  }
}

async function toggleBukuPanduan(id) {
  const x = _pgAdminAll.find(v => v.id === id);
  if (!x) return;
  try {
    const r = await fetch(`/api/buku-panduan/${id}`, {
      method: 'PUT',
      headers: { ...authHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ aktif: !x.aktif }),
    });
    if (!r.ok) throw new Error();
    toast(!x.aktif ? 'Buku panduan diaktifkan' : 'Buku panduan dinonaktifkan', 'success');
    await loadBukuPanduanAdmin();
    _pgSegarkanSidebar();
  } catch {
    toast('Gagal mengubah status', 'error');
  }
}

async function deleteBukuPanduan(id) {
  const ok = await showConfirm({ title: 'Hapus Buku Panduan', msg: 'Buku panduan ini akan dihapus dari SAPA (file di Drive tidak ikut terhapus). Lanjutkan?', okText: 'Hapus', type: 'danger', icon: 'trash' });
  if (!ok) return;
  try {
    const r = await fetch(`/api/buku-panduan/${id}`, { method: 'DELETE', headers: authHeaders() });
    if (!r.ok) throw new Error();
    toast('Buku panduan dihapus', 'success');
    await loadBukuPanduanAdmin();
    _pgSegarkanSidebar();
  } catch {
    toast('Gagal menghapus', 'error');
  }
}
