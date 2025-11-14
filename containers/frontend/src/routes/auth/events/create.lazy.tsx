import { createLazyFileRoute } from '@tanstack/react-router'
import EventCreate from '@/components/events/EventCreate'

export const Route = createLazyFileRoute('/auth/events/create')({
  component: EventCreate
})
