import fs from "fs"
import path from "path"
import { app } from "electron"

export default class AuthClient {
  constructor(backend) {
    this.backend = backend

    // Session storage file path (unencrypted JSON)
    this.STORAGE_FILE = path.join(app.getPath("userData"), "session.json")

    // in-memory state for the lightweight wizard
    this.stage = "start" // start, email, otp

    // signed-in state
    this.email = null
    this.session = null
    this.user = null
  }

  /**
   * Attempt to restore a previously saved session from local storage.
   * Call this once on app startup.
   */
  async loadStoredSession() {
    try {
      if (fs.existsSync(this.STORAGE_FILE)) {
        const storedData = fs.readFileSync(this.STORAGE_FILE, "utf8")

        if (storedData) {
          const parsed = JSON.parse(storedData)
          if (parsed.access_token && parsed.user) {
            // Validate token with backend
            const response = await fetch(
              `${this.backend.baseUrl}/user/profile`,
              {
                method: "GET",
                headers: {
                  Authorization: `Bearer ${parsed.access_token}`,
                  "Content-Type": "application/json"
                }
              }
            )

            if (response.ok) {
              const data = await response.json()
              if (data.success) {
                this.session = { access_token: parsed.access_token }
                this.user = data.user
                console.log("Session restored successfully")
              } else {
                this.clearStoredSession()
                this.reset()
              }
            } else {
              console.log(
                "Stored session expired, user needs to re-authenticate"
              )
              this.clearStoredSession()
              this.reset()
            }
          }
        }
      }
    } catch (err) {
      console.error("loadStoredSession error", err)
    }
  }

  /**
   * Clear stored session data
   */
  clearStoredSession() {
    try {
      if (fs.existsSync(this.STORAGE_FILE)) {
        fs.unlinkSync(this.STORAGE_FILE)
      }
    } catch (err) {
      console.error("Failed to clear stored session:", err)
    }
  }

  /**
   * Save session data to local storage
   */
  async saveSession(access_token, user) {
    try {
      const sessionData = JSON.stringify({ access_token, user }, null, 2)
      fs.writeFileSync(this.STORAGE_FILE, sessionData, "utf8")
    } catch (err) {
      console.error("Failed to save session:", err)
    }
  }

  /* ------------  Public helpers  ------------ */
  isAuthenticated() {
    return Boolean(this.session && this.session.access_token)
  }

  getSession() {
    return this.session
  }

  getUser() {
    return this.user
  }

  /**
   * Main entry; returns true if the query was consumed by the auth flow.
   */
  async handle(query, pushEvent) {
    let otp = null
    switch (this.stage) {
      case "start":
        pushEvent({
          type: "text",
          content: "Please sign in. Enter your email to continue."
        })
        this.nextStage()
        return true
      case "email":
        this.email = query.trim()
        try {
          const response = await fetch(
            `${this.backend.baseUrl}/user/send-otp`,
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json"
              },
              body: JSON.stringify({ email: this.email })
            }
          )

          const data = await response.json()

          if (response.ok && data.success) {
            pushEvent({
              type: "text",
              content: "Please enter the 6-digit code sent to your email?"
            })
            this.nextStage()
            return true
          } else {
            pushEvent({
              type: "text",
              content: `Invalid email! Please enter anything and try again.`
            })
            this.reset()
            return true
          }
        } catch (error) {
          console.error("Send OTP error:", error)
          pushEvent({
            type: "text",
            content: `Network error! Please try again.`
          })
          this.reset()
          return true
        }
      case "otp":
        otp = query.trim()
        try {
          console.log("email", this.email)
          console.log("otp", otp)

          const response = await fetch(
            `${this.backend.baseUrl}/user/verify-otp`,
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json"
              },
              body: JSON.stringify({
                email: this.email,
                otp: otp
              })
            }
          )

          const data = await response.json()

          if (response.ok && data.success) {
            this.user = data.user
            this.session = { access_token: data.access_token }

            // Persist session for next launch
            await this.saveSession(data.access_token, this.user)

            pushEvent({
              type: "text",
              content: "Auth successful! Hello, " + this.user.email + "!"
            })
          } else {
            // Invalid OTP – reset wizard so user can start over
            pushEvent({
              type: "text",
              content: "Invalid OTP! Please enter anything and try again."
            })
            this.reset()
          }
        } catch (error) {
          console.error("Verify OTP error:", error)
          pushEvent({ type: "text", content: `Error: ${error.message}` })
          this.reset()
        }
        return true
      default:
        return false
    }
  }

  nextStage() {
    switch (this.stage) {
      case "start":
        this.stage = "email"
        break
      case "email":
        this.stage = "otp"
        break
      default:
        break
    }
  }

  reset() {
    this.stage = "start"
    this.email = null
    this.session = null
    this.user = null
  }

  /**
   * Explicit logout – clears memory and stored session.
   */
  async logout() {
    try {
      if (this.session && this.session.access_token) {
        await fetch(`${this.backend.baseUrl}/user/logout`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.session.access_token}`,
            'Content-Type': 'application/json'
          }
        })
      }
    } catch (error) {
      console.error("Logout API call failed:", error)
    }
    
    this.clearStoredSession()
    this.reset()
  }
}
