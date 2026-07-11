// api/chat.js
// Bu fayl serverda ishlaydi va Gemini API kalitni brauzerdan yashiradi.
// Frontend (index.html) shu manzilga so'rov yuboradi: /api/chat
// Backend Gemini bilan gaplashadi, lekin javobni frontend kutayotgan
// formatga ({content:[{type:'text', text:...}]}) o'girib beradi —
// shuning uchun frontend kodini o'zgartirish shart emas.

const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-3.5-flash';

function toGeminiParts(content) {
  // content Anthropic uslubida keladi: string YOKI blok massivi
  if (typeof content === 'string') {
    return [{ text: content }];
  }
  if (Array.isArray(content)) {
    return content.map(block => {
      if (block.type === 'image') {
        return {
          inline_data: {
            mime_type: block.source.media_type,
            data: block.source.data
          }
        };
      }
      // default: text bloki
      return { text: block.text || '' };
    });
  }
  return [{ text: String(content || '') }];
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Faqat POST so\'rovlar qabul qilinadi' });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'Server sozlanmagan: GEMINI_API_KEY topilmadi' });
  }

  try {
    const { system, messages = [], tools, max_tokens } = req.body || {};

    const contents = messages.map(m => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: toGeminiParts(m.content)
    }));

    const geminiBody = {
      contents,
      generationConfig: { maxOutputTokens: max_tokens || 1000 }
    };

    if (system) {
      geminiBody.systemInstruction = { parts: [{ text: system }] };
    }

    const wantsSearch = Array.isArray(tools) && tools.some(t => t.type === 'web_search_20250305');
    if (wantsSearch) {
      geminiBody.tools = [{ google_search: {} }];
    }

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`;
    const geminiRes = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(geminiBody)
    });

    const data = await geminiRes.json();

    if (!geminiRes.ok) {
      return res.status(geminiRes.status).json({ error: data.error?.message || 'Gemini API xatoligi' });
    }

    const parts = data.candidates?.[0]?.content?.parts || [];
    const text = parts.map(p => p.text || '').join('');

    // Anthropic uslubidagi javob shakliga o'giramiz, frontend shuni kutadi
    return res.status(200).json({ content: [{ type: 'text', text }] });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
