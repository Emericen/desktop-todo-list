import Terminal from "./terminal.js"
import IOClient from "./io.js"

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
    this.websocket.send(
      JSON.stringify({
        type: "query",
        content: query
      })
    )

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
          this.websocket.send(
            JSON.stringify({
              type: "tool_result",
              tool_use_id: tool_use_id,
              result: execResult
            })
          )
        } else {
          // User cancelled – send decline to backend
          pushEvent({ type: "text", content: "Command cancelled." })
          this.websocket.send(
            JSON.stringify({
              type: "tool_declined",
              tool_use_id: tool_use_id
            })
          )
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
          this.websocket.send(
            JSON.stringify({
              type: "tool_result",
              tool_use_id: tool_use_id,
              result: "Sent Ctrl+C"
            })
          )
        } else {
          pushEvent({ type: "text", content: "Command cancelled." })
          this.websocket.send(
            JSON.stringify({
              type: "tool_declined",
              tool_use_id: tool_use_id
            })
          )
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
          this.websocket.send(
            JSON.stringify({
              type: "tool_result",
              tool_use_id: tool_use_id,
              result: output.substring(0, 1000) // limit size
            })
          )
        } else {
          pushEvent({ type: "text", content: "(no new output)" })
          this.websocket.send(
            JSON.stringify({
              type: "tool_result",
              tool_use_id: tool_use_id,
              result: "No new output"
            })
          )
        }
        break
      }

      case "terminal_send_interactive_input": {
        const input = params.input
        await this.terminal.sendInteractiveInput(input)
        this.websocket.send(
          JSON.stringify({
            type: "tool_result",
            tool_use_id: tool_use_id,
            result: `Sent input: ${input}`
          })
        )
        break
      }

      case "screenshot": {
        pushEvent({
          type: "text",
          content: "\n\n*👀 Taking a look...*\n\n"
        })
        const screenshot = await this.ioClient.takeScreenshot()
        // Send tool_result for backend to forward to Anthropic
        this.websocket.send(
          JSON.stringify({
            type: "tool_result",
            tool_use_id: tool_use_id,
            result: [
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
        )
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
          this.websocket.send(
            JSON.stringify({
              type: "tool_result",
              tool_use_id: tool_use_id,
              result: `✅ Left clicked at (${x}, ${y})`
            })
          )
        } else {
          pushEvent({ type: "text", content: "Action cancelled." })
          this.websocket.send(
            JSON.stringify({
              type: "tool_declined",
              tool_use_id: tool_use_id
            })
          )
        }
        break
      }

      // Add remaining tool handlers here...
      default:
        // For tools not yet implemented, send a generic "not implemented" result
        this.websocket.send(
          JSON.stringify({
            type: "tool_result",
            tool_use_id: tool_use_id,
            result: `Tool ${tool} not yet implemented in desktop client`
          })
        )
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
