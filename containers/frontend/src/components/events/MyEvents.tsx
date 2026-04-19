import { useState, useEffect } from 'react'
import { Link } from '@tanstack/react-router'
import { getMyEvents, getMyRSVPs, getMyInvitations } from '@/services/events/eventsApi'
import { Calendar, MapPin, Users, Mail } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { formatDateTime } from '@/lib/date'
import { EmptyState } from '@/components/ui/empty-state'
import { GridCardSkeleton } from '@/components/ui/skeleton-presets'
import { useNavigate } from '@tanstack/react-router'

export function MyEvents() {
  const navigate = useNavigate()
  const [myEvents, setMyEvents] = useState<any[]>([])
  const [myRSVPs, setMyRSVPs] = useState<any[]>([])
  const [invitations, setInvitations] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadAllEvents()
  }, [])

  const loadAllEvents = async () => {
    try {
      setLoading(true)
      const [eventsData, rsvpsData, invitationsData] = await Promise.all([
        getMyEvents(),
        getMyRSVPs(),
        getMyInvitations(),
      ])
      setMyEvents(eventsData.events)
      setMyRSVPs(rsvpsData.rsvps)
      setInvitations(invitationsData.invitations)
    } catch (error) {
      console.error('Error loading events:', error)
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (dateString: string) => formatDateTime(dateString, "PPPp")

  const EventCard = ({ event, isRSVP = false, rsvpStatus = '' }: any) => (
    <Card className="hover:shadow-lg transition-shadow">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-lg mb-1">{event.title}</CardTitle>
            <CardDescription className="flex items-center gap-2 text-sm">
              <Calendar className="h-3 w-3" />
              {formatDate(event.start_date)}
            </CardDescription>
          </div>
          {rsvpStatus && (
            <Badge variant={rsvpStatus === 'confirmed' ? 'default' : 'secondary'}>
              {rsvpStatus}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-gray-600 mb-3 line-clamp-2">{event.description}</p>
        <div className="space-y-2 text-sm text-gray-600">
          <div className="flex items-center gap-2">
            {event.is_online ? (
              <>
                <span className="text-blue-600">Online</span>
              </>
            ) : (
              <>
                <MapPin className="h-3 w-3" />
                {event.location?.city || event.city}
              </>
            )}
          </div>
          {isRSVP && event.creator && (
            <div className="text-xs text-gray-500">
              Por {event.creator.name}
            </div>
          )}
          {!isRSVP && event.confirmed_attendees !== undefined && (
            <div className="flex items-center gap-2">
              <Users className="h-3 w-3" />
              {event.confirmed_attendees} asistentes
            </div>
          )}
        </div>
  <Link to="/auth/events/$id" params={{ id: event.id.toString() }}>
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
            <CardTitle className="text-lg mb-1">{invitation.event.title}</CardTitle>
            <CardDescription>
              {invitation.inviter.name} te ha invitado
            </CardDescription>
          </div>
          <Badge>Nueva</Badge>
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-gray-600 mb-3">{invitation.event.description}</p>
        <div className="text-sm text-gray-600 mb-4">
          <div className="flex items-center gap-2">
            <Calendar className="h-3 w-3" />
            {formatDate(invitation.event.start_date)}
          </div>
        </div>
        {invitation.message && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
            <p className="text-sm text-blue-900">"{invitation.message}"</p>
          </div>
        )}
  <Link to="/auth/events/$id" params={{ id: invitation.event.id.toString() }}>
          <Button className="w-full" size="sm">
            Ver Invitación
          </Button>
        </Link>
      </CardContent>
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
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2 flex items-center gap-2">
          <Calendar className="h-8 w-8" aria-hidden="true" />
          Mis Eventos
        </h1>
        <p className="text-gray-600">Gestiona tus eventos y asistencias</p>
      </div>

      <Tabs defaultValue="created" className="space-y-6">
        <TabsList>
          <TabsTrigger value="created">
            Eventos Creados ({myEvents.length})
          </TabsTrigger>
          <TabsTrigger value="attending">
            Asistencias ({myRSVPs.filter((r) => r.status === 'confirmed').length})
          </TabsTrigger>
          <TabsTrigger value="invitations">
            Invitaciones ({invitations.length})
          </TabsTrigger>
        </TabsList>

        {/* Eventos Creados */}
        <TabsContent value="created">
          {myEvents.length === 0 ? (
            <EmptyState
              icon={Calendar}
              title="Aún no has creado ningún evento"
              action={{
                label: "Crear Primer Evento",
                onClick: () => navigate({ to: "/auth/events/create" }),
              }}
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {myEvents.map((event) => (
                <EventCard key={event.id} event={event} />
              ))}
            </div>
          )}
        </TabsContent>

        {/* Asistencias */}
        <TabsContent value="attending">
          {myRSVPs.length === 0 ? (
            <EmptyState
              icon={Users}
              title="No has confirmado asistencia a ningún evento"
              action={{
                label: "Explorar Eventos",
                onClick: () => navigate({ to: "/auth/events" }),
              }}
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {myRSVPs.map((rsvp) => (
                <EventCard
                  key={rsvp.rsvp_id}
                  event={rsvp.event}
                  isRSVP={true}
                  rsvpStatus={rsvp.status}
                />
              ))}
            </div>
          )}
        </TabsContent>

        {/* Invitaciones */}
        <TabsContent value="invitations">
          {invitations.length === 0 ? (
            <EmptyState
              icon={Mail}
              title="No tienes invitaciones pendientes"
            />
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
