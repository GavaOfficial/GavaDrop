"use client";

import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { 
  Users,
  Smartphone, 
  Monitor, 
  Tablet,
  Wifi,
  WifiOff,
  Search,
  MessageCircle,
  Edit3,
  Check,
  X,
  Zap,
  Clock
} from "lucide-react";
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
  deviceInfo: { deviceName: string; deviceId: string } | null;
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
    if (name.includes('phone') || name.includes('mobile')) return Smartphone;
    if (name.includes('tablet') || name.includes('ipad')) return Tablet;
    return Monitor;
  };

  const filteredPeers = peers.filter(peer => 
    peer.deviceName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const disconnectedPeersList = Array.from(disconnectedPeers.values());

  return (
    <div className="flex flex-col h-full bg-gradient-to-br from-background via-background to-muted/20">
      {/* Header */}
      <div className="px-6 py-6">
        <div className="flex items-center gap-3 mb-6">
          <div className={`p-3 rounded-2xl ${isConnected ? 'bg-green-100 dark:bg-green-900/30' : 'bg-red-100 dark:bg-red-900/30'}`}>
            {isConnected ? (
              <Wifi className="h-6 w-6 text-green-600 dark:text-green-400" />
            ) : (
              <WifiOff className="h-6 w-6 text-red-600 dark:text-red-400" />
            )}
          </div>
          <div className="flex-1">
            <h2 className="text-2xl font-bold text-foreground">{t("nav.devices")}</h2>
            <p className="text-sm text-muted-foreground">
{isConnected ? 
                `${peers.length + disconnectedPeersList.length} ${peers.length + disconnectedPeersList.length === 1 ? t("device.devicesFound") : t("device.devicesFoundPlural")}` : 
                t("device.connectionNotAvailable")
              }
            </p>
          </div>
        </div>

        {/* My Device Card */}
        {deviceInfo && (
          <Card className="p-4 glass-card border-primary/20 mb-4 animate-fade-in-up">
            <div className="flex items-center gap-3">
              <div className="p-2.5 gradient-primary rounded-xl glow-sm">
                <Monitor className="h-5 w-5 text-white" />
              </div>
              <div className="flex-1">
                {isEditingName ? (
                  <div className="flex items-center gap-2">
                    <Input
                      value={newDeviceName}
                      onChange={(e) => onNameChange(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') onSaveName();
                        if (e.key === 'Escape') onCancelEdit();
                      }}
                      className="h-8 text-sm"
placeholder={t("device.yourDevice")}
                      autoFocus
                    />
                    <Button size="sm" variant="ghost" onClick={onSaveName} className="h-8 w-8 p-0">
                      <Check className="h-4 w-4 text-green-600" />
                    </Button>
                    <Button size="sm" variant="ghost" onClick={onCancelEdit} className="h-8 w-8 p-0">
                      <X className="h-4 w-4 text-red-600" />
                    </Button>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-foreground">{deviceInfo.deviceName}</p>
                      <Badge variant="secondary" className="text-xs">{t("device.youLabel")}</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">{t("device.yourDevice")}</p>
                  </>
                )}
              </div>
              {!isEditingName && (
                <Button size="sm" variant="ghost" onClick={onEditDeviceName} className="h-8 w-8 p-0">
                  <Edit3 className="h-4 w-4" />
                </Button>
              )}
            </div>
          </Card>
        )}

        {/* Search */}
        {peers.length > 3 && (
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={t("device.search")}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-muted/30 border-0 rounded-2xl"
            />
          </div>
        )}
      </div>

      {/* Devices List */}
      <div className="flex-1 px-6 pb-4 overflow-y-auto custom-scrollbar">
        {peers.length === 0 && disconnectedPeersList.length === 0 ? (
          <div className="empty-state-modern animate-fade-in-up py-16">
            <div className="empty-state-icon">
              <Users className="h-10 w-10 text-primary" />
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-2">
              {t("device.noDevicesFound")}
            </h3>
            <p className="text-muted-foreground text-sm leading-relaxed max-w-sm">
              {t("device.openOnOtherDevices")}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {/* Connected Devices */}
            {filteredPeers.map((peer, index) => {
              const DeviceIcon = getDeviceIcon(peer.deviceName);
              const isSelected = selectedPeer === peer.socketId;
              const unreadCount = unreadCounts.get(peer.clientId) || 0;

              return (
                <Card
                  key={peer.socketId}
                  className={`peer-card animate-fade-in-up ${
                    isSelected ? 'selected' : ''
                  }`}
                  style={{ animationDelay: `${index * 50}ms` }}
                  onClick={() => {
                    const newSelection = isSelected ? null : peer.socketId;
                    onPeerSelect(newSelection);
                  }}
                >
                  <div className="flex items-center gap-3">
                    <div className={`p-3 rounded-2xl transition-smooth ${
                      isSelected ? 'gradient-primary glow-sm' : 'bg-muted'
                    }`}>
                      <DeviceIcon className={`h-6 w-6 ${
                        isSelected ? 'text-white' : 'text-muted-foreground'
                      }`} />
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <p className={`font-semibold truncate ${
                          isSelected ? 'text-primary' : 'text-foreground'
                        }`}>
                          {peer.deviceName}
                        </p>
                        <Badge variant="secondary" className="bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 text-xs">
                          <Zap className="h-3 w-3 mr-1" />
{t("chat.online")}
                        </Badge>
                      </div>
                      {isSelected && (
                        <p className="text-sm text-primary/70">
                          {t("device.deviceSelected")}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      {unreadCount > 0 && (
                        <Badge variant="destructive" className="h-6 w-6 rounded-full p-0 flex items-center justify-center text-xs">
                          {unreadCount > 9 ? '9+' : unreadCount}
                        </Badge>
                      )}
                      
                      {isSelected && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={(e) => {
                            e.stopPropagation();
                            onChatOpen();
                          }}
                          className="h-8 w-8 p-0"
                        >
                          <MessageCircle className="h-4 w-4" />
                        </Button>
                      )}
                      
                      {isSelected && (
                        <div className="status-online"></div>
                      )}
                    </div>
                  </div>
                </Card>
              );
            })}

            {/* Disconnected Devices (Grace Period) */}
            {disconnectedPeersList.map(({ peer }) => {
              const DeviceIcon = getDeviceIcon(peer.deviceName);
              const isSelected = selectedPeer === peer.socketId;
              const unreadCount = unreadCounts.get(peer.clientId) || 0;
              
              return (
                <Card 
                  key={`disconnected-${peer.socketId}`}
                  className={`p-4 opacity-60 transition-all duration-200 ${
                    isSelected 
                      ? 'bg-orange-50 dark:bg-orange-950/20 border-orange-200 dark:border-orange-800' 
                      : 'border-border'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`p-3 rounded-2xl ${
                      isSelected ? 'bg-orange-100 dark:bg-orange-900/30' : 'bg-muted'
                    }`}>
                      <DeviceIcon className={`h-6 w-6 ${
                        isSelected ? 'text-orange-500' : 'text-muted-foreground'
                      }`} />
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <p className={`font-semibold truncate ${
                          isSelected ? 'text-orange-700 dark:text-orange-300' : 'text-muted-foreground'
                        }`}>
                          {peer.deviceName}
                        </p>
                        <Badge variant="outline" className="border-orange-300 text-orange-600 dark:text-orange-400 text-xs">
                          <Clock className="h-3 w-3 mr-1" />
{t("device.reconnecting")}
                        </Badge>
                      </div>
                      {isSelected && (
                        <p className="text-sm text-orange-600 dark:text-orange-400">
                          {t("device.reconnectionInProgress")}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      {unreadCount > 0 && (
                        <Badge variant="outline" className="border-orange-400 text-orange-600 h-6 w-6 rounded-full p-0 flex items-center justify-center text-xs">
                          {unreadCount > 9 ? '9+' : unreadCount}
                        </Badge>
                      )}
                      
                      {isSelected && (
                        <div className="w-3 h-3 bg-orange-500 rounded-full animate-pulse"></div>
                      )}
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};