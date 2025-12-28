import { contextBridge, ipcRenderer } from 'electron';

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electron', {
  ipcRenderer: {
    invoke: (channel: string, ...args: any[]) => {
      // Whitelist channels for security
      const validChannels = ['open-selection-overlay'];
      if (validChannels.includes(channel)) {
        return ipcRenderer.invoke(channel, ...args);
      }
      throw new Error(`Invalid IPC channel: ${channel}`);
    },
    send: (channel: string, ...args: any[]) => {
      const validChannels = ['selection-complete', 'selection-cancelled'];
      if (validChannels.includes(channel)) {
        ipcRenderer.send(channel, ...args);
      } else {
        throw new Error(`Invalid IPC channel: ${channel}`);
      }
    },
    on: (channel: string, func: (...args: any[]) => void) => {
      const validChannels = ['screenshot-result'];
      if (validChannels.includes(channel)) {
        ipcRenderer.on(channel, (event, ...args) => func(...args));
      } else {
        throw new Error(`Invalid IPC channel: ${channel}`);
      }
    },
  },
});

