import { useState } from 'react'
import { Card } from '@/components/ui/card'
import { ChatList } from './ChatList'
import { ChatWindow } from './ChatWindow'
import { Conversation } from '@/services/messaging/messagingApi'
import { MessageSquare } from 'lucide-react'

export function MessagingApp() {
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null)

  return (
    <div className="container mx-auto p-4 max-w-7xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <MessageSquare className="w-8 h-8" />
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
              <div className="flex flex-col items-center justify-center h-full text-center p-8">
                <MessageSquare className="w-16 h-16 text-muted-foreground mb-4 opacity-50" />
                <h3 className="text-lg font-semibold mb-2">Selecciona una conversación</h3>
                <p className="text-sm text-muted-foreground">
                  Elige una conversación de la lista para comenzar a chatear
                </p>
              </div>
            )}
          </div>
        </div>
      </Card>
    </div>
  )
}
