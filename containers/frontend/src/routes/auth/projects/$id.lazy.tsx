import { createLazyFileRoute } from '@tanstack/react-router'
import { ProjectDetail } from '@/components/projects/ProjectDetail'

export const Route = createLazyFileRoute('/auth/projects/$id')({
  component: ProjectDetail
})
