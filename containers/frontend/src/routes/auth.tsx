// user/__root.tsx
import { Outlet, createFileRoute, redirect } from "@tanstack/react-router";
import { DashboardLayout } from "@/components/layouts/DashboardLayout";
import ErrorPage from "@/components/error/ErrorPage";

export const Route = createFileRoute("/auth")({
  beforeLoad: async ({ context, location }) => {

    // Verificar primero si ya sabemos que el usuario está autenticado
    if (context.auth.user) {
      return; // Usuario ya autenticado, no es necesario verificar de nuevo
    }
    // Si no tenemos información, entonces hacemos la llamada a la API
    const isLoggedIn = await context.auth.isAuthenticated();
    if (!isLoggedIn) {
      throw redirect({
        to: "/login",
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
  return <DashboardLayout>
            <Outlet />
          </DashboardLayout>;

}
