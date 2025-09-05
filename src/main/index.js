import { app, BrowserWindow, ipcMain } from "electron"
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
import UserSettings from "./services/userSettings.js"
import path from "path"
import fs from "fs/promises"

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

  // Initialize minimal services
  const userSettings = new UserSettings()

  // Default open or close DevTools by F12 in development
  app.on("browser-window-created", (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  // Register shortcuts from settings
  registerFromSettings(userSettings, {
    toggleChat: toggleChatWindow
  })

  // ========= TODO FILE PERSISTENCE =========
  const todoFilePath = path.join(app.getPath('userData'), 'todo.txt')

  // IPC handlers for todo functionality
  ipcMain.handle('save-todo', async (event, text) => {
    try {
      await fs.writeFile(todoFilePath, text, 'utf-8')
      return { success: true }
    } catch (error) {
      console.error('Failed to save todo:', error)
      return { success: false, error: error.message }
    }
  })

  ipcMain.handle('load-todo', async () => {
    try {
      const text = await fs.readFile(todoFilePath, 'utf-8')
      return text
    } catch (error) {
      // File doesn't exist yet, return empty string
      if (error.code === 'ENOENT') {
        return ''
      }
      console.error('Failed to load todo:', error)
      throw error
    }
  })

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

  app.on("will-quit", () => {
    unregisterAllShortcuts()
    destroyTray()
  })
})
