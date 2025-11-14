import axios from 'axios'

const API_URL = import.meta.env.VITE_REACT_APP_API_URL || 'http://localhost:5000'

export interface Event {
  id: number
  title: string
  description?: string
  event_type: string
  creator: {
    id: number
    name: string
    username: string
    image: string
  }
  start_date: string
  end_date?: string
  is_online: boolean
  meeting_url?: string
  location?: {
    address?: string
    city?: string
    country?: string
    latitude?: number
    longitude?: number
  }
  max_attendees?: number
  confirmed_attendees: number
  is_full: boolean
  category?: string
  image_url?: string
  stats?: {
    confirmed: number
    pending: number
    is_full: boolean
  }
  attendees?: Array<{
    id: number
    name: string
    username: string
    image: string
  }>
  user_rsvp?: {
    id: number
    status: string
    response_date: string
  }
  distance?: number
  created_at: string
  updated_at?: string
}

export interface EventInvitation {
  id: number
  event: {
    id: number
    title: string
    description?: string
    start_date: string
    event_type: string
  }
  inviter: {
    id: number
    name: string
    username: string
    image: string
  }
  message?: string
  created_at: string
}

export interface EventMessage {
  id: number
  sender: {
    id: number
    name: string
    username: string
    image: string
  }
  content: string
  created_at: string
}

export interface CreateEventData {
  title: string
  description?: string
  event_type: string
  start_date: string
  end_date?: string
  is_online: boolean
  meeting_url?: string
  address?: string
  city?: string
  country?: string
  latitude?: number
  longitude?: number
  max_attendees?: number
  is_public: boolean
  category?: string
  image_url?: string
}

export interface UpdateEventData extends Partial<CreateEventData> {}

export interface RSVPData {
  status: 'confirmed' | 'declined' | 'pending'
  notes?: string
}

export interface InvitationData {
  invitee_id: number
  message?: string
}

// Obtener lista de eventos públicos
export const getEvents = async (params?: {
  category?: string
  event_type?: string
  is_online?: boolean
  city?: string
  upcoming_only?: boolean
  page?: number
  per_page?: number
}): Promise<{ events: Event[]; total: number; pages: number; current_page: number }> => {
  const response = await axios.get(`${API_URL}/api/v1/events`, {
    params,
    withCredentials: true,
  })
  return response.data
}

// Obtener eventos cercanos
export const getNearbyEvents = async (params?: {
  radius?: number
  upcoming_only?: boolean
}): Promise<{ events: Event[]; total: number; radius_km: number }> => {
  const response = await axios.get(`${API_URL}/api/v1/events/nearby`, {
    params,
    withCredentials: true,
  })
  return response.data
}

// Obtener detalles de un evento
export const getEvent = async (eventId: number): Promise<Event> => {
  const response = await axios.get(`${API_URL}/api/v1/events/${eventId}`, {
    withCredentials: true,
  })
  return response.data
}

// Crear evento
export const createEvent = async (data: CreateEventData): Promise<{ message: string; event: Event }> => {
  const response = await axios.post(`${API_URL}/api/v1/events`, data, {
    withCredentials: true,
  })
  return response.data
}

// Actualizar evento
export const updateEvent = async (eventId: number, data: UpdateEventData): Promise<{ message: string; event: Event }> => {
  const response = await axios.put(`${API_URL}/api/v1/events/${eventId}`, data, {
    withCredentials: true,
  })
  return response.data
}

// Eliminar evento
export const deleteEvent = async (eventId: number): Promise<{ message: string }> => {
  const response = await axios.delete(`${API_URL}/api/v1/events/${eventId}`, {
    withCredentials: true,
  })
  return response.data
}

// Confirmar/declinar asistencia (RSVP)
export const createRSVP = async (eventId: number, data: RSVPData): Promise<{ message: string; rsvp: any }> => {
  const response = await axios.post(`${API_URL}/api/v1/events/${eventId}/rsvp`, data, {
    withCredentials: true,
  })
  return response.data
}

// Cancelar asistencia
export const cancelRSVP = async (eventId: number): Promise<{ message: string }> => {
  const response = await axios.delete(`${API_URL}/api/v1/events/${eventId}/rsvp`, {
    withCredentials: true,
  })
  return response.data
}

// Enviar invitación a evento
export const sendInvitation = async (eventId: number, data: InvitationData): Promise<{ message: string; invitation: any }> => {
  const response = await axios.post(`${API_URL}/api/v1/events/${eventId}/invitations`, data, {
    withCredentials: true,
  })
  return response.data
}

// Responder invitación
export const respondInvitation = async (
  invitationId: number,
  status: 'accepted' | 'declined'
): Promise<{ message: string }> => {
  const response = await axios.put(
    `${API_URL}/api/v1/events/invitations/${invitationId}/respond`,
    { status },
    {
      withCredentials: true,
    }
  )
  return response.data
}

// Obtener mis invitaciones pendientes
export const getMyInvitations = async (): Promise<{ invitations: EventInvitation[]; total: number }> => {
  const response = await axios.get(`${API_URL}/api/v1/events/invitations/my-invitations`, {
    withCredentials: true,
  })
  return response.data
}

// Obtener mensajes del chat grupal del evento
export const getEventMessages = async (eventId: number): Promise<{ messages: EventMessage[]; total: number }> => {
  const response = await axios.get(`${API_URL}/api/v1/events/${eventId}/messages`, {
    withCredentials: true,
  })
  return response.data
}

// Enviar mensaje al chat grupal
export const sendEventMessage = async (
  eventId: number,
  content: string
): Promise<{ message: string; event_message: EventMessage }> => {
  const response = await axios.post(
    `${API_URL}/api/v1/events/${eventId}/messages`,
    { content },
    {
      withCredentials: true,
    }
  )
  return response.data
}

// Obtener mis eventos creados
export const getMyEvents = async (): Promise<{ events: Event[]; total: number }> => {
  const response = await axios.get(`${API_URL}/api/v1/events/my-events`, {
    withCredentials: true,
  })
  return response.data
}

// Obtener eventos a los que asistí/asistiré
export const getMyRSVPs = async (): Promise<{ rsvps: any[]; total: number }> => {
  const response = await axios.get(`${API_URL}/api/v1/events/my-rsvps`, {
    withCredentials: true,
  })
  return response.data
}
