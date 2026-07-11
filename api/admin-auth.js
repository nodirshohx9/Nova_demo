// api/admin-auth.js
// Parol serverda tekshiriladi — brauzer kodida hech qachon ko'rinmaydi.

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: "Faqat POST so'rovlar qabul qilinadi" });
  }

  const correctPassword = process.env.ADMIN_PASSWORD;
  if (!correctPassword) {
    return res.status(500).json({ error: 'Server sozlanmagan: ADMIN_PASSWORD topilmadi' });
  }

  const { password } = req.body || {};

  if (password === correctPassword) {
    return res.status(200).json({ ok: true });
  }
  return res.status(401).json({ ok: false });
}
