import { createFileRoute } from "@tanstack/react-router";
import { fetchGetUserOrganizationsNames } from "@/services/organizations/organizationApi";
import ErrorPage from "@/components/error/ErrorPage";
import { Outlet } from "@tanstack/react-router";

// Se define la ruta sin lógica de actualización en beforeLoad
export const Route = createFileRoute("/auth/organizations/$organizationName")({
  errorComponent: ({ error }) => (
    <ErrorPage errorMessage={error.message || "Error desconocido"} />
  ),
  beforeLoad: async ({ params: { organizationName }, context }) => {
    const setOrganization = async () => {
      const response = await fetchGetUserOrganizationsNames();
      const organizacionEncontrada = response.organizations.find(
        (org) => org.name === organizationName
      );
  
      if (!organizacionEncontrada) {
        console.error(`No perteneces a: ${organizationName}`);
        return;
      }
  
      // Actualiza la organización solo si es diferente a la actual
      if (
        !context.auth.current_organization ||
        context.auth.current_organization.id !== organizacionEncontrada.id
      ) {
        context.auth.set_current_organization({
          id: organizacionEncontrada.id,
          name: organizacionEncontrada.name,
        });
      }
    };
  
    setOrganization();
  },
  component: RouteComponent,
});

function RouteComponent() {



  return <Outlet />;
}
