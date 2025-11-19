import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { io, Socket } from 'socket.io-client'

const API_URL =
  import.meta.env.VITE_REACT_APP_API_URL ||
  import.meta.env.VITE_API_URL ||
  'http://localhost:5000'

interface SocketContextType {
  socket: Socket | null
  connected: boolean
  joinConversation: (conversationId: number) => void
  leaveConversation: (conversationId: number) => void
  sendMessage: (conversationId: number, content: string) => void
  markAsRead: (messageId: number) => void
  sendTyping: (conversationId: number, isTyping: boolean) => void
}

const SocketContext = createContext<SocketContextType | null>(null)

export const useSocket = () => {
  const context = useContext(SocketContext)
  if (!context) {
    throw new Error('useSocket must be used within a SocketProvider')
  }
  return context
}

interface SocketProviderProps {
  children: ReactNode
  enabled?: boolean
}

export const SocketProvider = ({ children, enabled = true }: SocketProviderProps) => {
  const [socket, setSocket] = useState<Socket | null>(null)
  const [connected, setConnected] = useState(false)

  useEffect(() => {
    if (!enabled) return

    // Crear conexión Socket.IO
    const newSocket = io(API_URL, {
      withCredentials: true,
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    })

    // Event listeners
    newSocket.on('connect', () => {
      console.log('Socket conectado:', newSocket.id)
      setConnected(true)
    })

    newSocket.on('disconnect', (reason) => {
      console.log('Socket desconectado:', reason)
      setConnected(false)
    })

    newSocket.on('connected', (data) => {
      console.log('Usuario conectado:', data.user_id)
    })

    newSocket.on('error', (error) => {
      console.error('Socket error:', error)
    })

    setSocket(newSocket)

    // Cleanup
    return () => {
      newSocket.close()
    }
  }, [enabled])

  const joinConversation = (conversationId: number) => {
    if (socket && connected) {
      socket.emit('join_conversation', { conversation_id: conversationId })
      console.log('Unido a conversación:', conversationId)
    }
  }

  const leaveConversation = (conversationId: number) => {
    if (socket && connected) {
      socket.emit('leave_conversation', { conversation_id: conversationId })
      console.log('Salió de conversación:', conversationId)
    }
  }

  const sendMessage = (conversationId: number, content: string) => {
    if (socket && connected) {
      socket.emit('send_message', {
        conversation_id: conversationId,
        content,
      })
    }
  }

  const markAsRead = (messageId: number) => {
    if (socket && connected) {
      socket.emit('mark_as_read', { message_id: messageId })
    }
  }

  const sendTyping = (conversationId: number, isTyping: boolean) => {
    if (socket && connected) {
      socket.emit('typing', {
        conversation_id: conversationId,
        is_typing: isTyping,
      })
    }
  }

  const value: SocketContextType = {
    socket,
    connected,
    joinConversation,
    leaveConversation,
    sendMessage,
    markAsRead,
    sendTyping,
  }

  return <SocketContext.Provider value={value}>{children}</SocketContext.Provider>
}
