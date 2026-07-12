// api/books.js
// Kitoblarni haqiqiy bazada (Upstash Redis) saqlaydi.
// GET    -> barcha kitoblarni qaytaradi
// POST   -> yangi kitob qo'shadi
// DELETE -> kitobni o'chiradi (body: { id })

const REDIS_URL = process.env.UPSTASH_REDIS_REST_URL;
const REDIS_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;
const HASH_KEY = 'nova:books';

async function redisCommand(command) {
  const res = await fetch(REDIS_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${REDIS_TOKEN}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(command)
  });
  const data = await res.json();
  if (data.error) throw new Error(data.error);
  return data.result;
}

export default async function handler(req, res) {
  if (!REDIS_URL || !REDIS_TOKEN) {
    return res.status(500).json({ error: 'Server sozlanmagan: UPSTASH kalitlar topilmadi' });
  }

  try {
    if (req.method === 'GET') {
      const flat = await redisCommand(['HGETALL', HASH_KEY]); // [id1, json1, id2, json2, ...]
      const books = [];
      for (let i = 0; i < flat.length; i += 2) {
        try { books.push(JSON.parse(flat[i + 1])); } catch (e) { /* skip bad entry */ }
      }
      books.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
      return res.status(200).json({ books });
    }

    if (req.method === 'POST') {
      const { title, author, fileUrl } = req.body || {};
      if (!title || !fileUrl) {
        return res.status(400).json({ error: "title va fileUrl kerak" });
      }
      const book = {
        id: Date.now().toString(36) + Math.random().toString(36).slice(2, 7),
        title, author: author || '', fileUrl,
        createdAt: Date.now()
      };
      await redisCommand(['HSET', HASH_KEY, book.id, JSON.stringify(book)]);
      return res.status(200).json({ book });
    }

    if (req.method === 'DELETE') {
      const { id } = req.body || {};
      if (!id) return res.status(400).json({ error: 'id kerak' });
      await redisCommand(['HDEL', HASH_KEY, id]);
      return res.status(200).json({ ok: true });
    }

    return res.status(405).json({ error: 'Bu metod qo\'llab-quvvatlanmaydi' });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
