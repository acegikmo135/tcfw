import React, { useEffect, useState } from 'react';
import { Download } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { useLocation } from 'react-router-dom';

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

export function InstallPWA({ alwaysShow = true }: { alwaysShow?: boolean }) {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstallable, setIsInstallable] = useState(false);
  const { t } = useLanguage();
  const location = useLocation();

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setIsInstallable(true);
    };

    // Check if it was already captured
    if ((window as any).deferredPWAInstallPrompt) {
      setDeferredPrompt((window as any).deferredPWAInstallPrompt);
      setIsInstallable(true);
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // Check if already installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstallable(false);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) {
      if (window.matchMedia('(display-mode: standalone)').matches) {
        alert("App is already installed and running in standalone mode.");
      } else {
        alert("Installation prompt is not available. You can install this app through your browser's menu (e.g., 'Add to Home Screen').");
      }
      return;
    }
    // Show the install prompt
    deferredPrompt.prompt();
    // Wait for the user to respond to the prompt
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      console.log('User accepted the install prompt');
    } else {
      console.log('User dismissed the install prompt');
    }
    // We've used the prompt, and can't use it again, throw it away
    setDeferredPrompt(null);
    setIsInstallable(false);
  };

  if (!isInstallable && !alwaysShow) {
    return null;
  }

  return (
    <button
      onClick={handleInstallClick}
      className="flex items-center justify-center gap-2 bg-[#5A5A40] text-white px-6 py-3 rounded-2xl font-medium hover:bg-[#4A4A30] transition-all w-full text-xs font-bold uppercase tracking-widest shadow-lg shadow-[#5A5A40]/20"
    >
      <Download className="w-4 h-4" />
      {isInstallable ? t('pwa.install') : (window.matchMedia('(display-mode: standalone)').matches ? "App Installed" : t('pwa.install'))}
    </button>
  );
}
