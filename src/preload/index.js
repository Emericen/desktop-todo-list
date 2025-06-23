import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

// Custom APIs for renderer
const api = {
  send: (payload) => ipcRenderer.invoke("backend-proxy", payload),
  onMessage: (cb) => ipcRenderer.on("backend-push", (_e, data) => cb(data)),
  onFocusQueryInput: (cb) => ipcRenderer.on("focus-query-input", cb),
};

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
