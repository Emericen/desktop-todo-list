import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger
} from "@/components/ui/tooltip"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu"
import { Mic, MicOff, Send, ChevronUp, Loader2 } from "lucide-react"
import useStore from "@/store/useStore"

export default function QueryBar() {
  const isTranscribing = useStore((s) => s.isTranscribing)
  const setIsTranscribing = useStore((s) => s.setIsTranscribing)
  const awaitingUserResponse = useStore((s) => s.awaitingUserResponse)
  const submitQuery = useStore((s) => s.submitQuery)
  const clearMessages = useStore((s) => s.clearMessages)
  const selectedModel = useStore((s) => s.selectedModel)
  const setSelectedModel = useStore((s) => s.setSelectedModel)
  const models = useStore((s) => s.models)
  const toggleTranscription = useStore((s) => s.toggleTranscription)
  const setTranscriptionCallback = useStore((s) => s.setTranscriptionCallback)
  const isProcessingAudio = useStore((s) => s.isProcessingAudio)
  const [input, setInput] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const textareaRef = useRef(null)

  // Auto-resize textarea
  const adjustTextareaHeight = () => {
    const textarea = textareaRef.current
    if (textarea) {
      textarea.style.height = "auto"
      const newHeight = Math.min(textarea.scrollHeight, 150) // Max 150px
      textarea.style.height = `${newHeight}px`
    }
  }

  useEffect(() => {
    adjustTextareaHeight()
  }, [input])

  // Focus textarea when renderer receives focus request from main process
  useEffect(() => {
    if (typeof window !== "undefined" && window.api?.onFocusQueryInput) {
      window.api.onFocusQueryInput(() => {
        textareaRef.current?.focus()
      })
    }

    // Initial autofocus when component mounts
    textareaRef.current?.focus()
  }, [])

  // Set up transcription callback
  useEffect(() => {
    setTranscriptionCallback((transcribedText) => {
      setInput((prev) => {
        const newText = prev + transcribedText
        // Focus and position cursor at the end after text is set
        setTimeout(() => {
          if (textareaRef.current) {
            textareaRef.current.focus()
            textareaRef.current.setSelectionRange(
              newText.length,
              newText.length
            )
          }
        }, 0)
        return newText
      })
    })
  }, [setTranscriptionCallback])

  const handleTranscribe = () => {
    toggleTranscription()
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!input.trim() || isSubmitting) return

    const messageText = input.trim()
    setInput("")
    setIsSubmitting(true)

    try {
      // Handle local clear command
      if (messageText === "/clear") {
        clearMessages()
        setIsSubmitting(false)
        return
      }

      submitQuery(messageText)
    } catch (error) {
      console.error("Error submitting message:", error)
      setInput(messageText) // Restore input on error
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSubmit(e)
    }
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-background p-4">
      <div className="max-w-4xl mx-auto w-full">
        <form onSubmit={handleSubmit} className="w-full">
          <Card className="relative flex flex-col p-2 bg-card dark:bg-zinc-700/50 border border-border">
            {/* Text input area */}
            <div className="px-2 pb-8">
              <textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={
                  isTranscribing
                    ? "Listening..."
                    : isProcessingAudio
                    ? "Converting speech to text..."
                    : awaitingUserResponse
                    ? "Press Enter to confirm or Esc to cancel"
                    : "What can I do for you?"
                }
                className={`w-full min-h-[24px] max-h-[150px] resize-none border-none outline-none bg-transparent text-left overflow-y-auto ${
                  isTranscribing || isProcessingAudio
                    ? "text-muted-foreground"
                    : ""
                }`}
                disabled={
                  awaitingUserResponse || isProcessingAudio || isTranscribing
                }
                spellCheck="false"
                autoCorrect="off"
                autoCapitalize="off"
                autoComplete="off"
                rows={1}
                style={{
                  WebkitAppRegion: "no-drag",
                  scrollbarWidth: "thin",
                  scrollbarColor: "#cbd5e1 transparent"
                }}
              />
            </div>

            {/* Bottom row with icons */}
            <div className="absolute bottom-2 left-2 right-2 flex items-center">
              {/* Left side - Space for model dropdown selector */}
              <div className="flex gap-1" />

              {/* Spacer to push buttons to the right */}
              <div className="flex-1" />

              {/* Right side icons */}
              <div className="flex gap-1">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      type="button"
                      variant={isTranscribing ? "destructive" : "ghost"}
                      size="sm"
                      className="h-7 w-7 p-0"
                      style={{ WebkitAppRegion: "no-drag" }}
                      onClick={handleTranscribe}
                      disabled={awaitingUserResponse || isProcessingAudio}
                    >
                      {isTranscribing ? (
                        <MicOff className="h-3.5 w-3.5" />
                      ) : isProcessingAudio ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Mic className="h-3.5 w-3.5" />
                      )}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    {isTranscribing
                      ? "Stop (Alt+\\)"
                      : isProcessingAudio
                      ? "Processing"
                      : "Dictate (Alt+\\)"}
                  </TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      type="submit"
                      variant="default"
                      size="sm"
                      className="h-7 w-7 p-0 bg-primary hover:bg-primary/90"
                      style={{ WebkitAppRegion: "no-drag" }}
                      disabled={
                        isTranscribing ||
                        isProcessingAudio ||
                        !input.trim() ||
                        awaitingUserResponse ||
                        isSubmitting
                      }
                    >
                      <Send className="h-3.5 w-3.5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Submit (Enter)</TooltipContent>
                </Tooltip>
              </div>
            </div>

            {/* Recording indicator */}
            {isTranscribing && (
              <div className="absolute top-2 right-3 flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
                <span className="text-xs text-red-500 font-medium">
                  Recording
                </span>
              </div>
            )}
          </Card>
        </form>
      </div>
    </div>
  )
}
