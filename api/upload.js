// api/upload.js
export const config = {
  api: { bodyParser: { sizeLimit: '5mb' } }
};

import { put } from '@vercel/blob';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: "Faqat POST so'rovlar qabul qilinadi" });
  }
  try {
    const { filename, fileBase64 } = req.body || {};
    if (!filename || !fileBase64) {
      return res.status(400).json({ error: 'filename va fileBase64 kerak' });
    }
    const buffer = Buffer.from(fileBase64, 'base64');
    const blob = await put(filename, buffer, {
      access: 'public',
      contentType: 'application/pdf',
      addRandomSuffix: true
    });
    return res.status(200).json({ url: blob.url });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
