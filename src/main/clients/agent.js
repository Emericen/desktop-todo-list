import Anthropic from "@anthropic-ai/sdk"
import dotenv from "dotenv"
import Terminal from "./terminal.js"
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
- Explain what you're doing so the user understands your process`

const windowsPrompt = `
Operating System: win32 (Windows)
Shell: PowerShell 

GUI AUTOMATION COMMANDS:
- Click: powershell -Command "Add-Type -AssemblyName System.Windows.Forms; [System.Windows.Forms.Cursor]::Position = [System.Drawing.Point]::new(x, y); [System.Windows.Forms.SendKeys]::SendWait('{BUTTON 1}')"
- Type: powershell -Command "[System.Windows.Forms.SendKeys]::SendWait('text')"
- Key press: powershell -Command "[System.Windows.Forms.SendKeys]::SendWait('{ENTER}')"

Note: All coordinates are in 1280x720 scale and will be automatically scaled to actual screen resolution.`

const macosPrompt = `
Operating System: darwin (macOS)
Shell: bash

GUI AUTOMATION COMMANDS:
- Click: cliclick c:x,y
- Type: cliclick t:"text"
- Key press: cliclick kp:return
- Drag: cliclick dd:x1,y1 du:x2,y2
- Right-click: cliclick rc:x,y
- Double-click: cliclick dc:x,y

Note: All coordinates are in 1280x720 scale and will be automatically scaled to actual screen resolution.`

const linuxPrompt = `
Operating System: linux (Linux)
Shell: bash

GUI AUTOMATION COMMANDS:
- Click: xdotool mousemove x y click 1
- Type: xdotool type "text"
- Key press: xdotool key Return
- Drag: xdotool mousemove x1 y1 mousedown 1 mousemove x2 y2 mouseup 1
- Right-click: xdotool mousemove x y click 3
- Double-click: xdotool mousemove x y click --repeat 2 1

Note: All coordinates are in 1280x720 scale and will be automatically scaled to actual screen resolution.`

const tools = [{ type: "bash_20250124", name: "bash" }]

export default class Agent {
  constructor(osClient, hideWindow, showWindow) {
    this.osClient = osClient
    this.hideWindow = hideWindow
    this.showWindow = showWindow

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
      console.log(
        `------------- ${JSON.stringify(
          this.truncateBase64(this.messages),
          null,
          2
        )} -------------`
      )
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

        if (content.type === "tool_use" && content.name === "bash") {
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
            pushEvent({ type: "text", content: "Command execution canceled." })
            running = false
            break
          }

          // User confirmed - hide window and execute
          this.hideWindow()
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
          const screenshot = await this.osClient.takeScreenshot()
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

          this.showWindow()
        }
      }
    }
  }
}
