// ═══════════════════════════════════════════
// USERS (admin only)
// ═══════════════════════════════════════════
let _users  = [];
let _bidang = [];  // cache master bidang

// ── Pagination state untuk tabel Users ──
let _userPage     = 1;
const _userPageSize = 10;
let _userSearch   = '';
let _userFilterBidang = '';   // '' | bidang_id (string)

// Load master bidang untuk dropdown
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

// ── Searchable Bidang Dropdown ────────────────────────────────────────────
// Membangun custom searchable dropdown di atas <select id="userBidang">
// Dipanggil setiap kali modal user dibuka (setelah options di-set).
function initBidangSearchable() {
  const sel = document.getElementById('userBidang');
  if (!sel) return;
  const wrap = sel.closest('.select-wrap');
  if (!wrap) return;

  // Hapus semua custom UI lama (bsel maupun csel yang dibuat oleh initAll global)
  wrap.querySelectorAll('.bsel-trigger, .bsel-panel, .csel-trigger, .csel-panel').forEach(el => el.remove());
  wrap.classList.remove('csel-ready');

  const selectedOpt = sel.options[sel.selectedIndex];
  const selectedText = (selectedOpt && selectedOpt.value !== '') ? selectedOpt.text : null;

  // ── Trigger button ──────────────────────────────────────────────────────
  const trigger = document.createElement('button');
  trigger.type = 'button';
  trigger.className = 'bsel-trigger csel-trigger';
  trigger.innerHTML = `<span class="bsel-trigger-text csel-trigger-text${selectedText ? '' : ' placeholder'}">${selectedText || '- Pilih Penanggung Jawab -'}</span>
    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5" class="csel-chev"><path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7"/></svg>`;
  wrap.appendChild(trigger);

  // ── Panel ───────────────────────────────────────────────────────────────
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

  // Options list container
  const listEl = document.createElement('div');
  listEl.className = 'bsel-list';
  listEl.style.cssText = 'max-height:220px;overflow-y:scroll;overscroll-behavior:contain';
  panel.appendChild(listEl);

  // Panel di-mount ke body agar position:fixed tidak terpotong stacking context modal
  wrap.appendChild(panel);

  function renderList(query) {
    const q = (query || '').toLowerCase();
    listEl.innerHTML = '';
    let hasResult = false;

    Array.from(sel.options).forEach((opt, i) => {
      const text = opt.text;
      const val  = opt.value;
      if (q && val === '') return; // hide placeholder option when searching
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
      listEl.innerHTML = '<div style="padding:10px 14px;font-size:.83rem;color:var(--text-secondary,#64748b)">Tidak ditemukan</div>';
    }
  }

  function openPanel() {
    // Close any other open csel/bsel panel
    document.querySelectorAll('.bsel-panel, .csel-panel').forEach(p => {
      if (p !== panel) {
        p.style.display = 'none';
        p.parentElement?.querySelector('.csel-trigger, .bsel-trigger')?.classList.remove('open');
      }
    });

    // Pindahkan panel ke body agar position:fixed tidak terpotong stacking context modal
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
    // Kembalikan panel ke wrap supaya tidak numpuk di body
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

  // Tutup panel saat scroll di luar panel, atau resize
  window.addEventListener('scroll', (e) => {
    if (!panel.contains(e.target)) closePanel();
  }, true);
  window.addEventListener('resize', closePanel, true);

  // Close on outside click - jangan tutup kalau klik di dalam panel atau trigger
  const outsideHandler = (e) => {
    if (!panel.contains(e.target) && !trigger.contains(e.target)) closePanel();
  };
  document.addEventListener('click', outsideHandler, { once: false });
  // Store ref to remove later if needed
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

// ── URUTAN LAPORAN (admin atur urutan manual pegawai buat Laporan Absensi) ──
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

  // Listener di container cukup di-attach sekali (innerHTML re-render item-nya,
  // tapi container-nya sendiri tetap sama elemen tiap modal dibuka)
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
  if (tb0) tb0.innerHTML = `<tr class="empty-row"><td colspan="6"><span class="btn-spin" style="width:11px;height:11px;vertical-align:-1px;margin-right:6px"></span>Memuat data...</td></tr>`;
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

// ── PAKSA LOGOUT (admin) ─────────────────────────────────────────────────
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

// ── RESET PASSWORD (admin) ───────────────────────────────────────────────
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

// ── PERMISSIONS ──────────────────────────────────────────────────────────
const PERM_DEFS = [
  { key: 'dashboard',           name: 'Dashboard Utama',          desc: 'Lihat halaman dashboard' },
  { key: 'superlink.shortlink', name: 'Superlink › Shortlink',    desc: 'Kelola link pendek' },
  { key: 'superlink.bundle',    name: 'Superlink › Bundle',       desc: 'Kelola bundle link' },
  { key: 'surat.masuk',         name: 'Surat Masuk',              desc: 'Kelola surat masuk' },
  { key: 'surat.masuk.full',    name: 'Surat Masuk › Admin Penuh', desc: 'Bisa edit/hapus/ubah status surat masuk milik siapapun (setara admin)' },
  { key: 'surat.keluar',        name: 'Surat Keluar',             desc: 'Kelola surat keluar' },
  { key: 'surat.keluar.full',   name: 'Surat Keluar › Admin Penuh', desc: 'Bisa edit/hapus surat keluar milik siapapun (setara admin)' },
  { key: 'kinerja.monev',       name: 'IKU (Indikator Kinerja Utama)', desc: 'Input realisasi IKU' },
  { key: 'kinerja.ikk',         name: 'IKK (Indikator Kinerja Kunci)',    desc: 'Input realisasi IKK' },
  { key: 'kinerja.spm',         name: 'SPM (Standar Pelayanan Minimal)', desc: 'Input realisasi SPM' },
  { key: 'absensi',             name: 'Absensi',                  desc: 'Input & lihat absensi harian sendiri' },
  { key: 'absensi.full',        name: 'Absensi › Admin Penuh',    desc: 'Kelola absensi semua pegawai, atur jam kerja & hari libur (setara admin)' },
  { key: 'eplanning.operator',   name: 'E-Planning › Operator',            desc: 'Bikin & edit usulan anggaran milik sendiri' },
  { key: 'eplanning.kabid',      name: 'E-Planning › Kepala Unit Kerja',   desc: 'Review & setujui semua usulan di unit kerjanya (Puskesmas/Bidang/Sub Bagian)' },
  { key: 'eplanning.sekretaris', name: 'E-Planning › Sekretaris Dinas',    desc: 'Verifikasi tambahan khusus usulan dari unit kerja tipe Sub Bagian, sebelum ke Admin' },
  { key: 'eplanning.admin',      name: 'E-Planning › Admin Verifikator',  desc: 'Verifikasi lintas-bidang, sahkan final, kelola master data & pengaturan (setara admin)' },
];

let _editingPermsUserId = null;
let _selectedPerms = new Set();

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

  renderPermsGrid();
  openModal('modalPerms');
}

function renderPermsGrid() {
  const grid = document.getElementById('permsGrid');
  grid.innerHTML = PERM_DEFS.map(p => {
    const sel = _selectedPerms.has(p.key);
    return `
      <div class="perm-item ${sel ? 'selected' : ''}" onclick="togglePerm('${p.key}', this)">
        <div class="perm-check"></div>
        <div>
          <div class="perm-name">${esc(p.name)}</div>
          <div class="perm-desc">${esc(p.desc)}</div>
        </div>
      </div>`;
  }).join('');
}

function togglePerm(key, el) {
  if (_selectedPerms.has(key)) {
    _selectedPerms.delete(key);
    el.classList.remove('selected');
  } else {
    _selectedPerms.add(key);
    el.classList.add('selected');
    // Shortlink/Bundle butuh superlink.link untuk write operation
    if (key === 'superlink.shortlink' || key === 'superlink.bundle') {
      _selectedPerms.add('superlink.link');
    }
    // Admin Penuh surat butuh akses menu surat dasarnya juga
    if (key === 'surat.masuk.full') _selectedPerms.add('surat.masuk');
    if (key === 'surat.keluar.full') _selectedPerms.add('surat.keluar');
  }
  // Re-render supaya state checkbox semua sinkron
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

// ═══════════════════════════════════════════
// MASTER BIDANG
// ═══════════════════════════════════════════
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
  if (tb0) tb0.innerHTML = `<tr class="empty-row"><td colspan="2"><span class="btn-spin" style="width:11px;height:11px;vertical-align:-1px;margin-right:6px"></span>Memuat data...</td></tr>`;
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

// ═══════════════════════════════════════════
// ASSIGN INDIKATOR per USER
// ═══════════════════════════════════════════
let _assignIndikatorUserId = null;
let _assignIndikatorList   = [];   // semua indikator dari API
let _assignSelectedIds     = new Set();
let _assignSearch          = '';

async function openAssignIndikatorModal(userId) {
  _assignIndikatorUserId = userId;
  _assignSearch = '';
  const u = _users.find(x => x.id === userId);

  document.getElementById('assignIndikatorUserInfo').textContent =
    `${u?.nama || ''} (${u?.email || ''})`;

  // Load semua indikator dan assignment user secara paralel
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

  // Group by penanggung_jawab
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

  // Update counter
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