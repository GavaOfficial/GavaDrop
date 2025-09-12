"use client";

import { useState, useRef, useCallback } from 'react';
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  Upload, 
  FileImage, 
  FileText, 
  FileVideo, 
  File,
  X,
  Folder,
  Send,
  Wifi,
  WifiOff,
  Plus,
  ChevronRight,
  Zap
} from "lucide-react";
import { useLanguage } from "@/contexts/language-context";
import { FilePreview } from "@/components/file-preview";

interface ModernMobileHomeProps {
  selectedFiles: File[];
  selectedFolders: Array<{
    name: string;
    size: number;
    files: File[];
  }>;
  selectedPeer: string | null;
  peerName?: string;
  isConnected: boolean;
  isSending: boolean;
  transferProgress?: {
    progress: number;
    fileName: string;
    type: 'sending' | 'receiving';
  } | null;
  onFilesSelect: (files: File[]) => void;
  onFolderSelect: () => void;
  onSend: () => void;
  onRemoveFile: (index: number) => void;
  onRemoveFolder: (index: number) => void;
  onClearAll: () => void;
}

export const ModernMobileHome = ({
  selectedFiles,
  selectedFolders,
  selectedPeer,
  peerName,
  isConnected,
  isSending,
  transferProgress,
  onFilesSelect,
  onFolderSelect,
  onSend,
  onRemoveFile,
  onRemoveFolder,
  onClearAll
}: ModernMobileHomeProps) => {
  const { t } = useLanguage();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getFileIcon = (file: File) => {
    const type = file.type;
    if (type.startsWith('image/')) return FileImage;
    if (type.startsWith('video/')) return FileVideo;
    if (type.includes('text') || type.includes('json') || type.includes('xml')) return FileText;
    return File;
  };

  const handleFileDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    
    if (!selectedPeer) return;
    
    const droppedFiles = Array.from(e.dataTransfer.files);
    onFilesSelect(droppedFiles);
  }, [selectedPeer, onFilesSelect]);

  const handleFileSelect = useCallback(() => {
    if (!selectedPeer) return;
    fileInputRef.current?.click();
  }, [selectedPeer]);

  const hasItems = selectedFiles.length > 0 || selectedFolders.length > 0;
  const totalItems = selectedFiles.length + selectedFolders.length;

  return (
    <div className="flex flex-col h-full bg-gradient-to-br from-background via-background to-muted/20">
      {/* Header Status */}
      <div className="px-6 py-4">
        <div className="flex items-center gap-3 mb-2">
          <div className={`p-2 rounded-full ${isConnected ? 'bg-green-100 dark:bg-green-900/30' : 'bg-red-100 dark:bg-red-900/30'}`}>
            {isConnected ? (
              <Wifi className="h-5 w-5 text-green-600 dark:text-green-400" />
            ) : (
              <WifiOff className="h-5 w-5 text-red-600 dark:text-red-400" />
            )}
          </div>
          <div className="flex-1">
            <h2 className="text-xl font-bold text-foreground">
              {selectedPeer ? `${t("transfer.sendingTo")} ${peerName}` : t("transfer.selectDeviceToStart")}
            </h2>
            <p className="text-sm text-muted-foreground">
              {isConnected ? t("status.connected") : t("status.disconnected")}
            </p>
          </div>
        </div>
      </div>

      {/* Transfer Progress */}
      {transferProgress && (
        <div className="mx-6 mb-4">
          <Card className="ios-card p-4 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 border-blue-200 dark:border-blue-800">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 bg-blue-100 dark:bg-blue-800 rounded-2xl">
                <Zap className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-blue-900 dark:text-blue-100 truncate">
                  {transferProgress.fileName}
                </p>
                <p className="text-sm text-blue-600 dark:text-blue-300">
                  {Math.round(transferProgress.progress)}% completato
                </p>
              </div>
            </div>
            <Progress value={transferProgress.progress} className="h-3 ios-progress" />
          </Card>
        </div>
      )}

      {/* File Drop Zone */}
      <div className="flex-1 px-6 overflow-hidden">
        <div
          className={`h-full border-2 border-dashed rounded-3xl transition-all duration-300 ${
            isDragOver && selectedPeer
              ? "border-primary bg-primary/5 scale-[1.02]"
              : selectedPeer
              ? "border-border hover:border-primary/50 hover:bg-muted/30"
              : "border-muted bg-muted/20"
          }`}
          onDragOver={(e) => {
            e.preventDefault();
            if (selectedPeer) setIsDragOver(true);
          }}
          onDragLeave={(e) => {
            e.preventDefault();
            setIsDragOver(false);
          }}
          onDrop={handleFileDrop}
        >
          {hasItems ? (
            <div className="h-full flex flex-col p-4">
              {/* Items Header */}
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-foreground">
{totalItems} {totalItems === 1 ? t("transfer.element") : t("transfer.elements")}
                  </h3>
                  <p className="text-sm text-muted-foreground">
{t("transfer.readyForSending")}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={onClearAll}
                    disabled={isSending}
                    className="text-destructive hover:text-destructive"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleFileSelect}
                    disabled={!selectedPeer || isSending}
                    className="gap-2"
                  >
                    <Plus className="h-4 w-4" />
{t("transfer.add")}
                  </Button>
                </div>
              </div>

              {/* Items List */}
              <div className="flex-1 overflow-y-auto space-y-3 custom-scrollbar">
                {/* Folders */}
                {selectedFolders.map((folder, index) => (
                  <Card key={`folder-${index}`} className="p-4 bg-amber-50/50 dark:bg-amber-950/20 border-amber-200/50 dark:border-amber-800/30">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-amber-100 dark:bg-amber-900/50 rounded-xl">
                        <Folder className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-foreground truncate">
                          {folder.name}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {formatFileSize(folder.size)} • {folder.files.length} file{folder.files.length !== 1 ? 's' : ''}
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onRemoveFolder(index)}
                        disabled={isSending}
                        className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </Card>
                ))}

                {/* Files */}
                {selectedFiles.map((file, index) => {
                  const FileIcon = getFileIcon(file);
                  return (
                    <Card key={`file-${index}`} className="p-4 hover:bg-muted/30 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="relative">
                          <FilePreview file={file} size="small" className="rounded-xl" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-foreground truncate">
                            {file.webkitRelativePath || file.name}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {formatFileSize(file.size)}
                          </p>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onRemoveFile(index)}
                          disabled={isSending}
                          className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </Card>
                  );
                })}
              </div>

              {/* Send Button */}
              <div className="mt-4">
                <Button
                  onClick={onSend}
                  disabled={!selectedPeer || isSending}
                  size="lg"
                  className="w-full h-14 text-lg font-semibold bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 shadow-lg"
                >
                  {isSending ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-3"></div>
{t("transfer.sending")}
                    </>
                  ) : (
                    <>
                      <Send className="h-5 w-5 mr-3" />
{t("transfer.send")} {totalItems} {totalItems === 1 ? t("transfer.element") : t("transfer.elements")}
                    </>
                  )}
                </Button>
              </div>
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center p-8 text-center">
              <div className={`p-6 rounded-full mb-6 ${
                selectedPeer ? 'bg-primary/10' : 'bg-muted'
              }`}>
                <Upload className={`h-12 w-12 ${
                  selectedPeer ? 'text-primary' : 'text-muted-foreground'
                }`} />
              </div>
              
              <h3 className={`text-xl font-bold mb-2 ${
                selectedPeer ? 'text-foreground' : 'text-muted-foreground'
              }`}>
{selectedPeer ? t("transfer.dragFilesHere") : t("transfer.selectDeviceToStart")}
              </h3>
              
              <p className="text-muted-foreground mb-8 leading-relaxed">
{selectedPeer 
                  ? t("transfer.orUseButtons")
                  : t("transfer.chooseFromDevicesTab")
                }
              </p>

              {selectedPeer && (
                <div className="flex flex-col gap-3 w-full max-w-xs">
                  <Button
                    onClick={handleFileSelect}
                    size="lg"
                    variant="default"
                    className="w-full gap-3 h-12"
                  >
                    <Upload className="h-5 w-5" />
{t("transfer.selectFiles")}
                  </Button>
                  <Button
                    onClick={onFolderSelect}
                    size="lg"
                    variant="outline"
                    className="w-full gap-3 h-12"
                  >
                    <Folder className="h-5 w-5" />
{t("transfer.selectFolder")}
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        onChange={(e) => {
          const files = Array.from(e.target.files || []);
          onFilesSelect(files);
          e.target.value = '';
        }}
        className="hidden"
      />
    </div>
  );
};