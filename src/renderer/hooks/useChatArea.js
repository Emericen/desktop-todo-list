import { useEffect, useCallback, useRef } from "react"
import useStore from "../store/useStore.js"

/**
 * Custom hook for handling chat area functionality
 * Consolidates message state and confirmation logic
 */
export const useChatArea = () => {
  const messages = useStore((s) => s.messages)
  const bottomRef = useRef(null)
  const handleConfirmation = useStore((s) => s.handleConfirmation)

  const handleApprove = useCallback(async () => {
    await handleConfirmation(true)
  }, [handleConfirmation])

  const handleReject = useCallback(async () => {
    await handleConfirmation(false)
  }, [handleConfirmation])

  // Set up keyboard shortcuts for active confirmations
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Find active confirmation (not answered)
      const activeConfirmation = messages.find(
        (msg, index) => msg.type === "confirmation" && !msg.answered
      )

      if (!activeConfirmation) return

      const activeIndex = messages.findIndex(
        (msg, index) => msg.type === "confirmation" && !msg.answered
      )

      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault()
        handleApprove(activeIndex)
      }
      if (e.key === "Delete" || e.key === "Backspace") {
        e.preventDefault()
        handleReject(activeIndex)
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [messages, handleApprove, handleReject])

  useEffect(() => {
    requestAnimationFrame(() => {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" })
    })
  }, [messages])

  return {
    messages,
    bottomRef,
    handleApprove,
    handleReject
  }
}

export default useChatArea
