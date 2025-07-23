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

      // Send the query and always clean up the listener, even on errors
      const promise = ipcRenderer.invoke("query", payload)
      promise.finally(() => {
        // Small delay to ensure the last streamed events are handled
        setTimeout(() => {
          ipcRenderer.removeListener("response-event", handleAgentEvent)
        }, 100)
      })
      return promise
    } else {
      // Fallback for non-streaming usage (though we'll always stream)
      return ipcRenderer.invoke("query", payload)
    }
  },

  // Transcribe audio using OpenAI Whisper
  transcribeAudio: (payload) => ipcRenderer.invoke("transcribe", payload),

  // Handle user confirmation for action prompts
  handleConfirmation: (confirmed) =>
    ipcRenderer.invoke("confirm-command", confirmed),

  // Listen to push events from backend. can be text, image, or confirmation
  onPush: (cb) => ipcRenderer.on("backend-push", (_e, data) => cb(data)),

  // Listen to focus query input events
  onFocusQueryInput: (cb) => ipcRenderer.on("focus-query-input", cb),

  // Listen to clear messages events
  onClearMessages: (cb) => ipcRenderer.on("clear-messages", cb),

  // Request backend to reset stored conversation
  clearAgentMessages: () => ipcRenderer.invoke("clear-messages")
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
