import { useRef } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger
} from "@/components/ui/tooltip"
import { Send, Mic, MicOff, Loader2 } from "lucide-react"
import { useQueryBar } from "../hooks/useQueryBar.js"

export default function QueryBar() {
  const textareaRef = useRef(null)

  // Use single consolidated hook
  const {
    input,
    setInput,
    placeholder,
    textAreaDisabled,
    usingDictation,
    showRecordingIndicator,
    canSubmitQuery,
    dictationIconType,
    dictationVariant,
    dictationTooltipText,
    dictationDisabled,

    handleKeyDown,
    handleDictation,
    handleSubmit
  } = useQueryBar(textareaRef)

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
                placeholder={placeholder}
                className={`w-full min-h-[24px] max-h-[150px] resize-none border-none outline-none bg-transparent text-left overflow-y-auto ${
                  usingDictation ? "text-muted-foreground" : ""
                }`}
                disabled={textAreaDisabled}
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
                      size="sm"
                      className="h-7 w-7 p-0"
                      style={{ WebkitAppRegion: "no-drag" }}
                      variant={dictationVariant}
                      onClick={handleDictation}
                      disabled={dictationDisabled}
                    >
                      {dictationIconType === "mic-off" ? (
                        <MicOff className="h-3.5 w-3.5" />
                      ) : dictationIconType === "loading" ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Mic className="h-3.5 w-3.5" />
                      )}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>{dictationTooltipText}</TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      type="submit"
                      variant="default"
                      size="sm"
                      className="h-7 w-7 p-0 bg-primary hover:bg-primary/90"
                      style={{ WebkitAppRegion: "no-drag" }}
                      disabled={!canSubmitQuery}
                    >
                      <Send className="h-3.5 w-3.5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Submit (Enter)</TooltipContent>
                </Tooltip>
              </div>
            </div>

            {/* Recording indicator */}
            {showRecordingIndicator && (
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
