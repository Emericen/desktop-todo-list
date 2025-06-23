import {
  app,
  shell,
  BrowserWindow,
  ipcMain,
  Tray,
  Menu,
  nativeImage,
  screen,
  globalShortcut,
} from "electron";
import { join } from "path";
import { electronApp, optimizer, is } from "@electron-toolkit/utils";
import { spawn } from "child_process";
import WebSocket from "ws";
import dotenv from "dotenv";

// Load environment variables
dotenv.config();

// Hide dock on macOS
if (process.platform === "darwin") {
  app.dock.hide();
}
// ========== GLOBAL STATE ==========
let tray = null;
let chatWindow = null;
let settingsWindow = null;

// Cache only the current shortcut for registration/unregistration
let currentShortcut = null;

// ========== WINDOW MANAGEMENT ==========
let previouslyFocusedWindow = null;

// Keep track of registered shortcut to allow re-registering
let registeredShortcut = null;

// WebSocket client to communicate with Python backend (initialized later)
let wsClient = null;

// Reusable white square icon (16x16) for Linux where BrowserWindow expects an icon
const WHITE_ICON_SIZE = 16;
const whiteBuf = Buffer.alloc(WHITE_ICON_SIZE * WHITE_ICON_SIZE * 4, 255);
const whiteIcon = nativeImage.createFromBuffer(whiteBuf, {
  width: WHITE_ICON_SIZE,
  height: WHITE_ICON_SIZE,
});

function registerToggleShortcut(accelerator) {
  // Unregister current shortcut if any
  if (registeredShortcut) {
    globalShortcut.unregister(registeredShortcut);
    registeredShortcut = null;
  }

  // Register new shortcut if provided
  if (accelerator && globalShortcut.register(accelerator, toggleChatWindow)) {
    registeredShortcut = accelerator;
    console.log(`Registered global shortcut: ${accelerator}`);
  }
}

// Flag to track if we're waiting for screenshot before showing window
let waitingForScreenshot = false;

function toggleChatWindow() {
  if (chatWindow) {
    if (chatWindow.isVisible()) {
      hideChatWindow();
    } else {
      // Request backend screenshot and wait for it before showing window
      if (wsClient && wsClient.readyState === WebSocket.OPEN) {
        waitingForScreenshot = true;
        wsClient.send(JSON.stringify({ action: "take_screenshot" }));
      } else {
        // No backend connection, show window immediately
        showChatWindow(true);
      }
    }
  }
}

function hideChatWindow() {
  if (chatWindow) {
    chatWindow.blur();
    chatWindow.hide();

    // In real world, restore focus to the previously active window
    if (previouslyFocusedWindow && !previouslyFocusedWindow.isDestroyed()) {
      previouslyFocusedWindow.focus();
      previouslyFocusedWindow = null;
    } else {
      // Fallback: hide app on macOS to return focus to system
      if (process.platform === "darwin") app.hide();
    }
  }
}

function showChatWindow(shouldFocus = false) {
  if (chatWindow) {
    // Store the currently focused window before showing chat
    const focusedWindow = BrowserWindow.getFocusedWindow();
    if (focusedWindow && focusedWindow !== chatWindow) {
      previouslyFocusedWindow = focusedWindow;
    }

    chatWindow.show();
    // Notify renderer to focus the query input when window is shown
    chatWindow.webContents.send("focus-query-input");
    if (shouldFocus) {
      chatWindow.focus();
    }
  }
}

// ========== SYSTEM TRAY ==========
function createSystemTray() {
  // Create a simple blue square icon (16x16)
  const size = 16;
  const whiteBuffer = Buffer.alloc(size * size * 4, 255); // just white square
  const whitePixel = nativeImage.createFromBuffer(whiteBuffer, {
    width: size,
    height: size,
  });
  tray = new Tray(whitePixel);

  // Create context menu
  const contextMenu = Menu.buildFromTemplate([
    {
      label: "Show Chat",
      click: () => {
        showChatWindow(true); // User-initiated, focus immediately
      },
    },

    { type: "separator" },
    {
      label: "Settings",
      click: () => {
        createSettingsWindow();
      },
    },
    { type: "separator" },
    {
      label: "Quit",
      click: () => {
        app.quit();
      },
    },
  ]);

  tray.setContextMenu(contextMenu);
  tray.setToolTip("AI Assistant");

  console.log("System tray created");
}

// ========== CHAT WINDOW ==========
function createWindow() {
  // Get screen dimensions
  const { width: screenWidth, height: screenHeight } =
    screen.getPrimaryDisplay().workAreaSize;

  const windowWidth = 540;
  const windowHeight = 720;

  // Position near system tray based on platform
  let x, y;
  if (process.platform === "darwin") {
    // macOS: top right (system tray at top)
    x = screenWidth - windowWidth;
    y = 0; // Can add small offset like y = 25 for menu bar
  } else {
    // Windows/Linux: bottom right (system tray at bottom)
    x = screenWidth - windowWidth;
    y = screenHeight - windowHeight;
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
      sandbox: false,
    },
    frame: false,
    skipTaskbar: true, // Don't show in taskbar
  });

  chatWindow.setAlwaysOnTop(true, "screen-saver");
  chatWindow.setVisibleOnAllWorkspaces(true);

  chatWindow.on("ready-to-show", () => {
    chatWindow.show();
    chatWindow.webContents.send("focus-query-input");
  });

  // Auto-hide chat when it loses focus (user clicked elsewhere)
  chatWindow.on("blur", () => {
    // Only hide if window is currently visible
    if (chatWindow?.isVisible()) {
      hideChatWindow();
    }
  });

  chatWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url);
    return { action: "deny" };
  });

  // HMR for renderer base on electron-vite cli.
  // Load the remote URL for development or the local html file for production.
  if (is.dev && process.env["ELECTRON_RENDERER_URL"]) {
    chatWindow.loadURL(process.env["ELECTRON_RENDERER_URL"]);
  } else {
    chatWindow.loadFile(join(__dirname, "../renderer/index.html"));
  }
}

// ========== SETTINGS WINDOW ==========
function createSettingsWindow() {
  if (settingsWindow && !settingsWindow.isDestroyed()) {
    settingsWindow.show();
    settingsWindow.focus();
    return;
  }

  const { width: screenWidth, height: screenHeight } =
    screen.getPrimaryDisplay().workAreaSize;

  const windowWidth = 480;
  const windowHeight = 620;

  settingsWindow = new BrowserWindow({
    width: windowWidth,
    height: windowHeight,
    x: Math.round((screenWidth - windowWidth) / 2),
    y: Math.round((screenHeight - windowHeight) / 2),
    show: false,
    autoHideMenuBar: true,
    ...(process.platform === "linux" ? { icon: whiteIcon } : {}),
    webPreferences: {
      preload: join(__dirname, "../preload/index.js"),
      sandbox: false,
    },
  });

  settingsWindow.on("ready-to-show", () => {
    settingsWindow.show();
  });

  settingsWindow.on("closed", () => {
    settingsWindow = null;
  });

  // Load renderer with query param
  if (is.dev && process.env["ELECTRON_RENDERER_URL"]) {
    settingsWindow.loadURL(
      `${process.env["ELECTRON_RENDERER_URL"]}?w=settings`
    );
  } else {
    settingsWindow.loadFile(join(__dirname, "../renderer/index.html"), {
      search: "?w=settings",
    });
  }
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(() => {
  // Set app user model id for windows
  electronApp.setAppUserModelId("com.electron");

  // In development we spawn the Python interpreter directly so we get live reloads.
  let py;
  if (is.dev) {
    const devScriptPath = join(process.cwd(), "src/services/main.py");
    // Run Python in unbuffered mode (-u flag) to see prints immediately
    py = spawn("python", ["-u", devScriptPath], { cwd: process.cwd() });
  } else {
    // In production the backend has been bundled into a standalone binary via PyInstaller
    // and placed under resources/backend by electron-builder (see electron-builder.yml).
    const exeName = process.platform === "win32" ? "services.exe" : "services";
    const prodExePath = join(process.resourcesPath, "services", exeName);
    py = spawn(prodExePath, [], {
      cwd: join(process.resourcesPath, "services"),
    });
  }

  // Log Python output to both terminal and Electron console
  py.stdout.on("data", (data) => {
    const output = `[PY] ${data.toString().trim()}`;
    console.log(output);
  });

  py.stderr.on("data", (data) => {
    const error = `[PY-ERR] ${data.toString().trim()}`;
    console.error(error);
  });

  py.on("close", (code, signal) => {
    if (code !== null) {
      console.log(`[PY] exited with code ${code}`);
    } else {
      console.log(`[PY] terminated by signal ${signal}`);
    }
  });

  py.on("error", (err) => {
    console.error("[PY] error", err);
  });

  // Ensure the Python process dies with the app
  app.on("before-quit", () => {
    py.kill();
  });

  // Default open or close DevTools by F12 in development
  // and ignore CommandOrControl + R in production.
  // see https://github.com/alex8088/electron-toolkit/tree/master/packages/utils
  app.on("browser-window-created", (_, window) => {
    optimizer.watchWindowShortcuts(window);
  });

  // ------- Establish WebSocket connection with retry -------
  function connectWs(retries = 0) {
    if (wsClient && wsClient.readyState === WebSocket.OPEN) return;

    wsClient = new WebSocket("ws://127.0.0.1:8765");

    wsClient.on("open", () => {
      console.log("[WS] Connected to backend");
      // Request initial shortcut from backend
      wsClient.send(JSON.stringify({ action: "get_initial_shortcut" }));
    });

    // Relay Python → Renderer
    wsClient.on("message", (data) => {
      let payload;
      try {
        payload = JSON.parse(data.toString());
      } catch {
        return;
      }

      // Handle shortcut updates from backend
      if (payload.type === "update-shortcut") {
        const newShortcut = payload.shortcut;
        if (newShortcut !== currentShortcut) {
          registerToggleShortcut(newShortcut);
          currentShortcut = newShortcut;
        }
        return;
      }

      // Check if this is a screenshot response and we're waiting to show window
      if (waitingForScreenshot && payload.type === "response-stream" && payload.data?.type === "image") {
        waitingForScreenshot = false;
        // First send the screenshot to renderer, then show window
        BrowserWindow.getAllWindows().forEach((w) => {
          w.webContents.send("backend-push", payload);
        });
        showChatWindow(true);
        return;
      }

      // Relay everything else to renderer
      BrowserWindow.getAllWindows().forEach((w) => {
        w.webContents.send("backend-push", payload);
      });
    });

    wsClient.on("error", (err) => {
      if (retries < 10) {
        setTimeout(() => connectWs(retries + 1), 300);
      } else {
        console.error("[WS] failed after retries", err);
      }
    });
  }

  // Try connecting after slight delay to give backend time to bind port
  setTimeout(() => connectWs(), 300);

  // ========= IPC proxy =========
  ipcMain.handle("backend-proxy", (_event, payload) => {
    // Handle UI-specific actions
    if (payload.action === "toggle_window") {
      toggleChatWindow();
      return;
    }

    // Handle shortcut registration from backend settings updates
    if (payload.action === "update_shortcut") {
      const newShortcut = payload.shortcut;
      if (newShortcut !== currentShortcut) {
        registerToggleShortcut(newShortcut);
        currentShortcut = newShortcut;
      }
      return;
    }

    // Forward everything else to Python
    if (wsClient && wsClient.readyState === WebSocket.OPEN) {
      wsClient.send(JSON.stringify(payload));
    } else {
      console.warn("[WS] not ready, dropping payload", payload);
    }
    return null;
  });

  createWindow();
  createSystemTray();

  app.on("activate", function () {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

// ========== APP CLEANUP ==========
app.on("will-quit", () => {
  // Unregister global shortcuts
  globalShortcut.unregisterAll();
  if (tray) {
    tray.destroy();
  }
});

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.
