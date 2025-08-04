import { create } from "zustand"
import { subscribeWithSelector } from "zustand/middleware"
import { createMessagesSlice } from "./slices/messagesSlice.js"
import { createDictationSlice } from "./slices/dictationSlice.js"
import { createSettingsSlice } from "./slices/settingsSlice.js"
import { createChatSlice } from "./slices/chatSlice.js"

// Global UI store (frontend-only)
// Holds non-persistent app state such as theme, in-app shortcuts, chat messages, etc.
// Settings are hydrated from the backend on startup and kept in sync via the `settings-updated` channel.

const useStore = create(
  subscribeWithSelector((set, get) => ({
    // Compose all slices
    ...createMessagesSlice(set, get),
    ...createDictationSlice(set, get),
    ...createSettingsSlice(set, get),
    ...createChatSlice(set, get)
  }))
)

// Note: IPC handlers will be set up directly in slices as needed

export default useStore
