/**
 * Messages Store Slice
 * Handles all message-related state and actions
 */
export const createMessagesSlice = (set, get) => ({
  // State
  messages: [],

  // Actions
  addMessage: (message) => set({ messages: [...get().messages, message] }),
  setMessage: (index, message) => {
    const messages = get().messages
    const updatedMessages = [...messages]
    updatedMessages[index] = message
    set({ messages: updatedMessages })
  },

  // Direct API actions
  handleSubmitQuery: async (rawQuery) => {
    const query = rawQuery.trim()
    if (!query) return

    if (query === "/clear") {
      set({ messages: [] })
      await window.api.clearAgentMessages()
      return
    }

    const store = get()
    store.addMessage({ type: "user", content: query })
    store.addMessage({ type: "loading", content: "" })
    store.setChatState("waiting_backend_response")

    try {
      // Direct API call
      await window.api.sendQuery({ query }, (newMessage) => {
        const messages = get().messages
        const updatedMessages = [...messages]
        const lastIndex = updatedMessages.length - 1

        if (updatedMessages[lastIndex]?.type === "loading") {
          updatedMessages[lastIndex] = { ...newMessage }
        }

        if (
          updatedMessages[lastIndex]?.type === "text" &&
          newMessage.type === "text"
        ) {
          updatedMessages[lastIndex] = {
            ...updatedMessages[lastIndex],
            content: updatedMessages[lastIndex].content + newMessage.content
          }
          store.addMessage({ type: "loading", content: "" })
        } else if (newMessage.type === "confirmation") {
          updatedMessages.push({ ...newMessage, answer: undefined })
          store.setChatState("waiting_user_response")
        } else {
          updatedMessages.push({ ...newMessage })
          store.setChatState("waiting_backend_response")
          store.addMessage({ type: "loading", content: "" })
        }

        set({ messages: updatedMessages })
      })

      store.setChatState("idle")
    } catch (error) {
      console.error("Query failed:", error)
      store.setChatState("idle")
    }
  },

  handleConfirmation: async (approved) => {
    const store = get()
    const confirmationIndex = store.messages.length - 1

    store.setChatState("waiting_user_response")

    try {
      if (approved) {
        store.setMessage(confirmationIndex, {
          ...store.messages[confirmationIndex],
          answer: true
        })
        store.setChatState("waiting_backend_response")
        store.addMessage({ type: "loading", content: "" })
        await window.api.handleConfirmation(true)
      } else {
        store.setMessage(confirmationIndex, {
          ...store.messages[confirmationIndex],
          answer: false
        })
        await window.api.handleConfirmation(false)
        store.setChatState("idle")
      }
    } catch (error) {
      console.error("Confirmation failed:", error)
      store.setChatState("idle")
    }
  }
})

export default createMessagesSlice
