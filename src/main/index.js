import { app, BrowserWindow, ipcMain } from "electron"
import { electronApp, optimizer } from "@electron-toolkit/utils"
import dotenv from "dotenv"

import {
  createChatWindow,
  showChatWindow,
  toggleChatWindow
} from "./windows/chat.js"
import { createSystemTray, destroyTray } from "./windows/tray.js"
import OpenAIClient from "./clients/openai.js"
import { registerShortcuts, unregisterAllShortcuts } from "./shortcuts.js"
import Agent from "./clients/agent.js"
import AuthClient from "./clients/auth.js"

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

  // Initialize Agent and Auth
  const agent = new Agent()
  const authClient = new AuthClient()
  const openaiClient = new OpenAIClient()

  // Default open or close DevTools by F12 in development
  app.on("browser-window-created", (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  // Register fixed global shortcut
  registerShortcuts({ "Alt+P": toggleChatWindow })

  // ========= IPC HANDLERS =========
  ipcMain.handle("query", async (event, payload) => {
    const pushEvent = (eventData) => {
      console.log(
        "pushEvent:",
        eventData.type,
        eventData.content?.substring(0, 100)
      )
      // Ensure chat window is visible for every event so the user can see agent progress
      showChatWindow()
      event.sender.send("response-event", eventData)
    }

    if (payload.query === "/auth-status") {
      if (authClient.isAuthenticated()) {
        pushEvent({ type: "text", content: "You are authenticated!" })
      } else {
        pushEvent({ type: "text", content: "You are not authenticated!" })
      }
      return { success: true }
    }

    if (!authClient.isAuthenticated()) {
      await authClient.handle(payload.query, pushEvent)
      event.sender.send("focus-query-input")
      return { success: true }
    }

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

  // ========= WINDOWS AND TRAY =========
  createChatWindow() // Create window at startup

  createSystemTray({
    onShowChat: () => showChatWindow(),
    onOpenAccount: () => {
      // TODO: open account home page url
    },
    onQuit: () => app.quit()
  })

  app.on("will-quit", () => {
    unregisterAllShortcuts()
    destroyTray()
  })
})
