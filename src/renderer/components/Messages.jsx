import React, { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Check, X, Terminal, CornerDownLeft, Delete } from "lucide-react"
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

export function TerminalMessage({ message }) {
  const [isExecuted, setIsExecuted] = useState(message.executed || false)
  const [result, setResult] = useState(message.result || null)
  const { setAwaitingUserResponse } = useStore()

  const handleConfirm = async () => {
    setIsExecuted(true)
    setAwaitingUserResponse(false)
    // Send confirmation to backend
    await window.api.confirmCommand(true)
  }

  const handleCancel = async () => {
    setAwaitingUserResponse(false)
    await window.api.confirmCommand(false)
  }

  // Set awaiting response when component mounts and not executed
  useEffect(() => {
    if (!isExecuted && !message.executed) {
      setAwaitingUserResponse(true)
    }

    // Cleanup: reset awaiting response when component unmounts
    return () => {
      if (!isExecuted && !message.executed) {
        setAwaitingUserResponse(false)
      }
    }
  }, [])

  // Add keyboard event listener only if not executed
  useEffect(() => {
    if (isExecuted) return

    const handleKeyDown = (e) => {
      if (e.key === "Enter") {
        e.preventDefault()
        handleConfirm()
      } else if (e.key === "Delete" || e.key === "Backspace") {
        e.preventDefault()
        handleCancel()
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [isExecuted])

  // Update result when message changes
  useEffect(() => {
    if (message.result) {
      setResult(message.result)
      setIsExecuted(true)
      setAwaitingUserResponse(false)
    }
  }, [message.result])

  return (
    <div className="w-full group">
      <div className="px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg">
        {!isExecuted ? (
          // Before execution - show command with buttons
          <>
            <div className="flex items-center gap-2 mb-3">
              <Terminal className="h-4 w-4 text-yellow-400" />
              <span className="text-sm font-medium text-yellow-400">
                Execute this command?
              </span>
            </div>
            <div className="bg-gray-800 text-green-400 p-2 rounded mb-3 font-mono text-sm">
              {message.content}
            </div>
            <div className="flex justify-end gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={handleConfirm}
                className="h-8 px-4 bg-white text-black border-white hover:bg-gray-100"
              >
                Execute
                <CornerDownLeft className="h-3 w-3 ml-1" />
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={handleCancel}
                className="h-8 px-4 bg-gray-900 text-white border-gray-700 hover:bg-gray-800 hover:border-gray-600"
              >
                Cancel
                <Delete className="h-3 w-3 ml-1" />
              </Button>
            </div>
          </>
        ) : (
          // After execution - show command + results
          <>
            <div className="flex items-center gap-2 mb-2">
              <Terminal className="h-4 w-4 text-green-400" />
              <span className="text-sm font-medium text-green-400">
                Terminal
              </span>
            </div>
            {/* Command */}
            <div className="text-gray-400 font-mono text-sm mb-2">
              $ {message.content}
            </div>
            {/* Results */}
            {result && (
              <>
                {result.output && (
                  <pre className="text-green-400 font-mono text-sm whitespace-pre-wrap bg-gray-800 p-2 rounded mb-2">
                    {result.output}
                  </pre>
                )}
                {result.error && (
                  <pre className="text-red-400 font-mono text-sm whitespace-pre-wrap bg-gray-800 p-2 rounded mb-2">
                    {result.error}
                  </pre>
                )}
                {/* Status indicator */}
                <div className="flex items-center gap-2 text-xs">
                  {result.success ? (
                    <Check className="h-3 w-3 text-green-500" />
                  ) : (
                    <X className="h-3 w-3 text-red-500" />
                  )}
                  <span
                    className={
                      result.success ? "text-green-400" : "text-red-400"
                    }
                  >
                    {result.success ? "Command completed" : "Command failed"}
                  </span>
                  {result.executionTime && (
                    <span className="text-gray-500">
                      ({result.executionTime}ms)
                    </span>
                  )}
                </div>
              </>
            )}
          </>
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

export function ConfirmationMessage({ message, index }) {
  const { selectChoice, setAwaitingUserResponse } = useStore()

  const handleApprove = () => {
    selectChoice(index, "approved")
    setAwaitingUserResponse(false)
  }

  const handleReject = () => {
    selectChoice(index, "rejected")
    setAwaitingUserResponse(false)
  }

  // Set awaiting response when component mounts and not answered
  useEffect(() => {
    if (!message.answered) {
      setAwaitingUserResponse(true)
    }

    // Cleanup: reset awaiting response when component unmounts
    return () => {
      if (!message.answered) {
        setAwaitingUserResponse(false)
      }
    }
  }, [])

  // Update awaiting response when message is answered
  useEffect(() => {
    if (message.answered) {
      setAwaitingUserResponse(false)
    }
  }, [message.answered])

  // Add keyboard event listener
  useEffect(() => {
    if (message.answered) return

    const handleKeyDown = (e) => {
      if (e.key === "Enter") {
        e.preventDefault()
        handleApprove()
      } else if (e.key === "Delete" || e.key === "Backspace") {
        e.preventDefault()
        handleReject()
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [index, message.answered])

  return (
    <div
      className={`w-full ${
        message.answered ? "opacity-50" : ""
      } transition-opacity duration-200`}
    >
      <blockquote className="border-l-4 border-blue-500 pl-4">
        <p className="text-base font-medium text-foreground mb-3">
          {message.content}
        </p>
        <div className="flex justify-end gap-2 items-center">
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
            onClick={handleApprove}
            disabled={message.answered !== null}
            className="h-8 px-4"
          >
            YES
            <CornerDownLeft className="h-3 w-3 ml-1" />
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={handleReject}
            disabled={message.answered !== null}
            className="h-8 px-4"
          >
            NO
            <Delete className="h-3 w-3 ml-1" />
          </Button>
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
