"use client";

import { useState, useCallback, useRef, useEffect } from "react";

// Debug logging - disabled in production
const DEBUG = process.env.NODE_ENV !== 'production';
const debug = (...args: unknown[]) => DEBUG && console.log(...args);
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
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
import {
  ChatCircleIcon,
  CheckIcon,
  ClockCounterClockwiseIcon,
  DeviceMobileIcon,
  DeviceTabletIcon,
  DownloadSimpleIcon,
  FolderIcon,
  LockIcon,
  LockOpenIcon,
  MagnifyingGlassIcon,
  MonitorIcon,
  PaperPlaneTiltIcon,
  PackageIcon,
  PencilLineIcon,
  TrashIcon,
  UploadSimpleIcon,
  WifiHighIcon,
  XIcon,
} from "@phosphor-icons/react";
import { toast } from "sonner";
import { useWebRTC, type Peer } from "@/hooks/useWebRTC";
import { ThemeToggle } from "@/components/theme-toggle";
import { LanguageSelector } from "@/components/language-selector";
import { useLanguage } from "@/contexts/language-context";
import { ScrollArea } from "@/components/ui/scroll-area";
import { FilePreview } from "@/components/file-preview";
import { FilePreviewMetadata } from "@/components/file-preview-metadata";
import { encryptFile, decryptFile } from "@/utils/encryption";
import { groupFilesByFolder, compressFolder } from "@/utils/folder-utils";
import { TransferHistory } from "@/components/transfer-history";
import { getHistory, saveToHistory, saveFileToHistory, type TransferHistoryItem } from "@/utils/history-utils";
import { playNotificationSound, initializeAudioContext } from "@/utils/notification-sounds";
import { notifyNative } from "@/utils/native-notify";
import { usePWAMode } from "@/hooks/usePWAMode";
import ModernMobileApp from "@/components/modern-mobile-app";
import { PWAInstallPrompt } from "@/components/pwa-install-prompt";

export default function Home() {
  const [isDragOver, setIsDragOver] = useState(false);
  const [selectedPeer, setSelectedPeer] = useState<string | null>(null);
  const [selectedOfflineClientId, setSelectedOfflineClientId] = useState<string | null>(null);
  const [isEditingName, setIsEditingName] = useState(false);
  const [newDeviceName, setNewDeviceName] = useState('');
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [selectedFolders, setSelectedFolders] = useState<import('@/utils/folder-utils').FolderInfo[]>([]);
  const [isSending, setIsSending] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [selectedFileIndex, setSelectedFileIndex] = useState<number | null>(null);
  const [encryptionPassword, setEncryptionPassword] = useState("");
  const [isEncryptionEnabled, setIsEncryptionEnabled] = useState(false);
  const [showDecryptDialog, setShowDecryptDialog] = useState(false);
  const [decryptPassword, setDecryptPassword] = useState("");
  const [decryptAttempts, setDecryptAttempts] = useState(0);
  const [pendingEncryptedFile, setPendingEncryptedFile] = useState<{data: ArrayBuffer, fileName: string, fromSocketId: string, originalFileName: string} | null>(null);
  const [isProgressHiding, setIsProgressHiding] = useState(false);
  const [inputMessage, setInputMessage] = useState("");
  const [desktopDeviceSearch, setDesktopDeviceSearch] = useState("");
  const [lastSelectedClientId, setLastSelectedClientId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);
  const dropAreaRef = useRef<HTMLDivElement>(null);
  const dropContentRef = useRef<HTMLDivElement>(null);
  const deselectAnimationTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const transferQueueCloseTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const nativeDevicePanelCloseTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isSelectingFolderRef = useRef<boolean>(false);
  const [isStateLoaded, setIsStateLoaded] = useState(false);
  const [activeView, setActiveView] = useState<'home' | 'history' | 'chat'>('home');
  const prevActiveView = useRef<'home' | 'history' | 'chat'>('home');
  useEffect(() => { prevActiveView.current = activeView; }, [activeView]);
  const [sectionTransitionFrom, setSectionTransitionFrom] = useState<'home' | 'history' | 'chat' | null>(null);
  const lastActiveViewRef = useRef<'home' | 'history' | 'chat'>('home');
  const [receivedFiles, setReceivedFiles] = useState<{data: ArrayBuffer, fileName: string, relativePath: string, fromSocketId: string}[]>([]);
  const [transferHistory, setTransferHistory] = useState<TransferHistoryItem[]>([]);
  const [recentTransferDeviceIds, setRecentTransferDeviceIds] = useState<Set<string>>(new Set());
  const [selectedCardOrigin, setSelectedCardOrigin] = useState<{left: number; top: number; width: number; height: number} | null>(null);
  const [isSelectedCardAtTarget, setIsSelectedCardAtTarget] = useState(true);
  const [isDeselectingPeer, setIsDeselectingPeer] = useState(false);
  const [returningPeerId, setReturningPeerId] = useState<string | null>(null);
  const [pinnedFirstPeerId, setPinnedFirstPeerId] = useState<string | null>(null);
  const [hideReturningGridCard, setHideReturningGridCard] = useState(false);
  const [showSelectedCardClose, setShowSelectedCardClose] = useState(false);
  const [recentTypingText, setRecentTypingText] = useState("");
  const [isRecentCursorVisible, setIsRecentCursorVisible] = useState(true);
  const [shouldRenderTransferQueue, setShouldRenderTransferQueue] = useState(false);
  const [isTransferQueueOpen, setIsTransferQueueOpen] = useState(false);
  const [shouldRenderNativeDevicePanel, setShouldRenderNativeDevicePanel] = useState(false);
  const [isNativeDevicePanelOpen, setIsNativeDevicePanelOpen] = useState(false);
  
  const { t } = useLanguage();
  const { isMobile, isPWA, isStandalone } = usePWAMode();

  const refreshRecentTransferDevices = useCallback(() => {
    const history = getHistory();
    setTransferHistory(history);
    setRecentTransferDeviceIds(new Set(
      history
        .filter((item) => item.direction === 'sent')
        .map((item) => item.deviceId)
    ));
  }, []);

  useEffect(() => {
    refreshRecentTransferDevices();
  }, [refreshRecentTransferDevices]);

  useEffect(() => {
    return () => {
      if (deselectAnimationTimeoutRef.current) {
        clearTimeout(deselectAnimationTimeoutRef.current);
      }
      if (transferQueueCloseTimeoutRef.current) {
        clearTimeout(transferQueueCloseTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    const word = t("device.recentWord");

    if (activeView === 'chat') {
      if (recentTypingText.length === 0) return;

      const timeout = setTimeout(() => {
        setRecentTypingText(word.slice(0, recentTypingText.length - 1));
      }, 40);

      return () => clearTimeout(timeout);
    }

    if (recentTypingText.length === word.length) {
      return;
    }

    const timeout = setTimeout(() => {
      setRecentTypingText(word.slice(0, recentTypingText.length + 1));
    }, 80);

    return () => clearTimeout(timeout);
  }, [activeView, recentTypingText, t]);

  useEffect(() => {
    const interval = setInterval(() => {
      setIsRecentCursorVisible((visible) => !visible);
    }, 530);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const previousView = lastActiveViewRef.current;
    if (previousView === activeView) return;

    setSectionTransitionFrom(previousView);
    lastActiveViewRef.current = activeView;

    const timeout = setTimeout(() => {
      setSectionTransitionFrom(null);
    }, 1000);

    return () => clearTimeout(timeout);
  }, [activeView]);

  // Initialize audio context on first user interaction
  useEffect(() => {
    const handleFirstInteraction = () => {
      initializeAudioContext();
      
      document.removeEventListener('click', handleFirstInteraction);
      document.removeEventListener('keydown', handleFirstInteraction);
    };

    document.addEventListener('click', handleFirstInteraction);
    document.addEventListener('keydown', handleFirstInteraction);

    return () => {
      document.removeEventListener('click', handleFirstInteraction);
      document.removeEventListener('keydown', handleFirstInteraction);
    };
  }, []);
  
  const { 
    peers, 
    deviceInfo, 
    isConnected, 
    sendFile, 
    sendBatchFiles,
    sendMessage,
    messages,
    unreadCounts,
    markMessagesAsRead,
    disconnectedPeers,
    knownPeers,
    incomingFileRequest,
    incomingBatchRequest,
    transferProgress, 
    acceptFile, 
    rejectFile,
    acceptBatchFiles,
    rejectBatchFiles,
    changeDeviceName,
    resendFile
  } = useWebRTC(
    // Callback per gestire file ricevuti
    useCallback((data: ArrayBuffer, fileName: string, relativePath: string, fromSocketId: string) => {
      // Controlla se il file è criptato (estensione .encrypted)
      if (fileName.endsWith('.encrypted')) {
        const originalFileName = relativePath.replace(/\.encrypted$/, '');
        setPendingEncryptedFile({ 
          data, 
          fileName: originalFileName, 
          fromSocketId, 
          originalFileName: fileName // Nome del file criptato originale
        });
        setDecryptAttempts(0); // Reset tentativi per nuovo file
        setDecryptPassword(""); // Reset password
        setShowDecryptDialog(true);
        return false; // Non scaricare automaticamente
      }
      
      // File normale - scarica direttamente
      const blob = new Blob([data]);
      const url = URL.createObjectURL(blob);
      
      const a = document.createElement('a');
      a.href = url;
      a.download = relativePath;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      // Aggiungi alla coda di file ricevuti per processare in seguito
      setReceivedFiles(prev => [...prev, { data, fileName, relativePath, fromSocketId }]);
      
      // Play completion sound
      playNotificationSound('fileComplete');
      
      return true; // File gestito
    }, [])
  );

  // Process received files and save to history
  useEffect(() => {
    if (receivedFiles.length > 0 && peers.length > 0) {
      receivedFiles.forEach(({ data, fileName, relativePath, fromSocketId }) => {
        const fromPeer = peers.find(p => p.socketId === fromSocketId);
        if (fromPeer) {
          const blob = new Blob([data]);
          saveToHistory({
            fileName: fileName,
            fileSize: data.byteLength,
            fileType: blob.type || 'application/octet-stream',
            relativePath: relativePath,
            direction: 'received',
            deviceName: fromPeer.deviceName,
            deviceId: fromPeer.socketId,
            status: 'completed',
            encrypted: fileName.endsWith('.encrypted')
          });
          refreshRecentTransferDevices();
        }
      });
      // Clear processed files
      setReceivedFiles([]);
    }
  }, [receivedFiles, peers, refreshRecentTransferDevices]);

  // Note: Sound and native notifications are now handled directly in useWebRTC hook
  // with action buttons support

  // Play sound for new chat messages
  const prevUnreadCountsRef = useRef<Map<string, number>>(new Map());
  useEffect(() => {
    const prevCounts = prevUnreadCountsRef.current;
    let hasNewMessage = false;
    let latestMessageInfo: { senderName: string; messageText: string; peerId: string } | null = null;
    
    unreadCounts.forEach((count, peerId) => {
      const prevCount = prevCounts.get(peerId) || 0;
      if (count > prevCount) {
        hasNewMessage = true;
        // Get the latest message from this peer
        const peerMessages = messages.get(peerId);
        if (peerMessages && peerMessages.length > 0) {
          const newestMessage = peerMessages[peerMessages.length - 1];
          if (!newestMessage.isOwn && newestMessage.text) {
            latestMessageInfo = {
              senderName: newestMessage.fromName || 'Unknown',
              messageText: newestMessage.text || '',
              peerId: peerId
            };
          }
        }
      }
    });
    
    if (hasNewMessage) {
      playNotificationSound('message');
      if (latestMessageInfo) {
        // Truncate message if too long
        const { messageText, senderName, peerId } = latestMessageInfo as { senderName: string; messageText: string; peerId: string };
        const safeMessageText = messageText || '';
        const messagePreview = safeMessageText.length > 50
          ? safeMessageText.substring(0, 50) + '...'
          : safeMessageText;
        notifyNative(
          `${t("toast.messageFrom")} ${senderName || 'Unknown'}`,
          messagePreview || t("toast.newMessage"),
          peerId
        );
      } else {
        notifyNative(t("toast.newMessage") || 'Nuovo messaggio ricevuto');
      }
    }
    
    // Update previous counts
    prevUnreadCountsRef.current = new Map(unreadCounts);
  }, [unreadCounts, messages, t]);

  // Ref to store current peers for notification handler
  const peersRef = useRef(peers);
  useEffect(() => {
    peersRef.current = peers;
  }, [peers]);

  // Handle notification clicks in Electron - register once at mount
  useEffect(() => {
    if (typeof window !== 'undefined' && window.electronAPI?.onNotificationClick) {
      const handleNotificationClick = (data: { peerId?: string }) => {
        debug('Notification clicked with data:', data);
        
        if (data.peerId) {
          debug('Opening chat and trying to select peer...');
          
          // Always open chat first
          setActiveView('chat');
          
          // Try to find and select the peer using current ref
          setTimeout(() => {
            const currentPeers = peersRef.current;
            const peer = currentPeers.find(p => p.clientId === data.peerId);
            debug('Looking for peer with clientId:', data.peerId);
            debug('Available peers:', currentPeers);
            debug('Found peer:', peer);
            
            if (peer) {
              debug('Setting selected peer to socketId:', peer.socketId);
              setSelectedPeer(peer.socketId);
            } else {
              debug('Peer not found, available clientIds:', currentPeers.map(p => p.clientId));
            }
          }, 100);
        }
      };

      debug('Registering notification click handler');
      window.electronAPI.onNotificationClick(handleNotificationClick);

      return () => {
        debug('Cleaning up notification click handler');
        if (window.electronAPI?.removeNotificationClickListener) {
          window.electronAPI.removeNotificationClickListener();
        }
      };
    }
  }, []); // Empty deps - register once

  // Clear file metadata when files are successfully sent or cleared
  const clearSavedFiles = useCallback(() => {
    const clientId = localStorage.getItem('gavadrop-client-id');
    if (clientId) {
      localStorage.removeItem(`gavadrop-files-${clientId}`);
    }
  }, []);

  const handleDecryptFile = useCallback(async () => {
    if (!pendingEncryptedFile || !decryptPassword.trim()) {
      toast.error("Password richiesta per la decrittografia");
      return;
    }

    try {
      const { decryptedFile, success } = await decryptFile(
        pendingEncryptedFile.data, 
        decryptPassword.trim()
      );

      if (success) {
        const url = URL.createObjectURL(decryptedFile);
        const a = document.createElement('a');
        a.href = url;
        a.download = pendingEncryptedFile.fileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        // Save to history after successful decryption
        const fromPeer = peers.find(p => p.socketId === pendingEncryptedFile.fromSocketId);
        if (fromPeer) {
          saveToHistory({
            fileName: pendingEncryptedFile.fileName,
            fileSize: decryptedFile.size,
            fileType: decryptedFile.type || 'application/octet-stream',
            relativePath: pendingEncryptedFile.fileName,
            direction: 'received',
            deviceName: fromPeer.deviceName,
            deviceId: fromPeer.socketId,
            status: 'completed',
            encrypted: true
          });
          refreshRecentTransferDevices();
        }
        
        toast.success(t("encryption.success"));
        playNotificationSound('success');
        setShowDecryptDialog(false);
        setDecryptPassword("");
        setDecryptAttempts(0);
        setPendingEncryptedFile(null);
      } else {
        const newAttempts = decryptAttempts + 1;
        setDecryptAttempts(newAttempts);
        setDecryptPassword("");
        
        if (newAttempts >= 3) {
          toast.error(t("encryption.tooManyAttempts"));
          playNotificationSound('error');
          setShowDecryptDialog(false);
          setDecryptAttempts(0);
          setPendingEncryptedFile(null);
        } else {
          const remaining = 3 - newAttempts;
          toast.error(`${t("encryption.wrongPassword")} ${remaining} ${remaining === 1 ? t("encryption.wrongPasswordSingular") : t("encryption.wrongPasswordPlural")}.`);
        }
      }
    } catch (error) {
      console.error('Errore nella decrittografia:', error);
      const newAttempts = decryptAttempts + 1;
      setDecryptAttempts(newAttempts);
      setDecryptPassword("");
      
      if (newAttempts >= 3) {
        toast.error(t("encryption.tooManyAttempts"));
        setShowDecryptDialog(false);
        setDecryptAttempts(0);
        setPendingEncryptedFile(null);
      } else {
        const remaining = 3 - newAttempts;
        toast.error(`${t("encryption.error")} ${remaining} ${remaining === 1 ? t("encryption.wrongPasswordSingular") : t("encryption.wrongPasswordPlural")}.`);
      }
    }
  }, [pendingEncryptedFile, decryptPassword, decryptAttempts, peers, refreshRecentTransferDevices, t]);

  const handleFileSend = useCallback(async () => {
    debug('handleFileSend called with:', selectedFiles.length, 'files,', selectedFolders.length, 'folders, selectedPeer:', selectedPeer);
    if (selectedFiles.length === 0 && selectedFolders.length === 0 || !selectedPeer) {
      debug('Early return: no items or no peer selected');
      return;
    }

    setIsSending(true);
    
    try {
      // Comprimi le cartelle in file ZIP
      const compressedFolders = await Promise.all(
        selectedFolders.map(async (folder) => await compressFolder(folder))
      );

      // Combina file singoli e cartelle compresse
      const allFiles = [...selectedFiles, ...compressedFolders];

      // Cripta i file se necessario
      const filesToSend = await Promise.all(
        allFiles.map(async (file) => {
          if (isEncryptionEnabled) {
            const { encryptedFile } = await encryptFile(file, encryptionPassword || undefined);
            return encryptedFile;
          }
          return file;
        })
      );

      // Get target device name for history
      const targetDevice = peers.find(p => p.socketId === selectedPeer);
      const deviceName = targetDevice?.deviceName || t("file.unknownDevice");

      if (filesToSend.length === 1) {
        // Single item - use normal send
        await sendFile(filesToSend[0], selectedPeer);
        
        // Save to history with file data for resend
        await saveFileToHistory(allFiles[0], {
          fileName: allFiles[0].name,
          fileSize: allFiles[0].size,
          fileType: allFiles[0].type || 'application/octet-stream',
          relativePath: (allFiles[0] as File & { webkitRelativePath?: string }).webkitRelativePath || allFiles[0].name,
          direction: 'sent',
          deviceName,
          deviceId: selectedPeer,
          status: 'completed',
          encrypted: isEncryptionEnabled
        });
        
        toast.success(`${allFiles[0].name} ${t("toast.sentSuccess")} ${isEncryptionEnabled ? `(${t("file.encrypted")})` : ''}`);
        playNotificationSound('success');
      } else {
        // Multiple items - use batch send
        await sendBatchFiles(filesToSend, selectedPeer);
        
        // Save each item to history with batch ID
        const batchId = `batch-${Date.now()}`;
        await Promise.all(
          allFiles.map(async (file) => {
            // For batch files, save file data only for small files to avoid storage overflow
            if (file.size <= 1024 * 1024) { // 1MB limit for batch files
              await saveFileToHistory(file, {
                fileName: file.name,
                fileSize: file.size,
                fileType: file.type || 'application/octet-stream',
                relativePath: (file as File & { webkitRelativePath?: string }).webkitRelativePath || file.name,
                direction: 'sent',
                deviceName,
                deviceId: selectedPeer,
                status: 'completed',
                encrypted: isEncryptionEnabled,
                batchId
              });
            } else {
              // Large files in batch - save without file data
              saveToHistory({
                fileName: file.name,
                fileSize: file.size,
                fileType: file.type || 'application/octet-stream',
                relativePath: (file as File & { webkitRelativePath?: string }).webkitRelativePath || file.name,
                direction: 'sent',
                deviceName,
                deviceId: selectedPeer,
                status: 'completed',
                encrypted: isEncryptionEnabled,
                batchId
              });
            }
          })
        );
        
        toast.success(`${filesToSend.length} ${filesToSend.length === 1 ? t("file.element") : t("file.elements")} ${t("toast.sentSuccessMultiple")} ${isEncryptionEnabled ? `(${t("file.encrypted.plural")})` : ''}`);
        playNotificationSound('success');
      }
      
      // Clear selected items only after successful sending
      refreshRecentTransferDevices();
      setSelectedFiles([]);
      setSelectedFolders([]);
      clearSavedFiles();
    } catch (error: unknown) {
      const message = (error as Error).message;
      const isExpectedSendError = [
        'Batch file transfer rejected',
        'Batch file request timeout',
        'File transfer rejected',
        'File request timeout'
      ].includes(message);

      if (message === 'Batch file transfer rejected') {
        toast.error(t("toast.rejected"));
      } else if (message === 'Batch file request timeout') {
        toast.error(t("toast.timeout"));
      } else if (message === 'File transfer rejected') {
        toast.error(t("toast.fileRejected"));
      } else if (message === 'File request timeout') {
        toast.error(t("toast.fileTimeout"));
      } else {
        toast.error(t("toast.sendError"));
      }
      playNotificationSound('error');
      if (!isExpectedSendError) {
        console.error('Send error:', error);
      }
      
      // Clear items even on error to reset the UI
      setSelectedFiles([]);
      setSelectedFolders([]);
    } finally {
      setIsSending(false);
    }
  }, [selectedFiles, selectedFolders, selectedPeer, sendFile, sendBatchFiles, clearSavedFiles, t, isEncryptionEnabled, encryptionPassword, peers, refreshRecentTransferDevices]);

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
    
    // Raggruppa i file per cartelle
    const { folders, singleFiles } = groupFilesByFolder(droppedFiles);
    
    setSelectedFiles(prev => [...prev, ...singleFiles]);
    setSelectedFolders(prev => [...prev, ...folders]);
    
    const message = folders.length > 0 
      ? `${folders.length} ${folders.length === 1 ? t("message.folderAdded") : t("message.foldersAdded")} ${t("message.and")} ${singleFiles.length} ${t("message.filesAdded")}`
      : `${singleFiles.length} ${t("message.filesAdded")}`;
    
    toast.success(message);
  }, [selectedPeer, t]);

  const handleFileSelect = useCallback(() => {
    if (!selectedPeer) {
      toast.error(t("toast.selectDeviceFirst"));
      return;
    }
    isSelectingFolderRef.current = false;
    fileInputRef.current?.click();
  }, [selectedPeer, t]);

  const handleFolderSelect = useCallback(() => {
    if (!selectedPeer) {
      toast.error(t("toast.selectDeviceFirst"));
      return;
    }
    isSelectingFolderRef.current = true;
    
    folderInputRef.current?.click();
    
    // Reset state after a delay in case user cancels dialog
    setTimeout(() => {
      isSelectingFolderRef.current = false;
    }, 500);
  }, [selectedPeer, t]);

  const handleFileInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const newFiles = Array.from(e.target.files || []);
    
    // Raggruppa i file per cartelle
    const { folders, singleFiles } = groupFilesByFolder(newFiles);
    
    setSelectedFiles(prev => [...prev, ...singleFiles]);
    setSelectedFolders(prev => [...prev, ...folders]);
    
    const message = folders.length > 0 
      ? `${folders.length} ${folders.length === 1 ? t("message.folderAdded") : t("message.foldersAdded")} ${t("message.and")} ${singleFiles.length} ${t("message.filesAdded")}`
      : `${singleFiles.length} ${t("message.filesAdded")}`;
    
    toast.success(message);
    
    // Reset file inputs
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    if (folderInputRef.current) {
      folderInputRef.current.value = '';
    }
    // Reset folder selection state
    isSelectingFolderRef.current = false;
  }, [t]);

  const removeFile = useCallback((index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  }, []);

  const removeFolder = useCallback((index: number) => {
    setSelectedFolders(prev => prev.filter((_, i) => i !== index));
  }, []);

  const clearAllFiles = useCallback(() => {
    setSelectedFiles([]);
    setSelectedFolders([]);
    clearSavedFiles();
  }, [clearSavedFiles]);

  const handleStartEditName = useCallback(() => {
    setIsEditingName(true);
    setNewDeviceName(deviceInfo?.deviceName || '');
  }, [deviceInfo?.deviceName]);

  const handleSaveDeviceName = useCallback(() => {
    if (newDeviceName.trim() && newDeviceName.trim() !== deviceInfo?.deviceName) {
      changeDeviceName(newDeviceName.trim());
      toast.success(t("toast.nameUpdated"));
    }
    setIsEditingName(false);
  }, [newDeviceName, deviceInfo?.deviceName, changeDeviceName, t]);

  const handleCancelEditName = useCallback(() => {
    setIsEditingName(false);
    setNewDeviceName('');
  }, []);

  const getDeviceIcon = (deviceName: string) => {
    if (deviceName.toLowerCase().includes('phone') || deviceName.toLowerCase().includes('mobile')) {
      return DeviceMobileIcon;
    }
    if (deviceName.toLowerCase().includes('tablet') || deviceName.toLowerCase().includes('ipad')) {
      return DeviceTabletIcon;
    }
    return MonitorIcon;
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Load UI state on component mount
  useEffect(() => {
    const clientId = localStorage.getItem('gavadrop-client-id');
    if (clientId) {
      // Load chat input text
      const savedInputMessage = localStorage.getItem(`gavadrop-input-${clientId}`);
      if (savedInputMessage) {
        setInputMessage(savedInputMessage);
      }

      // Load last selected client ID
      const savedLastSelectedClientId = localStorage.getItem(`gavadrop-last-selected-${clientId}`);
      if (savedLastSelectedClientId) {
        setLastSelectedClientId(savedLastSelectedClientId);
      }

      // Load chat open state
      const savedChatOpen = localStorage.getItem(`gavadrop-chat-open-${clientId}`);
      if (savedChatOpen === 'true') {
        setIsChatOpen(true);
      }

      // Check for saved file metadata
      const savedFiles = localStorage.getItem(`gavadrop-files-${clientId}`);
      if (savedFiles) {
        try {
          const fileData = JSON.parse(savedFiles);
          if (fileData.files && fileData.files.length > 0) {
            // Show message about files that need to be reselected
            setTimeout(() => {
              toast.info(`${t("toast.filesWereSelected")} ${fileData.files.length} file${fileData.files.length !== 1 ? 's' : ''}. ${t("toast.pleaseReselectFiles")}`);
            }, 1500);
            // Clean up the saved file metadata since we can't restore actual files
            localStorage.removeItem(`gavadrop-files-${clientId}`);
          }
        } catch (error) {
          console.error('Error parsing saved files:', error);
          localStorage.removeItem(`gavadrop-files-${clientId}`);
        }
      }

    }
    setIsStateLoaded(true);
  }, [t]);

  // Save input message when it changes
  useEffect(() => {
    if (!isStateLoaded) return;
    const clientId = localStorage.getItem('gavadrop-client-id');
    if (clientId) {
      if (inputMessage.trim()) {
        localStorage.setItem(`gavadrop-input-${clientId}`, inputMessage);
      } else {
        localStorage.removeItem(`gavadrop-input-${clientId}`);
      }
    }
  }, [inputMessage, isStateLoaded]);

  // Save last selected client ID when it changes
  useEffect(() => {
    if (!isStateLoaded) return;
    const clientId = localStorage.getItem('gavadrop-client-id');
    if (clientId) {
      if (lastSelectedClientId) {
        localStorage.setItem(`gavadrop-last-selected-${clientId}`, lastSelectedClientId);
      } else {
        localStorage.removeItem(`gavadrop-last-selected-${clientId}`);
      }
    }
  }, [lastSelectedClientId, isStateLoaded]);

  // Save chat open state when it changes
  useEffect(() => {
    if (!isStateLoaded) return;
    const clientId = localStorage.getItem('gavadrop-client-id');
    if (clientId) {
      if (isChatOpen) {
        localStorage.setItem(`gavadrop-chat-open-${clientId}`, 'true');
      } else {
        localStorage.removeItem(`gavadrop-chat-open-${clientId}`);
      }
    }
  }, [isChatOpen, isStateLoaded]);

  // Save selected files metadata (not the actual files, just the list info)
  useEffect(() => {
    if (!isStateLoaded) return;
    const clientId = localStorage.getItem('gavadrop-client-id');
    if (clientId) {
      if (selectedFiles.length > 0 && selectedPeer) {
        // Save file metadata along with selected peer
        const fileMetadata = selectedFiles.map(file => ({
          name: file.name,
          size: file.size,
          type: file.type,
          lastModified: file.lastModified
        }));
        localStorage.setItem(`gavadrop-files-${clientId}`, JSON.stringify({
          files: fileMetadata,
          selectedPeer: selectedPeer
        }));
      } else {
        localStorage.removeItem(`gavadrop-files-${clientId}`);
      }
    }
  }, [selectedFiles, selectedPeer, isStateLoaded]);

  // Handle device disconnection and reconnection
  useEffect(() => {
    if (lastSelectedClientId && isStateLoaded) {
      // Look for a peer that matches the last selected clientId (for auto-reselection after page refresh)
      const matchingPeer = peers.find(p => p.clientId === lastSelectedClientId);
      
      if (matchingPeer) {
        // Check if we need to update the selected peer to the new socketId
        if (!selectedPeer || selectedPeer !== matchingPeer.socketId) {
          debug('Auto-reselecting peer after page refresh or reconnection:', matchingPeer);
          setSelectedPeer(matchingPeer.socketId);
        }
      } else if (selectedPeer) {
        // Selected peer is not in active peers, check if it's still disconnected
        const isCurrentlyDisconnected = Array.from(disconnectedPeers.values()).some(dp => dp.peer.socketId === selectedPeer);
        if (!isCurrentlyDisconnected) {
          // Peer is no longer anywhere, clear selection
          debug('Selected peer is no longer available, clearing selection');
          setSelectedPeer(null);
          setLastSelectedClientId(null);
        }
      }
    }
  }, [peers, lastSelectedClientId, selectedPeer, disconnectedPeers, isStateLoaded]);

  // Only close chat when grace period truly expires (but don't interfere with auto-reselection)
  useEffect(() => {
    if (selectedPeer && lastSelectedClientId) {
      const isInActivePeers = peers.some(p => p.socketId === selectedPeer);
      
      if (!isInActivePeers) {
        // Peer is not in active peers anymore
        const isInGracePeriod = Array.from(disconnectedPeers.values()).some(dp => dp.peer.socketId === selectedPeer);
        
        // Check if the peer reconnected with the same clientId (different socketId)
        const hasReconnectedPeer = peers.some(p => p.clientId === lastSelectedClientId);
        
        if (!isInGracePeriod && !hasReconnectedPeer) {
          // Peer is not in grace period and hasn't reconnected - grace period expired
          debug('Selected peer grace period expired, closing chat and clearing selection');
          setSelectedPeer(null);
          setIsChatOpen(false);
          setLastSelectedClientId(null);
        } else if (hasReconnectedPeer) {
          debug('Selected peer has reconnected, auto-reselection should handle this');
        } else {
          debug('Selected peer is in grace period, keeping chat open');
        }
      }
    }
  }, [selectedPeer, peers, disconnectedPeers, lastSelectedClientId]);

  // Handle progress completion animation
  useEffect(() => {
    if (transferProgress && transferProgress.progress >= 100) {
      // Start hide animation after a short delay to show completion
      const timer = setTimeout(() => {
        setIsProgressHiding(true);
        
        // Hide the progress completely after animation completes
        setTimeout(() => {
          // This will be handled by the useWebRTC hook clearing transferProgress
        }, 1000); // Animation duration
      }, 1000);
      
      return () => clearTimeout(timer);
    } else {
      setIsProgressHiding(false);
    }
  }, [transferProgress]);

  // Check if selected peer is temporarily disconnected
  const selectedPeerData = peers.find(p => p.socketId === selectedPeer);
  const selectedPeerDisconnected = selectedPeer && !selectedPeerData ?
    Array.from(disconnectedPeers.values()).find(dp => dp.peer.socketId === selectedPeer) : null;
  const selectedOfflinePeer = selectedOfflineClientId ? knownPeers.get(selectedOfflineClientId) ?? null : null;
  const selectedDisplayPeer = selectedPeerData || selectedPeerDisconnected?.peer || selectedOfflinePeer || null;
  const SelectedDisplayIcon = selectedDisplayPeer ? getDeviceIcon(selectedDisplayPeer.deviceName) : MonitorIcon;
  const isSelectedPeerTemporarilyDisconnected = !!selectedPeerDisconnected;
  const totalUnreadCount = Array.from(unreadCounts.values()).reduce((total, count) => total + count, 0);

  useEffect(() => {
    if (activeView !== 'chat' || !selectedDisplayPeer) return;
    if (!unreadCounts.has(selectedDisplayPeer.clientId)) return;

    markMessagesAsRead(selectedDisplayPeer.clientId);
  }, [activeView, selectedDisplayPeer, unreadCounts, markMessagesAsRead]);

  const hasPeerActivity = useCallback((peer: { socketId: string; clientId: string }) => {
    return (messages.get(peer.clientId)?.some((message) => message.isOwn) || false) || recentTransferDeviceIds.has(peer.socketId);
  }, [messages, recentTransferDeviceIds]);
  const getLatestChatTimestamp = useCallback((peer: Peer) => {
    const peerMessages = messages.get(peer.clientId) || [];
    return peerMessages.reduce((latest, message) => Math.max(latest, message.timestamp || 0), 0);
  }, [messages]);
  const sortByActiveChat = useCallback((peerList: Peer[]) => {
    return [...peerList].sort((a, b) => {
      const aLatest = getLatestChatTimestamp(a);
      const bLatest = getLatestChatTimestamp(b);

      if (!!bLatest !== !!aLatest) {
        return bLatest ? 1 : -1;
      }

      return bLatest - aLatest;
    });
  }, [getLatestChatTimestamp]);
  const sortDisconnectedByActiveChat = useCallback((peerList: Array<{ peer: Peer; disconnectedAt: number }>) => {
    return [...peerList].sort((a, b) => {
      const aLatest = getLatestChatTimestamp(a.peer);
      const bLatest = getLatestChatTimestamp(b.peer);

      if (!!bLatest !== !!aLatest) {
        return bLatest ? 1 : -1;
      }

      return bLatest - aLatest || b.disconnectedAt - a.disconnectedAt;
    });
  }, [getLatestChatTimestamp]);
  const recentOnlinePeers = peers.filter((peer) => hasPeerActivity(peer));
  const recentDisconnectedPeers = Array.from(disconnectedPeers.values()).filter(({ peer }) => hasPeerActivity(peer));
  const hasRecentDevices = recentOnlinePeers.length > 0 || recentDisconnectedPeers.length > 0;
  const viewBg: Record<'home' | 'history' | 'chat', string> = {
    home: '#11120f',
    chat: '#080907',
    history: '#0c0a13',
  };
  const activeSectionBg = activeView === 'home' && isDragOver && selectedPeer
    ? '#211733'
    : viewBg[activeView];
  const sectionAnimStyle = {
    '--section-from': viewBg[prevActiveView.current],
    '--section-to': activeSectionBg,
    '--section-overlay-from': viewBg[sectionTransitionFrom ?? activeView],
    backgroundColor: activeSectionBg,
  } as React.CSSProperties;

  const shouldShowNativeDevicePanel = activeView !== 'history' && (
    activeView === 'chat' || hasRecentDevices ||
    Array.from(knownPeers.values()).some(p =>
      !peers.some(op => op.clientId === p.clientId) &&
      !disconnectedPeers.has(p.clientId) &&
      ((messages.get(p.clientId)?.length ?? 0) > 0 || transferHistory.some(item => item.deviceName === p.deviceName))
    )
  );
  const nativePanelOnlinePeers = activeView === 'chat' ? sortByActiveChat(peers) : recentOnlinePeers;
  const nativePanelOfflinePeers = activeView === 'chat'
    ? sortDisconnectedByActiveChat(Array.from(disconnectedPeers.values()))
    : recentDisconnectedPeers;
  // Peers we've interacted with (chat or file) that are now fully offline (not in grace period)
  const historicalOfflinePeers: Peer[] = Array.from(knownPeers.values()).filter(p =>
    !peers.some(op => op.clientId === p.clientId) &&
    !disconnectedPeers.has(p.clientId) &&
    (
      (messages.get(p.clientId)?.length ?? 0) > 0 ||
      transferHistory.some(item => item.deviceName === p.deviceName)
    )
  );
  const centralDesktopPeers = hasRecentDevices
    ? peers.filter((peer) => !hasPeerActivity(peer))
    : peers;
  const filteredDesktopPeers = centralDesktopPeers.filter((peer) =>
    peer.deviceName.toLowerCase().includes(desktopDeviceSearch.toLowerCase())
  );
  const firstDesktopPeerId = returningPeerId || pinnedFirstPeerId;
  const orderedDesktopPeers = firstDesktopPeerId
    ? [
        ...filteredDesktopPeers.filter((peer) => peer.socketId === firstDesktopPeerId),
        ...filteredDesktopPeers.filter((peer) => peer.socketId !== firstDesktopPeerId),
      ]
    : filteredDesktopPeers;
  const selectedCardTarget = { left: 24, top: 24, width: 260, height: 96 };
  const queuedItemCount = selectedFiles.length + selectedFolders.length;
  const hasQueuedItems = queuedItemCount > 0;
  const selectedPreviewFile = selectedFileIndex !== null ? selectedFiles[selectedFileIndex] : null;

  useEffect(() => {
    if (nativeDevicePanelCloseTimeoutRef.current) {
      clearTimeout(nativeDevicePanelCloseTimeoutRef.current);
      nativeDevicePanelCloseTimeoutRef.current = null;
    }

    if (!shouldShowNativeDevicePanel) {
      setIsNativeDevicePanelOpen(false);
      nativeDevicePanelCloseTimeoutRef.current = setTimeout(() => {
        setShouldRenderNativeDevicePanel(false);
      }, 520);
      return;
    }

    setShouldRenderNativeDevicePanel(true);
    setIsNativeDevicePanelOpen(false);

    let firstFrame = 0;
    let secondFrame = 0;

    firstFrame = requestAnimationFrame(() => {
      secondFrame = requestAnimationFrame(() => {
        setIsNativeDevicePanelOpen(true);
      });
    });

    return () => {
      cancelAnimationFrame(firstFrame);
      cancelAnimationFrame(secondFrame);
    };
  }, [shouldShowNativeDevicePanel]);

  useEffect(() => {
    if (transferQueueCloseTimeoutRef.current) {
      clearTimeout(transferQueueCloseTimeoutRef.current);
      transferQueueCloseTimeoutRef.current = null;
    }

    if (!hasQueuedItems) {
      setIsTransferQueueOpen(false);
      transferQueueCloseTimeoutRef.current = setTimeout(() => {
        setShouldRenderTransferQueue(false);
      }, 1000);
      return;
    }

    setShouldRenderTransferQueue(true);
    setIsTransferQueueOpen(false);

    let firstFrame = 0;
    let secondFrame = 0;

    firstFrame = requestAnimationFrame(() => {
      secondFrame = requestAnimationFrame(() => {
        setIsTransferQueueOpen(true);
      });
    });

    return () => {
      cancelAnimationFrame(firstFrame);
      cancelAnimationFrame(secondFrame);
    };
  }, [hasQueuedItems]);

  const getPeerTransferEvents = useCallback((peer: Peer) => {
    return transferHistory
      .filter((item) => item.deviceId === peer.socketId || item.deviceName === peer.deviceName)
      .map((item) => ({
        id: `file-${item.id}`,
        type: 'file' as const,
        timestamp: item.timestamp,
        item
      }));
  }, [transferHistory]);
  const getPeerChatTimeline = useCallback((peer: Peer) => {
    const peerMessages = (messages.get(peer.clientId) || []).map((message) => ({
      id: `message-${message.id}`,
      type: 'message' as const,
      timestamp: message.timestamp,
      message
    }));

    return [...peerMessages, ...getPeerTransferEvents(peer)]
      .sort((a, b) => a.timestamp - b.timestamp);
  }, [getPeerTransferEvents, messages]);
  const formatChatTimestamp = useCallback((timestamp: number) => {
    if (!timestamp || isNaN(Number(timestamp))) {
      return new Date().toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
    }

    const normalizedTimestamp = timestamp > 9999999999 ? timestamp : timestamp * 1000;
    const date = new Date(normalizedTimestamp);

    return isNaN(date.getTime())
      ? new Date().toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })
      : date.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
  }, []);
  const formatChatDateLabel = useCallback((timestamp: number) => {
    const date = new Date(timestamp > 9999999999 ? timestamp : timestamp * 1000);
    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(today.getDate() - 1);

    if (date.toDateString() === today.toDateString()) return t("history.today");
    if (date.toDateString() === yesterday.toDateString()) return t("history.yesterday");

    return date.toLocaleDateString('it-IT', {
      day: '2-digit',
      month: 'short',
      year: date.getFullYear() === today.getFullYear() ? undefined : 'numeric'
    });
  }, [t]);
  const getPeerLastActivity = useCallback((peer: Peer) => {
    const timeline = getPeerChatTimeline(peer);
    const latest = timeline[timeline.length - 1];

    if (!latest) return t("activity.none");

    const time = formatChatTimestamp(latest.timestamp);

    if (latest.type === 'message') {
      return latest.message.isOwn ? `${t("activity.messageSent")} ${time}` : `${t("activity.messageReceived")} ${time}`;
    }

    return latest.item.direction === 'sent' ? `${t("activity.fileSent")} ${time}` : `${t("activity.fileReceived")} ${time}`;
  }, [formatChatTimestamp, getPeerChatTimeline, t]);
  const renderRecentPeoplePanel = (
    onlinePeers: Peer[],
    offlinePeers: Array<{ peer: Peer; disconnectedAt: number }>,
    historicalPeers: Peer[] = [],
    title = t("device.onlineDevices"),
    animateRecentWord = false
  ) => {
    const recentWord = t("device.recentWord");
    const isTypingRecentWord = activeView === 'chat'
      ? recentTypingText.length > 0
      : animateRecentWord && recentTypingText.length < recentWord.length;

    return (
    <div className="flex-1 overflow-y-auto custom-scrollbar min-h-0">
      <div className="mb-4">
        <h3 className="text-3xl font-bold tracking-[-0.02em] text-white">
          {animateRecentWord || recentTypingText.length > 0 ? (
            <>
              Dispositivi <span className="text-white">{recentTypingText}</span>
              <span
                className="text-white transition-opacity duration-100"
                style={{ opacity: isTypingRecentWord && isRecentCursorVisible ? 1 : 0 }}
              >
                |
              </span>{" "}
              online
            </>
          ) : (
            title
          )}
        </h3>
      </div>

      <div className="space-y-3">
        {onlinePeers.length === 0 && offlinePeers.length === 0 && historicalPeers.length === 0 ? (
          <div className="text-center py-12">
            <WifiHighIcon className="h-12 w-12 mx-auto mb-4 text-white/20" />
            <p className="text-white/55 text-sm mb-2">
              {t("device.noDevicesFound")}
            </p>
            <p className="text-xs text-white/35">
              {t("device.openGavaDrop")}
            </p>
          </div>
        ) : (
          <>
            {onlinePeers.map((peer) => {
              const DeviceIcon = getDeviceIcon(peer.deviceName);
              const isSelected = selectedPeer === peer.socketId;
              const unreadCount = unreadCounts.get(peer.clientId) || 0;

              return (
                <div key={peer.socketId}>
                  <div
                    className={`relative flex items-center gap-3 rounded-xl px-3 py-3.5 cursor-pointer transition-all ${
                      isSelected
                        ? "bg-[#1f211d] border border-[#c9a6ff]"
                        : "bg-[#171916] hover:bg-[#1f211d] border border-transparent"
                    }`}
                    onClick={() => {
                      const newSelection = isSelected ? null : peer.socketId;
                      debug('Selecting peer:', newSelection);
                      setSelectedPeer(newSelection);
                      setLastSelectedClientId(newSelection ? peer.clientId : null);
                      setSelectedOfflineClientId(null);

                      if (newSelection && unreadCounts.get(peer.clientId) && unreadCounts.get(peer.clientId)! > 0) {
                        setActiveView('chat');
                        markMessagesAsRead(newSelection);
                      } else if (newSelection && isChatOpen && unreadCounts.get(peer.clientId)) {
                        markMessagesAsRead(newSelection);
                      }
                    }}
                  >
                    <div className={`grid h-11 w-11 shrink-0 place-items-center rounded-full ${
                      isSelected ? 'bg-[#c9a6ff]' : 'bg-[#f3ead2]'
                    }`}>
                      <DeviceIcon className={`h-4 w-4 ${
                        isSelected ? 'text-black' : 'text-black/70'
                      }`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className={`font-semibold text-sm truncate ${
                          isSelected ? 'text-[#e2ccff]' : 'text-white'
                        }`}>
                          {peer.deviceName}
                        </p>
                      </div>
                      <p className={`text-xs truncate ${isSelected ? 'text-[#c9a6ff]/80' : 'text-white/45'}`}>
                        {isSelected ? t("device.selected") : getPeerLastActivity(peer)}
                      </p>
                    </div>
                    {unreadCount > 0 && (
                      <span className="absolute right-3 top-3 grid h-5 min-w-5 place-items-center rounded-full bg-red-500 px-1.5 text-xs font-semibold text-white ring-2 ring-[#171916]">
                        {unreadCount > 9 ? '9+' : unreadCount}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}

            {(offlinePeers.length > 0 || historicalPeers.length > 0) && (
              <div className="pt-5">
                <h3 className="text-3xl font-bold tracking-[-0.02em] text-white">
                  {t("device.recentOfflineDevices")}
                </h3>
              </div>
            )}
            {offlinePeers.map(({ peer }, index) => {
              const DeviceIcon = getDeviceIcon(peer.deviceName);
              const isSelected = selectedPeer === peer.socketId;
              const unreadCount = unreadCounts.get(peer.clientId) || 0;

              return (
                <div key={`disconnected-${peer.socketId}`}>
                  <div
                    className={`relative flex items-center gap-3 rounded-xl px-3 py-3.5 cursor-pointer transition-all ${
                      isSelected
                        ? "bg-[#23231f] border border-[#c9a6ff]"
                        : "bg-[#171916] hover:bg-[#1f211d] border border-transparent"
                    }`}
                    onClick={() => {
                      // Don't allow selection of disconnected devices.
                    }}
                  >
                    <div className={`grid h-11 w-11 shrink-0 place-items-center rounded-full ${
                      isSelected ? 'bg-[#c9a6ff]' : 'bg-[#f3ead2]'
                    }`}>
                      <DeviceIcon className={`h-4 w-4 ${
                        isSelected ? 'text-black' : 'text-black/70'
                      }`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className={`font-semibold text-sm truncate ${
                          isSelected ? 'text-[#e2ccff]' : 'text-white'
                        }`}>
                          {peer.deviceName}
                        </p>
                      </div>
                      <p className="text-xs text-white/45">
                        {isSelected ? t("device.reconnectionInProgress") : getPeerLastActivity(peer)}
                      </p>
                    </div>
                    <span className={`absolute right-3 top-2 rounded-full px-1.5 py-0.5 text-[10px] font-bold text-black ${
                      index % 2 === 0 ? "bg-[#f2d45d]" : "bg-[#c9a6ff]"
                    }`}>
                      00:{17 + index * 12}
                    </span>
                    {unreadCount > 0 && (
                      <span className="absolute right-3 top-8 grid h-5 min-w-5 place-items-center rounded-full bg-red-500 px-1.5 text-xs font-semibold text-white ring-2 ring-[#171916]">
                        {unreadCount > 9 ? '9+' : unreadCount}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}

            {historicalPeers.length > 0 && (
              <>
                {historicalPeers.map((peer) => {
                  const DeviceIcon = getDeviceIcon(peer.deviceName);
                  const isSelected = selectedOfflineClientId === peer.clientId;
                  const unreadCount = unreadCounts.get(peer.clientId) || 0;

                  return (
                    <div key={`historical-${peer.clientId}`}>
                      <div
                        className={`relative flex items-center gap-3 rounded-xl px-3 py-3.5 cursor-pointer transition-all ${
                          isSelected
                            ? "bg-[#1f211d] border border-[#c9a6ff]"
                            : "bg-[#171916] hover:bg-[#1f211d] border border-transparent"
                        }`}
                        onClick={() => {
                          setSelectedPeer(null);
                          setLastSelectedClientId(null);
                          setSelectedOfflineClientId(isSelected ? null : peer.clientId);
                          setActiveView('chat');
                          markMessagesAsRead(peer.clientId);
                        }}
                      >
                        <div className={`grid h-11 w-11 shrink-0 place-items-center rounded-full opacity-50 ${
                          isSelected ? 'bg-[#c9a6ff]' : 'bg-[#f3ead2]'
                        }`}>
                          <DeviceIcon className={`h-4 w-4 ${
                            isSelected ? 'text-black' : 'text-black/70'
                          }`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className={`font-semibold text-sm truncate ${
                              isSelected ? 'text-[#e2ccff]' : 'text-white/60'
                            }`}>
                              {peer.deviceName}
                            </p>
                          </div>
                          <p className="text-xs text-white/35">
                            {isSelected ? t("chat.viewOnly") : getPeerLastActivity(peer)}
                          </p>
                        </div>
                        {unreadCount > 0 && (
                          <span className="absolute right-3 top-3 grid h-5 min-w-5 place-items-center rounded-full bg-red-500 px-1.5 text-xs font-semibold text-white ring-2 ring-[#171916]">
                            {unreadCount > 9 ? '9+' : unreadCount}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
  };

  const handleDeselectPeer = useCallback(() => {
    setSelectedFiles([]);
    setSelectedFolders([]);
    setSelectedFileIndex(null);
    clearSavedFiles();

    if (selectedCardOrigin) {
      setIsDeselectingPeer(true);
      setReturningPeerId(selectedPeer);
      setPinnedFirstPeerId(selectedPeer);
      setShowSelectedCardClose(false);
      setHideReturningGridCard(true);
      if (deselectAnimationTimeoutRef.current) {
        clearTimeout(deselectAnimationTimeoutRef.current);
      }
      setSelectedCardOrigin({ left: 24, top: 144, width: 260, height: 96 });
      requestAnimationFrame(() => {
        requestAnimationFrame(() => setIsSelectedCardAtTarget(false));
      });
      deselectAnimationTimeoutRef.current = setTimeout(() => {
        setHideReturningGridCard(false);
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            setSelectedPeer(null);
            setLastSelectedClientId(null);
            setSelectedCardOrigin(null);
            setIsSelectedCardAtTarget(true);
            setIsDeselectingPeer(false);
            setReturningPeerId(null);
            setHideReturningGridCard(false);
            deselectAnimationTimeoutRef.current = null;
          });
        });
      }, 560);
      return;
    }
    setSelectedPeer(null);
    setLastSelectedClientId(null);
    setIsSelectedCardAtTarget(true);
    setIsDeselectingPeer(false);
    setReturningPeerId(null);
    setHideReturningGridCard(false);
    setShowSelectedCardClose(false);
  }, [clearSavedFiles, selectedCardOrigin, selectedPeer]);

  // Helper functions for mobile file handling
  const handleMobileFilesSelect = useCallback((files: File[]) => {
    const { folders, singleFiles } = groupFilesByFolder(files);
    setSelectedFiles(prev => [...prev, ...singleFiles]);
    setSelectedFolders(prev => [...prev, ...folders]);
    
    const message = folders.length > 0 
      ? `${folders.length} ${folders.length === 1 ? t("message.folderAdded") : t("message.foldersAdded")} ${t("message.and")} ${singleFiles.length} ${t("message.filesAdded")}`
      : `${singleFiles.length} ${t("message.filesAdded")}`;
    
    toast.success(message);
  }, [t]);

  const handleMobileFolderSelect = useCallback(() => {
    if (!selectedPeer) {
      toast.error(t("toast.selectDeviceFirst"));
      return;
    }
    isSelectingFolderRef.current = true;
    folderInputRef.current?.click();
    
    setTimeout(() => {
      isSelectingFolderRef.current = false;
    }, 500);
  }, [selectedPeer, t]);

  // Mobile/PWA Layout
  if (isMobile || isPWA) {
    return (
      <div className="h-screen flex flex-col ios-app-container bg-background">
        {/* Modern Mobile App usando le funzioni desktop esatte */}
        <ModernMobileApp
          selectedFiles={selectedFiles}
          selectedFolders={selectedFolders}
          isSending={isSending}
          selectedPeer={selectedPeer}
          lastSelectedClientId={lastSelectedClientId}
          inputMessage={inputMessage}
          isEncryptionEnabled={isEncryptionEnabled}
          encryptionPassword={encryptionPassword}
          isEditingName={isEditingName}
          newDeviceName={newDeviceName}
          showDecryptDialog={showDecryptDialog}
          decryptPassword={decryptPassword}
          decryptAttempts={decryptAttempts}
          pendingEncryptedFile={pendingEncryptedFile}
          receivedFiles={receivedFiles}
          fileInputRef={fileInputRef}
          folderInputRef={folderInputRef}
          isSelectingFolderRef={isSelectingFolderRef}
          peers={peers}
          deviceInfo={deviceInfo}
          isConnected={isConnected}
          sendFile={sendFile}
          sendBatchFiles={sendBatchFiles}
          sendMessage={sendMessage}
          messages={messages}
          unreadCounts={unreadCounts}
          markMessagesAsRead={markMessagesAsRead}
          disconnectedPeers={disconnectedPeers}
          incomingFileRequest={incomingFileRequest}
          incomingBatchRequest={incomingBatchRequest}
          transferProgress={transferProgress}
          acceptFile={acceptFile}
          rejectFile={rejectFile}
          acceptBatchFiles={acceptBatchFiles}
          rejectBatchFiles={rejectBatchFiles}
          changeDeviceName={changeDeviceName}
          resendFile={resendFile}
          handleFilesSelect={handleMobileFilesSelect}
          handleFolderSelect={handleMobileFolderSelect}
          handleFileSend={handleFileSend}
          removeFile={removeFile}
          removeFolder={removeFolder}
          clearAllFiles={clearAllFiles}
          handleStartEditName={handleStartEditName}
          handleSaveDeviceName={handleSaveDeviceName}
          handleCancelEditName={handleCancelEditName}
          handleDecryptFile={handleDecryptFile}
          setSelectedPeer={setSelectedPeer}
          setInputMessage={setInputMessage}
          setDecryptPassword={setDecryptPassword}
          setShowDecryptDialog={setShowDecryptDialog}
          setDecryptAttempts={setDecryptAttempts}
          setPendingEncryptedFile={setPendingEncryptedFile}
          setNewDeviceName={setNewDeviceName}
          setLastSelectedClientId={setLastSelectedClientId}
          setIsEncryptionEnabled={setIsEncryptionEnabled}
          setEncryptionPassword={setEncryptionPassword}
        />

        {/* PWA Install Prompt */}
        {!isStandalone && <PWAInstallPrompt />}

        {/* Hidden Inputs for Mobile */}
        <input
          ref={fileInputRef}
          type="file"
          multiple
          onChange={handleFileInputChange}
          className="hidden"
        />
        <input
          ref={folderInputRef}
          type="file"
          {...({ webkitdirectory: '' } as React.InputHTMLAttributes<HTMLInputElement>)}
          onChange={handleFileInputChange}
          className="hidden"
        />
      </div>
    );
  }

  // Desktop Layout (original)
  return (
    <div className="dark h-screen overflow-hidden bg-[#030303] text-white flex">
      {/* Icon rail */}
      <nav className="hidden md:flex w-[112px] shrink-0 flex-col items-center pl-6 pt-[128px] pb-8">
        <div className="absolute left-9 top-7 z-20 hidden w-[260px] md:block">
          <div className="flex min-h-[68px] items-center rounded-[1rem] py-4 pr-4">
            <p className="text-4xl font-semibold tracking-tight text-white">GavaDrop</p>
          </div>
        </div>
        <div className="flex flex-1 flex-col items-center justify-between rounded-[1.4rem] bg-[#171916] px-3 py-5">
        <div className="flex flex-col items-center">
          <div className="flex flex-col gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setActiveView('home')}
              className={`h-10 w-10 rounded-xl hover:bg-white/15 ${activeView === 'home' ? 'bg-white/10 text-[#c69cff]' : 'text-white/45 hover:bg-white/10 hover:text-white'}`}
            >
              <UploadSimpleIcon className="h-5 w-5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setActiveView(v => v === 'chat' ? 'home' : 'chat')}
              className={`relative h-10 w-10 rounded-xl hover:bg-white/15 ${activeView === 'chat' ? 'bg-white/10 text-[#c69cff]' : 'text-white/45 hover:bg-white/10 hover:text-white'}`}
            >
              <span className="relative grid h-5 w-5 place-items-center">
                <ChatCircleIcon className="h-5 w-5" />
                {totalUnreadCount > 0 && (
                  <span className="absolute -right-0.75 -top-0.75 h-2.5 w-2.5 rounded-full bg-red-500 ring-2 ring-[#171916]" />
                )}
              </span>
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setActiveView(v => v === 'history' ? 'home' : 'history')}
              className={`h-10 w-10 rounded-xl hover:bg-white/15 ${activeView === 'history' ? 'bg-white/10 text-[#c69cff]' : 'text-white/45 hover:bg-white/10 hover:text-white'}`}
            >
              <ClockCounterClockwiseIcon className="h-5 w-5" />
            </Button>
          </div>
        </div>
        <div className="flex flex-col gap-3">
          <LanguageSelector />
          <ThemeToggle />
        </div>
        </div>
      </nav>

      {/* Device name panel */}
      {deviceInfo && (
        <div className="absolute right-5 top-7 z-20 hidden w-[260px] md:block">
          <div className="flex min-h-[68px] items-center bg-[#171916] rounded-[1rem] p-4">
            {isEditingName ? (
              <div className="flex items-center gap-2">
                <Input
                  value={newDeviceName}
                  onChange={(e) => setNewDeviceName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSaveDeviceName();
                    if (e.key === 'Escape') handleCancelEditName();
                  }}
                  className="h-8 text-sm"
                  placeholder={t("device.namePlaceholder")}
                  autoFocus
                />
                <Button size="sm" variant="ghost" onClick={handleSaveDeviceName} className="h-8 w-8 p-0">
                  <CheckIcon className="h-4 w-4 text-green-600" />
                </Button>
                <Button size="sm" variant="ghost" onClick={handleCancelEditName} className="h-8 w-8 p-0">
                  <XIcon className="h-4 w-4 text-red-600" />
                </Button>
              </div>
            ) : (
              <div className="flex w-full items-center justify-between">
                <div>
                  <p className="text-xs text-white/45 mb-1">{t("device.yourDevice")}</p>
                  <p className="font-medium text-sm text-white">{deviceInfo.deviceName}</p>
                </div>
                <Button size="sm" variant="ghost" onClick={handleStartEditName} className="h-8 w-8 p-0">
                  <PencilLineIcon className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Transfer queue panel */}
      <div
        className="hidden"
        aria-hidden={!shouldRenderTransferQueue}
      >
        <aside className={`flex h-full w-[360px] flex-col px-5 pb-7 pt-[128px] transition-[opacity,transform] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] ${
          isTransferQueueOpen
            ? 'translate-x-0 opacity-100'
            : 'pointer-events-none translate-x-full opacity-0'
        }`}>
          <div className="mb-4">
            <h3 className="text-3xl font-bold tracking-[-0.02em] text-white">
              {t("transfer.queueTitle")}
            </h3>
            <p className="mt-2 text-sm font-medium text-white/40">
              {queuedItemCount} {queuedItemCount === 1 ? t("file.element") : t("file.elements")}
            </p>
          </div>

          <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-[1rem] bg-[#171916] shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
            <div className="border-b border-white/[0.06] p-4">
              <div className="flex items-center justify-between gap-3">
                <div className="flex min-w-0 items-center gap-3">
                  <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#e6d5ff] text-black">
                    <PaperPlaneTiltIcon className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-white">
                      {t("transfer.readyForSending")}
                    </p>
                    <p className="mt-0.5 text-xs font-medium text-white/40">
                      {selectedPeer ? t("device.deviceSelected") : t("device.selectDevice")}
                    </p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearAllFiles}
                  disabled={isSending}
                  className="h-9 w-9 shrink-0 rounded-lg p-0 text-white/40 hover:bg-white/[0.08] hover:text-white disabled:opacity-40"
                >
                  <TrashIcon className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="border-b border-white/[0.06] p-4">
              <div className="rounded-xl border border-white/[0.06] bg-black/20 p-3">
                <label className="flex cursor-pointer items-center gap-3">
                  <input
                    type="checkbox"
                    checked={isEncryptionEnabled}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setIsEncryptionEnabled(e.target.checked)}
                    className="rounded border-gray-300 text-primary focus:ring-primary"
                  />
                  <span className="flex min-w-0 items-center gap-2 text-sm font-medium text-white">
                    {isEncryptionEnabled ? <LockIcon className="h-4 w-4 text-[#dff36b]" /> : <LockOpenIcon className="h-4 w-4 text-white/35" />}
                    {t("encryption.endToEnd")}
                  </span>
                </label>
                {isEncryptionEnabled && (
                  <Input
                    type="password"
                    placeholder={t("encryption.passwordPlaceholder")}
                    value={encryptionPassword}
                    onChange={(e) => setEncryptionPassword(e.target.value)}
                    className="mt-3 h-10 rounded-xl border-white/[0.08] bg-white/[0.04] text-sm text-white placeholder:text-white/35"
                  />
                )}
              </div>
            </div>

            <div className="min-h-0 flex-1 space-y-2 overflow-y-auto p-4 pr-3 custom-scrollbar">
              {selectedFolders.map((folder, index) => (
                <div
                  key={`queue-folder-${index}`}
                  className="group flex items-center gap-3 rounded-xl border border-white/[0.06] bg-white/[0.035] p-3 transition-colors duration-200 hover:bg-white/[0.055]"
                >
                  <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#f2d45d] text-black">
                    <FolderIcon className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-white">{folder.name}</p>
                    <p className="mt-0.5 text-xs font-medium text-white/40">
                      {formatFileSize(folder.size)} · {folder.files.length} {folder.files.length === 1 ? t("file.file") : t("file.files")}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeFolder(index)}
                    disabled={isSending}
                    className="h-8 w-8 shrink-0 rounded-lg p-0 text-white/30 hover:bg-destructive/10 hover:text-destructive disabled:opacity-40"
                  >
                    <XIcon className="h-4 w-4" />
                  </Button>
                </div>
              ))}

              {selectedFiles.map((file, index) => (
                <div
                  key={`queue-file-${index}`}
                  className={`group flex items-center gap-3 rounded-xl border p-3 transition-colors duration-200 ${
                    selectedFileIndex === index
                      ? 'border-[#c9a6ff]/45 bg-[#211733]'
                      : 'border-white/[0.06] bg-white/[0.035] hover:bg-white/[0.055]'
                  }`}
                  onClick={() => setSelectedFileIndex(selectedFileIndex === index ? null : index)}
                >
                  <FilePreview file={file} size="small" className="shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-white">
                      {file.webkitRelativePath || file.name}
                    </p>
                    <p className="mt-0.5 text-xs font-medium text-white/40">
                      {formatFileSize(file.size)}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      removeFile(index);
                    }}
                    disabled={isSending}
                    className="h-8 w-8 shrink-0 rounded-lg p-0 text-white/30 hover:bg-destructive/10 hover:text-destructive disabled:opacity-40"
                  >
                    <XIcon className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>

            <div className="border-t border-white/[0.06] p-4">
              <Button
                onClick={handleFileSend}
                disabled={!selectedPeer || queuedItemCount === 0 || isSending || isSelectedPeerTemporarilyDisconnected}
                className="h-11 w-full rounded-xl bg-[#e6d5ff] font-semibold text-black hover:bg-[#d9bcff] disabled:opacity-50"
              >
                {isSending ? (
                  <>
                    <div className="mr-2 h-4 w-4 animate-spin rounded-full border-b-2 border-black" />
                    {t("transfer.sending")}
                  </>
                ) : (
                  <>
                    <PaperPlaneTiltIcon className="mr-2 h-4 w-4" />
                    {t("transfer.send")} {queuedItemCount}
                  </>
                )}
              </Button>
            </div>
          </div>
        </aside>
      </div>

      {/* Right device panel */}
      <div
        className={`relative order-3 hidden h-full shrink-0 overflow-visible bg-[#030303] transition-[width] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] md:block ${
          isNativeDevicePanelOpen ? 'w-[300px]' : 'w-0'
        }`}
        aria-hidden={!isNativeDevicePanelOpen}
      >
        {shouldRenderNativeDevicePanel && (
          <aside className={`absolute inset-y-0 right-0 flex h-full w-[300px] flex-col px-5 pb-7 pt-[128px] transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] ${
            isNativeDevicePanelOpen
              ? 'translate-x-0 opacity-100'
              : 'pointer-events-none translate-x-full opacity-0'
          }`}>
            {/* Devices List */}
            {renderRecentPeoplePanel(
              nativePanelOnlinePeers,
              nativePanelOfflinePeers,
              historicalOfflinePeers,
              activeView === 'chat' ? t("device.onlineDevices") : t("device.recentOnlineDevices"),
              activeView !== 'chat' || recentTypingText.length > 0
            )}
            
          </aside>
        )}
      </div>

      {/* Main Content Area */}
      <main className="order-2 flex-1 flex flex-col h-full overflow-hidden">
        {/* Main Header */}
        <header className="flex h-[128px] shrink-0 items-center bg-[#030303] px-6">
          <div className="flex w-full items-center justify-between">
          </div>
        </header>

        {/* Content Area */}
        {activeView === 'history' ? (
          <div className="flex-1 overflow-hidden text-white">
            <TransferHistory
              isOpen={true}
              sectionStyle={sectionAnimStyle}
              isColorTransitioning={!!sectionTransitionFrom}
              onResendFile={async (fileName, fileSize, deviceName, fileData) => {
                try {
                  await resendFile(fileName, fileSize, deviceName, fileData);
                  toast.success(`${fileName} ${t("toast.resendSuccess")}`);
                  playNotificationSound('success');
                  setActiveView('home');
                } catch (error: unknown) {
                  const errorMessage = (error as Error).message;
                  if (errorMessage.includes('not currently connected')) {
                    toast.error(`${t("toast.deviceNotConnected")}: ${deviceName}`);
                  } else if (errorMessage.includes('No file selected') || errorMessage.includes('cancelled')) {
                    toast.info(t("toast.selectOriginalFile"));
                  } else if (errorMessage.includes('File size mismatch') || errorMessage.includes('Please select the original file')) {
                    toast.error(errorMessage);
                  } else if (errorMessage.includes('rejected')) {
                    toast.error(t("toast.fileRejected"));
                  } else {
                    toast.error(t("toast.sendError"));
                    console.error('Resend error:', error);
                  }
                }
              }}
            />
          </div>
        ) : activeView === 'chat' ? (
          <div className="flex-1 overflow-hidden text-white">
            <div className="flex h-full px-6 pb-8">
              <section className="section-enter relative flex min-w-0 flex-1 flex-col overflow-hidden rounded-[1.35rem]" style={sectionAnimStyle}>
              {sectionTransitionFrom && <div className="section-color-overlay" />}
              <div className="relative z-10 shrink-0 px-6 py-6">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex min-w-0 items-center">
                    <div className="min-w-0">
                      <h2 className="truncate text-3xl font-bold tracking-[-0.02em] text-white">
                        Chat
                      </h2>
                      <div className="mt-1 flex flex-wrap items-center gap-2 text-xs font-medium text-white/45">
                        <span className="rounded-md border border-white/[0.08] bg-black/20 px-2 py-1">
                          {selectedDisplayPeer
                            ? `${getPeerChatTimeline(selectedDisplayPeer).length} ${t("chat.messages")}`
                            : t("chat.chooseFromDevices")}
                        </span>
                        {isSelectedPeerTemporarilyDisconnected && (
                          <span className="rounded-md border border-orange-400/20 bg-orange-400/10 px-2 py-1 text-orange-300">
                            Reconnecting
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setActiveView('home')}
                    className="h-10 w-10 rounded-xl border border-white/[0.08] bg-white/[0.04] p-0 text-white/55 hover:bg-white/[0.08] hover:text-white md:hidden"
                  >
                    <XIcon className="h-4 w-4" />
                  </Button>
                </div>
              </div>

                <ScrollArea className="relative z-10 min-h-0 flex-1 p-5">
                  <div className={`flex min-h-full w-full flex-1 flex-col space-y-3 ${
                    selectedDisplayPeer && getPeerChatTimeline(selectedDisplayPeer).length > 0 ? 'justify-end' : ''
                  }`}>
                    {!selectedDisplayPeer ? (
                      null
                    ) : getPeerChatTimeline(selectedDisplayPeer).length === 0 ? (
                      null
                    ) : (
                      getPeerChatTimeline(selectedDisplayPeer).map((event, index, timeline) => {
                        const currentDate = new Date(event.timestamp > 9999999999 ? event.timestamp : event.timestamp * 1000).toDateString();
                        const previousEvent = timeline[index - 1];
                        const previousDate = previousEvent
                          ? new Date(previousEvent.timestamp > 9999999999 ? previousEvent.timestamp : previousEvent.timestamp * 1000).toDateString()
                          : null;
                        const shouldShowDateSeparator = currentDate !== previousDate;

                        if (event.type === 'file') {
                          const isOwn = event.item.direction === 'sent';
                          const FileDirectionIcon = isOwn ? UploadSimpleIcon : DownloadSimpleIcon;

                          return (
                            <div key={event.id}>
                            {shouldShowDateSeparator && (
                              <div className="my-4 flex justify-center">
                                <span className="rounded-full border border-white/[0.06] bg-white/[0.04] px-3 py-1 text-xs font-medium text-white/40">
                                  {formatChatDateLabel(event.timestamp)}
                                </span>
                              </div>
                            )}
                            <div className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}>
                              <div
                                className={`max-w-[74%] rounded-2xl px-4 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] ${
                                  isOwn
                                    ? 'rounded-br-md bg-[#e6d5ff] text-black'
                                    : 'rounded-bl-md border border-white/[0.06] bg-[#141612] text-white'
                                }`}
                              >
                                <div className="flex items-center gap-3">
                                  <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl ${
                                    isOwn ? 'bg-black/10 text-black/70' : 'bg-[#c9a6ff]/15 text-[#c9a6ff]'
                                  }`}>
                                    <FileDirectionIcon className="h-4 w-4" />
                                  </span>
                                  <span className="min-w-0">
                                    <span className="block truncate text-sm font-semibold">
                                      {event.item.fileName}
                                    </span>
                                    <span className={`mt-0.5 block text-xs ${isOwn ? 'text-black/45' : 'text-white/35'}`}>
                                      {isOwn ? t("activity.fileSent") : t("activity.fileReceived")} - {formatFileSize(event.item.fileSize)}
                                    </span>
                                  </span>
                                </div>
                                <p className={`mt-2 text-xs ${isOwn ? 'text-black/45' : 'text-white/30'}`}>
                                  {formatChatTimestamp(event.timestamp)}
                                </p>
                              </div>
                            </div>
                            </div>
                          );
                        }

                        const { message } = event;

                        return (
                          <div key={event.id}>
                          {shouldShowDateSeparator && (
                            <div className="my-4 flex justify-center">
                              <span className="rounded-full border border-white/[0.06] bg-white/[0.04] px-3 py-1 text-xs font-medium text-white/40">
                                {formatChatDateLabel(event.timestamp)}
                              </span>
                            </div>
                          )}
                          <div className={`flex ${message.isOwn ? 'justify-end' : 'justify-start'}`}>
                            <div
                              className={`max-w-[74%] rounded-2xl px-4 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] ${
                                message.isOwn
                                  ? 'rounded-br-md bg-[#e6d5ff] text-black'
                                  : 'rounded-bl-md border border-white/[0.06] bg-[#141612] text-white'
                              }`}
                            >
                              <p className="whitespace-pre-wrap break-words text-sm leading-relaxed">{message.text}</p>
                              <p className={`mt-1 text-xs ${message.isOwn ? 'text-black/45' : 'text-white/30'}`}>
                                {formatChatTimestamp(message.timestamp)}
                              </p>
                            </div>
                          </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </ScrollArea>

                <div className="chat-input-bar-enter relative z-10 shrink-0 px-5 py-4">
                <div className="mx-auto flex items-center w-full max-w-4xl gap-3 rounded-2xl border border-white/[0.06] bg-black/20 p-2.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
                  <Input
                    value={inputMessage}
                    onChange={(e) => setInputMessage(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        if (inputMessage.trim() && selectedPeer && !isSelectedPeerTemporarilyDisconnected) {
                          sendMessage(inputMessage, selectedPeer);
                          setInputMessage('');
                        }
                      }
                    }}
                    placeholder={selectedOfflineClientId ? t("device.offline") : isSelectedPeerTemporarilyDisconnected ? t("chat.deviceReconnecting") : t("chat.typeMessage")}
                    className="h-12 flex-1 rounded-xl border-transparent bg-transparent text-white placeholder:text-white/35 focus-visible:ring-[#c9a6ff]"
                    disabled={!selectedPeer || isSelectedPeerTemporarilyDisconnected || !!selectedOfflineClientId}
                  />
                  <Button
                    onClick={() => {
                      if (inputMessage.trim() && selectedPeer && !isSelectedPeerTemporarilyDisconnected) {
                        sendMessage(inputMessage, selectedPeer);
                        setInputMessage('');
                      }
                    }}
                    disabled={!inputMessage.trim() || !selectedPeer || isSelectedPeerTemporarilyDisconnected || !!selectedOfflineClientId}
                    size="sm"
                    className="h-12 w-12 rounded-xl bg-[#e6d5ff] p-0 text-black hover:bg-[#d9bcff] disabled:opacity-40"
                  >
                    <PaperPlaneTiltIcon className="h-5 w-5" />
                  </Button>
                </div>
                </div>
              </section>
            </div>
          </div>
        ) : (
        <div className="flex-1 flex overflow-hidden">
          {/* Main Content */}
          <div className={`flex-1 px-6 pb-8 flex min-h-0 flex-col overflow-hidden transition-[gap] duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] ${
            isTransferQueueOpen || transferProgress ? 'gap-3' : 'gap-0'
          }`}>
          {/* File Drop Area */}
          <div
            ref={dropAreaRef}
            style={sectionAnimStyle}
            className={`section-enter min-h-0 flex-1 relative overflow-hidden rounded-[1.35rem] text-center transition-[transform,border-color,box-shadow] duration-500 cursor-pointer group ${
              isDragOver && selectedPeer
                ? "scale-[1.01]"
                : peers.length === 0
                ? "border border-white/[0.06]"
                : ""
            }`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => selectedPeer && !isSelectingFolderRef.current && handleFileSelect()}
          >
            {/* Animated Background Pattern */}
            <div className={`absolute inset-0 ${isDragOver && selectedPeer ? 'opacity-40 animate-pulse' : 'opacity-0'}`}>
              <div className="absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-[#8f55ff]/35 to-transparent"></div>
            </div>
            {sectionTransitionFrom && <div className="section-color-overlay" />}
            {/* Content with relative positioning */}
            <div
              ref={dropContentRef}
              className={`${hasQueuedItems ? 'p-4 items-center justify-center' : 'p-6 items-stretch justify-start'} relative z-10 transition-all duration-500 flex flex-col h-full`}
            >
              {selectedPeer && selectedDisplayPeer && (
                <div
                  className="absolute z-20 flex items-center gap-4 rounded-xl bg-[#171916] px-4 py-3.5 text-left shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] transition-[left,top,width,height,opacity,transform] duration-500 ease-out"
                  style={{
                    left: isSelectedCardAtTarget || !selectedCardOrigin ? selectedCardTarget.left : selectedCardOrigin.left,
                    top: isSelectedCardAtTarget || !selectedCardOrigin ? selectedCardTarget.top : selectedCardOrigin.top,
                    width: isSelectedCardAtTarget || !selectedCardOrigin ? selectedCardTarget.width : selectedCardOrigin.width,
                    height: isSelectedCardAtTarget || !selectedCardOrigin ? selectedCardTarget.height : selectedCardOrigin.height,
                  }}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeselectPeer();
                  }}
                  onMouseDown={(e) => e.stopPropagation()}
                >
                  <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-[#f3ead2]">
                    <SelectedDisplayIcon className="h-5 w-5 text-black/70" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-lg font-semibold text-white">
                      {selectedDisplayPeer.deviceName}
                    </span>
                  </span>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    className={`h-8 w-8 shrink-0 rounded-lg p-0 text-white/55 transition-opacity duration-200 hover:bg-white/10 hover:text-white ${
                      showSelectedCardClose ? "opacity-100" : "pointer-events-none opacity-0"
                    }`}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeselectPeer();
                    }}
                  >
                    <XIcon className="h-4 w-4" />
                  </Button>
                </div>
              )}

              {hasQueuedItems ? (
                <div className="text-center">
                  <h3 className={`font-semibold text-lg ${selectedPeer ? 'text-white' : 'text-white/45'}`}>
                    {t("transfer.addMoreFiles")}
                  </h3>
                  {selectedPeer && (
                    <p className="text-sm text-[#c9a6ff] mt-2 font-medium">
                      {t("transfer.dragDrop")}
                    </p>
                  )}
                </div>
              ) : (
                <>
                  {selectedPeer && !isDeselectingPeer ? (
                    <div className="absolute inset-0 flex flex-col items-center justify-center px-6 pt-28">
                      <div className="relative mb-4">
                        <UploadSimpleIcon className={`h-16 w-16 text-[#c9a6ff] transition-all duration-300 ${isDragOver && selectedPeer ? 'scale-105' : ''}`} />
                        {isDragOver && selectedPeer && (
                          <div className="absolute inset-0 rounded-full bg-primary/10 animate-ping"></div>
                        )}
                      </div>
                      <h2 className="text-3xl font-semibold mb-3 tracking-tight text-white transition-colors duration-300">
                        {t("transfer.dropFilesHere")}
                      </h2>

                      <div className="max-w-md mx-auto text-center transition-all duration-300 opacity-100">
                        <p className="text-sm text-white/45 mb-7 leading-relaxed">
                          {t("transfer.multipleFiles")}
                        </p>

                      <div className="flex gap-4 justify-center">
                        <Button 
                          size="lg" 
                          className="h-12 rounded-xl bg-[#e6d5ff] px-6 font-semibold text-black hover:bg-[#d9bcff]" 
                          onClick={(e) => {
                            e.stopPropagation();
                            e.preventDefault();
                            handleFileSelect();
                          }}
                        >
                          <UploadSimpleIcon className="h-5 w-5 mr-2" />
                          {t("transfer.selectFiles")}
                        </Button>
                        <Button 
                          size="lg" 
                          variant="outline" 
                          className="h-12 rounded-xl border-white/10 bg-white/5 px-6 text-white hover:bg-white/10" 
                          onClick={(e) => {
                            e.stopPropagation();
                            e.preventDefault();
                            handleFolderSelect();
                          }}
                        >
                          <FolderIcon className="h-5 w-5 mr-2" />
                          {t("transfer.selectFolder")}
                        </Button>
                      </div>
                      </div>
                    </div>
                  ) : (
                    <div className="flex h-full w-full flex-col text-left">
                      <div className="mb-4 h-9 shrink-0">
                        <h2 className="text-3xl font-semibold leading-9 tracking-tight text-white">
                          {t("device.peopleOnline")}
                        </h2>
                      </div>

                      <div className="relative mb-5 h-12 shrink-0">
                        <MagnifyingGlassIcon className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-white/35" />
                        <Input
                          value={desktopDeviceSearch}
                          onChange={(e) => setDesktopDeviceSearch(e.target.value)}
                          placeholder={t("device.searchPeopleOnline")}
                          className="h-12 rounded-xl border-white/10 bg-black/20 pl-12 text-white placeholder:text-white/35 focus-visible:ring-[#c9a6ff]"
                          onClick={(e) => e.stopPropagation()}
                        />
                      </div>

                      <div className={`min-h-0 flex-1 gap-3 overflow-y-auto pr-1 custom-scrollbar ${orderedDesktopPeers.length > 0 ? 'grid auto-rows-min grid-cols-[repeat(auto-fill,minmax(210px,260px))] content-start' : 'flex'}`}>
                        {orderedDesktopPeers.length > 0 ? (
                          orderedDesktopPeers.map((peer) => {
                            const DeviceIcon = getDeviceIcon(peer.deviceName);

                            return (
                              <button
                                key={peer.socketId}
                                type="button"
                                data-selected-peer-card={selectedPeer === peer.socketId ? "true" : undefined}
                                className={`relative flex h-[96px] w-full items-center gap-4 rounded-xl bg-[#171916] px-4 py-3.5 text-left transition-all duration-300 hover:bg-[#1f211d] focus:outline-none focus:ring-2 focus:ring-[#c9a6ff]/70 ${
                                  hideReturningGridCard && returningPeerId === peer.socketId ? "opacity-0" : "opacity-100"
                                }`}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (deselectAnimationTimeoutRef.current) {
                                    clearTimeout(deselectAnimationTimeoutRef.current);
                                    deselectAnimationTimeoutRef.current = null;
                                  }
                                  setIsDeselectingPeer(false);
                                  setReturningPeerId(null);
                                  setHideReturningGridCard(false);
                                  setShowSelectedCardClose(false);
                                  const cardRect = e.currentTarget.getBoundingClientRect();
                                  const containerRect = dropContentRef.current?.getBoundingClientRect();
                                  if (containerRect) {
                                    setSelectedCardOrigin({
                                      left: cardRect.left - containerRect.left,
                                      top: cardRect.top - containerRect.top,
                                      width: cardRect.width,
                                      height: cardRect.height,
                                    });
                                    setIsSelectedCardAtTarget(false);
                                    requestAnimationFrame(() => {
                                      requestAnimationFrame(() => {
                                        setIsSelectedCardAtTarget(true);
                                        setTimeout(() => setShowSelectedCardClose(true), 220);
                                      });
                                    });
                                  } else {
                                    setSelectedCardOrigin(null);
                                    setIsSelectedCardAtTarget(true);
                                    setShowSelectedCardClose(true);
                                  }
                                  setSelectedPeer(peer.socketId);
                                  setLastSelectedClientId(peer.clientId);
                                }}
                              >
                                <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-[#f3ead2]">
                                  <DeviceIcon className="h-5 w-5 text-black/70" />
                                </span>
                                <span className="min-w-0 flex-1">
                                  <span className="block truncate text-lg font-semibold text-white">
                                    {peer.deviceName}
                                  </span>
                                </span>
                              </button>
                            );
                          })
                        ) : (
                          <div className="col-span-full flex flex-1 flex-col items-center justify-center rounded-xl border border-white/[0.06] bg-white/[0.025] px-4 py-8 text-center">
                            <WifiHighIcon className="mx-auto mb-3 h-10 w-10 text-white/20" />
                            <p className="text-sm font-medium text-white/65">
                              {peers.length === 0
                                ? t("device.noPeopleOnline")
                                : centralDesktopPeers.length === 0
                                  ? t("device.allPeopleAreRecent")
                                  : t("device.noResults")}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </>
              )}
              <input
                ref={fileInputRef}
                type="file"
                multiple
                onChange={handleFileInputChange}
                className="hidden"
              />
              <input
                ref={folderInputRef}
                type="file"
                {...({ webkitdirectory: '' } as React.InputHTMLAttributes<HTMLInputElement>)}
                onChange={handleFileInputChange}
                className="hidden"
              />
            </div>
          </div>

          {/* Selected Files List */}
          <div className={`shrink-0 overflow-hidden rounded-[1.35rem] transition-[height,opacity,transform] duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] ${
            isTransferQueueOpen ? 'h-[420px] translate-y-0 opacity-100' : 'h-0 pointer-events-none translate-y-6 opacity-0'
          }`}>
          {shouldRenderTransferQueue && (
            <div className="flex h-full min-h-0 flex-col overflow-hidden rounded-[1.35rem] border border-white/[0.07] bg-[#11120f] shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
              {/* Files List Section */}
              <div className="flex flex-row gap-0 flex-1 overflow-hidden p-6">
                {/* Left: File List */}
                <div className="min-w-0 flex-1 flex flex-col transition-all duration-500 ease-in-out">
                  <div className="mb-5 flex min-w-0 items-center justify-between gap-4 border-b border-white/[0.06] pb-5">
                <div className="min-w-0">
                  <div className="mb-2 flex items-center gap-3">
                    <div className="grid h-9 w-9 place-items-center rounded-xl bg-[#e6d5ff] text-black">
                      <PaperPlaneTiltIcon className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="flex items-center gap-3 text-2xl font-semibold tracking-tight text-white">
                        {t("transfer.queueTitle")}
                        <span className="rounded-md border border-white/[0.08] bg-white/[0.04] px-2 py-1 text-xs font-medium tracking-normal text-white/45">
                          {queuedItemCount} {queuedItemCount === 1 ? t("file.element") : t("file.elements")}
                        </span>
                      </h3>
                    </div>
                  </div>
                  <div className="ml-12 flex items-center gap-2 text-xs font-medium text-white/45">
                    {isEncryptionEnabled && (
                      <span className="rounded-md border border-[#dff36b]/20 bg-[#dff36b]/10 px-2 py-1 text-[#dff36b]">
                        {t("encryption.endToEnd")}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex shrink-0 gap-3">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={clearAllFiles}
                    disabled={isSending}
                    className="h-10 rounded-xl border-white/[0.08] bg-white/[0.04] text-white/65 hover:bg-white/[0.08] hover:text-white transition-all duration-200 disabled:opacity-50"
                  >
                    <TrashIcon className="h-4 w-4 mr-2" />
                    {t("transfer.clearAll")}
                  </Button>
                  <Button
                    onClick={handleFileSend}
                    disabled={!selectedPeer || (selectedFiles.length === 0 && selectedFolders.length === 0) || isSending || isSelectedPeerTemporarilyDisconnected}
                    size="sm"
                    className="h-10 rounded-xl bg-[#e6d5ff] px-4 text-black hover:bg-[#d9bcff] disabled:opacity-50 font-semibold"
                  >
                    {isSending ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-black mr-2"></div>
                        {t("transfer.sending")}
                      </>
                    ) : (
                      <>
                        <PaperPlaneTiltIcon className="h-4 w-4 mr-2" />
                        {t("transfer.send")} {queuedItemCount}
                      </>
                    )}
                  </Button>
                </div>
              </div>

                  {/* Encryption Settings */}
                  <div className="mb-5 rounded-xl border border-white/[0.06] bg-black/20 p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex min-w-0 items-start gap-3">
                      <div className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${isEncryptionEnabled ? 'bg-[#dff36b]/15 text-[#dff36b]' : 'bg-white/[0.04] text-white/35'}`}>
                        {isEncryptionEnabled ? <LockIcon className="h-5 w-5" /> : <LockOpenIcon className="h-5 w-5" />}
                      </div>
                      <div className="min-w-0">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={isEncryptionEnabled}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setIsEncryptionEnabled(e.target.checked)}
                          className="rounded border-gray-300 text-primary focus:ring-primary"
                        />
                        <span className="font-medium text-sm text-white">{t("encryption.endToEnd")}</span>
                      </label>
                      <p className="text-xs text-white/45 mt-1">
                        {isEncryptionEnabled 
                          ? t("encryption.enabledDescription")
                          : t("encryption.disabledDescription")
                        }
                      </p>
                      </div>
                      </div>
                      {isEncryptionEnabled && (
                        <Input
                          type="password"
                          placeholder={t("encryption.passwordPlaceholder")}
                          value={encryptionPassword}
                          onChange={(e) => setEncryptionPassword(e.target.value)}
                          className="h-10 max-w-[260px] rounded-xl border-white/[0.08] bg-white/[0.04] text-sm text-white placeholder:text-white/35"
                        />
                      )}
                    </div>
                  </div>

                  {/* File and Folder List */}
                  <div className="space-y-2.5 flex-1 overflow-y-auto custom-scrollbar min-h-0 min-w-0 pr-1">
                {/* Folders */}
                {selectedFolders.map((folder, index) => (
                  <div
                    key={`folder-${index}`}
                    className="group flex items-center gap-4 rounded-xl border border-white/[0.06] bg-white/[0.035] p-3.5 transition-all duration-200 hover:border-white/[0.12] hover:bg-white/[0.055]"
                  >
                    <div className="w-11 h-11 flex shrink-0 items-center justify-center rounded-xl bg-[#f2d45d] text-black">
                      <FolderIcon className="w-6 h-6" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm text-white truncate">
                        {folder.name}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <p className="text-xs text-white/45 font-medium">
                          {formatFileSize(folder.size)} • {folder.files.length} {folder.files.length === 1 ? t("file.file") : t("file.files")}
                        </p>
                        <span className="h-1 w-1 rounded-full bg-white/25"></span>
                        <p className="text-xs text-[#f2d45d] font-medium">
                          {t("file.folder")}
                        </p>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        removeFolder(index);
                      }}
                      disabled={isSending}
                      className="h-8 w-8 shrink-0 p-0 text-white/35 hover:text-destructive hover:bg-destructive/10 disabled:opacity-50 rounded-md transition-all duration-200"
                    >
                      <XIcon className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
                
                {/* Files */}
                {selectedFiles.map((file, index) => (
                  <div
                    key={`file-${index}`}
                    className={`group flex items-center gap-4 rounded-xl border p-3.5 transition-all duration-200 cursor-pointer ${
                      selectedFileIndex === index
                        ? 'border-[#c9a6ff]/45 bg-[#211733]'
                        : 'border-white/[0.06] bg-white/[0.035] hover:border-white/[0.12] hover:bg-white/[0.055]'
                    }`}
                    onClick={() => setSelectedFileIndex(selectedFileIndex === index ? null : index)}
                  >
                    <FilePreview 
                      file={file} 
                      size="small" 
                      className="transition-transform duration-200" 
                    />
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm text-white truncate">
                        {file.webkitRelativePath || file.name}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <p className="text-xs text-white/45 font-medium">
                          {formatFileSize(file.size)}
                        </p>
                        <span className="h-1 w-1 rounded-full bg-white/25"></span>
                        <p className="text-xs text-[#c9a6ff] font-medium">
                          {t("file.file")}
                        </p>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        removeFile(index);
                      }}
                      disabled={isSending}
                      className="h-8 w-8 shrink-0 p-0 text-white/35 hover:text-destructive hover:bg-destructive/10 disabled:opacity-50 rounded-md transition-all duration-200"
                    >
                      <XIcon className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
                  </div>
                </div>

                {/* Right: File Preview */}
                <div className={`${selectedPreviewFile ? 'ml-6 w-80' : 'ml-0 w-0'} shrink-0 overflow-hidden transition-all duration-500 ease-in-out`}>
                  <div className="flex h-full w-80 flex-col">
                    {selectedPreviewFile && (
                    <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-white/[0.06] bg-white/[0.035] shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]">
                      <div className="flex items-center justify-between border-b border-white/[0.06] px-4 py-3">
                        <h4 className="text-sm font-semibold tracking-tight text-white">{t("file.preview")}</h4>
                        <span className="rounded-md bg-white/[0.05] px-2 py-1 text-[11px] font-medium text-white/45">
                          {formatFileSize(selectedPreviewFile.size)}
                        </span>
                      </div>
                      <div className="grid min-h-[180px] place-items-center bg-black/20 px-4 py-6">
                        <FilePreview
                          file={selectedPreviewFile}
                          size="large"
                          className="mx-auto"
                        />
                      </div>
                      <div className="space-y-3 p-4">
                        <div>
                          <p className="mb-1 text-[11px] font-medium text-white/35">{t("file.file")}</p>
                          <p className="truncate text-sm font-semibold text-white">
                            {selectedPreviewFile.webkitRelativePath || selectedPreviewFile.name}
                          </p>
                        </div>
                        <div className="rounded-xl border border-white/[0.06] bg-black/15">
                          <div className="flex items-center justify-between gap-3 border-b border-white/[0.06] px-3 py-2.5">
                            <span className="text-xs text-white/40">{t("file.type")}</span>
                            <span className="max-w-[160px] truncate text-xs font-medium text-white/70">
                              {selectedPreviewFile.type || t("file.unknown")}
                            </span>
                          </div>
                          <div className="flex items-center justify-between gap-3 px-3 py-2.5">
                            <span className="text-xs text-white/40">{t("file.modified")}</span>
                            <span className="text-xs font-medium text-white/70">
                              {new Date(selectedPreviewFile.lastModified).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
          </div>
          {/* Transfer Progress */}
          {transferProgress && (
            <div 
              className={`p-6 bg-[#171916] rounded-[1.35rem] transition-all duration-1000 ease-in-out ${
                isProgressHiding 
                  ? 'transform translate-y-full opacity-0 scale-95' 
                  : 'transform translate-y-0 opacity-100 scale-100'
              }`}
            >
              <div className="flex items-center gap-4 mb-4">
                <div className="p-3 bg-[#e6d5ff] rounded-xl">
                  {transferProgress.type === 'sending' ? (
                    <UploadSimpleIcon className="h-8 w-8 text-black" />
                  ) : (
                    <DownloadSimpleIcon className="h-8 w-8 text-black" />
                  )}
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-lg text-white">
                    {transferProgress.type === 'sending' ? t("progress.sending") : t("progress.receiving")}: {transferProgress.fileName}
                  </p>
                  <p className="text-[#c9a6ff]">
                    {Math.round(transferProgress.progress)}% {t("progress.completed")}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-4xl font-semibold text-[#c9a6ff]">
                    {Math.round(transferProgress.progress)}%
                  </p>
                </div>
              </div>
              <Progress 
                value={transferProgress.progress} 
                className="w-full h-4"
              />
            </div>
          )}
          </div>

          {/* Inline Chat Panel */}
          <div className="w-0 overflow-hidden">
              <div className="w-80 border-l border-white/[0.06] bg-[#030303] flex flex-col h-full">
              {/* Chat Header */}
              <div className="border-b border-white/[0.06] bg-[#030303] p-4">
                <div className="flex items-center justify-between gap-3">
                <div className="flex min-w-0 items-center gap-3">
                  <div className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${isSelectedPeerTemporarilyDisconnected ? 'bg-orange-400/15 text-orange-300' : 'bg-[#c9a6ff]/15 text-[#c9a6ff]'}`}>
                    <ChatCircleIcon className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <h3 className={`truncate font-semibold ${isSelectedPeerTemporarilyDisconnected ? 'text-orange-300' : 'text-white'}`}>
                      {(selectedPeerData || selectedPeerDisconnected?.peer)?.deviceName || ''}
                    </h3>
                    <p className="mt-0.5 text-xs text-white/40">
                      {selectedPeer && (selectedPeerData || selectedPeerDisconnected?.peer)
                        ? (messages.get((selectedPeerData || selectedPeerDisconnected?.peer)!.clientId) || []).length 
                        : 0} {t("chat.messages")}
                      {isSelectedPeerTemporarilyDisconnected && <span className="ml-2 text-orange-300/70">{t("chat.reconnecting")}</span>}
                    </p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsChatOpen(false)}
                  className="h-8 w-8 shrink-0 rounded-lg p-0 text-white/45 hover:bg-white/[0.08] hover:text-white"
                >
                  <XIcon className="h-4 w-4" />
                </Button>
                </div>
              </div>

              {/* Messages */}
              <ScrollArea className="flex-1 min-h-0 bg-[#050505] p-4">
                <div className="space-y-3">
                  {selectedPeer && (selectedPeerData || selectedPeerDisconnected?.peer) && (messages.get((selectedPeerData || selectedPeerDisconnected?.peer)!.clientId) || []).length === 0 ? (
                    <div className="flex min-h-[260px] flex-col items-center justify-center rounded-2xl border border-white/[0.06] bg-white/[0.025] px-5 text-center">
                      <div className="mb-4 grid h-14 w-14 place-items-center rounded-2xl border border-white/[0.06] bg-white/[0.04]">
                        <ChatCircleIcon className="h-6 w-6 text-white/20" />
                      </div>
                      <p className="text-sm font-medium text-white/55">
                        {t("chat.noMessages")}
                      </p>
                      <p className="mt-2 text-xs text-white/25">
                        {isSelectedPeerTemporarilyDisconnected ? t("chat.deviceReconnecting") : t("chat.startConversation")}
                      </p>
                    </div>
                  ) : selectedPeer && (selectedPeerData || selectedPeerDisconnected?.peer) ? (
                    (messages.get((selectedPeerData || selectedPeerDisconnected?.peer)!.clientId) || []).map((message) => (
                      <div
                        key={message.id}
                        className={`flex ${message.isOwn ? 'justify-end' : 'justify-start'}`}
                      >
                        <div
                          className={`max-w-[78%] rounded-2xl px-3.5 py-2.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] ${
                            message.isOwn
                              ? 'rounded-br-md bg-[#e6d5ff] text-black'
                              : 'rounded-bl-md border border-white/[0.06] bg-white/[0.045] text-white'
                          }`}
                        >
                          <p className="whitespace-pre-wrap break-words text-sm leading-relaxed">
                            {message.text}
                          </p>
                          <p className={`text-xs mt-1 ${
                            message.isOwn
                              ? 'text-black/45'
                              : 'text-white/30'
                          }`}>
                            {(() => {
                              const ts = message.timestamp;
                              if (!ts || isNaN(Number(ts))) return new Date().toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
                              const normalizedTs = ts > 9999999999 ? ts : ts * 1000;
                              const date = new Date(normalizedTs);
                              return isNaN(date.getTime())
                                ? new Date().toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })
                                : date.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
                            })()}
                          </p>
                        </div>
                      </div>
                    ))
                  ) : null}
                </div>
              </ScrollArea>

              {/* Input */}
              <div className="chat-input-bar-enter border-t border-white/[0.06] bg-[#030303] p-4">
                <div className="flex gap-2">
                  <Input
                    value={inputMessage}
                    onChange={(e) => setInputMessage(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        if (inputMessage.trim() && selectedPeer && !isSelectedPeerTemporarilyDisconnected) {
                          sendMessage(inputMessage, selectedPeer);
                          setInputMessage('');
                        }
                      }
                    }}
                    placeholder={isSelectedPeerTemporarilyDisconnected ? t("chat.deviceReconnecting") : t("chat.typeMessage")}
                    className="h-11 flex-1 rounded-xl border-white/[0.08] bg-white/[0.04] text-white placeholder:text-white/35 focus-visible:ring-[#c9a6ff]"
                    disabled={!selectedPeer || isSelectedPeerTemporarilyDisconnected}
                  />
                  <Button
                    onClick={() => {
                      if (inputMessage.trim() && selectedPeer && !isSelectedPeerTemporarilyDisconnected) {
                        sendMessage(inputMessage, selectedPeer);
                        setInputMessage('');
                      }
                    }}
                    disabled={!inputMessage.trim() || !selectedPeer || isSelectedPeerTemporarilyDisconnected}
                    size="sm"
                    className="h-11 w-11 rounded-xl bg-[#e6d5ff] p-0 text-black hover:bg-[#d9bcff] disabled:opacity-40"
                  >
                    <PaperPlaneTiltIcon className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
        )}
      </main>

      {/* Single File Request Dialog */}
      <AlertDialog open={!!incomingFileRequest}>
        <AlertDialogContent className="border border-white/[0.08] bg-[#080907] p-0 text-white shadow-[0_24px_80px_rgba(0,0,0,0.55)] sm:max-w-[460px]">
          <div className="border-b border-white/[0.06] px-6 py-5">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-3 text-xl font-semibold tracking-tight text-white">
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-[#e6d5ff] text-black">
                <DownloadSimpleIcon className="h-5 w-5" />
              </span>
              <span className="min-w-0">
                <span className="block">{t("dialog.fileRequest")}</span>
                <span className="mt-0.5 block truncate text-sm font-medium text-white/45">
                  {incomingFileRequest?.fromName}
                </span>
              </span>
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="mt-3 text-sm leading-relaxed text-white/50">
                {incomingFileRequest?.fromName} {t("dialog.wantsToSend")} {t("message.thisFile")}. {t("dialog.acceptFile")}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          </div>

          <div className="px-6 py-5">
            <div className="flex items-center gap-4 rounded-2xl border border-white/[0.06] bg-white/[0.035] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
              <FilePreviewMetadata
                fileName={incomingFileRequest?.fileName || ''}
                size="medium"
              />
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-semibold text-white">
                  {incomingFileRequest?.fileName}
                </div>
                <div className="mt-1 text-xs font-medium text-white/40">
                  {incomingFileRequest ? formatFileSize(incomingFileRequest.fileSize) : ''}
                </div>
              </div>
            </div>
          </div>

          <AlertDialogFooter className="gap-3 border-t border-white/[0.06] bg-white/[0.02] px-6 py-5 sm:justify-between">
            <AlertDialogCancel
              onClick={() => incomingFileRequest && rejectFile(incomingFileRequest.socketId)}
              className="h-11 rounded-xl border-white/[0.08] bg-white/[0.04] px-5 text-white/70 hover:bg-white/[0.08] hover:text-white"
            >
              {t("dialog.reject")}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => incomingFileRequest && acceptFile(incomingFileRequest.socketId)}
              className="h-11 rounded-xl bg-[#e6d5ff] px-5 font-semibold text-black hover:bg-[#d9bcff]"
            >
              {t("dialog.accept")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Batch File Request Dialog */}
      <AlertDialog open={!!incomingBatchRequest}>
        <AlertDialogContent className="border border-white/[0.08] bg-[#080907] p-0 text-white shadow-[0_24px_80px_rgba(0,0,0,0.55)] sm:max-w-[500px]">
          <div className="border-b border-white/[0.06] px-6 py-5">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-3 text-xl font-semibold tracking-tight text-white">
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-[#e6d5ff] text-black">
                <PackageIcon className="h-5 w-5" />
              </span>
              <span className="min-w-0">
                <span className="block">{t("dialog.multipleFilesRequest")}</span>
                <span className="mt-0.5 block truncate text-sm font-medium text-white/45">
                  {incomingBatchRequest?.fromName}
                </span>
              </span>
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="mt-3 text-sm leading-relaxed text-white/50">
                {incomingBatchRequest?.fromName} {t("dialog.wantsToSendMultiple")} {incomingBatchRequest?.files.length} {t("dialog.files")}:
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          </div>
          
          {/* File List */}
          <div className="mx-6 my-5 max-h-56 space-y-2 overflow-y-auto pr-1 custom-scrollbar">
            {incomingBatchRequest?.files.map((file, index) => (
              <div key={index} className="flex items-center gap-3 rounded-xl border border-white/[0.06] bg-white/[0.035] p-3">
                <FilePreviewMetadata 
                  fileName={file.fileName}
                  size="small"
                />
                <div className="flex-1 min-w-0">
                  <p className="truncate text-sm font-semibold text-white">
                    {(file as { relativePath?: string }).relativePath || file.fileName}
                  </p>
                  <p className="mt-0.5 text-xs font-medium text-white/40">
                    {formatFileSize(file.fileSize)}
                  </p>
                </div>
              </div>
            ))}
          </div>

          <div className="mx-6 mb-5 rounded-2xl border border-[#c9a6ff]/15 bg-[#c9a6ff]/10 p-4">
            <div className="text-sm font-medium text-white">
              <strong>{t("dialog.total")}:</strong> {incomingBatchRequest?.files.length} {t("dialog.files")} 
              ({incomingBatchRequest ? formatFileSize(incomingBatchRequest.files.reduce((total, file) => total + file.fileSize, 0)) : ''})
            </div>
            <div className="mt-2 flex items-start gap-2 text-xs leading-relaxed text-white/50">
              <PackageIcon className="mt-0.5 h-4 w-4 shrink-0 text-[#c9a6ff]" />
              <span>{t("dialog.zipInfo")}</span>
            </div>
          </div>

          <AlertDialogFooter className="gap-3 border-t border-white/[0.06] bg-white/[0.02] px-6 py-5 sm:justify-between">
            <AlertDialogCancel 
              onClick={() => incomingBatchRequest && rejectBatchFiles(incomingBatchRequest.socketId, incomingBatchRequest.batchId)}
              className="h-11 rounded-xl border-white/[0.08] bg-white/[0.04] px-5 text-white/70 hover:bg-white/[0.08] hover:text-white"
            >
              {t("dialog.rejectAll")}
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => incomingBatchRequest && acceptBatchFiles(incomingBatchRequest.socketId, incomingBatchRequest.batchId)}
              className="h-11 rounded-xl bg-[#e6d5ff] px-5 font-semibold text-black hover:bg-[#d9bcff]"
            >
              {t("dialog.acceptAll")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Decrypt File Dialog */}
      <AlertDialog open={showDecryptDialog}>
        <AlertDialogContent>
          <div className="border-b border-white/[0.06] px-6 py-5">
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-3">
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-[#dff36b]/15 text-[#dff36b]">
                  <LockIcon className="h-5 w-5" />
                </span>
                <span className="min-w-0">
                  <span className="block">{t("encryption.fileEncrypted")}</span>
                  <span className="mt-0.5 block truncate text-sm font-medium text-white/45">
                    {pendingEncryptedFile?.fileName}
                  </span>
                </span>
              </AlertDialogTitle>
            </AlertDialogHeader>
          </div>

          <div className="px-6 py-5 space-y-4">
            <p className="text-sm text-white/50">
              {t("encryption.receivedEncrypted")} <span className="font-medium text-white/80">{pendingEncryptedFile?.fileName}</span>. {t("encryption.enterPassword")}
            </p>
            {decryptAttempts > 0 && (
              <div className="flex items-center gap-2 rounded-xl border border-orange-400/20 bg-orange-400/10 px-4 py-3 text-sm font-medium text-orange-300">
                <LockIcon className="h-4 w-4 shrink-0" />
                {3 - decryptAttempts === 1 ? t("encryption.attentionAttempts") : t("encryption.attentionAttemptsPlural")} {3 - decryptAttempts}
              </div>
            )}
            <Input
              type="password"
              placeholder={t("encryption.passwordPlaceholderDecrypt")}
              value={decryptPassword}
              onChange={(e) => setDecryptPassword(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleDecryptFile(); }}
              className="h-12 rounded-xl border-white/[0.08] bg-white/[0.04] text-white placeholder:text-white/30 focus-visible:ring-[#c9a6ff]"
            />
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => {
              setShowDecryptDialog(false);
              setDecryptPassword("");
              setDecryptAttempts(0);
              setPendingEncryptedFile(null);
            }}>
              {t("encryption.cancel")}
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleDecryptFile} disabled={!decryptPassword.trim()} className="bg-[#dff36b] text-black hover:bg-[#cfe05a]">
              <LockIcon className="h-4 w-4" />
              {t("encryption.decryptAndDownload")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* PWA Install Prompt for Desktop */}
      {!isStandalone && <PWAInstallPrompt />}
    </div>
  );
}

