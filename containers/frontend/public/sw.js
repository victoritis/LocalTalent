/**
 * Service Worker para LocalTalent
 * Maneja notificaciones push y cache
 */

// Nombre de la versión del cache
const CACHE_NAME = 'localtalent-v1'

// Escuchar instalación del service worker
self.addEventListener('install', (event) => {
  console.log('Service Worker instalado')
  self.skipWaiting()
})

// Escuchar activación del service worker
self.addEventListener('activate', (event) => {
  console.log('Service Worker activado')
  event.waitUntil(self.clients.claim())
})

// Escuchar mensajes push
self.addEventListener('push', (event) => {
  console.log('Push recibido:', event)

  if (!event.data) {
    console.log('Push sin datos')
    return
  }

  try {
    const data = event.data.json()

    const options = {
      body: data.body || '',
      icon: data.icon || '/icons/icon-192x192.png',
      badge: data.badge || '/icons/badge-72x72.png',
      image: data.image,
      vibrate: [200, 100, 200],
      tag: data.data?.type || 'notification',
      requireInteraction: data.requireInteraction || false,
      data: data.data || {},
      actions: data.actions || []
    }

    event.waitUntil(
      self.registration.showNotification(data.title || 'LocalTalent', options)
    )
  } catch (error) {
    console.error('Error procesando push:', error)
  }
})

// Escuchar clicks en notificaciones
self.addEventListener('notificationclick', (event) => {
  console.log('Click en notificación:', event)

  event.notification.close()

  // Obtener URL de la notificación
  const url = event.notification.data?.url || '/'

  // Abrir o enfocar la ventana
  event.waitUntil(
    clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        // Buscar si ya hay una ventana abierta
        for (const client of clientList) {
          if (client.url === url && 'focus' in client) {
            return client.focus()
          }
        }

        // Si no hay ventana abierta, abrir una nueva
        if (clients.openWindow) {
          return clients.openWindow(url)
        }
      })
  )
})

// Escuchar cierre de notificaciones
self.addEventListener('notificationclose', (event) => {
  console.log('Notificación cerrada:', event)
})

// Manejo de fetch (opcional, para cache)
self.addEventListener('fetch', (event) => {
  // Por ahora, solo hacer fetch normal sin cache
  event.respondWith(fetch(event.request))
})
