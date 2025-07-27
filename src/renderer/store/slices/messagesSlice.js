import { StreamingService } from "../../services/streamingService.js"
import { MessageService } from "../../services/messageService.js"

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
        MessageService.addConfirmationMessage(message)
      ]
    })),

  replaceLastImageMessage: (message) =>
    set((state) => ({
      messages: MessageService.replaceOrAddImageMessage(state.messages, message)
    })),

  clearMessages: () => set({ messages: [] }),

  selectChoice: (index, choice) =>
    set((state) => ({
      messages: MessageService.updateConfirmationChoice(state.messages, index, choice)
    })),

  // Complex actions that use services
  submitQuery: async (rawQuery) => {
    const store = get()
    
    await StreamingService.submitQuery(
      rawQuery,
      store.selectedModel,
      store.addMessage,
      (messages) => set({ messages }),
      () => get().messages
    )
  },

  handleConfirmation: async (index, choice) => {
    const store = get()
    
    await StreamingService.handleConfirmation(
      index,
      choice,
      (messages) => set({ messages }),
      store.setAwaitingUserResponse,
      () => get().messages
    )
  },

  clearMessagesAndBackend: async () => {
    const store = get()
    await StreamingService.clearMessages(store.clearMessages)
  }
})

export default createMessagesSlice