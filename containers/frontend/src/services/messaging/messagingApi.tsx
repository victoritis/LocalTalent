import axios from 'axios'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000'

export interface Conversation {
  id: number
  other_user: {
    id: number
    username: string
    first_name: string
    last_name: string
    profile_image: string
  }
  last_message?: {
    content: string
    created_at: string
    is_mine: boolean
  }
  unread_count: number
  last_message_at?: string
}

export interface Message {
  id: number
  content: string
  sender_id: number
  sender_username: string
  is_mine: boolean
  is_read: boolean
  created_at: string
}

export interface SendMessageData {
  content: string
}

// Obtener lista de conversaciones
export const getConversations = async (): Promise<Conversation[]> => {
  const response = await axios.get(`${API_URL}/api/v1/conversations`, {
    withCredentials: true,
  })
  return response.data.conversations
}

// Obtener o crear conversación con un usuario
export const getOrCreateConversation = async (userId: number): Promise<{ conversation_id: number; created: string }> => {
  const response = await axios.get(`${API_URL}/api/v1/conversations/${userId}`, {
    withCredentials: true,
  })
  return response.data
}

// Obtener mensajes de una conversación
export const getMessages = async (
  conversationId: number,
  limit: number = 50,
  offset: number = 0
): Promise<{ messages: Message[]; total: number }> => {
  const response = await axios.get(`${API_URL}/api/v1/conversations/${conversationId}/messages`, {
    params: { limit, offset },
    withCredentials: true,
  })
  return response.data
}

// Enviar mensaje (REST fallback)
export const sendMessage = async (conversationId: number, data: SendMessageData): Promise<Message> => {
  const response = await axios.post(`${API_URL}/api/v1/conversations/${conversationId}/messages`, data, {
    withCredentials: true,
  })
  return response.data.data
}

// Marcar mensajes como leídos
export const markMessagesAsRead = async (conversationId: number): Promise<void> => {
  await axios.post(`${API_URL}/api/v1/conversations/${conversationId}/mark-read`, {}, {
    withCredentials: true,
  })
}

// Obtener contador de mensajes no leídos
export const getUnreadCount = async (): Promise<number> => {
  const response = await axios.get(`${API_URL}/api/v1/unread-count`, {
    withCredentials: true,
  })
  return response.data.unread_count
}
