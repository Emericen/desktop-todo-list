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
    store.setChatState("waiting_backend_response")

    try {
      // Direct API call
      await window.api.sendQuery({ query }, (newMessage) => {
        const currentState = get()
        let msgs = currentState.messages

        // Remove trailing spinner before adding real content
        if (msgs.length && msgs[msgs.length - 1].type === "loading") {
          msgs = msgs.slice(0, -1)
        }
        const updatedMessages = [...msgs]
        const lastIndex = updatedMessages.length - 1

        if (
          updatedMessages[lastIndex]?.type === "text" &&
          newMessage.type === "text"
        ) {
          updatedMessages[lastIndex] = {
            ...updatedMessages[lastIndex],
            content: updatedMessages[lastIndex].content + newMessage.content
          }
        } else if (newMessage.type === "confirmation") {
          updatedMessages.push({ ...newMessage, answer: null })
          store.setChatState("waiting_user_response")
        } else {
          updatedMessages.push({ ...newMessage })
        }

        // If still waiting for backend, append spinner again
        if (get().chatState === "waiting_backend_response") {
          updatedMessages.push({ type: "loading", content: "" })
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
        console.log("APPROVED")
        store.setMessage(confirmationIndex, {
          ...store.messages[confirmationIndex],
          answer: "approved"
        })
        store.setChatState("waiting_backend_response")
        await window.api.handleConfirmation(true)
      } else {
        console.log("REJECTED")
        store.setMessage(confirmationIndex, {
          ...store.messages[confirmationIndex],
          answer: "rejected"
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
