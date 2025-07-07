import { BrowserWindow, screen } from "electron"
import { join } from "path"
import { is } from "@electron-toolkit/utils"

// ========== CHAT WINDOW STATE ==========
let chatWindow = null
let previouslyFocusedWindow = null
let osClient = null
let currentScreenshot = null

// Reusable white square icon (16x16) for Linux where BrowserWindow expects an icon
const WHITE_ICON_SIZE = 16
const whiteBuf = Buffer.alloc(WHITE_ICON_SIZE * WHITE_ICON_SIZE * 4, 255)
import { nativeImage } from "electron"
const whiteIcon = nativeImage.createFromBuffer(whiteBuf, {
  width: WHITE_ICON_SIZE,
  height: WHITE_ICON_SIZE
})

export function createChatWindow(sharedOSClient) {
  // Use the shared OSClient for screenshot management
  osClient = sharedOSClient
  // Get screen dimensions
  const { width: screenWidth, height: screenHeight } =
    screen.getPrimaryDisplay().workAreaSize

  const windowWidth = 540
  const windowHeight = 720

  // Position near system tray based on platform
  let x, y
  if (process.platform === "darwin") {
    // macOS: top right (system tray at top)
    x = screenWidth - windowWidth
    y = 0 // Can add small offset like y = 25 for menu bar
  } else {
    // Windows/Linux: bottom right (system tray at bottom)
    x = screenWidth - windowWidth
    y = screenHeight - windowHeight
  }

  // Create the browser window.
  chatWindow = new BrowserWindow({
    width: windowWidth,
    height: windowHeight,
    x: x,
    y: y,
    show: false,
    resizable: false,
    autoHideMenuBar: true,
    ...(process.platform === "linux" ? { icon: whiteIcon } : {}),
    webPreferences: {
      preload: join(__dirname, "../preload/index.js"),
      sandbox: false
    },
    frame: false,
    skipTaskbar: true // Don't show in taskbar
  })

  chatWindow.setAlwaysOnTop(true, "screen-saver")
  chatWindow.setVisibleOnAllWorkspaces(true)

  chatWindow.on("ready-to-show", toggleChatWindow)

  // Auto-hide chat when it loses focus (user clicked elsewhere)
  chatWindow.on("blur", () => {
    // Only hide if window is currently visible
    if (chatWindow?.isVisible()) {
      hideChatWindow()
    }
  })

  // HMR for renderer base on electron-vite cli.
  // Load the remote URL for development or the local html file for production.
  if (is.dev && process.env["ELECTRON_RENDERER_URL"]) {
    chatWindow.loadURL(process.env["ELECTRON_RENDERER_URL"])
  } else {
    chatWindow.loadFile(join(__dirname, "../renderer/index.html"))
  }

  return chatWindow
}

// ========== SCREENSHOT MANAGEMENT ==========
export async function updateCurrentScreenshot() {
  if (!osClient) return null
  
  try {
    const result = await osClient.takeScreenshot()
    if (result && result.image) {
      currentScreenshot = result.image
      return currentScreenshot
    }
  } catch (error) {
    console.error("Failed to update screenshot:", error)
  }
  return null
}

export function getCurrentScreenshot() {
  return currentScreenshot
}

export function clearCurrentScreenshot() {
  currentScreenshot = null
}

export function cleanup() {
  // Clear local state (osClient is stopped centrally in index.js)
  osClient = null
  clearCurrentScreenshot()
}

export function toggleChatWindow() {
  if (chatWindow) {
    if (chatWindow.isVisible()) {
      hideChatWindow()
    } else {
      // Take screenshot and show window
      updateCurrentScreenshot()
        .then((screenshotData) => {
          if (screenshotData) {
            const imagePayload = {
              type: "image",
              content: `data:image/jpeg;base64,${screenshotData}`
            }

            const sendMessages = () => {
              chatWindow.webContents.send("backend-push", imagePayload)
            }

            // If this is the very first load we may need to wait until DOM is ready
            if (chatWindow.webContents.isLoading()) {
              chatWindow.webContents.once("dom-ready", sendMessages)
            } else {
              sendMessages()
            }
          } else {
            console.log("no image in screenshot response")
          }
        })
        .catch((error) => {
          console.log("error in screenshot flow:", error)
        })
        .finally(() => {
          // Ensure window is shown even if screenshot failed
          showChatWindow(true)
        })
    }
  }
}

export function showChatWindow(shouldFocus = false) {
  if (chatWindow) {
    // Store the currently focused window before showing chat
    const focusedWindow = BrowserWindow.getFocusedWindow()
    if (focusedWindow && focusedWindow !== chatWindow) {
      previouslyFocusedWindow = focusedWindow
    }

    chatWindow.show()
    chatWindow.restore() // Ensure window is unminimized on Windows
    // Notify renderer to focus the query input when window is shown
    chatWindow.webContents.send("focus-query-input")
    if (shouldFocus) {
      chatWindow.focus()
    }
  }
}

export function hideChatWindow() {
  if (chatWindow) {
    if (process.platform === "win32") {
      chatWindow.minimize() // Required on Windows to give focus back
    }
    chatWindow.blur()
    chatWindow.hide()

    // Keep messages persistent across window hide/show cycles

    // In real world, restore focus to the previously active window
    if (previouslyFocusedWindow && !previouslyFocusedWindow.isDestroyed()) {
      previouslyFocusedWindow.focus()
      previouslyFocusedWindow = null
    } else {
      // Fallback: hide app on macOS to return focus to system
      if (process.platform === "darwin") {
        const { app } = require("electron")
        app.hide()
      }
    }
  }
}
