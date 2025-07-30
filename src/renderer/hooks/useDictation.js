import { useEffect, useCallback } from "react"
import useStore from "../store/useStore.js"
import { DICTATION_STATE } from "../store/slices/dictationSlice.js"

/**
 * Custom hook for handling audio transcription functionality
 * Encapsulates transcription state and callback setup
 */
export const useDictation = (textInputRef, setInput) => {
  const dictationState = useStore((s) => s.dictationState)
  const toggleDictation = useStore((s) => s.toggleDictation)
  const setDictationCallback = useStore((s) => s.setDictationCallback)

  // Set up transcription callback to append text to input
  useEffect(() => {
    setDictationCallback((dictatedText) => {
      setInput((prev) => {
        const newText = prev + dictatedText
        // Focus and position cursor at the end after text is set
        setTimeout(() => {
          if (textInputRef.current) {
            textInputRef.current.focus()
            textInputRef.current.setSelectionRange(
              newText.length,
              newText.length
            )
          }
        }, 0)
        return newText
      })
    })
  }, [setDictationCallback, textInputRef, setInput])

  const handleDictation = useCallback(() => {
    toggleDictation()
  }, [toggleDictation])

  const getDictationTooltipText = (state) => {
    switch (state) {
      case DICTATION_STATE.LISTENING:
        return "Stop (Alt+\\)"
      case DICTATION_STATE.TRANSCRIBING:
        return "Processing"
      default:
        return "Dictate (Alt+\\)"
    }
  }

  return {
    dictationState,
    handleDictation,
    getDictationTooltipText
  }
}

export default useDictation
