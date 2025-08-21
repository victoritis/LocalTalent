import ErrorPage from "@/components/error/ErrorPage";
import { Outlet, createFileRoute } from "@tanstack/react-router";

//Aqui no hago before load porque TODOS los usuarios son almenos ROLE_USER
export const Route = createFileRoute("/auth/user")({
  errorComponent: ({ error }) => (
    <ErrorPage errorMessage={error.message || "Error desconocido"} />
  ),
  component: UserLayout,
});

function UserLayout() {
  return <Outlet />;
}
