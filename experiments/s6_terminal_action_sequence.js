import { spawn } from "child_process"

class Terminal {
  constructor() {
    this.terminal = null

    const platform = process.platform

    // Determine shell and args based on platform
    let shell, args
    if (platform === "win32") {
      shell = "powershell"
      args = ["-NoExit", "-Command", "-"]
    } else {
      shell = "bash"
      args = ["-i"] // Interactive mode
    }

    try {
      this.terminal = spawn(shell, args, {
        stdio: ["pipe", "pipe", "pipe"], // stdin, stdout, stderr
        shell: false
      })

      // Set up event handlers
      this.terminal.on("error", (error) => {
        console.error("Terminal spawn error:", error)
      })

      this.terminal.on("close", (code) => {
        console.log(`Terminal process exited with code ${code}`)
        this.terminal = null
      })

      console.log(`Terminal initialized: ${shell} (PID: ${this.terminal.pid})`)
    } catch (error) {
      console.error("Failed to initialize terminal:", error)
    }
  }

  async execute(command) {
    return new Promise((resolve, reject) => {
      if (!this.terminal) {
        reject(new Error("Terminal not initialized"))
        return
      }

      let output = ""
      let errorOutput = ""
      let resolved = false

      // Set up temporary listeners for this command
      const onData = (data) => {
        output += data.toString()
      }

      const onError = (data) => {
        errorOutput += data.toString()
      }

      const cleanup = () => {
        if (resolved) return // Prevent double cleanup
        resolved = true

        this.terminal.stdout.removeListener("data", onData)
        this.terminal.stderr.removeListener("data", onError)
        clearTimeout(timeoutId)

        // Filter out harmless stderr (shell prompts, etc.)
        const cleanStderr = errorOutput
          .trim()
          .replace(/bash-\d+\.\d+\$/g, "") // Remove bash prompts
          .replace(/\u001b\[\?1034h/g, "") // Remove terminal control sequences
          .replace(/bash: no job control in this shell/g, "") // Remove job control warning
          .replace(/The default interactive shell is now zsh\./g, "") // Remove zsh message
          .replace(
            /To update your account to use zsh, please run `chsh -s \/bin\/zsh`\./g,
            ""
          ) // Remove zsh instruction
          .replace(
            /For more details, please visit https:\/\/support\.apple\.com\/kb\/HT208050\./g,
            ""
          ) // Remove Apple support link
          .trim()

        resolve({
          success: cleanStderr.length === 0,
          stdout: output.trim(),
          stderr: errorOutput.trim(),
          combined: output.trim() || errorOutput.trim() || "Command executed"
        })
      }

      this.terminal.stdout.on("data", onData)
      this.terminal.stderr.on("data", onError)

      // Send command
      this.terminal.stdin.write(command + "\n")

      // Use a reasonable timeout - most commands finish quickly
      const timeoutId = setTimeout(() => {
        cleanup()
      }, 800) // 800ms should be plenty for most commands
    })
  }

  destroy() {
    if (this.terminal) {
      console.log("Closing terminal...")
      this.terminal.kill("SIGTERM")
      this.terminal = null
    }
  }
}

// // Run the tests
// runTests().catch(console.error)

const terminal = new Terminal()
console.log(`>>> open -a "Google Chrome"`)
console.log(`${JSON.stringify(await terminal.execute("open -a 'Google Chrome'"), null, 2)}`)
// console.log(`>>> cd ..`)
// console.log(`${JSON.stringify(await terminal.execute("cd .."), null, 2)}`)
// console.log(`>>> ls -la`)
// console.log(`${JSON.stringify(await terminal.execute("ls -la"), null, 2)}`)
// console.log(`>>> pwd`)
// console.log(`${JSON.stringify(await terminal.execute("pwd"), null, 2)}`)
// console.log(`>>> cd ~/desktop`)
// console.log(
//   `${JSON.stringify(await terminal.execute("cd ~/desktop"), null, 2)}`
// )
// console.log(`>>> ls -la`)
// console.log(`${JSON.stringify(await terminal.execute("ls -la"), null, 2)}`)

console.log("-------- COMMAND SEQUENCE COMPLETED --------")

// Properly clean up the terminal process
terminal.destroy()
console.log("✅ Script finished!")

// Force exit if still hanging (shouldn't be needed now)
setTimeout(() => {
  console.log("Force exiting...")
  process.exit(0)
}, 1000)
