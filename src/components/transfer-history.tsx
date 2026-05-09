"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { useLanguage } from '@/contexts/language-context';
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  ArrowDownIcon,
  ArrowUpIcon,
  CheckIcon,
  ClockCounterClockwiseIcon,
  ClockIcon,
  FunnelSimpleIcon,
  LockIcon,
  TrashIcon,
  XIcon,
} from '@phosphor-icons/react';
import { FilePreviewMetadata } from '@/components/file-preview-metadata';
import {
  TransferHistoryItem,
  HistoryGroup,
  getHistory,
  groupHistoryByDate,
  removeFromHistory,
  clearHistory,
  formatFileSize,
  formatTime
} from '@/utils/history-utils';
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface TransferHistoryProps {
  isOpen: boolean;
  sectionStyle?: React.CSSProperties;
  isColorTransitioning?: boolean;
  onResendFile?: (fileName: string, fileSize: number, deviceName: string, fileData?: string) => void;
}

export const TransferHistory: React.FC<TransferHistoryProps> = ({
  isOpen,
  sectionStyle,
  isColorTransitioning = false,
  onResendFile
}) => {
  const { t, language } = useLanguage();
  const [history, setHistory] = useState<HistoryGroup[]>([]);
  const [filter, setFilter] = useState<'all' | 'sent' | 'received' | 'encrypted'>('all');
  const [showClearDialog, setShowClearDialog] = useState(false);

  const loadHistory = useCallback(() => {
    const historyItems = getHistory();
    let filteredItems = historyItems;
    switch (filter) {
      case 'sent':      filteredItems = historyItems.filter(i => i.direction === 'sent'); break;
      case 'received':  filteredItems = historyItems.filter(i => i.direction === 'received'); break;
      case 'encrypted': filteredItems = historyItems.filter(i => i.encrypted); break;
    }
    setHistory(groupHistoryByDate(filteredItems, language));
  }, [filter, language]);

  useEffect(() => {
    if (isOpen) loadHistory();
  }, [isOpen, loadHistory]);

  const handleRemoveItem = useCallback((itemId: string) => {
    removeFromHistory(itemId);
    loadHistory();
    toast.success(t("history.removeFromHistory"));
  }, [loadHistory, t]);

  const handleClearAll = useCallback(() => {
    clearHistory();
    loadHistory();
    setShowClearDialog(false);
    toast.success(t("history.cleared"));
  }, [loadHistory, t]);

  const handleResend = useCallback((item: TransferHistoryItem) => {
    if (onResendFile && item.direction === 'sent') {
      onResendFile(item.fileName, item.fileSize, item.deviceName, item.fileData);
      toast.info(`${t("transfer.readyToSend")} ${item.fileName}`);
    }
  }, [onResendFile, t]);

  const getStatusIcon = (status: TransferHistoryItem['status']) => {
    switch (status) {
      case 'completed': return <CheckIcon className="h-3 w-3 text-[#dff36b]" weight="bold" />;
      case 'failed':    return <XIcon className="h-3 w-3 text-red-400" weight="bold" />;
      case 'cancelled': return <XIcon className="h-3 w-3 text-orange-400" weight="bold" />;
      default:          return <ClockIcon className="h-3 w-3 text-white/30" />;
    }
  };

  const totalCount = history.reduce((n, g) => n + g.items.length, 0);

  const filterLabel = filter === 'all'
    ? t("history.allTransfers")
    : filter === 'sent' ? t("history.sentOnly")
    : filter === 'received' ? t("history.receivedOnly")
    : t("history.encryptedOnly");

  if (!isOpen) return null;

  return (
    <div className="flex h-full px-6 pb-8 text-white">
      <section className="section-enter relative flex min-w-0 flex-1 flex-col overflow-hidden rounded-[1.35rem]" style={sectionStyle}>
        {isColorTransitioning && <div className="section-color-overlay" />}

        {/* Header */}
        <div className="relative z-10 shrink-0 px-6 py-6">
          <div className="flex items-center justify-between gap-4">
            <div className="flex min-w-0 items-center">
              <div className="min-w-0">
                <h2 className="truncate text-3xl font-bold tracking-[-0.02em] text-white">
                  {t("history.transferHistory")}
                </h2>
                <div className="mt-1 flex flex-wrap items-center gap-2 text-xs font-medium text-white/45">
                  <span className="rounded-md border border-white/[0.08] bg-black/20 px-2 py-1">
                    {totalCount === 0
                      ? t("history.noTransfers")
                      : `${totalCount} ${totalCount !== 1 ? t("history.transfers") : t("history.transfer")}${filter !== 'all' ? ` · ${t("history.filtered")}` : ''}`}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex shrink-0 items-center gap-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className={`h-10 rounded-xl border px-3 text-xs font-medium ${
                      filter !== 'all'
                        ? 'border-[#c9a6ff]/30 bg-[#c9a6ff]/10 text-[#c9a6ff] hover:bg-[#c9a6ff]/15'
                        : 'border-white/[0.08] bg-white/[0.04] text-white/55 hover:bg-white/[0.08] hover:text-white'
                    }`}
                  >
                    <FunnelSimpleIcon className="mr-2 h-4 w-4" />
                    {filterLabel}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="rounded-xl border-white/10 bg-[#171916] text-white shadow-xl">
                  <DropdownMenuItem onClick={() => setFilter('all')} className={`hover:bg-white/10 focus:bg-white/10 ${filter === 'all' ? 'text-[#c9a6ff]' : 'text-white/70'}`}>
                    {t("history.allTransfers")}
                  </DropdownMenuItem>
                  <DropdownMenuSeparator className="bg-white/10" />
                  <DropdownMenuItem onClick={() => setFilter('sent')} className={`hover:bg-white/10 focus:bg-white/10 ${filter === 'sent' ? 'text-[#c9a6ff]' : 'text-white/70'}`}>
                    <ArrowUpIcon className="mr-2 h-4 w-4" /> {t("history.sentOnly")}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setFilter('received')} className={`hover:bg-white/10 focus:bg-white/10 ${filter === 'received' ? 'text-[#c9a6ff]' : 'text-white/70'}`}>
                    <ArrowDownIcon className="mr-2 h-4 w-4" /> {t("history.receivedOnly")}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setFilter('encrypted')} className={`hover:bg-white/10 focus:bg-white/10 ${filter === 'encrypted' ? 'text-[#c9a6ff]' : 'text-white/70'}`}>
                    <LockIcon className="mr-2 h-4 w-4" /> {t("history.encryptedOnly")}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              {totalCount > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowClearDialog(true)}
                  className="h-10 w-10 rounded-xl border border-white/[0.08] bg-white/[0.04] p-0 text-red-400/70 hover:bg-red-500/10 hover:text-red-400"
                >
                  <TrashIcon className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Content */}
        <ScrollArea className="relative z-10 min-h-0 flex-1 p-5">
          {totalCount === 0 ? (
            null
          ) : (
            <div className="space-y-6">
              {history.map((group) => (
                <div key={group.date}>
                  {/* Date separator */}
                  <div className="mb-3 flex items-center gap-3">
                    <div className="h-px flex-1 bg-white/[0.06]" />
                    <span className="text-[10px] font-semibold uppercase tracking-widest text-white/30">
                      {group.displayDate}
                    </span>
                    <div className="h-px flex-1 bg-white/[0.06]" />
                  </div>

                  <div className="space-y-2">
                    {group.items.map((item) => (
                      <div
                        key={item.id}
                        className="group flex items-center gap-4 rounded-2xl border border-white/[0.06] bg-[#141612] px-4 py-3.5 transition-colors hover:border-white/[0.1] hover:bg-[#1a1c18]"
                      >
                        {/* File icon with direction badge */}
                        <div className="relative shrink-0">
                          <FilePreviewMetadata fileName={item.fileName} fileType={item.fileType} size="small" />
                          <div className={`absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full border border-[#080907] ${
                            item.direction === 'sent' ? 'bg-[#c9a6ff]/20' : 'bg-[#dff36b]/15'
                          }`}>
                            {item.direction === 'sent'
                              ? <ArrowUpIcon className="h-2.5 w-2.5 text-[#c9a6ff]" weight="bold" />
                              : <ArrowDownIcon className="h-2.5 w-2.5 text-[#dff36b]" weight="bold" />}
                          </div>
                        </div>

                        {/* Info */}
                        <div className="min-w-0 flex-1">
                          <div className="mb-0.5 flex items-center gap-2">
                            <p className="truncate text-sm font-medium text-white">
                              {item.relativePath || item.fileName}
                            </p>
                            {item.encrypted && <LockIcon className="h-3 w-3 shrink-0 text-[#dff36b]" />}
                            {getStatusIcon(item.status)}
                          </div>
                          <div className="flex flex-wrap items-center gap-1.5 text-xs text-white/35">
                            <span className={item.direction === 'sent' ? 'text-[#c9a6ff]/80' : 'text-[#dff36b]/80'}>
                              {item.direction === 'sent'
                                ? (language === 'it' ? 'Inviato a' : 'Sent to')
                                : (language === 'it' ? 'Ricevuto da' : 'Received from')}
                            </span>
                            <span className="font-medium text-white/55">{item.deviceName}</span>
                            <span>·</span>
                            <span>{formatFileSize(item.fileSize)}</span>
                            <span>·</span>
                            <span>{formatTime(item.timestamp)}</span>
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex shrink-0 items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                          {item.direction === 'sent' && item.status === 'completed' && onResendFile && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleResend(item)}
                              className="h-8 w-8 rounded-lg p-0 text-[#c9a6ff]/60 hover:bg-[#c9a6ff]/10 hover:text-[#c9a6ff]"
                              title={item.fileData ? t("transfer.resendAuto") : t("transfer.resendManual")}
                            >
                              <ClockCounterClockwiseIcon className="h-3.5 w-3.5" />
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRemoveItem(item.id)}
                            className="h-8 w-8 rounded-lg p-0 text-white/25 hover:bg-red-500/10 hover:text-red-400"
                            title={t("history.removeFromHistory")}
                          >
                            <TrashIcon className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </section>

      {/* Clear All Dialog */}
      <AlertDialog open={showClearDialog} onOpenChange={setShowClearDialog}>
        <AlertDialogContent>
          <div className="border-b border-white/[0.06] px-6 py-5">
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-3">
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-red-500/15 text-red-400">
                  <TrashIcon className="h-5 w-5" />
                </span>
                {t("history.clearAll")}
              </AlertDialogTitle>
              <AlertDialogDescription className="mt-2">
                {t("dialog.confirmClearHistory")}
              </AlertDialogDescription>
            </AlertDialogHeader>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("dialog.cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={handleClearAll} className="bg-red-500 text-white hover:bg-red-600">
              {t("history.clearAll")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
