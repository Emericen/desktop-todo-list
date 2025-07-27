/**
 * Message Service - Handles message processing logic
 * Extracted from useStore.js to separate concerns
 */

export class MessageService {
  /**
   * Process streaming events and update messages appropriately
   * @param {Array} currentMessages - Current messages array
   * @param {Object} eventData - Event data from stream
   * @param {number} messageIndex - Index of current message being updated
   * @param {boolean} isFirstEvent - Whether this is the first event
   * @returns {Object} { updatedMessages, newMessageIndex, isFirstEvent }
   */
  static processStreamEvent(currentMessages, eventData, messageIndex, isFirstEvent) {
    let updatedMessages = [...currentMessages]
    let newMessageIndex = messageIndex
    let newIsFirstEvent = isFirstEvent

    if (isFirstEvent) {
      console.log("First event - replacing loading message")
      // Replace loading message with the first response
      updatedMessages[messageIndex] = {
        ...eventData,
        timestamp: new Date()
      }
      newIsFirstEvent = false
    } else {
      // Handle different types of streaming updates
      if (this.shouldAppendBashResult(updatedMessages, eventData)) {
        updatedMessages = this.appendBashResult(updatedMessages, eventData)
      } else if (this.shouldAppendTextContent(updatedMessages, eventData, messageIndex)) {
        updatedMessages = this.appendTextContent(updatedMessages, eventData, messageIndex)
      } else {
        // Add as new message
        console.log("Adding new message")
        updatedMessages.push({
          ...eventData,
          timestamp: new Date()
        })
        newMessageIndex = updatedMessages.length - 1
      }
    }

    return {
      updatedMessages,
      newMessageIndex,
      isFirstEvent: newIsFirstEvent
    }
  }

  /**
   * Check if we should append bash result to existing bash message
   */
  static shouldAppendBashResult(messages, eventData) {
    return eventData.type === "bash" &&
           eventData.result &&
           messages.some(m => 
             m.type === "bash" && 
             m.content === eventData.content && 
             !m.result
           )
  }

  /**
   * Append bash result to existing bash message
   */
  static appendBashResult(messages, eventData) {
    const updatedMessages = [...messages]
    const targetIndex = [...updatedMessages]
      .reverse()
      .findIndex(m =>
        m.type === "bash" &&
        m.content === eventData.content &&
        !m.result
      )
    
    if (targetIndex !== -1) {
      // reverse index offset
      const realIndex = updatedMessages.length - 1 - targetIndex
      updatedMessages[realIndex] = {
        ...updatedMessages[realIndex],
        result: eventData.result
      }
      return updatedMessages
    }
    
    // Fallback - add as new message
    return [...updatedMessages, { ...eventData, timestamp: new Date() }]
  }

  /**
   * Check if we should append text content to existing text message
   */
  static shouldAppendTextContent(messages, eventData, messageIndex) {
    return eventData.type === "text" && 
           messages[messageIndex]?.type === "text"
  }

  /**
   * Append text content to existing text message
   */
  static appendTextContent(messages, eventData, messageIndex) {
    const updatedMessages = [...messages]
    updatedMessages[messageIndex] = {
      ...updatedMessages[messageIndex],
      content: updatedMessages[messageIndex].content + eventData.content
    }
    return updatedMessages
  }

  /**
   * Create a user message object
   */
  static createUserMessage(content) {
    return {
      type: "user",
      content: content.trim(),
      timestamp: new Date()
    }
  }

  /**
   * Create a loading message object
   */
  static createLoadingMessage() {
    return {
      type: "loading",
      content: "",
      timestamp: new Date()
    }
  }

  /**
   * Create an error message object
   */
  static createErrorMessage(error) {
    return {
      type: "error",
      content: `Error: ${error}`,
      timestamp: new Date()
    }
  }

  /**
   * Update confirmation message with user choice
   */
  static updateConfirmationChoice(messages, index, choice) {
    const updatedMessages = [...messages]
    if (updatedMessages[index] && updatedMessages[index].type === "confirmation") {
      updatedMessages[index] = {
        ...updatedMessages[index],
        answered: choice
      }
    }
    return updatedMessages
  }

  /**
   * Add confirmation message with answered field initialized
   */
  static addConfirmationMessage(message) {
    return message.type === "confirmation"
      ? { ...message, answered: null }
      : message
  }

  /**
   * Replace the last image message with a new one, or add if no image exists
   */
  static replaceOrAddImageMessage(messages, newMessage) {
    if (messages.length !== 0 && messages[messages.length - 1].type === "image") {
      return [...messages.slice(0, -1), newMessage]
    }
    return [...messages, newMessage]
  }
}

export default MessageService