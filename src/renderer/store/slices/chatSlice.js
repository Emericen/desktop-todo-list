import { DICTATION_STATE } from "./dictationSlice.js"

const CHAT_STATE = {
  IDLE: "idle",
  WAITING_BACKEND_RESPONSE: "waiting_backend_response",
  WAITING_USER_RESPONSE: "waiting_user_response"
}

export const createChatSlice = (set, get) => ({
  chatState: CHAT_STATE.IDLE,

  // State transitions
  setChatState: (state) => {
    set({ chatState: state })
    const currentMessages = get().messages

    if (state === CHAT_STATE.WAITING_BACKEND_RESPONSE) {
      if (
        currentMessages.length === 0 ||
        currentMessages[currentMessages.length - 1].type !== "loading"
      ) {
        // append new spinner
        set({
          messages: [...currentMessages, { type: "loading", content: "" }]
        })
      }
    } else {
      // remove trailing spinner if present
      if (
        currentMessages.length > 0 &&
        currentMessages[currentMessages.length - 1].type === "loading"
      ) {
        set({ messages: currentMessages.slice(0, -1) })
      }
    }
  },

  isInputDisabled: () => {
    const { chatState } = get()
    const { dictationState } = get()
    return (
      chatState !== CHAT_STATE.IDLE || dictationState !== DICTATION_STATE.IDLE
    )
  },
  canSubmitQuery: () => get().chatState === CHAT_STATE.IDLE
})

export { CHAT_STATE }
export default createChatSlice
