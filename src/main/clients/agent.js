import Anthropic from "@anthropic-ai/sdk"
import dotenv from "dotenv"
dotenv.config()

class Agent {
  constructor(osClient) {
    this.osClient = osClient
    this.anthropicClient = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY
    })
    this.display_width = null
    this.display_height = null
    this.messages = []

    // Get OS info for the AI
    const osInfo = {
      platform: process.platform,
      shell: process.platform === "win32" ? "cmd" : "bash",
      isWindows: process.platform === "win32",
      isLinux: process.platform === "linux",
      isMac: process.platform === "darwin"
    }

    this.system = `- Never take a screenshot!! Use the screenshot we already give you!! 
    - When working with local directory stuff, you should always use bash tool instead of clicking around computer.
    - Operating System: ${osInfo.platform} (${
      osInfo.isWindows ? "Windows" : osInfo.isLinux ? "Linux" : "macOS"
    })
    - Shell: ${osInfo.shell} ${
      osInfo.isWindows
        ? "(use Windows commands like dir, cd, type, etc.)"
        : "(use Unix commands like ls, cd, cat, etc.)"
    }
    - Use appropriate commands for the user's operating system.`
    this.messages = []

    // our message type : how to convert to anthropic message
    this.messageConverter = {
      user: (msg) => ({ role: "user", content: msg.content }),
      text: (msg) => ({ role: "assistant", content: msg.content }),
      image: (msg) => {
        this.display_width = msg.width || this.display_width
        this.display_height = msg.height || this.display_height
        return this._convertImageMessage(msg)
      }
    }
  }

  async run(frontendMessages, pushResponseEvent) {
    try {
      const messages = frontendMessages.map((msg) =>
        this.messageConverter[msg.type](msg)
      )
      console.log(
        `--------\n${this.display_width}x${this.display_height} --------`
      )
      console.log(`--------\n${JSON.stringify(messages, null, 2)}\n--------`)
      const response = await this.anthropicClient.beta.messages.create({
        model: "claude-sonnet-4-20250514",
        tools: [
          {
            type: "computer_20250124",
            name: "computer",
            display_width_px: this.display_width,
            display_height_px: this.display_height,
            display_number: 1
          },
          { type: "bash_20250124", name: "bash" }
        ],
        betas: ["computer-use-2025-01-24"],
        system: this.system,
        messages: messages,
        thinking: { type: "enabled", budget_tokens: 1024 },
        max_tokens: 2048,
        temperature: 1.0,
        stream: false
      })

      console.log(`--------\n${JSON.stringify(response, null, 2)}\n--------`)
      response.content.forEach((content) => {
        switch (content.type) {
          case "tool_use":
            if (content.name === "computer") {
              this._executeComputerTool(content)
            } else if (content.name === "bash") {
              this._executeBashTool(content)
            } else {
              console.log(`Unknown tool name: ${content.name}`)
            }
            break
          case "text":
            pushResponseEvent(content.text)
            break
          default:
            console.log(`Unknown content type: ${content.type}`)
            break
        }
      })

      return `Done`
    } catch (error) {
      console.error("Agent error:", error)
      throw error
    }
  }

  async _executeComputerTool(content) {
    console.log("Computer tool call:", content)
    const { action, coordinate, text, scroll_direction, scroll_amount } =
      content.input

    switch (action) {
      case "screenshot":
        // Return the screenshot we already have from window toggle
        return {
          success: true,
          image: "Screenshot already provided in conversation",
          width: this.display_width,
          height: this.display_height
        }
      case "left_click":
        await this.osClient.leftClick(coordinate[0], coordinate[1])
        break
      case "type":
        await this.osClient.typeText(text)
        break
      case "key":
        await this.osClient.pressKey(text)
        break
      case "mouse_move":
        await this.osClient.moveMouse(coordinate[0], coordinate[1])
        break
      case "scroll":
        await this.osClient.scroll(
          coordinate[0],
          coordinate[1],
          scroll_direction,
          scroll_amount
        )
        break
      case "left_click_drag":
        await this.osClient.leftClickDrag(
          coordinate[0],
          coordinate[1],
          coordinate[2],
          coordinate[3]
        )
        break
      case "right_click":
        await this.osClient.rightClick(coordinate[0], coordinate[1])
        break
      case "middle_click":
        await this.osClient.middleClick(coordinate[0], coordinate[1])
        break
      case "double_click":
        await this.osClient.doubleClick(coordinate[0], coordinate[1])
        break
      case "triple_click":
        await this.osClient.tripleClick(coordinate[0], coordinate[1])
        break
      case "left_mouse_down":
        await this.osClient.leftMouseDown(coordinate[0], coordinate[1])
        break
      case "left_mouse_up":
        await this.osClient.leftMouseUp(coordinate[0], coordinate[1])
        break
      case "hold_key":
        await this.osClient.holdKey(text)
        break
      case "wait":
        await this.osClient.wait(content.input.duration || 1000)
        break
      default:
        console.log(`Unknown computer action: ${action}`)
        break
    }
  }

  async _executeBashTool(toolContent) {
    console.log("Bash tool call:", toolContent)
    const command = toolContent.input.command

    try {
      const result = await this.osClient.executeCommand(command)
      console.log("Command result:", result)
      return result
    } catch (error) {
      console.error("Command execution failed:", error)
      return { success: false, error: error.message }
    }
  }

  /**
   * Check if the agent should continue or stop
   */
  _shouldContinue() {
    return this.isRunning
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

export default Agent
