import React, { useState, useRef, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Check, X } from "lucide-react";
import useStore from "@/store/useStore";

function Message({ message, isLastYesNo, onYes, onNo, onImageLoad }) {
  const [yesNoStatus, setYesNoStatus] = useState(null);
  const isUser = message.role === "user";
  const isYesNo = message.type === "yes_no";
  const isImage = message.type === "image";

  const handleYes = () => {
    setYesNoStatus("yes");
    onYes?.();
  };

  const handleNo = () => {
    setYesNoStatus("no");
    onNo?.();
  };

  if (isUser) {
    return (
      <div className="flex w-full justify-end">
        <div className="max-w-[75%] rounded-2xl rounded-br-md bg-primary text-primary-foreground p-2">
          {isImage ? (
            <img
              src={message.content}
              alt="User shared image"
              className="rounded-lg max-w-full h-auto"
              onLoad={onImageLoad}
            />
          ) : (
            <div className="px-2 py-1">
              <p className="whitespace-pre-wrap">{message.content}</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  if (isImage) {
    return (
      <div className="w-full -mt-4">
        <img
          src={message.content}
          alt="AI generated image"
          className="rounded-lg w-full h-auto shadow-lg"
          onLoad={onImageLoad}
        />
      </div>
    );
  }

  if (isYesNo) {
    return (
      <div
        className={`w-full -mt-4 ${
          yesNoStatus || !isLastYesNo ? "opacity-50" : ""
        } transition-opacity`}
      >
        <blockquote className="border-l-2 pl-4 py-2">
          <div className="flex items-center gap-3">
            <p className="text-base font-medium">{message.content}</p>
            <div className="flex gap-2 items-center">
              <div className={`w-4 ${yesNoStatus ? "visible" : "invisible"}`}>
                {yesNoStatus === "yes" && (
                  <Check className="h-4 w-4 text-green-600" />
                )}
                {yesNoStatus === "no" && <X className="h-4 w-4 text-red-600" />}
              </div>
              <Button
                size="sm"
                onClick={handleYes}
                disabled={yesNoStatus !== null || !isLastYesNo}
                className="h-8 px-4"
              >
                YES
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={handleNo}
                disabled={yesNoStatus !== null || !isLastYesNo}
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

  return (
    <div className="w-full">
      <p className="text-base whitespace-pre-wrap leading-relaxed">
        {message.content}
      </p>
    </div>
  );
}

export default function ChatArea() {
  const {
    messages,
    awaitingUserResponse,
    setAwaitingUserResponse,
    userYes,
    userNo,
  } = useStore();
  const containerRef = useRef(null);

  const scrollToBottom = useCallback(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, []);

  const handleYes = useCallback(() => {
    userYes();
    setAwaitingUserResponse(false);
  }, [userYes, setAwaitingUserResponse]);

  const handleNo = useCallback(() => {
    userNo();
    setAwaitingUserResponse(false);
  }, [userNo, setAwaitingUserResponse]);

  // Find the last yes/no message index
  const lastYesNoIndex = messages.findLastIndex((msg) => msg.type === "yes_no");

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  useEffect(() => {
    if (!awaitingUserResponse) return;

    const handleKeydown = (e) => {
      if (e.key === "Enter") handleYes();
      if (e.key === "Escape") handleNo();
    };

    window.addEventListener("keydown", handleKeydown);
    return () => window.removeEventListener("keydown", handleKeydown);
  }, [awaitingUserResponse, handleYes, handleNo]);

  return (
    <div ref={containerRef} className="flex-1 overflow-y-auto px-6 py-6">
      <div className="max-w-4xl mx-auto space-y-8">
        {messages.map((message, index) => (
          <Message
            key={index}
            message={message}
            isLastYesNo={index === lastYesNoIndex}
            onYes={handleYes}
            onNo={handleNo}
            onImageLoad={scrollToBottom}
          />
        ))}
      </div>
    </div>
  );
}
