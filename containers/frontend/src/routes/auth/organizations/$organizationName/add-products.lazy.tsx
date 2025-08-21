import { createLazyFileRoute } from "@tanstack/react-router";
import { AddProducts } from "@/components/organization/AddProducts"; 

export const Route = createLazyFileRoute(
  "/auth/organizations/$organizationName/add-products",
)({
  component: RouteComponent, 
});

// AddProducts obtiene la organización del contexto useAuth.
function RouteComponent() {
  return <AddProducts />;
}
