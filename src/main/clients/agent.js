import Anthropic from "@anthropic-ai/sdk"
import dotenv from "dotenv"
dotenv.config()

const windowsSystem = `Help user to accomplish tasks on the computer. The user will provide you with a screenshot of the computer and you will need to use the tools to accomplish the task.
    - When working with local directory stuff, you should always use bash tool instead of clicking around computer.
    - Operating System: win32 (Windows)
    - Shell: cmd (use Windows commands like dir, cd, type, etc.)
    - Use appropriate commands for the user's operating system.`

const macosSystem = `Help user to accomplish tasks on the computer. The user will provide you with a screenshot of the computer and you will need to use the tools to accomplish the task.
    - When working with local directory stuff, you should always use bash tool instead of clicking around computer.
    - Operating System: darwin (macOS)
    - Shell: bash (use Unix commands like ls, cd, cat, etc.)
    - Use appropriate commands for the user's operating system.`

const linuxSystem = `Help user to accomplish tasks on the computer. The user will provide you with a screenshot of the computer and you will need to use the tools to accomplish the task.
    - When working with local directory stuff, you should always use bash tool instead of clicking around computer.
    - Operating System: linux (Linux)
    - Shell: bash (use Unix commands like ls, cd, cat, etc.)
    - Use appropriate commands for the user's operating system.`

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
  constructor(osClient) {
    this.osClient = osClient
    this.anthropicClient = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY
    })
    this.messages = []

    this.system =
      process.platform === "win32"
        ? windowsSystem
        : process.platform === "linux"
        ? linuxSystem
        : macosSystem

    this.messages = []

    // our message type : how to convert to anthropic message
    this.messageConverter = {
      user: (msg) => ({ role: "user", content: msg.content }),
      text: (msg) => ({ role: "assistant", content: msg.content }),
      image: (msg) => {
        return this._convertImageMessage(msg)
      }
    }
  }

  async run(frontendMessages, pushResponseEvent) {
    try {
      const messages = frontendMessages.map((msg) =>
        this.messageConverter[msg.type](msg)
      )
      console.log(`--------\n${JSON.stringify(messages, null, 2)}\n--------`)
      const response = await this.anthropicClient.beta.messages.create({
        model: "claude-sonnet-4-20250514",
        tools: tools,
        system: this.system,
        messages: messages,
        max_tokens: 2048,
        temperature: 0,
        stream: false
      })

      // prettier-ignore
      const contentHandlers = {
        tool_use: async (content) => await this._executeTool(content, pushResponseEvent),
        text: (content) => pushResponseEvent({ type: "text", content: content.text })
      }

      for (const content of response.content) {
        const handler = contentHandlers[content.type]
        if (handler) {
          await handler(content)
        } else {
          console.log(`Unknown content type: ${content.type}`)
        }
      }
    } catch (error) {
      console.error("Agent error:", error)
      pushResponseEvent({ type: "error", content: error.message })
    }
  }

  async _executeTool(content, pushResponseEvent) {
    // prettier-ignore
    const toolHandlers = {
      left_click: async (input) => {
        pushResponseEvent({ type: "action", action: "left_click", x: input.x, y: input.y })
        await this.osClient.leftClick(input.x, input.y)
      },
      right_click: async (input) => {
        pushResponseEvent({ type: "action", action: "right_click", x: input.x, y: input.y })
        await this.osClient.rightClick(input.x, input.y)
      },
      double_click: async (input) => {
        pushResponseEvent({ type: "action", action: "double_click", x: input.x, y: input.y })
        await this.osClient.doubleClick(input.x, input.y)
      },
      drag: async (input) => {
        pushResponseEvent({ type: "action", action: "drag", x1: input.x1, y1: input.y1, x2: input.x2, y2: input.y2 })
        await this.osClient.leftClickDrag(input.x1, input.y1, input.x2, input.y2)
      },
      type: async (input) => {
        pushResponseEvent({ type: "action", action: "type", text: input.text })
        await this.osClient.typeText(input.text)
      },
      bash: async (input) => {
        pushResponseEvent({ type: "action", action: "bash", command: input.command })
        const result = await this.osClient.executeCommand(input.command)
        console.log("Command result:", result)
        pushResponseEvent({ type: "bash_result", success: result.success, output: result.stdout, error: result.stderr })
        return result
      }
    }

    const handler = toolHandlers[content.name]
    if (handler) {
      await handler(content.input)
    } else {
      // I assume this will never happen and Anthropic is using constrained/guided generation on the model
      // for their tool calling framework. Otherwise, I would be disappointed.
      console.log(`Unknown tool name: ${content.name}`)
      pushResponseEvent({
        type: "error",
        content: `Unknown tool: ${content.name}`
      })
    }
  }

  _convertImageMessage(msg) {
    // Default values
    let mediaType = "image/jpeg"
    let base64Data = msg.content

    // If content is a data URL, extract media type and base64 part
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
