/* eslint-disable @typescript-eslint/no-require-imports */
const { createServer } = require('http');
const { Server } = require('socket.io');
const { v4: uuidv4 } = require('uuid');

// === CONFIGURATION ===
const DEBUG = process.env.NODE_ENV !== 'production';
const log = (...args) => DEBUG && console.log(...args);

// Rate limiting configuration
const RATE_LIMIT = {
    maxEvents: 100,
    windowMs: 60000,
    blockDurationMs: 60000
};

// Sanitization configuration
const SANITIZE = {
    maxDeviceNameLength: 50,
    maxFileNameLength: 255,
    maxMessageLength: 5000
};

// === CORS CONFIGURATION ===
const allowedOrigins = [
    'http://localhost:3000',
    'http://localhost:3001',
    'http://127.0.0.1:3000',
    'http://127.0.0.1:3001'
];

function isAllowedOrigin(origin) {
    if (!origin) return true;
    if (allowedOrigins.includes(origin)) return true;

    const localNetworkPatterns = [
        /^https?:\/\/192\.168\.\d{1,3}\.\d{1,3}(:\d+)?$/,
        /^https?:\/\/10\.\d{1,3}\.\d{1,3}\.\d{1,3}(:\d+)?$/,
        /^https?:\/\/172\.(1[6-9]|2\d|3[01])\.\d{1,3}\.\d{1,3}(:\d+)?$/
    ];

    return localNetworkPatterns.some(pattern => pattern.test(origin));
}

// === RATE LIMITING ===
const rateLimitMap = new Map();

function checkRateLimit(socketId) {
    const now = Date.now();
    let entry = rateLimitMap.get(socketId);

    if (!entry) {
        entry = { count: 0, windowStart: now, blocked: false, blockedUntil: 0 };
        rateLimitMap.set(socketId, entry);
    }

    if (entry.blocked && now < entry.blockedUntil) {
        return false;
    } else if (entry.blocked && now >= entry.blockedUntil) {
        entry.blocked = false;
        entry.count = 0;
        entry.windowStart = now;
    }

    if (now - entry.windowStart > RATE_LIMIT.windowMs) {
        entry.count = 0;
        entry.windowStart = now;
    }

    entry.count++;

    if (entry.count > RATE_LIMIT.maxEvents) {
        entry.blocked = true;
        entry.blockedUntil = now + RATE_LIMIT.blockDurationMs;
        log(`Rate limit exceeded for ${socketId}`);
        return false;
    }

    return true;
}

function cleanupRateLimit(socketId) {
    rateLimitMap.delete(socketId);
}

// === INPUT SANITIZATION ===
function sanitizeString(str, maxLength) {
    if (typeof str !== 'string') return '';
    return str.replace(/[\x00-\x1F\x7F]/g, '').trim().slice(0, maxLength);
}

function sanitizeDeviceName(name) {
    return sanitizeString(name, SANITIZE.maxDeviceNameLength);
}

function sanitizeFileName(name) {
    if (typeof name !== 'string') return '';
    return name
        .replace(/[\x00-\x1F\x7F]/g, '')
        .replace(/\.\./g, '')
        .replace(/[<>:"|?*]/g, '')
        .trim()
        .slice(0, SANITIZE.maxFileNameLength);
}

// Sanitize chat message object (NOT the whole object, just the text field)
function sanitizeChatMessage(message) {
    if (!message || typeof message !== 'object') return message;
    return {
        ...message,
        text: typeof message.text === 'string'
            ? message.text.slice(0, SANITIZE.maxMessageLength)
            : message.text
    };
}

// === HTTP SERVER ===
const server = createServer((req, res) => {
    const origin = req.headers.origin;
    const corsHeaders = {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': isAllowedOrigin(origin) ? (origin || '*') : 'null',
        'Access-Control-Allow-Methods': 'GET, POST',
        'Access-Control-Allow-Headers': 'Content-Type'
    };

    if (req.url === '/status' && req.method === 'GET') {
        res.writeHead(200, corsHeaders);
        res.end(JSON.stringify({ status: true }));
        return;
    }

    res.writeHead(404, corsHeaders);
    res.end(JSON.stringify({ error: 'Not found' }));
});

// === SOCKET.IO SERVER ===
const io = new Server(server, {
    cors: {
        origin: (origin, callback) => {
            if (isAllowedOrigin(origin)) {
                callback(null, true);
            } else {
                log(`CORS rejected origin: ${origin}`);
                callback(new Error('Not allowed by CORS'), false);
            }
        },
        methods: ["GET", "POST"]
    }
});

// === DATA STORES ===
const rooms = new Map();
const clients = new Map();
const persistentClients = new Map();

// === HELPER FUNCTIONS ===
function getDeviceName() {
    const adjectives = ['Quick', 'Silent', 'Bright', 'Swift', 'Gentle', 'Bold', 'Calm', 'Smart'];
    const animals = ['Fox', 'Wolf', 'Eagle', 'Lion', 'Tiger', 'Bear', 'Hawk', 'Deer'];
    const adj = adjectives[Math.floor(Math.random() * adjectives.length)];
    const animal = animals[Math.floor(Math.random() * animals.length)];
    return `${adj} ${animal}`;
}

function getRoomId(ip) {
    if (!ip || typeof ip !== 'string') return 'room_unknown';
    const parts = ip.replace('::ffff:', '').split('.');
    if (parts.length !== 4) return 'room_unknown';
    const subnet = parts.slice(0, 3).join('.');
    return `room_${subnet}`;
}

function safeHandler(socket, handler) {
    return (data) => {
        try {
            if (!checkRateLimit(socket.id)) {
                socket.emit('error', { message: 'Rate limit exceeded. Please wait.' });
                return;
            }
            handler(data);
        } catch (error) {
            log(`Error in socket handler for ${socket.id}:`, error.message);
        }
    };
}

// === SOCKET CONNECTION HANDLING ===
io.on('connection', (socket) => {
    log('Client connected:', socket.id);

    const clientIp = socket.handshake.address || socket.conn.remoteAddress;
    const roomId = getRoomId(clientIp);

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

    socket.on('client-init', safeHandler(socket, (data) => {
        const { clientId, deviceName } = data || {};

        let finalDeviceName = sanitizeDeviceName(deviceName) || getDeviceName();
        const deviceId = uuidv4();

        client = {
            ...client,
            deviceId,
            deviceName: finalDeviceName,
            clientId: clientId || null
        };

        clients.set(socket.id, client);
        if (clientId) {
            persistentClients.set(clientId, socket.id);
        }

        log(`Client initialized: ${socket.id}, clientId: ${clientId}, name: ${finalDeviceName}`);

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

        if (client.deviceId) {
            socket.to(roomId).emit('peer-joined', {
                deviceId: client.deviceId,
                deviceName: client.deviceName,
                socketId: socket.id,
                clientId: client.clientId
            });
        }
    }));

    socket.on('webrtc-offer', safeHandler(socket, (data) => {
        if (!data || !data.target || !data.offer) return;
        socket.to(data.target).emit('webrtc-offer', {
            offer: data.offer,
            from: socket.id
        });
    }));

    socket.on('webrtc-answer', safeHandler(socket, (data) => {
        if (!data || !data.target || !data.answer) return;
        socket.to(data.target).emit('webrtc-answer', {
            answer: data.answer,
            from: socket.id
        });
    }));

    socket.on('webrtc-ice-candidate', safeHandler(socket, (data) => {
        if (!data || !data.target) return;
        socket.to(data.target).emit('webrtc-ice-candidate', {
            candidate: data.candidate,
            from: socket.id
        });
    }));

    socket.on('file-request', safeHandler(socket, (data) => {
        if (!data || !data.target) return;
        socket.to(data.target).emit('file-request', {
            fileName: sanitizeFileName(data.fileName),
            fileSize: typeof data.fileSize === 'number' ? data.fileSize : 0,
            fromName: sanitizeDeviceName(data.fromName),
            from: socket.id
        });
    }));

    socket.on('batch-file-request', safeHandler(socket, (data) => {
        if (!data || !data.target || !Array.isArray(data.files)) return;

        const sanitizedFiles = data.files.map(f => ({
            fileName: sanitizeFileName(f.fileName),
            fileSize: typeof f.fileSize === 'number' ? f.fileSize : 0
        }));

        socket.to(data.target).emit('batch-file-request', {
            files: sanitizedFiles,
            fromName: sanitizeDeviceName(data.fromName),
            from: socket.id,
            batchId: data.batchId
        });
    }));

    socket.on('batch-file-response', safeHandler(socket, (data) => {
        if (!data || !data.target) return;
        socket.to(data.target).emit('batch-file-response', {
            accepted: Boolean(data.accepted),
            batchId: data.batchId,
            from: socket.id
        });
    }));

    socket.on('file-response', safeHandler(socket, (data) => {
        if (!data || !data.target) return;
        socket.to(data.target).emit('file-response', {
            accepted: Boolean(data.accepted),
            from: socket.id
        });
    }));

    socket.on('transfer-progress', safeHandler(socket, (data) => {
        if (!data || !data.target) return;
        socket.to(data.target).emit('transfer-progress', {
            progress: typeof data.progress === 'number' ? Math.min(100, Math.max(0, data.progress)) : 0,
            fileName: sanitizeFileName(data.fileName),
            from: socket.id
        });
    }));

    // IMPORTANTE: data.message è un OGGETTO, non una stringa!
    // Struttura: { id, text, timestamp, fromSocketId, fromName, isOwn }
    socket.on('chat-message', safeHandler(socket, (data) => {
        if (!data || !data.target || !data.message) return;
        socket.to(data.target).emit('chat-message', {
            message: sanitizeChatMessage(data.message),
            from: socket.id
        });
    }));

    socket.on('change-device-name', safeHandler(socket, (data) => {
        const currentClient = clients.get(socket.id);
        const newName = sanitizeDeviceName(data?.newName);

        if (currentClient && newName) {
            const oldName = currentClient.deviceName;
            currentClient.deviceName = newName;

            clients.set(socket.id, currentClient);

            socket.emit('device-name-updated', {
                deviceId: currentClient.deviceId,
                deviceName: currentClient.deviceName
            });

            socket.to(currentClient.roomId).emit('peer-name-changed', {
                socketId: socket.id,
                deviceName: currentClient.deviceName,
                oldName: oldName
            });

            log(`Device ${socket.id} changed name from "${oldName}" to "${currentClient.deviceName}"`);
        }
    }));

    socket.on('disconnect', () => {
        log('Client disconnected:', socket.id);

        const disconnectedClient = clients.get(socket.id);
        if (disconnectedClient && rooms.has(disconnectedClient.roomId)) {
            rooms.get(disconnectedClient.roomId).delete(socket.id);

            if (disconnectedClient.deviceId) {
                socket.to(disconnectedClient.roomId).emit('peer-left', {
                    deviceId: disconnectedClient.deviceId,
                    socketId: socket.id
                });
            }

            if (rooms.get(disconnectedClient.roomId).size === 0) {
                rooms.delete(disconnectedClient.roomId);
            }

            if (disconnectedClient.clientId) {
                persistentClients.delete(disconnectedClient.clientId);
            }
        }

        clients.delete(socket.id);
        cleanupRateLimit(socket.id);
    });
});

// === SERVER STARTUP ===
const PORT = process.env.SOCKET_PORT || 3002;
server.listen(PORT, () => {
    console.log(`Socket.IO server running on port ${PORT}`);
    if (DEBUG) {
        console.log('Debug mode enabled - verbose logging active');
    }
});

// === GRACEFUL SHUTDOWN ===
process.on('SIGTERM', () => {
    log('SIGTERM received, shutting down gracefully...');
    io.close(() => {
        server.close(() => {
            process.exit(0);
        });
    });
});

process.on('SIGINT', () => {
    log('SIGINT received, shutting down gracefully...');
    io.close(() => {
        server.close(() => {
            process.exit(0);
        });
    });
});
