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
  // OneSignal requires HTTPS and a configured domain — skip on localhost/dev
  if (window.location.protocol !== 'https:') return;
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
    try {
      await OneSignal.init({
        appId,
        serviceWorkerPath: 'OneSignalSDKWorker.js',
        serviceWorkerParam: { scope: '/' },
        notifyButton: { enable: false },
        welcomeNotification: { disable: true },
      });
    } catch (e) {
      console.warn('[OneSignal] Init failed:', e);
    }
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
    // Not on HTTPS — notifications won't work
    if (window.location.protocol !== 'https:') {
      setStatus('unsupported');
      return;
    }
    if (!('Notification' in window) || !('serviceWorker' in navigator)) {
      setStatus('unsupported');
      return;
    }

    // Poll for OneSignal to finish loading, max ~8 seconds
    let attempts = 0;
    const interval = setInterval(() => {
      attempts++;
      const OneSignal = window.OneSignal;
      if (OneSignal) {
        clearInterval(interval);
        const opted = getOptedIn();
        setStatus(opted === true ? 'subscribed' : 'unsubscribed');
        return;
      }
      if (attempts >= 26) {
        // SDK failed to load (wrong domain, blocked, etc.) — hide button
        clearInterval(interval);
        setStatus('unsupported');
      }
    }, 300);

    return () => clearInterval(interval);
  }, []);

  const handleClick = async () => {
    if (status === 'loading' || status === 'unsupported') return;

    const OneSignal = window.OneSignal;
    if (!OneSignal) return;

    setStatus('loading');

    // Never leave the button stuck — always resolve within 20s
    const safetyTimer = setTimeout(() => {
      const opted = getOptedIn();
      setStatus(opted === true ? 'subscribed' : 'unsubscribed');
    }, 20000);

    try {
      if (status === 'subscribed') {
        await OneSignal.User.PushSubscription.optOut();
        setStatus('unsubscribed');
      } else {
        // Request browser permission directly (most reliable cross-browser)
        const permission = await Notification.requestPermission();
        if (permission === 'granted') {
          // Subscribe via OneSignal with a 6-second timeout
          await Promise.race([
            OneSignal.User.PushSubscription.optIn(),
            new Promise<void>(resolve => setTimeout(resolve, 6000)),
          ]);
          const opted = getOptedIn();
          setStatus(opted === true ? 'subscribed' : 'unsubscribed');
        } else {
          setStatus('unsubscribed');
        }
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
