import { createLazyFileRoute, Link } from '@tanstack/react-router'
import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Loader2, MapPin, Calendar, ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

export const Route = createLazyFileRoute('/auth/user/$username')({
  component: PublicProfile
})

interface PublicProfile {
  username: string
  first_name: string
  last_name: string
  profile_image: string
  bio: string | null
  skills: string[]
  city: string | null
  country: string | null
  created_at: string
}

function PublicProfile() {
  const { username } = Route.useParams()
  const [loading, setLoading] = useState(true)
  const [profile, setProfile] = useState<PublicProfile | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchProfile()
  }, [username])

  const fetchProfile = async () => {
    try {
      const response = await fetch(`/api/v1/profile/${username}`, {
        credentials: 'include'
      })

      if (!response.ok) {
        if (response.status === 404) {
          setError('Usuario no encontrado')
        } else {
          setError('Error al cargar el perfil')
        }
        return
      }

      const data = await response.json()
      setProfile(data)
    } catch (error) {
      setError('Error al cargar el perfil')
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

  if (error || !profile) {
    return (
      <div className="container mx-auto py-8 px-4 max-w-4xl">
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <p className="text-lg text-muted-foreground mb-4">{error || 'No se pudo cargar el perfil'}</p>
            <Link to="/auth/home">
              <Button variant="outline">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Volver al inicio
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    )
  }

  const initials = `${profile.first_name?.[0] || ''}${profile.last_name?.[0] || ''}`.toUpperCase()
  const memberSince = profile.created_at
    ? format(new Date(profile.created_at), "MMMM yyyy", { locale: es })
    : 'Desconocido'

  return (
    <div className="container mx-auto py-8 px-4 max-w-4xl">
      <div className="mb-4">
        <Link to="/auth/home">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Volver
          </Button>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-start gap-6">
            <Avatar className="w-24 h-24">
              <AvatarImage src={profile.profile_image} alt={profile.username} />
              <AvatarFallback className="text-2xl">{initials}</AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <CardTitle className="text-3xl mb-2">
                {profile.first_name} {profile.last_name}
              </CardTitle>
              <CardDescription className="text-base">@{profile.username}</CardDescription>
              <div className="flex items-center gap-4 mt-3 text-sm text-muted-foreground">
                {(profile.city || profile.country) && (
                  <div className="flex items-center gap-1">
                    <MapPin className="w-4 h-4" />
                    <span>
                      {profile.city && profile.country
                        ? `${profile.city}, ${profile.country}`
                        : profile.city || profile.country}
                    </span>
                  </div>
                )}
                <div className="flex items-center gap-1">
                  <Calendar className="w-4 h-4" />
                  <span>Miembro desde {memberSince}</span>
                </div>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Biografía */}
          {profile.bio && (
            <div>
              <h3 className="text-lg font-semibold mb-2">Sobre mí</h3>
              <p className="text-muted-foreground whitespace-pre-wrap">{profile.bio}</p>
            </div>
          )}

          {/* Habilidades */}
          {profile.skills && profile.skills.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold mb-3">Habilidades</h3>
              <div className="flex flex-wrap gap-2">
                {profile.skills.map((skill, index) => (
                  <Badge key={index} variant="secondary" className="text-sm py-1 px-3">
                    {skill}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Mensaje si no hay información */}
          {!profile.bio && (!profile.skills || profile.skills.length === 0) && (
            <div className="text-center py-8 text-muted-foreground">
              <p>Este usuario aún no ha completado su perfil.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
