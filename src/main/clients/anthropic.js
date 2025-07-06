import Anthropic from "@anthropic-ai/sdk"
import dotenv from "dotenv"

// Load environment variables
dotenv.config()

export default class AnthropicClient {
  constructor() {
    this.anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  }

  async sendQuery(payload, onResponseToken) {
    const messages = this.convertToAnthropicMessage(payload.messages)
    try {
      // Log request with truncated base64 strings
      console.log(
        "sending to anthropic:",
        JSON.stringify(this.truncateBase64(messages), null, 2)
      )

      if (onResponseToken) {
        // Use streaming for real-time response
        const stream = await this.anthropic.messages.create({
          model: "claude-sonnet-4-20250514",
          max_tokens: 1024,
          messages: messages,
          stream: true
        })

        let fullResponse = ""

        for await (const chunk of stream) {
          if (chunk.type === "content_block_delta" && chunk.delta?.text) {
            const text = chunk.delta.text
            fullResponse += text
            onResponseToken({ type: "text", content: text })
          }
        }

        return { type: "text", content: fullResponse }
      } else {
        // Non-streaming response
        const message = await this.anthropic.messages.create({
          model: "claude-sonnet-4-20250514",
          max_tokens: 1024,
          messages: messages
        })

        const response = message.content[0]?.text || ""
        return { type: "text", content: response }
      }
    } catch (error) {
      console.error("Anthropic API Error:", error)
      return {
        type: "error",
        content: `Error calling Anthropic API: ${error.message}`
      }
    }
  }

  convertToAnthropicMessage(messages) {
    const messageConverters = {
      user: (msg) => ({ role: "user", content: msg.content }),
      text: (msg) => ({ role: "assistant", content: msg.content }),
      image: (msg) => {
        let base64Data = msg.content
        let mediaType = "image/jpeg"

        if (msg.content.startsWith("data:image/")) {
          const [header, data] = msg.content.split(",")
          base64Data = data
          const mtMatch = header.match(/data:(.*);base64/)
          if (mtMatch) mediaType = mtMatch[1]
        }

        return {
          role: "user",
          content: [
            {
              type: "image",
              source: {
                type: "base64",
                media_type: mediaType,
                data: base64Data
              }
            }
          ]
        }
      }
    }

    return messages.map((msg) => {
      const converter = messageConverters[msg.type]
      if (!converter) {
        throw new Error(`Unknown message type: ${msg.type}`)
      }
      return converter(msg)
    })
  }

  // Convert full length base64 to `qweasd[...][chars]` for logging & debugging
  truncateBase64(obj) {
    // Case 1: raw data URL string
    if (typeof obj === "string" && obj.startsWith("data:image/")) {
      const [header, data] = obj.split(",")
      return `${header},${data.substring(0, 20)}...${data.substring(
        data.length - 10
      )} [${data.length} chars]`
    }

    // Case 2: very long plain base-64 string (heuristic: >100 chars & only base64 chars)
    if (
      typeof obj === "string" &&
      obj.length > 100 &&
      /^[A-Za-z0-9+/=]+$/.test(obj)
    ) {
      return `${obj.substring(0, 20)}...${obj.substring(obj.length - 10)} [${
        obj.length
      } chars]`
    }

    // Case 3: object with { type: 'base64', data: '...' }
    if (obj && typeof obj === "object") {
      if (obj.type === "base64" && typeof obj.data === "string") {
        const data = obj.data
        return {
          ...obj,
          data: `${data.substring(0, 20)}...${data.substring(
            data.length - 10
          )} [${data.length} chars]`
        }
      }

      if (Array.isArray(obj)) {
        return obj.map((item) => this.truncateBase64(item))
      }

      const truncated = {}
      for (const [key, value] of Object.entries(obj)) {
        truncated[key] = this.truncateBase64(value)
      }
      return truncated
    }
    return obj
  }
}
