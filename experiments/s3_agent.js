import Anthropic from "@anthropic-ai/sdk"
import dotenv from "dotenv"
import fs from "fs"

dotenv.config()

// Load screenshot image as base64
const imageData = fs.readFileSync("resources/screenshot-macos.jpg", "base64")

const anthropicClient = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY
})

const macosSystem = `Help user to accomplish tasks on the computer. The user will provide you with a screenshot of the computer and you will need to use the tools to accomplish the task.
    - When working with local directory stuff, you should always use bash tool instead of clicking around computer.
    - Operating System: darwin (macOS)
    - Shell: bash (use Unix commands like ls, cd, cat, etc.)
    - Use appropriate commands for the user's operating system.`

const windowsSystem = `Help user to accomplish tasks on the computer. The user will provide you with a screenshot of the computer and you will need to use the tools to accomplish the task.
    - When working with local directory stuff, you should always use bash tool instead of clicking around computer.
    - Operating System: win32 (Windows)
    - Shell: cmd (use Windows commands like dir, cd, type, etc.)
    - Use appropriate commands for the user's operating system.`

const linuxSystem = `Help user to accomplish tasks on the computer. The user will provide you with a screenshot of the computer and you will need to use the tools to accomplish the task.
    - When working with local directory stuff, you should always use bash tool instead of clicking around computer.
    - Operating System: linux (Linux)
    - Shell: bash (use Unix commands like ls, cd, cat, etc.)
    - Use appropriate commands for the user's operating system.`

const messages = [
  {
    role: "user",
    content: [
      {
        type: "image",
        source: {
          type: "base64",
          media_type: "image/jpeg",
          data: imageData
        }
      },
      { type: "text", text: "close the terminal" }
    ]
  }
]

const response = await anthropicClient.beta.messages.create({
  model: "claude-sonnet-4-20250514",
  tools: [
    // {
    //   type: "computer_20250124",
    //   name: "computer",
    //   display_width_px: 1280,
    //   display_height_px: 720,
    //   display_number: 1
    // },
    {
      type: "custom",
      name: "left_click",
      description:
        "Click the left mouse button at designated location on the screen.",
      input_schema: {
        type: "object",
        properties: {
          x: {
            type: "number",
            description:
              "The x pixel coordinate of the location to click. Ranging from 1 to 1280."
          },
          y: {
            type: "number",
            description:
              "The y pixel coordinate of the location to click. Ranging from 1 to 720."
          }
        }
      }
    },
    {
      type: "custom",
      name: "right_click",
      description:
        "Click the right mouse button at designated location on the screen.",
      input_schema: {
        type: "object",
        properties: {
          x: {
            type: "number",
            description:
              "The x pixel coordinate of the location to click. Ranging from 1 to 1280."
          },
          y: {
            type: "number",
            description:
              "The y pixel coordinate of the location to click. Ranging from 1 to 720."
          }
        }
      }
    },
    {
      type: "custom",
      name: "double_click",
      description:
        "Double click the mouse button at designated location on the screen.",
      input_schema: {
        type: "object",
        properties: {
          x: {
            type: "number",
            description:
              "The x pixel coordinate of the location to click. Ranging from 1 to 1280."
          },
          y: {
            type: "number",
            description:
              "The y pixel coordinate of the location to click. Ranging from 1 to 720."
          }
        }
      }
    },
    {
      type: "custom",
      name: "type",
      description:
        "Perform a sequence of keyboard inputs. Note this should be used after you click and focus the cursor on the text input field, etc.",
      input_schema: {
        type: "object",
        properties: {
          text: {
            type: "string",
            description:
              "The text to type. Can be any string valid for US keyboard, and can include special characters like `, *, etc."
          }
        }
      }
    },
    { type: "bash_20250124", name: "bash" }
  ],
  betas: ["computer-use-2025-01-24"],
  system: macosSystem,
  messages: messages,
  //   thinking: { type: "enabled", budget_tokens: 1024 },
  max_tokens: 1024,
  temperature: 0.0,
  stream: false
})

console.log(JSON.stringify(response, null, 2))
