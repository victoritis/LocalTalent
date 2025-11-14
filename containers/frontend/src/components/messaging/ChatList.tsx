import { useState, useEffect } from 'react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Loader2, MessageSquare } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { es } from 'date-fns/locale'
import { getConversations, Conversation } from '@/services/messaging/messagingApi'
import { useSocket } from '@/context/socket'
import { cn } from '@/lib/utils'
import { useToast } from '@/hooks/use-toast'

interface ChatListProps {
  onSelectConversation: (conversation: Conversation) => void
  selectedConversationId?: number
}

export function ChatList({ onSelectConversation, selectedConversationId }: ChatListProps) {
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [loading, setLoading] = useState(true)
  const { socket, connected } = useSocket()
  const { toast } = useToast()

  useEffect(() => {
    loadConversations()
  }, [])

  // Escuchar notificaciones de nuevos mensajes
  useEffect(() => {
    if (connected && socket) {
      socket.on('message_notification', (data: any) => {
        // Actualizar la conversación con el nuevo mensaje
        setConversations((prev) =>
          prev.map((conv) =>
            conv.id === data.conversation_id
              ? {
                  ...conv,
                  last_message: {
                    content: data.message.content,
                    created_at: data.message.created_at,
                    is_mine: false,
                  },
                  unread_count: conv.unread_count + 1,
                  last_message_at: data.message.created_at,
                }
              : conv
          )
        )

        // Reordenar conversaciones por última actividad
        setConversations((prev) =>
          [...prev].sort((a, b) => {
            const dateA = a.last_message_at ? new Date(a.last_message_at).getTime() : 0
            const dateB = b.last_message_at ? new Date(b.last_message_at).getTime() : 0
            return dateB - dateA
          })
        )
      })

      return () => {
        socket.off('message_notification')
      }
    }
  }, [connected, socket])

  const loadConversations = async () => {
    try {
      setLoading(true)
      const data = await getConversations()
      setConversations(data)
    } catch (error) {
      console.error('Error cargando conversaciones:', error)
      toast({
        title: 'Error',
        description: 'No se pudieron cargar las conversaciones',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const handleSelectConversation = (conversation: Conversation) => {
    onSelectConversation(conversation)

    // Resetear contador de no leídos localmente
    setConversations((prev) =>
      prev.map((conv) =>
        conv.id === conversation.id ? { ...conv, unread_count: 0 } : conv
      )
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (conversations.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8 text-center">
        <MessageSquare className="w-16 h-16 text-muted-foreground mb-4 opacity-50" />
        <h3 className="text-lg font-semibold mb-2">No hay conversaciones</h3>
        <p className="text-sm text-muted-foreground">
          Busca un usuario en el mapa y comienza una conversación
        </p>
      </div>
    )
  }

  return (
    <ScrollArea className="h-full">
      <div className="space-y-1 p-2">
        {conversations.map((conversation) => {
          const initials = `${conversation.other_user.first_name?.[0] || ''}${
            conversation.other_user.last_name?.[0] || ''
          }`.toUpperCase()

          const lastMessageTime = conversation.last_message_at
            ? formatDistanceToNow(new Date(conversation.last_message_at), {
                addSuffix: true,
                locale: es,
              })
            : null

          const isSelected = conversation.id === selectedConversationId

          return (
            <div
              key={conversation.id}
              onClick={() => handleSelectConversation(conversation)}
              className={cn(
                'flex items-start gap-3 p-3 rounded-lg cursor-pointer transition-colors',
                'hover:bg-accent',
                isSelected && 'bg-accent'
              )}
            >
              <Avatar className="w-12 h-12 flex-shrink-0">
                <AvatarImage
                  src={conversation.other_user.profile_image}
                  alt={conversation.other_user.username}
                />
                <AvatarFallback>{initials}</AvatarFallback>
              </Avatar>

              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2 mb-1">
                  <h4 className="font-semibold truncate">
                    {conversation.other_user.first_name} {conversation.other_user.last_name}
                  </h4>
                  {lastMessageTime && (
                    <span className="text-xs text-muted-foreground whitespace-nowrap">
                      {lastMessageTime}
                    </span>
                  )}
                </div>

                <div className="flex items-center justify-between gap-2">
                  {conversation.last_message ? (
                    <p className="text-sm text-muted-foreground truncate">
                      {conversation.last_message.is_mine && 'Tú: '}
                      {conversation.last_message.content}
                    </p>
                  ) : (
                    <p className="text-sm text-muted-foreground italic">Nueva conversación</p>
                  )}

                  {conversation.unread_count > 0 && (
                    <Badge variant="default" className="ml-auto flex-shrink-0">
                      {conversation.unread_count}
                    </Badge>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </ScrollArea>
  )
}
