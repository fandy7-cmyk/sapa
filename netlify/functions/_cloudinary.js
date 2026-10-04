import crypto from 'crypto';

const RAW_EXTENSIONS = new Set(['pdf','doc','docx','xls','xlsx','ppt','pptx','zip','rar','txt','csv']);

export function isRawExtension(filename) {
  const ext = (filename || '').split('.').pop().toLowerCase();
  return RAW_EXTENSIONS.has(ext);
}

export async function deleteFromCloudinary(rawUrl) {
  const apiKey    = process.env.CLOUDINARY_API_KEY    || '';
  const apiSecret = process.env.CLOUDINARY_API_SECRET || '';
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME || '';
  if (!apiKey || !apiSecret || !cloudName) return { ok: false, error: 'Env vars tidak di-set' };
  if (!rawUrl || !rawUrl.includes('cloudinary.com')) return { ok: true }; 

  try {
    const urlObj    = new URL(rawUrl);
    const parts     = urlObj.pathname.split('/');
    let uploadIdx = parts.indexOf('upload');
    if (uploadIdx === -1) uploadIdx = parts.indexOf('authenticated');
    if (uploadIdx === -1) return { ok: false, error: 'Bukan Cloudinary upload URL' };

    let pidParts = parts.slice(uploadIdx + 1);
    if (pidParts[0] && /^v\d+$/.test(pidParts[0])) pidParts = pidParts.slice(1);

    const pidWithExt = pidParts.map(decodeURIComponent).join('/');
    const publicId   = pidWithExt.replace(/\.[^.]+$/, '');
    const resourceType = urlObj.pathname.includes('/raw/') || isRawExtension(pidWithExt) ? 'raw' : 'image';

    const timestamp = Math.floor(Date.now() / 1000);
    const toSign    = `public_id=${publicId}&timestamp=${timestamp}${apiSecret}`;
    const signature = crypto.createHash('sha1').update(toSign).digest('hex');

    const form = new URLSearchParams();
    form.set('public_id', publicId);
    form.set('timestamp', timestamp);
    form.set('api_key',   apiKey);
    form.set('signature', signature);

    const apiUrl = `https://api.cloudinary.com/v1_1/${cloudName}/${resourceType}/destroy`;
    const resp   = await fetch(apiUrl, {
      method:  'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body:    form.toString(),
    });
    const data = await resp.json();
    if (data.result === 'ok') return { ok: true };
    if (resourceType === 'raw') {
      const apiUrl2 = `https://api.cloudinary.com/v1_1/${cloudName}/image/destroy`;
      const resp2 = await fetch(apiUrl2, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: form.toString(),
      });
      const data2 = await resp2.json();
      if (data2.result === 'ok') return { ok: true };
    } else {
      const apiUrl2 = `https://api.cloudinary.com/v1_1/${cloudName}/raw/destroy`;
      const resp2 = await fetch(apiUrl2, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: form.toString(),
      });
      const data2 = await resp2.json();
      if (data2.result === 'ok') return { ok: true };
    }
    console.warn('[deleteFromCloudinary] Gagal:', data.result, '| public_id:', publicId, '| resourceType:', resourceType, '| url:', rawUrl);
    return { ok: false, error: data.result || 'Gagal hapus di Cloudinary' };
  } catch (e) {
    console.warn('[deleteFromCloudinary] Error:', e.message, '| url:', rawUrl);
    return { ok: false, error: e.message };
  }
}


// ── Cleanup file lama saat diganti ────────────────────────────────────────────
// Dipanggil SETELAH UPDATE ke database berhasil. Tidak menghapus kalau URL lama
// sama dengan yang baru, atau masih dipakai baris/kolom lain (mis. file data dukung
// absensi yang dipakai bersama beberapa tanggal). Gagal hapus tidak pernah menggagalkan request.
export async function isFileStillReferenced(sql, url) {
  if (!url) return false;
  const checks = [
    () => sql`SELECT 1 FROM pegawai WHERE foto_url = ${url} LIMIT 1`,
    () => sql`SELECT 1 FROM users WHERE avatar_url = ${url} OR tanda_tangan = ${url} LIMIT 1`,
    () => sql`SELECT 1 FROM dokumen_publik WHERE file_url = ${url} LIMIT 1`,
    () => sql`SELECT 1 FROM surat_masuk WHERE file_url = ${url} LIMIT 1`,
    () => sql`SELECT 1 FROM surat_keluar WHERE file_url = ${url} LIMIT 1`,
    () => sql`SELECT 1 FROM absensi WHERE data_dukung_url = ${url} LIMIT 1`,
    () => sql`SELECT 1 FROM absensi_pengajuan WHERE data_dukung_url = ${url} LIMIT 1`,
  ];
  for (const run of checks) {
    try { if ((await run()).length) return true; } catch { /* tabel/kolom belum ada -> abaikan */ }
  }
  return false;
}

export async function cleanupReplacedFile(sql, oldUrl, newUrl) {
  try {
    if (!oldUrl || oldUrl === newUrl) return;
    if (!String(oldUrl).includes('cloudinary.com')) return;
    if (await isFileStillReferenced(sql, oldUrl)) return;
    await deleteFromCloudinary(oldUrl);
  } catch (e) {
    console.warn('[cleanupReplacedFile]', e.message);
  }
}
