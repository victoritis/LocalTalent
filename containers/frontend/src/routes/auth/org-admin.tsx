import { Outlet, createFileRoute } from "@tanstack/react-router";
import ErrorPage from "@/components/error/ErrorPage";

export const Route = createFileRoute("/auth/org-admin")({
  beforeLoad: ({ context }) => {
    // Usamos directamente los roles del contexto
    const { roles } = context.auth;
    
    if (!roles.ROLE_ORG_ADMIN) {
      throw new Error("No eres administrador de ninguna organización");
    }
    
    return { isOrgAdmin: roles.ROLE_ORG_ADMIN };
  },
  errorComponent: ({ error }) => (
    <ErrorPage errorMessage={error.message || "Error desconocido"} />
  ),
  component: AdminLayout,
});

function AdminLayout() {
  return <Outlet />;
}
