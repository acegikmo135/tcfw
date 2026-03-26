export const config = { runtime: 'edge' };

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  const ONESIGNAL_APP_ID = process.env.VITE_ONESIGNAL_APP_ID;
  const ONESIGNAL_REST_API_KEY = process.env.ONESIGNAL_REST_API_KEY;

  if (!ONESIGNAL_APP_ID || !ONESIGNAL_REST_API_KEY) {
    return new Response(
      JSON.stringify({ error: 'OneSignal not configured' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }

  let body: { title?: string; message?: string; url?: string } = {};
  try {
    body = await req.json();
  } catch {
    return new Response(
      JSON.stringify({ error: 'Invalid JSON body' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  const { title, message, url } = body;

  if (!title || !message) {
    return new Response(
      JSON.stringify({ error: 'title and message are required' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  const response = await fetch('https://onesignal.com/api/v1/notifications', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Basic ${ONESIGNAL_REST_API_KEY}`,
    },
    body: JSON.stringify({
      app_id: ONESIGNAL_APP_ID,
      included_segments: ['All'],
      headings: { en: title },
      contents: { en: message },
      url: url || 'https://tcfw.manthank.com',
      priority: 10,
    }),
  });

  const data = await response.json();
  return new Response(JSON.stringify(data), {
    status: response.ok ? 200 : 500,
    headers: { 'Content-Type': 'application/json' },
  });
}
