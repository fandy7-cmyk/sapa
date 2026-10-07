
// ═══ Kinerja = PER TRIWULAN ═══
// Kolom `bulan` di DB berisi bulan akhir TW: TW I=3, II=6, III=9, IV=12.
// Nama diawali _dTw supaya gak bentrok dengan helper di kinerja.js (sama-sama global).
const _DTW_BULAN = [3, 6, 9, 12];
const _DTW_ROM   = ['', 'I', 'II', 'III', 'IV'];
function _dTwSekarang() { return Math.ceil((new Date().getMonth() + 1) / 3) * 3; }
function _dSnapTw(r) {
  if (!r || !r.bulan) return r;
  const b = Math.ceil(r.bulan / 3) * 3;
  return { ...r, bulan: b, key: `${r.tahun}-${String(b).padStart(2, '0')}` };
}

// Dedupe GET identik yang lagi in-flight. Beberapa widget dashboard (IKU grid, chart IKU,
// Pantau Indikator) manggil endpoint yang sama hampir bersamaan - sekarang cuma 1 request
// jaringan, sisanya dapat clone response-nya. Entry dihapus begitu selesai, jadi tidak ada
// data basi (bukan cache).
const _dashInflight = new Map();
function _dashFetchOnce(url) {
  let p = _dashInflight.get(url);
  if (!p) {
    p = fetch(url, { headers: authHeaders() });
    _dashInflight.set(url, p);
    const clear = () => { if (_dashInflight.get(url) === p) _dashInflight.delete(url); };
    p.then(clear, clear);
  }
  return p.then(r => r.clone());
}

async function loadDashboard() {
  const wrap = document.getElementById('dashStats');
  if (!wrap) return;

  const isAdmin     = _user?.is_admin;
  const showLink    = isAdmin || hasAccess('superlink.link') || hasAccess('superlink.shortlink') || hasAccess('superlink.bundle');
  const showSuratM  = isAdmin || hasAccess('surat.masuk');
  const showSuratK  = isAdmin || hasAccess('surat.keluar');
  const showSurat   = showSuratM || showSuratK;
  // Dashboard utama sengaja menampilkan ringkasan Kinerja ke semua user (read-only, dikecualikan dari
  // pembatasan akses modul); dashboard modul Kinerja yang dibatasi sesuai akses.
  const showKinerja = true;

  
  wrap.innerHTML = `
    <div style="height:68px;border-radius:14px;margin-bottom:20px" class="skeleton"></div>
    <div class="skeleton" style="height:200px;border-radius:16px"></div>`;

  
  const [stats, suratRes, kinerjaRes] = await Promise.allSettled([
    showLink    ? _fetchStats()        : Promise.resolve(null),
    showSurat   ? _fetchSuratStats()   : Promise.resolve(null),
    showKinerja ? _fetchKinerjaStats() : Promise.resolve(null),
  ]);

  const st = stats.value     ?? null;
  const ss = suratRes.value  ?? null;
  const ks = kinerjaRes.value ?? null;

  
  
  function _witaNow() {
    
    const now = new Date();
    const utc = now.getTime() + now.getTimezoneOffset() * 60000;
    return new Date(utc + 8 * 3600000);
  }
  function _witaJam(d) {
    return `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}:${String(d.getSeconds()).padStart(2,'0')} WITA`;
  }

  const _wNow  = _witaNow();
  const jam    = _wNow.getHours();
  const salam  = jam < 11 ? 'Selamat pagi' : jam < 15 ? 'Selamat siang' : jam < 18 ? 'Selamat sore' : 'Selamat malam';
  const _wHari = ['Minggu','Senin','Selasa','Rabu','Kamis','Jumat','Sabtu'][_wNow.getDay()];
  const _wBln  = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'][_wNow.getMonth()];
  const _wTgl  = `${_wHari}, ${_wNow.getDate()} ${_wBln} ${_wNow.getFullYear()}`;

  
  
  const _greetIcon = (() => {
    if (jam < 11) return { color: '#0d9488', svg: '<path d="M12 2v8"/><path d="m4.93 10.93 1.41 1.41"/><path d="M2 18h2"/><path d="M20 18h2"/><path d="m19.07 10.93-1.41 1.41"/><path d="M22 22H2"/><path d="m8 6 4-4 4 4"/><path d="M16 18a4 4 0 0 0-8 0"/>' };
    if (jam < 15) return { color: '#eab308', svg: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/>' };
    if (jam < 18) return { color: '#f97316', svg: '<path d="M12 10V2"/><path d="m4.93 10.93 1.41 1.41"/><path d="M2 18h2"/><path d="M20 18h2"/><path d="m19.07 10.93-1.41 1.41"/><path d="M22 22H2"/><path d="m16 6-4 4-4-4"/><path d="M16 18a4 4 0 0 0-8 0"/>' };
    return { color: '#6366f1', svg: '<path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/>' };
  })();
  const greetIconSvg = `<span class="dash-greet-icon" style="color:${_greetIcon.color}"><svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-2px;margin-left:2px">${_greetIcon.svg}</svg></span>`;

  
  
  const _DASH_QUOTES = [
    'Pelayanan yang baik dimulai dari hal-hal kecil yang dikerjakan konsisten.',
    'Data yang rapi hari ini adalah keputusan yang tepat esok hari.',
    'Kerja yang terukur lebih bermakna daripada kerja yang sekadar sibuk.',
    'Setiap laporan yang diisi tepat waktu, memudahkan langkah berikutnya.',
    'Perbaikan kecil yang konsisten mengalahkan perubahan besar yang sesekali.',
    'Transparansi dimulai dari data yang selalu diperbarui.',
    'Hari ini adalah kesempatan baru untuk menyelesaikan yang tertunda.',
    'Kerja rapi bukan soal cepat, tapi soal bisa dipercaya.',
    'Satu langkah kecil hari ini, satu masalah lebih sedikit besok.',
    'Ketepatan waktu adalah bentuk sederhana dari tanggung jawab.',
    'Pekerjaan yang terdokumentasi dengan baik adalah warisan untuk tim.',
    'Fokus pada progres, bukan kesempurnaan sesaat.',
    'Yang dikerjakan hari ini, menentukan kelancaran hari esok.',
    'Kualitas layanan publik dimulai dari kualitas kerja di balik layar.',
    'Konsistensi kecil setiap hari membangun hasil besar dalam setahun.',
    'Masyarakat menilai dari layanan, bukan dari alasan.',
    'Sistem yang baik memudahkan orang jujur dan mempersulit yang curang.',
    'Kerja tim yang solid dimulai dari komunikasi yang jelas.',
    'Data yang akurat adalah bentuk penghormatan pada mereka yang membutuhkannya.',
    'Jangan tunda yang bisa diselesaikan hari ini juga.',
    'Detail kecil sering menentukan hasil yang besar.',
    'Semangat pagi menentukan produktivitas sepanjang hari.',
    'Kepercayaan publik dibangun dari kerja yang konsisten, bukan janji.',
    'Rencana yang baik separuh dari pekerjaan yang selesai.',
    'Evaluasi bukan untuk mencari salah, tapi untuk memperbaiki arah.',
    'Kolaborasi yang baik membuat pekerjaan berat terasa ringan.',
    'Disiplin kecil hari ini, hasil besar di kemudian hari.',
    'Setiap indikator yang terisi adalah langkah menuju keputusan yang lebih baik.',
    'Kerja cerdas dimulai dari memahami prioritas.',
    'Integritas adalah melakukan yang benar walau tidak ada yang mengawasi.',
    'Perubahan besar selalu dimulai dari kebiasaan kecil yang dijaga.',
    'Waktu yang digunakan dengan baik hari ini, menghemat waktu di hari nanti.',
    'Belajar dari kesalahan lebih berharga daripada menghindarinya.',
    'Pelayanan terbaik lahir dari niat yang tulus untuk membantu.',
    'Progres yang lambat tetap lebih baik daripada berhenti.',
    'Kejelasan tujuan membuat langkah kerja jadi lebih ringan.',
    'Tanggung jawab kecil yang dijalankan konsisten membangun reputasi besar.',
    'Sabar dalam proses, konsisten dalam usaha.',
    'Kerja yang jujur selalu meninggalkan jejak yang baik.',
    'Hari yang produktif dimulai dari niat yang jernih di pagi hari.',
  ];
  const _dayOfYear = Math.floor((Date.UTC(_wNow.getFullYear(), _wNow.getMonth(), _wNow.getDate()) - Date.UTC(_wNow.getFullYear(), 0, 0)) / 86400000);
  const _quoteStartIdx = _dayOfYear % _DASH_QUOTES.length;
  const _todayQuote = _DASH_QUOTES[_quoteStartIdx];
  const quoteHtml = `
    <div class="dash-welcome-mid">
      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="dash-welcome-quote-icon"><path d="M3 21c3 0 7-1 7-8V5c0-1.25-.756-2.017-2-2H4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2 1 0 1 0 1 1v1c0 1-1 2-2 2s-1 .008-1 1.031V20c0 1 0 1 1 1z"/><path d="M15 21c3 0 7-1 7-8V5c0-1.25-.757-2.017-2-2h-4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2h.75c0 2.25.25 4-2.75 4v3c0 1 0 1 1 1z"/></svg>
      <span class="dash-welcome-quote-text" id="dash-welcome-quote-text">${esc(_todayQuote)}</span>
    </div>`;

  let html = `
    <div class="dash-welcome">
      <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;flex-wrap:nowrap">
        <div class="dash-welcome-col" style="flex:1;min-width:0">
          <div class="dash-welcome-row"><span class="dash-welcome-salam">${salam}</span>${greetIconSvg}</div>
          <div class="dash-welcome-row"><strong class="dash-welcome-name">${esc(_user?.nama || 'Pengguna')}</strong></div>
        </div>
        ${quoteHtml}
        <div class="dash-welcome-col dash-welcome-col--right" style="flex-shrink:0;white-space:nowrap">
          <div class="dash-welcome-row"><span class="dash-welcome-date">${_wTgl}</span></div>
          <div class="dash-welcome-row">
            <span class="dash-live-dot"></span>
            <span id="dash-live-clock" class="dash-live-clock">${_witaJam(_wNow)}</span>
          </div>
        </div>
      </div>
    </div>`;

  
  if (window._dashClockInterval) clearInterval(window._dashClockInterval);
  window._dashClockInterval = setInterval(() => {
    const el = document.getElementById('dash-live-clock');
    if (el) el.textContent = _witaJam(_witaNow());
    else clearInterval(window._dashClockInterval);
  }, 1000);

  
  
  
  if (window._dashQuoteInterval) clearInterval(window._dashQuoteInterval);
  let _quoteIdx = _quoteStartIdx;
  window._dashQuoteInterval = setInterval(() => {
    const el = document.getElementById('dash-welcome-quote-text');
    if (!el) { clearInterval(window._dashQuoteInterval); return; }
    el.style.opacity = '0';
    setTimeout(() => {
      const el2 = document.getElementById('dash-welcome-quote-text');
      if (!el2) return;
      _quoteIdx = (_quoteIdx + 1) % _DASH_QUOTES.length;
      el2.textContent = _DASH_QUOTES[_quoteIdx];
      el2.style.opacity = '1';
    }, 350);
  }, 10000);

  
  const panels = [];

  if (showSuratM && ss?.recent_masuk?.length) panels.push(_recentSuratPanel(ss.recent_masuk, 'masuk'));
  if (showSuratK && ss?.recent_keluar?.length) panels.push(_recentSuratPanel(ss.recent_keluar, 'keluar'));

  if (panels.length) html += `<div class="dash-panels">${panels.join('')}</div>`;

  
  if (showKinerja) {
    html += `<div id="ikuGridWidget"></div>`;
  }

  
  if (showKinerja) {
    html += `<div id="kinerjaWatchWidget"></div>`;
  }

  wrap.innerHTML = html;

  
  if (showKinerja) _initIkuGrid();
  if (showKinerja) _initKinerjaWatch();
}

function _dashModuleHeader(icon, title, subtitle) {
  return `<div class="page-title" style="display:flex;align-items:center;gap:10px">${icon}${esc(title)}</div>
    <div class="page-subtitle">${esc(subtitle)}</div>`;
}

// ═══════════════════════════════════════════════════════════════════════════
// KIT DASHBOARD MODUL - gaya "Pemantauan Sistem" (hero ringkasan, KPI + sparkline,
// grafik area/bar, donut, daftar bar, insight). Dipakai Dashboard Superlink, Surat,
// Absensi, Lembur & Kinerja. Prefix _dm / .dm- supaya gak bentrok dengan modul lain.
// ═══════════════════════════════════════════════════════════════════════════
const _DM_PAL = { ok: '#16a34a', warn: '#d97706', bad: '#dc2626', info: '#2563eb', teal: '#047D78', ungu: '#7c3aed', abu: '#64748b', pink: '#a21caf', sky: '#0ea5e9' };
const _DM_BLN = ['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agu','Sep','Okt','Nov','Des'];
const _dmNf  = (n) => Number(n || 0).toLocaleString('id-ID');
const _dmPct = (a, b) => b ? Math.round(a * 100 / b) : 0;
const _dmYmd = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

const _DM_CSS = `
.dm .t-ok{--tone:#16a34a;--tone-bg:#f0fdf4}.dm .t-warn{--tone:#d97706;--tone-bg:#fffbeb}.dm .t-bad{--tone:#dc2626;--tone-bg:#fef2f2}.dm .t-info{--tone:#2563eb;--tone-bg:#eff6ff}.dm .t-abu{--tone:#64748b;--tone-bg:#f8fafc}
.dm-hero{position:relative;overflow:hidden;display:flex;align-items:flex-start;gap:var(--sp-4);flex-wrap:wrap;padding:var(--sp-4) var(--sp-5) var(--sp-4) var(--sp-4);margin-bottom:var(--sp-4);background:var(--tone-bg);border:1.5px solid color-mix(in srgb,var(--tone) 28%,#fff);border-radius:var(--r-lg,16px)}
.dm-hero>*{position:relative;z-index:1}
.dm-pulse{flex-shrink:0;width:10px;height:10px;border-radius:50%;background:var(--tone);box-shadow:0 0 0 0 color-mix(in srgb,var(--tone) 55%,transparent);animation:dmPulse 2.2s ease-out infinite}
@keyframes dmPulse{70%{box-shadow:0 0 0 9px transparent}100%{box-shadow:0 0 0 0 transparent}}
.dm-hero-main{flex:1;min-width:240px}
.dm-hero-head{display:flex;align-items:center;gap:10px;min-height:36px}
.dm-hero-ic{display:flex;align-items:center;justify-content:center;width:36px;height:36px;border-radius:9px;flex-shrink:0;background:color-mix(in srgb,var(--tone) 14%,#fff);border:1px solid color-mix(in srgb,var(--tone) 28%,#fff);color:var(--tone)}
.dm-hero-body{margin-top:6px}
.dm-hero-title{font-size:.95rem;font-weight:700;color:var(--teks);line-height:1.3}
.dm-hero-text{font-size:var(--fs-sm);color:var(--teks-muted);line-height:1.55;max-width:72ch}
.dm-hero-text+.dm-hero-text{margin-top:2px}
.dm-hero-text b{color:var(--teks)}
.dm-hero-aside{display:flex;flex-direction:column;align-items:flex-end;gap:4px;text-align:right;flex-shrink:0}
.dm-dots{position:absolute!important;right:0;bottom:0;width:48%;height:100%;pointer-events:none;z-index:0!important;background-image:radial-gradient(circle,var(--tone) 1.3px,transparent 1.6px);background-size:16px 14px;opacity:.2;-webkit-mask-image:linear-gradient(to right,transparent,#000 85%);mask-image:linear-gradient(to right,transparent,#000 85%)}
.dm-ecg{position:absolute!important;right:0;bottom:0;width:46%;height:70%;pointer-events:none;z-index:0!important}
.dm-ecg polyline{fill:none;stroke:var(--tone);stroke-width:2;opacity:.2;vector-effect:non-scaling-stroke;stroke-linejoin:round}
.dm-pills{display:flex;flex-wrap:wrap;gap:6px;margin-top:var(--sp-3)}
.dm-pill{display:inline-flex;align-items:center;gap:6px;padding:3px 10px;border-radius:999px;background:#fff;border:1px solid var(--abu-2);font-size:var(--fs-sm);font-weight:600;color:var(--teks)}
.dm-pill i{width:8px;height:8px;border-radius:50%;flex-shrink:0}
.dm-pill b{font-weight:700;color:var(--teks);font-variant-numeric:tabular-nums}
.dm-kpis{display:grid;grid-template-columns:repeat(auto-fit,minmax(190px,1fr));gap:var(--sp-4);margin-bottom:var(--sp-4)}
.dm-kpi{display:flex;flex-direction:column;gap:3px;padding:var(--sp-4) var(--sp-5);background:#fff;border:1.5px solid var(--abu-2);border-radius:var(--r-md);min-width:0;transition:border-color .18s,box-shadow .18s}
.dm-kpi[onclick]{cursor:pointer}.dm-kpi[onclick]:hover{border-color:var(--c);box-shadow:var(--shadow-md)}
.dm-kpi-top{display:flex;align-items:center;justify-content:space-between;gap:8px;font-size:var(--fs-sm);font-weight:600;color:var(--teks-muted)}
.dm-kpi-ic{display:flex;align-items:center;justify-content:center;width:28px;height:28px;border-radius:8px;flex-shrink:0}
.dm-kpi-val{font-size:var(--fs-2xl);font-weight:800;line-height:1.15;color:var(--c,var(--teks));white-space:nowrap}
.dm-kpi-foot{display:flex;align-items:flex-end;justify-content:space-between;gap:8px;min-height:28px}
.dm-kpi-sub{font-size:.7rem;color:var(--teks-muted);line-height:1.4}
.dm-kpi-sp{flex-shrink:0}
.dm-cols{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,340px),1fr));gap:var(--sp-4);margin-bottom:var(--sp-4)}
.dm-cols.wide{grid-template-columns:minmax(0,1.618fr) minmax(0,1fr)}
@media(max-width:900px){.dm-cols.wide,.dm-cols.wide-r{grid-template-columns:minmax(0,1fr)}.dm-hero-aside{align-items:flex-start;text-align:left}}
@media(max-width:600px){.dm-hero-body,.dm-pills{padding-left:0}}
.dm-card{min-width:0;background:#fff;border:1.5px solid var(--abu-2);border-radius:var(--r-md);padding:var(--sp-4) var(--sp-5)}
.dm-card-h{display:flex;align-items:flex-start;justify-content:space-between;gap:8px;margin-bottom:var(--sp-3)}
.dm-card-t{font-size:var(--fs-base);font-weight:600}
.dm-card-hl{display:flex;align-items:flex-start;gap:10px;min-width:0}
.dm-card-ic{display:flex;align-items:center;justify-content:center;width:30px;height:30px;border-radius:8px;flex-shrink:0;background:var(--hijau-light,#e6f4f3)}
.dm-cols.wide-r{grid-template-columns:minmax(0,1fr) minmax(0,1.618fr)}
.dm-cols.eq>.dm-card>.dm-donut{margin-block:auto}
.dm-sub{font-size:.7rem;color:var(--teks-muted);margin-top:2px}
.dm-chart{width:100%;height:auto;display:block;overflow:visible}
.dm-ax{font-size:10px;fill:var(--teks-muted)}
.dm-gl{stroke:rgba(15,23,42,.08);stroke-dasharray:3 3}
.dm-hit{fill:transparent}.dm-hit:hover{fill:rgba(15,23,42,.06)}
.dm-legend{display:flex;flex-wrap:wrap;gap:4px 14px;font-size:var(--fs-sm);color:var(--teks-muted);margin-top:var(--sp-3)}
.dm-legend i{display:inline-block;width:9px;height:9px;border-radius:3px;margin-right:5px;vertical-align:-1px}
.dm-donut{display:flex;align-items:center;gap:var(--sp-5);flex-wrap:wrap}
.dm-donut svg{width:132px;height:132px;flex-shrink:0}
.dm-donut-s{gap:var(--sp-3);flex-wrap:nowrap}.dm-donut-s svg{width:96px;height:96px}.dm-donut-s .dm-dl{min-width:0;gap:4px}.dm-donut-s .dm-dl div{font-size:.76rem;gap:6px}.dm-donut-s .dm-dl em{min-width:30px}
.dm-dl{flex:1;min-width:150px;display:flex;flex-direction:column;gap:7px}
.dm-dl div{display:flex;align-items:center;gap:8px;font-size:.82rem}
.dm-dl i{width:10px;height:10px;border-radius:3px;flex-shrink:0}
.dm-dl span{flex:1;color:var(--teks)}.dm-dl b{font-weight:700}.dm-dl em{font-style:normal;color:var(--teks-muted);font-size:.75rem;min-width:38px;text-align:right}
.dm-hb{padding:8px 0;border-bottom:1px solid rgba(0,0,0,.05)}.dm-hb:last-child{border-bottom:none}
.dm-hb-top{display:flex;justify-content:space-between;align-items:center;gap:10px;font-size:.82rem}
.dm-hb-l{font-weight:600;overflow:hidden;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow-wrap:anywhere;line-height:1.3;min-width:0}
.dm-hb-l.full{display:block;overflow:visible;-webkit-line-clamp:unset}
.dm-hb-r{flex-shrink:0;font-size:.8rem;color:var(--teks-muted)}
.dm-hb-track{height:7px;border-radius:99px;background:rgba(0,0,0,.06);margin-top:5px;overflow:hidden}
.dm-hb-track i{display:block;height:100%;border-radius:99px}
.dm-ins{display:flex;gap:10px;align-items:flex-start;padding:9px 12px;border-radius:var(--r-sm);background:var(--tone-bg);font-size:.82rem;color:var(--teks);margin-bottom:6px}
.dm-ins:last-child{margin-bottom:0}
.dm-ins i{flex-shrink:0;width:8px;height:8px;border-radius:50%;background:var(--tone);margin-top:6px}
.dm-feed{display:flex;gap:10px;align-items:flex-start;padding:9px 0;border-bottom:1px solid rgba(0,0,0,.06)}
.dm-feed:last-child{border-bottom:none}
.dm-feed-b{min-width:0;flex:1}
.dm-feed-m{font-size:.82rem;font-weight:600;overflow:hidden;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical}
.dm-av{display:flex;align-items:center;justify-content:center;width:30px;height:30px;border-radius:50%;background:var(--hijau-light);color:var(--hijau);font-size:var(--fs-sm);font-weight:800;flex-shrink:0}
.dm-big{display:flex;align-items:baseline;gap:6px;flex-wrap:wrap;margin-bottom:10px}
.dm-big b{font-size:var(--fs-xl);font-weight:800}
.dm-big span{font-size:var(--fs-sm);color:var(--teks-muted)}
.dm-empty{padding:22px;text-align:center;color:var(--teks-muted);font-size:.84rem}
.dm-hero-v2{align-items:flex-start;padding-bottom:calc(var(--sp-4) + 20px)}
.dm-seg-wrap{margin-top:var(--sp-3);max-width:560px}
.dm-seg{display:flex;gap:2px;height:8px;border-radius:99px;overflow:hidden;background:rgba(0,0,0,.06)}
.dm-seg i{display:block;min-width:4px;height:100%}
.dm-seg-lg{display:flex;flex-wrap:wrap;gap:4px 14px;margin-top:8px;font-size:var(--fs-sm);font-weight:600;color:var(--teks-muted)}
.dm-seg-lg span{display:inline-flex;align-items:center;gap:6px}
.dm-seg-lg i{width:8px;height:8px;border-radius:50%;flex-shrink:0}
.dm-seg-lg b{color:var(--teks);font-weight:700;font-variant-numeric:tabular-nums}
.dm-hero-viz{display:flex;align-items:center;gap:var(--sp-4);flex-shrink:0;margin-left:auto}
.dm-trend{display:flex;flex-direction:column;align-items:flex-end;gap:2px;text-align:right}
.dm-trend-l{font-size:.7rem;font-weight:600;color:var(--teks-muted)}
.dm-trend-v{font-size:var(--fs-2xl);font-weight:800;line-height:1.1;color:var(--teks);font-variant-numeric:tabular-nums;white-space:nowrap}
.dm-trend-d{font-size:.72rem;font-weight:700;white-space:nowrap}
.dm-trend svg{display:block;margin-top:3px}
.dm-ring{position:relative;width:84px;height:84px;flex-shrink:0}
.dm-ring svg{width:100%;height:100%;transform:rotate(-90deg)}
.dm-ring circle{fill:none;stroke-width:3.6}
.dm-ring-bg{stroke:color-mix(in srgb,var(--tone) 16%,transparent)}
.dm-ring-fg{stroke-linecap:round;animation:dmRing .9s cubic-bezier(.22,.8,.3,1) both}
@keyframes dmRing{from{stroke-dasharray:0 100}}
.dm-ring-t{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;line-height:1.1;pointer-events:none}
.dm-ring-t b{font-size:1.15rem;font-weight:800;color:var(--teks)}
.dm-ring-t span{font-size:.6rem;font-weight:600;color:var(--teks-muted)}
.dm-hero-v2 .dm-live{position:absolute;right:var(--sp-5);bottom:10px;display:inline-flex;align-items:center;gap:6px;padding:0;border:0;background:none;font:inherit;font-size:.7rem;color:var(--teks-muted);cursor:pointer}
.dm-hero-v2 .dm-live:hover{color:var(--teks)}
.dm-live-dot{--tone:#16a34a;width:7px;height:7px;border-radius:50%;background:#16a34a;animation:dmPulse 2.2s ease-out infinite}
@media(max-width:600px){.dm-hero-v2{padding-bottom:var(--sp-3);row-gap:var(--sp-3)}.dm-hero-v2 .dm-hero-viz{display:none}.dm-hero-v2 .dm-hero-main{flex:1 1 0;min-width:0}.dm-hero-v2 .dm-dots{width:100%;height:50%;top:auto}.dm-hero-v2 .dm-live{order:4;position:static;width:100%;justify-content:flex-end}}
@media(prefers-reduced-motion:reduce){.dm-pulse,.dm-live-dot,.dm-ring-fg{animation:none}}
`;
function _dmStyle() {
  if (document.getElementById('dm-style')) return;
  const st = document.createElement('style'); st.id = 'dm-style'; st.textContent = _DM_CSS;
  document.head.appendChild(st);
}

const _DM_IC = {
  link: '<path d="M9 17H7A5 5 0 0 1 7 7h2"/><path d="M15 7h2a5 5 0 1 1 0 10h-2"/><line x1="8" x2="16" y1="12" y2="12"/>',
  click: '<path d="m9 9 5 12 1.8-5.2L21 14Z"/><path d="M7.2 2.2 8 5.1"/><path d="m5.1 8-2.9-.8"/><path d="M14 4.1 12 6"/><path d="m6 12-1.9 2"/>',
  box: '<path d="m7.5 4.27 9 5.15"/><path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/><path d="m3.3 7 8.7 5 8.7-5"/><path d="M12 22V12"/>',
  mail: '<path d="M21.2 8.4c.5.38.8.97.8 1.6v10a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V10a2 2 0 0 1 .8-1.6l8-6a2 2 0 0 1 2.4 0l8 6Z"/><path d="m22 10-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 10"/>',
  send: '<path d="M22 2L11 13"/><path d="M22 2l-7 20-4-9-9-4 20-7z"/>',
  warn: '<path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3"/><line x1="12" x2="12" y1="9" y2="13"/><line x1="12" x2="12.01" y1="17" y2="17"/>',
  clock: '<circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>',
  cal: '<rect width="18" height="18" x="3" y="4" rx="2"/><path d="M3 10h18"/><path d="M8 2v4"/><path d="M16 2v4"/>',
  check: '<path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>',
  user: '<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>',
  photo: '<rect width="18" height="18" x="3" y="3" rx="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/>',
  target: '<circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/>',
  trend: '<polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/>',
  doc: '<path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/>',
  alert: '<circle cx="12" cy="12" r="10"/><line x1="12" x2="12" y1="8" y2="12"/><line x1="12" x2="12.01" y1="16" y2="16"/>',
  info: '<circle cx="12" cy="12" r="10"/><line x1="12" x2="12" y1="16" y2="12"/><line x1="12" x2="12.01" y1="8" y2="8"/>',
  grid: '<rect x="3" y="3" width="7" height="9" rx="1"/><rect x="14" y="3" width="7" height="5" rx="1"/><rect x="14" y="12" width="7" height="9" rx="1"/><rect x="3" y="16" width="7" height="5" rx="1"/>',
};
const _dmIc = (k, c, s) => `<svg xmlns="http://www.w3.org/2000/svg" width="${s || 15}" height="${s || 15}" fill="none" viewBox="0 0 24 24" stroke="${c}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${_DM_IC[k] || _DM_IC.grid}</svg>`;

const _DM_ECG = '<div class="dm-dots" aria-hidden="true"></div>';
function _dmHeroLegacy({ tone, title, text, pills, reload }) {
  const jam = new Date().toLocaleTimeString('id-ID', { timeZone: 'Asia/Makassar', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).replace(/\./g, ':');
  // text boleh string atau array kalimat pendek (satu baris per kalimat, yang kosong dilewati)
  const lines = (Array.isArray(text) ? text : [text]).filter(Boolean);
  const icKey = { ok: 'check', warn: 'warn', bad: 'alert' }[tone] || 'info';
  return `<div class="dm-hero t-${tone}">
    <span class="dm-hero-ic">${_dmIc(icKey, 'currentColor', 20)}</span>
    <div class="dm-hero-main">
      <div class="dm-hero-head"><div class="dm-hero-title">${title}</div></div>
      ${lines.length ? `<div class="dm-hero-body">${lines.map(l => `<div class="dm-hero-text">${l}</div>`).join('')}</div>` : ''}
      ${pills && pills.length ? `<div class="dm-pills">${pills.join('')}</div>` : ''}</div>
    <div class="dm-hero-aside">${reload ? `<button class="btn btn-sm btn-outline-hijau" onclick="${reload}"><svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5" style="margin-right:5px;vertical-align:-2px"><path stroke-linecap="round" stroke-linejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg>Muat ulang</button>` : ''}<div class="dm-sub">Diperbarui ${jam} WITA</div></div>
  </div>`;
}
// Hero v2: ring (A), bar segmen (B), angka + tren (C), garis detak + "Langsung" (D).
// ring  = { pct, label, color?, tip? }
// seg   = [{ label, val, color, bar? }]  (bar:false = cuma tampil di legenda, gak masuk bar)
// trend = { label, val, d, unit, vs, vals, invert?, neutral?, note? }
function _dmRing(r) {
  const p = Math.max(0, Math.min(100, Math.round(Number(r.pct) || 0)));
  const col = r.color || 'var(--tone)';
  return `<div class="dm-ring" data-tip="${esc(r.tip || `${p}% ${r.label}`)}"><svg viewBox="0 0 36 36" aria-hidden="true"><circle class="dm-ring-bg" cx="18" cy="18" r="15.9155"/><circle class="dm-ring-fg" cx="18" cy="18" r="15.9155" pathLength="100" stroke="${col}" stroke-dasharray="${p} 100"/></svg><div class="dm-ring-t"><b>${p}%</b><span>${esc(r.label)}</span></div></div>`;
}
function _dmSegBar(seg) {
  const bars = seg.filter(s => s.bar !== false && s.val > 0);
  const tot = bars.reduce((a, s) => a + s.val, 0);
  return `<div class="dm-seg" role="img" aria-label="${esc(seg.map(s => `${s.label} ${s.val}`).join(', '))}">${bars.map(s => `<i style="flex:${s.val} 1 0;background:${s.color}" data-tip="${esc(`${s.label}: ${_dmNf(s.val)} (${Math.round(s.val * 100 / tot)}%)`)}"></i>`).join('')}</div>`;
}
const _dmSegLg = (seg) => `<div class="dm-seg-lg">${seg.map(s => `<span><i style="background:${s.color}"></i>${s.label} <b>${_dmNf(s.val)}</b></span>`).join('')}</div>`;
// garis tren kecil, skala min-max supaya naik-turunnya kelihatan
function _dmTrendLine(vals, color, w, h) {
  vals = (vals || []).filter(v => v != null && isFinite(v)).map(Number);
  if (vals.length < 2) return '';
  const mn = Math.min(...vals), mx = Math.max(...vals), rg = mx - mn || 1, st = w / (vals.length - 1);
  const pts = vals.map((v, i) => [i * st, mx === mn ? h / 2 : h - 3 - ((v - mn) / rg) * (h - 6)]);
  const line = 'M' + pts.map(q => q[0].toFixed(1) + ',' + q[1].toFixed(1)).join('L');
  const last = pts[pts.length - 1];
  return `<svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" aria-hidden="true"><path d="${line}" fill="none" stroke="${color}" stroke-width="1.8" stroke-linejoin="round" stroke-linecap="round"/><circle cx="${last[0].toFixed(1)}" cy="${last[1].toFixed(1)}" r="2.4" fill="${color}"/></svg>`;
}
function _dmTrend(t) {
  const has = t.d != null && isFinite(t.d);
  const d = has ? Math.round(t.d * 10) / 10 : null;
  let col = _DM_PAL.abu;
  if (has && d !== 0) col = t.neutral ? _DM_PAL.info : ((t.invert ? d < 0 : d > 0) ? _DM_PAL.ok : _DM_PAL.bad);
  const sign = !has ? '' : d > 0 ? '+' : d < 0 ? '\u2212' : '';
  const num = has ? _dmNf(Math.abs(d)) : '';
  const unit = !t.unit ? '' : t.unit === '%' ? '%' : ' ' + t.unit;
  const dTxt = has ? `${sign}${num}${unit} ${t.vs || ''}`.trim() : (t.note || '');
  return `<div class="dm-trend"><div class="dm-trend-l">${t.label}</div><div class="dm-trend-v">${t.val}</div>${dTxt ? `<div class="dm-trend-d" style="color:${col}">${dTxt}</div>` : ''}${_dmTrendLine(t.vals, col === _DM_PAL.abu ? _DM_PAL.teal : col, 88, 24)}</div>`;
}
function _dmHero(o) {
  if (!o.ring) return _dmHeroLegacy(o);
  const { tone, title, text, reload, ring, seg, trend } = o;
  const jam = new Date().toLocaleTimeString('id-ID', { timeZone: 'Asia/Makassar', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).replace(/\./g, ':');
  const lines = (Array.isArray(text) ? text : [text]).filter(Boolean);
  const icKey = { ok: 'check', warn: 'warn', bad: 'alert' }[tone] || 'info';
  return `<div class="dm-hero dm-hero-v2 t-${tone}">
    ${_DM_ECG}
    <span class="dm-hero-ic">${_dmIc(icKey, 'currentColor', 20)}</span>
    <div class="dm-hero-main">
      <div class="dm-hero-head"><div class="dm-hero-title">${title}</div></div>
      ${lines.length ? `<div class="dm-hero-body">${lines.map(l => `<div class="dm-hero-text">${l}</div>`).join('')}</div>` : ''}
      ${seg && seg.length ? `<div class="dm-seg-wrap">${_dmSegBar(seg)}${_dmSegLg(seg)}</div>` : ''}
    </div>
    <div class="dm-hero-viz">${trend ? _dmTrend(trend) : ''}${_dmRing(ring)}</div>
    <button type="button" class="dm-live"${reload ? ` onclick="${reload}" data-tip="Muat ulang"` : ' disabled'}><i class="dm-live-dot"></i>Update : ${jam} WITA</button>
  </div>`;
}
const _dmPill = (label, val, color) => `<span class="dm-pill"><i style="background:${color}"></i>${label}${val != null ? ` <b>${val}</b>` : ''}</span>`;
const _dmIns = (tone, html) => `<div class="dm-ins t-${tone}"><i></i><span>${html}</span></div>`;
// Kartu yang isinya HANYA placeholder kosong (belum ada data, atau "Semua ... sudah" / "Tidak ada ...") tidak ditampilkan.
// Pengecualian: pesan error/info yang dipanggil dengan _dmEmpty(teks, true) tetap tampil.
const _dmIsNoData = (h) => typeof h === 'string' && h.trim().startsWith('<div class="dm-empty dm-nodata">') && (h.match(/<div/g) || []).length === 1;
// Icon card: dipilih otomatis dari judul (pakai set _DM_IC yang sama dgn KPI). Bisa dioverride lewat parameter ke-5.
const _DM_CARD_IC = [
  [/skala|capaian|rata-rata|progres|kelengkapan/i, 'target'], [/klik|kunjungan|perangkat|cara masuk|terpopuler/i, 'click'],
  [/link|bundle/i, 'link'], [/surat|pengirim|tujuan/i, 'mail'], [/jam|sisa waktu|sesi|lembur|terlambat|menunggu/i, 'clock'],
  [/hari|harian|bulan|alpa/i, 'cal'], [/pegawai|kehadiran|absensi|beban|kelompok/i, 'user'], [/dokumentasi/i, 'photo'],
  [/perhatian|belum|tidak lengkap/i, 'warn'], [/status|sebaran|komposisi/i, 'check'], [/ringkasan|catatan/i, 'doc'],
];
const _dmCardIc = (title) => { const t = String(title).replace(/<[^>]*>/g, ''); const m = _DM_CARD_IC.find(([re]) => re.test(t)); return m ? m[1] : 'grid'; };
const _dmCardIcon = (title, ic) => `<span class="dm-card-ic">${_dmIc(ic || _dmCardIc(title), _DM_PAL.teal, 16)}</span>`;
const _dmCard = (title, sub, inner, head, ic) => _dmIsNoData(inner) ? '' : `<div class="dm-card"><div class="dm-card-h"><div class="dm-card-hl">${_dmCardIcon(title, ic)}<div><div class="dm-card-t">${title}</div>${sub ? `<div class="dm-sub">${sub}</div>` : ''}</div></div>${head || ''}</div>${inner}</div>`;
const _dmCols = (arr, wide) => {
  const a = arr.filter(Boolean);   // buang kartu yang tidak dirender (belum ada data)
  return a.length ? `<div class="dm-cols${wide && a.length > 1 ? (wide === 'r' ? ' wide-r' : ' wide') : ''}">${a.join('')}</div>` : '';
};
const _dmEmpty = (t, keep) => `<div class="dm-empty${keep ? '' : ' dm-nodata'}">${t}</div>`;
const _dmLegend = (arr) => `<div class="dm-legend">${arr.map(([c, l]) => `<span><i style="background:${c}"></i>${l}</span>`).join('')}</div>`;

function _dmSpark(vals, color, w, h) {
  w = w || 84; h = h || 28;
  vals = (vals || []).map(v => Number(v) || 0);
  if (vals.length < 2) return '';
  const max = Math.max(...vals, 1), st = w / (vals.length - 1);
  const pts = vals.map((v, i) => [i * st, h - 3 - (v / max) * (h - 7)]);
  const line = 'M' + pts.map(p => p[0].toFixed(1) + ',' + p[1].toFixed(1)).join('L');
  return `<svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" aria-hidden="true"><path d="${line}L${w},${h}L0,${h}Z" fill="${color}" opacity=".13"/><path d="${line}" fill="none" stroke="${color}" stroke-width="1.8" stroke-linejoin="round" stroke-linecap="round"/></svg>`;
}
function _dmKpi({ label, val, sub, color, icon, spark, onclick }) {
  color = color || _DM_PAL.teal;
  return `<div class="dm-kpi" style="--c:${color}"${onclick ? ` onclick="${onclick}" role="button" tabindex="0"` : ''}>
    <div class="dm-kpi-top"><span>${label}</span><span class="dm-kpi-ic" style="background:${color}1f">${_dmIc(icon, color, 15)}</span></div>
    <div class="dm-kpi-val">${val}</div>
    <div class="dm-kpi-foot"><div class="dm-kpi-sub">${sub || ''}</div>${spark ? `<div class="dm-kpi-sp">${spark}</div>` : ''}</div>
  </div>`;
}
function _dmNiceMax(v) { const p = Math.pow(10, Math.floor(Math.log10(Math.max(v, 1)))); const f = v / p; return (f <= 1 ? 1 : f <= 2 ? 2 : f <= 5 ? 5 : 10) * p; }

function _dmArea({ labels, series, h, fmt }) {
  const W = 640, H = h || 190, pl = 44, pr = 10, pt = 10, pb = 24, iw = W - pl - pr, ih = H - pt - pb, n = labels.length;
  fmt = fmt || _dmNf;
  const all = series.flatMap(s => s.values.filter(v => v != null));
  const max = _dmNiceMax(Math.max(1, ...all));
  const x = (i) => pl + (n < 2 ? 0 : i * iw / (n - 1)), y = (v) => pt + ih - (v / max) * ih;
  let g = '';
  for (let k = 0; k <= 4; k++) { const v = max * k / 4, yy = y(v); g += `<line class="dm-gl" x1="${pl}" x2="${W - pr}" y1="${yy}" y2="${yy}"/><text class="dm-ax" x="${pl - 6}" y="${yy + 3}" text-anchor="end">${fmt(Math.round(v * 10) / 10)}</text>`; }
  const stepX = Math.max(1, Math.ceil(n / 7));
  let xl = ''; for (let i = 0; i < n; i += stepX) xl += `<text class="dm-ax" x="${x(i)}" y="${H - 6}" text-anchor="middle">${esc(labels[i].short || labels[i])}</text>`;
  let paths = '';
  series.forEach((s, si) => {
    const pts = s.values.map((v, i) => v == null ? null : [x(i), y(v)]).filter(Boolean);
    if (!pts.length) return;
    const d = 'M' + pts.map(p => p[0].toFixed(1) + ',' + p[1].toFixed(1)).join('L');
    if (si === 0 && pts.length > 1) paths += `<path d="${d}L${pts[pts.length - 1][0].toFixed(1)},${pt + ih}L${pts[0][0].toFixed(1)},${pt + ih}Z" fill="${s.color}" opacity=".12"/>`;
    paths += pts.length > 1 ? `<path d="${d}" fill="none" stroke="${s.color}" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"${s.dash ? ' stroke-dasharray="5 4"' : ''}/>` : `<circle cx="${pts[0][0]}" cy="${pts[0][1]}" r="2.5" fill="${s.color}"/>`;
  });
  const bw = iw / Math.max(n - 1, 1);
  let hit = '';
  for (let i = 0; i < n; i++) hit += `<rect class="dm-hit" x="${(x(i) - bw / 2).toFixed(1)}" y="${pt}" width="${bw.toFixed(1)}" height="${ih}" data-tip="${esc((labels[i].full || labels[i]) + '\n' + series.map(s => s.name + ': ' + (s.values[i] == null ? '-' : fmt(s.values[i]))).join('\n'))}"></rect>`;
  return `<svg class="dm-chart" viewBox="0 0 ${W} ${H}" role="img">${g}${paths}${xl}${hit}</svg>`;
}
function _dmBar({ labels, values, color, h, hi, unit }) {
  const W = 640, H = h || 140, pl = 34, pr = 6, pt = 8, pb = 22, iw = W - pl - pr, ih = H - pt - pb, n = values.length;
  const max = _dmNiceMax(Math.max(1, ...values)), bw = iw / n;
  let g = '';
  for (let k = 0; k <= 2; k++) { const v = max * k / 2, yy = pt + ih - (v / max) * ih; g += `<line class="dm-gl" x1="${pl}" x2="${W - pr}" y1="${yy}" y2="${yy}"/><text class="dm-ax" x="${pl - 5}" y="${yy + 3}" text-anchor="end">${_dmNf(Math.round(v))}</text>`; }
  const stepX = Math.max(1, Math.ceil(n / 8));
  let bars = '';
  values.forEach((v, i) => {
    const hh = Math.max(v > 0 ? 2 : 0, (v / max) * ih), xx = pl + i * bw + bw * .14;
    bars += `<rect x="${xx.toFixed(1)}" y="${(pt + ih - hh).toFixed(1)}" width="${(bw * .72).toFixed(1)}" height="${hh.toFixed(1)}" rx="2.5" fill="${i === hi ? _DM_PAL.warn : color}"${i === hi ? '' : ' opacity=".85"'} data-tip="${esc(labels[i] + ': ' + _dmNf(v) + (unit ? ' ' + unit : ''))}"></rect>`;
    if (i % stepX === 0) bars += `<text class="dm-ax" x="${(pl + i * bw + bw / 2).toFixed(1)}" y="${H - 6}" text-anchor="middle">${esc(labels[i])}</text>`;
  });
  return `<svg class="dm-chart" viewBox="0 0 ${W} ${H}" role="img">${g}${bars}</svg>`;
}
function _dmDonut(items, centerVal, centerLbl, compact) {
  const tot = items.reduce((a, b) => a + b.value, 0), R = 46, C = 2 * Math.PI * R;
  if (!tot) return _dmEmpty('Belum ada data');
  let off = 0;
  const arcs = items.filter(i => i.value > 0).map(i => {
    const len = i.value / tot * C;
    const s = `<circle cx="60" cy="60" r="${R}" fill="none" stroke="${i.color}" stroke-width="16" stroke-dasharray="${len.toFixed(2)} ${(C - len).toFixed(2)}" stroke-dashoffset="${(-off).toFixed(2)}" transform="rotate(-90 60 60)" data-tip="${esc(i.label + ': ' + _dmNf(i.value))}"></circle>`;
    off += len; return s;
  }).join('');
  return `<div class="dm-donut${compact ? ' dm-donut-s' : ''}"><svg viewBox="0 0 120 120" role="img"><circle cx="60" cy="60" r="${R}" fill="none" stroke="#eef2f6" stroke-width="16"/>${arcs}
    <text x="60" y="58" text-anchor="middle" style="font-size:19px;font-weight:800;fill:var(--teks)">${centerVal}</text><text x="60" y="73" text-anchor="middle" class="dm-ax">${centerLbl || ''}</text></svg>
    <div class="dm-dl">${items.map(i => `<div><i style="background:${i.color}"></i><span>${esc(i.label)}</span><b>${_dmNf(i.value)}</b><em>${_dmPct(i.value, tot)}%</em></div>`).join('')}</div></div>`;
}
// Pagination daftar di card: 5 item per halaman. Daftar <= 5 item ditampilkan langsung.
const _DM_PER = 5;
let _dmSeq = 0;
let _dmQueue = [];
function _dmPageBox(htmls) {
  if (htmls.length <= _DM_PER) return htmls.join('');
  const id = 'dmpg' + (++_dmSeq);
  _dmQueue.push({ id, htmls });
  return `<div id="${id}-b">${htmls.slice(0, _DM_PER).join('')}</div><div id="${id}-p"></div>`;
}
function _dmInitPaging(root) {
  const q = _dmQueue; _dmQueue = [];
  q.forEach(({ id, htmls }) => {
    if (!root.querySelector('#' + id + '-b')) return;
    const draw = (p) => {
      const el = document.getElementById(id + '-b'); if (!el) return;
      el.innerHTML = htmls.slice((p - 1) * _DM_PER, p * _DM_PER).join('');
      if (typeof renderPagination === 'function') renderPagination(id + '-p', htmls.length, p, _DM_PER, draw);
    };
    draw(1);
  });
}
function _dmHb(items, kosong) {
  if (!items.length) return _dmEmpty(kosong || 'Belum ada data');
  return _dmPageBox(items.map(i => `<div class="dm-hb"><div class="dm-hb-top"><span class="dm-hb-l${i.full ? ' full' : ''}" data-tip="${esc(i.label)}">${esc(i.label)}</span><span class="dm-hb-r">${i.right || ''}</span></div><div class="dm-hb-track"><i style="width:${Math.max(2, Math.round(i.value * 100 / (i.max || 1)))}%;background:${i.color || _DM_PAL.teal}"></i></div>${i.sub ? `<div class="dm-sub">${i.sub}</div>` : ''}</div>`));
}
// daftar bar dengan skala otomatis (max = nilai terbesar)
function _dmHbAuto(rows, kosong) {
  const max = Math.max(1, ...rows.map(r => r.value));
  return _dmHb(rows.map(r => ({ ...r, max: r.max || max, right: r.right != null ? r.right : `<b style="color:${r.color || _DM_PAL.teal}">${_dmNf(r.value)}${r.suffix || ''}</b>` })), kosong);
}
function _dmFeed(rows, kosong) {
  return rows.length ? _dmPageBox(rows.map(r => `<div class="dm-feed">${r.lead || ''}<div class="dm-feed-b"><div class="dm-feed-m">${esc(r.title)}</div><div class="dm-sub">${r.sub || ''}</div></div>${r.badge || ''}</div>`)) : _dmEmpty(kosong || 'Belum ada data');
}
const _dmInisial = (n) => String(n || '?').trim().split(/\s+/).slice(0, 2).map(w => w[0]).join('').toUpperCase() || '?';
function _dmFixText(root) {
  if (!root) return;
  root.querySelectorAll('svg.dm-chart').forEach(svg => {
    const vb = svg.viewBox && svg.viewBox.baseVal, w = svg.getBoundingClientRect().width;
    if (!vb || !vb.width || !w) return;
    const scale = w / vb.width, px = scale < .8 ? 9 : 11;
    const fs = (px / scale).toFixed(2) + 'px';
    svg.querySelectorAll('.dm-ax').forEach(t => { t.style.fontSize = fs; });
  });
}
// Pasang HTML ke wrapper + rapikan ukuran teks grafik
function _dmMount(wrap, html) {
  wrap.classList.add('dm');
  wrap.innerHTML = html;
  _dmInitPaging(wrap);
  requestAnimationFrame(() => _dmFixText(wrap));
}
window.addEventListener('resize', () => document.querySelectorAll('.dm').forEach(_dmFixText));
// Daftar N bulan terakhir (termasuk bulan ini) -> [{key:'YYYY-MM', label}]
function _dmBulanTerakhir(n) {
  const now = new Date(), out = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    out.push({ key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`, short: _DM_BLN[d.getMonth()], full: `${_DM_BLN[d.getMonth()]} ${d.getFullYear()}` });
  }
  return out;
}

async function _fetchSuperlinkDashData() {
  try {
    const [rl, rb, rs] = await Promise.all([
      fetch('/api/links',   { headers: authHeaders() }),
      fetch('/api/bundles', { headers: authHeaders() }),
      fetch('/api/stats',   { headers: authHeaders() }),
    ]);
    const links   = rl.ok ? (await rl.json()).links   || [] : [];
    const bundles = rb.ok ? (await rb.json()).bundles || [] : [];
    const stats   = rs.ok ? await rs.json() : null;
    return { links, bundles, stats };
  } catch { return { links: [], bundles: [], stats: null }; }
}

async function loadDashboardSuperlink() {
  const wrap = document.getElementById('dashSuperlinkStats');
  if (!wrap) return;
  _dmStyle();
  wrap.innerHTML = `
    <div class="skeleton" style="height:96px;border-radius:16px;margin-bottom:13px"></div>
    <div class="dash-kpi-row">${Array(5).fill(0).map(() => `<div class="skeleton" style="height:98px;border-radius:14px"></div>`).join('')}</div>
    <div class="skeleton" style="height:200px;border-radius:16px"></div>`;

  const { links, bundles, stats } = await _fetchSuperlinkDashData();

  const icon = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="currentColor" style="flex-shrink:0;opacity:.85"><path d="M3 12C3 12.5523 3.44772 13 4 13H10C10.5523 13 11 12.5523 11 12V4C11 3.44772 10.5523 3 10 3H4C3.44772 3 3 3.44772 3 4V12ZM3 20C3 20.5523 3.44772 21 4 21H10C10.5523 21 11 20.5523 11 20V16C11 15.4477 10.5523 15 10 15H4C3.44772 15 3 15.4477 3 16V20ZM13 20C13 20.5523 13.4477 21 14 21H20C20.5523 21 21 20.5523 21 20V12C21 11.4477 20.5523 11 20 11H14C13.4477 11 13 11.4477 13 12V20ZM14 3C13.4477 3 13 3.44772 13 4V8C13 8.55228 13.4477 9 14 9H20C20.5523 9 21 8.55228 21 8V4C21 3.44772 20.5523 3 20 3H14Z"/></svg>`;
  let html = _dashModuleHeader(icon, 'Dashboard', 'Ringkasan aktivitas Superlink');

  const totalKlik    = stats?.total_klik ?? links.reduce((a, l) => a + (l.total_klik || 0), 0);
  const klikHariIni  = stats?.klik_hari_ini ?? 0;
  const shortlinkCnt = links.filter(l => l.slug_pendek).length;
  const linkAktif    = links.filter(l => l.aktif).length;
  const linkNonaktif = links.length - linkAktif;
  const bundleAktif  = bundles.filter(b => b.aktif).length;
  const rataKlik     = links.length ? Math.round(totalKlik / links.length) : 0;
  const tanpaKlik    = links.filter(l => l.aktif && !(l.total_klik > 0));

  const t30 = stats?.klik_30hari || [];
  const t7  = stats?.klik_7hari  || [];
  const sum7 = t7.reduce((a, d) => a + (d.jumlah || 0), 0);
  const sum30 = t30.reduce((a, d) => a + (d.jumlah || 0), 0);
  const prev7 = stats?.klik_minggu_lalu;
  const deltaMinggu = prev7 > 0 ? Math.round((sum7 - prev7) * 100 / prev7) : null;
  const kemarin = t7.length >= 2 ? (t7[t7.length - 2]?.jumlah ?? 0) : 0;
  let deltaSub = null;
  if (t7.length >= 2) {
    if (kemarin > 0) { const p = Math.round((klikHariIni - kemarin) * 100 / kemarin); deltaSub = `${p >= 0 ? '▲' : '▼'} ${Math.abs(p)}% vs kemarin`; }
    else if (klikHariIni > 0) deltaSub = '▲ baru hari ini';
  }
  const sp14 = t30.slice(-14).map(d => d.jumlah);
  const hariRamai = t30.length ? t30.reduce((b, d) => d.jumlah > b.jumlah ? d : b, t30[0]) : null;

  const perangkat = (stats?.perangkat || []).filter(p => p.jumlah > 0);
  const viaQr = stats?.via_qr || [];
  const qrN = viaQr.filter(x => x.via_qr === true).reduce((a, x) => a + x.jumlah, 0);
  const tautN = viaQr.filter(x => x.via_qr !== true).reduce((a, x) => a + x.jumlah, 0);

  const tone = !links.length ? 'abu' : klikHariIni > 0 ? 'ok' : 'info';
  html += _dmHero({
    tone,
    title: !links.length ? 'Belum ada link' : klikHariIni > 0 ? `${_dmNf(klikHariIni)} klik masuk hari ini` : 'Belum ada klik hari ini',
    text: [
      `<b>${_dmNf(sum7)}</b> klik dalam 7 hari terakhir${deltaMinggu !== null ? `, ${deltaMinggu >= 0 ? 'naik' : 'turun'} <b>${Math.abs(deltaMinggu)}%</b> dari minggu sebelumnya` : ''}.`,
      `<b>${_dmNf(sum30)}</b> klik dalam 30 hari terakhir.`,
      tanpaKlik.length ? `<b>${tanpaKlik.length}</b> dari <b>${links.length}</b> link aktif belum pernah diklik.` : '',
    ],
    ring: { pct: _dmPct(linkAktif, links.length), label: 'aktif', tip: `${linkAktif} dari ${links.length} link aktif` },
    seg: [
      { label: 'Aktif, sudah diklik', val: linkAktif - tanpaKlik.length, color: _DM_PAL.ok },
      { label: 'Aktif, belum diklik', val: tanpaKlik.length, color: _DM_PAL.warn },
      { label: 'Nonaktif', val: linkNonaktif, color: '#94a3b8' },
      { label: 'Shortlink', val: shortlinkCnt, color: _DM_PAL.info, bar: false },
      { label: 'Bundle aktif', val: bundleAktif, color: _DM_PAL.ungu, bar: false },
      { label: 'Lewat QR', val: qrN, color: _DM_PAL.teal, bar: false },
    ],
    trend: {
      label: 'Klik 7 hari',
      val: _dmNf(sum7),
      d: deltaMinggu, unit: '%', vs: 'dari minggu lalu',
      vals: t30.slice(-14).map(x => x.jumlah),
      note: '',
    },
    reload: 'loadDashboardSuperlink()',
  });

  html += `<div class="dm-kpis">
    ${_dmKpi({ label: 'Total Link', val: _dmNf(links.length), sub: `${linkAktif} aktif · ${linkNonaktif} nonaktif`, color: _DM_PAL.teal, icon: 'link' })}
    ${_dmKpi({ label: 'Shortlink', val: _dmNf(shortlinkCnt), sub: `${_dmPct(shortlinkCnt, links.length)}% dari total link`, color: _DM_PAL.info, icon: 'link' })}
    ${_dmKpi({ label: 'Bundle', val: _dmNf(bundles.length), sub: `${bundleAktif} aktif`, color: _DM_PAL.ungu, icon: 'box' })}
    ${_dmKpi({ label: 'Total Klik', val: _dmNf(totalKlik), sub: `± ${rataKlik} klik per link`, color: _DM_PAL.warn, icon: 'click', spark: _dmSpark(sp14, _DM_PAL.warn) })}
    ${_dmKpi({ label: 'Klik Hari Ini', val: _dmNf(klikHariIni), sub: deltaSub || `${_dmNf(sum7)} klik 7 hari`, color: _DM_PAL.teal, icon: 'trend', spark: _dmSpark(t7.map(d => d.jumlah), _DM_PAL.teal) })}
  </div>`;

  const lbl30 = t30.map(d => { const dt = new Date(d.tanggal + 'T12:00:00'); return { short: `${dt.getDate()} ${_DM_BLN[dt.getMonth()]}`, full: `${dt.getDate()} ${_DM_BLN[dt.getMonth()]} ${dt.getFullYear()}` }; });
  const perJam = Array(24).fill(0);
  (stats?.klik_per_jam || []).forEach(r => { if (r.jam >= 0 && r.jam < 24) perJam[r.jam] = r.jumlah; });
  const jamRamai = perJam.indexOf(Math.max(...perJam));
  const pad = n => String(n).padStart(2, '0');

  html += _dmCols([
    _dmCard('Klik per hari', '30 hari terakhir', t30.length ? _dmArea({ labels: lbl30, series: [{ name: 'Klik', color: _DM_PAL.teal, values: t30.map(d => d.jumlah) }] }) : _dmEmpty('Belum ada data klik')),
    _dmCard('Jam paling ramai', 'Sebaran klik per jam (WITA), 30 hari terakhir', Math.max(...perJam) > 0 ? _dmBar({ labels: perJam.map((_, i) => pad(i)), values: perJam, color: _DM_PAL.info, hi: jamRamai, h: 150 }) : _dmEmpty('Belum ada data klik')),
  ]);

  html += _dmCols([
    _dmCard('Status link', 'Aktif dan nonaktif', _dmDonut([
      { label: 'Aktif', value: linkAktif, color: _DM_PAL.teal },
      { label: 'Nonaktif', value: linkNonaktif, color: '#cbd5e1' },
    ], _dmNf(links.length), 'total link')),
    _dmCard('Perangkat pengunjung', 'Dari seluruh klik', _dmDonut(perangkat.map((p, i) => ({ label: p.jenis, value: p.jumlah, color: [_DM_PAL.info, _DM_PAL.teal, _DM_PAL.warn, '#cbd5e1'][i % 4] })), _dmNf(perangkat.reduce((a, p) => a + p.jumlah, 0)), 'klik')),
    _dmCard('Cara masuk', 'Klik lewat QR code dibanding tautan langsung', _dmDonut([
      { label: 'Tautan langsung', value: tautN, color: _DM_PAL.teal },
      { label: 'Scan QR code', value: qrN, color: _DM_PAL.ungu },
    ], _dmNf(qrN + tautN), 'klik')),
  ]);

  const topLinks = (stats?.top_links?.length ? stats.top_links : [...links].sort((a, b) => (b.total_klik || 0) - (a.total_klik || 0))).slice(0, 25);
  const refs = stats?.top_referer || [];
  html += _dmCols([
    _dmCard('Link terpopuler', 'Link dengan klik terbanyak', _dmHbAuto(topLinks.filter(l => (l.total_klik || 0) > 0).map(l => ({ label: l.judul, value: l.total_klik || 0, suffix: ' klik', color: _DM_PAL.teal })), 'Belum ada link yang diklik')),
    _dmCard('Asal kunjungan', 'Situs yang mengarahkan pengunjung', _dmHbAuto(refs.map(r => ({ label: r.sumber, value: r.jumlah, suffix: ' klik', color: _DM_PAL.info })), 'Belum ada data asal kunjungan')),
  ], true);

  html += _dmCols([
    _dmCard('Ringkasan bundle', 'Jumlah item tiap bundle', _dmHbAuto(bundles.map(b => ({ label: b.judul, value: b.jumlah_item ?? 0, suffix: ' item', color: b.aktif ? _DM_PAL.ungu : '#cbd5e1', sub: `/${esc(b.slug)}${b.aktif ? '' : ' · Nonaktif'}` })), 'Belum ada bundle')),
    _dmCard('Link aktif belum pernah diklik', `${tanpaKlik.length} link`, _dmFeed(tanpaKlik.map(l => ({ title: l.judul, sub: l.slug_pendek ? '/' + esc(l.slug_pendek) : 'Tautan biasa' })), 'Semua link aktif sudah pernah diklik')),
  ]);

  const ins = [];
  if (hariRamai && hariRamai.jumlah > 0) { const dt = new Date(hariRamai.tanggal + 'T12:00:00'); ins.push(_dmIns('info', `Hari paling ramai dalam 30 hari terakhir: <b>${dt.getDate()} ${_DM_BLN[dt.getMonth()]}</b> dengan <b>${_dmNf(hariRamai.jumlah)}</b> klik.`)); }
  if (Math.max(...perJam) > 0) ins.push(_dmIns('info', `Pengunjung paling banyak mengklik sekitar pukul <b>${pad(jamRamai)}.00</b> WITA.`));
  if (tanpaKlik.length) ins.push(_dmIns('warn', `<b>${tanpaKlik.length}</b> link aktif belum pernah diklik. Pertimbangkan membagikannya lagi atau menonaktifkannya.`));
  if (linkNonaktif) ins.push(_dmIns('abu', `<b>${linkNonaktif}</b> link sedang nonaktif.`));
  if (deltaMinggu !== null && deltaMinggu <= -30) ins.push(_dmIns('warn', `Klik minggu ini turun <b>${Math.abs(deltaMinggu)}%</b> dibanding minggu lalu.`));
  if (ins.length) html += `<div class="dm-card" style="margin-bottom:var(--sp-4)"><div class="dm-card-h"><div class="dm-card-hl">${_dmCardIcon('Catatan')}<div class="dm-card-t">Catatan</div></div></div>${ins.join('')}</div>`;

  _dmMount(wrap, html);
}

// Grafik tren klik 7 hari terakhir - dari stats.klik_7hari [{tanggal, jumlah}]
function _klikTrendPanel(data) {
  const HARI = ['Min','Sen','Sel','Rab','Kam','Jum','Sab'];
  const pad2 = n => String(n).padStart(2, '0');
  
  const map = new Map(data.map(d => [d.tanggal, d.jumlah]));
  const days = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    
    
    
    
    const key = `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
    days.push({ key, hari: HARI[d.getDay()], tgl: d.getDate(), jumlah: map.get(key) || 0 });
  }
  const max = Math.max(1, ...days.map(d => d.jumlah));
  const bars = days.map(d => {
    const h = Math.max(3, Math.round((d.jumlah / max) * 74));
    return `
      <div class="dash-trend-bar-wrap" data-tip="${d.jumlah} klik">
        <div class="dash-trend-val">${d.jumlah || ''}</div>
        <div class="dash-trend-bar" style="height:${h}px"></div>
        <div class="dash-trend-lbl">${d.hari}</div>
      </div>`;
  }).join('');
  return `<div class="dash-panel">
    <div class="dash-panel-header"><svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 3v18h18"/><path d="m19 9-5 5-4-4-3 3"/></svg> Tren Klik 7 Hari Terakhir</div>
    <div class="dash-trend"><div class="dash-trend-bars">${bars}</div></div>
  </div>`;
}

// ── Lembur ───────────────────────────────────────────────────────────────────
async function _fetchLemburDashData() {
  try {
    const rk = await fetch('/api/lembur/kegiatan', { headers: authHeaders() });
    const dk = rk.ok ? await rk.json() : { kegiatan: [] };
    const kegiatanList = dk.kegiatan || [];
    const sesiPerKegiatan = await Promise.all(kegiatanList.map(k =>
      fetch(`/api/lembur/sesi?kegiatan_id=${k.id}`, { headers: authHeaders() })
        .then(r => r.ok ? r.json() : { sesi: [] })
        .then(d => (d.sesi || []).map(s => ({ ...s, kegiatan_id: k.id, kegiatan_nama: k.nama_kegiatan })))
        .catch(() => [])
    ));
    return { kegiatanList, allSesi: sesiPerKegiatan.flat() };
  } catch (err) {
    console.error('[_fetchLemburDashData]', err);
    return { kegiatanList: [], allSesi: [] };
  }
}

// Hitung durasi jam lembur satu sesi dari jam_mulai/jam_selesai (HH:MM:SS)
function _lemburJamSesi(s) {
  if (!s.jam_mulai || !s.jam_selesai) return 0;
  const [h1, m1] = s.jam_mulai.split(':').map(Number);
  const [h2, m2] = s.jam_selesai.split(':').map(Number);
  let menit = (h2 * 60 + m2) - (h1 * 60 + m1);
  if (menit < 0) menit += 24 * 60; // lewat tengah malam
  return menit / 60;
}

let _lemburKalOffset = 0; // 0 = jendela 3 bulan terbaru (berakhir di bulan ini); makin besar makin mundur
let _lemburDashCache = null; // { kegiatanList, sesiRelevant } - dipakai ulang pas navigasi kalender tanpa refetch

async function loadDashboardLembur() {
  const wrap = document.getElementById('dashLemburStats');
  if (!wrap) return;
  _dmStyle();
  wrap.innerHTML = `
    <div class="skeleton" style="height:96px;border-radius:16px;margin-bottom:13px"></div>
    <div class="dash-kpi-row">${Array(5).fill(0).map(() => `<div class="skeleton" style="height:98px;border-radius:14px"></div>`).join('')}</div>
    <div class="skeleton" style="height:200px;border-radius:16px"></div>`;

  _lemburKalOffset = 0;
  const full = typeof _lemburHasFull === 'function' && _lemburHasFull();
  const { kegiatanList, allSesi } = await _fetchLemburDashData();
  const sesiRelevant = full ? allSesi : allSesi.filter(s => s.is_peserta);
  _lemburDashCache = { kegiatanList, sesiRelevant };

  const icon = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="currentColor" style="flex-shrink:0;opacity:.85"><path d="M3 12C3 12.5523 3.44772 13 4 13H10C10.5523 13 11 12.5523 11 12V4C11 3.44772 10.5523 3 10 3H4C3.44772 3 3 3.44772 3 4V12ZM3 20C3 20.5523 3.44772 21 4 21H10C10.5523 21 11 20.5523 11 20V16C11 15.4477 10.5523 15 10 15H4C3.44772 15 3 15.4477 3 16V20ZM13 20C13 20.5523 13.4477 21 14 21H20C20.5523 21 21 20.5523 21 20V12C21 11.4477 20.5523 11 20 11H14C13.4477 11 13 11.4477 13 12V20ZM14 3C13.4477 3 13 3.44772 13 4V8C13 8.55228 13.4477 9 14 9H20C20.5523 9 21 8.55228 21 8V4C21 3.44772 20.5523 3 20 3H14Z"/></svg>`;
  let html = _dashModuleHeader(icon, 'Dashboard', full ? 'Ringkasan aktivitas lembur seluruh pegawai' : 'Ringkasan aktivitas lembur Anda');

  const now = new Date();
  const ymNow = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const todayKey = _dmYmd(now);
  const tglKey = (s) => String(s.tanggal || '').slice(0, 10);
  const jamS = (s) => _lemburJamSesi(s);
  const sesiBulanIni = sesiRelevant.filter(s => tglKey(s).slice(0, 7) === ymNow);
  const totalJam = sesiRelevant.reduce((a, s) => a + jamS(s), 0);
  const jamBulanIni = sesiBulanIni.reduce((a, s) => a + jamS(s), 0);
  const totalDok = sesiRelevant.reduce((a, s) => a + (s.jumlah_dokumentasi || 0), 0);
  const kegiatanDiikuti = full ? kegiatanList.length : new Set(sesiRelevant.map(s => s.kegiatan_id)).size;
  const pesertaJam = sesiRelevant.reduce((a, s) => a + jamS(s) * (s.jumlah_peserta || 0), 0);
  const rataPeserta = sesiRelevant.length ? (sesiRelevant.reduce((a, s) => a + (s.jumlah_peserta || 0), 0) / sesiRelevant.length) : 0;
  const sesiLewat = sesiRelevant.filter(s => tglKey(s) && tglKey(s) <= todayKey);
  const tanpaDok = sesiLewat.filter(s => !(s.jumlah_dokumentasi > 0));
  const sesiAkan = sesiRelevant.filter(s => tglKey(s) > todayKey).sort((a, b) => tglKey(a).localeCompare(tglKey(b)));

  // Tren 6 bulan
  const bln = _dmBulanTerakhir(6);
  const cSesi = new Map(bln.map(b => [b.key, 0])), cJam = new Map(bln.map(b => [b.key, 0]));
  sesiRelevant.forEach(s => { const k = tglKey(s).slice(0, 7); if (cSesi.has(k)) { cSesi.set(k, cSesi.get(k) + 1); cJam.set(k, cJam.get(k) + jamS(s)); } });
  const serSesi = bln.map(b => cSesi.get(b.key)), serJam = bln.map(b => Math.round(cJam.get(b.key) * 10) / 10);

  const tone = !sesiRelevant.length ? 'abu' : tanpaDok.length ? 'warn' : 'ok';
  html += _dmHero({
    tone,
    title: !sesiRelevant.length ? 'Belum ada sesi lembur' : `${sesiBulanIni.length} sesi lembur bulan ini (${Math.round(jamBulanIni)} jam)`,
    text: [
      `${full ? 'Seluruh pegawai' : 'Anda'} tercatat <b>${sesiRelevant.length}</b> sesi dalam <b>${kegiatanDiikuti}</b> kegiatan, total <b>${Math.round(totalJam)}</b> jam${full ? ` (rata-rata <b>${rataPeserta.toFixed(1)}</b> peserta per sesi)` : ''}.`,
      tanpaDok.length ? `<b>${tanpaDok.length}</b> sesi yang sudah lewat belum punya dokumentasi.` : '',
      sesiAkan.length ? `Sesi terdekat: <b>${fmtDate(tglKey(sesiAkan[0])).split(',')[0]}</b>.` : '',
    ],
    ring: { pct: _dmPct(sesiLewat.length - tanpaDok.length, sesiLewat.length), label: 'dokumentasi', tip: `${sesiLewat.length - tanpaDok.length} dari ${sesiLewat.length} sesi yang sudah lewat punya dokumentasi` },
    seg: [
      { label: 'Ada dokumentasi', val: sesiLewat.length - tanpaDok.length, color: _DM_PAL.ok },
      { label: 'Belum dokumentasi', val: tanpaDok.length, color: _DM_PAL.bad },
      { label: 'Terjadwal', val: sesiAkan.length, color: _DM_PAL.info },
      { label: 'Sesi bulan ini', val: sesiBulanIni.length, color: _DM_PAL.warn, bar: false },
    ],
    trend: {
      label: 'Jam lembur bulan ini',
      val: `${_dmNf(Math.round(jamBulanIni))} jam`,
      d: serJam.length >= 2 ? Math.round(jamBulanIni) - Math.round(serJam[serJam.length - 2]) : null,
      unit: 'jam', vs: 'dari bulan lalu', neutral: true,
      vals: serJam,
    },
    reload: 'loadDashboardLembur()',
  });

  html += `<div class="dm-kpis">
    ${_dmKpi({ label: full ? 'Total Kegiatan' : 'Kegiatan Diikuti', val: _dmNf(kegiatanDiikuti), sub: `${kegiatanList.length} total terdaftar`, color: _DM_PAL.teal, icon: 'grid' })}
    ${_dmKpi({ label: full ? 'Total Sesi Lembur' : 'Sesi Saya', val: _dmNf(sesiRelevant.length), sub: `${sesiBulanIni.length} sesi bulan ini`, color: _DM_PAL.info, icon: 'clock', spark: _dmSpark(serSesi, _DM_PAL.info) })}
    ${_dmKpi({ label: full ? 'Total Jam Lembur' : 'Jam Lembur Saya', val: `${_dmNf(Math.round(totalJam))} jam`, sub: `${Math.round(jamBulanIni)} jam bulan ini`, color: _DM_PAL.warn, icon: 'trend', spark: _dmSpark(serJam, _DM_PAL.warn) })}
    ${full ? _dmKpi({ label: 'Jam Orang', val: `${_dmNf(Math.round(pesertaJam))} jam`, sub: 'Jam sesi x jumlah peserta', color: _DM_PAL.ungu, icon: 'user' }) : ''}
    ${_dmKpi({ label: 'Dokumentasi', val: _dmNf(totalDok), sub: `${tanpaDok.length} sesi belum ada`, color: tanpaDok.length ? _DM_PAL.bad : _DM_PAL.pink, icon: 'photo' })}
  </div>`;

  html += _dmCols([
    _dmCard('Sesi dan jam lembur', '6 bulan terakhir', _dmArea({ labels: bln, series: [{ name: 'Sesi', color: _DM_PAL.info, values: serSesi }, { name: 'Jam', color: _DM_PAL.warn, values: serJam, dash: true }] }) + _dmLegend([[_DM_PAL.info, 'Sesi'], [_DM_PAL.warn, 'Jam']])),
    _dmCard('Kelengkapan dokumentasi', 'Sesi yang sudah berlangsung', _dmDonut([
      { label: 'Ada dokumentasi', value: sesiLewat.length - tanpaDok.length, color: _DM_PAL.ok },
      { label: 'Belum ada', value: tanpaDok.length, color: _DM_PAL.bad },
    ], _dmNf(sesiLewat.length), 'sesi')),
  ], true);

  // Sebaran hari dalam seminggu
  const HARI = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];
  const perHari = Array(7).fill(0);
  sesiRelevant.forEach(s => { const k = tglKey(s); if (k) perHari[new Date(k + 'T12:00:00').getDay()]++; });
  const akhirPekan = perHari[0] + perHari[6];

  // Kegiatan teratas
  const perKeg = new Map();
  sesiRelevant.forEach(s => { const e = perKeg.get(s.kegiatan_id) || { nama: s.kegiatan_nama, sesi: 0, jam: 0 }; e.sesi++; e.jam += jamS(s); perKeg.set(s.kegiatan_id, e); });
  const topKeg = [...perKeg.values()].sort((a, b) => b.jam - a.jam);

  html += _dmCols([
    _dmCard('Sebaran hari lembur', 'Sesi menurut hari dalam seminggu', sesiRelevant.length ? _dmBar({ labels: HARI, values: perHari, color: _DM_PAL.info, hi: perHari.indexOf(Math.max(...perHari)), h: 140 }) : _dmEmpty('Belum ada data')),
    _dmCard('Kegiatan dengan jam terbanyak', 'Urut jam terbanyak', _dmHbAuto(topKeg.map(k => ({ label: k.nama, value: Math.round(k.jam), suffix: ' jam', color: _DM_PAL.teal, sub: `${k.sesi} sesi` })), 'Belum ada data')),
  ]);

  // Pegawai teratas (hanya akses penuh)
  const cards3 = [];
  if (full) {
    const perPeg = new Map();
    sesiRelevant.forEach(s => (Array.isArray(s.peserta_nama) ? s.peserta_nama.map(n => String(n || '').trim()) : String(s.daftar_peserta || '').split(',').map(n => n.trim())).filter(Boolean).forEach(n => { const e = perPeg.get(n) || { sesi: 0, jam: 0 }; e.sesi++; e.jam += jamS(s); perPeg.set(n, e); }));
    const topPeg = [...perPeg.entries()].sort((a, b) => b[1].jam - a[1].jam);
    cards3.push(_dmCard('Pegawai dengan jam lembur terbanyak', 'Perkiraan dari jam sesi', _dmHbAuto(topPeg.map(([n, v]) => ({ label: n, full: true, value: Math.round(v.jam), suffix: ' jam', color: _DM_PAL.warn, sub: `${v.sesi} sesi` })), 'Belum ada data')));
  }
  cards3.push(_dmCard('Sesi terbaru', 'Urut dari yang paling baru', _dmFeed([...sesiRelevant].sort((a, b) => tglKey(b).localeCompare(tglKey(a))).map(s => ({
    title: s.kegiatan_nama || '-', sub: `${fmtDate(tglKey(s)).split(',')[0]} · ${(s.jam_mulai || '').slice(0, 5)}-${(s.jam_selesai || '').slice(0, 5)} · ${s.jumlah_peserta || 0} peserta`,
    badge: (s.jumlah_dokumentasi > 0) ? `<span class="badge badge-hijau">${s.jumlah_dokumentasi} foto</span>` : (tglKey(s) <= todayKey ? '<span class="badge badge-merah">Belum ada foto</span>' : '<span class="badge badge-abu">Mendatang</span>'),
  })), 'Belum ada sesi lembur')));
  cards3.push(_dmCard('Sesi belum berdokumentasi', `${tanpaDok.length} sesi`, _dmFeed([...tanpaDok].sort((a, b) => tglKey(b).localeCompare(tglKey(a))).map(s => ({ title: s.kegiatan_nama || '-', sub: fmtDate(tglKey(s)).split(',')[0] })), 'Semua sesi sudah punya dokumentasi')));
  html += _dmCols(cards3);

  // Kalender lembur (3 bulan)
  if (typeof _lemburKalenderPanel === 'function') {
    if (typeof _lemburSiapkanWarna === 'function') _lemburSiapkanWarna(kegiatanList);
    html += await _lemburKalenderSectionHtml();
  }

  const ins = [];
  if (tanpaDok.length) ins.push(_dmIns('warn', `<b>${tanpaDok.length}</b> sesi lembur yang sudah berlangsung belum punya dokumentasi foto.`));
  if (akhirPekan > 0) ins.push(_dmIns('info', `<b>${akhirPekan}</b> sesi (${_dmPct(akhirPekan, sesiRelevant.length)}%) berlangsung di akhir pekan.`));
  if (sesiAkan.length) ins.push(_dmIns('info', `Ada <b>${sesiAkan.length}</b> sesi terjadwal ke depan.`));
  if (!ins.length) ins.push(_dmIns('ok', 'Tidak ada catatan khusus untuk lembur saat ini.'));
  html += `<div class="dm-card" style="margin-bottom:var(--sp-4)"><div class="dm-card-h"><div class="dm-card-hl">${_dmCardIcon('Catatan')}<div class="dm-card-t">Catatan</div></div></div>${ins.join('')}</div>`;

  _dmMount(wrap, html);
}

// Bagian "Kalender Lembur" (3 bulan) - dipisah dari loadDashboardLembur biar tombol navigasi
// bulan cuma perlu render ulang bagian ini aja (pake data yg udah kepanggil, gak refetch kegiatan/sesi).
async function _lemburKalenderSectionHtml() {
  if (!_lemburDashCache) return '';
  const { sesiRelevant } = _lemburDashCache;
  const now = new Date();
  const inBulan = (s, b, t) => (s.tanggal || '').slice(0, 7) === `${t}-${String(b).padStart(2, '0')}`;
  const baseDate = new Date(now.getFullYear(), now.getMonth() - _lemburKalOffset, 1);
  const bulanList = [2, 1, 0].map(i => {
    const d = new Date(baseDate.getFullYear(), baseDate.getMonth() - i, 1);
    return { bulan: d.getMonth() + 1, tahun: d.getFullYear() };
  });

  // Ambil hari libur nasional (disamain sama Kalender Kehadiran di dashboard Absensi) -
  // bisa lintas 2 tahun kalau rentang 3 bulan ini nyebrang Desember-Januari.
  let liburSet = new Set();
  let liburMap = new Map();
  let ketBulan = new Map(), ketPrev = new Map();
  try {
    const tahunLiburSet = new Set(bulanList.map(b => b.tahun));
    const rLiburList = await Promise.all(
      [...tahunLiburSet].map(ty => fetch(`/api/absensi/libur?tahun=${ty}`, { headers: authHeaders() }))
    );
    for (const rLibur of rLiburList) {
      if (!rLibur || !rLibur.ok) continue;
      const dLibur = await rLibur.json();
      (dLibur.libur || []).forEach(l => {
        const ymd = typeof _absLiburLocalYMD === 'function' ? _absLiburLocalYMD(l.tanggal) : String(l.tanggal).slice(0, 10);
        liburSet.add(ymd);
        liburMap.set(ymd, l.keterangan || 'Hari libur');
      });
    }
  } catch (err) { console.error('[_lemburKalenderSectionHtml libur]', err); }

  const panelsKalender = bulanList.map(({ bulan, tahun }) =>
    _lemburKalenderPanel(sesiRelevant.filter(s => inBulan(s, bulan, tahun)), bulan, tahun, liburSet, liburMap)
  );

  return `<div id="lemburKalenderSection">
    ${_dashKalenderNavHtml(_lemburKalOffset, '_lemburKalNav')}
    <div class="dash-panels dash-panels--kalender-row">${panelsKalender.join('')}</div>
  </div>`;
}

async function _lemburKalNav(delta) {
  _lemburKalOffset = Math.max(0, _lemburKalOffset + delta);
  const el = document.getElementById('lemburKalenderSection');
  if (!el) return;
  el.style.opacity = '.5';
  const html = await _lemburKalenderSectionHtml();
  el.outerHTML = html;
}

// Tombol navigasi geser jendela bulan kalender (dipakai bareng di Dashboard Lembur & Absensi).
// delta -1 = maju (mundur ke bulan yg lebih baru), +1 = mundur (bulan yg lebih lama).
// offset 0 = jendela paling baru -> tombol "maju" disable karena gak bisa lebih baru dari sekarang.
function _dashKalenderNavHtml(offset, fnName) {
  const iconPrev = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m15 18-6-6 6-6"/></svg>`;
  const iconNext = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6"/></svg>`;
  return `<div class="dash-kalender-nav">
    <button type="button" class="dash-kalender-nav-btn" data-tip="Tampilkan bulan-bulan sebelumnya" onclick="${fnName}(1)">${iconPrev} Bulan Sebelumnya</button>
    <button type="button" class="dash-kalender-nav-btn" data-tip="Tampilkan bulan-bulan berikutnya" ${offset <= 0 ? 'disabled' : ''} onclick="${fnName}(-1)">Bulan Berikutnya ${iconNext}</button>
  </div>`;
}

// Grafik tren jumlah sesi lembur 6 bulan terakhir
function _lemburTrendPanel(sesiList, full) {
  const BULAN = ['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agu','Sep','Okt','Nov','Des'];
  const now = new Date();
  const bucket = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    bucket.push({ key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`, label: BULAN[d.getMonth()] });
  }
  const counts = new Map(bucket.map(b => [b.key, 0]));
  sesiList.forEach(s => {
    const key = (s.tanggal || '').slice(0, 7);
    if (counts.has(key)) counts.set(key, counts.get(key) + 1);
  });
  const max = Math.max(1, ...bucket.map(b => counts.get(b.key) || 0));
  const bars = bucket.map(b => {
    const v = counts.get(b.key) || 0;
    const h = Math.max(3, Math.round((v / max) * 74));
    return `
      <div class="dash-trend-bar-wrap" data-tip="${v} sesi">
        <div class="dash-trend-val">${v || ''}</div>
        <div class="dash-trend-bar" style="height:${h}px"></div>
        <div class="dash-trend-lbl">${b.label}</div>
      </div>`;
  }).join('');
  return `<div class="dash-panel">
    <div class="dash-panel-header"><svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 3v18h18"/><path d="m19 9-5 5-4-4-3 3"/></svg> ${full ? 'Tren Sesi Lembur 6 Bulan Terakhir' : 'Tren Sesi Lembur Saya 6 Bulan Terakhir'}</div>
    <div class="dash-trend"><div class="dash-trend-bars">${bars}</div></div>
  </div>`;
}

// ── Surat ────────────────────────────────────────────────────────────────────
async function loadDashboardSurat() {
  const wrap = document.getElementById('dashSuratStats');
  if (!wrap) return;
  _dmStyle();
  wrap.innerHTML = `
    <div class="skeleton" style="height:96px;border-radius:16px;margin-bottom:13px"></div>
    <div class="dash-kpi-row">${Array(5).fill(0).map(() => `<div class="skeleton" style="height:98px;border-radius:14px"></div>`).join('')}</div>
    <div class="skeleton" style="height:200px;border-radius:16px"></div>`;

  const ss = await _fetchSuratDashData();

  const icon = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="currentColor" style="flex-shrink:0;opacity:.85"><path d="M3 12C3 12.5523 3.44772 13 4 13H10C10.5523 13 11 12.5523 11 12V4C11 3.44772 10.5523 3 10 3H4C3.44772 3 3 3.44772 3 4V12ZM3 20C3 20.5523 3.44772 21 4 21H10C10.5523 21 11 20.5523 11 20V16C11 15.4477 10.5523 15 10 15H4C3.44772 15 3 15.4477 3 16V20ZM13 20C13 20.5523 13.4477 21 14 21H20C20.5523 21 21 20.5523 21 20V12C21 11.4477 20.5523 11 20 11H14C13.4477 11 13 11.4477 13 12V20ZM14 3C13.4477 3 13 3.44772 13 4V8C13 8.55228 13.4477 9 14 9H20C20.5523 9 21 8.55228 21 8V4C21 3.44772 20.5523 3 20 3H14Z"/></svg>`;
  let html = _dashModuleHeader(icon, 'Dashboard', 'Ringkasan surat masuk & keluar');

  if (!ss) {
    html += _dmCard('Surat', '', _dmEmpty('Gagal memuat data surat. Coba muat ulang halaman.', true));
    _dmMount(wrap, html);
    return;
  }

  const totalMasuk   = Number(ss.total_masuk)  || 0;
  const belumProses  = Number(ss.belum_proses) || 0;
  const terlambat    = Number(ss.terlambat)    || 0;
  const totalKeluar  = Number(ss.total_keluar) || 0;
  const masukBulan   = Number(ss.masuk_bulan_ini)  || 0;
  const keluarBulan  = Number(ss.keluar_bulan_ini) || 0;
  const selesai      = Math.max(0, totalMasuk - belumProses);
  const prosesOnTime = Math.max(0, belumProses - terlambat);
  const pctSelesai   = _dmPct(selesai, totalMasuk);
  const sw = ss.sisa_waktu || null;
  const tigaHari = sw ? sw.tiga_hari : (ss.due_soon_list || []).length;

  // Tren 6 bulan
  const bln = _dmBulanTerakhir(6);
  const mapM = new Map((ss.tren_masuk  || []).map(r => [r.bulan, r.jumlah]));
  const mapK = new Map((ss.tren_keluar || []).map(r => [r.bulan, r.jumlah]));
  const serM = bln.map(b => mapM.get(b.key) || 0);
  const serK = bln.map(b => mapK.get(b.key) || 0);

  const tone = terlambat > 0 ? 'bad' : (belumProses > 0 ? 'warn' : 'ok');
  html += _dmHero({
    tone,
    title: terlambat > 0 ? `${terlambat} surat masuk melewati batas waktu` : belumProses > 0 ? `${belumProses} surat masuk masih diproses` : 'Semua surat masuk sudah selesai',
    text: [
      `Bulan ini tercatat <b>${masukBulan}</b> surat masuk dan <b>${keluarBulan}</b> surat keluar.`,
      `<b>${pctSelesai}%</b> surat masuk sudah selesai.`,
      tigaHari > 0 ? `<b>${tigaHari}</b> surat akan jatuh tempo dalam 3 hari.` : '',
    ],
    ring: { pct: pctSelesai, label: 'selesai', tip: `${selesai} dari ${totalMasuk} surat masuk selesai` },
    seg: [
      { label: 'Selesai', val: selesai, color: _DM_PAL.ok },
      { label: 'Proses', val: prosesOnTime, color: _DM_PAL.warn },
      { label: 'Terlambat', val: terlambat, color: _DM_PAL.bad },
      { label: 'Surat keluar', val: totalKeluar, color: _DM_PAL.info, bar: false },
    ],
    trend: {
      label: 'Surat masuk bulan ini',
      val: _dmNf(masukBulan),
      d: serM.length >= 2 ? masukBulan - serM[serM.length - 2] : null,
      unit: '', vs: 'dari bulan lalu', neutral: true,
      vals: serM,
    },
    reload: 'loadDashboardSurat()',
  });

  html += `<div class="dm-kpis">
    ${_dmKpi({ label: 'Surat Masuk', val: _dmNf(totalMasuk), sub: `${pctSelesai}% selesai`, color: _DM_PAL.teal, icon: 'mail', spark: _dmSpark(serM, _DM_PAL.teal) })}
    ${_dmKpi({ label: 'Masih Diproses', val: _dmNf(belumProses), sub: `${prosesOnTime} masih dalam batas waktu`, color: _DM_PAL.warn, icon: 'clock' })}
    ${_dmKpi({ label: 'Terlambat', val: _dmNf(terlambat), sub: terlambat ? 'Perlu segera ditindaklanjuti' : 'Tidak ada yang terlambat', color: terlambat ? _DM_PAL.bad : _DM_PAL.ok, icon: 'warn' })}
    ${_dmKpi({ label: 'Surat Keluar', val: _dmNf(totalKeluar), sub: `${_dmNf(ss.keluar_tahun_ini)} tahun ini`, color: _DM_PAL.info, icon: 'send', spark: _dmSpark(serK, _DM_PAL.info) })}
    ${_dmKpi({ label: 'Bulan Ini', val: _dmNf(masukBulan + keluarBulan), sub: `${masukBulan} masuk · ${keluarBulan} keluar`, color: _DM_PAL.ungu, icon: 'cal' })}
  </div>`;

  html += _dmCols([
    _dmCard('Surat masuk dan keluar', '6 bulan terakhir', _dmArea({ labels: bln, series: [{ name: 'Surat masuk', color: _DM_PAL.teal, values: serM }, { name: 'Surat keluar', color: _DM_PAL.info, values: serK, dash: true }] }) + _dmLegend([[_DM_PAL.teal, 'Surat masuk'], [_DM_PAL.info, 'Surat keluar']])),
    _dmCard('Status surat masuk', 'Seluruh surat yang tercatat', _dmDonut([
      { label: 'Selesai', value: selesai, color: _DM_PAL.ok },
      { label: 'Proses', value: prosesOnTime, color: _DM_PAL.warn },
      { label: 'Terlambat', value: terlambat, color: _DM_PAL.bad },
    ], `${pctSelesai}%`, 'selesai')),
  ], true);

  const sisaRows = sw ? [
    { label: 'Sudah lewat batas', value: sw.lewat, color: _DM_PAL.bad },
    { label: 'Jatuh tempo ≤ 3 hari', value: sw.tiga_hari, color: _DM_PAL.warn },
    { label: 'Jatuh tempo 4–7 hari', value: sw.seminggu, color: '#eab308' },
    { label: 'Lebih dari 7 hari', value: sw.lebih, color: _DM_PAL.ok },
    { label: 'Tanpa batas waktu', value: sw.tanpa_batas, color: '#94a3b8' },
  ] : [];
  html += _dmCols([
    _dmCard('Sisa waktu surat yang belum selesai', 'Dihitung dari batas waktu tindak lanjut', sisaRows.length ? _dmHbAuto(sisaRows) : _dmEmpty('Belum ada data')),
    _dmCard('Pengirim surat terbanyak', 'Asal surat masuk', _dmHbAuto((ss.top_asal || []).map(r => ({ label: r.nama, full: true, value: r.jumlah, suffix: ' surat', color: _DM_PAL.teal })), 'Belum ada data')),
  ]);

  const cardsBawah = [
    _dmCard('Tujuan surat keluar terbanyak', 'Dari seluruh surat keluar', _dmHbAuto((ss.top_tujuan || []).map(r => ({ label: r.nama, full: true, value: r.jumlah, suffix: ' surat', color: _DM_PAL.info })), 'Belum ada data')),
  ];
  if ((ss.beban_pegawai || []).length) cardsBawah.push(_dmCard('Beban pegawai', 'Surat masuk yang belum selesai per pegawai', _dmHbAuto(ss.beban_pegawai.map(r => ({ label: r.nama, full: true, value: r.jumlah, suffix: ' surat', color: _DM_PAL.warn })))));
  const today = new Date().toISOString().slice(0, 10);
  const badgeOver = '<span class="badge badge-merah">Terlambat</span>';
  cardsBawah.push(_dmCard('Perlu perhatian', 'Surat masuk yang melewati batas waktu', _dmFeed((ss.overdue_list || []).map(s => ({
    title: s.perihal || '-', sub: `${esc(s.no_agenda || '')}${s.no_agenda ? ' · ' : ''}Batas: ${fmtDate(s.batas_waktu).split(',')[0]}`, badge: badgeOver,
  })), 'Tidak ada surat yang terlambat'), terlambat ? `<span class="badge badge-merah">${terlambat}</span>` : ''));
  html += _dmCols(cardsBawah);

  const badgeStatus = (st) => st === 'Selesai' ? '<span class="badge badge-hijau">Selesai</span>' : st === 'Terlambat' ? badgeOver : '<span class="badge badge-yellow">Proses</span>';
  html += _dmCols([
    _dmCard('Surat masuk terbaru', 'Surat terakhir', _dmFeed((ss.recent_masuk || []).map(s => ({ title: s.perihal || '-', sub: `${esc(s.nomor || '-')} · ${s.tanggal ? fmtDate(s.tanggal).split(',')[0] : '-'}`, badge: badgeStatus(s.status) })), 'Belum ada surat masuk')),
    _dmCard('Surat keluar terbaru', 'Surat terakhir', _dmFeed((ss.recent_keluar || []).map(s => ({ title: s.perihal || '-', sub: `${esc(s.nomor || '-')} · ${s.tanggal ? fmtDate(s.tanggal).split(',')[0] : '-'}` })), 'Belum ada surat keluar')),
  ]);

  const ins = [];
  if (terlambat > 0) ins.push(_dmIns('bad', `<b>${terlambat}</b> surat masuk sudah melewati batas waktu dan belum selesai.`));
  if (tigaHari > 0) ins.push(_dmIns('warn', `<b>${tigaHari}</b> surat masuk akan jatuh tempo dalam 3 hari ke depan.`));
  if (masukBulan > 0 && selesai < totalMasuk) ins.push(_dmIns('info', `Tingkat penyelesaian surat masuk saat ini <b>${pctSelesai}%</b> (${selesai} dari ${totalMasuk}).`));
  if (!ins.length) ins.push(_dmIns('ok', 'Tidak ada surat yang perlu perhatian khusus saat ini.'));
  html += `<div class="dm-card" style="margin-bottom:var(--sp-4)"><div class="dm-card-h"><div class="dm-card-hl">${_dmCardIcon('Catatan')}<div class="dm-card-t">Catatan</div></div></div>${ins.join('')}</div>`;

  _dmMount(wrap, html);
}
// Panel "Perlu Perhatian" - surat masuk yang belum diproses & lewat batas waktu
function _overdueSuratPanel(list) {
  const rows = list.slice(0, 5).map(s => `
    <tr><td>
      <div style="font-weight:500;font-size:.78rem">${esc(s.perihal||'-')}</div>
      <div style="font-size:.7rem;opacity:.55">${esc(s.no_agenda||'')}${s.no_agenda?' · ':''}Batas: ${fmtDate(s.batas_waktu)}</div>
    </td><td style="text-align:right"><span class="badge badge-merah">Terlambat</span></td></tr>`).join('');
  return `<div class="dash-panel dash-panel--urgent">
    <div class="dash-panel-header"><svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg> Perlu Perhatian - Surat Terlambat</div>
    <table class="dash-panel-table"><tbody>${rows}</tbody></table>
  </div>`;
}

// ── Absensi ──────────────────────────────────────────────────────────────────

// Ambil ringkasan absensi sebulan lewat endpoint agregat (1 request, dihitung
// di sisi DB via GROUP BY) - dipakai buat tren harian, ranking keterlambatan,
// status "sudah absensi hari ini", dan kalender heatmap. Gantiin skema lama yg
// nembus paginasi backend sampe 20x tiap load dashboard (rentan kena rate limit
// & bikin request lain ikut ke-block). userId kosong = semua pegawai (admin/full),
// diisi = punya sendiri (non-admin).
async function _fetchRingkasanBulan(bulan, tahun, userId) {
  const kosong = { harian: [], ranking_terlambat: [], sudah_absen_user_ids: [] };
  try {
    const params = new URLSearchParams({ bulan, tahun });
    if (userId) params.set('user_id', userId);
    const r = await fetch(`/api/absensi/ringkasan-bulan?${params}`, { headers: authHeaders() });
    if (!r.ok) { console.error('[_fetchRingkasanBulan] HTTP', r.status); return kosong; }
    const d = await r.json();
    return { harian: d.harian || [], ranking_terlambat: d.ranking_terlambat || [], ranking_alpa: d.ranking_alpa || [], ranking_tidak_lengkap: d.ranking_tidak_lengkap || [], sudah_absen_user_ids: d.sudah_absen_user_ids || [] };
  } catch (err) { console.error('[_fetchRingkasanBulan]', err); return kosong; }
}

// Ambil keterangan cuti & tugas luar sebulan buat tooltip Kalender Kehadiran.
// Endpoint ringkasan-bulan cuma ngasih angka agregat, jadi baris detailnya diambil terpisah
// (difilter status, jadi jumlahnya kecil). Hasil: Map 'YYYY-MM-DD' -> [{ status, nama, keterangan }].
async function _fetchKeteranganKalenderBulan(bulan, tahun, userId) {
  const hasil = new Map();
  try {
    await Promise.all(['cuti', 'tugas_luar'].map(async status => {
      for (let page = 1; page <= 10; page++) {
        const params = new URLSearchParams({ bulan, tahun, status, page });
        if (userId) params.set('user_id', userId);
        const r = await fetch(`/api/absensi?${params}`, { headers: authHeaders() });
        if (!r.ok) break;
        const d = await r.json();
        const rows = d.absensi || [];
        rows.forEach(a => {
          const key = _absLiburLocalYMD(a.tanggal);
          if (!hasil.has(key)) hasil.set(key, []);
          hasil.get(key).push({ status, nama: a.user_nama || '', keterangan: (a.keterangan || '').trim() });
        });
        if (!rows.length || page * rows.length >= (d.total || 0)) break;
      }
    }));
  } catch (err) { console.error('[_fetchKeteranganKalenderBulan]', err); }
  return hasil;
}

// Susun teks tooltip keterangan cuti/tugas luar satu hari. full=true nampilin nama pegawai.
function _absKetTipHari(list, full) {
  if (!list || !list.length) return '';
  const potong = t => t.length > 60 ? t.slice(0, 57) + '...' : t;
  const fmt = a => {
    const ket = a.keterangan ? potong(a.keterangan) : 'tanpa keterangan';
    return full && a.nama ? `${a.nama} (${ket})` : ket;
  };
  const grup = [['tugas_luar', 'Tugas luar'], ['cuti', 'Cuti']].map(([st, lbl]) => {
    const items = list.filter(a => a.status === st);
    if (!items.length) return '';
    const tampil = items.slice(0, 3).map(fmt).join('; ');
    const sisa = items.length > 3 ? ` +${items.length - 3} lainnya` : '';
    // Non-admin: label status sudah ada di depan tooltip ("Tgl 12: Tugas Luar"), jadi cukup keterangannya.
    return full ? `${lbl}: ${tampil}${sisa}` : `${tampil}${sisa}`;
  }).filter(Boolean);
  return grup.join(' • ');
}

async function _fetchPengajuanPendingDash(full, userId) {
  try {
    const params = new URLSearchParams({ status_persetujuan: 'pending' });
    if (!full) params.set('user_id', userId);
    const r = await fetch(`/api/absensi/pengajuan?${params}`, { headers: authHeaders() });
    if (!r.ok) return [];
    const d = await r.json();
    return d.pengajuan || [];
  } catch { return []; }
}

let _absKalOffset = 0; // 0 = bulan ini + bulan lalu (jendela terbaru); makin besar makin mundur
let _absDashCtx = null; // { full, userId } - dipakai ulang pas navigasi kalender tanpa perlu argumen ekstra

async function loadDashboardAbsensi() {
  const wrap = document.getElementById('dashAbsensiStats');
  if (!wrap) return;
  wrap.innerHTML = `
    <div class="skeleton" style="height:160px;border-radius:16px"></div>`;

  _absKalOffset = 0;
  const full = typeof isAbsensiFull === 'function' && isAbsensiFull();
  const now = new Date();
  const bulan = now.getMonth() + 1, tahun = now.getFullYear();
  const userId = full ? '' : _user.id;
  _absDashCtx = { full, userId };
  let d = {}, pegawaiList = [];
  let ringkasan = { harian: [], ranking_terlambat: [], sudah_absen_user_ids: [] };
  let pengajuanPending = [];
  let jamKerja = null;
  let absSettings = null;
  let liburSet = new Set();
  let liburMap = new Map(); // YMD -> keterangan, buat notice "hari ini libur"
  try {
    const [r1, ring, pengPending, rJamKerja, rSettings, rLibur] = await Promise.all([
      fetch(`/api/absensi/rekap?user_id=${userId}&bulan=${bulan}&tahun=${tahun}`, { headers: authHeaders() }),
      _fetchRingkasanBulan(bulan, tahun, userId),
      _fetchPengajuanPendingDash(full, _user.id),
      // Jam Kerja: buat non-full ini metrik personal (jam kerja diri sendiri),
      // buat full/admin ini total agregat semua pegawai (lihat backend
      // /api/absensi/jam-kerja: agregat aktif kalau gak ada user_id spesifik).
      fetch(`/api/absensi/jam-kerja?bulan=${bulan}&tahun=${tahun}`, { headers: authHeaders() }),
      fetch(`/api/absensi/settings`, { headers: authHeaders() }),
      fetch(`/api/absensi/libur?tahun=${tahun}`, { headers: authHeaders() }),
    ]);
    if (r1.ok) d = await r1.json();
    ringkasan = ring;
    pengajuanPending = pengPending;
    if (rJamKerja && rJamKerja.ok) jamKerja = await rJamKerja.json();
    if (rSettings && rSettings.ok) { const dSettings = await rSettings.json(); absSettings = dSettings.settings || null; }
    if (rLibur && rLibur.ok) {
      const dLibur = await rLibur.json();
      (dLibur.libur || []).forEach(l => {
        const ymd = _absLiburLocalYMD(l.tanggal);
        liburSet.add(ymd);
        liburMap.set(ymd, l.keterangan || 'Hari libur');
      });
    }
  } catch (err) { console.error('[loadDashboardAbsensi]', err); }

  if (full) {
    try {
      const ru = await fetch('/api/users', { headers: authHeaders() });
      const du = await ru.json();
      
      
      pegawaiList = (du.users || []).filter(u =>
        !u.is_admin && Array.isArray(u.permissions) &&
        (u.permissions.includes('absensi') || u.permissions.includes('absensi.full'))
      );
    } catch {  }
  }

  const icon = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="currentColor" style="flex-shrink:0;opacity:.85"><path d="M3 12C3 12.5523 3.44772 13 4 13H10C10.5523 13 11 12.5523 11 12V4C11 3.44772 10.5523 3 10 3H4C3.44772 3 3 3.44772 3 4V12ZM3 20C3 20.5523 3.44772 21 4 21H10C10.5523 21 11 20.5523 11 20V16C11 15.4477 10.5523 15 10 15H4C3.44772 15 3 15.4477 3 16V20ZM13 20C13 20.5523 13.4477 21 14 21H20C20.5523 21 21 20.5523 21 20V12C21 11.4477 20.5523 11 20 11H14C13.4477 11 13 11.4477 13 12V20ZM14 3C13.4477 3 13 3.44772 13 4V8C13 8.55228 13.4477 9 14 9H20C20.5523 9 21 8.55228 21 8V4C21 3.44772 20.5523 3 20 3H14Z"/></svg>`;
  let html = _dashModuleHeader(icon, 'Dashboard', full ? 'Ringkasan kehadiran seluruh pegawai bulan ini' : 'Ringkasan kehadiran Anda bulan ini');

  _dmStyle();
  let rkPrev = null;
  try {
    const pm = bulan === 1 ? 12 : bulan - 1, pt = bulan === 1 ? tahun - 1 : tahun;
    const rp = await fetch(`/api/absensi/rekap?user_id=${userId}&bulan=${pm}&tahun=${pt}`, { headers: authHeaders() });
    if (rp.ok) rkPrev = (await rp.json()).rekap || null;
  } catch { /* bulan lalu opsional */ }

  const rk = d.rekap || { hadir: 0, tugas_luar: 0, cuti: 0, alpa: 0, terlambat: 0, tidak_lengkap: 0, total_menit_terlambat: 0 };
  const tot = (r) => (r.hadir || 0) + (r.terlambat || 0) + (r.tidak_lengkap || 0) + (r.tugas_luar || 0) + (r.cuti || 0) + (r.alpa || 0);
  const totalCatat = tot(rk);
  const hadirEfektif = totalCatat - (rk.alpa || 0);
  const rate = _dmPct(hadirEfektif, totalCatat);
  const ratePrev = rkPrev && tot(rkPrev) ? _dmPct(tot(rkPrev) - (rkPrev.alpa || 0), tot(rkPrev)) : null;
  const avgMenit = rk.terlambat > 0 ? Math.round((rk.total_menit_terlambat || 0) / rk.terlambat) : 0;
  const namaBulan = ABS_BULAN_NAMA[bulan];
  const dRate = ratePrev !== null ? rate - ratePrev : null;
  const rateSub = dRate !== null ? `${dRate >= 0 ? '▲' : '▼'} ${Math.abs(dRate)} poin vs bulan lalu` : `${hadirEfektif} dari ${totalCatat} catatan`;

  // Status hari ini
  const wNowDash = typeof _witaNow === 'function' ? _witaNow() : null;
  const isJumatDash = wNowDash ? wNowDash.day === 5 : (new Date().getDay() === 5);
  const masukAwalHariIni = absSettings
    ? (isJumatDash ? absSettings.jam_masuk_awal_jumat : absSettings.jam_masuk_awal_senin_kamis)?.slice(0, 5) || null
    : null;
  const jendelaBelumBuka = !!(masukAwalHariIni && wNowDash && wNowDash.hhmm < masukAwalHariIni);
  const _todayHariIni = new Date();
  const dowHariIni = _todayHariIni.getDay();
  const isWeekendHariIni = dowHariIni === 0 || dowHariIni === 6;
  const _ymdHariIni = _absLiburLocalYMD(_todayHariIni);
  const isLiburHariIni = liburSet.has(_ymdHariIni);
  const bukanHariKerja = isWeekendHariIni || isLiburHariIni;
  const labelHariLibur = isLiburHariIni ? (liburMap.get(_ymdHariIni) || 'Hari Libur') : (isWeekendHariIni ? 'Akhir Pekan' : null);

  const harian = ringkasan.harian || [];
  const hariIniRow = harian.find(h => h.tanggal === _ymdHariIni) || null;
  let belumList = [];
  if (full && d.hari_ini && !bukanHariKerja && !jendelaBelumBuka) {
    const sudahIds = new Set(ringkasan.sudah_absen_user_ids);
    belumList = pegawaiList.filter(u => !sudahIds.has(u.id));
  }

  // Tone & teks hero
  const tone = totalCatat === 0 ? 'abu' : rate >= 90 ? 'ok' : rate >= 75 ? 'warn' : 'bad';
  let teksHariIni = '';
  if (bukanHariKerja) teksHariIni = `Hari ini <b>${esc(labelHariLibur)}</b>, tidak ada jadwal absensi.`;
  else if (full && d.hari_ini) teksHariIni = jendelaBelumBuka ? `Absensi masuk baru dibuka pukul <b>${esc(masukAwalHariIni)}</b> WITA.` : `Hari ini <b>${d.hari_ini.sudah_absen}</b> dari <b>${d.hari_ini.total_pegawai}</b> pegawai sudah absensi.`;
  else if (!full) teksHariIni = hariIniRow ? 'Absensi Anda hari ini sudah tercatat.' : (jendelaBelumBuka ? `Absensi masuk baru dibuka pukul <b>${esc(masukAwalHariIni)}</b> WITA.` : 'Anda belum absensi hari ini.');
  // Ketepatan waktu = tepat waktu / (tepat waktu + terlambat), dibanding bulan lalu; garis tren = per hari bulan ini
  const _tepat = (r) => (r && (r.hadir || 0) + (r.terlambat || 0) > 0) ? Math.round((r.hadir || 0) * 100 / ((r.hadir || 0) + (r.terlambat || 0))) : null;
  const tepatNow = _tepat(rk), tepatPrev = _tepat(rkPrev);
  const tepatHarian = harian.filter(h => (h.hadir + h.terlambat) > 0).map(h => Math.round(h.hadir * 100 / (h.hadir + h.terlambat)));
  html += _dmHero({
    tone,
    title: totalCatat === 0 ? `Belum ada data absensi ${namaBulan}` : (full ? `Tingkat kehadiran ${rate}% di bulan ${namaBulan}` : `Kehadiran Anda ${rate}% di bulan ${namaBulan}`),
    text: [
      teksHariIni,
      avgMenit ? `Rata-rata keterlambatan <b>${avgMenit}</b> menit.` : '',
      pengajuanPending.length ? `<b>${pengajuanPending.length}</b> pengajuan menunggu persetujuan.` : '',
    ],
    ring: { pct: rate, label: 'hadir', tip: `${hadirEfektif} dari ${totalCatat} catatan hadir bulan ${namaBulan}` },
    seg: [
      { label: 'Tepat waktu', val: rk.hadir || 0, color: _DM_PAL.ok },
      { label: 'Terlambat', val: rk.terlambat || 0, color: _DM_PAL.warn },
      { label: 'Tidak lengkap', val: rk.tidak_lengkap || 0, color: _DM_PAL.ungu },
      { label: 'Tugas luar', val: rk.tugas_luar || 0, color: _DM_PAL.sky },
      { label: 'Cuti', val: rk.cuti || 0, color: _DM_PAL.pink },
      { label: 'Alpa', val: rk.alpa || 0, color: _DM_PAL.bad },
    ],
    trend: {
      label: 'Ketepatan waktu',
      val: tepatNow == null ? '-' : `${tepatNow}%`,
      d: tepatNow != null && tepatPrev != null ? tepatNow - tepatPrev : null,
      unit: 'poin', vs: 'dari bulan lalu',
      vals: tepatHarian,
      note: tepatNow == null ? 'Belum ada data' : '',
    },
    reload: 'loadDashboardAbsensi()',
  });

  // Data harian
  const daysInMonth = new Date(tahun, bulan, 0).getDate();
  const lastDay = (_todayHariIni.getFullYear() === tahun && _todayHariIni.getMonth() + 1 === bulan) ? _todayHariIni.getDate() : daysInMonth;
  const byDay = new Map(harian.map(h => [h.tanggal, h]));
  const hari = [];
  for (let i = 1; i <= lastDay; i++) {
    const key = `${tahun}-${String(bulan).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
    const c = byDay.get(key) || { hadir: 0, terlambat: 0, tidak_lengkap: 0, tugas_luar: 0, cuti: 0, alpa: 0 };
    hari.push({ tgl: i, hadir: c.hadir + c.terlambat + (c.tidak_lengkap || 0) + c.tugas_luar + c.cuti, terlambat: c.terlambat, alpa: c.alpa });
  }
  const lblHari = hari.map(h => ({ short: String(h.tgl), full: `${h.tgl} ${namaBulan} ${tahun}` }));

  html += `<div class="dm-kpis">
    ${_dmKpi({ label: 'Tingkat Kehadiran', val: `${rate}%`, sub: rateSub, color: rate >= 90 ? _DM_PAL.ok : rate >= 75 ? _DM_PAL.warn : _DM_PAL.bad, icon: 'check', spark: _dmSpark(hari.map(h => h.hadir), _DM_PAL.ok) })}
    ${_dmKpi({ label: 'Tepat Waktu', val: _dmNf(rk.hadir), sub: rkPrev ? `${_dmNf(rkPrev.hadir)} bulan lalu` : null, color: _DM_PAL.ok, icon: 'user' })}
    ${_dmKpi({ label: 'Terlambat', val: _dmNf(rk.terlambat), sub: avgMenit ? `rata-rata ${avgMenit} menit` : (rkPrev ? `${_dmNf(rkPrev.terlambat)} bulan lalu` : null), color: _DM_PAL.warn, icon: 'clock', spark: _dmSpark(hari.map(h => h.terlambat), _DM_PAL.warn) })}
    ${_dmKpi({ label: 'Tidak Lengkap', val: _dmNf(rk.tidak_lengkap || 0), sub: 'Tanpa jam masuk atau pulang', color: _DM_PAL.ungu, icon: 'doc' })}
    ${_dmKpi({ label: 'Tugas Luar / Cuti', val: `${_dmNf(rk.tugas_luar)} / ${_dmNf(rk.cuti)}`, sub: 'Bulan ini', color: _DM_PAL.sky, icon: 'cal' })}
    ${_dmKpi({ label: 'Alpa', val: _dmNf(rk.alpa || 0), sub: (rk.alpa || 0) ? 'Perlu ditindaklanjuti' : 'Tidak ada alpa', color: (rk.alpa || 0) ? _DM_PAL.bad : _DM_PAL.ok, icon: 'warn', spark: _dmSpark(hari.map(h => h.alpa), _DM_PAL.bad) })}
  </div>`;

  html += _dmCols([
    _dmCard(`Kehadiran harian - ${namaBulan} ${tahun}`, full ? 'Jumlah pegawai hadir dan terlambat per hari' : 'Status kehadiran Anda per hari', hari.length ? _dmArea({ labels: lblHari, series: [{ name: 'Hadir', color: _DM_PAL.ok, values: hari.map(h => h.hadir) }, { name: 'Terlambat', color: _DM_PAL.warn, values: hari.map(h => h.terlambat), dash: true }, { name: 'Alpa', color: _DM_PAL.bad, values: hari.map(h => h.alpa), dash: true }] }) + _dmLegend([[_DM_PAL.ok, 'Hadir'], [_DM_PAL.warn, 'Terlambat'], [_DM_PAL.bad, 'Alpa']]) : _dmEmpty('Belum ada data')),
    _dmCard('Komposisi kehadiran', `Seluruh catatan ${namaBulan}`, _dmDonut([
      { label: 'Tepat waktu', value: rk.hadir, color: _DM_PAL.ok }, { label: 'Terlambat', value: rk.terlambat, color: _DM_PAL.warn },
      { label: 'Tidak lengkap', value: rk.tidak_lengkap || 0, color: _DM_PAL.ungu }, { label: 'Tugas luar', value: rk.tugas_luar, color: _DM_PAL.sky },
      { label: 'Cuti', value: rk.cuti, color: _DM_PAL.pink }, { label: 'Alpa', value: rk.alpa || 0, color: _DM_PAL.bad },
    ], `${rate}%`, 'hadir')),
  ], true);

  // Baris status hari ini, jam kerja, belum absensi
  const kartuHariIni = [];
  if (bukanHariKerja) {
    kartuHariIni.push(_dmCard('Status hari ini', '', `<div class="dm-big"><b>${esc(labelHariLibur)}</b></div><div class="dm-sub">Tidak ada jadwal absensi</div>`));
  } else if (full && d.hari_ini) {
    const sdh = d.hari_ini.sudah_absen, tp = d.hari_ini.total_pegawai;
    kartuHariIni.push(_dmCard('Absensi hari ini', jendelaBelumBuka ? `Dibuka pukul ${esc(masukAwalHariIni)} WITA` : 'Pegawai yang sudah dan belum absensi', _dmDonut([
      { label: 'Sudah absensi', value: sdh, color: _DM_PAL.ok }, { label: 'Belum absensi', value: Math.max(0, tp - sdh), color: '#cbd5e1' },
    ], `${sdh}/${tp}`, 'pegawai')));
    kartuHariIni.push(_dmCard('Belum absensi hari ini', jendelaBelumBuka ? 'Jendela absensi belum dibuka' : `${belumList.length} pegawai`,
      jendelaBelumBuka ? _dmEmpty(`Absensi masuk baru bisa dicatat mulai pukul ${esc(masukAwalHariIni || '--:--')} WITA`, true)
        : _dmFeed(belumList.map(u => ({ title: u.nama || '-', lead: `<span class="dm-av" style="background:#fee2e2;color:#b91c1c">${esc(_dmInisial(u.nama))}</span>` })), 'Semua pegawai sudah absensi')));
  } else if (!full) {
    const st = hariIniRow ? (hariIniRow.alpa ? 'Alpa' : hariIniRow.tidak_lengkap ? 'Tidak lengkap' : hariIniRow.terlambat ? 'Terlambat' : hariIniRow.hadir ? 'Tepat waktu' : hariIniRow.tugas_luar ? 'Tugas luar' : hariIniRow.cuti ? 'Cuti' : 'Tercatat') : (jendelaBelumBuka ? 'Belum dibuka' : 'Belum absensi');
    kartuHariIni.push(_dmCard('Status hari ini', '', `<div class="dm-big"><b>${st}</b></div><div class="dm-sub">${hariIniRow ? 'Absensi hari ini sudah tercatat' : 'Belum ada catatan absensi hari ini'}</div>`));
  }
  if (jamKerja) {
    const fmtJ = (m) => `${Math.floor(Math.abs(m || 0) / 60).toLocaleString('id-ID')}j ${Math.abs(m || 0) % 60}m`;
    const pa = Math.max(0, jamKerja.persentase || 0), warna = _kwCapaianColor(pa);
    kartuHariIni.push(_dmCard(jamKerja.agregat ? `Total jam kerja ${namaBulan}` : `Jam kerja ${namaBulan}`, `${jamKerja.hari_kerja_total} hari kerja bulan ini`,
      `<div class="dm-big"><b style="color:${warna}">${fmtJ(jamKerja.aktual_menit)}</b><span>dari target ${fmtJ(jamKerja.target_menit)}</span></div>
       <div class="dm-hb-track" style="height:9px"><i style="width:${Math.min(100, pa)}%;background:${warna}"></i></div>
       <div class="dm-sub" style="margin-top:8px">${pa}% tercapai${jamKerja.agregat ? ` · total dari ${jamKerja.jumlah_pegawai} pegawai` : ' · Cuti/Tugas Luar disetujui dihitung penuh'}</div>`));
  }
  html += _dmCols(kartuHariIni);

  // Peringkat (admin/full)
  if (full) {
    const rankRows = (arr, warna, satuan) => (arr || []).map(r => ({ label: r.user_nama, full: true, value: r.jumlah, suffix: satuan, color: warna }));
    html += _dmCols([
      _dmCard('Paling sering terlambat', `Peringkat pegawai, ${namaBulan}`, _dmHbAuto(rankRows(ringkasan.ranking_terlambat, _DM_PAL.warn, ' kali'), 'Tidak ada keterlambatan')),
      _dmCard('Paling sering alpa', `Peringkat pegawai, ${namaBulan}`, _dmHbAuto(rankRows(ringkasan.ranking_alpa, _DM_PAL.bad, ' hari'), 'Tidak ada alpa')),
      _dmCard('Absensi tidak lengkap', `Peringkat pegawai, ${namaBulan}`, _dmHbAuto(rankRows(ringkasan.ranking_tidak_lengkap, _DM_PAL.ungu, ' kali'), 'Semua absensi lengkap')),
    ]);
  }

  // Pengajuan menunggu persetujuan
  if (pengajuanPending.length) {
    const jenisLabel = { tugas_luar: 'Tugas Luar', cuti: 'Cuti' };
    const baris = pengajuanPending.map(p => ({
      title: full ? `${p.nama_pegawai || '-'} - ${jenisLabel[p.status] || p.status}` : (jenisLabel[p.status] || p.status),
      sub: `${_dashFmtTgl(p.tanggal)} s/d ${_dashFmtTgl(p.tanggal_selesai)}`,
      lead: `<span class="dm-av" style="background:#fef3c7;color:#92400e">${esc(_dmInisial(full ? p.nama_pegawai : (jenisLabel[p.status] || p.status)))}</span>`,
    }));
    html += _dmCols([_dmCard(full ? 'Menunggu persetujuan' : 'Pengajuan saya menunggu persetujuan', `${pengajuanPending.length} pengajuan`,
      _dmFeed(baris)
      + (full ? `<button class="btn btn-secondary btn-sm" style="margin-top:10px;width:100%" onclick="_dashBukaPersetujuanAbsensi()">Buka persetujuan</button>` : ''))]);
  }

  const ins = [];
  if (totalCatat > 0 && rate < 75) ins.push(_dmIns('bad', `Tingkat kehadiran <b>${rate}%</b> di bawah 75%.`));
  if (dRate !== null && dRate <= -5) ins.push(_dmIns('warn', `Tingkat kehadiran turun <b>${Math.abs(dRate)} poin</b> dibanding bulan lalu.`));
  if (dRate !== null && dRate >= 5) ins.push(_dmIns('ok', `Tingkat kehadiran naik <b>${dRate} poin</b> dibanding bulan lalu.`));
  if (rk.terlambat > 0) ins.push(_dmIns('warn', `<b>${rk.terlambat}</b> keterlambatan bulan ini, total <b>${_dmNf(rk.total_menit_terlambat || 0)}</b> menit.`));
  if (full && (ringkasan.ranking_alpa || []).length) ins.push(_dmIns('bad', `Alpa terbanyak: <b>${esc(ringkasan.ranking_alpa[0].user_nama)}</b> (${ringkasan.ranking_alpa[0].jumlah} hari).`));
  if (full && belumList.length) ins.push(_dmIns('info', `<b>${belumList.length}</b> pegawai belum absensi hari ini.`));
  if (!ins.length) ins.push(_dmIns('ok', 'Tidak ada catatan khusus untuk kehadiran bulan ini.'));
  html += `<div class="dm-card" style="margin-bottom:var(--sp-4)"><div class="dm-card-h"><div class="dm-card-hl">${_dmCardIcon('Catatan')}<div class="dm-card-t">Catatan</div></div></div>${ins.join('')}</div>`;

  // Kalender kehadiran (2 bulan) tetap seperti sebelumnya
  html += await _absensiKalenderSectionHtml();

  _dmMount(wrap, html);
}

// Bagian "Perbandingan Kehadiran Bulanan" + "Kalender Kehadiran" (2 bulan) - dipisah dari
// loadDashboardAbsensi biar tombol navigasi bulan cuma perlu render ulang bagian ini aja,
// tanpa reload seluruh dashboard (KPI/status hari ini/jam kerja tetap milik bulan berjalan).
async function _absensiKalenderSectionHtml() {
  if (!_absDashCtx) return '';
  const { full, userId } = _absDashCtx;
  const now = new Date();
  const baseRef = new Date(now.getFullYear(), now.getMonth() - _absKalOffset, 1);
  const bulan = baseRef.getMonth() + 1, tahun = baseRef.getFullYear();
  const prevRef = new Date(tahun, bulan - 2, 1);
  const prevBulan = prevRef.getMonth() + 1, prevTahun = prevRef.getFullYear();

  let d = {}, dPrev = {};
  let ringkasan = { harian: [] }, ringkasanPrev = { harian: [] };
  let liburSet = new Set();
  let liburMap = new Map();
  try {
    const tahunLiburSet = new Set([tahun, prevTahun]); // bisa beda kalau lintas Desember-Januari
    const [r1, r2, ring, ringPrev, kB, kP, ...rLiburList] = await Promise.all([
      fetch(`/api/absensi/rekap?user_id=${userId}&bulan=${bulan}&tahun=${tahun}`, { headers: authHeaders() }),
      fetch(`/api/absensi/rekap?user_id=${userId}&bulan=${prevBulan}&tahun=${prevTahun}`, { headers: authHeaders() }),
      _fetchRingkasanBulan(bulan, tahun, userId),
      _fetchRingkasanBulan(prevBulan, prevTahun, userId),
      _fetchKeteranganKalenderBulan(bulan, tahun, userId),
      _fetchKeteranganKalenderBulan(prevBulan, prevTahun, userId),
      ...[...tahunLiburSet].map(ty => fetch(`/api/absensi/libur?tahun=${ty}`, { headers: authHeaders() })),
    ]);
    if (r1.ok) d = await r1.json();
    if (r2.ok) dPrev = await r2.json();
    ringkasan = ring;
    ringkasanPrev = ringPrev;
    ketBulan = kB; ketPrev = kP;
    for (const rLibur of rLiburList) {
      if (!rLibur || !rLibur.ok) continue;
      const dLibur = await rLibur.json();
      (dLibur.libur || []).forEach(l => {
        const ymd = _absLiburLocalYMD(l.tanggal);
        liburSet.add(ymd);
        liburMap.set(ymd, l.keterangan || 'Hari libur');
      });
    }
  } catch (err) { console.error('[_absensiKalenderSectionHtml]', err); }

  const rk     = d.rekap     || { hadir: 0, tugas_luar: 0, cuti: 0, alpa: 0, terlambat: 0, tidak_lengkap: 0 };
  const rkPrev = dPrev.rekap || { hadir: 0, tugas_luar: 0, cuti: 0, alpa: 0, terlambat: 0, tidak_lengkap: 0 };

  const iconCal = `<svg xmlns="http://www.w3.org/2000/svg" width="17" height="17" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="18" x="3" y="4" rx="2"/><path d="M3 10h18"/><path d="M8 2v4"/><path d="M16 2v4"/></svg>`;
  const iconTidakLengkap = `<svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect width="8" height="4" x="8" y="2" rx="1" ry="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><path d="m15 11-6 6"/><path d="m9 11 6 6"/></svg>`;
  const iconHadirRow = `<svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M9 12l2 2 4-4"/><circle cx="12" cy="12" r="10"/></svg>`;
  const iconClockRow = `<svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>`;

  const labelBulanIni  = ABS_BULAN_NAMA[bulan];
  const labelBulanLalu = ABS_BULAN_NAMA[prevBulan];
  const pctChange = rkPrev.hadir > 0 ? Math.round(((rk.hadir - rkPrev.hadir) / rkPrev.hadir) * 100) : null;
  const pctChangeTL = rkPrev.tidak_lengkap > 0 ? Math.round((((rk.tidak_lengkap || 0) - rkPrev.tidak_lengkap) / rkPrev.tidak_lengkap) * 100) : null;
  const pctChangeTerlambat = rkPrev.terlambat > 0 ? Math.round(((rk.terlambat - rkPrev.terlambat) / rkPrev.terlambat) * 100) : null;
  const perbandinganPanel = _barListPanel({
    icon: iconCal, title: 'Perbandingan Kehadiran Bulanan',
    rows: [
      { label: `Tepat Waktu - ${labelBulanIni}`, value: rk.hadir, sublabel: pctChange !== null ? `${pctChange >= 0 ? '↑' : '↓'} ${Math.abs(pctChange)}% dari bulan lalu` : null, color: _KPI_COLORS.green.text, icon: iconHadirRow },
      { label: `Tepat Waktu - ${labelBulanLalu}`, value: rkPrev.hadir, color: '#94a3b8', icon: iconHadirRow },
      { label: `Terlambat - ${labelBulanIni}`, value: rk.terlambat, sublabel: pctChangeTerlambat !== null ? `${pctChangeTerlambat >= 0 ? '↑' : '↓'} ${Math.abs(pctChangeTerlambat)}% dari bulan lalu` : null, color: _KPI_COLORS.amber.text, icon: iconClockRow },
      { label: `Terlambat - ${labelBulanLalu}`, value: rkPrev.terlambat, color: '#94a3b8', icon: iconClockRow },
      { label: `Tidak Lengkap - ${labelBulanIni}`, value: rk.tidak_lengkap || 0, sublabel: pctChangeTL !== null ? `${pctChangeTL >= 0 ? '↑' : '↓'} ${Math.abs(pctChangeTL)}% dari bulan lalu` : null, color: _KPI_COLORS.purple.text, icon: iconTidakLengkap },
      { label: `Tidak Lengkap - ${labelBulanLalu}`, value: rkPrev.tidak_lengkap || 0, color: '#94a3b8', icon: iconTidakLengkap },
    ],
  });

  const heatmapPanels = `${perbandinganPanel}${_absensiHeatmapPanel(ringkasanPrev.harian, prevBulan, prevTahun, full, false, liburSet, liburMap, ketPrev)}${_absensiHeatmapPanel(ringkasan.harian, bulan, tahun, full, false, liburSet, liburMap, ketBulan)}`;

  return `<div id="absKalenderSection">
    ${_dashKalenderNavHtml(_absKalOffset, '_absKalNav')}
    <div class="dash-panels dash-panels--kalender-row">${heatmapPanels}</div>
  </div>`;
}

async function _absKalNav(delta) {
  _absKalOffset = Math.max(0, _absKalOffset + delta);
  const el = document.getElementById('absKalenderSection');
  if (!el) return;
  el.style.opacity = '.5';
  el.outerHTML = await _absensiKalenderSectionHtml();
}

function _liburNoticePanel(title, labelHariLibur) {
  const iconCal = `<svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="18" x="3" y="4" rx="2"/><path d="M3 10h18"/><path d="M8 2v4"/><path d="M16 2v4"/></svg>`;
  const label = labelHariLibur || 'Hari Libur';
  return `<div class="dash-panel dash-panel--libur">
    <div class="dash-panel-header">${iconCal}<span style="flex:1">${esc(title)}</span></div>
    <div class="dash-panel-empty" style="padding:26px 18px">
      <div class="dash-libur-heading">${iconCal}<span>${esc(label)}</span></div>
      <div class="dash-libur-caption">Tidak ada jadwal absensi</div>
    </div>
  </div>`;
}

function _absensiBelumPanel(list, totalPegawai, sudahAbsen, jendelaBelumBuka = false, masukAwal = null, bukanHariKerja = false, labelHariLibur = null) {
  const iconWarn = `<svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3"/><line x1="12" x2="12" y1="9" y2="13"/><line x1="12" x2="12.01" y1="17" y2="17"/></svg>`;
  const iconClock = `<svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>`;
  if (bukanHariKerja) return _liburNoticePanel('Belum Absensi Hari Ini', labelHariLibur);
  if (jendelaBelumBuka) {
    return `<div class="dash-panel">
      <div class="dash-panel-header">${iconClock}<span style="flex:1">Belum Absensi Hari Ini</span><span class="badge badge-abu">Belum buka</span></div>
      <div class="dash-panel-empty">Absensi masuk baru bisa dicatat mulai jam ${esc(masukAwal || '--:--')} WITA</div>
    </div>`;
  }
  if (!list.length) {
    return `<div class="dash-panel">
      <div class="dash-panel-header">${iconWarn}<span style="flex:1">Belum Absensi Hari Ini</span><span class="badge badge-hijau">Semua sudah absensi</span></div>
      <div class="dash-panel-empty">Semua pegawai (${sudahAbsen}/${totalPegawai}) sudah absensi hari ini 🎉</div>
    </div>`;
  }
  const shown = list.slice(0, 8);
  const rest  = list.length - shown.length;
  const rows = shown.map(u => `
    <div style="display:flex;align-items:center;gap:9px;padding:8px 0;border-bottom:1px solid #f1f5f9">
      <span style="position:relative;width:26px;height:26px;flex-shrink:0">
        <span style="position:absolute;inset:0;border-radius:50%;background:#fee2e2;color:#b91c1c;display:flex;align-items:center;justify-content:center;font-size:.68rem;font-weight:700">${esc((u.nama || '?').slice(0, 1).toUpperCase())}</span>
        ${u.foto_url ? `<img src="${esc(u.foto_url)}" alt="" style="position:absolute;inset:0;width:26px;height:26px;border-radius:50%;object-fit:cover" onerror="this.style.display='none'">` : ''}
      </span>
      <span style="font-size:.8rem;font-weight:600;color:#0f172a;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(u.nama || '-')}</span>
    </div>`).join('');
  return `<div class="dash-panel">
    <div class="dash-panel-header">${iconWarn}<span style="flex:1">Belum Absensi Hari Ini</span><span class="badge badge-warning">${list.length}</span></div>
    <div style="padding:2px 18px 10px">${rows}${rest > 0 ? `<div style="padding-top:8px;font-size:.72rem;color:var(--teks-muted)">+${rest} pegawai lainnya</div>` : ''}</div>
  </div>`;
}

// Skala warna kartu Jam Kerja disamain persis sama Skala Nilai Peringkat Kinerja
// (Permendagri No. 86/2017) yang dipakai di modul Kinerja - lihat _kwCapaianColor
// di bawah (91-100 Sangat Tinggi, 76-90 Tinggi, 66-75 Sedang, 51-65 Rendah, ≤50
// Sangat Rendah), biar user gak bingung liat 2 skala warna beda arti di app yg sama.
// (Dulu pakai skala PermenPANRB sendiri di sini - diganti biar konsisten.)

// Panel "Jam Kerja Bulan Ini" - akumulasi jam kerja vs target (dari /api/absensi/jam-kerja).
// Non-full: metrik personal milik sendiri, dipasangkan 1 baris dengan Tren Kehadiran Harian.
// Full/admin: total agregat semua pegawai (backend otomatis agregat kalau gak ada user_id
// spesifik), dipasangkan 1 kolom bareng panel "Belum Absensi Hari Ini" (lihat loadDashboardAbsensi).
function _absensiJamKerjaPanel(d, full = false) {
  const iconJam = `<svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="10" x2="14" y1="2" y2="2"/><line x1="12" x2="15" y1="14" y2="11"/><circle cx="12" cy="14" r="8"/></svg>`;
  const fmt = (menit) => {
    const jam = Math.floor(Math.abs(menit || 0) / 60);
    const sisa = Math.abs(menit || 0) % 60;
    return `${jam.toLocaleString('id-ID')}j ${sisa}m`;
  };
  const pctAsli = Math.max(0, d.persentase || 0);
  const pct = Math.min(100, pctAsli);
  const warna = _kwCapaianColor(pctAsli);
  const judul = d.agregat ? `Total Jam Kerja ${ABS_BULAN_NAMA[d.bulan]}` : `Jam Kerja ${ABS_BULAN_NAMA[d.bulan]}`;
  const catatanBawah = d.agregat
    ? `${d.hari_kerja_total} hari kerja bulan ini · total dari ${d.jumlah_pegawai} pegawai`
    : `${d.hari_kerja_total} hari kerja bulan ini · Cuti/Tugas Luar disetujui dihitung penuh sesuai jadwal`;
  return `<div class="dash-panel dash-jamkerja-panel" style="--jk-warna:${warna}">
    <div class="dash-panel-header">${iconJam}<span style="flex:1">${judul}</span><span class="badge" style="background:${warna}22;color:${warna}">${pct}%</span></div>
    <div style="padding:14px 18px 18px">
      <div style="display:flex;align-items:baseline;gap:6px;margin-bottom:10px;flex-wrap:wrap">
        <span style="font-size:1.5rem;font-weight:800;color:${warna}">${fmt(d.aktual_menit)}</span>
        <span style="font-size:.78rem;color:var(--teks-muted)">dari target ${fmt(d.target_menit)}</span>
      </div>
      <div style="width:100%;height:7px;border-radius:99px;background:#e2e8f0;overflow:hidden">
        <div style="height:100%;border-radius:99px;width:${pct}%;background:${warna};transition:width .3s"></div>
      </div>
      <div style="font-size:.72rem;color:var(--teks-muted);margin-top:10px">
        ${catatanBawah}
      </div>
    </div>
  </div>`;
}

function _absensiPengajuanPanel(list, full) {
  const iconClockCal = `<svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="18" x="3" y="4" rx="2"/><path d="M3 10h18"/><path d="M8 2v4"/><path d="M16 2v4"/><path d="M12 14v4"/><path d="M10 16h4"/></svg>`;
  const shown = list.slice(0, 6);
  const rest = list.length - shown.length;
  const jenisLabel = { tugas_luar: 'Tugas Luar', cuti: 'Cuti' };
  const rows = shown.map(p => {
    const nama = full ? (p.nama_pegawai || '-') : (jenisLabel[p.status] || p.status);
    return `
    <div style="display:flex;align-items:center;gap:9px;padding:8px 0;border-bottom:1px solid #f1f5f9">
      <span style="width:26px;height:26px;border-radius:50%;background:#fef3c7;color:#92400e;display:flex;align-items:center;justify-content:center;font-size:.68rem;font-weight:700;flex-shrink:0">${esc(nama.slice(0, 1).toUpperCase())}</span>
      <div style="min-width:0;flex:1">
        <div style="font-size:.8rem;font-weight:600;color:#0f172a;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(nama)}${full ? ` - ${esc(jenisLabel[p.status] || p.status)}` : ''}</div>
        <div style="font-size:.7rem;color:var(--teks-muted)">${_dashFmtTgl(p.tanggal)} s/d ${_dashFmtTgl(p.tanggal_selesai)}</div>
      </div>
    </div>`;
  }).join('');
  return `<div class="dash-panel">
    <div class="dash-panel-header">${iconClockCal}<span style="flex:1">${full ? 'Menunggu Persetujuan' : 'Pengajuan Saya - Menunggu Persetujuan'}</span><span class="badge badge-warning">${list.length}</span></div>
    <div style="padding:2px 18px 10px">${rows}${rest > 0 ? `<div style="padding-top:8px;font-size:.72rem;color:var(--teks-muted)">+${rest} pengajuan lainnya</div>` : ''}
      ${full ? `<button class="btn btn-secondary btn-sm" style="margin-top:8px;width:100%" onclick="_dashBukaPersetujuanAbsensi()"><svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path stroke-linecap="round" stroke-linejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg>Tinjau Sekarang</button>` : ''}
    </div>
  </div>`;
}

function _dashFmtTgl(s) {
  if (!s) return '-';
  return new Date(s).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC' });
}

function _dashBukaPersetujuanAbsensi() {
  navigateTo('absensi-harian', 'Absensi', () => {
    loadAbsensi().then(() => { if (typeof openPersetujuanModal === 'function') openPersetujuanModal(); });
  }, 'absensi', 'page-absensi');
}

function _absensiTrendPanel(harian, bulan, tahun, full, spanFull = true) {
  const daysInMonth = new Date(tahun, bulan, 0).getDate();
  const today = new Date();
  const isCurrentMonth = today.getFullYear() === tahun && today.getMonth() + 1 === bulan;
  const lastDay = isCurrentMonth ? today.getDate() : daysInMonth;
  const pad2 = n => String(n).padStart(2, '0');

  
  const byDay = new Map();
  (harian || []).forEach(h => {
    byDay.set(h.tanggal, { hadirTepat: h.hadir, terlambat: h.terlambat, tidakLengkap: h.tidak_lengkap || 0, tugas_luar: h.tugas_luar, cuti: h.cuti, alpa: h.alpa });
  });

  const days = [];
  for (let i = 1; i <= lastDay; i++) {
    const key = `${tahun}-${pad2(bulan)}-${pad2(i)}`;
    const c = byDay.get(key) || { hadirTepat: 0, terlambat: 0, tidakLengkap: 0, tugas_luar: 0, cuti: 0, alpa: 0 };
    days.push({ tgl: i, dow: new Date(tahun, bulan - 1, i).getDay(), ...c });
  }

  const maxTotal = Math.max(1, ...days.map(d => d.hadirTepat + d.terlambat + d.tidakLengkap + d.tugas_luar + d.cuti));
  
  const SEG_COLORS = { hadirTepat: _KPI_COLORS.green.text, terlambat: _KPI_COLORS.amber.text, tidakLengkap: _KPI_COLORS.purple.text, tugas_luar: _KPI_COLORS.biruMuda.text, cuti: _KPI_COLORS.fuchsia.text };

  const bars = days.map(d => {
    const total = d.hadirTepat + d.terlambat + d.tidakLengkap + d.tugas_luar + d.cuti;
    const barH = Math.max(3, Math.round((total / maxTotal) * 74));
    const segs = ['hadirTepat', 'terlambat', 'tidakLengkap', 'tugas_luar', 'cuti']
      .filter(k => d[k] > 0)
      .map(k => `<div class="dash-trend-bar-seg" style="height:${Math.max(2, Math.round((d[k] / (total || 1)) * barH))}px;background:${SEG_COLORS[k]}"></div>`)
      .join('');
    const tip = total
      ? `${d.hadirTepat} tepat waktu, ${d.terlambat} telat, ${d.tidakLengkap} tidak lengkap, ${d.tugas_luar} tugas luar, ${d.cuti} cuti${d.alpa ? `, ${d.alpa} alpa` : ''}`
      : (d.alpa ? `${d.alpa} alpa` : 'Tidak ada data');
    return `
      <div class="dash-trend-bar-wrap dash-trend-bar-wrap--narrow" data-tip="Tgl ${d.tgl}: ${tip}" style="min-width:24px">
        ${d.alpa ? `<div style="font-size:.6rem;font-weight:800;color:${_KPI_COLORS.red.text}">${d.alpa}</div>` : '<div style="font-size:.6rem">&nbsp;</div>'}
        <div class="dash-trend-bar-stack" style="height:${barH}px">${segs || `<div class="dash-trend-bar-seg" style="height:3px;background:#f1f5f9"></div>`}</div>
        <div class="dash-trend-lbl">${d.tgl}</div>
      </div>`;
  }).join('');

  const icon = `<svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 3v18h18"/><path d="m19 9-5 5-4-4-3 3"/></svg>`;
  return `<div class="dash-panel"${spanFull ? ' style="grid-column:1/-1"' : ''}>
    <div class="dash-panel-header">${icon} Tren Kehadiran Harian - ${ABS_BULAN_NAMA[bulan]} ${tahun}</div>
    <div class="dash-trend dash-trend-scroll"><div class="dash-trend-bars" style="min-width:${days.length * 30}px">${bars}</div></div>
    <div class="dash-heatmap-legend">
      <span><i style="background:${_KPI_COLORS.green.text}"></i>Tepat Waktu</span>
      <span><i style="background:${_KPI_COLORS.amber.text}"></i>Terlambat</span>
      <span><i style="background:${_KPI_COLORS.purple.text}"></i>Tidak Lengkap</span>
      <span><i style="background:${_KPI_COLORS.biruMuda.text}"></i>Tugas luar</span>
      <span><i style="background:${_KPI_COLORS.fuchsia.text}"></i>Cuti</span>
      <span><i style="background:${_KPI_COLORS.red.text}"></i>Alpa</span>
    </div>
  </div>`;
}

// Kalender heatmap kehadiran - admin/full: warna berdasar rate kehadiran tim per hari;
// non-admin: warna berdasar status pribadi hari itu.
function _absensiHeatmapPanel(harian, bulan, tahun, full, spanFull = true, liburSet = new Set(), liburMap = new Map(), ketMap = new Map()) {
  const daysInMonth = new Date(tahun, bulan, 0).getDate();
  const today = new Date();
  const todayKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  const pad2 = n => String(n).padStart(2, '0');

  // harian sudah teragregasi dari backend (GROUP BY per tanggal) - tinggal dipetakan
  const byDay = new Map();
  (harian || []).forEach(h => {
    const total = h.hadir + h.terlambat + (h.tidak_lengkap || 0) + h.tugas_luar + h.cuti + h.alpa;
    byDay.set(h.tanggal, { hadir: h.hadir, terlambat: h.terlambat, tidak_lengkap: h.tidak_lengkap || 0, tugas_luar: h.tugas_luar, cuti: h.cuti, alpa: h.alpa, total });
  });

  const firstDow = new Date(tahun, bulan - 1, 1).getDay(); // 0=Minggu
  const cells = [];
  for (let i = 0; i < firstDow; i++) cells.push(`<div class="dash-heatmap-cell is-empty"></div>`);

  for (let day = 1; day <= daysInMonth; day++) {
    const key = `${tahun}-${pad2(bulan)}-${pad2(day)}`;
    const dow = new Date(tahun, bulan - 1, day).getDay();
    const isWeekend = dow === 0 || dow === 6;
    const isLiburTanggal = liburSet.has(key); // hari libur nasional/lokal yg diatur admin, termasuk yg jatuh di hari kerja
    const isFuture = key > todayKey;
    const c = byDay.get(key);

    let label = String(day), tip = '';
    // Weekend/hari libur ditandai duluan, gak peduli udah lewat atau belum -
    // biar tanggal libur ke depan (mis. cuti bersama bulan depan) langsung
    // keliatan di kalender, gak nunggu tanggalnya lewat dulu.
    if (isWeekend || isLiburTanggal) {
      if (isWeekend && !isLiburTanggal) {
        cells.push(`<div class="dash-heatmap-cell is-libur" data-tip="Akhir Pekan">${label}</div>`);
        continue;
      }
      const namaLibur = liburMap.get(key) || 'hari libur';
      const liburTip = isWeekend ? `akhir pekan & ${namaLibur}` : namaLibur;
      cells.push(`<div class="dash-heatmap-cell is-libur" data-tip="Tgl ${day}: ${liburTip}">${label}</div>`);
      continue;
    }
    if (isFuture) {
      cells.push(`<div class="dash-heatmap-cell is-future">${label}</div>`);
      continue;
    }
    if (!c || !c.total) {
      cells.push(`<div class="dash-heatmap-cell" style="background:#f8fafc;color:#cbd5e1" data-tip="Tgl ${day}: tidak ada data">${label}</div>`);
      continue;
    }

    if (full) {
      const hadirEfektif = c.hadir + c.terlambat + c.tidak_lengkap + c.tugas_luar + c.cuti;
      const rate = c.total > 0 ? hadirEfektif / c.total : 0;
      const bg = rate >= 0.9 ? '#10b981' : rate >= 0.7 ? '#34d399' : rate >= 0.5 ? '#f59e0b' : '#dc2626';
      tip = `Tgl ${day}: ${hadirEfektif}/${c.total} hadir${c.alpa ? `, ${c.alpa} alpa` : ''}`;
      const ketTipFull = _absKetTipHari(ketMap.get(key), true);
      if (ketTipFull) tip += ` • ${ketTipFull}`;
      cells.push(`<div class="dash-heatmap-cell" style="background:${bg}" data-tip="${esc(tip)}">${label}</div>`);
    } else {
      const bg = c.alpa ? _KPI_COLORS.red.text : c.tidak_lengkap ? _KPI_COLORS.purple.text : c.terlambat ? _KPI_COLORS.amber.text : c.hadir ? _KPI_COLORS.green.text : c.tugas_luar ? _KPI_COLORS.biruMuda.text : c.cuti ? _KPI_COLORS.fuchsia.text : '#f1f5f9';
      const statusLbl = c.alpa ? 'Alpa' : c.tidak_lengkap ? 'Tidak Lengkap' : c.terlambat ? 'Terlambat' : c.hadir ? 'Tepat Waktu' : c.tugas_luar ? 'Tugas Luar' : c.cuti ? 'Cuti' : '-';
      const ketTip = (!c.alpa && !c.tidak_lengkap && !c.terlambat && !c.hadir && (c.tugas_luar || c.cuti)) ? _absKetTipHari(ketMap.get(key), false) : '';
      cells.push(`<div class="dash-heatmap-cell" style="background:${bg}" data-tip="${esc(`Tgl ${day}: ${statusLbl}${ketTip ? ' • ' + ketTip : ''}`)}">${label}</div>`);
    }
  }

  const icon = `<svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="18" x="3" y="4" rx="2"/><path d="M3 10h18"/><path d="M8 2v4"/><path d="M16 2v4"/></svg>`;
  const legend = full
    ? `<span><i style="background:#10b981"></i>≥90% hadir</span><span><i style="background:#34d399"></i>70–89%</span><span><i style="background:#f59e0b"></i>50–69%</span><span><i style="background:#dc2626"></i>&lt;50%</span><span><i style="background:#fee2e2;border:1px solid #fecaca"></i>Libur / tanpa data</span>`
    : `<span><i style="background:${_KPI_COLORS.green.text}"></i>Tepat Waktu</span><span><i style="background:${_KPI_COLORS.amber.text}"></i>Terlambat</span><span><i style="background:${_KPI_COLORS.purple.text}"></i>Tidak Lengkap</span><span><i style="background:${_KPI_COLORS.biruMuda.text}"></i>Tugas luar</span><span><i style="background:${_KPI_COLORS.fuchsia.text}"></i>Cuti</span><span><i style="background:${_KPI_COLORS.red.text}"></i>Alpa</span>`;

  return `<div class="dash-panel dash-panel--kalender"${spanFull ? ' style="grid-column:1/-1"' : ''}>
    <div class="dash-panel-header">${icon} Kalender Kehadiran - ${ABS_BULAN_NAMA[bulan]} ${tahun}</div>
    <div class="dash-heatmap">
      <div class="dash-heatmap-dow"><span>Min</span><span>Sen</span><span>Sel</span><span>Rab</span><span>Kam</span><span>Jum</span><span>Sab</span></div>
      <div class="dash-heatmap-grid">${cells.join('')}</div>
    </div>
    <div class="dash-heatmap-legend">${legend}</div>
  </div>`;
}

// Sub Kegiatan tidak punya kolom jenis_* sendiri: ditandai lewat jenis_custom yang memuat 'subkeg'
// (jenis_custom bisa datang sebagai array atau string JSON).
function _kinIsSubkeg(x) {
  let jc = x && x.jenis_custom;
  if (typeof jc === 'string') { try { jc = JSON.parse(jc); } catch { jc = []; } }
  return Array.isArray(jc) && jc.includes('subkeg');
}

// Dashboard modul Kinerja: TANPA scope=semua, jadi backend membatasi non-admin ke indikator yang
// di-assign / unit pantau miliknya (admin & kinerja.full tetap lihat semua). Dashboard utama yang pakai scope=semua.
// Jenis indikator yang boleh tampil di dashboard Kinerja = jenis yang menunya tampil di sidebar
// (admin kinerja: semua; lainnya: punya indikator jenis itu DAN (permission kinerja.<jenis> ATAU akun pantau)).
function _kinJenisDashAkses() {
  if (_isKinerjaAdmin()) return ['monev', 'ikk', 'spm', 'subkeg'];
  const pantau = _isPantauKinerja();
  const out = [];
  if (_hasMonevIndikator   && (hasAccess('kinerja.monev')  || pantau)) out.push('monev');
  if (_hasIkkIndikator     && (hasAccess('kinerja.ikk')    || pantau)) out.push('ikk');
  if (_hasSpmIndikator     && (hasAccess('kinerja.spm')    || pantau)) out.push('spm');
  if (_hasSubkegIndikator  && (hasAccess('kinerja.subkeg') || pantau)) out.push('subkeg');
  return out;
}

async function _fetchKinerjaRekapForDash(bulanOpt, tahunOpt) {
  try {
    const pa    = getPeriodeAktif();
    const bulan = bulanOpt || pa?.bulan || _dTwSekarang();
    const tahun = tahunOpt || pa?.tahun || new Date().getFullYear();
    const jenisList = _kinJenisDashAkses();
    if (!jenisList.length) return [];
    const results = await Promise.all(jenisList.map(j =>
      fetch(`/api/kinerja/rekap?bulan=${bulan}&tahun=${tahun}&jenis=${j}`, { headers: authHeaders() })
        .then(r => r.ok ? r.json() : { rekap: [] })
        .catch(() => ({ rekap: [] }))
    ));
    // Endpoint rekap gak ngirim kolom jenis_custom, jadi _kinIsSubkeg() gak bisa mendeteksi
    // Sub Kegiatan dari datanya. Karena tiap jenis difetch terpisah, kita tandai sendiri di sini:
    // baris yg datang dari respons jenis=subkeg diberi jenis_custom ['subkeg'].
    const merged = new Map();
    const subkegIds = new Set();
    results.forEach((d, i) => (d.rekap || []).forEach(row => {
      if (!row || row.id == null) return;
      if (jenisList[i] === 'subkeg') subkegIds.add(row.id);
      merged.set(row.id, row);
    }));
    return [...merged.values()].map(row => subkegIds.has(row.id) ? { ...row, jenis_custom: ['subkeg'] } : row);
  } catch { return []; }
}

async function loadDashboardKinerja() {
  const wrap = document.getElementById('dashKinerjaStats');
  if (!wrap) return;
  _dmStyle();
  wrap.innerHTML = `
    <div class="skeleton" style="height:96px;border-radius:16px;margin-bottom:13px"></div>
    <div class="dash-kpi-row">${Array(5).fill(0).map(() => `<div class="skeleton" style="height:98px;border-radius:14px"></div>`).join('')}</div>
    <div class="skeleton" style="height:200px;border-radius:16px"></div>`;

  // Periode sebelumnya (2 triwulan ke belakang) buat angka tren di hero. Opsional: kalau gagal/kosong, tren disembunyikan.
  const _paDash = getPeriodeAktif();
  const _bDash = _paDash?.bulan || _dTwSekarang(), _tDash = _paDash?.tahun || new Date().getFullYear();
  const _prevPer = [2, 1].map(k => { let bb = _bDash - 3 * k, tt = _tDash; while (bb <= 0) { bb += 12; tt--; } return { bulan: bb, tahun: tt }; });
  const [ks, rekapRaw, , ...prevRaw] = await Promise.all([_fetchKinerjaStats(), _fetchKinerjaRekapForDash(), _kinLoadJenisWarna(), ..._prevPer.map(pp => _fetchKinerjaRekapForDash(pp.bulan, pp.tahun))]);

  if (!_isKinerjaAdmin() && typeof _ensureUserIndikatorIds === 'function') await _ensureUserIndikatorIds();
  // Akun pantau: backend sudah membatasi ke indikator assign + unit pantaunya, jadi jangan difilter lagi ke
  // indikator assign saja (bikin dashboard kosong). User biasa: hanya indikator yang di-assign ke dirinya
  // (IKU dikirim penuh oleh backend untuk non-pantau, sama seperti halaman IKU).
  const _filtRekap = (arr) => (_isKinerjaAdmin() || _isPantauKinerja())
    ? arr
    : arr.filter(x => _userIndikatorIds && _userIndikatorIds.has(Number(x.id)));
  const rekap = _filtRekap(rekapRaw);
  const _avgCap = (arr) => {
    const w = arr.filter(x => x.capaian_persen != null && !isNaN(Number(x.capaian_persen)));
    return w.length ? w.reduce((a, x) => a + Math.min(Number(x.capaian_persen), 100), 0) / w.length : null;
  };
  const prevAvgs = prevRaw.map(a => _avgCap(_filtRekap(a)));

  const icon = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="currentColor" style="flex-shrink:0;opacity:.85"><path d="M3 12C3 12.5523 3.44772 13 4 13H10C10.5523 13 11 12.5523 11 12V4C11 3.44772 10.5523 3 10 3H4C3.44772 3 3 3.44772 3 4V12ZM3 20C3 20.5523 3.44772 21 4 21H10C10.5523 21 11 20.5523 11 20V16C11 15.4477 10.5523 15 10 15H4C3.44772 15 3 15.4477 3 16V20ZM13 20C13 20.5523 13.4477 21 14 21H20C20.5523 21 21 20.5523 21 20V12C21 11.4477 20.5523 11 20 11H14C13.4477 11 13 11.4477 13 12V20ZM14 3C13.4477 3 13 3.44772 13 4V8C13 8.55228 13.4477 9 14 9H20C20.5523 9 21 8.55228 21 8V4C21 3.44772 20.5523 3 20 3H14Z"/></svg>`;
  let html = _dashModuleHeader(icon, 'Dashboard', 'Ringkasan capaian indikator kinerja periode berjalan');

  const pa = getPeriodeAktif();
  const bulanP = pa?.bulan || _dTwSekarang(), tahunP = pa?.tahun || new Date().getFullYear();
  const labelTw = `Triwulan ${_DTW_ROM[Math.ceil(bulanP / 3)]} ${tahunP}`;

  // Admin kinerja: angka dari /kinerja/stats (semua indikator). Non-admin: dihitung dari rekap yang sudah
  // dibatasi ke jenis yang boleh diakses, supaya KPI & daftar belum diisi tidak memuat indikator jenis lain
  // (stats backend menghitung semua indikator assign tanpa melihat permission per jenis).
  const _adm = _isKinerjaAdmin();
  const _idsRekap = new Set(rekap.map(x => Number(x.id)));
  const _sudahRekap = rekap.filter(x => x.realisasi != null).length;
  const total = _adm ? (ks?.total_indikator ?? rekap.length) : rekap.length;
  const sudah = _adm ? (ks?.sudah_diisi ?? _sudahRekap) : _sudahRekap;
  const belum = _adm ? (ks?.belum_diisi ?? Math.max(0, total - sudah)) : Math.max(0, total - sudah);
  const pct   = _dmPct(sudah, total);

  const withCap = rekap.filter(x => x.capaian_persen != null && !isNaN(Number(x.capaian_persen)));
  const cap = (x) => Number(x.capaian_persen);
  const tercapai = withCap.filter(x => cap(x) >= 100).length;
  const mendekati = withCap.filter(x => cap(x) >= 75 && cap(x) < 100).length;
  const perluTindakan = withCap.filter(x => cap(x) < 75).length;
  const onTrack = tercapai + mendekati;
  const rata = withCap.length ? withCap.reduce((a, x) => a + Math.min(cap(x), 100), 0) / withCap.length : null;

  const tiers = [
    { label: 'Sangat Tinggi (≥91)', color: '#16a34a', n: withCap.filter(x => cap(x) >= 91).length },
    { label: 'Tinggi (76–90)', color: '#4ade80', n: withCap.filter(x => cap(x) >= 76 && cap(x) < 91).length },
    { label: 'Sedang (66–75)', color: '#eab308', n: withCap.filter(x => cap(x) >= 66 && cap(x) < 76).length },
    { label: 'Rendah (51–65)', color: '#f97316', n: withCap.filter(x => cap(x) >= 51 && cap(x) < 66).length },
    { label: 'Sangat Rendah (≤50)', color: '#ef4444', n: withCap.filter(x => cap(x) < 51).length },
  ];

  const jenisMap = { IKU: 0, IKK: 0, SPM: 0, 'Sub Kegiatan': 0 };
  rekap.forEach(x => { if (x.jenis_monev === true) jenisMap.IKU++; if (x.jenis_ikk === true) jenisMap.IKK++; if (x.jenis_spm === true) jenisMap.SPM++; if (_kinIsSubkeg(x)) jenisMap['Sub Kegiatan']++; });
  const jenisColors = Object.fromEntries(Object.keys(_KIN_JENIS_KODE).map(j => [j, _kinJenisWarna(j).teks]));

  // Per jenis: satu indikator dihitung di tiap jenis yang dimilikinya (IKU/IKK/SPM/Sub Kegiatan).
  const grp = new Map();
  rekap.forEach(x => {
    const jenisX = [x.jenis_monev === true && 'IKU', x.jenis_ikk === true && 'IKK', x.jenis_spm === true && 'SPM', _kinIsSubkeg(x) && 'Sub Kegiatan'].filter(Boolean);
    (jenisX.length ? jenisX : ['Tanpa jenis']).forEach(k => {
      const e = grp.get(k) || { nama: k, total: 0, terisi: 0, sumCap: 0, nCap: 0 };
      e.total++;
      if (x.realisasi != null) e.terisi++;
      if (x.capaian_persen != null && !isNaN(cap(x))) { e.sumCap += Math.min(cap(x), 100); e.nCap++; }
      grp.set(k, e);
    });
  });
  const grpList = [...grp.values()];

  const tone = total === 0 ? 'abu' : belum > 0 ? (pct < 50 ? 'bad' : 'warn') : (perluTindakan > 0 ? 'warn' : 'ok');
  html += _dmHero({
    tone,
    title: total === 0 ? 'Belum ada indikator yang ditugaskan' : belum > 0 ? `${belum} indikator belum diisi (${labelTw})` : `Semua indikator ${labelTw} sudah diisi`,
    text: [
      `<b>${sudah}</b> dari <b>${total}</b> indikator sudah terisi (<b>${pct}%</b>).`,
      withCap.length ? `Rata-rata capaian <b>${Math.round(rata)}%</b>, <b>${onTrack}</b> indikator on track.` : '',
    ],
    ring: { pct: pct, label: 'terisi' },
    seg: [
      { label: 'Tercapai', val: tercapai, color: _DM_PAL.ok },
      { label: 'Mendekati', val: mendekati, color: _DM_PAL.warn },
      { label: 'Perlu tindakan', val: perluTindakan, color: _DM_PAL.bad },
      { label: 'Belum diisi', val: belum, color: '#94a3b8' },
    ],
    trend: (() => {
      const pr = prevAvgs[prevAvgs.length - 1];
      const twPrev = `TW ${_DTW_ROM[Math.ceil(_prevPer[_prevPer.length - 1].bulan / 3)]}`;
      return {
        label: 'Rata-rata capaian',
        val: rata == null ? '-' : `${Math.round(rata)}%`,
        d: rata != null && pr != null ? Math.round(rata) - Math.round(pr) : null,
        unit: 'poin', vs: `dari ${twPrev}`,
        vals: [...prevAvgs, rata],
        note: rata == null ? 'Belum ada capaian' : '',
      };
    })(),
    reload: 'loadDashboardKinerja()',
  });

  html += `<div class="dm-kpis">
    ${_dmKpi({ label: 'Total Indikator', val: _dmNf(total), sub: labelTw, color: _DM_PAL.teal, icon: 'target' })}
    ${_dmKpi({ label: 'Sudah Diisi', val: _dmNf(sudah), sub: `${pct}% dari total`, color: _DM_PAL.info, icon: 'check' })}
    ${_dmKpi({ label: 'Belum Diisi', val: _dmNf(belum), sub: belum ? 'Perlu segera dilengkapi' : 'Sudah lengkap', color: belum ? _DM_PAL.bad : _DM_PAL.ok, icon: 'warn' })}
    ${_dmKpi({ label: 'Rata-rata Capaian', val: rata == null ? '-' : `${Math.round(rata)}%`, sub: rata == null ? 'Belum ada capaian' : _kwCapaianLabel(rata), color: rata == null ? '#94a3b8' : _kwCapaianColor(rata), icon: 'trend' })}
    ${_dmKpi({ label: 'On Track (≥75%)', val: _dmNf(onTrack), sub: withCap.length ? `dari ${withCap.length} terisi` : null, color: _DM_PAL.ok, icon: 'check' })}
    ${_dmKpi({ label: 'Perlu Tindakan', val: _dmNf(perluTindakan), sub: 'Capaian di bawah 75%', color: perluTindakan ? _DM_PAL.warn : _DM_PAL.ok, icon: 'warn' })}
  </div>`;

  html += _dmCols([
    _dmCard('Progres pengisian', labelTw, `<div style="margin-block:auto"><div class="dm-big"><b style="color:${pct >= 100 ? _DM_PAL.ok : _DM_PAL.warn}">${pct}%</b><span>${sudah} dari ${total} indikator</span></div>
      <div class="dm-hb-track" style="height:10px"><i style="width:${pct}%;background:${pct >= 100 ? _DM_PAL.ok : _DM_PAL.warn}"></i></div></div>`),
    _dmCard('Skala nilai capaian', 'Lampiran Permendagri No. 86 Tahun 2017', withCap.length ? _dmDonut(tiers.map(t => ({ label: t.label, value: t.n, color: t.color })), withCap.length, 'terisi', true) : _dmEmpty('Belum ada capaian terisi')),
  ]).replace('class="dm-cols','class="dm-cols eq',1);

  html += _dmCols([
    _dmCard('Sebaran jenis indikator', 'Satu indikator bisa masuk lebih dari satu jenis', _dmHbAuto(Object.entries(jenisMap).filter(([, c]) => c > 0).map(([j, c]) => ({ label: j, value: c, color: jenisColors[j] })), 'Belum ada data')),
    _dmCard('Capaian menurut jenis', 'Rata-rata capaian dan pengisian', _dmHb(grpList.sort((a, b) => b.total - a.total).map(g => {
      const r = g.nCap ? Math.round(g.sumCap / g.nCap) : null;
      const warnaBar = _KIN_JENIS_KODE[g.nama] ? _kinJenisWarna(g.nama).teks : (r == null ? '#cbd5e1' : _kwCapaianColor(r));
      return { label: g.nama, value: r || 0, max: 100, color: warnaBar, right: r == null ? 'Belum ada' : `<b style="color:${_kwCapaianColor(r)}">${r}%</b>`, sub: `${g.terisi}/${g.total} indikator terisi` };
    }), 'Belum ada data')),
  ]);

  const sorted = [...withCap].sort((a, b) => cap(b) - cap(a));
  const rowCap = (x) => ({ label: x.indikator_kinerja, value: Math.round(Math.min(cap(x), 100)), max: 100, color: _kwCapaianColor(cap(x)), right: `<b style="color:${_kwCapaianColor(cap(x))}">${Math.round(cap(x))}%</b>` });
  const belumList = _adm ? (ks?.belum_isi_list ?? []) : (ks?.belum_isi_list ?? []).filter(i => _idsRekap.has(Number(i.id)));
  html += _dmCols([
    _dmCard('Capaian tertinggi', 'Urut dari capaian tertinggi', _dmHb(sorted.map(rowCap), 'Belum ada capaian terisi')),
    _dmCard('Capaian terendah', 'Urut dari capaian terendah', _dmHb([...sorted].reverse().map(rowCap), 'Belum ada capaian terisi')),
  ]);
  if (belumList.length) html += `<div class="dash-panels">${_kinerjaAlertPanel(belumList, belum)}</div>`;

  const ins = [];
  if (belum > 0) ins.push(_dmIns(pct < 50 ? 'bad' : 'warn', `<b>${belum}</b> indikator belum diisi untuk ${labelTw}.`));
  if (perluTindakan > 0) ins.push(_dmIns('warn', `<b>${perluTindakan}</b> indikator capaiannya di bawah 75%.`));
  if (sorted.length && cap(sorted[sorted.length - 1]) < 51) ins.push(_dmIns('bad', `Capaian terendah: <b>${esc(sorted[sorted.length - 1].indikator_kinerja)}</b> (${Math.round(cap(sorted[sorted.length - 1]))}%).`));
  if (tercapai > 0) ins.push(_dmIns('ok', `<b>${tercapai}</b> indikator sudah mencapai atau melampaui target.`));
  if (!ins.length) ins.push(_dmIns('info', 'Belum ada catatan khusus untuk periode ini.'));
  html += `<div class="dm-card" style="margin-bottom:var(--sp-4)"><div class="dm-card-h"><div class="dm-card-hl">${_dmCardIcon('Catatan')}<div class="dm-card-t">Catatan</div></div></div>${ins.join('')}</div>`;

  _dmMount(wrap, html);
  if (belumList.length) _kbRenderPagination();
}
async function _fetchStats() {
  try { const r = await fetch('/api/stats', { headers: authHeaders() }); return r.ok ? r.json() : null; } catch { return null; }
}
async function _fetchSuratStats() {
  try {
    const [rm, rk] = await Promise.all([
      fetch('/api/surat-masuk/stats', { headers: authHeaders() }),
      fetch('/api/surat-keluar/stats', { headers: authHeaders() }),
    ]);
    const masuk  = rm.ok  ? await rm.json()  : {};
    const keluar = rk.ok  ? await rk.json()  : {};
    return {
      total_masuk:  masuk.total          ?? '-',
      belum_proses: masuk.belum_selesai  ?? '-',
      total_keluar: keluar.total         ?? '-',
      recent_masuk:  [],
      recent_keluar: [],
    };
  } catch { return null; }
}

async function _fetchSuratDashData() {
  try {
    const [rm, rk, rrm, rrk, rov] = await Promise.all([
      fetch('/api/surat-masuk/stats',                       { headers: authHeaders() }),
      fetch('/api/surat-keluar/stats',                      { headers: authHeaders() }),
      fetch('/api/surat-masuk?page=1&limit=25&q=&sort=terbaru',  { headers: authHeaders() }),
      fetch('/api/surat-keluar?page=1&limit=25&q=&sort=terbaru', { headers: authHeaders() }),
      fetch('/api/surat-masuk?page=1&limit=50&selesai=false&q=', { headers: authHeaders() }),
    ]);
    const masuk  = rm.ok  ? await rm.json()  : {};
    const keluar = rk.ok  ? await rk.json()  : {};
    const rmList = rrm.ok ? (await rrm.json()).surat || [] : [];
    const rkList = rrk.ok ? (await rrk.json()).surat || [] : [];
    const belumList = rov.ok ? (await rov.json()).surat || [] : [];

    const today = new Date().toISOString().slice(0, 10);
    const overdue_list = belumList
      .filter(s => s.batas_waktu && s.batas_waktu.slice(0, 10) < today)
      .sort((a, b) => a.batas_waktu.localeCompare(b.batas_waktu));

    return {
      total_masuk:       masuk.total          ?? '-',
      belum_proses:      masuk.belum_selesai  ?? '-',
      terlambat:         masuk.terlambat      ?? 0,
      masuk_bulan_ini:   masuk.bulan_ini      ?? 0,
      total_keluar:      keluar.total         ?? '-',
      keluar_bulan_ini:  keluar.bulan_ini     ?? 0,
      keluar_tahun_ini:  keluar.tahun_ini     ?? 0,
      tren_masuk:    masuk.tren_masuk    || [],
      tren_keluar:   keluar.tren_keluar  || [],
      top_asal:      masuk.top_asal      || [],
      top_tujuan:    keluar.top_tujuan   || [],
      sisa_waktu:    masuk.sisa_waktu    || null,
      beban_pegawai: masuk.beban_pegawai || [],
      overdue_list,
      recent_masuk: rmList.map(s => ({
        perihal: s.perihal,
        nomor:   s.no_surat,
        tanggal: s.tanggal_terima,
        status:  !s.selesai && s.batas_waktu && s.batas_waktu.slice(0, 10) < today
          ? 'Terlambat'
          : (s.selesai ? 'Selesai' : 'Proses'),
      })),
      recent_keluar: rkList.map(s => ({
        perihal: s.perihal,
        nomor:   s.no_surat,
        tanggal: s.tanggal_surat,
      })),
    };
  } catch { return null; }
}
async function _fetchKinerjaStats() {
  try {
    const pa    = getPeriodeAktif();
    const bulan = pa?.bulan || _dTwSekarang();
    const tahun = pa?.tahun || new Date().getFullYear();
    const r = await fetch(`/api/kinerja/stats?bulan=${bulan}&tahun=${tahun}`, { headers: authHeaders() });
    return r.ok ? r.json() : null;
  } catch { return null; }
}

const _IKU_CHART_FS  = 1.55;  
const _KW_CHART_FS   = 1.0;   
let   _activeChartFs = 1.0;   

let _ikuGridData  = [];
let _ikuChartType = localStorage.getItem('iku_chart_type') || 'line';

function _ikuSetChartType(type) {
  _ikuChartType = type;
  try { localStorage.setItem('iku_chart_type', type); } catch {}
  _ikuRenderChartSection();
}
window._ikuSetChartType = _ikuSetChartType;

let _ikuLastBulan = null, _ikuLastTahun = null, _ikuLastPa = null;

let _ikuTahunList    = [];
let _ikuFilterMode   = 'bulan';   
let _ikuRangeFrom    = null;      
let _ikuRangeTo      = null;
let _ikuTahunDari    = null;
let _ikuTahunSampai  = null;

function _ikuSetFilterMode(mode) {
  _ikuFilterMode = mode;
  if (mode === 'tahun') {
    _ikuTahunDari   = _ikuTahunDari   || _ikuTahunList[0] || new Date().getFullYear();
    _ikuTahunSampai = _ikuTahunSampai || _ikuTahunList[_ikuTahunList.length-1] || _ikuTahunDari;
    _ikuRangeFrom = { bulan:3,  tahun:_ikuTahunDari,   key:`${_ikuTahunDari}-03` };
    _ikuRangeTo   = { bulan:12, tahun:_ikuTahunSampai,  key:`${_ikuTahunSampai}-12` };
  }
  _ikuApplyFilter();
  _ikuSyncToPantau();
}
function _ikuSetRangeFrom(key) {
  const [y, m] = key.split('-').map(Number);
  _ikuRangeFrom = { bulan:m, tahun:y, key };
  if (_ikuRangeTo && y*100+m > _ikuRangeTo.tahun*100+_ikuRangeTo.bulan) _ikuRangeTo = { ..._ikuRangeFrom };
  _ikuApplyFilter();
  _ikuSyncToPantau();
}
function _ikuSetRangeTo(key) {
  const [y, m] = key.split('-').map(Number);
  _ikuRangeTo = { bulan:m, tahun:y, key };
  if (_ikuRangeFrom && y*100+m < _ikuRangeFrom.tahun*100+_ikuRangeFrom.bulan) _ikuRangeFrom = { ..._ikuRangeTo };
  _ikuApplyFilter();
  _ikuSyncToPantau();
}
function _ikuSetTahunDari(val) {
  _ikuTahunDari = Number(val);
  if (!_ikuTahunSampai || _ikuTahunSampai < _ikuTahunDari) _ikuTahunSampai = _ikuTahunDari;
  _ikuRangeFrom = { bulan:3,  tahun:_ikuTahunDari,   key:`${_ikuTahunDari}-03` };
  _ikuRangeTo   = { bulan:12, tahun:_ikuTahunSampai,  key:`${_ikuTahunSampai}-12` };
  _ikuApplyFilter();
  _ikuSyncToPantau();
}
function _ikuSetTahunSampai(val) {
  _ikuTahunSampai = Number(val);
  if (!_ikuTahunDari || _ikuTahunDari > _ikuTahunSampai) _ikuTahunDari = _ikuTahunSampai;
  _ikuRangeFrom = { bulan:3,  tahun:_ikuTahunDari,   key:`${_ikuTahunDari}-03` };
  _ikuRangeTo   = { bulan:12, tahun:_ikuTahunSampai,  key:`${_ikuTahunSampai}-12` };
  _ikuApplyFilter();
  _ikuSyncToPantau();
}

function _ikuSyncToPantau() {
  if (typeof _kwRangeFrom === 'undefined') return; 
  _kwRangeFrom    = _ikuRangeFrom    ? { ..._ikuRangeFrom }    : null;
  _kwRangeTo      = _ikuRangeTo      ? { ..._ikuRangeTo }      : null;
  _kwFilterMode   = _ikuFilterMode;
  _kwModePerTahun = (_ikuFilterMode === 'tahun');
  if (_ikuFilterMode === 'tahun') {
    _kwTahunDari   = _ikuTahunDari;
    _kwTahunSampai = _ikuTahunSampai;
  }
  if (typeof _kwSaveFilter === 'function') _kwSaveFilter();
  if (typeof _renderKinerjaWatch === 'function') _renderKinerjaWatch();
}

window._ikuSetFilterMode  = _ikuSetFilterMode;
window._ikuSetRangeFrom   = _ikuSetRangeFrom;
window._ikuSetRangeTo     = _ikuSetRangeTo;
window._ikuSetTahunDari   = _ikuSetTahunDari;
window._ikuSetTahunSampai = _ikuSetTahunSampai;

async function _ikuApplyFilter() {
  const el = document.getElementById('ikuGridWidget');
  if (!el) return;
  
  const bulan = _ikuRangeTo?.bulan || (getPeriodeAktif()?.bulan || _dTwSekarang());
  const tahun = _ikuRangeTo?.tahun || (getPeriodeAktif()?.tahun || new Date().getFullYear());
  try {
    const r = await fetch(`/api/kinerja/rekap?bulan=${bulan}&tahun=${tahun}&scope=semua`, { headers: authHeaders() });
    const d = r.ok ? await r.json() : { rekap: [] };
    let rows = (d.rekap || []).filter(x => x.jenis_monev);
    _ikuGridData = rows;
  } catch { _ikuGridData = []; }

  
  if (typeof _kwFetchTahun === 'function') {
    const fromThn = _ikuRangeFrom?.tahun || tahun;
    const toThn   = _ikuRangeTo?.tahun   || tahun;
    const tahunRange = [];
    for (let t = fromThn; t <= toThn; t++) tahunRange.push(t);
    await Promise.all(tahunRange.map(t => _kwFetchTahun(t).catch(() => {})));
  }

  _renderIkuGrid(bulan, tahun, null);
}

async function _initIkuGrid() {
  const el = document.getElementById('ikuGridWidget');
  if (!el) return;

  const pa    = getPeriodeAktif();
  const bulan = pa?.bulan || _dTwSekarang();
  const tahun = pa?.tahun || new Date().getFullYear();

  
  
  
  
  el.innerHTML = `<div class="iku-grid-wrap"><div class="skeleton" style="height:280px;border-radius:14px"></div></div>`;

  
  
  const [rekapRes, periodeRes, tahunListRes] = await Promise.allSettled([
    fetch(`/api/kinerja/rekap?bulan=${bulan}&tahun=${tahun}&scope=semua`, { headers: authHeaders() }).then(r => r.ok ? r.json() : { rekap: [] }),
    _dashFetchOnce('/api/periode').then(r => r.ok ? r.json() : { periode: [] }),
    fetch('/api/kinerja/rekap/tahun-list', { headers: authHeaders() }).then(r => r.ok ? r.json() : { tahun: [] }),
  ]);

  const d = rekapRes.status === 'fulfilled' ? rekapRes.value : { rekap: [] };
  
  
  
  _ikuGridData = (d.rekap || []).filter(x => x.jenis_monev);

  
  const dP = periodeRes.status === 'fulfilled' ? periodeRes.value : { periode: [] };
  _ikuTahunList = [...new Set((dP.periode || []).map(p => p.tahun))].filter(Boolean).sort((a,b)=>a-b);

  
  if (typeof _kwAllRekap !== 'undefined') {
    Object.keys(_kwAllRekap).map(Number).filter(Boolean).forEach(t => {
      if (!_ikuTahunList.includes(t)) _ikuTahunList.push(t);
    });
  }
  
  const dK = tahunListRes.status === 'fulfilled' ? tahunListRes.value : { tahun: [] };
  (dK.tahun || []).forEach(t => { if (!_ikuTahunList.includes(t)) _ikuTahunList.push(t); });

  if (!_ikuTahunList.includes(tahun)) _ikuTahunList.push(tahun);
  _ikuTahunList.sort((a,b)=>a-b);

  
  if (_ikuRangeFrom === null) _ikuRangeFrom = { bulan:3,  tahun, key:`${tahun}-03` };
  if (_ikuRangeTo   === null) _ikuRangeTo   = { bulan:12, tahun, key:`${tahun}-12` };
  if (_ikuTahunDari   === null) _ikuTahunDari   = tahun;
  if (_ikuTahunSampai === null) _ikuTahunSampai = tahun;

  _renderIkuGrid(bulan, tahun, pa);
  
  if (typeof _ikuSyncToPantau === 'function') _ikuSyncToPantau();
}

function _renderIkuGrid(bulan, tahun, pa) {
  _ikuLastBulan = bulan; _ikuLastTahun = tahun; _ikuLastPa = pa;
  const el = document.getElementById('ikuGridWidget');
  if (!el) return;

  const BULAN_NAMA = _KW_BULAN_LABEL;
  const _BULAN_FULL_IKU = _KW_BULAN_FULL;
  const periodeLabel = (() => {
    if (_ikuFilterMode === 'tahun' && _ikuTahunDari && _ikuTahunSampai) {
      return _ikuTahunDari === _ikuTahunSampai ? `Tahun ${_ikuTahunDari}` : `${_ikuTahunDari} \u2013 ${_ikuTahunSampai}`;
    }
    if (_ikuRangeFrom && _ikuRangeTo) {
      if (_ikuRangeFrom.key === _ikuRangeTo.key)
        return `${_BULAN_FULL_IKU[_ikuRangeFrom.bulan]} ${_ikuRangeFrom.tahun}`;
      return `${_BULAN_FULL_IKU[_ikuRangeFrom.bulan]} ${_ikuRangeFrom.tahun} \u2013 ${_BULAN_FULL_IKU[_ikuRangeTo.bulan]} ${_ikuRangeTo.tahun}`;
    }
    return pa?.label || `${BULAN_NAMA[bulan] || bulan} ${tahun}`;
  })();

  
  const total   = _ikuGridData.length;
  const terisi  = _ikuGridData.filter(x => x.realisasi != null).length;
  const onTrack = _ikuGridData.filter(x => {
    if (x.capaian_persen == null) return false;
    return Number(x.capaian_persen) >= 75;
  }).length;

  const cardHtml = _ikuGridData.length === 0
    ? `<div style="grid-column:1/-1;text-align:center;padding:32px 16px;color:#94a3b8;font-size:.85rem">
        <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5" style="opacity:.4;display:block;margin:0 auto 8px"><path stroke-linecap="round" stroke-linejoin="round" d="M9 19v-6a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2zm0 0V9a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v10m-6 0a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2m0 0V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-2a2 2 0 0 1-2-2z"/></svg>
        Belum ada data IKU untuk periode ini
       </div>`
    : _ikuGridData.map(row => {
        const cap     = row.capaian_persen != null ? Number(row.capaian_persen) : null;
        const real    = row.realisasi     != null ? row.realisasi : null;
        const hasData = real != null;

        
        const col   = _kwCapaianColor(cap);
        const colBg = _kwCapaianBg(cap);
        const _svgCheck   = `<svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-1px;margin-right:3px"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>`;
        const _svgWarn    = `<svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-1px;margin-right:3px"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3"/><line x1="12" x2="12" y1="9" y2="13"/><line x1="12" x2="12.01" y1="17" y2="17"/></svg>`;
        const _svgX       = `<svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-1px;margin-right:3px"><circle cx="12" cy="12" r="10"/><line x1="15" x2="9" y1="9" y2="15"/><line x1="9" x2="15" y1="9" y2="15"/></svg>`;
        const _svgMinus   = `<svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-1px;margin-right:3px"><line x1="5" x2="19" y1="12" y2="12"/></svg>`;
        const label = cap === null ? `${_svgMinus}Belum diisi` : cap >= 91 ? `${_svgCheck}Sangat Tinggi` : cap >= 76 ? `${_svgCheck}Tinggi` : cap >= 66 ? `${_svgWarn}Sedang` : cap >= 51 ? `${_svgWarn}Rendah` : `${_svgX}Sangat Rendah`;
        const pct   = cap !== null ? Math.min(cap, 100) : 0;

        
        const tgtNum = row.target_tahun != null ? Number(row.target_tahun) : null;
        const tgtDisp = row.target_display != null ? row.target_display
          : (tgtNum !== null ? (Number.isInteger(tgtNum) ? tgtNum : tgtNum.toFixed(2)) : '-');

        
        const polarBadge = row.bermakna_negatif
          ? `<span data-tip="Bermakna Negatif" style="display:inline-flex;align-items:center;justify-content:center;width:14px;height:14px;background:#fee2e2;border-radius:50%;flex-shrink:0"><svg xmlns="http://www.w3.org/2000/svg" width="8" height="8" fill="none" viewBox="0 0 24 24" stroke="#991b1b" stroke-width="2.8"><path stroke-linecap="round" stroke-linejoin="round" d="M19 14l-7 7m0 0l-7-7m7 7V3"/></svg></span>`
          : `<span data-tip="Bermakna Positif" style="display:inline-flex;align-items:center;justify-content:center;width:14px;height:14px;background:#d1fae5;border-radius:50%;flex-shrink:0"><svg xmlns="http://www.w3.org/2000/svg" width="8" height="8" fill="none" viewBox="0 0 24 24" stroke="#065f46" stroke-width="2.8"><path stroke-linecap="round" stroke-linejoin="round" d="M5 10l7-7m0 0l7 7m-7-7v18"/></svg></span>`;

        const realDisp = hasData ? _kwFmtReal(real, row.realisasi_display, false) : '-';

        return `
          <div class="iku-card" style="--iku-col:${col};--iku-col-bg:${colBg}">
            <div class="iku-card-top">
              <div class="iku-card-name">${esc(row.indikator_kinerja)}${polarBadge}</div>
              <div class="iku-card-cap" style="color:${col}">${cap !== null ? cap.toFixed(1)+'%' : '-'}</div>
            </div>
            <div style="margin:7px 0 4px">
              <div style="height:5px;border-radius:99px;background:#f1f5f9;overflow:hidden">
                <div style="height:100%;border-radius:99px;background:${col};width:${pct}%;transition:width .5s ease"></div>
              </div>
            </div>
            <div class="iku-card-meta">
              <span style="color:${col};font-weight:600;font-size:.7rem">${label}</span>
              <span style="color:#94a3b8;font-size:.7rem">Real: <b style="color:#334155">${realDisp}</b> / Tgt: <b style="color:#334155">${tgtDisp}</b> ${row.satuan ? `<span style="opacity:.6">${esc(row.satuan)}</span>` : ''}</span>
            </div>
          </div>`;
      }).join('');

  // Summary strip
  const summaryHtml = total > 0 ? `
    <div class="iku-summary-strip">
      <div class="iku-sum-item">
        <span class="iku-sum-val">${total}</span>
        <span class="iku-sum-lbl">Total IKU</span>
      </div>
      <div style="width:1px;height:28px;background:#e2e8f0;flex-shrink:0"></div>
      <div class="iku-sum-item">
        <span class="iku-sum-val" style="color:${terisi > 0 ? '#0d9488' : '#94a3b8'}">${terisi}</span>
        <span class="iku-sum-lbl">Sudah Diisi</span>
      </div>
      <div style="width:1px;height:28px;background:#e2e8f0;flex-shrink:0"></div>
      <div class="iku-sum-item">
        <span class="iku-sum-val" style="color:${total - terisi > 0 ? '#ef4444' : '#10b981'}">${total - terisi}</span>
        <span class="iku-sum-lbl">Belum Diisi</span>
      </div>
      <div style="width:1px;height:28px;background:#e2e8f0;flex-shrink:0"></div>
      <div class="iku-sum-item">
        <span class="iku-sum-val" style="color:${onTrack > 0 ? '#10b981' : '#94a3b8'}">${onTrack}</span>
        <span class="iku-sum-lbl">On Track (≥75%)</span>
      </div>
    </div>` : '';

  // ── Filter bar IKU - persis seperti Pantau Indikator ──────────────────────
  const _ikuTahunUnik = (_ikuTahunList.length ? _ikuTahunList : [tahun]);
  const _ikuFromKey   = _ikuRangeFrom?.key || `${tahun}-03`;
  const _ikuToKey     = _ikuRangeTo?.key   || `${tahun}-12`;

  
  const _ikuAllPairs = [];
  for (const thn of _ikuTahunUnik) {
    for (const b of _DTW_BULAN) {
      _ikuAllPairs.push({ bulan:b, tahun:thn, key:`${thn}-${String(b).padStart(2,'0')}` });
    }
  }
  const _ikuAvailKeys = new Set(_ikuAllPairs.map(p => p.key));
  const _ikuToKeys    = new Set(_ikuAllPairs.filter(p => {
    const [fy, fm] = _ikuFromKey.split('-').map(Number);
    return p.tahun*100+p.bulan >= fy*100+fm;
  }).map(p => p.key));

  const _ikuThnDari   = _ikuTahunDari   || _ikuTahunUnik[0];
  const _ikuThnSampai = _ikuTahunSampai || _ikuTahunUnik[_ikuTahunUnik.length-1];
  const _dariItems    = _ikuTahunUnik.map(t => ({ val:t, label:String(t) }));
  const _sampaiItems  = _ikuTahunUnik.filter(t => t >= _ikuThnDari).map(t => ({ val:t, label:String(t) }));

  const filterBarHtml = `
    <div class="kw-filter-row" style="margin-bottom:10px">
        <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="opacity:.4;flex-shrink:0"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/></svg>
        <span style="font-size:0.72rem;font-weight:700;color:#64748b;white-space:nowrap">Filter Periode:</span>
        <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap">

        <div class="kw-cdd" id="ikuFilterModeDd" style="min-width:90px" onclick="event.stopPropagation();_kwCddToggle('ikuFilterModeDd')">
          <span class="kw-cdd-label">${_ikuFilterMode === 'tahun' ? 'Tahun' : 'Triwulan'}</span>
          <svg class="kw-cdd-caret" width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7"/></svg>
          <div class="kw-cdd-panel" id="ikuFilterModeDd_panel">
            <div class="kw-cdd-opt${_ikuFilterMode === 'tahun' ? ' active' : ''}" onclick="event.stopPropagation();_kwCddToggle('ikuFilterModeDd');_ikuSetFilterMode('tahun')">Tahun</div>
            <div class="kw-cdd-opt${_ikuFilterMode === 'bulan' ? ' active' : ''}" onclick="event.stopPropagation();_kwCddToggle('ikuFilterModeDd');_ikuSetFilterMode('bulan')">Triwulan</div>
          </div>
        </div>

        <div style="width:1px;height:16px;background:#e2e8f0;flex-shrink:0"></div>

        ${_ikuFilterMode === 'tahun' ? `
          <span style="font-size:0.72rem;font-weight:600;color:#94a3b8;white-space:nowrap">Dari</span>
          ${_kwCdd('ikuTahunDariDd', _dariItems, _ikuThnDari, '_ikuSetTahunDari', { minW: '90px' })}
          <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="#cbd5e1" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6"/></svg>
          <span style="font-size:0.72rem;font-weight:600;color:#94a3b8;white-space:nowrap">Sampai</span>
          ${_kwCdd('ikuTahunSampaiDd', _sampaiItems, _ikuThnSampai, '_ikuSetTahunSampai', { minW: '90px' })}
        ` : `
          <span style="font-size:0.72rem;font-weight:600;color:#94a3b8;white-space:nowrap">Dari</span>
          ${_kwMonthPicker('ikuMpFrom', _ikuTahunUnik, _ikuFromKey, '_ikuSetRangeFrom', _ikuAvailKeys)}
          <span style="font-size:0.72rem;font-weight:600;color:#94a3b8;white-space:nowrap">Sampai</span>
          ${_kwMonthPicker('ikuMpTo', _ikuTahunUnik, _ikuToKey, '_ikuSetRangeTo', _ikuToKeys)}
        `}
        </div>
    </div>`;

  el.innerHTML = `
    <div class="iku-grid-wrap">
      <div class="iku-grid-header">
        <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
        <span class="iku-grid-title">IKU - Indikator Kinerja Utama</span>
        <span class="iku-grid-periode">${esc(periodeLabel)}</span>
      </div>
      ${_kwSkalaLegendHtml()}
      ${filterBarHtml}
      <div id="ikuChartSection" style="margin-top:14px"></div>
    </div>`;

  
  _ikuRenderChartSection();
}

function _ikuRenderChartSection() {
  const sec = document.getElementById('ikuChartSection');
  if (!sec) return;

  if (!_ikuGridData.length) { sec.innerHTML = ''; return; }

  // Prioritaskan tahun dari filter IKU, fallback ke _ikuLastTahun
  const tahun      = _ikuRangeTo?.tahun || _ikuLastTahun || getPeriodeAktif()?.tahun || new Date().getFullYear();
  const rekapTahun = (typeof _kwAllRekap !== 'undefined' && _kwAllRekap[tahun]) ? _kwAllRekap[tahun] : null;

  
  const _ikuYearMode    = _ikuFilterMode === 'tahun';
  const _ikuYrFrom      = _ikuYearMode ? (_ikuTahunDari   || tahun) : tahun;
  const _ikuYrTo        = _ikuYearMode ? (_ikuTahunSampai || tahun) : tahun;
  const _ikuYearsNeeded = [];
  for (let y = _ikuYrFrom; y <= _ikuYrTo; y++) _ikuYearsNeeded.push(y);
  const _ikuMissingYears = (typeof _kwAllRekap !== 'undefined')
    ? _ikuYearsNeeded.filter(y => !_kwAllRekap[y])
    : _ikuYearsNeeded;

  
  if ((!rekapTahun || _ikuMissingYears.length) && typeof _kwFetchTahun === 'function') {
    const _fetchAll = async () => {
      const _yearsToFetch = [...new Set([tahun, ..._ikuMissingYears])];
      await Promise.all(_yearsToFetch.map(y => _kwFetchTahun(y).catch(() => {})));
      
      if (!_kwAllIndikator.length) {
        try {
          const rInd = await _dashFetchOnce('/api/kinerja/indikator');
          if (rInd.ok) {
            const dInd = await rInd.json();
            _kwAllIndikator = (dInd.indikator || [])
              .filter(r => r.aktif !== false)
              .map(r => ({
                id:                r.id,
                indikator_kinerja: r.indikator_kinerja,
                satuan:            r.satuan,
                target_tahun:      r.target_tahun,
                target_display:    r.target_display,
                penanggung_jawab:  r.penanggung_jawab,
                group_nama:        r.group_nama,
                bermakna_negatif:  r.bermakna_negatif,
                tipe_nilai:        r.tipe_nilai,
              }));
          }
        } catch {}
      }
      _ikuRenderChartSection();
    };
    _fetchAll();
    sec.innerHTML = `<div class="iku-chart-section" style="padding:20px;text-align:center;color:#94a3b8;font-size:.84rem">
      <span class="btn-spin" style="width:14px;height:14px;color:#0d9488;vertical-align:-2px;margin-right:6px"></span>
      Memuat data triwulan...
    </div>`;
    return;
  }

  
  if (!_kwAllIndikator.length && typeof authHeaders === 'function') {
    (async () => {
      try {
        const rInd = await _dashFetchOnce('/api/kinerja/indikator');
        if (rInd.ok) {
          const dInd = await rInd.json();
          _kwAllIndikator = (dInd.indikator || [])
            .filter(r => r.aktif !== false)
            .map(r => ({
              id:                r.id,
              indikator_kinerja: r.indikator_kinerja,
              satuan:            r.satuan,
              target_tahun:      r.target_tahun,
              target_display:    r.target_display,
              penanggung_jawab:  r.penanggung_jawab,
              group_nama:        r.group_nama,
              bermakna_negatif:  r.bermakna_negatif,
              tipe_nilai:        r.tipe_nilai,
            }));
        }
      } catch {}
      _ikuRenderChartSection();
    })();
    return; 
  }

  const BULAN_SHORT = _KW_BULAN_LABEL;

  
  function _buildChartData(indId, targetTahun, bermaknaNeg) {
    return Array.from({length: 4}, (_, i) => {
      const b   = (i + 1) * 3;
      const rec = rekapTahun ? (rekapTahun['b' + b] || []).find(r => r.id === indId) : null;
      const real = rec && rec.realisasi !== null && rec.realisasi !== '' ? parseFloat(rec.realisasi) : null;
      // Pakai capaian_persen yang udah dihitung backend (SQL CASE per tipe_perhitungan:
      // kumulatif = akumulasi Jan..bulan ini, rata_rata = rata-rata Jan..bulan ini,
      // non_kumulatif = apa adanya bulan itu). Jangan hitung ulang dari realisasi
      // mentah / target di sini - itu yang bikin kumulatif keitung non-kumulatif.
      const cap  = (rec && rec.capaian_persen != null) ? Number(rec.capaian_persen) : null;
      // isInRange: dalam rentang filter Dari–Sampai (jika ada)
      // Bulan masa depan tanpa data otomatis abu karena capaian === null
      const fromKey = _ikuRangeFrom ? _ikuRangeFrom.tahun * 100 + _ikuRangeFrom.bulan : 0;
      const toKey   = _ikuRangeTo   ? _ikuRangeTo.tahun   * 100 + _ikuRangeTo.bulan   : 999999;
      const inFilter = (tahun * 100 + b) >= fromKey && (tahun * 100 + b) <= toKey;
      return { bulan: b, tahun, label: BULAN_SHORT[b], realisasi: real, realisasi_display: rec?.realisasi_display ?? null, capaian: cap, isInRange: inFilter };
    });
  }

  // Helper: build chart data PER TAHUN (untuk mode filter "Tahun")
  // 1 entri per tahun dalam rentang Dari–Sampai, ambil realisasi bulan terakhir yang terisi
  function _buildYearlyChartData(indId, targetTahun, bermaknaNeg) {
    return _ikuYearsNeeded.map(thn => {
      const rekapThn = (typeof _kwAllRekap !== 'undefined' && _kwAllRekap[thn]) ? _kwAllRekap[thn] : null;
      let latestRec = null;
      for (let b = 12; b >= 1; b--) {
        const rec = rekapThn ? (rekapThn['b' + b] || []).find(r => r.id === indId) : null;
        if (rec && rec.realisasi !== null && rec.realisasi !== undefined && rec.realisasi !== '') {
          latestRec = rec;
          break;
        }
      }
      const real = latestRec ? parseFloat(latestRec.realisasi) : null;
      // Sama kayak di atas - pakai capaian_persen dari backend (udah kumulatif/
      // rata-rata sesuai tipe_perhitungan-nya), bukan recompute real/target polos.
      const cap  = (latestRec && latestRec.capaian_persen != null) ? Number(latestRec.capaian_persen) : null;
      return { bulan: thn, tahun: thn, label: String(thn), realisasi: real, realisasi_display: latestRec?.realisasi_display ?? null, capaian: cap, isInRange: true };
    });
  }

  // Chart type dropdown - 1 dropdown berlaku untuk semua 4 chart
  // Radar tersedia kalau setidaknya ada 1 indikator dengan >= 3 data dalam range
  const _ikuRadarAvail = _ikuGridData.some(row => {
    if (_ikuYearMode) {
      const d = _buildYearlyChartData(row.id, row.target_tahun ?? null, row.bermakna_negatif ?? false);
      return d.length >= 3;
    }
    const fromB = _ikuRangeFrom?.tahun === tahun ? _ikuRangeFrom.bulan : 1;
    const toB   = _ikuRangeTo?.tahun   === tahun ? _ikuRangeTo.bulan   : 12;
    const d = _buildChartData(row.id, row.target_tahun ?? null, row.bermakna_negatif ?? false);
    return d.filter(x => x.bulan >= fromB && x.bulan <= toB && x.isInRange).length >= 3;
  });
  if (!_ikuRadarAvail && _ikuChartType === 'radar') {
    _ikuChartType = 'bar';
    try { localStorage.setItem('iku_chart_type', 'bar'); } catch {}
  }
  const ikuChartItems = [
    { val: 'line',   label: 'Line'   },
    { val: 'bar',    label: 'Bar'    },
    { val: 'area',   label: 'Area'   },
    { val: 'bullet', label: 'Bullet' },
    ...(_ikuRadarAvail ? [{ val: 'radar', label: 'Radar' }] : []),
  ];
  const switcherHtml = _kwCdd('ikuChartTypeDd', ikuChartItems, _ikuChartType, '_ikuSetChartType', { minW: '100px' });

  
  const prevKwChartType = (typeof _kwChartType !== 'undefined') ? _kwChartType : 'bar';
  if (typeof _kwChartType !== 'undefined') _kwChartType = _ikuChartType;
  const prevChartFs = _activeChartFs;
  _activeChartFs = _IKU_CHART_FS;

  const chartPanels = _ikuGridData.map(row => {
    const meta = (typeof _kwAllIndikator !== 'undefined' && _kwAllIndikator.length)
      ? _kwAllIndikator.find(x => x.id === row.id) : null;
    const indNama    = meta?.indikator_kinerja || row.indikator_kinerja || '-';
    const targetThn  = meta?.target_tahun      ?? row.target_tahun ?? null;
    const targetDisp = meta?.target_display     ?? row.target_display ?? (targetThn !== null ? parseFloat(targetThn) : null);
    const satuan     = meta?.satuan             || row.satuan || '';
    const berneg     = meta?.bermakna_negatif   ?? row.bermakna_negatif ?? false;
    const isPredikatMini = (meta?.tipe_nilai ?? row.tipe_nilai) === 'predikat';
    const tipePerh    = meta?.tipe_perhitungan ?? row.tipe_perhitungan;
    const tgt        = targetThn !== null ? parseFloat(targetThn) : null;

    
    const dataFull = _ikuYearMode
      ? _buildYearlyChartData(row.id, targetThn, berneg)
      : _buildChartData(row.id, targetThn, berneg);
    const fromB = _ikuRangeFrom?.tahun === tahun ? _ikuRangeFrom.bulan : 1;
    const toB   = _ikuRangeTo?.tahun   === tahun ? _ikuRangeTo.bulan   : 12;
    const data  = _ikuYearMode ? dataFull : dataFull.filter(d => d.bulan >= fromB && d.bulan <= toB);
    const bulanList = data.map(d => d.bulan);
    const hasData   = data.filter(d => d.realisasi !== null);
    const latest    = hasData.length ? hasData[hasData.length - 1] : null;
    const capLast   = latest?.capaian ?? null;
    const realLast  = latest?.realisasi ?? null;
    const totalSlots = _ikuYearMode ? data.length : 4;
    const col = _kwCapaianColor(capLast);
    const _svgCheckL  = `<svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-1px;margin-right:3px"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>`;
    const _svgWarnL   = `<svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-1px;margin-right:3px"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3"/><line x1="12" x2="12" y1="9" y2="13"/><line x1="12" x2="12.01" y1="17" y2="17"/></svg>`;
    const _svgXL      = `<svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-1px;margin-right:3px"><circle cx="12" cy="12" r="10"/><line x1="15" x2="9" y1="9" y2="15"/><line x1="9" x2="15" y1="9" y2="15"/></svg>`;
    const _svgMinusL  = `<svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-1px;margin-right:3px"><line x1="5" x2="19" y1="12" y2="12"/></svg>`;
    const capLbl = capLast === null ? `${_svgMinusL}Belum diisi` : capLast >= 91 ? `${_svgCheckL}Sangat Tinggi` : capLast >= 76 ? `${_svgCheckL}Tinggi` : capLast >= 66 ? `${_svgWarnL}Sedang` : capLast >= 51 ? `${_svgWarnL}Rendah` : `${_svgXL}Sangat Rendah`;

    const chartSvg = (typeof _kwComboChart === 'function')
      ? _kwComboChart(data, bulanList, tgt, targetDisp, satuan, isPredikatMini)
      : '';

    return `
      <div class="iku-mini-chart-panel">
        <!-- Panel header -->
        <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:8px;margin-bottom:8px">
          <div style="min-width:0;flex:1">
            <div style="font-size:.72rem;font-weight:700;color:#0f172a;line-height:1.35;overflow:hidden;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical">${esc(indNama)}${_polarIcon(berneg, 13)}</div>
            <div style="display:flex;align-items:center;gap:6px;margin-top:3px;flex-wrap:wrap">
              ${satuan ? `<span class="kw-ind-selector-tag" data-tip="Satuan pengukuran indikator">${esc(satuan)}</span>` : ''}
              ${typeof _tipeBadge === 'function' ? _tipeBadge(tipePerh) : ''}
            </div>
          </div>
          <div style="text-align:right;flex-shrink:0">
            <div style="font-size:1.1rem;font-weight:800;color:${col};line-height:1">${capLast !== null ? capLast.toFixed(1)+'%' : '-'}</div>
            <div style="font-size:.6rem;font-weight:600;color:${col}">${capLbl}</div>
          </div>
        </div>
        <!-- KPI mini row -->
        <div style="display:flex;gap:6px;margin-bottom:8px">
          <div style="flex:1;padding:4px 8px;background:${col}0f;border-radius:6px;border-left:2px solid ${col}">
            <div style="font-size:.58rem;color:#94a3b8;font-weight:700;text-transform:uppercase">Realisasi</div>
            <div style="font-size:.88rem;font-weight:800;color:#0f172a">${_kwFmtReal(realLast, latest?.realisasi_display, isPredikatMini)}</div>
          </div>
          <div style="flex:1;padding:4px 8px;background:#f0f9ff;border-radius:6px;border-left:2px solid #3b82f6">
            <div style="font-size:.58rem;color:#94a3b8;font-weight:700;text-transform:uppercase">Target</div>
            <div style="font-size:.88rem;font-weight:800;color:#3b82f6">${targetDisp !== null ? targetDisp : '-'}</div>
          </div>
          <div style="flex:1;padding:4px 8px;background:#faf5ff;border-radius:6px;border-left:2px solid #8b5cf6">
            <div style="font-size:.58rem;color:#94a3b8;font-weight:700;text-transform:uppercase">Diisi</div>
            <div style="font-size:.88rem;font-weight:800;color:#8b5cf6">${hasData.length}<span style="font-size:.7rem;color:#94a3b8">/${totalSlots}</span></div>
          </div>
        </div>
        <!-- Chart -->
        <div class="iku-mini-chart-svg" style="overflow-x:auto">
          ${chartSvg || '<div style="height:120px;display:flex;align-items:center;justify-content:center;color:#94a3b8;font-size:.78rem">Belum ada data</div>'}
        </div>
      </div>`;
  }).join('');

  if (typeof _kwChartType !== 'undefined') _kwChartType = prevKwChartType;
  _activeChartFs = prevChartFs;

  sec.innerHTML = `
    <div class="iku-chart-section">
      <!-- Top bar: judul + dropdown -->
      <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:12px">
        <div style="display:flex;align-items:center;gap:7px">
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="#0d9488" stroke-width="2"><polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/></svg>
          <span style="font-size:.78rem;font-weight:700;color:#0f172a">${_ikuYearMode ? `Tren Per Tahun - ${_ikuYrFrom === _ikuYrTo ? _ikuYrFrom : `${_ikuYrFrom}\u2013${_ikuYrTo}`}` : `Tren Per Triwulan - ${tahun}`}</span>
        </div>
        <div style="display:flex;align-items:center;gap:6px">
          <span style="font-size:.63rem;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:.06em">Tipe Chart</span>
          ${switcherHtml}
        </div>
      </div>
      <!-- 4 chart panels -->
      <div class="iku-charts-grid">
        ${chartPanels}
      </div>
    </div>`;
}

const _MOD_COLORS = {
  teal:   { bg: '#ccfbf1', text: '#0f766e', accent: '#0d9488', dots: ['#0d9488', '#2dd4bf', '#5eead4', '#99f6e4', '#94a3b8'] },
  blue:   { bg: '#dbeafe', text: '#1d4ed8', accent: '#3b82f6', dots: ['#3b82f6', '#60a5fa', '#93c5fd', '#bfdbfe', '#94a3b8'] },
  purple: { bg: '#ede9fe', text: '#6d28d9', accent: '#8b5cf6', dots: ['#8b5cf6', '#a78bfa', '#c4b5fd', '#ddd6fe', '#94a3b8'] },
  amber:  { bg: '#fef3c7', text: '#b45309', accent: '#f59e0b', dots: ['#f59e0b', '#fbbf24', '#fcd34d', '#fde68a', '#94a3b8'] },
};

const _DONUT_MAX_SEG = 3;


// ── Panel helpers ─────────────────────────────────────────────────────────────

function _recentSuratPanel(list, jenis) {
  const title = jenis === 'masuk' ? 'Surat Masuk Terbaru' : 'Surat Keluar Terbaru';
  const icon  = jenis === 'masuk'
    ? `<svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21.2 8.4c.5.38.8.97.8 1.6v10a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V10a2 2 0 0 1 .8-1.6l8-6a2 2 0 0 1 2.4 0l8 6Z"/><path d="m22 10-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 10"/></svg>`
    : `<svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3.714 3.048a.498.498 0 0 0-.683.627l2.843 7.627a2 2 0 0 1 0 1.396l-2.842 7.627a.498.498 0 0 0 .682.627l18-8.5a.5.5 0 0 0 0-.904z"/><path d="M6 12h16"/></svg>`;
  const rows = list.map(s => `
    <tr><td>
      <div style="font-weight:500;font-size:.78rem">${esc(s.perihal||s.judul||'-')}</div>
      <div style="font-size:.7rem;opacity:.55">${esc(s.nomor||'')}${s.nomor?' · ':''}${fmtDate(s.tanggal||s.tgl_surat)}</div>
    </td><td style="text-align:right">${s.status?`<span class="badge ${_suratBadge(s.status)}">${esc(s.status)}</span>`:''}</td></tr>`).join('');
  return `<div class="dash-panel">
    <div class="dash-panel-header">${icon} ${title}</div>
    <table class="dash-panel-table"><tbody>${rows}</tbody></table>
  </div>`;
}

function _suratBadge(s) {
  s = (s||'').toLowerCase();
  return s.includes('terlambat') ? 'badge-merah'
    : s.includes('proses')||s.includes('pending') ? 'badge-warning'
    : s.includes('selesai')||s.includes('done') ? 'badge-success' : 'badge-blue';
}

let _kbList = [];
let _kbPage = 1;
const _KB_PAGE_SIZE = 5;

// Warna jenis indikator mengikuti menu Kinerja: sumbernya tabel kinerja_jenis (warna_bg / warna_teks) lewat
// /api/kinerja/jenis-kinerja, sama dengan _renderJenisBadges di kinerja.js. Fallback = nilai bawaan tabel itu.
const _KIN_JENIS_KODE = { IKU: 'iku', IKK: 'ikk', SPM: 'spm', 'Sub Kegiatan': 'subkeg' };
const _KIN_JENIS_DEFAULT = {
  iku:    { bg: '#dbeafe', teks: '#1e40af' },
  ikk:    { bg: '#d1fae5', teks: '#065f46' },
  spm:    { bg: '#fef3c7', teks: '#b45309' },
  subkeg: { bg: '#ede9fe', teks: '#6d28d9' },
};
let _kinJenisWarnaCache = null; // { kode: { bg, teks } }
async function _kinLoadJenisWarna() {
  if (_kinJenisWarnaCache) return _kinJenisWarnaCache;
  const peta = { ..._KIN_JENIS_DEFAULT };
  try {
    const r = await fetch('/api/kinerja/jenis-kinerja', { headers: authHeaders() });
    if (r.ok) {
      const d = await r.json();
      (d.jenis || []).forEach(j => { if (j && j.kode && j.warna_bg && j.warna_teks) peta[j.kode] = { bg: j.warna_bg, teks: j.warna_teks }; });
      _kinJenisWarnaCache = peta;
    }
  } catch (err) { console.error('[_kinLoadJenisWarna]', err); }
  return peta;
}
function _kinJenisWarna(label) {
  const peta = _kinJenisWarnaCache || _KIN_JENIS_DEFAULT;
  return peta[_KIN_JENIS_KODE[label]] || _KIN_JENIS_DEFAULT[_KIN_JENIS_KODE[label]] || { bg: '#e2e8f0', teks: '#334155' };
}
function _kbJenisBadge(label) {
  const c = _kinJenisWarna(label);
  return `<span style="display:inline-flex;align-items:center;font-size:.7rem;font-weight:700;color:${c.teks};background:${c.bg};padding:2px 7px;border-radius:5px;margin-right:3px">${label}</span>`;
}
function _kbJenisBadges(i) {
  const badges = [];
  if (i.jenis_monev) badges.push(_kbJenisBadge('IKU'));
  if (i.jenis_ikk)   badges.push(_kbJenisBadge('IKK'));
  if (i.jenis_spm)   badges.push(_kbJenisBadge('SPM'));
  if (_kinIsSubkeg(i)) badges.push(_kbJenisBadge('Sub Kegiatan'));
  return badges.join(' ');
}

function _kbBuildRows(pageItems) {
  return pageItems.map(i => `
    <tr><td>
      <div style="display:flex;align-items:center;gap:4px;font-weight:500;font-size:.78rem">${esc(i.nama||i.indikator||'-')}${_polarIcon(i.bermakna_negatif, 13)}</div>
      <div style="display:flex;flex-wrap:wrap;align-items:center;gap:5px;margin-top:5px">
        ${_kbJenisBadges(i)}
        ${i.bidang?`<span style="font-size:.7rem;opacity:.55">${esc(i.bidang)}</span>`:''}
      </div>
    </td><td style="text-align:right;vertical-align:top;padding-top:12px"><span class="badge badge-warning">Belum diisi</span></td></tr>`).join('');
}

// Render ulang pagination pakai komponen baku situs (renderPagination → .pagination/.page-btn)
function _kbRenderPagination() {
  if (document.getElementById('kbAlertPagination')) {
    renderPagination('kbAlertPagination', _kbList.length, _kbPage, _KB_PAGE_SIZE, '_kbSetPage');
  }
}

function _kbSetPage(p) {
  const totalPages = Math.max(1, Math.ceil(_kbList.length / _KB_PAGE_SIZE));
  _kbPage = Math.min(Math.max(1, p), totalPages);
  const start = (_kbPage - 1) * _KB_PAGE_SIZE;
  const body = document.getElementById('kbAlertBody');
  if (body) body.innerHTML = _kbBuildRows(_kbList.slice(start, start + _KB_PAGE_SIZE));
  _kbRenderPagination();
}
window._kbSetPage = _kbSetPage;

function _kinerjaAlertPanel(list, totalBelum = null) {
  _kbList = list;
  _kbPage = 1;
  const total = totalBelum ?? list.length;
  const rows = _kbBuildRows(list.slice(0, _KB_PAGE_SIZE));
  return `<div class="dash-panel">
    <div class="dash-panel-header">
      <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3"/><line x1="12" x2="12" y1="9" y2="13"/><line x1="12" x2="12.01" y1="17" y2="17"/></svg>
      <span style="flex:1">Indikator Belum Diisi</span>
      <span class="badge badge-warning">${total}</span>
    </div>
    <table class="dash-panel-table"><tbody id="kbAlertBody">${rows}</tbody></table>
    <div id="kbAlertPagination" style="padding:8px 12px 12px"></div>
  </div>`;
}

const _KPI_COLORS = {
  teal:   { bg: '#ccfbf1', text: '#0f766e' },
  blue:   { bg: '#dbeafe', text: '#1d4ed8' },
  purple: { bg: '#ede9fe', text: '#6d28d9' },
  amber:  { bg: '#fef3c7', text: '#d97706' },
  red:    { bg: '#fee2e2', text: '#b91c1c' },
  green:  { bg: '#d1fae5', text: '#10b981' },
  
  
  tealMuda: { bg: '#ccfbf1', text: '#2dd4bf' },
  biruMuda: { bg: '#e0f2fe', text: '#38bdf8' },
  
  
  
  slate: { bg: '#e2e8f0', text: '#334155' },
  fuchsia: { bg: '#fae8ff', text: '#a21caf' },
};

function _kpiCard({ icon, label, value, sub = null, subUp = null, color = 'teal' }) {
  const c = _KPI_COLORS[color] || _KPI_COLORS.teal;
  const subCls  = subUp === true ? 'up' : subUp === false ? 'down' : '';
  const subHtml = sub ? `<div class="dash-kpi-sub ${subCls}">${esc(sub)}</div>` : '';
  return `
    <div class="dash-kpi-card${color === 'red' ? ' dash-kpi-card--alert' : ''}" style="border-left-color:${c.text}">
      <div class="dash-kpi-body">
        <div class="dash-kpi-lbl">${esc(label)}</div>
        <div class="dash-kpi-val" style="color:${c.text}">${esc(String(value))}</div>
        ${subHtml}
      </div>
      <div class="dash-kpi-icon" style="color:${c.text}">${icon}</div>
    </div>`;
}

// Panel daftar dengan bar proporsional - dipakai utk top list, distribusi, perbandingan
function _barListPanel({ icon, title, rows, emptyText = 'Belum ada data', badge = null, panelClass = '', badgeClass = 'badge-abu' }) {
  if (!rows || !rows.length) {
    return `<div class="dash-panel${panelClass ? ` ${panelClass}` : ''}">
      <div class="dash-panel-header">${icon} <span style="flex:1">${esc(title)}</span>${badge ? `<span class="badge ${badgeClass}">${esc(badge)}</span>` : ''}</div>
      <div class="dash-panel-empty">${esc(emptyText)}</div>
    </div>`;
  }
  const max  = Math.max(1, ...rows.map(r => Number(r.value) || 0));
  const body = rows.map(r => {
    const val = Number(r.value) || 0;
    const pct = Math.max(2, Math.round((val / max) * 100));
    const col = r.color || '#0d9488';
    return `
      <div class="dash-barlist-row">
        <div class="dash-barlist-top">
          <span style="font-size:.82rem;font-weight:600;color:#0f172a;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:68%;display:inline-flex;align-items:center;gap:6px">${r.icon ? `<span style="display:inline-flex;flex-shrink:0;color:${col}">${r.icon}</span>` : ''}${esc(r.label)}</span>
          <span style="font-size:.8rem;font-weight:700;color:${col};white-space:nowrap">${esc(String(r.value))}${r.suffix || ''}</span>
        </div>
        ${r.sublabel ? `<div style="font-size:.7rem;color:var(--teks-muted);margin-bottom:2px">${esc(r.sublabel)}</div>` : ''}
        <div class="dash-barlist-track"><div class="dash-barlist-fill" style="width:${pct}%;background:${col}"></div></div>
      </div>`;
  }).join('');
  return `<div class="dash-panel${panelClass ? ` ${panelClass}` : ''}">
    <div class="dash-panel-header">${icon} <span style="flex:1">${esc(title)}</span>${badge ? `<span class="badge badge-abu">${esc(badge)}</span>` : ''}</div>
    <div class="dash-barlist">${body}</div>
  </div>`;
}

// Panel donut mini dengan legenda - dipakai utk status/proporsi (aktif/nonaktif, selesai/proses, dst)
function _miniDonutPanel({ icon, title, segments, centerVal, centerLbl }) {
  const total = segments.reduce((a, s) => a + (Number(s.value) || 0), 0);
  const cx = 40, cy = 40, R = 30, strokeW = 10;
  function _arc(cx, cy, r, startDeg, endDeg) {
    const toRad = d => (d - 90) * Math.PI / 180;
    const x1 = cx + r * Math.cos(toRad(startDeg)), y1 = cy + r * Math.sin(toRad(startDeg));
    const x2 = cx + r * Math.cos(toRad(endDeg)),   y2 = cy + r * Math.sin(toRad(endDeg));
    const large = (endDeg - startDeg) > 180 ? 1 : 0;
    return `M ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2}`;
  }
  let cursor = 0;
  const paths = total > 0 ? segments.map(s => {
    const val = Number(s.value) || 0;
    if (!val) return '';
    const deg = (val / total) * 360;
    const safeDeg = deg >= 359.9 ? 359.9 : deg;
    const path = _arc(cx, cy, R, cursor, cursor + safeDeg);
    cursor += deg;
    return `<path d="${path}" fill="none" stroke="${s.color}" stroke-width="${strokeW}"/>`;
  }).join('') : '';
  const legend = segments.map(s => `
    <div style="display:flex;align-items:center;gap:8px">
      <span style="width:8px;height:8px;border-radius:50%;background:${s.color};flex-shrink:0"></span>
      <span style="font-size:.78rem;color:#334155;flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(s.label)}</span>
      <span style="font-size:.8rem;font-weight:700;color:#0f172a">${esc(String(s.value))}</span>
    </div>`).join('');
  return `<div class="dash-panel">
    <div class="dash-panel-header">${icon} ${esc(title)}</div>
    <div class="dash-panel--split">
      <div class="dash-mod-donut" style="flex-shrink:0">
        <svg viewBox="0 0 80 80" xmlns="http://www.w3.org/2000/svg">
          <circle cx="40" cy="40" r="30" fill="none" stroke="#f1f5f9" stroke-width="10"/>
          ${paths}
          <text x="40" y="37" text-anchor="middle" dominant-baseline="middle" font-size="13" font-weight="800" fill="#0f172a" font-family="inherit">${esc(String(centerVal))}</text>
          <text x="40" y="50" text-anchor="middle" dominant-baseline="middle" font-size="6" fill="#94a3b8" font-family="inherit">${esc((centerLbl || '').toUpperCase().slice(0, 10))}</text>
        </svg>
      </div>
      <div style="flex:1;min-width:0;display:flex;flex-direction:column;gap:8px">${legend}</div>
    </div>
  </div>`;
}

// ═══════════════════════════════════════════════════════════════════════════
// WIDGET: PANTAU INDIKATOR KINERJA (per bulan/TW/semester/tahun)
// ═══════════════════════════════════════════════════════════════════════════

// Label bulan untuk widget pantau
const _KW_BULAN_LABEL = ['', ...Array.from({length: 12}, (_, i) => `TW ${_DTW_ROM[Math.ceil((i + 1) / 3)]}`)];
const _KW_BULAN_FULL  = ['', ...Array.from({length: 12}, (_, i) => `Triwulan ${_DTW_ROM[Math.ceil((i + 1) / 3)]}`)];

let _kwAllIndikator  = [];
let _kwAllRekap      = {};   
let _kwWatchedId     = null;
let _kwViewMode      = 'bulan';   
let _kwChartType    = 'line';  
let _kwBulanPilih    = _dTwSekarang();   
let _kwTWPilih       = 1;   
let _kwSemPilih      = 1;   
let _kwTahunPilih    = new Date().getFullYear();
let _kwTahunList     = [];  

let _kwRangeFrom     = null;
let _kwRangeTo       = null;
let _kwModePerTahun  = false;
let _kwFilterMode    = 'bulan'; 
let _kwTahunDari     = null;   
let _kwTahunSampai   = null;   

function _kwGetPeriodeAdaData(indId) {
  const hasil = [];
  const tahunList = Object.keys(_kwAllRekap).map(Number).sort((a,b) => a-b);
  for (const thn of tahunList) {
    for (const b of _DTW_BULAN) {
      const rec = (_kwAllRekap[thn]?.['b' + b] || []).find(r => r.id === indId);
      const _hasNonEmpty = v => v !== null && v !== undefined && v !== '';
      if (rec && (
        _hasNonEmpty(rec.realisasi) ||
        _hasNonEmpty(rec.f_penghambat) ||
        _hasNonEmpty(rec.solusi) ||
        _hasNonEmpty(rec.f_pendukung) ||
        _hasNonEmpty(rec.rencana_tl)
      )) {
        hasil.push({ bulan: b, tahun: thn, key: `${thn}-${String(b).padStart(2,'0')}` });
      }
    }
  }
  return hasil;
}

// ── Helper: label periode bulan-tahun ─────────────────────────────────────
function _kwPeriodePillLabel(p) {
  return `${_KW_BULAN_FULL[p.bulan]} ${p.tahun}`;
}

// ── Helper: bulanList cross-tahun dari range ───────────────────────────────
// Mengembalikan array [{bulan, tahun}]
function _kwGetRangePairs(from, to) {
  if (!from || !to) return [];
  const pairs = [];
  let thn = from.tahun, bln = from.bulan;
  const toKey = to.tahun * 100 + to.bulan;
  while (thn * 100 + bln <= toKey) {
    if (_DTW_BULAN.includes(bln)) pairs.push({ bulan: bln, tahun: thn });
    bln++;
    if (bln > 12) { bln = 1; thn++; }
    if (thn > to.tahun + 1) break; // safety
  }
  return pairs;
}

// ── Helper hitung capaian sesuai jenis indikator ────────────────────────
// Predikat SAKIP - sinkron dengan PREDIKAT_LEVELS di kinerja.js. Dipakai untuk
// indikator bertipe_nilai 'predikat' (realisasi/target berupa huruf, bukan angka
// bebas) supaya dashboard bisa: (1) rekonstruksi target numerik dari target_display
// kalau target_tahun kosong/NaN (data lama), dan (2) tampilkan realisasi sebagai
// huruf, bukan angka tier mentah.
const _KW_PREDIKAT_LEVELS = [
  { label: 'D',  tier: 1 },
  { label: 'C',  tier: 2 },
  { label: 'CC', tier: 3 },
  { label: 'B',  tier: 4 },
  { label: 'BB', tier: 5 },
  { label: 'A',  tier: 6 },
  { label: 'AA', tier: 7 },
];
const _KW_PREDIKAT_TIER_BY_LABEL = Object.fromEntries(_KW_PREDIKAT_LEVELS.map(p => [p.label, p.tier]));
function _kwPredikatLabelForTier(tier) {
  const t = Math.round(Number(tier));
  const found = _KW_PREDIKAT_LEVELS.find(p => p.tier === t);
  return found ? found.label : null;
}
// Format nilai realisasi untuk ditampilkan - SELALU utamakan realisasi_display
// (string persis seperti yang diketik user di IKU/IKK/SPM: "8.3" tetap "8.3",
// "95.50" tetap "95.50"), bukan angka numerik yang diformat ulang (yang bisa
// menghilangkan atau menambah angka nol di belakang koma). Fallback ke angka
// mentah (tanpa paksa 2 desimal) hanya untuk data lama yang belum punya
// realisasi_display tersimpan.
function _kwFmtReal(v, disp, isPredikat) {
  if (v === null || v === undefined || v === '') return '-';
  if (isPredikat) return _kwPredikatLabelForTier(v) ?? '-';
  if (disp !== null && disp !== undefined && String(disp).trim() !== '') return String(disp).trim();
  const n = parseFloat(v);
  return isNaN(n) ? '-' : String(n);
}
// Target numerik efektif untuk indikator - sama seperti _targetNumForRow di
// kinerja.js: kalau target_tahun (kolom numerik) kosong/NaN dan indikatornya
// predikat, coba rekonstruksi tier dari label huruf (target_display).
// Target numerik/display efektif untuk 1 indikator PADA TAHUN TERTENTU.
// _kwAllIndikator (dari /api/kinerja/indikator) TIDAK di-JOIN ke kinerja_target,
// jadi ind.target_tahun/target_display di sana tidak year-aware (bisa null/stale).
// Sumber yang benar adalah _kwAllRekap[tahun], yang berasal dari /api/kinerja/rekap
// dan sudah di-JOIN ke kinerja_target untuk tahun yang diminta.
function _kwTargetFromRekap(indId, tahun) {
  const rekapTahun = (typeof _kwAllRekap !== 'undefined') ? _kwAllRekap[tahun] : null;
  if (!rekapTahun) return null;
  for (let b = 1; b <= 12; b++) {
    const row = (rekapTahun['b' + b] || []).find(r => r.id === indId);
    if (row && (row.target_tahun != null || row.target_display != null)) {
      return { target_tahun: row.target_tahun, target_display: row.target_display };
    }
  }
  return null;
}

function _kwTargetNumForInd(ind) {
  let t = parseFloat(ind?.target_tahun);
  if (isNaN(t) && ind?.tipe_nilai === 'predikat' && ind?.target_display) {
    const tier = _KW_PREDIKAT_TIER_BY_LABEL[String(ind.target_display).trim().toUpperCase()];
    if (tier != null) t = tier;
  }
  return t;
}

// ── Skala Nilai Peringkat Kinerja (Lampiran Permendagri No. 86 Tahun 2017) ──
// Skala resmi yang sama dipakai di badge capaian tabel IKU/IKK/SPM (kinerja.js,
// class .capaian-badge.st/.ti/.sd/.rd/.sr). Dipakai di sini juga (widget Pantau
// Indikator & IKU dashboard) supaya warna & label capaian konsisten di semua modul,
// bukan cuma ambang 100%/75% biner spt sebelumnya.
//   91–100  Sangat Tinggi | 76–90  Tinggi | 66–75  Sedang | 51–65  Rendah | ≤50 Sangat Rendah
function _kwCapaianColor(cap) {
  if (cap === null || cap === undefined || isNaN(cap)) return '#94a3b8';
  const c = Number(cap);
  if (c >= 91) return '#16a34a';
  if (c >= 76) return '#4ade80';
  if (c >= 66) return '#eab308';
  if (c >= 51) return '#f97316';
  return '#ef4444';
}
function _kwCapaianBg(cap) {
  if (cap === null || cap === undefined || isNaN(cap)) return '#f1f5f9';
  const c = Number(cap);
  if (c >= 91) return '#dcfce7';
  if (c >= 76) return '#dcfce7';
  if (c >= 66) return '#fef9c3';
  if (c >= 51) return '#ffedd5';
  return '#fee2e2';
}
function _kwCapaianLabel(cap) {
  if (cap === null || cap === undefined || isNaN(cap)) return 'Belum diisi';
  const c = Number(cap);
  if (c >= 91) return 'Sangat Tinggi';
  if (c >= 76) return 'Tinggi';
  if (c >= 66) return 'Sedang';
  if (c >= 51) return 'Rendah';
  return 'Sangat Rendah';
}

// Legend "Skala Nilai Peringkat Kinerja" - markup & warnanya sama persis dgn
// .skala-badge yg sudah ada di app.html (halaman Kelola Kinerja/tabel IKU-IKK-SPM),
// dipakai jg di sini (widget IKU & Pantau Indikator Dashboard Utama) supaya user
// tahu sumber warna tiap capaian konsisten di semua tempat.
function _kwSkalaLegendHtml() {
  const badge = (bg, border, text, label) =>
    `<span class="skala-badge" style="display:flex;align-items:center;gap:5px;padding:4px 10px;border-radius:20px;background:${bg};border:1px solid ${border};font-size:.65rem;font-weight:700;color:${text};white-space:nowrap"><span style="width:8px;height:8px;border-radius:50%;background:currentColor;opacity:.5;display:inline-block;flex-shrink:0"></span>${label}</span>`;
  return `
    <div class="skala-nilai-row" style="display:flex;gap:8px;flex-wrap:wrap;align-items:center;row-gap:8px;margin-top:10px;margin-bottom:14px">
      <span class="skala-label" style="font-size:.65rem;font-weight:700;color:var(--teks);white-space:nowrap;margin-right:6px">Skala Nilai Peringkat Kinerja:</span>
      ${badge('#4ade80', '#22c55e', '#14532d', '91–100% Sangat Tinggi')}
      ${badge('#bbf7d0', '#6ee7b7', '#14532d', '76–90% Tinggi')}
      ${badge('#fef9c3', '#fde047', '#854d0e', '66–75% Sedang')}
      ${badge('#ffedd5', '#fdba74', '#9a3412', '51–65% Rendah')}
      ${badge('#fee2e2', '#fca5a5', '#991b1b', '≤50% Sangat Rendah')}
      <span class="skala-sumber" style="font-size:.68rem;color:var(--teks-muted);font-style:italic;white-space:nowrap;padding-left:10px;margin-left:4px;border-left:1px solid var(--abu-2, #e2e8f0)">Sumber: Lampiran Permendagri No. 86 Tahun 2017</span>
    </div>`;
}

function _kwHitungCapaian(realisasi, target_tahun, bermakna_negatif) {
  const real   = parseFloat(realisasi);
  const target = parseFloat(target_tahun);
  if (isNaN(real) || isNaN(target) || target === 0) return null;
  return bermakna_negatif
    ? ((target - (real - target)) / target * 100)
    : (real / target * 100);
}

// ── Agregasi cross-tahun (extend _kwAggregate) ────────────────────────────
function _kwAggregateRange(indId, pairs) {
  const recs = pairs
    .map(p => {
      const r = (_kwAllRekap[p.tahun]?.['b' + p.bulan] || []).find(r => r.id === indId);
      // Record dari _kwAllRekap[tahun]['bN'] tidak membawa field tahun/bulan sendiri
      // (posisinya cuma tersirat dari key objek) - tempelkan di sini supaya sort
      // "latest" & lookup target per-tahun (_kwTargetFromRekap) di bawah bisa akurat.
      return r ? { ...r, tahun: p.tahun, bulan: p.bulan } : null;
    })
    .filter(Boolean);

  if (!recs.length) return { realisasi: null, capaian: null, permasalahan: null, solusi: null, bulanAda: [], count: 0, total: pairs.length };

  const withReal = recs.filter(r => r.realisasi !== null && r.realisasi !== undefined && r.realisasi !== '');

  // Akumulasi: pakai nilai bulan terakhir, bukan rata-rata
  const latest = [...withReal].sort((a, b) => {
    const ta = (a.tahun||0)*100+(a.bulan||0), tb = (b.tahun||0)*100+(b.bulan||0);
    return tb - ta;
  })[0];

  const realisasi = latest ? parseFloat(latest.realisasi) : null;
  // Hitung ulang capaian dari realisasi terakhir / target_tahun (bukan ambil dari DB per bulan)
  const ind      = _kwAllIndikator.find(x => x.id === indId);
  const _tgtInfo = latest ? _kwTargetFromRekap(indId, latest.tahun) : null;
  const _effInd  = _tgtInfo ? { ...ind, ...(_tgtInfo) } : ind;
  const capaian  = _kwHitungCapaian(realisasi, _kwTargetNumForInd(_effInd), ind?.bermakna_negatif);

  return {
    realisasi, realisasi_display: latest?.realisasi_display ?? null, capaian,
    permasalahan: latest?.permasalahan || null,
    solusi:       latest?.solusi       || null,
    bulanAda:     withReal.map(r => r.bulan || 0),
    count:        withReal.length,
    total:        pairs.length,
  };
}

// ── Set handler untuk range from/to ──────────────────────────────────────
function _kwSetRangeFrom(key) {
  const [y, m] = key.split('-').map(Number);
  _kwRangeFrom = { bulan: m, tahun: y, key };
  _kwModePerTahun = false;
  _kwFilterMode   = 'bulan';
  // Kalau from > to, geser to ke from
  if (_kwRangeTo) {
    const toKey = _kwRangeTo.tahun * 100 + _kwRangeTo.bulan;
    if (y * 100 + m > toKey) _kwRangeTo = { ..._kwRangeFrom };
  }
  _kwSaveFilter();
  _renderKinerjaWatch();
}
function _kwSetRangeTo(key) {
  const [y, m] = key.split('-').map(Number);
  _kwRangeTo = { bulan: m, tahun: y, key };
  _kwModePerTahun = false;
  _kwFilterMode   = 'bulan';
  // Kalau to < from, geser from ke to
  if (_kwRangeFrom) {
    const fromKey = _kwRangeFrom.tahun * 100 + _kwRangeFrom.bulan;
    if (y * 100 + m < fromKey) _kwRangeFrom = { ..._kwRangeTo };
  }
  _kwSaveFilter();
  _renderKinerjaWatch();
}

// ── Handler dropdown filter tahun ────────────────────────────────────────
function _kwSetTahunDd(val) {
  if (val === 'all') {
    _kwModePerTahun = true;
    _kwSetRangeAll();
  } else {
    _kwModePerTahun = false;
    _kwSetTahunPenuh(Number(val));
  }
}

// ── Handler toggle mode filter utama: 'tahun' | 'bulan' ─────────────────
function _kwSetFilterMode(mode) {
  _kwFilterMode = mode;
  if (mode === 'tahun') {
    _kwModePerTahun = true;
    // Default: dari tahun pertama sampai tahun terakhir di list
    if (_kwTahunDari   === null) _kwTahunDari   = _kwTahunList[0] || _kwTahunPilih;
    if (_kwTahunSampai === null) _kwTahunSampai = _kwTahunList[_kwTahunList.length - 1] || _kwTahunPilih;
    _kwRangeFrom = { bulan: 3,  tahun: _kwTahunDari,  key: `${_kwTahunDari}-03` };
    _kwRangeTo   = { bulan: 12, tahun: _kwTahunSampai, key: `${_kwTahunSampai}-12` };
  } else {
    _kwModePerTahun = false;
    const thn = _kwTahunPilih || new Date().getFullYear();
    if (!_kwRangeFrom) _kwRangeFrom = { bulan: 3,  tahun: thn, key: `${thn}-03` };
    if (!_kwRangeTo)   _kwRangeTo   = { bulan: 12, tahun: thn, key: `${thn}-12` };
  }
  _kwSaveFilter();
  _renderKinerjaWatch();
}

function _kwSetTahunDari(val) {
  _kwTahunDari = Number(val);
  
  if (_kwTahunSampai === null || _kwTahunSampai < _kwTahunDari) _kwTahunSampai = _kwTahunDari;
  
  _kwRangeFrom = { bulan: 3,  tahun: _kwTahunDari,   key: `${_kwTahunDari}-03` };
  _kwRangeTo   = { bulan: 12, tahun: _kwTahunSampai,  key: `${_kwTahunSampai}-12` };
  _kwModePerTahun = true;
  _kwSaveFilter();
  _renderKinerjaWatch();
}
function _kwSetTahunSampai(val) {
  _kwTahunSampai = Number(val);
  
  if (_kwTahunDari === null || _kwTahunDari > _kwTahunSampai) _kwTahunDari = _kwTahunSampai;
  _kwRangeFrom = { bulan: 3,  tahun: _kwTahunDari,   key: `${_kwTahunDari}-03` };
  _kwRangeTo   = { bulan: 12, tahun: _kwTahunSampai,  key: `${_kwTahunSampai}-12` };
  _kwModePerTahun = true;
  _kwSaveFilter();
  _renderKinerjaWatch();
}

function _kwSetTahunPenuh(tahun) {
  
  _kwRangeFrom = { bulan: 3,  tahun, key: `${tahun}-03` };
  _kwRangeTo   = { bulan: 12, tahun, key: `${tahun}-12` };
  _kwSaveFilter();
  _renderKinerjaWatch();
}

function _kwSetRangeAll() {
  _kwRangeFrom = null;
  _kwRangeTo   = null;
  _kwSaveFilter();
  _renderKinerjaWatch();
}

const KW_STORAGE_KEY  = () => `kw_watched1_${_user?.id || 'guest'}`;
const KW_FILTER_KEY   = () => `kw_filter_${_user?.id || 'guest'}`;




function _kwAggregate(indId, bulanList, tahun) {
  const recs = bulanList
    .map(b => (_kwAllRekap[tahun]?.['b' + b] || []).find(r => r.id === indId))
    .filter(Boolean);

  if (!recs.length) return { realisasi: null, capaian: null, permasalahan: null, solusi: null, bulanAda: [] };

  
  const withReal = recs.filter(r => r.realisasi !== null && r.realisasi !== undefined && r.realisasi !== '');

  const latest = [...withReal].sort((a, b) => (b.bulan || 0) - (a.bulan || 0))[0];

  const realisasi = latest ? parseFloat(latest.realisasi) : null;
  // Hitung ulang capaian dari realisasi terakhir / target_tahun (bukan ambil dari DB per bulan)
  const ind      = _kwAllIndikator.find(x => x.id === indId);
  const _tgtInfo = _kwTargetFromRekap(indId, tahun);
  const _effInd  = _tgtInfo ? { ...ind, ...(_tgtInfo) } : ind;
  const capaian  = _kwHitungCapaian(realisasi, _kwTargetNumForInd(_effInd), ind?.bermakna_negatif);

  return {
    realisasi,
    capaian,
    permasalahan: latest?.permasalahan || null,
    solusi:       latest?.solusi       || null,
    bulanAda:     withReal.map(r => r.bulan || 0),
    count:        withReal.length,
    total:        bulanList.length,
  };
}

// ── Init widget ───────────────────────────────────────────────────────────
async function _initKinerjaWatch() {
  const el = document.getElementById('kinerjaWatchWidget');
  if (!el) return;

  const pa    = getPeriodeAktif();
  const tahun = pa?.tahun || new Date().getFullYear();
  _kwTahunPilih = tahun;

  
  try {
    const saved = JSON.parse(localStorage.getItem(KW_FILTER_KEY()) || '{}');
    if (saved.mode)      _kwViewMode      = saved.mode;
    if (saved.bulan)     _kwBulanPilih    = saved.bulan;
    if (saved.tw)        _kwTWPilih       = saved.tw;
    if (saved.sem)       _kwSemPilih      = saved.sem;
    if (saved.rangeFrom) _kwRangeFrom     = saved.rangeFrom;
    if (saved.rangeTo)   _kwRangeTo       = saved.rangeTo;
    if (saved.chartType) _kwChartType     = saved.chartType;
    if (saved.modePerTahun !== undefined) _kwModePerTahun = saved.modePerTahun;
    if (saved.filterMode)  _kwFilterMode   = saved.filterMode;
    if (saved.tahunDari)   _kwTahunDari    = saved.tahunDari;
    if (saved.tahunSampai) _kwTahunSampai  = saved.tahunSampai;
    
  } catch {}

  
  if (pa?.bulan) _kwBulanPilih = pa.bulan;
  _kwBulanPilih = Math.ceil(_kwBulanPilih / 3) * 3;
  _kwRangeFrom  = _dSnapTw(_kwRangeFrom);
  _kwRangeTo    = _dSnapTw(_kwRangeTo);

  
  el.innerHTML = `<div class="kw-wrap"><div class="skeleton" style="height:280px;border-radius:14px"></div></div>`;

  try {
    
    
    const [, rAllResult, rIndResult] = await Promise.all([
      _kwFetchTahun(tahun),
      _dashFetchOnce('/api/periode')
        .then(r => r.ok ? r.json() : null).catch(() => null),
      _dashFetchOnce('/api/kinerja/indikator')
        .then(r => r.ok ? r.json() : null).catch(() => null),
    ]);

    
    
    let tahunDariPeriode = [];
    if (rAllResult) {
      tahunDariPeriode = [...new Set((rAllResult.periode || []).map(p => p.tahun))]
        .filter(Boolean).sort((a, b) => a - b);
    }

    
    if (!tahunDariPeriode.length) {
      const srcList = (typeof _periodeList !== 'undefined' && _periodeList.length)
        ? _periodeList
        : (typeof _periodeListTerbuka !== 'undefined' ? _periodeListTerbuka : []);
      tahunDariPeriode = [...new Set(srcList.map(p => p.tahun))]
        .filter(Boolean).sort((a, b) => a - b);
    }

    
    if (!tahunDariPeriode.includes(tahun)) tahunDariPeriode.push(tahun);
    tahunDariPeriode.sort((a, b) => a - b);
    _kwTahunList = tahunDariPeriode;

    
    tahunDariPeriode.forEach(t => { if (!_ikuTahunList.includes(t)) _ikuTahunList.push(t); });
    _ikuTahunList.sort((a, b) => a - b);
    
    if (document.getElementById('ikuGridWidget')) _renderIkuGrid(_ikuLastBulan, _ikuLastTahun, _ikuLastPa);

    
    const _otherYears = tahunDariPeriode.filter(thn => thn !== tahun && !_kwAllRekap[thn]);
    if (_otherYears.length) {
      Promise.all(_otherYears.map(thn => _kwFetchTahun(thn).catch(() => {})))
        .then(() => _renderKinerjaWatch()).catch(() => {});
    }

    
    _kwAllIndikator = ((rIndResult?.indikator) || [])
      .filter(r => r.aktif !== false)
      .map(r => ({
        id:                r.id,
        indikator_kinerja: r.indikator_kinerja,
        satuan:            r.satuan,
        target_tahun:      r.target_tahun,
        target_display:    r.target_display,
        penanggung_jawab:  r.penanggung_jawab,
        group_nama:        r.group_nama,
        bermakna_negatif:  r.bermakna_negatif,
        tipe_nilai:        r.tipe_nilai,
      }));
  } catch {
    _kwAllIndikator = [];
  }

  
  try {
    const saved = parseInt(localStorage.getItem(KW_STORAGE_KEY()));
    _kwWatchedId = saved && _kwAllIndikator.find(x => x.id === saved) ? saved : null;
  } catch { _kwWatchedId = null; }

  _renderKinerjaWatch();
}

const _KW_JENIS_LIST = ['monev', 'ikk', 'spm', 'subkeg'];
const _KW_MAX_CONCURRENT = 2;   // 4 -> 2: tiap request /rekap/tahun membawa ratusan KB-MB dari Neon; jangan tumpuk di koneksi yang lambat

// Batasi request /rekap/tahun yang jalan bersamaan. Sebelumnya tiap tahun x 3 jenis ditembak sekaligus
// (semua tahun di periode + rentang grafik), sehingga banyak query berat menumpuk di Neon.
let _kwActive = 0;
const _kwQueue = [];
function _kwLimit(fn) {
  return new Promise((resolve, reject) => {
    const run = () => {
      _kwActive++;
      Promise.resolve().then(fn).then(resolve, reject).finally(() => {
        _kwActive--;
        const next = _kwQueue.shift();
        if (next) next();
      });
    };
    if (_kwActive < _KW_MAX_CONCURRENT) run(); else _kwQueue.push(run);
  });
}
// Hasil yang ada jenis-nya gagal diambil: tetap dipakai untuk tampilan, tapi TIDAK disimpan ke cache 24 jam.
const _kwPartial = new WeakSet();

const KW_REKAP_CACHE_KEY = (tahun) => `kw_rekap3_${_user?.id || 'guest'}_${tahun}`;
const KW_REKAP_CACHE_TTL = 24 * 3600 * 1000; 
// Cache yang umurnya di bawah ini dipakai apa adanya TANPA refresh latar belakang. Sebelumnya tiap kali dashboard dibuka
// selalu menembak ulang tahun x 3 jenis request berat walau cache baru berumur beberapa detik.
// (Simpan/ubah data dari browser ini tetap langsung membersihkan cache lewat _invalidate*.)
const KW_REKAP_REFRESH_MIN_MS = 5 * 60 * 1000;
const _kwBgRefreshing = new Set(); 

function _kwReadRekapCache(tahun) {
  try {
    const raw = localStorage.getItem(KW_REKAP_CACHE_KEY(tahun));
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || !parsed.data || !parsed.ts) return null;
    return parsed;
  } catch { return null; }
}

function _kwWriteRekapCache(tahun, data) {
  try {
    localStorage.setItem(KW_REKAP_CACHE_KEY(tahun), JSON.stringify({ ts: Date.now(), data }));
  } catch {} 
}

function _kwClearRekapCache(tahun) {
  try { localStorage.removeItem(KW_REKAP_CACHE_KEY(tahun)); } catch {}
}

// Dipanggil pas edit Indikator (ganti tipe_perhitungan/bermakna_negatif/dll) -
// beda sama simpan realisasi biasa (yang cuma pengaruh 1 tahun), ganti tipe
// perhitungan ngaruh ke capaian_persen SEMUA tahun buat indikator itu, jadi
// bersihin cache di memori + localStorage utk semua tahun yg pernah ke-cache,
// lalu rerender widget dashboard yang lagi kebuka (kalau ada).
function _invalidateAllKinerjaDashboardCache() {
  if (typeof _kwAllRekap === 'undefined') return;
  if (typeof _kwTahunInflight !== 'undefined') _kwTahunInflight.clear();
  Object.keys(_kwAllRekap).forEach(thn => {
    delete _kwAllRekap[thn];
    _kwClearRekapCache(thn);
  });
  _kwRerenderAfterBgRefresh();
}

async function _kwFetchTahunFresh(tahun) {
  const hasilPerBulan = new Map();
  for (let b = 1; b <= 12; b++) hasilPerBulan.set(b, []);

  let _gagal = false;
  const hasilPerJenis = await Promise.all(
    _KW_JENIS_LIST.map(jenis => _kwLimit(async () => {
      const ctrl  = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), 40000);
      try {
        const r = await fetch(`/api/kinerja/rekap/tahun?tahun=${tahun}&jenis=${jenis}&scope=semua`, { headers: authHeaders(), signal: ctrl.signal });
        if (!r.ok) { _gagal = true; return { rekap: [] }; }
        return await r.json();
      } catch { _gagal = true; return { rekap: [] }; }
      finally { clearTimeout(timer); }
    }))
  );
  hasilPerJenis.forEach(d => {
    (d.rekap || []).forEach(r => {
      if (!hasilPerBulan.has(r.bulan)) return;
      hasilPerBulan.get(r.bulan).push(r);
    });
  });

  const result = {};
  for (let b = 1; b <= 12; b++) {
    const merged = new Map();
    hasilPerBulan.get(b).forEach(r => { if (!merged.has(r.id)) merged.set(r.id, r); });
    result['b' + b] = Array.from(merged.values());
  }
  if (_gagal) _kwPartial.add(result);
  return result;
}

function _kwRerenderAfterBgRefresh() {
  if (document.getElementById('kinerjaWatchWidget') && typeof _renderKinerjaWatch === 'function') _renderKinerjaWatch();
  if (document.getElementById('ikuChartSection') && typeof _ikuRenderChartSection === 'function') _ikuRenderChartSection();
}

// In-flight dedupe per tahun: tanpa ini, tiap widget yang manggil _kwFetchTahun(2026) barengan
// nembak 4 request (monev/ikk/spm/subkeg) sendiri-sendiri.
const _kwTahunInflight = new Map();
async function _kwFetchTahun(tahun) {
  if (_kwAllRekap[tahun]) return;
  if (_kwTahunInflight.has(tahun)) return _kwTahunInflight.get(tahun);
  const p = _kwFetchTahunImpl(tahun).finally(() => {
    if (_kwTahunInflight.get(tahun) === p) _kwTahunInflight.delete(tahun);
  });
  _kwTahunInflight.set(tahun, p);
  return p;
}

async function _kwFetchTahunImpl(tahun) {
  if (_kwAllRekap[tahun]) return; 

  const cached = _kwReadRekapCache(tahun);
  if (cached && (Date.now() - cached.ts) < KW_REKAP_CACHE_TTL) {
    
    _kwAllRekap[tahun] = cached.data;

    if ((Date.now() - cached.ts) >= KW_REKAP_REFRESH_MIN_MS && !_kwBgRefreshing.has(tahun)) {
      _kwBgRefreshing.add(tahun);
      _kwFetchTahunFresh(tahun).then(fresh => {
        if (_kwPartial.has(fresh)) { _kwBgRefreshing.delete(tahun); return; }   // refresh gagal: pertahankan data cache lama
        _kwAllRekap[tahun] = fresh;
        _kwWriteRekapCache(tahun, fresh);
        _kwBgRefreshing.delete(tahun);
        _kwRerenderAfterBgRefresh();
      }).catch(() => { _kwBgRefreshing.delete(tahun); });
    }
    return;
  }

  
  const fresh = await _kwFetchTahunFresh(tahun);
  _kwAllRekap[tahun] = fresh;
  if (!_kwPartial.has(fresh)) _kwWriteRekapCache(tahun, fresh);
}

function _invalidateKinerjaDashboardCache(tahun) {
  if (typeof _kwAllRekap !== 'undefined' && tahun) delete _kwAllRekap[tahun];
  if (tahun && typeof _kwTahunInflight !== 'undefined') _kwTahunInflight.delete(tahun);
  if (tahun) _kwClearRekapCache(tahun);
}


// ── Chart SVG capaian per tahun ───────────────────────────────────────────

function _kwSaveFilter() {
  try {
    // Tahun tidak disimpan - selalu ikut periode aktif saat init
    localStorage.setItem(KW_FILTER_KEY(), JSON.stringify({
      mode: _kwViewMode, bulan: _kwBulanPilih, tw: _kwTWPilih, sem: _kwSemPilih,
      rangeFrom: _kwRangeFrom, rangeTo: _kwRangeTo,
      chartType: _kwChartType,
      modePerTahun: _kwModePerTahun,
      filterMode: _kwFilterMode,
      tahunDari: _kwTahunDari, tahunSampai: _kwTahunSampai,
    }));
  } catch {}
}

function _kwSave() {
  try { localStorage.setItem(KW_STORAGE_KEY(), _kwWatchedId || ''); } catch {}
}

// ── Toggle accordion item permasalahan & solusi ───────────────────────────────
function _kwToggleAcc(btn) {
  const item = btn.closest('.kw-ps-acc-item');
  const body = btn.nextElementSibling;
  const isOpen = item.classList.contains('kw-ps-acc-open');
  if (isOpen) {
    item.classList.remove('kw-ps-acc-open');
    btn.setAttribute('aria-expanded', 'false');
    body.hidden = true;
  } else {
    item.classList.add('kw-ps-acc-open');
    btn.setAttribute('aria-expanded', 'true');
    body.hidden = false;
  }
}



function _kwSetChartType(type) {
  _kwChartType = type;
  _kwSaveFilter();
  _renderKinerjaWatch();
}
window._kwSetChartType = _kwSetChartType;

function _polarIcon(bermaknaNeg, size = 14) {
  if (bermaknaNeg) {
    return `<span data-tip="Bermakna Negatif" style="display:inline-flex;align-items:center;justify-content:center;width:${size}px;height:${size}px;background:#fee2e2;border-radius:50%;flex-shrink:0;vertical-align:middle;margin-left:4px"><svg xmlns="http://www.w3.org/2000/svg" width="${Math.round(size*0.57)}" height="${Math.round(size*0.57)}" fill="none" viewBox="0 0 24 24" stroke="#991b1b" stroke-width="2.8"><path stroke-linecap="round" stroke-linejoin="round" d="M19 14l-7 7m0 0l-7-7m7 7V3"/></svg></span>`;
  }
  return `<span data-tip="Bermakna Positif" style="display:inline-flex;align-items:center;justify-content:center;width:${size}px;height:${size}px;background:#d1fae5;border-radius:50%;flex-shrink:0;vertical-align:middle;margin-left:4px"><svg xmlns="http://www.w3.org/2000/svg" width="${Math.round(size*0.57)}" height="${Math.round(size*0.57)}" fill="none" viewBox="0 0 24 24" stroke="#065f46" stroke-width="2.8"><path stroke-linecap="round" stroke-linejoin="round" d="M5 10l7-7m0 0l7 7m-7-7v18"/></svg></span>`;
}

function _kwBuildDdItems(list) {
  if (!list.length) return '<div class="kw-dd-empty">Tidak ada indikator</div>';
  return list.map(i => `
    <div class="kw-dd-item ${i.id === _kwWatchedId ? 'active' : ''}" onclick="_kwPickItem(${i.id})">
      <span class="kw-dd-item-name">${esc(i.indikator_kinerja)}${_polarIcon(i.bermakna_negatif, 13)}</span>
      ${i.satuan ? `<span class="kw-dd-item-satuan">${esc(i.satuan)}</span>` : ''}
    </div>`).join('');
}

// ── Helper: custom dropdown filter (mengganti <select> bawaan browser) ────
// _kwCdd(id, items, activeVal, onPickFn, opts)
//   items   : [{val, label}]
//   activeVal: nilai aktif saat ini
//   onPickFn : string nama fungsi JS, dipanggil dengan (val)
//   opts.disabled : boolean
//   opts.minW     : min-width string, default '120px'
function _kwCdd(id, items, activeVal, onPickFn, opts = {}) {
  if (opts.disabled) {
    const lbl = items[0]?.label || '-';
    return `<div class="kw-cdd kw-cdd--disabled"><span class="kw-cdd-label">${lbl}</span><svg class="kw-cdd-caret" width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7"/></svg></div>`;
  }
  const active = items.find(x => x.val === activeVal) || items[0];
  const mw = opts.minW || '120px';
  const rows = items.map(it => `
    <div class="kw-cdd-opt${it.val === activeVal ? ' active' : ''}" onclick="event.stopPropagation();_kwCddPick('${id}','${onPickFn}','${it.val}')">
      ${it.label}
    </div>`).join('');
  return `
    <div class="kw-cdd" id="${id}" style="min-width:${mw}" onclick="event.stopPropagation();_kwCddToggle('${id}')">
      <span class="kw-cdd-label">${active ? active.label : '-'}</span>
      <svg class="kw-cdd-caret" width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7"/></svg>
      <div class="kw-cdd-panel" id="${id}_panel">
        ${rows}
      </div>
    </div>`;
}
function _kwCddToggle(id) {
  const el = document.getElementById(id);
  if (!el) return;
  const isOpen = el.classList.contains('open');
  
  document.querySelectorAll('.kw-cdd.open').forEach(d => d.classList.remove('open'));
  if (!isOpen) {
    el.classList.add('open');
    _kwCddEnsureSearch(el);
  }
}

// Kolom cari di dalam panel .kw-cdd (berlaku untuk semua dropdown filter dashboard, termasuk yang
// markup-nya ditulis manual). Dibuat sekali saat panel pertama dibuka; filter di-reset tiap dibuka.
function _kwCddEnsureSearch(el) {
  const panel = el.querySelector('.kw-cdd-panel');
  if (!panel) return;
  let input = panel.querySelector('.kw-cdd-search-input');
  if (!input) {
    const wrap = document.createElement('div');
    wrap.className = 'kw-cdd-search-wrap';
    wrap.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-4.35-4.35"/></svg>' +
      '<input type="text" class="kw-cdd-search-input" placeholder="Cari…" autocomplete="off">';
    wrap.addEventListener('click', e => e.stopPropagation());
    panel.insertBefore(wrap, panel.firstChild);
    input = wrap.querySelector('input');
    input.addEventListener('input', () => _kwCddFilter(panel, input.value));
    input.addEventListener('keydown', e => {
      if (e.key === 'Enter') {
        e.preventDefault();
        const first = Array.from(panel.querySelectorAll('.kw-cdd-opt')).find(o => o.style.display !== 'none');
        if (first) first.click();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        el.classList.remove('open');
      }
    });
  }
  input.value = '';
  _kwCddFilter(panel, '');
  const coarse = window.matchMedia && window.matchMedia('(pointer: coarse)').matches;
  if (!coarse || panel.querySelectorAll('.kw-cdd-opt').length > 8) setTimeout(() => input.focus(), 30);
}

function _kwCddFilter(panel, query) {
  const q = (query || '').trim().toLowerCase();
  let any = false;
  panel.querySelectorAll('.kw-cdd-opt').forEach(o => {
    const ok = !q || o.textContent.toLowerCase().includes(q);
    o.style.display = ok ? '' : 'none';
    if (ok) any = true;
  });
  let empty = panel.querySelector('.kw-cdd-empty');
  if (any) { if (empty) empty.remove(); }
  else if (!empty) {
    empty = document.createElement('div');
    empty.className = 'kw-cdd-empty';
    empty.textContent = 'Tidak ditemukan';
    panel.appendChild(empty);
  }
}
function _kwCddPick(id, fn, val) {
  
  const fnRef = window[fn];
  
  const el = document.getElementById(id);
  if (el) el.classList.remove('open');
  
  if (typeof fnRef === 'function') fnRef(val);
}

document.addEventListener('click', (e) => {
  document.querySelectorAll('.kw-cdd.open').forEach(d => {
    if (!d.contains(e.target)) d.classList.remove('open');
  });
  
  document.querySelectorAll('.kw-mp.open').forEach(mp => {
    if (!mp.contains(e.target)) mp.classList.remove('open');
  });
});

window._kwMpData = window._kwMpData || {};

function _kwMonthPicker(id, tahunList, activeVal, onPickFn, availableKeys) {
  const _BL = _KW_BULAN_LABEL;
  const activeY = activeVal ? parseInt(activeVal.split('-')[0]) : (tahunList[tahunList.length-1] || new Date().getFullYear());
  const activeM = activeVal ? parseInt(activeVal.split('-')[1]) : 0;
  
  window._kwMpData[id] = {
    onPickFn, tahunList, activeVal: activeVal || '',
    availKeys: availableKeys ? new Set([...availableKeys]) : null,
    viewYear: activeY,
  };
  const lbl = activeVal ? `${_BL[activeM]} ${activeY}` : '- Pilih -';
  return `
    <div class="kw-mp" id="${id}" onclick="event.stopPropagation();_kwMpToggle('${id}')">
      <span class="kw-mp-label">${lbl}</span>
      <svg class="kw-mp-caret" width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7"/></svg>
    </div>`;
}

function _kwMpToggle(id) {
  const el = document.getElementById(id);
  if (!el) return;
  if (el.classList.contains('open')) { el.classList.remove('open'); return; }
  
  document.querySelectorAll('.kw-mp.open').forEach(x => x.classList.remove('open'));
  document.querySelectorAll('.kw-cdd.open').forEach(x => x.classList.remove('open'));
  _kwMpRenderPanel(el);
  el.classList.add('open');
}

function _kwMpRenderPanel(el) {
  const _BL     = _KW_BULAN_LABEL;
  const id          = el.id;
  const data        = window._kwMpData?.[id] || {};
  const onPickFn    = data.onPickFn || '';
  const tahunList   = data.tahunList || [];
  const activeVal   = data.activeVal || '';
  const availKeys   = data.availKeys || null;  // Set atau null
  const viewYear    = data.viewYear || tahunList[tahunList.length-1] || new Date().getFullYear();
  const activeY     = activeVal ? parseInt(activeVal.split('-')[0]) : 0;
  const activeM     = activeVal ? parseInt(activeVal.split('-')[1]) : 0;
  const minYear     = tahunList[0] || viewYear;
  const maxYear     = tahunList[tahunList.length-1] || viewYear;

  let grid = '';
  for (const m of _DTW_BULAN) {
    const key = `${viewYear}-${String(m).padStart(2,'0')}`;
    const isActive    = (viewYear === activeY && m === activeM);
    const isAvail     = !availKeys || availKeys.has(key);
    // Bulan tanpa data: tetap bisa diklik tapi tampil dim (bukan disabled)
    const cls = isActive ? 'kw-mp-cell active' : 'kw-mp-cell' + (isAvail ? '' : ' kw-mp-cell--nodata');
    grid += `<div class="${cls}" onclick="event.stopPropagation();_kwMpPick('${id}','${key}')">${_BL[m]}</div>`;
  }

  const canPrev = viewYear > minYear;
  const canNext = viewYear < maxYear;

  let panel = el.querySelector('.kw-mp-panel');
  if (!panel) {
    panel = document.createElement('div');
    panel.className = 'kw-mp-panel';
    el.appendChild(panel);
  }
  panel.innerHTML = `
    <div class="kw-mp-nav">
      <button class="kw-mp-nav-btn" ${canPrev ? `onclick="event.stopPropagation();_kwMpNav('${id}',-1)"` : 'disabled'}>
        <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7"/></svg>
      </button>
      <span class="kw-mp-year">${viewYear}</span>
      <button class="kw-mp-nav-btn" ${canNext ? `onclick="event.stopPropagation();_kwMpNav('${id}',1)"` : 'disabled'}>
        <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7"/></svg>
      </button>
    </div>
    <div class="kw-mp-grid">${grid}</div>`;
}

function _kwMpNav(id, dir) {
  const el = document.getElementById(id);
  if (!el) return;
  const data = window._kwMpData?.[id] || {};
  const tahunList = data.tahunList || [];
  let vy = (data.viewYear || tahunList[0] || new Date().getFullYear()) + dir;
  const min = tahunList[0] || vy;
  const max = tahunList[tahunList.length-1] || vy;
  vy = Math.max(min, Math.min(max, vy));
  if (window._kwMpData[id]) window._kwMpData[id].viewYear = vy;
  _kwMpRenderPanel(el);
}

function _kwMpPick(id, key) {
  const el = document.getElementById(id);
  if (!el) return;
  el.classList.remove('open');
  const data = window._kwMpData?.[id];
  if (!data) return;
  // Update activeVal di registry
  data.activeVal = key;
  data.viewYear  = parseInt(key.split('-')[0]);
  // Update label di trigger
  const _BL = ['','Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agu','Sep','Okt','Nov','Des'];
  const [y, m] = key.split('-').map(Number);
  const labelEl = el.querySelector('.kw-mp-label');
  if (labelEl) labelEl.textContent = `${_BL[m]} ${y}`;
  // Panggil handler
  const fnRef = window[data.onPickFn];
  if (typeof fnRef === 'function') fnRef(key);
}

function _kwToggleDd() {
  const panel = document.getElementById('kwDdPanel');
  const search = document.getElementById('kwDdSearch');
  if (!panel) return;
  const isOpen = panel.style.display !== 'none';
  if (isOpen) {
    panel.style.display = 'none';
  } else {
    panel.style.display = 'block';
    if (search) { search.value = ''; _kwFilterDd(''); search.focus(); }
  }
}

function _kwFilterDd(q) {
  const list = document.getElementById('kwDdList');
  if (!list) return;
  const filtered = q.trim()
    ? _kwAllIndikator.filter(i => i.indikator_kinerja.toLowerCase().includes(q.toLowerCase()) || (i.satuan||'').toLowerCase().includes(q.toLowerCase()))
    : _kwAllIndikator;
  list.innerHTML = _kwBuildDdItems(filtered);
}

function _kwPickItem(id) {
  // Reset range saat ganti indikator agar default ulang ke first/latest
  if (id !== _kwWatchedId) {
    _kwRangeFrom    = null;
    _kwRangeTo      = null;
    // Ikuti filterMode yang aktif, jangan paksa reset
    _kwModePerTahun = (_kwFilterMode === 'tahun');
  }
  _kwWatchedId = id; _kwSave();
  const panel = document.getElementById('kwDdPanel');
  if (panel) panel.style.display = 'none';
  _renderKinerjaWatch();
}

function _kwReset() {
  _kwWatchedId = null; _kwSave();
  _renderKinerjaWatch();
}

document.addEventListener('click', function(e) {
  const dd = document.getElementById('kwCustomDd');
  if (dd && !dd.contains(e.target)) {
    const panel = document.getElementById('kwDdPanel');
    if (panel) panel.style.display = 'none';
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// RENDER UTAMA WIDGET
// ─────────────────────────────────────────────────────────────────────────────
function _renderKinerjaWatch() {
  const el = document.getElementById('kinerjaWatchWidget');
  if (!el) return;

  // Label indikator terpilih
  const selectedInd   = _kwWatchedId ? _kwAllIndikator.find(x => x.id === _kwWatchedId) : null;
  const selectedLabel = selectedInd
    ? `${esc(selectedInd.indikator_kinerja)}${selectedInd.satuan ? ' <span class="kw-dd-sel-satuan">('+esc(selectedInd.satuan)+')</span>' : ''}`
    : '<span class="kw-dd-placeholder">- Pilih indikator -</span>';

  // ── Filter bar (RANGE MODE) ────────────────────────────────────────────────
  // Kumpulkan semua periode yg ada data untuk indikator ini
  const periodeAdaData = _kwWatchedId ? _kwGetPeriodeAdaData(_kwWatchedId) : (() => {
    // Fallback: bangun dari _kwTahunList (sudah include semua tahun dari DB)
    const hasil = [];
    const tahunSrc = _kwTahunList.length ? _kwTahunList : [];
    for (const thn of tahunSrc) {
      const rekapTahun = _kwAllRekap[thn] || {};
      for (const b of _DTW_BULAN) {
        const recs = rekapTahun['b' + b] || [];
        if (recs.length) hasil.push({ bulan: b, tahun: thn, key: `${thn}-${String(b).padStart(2,'0')}` });
      }
    }
    
    if (!hasil.length) {
      const srcList = (typeof _periodeList !== 'undefined' && _periodeList.length) ? _periodeList
        : (typeof _periodeListTerbuka !== 'undefined' ? _periodeListTerbuka : []);
      const sorted = [...srcList].sort((a,b) => a.tahun !== b.tahun ? a.tahun-b.tahun : a.bulan-b.bulan);
      for (const p of sorted) {
        if (p.tahun && p.bulan) hasil.push({ bulan: p.bulan, tahun: p.tahun, key: `${p.tahun}-${String(p.bulan).padStart(2,'0')}` });
      }
    }
    return hasil;
  })();

  
  const tahunDiperiode = [...new Set(periodeAdaData.map(p => p.tahun))];
  for (const thn of tahunDiperiode) {
    if (!_kwAllRekap[thn]) {
      
      _kwFetchTahun(thn).then(() => _renderKinerjaWatch()).catch(() => {});
    }
  }

  
  
  if (periodeAdaData.length > 0 && !_kwModePerTahun) {
    const _nowYear = new Date().getFullYear();
    if (!_kwRangeFrom) _kwRangeFrom = { bulan: 3,  tahun: _nowYear, key: `${_nowYear}-03` };  
    if (!_kwRangeTo)   _kwRangeTo   = { bulan: 12, tahun: _nowYear, key: `${_nowYear}-12` };  
    
    if (_kwRangeFrom && _kwRangeTo) {
      const fk = _kwRangeFrom.tahun * 100 + _kwRangeFrom.bulan;
      const tk = _kwRangeTo.tahun * 100 + _kwRangeTo.bulan;
      if (fk > tk) _kwRangeTo = { ..._kwRangeFrom };
    }
  }

  
  
  const rangePairs = _kwModePerTahun
    ? periodeAdaData   
    : (_kwRangeFrom && _kwRangeTo)
      ? _kwGetRangePairs(_kwRangeFrom, _kwRangeTo)
      : (periodeAdaData.length ? [periodeAdaData[periodeAdaData.length-1]] : []);

  
  const bulanList = rangePairs.map(p => p.bulan);
  
  const tahun = (_kwRangeTo?.tahun) || _kwTahunPilih;

  
  const periodLabel = (() => {
    if (_kwModePerTahun) {
      if (_kwTahunList.length === 0) return 'Semua';
      const min = _kwTahunList[0], max = _kwTahunList[_kwTahunList.length - 1];
      return min === max ? `Tahun ${min}` : `${min} – ${max}`;
    }
    if (!_kwRangeFrom || !_kwRangeTo) return 'Belum ada data';
    if (_kwRangeFrom.key === _kwRangeTo.key) return _kwPeriodePillLabel(_kwRangeFrom);
    return `${_KW_BULAN_FULL[_kwRangeFrom.bulan]} ${_kwRangeFrom.tahun} – ${_KW_BULAN_FULL[_kwRangeTo.bulan]} ${_kwRangeTo.tahun}`;
  })();

  
  const periodeOptions = periodeAdaData.map(p => ({ val: p.key, label: _kwPeriodePillLabel(p) }));
  
  const fromKey = _kwRangeFrom ? (_kwRangeFrom.tahun * 100 + _kwRangeFrom.bulan) : 0;
  const periodeToOptions = periodeAdaData
    .filter(p => p.tahun * 100 + p.bulan >= fromKey)
    .map(p => ({ val: p.key, label: _kwPeriodePillLabel(p) }));

  
  const tahunUnik = (_kwTahunList.length ? _kwTahunList : [_kwTahunPilih]).slice().sort((a,b) => a-b);
  const _isRangeAll = _kwRangeFrom && _kwRangeTo && periodeAdaData.length > 0 &&
    _kwRangeFrom.key === periodeAdaData[0].key &&
    _kwRangeTo.key   === periodeAdaData[periodeAdaData.length-1].key;

  
  const _tahunDdActive = (() => {
    if (_kwModePerTahun) return 'all';
    if (!_kwRangeFrom || !_kwRangeTo) return 'all';
    
    if (_kwRangeFrom.tahun === _kwRangeTo.tahun &&
        _kwRangeFrom.bulan <= 3 && _kwRangeTo.bulan === 12) return _kwRangeFrom.tahun;
    
    return 'all';
  })();

  const _tahunDdItems = [
    { val: 'all', label: 'Semua' },
    ...tahunUnik.map(t => ({ val: t, label: String(t) })),
  ];

  
  const tahunShortcutHtml = _kwCdd('kwTahunDd', _tahunDdItems, _tahunDdActive, '_kwSetTahunDd', { minW: '100px' });

  
  const availFromKeys = new Set(periodeAdaData.map(p => p.key));
  const availToKeys   = new Set(periodeAdaData.filter(p => p.tahun * 100 + p.bulan >= fromKey).map(p => p.key));

  
  const rangeFilterHtml = periodeAdaData.length === 0
    ? `<span style="font-size:0.75rem;color:#94a3b8;padding:4px 8px">Belum ada data periode</span>`
    : `<div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap">

        ${/* Dropdown mode utama: Tahun | Bulan - inline onclick agar pasti terpanggil */''}
        <div class="kw-cdd" id="kwFilterModeDd" style="min-width:90px" onclick="event.stopPropagation();_kwCddToggle('kwFilterModeDd')">
          <span class="kw-cdd-label">${_kwFilterMode === 'tahun' ? 'Tahun' : 'Triwulan'}</span>
          <svg class="kw-cdd-caret" width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7"/></svg>
          <div class="kw-cdd-panel" id="kwFilterModeDd_panel">
            <div class="kw-cdd-opt${_kwFilterMode === 'tahun' ? ' active' : ''}" onclick="event.stopPropagation();_kwCddToggle('kwFilterModeDd');_kwSetFilterMode('tahun')">Tahun</div>
            <div class="kw-cdd-opt${_kwFilterMode === 'bulan' ? ' active' : ''}" onclick="event.stopPropagation();_kwCddToggle('kwFilterModeDd');_kwSetFilterMode('bulan')">Triwulan</div>
          </div>
        </div>

        <div style="width:1px;height:16px;background:#e2e8f0;flex-shrink:0"></div>

        ${_kwFilterMode === 'tahun' ? (() => {
          // Pastikan state dari/sampai ada
          const tDari   = _kwTahunDari   || tahunUnik[0] || _kwTahunPilih;
          const tSampai = _kwTahunSampai || tahunUnik[tahunUnik.length-1] || _kwTahunPilih;
          const dariItems   = tahunUnik.map(t => ({ val: t, label: String(t) }));
          const sampaiItems = tahunUnik.filter(t => t >= tDari).map(t => ({ val: t, label: String(t) }));
          return `
            <div style="display:flex;align-items:center;gap:8px;flex-shrink:0">
              <span style="font-size:0.72rem;font-weight:600;color:#94a3b8;white-space:nowrap">Dari</span>
              ${_kwCdd('kwTahunDariDd', dariItems, tDari, '_kwSetTahunDari', { minW: '90px' })}
            </div>
            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="#cbd5e1" stroke-width="2.5" style="flex-shrink:0"><path stroke-linecap="round" stroke-linejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6"/></svg>
            <div style="display:flex;align-items:center;gap:8px;flex-shrink:0">
              <span style="font-size:0.72rem;font-weight:600;color:#94a3b8;white-space:nowrap">Sampai</span>
              ${_kwCdd('kwTahunSampaiDd', sampaiItems, tSampai, '_kwSetTahunSampai', { minW: '90px' })}
            </div>
          `;
        })() : `
          ${''}
          <div style="display:flex;align-items:center;gap:8px;flex-shrink:0">
            <span style="font-size:0.72rem;font-weight:600;color:#94a3b8;white-space:nowrap">Dari</span>
            ${_kwMonthPicker('kwMpFrom', _kwTahunList.length ? _kwTahunList : [_kwTahunPilih], _kwRangeFrom?.key || periodeOptions[0]?.val, '_kwSetRangeFrom', availFromKeys)}
          </div>
          <div style="display:flex;align-items:center;gap:8px;flex-shrink:0">
            <span style="font-size:0.72rem;font-weight:600;color:#94a3b8;white-space:nowrap">Sampai</span>
            ${_kwMonthPicker('kwMpTo', _kwTahunList.length ? _kwTahunList : [_kwTahunPilih], _kwRangeTo?.key || periodeOptions[periodeOptions.length-1]?.val, '_kwSetRangeTo', availToKeys)}
          </div>
        `}
      </div>`;

  
  
  const selInd = _kwWatchedId ? _kwAllIndikator.find(x => x.id === _kwWatchedId) : null;
  const indBarHtml = selInd ? `
    <div class="kw-ind-selector-bar kw-ind-selector-bar--active">
      <div class="kw-ind-selector-info" onclick="_kwToggleDd()" style="cursor:pointer;flex:1;min-width:0;">
        <div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;min-width:0">
          <div class="kw-ind-selector-name" style="flex:0 1 auto;min-width:0">${esc(selInd.indikator_kinerja)}${_polarIcon(selInd.bermakna_negatif, 15)}</div>
          ${selInd.satuan ? `<span class="kw-ind-selector-tag" data-tip="Satuan pengukuran indikator">${esc(selInd.satuan)}</span>` : ''}
          ${typeof _tipeBadge === 'function' ? _tipeBadge(selInd.tipe_perhitungan) : ''}
        </div>
        <div class="kw-ind-selector-meta">
          ${selInd.group_nama ? `<span class="kw-ind-selector-tag kw-ind-selector-tag--bidang">${esc(selInd.group_nama)}</span>` : ''}
          ${selInd.penanggung_jawab ? `<span class="kw-ind-selector-tag kw-ind-selector-tag--pj">${esc(selInd.penanggung_jawab)}</span>` : ''}
        </div>
      </div>
      <button class="kw-ind-selector-change" onclick="_kwToggleDd()" type="button">
        <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 3 4 7l4 4"/><path d="M4 7h16"/><path d="m16 21 4-4-4-4"/><path d="M20 17H4"/></svg>
        Ganti
      </button>
      <button class="kw-ind-selector-reset" onclick="_kwReset()" type="button" data-tip="Reset / hapus pilihan">
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>
      </button>
    </div>` : `
    <div class="kw-ind-selector-bar kw-ind-selector-bar--empty" onclick="_kwToggleDd()">
      <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" style="opacity:.4"><circle cx="11" cy="11" r="8"/><path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-4.35-4.35"/></svg>
      <span>Pilih indikator yang ingin dipantau...</span>
      <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5" style="margin-left:auto;opacity:.35"><path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7"/></svg>
    </div>`;

  let html = `
    <div class="kw-wrap">
      <div class="kw-header-v2">
        <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" style="opacity:.45">
          <path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
          <path stroke-linecap="round" stroke-linejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/>
        </svg>
        <span class="kw-title-v2">Pantau Indikator</span>
        ${_kwWatchedId ? `<span class="kw-period-badge">${esc(periodLabel)}</span>` : ""}
      </div>
      ${_kwSkalaLegendHtml()}

      <!-- Filter bar - tampil di bawah header, hanya saat indikator dipilih -->
      ${_kwWatchedId ? `
      <div class="kw-filter-row">
        <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="opacity:.4;flex-shrink:0"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/></svg>
        <span style="font-size:0.72rem;font-weight:700;color:#64748b;white-space:nowrap">Filter Periode:</span>
        ${rangeFilterHtml}
      </div>` : ''}

      <!-- Indicator selector bar (full width) -->
      <div class="kw-custom-dd kw-custom-dd--bar" id="kwCustomDd">
        ${indBarHtml}
        <div class="kw-dd-panel" id="kwDdPanel" style="display:none">
          <div class="kw-dd-search-wrap">
            <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" class="kw-dd-search-icon"><circle cx="11" cy="11" r="8"/><path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-4.35-4.35"/></svg>
            <input class="kw-dd-search" id="kwDdSearch" type="text" placeholder="Cari indikator..." oninput="_kwFilterDd(this.value)" autocomplete="off" />
          </div>
          <div class="kw-dd-list" id="kwDdList">
            ${_kwBuildDdItems(_kwAllIndikator)}
          </div>
        </div>
      </div>`;

  
  if (!_kwWatchedId) {
    html += `
      <div class="kw-empty">
        <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.2" opacity=".25">
          <path stroke-linecap="round" stroke-linejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/>
        </svg>
        <p>Klik pada bar di atas untuk memilih indikator<br>yang ingin Anda pantau detailnya.</p>
      </div>
    </div>`;
    el.innerHTML = html;
    return;
  }

  
  const ind = _kwAllIndikator.find(x => x.id === _kwWatchedId);
  if (!ind) { html += `</div>`; el.innerHTML = html; return; }

  
  const aggr    = _kwAggregateRange(ind.id, rangePairs);
  const real    = aggr.realisasi;
  const realDisp= aggr.realisasi_display;
  const cap     = aggr.capaian;
  const isPredikatInd = ind.tipe_nilai === 'predikat';
  
  
  const _targetFromRekap = _kwTargetFromRekap(ind.id, tahun);
  const _effInd = _targetFromRekap ? { ...ind, ...(_targetFromRekap) } : ind;
  const _targetRaw = _kwTargetNumForInd(_effInd);
  const target  = !isNaN(_targetRaw) ? _targetRaw : null;
  const targetDisplay = _effInd.target_display != null ? _effInd.target_display : (target !== null ? parseFloat(target) : null);
  const pct     = cap !== null ? Math.min(Math.max(cap, 0), 100) : null;
  const pctRaw  = cap !== null ? parseFloat(cap).toFixed(1) : null;

  
  
  const fmtReal = (v, disp) => _kwFmtReal(v, disp, isPredikatInd);

  
  
  
  
  
  
  
  
  const _capVal = cap !== null ? parseFloat(cap) : null;   
  const col   = _kwCapaianColor(_capVal);
  const colBg = _kwCapaianBg(_capVal);
  const label = _kwCapaianLabel(_capVal);

  // Gap mengikuti polaritas indikator: normal (makin tinggi makin baik) -> gap = target - real,
  // bermakna_negatif (makin rendah makin baik, mis. AKB) -> gap = real - target.
  // gap > 0 selalu berarti "belum memenuhi target".
  const _isNeg = !!ind.bermakna_negatif;
  const gap    = (real !== null && target !== null) ? (_isNeg ? (real - target) : (target - real)) : null;
  const gapStr = gap !== null
    ? (isPredikatInd
        ? (gap > 0 ? `Kurang ${Math.round(gap)} tingkat menuju ${esc(targetDisplay ?? '')}` : 'Target terpenuhi')
        : (gap > 0
            ? (_isNeg ? `Melebihi batas target ${gap.toFixed(2)} ${esc(ind.satuan||'')}` : `Kurang ${gap.toFixed(2)} ${esc(ind.satuan||'')}`)
            : 'Target terpenuhi'))
    : '-';

  
  
  
  const bulanChartData = (() => {
    if (_kwModePerTahun && _kwTahunList.length > 0) {
      
      return _kwTahunList.map(thn => {
        const rekapTahun = _kwAllRekap[thn] || {};
        let latestRec = null;
        for (let b = 12; b >= 1; b--) {
          const rec = (rekapTahun['b' + b] || []).find(r => r.id === ind.id);
          if (rec && rec.realisasi !== null && rec.realisasi !== undefined && rec.realisasi !== '') {
            latestRec = { ...rec, bulan: b, tahun: thn };
            break;
          }
        }
        const _rvVal = latestRec ? parseFloat(latestRec.realisasi) : null;
        const _tgtInfoThn = _kwTargetFromRekap(ind.id, thn);
        const _tgtThn = _tgtInfoThn ? _kwTargetNumForInd({ ...ind, ...(_tgtInfoThn) }) : target;
        const _cvCalc = _kwHitungCapaian(_rvVal, _tgtThn, ind.bermakna_negatif);
        return {
          bulan:     latestRec?.bulan || 12,
          tahun:     thn,
          label:     String(thn),
          realisasi: (_rvVal !== null && !isNaN(_rvVal)) ? _rvVal : null,
          realisasi_display: latestRec?.realisasi_display ?? null,
          capaian:   (_cvCalc !== null && !isNaN(_cvCalc)) ? _cvCalc : null,
          isInRange: true,
        };
      });
    }
    // Normal: per bulan dari rangePairs
    return rangePairs.map(p => {
      const rec = (_kwAllRekap[p.tahun]?.['b' + p.bulan] || []).find(r => r.id === ind.id);
      const _rc = v => (v !== null && v !== undefined && v !== '') ? parseFloat(v) : null;
      const _rv = _rc(rec?.realisasi);
      const multiTahun = (_kwRangeFrom?.tahun !== _kwRangeTo?.tahun);
      const _rvVal = (_rv !== null && !isNaN(_rv)) ? _rv : null;
      const _tgtInfoP = multiTahun ? _kwTargetFromRekap(ind.id, p.tahun) : null;
      const _tgtP = _tgtInfoP ? _kwTargetNumForInd({ ...ind, ...(_tgtInfoP) }) : target;
      const _cvCalc = _kwHitungCapaian(_rvVal, _tgtP, ind.bermakna_negatif);
      return {
        bulan:       p.bulan,
        tahun:       p.tahun,
        label:       multiTahun ? `${_KW_BULAN_LABEL[p.bulan]} '${String(p.tahun).slice(-2)}` : _KW_BULAN_LABEL[p.bulan],
        realisasi:   _rvVal,
        realisasi_display: rec?.realisasi_display ?? null,
        capaian:     (_cvCalc !== null && !isNaN(_cvCalc)) ? _cvCalc : null,
        isInRange:   true,
      };
    });
  })();
  // Untuk sparkline & proyeksi - pakai semua 12 bulan dari tahun akhir range
  const bulanChartDataFull = Array.from({length:4}, (_, i) => {
    const b   = (i + 1) * 3;
    const rec = (_kwAllRekap[tahun]?.['b' + b] || []).find(r => r.id === ind.id);
    const _rc = v => (v !== null && v !== undefined && v !== '') ? parseFloat(v) : null;
    const _rv = _rc(rec?.realisasi);
    const _rvVal = (_rv !== null && !isNaN(_rv)) ? _rv : null;
    const _cvCalc = _kwHitungCapaian(_rvVal, target, ind.bermakna_negatif);
    return {
      bulan: b, tahun, label: _KW_BULAN_LABEL[b],
      realisasi: _rvVal,
      capaian:   (_cvCalc !== null && !isNaN(_cvCalc)) ? _cvCalc : null,
      isInRange: bulanList.includes(b),
    };
  });

  // Data diisi count dalam range
  const dataCount = bulanChartData.filter(d => d.realisasi !== null).length;

  // ── Gauge ──────────────────────────────────────────────────────────────────
  const gauge = _kwGauge(cap, col, colBg);

  // ── Bar chart per bulan (pakai data range yg mungkin lintas tahun) ────────
  const barChart = _kwBarChart(bulanChartData, bulanList, target);

  // ── Tabel per periode ──────────────────────────────────────────────────────
  const nowBulan = _dTwSekarang();
  const nowTahun = new Date().getFullYear();
  const tableRows = bulanChartData
    .map(d => {
      const c  = d.capaian !== null ? parseFloat(d.capaian).toFixed(1) : null;
      const tc = _kwCapaianColor(d.capaian);
      const barW = c !== null ? Math.min(c, 100) : 0;
      const isFuture  = d.tahun > nowTahun || (d.tahun === nowTahun && d.bulan > nowBulan);
      const isActive  = d.realisasi !== null;
      const rowClass  = isActive ? 'kw-tw-row kw-tw-row--active' : (isFuture ? 'kw-tw-row kw-tw-row--future' : 'kw-tw-row');
      const rowLabel  = (_kwRangeFrom?.tahun !== _kwRangeTo?.tahun)
        ? `${_KW_BULAN_FULL[d.bulan]} ${d.tahun}`
        : _KW_BULAN_FULL[d.bulan];
      return `
        <div class="${rowClass}">
          <span class="kw-tw-label">${rowLabel}</span>
          <span class="kw-tw-real">${d.realisasi !== null ? fmtReal(d.realisasi, d.realisasi_display) + ' ' + esc(ind.satuan||'') : isFuture ? '<span class="kw-future-tag">–</span>' : '-'}</span>
          <span class="kw-tw-cap-wrap">
            <span class="kw-tw-cap" style="color:${tc}">${c !== null ? c+'%' : '-'}</span>
            ${c !== null ? `<span class="kw-tw-minibar-wrap"><span class="kw-tw-minibar" style="width:${barW}%;background:${tc}"></span></span>` : ''}
          </span>
        </div>`;
    }).join('');

  // ── KPI Strip: 4 kartu horizontal ──────────────────────────────────────────
  const periodShortLabel = (() => {
    if (!_kwRangeFrom || !_kwRangeTo) return '-';
    if (_kwRangeFrom.key === _kwRangeTo.key) return `${_KW_BULAN_LABEL[_kwRangeFrom.bulan]} ${_kwRangeFrom.tahun}`;
    return `${_KW_BULAN_LABEL[_kwRangeFrom.bulan]}'${String(_kwRangeFrom.tahun).slice(-2)}–${_KW_BULAN_LABEL[_kwRangeTo.bulan]}'${String(_kwRangeTo.tahun).slice(-2)}`;
  })();
  const gapDisplay = gap !== null ? (gap > 0 ? `+${gap.toFixed(2)} ${esc(ind.satuan||'')}` : `Terpenuhi <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-1px"><path d="M20 6 9 17l-5-5"/></svg>`) : '-';
  const gapColor   = gap === null ? '#94a3b8' : gap > 0 ? '#ef4444' : '#10b981';
  const dataStatus = dataCount === rangePairs.length ? 'Lengkap' : dataCount === 0 ? 'Perlu input' : `${dataCount}/${rangePairs.length}`;
  const dataStatusColor = dataCount === 0 ? '#ef4444' : dataCount < rangePairs.length ? '#f59e0b' : '#10b981';

  
  const sparkVals = bulanChartData.map(d => d.capaian);
  const sparkLine = (() => {
    const W2 = 80, H2 = 24;
    const pts = sparkVals.map((v, i) => {
      const x = sparkVals.length > 1 ? (i / (sparkVals.length - 1)) * W2 : W2 / 2;
      const y = v !== null ? H2 - (Math.min(v, 120) / 120) * H2 : null;
      return { x, y, v };
    }).filter(p => p.y !== null);
    if (pts.length < 2) return '';
    const d = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
    return `<svg viewBox="0 0 ${W2} ${H2}" width="${W2}" height="${H2}" style="display:inline-block;vertical-align:middle;margin-left:6px"><path d="${d}" fill="none" stroke="${col}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" opacity=".7"/><circle cx="${pts[pts.length-1].x.toFixed(1)}" cy="${pts[pts.length-1].y.toFixed(1)}" r="2.5" fill="${col}"/></svg>`;
  })();

  // ── Proyeksi rata-rata dari data range ────────────────────────────────────
  const filledData = bulanChartData.filter(d => d.capaian !== null);
  const lastFilledBulan = filledData.length ? filledData[filledData.length - 1].bulan : null;
  const avgCapaian = filledData.length ? filledData.reduce((s, d) => s + d.capaian, 0) / filledData.length : null;
  const proyeksiColor = _kwCapaianColor(avgCapaian);

  // ── Combo chart: bar realisasi + line capaian (semua mode, termasuk per tahun) ──
  _activeChartFs = _KW_CHART_FS;
  const comboChart = _kwComboChart(bulanChartData, bulanList, target, targetDisplay, ind.satuan, isPredikatInd);

  // ── KPI strip: 4 kartu baru ────────────────────────────────────────────────
  const summaryCards = `
    <div class="kw-kpi-grid-v2">
      <div class="kw-kpi-card kw-kpi-card--hero" style="--kc:${col};--kc-bg:${colBg}">
        <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:4px;margin-top:0">
          <div>
            <div style="font-size:0.7rem;font-weight:700;text-transform:uppercase;letter-spacing:.07em;color:#94a3b8;margin-bottom:4px">Capaian ${periodShortLabel}</div>
            <div style="font-size:1.8rem;font-weight:900;color:${col};line-height:1;letter-spacing:-.03em">${pctRaw !== null ? pctRaw+'%' : '-'}</div>
            <div style="margin-top:5px;font-size:0.7rem;font-weight:600;color:${col};display:flex;align-items:center;gap:4px">
              <span style="display:inline-block;width:7px;height:7px;border-radius:50%;background:${col}"></span>${label}
            </div>
          </div>
          ${sparkLine ? `<div style="opacity:.8">${sparkLine}</div>` : ''}
        </div>
        <div style="margin-top:8px">
          <div style="height:5px;border-radius:99px;background:${colBg};overflow:hidden">
            <div style="height:100%;border-radius:99px;background:${col};width:${pct ?? 0}%;transition:width .5s ease"></div>
          </div>
          <div style="display:flex;justify-content:space-between;font-size:0.75rem;color:#94a3b8;margin-top:4px"><span>0%</span><span>50%</span><span>100%</span></div>
        </div>
      </div>

      <div class="kw-kpi-card" style="--kc:#3b82f6">
        <div style="margin-top:0">
          <div style="font-size:0.7rem;font-weight:700;text-transform:uppercase;letter-spacing:.07em;color:#94a3b8;margin-bottom:4px">Realisasi</div>
          <div style="font-size:1.8rem;font-weight:800;color:#0f172a;line-height:1;letter-spacing:-.02em">${fmtReal(real, realDisp)}</div>
          <div style="font-size:0.75rem;color:#64748b;margin-top:4px">Satuan: <b>${esc(ind.satuan||'–')}</b></div>
        </div>
        <div style="margin-top:10px;padding-top:8px;border-top:1px solid #f1f5f9;display:flex;justify-content:space-between;align-items:center">
          <div style="font-size:0.78rem;color:#94a3b8">Target Tahun</div>
          <div style="font-size:1rem;font-weight:700;color:#3b82f6">${targetDisplay !== null ? targetDisplay : '-'}</div>
        </div>
      </div>

      <div class="kw-kpi-card" style="--kc:${gapColor}">
        <div style="margin-top:0">
          <div style="font-size:0.7rem;font-weight:700;text-transform:uppercase;letter-spacing:.07em;color:#94a3b8;margin-bottom:4px">Gap ke Target</div>
          <div style="font-size:1.8rem;font-weight:800;color:${gapColor};line-height:1;letter-spacing:-.02em">${gap !== null ? (gap > 0 ? '+'+(isPredikatInd ? Math.round(gap) : parseFloat(gap).toFixed(2)) : '<svg xmlns="http://www.w3.org/2000/svg" width="30" height="30" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="display:block"><circle cx="12" cy="12" r="10"/><path d="m8 12.5 3 3 5-6"/></svg>') : '-'}</div>
          <div style="font-size:0.75rem;color:${gapColor};margin-top:4px;font-weight:600">${gap === null ? 'Data kosong' : gap > 0 ? (_isNeg ? 'Perlu diturunkan' : 'Perlu ditingkatkan') : 'Target tercapai'}</div>
        </div>
        <div style="margin-top:10px;padding-top:8px;border-top:1px solid #f1f5f9;display:flex;justify-content:space-between;align-items:center">
          <div style="font-size:0.78rem;color:#94a3b8">Rata-rata capaian</div>
          <div style="font-size:1rem;font-weight:700;color:${proyeksiColor}">${avgCapaian !== null ? parseFloat(avgCapaian).toFixed(1)+'%' : '-'}</div>
        </div>
      </div>

      <div class="kw-kpi-card" style="--kc:${dataStatusColor}">
        <div style="margin-top:0">
          <div style="font-size:0.7rem;font-weight:700;text-transform:uppercase;letter-spacing:.07em;color:#94a3b8;margin-bottom:4px">Data Diisi</div>
          <div style="font-size:1.8rem;font-weight:800;color:${dataStatusColor};line-height:1;letter-spacing:-.02em">${dataCount}<span style="font-size:0.9rem;font-weight:400;color:#94a3b8"> / ${rangePairs.length}</span></div>
          <div style="font-size:0.75rem;color:${dataStatusColor};margin-top:4px;font-weight:600">${dataCount === 0 ? 'Perlu input' : dataCount < rangePairs.length ? 'Sebagian terisi' : 'Lengkap'}</div>
        </div>
        <div style="margin-top:10px">
          <div style="height:4px;border-radius:99px;background:#f1f5f9;overflow:hidden">
            <div style="height:100%;border-radius:99px;background:${dataStatusColor};width:${rangePairs.length > 0 ? Math.round(dataCount/rangePairs.length*100) : 0}%;transition:width .5s"></div>
          </div>
        </div>
      </div>
    </div>`;

  // ── Build full body ────────────────────────────────────────────────────────
  html += summaryCards;

  html += `
    <div class="kw-body-redesign">

      <!-- Kiri: Gauge besar + stat row + tabel bulan -->
      <div class="kw-col-left">

        <!-- Gauge card -->
        <div class="kw-card-panel">
          <div class="kw-panel-title">
            <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
            Status Capaian
          </div>
          <div style="display:flex;align-items:center;justify-content:center;gap:16px;flex-wrap:wrap">
            <div style="flex-shrink:0;align-self:center;display:flex;align-items:center;justify-content:center">${gauge}</div>
            <div style="flex:1;min-width:120px">
              <div style="font-size:0.63rem;text-transform:uppercase;letter-spacing:.07em;color:#94a3b8;font-weight:700;margin-bottom:2px">Realisasi</div>
              <div style="font-size:1.7rem;font-weight:900;color:#0f172a;letter-spacing:-.02em">${fmtReal(real, realDisp)} <span style="font-size:0.75rem;color:#94a3b8;font-weight:400">${esc(ind.satuan||'')}</span></div>
              <div style="margin:8px 0 2px;font-size:0.63rem;text-transform:uppercase;letter-spacing:.07em;color:#94a3b8;font-weight:700">Target</div>
              <div style="font-size:1.7rem;font-weight:900;color:#3b82f6;letter-spacing:-.02em">${targetDisplay !== null ? targetDisplay : '-'} <span style="font-size:0.75rem;color:#94a3b8;font-weight:400">${esc(ind.satuan||'')}</span></div>
              <div style="margin-top:10px">
                <div class="kw-gauge-label" style="color:${col};background:${colBg};border:1px solid ${col}30;display:inline-flex">${label}</div>
              </div>
            </div>
          </div>

          <!-- Progress bar styled -->
          <div style="margin-top:12px">
            <div style="display:flex;justify-content:space-between;font-size:0.85rem;font-weight:600;color:#475569;margin-bottom:6px">
              <span>Progress ke Target</span>
              <span style="color:${col}">${pct !== null ? parseFloat(pct).toFixed(1)+'%' : '-'}</span>
            </div>
            <div style="height:10px;border-radius:99px;background:${colBg};overflow:hidden;position:relative">
              <div style="height:100%;border-radius:99px;background:linear-gradient(90deg,${col}aa,${col});width:${pct ?? 0}%;transition:width .5s ease"></div>
              <div style="position:absolute;top:0;bottom:0;left:75%;width:2px;background:rgba(0,0,0,.12);border-radius:2px"></div>
            </div>
            <div style="display:flex;justify-content:space-between;font-size:0.75rem;color:#cbd5e1;margin-top:4px"><span>0%</span><span>25%</span><span>50%</span><span>75%</span><span>100%</span></div>
          </div>

          ${gap !== null ? `
          <div style="margin-top:10px;padding:8px 12px;border-radius:10px;font-size:0.75rem;font-weight:600;display:flex;align-items:center;gap:7px;color:${gap > 0 ? '#ef4444' : '#10b981'};background:${gap > 0 ? '#fef2f2' : '#f0fdf4'};border:1px solid ${gap > 0 ? '#fecaca' : '#bbf7d0'}">
            ${gap > 0
              ? '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="m10.29 3.86-8.18 14.14A2 2 0 0 0 3.84 21h16.32a2 2 0 0 0 1.73-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>'
              : '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="m8 12.5 3 3 5-6"/></svg>'}${gapStr}
          </div>` : ''}
        </div>

        <!-- Tabel bulan -->
        ${bulanChartData.length ? `
        <div class="kw-card-panel" style="padding:0;overflow:hidden">
          <div style="padding:10px 14px 8px;border-bottom:1px solid #f1f5f9">
            <div class="kw-panel-title" style="margin-bottom:0">
              <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 2v4"/><path d="M16 2v4"/><rect width="18" height="18" x="3" y="4" rx="2"/><path d="M3 10h18"/><path d="M8 14h.01"/><path d="M12 14h.01"/><path d="M16 14h.01"/><path d="M8 18h.01"/><path d="M12 18h.01"/><path d="M16 18h.01"/></svg>
              ${_kwModePerTahun ? 'Capaian per Tahun' : 'Data per Periode'}
            </div>
          </div>
          <table class="kw-month-table-v2" style="margin-top:0">
            <thead><tr>
              <th style="padding-left:14px">Periode</th>
              <th>Realisasi</th>
              <th>Target</th>
              <th>Capaian</th>
            </tr></thead>
            <tbody>${
              bulanChartData.map(d => {
                const c  = d.capaian !== null ? parseFloat(d.capaian).toFixed(1) : null;
                const tc = _kwCapaianColor(d.capaian);
                const cellLabel = _kwModePerTahun
                  ? d.label   
                  : (_kwRangeFrom?.tahun !== _kwRangeTo?.tahun)
                    ? `${_KW_BULAN_FULL[d.bulan]} ${d.tahun}`
                    : _KW_BULAN_FULL[d.bulan];
                const isFuture = _kwModePerTahun
                  ? d.tahun > new Date().getFullYear()
                  : d.tahun > new Date().getFullYear() || (d.tahun === new Date().getFullYear() && d.bulan > _dTwSekarang());
                const isActive = d.realisasi !== null;
                const barPct   = c !== null ? Math.min(parseFloat(c), 100) : 0;
                return `<tr style="${isActive ? 'background:#f0fdf4' : isFuture ? 'opacity:.45' : ''}">
                  <td style="padding-left:14px"><div class="kw-month-label-cell">
                    <span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${isActive ? '#0d9488' : '#e2e8f0'};flex-shrink:0"></span>
                    <span style="font-weight:${isActive?'700':'400'}">${cellLabel}</span>
                  </div></td>
                  <td style="font-weight:${isActive?'700':'400'};color:${isActive?'#0f172a':'#94a3b8'}">${d.realisasi !== null ? fmtReal(d.realisasi, d.realisasi_display) : '<span style="color:#cbd5e1">–</span>'}</td>
                  <td style="color:#3b82f6;font-weight:600">${targetDisplay !== null ? targetDisplay : '<span style="color:#cbd5e1">–</span>'}</td>
                  <td>
                    ${c !== null ? `
                    <div style="display:flex;align-items:center;gap:6px">
                      <span class="kw-cap-pill-v2" style="background:${tc}20;color:${tc};font-weight:700;min-width:40px;text-align:center">${c}%</span>
                      <div style="flex:1;height:4px;border-radius:99px;background:#f1f5f9;min-width:36px"><div style="height:100%;border-radius:99px;background:${tc};width:${barPct}%"></div></div>
                    </div>` : '<span style="color:#cbd5e1">–</span>'}
                  </td>
                </tr>`;
              }).join('')
            }</tbody>
          </table>
          <div style="padding:8px 14px;display:flex;gap:14px;font-size:.63rem;color:#94a3b8;border-top:1px solid #f8fafc">
            <span style="display:flex;align-items:center;gap:4px"><span style="display:inline-block;width:7px;height:7px;border-radius:50%;background:#0d9488"></span>Data terisi</span>
            <span style="display:flex;align-items:center;gap:4px"><span style="display:inline-block;width:7px;height:7px;border-radius:50%;background:#e2e8f0;border:1px solid #cbd5e1"></span>Belum bisa diisi</span>
          </div>
        </div>` : ''}

      </div>

      <!-- Kanan: combo chart + permasalahan + solusi -->
      <div class="kw-col-right">

        <!-- Combo chart card -->
        <div class="kw-card-panel" style="padding-bottom:8px">
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;flex-wrap:wrap;gap:6px">
            <div class="kw-panel-title" style="margin-bottom:0">
              <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/></svg>
              Tren Realisasi & Capaian ${_kwModePerTahun ? '(Semua Tahun)' : tahun}
            </div>
            <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap">
              <!-- Chart type dropdown -->
              ${(() => {
                const _radarDataCount = bulanChartData.filter(d => d.isInRange).length;
                const _radarAvail = _radarDataCount >= 3;
                if (!_radarAvail && _kwChartType === 'radar') _kwChartType = 'bar';
                const chartItems = [
                  {val:'line',  label:'Line'},
                  {val:'bar',   label:'Bar'},
                  {val:'area',  label:'Area'},
                  {val:'bullet', label:'Bullet'},
                  ...(_radarAvail ? [{val:'radar', label:'Radar'}] : []),
                ];
                return `<div style="display:flex;align-items:center;gap:6px">
                  <span style="font-size:0.63rem;font-weight:600;color:#94a3b8;text-transform:uppercase;letter-spacing:.06em">Tipe Chart</span>
                  ${_kwCdd('kwChartTypeDd', chartItems, _kwChartType, '_kwSetChartType', {minW:'90px'})}
                </div>`;
              })()}
              <!-- Legend -->
              ${(() => {
                const tVal = target !== null ? parseFloat(target) : null;
                const t75  = tVal !== null ? (tVal * 0.75).toFixed(1).replace(/\.0$/,'') : null;
                const tLbl = targetDisplay !== null ? targetDisplay : (tVal !== null ? tVal : null);
                const dot  = (r, bg) => `<span style="display:inline-block;width:${r};border-radius:2px;background:${bg}"></span>`;
                const dotR = (bg) => `<span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:${bg}"></span>`;
                const item = (swatch, label) => `<span style="display:flex;align-items:center;gap:4px">${swatch}${label}</span>`;

                if (_kwChartType === 'bullet') {
                  return `<div style="display:flex;gap:10px;font-size:0.63rem;font-weight:600;color:#64748b;flex-wrap:wrap;align-items:center">
                    ${item(`<span style="display:inline-block;width:14px;height:8px;border-radius:2px;background:#fef2f2;border:1px solid #fecaca"></span>`, tVal !== null ? `&lt; ${t75}` : 'Di bawah 75% target')}
                    ${item(`<span style="display:inline-block;width:14px;height:8px;border-radius:2px;background:#fffbeb;border:1px solid #fde68a"></span>`, tVal !== null ? `${t75}–${tLbl}` : '75–100% target')}
                    ${item(`<span style="display:inline-block;width:14px;height:8px;border-radius:2px;background:#f0fdf4;border:1px solid #bbf7d0"></span>`, tVal !== null ? `≥ ${tLbl}` : 'Tercapai')}
                    ${item(`<span style="display:inline-block;width:4px;height:12px;border-radius:2px;background:#6366f1"></span>`, tLbl !== null ? `Target (${tLbl})` : 'Target')}
                  </div>`;
                }
                if (_kwChartType === 'radar') {
                  return `<div style="display:flex;gap:10px;font-size:0.63rem;font-weight:600;color:#64748b;flex-wrap:wrap;align-items:center">
                    ${item(dotR('#10b981'), tVal !== null ? `≥ ${tLbl}` : '≥ Target')}
                    ${item(dotR('#f59e0b'), tVal !== null ? `${t75}–${tLbl}` : '75–100% target')}
                    ${item(dotR('#ef4444'), tVal !== null ? `&lt; ${t75}` : '&lt; 75% target')}
                    ${item(`<span style="display:inline-block;width:14px;height:0;border-top:2px dashed #6366f1"></span>`, tLbl !== null ? `Target (${tLbl})` : 'Target')}
                  </div>`;
                }
                
                return `<div style="display:flex;gap:10px;font-size:0.63rem;font-weight:600;color:#64748b;flex-wrap:wrap;align-items:center">
                  ${item(`<span style="display:inline-block;width:10px;height:10px;border-radius:2px;background:#10b981"></span>`, tVal !== null ? `≥ ${tLbl}` : '≥ Target')}
                  ${item(`<span style="display:inline-block;width:10px;height:10px;border-radius:2px;background:#f59e0b"></span>`, tVal !== null ? `${t75}–${tLbl}` : '75–100% target')}
                  ${item(`<span style="display:inline-block;width:10px;height:10px;border-radius:2px;background:#ef4444"></span>`, tVal !== null ? `&lt; ${t75}` : '&lt; 75% target')}
                  ${item(`<span style="display:inline-block;width:14px;height:0;border-top:2px dashed #6366f1"></span>`, tLbl !== null ? `Target (${tLbl})` : 'Target')}
                </div>`;
              })()}
            </div>
          </div>
          ${comboChart}
        </div>

        <!-- Permasalahan & Solusi per Triwulan -->
        ${(() => {
          
          
          
          const psItems = bulanChartData.map(d => {
            const rec = (_kwAllRekap[d.tahun]?.['b'+d.bulan]||[]).find(r=>r.id===ind.id);
            if (!rec) return null;
            const tercapai = d.capaian !== null && d.capaian >= 100;
            const primary   = tercapai ? (rec.f_pendukung || null) : (rec.f_penghambat || null);
            const secondary = tercapai ? (rec.rencana_tl   || null) : (rec.solusi        || null);
            if (!primary && !secondary) return null;
            return {
              label: d.label,
              tercapai,
              primaryLabel:   tercapai ? 'Faktor Pendukung'    : 'Faktor Penghambat',
              secondaryLabel: tercapai ? 'Rencana Tindak Lanjut' : 'Solusi',
              primaryCls:     tercapai ? 'pendukung' : 'masalah',
              secondaryCls:   tercapai ? 'rencana'   : 'solusi',
              primary, secondary,
            };
          }).filter(Boolean);

          const panelHeader = `
            <div style="padding:10px 14px 8px;border-bottom:1px solid #f1f5f9;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:6px">
              <div class="kw-panel-title" style="margin-bottom:0">
                <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 3v18h18"/><path d="M18 17V9"/><path d="M13 17V5"/><path d="M8 17v-3"/></svg>
                Analisis Capaian per Triwulan
              </div>
              <div style="display:flex;gap:10px;font-size:0.63rem;font-weight:600;color:#64748b;flex-wrap:wrap">
                <span style="display:flex;align-items:center;gap:4px;color:#f97316">
                  <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3"/><line x1="12" x2="12" y1="9" y2="13"/><line x1="12" x2="12.01" y1="17" y2="17"/></svg>
                  Faktor Penghambat
                </span>
                <span style="display:flex;align-items:center;gap:4px;color:#0d9488">
                  <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><path d="m9 11 3 3L22 4"/></svg>
                  Solusi
                </span>
                <span style="display:flex;align-items:center;gap:4px;color:#3b82f6">
                  <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M7 20v-6M12 20V10M17 20V4"/></svg>
                  Faktor Pendukung
                </span>
                <span style="display:flex;align-items:center;gap:4px;color:#8b5cf6">
                  <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="8" y="2" width="8" height="4" rx="1" ry="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><path d="m9 14 2 2 4-4"/></svg>
                  Rencana Tindak Lanjut
                </span>
              </div>
            </div>`;

          if (!psItems.length) return `
            <div class="kw-card-panel" style="padding:0;overflow:hidden">
              ${panelHeader}
              <div style="padding:14px">
                <div class="kw-detail-box kw-ok" style="margin-top:0">
                  <div class="kw-detail-label" style="color:${real !== null ? '#10b981' : '#94a3b8'}">
                    <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><path d="m9 11 3 3L22 4"/></svg>
                    ${real !== null ? 'Tidak ada catatan dilaporkan' : 'Data belum diisi untuk periode ini'}
                  </div>
                </div>
              </div>
            </div>`;
          const accId = 'kwPsAcc_' + ind.id;
          return `<div class="kw-card-panel" style="padding:0;overflow:hidden">
            ${panelHeader}
            <div class="kw-ps-wrap" id="${accId}" style="border:none;border-radius:0;margin:0">
            ${psItems.map((item, idx) => {
              const itemId = accId + '_' + idx;
              const openByDefault = idx === psItems.length - 1; // buka bulan terakhir secara default
              return `
            <div class="kw-ps-acc-item${openByDefault ? ' kw-ps-acc-open' : ''}">
              <button type="button" class="kw-ps-acc-header" onclick="_kwToggleAcc(this)" aria-expanded="${openByDefault}" aria-controls="${itemId}">
                <span class="kw-ps-acc-month">${esc(item.label)}</span>
                <span class="kw-ps-acc-dots">
                  ${item.primary   ? `<span class="kw-ps-dot kw-ps-dot--${item.primaryCls}" data-tip="${esc(item.primaryLabel)}"></span>` : ''}
                  ${item.secondary ? `<span class="kw-ps-dot kw-ps-dot--${item.secondaryCls}" data-tip="${esc(item.secondaryLabel)}"></span>` : ''}
                </span>
                <svg class="kw-ps-acc-chevron" xmlns="http://www.w3.org/2000/svg" width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7"/></svg>
              </button>
              <div class="kw-ps-acc-body" id="${itemId}" ${openByDefault ? '' : 'hidden'}>
                ${item.primary ? `
                <div class="kw-detail-box kw-${item.primaryCls}" style="margin-bottom:${item.secondary?'6px':'0'}">
                  <div class="kw-detail-label"${item.tercapai ? ' style="color:#1d4ed8"' : ''}>
                    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${item.tercapai ? '<path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><path d="m9 11 3 3L22 4"/>' : '<path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3"/><line x1="12" x2="12" y1="9" y2="13"/><line x1="12" x2="12.01" y1="17" y2="17"/>'}</svg>
                    ${esc(item.primaryLabel)}
                  </div>
                  <div class="kw-detail-text"${item.tercapai ? ' style="color:#1e3a8a"' : ''}>${esc(item.primary)}</div>
                </div>` : ''}
                ${item.secondary ? `
                <div class="kw-detail-box kw-${item.secondaryCls}">
                  <div class="kw-detail-label" style="color:${item.tercapai ? '#6d28d9' : '#0f766e'}">
                    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${item.tercapai ? '<path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><path d="m9 11 3 3L22 4"/>' : '<path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3"/><line x1="12" x2="12" y1="9" y2="13"/><line x1="12" x2="12.01" y1="17" y2="17"/>'}</svg>
                    ${esc(item.secondaryLabel)}
                  </div>
                  <div class="kw-detail-text" style="color:${item.tercapai ? '#4c1d95' : '#134e4a'}">${esc(item.secondary)}</div>
                </div>` : (!item.primary ? `
                <div style="font-size:0.75rem;color:#94a3b8;font-style:italic;padding:2px 0">Belum ada ${item.tercapai ? 'rencana tindak lanjut' : 'solusi'} dilaporkan</div>` : '')}
              </div>
            </div>${idx < psItems.length-1 ? '<hr class="kw-ps-divider">' : ''}`;
            }).join('')}
          </div></div>`;
        })()}

      </div>
    </div>
  </div>`;

  el.innerHTML = html;
}

// ── Donut chart SVG ────────────────────────────────────────────────────────────
function _kwGauge(pct, col, colBg) {
  const cx = 110, cy = 110, R = 82, strokeW = 13;
  const safePct = pct !== null ? Math.min(Math.max(pct, 0), 100) : 0;
  const circ = 2 * Math.PI * R;
  const filled = circ * (safePct / 100);
  const empty  = circ - filled;
  const trackCol = colBg || (pct === null ? '#f1f5f9' : '#fee2e2');
  const toRad = d => d * Math.PI / 180;
  const segments = ''; // garis pemisah dihilangkan
  const endA = toRad(-90 + 360 * safePct / 100);
  const dotX = (cx + R * Math.cos(endA)).toFixed(1);
  const dotY = (cy + R * Math.sin(endA)).toFixed(1);
  return `
    <svg viewBox="0 0 220 220" width="245" height="245" style="display:block;margin:0 auto">
      <circle cx="${cx}" cy="${cy}" r="${R}" fill="none" stroke="${trackCol}" stroke-width="${strokeW}"/>
      ${safePct > 0 ? `<circle cx="${cx}" cy="${cy}" r="${R}" fill="none" stroke="${col}" stroke-width="${strokeW}" stroke-linecap="round" stroke-dasharray="${filled.toFixed(2)} ${empty.toFixed(2)}" transform="rotate(-90 ${cx} ${cy})" opacity=".95"/>` : ''}
      ${safePct > 0 && safePct < 100 ? `<circle cx="${dotX}" cy="${dotY}" r="9" fill="${col}" opacity=".25"/>` : ''}
      ${segments}
      <text x="${cx}" y="${cy - 6}" text-anchor="middle" font-size="${pct !== null && parseFloat(pct).toFixed(1).length >= 5 ? 28 : 34}" font-weight="800" fill="${pct !== null ? col : '#94a3b8'}" style="font-family:inherit">${pct !== null ? parseFloat(pct).toFixed(1)+'%' : '-'}</text>
      <text x="${cx}" y="${cy + 16}" text-anchor="middle" font-size="${11*_activeChartFs}" fill="#b0bec5" letter-spacing="2" style="text-transform:uppercase;font-family:inherit">CAPAIAN</text>
    </svg>`;
}
// ── (legacy stub, replaced above) ─────────────────────────────────────────────

// ── Bar chart per bulan (baru, menggantikan line chart TW) ────────────────────
function _kwBarChart(data, activeRange, target) {
  const W = 660, H = 365, PL = 46, PR = 18, PT = 26, PB = 46;
  const iW = W - PL - PR, iH = H - PT - PB;

  const tgtF  = target !== null && target !== undefined ? parseFloat(target) : null;
  const rVals = data.map(d => d.realisasi).filter(v => v !== null).map(Number);
  const maxV  = tgtF !== null
    ? Math.max(tgtF * 1.15, ...rVals, 0.1)
    : Math.max(...rVals, 0.1) * 1.15;

  const n     = data.length || 12;
  const barW  = (iW / n) * 0.65;
  const xOf   = i => PL + (i + 0.5) * (iW / n);
  const yOf   = v => PT + iH - (v / maxV) * iH;

  // Grid Y
  const y0 = yOf(0);
  let grid = '<line x1="' + PL + '" y1="' + y0.toFixed(1) + '" x2="' + (W-PR) + '" y2="' + y0.toFixed(1) + '" stroke="#e2e8f0" stroke-width=".6"/>';

  // Garis target pada nilai absolut target
  if (tgtF !== null) {
    const yTgt = yOf(Math.min(tgtF, maxV)).toFixed(1);
    grid += '<line x1="' + PL + '" y1="' + yTgt + '" x2="' + (W - PR) + '" y2="' + yTgt + '" stroke="#6366f1" stroke-width="1.2" stroke-dasharray="5,3" opacity=".85"/>';
  }

  // Bars
  let bars = '', xlbls = '';
  data.forEach((d, i) => {
    const x       = xOf(i);
    const isRange = d.isInRange;
    const lbl     = d.label;

    if (isRange) {
      xlbls += `<rect x="${(x-14).toFixed(1)}" y="${(H-PB+4).toFixed(1)}" width="28" height="16" rx="8" fill="#0d9488" opacity=".13"/>`;
    }
    xlbls += `<text x="${x.toFixed(1)}" y="${(H-PB+16).toFixed(1)}" text-anchor="middle" font-size="${11*_activeChartFs}" fill="#0d9488" font-weight="700">${lbl}</text>`;

    if (d.realisasi !== null) {
      const rv  = Number(d.realisasi);
      const col = tgtF !== null ? (rv >= tgtF ? '#10b981' : rv >= tgtF * 0.75 ? '#f59e0b' : '#ef4444') : '#0d9488';
      const cc  = isRange ? col : 'rgba(148,163,184,0.28)';
      const y   = yOf(Math.min(rv, maxV));
      const bH  = (PT + iH) - y;
      bars += `<rect x="${(x - barW/2).toFixed(1)}" y="${y.toFixed(1)}" width="${barW.toFixed(1)}" height="${bH.toFixed(1)}" rx="3" fill="${cc}"/>`;
      if (isRange) {
        const valStr = rv.toFixed(2);
        const bwv = valStr.length * 6.5 + 10;
        bars += `<rect x="${(x-bwv/2).toFixed(1)}" y="${(y-20).toFixed(1)}" width="${bwv}" height="14" rx="7" fill="${col}" opacity=".13"/>`;
        bars += `<text x="${x.toFixed(1)}" y="${(y-11).toFixed(1)}" text-anchor="middle" font-size="${11*_activeChartFs}" fill="${col}" font-weight="700">${valStr}</text>`;
      }
    } else if (isRange) {
      bars += `<line x1="${x.toFixed(1)}" y1="${(PT+6).toFixed(1)}" x2="${x.toFixed(1)}" y2="${(PT+iH-4).toFixed(1)}" stroke="#cbd5e1" stroke-width="1.5" stroke-dasharray="3,3"/>`;
    }
  });

  return `
    <svg viewBox="0 0 ${W} ${H}" width="100%" height="365" style="overflow:visible">
      ${grid}${bars}${xlbls}
    </svg>`;
}

function _kwComboChart(data, activeRange, target, targetDisplay, satuan, isPredikat = false) {
  
  if (_kwChartType === 'bar')    return _kwChartBar(data, activeRange, target, targetDisplay, satuan, isPredikat);
  if (_kwChartType === 'line')   return _kwChartLine(data, activeRange, target, targetDisplay, satuan, isPredikat);
  if (_kwChartType === 'area')   return _kwChartArea(data, activeRange, target, targetDisplay, satuan, isPredikat);
  if (_kwChartType === 'radar')  return _kwChartRadar(data, activeRange, target, targetDisplay, satuan, isPredikat);
  if (_kwChartType === 'bullet') return _kwChartBullet(data, activeRange, target, targetDisplay, satuan, isPredikat);
  
  return _kwChartBar(data, activeRange, target, targetDisplay, satuan, isPredikat);
}

function _kwChartBullet(data, activeRange, target, targetDisplay, satuan, isPredikat = false) {
  
  
  
  
  

  const tgt = target !== null ? parseFloat(target) : null;

  
  const rows = data.filter(d => d.isInRange);
  if (!rows.length) return '<div class="kw-empty">Belum ada data</div>';

  const W = 660, ROW_H = 18, ROW_GAP = 4;
  const PL = 48, PR = 130, PT = 10, PB = 10;
  const barH = 9; 
  const zoneH = 14; 

  
  const realVals = rows.map(d => d.realisasi).filter(v => v !== null).map(Number);
  const maxVal = tgt !== null
    ? Math.max(tgt * 1.2, ...realVals, 1)
    : Math.max(...realVals, 1) * 1.15;

  const H = PT + rows.length * (ROW_H + ROW_GAP) - ROW_GAP + PB + 20;
  const iW = W - PL - PR;

  const toX = v => PL + (v / maxVal) * iW;

  
  let grid = '';
  [0, 0.25, 0.5, 0.75, 1.0].forEach(f => {
    const v = maxVal * f;
    const x = toX(v).toFixed(1);
    const isTarget = tgt !== null && Math.abs(v - tgt) < 0.01;
    grid += `<line x1="${x}" y1="${PT}" x2="${x}" y2="${H - PB}" stroke="${f === 0 ? '#e2e8f0' : '#f1f5f9'}" stroke-width="${f === 0 ? 1.2 : 0.7}"/>`;
    if (f > 0) {
      const lbl = tgt !== null ? (v).toFixed(tgt % 1 !== 0 ? 1 : 0) : (v * 100 / maxVal).toFixed(0) + '%';
      grid += `<text x="${x}" y="${H - PB + 14}" text-anchor="middle" font-size="${10*_activeChartFs}" fill="#94a3b8">${(v / maxVal * 100).toFixed(0)}%</text>`;
    }
  });

  // Target marker line (vertical dashed red)
  if (tgt !== null) {
    const xT = toX(tgt).toFixed(1);
    grid += `<line x1="${xT}" y1="${PT}" x2="${xT}" y2="${H - PB}" stroke="#6366f1" stroke-width="1.5" stroke-dasharray="4,3" opacity=".8"/>`;
    grid += `<text x="${xT}" y="${PT - 4}" text-anchor="middle" font-size="${9*_activeChartFs}" fill="#6366f1" font-weight="700">Target</text>`;
  }

  // Rows
  let rowsEl = '';
  rows.forEach((d, i) => {
    const cy = PT + i * (ROW_H + ROW_GAP) + ROW_H / 2;
    const zoneY = cy - zoneH / 2;
    const barY  = cy - barH / 2;

    // Capaian color - skala 5-tier Permendagri (samakan dgn IKU/IKK/SPM),
    // bukan capaian% dibandingkan ke nilai target absolut (bug lama)
    const col = _kwCapaianColor(d.capaian);

    // Zona background 3 segmen (merah → kuning → hijau)
    if (tgt !== null) {
      const x75  = toX(tgt * 0.75);
      const x100 = toX(tgt);
      const xMax = toX(maxVal);
      // Zona merah: 0 → 75% target
      rowsEl += `<rect x="${PL}" y="${zoneY.toFixed(1)}" width="${(x75 - PL).toFixed(1)}" height="${zoneH}" rx="0" fill="#fef2f2"/>`;
      // Zona kuning: 75% → 100% target
      rowsEl += `<rect x="${x75.toFixed(1)}" y="${zoneY.toFixed(1)}" width="${(x100 - x75).toFixed(1)}" height="${zoneH}" fill="#fffbeb"/>`;
      // Zona hijau: 100% target → max
      rowsEl += `<rect x="${x100.toFixed(1)}" y="${zoneY.toFixed(1)}" width="${(xMax - x100).toFixed(1)}" height="${zoneH}" rx="0" fill="#f0fdf4"/>`;
      // Border zona
      rowsEl += `<rect x="${PL}" y="${zoneY.toFixed(1)}" width="${iW}" height="${zoneH}" rx="3" fill="none" stroke="#f1f5f9" stroke-width="1"/>`;
    } else {
      rowsEl += `<rect x="${PL}" y="${zoneY.toFixed(1)}" width="${iW}" height="${zoneH}" rx="3" fill="#f8fafc"/>`;
    }

    // Bar realisasi
    if (d.realisasi !== null) {
      const realVal = Math.min(Number(d.realisasi), maxVal);
      const barW2 = Math.max(toX(realVal) - PL, 2);
      rowsEl += `<rect x="${PL}" y="${barY.toFixed(1)}" width="${barW2.toFixed(1)}" height="${barH}" rx="3" fill="${col}" opacity=".85"/>`;
      // Highlight top
      rowsEl += `<rect x="${PL}" y="${barY.toFixed(1)}" width="${barW2.toFixed(1)}" height="${Math.min(barH * 0.35, 6)}" rx="3" fill="white" opacity=".2"/>`;
    }

    // Target marker (thick vertical line)
    if (tgt !== null) {
      const xT = toX(tgt);
      rowsEl += `<rect x="${(xT - 2).toFixed(1)}" y="${(zoneY - 2).toFixed(1)}" width="4" height="${zoneH + 4}" rx="2" fill="#ef4444" opacity=".9"/>`;
    }

    // Label kiri: nama bulan
    rowsEl += `<text x="${(PL - 6).toFixed(1)}" y="${cy.toFixed(1)}" text-anchor="end" font-size="${11*_activeChartFs}" font-weight="700" fill="#475569" dominant-baseline="middle">${d.label}</text>`;

    // Label kanan: capaian% + realisasi
    const capStr = d.capaian !== null ? parseFloat(d.capaian).toFixed(1) + '%' : '-';
    const realStr = d.realisasi !== null
      ? (isPredikat ? (_kwPredikatLabelForTier(d.realisasi) ?? '-') : _kwFmtReal(d.realisasi, d.realisasi_display, false) + (satuan ? ' ' + satuan : ''))
      : '-';
    rowsEl += `<text x="${(W - PR + 8).toFixed(1)}" y="${(cy - 4).toFixed(1)}" font-size="${11*_activeChartFs}" font-weight="800" fill="${col}" dominant-baseline="middle">${capStr}</text>`;
    rowsEl += `<text x="${(W - PR + 8).toFixed(1)}" y="${(cy + 7).toFixed(1)}" font-size="${9*_activeChartFs}" fill="#94a3b8" dominant-baseline="middle">${realStr}</text>`;
  });

  return `<svg viewBox="0 0 ${W} ${H}" width="100%" style="overflow:visible;display:block">
    ${grid}${rowsEl}
  </svg>`;
}

// ── CHART: Bar only (capaian % saja) ─────────────────────────────────────
// Tick Y-axis chart bar/line/area. Untuk indikator biasa: 4 pembagian linear
// dari 0..maxV seperti sebelumnya. Untuk indikator predikat (Peringkat, nilai
// realisasi/target berupa tier 1-7): jangan bagi rata maxV/4 (hasilnya angka
// pecahan aneh macam 1.44/2.88 yang gak match label predikat manapun) - pakai
// tier aslinya (1,2,3...) yang muat di bawah maxV, dilabeli hurufnya langsung.
function _kwYAxisTicks(maxV, isPredikat) {
  if (isPredikat) {
    const ticks = _KW_PREDIKAT_LEVELS
      .filter(p => p.tier <= maxV + 0.01)
      .map(p => ({ v: p.tier, label: p.label }));
    if (!ticks.length || ticks[0].v !== 0) ticks.unshift({ v: 0, label: null });
    return ticks;
  }
  return [0, 1, 2, 3, 4].map(t => {
    const v = (maxV / 4) * t;
    return { v, label: t > 0 ? v.toFixed(2) : null };
  });
}

function _kwChartBar(data, activeRange, target, targetDisplay, satuan, isPredikat = false) {
  const W = 700, H = 400, PL = 46, PR = 18, PT = 36, PB = 48;
  const iW = W - PL - PR, iH = H - PT - PB;
  const tgtF = target !== null && target !== undefined ? parseFloat(target) : null;
  const rVals = data.map(d => d.realisasi).filter(v => v !== null).map(Number);
  const maxV = tgtF !== null ? Math.max(tgtF * 1.15, ...rVals, 0.1) : Math.max(...rVals, 0.1) * 1.15;
  const n = data.length || 1;
  const slotW = iW / n;
  const barW = slotW * 0.65;
  const xOf = i => PL + (i + 0.5) * slotW;
  const yOf = v => PT + iH - (v / maxV) * iH;

  let grid = '';
  _kwYAxisTicks(maxV, isPredikat).forEach(tk => {
    const isBase = tk.v === 0;
    const y = yOf(tk.v).toFixed(1);
    grid += `<line x1="${PL}" y1="${y}" x2="${W-PR}" y2="${y}" stroke="${isBase?'#e2e8f0':'#f1f5f9'}" stroke-width="${isBase?'1':'.5'}"/>`;
    if (tk.label !== null) grid += `<text x="${(PL-5).toFixed(1)}" y="${y}" text-anchor="end" font-size="${10*_activeChartFs}" fill="#94a3b8" dominant-baseline="middle">${tk.label}</text>`;
  });

  // Garis target pada nilai absolut
  if (tgtF !== null) {
    const yTgt = yOf(Math.min(tgtF, maxV)).toFixed(1);
    grid += `<line x1="${PL}" y1="${yTgt}" x2="${W-PR}" y2="${yTgt}" stroke="#6366f1" stroke-width="1.4" stroke-dasharray="5,3" opacity=".75"/>`;
  }

  let bars = '', xlbls = '';
  const linePointsB = [];

  data.forEach((d, i) => {
    const x = xOf(i);
    const isRange = d.isInRange;
    xlbls += `<text x="${x.toFixed(1)}" y="${(H-PB+14).toFixed(1)}" text-anchor="middle" font-size="${11*_activeChartFs}" fill="#0d9488" font-weight="700">${d.label}</text>`;
    if (d.realisasi !== null) {
      const rv  = Number(d.realisasi);
      const col = d.capaian !== null ? _kwCapaianColor(d.capaian) : '#0d9488';
      const fillCol = isRange ? col : 'rgba(148,163,184,0.2)';
      const y = yOf(Math.min(rv, maxV));
      const bH = (PT + iH) - y;
      bars += `<rect x="${(x-barW/2).toFixed(1)}" y="${y.toFixed(1)}" width="${barW.toFixed(1)}" height="${bH.toFixed(1)}" rx="5" fill="${fillCol}"/>`;
      if (isRange) {
        bars += `<rect x="${(x-barW/2).toFixed(1)}" y="${y.toFixed(1)}" width="${barW.toFixed(1)}" height="${(bH*0.3).toFixed(1)}" rx="5" fill="white" opacity=".15"/>`;
        const vStr = isPredikat ? (_kwPredikatLabelForTier(rv) ?? '-') : _kwFmtReal(rv, d.realisasi_display, false);
        bars += `<text x="${x.toFixed(1)}" y="${(y-10).toFixed(1)}" text-anchor="middle" font-size="${11*_activeChartFs}" fill="${col}" font-weight="800">${vStr}</text>`;
        linePointsB.push({ x, y, col });
      }
    }
  });

  let connLineB = '', connDotsB = '';
  if (linePointsB.length >= 2) {
    const pathD = linePointsB.map((p, i) => `${i===0?'M':'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
    connLineB = `<path d="${pathD}" fill="none" stroke="#f59e0b" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" opacity=".9"/>`;
    connDotsB = linePointsB.map(p =>
      `<circle cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="5" fill="white" stroke="${p.col}" stroke-width="2.2"/>` +
      `<circle cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="2.5" fill="${p.col}"/>`
    ).join('');
  }

  return `<svg viewBox="0 0 ${W} ${H}" width="100%" height="400" style="overflow:visible;display:block">${grid}${bars}${connLineB}${connDotsB}${xlbls}</svg>`;
}

// ── CHART: Line (capaian % saja) ──────────────────────────────────────────
function _kwChartLine(data, activeRange, target, targetDisplay, satuan, isPredikat = false) {
  const W = 700, H = 380, PL = 46, PR = 24, PT = 36, PB = 48;
  const iW = W - PL - PR, iH = H - PT - PB;
  const tgtF = target !== null && target !== undefined ? parseFloat(target) : null;
  const rVals = data.map(d => d.realisasi).filter(v => v !== null).map(Number);
  const maxV = tgtF !== null ? Math.max(tgtF * 1.15, ...rVals, 0.1) : Math.max(...rVals, 0.1) * 1.15;
  const n = data.length || 1;
  const xOf = i => PL + (i / Math.max(n - 1, 1)) * iW;
  const yOf = v => PT + iH - (v / maxV) * iH;

  let grid = '';
  _kwYAxisTicks(maxV, isPredikat).forEach(tk => {
    const isBase = tk.v === 0;
    const y = yOf(tk.v).toFixed(1);
    grid += `<line x1="${PL}" y1="${y}" x2="${W-PR}" y2="${y}" stroke="${isBase?'#e2e8f0':'#f1f5f9'}" stroke-width="${isBase?'1':'.5'}"/>`;
    if (tk.label !== null) grid += `<text x="${(PL-5).toFixed(1)}" y="${y}" text-anchor="end" font-size="${10*_activeChartFs}" fill="#94a3b8" dominant-baseline="middle">${tk.label}</text>`;
  });

  // Garis target pada nilai absolut
  if (tgtF !== null) {
    const yTgt = yOf(Math.min(tgtF, maxV)).toFixed(1);
    grid += `<line x1="${PL}" y1="${yTgt}" x2="${W-PR}" y2="${yTgt}" stroke="#6366f1" stroke-width="1.4" stroke-dasharray="5,3" opacity=".75"/>`;
  }

  const pts = data.map((d, i) => ({ x: xOf(i), y: d.realisasi !== null ? yOf(Math.min(Number(d.realisasi), maxV)) : null, v: d.realisasi, disp: d.realisasi_display, real: d.realisasi, cap: d.capaian ?? null, isRange: d.isInRange, label: d.label }));
  const validPts = pts.filter(p => p.y !== null);

  let lineEl = '', xlbls = '';
  // Smooth line using simple polyline
  if (validPts.length >= 2) {
    const pathD = validPts.map((p, j) => `${j===0?'M':'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
    lineEl += `<path d="${pathD}" fill="none" stroke="#0d9488" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round"/>`;
  }
  pts.forEach((p, i) => {
    xlbls += `<text x="${p.x.toFixed(1)}" y="${(H-PB+14).toFixed(1)}" text-anchor="middle" font-size="${11*_activeChartFs}" fill="#0d9488" font-weight="700">${p.label}</text>`;
    if (p.y !== null) {
      const rv = p.v !== null ? Number(p.v) : null;
      const col = p.cap !== null ? _kwCapaianColor(p.cap) : '#0d9488';
      lineEl += `<circle cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="${p.isRange?7:4}" fill="${p.isRange?col:'#cbd5e1'}" stroke="white" stroke-width="2"/>`;
      if (p.isRange) {
        const vStr = rv !== null ? (isPredikat ? (_kwPredikatLabelForTier(rv) ?? '-') : _kwFmtReal(rv, p.disp, false)) : '-';
        lineEl += `<text x="${p.x.toFixed(1)}" y="${(p.y-12).toFixed(1)}" text-anchor="middle" font-size="${11*_activeChartFs}" fill="${col}" font-weight="800">${vStr}</text>`;
      }
    }
  });

  return `<svg viewBox="0 0 ${W} ${H}" width="100%" height="380" style="overflow:visible;display:block">${grid}${lineEl}${xlbls}</svg>`;
}

// ── CHART: Area (capaian % dengan fill di bawah) ──────────────────────────
function _kwChartArea(data, activeRange, target, targetDisplay, satuan, isPredikat = false) {
  const W = 700, H = 380, PL = 46, PR = 24, PT = 36, PB = 48;
  const iW = W - PL - PR, iH = H - PT - PB;
  const tgtF = target !== null && target !== undefined ? parseFloat(target) : null;
  const rVals = data.map(d => d.realisasi).filter(v => v !== null).map(Number);
  const maxV = tgtF !== null ? Math.max(tgtF * 1.15, ...rVals, 0.1) : Math.max(...rVals, 0.1) * 1.15;
  const n = data.length || 1;
  const xOf = i => PL + (i / Math.max(n - 1, 1)) * iW;
  const yOf = v => PT + iH - (v / maxV) * iH;
  const yBase = PT + iH;

  let grid = '';
  _kwYAxisTicks(maxV, isPredikat).forEach(tk => {
    const isBase = tk.v === 0;
    const y = yOf(tk.v).toFixed(1);
    grid += `<line x1="${PL}" y1="${y}" x2="${W-PR}" y2="${y}" stroke="${isBase?'#e2e8f0':'#f1f5f9'}" stroke-width="${isBase?'1':'.5'}"/>`;
    if (tk.label !== null) grid += `<text x="${(PL-5).toFixed(1)}" y="${y}" text-anchor="end" font-size="${10*_activeChartFs}" fill="#94a3b8" dominant-baseline="middle">${tk.label}</text>`;
  });

  // Garis target pada nilai absolut
  if (tgtF !== null) {
    const yTgt = yOf(Math.min(tgtF, maxV)).toFixed(1);
    grid += `<line x1="${PL}" y1="${yTgt}" x2="${W-PR}" y2="${yTgt}" stroke="#6366f1" stroke-width="1.4" stroke-dasharray="5,3" opacity=".75"/>`;
  }

  // Gradient def
  const gradId = 'kw_area_grad_' + Date.now();
  const defs = `<defs><linearGradient id="${gradId}" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#0d9488" stop-opacity=".35"/><stop offset="100%" stop-color="#0d9488" stop-opacity=".03"/></linearGradient></defs>`;

  const pts = data.map((d, i) => ({ x: xOf(i), y: d.realisasi !== null ? yOf(Math.min(Number(d.realisasi), maxV)) : null, v: d.realisasi, disp: d.realisasi_display, real: d.realisasi, cap: d.capaian ?? null, isRange: d.isInRange, label: d.label }));
  const validPts = pts.filter(p => p.y !== null);

  let areaEl = '', xlbls = '';
  if (validPts.length >= 2) {
    const linePath = validPts.map((p, j) => `${j===0?'M':'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
    const areaPath = linePath + ` L${validPts[validPts.length-1].x.toFixed(1)},${yBase.toFixed(1)} L${validPts[0].x.toFixed(1)},${yBase.toFixed(1)} Z`;
    areaEl += `<path d="${areaPath}" fill="url(#${gradId})"/>`;
    areaEl += `<path d="${linePath}" fill="none" stroke="#0d9488" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round"/>`;
  }
  pts.forEach(p => {
    xlbls += `<text x="${p.x.toFixed(1)}" y="${(H-PB+14).toFixed(1)}" text-anchor="middle" font-size="${11*_activeChartFs}" fill="#0d9488" font-weight="700">${p.label}</text>`;
    if (p.y !== null) {
      const rv = p.v !== null ? Number(p.v) : null;
      const col = p.cap !== null ? _kwCapaianColor(p.cap) : '#0d9488';
      areaEl += `<circle cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="${p.isRange?7:4}" fill="${p.isRange?col:'#cbd5e1'}" stroke="white" stroke-width="2"/>`;
      if (p.isRange) {
        const vStr = rv !== null ? (isPredikat ? (_kwPredikatLabelForTier(rv) ?? '-') : _kwFmtReal(rv, p.disp, false)) : '-';
        areaEl += `<text x="${p.x.toFixed(1)}" y="${(p.y-12).toFixed(1)}" text-anchor="middle" font-size="${11*_activeChartFs}" fill="${col}" font-weight="800">${vStr}</text>`;
      }
    }
  });

  return `<svg viewBox="0 0 ${W} ${H}" width="100%" height="380" style="overflow:visible;display:block">${defs}${grid}${areaEl}${xlbls}</svg>`;
}

function _kwChartRadar(data, activeRange, target, targetDisplay, satuan, isPredikat = false) {
  const W = 500, H = 460, CX = 250, CY = 220, R = 160;
  const pts = data.filter(d => d.isInRange);
  const n = pts.length;
  if (n < 3) {
    
    return _kwChartBar(data, activeRange, target, targetDisplay, satuan, isPredikat);
  }

  const toRad = deg => deg * Math.PI / 180;
  const angle = i => toRad(-90 + (360 / n) * i);
  const px = (i, r) => (CX + r * Math.cos(angle(i))).toFixed(1);
  const py = (i, r) => (CY + r * Math.sin(angle(i))).toFixed(1);

  
  const maxV = 120;
  let grid = '';
  [25, 50, 75, 100].forEach(pct => {
    const rr = R * (pct / maxV);
    const ringPts = Array.from({length: n}, (_, i) => `${px(i,rr)},${py(i,rr)}`).join(' ');
    grid += `<polygon points="${ringPts}" fill="none" stroke="${pct===100?'#6366f1':'#e2e8f0'}" stroke-width="${pct===100?'1.5':'.8'}" stroke-dasharray="${pct===100?'4,3':''}"/>`;
    grid += `<text x="${CX+2}" y="${(CY - rr - 4).toFixed(1)}" font-size="${11*_activeChartFs}" fill="#94a3b8" text-anchor="middle">${pct}%</text>`;
  });

  // Spokes
  Array.from({length: n}, (_, i) => {
    grid += `<line x1="${CX}" y1="${CY}" x2="${px(i,R)}" y2="${py(i,R)}" stroke="#e2e8f0" stroke-width=".8"/>`;
  });

  // Data polygon
  const dPts = pts.map((d, i) => {
    const v = d.capaian !== null ? Math.min(d.capaian, maxV) : 0;
    const r = R * (v / maxV);
    return { x: parseFloat(px(i, r)), y: parseFloat(py(i, r)), v: d.capaian, real: d.realisasi, label: d.label };
  });
  const polyPts = dPts.map(p => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');

  let dataEl = '';
  dataEl += `<polygon points="${polyPts}" fill="#0d9488" fill-opacity=".15" stroke="#0d9488" stroke-width="2.2" stroke-linejoin="round"/>`;

  // Dots & labels
  dPts.forEach((p, i) => {
    const col = _kwCapaianColor(p.v);
    dataEl += `<circle cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="6" fill="${col}" stroke="white" stroke-width="2"/>`;

    // Label bulan
    const lx = parseFloat(px(i, R + 22));
    const ly = parseFloat(py(i, R + 22));
    const anchor = lx < CX - 5 ? 'end' : lx > CX + 5 ? 'start' : 'middle';
    dataEl += `<text x="${lx.toFixed(1)}" y="${ly.toFixed(1)}" text-anchor="${anchor}" font-size="${13*_activeChartFs}" fill="#0d9488" font-weight="700" dominant-baseline="middle">${p.label}</text>`;
    if (p.v !== null) {
      const vStr = parseFloat(p.v).toFixed(1) + '%';
      const ox = lx < CX ? -20 : lx > CX ? 20 : 0;
      const oy = ly < CY ? -16 : ly > CY ? 16 : -14;
      dataEl += `<text x="${(lx+ox).toFixed(1)}" y="${(ly+oy).toFixed(1)}" text-anchor="${anchor}" font-size="${11*_activeChartFs}" fill="${col}" font-weight="700">${vStr}</text>`;
    }
  });

  const titleEl = `<text x="${CX}" y="${H-22}" text-anchor="middle" font-size="${13*_activeChartFs}" fill="#94a3b8">Capaian % per Triwulan (Radar)</text>`;

  return `<svg viewBox="0 0 ${W} ${H}" width="100%" height="${H}" style="overflow:visible;display:block">${grid}${dataEl}${titleEl}</svg>`;
}

const DASH_STYLE_CSS = `
/* ═══════════════════════════════════════════════════════════════════════════
   DASHBOARD & PANTAU INDIKATOR - Unified Styles
   Font Scale (konsisten, satu sumber):
     --kw-fs-val:   1.25rem / 800   ← angka utama (KPI, stat)
     --kw-fs-body:  0.84rem / 400   ← teks isi (permasalahan, solusi)
     --kw-fs-label: 0.72rem / 600   ← label biasa (progress, chart header)
     --kw-fs-micro: 0.63rem / 700   ← uppercase micro (th tabel, stat lbl)
     --kw-fs-pill:  0.72rem / 700   ← pill/badge/capaian
   ═══════════════════════════════════════════════════════════════════════════ */

/* ── Welcome banner ── */
.dash-welcome {
  background: linear-gradient(135deg, #f0fdfa 0%, #ffffff 60%) !important;
  border-radius: 14px !important;
  padding: 11px 20px !important;
  margin-bottom: 18px !important;
  border: 1px solid #99f6e4 !important;
  box-shadow: none !important;
  position: relative !important;
}
@media (max-width: 480px) {
  .dash-welcome { padding: 10px 14px !important; border-radius: 12px !important; }
}
.dash-welcome-title {
  font-size: 1.05rem !important;
  font-weight: 700 !important;
  color: #0f172a !important;
  margin-bottom: 2px !important;
}
.dash-welcome-sub {
  font-size: 0.84rem !important;
  color: #64748b !important;
  opacity: 1 !important;
  line-height: 1.5 !important;
}
.dash-welcome-sub b,
.dash-welcome-sub span,
.dash-welcome-sub strong {
  display: inline !important;
  color: inherit !important;
}
.dash-welcome-sub b[style],
.dash-welcome-sub span[style] {
  color: #0f766e !important;
  text-decoration: none !important;
}
/* Ikon sapaan (sunrise/sun/sunset/moon) - animasi lambai halus, pause dulu
   pas awal biar gak "gerak sendiri" pas mata baru fokus ke card. */
.dash-greet-icon {
  display: inline-block;
  transform-origin: 70% 70%;
  animation: dashGreetWave 3.2s ease-in-out infinite;
  animation-delay: .4s;
}
@keyframes dashGreetWave {
  0%   { transform: rotate(0deg); }
  6%   { transform: rotate(14deg); }
  12%  { transform: rotate(-8deg); }
  18%  { transform: rotate(14deg); }
  24%  { transform: rotate(-4deg); }
  30%  { transform: rotate(10deg); }
  36%  { transform: rotate(0deg); }
  100% { transform: rotate(0deg); }
}
@media (prefers-reduced-motion: reduce) {
  .dash-greet-icon { animation: none; }
}
/* Kutipan harian di tengah card - di-absolute-in biar bener-bener center
   dari CARD (bukan cuma center di ruang sisa antara kiri/kanan, yang suka
   geser kalau lebar teks kiri-kanan beda). */
.dash-welcome-mid {
  position: absolute; left: 50%; top: 50%;
  transform: translate(-50%, -50%);
  display: flex; align-items: center; gap: 8px; justify-content: center;
  max-width: 38%; pointer-events: none;
}
.dash-welcome-quote-icon { flex-shrink: 0; color: #99f6e4; }
.dash-welcome-quote-text {
  font-size: .82rem; font-style: italic; color: #64748b;
  line-height: 1.4; text-align: center;
  overflow: hidden; text-overflow: ellipsis;
  display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical;
  transition: opacity .35s ease;
}
@media (prefers-reduced-motion: reduce) {
  .dash-welcome-quote-text { transition: none; }
}
.dash-welcome-chip {
  display: inline-flex; align-items: center; gap: 6px;
  font-size: .78rem; font-weight: 600;
  padding: 6px 12px; border-radius: 999px;
  white-space: nowrap;
}
.dash-welcome-chip--ok { color: #0f766e !important; background: #f0fdfa !important; }
@media (max-width: 860px) {
  .dash-welcome-mid { display: none !important; }
}
/* Dua kolom (kiri: sapaan+nama, kanan: tanggal+jam) - tiap baris tingginya
   DIKUNCI sama (--dw-row) dan isinya di-center vertikal, jadi baris 1 kiri=kanan
   dan baris 2 kiri=kanan selalu sejajar, gak peduli beda font-size / line-height
   warisan / metrik font / ikon SVG. */
.dash-welcome-col { display: flex; flex-direction: column; gap: 3px; --dw-row: 1.4rem; }
.dash-welcome-col--right { align-items: flex-end; text-align: right; }
.dash-welcome-row {
  display: flex; align-items: center; gap: 6px;
  height: var(--dw-row); line-height: 1 !important; margin: 0 !important;
  white-space: nowrap;
}
.dash-welcome-col--right .dash-welcome-row { justify-content: flex-end; }
.dash-welcome-salam { font-size: .8rem; font-weight: 400; color: #0f172a; }
.dash-welcome-date  { font-size: .8rem; font-weight: 600; color: #0f172a; }
.dash-live-clock {
  font-size: .92rem; font-weight: 700; color: #0f766e;
  font-variant-numeric: tabular-nums; letter-spacing: .02em;
}
.dash-welcome-name { font-size: .92rem; font-weight: 700; color: #0f172a; }
.dash-greet-icon { display: inline-flex; align-items: center; }
.dash-greet-icon svg { vertical-align: 0 !important; margin-left: 0 !important; }
.dash-live-dot {
  width: 6px; height: 6px; border-radius: 50%; background: #10b981;
  animation: dashLiveDotPulse 2s infinite;
}
@keyframes dashLiveDotPulse {
  0%   { box-shadow: 0 0 0 0 rgba(16,185,129,.5); }
  70%  { box-shadow: 0 0 0 6px rgba(16,185,129,0); }
  100% { box-shadow: 0 0 0 0 rgba(16,185,129,0); }
}
@media (prefers-reduced-motion: reduce) {
  .dash-live-dot { animation: none; }
}

/* ── Module grid & cards ── */
.dash-module-grid {
  display: grid !important;
  grid-template-columns: repeat(auto-fit, minmax(200px, 380px)) !important;
  gap: 12px !important;
  margin-bottom: 20px !important;
  justify-content: center !important;
}
@media (max-width: 480px) {
  .dash-module-grid { grid-template-columns: 1fr !important; }
}
.dash-module-card {
  background: #ffffff !important;
  border: 1px solid #e2e8f0 !important;
  border-left: 4px solid var(--card-accent, #0d9488) !important;
  border-radius: 16px !important;
  padding: 18px 20px !important;
  transition: box-shadow .18s, transform .18s !important;
}
.dash-module-card:hover {
  box-shadow: 0 8px 24px rgba(13,148,136,.10) !important;
  transform: translateY(-2px) !important;
}
.dash-module-card:nth-child(1) { --card-accent: #0d9488; }
.dash-module-card:nth-child(2) { --card-accent: #3b82f6; }
.dash-module-card:nth-child(3) { --card-accent: #8b5cf6; }
.dash-module-card:nth-child(4) { --card-accent: #f59e0b; }

.dash-mod-header  { display: flex !important; align-items: center !important; gap: 10px !important; margin-bottom: 16px !important; }
.dash-mod-icon    { display: flex !important; align-items: center !important; justify-content: center !important; flex-shrink: 0 !important; width: 38px !important; height: 38px !important; border-radius: 11px !important; }
.dash-mod-title   { font-size: 0.92rem !important; font-weight: 700 !important; letter-spacing: -.01em; }
/* ── Donut body layout ── */
.dash-mod-body {
  display: flex !important;
  align-items: center !important;
  gap: 12px !important;
  border-top: 1px solid #f1f5f9 !important;
  padding-top: 14px !important;
}
.dash-mod-donut {
  flex-shrink: 0 !important;
  width: 72px !important;
  height: 72px !important;
}
.dash-mod-donut svg {
  width: 72px !important;
  height: 72px !important;
  display: block !important;
}
.dash-mod-stat-list {
  flex: 1 !important;
  min-width: 0 !important;
  display: flex !important;
  flex-direction: column !important;
  gap: 7px !important;
}
.dash-mod-stat-row {
  display: flex !important;
  align-items: center !important;
  gap: 7px !important;
}
.dash-mod-stat-dot {
  width: 8px !important;
  height: 8px !important;
  border-radius: 50% !important;
  flex-shrink: 0 !important;
  margin-top: 1px !important;
}
.dash-mod-stat-body {
  min-width: 0 !important;
  display: flex !important;
  align-items: baseline !important;
  gap: 5px !important;
}
.dash-mod-stat-val {
  font-size: 1.1rem !important;
  font-weight: 800 !important;
  line-height: 1 !important;
  letter-spacing: -.02em !important;
  white-space: nowrap !important;
}
.dash-mod-stat-val--alert {
  color: #ef4444 !important;
}
.dash-mod-stat-lbl {
  font-size: 0.7rem !important;
  font-weight: 600 !important;
  letter-spacing: .02em !important;
  color: #475569 !important;
  white-space: nowrap !important;
  overflow: hidden !important;
  text-overflow: ellipsis !important;
  text-transform: uppercase !important;
}
@media (max-width: 480px) {
  .dash-mod-donut { width: 60px !important; height: 60px !important; }
  .dash-mod-donut svg { width: 60px !important; height: 60px !important; }
  .dash-mod-stat-val { font-size: 0.95rem !important; }
}
@media (max-width: 480px) {
  .dash-module-card { padding: 14px 14px !important; border-radius: 12px !important; }
  .dash-mod-stat-val { font-size: 1.2rem !important; }
  .dash-welcome-title { font-size: 0.95rem !important; }
  .dash-welcome-sub { font-size: 0.78rem !important; }
}

/* ── Panel bawah (dashboard) ── */
.dash-panels      { display: grid !important; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)) !important; gap: 14px !important; margin-bottom: 20px !important; }
@media (max-width: 600px) {
  .dash-panels { grid-template-columns: 1fr !important; }
}
/* Varian fix 2 kolom - dipakai utk panel yg butuh lebar lebih (mis. Surat Masuk/Keluar
   Terbaru), supaya gak ikut auto-fit nyempit jadi 3-4 kolom dan bikin tabelnya
   overflow-scroll horizontal sendiri. */
.dash-panels--2col { grid-template-columns: repeat(2, 1fr) !important; }
@media (max-width: 900px) {
  .dash-panels--2col { grid-template-columns: 1fr !important; }
}
.dash-panel       { border-radius: 14px !important; border: 1px solid #e2e8f0 !important; box-shadow: 0 1px 4px rgba(0,0,0,.04); overflow-x: auto; -webkit-overflow-scrolling: touch; }
.dash-panel-header { font-size: 0.84rem !important; padding: 12px 16px !important; letter-spacing: -.01em; background: #f8fafc !important; border-bottom: 1px solid #f1f5f9 !important; }
.dash-panel-table th { padding: 8px 16px !important; font-size: 0.63rem !important; background: #f8fafc !important; }
.dash-panel-table td { padding: 9px 16px !important; font-size: 0.78rem !important; }
.dash-panel-table tr:hover td { background: #f0fdfa !important; }
.dash-panel-table { min-width: 400px; }

/* ── Skeleton ── */
.skeleton {
  background: linear-gradient(90deg, #f1f5f9 25%, #e2e8f0 50%, #f1f5f9 75%) !important;
  background-size: 200% 100% !important;
}

/* ══════════════════════════════════════════════
   IKU GRID - iku-* Components
   ══════════════════════════════════════════════ */

.iku-grid-wrap {
  background: #ffffff !important;
  border-radius: 16px !important;
  border: 1px solid #e2e8f0 !important;
  padding: 18px 20px 20px !important;
  margin-bottom: 16px !important;
}
.iku-grid-header {
  display: flex !important;
  align-items: center !important;
  gap: 8px !important;
  margin-bottom: 14px !important;
}
.iku-grid-title {
  font-size: .88rem !important;
  font-weight: 700 !important;
  color: #0f172a !important;
}
.iku-grid-periode {
  font-size: .72rem !important;
  font-weight: 700 !important;
  color: #0f766e !important;
  background: #f0fdfa !important;
  border: 1px solid #99f6e4 !important;
  border-radius: 6px !important;
  padding: 2px 8px !important;
}
.iku-summary-strip {
  display: flex !important;
  align-items: center !important;
  gap: 16px !important;
  background: #f8fafc !important;
  border-radius: 10px !important;
  padding: 10px 16px !important;
  margin-bottom: 14px !important;
  flex-wrap: wrap !important;
}
.iku-sum-item {
  display: flex !important;
  flex-direction: column !important;
  align-items: center !important;
  gap: 2px !important;
}
.iku-sum-val {
  font-size: 1.25rem !important;
  font-weight: 800 !important;
  color: #0f172a !important;
  line-height: 1 !important;
}
.iku-sum-lbl {
  font-size: .63rem !important;
  font-weight: 700 !important;
  text-transform: uppercase !important;
  letter-spacing: .05em !important;
  color: #94a3b8 !important;
  white-space: nowrap !important;
}
.iku-cards-grid {
  display: grid !important;
  grid-template-columns: repeat(4, minmax(0, 1fr)) !important;
  gap: 10px !important;
  margin-bottom: 4px !important;
}
@media (max-width: 900px) {
  .iku-cards-grid { grid-template-columns: repeat(2, 1fr) !important; }
}
.iku-card {
  background: var(--iku-col-bg, #f8fafc) !important;
  border: 1px solid color-mix(in srgb, var(--iku-col, #e2e8f0) 25%, #e2e8f0) !important;
  border-radius: 12px !important;
  padding: 12px 14px !important;
  transition: box-shadow .15s, transform .15s !important;
}
.iku-card:hover {
  box-shadow: 0 4px 14px rgba(0,0,0,.07) !important;
  transform: translateY(-1px) !important;
}
.iku-card--selected {
  border-color: #0d9488 !important;
  box-shadow: 0 0 0 3px rgba(13,148,136,.15), 0 4px 14px rgba(13,148,136,.1) !important;
  transform: translateY(-1px) !important;
}
/* Chart section yang muncul di bawah cards */
.iku-chart-section {
  background: #ffffff !important;
  border: 1.5px solid #e2e8f0 !important;
  border-top: 3px solid #0d9488 !important;
  border-radius: 14px !important;
  padding: 14px 16px !important;
  animation: ikuChartSlide .22s ease !important;
}
@keyframes ikuChartSlide {
  from { opacity: 0; transform: translateY(8px); }
  to   { opacity: 1; transform: translateY(0); }
}
/* Grid 4 chart (2×2 atau 4 kolom tergantung lebar) */
.iku-charts-grid {
  display: grid !important;
  grid-template-columns: repeat(3, minmax(0, 1fr)) !important;
  gap: 10px !important;
}
@media (max-width: 900px) {
  .iku-charts-grid { grid-template-columns: repeat(2, 1fr) !important; }
}
@media (max-width: 700px) {
  .iku-charts-grid { grid-template-columns: 1fr !important; }
}
/* Panel per indikator dalam grid chart */
.iku-mini-chart-panel {
  background: #f8fafc !important;
  border: 1.5px solid #f1f5f9 !important;
  border-radius: 12px !important;
  padding: 12px 14px !important;
  min-width: 0 !important;
}
/* SVG chart di dalam panel - skala kecil */
.iku-mini-chart-svg svg {
  max-height: 200px !important;
  height: 200px !important;
}
.iku-card-top {
  display: flex !important;
  align-items: flex-start !important;
  justify-content: space-between !important;
  gap: 8px !important;
}
.iku-card-name {
  font-size: .78rem !important;
  font-weight: 600 !important;
  color: #1e293b !important;
  line-height: 1.4 !important;
  flex: 1 !important;
  min-width: 0 !important;
  display: flex !important;
  align-items: flex-start !important;
  gap: 5px !important;
}
.iku-card-cap {
  font-size: 1rem !important;
  font-weight: 800 !important;
  line-height: 1 !important;
  white-space: nowrap !important;
  flex-shrink: 0 !important;
}
.iku-card-meta {
  display: flex !important;
  align-items: center !important;
  justify-content: space-between !important;
  gap: 4px !important;
  flex-wrap: wrap !important;
}
@media (max-width: 640px) {
  .iku-summary-strip { gap: 10px !important; padding: 8px 12px !important; }
}
@media (max-width: 480px) {
  .iku-cards-grid { grid-template-columns: 1fr 1fr !important; }
}

/* ══════════════════════════════════════════════
   PANTAU INDIKATOR - kw-* Components
   ══════════════════════════════════════════════ */

/* Wrapper */
.kw-wrap,
div.kw-wrap {
  background: #ffffff !important;
  background-color: #ffffff !important;
  border-radius: 16px !important;
  border: 1px solid #e2e8f0 !important;
  padding: 20px 22px !important;
  box-shadow: 0 2px 16px rgba(15,118,110,.07) !important;
  margin-top: 20px !important;
  position: relative !important;
  color: #0f172a !important;
}

/* Header row */
.kw-header-v2 {
  display: flex !important;
  align-items: center !important;
  gap: 8px !important;
  margin-bottom: 14px !important;
  flex-wrap: wrap !important;
}
.kw-title-v2 {
  font-size: 0.88rem !important;
  font-weight: 700 !important;
  color: #0f172a !important;
}
.kw-period-badge {
  font-size: 0.72rem !important;
  font-weight: 600 !important;
  background: #f0fdfa !important;
  border: 1px solid #99f6e4 !important;
  color: #0f766e !important;
  padding: 3px 10px !important;
  border-radius: 99px !important;
}

/* KPI Cards (4 kartu atas) */
.kw-kpi-grid-v2 {
  display: grid !important;
  grid-template-columns: repeat(4, minmax(0, 1fr)) !important;
  gap: 10px !important;
  margin-bottom: 16px !important;
}
@media (max-width: 820px) {
  .kw-kpi-grid-v2 { grid-template-columns: repeat(2, 1fr) !important; }
}
@media (max-width: 480px) {
  .kw-kpi-grid-v2 { grid-template-columns: 1fr 1fr !important; gap: 8px !important; }
  .kw-kpi-val { font-size: 1.1rem !important; white-space: normal !important; }
  .kw-kpi-lbl { font-size: 0.75rem !important; white-space: normal !important; }
  .kw-kpi-sub { white-space: normal !important; }
}
.kw-kpi-card,
div.kw-kpi-card {
  background: #ffffff !important;
  background-color: #ffffff !important;
  border: 1.5px solid #f1f5f9 !important;
  border-left: 4px solid var(--kc, #0d9488) !important;
  border-radius: 14px !important;
  padding: 14px 14px 12px 14px !important;
  display: flex !important;
  flex-direction: column !important;
  gap: 4px !important;
  transition: box-shadow .15s, transform .15s !important;
}
.kw-kpi-card:hover { box-shadow: 0 4px 16px rgba(0,0,0,.08) !important; transform: translateY(-1px) !important; }
.kw-kpi-accent-bar {
  display: none !important;
}
.kw-kpi-icon   { margin-top: 10px !important; margin-bottom: 2px !important; opacity: .8 !important; display: flex !important; align-items: center !important; }
.kw-kpi-val    { font-size: 1.5rem !important; font-weight: 800 !important; letter-spacing: -.02em !important; line-height: 1.15 !important; color: #0f172a !important; white-space: nowrap !important; overflow: hidden !important; text-overflow: ellipsis !important; }
.kw-kpi-unit   { font-size: 0.8rem !important; font-weight: 400 !important; color: #94a3b8 !important; }
.kw-kpi-lbl    { font-size: 0.88rem !important; color: #64748b !important; font-weight: 600 !important; margin-top: 2px !important; white-space: nowrap !important; }
.kw-kpi-sub    { font-size: 0.78rem !important; color: #94a3b8 !important; line-height: 1.35 !important; white-space: nowrap !important; overflow: hidden !important; text-overflow: ellipsis !important; }

/* Selector bar indikator */
.kw-custom-dd--bar   { position: relative !important; margin-bottom: 10px !important; }
.kw-ind-selector-bar {
  display: flex !important;
  align-items: center !important;
  gap: 10px !important;
  padding: 10px 14px !important;
  border-radius: 12px !important;
  cursor: pointer !important;
  min-height: 44px !important;
}
.kw-ind-selector-bar--active  { background: #f0fdfa !important; border: 1.5px solid #5eead4 !important; box-shadow: 0 0 0 3px rgba(13,148,136,.06) !important; }
.kw-ind-selector-bar--empty   { border: 1.5px dashed #94a3b8 !important; background: #f8fafc !important; color: #94a3b8 !important; font-size: 0.84rem !important; }
.kw-ind-selector-bar--empty:hover { border-color: #0d9488 !important; background: #f0fdfa !important; color: #0d9488 !important; }
.kw-ind-selector-name   { font-size: 0.88rem !important; font-weight: 700 !important; color: #0f172a !important; flex: 0 1 auto !important; min-width: 0 !important; overflow: hidden !important; text-overflow: ellipsis !important; white-space: nowrap !important; }
.kw-ind-selector-tag    { display: inline-flex !important; align-items: center !important; justify-content: center !important; gap: 4px !important; box-sizing: border-box !important; height: 24px !important; font-size: 0.63rem !important; font-weight: 600 !important; line-height: 1 !important; background: #ccfbf1 !important; color: #0f766e !important; border: 1px solid #99f6e4 !important; border-radius: 6px !important; padding: 0 8px !important; flex-shrink: 0 !important; }
.kw-ind-selector-tag--bidang { background: #dbeafe !important; color: #1d4ed8 !important; border-color: #bfdbfe !important; }
.kw-ind-selector-tag--pj     { background: #e0f2fe !important; color: #0369a1 !important; border-color: #bae6fd !important; }
.kw-ind-selector-change { display: inline-flex !important; align-items: center !important; gap: 5px !important; font-size: 0.72rem !important; font-weight: 600 !important; padding: 5px 12px !important; border-radius: 8px !important; border: 1.5px solid #5eead4 !important; background: #ffffff !important; color: #0f766e !important; cursor: pointer !important; flex-shrink: 0 !important; }
.kw-ind-selector-change:hover { background: #f0fdfa !important; }
.kw-ind-selector-reset  { display: flex !important; align-items: center !important; justify-content: center !important; width: 30px !important; height: 30px !important; border-radius: 8px !important; border: 1.5px solid #fecaca !important; background: #fff5f5 !important; color: #ef4444 !important; cursor: pointer !important; flex-shrink: 0 !important; }
.kw-ind-selector-reset:hover { background: #fee2e2 !important; }

/* Dropdown panel */
.kw-dd-panel        { position: absolute !important; top: calc(100% + 6px) !important; left: 0 !important; right: 0 !important; background: #ffffff !important; border: 1.5px solid #e2e8f0 !important; border-radius: 14px !important; box-shadow: 0 10px 30px rgba(0,0,0,.12) !important; z-index: 900 !important; overflow: hidden !important; }
.kw-dd-search-wrap  { position: relative !important; padding: 10px 12px !important; border-bottom: 1px solid #f1f5f9 !important; }
.kw-dd-search-icon  { position: absolute !important; left: 22px !important; top: 50% !important; transform: translateY(-50%) !important; color: #94a3b8 !important; pointer-events: none !important; }
.kw-dd-search       { width: 100% !important; padding: 7px 10px 7px 30px !important; border-radius: 8px !important; border: 1.5px solid #e2e8f0 !important; background: #f8fafc !important; font-family: inherit !important; font-size: 0.84rem !important; outline: none !important; color: #0f172a !important; }
.kw-dd-search:focus { border-color: #0d9488 !important; background: #ffffff !important; box-shadow: 0 0 0 3px rgba(13,148,136,.08) !important; }
.kw-dd-list         { max-height: 220px !important; overflow-y: auto !important; padding: 4px !important; }
.kw-dd-item         { display: flex !important; align-items: center !important; justify-content: space-between !important; padding: 9px 14px !important; border-radius: 10px !important; cursor: pointer !important; font-size: 0.84rem !important; gap: 8px !important; }
.kw-dd-item:hover   { background: #f0fdfa !important; }
.kw-dd-item.active  { background: #ccfbf1 !important; }
.kw-dd-item-name    { font-weight: 500 !important; flex: 1 !important; min-width: 0 !important; }
.kw-dd-item.active .kw-dd-item-name { color: #0f766e !important; font-weight: 700 !important; }

/* Custom dropdown (filter Bulan/TW/dll) */
.kw-cdd {
  position: relative !important;
  display: inline-flex !important;
  align-items: center !important;
  gap: 5px !important;
  padding: 5px 9px !important;
  border-radius: 10px !important;
  border: 1.5px solid #e2e8f0 !important;
  background: #ffffff !important;
  font-size: 0.75rem !important;
  font-weight: 500 !important;
  cursor: pointer !important;
  user-select: none !important;
}
.kw-cdd:hover { border-color: #0d9488 !important; }
.kw-cdd.open  { border-color: #0d9488 !important; box-shadow: 0 0 0 3px rgba(13,148,136,.10) !important; }
.kw-cdd-panel {
  position: absolute !important;
  top: calc(100% + 5px) !important;
  left: 0 !important;
  min-width: 100% !important;
  background: #ffffff !important;
  border: 1.5px solid #e2e8f0 !important;
  border-radius: 12px !important;
  box-shadow: 0 8px 24px rgba(0,0,0,.10) !important;
  padding: 4px !important;
  z-index: 1000 !important;
  display: none !important;
  max-height: 260px !important;
  overflow-y: auto !important;
}
.kw-cdd.open .kw-cdd-panel { display: block !important; }
.kw-cdd-opt       { display: block !important; padding: 5px 10px !important; border-radius: 8px !important; font-size: 0.75rem !important; font-weight: 500 !important; color: #374151 !important; cursor: pointer !important; white-space: nowrap !important; }
.kw-cdd-opt:hover  { background: #f0fdfa !important; color: #0d9488 !important; }
.kw-cdd-opt.active { background: #ccfbf1 !important; color: #0f766e !important; font-weight: 700 !important; }

/* Filter bar */
.kw-filter-bar-v2 { margin-bottom: 0 !important; margin-left: auto !important; padding: 0 !important; background: transparent !important; border-radius: 0 !important; border: none !important; }
.kw-filter-row { display:flex; align-items:center; gap:8px; flex-wrap:wrap; padding:8px 14px; background:#f8fafc; border:1px solid #e2e8f0; border-radius:10px; margin-bottom:8px; }

/* Month-picker */
.kw-mp { position:relative; display:inline-flex; align-items:center; gap:5px; padding:4px 9px; border:1.5px solid #e2e8f0; border-radius:8px; background:#fff; cursor:pointer; font-size:0.75rem; font-weight:600; color:#0f172a; user-select:none; transition:border-color .15s,box-shadow .15s; min-width:100px; }
.kw-mp:hover { border-color:#0d9488; }
.kw-mp.open  { border-color:#0d9488; box-shadow:0 0 0 3px rgba(13,148,136,.10); }
.kw-mp-label { flex:1; }
.kw-mp-caret { opacity:.4; flex-shrink:0; }
.kw-mp-panel { position:absolute; top:calc(100% + 6px); left:0; z-index:1100; background:#fff; border:1.5px solid #e2e8f0; border-radius:14px; box-shadow:0 10px 30px rgba(0,0,0,.13); padding:12px; display:none; min-width:220px; }
.kw-mp.open .kw-mp-panel { display:block; }
.kw-mp-nav { display:flex; align-items:center; justify-content:space-between; margin-bottom:10px; }
.kw-mp-year { font-size:0.9rem; font-weight:800; color:#0f172a; }
.kw-mp-nav-btn { background:none; border:none; cursor:pointer; padding:4px 6px; border-radius:6px; display:flex; align-items:center; color:#64748b; transition:background .12s; }
.kw-mp-nav-btn:hover:not(:disabled) { background:#f1f5f9; color:#0d9488; }
.kw-mp-nav-btn:disabled { opacity:.25; cursor:default; }
.kw-mp-grid { display:grid; grid-template-columns:repeat(4,1fr); gap:4px; }
.kw-mp-cell { padding:7px 4px; text-align:center; border-radius:8px; font-size:0.78rem; font-weight:600; color:#374151; cursor:pointer; transition:background .12s,color .12s; }
.kw-mp-cell:hover { background:#f0fdfa; color:#0d9488; }
.kw-mp-cell.active { background:#0d9488; color:#fff !important; }
.kw-mp-cell.disabled { color:#cbd5e1; cursor:default; }
.kw-mp-cell--nodata { color:#cbd5e1; font-weight:400; }
.kw-mp-cell--nodata:hover { background:#fef9ee; color:#b45309; }

/* Layout 2 kolom */
.kw-body,
div.kw-body {
  display: grid !important;
  grid-template-columns: minmax(280px, 36%) 1fr !important;
  align-items: start !important;
  gap: 20px !important;
}
@media (max-width: 900px) {
  .kw-body, div.kw-body { grid-template-columns: 1fr !important; }
}
@media (max-width: 480px) {
  .kw-body, div.kw-body { gap: 12px !important; }
  .kw-stat-row, div.kw-stat-row { border-radius: 10px !important; }
  .kw-stat-val { font-size: 1.05rem !important; }
}
.kw-left  { display: flex !important; flex-direction: column !important; min-width: 0 !important; }
.kw-right { display: flex !important; flex-direction: column !important; min-width: 0 !important; }

/* Nama & meta indikator */
.kw-ind-name     { font-size: 0.93rem !important; font-weight: 700 !important; color: #0f172a !important; line-height: 1.4 !important; margin-bottom: 6px !important; }
.kw-ind-meta-row { display: flex !important; flex-wrap: wrap !important; gap: 5px !important; margin-bottom: 10px !important; }
.kw-ind-group    { display: inline-flex !important; align-items: center !important; gap: 4px !important; font-size: 0.63rem !important; font-weight: 600 !important; background: #f1f5f9 !important; color: #475569 !important; border-radius: 99px !important; padding: 3px 10px !important; }
.kw-ind-pj       { display: inline-flex !important; align-items: center !important; gap: 4px !important; font-size: 0.63rem !important; font-weight: 600 !important; background: #eff6ff !important; color: #1d4ed8 !important; border-radius: 99px !important; padding: 3px 10px !important; }

/* Gauge */
.kw-gauge-wrap  { display: flex !important; flex-direction: column !important; align-items: center !important; padding: 4px 0 8px !important; }
.kw-gauge-wrap svg { width: 100% !important; max-width: 180px !important; height: auto !important; }
.kw-gauge-label { font-size: 0.75rem !important; font-weight: 700 !important; border-radius: 99px !important; padding: 4px 16px !important; display: inline-flex !important; align-items: center !important; gap: 4px !important; margin-top: 6px !important; }

/* Stat row (Realisasi / Target / Capaian) */
.kw-stat-row,
div.kw-stat-row {
  display: grid !important;
  grid-template-columns: repeat(3, 1fr) !important;
  border: 1.5px solid #e2e8f0 !important;
  border-radius: 12px !important;
  overflow: hidden !important;
  background: #f8fafc !important;
  background-color: #f8fafc !important;
  margin-bottom: 14px !important;
}
.kw-stat-cell              { text-align: center !important; padding: 12px 8px !important; }
.kw-stat-cell + .kw-stat-cell { border-left: 1px solid #e2e8f0 !important; }
.kw-stat-val               { font-size: 1.25rem !important; font-weight: 800 !important; color: #0f172a !important; line-height: 1.15 !important; }
.kw-stat-lbl               { font-size: 0.63rem !important; color: #94a3b8 !important; margin-top: 3px !important; text-transform: uppercase !important; letter-spacing: .06em !important; }

/* Progress bar */
.kw-prog-header-v2     { display: flex !important; justify-content: space-between !important; align-items: center !important; font-size: 0.72rem !important; font-weight: 600 !important; color: #475569 !important; margin-bottom: 5px !important; }
.kw-prog-bar-outer-v2  { height: 8px !important; background: #e2e8f0 !important; background-color: #e2e8f0 !important; border-radius: 99px !important; overflow: visible !important; position: relative !important; }
.kw-prog-bar-inner-v2  { height: 100% !important; border-radius: 99px !important; transition: width .5s ease !important; min-width: 3px !important; }
.kw-prog-milestone-v2  { position: absolute !important; top: -3px !important; bottom: -3px !important; width: 2px !important; background: #f59e0b !important; border-radius: 2px !important; }
.kw-prog-ticks         { display: flex !important; justify-content: space-between !important; font-size: 0.63rem !important; color: #cbd5e1 !important; margin-top: 3px !important; }

/* Gap info */
.kw-gap-info { display: flex !important; align-items: center !important; gap: 6px !important; padding: 8px 12px !important; border-radius: 10px !important; font-size: 0.75rem !important; font-weight: 600 !important; margin-top: 8px !important; margin-bottom: 12px !important; }

/* Tabel bulan */
.kw-month-table-v2 { width: 100% !important; border-collapse: collapse !important; font-size: 0.78rem !important; margin-top: 6px !important; }
.kw-month-table-v2 th { font-size: 0.63rem !important; text-transform: uppercase !important; letter-spacing: .06em !important; color: #94a3b8 !important; font-weight: 700 !important; padding: 6px 8px !important; border-bottom: 1.5px solid #f1f5f9 !important; text-align: left !important; }
.kw-month-table-v2 td { padding: 8px 8px !important; border-bottom: 1px solid #f8fafc !important; font-size: 0.78rem !important; color: #334155 !important; vertical-align: middle !important; text-align: left !important; }
.kw-month-label-cell  { display: flex !important; align-items: center !important; gap: 7px !important; }
.kw-month-active-bar  { width: 3px !important; height: 14px !important; border-radius: 2px !important; flex-shrink: 0 !important; }
.kw-cap-pill-v2       { display: inline-block !important; padding: 2px 8px !important; border-radius: 99px !important; font-size: 0.72rem !important; font-weight: 700 !important; }
.kw-tw-row--active    { background: #f0fdf4 !important; }
.kw-tw-row--future    { opacity: .45 !important; }
.kw-future-tag        { color: #cbd5e1 !important; }

/* Chart card */
.kw-chart-card,
div.kw-chart-card {
  background: #ffffff !important;
  background-color: #ffffff !important;
  border: 1.5px solid #f1f5f9 !important;
  border-radius: 14px !important;
  padding: 14px 16px !important;
  margin-bottom: 10px !important;
  width: 100% !important;
  overflow: visible !important;
}
.kw-chart-card-header {
  display: flex !important;
  justify-content: space-between !important;
  align-items: center !important;
  font-size: 0.72rem !important;
  font-weight: 700 !important;
  color: #64748b !important;
  text-transform: uppercase !important;
  letter-spacing: .05em !important;
  margin-bottom: 12px !important;
}
/* Ikon di chart header tetap kecil */
.kw-chart-card-header svg,
.kw-chart-card span svg {
  width: 12px !important; height: 12px !important;
  max-width: 12px !important; max-height: 12px !important;
  flex-shrink: 0 !important;
}
.kw-chart-card > svg { width: 100% !important; height: auto !important; display: block !important; }

/* Insight grid */
.kw-insight-grid-v2 {
  display: grid !important;
  grid-template-columns: repeat(4, minmax(0, 1fr)) !important;
  gap: 8px !important;
  margin-bottom: 10px !important;
}
@media (max-width: 820px) {
  .kw-insight-grid-v2 { grid-template-columns: repeat(2, 1fr) !important; }
}
@media (max-width: 480px) {
  .kw-insight-grid-v2 { grid-template-columns: 1fr 1fr !important; gap: 6px !important; }
}
.kw-insight-card-v2,
div.kw-insight-card-v2 {
  background: #f8fafc !important;
  background-color: #f8fafc !important;
  border: 1.5px solid #f1f5f9 !important;
  border-radius: 12px !important;
  padding: 10px 12px !important;
  display: flex !important;
  flex-direction: column !important;
  gap: 3px !important;
}
.kw-insight-card-v2:hover { border-color: #5eead4 !important; }
.kw-insight-label-v2 { display: flex !important; align-items: center !important; gap: 4px !important; font-size: 0.78rem !important; font-weight: 700 !important; color: #94a3b8 !important; text-transform: uppercase !important; letter-spacing: .06em !important; margin-bottom: 3px !important; }
.kw-insight-val-v2   { font-size: 1.2rem !important; font-weight: 800 !important; color: #0f172a !important; line-height: 1.2 !important; }
.kw-insight-sub-v2   { font-size: 0.63rem !important; color: #94a3b8 !important; margin-top: 2px !important; }

/* Detail row (Permasalahan & Solusi) */
.kw-detail-row-v2 {
  display: grid !important;
  grid-template-columns: 1fr 1fr !important;
  gap: 10px !important;
}
.kw-detail-row-v2.single { grid-template-columns: 1fr !important; }
@media (max-width: 820px) {
  .kw-detail-row-v2 { grid-template-columns: 1fr !important; }
}
@media (max-width: 480px) {
  .kw-detail-row-v2 { gap: 6px !important; }
  .kw-chart-card, div.kw-chart-card { padding: 10px 10px !important; }
  .kw-ind-selector-name { font-size: 0.8rem !important; }
  .kw-ind-selector-change { font-size: 0.68rem !important; padding: 4px 8px !important; }
}
.kw-detail-box { border-radius: 12px !important; padding: 12px 14px !important; }
.kw-masalah {
  background: #fff7ed !important; background-color: #fff7ed !important;
  border: 1.5px solid #fed7aa !important;
  border-left: 3px solid #f97316 !important;
  border-radius: 0 12px 12px 0 !important;
}
/* Accordion permasalahan & solusi */
.kw-ps-wrap { display:flex; flex-direction:column; gap:0; margin-top:0; border:1px solid #e2e8f0; border-radius:12px; overflow:hidden; }
.kw-ps-divider { border:none; border-top:1px solid #f1f5f9; margin:0; }

.kw-ps-acc-item {}
.kw-ps-acc-header {
  display:flex; align-items:center; gap:8px;
  width:100%; padding:9px 12px;
  background:#f8fafc; border:none; cursor:pointer;
  font-family:inherit; font-size:0.8rem; font-weight:600; color:#334155;
  text-align:left; transition:background .15s;
}
.kw-ps-acc-header:hover { background:#f1f5f9; }
.kw-ps-acc-open .kw-ps-acc-header { background:#ffffff; color:#0f172a; }
.kw-ps-acc-month { flex:1; }
.kw-ps-acc-dots { display:flex; gap:4px; align-items:center; }
.kw-ps-dot { display:inline-block; width:7px; height:7px; border-radius:50%; }
.kw-ps-dot--masalah   { background:#f97316; }
.kw-ps-dot--solusi    { background:#0d9488; }
.kw-ps-dot--pendukung { background:#3b82f6; }
.kw-ps-dot--rencana   { background:#8b5cf6; }
.kw-ps-acc-chevron { flex-shrink:0; color:#94a3b8; transition:transform .2s; }
.kw-ps-acc-open .kw-ps-acc-chevron { transform:rotate(180deg); }

.kw-ps-acc-body { padding:8px 10px 10px; display:flex; flex-direction:column; gap:4px; }
.kw-ps-acc-body[hidden] { display:none; }

/* legacy - tidak dipakai lagi tapi jaga kompatibilitas */
.kw-ps-item { display:flex; gap:0; align-items:stretch; }
.kw-ps-month-badge { flex-shrink:0; width:52px; background:#f0fdfa; border-right:1px solid #e2e8f0; display:flex; align-items:center; justify-content:center; font-size:0.7rem; font-weight:800; color:#0d9488; writing-mode:vertical-rl; text-orientation:mixed; padding:10px 6px; letter-spacing:.04em; }
.kw-ps-body { flex:1; padding:8px 10px; display:flex; flex-direction:column; gap:4px; }
.kw-solusi {
  background: #f0fdfa !important; background-color: #f0fdfa !important;
  border: 1.5px solid #99f6e4 !important;
  border-left: 3px solid #0d9488 !important;
  border-radius: 0 12px 12px 0 !important;
}
.kw-pendukung {
  background: #eff6ff !important; background-color: #eff6ff !important;
  border: 1.5px solid #bfdbfe !important;
  border-left: 3px solid #3b82f6 !important;
  border-radius: 0 12px 12px 0 !important;
}
.kw-rencana {
  background: #f5f3ff !important; background-color: #f5f3ff !important;
  border: 1.5px solid #ddd6fe !important;
  border-left: 3px solid #8b5cf6 !important;
  border-radius: 0 12px 12px 0 !important;
}
.kw-ok {
  background: #f8fafc !important;
  border: 1.5px solid #e2e8f0 !important;
  border-radius: 12px !important;
}
.kw-detail-label {
  display: flex !important;
  align-items: center !important;
  gap: 5px !important;
  font-size: 0.63rem !important;
  font-weight: 800 !important;
  text-transform: uppercase !important;
  letter-spacing: .06em !important;
  margin-bottom: 6px !important;
}
.kw-detail-text {
  font-size: 0.84rem !important;
  line-height: 1.6 !important;
  color: #334155 !important;
}

/* Empty state */
.kw-empty {
  display: flex !important;
  flex-direction: column !important;
  align-items: center !important;
  justify-content: center !important;
  padding: 44px 20px !important;
  text-align: center !important;
  color: #94a3b8 !important;
  font-size: 0.84rem !important;
  gap: 12px !important;
}

/* Spinner */
@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }

/* ── Redesign layout: 2 kolom baru ── */
.kw-body-redesign {
  display: grid !important;
  grid-template-columns: minmax(300px, 38%) 1fr !important;
  gap: 16px !important;
  align-items: start !important;
  margin-top: 0 !important;
}
@media (max-width: 900px) {
  .kw-body-redesign { grid-template-columns: 1fr !important; }
}
@media (max-width: 480px) {
  .kw-wrap, div.kw-wrap { padding: 14px 14px !important; border-radius: 12px !important; }
  .kw-filter-row { flex-wrap: wrap !important; align-items: center !important; gap: 6px 8px !important; }
  .kw-filter-row > div { flex-wrap: wrap !important; flex-basis: 100% !important; }
  .kw-card-panel { padding: 12px 12px !important; }
  .kw-month-table-v2 { font-size: 0.78rem !important; }
  .kw-month-table-v2 td, .kw-month-table-v2 th { padding: 6px 6px !important; }
}
.kw-col-left  { display: flex !important; flex-direction: column !important; gap: 12px !important; min-width: 0 !important; }
.kw-col-right { display: flex !important; flex-direction: column !important; gap: 12px !important; min-width: 0 !important; }

.kw-card-panel {
  background: #ffffff !important;
  border: 1.5px solid #f1f5f9 !important;
  border-radius: 14px !important;
  padding: 14px 16px !important;
  width: 100% !important;
  box-sizing: border-box !important;
}

.kw-panel-title {
  display: flex !important;
  align-items: center !important;
  gap: 5px !important;
  font-size: 0.63rem !important;
  font-weight: 700 !important;
  text-transform: uppercase !important;
  letter-spacing: .07em !important;
  color: #94a3b8 !important;
  margin-bottom: 10px !important;
}

.kw-kpi-card--hero {
  background: linear-gradient(135deg, #f0fdfa 0%, #ffffff 100%) !important;
  background-color: #f0fdfa !important;
  border: 1.5px solid #99f6e4 !important;
}

.kw-col-left .kw-gauge-wrap svg { max-width: 220px !important; }

`;

(function injectDashStyles() {
  const STYLE_ID = 'sapa-dash-styles';
  if (document.getElementById(STYLE_ID)) return; 
  const el = document.createElement('style');
  el.id = STYLE_ID;
  el.textContent = DASH_STYLE_CSS;
  document.head.appendChild(el);
})();