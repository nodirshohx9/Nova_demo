// api/video-search.js
// Bu fayl faqat video qidirish uchun — Gemini bilan bog'liq emas.
// Shuning uchun Ustoz AI va Masala yechish ishiga umuman ta'sir qilmaydi.

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: "Faqat POST so'rovlar qabul qilinadi" });
  }

  const apiKey = process.env.YOUTUBE_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'Server sozlanmagan: YOUTUBE_API_KEY topilmadi' });
  }

  try {
    const { query } = req.body || {};
    if (!query) return res.status(400).json({ error: 'query kerak' });

    const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&maxResults=3&relevanceLanguage=uz&q=${encodeURIComponent(query)}&key=${apiKey}`;
    const ytRes = await fetch(url);
    const data = await ytRes.json();

    if (!ytRes.ok) {
      return res.status(ytRes.status).json({ error: data.error?.message || 'YouTube qidiruv xatoligi' });
    }

    const videos = (data.items || []).map(item => ({
      title: item.snippet.title,
      videoId: item.id.videoId
    }));

    return res.status(200).json({ videos });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
