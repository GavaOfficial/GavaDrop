"use client";

import { useState, useCallback, useRef } from "react";
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
import { Upload, Share2, Wifi, Smartphone, Monitor, Tablet, FileDown, FileUp, Edit3, Check, X } from "lucide-react";
import { toast } from "sonner";
import { useWebRTC } from "@/hooks/useWebRTC";

export default function Home() {
  const [isDragOver, setIsDragOver] = useState(false);
  const [selectedPeer, setSelectedPeer] = useState<string | null>(null);
  const [isEditingName, setIsEditingName] = useState(false);
  const [newDeviceName, setNewDeviceName] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const { peers, deviceInfo, isConnected, sendFile, incomingFile, incomingFileRequest, transferProgress, acceptFile, rejectFile, changeDeviceName } = useWebRTC();

  const handleFileSend = useCallback(async (filesToSend: File[]) => {
    console.log('handleFileSend called with:', filesToSend.length, 'files, selectedPeer:', selectedPeer);
    if (filesToSend.length === 0 || !selectedPeer) {
      console.log('Early return: no files or no peer selected');
      return;
    }

    for (const file of filesToSend) {
      console.log('Sending file:', file.name, 'to peer:', selectedPeer);
      try {
        await sendFile(file, selectedPeer);
        toast.success(`${file.name} inviato con successo!`);
      } catch (error: any) {
        if (error.message === 'File transfer rejected') {
          toast.error(`${file.name} è stato rifiutato dal destinatario`);
        } else if (error.message === 'File request timeout') {
          toast.error(`Timeout: ${file.name} non è stato accettato in tempo`);
        } else {
          toast.error(`Errore nell'invio di ${file.name}`);
        }
        console.error('Send error:', error);
      }
    }
  }, [selectedPeer, sendFile]);

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
      toast.error('Seleziona prima un dispositivo di destinazione');
      return;
    }

    const droppedFiles = Array.from(e.dataTransfer.files);
    handleFileSend(droppedFiles);
  }, [selectedPeer, handleFileSend]);

  const handleFileSelect = useCallback(() => {
    if (!selectedPeer) {
      toast.error('Seleziona prima un dispositivo di destinazione');
      return;
    }
    fileInputRef.current?.click();
  }, [selectedPeer]);

  const handleFileInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []);
    handleFileSend(selectedFiles);
  }, [handleFileSend]);

  const handleStartEditName = useCallback(() => {
    setIsEditingName(true);
    setNewDeviceName(deviceInfo?.deviceName || '');
  }, [deviceInfo?.deviceName]);

  const handleSaveDeviceName = useCallback(() => {
    if (newDeviceName.trim() && newDeviceName.trim() !== deviceInfo?.deviceName) {
      changeDeviceName(newDeviceName.trim());
      toast.success('Nome dispositivo aggiornato!');
    }
    setIsEditingName(false);
  }, [newDeviceName, deviceInfo?.deviceName, changeDeviceName]);

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

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      <div className="container mx-auto px-4 py-8">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">
            GavaDrop
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-300">
            Condividi file facilmente nella tua rete locale
          </p>
          <div className="flex items-center justify-center mt-4 gap-2">
            <Wifi className={`h-5 w-5 ${isConnected ? 'text-green-500' : 'text-red-500'}`} />
            <Badge variant="secondary" className={`${isConnected ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
              {isConnected ? 'Connesso alla rete' : 'Disconnesso'}
            </Badge>
            {deviceInfo && (
              <div className="flex items-center gap-2 ml-2">
                {isEditingName ? (
                  <div className="flex items-center gap-2">
                    <Input
                      value={newDeviceName}
                      onChange={(e) => setNewDeviceName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleSaveDeviceName();
                        if (e.key === 'Escape') handleCancelEditName();
                      }}
                      className="h-8 w-32"
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
                  <div className="flex items-center gap-1">
                    <Badge variant="outline">
                      {deviceInfo.deviceName}
                    </Badge>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={handleStartEditName}
                      className="h-6 w-6 p-0"
                    >
                      <Edit3 className="h-3 w-3" />
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-8">
          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Share2 className="h-5 w-5" />
                Dispositivi Disponibili
              </CardTitle>
              <CardDescription>
                Seleziona un dispositivo per inviare file
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {peers.length === 0 ? (
                  <div className="col-span-2 md:col-span-4 text-center py-8">
                    <Wifi className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                    <p className="text-gray-500">
                      Nessun dispositivo trovato nella rete locale
                    </p>
                    <p className="text-sm text-gray-400 mt-2">
                      Assicurati che altri dispositivi abbiano aperto GavaDrop
                    </p>
                  </div>
                ) : (
                  peers.map((peer) => {
                    const DeviceIcon = getDeviceIcon(peer.deviceName);
                    const isSelected = selectedPeer === peer.socketId;
                    
                    return (
                      <div
                        key={peer.socketId}
                        className={`p-4 border-2 rounded-lg cursor-pointer transition-colors text-center ${
                          isSelected
                            ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
                            : "border-gray-200 hover:border-gray-300 dark:border-gray-700 dark:hover:border-gray-600"
                        }`}
                        onClick={() => {
                          const newSelection = isSelected ? null : peer.socketId;
                          console.log('Selecting peer:', newSelection);
                          setSelectedPeer(newSelection);
                        }}
                      >
                        <DeviceIcon className="h-8 w-8 mx-auto mb-2 text-gray-600" />
                        <p className="font-medium text-sm">{peer.deviceName}</p>
                        {isSelected && (
                          <Badge variant="secondary" className="mt-2">
                            Selezionato
                          </Badge>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Upload className="h-5 w-5" />
                Invia File
              </CardTitle>
              <CardDescription>
                {selectedPeer 
                  ? `Trascina i file qui per inviarli al dispositivo selezionato`
                  : `Seleziona prima un dispositivo di destinazione`
                }
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div
                className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                  isDragOver && selectedPeer
                    ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
                    : selectedPeer 
                    ? "border-gray-300 dark:border-gray-600 hover:border-gray-400"
                    : "border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-800"
                }`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
              >
                <Upload className={`h-12 w-12 mx-auto mb-4 ${selectedPeer ? 'text-gray-400' : 'text-gray-300'}`} />
                <p className="text-lg font-medium mb-2">
                  {selectedPeer ? 'Trascina i file qui' : 'Seleziona prima un dispositivo'}
                </p>
                <p className="text-sm text-gray-500 mb-4">
                  {selectedPeer ? 'Oppure clicca per selezionare i file dal tuo dispositivo' : 'I file saranno inviati direttamente tramite WebRTC'}
                </p>
                <Button onClick={handleFileSelect} disabled={!selectedPeer}>
                  Seleziona File
                </Button>
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  onChange={handleFileInputChange}
                  className="hidden"
                />
              </div>
              
              {transferProgress && (
                <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    {transferProgress.type === 'sending' ? (
                      <FileUp className="h-5 w-5 text-blue-600" />
                    ) : (
                      <FileDown className="h-5 w-5 text-blue-600" />
                    )}
                    <div className="flex-1">
                      <p className="font-medium text-blue-800 dark:text-blue-200">
                        {transferProgress.type === 'sending' ? 'Inviando' : 'Ricevendo'}: {transferProgress.fileName}
                      </p>
                      <p className="text-sm text-blue-600 dark:text-blue-300">
                        {Math.round(transferProgress.progress)}% completato
                      </p>
                    </div>
                  </div>
                  <Progress value={transferProgress.progress} className="w-full" />
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* File Request Dialog */}
        <AlertDialog open={!!incomingFileRequest}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Richiesta di File</AlertDialogTitle>
              <AlertDialogDescription>
                {incomingFileRequest?.fromName} vuole inviarti il file "{incomingFileRequest?.fileName}" 
                ({incomingFileRequest ? formatFileSize(incomingFileRequest.fileSize) : ''}).
                <br />
                Vuoi accettare questo file?
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => incomingFileRequest && rejectFile(incomingFileRequest.socketId)}>
                Rifiuta
              </AlertDialogCancel>
              <AlertDialogAction onClick={() => incomingFileRequest && acceptFile(incomingFileRequest.socketId)}>
                Accetta
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}
