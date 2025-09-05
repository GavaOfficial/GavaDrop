"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { useLanguage } from '@/contexts/language-context';
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  History, 
  FileUp, 
  FileDown, 
  Trash2, 
  RefreshCw, 
  Filter,
  Clock,
  Check,
  X,
  Lock,
  RotateCcw
} from 'lucide-react';
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
  onResendFile?: (fileName: string, fileSize: number, deviceName: string, fileData?: string) => void;
}

export const TransferHistory: React.FC<TransferHistoryProps> = ({ 
  isOpen, 
  onResendFile 
}) => {
  const { t, language } = useLanguage();
  const [history, setHistory] = useState<HistoryGroup[]>([]);
  const [filter, setFilter] = useState<'all' | 'sent' | 'received' | 'encrypted'>('all');
  const [showClearDialog, setShowClearDialog] = useState(false);

  const loadHistory = useCallback(() => {
    const historyItems = getHistory();
    let filteredItems = historyItems;

    // Applica filtri
    switch (filter) {
      case 'sent':
        filteredItems = historyItems.filter(item => item.direction === 'sent');
        break;
      case 'received':
        filteredItems = historyItems.filter(item => item.direction === 'received');
        break;
      case 'encrypted':
        filteredItems = historyItems.filter(item => item.encrypted);
        break;
    }

    const groupedHistory = groupHistoryByDate(filteredItems, language);
    setHistory(groupedHistory);
  }, [filter, language]);

  useEffect(() => {
    if (isOpen) {
      loadHistory();
    }
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
      case 'completed':
        return <Check className="h-3 w-3 text-green-500" />;
      case 'failed':
        return <X className="h-3 w-3 text-red-500" />;
      case 'cancelled':
        return <X className="h-3 w-3 text-orange-500" />;
      default:
        return <Clock className="h-3 w-3 text-gray-400" />;
    }
  };

  const getTotalCount = () => {
    return history.reduce((total, group) => total + group.items.length, 0);
  };

  if (!isOpen) return null;

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-border bg-muted/30">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <History className="h-5 w-5 text-primary" />
            <h3 className="font-semibold text-foreground">{t("history.title")}</h3>
          </div>
          <div className="flex items-center gap-2">
            {/* Filtri */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                  <Filter className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setFilter('all')} className={filter === 'all' ? 'bg-accent' : ''}>
                  {t("history.allTransfers")}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => setFilter('sent')} className={filter === 'sent' ? 'bg-accent' : ''}>
                  <FileUp className="h-4 w-4 mr-2" />
                  {t("history.sentOnly")}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setFilter('received')} className={filter === 'received' ? 'bg-accent' : ''}>
                  <FileDown className="h-4 w-4 mr-2" />
                  {t("history.receivedOnly")}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setFilter('encrypted')} className={filter === 'encrypted' ? 'bg-accent' : ''}>
                  <Lock className="h-4 w-4 mr-2" />
                  {t("history.encryptedOnly")}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Refresh */}
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={loadHistory}
              className="h-8 w-8 p-0"
            >
              <RefreshCw className="h-4 w-4" />
            </Button>

            {/* Clear All */}
            {getTotalCount() > 0 && (
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setShowClearDialog(true)}
                className="h-8 w-8 p-0 text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
        
        <p className="text-xs text-muted-foreground">
          {getTotalCount() === 0 
            ? t("history.noTransfers") 
            : `${getTotalCount()} ${getTotalCount() !== 1 ? t("history.transfers") : t("history.transfer")} ${filter !== 'all' ? `(${t("history.filtered")})` : ''}`
          }
        </p>
      </div>

      {/* Content */}
      <ScrollArea className="flex-1 min-h-0">
        <div className="p-4">
          {getTotalCount() === 0 ? (
            <div className="text-center py-12">
              <History className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
              <p className="text-muted-foreground text-sm mb-2">
                {filter === 'all' 
                  ? t("history.noTransfersCompleted")
                  : `${t("history.noTransfersFiltered")} ${
                      filter === 'sent' ? t("history.sentOnly").toLowerCase() : 
                      filter === 'received' ? t("history.receivedOnly").toLowerCase() : 
                      t("history.encryptedOnly").toLowerCase()
                    }`
                }
              </p>
              <p className="text-xs text-muted-foreground/70">
                {t("history.completedWillAppear")}
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {history.map((group) => (
                <div key={group.date}>
                  {/* Data gruppo */}
                  <div className="text-xs font-medium text-muted-foreground mb-3 uppercase tracking-wide">
                    {group.displayDate}
                  </div>
                  
                  {/* Items del gruppo */}
                  <div className="space-y-2">
                    {group.items.map((item) => (
                      <div
                        key={item.id}
                        className="group flex items-center gap-3 p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
                      >
                        {/* Preview/Icon */}
                        <div className="relative">
                          <FilePreviewMetadata
                            fileName={item.fileName}
                            fileType={item.fileType}
                            size="small"
                          />
                          
                          {/* Direction indicator */}
                          <div className="absolute -top-1 -right-1 w-4 h-4 bg-background rounded-full border flex items-center justify-center">
                            {item.direction === 'sent' ? (
                              <FileUp className="h-2 w-2 text-blue-500" />
                            ) : (
                              <FileDown className="h-2 w-2 text-green-500" />
                            )}
                          </div>
                        </div>

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <p className="font-medium text-sm text-foreground truncate">
                              {item.relativePath || item.fileName}
                            </p>
                            {item.encrypted && (
                              <Lock className="h-3 w-3 text-amber-500" />
                            )}
                            {getStatusIcon(item.status)}
                          </div>
                          
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <span>{item.direction === 'sent' ? '→' : '←'} {item.deviceName}</span>
                            <span>•</span>
                            <span>{formatFileSize(item.fileSize)}</span>
                            <span>•</span>
                            <span>{formatTime(item.timestamp)}</span>
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          {item.direction === 'sent' && item.status === 'completed' && onResendFile && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleResend(item)}
                              className="h-7 w-7 p-0 hover:bg-blue-100 dark:hover:bg-blue-900/20"
                              title={item.fileData ? t("transfer.resendAuto") : t("transfer.resendManual")}
                            >
                              <RotateCcw className={`h-3 w-3 ${item.fileData ? 'text-green-500' : 'text-blue-500'}`} />
                            </Button>
                          )}
                          
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRemoveItem(item.id)}
                            className="h-7 w-7 p-0 hover:bg-red-100 dark:hover:bg-red-900/20"
                            title={t("history.removeFromHistory")}
                          >
                            <Trash2 className="h-3 w-3 text-red-500" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Clear All Dialog */}
      <AlertDialog open={showClearDialog} onOpenChange={setShowClearDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("history.clearAll")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("dialog.confirmClearHistory")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("dialog.cancel")}</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleClearAll}
              className="bg-red-600 hover:bg-red-700"
            >
              {t("history.clearAll")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};