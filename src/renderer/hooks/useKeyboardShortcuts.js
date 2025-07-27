import { useEffect } from "react"
import useStore from "../store/useStore.js"
import { eventBus } from "../services/eventBus.js"

/**
 * Custom hook for handling global keyboard shortcuts
 * Encapsulates all app-wide keyboard shortcuts in one place
 */
export const useKeyboardShortcuts = () => {
  const toggleTranscription = useStore(s => s.toggleTranscription)
  const clearMessages = useStore(s => s.clearMessages)

  // Handle Alt+\ for transcription toggle
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.altKey && e.code === "Backslash") {
        e.preventDefault()
        toggleTranscription()
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [toggleTranscription])

  // Handle clear messages event from main process via event bus
  useEffect(() => {
    const cleanup = eventBus.on('clear-listener:triggered', () => {
      clearMessages()
    })
    return cleanup
  }, [clearMessages])

  // Return shortcut info for documentation/help
  return {
    shortcuts: [
      {
        key: "Alt + \\",
        description: "Toggle audio transcription",
        action: "toggleTranscription"
      },
      {
        key: "Enter",
        description: "Approve confirmation (when awaiting response)",
        action: "approve"
      },
      {
        key: "Delete/Backspace", 
        description: "Reject confirmation (when awaiting response)",
        action: "reject"
      }
    ]
  }
}

export default useKeyboardShortcuts