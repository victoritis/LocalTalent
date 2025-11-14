import { createLazyFileRoute } from '@tanstack/react-router'
import AdvancedSearch from '@/components/search/AdvancedSearch'

export const Route = createLazyFileRoute('/auth/search')({
  component: AdvancedSearch
})
