import { join } from "path"
import { spawn } from "child_process"
import { is } from "@electron-toolkit/utils"

class OSClient {
  constructor() {
    this.pyProcess = null
    this.baseURL = "http://127.0.0.1:8765" // Flask service address
  }

  start() {
    if (this.pyProcess) return // already running

    if (is.dev) {
      const devScriptPath = join(process.cwd(), "src/services/main.py")
      this.pyProcess = spawn("python", ["-u", devScriptPath], {
        cwd: process.cwd()
      })
    } else {
      const exeName = process.platform === "win32" ? "services.exe" : "services"
      const prodExePath = join(process.resourcesPath, "services", exeName)
      this.pyProcess = spawn(prodExePath, [], {
        cwd: join(process.resourcesPath, "services")
      })
    }

    // Only show logs in dev
    if (is.dev) {
      this.pyProcess.stdout.on("data", (data) => {
        console.log(`[PY] ${data.toString().trim()}`)
      })
      this.pyProcess.stderr.on("data", (data) => {
        console.log(`[PY] ${data.toString().trim()}`)
      })
    }

    this.pyProcess.on("close", (code, signal) => {
      console.log(`[PY] exited: code=${code} signal=${signal}`)
      this.pyProcess = null
    })
    this.pyProcess.on("error", (err) => {
      console.error("[PY] error", err)
    })
  }

  stop() {
    if (this.pyProcess) {
      this.pyProcess.kill()
      this.pyProcess = null
    }
  }

  // --- Private HTTP helpers ---
  async _post(path, body) {
    const res = await fetch(`${this.baseURL}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    })
    return res.json()
  }

  async _get(path) {
    const res = await fetch(`${this.baseURL}${path}`)
    return res.json()
  }

  // --- Public API methods ---
  echo = async (message) => this._post("/echo", { message })
  moveMouse = async (x, y) => this._post("/position", { x, y })
  clickMouse = async () => this._post("/click", {})
  leftClick = async (x, y) => this._post("/left_click", { x, y })
  rightClick = async (x, y) => this._post("/right_click", { x, y })
  middleClick = async (x, y) => this._post("/middle_click", { x, y })
  doubleClick = async (x, y) => this._post("/double_click", { x, y })
  tripleClick = async (x, y) => this._post("/triple_click", { x, y })
  leftMouseDown = async (x, y) => this._post("/left_mouse_down", { x, y })
  leftMouseUp = async (x, y) => this._post("/left_mouse_up", { x, y })
  leftClickDrag = async (x1, y1, x2, y2) =>
    this._post("/left_click_drag", { x1, y1, x2, y2 })
  typeText = async (text) => this._post("/type", { text })
  pressKey = async (key) => this._post("/key", { key })
  holdKey = async (key) => this._post("/hold_key", { key })
  scroll = async (x, y, direction, amount) =>
    this._post("/scroll", { x, y, direction, amount })
  wait = async (duration) =>
    new Promise((resolve) => setTimeout(resolve, duration))
  takeScreenshot = async () => this._get("/screenshot")

  // Execute shell commands based on platform
  executeCommand = async (command) => {
    return new Promise((resolve, reject) => {
      let shell, shellArgs

      if (process.platform === "win32") {
        shell = "cmd"
        shellArgs = ["/c", command]
      } else {
        shell = "/bin/bash"
        shellArgs = ["-c", command]
      }

      console.log(`Executing: ${shell} ${shellArgs.join(" ")}`)

      const childProcess = spawn(shell, shellArgs, {
        stdio: ["pipe", "pipe", "pipe"],
        shell: false
      })

      let stdout = ""
      let stderr = ""

      childProcess.stdout.on("data", (data) => {
        stdout += data.toString()
      })

      childProcess.stderr.on("data", (data) => {
        stderr += data.toString()
      })

      childProcess.on("close", (code) => {
        resolve({
          success: code === 0,
          exitCode: code,
          stdout: stdout.trim(),
          stderr: stderr.trim(),
          command: command
        })
      })

      childProcess.on("error", (error) => {
        reject(error)
      })

      // Set timeout to prevent hanging
      setTimeout(() => {
        childProcess.kill("SIGTERM")
        reject(new Error("Command timed out after 30 seconds"))
      }, 30000)
    })
  }
}

export default OSClient
