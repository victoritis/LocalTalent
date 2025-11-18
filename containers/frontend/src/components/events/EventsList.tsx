import { useState, useEffect } from 'react'
import { Link } from '@tanstack/react-router'
import { getEvents, getNearbyEvents, Event } from '@/services/events/eventsApi'
import { Calendar, MapPin, Users, Video, Clock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

export function EventsList() {
  const [events, setEvents] = useState<Event[]>([])
  const [nearbyEvents, setNearbyEvents] = useState<Event[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('all')

  useEffect(() => {
    loadEvents()
  }, [])

  const loadEvents = async () => {
    try {
      setLoading(true)
      const [allEventsData, nearbyData] = await Promise.all([
        getEvents({ upcoming_only: true, per_page: 20 }),
        getNearbyEvents({ radius: 50 }).catch(() => ({ events: [], total: 0, radius_km: 0 })),
      ])
      setEvents(allEventsData.events)
      setNearbyEvents(nearbyData.events)
    } catch (error) {
      console.error('Error loading events:', error)
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('es-ES', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const EventCard = ({ event }: { event: Event }) => (
    <Card className="hover:shadow-lg transition-shadow">
      <CardHeader>
        {event.image_url && (
          <img src={event.image_url} alt={event.title} className="w-full h-48 object-cover rounded-t-lg mb-4" />
        )}
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-xl mb-2">{event.title}</CardTitle>
            <CardDescription className="flex items-center gap-2 text-sm">
              <span className="flex items-center gap-1">
                <Calendar className="h-4 w-4" />
                {formatDate(event.start_date)}
              </span>
            </CardDescription>
          </div>
          <Badge variant={event.is_full ? 'destructive' : 'default'}>
            {event.is_full ? 'Completo' : 'Disponible'}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-gray-600 mb-4 line-clamp-2">{event.description}</p>
        <div className="space-y-2 text-sm">
          <div className="flex items-center gap-2 text-gray-600">
            {event.is_online ? (
              <>
                <Video className="h-4 w-4" />
                <span>Evento online</span>
              </>
            ) : (
              <>
                <MapPin className="h-4 w-4" />
                <span>
                  {event.location?.city}, {event.location?.country}
                </span>
              </>
            )}
          </div>
          {event.distance !== undefined && (
            <div className="flex items-center gap-2 text-gray-600">
              <MapPin className="h-4 w-4" />
              <span>A {event.distance} km de ti</span>
            </div>
          )}
          <div className="flex items-center gap-2 text-gray-600">
            <Users className="h-4 w-4" />
            <span>
              {event.confirmed_attendees}
              {event.max_attendees ? ` / ${event.max_attendees}` : ''} asistentes
            </span>
          </div>
          <div className="flex items-center gap-2">
            <img
              src={event.creator.image || '/static/default_profile.png'}
              alt={event.creator.name}
              className="h-6 w-6 rounded-full"
            />
            <span className="text-sm text-gray-600">Por {event.creator.name}</span>
          </div>
        </div>
        {event.category && (
          <div className="mt-3">
            <Badge variant="outline">{event.category}</Badge>
          </div>
        )}
      </CardContent>
      <CardFooter>
        <Link to="/auth/events/$id" params={{ id: event.id.toString() }} className="w-full">
          <Button className="w-full">Ver detalles</Button>
        </Link>
      </CardFooter>
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
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold mb-2">Eventos</h1>
          <p className="text-gray-600">Descubre eventos de networking y colaboración cerca de ti</p>
        </div>
        <Link to="/auth/events/create">
          <Button>Crear Evento</Button>
        </Link>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-6">
        <TabsList>
          <TabsTrigger value="all">Todos los eventos ({events.length})</TabsTrigger>
          <TabsTrigger value="nearby">Eventos cercanos ({nearbyEvents.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="mt-6">
          {events.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Calendar className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                <p className="text-gray-600">No hay eventos disponibles en este momento</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {events.map((event) => (
                <EventCard key={event.id} event={event} />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="nearby" className="mt-6">
          {nearbyEvents.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <MapPin className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                <p className="text-gray-600">No hay eventos cercanos a tu ubicación</p>
                <p className="text-sm text-gray-500 mt-2">
                  Asegúrate de tener tu ubicación configurada en tu perfil
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {nearbyEvents.map((event) => (
                <EventCard key={event.id} event={event} />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
