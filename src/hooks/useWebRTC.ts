"use client";

import { useEffect, useRef, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';

export interface Peer {
  deviceId: string;
  deviceName: string;
  socketId: string;
}

export interface DeviceInfo {
  deviceId: string;
  deviceName: string;
}

interface WebRTCConnection {
  peerConnection: RTCPeerConnection;
  dataChannel?: RTCDataChannel;
}

export const useWebRTC = () => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [peers, setPeers] = useState<Peer[]>([]);
  const [deviceInfo, setDeviceInfo] = useState<DeviceInfo | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const connections = useRef<Map<string, WebRTCConnection>>(new Map());
  const [incomingFile, setIncomingFile] = useState<{from: string, fileName: string, fileSize: number, socketId: string} | null>(null);
  const [incomingFileRequest, setIncomingFileRequest] = useState<{from: string, fromName: string, fileName: string, fileSize: number, socketId: string} | null>(null);
  const [incomingBatchRequest, setIncomingBatchRequest] = useState<{from: string, fromName: string, files: {fileName: string, fileSize: number}[], socketId: string, batchId: string} | null>(null);
  const [transferProgress, setTransferProgress] = useState<{socketId: string, fileName: string, progress: number, type: 'sending' | 'receiving'} | null>(null);

  const acceptFile = useCallback((socketId: string) => {
    if (socket) {
      socket.emit('file-response', { target: socketId, accepted: true });
      setIncomingFileRequest(null);
    }
  }, [socket]);

  const rejectFile = useCallback((socketId: string) => {
    if (socket) {
      socket.emit('file-response', { target: socketId, accepted: false });
      setIncomingFileRequest(null);
    }
  }, [socket]);

  const acceptBatchFiles = useCallback((socketId: string, batchId: string) => {
    if (socket) {
      socket.emit('batch-file-response', { target: socketId, accepted: true, batchId });
      setIncomingBatchRequest(null);
    }
  }, [socket]);

  const rejectBatchFiles = useCallback((socketId: string, batchId: string) => {
    if (socket) {
      socket.emit('batch-file-response', { target: socketId, accepted: false, batchId });
      setIncomingBatchRequest(null);
    }
  }, [socket]);

  const changeDeviceName = useCallback((newName: string) => {
    if (socket && newName.trim()) {
      // Save to localStorage
      localStorage.setItem('gavadrop-device-name', newName.trim());
      socket.emit('change-device-name', { newName: newName.trim() });
    }
  }, [socket]);

  const sendFile = useCallback(async (file: File, targetSocketId: string) => {
    console.log('sendFile called for:', file.name, 'to:', targetSocketId);
    let connection = connections.current.get(targetSocketId);
    
    try {
      if (!connection || !connection.dataChannel) {
        console.log('Creating new connection...');
        if (!socket) {
          console.error('Socket not connected');
          throw new Error('Socket not connected');
        }

        const peerConnection = new RTCPeerConnection({
          iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
        });

        peerConnection.onicecandidate = (event) => {
          console.log('ICE candidate generated');
          if (event.candidate && socket) {
            socket.emit('webrtc-ice-candidate', {
              target: targetSocketId,
              candidate: event.candidate
            });
          }
        };

        const dataChannel = peerConnection.createDataChannel('fileTransfer', {
          ordered: true
        });

        dataChannel.onopen = () => {
          console.log('Data channel opened with', targetSocketId);
        };

        connection = {
          peerConnection,
          dataChannel
        };
        
        connections.current.set(targetSocketId, connection);

        console.log('Creating offer...');
        const offer = await peerConnection.createOffer();
        await peerConnection.setLocalDescription(offer);
        
        console.log('Sending offer to', targetSocketId);
        socket.emit('webrtc-offer', {
          target: targetSocketId,
          offer: offer
        });

        console.log('Waiting for data channel to open...');
        await new Promise<void>((resolve, reject) => {
          const timeout = setTimeout(() => reject(new Error('Data channel timeout')), 10000);
          dataChannel.onopen = () => {
            clearTimeout(timeout);
            console.log('Data channel ready!');
            resolve();
          };
        });
      }

      // Send file request first
      console.log('Sending file request...');
      socket.emit('file-request', {
        target: targetSocketId,
        fileName: file.name,
        fileSize: file.size,
        fromName: deviceInfo?.deviceName || 'Unknown Device'
      });

      // Wait for acceptance
      const fileAccepted = await new Promise<boolean>((resolve, reject) => {
        const handleResponse = (data: { accepted: boolean, from: string }) => {
          if (data.from === targetSocketId) {
            clearTimeout(timeout);
            socket.off('file-response', handleResponse);
            resolve(data.accepted);
          }
        };
        
        const timeout = setTimeout(() => {
          socket.off('file-response', handleResponse);
          reject(new Error('File request timeout'));
        }, 30000);
        
        socket.on('file-response', handleResponse);
      });

      if (!fileAccepted) {
        // Don't close connection on rejection, just throw error
        throw new Error('File transfer rejected');
      }

    const conn = connections.current.get(targetSocketId);
    if (!conn?.dataChannel || conn.dataChannel.readyState !== 'open') {
      console.error('Data channel not ready, state:', conn?.dataChannel?.readyState);
      throw new Error('Data channel not ready');
    }

    console.log('Starting file transfer...');
    const dataChannel = conn.dataChannel;
    
    setTransferProgress({
      socketId: targetSocketId,
      fileName: file.name,
      progress: 0,
      type: 'sending'
    });
    
    dataChannel.send(JSON.stringify({
      type: 'file-info',
      fileName: file.name,
      fileSize: file.size
    }));

    const chunkSize = 16384;
    let offset = 0;

    const sendChunk = async () => {
      const chunk = file.slice(offset, offset + chunkSize);
      const arrayBuffer = await chunk.arrayBuffer();
      
      if (dataChannel.readyState === 'open') {
        dataChannel.send(arrayBuffer);
        offset += chunkSize;
        
        const progress = Math.min((offset / file.size) * 100, 100);
        setTransferProgress(prev => prev ? { ...prev, progress } : null);
        
        // Send progress update to receiver
        socket.emit('transfer-progress', {
          target: targetSocketId,
          progress,
          fileName: file.name
        });

        if (offset < file.size) {
          setTimeout(sendChunk, 10);
        } else {
          dataChannel.send(JSON.stringify({ type: 'file-complete' }));
          setTransferProgress(null);
          
          // Keep connection open for future transfers  
          // Don't close the connection here anymore
        }
      }
    };

      sendChunk();
    } catch (error: any) {
      setTransferProgress(null);
      
      // Only clean up connection on non-rejection errors
      if (error.message !== 'File transfer rejected') {
        const connection = connections.current.get(targetSocketId);
        if (connection) {
          connection.peerConnection.close();
          connections.current.delete(targetSocketId);
        }
      }
      
      throw error;
    }
  }, [socket, deviceInfo]);

  const sendBatchFiles = useCallback(async (files: File[], targetSocketId: string) => {
    console.log('sendBatchFiles called with:', files.length, 'files, to:', targetSocketId);
    
    if (!socket) {
      throw new Error('Socket not connected');
    }

    // Generate unique batch ID
    const batchId = `batch_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Prepare file info for batch request
    const fileInfos = files.map(file => ({
      fileName: file.name,
      fileSize: file.size
    }));

    // Send batch file request
    socket.emit('batch-file-request', {
      target: targetSocketId,
      files: fileInfos,
      fromName: deviceInfo?.deviceName || 'Unknown Device',
      batchId
    });

    // Wait for batch response
    const batchAccepted = await new Promise<boolean>((resolve, reject) => {
      const handleBatchResponse = (data: { accepted: boolean, batchId: string, from: string }) => {
        if (data.from === targetSocketId && data.batchId === batchId) {
          clearTimeout(timeout);
          socket.off('batch-file-response', handleBatchResponse);
          resolve(data.accepted);
        }
      };
      
      const timeout = setTimeout(() => {
        socket.off('batch-file-response', handleBatchResponse);
        reject(new Error('Batch file request timeout'));
      }, 30000);
      
      socket.on('batch-file-response', handleBatchResponse);
    });

    if (!batchAccepted) {
      throw new Error('Batch file transfer rejected');
    }

    // If accepted, send all files sequentially
    for (const file of files) {
      await sendFile(file, targetSocketId);
    }
  }, [socket, deviceInfo, sendFile]);

  useEffect(() => {
    const socketInstance = io('http://localhost:3002');
    
    // Send saved device name on connection
    const savedName = localStorage.getItem('gavadrop-device-name');
    if (savedName) {
      socketInstance.on('connect', () => {
        socketInstance.emit('set-device-name', { deviceName: savedName });
      });
    }
    
    const handleWebRTCOffer = async (data: { offer: RTCSessionDescriptionInit, from: string }) => {
      if (connections.current.has(data.from)) {
        return connections.current.get(data.from)!;
      }

      const peerConnection = new RTCPeerConnection({
        iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
      });

      peerConnection.onicecandidate = (event) => {
        if (event.candidate) {
          socketInstance.emit('webrtc-ice-candidate', {
            target: data.from,
            candidate: event.candidate
          });
        }
      };

      peerConnection.ondatachannel = (event) => {
        let receivedBuffer: ArrayBuffer[] = [];
        let receivedSize = 0;
        let expectedSize = 0;
        let fileName = '';
        
        event.channel.onopen = () => {
          console.log('Data channel opened with', data.from);
        };

        event.channel.onmessage = (event) => {
          if (typeof event.data === 'string') {
            const message = JSON.parse(event.data);
            
            if (message.type === 'file-info') {
              fileName = message.fileName;
              expectedSize = message.fileSize;
              receivedBuffer = [];
              receivedSize = 0;
              
              setIncomingFile({
                from: data.from,
                fileName: message.fileName,
                fileSize: message.fileSize,
                socketId: data.from
              });
              
              setTransferProgress({
                socketId: data.from,
                fileName: message.fileName,
                progress: 0,
                type: 'receiving'
              });
            } else if (message.type === 'file-complete') {
              const blob = new Blob(receivedBuffer);
              const url = URL.createObjectURL(blob);
              
              const a = document.createElement('a');
              a.href = url;
              a.download = fileName;
              document.body.appendChild(a);
              a.click();
              document.body.removeChild(a);
              URL.revokeObjectURL(url);
              
              setIncomingFile(null);
              setTransferProgress(null);
              
              // Keep connection open for future transfers
              // Don't close the connection here anymore
            }
          } else {
            receivedBuffer.push(event.data);
            receivedSize += event.data.byteLength;
            
            const progress = Math.min((receivedSize / expectedSize) * 100, 100);
            setTransferProgress(prev => prev ? { ...prev, progress } : null);
          }
        };

        const connection = connections.current.get(data.from);
        if (connection) {
          connection.dataChannel = event.channel;
        }
      };

      const connection: WebRTCConnection = {
        peerConnection,
        dataChannel: undefined
      };
      
      connections.current.set(data.from, connection);
      
      await peerConnection.setRemoteDescription(data.offer);
      
      const answer = await peerConnection.createAnswer();
      await peerConnection.setLocalDescription(answer);
      
      socketInstance.emit('webrtc-answer', {
        target: data.from,
        answer: answer
      });
    };
    
    socketInstance.on('connect', () => {
      setIsConnected(true);
      setSocket(socketInstance);
    });

    socketInstance.on('disconnect', () => {
      setIsConnected(false);
    });

    socketInstance.on('device-info', (info: DeviceInfo) => {
      setDeviceInfo(info);
    });

    socketInstance.on('device-name-updated', (info: DeviceInfo) => {
      setDeviceInfo(info);
    });

    socketInstance.on('peers-list', (peersList: Peer[]) => {
      setPeers(peersList);
    });

    socketInstance.on('peer-joined', (peer: Peer) => {
      setPeers(prev => {
        // Check if peer already exists to avoid duplicates
        const existingIndex = prev.findIndex(p => p.socketId === peer.socketId);
        if (existingIndex !== -1) {
          // Update existing peer
          const updated = [...prev];
          updated[existingIndex] = peer;
          return updated;
        }
        // Add new peer
        return [...prev, peer];
      });
    });

    socketInstance.on('peer-left', (data: { socketId: string }) => {
      setPeers(prev => prev.filter(p => p.socketId !== data.socketId));
      connections.current.delete(data.socketId);
    });

    socketInstance.on('peer-name-changed', (data: { socketId: string, deviceName: string }) => {
      setPeers(prev => prev.map(peer => 
        peer.socketId === data.socketId 
          ? { ...peer, deviceName: data.deviceName }
          : peer
      ));
    });

    socketInstance.on('webrtc-offer', handleWebRTCOffer);

    socketInstance.on('webrtc-answer', async (data: { answer: RTCSessionDescriptionInit, from: string }) => {
      const connection = connections.current.get(data.from);
      if (connection) {
        await connection.peerConnection.setRemoteDescription(data.answer);
      }
    });

    socketInstance.on('webrtc-ice-candidate', async (data: { candidate: RTCIceCandidateInit, from: string }) => {
      const connection = connections.current.get(data.from);
      if (connection) {
        await connection.peerConnection.addIceCandidate(data.candidate);
      }
    });

    socketInstance.on('file-request', (data: { fileName: string, fileSize: number, fromName: string, from: string }) => {
      setIncomingFileRequest({
        fileName: data.fileName,
        fileSize: data.fileSize,
        fromName: data.fromName,
        from: data.fromName,
        socketId: data.from
      });
    });

    socketInstance.on('batch-file-request', (data: { files: {fileName: string, fileSize: number}[], fromName: string, from: string, batchId: string }) => {
      setIncomingBatchRequest({
        files: data.files,
        fromName: data.fromName,
        from: data.fromName,
        socketId: data.from,
        batchId: data.batchId
      });
    });

    socketInstance.on('file-response', (data: { accepted: boolean, from: string }) => {
      // This is handled in the sendFile function
    });

    socketInstance.on('batch-file-response', (data: { accepted: boolean, batchId: string, from: string }) => {
      // This is handled in the sendBatchFiles function
    });

    socketInstance.on('transfer-progress', (data: { progress: number, fileName: string, from: string }) => {
      setTransferProgress({
        socketId: data.from,
        fileName: data.fileName,
        progress: data.progress,
        type: 'receiving'
      });
    });

    setSocket(socketInstance);

    return () => {
      socketInstance.disconnect();
      connections.current.forEach(conn => {
        conn.peerConnection.close();
      });
      connections.current.clear();
    };
  }, []);

  return {
    peers,
    deviceInfo,
    isConnected,
    sendFile,
    sendBatchFiles,
    incomingFile,
    incomingFileRequest,
    incomingBatchRequest,
    transferProgress,
    acceptFile,
    rejectFile,
    acceptBatchFiles,
    rejectBatchFiles,
    changeDeviceName
  };
};