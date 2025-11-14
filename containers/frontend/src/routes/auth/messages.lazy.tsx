import { createLazyFileRoute } from '@tanstack/react-router'
import { MessagingApp } from '@/components/messaging/MessagingApp'
import { SocketProvider } from '@/context/socket'

export const Route = createLazyFileRoute('/auth/messages')({
  component: () => (
    <SocketProvider>
      <MessagingApp />
    </SocketProvider>
  )
})
