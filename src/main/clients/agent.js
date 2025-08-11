import Terminal from "./terminal.js"
import IOClient from "./io.js"

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

Be context-aware and choose the most logical starting point based on what the user is asking for.

**IMPORTANT UI LIMITATION:**
You interact through a chat window that appears for confirmations between each action. When this window appears, it steals focus and closes any open dropdowns, context menus, or temporary UI elements. If you right-click something and see no change in the next screenshot, the dropdown likely appeared but was immediately closed when the confirmation window showed.

To avoid infinite loops:
- Prefer keyboard shortcuts over context menus (e.g., Ctrl+C instead of right-click → copy)
- Use bash commands for file operations instead of GUI right-click menus
- If a click shows no visible change, try an alternative approach rather than repeating the same click
- Be aware that any temporary UI elements (dropdowns, tooltips, menus) will disappear between actions`

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
    name: "terminal_interrupt",
    description:
      "Send an interrupt signal (Ctrl+C) to the running command in the terminal to stop it.",
    input_schema: { type: "object", properties: {} }
  },
  {
    type: "custom",
    name: "terminal_next",
    description:
      "Get any new output from the terminal that has been produced since the last check, useful for monitoring long-running commands.",
    input_schema: { type: "object", properties: {} }
  },
  {
    type: "custom",
    name: "terminal_send_interactive_input",
    description:
      "Send interactive input to the terminal for responding to prompts, confirmations, or navigation (e.g., arrow keys, text responses).",
    input_schema: {
      type: "object",
      properties: {
        input: {
          type: "string",
          description:
            "Text input or ANSI escape codes. For arrow keys use: \\x1B[A (up), \\x1B[B (down), \\x1B[C (right), \\x1B[D (left). For Enter use \\r."
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
  },
  {
    type: "custom",
    name: "scroll",
    description:
      "Scroll within a specific area of the screen. Use x,y coordinates to target which scrollable area (since pages can have multiple scrollable regions).",
    input_schema: {
      type: "object",
      properties: {
        pixels: {
          type: "number",
          description:
            "Number of pixels to scroll. Positive = down, negative = up."
        },
        x: {
          type: "number",
          description: "X coordinate within the scrollable area to target."
        },
        y: {
          type: "number",
          description: "Y coordinate within the scrollable area to target."
        }
      }
    }
  },
  {
    type: "custom",
    name: "page_down",
    description:
      "Scroll down one page using the standard Page Down keyboard shortcut. More efficient than pixel scrolling for navigating content.",
    input_schema: { type: "object", properties: {} }
  },
  {
    type: "custom",
    name: "page_up",
    description:
      "Scroll up one page using the standard Page Up keyboard shortcut. More efficient than pixel scrolling for navigating content.",
    input_schema: { type: "object", properties: {} }
  },
  {
    type: "custom",
    name: "keyboard_hotkey",
    description: `Execute keyboard shortcuts and key combinations. ${
      process.platform === "darwin"
        ? "On macOS, use 'cmd' for Command key (⌘). Common shortcuts: cmd+c (copy), cmd+v (paste), cmd+a (select all), cmd+z (undo)."
        : "On Windows/Linux, use 'ctrl' for Control key. Common shortcuts: ctrl+c (copy), ctrl+v (paste), ctrl+a (select all), ctrl+z (undo)."
    } You can combine multiple modifier keys like ['cmd', 'shift', 'z'] for redo.`,
    input_schema: {
      type: "object",
      properties: {
        keys: {
          type: "array",
          items: { type: "string" },
          description: `Array of key names to press simultaneously. Available keys: 
          - Modifiers: 'cmd'/'command' (${
            process.platform === "darwin" ? "⌘" : "maps to ctrl on non-Mac"
          }), 'ctrl'/'control', 'alt'/'option', 'shift'
          - Letters: 'a' through 'z'
          - Numbers: '0' through '9'  
          - Special: 'tab', 'enter'/'return', 'space', 'backspace', 'delete', 'escape'/'esc'
          - Arrows: 'up', 'down', 'left', 'right'
          - Navigation: 'page_up', 'page_down', 'home', 'end'
          - Function: 'f1' through 'f12'
          Examples: ['cmd', 'c'] for copy, ['ctrl', 'alt', 'delete'] for task manager`
        }
      },
      required: ["keys"]
    }
  }
]

export default class Agent {
  constructor() {
    this.ioClient = new IOClient()

    // Use WebSocket for backend communication
    this.backendWsUrl = "ws://localhost:8000/agent/ws"
    
    this.terminal = new Terminal()

    // For handling confirmation responses
    this.pendingConfirmation = null
    
    // WebSocket connection
    this.websocket = null
    this.connected = false
  }

  async query(query, pushEvent) {
    const isTestQuery = await this.handleTestQuery(query, pushEvent)
    if (isTestQuery) {
      return { success: true }
    }

    // Connect to WebSocket if not already connected
    if (!this.connected) {
      await this.connectWebSocket(pushEvent)
    }

    // Send query to backend
    this.websocket.send(JSON.stringify({
      type: "query",
      content: query
    }))

    // Set up message handler for this query
    return new Promise((resolve) => {
      const originalOnMessage = this.websocket.onmessage

      this.websocket.onmessage = async (event) => {
        const response = JSON.parse(event.data)
        
        switch (response.type) {
          case "text":
            pushEvent({ type: "text", content: response.content })
            break
            
          case "tool_request":
            await this.handleToolRequest(response, pushEvent)
            break
            
          case "complete":
            this.websocket.onmessage = originalOnMessage
            resolve({ success: true })
            break
            
          case "error":
            pushEvent({ type: "text", content: response.content })
            this.websocket.onmessage = originalOnMessage
            resolve({ success: true })
            break
        }
      }
    })
  }

  async connectWebSocket(pushEvent) {
    return new Promise((resolve, reject) => {
      this.websocket = new WebSocket(this.backendWsUrl)
      
      this.websocket.onopen = () => {
        console.log("Connected to backend WebSocket")
        this.connected = true
        resolve()
      }
      
      this.websocket.onclose = () => {
        console.log("WebSocket connection closed")
        this.connected = false
      }
      
      this.websocket.onerror = (error) => {
        console.error("WebSocket error:", error)
        pushEvent({ type: "text", content: "Failed to connect to backend" })
        reject(error)
      }
      
      this.websocket.onmessage = (event) => {
        const message = JSON.parse(event.data)
        if (message.type === "status" && message.status === "connected") {
          console.log("Backend connection established")
        }
      }
    })
  }

  async handleToolRequest(toolRequest, pushEvent) {
    const { tool_use_id, tool, params } = toolRequest
    
    switch (tool) {
      case "bash": {
        pushEvent({ type: "bash", content: params.command })

        // Wait for user confirmation via frontend
        const confirmed = await new Promise((resolve) => {
          this.pendingConfirmation = resolve
        })

        if (confirmed) {
          // Clear any unread output before running new command
          this.terminal.clearOutput()

          // Execute the command (metadata only)
          const meta = await this.terminal.execute(params.command)

          // Retrieve the actual text produced by the command
          const output = this.terminal.getOutput()
          const execResult = { ...meta, output }

          pushEvent({
            type: "bash",
            content: params.command,
            result: execResult
          })

          // Send result back to backend
          this.websocket.send(JSON.stringify({
            type: "tool_result",
            tool_use_id: tool_use_id,
            result: JSON.stringify(execResult, null, 2)
          }))
        } else {
          // User cancelled – send decline to backend
          pushEvent({ type: "text", content: "Command cancelled." })
          this.websocket.send(JSON.stringify({
            type: "tool_declined",
            tool_use_id: tool_use_id
          }))
        }
        break
      }
      
      case "terminal_interrupt": {
        pushEvent({ type: "bash", content: "ctrl+c" })
        const confirmed = await new Promise((resolve) => {
          this.pendingConfirmation = resolve
        })
        if (confirmed) {
          await this.terminal.interrupt()
          this.websocket.send(JSON.stringify({
            type: "tool_result",
            tool_use_id: tool_use_id,
            result: "Sent Ctrl+C"
          }))
        } else {
          pushEvent({ type: "text", content: "Command cancelled." })
          this.websocket.send(JSON.stringify({
            type: "tool_declined",
            tool_use_id: tool_use_id
          }))
        }
        break
      }
      
      case "terminal_next": {
        const output = this.terminal.getOutput()
        if (output.trim()) {
          pushEvent({
            type: "text",
            content: `\`\`\`bash\n${output.trimEnd()}\n\`\`\``
          })
          this.websocket.send(JSON.stringify({
            type: "tool_result",
            tool_use_id: tool_use_id,
            result: output.substring(0, 1000) // limit size
          }))
        } else {
          pushEvent({ type: "text", content: "(no new output)" })
          this.websocket.send(JSON.stringify({
            type: "tool_result",
            tool_use_id: tool_use_id,
            result: "No new output"
          }))
        }
        break
      }
      
      case "terminal_send_interactive_input": {
        const input = params.input
        await this.terminal.sendInteractiveInput(input)
        this.websocket.send(JSON.stringify({
          type: "tool_result",
          tool_use_id: tool_use_id,
          result: `Sent input: ${input}`
        }))
        break
      }
      
      case "screenshot": {
        pushEvent({
          type: "text",
          content: "\n\n*👀 Taking a look...*\n\n"
        })
        const screenshot = await this.ioClient.takeScreenshot()
        // Send tool_result for backend to forward to Anthropic
        this.websocket.send(JSON.stringify({
          type: "tool_result",
          tool_use_id: tool_use_id,
          result: JSON.stringify([
            {
              type: "image",
              source: {
                type: "base64",
                media_type: "image/jpeg",
                data: screenshot.base64
              }
            }
          ])
        }))
        break
      }
      
      case "left_click": {
        const x = params.x
        const y = params.y
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
          // Wait briefly then take screenshot to show result
          await new Promise((resolve) => setTimeout(resolve, 100))
          const resultScreenshot = await this.ioClient.takeScreenshot()
          this.websocket.send(JSON.stringify({
            type: "tool_result",
            tool_use_id: tool_use_id,
            result: JSON.stringify([
              {
                type: "text",
                text: `✅ Left clicked at (${x}, ${y})`
              },
              {
                type: "image",
                source: {
                  type: "base64",
                  media_type: "image/jpeg",
                  data: resultScreenshot.base64
                }
              }
            ])
          }))
        } else {
          pushEvent({ type: "text", content: "Action cancelled." })
          this.websocket.send(JSON.stringify({
            type: "tool_declined",
            tool_use_id: tool_use_id
          }))
        }
        break
      }
      
      // Add remaining tool handlers here...
      default:
        // For tools not yet implemented, send a generic "not implemented" result
        this.websocket.send(JSON.stringify({
          type: "tool_result",
          tool_use_id: tool_use_id,
          result: `Tool ${tool} not yet implemented in desktop client`
        }))
        break
    }
  }

  async handleTestQuery(query, pushEvent) {
    // process hardcoded test queries
    switch (query) {
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

      case "/double_click":
        try {
          const x = 200
          const y = 200
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
            pushEvent({
              type: "text",
              content: "✅ Double clicked successfully"
            })
          } else {
            pushEvent({ type: "text", content: "Double click cancelled." })
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
            this.messages.push({
              role: "user",
              content: [
                { type: "tool_result", tool_use_id: content.id, content: "OK" }
              ]
            })
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

      case "/hotkey":
        try {
          const testKeys =
            process.platform === "darwin" ? ["cmd", "c"] : ["ctrl", "c"]
          pushEvent({
            type: "confirmation",
            content: `Execute keyboard shortcut: ${testKeys.join(" + ")}?`
          })
          const confirmed = await new Promise((resolve) => {
            this.pendingConfirmation = resolve
          })
          if (confirmed) {
            await this.ioClient.keyboardHotkey(testKeys)
            pushEvent({
              type: "text",
              content: `✅ Executed hotkey: ${testKeys.join(" + ")}`
            })
            this.messages.push({
              role: "user",
              content: [
                { type: "tool_result", tool_use_id: content.id, content: "OK" }
              ]
            })
          } else {
            pushEvent({ type: "text", content: "Hotkey cancelled." })
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
