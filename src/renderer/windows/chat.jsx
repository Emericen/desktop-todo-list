import { useEffect, useCallback, useRef } from "react"
import QueryBar from "@/components/QueryBar"
import useStore from "@/store/useStore"
import { Button } from "@/components/ui/button"
import {
  UserMessage,
  TextMessage,
  ImageMessage,
  TerminalMessage,
  ErrorMessage,
  ConfirmationMessage,
  LoadingMessage
} from "@/components/Messages"

export default function ChatWindow() {
  const messages = useStore((s) => s.messages)
  const settings = useStore((s) => s.settings)
  const theme = useStore((s) => s.theme)
  const loadSettings = useStore((s) => s.loadSettings)
  const toggleTranscription = useStore((s) => s.toggleTranscription)
  const clearMessages = useStore((s) => s.clearMessages)
  const toggleTheme = useStore((s) => s.toggleTheme)
  const setTheme = useStore((s) => s.setTheme)
  const shortcut = settings?.globalShortcuts?.toggleWindow

  const bottomRef = useRef(null)

  // Load settings on component mount
  useEffect(() => {
    loadSettings()
  }, [loadSettings])

  // Initialize theme on component mount
  useEffect(() => {
    setTheme(theme)
  }, [setTheme, theme])

  // Handle Alt+\ for transcription toggle
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.altKey && e.code === "Backslash") {
        e.preventDefault()
        toggleTranscription()
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [toggleTranscription])

  // Handle clear messages event from main process
  useEffect(() => {
    if (window.api?.onClearMessages) {
      window.api.onClearMessages(() => {
        clearMessages()
      })
    }
  }, [clearMessages])

  const scrollToBottom = useCallback(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [])

  useEffect(() => {
    requestAnimationFrame(scrollToBottom)
  }, [messages, scrollToBottom])

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Fixed header always visible */}
      <div
        className="fixed top-0 left-0 right-0 h-6 flex items-center justify-between pl-2 pr-2 select-none text-xs text-muted-foreground z-50 bg-background border-b border-border"
        style={{ WebkitAppRegion: "drag" }}
      >
        <span>{`Press ${shortcut} to toggle`}</span>
        <Button
          variant="ghost"
          size="sm"
          onClick={toggleTheme}
          className="h-4 w-4 p-0 hover:bg-accent"
          style={{ WebkitAppRegion: "no-drag" }}
        >
          {theme === "dark" ? "🌞" : "🌙"}
        </Button>
      </div>

      {/* Offset main content to avoid overlapping header */}
      <div className="flex-1 mt-6">
        <div className="flex-1 overflow-y-auto px-6 py-6">
          <div className="max-w-4xl mx-auto">
            <div className="space-y-6">
              {messages.map((message, index) => {
                switch (message.type) {
                  case "user":
                    return <UserMessage key={index} message={message} />
                  case "image":
                    return <ImageMessage key={index} message={message} />
                  case "bash":
                    return <TerminalMessage key={index} message={message} />
                  case "error":
                    return <ErrorMessage key={index} message={message} />
                  case "loading":
                    return <LoadingMessage key={index} />
                  case "confirmation":
                    return (
                      <ConfirmationMessage
                        key={index}
                        message={message}
                        index={index}
                      />
                    )
                  default:
                    return <TextMessage key={index} message={message} />
                }
              })}
              <div ref={bottomRef} />
            </div>
          </div>
        </div>
      </div>
      <QueryBar />
      <div className="h-24" />
    </div>
  )
}
