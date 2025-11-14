import { createLazyFileRoute } from '@tanstack/react-router'
import ProjectsList from '@/components/projects/ProjectsList'

export const Route = createLazyFileRoute('/auth/projects/')({
  component: ProjectsList
})
