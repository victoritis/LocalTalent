import { useState, useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { ArrowLeft, Send, Loader2 } from 'lucide-react'
import { MessageBubble } from './MessageBubble'
import { useSocket } from '@/context/socket'
import { getMessages, markMessagesAsRead, Message } from '@/services/messaging/messagingApi'
import { useToast } from '@/hooks/use-toast'

interface ChatWindowProps {
  conversationId: number
  otherUser: {
    id: number
    username: string
    first_name: string
    last_name: string
    profile_image: string
  }
  onBack: () => void
}

export function ChatWindow({ conversationId, otherUser, onBack }: ChatWindowProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [inputValue, setInputValue] = useState('')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [isTyping, setIsTyping] = useState(false)
  const scrollAreaRef = useRef<HTMLDivElement>(null)
  const typingTimeoutRef = useRef<NodeJS.Timeout>()
  const { socket, connected, joinConversation, leaveConversation, sendMessage, sendTyping } = useSocket()
  const { toast } = useToast()

  // Cargar mensajes iniciales
  useEffect(() => {
    const loadMessages = async () => {
      try {
        setLoading(true)
        const data = await getMessages(conversationId)
        setMessages(data.messages)

        // Marcar mensajes como leídos
        await markMessagesAsRead(conversationId)
      } catch (error) {
        console.error('Error cargando mensajes:', error)
        toast({
          title: 'Error',
          description: 'No se pudieron cargar los mensajes',
          variant: 'destructive',
        })
      } finally {
        setLoading(false)
      }
    }

    loadMessages()
  }, [conversationId])

  // Unirse a la conversación por WebSocket
  useEffect(() => {
    if (connected && socket) {
      joinConversation(conversationId)

      // Escuchar nuevos mensajes
      socket.on('new_message', (data: any) => {
        if (data.conversation_id === conversationId) {
          setMessages((prev) => [...prev, data])

          // Auto-scroll al final
          scrollToBottom()

          // Marcar como leído si no es mío
          if (!data.is_mine) {
            markMessagesAsRead(conversationId)
          }
        }
      })

      // Escuchar indicador de escritura
      socket.on('user_typing', (data: any) => {
        if (data.conversation_id === conversationId && data.user_id === otherUser.id) {
          setIsTyping(data.is_typing)
        }
      })

      // Escuchar mensajes leídos
      socket.on('message_read', (data: any) => {
        if (data.conversation_id === conversationId) {
          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === data.message_id ? { ...msg, is_read: true } : msg
            )
          )
        }
      })

      return () => {
        leaveConversation(conversationId)
        socket.off('new_message')
        socket.off('user_typing')
        socket.off('message_read')
      }
    }
  }, [connected, socket, conversationId, otherUser.id])

  const scrollToBottom = () => {
    if (scrollAreaRef.current) {
      const scrollElement = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]')
      if (scrollElement) {
        scrollElement.scrollTop = scrollElement.scrollHeight
      }
    }
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault()

    const content = inputValue.trim()
    if (!content || sending) return

    setSending(true)
    try {
      if (connected && socket) {
        // Enviar por WebSocket
        sendMessage(conversationId, content)
      } else {
        // Fallback a REST API
        toast({
          title: 'Advertencia',
          description: 'Conexión en tiempo real no disponible. El mensaje se enviará cuando la conexión se restablezca.',
        })
      }

      setInputValue('')

      // Detener indicador de escritura
      if (connected) {
        sendTyping(conversationId, false)
      }
    } catch (error) {
      console.error('Error enviando mensaje:', error)
      toast({
        title: 'Error',
        description: 'No se pudo enviar el mensaje',
        variant: 'destructive',
      })
    } finally {
      setSending(false)
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value)

    if (connected) {
      // Enviar indicador de escritura
      sendTyping(conversationId, true)

      // Detener indicador después de 2 segundos de inactividad
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current)
      }
      typingTimeoutRef.current = setTimeout(() => {
        sendTyping(conversationId, false)
      }, 2000)
    }
  }

  const initials = `${otherUser.first_name?.[0] || ''}${otherUser.last_name?.[0] || ''}`.toUpperCase()

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-3 p-4 border-b bg-card">
        <Button variant="ghost" size="icon" onClick={onBack}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <Avatar className="w-10 h-10">
          <AvatarImage src={otherUser.profile_image} alt={otherUser.username} />
          <AvatarFallback>{initials}</AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold truncate">
            {otherUser.first_name} {otherUser.last_name}
          </h3>
          <p className="text-sm text-muted-foreground truncate">
            @{otherUser.username}
          </p>
        </div>
        {!connected && (
          <div className="text-xs text-yellow-600 bg-yellow-50 px-2 py-1 rounded">
            Desconectado
          </div>
        )}
      </div>

      {/* Messages */}
      <ScrollArea ref={scrollAreaRef} className="flex-1 p-4">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex items-center justify-center h-full text-center">
            <div className="text-muted-foreground">
              <p>No hay mensajes aún</p>
              <p className="text-sm mt-2">Envía el primer mensaje para comenzar la conversación</p>
            </div>
          </div>
        ) : (
          <>
            {messages.map((message) => (
              <MessageBubble
                key={message.id}
                content={message.content}
                isMine={message.is_mine}
                isRead={message.is_read}
                senderUsername={message.is_mine ? undefined : otherUser.username}
                createdAt={message.created_at}
              />
            ))}
            {isTyping && (
              <div className="text-sm text-muted-foreground italic px-3 mb-4">
                {otherUser.first_name} está escribiendo...
              </div>
            )}
          </>
        )}
      </ScrollArea>

      {/* Input */}
      <form onSubmit={handleSendMessage} className="p-4 border-t bg-card">
        <div className="flex gap-2">
          <Input
            value={inputValue}
            onChange={handleInputChange}
            placeholder="Escribe un mensaje..."
            disabled={sending}
            className="flex-1"
          />
          <Button type="submit" disabled={sending || !inputValue.trim()} size="icon">
            {sending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </Button>
        </div>
      </form>
    </div>
  )
}
