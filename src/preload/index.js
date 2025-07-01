import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

// Custom APIs for renderer
const api = {
  // Send a query and receive resolved value via promise
  sendQuery: (payload) => ipcRenderer.invoke('query', payload),

  // Send a streaming query with chunk callback
  sendStreamingQuery: (payload, onChunk) => {
    // Listen for chunks
    const handleChunk = (_e, chunk) => onChunk(chunk)
    ipcRenderer.on('query-chunk', handleChunk)
    
    // Send the query with streaming flag
    return ipcRenderer.invoke('query', { ...payload, streaming: true }).then((result) => {
      // Clean up listener when done
      ipcRenderer.removeListener('query-chunk', handleChunk)
      return result
    })
  },

  // Send an OS-level action and await its JSON result
  sendAction: (payload) => ipcRenderer.invoke('action', payload),

  // Get current settings from main process
  getSettings: () => ipcRenderer.invoke('get-settings'),

  // Listen to push events from main (e.g., screenshot before window shows)
  onPush: (cb) => ipcRenderer.on('backend-push', (_e, data) => cb(data)),

  // Listen to focus query input events
  onFocusQueryInput: (cb) => ipcRenderer.on('focus-query-input', cb)
}

// Use `contextBridge` APIs to expose Electron APIs to
// renderer only if context isolation is enabled, otherwise
// just add to the DOM global.
if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('api', api)
  } catch (error) {
    console.error(error)
  }
} else {
  window.electron = electronAPI
  window.api = api
}
