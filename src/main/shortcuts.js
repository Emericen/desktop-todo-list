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

export function unregisterAllShortcuts() {
  globalShortcut.unregisterAll()
  registered.clear()
}
