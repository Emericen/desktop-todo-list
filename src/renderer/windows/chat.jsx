import { useEffect } from "react"
import QueryBar from "@/components/QueryBar"
import ChatArea from "@/components/ChatArea"
import { useKeyboardShortcuts } from "../hooks/useKeyboardShortcuts.js"

export default function ChatWindow() {
  // Use custom hooks
  useKeyboardShortcuts()

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

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <div
        className="fixed top-0 left-0 right-0 z-10 text-center py-2 text-xs text-muted-foreground bg-background border-b border-border/20"
        style={{ WebkitAppRegion: "drag" }}
      >
        Show / Hide (Alt + P)
      </div>

      <ChatArea />
      <QueryBar />
      <div className="h-24" />
    </div>
  )
}
