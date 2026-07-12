// api/upload.js
// To'g'ridan-to'g'ri yuklash (client upload) uchun ruxsat beradi.
// Fayl bizning serverimiz orqali emas, to'g'ridan-to'g'ri Blob'ga yuklanadi — tezroq.

import { handleUpload } from '@vercel/blob/client';

export default async function handler(req, res) {
  try {
    const jsonResponse = await handleUpload({
      body: req.body,
      request: req,
      onBeforeGenerateToken: async () => {
        return {
          allowedContentTypes: ['application/pdf'],
          addRandomSuffix: true
        };
      },
      onUploadCompleted: async () => {
        // hozircha qo'shimcha amal shart emas
      }
    });
    return res.status(200).json(jsonResponse);
  } catch (error) {
    return res.status(400).json({ error: error.message });
  }
}
