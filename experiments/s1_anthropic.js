import Anthropic from '@anthropic-ai/sdk'
import fs from 'fs'
import dotenv from 'dotenv'

dotenv.config()

const imageData = fs.readFileSync('resources/screenshot.jpg', 'base64')

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY
})

async function main() {
  const message = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 1024,
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'image',
            source: {
              type: 'base64',
              media_type: 'image/jpeg',
              data: imageData // Base64-encoded image data as string
            }
          },
          {
            type: 'text',
            text: 'Describe this image.'
          }
        ]
      }
    ]
  })

  console.log(message)
}

main()
