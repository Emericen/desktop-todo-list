import { app, BrowserWindow } from "electron"
import { electronApp, optimizer } from "@electron-toolkit/utils"
import dotenv from "dotenv"
import path from "path"
import {
  createChatWindow,
  showChatWindow,
  toggleChatWindow
} from "./windows/chat.js"
import { createSystemTray, destroyTray } from "./windows/tray.js"
import OpenAIClient from "./clients/openai.js"
import { registerFromSettings, unregisterAllShortcuts } from "./shortcuts.js"
import Agent from "./clients/agent.js"
import AuthClient from "./clients/auth.js"
import UpdateClient from "./clients/update.js"
import SlashCommandHandler from "./services/slashCommandHandler.js"
import QueryOrchestrator from "./services/queryOrchestrator.js"
import IPCHandlers from "./services/ipcHandlers.js"
import UserSettings from "./services/userSettings.js"

// Load environment variables
// In development, load from current directory
// In production, load from app resources
const envPath = app.isPackaged 
  ? path.join(process.resourcesPath, '.env')
  : '.env'
dotenv.config({ path: envPath })

// Hide dock on macOS
if (process.platform === "darwin") {
  app.dock.hide()
}

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
  const authClient = new AuthClient()
  const aiAgent = new Agent() // Anthropic Claude integration
  const openaiClient = new OpenAIClient() // Whisper transcription
  const updateClient = new UpdateClient() // Auto-updater with user consent
  await authClient.loadStoredSession()

  // Initialize business logic layer
  const slashCommandHandler = new SlashCommandHandler() // /help, /logout, etc
  const queryOrchestrator = new QueryOrchestrator() // Decides: command vs auth vs agent

  // Initialize IPC interface layer
  const ipcHandlers = new IPCHandlers()

  // Wire up dependencies explicitly
  slashCommandHandler.setAuthClient(authClient)
  slashCommandHandler.setUserSettings(userSettings)
  
  queryOrchestrator.setAuthClient(authClient)
  queryOrchestrator.setAIAgent(aiAgent)
  queryOrchestrator.setSlashCommandHandler(slashCommandHandler)
  queryOrchestrator.setUpdateClient(updateClient)
  
  // Set callback for update responses
  updateClient.setAwaitingResponseCallback((waiting) => {
    queryOrchestrator.awaitingUpdateResponse = waiting
  })

  ipcHandlers.setQueryOrchestrator(queryOrchestrator)
  ipcHandlers.setOpenAIClient(openaiClient)

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
    onOpenAccount: () => {
      // TODO: open account home page url
    },
    onQuit: () => app.quit()
  })

  // ========= AUTO UPDATER =========
  // Check for updates on startup
  updateClient.checkForUpdates()

  app.on("will-quit", () => {
    unregisterAllShortcuts()
    destroyTray()
  })
})
