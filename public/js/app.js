'use strict';

const _searchDebounceTimers = {};
function debounceInput(key, fn, delay = 300) {
  clearTimeout(_searchDebounceTimers[key]);
  _searchDebounceTimers[key] = setTimeout(fn, delay);
}

let _token = null;
let _refreshToken = null;
let _user  = null;
let _refreshInFlight = null; 

function _decodeJwtPayload(token) {
  try {
    if (!token || typeof token !== 'string') return null;
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const part = parts[1];
    if (!part) return null;
    
    const b64 = part.replace(/-/g, '+').replace(/_/g, '/');
    const pad = b64 + '='.repeat((4 - b64.length % 4) % 4);
    const decoded = atob(pad);
    
    const json = decodeURIComponent(decoded.split('').map(c =>
      '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)
    ).join(''));
    return JSON.parse(json);
  } catch (e) {
    console.warn('[JWT] Gagal decode payload:', e);
    return null;
  }
}

function _isTokenExpired(token) {
  const payload = _decodeJwtPayload(token);
  if (!payload || !payload.exp) return false;
  return payload.exp < (Math.floor(Date.now() / 1000) - 300);
}

function _handleSessionExpired() {
  console.error('[Auth] _handleSessionExpired dipanggil dari:', new Error().stack);
  _clearExpiryTimer();
  _token = null;
  _refreshToken = null;
  _user  = null;
  sessionStorage.removeItem('sapa_token');
  sessionStorage.removeItem('sapa_refresh_token');
  sessionStorage.removeItem('sapa_user');
  try { sessionStorage.removeItem('sapa_nav'); } catch(e) {}

  // login.html udah gak nempel di app.html lagi - lempar balik kesana,
  // pesannya dititip lewat sessionStorage biar bisa ditampilkan di sana.
  try { sessionStorage.setItem('sapa_login_msg', 'Sesi Anda telah berakhir. Silakan login kembali.'); } catch(e) {}
  window.location.replace('/login.html');
}

function initAuth() {
  _clearExpiryTimer(); 
  try {
    _token = sessionStorage.getItem('sapa_token');
    _refreshToken = sessionStorage.getItem('sapa_refresh_token');
    const rawUser = sessionStorage.getItem('sapa_user');
    _user = rawUser ? JSON.parse(rawUser) : null;
  } catch (e) {
    console.warn('[initAuth] Gagal parse sapa_user:', e);
    _token = null;
    _refreshToken = null;
    _user  = null;
    sessionStorage.removeItem('sapa_token');
    sessionStorage.removeItem('sapa_refresh_token');
    sessionStorage.removeItem('sapa_user');
  }
  if (!_token || !_user) { window.location.replace('/login.html'); return false; }
  document.body.classList.toggle('is-admin', !!_user.is_admin);

  
  if (_isTokenExpired(_token)) {
    sessionStorage.removeItem('sapa_token');
    sessionStorage.removeItem('sapa_refresh_token');
    sessionStorage.removeItem('sapa_user');
    try { sessionStorage.setItem('sapa_login_msg', 'Sesi Anda telah berakhir. Silakan login kembali.'); } catch(e) {}
    window.location.replace('/login.html');
    return false;
  }

  
  _scheduleTokenExpiry();
  
  if (typeof _idleStart === 'function') _idleStart();
  const _dbgPayload = _decodeJwtPayload(_token);
  if (_dbgPayload?.exp) {
    const _dbgLeft = Math.round((_dbgPayload.exp * 1000 - Date.now()) / 60000);
    console.debug('[Auth] Login berhasil, token valid ~', _dbgLeft, 'menit lagi');
  }
  
  const shell = document.getElementById('appShell');
  if (shell) shell.style.visibility = '';
  return true;
}

let _expiryTimerId = null;
const _REFRESH_MARGIN_MS = 2 * 60 * 1000;

function _clearExpiryTimer() {
  if (_expiryTimerId !== null) {
    clearTimeout(_expiryTimerId);
    _expiryTimerId = null;
  }
}

function _scheduleTokenExpiry() {
  _clearExpiryTimer();
  if (!_token) return;
  const payload = _decodeJwtPayload(_token);
  if (!payload?.exp) return;
  const msUntilExp = (payload.exp * 1000) - Date.now();
  if (msUntilExp <= 0) return;
  const msUntilRefresh = Math.max(msUntilExp - _REFRESH_MARGIN_MS, 0);
  _expiryTimerId = setTimeout(async () => {
    _expiryTimerId = null;
    const ok = await _doRefreshToken();
    if (!ok) _handleSessionExpired();
  }, msUntilRefresh);
  console.debug('[Auth] Refresh token dijadwalkan dalam', Math.round(msUntilRefresh / 60000), 'menit');
}

async function _doRefreshToken() {
  if (!_refreshToken) return false;
  if (_refreshInFlight) return _refreshInFlight;

  _refreshInFlight = (async () => {
    try {
      const r = await fetch('/api/auth/refresh', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh_token: _refreshToken }),
      });
      if (!r.ok) return false;
      const data = await r.json();
      if (!data.token || !data.refresh_token) return false;
      _token = data.token;
      _refreshToken = data.refresh_token;
      sessionStorage.setItem('sapa_token', _token);
      sessionStorage.setItem('sapa_refresh_token', _refreshToken);
      _scheduleTokenExpiry();
      console.debug('[Auth] Token berhasil di-refresh diam-diam');
      return true;
    } catch (e) {
      console.warn('[Auth] Gagal refresh token:', e);
      return false;
    }
  })();

  const result = await _refreshInFlight;
  _refreshInFlight = null;
  return result;
}

const _IDLE_WARNING_MS  = 4.5 * 60 * 1000;  
const _IDLE_LOGOUT_MS   = 5.0 * 60 * 1000;  
const _IDLE_COUNTDOWN_S = 30;                

let _idleWarningTimer   = null;
let _idleLogoutTimer    = null;
let _idleCountdownTimer = null;
let _idleActive         = false;  

const _IDLE_EVENTS = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll', 'click'];

function _idleResetTimers() {
  
  if (!_idleActive) return;
  
  const modal = document.getElementById('modalIdleWarning');
  if (modal && modal.style.display === 'flex') {
    modal.style.display = 'none';
  }
  _idleClearAll();
  _idleWarningTimer = setTimeout(_idleShowWarning, _IDLE_WARNING_MS);
}

function _idleClearAll() {
  if (_idleWarningTimer)   { clearTimeout(_idleWarningTimer);   _idleWarningTimer   = null; }
  if (_idleLogoutTimer)    { clearTimeout(_idleLogoutTimer);    _idleLogoutTimer    = null; }
  if (_idleCountdownTimer) { clearInterval(_idleCountdownTimer); _idleCountdownTimer = null; }
}

function _idleShowWarning() {
  const modal = document.getElementById('modalIdleWarning');
  if (!modal) return;
  
  modal.style.display = 'flex';
  
  let sisa = _IDLE_COUNTDOWN_S;
  const numEl = document.getElementById('idleCountdownNum');
  if (numEl) numEl.textContent = sisa;
  _idleCountdownTimer = setInterval(() => {
    sisa--;
    if (numEl) numEl.textContent = sisa;
    if (sisa <= 0) {
      _idleClearAll();
      _idleLogoutNow();
    }
  }, 1000);
  
  _idleLogoutTimer = setTimeout(_idleLogoutNow, _IDLE_COUNTDOWN_S * 1000);
}

function _idleStayLoggedIn() {
  const modal = document.getElementById('modalIdleWarning');
  if (modal) modal.style.display = 'none';
  _idleClearAll();
  
  _idleWarningTimer = setTimeout(_idleShowWarning, _IDLE_WARNING_MS);
}

function _idleLogoutNow() {
  _idleStop();
  const modal = document.getElementById('modalIdleWarning');
  if (modal) modal.style.display = 'none';
  _handleSessionExpired();
}

function _idleStart() {
  _idleActive = true;
  _IDLE_EVENTS.forEach(ev => window.addEventListener(ev, _idleResetTimers, { passive: true }));
  _idleResetTimers(); 
}

function _idleStop() {
  _idleActive = false;
  _idleClearAll();
  _IDLE_EVENTS.forEach(ev => window.removeEventListener(ev, _idleResetTimers));
}

function authHeaders() {
  
  
  
  
  
  if (!_token) return { 'Content-Type': 'application/json' };
  return { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + _token };
}

async function apiFetch(url, opts = {}) {
  let resp = await fetch(url, opts);
  if (resp.status === 401) {
    const refreshed = await _doRefreshToken();
    if (refreshed) {
      const retryOpts = { ...opts };
      if (retryOpts.headers && retryOpts.headers['Authorization'] !== undefined) {
        retryOpts.headers = { ...retryOpts.headers, 'Authorization': 'Bearer ' + _token };
      }
      resp = await fetch(url, retryOpts);
      if (resp.status !== 401) return resp;
    }
    
    _handleSessionExpired();
    throw new Error('Sesi berakhir');
  }
  return resp;
}

function hasAccess(key) {
  if (_user.is_admin) return true;
  return Array.isArray(_user.permissions) && _user.permissions.includes(key);
}

const hasPermission = hasAccess;  

let _hasMonevIndikator = false;
let _hasIkkIndikator   = false;
let _hasSpmIndikator   = false;

async function _cekKinerjaIndikator() {
  if (_user && _user.is_admin) { _hasMonevIndikator = true; _hasIkkIndikator = true; _hasSpmIndikator = true; return; }
  try {
    
    const [rAssign, rAll] = await Promise.all([
      fetch(`/api/users/${_user.id}/indikator`, { headers: authHeaders() }).catch(() => null),
      fetch('/api/kinerja/indikator',            { headers: authHeaders() }).catch(() => null),
    ]);
    const dAssign = (rAssign && rAssign.ok) ? await rAssign.json() : {};
    const dAll    = (rAll    && rAll.ok)    ? await rAll.json()    : {};

    const assignedIds  = new Set((dAssign.indikator_ids || []).map(Number));
    const allIndikator = dAll.indikator || [];

    const assigned     = allIndikator.filter(r => assignedIds.has(r.id));
    _hasMonevIndikator = assigned.some(r => r.jenis_monev);
    _hasIkkIndikator   = assigned.some(r => r.jenis_ikk);
    _hasSpmIndikator   = assigned.some(r => r.jenis_spm);
  } catch {
    _hasMonevIndikator = false;
    _hasIkkIndikator   = false;
  }
}

function openAvatarUpload() {
  const current = _user.foto_url || null;
  document.getElementById('avatarUploadUrl').value = current || '';
  const prev  = document.getElementById('avatarUploadPreview');
  const empty = document.getElementById('avatarUploadInitial');
  if (current) {
    prev.src = current; prev.style.display = 'block'; empty.style.display = 'none';
  } else {
    prev.style.display = 'none'; empty.style.display = 'flex';
    empty.textContent = (_user.nama || 'U')[0].toUpperCase();
  }
  document.getElementById('avatarUploadProgress').style.display = 'none';
  document.getElementById('topbarDropdown')?.classList.remove('open');
  openModal('modalAvatarUpload');
}

async function onAvatarFileChange(input) {
  const file = input.files?.[0];
  if (!file) return;

  const MAX_MB = 2;
  if (file.size > MAX_MB * 1024 * 1024) {
    toast(`Foto terlalu besar (maks. ${MAX_MB} MB)`, 'error');
    input.value = '';
    return;
  }

  const prog  = document.getElementById('avatarUploadProgress');
  const bar   = document.getElementById('avatarUploadProgressBar');
  const prev  = document.getElementById('avatarUploadPreview');
  const empty = document.getElementById('avatarUploadInitial');
  if (prog) prog.style.display = '';
  if (bar)  bar.style.width = '30%';

  try {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('kategori', 'foto_profil');
    const r = await fetch('/api/upload', {
      method: 'POST',
      headers: { 'Authorization': authHeaders()['Authorization'] },
      body: formData,
    });
    if (bar) bar.style.width = '90%';
    if (!r.ok) {
      const d = await r.json().catch(() => ({}));
      throw new Error(d.error || 'Gagal upload');
    }
    const d = await r.json();
    if (bar) { bar.style.width = '100%'; setTimeout(() => { if (prog) prog.style.display = 'none'; }, 600); }
    document.getElementById('avatarUploadUrl').value = d.url;
    prev.src = d.url; prev.style.display = 'block';
    empty.style.display = 'none';
    toast('Foto berhasil diupload', 'success');
  } catch (err) {
    if (prog) prog.style.display = 'none';
    toast('Gagal upload foto: ' + err.message, 'error');
  } finally {
    input.value = '';
  }
}

function clearAvatarUpload() {
  document.getElementById('avatarUploadUrl').value = '';
  const prev  = document.getElementById('avatarUploadPreview');
  const empty = document.getElementById('avatarUploadInitial');
  prev.src = ''; prev.style.display = 'none';
  empty.style.display = 'flex';
  empty.textContent = (_user.nama || 'U')[0].toUpperCase();
  const fi = document.getElementById('avatarUploadFile');
  if (fi) fi.value = '';
}

async function saveAvatarUpload() {
  const avatarUrl = document.getElementById('avatarUploadUrl').value.trim();
  try {
    const r = await fetch(`/api/users/${_user.id}/avatar`, {
      method: 'PUT',
      headers: { ...authHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ avatar_url: avatarUrl }),
    });
    const d = await r.json().catch(() => ({}));
    if (!r.ok) { toast(d.error || 'Gagal menyimpan foto profil', 'error'); return; }
    _user.foto_url = avatarUrl || null;
    sessionStorage.setItem(`sapa_user_foto_${_user.id}`, _user.foto_url || '');
    if (typeof _applyTopbarAvatar === 'function') _applyTopbarAvatar(_user.foto_url);
    toast('Foto profil berhasil disimpan', 'success');
    closeModal('modalAvatarUpload');
  } catch (err) {
    toast('Gagal: ' + err.message, 'error');
  }
}

function openTandaTanganUpload() {
  const current = _user.tanda_tangan || null;
  document.getElementById('ttdUploadUrl').value = current || '';
  const prev  = document.getElementById('ttdUploadPreview');
  const empty = document.getElementById('ttdUploadEmpty');
  if (current) {
    prev.src = current; prev.style.display = 'block'; empty.style.display = 'none';
  } else {
    prev.style.display = 'none'; empty.style.display = 'flex';
  }
  document.getElementById('ttdUploadProgress').style.display = 'none';
  document.getElementById('topbarDropdown')?.classList.remove('open');
  openModal('modalTandaTangan');
}

async function onTandaTanganFileChange(input) {
  const file = input.files?.[0];
  if (!file) return;

  const MAX_MB = 2;
  if (file.size > MAX_MB * 1024 * 1024) {
    toast(`Gambar terlalu besar (maks. ${MAX_MB} MB)`, 'error');
    input.value = '';
    return;
  }

  const prog  = document.getElementById('ttdUploadProgress');
  const bar   = document.getElementById('ttdUploadProgressBar');
  const prev  = document.getElementById('ttdUploadPreview');
  const empty = document.getElementById('ttdUploadEmpty');
  if (prog) prog.style.display = '';
  if (bar)  bar.style.width = '30%';

  try {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('kategori', 'tanda_tangan');
    const r = await fetch('/api/upload', {
      method: 'POST',
      headers: { 'Authorization': authHeaders()['Authorization'] },
      body: formData,
    });
    if (bar) bar.style.width = '90%';
    if (!r.ok) {
      const d = await r.json().catch(() => ({}));
      throw new Error(d.error || 'Gagal upload');
    }
    const d = await r.json();
    if (bar) { bar.style.width = '100%'; setTimeout(() => { if (prog) prog.style.display = 'none'; }, 600); }
    document.getElementById('ttdUploadUrl').value = d.url;
    prev.src = d.url; prev.style.display = 'block';
    empty.style.display = 'none';
    toast('Tanda tangan berhasil diupload', 'success');
  } catch (err) {
    if (prog) prog.style.display = 'none';
    toast('Gagal upload tanda tangan: ' + err.message, 'error');
  } finally {
    input.value = '';
  }
}

function clearTandaTanganUpload() {
  document.getElementById('ttdUploadUrl').value = '';
  const prev  = document.getElementById('ttdUploadPreview');
  const empty = document.getElementById('ttdUploadEmpty');
  prev.src = ''; prev.style.display = 'none';
  empty.style.display = 'flex';
  const fi = document.getElementById('ttdUploadFile');
  if (fi) fi.value = '';
}

async function saveTandaTanganUpload() {
  const ttdUrl = document.getElementById('ttdUploadUrl').value.trim();
  try {
    const r = await fetch(`/api/users/${_user.id}/tanda-tangan`, {
      method: 'PUT',
      headers: { ...authHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ tanda_tangan: ttdUrl }),
    });
    const d = await r.json().catch(() => ({}));
    if (!r.ok) { toast(d.error || 'Gagal menyimpan tanda tangan', 'error'); return; }
    _user.tanda_tangan = ttdUrl || null;
    sessionStorage.setItem('sapa_user', JSON.stringify(_user));
    toast('Tanda tangan berhasil disimpan', 'success');
    closeModal('modalTandaTangan');
    if (typeof renderEplanningPraTable === 'function') renderEplanningPraTable();
    if (typeof _epRefreshBtnTambah === 'function') _epRefreshBtnTambah();
  } catch (err) {
    toast('Gagal: ' + err.message, 'error');
  }
}

function openChangePassword() {
  document.getElementById('cpOld').value = '';
  document.getElementById('cpNew').value = '';
  document.getElementById('cpConfirm').value = '';
  document.getElementById('topbarDropdown')?.classList.remove('open');
  openModal('modalChangePassword');
}

function toggleCpEye(inputId, iconId) {
  const inp = document.getElementById(inputId);
  const isText = inp.type === 'text';
  inp.type = isText ? 'password' : 'text';
  const svg = document.getElementById(iconId);
  svg.innerHTML = isText
    ? '<path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path stroke-linecap="round" stroke-linejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/>'
    : '<path stroke-linecap="round" stroke-linejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"/>';
}

async function saveChangePassword() {
  const oldPw  = document.getElementById('cpOld').value;
  const newPw  = document.getElementById('cpNew').value;
  const confPw = document.getElementById('cpConfirm').value;
  if (!oldPw || !newPw || !confPw) { toast('Semua field wajib diisi', 'error'); return; }
  if (newPw.length < 6) { toast('Password baru minimal 6 karakter', 'error'); return; }
  if (newPw !== confPw) { toast('Konfirmasi password tidak cocok', 'error'); return; }
  if (newPw === oldPw)  { toast('Password baru tidak boleh sama dengan password lama', 'error'); return; }
  try {
    const r = await fetch('/api/auth/change-password', {
      method: 'POST', headers: authHeaders(),
      body: JSON.stringify({ password_lama: oldPw, password_baru: newPw }),
    });
    const d = await r.json();
    if (!r.ok) { toast(d.error || 'Gagal', 'error'); return; }
    toast('Password berhasil diubah');
    closeModal('modalChangePassword');
  } catch { toast('Gagal menyimpan password', 'error'); }
}

async function doLogout() {
  
  document.getElementById('topbarDropdown')?.classList.remove('open');
  const ok = await showConfirm({ title: 'Keluar dari Sistem', msg: 'Yakin ingin keluar? Sesi Anda akan diakhiri dan perlu login ulang untuk melanjutkan.', okText: 'Keluar', type: 'danger', icon: 'wave' });
  if (!ok) return;
  
  if (_refreshToken) {
    fetch('/api/auth/logout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh_token: _refreshToken }),
    }).catch(() => {});
  }
  sessionStorage.removeItem('sapa_token');
  sessionStorage.removeItem('sapa_refresh_token');
  sessionStorage.removeItem('sapa_user');
  try { sessionStorage.removeItem('sapa_nav'); } catch(e) {}
  location.reload();
}

let _periodeTimerInterval = null;
let _periodeTimerNotifFired = {};   

function _startPeriodeTimer() {
  
  if (_user?.is_admin) return;

  if (_periodeTimerInterval) clearInterval(_periodeTimerInterval);

  function _tick() {
    const bar = document.getElementById('periodeTimerBar');
    if (!bar) return;

    
    const periodeList = _periodeListTerbuka?.length
      ? _periodeListTerbuka
      : (_periodeAktif ? [_periodeAktif] : []);

    if (!periodeList.length) { bar.style.display = 'none'; return; }

    
    const now = Date.now();
    const aktif = periodeList
      .filter(p => p.close_at && new Date(p.close_at).getTime() > now)
      .sort((a, b) => new Date(a.close_at) - new Date(b.close_at));

    if (!aktif.length) { bar.style.display = 'none'; return; }

    const p      = aktif[0];
    const closeMs = new Date(p.close_at).getTime();
    const diff    = closeMs - now;

    if (diff <= 0) {
      bar.style.display = 'none';
      
      clearInterval(_periodeTimerInterval);
      _periodeTimerInterval = null;
      if (typeof initKinerjaControls === 'function') initKinerjaControls();
      return;
    }

    
    const totalSec = Math.floor(diff / 1000);
    const d  = Math.floor(totalSec / 86400);
    const h  = Math.floor((totalSec % 86400) / 3600);
    const m  = Math.floor((totalSec % 3600)  / 60);
    const s  = totalSec % 60;

    let label, color, bg, pulse = false;
    const pad = n => String(n).padStart(2, '0');

    if (d > 0) {
      label = `${d}h ${pad(h)}j ${pad(m)}m`;
      color = '#0f766e'; bg = 'rgba(15,118,110,.12)';
    } else if (h >= 2) {
      label = `${pad(h)}:${pad(m)}:${pad(s)}`;
      color = '#0f766e'; bg = 'rgba(15,118,110,.12)';
    } else if (h >= 1) {
      label = `${pad(h)}:${pad(m)}:${pad(s)}`;
      color = '#b45309'; bg = 'rgba(245,166,35,.15)';
      pulse = true;
    } else {
      label = `${pad(m)}:${pad(s)}`;
      color = '#b91c1c'; bg = 'rgba(239,68,68,.15)';
      pulse = true;
    }

    const BULAN_ID = ['','Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agu','Sep','Okt','Nov','Des'];
    const bulanLabel = BULAN_ID[p.bulan] || '';

    bar.style.display    = 'flex';
    bar.style.background = bg;
    bar.style.color      = color;
    bar.style.border     = `1px solid ${color}30`;
    bar.innerHTML = `
      <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5" style="flex-shrink:0">
        <path stroke-linecap="round" stroke-linejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
      </svg>
      <span style="opacity:.75;font-weight:500">${bulanLabel}</span>
      <span style="letter-spacing:.03em">${label}</span>`;

    if (pulse) {
      bar.style.animation = 'periodeTimerPulse 1.8s ease-in-out infinite';
    } else {
      bar.style.animation = '';
    }

    const key = p.id ?? (p.bulan + '-' + p.close_at);
    if (!_periodeTimerNotifFired[key]) _periodeTimerNotifFired[key] = {};

    if (!_periodeTimerNotifFired[key].h1 && diff <= 3600_000 && diff > 3540_000) {
      _periodeTimerNotifFired[key].h1 = true;
      toast(`⏰ Sisa 1 jam! Input periode ${bulanLabel} ${p.tahun || ''} ditutup pukul ${_fmtDT(p.close_at)}.`, 'warning');
    }
    
    if (!_periodeTimerNotifFired[key].m10 && diff <= 600_000 && diff > 540_000) {
      _periodeTimerNotifFired[key].m10 = true;
      toast(`⚠️ Sisa 10 menit! Segera selesaikan input periode ${bulanLabel} ${p.tahun || ''}.`, 'warning');
    }
  }

  _tick();
  _periodeTimerInterval = setInterval(_tick, 1000);
}

const MENUS = [
  {
    id: 'superlink', label: 'Superlink', icon: `<svg class="ic-line" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M13.0607 8.11097L14.4749 9.52518C17.2086 12.2589 17.2086 16.691 14.4749 19.4247L14.1214 19.7782C11.3877 22.5119 6.95555 22.5119 4.22188 19.7782C1.48821 17.0446 1.48821 12.6124 4.22188 9.87874L5.6361 11.293C3.68348 13.2456 3.68348 16.4114 5.6361 18.364C7.58872 20.3166 10.7545 20.3166 12.7072 18.364L13.0607 18.0105C15.0133 16.0578 15.0133 12.892 13.0607 10.9394L11.6465 9.52518L13.0607 8.11097ZM19.7782 14.1214L18.364 12.7072C20.3166 10.7545 20.3166 7.58872 18.364 5.6361C16.4114 3.68348 13.2456 3.68348 11.293 5.6361L10.9394 5.98965C8.98678 7.94227 8.98678 11.1081 10.9394 13.0607L12.3536 14.4749L10.9394 15.8891L9.52518 14.4749C6.79151 11.7413 6.79151 7.30911 9.52518 4.57544L9.87874 4.22188C12.6124 1.48821 17.0446 1.48821 19.7782 4.22188C22.5119 6.95555 22.5119 11.3877 19.7782 14.1214Z"/></svg><svg class="ic-fill" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M13.0607 8.11097L14.4749 9.52518C17.2086 12.2589 17.2086 16.691 14.4749 19.4247L14.1214 19.7782C11.3877 22.5119 6.95555 22.5119 4.22188 19.7782C1.48821 17.0446 1.48821 12.6124 4.22188 9.87874L5.6361 11.293C3.68348 13.2456 3.68348 16.4114 5.6361 18.364C7.58872 20.3166 10.7545 20.3166 12.7072 18.364L13.0607 18.0105C15.0133 16.0578 15.0133 12.892 13.0607 10.9394L11.6465 9.52518L13.0607 8.11097ZM19.7782 14.1214L18.364 12.7072C20.3166 10.7545 20.3166 7.58872 18.364 5.6361C16.4114 3.68348 13.2456 3.68348 11.293 5.6361L10.9394 5.98965C8.98678 7.94227 8.98678 11.1081 10.9394 13.0607L12.3536 14.4749L10.9394 15.8891L9.52518 14.4749C6.79151 11.7413 6.79151 7.30911 9.52518 4.57544L9.87874 4.22188C12.6124 1.48821 17.0446 1.48821 19.7782 4.22188C22.5119 6.95555 22.5119 11.3877 19.7782 14.1214Z"/></svg>`,
    children: [
      { id: 'dashboard-superlink', key: null, showIf: () => _user.is_admin || hasAccess('superlink.link') || hasAccess('superlink.shortlink') || hasAccess('superlink.bundle'), label: 'Dashboard', page: 'page-dashboard-superlink', loader: () => loadDashboardSuperlink(), icon: `<svg class="ic-line" xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M14 21C13.4477 21 13 20.5523 13 20V12C13 11.4477 13.4477 11 14 11H20C20.5523 11 21 11.4477 21 12V20C21 20.5523 20.5523 21 20 21H14ZM4 13C3.44772 13 3 12.5523 3 12V4C3 3.44772 3.44772 3 4 3H10C10.5523 3 11 3.44772 11 4V12C11 12.5523 10.5523 13 10 13H4ZM9 11V5H5V11H9ZM4 21C3.44772 21 3 20.5523 3 20V16C3 15.4477 3.44772 15 4 15H10C10.5523 15 11 15.4477 11 16V20C11 20.5523 10.5523 21 10 21H4ZM5 19H9V17H5V19ZM15 19H19V13H15V19ZM13 4C13 3.44772 13.4477 3 14 3H20C20.5523 3 21 3.44772 21 4V8C21 8.55228 20.5523 9 20 9H14C13.4477 9 13 8.55228 13 8V4ZM15 5V7H19V5H15Z"/></svg><svg class="ic-fill" xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M3 12C3 12.5523 3.44772 13 4 13H10C10.5523 13 11 12.5523 11 12V4C11 3.44772 10.5523 3 10 3H4C3.44772 3 3 3.44772 3 4V12ZM3 20C3 20.5523 3.44772 21 4 21H10C10.5523 21 11 20.5523 11 20V16C11 15.4477 10.5523 15 10 15H4C3.44772 15 3 15.4477 3 16V20ZM13 20C13 20.5523 13.4477 21 14 21H20C20.5523 21 21 20.5523 21 20V12C21 11.4477 20.5523 11 20 11H14C13.4477 11 13 11.4477 13 12V20ZM14 3C13.4477 3 13 3.44772 13 4V8C13 8.55228 13.4477 9 14 9H20C20.5523 9 21 8.55228 21 8V4C21 3.44772 20.5523 3 20 3H14Z"/></svg>` },
      { id: 'shortlink', key: null, showIf: () => _user.is_admin || hasAccess('superlink.link') || hasAccess('superlink.shortlink'), label: 'Shortlink', page: 'page-shortlink',  loader: () => loadShortlinks(), icon: `<svg class="ic-line" xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M10 6V8H5V19H16V14H18V20C18 20.5523 17.5523 21 17 21H4C3.44772 21 3 20.5523 3 20V7C3 6.44772 3.44772 6 4 6H10ZM21 3V11H19L18.9999 6.413L11.2071 14.2071L9.79289 12.7929L17.5849 5H13V3H21Z"/></svg><svg class="ic-fill" xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M10 6V8H5V19H16V14H18V20C18 20.5523 17.5523 21 17 21H4C3.44772 21 3 20.5523 3 20V7C3 6.44772 3.44772 6 4 6H10ZM21 3V12L17.206 8.207L11.2071 14.2071L9.79289 12.7929L15.792 6.793L12 3H21Z"/></svg>` },
      { id: 'bundle',    key: 'superlink.bundle',     label: 'Bundle',    page: 'page-bundle',     loader: () => loadBundles(),    icon: `<svg class="ic-line" xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M20.0833 15.1999L21.2854 15.9212C21.5221 16.0633 21.5989 16.3704 21.4569 16.6072C21.4146 16.6776 21.3557 16.7365 21.2854 16.7787L12.5144 22.0412C12.1977 22.2313 11.8021 22.2313 11.4854 22.0412L2.71451 16.7787C2.47772 16.6366 2.40093 16.3295 2.54301 16.0927C2.58523 16.0223 2.64413 15.9634 2.71451 15.9212L3.9166 15.1999L11.9999 20.0499L20.0833 15.1999ZM20.0833 10.4999L21.2854 11.2212C21.5221 11.3633 21.5989 11.6704 21.4569 11.9072C21.4146 11.9776 21.3557 12.0365 21.2854 12.0787L11.9999 17.6499L2.71451 12.0787C2.47772 11.9366 2.40093 11.6295 2.54301 11.3927C2.58523 11.3223 2.64413 11.2634 2.71451 11.2212L3.9166 10.4999L11.9999 15.3499L20.0833 10.4999ZM12.5144 1.30864L21.2854 6.5712C21.5221 6.71327 21.5989 7.0204 21.4569 7.25719C21.4146 7.32757 21.3557 7.38647 21.2854 7.42869L11.9999 12.9999L2.71451 7.42869C2.47772 7.28662 2.40093 6.97949 2.54301 6.7427C2.58523 6.67232 2.64413 6.61343 2.71451 6.5712L11.4854 1.30864C11.8021 1.11864 12.1977 1.11864 12.5144 1.30864ZM11.9999 3.33233L5.88723 6.99995L11.9999 10.6676L18.1126 6.99995L11.9999 3.33233Z"/></svg><svg class="ic-fill" xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M20.0833 10.4999L21.2854 11.2212C21.5221 11.3633 21.5989 11.6704 21.4569 11.9072C21.4146 11.9776 21.3557 12.0365 21.2854 12.0787L11.9999 17.6499L2.71451 12.0787C2.47772 11.9366 2.40093 11.6295 2.54301 11.3927C2.58523 11.3223 2.64413 11.2634 2.71451 11.2212L3.9166 10.4999L11.9999 15.3499L20.0833 10.4999ZM20.0833 15.1999L21.2854 15.9212C21.5221 16.0633 21.5989 16.3704 21.4569 16.6072C21.4146 16.6776 21.3557 16.7365 21.2854 16.7787L12.5144 22.0412C12.1977 22.2313 11.8021 22.2313 11.4854 22.0412L2.71451 16.7787C2.47772 16.6366 2.40093 16.3295 2.54301 16.0927C2.58523 16.0223 2.64413 15.9634 2.71451 15.9212L3.9166 15.1999L11.9999 20.0499L20.0833 15.1999ZM12.5144 1.30864L21.2854 6.5712C21.5221 6.71327 21.5989 7.0204 21.4569 7.25719C21.4146 7.32757 21.3557 7.38647 21.2854 7.42869L11.9999 12.9999L2.71451 7.42869C2.47772 7.28662 2.40093 6.97949 2.54301 6.7427C2.58523 6.67232 2.64413 6.61343 2.71451 6.5712L11.4854 1.30864C11.8021 1.11864 12.1977 1.11864 12.5144 1.30864Z"/></svg>` },

    ],
  },
  {
    id: 'surat', label: 'Surat', icon: `<svg class="ic-line" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M3 3H21C21.5523 3 22 3.44772 22 4V20C22 20.5523 21.5523 21 21 21H3C2.44772 21 2 20.5523 2 20V4C2 3.44772 2.44772 3 3 3ZM20 7.23792L12.0718 14.338L4 7.21594V19H20V7.23792ZM4.51146 5L12.0619 11.662L19.501 5H4.51146Z"/></svg><svg class="ic-fill" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M3 3H21C21.5523 3 22 3.44772 22 4V20C22 20.5523 21.5523 21 21 21H3C2.44772 21 2 20.5523 2 20V4C2 3.44772 2.44772 3 3 3ZM12.0606 11.6829L5.64722 6.2377L4.35278 7.7623L12.0731 14.3171L19.6544 7.75616L18.3456 6.24384L12.0606 11.6829Z"/></svg>`,
    children: [
      { id: 'dashboard-surat', key: null, showIf: () => _user.is_admin || hasAccess('surat.masuk') || hasAccess('surat.keluar'), label: 'Dashboard', page: 'page-dashboard-surat', loader: () => loadDashboardSurat(), icon: `<svg class="ic-line" xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M14 21C13.4477 21 13 20.5523 13 20V12C13 11.4477 13.4477 11 14 11H20C20.5523 11 21 11.4477 21 12V20C21 20.5523 20.5523 21 20 21H14ZM4 13C3.44772 13 3 12.5523 3 12V4C3 3.44772 3.44772 3 4 3H10C10.5523 3 11 3.44772 11 4V12C11 12.5523 10.5523 13 10 13H4ZM9 11V5H5V11H9ZM4 21C3.44772 21 3 20.5523 3 20V16C3 15.4477 3.44772 15 4 15H10C10.5523 15 11 15.4477 11 16V20C11 20.5523 10.5523 21 10 21H4ZM5 19H9V17H5V19ZM15 19H19V13H15V19ZM13 4C13 3.44772 13.4477 3 14 3H20C20.5523 3 21 3.44772 21 4V8C21 8.55228 20.5523 9 20 9H14C13.4477 9 13 8.55228 13 8V4ZM15 5V7H19V5H15Z"/></svg><svg class="ic-fill" xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M3 12C3 12.5523 3.44772 13 4 13H10C10.5523 13 11 12.5523 11 12V4C11 3.44772 10.5523 3 10 3H4C3.44772 3 3 3.44772 3 4V12ZM3 20C3 20.5523 3.44772 21 4 21H10C10.5523 21 11 20.5523 11 20V16C11 15.4477 10.5523 15 10 15H4C3.44772 15 3 15.4477 3 16V20ZM13 20C13 20.5523 13.4477 21 14 21H20C20.5523 21 21 20.5523 21 20V12C21 11.4477 20.5523 11 20 11H14C13.4477 11 13 11.4477 13 12V20ZM14 3C13.4477 3 13 3.44772 13 4V8C13 8.55228 13.4477 9 14 9H20C20.5523 9 21 8.55228 21 8V4C21 3.44772 20.5523 3 20 3H14Z"/></svg>` },
      { id: 'surat-masuk',  key: 'surat.masuk',  label: 'Surat Masuk',  page: 'page-surat-masuk',  loader: () => loadSuratMasuk(1),  icon: `<svg class="ic-line" xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M21 3C21.5523 3 22 3.44772 22 4V20C22 20.5523 21.5523 21 21 21H3C2.44772 21 2 20.5523 2 20V4C2 3.44772 2.44772 3 3 3H21ZM7.41604 14H4V19H20V14H16.584C15.8124 15.7659 14.0503 17 12 17C9.94968 17 8.1876 15.7659 7.41604 14ZM20 5H4V12H9C9 13.6569 10.3431 15 12 15C13.6569 15 15 13.6569 15 12H20V5Z"/></svg><svg class="ic-fill" xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M3 3H21C21.5523 3 22 3.44772 22 4V20C22 20.5523 21.5523 21 21 21H3C2.44772 21 2 20.5523 2 20V4C2 3.44772 2.44772 3 3 3ZM9 12C9 13.6569 10.3431 15 12 15C13.6569 15 15 13.6569 15 12H20V5H4V12H9Z"/></svg>` },
      { id: 'surat-keluar', key: 'surat.keluar', label: 'Surat Keluar', page: 'page-surat-keluar', loader: () => loadSuratKeluar(1), icon: `<svg class="ic-line" xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M21.7267 2.95694L16.2734 22.0432C16.1225 22.5716 15.7979 22.5956 15.5563 22.1126L11 13L1.9229 9.36919C1.41322 9.16532 1.41953 8.86022 1.95695 8.68108L21.0432 2.31901C21.5716 2.14285 21.8747 2.43866 21.7267 2.95694ZM19.0353 5.09647L6.81221 9.17085L12.4488 11.4255L15.4895 17.5068L19.0353 5.09647Z"/></svg><svg class="ic-fill" xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M1.94607 9.31543C1.42353 9.14125 1.4194 8.86022 1.95682 8.68108L21.043 2.31901C21.5715 2.14285 21.8746 2.43866 21.7265 2.95694L16.2733 22.0432C16.1223 22.5716 15.8177 22.59 15.5944 22.0876L11.9999 14L17.9999 6.00005L9.99992 12L1.94607 9.31543Z"/></svg>` },
      { id: 'laporan-surat', key: 'surat.masuk', label: 'Laporan', page: 'page-laporan-surat', loader: () => loadLaporanSurat(), icon: `<svg class="ic-line" xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M11 7H13V17H11V7ZM15 11H17V17H15V11ZM7 13H9V17H7V13ZM15 4H5V20H19V8H15V4ZM3 2.9918C3 2.44405 3.44749 2 3.9985 2H16L20.9997 7L21 20.9925C21 21.5489 20.5551 22 20.0066 22H3.9934C3.44476 22 3 21.5447 3 21.0082V2.9918Z"/></svg><svg class="ic-fill" xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M16 2L21 7V21.0082C21 21.556 20.5551 22 20.0066 22H3.9934C3.44476 22 3 21.5447 3 21.0082V2.9918C3 2.44405 3.44495 2 3.9934 2H16ZM11 7V17H13V7H11ZM15 11V17H17V11H15ZM7 13V17H9V13H7Z"/></svg>` },
    ],
  },
  {
    id: 'absensi', label: 'Absenku', icon: `<svg class="ic-line" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M9 1V3H15V1H17V3H21C21.5523 3 22 3.44772 22 4V20C22 20.5523 21.5523 21 21 21H3C2.44772 21 2 20.5523 2 20V4C2 3.44772 2.44772 3 3 3H7V1H9ZM20 10H4V19H20V10ZM15.0355 11.136L16.4497 12.5503L11.5 17.5L7.96447 13.9645L9.37868 12.5503L11.5 14.6716L15.0355 11.136ZM7 5H4V8H20V5H17V6H15V5H9V6H7V5Z"/></svg><svg class="ic-fill" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M9 1V3H15V1H17V3H21C21.5523 3 22 3.44772 22 4V20C22 20.5523 21.5523 21 21 21H3C2.44772 21 2 20.5523 2 20V4C2 3.44772 2.44772 3 3 3H7V1H9ZM20 8H4V19H20V8ZM15.0355 10.136L16.4497 11.5503L11.5 16.5L7.96447 12.9645L9.37868 11.5503L11.5 13.6716L15.0355 10.136Z"/></svg>`,
    children: [
      { id: 'dashboard-absensi', key: null, showIf: () => _user.is_admin || hasAccess('absensi') || hasAccess('absensi.full'), label: 'Dashboard', page: 'page-dashboard-absensi', loader: () => loadDashboardAbsensi(), icon: `<svg class="ic-line" xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M14 21C13.4477 21 13 20.5523 13 20V12C13 11.4477 13.4477 11 14 11H20C20.5523 11 21 11.4477 21 12V20C21 20.5523 20.5523 21 20 21H14ZM4 13C3.44772 13 3 12.5523 3 12V4C3 3.44772 3.44772 3 4 3H10C10.5523 3 11 3.44772 11 4V12C11 12.5523 10.5523 13 10 13H4ZM9 11V5H5V11H9ZM4 21C3.44772 21 3 20.5523 3 20V16C3 15.4477 3.44772 15 4 15H10C10.5523 15 11 15.4477 11 16V20C11 20.5523 10.5523 21 10 21H4ZM5 19H9V17H5V19ZM15 19H19V13H15V19ZM13 4C13 3.44772 13.4477 3 14 3H20C20.5523 3 21 3.44772 21 4V8C21 8.55228 20.5523 9 20 9H14C13.4477 9 13 8.55228 13 8V4ZM15 5V7H19V5H15Z"/></svg><svg class="ic-fill" xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M3 12C3 12.5523 3.44772 13 4 13H10C10.5523 13 11 12.5523 11 12V4C11 3.44772 10.5523 3 10 3H4C3.44772 3 3 3.44772 3 4V12ZM3 20C3 20.5523 3.44772 21 4 21H10C10.5523 21 11 20.5523 11 20V16C11 15.4477 10.5523 15 10 15H4C3.44772 15 3 15.4477 3 16V20ZM13 20C13 20.5523 13.4477 21 14 21H20C20.5523 21 21 20.5523 21 20V12C21 11.4477 20.5523 11 20 11H14C13.4477 11 13 11.4477 13 12V20ZM14 3C13.4477 3 13 3.44772 13 4V8C13 8.55228 13.4477 9 14 9H20C20.5523 9 21 8.55228 21 8V4C21 3.44772 20.5523 3 20 3H14Z"/></svg>` },
      { id: 'absensi-harian', key: null, showIf: () => _user.is_admin || hasAccess('absensi') || hasAccess('absensi.full'), label: 'Absensi', page: 'page-absensi', loader: () => loadAbsensi(), icon: `<svg class="ic-line" xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M17.0003 13V14C17.0003 16.7696 16.3364 19.445 15.0853 21.8455L14.8585 22.2663L13.1116 21.2924C14.2716 19.2115 14.9211 16.8817 14.9935 14.4559L15.0003 14V13H17.0003ZM11.0003 10H13.0003V14L12.9948 14.3787C12.9153 17.1495 11.9645 19.7731 10.3038 21.928L10.073 22.2189L8.52406 20.9536C10.0408 19.0969 10.9145 16.8017 10.9943 14.3663L11.0003 14V10ZM12.0003 6C14.7617 6 17.0003 8.23858 17.0003 11H15.0003C15.0003 9.34315 13.6571 8 12.0003 8C10.3434 8 9.00025 9.34315 9.00025 11V14C9.00025 16.2354 8.1806 18.3444 6.72928 19.9768L6.51767 20.2067L5.06955 18.8273C6.23328 17.6056 6.92099 16.0118 6.99381 14.3027L7.00025 14V11C7.00025 8.23858 9.23883 6 12.0003 6ZM12.0003 2C16.9708 2 21.0003 6.02944 21.0003 11V14C21.0003 15.6979 20.7985 17.3699 20.4035 18.9903L20.2647 19.5285L18.3349 19.0032C18.726 17.5662 18.9475 16.0808 18.9919 14.5684L19.0003 14V11C19.0003 7.13401 15.8662 4 12.0003 4C10.4279 4 8.97663 4.51841 7.80805 5.39364L6.38308 3.96769C7.92267 2.73631 9.87547 2 12.0003 2ZM4.96794 5.38282L6.39389 6.8078C5.5635 7.91652 5.0543 9.27971 5.00431 10.7593L4.99961 10.999L5.00378 13C5.00378 14.1195 4.73991 15.2026 4.24263 16.1772L4.08648 16.4663L2.34961 15.4747C2.72889 14.8103 2.95077 14.0681 2.99539 13.2924L3.00378 13L3.00361 11C3.00025 8.87522 3.73656 6.92242 4.96794 5.38282Z"/></svg><svg class="ic-fill" xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M17.0003 13V14C17.0003 16.7696 16.3364 19.445 15.0853 21.8455L14.8585 22.2663L13.1116 21.2924C14.2716 19.2115 14.9211 16.8817 14.9935 14.4559L15.0003 14V13H17.0003ZM11.0003 10H13.0003V14L12.9948 14.3787C12.9153 17.1495 11.9645 19.7731 10.3038 21.928L10.073 22.2189L8.52406 20.9536C10.0408 19.0969 10.9145 16.8017 10.9943 14.3663L11.0003 14V10ZM12.0003 6C14.7617 6 17.0003 8.23858 17.0003 11H15.0003C15.0003 9.34315 13.6571 8 12.0003 8C10.3434 8 9.00025 9.34315 9.00025 11V14C9.00025 16.2354 8.1806 18.3444 6.72928 19.9768L6.51767 20.2067L5.06955 18.8273C6.23328 17.6056 6.92099 16.0118 6.99381 14.3027L7.00025 14V11C7.00025 8.23858 9.23883 6 12.0003 6ZM12.0003 2C16.9708 2 21.0003 6.02944 21.0003 11V14C21.0003 15.6979 20.7985 17.3699 20.4035 18.9903L20.2647 19.5285L18.3349 19.0032C18.726 17.5662 18.9475 16.0808 18.9919 14.5684L19.0003 14V11C19.0003 7.13401 15.8662 4 12.0003 4C10.4279 4 8.97663 4.51841 7.80805 5.39364L6.38308 3.96769C7.92267 2.73631 9.87547 2 12.0003 2ZM4.96794 5.38282L6.39389 6.8078C5.5635 7.91652 5.0543 9.27971 5.00431 10.7593L4.99961 10.999L5.00378 13C5.00378 14.1195 4.73991 15.2026 4.24263 16.1772L4.08648 16.4663L2.34961 15.4747C2.72889 14.8103 2.95077 14.0681 2.99539 13.2924L3.00378 13L3.00361 11C3.00025 8.87522 3.73656 6.92242 4.96794 5.38282Z"/></svg>` },
      { id: 'laporan-absensi', key: null, showIf: () => _user.is_admin || hasAccess('absensi') || hasAccess('absensi.full'), label: 'Laporan', page: 'page-laporan-absensi', loader: () => loadLaporanAbsensi(), icon: `<svg class="ic-line" xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M11 7H13V17H11V7ZM15 11H17V17H15V11ZM7 13H9V17H7V13ZM15 4H5V20H19V8H15V4ZM3 2.9918C3 2.44405 3.44749 2 3.9985 2H16L20.9997 7L21 20.9925C21 21.5489 20.5551 22 20.0066 22H3.9934C3.44476 22 3 21.5447 3 21.0082V2.9918Z"/></svg><svg class="ic-fill" xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M16 2L21 7V21.0082C21 21.556 20.5551 22 20.0066 22H3.9934C3.44476 22 3 21.5447 3 21.0082V2.9918C3 2.44405 3.44495 2 3.9934 2H16ZM11 7V17H13V7H11ZM15 11V17H17V11H15ZM7 13V17H9V13H7Z"/></svg>` },
    ],
  },
  {
    id: 'lembur', label: 'Lembur', icon: `<svg class="ic-line" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M10 6C10 10.4183 13.5817 14 18 14C19.4386 14 20.7885 13.6203 21.9549 12.9556C21.4738 18.0302 17.2005 22 12 22C6.47715 22 2 17.5228 2 12C2 6.79948 5.9698 2.52616 11.0444 2.04507C10.3797 3.21152 10 4.56142 10 6ZM4 12C4 16.4183 7.58172 20 12 20C14.9654 20 17.5757 18.3788 18.9571 15.9546C18.6407 15.9848 18.3214 16 18 16C12.4772 16 8 11.5228 8 6C8 5.67863 8.01524 5.35933 8.04536 5.04293C5.62119 6.42426 4 9.03458 4 12ZM18.1642 2.29104L19 2.5V3.5L18.1642 3.70896C17.4476 3.8881 16.8881 4.4476 16.709 5.16417L16.5 6H15.5L15.291 5.16417C15.1119 4.4476 14.5524 3.8881 13.8358 3.70896L13 3.5V2.5L13.8358 2.29104C14.5524 2.1119 15.1119 1.5524 15.291 0.835829L15.5 0H16.5L16.709 0.835829C16.8881 1.5524 17.4476 2.1119 18.1642 2.29104ZM23.1642 7.29104L24 7.5V8.5L23.1642 8.70896C22.4476 8.8881 21.8881 9.4476 21.709 10.1642L21.5 11H20.5L20.291 10.1642C20.1119 9.4476 19.5524 8.8881 18.8358 8.70896L18 8.5V7.5L18.8358 7.29104C19.5524 7.1119 20.1119 6.5524 20.291 5.83583L20.5 5H21.5L21.709 5.83583C21.8881 6.5524 22.4476 7.1119 23.1642 7.29104Z"/></svg><svg class="ic-fill" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M9.8216 2.23796C9.29417 3.38265 9 4.65697 9 6C9 10.9706 13.0294 15 18 15C19.343 15 20.6174 14.7058 21.762 14.1784C20.7678 18.6537 16.7747 22 12 22C6.47715 22 2 17.5228 2 12C2 7.22532 5.3463 3.23221 9.8216 2.23796ZM18.1642 2.29104L19 2.5V3.5L18.1642 3.70896C17.4476 3.8881 16.8881 4.4476 16.709 5.16417L16.5 6H15.5L15.291 5.16417C15.1119 4.4476 14.5524 3.8881 13.8358 3.70896L13 3.5V2.5L13.8358 2.29104C14.5524 2.1119 15.1119 1.5524 15.291 0.835829L15.5 0H16.5L16.709 0.835829C16.8881 1.5524 17.4476 2.1119 18.1642 2.29104ZM23.1642 7.29104L24 7.5V8.5L23.1642 8.70896C22.4476 8.8881 21.8881 9.4476 21.709 10.1642L21.5 11H20.5L20.291 10.1642C20.1119 9.4476 19.5524 8.8881 18.8358 8.70896L18 8.5V7.5L18.8358 7.29104C19.5524 7.1119 20.1119 6.5524 20.291 5.83583L20.5 5H21.5L21.709 5.83583C21.8881 6.5524 22.4476 7.1119 23.1642 7.29104Z"/></svg>`,
    children: [
      { id: 'dashboard-lembur', key: null, showIf: () => _user.is_admin || hasAccess('lembur') || hasAccess('lembur.full'), label: 'Dashboard', page: 'page-dashboard-lembur', loader: () => loadDashboardLembur(), icon: `<svg class="ic-line" xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M14 21C13.4477 21 13 20.5523 13 20V12C13 11.4477 13.4477 11 14 11H20C20.5523 11 21 11.4477 21 12V20C21 20.5523 20.5523 21 20 21H14ZM4 13C3.44772 13 3 12.5523 3 12V4C3 3.44772 3.44772 3 4 3H10C10.5523 3 11 3.44772 11 4V12C11 12.5523 10.5523 13 10 13H4ZM9 11V5H5V11H9ZM4 21C3.44772 21 3 20.5523 3 20V16C3 15.4477 3.44772 15 4 15H10C10.5523 15 11 15.4477 11 16V20C11 20.5523 10.5523 21 10 21H4ZM5 19H9V17H5V19ZM15 19H19V13H15V19ZM13 4C13 3.44772 13.4477 3 14 3H20C20.5523 3 21 3.44772 21 4V8C21 8.55228 20.5523 9 20 9H14C13.4477 9 13 8.55228 13 8V4ZM15 5V7H19V5H15Z"/></svg><svg class="ic-fill" xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M3 12C3 12.5523 3.44772 13 4 13H10C10.5523 13 11 12.5523 11 12V4C11 3.44772 10.5523 3 10 3H4C3.44772 3 3 3.44772 3 4V12ZM3 20C3 20.5523 3.44772 21 4 21H10C10.5523 21 11 20.5523 11 20V16C11 15.4477 10.5523 15 10 15H4C3.44772 15 3 15.4477 3 16V20ZM13 20C13 20.5523 13.4477 21 14 21H20C20.5523 21 21 20.5523 21 20V12C21 11.4477 20.5523 11 20 11H14C13.4477 11 13 11.4477 13 12V20ZM14 3C13.4477 3 13 3.44772 13 4V8C13 8.55228 13.4477 9 14 9H20C20.5523 9 21 8.55228 21 8V4C21 3.44772 20.5523 3 20 3H14Z"/></svg>` },
      { id: 'lembur-kegiatan', key: null, showIf: () => _user.is_admin || hasAccess('lembur') || hasAccess('lembur.full'), label: 'Kegiatan Lembur', page: 'page-lembur-kegiatan', loader: () => loadLemburKegiatan(), icon: `<svg class="ic-line" xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M3 3H21C21.5523 3 22 3.44772 22 4V20C22 20.5523 21.5523 21 21 21H3C2.44772 21 2 20.5523 2 20V4C2 3.44772 2.44772 3 3 3ZM4 5V19H20V5H4ZM6 8H18V10H6V8ZM6 12H14V14H6V12Z"/></svg><svg class="ic-fill" xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M3 3H21C21.5523 3 22 3.44772 22 4V20C22 20.5523 21.5523 21 21 21H3C2.44772 21 2 20.5523 2 20V4C2 3.44772 2.44772 3 3 3ZM6 8V10H18V8H6ZM6 12V14H14V12H6Z"/></svg>` },
      { id: 'laporan-lembur', key: null, showIf: () => _user.is_admin || hasAccess('lembur') || hasAccess('lembur.full'), label: 'Laporan', page: 'page-laporan-lembur', loader: () => loadLaporanLembur(), icon: `<svg class="ic-line" xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M11 7H13V17H11V7ZM15 11H17V17H15V11ZM7 13H9V17H7V13ZM15 4H5V20H19V8H15V4ZM3 2.9918C3 2.44405 3.44749 2 3.9985 2H16L20.9997 7L21 20.9925C21 21.5489 20.5551 22 20.0066 22H3.9934C3.44476 22 3 21.5447 3 21.0082V2.9918Z"/></svg><svg class="ic-fill" xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M16 2L21 7V21.0082C21 21.556 20.5551 22 20.0066 22H3.9934C3.44476 22 3 21.5447 3 21.0082V2.9918C3 2.44405 3.44495 2 3.9934 2H16ZM11 7V17H13V7H11ZM15 11V17H17V11H15ZM7 13V17H9V13H7Z"/></svg>` },
    ],
  },
  {
    id: 'kinerja', label: 'Kinerja', icon: `<svg class="ic-line" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M5 3V19H21V21H3V3H5ZM20.2929 6.29289L21.7071 7.70711L16 13.4142L13 10.415L8.70711 14.7071L7.29289 13.2929L13 7.58579L16 10.585L20.2929 6.29289Z"/></svg><svg class="ic-fill" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M5 3V19H21V21H3V3H5ZM19.9393 5.93934L22.0607 8.06066L16 14.1213L13 11.121L9.06066 15.0607L6.93934 12.9393L13 6.87868L16 9.879L19.9393 5.93934Z"/></svg>`,
    children: [
      { id: 'dashboard-kinerja', key: null, showIf: () => _user.is_admin || _hasMonevIndikator || _hasIkkIndikator || _hasSpmIndikator, label: 'Dashboard', page: 'page-dashboard-kinerja', loader: () => loadDashboardKinerja(), icon: `<svg class="ic-line" xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M14 21C13.4477 21 13 20.5523 13 20V12C13 11.4477 13.4477 11 14 11H20C20.5523 11 21 11.4477 21 12V20C21 20.5523 20.5523 21 20 21H14ZM4 13C3.44772 13 3 12.5523 3 12V4C3 3.44772 3.44772 3 4 3H10C10.5523 3 11 3.44772 11 4V12C11 12.5523 10.5523 13 10 13H4ZM9 11V5H5V11H9ZM4 21C3.44772 21 3 20.5523 3 20V16C3 15.4477 3.44772 15 4 15H10C10.5523 15 11 15.4477 11 16V20C11 20.5523 10.5523 21 10 21H4ZM5 19H9V17H5V19ZM15 19H19V13H15V19ZM13 4C13 3.44772 13.4477 3 14 3H20C20.5523 3 21 3.44772 21 4V8C21 8.55228 20.5523 9 20 9H14C13.4477 9 13 8.55228 13 8V4ZM15 5V7H19V5H15Z"/></svg><svg class="ic-fill" xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M3 12C3 12.5523 3.44772 13 4 13H10C10.5523 13 11 12.5523 11 12V4C11 3.44772 10.5523 3 10 3H4C3.44772 3 3 3.44772 3 4V12ZM3 20C3 20.5523 3.44772 21 4 21H10C10.5523 21 11 20.5523 11 20V16C11 15.4477 10.5523 15 10 15H4C3.44772 15 3 15.4477 3 16V20ZM13 20C13 20.5523 13.4477 21 14 21H20C20.5523 21 21 20.5523 21 20V12C21 11.4477 20.5523 11 20 11H14C13.4477 11 13 11.4477 13 12V20ZM14 3C13.4477 3 13 3.44772 13 4V8C13 8.55228 13.4477 9 14 9H20C20.5523 9 21 8.55228 21 8V4C21 3.44772 20.5523 3 20 3H14Z"/></svg>` },
      { id: 'monev-kinerja', key: null, showIf: () => _hasMonevIndikator, label: 'IKU (Indikator Kinerja Utama)', page: 'page-kinerja', loader: () => { initKinerjaControls().then(() => loadKinerjaRekap()); }, icon: `<svg class="ic-line" xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="2"/><circle cx="12" cy="12" r="5" stroke="currentColor" stroke-width="2"/><circle cx="12" cy="12" r="1.5" fill="currentColor"/></svg><svg class="ic-fill" xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="3"/><circle cx="12" cy="12" r="4.5" fill="currentColor"/></svg>` },
      { id: 'realisasi-ikk', key: null, showIf: () => _hasIkkIndikator, label: 'IKK (Indikator Kinerja Kunci)', page: 'page-realisasi-ikk', loader: () => { initIkkControls().then(() => loadIkkRekap()); }, icon: `<svg class="ic-line" xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M7.2,11.5 V8.3 A4.8,4.8 0 0,1 16.8,8.3 V11.5" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/><path d="M6.1,9.5 H17.9 A1.6,1.6 0 0,1 19.5,11.1 V20.4 A1.6,1.6 0 0,1 17.9,22 H6.1 A1.6,1.6 0 0,1 4.5,20.4 V11.1 A1.6,1.6 0 0,1 6.1,9.5 Z" fill="none" stroke="currentColor" stroke-width="1.5"/><path fill-rule="evenodd" clip-rule="evenodd" d="M13.4,14.6 A1.4,1.4 0 1,0 10.6,14.6 A1.4,1.4 0 1,0 13.4,14.6 Z M11.3,15.7 H12.7 L13.2,19 H10.8 Z"/></svg><svg class="ic-fill" xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path fill-rule="evenodd" clip-rule="evenodd" d="M7.2,11.5 L7.2,8.3 A4.8,4.8 0 0 1 16.8,8.3 L16.8,11.5 L14.9,11.5 L14.9,8.3 A2.9,2.9 0 0 0 9.1,8.3 L9.1,11.5 Z M4.5,10.8 A1.6,1.6 0 0,1 6.1,9.2 H17.9 A1.6,1.6 0 0,1 19.5,10.8 V20.4 A1.6,1.6 0 0,1 17.9,22 H6.1 A1.6,1.6 0 0,1 4.5,20.4 Z M13.4,14.6 A1.4,1.4 0 1,0 10.6,14.6 A1.4,1.4 0 1,0 13.4,14.6 Z M11.3,15.7 H12.7 L13.2,19 H10.8 Z"/></svg>` },
      { id: 'spm-kinerja', key: null, showIf: () => _hasSpmIndikator, label: 'Indikator SPM (Standar Pelayanan Minimal)', page: 'page-spm', loader: () => { initSpmControls().then(() => loadSpmRekap()); }, icon: `<svg class="ic-line" xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M12 2L4 5V11C4 16.5 7.5 21.26 12 22.5C16.5 21.26 20 16.5 20 11V5L12 2Z" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/><path d="M8.5 12L10.75 14.25L15.5 9.5" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg><svg class="ic-fill" xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2L4 5V11C4 16.5 7.5 21.26 12 22.5C16.5 21.26 20 16.5 20 11V5L12 2ZM16.2071 10.2071L11.4571 14.9571C11.0666 15.3476 10.4334 15.3476 10.0429 14.9571L7.79289 12.7071C7.40237 12.3166 7.40237 11.6834 7.79289 11.2929C8.18342 10.9024 8.81658 10.9024 9.20711 11.2929L10.75 12.8358L14.7929 8.79289C15.1834 8.40237 15.8166 8.40237 16.2071 8.79289C16.5976 9.18342 16.5976 9.81658 16.2071 10.2071Z"/></svg>` },
      { id: 'monitoring-kinerja', key: null, adminOnly: true, label: 'Monitoring Pengisian', page: 'page-monitoring-kinerja', loader: () => initMonitoringKinerja(), icon: `<svg class="ic-line" xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M12.5065 3.62326L11.4835 5.39501C8.57378 4.51629 5.96968 4.94531 5.07207 6.50001C3.89477 8.53915 5.86239 12.1524 9.75027 14.3971C13.6382 16.6418 17.7512 16.5392 18.9285 14.5C19.8261 12.9453 18.8956 10.4756 16.6797 8.39501L17.7026 6.62326C20.7847 9.33196 22.1654 12.8934 20.6605 15.5C18.8003 18.7221 13.4717 18.8551 8.75027 16.1292C4.0289 13.4033 1.47976 8.72208 3.34002 5.50001C4.84492 2.89344 8.61964 2.30849 12.5065 3.62326ZM15.8842 1.77277L17.6163 2.77277L12.6163 11.433L10.8842 10.433L15.8842 1.77277ZM6.73233 20H17.0003V22H5.01761C4.94008 22.0014 4.86194 21.9938 4.78481 21.9768C4.77025 21.9735 4.7558 21.97 4.74147 21.9662C4.6589 21.944 4.57784 21.9108 4.50028 21.866C4.47106 21.8492 4.44301 21.831 4.41616 21.8118C4.30161 21.7292 4.20524 21.623 4.1342 21.5003C4.06328 21.3772 4.01939 21.2404 4.00518 21.0997C4.00446 21.0924 4.00381 21.085 4.00325 21.0777C3.98786 20.883 4.02924 20.6819 4.13425 20.5L6.38425 16.6029L8.1163 17.6029L6.73233 20Z"/></svg><svg class="ic-fill" xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M14.3685 4.39807L10.8842 10.433L12.6163 11.433L16.1006 5.39807C20.27 8.17002 22.4058 12.4771 20.6605 15.5C18.8003 18.7221 13.4717 18.8551 8.75027 16.1292C4.0289 13.4033 1.47976 8.72208 3.34002 5.50001C5.08527 2.47715 9.88324 2.17321 14.3685 4.39807ZM15.8842 1.77277L17.6163 2.77277L16.1163 5.37084L14.3842 4.37084L15.8842 1.77277ZM6.73233 20H17.0003V22H5.01761C4.94008 22.0014 4.86194 21.9938 4.78481 21.9768C4.77025 21.9735 4.7558 21.97 4.74147 21.9662C4.6589 21.944 4.57784 21.9108 4.50028 21.866C4.47106 21.8492 4.44301 21.831 4.41616 21.8118C4.30161 21.7292 4.20524 21.623 4.1342 21.5003C4.06328 21.3772 4.01939 21.2404 4.00518 21.0997C4.00446 21.0924 4.00381 21.085 4.00325 21.0777C3.98786 20.883 4.02924 20.6819 4.13425 20.5L6.38425 16.6029L8.1163 17.6029L6.73233 20Z"/></svg>` },
      { id: 'laporan-kinerja', key: null, showIf: () => _hasMonevIndikator || _hasIkkIndikator || _hasSpmIndikator, label: 'Laporan', page: 'page-laporan-kinerja', loader: () => loadLaporanKinerja(), icon: `<svg class="ic-line" xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M11 7H13V17H11V7ZM15 11H17V17H15V11ZM7 13H9V17H7V13ZM15 4H5V20H19V8H15V4ZM3 2.9918C3 2.44405 3.44749 2 3.9985 2H16L20.9997 7L21 20.9925C21 21.5489 20.5551 22 20.0066 22H3.9934C3.44476 22 3 21.5447 3 21.0082V2.9918Z"/></svg><svg class="ic-fill" xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M16 2L21 7V21.0082C21 21.556 20.5551 22 20.0066 22H3.9934C3.44476 22 3 21.5447 3 21.0082V2.9918C3 2.44405 3.44495 2 3.9934 2H16ZM11 7V17H13V7H11ZM15 11V17H17V11H15ZM7 13V17H9V13H7Z"/></svg>` },
    ],
  },
  {
    id: 'eplanning', label: 'e-Planning', icon: `<svg class="ic-line" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M21 3C21.5523 3 22 3.44772 22 4V20C22 20.5523 21.5523 21 21 21H3C2.44772 21 2 20.5523 2 20V4C2 3.44772 2.44772 3 3 3H21ZM11 13H4V19H11V13ZM20 13H13V19H20V13ZM11 5H4V11H11V5ZM20 5H13V11H20V5Z"/></svg><svg class="ic-fill" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M22 12.999V20C22 20.5523 21.5523 21 21 21H13V12.999H22ZM11 12.999V21H3C2.44772 21 2 20.5523 2 20V12.999H11ZM11 3V10.999H2V4C2 3.44772 2.44772 3 3 3H11ZM21 3C21.5523 3 22 3.44772 22 4V10.999H13V3H21Z"/></svg>`,
    children: [
      { id: 'eplanning-praunsulan', key: null, showIf: () => _user.is_admin || hasAccess('eplanning.admin') || hasAccess('eplanning.kabid') || hasAccess('eplanning.operator'), label: 'Pra Usulan', page: 'page-eplanning-praunsulan', loader: () => loadEplanningPraUsulan(), icon: `<svg class="ic-line" xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg><svg class="ic-fill" xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12S6.48 22 12 22 22 17.52 22 12 17.52 2 12 2ZM13 12.4142L17.4142 16.8284L16 18.2426L11 13.2426V6H13V12.4142Z"/></svg>` },
      { id: 'eplanning-usulan', key: null, showIf: () => _user.is_admin || hasAccess('eplanning.admin') || hasAccess('eplanning.kabid') || hasAccess('eplanning.operator'), label: 'Usulan', page: 'page-eplanning', loader: () => loadEplanning(), icon: `<svg class="ic-line" xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M17 2V4H20.0066C20.5552 4 21 4.44495 21 4.9934V21.0066C21 21.5552 20.5551 22 20.0066 22H3.9934C3.44476 22 3 21.5551 3 21.0066V4.9934C3 4.44476 3.44495 4 3.9934 4H7V2H17ZM7 6H5V20H19V6H17V8H7V6ZM9 16V18H7V16H9ZM9 13V15H7V13H9ZM9 10V12H7V10H9ZM15 4H9V6H15V4Z"/></svg><svg class="ic-fill" xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M6 4V8H18V4H20.0066C20.5552 4 21 4.44495 21 4.9934V21.0066C21 21.5552 20.5551 22 20.0066 22H3.9934C3.44476 22 3 21.5551 3 21.0066V4.9934C3 4.44476 3.44495 4 3.9934 4H6ZM9 17H7V19H9V17ZM9 14H7V16H9V14ZM9 11H7V13H9V11ZM16 2V6H8V2H16Z"/></svg>` },
      { id: 'eplanning-pembahasan', key: null, showIf: () => _user.is_admin || hasAccess('eplanning.admin') || hasAccess('eplanning.kabid') || hasAccess('eplanning.operator'), label: 'Pembahasan', page: 'page-eplanning-pembahasan', loader: () => loadEplanningPembahasan(), icon: `<svg class="ic-line" xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 3h20"/><path d="M21 3v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V3"/><path d="m7 21 5-5 5 5"/></svg><svg class="ic-fill" xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><rect x="2" y="3" width="20" height="13" rx="2"/><path d="M7 21l5-5 5 5H7z"/></svg>` },
      { id: 'eplanning-standarharga-group', adminOnly: false, label: 'Standar Harga Satuan', icon: `<svg class="ic-line" xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M10.9042 2.10025L20.8037 3.51446L22.2179 13.414L13.0255 22.6063C12.635 22.9969 12.0019 22.9969 11.6113 22.6063L1.71184 12.7069C1.32131 12.3163 1.32131 11.6832 1.71184 11.2926L10.9042 2.10025ZM11.6113 4.22157L3.83316 11.9997L12.3184 20.485L20.0966 12.7069L19.036 5.28223L11.6113 4.22157ZM13.7327 10.5855C12.9516 9.80448 12.9516 8.53815 13.7327 7.7571C14.5137 6.97606 15.78 6.97606 16.5611 7.7571C17.3421 8.53815 17.3421 9.80448 16.5611 10.5855C15.78 11.3666 14.5137 11.3666 13.7327 10.5855Z"/></svg><svg class="ic-fill" xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M10.9042 2.10025L20.8037 3.51446L22.2179 13.414L13.0255 22.6063C12.635 22.9969 12.0019 22.9969 11.6113 22.6063L1.71184 12.7069C1.32131 12.3163 1.32131 11.6832 1.71184 11.2926L10.9042 2.10025ZM13.7327 10.5855C14.5137 11.3666 15.78 11.3666 16.5611 10.5855C17.3421 9.80448 17.3421 8.53815 16.5611 7.7571C15.78 6.97606 14.5137 6.97606 13.7327 7.7571C12.9516 8.53815 12.9516 9.80448 13.7327 10.5855Z"/></svg>`, children: [
        { id: 'eplanning-standarharga-ssh', key: null, showIf: () => _user.is_admin || hasAccess('eplanning.admin') || hasAccess('eplanning.kabid') || hasAccess('eplanning.operator'), label: 'SSH', page: 'page-eplanning-standarharga', loader: () => epShTabSwitch('SSH'), icon: `<svg class="ic-line" xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M2.00488 3.99979C2.00488 3.4475 2.4526 2.99979 3.00488 2.99979H21.0049C21.5572 2.99979 22.0049 3.4475 22.0049 3.99979V9.49979C20.6242 9.49979 19.5049 10.6191 19.5049 11.9998C19.5049 13.3805 20.6242 14.4998 22.0049 14.4998V19.9998C22.0049 20.5521 21.5572 20.9998 21.0049 20.9998H3.00488C2.4526 20.9998 2.00488 20.5521 2.00488 19.9998V3.99979ZM8.09024 18.9998C8.29615 18.4172 8.85177 17.9998 9.50488 17.9998C10.158 17.9998 10.7136 18.4172 10.9195 18.9998H20.0049V16.032C18.5232 15.2957 17.5049 13.7666 17.5049 11.9998C17.5049 10.2329 18.5232 8.7039 20.0049 7.96755V4.99979H10.9195C10.7136 5.58238 10.158 5.99979 9.50488 5.99979C8.85177 5.99979 8.29615 5.58238 8.09024 4.99979H4.00488V18.9998H8.09024ZM9.50488 10.9998C8.67646 10.9998 8.00488 10.3282 8.00488 9.49979C8.00488 8.67136 8.67646 7.99979 9.50488 7.99979C10.3333 7.99979 11.0049 8.67136 11.0049 9.49979C11.0049 10.3282 10.3333 10.9998 9.50488 10.9998ZM9.50488 15.9998C8.67646 15.9998 8.00488 15.3282 8.00488 14.4998C8.00488 13.6714 8.67646 12.9998 9.50488 12.9998C10.3333 12.9998 11.0049 13.6714 11.0049 14.4998C11.0049 15.3282 10.3333 15.9998 9.50488 15.9998Z"/></svg><svg class="ic-fill" xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M11.0049 20.9997C11.0049 20.1712 10.3333 19.4997 9.50488 19.4997C8.67646 19.4997 8.00488 20.1712 8.00488 20.9997H3.00488C2.4526 20.9997 2.00488 20.5519 2.00488 19.9997V3.99966C2.00488 3.44738 2.4526 2.99966 3.00488 2.99966H8.00488C8.00488 3.82809 8.67646 4.49966 9.50488 4.49966C10.3333 4.49966 11.0049 3.82809 11.0049 2.99966H21.0049C21.5572 2.99966 22.0049 3.44738 22.0049 3.99966V9.49966C20.6242 9.49966 19.5049 10.619 19.5049 11.9997C19.5049 13.3804 20.6242 14.4997 22.0049 14.4997V19.9997C22.0049 20.5519 21.5572 20.9997 21.0049 20.9997H11.0049ZM9.50488 10.4997C10.3333 10.4997 11.0049 9.82809 11.0049 8.99966C11.0049 8.17124 10.3333 7.49966 9.50488 7.49966C8.67646 7.49966 8.00488 8.17124 8.00488 8.99966C8.00488 9.82809 8.67646 10.4997 9.50488 10.4997ZM9.50488 16.4997C10.3333 16.4997 11.0049 15.8281 11.0049 14.9997C11.0049 14.1712 10.3333 13.4997 9.50488 13.4997C8.67646 13.4997 8.00488 14.1712 8.00488 14.9997C8.00488 15.8281 8.67646 16.4997 9.50488 16.4997Z"/></svg>` },
        { id: 'eplanning-standarharga-hspk', key: null, showIf: () => _user.is_admin || hasAccess('eplanning.admin') || hasAccess('eplanning.kabid') || hasAccess('eplanning.operator'), label: 'HSPK', page: 'page-eplanning-standarharga', loader: () => epShTabSwitch('HSPK'), icon: `<svg class="ic-line" xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M4 8H20V5H4V8ZM14 19V10H10V19H14ZM16 19H20V10H16V19ZM8 19V10H4V19H8ZM3 3H21C21.5523 3 22 3.44772 22 4V20C22 20.5523 21.5523 21 21 21H3C2.44772 21 2 20.5523 2 20V4C2 3.44772 2.44772 3 3 3Z"/></svg><svg class="ic-fill" xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M15 21H9V10H15V21ZM17 21V10H22V20C22 20.5523 21.5523 21 21 21H17ZM7 21H3C2.44772 21 2 20.5523 2 20V10H7V21ZM22 8H2V4C2 3.44772 2.44772 3 3 3H21C21.5523 3 22 3.44772 22 4V8Z"/></svg>` },
        { id: 'eplanning-standarharga-asb', key: null, showIf: () => _user.is_admin || hasAccess('eplanning.admin') || hasAccess('eplanning.kabid') || hasAccess('eplanning.operator'), label: 'ASB', page: 'page-eplanning-standarharga', loader: () => epShTabSwitch('ASB'), icon: `<svg class="ic-line" xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M3 12H5V21H3V12ZM19 8H21V21H19V8ZM11 2H13V21H11V2Z"/></svg><svg class="ic-fill" xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M3 12H7V21H3V12ZM17 8H21V21H17V8ZM10 2H14V21H10V2Z"/></svg>` },
        { id: 'eplanning-standarharga-sbu', key: null, showIf: () => _user.is_admin || hasAccess('eplanning.admin') || hasAccess('eplanning.kabid') || hasAccess('eplanning.operator'), label: 'SBU', page: 'page-eplanning-standarharga', loader: () => epShTabSwitch('SBU'), icon: `<svg class="ic-line" xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M17 15.2454V22.1169C17 22.393 16.7761 22.617 16.5 22.617C16.4094 22.617 16.3205 22.5923 16.2428 22.5457L12 20L7.75725 22.5457C7.52046 22.6877 7.21333 22.6109 7.07125 22.3742C7.02463 22.2964 7 22.2075 7 22.1169V15.2454C5.17107 13.7793 4 11.5264 4 9C4 4.58172 7.58172 1 12 1C16.4183 1 20 4.58172 20 9C20 11.5264 18.8289 13.7793 17 15.2454ZM9 16.4185V19.4676L12 17.6676L15 19.4676V16.4185C14.0736 16.7935 13.0609 17 12 17C10.9391 17 9.92643 16.7935 9 16.4185ZM12 15C15.3137 15 18 12.3137 18 9C18 5.68629 15.3137 3 12 3C8.68629 3 6 5.68629 6 9C6 12.3137 8.68629 15 12 15Z"/></svg><svg class="ic-fill" xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M17 15.2454V22.1169C17 22.393 16.7761 22.617 16.5 22.617C16.4094 22.617 16.3205 22.5923 16.2428 22.5457L12 20L7.75725 22.5457C7.52046 22.6877 7.21333 22.6109 7.07125 22.3742C7.02463 22.2964 7 22.2075 7 22.1169V15.2454C5.17107 13.7793 4 11.5264 4 9C4 4.58172 7.58172 1 12 1C16.4183 1 20 4.58172 20 9C20 11.5264 18.8289 13.7793 17 15.2454ZM12 15C15.3137 15 18 12.3137 18 9C18 5.68629 15.3137 3 12 3C8.68629 3 6 5.68629 6 9C6 12.3137 8.68629 15 12 15ZM12 13C9.79086 13 8 11.2091 8 9C8 6.79086 9.79086 5 12 5C14.2091 5 16 6.79086 16 9C16 11.2091 14.2091 13 12 13Z"/></svg>` },
      ] },
    ],
  },
  {
    id: 'master', label: 'Master Data', icon: `<svg class="ic-line" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M5 12.5C5 12.8134 5.46101 13.3584 6.53047 13.8931C7.91405 14.5849 9.87677 15 12 15C14.1232 15 16.0859 14.5849 17.4695 13.8931C18.539 13.3584 19 12.8134 19 12.5V10.3287C17.35 11.3482 14.8273 12 12 12C9.17273 12 6.64996 11.3482 5 10.3287V12.5ZM19 15.3287C17.35 16.3482 14.8273 17 12 17C9.17273 17 6.64996 16.3482 5 15.3287V17.5C5 17.8134 5.46101 18.3584 6.53047 18.8931C7.91405 19.5849 9.87677 20 12 20C14.1232 20 16.0859 19.5849 17.4695 18.8931C18.539 18.3584 19 17.8134 19 17.5V15.3287ZM3 17.5V7.5C3 5.01472 7.02944 3 12 3C16.9706 3 21 5.01472 21 7.5V17.5C21 19.9853 16.9706 22 12 22C7.02944 22 3 19.9853 3 17.5ZM12 10C14.1232 10 16.0859 9.58492 17.4695 8.89313C18.539 8.3584 19 7.81342 19 7.5C19 7.18658 18.539 6.6416 17.4695 6.10687C16.0859 5.41508 14.1232 5 12 5C9.87677 5 7.91405 5.41508 6.53047 6.10687C5.46101 6.6416 5 7.18658 5 7.5C5 7.81342 5.46101 8.3584 6.53047 8.89313C7.91405 9.58492 9.87677 10 12 10Z"/></svg><svg class="ic-fill" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M21 9.5V12.5C21 14.9853 16.9706 17 12 17C7.02944 17 3 14.9853 3 12.5V9.5C3 11.9853 7.02944 14 12 14C16.9706 14 21 11.9853 21 9.5ZM3 14.5C3 16.9853 7.02944 19 12 19C16.9706 19 21 16.9853 21 14.5V17.5C21 19.9853 16.9706 22 12 22C7.02944 22 3 19.9853 3 17.5V14.5ZM12 12C7.02944 12 3 9.98528 3 7.5C3 5.01472 7.02944 3 12 3C16.9706 3 21 5.01472 21 7.5C21 9.98528 16.9706 12 12 12Z"/></svg>`,
    adminOnly: true,
    children: [
      { id: 'master-general', label: 'General', icon: `<svg class="ic-line" xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M12 15.5A3.5 3.5 0 1 0 12 8.5a3.5 3.5 0 0 0 0 7Z" stroke="currentColor" stroke-width="1.6"/><path d="M19.4 13.5a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V19.5a2 2 0 1 1-4 0v-.09a1.65 1.65 0 0 0-1.08-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H4.5a2 2 0 1 1 0-4h.09a1.65 1.65 0 0 0 1.51-1.08 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33h.03a1.65 1.65 0 0 0 1-1.51V4.5a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51h.03a1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82v.03a1.65 1.65 0 0 0 1.51 1H19.5a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z" stroke="currentColor" stroke-width="1.6"/></svg><svg class="ic-fill" xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M12 8.5a3.5 3.5 0 1 1 0 7 3.5 3.5 0 0 1 0-7ZM19.94 12.94c-.04.32-.06.66-.06 1s.02.68.06 1l2.07 1.62a.5.5 0 0 1 .12.64l-1.96 3.4a.5.5 0 0 1-.61.22l-2.44-.98a7.4 7.4 0 0 1-1.73 1l-.37 2.6a.5.5 0 0 1-.49.42h-3.92a.5.5 0 0 1-.49-.42l-.37-2.6a7.4 7.4 0 0 1-1.73-1l-2.44.98a.5.5 0 0 1-.61-.22l-1.96-3.4a.5.5 0 0 1 .12-.64l2.07-1.62c-.04-.32-.06-.66-.06-1s.02-.68.06-1L2.02 11.32a.5.5 0 0 1-.12-.64l1.96-3.4a.5.5 0 0 1 .61-.22l2.44.98c.53-.42 1.11-.76 1.73-1l.37-2.6A.5.5 0 0 1 9.5 4h3.92a.5.5 0 0 1 .49.42l.37 2.6c.62.24 1.2.58 1.73 1l2.44-.98a.5.5 0 0 1 .61.22l1.96 3.4a.5.5 0 0 1-.12.64l-2.07 1.62Z"/></svg>`, children: [
        { id: 'periode', key: null, label: 'Periode', page: 'page-periode', loader: () => loadPeriodePage(), icon: `<svg class="ic-line" xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M9 1V3H15V1H17V3H21C21.5523 3 22 3.44772 22 4V20C22 20.5523 21.5523 21 21 21H3C2.44772 21 2 20.5523 2 20V4C2 3.44772 2.44772 3 3 3H7V1H9ZM20 11H4V19H20V11ZM8 13V15H6V13H8ZM13 13V15H11V13H13ZM18 13V15H16V13H18ZM7 5H4V9H20V5H17V7H15V5H9V7H7V5Z"/></svg><svg class="ic-fill" xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M17 3H21C21.5523 3 22 3.44772 22 4V20C22 20.5523 21.5523 21 21 21H3C2.44772 21 2 20.5523 2 20V4C2 3.44772 2.44772 3 3 3H7V1H9V3H15V1H17V3ZM4 9V19H20V9H4ZM6 11H8V13H6V11ZM11 11H13V13H11V11ZM16 11H18V13H16V11Z"/></svg>` },
        { id: 'tema-musiman', key: null, adminOnly: true, label: 'Tema', page: 'page-tema-musiman', loader: () => loadTemaMusiman(), icon: `<svg class="ic-line" xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M12 22a1 1 0 0 1 0-20 10 9 0 0 1 10 9 5 5 0 0 1-5 5h-2.25a1.75 1.75 0 0 0-1.4 2.8l.3.4a1.75 1.75 0 0 1-1.4 2.8z" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/><circle cx="13.5" cy="6.5" r="1" fill="currentColor"/><circle cx="17.5" cy="10.5" r="1" fill="currentColor"/><circle cx="6.5" cy="12.5" r="1" fill="currentColor"/><circle cx="8.5" cy="7.5" r="1" fill="currentColor"/></svg><svg class="ic-fill" xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M12,3C7.03,3 3,7.03 3,12s4.03,9 9,9c0.83,0 1.5,-0.67 1.5,-1.5c0,-0.39 -0.15,-0.74 -0.39,-1.01c-0.23,-0.26 -0.38,-0.61 -0.38,-0.99c0,-0.83 0.67,-1.5 1.5,-1.5H16c2.76,0 5,-2.24 5,-5C21,6.48 16.97,3 12,3zM6.5,12C5.67,12 5,11.33 5,10.5S5.67,9 6.5,9S8,9.67 8,10.5S7.33,12 6.5,12zM9.5,8C8.67,8 8,7.33 8,6.5S8.67,5 9.5,5S11,5.67 11,6.5S10.33,8 9.5,8zM14.5,8C13.67,8 13,7.33 13,6.5S13.67,5 14.5,5S16,5.67 16,6.5S15.33,8 14.5,8zM17.5,12c-0.83,0 -1.5,-0.67 -1.5,-1.5S16.67,9 17.5,9S19,9.67 19,10.5S18.33,12 17.5,12z"/></svg>` },
        { id: 'pengguna', key: null, label: 'Pengguna', page: 'page-pengguna', loader: () => loadUsers(), icon: `<svg class="ic-line" xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M2 22C2 17.5817 5.58172 14 10 14C14.4183 14 18 17.5817 18 22H16C16 18.6863 13.3137 16 10 16C6.68629 16 4 18.6863 4 22H2ZM10 13C6.685 13 4 10.315 4 7C4 3.685 6.685 1 10 1C13.315 1 16 3.685 16 7C16 10.315 13.315 13 10 13ZM10 11C12.21 11 14 9.21 14 7C14 4.79 12.21 3 10 3C7.79 3 6 4.79 6 7C6 9.21 7.79 11 10 11ZM18.2837 14.7028C21.0644 15.9561 23 18.752 23 22H21C21 19.564 19.5483 17.4671 17.4628 16.5271L18.2837 14.7028ZM17.5962 3.41321C19.5944 4.23703 21 6.20361 21 8.5C21 11.3702 18.8042 13.7252 16 13.9776V11.9646C17.6967 11.7222 19 10.264 19 8.5C19 7.11935 18.2016 5.92603 17.041 5.35635L17.5962 3.41321Z"/></svg><svg class="ic-fill" xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M2 22C2 17.5817 5.58172 14 10 14C14.4183 14 18 17.5817 18 22H2ZM10 13C6.685 13 4 10.315 4 7C4 3.685 6.685 1 10 1C13.315 1 16 3.685 16 7C16 10.315 13.315 13 10 13ZM17.3628 15.2332C20.4482 16.0217 22.7679 18.7235 22.9836 22H20C20 19.3902 19.0002 17.0139 17.3628 15.2332ZM15.3401 12.9569C16.9728 11.4922 18 9.36607 18 7C18 5.58266 17.6314 4.25141 16.9849 3.09687C19.2753 3.55397 21 5.57465 21 8C21 10.7625 18.7625 13 16 13C15.7763 13 15.556 12.9853 15.3401 12.9569Z"/></svg>` },
        { id: 'bidang', key: null, label: 'Unit Kerja', page: 'page-bidang', loader: () => loadBidangPage(), icon: `<svg class="ic-line" xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M21 20H23V22H1V20H3V3C3 2.44772 3.44772 2 4 2H20C20.5523 2 21 2.44772 21 3V20ZM19 20V4H5V20H19ZM8 11H11V13H8V11ZM8 7H11V9H8V7ZM8 15H11V17H8V15ZM13 15H16V17H13V15ZM13 11H16V13H13V11ZM13 7H16V9H13V7Z"/></svg><svg class="ic-fill" xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M21 20H23V22H1V20H3V3C3 2.44772 3.44772 2 4 2H20C20.5523 2 21 2.44772 21 3V20ZM8 11V13H11V11H8ZM8 7V9H11V7H8ZM8 15V17H11V15H8ZM13 15V17H16V15H13ZM13 11V13H16V11H13ZM13 7V9H16V7H13Z"/></svg>` },
        { id: 'pegawai', key: null, label: 'Struktur', page: 'page-pegawai', loader: () => { loadPegawai(); }, icon: `<svg class="ic-line" xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M6 7C6 3.68629 8.68629 1 12 1C15.3137 1 18 3.68629 18 7C18 7.26214 17.9831 7.5207 17.9504 7.77457C19.77 8.80413 21 10.7575 21 13C21 16.3137 18.3137 19 15 19H13V22H11V19H8.5C5.46243 19 3 16.5376 3 13.5C3 11.2863 4.30712 9.37966 6.19098 8.50704C6.06635 8.02551 6 7.52039 6 7ZM7.00964 10.3319C5.82176 10.8918 5 12.1008 5 13.5C5 15.433 6.567 17 8.5 17H15C17.2091 17 19 15.2091 19 13C19 11.3056 17.9461 9.85488 16.4544 9.27234L15.6129 8.94372C15.7907 8.30337 16 7.67183 16 7C16 4.79086 14.2091 3 12 3C9.79086 3 8 4.79086 8 7C8 8.30783 8.6266 9.46903 9.60019 10.2005L8.39884 11.7995C7.85767 11.3929 7.38716 10.8963 7.00964 10.3319Z"/></svg><svg class="ic-fill" xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M18 7C18 7.2624 17.9832 7.52086 17.9505 7.77437C19.7712 8.80457 21 10.7588 21 13C21 16.3137 18.3137 19 15 19C14.2987 19 13.6256 18.8797 13 18.6586V22H11V18.4003C10.2499 18.7837 9.40022 19 8.5 19C5.46243 19 3 16.5376 3 13.5C3 12.0474 3.56312 10.7263 4.48297 9.74318C4.87725 10.8232 5.49744 11.7944 6.28576 12.5989L7.71424 11.1991C6.99071 10.4607 6.45705 9.53767 6.1906 8.50688C6.06607 8.02541 6 7.5204 6 7C6 3.68629 8.68629 1 12 1C15.3137 1 18 3.68629 18 7Z"/></svg>` },
        { id: 'dokumen-publik', key: null, label: 'Dokumen Publik', page: 'page-dokumen-publik', loader: () => { loadDokumenPublik(); }, icon: `<svg class="ic-line" xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M20 22H4C3.44772 22 3 21.5523 3 21V3C3 2.44772 3.44772 2 4 2H20C20.5523 2 21 2.44772 21 3V21C21 21.5523 20.5523 22 20 22ZM19 20V4H5V20H19ZM7 6H11V10H7V6ZM7 12H17V14H7V12ZM7 16H17V18H7V16ZM13 7H17V9H13V7Z"/></svg><svg class="ic-fill" xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M20 22H4C3.44772 22 3 21.5523 3 21V3C3 2.44772 3.44772 2 4 2H20C20.5523 2 21 2.44772 21 3V21C21 21.5523 20.5523 22 20 22ZM7 6V10H11V6H7ZM7 12V14H17V12H7ZM7 16V18H17V16H7ZM13 7V9H17V7H13Z"/></svg>` },
        { id: 'pengumuman', key: null, adminOnly: true, label: 'Pengumuman', page: 'page-pengumuman', loader: () => { loadPengumuman(); loadTicker(); }, icon: `<svg class="ic-line" xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M9 17C9 17 16 18 19 21H20C20.5523 21 21 20.5523 21 20V13.937C21.8626 13.715 22.5 12.9319 22.5 12C22.5 11.0681 21.8626 10.285 21 10.063V4C21 3.44772 20.5523 3 20 3H19C16 6 9 7 9 7H5C3.89543 7 3 7.89543 3 9V15C3 16.1046 3.89543 17 5 17H6L7 22H9V17ZM11 8.6612C11.6833 8.5146 12.5275 8.31193 13.4393 8.04373C15.1175 7.55014 17.25 6.77262 19 5.57458V18.4254C17.25 17.2274 15.1175 16.4499 13.4393 15.9563C12.5275 15.6881 11.6833 15.4854 11 15.3388V8.6612ZM5 9H9V15H5V9Z"/></svg><svg class="ic-fill" xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M21 10.063V4C21 3.44772 20.5523 3 20 3H19C17.0214 4.97864 13.3027 6.08728 11 6.61281V17.3872C13.3027 17.9127 17.0214 19.0214 19 21H20C20.5523 21 21 20.5523 21 20V13.937C21.8626 13.715 22.5 12.9319 22.5 12 22.5 11.0681 21.8626 10.285 21 10.063ZM5 7C3.89543 7 3 7.89543 3 9V15C3 16.1046 3.89543 17 5 17H6L7 22H9V7H5Z"/></svg>` },
        { id: 'profil', key: null, label: 'Profil Instansi', page: 'page-profil', loader: () => loadProfil(), icon: `<svg class="ic-line" xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M20 6H23V8H22V19H23V21H1V19H2V8H1V6H4V4C4 3.44772 4.44772 3 5 3H19C19.5523 3 20 3.44772 20 4V6ZM20 8H4V19H7V12H9V19H11V12H13V19H15V12H17V19H20V8ZM6 5V6H18V5H6Z"/></svg><svg class="ic-fill" xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M2 19V8H1V6H4V4C4 3.44772 4.44772 3 5 3H19C19.5523 3 20 3.44772 20 4V6H23V8H22V19H23V21H1V19H2ZM13 19V12H11V19H13ZM8 19V12H6V19H8ZM18 19V12H16V19H18ZM6 5V6H18V5H6Z"/></svg>` },
        { id: 'audit-trail', key: null, adminOnly: true, label: 'Audit Trail', page: 'page-audit-trail', loader: () => loadAuditTrail(1), icon: `<svg class="ic-line" xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M12 1L20.2169 2.82598C20.6745 2.92766 21 3.33347 21 3.80217V13.7889C21 15.795 19.9974 17.6684 18.3282 18.7812L12 23L5.6718 18.7812C4.00261 17.6684 3 15.795 3 13.7889V3.80217C3 3.33347 3.32553 2.92766 3.78307 2.82598L12 1ZM12 3.04879L5 4.60434V13.7889C5 15.1263 5.6684 16.3752 6.7812 17.1171L12 20.5963L17.2188 17.1171C18.3316 16.3752 19 15.1263 19 13.7889V4.60434L12 3.04879ZM16.4524 8.22183L17.8666 9.63604L11.5026 16L7.25999 11.7574L8.67421 10.3431L11.5019 13.1709L16.4524 8.22183Z"/></svg><svg class="ic-fill" xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M12 1L20.2169 2.82598C20.6745 2.92766 21 3.33347 21 3.80217V13.7889C21 15.795 19.9974 17.6684 18.3282 18.7812L12 23L5.6718 18.7812C4.00261 17.6684 3 15.795 3 13.7889V3.80217C3 3.33347 3.32553 2.92766 3.78307 2.82598L12 1ZM16.4524 8.22183L11.5019 13.1709L8.67421 10.3431L7.25999 11.7574L11.5026 16L17.8666 9.63604L16.4524 8.22183Z"/></svg>` },
      ] },
      { id: 'master-superlink', label: 'Superlink', icon: `<svg class="ic-line" xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M13.0607 8.11097L14.4749 9.52518C17.2086 12.2589 17.2086 16.691 14.4749 19.4247L14.1214 19.7782C11.3877 22.5119 6.95555 22.5119 4.22188 19.7782C1.48821 17.0446 1.48821 12.6124 4.22188 9.87874L5.6361 11.293C3.68348 13.2456 3.68348 16.4114 5.6361 18.364C7.58872 20.3166 10.7545 20.3166 12.7072 18.364L13.0607 18.0105C15.0133 16.0578 15.0133 12.892 13.0607 10.9394L11.6465 9.52518L13.0607 8.11097ZM19.7782 14.1214L18.364 12.7072C20.3166 10.7545 20.3166 7.58872 18.364 5.6361C16.4114 3.68348 13.2456 3.68348 11.293 5.6361L10.9394 5.98965C8.98678 7.94227 8.98678 11.1081 10.9394 13.0607L12.3536 14.4749L10.9394 15.8891L9.52518 14.4749C6.79151 11.7413 6.79151 7.30911 9.52518 4.57544L9.87874 4.22188C12.6124 1.48821 17.0446 1.48821 19.7782 4.22188C22.5119 6.95555 22.5119 11.3877 19.7782 14.1214Z"/></svg><svg class="ic-fill" xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M13.0607 8.11097L14.4749 9.52518C17.2086 12.2589 17.2086 16.691 14.4749 19.4247L14.1214 19.7782C11.3877 22.5119 6.95555 22.5119 4.22188 19.7782C1.48821 17.0446 1.48821 12.6124 4.22188 9.87874L5.6361 11.293C3.68348 13.2456 3.68348 16.4114 5.6361 18.364C7.58872 20.3166 10.7545 20.3166 12.7072 18.364L13.0607 18.0105C15.0133 16.0578 15.0133 12.892 13.0607 10.9394L11.6465 9.52518L13.0607 8.11097ZM19.7782 14.1214L18.364 12.7072C20.3166 10.7545 20.3166 7.58872 18.364 5.6361C16.4114 3.68348 13.2456 3.68348 11.293 5.6361L10.9394 5.98965C8.98678 7.94227 8.98678 11.1081 10.9394 13.0607L12.3536 14.4749L10.9394 15.8891L9.52518 14.4749C6.79151 11.7413 6.79151 7.30911 9.52518 4.57544L9.87874 4.22188C12.6124 1.48821 17.0446 1.48821 19.7782 4.22188C22.5119 6.95555 22.5119 11.3877 19.7782 14.1214Z"/></svg>`, children: [
        // belum ada master data khusus Superlink
      ] },
      { id: 'master-surat', label: 'Surat', icon: `<svg class="ic-line" xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M3 3H21C21.5523 3 22 3.44772 22 4V20C22 20.5523 21.5523 21 21 21H3C2.44772 21 2 20.5523 2 20V4C2 3.44772 2.44772 3 3 3ZM20 7.23792L12.0718 14.338L4 7.21594V19H20V7.23792ZM4.51146 5L12.0619 11.662L19.501 5H4.51146Z"/></svg><svg class="ic-fill" xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M3 3H21C21.5523 3 22 3.44772 22 4V20C22 20.5523 21.5523 21 21 21H3C2.44772 21 2 20.5523 2 20V4C2 3.44772 2.44772 3 3 3ZM12.0606 11.6829L5.64722 6.2377L4.35278 7.7623L12.0731 14.3171L19.6544 7.75616L18.3456 6.24384L12.0606 11.6829Z"/></svg>`, children: [
        // belum ada master data khusus Surat
      ] },
      { id: 'master-absensi', label: 'Absenku', icon: `<svg class="ic-line" xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M9 1V3H15V1H17V3H21C21.5523 3 22 3.44772 22 4V20C22 20.5523 21.5523 21 21 21H3C2.44772 21 2 20.5523 2 20V4C2 3.44772 2.44772 3 3 3H7V1H9ZM20 10H4V19H20V10ZM15.0355 11.136L16.4497 12.5503L11.5 17.5L7.96447 13.9645L9.37868 12.5503L11.5 14.6716L15.0355 11.136ZM7 5H4V8H20V5H17V6H15V5H9V6H7V5Z"/></svg><svg class="ic-fill" xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M9 1V3H15V1H17V3H21C21.5523 3 22 3.44772 22 4V20C22 20.5523 21.5523 21 21 21H3C2.44772 21 2 20.5523 2 20V4C2 3.44772 2.44772 3 3 3H7V1H9ZM20 8H4V19H20V8ZM15.0355 10.136L16.4497 11.5503L11.5 16.5L7.96447 12.9645L9.37868 11.5503L11.5 13.6716L15.0355 10.136Z"/></svg>`, children: [
        { id: 'absensi-pengaturan', key: null, showIf: () => _user.is_admin || hasAccess('absensi.full'), label: 'Pengaturan', page: 'page-absensi-pengaturan', loader: () => loadAbsPengaturan(), icon: `<svg class="ic-line" xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M3.33946 17.0002C2.90721 16.2515 2.58277 15.4702 2.36133 14.6741C3.3338 14.1779 3.99972 13.1668 3.99972 12.0002C3.99972 10.8345 3.3348 9.824 2.36353 9.32741C2.81025 7.71651 3.65857 6.21627 4.86474 4.99001C5.7807 5.58416 6.98935 5.65534 7.99972 5.072C9.01009 4.48866 9.55277 3.40635 9.4962 2.31604C11.1613 1.8846 12.8847 1.90004 14.5031 2.31862C14.4475 3.40806 14.9901 4.48912 15.9997 5.072C17.0101 5.65532 18.2187 5.58416 19.1346 4.99007C19.7133 5.57986 20.2277 6.25151 20.66 7.00021C21.0922 7.7489 21.4167 8.53025 21.6381 9.32628C20.6656 9.82247 19.9997 10.8336 19.9997 12.0002C19.9997 13.166 20.6646 14.1764 21.6359 14.673C21.1892 16.2839 20.3409 17.7841 19.1347 19.0104C18.2187 18.4163 17.0101 18.3451 15.9997 18.9284C14.9893 19.5117 14.4467 20.5941 14.5032 21.6844C12.8382 22.1158 11.1148 22.1004 9.49633 21.6818C9.55191 20.5923 9.00929 19.5113 7.99972 18.9284C6.98938 18.3451 5.78079 18.4162 4.86484 19.0103C4.28617 18.4205 3.77172 17.7489 3.33946 17.0002ZM8.99972 17.1964C10.0911 17.8265 10.8749 18.8227 11.2503 19.9659C11.7486 20.0133 12.2502 20.014 12.7486 19.9675C13.1238 18.8237 13.9078 17.8268 14.9997 17.1964C16.0916 16.5659 17.347 16.3855 18.5252 16.6324C18.8146 16.224 19.0648 15.7892 19.2729 15.334C18.4706 14.4373 17.9997 13.2604 17.9997 12.0002C17.9997 10.74 18.4706 9.5632 19.2729 8.6665C19.1688 8.4405 19.0538 8.21822 18.9279 8.00021C18.802 7.78219 18.667 7.57148 18.5233 7.36842C17.3457 7.61476 16.0911 7.43414 14.9997 6.80405C13.9083 6.17395 13.1246 5.17768 12.7491 4.03455C12.2509 3.98714 11.7492 3.98646 11.2509 4.03292C10.8756 5.17671 10.0916 6.17364 8.99972 6.80405C7.9078 7.43447 6.65245 7.61494 5.47428 7.36803C5.18485 7.77641 4.93463 8.21117 4.72656 8.66637C5.52881 9.56311 5.99972 10.74 5.99972 12.0002C5.99972 13.2604 5.52883 14.4372 4.72656 15.3339C4.83067 15.5599 4.94564 15.7822 5.07152 16.0002C5.19739 16.2182 5.3324 16.4289 5.47612 16.632C6.65377 16.3857 7.90838 16.5663 8.99972 17.1964ZM11.9997 15.0002C10.3429 15.0002 8.99972 13.6571 8.99972 12.0002C8.99972 10.3434 10.3429 9.00021 11.9997 9.00021C13.6566 9.00021 14.9997 10.3434 14.9997 12.0002C14.9997 13.6571 13.6566 15.0002 11.9997 15.0002ZM11.9997 13.0002C12.552 13.0002 12.9997 12.5525 12.9997 12.0002C12.9997 11.4479 12.552 11.0002 11.9997 11.0002C11.4474 11.0002 10.9997 11.4479 10.9997 12.0002C10.9997 12.5525 11.4474 13.0002 11.9997 13.0002Z"/></svg><svg class="ic-fill" xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M9.95401 2.2106C11.2876 1.93144 12.6807 1.92263 14.0449 2.20785C14.2219 3.3674 14.9048 4.43892 15.9997 5.07103C17.0945 5.70313 18.364 5.75884 19.4566 5.3323C20.3858 6.37118 21.0747 7.58203 21.4997 8.87652C20.5852 9.60958 19.9997 10.736 19.9997 11.9992C19.9997 13.2632 20.5859 14.3902 21.5013 15.1232C21.29 15.7636 21.0104 16.3922 20.6599 16.9992C20.3094 17.6063 19.9049 18.1627 19.4559 18.6659C18.3634 18.2396 17.0943 18.2955 15.9997 18.9274C14.9057 19.559 14.223 20.6294 14.0453 21.7879C12.7118 22.067 11.3187 22.0758 9.95443 21.7906C9.77748 20.6311 9.09451 19.5595 7.99967 18.9274C6.90484 18.2953 5.63539 18.2396 4.54272 18.6662C3.61357 17.6273 2.92466 16.4164 2.49964 15.1219C3.41412 14.3889 3.99968 13.2624 3.99968 11.9992C3.99968 10.7353 3.41344 9.60827 2.49805 8.87524C2.70933 8.23482 2.98894 7.60629 3.33942 6.99923C3.68991 6.39217 4.09443 5.83576 4.54341 5.33257C5.63593 5.75881 6.90507 5.703 7.99967 5.07103C9.09364 4.43942 9.7764 3.3691 9.95401 2.2106ZM11.9997 14.9992C13.6565 14.9992 14.9997 13.6561 14.9997 11.9992C14.9997 10.3424 13.6565 8.99923 11.9997 8.99923C10.3428 8.99923 8.99967 10.3424 8.99967 11.9992C8.99967 13.6561 10.3428 14.9992 11.9997 14.9992Z"/></svg>` },
        // belum ada master data khusus Absenku
      ] },
      { id: 'master-kinerja', label: 'Kinerja', icon: `<svg class="ic-line" xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M5 3V19H21V21H3V3H5ZM20.2929 6.29289L21.7071 7.70711L16 13.4142L13 10.415L8.70711 14.7071L7.29289 13.2929L13 7.58579L16 10.585L20.2929 6.29289Z"/></svg><svg class="ic-fill" xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M5 3V19H21V21H3V3H5ZM19.9393 5.93934L22.0607 8.06066L16 14.1213L13 11.121L9.06066 15.0607L6.93934 12.9393L13 6.87868L16 9.879L19.9393 5.93934Z"/></svg>`, children: [
        { id: 'kelola-indikator', key: null, adminOnly: true, label: 'Kelola Indikator', page: 'page-kinerja-admin', loader: () => loadIndikatorAdmin(), icon: `<svg class="ic-line" xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M6.17071 18C6.58254 16.8348 7.69378 16 9 16C10.3062 16 11.4175 16.8348 11.8293 18H22V20H11.8293C11.4175 21.1652 10.3062 22 9 22C7.69378 22 6.58254 21.1652 6.17071 20H2V18H6.17071ZM12.1707 11C12.5825 9.83481 13.6938 9 15 9C16.3062 9 17.4175 9.83481 17.8293 11H22V13H17.8293C17.4175 14.1652 16.3062 15 15 15C13.6938 15 12.5825 14.1652 12.1707 13H2V11H12.1707ZM6.17071 4C6.58254 2.83481 7.69378 2 9 2C10.3062 2 11.4175 2.83481 11.8293 4H22V6H11.8293C11.4175 7.16519 10.3062 8 9 8C7.69378 8 6.58254 7.16519 6.17071 6H2V4H6.17071ZM9 6C9.55228 6 10 5.55228 10 5C10 4.44772 9.55228 4 9 4C8.44772 4 8 4.44772 8 5C8 5.55228 8.44772 6 9 6ZM15 13C15.5523 13 16 12.5523 16 12C16 11.4477 15.5523 11 15 11C14.4477 11 14 11.4477 14 12C14 12.5523 14.4477 13 15 13ZM9 20C9.55228 20 10 19.5523 10 19C10 18.4477 9.55228 18 9 18C8.44772 18 8 18.4477 8 19C8 19.5523 8.44772 20 9 20Z"/></svg><svg class="ic-fill" xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M6.17071 18C6.58254 16.8348 7.69378 16 9 16C10.3062 16 11.4175 16.8348 11.8293 18H22V20H11.8293C11.4175 21.1652 10.3062 22 9 22C7.69378 22 6.58254 21.1652 6.17071 20H2V18H6.17071ZM12.1707 11C12.5825 9.83481 13.6938 9 15 9C16.3062 9 17.4175 9.83481 17.8293 11H22V13H17.8293C17.4175 14.1652 16.3062 15 15 15C13.6938 15 12.5825 14.1652 12.1707 13H2V11H12.1707ZM6.17071 4C6.58254 2.83481 7.69378 2 9 2C10.3062 2 11.4175 2.83481 11.8293 4H22V6H11.8293C11.4175 7.16519 10.3062 8 9 8C7.69378 8 6.58254 7.16519 6.17071 6H2V4H6.17071Z"/></svg>` },
        { id: 'kelola-target', key: null, adminOnly: true, label: 'Kelola Target', page: 'page-kelola-target', loader: () => loadKelolaTarget(), icon: `<svg class="ic-line" xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M13 1L13.001 4.06201C16.6192 4.51365 19.4869 7.38163 19.9381 11L23 11V13L19.938 13.001C19.4864 16.6189 16.6189 19.4864 13.001 19.938L13 23H11L11 19.9381C7.38163 19.4869 4.51365 16.6192 4.06201 13.001L1 13V11L4.06189 11C4.51312 7.38129 7.38129 4.51312 11 4.06189L11 1H13ZM12 6C8.68629 6 6 8.68629 6 12C6 15.3137 8.68629 18 12 18C15.3137 18 18 15.3137 18 12C18 8.68629 15.3137 6 12 6ZM12 10C13.1046 10 14 10.8954 14 12C14 13.1046 13.1046 14 12 14C10.8954 14 10 13.1046 10 12C10 10.8954 10.8954 10 12 10Z"/></svg><svg class="ic-fill" xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M13 1L13.001 4.06201C16.6192 4.51365 19.4869 7.38163 19.9381 11L23 11V13L19.938 13.001C19.4864 16.6189 16.6189 19.4864 13.001 19.938L13 23H11L11 19.9381C7.38163 19.4869 4.51365 16.6192 4.06201 13.001L1 13V11L4.06189 11C4.51312 7.38129 7.38129 4.51312 11 4.06189L11 1H13ZM12 10C10.8954 10 10 10.8954 10 12C10 13.1046 10.8954 14 12 14C13.1046 14 14 13.1046 14 12C14 10.8954 13.1046 10 12 10Z"/></svg>` },
        { id: 'kelola-jenis', key: null, adminOnly: true, label: 'Kelola Jenis Kinerja', page: 'page-kelola-jenis', loader: () => loadKelolaJenis(), icon: `<svg class="ic-line" xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M12.4142 5H21C21.5523 5 22 5.44772 22 6V20C22 20.5523 21.5523 21 21 21H3C2.44772 21 2 20.5523 2 20V4C2 3.44772 2.44772 3 3 3H10.4142L12.4142 5ZM4 5V19H20V7H11.5858L9.58579 5H4ZM8.59114 13.8089C8.52934 13.5486 8.49663 13.277 8.49663 12.9978C8.49663 12.7186 8.52933 12.4471 8.59112 12.1868L7.59998 11.6146L8.59949 9.88335L9.59133 10.456C9.98424 10.0843 10.4633 9.80275 10.9954 9.64438V8.5H12.9944V9.64438C13.5265 9.80274 14.0056 10.0843 14.3985 10.4559L15.3904 9.88325L16.39 11.6145L15.3987 12.1867C15.4605 12.447 15.4932 12.7186 15.4932 12.9978C15.4932 13.277 15.4605 13.5485 15.3987 13.8088L16.39 14.3811L15.3905 16.1123L14.3986 15.5396C14.0057 15.9113 13.5266 16.1928 12.9945 16.3512V17.4956H10.9955V16.3513C10.4634 16.1929 9.98434 15.9114 9.59141 15.5397L8.59954 16.1124L7.59998 14.3812L8.59114 13.8089ZM11.9949 14.4971C12.8229 14.4971 13.4942 13.8258 13.4942 12.9978C13.4942 12.1698 12.8229 11.4985 11.9949 11.4985C11.1669 11.4985 10.4957 12.1698 10.4957 12.9978C10.4957 13.8258 11.1669 14.4971 11.9949 14.4971Z"/></svg><svg class="ic-fill" xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M12.4142 5H21C21.5523 5 22 5.44772 22 6V20C22 20.5523 21.5523 21 21 21H3C2.44772 21 2 20.5523 2 20V4C2 3.44772 2.44772 3 3 3H10.4142L12.4142 5ZM8.59114 13.8089L7.59998 14.3812L8.59954 16.1124L9.59141 15.5397C9.98434 15.9114 10.4634 16.1929 10.9955 16.3513V17.4956H12.9945V16.3512C13.5266 16.1928 14.0057 15.9113 14.3986 15.5396L15.3905 16.1123L16.39 14.3811L15.3987 13.8088C15.4605 13.5485 15.4932 13.277 15.4932 12.9978C15.4932 12.7186 15.4605 12.447 15.3987 12.1867L16.39 11.6145L15.3904 9.88325L14.3985 10.4559C14.0056 10.0843 13.5265 9.80274 12.9944 9.64438V8.5H10.9954V9.64438C10.4633 9.80275 9.98424 10.0843 9.59133 10.456L8.59949 9.88335L7.59998 11.6146L8.59112 12.1868C8.52933 12.4471 8.49663 12.7186 8.49663 12.9978C8.49663 13.277 8.52934 13.5486 8.59114 13.8089ZM11.9949 14.4971C11.1669 14.4971 10.4957 13.8258 10.4957 12.9978C10.4957 12.1698 11.1669 11.4985 11.9949 11.4985C12.8229 11.4985 13.4942 12.1698 13.4942 12.9978C13.4942 13.8258 12.8229 14.4971 11.9949 14.4971Z"/></svg>` },
        { id: 'kelola-laporan', key: null, adminOnly: true, label: 'Kelola Laporan', page: 'page-kelola-laporan', loader: () => loadLapTemplateAdmin(), icon: `<svg class="ic-line" xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M11 7H13V17H11V7ZM15 11H17V17H15V11ZM7 13H9V17H7V13ZM15 4H5V20H19V8H15V4ZM3 2.9918C3 2.44405 3.44749 2 3.9985 2H16L20.9997 7L21 20.9925C21 21.5489 20.5551 22 20.0066 22H3.9934C3.44476 22 3 21.5447 3 21.0082V2.9918Z"/></svg><svg class="ic-fill" xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M16 2L21 7V21.0082C21 21.556 20.5551 22 20.0066 22H3.9934C3.44476 22 3 21.5447 3 21.0082V2.9918C3 2.44405 3.44495 2 3.9934 2H16ZM11 7V17H13V7H11ZM15 11V17H17V11H15ZM7 13V17H9V13H7Z"/></svg>` },
      ] },
      { id: 'master-eplanning', label: 'e-Planning', icon: `<svg class="ic-line" xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M21 3C21.5523 3 22 3.44772 22 4V20C22 20.5523 21.5523 21 21 21H3C2.44772 21 2 20.5523 2 20V4C2 3.44772 2.44772 3 3 3H21ZM11 13H4V19H11V13ZM20 13H13V19H20V13ZM11 5H4V11H11V5ZM20 5H13V11H20V5Z"/></svg><svg class="ic-fill" xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M22 12.999V20C22 20.5523 21.5523 21 21 21H13V12.999H22ZM11 12.999V21H3C2.44772 21 2 20.5523 2 20V12.999H11ZM11 3V10.999H2V4C2 3.44772 2.44772 3 3 3H11ZM21 3C21.5523 3 22 3.44772 22 4V10.999H13V3H21Z"/></svg>`, children: [
        { id: 'eplanning-subkegiatan', key: null, adminOnly: true, label: 'Sub Kegiatan', page: 'page-eplanning-subkegiatan', loader: () => epLoadMasterSubkegiatan(), icon: `<svg class="ic-line" xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M19 4H5V20H19V4ZM3 2.9918C3 2.44405 3.44749 2 3.9985 2H19.9997C20.5519 2 20.9996 2.44772 20.9997 3L21 20.9925C21 21.5489 20.5551 22 20.0066 22H3.9934C3.44476 22 3 21.5447 3 21.0082V2.9918ZM11.2929 13.1213L15.5355 8.87868L16.9497 10.2929L11.2929 15.9497L7.40381 12.0607L8.81802 10.6464L11.2929 13.1213Z"/></svg><svg class="ic-fill" xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M21 3V21.0082C21 21.556 20.5551 22 20.0066 22H3.9934C3.44476 22 3 21.5447 3 21.0082V2.9918C3 2.44405 3.44495 2 3.9934 2H20C20.5523 2 21 2.44772 21 3ZM11.2929 13.1213L8.81802 10.6464L7.40381 12.0607L11.2929 15.9497L16.9497 10.2929L15.5355 8.87868L11.2929 13.1213Z"/></svg>` },
        { id: 'eplanning-sumberdana', key: null, adminOnly: true, label: 'Sumber Dana', page: 'page-eplanning-sumberdana', loader: () => epLoadMasterSumberDana(), icon: `<svg class="ic-line" xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M22.0049 6.99979H23.0049V16.9998H22.0049V19.9998C22.0049 20.5521 21.5572 20.9998 21.0049 20.9998H3.00488C2.4526 20.9998 2.00488 20.5521 2.00488 19.9998V3.99979C2.00488 3.4475 2.4526 2.99979 3.00488 2.99979H21.0049C21.5572 2.99979 22.0049 3.4475 22.0049 3.99979V6.99979ZM20.0049 16.9998H14.0049C11.2435 16.9998 9.00488 14.7612 9.00488 11.9998C9.00488 9.23836 11.2435 6.99979 14.0049 6.99979H20.0049V4.99979H4.00488V18.9998H20.0049V16.9998ZM21.0049 14.9998V8.99979H14.0049C12.348 8.99979 11.0049 10.3429 11.0049 11.9998C11.0049 13.6566 12.348 14.9998 14.0049 14.9998H21.0049ZM14.0049 10.9998H17.0049V12.9998H14.0049V10.9998Z"/></svg><svg class="ic-fill" xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M22.0049 5.99979H15.0049C11.6912 5.99979 9.00488 8.68608 9.00488 11.9998C9.00488 15.3135 11.6912 17.9998 15.0049 17.9998H22.0049V19.9998C22.0049 20.5521 21.5572 20.9998 21.0049 20.9998H3.00488C2.4526 20.9998 2.00488 20.5521 2.00488 19.9998V3.99979C2.00488 3.4475 2.4526 2.99979 3.00488 2.99979H21.0049C21.5572 2.99979 22.0049 3.4475 22.0049 3.99979V5.99979ZM15.0049 7.99979H23.0049V15.9998H15.0049C12.7957 15.9998 11.0049 14.2089 11.0049 11.9998C11.0049 9.79065 12.7957 7.99979 15.0049 7.99979ZM15.0049 10.9998V12.9998H18.0049V10.9998H15.0049Z"/></svg>` },
        { id: 'eplanning-satuan', key: null, adminOnly: true, label: 'Satuan', page: 'page-eplanning-satuan', loader: () => epLoadMasterSatuan(), icon: `<svg class="ic-line" xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M6.34323 14.728L3.5148 17.5565L7.05033 21.092L20.4854 7.65696L16.9498 4.12143L14.8285 6.24275L16.2427 7.65696L14.8285 9.07118L13.4143 7.65696L11.293 9.77828L13.4143 11.8996L12.0001 13.3138L9.87876 11.1925L7.75744 13.3138L9.17165 14.728L7.75744 16.1422L6.34323 14.728ZM17.6569 2.00011L22.6067 6.94986C22.9972 7.34038 22.9972 7.97354 22.6067 8.36407L7.75744 23.2133C7.36692 23.6038 6.73375 23.6038 6.34323 23.2133L1.39348 18.2636C1.00295 17.873 1.00295 17.2399 1.39348 16.8494L16.2427 2.00011C16.6332 1.60958 17.2664 1.60958 17.6569 2.00011Z"/></svg><svg class="ic-fill" xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M4.92901 13.3138L7.05033 15.4351L8.46455 14.0209L6.34323 11.8996L8.46455 9.77828L11.293 12.6067L12.7072 11.1925L9.87876 8.36407L12.0001 6.24275L14.1214 8.36407L15.5356 6.94986L13.4143 4.82853L16.2427 2.00011C16.6332 1.60958 17.2664 1.60958 17.6569 2.00011L22.6067 6.94986C22.9972 7.34038 22.9972 7.97354 22.6067 8.36407L7.75744 23.2133C7.36692 23.6038 6.73375 23.6038 6.34323 23.2133L1.39348 18.2636C1.00295 17.873 1.00295 17.2399 1.39348 16.8494L4.92901 13.3138Z"/></svg>` },
        { id: 'eplanning-rekening', key: null, adminOnly: true, label: 'Rekening', page: 'page-eplanning-rekening', loader: () => epLoadMasterRekening(1), icon: `<svg class="ic-line" xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M2 20H22V22H2V20ZM4 12H6V19H4V12ZM9 12H11V19H9V12ZM13 12H15V19H13V12ZM18 12H20V19H18V12ZM2 7L12 2L22 7V11H2V7ZM4 8.23607V9H20V8.23607L12 4.23607L4 8.23607ZM12 8C11.4477 8 11 7.55228 11 7C11 6.44772 11.4477 6 12 6C12.5523 6 13 6.44772 13 7C13 7.55228 12.5523 8 12 8Z"/></svg><svg class="ic-fill" xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M2 20H22V22H2V20ZM4 12H6V19H4V12ZM9 12H11V19H9V12ZM13 12H15V19H13V12ZM18 12H20V19H18V12ZM2 7L12 2L22 7V11H2V7ZM12 8C12.5523 8 13 7.55228 13 7C13 6.44772 12.5523 6 12 6C11.4477 6 11 6.44772 11 7C11 7.55228 11.4477 8 12 8Z"/></svg>` },
        { id: 'eplanning-ref-prioritasprov', key: null, adminOnly: true, label: 'Prioritas Pembangunan Provinsi', page: 'page-eplanning-referensi', loader: () => epRefTabSwitch('prioritasprov'), icon: `<svg class="ic-line" xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none"><path d="M5 22v-8m0 0V4m0 10 2.47-.494a8.676 8.676 0 0 1 4.925.452 8.677 8.677 0 0 0 5.327.361l.214-.053A1.404 1.404 0 0 0 19 12.904V5.537a1.2 1.2 0 0 0-1.49-1.164 7.999 7.999 0 0 1-4.911-.334l-.204-.081a8.677 8.677 0 0 0-4.924-.452L5 4m0 0V2" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg><svg class="ic-fill" xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M5.75 1a.75.75 0 0 1 .75.75V3.6l1.72-.344a8.677 8.677 0 0 1 4.925.452l.204.081a7.999 7.999 0 0 0 4.91.334 1.2 1.2 0 0 1 1.491 1.164v7.367c0 .644-.439 1.206-1.064 1.362l-.214.053a8.677 8.677 0 0 1-5.327-.361 8.676 8.676 0 0 0-4.924-.452L6.5 13.6v8.15a.75.75 0 0 1-1.5 0v-20A.75.75 0 0 1 5.75 1Z"/></svg>` },
        { id: 'eplanning-ref-prioritaskabkota', key: null, adminOnly: true, label: 'Prioritas Pembangunan Kab/Kota', page: 'page-eplanning-referensi', loader: () => epRefTabSwitch('prioritaskabkota'), icon: `<svg class="ic-line" xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none"><path d="M4 10.143C4 5.646 7.582 2 12 2s8 3.646 8 8.143c0 4.462-2.553 9.67-6.537 11.531a3.45 3.45 0 0 1-2.926 0C6.553 19.812 4 14.605 4 10.144Z" stroke="currentColor" stroke-width="1.5"/><circle cx="12" cy="10" r="3" stroke="currentColor" stroke-width="1.5"/></svg><svg class="ic-fill" xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path fill-rule="evenodd" clip-rule="evenodd" d="M12 2c-4.418 0-8 4.003-8 8.5 0 4.462 2.553 9.312 6.537 11.174a3.45 3.45 0 0 0 2.926 0C17.447 19.812 20 14.962 20 10.5 20 6.003 16.418 2 12 2Zm0 10a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z"/></svg>` },
        { id: 'eplanning-ref-bidangurusan', key: null, adminOnly: true, label: 'Bidang Urusan', page: 'page-eplanning-referensi', loader: () => epRefTabSwitch('bidangurusan'), icon: `<svg class="ic-line" xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none"><path d="M3 12c0 3.771 0 7.657 1.318 8.828C5.636 22 7.758 22 12 22c4.243 0 6.364 0 7.682-1.172C21 19.657 21 15.771 21 12" stroke="currentColor" stroke-width="1.5"/><path d="m14.66 14.202 6.008-1.802c.595-.179.893-.268 1.082-.482a.996.996 0 0 0 .1-.134c.15-.243.15-.553.15-1.175 0-2.45 0-3.675-.673-4.502a2.997 2.997 0 0 0-.434-.434C20.066 5 18.841 5 16.391 5H7.61c-2.45 0-3.675 0-4.502.673-.16.13-.305.275-.434.434C2 6.934 2 8.159 2 10.609c0 .622 0 .932.15 1.175.03.047.063.092.1.134.19.214.487.303 1.082.482l6.008 1.802M6.5 5c.823-.02 1.66-.545 1.94-1.32l.035-.103L8.5 3.5c.042-.127.064-.19.086-.246a2 2 0 0 1 1.735-1.25C10.38 2 10.448 2 10.58 2h2.838c.133 0 .2 0 .26.004a2 2 0 0 1 1.735 1.25c.023.056.044.12.086.246l.026.077c.018.053.026.08.035.103.28.775 1.116 1.3 1.939 1.32" stroke="currentColor" stroke-width="1.5"/><path d="M14 12.5h-4a.5.5 0 0 0-.5.5v2.162a.5.5 0 0 0 .314.464l.7.28a4 4 0 0 0 2.972 0l.7-.28a.5.5 0 0 0 .314-.464V13a.5.5 0 0 0-.5-.5Z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg><svg class="ic-fill" xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path fill-rule="evenodd" clip-rule="evenodd" d="M10.275 2.255c.084-.005.172-.005.286-.005h2.879c.113 0 .201 0 .285.005a2.75 2.75 0 0 1 2.385 1.72c.031.077.06.16.095.268l.003.01c.084.224.275.479.543.683.03.023.06.044.09.064 2.153.003 3.277.042 4.052.673.16.13.305.275.434.434.673.827.673 2.052.673 4.502 0 .622 0 .932-.15 1.175a.996.996 0 0 1-.1.134c-.19.214-.487.303-1.082.482L16 13.8V13a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v.8l-4.668-1.4c-.595-.179-.893-.268-1.082-.482a1.002 1.002 0 0 1-.1-.134C2 11.541 2 11.231 2 10.609c0-2.45 0-3.675.673-4.502.13-.16.275-.305.434-.434.775-.63 1.899-.67 4.053-.673.03-.02.06-.041.09-.064.267-.204.459-.46.542-.683.038-.114.066-.2.098-.279a2.75 2.75 0 0 1 2.385-1.719Zm4.544 2.563c.024.062.05.122.08.182H9.101c.029-.06.055-.12.08-.182v-.003l.005-.01.005-.012.005-.012.003-.01.002-.005.004-.012.004-.012.002-.006.003-.008.002-.007.002-.006c.039-.116.051-.153.063-.181a1.25 1.25 0 0 1 1.084-.782c.032-.002.072-.002.215-.002h2.838c.143 0 .183 0 .215.002.482.03.904.334 1.085.782.01.028.023.063.062.181l.002.006.002.007.003.008.002.006.004.012.004.012.002.005.004.01.004.012.005.012.004.01.002.003ZM14 12.5h-4a.5.5 0 0 0-.5.5v2.162a.5.5 0 0 0 .314.464l.7.28a4 4 0 0 0 2.972 0l.7-.28a.5.5 0 0 0 .314-.464V13a.5.5 0 0 0-.5-.5Zm-5.99 2.87-5.004-1.502c.03 3.114.212 5.982 1.312 6.96C5.636 22 7.758 22 12 22c4.242 0 6.364 0 7.682-1.172 1.1-.977 1.282-3.846 1.312-6.96l-5.005 1.501a2 2 0 0 1-1.246 1.65l-.7.28a5.5 5.5 0 0 1-4.086 0l-.7-.28a2 2 0 0 1-1.246-1.65Z"/></svg>` },
        { id: 'eplanning-ref-tagbelanja', key: null, adminOnly: true, label: 'Label (Tag) Sub Kegiatan', page: 'page-eplanning-referensi', loader: () => epRefTabSwitch('tagbelanja'), icon: `<svg class="ic-line" xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none"><path d="M4.728 16.137c-1.545-1.546-2.318-2.318-2.605-3.321-.288-1.003-.042-2.068.45-4.197l.283-1.228c.413-1.792.62-2.688 1.233-3.302.614-.613 1.51-.82 3.302-1.233l1.228-.284c2.13-.491 3.194-.737 4.197-.45 1.003.288 1.775 1.061 3.32 2.606l1.83 1.83C20.657 9.248 22 10.592 22 12.262c0 1.671-1.345 3.015-4.034 5.704C15.277 20.657 13.933 22 12.262 22c-1.67 0-3.015-1.345-5.704-4.034l-1.83-1.83Z" stroke="currentColor" stroke-width="1.5"/><circle cx="8.607" cy="8.879" r="2" transform="rotate(-45 8.607 8.879)" stroke="currentColor" stroke-width="1.5"/><path d="m11.542 18.5 6.979-6.98" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg><svg class="ic-fill" xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path fill-rule="evenodd" clip-rule="evenodd" d="M2.123 12.816c.287 1.003 1.06 1.775 2.605 3.32l1.83 1.83C9.248 20.657 10.592 22 12.262 22c1.671 0 3.015-1.345 5.704-4.034C20.657 15.277 22 13.933 22 12.262c0-1.67-1.345-3.015-4.034-5.704l-1.83-1.83c-1.545-1.545-2.317-2.318-3.32-2.605-1.003-.288-2.068-.042-4.197.45l-1.228.283c-1.792.413-2.688.62-3.302 1.233-.613.614-.82 1.51-1.233 3.302l-.284 1.228c-.491 2.13-.737 3.194-.45 4.197Zm8-5.545a2.017 2.017 0 1 1-2.852 2.852 2.017 2.017 0 0 1 2.852-2.852Zm8.928 4.78-6.979 6.98a.75.75 0 0 1-1.06-1.061l6.978-6.98a.75.75 0 0 1 1.061 1.061Z"/></svg>` },
      ] },
    ],
  },
];

let _activeSubId = null;
let _openGroups  = {};

function buildSidebar() {
  const nav = document.getElementById('sidebarNav');
  nav.innerHTML = '';
  const collapsed = _sidebarCollapsed;
  _bindNavTooltips();

  if (_user.is_admin || hasAccess('dashboard')) {
    const dashEl = document.createElement('div');
    dashEl.className = 'nav-item' + (_activeSubId === 'dashboard' ? ' active' : '');
    dashEl.dataset.sub = 'dashboard';
    if (collapsed) dashEl.dataset.tooltip = 'Dashboard Utama';
    dashEl.innerHTML = `<span class="nav-icon-box"><svg class="ic-line" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M14 21C13.4477 21 13 20.5523 13 20V12C13 11.4477 13.4477 11 14 11H20C20.5523 11 21 11.4477 21 12V20C21 20.5523 20.5523 21 20 21H14ZM4 13C3.44772 13 3 12.5523 3 12V4C3 3.44772 3.44772 3 4 3H10C10.5523 3 11 3.44772 11 4V12C11 12.5523 10.5523 13 10 13H4ZM9 11V5H5V11H9ZM4 21C3.44772 21 3 20.5523 3 20V16C3 15.4477 3.44772 15 4 15H10C10.5523 15 11 15.4477 11 16V20C11 20.5523 10.5523 21 10 21H4ZM5 19H9V17H5V19ZM15 19H19V13H15V19ZM13 4C13 3.44772 13.4477 3 14 3H20C20.5523 3 21 3.44772 21 4V8C21 8.55228 20.5523 9 20 9H14C13.4477 9 13 8.55228 13 8V4ZM15 5V7H19V5H15Z"/></svg><svg class="ic-fill" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M3 12C3 12.5523 3.44772 13 4 13H10C10.5523 13 11 12.5523 11 12V4C11 3.44772 10.5523 3 10 3H4C3.44772 3 3 3.44772 3 4V12ZM3 20C3 20.5523 3.44772 21 4 21H10C10.5523 21 11 20.5523 11 20V16C11 15.4477 10.5523 15 10 15H4C3.44772 15 3 15.4477 3 16V20ZM13 20C13 20.5523 13.4477 21 14 21H20C20.5523 21 21 20.5523 21 20V12C21 11.4477 20.5523 11 20 11H14C13.4477 11 13 11.4477 13 12V20ZM14 3C13.4477 3 13 3.44772 13 4V8C13 8.55228 13.4477 9 14 9H20C20.5523 9 21 8.55228 21 8V4C21 3.44772 20.5523 3 20 3H14Z"/></svg></span><span class="nav-item-label">Dashboard Utama</span>`;
    dashEl.onclick = () => navigateTo('dashboard', 'Dashboard Utama', loadDashboard);
    nav.appendChild(dashEl);
  }

  for (const group of MENUS) {
    if (group.adminOnly && !_user.is_admin) continue;

    const visibleChildren = group.children.filter(c => {
      if (c.children) {
        
        
        
        if (c.adminOnly && !_user.is_admin) return false;
        const visibleGrand = c.children.filter(gc => {
          if (gc.adminOnly && !_user.is_admin) return false;
          if (gc.showIf && !gc.showIf()) return false;
          return !gc.key || hasAccess(gc.key);
        });
        c._visibleChildren = visibleGrand;
        return visibleGrand.length > 0;
      }
      if (c.adminOnly && !_user.is_admin) return false;
      if (c.showIf && !c.showIf()) return false;
      return !c.key || hasAccess(c.key);
    });
    if (!visibleChildren.length) continue;

    const groupHasActive = visibleChildren.some(c => c.id === _activeSubId || (c._visibleChildren && c._visibleChildren.some(gc => gc.id === _activeSubId)));
    const groupItem = document.createElement('div');
    groupItem.className = 'nav-item' + (groupHasActive ? ' has-active' : '');
    groupItem.dataset.group = group.id;
    groupItem.innerHTML = `<span class="nav-icon-box">${group.icon}</span><span class="nav-item-label">${group.label}</span><svg class="nav-chevron${_openGroups[group.id] ? ' open' : ''}" id="chev-${group.id}" xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7"/></svg>`;
    groupItem.onclick = () => {
      if (collapsed) {
        _sidebarCollapsed = false;
        try { localStorage.setItem('sapa_sidebar_collapsed', '0'); } catch(e) {}
        _openGroups = {}; _openGroups[group.id] = true;
        _applySidebarCollapse();
      } else {
        toggleGroup(group.id);
      }
    };
    nav.appendChild(groupItem);

    const sub = document.createElement('div');
    sub.className = 'nav-sub' + (_openGroups[group.id] ? ' open' : '');
    sub.id = 'sub-' + group.id;

    let _hoverTimer = null;
    const _openHover = () => {
      if (_sidebarCollapsed) return;
      clearTimeout(_hoverTimer);
      sub.classList.add('open');
      const chev = document.getElementById('chev-' + group.id);
      if (chev) chev.classList.add('open');
    };
    const _closeHover = () => {
      if (_sidebarCollapsed) return;
      
      
      
      
      const stillHasActive = sub.querySelector('.nav-sub-item.active, .nav-sub-sub-item.active');
      if (_openGroups[group.id] && stillHasActive) return;
      _hoverTimer = setTimeout(() => {
        sub.classList.remove('open');
        const chev = document.getElementById('chev-' + group.id);
        if (chev) chev.classList.remove('open');
      }, 150);
    };
    groupItem.addEventListener('mouseenter', _openHover);
    groupItem.addEventListener('mouseleave', _closeHover);
    sub.addEventListener('mouseenter', () => clearTimeout(_hoverTimer));
    sub.addEventListener('mouseleave', _closeHover);

    for (const child of visibleChildren) {
      if (child.children) {
        
        const branchHasActive = child._visibleChildren.some(gc => gc.id === _activeSubId);
        const branchItem = document.createElement('div');
        branchItem.className = 'nav-sub-item nav-sub-group' + (branchHasActive ? ' has-active' : '');
        branchItem.dataset.subgroup = child.id;
        if (collapsed) branchItem.dataset.tooltip = child.label;
        branchItem.innerHTML = `<span class="nav-icon-box">${child.icon}</span><span class="nav-sub-item-label">${child.label}</span><svg class="nav-chevron${_openGroups[child.id] ? ' open' : ''}" id="chev-${child.id}" xmlns="http://www.w3.org/2000/svg" width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7"/></svg>`;
        branchItem.onclick = () => {
          if (_sidebarCollapsed) {
            _sidebarCollapsed = false;
            try { localStorage.setItem('sapa_sidebar_collapsed', '0'); } catch(e) {}
            _openGroups[group.id] = true;
            _openGroups[child.id] = true;
            _applySidebarCollapse();
          } else {
            toggleSubGroup(child.id);
          }
        };
        sub.appendChild(branchItem);

        const subsub = document.createElement('div');
        subsub.className = 'nav-sub-sub' + (_openGroups[child.id] ? ' open' : '');
        subsub.id = 'sub-' + child.id;

        let _hoverTimerSub = null;
        const _openHoverSub = () => {
          if (_sidebarCollapsed) return;
          clearTimeout(_hoverTimerSub);
          subsub.classList.add('open');
          const chevSub = document.getElementById('chev-' + child.id);
          if (chevSub) chevSub.classList.add('open');
        };
        const _closeHoverSub = () => {
          if (_sidebarCollapsed) return;
          const stillHasActive = subsub.querySelector('.nav-sub-sub-item.active');
          if (_openGroups[child.id] && stillHasActive) return;
          _hoverTimerSub = setTimeout(() => {
            subsub.classList.remove('open');
            const chevSub = document.getElementById('chev-' + child.id);
            if (chevSub) chevSub.classList.remove('open');
          }, 150);
        };
        branchItem.addEventListener('mouseenter', _openHoverSub);
        branchItem.addEventListener('mouseleave', _closeHoverSub);
        subsub.addEventListener('mouseenter', () => clearTimeout(_hoverTimerSub));
        subsub.addEventListener('mouseleave', _closeHoverSub);

        for (const grand of child._visibleChildren) {
          const gitem = document.createElement('div');
          gitem.className = 'nav-sub-sub-item' + (_activeSubId === grand.id ? ' active' : '');
          gitem.dataset.sub = grand.id;
          if (collapsed) gitem.dataset.tooltip = grand.label;
          gitem.innerHTML = `<span class="nav-icon-box">${grand.icon || '<span class="nav-sub-sub-dot"></span>'}</span><span class="nav-sub-sub-item-label">${grand.label}</span>`;
          gitem.onclick = () => navigateTo(grand.id, grand.label, grand.loader, group.id, grand.page, child.id);
          subsub.appendChild(gitem);
        }
        sub.appendChild(subsub);
        continue;
      }
      const item = document.createElement('div');
      item.className = 'nav-sub-item' + (_activeSubId === child.id ? ' active' : '');
      item.dataset.sub = child.id;
      if (collapsed) item.dataset.tooltip = child.label;
      item.innerHTML = `<span class="nav-icon-box">${child.icon}</span><span class="nav-sub-item-label">${child.label}</span>`;
      item.onclick = () => navigateTo(child.id, child.label, child.loader, group.id, child.page);
      sub.appendChild(item);
    }
    nav.appendChild(sub);
  }
}

function setSidebarActiveState() {
  const nav = document.getElementById('sidebarNav');
  if (!nav) return;

  
  nav.querySelectorAll('.nav-item[data-sub], .nav-sub-item[data-sub], .nav-sub-sub-item[data-sub]').forEach(el => {
    el.classList.toggle('active', el.dataset.sub === _activeSubId);
  });

  
  nav.querySelectorAll('.nav-item[data-group]').forEach(groupEl => {
    const gid = groupEl.dataset.group;
    const sub = document.getElementById('sub-' + gid);
    const hasActive = !!(sub && (sub.querySelector('.nav-sub-item.active') || sub.querySelector('.nav-sub-sub-item.active')));
    groupEl.classList.toggle('has-active', hasActive);
  });

  
  nav.querySelectorAll('.nav-sub-item[data-subgroup]').forEach(branchEl => {
    const bid = branchEl.dataset.subgroup;
    const subsub = document.getElementById('sub-' + bid);
    const hasActive = !!(subsub && subsub.querySelector('.nav-sub-sub-item.active'));
    branchEl.classList.toggle('has-active', hasActive);
  });

  
  
  nav.querySelectorAll('.nav-sub, .nav-sub-sub').forEach(subEl => {
    const gid = subEl.id.replace('sub-', '');
    const shouldOpen = !!_openGroups[gid];
    subEl.classList.toggle('open', shouldOpen);
    const chev = document.getElementById('chev-' + gid);
    if (chev) chev.classList.toggle('open', shouldOpen);
  });
}

function toggleGroup(id) {
  const isOpen = _openGroups[id];
  
  _openGroups = {};
  
  if (!isOpen) _openGroups[id] = true;
  setSidebarActiveState();
}

function toggleSubGroup(id) {
  _openGroups[id] = !_openGroups[id];
  setSidebarActiveState();
}

let _currentLoader = null;

function navigateTo(subId, label, loader, groupId, pageId, subGroupId) {
  _activeSubId = subId;
  if (groupId) { _openGroups = {}; _openGroups[groupId] = true; }
  if (subGroupId) { _openGroups[subGroupId] = true; }

  
  try {
    sessionStorage.setItem('sapa_nav', JSON.stringify({
      subId, label, groupId: groupId || null, pageId: pageId || null, subGroupId: subGroupId || null
    }));
  } catch(e) {}

  
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  const targetPage = pageId || 'page-dashboard';
  const el = document.getElementById(targetPage);
  if (el) el.classList.add('active');

  
  setSidebarActiveState();
  closeSidebar();

  if (loader) { _currentLoader = loader; loader(); }
}

function openSidebar()  { document.getElementById('sidebar').classList.add('open'); document.getElementById('sidebarOverlay').classList.add('open'); }
function closeSidebar() { document.getElementById('sidebar').classList.remove('open'); document.getElementById('sidebarOverlay').classList.remove('open'); }

let _sidebarCollapsed = false;
try { _sidebarCollapsed = localStorage.getItem('sapa_sidebar_collapsed') === '1'; } catch(e) {}

function _applySidebarCollapse() {
  const sidebar = document.getElementById('sidebar');
  const main    = document.querySelector('.main');
  const topbar  = document.getElementById('topbar');
  const icon    = document.getElementById('iconSidebarCollapse');
  const btn     = document.getElementById('btnSidebarCollapse');
  if (!sidebar) return;
  if (_sidebarCollapsed) {
    sidebar.classList.add('collapsed');
    if (main)   main.classList.add('sidebar-collapsed');
    if (topbar) topbar.classList.add('sidebar-collapsed');
    if (icon)   icon.style.transform = 'rotate(180deg)';
  } else {
    sidebar.classList.remove('collapsed');
    if (main)   main.classList.remove('sidebar-collapsed');
    if (topbar) topbar.classList.remove('sidebar-collapsed');
    if (icon)   icon.style.transform = '';
  }
  if (btn) _bindToggleBtnTooltip(btn);
  buildSidebar();
}

let _toggleTooltipEl = null;
function _ensureToggleTooltipEl() {
  if (_toggleTooltipEl) return _toggleTooltipEl;
  const el = document.createElement('div');
  el.id = 'tooltipSidebarToggle';
  document.body.appendChild(el);
  _toggleTooltipEl = el;
  return el;
}
function _bindToggleBtnTooltip(btn) {
  if (btn._tooltipBound) return;
  btn._tooltipBound = true;
  btn.addEventListener('mouseenter', () => {
    const tip = _ensureToggleTooltipEl();
    tip.textContent = _sidebarCollapsed ? 'Buka sidebar' : 'Tutup sidebar';
    const r = btn.getBoundingClientRect();
    tip.style.left = (r.right + 10) + 'px';
    tip.style.top  = (r.top + r.height / 2) + 'px';
    tip.classList.add('show');
  });
  btn.addEventListener('mouseleave', () => {
    if (_toggleTooltipEl) _toggleTooltipEl.classList.remove('show');
  });
  btn.addEventListener('click', () => {
    if (_toggleTooltipEl) _toggleTooltipEl.classList.remove('show');
  });
}

function toggleSidebarCollapse() {
  _sidebarCollapsed = !_sidebarCollapsed;
  try { localStorage.setItem('sapa_sidebar_collapsed', _sidebarCollapsed ? '1' : '0'); } catch(e) {}
  _applySidebarCollapse();
}

let _navTooltipEl = null;
function _ensureNavTooltipEl() {
  if (_navTooltipEl) return _navTooltipEl;
  const el = document.createElement('div');
  el.className = 'nav-fixed-tooltip';
  document.body.appendChild(el);
  _navTooltipEl = el;
  return el;
}
function _bindNavTooltips() {
  const nav = document.getElementById('sidebarNav');
  if (!nav || nav._tooltipBound) return;
  nav._tooltipBound = true;
  nav.addEventListener('mouseover', (e) => {
    if (!_sidebarCollapsed) return;
    const target = e.target.closest('[data-tooltip]');
    if (!target) return;
    const tip = _ensureNavTooltipEl();
    tip.textContent = target.dataset.tooltip;
    const iconEl = target.querySelector('svg') || target;
    const r = iconEl.getBoundingClientRect();
    tip.style.left = (r.right + 10) + 'px';
    tip.style.top  = (r.top + r.height / 2) + 'px';
    tip.classList.add('show');
  });
  nav.addEventListener('mouseout', (e) => {
    const target = e.target.closest('[data-tooltip]');
    if (!target) return;
    if (target.contains(e.relatedTarget)) return;
    if (_navTooltipEl) _navTooltipEl.classList.remove('show');
  });
  
  
  
  nav.addEventListener('click', () => {
    if (_navTooltipEl) _navTooltipEl.classList.remove('show');
  });
}

let _qtipEl = null;
function _ensureQtipEl() {
  if (_qtipEl) return _qtipEl;
  const el = document.createElement('div');
  el.className = 'qtip-box';
  document.body.appendChild(el);
  _qtipEl = el;
  return el;
}
function _qtipPosition(target) {
  const tip = _ensureQtipEl();
  const r = target.getBoundingClientRect();
  const tipRect = tip.getBoundingClientRect();

  let top = r.top - tipRect.height - 8;
  let placement = 'qtip-top';
  if (top < 4) { top = r.bottom + 8; placement = 'qtip-bottom'; }

  let left = r.left + r.width / 2 - tipRect.width / 2;
  left = Math.max(6, Math.min(left, window.innerWidth - tipRect.width - 6));

  tip.classList.remove('qtip-top', 'qtip-bottom');
  tip.classList.add(placement);
  tip.style.left = left + 'px';
  tip.style.top  = top + 'px';

  
  const arrowLeft = Math.max(10, Math.min(r.left + r.width / 2 - left, tipRect.width - 10));
  tip.style.setProperty('--qtip-arrow-left', arrowLeft + 'px');
}
function _bindQtips() {
  if (document.body._qtipBound) return;
  document.body._qtipBound = true;
  document.body.addEventListener('mouseover', (e) => {
    const target = e.target.closest('[data-tip]');
    if (!target || !target.dataset.tip) return;
    const tip = _ensureQtipEl();
    tip.textContent = target.dataset.tip;
    tip.classList.remove('qtip-danger', 'qtip-success');
    if (target.dataset.tipVariant) tip.classList.add('qtip-' + target.dataset.tipVariant);
    tip.classList.add('show');
    _qtipPosition(target);
  });
  document.body.addEventListener('mouseout', (e) => {
    const target = e.target.closest('[data-tip]');
    if (!target) return;
    if (target.contains(e.relatedTarget)) return;
    if (_qtipEl) _qtipEl.classList.remove('show');
  });
  document.body.addEventListener('scroll', () => {
    if (_qtipEl) _qtipEl.classList.remove('show');
  }, true);
  
  
  
  document.body.addEventListener('click', () => {
    if (_qtipEl) _qtipEl.classList.remove('show');
  }, true);
}
_bindQtips();

const TOAST_ICONS = {
  success: `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"/></svg>`,
  error:   `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>`,
  info:    `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>`,
  warning: `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>`,
};
const TOAST_TITLES = { success: 'Berhasil', error: 'Gagal', info: 'Info', warning: 'Perhatian' };
function toast(msg, type = 'success') {
  const c = document.getElementById('toastContainer');
  const t = document.createElement('div');
  t.className = 'toast ' + type;
  t.innerHTML = `
    <div class="toast-icon">${TOAST_ICONS[type] || TOAST_ICONS.info}</div>
    <div class="toast-body">
      <div class="toast-title">${TOAST_TITLES[type] || 'Info'}</div>
      <div class="toast-msg">${esc(msg)}</div>
    </div>
    <button class="toast-close" onclick="this.parentElement.remove()">
      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>
    </button>`;
  c.appendChild(t);
  setTimeout(() => {
    t.style.transition = 'opacity .3s, transform .3s';
    t.style.opacity = '0'; t.style.transform = 'translateX(20px)';
    setTimeout(() => t.remove(), 300);
  }, 3500);
}

let _confirmResolve = null;
const CONFIRM_ICONS = {
  trash: `<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path stroke-linecap="round" stroke-linejoin="round" d="M19 6l-1 14H6L5 6"/><path stroke-linecap="round" stroke-linejoin="round" d="M10 11v6m4-6v6"/><path stroke-linecap="round" stroke-linejoin="round" d="M9 6V4h6v2"/></svg>`,
  person: `<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/></svg>`,
  wave: `<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" x2="9" y1="12" y2="12"/></svg>`,
};
function showConfirm({ title = 'Konfirmasi', msg = 'Apakah Anda yakin?', okText = 'Ya, Lanjutkan', type = 'danger', icon = 'trash' } = {}) {
  return new Promise(resolve => {
    _confirmResolve = resolve;
    document.getElementById('confirmTitle').textContent = title;
    document.getElementById('confirmMsg').innerHTML = msg;
    
    const okIconSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"/></svg>`;
    document.getElementById('confirmOk').innerHTML = okIconSvg + ' ' + okText;
    document.getElementById('confirmOk').className = type === 'warning' ? 'warning-btn' : '';
    document.getElementById('confirmIcon').innerHTML = CONFIRM_ICONS[icon] || CONFIRM_ICONS.trash;
    document.getElementById('confirmIcon').className = type === 'warning' ? 'warning' : 'danger';
    document.getElementById('confirmHeader').className = type === 'warning' ? 'warning' : 'danger';
    document.getElementById('confirmOverlay').classList.add('open');
    document.getElementById('confirmOk').onclick = () => { resolve(true); _confirmResolve = null; closeConfirm(); };
  });
}
function closeConfirm() {
  document.getElementById('confirmOverlay').classList.remove('open');
  if (_confirmResolve) { _confirmResolve(false); _confirmResolve = null; }
}
document.getElementById('confirmOverlay').addEventListener('click', e => {
  if (e.target === document.getElementById('confirmOverlay')) closeConfirm();
});

function openModal(id)  { document.getElementById(id).classList.add('open'); }
function closeModal(id) { document.getElementById(id).classList.remove('open'); }
function esc(s) { return String(s||'').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
function fmtDate(s) { if (!s) return '-'; const d = new Date(s); const tgl = d.toLocaleDateString('id-ID', {day:'2-digit',month:'short',year:'numeric',timeZone:'Asia/Makassar'}); const opt = {timeZone:'Asia/Makassar'}; const wita = new Date(d.toLocaleString('en-US', opt)); const hh = String(wita.getHours()).padStart(2,'0'); const mm = String(wita.getMinutes()).padStart(2,'0'); return `${tgl}, ${hh}:${mm} WITA`; }

function renderPagination(containerId, total, page, limit, onPageChange) {
  const pages = Math.ceil(total / limit);
  const c = document.getElementById(containerId);
  if (!c) return;
  if (total <= 0) { c.innerHTML = ''; return; }

  const from = (page - 1) * limit + 1;
  const to   = Math.min(page * limit, total);
  const info = `<div class="pagination-info">Menampilkan ${from}-${to} dari ${total} data</div>`;

  if (pages <= 1) { c.innerHTML = ''; return; }
  const cb = typeof onPageChange === 'function' ? onPageChange : (p => { window[onPageChange] && window[onPageChange](p); });
  if (typeof onPageChange === 'function') _pgRegister(containerId, cb);
  const btn = (disabled, onclick, svg) =>
    `<button class="page-btn" ${disabled ? 'disabled' : ''} onclick="${onclick}">${svg}</button>`;
  const svgFirst = `<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M11 19l-7-7 7-7M18 19l-7-7 7-7"/></svg>`;
  const svgPrev  = `<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7"/></svg>`;
  const svgNext  = `<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7"/></svg>`;
  const svgLast  = `<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M6 5l7 7-7 7M13 5l7 7-7 7"/></svg>`;
  const call  = (p) => typeof onPageChange === 'function' ? `_pgCall('${containerId}',${p})` : `${onPageChange}(${p})`;
  let html = '<div class="pagination">';
  html += btn(page === 1,     call(1),        svgFirst);
  html += btn(page === 1,     call(page - 1), svgPrev);
  for (let i = 1; i <= pages; i++) {
    if (pages > 7 && Math.abs(i - page) > 2 && i !== 1 && i !== pages) {
      if (i === 2 || i === pages - 1) html += '<span style="color:var(--teks-muted);padding:0 4px">…</span>';
      continue;
    }
    html += `<button class="page-btn${i === page ? ' active' : ''}" onclick="${call(i)}">${i}</button>`;
  }
  html += btn(page === pages, call(page + 1), svgNext);
  html += btn(page === pages, call(pages),    svgLast);
  html += '</div>';
  c.innerHTML = `<div class="pagination-wrap">${info}${html}</div>`;
}

const _pgCallbacks = {};
function _pgRegister(containerId, cb) { _pgCallbacks[containerId] = cb; }
function _pgCall(containerId, page) { _pgCallbacks[containerId] && _pgCallbacks[containerId](page); }

function _renderAvatarInto(el, fotoUrl) {
  if (!el) return;
  const initial = (_user?.nama || 'U')[0].toUpperCase();
  if (fotoUrl) {
    const img = document.createElement('img');
    img.src = fotoUrl;
    img.alt = '';
    img.onerror = () => { el.textContent = initial; };
    el.replaceChildren(img);
  } else {
    el.textContent = initial;
  }
}
function _applyTopbarAvatar(fotoUrl) {
  _renderAvatarInto(document.getElementById('topbarAvatarInner'), fotoUrl);
  _renderAvatarInto(document.getElementById('ddAvatar'), fotoUrl);
}

async function _bootRefreshFoto() {
  try {
    const cacheKey = `sapa_user_foto_${_user.id}`;
    const cached = sessionStorage.getItem(cacheKey);
    if (cached !== null) _applyTopbarAvatar(cached || null);
    const r = await fetch(`/api/users/${_user.id}/foto`, { headers: authHeaders() });
    if (r.ok) {
      const d = await r.json();
      _user.foto_url = d.foto_url || null;
      sessionStorage.setItem(cacheKey, _user.foto_url || '');
      _applyTopbarAvatar(_user.foto_url);
    }
  } catch {}
}

// Refresh tanda tangan user dari server (bisa beda dari yang tersimpan di token/login lama)
// - dipakai buat syarat wajib tanda tangan sebelum submit/verifikasi usulan e-Planning.
async function _bootRefreshTandaTangan() {
  try {
    const r = await fetch(`/api/users/${_user.id}/tanda-tangan`, { headers: authHeaders() });
    if (r.ok) {
      const d = await r.json();
      _user.tanda_tangan = d.tanda_tangan || null;
      sessionStorage.setItem('sapa_user', JSON.stringify(_user));
    }
  } catch {}
}

(function _domReady(fn) { if (document.readyState === 'loading') { window.addEventListener('DOMContentLoaded', fn); } else { fn(); } })(function() {
  if (!initAuth()) return;

  
  _applyTopbarAvatar(_user.foto_url || null);
  document.getElementById('topbarName').textContent = _user.nama;
  document.getElementById('topbarRole').textContent = _user.is_admin ? 'Super Admin' : (_user.bidang_nama || '');
  document.getElementById('ddName').textContent = _user.nama;
  
  const _ddRoleEl = document.getElementById('ddRole');
  if (_ddRoleEl) { _ddRoleEl.textContent = 'Super Admin'; _ddRoleEl.style.display = _user.is_admin ? '' : 'none'; }
  (function() {
    const ddBidang = document.getElementById('ddBidang');
    if (ddBidang && !_user.is_admin && _user.bidang_nama) {
      ddBidang.textContent = _user.bidang_nama;
      ddBidang.style.display = '';
    }
  })();

  _openGroups = {};

  _activeSubId = '';

  const _bootRefreshUser = async () => {
    if (!_user || _user.is_admin) return;
    if (_user.bidang_nama) return;
    try {
      const r = await fetch('/api/auth/me', { headers: authHeaders() });
      if (r.ok) {
        const d = await r.json();
        if (d.user?.bidang_nama) {
          _user.bidang_nama      = d.user.bidang_nama;
          _user.bidang_id        = d.user.bidang_id;
          _user.bidang_singkatan = d.user.bidang_singkatan;
          sessionStorage.setItem('sapa_user', JSON.stringify(_user));
          
          const trEl = document.getElementById('topbarRole');
          if (trEl) trEl.textContent = _user.bidang_nama;
          const ddBidang = document.getElementById('ddBidang');
          if (ddBidang) { ddBidang.textContent = _user.bidang_nama; ddBidang.style.display = ''; }
        }
      }
    } catch {}
  };

  // Dijalanin langsung, paralel sama chain init di bawah - gak perlu nunggu
  // loadPeriodeAktif/bootRefresh/cekKinerja kelar dulu biar modal reminder
  // absensi nggak lambat muncul pas baru login.
  if (typeof _startAbsensiReminderPoll === 'function') _startAbsensiReminderPoll();

  loadPeriodeAktif()
    .then(() => Promise.all([_bootRefreshUser(), _bootRefreshFoto(), _bootRefreshTandaTangan()]))
    .then(() => _cekKinerjaIndikator())
    .finally(() => {
      buildSidebar();
      _applySidebarCollapse();
      _startPeriodeTimer();

      // Menu "Tanda Tangan Saya" cuma relevan buat user yang butuh ttd di e-Planning (Super Admin dikecualikan).
      const btnTandaTanganDD = document.getElementById('btnTandaTanganDD');
      if (btnTandaTanganDD) btnTandaTanganDD.style.display = (typeof _epButuhTtd === 'function' && _epButuhTtd()) ? '' : 'none';

      
      if (typeof _cekPengajuanPendingReminder === 'function') _cekPengajuanPendingReminder();

      // Popup pengingat tanda tangan - kasih jeda dikit biar gak numpuk sama modal reminder lain pas baru login.
      setTimeout(() => { if (typeof _cekTtdLoginPopup === 'function') _cekTtdLoginPopup(); }, 1200);

      
      
      
      let _restored = false;

      
      const _firstAccessibleChild = (onlyGroupId) => {
        for (const g of MENUS) {
          if (onlyGroupId && g.id !== onlyGroupId) continue;
          if (g.adminOnly && !_user.is_admin) continue;
          for (const c of (g.children || [])) {
            if (c.children) {
              if (c.adminOnly && !_user.is_admin) continue;
              for (const gc of c.children) {
                const canAccessGc = !gc.adminOnly || _user.is_admin;
                const keyOkGc     = !gc.key || hasAccess(gc.key);
                const showOkGc    = !gc.showIf || gc.showIf();
                if (canAccessGc && keyOkGc && showOkGc) return { child: gc, group: g, subGroup: c };
              }
              continue;
            }
            const canAccess = !c.adminOnly || _user.is_admin;
            const keyOk     = !c.key || hasAccess(c.key);
            const showOk    = !c.showIf || c.showIf();
            if (canAccess && keyOk && showOk) return { child: c, group: g };
          }
        }
        return null;
      };

      
      
      
      
      
      const _onlyKinerjaAvailable = !_user.is_admin && (() => {
        const hasOtherModule = MENUS.some(g => {
          if (g.id === 'kinerja' || g.adminOnly) return false;
          return (g.children || []).some(c => {
            const keyOk  = !c.key || hasAccess(c.key);
            const showOk = !c.showIf || c.showIf();
            return keyOk && showOk;
          });
        });
        const hasKinerjaMenu = !!_firstAccessibleChild('kinerja');
        return !hasOtherModule && hasKinerjaMenu;
      })();

      try {
        const _saved = sessionStorage.getItem('sapa_nav');
        if (_saved) {
          const nav = JSON.parse(_saved);
          
          if (nav.subId === 'dashboard' && (_user.is_admin || hasAccess('dashboard'))) {
            _activeSubId = 'dashboard';
            buildSidebar();
            loadDashboard();
            _restored = true;
          } else if (nav.subId === 'dashboard') {
            
            
            _restored = false;
          } else if (nav.subId && nav.subId !== 'dashboard') {
            let _found = false;
            for (const g of MENUS) {
              if (_found) break;
              for (const child of (g.children || [])) {
                if (child.id === nav.subId) {
                  const canAccess = !child.adminOnly || _user.is_admin;
                  const keyOk     = !child.key || hasAccess(child.key);
                  const showOk    = !child.showIf || child.showIf();
                  if (canAccess && keyOk && showOk) {
                    navigateTo(child.id, child.label, child.loader, g.id, child.page);
                    _restored = true;
                  }
                  _found = true;
                  break;
                }
                if (child.children) {
                  const grand = child.children.find(gc => gc.id === nav.subId);
                  if (grand) {
                    const canAccessSub = !child.adminOnly || _user.is_admin;
                    const canAccess = !grand.adminOnly || _user.is_admin;
                    const keyOk     = !grand.key || hasAccess(grand.key);
                    const showOk    = !grand.showIf || grand.showIf();
                    if (canAccessSub && canAccess && keyOk && showOk) {
                      navigateTo(grand.id, grand.label, grand.loader, g.id, grand.page, child.id);
                      _restored = true;
                    }
                    _found = true;
                    break;
                  }
                }
              }
            }
          }
        }
      } catch(e) {}

      if (!_restored) {
        if (!_user.is_admin && !hasAccess('dashboard')) {
          
          
          const found = _onlyKinerjaAvailable ? _firstAccessibleChild('kinerja') : _firstAccessibleChild(null);
          if (found) {
            navigateTo(found.child.id, found.child.label, found.child.loader, found.group.id, found.child.page, found.subGroup ? found.subGroup.id : null);
          } else {
            
            document.getElementById('mainContent').innerHTML =
              '<div style="padding:2rem;text-align:center;color:#6b7280;">Belum ada menu yang dapat diakses. Hubungi administrator.</div>';
          }
        } else {
          _activeSubId = 'dashboard';
          buildSidebar();
          loadDashboard();
        }
      }
    });
});

// Klik-di-luar-modal buat auto-close DIMATIKAN (2026-08) - modal cuma boleh nutup lewat tombol
// X/Batal eksplisit, biar user gak kehilangan progress isian gara-gara klik meleset ke backdrop
// (terutama modal yang isinya form panjang kayak Kelola Dokumen Usulan).
// document.querySelectorAll('.modal-overlay, .modal-overlay-main').forEach(overlay => {
//   overlay.addEventListener('click', e => { if (e.target === overlay) overlay.classList.remove('open'); });
// });

function toggleProfileDD() {
  document.getElementById('topbarDropdown').classList.toggle('open');
}

document.addEventListener('click', e => {
  const dd = document.getElementById('topbarDropdown');
  const btn = document.getElementById('topbarAvatar');
  if (dd && !dd.contains(e.target) && !(btn && btn.contains(e.target))) {
    dd.classList.remove('open');
  }
});

const BULAN_ID = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];
const HARI_ID  = ['Min','Sen','Sel','Rab','Kam','Jum','Sab'];

class DatePicker {
  constructor(containerId, { placeholder = 'Pilih tanggal', alignRight = false } = {}) {
    this.containerId = containerId;
    this.placeholder = placeholder;
    this.alignRight  = alignRight;
    this.value       = null;   
    this.viewYear    = null;
    this.viewMonth   = null;
    this.mode        = 'days'; 
    this._open       = false;
    this._render();
  }

  _container() { return document.getElementById(this.containerId); }

  _render() {
    const wrap = this._container();
    if (!wrap) return;
    wrap.innerHTML = `
      <div class="dp-input ${this._open ? 'open' : ''}" id="${this.containerId}-btn">
        <span id="${this.containerId}-label" class="${this.value ? '' : 'dp-input-placeholder'}">
          ${this.value ? this._fmtDisplay(this.value) : this.placeholder}
        </span>
      </div>
      ${this.value
        ? `<span class="dp-clear" id="${this.containerId}-clear" data-tip="Hapus"><svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="3"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/></svg></span>`
        : `<span class="dp-icon"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2"/><path stroke-linecap="round" d="M16 2v4M8 2v4M3 10h18"/></svg></span>`
      }
      ${this._open ? this._renderPopup() : ''}
    `;
    
    wrap.querySelector(`#${this.containerId}-btn`).addEventListener('click', e => { e.stopPropagation(); this._toggle(); });
    const clr = wrap.querySelector(`#${this.containerId}-clear`);
    if (clr) clr.addEventListener('click', e => { e.stopPropagation(); this.setValue(null); });
    if (this._open) this._bindPopupEvents();
  }

  _renderPopup() {
    const now = new Date();
    const vy = this.viewYear  ?? (this.value ? parseInt(this.value.slice(0,4)) : now.getFullYear());
    const vm = this.viewMonth ?? (this.value ? parseInt(this.value.slice(5,7))-1 : now.getMonth());
    this.viewYear  = vy;
    this.viewMonth = vm;

    if (this.mode === 'months') return this._renderMonthPicker(vy, vm);
    if (this.mode === 'years')  return this._renderYearPicker(vy);
    return this._renderDayPicker(vy, vm, now);
  }

  _renderDayPicker(vy, vm, now) {
    const first = new Date(vy, vm, 1).getDay();
    const daysInMonth = new Date(vy, vm+1, 0).getDate();
    const daysInPrev  = new Date(vy, vm, 0).getDate();
    let cells = '';
    for (let i = 0; i < first; i++) {
      const d = daysInPrev - first + 1 + i;
      cells += `<button class="dp-day other-month" data-date="${vy}-${String(vm).padStart(2,'0')}-${String(d).padStart(2,'0')}" disabled>${d}</button>`;
    }
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${vy}-${String(vm+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
      const isToday    = d === now.getDate() && vm === now.getMonth() && vy === now.getFullYear();
      const isSelected = dateStr === this.value;
      cells += `<button class="dp-day${isToday ? ' today' : ''}${isSelected ? ' selected' : ''}" data-pick="${dateStr}">${d}</button>`;
    }
    const remaining = 42 - first - daysInMonth;
    for (let d = 1; d <= remaining; d++) {
      cells += `<button class="dp-day other-month" disabled>${d}</button>`;
    }
    return `
      <div class="dp-popup${this.alignRight ? ' dp-right' : ''}" id="${this.containerId}-popup">
        <div class="dp-nav">
          <button class="dp-nav-btn" id="${this.containerId}-prev"><svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7"/></svg></button>
          <span class="dp-month-year">
            <span class="dp-my-part" data-switch="months">${BULAN_ID[vm]}</span>
            <span class="dp-my-part" data-switch="years">${vy}</span>
          </span>
          <button class="dp-nav-btn" id="${this.containerId}-next"><svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7"/></svg></button>
        </div>
        <div class="dp-weekdays">${HARI_ID.map(h=>`<div class="dp-weekday">${h}</div>`).join('')}</div>
        <div class="dp-days" id="${this.containerId}-days">${cells}</div>
      </div>`;
  }

  _renderMonthPicker(vy, vm) {
    const items = BULAN_ID.map((b,i) =>
      `<button class="dp-my-item${i===vm?' active':''}" data-m="${i}">${b.slice(0,3)}</button>`
    ).join('');
    return `
      <div class="dp-popup${this.alignRight ? ' dp-right' : ''}" id="${this.containerId}-popup">
        <div class="dp-nav">
          <button class="dp-nav-btn" id="${this.containerId}-prev"><svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7"/></svg></button>
          <span class="dp-month-year"><span class="dp-my-part" data-switch="years">${vy}</span></span>
          <button class="dp-nav-btn" id="${this.containerId}-next"><svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7"/></svg></button>
        </div>
        <div class="dp-my-grid">${items}</div>
      </div>`;
  }

  _renderYearPicker(vy) {
    const start = Math.floor(vy / 12) * 12;
    const items = Array.from({length:12},(_,i)=>start+i).map(y=>
      `<button class="dp-my-item${y===vy?' active':''}" data-y="${y}">${y}</button>`
    ).join('');
    return `
      <div class="dp-popup${this.alignRight ? ' dp-right' : ''}" id="${this.containerId}-popup">
        <div class="dp-nav">
          <button class="dp-nav-btn" id="${this.containerId}-prev"><svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7"/></svg></button>
          <span class="dp-year-label">${start}–${start+11}</span>
          <button class="dp-nav-btn" id="${this.containerId}-next"><svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7"/></svg></button>
        </div>
        <div class="dp-my-grid">${items}</div>
      </div>`;
  }

  _bindPopupEvents() {
    const wrap = this._container();
    const popup = wrap.querySelector(`#${this.containerId}-popup`);
    if (!popup) return;
    popup.addEventListener('click', e => e.stopPropagation());

    
    const prev = wrap.querySelector(`#${this.containerId}-prev`);
    const next = wrap.querySelector(`#${this.containerId}-next`);
    if (prev) prev.addEventListener('click', () => {
      if (this.mode === 'days')   { this.viewMonth--; if (this.viewMonth < 0) { this.viewMonth = 11; this.viewYear--; } }
      else if (this.mode === 'months') { this.viewYear--; }
      else if (this.mode === 'years')  { this.viewYear -= 12; }
      this._render();
    });
    if (next) next.addEventListener('click', () => {
      if (this.mode === 'days')   { this.viewMonth++; if (this.viewMonth > 11) { this.viewMonth = 0; this.viewYear++; } }
      else if (this.mode === 'months') { this.viewYear++; }
      else if (this.mode === 'years')  { this.viewYear += 12; }
      this._render();
    });

    
    wrap.querySelectorAll('[data-switch]').forEach(el => {
      el.addEventListener('click', () => {
        this.mode = el.dataset.switch;
        this._render();
      });
    });

    
    if (this.mode === 'days') {
      wrap.querySelectorAll(`[data-pick]`).forEach(btn => {
        btn.addEventListener('click', () => { this.setValue(btn.dataset.pick); this._close(); });
      });
    }

    
    if (this.mode === 'months') {
      wrap.querySelectorAll('[data-m]').forEach(btn => {
        btn.addEventListener('click', () => { this.viewMonth = parseInt(btn.dataset.m); this.mode = 'days'; this._render(); });
      });
    }

    
    if (this.mode === 'years') {
      wrap.querySelectorAll('[data-y]').forEach(btn => {
        btn.addEventListener('click', () => { this.viewYear = parseInt(btn.dataset.y); this.mode = 'months'; this._render(); });
      });
    }
  }

  _toggle() {
    this._open ? this._close() : this._open_();
  }
  _open_() {
    
    Object.values(_datepickers).forEach(dp => { if (dp !== this && dp._open) dp._close(); });
    this._open = true;
    this.mode = 'days';
    if (this.value) {
      this.viewYear  = parseInt(this.value.slice(0,4));
      this.viewMonth = parseInt(this.value.slice(5,7))-1;
    } else {
      const now = new Date();
      this.viewYear  = now.getFullYear();
      this.viewMonth = now.getMonth();
    }
    this._render();
  }
  _close() { this._open = false; this._render(); }

  setValue(dateStr) {
    this.value = dateStr || null;
    this._render();
    
    const hidden = document.getElementById(this.containerId.replace('dp-',''));
    if (hidden) hidden.value = this.value || '';
  }

  getValue() { return this.value; }

  _fmtDisplay(dateStr) {
    if (!dateStr) return '';
    const [y,m,d] = dateStr.split('-');
    return `${parseInt(d)} ${BULAN_ID[parseInt(m)-1]} ${y}`;
  }
}

const _datepickers = {};

function initDatePicker(id, opts = {}) {
  let hidden = document.getElementById(id);
  if (!hidden) {
    hidden = document.createElement('input');
    hidden.type = 'hidden';
    hidden.id = id;
    document.body.appendChild(hidden);
  }
  _datepickers[`dp-${id}`] = new DatePicker(`dp-${id}`, opts);
}

function dpSetValue(id, val) {
  const dp = _datepickers[`dp-${id}`];
  if (dp) dp.setValue(val || null);
}
function dpGetValue(id) {
  const dp = _datepickers[`dp-${id}`];
  return dp ? dp.getValue() : null;
}

document.addEventListener('click', () => {
  Object.values(_datepickers).forEach(dp => { if (dp._open) dp._close(); });
});

/* ── CTP inline: jam-only spinner, tanpa popup (lihat .ctp-inline di styles.css) ── */
class TimePicker {
  constructor(containerId, { value = null } = {}) {
    this.containerId = containerId;
    this.h  = 0;
    this.mi = 0;
    this._applyValue(value);
    this._render();
  }

  _container() { return document.getElementById(this.containerId); }

  _applyValue(value) {
    if (value && /^\d{1,2}:\d{2}/.test(value)) {
      const [h, mi] = value.split(':').map(Number);
      this.h = ((h % 24) + 24) % 24;
      this.mi = ((mi % 60) + 60) % 60;
    } else {
      this.h = 0; this.mi = 0;
    }
  }

  _render() {
    const wrap = this._container();
    if (!wrap) return;
    wrap.innerHTML = `
      <div class="ctp-inline" id="${this.containerId}-box">
        <svg class="ctp-inline-icon" xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
        <div class="cdtp-time-spin">
          <input type="number" class="cdtp-time-val" data-time="h" value="${String(this.h).padStart(2,'0')}" min="0" max="23" inputmode="numeric">
          <button type="button" class="cdtp-spin-btn" data-spin="h" data-dir="1" aria-label="Tambah jam"><svg xmlns="http://www.w3.org/2000/svg" width="9" height="9" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="3"><path stroke-linecap="round" stroke-linejoin="round" d="M5 15l7-7 7 7"/></svg></button>
          <button type="button" class="cdtp-spin-btn" data-spin="h" data-dir="-1" aria-label="Kurangi jam"><svg xmlns="http://www.w3.org/2000/svg" width="9" height="9" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="3"><path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7"/></svg></button>
        </div>
        <span class="cdtp-time-sep">:</span>
        <div class="cdtp-time-spin">
          <input type="number" class="cdtp-time-val" data-time="mi" value="${String(this.mi).padStart(2,'0')}" min="0" max="59" inputmode="numeric">
          <button type="button" class="cdtp-spin-btn" data-spin="mi" data-dir="1" aria-label="Tambah menit"><svg xmlns="http://www.w3.org/2000/svg" width="9" height="9" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="3"><path stroke-linecap="round" stroke-linejoin="round" d="M5 15l7-7 7 7"/></svg></button>
          <button type="button" class="cdtp-spin-btn" data-spin="mi" data-dir="-1" aria-label="Kurangi menit"><svg xmlns="http://www.w3.org/2000/svg" width="9" height="9" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="3"><path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7"/></svg></button>
        </div>
      </div>`;
    this._bind();
  }

  _bind() {
    const wrap = this._container();
    if (!wrap) return;
    wrap.querySelectorAll('[data-spin]').forEach(btn => {
      btn.addEventListener('click', e => {
        e.stopPropagation();
        const field = btn.dataset.spin;
        const dir   = parseInt(btn.dataset.dir);
        if (field === 'h') this.h = ((this.h + dir) % 24 + 24) % 24;
        else                this.mi = ((this.mi + dir) % 60 + 60) % 60;
        this._syncInput(field);
        this._commit();
      });
    });
    wrap.querySelectorAll('[data-time]').forEach(inp => {
      inp.addEventListener('click', e => e.stopPropagation());
      inp.addEventListener('input', () => {
        const field = inp.dataset.time;
        let v = parseInt(inp.value, 10);
        if (isNaN(v)) v = 0;
        v = field === 'h' ? Math.min(23, Math.max(0, v)) : Math.min(59, Math.max(0, v));
        if (field === 'h') this.h = v; else this.mi = v;
        this._commit();
      });
      inp.addEventListener('blur', () => { this._syncInput(inp.dataset.time); });
    });
  }

  _syncInput(field) {
    const inp = this._container()?.querySelector(`[data-time="${field}"]`);
    if (inp) inp.value = String(field === 'h' ? this.h : this.mi).padStart(2, '0');
  }

  _commit() {
    const hidden = document.getElementById(this.containerId.replace('tp-', ''));
    if (hidden) {
      hidden.value = this.getValue();
      hidden.dispatchEvent(new Event('change', { bubbles: true }));
    }
  }

  setValue(value) {
    this._applyValue(value);
    this._render();
    this._commit();
  }

  getValue() { return `${String(this.h).padStart(2,'0')}:${String(this.mi).padStart(2,'0')}`; }
}

const _timepickers = {};

function initTimePicker(id, opts = {}) {
  let hidden = document.getElementById(id);
  if (!hidden) {
    hidden = document.createElement('input');
    hidden.type = 'hidden';
    hidden.id = id;
    document.body.appendChild(hidden);
  }
  _timepickers[`tp-${id}`] = new TimePicker(`tp-${id}`, { value: hidden.value || opts.value || null });
}

function tpSetValue(id, val) {
  const tp = _timepickers[`tp-${id}`];
  if (tp) tp.setValue(val || null);
}
function tpGetValue(id) {
  const tp = _timepickers[`tp-${id}`];
  return tp ? tp.getValue() : null;
}

(function _domReady(fn) { if (document.readyState === 'loading') { window.addEventListener('DOMContentLoaded', fn); } else { fn(); } })(function() {
  initDatePicker('smTglSurat',  { placeholder: 'Pilih tanggal' });
  initDatePicker('smTglTerima', { placeholder: 'Pilih tanggal' });
  initDatePicker('smBatas',     { placeholder: 'Pilih tanggal', alignRight: true });
  initDatePicker('skTglSurat',  { placeholder: 'Pilih tanggal' });
  initDatePicker('temaTanggalMulai',   { placeholder: 'Pilih tanggal' });
  initDatePicker('temaTanggalSelesai', { placeholder: 'Pilih tanggal' });
  initTimePicker('lemburSesiJamMulai');
  initTimePicker('lemburSesiJamSelesai');
  initTimePicker('lemburKegiatanJamMulai');
  initTimePicker('lemburKegiatanJamSelesai');
});

const _OFFICE_EXTS = new Set(['doc','docx','xls','xlsx','ppt','pptx']);
const _IMG_EXTS    = new Set(['jpg','jpeg','png','gif','webp','svg']);

const _PDFJS_CDN    = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
const _PDFJS_WORKER = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
const _MAMMOTH_CDN  = 'https://cdnjs.cloudflare.com/ajax/libs/mammoth/1.6.0/mammoth.browser.min.js';
const _SHEETJS_CDN  = 'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js';

function _dpLoadScript(src) {
  return new Promise((res, rej) => {
    if (document.querySelector(`script[src="${src}"]`)) { res(); return; }
    const s = document.createElement('script');
    s.src = src; s.onload = res; s.onerror = rej;
    document.head.appendChild(s);
  });
}

const _RAW_EXTS_FE = new Set(['pdf','doc','docx','xls','xlsx','ppt','pptx','zip','txt','csv']);
function _fixCloudinaryUrl(url, hintExt = '') {
  try {
    if (!url || !url.includes('cloudinary.com')) return url;
    if (url.includes('/raw/upload/')) return url; 
    if (url.includes('/image/upload/')) {
      const filename = url.split('/').pop().split('?')[0];
      const extFromUrl  = filename.includes('.') ? filename.split('.').pop().toLowerCase() : '';
      const extFromHint = (hintExt || '').toLowerCase();
      if (_RAW_EXTS_FE.has(extFromUrl) || _RAW_EXTS_FE.has(extFromHint)) {
        return url.replace('/image/upload/', '/raw/upload/');
      }
    }
    return url;
  } catch { return url; }
}

function _dpProxyUrl(rawUrl, mode = 'preview', fileName = '') {
  if (!rawUrl || !rawUrl.startsWith('http')) return rawUrl;
  const token = (_token || '').trim();
  const tokenParam = token ? `&token=${encodeURIComponent(token)}` : '';
  let nameParam = '';
  try {
    const useName = (fileName || '').trim() || decodeURIComponent(rawUrl.split('/').pop().split('?')[0]);
    if (useName) nameParam = `&name=${encodeURIComponent(useName)}`;
  } catch {}
  return `/api/sign-url?url=${encodeURIComponent(rawUrl)}&mode=${mode}${tokenParam}${nameParam}`;
}

async function _dpCheckProxy(resp) {
  if (resp.status === 302 || resp.redirected) {
    return { ok: true, status: 200, _redirectUrl: resp.url, arrayBuffer: async () => null, headers: resp.headers };
  }
  if (resp.status === 401) {
    try {
      const debug = await resp.clone().json();
      console.error('[sign-url 401 debug]', JSON.stringify(debug));
      if (debug.reason === 'token_expired' || debug.reason === 'invalid_token') {
        
        throw new Error('Sesi Anda telah berakhir. Silakan login kembali.');
      }
      
      const hint = debug.hint ? ` (${debug.hint})` : '';
      throw new Error((debug.error || 'Gagal mengakses file') + hint);
    } catch (jsonErr) {
      
      if (jsonErr.message && !jsonErr.message.includes('JSON')) throw jsonErr;
    }
    throw new Error('Gagal mengakses file - link mungkin sudah kedaluwarsa. Coba download langsung.');
  }
  return resp;
}

let _dpFiles   = [];   
let _dpIdx     = 0;
let _dpZoom    = 1;
let _dpLabel   = '';
let _dpOnDelete = null;



function _setSidebarDisabled(disabled) {
  const sidebar = document.getElementById('sidebar');
  const topbar  = document.getElementById('topbar');
  const els = [sidebar, topbar].filter(Boolean);
  els.forEach(el => {
    if (disabled) {
      el.style.pointerEvents = 'none';
      el.style.filter        = 'blur(2px)';
      el.style.transition    = 'filter .2s ease';
      el.dataset.tip = 'Tutup preview terlebih dahulu';
    } else {
      el.style.pointerEvents = '';
      el.style.filter        = '';
      el.dataset.tip               = '';
    }
  });
}

function viewDoc(url, fileName) {
  const name = fileName || decodeURIComponent(url.split('/').pop().split('?')[0]) || 'Dokumen';
  viewDocMulti([{ url, name }], 0, '');
}

function viewDocMulti(files, startIdx = 0, label = '', onDelete = null) {
  if (!files || !files.length) return;
  _dpFiles    = files.filter(f => f && f.url);
  _dpIdx      = Math.max(0, Math.min(startIdx, _dpFiles.length - 1));
  _dpLabel    = label || '';
  _dpOnDelete = typeof onDelete === 'function' ? onDelete : null;
  _dpZoom     = 1;

  
  const delBtn = document.getElementById('docPreviewDeleteBtn');
  if (delBtn) delBtn.style.display = _dpOnDelete ? '' : 'none';

  _dpRender();
  document.getElementById('docPreviewPanel').style.display = 'flex';
  _setSidebarDisabled(true);
  document.addEventListener('keydown', _dpKeyHandler);
}

function closeDocPreview() {
  document.getElementById('docPreviewPanel').style.display = 'none';
  _setSidebarDisabled(false);
  document.removeEventListener('keydown', _dpKeyHandler);
  
  const body = document.getElementById('docPreviewBody');
  if (body) body.innerHTML = '';
  _dpFiles    = [];
  _dpOnDelete = null;
}


function navDocPreview(dir) {
  const next = _dpIdx + dir;
  if (next < 0 || next >= _dpFiles.length) return;
  _dpIdx  = next;
  _dpZoom = 1;
  _dpRender();
}

function navDocPreviewTo(idx) {
  if (idx < 0 || idx >= _dpFiles.length) return;
  _dpIdx  = idx;
  _dpZoom = 1;
  _dpRender();
}


function dpZoom(delta) {
  if (delta === 0) {
    _dpZoom = 1;
  } else {
    _dpZoom = Math.max(0.5, Math.min(3, _dpZoom + delta));
  }
  const label     = document.getElementById('docPreviewZoomLabel');
  const resetBtn  = document.getElementById('dpZoomReset');
  if (label)    label.textContent = Math.round(_dpZoom * 100) + '%';
  if (resetBtn) resetBtn.style.display = _dpZoom !== 1 ? '' : 'none';

  
  const body    = document.getElementById('docPreviewBody');
  const content = body?.querySelector('.dp-content');
  if (content) content.style.transform = `scale(${_dpZoom})`;
}

function dpDeleteCurrent() {
  if (!_dpOnDelete) return;
  const file = _dpFiles[_dpIdx];
  _dpOnDelete(_dpIdx, file);
}

function _dpKeyHandler(e) {
  if (e.key === 'Escape')      closeDocPreview();
  if (e.key === 'ArrowLeft')   navDocPreview(-1);
  if (e.key === 'ArrowRight')  navDocPreview(1);
  if (e.key === '+' || e.key === '=') dpZoom(0.25);
  if (e.key === '-')           dpZoom(-0.25);
  if (e.key === '0')           dpZoom(0);
}

function _dpRender() {
  const file = _dpFiles[_dpIdx];
  if (!file) return;

  const ext = (file.name || '').split('.').pop().toLowerCase();

  const labelEl   = document.getElementById('docPreviewLabel');
  const counterEl = document.getElementById('docPreviewCounter');
  const titleEl   = document.getElementById('docPreviewTitle');
  const dlLink    = document.getElementById('docPreviewOpenLink');
  const gdocsBtn  = document.getElementById('docPreviewGdocsBtn');
  const zoomLabel = document.getElementById('docPreviewZoomLabel');
  const resetBtn  = document.getElementById('dpZoomReset');

  if (labelEl)   labelEl.textContent   = _dpLabel;
  if (counterEl) counterEl.textContent = _dpFiles.length > 1
    ? `(${_dpIdx + 1}/${_dpFiles.length})`
    : '';
  if (titleEl)   titleEl.textContent   = file.name || 'Dokumen';
  if (zoomLabel) zoomLabel.textContent = '100%';
  if (resetBtn)  resetBtn.style.display = 'none';
  if (gdocsBtn)  gdocsBtn.style.display = 'none';

  
  const dlUrl = _dpProxyUrl(file.url, 'download', file.name);
  if (dlLink) { dlLink.href = dlUrl; dlLink.download = file.name || 'dokumen'; }

  
  const prevBtn = document.getElementById('dpNavPrev');
  const nextBtn = document.getElementById('dpNavNext');
  const dotsEl  = document.getElementById('dpDots');
  if (prevBtn) prevBtn.style.display = _dpFiles.length > 1 ? '' : 'none';
  if (nextBtn) nextBtn.style.display = _dpFiles.length > 1 ? '' : 'none';
  if (prevBtn) prevBtn.disabled = _dpIdx === 0;
  if (nextBtn) nextBtn.disabled = _dpIdx === _dpFiles.length - 1;

  
  if (dotsEl) {
    if (_dpFiles.length > 1) {
      dotsEl.style.display = 'flex';
      dotsEl.innerHTML = _dpFiles.map((_, i) =>
        `<button class="dp-dot ${i === _dpIdx ? 'active' : ''}" onclick="navDocPreviewTo(${i})" data-tip="File ${i+1}"></button>`
      ).join('');
    } else {
      dotsEl.style.display = 'none';
    }
  }

  
  const body = document.getElementById('docPreviewBody');
  if (!body) return;
  body.innerHTML = _dpLoadingHtml();

  if (_IMG_EXTS.has(ext)) {
    _dpRenderImage(_dpProxyUrl(file.url, 'preview', file.name), file.name);
  } else if (ext === 'pdf') {
    _dpRenderPdf(_dpProxyUrl(file.url, 'preview', file.name), file.name, file.url);
  } else if (['doc','docx'].includes(ext)) {
    _dpRenderWord(_dpProxyUrl(file.url, 'preview', file.name), file.name).catch(err => _dpRenderError(err.message, file.url, file.name));
  } else if (['xls','xlsx'].includes(ext)) {
    _dpRenderExcel(_dpProxyUrl(file.url, 'preview', file.name), file.name).catch(err => _dpRenderError(err.message, file.url, file.name));
  } else if (['ppt','pptx'].includes(ext)) {
    _dpRenderPptFallback(_dpProxyUrl(file.url, 'download', file.name), file.name);
  } else {
    
    body.innerHTML = `
      <div style="text-align:center;color:#94a3b8;padding:40px 20px">
        <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" fill="none" viewBox="0 0 24 24" stroke="#475569" stroke-width="1.5" style="margin-bottom:16px"><path stroke-linecap="round" stroke-linejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
        <div style="font-weight:600;margin-bottom:8px">Format <code style="background:#1e293b;padding:2px 6px;border-radius:4px">.${ext}</code> tidak bisa ditampilkan di browser.</div>
        <div style="font-size:.82rem;margin-bottom:18px;color:#64748b">Gunakan tombol download di atas untuk membuka file.</div>
      </div>`;
  }
}

function _dpRenderImage(url, name) {
  const body = document.getElementById('docPreviewBody');
  const img  = new Image();
  img.onload = () => {
    body.innerHTML = '';
    const wrap = document.createElement('div');
    wrap.style.cssText = 'flex:1;overflow:auto;display:flex;align-items:center;justify-content:center;width:100%;height:100%;transform-origin:center center';
    wrap.className = 'dp-content';
    wrap.style.transform = `scale(${_dpZoom})`;
    img.style.cssText = 'max-width:100%;max-height:100%;object-fit:contain;border-radius:4px;box-shadow:0 4px 32px rgba(0,0,0,.5)';
    img.alt = name || '';
    wrap.appendChild(img);
    body.appendChild(wrap);
  };
  img.onerror = () => {
    body.innerHTML = `<div style="color:#ef4444;text-align:center;padding:40px">Gagal memuat gambar.</div>`;
  };
  img.src = url;
}

async function _dpRenderPdf(proxyUrl, name, originalUrl) {
  const body     = document.getElementById('docPreviewBody');
  const gdocsBtn = document.getElementById('docPreviewGdocsBtn');
  if (gdocsBtn) gdocsBtn.style.display = 'none';
  body.style.background = '';
  body.innerHTML = _dpLoadingHtml('Memuat PDF…');

  if (_token && !proxyUrl.includes('token=')) {
    proxyUrl = proxyUrl + '&token=' + encodeURIComponent(_token);
  }

  await _dpLoadScript(_PDFJS_CDN);
  const pdfjsLib = window['pdfjs-dist/build/pdf'];
  if (!pdfjsLib) { _dpRenderError('PDF.js gagal dimuat dari CDN.', originalUrl, name); return; }
  if (!pdfjsLib.GlobalWorkerOptions.workerSrc) {
    pdfjsLib.GlobalWorkerOptions.workerSrc = _PDFJS_WORKER;
  }

  
  async function renderPdfBuffer(buf) {
    if (!buf || buf.byteLength === 0) throw new Error('Buffer kosong');
    const magic = new Uint8Array(buf, 0, 4);
    if (!(magic[0] === 0x25 && magic[1] === 0x50 && magic[2] === 0x44 && magic[3] === 0x46))
      throw new Error('Bukan file PDF valid (magic bytes salah)');

    const pdf = await pdfjsLib.getDocument({ data: buf }).promise;
    body.innerHTML = '';
    const wrap = document.createElement('div');
    wrap.style.cssText = 'overflow-y:auto;width:100%;height:100%;padding:12px;box-sizing:border-box;' +
                         'display:flex;flex-direction:column;align-items:center;gap:10px;background:#0d1626';
    body.appendChild(wrap);

    for (let i = 1; i <= pdf.numPages; i++) {
      const page     = await pdf.getPage(i);
      const viewport = page.getViewport({ scale: 1.5 });
      const canvas   = document.createElement('canvas');
      canvas.width   = viewport.width;
      canvas.height  = viewport.height;
      canvas.style.cssText = 'max-width:100%;box-shadow:0 2px 12px rgba(0,0,0,.5);border-radius:2px;';
      wrap.appendChild(canvas);
      await page.render({ canvasContext: canvas.getContext('2d'), viewport }).promise;
    }
  }

  
  
  
  if (originalUrl) {
    try {
      body.innerHTML = _dpLoadingHtml('Mengambil PDF…');
      const ext       = (name || '').split('.').pop().toLowerCase();
      const fixedUrl  = _fixCloudinaryUrl(originalUrl, ext);
      if (fixedUrl !== originalUrl) {
        console.log('[PDF S1] URL dikoreksi:', originalUrl.substring(0,60), '→', fixedUrl.substring(0,60));
      }
      const r1 = await fetch(fixedUrl, { headers: { 'Accept': '*/*' } });
      if (!r1.ok) throw new Error(`Cloudinary HTTP ${r1.status}`);
      const buf1 = await r1.arrayBuffer();
      await renderPdfBuffer(buf1);
      console.log('[PDF S1] Berhasil via Cloudinary langsung, size:', (buf1.byteLength/1024).toFixed(0), 'KB');
      return;
    } catch (e) {
      console.warn('[PDF S1] Gagal fetch Cloudinary langsung:', e.message, '- coba proxy…');
    }
  }

  
  try {
    body.innerHTML = _dpLoadingHtml('Mengambil PDF via proxy…');
    const fetchHeaders = {};
    const auth = (typeof authHeaders === 'function') ? (authHeaders()['Authorization'] || '') : '';
    if (auth) fetchHeaders['Authorization'] = auth;

    const r2 = await _dpCheckProxy(await fetch(proxyUrl, { headers: fetchHeaders, redirect: 'follow' }));
    if (!r2.ok) throw new Error(`Proxy HTTP ${r2.status}`);

    
    const redirectUrl = r2._redirectUrl || (r2.redirected ? r2.url : null);
    if (redirectUrl && redirectUrl.includes('cloudinary.com')) {
      const r2b = await fetch(redirectUrl, { headers: { 'Accept': '*/*' } });
      if (!r2b.ok) throw new Error(`Cloudinary redirect HTTP ${r2b.status}`);
      const buf2b = await r2b.arrayBuffer();
      await renderPdfBuffer(buf2b);
      console.log('[PDF S2] Berhasil via proxy redirect, size:', (buf2b.byteLength/1024).toFixed(0), 'KB');
      return;
    }

    const buf2 = await r2.arrayBuffer();
    await renderPdfBuffer(buf2);
    console.log('[PDF S2] Berhasil via proxy, size:', (buf2.byteLength/1024).toFixed(0), 'KB');
    return;
  } catch (e) {
    console.warn('[PDF S2] Gagal via proxy:', e.message, '- coba iframe blob…');
  }

  
  try {
    body.innerHTML = _dpLoadingHtml('Memuat PDF (mode native)…');
    const r3 = await fetch(proxyUrl, { redirect: 'follow' });
    if (!r3.ok) throw new Error(`HTTP ${r3.status}`);
    const buf3    = await r3.arrayBuffer();
    const blob    = new Blob([buf3], { type: 'application/pdf' });
    const blobUrl = URL.createObjectURL(blob);
    body.innerHTML = '';
    const iframe  = document.createElement('iframe');
    iframe.style.cssText = 'width:100%;height:100%;border:none;display:block;flex:1';
    iframe.title = name || 'Dokumen PDF';
    body.appendChild(iframe);
    iframe.src = blobUrl;
    setTimeout(() => URL.revokeObjectURL(blobUrl), 300_000);
    console.log('[PDF S3] Berhasil via iframe blob');
    return;
  } catch (e) {
    console.warn('[PDF S3] Gagal:', e.message);
  }

  
  _dpRenderError('PDF tidak dapat ditampilkan. Coba download file.', originalUrl, name);
}

async function _dpRenderWord(proxyUrl, name) {
  const body = document.getElementById('docPreviewBody');
  body.style.background = '';
  body.innerHTML = _dpLoadingHtml('Mengkonversi dokumen Word…');

  await _dpLoadScript(_MAMMOTH_CDN);
  if (!window.mammoth) throw new Error('mammoth.js gagal dimuat');

  const fetchHeaders = {};
  const auth = (typeof authHeaders === 'function') ? (authHeaders()['Authorization'] || '') : '';
  if (auth) fetchHeaders['Authorization'] = auth;
  const resp = await _dpCheckProxy(await fetch(proxyUrl, { headers: fetchHeaders }));
  if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
  const arrayBuffer = await resp.arrayBuffer();
  const result = await window.mammoth.convertToHtml({ arrayBuffer });

  body.innerHTML = '';
  const wrapper = document.createElement('div');
  wrapper.style.cssText = 'overflow-y:auto;width:100%;height:100%;padding:1.5rem 2rem;box-sizing:border-box;background:#0d1626;';
  const inner = document.createElement('div');
  inner.style.cssText = 'max-width:760px;margin:0 auto;background:#fff;padding:2rem 2.5rem;border-radius:6px;box-shadow:0 4px 32px rgba(0,0,0,.4);font-family:Georgia,serif;font-size:14px;line-height:1.7;color:#1e293b;';
  inner.innerHTML = result.value || '<p style="color:#94a3b8">Dokumen kosong atau tidak dapat dirender.</p>';
  wrapper.appendChild(inner);
  body.appendChild(wrapper);
}

async function _dpRenderExcel(proxyUrl, name) {
  const body = document.getElementById('docPreviewBody');
  body.style.background = '';
  body.innerHTML = _dpLoadingHtml('Memuat spreadsheet…');

  await _dpLoadScript(_SHEETJS_CDN);
  if (!window.XLSX) throw new Error('SheetJS gagal dimuat');

  const fetchHeaders = {};
  const auth = (typeof authHeaders === 'function') ? (authHeaders()['Authorization'] || '') : '';
  if (auth) fetchHeaders['Authorization'] = auth;
  const resp = await _dpCheckProxy(await fetch(proxyUrl, { headers: fetchHeaders }));
  if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
  const arrayBuffer = await resp.arrayBuffer();
  const workbook = window.XLSX.read(arrayBuffer, { type: 'array' });
  const sheetNames = workbook.SheetNames;

  body.innerHTML = '';
  const root = document.createElement('div');
  root.style.cssText = 'display:flex;flex-direction:column;height:100%;overflow:hidden;background:#0d1626;';

  if (sheetNames.length > 1) {
    const tabBar = document.createElement('div');
    tabBar.style.cssText = 'display:flex;gap:4px;padding:8px 12px 0;background:#0d1626;flex-shrink:0;overflow-x:auto;';
    sheetNames.forEach((shName, i) => {
      const btn = document.createElement('button');
      btn.textContent = shName;
      btn.style.cssText = `padding:5px 14px;border:none;border-radius:6px 6px 0 0;cursor:pointer;font-size:.78rem;font-weight:600;background:${i===0?'#fff':'#1e3050'};color:${i===0?'#334155':'#94a3b8'};`;
      btn.onclick = () => {
        root.querySelectorAll('.xl-tab').forEach(b => { b.style.background = '#1e3050'; b.style.color = '#94a3b8'; });
        btn.style.background = '#fff'; btn.style.color = '#334155';
        _dpShowSheet(contentArea, workbook, shName);
      };
      btn.className = 'xl-tab';
      tabBar.appendChild(btn);
    });
    root.appendChild(tabBar);
  }

  const contentArea = document.createElement('div');
  contentArea.style.cssText = 'flex:1;overflow:auto;background:#fff;margin:0 12px 12px;border-radius:0 0 6px 6px;box-shadow:0 4px 32px rgba(0,0,0,.4);';
  root.appendChild(contentArea);
  body.appendChild(root);
  _dpShowSheet(contentArea, workbook, sheetNames[0]);
}

function _dpShowSheet(container, workbook, sheetName) {
  const ws   = workbook.Sheets[sheetName];
  const html = window.XLSX.utils.sheet_to_html(ws, { editable: false });
  container.innerHTML = `<div style="padding:8px 12px;min-width:max-content">
    <style>.xl-tbl{border-collapse:collapse;font-size:12px;font-family:Arial,sans-serif}.xl-tbl td,.xl-tbl th{border:1px solid #cbd5e1;padding:4px 8px;white-space:nowrap}.xl-tbl tr:first-child td,.xl-tbl tr:first-child th{background:#f1f5f9;font-weight:700;position:sticky;top:0}</style>
    ${html.replace(/<table/g, '<table class="xl-tbl"')}
  </div>`;
}

function _dpRenderPptFallback(downloadUrl, fileName) {
  const body = document.getElementById('docPreviewBody');
  body.style.background = '';
  body.innerHTML = `<div style="text-align:center;color:#94a3b8;padding:2rem">
    <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" fill="none" viewBox="0 0 24 24" stroke="#f97316" stroke-width="1" style="margin-bottom:.75rem"><path stroke-linecap="round" stroke-linejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
    <div style="font-weight:600;color:#e2e8f0;margin-bottom:.4rem">${fileName || 'File PowerPoint'}</div>
    <div style="font-size:.8rem;margin-bottom:1.25rem">File PowerPoint tidak dapat ditampilkan langsung di browser.</div>
    <a href="${downloadUrl}" download="${fileName || 'dokumen'}"
       style="display:inline-flex;align-items:center;gap:.4rem;padding:.5rem 1.2rem;border-radius:8px;background:#f97316;color:#fff;font-weight:600;text-decoration:none;font-size:.85rem">
      <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/></svg>
      Download File
    </a>
  </div>`;
}

function _dpRenderError(msg, originalUrl, name) {
  const body = document.getElementById('docPreviewBody');
  const dlUrl = _dpProxyUrl(originalUrl, 'download', name || '');
  body.innerHTML = `<div style="color:#f87171;text-align:center;padding:2rem">
    <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5" style="margin-bottom:.5rem"><path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"/></svg>
    <div style="font-weight:600">Gagal memuat dokumen</div>
    <div style="font-size:.8rem;margin-top:.25rem;color:#94a3b8">${msg || ''}</div>
    ${originalUrl ? `<a href="${dlUrl}" download="${name||'dokumen'}" style="display:inline-flex;align-items:center;gap:6px;margin-top:1rem;padding:.4rem .9rem;border-radius:6px;background:#0369a1;color:#fff;font-size:.8rem;font-weight:600;text-decoration:none">
      <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/></svg>
      Coba Download
    </a>` : ''}
  </div>`;
}

function docPreviewUseGdocs() {
  const file = _dpFiles[_dpIdx];
  if (!file) return;
  const gdocsBtn = document.getElementById('docPreviewGdocsBtn');
  if (gdocsBtn) gdocsBtn.style.display = 'none';
  _dpRenderGdocsViewer(file.url, file.name);
}

function _dpRenderGdocsViewer(cloudinaryUrl, name) {
  const body = document.getElementById('docPreviewBody');
  const viewerUrl = `https://docs.google.com/viewer?url=${encodeURIComponent(cloudinaryUrl)}&embedded=true`;
  body.innerHTML = _dpLoadingHtml('Membuka Google Docs Viewer...');
  const iframe = document.createElement('iframe');
  iframe.className = 'dp-content';
  iframe.style.cssText = 'width:100%;height:100%;border:none;flex:1;display:block';
  iframe.title = name || 'Dokumen';
  iframe.allow = 'fullscreen';
  body.innerHTML = '';
  body.appendChild(iframe);
  iframe.src = viewerUrl;
  const dlUrl = _dpProxyUrl(cloudinaryUrl, 'download');
  const fbTimer = setTimeout(() => {
    if (body.contains(iframe)) {
      const info = document.createElement('div');
      info.style.cssText = 'position:absolute;bottom:16px;left:50%;transform:translateX(-50%);background:rgba(15,23,42,.92);border:1px solid #334155;border-radius:8px;padding:10px 16px;font-size:.78rem;color:#94a3b8;text-align:center;white-space:nowrap;z-index:10';
      info.innerHTML = `Google Viewer lambat? <a href="${dlUrl}" download="${name||'dokumen'}" style="color:#38bdf8;text-decoration:underline">Download langsung</a>`;
      body.style.position = 'relative';
      body.appendChild(info);
    }
  }, 20000);
  iframe.addEventListener('load', () => clearTimeout(fbTimer), { once: true });
}

function _dpLoadingHtml(msg = 'Memuat dokumen...') {
  return `
    <div style="display:flex;flex-direction:column;align-items:center;gap:14px;color:#475569">
      <span class="btn-spin" style="width:28px;height:28px;--spin-thick:3px;color:#475569"></span>
      <span style="font-size:.82rem">${msg}</span>
    </div>`;
}

let _lapMode = 'urusan'; 
let _lapTemplateList  = [];
let _lapTemplateEditId = null;
let _lapTplCurrentTemplateId = null;
let _lapTplAllIndikator = [];
let _lapTplSelectedIds  = new Set();

const LAP_CASCADE_LEVELS = ['tujuan', 'sasaran', 'program', 'kegiatan'];
const LAP_JENIS_LABEL    = { urusan:'Urusan', tujuan:'Tujuan', sasaran:'Sasaran Strategis', program:'Program', kegiatan:'Kegiatan' };
const LAP_JENIS_COLOR    = {
  tujuan:   { bg:'#ede9fe', col:'#5b21b6', hdr:'#7c3aed', light:'#f5f3ff' },
  sasaran:  { bg:'#dcfce7', col:'#166534', hdr:'#16a34a', light:'#f0fdf4' },
  program:  { bg:'#fef3c7', col:'#92400e', hdr:'#d97706', light:'#fffbeb' },
  kegiatan: { bg:'#fee2e2', col:'#991b1b', hdr:'#dc2626', light:'#fff5f5' },
};

let _lapCascadeSel = [null, null, null];

let _lapCascadeCache = {};

function _syncSelectTrigger(selectEl) {
  if (!selectEl) return;
  const wrap = selectEl.closest('.select-wrap');
  if (!wrap) return;
  const textEl = wrap.querySelector('[class*="trigger-text"]');
  if (!textEl) return;
  const opt = selectEl.options[selectEl.selectedIndex];
  textEl.textContent = opt ? opt.text : '';
  textEl.classList.toggle('placeholder', !opt || opt.value === '');
}

function switchLapMode(mode) {
  _lapMode = mode;
  document.getElementById('lapModeUrusan').classList.toggle('active', mode === 'urusan');
  document.getElementById('lapModeTSP').classList.toggle('active', mode === 'tsp');
  document.getElementById('lapPanelUrusan').style.display = mode === 'urusan' ? '' : 'none';
  document.getElementById('lapPanelTSP').style.display    = mode === 'tsp'    ? '' : 'none';
  if (mode === 'urusan') loadLapTemplateAdmin();
  else _initLapCascade();
}

async function loadLapTemplateAdmin() {
  
  const tbody = document.getElementById('lapTemplateBody');
  if (!tbody) return;
  tbody.innerHTML = `<tr class="empty-row"><td colspan="5"><span class="btn-spin" style="width:11px;height:11px;vertical-align:-1px;margin-right:6px"></span>Memuat data...</td></tr>`;
  try {
    const res  = await fetch('/api/kinerja/laporan-template?jenis=urusan', { headers: authHeaders() });
    const data = await res.json();
    _lapTemplateList = data.templates || [];
    _renderUrusanTable();
  } catch (e) {
    tbody.innerHTML = `<tr class="empty-row"><td colspan="5">Gagal memuat data</td></tr>`;
  }
}

function _renderUrusanTable() {
  const tbody = document.getElementById('lapTemplateBody');
  if (!tbody) return;
  if (!_lapTemplateList.length) {
    tbody.innerHTML = `<tr class="empty-row"><td colspan="5">Belum ada template Urusan</td></tr>`;
    return;
  }
  tbody.innerHTML = _lapTemplateList.map((t, i) => `
    <tr>
      <td style="text-align:center">${i+1}</td>
      <td style="font-weight:600">${escHtml(t.nama)}</td>
      <td style="text-align:center">
        <span style="background:#f0fdf4;color:#166534;border-radius:12px;padding:2px 10px;font-size:.8rem;font-weight:700">${t.jumlah_indikator}</span>
      </td>
      <td style="text-align:center;color:#64748b">${t.urutan}</td>
      <td style="text-align:center">
        <div style="display:flex;gap:6px;justify-content:center">
          <button class="btn btn-sm" data-tip="Kelola Indikator"
            onclick="openLapTemplateIndikatorModal(${t.id}, '${escHtml(t.nama).replace(/'/g,"\\'")}', 'urusan')"
            style="background:#e0f2fe;color:#0369a1;border:none">
            <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/></svg>
            Indikator
          </button>
          <button class="btn btn-ghost btn-sm" data-tip="Edit"
            onclick="openLapTemplateModal(${t.id}, 'urusan')">
            <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>
          </button>
          <button class="btn-hapus" data-tip="Hapus"
            onclick="deleteLapTemplate(${t.id}, '${escHtml(t.nama).replace(/'/g,"\\'")}', 'urusan')">
            <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path stroke-linecap="round" stroke-linejoin="round" d="M19 6l-1 14H6L5 6"/><path stroke-linecap="round" stroke-linejoin="round" d="M10 11v6m4-6v6"/><path stroke-linecap="round" stroke-linejoin="round" d="M9 6V4h6v2"/></svg>
          </button>
        </div>
      </td>
    </tr>`).join('');
}


async function _initLapCascade() {
  _lapCascadeCache = {};
  _lapCascadeSel   = [null, null, null];
  _renderCascade();
  await _loadCascadeLevel(0, null);
}

async function _loadCascadeLevel(level, parentId) {
  const jenis = LAP_CASCADE_LEVELS[level];
  const cacheKey = parentId ?? 'root';
  const col = document.getElementById(`lapCol_${level}`);
  if (!col) return;
  const list = col.querySelector('.lap-col-list');
  list.innerHTML = `<div class="lap-col-loading"><span class="btn-spin" style="width:11px;height:11px;vertical-align:-1px;margin-right:6px"></span>Memuat data...</div>`;
  try {
    const qs  = parentId ? `jenis=${jenis}&parent_id=${parentId}` : `jenis=${jenis}`;
    const res  = await fetch(`/api/kinerja/laporan-template?${qs}`, { headers: authHeaders() });
    const data = await res.json();
    const items = data.templates || [];
    _lapCascadeCache[`${level}_${cacheKey}`] = items;
    _renderCascadeLevel(level, items);
  } catch (e) {
    list.innerHTML = `<div class="lap-col-loading" style="color:#dc2626">Gagal memuat</div>`;
  }
}

function _renderCascade() {
  const wrap = document.getElementById('lapCascadeWrap');
  if (!wrap) return;
  wrap.innerHTML = LAP_CASCADE_LEVELS.map((jenis, level) => {
    const c = LAP_JENIS_COLOR[jenis];
    return `
      <div class="lap-cascade-col" id="lapCol_${level}">
        <div class="lap-col-header" style="background:${c.hdr}">
          <span>${LAP_JENIS_LABEL[jenis]}</span>
          <button class="lap-col-add-btn" onclick="_openCascadeAdd(${level})" data-tip="Tambah ${LAP_JENIS_LABEL[jenis]}">
            <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4"/></svg>
          </button>
        </div>
        <div class="lap-col-list" id="lapColList_${level}">
          ${level > 0 ? '<div class="lap-col-hint">← Pilih item di kiri</div>' : '<div class="lap-col-loading"><span class="btn-spin" style="width:11px;height:11px;vertical-align:-1px;margin-right:6px"></span>Memuat data...</div>'}
        </div>
      </div>
      ${level < 3 ? '<div class="lap-cascade-arrow">›</div>' : ''}
    `;
  }).join('');
}

function _renderCascadeLevel(level, items) {
  const list = document.getElementById(`lapColList_${level}`);
  if (!list) return;
  const jenis = LAP_CASCADE_LEVELS[level];
  const c = LAP_JENIS_COLOR[jenis];
  const selId = _lapCascadeSel[level - 1];

  if (!items.length) {
    list.innerHTML = `<div class="lap-col-empty">Belum ada ${LAP_JENIS_LABEL[jenis]}</div>`;
    return;
  }

  list.innerHTML = items.map((t, idx) => {
    const isActive = _lapCascadeSel[level] === t.id;
    const nomorLabel = `${LAP_JENIS_LABEL[jenis]} ${idx + 1}`;
    return `<div class="lap-col-item ${isActive ? 'active' : ''}" id="lapItem_${level}_${t.id}"
        onclick="_selectCascadeItem(${level}, ${t.id})"
        style="${isActive ? `background:${c.light};border-left:3px solid ${c.hdr}` : ''}">
      <div style="font-size:0.7rem;font-weight:700;color:${c.hdr};margin-bottom:2px;text-transform:uppercase;letter-spacing:.3px">${nomorLabel}</div>
      <div class="lap-col-item-name">${escHtml(t.nama)}</div>
      <div class="lap-col-item-meta">
        <span class="lap-ind-badge">${t.jumlah_indikator} indikator</span>
        <div class="lap-col-item-actions">
          <button onclick="event.stopPropagation();openLapTemplateIndikatorModal(${t.id},'${escHtml(t.nama).replace(/'/g,"\\'")}','${jenis}')" data-tip="Kelola Indikator" class="lap-item-btn lap-item-btn-ind">
            <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/></svg>
          </button>
          <button onclick="event.stopPropagation();_openCascadeEdit(${level},${t.id})" data-tip="Edit" class="lap-item-btn lap-item-btn-edit">
            <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>
          </button>
          <button onclick="event.stopPropagation();deleteLapTemplate(${t.id},'${escHtml(t.nama).replace(/'/g,"\\'")}','cascade',${level})" data-tip="Hapus" class="lap-item-btn lap-item-btn-del">
            <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path stroke-linecap="round" stroke-linejoin="round" d="M19 6l-1 14H6L5 6m5 0V4h4v2"/></svg>
          </button>
        </div>
      </div>
    </div>`;
  }).join('');
}

async function _selectCascadeItem(level, id) {
  const wasSelected = _lapCascadeSel[level] === id;
  _lapCascadeSel[level] = wasSelected ? null : id;

  for (let l = level + 1; l < LAP_CASCADE_LEVELS.length; l++) {
    _lapCascadeSel[l] = null;
  }

  const cacheKey = level === 0 ? 'root' : (_lapCascadeSel[level - 1] ?? 'root');
  const cached = _lapCascadeCache[`${level}_${cacheKey}`] || [];
  _renderCascadeLevel(level, cached);

  for (let l = level + 1; l < LAP_CASCADE_LEVELS.length; l++) {
    const parentId = _lapCascadeSel[l - 1];
    const childList = document.getElementById(`lapColList_${l}`);
    if (!parentId) {
      if (childList) childList.innerHTML = '<div class="lap-col-hint">← Pilih item di kiri</div>';
      for (let ll = l + 1; ll < LAP_CASCADE_LEVELS.length; ll++) {
        const c2 = document.getElementById(`lapColList_${ll}`);
        if (c2) c2.innerHTML = '<div class="lap-col-hint">← Pilih item di kiri</div>';
      }
      break;
    }
    await _loadCascadeLevel(l, parentId);
  }
}

function _openCascadeAdd(level) {
  const jenis = LAP_CASCADE_LEVELS[level];
  const parentId   = level > 0 ? _lapCascadeSel[level - 1] : null;
  const parentNama = level > 0 ? _getCascadeParentNama(level) : null;

  if (level > 0 && !parentId) {
    toast(`Pilih ${LAP_JENIS_LABEL[LAP_CASCADE_LEVELS[level-1]]} terlebih dahulu`, 'info');
    return;
  }
  openLapTemplateModal(null, jenis, parentId, parentNama);
}

function _getCascadeParentNama(level) {
  if (level === 0) return null;
  const parentLevel = level - 1;
  const parentId    = _lapCascadeSel[parentLevel];
  const grandParentId = parentLevel > 0 ? _lapCascadeSel[parentLevel - 1] : null;
  const cacheKey = grandParentId ?? 'root';
  const items = _lapCascadeCache[`${parentLevel}_${cacheKey}`] || [];
  return items.find(t => t.id === parentId)?.nama || null;
}

function _openCascadeEdit(level, id) {
  const jenis = LAP_CASCADE_LEVELS[level];
  const grandParentId = level > 0 ? _lapCascadeSel[level - 1] : null;
  const cacheKey = grandParentId ?? 'root';
  const items = _lapCascadeCache[`${level}_${cacheKey}`] || [];
  const tpl = items.find(t => t.id === id);
  if (!tpl) return;
  openLapTemplateModal(id, jenis, tpl.parent_id || null, null, tpl.nama);
}

function _buildLapParentCsel(wrapperId, opts, selectedVal, placeholder, jenisLabel) {
  const wrap = document.getElementById(wrapperId);
  if (!wrap) return;

  
  
  if (wrap._lapCselPanel) { wrap._lapCselPanel.remove(); wrap._lapCselPanel = null; }
  if (wrap._lapCselOutside) document.removeEventListener('click', wrap._lapCselOutside);
  if (wrap._lapCselScroll)  window.removeEventListener('scroll', wrap._lapCselScroll, true);
  if (wrap._lapCselResize)  window.removeEventListener('resize', wrap._lapCselResize, true);
  wrap.innerHTML = '';

  const hidden = document.createElement('input');
  hidden.type  = 'hidden';
  hidden.id    = 'lapTemplateParent';
  hidden.value = selectedVal || '';
  wrap.appendChild(hidden);

  const selectedOpt = opts.find(o => o.value === String(selectedVal || ''));

  const trigger = document.createElement('button');
  trigger.type      = 'button';
  trigger.className = 'csel-trigger' + (opts.length === 0 ? ' disabled' : '');
  trigger.innerHTML = `
    <span class="csel-trigger-text${selectedOpt ? '' : ' placeholder'}">${selectedOpt ? escHtml(selectedOpt.label) : placeholder}</span>
    <svg class="csel-chevron" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7"/></svg>
  `;
  wrap.appendChild(trigger);

  const panel = document.createElement('div');
  panel.className = 'csel-panel csel-panel-fixed';
  panel.style.display = 'none';

  function selectValue(val, label, isPlaceholder) {
    hidden.value = isPlaceholder ? '' : val;
    const textEl = trigger.querySelector('.csel-trigger-text');
    textEl.textContent = label;
    textEl.classList.toggle('placeholder', isPlaceholder);
    panel.querySelectorAll('.csel-option').forEach(o => o.classList.toggle('selected', o.dataset.value === val && !isPlaceholder));
    closePanel();
  }

  const phDiv = document.createElement('div');
  phDiv.className = 'csel-option placeholder-opt';
  phDiv.dataset.value = '';
  phDiv.innerHTML = `<span class="csel-option-check"></span><span>${placeholder}</span>`;
  phDiv.onclick = () => selectValue('', placeholder, true);
  panel.appendChild(phDiv);

  opts.forEach(opt => {
    const div = document.createElement('div');
    const isSelected = opt.value === String(selectedVal || '');
    div.className = 'csel-option' + (isSelected ? ' selected' : '');
    div.dataset.value = opt.value;
    div.innerHTML = `<span class="csel-option-check"><svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="3"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"/></svg></span><span>${escHtml(opt.label)}</span>`;
    div.onclick = () => selectValue(opt.value, opt.label, false);
    panel.appendChild(div);
  });

  function positionPanel() {
    const r = trigger.getBoundingClientRect();
    panel.style.width = r.width + 'px';
    const pr = panel.getBoundingClientRect();
    let top = r.bottom + 5;
    if (top + pr.height > window.innerHeight - 8) top = Math.max(8, r.top - pr.height - 5);
    const left = Math.max(6, Math.min(r.left, window.innerWidth - pr.width - 6));
    panel.style.top  = top + 'px';
    panel.style.left = left + 'px';
  }

  function openPanel() {
    document.querySelectorAll('.csel-panel').forEach(p => {
      if (p !== panel) {
        p.style.display = 'none';
        (p._cselTrigger || p.parentElement?.querySelector('.csel-trigger'))?.classList.remove('open');
      }
    });
    document.body.appendChild(panel);
    wrap._lapCselPanel = panel;
    panel.style.visibility = 'hidden';
    panel.style.display = 'block';
    positionPanel();
    panel.style.visibility = 'visible';
    trigger.classList.add('open');
  }

  function closePanel() {
    panel.style.display = 'none';
    trigger.classList.remove('open');
    if (panel.parentElement === document.body) wrap.appendChild(panel);
    wrap._lapCselPanel = null;
  }

  trigger.onclick = (e) => {
    e.stopPropagation();
    const isOpen = panel.style.display !== 'none';
    isOpen ? closePanel() : (opts.length > 0 && openPanel());
  };
  panel.addEventListener('click', e => e.stopPropagation());

  const outsideHandler = (e) => {
    if (panel.style.display === 'none') return;
    if (!panel.contains(e.target) && !trigger.contains(e.target)) closePanel();
  };
  const scrollHandler = (e) => {
    if (panel.style.display === 'none') return;
    if (panel.contains(e.target)) return;
    closePanel();
  };
  document.addEventListener('click', outsideHandler);
  window.addEventListener('scroll', scrollHandler, true);
  window.addEventListener('resize', scrollHandler, true);
  wrap._lapCselOutside = outsideHandler;
  wrap._lapCselScroll  = scrollHandler;
  wrap._lapCselResize  = scrollHandler;
}

function openLapTemplateModal(id = null, jenis = null, parentId = null, parentNama = null, nama = null) {
  _lapTemplateEditId = id;
  const isUrusan = (jenis === 'urusan') || (_lapMode === 'urusan' && !jenis);
  const resolvedJenis = jenis || (_lapMode === 'urusan' ? 'urusan' : 'tujuan');

  document.getElementById('modalLapTemplateTitle').textContent = id ? `Edit ${LAP_JENIS_LABEL[resolvedJenis]}` : `Tambah ${LAP_JENIS_LABEL[resolvedJenis]}`;
  document.getElementById('lapTemplateId').value     = id || '';
  document.getElementById('lapTemplateJenis').value  = resolvedJenis;
  document.getElementById('lapTemplateNama').value   = nama || '';

  const badge = document.getElementById('lapTemplateJenisBadge');
  const c = LAP_JENIS_COLOR[resolvedJenis] || {};
  badge.style.background = c.bg || '#f1f5f9';
  badge.style.color      = c.col || '#475569';
  badge.textContent      = LAP_JENIS_LABEL[resolvedJenis] || resolvedJenis;

  document.getElementById('lapTemplateJenisDisplay').style.display = !isUrusan ? '' : 'none';

  const parentDisplay = document.getElementById('lapTemplateParentDisplay');
  const level = LAP_CASCADE_LEVELS.indexOf(resolvedJenis);
  if (!isUrusan && level > 0) {
    parentDisplay.style.display = '';
    const parentJenis = LAP_CASCADE_LEVELS[level - 1];
    _buildLapParentCsel('lapTemplateParentWrap', [], parentId, '- Memuat Induk -', LAP_JENIS_LABEL[parentJenis]);
    fetch(`/api/kinerja/laporan-template?jenis=${parentJenis}`, { headers: authHeaders() })
      .then(r => r.json())
      .then(data => {
        const opts = (data.templates || []).map((t, i) => ({
          value: String(t.id),
          label: `${LAP_JENIS_LABEL[parentJenis]} ${i + 1}: ${t.nama}`
        }));
        _buildLapParentCsel('lapTemplateParentWrap', opts, parentId ? String(parentId) : '', `- Pilih ${LAP_JENIS_LABEL[parentJenis]} -`, LAP_JENIS_LABEL[parentJenis]);
      })
      .catch(() => {
        _buildLapParentCsel('lapTemplateParentWrap', [], '', '- Gagal memuat -', '');
      });
  } else {
    parentDisplay.style.display = 'none';
  }

  document.getElementById('lapTemplateUrutanWrap').style.display = isUrusan ? '' : 'none';
  if (isUrusan) {
    const nextUrutan = _lapTemplateList.length ? Math.max(..._lapTemplateList.map(t => t.urutan || 0)) + 1 : 1;
    document.getElementById('lapTemplateUrutanInput').value = id
      ? (_lapTemplateList.find(t => t.id === id)?.urutan ?? 0)
      : nextUrutan;
  }

  openModal('modalLapTemplate');
  setTimeout(() => document.getElementById('lapTemplateNama').focus(), 100);
}

async function saveLapTemplate() {
  const id       = document.getElementById('lapTemplateId').value;
  const jenis    = document.getElementById('lapTemplateJenis').value;
  const nama     = document.getElementById('lapTemplateNama').value.trim();
  const parentId = document.getElementById('lapTemplateParent').value || null;
  const isUrusan = jenis === 'urusan';
  const urutan   = isUrusan
    ? (parseInt(document.getElementById('lapTemplateUrutanInput').value) || 0)
    : 0;

  if (!nama) { toast('Nama template wajib diisi', 'error'); return; }

  try {
    const url    = id ? `/api/kinerja/laporan-template/${id}` : '/api/kinerja/laporan-template';
    const method = id ? 'PUT' : 'POST';
    const res    = await fetch(url, {
      method,
      headers: { ...authHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ jenis, nama, urutan, parent_id: parentId })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Gagal menyimpan');
    toast(id ? 'Template berhasil diperbarui' : 'Template berhasil ditambahkan', 'success');
    closeModal('modalLapTemplate');

    if (isUrusan) {
      loadLapTemplateAdmin();
    } else {
      const level = LAP_CASCADE_LEVELS.indexOf(jenis);
      const newParentId = parentId ? parseInt(parentId) : null;
      const oldParentId = level > 0 ? _lapCascadeSel[level - 1] : null;
      const parentChanged = level > 0 && newParentId !== oldParentId;

      if (parentChanged && level > 0) {
        _lapCascadeSel[level - 1] = null;
        const parentLevel   = level - 1;
        const grandParentId = parentLevel > 0 ? _lapCascadeSel[parentLevel - 1] : null;
        if (!_lapCascadeCache[`${parentLevel}_${grandParentId ?? 'root'}`]) {
          await _loadCascadeLevel(parentLevel, grandParentId);
        }
        await _selectCascadeItem(level - 1, newParentId);
      } else {
        await _loadCascadeLevel(level, newParentId);
      }
    }
  } catch (e) {
    toast(e.message, 'error');
  }
}

async function deleteLapTemplate(id, nama, mode = 'urusan', cascadeLevel = null) {
  const ok = await showConfirm({ title: 'Hapus Template', msg: `Hapus <b>${escHtml(nama)}</b>? Semua mapping indikatornya juga akan dihapus.`, okText: 'Ya, Hapus', type: 'danger', icon: 'trash' });
  if (!ok) return;
  try {
    const res = await fetch(`/api/kinerja/laporan-template/${id}`, { method: 'DELETE', headers: authHeaders() });
    if (!res.ok) throw new Error('Gagal menghapus');
    toast('Template dihapus', 'success');

    if (mode === 'cascade' && cascadeLevel !== null) {
      if (_lapCascadeSel[cascadeLevel] === id) {
        _lapCascadeSel[cascadeLevel] = null;
        for (let l = cascadeLevel + 1; l < LAP_CASCADE_LEVELS.length; l++) {
          const c2 = document.getElementById(`lapColList_${l}`);
          if (c2) c2.innerHTML = '<div class="lap-col-hint">← Pilih item di kiri</div>';
        }
      }
      const parentLevelId = cascadeLevel > 0 ? _lapCascadeSel[cascadeLevel - 1] : null;
      await _loadCascadeLevel(cascadeLevel, parentLevelId);
    } else {
      loadLapTemplateAdmin();
    }
  } catch (e) {
    toast(e.message, 'error');
  }
}

async function openLapTemplateIndikatorModal(templateId, templateNama, templateJenis) {
  _lapTplCurrentTemplateId = templateId;
  _lapTplSelectedIds = new Set();
  document.getElementById('modalLapTemplateIndTitle').textContent = `Indikator - ${templateNama}`;
  document.getElementById('modalLapTemplateIndSub').textContent = templateJenis === 'urusan' ? 'Template Urusan' : 'Template Tujuan/Sasaran/Program';
  document.getElementById('lapTplIndSearch').value = '';
  document.getElementById('lapTplIndFilterJenis').value = '';
  document.getElementById('lapTplIndList').innerHTML = '<div style="text-align:center;padding:20px;color:#94a3b8"><span class="btn-spin" style="width:11px;height:11px;vertical-align:-1px;margin-right:6px"></span>Memuat data...</div>';
  openModal('modalLapTemplateIndikator');

  try {
    const [allRes, selRes] = await Promise.all([
      fetch('/api/kinerja/indikator', { headers: authHeaders() }),
      fetch(`/api/kinerja/laporan-template/${templateId}/indikator`, { headers: authHeaders() })
    ]);
    const allData = await allRes.json();
    const selData = await selRes.json();
    _lapTplAllIndikator = allData.indikator || allData.data || [];
    (selData.indikator || []).forEach(r => _lapTplSelectedIds.add(r.id));
    _filterLapTplIndList();
  } catch (e) {
    document.getElementById('lapTplIndList').innerHTML = '<div style="text-align:center;padding:20px;color:#dc2626">Gagal memuat indikator</div>';
  }
}

function _filterLapTplIndList() {
  const q     = (document.getElementById('lapTplIndSearch')?.value || '').toLowerCase();
  const jenis = document.getElementById('lapTplIndFilterJenis')?.value || '';
  let list    = _lapTplAllIndikator;
  if (q)     list = list.filter(r => (r.indikator_kinerja || '').toLowerCase().includes(q));
  if (jenis === 'iku')  list = list.filter(r => r.jenis_monev);
  if (jenis === 'ikk')  list = list.filter(r => r.jenis_ikk);
  if (jenis === 'spm')  list = list.filter(r => r.jenis_spm);

  const container = document.getElementById('lapTplIndList');
  const info      = document.getElementById('lapTplIndSelectedInfo');
  if (info) info.textContent = `${_lapTplSelectedIds.size} indikator terpilih dari ${_lapTplAllIndikator.length}`;

  if (!list.length) {
    container.innerHTML = '<div style="text-align:center;padding:20px;color:#94a3b8">Tidak ada indikator</div>';
    return;
  }

  const jenisBadge = (r) => {
    const arr = [];
    if (r.jenis_monev) arr.push(`<span style="background:#d1fae5;color:#065f46;border-radius:3px;padding:1px 5px;font-size:.66rem;font-weight:700">IKU</span>`);
    if (r.jenis_ikk)   arr.push(`<span style="background:#dbeafe;color:#1d4ed8;border-radius:3px;padding:1px 5px;font-size:.66rem;font-weight:700">IKK</span>`);
    if (r.jenis_spm)   arr.push(`<span style="background:#fef3c7;color:#92400e;border-radius:3px;padding:1px 5px;font-size:.66rem;font-weight:700">SPM</span>`);
    return arr.join(' ');
  };

  container.innerHTML = list.map(r => {
    const checked = _lapTplSelectedIds.has(r.id);
    return `<label style="display:flex;align-items:flex-start;gap:10px;padding:7px 8px;border-radius:6px;cursor:pointer;background:${checked ? '#f0fdf4' : 'transparent'};transition:background .1s" id="lapTplRow_${r.id}">
      <input type="checkbox" ${checked ? 'checked' : ''} style="margin-top:3px;accent-color:#0d9488;width:15px;height:15px;flex-shrink:0"
        onchange="_lapTplToggle(${r.id}, this.checked, this.closest('label'))">
      <div style="flex:1;min-width:0">
        <div style="font-size:.82rem;font-weight:600;color:#1e293b;line-height:1.4">${escHtml(r.indikator_kinerja)}</div>
        <div style="font-size:.72rem;color:#64748b;margin-top:2px">${r.satuan || ''} &nbsp;${jenisBadge(r)}</div>
      </div>
    </label>`;
  }).join('');
}

function _lapTplToggle(id, checked, labelEl) {
  if (checked) _lapTplSelectedIds.add(id);
  else _lapTplSelectedIds.delete(id);
  if (labelEl) labelEl.style.background = checked ? '#f0fdf4' : 'transparent';
  const info = document.getElementById('lapTplIndSelectedInfo');
  if (info) info.textContent = `${_lapTplSelectedIds.size} indikator terpilih dari ${_lapTplAllIndikator.length}`;
}

function _lapTplSelectAll() {
  const q     = (document.getElementById('lapTplIndSearch')?.value || '').toLowerCase();
  const jenis = document.getElementById('lapTplIndFilterJenis')?.value || '';
  let list    = _lapTplAllIndikator;
  if (q)     list = list.filter(r => (r.indikator_kinerja || '').toLowerCase().includes(q));
  if (jenis === 'iku') list = list.filter(r => r.jenis_monev);
  if (jenis === 'ikk') list = list.filter(r => r.jenis_ikk);
  if (jenis === 'spm') list = list.filter(r => r.jenis_spm);
  list.forEach(r => _lapTplSelectedIds.add(r.id));
  _filterLapTplIndList();
}

function _lapTplClearAll() {
  _lapTplSelectedIds.clear();
  _filterLapTplIndList();
}

async function saveLapTemplateIndikator() {
  if (!_lapTplCurrentTemplateId) return;
  const ids = [..._lapTplSelectedIds];
  try {
    const res = await fetch(`/api/kinerja/laporan-template/${_lapTplCurrentTemplateId}/indikator`, {
      method: 'POST',
      headers: { ...authHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ indikator_ids: ids })
    });
    if (!res.ok) throw new Error('Gagal menyimpan');
    toast(`${ids.length} indikator berhasil disimpan`, 'success');
    closeModal('modalLapTemplateIndikator');

    
    
    let reloaded = false;
    for (let level = 0; level < LAP_CASCADE_LEVELS.length; level++) {
      const cached = _lapCascadeCache[`${level}_${level === 0 ? 'root' : (_lapCascadeSel[level - 1] ?? 'root')}`] || [];
      if (cached.some(t => t.id === _lapTplCurrentTemplateId)) {
        const parentLevelId = level > 0 ? _lapCascadeSel[level - 1] : null;
        await _loadCascadeLevel(level, parentLevelId);
        reloaded = true;
        break;
      }
    }
    if (!reloaded) loadLapTemplateAdmin();
  } catch (e) {
    toast(e.message, 'error');
  }
}