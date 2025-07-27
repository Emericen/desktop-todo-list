/**
 * UI Store Slice
 * Handles UI-related state like loading states and user interaction flags
 */
export const createUISlice = (set, get) => ({
  // State
  awaitingUserResponse: false,

  // Actions
  setAwaitingUserResponse: (val) => set({ awaitingUserResponse: val }),

  // Helper methods for UI state
  isUserInputBlocked: () => {
    const { awaitingUserResponse, isTranscribing, isProcessingAudio } = get()
    return awaitingUserResponse || isTranscribing || isProcessingAudio
  },

  canSubmitQuery: () => {
    const { isUserInputBlocked } = get()
    return !isUserInputBlocked()
  },

  getInputPlaceholder: () => {
    const { awaitingUserResponse, isTranscribing, isProcessingAudio } = get()
    
    if (awaitingUserResponse) {
      return "Waiting for response..."
    }
    if (isTranscribing) {
      return "Recording..."
    }
    if (isProcessingAudio) {
      return "Processing audio..."
    }
    return "Type your message..."
  }
})

export default createUISlice