import { useState, useEffect } from 'react'
import { Link } from '@tanstack/react-router'
import { getMyProjects, getMyMemberships, getMyProjectInvitations } from '@/services/projects/projectsApi'
import { Briefcase, Users, Mail, Clock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

export function MyProjects() {
  const [myProjects, setMyProjects] = useState<any[]>([])
  const [memberships, setMemberships] = useState<any[]>([])
  const [invitations, setInvitations] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadAllProjects()
  }, [])

  const loadAllProjects = async () => {
    try {
      setLoading(true)
      const [projectsData, membershipsData, invitationsData] = await Promise.all([
        getMyProjects(),
        getMyMemberships(),
        getMyProjectInvitations(),
      ])
      setMyProjects(projectsData.projects)
      setMemberships(membershipsData.memberships)
      setInvitations(invitationsData.invitations)
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

  const getRoleBadge = (role: string) => {
    const variants: Record<string, 'default' | 'secondary'> = {
      owner: 'default',
      collaborator: 'secondary',
      contributor: 'secondary',
    }
    return <Badge variant={variants[role] || 'secondary'}>{role}</Badge>
  }

  const ProjectCard = ({ project, membership }: any) => (
    <Card className="hover:shadow-lg transition-shadow">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-lg mb-1">{project.title}</CardTitle>
            <CardDescription className="flex items-center gap-2">
              {getStatusBadge(project.status)}
              {membership && getRoleBadge(membership.role)}
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-gray-600 mb-3 line-clamp-2">{project.description}</p>
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <Users className="h-3 w-3" />
            {project.active_members} miembros
            {project.max_members ? ` / ${project.max_members}` : ''}
          </div>
          {project.required_skills && project.required_skills.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {project.required_skills.slice(0, 3).map((skill: string, idx: number) => (
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
          {membership && (
            <div className="text-xs text-gray-500">
              Por {membership.project.creator.name}
            </div>
          )}
        </div>
        <Link to="/auth/projects/$projectId" params={{ projectId: project.id.toString() }}>
          <Button className="w-full mt-4" variant="outline" size="sm">
            Ver Detalles
          </Button>
        </Link>
      </CardContent>
    </Card>
  )

  const InvitationCard = ({ invitation }: any) => (
    <Card className="hover:shadow-lg transition-shadow border-blue-200">
      <CardHeader>
        <div className="flex items-start gap-3">
          <Mail className="h-5 w-5 text-blue-600 mt-1" />
          <div className="flex-1">
            <CardTitle className="text-lg mb-1">{invitation.project.title}</CardTitle>
            <CardDescription>
              {invitation.project.creator.name} te ha invitado como {invitation.role}
            </CardDescription>
          </div>
          <Badge>Nueva</Badge>
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-gray-600 mb-3">{invitation.project.description}</p>
        <div className="space-y-2 mb-4">
          <div className="flex items-center gap-2 text-sm text-gray-600">
            {getStatusBadge(invitation.project.status)}
            {getRoleBadge(invitation.role)}
          </div>
          {invitation.project.required_skills && invitation.project.required_skills.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {invitation.project.required_skills.slice(0, 3).map((skill: string, idx: number) => (
                <Badge key={idx} variant="outline" className="text-xs">
                  {skill}
                </Badge>
              ))}
            </div>
          )}
        </div>
        <Link to="/auth/projects/$projectId" params={{ projectId: invitation.project.id.toString() }}>
          <Button className="w-full" size="sm">
            Ver Invitación
          </Button>
        </Link>
      </CardContent>
    </Card>
  )

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Clock className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2 flex items-center gap-2">
          <Briefcase className="h-8 w-8" />
          Mis Proyectos
        </h1>
        <p className="text-gray-600">Gestiona tus proyectos y colaboraciones</p>
      </div>

      <Tabs defaultValue="created" className="space-y-6">
        <TabsList>
          <TabsTrigger value="created">
            Proyectos Creados ({myProjects.length})
          </TabsTrigger>
          <TabsTrigger value="memberships">
            Colaboraciones ({memberships.length})
          </TabsTrigger>
          <TabsTrigger value="invitations">
            Invitaciones ({invitations.length})
          </TabsTrigger>
        </TabsList>

        {/* Proyectos Creados */}
        <TabsContent value="created">
          {myProjects.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Briefcase className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                <p className="text-gray-600 mb-4">Aún no has creado ningún proyecto</p>
                <Link to="/auth/projects/create">
                  <Button>Crear Primer Proyecto</Button>
                </Link>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {myProjects.map((project) => (
                <ProjectCard key={project.id} project={project} />
              ))}
            </div>
          )}
        </TabsContent>

        {/* Colaboraciones */}
        <TabsContent value="memberships">
          {memberships.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Users className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                <p className="text-gray-600 mb-4">No eres miembro de ningún proyecto</p>
                <Link to="/auth/projects">
                  <Button>Explorar Proyectos</Button>
                </Link>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {memberships.map((membership) => (
                <ProjectCard
                  key={membership.membership_id}
                  project={membership.project}
                  membership={membership}
                />
              ))}
            </div>
          )}
        </TabsContent>

        {/* Invitaciones */}
        <TabsContent value="invitations">
          {invitations.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Mail className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                <p className="text-gray-600">No tienes invitaciones pendientes</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {invitations.map((invitation) => (
                <InvitationCard key={invitation.id} invitation={invitation} />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
