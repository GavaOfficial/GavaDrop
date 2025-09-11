"use client";

import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Menu, X, Wifi, Users, History as HistoryIcon, Settings, MessageCircle } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import { LanguageToggle } from "@/components/language-toggle";
import { useLanguage } from "@/contexts/language-context";

interface MobileNavProps {
  isConnected: boolean;
  deviceInfo: { deviceName: string; deviceId: string } | null;
  peers: Array<{
    socketId: string;
    clientId: string;
    deviceName: string;
  }>;
  selectedPeer: string | null;
  unreadCounts: Map<string, number>;
  onPeerSelect: (peerId: string | null) => void;
  onChatToggle: () => void;
  onHistoryToggle: () => void;
  isChatOpen: boolean;
  showHistory: boolean;
  onEditDeviceName: () => void;
}

export const MobileNav = ({
  isConnected,
  deviceInfo,
  peers,
  selectedPeer,
  unreadCounts,
  onPeerSelect,
  onChatToggle,
  onHistoryToggle,
  isChatOpen,
  showHistory,
  onEditDeviceName
}: MobileNavProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const { t } = useLanguage();

  const selectedPeerData = peers.find(p => p.socketId === selectedPeer);

  return (
    <>
      {/* Mobile Header */}
      <div className="flex md:hidden items-center justify-between p-4 bg-background border-b border-border">
        <div className="flex items-center gap-3">
          <Sheet open={isOpen} onOpenChange={setIsOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="sm" className="p-2">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-80 p-0">
              <div className="flex flex-col h-full">
                {/* Sheet Header */}
                <SheetHeader className="p-6 border-b border-border bg-muted/30">
                  <SheetTitle className="flex items-center gap-3">
                    <div className="flex-1">
                      <h2 className="text-2xl font-bold text-foreground" style={{ fontFamily: 'var(--font-silkscreen)' }}>
                        {t("app.title")}
                      </h2>
                      <p className="text-sm text-muted-foreground font-medium tracking-wide">
                        {t("app.subtitle")}
                      </p>
                    </div>
                    <div className="flex gap-1">
                      <LanguageToggle />
                      <ThemeToggle />
                    </div>
                  </SheetTitle>
                </SheetHeader>

                {/* Connection Status & Device Info */}
                <div className="p-6 border-b border-border">
                  <div className="flex items-center gap-2 mb-3">
                    <Wifi className={`h-4 w-4 ${isConnected ? 'text-green-500' : 'text-destructive'}`} />
                    <Badge variant={isConnected ? 'default' : 'destructive'} className="text-xs">
                      {isConnected ? t("status.connected") : t("status.disconnected")}
                    </Badge>
                  </div>

                  {deviceInfo && (
                    <div className="bg-muted/50 rounded-lg p-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">{t("device.yourDevice")}</p>
                          <p className="font-medium text-sm text-foreground">
                            {deviceInfo.deviceName}
                          </p>
                        </div>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            onEditDeviceName();
                            setIsOpen(false);
                          }}
                          className="h-8 w-8 p-0"
                        >
                          <Settings className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Devices List */}
                <div className="flex-1 overflow-y-auto p-6">
                  <div className="mb-4">
                    <h3 className="text-sm font-semibold text-foreground mb-2 flex items-center gap-2">
                      <Users className="h-4 w-4" />
                      {t("device.availableDevices")} ({peers.length})
                    </h3>
                  </div>
                  
                  <div className="space-y-2">
                    {peers.length === 0 ? (
                      <div className="text-center py-8">
                        <Wifi className="h-8 w-8 mx-auto mb-3 text-muted-foreground/50" />
                        <p className="text-muted-foreground text-sm mb-1">
                          {t("device.noDevicesFound")}
                        </p>
                        <p className="text-xs text-muted-foreground/70">
                          {t("device.openGavaDrop")}
                        </p>
                      </div>
                    ) : (
                      peers.map((peer) => {
                        const isSelected = selectedPeer === peer.socketId;
                        const unreadCount = unreadCounts.get(peer.clientId) || 0;
                        
                        return (
                          <div
                            key={peer.socketId}
                            className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-all ${
                              isSelected
                                ? "bg-primary/10 border border-primary/20"
                                : "hover:bg-muted/50 border border-transparent"
                            }`}
                            onClick={() => {
                              const newSelection = isSelected ? null : peer.socketId;
                              onPeerSelect(newSelection);
                              setIsOpen(false);
                            }}
                          >
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold ${
                              isSelected 
                                ? 'bg-primary text-primary-foreground' 
                                : 'bg-muted text-muted-foreground'
                            }`}>
                              {peer.deviceName.charAt(0).toUpperCase()}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <p className={`font-medium text-sm truncate ${
                                  isSelected ? 'text-primary' : 'text-foreground'
                                }`}>
                                  {peer.deviceName}
                                </p>
                                {unreadCount > 0 && (
                                  <div className="bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                                    {unreadCount > 9 ? '9+' : unreadCount}
                                  </div>
                                )}
                              </div>
                              {isSelected && (
                                <p className="text-xs text-primary/70">
                                  {t("device.selected")}
                                </p>
                              )}
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="p-4 border-t border-border bg-muted/20 space-y-2">
                  <Button
                    variant={isChatOpen ? "default" : "ghost"}
                    onClick={() => {
                      onChatToggle();
                      setIsOpen(false);
                    }}
                    disabled={!selectedPeer}
                    className="w-full justify-start gap-2"
                  >
                    <MessageCircle className="h-4 w-4" />
                    {t("chat.title")}
                    {selectedPeerData && unreadCounts.get(selectedPeerData.clientId) && (
                      <Badge variant="destructive" className="ml-auto text-xs">
                        {unreadCounts.get(selectedPeerData.clientId)}
                      </Badge>
                    )}
                  </Button>
                  <Button
                    variant={showHistory ? "default" : "ghost"}
                    onClick={() => {
                      onHistoryToggle();
                      setIsOpen(false);
                    }}
                    className="w-full justify-start gap-2"
                  >
                    <HistoryIcon className="h-4 w-4" />
                    {t("history.title")}
                  </Button>
                </div>
              </div>
            </SheetContent>
          </Sheet>
          
          <div>
            <h1 className="text-lg font-bold text-foreground" style={{ fontFamily: 'var(--font-silkscreen)' }}>
              GavaDrop
            </h1>
            {selectedPeerData && (
              <p className="text-xs text-muted-foreground">
                → {selectedPeerData.deviceName}
              </p>
            )}
          </div>
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-2">
          {selectedPeerData && unreadCounts.get(selectedPeerData.clientId) && (
            <Badge variant="destructive" className="text-xs">
              {unreadCounts.get(selectedPeerData.clientId)}
            </Badge>
          )}
          
          {selectedPeer && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onChatToggle}
              className="p-2"
            >
              <MessageCircle className="h-4 w-4" />
            </Button>
          )}
          
          <div className="flex items-center gap-1">
            <Wifi className={`h-4 w-4 ${isConnected ? 'text-green-500' : 'text-destructive'}`} />
          </div>
        </div>
      </div>
    </>
  );
};