import { apiService } from "../../services/apiService.js"

/**
 * Transcription Store Slice
 * Handles all audio recording and transcription logic
 */
export const createTranscriptionSlice = (set, get) => ({
  // State
  isTranscribing: false,
  isProcessingAudio: false,
  mediaRecorder: null,
  audioChunks: [],
  transcriptionCallback: null,

  // Actions
  setIsTranscribing: (val) => set({ isTranscribing: val }),
  setIsProcessingAudio: (val) => set({ isProcessingAudio: val }),
  setTranscriptionCallback: (callback) =>
    set({ transcriptionCallback: callback }),

  // Complex transcription actions
  startTranscription: async () => {
    set({ isTranscribing: true, isProcessingAudio: false })

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mediaRecorder = new MediaRecorder(stream)

      set({ mediaRecorder, audioChunks: [] })

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          set((state) => ({ audioChunks: [...state.audioChunks, event.data] }))
        }
      }

      mediaRecorder.onstop = async () => {
        const { audioChunks, transcriptionCallback } = get()
        const audioBlob = new Blob(audioChunks, { type: "audio/webm" })

        // Convert to base64 using browser FileReader API
        const base64Audio = await new Promise((resolve) => {
          const reader = new FileReader()
          reader.onloadend = () => resolve(reader.result.split(",")[1])
          reader.readAsDataURL(audioBlob)
        })

        // Send to main process for transcription
        try {
          // Flag while waiting response
          set({ isProcessingAudio: true })
          const result = await apiService.transcribeAudio({
            audio: base64Audio,
            filename: "recording.webm"
          })

          if (result.success) {
            // Call the callback if provided
            if (transcriptionCallback) {
              transcriptionCallback(result.text.trim())
            }
          } else {
            console.error("Transcription failed:", result.error)
          }
        } catch (error) {
          console.error("Transcription error:", error)
        }

        // Clean up & reset flags
        stream.getTracks().forEach((track) => track.stop())
        set({
          isTranscribing: false,
          isProcessingAudio: false,
          mediaRecorder: null,
          audioChunks: []
        })
      }

      mediaRecorder.start()
    } catch (error) {
      console.error("Error accessing microphone:", error)
      set({ isTranscribing: false })
    }
  },

  stopTranscription: () => {
    const { mediaRecorder } = get()
    if (mediaRecorder && mediaRecorder.state === "recording") {
      // Immediately mark as stopped recording and processing started
      set({ isTranscribing: false, isProcessingAudio: true })
      mediaRecorder.stop()
    }
  },

  toggleTranscription: async () => {
    const store = get()
    if (store.isTranscribing) {
      store.stopTranscription()
    } else {
      await store.startTranscription()
    }
  }
})

export default createTranscriptionSlice
