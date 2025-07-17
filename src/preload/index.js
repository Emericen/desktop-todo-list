import { contextBridge, ipcRenderer } from "electron"
import { electronAPI } from "@electron-toolkit/preload"

// Custom APIs for renderer
const api = {
  // Send a streaming query with agent event callback
  sendQuery: (payload, onAgentEvent) => {
    console.log("sendQuery", payload)
    if (onAgentEvent) {
      // Listen for agent events
      const handleAgentEvent = (_e, eventData) => onAgentEvent(eventData)
      ipcRenderer.on("response-event", handleAgentEvent)

      // Send the query
      return ipcRenderer.invoke("query", payload).then((result) => {
        // Clean up listener when done
        ipcRenderer.removeListener("response-event", handleAgentEvent)
        return result
      })
    } else {
      // Fallback for non-streaming usage (though we'll always stream)
      return ipcRenderer.invoke("query", payload)
    }
  },

  // Get current settings from main process
  getSettings: () => ipcRenderer.invoke("get-settings"),

  // Listen to push events from main (e.g., screenshot before window shows)
  onPush: (cb) => ipcRenderer.on("backend-push", (_e, data) => cb(data)),

  // Listen to focus query input events
  onFocusQueryInput: (cb) => ipcRenderer.on("focus-query-input", cb),

  // Listen to clear messages events
  onClearMessages: (cb) => ipcRenderer.on("clear-messages", cb),

  // Transcribe audio using OpenAI Whisper
  transcribeAudio: (payload) => ipcRenderer.invoke("transcribe", payload),

  // Handle user confirmation for action prompts
  handleConfirmation: (confirmed) =>
    ipcRenderer.invoke("confirm-command", confirmed),

  // Update settings
  updateSettings: (settings) => ipcRenderer.invoke("update-settings", settings)
}

// Use `contextBridge` APIs to expose Electron APIs to
// renderer only if context isolation is enabled, otherwise
// just add to the DOM global.
if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld("electron", electronAPI)
    contextBridge.exposeInMainWorld("api", api)
  } catch (error) {
    console.error(error)
  }
} else {
  window.electron = electronAPI
  window.api = api
}
