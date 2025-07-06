import React, { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Check, X, MousePointer, Terminal, Type, Move, Hand } from "lucide-react"
import useStore from "@/store/useStore"
import ReactMarkdown from "react-markdown"

export function UserMessage({ message }) {
  return (
    <div className="flex w-full justify-end">
      <div className="max-w-[75%] rounded-2xl rounded-br-md bg-primary text-primary-foreground px-4 py-3 text-base leading-normal">
        <p className="whitespace-pre-wrap">{message.content}</p>
      </div>
    </div>
  )
}

export function TextMessage({ message }) {
  return (
    <div className="w-full group">
      <ReactMarkdown
        components={{
          p: ({ children }) => (
            <p className="text-base text-foreground leading-normal mb-4 last:mb-0">
              {children}
            </p>
          ),
          h1: ({ children }) => (
            <h1 className="text-xl font-bold text-foreground mb-3 mt-6 first:mt-0">
              {children}
            </h1>
          ),
          h2: ({ children }) => (
            <h2 className="text-lg font-bold text-foreground mb-3 mt-5 first:mt-0">
              {children}
            </h2>
          ),
          h3: ({ children }) => (
            <h3 className="text-base font-bold text-foreground mb-2 mt-4 first:mt-0">
              {children}
            </h3>
          ),
          ul: ({ children }) => (
            <ul className="list-disc list-inside mb-4 space-y-1">{children}</ul>
          ),
          ol: ({ children }) => (
            <ol className="list-decimal list-inside mb-4 space-y-1">
              {children}
            </ol>
          ),
          li: ({ children }) => (
            <li className="text-base text-foreground leading-normal">
              {children}
            </li>
          ),
          code: ({ children }) => (
            <code className="bg-gray-100 px-1 py-0.5 rounded text-sm font-mono">
              {children}
            </code>
          ),
          pre: ({ children }) => (
            <pre className="bg-gray-100 p-3 rounded mb-4 overflow-x-auto">
              {children}
            </pre>
          )
        }}
      >
        {message.content}
      </ReactMarkdown>
    </div>
  )
}

export function ActionMessage({ message }) {
  const getActionIcon = (action) => {
    switch (action) {
      case "left_click":
      case "right_click":
      case "double_click":
        return <MousePointer className="h-4 w-4" />
      case "type":
        return <Type className="h-4 w-4" />
      case "drag":
        return <Move className="h-4 w-4" />
      case "bash":
        return <Terminal className="h-4 w-4" />
      default:
        return <Hand className="h-4 w-4" />
    }
  }

  const getActionDescription = (message) => {
    switch (message.action) {
      case "left_click":
        return `Left clicked at (${message.x}, ${message.y})`
      case "right_click":
        return `Right clicked at (${message.x}, ${message.y})`
      case "double_click":
        return `Double clicked at (${message.x}, ${message.y})`
      case "drag":
        return `Dragged from (${message.x1}, ${message.y1}) to (${message.x2}, ${message.y2})`
      case "type":
        return `Typed: "${message.text}"`
      case "bash":
        return `Executed command: ${message.command}`
      default:
        return `Unknown action: ${message.action}`
    }
  }

  return (
    <div className="w-full group">
      <div className="flex items-center gap-2 px-3 py-2 bg-blue-50 border border-blue-200 rounded-lg text-blue-800">
        {getActionIcon(message.action)}
        <span className="text-sm font-medium">{getActionDescription(message)}</span>
      </div>
    </div>
  )
}

export function BashResultMessage({ message }) {
  return (
    <div className="w-full group">
      <div className={`px-3 py-2 rounded-lg border ${message.success ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
        <div className="flex items-center gap-2 mb-2">
          <Terminal className="h-4 w-4" />
          <span className={`text-sm font-medium ${message.success ? 'text-green-800' : 'text-red-800'}`}>
            Command {message.success ? 'completed' : 'failed'}
          </span>
        </div>
        {message.output && (
          <pre className="text-xs bg-gray-900 text-green-400 p-2 rounded overflow-x-auto">
            {message.output}
          </pre>
        )}
        {message.error && (
          <pre className="text-xs bg-gray-900 text-red-400 p-2 rounded overflow-x-auto mt-2">
            {message.error}
          </pre>
        )}
      </div>
    </div>
  )
}

export function ErrorMessage({ message }) {
  return (
    <div className="w-full group">
      <div className="px-3 py-2 bg-red-50 border border-red-200 rounded-lg text-red-800">
        <div className="flex items-center gap-2">
          <X className="h-4 w-4" />
          <span className="text-sm font-medium">Error: {message.content}</span>
        </div>
      </div>
    </div>
  )
}

export function ImageMessage({ message }) {
  return (
    <div className="w-full group">
      <div className="w-full">
        <img
          src={message.content}
          alt="AI generated or shared image"
          className="rounded-lg w-full h-auto shadow-lg"
        />
      </div>
    </div>
  )
}

export function ChoiceMessage({ message, index }) {
  const { selectChoice } = useStore()

  return (
    <div
      className={`w-full ${
        message.answered ? "opacity-50" : ""
      } transition-opacity duration-200`}
    >
      <blockquote className="border-l-4 border-blue-500 pl-4 italic">
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
  )
}

export function LoadingMessage() {
  const [dots, setDots] = useState(".")

  useEffect(() => {
    const interval = setInterval(() => {
      setDots((prev) => {
        if (prev === ".") return ".."
        if (prev === "..") return "..."
        return "."
      })
    }, 500)

    return () => clearInterval(interval)
  }, [])

  return <div className="text-muted-foreground font-mono">{dots}</div>
}
