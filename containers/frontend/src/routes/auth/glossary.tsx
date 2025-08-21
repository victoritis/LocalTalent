import { Outlet, createFileRoute } from "@tanstack/react-router";
import ErrorPage from "@/components/error/ErrorPage";

export const Route = createFileRoute("/auth/glossary")({
  beforeLoad: ({ context }) => {
    const { isAuthenticated } = context.auth;
    
    if (!isAuthenticated) {
      throw new Error("Debes iniciar sesión para acceder a esta sección.");
    }

    return { }; 
  },
  errorComponent: ({ error }) => (
    <ErrorPage errorMessage={error.message || "Error desconocido"} />
  ),
  component: GlossaryLayout,
});

function GlossaryLayout() {
   return <Outlet />;
}


