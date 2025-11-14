import { useState, useEffect } from 'react'
import { Link } from '@tanstack/react-router'
import { getBlockedUsers, unblockUser, BlockedUser } from '@/services/security/securityApi'
import { Shield, UserX, Unlock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { toast } from 'sonner'

export function BlockedUsers() {
  const [blockedUsers, setBlockedUsers] = useState<BlockedUser[]>([])
  const [loading, setLoading] = useState(true)
  const [unblocking, setUnblocking] = useState<number | null>(null)

  useEffect(() => {
    loadBlockedUsers()
  }, [])

  const loadBlockedUsers = async () => {
    try {
      setLoading(true)
      const data = await getBlockedUsers()
      setBlockedUsers(data.blocked_users)
    } catch (error) {
      console.error('Error loading blocked users:', error)
      toast.error('Error al cargar usuarios bloqueados')
    } finally {
      setLoading(false)
    }
  }

  const handleUnblock = async (userId: number, userName: string) => {
    if (!confirm(`¿Estás seguro de que deseas desbloquear a ${userName}?`)) return

    try {
      setUnblocking(userId)
      await unblockUser(userId)
      toast.success(`Has desbloqueado a ${userName}`)
      await loadBlockedUsers()
    } catch (error: any) {
      console.error('Error unblocking user:', error)
      toast.error(error.response?.data?.error || 'Error al desbloquear usuario')
    } finally {
      setUnblocking(null)
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('es-ES', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-8 px-4 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2 flex items-center gap-2">
          <UserX className="h-8 w-8" />
          Usuarios Bloqueados
        </h1>
        <p className="text-gray-600">Gestiona los usuarios que has bloqueado</p>
      </div>

      {blockedUsers.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Shield className="h-12 w-12 mx-auto text-gray-400 mb-4" />
            <p className="text-gray-600 mb-2">No has bloqueado a ningún usuario</p>
            <p className="text-sm text-gray-500">Los usuarios bloqueados no podrán interactuar contigo</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {blockedUsers.map((blocked) => (
            <Card key={blocked.block_id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-4">
                    <Link to={`/profile/${blocked.user.username}`}>
                      <Avatar className="h-12 w-12">
                        <AvatarImage src={blocked.user.image} />
                        <AvatarFallback>{blocked.user.name[0]}</AvatarFallback>
                      </Avatar>
                    </Link>
                    <div>
                      <CardTitle className="text-lg">
                        <Link
                          to={`/profile/${blocked.user.username}`}
                          className="hover:underline"
                        >
                          {blocked.user.name}
                        </Link>
                      </CardTitle>
                      <CardDescription>@{blocked.user.username}</CardDescription>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleUnblock(blocked.user.id, blocked.user.name)}
                    disabled={unblocking === blocked.user.id}
                  >
                    <Unlock className="h-4 w-4 mr-2" />
                    {unblocking === blocked.user.id ? 'Desbloqueando...' : 'Desbloquear'}
                  </Button>
                </div>
              </CardHeader>
              {blocked.reason && (
                <CardContent>
                  <div className="text-sm">
                    <span className="font-medium text-gray-700">Razón:</span>{' '}
                    <span className="text-gray-600">{blocked.reason}</span>
                  </div>
                  <div className="text-xs text-gray-500 mt-2">
                    Bloqueado el {formatDate(blocked.blocked_at)}
                  </div>
                </CardContent>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
