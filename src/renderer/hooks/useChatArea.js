import { useState, useEffect, useCallback } from "react"
import useStore from "../store/useStore.js"

/**
 * Custom hook for handling chat area functionality
 * Consolidates message state and confirmation logic
 */
export const useChatArea = () => {
  const messages = useStore((s) => s.messages)

  // Confirmation handling (consolidated from useConfirmation)
  const selectChoice = useStore((s) => s.selectChoice)
  const setChatState = useStore((s) => s.setChatState)
  const handleConfirmation = useStore((s) => s.handleConfirmation)

  const handleApprove = useCallback(
    async (index) => {
      selectChoice(index, "approved")
      await handleConfirmation(true)
    },
    [selectChoice, handleConfirmation]
  )

  const handleReject = useCallback(
    async (index) => {
      selectChoice(index, "rejected")
      await handleConfirmation(false)
    },
    [selectChoice, handleConfirmation]
  )

  // Terminal confirmation handling
  const handleTerminalConfirm = useCallback(async () => {
    setChatState("waiting_backend_response")
    try {
      await handleConfirmation(true)
      setChatState("idle")
    } catch (error) {
      console.error("Terminal confirmation failed:", error)
      setChatState("idle")
    }
  }, [setChatState, handleConfirmation])

  const handleTerminalCancel = useCallback(async () => {
    setChatState("idle")
    await handleConfirmation(false)
  }, [setChatState, handleConfirmation])

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

  return {
    messages,
    handleApprove,
    handleReject,
    handleTerminalConfirm,
    handleTerminalCancel
  }
}

export default useChatArea
