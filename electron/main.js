// Diagnostics
console.log('[Electron main] starting. ELECTRON_RUN_AS_NODE=', process.env.ELECTRON_RUN_AS_NODE);
const electron = require('electron');
console.log('[Electron main] electron keys:', Object.keys(electron));
const { app, BrowserWindow, Notification } = electron;
const path = require('path');

let mainWindow;

const isDev = process.env.NODE_ENV === 'development';

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    icon: path.join(__dirname, '..', 'public', 'icon.png'),
    webPreferences: {
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
      sandbox: false,
    },
  });

  if (isDev) {
    const devURL = process.env.ELECTRON_RENDERER_URL || 'http://localhost:3000';
    mainWindow.loadURL(devURL);
  } else {
    const indexPath = path.join(__dirname, '..', 'out', 'index.html');
    mainWindow.loadFile(indexPath);
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  // IPC: native notifications
  const { ipcMain } = electron;
  ipcMain.handle('notify', (_event, { title, body, peerId }) => {
    try {
      const notificationOptions = {
        title: String(title || 'GavaDrop'),
        body: String(body || ''),
        icon: path.join(__dirname, '..', 'public', 'icon.png'),
        sound: process.platform === 'darwin' ? 'Submarine' : undefined,
        urgency: 'normal'
      };
      
      const notif = new Notification(notificationOptions);
      
      // Handle notification click
      notif.on('click', () => {
        // Bring window to front
        if (mainWindow) {
          if (mainWindow.isMinimized()) mainWindow.restore();
          mainWindow.focus();
          mainWindow.show();
          
          // Send message to renderer to open chat with specific peer
          if (peerId) {
            mainWindow.webContents.send('notification-clicked', { peerId });
          }
        }
      });
      
      notif.show();
      return { ok: true };
    } catch (e) {
      console.error('Notification error:', e);
      return { ok: false, error: String(e) };
    }
  });

  // IPC: native notifications with action buttons
  ipcMain.handle('notifyWithActions', (_event, { title, body, actions, requestId }) => {
    try {
      const notificationOptions = {
        title: String(title || 'GavaDrop'),
        body: String(body || ''),
        icon: path.join(__dirname, '..', 'public', 'icon.png'),
        sound: process.platform === 'darwin' ? 'Submarine' : undefined,
        urgency: 'critical',
        actions: actions || []
      };
      
      const notif = new Notification(notificationOptions);
      
      // Handle action button clicks
      notif.on('action', (event, index) => {
        if (mainWindow) {
          const action = actions && actions[index] ? actions[index].action : `action_${index}`;
          mainWindow.webContents.send('notification-action', { 
            requestId, 
            action,
            index 
          });
          
          // Also bring window to front
          if (mainWindow.isMinimized()) mainWindow.restore();
          mainWindow.focus();
          mainWindow.show();
        }
      });
      
      // Handle notification click (not on buttons)
      notif.on('click', () => {
        if (mainWindow) {
          if (mainWindow.isMinimized()) mainWindow.restore();
          mainWindow.focus();
          mainWindow.show();
          
          // Send notification clicked event
          mainWindow.webContents.send('notification-clicked', { requestId });
        }
      });
      
      notif.show();
      return { ok: true };
    } catch (e) {
      console.error('Notification with actions error:', e);
      return { ok: false, error: String(e) };
    }
  });

  // In production, spin up a tiny local static server to serve `out/`
  if (!isDev) {
    const http = require('http');
    const fs = require('fs');
    const outDir = app.isPackaged
      ? path.join(process.resourcesPath, 'out')
      : path.join(__dirname, '..', 'out');

    const mime = new Map([
      ['.html', 'text/html; charset=utf-8'],
      ['.js', 'application/javascript; charset=utf-8'],
      ['.css', 'text/css; charset=utf-8'],
      ['.json', 'application/json; charset=utf-8'],
      ['.ico', 'image/x-icon'],
      ['.png', 'image/png'],
      ['.svg', 'image/svg+xml'],
      ['.ttf', 'font/ttf'],
      ['.woff', 'font/woff'],
      ['.woff2', 'font/woff2'],
    ]);

    const server = http.createServer((req, res) => {
      try {
        const reqUrl = new URL(req.url || '/', 'http://localhost');
        let pathname = decodeURIComponent(reqUrl.pathname);
        // Normalize and prevent path traversal
        let filePath = path.normalize(path.join(outDir, pathname));
        if (!filePath.startsWith(outDir)) {
          res.statusCode = 400; res.end('Bad Request'); return;
        }
        // If directory or trailing slash, serve index.html
        if (fs.existsSync(filePath) && fs.statSync(filePath).isDirectory()) {
          filePath = path.join(filePath, 'index.html');
        }
        // If file missing and not a Next asset, fallback to index.html for SPA
        if (!fs.existsSync(filePath)) {
          if (pathname.startsWith('/_next/')) {
            res.statusCode = 404; res.end('Not Found'); return;
          }
          filePath = path.join(outDir, 'index.html');
        }
        const ext = path.extname(filePath).toLowerCase();
        const type = mime.get(ext) || 'application/octet-stream';
        res.setHeader('Content-Type', type);
        fs.createReadStream(filePath).pipe(res);
      } catch (e) {
        res.statusCode = 500; res.end('Server Error');
      }
    });

    server.listen(0, '127.0.0.1', () => {
      const addr = server.address();
      const port = typeof addr === 'object' && addr ? addr.port : 0;
      const url = `http://127.0.0.1:${port}`;
      if (mainWindow) {
        mainWindow.loadURL(url);
      } else {
        mainWindow = new BrowserWindow({
          width: 1200,
          height: 800,
          icon: path.join(__dirname, '..', 'public', 'icon.png'),
          webPreferences: {
            contextIsolation: true,
            preload: path.join(__dirname, 'preload.js'),
            sandbox: false,
          },
        });
        mainWindow.loadURL(url);
      }
    });
    return; // Avoid double createWindow in prod
  }

  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
