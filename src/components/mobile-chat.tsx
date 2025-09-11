"use client";

import { useState, useRef, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { 
  MessageCircle, 
  Send, 
  X, 
  ChevronDown,
  User
} from "lucide-react";
import { useLanguage } from "@/contexts/language-context";

interface Message {
  id: string;
  text: string;
  isOwn: boolean;
  fromName: string;
  timestamp: number;
}

interface MobileChatProps {
  isOpen: boolean;
  onToggle: () => void;
  selectedPeer: string | null;
  peerName?: string;
  messages: Message[];
  unreadCount: number;
  inputMessage: string;
  onInputChange: (message: string) => void;
  onSendMessage: () => void;
  onMarkAsRead: () => void;
  isConnected: boolean;
}

export const MobileChat = ({
  isOpen,
  onToggle,
  selectedPeer,
  peerName,
  messages,
  unreadCount,
  inputMessage,
  onInputChange,
  onSendMessage,
  onMarkAsRead,
  isConnected
}: MobileChatProps) => {
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const { t } = useLanguage();

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight;
    }
  }, [messages]);

  // Mark messages as read when chat is opened
  useEffect(() => {
    if (isOpen && unreadCount > 0) {
      onMarkAsRead();
    }
  }, [isOpen, unreadCount, onMarkAsRead]);

  // Mobile chat as full-screen overlay
  const MobileChatContent = () => (
    <div className="h-full flex flex-col">
      {/* Chat Header */}
      <div className="flex items-center justify-between p-4 border-b border-border bg-muted/30">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
            <User className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h3 className="font-semibold text-foreground">
              {peerName || t("chat.unknownDevice")}
            </h3>
            <p className="text-xs text-muted-foreground">
              {isConnected ? t("status.online") : t("status.offline")} • {messages.length} {t("chat.messages")}
            </p>
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={onToggle}
          className="p-2"
        >
          <X className="h-5 w-5" />
        </Button>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-hidden">
        <ScrollArea className="h-full p-4" ref={scrollAreaRef}>
          <div className="space-y-4">
            {messages.length === 0 ? (
              <div className="text-center py-8">
                <MessageCircle className="h-16 w-16 mx-auto mb-4 text-muted-foreground/30" />
                <p className="text-muted-foreground text-sm mb-2">
                  {t("chat.noMessages")}
                </p>
                <p className="text-xs text-muted-foreground/70">
                  {t("chat.startConversation")}
                </p>
              </div>
            ) : (
              messages.map((message, index) => (
                <div
                  key={message.id}
                  className={`flex ${message.isOwn ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                      message.isOwn
                        ? 'bg-primary text-primary-foreground rounded-br-md'
                        : 'bg-muted text-foreground rounded-bl-md'
                    }`}
                  >
                    {!message.isOwn && messages.length > 1 && (
                      <p className="text-xs opacity-70 mb-1 font-medium">
                        {message.fromName}
                      </p>
                    )}
                    <p className="text-sm whitespace-pre-wrap break-words leading-relaxed">
                      {message.text}
                    </p>
                    <p className={`text-xs mt-2 ${
                      message.isOwn 
                        ? 'text-primary-foreground/60' 
                        : 'text-muted-foreground'
                    }`}>
                      {new Date(message.timestamp).toLocaleTimeString([], { 
                        hour: '2-digit', 
                        minute: '2-digit' 
                      })}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </ScrollArea>
      </div>

      {/* Input Area */}
      <div className="p-4 border-t border-border bg-background">
        <div className="flex gap-3">
          <Input
            ref={inputRef}
            value={inputMessage}
            onChange={(e) => onInputChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                if (inputMessage.trim() && selectedPeer && isConnected) {
                  onSendMessage();
                }
              }
            }}
            placeholder={isConnected ? t("chat.typeMessage") : t("chat.deviceOffline")}
            className="flex-1 rounded-full border-2 h-12 px-4"
            disabled={!selectedPeer || !isConnected}
          />
          <Button
            onClick={() => {
              if (inputMessage.trim() && selectedPeer && isConnected) {
                onSendMessage();
              }
            }}
            disabled={!inputMessage.trim() || !selectedPeer || !isConnected}
            size="lg"
            className="rounded-full w-12 h-12 p-0"
          >
            <Send className="h-5 w-5" />
          </Button>
        </div>
      </div>
    </div>
  );

  // Mobile version uses Sheet for full-screen chat
  return (
    <>
      {/* Chat Float Button */}
      {selectedPeer && !isOpen && (
        <div className="md:hidden fixed bottom-6 right-6 z-40">
          <Button
            onClick={onToggle}
            size="lg"
            className="rounded-full w-14 h-14 shadow-lg relative"
          >
            <MessageCircle className="h-6 w-6" />
            {unreadCount > 0 && (
              <Badge 
                variant="destructive" 
                className="absolute -top-2 -right-2 h-6 w-6 rounded-full p-0 flex items-center justify-center text-xs"
              >
                {unreadCount > 9 ? '9+' : unreadCount}
              </Badge>
            )}
          </Button>
        </div>
      )}

      {/* Mobile Chat Sheet */}
      <Sheet open={isOpen && !!selectedPeer} onOpenChange={onToggle}>
        <SheetContent 
          side="bottom" 
          className="h-[90vh] p-0 rounded-t-2xl"
        >
          <SheetHeader className="sr-only">
            <SheetTitle>
              {t("chat.title")} - {peerName || t("chat.unknownDevice")}
            </SheetTitle>
          </SheetHeader>
          <MobileChatContent />
        </SheetContent>
      </Sheet>
    </>
  );
};