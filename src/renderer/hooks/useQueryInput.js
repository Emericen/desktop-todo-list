import { useState, useCallback, useEffect } from "react"
import useStore from "../store/useStore.js"
import { apiService } from "../services/apiService.js"
import { eventBus } from "../services/eventBus.js"

/**
 * Custom hook for handling query input functionality
 * Encapsulates input state, submission logic, and keyboard handling
 */
export const useQueryInput = (textareaRef) => {
  const [input, setInput] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  const submitQuery = useStore(s => s.submitQuery)
  const clearMessages = useStore(s => s.clearMessages)
  const awaitingUserResponse = useStore(s => s.awaitingUserResponse)
  const isTranscribing = useStore(s => s.isTranscribing)
  const isProcessingAudio = useStore(s => s.isProcessingAudio)

  // Auto-resize textarea based on content (matches original logic)
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

  // Focus textarea when renderer receives focus request from main process (via event bus)
  useEffect(() => {
    const cleanup = eventBus.on('focus:query-input', () => {
      textareaRef.current?.focus()
    })

    // Initial autofocus when component mounts
    textareaRef.current?.focus()

    return cleanup
  }, [textareaRef])

  const handleSubmit = useCallback(async (e) => {
    e.preventDefault()
    if (!input.trim() || isSubmitting) return

    const messageText = input.trim()
    setInput("")
    setIsSubmitting(true)

    try {
      // Handle local clear command
      if (messageText === "/clear") {
        // Clear frontend state
        clearMessages()
        // Ask backend to reset its conversation context
        apiService.clearAgentMessages().catch((err) =>
          console.error("Failed to clear backend messages", err)
        )
        setIsSubmitting(false)
        return
      }

      submitQuery(messageText)
    } catch (error) {
      console.error("Error submitting message:", error)
      setInput(messageText) // Restore input on error
    } finally {
      setIsSubmitting(false)
    }
  }, [input, isSubmitting, clearMessages, submitQuery])

  const handleKeyDown = useCallback((e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSubmit(e)
    }
  }, [handleSubmit])

  // Check if input should be disabled
  const isInputDisabled = awaitingUserResponse || isTranscribing || isProcessingAudio

  // Get input placeholder text
  const getPlaceholder = useCallback(() => {
    if (awaitingUserResponse) return "Waiting for response..."
    if (isTranscribing) return "Recording..."
    if (isProcessingAudio) return "Processing audio..."
    return "Type your message..."
  }, [awaitingUserResponse, isTranscribing, isProcessingAudio])

  return {
    input,
    setInput,
    isSubmitting,
    isInputDisabled,
    handleSubmit,
    handleKeyDown,
    getPlaceholder,
    adjustTextareaHeight
  }
}

export default useQueryInput