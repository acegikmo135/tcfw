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
      serviceWorkerPath: '/OneSignalSDKWorker.js',
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

    const check = () => {
      window.OneSignalDeferred = window.OneSignalDeferred || [];
      window.OneSignalDeferred.push(async (OneSignal: any) => {
        try {
          const opted = await OneSignal.User.PushSubscription.optedIn;
          setStatus(opted ? 'subscribed' : 'unsubscribed');
        } catch {
          setStatus('unsubscribed');
        }
      });
    };

    const interval = setInterval(() => {
      if (window.OneSignal) {
        clearInterval(interval);
        check();
      }
    }, 300);

    return () => clearInterval(interval);
  }, []);

  const handleClick = () => {
    if (status === 'unsupported') return;
    setStatus('loading');
    window.OneSignalDeferred = window.OneSignalDeferred || [];
    window.OneSignalDeferred.push(async (OneSignal: any) => {
      try {
        if (status === 'subscribed') {
          await OneSignal.User.PushSubscription.optOut();
          setStatus('unsubscribed');
        } else {
          await OneSignal.Slidedown.promptPush({ force: true });
          const opted = await OneSignal.User.PushSubscription.optedIn;
          setStatus(opted ? 'subscribed' : 'unsubscribed');
        }
      } catch (e) {
        console.error('OneSignal error:', e);
        setStatus('unsubscribed');
      }
    });
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
