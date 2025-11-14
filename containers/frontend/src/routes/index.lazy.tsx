import { createLazyFileRoute, useNavigate } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { useAuth } from '@/auth'
import LoadingPage from '@/components/loading/LoadingPage'

export const Route = createLazyFileRoute('/')({
  component: Index,
})

export default function Index() {
  const navigate = useNavigate();
  const { session, loadSession, isAuthenticated } = useAuth();
  const [isLoading, setIsLoading] = useState(true);

  // Cargar sesión y verificar autenticación
  useEffect(() => {
    const checkAuth = async () => {
      setIsLoading(true);

      // Cargar sesión si aún no existe
      if (!session) {
        await loadSession();
      }

      // Verificar si está autenticado
      const authenticated = await isAuthenticated();

      if (!authenticated) {
        // Si no está autenticado, redirigir al login
        navigate({ to: '/login', replace: true });
      }

      setIsLoading(false);
    };

    checkAuth();
  }, []);

  // Redirigir cuando la sesión esté disponible
  useEffect(() => {
    if (session?.username && !isLoading) {
      navigate({ to: '/auth/home', replace: true })
    }
  }, [session?.username, navigate, isLoading])

  if (isLoading) {
    return <LoadingPage />;
  }

  return null
}
