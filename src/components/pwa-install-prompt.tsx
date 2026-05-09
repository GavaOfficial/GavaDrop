"use client";

import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Download, 
  X, 
  Smartphone, 
  Monitor,
  Tablet,
  Share,
  Plus
} from "lucide-react";
import { useLanguage } from "@/contexts/language-context";
import { usePWAMode } from "@/hooks/usePWAMode";

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: ReadonlyArray<string>;
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

export const PWAInstallPrompt = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [hasBeenDismissed, setHasBeenDismissed] = useState(false);
  const { t } = useLanguage();
  const { isStandalone, isMobile } = usePWAMode();

  useEffect(() => {
    // Check if user has previously dismissed the prompt
    const dismissed = localStorage.getItem('pwa-install-dismissed');
    if (dismissed) {
      setHasBeenDismissed(true);
    }

    const handleBeforeInstallPrompt = (e: Event) => {
      // Prevent the mini-infobar from appearing on mobile
      e.preventDefault();
      
      const promptEvent = e as BeforeInstallPromptEvent;
      setDeferredPrompt(promptEvent);
      
      // Show the install prompt after a delay if not dismissed and not already installed
      if (!dismissed && !isStandalone) {
        setTimeout(() => {
          setIsVisible(true);
        }, 3000); // Show after 3 seconds
      }
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, [isStandalone]);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;

    try {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      
      if (outcome === 'accepted') {
        console.log('PWA installata dall\'utente');
      } else {
        console.log('Installazione PWA rifiutata dall\'utente');
        // Dismiss for current session
        setHasBeenDismissed(true);
        localStorage.setItem('pwa-install-dismissed', 'session');
      }
      
      setDeferredPrompt(null);
      setIsVisible(false);
    } catch (error) {
      console.error('Errore durante l\'installazione PWA:', error);
    }
  };

  const handleDismiss = () => {
    setIsVisible(false);
    setHasBeenDismissed(true);
    localStorage.setItem('pwa-install-dismissed', 'persistent');
  };

  const getDeviceIcon = () => {
    if (isMobile) {
      if (navigator.userAgent.includes('iPad')) return Tablet;
      return Smartphone;
    }
    return Monitor;
  };

  const getInstallInstructions = () => {
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    const isSafari = /Safari/.test(navigator.userAgent) && !/Chrome/.test(navigator.userAgent);
    
    if (isIOS && isSafari) {
      return {
        title: t("pwa.installTitleIos"),
        steps: [
          { icon: Share, text: t("pwa.iosStepShare") },
          { icon: Plus, text: t("pwa.iosStepHome") },
          { icon: Smartphone, text: t("pwa.iosStepConfirm") }
        ]
      };
    }
    
    return {
      title: t("pwa.installTitle"),
      steps: [
        { icon: Download, text: t("pwa.stepInstall") },
        { icon: getDeviceIcon(), text: t("pwa.stepAvailable") },
        { icon: Smartphone, text: t("pwa.stepQuickAccess") }
      ]
    };
  };

  // Don't show if already installed, dismissed, or no prompt available
  if (isStandalone || hasBeenDismissed || !isVisible) {
    return null;
  }

  const DeviceIcon = getDeviceIcon();
  const instructions = getInstallInstructions();
  const showNativePrompt = !!deferredPrompt;
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
  const isSafari = /Safari/.test(navigator.userAgent) && !/Chrome/.test(navigator.userAgent);

  return (
    <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-80 z-50 animate-in slide-in-from-bottom-4 duration-500">
      <Card className="p-4 shadow-2xl border-2 border-primary/20 bg-background/95 backdrop-blur-md">
        <div className="flex items-start gap-3 mb-4">
          <div className="p-2 bg-primary/10 rounded-lg">
            <DeviceIcon className="h-6 w-6 text-primary" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-bold text-sm text-foreground">
                {instructions.title}
              </h3>
              <Badge variant="secondary" className="text-xs">PWA</Badge>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              {t("pwa.description")}
            </p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleDismiss}
            className="p-1 h-6 w-6 text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Benefits */}
        <div className="space-y-2 mb-4">
          {instructions.steps.map((step, index) => {
            const StepIcon = step.icon;
            return (
              <div key={index} className="flex items-center gap-3">
                <div className="w-5 h-5 bg-muted rounded flex items-center justify-center">
                  <StepIcon className="h-3 w-3 text-muted-foreground" />
                </div>
                <p className="text-xs text-muted-foreground">
                  {step.text}
                </p>
              </div>
            );
          })}
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2">
          {showNativePrompt && !isIOS ? (
            <Button
              onClick={handleInstallClick}
              size="sm"
              className="flex-1 h-9 text-xs bg-primary hover:bg-primary/90"
            >
              <Download className="h-4 w-4 mr-2" />
              {t("pwa.installApp")}
            </Button>
          ) : (
            <Button
              size="sm"
              variant="outline"
              className="flex-1 h-9 text-xs"
              onClick={() => {
                // For iOS or browsers that don't support the install prompt
                if (isIOS && isSafari) {
                  // Show instructions for iOS
                  alert(t("pwa.iosAlert"));
                } else {
                  alert(t("pwa.unsupportedAlert"));
                }
              }}
            >
              <DeviceIcon className="h-4 w-4 mr-2" />
              {t("pwa.instructions")}
            </Button>
          )}
          
          <Button
            variant="ghost"
            size="sm"
            onClick={handleDismiss}
            className="px-3 h-9 text-xs text-muted-foreground"
          >
            {t("pwa.notNow")}
          </Button>
        </div>
      </Card>
    </div>
  );
};
