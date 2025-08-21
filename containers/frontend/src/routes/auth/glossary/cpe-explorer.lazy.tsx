import { createLazyFileRoute } from "@tanstack/react-router";
import { CpeExplorer } from "@/components/glossary/CpeExplorer";

export const Route = createLazyFileRoute("/auth/glossary/cpe-explorer")({
  component: CpeExplorer,
});
