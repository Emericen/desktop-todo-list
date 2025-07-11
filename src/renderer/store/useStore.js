import { create } from "zustand"

// Global UI store (frontend-only)
// Holds non-persistent app state such as theme, in-app shortcuts, chat messages, etc.
// Settings are hydrated from the backend on startup and kept in sync via the `settings-updated` channel.

const useStore = create((set, get) => ({
  settings: null,
  messages: [],
  isTranscribing: false,
  awaitingUserResponse: false,
  selectedModel: "claude-4-sonnet",
  models: [
    { id: "claude-4-sonnet", name: "Claude 4 Sonnet" }
    // { id: "O3", name: "O3" },
  ],

  // New flag to indicate audio is being processed by API
  isProcessingAudio: false,

  // Load settings from main process
  loadSettings: async () => {
    try {
      if (window.api?.getSettings) {
        const settings = await window.api.getSettings()
        set({ settings })
      }
    } catch (error) {
      console.error("Failed to load settings:", error)
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
        state.messages[state.messages.length - 1].type === "image"
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

  selectChoice: (index, choice) =>
    set((state) => {
      const updatedMessages = [...state.messages]
      if (updatedMessages[index] && updatedMessages[index].type === "confirmation") {
        updatedMessages[index] = {
          ...updatedMessages[index],
          answered: choice
        }
      }
      return { messages: updatedMessages }
    }),

  submitQuery: async (rawQuery) => {
    const query = rawQuery.trim()
    if (!query) return

    // Add user message to state first
    const userMessage = {
      type: "user",
      content: query,
      timestamp: new Date()
    }
    get().addMessage(userMessage)

    // Add loading message that we'll replace with actual content
    const loadingMessage = {
      type: "loading",
      content: "",
      timestamp: new Date()
    }
    get().addMessage(loadingMessage)

    try {
      // Get the index of the loading message we just added
      let messageIndex = get().messages.length - 1
      let isFirstEvent = true

      // Send streaming query with event handler
      await window.api.sendQuery(
        {
          query: query, // Just send the query text
          selectedModel: get().selectedModel
        },
        (eventData) => {
          // Handle structured event data
          if (isFirstEvent) {
            // Replace loading message with the first response
            set((state) => {
              const updatedMessages = [...state.messages]
              updatedMessages[messageIndex] = {
                ...eventData,
                timestamp: new Date()
              }
              return { messages: updatedMessages }
            })
            isFirstEvent = false
          } else {
            // For subsequent responses, check if we should append to existing or create new
            if (eventData.type === "text" && get().messages[messageIndex]?.type === "text") {
              // Append text to existing text message
              set((state) => {
                const updatedMessages = [...state.messages]
                updatedMessages[messageIndex] = {
                  ...updatedMessages[messageIndex],
                  content: updatedMessages[messageIndex].content + eventData.content
                }
                return { messages: updatedMessages }
              })
            } else {
              // Add as new message
              get().addMessage({
                ...eventData,
                timestamp: new Date()
              })
              messageIndex = get().messages.length - 1
            }
          }
        }
      )
    } catch (error) {
      console.error("Streaming error:", error)

      // Update the loading message with error
      set((state) => {
        const updatedMessages = [...state.messages]
        const messageIndex = updatedMessages.length - 1
        updatedMessages[messageIndex] = {
          type: "error",
          content: `Error: ${error}`,
          timestamp: new Date()
        }
        return { messages: updatedMessages }
      })
    }
  },

  setSelectedModel: (model) => set({ selectedModel: model }),

  // Transcription state
  mediaRecorder: null,
  audioChunks: [],
  transcriptionCallback: null,

  // Transcription actions
  startTranscription: async () => {
    set({ isTranscribing: true, isProcessingAudio: false })

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mediaRecorder = new MediaRecorder(stream)

      set({ mediaRecorder, audioChunks: [] })

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          set((state) => ({ audioChunks: [...state.audioChunks, event.data] }))
        }
      }

      mediaRecorder.onstop = async () => {
        const { audioChunks } = get()
        const audioBlob = new Blob(audioChunks, { type: "audio/webm" })

        // Convert to base64 using browser FileReader API
        const base64Audio = await new Promise((resolve) => {
          const reader = new FileReader()
          reader.onloadend = () => resolve(reader.result.split(",")[1])
          reader.readAsDataURL(audioBlob)
        })

        // Send to main process for transcription
        try {
          // flag while waiting response
          set({ isProcessingAudio: true })
          const result = await window.api.transcribeAudio({
            audio: base64Audio,
            filename: "recording.webm"
          })

          if (result.success) {
            // Call the callback if provided
            const { transcriptionCallback } = get()
            if (transcriptionCallback) {
              transcriptionCallback(result.text.trim())
            }
          } else {
            console.error("Transcription failed:", result.error)
          }
        } catch (error) {
          console.error("Transcription error:", error)
        }

        // Clean up & reset flags
        stream.getTracks().forEach((track) => track.stop())
        set({
          isTranscribing: false,
          isProcessingAudio: false,
          mediaRecorder: null,
          audioChunks: []
        })
      }

      mediaRecorder.start()
    } catch (error) {
      console.error("Error accessing microphone:", error)
      set({ isTranscribing: false })
    }
  },

  stopTranscription: () => {
    const { mediaRecorder } = get()
    if (mediaRecorder && mediaRecorder.state === "recording") {
      // Immediately mark as stopped recording and processing started
      set({ isTranscribing: false, isProcessingAudio: true })
      mediaRecorder.stop()
    }
  },

  toggleTranscription: async () => {
    const { isTranscribing } = get()
    if (isTranscribing) {
      get().stopTranscription()
    } else {
      await get().startTranscription()
    }
  },

  setTranscriptionCallback: (callback) => {
    set({ transcriptionCallback: callback })
  },

  // Added setter for processing flag
  setIsProcessingAudio: (val) => set({ isProcessingAudio: val })
}))

// Attach backend-push listener globally once store is defined
if (typeof window !== "undefined" && window.api?.onPush) {
  window.api.onPush((payload) => {
    console.log("payload", payload)
    if (payload.type && payload.type === "image") {
      const message = { ...payload }
      useStore.getState().replaceLastImageMessage(message)
    }
  })
}

export default useStore
