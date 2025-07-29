import { Tray, Menu, nativeImage, app } from "electron"
import path from "path"

// ========== SYSTEM TRAY STATE ==========
let tray = null

export function createSystemTray(callbacks = {}) {
  const { onShowChat, onQuit } = callbacks

  // Use the atom symbol icon for system tray
  const iconPath = app.isPackaged
    ? path.join(process.resourcesPath, "atom_symbol.png")
    : path.join(process.cwd(), "resources", "atom_symbol.png")
  const trayIcon = nativeImage.createFromPath(iconPath)

  // Resize for tray (22x22 for better visibility)
  const resizedIcon = trayIcon.resize({ width: 22, height: 22 })

  tray = new Tray(resizedIcon)

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
