// api/chat-stream.js
// Edge Runtime orqali ishlaydi - bu Vercel'ning oqim (streaming) uchun
// eng barqaror texnologiyasi, uzilib qolish muammosini bartaraf etadi.

export const config = { runtime: 'edge' };

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

export default async function handler(request) {
  if (request.method !== 'POST') {
    return new Response(JSON.stringify({ error: "Faqat POST so'rovlar qabul qilinadi" }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return new Response(JSON.stringify({ error: 'Server sozlanmagan: GEMINI_API_KEY topilmadi' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  let body;
  try {
    body = await request.json();
  } catch (e) {
    return new Response(JSON.stringify({ error: "So'rov matni noto'g'ri" }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  const { system, messages = [], max_tokens } = body;

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

  let geminiRes;
  try {
    geminiRes = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(geminiBody)
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  if (!geminiRes.ok || !geminiRes.body) {
    const errData = await geminiRes.json().catch(() => ({}));
    return new Response(JSON.stringify({ error: errData.error?.message || 'Gemini API xatoligi' }), {
      status: geminiRes.status,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  const encoder = new TextEncoder();
  const decoder = new TextDecoder();

  const stream = new ReadableStream({
    async start(controller) {
      const reader = geminiRes.body.getReader();
      let buffer = '';
      try {
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
                controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text })}\n\n`));
              }
            } catch (e) { /* chunk to'liq emas, o'tkazib yuboramiz */ }
          }
        }
        controller.enqueue(encoder.encode('data: [DONE]\n\n'));
      } catch (err) {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: err.message })}\n\n`));
      } finally {
        controller.close();
      }
    }
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no'
    }
  });
}
