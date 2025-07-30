import { useState, useEffect, useCallback } from "react"
import useStore from "../store/useStore.js"
import { apiService } from "../services/apiService.js"

/**
 * Custom hook for handling confirmation message interactions
 * Encapsulates confirmation state and user choice handling
 */
export const useConfirmation = (message, index) => {
  const { selectChoice, setAwaitingUserResponse } = useStore()

  const handleApprove = useCallback(async () => {
    selectChoice(index, "approved")
    setAwaitingUserResponse(false)
    // Send confirmation to backend
    await apiService.handleConfirmation(true)
  }, [index, selectChoice, setAwaitingUserResponse])

  const handleReject = useCallback(async () => {
    selectChoice(index, "rejected")
    setAwaitingUserResponse(false)
    // Send confirmation to backend
    await apiService.handleConfirmation(false)
  }, [index, selectChoice, setAwaitingUserResponse])

  // Set awaiting response when component mounts and not answered
  useEffect(() => {
    if (!message.answered) {
      setAwaitingUserResponse(true)
    }

    // Cleanup: reset awaiting response when component unmounts
    return () => {
      if (!message.answered) {
        setAwaitingUserResponse(false)
      }
    }
  }, [message.answered, setAwaitingUserResponse])

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
  const { setAwaitingUserResponse } = useStore()

  const handleConfirm = useCallback(async () => {
    setIsExecuted(true)
    setAwaitingUserResponse(false)
    // Send confirmation to backend
    await apiService.handleConfirmation(true)
  }, [setAwaitingUserResponse])

  const handleCancel = useCallback(async () => {
    setIsExecuted(true)
    setResult({ success: false, error: "Command cancelled", executionTime: 0 })
    setAwaitingUserResponse(false)
    await apiService.handleConfirmation(false)
  }, [setAwaitingUserResponse])

  // Set awaiting response when component mounts and not executed
  useEffect(() => {
    if (!isExecuted && !message.executed) {
      setAwaitingUserResponse(true)
    }

    // Cleanup: reset awaiting response when component unmounts
    return () => {
      if (!isExecuted && !message.executed) {
        setAwaitingUserResponse(false)
      }
    }
  }, [isExecuted, message.executed, setAwaitingUserResponse])

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
