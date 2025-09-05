import "./index.css"

import { StrictMode, useEffect } from "react"
import { createRoot } from "react-dom/client"
import TodoEditor from "./components/TodoEditor"
import useTodoStore from "./store"

function TodoApp() {
  const { loadTodo, isLoaded } = useTodoStore()

  // Apply system theme and listen for changes
  useEffect(() => {
    const mql = window.matchMedia("(prefers-color-scheme: dark)")
    const apply = () => {
      document.documentElement.classList.toggle("dark", mql.matches)
    }
    apply()
    mql.addEventListener("change", apply)
    return () => mql.removeEventListener("change", apply)
  }, [])

  // Load todo text on startup
  useEffect(() => {
    if (!isLoaded) {
      loadTodo()
    }
  }, [loadTodo, isLoaded])

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <div
        className="fixed top-0 left-0 right-0 z-10 text-center py-2 text-xs text-muted-foreground bg-background border-b border-border/20"
        style={{ WebkitAppRegion: "drag" }}
      >
        Todo App (Alt + P)
      </div>

      <TodoEditor />
    </div>
  )
}

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <TodoApp />
  </StrictMode>
)
