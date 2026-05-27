"use client";

import { useState, useRef, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import {
  ArrowDownIcon,
  ChatCircleIcon,
  PaperPlaneTiltIcon,
  UserIcon,
} from "@phosphor-icons/react";
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

  useEffect(() => {
    if (unreadCount > 0) onMarkAsRead();
  }, [unreadCount, onMarkAsRead]);

  const handleScroll = () => {
    if (!messagesContainerRef.current) return;
    const container = messagesContainerRef.current;
    const isNearBottom = container.scrollTop + container.clientHeight >= container.scrollHeight - 100;
    setShowScrollButton(!isNearBottom && messages.length > 0);
  };

  const scrollToBottom = () => {
    if (!messagesContainerRef.current) return;
    messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
    setShowScrollButton(false);
  };

  const handleSend = () => {
    if (inputMessage.trim() && selectedPeer && isConnected) {
      onSendMessage();
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const textarea = e.target;
    onInputChange(textarea.value);
    textarea.style.height = 'auto';
    textarea.style.height = Math.min(textarea.scrollHeight, 120) + 'px';
  };

  const groupMessagesByDate = (items: Message[]) => {
    const groups: { [key: string]: Message[] } = {};
    items.forEach(message => {
      const date = new Date(message.timestamp).toDateString();
      if (!groups[date]) groups[date] = [];
      groups[date].push(message);
    });
    return groups;
  };

  const today = new Date().toDateString();
  const yesterday = new Date(Date.now() - 86400000).toDateString();
  const messageGroups = groupMessagesByDate(messages);

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
      <div className="flex h-full flex-col bg-[#030303] text-white">
        <div className="flex flex-1 flex-col items-center justify-center px-8 text-center">
          <span className="mb-6 grid h-24 w-24 place-items-center rounded-[1.4rem] border border-white/[0.06] bg-white/[0.035]">
            <ChatCircleIcon className="h-12 w-12 text-[#c9a6ff]" weight="bold" />
          </span>
          <h3 className="text-3xl font-semibold tracking-[-0.03em]">{t("chat.selectDevice")}</h3>
          <p className="mt-3 max-w-sm text-sm font-medium leading-relaxed text-white/40">{t("chat.chooseFromDevices")}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative flex h-full flex-col overflow-hidden bg-[#030303] text-white">
      <header className="shrink-0 px-5 pb-3 pt-[calc(env(safe-area-inset-top,0px)+18px)]">
        <div className="rounded-[1.15rem] bg-[#171916] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
          <div className="flex items-center gap-3">
            <span className="relative grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-[#f3ead2] text-black/70">
              <UserIcon className="h-6 w-6" weight="bold" />
              {isConnected && <span className="absolute -bottom-1 -right-1 h-4 w-4 rounded-full border-2 border-[#171916] bg-[#dff36b]" />}
            </span>
            <div className="min-w-0 flex-1">
              <h3 className="truncate text-xl font-semibold tracking-[-0.02em]">{peerName || t("chat.unknownDevice")}</h3>
              <p className="mt-1 text-sm font-medium text-white/40">
                {isConnected ? t("chat.online") : t("chat.offline")} - {messages.length} {t("chat.messages")}
              </p>
            </div>
          </div>
        </div>
      </header>

      <main
        ref={messagesContainerRef}
        onScroll={handleScroll}
        className="min-h-0 flex-1 overflow-y-auto px-5 pb-4 custom-scrollbar"
        style={{ WebkitOverflowScrolling: 'touch', overscrollBehavior: 'contain' }}
      >
        <section className="flex min-h-full flex-col rounded-[1.35rem] bg-[#080907] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
          {messages.length === 0 ? (
            <div className="flex min-h-full flex-1 flex-col items-center justify-center px-3 py-16 text-center">
              <span className="mb-5 grid h-20 w-20 place-items-center rounded-[1.25rem] border border-white/[0.06] bg-white/[0.035]">
                <ChatCircleIcon className="h-10 w-10 text-[#c9a6ff]" weight="bold" />
              </span>
              <h4 className="text-2xl font-semibold tracking-[-0.02em]">{t("chat.noMessagesYet")}</h4>
              <p className="mt-3 max-w-xs text-sm font-medium leading-relaxed text-white/40">
                {t("chat.sendFirstMessage")} {peerName} {t("chat.startConversationWith")}
              </p>
            </div>
          ) : (
            <div className="flex min-h-full flex-col justify-end space-y-6">
              {Object.entries(messageGroups).map(([dateString, dateMessages]) => (
                <div key={dateString}>
                  <div className="mb-4 flex justify-center">
                    <span className="rounded-full border border-white/[0.06] bg-white/[0.04] px-3 py-1 text-xs font-medium text-white/40">
                      {formatDateGroup(dateString)}
                    </span>
                  </div>
                  <div className="space-y-3">
                    {dateMessages.map((message, index) => {
                      const prevMessage = dateMessages[index - 1];
                      const nextMessage = dateMessages[index + 1];
                      const isFirstInSequence = !prevMessage || prevMessage.isOwn !== message.isOwn;
                      const isLastInSequence = !nextMessage || nextMessage.isOwn !== message.isOwn;

                      return (
                        <div key={message.id} className={`flex ${message.isOwn ? 'justify-end' : 'justify-start'} ${isFirstInSequence ? 'mt-4' : 'mt-1'}`}>
                          <div
                            className={`max-w-[78%] px-4 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] ${
                              message.isOwn
                                ? `bg-[#e6d5ff] text-black ${isFirstInSequence && isLastInSequence ? 'rounded-2xl' : isFirstInSequence ? 'rounded-2xl rounded-br-md' : isLastInSequence ? 'rounded-2xl rounded-tr-md' : 'rounded-l-2xl rounded-r-md'}`
                                : `border border-white/[0.06] bg-[#141612] text-white ${isFirstInSequence && isLastInSequence ? 'rounded-2xl' : isFirstInSequence ? 'rounded-2xl rounded-bl-md' : isLastInSequence ? 'rounded-2xl rounded-tl-md' : 'rounded-r-2xl rounded-l-md'}`
                            }`}
                          >
                            <p className="whitespace-pre-wrap break-words text-sm leading-relaxed">{message.text}</p>
                            {isLastInSequence && (
                              <p className={`mt-2 text-xs ${message.isOwn ? 'text-black/45' : 'text-white/30'}`}>
                                {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
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
        </section>
      </main>

      {showScrollButton && (
        <Button onClick={scrollToBottom} size="sm" className="absolute bottom-28 right-5 h-11 w-11 rounded-xl bg-[#e6d5ff] p-0 text-black hover:bg-[#d9bcff]">
          <ArrowDownIcon className="h-5 w-5" weight="bold" />
        </Button>
      )}

      <footer className="shrink-0 px-5 pb-4">
        <div className="flex items-end gap-3 rounded-2xl border border-white/[0.06] bg-black/20 p-2.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
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
            className="min-h-[48px] max-h-[120px] flex-1 resize-none rounded-xl border-transparent bg-transparent px-2 py-3 text-sm text-white placeholder:text-white/35 outline-none focus:ring-2 focus:ring-[#c9a6ff] disabled:cursor-not-allowed disabled:opacity-50"
            style={{ WebkitAppearance: 'none', fontSize: '16px' }}
          />
          <Button onClick={handleSend} disabled={!inputMessage.trim() || !selectedPeer || !isConnected} size="sm" className="h-12 w-12 shrink-0 rounded-xl bg-[#e6d5ff] p-0 text-black hover:bg-[#d9bcff] disabled:opacity-40">
            <PaperPlaneTiltIcon className="h-5 w-5" weight="bold" />
          </Button>
        </div>
      </footer>
    </div>
  );
};
