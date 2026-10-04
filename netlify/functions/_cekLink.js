import { lookup } from 'node:dns/promises';
import net from 'node:net';

// Cek apakah sebuah link bisa dibuka TANPA login (artinya sudah di-share "siapa saja yang memiliki link").
// Request dikirim dari server tanpa cookie/akun apa pun, jadi hasilnya sama dengan yang dilihat
// orang lain (mis. pemeriksa/reviewer) yang membuka link tersebut.
//
// status yang dikembalikan:
//   shared      -> bisa dibuka tanpa login (OK)
//   private     -> diarahkan ke halaman login / ditolak (401/403) => belum di-share
//   notfound    -> 404/410 => belum di-share atau alamat salah (Google Drive juga 404 untuk file privat)
//   unreachable -> server tujuan tidak merespons / timeout
//   unknown     -> tidak bisa dipastikan (mis. kena rate-limit/captcha Google)
//   unverifiable-> host yang memang tidak bisa dicek dari server (mis. Mega.nz, atau situs lain yang
//                  memblokir request server dengan 403/429/503). Bukan error: frontend tetap mengizinkan Simpan
//                  dengan peringatan supaya user memastikan sendiri link-nya bisa dibuka tanpa login.
//   invalid     -> bukan link http(s) publik yang boleh diperiksa

const TIMEOUT_MS    = 6000;
const MAX_REDIRECT  = 5;
const MAX_BODY_BYTES = 32768;

const LOGIN_HOST_RE = /^(accounts|login|signin|sso|auth|id)\./i;
const LOGIN_PATH_RE = /\/(servicelogin|signin|sign-in|login|log-in|oauth2?|authorize|auth)(\/|$)/i;
const GOOGLE_HOST_RE = /(^|\.)google\.com$|(^|\.)googleusercontent\.com$/i;
const LOGIN_TITLE_RE = /<title[^>]*>\s*(sign[\s-]?in|log[\s-]?in|masuk)\b/i;

// Host yang perilaku "belum di-share"-nya bisa dikenali dari server (redirect ke login / 401 / 403 / 404).
// Di luar daftar ini, 403/429/503 lebih sering berarti WAF/bot-protection, bukan "belum di-share".
const KNOWN_HOST_RE = /(^|\.)(google\.com|googleusercontent\.com|1drv\.ms|onedrive\.live\.com|onedrive\.com|live\.com|sharepoint\.com|microsoftonline\.com|dropbox\.com|dropboxusercontent\.com)$/i;
// Mega = aplikasi JS: server selalu balas 200 untuk path apa pun & bagian #key tidak ikut terkirim,
// jadi keberadaan file tidak bisa dibuktikan lewat request biasa.
const UNVERIFIABLE_HOST_RE = /(^|\.)(mega\.nz|mega\.io|mega\.co\.nz)$/i;

function isPrivateIp(ip) {
  if (net.isIPv4(ip)) {
    const [a, b] = ip.split('.').map(Number);
    return a === 0 || a === 10 || a === 127 || a >= 224 ||
      (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 168) || (a === 100 && b >= 64 && b <= 127);
  }
  const v = ip.toLowerCase();
  return v === '::1' || v === '::' || v.startsWith('fc') || v.startsWith('fd') ||
    v.startsWith('fe80') || v.startsWith('::ffff:');
}

// Cegah SSRF: jangan pernah menembak alamat internal/lokal dari server.
export async function hostIsBlocked(hostname) {
  const h = String(hostname || '').replace(/^\[|\]$/g, '').toLowerCase();
  if (!h) return true;
  if (h === 'localhost' || h.endsWith('.localhost') || h.endsWith('.local') || h.endsWith('.internal')) return true;
  if (net.isIP(h)) return isPrivateIp(h);
  try {
    const addrs = await lookup(h, { all: true });
    return addrs.some(a => isPrivateIp(a.address));
  } catch {
    return false; // DNS gagal -> biar fetch yang gagal & dilaporkan "unreachable"
  }
}

function isLoginTarget(u) {
  return LOGIN_HOST_RE.test(u.hostname) || LOGIN_PATH_RE.test(u.pathname);
}

async function readHead(res, maxBytes = MAX_BODY_BYTES) {
  try {
    const reader = res.body?.getReader();
    if (!reader) return '';
    const chunks = [];
    let total = 0;
    while (total < maxBytes) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(Buffer.from(value));
      total += value.length;
    }
    try { await reader.cancel(); } catch { /* abaikan */ }
    return Buffer.concat(chunks).toString('utf8');
  } catch { return ''; }
}

export async function cekLinkDishare(rawUrl, { fetchImpl = fetch, blocked = hostIsBlocked } = {}) {
  let current;
  try { current = new URL(String(rawUrl || '').trim()); } catch { return { status: 'invalid' }; }

  for (let hop = 0; hop <= MAX_REDIRECT; hop++) {
    if (!/^https?:$/.test(current.protocol)) return { status: 'invalid' };
    if (await blocked(current.hostname)) return { status: 'invalid' };
    if (UNVERIFIABLE_HOST_RE.test(current.hostname)) return { status: 'unverifiable' };

    const ctrl  = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
    let res;
    try {
      res = await fetchImpl(current.href, {
        method: 'GET',
        redirect: 'manual',
        signal: ctrl.signal,
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; SAPA-LinkCheck/1.0)',
          'Accept': 'text/html,application/xhtml+xml,*/*;q=0.8',
          'Accept-Language': 'id,en;q=0.8',
        },
      });
    } catch {
      return { status: 'unreachable' };
    } finally {
      clearTimeout(timer);
    }

    if ([301, 302, 303, 307, 308].includes(res.status)) {
      const loc = res.headers.get('location');
      if (!loc) return { status: 'unreachable' };
      let next;
      try { next = new URL(loc, current); } catch { return { status: 'unreachable' }; }
      if (isLoginTarget(next)) return { status: 'private' };
      current = next;
      continue;
    }

    // Google menahan request dari server (captcha / rate limit) -> tidak bisa dipastikan
    const known = KNOWN_HOST_RE.test(current.hostname);
    if (res.status === 429 || res.status === 503) return { status: known ? 'unknown' : 'unverifiable' };
    if (/(^|\.)google\.com$/i.test(current.hostname) && current.pathname.startsWith('/sorry')) return { status: 'unknown' };

    if (res.status === 403 && !known) return { status: 'unverifiable' };   // kemungkinan besar WAF/bot-protection
    if (res.status === 401 || res.status === 403) return { status: 'private' };
    if (res.status === 404 || res.status === 410) return { status: 'notfound' };

    if (res.status >= 200 && res.status < 300) {
      const ctype = String(res.headers.get('content-type') || '');
      if (/text\/html/i.test(ctype)) {
        const head = await readHead(res);
        if (LOGIN_TITLE_RE.test(head)) return { status: 'private' };
        // Halaman Google "Anda memerlukan akses" / belum di-share tampil sebagai 200 di sebagian kasus
        if (GOOGLE_HOST_RE.test(current.hostname) &&
            /(you need access|request access|anda memerlukan akses|minta akses)/i.test(head)) {
          return { status: 'private' };
        }
      } else {
        try { await res.body?.cancel(); } catch { /* abaikan */ }
      }
      return { status: 'shared' };
    }

    return { status: 'unreachable' };
  }
  return { status: 'unreachable' }; // terlalu banyak redirect
}
