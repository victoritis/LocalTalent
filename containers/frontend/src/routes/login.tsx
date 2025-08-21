// user/__root.tsx
import { Outlet, createFileRoute, redirect } from "@tanstack/react-router";
import ErrorPage from "@/components/error/ErrorPage";

export const Route = createFileRoute("/login")({
  beforeLoad: async ({ context, location }) => {
    // Verificar primero si ya sabemos que el usuario está autenticado
    if (context.auth.user) {
      throw redirect({
        to: "/auth/user/profile",
        search: { redirect: location.href },
      });
    }
    // Si no tenemos información, entonces hacemos la llamada a la API
    const isLoggedIn = await context.auth.isAuthenticated();
    if (isLoggedIn) {
      throw redirect({
        to: "/auth/user/profile",
        search: { redirect: location.href },
      });
    }
  },
  errorComponent: ({ error }) => (
    <ErrorPage errorMessage={error.message || "Error desconocido"} />
  ),
  component: UserLayout,
});

function UserLayout() {
  return (
      <Outlet />
  );
}
