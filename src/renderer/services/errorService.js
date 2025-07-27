import { eventBus } from './eventBus.js'

/**
 * Error Service - Centralized error handling and reporting
 * Integrates with the event bus for application-wide error management
 */
class ErrorService {
  constructor() {
    this.errors = []
    this.maxErrors = 100
    this.setupGlobalErrorHandlers()
    this.setupEventBusErrorHandling()
  }

  /**
   * Set up global error handlers for unhandled errors
   */
  setupGlobalErrorHandlers() {
    // Handle unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
      this.handleError({
        type: 'unhandledRejection',
        error: event.reason,
        timestamp: new Date().toISOString(),
        url: window.location.href
      })
      
      // Prevent the default behavior (console error)
      event.preventDefault()
    })

    // Handle global JavaScript errors
    window.addEventListener('error', (event) => {
      this.handleError({
        type: 'globalError',
        error: event.error,
        message: event.message,
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
        timestamp: new Date().toISOString(),
        url: window.location.href
      })
    })
  }

  /**
   * Set up error handling for event bus events
   */
  setupEventBusErrorHandling() {
    // Listen to all error events from the event bus
    const errorEvents = [
      'query:error',
      'transcription:error', 
      'confirmation:error',
      'clear:error',
      'ui:error'
    ]

    errorEvents.forEach(eventName => {
      eventBus.on(eventName, (errorData) => {
        this.handleError({
          type: eventName,
          ...errorData,
          timestamp: new Date().toISOString()
        })
      })
    })
  }

  /**
   * Handle an error - log it, store it, and optionally report it
   * @param {Object} errorData - Error information
   */
  handleError(errorData) {
    // Add to error log
    this.errors.unshift(errorData)
    
    // Keep only the most recent errors
    if (this.errors.length > this.maxErrors) {
      this.errors = this.errors.slice(0, this.maxErrors)
    }

    // Log to console
    console.error(`[ErrorService] ${errorData.type}:`, errorData)

    // Emit error event for other parts of the app to listen to
    eventBus.emit('error:handled', errorData)

    // In production, could send to error tracking service
    if (process.env.NODE_ENV === 'production') {
      this.reportError(errorData)
    }
  }

  /**
   * Report error to external service (placeholder)
   * @param {Object} errorData - Error information
   */
  reportError(errorData) {
    // Placeholder for error reporting service integration
    // Could send to Sentry, LogRocket, or other error tracking services
    console.log('Would report error to external service:', errorData)
  }

  /**
   * Get recent errors
   * @param {number} limit - Number of errors to return
   * @returns {Array} Recent errors
   */
  getRecentErrors(limit = 10) {
    return this.errors.slice(0, limit)
  }

  /**
   * Get errors by type
   * @param {string} type - Error type to filter by
   * @returns {Array} Filtered errors
   */
  getErrorsByType(type) {
    return this.errors.filter(error => error.type === type)
  }

  /**
   * Clear all stored errors
   */
  clearErrors() {
    this.errors = []
    eventBus.emit('error:cleared', {})
  }

  /**
   * Get error statistics
   * @returns {Object} Error statistics
   */
  getErrorStats() {
    const stats = {}
    this.errors.forEach(error => {
      stats[error.type] = (stats[error.type] || 0) + 1
    })
    
    return {
      total: this.errors.length,
      byType: stats,
      recent: this.errors.slice(0, 5).map(e => ({
        type: e.type,
        message: e.error?.message || e.message,
        timestamp: e.timestamp
      }))
    }
  }

  /**
   * Create a function that safely executes async operations with error handling
   * @param {Function} asyncFn - Async function to execute
   * @param {string} context - Context for error reporting
   * @returns {Function} Wrapped function
   */
  withErrorHandling(asyncFn, context = 'unknown') {
    return async (...args) => {
      try {
        return await asyncFn(...args)
      } catch (error) {
        this.handleError({
          type: 'wrappedFunction',
          error: error,
          context: context,
          args: args,
          timestamp: new Date().toISOString()
        })
        throw error // Re-throw so calling code can handle if needed
      }
    }
  }
}

// Export singleton instance
export const errorService = new ErrorService()
export default errorService