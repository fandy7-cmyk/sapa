import { getDb, jsonResponse, errorResponse, parseBody } from './_db.js';
import { requireAdmin } from './_auth.js';
import { deleteFromCloudinary } from './_cloudinary.js';

// tema_musiman = array tema, tiap tema punya gambar_url. Ambil semua URL gambarnya.
function _gambarTema(raw) {
  try {
    const list = typeof raw === 'string' ? JSON.parse(raw) : raw;
    if (!Array.isArray(list)) return [];
    return list.map(t => t && t.gambar_url).filter(u => typeof u === 'string' && u);
  } catch { return []; }
}

export const handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return jsonResponse({});
  const sql = getDb();

  if (event.httpMethod === 'GET') {
    const auth = requireAdmin(event);
    if (!auth) return errorResponse('Unauthorized', 401);
    try {
      const rows = await sql`SELECT key, value FROM settings`;
      const settings = Object.fromEntries(rows.map(r => [r.key, r.value]));
      return jsonResponse({ settings });
    } catch (err) { return errorResponse('Gagal mengambil settings'); }
  }

  if (event.httpMethod === 'PUT') {
    const admin = requireAdmin(event);
    if (!admin) return errorResponse('Unauthorized', 401);
    const body = parseBody(event);
    try {
      for (const [key, value] of Object.entries(body)) {
        let gambarLama = [];
        if (key === 'tema_musiman') {
          try {
            const old = await sql`SELECT value FROM settings WHERE key = 'tema_musiman' LIMIT 1`;
            gambarLama = _gambarTema(old[0]?.value);
          } catch { /* abaikan */ }
        }
        await sql`
          INSERT INTO settings (key, value, updated_at) VALUES (${key}, ${value}, NOW())
          ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()
        `;
        if (key === 'tema_musiman' && gambarLama.length) {
          // Hapus gambar yang sudah tidak dipakai tema mana pun (diganti / tema dihapus)
          const dipakai = new Set(_gambarTema(value));
          for (const u of new Set(gambarLama)) {
            if (!dipakai.has(u)) await deleteFromCloudinary(u).catch(() => {});
          }
        }
      }
      return jsonResponse({ ok: true });
    } catch (err) { return errorResponse('Gagal menyimpan settings'); }
  }

  return errorResponse('Not found', 404);
};
