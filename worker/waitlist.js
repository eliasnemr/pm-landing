const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function corsHeaders(origin, allowedOrigin) {
  const headers = {
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };
  if (allowedOrigin === '*') {
    headers['Access-Control-Allow-Origin'] = '*';
  } else if (origin === allowedOrigin) {
    headers['Access-Control-Allow-Origin'] = origin;
    headers['Vary'] = 'Origin';
  }
  return headers;
}

function json(data, status, extraHeaders = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...extraHeaders },
  });
}

export default {
  async fetch(request, env) {
    const origin = request.headers.get('Origin') || '';
    const allowedOrigin = env.ALLOWED_ORIGIN || '*';
    const cors = corsHeaders(origin, allowedOrigin);

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: cors });
    }

    if (request.method !== 'POST') {
      return json({ error: 'Method not allowed' }, 405, cors);
    }

    if (allowedOrigin !== '*' && origin !== allowedOrigin) {
      return json({ error: 'Forbidden' }, 403, cors);
    }

    let body;
    try {
      body = await request.json();
    } catch {
      return json({ error: 'Invalid JSON' }, 400, cors);
    }

    const email = String(body.email || '').trim().toLowerCase();
    if (!EMAIL_RE.test(email)) {
      return json({ error: 'Invalid email' }, 400, cors);
    }

    const token = env.TELEGRAM_BOT_TOKEN;
    const chatId = env.TELEGRAM_CHAT_ID;
    if (!token || !chatId) {
      return json({ error: 'Server not configured' }, 500, cors);
    }

    const source = String(body.source || 'landing').slice(0, 32);
    const text = [
      '📬 New waitlist signup',
      `Email: ${email}`,
      `Source: ${source}`,
      `Time: ${new Date().toISOString()}`,
    ].join('\n');

    const tgRes = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text }),
    });

    const tgData = await tgRes.json();
    if (!tgRes.ok || !tgData.ok) {
      return json({ error: 'Failed to notify' }, 502, cors);
    }

    return json({ ok: true }, 200, cors);
  },
};
