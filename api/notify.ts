export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const ONESIGNAL_APP_ID = process.env.VITE_ONESIGNAL_APP_ID;
  const ONESIGNAL_REST_API_KEY = process.env.ONESIGNAL_REST_API_KEY;

  if (!ONESIGNAL_APP_ID || !ONESIGNAL_REST_API_KEY) {
    return res.status(500).json({ error: 'OneSignal not configured' });
  }

  const { title, message, url } = req.body || {};

  if (!title || !message) {
    return res.status(400).json({ error: 'title and message are required' });
  }

  try {
    const response = await fetch('https://onesignal.com/api/v1/notifications', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${ONESIGNAL_REST_API_KEY}`,
      },
      body: JSON.stringify({
        app_id: ONESIGNAL_APP_ID,
        included_segments: ['All'],
        headings: { en: title },
        contents: { en: message },
        url: url || 'https://tcfw.manthank.com',
        priority: 10,
        isAnyWeb: true,
      }),
    });

    const data = await response.json();
    return res.status(response.ok ? 200 : 500).json(data);
  } catch (error) {
    return res.status(500).json({ error: String(error) });
  }
}
