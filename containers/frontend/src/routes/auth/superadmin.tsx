import { Outlet, createFileRoute } from "@tanstack/react-router";
import ErrorPage from "@/components/error/ErrorPage";

export const Route = createFileRoute("/auth/superadmin")({
  beforeLoad: async ({ context }) => {

    // Usamos directamente los roles del contexto
    const { roles } = context.auth;
      
    if (!roles.ROLE_SUPERADMIN) {
      throw new Error("No eres superadministrador");
    }
    return { isSuperAdmin: roles.ROLE_SUPERADMIN };
  },
  errorComponent: ({ error }) => (
    <ErrorPage errorMessage={error.message || "Error desconocido"} />
  ),
  component: SuperAdminLayout,
});

function SuperAdminLayout() {
  return <Outlet />;
}
