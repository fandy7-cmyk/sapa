

let _users  = [];
let _bidang = [];  

let _userPage     = 1;
const _userPageSize = 10;
let _userSearch   = '';
let _userFilterBidang = '';

async function loadBidangList() {
  try {
    const r = await fetch('/api/bidang', { headers: authHeaders() });
    const d = await r.json();
    _bidang = d.bidang || [];
  } catch { _bidang = []; }
}

function getBidangNama(bidang_id) {
  if (!bidang_id) return '-';
  const b = _bidang.find(x => x.id === bidang_id);
  return b ? esc(b.nama) : '-';
}

function renderBidangOptions(selectedId) {
  const opts = _bidang
    .filter(b => b.aktif)
    .map(b => `<option value="${b.id}" ${b.id === selectedId ? 'selected' : ''}>${esc(b.nama)}</option>`)
    .join('');
  return `<option value="">- Pilih Penanggung Jawab -</option>` + opts;
}

function initBidangSearchable() {
  const sel = document.getElementById('userBidang');
  if (!sel) return;
  const wrap = sel.closest('.select-wrap');
  if (!wrap) return;

  
  wrap.querySelectorAll('.bsel-trigger, .bsel-panel, .csel-trigger, .csel-panel').forEach(el => el.remove());
  wrap.classList.remove('csel-ready');

  const selectedOpt = sel.options[sel.selectedIndex];
  const selectedText = (selectedOpt && selectedOpt.value !== '') ? selectedOpt.text : null;

  const trigger = document.createElement('button');
  trigger.type = 'button';
  trigger.className = 'bsel-trigger csel-trigger';
  trigger.innerHTML = `<span class="bsel-trigger-text csel-trigger-text${selectedText ? '' : ' placeholder'}">${selectedText || '- Pilih Penanggung Jawab -'}</span>
    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5" class="csel-chev"><path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7"/></svg>`;
  wrap.appendChild(trigger);

  
  const panel = document.createElement('div');
  panel.className = 'bsel-panel csel-panel';
  panel.style.cssText = 'display:none;padding:0';

  
  const searchWrap = document.createElement('div');
  searchWrap.style.cssText = 'padding:8px 10px;border-bottom:1px solid var(--border,#e2e8f0);position:sticky;top:0;background:#fff;z-index:1';
  const searchInp = document.createElement('input');
  searchInp.type = 'text';
  searchInp.placeholder = 'Cari bidang...';
  searchInp.className = 'bsel-search';
  searchInp.style.cssText = 'width:100%;border:1px solid var(--border,#e2e8f0);border-radius:6px;padding:5px 10px;font-size:var(--fs-sm,.764rem);outline:none;color:var(--text-primary,#1e293b);background:var(--bg-input,#f8fafc)';
  searchWrap.appendChild(searchInp);
  panel.appendChild(searchWrap);

  
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
          textEl.textContent = opt ? opt.text : '-';
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
      listEl.innerHTML = '<div style="padding:10px 14px;font-size:var(--fs-sm,.764rem);color:var(--text-secondary,#64748b)">Tidak ditemukan</div>';
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

  
  window.addEventListener('scroll', (e) => {
    if (!panel.contains(e.target)) closePanel();
  }, true);
  window.addEventListener('resize', closePanel, true);

  
  const outsideHandler = (e) => {
    if (!panel.contains(e.target) && !trigger.contains(e.target)) closePanel();
  };
  document.addEventListener('click', outsideHandler, { once: false });
  
  wrap._bselOutside = outsideHandler;

  wrap.classList.add('csel-ready');
  renderList('');
}

function filterUsers() {
  _userSearch       = document.getElementById('userSearch')?.value?.toLowerCase() || '';
  _userFilterBidang = document.getElementById('userFilterBidang')?.value || '';
  _userPage         = 1;
  renderUsersTable();
}

function renderUsersTable() {
  const tb = document.getElementById('userTableBody');
  if (!tb) return;

  const visibleUsers = _users
    .filter(u => !u.is_admin)
    .filter(u => {
      if (_userFilterBidang) {
        if (String(u.bidang_id) !== _userFilterBidang) return false;
      }
      if (!_userSearch) return true;
      return (
        u.nama.toLowerCase().includes(_userSearch) ||
        (u.nip || '').toLowerCase().includes(_userSearch) ||
        u.email.toLowerCase().includes(_userSearch) ||
        getBidangNama(u.bidang_id).toLowerCase().includes(_userSearch)
      );
    });

  const start = (_userPage - 1) * _userPageSize;
  const slice = visibleUsers.slice(start, start + _userPageSize);

  tb.innerHTML = slice.length
    ? slice.map(u => `
      <tr>
        <td><strong>${esc(u.nama)}</strong></td>
        <td>${esc(u.nip || '-')}</td>
        <td>${esc(u.email)}</td>
        <td style="max-width:220px;white-space:normal;word-break:break-word;line-height:1.35">${getBidangNama(u.bidang_id)}</td>
        <td><span class="badge badge-blue">User</span></td>
        <td>${u.last_login ? fmtDate(u.last_login) : '-'}</td>
        <td style="white-space:nowrap">
          <button class="btn btn-ghost btn-sm" data-tip="Edit" onclick="editUser(${u.id})">
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>
          </button>
          ${(u.permissions || []).some(p => p.startsWith('eplanning.')) ? `<button class="btn btn-ghost btn-sm" data-tip="${u.tanda_tangan ? 'Lihat Tanda Tangan' : 'Tanda tangan belum diupload'}" style="${u.tanda_tangan ? '' : 'color:var(--teks-muted);opacity:.45'}" onclick="previewTandaTanganUser(${u.id})">
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14.086 18.412A2 2 0 0112.67 19H5v-7.672a2 2 0 01.586-1.414L11.75 3.75a6 6 0 118.49 8.49z"/><path d="M16 8 2 22"/><path d="M17.488 15H9"/></svg>
          </button>` : ''}
          <button class="btn btn-ghost btn-sm" data-tip="Hak Akses" onclick="openPermsModal(${u.id})">
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z"/></svg>
          </button>
          <button class="btn btn-ghost btn-sm" data-tip="Assign Indikator" onclick="openAssignIndikatorModal(${u.id})">
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"/></svg>
          </button>
          <button class="btn btn-ghost btn-sm" data-tip="Reset Password" onclick="resetUserPassword(${u.id}, '${esc(u.nama)}')">
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M15 7a2 2 0 012 2m0 0a2 2 0 01-2 2m2-2h3M9 7H6a2 2 0 00-2 2v9a2 2 0 002 2h9a2 2 0 002-2v-3"/></svg>
          </button>
          <button class="btn btn-ghost btn-sm" data-tip="Paksa Logout" onclick="forceLogoutUser(${u.id}, '${esc(u.nama)}')">
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/></svg>
          </button>
          <button class="btn-hapus" data-tip="Hapus" onclick="deleteUser(${u.id})">
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path stroke-linecap="round" stroke-linejoin="round" d="M19 6l-1 14H6L5 6"/><path stroke-linecap="round" stroke-linejoin="round" d="M10 11v6m4-6v6"/><path stroke-linecap="round" stroke-linejoin="round" d="M9 6V4h6v2"/></svg>
          </button>
        </td>
      </tr>`).join('')
    : '<tr class="empty-row"><td colspan="7">Tidak ada user</td></tr>';

  renderPagination('userPagination', visibleUsers.length, _userPage, _userPageSize, 'goUserPage');
}

window.goUserPage = (p) => { _userPage = p; renderUsersTable(); };

function previewTandaTanganUser(id) {
  const u = _users.find(x => x.id === id); if (!u) return;
  let modal = document.getElementById('modalTtdPreview');
  if (!modal) {
    modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.id = 'modalTtdPreview';
    modal.innerHTML = `
      <div class="modal" style="max-width:420px">
        <div class="modal-header">
          <div class="modal-title-wrap"><span class="modal-icon-badge"><svg xmlns="http://www.w3.org/2000/svg" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14.086 18.412A2 2 0 0112.67 19H5v-7.672a2 2 0 01.586-1.414L11.75 3.75a6 6 0 118.49 8.49z"/><path d="M16 8 2 22"/><path d="M17.488 15H9"/></svg></span><div class="modal-title" id="modalTtdPreviewTitle">Tanda Tangan</div></div>
          <button class="btn-close" onclick="closeModal('modalTtdPreview')"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/></svg></button>
        </div>
        <div class="modal-body" id="modalTtdPreviewBody"></div>
        <div class="modal-footer">
          <button class="btn btn-ghost" onclick="closeModal('modalTtdPreview')">Tutup</button>
        </div>
      </div>`;
    modal.addEventListener('click', (e) => { if (e.target === modal) closeModal('modalTtdPreview'); });
    document.body.appendChild(modal);
  }
  document.getElementById('modalTtdPreviewTitle').textContent = `Tanda Tangan — ${u.nama}`;
  const body = document.getElementById('modalTtdPreviewBody');
  body.innerHTML = u.tanda_tangan
    ? `<div style="border:1.5px solid var(--abu-2);border-radius:10px;background:#fff;padding:16px;text-align:center">
         <img src="${esc(u.tanda_tangan)}" style="max-width:100%;max-height:180px;object-fit:contain" onerror="this.style.display='none';document.getElementById('modalTtdPreviewErr').style.display='block'">
         <div id="modalTtdPreviewErr" style="display:none;color:var(--merah);font-size:.8rem;padding:8px">Gagal memuat gambar tanda tangan</div>
       </div>`
    : `<div style="border:2px dashed var(--abu-2);border-radius:10px;background:var(--abu-1);padding:32px;text-align:center;color:var(--teks-muted)">
         <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5" style="margin-bottom:8px"><path d="M14.086 18.412A2 2 0 0112.67 19H5v-7.672a2 2 0 01.586-1.414L11.75 3.75a6 6 0 118.49 8.49z"/><path d="M16 8 2 22"/><path d="M17.488 15H9"/></svg>
         <div style="font-size:.85rem">Tanda tangan belum diupload</div>
       </div>`;
  openModal('modalTtdPreview');
}

function openUrutanLaporanModal() {
  const list = _users
    .filter(u => !u.is_admin)
    .sort((a, b) => {
      const ua = a.urutan_laporan, ub = b.urutan_laporan;
      if (ua != null && ub != null) return ua - ub;
      if (ua != null) return -1;
      if (ub != null) return 1;
      return (a.nama || '').localeCompare(b.nama || '');
    });
  if (!list.length) { toast('Belum ada pengguna untuk diatur urutannya', 'error'); return; }
  _renderUrutanLaporanList(list);
  openModal('modalUrutanLaporan');
}

function _renderUrutanLaporanList(list) {
  const container = document.getElementById('urutanLaporanList');
  if (!container) return;
  container.innerHTML = list.map((u, i) => `
    <div class="urutan-lap-item" draggable="true" data-id="${u.id}">
      <svg class="urutan-lap-handle" xmlns="http://www.w3.org/2000/svg" width="15" height="15" fill="currentColor" viewBox="0 0 24 24"><circle cx="8" cy="6" r="1.6"/><circle cx="16" cy="6" r="1.6"/><circle cx="8" cy="12" r="1.6"/><circle cx="16" cy="12" r="1.6"/><circle cx="8" cy="18" r="1.6"/><circle cx="16" cy="18" r="1.6"/></svg>
      <span class="urutan-lap-num">${i + 1}</span>
      <div class="urutan-lap-info">
        <div class="urutan-lap-nama">${esc(u.nama)}</div>
        <div class="urutan-lap-nip">${esc(u.nip || '-')}</div>
      </div>
    </div>`).join('');
  _initUrutanLaporanDrag();
}

function _initUrutanLaporanDrag() {
  const container = document.getElementById('urutanLaporanList');
  if (!container) return;
  const items = () => [...container.querySelectorAll('.urutan-lap-item')];

  items().forEach(item => {
    item.addEventListener('dragstart', () => item.classList.add('dragging'));
    item.addEventListener('dragend', () => {
      item.classList.remove('dragging');
      _renumberUrutanLaporanList();
    });
  });

  
  
  if (!container._dragInit) {
    container.addEventListener('dragover', (e) => {
      e.preventDefault();
      const dragging = container.querySelector('.urutan-lap-item.dragging');
      if (!dragging) return;
      const after = items().find(el => {
        if (el === dragging) return false;
        const rect = el.getBoundingClientRect();
        return e.clientY < rect.top + rect.height / 2;
      });
      if (after) container.insertBefore(dragging, after);
      else container.appendChild(dragging);
    });
    container.addEventListener('drop', (e) => e.preventDefault());
    container._dragInit = true;
  }
}

function _renumberUrutanLaporanList() {
  const container = document.getElementById('urutanLaporanList');
  if (!container) return;
  container.querySelectorAll('.urutan-lap-item').forEach((el, i) => {
    const numEl = el.querySelector('.urutan-lap-num');
    if (numEl) numEl.textContent = i + 1;
  });
}

async function saveUrutanLaporan() {
  const container = document.getElementById('urutanLaporanList');
  if (!container) return;
  const order = [...container.querySelectorAll('.urutan-lap-item')].map(el => parseInt(el.dataset.id));
  try {
    const r = await fetch('/api/users/urutan-laporan', {
      method: 'PUT', headers: authHeaders(), body: JSON.stringify({ order }),
    });
    const d = await r.json();
    if (!r.ok) { toast(d.error || 'Gagal menyimpan urutan', 'error'); return; }
    toast('Urutan laporan disimpan');
    closeModal('modalUrutanLaporan');
    loadUsers();
  } catch { toast('Gagal menyimpan urutan', 'error'); }
}

async function loadUsers() {
  const tb0 = document.getElementById('userTableBody');
  if (tb0) tb0.innerHTML = `<tr class="empty-row"><td colspan="7"><span class="btn-spin" style="width:11px;height:11px;vertical-align:-1px;margin-right:6px"></span>Memuat data...</td></tr>`;
  await loadBidangList();
  try {
    const r = await fetch('/api/users', { headers: authHeaders() });
    const d = await r.json();
    _users = d.users || [];
    _userPage         = 1;
    _userSearch       = '';
    _userFilterBidang = '';
    const searchEl = document.getElementById('userSearch');
    if (searchEl) searchEl.value = '';
    const bidangFilterEl = document.getElementById('userFilterBidang');
    if (bidangFilterEl) bidangFilterEl.value = '';
    _populateUserBidangFilter();
    renderUsersTable();
  } catch {}
}

function _populateUserBidangFilter() {
  const el = document.getElementById('userFilterBidang');
  if (!el) return;
  const usedBidangIds = [...new Set(_users.filter(u => !u.is_admin && u.bidang_id).map(u => u.bidang_id))];
  const opts = usedBidangIds
    .map(id => {
      const b = _bidang.find(x => x.id === id);
      return b ? `<option value="${b.id}">${esc(b.nama)}</option>` : '';
    })
    .filter(Boolean)
    .join('');
  el.innerHTML = `<option value="">Semua Unit Kerja</option>` + opts;
}

async function openUserModal() {
  await loadBidangList();
  document.getElementById('userId').value = '';
  document.getElementById('userNama').value = '';
  document.getElementById('userNip').value = '';
  document.getElementById('userEmail').value = '';
  document.getElementById('modalUserTitle').textContent = 'Tambah Pengguna';
  document.getElementById('userBidang').innerHTML = renderBidangOptions(null);
  openModal('modalUser');
  setTimeout(initBidangSearchable, 90);
}

async function editUser(id) {
  const u = _users.find(x => x.id === id); if (!u) return;
  await loadBidangList();
  document.getElementById('userId').value = u.id;
  document.getElementById('userNama').value = u.nama;
  document.getElementById('userNip').value = u.nip || '';
  document.getElementById('userEmail').value = u.email;
  document.getElementById('modalUserTitle').textContent = 'Edit Pengguna';
  document.getElementById('userBidang').innerHTML = renderBidangOptions(u.bidang_id);
  openModal('modalUser');
  setTimeout(initBidangSearchable, 90);
}

async function saveUser() {
  const id = document.getElementById('userId').value;
  const bidangVal = document.getElementById('userBidang').value;
  const body = {
    nama:     document.getElementById('userNama').value.trim(),
    nip:      document.getElementById('userNip').value.trim(),
    email:    document.getElementById('userEmail').value.trim(),
    bidang_id: bidangVal ? parseInt(bidangVal) : null,
  };
  if (!body.nama || !body.nip || !body.email) { toast('Nama, NIP, dan email wajib diisi', 'error'); return; }
  try {
    const r = await fetch(id ? `/api/users/${id}` : '/api/users', {
      method: id ? 'PUT' : 'POST', headers: authHeaders(), body: JSON.stringify(body),
    });
    const d = await r.json();
    if (!r.ok) { toast(d.error || 'Gagal', 'error'); return; }
    toast(id ? 'Pengguna diperbarui' : 'Pengguna ditambahkan');
    closeModal('modalUser'); loadUsers();
  } catch { toast('Gagal menyimpan', 'error'); }
}

async function deleteUser(id) {
  const ok = await showConfirm({
    title: 'Hapus Pengguna',
    msg: 'Akun pengguna dan semua hak aksesnya akan dihapus permanen.',
    okText: 'Ya, Hapus',
    icon: 'person',
  });
  if (!ok) return;
  await fetch(`/api/users/${id}`, { method: 'DELETE', headers: authHeaders() });
  toast('Pengguna berhasil dihapus'); loadUsers();
}

async function forceLogoutUser(id, nama) {
  const ok = await showConfirm({
    title: 'Paksa Logout',
    msg: `Semua sesi aktif <strong>${nama}</strong> akan dicabut. User akan diminta login ulang di semua perangkat (efektif maks. 1 jam untuk sesi yang sedang berjalan).`,
    okText: 'Ya, Paksa Logout',
    icon: 'person',
    type: 'warning',
  });
  if (!ok) return;
  try {
    const r = await fetch(`/api/users/${id}/force-logout`, { method: 'POST', headers: authHeaders() });
    const d = await r.json();
    if (!r.ok) { toast(d.error || 'Gagal memaksa logout', 'error'); return; }
    toast(d.sesi_dicabut > 0 ? `${d.sesi_dicabut} sesi berhasil dicabut` : 'Tidak ada sesi aktif untuk dicabut', 'success');
  } catch { toast('Gagal memaksa logout', 'error'); }
}

async function resetUserPassword(id, nama) {
  const ok = await showConfirm({
    title: 'Reset Password',
    msg: `Password <strong>${nama}</strong> akan direset ke password default: <strong>Balut2026</strong>. User perlu ganti password setelah login.`,
    okText: 'Ya, Reset',
    icon: 'person',
    type: 'warning',
  });
  if (!ok) return;
  try {
    const r = await fetch(`/api/users/${id}/reset-password`, { method: 'POST', headers: authHeaders() });
    const d = await r.json();
    if (!r.ok) { toast(d.error || 'Gagal mereset password', 'error'); return; }
    toast(`Password berhasil direset ke: ${d.default_password}`, 'success');
  } catch { toast('Gagal mereset password', 'error'); }
}

// Hierarki hak akses: Menu (grup) › Sub-menu. Key permission TIDAK berubah (kompatibel dgn backend).
// base   = izin utama menu itu sendiri (kalau ada); items = sub-menu / tingkat akses di bawahnya.
// admin  = true → tingkat "Admin Penuh" (tidak ikut "Pilih semua", harus dicentang manual).
const PERM_GROUPS = [
  { id: 'dashboard', name: 'Dashboard', icon: 'M3 13h8V3H3v10zm0 8h8v-6H3v6zm10 0h8V11h-8v10zm0-18v6h8V3h-8z',
    base: { key: 'dashboard', desc: 'Lihat halaman dashboard' }, items: [] },
  { id: 'superlink', name: 'Superlink', icon: 'M10 13a5 5 0 007.07 0l3-3a5 5 0 00-7.07-7.07l-1.5 1.5M14 11a5 5 0 00-7.07 0l-3 3a5 5 0 007.07 7.07l1.5-1.5',
    base: null, items: [
      { key: 'superlink.shortlink', name: 'Shortlink', desc: 'Kelola link pendek' },
      { key: 'superlink.bundle',    name: 'Bundle',    desc: 'Kelola bundle link' },
    ] },
  { id: 'surat-masuk', name: 'Surat Masuk', icon: 'M3 8l9 6 9-6M5 5h14a2 2 0 012 2v10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2z',
    base: { key: 'surat.masuk', desc: 'Kelola surat masuk' }, items: [
      { key: 'surat.masuk.full', name: 'Admin Penuh', admin: true, desc: 'Bisa edit/hapus/ubah status surat masuk milik siapapun (setara admin)' },
    ] },
  { id: 'surat-keluar', name: 'Surat Keluar', icon: 'M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z',
    base: { key: 'surat.keluar', desc: 'Kelola surat keluar' }, items: [
      { key: 'surat.keluar.full', name: 'Admin Penuh', admin: true, desc: 'Bisa edit/hapus surat keluar milik siapapun (setara admin)' },
    ] },
  { id: 'kinerja', name: 'Kinerja', icon: 'M3 3v18h18M7 15l4-4 3 3 5-6',
    base: null, items: [
      { key: 'kinerja.monev',  name: 'IKU (Indikator Kinerja Utama)',   desc: 'Input realisasi IKU' },
      { key: 'kinerja.ikk',    name: 'IKK (Indikator Kinerja Kunci)',   desc: 'Input realisasi IKK' },
      { key: 'kinerja.spm',    name: 'SPM (Standar Pelayanan Minimal)', desc: 'Input realisasi SPM' },
      { key: 'kinerja.subkeg', name: 'Sub Kegiatan',                    desc: 'Input realisasi Sub Kegiatan' },
      { key: 'kinerja.full',   name: 'Admin Penuh', admin: true, desc: 'Kelola indikator, target, jenis kinerja, laporan, periode & monitoring pengisian (setara admin kinerja)' },
    ] },
  { id: 'absensi', name: 'Absensi', icon: 'M12 8v4l3 3M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
    base: { key: 'absensi', desc: 'Input & lihat absensi harian sendiri' }, items: [
      { key: 'absensi.full', name: 'Admin Penuh', admin: true, desc: 'Kelola absensi semua pegawai, atur jam kerja & hari libur (setara admin)' },
    ] },
  { id: 'lembur', name: 'Lembur', icon: 'M12 3v1m0 16v1m9-9h-1M4 12H3m15.36-6.36l-.7.7M6.34 17.66l-.7.7m12.72 0l-.7-.7M6.34 6.34l-.7-.7M16 12a4 4 0 11-8 0 4 4 0 018 0z',
    base: { key: 'lembur', desc: 'Isi uraian tugas lembur milik sendiri' }, items: [
      { key: 'lembur.full', name: 'Admin Penuh', admin: true, desc: 'Kelola kegiatan/sesi lembur, tambah peserta, upload dokumentasi (setara admin)' },
    ] },
  { id: 'eplanning', name: 'E-Planning', icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4',
    base: null, items: [
      { key: 'eplanning.operator',   name: 'Operator',            desc: 'Bikin & edit usulan anggaran milik sendiri' },
      { key: 'eplanning.kabid',      name: 'Kepala Unit Kerja',   desc: 'Review & setujui semua usulan di unit kerjanya (Puskesmas/Bidang/Sub Bagian)' },
      { key: 'eplanning.sekretaris', name: 'Sekretaris Dinas',    desc: 'Verifikasi tambahan khusus usulan dari unit kerja tipe Sub Bagian, sebelum ke Admin' },
      { key: 'eplanning.admin',      name: 'Admin Verifikator', admin: true, desc: 'Verifikasi lintas-bidang, sahkan final, kelola master data & pengaturan (setara admin)' },
    ] },
];
// Daftar datar (dipertahankan kalau ada kode lain yang butuh)
const PERM_DEFS = PERM_GROUPS.flatMap(g => [g.base && { key: g.base.key, name: g.name, desc: g.base.desc }, ...g.items].filter(Boolean));

let _editingPermsUserId = null;
let _selectedPerms = new Set();
let _permsOpenGroups = new Set();

function _permGroupKeys(g) { return [g.base?.key, ...g.items.map(i => i.key)].filter(Boolean); }
function _permRegularKeys(g) { return g.items.filter(i => !i.admin).map(i => i.key); }

async function openPermsModal(userId) {
  _editingPermsUserId = userId;
  const u = _users.find(x => x.id === userId);
  document.getElementById('permsUserId').value = userId;
  document.getElementById('permsUserInfo').textContent = `${u?.nama} (${u?.email})`;

  try {
    const r = await fetch(`/api/users/${userId}/permissions`, { headers: authHeaders() });
    const d = await r.json();
    _selectedPerms = new Set(d.permissions || []);
  } catch { _selectedPerms = new Set(); }

  // Grup yang sudah punya akses dibuka otomatis; sisanya tertutup
  _permsOpenGroups = new Set(PERM_GROUPS.filter(g => _permGroupKeys(g).some(k => _selectedPerms.has(k))).map(g => g.id));
  renderPermsGrid();
  openModal('modalPerms');
}

function renderPermsGrid() {
  const grid = document.getElementById('permsGrid');
  const scroller = grid.closest('.modal-body');
  const top = scroller ? scroller.scrollTop : 0;

  const total = PERM_GROUPS.reduce((n, g) => n + _permGroupKeys(g).length, 0);
  const picked = PERM_GROUPS.reduce((n, g) => n + _permGroupKeys(g).filter(k => _selectedPerms.has(k)).length, 0);
  const allOpen = PERM_GROUPS.every(g => !g.items.length || _permsOpenGroups.has(g.id));

  const toolbar = `
    <div class="perm-tree-toolbar">
      <span class="perm-tree-count"><b>${picked}</b> dari ${total} hak akses dipilih</span>
      <span class="perm-tree-actions">
        <button type="button" class="perm-link-btn" onclick="permsToggleAllGroups(${allOpen ? 'false' : 'true'})">${allOpen ? 'Tutup semua' : 'Buka semua'}</button>
        <button type="button" class="perm-link-btn" onclick="permsClearAll()" ${picked ? '' : 'disabled'}>Kosongkan</button>
      </span>
    </div>`;

  const chev = '<svg class="perm-chev" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M9 6l6 6-6 6"/></svg>';

  const groups = PERM_GROUPS.map(g => {
    const keys = _permGroupKeys(g);
    const cnt = keys.filter(k => _selectedPerms.has(k)).length;
    const hasKids = g.items.length > 0;
    const open = hasKids && _permsOpenGroups.has(g.id);

    // State checkbox header
    let state;
    if (g.base) state = _selectedPerms.has(g.base.key) ? 'on' : 'off';
    else {
      const reg = _permRegularKeys(g);
      const n = reg.filter(k => _selectedPerms.has(k)).length;
      state = n === 0 ? 'off' : (n === reg.length ? 'on' : 'mix');
    }
    const sub = g.base ? g.base.desc : (hasKids ? `${g.items.length} sub-menu` : '');

    const kids = g.items.map(it => {
      const sel = _selectedPerms.has(it.key);
      return `
        <div class="perm-child ${sel ? 'selected' : ''} ${it.admin ? 'is-admin' : ''}" onclick="togglePerm('${it.key}')">
          <div class="perm-check"></div>
          <div class="perm-child-txt">
            <div class="perm-name">${esc(it.name)}${it.admin ? '<span class="perm-badge-admin">Admin</span>' : ''}</div>
            <div class="perm-desc">${esc(it.desc)}</div>
          </div>
        </div>`;
    }).join('');

    return `
      <div class="perm-group ${cnt ? 'has-sel' : ''} ${open ? 'open' : ''}">
        <div class="perm-group-head">
          <div class="perm-check-lg ${state}" onclick="permsToggleGroup('${g.id}')" title="${g.base ? 'Beri/cabut akses menu ini' : 'Pilih/kosongkan semua sub-menu (kecuali Admin)'}"></div>
          <div class="perm-group-main" onclick="${hasKids ? `permsToggleOpen('${g.id}')` : `permsToggleGroup('${g.id}')`}">
            <div class="perm-group-ico"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="${g.icon}"/></svg></div>
            <div class="perm-group-txt">
              <div class="perm-group-name">${esc(g.name)}</div>
              ${sub ? `<div class="perm-desc">${esc(sub)}</div>` : ''}
            </div>
            ${hasKids ? `<span class="perm-group-cnt ${cnt ? 'on' : ''}">${cnt}/${keys.length}</span>${chev}` : ''}
          </div>
        </div>
        ${hasKids ? `<div class="perm-group-body"><div class="perm-group-body-in">${kids}</div></div>` : ''}
      </div>`;
  }).join('');

  grid.innerHTML = toolbar + `<div class="perm-tree">${groups}</div>`;
  if (scroller) scroller.scrollTop = top;
}

function permsToggleOpen(id) {
  _permsOpenGroups.has(id) ? _permsOpenGroups.delete(id) : _permsOpenGroups.add(id);
  renderPermsGrid();
}

function permsToggleAllGroups(open) {
  _permsOpenGroups = open ? new Set(PERM_GROUPS.filter(g => g.items.length).map(g => g.id)) : new Set();
  renderPermsGrid();
}

function permsClearAll() {
  _selectedPerms = new Set();
  renderPermsGrid();
}

// Checkbox di header grup
function permsToggleGroup(id) {
  const g = PERM_GROUPS.find(x => x.id === id);
  if (!g) return;
  if (g.base) {
    // Menu dengan izin utama: centang = beri akses; cabut = ikut cabut sub-tingkat (Admin Penuh)
    if (_selectedPerms.has(g.base.key)) _permGroupKeys(g).forEach(k => _selectedPerms.delete(k));
    else { _selectedPerms.add(g.base.key); _permsOpenGroups.add(g.id); }
  } else {
    const reg = _permRegularKeys(g);
    const allOn = reg.every(k => _selectedPerms.has(k));
    if (allOn) reg.forEach(k => _selectedPerms.delete(k));
    else { reg.forEach(k => _selectedPerms.add(k)); _permsOpenGroups.add(g.id); }
    if (id === 'superlink') _permSyncSuperlink();
  }
  renderPermsGrid();
}

function _permSyncSuperlink() {
  if (_selectedPerms.has('superlink.shortlink') || _selectedPerms.has('superlink.bundle')) _selectedPerms.add('superlink.link');
}

function togglePerm(key) {
  if (_selectedPerms.has(key)) {
    _selectedPerms.delete(key);
  } else {
    _selectedPerms.add(key);
    if (key === 'superlink.shortlink' || key === 'superlink.bundle') _permSyncSuperlink();
    // Admin Penuh otomatis butuh izin dasar menunya
    if (key === 'surat.masuk.full')  _selectedPerms.add('surat.masuk');
    if (key === 'surat.keluar.full') _selectedPerms.add('surat.keluar');
    if (key === 'absensi.full')      _selectedPerms.add('absensi');
    if (key === 'lembur.full')       _selectedPerms.add('lembur');
  }
  renderPermsGrid();
}

async function savePerms() {
  const userId = document.getElementById('permsUserId').value;
  try {
    const r = await fetch(`/api/users/${userId}/permissions`, {
      method: 'PUT', headers: authHeaders(),
      body: JSON.stringify({ permissions: [..._selectedPerms] }),
    });
    const d = await r.json();
    if (!r.ok) { toast(d.error || 'Gagal', 'error'); return; }
    toast('Hak akses disimpan');
    closeModal('modalPerms');
  } catch { toast('Gagal menyimpan', 'error'); }
}

let _bidangList     = [];
let _bidangPage     = 1;
const _bidangPageSize = 10;
let _bidangSearch   = '';

function filterBidang() {
  _bidangSearch = document.getElementById('bidangSearch')?.value?.toLowerCase() || '';
  _bidangPage   = 1;
  renderBidangTable();
}

function renderBidangTable() {
  const tb = document.getElementById('bidangTableBody');
  if (!tb) return;

  const filtered = _bidangList.filter(b => {
    if (!_bidangSearch) return true;
    return b.nama.toLowerCase().includes(_bidangSearch);
  });

  const start = (_bidangPage - 1) * _bidangPageSize;
  const slice = filtered.slice(start, start + _bidangPageSize);

  const TIPE_LABEL = { puskesmas: 'Puskesmas', bidang: 'Bidang', sub_bagian: 'Sub Bagian' };
  tb.innerHTML = slice.length
    ? slice.map(b => `
      <tr>
        <td>${esc(b.nama)}</td>
        <td>${esc(TIPE_LABEL[b.tipe] || b.tipe || 'Bidang')}</td>
        <td style="white-space:nowrap">
          <button class="btn btn-ghost btn-sm" data-tip="Edit" onclick="editBidang(${b.id})">
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>
          </button>
          <button class="btn-hapus" data-tip="Hapus" onclick="deleteBidang(${b.id})">
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path stroke-linecap="round" stroke-linejoin="round" d="M19 6l-1 14H6L5 6"/><path stroke-linecap="round" stroke-linejoin="round" d="M10 11v6m4-6v6"/><path stroke-linecap="round" stroke-linejoin="round" d="M9 6V4h6v2"/></svg>
          </button>
        </td>
      </tr>`).join('')
    : '<tr class="empty-row"><td colspan="3">Belum ada bidang</td></tr>';

  renderPagination('bidangPagination', filtered.length, _bidangPage, _bidangPageSize, 'goBidangPage');
}

window.goBidangPage = (p) => { _bidangPage = p; renderBidangTable(); };

async function loadBidangPage() {
  const tb0 = document.getElementById('bidangTableBody');
  if (tb0) tb0.innerHTML = `<tr class="empty-row"><td colspan="3"><span class="btn-spin" style="width:11px;height:11px;vertical-align:-1px;margin-right:6px"></span>Memuat data...</td></tr>`;
  try {
    const r = await fetch('/api/bidang', { headers: authHeaders() });
    const d = await r.json();
    _bidangList   = d.bidang || [];
    _bidangPage   = 1;
    _bidangSearch = '';
    const searchEl = document.getElementById('bidangSearch');
    if (searchEl) searchEl.value = '';
    renderBidangTable();
  } catch { toast('Gagal memuat bidang', 'error'); }
}

function openBidangModal() {
  document.getElementById('bidangId').value = '';
  document.getElementById('bidangNama').value = '';
  document.getElementById('bidangTipe').value = 'bidang';
  if (typeof syncCustomSelect === 'function') syncCustomSelect('bidangTipe');
  document.getElementById('modalBidangTitle').textContent = 'Tambah Bidang';
  openModal('modalBidang');
}

function editBidang(id) {
  const b = _bidangList.find(x => x.id === id); if (!b) return;
  document.getElementById('bidangId').value = b.id;
  document.getElementById('bidangNama').value = b.nama;
  document.getElementById('bidangTipe').value = b.tipe || 'bidang';
  if (typeof syncCustomSelect === 'function') syncCustomSelect('bidangTipe');
  document.getElementById('modalBidangTitle').textContent = 'Edit Bidang';
  openModal('modalBidang');
}

async function saveBidang() {
  const id = document.getElementById('bidangId').value;
  const body = {
    nama: document.getElementById('bidangNama').value.trim(),
    tipe: document.getElementById('bidangTipe').value || 'bidang',
  };
  if (!body.nama) { toast('Nama bidang wajib diisi', 'error'); return; }
  try {
    const r = await fetch(id ? `/api/bidang/${id}` : '/api/bidang', {
      method: id ? 'PUT' : 'POST', headers: authHeaders(), body: JSON.stringify(body),
    });
    const d = await r.json();
    if (!r.ok) { toast(d.error || 'Gagal', 'error'); return; }
    toast(id ? 'Bidang diperbarui' : 'Bidang ditambahkan');
    closeModal('modalBidang'); loadBidangPage();
  } catch { toast('Gagal menyimpan bidang', 'error'); }
}

async function deleteBidang(id) {
  const ok = await showConfirm({
    title: 'Hapus Bidang',
    msg: 'Bidang akan dihapus. Pastikan tidak ada pengguna yang terhubung ke bidang ini.',
    okText: 'Ya, Hapus',
    icon: 'trash',
  });
  if (!ok) return;
  const r = await fetch(`/api/bidang/${id}`, { method: 'DELETE', headers: authHeaders() });
  const d = await r.json();
  if (!r.ok) { toast(d.error || 'Gagal menghapus', 'error'); return; }
  toast('Bidang berhasil dihapus'); loadBidangPage();
}

let _assignIndikatorUserId = null;
let _assignIndikatorList   = [];   
let _assignSelectedIds     = new Set();
let _assignSearch          = '';

async function openAssignIndikatorModal(userId) {
  _assignIndikatorUserId = userId;
  _assignSearch = '';
  const u = _users.find(x => x.id === userId);

  document.getElementById('assignIndikatorUserInfo').textContent =
    `${u?.nama || ''} (${u?.email || ''})`;

  
  try {
    const [ri, ra] = await Promise.all([
      fetch('/api/kinerja/indikator', { headers: authHeaders() }),
      fetch(`/api/users/${userId}/indikator`, { headers: authHeaders() }),
    ]);
    const di = await ri.json();
    const da = await ra.json();
    const allIndikator = di.indikator || [];
    const userBidang = _bidang.find(b => b.id === u?.bidang_id);
    const userBidangNama = userBidang?.nama?.trim() || null;
    _assignIndikatorList = userBidangNama
    ? allIndikator.filter(r => (r.penanggung_jawab || '').trim() === userBidangNama)
    : allIndikator;
    _assignSelectedIds   = new Set((da.indikator_ids || []).map(Number));
  } catch {
    _assignIndikatorList = [];
    _assignSelectedIds   = new Set();
  }

  const searchEl = document.getElementById('assignIndikatorSearch');
  if (searchEl) searchEl.value = '';

  _renderAssignIndikatorList();
  openModal('modalAssignIndikator');
}

function _renderAssignIndikatorList() {
  const container = document.getElementById('assignIndikatorList');
  if (!container) return;

  const q = _assignSearch.toLowerCase();
  const filtered = _assignIndikatorList.filter(r => {
    if (!q) return true;
    return (r.indikator_kinerja || '').toLowerCase().includes(q) ||
           (r.penanggung_jawab  || '').toLowerCase().includes(q);
  });

  if (!filtered.length) {
    const msg = _assignSearch
      ? 'Tidak ditemukan.'
      : 'Belum ada indikator yang di-assign ke pengguna ini.<br>Centang indikator di atas lalu simpan.';
    container.innerHTML = `<div style="padding:24px 20px;text-align:center;color:#94a3b8;font-size:.83rem;line-height:1.6">${msg}</div>`;
    return;
  }

  const groups = {};
  filtered.forEach(r => {
    const pj = r.penanggung_jawab || '- Tanpa PJ';
    if (!groups[pj]) groups[pj] = [];
    groups[pj].push(r);
  });

  let html = '';
  for (const [pj, items] of Object.entries(groups)) {
    const allSelected = items.every(r => _assignSelectedIds.has(r.id));
    html += `
      <div style="padding:6px 14px 4px;background:#f8fafc;border-bottom:1px solid #e2e8f0;display:flex;align-items:center;gap:8px;position:sticky;top:0;z-index:1">
        <label style="display:flex;align-items:center;gap:6px;cursor:pointer;font-size:.75rem;font-weight:700;color:#475569">
          <input type="checkbox" ${allSelected ? 'checked' : ''} onchange="_assignTogglePJ(${esc(JSON.stringify(pj))}, this.checked)"
            style="width:14px;height:14px;accent-color:var(--primer,#2563eb);cursor:pointer">
          ${esc(pj)}
          <span style="font-weight:400;color:#94a3b8">(${items.length})</span>
        </label>
      </div>`;
    items.forEach(r => {
      const sel = _assignSelectedIds.has(r.id);
      const jenisTag = [
        r.jenis_monev ? '<span style="font-size:.62rem;font-weight:700;color:#1e40af;background:#dbeafe;padding:1px 5px;border-radius:4px">IKU</span>' : '',
        r.jenis_ikk   ? '<span style="font-size:.62rem;font-weight:700;color:#065f46;background:#d1fae5;padding:1px 5px;border-radius:4px">IKK</span>'   : '',
        r.jenis_spm   ? '<span style="font-size:.62rem;font-weight:700;color:#92400e;background:#fef3c7;padding:1px 5px;border-radius:4px">SPM</span>'   : '',
      ].filter(Boolean).join(' ');
      html += `
        <label style="display:flex;align-items:flex-start;gap:10px;padding:8px 14px;cursor:pointer;border-bottom:1px solid #f1f5f9;${sel ? 'background:#eff6ff' : ''}" 
               onmouseenter="this.style.background='${sel ? '#eff6ff' : '#f8fafc'}'" 
               onmouseleave="this.style.background='${sel ? '#eff6ff' : ''}'">
          <input type="checkbox" value="${r.id}" ${sel ? 'checked' : ''} onchange="_assignToggle(${r.id}, this.checked)"
            style="width:14px;height:14px;margin-top:2px;accent-color:var(--primer,#2563eb);cursor:pointer;flex-shrink:0">
          <div style="min-width:0">
            <div style="font-size:.82rem;color:#1e293b;line-height:1.4;word-break:break-word">${esc(r.indikator_kinerja)}</div>
            <div style="display:flex;gap:4px;margin-top:3px;flex-wrap:wrap">
              ${jenisTag}
              ${r.satuan ? `<span style="font-size:.62rem;color:#64748b">${esc(r.satuan)}</span>` : ''}
            </div>
          </div>
        </label>`;
    });
  }

  container.innerHTML = html;

  const counter = document.getElementById('assignIndikatorCounter');
  if (counter) counter.textContent = `${_assignSelectedIds.size} dipilih`;
}

function _assignToggle(id, checked) {
  if (checked) _assignSelectedIds.add(id);
  else _assignSelectedIds.delete(id);
  _renderAssignIndikatorList();
}

function _assignTogglePJ(pj, checked) {
  const items = _assignIndikatorList.filter(r => (r.penanggung_jawab || '- Tanpa PJ') === pj);
  items.forEach(r => {
    if (checked) _assignSelectedIds.add(r.id);
    else _assignSelectedIds.delete(r.id);
  });
  _renderAssignIndikatorList();
}

function filterAssignIndikator() {
  _assignSearch = document.getElementById('assignIndikatorSearch')?.value || '';
  _renderAssignIndikatorList();
}

async function saveAssignIndikator() {
  const userId = _assignIndikatorUserId;
  if (!userId) return;
  try {
    const r = await fetch(`/api/users/${userId}/indikator`, {
      method: 'PUT', headers: authHeaders(),
      body: JSON.stringify({ indikator_ids: [..._assignSelectedIds] }),
    });
    const d = await r.json();
    if (!r.ok) { toast(d.error || 'Gagal', 'error'); return; }
    toast('Assignment indikator disimpan');
    closeModal('modalAssignIndikator');
  } catch { toast('Gagal menyimpan', 'error'); }
}