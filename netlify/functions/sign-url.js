
import crypto from 'crypto';
import { verifyToken } from './_auth.js';
import { isRawExtension, deleteFromCloudinary } from './_cloudinary.js';

function decodeJwt(token) {
  const payload = verifyToken((token || '').trim());
  if (!payload?.id) return null;
  if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) {
    return { ...payload, _expired: true };
  }
  return payload;
}

function fixCloudinaryUrl(rawUrl, hintExt = '') {
  try {
    const urlObj = new URL(rawUrl);
    if (!urlObj.hostname.includes('cloudinary.com')) return rawUrl;
    const pathname = urlObj.pathname;
    if (pathname.includes('/raw/upload/')) return rawUrl;
    if (pathname.includes('/image/upload/')) {
      const filename = pathname.split('/').pop().split('?')[0];
      if (isRawExtension(filename) || (hintExt && RAW_EXTENSIONS.has(hintExt.toLowerCase()))) {
        return rawUrl.replace('/image/upload/', '/raw/upload/');
      }
    }
    return rawUrl;
  } catch { return rawUrl; }
}

function generateCloudinarySignedUrl(publicUrl, resourceType = 'raw', deliveryType = 'upload') {
  const apiKey    = process.env.CLOUDINARY_API_KEY    || '';
  const apiSecret = process.env.CLOUDINARY_API_SECRET || '';
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME || '';
  if (!apiKey || !apiSecret || !cloudName) return null;

  try {
    const urlObj    = new URL(publicUrl);
    const parts     = urlObj.pathname.split('/').filter(Boolean);
    const uploadIdx = parts.findIndex(p => p === 'upload' || p === 'authenticated');
    if (uploadIdx === -1) return null;

    const isAuthUrl = parts[uploadIdx] === 'authenticated';
    const effectiveType = isAuthUrl ? 'authenticated' : deliveryType;

    const versionPart = (parts[uploadIdx + 1] && /^v\d+$/.test(parts[uploadIdx + 1]))
      ? parts[uploadIdx + 1] : '';

    let afterUpload = parts.slice(uploadIdx + 1);
    if (afterUpload[0] && /^v\d+$/.test(afterUpload[0])) afterUpload = afterUpload.slice(1);

    const fullPath = afterUpload.join('/');
    const publicId = fullPath.replace(/\.[^/.]+$/, '');
    const ext      = fullPath.includes('.') ? fullPath.split('.').pop() : '';
    const extSeg   = ext ? `.${ext}` : '';
    const vSeg     = versionPart ? `/${versionPart}` : '';

    const timestamp = Math.floor(Date.now() / 1000);

    if (effectiveType === 'authenticated') {
      const toSign    = `public_id=${publicId}&timestamp=${timestamp}&type=authenticated${apiSecret}`;
      const signature = crypto.createHash('sha1').update(toSign).digest('hex');
      return `https://res.cloudinary.com/${cloudName}/${resourceType}/authenticated${vSeg}/${publicId}${extSeg}?api_key=${apiKey}&timestamp=${timestamp}&signature=${signature}&type=authenticated`;
    } else {
      const toSign   = `public_id=${publicId}&timestamp=${timestamp}${apiSecret}`;
      const fullSig  = crypto.createHash('sha1').update(toSign).digest('hex');
      const shortSig = fullSig.substring(0, 8);
      return `https://res.cloudinary.com/${cloudName}/${resourceType}/upload/s--${shortSig}--${vSeg}/${publicId}${extSeg}`;
    }
  } catch (e) {
    console.error('[sign-url] generateCloudinarySignedUrl error:', e.message);
    return null;
  }
}

async function fetchViaCloudinaryAdmin(rawUrl, resourceType = 'raw') {
  const apiKey    = process.env.CLOUDINARY_API_KEY    || '';
  const apiSecret = process.env.CLOUDINARY_API_SECRET || '';
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME || '';
  if (!apiKey || !apiSecret || !cloudName) return null;

  try {
    const urlObj    = new URL(rawUrl);
    const parts     = urlObj.pathname.split('/').filter(Boolean);
    const uploadIdx = parts.findIndex(p => p === 'upload' || p === 'authenticated');
    if (uploadIdx === -1) return null;

    const isAuthUrl     = parts[uploadIdx] === 'authenticated';
    const deliveryType  = isAuthUrl ? 'authenticated' : 'upload';

    const versionPart = (parts[uploadIdx + 1] && /^v\d+$/.test(parts[uploadIdx + 1]))
      ? parts[uploadIdx + 1] : '';

    let afterUpload = parts.slice(uploadIdx + 1);
    if (afterUpload[0] && /^v\d+$/.test(afterUpload[0])) afterUpload = afterUpload.slice(1);

    const fullPath  = afterUpload.join('/');
    const publicId  = fullPath.replace(/\.[^/.]+$/, '');
    const ext       = fullPath.includes('.') ? fullPath.split('.').pop() : '';

    const deliveryTypes = isAuthUrl
      ? ['authenticated', 'upload']
      : ['upload', 'authenticated'];

    for (const dt of deliveryTypes) {
      const signedUrl = generateCloudinarySignedUrl(rawUrl, resourceType, dt);
      if (!signedUrl) continue;
      console.log(`[sign-url] Trying ${dt} signed URL:`, signedUrl.substring(0, 100));
      const resp = await fetch(signedUrl, {
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; SAPA-Proxy/1.0)', 'Accept': '*/*' },
      });
      console.log(`[sign-url] ${dt} signed response:`, resp.status);
      if (resp.ok) return resp;
    }

    console.log('[sign-url] Signed URL gagal, coba Admin API resources endpoint...');
    const creds    = Buffer.from(`${apiKey}:${apiSecret}`).toString('base64');
    const pidEncoded = fullPath.split('/').map(encodeURIComponent).join('/');
    const adminUrl = `https://api.cloudinary.com/v1_1/${cloudName}/resources/${resourceType}/${deliveryType}/${pidEncoded}`;
    const adminResp = await fetch(adminUrl, {
      headers: { 'Authorization': `Basic ${creds}`, 'Accept': 'application/json' },
    });
    console.log('[sign-url] Admin API response:', adminResp.status);
    if (!adminResp.ok) {
      const altType = resourceType === 'raw' ? 'image' : 'raw';
      const adminUrl2 = `https://api.cloudinary.com/v1_1/${cloudName}/resources/${altType}/${deliveryType}/${pidEncoded}`;
      const adminResp2 = await fetch(adminUrl2, {
        headers: { 'Authorization': `Basic ${creds}`, 'Accept': 'application/json' },
      });
      console.log('[sign-url] Admin API alt resource_type response:', adminResp2.status);
      if (!adminResp2.ok) {
        console.error('[sign-url] Admin API resources gagal:', adminResp2.status);
        return null;
      }
      const data2 = await adminResp2.json();
      if (data2.secure_url) {
        const retryResp = await fetch(data2.secure_url, {
          headers: { 'User-Agent': 'Mozilla/5.0 (compatible; SAPA-Proxy/1.0)', 'Accept': '*/*' },
        });
        if (retryResp.ok) return retryResp;
      }
      return null;
    }

    const data = await adminResp.json();
    console.log('[sign-url] Admin API data.type:', data.type, 'data.resource_type:', data.resource_type);

    if (data.secure_url) {
      const actualDt = data.type || deliveryType;
      const actualRt = data.resource_type || resourceType;
      const freshUrl = generateCloudinarySignedUrl(data.secure_url, actualRt, actualDt);
      if (freshUrl) {
        console.log('[sign-url] Retry dengan Admin API signed URL:', freshUrl.substring(0, 100));
        const retryResp = await fetch(freshUrl, {
          headers: { 'User-Agent': 'Mozilla/5.0 (compatible; SAPA-Proxy/1.0)', 'Accept': '*/*' },
        });
        console.log('[sign-url] Retry response:', retryResp.status);
        if (retryResp.ok) return retryResp;
      }
      const directResp = await fetch(data.secure_url, {
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; SAPA-Proxy/1.0)', 'Accept': '*/*' },
      });
      if (directResp.ok) return directResp;
    }
    return null;
  } catch (e) {
    console.error('[sign-url] fetchViaCloudinaryAdmin error:', e.message);
    return null;
  }
}

const MIME_MAP = {
  pdf:  'application/pdf',
  doc:  'application/msword',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  xls:  'application/vnd.ms-excel',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  ppt:  'application/vnd.ms-powerpoint',
  pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  jpg:  'image/jpeg', jpeg: 'image/jpeg', png:  'image/png',
  gif:  'image/gif',  webp: 'image/webp', svg:  'image/svg+xml',
};

const CORS = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
};

export const handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers: CORS, body: '' };

  const qs       = event.queryStringParameters || {};
  const hdr      = event.headers || {};
  const authHdr  = hdr['authorization'] || hdr['Authorization'] || '';
  const rawToken = authHdr.replace(/^Bearer\s+/i, '').trim() || (qs.token || '').trim();
  const user = decodeJwt(rawToken);
  if (!user) {
    console.error('[sign-url] 401: token invalid. len=' + rawToken.length + ' parts=' + rawToken.split('.').length + ' start=' + rawToken.substring(0,20));
    return { statusCode: 401, headers: CORS, body: JSON.stringify({ error: 'Unauthorized', reason: 'invalid_token' }) };
  }
  if (user._expired) return { statusCode: 401, headers: CORS, body: JSON.stringify({ error: 'Sesi Anda telah berakhir. Silakan login kembali.', reason: 'token_expired' }) };

  if (event.httpMethod === 'DELETE' || (event.httpMethod === 'POST' && qs.action === 'delete')) {
    let body = {};
    try { body = JSON.parse(event.body || '{}'); } catch {}
    const targetUrl = body.url || qs.url || '';
    if (!targetUrl) return { statusCode: 400, headers: CORS, body: JSON.stringify({ error: 'URL diperlukan' }) };

    const result = await deleteFromCloudinary(targetUrl);
    return {
      statusCode: result.ok ? 200 : 500,
      headers: CORS,
      body: JSON.stringify(result),
    };
  }

  if (event.httpMethod !== 'GET')
    return { statusCode: 405, headers: CORS, body: JSON.stringify({ error: 'Method not allowed' }) };

  const { url: rawUrl, mode = 'preview', name } = qs;
  if (!rawUrl) return { statusCode: 400, headers: CORS, body: JSON.stringify({ error: 'Parameter url diperlukan' }) };

  let targetUrlObj;
  try { targetUrlObj = new URL(rawUrl); } catch {
    return { statusCode: 400, headers: CORS, body: JSON.stringify({ error: 'URL tidak valid' }) };
  }
  const ALLOWED_PROXY_HOSTS = ['res.cloudinary.com'];
  if (targetUrlObj.protocol !== 'https:' || !ALLOWED_PROXY_HOSTS.includes(targetUrlObj.hostname)) {
    return { statusCode: 400, headers: CORS, body: JSON.stringify({ error: 'URL tidak diizinkan' }) };
  }

  const _rawFileName = (name || decodeURIComponent(rawUrl.split('/').pop().split('?')[0]) || 'dokumen').trim();
  const _urlFileName = decodeURIComponent(rawUrl.split('/').pop().split('?')[0]);
  function _hasKnownExt(fn) {
    const e = fn.split('.').pop().toLowerCase();
    return e !== fn.toLowerCase() && Object.keys(MIME_MAP).includes(e);
  }
  const fileName = _hasKnownExt(_rawFileName) ? _rawFileName
                 : (_hasKnownExt(name || '') ? (name || '').trim()
                 : (_hasKnownExt(_urlFileName) ? _urlFileName : _rawFileName));
  const ext      = fileName.split('.').pop().toLowerCase();

  try {
    const fetchUrl = fixCloudinaryUrl(rawUrl, ext);
    if (fetchUrl !== rawUrl) {
      console.log('[sign-url] URL dikoreksi resource_type:', rawUrl, '→', fetchUrl);
    }

    const controller = new AbortController();
    const timeout    = setTimeout(() => controller.abort(), 20_000);

    const detectedResourceType = (fetchUrl.includes('/raw/upload/') || isRawExtension(ext)) ? 'raw' : 'image';

    let upstream = await fetch(fetchUrl, {
      signal:  controller.signal,
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; SAPA-Proxy/1.0)', 'Accept': '*/*' },
    });
    clearTimeout(timeout);
    console.log('[sign-url] S1:', upstream.status, fetchUrl.substring(0, 80));

    if (!upstream.ok && fetchUrl !== rawUrl) {
      const controller2 = new AbortController();
      setTimeout(() => controller2.abort(), 20_000);
      upstream = await fetch(rawUrl, {
        signal:  controller2.signal,
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; SAPA-Proxy/1.0)', 'Accept': '*/*' },
      });
      console.log('[sign-url] S2 fallback original:', upstream.status);
    }

    if (!upstream.ok && (upstream.status === 401 || upstream.status === 403 || upstream.status === 400)) {
      console.log(`[sign-url] S3: Cloudinary ${upstream.status} - mencoba Admin API + signed URL...`);
      let adminResult = await fetchViaCloudinaryAdmin(fetchUrl, detectedResourceType);
      if (!adminResult || !adminResult.ok) {
        const altType = detectedResourceType === 'raw' ? 'image' : 'raw';
        console.log(`[sign-url] S3 retry dengan resource_type=${altType}...`);
        adminResult = await fetchViaCloudinaryAdmin(fetchUrl, altType);
      }
      if (adminResult && adminResult.ok) {
        upstream = adminResult;
        console.log('[sign-url] S3 berhasil:', upstream.status);
      } else {
        console.warn('[sign-url] S3 gagal - cek: (1) env vars CLOUDINARY_* di .env, (2) delivery type file di Cloudinary Dashboard');
      }
    }

    if (!upstream.ok) {
      let debugHint = '';
      if (upstream.status === 403) {
        debugHint = 'Akses ditolak Cloudinary (Host not in allowlist). Solusi: buka Cloudinary Dashboard → Settings → Security → Allowed fetch domains → tambahkan domain Netlify Anda. Atau pastikan env vars CLOUDINARY_API_KEY/SECRET/CLOUD_NAME sudah di-set agar Admin API fallback bisa berjalan.';
        console.error('[sign-url] Cloudinary 403 - semua strategy gagal. URL:', fetchUrl);
      } else if (upstream.status === 401) {
        debugHint = 'File private/authenticated di Cloudinary. Pastikan: (1) CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET, CLOUDINARY_CLOUD_NAME sudah di-set di Netlify env vars. (2) Upload preset menggunakan delivery type "public" bukan "authenticated". (3) Jika file sudah terlanjur authenticated, ubah di Cloudinary Media Explorer atau re-upload.';
        console.error('[sign-url] Cloudinary 401 - URL:', fetchUrl);
      } else if (upstream.status === 400) {
        debugHint = 'URL Cloudinary tidak valid. Cek resource_type: /image/upload/ vs /raw/upload/.';
        console.error('[sign-url] Cloudinary 400 - URL:', fetchUrl);
      }
      return {
        statusCode: upstream.status,
        headers: CORS,
        body: JSON.stringify({ error: `Sumber file mengembalikan HTTP ${upstream.status}`, hint: debugHint }),
      };
    }

    const MAX_PROXY_BYTES = 4 * 1024 * 1024;

    const contentLength = parseInt(upstream.headers.get('content-length') || '0', 10);
    if (contentLength > MAX_PROXY_BYTES) {
      const redirectUrl = fetchUrl !== rawUrl ? fetchUrl : rawUrl;
      console.log('[sign-url] File besar (' + (contentLength/1024/1024).toFixed(1) + 'MB) → redirect ke Cloudinary langsung:', redirectUrl.substring(0, 80));
      return {
        statusCode: 302,
        headers: { ...CORS, 'Location': redirectUrl, 'Cache-Control': 'private, max-age=3600' },
        body: '',
      };
    }

    const arrayBuffer = await upstream.arrayBuffer();

    if (arrayBuffer.byteLength > MAX_PROXY_BYTES) {
      const redirectUrl = fetchUrl !== rawUrl ? fetchUrl : rawUrl;
      console.log('[sign-url] File besar setelah download (' + (arrayBuffer.byteLength/1024/1024).toFixed(1) + 'MB) → redirect:', redirectUrl.substring(0, 80));
      return {
        statusCode: 302,
        headers: { ...CORS, 'Location': redirectUrl, 'Cache-Control': 'private, max-age=3600' },
        body: '',
      };
    }

    const ct          = MIME_MAP[ext] || upstream.headers.get('content-type') || 'application/octet-stream';
    const disposition = mode === 'preview'
      ? `inline; filename*=UTF-8''${encodeURIComponent(fileName)}`
      : `attachment; filename*=UTF-8''${encodeURIComponent(fileName)}`;

    return {
      statusCode:      200,
      isBase64Encoded: true,
      headers: {
        ...CORS,
        'Content-Type':           ct,
        'Content-Disposition':    disposition,
        'Cache-Control':          'private, max-age=3600',
        'X-Content-Type-Options': 'nosniff',
      },
      body: Buffer.from(arrayBuffer).toString('base64'),
    };

  } catch (e) {
    if (e.name === 'AbortError')
      return { statusCode: 504, headers: CORS, body: JSON.stringify({ error: 'Timeout: sumber file tidak merespons' }) };
    console.error('[sign-url] Error:', e.message, e.stack);
    return { statusCode: 500, headers: CORS, body: JSON.stringify({ error: e.message }) };
  }
};