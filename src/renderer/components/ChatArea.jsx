import React, { useState, useRef, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Copy, ThumbsUp, ThumbsDown, Volume2, Check, X } from "lucide-react";
import useStore from "@/store/useStore";

function UserMessage({ content, type = "text" }) {
  if (type === "image") {
    return (
      <div className="flex w-full justify-end">
        <div className="max-w-[75%] rounded-2xl rounded-br-md bg-primary text-primary-foreground p-2">
          <img
            src={content}
            alt="User shared image"
            className="rounded-lg max-w-full h-auto"
          />
        </div>
      </div>
    );
  }

  return (
    <div className="flex w-full justify-end">
      <div className="max-w-[75%] rounded-2xl rounded-br-md bg-primary text-primary-foreground px-4 py-3 text-base leading-relaxed">
        <p className="whitespace-pre-wrap">{content}</p>
      </div>
    </div>
  );
}

function AgentTextMessage({ content, showResponseTooltip = true }) {
  const copyToClipboard = () => {
    navigator.clipboard.writeText(content);
  };

  return (
    <div className="w-full group">
      <div className="space-y-2">
        <p className="text-base text-foreground whitespace-pre-wrap leading-relaxed">
          {content}
        </p>

        {/* Icons at bottom, aligned with text start - only show if showResponseTooltip is true */}
        {showResponseTooltip && (
          <div className="flex gap-1 -ml-2">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0 hover:bg-muted/20"
                    onClick={copyToClipboard}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom">
                  <p>Copy</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0 hover:bg-muted/20"
                  >
                    <ThumbsUp className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom">
                  <p>Good response</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0 hover:bg-muted/20"
                  >
                    <ThumbsDown className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom">
                  <p>Bad response</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0 hover:bg-muted/20"
                  >
                    <Volume2 className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom">
                  <p>Read aloud</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        )}
      </div>
    </div>
  );
}

function AgentImageMessage({ content, showResponseTooltip = true }) {
  return (
    <div className="w-full group -mt-4">
      <div className="space-y-2">
        <div className="w-full">
          <img
            src={content}
            alt="AI generated or shared image"
            className="rounded-lg w-full h-auto shadow-lg"
          />
        </div>

        {/* Show response tooltips for images too */}
        {showResponseTooltip && (
          <div className="flex gap-1 -ml-2">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0 hover:bg-muted/20"
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom">
                  <p>Copy image</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0 hover:bg-muted/20"
                  >
                    <ThumbsUp className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom">
                  <p>Good response</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0 hover:bg-muted/20"
                  >
                    <ThumbsDown className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom">
                  <p>Bad response</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        )}
      </div>
    </div>
  );
}

function AgentConfirmationMessage({ content, onConfirm }) {
  const [status, setStatus] = useState(null); // null, 'approved', 'rejected'

  const handleYes = () => {
    setStatus("approved");
    onConfirm?.(true);
  };

  const handleNo = () => {
    setStatus("rejected");
    onConfirm?.(false);
  };

  return (
    <div
      className={`w-full -mt-4 ${status ? "opacity-50" : ""} transition-opacity duration-200`}
    >
      <blockquote className="border-l-2 pl-4 py-2">
        <div className="flex items-center gap-3">
          <p className="text-base font-medium text-foreground">{content}</p>
          <div className="flex gap-2 items-center">
            <div
              className={`flex items-center mr-2 w-4 ${status ? "visible" : "invisible"}`}
            >
              {status === "approved" ? (
                <Check className="h-4 w-4 text-green-600" />
              ) : status === "rejected" ? (
                <X className="h-4 w-4 text-red-600" />
              ) : (
                <div className="h-4 w-4" />
              )}
            </div>
            <Button
              size="sm"
              variant="default"
              onClick={handleYes}
              disabled={status !== null}
              className="h-8 px-4"
            >
              YES
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={handleNo}
              disabled={status !== null}
              className="h-8 px-4"
            >
              NO
            </Button>
          </div>
        </div>
      </blockquote>
    </div>
  );
}

const ChatArea = function ChatArea() {
  const messages = useStore((s) => s.messages);
  const awaitingUserResponse = useStore((s) => s.awaitingUserResponse);
  const setAwaitingUserResponse = useStore((s) => s.setAwaitingUserResponse);
  const userConfirmed = useStore((s) => s.userConfirmed);
  const userDenied = useStore((s) => s.userDenied);

  // Auto-scroll using sentinel div
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Handle confirmation and update parent state
  const handleConfirmation = useCallback(async (approved) => {
    console.log(`Action ${approved ? "approved" : "rejected"}`);

    try {
      if (approved) {
        userConfirmed();
      } else {
        userDenied();
      }
      console.log("User response sent successfully");

      // Notify parent that we're no longer awaiting response
      setAwaitingUserResponse(false);
    } catch (error) {
      console.error("Error sending user response:", error);
      // TODO: Show error message in UI
    }
  }, [setAwaitingUserResponse, userConfirmed, userDenied]);

  // Keyboard shortcuts: Enter approve, Escape reject
  useEffect(() => {
    if (!awaitingUserResponse) return;

    const keyHandler = (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        handleConfirmation(true);
      } else if (e.key === "Escape") {
        e.preventDefault();
        handleConfirmation(false);
      }
    };

    window.addEventListener("keydown", keyHandler);
    return () => window.removeEventListener("keydown", keyHandler);
  }, [awaitingUserResponse, handleConfirmation]);

  return (
    <div className="flex-1 overflow-y-auto px-6 py-6">
      <div className="max-w-4xl mx-auto">
        <div className="space-y-8">
          {messages.map((message, index) => {
            if (message.role === "user") {
              return (
                <UserMessage
                  key={index}
                  content={message.content}
                  type={message.type}
                />
              );
            } else {
              // For agent messages, check if this is the last in a consecutive sequence
              const nextMessage = messages[index + 1];
              const isLastInSequence =
                !nextMessage || nextMessage.role !== "agent";

              if (message.type === "image") {
                return (
                  <AgentImageMessage
                    key={index}
                    content={message.content}
                    showResponseTooltip={isLastInSequence}
                  />
                );
              } else if (message.type === "confirmation") {
                return (
                  <AgentConfirmationMessage
                    key={index}
                    content={message.content}
                    onConfirm={handleConfirmation}
                  />
                );
              } else {
                return (
                  <AgentTextMessage
                    key={index}
                    content={message.content}
                    showResponseTooltip={isLastInSequence}
                  />
                );
              }
            }
          })}
          <div ref={bottomRef} />
        </div>
      </div>
    </div>
  );
};

export default ChatArea;
