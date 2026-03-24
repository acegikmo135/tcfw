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

interface InstallPWAProps {
  alwaysShow?: boolean;
  inline?: boolean;
}

export function InstallPWA({ alwaysShow = false, inline = false }: InstallPWAProps) {
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

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) {
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

  const shouldShow = alwaysShow || isInstallable;

  if (!shouldShow) {
    return null;
  }

  return (
    <div className={inline ? "w-full" : "fixed bottom-6 left-1/2 -translate-x-1/2 z-50"}>
      <button
        onClick={handleInstallClick}
        className={`flex items-center gap-2 px-6 py-3 rounded-full font-bold transition-all hover:-translate-y-1 ${
          inline 
            ? "bg-white/20 text-white hover:bg-white/30 w-full justify-center border border-white/30" 
            : "bg-blue-700 text-white shadow-lg shadow-blue-700/20 hover:bg-blue-800"
        }`}
      >
        <Download className="w-5 h-5" />
        {t('pwa.install')}
      </button>
    </div>
  );
}
