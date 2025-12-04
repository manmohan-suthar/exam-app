// electron/preload.js
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  onFingerprint: (callback) => ipcRenderer.on('fingerprint', callback),
  getFingerprint: () => ipcRenderer.invoke('get-fingerprint'),
  store: {
    get: (key) => ipcRenderer.invoke('store-get', key),
    set: (key, value) => ipcRenderer.invoke('store-set', key, value),
    delete: (key) => ipcRenderer.invoke('store-delete', key),
  },
});
