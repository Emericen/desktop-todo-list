import pkg from "electron-updater"
const { autoUpdater } = pkg

/**
 * UpdateClient - Handles auto-updates with user consent
 */
export default class UpdateClient {
  constructor() {
    this.pendingUpdateInfo = null
    this.onAwaitingResponse = null

    if (process.env.NODE_ENV !== "production") {
      autoUpdater.forceDevUpdateConfig = true
    }

    this.setupAutoUpdater()
  }

  /**
   * Set callback for when waiting for user response
   * @param {Function} callback - Called when we start waiting for user input
   */
  setAwaitingResponseCallback(callback) {
    this.onAwaitingResponse = callback
  }

  /**
   * Set up auto-updater event listeners
   */
  setupAutoUpdater() {
    autoUpdater.on("checking-for-update", () => {
      console.log("Checking for update...")
    })
    
    autoUpdater.on("update-available", (info) => {
      console.log("Update available.")
      this.pendingUpdateInfo = info
      if (this.pushEvent) {
        this.pushEvent({
          type: "confirmation", 
          content: `Update available (v${info.version}). Download and install?`
        })
        // Notify that we're waiting for user response
        if (this.onAwaitingResponse) {
          this.onAwaitingResponse(true)
        }
      }
    })
    
    autoUpdater.on("update-not-available", (info) => {
      console.log("Desktop app is up to date.")
    })
    
    autoUpdater.on("error", (err) => {
      console.error("Error in auto-updater. " + err)
      if (this.pushEvent) {
        this.pushEvent({
          type: "error",
          content: `Update check failed: ${err.message}`
        })
      }
    })
    
    autoUpdater.on("download-progress", (progressObj) => {
      console.log("Download speed: " + progressObj.bytesPerSecond)
      if (this.pushEvent) {
        this.pushEvent({
          type: "text",
          content: `Downloading update... ${Math.round(progressObj.percent)}%`
        })
      }
    })

    autoUpdater.on("update-downloaded", () => {
      if (this.pushEvent) {
        this.pushEvent({
          type: "confirmation",
          content: "Update downloaded. Restart now to install?"
        })
        // Notify that we're waiting for user response
        if (this.onAwaitingResponse) {
          this.onAwaitingResponse(true)
        }
      }
    })
  }

  /**
   * Handle user response to update prompts
   * @param {string} query - User input (yes/no)
   * @param {Function} pushEvent - Function to push events to frontend
   */
  async handleUpdateResponse(query, pushEvent) {
    this.pushEvent = pushEvent
    
    const response = query.toLowerCase().trim()
    
    if (response === "yes" || response === "y") {
      if (this.pendingUpdateInfo) {
        pushEvent({ type: "text", content: "Starting update download..." })
        autoUpdater.downloadUpdate()
      } else {
        pushEvent({ type: "text", content: "Installing update and restarting..." })
        autoUpdater.quitAndInstall()
      }
      return true
    } else if (response === "no" || response === "n") {
      pushEvent({ type: "text", content: "Update cancelled." })
      this.pendingUpdateInfo = null
      // Notify that we're no longer waiting
      if (this.onAwaitingResponse) {
        this.onAwaitingResponse(false)
      }
      return true
    }
    
    return false
  }

  /**
   * Check for updates manually
   */
  checkForUpdates() {
    autoUpdater.checkForUpdatesAndNotify()
  }
}