import { useState, useEffect } from 'react'
import { Link } from '@tanstack/react-router'
import { getProjects, Project } from '@/services/projects/projectsApi'
import { Briefcase, Users, Calendar } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { EmptyState } from '@/components/ui/empty-state'
import { GridCardSkeleton } from '@/components/ui/skeleton-presets'

export function ProjectsList() {
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadProjects()
  }, [])

  const loadProjects = async () => {
    try {
      setLoading(true)
      const data = await getProjects({ per_page: 20 })
      setProjects(data.projects)
    } catch (error) {
      console.error('Error loading projects:', error)
    } finally {
      setLoading(false)
    }
  }

  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
      draft: 'secondary',
      active: 'default',
      completed: 'outline',
      cancelled: 'destructive',
    }
    return <Badge variant={variants[status] || 'default'}>{status}</Badge>
  }

  const ProjectCard = ({ project }: { project: Project }) => (
    <Card className="hover:shadow-lg transition-shadow">
      <CardHeader>
        {project.image_url && (
          <img
            src={project.image_url}
            alt={`Imagen del proyecto: ${project.title}`}
            loading="lazy"
            className="w-full aspect-video object-cover rounded-t-lg mb-4"
          />
        )}
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-xl mb-2">{project.title}</CardTitle>
            <CardDescription className="flex items-center gap-2">
              {getStatusBadge(project.status)}
            </CardDescription>
          </div>
          {project.is_full && <Badge variant="destructive">Completo</Badge>}
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-gray-600 mb-4 line-clamp-3">{project.description}</p>
        <div className="space-y-2 text-sm">
          <div className="flex items-center gap-2 text-gray-600">
            <Users className="h-4 w-4" />
            <span>
              {project.active_members}
              {project.max_members ? ` / ${project.max_members}` : ''} miembros
            </span>
          </div>
          {project.required_skills && project.required_skills.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-3">
              {project.required_skills.slice(0, 3).map((skill, idx) => (
                <Badge key={idx} variant="outline" className="text-xs">
                  {skill}
                </Badge>
              ))}
              {project.required_skills.length > 3 && (
                <Badge variant="outline" className="text-xs">
                  +{project.required_skills.length - 3}
                </Badge>
              )}
            </div>
          )}
          <div className="flex items-center gap-2 mt-3">
            <img
              src={project.creator.image || '/static/default_profile.png'}
              alt={project.creator.name}
              className="h-6 w-6 rounded-full"
            />
            <span className="text-sm text-gray-600">Por {project.creator.name}</span>
          </div>
        </div>
      </CardContent>
      <CardFooter>
        <Link to="/auth/projects/$id" params={{ id: project.id.toString() }} className="w-full">
          <Button className="w-full">Ver detalles</Button>
        </Link>
      </CardFooter>
    </Card>
  )

  if (loading) {
    return (
      <div className="container mx-auto py-8 px-4">
        <GridCardSkeleton count={6} />
      </div>
    )
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold mb-2">Proyectos Colaborativos</h1>
          <p className="text-gray-600">Encuentra proyectos donde colaborar o crea el tuyo</p>
        </div>
        <Link to="/auth/projects/create">
          <Button>Crear Proyecto</Button>
        </Link>
      </div>

      {projects.length === 0 ? (
        <Card>
          <CardContent>
            <EmptyState
              icon={Briefcase}
              title="No hay proyectos disponibles"
              description="Crea uno nuevo para empezar a encontrar colaboradores."
            />
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {projects.map((project) => (
            <ProjectCard key={project.id} project={project} />
          ))}
        </div>
      )}
    </div>
  )
}
