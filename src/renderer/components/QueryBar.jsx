import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Mic, MicOff, Send, ChevronUp } from "lucide-react";
import useStore from "@/store/useStore";

export default function QueryBar() {
  const isTranscribing = useStore((s) => s.isTranscribing);
  const setIsTranscribing = useStore((s) => s.setIsTranscribing);
  const awaitingUserResponse = useStore((s) => s.awaitingUserResponse);
  const submitQuery = useStore((s) => s.submitQuery);
  const clearMessages = useStore((s) => s.clearMessages);
  const selectedModel = useStore((s) => s.selectedModel);
  const setSelectedModel = useStore((s) => s.setSelectedModel);
  const [input, setInput] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const textareaRef = useRef(null);

  const models = [
    { id: "claude-4-sonnet", name: "Claude 4 Sonnet" },
    { id: "O3", name: "O3" },
  ];

  // Auto-resize textarea
  const adjustTextareaHeight = () => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = "auto";
      const newHeight = Math.min(textarea.scrollHeight, 150); // Max 150px
      textarea.style.height = `${newHeight}px`;
    }
  };

  useEffect(() => {
    adjustTextareaHeight();
  }, [input]);

  // Focus textarea when renderer receives focus request from main process
  useEffect(() => {
    if (typeof window !== "undefined" && window.api?.onFocusQueryInput) {
      window.api.onFocusQueryInput(() => {
        textareaRef.current?.focus();
      });
    }

    // Initial autofocus when component mounts
    textareaRef.current?.focus();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!input.trim() || isSubmitting) return;

    const messageText = input.trim();
    setInput("");
    setIsSubmitting(true);

    try {
      // Handle local clear command
      if (messageText === "/clear") {
        clearMessages();
        setIsSubmitting(false);
        return;
      }

      submitQuery(messageText);
    } catch (error) {
      console.error("Error submitting message:", error);
      setInput(messageText); // Restore input on error
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const handleTranscribe = () => {
    setIsTranscribing(!isTranscribing);
  };

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
                    ? "Transcribing... speak clearly"
                    : awaitingUserResponse
                    ? "Press Enter to confirm or Esc to cancel"
                    : "What can I do for you?"
                }
                className={`w-full min-h-[24px] max-h-[150px] resize-none border-none outline-none bg-transparent text-left overflow-y-auto ${
                  isTranscribing ? "text-muted-foreground" : ""
                }`}
                disabled={isTranscribing || awaitingUserResponse}
                spellCheck="false"
                autoCorrect="off"
                autoCapitalize="off"
                autoComplete="off"
                rows={1}
                style={{
                  scrollbarWidth: "thin",
                  scrollbarColor: "#cbd5e1 transparent",
                }}
              />
            </div>

            {/* Bottom row with icons */}
            <div className="absolute bottom-2 left-2 right-2 flex justify-between items-center">
              {/* Left side - Model dropdown */}
              <div className="flex gap-1">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-7 px-2 text-xs"
                    >
                      {models.find((m) => m.id === selectedModel)?.name ||
                        selectedModel}
                      <ChevronUp className="h-3 w-3 ml-1" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" sideOffset={8}>
                    {models.map((model) => (
                      <DropdownMenuItem
                        key={model.id}
                        onClick={() => setSelectedModel(model.id)}
                        className="text-sm"
                      >
                        {model.name}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              {/* Right side icons */}
              <div className="flex gap-1">
                <Button
                  type="button"
                  variant={isTranscribing ? "destructive" : "ghost"}
                  size="sm"
                  className="h-7 w-7 p-0"
                  onClick={handleTranscribe}
                  disabled={isTranscribing || awaitingUserResponse}
                  title={isTranscribing ? "Stop recording" : "Start recording"}
                >
                  {isTranscribing ? (
                    <MicOff className="h-3.5 w-3.5" />
                  ) : (
                    <Mic className="h-3.5 w-3.5" />
                  )}
                </Button>

                <Button
                  type="submit"
                  variant="default"
                  size="sm"
                  className="h-7 w-7 p-0 bg-primary hover:bg-primary/90"
                  disabled={
                    isTranscribing ||
                    !input.trim() ||
                    awaitingUserResponse ||
                    isSubmitting
                  }
                  title="Send message"
                >
                  <Send className="h-3.5 w-3.5" />
                </Button>
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
  );
}
