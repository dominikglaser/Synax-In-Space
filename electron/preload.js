/**
 * Electron preload script
 * Provides secure bridge between main process and renderer
 * Runs in isolated context with access to both DOM and Node.js APIs
 */

const { contextBridge } = require('electron');

// Expose protected methods that allow the renderer process to use
// the APIs in a secure way
contextBridge.exposeInMainWorld('electronAPI', {
  // Platform information
  platform: process.platform,
  versions: {
    node: process.versions.node,
    chrome: process.versions.chrome,
    electron: process.versions.electron,
  },
  
  // App information
  appName: 'Synax In Space',
  appVersion: '1.0.0',
});

// Log that preload script loaded (for debugging)
console.log('[Preload] Electron preload script loaded');

