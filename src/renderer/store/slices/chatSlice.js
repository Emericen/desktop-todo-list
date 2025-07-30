const CHAT_STATE = {
  IDLE: "idle",
  WAITING_BACKEND_RESPONSE: "waiting_backend_response",
  WAITING_USER_RESPONSE: "waiting_user_response"
}

export const createChatSlice = (set, get) => ({
  chatState: CHAT_STATE.IDLE,

  // State transitions
  setChatState: (state) => set({ chatState: state }),

  isInputDisabled: () => {
    const { chatState } = get()
    const { dictationState } = get()
    return (
      chatState !== CHAT_STATE.IDLE || dictationState !== DICTATION_STATE.IDLE
    )
  },
  canSubmitQuery: () => get().chatState === CHAT_STATE.IDLE,

  getInputPlaceholder: () => {
    const { dictationState } = get()
    const { chatState } = get()

    if (dictationState === DICTATION_STATE.LISTENING) return "Listening..."
    if (dictationState === DICTATION_STATE.TRANSCRIBING)
      return "Transcribing..."
    if (chatState === CHAT_STATE.WAITING_BACKEND_RESPONSE)
      return "Processing..."
    if (chatState === CHAT_STATE.WAITING_USER_RESPONSE)
      return "Press Enter to confirm or Esc to cancel"

    return "What can I do for you? type `/help` for help"
  }
})

export { CHAT_STATE }
export default createChatSlice
