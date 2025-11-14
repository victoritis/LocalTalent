import { createLazyFileRoute } from '@tanstack/react-router'
import MyEvents from '@/components/events/MyEvents'

export const Route = createLazyFileRoute('/auth/events/my')({
  component: MyEvents
})
