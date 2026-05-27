"use client";

import { Button } from "@/components/ui/button";
import {
  ChatCircleIcon,
  ClockCounterClockwiseIcon,
  DevicesIcon,
  UploadSimpleIcon,
} from "@phosphor-icons/react";
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
    { id: 'home' as const, icon: UploadSimpleIcon, label: t("nav.home") || "Home", disabled: false },
    { id: 'devices' as const, icon: DevicesIcon, label: t("nav.devices") || "Devices", disabled: false },
    { id: 'chat' as const, icon: ChatCircleIcon, label: t("nav.chat") || "Chat", disabled: !hasSelectedDevice, badge: unreadCount > 0 ? unreadCount : undefined },
    { id: 'history' as const, icon: ClockCounterClockwiseIcon, label: t("nav.history") || "History", disabled: false }
  ];

  return (
    <nav className="ios-bottom-nav shrink-0 border-t border-white/[0.06] bg-[#030303]/95 px-3 pb-[calc(env(safe-area-inset-bottom,0px)+8px)] pt-2 text-white backdrop-blur-xl">
      <div className="grid grid-cols-4 gap-2 rounded-[1.2rem] bg-[#171916] p-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
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
              className={`relative flex h-[58px] flex-col items-center justify-center gap-1 rounded-xl px-1 transition-all duration-200 ${
                isActive
                  ? 'bg-white/[0.08] text-[#c9a6ff]'
                  : tab.disabled
                    ? 'text-white/20'
                    : 'text-white/45 hover:bg-white/[0.055] hover:text-white'
              }`}
            >
              <span className="relative grid h-6 w-6 place-items-center">
                <Icon className={`h-5 w-5 transition-transform duration-200 ${isActive ? 'scale-110' : ''}`} weight="bold" />
                {tab.badge && (
                  <span className="absolute -right-2 -top-2 grid h-5 min-w-5 place-items-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white ring-2 ring-[#171916]">
                    {tab.badge > 9 ? '9+' : tab.badge}
                  </span>
                )}
              </span>
              <span className="max-w-full truncate text-[11px] font-semibold leading-none">{tab.label}</span>
              {isActive && <span className="absolute top-1 h-1 w-6 rounded-full bg-[#c9a6ff]" />}
            </Button>
          );
        })}
      </div>
    </nav>
  );
};
