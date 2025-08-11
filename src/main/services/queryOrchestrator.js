import { showChatWindow } from "../windows/chat.js"
import UserSettings from "./userSettings.js"

const DAILY_QUERY_LIMIT = 10

/**
 * Query Orchestrator - Handles the main query processing flow
 * Coordinates between authentication, slash commands, and agent interactions
 */
class QueryOrchestrator {
  constructor() {
    this.authClient = null
    this.backend = null
    this.toolExecutor = null
    this.slashCommandHandler = null
    // this.updateClient = null
    this.awaitingUpdateResponse = false

    // Initialize user settings for tracking daily usage
    this.userSettings = new UserSettings()
  }

  /**
   * Set the auth client dependency
   * @param {AuthClient} authClient - The authentication client
   */
  setAuthClient(authClient) {
    this.authClient = authClient
  }

  /**
   * Set the backend and tool executor dependencies
   * @param {Backend} backend - The backend WebSocket client
   * @param {ToolExecutor} toolExecutor - The tool executor service
   */
  setAIServices(backend, toolExecutor) {
    this.backend = backend
    this.toolExecutor = toolExecutor
  }

  /**
   * Set the slash command handler dependency
   * @param {SlashCommandHandler} slashCommandHandler - The slash command handler
   */
  setSlashCommandHandler(slashCommandHandler) {
    this.slashCommandHandler = slashCommandHandler
  }

  // /**
  //  * Set the update client dependency
  //  * @param {UpdateClient} updateClient - The update client
  //  */
  // setUpdateClient(updateClient) {
  //   this.updateClient = updateClient
  // }

  /**
   * Process a query from the frontend
   * @param {Object} payload - Query payload from frontend
   * @param {Function} pushEvent - Function to push events to frontend
   * @param {Object} event - IPC event object for sending responses
   * @returns {Promise<{success: boolean, error?: string}>} Query result
   */
  async processQuery(payload, pushEvent, event) {
    // Validate dependencies
    if (!this.authClient || !this.backend || !this.toolExecutor || !this.slashCommandHandler) {
      throw new Error(
        "QueryOrchestrator: dependencies not set. Call setter methods first."
      )
    }

    try {
      // Enhanced pushEvent that ensures chat window visibility
      const visiblePushEvent = (eventData) => {
        // Ensure chat window is visible for every event so the user can see agent progress
        showChatWindow()
        pushEvent(eventData)
      }

      // Check if it's a slash command
      if (this.slashCommandHandler.isSlashCommand(payload.query)) {
        const result = await this.slashCommandHandler.handleCommand(
          payload.query,
          visiblePushEvent
        )
        return result
      }

      // Handle update response if awaiting one
      // if (this.awaitingUpdateResponse && this.updateClient) {
      //   const handled = await this.updateClient.handleUpdateResponse(
      //     payload.query,
      //     visiblePushEvent
      //   )
      //   if (handled) {
      //     this.awaitingUpdateResponse = false
      //     event.sender.send("focus-query-input")
      //     return { success: true }
      //   }
      // }

      // Handle authentication flow
      if (!this.authClient.isAuthenticated()) {
        await this.authClient.handle(payload.query, visiblePushEvent)
        event.sender.send("focus-query-input")
        return { success: true }
      }

      // Daily query limit check
      {
        const today = new Date().toISOString().split("T")[0]
        let usage = this.userSettings.get("usage") || {}
        if (usage.date !== today) {
          usage = { date: today, count: 0 }
        }
        if (usage.count >= DAILY_QUERY_LIMIT) {
          visiblePushEvent({
            type: "text",
            content: `Daily limit of ${DAILY_QUERY_LIMIT} queries reached. Please try again tomorrow.\n\nNeed more? Ping Eddy Liang on [Discord](https://discord.gg/sBNnqP9gaY) to discuss a premium plan.`
          })
          event.sender.send("focus-query-input")
          return { success: false, error: "Daily limit reached" }
        }
        usage.count = (usage.count || 0) + 1
        const remaining = DAILY_QUERY_LIMIT - usage.count
        console.log(
          `Query used: ${usage.count}/${DAILY_QUERY_LIMIT} (${remaining} left today)`
        )
        this.userSettings.set("usage", usage)
      }

      // Process query with AI services
      const result = await this._processAIQuery(payload.query, visiblePushEvent)
      event.sender.send("focus-query-input")
      return result
    } catch (error) {
      return this.handleQueryError(error, pushEvent, event)
    }
  }

  /**
   * Process AI query using WebSocket backend and tool executor
   * @param {string} query - The user's query
   * @param {Function} pushEvent - Function to push events to frontend
   * @returns {Promise<{success: boolean}>} Query result
   */
  async _processAIQuery(query, pushEvent) {
    // Handle test queries first
    const isTestQuery = await this._handleTestQuery(query, pushEvent)
    if (isTestQuery) {
      return { success: true }
    }

    // Ensure WebSocket is connected
    if (!this.backend.connected) {
      await this.backend.connect()
    }

    // Send query to backend
    this.backend.send({
      type: "query",
      content: query
    })

    // Set up promise to handle the query lifecycle
    return new Promise((resolve) => {
      // Set up message handlers for this query
      const textHandler = (message) => {
        pushEvent({ type: "text", content: message.content })
      }

      const toolRequestHandler = async (message) => {
        await this.toolExecutor.executeToolRequest(message, pushEvent, this.backend)
      }

      const completeHandler = (message) => {
        this._cleanupQueryHandlers(textHandler, toolRequestHandler, completeHandler, errorHandler)
        resolve({ success: true })
      }

      const errorHandler = (message) => {
        pushEvent({ type: "text", content: message.content })
        this._cleanupQueryHandlers(textHandler, toolRequestHandler, completeHandler, errorHandler)
        resolve({ success: true })
      }

      // Register handlers
      this.backend.onMessage("text", textHandler)
      this.backend.onMessage("tool_request", toolRequestHandler)
      this.backend.onMessage("complete", completeHandler)
      this.backend.onMessage("error", errorHandler)
    })
  }

  /**
   * Clean up query message handlers
   */
  _cleanupQueryHandlers(...handlers) {
    this.backend.removeHandler("text", handlers[0])
    this.backend.removeHandler("tool_request", handlers[1])
    this.backend.removeHandler("complete", handlers[2])
    this.backend.removeHandler("error", handlers[3])
  }

  /**
   * Handle test queries - useful for testing tool execution without full AI backend
   */
  async _handleTestQuery(query, pushEvent) {
    switch (query) {
      case "/screenshot":
        const screenshot = await this.toolExecutor.ioClient.takeScreenshot()
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
          await this.toolExecutor.ioClient.takeScreenshotWithAnnotation(testDots)
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
            this.toolExecutor.pendingConfirmation = resolve
          })

          if (confirmed) {
            // Execute the command and push the result
            const execResult = await this.toolExecutor.terminal.execute(cmd)
            pushEvent({ type: "bash", content: cmd, result: execResult })
          } else {
            pushEvent({ type: "text", content: "Command cancelled." })
          }
        } catch (error) {
          pushEvent({
            type: "text",
            content: `Test command error: ${error.message}`
          })
        }
        return true

      case "/click":
        try {
          const x = 203
          const y = 687
          const leftClickAnnotation =
            await this.toolExecutor.ioClient.takeScreenshotWithAnnotation([
              { label: "Left Click", x: x, y: y }
            ])
          pushEvent({
            type: "image",
            content: `data:image/jpeg;base64,${leftClickAnnotation.base64}`
          })
          pushEvent({ type: "confirmation", content: "Left click here?" })
          const confirmed = await new Promise((resolve) => {
            this.toolExecutor.pendingConfirmation = resolve
          })
          if (confirmed) {
            await this.toolExecutor.ioClient.leftClick(x, y)
          }
        } catch (error) {
          pushEvent({
            type: "error",
            content: `Test click error: ${error.message}`
          })
        }
        return true

      case "/double_click":
        try {
          const x = 200
          const y = 200
          const doubleClickAnnotation =
            await this.toolExecutor.ioClient.takeScreenshotWithAnnotation([
              { label: "Double Click", x: x, y: y }
            ])
          pushEvent({
            type: "image",
            content: `data:image/jpeg;base64,${doubleClickAnnotation.base64}`
          })
          pushEvent({ type: "confirmation", content: "Double click here?" })
          const confirmed = await new Promise((resolve) => {
            this.toolExecutor.pendingConfirmation = resolve
          })
          if (confirmed) {
            await this.toolExecutor.ioClient.doubleClick(x, y)
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
            content: `Test double click error: ${error.message}`
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
            await this.toolExecutor.ioClient.takeScreenshotWithAnnotation([
              { label: "Type", x: x, y: y }
            ])
          pushEvent({
            type: "image",
            content: `data:image/jpeg;base64,${typeAnnotation.base64}`
          })
          pushEvent({ type: "text", content: `> *"${text}"*` })
          pushEvent({ type: "confirmation", content: `Type this here?` })
          const confirmed = await new Promise((resolve) => {
            this.toolExecutor.pendingConfirmation = resolve
          })
          if (confirmed) {
            await this.toolExecutor.ioClient.typeText(x, y, text)
          }
        } catch (error) {
          pushEvent({
            type: "error",
            content: `Test typing error: ${error.message}`
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
            await this.toolExecutor.ioClient.takeScreenshotWithAnnotation([
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
            this.toolExecutor.pendingConfirmation = resolve
          })
          if (confirmed) {
            await this.toolExecutor.ioClient.leftClickDrag(x1, y1, x2, y2)
          }
        } catch (error) {
          pushEvent({
            type: "error",
            content: `Test drag error: ${error.message}`
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
            this.toolExecutor.pendingConfirmation = resolve
          })
          if (confirmed) {
            await this.toolExecutor.ioClient.keyboardHotkey(testKeys)
            pushEvent({
              type: "text",
              content: `✅ Executed hotkey: ${testKeys.join(" + ")}`
            })
          } else {
            pushEvent({ type: "text", content: "Hotkey cancelled." })
          }
        } catch (error) {
          pushEvent({
            type: "error",
            content: `Test hotkey error: ${error.message}`
          })
        }
        return true

      default:
        return false
    }
  }

  /**
   * Handle query processing errors
   * @param {Error} error - The error that occurred
   * @param {Function} pushEvent - Function to push events to frontend
   * @param {Object} event - IPC event object
   * @returns {{success: boolean, error: string}} Error result
   */
  handleQueryError(error, pushEvent, event) {
    console.error("AI query error:", error)

    pushEvent({
      type: "error",
      content: `Error: ${error.message || error}. Conversation has been reset.`
    })

    // Note: Backend handles conversation state, so we don't need to reset messages here

    // Instruct renderer to clear its chat as well
    event.sender.send("clear-messages")
    event.sender.send("focus-query-input")

    return { success: false, error: error.message || String(error) }
  }

  /**
   * Handle confirmation from user
   * @param {boolean} confirmed - Whether user confirmed the action
   * @returns {{success: boolean}} Confirmation result
   */
  handleConfirmation(confirmed) {
    if (!this.toolExecutor) {
      return { success: false, error: "QueryOrchestrator: toolExecutor not set" }
    }

    try {
      this.toolExecutor.handleConfirmation(confirmed)
      return { success: true }
    } catch (error) {
      console.error("Confirmation handling error:", error)
      return { success: false, error: error.message }
    }
  }

  /**
   * Clear conversation messages
   * @param {Object} event - IPC event object
   * @returns {{success: boolean}} Clear result
   */
  clearMessages(event) {
    try {
      // Note: Backend handles conversation state, so we don't need to clear messages there
      // Just notify all renderers to clear their local store
      const { BrowserWindow } = require("electron")
      BrowserWindow.getAllWindows().forEach((win) =>
        win.webContents.send("clear-messages")
      )

      return { success: true }
    } catch (error) {
      console.error("Clear messages error:", error)
      return { success: false, error: error.message }
    }
  }
}

export default QueryOrchestrator
