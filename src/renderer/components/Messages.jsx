import React from "react";
import { Button } from "@/components/ui/button";
import { Check, X } from "lucide-react";
import useStore from "@/store/useStore";

export function UserMessage({ message }) {
  return (
    <div className="flex w-full justify-end">
      <div className="max-w-[75%] rounded-2xl rounded-br-md bg-primary text-primary-foreground px-4 py-3 text-base leading-relaxed">
        <p className="whitespace-pre-wrap">{message.content}</p>
      </div>
    </div>
  );
}

export function TextMessage({ message }) {
  return (
    <div className="w-full group">
      <p className="text-base text-foreground whitespace-pre-wrap leading-relaxed">
        {message.content}
      </p>
    </div>
  );
}

export function ImageMessage({ message }) {
  return (
    <div className="w-full group -mt-4">
      <div className="w-full">
        <img
          src={message.content}
          alt="AI generated or shared image"
          className="rounded-lg w-full h-auto shadow-lg"
        />
      </div>
    </div>
  );
}

export function ChoiceMessage({ message, index }) {
  const { selectChoice } = useStore();

  return (
    <div
      className={`w-full -mt-4 ${
        message.answered ? "opacity-50" : ""
      } transition-opacity duration-200`}
    >
      <blockquote className="border-l-2 pl-4 py-2">
        <div className="flex items-center gap-3">
          <p className="text-base font-medium text-foreground">
            {message.content}
          </p>
          <div className="flex gap-2 items-center">
            <div
              className={`flex items-center mr-2 w-4 ${
                message.answered ? "visible" : "invisible"
              }`}
            >
              {message.answered === "approved" ? (
                <Check className="h-4 w-4 text-green-600" />
              ) : message.answered === "rejected" ? (
                <X className="h-4 w-4 text-red-600" />
              ) : (
                <div className="h-4 w-4" />
              )}
            </div>
            <Button
              size="sm"
              variant="default"
              onClick={() => selectChoice(index, "approved")}
              disabled={message.answered !== null}
              className="h-8 px-4"
            >
              YES
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => selectChoice(index, "rejected")}
              disabled={message.answered !== null}
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
