import { ipcMain } from "electron"

/**
 * IPC Handlers - Centralized IPC communication setup
 * Routes IPC calls to appropriate service methods
 */
class IPCHandlers {
  constructor() {
    this.queryOrchestrator = null
    this.openaiClient = null
  }

  /**
   * Set the query orchestrator dependency
   * @param {QueryOrchestrator} queryOrchestrator - The query orchestrator
   */
  setQueryOrchestrator(queryOrchestrator) {
    this.queryOrchestrator = queryOrchestrator
  }

  /**
   * Set the OpenAI client dependency
   * @param {OpenAIClient} openaiClient - The OpenAI client
   */
  setOpenAIClient(openaiClient) {
    this.openaiClient = openaiClient
  }

  /**
   * Register all IPC handlers
   */
  registerHandlers() {
    // Validate dependencies
    if (!this.queryOrchestrator || !this.openaiClient) {
      throw new Error('IPCHandlers: dependencies not set. Call setter methods first.')
    }

    this.registerQueryHandler()
    this.registerTranscribeHandler()
    this.registerConfirmCommandHandler()
    this.registerClearMessagesHandler()
  }

  /**
   * Register the main query handler
   */
  registerQueryHandler() {
    ipcMain.handle("query", async (event, payload) => {
      const pushEvent = (eventData) => {
        event.sender.send("response-event", eventData)
      }

      return await this.queryOrchestrator.processQuery(payload, pushEvent, event)
    })
  }

  /**
   * Register transcription handler
   */
  registerTranscribeHandler() {
    ipcMain.handle("transcribe", async (_event, payload) => {
      try {
        const audioBuffer = Buffer.from(payload.audio, "base64")
        return await this.openaiClient.transcribeAudio(audioBuffer, payload.filename)
      } catch (error) {
        console.error("Transcription error:", error)
        return { success: false, error: error.message }
      }
    })
  }

  /**
   * Register confirmation command handler
   */
  registerConfirmCommandHandler() {
    ipcMain.handle("confirm-command", async (_event, confirmed) => {
      return this.queryOrchestrator.handleConfirmation(confirmed)
    })
  }

  /**
   * Register clear messages handler
   */
  registerClearMessagesHandler() {
    ipcMain.handle("clear-messages", async (event) => {
      return this.queryOrchestrator.clearMessages(event)
    })
  }

  /**
   * Unregister all handlers (useful for cleanup or testing)
   */
  unregisterHandlers() {
    ipcMain.removeHandler("query")
    ipcMain.removeHandler("transcribe")
    ipcMain.removeHandler("confirm-command")
    ipcMain.removeHandler("clear-messages")
  }
}

export default IPCHandlers