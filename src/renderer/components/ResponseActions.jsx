import React from 'react'
import { Button } from '@/components/ui/button'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger
} from '@/components/ui/tooltip'
import { Copy, ThumbsUp, ThumbsDown, Volume2 } from 'lucide-react'

const ResponseActions = ({
  showCopy = true,
  showThumbsUp = true,
  showThumbsDown = true,
  showReadAloud = true,
  onAction,
  content = ''
}) => {
  const handleCopy = () => {
    navigator.clipboard.writeText(content)
    onAction?.('copy', content)
  }

  const handleThumbsUp = () => {
    onAction?.('thumbs_up')
  }

  const handleThumbsDown = () => {
    onAction?.('thumbs_down')
  }

  const handleReadAloud = () => {
    onAction?.('read_aloud', content)
  }

  return (
    <div className="flex gap-1 -ml-2">
      {showCopy && (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0 hover:bg-muted/20"
                onClick={handleCopy}
              >
                <Copy className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">
              <p>Copy</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}

      {showThumbsUp && (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0 hover:bg-muted/20"
                onClick={handleThumbsUp}
              >
                <ThumbsUp className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">
              <p>Good response</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}

      {showThumbsDown && (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0 hover:bg-muted/20"
                onClick={handleThumbsDown}
              >
                <ThumbsDown className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">
              <p>Bad response</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}

      {showReadAloud && (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0 hover:bg-muted/20"
                onClick={handleReadAloud}
              >
                <Volume2 className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">
              <p>Read aloud</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}
    </div>
  )
}

export default ResponseActions
