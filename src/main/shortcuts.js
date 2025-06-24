import { globalShortcut } from "electron";

// ========== SHORTCUT STATE ==========
let registeredShortcut = null;
let toggleCallback = null;

export function initShortcuts(callback) {
  toggleCallback = callback;
}

export function registerToggleShortcut(accelerator) {
  // Unregister current shortcut if any
  if (registeredShortcut) {
    globalShortcut.unregister(registeredShortcut);
    registeredShortcut = null;
  }

  // Register new shortcut if provided
  if (accelerator && globalShortcut.register(accelerator, () => {
    if (toggleCallback) toggleCallback();
  })) {
    registeredShortcut = accelerator;
    console.log(`Registered global shortcut: ${accelerator}`);
  }
}

export function unregisterAllShortcuts() {
  globalShortcut.unregisterAll();
  registeredShortcut = null;
}

export function getCurrentShortcut() {
  return registeredShortcut;
} 