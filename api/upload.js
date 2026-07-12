// api/upload.js
// Katta fayllar to'g'ridan-to'g'ri Vercel Blob'ga yuklanishi uchun
// (serverimiz orqali o'tmaydi, shuning uchun hajm chegarasi muammosi yo'q).

import { handleUpload } from '@vercel/blob/client';

export default async function handler(req, res) {
  const body = req.body;

  try {
    const jsonResponse = await handleUpload({
      body,
      request: req,
      onBeforeGenerateToken: async () => {
        return {
          allowedContentTypes: ['application/pdf'],
          addRandomSuffix: true
        };
      },
      onUploadCompleted: async () => {
        // Hech narsa qilish shart emas
      }
    });

   } catch (error) {
    console.error('Upload xatoligi:', error.message);
    return res.status(400).json({ error: error.message });
  }
}
