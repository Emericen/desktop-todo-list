import { useEffect, useState } from "react"
import { eventBus } from "../services/eventBus.js"

/**
 * Custom hook that demonstrates the event bus pattern
 * Listens to query-related events and provides UI state
 */
export const useQueryEvents = () => {
  const [queryState, setQueryState] = useState({
    isLoading: false,
    lastQuery: null,
    error: null,
    streamData: null
  })

  useEffect(() => {
    // Listen to query events
    const cleanupStart = eventBus.on('query:start', (payload) => {
      setQueryState(prev => ({
        ...prev,
        isLoading: true,
        lastQuery: payload,
        error: null,
        streamData: null
      }))
    })

    const cleanupStream = eventBus.on('query:stream', (data) => {
      setQueryState(prev => ({
        ...prev,
        streamData: data
      }))
    })

    const cleanupComplete = eventBus.on('query:complete', ({ result, payload }) => {
      setQueryState(prev => ({
        ...prev,
        isLoading: false,
        streamData: null
      }))
    })

    const cleanupError = eventBus.on('query:error', ({ error, payload }) => {
      setQueryState(prev => ({
        ...prev,
        isLoading: false,
        error: error.message,
        streamData: null
      }))
    })

    // Cleanup all listeners when hook unmounts
    return () => {
      cleanupStart()
      cleanupStream()
      cleanupComplete()
      cleanupError()
    }
  }, [])

  return queryState
}

/**
 * Hook for listening to transcription events
 */
export const useTranscriptionEvents = () => {
  const [transcriptionState, setTranscriptionState] = useState({
    isTranscribing: false,
    error: null,
    lastResult: null
  })

  useEffect(() => {
    const cleanupStart = eventBus.on('transcription:start', () => {
      setTranscriptionState(prev => ({
        ...prev,
        isTranscribing: true,
        error: null
      }))
    })

    const cleanupComplete = eventBus.on('transcription:complete', ({ result }) => {
      setTranscriptionState(prev => ({
        ...prev,
        isTranscribing: false,
        lastResult: result
      }))
    })

    const cleanupError = eventBus.on('transcription:error', ({ error }) => {
      setTranscriptionState(prev => ({
        ...prev,
        isTranscribing: false,
        error: error.message
      }))
    })

    return () => {
      cleanupStart()
      cleanupComplete()
      cleanupError()
    }
  }, [])

  return transcriptionState
}

/**
 * Hook for listening to all API events (useful for debugging/logging)
 */
export const useApiEvents = () => {
  const [eventLog, setEventLog] = useState([])

  useEffect(() => {
    // List of events to track
    const eventsToTrack = [
      'query:start', 'query:stream', 'query:complete', 'query:error',
      'transcription:start', 'transcription:complete', 'transcription:error',
      'confirmation:start', 'confirmation:complete', 'confirmation:error',
      'clear:start', 'clear:complete', 'clear:error',
      'push:received', 'focus:query-input', 'clear-listener:triggered'
    ]

    const cleanupFunctions = eventsToTrack.map(eventName => {
      return eventBus.on(eventName, (data) => {
        const logEntry = {
          timestamp: new Date().toISOString(),
          event: eventName,
          data: data
        }
        
        setEventLog(prev => [...prev.slice(-49), logEntry]) // Keep last 50 events
        
        // Log to console in development
        if (process.env.NODE_ENV === 'development') {
          console.log(`[Event] ${eventName}:`, data)
        }
      })
    })

    return () => {
      cleanupFunctions.forEach(cleanup => cleanup())
    }
  }, [])

  return {
    eventLog,
    clearLog: () => setEventLog([])
  }
}

export default useQueryEvents