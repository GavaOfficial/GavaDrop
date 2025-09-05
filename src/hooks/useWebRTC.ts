"use client";

import { useEffect, useRef, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';

export interface Peer {
  deviceId: string;
  deviceName: string;
  socketId: string;
  clientId: string;
}

export interface DeviceInfo {
  deviceId: string;
  deviceName: string;
}

export interface Message {
  id: string;
  text: string;
  timestamp: number;
  fromSocketId: string;
  fromName: string;
  isOwn: boolean;
}

interface WebRTCConnection {
  peerConnection: RTCPeerConnection;
  dataChannel?: RTCDataChannel;
}

export const useWebRTC = (onFileReceived?: (data: ArrayBuffer, fileName: string, relativePath: string, fromSocketId: string) => boolean) => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [peers, setPeers] = useState<Peer[]>([]);
  const [deviceInfo, setDeviceInfo] = useState<DeviceInfo | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const connections = useRef<Map<string, WebRTCConnection>>(new Map());
  const [incomingFile, setIncomingFile] = useState<{from: string, fileName: string, fileSize: number, socketId: string} | null>(null);
  const [incomingFileRequest, setIncomingFileRequest] = useState<{from: string, fromName: string, fileName: string, fileSize: number, socketId: string} | null>(null);
  const [incomingBatchRequest, setIncomingBatchRequest] = useState<{from: string, fromName: string, files: {fileName: string, fileSize: number}[], socketId: string, batchId: string} | null>(null);
  const [transferProgress, setTransferProgress] = useState<{socketId: string, fileName: string, progress: number, type: 'sending' | 'receiving'} | null>(null);
  const [messages, setMessages] = useState<Map<string, Message[]>>(new Map());
  const [unreadCounts, setUnreadCounts] = useState<Map<string, number>>(new Map());
  const messageIdCounter = useRef(0);
  const [disconnectedPeers, setDisconnectedPeers] = useState<Map<string, { peer: Peer, disconnectedAt: number }>>(new Map());
  const disconnectionTimers = useRef<Map<string, NodeJS.Timeout>>(new Map());

  // Generate unique message ID
  const generateMessageId = useCallback(() => {
    messageIdCounter.current += 1;
    return `msg_${Date.now()}_${messageIdCounter.current}_${Math.random().toString(36).substr(2, 6)}`;
  }, []);

  // Clear all chat data (for debugging)
  const clearAllChatData = useCallback(() => {
    const clientId = localStorage.getItem('gavadrop-client-id');
    if (clientId) {
      localStorage.removeItem(`gavadrop-messages-${clientId}`);
      localStorage.removeItem(`gavadrop-unread-${clientId}`);
      setMessages(new Map());
      setUnreadCounts(new Map());
      messageIdCounter.current = 0;
      console.log('Cleared all chat data');
    }
  }, []);

  // Load messages and unread counts from localStorage on component mount
  useEffect(() => {
    const clientId = localStorage.getItem('gavadrop-client-id');
    if (clientId) {
      // Load messages
      const savedMessages = localStorage.getItem(`gavadrop-messages-${clientId}`);
      if (savedMessages) {
        try {
          const parsedMessages = JSON.parse(savedMessages);
          const messageMap = new Map();
          Object.entries(parsedMessages).forEach(([peerId, msgs]) => {
            // Filter out messages with old ID format and regenerate IDs for uniqueness
            const validMessages = (msgs as Message[]).map((msg, index) => ({
              ...msg,
              id: `msg_${msg.timestamp}_${index + 1}_${Math.random().toString(36).substr(2, 6)}`
            }));
            messageMap.set(peerId, validMessages);
          });
          setMessages(messageMap);
        } catch (error) {
          console.error('Error loading saved messages:', error);
          // Clear corrupted data
          localStorage.removeItem(`gavadrop-messages-${clientId}`);
        }
      }

      // Load unread counts
      const savedUnreadCounts = localStorage.getItem(`gavadrop-unread-${clientId}`);
      if (savedUnreadCounts) {
        try {
          const parsedUnreadCounts = JSON.parse(savedUnreadCounts);
          const unreadMap = new Map();
          Object.entries(parsedUnreadCounts).forEach(([peerId, count]) => {
            if (typeof count === 'number' && count > 0) {
              unreadMap.set(peerId, count);
            }
          });
          setUnreadCounts(unreadMap);
        } catch (error) {
          console.error('Error loading saved unread counts:', error);
          localStorage.removeItem(`gavadrop-unread-${clientId}`);
        }
      }
    }
  }, []);

  // Save messages to localStorage whenever messages change
  useEffect(() => {
    const clientId = localStorage.getItem('gavadrop-client-id');
    if (clientId && messages.size > 0) {
      const messagesToSave: { [key: string]: Message[] } = {};
      messages.forEach((msgs, peerId) => {
        messagesToSave[peerId] = msgs;
      });
      localStorage.setItem(`gavadrop-messages-${clientId}`, JSON.stringify(messagesToSave));
    }
  }, [messages]);

  // Save unread counts to localStorage whenever they change
  useEffect(() => {
    const clientId = localStorage.getItem('gavadrop-client-id');
    if (clientId) {
      const unreadCountsToSave: { [key: string]: number } = {};
      unreadCounts.forEach((count, peerId) => {
        if (count > 0) {
          unreadCountsToSave[peerId] = count;
        }
      });
      localStorage.setItem(`gavadrop-unread-${clientId}`, JSON.stringify(unreadCountsToSave));
    }
  }, [unreadCounts]);

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

  const sendMessage = useCallback(async (text: string, targetSocketId: string) => {
    if (!socket || !text.trim()) return;

    console.log('sendMessage called:', { text, targetSocketId, peers });

    const targetPeer = peers.find(p => p.socketId === targetSocketId);
    console.log('targetPeer found:', targetPeer);
    
    if (!targetPeer) {
      console.error('No target peer found for socketId:', targetSocketId);
      return;
    }

    if (!targetPeer.clientId) {
      console.error('Target peer has no clientId:', targetPeer);
      return;
    }

    const message: Message = {
      id: generateMessageId(),
      text: text.trim(),
      timestamp: Date.now(),
      fromSocketId: socket.id || '',
      fromName: deviceInfo?.deviceName || 'You',
      isOwn: true
    };

    console.log('Sending message:', message, 'to clientId:', targetPeer.clientId);

    // Add to local messages immediately using clientId as key
    setMessages(prev => {
      const newMap = new Map(prev);
      const chatMessages = newMap.get(targetPeer.clientId) || [];
      newMap.set(targetPeer.clientId, [...chatMessages, message]);
      console.log('Updated messages map:', newMap);
      return newMap;
    });

    // Send via WebRTC data channel if available, otherwise via socket
    const connection = connections.current.get(targetSocketId);
    if (connection?.dataChannel && connection.dataChannel.readyState === 'open') {
      connection.dataChannel.send(JSON.stringify({
        type: 'chat-message',
        message: {
          ...message,
          isOwn: false // For the receiver
        }
      }));
    } else {
      // Fallback to socket
      socket.emit('chat-message', {
        target: targetSocketId,
        message: {
          ...message,
          isOwn: false
        }
      });
    }
  }, [socket, deviceInfo, peers, generateMessageId]);

  const markMessagesAsRead = useCallback((socketId: string) => {
    const peer = peers.find(p => p.socketId === socketId);
    if (peer) {
      setUnreadCounts(prev => {
        const newMap = new Map(prev);
        newMap.delete(peer.clientId);
        return newMap;
      });
    }
  }, [peers]);

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
      if (!socket) throw new Error('Socket not connected');
      socket.emit('file-request', {
        target: targetSocketId,
        fileName: file.name,
        fileSize: file.size,
        relativePath: (file as File & { webkitRelativePath?: string }).webkitRelativePath || file.name,
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
      fileSize: file.size,
      relativePath: (file as File & { webkitRelativePath?: string }).webkitRelativePath || file.name
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
          
          // Keep progress at 100% for a moment to show completion, then clear
          setTimeout(() => {
            setTransferProgress(null);
          }, 2500); // 1s delay + 1s animation + 0.5s buffer
          
          // Keep connection open for future transfers  
          // Don't close the connection here anymore
        }
      }
    };

      sendChunk();
    } catch (error: unknown) {
      setTransferProgress(null);

      // Only clean up connection on non-rejection errors
      if ((error as Error).message !== 'File transfer rejected') {
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
      fileSize: file.size,
      relativePath: (file as File & { webkitRelativePath?: string }).webkitRelativePath || file.name
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
    
    // Get or create persistent client ID
    let clientId = localStorage.getItem('gavadrop-client-id');
    if (!clientId) {
      clientId = `client_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      localStorage.setItem('gavadrop-client-id', clientId);
    }
    
    // Send saved device name and client ID on connection
    const savedName = localStorage.getItem('gavadrop-device-name');
    socketInstance.on('connect', () => {
      socketInstance.emit('client-init', { 
        clientId,
        deviceName: savedName || null 
      });
    });
    
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
        let relativePath = '';
        
        event.channel.onopen = () => {
          console.log('Data channel opened with', data.from);
        };

        event.channel.onmessage = (event) => {
          if (typeof event.data === 'string') {
            const message = JSON.parse(event.data);
            
            if (message.type === 'chat-message') {
              console.log('Received chat message via WebRTC:', message);
              const chatMessage = message.message;
              
              // Use a callback to get fresh peers state
              setPeers(currentPeers => {
                const fromPeer = currentPeers.find(p => p.socketId === data.from);
                console.log('fromPeer found for WebRTC message:', fromPeer, 'socketId:', data.from, 'currentPeers:', currentPeers);
                
                if (fromPeer && fromPeer.clientId) {
                  console.log('Adding message to clientId:', fromPeer.clientId);
                  setMessages(prev => {
                    const newMap = new Map(prev);
                    const chatMessages = newMap.get(fromPeer.clientId) || [];
                    // Ensure received message has unique ID
                    const messageWithUniqueId = {
                      ...chatMessage,
                      id: `msg_${chatMessage.timestamp}_webrtc_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`
                    };
                    newMap.set(fromPeer.clientId, [...chatMessages, messageWithUniqueId]);
                    console.log('Updated messages via WebRTC:', newMap);
                    return newMap;
                  });
                  
                  // Update unread count using clientId
                  setUnreadCounts(prev => {
                    const newMap = new Map(prev);
                    const currentCount = newMap.get(fromPeer.clientId) || 0;
                    newMap.set(fromPeer.clientId, currentCount + 1);
                    return newMap;
                  });
                } else {
                  console.error('Could not find fromPeer with clientId for WebRTC message:', data.from, currentPeers);
                }
                
                return currentPeers; // Return unchanged peers
              });
            } else if (message.type === 'file-info') {
              fileName = message.fileName;
              relativePath = message.relativePath || message.fileName;
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
              const fileData = new ArrayBuffer(receivedSize);
              const fileView = new Uint8Array(fileData);
              let offset = 0;
              
              // Combine all received chunks
              receivedBuffer.forEach(buffer => {
                fileView.set(new Uint8Array(buffer), offset);
                offset += buffer.byteLength;
              });
              
              // Use callback if provided, otherwise default download behavior
              if (onFileReceived && onFileReceived(fileData, fileName, relativePath, data.from)) {
                // File handled by callback
              } else if (!onFileReceived) {
                // Default behavior - direct download
                const blob = new Blob([fileData]);
                const url = URL.createObjectURL(blob);
                
                const a = document.createElement('a');
                a.href = url;
                a.download = relativePath;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
              }
              
              setIncomingFile(null);
              
              // Keep progress at 100% for a moment to show completion, then clear
              setTimeout(() => {
                setTransferProgress(null);
              }, 2500); // 1s delay + 1s animation + 0.5s buffer
              
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
      console.log('Received peers-list:', peersList);
      setPeers(peersList);
    });

    socketInstance.on('peer-joined', (peer: Peer) => {
      console.log('Peer joined:', peer);
      
      // Cancel disconnection timer if this peer was disconnected
      const existingTimer = disconnectionTimers.current.get(peer.clientId);
      if (existingTimer) {
        console.log('Peer reconnected, cancelling disconnection timer:', peer.deviceName, peer.clientId);
        clearTimeout(existingTimer);
        disconnectionTimers.current.delete(peer.clientId);
        
        // Remove from disconnected peers AFTER we add to active peers to avoid gaps
        setTimeout(() => {
          setDisconnectedPeers(prev => {
            const newDisconnected = new Map(prev);
            newDisconnected.delete(peer.clientId);
            console.log('Removed reconnected peer from disconnected peers:', peer.deviceName);
            return newDisconnected;
          });
        }, 10); // Small delay to ensure peers is updated first
      }
      
      setPeers(prev => {
        // Check if peer already exists to avoid duplicates
        const existingIndex = prev.findIndex(p => p.socketId === peer.socketId);
        if (existingIndex !== -1) {
          // Update existing peer
          const updated = [...prev];
          updated[existingIndex] = peer;
          console.log('Updated existing peer:', updated);
          return updated;
        }
        // Add new peer
        const newPeers = [...prev, peer];
        console.log('Added new peer:', newPeers);
        return newPeers;
      });
    });

    socketInstance.on('peer-left', (data: { socketId: string }) => {
      setPeers(prev => {
        const leavingPeer = prev.find(p => p.socketId === data.socketId);
        if (leavingPeer) {
          // Start 4-second grace period
          console.log('Starting 4-second grace period for peer:', leavingPeer.deviceName, leavingPeer.clientId);
          setDisconnectedPeers(prevDisconnected => {
            const newDisconnected = new Map(prevDisconnected);
            newDisconnected.set(leavingPeer.clientId, {
              peer: leavingPeer,
              disconnectedAt: Date.now()
            });
            console.log('Added to disconnected peers:', newDisconnected);
            return newDisconnected;
          });

          // Set timer to remove after 4 seconds if not reconnected
          const timerId = setTimeout(() => {
            console.log('Grace period expired for peer:', leavingPeer.deviceName, leavingPeer.clientId);
            setDisconnectedPeers(prevDisconnected => {
              const newDisconnected = new Map(prevDisconnected);
              newDisconnected.delete(leavingPeer.clientId);
              console.log('Removed from disconnected peers after 4s:', newDisconnected);
              return newDisconnected;
            });
            disconnectionTimers.current.delete(leavingPeer.clientId);
          }, 4000);
          
          disconnectionTimers.current.set(leavingPeer.clientId, timerId);
        }
        
        return prev.filter(p => p.socketId !== data.socketId);
      });
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
      // Clear all disconnection timers
      disconnectionTimers.current.forEach(timer => clearTimeout(timer));
      disconnectionTimers.current.clear();
      
      socketInstance.disconnect();
      connections.current.forEach(conn => {
        conn.peerConnection.close();
      });
      connections.current.clear();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Separate useEffect for chat message listeners to ensure fresh peers closure
  useEffect(() => {
    if (!socket) return;

    const handleChatMessage = (data: { message: Message, from: string }) => {
      console.log('Received chat message via Socket:', data, 'current peers:', peers);
      const fromPeer = peers.find(p => p.socketId === data.from);
      console.log('fromPeer found for Socket message:', fromPeer, 'socketId:', data.from);
      
      if (fromPeer && fromPeer.clientId) {
        console.log('Adding socket message to clientId:', fromPeer.clientId);
        setMessages(prev => {
          const newMap = new Map(prev);
          const chatMessages = newMap.get(fromPeer.clientId) || [];
          // Ensure received message has unique ID
          const messageWithUniqueId = {
            ...data.message,
            id: `msg_${data.message.timestamp}_recv_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`
          };
          newMap.set(fromPeer.clientId, [...chatMessages, messageWithUniqueId]);
          console.log('Updated messages via Socket:', newMap);
          return newMap;
        });
        
        // Update unread count using clientId
        setUnreadCounts(prev => {
          const newMap = new Map(prev);
          const currentCount = newMap.get(fromPeer.clientId) || 0;
          newMap.set(fromPeer.clientId, currentCount + 1);
          return newMap;
        });
      } else {
        console.error('Could not find fromPeer with clientId for Socket message:', data.from, peers);
      }
    };

    socket.on('chat-message', handleChatMessage);

    return () => {
      socket.off('chat-message', handleChatMessage);
    };
  }, [socket, peers]);

  const resendFile = useCallback(async (fileName: string, fileSize: number, deviceName: string, fileData?: string) => {
    // Find the target device by name
    const targetDevice = peers.find(peer => peer.deviceName === deviceName);
    
    if (!targetDevice) {
      throw new Error(`Device "${deviceName}" is not currently connected`);
    }

    if (fileData) {
      // Use saved file data to reconstruct the file
      try {
        const binaryString = atob(fileData);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
        
        // Create a File object from the saved data
        const blob = new Blob([bytes]);
        const file = new File([blob], fileName, { 
          type: blob.type || 'application/octet-stream' 
        });
        
        await sendFile(file, targetDevice.socketId);
        return;
      } catch (error) {
        console.error('Failed to reconstruct file from saved data:', error);
        // Fall through to file picker
      }
    }

    // Fallback: ask user to select the file again (for large files not saved)
    return new Promise<void>((resolve, reject) => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '*/*';
      
      input.onchange = async (e) => {
        const files = (e.target as HTMLInputElement).files;
        if (!files || files.length === 0) {
          reject(new Error('No file selected'));
          return;
        }
        
        const selectedFile = files[0];
        
        // Verify the selected file matches the original
        if (selectedFile.name !== fileName) {
          reject(new Error(`Please select the original file "${fileName}"`));
          return;
        }
        
        if (selectedFile.size !== fileSize) {
          reject(new Error(`File size mismatch. Expected ${fileSize} bytes but got ${selectedFile.size} bytes`));
          return;
        }
        
        try {
          await sendFile(selectedFile, targetDevice.socketId);
          resolve();
        } catch (error) {
          reject(error);
        }
      };
      
      input.oncancel = () => {
        reject(new Error('File selection cancelled'));
      };
      
      // Trigger file selection
      input.click();
    });
  }, [peers, sendFile]);

  return {
    peers,
    deviceInfo,
    isConnected,
    sendFile,
    sendBatchFiles,
    sendMessage,
    messages,
    unreadCounts,
    markMessagesAsRead,
    clearAllChatData,
    disconnectedPeers,
    incomingFile,
    incomingFileRequest,
    incomingBatchRequest,
    transferProgress,
    acceptFile,
    rejectFile,
    acceptBatchFiles,
    rejectBatchFiles,
    changeDeviceName,
    resendFile
  };
};