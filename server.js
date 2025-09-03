/* eslint-disable @typescript-eslint/no-require-imports */
const { createServer } = require('http');
const { Server } = require('socket.io');
const { v4: uuidv4 } = require('uuid');

const server = createServer();
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

const rooms = new Map();
const clients = new Map();
const persistentClients = new Map(); // Maps clientId to socketId

function getDeviceName() {
  const adjectives = ['Quick', 'Silent', 'Bright', 'Swift', 'Gentle', 'Bold', 'Calm', 'Smart'];
  const animals = ['Fox', 'Wolf', 'Eagle', 'Lion', 'Tiger', 'Bear', 'Hawk', 'Deer'];
  
  const adj = adjectives[Math.floor(Math.random() * adjectives.length)];
  const animal = animals[Math.floor(Math.random() * animals.length)];
  
  return `${adj} ${animal}`;
}

function getRoomId(ip) {
  const subnet = ip.split('.').slice(0, 3).join('.');
  return `room_${subnet}`;
}

io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);
  
  const clientIp = socket.handshake.address || socket.conn.remoteAddress;
  const roomId = getRoomId(clientIp);
  
  // Initialize client without device info - wait for client-init event
  let client = {
    id: socket.id,
    deviceId: null,
    deviceName: null,
    clientId: null,
    ip: clientIp,
    roomId
  };
  
  clients.set(socket.id, client);
  socket.join(roomId);
  
  if (!rooms.has(roomId)) {
    rooms.set(roomId, new Set());
  }
  rooms.get(roomId).add(socket.id);

  // Handle client initialization with persistent ID
  socket.on('client-init', (data) => {
    const { clientId, deviceName } = data;
    
    // Check if this client ID already exists and has a device name
    let finalDeviceName = deviceName;
    let deviceId = uuidv4();
    
    // If no saved device name, generate a new one
    if (!finalDeviceName) {
      finalDeviceName = getDeviceName();
    }
    
    // Update client info
    client = {
      ...client,
      deviceId,
      deviceName: finalDeviceName,
      clientId
    };
    
    clients.set(socket.id, client);
    persistentClients.set(clientId, socket.id);
    
    console.log(`Client initialized: ${socket.id}, clientId: ${clientId}, name: ${finalDeviceName}`);
    
    socket.emit('device-info', {
      deviceId,
      deviceName: finalDeviceName
    });
    
    const roomClients = Array.from(rooms.get(roomId) || [])
      .filter(id => id !== socket.id)
      .map(id => {
        const peer = clients.get(id);
        return peer && peer.deviceId ? {
          deviceId: peer.deviceId,
          deviceName: peer.deviceName,
          socketId: id,
          clientId: peer.clientId
        } : null;
      })
      .filter(Boolean);
    
    socket.emit('peers-list', roomClients);
    
    // Only broadcast peer-joined if we have device info
    if (client.deviceId) {
      socket.to(roomId).emit('peer-joined', {
        deviceId: client.deviceId,
        deviceName: client.deviceName,
        socketId: socket.id,
        clientId: client.clientId
      });
    }
  });
  
  socket.on('webrtc-offer', (data) => {
    socket.to(data.target).emit('webrtc-offer', {
      offer: data.offer,
      from: socket.id
    });
  });
  
  socket.on('webrtc-answer', (data) => {
    socket.to(data.target).emit('webrtc-answer', {
      answer: data.answer,
      from: socket.id
    });
  });
  
  socket.on('webrtc-ice-candidate', (data) => {
    socket.to(data.target).emit('webrtc-ice-candidate', {
      candidate: data.candidate,
      from: socket.id
    });
  });
  
  socket.on('file-request', (data) => {
    socket.to(data.target).emit('file-request', {
      fileName: data.fileName,
      fileSize: data.fileSize,
      fromName: data.fromName,
      from: socket.id
    });
  });

  // Handle batch file requests (multiple files at once)
  socket.on('batch-file-request', (data) => {
    socket.to(data.target).emit('batch-file-request', {
      files: data.files, // Array of {fileName, fileSize}
      fromName: data.fromName,
      from: socket.id,
      batchId: data.batchId
    });
  });

  socket.on('batch-file-response', (data) => {
    socket.to(data.target).emit('batch-file-response', {
      accepted: data.accepted, // Array of booleans or single boolean for all
      batchId: data.batchId,
      from: socket.id
    });
  });
  
  socket.on('file-response', (data) => {
    socket.to(data.target).emit('file-response', {
      accepted: data.accepted,
      from: socket.id
    });
  });
  
  socket.on('transfer-progress', (data) => {
    socket.to(data.target).emit('transfer-progress', {
      progress: data.progress,
      fileName: data.fileName,
      from: socket.id
    });
  });

  // Handle chat messages
  socket.on('chat-message', (data) => {
    socket.to(data.target).emit('chat-message', {
      message: data.message,
      from: socket.id
    });
  });
  
  socket.on('change-device-name', (data) => {
    const client = clients.get(socket.id);
    if (client && data.newName && data.newName.trim()) {
      const oldName = client.deviceName;
      client.deviceName = data.newName.trim();
      
      // Update the client data
      clients.set(socket.id, client);
      
      // Notify the client that the name was updated
      socket.emit('device-name-updated', {
        deviceId: client.deviceId,
        deviceName: client.deviceName
      });
      
      // Notify other clients in the same room about the name change
      socket.to(client.roomId).emit('peer-name-changed', {
        socketId: socket.id,
        deviceName: client.deviceName,
        oldName: oldName
      });
      
      console.log(`Device ${socket.id} changed name from "${oldName}" to "${client.deviceName}"`);
    }
  });
  
  
  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
    
    const client = clients.get(socket.id);
    if (client && rooms.has(client.roomId)) {
      rooms.get(client.roomId).delete(socket.id);
      
      // Only broadcast peer-left if client had device info
      if (client.deviceId) {
        socket.to(client.roomId).emit('peer-left', {
          deviceId: client.deviceId,
          socketId: socket.id
        });
      }
      
      if (rooms.get(client.roomId).size === 0) {
        rooms.delete(client.roomId);
      }
      
      // Clean up persistent client mapping
      if (client.clientId) {
        persistentClients.delete(client.clientId);
      }
    }
    
    clients.delete(socket.id);
  });
});

const PORT = process.env.SOCKET_PORT || 3002;
server.listen(PORT, () => {
  console.log(`Socket.IO server running on port ${PORT}`);
});