import { useEffect, useCallback, useRef } from "react";
import QueryBar from "@/components/QueryBar";
import useStore from "@/store/useStore";
import {
  UserMessage,
  TextMessage,
  ImageMessage,
  ChoiceMessage,
} from "@/components/Messages";

export default function ChatWindow() {
  const messages = useStore((s) => s.messages);
  const settings = useStore((s) => s.settings);
  const shortcut = settings?.globalShortcuts?.toggleWindow;

  const bottomRef = useRef(null);

  const scrollToBottom = useCallback(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    requestAnimationFrame(scrollToBottom);
  }, [messages, scrollToBottom]);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Fixed header always visible */}
      <div
        className="fixed top-0 left-0 right-0 h-6 flex items-center pl-2 select-none text-xs text-muted-foreground z-50 bg-background border-b border-border"
        style={{ WebkitAppRegion: "drag" }}
      >
        {`Press ${shortcut} to toggle`}
      </div>

      {/* Offset main content to avoid overlapping header */}
      <div className="flex-1 mt-6">
        <div className="flex-1 overflow-y-auto px-6 py-6">
          <div className="max-w-4xl mx-auto">
            <div className="space-y-8">
              {messages.map((message, index) => {
                switch (message.type) {
                  case "user":
                    return <UserMessage key={index} message={message} />;
                  case "image":
                    return <ImageMessage key={index} message={message} />;
                  case "confirmation":
                    return (
                      <ChoiceMessage
                        key={index}
                        message={message}
                        index={index}
                      />
                    );
                  default:
                    return <TextMessage key={index} message={message} />;
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
  );
}
