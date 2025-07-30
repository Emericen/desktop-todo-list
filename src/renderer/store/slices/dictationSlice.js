import { apiService } from "../../services/apiService.js"

const DICTATION_STATE = {
  IDLE: "idle",
  LISTENING: "listening",
  TRANSCRIBING: "transcribing"
}

export const createDictationSlice = (set, get) => ({
  // State
  dictationState: DICTATION_STATE.IDLE,
  mediaRecorder: null,
  audioChunks: [],
  dictationCallback: null,

  // Actions
  setDictationState: (state) => set({ dictationState: state }),
  setDictationCallback: (callback) => set({ dictationCallback: callback }),

  // Complex transcription actions
  startDictation: async () => {
    set({ dictationState: DICTATION_STATE.LISTENING })

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
        const { audioChunks, dictationCallback } = get()
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
          set({ dictationState: DICTATION_STATE.TRANSCRIBING })
          const result = await apiService.transcribeAudio({
            audio: base64Audio,
            filename: "recording.webm"
          })

          if (result.success) {
            // Call the callback if provided
            if (dictationCallback) {
              dictationCallback(result.text.trim())
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
          dictationState: DICTATION_STATE.IDLE,
          mediaRecorder: null,
          audioChunks: []
        })
      }

      mediaRecorder.start()
    } catch (error) {
      console.error("Error accessing microphone:", error)
      set({ dictationState: DICTATION_STATE.IDLE })
    }
  },

  stopDictation: () => {
    const { mediaRecorder } = get()
    if (mediaRecorder && mediaRecorder.state === "recording") {
      // Immediately mark as stopped recording and processing started
      set({ dictationState: DICTATION_STATE.TRANSCRIBING })
      mediaRecorder.stop()
    }
  },

  toggleDictation: async () => {
    const store = get()
    if (store.dictationState === DICTATION_STATE.LISTENING) {
      store.stopDictation()
    } else {
      await store.startDictation()
    }
  }
})

export { DICTATION_STATE }
export default createDictationSlice
