"use client";

import { useState, useRef, useCallback } from 'react';
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import {
  FolderIcon,
  LockIcon,
  LockOpenIcon,
  PaperPlaneTiltIcon,
  PlusIcon,
  UploadSimpleIcon,
  WifiHighIcon,
  WifiSlashIcon,
  XIcon,
  LightningIcon,
} from "@phosphor-icons/react";
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
  isEncryptionEnabled: boolean;
  encryptionPassword: string;
  onToggleEncryption: (enabled: boolean) => void;
  onPasswordChange: (password: string) => void;
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
  onClearAll,
  isEncryptionEnabled,
  encryptionPassword,
  onToggleEncryption,
  onPasswordChange
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

  const handleFileDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (!selectedPeer) return;
    onFilesSelect(Array.from(e.dataTransfer.files));
  }, [selectedPeer, onFilesSelect]);

  const handleFileSelect = useCallback(() => {
    if (!selectedPeer) return;
    fileInputRef.current?.click();
  }, [selectedPeer]);

  const hasItems = selectedFiles.length > 0 || selectedFolders.length > 0;
  const totalItems = selectedFiles.length + selectedFolders.length;

  return (
    <div className="flex h-full flex-col overflow-hidden bg-[#030303] text-white">
      <header className="shrink-0 px-5 pb-3 pt-[calc(env(safe-area-inset-top,0px)+18px)]">
        <div className="rounded-[1.15rem] bg-[#171916] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
          <div className="flex items-center gap-3">
            <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl ${isConnected ? 'bg-[#c9a6ff]/15 text-[#c9a6ff]' : 'bg-orange-400/15 text-orange-300'}`}>
              {isConnected ? <WifiHighIcon className="h-5 w-5" weight="bold" /> : <WifiSlashIcon className="h-5 w-5" weight="bold" />}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-xl font-semibold tracking-[-0.02em]">
                {selectedPeer ? `${t("transfer.sendingTo")} ${peerName}` : t("transfer.selectDeviceToStart")}
              </p>
              <p className="mt-1 text-sm font-medium text-white/40">
                {isConnected ? t("status.connected") : t("status.disconnected")}
              </p>
            </div>
          </div>
        </div>
      </header>

      {transferProgress && (
        <div className="shrink-0 px-5 pb-3">
          <div className="transfer-queue-enter rounded-[1.15rem] bg-[#171916] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
            <div className="mb-3 flex items-center gap-3">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#e6d5ff] text-black">
                <LightningIcon className="h-5 w-5" weight="bold" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">{transferProgress.fileName}</p>
                <p className="mt-0.5 text-xs font-medium text-[#c9a6ff]">
                  {Math.round(transferProgress.progress)}% {t("progress.completed")}
                </p>
              </div>
              <p className="text-2xl font-semibold text-[#c9a6ff]">{Math.round(transferProgress.progress)}%</p>
            </div>
            <Progress value={transferProgress.progress} className="h-3" />
          </div>
        </div>
      )}

      <main className="min-h-0 flex-1 px-5 pb-4">
        <section
          className={`relative flex h-full flex-col overflow-hidden rounded-[1.35rem] bg-[#080907] shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] transition-[transform,background-color] duration-500 ${
            isDragOver && selectedPeer ? "scale-[1.01] bg-[#11120f]" : ""
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
          <div className={`pointer-events-none absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-[#8f55ff]/25 to-transparent transition-opacity duration-300 ${isDragOver && selectedPeer ? 'opacity-100' : 'opacity-0'}`} />

          {hasItems ? (
            <div className="relative z-10 flex h-full min-h-0 flex-col p-4">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="text-2xl font-semibold tracking-[-0.02em]">
                    {totalItems} {totalItems === 1 ? t("transfer.element") : t("transfer.elements")}
                  </h3>
                  <p className="mt-1 text-sm font-medium text-white/40">{t("transfer.readyForSending")}</p>
                </div>
                <div className="flex shrink-0 gap-2">
                  <Button variant="ghost" size="sm" onClick={onClearAll} disabled={isSending} className="h-10 w-10 rounded-xl p-0 text-white/45 hover:bg-white/[0.08] hover:text-white">
                    <XIcon className="h-4 w-4" weight="bold" />
                  </Button>
                  <Button size="sm" onClick={handleFileSelect} disabled={!selectedPeer || isSending} className="h-10 rounded-xl bg-[#e6d5ff] px-3 text-black hover:bg-[#d9bcff]">
                    <PlusIcon className="h-4 w-4" weight="bold" />
                  </Button>
                </div>
              </div>

              <div className="min-h-0 flex-1 space-y-2 overflow-y-auto pr-1 custom-scrollbar">
                {selectedFolders.map((folder, index) => (
                  <div key={`folder-${index}`} className="transfer-drop-compact flex items-center gap-3 rounded-xl border border-white/[0.06] bg-white/[0.035] p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]" style={{ animationDelay: `${index * 45}ms` }}>
                    <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-[#f3ead2] text-black/70">
                      <FolderIcon className="h-5 w-5" weight="bold" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold">{folder.name}</p>
                      <p className="mt-0.5 text-xs font-medium text-white/35">{formatFileSize(folder.size)} - {folder.files.length} file</p>
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => onRemoveFolder(index)} disabled={isSending} className="h-8 w-8 rounded-lg p-0 text-white/35 hover:bg-white/[0.08] hover:text-white">
                      <XIcon className="h-4 w-4" weight="bold" />
                    </Button>
                  </div>
                ))}

                {selectedFiles.map((file, index) => (
                  <div key={`file-${index}`} className="transfer-drop-compact flex items-center gap-3 rounded-xl border border-white/[0.06] bg-white/[0.035] p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]" style={{ animationDelay: `${(selectedFolders.length + index) * 45}ms` }}>
                    <FilePreview file={file} size="small" className="rounded-xl" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold">{file.webkitRelativePath || file.name}</p>
                      <p className="mt-0.5 text-xs font-medium text-white/35">{formatFileSize(file.size)}</p>
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => onRemoveFile(index)} disabled={isSending} className="h-8 w-8 rounded-lg p-0 text-white/35 hover:bg-white/[0.08] hover:text-white">
                      <XIcon className="h-4 w-4" weight="bold" />
                    </Button>
                  </div>
                ))}
              </div>

              <div className="mt-4 rounded-xl border border-white/[0.06] bg-black/20 p-3">
                <label className="flex cursor-pointer items-center gap-3">
                  <input
                    type="checkbox"
                    checked={isEncryptionEnabled}
                    onChange={(e) => onToggleEncryption(e.target.checked)}
                    className="rounded border-white/20 bg-black/30 text-[#c9a6ff] focus:ring-[#c9a6ff]"
                  />
                  <span className="flex min-w-0 items-center gap-2 text-sm font-medium">
                    {isEncryptionEnabled ? <LockIcon className="h-4 w-4 text-[#dff36b]" weight="bold" /> : <LockOpenIcon className="h-4 w-4 text-white/35" weight="bold" />}
                    {t("encryption.endToEnd")}
                  </span>
                </label>
                {isEncryptionEnabled && (
                  <Input
                    type="password"
                    placeholder={t("encryption.passwordPlaceholder")}
                    value={encryptionPassword}
                    onChange={(e) => onPasswordChange(e.target.value)}
                    className="mt-3 h-10 rounded-xl border-white/[0.08] bg-white/[0.04] text-sm text-white placeholder:text-white/35 focus-visible:ring-[#c9a6ff]"
                  />
                )}
              </div>

              <Button onClick={onSend} disabled={!selectedPeer || isSending} size="lg" className="mt-4 h-12 w-full rounded-xl bg-[#e6d5ff] font-semibold text-black hover:bg-[#d9bcff] disabled:opacity-45">
                {isSending ? (
                  <span className="flex items-center gap-3">
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-black/20 border-b-black" />
                    {t("transfer.sending")}
                  </span>
                ) : (
                  <span className="flex items-center gap-3">
                    <PaperPlaneTiltIcon className="h-5 w-5" weight="bold" />
                    {t("transfer.send")} {totalItems}
                  </span>
                )}
              </Button>
            </div>
          ) : (
            <div className="relative z-10 flex h-full flex-col items-center justify-center px-7 text-center">
              <span className={`mb-6 grid h-24 w-24 place-items-center rounded-[1.4rem] border border-white/[0.06] bg-white/[0.035] ${selectedPeer ? '' : 'opacity-45'}`}>
                <UploadSimpleIcon className={`h-12 w-12 ${selectedPeer ? 'text-[#c9a6ff]' : 'text-white/35'}`} weight="bold" />
              </span>
              <h3 className="max-w-xs text-3xl font-semibold tracking-[-0.03em] text-white">
                {selectedPeer ? t("transfer.dragFilesHere") : t("transfer.selectDeviceToStart")}
              </h3>
              <p className="mt-3 max-w-xs text-sm font-medium leading-relaxed text-white/40">
                {selectedPeer ? t("transfer.orUseButtons") : t("transfer.chooseFromDevicesTab")}
              </p>

              {selectedPeer && (
                <div className="mt-8 flex w-full max-w-xs flex-col gap-3">
                  <Button onClick={handleFileSelect} size="lg" className="h-12 w-full rounded-xl bg-[#e6d5ff] font-semibold text-black hover:bg-[#d9bcff]">
                    <UploadSimpleIcon className="mr-2 h-5 w-5" weight="bold" />
                    {t("transfer.selectFiles")}
                  </Button>
                  <Button onClick={onFolderSelect} size="lg" variant="outline" className="h-12 w-full rounded-xl border-white/[0.08] bg-white/[0.04] font-semibold text-white hover:bg-white/[0.08] hover:text-white">
                    <FolderIcon className="mr-2 h-5 w-5" weight="bold" />
                    {t("transfer.selectFolder")}
                  </Button>
                </div>
              )}
            </div>
          )}
        </section>
      </main>

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
