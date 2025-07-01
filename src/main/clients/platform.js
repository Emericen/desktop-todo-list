function truncateBase64(obj) {
  if (typeof obj === 'string' && obj.startsWith('data:image/')) {
    const [header, data] = obj.split(',')
    return `${header},${data.substring(0, 20)}...${data.substring(
      data.length - 10
    )} [${data.length} chars]`
  }
  if (Array.isArray(obj)) {
    return obj.map(truncateBase64)
  }
  if (obj && typeof obj === 'object') {
    const truncated = {}
    for (const [key, value] of Object.entries(obj)) {
      truncated[key] = truncateBase64(value)
    }
    return truncated
  }
  return obj
}

export async function sendQuery(payload, onChunk = null) {
  // Switch between dev and production easily
  //   const baseUrl = 'https://assistant-ui-platform.vercel.app'
  const baseUrl = 'http://localhost:3000' // Uncomment for local development

  try {
    // Send entire conversation state to backend
    const requestBody = {
      messages: payload.messages || [],
      selectedModel: payload.selectedModel || 'claude-4-sonnet'
    }

    // Log request body with truncated base64 strings
    console.log(
      'request body:',
      JSON.stringify(truncateBase64(requestBody), null, 2)
    )

    const response = await fetch(`${baseUrl}/api/query`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody)
    })

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    // Handle streaming response
    if (onChunk && response.headers.get('content-type')?.includes('text/event-stream')) {
      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let fullResponse = ''

      try {
        while (true) {
          const { done, value } = await reader.read()
          if (done) break

          const chunk = decoder.decode(value, { stream: true })
          const lines = chunk.split('\n')

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              try {
                const data = JSON.parse(line.slice(6))
                if (data.type === 'chunk') {
                  fullResponse += data.text
                  onChunk(data.text)
                } else if (data.type === 'done') {
                  return { type: 'text', data: fullResponse }
                } else if (data.type === 'error') {
                  throw new Error(data.error)
                }
              } catch (parseError) {
                // Ignore malformed JSON chunks
              }
            }
          }
        }
      } finally {
        reader.releaseLock()
      }

      return { type: 'text', data: fullResponse }
    } else {
      // Fallback for non-streaming response
      const data = await response.json()
      return { type: 'text', data: data.response }
    }
  } catch (error) {
    console.error('API Error:', error)
    return {
      type: 'text',
      data: `Error connecting to backend: ${error.message}`
    }
  }
}
