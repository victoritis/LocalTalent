import { createLazyFileRoute } from '@tanstack/react-router'
import { NotificationSettings } from '@/components/notifications/NotificationSettings'

export const Route = createLazyFileRoute('/auth/settings/notifications')({
  component: NotificationSettings
})
