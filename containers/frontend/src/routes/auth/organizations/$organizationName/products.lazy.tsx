import { createLazyFileRoute } from "@tanstack/react-router";
import { ListProducts } from "../../../../components/organization/ListProducts";

export const Route = createLazyFileRoute(
  "/auth/organizations/$organizationName/products",
)({
  component: RouteComponent,
});

// Componente que renderiza la lista de productos
function RouteComponent() {
  return <ListProducts />;
}
