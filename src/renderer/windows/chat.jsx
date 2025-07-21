import { useEffect, useCallback, useRef } from "react"
import QueryBar from "@/components/QueryBar"
import useStore from "@/store/useStore"
import { ScrollArea } from "@/components/ui/scroll-area"
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
  // theme now follows system
  const toggleTranscription = useStore((s) => s.toggleTranscription)
  const clearMessages = useStore((s) => s.clearMessages)
  const shortcut = "Alt+P"

  const bottomRef = useRef(null)

  // no settings loading

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
    <div
      className="min-h-screen bg-background flex flex-col"
      title="Hide/Show (Alt+P)"
    >
      {/* Main content */}
      <div className="flex-1">
        <ScrollArea className="flex-1">
          <div className="px-6 py-6">
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
        </ScrollArea>
      </div>
      <QueryBar />
      <div className="h-24" />
    </div>
  )
}
