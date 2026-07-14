// api/chat-stream.js
// Gemini javobini so'z-so'z, jonli oqim (streaming) tarzida frontendga uzatadi.

const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-3.5-flash';

function toGeminiParts(content) {
  if (typeof content === 'string') return [{ text: content }];
  if (Array.isArray(content)) {
    return content.map(block => {
      if (block.type === 'image') {
        return { inline_data: { mime_type: block.source.media_type, data: block.source.data } };
      }
      return { text: block.text || '' };
    });
  }
  return [{ text: String(content || '') }];
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: "Faqat POST so'rovlar qabul qilinadi" });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'Server sozlanmagan: GEMINI_API_KEY topilmadi' });
  }

  try {
    const { system, messages = [], max_tokens } = req.body || {};

    const contents = messages.map(m => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: toGeminiParts(m.content)
    }));

    const geminiBody = {
      contents,
      generationConfig: {
        maxOutputTokens: Math.max(max_tokens || 1000, 1500),
        thinkingConfig: { thinkingBudget: 0 }
      }
    };
    if (system) geminiBody.systemInstruction = { parts: [{ text: system }] };

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:streamGenerateContent?alt=sse&key=${apiKey}`;
    const geminiRes = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(geminiBody)
    });

    if (!geminiRes.ok || !geminiRes.body) {
      const errData = await geminiRes.json().catch(() => ({}));
      return res.status(geminiRes.status).json({ error: errData.error?.message || 'Gemini API xatoligi' });
    }

    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive'
    });

    const reader = geminiRes.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop();

      for (const line of lines) {
        if (!line.startsWith('data: ')) continue;
        const jsonStr = line.slice(6).trim();
        if (!jsonStr) continue;
        try {
          const parsed = JSON.parse(jsonStr);
          const text = (parsed.candidates?.[0]?.content?.parts || []).map(p => p.text || '').join('');
          if (text) {
            res.write(`data: ${JSON.stringify({ text })}\n\n`);
          }
        } catch (e) { /* chunk to'liq emas, o'tkazib yuboramiz */ }
      }
    }

    res.write('data: [DONE]\n\n');
    res.end();
  } catch (err) {
    if (!res.headersSent) {
      res.status(500).json({ error: err.message });
    } else {
      res.end();
    }
  }
}
