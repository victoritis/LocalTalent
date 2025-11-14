import React, { useState, useEffect } from 'react'
import axios from 'axios'
import { Bell, Mail, Check, X } from 'lucide-react'
import {
  subscribeToPushNotifications,
  unsubscribeFromPushNotifications,
  isPushSubscribed,
  sendTestNotification,
} from '../../services/push/pushNotifications'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000'

interface NotificationPreferences {
  email_notifications: boolean
  push_notifications: boolean
}

export const NotificationSettings: React.FC = () => {
  const [preferences, setPreferences] = useState<NotificationPreferences>({
    email_notifications: true,
    push_notifications: false,
  })
  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  useEffect(() => {
    loadPreferences()
  }, [])

  const loadPreferences = async () => {
    setIsLoading(true)
    try {
      const response = await axios.get(`${API_URL}/api/v1/notifications/preferences`, {
        withCredentials: true,
      })

      const isPush = await isPushSubscribed()

      setPreferences({
        email_notifications: response.data.email_notifications,
        push_notifications: isPush,
      })
    } catch (error) {
      console.error('Error cargando preferencias:', error)
      showMessage('error', 'Error al cargar preferencias')
    } finally {
      setIsLoading(false)
    }
  }

  const showMessage = (type: 'success' | 'error', text: string) => {
    setMessage({ type, text })
    setTimeout(() => setMessage(null), 3000)
  }

  const handleEmailToggle = async () => {
    setIsSaving(true)
    try {
      const newValue = !preferences.email_notifications

      await axios.put(
        `${API_URL}/api/v1/notifications/preferences`,
        { email_notifications: newValue },
        { withCredentials: true }
      )

      setPreferences((prev) => ({ ...prev, email_notifications: newValue }))
      showMessage('success', `Notificaciones por email ${newValue ? 'activadas' : 'desactivadas'}`)
    } catch (error) {
      console.error('Error actualizando preferencias:', error)
      showMessage('error', 'Error al actualizar preferencias')
    } finally {
      setIsSaving(false)
    }
  }

  const handlePushToggle = async () => {
    setIsSaving(true)
    try {
      const newValue = !preferences.push_notifications

      if (newValue) {
        // Suscribirse a push notifications
        const success = await subscribeToPushNotifications()
        if (success) {
          setPreferences((prev) => ({ ...prev, push_notifications: true }))
          showMessage('success', 'Notificaciones push activadas')

          // Enviar notificación de prueba
          setTimeout(() => sendTestNotification(), 1000)
        } else {
          showMessage('error', 'No se pudo activar las notificaciones push')
        }
      } else {
        // Cancelar suscripción
        const success = await unsubscribeFromPushNotifications()
        if (success) {
          setPreferences((prev) => ({ ...prev, push_notifications: false }))
          showMessage('success', 'Notificaciones push desactivadas')
        } else {
          showMessage('error', 'No se pudo desactivar las notificaciones push')
        }
      }
    } catch (error) {
      console.error('Error con push notifications:', error)
      showMessage('error', 'Error al gestionar notificaciones push')
    } finally {
      setIsSaving(false)
    }
  }

  const handleTestPush = async () => {
    try {
      const success = await sendTestNotification()
      if (success) {
        showMessage('success', 'Notificación de prueba enviada')
      } else {
        showMessage('error', 'No se pudo enviar la notificación de prueba')
      }
    } catch (error) {
      console.error('Error enviando notificación de prueba:', error)
      showMessage('error', 'Error al enviar notificación de prueba')
    }
  }

  if (isLoading) {
    return (
      <div className="p-6 bg-white rounded-lg shadow">
        <p className="text-gray-600">Cargando preferencias...</p>
      </div>
    )
  }

  return (
    <div className="p-6 bg-white rounded-lg shadow space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Configuración de Notificaciones</h2>
        <p className="text-gray-600">Gestiona cómo deseas recibir notificaciones de LocalTalent</p>
      </div>

      {message && (
        <div
          className={`p-4 rounded-md flex items-center gap-2 ${
            message.type === 'success'
              ? 'bg-green-50 text-green-800 border border-green-200'
              : 'bg-red-50 text-red-800 border border-red-200'
          }`}
        >
          {message.type === 'success' ? (
            <Check className="w-5 h-5" />
          ) : (
            <X className="w-5 h-5" />
          )}
          <span>{message.text}</span>
        </div>
      )}

      <div className="space-y-4">
        {/* Notificaciones por Email */}
        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200">
          <div className="flex items-start gap-3">
            <Mail className="w-6 h-6 text-purple-600 mt-1" />
            <div>
              <h3 className="font-semibold text-gray-900">Notificaciones por Email</h3>
              <p className="text-sm text-gray-600 mt-1">
                Recibe emails cuando alguien ve tu perfil, hay nuevos usuarios en tu ciudad, eventos próximos, etc.
              </p>
            </div>
          </div>
          <button
            onClick={handleEmailToggle}
            disabled={isSaving}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 ${
              preferences.email_notifications ? 'bg-purple-600' : 'bg-gray-300'
            } ${isSaving ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                preferences.email_notifications ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>

        {/* Notificaciones Push */}
        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200">
          <div className="flex items-start gap-3">
            <Bell className="w-6 h-6 text-purple-600 mt-1" />
            <div>
              <h3 className="font-semibold text-gray-900">Notificaciones Push</h3>
              <p className="text-sm text-gray-600 mt-1">
                Recibe notificaciones en tiempo real en tu navegador, incluso cuando no estás en la aplicación.
              </p>
              {preferences.push_notifications && (
                <button
                  onClick={handleTestPush}
                  className="text-xs text-purple-600 hover:text-purple-700 mt-2 underline"
                >
                  Enviar notificación de prueba
                </button>
              )}
            </div>
          </div>
          <button
            onClick={handlePushToggle}
            disabled={isSaving}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 ${
              preferences.push_notifications ? 'bg-purple-600' : 'bg-gray-300'
            } ${isSaving ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                preferences.push_notifications ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h4 className="font-semibold text-blue-900 mb-2">9 Sobre las notificaciones</h4>
        <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
          <li>Puedes desactivar las notificaciones en cualquier momento</li>
          <li>Las notificaciones push requieren permiso del navegador</li>
          <li>Recibirás notificaciones sobre nuevos mensajes, eventos, valoraciones y más</li>
          <li>Tus preferencias se guardan automáticamente</li>
        </ul>
      </div>
    </div>
  )
}
