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
  // OneSignal requires HTTPS — skip on local dev
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
        serviceWorkerPath: '/OneSignalSDKWorker.js',
        serviceWorkerParam: { scope: '/' },
        notifyButton: { enable: false },
        welcomeNotification: { disable: true },
        // Required for Slidedown.promptPush() to render the in-app popup
        promptOptions: {
          slidedown: {
            prompts: [
              {
                type: 'push',
                autoPrompt: false, // we trigger manually via button click
                text: {
                  actionMessage: 'Get notified about new transactions, notices, and comments.',
                  acceptButton: 'Allow',
                  cancelButton: 'No Thanks',
                },
              },
            ],
          },
        },
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
    if (
      window.location.protocol !== 'https:' ||
      !('Notification' in window) ||
      !('serviceWorker' in navigator)
    ) {
      setStatus('unsupported');
      return;
    }

    // Poll until OneSignal SDK is ready (max ~9 seconds)
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

    // Safety net — never leave button stuck forever
    const safetyTimer = setTimeout(() => {
      setStatus(getOptedIn() === true ? 'subscribed' : 'unsubscribed');
    }, 60000);

    try {
      if (status === 'subscribed') {
        await os.User.PushSubscription.optOut();
        setStatus('unsubscribed');
      } else {
        // Trigger OneSignal's in-app slide popup.
        // force:true bypasses the cooldown so it shows every time the user clicks.
        // This popup then triggers the browser permission dialog when user clicks Allow.
        await os.Slidedown.promptPush({ force: true });

        // After the user interacts, give state a moment to settle
        await new Promise(r => setTimeout(r, 800));
        setStatus(getOptedIn() === true ? 'subscribed' : 'unsubscribed');
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
            <><CheckCircle2 className="w-3.5 h-3.5" /> Notifications on</>
          ) : (
            <><XCircle className="w-3.5 h-3.5" /> Notifications off</>
          )}
        </span>
      )}
    </div>
  );
}
