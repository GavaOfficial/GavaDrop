const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  notify: async (title, body, peerId) => {
    try {
      const res = await ipcRenderer.invoke('notify', { title, body, peerId });
      return res;
    } catch (e) {
      return { ok: false, error: String(e) };
    }
  },
  notifyWithActions: async (title, body, actions, requestId) => {
    try {
      const res = await ipcRenderer.invoke('notifyWithActions', { 
        title, 
        body, 
        actions, 
        requestId 
      });
      return res;
    } catch (e) {
      return { ok: false, error: String(e) };
    }
  },
  onNotificationClick: (callback) => {
    ipcRenderer.on('notification-clicked', (event, data) => callback(data));
  },
  onNotificationAction: (callback) => {
    ipcRenderer.on('notification-action', (event, data) => callback(data));
  },
  removeNotificationClickListener: () => {
    ipcRenderer.removeAllListeners('notification-clicked');
  },
  removeNotificationActionListener: () => {
    ipcRenderer.removeAllListeners('notification-action');
  }
});

