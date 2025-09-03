"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Upload, Share2, Wifi, Smartphone, Monitor, Tablet, FileDown, FileUp, Edit3, Check, X, File, Trash2, Send, MessageCircle } from "lucide-react";
import Image from "next/image";
import { toast } from "sonner";
import { useWebRTC } from "@/hooks/useWebRTC";
import { ThemeToggle } from "@/components/theme-toggle";
import { LanguageToggle } from "@/components/language-toggle";
import { useLanguage } from "@/contexts/language-context";
import { ScrollArea } from "@/components/ui/scroll-area";

export default function Home() {
  const [isDragOver, setIsDragOver] = useState(false);
  const [selectedPeer, setSelectedPeer] = useState<string | null>(null);
  const [isEditingName, setIsEditingName] = useState(false);
  const [newDeviceName, setNewDeviceName] = useState('');
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [isSending, setIsSending] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [inputMessage, setInputMessage] = useState("");
  const [lastSelectedClientId, setLastSelectedClientId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isStateLoaded, setIsStateLoaded] = useState(false);
  
  const { t } = useLanguage();
  
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
    incomingFile, 
    incomingFileRequest,
    incomingBatchRequest,
    transferProgress, 
    acceptFile, 
    rejectFile,
    acceptBatchFiles,
    rejectBatchFiles,
    changeDeviceName 
  } = useWebRTC();

  // Clear file metadata when files are successfully sent or cleared
  const clearSavedFiles = useCallback(() => {
    const clientId = localStorage.getItem('gavadrop-client-id');
    if (clientId) {
      localStorage.removeItem(`gavadrop-files-${clientId}`);
    }
  }, []);

  const handleFileSend = useCallback(async () => {
    console.log('handleFileSend called with:', selectedFiles.length, 'files, selectedPeer:', selectedPeer);
    if (selectedFiles.length === 0 || !selectedPeer) {
      console.log('Early return: no files or no peer selected');
      return;
    }

    setIsSending(true);
    
    try {
      if (selectedFiles.length === 1) {
        // Single file - use normal send
        await sendFile(selectedFiles[0], selectedPeer);
        toast.success(`${selectedFiles[0].name} ${t("toast.sentSuccess")}`);
      } else {
        // Multiple files - use batch send
        await sendBatchFiles(selectedFiles, selectedPeer);
        toast.success(`${selectedFiles.length} ${t("toast.sentSuccessMultiple")}`);
      }
      
      // Clear selected files only after successful sending
      setSelectedFiles([]);
      clearSavedFiles();
    } catch (error: any) {
      if (error.message === 'Batch file transfer rejected') {
        toast.error(t("toast.rejected"));
      } else if (error.message === 'Batch file request timeout') {
        toast.error(t("toast.timeout"));
      } else if (error.message === 'File transfer rejected') {
        toast.error(t("toast.fileRejected"));
      } else if (error.message === 'File request timeout') {
        toast.error(t("toast.fileTimeout"));
      } else {
        toast.error(t("toast.sendError"));
      }
      console.error('Send error:', error);
      
      // Clear files even on error to reset the UI
      setSelectedFiles([]);
    } finally {
      setIsSending(false);
    }
  }, [selectedFiles, selectedPeer, sendFile, sendBatchFiles, clearSavedFiles, t]);

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
    setSelectedFiles(prev => [...prev, ...droppedFiles]);
    toast.success(`${droppedFiles.length} ${t("toast.filesAdded")}`);
  }, [selectedPeer]);

  const handleFileSelect = useCallback(() => {
    if (!selectedPeer) {
      toast.error(t("toast.selectDeviceFirst"));
      return;
    }
    fileInputRef.current?.click();
  }, [selectedPeer, t]);

  const handleFileInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const newFiles = Array.from(e.target.files || []);
    setSelectedFiles(prev => [...prev, ...newFiles]);
    toast.success(`${newFiles.length} ${t("toast.filesAdded")}`);
    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [t]);

  const removeFile = useCallback((index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  }, []);

  const clearAllFiles = useCallback(() => {
    setSelectedFiles([]);
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
      let hadSavedFiles = false;
      if (savedFiles) {
        try {
          const fileData = JSON.parse(savedFiles);
          if (fileData.files && fileData.files.length > 0) {
            hadSavedFiles = true;
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

      // Show restoration message if we have saved state
      if (savedInputMessage || savedLastSelectedClientId || savedChatOpen) {
        setTimeout(() => {
          const message = hadSavedFiles 
            ? `${t("toast.sessionRestored")} ${t("toast.pleaseReselectFiles")}`
            : t("toast.sessionRestored");
          toast.success(message);
        }, 1000); // Delay to avoid toast showing before UI is ready
      }
    }
    setIsStateLoaded(true);
  }, []);

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
                  const unreadCount = unreadCounts.get(peer.socketId) || 0;
                  
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
      </div>

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
            className={`${selectedFiles.length > 0 ? 'h-32' : 'flex-1'} relative overflow-hidden border-2 border-dashed rounded-2xl text-center transition-all duration-300 cursor-pointer group ${
              isDragOver && selectedPeer
                ? "border-blue-500 bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-900/30 dark:to-purple-900/30 scale-[1.02] shadow-lg shadow-blue-500/20"
                : selectedPeer 
                ? "border-gray-300 dark:border-gray-600 hover:border-blue-400 hover:bg-gradient-to-br hover:from-gray-50 hover:to-blue-50/50 dark:hover:from-gray-800/80 dark:hover:to-blue-900/20 hover:shadow-lg hover:shadow-blue-500/10"
                : "border-gray-200 bg-gray-50/50 dark:border-gray-700 dark:bg-gray-800/50"
            }`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => selectedPeer && handleFileSelect()}
          >
            {/* Animated Background Pattern */}
            <div className={`absolute inset-0 opacity-5 ${isDragOver && selectedPeer ? 'animate-pulse' : ''}`}>
              <div className="absolute inset-0 bg-gradient-to-br from-blue-400 to-purple-600"></div>
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(59,130,246,0.1),transparent_70%)]"></div>
            </div>
            {/* Content with relative positioning */}
            <div className={`${selectedFiles.length > 0 ? 'p-4' : 'p-12'} relative z-10 transition-all duration-300 ${isDragOver && selectedPeer ? 'scale-110' : 'group-hover:scale-105'} flex flex-col items-center justify-center h-full`}>
              {/* Animated Upload Icon */}
              <div className="relative mb-4">
                <Upload className={`${selectedFiles.length > 0 ? 'h-10 w-10' : 'h-20 w-20'} ${
                  selectedPeer ? 'text-blue-500 dark:text-blue-400' : 'text-gray-300'
                } transition-all duration-300 ${isDragOver && selectedPeer ? 'animate-bounce' : 'group-hover:scale-110'}`} />
                {isDragOver && selectedPeer && (
                  <div className="absolute inset-0 rounded-full bg-blue-400/20 animate-ping"></div>
                )}
              </div>

              {selectedFiles.length > 0 ? (
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
                      <Button size="lg" className="shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105">
                        <Upload className="h-5 w-5 mr-2" />
                        {t("transfer.clickToBrowse")}
                      </Button>
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
            </div>
          </div>

          {/* Selected Files List */}
          {selectedFiles.length > 0 && (
            <div className="flex-1 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl border border-gray-200/50 dark:border-gray-700/50 p-6 shadow-xl shadow-blue-500/5 overflow-hidden flex flex-col">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-3 h-6 bg-gradient-to-b from-blue-500 to-purple-600 rounded-full"></div>
                    <h3 className="text-xl font-bold bg-gradient-to-r from-gray-900 to-blue-800 dark:from-white dark:to-blue-200 bg-clip-text text-transparent" style={{ fontFamily: 'var(--font-silkscreen)' }}>
                      {t("transfer.queue")} ({selectedFiles.length})
                    </h3>
                  </div>
                  <p className="text-sm text-muted-foreground ml-6 font-medium">
                    {isSending 
                      ? `${t("transfer.sendingTo")} ${peers.find(p => p.socketId === selectedPeer)?.deviceName}...`
                      : `${t("transfer.readyToSendTo")} ${peers.find(p => p.socketId === selectedPeer)?.deviceName}`
                    }
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
                    disabled={!selectedPeer || selectedFiles.length === 0 || isSending || isSelectedPeerTemporarilyDisconnected}
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
                        {t("transfer.send")} {selectedFiles.length} {t("transfer.sendFiles")}{selectedFiles.length !== 1 ? 's' : ''}
                      </>
                    )}
                  </Button>
                </div>
              </div>

              {/* File List */}
              <div className="space-y-3 flex-1 overflow-y-auto custom-scrollbar min-h-0">
                {selectedFiles.map((file, index) => (
                  <div
                    key={index}
                    className="group flex items-center gap-4 p-4 bg-gradient-to-r from-gray-50/80 to-blue-50/30 dark:from-gray-700/50 dark:to-blue-900/10 rounded-xl hover:from-gray-100/80 hover:to-blue-100/40 dark:hover:from-gray-700/80 dark:hover:to-blue-900/20 transition-all duration-200 border border-gray-200/50 dark:border-gray-600/30 hover:border-blue-300/50 hover:shadow-sm"
                  >
                    <div className="p-2 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg shadow-sm group-hover:scale-110 transition-transform duration-200">
                      <File className="h-5 w-5 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm text-foreground truncate group-hover:text-primary transition-colors">
                        {file.name}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <p className="text-xs text-muted-foreground font-medium">
                          {formatFileSize(file.size)}
                        </p>
                        <span className="w-1 h-1 bg-muted-foreground/50 rounded-full"></span>
                        <p className="text-xs text-primary font-medium">
                          #{index + 1}
                        </p>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeFile(index)}
                      disabled={isSending}
                      className="h-8 w-8 p-0 text-red-500 hover:text-red-600 hover:bg-red-100 dark:hover:bg-red-900/30 disabled:opacity-50 rounded-lg transition-all duration-200 hover:scale-110"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}
          {/* Transfer Progress */}
          {transferProgress && (
            <div className="p-6 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border border-blue-200 dark:border-blue-800 rounded-xl">
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
                    onKeyPress={(e) => {
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
            <AlertDialogDescription>
              {incomingFileRequest?.fromName} {t("dialog.wantsToSend")} "{incomingFileRequest?.fileName}" 
              ({incomingFileRequest ? formatFileSize(incomingFileRequest.fileSize) : ''}).
              <br />
              {t("dialog.acceptFile")}
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
            <AlertDialogDescription>
              {incomingBatchRequest?.fromName} {t("dialog.wantsToSendMultiple")} {incomingBatchRequest?.files.length} {t("dialog.files")}:
            </AlertDialogDescription>
          </AlertDialogHeader>
          
          {/* File List */}
          <div className="max-h-40 overflow-y-auto space-y-2 my-4">
            {incomingBatchRequest?.files.map((file, index) => (
              <div key={index} className="flex items-center gap-3 p-2 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <File className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm text-gray-900 dark:text-gray-100 truncate">
                    {file.fileName}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {formatFileSize(file.fileSize)}
                  </p>
                </div>
              </div>
            ))}
          </div>

          <div className="bg-muted p-3 rounded-lg">
            <p className="text-sm text-foreground">
              <strong>{t("dialog.total")}:</strong> {incomingBatchRequest?.files.length} {t("dialog.files")} 
              ({incomingBatchRequest ? formatFileSize(incomingBatchRequest.files.reduce((total, file) => total + file.fileSize, 0)) : ''})
            </p>
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
    </div>
  );
}
