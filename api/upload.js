// api/upload.js
// Katta fayllar to'g'ridan-to'g'ri Vercel Blob'ga yuklanadi (server orqali o'tmaydi).
// Bu safar to'liq xato jurnali (console.error) bilan - agar yana xato chiqsa,
// Vercel Logs'da HAQIQIY sababni ko'ramiz.

import { handleUpload } from '@vercel/blob/client';

export default async function handler(req, res) {
  try {
    const jsonResponse = await handleUpload({
      body: req.body,
      request: req,
      onBeforeGenerateToken: async () => {
        return {
          allowedContentTypes: ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'],
          addRandomSuffix: true,
          maximumSizeInBytes: 200 * 1024 * 1024 // 200 MB gacha ruxsat
        };
      },
      onUploadCompleted: async ({ blob }) => {
        console.log('Blob yuklandi:', blob.url);
      }
    });

    return res.status(200).json(jsonResponse);
  } catch (error) {
    console.error('UPLOAD XATOLIGI (to\'liq):', error);
    console.error('Xato matni:', error.message);
    console.error('Xato turi:', error.name);
    return res.status(400).json({ error: error.message, name: error.name });
  }
}
