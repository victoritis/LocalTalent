import { createLazyFileRoute } from '@tanstack/react-router'
import { EventDetail } from '@/components/events/EventDetail'

export const Route = createLazyFileRoute('/auth/events/$id')({
  component: EventDetail
})
