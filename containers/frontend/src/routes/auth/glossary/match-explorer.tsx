import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/auth/glossary/match-explorer")({
  component: RouteComponent,
});

function RouteComponent() {
  return <div>Hello "/auth/glossary/match-explorer"!</div>;
}
