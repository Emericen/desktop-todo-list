import { app, BrowserWindow, nativeImage } from "electron"
import { electronApp, optimizer } from "@electron-toolkit/utils"
import pkg from "electron-updater"
const { autoUpdater } = pkg
import {
  createChatWindow,
  showChatWindow,
  toggleChatWindow
} from "./windows/chat.js"
import { createSystemTray, destroyTray } from "./windows/tray.js"
import { registerFromSettings, unregisterAllShortcuts } from "./shortcuts.js"
import Backend from "./clients/backend.js"
import IOClient from "./clients/io.js"
import AuthClient from "./clients/auth.js"
import ToolExecutor from "./services/toolExecutor.js"
import SlashCommandHandler from "./services/slashCommandHandler.js"
import QueryOrchestrator from "./services/queryOrchestrator.js"
import IPCHandlers from "./services/ipcHandlers.js"
import UserSettings from "./services/userSettings.js"

// ========== APP INITIALIZATION ==========
app.whenReady().then(async () => {
  // Set app user model id for windows
  electronApp.setAppUserModelId("com.electron")

  app.on("activate", function () {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) {
      createChatWindow()
    }
  })

  // Initialize core services (no dependencies)
  const userSettings = new UserSettings()
  const backend = new Backend() // WebSocket + HTTP to AI backend
  const authClient = new AuthClient(backend)
  const toolExecutor = new ToolExecutor() // Tool execution service
  const ioClient = new IOClient()
  await authClient.loadStoredSession()

  // Initialize business logic layer
  const slashCommandHandler = new SlashCommandHandler() // /help, /logout, etc
  const queryOrchestrator = new QueryOrchestrator() // Decides: command vs auth vs agent

  // Initialize IPC interface layer
  const ipcHandlers = new IPCHandlers()

  // Wire up dependencies explicitly
  slashCommandHandler.setAuthClient(authClient)
  slashCommandHandler.setUserSettings(userSettings)

  queryOrchestrator.setAIServices(backend, toolExecutor)
  queryOrchestrator.setSlashCommandHandler(slashCommandHandler)
  queryOrchestrator.setAuthClient(authClient)

  ipcHandlers.setQueryOrchestrator(queryOrchestrator)
  ipcHandlers.setBackend(backend)

  // Connect to backend WebSocket
  try {
    await backend.connect()
    console.log("Backend WebSocket connected successfully")
  } catch (error) {
    console.warn("Failed to connect to backend on startup:", error.message)
    console.log("Connection will be attempted when first query is made")
  }

  // Session is already loaded by authClient.loadStoredSession() above
  if (authClient.isAuthenticated()) {
    console.log("User session restored successfully")
  } else {
    console.log("No valid session found, user will need to authenticate")
  }

  // Default open or close DevTools by F12 in development
  app.on("browser-window-created", (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  // Register shortcuts from settings
  registerFromSettings(userSettings, {
    toggleChat: toggleChatWindow
  })

  // ========= IPC HANDLERS =========
  ipcHandlers.registerHandlers()

  // ========= WINDOWS AND TRAY =========
  createChatWindow(userSettings) // Create window at startup

  createSystemTray({
    onShowChat: () => showChatWindow(),
    onQuit: () => app.quit()
  })

  // ========= AUTO UPDATER =========
  // Check for updates on startup
  autoUpdater.checkForUpdates()

  // Check for updates every 10 minutes
  setInterval(() => {
    autoUpdater.checkForUpdates()
  }, 10 * 60 * 1000)

  // ========= FIRST TIME ONBOARDING =========
  await ioClient.runFirstTimeOnboarding()

  app.on("will-quit", () => {
    unregisterAllShortcuts()
    destroyTray()
  })
})
