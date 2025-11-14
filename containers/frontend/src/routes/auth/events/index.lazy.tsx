import { createLazyFileRoute } from '@tanstack/react-router'
import EventsList from '@/components/events/EventsList'

export const Route = createLazyFileRoute('/auth/events/')({
  component: EventsList
})
