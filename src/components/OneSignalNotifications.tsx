import React, { useEffect, useState } from 'react';
import { Bell, BellOff, Loader2 } from 'lucide-react';

declare global {
  interface Window {
    OneSignalDeferred?: ((OneSignal: any) => void | Promise<void>)[];
    OneSignal?: any;
  }
}

let sdkInitialized = false;

export function initOneSignal(appId: string) {
  if (!appId || sdkInitialized) return;
  sdkInitialized = true;

  window.OneSignalDeferred = window.OneSignalDeferred || [];

  if (!document.getElementById('onesignal-sdk')) {
    const script = document.createElement('script');
    script.id = 'onesignal-sdk';
    script.src = 'https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.page.js';
    script.defer = true;
    document.head.appendChild(script);
  }

  window.OneSignalDeferred.push(async (OneSignal: any) => {
    await OneSignal.init({
      appId,
      serviceWorkerPath: 'OneSignalSDKWorker.js',
      serviceWorkerParam: { scope: '/' },
      notifyButton: { enable: false },
      welcomeNotification: { disable: true },
    });
  });
}

export function OneSignalButton({ className }: { className?: string }) {
  const [status, setStatus] = useState<'loading' | 'subscribed' | 'unsubscribed' | 'unsupported'>('loading');

  useEffect(() => {
    if (!('Notification' in window) || !('serviceWorker' in navigator)) {
      setStatus('unsupported');
      return;
    }

    // Wait for OneSignal to finish initializing, then read subscription state
    const interval = setInterval(async () => {
      const OneSignal = window.OneSignal;
      if (!OneSignal) return;
      clearInterval(interval);
      try {
        const opted = OneSignal.User?.PushSubscription?.optedIn;
        setStatus(opted ? 'subscribed' : 'unsubscribed');
      } catch {
        setStatus('unsubscribed');
      }
    }, 300);

    return () => clearInterval(interval);
  }, []);

  const handleClick = async () => {
    if (status === 'loading' || status === 'unsupported') return;

    const OneSignal = window.OneSignal;
    if (!OneSignal) return;

    setStatus('loading');
    try {
      if (status === 'subscribed') {
        await OneSignal.User.PushSubscription.optOut();
        setStatus('unsubscribed');
      } else {
        // Request browser permission then subscribe
        const permission = await Notification.requestPermission();
        if (permission === 'granted') {
          await OneSignal.User.PushSubscription.optIn();
          setStatus('subscribed');
        } else {
          setStatus('unsubscribed');
        }
      }
    } catch (e) {
      console.error('OneSignal error:', e);
      setStatus('unsubscribed');
    }
  };

  if (status === 'unsupported') return null;

  return (
    <button
      onClick={handleClick}
      disabled={status === 'loading'}
      className={className}
    >
      {status === 'loading' ? (
        <Loader2 className="w-5 h-5 animate-spin" />
      ) : status === 'subscribed' ? (
        <BellOff className="w-5 h-5" />
      ) : (
        <Bell className="w-5 h-5" />
      )}
      {status === 'loading'
        ? 'Please wait...'
        : status === 'subscribed'
        ? 'Mute Notifications'
        : 'Enable Notifications'}
    </button>
  );
}
