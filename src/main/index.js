import { app, BrowserWindow, ipcMain } from "electron";
import { electronApp, optimizer } from "@electron-toolkit/utils";
import dotenv from "dotenv";

import {
  createChatWindow,
  showChatWindow,
  toggleChatWindow,
} from "./windows/chat.js";
import { createSettingsWindow } from "./windows/settings.js";
import { createSystemTray, destroyTray } from "./windows/tray.js";
import {
  start as startOSClient,
  stop as stopOSClient,
  takeScreenshot,
  moveMouse,
  clickMouse,
  typeText,
  echo,
} from "./clients/os.js";
import { registerShortcuts, unregisterAllShortcuts } from "./shortcuts.js";

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

  app.on("activate", function () {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) {
      createChatWindow({ takeScreenshot });
    }
  });

  // Register global shortcuts (can later be loaded from settings)
  registerShortcuts({ "Alt+P": toggleChatWindow });

  // Start OS helper service (Flask)
  startOSClient();

  // Default open or close DevTools by F12 in development
  app.on("browser-window-created", (_, window) => {
    optimizer.watchWindowShortcuts(window);
  });

  // ========= SETTINGS MANAGEMENT =========
  const defaultSettings = {
    globalShortcuts: {
      toggleWindow: "Alt+P"
    }
  };

  // TODO: Load settings from file/storage
  let currentSettings = { ...defaultSettings };

  // ========= IPC HANDLERS =========
  ipcMain.handle("get-settings", async () => {
    return currentSettings;
  });

  ipcMain.handle("query", async (_event, payload) => {
    console.log("query", payload);
    // TODO: attach JWT and forward to your Vercel backend.
    // For V1 this returns a dummy response.
    return {
      type: "text",
      data: "ok looks like i have the right text selected",
    };
  });

  ipcMain.handle("action", async (_event, payload) => {
    console.log("action", payload);
    switch (payload.type) {
      case "move_mouse":
        return moveMouse(payload.x, payload.y);
      case "click_mouse":
        return clickMouse();
      case "type_text":
        return typeText(payload.text);
      case "screenshot":
        // NOTE: This returns base64 encoded image string in json response.
        // If screenshot become frequent and images become large,
        // save the image to a temp file and return the path instead.
        return takeScreenshot();
      default:
        return { error: "unknown action" };
    }
  });

  // ========= WINDOWS AND TRAY =========
  createChatWindow({ takeScreenshot });
  createSystemTray({
    onShowChat: () => showChatWindow(true),
    onOpenSettings: () => createSettingsWindow(),
    onQuit: () => app.quit(),
  });

  // ========= APP CLEANUP =========
  app.on("before-quit", () => {
    stopOSClient();
  });

  app.on("will-quit", () => {
    unregisterAllShortcuts();
    destroyTray();
  });
});
