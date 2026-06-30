// Cloudflare Pages Function - GET /api/logs
// Replaces Express server's GET /api/logs endpoint
// Uses KV storage instead of file system

export const onRequestGet = async (context) => {
  const { env } = context;

  try {
    const logs = await env.POSTURE_KV.get('logs', 'json');
    return new Response(JSON.stringify(logs || []), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('Read error:', err);
    return new Response(JSON.stringify([]), {
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
