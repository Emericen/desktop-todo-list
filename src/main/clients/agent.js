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
- **URL NAVIGATION: Always use bash 'open' command to navigate to URLs (e.g., 'open https://youtube.com') instead of trying to click and type in address bars**

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

Example 4 - URL navigation:
User: "Go to YouTube and find the latest All-In podcast"
→ Use bash 'open https://youtube.com' to navigate, then screenshot to see the page, then GUI to search and interact

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
    this.messages = [{ role: "user", content: query }]

    let hasNextTurn = true // Start with true to enter the loop
    while (hasNextTurn) {
      hasNextTurn = false

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
            case "bash": {
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
                      content: JSON.stringify(execResult, null, 2)
                    }
                  ]
                })
              } else {
                // User cancelled - just break out of query
                pushEvent({ type: "text", content: "Command cancelled." })
                return { success: true }
              }
              break
            }
            case "screenshot": {
              pushEvent({
                type: "text",
                content: "\n\n*👀 Taking a look...*\n\n"
              })
              const screenshot = await this.ioClient.takeScreenshot()

              // Send tool_result for Anthropic
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
            }
            case "left_click": {
              const x = content.input.x
              const y = content.input.y
              const leftClickAnnotation =
                await this.ioClient.takeScreenshotWithAnnotation([
                  { label: "Left Click", x: x, y: y }
                ])
              pushEvent({
                type: "image",
                content: `data:image/jpeg;base64,${leftClickAnnotation.base64}`
              })
              pushEvent({ type: "confirmation", content: "Left click here?" })
              const confirmed = await new Promise((resolve) => {
                this.pendingConfirmation = resolve
              })
              if (confirmed) {
                await this.ioClient.leftClick(x, y)
                this.messages.push({
                  role: "user",
                  content: [
                    {
                      type: "tool_result",
                      tool_use_id: content.id,
                      content: "OK"
                    }
                  ]
                })
              } else {
                // User cancelled - just break out of query
                pushEvent({ type: "text", content: "Action cancelled." })
                return { success: true }
              }
              break
            }
            case "right_click": {
              const x = content.input.x
              const y = content.input.y
              const rightClickAnnotation =
                await this.ioClient.takeScreenshotWithAnnotation([
                  { label: "Right Click", x: x, y: y }
                ])
              pushEvent({
                type: "image",
                content: `data:image/jpeg;base64,${rightClickAnnotation.base64}`
              })
              pushEvent({ type: "confirmation", content: "Right click here?" })
              const confirmed = await new Promise((resolve) => {
                this.pendingConfirmation = resolve
              })
              if (confirmed) {
                await this.ioClient.rightClick(x, y)
                this.messages.push({
                  role: "user",
                  content: [
                    {
                      type: "tool_result",
                      tool_use_id: content.id,
                      content: "OK"
                    }
                  ]
                })
              } else {
                // User cancelled - just break out of query
                pushEvent({ type: "text", content: "Action cancelled." })
                return { success: true }
              }
              break
            }
            case "double_click": {
              const x = content.input.x
              const y = content.input.y
              const doubleClickAnnotation =
                await this.ioClient.takeScreenshotWithAnnotation([
                  { label: "Double Click", x: x, y: y }
                ])
              pushEvent({
                type: "image",
                content: `data:image/jpeg;base64,${doubleClickAnnotation.base64}`
              })
              pushEvent({ type: "confirmation", content: "Double click here?" })
              const confirmed = await new Promise((resolve) => {
                this.pendingConfirmation = resolve
              })
              if (confirmed) {
                await this.ioClient.doubleClick(x, y)
                this.messages.push({
                  role: "user",
                  content: [
                    {
                      type: "tool_result",
                      tool_use_id: content.id,
                      content: "OK"
                    }
                  ]
                })
              } else {
                // User cancelled - just break out of query
                pushEvent({ type: "text", content: "Action cancelled." })
                return { success: true }
              }
              break
            }
            case "drag": {
              const x1 = content.input.x1
              const y1 = content.input.y1
              const x2 = content.input.x2
              const y2 = content.input.y2
              const dragAnnotation =
                await this.ioClient.takeScreenshotWithAnnotation([
                  { label: "Drag", x: x1, y: y1 },
                  { label: "Drop", x: x2, y: y2 }
                ])
              pushEvent({
                type: "image",
                content: `data:image/jpeg;base64,${dragAnnotation.base64}`
              })
              pushEvent({
                type: "confirmation",
                content: "Drag and drop in above?"
              })
              const confirmed = await new Promise((resolve) => {
                this.pendingConfirmation = resolve
              })
              if (confirmed) {
                await this.ioClient.leftClickDrag(x1, y1, x2, y2)
                this.messages.push({
                  role: "user",
                  content: [
                    {
                      type: "tool_result",
                      tool_use_id: content.id,
                      content: "OK"
                    }
                  ]
                })
              } else {
                // User cancelled - just break out of query
                pushEvent({ type: "text", content: "Action cancelled." })
                return { success: true }
              }
              break
            }
            case "type": {
              const x = content.input.x
              const y = content.input.y
              const text = content.input.text
              const typeAnnotation =
                await this.ioClient.takeScreenshotWithAnnotation([
                  { label: "Type", x: x, y: y }
                ])
              pushEvent({
                type: "image",
                content: `data:image/jpeg;base64,${typeAnnotation.base64}`
              })
              pushEvent({ type: "text", content: `> *"${text}"*` })
              pushEvent({ type: "confirmation", content: `Type this here?` })
              const confirmed = await new Promise((resolve) => {
                this.pendingConfirmation = resolve
              })
              if (confirmed) {
                await this.ioClient.typeText(x, y, text)
                const screenshot = await this.ioClient.takeScreenshot()
                pushEvent({
                  type: "image",
                  content: `data:image/jpeg;base64,${screenshot.base64}`
                })

                // Record success with screenshot
                this.messages.push({
                  role: "user",
                  content: [
                    {
                      type: "tool_result",
                      tool_use_id: content.id,
                      content: "OK"
                    }
                  ]
                })
                
                // Add screenshot as separate message for context
                this.messages.push({
                  role: "user", 
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
                })
              } else {
                // User cancelled - just break out of query
                pushEvent({ type: "text", content: "Action cancelled." })
                return { success: true }
              }
              break
            }
          }
        }
      }
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

      case "/click":
        try {
          const x = 203
          const y = 687
          const leftClickAnnotation =
            await this.ioClient.takeScreenshotWithAnnotation([
              { label: "Left Click", x: x, y: y }
            ])
          pushEvent({
            type: "image",
            content: `data:image/jpeg;base64,${leftClickAnnotation.base64}`
          })
          pushEvent({ type: "confirmation", content: "Left click here?" })
          const confirmed = await new Promise((resolve) => {
            this.pendingConfirmation = resolve
          })
          if (confirmed) {
            await this.ioClient.leftClick(x, y)
          }
        } catch (error) {
          pushEvent({
            type: "error",
            content: `Hardcoded streaming error: ${error.message}`
          })
        }
        return true

      case "/type":
        try {
          const x = 100
          const y = 100
          const text =
            "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat."
          const typeAnnotation =
            await this.ioClient.takeScreenshotWithAnnotation([
              { label: "Type", x: x, y: y }
            ])
          pushEvent({
            type: "image",
            content: `data:image/jpeg;base64,${typeAnnotation.base64}`
          })
          pushEvent({ type: "text", content: `> *"${text}"*` })
          pushEvent({ type: "confirmation", content: `Type this here?` })
          const confirmed = await new Promise((resolve) => {
            this.pendingConfirmation = resolve
          })
          if (confirmed) {
            await this.ioClient.typeText(x, y, text)
          }
        } catch (error) {
          pushEvent({
            type: "error",
            content: `Hardcoded streaming error: ${error.message}`
          })
        }
        return true

      case "/drag":
        try {
          const x1 = 100
          const y1 = 100
          const x2 = 120
          const y2 = 120
          const dragAnnotation =
            await this.ioClient.takeScreenshotWithAnnotation([
              { label: "Drag", x: x1, y: y1 },
              { label: "Drop", x: x2, y: y2 }
            ])
          pushEvent({
            type: "image",
            content: `data:image/jpeg;base64,${dragAnnotation.base64}`
          })
          pushEvent({
            type: "confirmation",
            content: "Drag and drop in above?"
          })
          const confirmed = await new Promise((resolve) => {
            this.pendingConfirmation = resolve
          })
          if (confirmed) {
            await this.ioClient.leftClickDrag(x1, y1, x2, y2)
          }
        } catch (error) {
          pushEvent({
            type: "error",
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
}
