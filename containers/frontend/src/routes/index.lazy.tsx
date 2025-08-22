import { createLazyFileRoute } from "@tanstack/react-router";
import { useEffect } from "react";
import { useNavigate } from "@tanstack/react-router";

export const Route = createLazyFileRoute("/")({
  component: Index,
});

export default function Index() {
  const navigate = useNavigate();

  useEffect(() => {
    navigate({ to: "/auth/home", replace: true });
  }, [navigate]);

  return null;
}
