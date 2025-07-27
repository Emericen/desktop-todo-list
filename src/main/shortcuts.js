import { globalShortcut } from "electron"

// ===== Shortcut registry =====
const registered = new Map() // accelerator → callback

/**
 * Register a set of global shortcuts.
 * @param {Record<string, Function>} shortcutMap Accelerators mapped to handler callbacks.
 */
export function registerShortcuts(shortcutMap = {}) {
  // Clear existing first
  unregisterAllShortcuts()

  Object.entries(shortcutMap).forEach(([accelerator, handler]) => {
    if (accelerator && typeof handler === "function") {
      const ok = globalShortcut.register(accelerator, handler)
      if (ok) {
        registered.set(accelerator, handler)
        console.log(`[Shortcut] Registered ${accelerator}`)
      } else {
        console.warn(`[Shortcut] Failed to register ${accelerator}`)
      }
    }
  })
}

/**
 * Register shortcuts from user settings
 * @param {UserSettings} userSettings - The user settings instance
 * @param {Record<string, Function>} handlerMap - Map of setting keys to handler functions
 */
export function registerFromSettings(userSettings, handlerMap = {}) {
  const shortcutMap = {}
  
  Object.entries(handlerMap).forEach(([settingKey, handler]) => {
    const accelerator = userSettings.get(`shortcuts.${settingKey}`)
    if (accelerator) {
      shortcutMap[accelerator] = handler
    }
  })
  
  registerShortcuts(shortcutMap)
}

export function unregisterAllShortcuts() {
  globalShortcut.unregisterAll()
  registered.clear()
}
