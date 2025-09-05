import { useEffect, useRef } from "react"
import useTodoStore from "../store"

export default function TodoEditor() {
  const { todoText, setTodoText, saveTodo, fontSize, zoomIn, zoomOut, resetZoom } = useTodoStore()
  const textareaRef = useRef(null)

  // Auto-save with debounce
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      saveTodo()
    }, 1000)

    return () => clearTimeout(timeoutId)
  }, [todoText, saveTodo])

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`
    }
  }, [todoText, fontSize])

  // Handle zoom shortcuts and other global keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.ctrlKey || e.metaKey) {
        // Zoom shortcuts
        if (e.code === 'Equal' || e.code === 'NumpadAdd' || (e.shiftKey && e.code === 'Equal')) {
          e.preventDefault()
          zoomIn()
        } else if (e.code === 'Minus' || e.code === 'NumpadSubtract' || e.key === '-' || e.key === '_') {
          e.preventDefault()
          zoomOut()
        } else if (e.code === 'Digit0' || e.code === 'Numpad0') {
          e.preventDefault()
          resetZoom()
        } else if (e.key === 's') {
          // Ctrl+S for save (handled by auto-save, but could show notification)
          e.preventDefault()
        }
      }
    }

    // Also handle Ctrl + mouse wheel for zoom
    const handleWheel = (e) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault()
        if (e.deltaY < 0) {
          // Scroll up = zoom in
          zoomIn()
        } else if (e.deltaY > 0) {
          // Scroll down = zoom out
          zoomOut()
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('wheel', handleWheel, { passive: false })
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('wheel', handleWheel)
    }
  }, [zoomIn, zoomOut, resetZoom])

  const handleChange = (e) => {
    setTodoText(e.target.value)
  }

  const handleKeyDown = (e) => {
    // Tab key for indentation
    if (e.key === 'Tab') {
      e.preventDefault()
      const start = e.target.selectionStart
      const end = e.target.selectionEnd
      const newText = todoText.substring(0, start) + '  ' + todoText.substring(end)
      setTodoText(newText)
      
      // Restore cursor position
      setTimeout(() => {
        e.target.selectionStart = e.target.selectionEnd = start + 2
      }, 0)
    }
  }

  return (
    <div className="flex-1 p-4 pt-12 pb-4">
      <textarea
        ref={textareaRef}
        value={todoText}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        placeholder="Start typing your todos..."
        className="w-full h-full min-h-[calc(100vh-8rem)] resize-none bg-transparent text-foreground placeholder-muted-foreground focus:outline-none leading-relaxed font-mono"
        style={{ 
          fontSize: `${fontSize}px`,
          lineHeight: '1.6'
        }}
        spellCheck={false}
        autoFocus
      />
    </div>
  )
}