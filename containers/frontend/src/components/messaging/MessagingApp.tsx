import { useState } from 'react'
import { Card } from '@/components/ui/card'
import { ChatList } from './ChatList'
import { ChatWindow } from './ChatWindow'
import { Conversation } from '@/services/messaging/messagingApi'
import { MessageSquare } from 'lucide-react'
import { EmptyState } from '@/components/ui/empty-state'

export function MessagingApp() {
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null)

  return (
    <div className="container mx-auto p-4 max-w-7xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <MessageSquare className="w-8 h-8" aria-hidden="true" />
          Mensajes
        </h1>
        <p className="text-muted-foreground mt-2">
          Conversa con otros talentos de la comunidad
        </p>
      </div>

      <Card className="overflow-hidden">
        <div className="grid grid-cols-1 md:grid-cols-3 h-[calc(100vh-16rem)]">
          {/* Lista de conversaciones */}
          <div className={`border-r ${selectedConversation ? 'hidden md:block' : 'block'}`}>
            <div className="p-4 border-b bg-muted/50">
              <h2 className="font-semibold">Conversaciones</h2>
            </div>
            <ChatList
              onSelectConversation={setSelectedConversation}
              selectedConversationId={selectedConversation?.id}
            />
          </div>

          {/* Ventana de chat */}
          <div className={`md:col-span-2 ${selectedConversation ? 'block' : 'hidden md:block'}`}>
            {selectedConversation ? (
              <ChatWindow
                conversationId={selectedConversation.id}
                otherUser={selectedConversation.other_user}
                onBack={() => setSelectedConversation(null)}
              />
            ) : (
              <EmptyState
                icon={MessageSquare}
                title="Selecciona una conversación"
                description="Elige una conversación de la lista para comenzar a chatear"
                className="h-full"
              />
            )}
          </div>
        </div>
      </Card>
    </div>
  )
}
