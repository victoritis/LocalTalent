import { createLazyFileRoute } from '@tanstack/react-router'
import { MyProjects } from '@/components/projects/MyProjects'

export const Route = createLazyFileRoute('/auth/projects/my')({
  component: MyProjects
})
