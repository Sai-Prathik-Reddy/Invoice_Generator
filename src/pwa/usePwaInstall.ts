import { useState, useEffect, useCallback } from 'react';

export interface DeviceInfo {
  isMobile: boolean;
  isIOS: boolean;
  isAndroid: boolean;
  isMac: boolean;
  isWindows: boolean;
  isChrome: boolean;
  isSafari: boolean;
  isEdge: boolean;
  platformName: string;
}

export function detectDevice(): DeviceInfo {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') {
    return {
      isMobile: false,
      isIOS: false,
      isAndroid: false,
      isMac: false,
      isWindows: false,
      isChrome: false,
      isSafari: false,
      isEdge: false,
      platformName: 'Desktop',
    };
  }

  const ua = navigator.userAgent || '';
  const isIOS =
    /iPad|iPhone|iPod/.test(ua) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const isAndroid = /Android/i.test(ua);
  const isMobile = isIOS || isAndroid || /Mobi|Tablet|Touch/i.test(ua) || window.innerWidth < 768;

  const isMac = /Macintosh|Mac OS X/i.test(ua) && !isIOS;
  const isWindows = /Windows/i.test(ua);
  const isEdge = /Edg\//i.test(ua);
  const isChrome = /Chrome\//i.test(ua) && !isEdge && !/OPR|Opera/i.test(ua);
  const isSafari = /Safari\//i.test(ua) && !isChrome && !isEdge;

  let platformName = 'Desktop';
  if (isIOS) platformName = 'iOS (iPhone / iPad)';
  else if (isAndroid) platformName = 'Android';
  else if (isMac) platformName = 'macOS';
  else if (isWindows) platformName = 'Windows';

  return {
    isMobile,
    isIOS,
    isAndroid,
    isMac,
    isWindows,
    isChrome,
    isSafari,
    isEdge,
    platformName,
  };
}

export function isStandalonePwa(): boolean {
  if (typeof window === 'undefined') return false;
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    window.matchMedia('(display-mode: window-controls-overlay)').matches ||
    (navigator as any).standalone === true ||
    document.referrer.includes('android-app://')
  );
}

export function usePwaInstall() {
  const [device, setDevice] = useState<DeviceInfo>(detectDevice);
  const [isStandalone, setIsStandalone] = useState<boolean>(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isPromptOpen, setIsPromptOpen] = useState<boolean>(false);

  useEffect(() => {
    const standalone = isStandalonePwa();
    setIsStandalone(standalone);
    setDevice(detectDevice());

    // Listen for beforeinstallprompt (Chromium Desktop & Android Chrome)
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);

    // Show guide on launch if not installed as standalone PWA and not dismissed this session
    if (!standalone) {
      const dismissed = sessionStorage.getItem('ingen_pwa_prompt_dismissed');
      if (!dismissed) {
        // Small delay to allow initial DOM render
        const timer = setTimeout(() => {
          setIsPromptOpen(true);
        }, 800);
        return () => {
          clearTimeout(timer);
          window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
        };
      }
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
    };
  }, []);

  const triggerInstall = useCallback(async () => {
    if (deferredPrompt) {
      try {
        await deferredPrompt.prompt();
        const choice = await deferredPrompt.userChoice;
        if (choice.outcome === 'accepted') {
          setIsPromptOpen(false);
          setDeferredPrompt(null);
        }
      } catch (err) {
        console.warn('Install prompt error:', err);
      }
    }
  }, [deferredPrompt]);

  const openPrompt = useCallback(() => {
    setIsPromptOpen(true);
  }, []);

  const closePrompt = useCallback((neverShowThisSession = true) => {
    setIsPromptOpen(false);
    if (neverShowThisSession) {
      sessionStorage.setItem('ingen_pwa_prompt_dismissed', 'true');
    }
  }, []);

  return {
    device,
    isStandalone,
    canInstallDirectly: Boolean(deferredPrompt),
    triggerInstall,
    isPromptOpen,
    openPrompt,
    closePrompt,
  };
}
