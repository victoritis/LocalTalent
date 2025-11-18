import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from '@tanstack/react-router'
import {
  getProject,
  addMember,
  removeMember,
  updateMemberRole,
  deleteProject,
  Project,
} from '@/services/projects/projectsApi'
import { Briefcase, Users, Calendar, Edit, Trash2, UserPlus, Crown, Shield, User as UserIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Separator } from '@/components/ui/separator'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { toast } from 'sonner'
import { useAuth } from '@/auth'

export function ProjectDetail() {
  const { projectId } = useParams({ strict: false })
  const navigate = useNavigate()
  const { user } = useAuth()
  const [project, setProject] = useState<Project | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (projectId) {
      loadProject()
    }
  }, [projectId])

  const loadProject = async () => {
    try {
      setLoading(true)
      const data = await getProject(Number(projectId))
      setProject(data)
    } catch (error: any) {
      console.error('Error loading project:', error)
      toast.error(error.response?.data?.error || 'Error al cargar el proyecto')
    } finally {
      setLoading(false)
    }
  }

  const handleJoinProject = async () => {
    try {
      await addMember(Number(projectId))
      toast.success('¡Te has unido al proyecto!')
      await loadProject()
    } catch (error: any) {
      console.error('Error joining project:', error)
      toast.error(error.response?.data?.error || 'Error al unirse al proyecto')
    }
  }

  const handleLeaveProject = async () => {
    if (!confirm('¿Estás seguro de que deseas salir del proyecto?')) return

    try {
      await removeMember(Number(projectId), user?.user_id!)
      toast.success('Has salido del proyecto')
      await loadProject()
    } catch (error: any) {
      console.error('Error leaving project:', error)
      toast.error(error.response?.data?.error || 'Error al salir del proyecto')
    }
  }

  const handleRemoveMember = async (userId: number, userName: string) => {
    if (!confirm(`¿Estás seguro de que deseas remover a ${userName} del proyecto?`)) return

    try {
      await removeMember(Number(projectId), userId)
      toast.success('Miembro removido del proyecto')
      await loadProject()
    } catch (error: any) {
      console.error('Error removing member:', error)
      toast.error(error.response?.data?.error || 'Error al remover miembro')
    }
  }

  const handleChangeRole = async (userId: number, newRole: string) => {
    try {
      await updateMemberRole(Number(projectId), userId, newRole)
      toast.success('Rol actualizado correctamente')
      await loadProject()
    } catch (error: any) {
      console.error('Error updating role:', error)
      toast.error(error.response?.data?.error || 'Error al actualizar el rol')
    }
  }

  const handleDeleteProject = async () => {
    if (!confirm('¿Estás seguro de que deseas eliminar este proyecto?')) return

    try {
      await deleteProject(Number(projectId))
      toast.success('Proyecto eliminado correctamente')
      navigate({ to: '/projects' })
    } catch (error: any) {
      console.error('Error deleting project:', error)
      toast.error(error.response?.data?.error || 'Error al eliminar el proyecto')
    }
  }

  const getRoleBadge = (role: string) => {
    const icons = {
      owner: <Crown className="h-3 w-3" />,
      collaborator: <Shield className="h-3 w-3" />,
      contributor: <UserIcon className="h-3 w-3" />,
    }
    return (
      <Badge variant={role === 'owner' ? 'default' : 'secondary'} className="flex items-center gap-1">
        {icons[role as keyof typeof icons]}
        {role}
      </Badge>
    )
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

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div>
      </div>
    )
  }

  if (!project) {
    return (
      <div className="container mx-auto py-8 px-4">
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-gray-600">Proyecto no encontrado</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  const isCreator = user?.user_id === project.creator.id
  const userMembership = project.user_membership
  const isMember = !!userMembership && userMembership.status === 'active'
  const isOwner = userMembership?.role === 'owner'
  const canManageMembers = isCreator || isOwner

  return (
    <div className="container mx-auto py-8 px-4 max-w-6xl">
      {/* Header con imagen */}
      {project.image_url && (
        <div className="mb-6 rounded-lg overflow-hidden">
          <img src={project.image_url} alt={project.title} className="w-full h-64 object-cover" />
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Columna principal */}
        <div className="lg:col-span-2 space-y-6">
          {/* Información del proyecto */}
          <Card>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <CardTitle className="text-3xl mb-3">{project.title}</CardTitle>
                  <div className="flex gap-2">
                    {getStatusBadge(project.status)}
                    {project.category && <Badge variant="outline">{project.category}</Badge>}
                    {project.stats?.is_full && <Badge variant="destructive">Completo</Badge>}
                    {!project.is_public && <Badge variant="secondary">Privado</Badge>}
                  </div>
                </div>
                {isCreator && (
                  <div className="flex gap-2">
                    <Link to="/auth/projects/$id" params={{ id: projectId! }}>
                      <Button variant="outline" size="sm">
                        <Edit className="h-4 w-4 mr-1" />
                        Editar
                      </Button>
                    </Link>
                    <Button variant="destructive" size="sm" onClick={handleDeleteProject}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-gray-700 whitespace-pre-line">{project.description}</p>

              <Separator />

              <div className="space-y-3">
                {(project.start_date || project.end_date) && (
                  <div className="flex items-start gap-3">
                    <Calendar className="h-5 w-5 text-gray-500 mt-0.5" />
                    <div>
                      <p className="font-medium">Duración</p>
                      {project.start_date && (
                        <p className="text-sm text-gray-600">
                          Inicio: {new Date(project.start_date).toLocaleDateString('es-ES')}
                        </p>
                      )}
                      {project.end_date && (
                        <p className="text-sm text-gray-600">
                          Fin: {new Date(project.end_date).toLocaleDateString('es-ES')}
                        </p>
                      )}
                    </div>
                  </div>
                )}

                <div className="flex items-start gap-3">
                  <Users className="h-5 w-5 text-gray-500 mt-0.5" />
                  <div>
                    <p className="font-medium">Miembros</p>
                    <p className="text-sm text-gray-600">
                      {project.stats?.active_members || 0}
                      {project.max_members ? ` de ${project.max_members}` : ''} miembros activos
                    </p>
                  </div>
                </div>

                {project.required_skills && project.required_skills.length > 0 && (
                  <div>
                    <p className="font-medium mb-2">Habilidades Requeridas</p>
                    <div className="flex flex-wrap gap-2">
                      {project.required_skills.map((skill, idx) => (
                        <Badge key={idx} variant="outline">
                          {skill}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex items-start gap-3">
                  <UserIcon className="h-5 w-5 text-gray-500 mt-0.5" />
                  <div>
                    <p className="font-medium">Creado por</p>
                    <Link to={`/profile/${project.creator.username}`} className="text-sm text-blue-600 hover:underline">
                      {project.creator.name}
                    </Link>
                  </div>
                </div>
              </div>
            </CardContent>

            {!isMember && !isCreator && (
              <div className="p-6 border-t">
                <Button className="w-full" onClick={handleJoinProject} disabled={project.stats?.is_full}>
                  <UserPlus className="h-4 w-4 mr-2" />
                  {project.stats?.is_full ? 'Proyecto Completo' : 'Unirse al Proyecto'}
                </Button>
              </div>
            )}

            {isMember && !isCreator && (
              <div className="p-6 border-t">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Badge>Miembro activo</Badge>
                    {userMembership && getRoleBadge(userMembership.role)}
                  </div>
                  <Button variant="outline" size="sm" onClick={handleLeaveProject}>
                    Salir del proyecto
                  </Button>
                </div>
              </div>
            )}
          </Card>
        </div>

        {/* Sidebar - Miembros */}
        <div>
          <Card>
            <CardHeader>
              <CardTitle>Miembros ({project.members?.length || 0})</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {project.members && project.members.length > 0 ? (
                  project.members.map((member) => (
                    <div
                      key={member.id}
                      className="flex items-center justify-between p-2 hover:bg-gray-50 rounded-lg transition-colors"
                    >
                      <Link to={`/profile/${member.username}`} className="flex items-center gap-3 flex-1">
                        <Avatar>
                          <AvatarImage src={member.image} />
                          <AvatarFallback>{member.name[0]}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <p className="text-sm font-medium">{member.name}</p>
                          <p className="text-xs text-gray-500">@{member.username}</p>
                          <div className="mt-1">{getRoleBadge(member.role)}</div>
                        </div>
                      </Link>

                      {canManageMembers && member.id !== project.creator.id && member.id !== user?.user_id && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              •••
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {member.role !== 'owner' && (
                              <DropdownMenuItem onClick={() => handleChangeRole(member.id, 'owner')}>
                                Hacer Owner
                              </DropdownMenuItem>
                            )}
                            {member.role !== 'collaborator' && (
                              <DropdownMenuItem onClick={() => handleChangeRole(member.id, 'collaborator')}>
                                Hacer Collaborator
                              </DropdownMenuItem>
                            )}
                            {member.role !== 'contributor' && (
                              <DropdownMenuItem onClick={() => handleChangeRole(member.id, 'contributor')}>
                                Hacer Contributor
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem
                              className="text-red-600"
                              onClick={() => handleRemoveMember(member.id, member.name)}
                            >
                              Remover del proyecto
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-gray-500 text-center py-4">Aún no hay miembros en el proyecto</p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
