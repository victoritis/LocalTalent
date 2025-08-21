import { Outlet, createFileRoute } from "@tanstack/react-router";
import ErrorPage from "@/components/error/ErrorPage";

export const Route = createFileRoute("/auth/organizations")({

  errorComponent: ({ error }) => (
    <ErrorPage errorMessage={error.message || "Error desconocido"} />
  ),
  component: AdminLayout,
});

function AdminLayout() {
  return <Outlet />;
}
