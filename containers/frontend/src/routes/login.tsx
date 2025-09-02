// user/__root.tsx
import { Outlet, createFileRoute, redirect } from '@tanstack/react-router'
import ErrorPage from "@/components/error/ErrorPage";

export const Route = createFileRoute('/login')({
  beforeLoad: async ({ context }) => {
    if (context.auth.user) {
      await context.auth.loadSession()
      if (context.auth.session?.username) {
        // Redirigir a home genérico sin perfil
        throw redirect({ to: '/auth/home' })
      }
    }
    const isLoggedIn = await context.auth.isAuthenticated()
    if (isLoggedIn) {
      await context.auth.loadSession()
      if (context.auth.session?.username) {
        throw redirect({ to: '/auth/home' })
      }
    }
  },
  errorComponent: ({ error }) => (
    <ErrorPage errorMessage={error.message || 'Error desconocido'} />
  ),
  component: UserLayout,
});

function UserLayout() {
  return <Outlet />
}
