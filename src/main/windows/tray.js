import { Tray, Menu, nativeImage, app } from "electron"

// ========== SYSTEM TRAY STATE ==========
let tray = null

export function createSystemTray(callbacks = {}) {
  const { onShowChat, onOpenAccount, onQuit } = callbacks

  // Create a simple white square icon (16x16)
  const size = 16
  const whiteBuffer = Buffer.alloc(size * size * 4, 255) // just white square
  const whitePixel = nativeImage.createFromBuffer(whiteBuffer, {
    width: size,
    height: size
  })
  tray = new Tray(whitePixel)

  // Create context menu
  const contextMenu = Menu.buildFromTemplate([
    {
      label: "Show Chat",
      click: () => {
        if (onShowChat) onShowChat()
      }
    },
    // { type: "separator" },
    {
      label: "Account",
      click: () => {
        if (onOpenAccount) onOpenAccount()
      }
    },
    // { type: "separator" },
    {
      label: "Quit",
      click: () => {
        if (onQuit) {
          onQuit()
        } else {
          app.quit()
        }
      }
    }
  ])

  tray.setContextMenu(contextMenu)
  tray.setToolTip("AI Assistant")

  console.log("System tray created")
  return tray
}

export function destroyTray() {
  if (tray) {
    tray.destroy()
    tray = null
  }
}

export function getTray() {
  return tray
}
