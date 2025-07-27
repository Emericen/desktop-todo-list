/**
 * Event Bus - Centralized event system for application-wide communication
 * Provides clean separation between components and services
 */
class EventBus {
  constructor() {
    this.events = new Map()
    this.debugMode = process.env.NODE_ENV === 'development'
  }

  /**
   * Emit an event to all registered listeners
   * @param {string} event - Event name
   * @param {any} data - Event data
   */
  emit(event, data) {
    if (this.debugMode) {
      console.log(`[EventBus] Emitting: ${event}`, data)
    }

    const listeners = this.events.get(event)
    if (listeners) {
      // Create a copy to avoid issues if listeners are modified during iteration
      const listenersCopy = [...listeners]
      listenersCopy.forEach(callback => {
        try {
          callback(data)
        } catch (error) {
          console.error(`[EventBus] Error in listener for ${event}:`, error)
        }
      })
    }
  }

  /**
   * Register a listener for an event
   * @param {string} event - Event name
   * @param {Function} callback - Callback function
   * @returns {Function} Cleanup function
   */
  on(event, callback) {
    if (typeof callback !== 'function') {
      throw new Error('Callback must be a function')
    }

    if (this.debugMode) {
      console.log(`[EventBus] Registering listener for: ${event}`)
    }

    if (!this.events.has(event)) {
      this.events.set(event, new Set())
    }

    this.events.get(event).add(callback)

    // Return cleanup function
    return () => this.off(event, callback)
  }

  /**
   * Remove a listener for an event
   * @param {string} event - Event name
   * @param {Function} callback - Callback function to remove
   */
  off(event, callback) {
    const listeners = this.events.get(event)
    if (listeners) {
      listeners.delete(callback)
      
      if (this.debugMode) {
        console.log(`[EventBus] Removed listener for: ${event}`)
      }

      // Clean up empty event sets
      if (listeners.size === 0) {
        this.events.delete(event)
      }
    }
  }

  /**
   * Remove all listeners for an event
   * @param {string} event - Event name
   */
  removeAllListeners(event) {
    if (this.events.has(event)) {
      this.events.delete(event)
      
      if (this.debugMode) {
        console.log(`[EventBus] Removed all listeners for: ${event}`)
      }
    }
  }

  /**
   * Get all registered events (useful for debugging)
   * @returns {Array<string>} Array of event names
   */
  getRegisteredEvents() {
    return Array.from(this.events.keys())
  }

  /**
   * Get listener count for an event
   * @param {string} event - Event name
   * @returns {number} Number of listeners
   */
  getListenerCount(event) {
    const listeners = this.events.get(event)
    return listeners ? listeners.size : 0
  }

  /**
   * Create a one-time listener that automatically removes itself after first call
   * @param {string} event - Event name
   * @param {Function} callback - Callback function
   * @returns {Function} Cleanup function
   */
  once(event, callback) {
    const onceWrapper = (data) => {
      callback(data)
      this.off(event, onceWrapper)
    }

    return this.on(event, onceWrapper)
  }

  /**
   * Wait for an event to be emitted (returns a Promise)
   * @param {string} event - Event name
   * @param {number} timeout - Optional timeout in milliseconds
   * @returns {Promise} Promise that resolves with event data
   */
  waitFor(event, timeout = 5000) {
    return new Promise((resolve, reject) => {
      let timeoutId = null
      
      const cleanup = this.once(event, (data) => {
        if (timeoutId) clearTimeout(timeoutId)
        resolve(data)
      })

      if (timeout > 0) {
        timeoutId = setTimeout(() => {
          cleanup()
          reject(new Error(`Timeout waiting for event: ${event}`))
        }, timeout)
      }
    })
  }
}

// Export singleton instance
export const eventBus = new EventBus()
export default eventBus