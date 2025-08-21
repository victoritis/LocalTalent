import { createLazyFileRoute } from "@tanstack/react-router";
import { SuperAdminSummaryDashboard } from "@/components/superadmin/SuperAdminSummaryDashboard"; // Importar el componente renombrado

export const Route = createLazyFileRoute("/auth/superadmin/data-status")({
  component: RouteComponent,
});

function RouteComponent() {
  // Renderizar el componente del dashboard de resumen
  return <SuperAdminSummaryDashboard />;
}
