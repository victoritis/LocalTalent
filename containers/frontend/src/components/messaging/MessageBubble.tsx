import { formatDistanceToNow } from 'date-fns'
import { es } from 'date-fns/locale'
import { Check, CheckCheck } from 'lucide-react'
import { cn } from '@/lib/utils'

interface MessageBubbleProps {
  content: string
  isMine: boolean
  isRead?: boolean
  senderUsername?: string
  createdAt: string
}

export function MessageBubble({
  content,
  isMine,
  isRead = false,
  senderUsername,
  createdAt,
}: MessageBubbleProps) {
  const formattedTime = formatDistanceToNow(new Date(createdAt), {
    addSuffix: true,
    locale: es,
  })

  return (
    <div className={cn('flex w-full mb-4', isMine ? 'justify-end' : 'justify-start')}>
      <div className={cn('max-w-[70%] space-y-1', isMine ? 'items-end' : 'items-start')}>
        {/* Username (only for received messages) */}
        {!isMine && senderUsername && (
          <div className="text-xs text-muted-foreground px-3">{senderUsername}</div>
        )}

        {/* Message bubble */}
        <div
          className={cn(
            'px-4 py-2 rounded-2xl break-words',
            isMine
              ? 'bg-primary text-primary-foreground rounded-br-sm'
              : 'bg-muted rounded-bl-sm'
          )}
        >
          <p className="text-sm whitespace-pre-wrap">{content}</p>
        </div>

        {/* Timestamp and read status */}
        <div
          className={cn(
            'flex items-center gap-1 text-xs text-muted-foreground px-3',
            isMine && 'justify-end'
          )}
        >
          <span>{formattedTime}</span>
          {isMine && (
            <span className="ml-1">
              {isRead ? (
                <CheckCheck className="w-3 h-3 text-blue-500" />
              ) : (
                <Check className="w-3 h-3" />
              )}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}
