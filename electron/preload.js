// electron/preload.js
const { contextBridge, ipcRenderer } = require('electron');

// Whitelist of allowed channels for security
const ALLOWED_CHANNELS = new Set([
  'fingerprint',
  'update:status',
  'update:progress'
]);

const ALLOWED_INVOKE_CHANNELS = new Set([
  'get-fingerprint',
  'store-get',
  'store-set',
  'store-delete',
  'update:check',
  'update:download',
  'update:install'
]);

// Secure helper to wire/unwire listeners with channel validation
function on(channel, listener) {
  if (!ALLOWED_CHANNELS.has(channel)) {
    console.error(`Attempted to listen on disallowed channel: ${channel}`);
    return () => {}; // Return no-op cleanup function
  }
  ipcRenderer.on(channel, listener);
  return () => ipcRenderer.removeListener(channel, listener);
}

// Secure invoke wrapper with channel validation
function safeInvoke(channel, ...args) {
  if (!ALLOWED_INVOKE_CHANNELS.has(channel)) {
    console.error(`Attempted to invoke disallowed channel: ${channel}`);
    throw new Error(`Channel ${channel} is not allowed`);
  }
  return ipcRenderer.invoke(channel, ...args);
}

contextBridge.exposeInMainWorld('electronAPI', {
  // --- existing: fingerprint ---
  onFingerprint: (callback) => on('fingerprint', (_e, data) => callback(data)),
  getFingerprint: () => safeInvoke('get-fingerprint'),

  // --- existing: store kv ---
  store: {
    get: (key) => safeInvoke('store-get', key),
    set: (key, value) => safeInvoke('store-set', key, value),
    delete: (key) => safeInvoke('store-delete', key),
  },

  // --- auto-updater controls + events ---
  updater: {
    // manual actions with error handling
    check: () => safeInvoke('update:check'),
    download: () => safeInvoke('update:download'),
    install: () => safeInvoke('update:install'),

    // events from main -> renderer
    // status: 'checking' | 'available' | 'none' | 'downloaded' | 'error'
    onStatus: (callback) => on('update:status', (_e, payload) => callback(payload)),
    // progress: { percent, bytesPerSecond, transferred, total }
    onProgress: (callback) => on('update:progress', (_e, payload) => callback(payload)),
  },
});
