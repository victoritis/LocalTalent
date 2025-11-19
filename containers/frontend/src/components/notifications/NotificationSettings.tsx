import { useState, useEffect } from 'react'
import { Bell, Mail } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { toast } from 'sonner'
import {
  subscribeToPushNotifications,
  unsubscribeFromPushNotifications,
  isPushSubscribed,
  getSubscriptionStatus,
  sendTestNotification,
} from '@/services/push/pushNotifications'
import { getNotificationPreferences, updateNotificationPreferences } from '@/services/notifications/notificationsApi'

interface NotificationPreferences {
  email_notifications: boolean
  push_notifications: boolean
}

export function NotificationSettings() {
  const [preferences, setPreferences] = useState<NotificationPreferences>({
    email_notifications: true,
    push_notifications: false,
  })
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    loadPreferences()
  }, [])

  const loadPreferences = async () => {
    try {
      const data = await getNotificationPreferences()
      // Prefer server-side subscription status if available
      let pushServerStatus = null
      try {
        // Timeout wrapper to avoid blocking on service worker responses
        const serverStatus = await Promise.race([
          getSubscriptionStatus(),
          new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 6000)),
        ])
        pushServerStatus = serverStatus?.is_subscribed ?? null
      } catch (err) {
        // no-op: fallback to local push state
      }

      // Evitar bloqueo indefinido: si el chequeo local tarda más de 3s, asumimos false
      const isPushLocal = await Promise.race([
        isPushSubscribed(),
        new Promise<boolean>((res) => setTimeout(() => res(false), 3000)),
      ])

      setPreferences({
        email_notifications: !!data?.email_notifications,
        push_notifications: (data?.push_notifications ?? pushServerStatus) || isPushLocal,
      })
    } catch (error) {
      console.error('Error cargando preferencias:', error)
      toast.error('Error al cargar las preferencias de notificaciones')
      setLoadError('Error cargando preferencias de notificaciones')
    } finally {
      setIsLoading(false)
    }
  }

  const handleEmailToggle = async () => {
    setIsSaving(true)
    setLoadError(null)
    try {
      const newValue = !preferences.email_notifications

      await updateNotificationPreferences({ email_notifications: newValue })

      setPreferences((prev) => ({ ...prev, email_notifications: newValue }))
      toast.success(`Notificaciones por email ${newValue ? 'activadas' : 'desactivadas'}`)
    } catch (error) {
      console.error('Error actualizando preferencias:', error)
      toast.error('Error al actualizar las preferencias')
    } finally {
      setIsSaving(false)
    }
  }

  const handlePushToggle = async () => {
    setIsSaving(true)
    setLoadError(null)
    try {
      const newValue = !preferences.push_notifications

      if (newValue) {
        // Suscribirse a push notifications
        const success = await subscribeToPushNotifications()
        if (success) {
          setPreferences((prev) => ({ ...prev, push_notifications: true }))
          toast.success('Notificaciones push activadas')

          // Enviar notificación de prueba
          setTimeout(() => sendTestNotification(), 1000)
        } else {
          toast.error('No se pudo activar las notificaciones push. Verifica los permisos del navegador.')
        }
      } else {
        // Cancelar suscripción
        const success = await unsubscribeFromPushNotifications()
        if (success) {
          setPreferences((prev) => ({ ...prev, push_notifications: false }))
          toast.success('Notificaciones push desactivadas')
        } else {
          toast.error('No se pudo desactivar las notificaciones push')
        }
      }
    } catch (error) {
      console.error('Error con push notifications:', error)
      toast.error('Error al gestionar las notificaciones push')
      setLoadError('Error al gestionar notificaciones push')
    } finally {
      setIsSaving(false)
    }
  }

  const handleTestPush = async () => {
    try {
      const success = await sendTestNotification()
      if (success) {
        toast.success('Notificación de prueba enviada')
      } else {
        toast.error('No se pudo enviar la notificación de prueba')
      }
    } catch (error) {
      console.error('Error enviando notificación de prueba:', error)
      toast.error('Error al enviar la notificación de prueba')
      setLoadError('Error enviando notificación de prueba')
    }
  }

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Notificaciones</CardTitle>
          <CardDescription>Cargando preferencias...</CardDescription>
        </CardHeader>
      </Card>
    )
  }

  if (loadError) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Notificaciones</CardTitle>
          <CardDescription>{loadError}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <Button onClick={() => { setIsLoading(true); setLoadError(null); loadPreferences(); }}>
              Reintentar
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Configuración de Notificaciones</CardTitle>
          <CardDescription>
            Gestiona cómo deseas recibir notificaciones de LocalTalent
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Notificaciones por Email */}
          <div className="flex items-center justify-between space-x-4 rounded-lg border p-4">
            <div className="flex items-start space-x-4">
              <Mail className="w-6 h-6 text-primary mt-0.5" />
              <div className="space-y-1 flex-1">
                <Label htmlFor="email-notifications" className="text-base">
                  Notificaciones por Email
                </Label>
                <p className="text-sm text-muted-foreground">
                  Recibe emails cuando alguien ve tu perfil, hay nuevos usuarios en tu ciudad, eventos próximos, etc.
                </p>
              </div>
            </div>
            <Switch
              id="email-notifications"
              checked={preferences.email_notifications}
              onCheckedChange={handleEmailToggle}
              disabled={isSaving}
            />
          </div>

          {/* Notificaciones Push */}
          <div className="flex items-center justify-between space-x-4 rounded-lg border p-4">
            <div className="flex items-start space-x-4">
              <Bell className="w-6 h-6 text-primary mt-0.5" />
              <div className="space-y-1 flex-1">
                <Label htmlFor="push-notifications" className="text-base">
                  Notificaciones Push
                </Label>
                <p className="text-sm text-muted-foreground">
                  Recibe notificaciones en tiempo real en tu navegador, incluso cuando no estás en la aplicación.
                </p>
                {preferences.push_notifications && (
                  <Button
                    variant="link"
                    size="sm"
                    onClick={handleTestPush}
                    className="h-auto p-0 text-xs"
                  >
                    Enviar notificación de prueba
                  </Button>
                )}
              </div>
            </div>
            <Switch
              id="push-notifications"
              checked={preferences.push_notifications}
              onCheckedChange={handlePushToggle}
              disabled={isSaving}
            />
          </div>
        </CardContent>
      </Card>

      <Alert>
        <AlertDescription className="space-y-2">
          <p className="font-semibold">ℹ️ Sobre las notificaciones</p>
          <ul className="text-sm space-y-1 list-disc list-inside">
            <li>Puedes desactivar las notificaciones en cualquier momento</li>
            <li>Las notificaciones push requieren permiso del navegador</li>
            <li>Recibirás notificaciones sobre nuevos mensajes, eventos, valoraciones y más</li>
            <li>Tus preferencias se guardan automáticamente</li>
          </ul>
        </AlertDescription>
      </Alert>
    </div>
  )
}
