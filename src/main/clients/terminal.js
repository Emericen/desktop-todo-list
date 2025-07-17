import pty from "node-pty"

export default class Terminal {
  constructor() {
    this.terminal = pty.spawn(
      process.platform === "win32" ? "powershell.exe" : "bash",
      [],
      {
        name: "xterm-color",
        cols: 80,
        rows: 30,
        cwd: process.env.HOME || process.env.USERPROFILE,
        env: {
          ...process.env,
          PS1: "\\w $ ", // Shows current directory + $
          PROMPT: "\\w $ ", // For zsh compatibility
          // Disable fancy prompts
          STARSHIP_CONFIG: "",
          OH_MY_ZSH: ""
        }
      }
    )

    this.output = ""
    this.isReady = false

    // Handle terminal output
    this.terminal.on("data", (data) => {
      this.output += data
      // Keep only last 10000 characters to prevent memory issues
      if (this.output.length > 10000) {
        this.output = this.output.slice(-10000)
      }
    })

    // Mark as ready after initial prompt
    setTimeout(() => {
      this.isReady = true
    }, 500)
  }

  async execute(command, timeout = 2000) {
    return new Promise((resolve) => {
      const startOutput = this.output.length
      const startTime = Date.now()

      this.terminal.write(command + "\r")

      // Check for completion every 50ms
      const checkInterval = setInterval(() => {
        const newOutput = this.output.slice(startOutput)

        // Look for prompt patterns indicating command finished
        const promptPatterns = [
          /\$ $/, // Simple: "$ "
          /.*\$ $/, // With path: "~/Desktop $ "
          /> $/, // PowerShell: "> "
          /# $/ // Root: "# "
        ]

        const hasPrompt = promptPatterns.some((pattern) =>
          pattern.test(newOutput)
        )
        const timedOut = Date.now() - startTime > timeout

        if (hasPrompt || timedOut) {
          clearInterval(checkInterval)
          resolve({
            success: true,
            command,
            output: newOutput,
            executionTime: Date.now() - startTime,
            timedOut
          })
        }
      }, 50)
    })
  }

  sendInput(input) {
    this.terminal.write(input)
  }

  async interrupt() {
    // Send Ctrl+C to interrupt current process
    this.terminal.write("\x03")
  }

  async sendInteractiveInput(input) {
    // For responding to prompts like passwords, confirmations, etc.
    this.terminal.write(input + "\r")
  }

  getOutput() {
    return this.output
  }

  clearOutput() {
    this.output = ""
  }

  resize(cols, rows) {
    this.terminal.resize(cols, rows)
  }

  destroy() {
    if (this.terminal) {
      this.terminal.kill()
    }
  }
}
