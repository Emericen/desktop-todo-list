/**
 * Slash Command Handler - Handles special slash commands like /help, /logout, etc.
 * Extracted from the main IPC handler for better separation of concerns
 */
class SlashCommandHandler {
  constructor() {
    this.authClient = null
    this.userSettings = null
  }

  /**
   * Set the auth client dependency
   * @param {AuthClient} authClient - The authentication client
   */
  setAuthClient(authClient) {
    this.authClient = authClient
  }

  /**
   * Set the user settings dependency
   * @param {UserSettings} userSettings - The user settings instance
   */
  setUserSettings(userSettings) {
    this.userSettings = userSettings
  }

  /**
   * Check if a query is a slash command
   * @param {string} query - The query string
   * @returns {boolean} True if it's a slash command
   */
  isSlashCommand(query) {
    return query.startsWith('/') && this.getAvailableCommands().includes(query.split(' ')[0])
  }

  /**
   * Get list of available slash commands
   * @returns {string[]} Array of available commands
   */
  getAvailableCommands() {
    return ['/logout', '/auth-status', '/help', '/settings']
  }

  /**
   * Handle a slash command
   * @param {string} query - The slash command
   * @param {Function} pushEvent - Function to push events to frontend
   * @returns {Promise<{success: boolean}>} Result of command execution
   */
  async handleCommand(query, pushEvent) {
    if (!this.authClient) {
      throw new Error('SlashCommandHandler: authClient not set. Call setAuthClient() first.')
    }

    const command = query.trim()

    switch (command) {
      case '/logout':
        return this.handleLogout(pushEvent)

      case '/auth-status':
        return this.handleAuthStatus(pushEvent)

      case '/help':
        return this.handleHelp(pushEvent)

      case '/settings':
        return this.handleSettings(pushEvent)

      default:
        pushEvent({ type: "error", content: `Unknown command: ${command}` })
        return { success: false, error: `Unknown command: ${command}` }
    }
  }

  /**
   * Handle /logout command
   * @param {Function} pushEvent - Function to push events to frontend
   * @returns {Promise<{success: boolean}>} Result of logout
   */
  async handleLogout(pushEvent) {
    try {
      await this.authClient.logout()
      pushEvent({ type: "text", content: "Logged out." })
      return { success: true }
    } catch (error) {
      pushEvent({ type: "error", content: `Logout failed: ${error.message}` })
      return { success: false, error: error.message }
    }
  }

  /**
   * Handle /auth-status command
   * @param {Function} pushEvent - Function to push events to frontend
   * @returns {Promise<{success: boolean}>} Result of auth status check
   */
  async handleAuthStatus(pushEvent) {
    try {
      const isAuthenticated = this.authClient.isAuthenticated()
      const message = isAuthenticated 
        ? "You are authenticated!" 
        : "You are not authenticated!"
      
      pushEvent({ type: "text", content: message })
      return { success: true }
    } catch (error) {
      pushEvent({ type: "error", content: `Auth status check failed: ${error.message}` })
      return { success: false, error: error.message }
    }
  }

  /**
   * Handle /help command
   * @param {Function} pushEvent - Function to push events to frontend
   * @returns {Promise<{success: boolean}>} Result of help display
   */
  async handleHelp(pushEvent) {
    try {
      const lines = []

      if (this.authClient.isAuthenticated()) {
        lines.push(`Hello, ${this.authClient.getUser().email}!`)
      } else {
        lines.push("Hello there!")
      }
      
      lines.push(
        "I'm a desktop assistant that can help you operate your computer! You can tell me anything you want to do, and I'll do it for you!"
      )
      lines.push("Additional commands:")
      lines.push("`/help` – show this message")
      lines.push("`/clear` – clear chat history")
      lines.push("`/settings` – view and modify app settings")
      
      if (this.authClient.isAuthenticated()) {
        lines.push("`/logout` – sign out of your account.")
      }

      pushEvent({ type: "text", content: lines.join("\n\n") })
      return { success: true }
    } catch (error) {
      pushEvent({ type: "error", content: `Help display failed: ${error.message}` })
      return { success: false, error: error.message }
    }
  }

  /**
   * Handle /settings command
   * @param {Function} pushEvent - Function to push events to frontend
   * @returns {Promise<{success: boolean}>} Result of settings display
   */
  async handleSettings(pushEvent) {
    try {
      if (!this.userSettings) {
        pushEvent({ type: "error", content: "Settings not available" })
        return { success: false, error: "Settings not available" }
      }

      const settings = this.userSettings.getAll()
      const settingsPath = this.userSettings.getSettingsPath()
      
      const lines = []
      lines.push("**Current Settings:**")
      lines.push("")
      lines.push("**Window:**")
      lines.push(`- Size: ${settings.window.width}x${settings.window.height}`)
      lines.push(`- Always on top: ${settings.window.alwaysOnTop}`)
      lines.push(`- Auto-hide on blur: ${settings.window.autoHide}`)
      lines.push(`- Resizable: ${settings.window.resizable}`)
      lines.push("")
      lines.push("**Shortcuts:**")
      lines.push(`- Toggle chat: ${settings.shortcuts.toggleChat}`)
      lines.push("")
      lines.push("**Other:**")
      lines.push(`- Theme: ${settings.theme}`)
      lines.push(`- Screenshot max height: ${settings.screenshot.maxHeight}px`)
      lines.push("")
      lines.push(`Settings file: \`${settingsPath}\``)
      lines.push("")
      lines.push("*Tip: Edit the settings file manually and restart the app to apply changes.*")

      pushEvent({ type: "text", content: lines.join("\n") })
      return { success: true }
    } catch (error) {
      pushEvent({ type: "error", content: `Settings display failed: ${error.message}` })
      return { success: false, error: error.message }
    }
  }
}

export default SlashCommandHandler