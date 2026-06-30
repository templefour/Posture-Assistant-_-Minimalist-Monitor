// Cloudflare Pages Function - POST /api/log
// Replaces Express server's POST /api/log endpoint
// Uses KV storage instead of file system

export const onRequestPost = async (context) => {
  const { request, env } = context;

  try {
    const body = await request.json();
    const { timestamp, message, type } = body;

    if (!timestamp || !message) {
      return new Response(JSON.stringify({ error: 'Missing fields' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const logEntry = {
      id: Date.now().toString(36) + Math.random().toString(36).substr(2),
      timestamp,
      message,
      type,
      receivedAt: new Date().toISOString(),
    };

    // Read existing logs from KV
    let logs = [];
    const existing = await env.POSTURE_KV.get('logs', 'json');
    if (existing) {
      logs = existing;
    }

    logs.push(logEntry);

    // Keep last 1000 logs (same as original)
    if (logs.length > 1000) {
      logs = logs.slice(-1000);
    }

    // Save back to KV
    await env.POSTURE_KV.put('logs', JSON.stringify(logs));

    return new Response(JSON.stringify({ success: true }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('Log error:', err);
    return new Response(JSON.stringify({ error: 'Internal Server Error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
