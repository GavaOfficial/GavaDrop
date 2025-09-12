"use client";

import { useState, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { 
  AlertDialog, 
  AlertDialogAction, 
  AlertDialogCancel, 
  AlertDialogContent, 
  AlertDialogDescription, 
  AlertDialogFooter, 
  AlertDialogHeader, 
  AlertDialogTitle 
} from "@/components/ui/alert-dialog";
import { Lock } from "lucide-react";
import { toast } from "sonner";
import { useLanguage } from "@/contexts/language-context";
import { FilePreviewMetadata } from "@/components/file-preview-metadata";
import { MobileBottomNav } from "@/components/mobile-bottom-nav";
import { ModernMobileHome } from "@/components/modern-mobile-home";
import { ModernMobileDevices } from "@/components/modern-mobile-devices";
import { ModernMobileChat } from "@/components/modern-mobile-chat";
import { TransferHistory } from "@/components/transfer-history";
import Image from "next/image";

interface ModernMobileAppProps {
  selectedFiles: File[];
  selectedFolders: import('@/utils/folder-utils').FolderInfo[];
  isSending: boolean;
  selectedPeer: string | null;
  lastSelectedClientId: string | null;
  inputMessage: string;
  isEditingName: boolean;
  newDeviceName: string;
  showDecryptDialog: boolean;
  decryptPassword: string;
  decryptAttempts: number;
  pendingEncryptedFile: {data: ArrayBuffer, fileName: string, fromSocketId: string, originalFileName: string} | null;
  receivedFiles: {data: ArrayBuffer, fileName: string, relativePath: string, fromSocketId: string}[];
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  folderInputRef: React.RefObject<HTMLInputElement | null>;
  isSelectingFolderRef: React.MutableRefObject<boolean>;
  peers: Array<{socketId: string; clientId: string; deviceName: string}>;
  deviceInfo: {deviceName: string; deviceId: string} | null;
  isConnected: boolean;
  sendFile: (file: File, peerId: string) => Promise<void>;
  sendBatchFiles: (files: File[], peerId: string) => Promise<void>;
  sendMessage: (message: string, peerId: string) => void;
  messages: Map<string, Array<{id: string; text: string; isOwn: boolean; fromName: string; timestamp: number}>>;
  unreadCounts: Map<string, number>;
  markMessagesAsRead: (peerId: string) => void;
  disconnectedPeers: Map<string, {peer: {socketId: string; clientId: string; deviceName: string}; disconnectedAt: number}>;
  incomingFileRequest: {from: string, fromName: string, fileName: string, fileSize: number, socketId: string} | null;
  incomingBatchRequest: {fromName: string, files: Array<{fileName: string, fileSize: number}>, socketId: string, batchId: string} | null;
  transferProgress: {progress: number; fileName: string; type: 'sending' | 'receiving'} | null;
  acceptFile: (socketId: string) => void;
  rejectFile: (socketId: string) => void;
  acceptBatchFiles: (socketId: string, batchId: string) => void;
  rejectBatchFiles: (socketId: string, batchId: string) => void;
  changeDeviceName: (name: string) => void;
  resendFile: (fileName: string, fileSize: number, deviceName: string, fileData?: string) => Promise<void>;
  handleFilesSelect: (files: File[]) => void;
  handleFolderSelect: () => void;
  handleFileSend: () => Promise<void>;
  removeFile: (index: number) => void;
  removeFolder: (index: number) => void;
  clearAllFiles: () => void;
  handleStartEditName: () => void;
  handleSaveDeviceName: () => void;
  handleCancelEditName: () => void;
  handleDecryptFile: () => Promise<void>;
  setSelectedPeer: (peer: string | null) => void;
  setInputMessage: (message: string) => void;
  setDecryptPassword: (password: string) => void;
  setShowDecryptDialog: (show: boolean) => void;
  setDecryptAttempts: (attempts: number) => void;
  setPendingEncryptedFile: (file: {data: ArrayBuffer, fileName: string, fromSocketId: string, originalFileName: string} | null) => void;
  setNewDeviceName: (name: string) => void;
}

export default function ModernMobileApp(props: ModernMobileAppProps) {
  const [activeTab, setActiveTab] = useState<'home' | 'devices' | 'chat' | 'history'>('home');
  const { t } = useLanguage();

  // Usa tutte le props dal desktop - nessuna logica duplicata
  const {
    selectedFiles,
    selectedFolders,
    isSending,
    selectedPeer,
    inputMessage,
    peers,
    deviceInfo,
    isConnected,
    messages,
    unreadCounts,
    markMessagesAsRead,
    disconnectedPeers,
    transferProgress,
    handleFilesSelect,
    handleFolderSelect,
    handleFileSend,
    removeFile,
    removeFolder,
    clearAllFiles,
    sendMessage,
    setSelectedPeer,
    setInputMessage,
    incomingFileRequest: incomingFileRequestProp,
    incomingBatchRequest: incomingBatchRequestProp,
    acceptFile,
    rejectFile,
    acceptBatchFiles,
    rejectBatchFiles,
    showDecryptDialog,
    decryptPassword,
    decryptAttempts,
    pendingEncryptedFile,
    handleDecryptFile,
    setDecryptPassword,
    setShowDecryptDialog,
    setDecryptAttempts,
    setPendingEncryptedFile,
    resendFile,
    isEditingName,
    newDeviceName,
    handleStartEditName,
    handleSaveDeviceName,
    handleCancelEditName,
    setNewDeviceName
  } = props;

  // Helper functions that should come from desktop
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const playNotificationSound = (_type: string) => {
    // No-op for mobile, desktop handles this
  };

  // Calculate total unread messages  
  const totalUnreadCount = unreadCounts ? Array.from(unreadCounts.values()).reduce((sum, count) => sum + count, 0) : 0;

  // Auto-switch to chat when device is selected and has unread messages
  const handlePeerSelect = useCallback((peerId: string | null) => {
    setSelectedPeer(peerId);
    
    // Auto-switch to chat if device has unread messages
    if (peerId && peers && unreadCounts) {
      const peer = peers.find(p => p.socketId === peerId);
      if (peer && unreadCounts.get(peer.clientId) && unreadCounts.get(peer.clientId)! > 0) {
        setActiveTab('chat');
        markMessagesAsRead(peerId);
      }
    }
  }, [peers, unreadCounts, markMessagesAsRead, setSelectedPeer]);

  // Render active tab content
  const renderActiveTab = () => {
    switch (activeTab) {
      case 'home':
        return (
          <ModernMobileHome
            selectedFiles={selectedFiles}
            selectedFolders={selectedFolders}
            selectedPeer={selectedPeer}
            peerName={peers.find(p => p.socketId === selectedPeer)?.deviceName}
            isConnected={isConnected}
            isSending={isSending}
            transferProgress={transferProgress}
            onFilesSelect={handleFilesSelect}
            onFolderSelect={handleFolderSelect}
            onSend={handleFileSend}
            onRemoveFile={removeFile}
            onRemoveFolder={removeFolder}
            onClearAll={clearAllFiles}
          />
        );
      
      case 'devices':
        return (
          <ModernMobileDevices
            peers={peers || []}
            disconnectedPeers={disconnectedPeers || new Map()}
            selectedPeer={selectedPeer}
            deviceInfo={deviceInfo}
            isConnected={isConnected}
            unreadCounts={unreadCounts || new Map()}
            onPeerSelect={handlePeerSelect}
            onEditDeviceName={handleStartEditName}
            onChatOpen={() => setActiveTab('chat')}
            isEditingName={isEditingName}
            newDeviceName={newDeviceName}
            onNameChange={setNewDeviceName}
            onSaveName={handleSaveDeviceName}
            onCancelEdit={handleCancelEditName}
          />
        );
      
      case 'chat':
        const selectedPeerData = (peers || []).find(p => p.socketId === selectedPeer) || 
                               (disconnectedPeers ? Array.from(disconnectedPeers.values()).find(dp => dp.peer.socketId === selectedPeer)?.peer : null);
        
        return (
          <ModernMobileChat
            selectedPeer={selectedPeer}
            peerName={selectedPeerData?.deviceName}
            messages={selectedPeerData && messages ? messages.get(selectedPeerData.clientId) || [] : []}
            unreadCount={selectedPeerData && unreadCounts ? unreadCounts.get(selectedPeerData.clientId) || 0 : 0}
            inputMessage={inputMessage}
            onInputChange={setInputMessage}
            onSendMessage={() => {
              if (inputMessage.trim() && selectedPeer && sendMessage) {
                sendMessage(inputMessage, selectedPeer);
                setInputMessage('');
              }
            }}
            onMarkAsRead={() => selectedPeer && markMessagesAsRead && markMessagesAsRead(selectedPeer)}
            isConnected={isConnected}
          />
        );
      
      case 'history':
        return (
          <div className="h-full">
            <TransferHistory 
              isOpen={true}
              onResendFile={async (fileName, fileSize, deviceName, fileData) => {
                try {
                  await resendFile(fileName, fileSize, deviceName, fileData);
                  toast.success(`${fileName} inviato nuovamente`);
                  playNotificationSound('success');
                } catch (error: unknown) {
                  const errorMessage = (error as Error).message;
                  if (errorMessage.includes('not currently connected')) {
                    toast.error(`Dispositivo non connesso: ${deviceName}`);
                  } else if (errorMessage.includes('No file selected') || errorMessage.includes('cancelled')) {
                    toast.info("Seleziona il file originale");
                  } else if (errorMessage.includes('rejected')) {
                    toast.error("File rifiutato");
                  } else {
                    toast.error("Errore durante l'invio");
                    console.error('Resend error:', error);
                  }
                }
              }}
            />
          </div>
        );
      
      default:
        return null;
    }
  };

  return (
    <>
      <div className="h-full flex flex-col">
        <div className="flex-1 overflow-hidden">
          {renderActiveTab()}
        </div>
        <MobileBottomNav
          activeTab={activeTab}
          onTabChange={setActiveTab}
          unreadCount={totalUnreadCount}
          hasSelectedDevice={!!selectedPeer}
        />
      </div>

      {/* File Request Dialog */}
      <AlertDialog open={!!incomingFileRequestProp}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-3">
              <Image 
                src="/icon.png" 
                alt="GavaDrop" 
                width={24} 
                height={24}
                className="w-6 h-6"
              />
{t("dialog.fileRequest")}
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-4">
                <div className="flex items-center gap-4 p-4 bg-muted/30 rounded-lg">
                  <FilePreviewMetadata 
                    fileName={incomingFileRequestProp?.fileName || ''}
                    size="medium"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-foreground truncate">
                      {incomingFileRequestProp?.fileName}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {incomingFileRequestProp ? formatFileSize(incomingFileRequestProp.fileSize) : ''}
                    </div>
                  </div>
                </div>
                <div className="text-sm text-muted-foreground">
{incomingFileRequestProp?.fromName} {t("dialog.wantsToSend")} {t("message.thisFile")}. {t("dialog.acceptFile")}
                </div>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => incomingFileRequestProp && rejectFile(incomingFileRequestProp.socketId)}>
{t("dialog.reject")}
            </AlertDialogCancel>
            <AlertDialogAction onClick={() => incomingFileRequestProp && acceptFile(incomingFileRequestProp.socketId)}>
{t("dialog.accept")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Batch File Request Dialog */}
      <AlertDialog open={!!incomingBatchRequestProp}>
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-3">
              <Image 
                src="/icon.png" 
                alt="GavaDrop" 
                width={24} 
                height={24}
                className="w-6 h-6"
              />
{t("dialog.fileRequest")} Multipli
            </AlertDialogTitle>
            <AlertDialogDescription>
              {incomingBatchRequestProp?.fromName} vuole inviarti {incomingBatchRequestProp?.files.length} file
            </AlertDialogDescription>
          </AlertDialogHeader>
          
          <div className="max-h-40 overflow-y-auto space-y-2 my-4">
            {incomingBatchRequestProp?.files.map((file, index) => (
              <div key={index} className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg">
                <FilePreviewMetadata 
                  fileName={file.fileName}
                  size="small"
                />
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm text-foreground truncate">
                    {file.fileName}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formatFileSize(file.fileSize)}
                  </p>
                </div>
              </div>
            ))}
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel 
              onClick={() => incomingBatchRequestProp && rejectBatchFiles(incomingBatchRequestProp.socketId, incomingBatchRequestProp.batchId)}
            >
{t("dialog.reject")} Tutto
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => incomingBatchRequestProp && acceptBatchFiles(incomingBatchRequestProp.socketId, incomingBatchRequestProp.batchId)}
            >
{t("dialog.accept")} Tutto
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Decrypt Dialog */}
      <AlertDialog open={showDecryptDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-3">
              <Lock className="h-6 w-6 text-green-600" />
              File Crittografato
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-4">
                <div>
                  Hai ricevuto il file crittografato <strong>{pendingEncryptedFile?.fileName}</strong>
                </div>
                <div>
                  Inserisci la password per decrittografarlo:
                </div>
                {decryptAttempts > 0 && (
                  <div className="text-orange-600 dark:text-orange-400 text-sm font-medium">
                    {3 - decryptAttempts} tentativo{3 - decryptAttempts === 1 ? '' : 'i'} rimasto{3 - decryptAttempts === 1 ? '' : 'i'}
                  </div>
                )}
                <Input
                  type="password"
                  placeholder="Inserisci password"
                  value={decryptPassword}
                  onChange={(e) => setDecryptPassword(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleDecryptFile();
                  }}
                  className="mt-2"
                />
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => {
              setShowDecryptDialog(false);
              setDecryptPassword("");
              setDecryptAttempts(0);
              setPendingEncryptedFile(null);
            }}>
              Annulla
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleDecryptFile} disabled={!decryptPassword.trim()}>
              <Lock className="h-4 w-4 mr-2" />
              Decritta e Scarica
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
