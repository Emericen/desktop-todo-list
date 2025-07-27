import { app } from "electron"
import fs from "fs"
import path from "path"

export default class OpenAIClient {
  constructor() {
    this.platformBaseUrl = "https://www.uiassistant.io"
  }

  async transcribeAudio(audioBuffer, filename = "audio.webm") {
    try {
      // Create temp file path
      const tempDir = app.getPath("temp")
      const tempFilePath = path.join(tempDir, filename)

      // Write buffer to temp file
      fs.writeFileSync(tempFilePath, audioBuffer)

      // Create form data for platform API
      const formData = new FormData()
      const fileBlob = new Blob([fs.readFileSync(tempFilePath)], {
        type: filename.includes(".webm") ? "audio/webm" : "audio/wav"
      })
      formData.append("file", fileBlob, filename)
      formData.append("model", "whisper-1")
      formData.append("response_format", "text")

      // Call platform API
      const response = await fetch(`${this.platformBaseUrl}/api/transcribe`, {
        method: "POST",
        body: formData
      })

      if (!response.ok) {
        throw new Error(`Platform API error: ${response.status}`)
      }

      const transcription = await response.text()

      // Clean up temp file
      fs.unlinkSync(tempFilePath)

      return { success: true, text: transcription }
    } catch (error) {
      console.error("OpenAI Transcription Error:", error)
      return { success: false, error: error.message }
    }
  }
}
