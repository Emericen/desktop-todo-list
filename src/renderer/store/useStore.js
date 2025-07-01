import { create } from 'zustand'

// Global UI store (frontend-only)
// Holds non-persistent app state such as theme, in-app shortcuts, chat messages, etc.
// Settings are hydrated from the backend on startup and kept in sync via the `settings-updated` channel.

const useStore = create((set, get) => ({
  settings: null,
  messages: [],
  isTranscribing: false,
  awaitingUserResponse: false,
  selectedModel: 'claude-4-sonnet',
  models: [
    { id: 'claude-4-sonnet', name: 'Claude 4 Sonnet' }
    // { id: "O3", name: "O3" },
  ],

  // Load settings from main process
  loadSettings: async () => {
    try {
      if (window.api?.getSettings) {
        const settings = await window.api.getSettings()
        set({ settings })
      }
    } catch (error) {
      console.error('Failed to load settings:', error)
    }
  },

  addMessage: (message) =>
    set((state) => ({ messages: [...state.messages, message] })),

  // Replace the last image message with a new one, or add if no image exists
  replaceLastImageMessage: (message) =>
    set((state) => {
      // const textNote = {
      //   type: "text",
      //   content: "What your assistant sees",
      //   timestamp: new Date(),
      // };
      if (
        state.messages.length !== 0 &&
        state.messages[state.messages.length - 1].type === 'image'
      ) {
        return {
          messages: [...state.messages.slice(0, -1), message]
        }
      }
      return { messages: [...state.messages, message] }
    }),

  clearMessages: () => set({ messages: [] }),

  setIsTranscribing: (val) => set({ isTranscribing: val }),

  setAwaitingUserResponse: (val) => set({ awaitingUserResponse: val }),

  submitQuery: async (rawQuery) => {
    const query = rawQuery.trim()
    if (!query) return

    // Add user message to state first
    const userMessage = {
      type: 'user',
      content: query,
      timestamp: new Date()
    }
    get().addMessage(userMessage)

    try {
      // Send entire conversation state to backend
      const res = await window.api.sendQuery({
        messages: get().messages,
        selectedModel: get().selectedModel
      })

      const content = res.data || res.message || JSON.stringify(res)
      get().addMessage({
        type: 'text',
        content: content,
        timestamp: new Date()
      })
    } catch (error) {
      get().addMessage({
        type: 'text',
        content: `Error: ${error}`,
        timestamp: new Date()
      })
    }
  },

  submitStreamingQuery: async (rawQuery) => {
    const query = rawQuery.trim()
    if (!query) return

    // Add user message to state first
    const userMessage = {
      type: 'user',
      content: query,
      timestamp: new Date()
    }
    get().addMessage(userMessage)

    // Add empty assistant message that we'll update with chunks
    const assistantMessage = {
      type: 'text',
      content: '',
      timestamp: new Date()
    }
    get().addMessage(assistantMessage)

    try {
      // Get the index of the assistant message we just added
      let assistantMessageIndex = get().messages.length - 1

      // Send streaming query with chunk handler
      await window.api.sendStreamingQuery(
        {
          messages: get().messages.slice(0, -1), // Exclude the empty assistant message
          selectedModel: get().selectedModel
        },
        (chunk) => {
          // Update the assistant message with accumulated content
          set((state) => {
            const updatedMessages = [...state.messages]
            updatedMessages[assistantMessageIndex] = {
              ...updatedMessages[assistantMessageIndex],
              content: updatedMessages[assistantMessageIndex].content + chunk
            }
            return { messages: updatedMessages }
          })
        }
      )
    } catch (error) {
      // Update the assistant message with error
      set((state) => {
        const updatedMessages = [...state.messages]
        const assistantMessageIndex = updatedMessages.length - 1
        updatedMessages[assistantMessageIndex] = {
          ...updatedMessages[assistantMessageIndex],
          content: `Error: ${error}`
        }
        return { messages: updatedMessages }
      })
    }
  },

  setSelectedModel: (model) => set({ selectedModel: model })
}))

// Attach backend-push listener globally once store is defined
if (typeof window !== 'undefined' && window.api?.onPush) {
  window.api.onPush((payload) => {
    console.log('payload', payload)
    const message = {
      type: payload.type,
      content: payload.content,
      timestamp: new Date()
    }

    // Handle different message types for screenshot flow
    if (payload.type === 'image') {
      useStore.getState().replaceLastImageMessage(message)
    } else {
      useStore.getState().addMessage(message)
    }
  })
}

export default useStore
