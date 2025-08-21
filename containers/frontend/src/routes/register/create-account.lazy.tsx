import { createLazyFileRoute } from "@tanstack/react-router";
import { CreateAccountPage } from "@/components/register/CreateAccount";

export const Route = createLazyFileRoute("/register/create-account")({
  component: CreateAccountPage,
});

export default function CreateAccountLazy() {
  return <CreateAccountPage />;
}
