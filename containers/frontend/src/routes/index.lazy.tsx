import { createLazyFileRoute, useNavigate } from '@tanstack/react-router'
import { useEffect } from 'react'
import { useAuth } from '@/auth'

export const Route = createLazyFileRoute('/')({
  component: Index,
})

export default function Index() {
  const navigate = useNavigate();
  const { session, loadSession } = useAuth();

  // Cargar sesión si aún no existe
  useEffect(() => {
    if (!session) {
      loadSession();
    }
  }, [session, loadSession]);

  // Redirigir cuando la sesión esté disponible
  useEffect(() => {
    if (session?.username) {
      navigate({ to: `/auth/${session.username}/home`, replace: true })
    }
  }, [session?.username, navigate])

  return null
}
