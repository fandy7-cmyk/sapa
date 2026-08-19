
import { getDb, jsonResponse, errorResponse } from './_db.js';

export const handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return jsonResponse({});

  const sql = getDb();

  if (event.httpMethod === 'GET') {
    try {
      const rows = await sql`
        SELECT COUNT(*)::int AS total
        FROM page_visits
        WHERE page = 'landing'
      `;
      return jsonResponse({ total: rows[0]?.total ?? 0 });
    } catch (err) {
      console.error('[visit GET]', err);
      return errorResponse('Server error', 500);
    }
  }

  if (event.httpMethod === 'POST') {
    try {
      const ip = event.headers['x-forwarded-for']?.split(',')[0]?.trim() || '';
      const ua = event.headers['user-agent'] || '';

      await sql`
        INSERT INTO page_visits (page, ip_address, user_agent)
        VALUES ('landing', ${ip}, ${ua})
      `;

      const rows = await sql`
        SELECT COUNT(*)::int AS total
        FROM page_visits
        WHERE page = 'landing'
      `;
      return jsonResponse({ total: rows[0]?.total ?? 0 });
    } catch (err) {
      console.error('[visit POST]', err);
      return errorResponse('Server error', 500);
    }
  }

  return errorResponse('Method not allowed', 405);
};
