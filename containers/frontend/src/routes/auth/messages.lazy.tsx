import { createLazyFileRoute } from '@tanstack/react-router'
import { MessagingApp } from '@/components/messaging/MessagingApp'

export const Route = createLazyFileRoute('/auth/messages')({
  component: MessagingApp
})
