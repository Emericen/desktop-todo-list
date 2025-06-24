import { app, shell, BrowserWindow, ipcMain } from "electron";
import { electronApp, optimizer } from "@electron-toolkit/utils";
import dotenv from "dotenv";

// Import our modular components
import {
  createChatWindow,
  showChatWindow,
  toggleChatWindow,
} from "./chatWindow.js";
import { createSettingsWindow } from "./settingsWindow.js";
import { createSystemTray, destroyTray } from "./tray.js";
import {
  initBackendClient,
  startBackend,
  stopBackend,
  sendToBackend,
  requestScreenshot,
} from "./backendClient.js";
import {
  initShortcuts,
  registerToggleShortcut,
  unregisterAllShortcuts,
} from "./shortcuts.js";

// Load environment variables
dotenv.config();

// Hide dock on macOS
if (process.platform === "darwin") {
  app.dock.hide();
}

// ========== APP INITIALIZATION ==========
app.whenReady().then(() => {
  // Set app user model id for windows
  electronApp.setAppUserModelId("com.electron");

  // Ensure Python process dies with the app
  app.on("before-quit", () => {
    stopBackend();
  });

  // Initialize modules
  initShortcuts(toggleChatWindow);

  initBackendClient({
    onShortcutUpdate: (shortcut) => {
      registerToggleShortcut(shortcut);
    },
    onScreenshotReceived: () => {
      showChatWindow(true);
    },
  });

  // Default open or close DevTools by F12 in development
  app.on("browser-window-created", (_, window) => {
    optimizer.watchWindowShortcuts(window);
  });

  // Start backend (Python process + WebSocket client)
  startBackend();

  // ========= IPC proxy =========
  ipcMain.handle("backend-proxy", (_event, payload) => {
    // Handle UI-specific actions
    if (payload.action === "toggle_window") {
      toggleChatWindow();
      return;
    }

    // Forward everything else to Python
    sendToBackend(payload);
    return null;
  });

  // Create windows and tray
  createChatWindow({
    requestScreenshot: () => requestScreenshot(),
  });
  createSystemTray({
    onShowChat: () => showChatWindow(true),
    onOpenSettings: () => createSettingsWindow(),
    onQuit: () => app.quit(),
  });

  app.on("activate", function () {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) {
      createChatWindow({
        requestScreenshot: () => requestScreenshot(),
      });
    }
  });
});

// ========== APP CLEANUP ==========
app.on("will-quit", () => {
  unregisterAllShortcuts();
  destroyTray();
});

// Quit when all windows are closed, except on macOS
app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});
