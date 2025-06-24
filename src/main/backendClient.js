import WebSocket from "ws";
import { BrowserWindow } from "electron";
import { join } from "path";
import { spawn } from "child_process";
import { is } from "@electron-toolkit/utils";

// ========== BACKEND CLIENT STATE ==========
let wsClient = null;
let waitingForScreenshot = false;
let pyProcess = null;

// Callback functions set by main process
let onShortcutUpdate = null;
let onScreenshotReceived = null;

export function initBackendClient(callbacks = {}) {
  onShortcutUpdate = callbacks.onShortcutUpdate;
  onScreenshotReceived = callbacks.onScreenshotReceived;
}

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
      if (onShortcutUpdate) {
        onShortcutUpdate(payload.shortcut);
      }
      return;
    }

    // Check if this is a screenshot response and we're waiting to show window
    if (waitingForScreenshot && payload.type === "response-stream" && payload.data?.type === "image") {
      waitingForScreenshot = false;
      // First send the screenshot to renderer, then notify callback
      BrowserWindow.getAllWindows().forEach((w) => {
        w.webContents.send("backend-push", payload);
      });
      if (onScreenshotReceived) {
        onScreenshotReceived();
      }
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

function startPythonProcess() {
  if (is.dev) {
    const devScriptPath = join(process.cwd(), "src/services/main.py");
    pyProcess = spawn("python", ["-u", devScriptPath], { cwd: process.cwd() });
  } else {
    const exeName = process.platform === "win32" ? "services.exe" : "services";
    const prodExePath = join(process.resourcesPath, "services", exeName);
    pyProcess = spawn(prodExePath, [], {
      cwd: join(process.resourcesPath, "services"),
    });
  }

  // Log Python output
  pyProcess.stdout.on("data", (data) => {
    console.log(`[PY] ${data.toString().trim()}`);
  });
  pyProcess.stderr.on("data", (data) => {
    console.error(`[PY-ERR] ${data.toString().trim()}`);
  });
  pyProcess.on("close", (code, signal) => {
    if (code !== null) {
      console.log(`[PY] exited with code ${code}`);
    } else {
      console.log(`[PY] terminated by signal ${signal}`);
    }
  });
  pyProcess.on("error", (err) => {
    console.error("[PY] error", err);
  });
}

export function startBackend() {
  // Start Python process first
  startPythonProcess();
  
  // Try connecting after slight delay to give backend time to bind port
  setTimeout(() => connectWs(), 300);
}

export function stopBackend() {
  if (pyProcess) {
    pyProcess.kill();
    pyProcess = null;
  }
}

export function sendToBackend(payload) {
  if (wsClient && wsClient.readyState === WebSocket.OPEN) {
    wsClient.send(JSON.stringify(payload));
  } else {
    console.warn("[WS] not ready, dropping payload", payload);
  }
}

export function requestScreenshot() {
  if (wsClient && wsClient.readyState === WebSocket.OPEN) {
    waitingForScreenshot = true;
    wsClient.send(JSON.stringify({ action: "take_screenshot" }));
    return true;
  }
  return false;
}

export function isBackendConnected() {
  return wsClient && wsClient.readyState === WebSocket.OPEN;
} 