import Terminal from "../clients/terminal.js"
import IOClient from "../clients/io.js"

export default class ToolExecutor {
  constructor() {
    this.terminal = new Terminal()
    this.ioClient = new IOClient()
    this.pendingConfirmation = null
  }

  async executeToolRequest(toolRequest, pushEvent, wsManager) {
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
          wsManager.send({
            type: "tool_result",
            tool_use_id: tool_use_id,
            result: execResult
          })
        } else {
          // User cancelled – send decline to backend
          pushEvent({ type: "text", content: "Command cancelled." })
          wsManager.send({
            type: "tool_declined",
            tool_use_id: tool_use_id
          })
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
          wsManager.send({
            type: "tool_result",
            tool_use_id: tool_use_id,
            result: "Sent Ctrl+C"
          })
        } else {
          pushEvent({ type: "text", content: "Command cancelled." })
          wsManager.send({
            type: "tool_declined",
            tool_use_id: tool_use_id
          })
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
          wsManager.send({
            type: "tool_result",
            tool_use_id: tool_use_id,
            result: output.substring(0, 1000) // limit size
          })
        } else {
          pushEvent({ type: "text", content: "(no new output)" })
          wsManager.send({
            type: "tool_result",
            tool_use_id: tool_use_id,
            result: "No new output"
          })
        }
        break
      }

      case "terminal_send_interactive_input": {
        const input = params.input
        await this.terminal.sendInteractiveInput(input)
        wsManager.send({
          type: "tool_result",
          tool_use_id: tool_use_id,
          result: `Sent input: ${input}`
        })
        break
      }

      case "screenshot": {
        pushEvent({
          type: "text",
          content: "\n\n*👀 Taking a look...*\n\n"
        })
        const screenshot = await this.ioClient.takeScreenshot()
        // Send tool_result for backend to forward to Anthropic
        wsManager.send({
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
          wsManager.send({
            type: "tool_result",
            tool_use_id: tool_use_id,
            result: [
              {
                type: "text",
                text: `✅ Left clicked at (${x}, ${y})`
              }
            ]
          })
        } else {
          pushEvent({ type: "text", content: "Action cancelled." })
          wsManager.send({
            type: "tool_declined",
            tool_use_id: tool_use_id
          })
        }
        break
      }

      case "right_click": {
        const x = params.x
        const y = params.y
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
          // Wait briefly then take screenshot to show result
          await new Promise((resolve) => setTimeout(resolve, 100))
          wsManager.send({
            type: "tool_result",
            tool_use_id: tool_use_id,
            result: [
              {
                type: "text",
                text: `✅ Right clicked at (${x}, ${y})`
              }
            ]
          })
        } else {
          pushEvent({ type: "text", content: "Action cancelled." })
          wsManager.send({
            type: "tool_declined",
            tool_use_id: tool_use_id
          })
        }
        break
      }

      case "double_click": {
        const x = params.x
        const y = params.y
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
          // Wait briefly then take screenshot to show result
          await new Promise((resolve) => setTimeout(resolve, 100))
          wsManager.send({
            type: "tool_result",
            tool_use_id: tool_use_id,
            result: [
              {
                type: "text",
                text: `✅ Double clicked at (${x}, ${y})`
              }
            ]
          })
        } else {
          pushEvent({ type: "text", content: "Action cancelled." })
          wsManager.send({
            type: "tool_declined",
            tool_use_id: tool_use_id
          })
        }
        break
      }

      case "drag": {
        const x1 = params.x1
        const y1 = params.y1
        const x2 = params.x2
        const y2 = params.y2
        const dragAnnotation = await this.ioClient.takeScreenshotWithAnnotation(
          [
            { label: "Drag", x: x1, y: y1 },
            { label: "Drop", x: x2, y: y2 }
          ]
        )
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
          // Wait briefly then take screenshot to show result
          await new Promise((resolve) => setTimeout(resolve, 100))
          wsManager.send({
            type: "tool_result",
            tool_use_id: tool_use_id,
            result: [
              {
                type: "text",
                text: `✅ Dragged from (${x1}, ${y1}) to (${x2}, ${y2})`
              }
            ]
          })
        } else {
          pushEvent({ type: "text", content: "Action cancelled." })
          wsManager.send({
            type: "tool_declined",
            tool_use_id: tool_use_id
          })
        }
        break
      }

      case "scroll": {
        const pixels = params.pixels
        const x = params.x
        const y = params.y
        const scrollAnnotation =
          await this.ioClient.takeScreenshotWithAnnotation([
            { label: "Scroll", x: x, y: y }
          ])
        pushEvent({
          type: "image",
          content: `data:image/jpeg;base64,${scrollAnnotation.base64}`
        })
        pushEvent({
          type: "confirmation",
          content: `Scroll ${pixels} pixels here?`
        })
        const confirmed = await new Promise((resolve) => {
          this.pendingConfirmation = resolve
        })
        if (confirmed) {
          await this.ioClient.scroll(pixels, x, y)
          // Wait briefly then take screenshot to show result
          await new Promise((resolve) => setTimeout(resolve, 100))
          wsManager.send({
            type: "tool_result",
            tool_use_id: tool_use_id,
            result: [
              {
                type: "text",
                text: `✅ Scrolled ${pixels} pixels at (${x}, ${y})`
              }
            ]
          })
        } else {
          pushEvent({ type: "text", content: "Action cancelled." })
          wsManager.send({
            type: "tool_declined",
            tool_use_id: tool_use_id
          })
        }
        break
      }

      case "type": {
        const x = params.x
        const y = params.y
        const text = params.text
        const typeAnnotation = await this.ioClient.takeScreenshotWithAnnotation(
          [{ label: "Type", x: x, y: y }]
        )
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
          // Wait briefly then take screenshot to show result
          await new Promise((resolve) => setTimeout(resolve, 100))

          // Record success with screenshot
          wsManager.send({
            type: "tool_result",
            tool_use_id: tool_use_id,
            result: [
              {
                type: "text",
                text: `✅ Typed "${text}" at (${x}, ${y})`
              }
            ]
          })
        } else {
          pushEvent({ type: "text", content: "Action cancelled." })
          wsManager.send({
            type: "tool_declined",
            tool_use_id: tool_use_id
          })
        }
        break
      }

      case "keyboard_hotkey": {
        const keys = params.keys
        pushEvent({
          type: "confirmation",
          content: `Execute keyboard shortcut: ${keys.join(" + ")}?`
        })
        const confirmed = await new Promise((resolve) => {
          this.pendingConfirmation = resolve
        })
        if (confirmed) {
          await this.ioClient.keyboardHotkey(keys)
          // Wait briefly then take screenshot to show result
          await new Promise((resolve) => setTimeout(resolve, 100))
          wsManager.send({
            type: "tool_result",
            tool_use_id: tool_use_id,
            result: [
              {
                type: "text",
                text: `✅ Executed hotkey: ${keys.join(" + ")}`
              }
            ]
          })
        } else {
          pushEvent({ type: "text", content: "Hotkey cancelled." })
          wsManager.send({
            type: "tool_declined",
            tool_use_id: tool_use_id
          })
        }
        break
      }

      case "page_down": {
        pushEvent({
          type: "confirmation",
          content: "Press Page Down?"
        })
        const confirmed = await new Promise((resolve) => {
          this.pendingConfirmation = resolve
        })
        if (confirmed) {
          await this.ioClient.keyboardHotkey(["page_down"])
          // Wait briefly then take screenshot to show result
          await new Promise((resolve) => setTimeout(resolve, 100))
          wsManager.send({
            type: "tool_result",
            tool_use_id: tool_use_id,
            result: [
              {
                type: "text",
                text: "✅ Page Down executed"
              }
            ]
          })
        } else {
          pushEvent({ type: "text", content: "Page Down cancelled." })
          wsManager.send({
            type: "tool_declined",
            tool_use_id: tool_use_id
          })
        }
        break
      }

      case "page_up": {
        pushEvent({
          type: "confirmation",
          content: "Press Page Up?"
        })
        const confirmed = await new Promise((resolve) => {
          this.pendingConfirmation = resolve
        })
        if (confirmed) {
          await this.ioClient.keyboardHotkey(["page_up"])
          // Wait briefly then take screenshot to show result
          await new Promise((resolve) => setTimeout(resolve, 100))
          wsManager.send({
            type: "tool_result",
            tool_use_id: tool_use_id,
            result: [
              {
                type: "text",
                text: "✅ Page Up executed"
              }
            ]
          })
        } else {
          pushEvent({ type: "text", content: "Page Up cancelled." })
          wsManager.send({
            type: "tool_declined",
            tool_use_id: tool_use_id
          })
        }
        break
      }

      default:
        // For tools not yet implemented, send a generic "not implemented" result
        wsManager.send({
          type: "tool_result",
          tool_use_id: tool_use_id,
          result: `Tool ${tool} not yet implemented in desktop client`
        })
        break
    }
  }

  // Handle confirmation response from frontend
  handleConfirmation(confirmed) {
    if (this.pendingConfirmation) {
      this.pendingConfirmation(confirmed)
      this.pendingConfirmation = null
    }
  }

  // Test query handling (could be moved elsewhere if needed)
  async handleTestQuery(query, pushEvent) {
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

      default:
        return false
    }
  }

  // Utility method from original agent.js
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
