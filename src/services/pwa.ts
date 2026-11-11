// PWA Registration & Install Manager for Souq Al-Wali

export interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

let deferredInstallPrompt: BeforeInstallPromptEvent | null = null;
const installListeners = new Set<(canInstall: boolean) => void>();
const appInstalledListeners = new Set<() => void>();

export function registerServiceWorker() {
  if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker
        .register('/sw.js')
        .then((registration) => {
          console.log('[PWA] Service Worker registered with scope:', registration.scope);

          // Check for SW updates
          registration.addEventListener('updatefound', () => {
            const installingWorker = registration.installing;
            if (installingWorker) {
              installingWorker.addEventListener('statechange', () => {
                if (installingWorker.state === 'installed') {
                  if (navigator.serviceWorker.controller) {
                    console.log('[PWA] New version available, updating now...');
                    installingWorker.postMessage({ type: 'SKIP_WAITING' });
                  }
                }
              });
            }
          });
        })
        .catch((error) => {
          console.warn('[PWA] Service Worker registration failed:', error);
        });
    });
  }

  // Capture beforeinstallprompt event for Android / Chrome
  if (typeof window !== 'undefined') {
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      deferredInstallPrompt = e as BeforeInstallPromptEvent;
      console.log('[PWA] beforeinstallprompt captured, ready for 1-click install');
      notifyInstallListeners(true);
    });

    window.addEventListener('appinstalled', () => {
      console.log('[PWA] Souq Al-Wali successfully installed as PWA!');
      deferredInstallPrompt = null;
      notifyInstallListeners(false);
      appInstalledListeners.forEach((cb) => cb());
    });
  }
}

function notifyInstallListeners(canInstall: boolean) {
  installListeners.forEach((cb) => cb(canInstall));
}

export function subscribeInstallState(callback: (canInstall: boolean) => void) {
  installListeners.add(callback);
  // Initial check
  callback(Boolean(deferredInstallPrompt));
  return () => {
    installListeners.delete(callback);
  };
}

export function subscribeAppInstalled(callback: () => void) {
  appInstalledListeners.add(callback);
  return () => {
    appInstalledListeners.delete(callback);
  };
}

export function isAppInstalled(): boolean {
  if (typeof window === 'undefined') return false;
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as any).standalone === true ||
    document.referrer.includes('android-app://')
  );
}

export function isInIframe(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return window.self !== window.top;
  } catch (e) {
    return true;
  }
}

export function openInStandaloneBrowser(): void {
  if (typeof window !== 'undefined') {
    const targetUrl = window.location.href;
    window.open(targetUrl, '_blank', 'noopener,noreferrer');
  }
}

export function isAndroid(): boolean {
  if (typeof navigator === 'undefined') return false;
  return /Android/i.test(navigator.userAgent);
}

export function isIOS(): boolean {
  if (typeof navigator === 'undefined') return false;
  return /iPhone|iPad|iPod/i.test(navigator.userAgent);
}

export async function promptInstallApp(): Promise<'accepted' | 'dismissed' | 'manual'> {
  if (deferredInstallPrompt) {
    try {
      await deferredInstallPrompt.prompt();
      const choiceResult = await deferredInstallPrompt.userChoice;
      console.log('[PWA] User response to install prompt:', choiceResult.outcome);
      if (choiceResult.outcome === 'accepted') {
        deferredInstallPrompt = null;
        notifyInstallListeners(false);
      }
      return choiceResult.outcome;
    } catch (err) {
      console.warn('[PWA] Install prompt error:', err);
      return 'manual';
    }
  }
  return 'manual';
}
