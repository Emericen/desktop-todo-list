import { eventBus } from './eventBus.js'

/**
 * Centralized API service that wraps all window.api calls
 * Provides error handling, logging, and consistent interface
 * Now emits events for better decoupling
 */
class ApiService {
  constructor() {
    this.isAvailable = typeof window !== 'undefined' && window.api
    if (!this.isAvailable) {
      console.warn('window.api not available - running outside Electron context')
    }
  }

  /**
   * Send a query to the backend with streaming support
   * @param {Object} payload - Query payload with query string and other options
   * @param {Function} onStreamEvent - Callback for streaming events
   * @returns {Promise} Query result
   */
  async sendQuery(payload, onStreamEvent) {
    if (!this.isAvailable) {
      const error = new Error('API not available')
      eventBus.emit('query:error', { error, payload })
      throw error
    }

    try {
      console.log('API: Sending query', payload)
      eventBus.emit('query:start', payload)
      
      const result = await window.api.sendQuery(payload, (streamData) => {
        eventBus.emit('query:stream', streamData)
        if (onStreamEvent) onStreamEvent(streamData)
      })
      
      console.log('API: Query completed', result)
      eventBus.emit('query:complete', { result, payload })
      return result
    } catch (error) {
      console.error('API: Query failed', error)
      const enhancedError = new Error(`Query failed: ${error.message}`)
      eventBus.emit('query:error', { error: enhancedError, payload })
      throw enhancedError
    }
  }

  /**
   * Transcribe audio using OpenAI Whisper
   * @param {Object} payload - Audio data and options
   * @returns {Promise} Transcription result
   */
  async transcribeAudio(payload) {
    if (!this.isAvailable) {
      const error = new Error('API not available')
      eventBus.emit('transcription:error', { error, payload })
      throw error
    }

    try {
      console.log('API: Starting transcription')
      eventBus.emit('transcription:start', payload)
      
      const result = await window.api.transcribeAudio(payload)
      
      console.log('API: Transcription completed')
      eventBus.emit('transcription:complete', { result, payload })
      return result
    } catch (error) {
      console.error('API: Transcription failed', error)
      const enhancedError = new Error(`Transcription failed: ${error.message}`)
      eventBus.emit('transcription:error', { error: enhancedError, payload })
      throw enhancedError
    }
  }

  /**
   * Handle user confirmation for action prompts
   * @param {boolean} confirmed - User's confirmation choice
   * @returns {Promise} Confirmation result
   */
  async handleConfirmation(confirmed) {
    if (!this.isAvailable) {
      const error = new Error('API not available')
      eventBus.emit('confirmation:error', { error, confirmed })
      throw error
    }

    try {
      console.log('API: Sending confirmation', confirmed)
      eventBus.emit('confirmation:start', { confirmed })
      
      const result = await window.api.handleConfirmation(confirmed)
      
      console.log('API: Confirmation sent')
      eventBus.emit('confirmation:complete', { result, confirmed })
      return result
    } catch (error) {
      console.error('API: Confirmation failed', error)
      const enhancedError = new Error(`Confirmation failed: ${error.message}`)
      eventBus.emit('confirmation:error', { error: enhancedError, confirmed })
      throw enhancedError
    }
  }

  /**
   * Clear agent messages/conversation
   * @returns {Promise} Clear result
   */
  async clearAgentMessages() {
    if (!this.isAvailable) {
      const error = new Error('API not available')
      eventBus.emit('clear:error', { error })
      throw error
    }

    try {
      console.log('API: Clearing messages')
      eventBus.emit('clear:start', {})
      
      const result = await window.api.clearAgentMessages()
      
      console.log('API: Messages cleared')
      eventBus.emit('clear:complete', { result })
      return result
    } catch (error) {
      console.error('API: Clear messages failed', error)
      const enhancedError = new Error(`Clear messages failed: ${error.message}`)
      eventBus.emit('clear:error', { error: enhancedError })
      throw enhancedError
    }
  }

  /**
   * Register event listeners for backend push events
   * @param {Function} callback - Callback for push events
   * @returns {Function} Cleanup function
   */
  onPush(callback) {
    if (!this.isAvailable) {
      console.warn('API not available - push events will not work')
      eventBus.emit('push:unavailable', {})
      return () => {}
    }

    console.log('API: Registering push event listener')
    eventBus.emit('push:register', {})
    
    window.api.onPush((data) => {
      eventBus.emit('push:received', data)
      if (callback) callback(data)
    })
    
    // Return cleanup function (note: current preload doesn't support removing listeners)
    return () => {
      console.log('API: Push event listener cleanup requested')
      eventBus.emit('push:cleanup', {})
      // TODO: Add removeListener support to preload if needed
    }
  }

  /**
   * Register listener for focus query input events
   * @param {Function} callback - Callback for focus events
   * @returns {Function} Cleanup function
   */
  onFocusQueryInput(callback) {
    if (!this.isAvailable) {
      console.warn('API not available - focus events will not work')
      eventBus.emit('focus:unavailable', {})
      return () => {}
    }

    console.log('API: Registering focus query input listener')
    eventBus.emit('focus:register', {})
    
    window.api.onFocusQueryInput(() => {
      eventBus.emit('focus:query-input', {})
      if (callback) callback()
    })
    
    return () => {
      console.log('API: Focus query input listener cleanup requested')
      eventBus.emit('focus:cleanup', {})
      // TODO: Add removeListener support to preload if needed
    }
  }

  /**
   * Register listener for clear messages events
   * @param {Function} callback - Callback for clear events
   * @returns {Function} Cleanup function
   */
  onClearMessages(callback) {
    if (!this.isAvailable) {
      console.warn('API not available - clear events will not work')
      eventBus.emit('clear-listener:unavailable', {})
      return () => {}
    }

    console.log('API: Registering clear messages listener')
    eventBus.emit('clear-listener:register', {})
    
    window.api.onClearMessages(() => {
      eventBus.emit('clear-listener:triggered', {})
      if (callback) callback()
    })
    
    return () => {
      console.log('API: Clear messages listener cleanup requested')
      eventBus.emit('clear-listener:cleanup', {})
      // TODO: Add removeListener support to preload if needed
    }
  }
}

// Export singleton instance
export const apiService = new ApiService()
export default apiService