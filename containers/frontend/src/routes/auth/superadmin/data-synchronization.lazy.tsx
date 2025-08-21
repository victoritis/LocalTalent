import { createLazyFileRoute } from "@tanstack/react-router";
import { DataSynchronizationManager } from "@/components/superadmin/DataSynchronizationManager";
import ErrorPage from "@/components/error/ErrorPage"; 

export const Route = createLazyFileRoute("/auth/superadmin/data-synchronization")({
  component: RouteComponent,
  errorComponent: ({ error }) => ( 
    <ErrorPage errorMessage={error.message || "Error desconocido"} />
  ),
});

function RouteComponent() {
  return <DataSynchronizationManager />;
}
