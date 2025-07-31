// Inline message utilities instead of service layer
const MessageUtils = {
  addConfirmationMessage: (message) => {
    return message.type === "confirmation"
      ? { ...message, answered: null }
      : message
  },

  replaceOrAddImageMessage: (messages, newMessage) => {
    if (
      messages.length !== 0 &&
      messages[messages.length - 1].type === "image"
    ) {
      return [...messages.slice(0, -1), newMessage]
    }
    return [...messages, newMessage]
  },

  updateConfirmationChoice: (messages, index, choice) => {
    const updatedMessages = [...messages]
    if (
      updatedMessages[index] &&
      updatedMessages[index].type === "confirmation"
    ) {
      updatedMessages[index] = { ...updatedMessages[index], answered: choice }
    }
    return updatedMessages
  },

  createUserMessage: (content) => ({
    type: "user",
    content: content.trim(),
    timestamp: new Date()
  }),

  createLoadingMessage: () => ({
    type: "loading",
    content: "",
    timestamp: new Date()
  })
}

/**
 * Messages Store Slice
 * Handles all message-related state and actions
 */
export const createMessagesSlice = (set, get) => ({
  // State
  messages: [],

  // Actions
  addMessage: (message) =>
    set((state) => ({
      messages: [
        ...state.messages,
        MessageUtils.addConfirmationMessage(message)
      ]
    })),

  replaceLastImageMessage: (message) =>
    set((state) => ({
      messages: MessageUtils.replaceOrAddImageMessage(state.messages, message)
    })),

  clearMessages: () => set({ messages: [] }),

  selectChoice: (index, choice) =>
    set((state) => ({
      messages: MessageUtils.updateConfirmationChoice(
        state.messages,
        index,
        choice
      )
    })),

  // Direct API actions
  handleSubmitQuery: async (rawQuery) => {
    const query = rawQuery.trim()
    if (!query) return

    const store = get()

    // Add user message
    const userMessage = MessageUtils.createUserMessage(query)
    store.addMessage(userMessage)

    // Add loading message
    const loadingMessage = MessageUtils.createLoadingMessage()
    store.addMessage(loadingMessage)

    // Set chat state to waiting
    store.setChatState("waiting_backend_response")

    try {
      // Direct API call
      await window.api.sendQuery(
        { query, selectedModel: store.selectedModel },
        (streamData) => {
          // Handle streaming data - replace loading message with response
          const messages = get().messages
          const updatedMessages = [...messages]
          const lastIndex = updatedMessages.length - 1
          
          // If last message is loading, replace it. Otherwise append.
          if (updatedMessages[lastIndex]?.type === "loading") {
            updatedMessages[lastIndex] = {
              ...streamData,
              timestamp: new Date()
            }
          } else if (updatedMessages[lastIndex]?.type === "text") {
            // Append to existing text message for streaming
            updatedMessages[lastIndex] = {
              ...updatedMessages[lastIndex],
              content: updatedMessages[lastIndex].content + streamData.content
            }
          } else {
            // Add as new message
            updatedMessages.push({
              ...streamData,
              timestamp: new Date()
            })
          }
          
          set({ messages: updatedMessages })
        }
      )

      store.setChatState("idle")
    } catch (error) {
      console.error("Query failed:", error)
      store.setChatState("idle")
    }
  },

  handleConfirmation: async (confirmed) => {
    const store = get()
    store.setChatState("waiting_backend_response")

    try {
      await window.api.handleConfirmation(confirmed)
      store.setChatState("idle")
    } catch (error) {
      console.error("Confirmation failed:", error)
      store.setChatState("idle")
    }
  }
})

export default createMessagesSlice
