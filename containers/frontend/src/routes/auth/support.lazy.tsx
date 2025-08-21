import { createLazyFileRoute } from "@tanstack/react-router";
import { SupportPage } from "@/components/support/SupportPage";

export const Route = createLazyFileRoute("/auth/support")({
  component: SupportPage,
});
