"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
import { Upload, Wifi, Smartphone, Monitor, Tablet, FileDown, FileUp, Edit3, Check, X, Trash2, Send, MessageCircle, Folder, Lock, Unlock, History } from "lucide-react";
import Image from "next/image";
import { toast } from "sonner";
import { useWebRTC } from "@/hooks/useWebRTC";
import { ThemeToggle } from "@/components/theme-toggle";
import { LanguageToggle } from "@/components/language-toggle";
import { useLanguage } from "@/contexts/language-context";
import { ScrollArea } from "@/components/ui/scroll-area";
import { FilePreview } from "@/components/file-preview";
import { FilePreviewMetadata } from "@/components/file-preview-metadata";
import { encryptFile, decryptFile } from "@/utils/encryption";
import { groupFilesByFolder, compressFolder } from "@/utils/folder-utils";
import { TransferHistory } from "@/components/transfer-history";
import { saveToHistory, saveFileToHistory } from "@/utils/history-utils";
import { playNotificationSound, initializeAudioContext } from "@/utils/notification-sounds";
import { notifyNative } from "@/utils/native-notify";

export default function Home() {
  const [isDragOver, setIsDragOver] = useState(false);
  const [selectedPeer, setSelectedPeer] = useState<string | null>(null);
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
  const [lastSelectedClientId, setLastSelectedClientId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);
  const isSelectingFolderRef = useRef<boolean>(false);
  const [isStateLoaded, setIsStateLoaded] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [receivedFiles, setReceivedFiles] = useState<{data: ArrayBuffer, fileName: string, relativePath: string, fromSocketId: string}[]>([]);
  
  const { t } = useLanguage();

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
        }
      });
      // Clear processed files
      setReceivedFiles([]);
    }
  }, [receivedFiles, peers]);

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
          if (!newestMessage.isOwn) {
            latestMessageInfo = {
              senderName: newestMessage.fromName,
              messageText: newestMessage.text,
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
        const messagePreview = messageText.length > 50 
          ? messageText.substring(0, 50) + '...' 
          : messageText;
        notifyNative(
          `${t("toast.messageFrom")} ${senderName}`,
          messagePreview,
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
        console.log('🔔 Notification clicked with data:', data);
        
        if (data.peerId) {
          console.log('📱 Opening chat and trying to select peer...');
          
          // Always open chat first
          setIsChatOpen(true);
          
          // Try to find and select the peer using current ref
          setTimeout(() => {
            const currentPeers = peersRef.current;
            const peer = currentPeers.find(p => p.clientId === data.peerId);
            console.log('👥 Looking for peer with clientId:', data.peerId);
            console.log('👥 Available peers:', currentPeers);
            console.log('✅ Found peer:', peer);
            
            if (peer) {
              console.log('🎯 Setting selected peer to socketId:', peer.socketId);
              setSelectedPeer(peer.socketId);
            } else {
              console.log('❌ Peer not found, available clientIds:', currentPeers.map(p => p.clientId));
            }
          }, 100);
        }
      };

      console.log('📝 Registering notification click handler');
      window.electronAPI.onNotificationClick(handleNotificationClick);

      return () => {
        console.log('🧹 Cleaning up notification click handler');
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
  }, [pendingEncryptedFile, decryptPassword, decryptAttempts, peers, t]);

  const handleFileSend = useCallback(async () => {
    console.log('handleFileSend called with:', selectedFiles.length, 'files,', selectedFolders.length, 'folders, selectedPeer:', selectedPeer);
    if (selectedFiles.length === 0 && selectedFolders.length === 0 || !selectedPeer) {
      console.log('Early return: no items or no peer selected');
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
      setSelectedFiles([]);
      setSelectedFolders([]);
      clearSavedFiles();
    } catch (error: unknown) {
      const message = (error as Error).message;
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
      console.error('Send error:', error);
      
      // Clear items even on error to reset the UI
      setSelectedFiles([]);
      setSelectedFolders([]);
    } finally {
      setIsSending(false);
    }
  }, [selectedFiles, selectedFolders, selectedPeer, sendFile, sendBatchFiles, clearSavedFiles, t, isEncryptionEnabled, encryptionPassword, peers]);

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
      return Smartphone;
    }
    if (deviceName.toLowerCase().includes('tablet') || deviceName.toLowerCase().includes('ipad')) {
      return Tablet;
    }
    return Monitor;
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
          console.log('Auto-reselecting peer after page refresh or reconnection:', matchingPeer);
          setSelectedPeer(matchingPeer.socketId);
        }
      } else if (selectedPeer) {
        // Selected peer is not in active peers, check if it's still disconnected
        const isCurrentlyDisconnected = Array.from(disconnectedPeers.values()).some(dp => dp.peer.socketId === selectedPeer);
        if (!isCurrentlyDisconnected) {
          // Peer is no longer anywhere, clear selection
          console.log('Selected peer is no longer available, clearing selection');
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
          console.log('Selected peer grace period expired, closing chat and clearing selection');
          setSelectedPeer(null);
          setIsChatOpen(false);
          setLastSelectedClientId(null);
        } else if (hasReconnectedPeer) {
          console.log('Selected peer has reconnected, auto-reselection should handle this');
        } else {
          console.log('Selected peer is in grace period, keeping chat open');
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
  const isSelectedPeerTemporarilyDisconnected = !!selectedPeerDisconnected;

  return (
    <div className="h-screen overflow-hidden bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 flex">
      {/* Left Sidebar - Full Height */}
      <div className="w-80 bg-background border-r border-border flex flex-col shadow-lg h-full">
        {/* Sidebar Header */}
        <div className="p-6 border-b border-border bg-muted/30">
          <div className="flex items-center gap-3 mb-4">
            <div className="flex-1">
              <h2 className="text-2xl font-bold text-foreground" style={{ fontFamily: 'var(--font-silkscreen)' }}>
                {t("app.title")}
              </h2>
              <p className="text-sm text-muted-foreground font-medium tracking-wide">
                {t("app.subtitle")}
              </p>
            </div>
            <div className="flex gap-1">
              <LanguageToggle />
              <ThemeToggle />
            </div>
          </div>
          
          {/* Connection Status */}
          <div className="flex items-center gap-2 mb-3">
            <Wifi className={`h-4 w-4 ${isConnected ? 'text-green-500' : 'text-destructive'}`} />
            <Badge variant={isConnected ? 'default' : 'destructive'} className="text-xs">
              {isConnected ? t("status.connected") : t("status.disconnected")}
            </Badge>
          </div>

          {/* Device Name */}
          {deviceInfo && (
            <div className="bg-muted/50 rounded-lg p-3">
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
                    placeholder="Nome dispositivo"
                    autoFocus
                  />
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={handleSaveDeviceName}
                    className="h-8 w-8 p-0"
                  >
                    <Check className="h-4 w-4 text-green-600" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={handleCancelEditName}
                    className="h-8 w-8 p-0"
                  >
                    <X className="h-4 w-4 text-red-600" />
                  </Button>
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">{t("device.yourDevice")}</p>
                    <p className="font-medium text-sm text-foreground">
                      {deviceInfo.deviceName}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={handleStartEditName}
                    className="h-8 w-8 p-0"
                  >
                    <Edit3 className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Devices List */}
        <div className="flex-1 overflow-y-auto p-6 custom-scrollbar min-h-0">
          <div className="mb-4">
            <h3 className="text-sm font-semibold text-foreground mb-2">
              {t("device.availableDevices")}
            </h3>
            <p className="text-xs text-muted-foreground">
              {t("device.selectDevice")}
            </p>
          </div>
          
          <div className="space-y-2">
            {peers.length === 0 && disconnectedPeers.size === 0 ? (
              <div className="text-center py-12">
                <Wifi className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
                <p className="text-muted-foreground text-sm mb-2">
                  {t("device.noDevicesFound")}
                </p>
                <p className="text-xs text-muted-foreground/70">
                  {t("device.openGavaDrop")}
                </p>
              </div>
            ) : (
              <>
                {/* Connected peers */}
                {peers.map((peer) => {
                  const DeviceIcon = getDeviceIcon(peer.deviceName);
                  const isSelected = selectedPeer === peer.socketId;
                  
                  return (
                    <div key={peer.socketId}>
                      <div
                        className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-all ${
                          isSelected
                            ? "bg-accent border-2 border-primary"
                            : "hover:bg-accent/50 border-2 border-transparent"
                        }`}
                        onClick={() => {
                          const newSelection = isSelected ? null : peer.socketId;
                          console.log('Selecting peer:', newSelection);
                          setSelectedPeer(newSelection);
                          
                          // Track the selected client ID for reconnection
                          setLastSelectedClientId(newSelection ? peer.clientId : null);
                          
                          // Auto-open chat if device has unread messages
                          if (newSelection && unreadCounts.get(peer.clientId) && unreadCounts.get(peer.clientId)! > 0) {
                            setIsChatOpen(true);
                            // Clear notifications since we're opening the chat
                            markMessagesAsRead(newSelection);
                          } else if (newSelection && isChatOpen && unreadCounts.get(peer.clientId)) {
                            // Auto-clear notifications when selecting a device with unread messages and chat is already open
                            markMessagesAsRead(newSelection);
                          }
                        }}
                      >
                        <div className={`p-2 rounded-lg ${
                          isSelected ? 'bg-primary/10' : 'bg-muted'
                        }`}>
                          <DeviceIcon className={`h-4 w-4 ${
                            isSelected ? 'text-primary' : 'text-muted-foreground'
                          }`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className={`font-medium text-sm truncate ${
                              isSelected ? 'text-primary' : 'text-foreground'
                            }`}>
                              {peer.deviceName}
                            </p>
                            {unreadCounts.get(peer.clientId) && (
                              <div className="bg-red-500 text-white text-xs rounded-full h-4 w-4 flex items-center justify-center">
                                {unreadCounts.get(peer.clientId)! > 9 ? '9' : unreadCounts.get(peer.clientId)}
                              </div>
                            )}
                          </div>
                          {isSelected && (
                            <p className="text-xs text-primary/70">
                              {t("device.selected")}
                            </p>
                          )}
                        </div>
                        {isSelected && (
                          <div className="w-2 h-2 bg-primary rounded-full"></div>
                        )}
                      </div>
                    </div>
                  );
                })}
                
                {/* Temporarily disconnected peers (4-second grace period) */}
                {Array.from(disconnectedPeers.values()).map(({ peer }) => {
                  const DeviceIcon = getDeviceIcon(peer.deviceName);
                  const isSelected = selectedPeer === peer.socketId;
                  
                  return (
                    <div key={`disconnected-${peer.socketId}`}>
                      <div
                        className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-all opacity-50 ${
                          isSelected
                            ? "bg-accent border-2 border-orange-400"
                            : "hover:bg-accent/30 border-2 border-transparent"
                        }`}
                        onClick={() => {
                          // Don't allow selection of disconnected devices
                          // They remain selected if already selected, but no new selection
                        }}
                      >
                        <div className={`p-2 rounded-lg ${
                          isSelected ? 'bg-orange-400/20' : 'bg-muted'
                        }`}>
                          <DeviceIcon className={`h-4 w-4 ${
                            isSelected ? 'text-orange-400' : 'text-muted-foreground'
                          }`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className={`font-medium text-sm truncate ${
                              isSelected ? 'text-orange-400' : 'text-muted-foreground'
                            }`}>
                              {peer.deviceName}
                            </p>
                            {unreadCounts.get(peer.clientId) && (
                              <div className="bg-orange-400 text-white text-xs rounded-full h-4 w-4 flex items-center justify-center">
                                {unreadCounts.get(peer.clientId)! > 9 ? '9' : unreadCounts.get(peer.clientId)}
                              </div>
                            )}
                          </div>
                          {isSelected && (
                            <p className="text-xs text-orange-400/70">
                              Reconnecting...
                            </p>
                          )}
                        </div>
                        {isSelected && (
                          <div className="w-2 h-2 bg-orange-400 rounded-full animate-pulse"></div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </>
            )}
          </div>
        </div>
        
        {/* History Button at bottom */}
        <div className="p-4 border-t border-border bg-muted/20">
          <Button
            variant={showHistory ? "default" : "ghost"}
            onClick={() => setShowHistory(!showHistory)}
            className="w-full justify-start gap-2 h-10"
          >
            <History className="h-4 w-4" />
{t("history.title")}
          </Button>
        </div>
      </div>

      {/* History Overlay */}
      {showHistory && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 animate-in fade-in-0 duration-200">
          <div className="bg-background rounded-lg shadow-xl border border-border w-full max-w-2xl h-[80vh] flex flex-col animate-in zoom-in-95 duration-200">
            {/* History Header */}
            <div className="flex items-center justify-between p-4 border-b border-border">
              <div className="flex items-center gap-2">
                <History className="h-5 w-5 text-primary" />
                <h2 className="text-lg font-semibold">{t("history.transferHistory")}</h2>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowHistory(false)}
                className="h-8 w-8 p-0"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            
            {/* History Content */}
            <div className="flex-1 overflow-hidden">
              <TransferHistory 
                isOpen={showHistory} 
                onResendFile={async (fileName, fileSize, deviceName, fileData) => {
                  try {
                    await resendFile(fileName, fileSize, deviceName, fileData);
                    toast.success(`${fileName} ${t("toast.resendSuccess")}`);
                    playNotificationSound('success');
                    setShowHistory(false); // Chiudi cronologia dopo re-send
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
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        {/* Main Header */}
        <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border-b border-gray-200/50 dark:border-gray-700/50 p-6 bg-gradient-to-r from-white to-blue-50/30 dark:from-gray-800 dark:to-blue-900/10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-2 h-8 bg-gradient-to-b from-blue-500 to-purple-600 rounded-full"></div>
              <div>
                <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-blue-800 dark:from-white dark:to-blue-200 bg-clip-text text-transparent" style={{ fontFamily: 'var(--font-silkscreen)' }}>
                  {t("transfer.title")}
                </h1>
                <p className="text-muted-foreground ml-0 font-medium">
                  {selectedPeer 
                    ? `${t("transfer.readyToSend")} ${peers.find(p => p.socketId === selectedPeer)?.deviceName}`
                    : t("transfer.selectDeviceFirst")
                  }
                </p>
              </div>
            </div>
            
            {/* Chat Button */}
            <Button
              variant="ghost"
              className="relative px-4 py-3 h-auto text-base hover:bg-accent/50 transition-all duration-200 hover:scale-105"
              onClick={() => {
                if (selectedPeer) {
                  setIsChatOpen(!isChatOpen);
                  if (!isChatOpen) {
                    // Always clear notifications when opening chat
                    markMessagesAsRead(selectedPeer);
                  }
                }
              }}
              disabled={!selectedPeer}
            >
              <MessageCircle className="h-8 w-8 mr-2" />
              <span className="font-medium">{t("chat.title")}</span>
              <span className="sr-only">Toggle chat</span>
            </Button>
          </div>
        </div>

        {/* Content Area with Chat */}
        <div className="flex-1 flex overflow-hidden">
          {/* Main Content */}
          <div className="flex-1 p-6 flex flex-col gap-6 transition-all duration-500 ease-in-out overflow-hidden">
          {/* File Drop Area */}
          <div
            className={`${(selectedFiles.length > 0 || selectedFolders.length > 0) ? 'h-32' : 'flex-1'} relative overflow-hidden border-2 border-dashed rounded-2xl text-center transition-all duration-300 cursor-pointer group ${
              isDragOver && selectedPeer
                ? "border-blue-500 bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-900/30 dark:to-purple-900/30 scale-[1.02] shadow-lg shadow-blue-500/20"
                : selectedPeer 
                ? "border-gray-300 dark:border-gray-600 hover:border-blue-400 hover:bg-gradient-to-br hover:from-gray-50 hover:to-blue-50/50 dark:hover:from-gray-800/80 dark:hover:to-blue-900/20 hover:shadow-lg hover:shadow-blue-500/10"
                : "border-gray-200 bg-gray-50/50 dark:border-gray-700 dark:bg-gray-800/50"
            }`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => selectedPeer && !isSelectingFolderRef.current && handleFileSelect()}
          >
            {/* Animated Background Pattern */}
            <div className={`absolute inset-0 opacity-5 ${isDragOver && selectedPeer ? 'animate-pulse' : ''}`}>
              <div className="absolute inset-0 bg-gradient-to-br from-blue-400 to-purple-600"></div>
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(59,130,246,0.1),transparent_70%)]"></div>
            </div>
            {/* Content with relative positioning */}
            <div className={`${(selectedFiles.length > 0 || selectedFolders.length > 0) ? 'p-4' : 'p-12'} relative z-10 transition-all duration-300 ${isDragOver && selectedPeer ? 'scale-110' : 'group-hover:scale-105'} flex flex-col items-center justify-center h-full`}>
              {/* Animated Upload Icon */}
              <div className="relative mb-4">
                <Upload className={`${(selectedFiles.length > 0 || selectedFolders.length > 0) ? 'h-10 w-10' : 'h-20 w-20'} ${
                  selectedPeer ? 'text-blue-500 dark:text-blue-400' : 'text-gray-300'
                } transition-all duration-300 ${isDragOver && selectedPeer ? 'animate-bounce' : 'group-hover:scale-110'}`} />
                {isDragOver && selectedPeer && (
                  <div className="absolute inset-0 rounded-full bg-blue-400/20 animate-ping"></div>
                )}
              </div>

              {(selectedFiles.length > 0 || selectedFolders.length > 0) ? (
                <div className="text-center">
                  <h3 className={`font-bold text-lg ${selectedPeer ? 'text-gray-900 dark:text-white' : 'text-gray-400'}`} style={{ fontFamily: 'var(--font-silkscreen)' }}>
                    {t("transfer.addMoreFiles")}
                  </h3>
                  {selectedPeer && (
                    <p className="text-sm text-blue-600 dark:text-blue-400 mt-2 font-medium">
                      {t("transfer.dragDrop")}
                    </p>
                  )}
                </div>
              ) : (
                <>
                  <h2 className={`text-2xl font-bold mb-4 transition-colors duration-300 ${
                    selectedPeer ? 'text-gray-900 dark:text-white' : 'text-gray-400'
                  }`} style={{ fontFamily: 'var(--font-silkscreen)' }}>
                    {selectedPeer ? t("transfer.dropFilesHere") : t("transfer.selectDeviceFirst2")}
                  </h2>
                  
                  <div className={`max-w-md mx-auto text-center transition-all duration-300 ${selectedPeer ? 'opacity-100' : 'opacity-70'}`}>
                    <p className="text-muted-foreground mb-6 leading-relaxed">
                      {selectedPeer 
                        ? t("transfer.multipleFiles")
                        : t("transfer.selectDeviceHelp")
                      }
                    </p>
                    
                    {selectedPeer && (
                      <div className="flex gap-4 justify-center">
                        <Button 
                          size="lg" 
                          className="shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105" 
                          onClick={(e) => {
                            e.stopPropagation();
                            e.preventDefault();
                            handleFileSelect();
                          }}
                        >
                          <Upload className="h-5 w-5 mr-2" />
                          {t("transfer.selectFiles")}
                        </Button>
                        <Button 
                          size="lg" 
                          variant="outline" 
                          className="shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105" 
                          onClick={(e) => {
                            e.stopPropagation();
                            e.preventDefault();
                            handleFolderSelect();
                          }}
                        >
                          <Folder className="h-5 w-5 mr-2" />
                          {t("transfer.selectFolder")}
                        </Button>
                      </div>
                    )}
                  </div>
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
          {(selectedFiles.length > 0 || selectedFolders.length > 0) && (
            <div className="flex-1 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl border border-gray-200/50 dark:border-gray-700/50 p-6 shadow-xl shadow-blue-500/5 overflow-hidden flex flex-col">
              {/* Files List Section */}
              <div className="flex flex-row gap-6 flex-1 overflow-hidden">
                {/* Left: File List */}
                <div className="flex-1 flex flex-col">
                  <div className="flex items-center justify-between mb-6">
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-3 h-6 bg-gradient-to-b from-blue-500 to-purple-600 rounded-full"></div>
                    <h3 className="text-xl font-bold bg-gradient-to-r from-gray-900 to-blue-800 dark:from-white dark:to-blue-200 bg-clip-text text-transparent" style={{ fontFamily: 'var(--font-silkscreen)' }}>
                      {t("transfer.queue")} ({selectedFiles.length + selectedFolders.length})
                    </h3>
                  </div>
                  <p className="text-sm text-muted-foreground ml-6 font-medium">
                    {isSending 
                      ? `${t("transfer.sendingTo")} ${peers.find(p => p.socketId === selectedPeer)?.deviceName}...`
                      : `${t("transfer.readyToSendTo")} ${peers.find(p => p.socketId === selectedPeer)?.deviceName}`
                    } - {selectedFiles.length + selectedFolders.length} ${(selectedFiles.length + selectedFolders.length) === 1 ? t("file.element") : t("file.elements")}
                  </p>
                </div>
                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={clearAllFiles}
                    disabled={isSending}
                    className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/20 border-red-200 hover:border-red-300 transition-all duration-200 disabled:opacity-50 shadow-sm"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    {t("transfer.clearAll")}
                  </Button>
                  <Button
                    onClick={handleFileSend}
                    disabled={!selectedPeer || (selectedFiles.length === 0 && selectedFolders.length === 0) || isSending || isSelectedPeerTemporarilyDisconnected}
                    size="sm"
                    className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 disabled:opacity-50 disabled:scale-100 font-semibold"
                  >
                    {isSending ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        {t("transfer.sending")}
                      </>
                    ) : (
                      <>
                        <Send className="h-4 w-4 mr-2" />
                        {t("transfer.send")} {selectedFiles.length + selectedFolders.length} {(selectedFiles.length + selectedFolders.length) === 1 ? t("file.element") : t("file.elements")}
                      </>
                    )}
                  </Button>
                </div>
              </div>

                  {/* Encryption Settings */}
                  <div className="mb-6 p-4 bg-muted/20 rounded-lg border border-muted">
                    <div className="flex items-center gap-3 mb-3">
                      {isEncryptionEnabled ? <Lock className="h-5 w-5 text-green-600" /> : <Unlock className="h-5 w-5 text-gray-400" />}
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={isEncryptionEnabled}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setIsEncryptionEnabled(e.target.checked)}
                          className="rounded border-gray-300 text-primary focus:ring-primary"
                        />
                        <span className="font-medium text-sm">{t("encryption.endToEnd")}</span>
                      </label>
                    </div>
                    {isEncryptionEnabled && (
                      <Input
                        type="password"
                        placeholder={t("encryption.passwordPlaceholder")}
                        value={encryptionPassword}
                        onChange={(e) => setEncryptionPassword(e.target.value)}
                        className="text-sm"
                      />
                    )}
                    <p className="text-xs text-muted-foreground mt-2">
                      {isEncryptionEnabled 
                        ? t("encryption.enabledDescription")
                        : t("encryption.disabledDescription")
                      }
                    </p>
                  </div>

                  {/* File and Folder List */}
                  <div className="space-y-3 flex-1 overflow-y-auto custom-scrollbar min-h-0">
                {/* Folders */}
                {selectedFolders.map((folder, index) => (
                  <div
                    key={`folder-${index}`}
                    className="group flex items-center gap-4 p-4 rounded-xl transition-all duration-200 bg-gradient-to-r from-amber-50/80 to-orange-50/30 dark:from-amber-900/20 dark:to-orange-900/10 hover:from-amber-100/80 hover:to-orange-100/40 dark:hover:from-amber-900/30 dark:hover:to-orange-900/20 border border-amber-200/50 dark:border-amber-600/30 hover:border-amber-300/50 hover:shadow-sm"
                  >
                    <div className="w-12 h-12 flex items-center justify-center rounded-lg bg-gradient-to-br from-amber-400 to-orange-500 text-white shadow-sm">
                      <Folder className="w-6 h-6" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm text-foreground truncate group-hover:text-primary transition-colors">
                        {folder.name}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <p className="text-xs text-muted-foreground font-medium">
                          {formatFileSize(folder.size)} • {folder.files.length} {folder.files.length === 1 ? t("file.file") : t("file.files")}
                        </p>
                        <span className="w-1 h-1 bg-muted-foreground/50 rounded-full"></span>
                        <p className="text-xs text-amber-600 dark:text-amber-400 font-medium">
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
                      className="h-8 w-8 p-0 text-red-500 hover:text-red-600 hover:bg-red-100 dark:hover:bg-red-900/30 disabled:opacity-50 rounded-lg transition-all duration-200 hover:scale-110"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
                
                {/* Files */}
                {selectedFiles.map((file, index) => (
                  <div
                    key={`file-${index}`}
                    className={`group flex items-center gap-4 p-4 rounded-xl transition-all duration-200 cursor-pointer ${
                      selectedFileIndex === index
                        ? 'bg-gradient-to-r from-blue-100/80 to-purple-100/40 dark:from-blue-900/50 dark:to-purple-900/30 border-2 border-blue-400/70 shadow-md'
                        : 'bg-gradient-to-r from-gray-50/80 to-blue-50/30 dark:from-gray-700/50 dark:to-blue-900/10 hover:from-gray-100/80 hover:to-blue-100/40 dark:hover:from-gray-700/80 dark:hover:to-blue-900/20 border border-gray-200/50 dark:border-gray-600/30 hover:border-blue-300/50 hover:shadow-sm'
                    }`}
                    onClick={() => setSelectedFileIndex(selectedFileIndex === index ? null : index)}
                  >
                    <FilePreview 
                      file={file} 
                      size="small" 
                      className="group-hover:scale-110 transition-transform duration-200 shadow-sm" 
                    />
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm text-foreground truncate group-hover:text-primary transition-colors">
                        {file.webkitRelativePath || file.name}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <p className="text-xs text-muted-foreground font-medium">
                          {formatFileSize(file.size)}
                        </p>
                        <span className="w-1 h-1 bg-muted-foreground/50 rounded-full"></span>
                        <p className="text-xs text-primary font-medium">
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
                      className="h-8 w-8 p-0 text-red-500 hover:text-red-600 hover:bg-red-100 dark:hover:bg-red-900/30 disabled:opacity-50 rounded-lg transition-all duration-200 hover:scale-110"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
                  </div>
                </div>

                {/* Right: File Preview */}
                {selectedFileIndex !== null && (
                  <div className="w-80 flex flex-col">
                    <div className="mb-4">
                      <h4 className="text-lg font-semibold text-foreground mb-2">{t("file.preview")}</h4>
                      <div className="bg-muted/30 rounded-lg p-4 text-center">
                        <FilePreview 
                          file={selectedFiles[selectedFileIndex]} 
                          size="large" 
                          className="mx-auto mb-4" 
                        />
                        <div className="text-left space-y-2">
                          <p className="font-medium text-sm truncate">
                            {selectedFiles[selectedFileIndex].webkitRelativePath || selectedFiles[selectedFileIndex].name}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {formatFileSize(selectedFiles[selectedFileIndex].size)}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {t("file.type")} {selectedFiles[selectedFileIndex].type || t("file.unknown")}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {t("file.modified")} {new Date(selectedFiles[selectedFileIndex].lastModified).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
          {/* Transfer Progress */}
          {transferProgress && (
            <div 
              className={`p-6 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border border-blue-200 dark:border-blue-800 rounded-xl transition-all duration-1000 ease-in-out ${
                isProgressHiding 
                  ? 'transform translate-y-full opacity-0 scale-95' 
                  : 'transform translate-y-0 opacity-100 scale-100'
              }`}
            >
              <div className="flex items-center gap-4 mb-4">
                <div className="p-3 bg-blue-100 dark:bg-blue-800 rounded-lg">
                  {transferProgress.type === 'sending' ? (
                    <FileUp className="h-8 w-8 text-blue-600 dark:text-blue-400" />
                  ) : (
                    <FileDown className="h-8 w-8 text-blue-600 dark:text-blue-400" />
                  )}
                </div>
                <div className="flex-1">
                  <p className="font-bold text-lg text-blue-900 dark:text-blue-100">
                    {transferProgress.type === 'sending' ? t("progress.sending") : t("progress.receiving")}: {transferProgress.fileName}
                  </p>
                  <p className="text-blue-600 dark:text-blue-300">
                    {Math.round(transferProgress.progress)}% {t("progress.completed")}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-4xl font-bold text-blue-600 dark:text-blue-400">
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
          <div className={`overflow-hidden transition-all duration-500 ease-in-out ${
            isChatOpen && selectedPeer ? 'w-80' : 'w-0'
          }`}>
            <div className="w-80 border-l border-border bg-background flex flex-col h-full">
              {/* Chat Header */}
              <div className="p-4 border-b border-border bg-muted/30 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <MessageCircle className="h-5 w-5 text-primary" />
                  <div>
                    <h3 className={`font-semibold ${isSelectedPeerTemporarilyDisconnected ? 'text-orange-400' : 'text-foreground'}`}>
                      {(selectedPeerData || selectedPeerDisconnected?.peer)?.deviceName || ''}
                      {isSelectedPeerTemporarilyDisconnected && <span className="text-xs ml-2 opacity-70">(Reconnecting...)</span>}
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      {selectedPeer && (selectedPeerData || selectedPeerDisconnected?.peer)
                        ? (messages.get((selectedPeerData || selectedPeerDisconnected?.peer)!.clientId) || []).length 
                        : 0} {t("chat.messages")}
                    </p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsChatOpen(false)}
                  className="h-8 w-8 p-0"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              {/* Messages */}
              <ScrollArea className="flex-1 p-4 min-h-0">
                <div className="space-y-4">
                  {selectedPeer && (selectedPeerData || selectedPeerDisconnected?.peer) && (messages.get((selectedPeerData || selectedPeerDisconnected?.peer)!.clientId) || []).length === 0 ? (
                    <div className="text-center py-8">
                      <MessageCircle className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
                      <p className="text-muted-foreground text-sm">
                        {t("chat.noMessages")}
                      </p>
                      <p className="text-xs text-muted-foreground/70 mt-1">
                        {isSelectedPeerTemporarilyDisconnected ? "Device is reconnecting..." : t("chat.startConversation")}
                      </p>
                    </div>
                  ) : selectedPeer && (selectedPeerData || selectedPeerDisconnected?.peer) ? (
                    (messages.get((selectedPeerData || selectedPeerDisconnected?.peer)!.clientId) || []).map((message) => (
                      <div
                        key={message.id}
                        className={`flex ${message.isOwn ? 'justify-end' : 'justify-start'}`}
                      >
                        <div
                          className={`max-w-[70%] rounded-lg p-3 ${
                            message.isOwn
                              ? 'bg-primary text-primary-foreground'
                              : 'bg-muted text-foreground'
                          }`}
                        >
                          <p className="text-sm whitespace-pre-wrap break-words">
                            {message.text}
                          </p>
                          <p className={`text-xs mt-1 ${
                            message.isOwn 
                              ? 'text-primary-foreground/70' 
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
                  ) : null}
                </div>
              </ScrollArea>

              {/* Input */}
              <div className="p-4 border-t border-border bg-muted/30">
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
                    placeholder={isSelectedPeerTemporarilyDisconnected ? "Device reconnecting..." : t("chat.typeMessage")}
                    className="flex-1"
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
                    className="px-3"
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Single File Request Dialog */}
      <AlertDialog open={!!incomingFileRequest}>
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
                    fileName={incomingFileRequest?.fileName || ''}
                    size="medium"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-foreground truncate">
                      {incomingFileRequest?.fileName}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {incomingFileRequest ? formatFileSize(incomingFileRequest.fileSize) : ''}
                    </div>
                  </div>
                </div>
                <div className="text-sm text-muted-foreground">
                  {incomingFileRequest?.fromName} {t("dialog.wantsToSend")} {t("message.thisFile")}. {t("dialog.acceptFile")}
                </div>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => incomingFileRequest && rejectFile(incomingFileRequest.socketId)}>
              {t("dialog.reject")}
            </AlertDialogCancel>
            <AlertDialogAction onClick={() => incomingFileRequest && acceptFile(incomingFileRequest.socketId)}>
              {t("dialog.accept")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Batch File Request Dialog */}
      <AlertDialog open={!!incomingBatchRequest}>
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
              {t("dialog.multipleFilesRequest")}
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div>
                {incomingBatchRequest?.fromName} {t("dialog.wantsToSendMultiple")} {incomingBatchRequest?.files.length} {t("dialog.files")}:
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          
          {/* File List */}
          <div className="max-h-40 overflow-y-auto space-y-2 my-4">
            {incomingBatchRequest?.files.map((file, index) => (
              <div key={index} className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg">
                <FilePreviewMetadata 
                  fileName={file.fileName}
                  size="small"
                />
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm text-foreground truncate">
                    {(file as { relativePath?: string }).relativePath || file.fileName}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formatFileSize(file.fileSize)}
                  </p>
                </div>
              </div>
            ))}
          </div>

          <div className="bg-muted p-3 rounded-lg space-y-2">
            <div className="text-sm text-foreground">
              <strong>{t("dialog.total")}:</strong> {incomingBatchRequest?.files.length} {t("dialog.files")} 
              ({incomingBatchRequest ? formatFileSize(incomingBatchRequest.files.reduce((total, file) => total + file.fileSize, 0)) : ''})
            </div>
            <div className="text-xs text-muted-foreground bg-blue-50 dark:bg-blue-950 p-2 rounded border-l-2 border-blue-400">
              📦 {t("dialog.zipInfo")}
            </div>
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel 
              onClick={() => incomingBatchRequest && rejectBatchFiles(incomingBatchRequest.socketId, incomingBatchRequest.batchId)}
            >
              {t("dialog.rejectAll")}
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => incomingBatchRequest && acceptBatchFiles(incomingBatchRequest.socketId, incomingBatchRequest.batchId)}
            >
              {t("dialog.acceptAll")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Decrypt File Dialog */}
      <AlertDialog open={showDecryptDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-3">
              <Lock className="h-6 w-6 text-green-600" />
              {t("encryption.fileEncrypted")}
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-4">
                <div>
                  {t("encryption.receivedEncrypted")} <strong>{pendingEncryptedFile?.fileName}</strong>
                </div>
                <div>
                  {t("encryption.enterPassword")}
                </div>
                {decryptAttempts > 0 && (
                  <div className="text-orange-600 dark:text-orange-400 text-sm font-medium">
                    {3 - decryptAttempts === 1 ? t("encryption.attentionAttempts") : t("encryption.attentionAttemptsPlural")} {3 - decryptAttempts}
                  </div>
                )}
                <Input
                  type="password"
                  placeholder={t("encryption.passwordPlaceholderDecrypt")}
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
              {t("encryption.cancel")}
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleDecryptFile} disabled={!decryptPassword.trim()}>
              <Lock className="h-4 w-4 mr-2" />
              {t("encryption.decryptAndDownload")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
