import Anthropic from "@anthropic-ai/sdk"
import dotenv from "dotenv"
import Terminal from "./terminal.js"
import IOClient from "./io.js"
dotenv.config()

const system = `You are a desktop assistant created by Lychee to help users be more productive by operating their computer.

TOOL SELECTION STRATEGY:
Choose the appropriate tool based on the context and nature of the user's request:

**START WITH SCREENSHOT when:**
- You need to understand the current visual context before proceeding
- User asks about something they might becurrently looking at ("how do I get to...", "where is...", "help me navigate...")
- The query implies they're already in an application or website
- User wants help with existing GUI interfaces

**USE BASH FOR:**
- File operations (creating, editing, moving, organizing files)
- Opening applications or files from scratch
- Development tasks (running code, installing packages, git operations)
- System operations and command-line tasks
- When you need to launch something new

**USE GUI TOOLS (click/drag/type) FOR:**
- Navigating within applications that are already open
- Interacting with web interfaces, forms, buttons
- When bash cannot control the specific interface
- Following up after seeing current state via screenshot

**FLEXIBLE WORKFLOW EXAMPLES:**

Example 1 - Navigation help:
User: "How do I get to the subscription panel?"
→ Take screenshot first to see what they're looking at, then guide with clicks

Example 2 - File task:
User: "Organize the files on my desktop"
→ Use bash to list/move files, screenshot to verify, bash for organization

Example 3 - Development task:
User: "Debug this React app"
→ Use bash to run commands, screenshot to see browser, GUI if needed for browser interaction

Be context-aware and choose the most logical starting point based on what the user is asking for.`

const tools = [
  {
    type: "custom",
    name: "screenshot",
    description:
      "Take a screenshot of the current desktop. This is useful when you want to see the user's screen in tasks that require visual information or verification.",
    input_schema: { type: "object", properties: {} }
  },
  {
    type: "custom",
    name: "bash",
    description: `Execute a bash command. The following are some information about the operating system so that you can use the appropriate shell commands. ${
      process.platform === "win32"
        ? "Operating System: win32 (Windows) | Shell: PowerShell"
        : process.platform === "linux"
        ? "Operating System: linux (Linux) | Shell: bash"
        : "Operating System: darwin (macOS) | Shell: bash"
    }`,
    input_schema: {
      type: "object",
      properties: {
        command: {
          type: "string",
          description:
            "The bash command to execute in a single line, without any comments or explanations."
        }
      }
    }
  },
  {
    type: "custom",
    name: "left_click",
    description:
      "Perform a mouse cursor left click on the screen at the given pixel coordinates.",
    input_schema: {
      type: "object",
      properties: {
        x: {
          type: "number",
          description: "The x / horizontal pixel coordinate of the click."
        },
        y: {
          type: "number",
          description: "The y / vertical pixel coordinate of the click."
        }
      }
    }
  },
  {
    type: "custom",
    name: "right_click",
    description:
      "Perform a mouse cursor right click on the screen at the given pixel coordinates.",
    input_schema: {
      type: "object",
      properties: {
        x: {
          type: "number",
          description: "The x / horizontal pixel coordinate of the click."
        },
        y: {
          type: "number",
          description: "The y / vertical pixel coordinate of the click."
        }
      }
    }
  },
  {
    type: "custom",
    name: "double_click",
    description:
      "Perform a mouse cursor double click on the screen at the given pixel coordinates.",
    input_schema: {
      type: "object",
      properties: {
        x: {
          type: "number",
          description: "The x / horizontal pixel coordinate of the click."
        },
        y: {
          type: "number",
          description: "The y / vertical pixel coordinate of the click."
        }
      }
    }
  },
  {
    type: "custom",
    name: "drag",
    description:
      "Perform a mouse cursor drag from the given pixel coordinates to the given pixel coordinates.",
    input_schema: {
      type: "object",
      properties: {
        x1: {
          type: "number",
          description:
            "The x / horizontal pixel coordinate of the start of the drag."
        },
        y1: {
          type: "number",
          description:
            "The y / vertical pixel coordinate of the start of the drag."
        },
        x2: {
          type: "number",
          description:
            "The x / horizontal pixel coordinate of the end of the drag."
        },
        y2: {
          type: "number",
          description:
            "The y / vertical pixel coordinate of the end of the drag."
        }
      }
    }
  },
  {
    type: "custom",
    name: "type",
    description:
      "Type the given text at the given pixel coordinates. What this will do is first perform a mouse cursorleft click at the given pixel coordinates, and then type the given text.",
    input_schema: {
      type: "object",
      properties: {
        text: { type: "string", description: "The text to type." },
        x: {
          type: "number",
          description: "The x / horizontal pixel coordinate of the text."
        },
        y: {
          type: "number",
          description: "The y / vertical pixel coordinate of the text."
        }
      }
    }
  }
]

export default class Agent {
  constructor() {
    this.ioClient = new IOClient()

    this.anthropicClient = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY
    })

    this.system = system.trim()

    this.messages = []
    this.terminal = new Terminal()

    // For handling confirmation responses
    this.pendingConfirmation = null
  }

  async query(query, pushEvent) {
    const isTestQuery = await this.handleTestQuery(query, pushEvent)
    if (isTestQuery) {
      return { success: true }
    }

    this.messages.push({ role: "user", content: query })
    let hasNextTurn = true // Start with true to enter the loop
    while (hasNextTurn) {
      hasNextTurn = false // Reset to false at start of each iteration

      const response = await this.anthropicClient.beta.messages.create({
        model: "claude-sonnet-4-20250514",
        tools: tools,
        system: this.system,
        messages: this.messages,
        max_tokens: 2048,
        temperature: 0,
        stream: false
      })

      this.messages.push({ role: "assistant", content: response.content })

      for (const content of response.content) {
        if (content.type === "text") {
          pushEvent({ type: "text", content: content.text })
        } else if (content.type === "tool_use") {
          hasNextTurn = true // Continue to next turn after tool use
          switch (content.name) {
            case "bash":
              pushEvent({ type: "bash", content: content.input.command })

              // Wait for user confirmation via frontend
              const confirmed = await new Promise((resolve) => {
                this.pendingConfirmation = resolve
              })

              if (confirmed) {
                // Execute the command and push the result
                const execResult = await this.terminal.execute(
                  content.input.command
                )
                pushEvent({
                  type: "bash",
                  content: content.input.command,
                  result: execResult
                })
                this.messages.push({
                  role: "user",
                  content: [
                    {
                      type: "tool_result",
                      tool_use_id: content.id,
                      content: execResult
                    }
                  ]
                })
              }
              break
            case "screenshot":
              pushEvent({
                type: "text",
                content: "\n\n*📸 Taking a look at the screen...*\n\n"
              })
              const screenshot = await this.ioClient.takeScreenshot()

              this.messages.push({
                role: "user",
                content: [
                  {
                    type: "tool_result",
                    tool_use_id: content.id,
                    content: [
                      {
                        type: "image",
                        source: {
                          type: "base64",
                          media_type: "image/jpeg",
                          data: screenshot.base64
                        }
                      }
                    ]
                  }
                ]
              })
              break
            default:
              pushEvent({
                type: "error",
                content: `Unknown tool use: ${content.name}`
              })
              this.messages.push({
                role: "user",
                content: [
                  {
                    type: "tool_result",
                    tool_use_id: content.id,
                    content: "Unknown tool use. Please use tools listed!"
                  }
                ]
              })
              break
          }
        }
      }
    }

    // Check if API key exists
    if (!process.env.ANTHROPIC_API_KEY) {
      pushEvent({
        type: "text",
        content:
          "Error: Anthropic API key not found. Please add it in settings."
      })
      return { success: false, error: "Missing API key" }
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

  async handleTestQuery(query, pushEvent) {
    // process hardcoded test queries
    switch (query) {
      case "/messages":
        return true

      case "/screenshot":
        const screenshot = await this.ioClient.takeScreenshot()
        pushEvent({
          type: "image",
          content: `data:image/jpeg;base64,${screenshot.base64}`
        })
        return true

      case "/annotated-screenshot":
        const testDots = [
          { label: "drag", x: 100, y: 100 },
          { label: "drop", x: 300, y: 719 }
        ]
        const annotatedScreenshot =
          await this.ioClient.takeScreenshotWithAnnotation(testDots)
        if (annotatedScreenshot.success) {
          pushEvent({
            type: "image",
            content: `data:image/jpeg;base64,${annotatedScreenshot.base64}`
          })
        } else {
          pushEvent({
            type: "text",
            content: `Annotated screenshot failed: ${annotatedScreenshot.error}`
          })
        }
        return true

      case "/bash":
        try {
          const cmd = "cd ~/Desktop/workfile/shadcn-learn && npm run dev"
          pushEvent({ type: "bash", content: cmd })

          // Wait for user confirmation via frontend
          const confirmed = await new Promise((resolve) => {
            this.pendingConfirmation = resolve
          })

          if (confirmed) {
            // Execute the command and push the result
            const execResult = await this.terminal.execute(cmd)
            pushEvent({ type: "bash", content: cmd, result: execResult })
          } else {
            pushEvent({ type: "text", content: "Command cancelled." })
          }
        } catch (error) {
          pushEvent({
            type: "text",
            content: `Hardcoded streaming error: ${error.message}`
          })
        }
        return true

      default:
        return false
    }
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
