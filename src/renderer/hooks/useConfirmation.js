import { useState, useEffect, useCallback } from "react"
import useStore from "../store/useStore.js"

/**
 * Custom hook for handling confirmation message interactions
 * Encapsulates confirmation state and user choice handling
 */
export const useConfirmation = (message, index) => {
  const selectChoice = useStore(s => s.selectChoice)
  const setChatState = useStore(s => s.setChatState)
  const handleConfirmation = useStore(s => s.handleConfirmation)

  const handleApprove = useCallback(async () => {
    selectChoice(index, "approved")
    await handleConfirmation(true)
  }, [index, selectChoice, handleConfirmation])

  const handleReject = useCallback(async () => {
    selectChoice(index, "rejected")
    await handleConfirmation(false)
  }, [index, selectChoice, handleConfirmation])

  // Set awaiting response when component mounts and not answered
  useEffect(() => {
    if (!message.answered) {
      setChatState('waiting_user_response')
    }

    // Cleanup: reset chat state when component unmounts
    return () => {
      if (!message.answered) {
        setChatState('idle')
      }
    }
  }, [message.answered, setChatState])

  // Keyboard shortcuts for confirmation
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Only handle if this confirmation is active (not answered)
      if (message.answered) return

      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault()
        handleApprove()
      }
      if (e.key === "Delete" || e.key === "Backspace") {
        e.preventDefault()
        handleReject()
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [message.answered, handleApprove, handleReject])

  return {
    handleApprove,
    handleReject,
    isAnswered: message.answered,
    choice: message.answered
  }
}

/**
 * Custom hook for handling terminal command confirmations
 * Similar to useConfirmation but for terminal execution
 */
export const useTerminalConfirmation = (message) => {
  const [isExecuted, setIsExecuted] = useState(message.executed || false)
  const [result, setResult] = useState(message.result || null)
  const setChatState = useStore(s => s.setChatState)
  const handleConfirmation = useStore(s => s.handleConfirmation)

  const handleConfirm = useCallback(async () => {
    setIsExecuted(true)
    setChatState('idle')
    await handleConfirmation(true)
  }, [setChatState, handleConfirmation])

  const handleCancel = useCallback(async () => {
    setIsExecuted(true)
    setResult({ success: false, error: "Command cancelled", executionTime: 0 })
    setChatState('idle')
    await handleConfirmation(false)
  }, [setChatState, handleConfirmation])

  // Set awaiting response when component mounts and not executed
  useEffect(() => {
    if (!isExecuted && !message.executed) {
      setChatState('waiting_user_response')
    }

    // Cleanup: reset chat state when component unmounts
    return () => {
      if (!isExecuted && !message.executed) {
        setChatState('idle')
      }
    }
  }, [isExecuted, message.executed, setChatState])

  // Keyboard shortcuts for terminal confirmation
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Only handle if this command is not executed
      if (isExecuted || message.executed) return

      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault()
        handleConfirm()
      }
      if (e.key === "Delete" || e.key === "Backspace") {
        e.preventDefault()
        handleCancel()
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [isExecuted, message.executed, handleConfirm, handleCancel])

  return {
    isExecuted,
    result,
    handleConfirm,
    handleCancel
  }
}

export default useConfirmation
