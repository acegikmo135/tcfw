/// <reference types="vite/client" />
import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { registerSW } from 'virtual:pwa-register';

// Register service worker
registerSW({ immediate: true });

// Initialize OneSignal
const onesignalAppId = process.env.VITE_ONESIGNAL_APP_ID;
if (onesignalAppId) {
  const OneSignal = (window as any).OneSignal || [];
  OneSignal.push(() => {
    OneSignal.init({
      appId: onesignalAppId,
      allowLocalhostAsSecureOrigin: true,
      notifyButton: {
        enable: true,
      },
    });
  });
}

// Capture the event early
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  (window as any).deferredPWAInstallPrompt = e;
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
