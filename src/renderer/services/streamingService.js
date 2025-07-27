import { apiService } from './apiService.js'
import { MessageService } from './messageService.js'

/**
 * Streaming Service - Handles query submission and streaming response processing
 * Extracted from the complex submitQuery logic in useStore.js
 */
export class StreamingService {
  /**
   * Submit a query and handle streaming responses
   * @param {string} rawQuery - The user's query
   * @param {string} selectedModel - Selected AI model
   * @param {Function} addMessage - Function to add message to store
   * @param {Function} updateMessages - Function to update messages in store
   * @param {Array} currentMessages - Current messages array
   * @returns {Promise} Query completion promise
   */
  static async submitQuery(rawQuery, selectedModel, addMessage, updateMessages, currentMessages) {
    const query = rawQuery.trim()
    if (!query) return

    // Add user message to state first
    const userMessage = MessageService.createUserMessage(query)
    addMessage(userMessage)

    // Add loading message that we'll replace with actual content
    const loadingMessage = MessageService.createLoadingMessage()
    addMessage(loadingMessage)

    try {
      // Get the index of the loading message we just added
      let messageIndex = currentMessages().length - 1
      let isFirstEvent = true

      // Send streaming query with event handler
      await apiService.sendQuery(
        {
          query: query,
          selectedModel: selectedModel
        },
        (eventData) => {
          // Process the streaming event
          const result = MessageService.processStreamEvent(
            currentMessages(),
            eventData,
            messageIndex,
            isFirstEvent
          )

          // Update the store with processed messages
          updateMessages(result.updatedMessages)
          
          // Update tracking variables
          messageIndex = result.newMessageIndex
          isFirstEvent = result.isFirstEvent
        }
      )
    } catch (error) {
      console.error("Streaming error:", error)

      // Update the loading message with error
      const messages = currentMessages()
      const errorMessage = MessageService.createErrorMessage(error)
      const updatedMessages = [...messages]
      const errorMessageIndex = updatedMessages.length - 1
      updatedMessages[errorMessageIndex] = errorMessage
      updateMessages(updatedMessages)
    }
  }

  /**
   * Handle confirmation response (approve/reject)
   * @param {number} index - Message index
   * @param {string} choice - User choice ('approved' or 'rejected')
   * @param {Function} updateMessages - Function to update messages
   * @param {Function} setAwaitingUserResponse - Function to set awaiting response state
   * @param {Array} currentMessages - Current messages array
   */
  static async handleConfirmation(index, choice, updateMessages, setAwaitingUserResponse, currentMessages) {
    try {
      // Update the message state
      const updatedMessages = MessageService.updateConfirmationChoice(currentMessages(), index, choice)
      updateMessages(updatedMessages)
      
      // Update UI state
      setAwaitingUserResponse(false)
      
      // Send confirmation to backend
      const confirmed = choice === "approved"
      await apiService.handleConfirmation(confirmed)
    } catch (error) {
      console.error("Confirmation error:", error)
      // Reset awaiting state on error
      setAwaitingUserResponse(false)
    }
  }

  /**
   * Clear all messages
   * @param {Function} clearMessages - Function to clear messages in store
   */
  static async clearMessages(clearMessages) {
    try {
      // Clear local state
      clearMessages()
      
      // Clear backend conversation
      await apiService.clearAgentMessages()
    } catch (error) {
      console.error("Clear messages error:", error)
      // Even if backend fails, keep local state cleared
    }
  }
}

export default StreamingService