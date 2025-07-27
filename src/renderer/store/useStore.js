import { create } from "zustand"
import { subscribeWithSelector } from 'zustand/middleware'
import { apiService } from "../services/apiService.js"
import { createMessagesSlice } from "./slices/messagesSlice.js"
import { createTranscriptionSlice } from "./slices/transcriptionSlice.js"
import { createSettingsSlice } from "./slices/settingsSlice.js"
import { createUISlice } from "./slices/uiSlice.js"
// Initialize error service (this sets up global error handlers)
import "../services/errorService.js"

// Global UI store (frontend-only)
// Holds non-persistent app state such as theme, in-app shortcuts, chat messages, etc.
// Settings are hydrated from the backend on startup and kept in sync via the `settings-updated` channel.

const useStore = create(
  subscribeWithSelector((set, get) => ({
    // Compose all slices
    ...createMessagesSlice(set, get),
    ...createTranscriptionSlice(set, get),
    ...createSettingsSlice(set, get),
    ...createUISlice(set, get)
  }))
)

// Attach backend-push listener globally once store is defined
if (typeof window !== "undefined") {
  // Set up IPC listeners (this registers the actual IPC handlers)
  apiService.onPush((payload) => {
    console.log("payload", payload)
    if (payload.type && payload.type === "image") {
      const message = { ...payload }
      useStore.getState().replaceLastImageMessage(message)
    }
  })
  
  // Also register the clear messages IPC listener
  apiService.onClearMessages(() => {
    // This will trigger the event bus event that components listen to
  })

  // Register focus input IPC listener  
  apiService.onFocusQueryInput(() => {
    // This will trigger the event bus event that components listen to
  })
}

export default useStore