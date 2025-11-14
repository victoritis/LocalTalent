/**
 * Servicio de Web Push Notifications para LocalTalent
 * Maneja suscripción, permisos y comunicación con el service worker
 */
import axios from 'axios'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000'

// Función para convertir clave pública VAPID a Uint8Array
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/\-/g, '+').replace(/_/g, '/')

  const rawData = window.atob(base64)
  const outputArray = new Uint8Array(rawData.length)

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i)
  }

  return outputArray
}

/**
 * Verificar si el navegador soporta notificaciones push
 */
export function isPushNotificationSupported(): boolean {
  return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window
}

/**
 * Obtener permiso de notificaciones del usuario
 */
export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (!('Notification' in window)) {
    console.warn('Este navegador no soporta notificaciones')
    return 'denied'
  }

  if (Notification.permission === 'granted') {
    return 'granted'
  }

  if (Notification.permission !== 'denied') {
    const permission = await Notification.requestPermission()
    return permission
  }

  return Notification.permission
}

/**
 * Registrar service worker
 */
export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (!('serviceWorker' in navigator)) {
    console.warn('Service Workers no soportados')
    return null
  }

  try {
    const registration = await navigator.serviceWorker.register('/sw.js', {
      scope: '/',
    })

    console.log('Service Worker registrado:', registration)
    return registration
  } catch (error) {
    console.error('Error registrando Service Worker:', error)
    return null
  }
}

/**
 * Obtener clave pública VAPID del servidor
 */
export async function getVapidPublicKey(): Promise<string | null> {
  try {
    const response = await axios.get(`${API_URL}/api/v1/notifications/push/public-key`)
    return response.data.public_key
  } catch (error) {
    console.error('Error obteniendo VAPID key:', error)
    return null
  }
}

/**
 * Suscribirse a notificaciones push
 */
export async function subscribeToPushNotifications(): Promise<boolean> {
  try {
    // 1. Verificar soporte
    if (!isPushNotificationSupported()) {
      console.warn('Push notifications no soportadas')
      return false
    }

    // 2. Solicitar permiso
    const permission = await requestNotificationPermission()
    if (permission !== 'granted') {
      console.warn('Permiso de notificaciones denegado')
      return false
    }

    // 3. Registrar service worker
    const registration = await registerServiceWorker()
    if (!registration) {
      console.error('No se pudo registrar el service worker')
      return false
    }

    // 4. Obtener clave pública VAPID
    const vapidPublicKey = await getVapidPublicKey()
    if (!vapidPublicKey) {
      console.error('No se pudo obtener VAPID key')
      return false
    }

    // 5. Suscribirse al push manager
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
    })

    console.log('Suscripción creada:', subscription)

    // 6. Enviar suscripción al servidor
    await axios.post(
      `${API_URL}/api/v1/notifications/push/subscribe`,
      {
        subscription: subscription.toJSON(),
      },
      {
        withCredentials: true,
      }
    )

    console.log('Suscripción enviada al servidor')
    return true
  } catch (error) {
    console.error('Error suscribiéndose a push notifications:', error)
    return false
  }
}

/**
 * Cancelar suscripción a notificaciones push
 */
export async function unsubscribeFromPushNotifications(): Promise<boolean> {
  try {
    if (!('serviceWorker' in navigator)) {
      return false
    }

    const registration = await navigator.serviceWorker.ready
    const subscription = await registration.pushManager.getSubscription()

    if (subscription) {
      await subscription.unsubscribe()
      console.log('Suscripción local cancelada')
    }

    // Notificar al servidor
    await axios.post(`${API_URL}/api/v1/notifications/push/unsubscribe`, {}, { withCredentials: true })

    console.log('Suscripción cancelada en el servidor')
    return true
  } catch (error) {
    console.error('Error cancelando suscripción:', error)
    return false
  }
}

/**
 * Verificar si el usuario está suscrito a push notifications
 */
export async function isPushSubscribed(): Promise<boolean> {
  try {
    if (!isPushNotificationSupported()) {
      return false
    }

    const registration = await navigator.serviceWorker.ready
    const subscription = await registration.pushManager.getSubscription()

    return subscription !== null
  } catch (error) {
    console.error('Error verificando suscripción:', error)
    return false
  }
}

/**
 * Obtener estado de suscripción desde el servidor
 */
export async function getSubscriptionStatus(): Promise<{
  is_subscribed: boolean
  subscription: any
} | null> {
  try {
    const response = await axios.get(`${API_URL}/api/v1/notifications/push/status`, {
      withCredentials: true,
    })
    return response.data
  } catch (error) {
    console.error('Error obteniendo estado de suscripción:', error)
    return null
  }
}

/**
 * Enviar notificación de prueba (requiere estar suscrito)
 */
export async function sendTestNotification(): Promise<boolean> {
  try {
    if (Notification.permission !== 'granted') {
      console.warn('Permiso de notificaciones no otorgado')
      return false
    }

    // Crear notificación local de prueba
    const registration = await navigator.serviceWorker.ready
    await registration.showNotification('LocalTalent - Notificación de prueba', {
      body: '¡Las notificaciones están funcionando correctamente! 🎉',
      icon: '/icons/icon-192x192.png',
      badge: '/icons/badge-72x72.png',
      vibrate: [200, 100, 200],
      tag: 'test-notification',
    })

    return true
  } catch (error) {
    console.error('Error enviando notificación de prueba:', error)
    return false
  }
}
