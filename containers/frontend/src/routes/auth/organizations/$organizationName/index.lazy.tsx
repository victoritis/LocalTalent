import { createLazyFileRoute } from "@tanstack/react-router";
import NotFoundPage from "@/components/notFound/notFound";

export const Route = createLazyFileRoute(
  "/auth/organizations/$organizationName/",
)({
  component: RouteComponent,
});

function RouteComponent() {
    return <NotFoundPage />;
}
