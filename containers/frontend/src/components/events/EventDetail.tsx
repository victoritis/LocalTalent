import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate, Link } from '@tanstack/react-router'
import {
  getEvent,
  createRSVP,
  cancelRSVP,
  getEventMessages,
  sendEventMessage,
  deleteEvent,
  Event,
  EventMessage as EventMessageType
} from '@/services/events/eventsApi'
import { Calendar, MapPin, Users, Video, Clock, User, Send, Edit, Trash2, CheckCircle, XCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Input } from '@/components/ui/input'
import { Separator } from '@/components/ui/separator'
import { toast } from 'sonner'
import { useAuth } from '@/auth'

export function EventDetail() {
  const { id } = useParams({ strict: false })
  const navigate = useNavigate()
  const { user } = useAuth()
  const [event, setEvent] = useState<Event | null>(null)
  const [messages, setMessages] = useState<EventMessageType[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [loading, setLoading] = useState(true)
  const [sendingMessage, setSendingMessage] = useState(false)
  const [processingRSVP, setProcessingRSVP] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    let cancelled = false
    if (!id) return

    ;(async () => {
      try {
        setLoading(true)
        const eventData = await getEvent(Number(id))
        if (cancelled) return
        setEvent(eventData)

        if (eventData.user_rsvp?.status === 'confirmed') {
          const messagesData = await getEventMessages(Number(id))
          if (cancelled) return
          setMessages(messagesData.messages)
        }
      } catch (error: any) {
        console.error('Error loading event:', error)
        toast.error(error.response?.data?.error || 'Error al cargar el evento')
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [id])

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const loadEventData = async () => {
    try {
      setLoading(true)
  const eventData = await getEvent(Number(id))
      setEvent(eventData)

      // Cargar mensajes si el usuario confirmó asistencia
      if (eventData.user_rsvp?.status === 'confirmed') {
  const messagesData = await getEventMessages(Number(id))
        setMessages(messagesData.messages)
      }
    } catch (error: any) {
      console.error('Error loading event:', error)
      toast.error(error.response?.data?.error || 'Error al cargar el evento')
    } finally {
      setLoading(false)
    }
  }

  const handleRSVP = async (status: 'confirmed' | 'declined') => {
    try {
      setProcessingRSVP(true)
  await createRSVP(Number(id), { status })
      toast.success(status === 'confirmed' ? '¡Asistencia confirmada!' : 'Asistencia declinada')
      await loadEventData()
    } catch (error: any) {
      console.error('Error processing RSVP:', error)
      toast.error(error.response?.data?.error || 'Error al procesar la respuesta')
    } finally {
      setProcessingRSVP(false)
    }
  }

  const handleCancelRSVP = async () => {
    try {
      setProcessingRSVP(true)
  await cancelRSVP(Number(id))
      toast.success('Asistencia cancelada')
      await loadEventData()
    } catch (error: any) {
      console.error('Error canceling RSVP:', error)
      toast.error(error.response?.data?.error || 'Error al cancelar la asistencia')
    } finally {
      setProcessingRSVP(false)
    }
  }

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newMessage.trim()) return

    try {
      setSendingMessage(true)
      const response = await sendEventMessage(Number(id), newMessage)

      // Si la respuesta no incluye sender (inconsistencia), recargar mensajes
      if (!response.event_message.sender) {
        const messagesData = await getEventMessages(Number(id))
        setMessages(messagesData.messages)
      } else {
        setMessages([...messages, response.event_message])
      }
      setNewMessage('')
    } catch (error: any) {
      console.error('Error sending message:', error)
      toast.error(error.response?.data?.error || 'Error al enviar el mensaje')
    } finally {
      setSendingMessage(false)
    }
  }

  const handleDeleteEvent = async () => {
    if (!confirm('¿Estás seguro de que deseas eliminar este evento?')) return

    try {
  await deleteEvent(Number(id))
      toast.success('Evento eliminado correctamente')
      navigate({ to: '/events' })
    } catch (error: any) {
      console.error('Error deleting event:', error)
      toast.error(error.response?.data?.error || 'Error al eliminar el evento')
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('es-ES', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const formatMessageTime = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Clock className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  if (!event) {
    return (
      <div className="container mx-auto py-8 px-4">
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-gray-600">Evento no encontrado</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  const isCreator = user?.user_id === event.creator.id
  const hasConfirmed = event.user_rsvp?.status === 'confirmed'
  const hasRSVP = !!event.user_rsvp

  return (
    <div className="container mx-auto py-8 px-4 max-w-6xl">
      {/* Header con imagen */}
      {event.image_url && (
        <div className="mb-6 rounded-lg overflow-hidden">
          <img src={event.image_url} alt={event.title} className="w-full h-64 object-cover" />
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Columna principal */}
        <div className="lg:col-span-2 space-y-6">
          {/* Información del evento */}
          <Card>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <CardTitle className="text-3xl mb-3">{event.title}</CardTitle>
                  <div className="flex gap-2">
                    <Badge>{event.event_type}</Badge>
                    {event.category && <Badge variant="outline">{event.category}</Badge>}
                    {event.is_full && <Badge variant="destructive">Completo</Badge>}
                  </div>
                </div>
                {isCreator && (
                  <div className="flex gap-2">
                    <Link to="/auth/events/$id" params={{ id: eventId! }}>
                      <Button variant="outline" size="sm">
                        <Edit className="h-4 w-4 mr-1" />
                        Editar
                      </Button>
                    </Link>
                    <Button variant="destructive" size="sm" onClick={handleDeleteEvent}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-gray-700">{event.description}</p>

              <Separator />

              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <Calendar className="h-5 w-5 text-gray-500 mt-0.5" />
                  <div>
                    <p className="font-medium">Fecha y hora</p>
                    <p className="text-sm text-gray-600">{formatDate(event.start_date)}</p>
                    {event.end_date && (
                      <p className="text-sm text-gray-600">Hasta: {formatDate(event.end_date)}</p>
                    )}
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  {event.is_online ? (
                    <>
                      <Video className="h-5 w-5 text-gray-500 mt-0.5" />
                      <div>
                        <p className="font-medium">Evento Online</p>
                        {hasConfirmed && event.meeting_url && (
                          <a
                            href={event.meeting_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm text-blue-600 hover:underline"
                          >
                            {event.meeting_url}
                          </a>
                        )}
                        {!hasConfirmed && <p className="text-sm text-gray-600">Confirma tu asistencia para ver el enlace</p>}
                      </div>
                    </>
                  ) : (
                    <>
                      <MapPin className="h-5 w-5 text-gray-500 mt-0.5" />
                      <div>
                        <p className="font-medium">Ubicación</p>
                        <p className="text-sm text-gray-600">{event.location?.address}</p>
                        <p className="text-sm text-gray-600">
                          {event.location?.city}, {event.location?.country}
                        </p>
                      </div>
                    </>
                  )}
                </div>

                <div className="flex items-start gap-3">
                  <Users className="h-5 w-5 text-gray-500 mt-0.5" />
                  <div>
                    <p className="font-medium">Asistentes</p>
                    <p className="text-sm text-gray-600">
                      {event.stats?.confirmed} confirmados
                      {event.max_attendees ? ` de ${event.max_attendees}` : ''}
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <User className="h-5 w-5 text-gray-500 mt-0.5" />
                  <div>
                    <p className="font-medium">Organizado por</p>
                    <Link to={`/profile/${event.creator.username}`} className="text-sm text-blue-600 hover:underline">
                      {event.creator.name}
                    </Link>
                  </div>
                </div>
              </div>
            </CardContent>

            {!isCreator && (
              <CardFooter className="flex gap-2">
                {!hasRSVP ? (
                  <>
                    <Button
                      className="flex-1"
                      onClick={() => handleRSVP('confirmed')}
                      disabled={processingRSVP || event.is_full}
                    >
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Confirmar Asistencia
                    </Button>
                    <Button
                      variant="outline"
                      className="flex-1"
                      onClick={() => handleRSVP('declined')}
                      disabled={processingRSVP}
                    >
                      <XCircle className="h-4 w-4 mr-2" />
                      No asistiré
                    </Button>
                  </>
                ) : (
                  <div className="w-full space-y-2">
                    <div className="flex items-center justify-between">
                      <Badge variant={event.user_rsvp?.status === 'confirmed' ? 'default' : 'secondary'}>
                        Estado: {event.user_rsvp?.status}
                      </Badge>
                      <Button variant="outline" size="sm" onClick={handleCancelRSVP} disabled={processingRSVP}>
                        Cancelar asistencia
                      </Button>
                    </div>
                  </div>
                )}
              </CardFooter>
            )}
          </Card>

          {/* Chat del evento - Solo visible si confirmó asistencia */}
          {hasConfirmed && (
            <Card>
              <CardHeader>
                <CardTitle>Chat del Evento</CardTitle>
                <CardDescription>Conversa con otros asistentes</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* Mensajes */}
                  <div className="h-96 overflow-y-auto border rounded-lg p-4 space-y-3 bg-gray-50">
                    {messages.length === 0 ? (
                      <p className="text-center text-gray-500 text-sm">No hay mensajes aún. ¡Sé el primero en escribir!</p>
                    ) : (
                      messages.map((message) => (
                        <div key={message.id} className="flex gap-2">
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={message.sender?.image} />
                            <AvatarFallback>{message.sender?.name ? message.sender.name[0] : "?"}</AvatarFallback>
                          </Avatar>
                          <div className="flex-1">
                            <div className="flex items-baseline gap-2">
                              <span className="text-sm font-medium">{message.sender?.name || "Usuario"}</span>
                              <span className="text-xs text-gray-500">{formatMessageTime(message.created_at)}</span>
                            </div>
                            <p className="text-sm text-gray-700 mt-1">{message.content}</p>
                          </div>
                        </div>
                      ))
                    )}
                    <div ref={messagesEndRef} />
                  </div>

                  {/* Input de mensaje */}
                  <form onSubmit={handleSendMessage} className="flex gap-2">
                    <Input
                      placeholder="Escribe un mensaje..."
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      disabled={sendingMessage}
                    />
                    <Button type="submit" disabled={sendingMessage || !newMessage.trim()}>
                      <Send className="h-4 w-4" />
                    </Button>
                  </form>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar - Asistentes */}
        <div>
          <Card>
            <CardHeader>
              <CardTitle>Asistentes ({event.attendees?.length || 0})</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {event.attendees && event.attendees.length > 0 ? (
                  event.attendees.map((attendee) => (
                    <Link
                      key={attendee.id}
                      to={`/profile/${attendee.username}`}
                      className="flex items-center gap-3 hover:bg-gray-50 p-2 rounded-lg transition-colors"
                    >
                      <Avatar>
                        <AvatarImage src={attendee.image} />
                        <AvatarFallback>{attendee.name[0]}</AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="text-sm font-medium">{attendee.name}</p>
                        <p className="text-xs text-gray-500">@{attendee.username}</p>
                      </div>
                    </Link>
                  ))
                ) : (
                  <p className="text-sm text-gray-500 text-center py-4">Aún no hay asistentes confirmados</p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
