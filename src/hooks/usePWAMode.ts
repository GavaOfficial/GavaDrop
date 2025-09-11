"use client";

import { useState, useEffect } from 'react';

interface PWAModeInfo {
  isStandalone: boolean;
  isPWA: boolean;
  isMobile: boolean;
  isInstallable: boolean;
  displayMode: 'browser' | 'standalone' | 'minimal-ui' | 'fullscreen';
}

export const usePWAMode = (): PWAModeInfo => {
  const [pwaInfo, setPwaInfo] = useState<PWAModeInfo>({
    isStandalone: false,
    isPWA: false,
    isMobile: false,
    isInstallable: false,
    displayMode: 'browser'
  });

  useEffect(() => {
    const checkPWAMode = () => {
      // Check if running in standalone mode (PWA)
      const isStandalone = (window.navigator as Navigator & { standalone?: boolean }).standalone === true || 
                          window.matchMedia('(display-mode: standalone)').matches ||
                          window.matchMedia('(display-mode: minimal-ui)').matches;
      
      // Check if device is mobile
      const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
                      window.innerWidth < 768;
      
      // Determine display mode
      let displayMode: 'browser' | 'standalone' | 'minimal-ui' | 'fullscreen' = 'browser';
      if (window.matchMedia('(display-mode: standalone)').matches) displayMode = 'standalone';
      else if (window.matchMedia('(display-mode: minimal-ui)').matches) displayMode = 'minimal-ui';
      else if (window.matchMedia('(display-mode: fullscreen)').matches) displayMode = 'fullscreen';

      // Check if app is installable (BeforeInstallPromptEvent)
      const isInstallable = 'beforeinstallprompt' in window;

      // PWA is considered active if standalone or minimal-ui
      const isPWA = isStandalone || displayMode === 'minimal-ui';

      setPwaInfo({
        isStandalone,
        isPWA,
        isMobile,
        isInstallable,
        displayMode
      });
    };

    // Initial check
    checkPWAMode();

    // Listen for display mode changes
    const standaloneQuery = window.matchMedia('(display-mode: standalone)');
    const minimalUIQuery = window.matchMedia('(display-mode: minimal-ui)');
    
    const handleChange = () => checkPWAMode();
    standaloneQuery.addEventListener('change', handleChange);
    minimalUIQuery.addEventListener('change', handleChange);

    // Listen for resize to update mobile status
    window.addEventListener('resize', checkPWAMode);

    return () => {
      standaloneQuery.removeEventListener('change', handleChange);
      minimalUIQuery.removeEventListener('change', handleChange);
      window.removeEventListener('resize', checkPWAMode);
    };
  }, []);

  return pwaInfo;
};