import { createLazyFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Loader2, MapPin, Calendar, ArrowLeft, CheckCircle2, Lock, MessageCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { ReviewList } from '@/components/reviews/ReviewList'
import { PortfolioGallery } from '@/components/portfolio/PortfolioGallery'
import { getOrCreateConversation } from '@/services/messaging/messagingApi'
import { toast } from 'sonner'

export const Route = createLazyFileRoute('/auth/user/$username')({
  component: PublicProfile
})

interface PublicProfile {
  id: number
  username: string
  first_name: string
  last_name: string
  profile_image: string
  bio: string | null
  skills: string[]
  category: string | null
  is_verified: boolean
  is_private?: boolean
  location?: {
    city: string | null
    country: string | null
    latitude?: number
    longitude?: number
  }
  city?: string | null  // For backward compatibility
  country?: string | null  // For backward compatibility
  created_at: string
}

function PublicProfile() {
  const { username } = Route.useParams()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [profile, setProfile] = useState<PublicProfile | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [sendingMessage, setSendingMessage] = useState(false)

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

  const handleSendMessage = async () => {
    if (!profile?.id) return

    try {
      setSendingMessage(true)
      const result = await getOrCreateConversation(profile.id)

      toast.success('Redirigiendo a mensajes...')

      // Navegar a la página de mensajes
      navigate({ to: '/auth/messages' })
    } catch (error) {
      console.error('Error al crear conversación:', error)
      toast.error('No se pudo iniciar la conversación')
    } finally {
      setSendingMessage(false)
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

  // Handle both location object and direct city/country fields
  const city = profile.location?.city || profile.city
  const country = profile.location?.country || profile.country

  // Handle private profile
  if (profile.is_private) {
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
                <div className="flex items-center gap-2">
                  <CardTitle className="text-3xl">
                    {profile.first_name} {profile.last_name}
                  </CardTitle>
                  {profile.is_verified && (
                    <CheckCircle2 className="w-6 h-6 text-blue-500" />
                  )}
                </div>
                <CardDescription className="text-base">@{profile.username}</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Lock className="w-12 h-12 text-muted-foreground mb-4" />
            <p className="text-lg text-muted-foreground">Este perfil es privado</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-8 px-4 max-w-4xl">
      <div className="mb-4 flex items-center justify-between">
        <Link to="/auth/home">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Volver
          </Button>
        </Link>
        <Button
          onClick={handleSendMessage}
          disabled={sendingMessage}
          size="sm"
        >
          {sendingMessage ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <MessageCircle className="w-4 h-4 mr-2" />
          )}
          Enviar mensaje
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-start gap-6">
            <Avatar className="w-24 h-24">
              <AvatarImage src={profile.profile_image} alt={profile.username} />
              <AvatarFallback className="text-2xl">{initials}</AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <CardTitle className="text-3xl">
                  {profile.first_name} {profile.last_name}
                </CardTitle>
                {profile.is_verified && (
                  <CheckCircle2 className="w-6 h-6 text-blue-500" />
                )}
              </div>
              <CardDescription className="text-base">@{profile.username}</CardDescription>
              <div className="flex items-center gap-4 mt-3 text-sm text-muted-foreground">
                {(city || country) && (
                  <div className="flex items-center gap-1">
                    <MapPin className="w-4 h-4" />
                    <span>
                      {city && country
                        ? `${city}, ${country}`
                        : city || country}
                    </span>
                  </div>
                )}
                <div className="flex items-center gap-1">
                  <Calendar className="w-4 h-4" />
                  <span>Miembro desde {memberSince}</span>
                </div>
              </div>
              {profile.category && (
                <div className="mt-2">
                  <Badge variant="outline">{profile.category}</Badge>
                </div>
              )}
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

      {/* Portfolio Section */}
      <div className="mt-6">
        <Card>
          <CardHeader>
            <CardTitle>Portfolio</CardTitle>
            <CardDescription>Trabajos y proyectos de {profile.first_name}</CardDescription>
          </CardHeader>
          <CardContent>
            <PortfolioGallery username={username} />
          </CardContent>
        </Card>
      </div>

      {/* Reviews Section */}
      <div className="mt-6">
        <Card>
          <CardHeader>
            <CardTitle>Valoraciones</CardTitle>
            <CardDescription>Lo que otros dicen sobre {profile.first_name}</CardDescription>
          </CardHeader>
          <CardContent>
            <ReviewList username={username} />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
