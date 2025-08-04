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
    this.aiAgent = null
    this.slashCommandHandler = null
    this.updateClient = null
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
   * Set the AI agent dependency
   * @param {Agent} aiAgent - The AI agent for processing queries
   */
  setAIAgent(aiAgent) {
    this.aiAgent = aiAgent
  }

  /**
   * Set the slash command handler dependency
   * @param {SlashCommandHandler} slashCommandHandler - The slash command handler
   */
  setSlashCommandHandler(slashCommandHandler) {
    this.slashCommandHandler = slashCommandHandler
  }

  /**
   * Set the update client dependency
   * @param {UpdateClient} updateClient - The update client
   */
  setUpdateClient(updateClient) {
    this.updateClient = updateClient
  }

  /**
   * Process a query from the frontend
   * @param {Object} payload - Query payload from frontend
   * @param {Function} pushEvent - Function to push events to frontend
   * @param {Object} event - IPC event object for sending responses
   * @returns {Promise<{success: boolean, error?: string}>} Query result
   */
  async processQuery(payload, pushEvent, event) {
    // Validate dependencies
    if (!this.authClient || !this.aiAgent || !this.slashCommandHandler) {
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
      if (this.awaitingUpdateResponse && this.updateClient) {
        const handled = await this.updateClient.handleUpdateResponse(
          payload.query,
          visiblePushEvent
        )
        if (handled) {
          this.awaitingUpdateResponse = false
          event.sender.send("focus-query-input")
          return { success: true }
        }
      }

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

      // Process query with AI agent
      const result = await this.aiAgent.query(payload.query, visiblePushEvent)
      event.sender.send("focus-query-input")
      return result
    } catch (error) {
      return this.handleQueryError(error, pushEvent, event)
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
    console.error("aiAgent.query error:", error)

    pushEvent({
      type: "error",
      content: `Error: ${error.message || error}. Conversation has been reset.`
    })

    // Reset backend conversation state so next turn starts fresh
    this.aiAgent.messages = []

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
    if (!this.aiAgent) {
      return { success: false, error: "QueryOrchestrator: aiAgent not set" }
    }

    try {
      this.aiAgent.handleConfirmation(confirmed)
      return { success: true }
    } catch (error) {
      console.error("Confirmation handling error:", error)
      return { success: false, error: error.message }
    }
  }

  /**
   * Clear AI agent conversation messages
   * @param {Object} event - IPC event object
   * @returns {{success: boolean}} Clear result
   */
  clearMessages(event) {
    if (!this.aiAgent) {
      return { success: false, error: "QueryOrchestrator: aiAgent not set" }
    }

    try {
      this.aiAgent.messages = []

      // Notify all renderers to clear their local store just in case
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
