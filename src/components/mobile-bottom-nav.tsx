"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Home, 
  Users, 
  MessageCircle, 
  History
} from "lucide-react";
import { useLanguage } from "@/contexts/language-context";

interface MobileBottomNavProps {
  activeTab: 'home' | 'devices' | 'chat' | 'history';
  onTabChange: (tab: 'home' | 'devices' | 'chat' | 'history') => void;
  unreadCount: number;
  hasSelectedDevice: boolean;
}

export const MobileBottomNav = ({
  activeTab,
  onTabChange,
  unreadCount,
  hasSelectedDevice
}: MobileBottomNavProps) => {
  const { t } = useLanguage();

  const tabs = [
    {
      id: 'home' as const,
      icon: Home,
      label: t("nav.home") || "Home",
      disabled: false
    },
    {
      id: 'devices' as const,
      icon: Users,
      label: t("nav.devices") || "Devices",
      disabled: false
    },
    {
      id: 'chat' as const,
      icon: MessageCircle,
      label: t("nav.chat") || "Chat",
      disabled: !hasSelectedDevice,
      badge: unreadCount > 0 ? unreadCount : undefined
    },
    {
      id: 'history' as const,
      icon: History,
      label: t("nav.history") || "History",
      disabled: false
    }
  ];

  return (
    <div className="ios-bottom-nav bg-background/95 backdrop-blur-md border-t border-border/10 relative">
      <div className="flex items-center justify-around px-2 py-1 pb-safe">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          
          return (
            <Button
              key={tab.id}
              variant="ghost"
              size="sm"
              disabled={tab.disabled}
              onClick={() => onTabChange(tab.id)}
              className={`flex flex-col items-center gap-1 px-3 py-2 h-auto min-h-[64px] relative transition-all duration-200 ${
                isActive 
                  ? 'text-primary' 
                  : tab.disabled 
                    ? 'text-muted-foreground/40' 
                    : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <div className="relative">
                <Icon 
                  className={`h-6 w-6 transition-all duration-200 ${
                    isActive ? 'scale-110' : 'scale-100'
                  }`} 
                />
                {tab.badge && (
                  <Badge 
                    variant="destructive" 
                    className="absolute -top-2 -right-2 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs font-bold animate-pulse"
                  >
                    {tab.badge > 9 ? '9+' : tab.badge}
                  </Badge>
                )}
              </div>
              <span className={`text-xs font-medium transition-all duration-200 ${
                isActive ? 'text-primary font-semibold' : ''
              }`}>
                {tab.label}
              </span>
              {isActive && (
                <div className="absolute top-0 left-1/2 transform -translate-x-1/2 w-8 h-1 bg-primary rounded-full" />
              )}
            </Button>
          );
        })}
      </div>
    </div>
  );
};