import { useEffect, useCallback, useState } from "react"
import { Mic, MicOff, Loader2 } from "lucide-react"
import useStore from "../store/useStore.js"
import { CHAT_STATE } from "../store/slices/chatSlice.js"
import { DICTATION_STATE } from "../store/slices/dictationSlice.js"

export const useQueryBar = (textareaRef) => {
  const [input, setInput] = useState("")

  const chatState = useStore((s) => s.chatState)
  const dictationState = useStore((s) => s.dictationState)

  const toggleDictation = useStore((s) => s.toggleDictation)
  const handleSubmitQuery = useStore((s) => s.handleSubmitQuery)
  const setDictationCallback = useStore((s) => s.setDictationCallback)

  const getTextAreaPlaceholderText = useCallback(() => {
    if (dictationState === DICTATION_STATE.LISTENING)
      return "Listening... Press Alt+\\ to stop."
    if (dictationState === DICTATION_STATE.TRANSCRIBING)
      return "Converting speech to text..."
    if (chatState === CHAT_STATE.IDLE)
      return "What can I do for you? type `/help` for help"
    if (chatState === CHAT_STATE.WAITING_BACKEND_RESPONSE) return "Thinking..."
    if (chatState === CHAT_STATE.WAITING_USER_RESPONSE)
      return "Press Enter to confirm or Esc to cancel"
    return ""
  }, [chatState, dictationState])

  const getDictationTooltipText = useCallback(() => {
    if (dictationState === DICTATION_STATE.LISTENING) return "Stop (Alt+\\)"
    if (dictationState === DICTATION_STATE.TRANSCRIBING) return "Processing"
    return "Dictate (Alt+\\)"
  }, [dictationState])

  const getTextAreaDisabled = useCallback(() => {
    return (
      chatState !== CHAT_STATE.IDLE || dictationState !== DICTATION_STATE.IDLE
    )
  }, [chatState, dictationState])

  const canSubmitQuery = useCallback(() => {
    return (
      dictationState === DICTATION_STATE.IDLE &&
      chatState === CHAT_STATE.IDLE &&
      input.trim() !== ""
    )
  }, [dictationState, chatState, input])

  const getDictationIconType = useCallback(() => {
    if (dictationState === DICTATION_STATE.LISTENING) return "mic-off"
    if (dictationState === DICTATION_STATE.TRANSCRIBING) return "loading"
    return "mic"
  }, [dictationState])

  const getDictationVariant = useCallback(() => {
    return dictationState === DICTATION_STATE.LISTENING
      ? "destructive"
      : "ghost"
  }, [dictationState])

  const getDictationDisabled = useCallback(() => {
    return (
      chatState === CHAT_STATE.WAITING_USER_RESPONSE ||
      dictationState === DICTATION_STATE.TRANSCRIBING
    )
  }, [chatState, dictationState])

  const getUsingDictation = useCallback(() => {
    return dictationState !== DICTATION_STATE.IDLE
  }, [dictationState])

  const showRecordingIndicator = useCallback(() => {
    return dictationState === DICTATION_STATE.LISTENING
  }, [dictationState])

  const handleDictation = useCallback(() => {
    toggleDictation()
  }, [toggleDictation])

  const handleSubmit = useCallback(
    (e) => {
      e.preventDefault()
      if (canSubmitQuery()) {
        const queryText = input.trim()
        setInput("") // Clear immediately
        handleSubmitQuery(queryText)
      }
    },
    [handleSubmitQuery, input, canSubmitQuery, setInput]
  )

  const handleKeyDown = useCallback(
    (e) => {
      if (e.key === "Enter" && !e.shiftKey) {
        handleSubmit(e)
      }
    },
    [handleSubmit]
  )

  // Set up dictation callback to append text and focus cursor
  useEffect(() => {
    setDictationCallback((dictatedText) => {
      setInput((prev) => {
        const newText = prev + dictatedText
        // Focus and position cursor at the end after text is set
        setTimeout(() => {
          if (textareaRef.current) {
            textareaRef.current.focus()
            textareaRef.current.setSelectionRange(
              newText.length,
              newText.length
            )
          }
        }, 0)
        return newText
      })
    })
  }, [setDictationCallback, textareaRef, setInput])

  // Auto-resize textarea based on content
  const adjustTextareaHeight = useCallback(() => {
    const textarea = textareaRef.current
    if (textarea) {
      textarea.style.height = "auto"
      const newHeight = Math.min(textarea.scrollHeight, 150) // Max 150px
      textarea.style.height = `${newHeight}px`
    }
  }, [textareaRef])

  useEffect(() => {
    adjustTextareaHeight()
  }, [input, adjustTextareaHeight])

  useEffect(() => {
    if (chatState === CHAT_STATE.IDLE) {
      textareaRef.current?.focus()
    }
  }, [chatState])

  // Initial autofocus when component mounts
  useEffect(() => {
    textareaRef.current?.focus()
  }, [])

  return {
    // Input state
    input,
    setInput,

    // Computed values
    canSubmitQuery: canSubmitQuery(),
    placeholder: getTextAreaPlaceholderText(),
    textAreaDisabled: getTextAreaDisabled(),
    usingDictation: getUsingDictation(),
    showRecordingIndicator: showRecordingIndicator(),

    // Dictation computed values
    dictationTooltipText: getDictationTooltipText(),
    dictationIconType: getDictationIconType(),
    dictationVariant: getDictationVariant(),
    dictationDisabled: getDictationDisabled(),

    // Event handlers
    handleKeyDown,
    handleDictation,
    handleSubmit
  }
}

export default useQueryBar
