"use client";

import { useState, useRef, useCallback } from 'react';
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  Upload, 
  Camera, 
  FileText, 
  Image as ImageIcon,
  Video,
  Music,
  Folder,
  Send,
  X,
  Trash2,
  Plus,
  FileUp,
  FileDown
} from "lucide-react";
import { useLanguage } from "@/contexts/language-context";
import { FilePreview } from "@/components/file-preview";
import { toast } from "sonner";

interface MobileFileUploadProps {
  selectedFiles: File[];
  selectedFolders: Array<{ name: string; files: File[]; size: number; }>;
  selectedPeer: string | null;
  peerName?: string;
  isSending: boolean;
  transferProgress?: {
    fileName: string;
    progress: number;
    type: 'sending' | 'receiving';
  } | null;
  onFilesSelect: (files: File[]) => void;
  onFolderSelect: () => void;
  onSend: () => void;
  onRemoveFile: (index: number) => void;
  onRemoveFolder: (index: number) => void;
  onClearAll: () => void;
  onCameraCapture?: () => void;
}

export const MobileFileUpload = ({
  selectedFiles,
  selectedFolders,
  selectedPeer,
  peerName,
  isSending,
  transferProgress,
  onFilesSelect,
  onFolderSelect,
  onSend,
  onRemoveFile,
  onRemoveFolder,
  onClearAll,
  onCameraCapture
}: MobileFileUploadProps) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const { t } = useLanguage();

  const hasFiles = selectedFiles.length > 0 || selectedFolders.length > 0;
  const totalItems = selectedFiles.length + selectedFolders.length;

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    
    if (!selectedPeer) {
      toast.error(t("toast.selectDeviceFirst"));
      return;
    }

    const droppedFiles = Array.from(e.dataTransfer.files);
    onFilesSelect(droppedFiles);
  }, [selectedPeer, onFilesSelect, t]);

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getFileTypeIcon = (file: File) => {
    const type = file.type.toLowerCase();
    if (type.startsWith('image/')) return ImageIcon;
    if (type.startsWith('video/')) return Video;
    if (type.startsWith('audio/')) return Music;
    if (type.includes('text') || type.includes('json') || type.includes('xml')) return FileText;
    return FileText;
  };

  return (
    <div className="flex flex-col h-full">
      {/* Transfer Progress */}
      {transferProgress && (
        <Card className="mb-4 p-4 glass-card animate-fade-in-up">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2.5 gradient-primary rounded-xl glow-sm">
              {transferProgress.type === 'sending' ? (
                <FileUp className="h-5 w-5 text-white" />
              ) : (
                <FileDown className="h-5 w-5 text-white" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm text-foreground truncate">
                {transferProgress.type === 'sending' ? t("progress.sending") : t("progress.receiving")}: {transferProgress.fileName}
              </p>
              <p className="text-xs text-muted-foreground">
                {Math.round(transferProgress.progress)}% {t("progress.completed")}
              </p>
            </div>
            <div className="text-2xl font-bold gradient-text">
              {Math.round(transferProgress.progress)}%
            </div>
          </div>
          <Progress value={transferProgress.progress} variant="glow" />
        </Card>
      )}

      {/* File Drop Area / Action Buttons */}
      {!hasFiles ? (
        <Card
          className={`flex-1 transition-all duration-300 cursor-pointer ${
            isDragOver && selectedPeer
              ? "border-primary glow scale-[1.02] glass-card"
              : selectedPeer
              ? "border-dashed border-2 border-primary/30 hover:border-primary/60 glass-subtle hover-lift"
              : "border-dashed border-2 border-muted bg-muted/20"
          }`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => selectedPeer && fileInputRef.current?.click()}
        >
          <div className="h-full flex flex-col items-center justify-center p-6 text-center">
            <div className={`mb-6 p-6 rounded-full ${selectedPeer ? 'bg-primary/10' : 'bg-muted/30'} transition-all duration-300`}>
              <Upload className={`h-12 w-12 ${
                selectedPeer ? 'text-primary' : 'text-muted-foreground'
              } transition-all duration-300 ${isDragOver && selectedPeer ? 'animate-bounce-subtle' : ''}`} />
            </div>

            <h2 className={`text-xl font-bold mb-2 ${
              selectedPeer ? 'gradient-text' : 'text-muted-foreground'
            }`} style={{ fontFamily: 'var(--font-silkscreen)' }}>
              {selectedPeer ? t("transfer.dropFilesHere") : t("transfer.selectDeviceFirst2")}
            </h2>

            <p className="text-muted-foreground text-sm mb-6">
              {selectedPeer
                ? t("transfer.multipleFiles")
                : t("transfer.selectDeviceHelp")
              }
            </p>

            {selectedPeer && (
              <div className="grid grid-cols-2 gap-3 w-full max-w-sm">
                <Button
                  size="lg"
                  className="h-14 flex-col gap-2 gradient-primary btn-modern hover:opacity-90 transition-smooth"
                  onClick={(e) => {
                    e.stopPropagation();
                    fileInputRef.current?.click();
                  }}
                >
                  <FileText className="h-6 w-6" />
                  <span className="text-xs">{t("transfer.files")}</span>
                </Button>

                <Button
                  size="lg"
                  variant="outline"
                  className="h-14 flex-col gap-2 glass hover:bg-primary/10 hover:border-primary/50 transition-smooth"
                  onClick={(e) => {
                    e.stopPropagation();
                    onFolderSelect();
                  }}
                >
                  <Folder className="h-6 w-6" />
                  <span className="text-xs">{t("transfer.folder")}</span>
                </Button>

                {navigator.mediaDevices && (
                  <>
                    <Button
                      size="lg"
                      variant="outline"
                      className="h-14 flex-col gap-2 glass hover:bg-primary/10 hover:border-primary/50 transition-smooth"
                      onClick={(e) => {
                        e.stopPropagation();
                        cameraInputRef.current?.click();
                      }}
                    >
                      <Camera className="h-6 w-6" />
                      <span className="text-xs">{t("transfer.photo")}</span>
                    </Button>

                    <Button
                      size="lg"
                      variant="outline"
                      className="h-14 flex-col gap-2 glass hover:bg-primary/10 hover:border-primary/50 transition-smooth"
                      onClick={(e) => {
                        e.stopPropagation();
                        // Video capture functionality
                        const input = document.createElement('input');
                        input.type = 'file';
                        input.accept = 'video/*';
                        input.capture = 'environment';
                        input.onchange = (event) => {
                          const files = (event.target as HTMLInputElement).files;
                          if (files) onFilesSelect(Array.from(files));
                        };
                        input.click();
                      }}
                    >
                      <Video className="h-6 w-6" />
                      <span className="text-xs">{t("transfer.video")}</span>
                    </Button>
                  </>
                )}
              </div>
            )}

            {/* Hidden Inputs */}
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
            <input
              ref={cameraInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={(e) => {
                const files = Array.from(e.target.files || []);
                onFilesSelect(files);
                e.target.value = '';
              }}
              className="hidden"
            />
          </div>
        </Card>
      ) : (
        /* File List */
        <div className="flex-1 flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-bold text-foreground">
                {t("transfer.queue")} ({totalItems})
              </h3>
              <p className="text-sm text-muted-foreground">
                {peerName ? `${t("transfer.readyToSendTo")} ${peerName}` : t("transfer.readyToSend")}
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={onClearAll}
                disabled={isSending}
                className="text-destructive"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
              <Button
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                disabled={isSending}
                className="px-2"
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* File List */}
          <div className="flex-1 overflow-y-auto space-y-3 mb-4">
            {/* Folders */}
            {selectedFolders.map((folder, index) => (
              <Card key={`folder-${index}`} className="file-card-modern animate-fade-in-up" style={{ animationDelay: `${index * 50}ms` }}>
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-gradient-to-br from-amber-400/20 to-orange-500/20 rounded-xl flex items-center justify-center">
                    <Folder className="h-6 w-6 text-amber-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm truncate">
                      {folder.name}
                    </p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span>{formatFileSize(folder.size)}</span>
                      <span>•</span>
                      <span>{folder.files.length} {folder.files.length === 1 ? t("file.file") : t("file.files")}</span>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onRemoveFolder(index)}
                    disabled={isSending}
                    className="p-2 text-destructive hover:bg-destructive/10 transition-smooth"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </Card>
            ))}

            {/* Files */}
            {selectedFiles.map((file, index) => {
              const FileIcon = getFileTypeIcon(file);
              return (
                <Card key={`file-${index}`} className="file-card-modern animate-fade-in-up" style={{ animationDelay: `${(selectedFolders.length + index) * 50}ms` }}>
                  <div className="flex items-center gap-3">
                    <FilePreview
                      file={file}
                      size="small"
                      className="w-12 h-12 rounded-xl"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm truncate">
                        {file.webkitRelativePath || file.name}
                      </p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span>{formatFileSize(file.size)}</span>
                        <span>•</span>
                        <span>{file.type || t("file.unknown")}</span>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onRemoveFile(index)}
                      disabled={isSending}
                      className="p-2 text-destructive hover:bg-destructive/10 transition-smooth"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </Card>
              );
            })}
          </div>

          {/* Send Button */}
          <Button
            onClick={onSend}
            disabled={!selectedPeer || totalItems === 0 || isSending}
            size="lg"
            className="w-full h-14 text-lg font-semibold gradient-primary hover:opacity-90 transition-smooth btn-modern glow"
          >
            {isSending ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-3"></div>
                {t("transfer.sending")}
              </>
            ) : (
              <>
                <Send className="h-5 w-5 mr-3" />
                {t("transfer.send")} {totalItems} {totalItems === 1 ? t("file.element") : t("file.elements")}
              </>
            )}
          </Button>

          {/* Hidden Inputs */}
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
      )}
    </div>
  );
};