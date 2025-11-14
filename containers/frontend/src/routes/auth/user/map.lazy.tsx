import { createLazyFileRoute, Link } from '@tanstack/react-router'
import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Loader2, MapPin, Users, Map as MapIcon, List } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { InteractiveMap } from '@/components/map/InteractiveMap'

export const Route = createLazyFileRoute('/auth/user/map')({
  component: UserMap
})

interface UserLocation {
  id: number
  username: string
  first_name: string
  last_name: string
  profile_image: string
  city: string
  country: string
  latitude: number
  longitude: number
  skills: string[]
}

function UserMap() {
  const [loading, setLoading] = useState(true)
  const [users, setUsers] = useState<UserLocation[]>([])
  const [filteredUsers, setFilteredUsers] = useState<UserLocation[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [viewMode, setViewMode] = useState<'map' | 'list'>('map')
  const apiUrl = import.meta.env.VITE_REACT_APP_API_URL

  useEffect(() => {
    fetchUsers()
  }, [])

  useEffect(() => {
    if (searchQuery.trim() === '') {
      setFilteredUsers(users)
    } else {
      const query = searchQuery.toLowerCase()
      const filtered = users.filter(
        (user) =>
          user.first_name.toLowerCase().includes(query) ||
          user.last_name.toLowerCase().includes(query) ||
          user.username.toLowerCase().includes(query) ||
          user.city.toLowerCase().includes(query) ||
          user.country.toLowerCase().includes(query) ||
          user.skills.some((skill) => skill.toLowerCase().includes(query))
      )
      setFilteredUsers(filtered)
    }
  }, [searchQuery, users])

  const fetchUsers = async () => {
    try {
      const response = await fetch(`${apiUrl}/api/v1/users/map`, {
        credentials: 'include'
      })

      if (!response.ok) {
        throw new Error('Error al cargar usuarios')
      }

      const data = await response.json()
      setUsers(data.users || [])
      setFilteredUsers(data.users || [])
    } catch (error) {
      console.error('Error:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    )
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="mb-6">
        <div className="flex items-start justify-between gap-4 mb-2">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <MapPin className="w-8 h-8" />
              Mapa de Talento Local
            </h1>
            <p className="text-muted-foreground mt-2">
              Descubre talento cerca de ti y conecta con profesionales de todo el mundo
            </p>
          </div>

          {/* Toggle de vista */}
          <div className="flex gap-2">
            <Button
              variant={viewMode === 'map' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('map')}
              className="gap-2"
            >
              <MapIcon className="w-4 h-4" />
              Mapa
            </Button>
            <Button
              variant={viewMode === 'list' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('list')}
              className="gap-2"
            >
              <List className="w-4 h-4" />
              Lista
            </Button>
          </div>
        </div>
      </div>

      {/* Estadísticas */}
      <div className="grid gap-4 md:grid-cols-3 mb-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Usuarios</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{users.length}</div>
            <p className="text-xs text-muted-foreground">
              Con ubicación compartida
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Países</CardTitle>
            <MapPin className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {new Set(users.map((u) => u.country)).size}
            </div>
            <p className="text-xs text-muted-foreground">
              Diferentes países representados
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ciudades</CardTitle>
            <MapPin className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {new Set(users.map((u) => u.city)).size}
            </div>
            <p className="text-xs text-muted-foreground">
              Ciudades con talento registrado
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Búsqueda - Solo en vista de lista */}
      {viewMode === 'list' && (
        <div className="mb-6">
          <Input
            placeholder="Buscar por nombre, ciudad, país o habilidad..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="max-w-xl"
          />
        </div>
      )}

      {/* Vista de Mapa */}
      {viewMode === 'map' && (
        <>
          {users.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <MapPin className="w-12 h-12 text-muted-foreground mb-4" />
                <p className="text-lg text-muted-foreground mb-2">
                  Aún no hay usuarios con ubicación compartida
                </p>
                <p className="text-sm text-muted-foreground">
                  Sé el primero en agregar tu ubicación en{' '}
                  <Link to="/auth/user/profile" className="text-primary hover:underline">
                    tu perfil
                  </Link>
                </p>
              </CardContent>
            </Card>
          ) : (
            <InteractiveMap users={users} />
          )}
        </>
      )}

      {/* Vista de Lista */}
      {viewMode === 'list' && filteredUsers.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <MapPin className="w-12 h-12 text-muted-foreground mb-4" />
            <p className="text-lg text-muted-foreground mb-2">
              {users.length === 0
                ? 'Aún no hay usuarios con ubicación compartida'
                : 'No se encontraron usuarios con esos criterios'}
            </p>
            {users.length === 0 && (
              <p className="text-sm text-muted-foreground">
                Sé el primero en agregar tu ubicación en{' '}
                <Link to="/auth/user/profile" className="text-primary hover:underline">
                  tu perfil
                </Link>
              </p>
            )}
          </CardContent>
        </Card>
      ) : (
        viewMode === 'list' && (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredUsers.map((user) => {
              const initials = `${user.first_name?.[0] || ''}${user.last_name?.[0] || ''}`.toUpperCase()

              return (
                <Card key={user.id} className="hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <div className="flex items-start gap-4">
                      <Avatar className="w-16 h-16">
                        <AvatarImage src={user.profile_image} alt={user.username} />
                        <AvatarFallback>{initials}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <CardTitle className="text-lg truncate">
                          {user.first_name} {user.last_name}
                        </CardTitle>
                        <CardDescription className="truncate">
                          @{user.username}
                        </CardDescription>
                        <div className="flex items-center gap-1 mt-2 text-sm text-muted-foreground">
                          <MapPin className="w-3 h-3" />
                          <span className="truncate">
                            {user.city}, {user.country}
                          </span>
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                  {user.skills && user.skills.length > 0 && (
                    <CardContent>
                      <div className="flex flex-wrap gap-1">
                        {user.skills.slice(0, 3).map((skill, index) => (
                          <Badge key={index} variant="secondary" className="text-xs">
                            {skill}
                          </Badge>
                        ))}
                        {user.skills.length > 3 && (
                          <Badge variant="outline" className="text-xs">
                            +{user.skills.length - 3}
                          </Badge>
                        )}
                      </div>
                      <Link
                        to="/auth/user/$username"
                        params={{ username: user.username }}
                        className="text-sm text-primary hover:underline mt-3 inline-block"
                      >
                        Ver perfil completo →
                      </Link>
                    </CardContent>
                  )}
                </Card>
              )
            })}
          </div>
        )
      )}
    </div>
  )
}
