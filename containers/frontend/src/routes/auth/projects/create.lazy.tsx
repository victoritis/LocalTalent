import { createLazyFileRoute } from '@tanstack/react-router'
import { ProjectCreate } from '@/components/projects/ProjectCreate'

export const Route = createLazyFileRoute('/auth/projects/create')({
  component: ProjectCreate
})
