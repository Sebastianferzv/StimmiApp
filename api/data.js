const { neon } = require('@neondatabase/serverless');

const ALLOWED_KEYS = ['stimmi_products', 'stimmi_purchases', 'stimmi_sales', 'stimmi_categories', 'stimmi_packs'];

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, PUT, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  if (!process.env.DATABASE_URL) {
    return res.status(500).json({ error: 'DATABASE_URL not configured' });
  }

  const sql = neon(process.env.DATABASE_URL);

  try {
    await sql`
      CREATE TABLE IF NOT EXISTS store_data (
        key   TEXT PRIMARY KEY,
        value JSONB NOT NULL DEFAULT '[]'
      )
    `;

    if (req.method === 'GET') {
      const { key } = req.query;
      if (!ALLOWED_KEYS.includes(key)) return res.status(400).json({ error: 'Invalid key' });
      const rows = await sql`SELECT value FROM store_data WHERE key = ${key}`;
      return res.status(200).json(rows[0]?.value ?? []);
    }

    if (req.method === 'PUT') {
      const { key, value } = req.body;
      if (!ALLOWED_KEYS.includes(key)) return res.status(400).json({ error: 'Invalid key' });
      const jsonValue = JSON.stringify(value);
      await sql`
        INSERT INTO store_data (key, value)
        VALUES (${key}, ${jsonValue}::jsonb)
        ON CONFLICT (key) DO UPDATE SET value = ${jsonValue}::jsonb
      `;
      return res.status(200).json({ ok: true });
    }

    return res.status(405).json({ error: 'Method not allowed' });

  } catch (err) {
    console.error('API error:', err.message);
    return res.status(500).json({ error: err.message });
  }
};
