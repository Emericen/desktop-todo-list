import { useEffect, useCallback } from "react"
import useStore from "../store/useStore.js"

/**
 * Custom hook for handling audio transcription functionality
 * Encapsulates transcription state and callback setup
 */
export const useTranscription = (textInputRef, setInput) => {
  const isTranscribing = useStore(s => s.isTranscribing)
  const isProcessingAudio = useStore(s => s.isProcessingAudio)
  const toggleTranscription = useStore(s => s.toggleTranscription)
  const setTranscriptionCallback = useStore(s => s.setTranscriptionCallback)

  // Set up transcription callback to append text to input
  useEffect(() => {
    setTranscriptionCallback((transcribedText) => {
      setInput((prev) => {
        const newText = prev + transcribedText
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
  }, [setTranscriptionCallback, textInputRef, setInput])

  const handleTranscribe = useCallback(() => {
    toggleTranscription()
  }, [toggleTranscription])

  // Get transcription button state and text
  const getTranscriptionState = useCallback(() => {
    if (isProcessingAudio) {
      return { isActive: false, text: "Processing...", disabled: false }
    }
    if (isTranscribing) {
      return { isActive: true, text: "Recording...", disabled: false }
    }
    return { isActive: false, text: "Start Recording", disabled: false }
  }, [isTranscribing, isProcessingAudio])

  return {
    isTranscribing,
    isProcessingAudio,
    handleTranscribe,
    getTranscriptionState
  }
}

export default useTranscription