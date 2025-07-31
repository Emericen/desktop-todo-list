import { useChatArea } from "../hooks/useChatArea.js"
import {
  UserMessage,
  TextMessage,
  ImageMessage,
  TerminalMessage,
  ErrorMessage,
  ConfirmationMessage,
  LoadingMessage
} from "./Messages.jsx"

export default function ChatArea({ bottomRef }) {
  const { messages, handleApprove, handleReject, handleTerminalConfirm, handleTerminalCancel } = useChatArea()

  return (
    <div className="flex-1 pt-10">
      <div className="flex-1 overflow-y-auto px-6 py-6">
        <div className="max-w-4xl mx-auto">
          <div className="space-y-6">
            {messages.map((message, index) => {
              switch (message.type) {
                case "user":
                  return <UserMessage key={index} message={message} />
                case "image":
                  return <ImageMessage key={index} message={message} />
                case "bash":
                  return (
                    <TerminalMessage 
                      key={index} 
                      message={message}
                      onConfirm={handleTerminalConfirm}
                      onCancel={handleTerminalCancel}
                    />
                  )
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
                      onApprove={() => handleApprove(index)}
                      onReject={() => handleReject(index)}
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
    </div>
  )
}
