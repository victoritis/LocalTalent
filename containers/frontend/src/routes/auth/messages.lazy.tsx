import { createLazyFileRoute } from '@tanstack/react-router'
import { MessagingApp } from '@/components/messaging/MessagingApp'
import { SocketProvider } from '@/context/socket'
import { z } from 'zod'

const messagesSearchSchema = z.object({
  conversation_id: z.number().optional()
})

export const Route = createLazyFileRoute('/auth/messages')({
  validateSearch: messagesSearchSchema,
  component: MessagesPage
})

function MessagesPage() {
  const { conversation_id } = Route.useSearch()

  return (
    <SocketProvider>
      <MessagingApp initialConversationId={conversation_id} />
    </SocketProvider>
  )
}
