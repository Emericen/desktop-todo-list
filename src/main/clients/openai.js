import OpenAI from "openai"
import dotenv from "dotenv"
import fs from "fs"
import path from "path"
import { app } from "electron"

// Load environment variables
dotenv.config()

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
})

export async function transcribeAudio(audioBuffer, filename = "audio.webm") {
  try {
    // Create temp file path
    const tempDir = app.getPath("temp")
    const tempFilePath = path.join(tempDir, filename)

    // Write buffer to temp file
    fs.writeFileSync(tempFilePath, audioBuffer)

    // Create readable stream for OpenAI API
    const transcription = await openai.audio.transcriptions.create({
      file: fs.createReadStream(tempFilePath),
      model: "whisper-1",
      response_format: "text"
    })

    // Clean up temp file
    fs.unlinkSync(tempFilePath)

    return { success: true, text: transcription }
  } catch (error) {
    console.error("OpenAI Transcription Error:", error)
    return { success: false, error: error.message }
  }
}
