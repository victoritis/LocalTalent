import { createFileRoute, Outlet } from '@tanstack/react-router'

export const Route = createFileRoute('/auth/events')({
  component: () => <Outlet />
})
