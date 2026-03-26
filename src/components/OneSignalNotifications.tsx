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
      promptOptions: {
        slidedown: {
          enabled: true,
          actionMessage: 'Enable notifications to stay updated on transactions, notices, and comments.',
          acceptButtonText: 'Allow',
          cancelButtonText: 'No thanks',
        },
      },
    });
  });
}

function getOptedIn(): boolean | null {
  try {
    const val = window.OneSignal?.User?.PushSubscription?.optedIn;
    return val === true ? true : val === false ? false : null;
  } catch {
    return null;
  }
}

export function OneSignalButton({ className }: { className?: string }) {
  const [status, setStatus] = useState<'loading' | 'subscribed' | 'unsubscribed' | 'unsupported'>('loading');

  useEffect(() => {
    if (!('Notification' in window) || !('serviceWorker' in navigator)) {
      setStatus('unsupported');
      return;
    }

    // Poll until OneSignal SDK is ready, then read subscription state
    const interval = setInterval(() => {
      const OneSignal = window.OneSignal;
      if (!OneSignal) return;
      clearInterval(interval);
      const opted = getOptedIn();
      setStatus(opted === true ? 'subscribed' : 'unsubscribed');
    }, 300);

    return () => clearInterval(interval);
  }, []);

  const handleClick = async () => {
    if (status === 'loading' || status === 'unsupported') return;

    const OneSignal = window.OneSignal;
    if (!OneSignal) return;

    setStatus('loading');

    // Safety timeout — never leave button stuck in loading state
    const safetyTimer = setTimeout(() => {
      const opted = getOptedIn();
      setStatus(opted === true ? 'subscribed' : 'unsubscribed');
    }, 20000);

    try {
      if (status === 'subscribed') {
        await OneSignal.User.PushSubscription.optOut();
        setStatus('unsubscribed');
      } else {
        // Let OneSignal show its own slide prompt (in-app popup),
        // which then triggers the browser permission dialog.
        await OneSignal.Slidedown.promptPush();

        // Wait a moment for the subscription state to settle after user acts
        await new Promise(r => setTimeout(r, 800));
        const opted = getOptedIn();
        setStatus(opted === true ? 'subscribed' : 'unsubscribed');
      }
    } catch (e) {
      console.error('OneSignal error:', e);
      const opted = getOptedIn();
      setStatus(opted === true ? 'subscribed' : 'unsubscribed');
    } finally {
      clearTimeout(safetyTimer);
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
