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

  // Initialize Agent and Auth
  const agent = new Agent()
  const authClient = new AuthClient()
  await authClient.loadStoredSession()
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

    if (payload.query === "/logout") {
      await authClient.logout()
      pushEvent({ type: "text", content: "Logged out." })
      return { success: true }
    }

    if (payload.query === "/auth-status") {
      if (authClient.isAuthenticated()) {
        pushEvent({ type: "text", content: "You are authenticated!" })
      } else {
        pushEvent({ type: "text", content: "You are not authenticated!" })
      }
      return { success: true }
    }

    if (payload.query === "/help") {
      const lines = []

      if (authClient.isAuthenticated()) {
        lines.push(`Hello, ${authClient.getUser().email}!`)
      } else {
        lines.push("Hello there!")
      }
      lines.push(
        "I'm a desktop assistant that can help you operate your computer! You can tell me anything you want to do, and I'll do it for you!"
      )
      lines.push("Additional commands:")
      lines.push("`/help` – show this message")
      lines.push("`/clear` – clear chat history")
      if (authClient.isAuthenticated()) {
        lines.push("`/logout` – sign out of your account.")
      }
      pushEvent({ type: "text", content: lines.join("\n\n") })
      return { success: true }
    }

    if (!authClient.isAuthenticated()) {
      await authClient.handle(payload.query, pushEvent)
      event.sender.send("focus-query-input")
      return { success: true }
    }

    try {
      const res = await agent.query(payload.query, pushEvent)
      event.sender.send("focus-query-input")
      return res
    } catch (error) {
      console.error("agent.query error:", error)
      pushEvent({
        type: "error",
        content: `Error: ${
          error.message || error
        }. Conversation has been reset.`
      })
      // Reset backend conversation state so next turn starts fresh
      agent.messages = []
      // Instruct renderer to clear its chat as well
      event.sender.send("clear-messages")
      event.sender.send("focus-query-input")
      return { success: false, error: error.message || String(error) }
    }
  })

  ipcMain.handle("transcribe", async (_event, payload) => {
    const audioBuffer = Buffer.from(payload.audio, "base64")
    return await openaiClient.transcribeAudio(audioBuffer, payload.filename)
  })

  ipcMain.handle("confirm-command", async (_event, confirmed) => {
    agent.handleConfirmation(confirmed)
    return { success: true }
  })

  // Clear conversation history on backend when requested by renderer
  ipcMain.handle("clear-messages", async (event) => {
    agent.messages = []
    // Notify all renderers to clear their local store just in case
    BrowserWindow.getAllWindows().forEach((win) =>
      win.webContents.send("clear-messages")
    )
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
