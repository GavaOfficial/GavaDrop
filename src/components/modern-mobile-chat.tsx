"use client";

import { useState, useRef, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  MessageCircle, 
  Send, 
  User,
  ArrowDown
} from "lucide-react";
import { useLanguage } from "@/contexts/language-context";

interface Message {
  id: string;
  text: string;
  isOwn: boolean;
  fromName: string;
  timestamp: number;
}

interface ModernMobileChatProps {
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

export const ModernMobileChat = ({
  selectedPeer,
  peerName,
  messages,
  unreadCount,
  inputMessage,
  onInputChange,
  onSendMessage,
  onMarkAsRead,
  isConnected
}: ModernMobileChatProps) => {
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const { t } = useLanguage();

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (messagesContainerRef.current) {
      const container = messagesContainerRef.current;
      const isNearBottom = container.scrollTop + container.clientHeight >= container.scrollHeight - 100;
      
      if (isNearBottom) {
        container.scrollTop = container.scrollHeight;
        setShowScrollButton(false);
      } else {
        setShowScrollButton(true);
      }
    }
  }, [messages]);

  // Mark messages as read when component mounts
  useEffect(() => {
    if (unreadCount > 0) {
      onMarkAsRead();
    }
  }, [unreadCount, onMarkAsRead]);

  // Handle scroll to detect if user scrolled up
  const handleScroll = () => {
    if (messagesContainerRef.current) {
      const container = messagesContainerRef.current;
      const isNearBottom = container.scrollTop + container.clientHeight >= container.scrollHeight - 100;
      setShowScrollButton(!isNearBottom && messages.length > 0);
    }
  };

  // Scroll to bottom function
  const scrollToBottom = () => {
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
      setShowScrollButton(false);
    }
  };

  // Handle send message
  const handleSend = () => {
    if (inputMessage.trim() && selectedPeer && isConnected) {
      onSendMessage();
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  };

  // Handle textarea auto-resize
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const textarea = e.target;
    onInputChange(textarea.value);
    
    // Auto-resize textarea
    textarea.style.height = 'auto';
    textarea.style.height = Math.min(textarea.scrollHeight, 120) + 'px';
  };

  // Group messages by date
  const groupMessagesByDate = (messages: Message[]) => {
    const groups: { [key: string]: Message[] } = {};
    
    messages.forEach(message => {
      const date = new Date(message.timestamp).toDateString();
      if (!groups[date]) {
        groups[date] = [];
      }
      groups[date].push(message);
    });
    
    return groups;
  };

  const messageGroups = groupMessagesByDate(messages);
  const today = new Date().toDateString();
  const yesterday = new Date(Date.now() - 86400000).toDateString();

  const formatDateGroup = (dateString: string) => {
    if (dateString === today) return t("history.today");
    if (dateString === yesterday) return t("history.yesterday");
    return new Date(dateString).toLocaleDateString('it-IT', { 
      weekday: 'long', 
      day: 'numeric', 
      month: 'long' 
    });
  };

  if (!selectedPeer) {
    return (
      <div className="flex flex-col h-full bg-gradient-to-br from-background via-background to-muted/20">
        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
          <div className="p-6 bg-muted/30 rounded-full mb-6">
            <MessageCircle className="h-16 w-16 text-muted-foreground/50" />
          </div>
          <h3 className="text-xl font-semibold text-foreground mb-2">
{t("chat.selectDevice")}
          </h3>
          <p className="text-muted-foreground max-w-sm">
{t("chat.chooseFromDevices")}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-gradient-to-br from-background via-background to-muted/20">
      {/* Header */}
      <div className="flex items-center justify-between p-4 bg-background/95 backdrop-blur-md border-b border-border/20">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="w-12 h-12 bg-gradient-to-br from-primary/20 to-primary/10 rounded-full flex items-center justify-center">
              <User className="h-6 w-6 text-primary" />
            </div>
            {isConnected && (
              <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 border-2 border-background rounded-full"></div>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-foreground truncate">
              {peerName || t("chat.unknownDevice")}
            </h3>
            <p className="text-sm text-muted-foreground">
{isConnected ? t("chat.online") : t("chat.offline")} • {messages.length} {t("chat.messages")}
            </p>
          </div>
        </div>
      </div>

      {/* Messages Container */}
      <div 
        ref={messagesContainerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto p-4"
        style={{ 
          WebkitOverflowScrolling: 'touch',
          overscrollBehavior: 'contain'
        }}
      >
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center py-16">
            <div className="p-6 bg-primary/10 rounded-full mb-4">
              <MessageCircle className="h-12 w-12 text-primary" />
            </div>
            <h4 className="text-lg font-semibold text-foreground mb-2">
{t("chat.noMessagesYet")}
            </h4>
            <p className="text-muted-foreground max-w-xs">
{t("chat.sendFirstMessage")} {peerName} {t("chat.startConversationWith")}
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {Object.entries(messageGroups).map(([dateString, dateMessages]) => (
              <div key={dateString}>
                {/* Date Separator */}
                <div className="flex items-center justify-center mb-4">
                  <div className="px-3 py-1 bg-muted/60 rounded-full">
                    <span className="text-xs font-medium text-muted-foreground">
                      {formatDateGroup(dateString)}
                    </span>
                  </div>
                </div>

                {/* Messages for this date */}
                <div className="space-y-3">
                  {dateMessages.map((message, index) => {
                    const prevMessage = dateMessages[index - 1];
                    const nextMessage = dateMessages[index + 1];
                    const isFirstInSequence = !prevMessage || prevMessage.isOwn !== message.isOwn;
                    const isLastInSequence = !nextMessage || nextMessage.isOwn !== message.isOwn;
                    
                    return (
                      <div
                        key={message.id}
                        className={`flex ${message.isOwn ? 'justify-end' : 'justify-start'} ${
                          isFirstInSequence ? 'mt-4' : 'mt-1'
                        }`}
                      >
                        <div
                          className={`max-w-[75%] px-4 py-3 ${
                            message.isOwn
                              ? `bg-primary text-primary-foreground ${
                                  isFirstInSequence && isLastInSequence
                                    ? 'rounded-2xl'
                                    : isFirstInSequence
                                    ? 'rounded-2xl rounded-br-md'
                                    : isLastInSequence
                                    ? 'rounded-2xl rounded-tr-md'
                                    : 'rounded-l-2xl rounded-r-md'
                                }`
                              : `bg-muted text-foreground ${
                                  isFirstInSequence && isLastInSequence
                                    ? 'rounded-2xl'
                                    : isFirstInSequence
                                    ? 'rounded-2xl rounded-bl-md'
                                    : isLastInSequence
                                    ? 'rounded-2xl rounded-tl-md'
                                    : 'rounded-r-2xl rounded-l-md'
                                }`
                          } shadow-sm`}
                        >
                          <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">
                            {message.text}
                          </p>
                          {isLastInSequence && (
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
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Scroll to bottom button */}
      {showScrollButton && (
        <div className="absolute bottom-28 right-4">
          <Button
            onClick={scrollToBottom}
            size="sm"
            className="rounded-full w-12 h-12 p-0 shadow-lg bg-primary hover:bg-primary/90"
          >
            <ArrowDown className="h-5 w-5" />
          </Button>
        </div>
      )}

      {/* Input Area */}
      <div className="border-t border-border/20 bg-background/95 backdrop-blur-md p-4">
        <div className="flex items-end gap-3">
          <div className="flex-1 relative">
            <textarea
              ref={inputRef}
              value={inputMessage}
              onChange={handleInputChange}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              placeholder={isConnected ? t("chat.typeMessage") : t("chat.offline")}
              disabled={!selectedPeer || !isConnected}
              className="w-full resize-none rounded-3xl border-2 border-border/30 bg-muted/30 px-4 py-3 text-sm placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:bg-background disabled:cursor-not-allowed disabled:opacity-50 min-h-[48px] max-h-[120px]"
              style={{ 
                WebkitAppearance: 'none',
                fontSize: '16px' // Prevents zoom on iOS
              }}
            />
          </div>
          
          <Button
            onClick={handleSend}
            disabled={!inputMessage.trim() || !selectedPeer || !isConnected}
            size="sm"
            className="rounded-full w-12 h-12 p-0 flex-shrink-0 bg-primary hover:bg-primary/90 disabled:opacity-50"
          >
            <Send className="h-5 w-5" />
          </Button>
        </div>
      </div>
    </div>
  );
};