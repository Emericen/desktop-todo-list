import { app, BrowserWindow, ipcMain } from "electron"
import { electronApp, optimizer } from "@electron-toolkit/utils"
import dotenv from "dotenv"

import {
  createChatWindow,
  showChatWindow,
  toggleChatWindow,
  hideChatWindow
} from "./windows/chat.js"
import { createSettingsWindow } from "./windows/settings.js"
import { createSystemTray, destroyTray } from "./windows/tray.js"
import OSClient from "./clients/os.js"
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
      createChatWindow({ takeScreenshot: () => osClient.takeScreenshot() })
    }
  })

  // Register global shortcuts (can later be loaded from settings)
  registerShortcuts({ "Alt+P": toggleChatWindow })

  // Create and start OS client
  const osClient = new OSClient()
  osClient.start()

  // Initialize clients
  const anthropicClient = new AnthropicClient()
  const openaiClient = new OpenAIClient()

  // Initialize Agent with OS client
  const agent = new Agent(osClient, hideChatWindow, showChatWindow)

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

    // TODO: TOGGLE AGENT FLAG
    const useAgent = true
    if (useAgent) {
      return await agent.run(payload.messages, pushEvent)
    } else {
      return await anthropicClient.sendQuery(payload, pushEvent)
    }
  })

  ipcMain.handle("transcribe", async (_event, payload) => {
    const audioBuffer = Buffer.from(payload.audio, "base64")
    return await openaiClient.transcribeAudio(audioBuffer, payload.filename)
  })

  // ========= WINDOWS AND TRAY =========
  createChatWindow({ takeScreenshot: () => osClient.takeScreenshot() })
  createSystemTray({
    onShowChat: () => showChatWindow(true),
    onOpenSettings: () => createSettingsWindow(),
    onQuit: () => app.quit()
  })

  // ========= APP CLEANUP =========
  app.on("before-quit", () => {
    osClient.stop()
  })

  app.on("will-quit", () => {
    unregisterAllShortcuts()
    destroyTray()
  })
})
