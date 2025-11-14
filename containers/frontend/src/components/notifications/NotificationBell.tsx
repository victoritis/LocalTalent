import { useState, useEffect } from 'react'
import { Bell, Check, CheckCheck, X, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Separator } from '@/components/ui/separator'
import { formatDistanceToNow } from 'date-fns'
import { es } from 'date-fns/locale'
import { cn } from '@/lib/utils'
import {
  getNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  Notification,
} from '@/services/notifications/notificationsApi'
import { useSocket } from '@/context/socket'
import { useToast } from '@/hooks/use-toast'

export function NotificationBell() {
  const [open, setOpen] = useState(false)
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(false)
  const { socket, connected } = useSocket()
  const { toast } = useToast()

  // Cargar notificaciones
  const loadNotifications = async () => {
    try {
      setLoading(true)
      const data = await getNotifications(20, 0, false)
      setNotifications(data.notifications)
      setUnreadCount(data.unread_count)
    } catch (error) {
      console.error('Error cargando notificaciones:', error)
    } finally {
      setLoading(false)
    }
  }

  // Cargar contador de no leídas
  const loadUnreadCount = async () => {
    try {
      const count = await getUnreadCount()
      setUnreadCount(count)
    } catch (error) {
      console.error('Error cargando contador:', error)
    }
  }

  // Cargar al montar
  useEffect(() => {
    loadUnreadCount()
  }, [])

  // Cargar al abrir dropdown
  useEffect(() => {
    if (open) {
      loadNotifications()
    }
  }, [open])

  // Escuchar notificaciones en tiempo real
  useEffect(() => {
    if (connected && socket) {
      socket.on('message_notification', () => {
        loadUnreadCount()
        if (open) {
          loadNotifications()
        }
      })

      return () => {
        socket.off('message_notification')
      }
    }
  }, [connected, socket, open])

  const handleMarkAsRead = async (notificationId: number) => {
    try {
      await markAsRead(notificationId)
      setNotifications((prev) =>
        prev.map((n) =>
          n.id === notificationId ? { ...n, is_read: true } : n
        )
      )
      setUnreadCount((prev) => Math.max(0, prev - 1))
    } catch (error) {
      toast({
        title: 'Error',
        description: 'No se pudo marcar como leída',
        variant: 'destructive',
      })
    }
  }

  const handleMarkAllAsRead = async () => {
    try {
      await markAllAsRead()
      setNotifications((prev) =>
        prev.map((n) => ({ ...n, is_read: true }))
      )
      setUnreadCount(0)
      toast({
        title: 'Éxito',
        description: 'Todas las notificaciones marcadas como leídas',
      })
    } catch (error) {
      toast({
        title: 'Error',
        description: 'No se pudieron marcar como leídas',
        variant: 'destructive',
      })
    }
  }

  const handleDelete = async (notificationId: number) => {
    try {
      await deleteNotification(notificationId)
      setNotifications((prev) => prev.filter((n) => n.id !== notificationId))
      loadUnreadCount()
    } catch (error) {
      toast({
        title: 'Error',
        description: 'No se pudo eliminar la notificación',
        variant: 'destructive',
      })
    }
  }

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'message':
        return '💬'
      case 'profile_view':
        return '👀'
      case 'new_user':
        return '👋'
      default:
        return '🔔'
    }
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="w-5 h-5" />
          {unreadCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-1 -right-1 w-5 h-5 p-0 flex items-center justify-center text-xs"
            >
              {unreadCount > 9 ? '9+' : unreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-96 p-0" align="end">
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="font-semibold">Notificaciones</h3>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleMarkAllAsRead}
              className="h-8 text-xs"
            >
              <CheckCheck className="w-3 h-3 mr-1" />
              Marcar todas
            </Button>
          )}
        </div>

        <ScrollArea className="h-[400px]">
          {loading ? (
            <div className="flex items-center justify-center h-32">
              <p className="text-sm text-muted-foreground">Cargando...</p>
            </div>
          ) : notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-32 text-center p-4">
              <Bell className="w-8 h-8 text-muted-foreground mb-2 opacity-50" />
              <p className="text-sm text-muted-foreground">
                No hay notificaciones
              </p>
            </div>
          ) : (
            <div className="divide-y">
              {notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={cn(
                    'p-4 hover:bg-accent transition-colors cursor-pointer group relative',
                    !notification.is_read && 'bg-blue-50 dark:bg-blue-950/20'
                  )}
                  onClick={() => {
                    if (!notification.is_read) {
                      handleMarkAsRead(notification.id)
                    }
                    if (notification.link) {
                      window.location.href = notification.link
                    }
                  }}
                >
                  <div className="flex items-start gap-3">
                    <span className="text-2xl flex-shrink-0">
                      {getNotificationIcon(notification.type)}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm">{notification.title}</p>
                      {notification.message && (
                        <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                          {notification.message}
                        </p>
                      )}
                      <p className="text-xs text-muted-foreground mt-1">
                        {formatDistanceToNow(new Date(notification.created_at), {
                          addSuffix: true,
                          locale: es,
                        })}
                      </p>
                    </div>
                    <div className="flex items-center gap-1">
                      {!notification.is_read && (
                        <div className="w-2 h-2 bg-blue-500 rounded-full" />
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleDelete(notification.id)
                        }}
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>

        {notifications.length > 0 && (
          <>
            <Separator />
            <div className="p-2 text-center">
              <Button variant="ghost" size="sm" className="w-full text-xs">
                Ver todas las notificaciones
              </Button>
            </div>
          </>
        )}
      </PopoverContent>
    </Popover>
  )
}
