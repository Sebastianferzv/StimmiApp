const { get } = require('@vercel/blob');

// Serves an image from the private Blob store: GET /api/image?p=images/<name>.jpg
// Pathnames carry a random suffix and never change, so responses are cached for a year.
module.exports = async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const p = String(req.query.p || '');
  if (!/^images\/[a-z0-9_.-]+$/i.test(p)) return res.status(400).json({ error: 'Invalid path' });

  try {
    const result = await get(p, { access: 'private' });
    if (!result || !result.stream) return res.status(404).json({ error: 'Not found' });

    const buffer = Buffer.from(await new Response(result.stream).arrayBuffer());
    res.setHeader('Content-Type', result.blob.contentType || 'image/jpeg');
    res.setHeader('Cache-Control', 'public, max-age=31536000, s-maxage=31536000, immutable');
    return res.status(200).send(buffer);
  } catch (err) {
    console.error('Image error:', err.message);
    return res.status(500).json({ error: err.message });
  }
};
