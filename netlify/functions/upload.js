// netlify/functions/upload.js
// Upload file dokumen surat → Cloudinary
//
// Setup (sekali saja):
//   1. Daftar gratis di https://cloudinary.com (25 GB/bln)
//   2. Dashboard → Settings → API Keys → copy Cloud Name, API Key, API Secret
//   3. Di Netlify Dashboard → Site → Environment variables, tambahkan:
//        CLOUDINARY_CLOUD_NAME = xxxxx
//        CLOUDINARY_API_KEY    = xxxxx
//        CLOUDINARY_API_SECRET = xxxxx
//   4. npm install cloudinary  (sudah ditambahkan ke package.json)

import { v2 as cloudinary }        from 'cloudinary';
import { requireAuth }              from './_auth.js';
import { jsonResponse, errorResponse, getDb } from './_db.js';

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key:    process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure:     true,
});

// Struktur folder Cloudinary per kategori - sebelumnya semua upload (surat
// maupun data dukung kinerja) numpuk jadi satu di folder 'surat-dinkes'.
// Sekarang dipisah per modul supaya gampang di-audit di Media Library.
// 'kategori' dikirim dari frontend (kinerja.js / surat.js); kalau tidak
// dikenali atau tidak dikirim, fallback ke folder lama demi kompatibilitas.
const FOLDER_MAP = {
  kinerja_iku:  'SAPA/Kinerja/IKU',
  kinerja_ikk:  'SAPA/Kinerja/IKK',
  kinerja_spm:  'SAPA/Kinerja/SPM',
  surat_keluar: 'SAPA/Surat/Surat Keluar',
  surat_masuk:  'SAPA/Surat/Surat Masuk',
  absensi:      'SAPA/Absensi',
  foto_profil:  'SAPA/Foto Profil',
  eplanning:    'SAPA/E-Planning',
  tema_musiman: 'SAPA/Tema Musiman',
};
const DEFAULT_FOLDER = 'SAPA';

const MAX_SIZE_MB = 2;

const ALLOWED_TYPES = {
  'application/pdf':                                                           'pdf',
  'application/msword':                                                        'doc',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document':  'docx',
  'application/vnd.ms-excel':                                                  'xls',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet':        'xlsx',
  'image/jpeg':  'jpg',
  'image/png':   'png',
  'image/webp':  'webp',
};

// JANGAN pakai resource_type:'auto' - Cloudinary kadang simpan PDF sebagai 'image'
// sehingga URL jadi /image/upload/ dan fetch gagal 401.
// Paksa eksplisit: non-gambar → 'raw', gambar → 'image'.
const IMAGE_MIMES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);
function getResourceType(mimeType) {
  return IMAGE_MIMES.has(mimeType) ? 'image' : 'raw';
}

export const handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return jsonResponse({});
  if (event.httpMethod !== 'POST')    return errorResponse('Method not allowed', 405);

  // ── Auth ────────────────────────────────────────────────────────────────
  const auth = requireAuth(event);
  if (!auth) return errorResponse('Unauthorized', 401);

  // ── Cek env vars ────────────────────────────────────────────────────────
  if (!process.env.CLOUDINARY_CLOUD_NAME) {
    return errorResponse('Konfigurasi upload belum diatur. Hubungi administrator.', 503);
  }

  try {
    // ── Parse multipart/form-data ──────────────────────────────────────────
    const contentType = event.headers['content-type'] || '';
    if (!contentType.includes('multipart/form-data')) {
      return errorResponse('Content-Type harus multipart/form-data', 400);
    }

    const boundaryMatch = contentType.match(/boundary=([^\s;]+)/);
    if (!boundaryMatch) return errorResponse('Boundary tidak ditemukan', 400);

    const bodyBuffer = Buffer.from(
      event.body,
      event.isBase64Encoded ? 'base64' : 'utf-8'
    );

    const { fileBuffer, fileName, mimeType, fields } = parseMultipart(bodyBuffer, boundaryMatch[1]);

    if (!fileBuffer || !fileBuffer.length) {
      return errorResponse('File tidak ditemukan dalam request', 400);
    }

    // E-Planning dipecah lagi per Unit Kerja (bidang) masing-masing user, jadi
    // foldernya SAPA/E-Planning/<Unit Kerja>, bukan numpuk semua bidang jadi satu.
    // bidang_nama diambil dari DB pakai auth.id (bukan dari field yg dikirim
    // client) supaya gak bisa dipalsukan/di-spoof lewat FormData.
    let folder = FOLDER_MAP[fields.kategori] || DEFAULT_FOLDER;
    if (fields.kategori === 'eplanning') {
      const sql = getDb();
      const rows = await sql`
        SELECT b.nama AS bidang_nama
        FROM users u LEFT JOIN bidang b ON b.id = u.bidang_id
        WHERE u.id = ${auth.id}
      `;
      const bidangNama = (rows[0]?.bidang_nama || 'Umum').trim();
      const safeBidang = bidangNama.replace(/[\/\\]+/g, '-').slice(0, 80) || 'Umum';
      folder = `SAPA/E-Planning/${safeBidang}`;
    }

    // ── Validasi ───────────────────────────────────────────────────────────
    if (fileBuffer.length > MAX_SIZE_MB * 1024 * 1024) {
      return errorResponse(`File terlalu besar. Maksimal ${MAX_SIZE_MB} MB.`, 400);
    }

    if (!ALLOWED_TYPES[mimeType]) {
      return errorResponse('Tipe file tidak diizinkan. Gunakan PDF, Word, Excel, atau gambar.', 400);
    }

    // ── Upload ke Cloudinary ───────────────────────────────────────────────
    // Cloudinary menerima Buffer via upload_stream
    const uploadResult = await new Promise((resolve, reject) => {
      const safeName = (fileName || 'dokumen')
        .replace(/\.[^.]+$/, '')           // hapus ekstensi
        .replace(/[^a-zA-Z0-9_-]/g, '_')  // sanitasi
        .slice(0, 80);

      const stream = cloudinary.uploader.upload_stream(
        {
          folder:         folder,
          public_id:      `${Date.now()}_${auth.id}_${safeName}`,
          resource_type:  getResourceType(mimeType), // 'raw' untuk PDF/doc/xlsx, 'image' untuk jpg/png
          use_filename:   false,
          overwrite:      false,
        },
        (error, result) => {
          if (error) reject(error);
          else resolve(result);
        }
      );
      stream.end(fileBuffer);
    });

    return jsonResponse({
      url:  uploadResult.secure_url,
      name: fileName,
      key:  uploadResult.public_id,
    }, 201);

  } catch (err) {
    console.error('[UPLOAD ERROR]', err);
    return errorResponse('Gagal mengupload file: ' + (err.message || 'Unknown error'));
  }
};

// ═══════════════════════════════════════════════════════════════════════════
// MULTIPART PARSER - tanpa dependency tambahan
// ═══════════════════════════════════════════════════════════════════════════
function parseMultipart(buffer, boundary) {
  const result = { fileBuffer: null, fileName: 'file', mimeType: 'application/octet-stream', fields: {} };

  const bBuf      = Buffer.from(`--${boundary}`);
  const delimiter = Buffer.from(`\r\n--${boundary}`);

  let pos = buffer.indexOf(bBuf);
  if (pos === -1) return result;
  pos += bBuf.length;
  if (buffer[pos] === 0x0d && buffer[pos + 1] === 0x0a) pos += 2;

  while (pos < buffer.length) {
    const nextDelim = buffer.indexOf(delimiter, pos);
    const partEnd   = nextDelim === -1 ? buffer.length : nextDelim;
    const partBuf   = buffer.slice(pos, partEnd);

    const headerEnd = partBuf.indexOf('\r\n\r\n');
    if (headerEnd === -1) break;

    const headerStr = partBuf.slice(0, headerEnd).toString('utf-8');
    const bodyBuf   = partBuf.slice(headerEnd + 4);

    const dispMatch = headerStr.match(/Content-Disposition:[^\r\n]*filename="([^"]+)"/i);
    const nameMatch = headerStr.match(/Content-Disposition:[^\r\n]*name="([^"]+)"/i);
    const typeMatch = headerStr.match(/Content-Type:\s*([^\r\n]+)/i);

    if (dispMatch) {
      // Part file - JANGAN break di sini. Field lain (mis. 'kategori') bisa
      // saja diletakkan setelah 'file' di FormData, jadi tetap lanjut scan
      // supaya semua field kebaca terlepas dari urutannya.
      result.fileName   = dispMatch[1];
      result.mimeType   = typeMatch ? typeMatch[1].trim() : 'application/octet-stream';
      result.fileBuffer = bodyBuf;
    } else if (nameMatch) {
      result.fields[nameMatch[1]] = bodyBuf.toString('utf-8');
    }

    if (nextDelim === -1) break;
    pos = nextDelim + delimiter.length;
    if (buffer[pos] === 0x0d && buffer[pos + 1] === 0x0a) pos += 2;
  }

  return result;
}