const { put } = require('@vercel/blob');

// Receives a resized image as a data URL ({ dataUrl, name }) and stores it in Vercel Blob.
// Returns { url } — only that URL is saved in Neon, never the image itself.
module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  // Newer Vercel Blob connections provide BLOB_STORE_ID (auth via OIDC, handled by the SDK);
  // older ones provide BLOB_READ_WRITE_TOKEN. Either works.
  if (!process.env.BLOB_STORE_ID && !process.env.BLOB_READ_WRITE_TOKEN) {
    return res.status(500).json({ error: 'Blob store not connected (BLOB_STORE_ID missing)' });
  }

  try {
    const { dataUrl, name } = req.body || {};
    const m = /^data:(image\/[a-z0-9.+-]+);base64,(.+)$/i.exec(dataUrl || '');
    if (!m) return res.status(400).json({ error: 'Invalid image' });

    const contentType = m[1];
    const buffer = Buffer.from(m[2], 'base64');
    if (buffer.length > 4 * 1024 * 1024) return res.status(413).json({ error: 'Image too large' });

    const ext = contentType.split('/')[1].replace('jpeg', 'jpg');
    const safeName = String(name || 'img').replace(/[^a-z0-9_-]/gi, '').slice(0, 40) || 'img';
    // The store is private, so images are served through /api/image (see api/image.js)
    const blob = await put(`images/${safeName}.${ext}`, buffer, {
      access: 'private',
      contentType,
      addRandomSuffix: true,
    });
    return res.status(200).json({ url: '/api/image?p=' + encodeURIComponent(blob.pathname) });
  } catch (err) {
    console.error('Upload error:', err.message);
    return res.status(500).json({ error: err.message });
  }
};
