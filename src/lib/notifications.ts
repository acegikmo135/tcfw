export interface NotificationPayload {
  title: string;
  message: string;
  url?: string;
}

export async function sendPushNotification(payload: NotificationPayload): Promise<void> {
  try {
    const response = await fetch('/api/notify', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        title: payload.title,
        message: payload.message,
        url: payload.url || window.location.origin,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('[Notification] Failed to send:', {
        status: response.status,
        statusText: response.statusText,
        error: errorData
      });
      return;
    }

    const data = await response.json();
    console.log('[Notification] Sent successfully:', data);
  } catch (error) {
    console.error('[Notification] Error sending notification:', error);
  }
}
