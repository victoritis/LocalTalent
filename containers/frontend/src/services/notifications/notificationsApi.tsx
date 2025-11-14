import axios from 'axios'

const API_URL = import.meta.env.VITE_REACT_APP_API_URL || 'http://localhost:5000'

export interface Notification {
  id: number
  type: string
  title: string
  message?: string
  link?: string
  is_read: boolean
  read_at?: string
  data?: any
  created_at: string
}

export interface NotificationsResponse {
  notifications: Notification[]
  total: number
  unread_count: number
}

// Obtener notificaciones
export const getNotifications = async (
  limit: number = 20,
  offset: number = 0,
  unreadOnly: boolean = false
): Promise<NotificationsResponse> => {
  const response = await axios.get(`${API_URL}/api/v1/notifications`, {
    params: { limit, offset, unread_only: unreadOnly },
    withCredentials: true,
  })
  return response.data
}

// Obtener contador de no leídas
export const getUnreadCount = async (): Promise<number> => {
  const response = await axios.get(`${API_URL}/api/v1/notifications/unread-count`, {
    withCredentials: true,
  })
  return response.data.unread_count
}

// Marcar notificación como leída
export const markAsRead = async (notificationId: number): Promise<void> => {
  await axios.post(`${API_URL}/api/v1/notifications/${notificationId}/mark-read`, {}, {
    withCredentials: true,
  })
}

// Marcar todas como leídas
export const markAllAsRead = async (): Promise<void> => {
  await axios.post(`${API_URL}/api/v1/notifications/mark-all-read`, {}, {
    withCredentials: true,
  })
}

// Eliminar notificación
export const deleteNotification = async (notificationId: number): Promise<void> => {
  await axios.delete(`${API_URL}/api/v1/notifications/${notificationId}`, {
    withCredentials: true,
  })
}

// Obtener preferencias de notificaciones
export const getNotificationPreferences = async (): Promise<{
  email_notifications: boolean
  push_notifications: boolean
}> => {
  const response = await axios.get(`${API_URL}/api/v1/notifications/preferences`, {
    withCredentials: true,
  })
  return response.data
}

// Actualizar preferencias de notificaciones
export const updateNotificationPreferences = async (preferences: {
  email_notifications?: boolean
}): Promise<{ message: string; email_notifications: boolean }> => {
  const response = await axios.put(`${API_URL}/api/v1/notifications/preferences`, preferences, {
    withCredentials: true,
  })
  return response.data
}
