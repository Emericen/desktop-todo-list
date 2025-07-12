import { app, BrowserWindow, ipcMain } from "electron"
import { electronApp, optimizer } from "@electron-toolkit/utils"
import dotenv from "dotenv"

import {
  createChatWindow,
  showChatWindow,
  toggleChatWindow
} from "./windows/chat.js"
import { createSettingsWindow } from "./windows/settings.js"
import { createSystemTray, destroyTray } from "./windows/tray.js"
import AnthropicClient from "./clients/anthropic.js"
import OpenAIClient from "./clients/openai.js"
import { registerShortcuts, unregisterAllShortcuts } from "./shortcuts.js"
import Agent from "./clients/agent.js"

// Load environment variables
dotenv.config()

// Hide dock on macOS
if (process.platform === "darwin") {
  app.dock.hide()
}

// ========== APP INITIALIZATION ==========
app.whenReady().then(() => {
  // Set app user model id for windows
  electronApp.setAppUserModelId("com.electron")

  app.on("activate", function () {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) {
      createChatWindow()
    }
  })

  // Register global shortcuts (can later be loaded from settings)
  registerShortcuts({ "Alt+P": toggleChatWindow })

  // Initialize clients
  const anthropicClient = new AnthropicClient()
  const openaiClient = new OpenAIClient()

  // Initialize Agent (creates its own IOClient internally)
  const agent = new Agent()

  // Default open or close DevTools by F12 in development
  app.on("browser-window-created", (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  // ========= SETTINGS MANAGEMENT =========
  const defaultSettings = {
    globalShortcuts: {
      toggleWindow: "Alt+P"
    }
  }

  // TODO: Load settings from file/storage
  let currentSettings = { ...defaultSettings }

  // ========= IPC HANDLERS =========
  ipcMain.handle("get-settings", async () => {
    return currentSettings
  })

  ipcMain.handle("query", async (event, payload) => {
    const pushEvent = (eventData) => {
      event.sender.send("response-event", eventData)
    }

    // // Simple screenshot command
    // if (payload.query.toLowerCase().trim() === "screenshot") {
    //   const res = await agent.takeScreenshot(pushEvent)
    //   event.sender.send("focus-query-input")
    //   return res
    // }

    const res = await agent.query(payload.query, pushEvent)
    event.sender.send("focus-query-input")
    return res
  })

  ipcMain.handle("transcribe", async (_event, payload) => {
    const audioBuffer = Buffer.from(payload.audio, "base64")
    return await openaiClient.transcribeAudio(audioBuffer, payload.filename)
  })

  ipcMain.handle("confirm-command", async (_event, confirmed) => {
    agent.handleConfirmation(confirmed)
    return { success: true }
  })

  ipcMain.handle("take-screenshot", async (event) => {
    const pushEvent = (eventData) => {
      event.sender.send("response-event", eventData)
    }

    return await agent.takeScreenshot(pushEvent)
  })

  // ========= WINDOWS AND TRAY =========
  createChatWindow() // Create window at startup

  createSystemTray({
    onShowChat: () => showChatWindow(),
    onOpenSettings: () => createSettingsWindow(),
    onQuit: () => app.quit()
  })

  app.on("will-quit", () => {
    unregisterAllShortcuts()
    destroyTray()
  })
})
