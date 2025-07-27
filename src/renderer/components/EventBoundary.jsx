import React from "react"
import { eventBus } from "../services/eventBus.js"

/**
 * Error Boundary component for catching and handling React errors
 * Integrates with the event bus to emit error events
 */
class EventBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null, errorInfo: null }
  }

  static getDerivedStateFromError(error) {
    // Update state so the next render will show the fallback UI
    return { hasError: true }
  }

  componentDidCatch(error, errorInfo) {
    // Log error details
    console.error('EventBoundary caught an error:', error, errorInfo)
    
    // Update state with error details
    this.setState({
      error: error,
      errorInfo: errorInfo
    })

    // Emit error event to the event bus
    eventBus.emit('ui:error', {
      error: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      timestamp: new Date().toISOString(),
      props: this.props
    })

    // Optional: send error to logging service
    if (process.env.NODE_ENV === 'production') {
      // Could send to error tracking service like Sentry
      console.log('Would send error to logging service:', error)
    }
  }

  render() {
    if (this.state.hasError) {
      // Custom fallback UI
      const { fallback: FallbackComponent } = this.props
      
      if (FallbackComponent) {
        return (
          <FallbackComponent 
            error={this.state.error}
            errorInfo={this.state.errorInfo}
            resetError={() => this.setState({ hasError: false, error: null, errorInfo: null })}
          />
        )
      }

      // Default fallback UI
      return (
        <div className="flex flex-col items-center justify-center p-6 border border-red-200 rounded-lg bg-red-50">
          <h2 className="text-lg font-semibold text-red-800 mb-2">
            Something went wrong
          </h2>
          <p className="text-red-600 mb-4 text-center">
            {this.state.error?.message || 'An unexpected error occurred'}
          </p>
          <button
            onClick={() => this.setState({ hasError: false, error: null, errorInfo: null })}
            className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
          >
            Try Again
          </button>
          {process.env.NODE_ENV === 'development' && (
            <details className="mt-4 text-sm">
              <summary className="cursor-pointer text-red-700 font-medium">
                Error Details (Development)
              </summary>
              <pre className="mt-2 p-2 bg-red-100 rounded text-xs overflow-auto max-h-40">
                {this.state.error?.stack}
                {this.state.errorInfo?.componentStack}
              </pre>
            </details>
          )}
        </div>
      )
    }

    return this.props.children
  }
}

/**
 * Hook for listening to UI errors from the event bus
 * Useful for global error handling, logging, or notifications
 */
export const useErrorHandler = () => {
  const [errors, setErrors] = React.useState([])

  React.useEffect(() => {
    const cleanup = eventBus.on('ui:error', (errorData) => {
      setErrors(prev => [...prev.slice(-9), errorData]) // Keep last 10 errors
      
      // Optional: Show notification or toast
      console.warn('UI Error detected:', errorData)
    })

    return cleanup
  }, [])

  const clearErrors = React.useCallback(() => {
    setErrors([])
  }, [])

  return {
    errors,
    clearErrors,
    hasErrors: errors.length > 0
  }
}

export default EventBoundary