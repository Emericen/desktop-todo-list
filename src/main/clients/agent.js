import Anthropic from "@anthropic-ai/sdk"
import dotenv from "dotenv"
import Terminal from "./terminal.js"
import IOClient from "./io.js"
dotenv.config()

const baseSystem = `You are an AI assistant that helps users accomplish tasks on their computer using command-line tools.

HOW YOU OPERATE:
You receive a user query along with a screenshot of their current desktop. You can:
1. Respond with text to explain what you're doing
2. Use the bash tool to execute commands (including GUI automation)
3. After each bash command, you'll receive a new screenshot showing the updated state
4. Continue this cycle until the task is complete

AVAILABLE AUTOMATION:
You have access to GUI automation tools through bash commands:
- Mouse clicks, typing, window management
- File operations, directory navigation  
- Application launching and control
- System commands and utilities

EXECUTION APPROACH:
- Execute one command at a time using the bash tool
- Each command will be followed by a screenshot showing the result
- Use the visual feedback to plan your next action
- Be methodical and verify each step before proceeding

IMPORTANT:
- Always execute commands one at a time
- Use the screenshot feedback to guide your next action
- If something doesn't work as expected, adjust your approach
- After you click on certain UIs, you should wait for a moment before continuing. Use bash tool and sleep for certain amount of time.
- Explain what you're doing so the user understands your process`

const windowsPrompt = `Operating System: win32 (Windows) | Shell: PowerShell`
const macosPrompt = `Operating System: darwin (macOS) | Shell: bash`
const linuxPrompt = `Operating System: linux (Linux) | Shell: bash`

const tools = [
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
    name: "drag",
    description:
      "Drag the mouse with left button held down from one location to another on the screen. Useful for moving windows, selecting text, or dragging and dropping items.",
    input_schema: {
      type: "object",
      properties: {
        x1: {
          type: "number",
          description:
            "The x pixel coordinate where the drag starts. Ranging from 1 to 1280."
        },
        y1: {
          type: "number",
          description:
            "The y pixel coordinate where the drag starts. Ranging from 1 to 720."
        },
        x2: {
          type: "number",
          description:
            "The x pixel coordinate where the drag ends. Ranging from 1 to 1280."
        },
        y2: {
          type: "number",
          description:
            "The y pixel coordinate where the drag ends. Ranging from 1 to 720."
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
]

export default class Agent {
  constructor() {
    this.ioClient = new IOClient()

    this.anthropicClient = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY
    })

    this.system =
      baseSystem.trim() +
      `\n\n` +
      (process.platform === "win32"
        ? windowsPrompt
        : process.platform === "linux"
        ? linuxPrompt
        : macosPrompt)

    this.messages = []
    this.terminal = new Terminal()

    // For handling confirmation responses
    this.pendingConfirmation = null
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

  // Handle confirmation response from frontend
  handleConfirmation(confirmed) {
    if (this.pendingConfirmation) {
      this.pendingConfirmation(confirmed)
      this.pendingConfirmation = null
    }
  }

  async takeScreenshot(pushEvent) {
    try {
      const screenshot = await this.ioClient.takeScreenshot()
      if (screenshot.success) {
        pushEvent({
          type: "image",
          content: `data:image/jpeg;base64,${screenshot.base64}`
        })
        return { success: true }
      } else {
        pushEvent({
          type: "text",
          content: `Screenshot failed: ${screenshot.error}`
        })
        return { success: false, error: screenshot.error }
      }
    } catch (error) {
      pushEvent({
        type: "text",
        content: `Screenshot error: ${error.message}`
      })
      return { success: false, error: error.message }
    }
  }

  async query(query, pushEvent, hardcode = false) {
    // Check if API key exists
    if (!hardcode && !process.env.ANTHROPIC_API_KEY) {
      pushEvent({
        type: "text",
        content:
          "Error: Anthropic API key not found. Please add it in settings."
      })
      return { success: false, error: "Missing API key" }
    }

    // Hardcoded response for testing
    if (hardcode) {
      try {
        // 3. Terminal command message
        pushEvent({
          type: "text",
          content: "3. Terminal command message"
        })
        await new Promise((resolve) => setTimeout(resolve, 500))

        pushEvent({
          type: "bash",
          content:
            "ls -la /home/user && cd desktop/workfile && ls -la && npm install && npm run dev"
        })
        await new Promise((resolve) => setTimeout(resolve, 2000))

        // 4. Error message
        pushEvent({
          type: "text",
          content: "4. Error message"
        })
        await new Promise((resolve) => setTimeout(resolve, 500))

        pushEvent({
          type: "error",
          content: "This is an example error message"
        })
        await new Promise((resolve) => setTimeout(resolve, 1000))

        // 5. Image message
        pushEvent({
          type: "text",
          content: "5. Image message"
        })
        await new Promise((resolve) => setTimeout(resolve, 500))

        pushEvent({
          type: "image",
          content:
            "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjEwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KICA8cmVjdCB3aWR0aD0iMjAwIiBoZWlnaHQ9IjEwMCIgZmlsbD0iIzQ0NzBmZiIgcng9IjEwIi8+CiAgPHRleHQgeD0iMTAwIiB5PSI1NSIgZm9udC1mYW1pbHk9InNhbnMtc2VyaWYiIGZvbnQtc2l6ZT0iMTQiIGZpbGw9IndoaXRlIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIj5TYW1wbGUgSW1hZ2U8L3RleHQ+Cjwvc3ZnPg=="
        })
        await new Promise((resolve) => setTimeout(resolve, 1000))

        // 6. Confirmation message
        pushEvent({
          type: "confirmation",
          content: "Do you want to continue with the demo?"
        })
        await new Promise((resolve) => setTimeout(resolve, 1000))

        // 7. Final text message
        pushEvent({
          type: "text",
          content: "7. Final text message"
        })
        await new Promise((resolve) => setTimeout(resolve, 500))

        pushEvent({
          type: "text",
          content:
            "That's all the different message types! Pretty cool, right? 🎉"
        })

        return { success: true }
      } catch (error) {
        pushEvent({
          type: "text",
          content: `Hardcoded streaming error: ${error.message}`
        })
        return { success: false, error: error.message }
      }
    }

    try {
      // Stream response from Anthropic API
      const stream = this.anthropicClient.messages.stream({
        model: "claude-sonnet-4-20250514",
        max_tokens: 2048,
        temperature: 0,
        messages: [
          {
            role: "user",
            content: query
          }
        ]
      })

      stream.on("text", (text) => {
        pushEvent({
          type: "text",
          content: text
        })
      })

      stream.on("error", (error) => {
        pushEvent({
          type: "text",
          content: `Stream error: ${error.message}`
        })
      })

      // Wait for the stream to complete
      await stream.done()
      return { success: true }
    } catch (error) {
      pushEvent({
        type: "text",
        content: `Error: ${error.message}`
      })
      return { success: false, error: error.message }
    }
  }

  async run(query, initialScreenshot, pushEvent) {
    this.messages.push({
      role: "user",
      content: [
        {
          type: "image",
          source: {
            type: "base64",
            media_type: "image/jpeg",
            data: initialScreenshot
          }
        },
        { type: "text", text: query }
      ]
    })

    let running = true
    while (running) {
      const response = await this.anthropicClient.beta.messages.create({
        model: "claude-sonnet-4-20250514",
        tools: tools,
        system: this.system,
        messages: this.messages,
        max_tokens: 2048,
        temperature: 0,
        stream: false
      })

      // Add assistant response to conversation
      this.messages.push({
        role: "assistant",
        content: response.content
      })

      for (const content of response.content) {
        if (content.type === "text") {
          pushEvent({ type: "text", content: content.text })
        }

        if (content.type === "tool_use") {
          if (content.name === "bash") {
            // Show the command and ask for confirmation
            pushEvent({
              type: "bash",
              content: content.input.command,
              toolUseId: content.id
            })

            // Wait for user confirmation
            const confirmation = await new Promise((resolve) => {
              this.pendingConfirmation = resolve
            })

            if (!confirmation) {
              // User canceled - exit the agent loop
              pushEvent({
                type: "text",
                content: "Command execution canceled."
              })
              running = false
              break
            }

            // User confirmed - hide window and execute
            pushEvent({
              type: "text",
              content: `Executing: ${content.input.command}`
            })

            const result = await this.terminal.execute(content.input.command)

            // Add tool result to conversation
            this.messages.push({
              role: "user",
              content: [
                {
                  type: "tool_result",
                  tool_use_id: content.id,
                  content: JSON.stringify(result, null, 2)
                }
              ]
            })

            await new Promise((resolve) => setTimeout(resolve, 800))

            // Take screenshot after command execution
            const screenshot = await this.ioClient.takeScreenshot()
            if (screenshot && screenshot.image) {
              this.messages.push({
                role: "user",
                content: [
                  {
                    type: "image",
                    source: {
                      type: "base64",
                      media_type: "image/jpeg",
                      data: screenshot.image
                    }
                  }
                ]
              })
            }
          } else {
            // Execute custom GUI tools via ioClient
            const exec = {
              left_click: ({ x, y }) => this.ioClient.leftClick(x, y),
              right_click: ({ x, y }) => this.ioClient.rightClick(x, y),
              double_click: ({ x, y }) => this.ioClient.doubleClick(x, y),
              drag: ({ x1, y1, x2, y2 }) =>
                this.ioClient.leftClickDrag(x1, y1, x2, y2),
              type: ({ text }) => this.ioClient.typeText(text)
            }[content.name]

            if (exec) {
              // Show annotated screenshot for click/drag actions
              const { x, y, x1, y1 } = content.input
              if (x !== undefined && y !== undefined) {
                const annotated = await this.ioClient.annotateScreenshot(x, y)
                if (annotated && annotated.image) {
                  pushEvent({
                    type: "image",
                    content: `data:image/jpeg;base64,${annotated.image}`
                  })
                }
              } else if (x1 !== undefined && y1 !== undefined) {
                const annotated = await this.ioClient.annotateScreenshot(x1, y1)
                if (annotated && annotated.image) {
                  pushEvent({
                    type: "image",
                    content: `data:image/jpeg;base64,${annotated.image}`
                  })
                }
              }

              // Ask for confirmation with action description
              const actionDesc = {
                left_click: `Left click at (${content.input.x}, ${content.input.y})`,
                right_click: `Right click at (${content.input.x}, ${content.input.y})`,
                double_click: `Double click at (${content.input.x}, ${content.input.y})`,
                drag: `Drag from (${content.input.x1}, ${content.input.y1}) to (${content.input.x2}, ${content.input.y2})`,
                type: `Type: "${content.input.text}"`
              }[content.name]

              pushEvent({
                type: "bash", // Reuse bash confirmation UI
                content: actionDesc,
                toolUseId: content.id
              })

              const confirmation = await new Promise((resolve) => {
                this.pendingConfirmation = resolve
              })

              if (!confirmation) {
                pushEvent({ type: "text", content: "Action canceled." })
                running = false
                break
              }
              await exec(content.input)
              // Record tool result (empty success message)
              this.messages.push({
                role: "user",
                content: [
                  {
                    type: "tool_result",
                    tool_use_id: content.id,
                    content: "ok"
                  }
                ]
              })

              await new Promise((resolve) => setTimeout(resolve, 800))

              const screenshot = await this.ioClient.takeScreenshot()
              if (screenshot && screenshot.image) {
                this.messages.push({
                  role: "user",
                  content: [
                    {
                      type: "image",
                      source: {
                        type: "base64",
                        media_type: "image/jpeg",
                        data: screenshot.image
                      }
                    }
                  ]
                })
              }
            }
          }
        }
      }
    }
  }
}
