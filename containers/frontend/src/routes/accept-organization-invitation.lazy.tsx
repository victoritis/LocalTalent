import { useEffect, useState } from "react";
import { createLazyFileRoute, useRouter } from "@tanstack/react-router";
import { acceptOrganizationInvitation } from "@/services/organizations/organizationApi";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2 } from "lucide-react";

function AcceptInvitationPage() {
  const router = useRouter();
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [message, setMessage] = useState<string>("");
  const [error, setError] = useState<string>("");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get("token");
    if (!token) {
      setError("Token no proporcionado.");
      setStatus("error");
      return;
    }
    acceptOrganizationInvitation(token)
      .then((res) => {
        if (res.error) {
          setError(res.error);
          setStatus("error");
        } else {
          setMessage(res.message || "Invitación aceptada.");
          setStatus("success");
        }
      })
      .catch((e) => {
        setError(e.message || "Error de red.");
        setStatus("error");
      });
  }, []);

  const onContinue = () => {
    router.navigate({ to: "/login" });
  };

  return (
    <div className="container mx-auto py-20 px-4">
      <Card className="max-w-md mx-auto">
        <CardHeader>
          <CardTitle>
            {status === "loading"
              ? "Procesando..."
              : status === "success"
              ? "¡Éxito!"
              : "Error"}
          </CardTitle>
        </CardHeader>
        <CardContent className="text-center">
          {status === "loading" && <Loader2 className="mx-auto animate-spin h-8 w-8" />}
          {status === "success" && (
            <>
              <p className="mb-4">{message}</p>
              <button
                onClick={onContinue}
                className="px-4 py-2 bg-primary text-white rounded"
              >
                Ir a inicio de sesión
              </button>
            </>
          )}
          {status === "error" && <p className="text-destructive">{error}</p>}
        </CardContent>
      </Card>
    </div>
  );
}

export const Route = createLazyFileRoute("/accept-organization-invitation")({  component: AcceptInvitationPage,});
