import dotenv from "dotenv"
import { createClient } from "@supabase/supabase-js"
import keytar from "keytar"

dotenv.config()

export default class AuthClient {
  constructor() {
    this.supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    )

    // Keytar service label
    this.KEYTAR_SERVICE = "assistant-ui-auth"

    // in-memory state for the lightweight wizard
    this.stage = "start" // start, email, otp

    // signed-in state
    this.email = null
    this.session = null
    this.user = null
  }

  /**
   * Attempt to restore a previously saved session from the OS keychain.
   * Call this once on app startup.
   */
  async loadStoredSession() {
    try {
      const storedJson = await keytar.getPassword(this.KEYTAR_SERVICE, "session")
      if (storedJson) {
        const parsed = JSON.parse(storedJson)
        if (parsed.session && parsed.user) {
          this.session = parsed.session
          this.user = parsed.user
          // Set session in supabase so it can refresh automatically
          const { error } = await this.supabase.auth.setSession({
            access_token: this.session.access_token,
            refresh_token: this.session.refresh_token
          })
          if (error) {
            console.error("Failed to restore session:", error)
            await keytar.deletePassword(this.KEYTAR_SERVICE, "session")
            this.reset()
          }
        }
      }
    } catch (err) {
      console.error("loadStoredSession error", err)
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
    let email = null
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
        const { data, error } = await this.supabase.auth.signInWithOtp({
          email: this.email,
          options: { shouldCreateUser: true }
        })
        console.log("data", data)
        console.log("error", error)
        if (error) {
          pushEvent({
            type: "text",
            content: `Invalid email! Please enter anything and try again.`
          })
          this.reset()
          return true
        } else {
          pushEvent({
            type: "text",
            content: "Please enter the 6-digit code sent to your email?"
          })
          this.nextStage()
          return true
        }
      case "otp":
        otp = query.trim()
        try {
          console.log("email", this.email)
          console.log("otp", otp)
          const { data } = await this.supabase.auth.verifyOtp({
            email: this.email,
            token: otp,
            type: "email"
          })
          console.log("data", data)
          if (data.user && data.session) {
            this.user = data.user
            this.session = data.session

            // Persist session for next launch
            try {
              await keytar.setPassword(
                this.KEYTAR_SERVICE,
                "session",
                JSON.stringify({ session: this.session, user: this.user })
              )
            } catch (err) {
              console.error("Failed to save session:", err)
            }

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
   * Explicit logout – clears memory and keychain entry.
   */
  async logout() {
    await this.supabase.auth.signOut()
    await keytar.deletePassword(this.KEYTAR_SERVICE, "session")
    this.reset()
  }
}
