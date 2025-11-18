import { LoginForm } from "@/components/login/LoginForm";
import { createFileRoute } from "@tanstack/react-router";

// Componente que renderiza el login
function LoginPage() {
  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="flex flex-col gap-4 p-6 md:p-10 bg-blue-100 bg-opacity-20">
        <div className="flex justify-center gap-2 md:justify-start">
          <a href="#" className="flex items-center gap-2">
            <img src="/images/cve-sentinel2.png" alt="App Logo" className="size-8 object-contain" />
            <span className="truncate font-semibold">App Starter</span>
          </a>
        </div>
        <div className="flex flex-1 items-center justify-center">
          <div className="w-full max-w-xs">
            <LoginForm />
          </div>
        </div>
      </div>
      <div className="relative hidden bg-muted lg:block">
        <img
          src="/avatar/admin.jpg"
          alt="Admin avatar"
          className="absolute top-0 inset-0 h-full w-full object-cover -translate-y-[60px] dark:brightness-[0.2] dark:grayscale"
        />
      </div>
    </div>
  );
}

function RouteComponent() {
  // Simplemente se devuelve el LoginPage, ya que antes en el padre ya se encargará de la lógica de redirección.
  return <LoginPage />;
}

export const Route = createFileRoute("/login/")({
  component: RouteComponent,
});
