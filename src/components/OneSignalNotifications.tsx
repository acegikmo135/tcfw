import React, { useEffect, useState } from 'react';
import { Bell, BellOff, Loader2, CheckCircle2, XCircle } from 'lucide-react';

declare global {
  interface Window {
    OneSignalDeferred?: ((OneSignal: any) => void | Promise<void>)[];
    OneSignal?: any;
  }
}

let sdkInitialized = false;

export function initOneSignal(appId: string) {
  if (!appId || sdkInitialized) return;
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

type Status = 'loading' | 'subscribed' | 'unsubscribed' | 'unsupported';

export function OneSignalButton({ className }: { className?: string }) {
  const [status, setStatus] = useState<Status>('loading');

  useEffect(() => {
    if (window.location.protocol !== 'https:' ||
        !('Notification' in window) ||
        !('serviceWorker' in navigator)) {
      setStatus('unsupported');
      return;
    }

    let attempts = 0;
    const interval = setInterval(() => {
      attempts++;
      const os = window.OneSignal;
      if (os) {
        clearInterval(interval);
        const opted = getOptedIn();
        setStatus(opted === true ? 'subscribed' : 'unsubscribed');
        return;
      }
      if (attempts >= 30) {
        clearInterval(interval);
        setStatus('unsupported');
      }
    }, 300);

    return () => clearInterval(interval);
  }, []);

  const handleClick = async () => {
    if (status === 'loading' || status === 'unsupported') return;
    const os = window.OneSignal;
    if (!os) return;

    setStatus('loading');

    const safetyTimer = setTimeout(() => {
      setStatus(getOptedIn() === true ? 'subscribed' : 'unsubscribed');
    }, 30000);

    try {
      if (status === 'subscribed') {
        await os.User.PushSubscription.optOut();
        setStatus('unsubscribed');
      } else {
        // Ask browser for permission, then use OneSignal to complete subscription
        const permission = await Notification.requestPermission();
        if (permission === 'granted') {
          await Promise.race([
            os.User.PushSubscription.optIn(),
            new Promise<void>(r => setTimeout(r, 10000)),
          ]);
          await new Promise(r => setTimeout(r, 600));
          setStatus(getOptedIn() === true ? 'subscribed' : 'unsubscribed');
        } else {
          setStatus('unsubscribed');
        }
      }
    } catch (e) {
      console.error('[OneSignal]', e);
      setStatus(getOptedIn() === true ? 'subscribed' : 'unsubscribed');
    } finally {
      clearTimeout(safetyTimer);
    }
  };

  if (status === 'unsupported') return null;

  return (
    <div className="flex flex-col items-start gap-1.5">
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

      {status !== 'loading' && (
        <span className={`flex items-center gap-1 text-xs font-medium ${
          status === 'subscribed' ? 'text-green-600' : 'text-gray-400'
        }`}>
          {status === 'subscribed' ? (
            <>
              <CheckCircle2 className="w-3.5 h-3.5" />
              Notifications on
            </>
          ) : (
            <>
              <XCircle className="w-3.5 h-3.5" />
              Notifications off
            </>
          )}
        </span>
      )}
    </div>
  );
}
