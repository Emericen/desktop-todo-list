import { join } from "path"
import { spawn } from "child_process"
import { is } from "@electron-toolkit/utils"

let pyProcess = null
const BASE_URL = "http://127.0.0.1:8765" // Flask service address

export function start() {
  if (pyProcess) return // already running

  if (is.dev) {
    const devScriptPath = join(process.cwd(), "src/services/main.py")
    pyProcess = spawn("python", ["-u", devScriptPath], { cwd: process.cwd() })
  } else {
    const exeName = process.platform === "win32" ? "services.exe" : "services"
    const prodExePath = join(process.resourcesPath, "services", exeName)
    pyProcess = spawn(prodExePath, [], {
      cwd: join(process.resourcesPath, "services")
    })
  }

  // Only show logs in dev
  if (is.dev) {
    pyProcess.stdout.on("data", (data) => {
      console.log(`[PY] ${data.toString().trim()}`)
    })
    pyProcess.stderr.on("data", (data) => {
      console.error(`[py] ${data.toString().trim()}`)
    })
  }

  pyProcess.on("close", (code, signal) => {
    console.log(`[PY] exited: code=${code} signal=${signal}`)
    pyProcess = null
  })
  pyProcess.on("error", (err) => {
    console.error("[PY] error", err)
  })
}

export function stop() {
  if (pyProcess) {
    pyProcess.kill()
    pyProcess = null
  }
}

// --- Helper to perform fetch with JSON ---
async function post(path, body) {
  const res = await fetch(`${BASE_URL}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  })
  return res.json()
}

async function get(path) {
  const res = await fetch(`${BASE_URL}${path}`)
  return res.json()
}

// --- Public API wrappers ---
export const echo = (message) => post("/echo", { message })
export const moveMouse = (x, y) => post("/position", { x, y })
export const clickMouse = () => post("/click", {})
export const typeText = (text) => post("/type", { text })
export const takeScreenshot = () => get("/screenshot")
