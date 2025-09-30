import { useEffect, useState } from 'react';
import { Platform } from 'react-native';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export type InstallState =
  | 'not-installable'  // Not on web or already installed
  | 'installable'      // Can show prompt (Chrome/Edge desktop/Android)
  | 'ios-safari'       // iOS Safari - needs manual instructions
  | 'installed';       // App is already installed

export function usePWAInstall() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [installState, setInstallState] = useState<InstallState>('not-installable');

  useEffect(() => {
    if (Platform.OS !== 'web') {
      setInstallState('not-installable');
      return;
    }

    // Check if already installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setInstallState('installed');
      return;
    }

    // Detect iOS Safari
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);

    if (isIOS && isSafari) {
      setInstallState('ios-safari');
      return;
    }

    // Listen for install prompt (Chrome/Edge on Android/Desktop)
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setInstallState('installable');
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // Check if SW is registered (means PWA is ready)
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.ready.then(() => {
        // PWA is ready, but if no install prompt came, might be Android Chrome
        // waiting for engagement heuristics
        setTimeout(() => {
          if (installState === 'not-installable' && !deferredPrompt) {
            // On Android Chrome, show manual instructions after timeout
            const isAndroid = /android/i.test(navigator.userAgent);
            if (isAndroid) {
              setInstallState('installable'); // Show button anyway
            }
          }
        }, 2000);
      });
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const promptInstall = async () => {
    if (!deferredPrompt) return false;

    try {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;

      if (outcome === 'accepted') {
        setDeferredPrompt(null);
        setInstallState('installed');
        return true;
      }
      return false;
    } catch (error) {
      console.error('Install prompt error:', error);
      return false;
    }
  };

  return {
    installState,
    canPrompt: !!deferredPrompt,
    promptInstall
  };
}