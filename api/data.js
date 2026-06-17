import { Pool } from '@neondatabase/serverless';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

const ALLOWED_KEYS = ['stimmi_products', 'stimmi_purchases', 'stimmi_sales'];

async function ensureTable() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS store_data (
      key  TEXT PRIMARY KEY,
      value JSONB NOT NULL DEFAULT '[]'
    )
  `);
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, PUT, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    await ensureTable();

    if (req.method === 'GET') {
      const { key } = req.query;
      if (!ALLOWED_KEYS.includes(key)) return res.status(400).json({ error: 'Invalid key' });
      const { rows } = await pool.query('SELECT value FROM store_data WHERE key = $1', [key]);
      return res.status(200).json(rows[0]?.value ?? []);
    }

    if (req.method === 'PUT') {
      const { key, value } = req.body;
      if (!ALLOWED_KEYS.includes(key)) return res.status(400).json({ error: 'Invalid key' });
      await pool.query(
        `INSERT INTO store_data (key, value)
         VALUES ($1, $2::jsonb)
         ON CONFLICT (key) DO UPDATE SET value = $2::jsonb`,
        [key, JSON.stringify(value)]
      );
      return res.status(200).json({ ok: true });
    }

    return res.status(405).json({ error: 'Method not allowed' });

  } catch (err) {
    console.error('API error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
