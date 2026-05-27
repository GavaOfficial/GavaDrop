"use client";

import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  ChatCircleIcon,
  CheckIcon,
  ClockIcon,
  DeviceMobileIcon,
  DeviceTabletIcon,
  MagnifyingGlassIcon,
  MonitorIcon,
  PencilLineIcon,
  UsersIcon,
  WifiHighIcon,
  WifiSlashIcon,
  XIcon,
  LightningIcon,
} from "@phosphor-icons/react";
import { useLanguage } from "@/contexts/language-context";

interface Peer {
  socketId: string;
  clientId: string;
  deviceName: string;
}

interface ModernMobileDevicesProps {
  peers: Peer[];
  disconnectedPeers: Map<string, { peer: Peer; disconnectedAt: number }>;
  selectedPeer: string | null;
  lastSelectedClientId: string | null;
  deviceInfo: { deviceName: string; deviceId: string; roomId?: string } | null;
  isConnected: boolean;
  unreadCounts: Map<string, number>;
  onPeerSelect: (peerId: string | null) => void;
  onEditDeviceName: () => void;
  onChatOpen: () => void;
  isEditingName: boolean;
  newDeviceName: string;
  onNameChange: (name: string) => void;
  onSaveName: () => void;
  onCancelEdit: () => void;
}

export const ModernMobileDevices = ({
  peers,
  disconnectedPeers,
  selectedPeer,
  lastSelectedClientId,
  deviceInfo,
  isConnected,
  unreadCounts,
  onPeerSelect,
  onEditDeviceName,
  onChatOpen,
  isEditingName,
  newDeviceName,
  onNameChange,
  onSaveName,
  onCancelEdit
}: ModernMobileDevicesProps) => {
  const { t } = useLanguage();
  const [searchQuery, setSearchQuery] = useState('');

  const getDeviceIcon = (deviceName: string) => {
    const name = deviceName.toLowerCase();
    if (name.includes('phone') || name.includes('mobile')) return DeviceMobileIcon;
    if (name.includes('tablet') || name.includes('ipad')) return DeviceTabletIcon;
    return MonitorIcon;
  };

  const filteredPeers = peers.filter(peer =>
    peer.deviceName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const disconnectedPeersList = Array.from(disconnectedPeers.values());
  const totalDevices = peers.length + disconnectedPeersList.length;

  return (
    <div className="flex h-full flex-col overflow-hidden bg-[#030303] text-white">
      <header className="shrink-0 px-5 pb-3 pt-[calc(env(safe-area-inset-top,0px)+18px)]">
        <div className="mb-3 rounded-[1.15rem] bg-[#171916] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
          <div className="flex items-center gap-3">
            <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl ${isConnected ? 'bg-[#c9a6ff]/15 text-[#c9a6ff]' : 'bg-orange-400/15 text-orange-300'}`}>
              {isConnected ? <WifiHighIcon className="h-5 w-5" weight="bold" /> : <WifiSlashIcon className="h-5 w-5" weight="bold" />}
            </span>
            <div className="min-w-0 flex-1">
              <h2 className="text-3xl font-semibold tracking-[-0.03em]">{t("nav.devices")}</h2>
              <p className="mt-1 text-sm font-medium text-white/40">
                {isConnected
                  ? `${totalDevices} ${totalDevices === 1 ? t("device.devicesFound") : t("device.devicesFoundPlural")}`
                  : t("device.connectionNotAvailable")}
              </p>
            </div>
          </div>
        </div>

        {deviceInfo && (
          <div className="rounded-[1.15rem] border border-white/[0.06] bg-[#080907] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
            <div className="flex items-center gap-3">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#f3ead2] text-black/70">
                <MonitorIcon className="h-5 w-5" weight="bold" />
              </span>
              <div className="min-w-0 flex-1">
                {isEditingName ? (
                  <div className="flex items-center gap-2">
                    <Input
                      value={newDeviceName}
                      onChange={(e) => onNameChange(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') onSaveName();
                        if (e.key === 'Escape') onCancelEdit();
                      }}
                      className="h-10 rounded-xl border-white/[0.08] bg-white/[0.04] text-sm text-white placeholder:text-white/35 focus-visible:ring-[#c9a6ff]"
                      placeholder={t("device.yourDevice")}
                      autoFocus
                    />
                    <Button size="sm" variant="ghost" onClick={onSaveName} className="h-10 w-10 shrink-0 rounded-xl p-0 text-[#dff36b] hover:bg-white/[0.08]">
                      <CheckIcon className="h-4 w-4" weight="bold" />
                    </Button>
                    <Button size="sm" variant="ghost" onClick={onCancelEdit} className="h-10 w-10 shrink-0 rounded-xl p-0 text-orange-300 hover:bg-white/[0.08]">
                      <XIcon className="h-4 w-4" weight="bold" />
                    </Button>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center gap-2">
                      <p className="truncate text-sm font-semibold">{deviceInfo.deviceName}</p>
                      <Badge className="rounded-md bg-white/[0.08] px-2 py-0.5 text-[10px] font-semibold text-white/55 hover:bg-white/[0.08]">{t("device.youLabel")}</Badge>
                    </div>
                    <p className="mt-1 text-xs font-medium text-white/35">{t("device.yourDevice")}</p>
                    {deviceInfo.roomId && (
                      <p className="mt-0.5 text-[10px] font-mono text-white/25 select-all">
                        {deviceInfo.roomId.replace('room_', '')}
                      </p>
                    )}
                  </>
                )}
              </div>
              {!isEditingName && (
                <Button size="sm" variant="ghost" onClick={onEditDeviceName} className="h-9 w-9 shrink-0 rounded-xl p-0 text-white/45 hover:bg-white/[0.08] hover:text-white">
                  <PencilLineIcon className="h-4 w-4" weight="bold" />
                </Button>
              )}
            </div>
          </div>
        )}

        {peers.length > 3 && (
          <div className="relative mt-3">
            <MagnifyingGlassIcon className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-white/35" weight="bold" />
            <Input
              placeholder={t("device.search")}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-12 rounded-xl border-white/[0.08] bg-white/[0.04] pl-11 text-white placeholder:text-white/35 focus-visible:ring-[#c9a6ff]"
            />
          </div>
        )}
      </header>

      <main className="min-h-0 flex-1 overflow-y-auto px-5 pb-4 custom-scrollbar">
        {peers.length === 0 && disconnectedPeersList.length === 0 ? (
          <div className="flex min-h-full flex-col items-center justify-center rounded-[1.35rem] bg-[#080907] px-7 py-16 text-center shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
            <span className="mb-6 grid h-24 w-24 place-items-center rounded-[1.4rem] border border-white/[0.06] bg-white/[0.035]">
              <UsersIcon className="h-12 w-12 text-[#c9a6ff]" weight="bold" />
            </span>
            <h3 className="text-2xl font-semibold tracking-[-0.02em]">{t("device.noDevicesFound")}</h3>
            <p className="mt-3 max-w-sm text-sm font-medium leading-relaxed text-white/40">{t("device.openOnOtherDevices")}</p>
          </div>
        ) : (
          <div className="space-y-2">
            {filteredPeers.map((peer, index) => {
              const DeviceIcon = getDeviceIcon(peer.deviceName);
              const isSelected = selectedPeer === peer.socketId;
              const isLastSelected = lastSelectedClientId === peer.clientId;
              const unreadCount = unreadCounts.get(peer.clientId) || 0;

              return (
                <button
                  key={peer.socketId}
                  type="button"
                  className={`transfer-drop-compact w-full rounded-xl p-0 text-left outline-none transition-[background-color,border-color,transform] duration-300 focus:ring-2 focus:ring-[#c9a6ff]/70 ${
                    isSelected ? 'border border-[#c9a6ff] bg-[#211733]' : 'border border-white/[0.06] bg-[#171916] hover:bg-[#1f211d]'
                  }`}
                  style={{ animationDelay: `${index * 45}ms` }}
                  onClick={() => onPeerSelect(isSelected ? null : peer.socketId)}
                >
                  <div className="flex items-center gap-3 p-3.5">
                    <span className={`grid h-12 w-12 shrink-0 place-items-center rounded-xl ${isSelected ? 'bg-[#c9a6ff] text-black' : 'bg-[#f3ead2] text-black/70'}`}>
                      <DeviceIcon className="h-6 w-6" weight="bold" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex min-w-0 items-center gap-2">
                        <p className="truncate text-base font-semibold">{peer.deviceName}</p>
                        <span className="inline-flex shrink-0 items-center rounded-md bg-[#dff36b]/12 px-2 py-0.5 text-[11px] font-semibold text-[#dff36b]">
                          <LightningIcon className="mr-1 h-3 w-3" weight="bold" />
                          {t("chat.online")}
                        </span>
                      </div>
                      <p className={`mt-1 truncate text-xs font-medium ${isSelected ? 'text-[#c9a6ff]/80' : 'text-white/40'}`}>
                        {isSelected ? t("device.deviceSelected") : isLastSelected ? t("device.recentWord") : t("device.selectDevice")}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      {unreadCount > 0 && (
                        <span className="grid h-6 min-w-6 place-items-center rounded-full bg-red-500 px-1.5 text-xs font-bold text-white">
                          {unreadCount > 9 ? '9+' : unreadCount}
                        </span>
                      )}
                      {isSelected && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={(e) => {
                            e.stopPropagation();
                            onChatOpen();
                          }}
                          className="h-9 w-9 rounded-xl p-0 text-white/65 hover:bg-white/[0.08] hover:text-white"
                        >
                          <ChatCircleIcon className="h-5 w-5" weight="bold" />
                        </Button>
                      )}
                    </div>
                  </div>
                </button>
              );
            })}

            {disconnectedPeersList.map(({ peer }, index) => {
              const DeviceIcon = getDeviceIcon(peer.deviceName);
              const isSelected = selectedPeer === peer.socketId;
              const unreadCount = unreadCounts.get(peer.clientId) || 0;

              return (
                <div
                  key={`disconnected-${peer.socketId}`}
                  className={`transfer-drop-compact rounded-xl border p-3.5 opacity-75 ${
                    isSelected ? 'border-orange-400/35 bg-orange-400/10' : 'border-white/[0.06] bg-[#171916]'
                  }`}
                  style={{ animationDelay: `${(filteredPeers.length + index) * 45}ms` }}
                >
                  <div className="flex items-center gap-3">
                    <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-white/[0.04] text-white/40">
                      <DeviceIcon className="h-6 w-6" weight="bold" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex min-w-0 items-center gap-2">
                        <p className="truncate text-base font-semibold text-white/65">{peer.deviceName}</p>
                        <span className="inline-flex shrink-0 items-center rounded-md bg-orange-400/12 px-2 py-0.5 text-[11px] font-semibold text-orange-300">
                          <ClockIcon className="mr-1 h-3 w-3" weight="bold" />
                          {t("device.reconnecting")}
                        </span>
                      </div>
                      <p className="mt-1 truncate text-xs font-medium text-white/35">{t("device.reconnectionInProgress")}</p>
                    </div>
                    {unreadCount > 0 && (
                      <span className="grid h-6 min-w-6 place-items-center rounded-full bg-orange-400 px-1.5 text-xs font-bold text-black">
                        {unreadCount > 9 ? '9+' : unreadCount}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
};
