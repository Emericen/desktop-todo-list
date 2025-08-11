export default class Backend {
  constructor() {
    // Environment-based URL configuration
    this.baseUrl = process.env.NODE_ENV === 'production' 
      ? 'https://your-app.onrender.com'  // TODO: Update when deployed
      : 'http://localhost:8000'
    
    this.wsUrl = this.baseUrl.replace(/^http/, 'ws') + '/agent/ws'
    
    this.connection = null
    this.connected = false
    this.messageHandlers = new Map()
    this.reconnectAttempts = 0
    this.maxReconnectAttempts = 5
    this.reconnectDelay = 1000
  }

  async connect() {
    return new Promise((resolve, reject) => {
      if (this.connected) {
        resolve()
        return
      }

      console.log("Connecting to WebSocket:", this.wsUrl)
      this.connection = new WebSocket(this.wsUrl)

      this.connection.onopen = () => {
        console.log("WebSocket connected")
        this.connected = true
        this.reconnectAttempts = 0
        resolve()
      }

      this.connection.onclose = () => {
        console.log("WebSocket connection closed")
        this.connected = false
        this._handleReconnect()
      }

      this.connection.onerror = (error) => {
        console.error("WebSocket error:", error)
        reject(error)
      }

      this.connection.onmessage = (event) => {
        this._handleMessage(event)
      }
    })
  }

  disconnect() {
    if (this.connection) {
      this.connection.close()
      this.connection = null
      this.connected = false
    }
    this.messageHandlers.clear()
  }

  send(message) {
    if (!this.connected || !this.connection) {
      throw new Error("WebSocket not connected")
    }
    
    this.connection.send(JSON.stringify(message))
  }

  onMessage(type, handler) {
    if (!this.messageHandlers.has(type)) {
      this.messageHandlers.set(type, [])
    }
    this.messageHandlers.get(type).push(handler)
  }

  removeHandler(type, handler) {
    if (this.messageHandlers.has(type)) {
      const handlers = this.messageHandlers.get(type)
      const index = handlers.indexOf(handler)
      if (index > -1) {
        handlers.splice(index, 1)
      }
      if (handlers.length === 0) {
        this.messageHandlers.delete(type)
      }
    }
  }

  _handleMessage(event) {
    try {
      const message = JSON.parse(event.data)
      const { type } = message

      // Handle connection status messages
      if (type === "status" && message.status === "connected") {
        console.log("Backend connection established")
        return
      }

      // Call registered handlers for this message type
      if (this.messageHandlers.has(type)) {
        const handlers = this.messageHandlers.get(type)
        handlers.forEach(handler => {
          try {
            handler(message)
          } catch (error) {
            console.error(`Error in message handler for type ${type}:`, error)
          }
        })
      } else {
        console.warn("No handler registered for message type:", type)
      }
    } catch (error) {
      console.error("Error parsing WebSocket message:", error)
    }
  }

  async _handleReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error("Max reconnection attempts reached")
      return
    }

    this.reconnectAttempts++
    console.log(`Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts})`)

    setTimeout(async () => {
      try {
        await this.connect()
      } catch (error) {
        console.error("Reconnection failed:", error)
      }
    }, this.reconnectDelay * this.reconnectAttempts)
  }

  /**
   * Make HTTP requests to backend API
   */
  async httpRequest(endpoint, options = {}) {
    const url = `${this.baseUrl}${endpoint}`
    
    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          ...options.headers
        }
      })
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }
      
      return response
    } catch (error) {
      console.error(`HTTP request failed for ${endpoint}:`, error)
      throw error
    }
  }

  /**
   * Transcribe audio using backend API
   */
  async transcribeAudio(audioBuffer, filename = "audio.webm") {
    try {
      // Create form data for backend API
      const formData = new FormData()
      const audioBlob = new Blob([audioBuffer], {
        type: filename?.includes(".webm") ? "audio/webm" : "audio/wav"
      })
      formData.append("file", audioBlob, filename)
      
      // Call backend transcription endpoint
      const response = await fetch(`${this.baseUrl}/voice/transcribe`, {
        method: "POST",
        body: formData // Don't set Content-Type header, let browser set it with boundary
      })
      
      if (!response.ok) {
        throw new Error(`Transcription API error: ${response.status}`)
      }
      
      const result = await response.json()
      return result
      
    } catch (error) {
      console.error("Transcription error:", error)
      return { success: false, error: error.message }
    }
  }
}