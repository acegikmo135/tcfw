export const config = {
  runtime: 'edge',
  regions: ['iad1']
};

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export default async function handler(req: Request): Promise<Response> {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: corsHeaders,
    });
  }

  if (req.method !== 'POST') {
    return new Response('Method not allowed', {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  const ONESIGNAL_APP_ID = process.env.VITE_ONESIGNAL_APP_ID;
  const ONESIGNAL_REST_API_KEY = process.env.ONESIGNAL_REST_API_KEY;

  console.log('[Notify API] Environment check:', {
    hasAppId: !!ONESIGNAL_APP_ID,
    hasApiKey: !!ONESIGNAL_REST_API_KEY,
    appId: ONESIGNAL_APP_ID?.substring(0, 8) + '...'
  });

  if (!ONESIGNAL_APP_ID || !ONESIGNAL_REST_API_KEY) {
    console.error('[Notify API] OneSignal credentials missing');
    return new Response(
      JSON.stringify({
        error: 'OneSignal not configured',
        details: 'Missing VITE_ONESIGNAL_APP_ID or ONESIGNAL_REST_API_KEY'
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }

  let body: { title?: string; message?: string; url?: string } = {};
  try {
    body = await req.json();
  } catch (err) {
    console.error('[Notify API] Invalid JSON:', err);
    return new Response(
      JSON.stringify({ error: 'Invalid JSON body' }),
      {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }

  const { title, message, url } = body;

  if (!title || !message) {
    console.error('[Notify API] Missing required fields:', { title, message });
    return new Response(
      JSON.stringify({ error: 'title and message are required' }),
      {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }

  try {
    console.log('[Notify API] Sending notification:', { title, messageLength: message.length });

    const notificationPayload = {
      app_id: ONESIGNAL_APP_ID,
      included_segments: ['All'],
      headings: { en: title },
      contents: { en: message },
      url: url || 'https://tcfw.manthank.com',
      priority: 10,
      web_buttons: [
        {
          id: 'view',
          text: 'View',
          url: url || 'https://tcfw.manthank.com'
        }
      ]
    };

    const response = await fetch('https://onesignal.com/api/v1/notifications', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${ONESIGNAL_REST_API_KEY}`,
      },
      body: JSON.stringify(notificationPayload),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('[Notify API] OneSignal error:', data);
      return new Response(JSON.stringify({
        error: 'OneSignal request failed',
        details: data
      }), {
        status: response.status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('[Notify API] Success:', data);
    return new Response(JSON.stringify({
      success: true,
      ...data
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('[Notify API] Exception:', error);
    return new Response(JSON.stringify({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
}
