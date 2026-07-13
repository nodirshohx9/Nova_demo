// api/get-upload-token.js
// Faqat admin parolini bilgan kishi fayl yuklash uchun kalitni oladi.

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: "Faqat POST so'rovlar qabul qilinadi" });
  }

  const { password } = req.body || {};
  if (password !== process.env.ADMIN_PASSWORD) {
    return res.status(401).json({ error: "Ruxsat yo'q" });
  }

  const token = process.env.BLOB_READ_WRITE_TOKEN;
  if (!token) {
    return res.status(500).json({ error: 'Server sozlanmagan: BLOB_READ_WRITE_TOKEN topilmadi' });
  }

  return res.status(200).json({ token });
}
