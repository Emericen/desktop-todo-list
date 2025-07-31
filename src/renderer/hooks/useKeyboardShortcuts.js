import { useEffect } from "react"
import useStore from "../store/useStore.js"

/**
 * Custom hook for handling global keyboard shortcuts
 * Encapsulates all app-wide keyboard shortcuts in one place
 */
export const useKeyboardShortcuts = () => {
  const toggleDictation = useStore((s) => s.toggleDictation)

  // Handle Alt+\ for dictation toggle
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.altKey && e.code === "Backslash") {
        e.preventDefault()
        toggleDictation()
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [toggleDictation])

  // Note: Clear messages can be handled via '/clear' command in chat

  // Return shortcut info for documentation/help
  return {
    shortcuts: [
      {
        key: "Alt + \\",
        description: "Toggle audio dictation",
        action: "toggleDictation"
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
