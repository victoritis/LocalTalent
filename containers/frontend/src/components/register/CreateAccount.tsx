import { FormEvent, useMemo, useState } from "react";
import { CreateAccountStep1 } from "@/components/register/CreateAccountStep1";
import { CreateAccountStep2 } from "@/components/register/CreateAccountStep2";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const apiUrl = import.meta.env.VITE_REACT_APP_API_URL;

export function CreateAccountPage() {
  const [step, setStep] = useState(1);
  const [error, setError] = useState("");
  const token = useMemo(() => {
    if (typeof window === "undefined") return "";
    const params = new URLSearchParams(window.location.search);
    return params.get("token") || "";
  }, []);

  const [formData, setFormData] = useState({
    first_name: "",
    last_name: "",
    username: "",
    password: "",
    confirmPassword: "",
    otp: "",
  });

  function handleChange(field: string, value: string) {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  }

  // Maneja errores que vengan desde el paso 1
  function handleTokenError(errorMessage: string) {
    setError(errorMessage);
    setStep(1);
  }

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center p-8">
        <RegistrationRequestCard />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-8">
      {step === 1 && (
        <CreateAccountStep1
          formData={formData}
          onChange={handleChange}
          onNext={() => setStep(2)}
          onTokenError={handleTokenError}
          error={error} 
        />
      )}

      {step === 2 && (
        <CreateAccountStep2
          formData={formData}
          onChange={handleChange}
          onBack={() => setStep(1)}
        />
      )}
    </div>
  );
}

function RegistrationRequestCard() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<{ type: "success" | "error"; message: string } | null>(null);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus(null);

    if (!email) {
      setStatus({ type: "error", message: "Ingresa un correo electrónico válido." });
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${apiUrl}/api/v1/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await response.json().catch(() => ({}));
      if (response.ok) {
        setStatus({
          type: "success",
          message:
            data.msg || "Te enviamos un correo con instrucciones para continuar tu registro.",
        });
        setEmail("");
      } else {
        setStatus({
          type: "error",
          message: data.msg || "No pudimos procesar tu solicitud. Inténtalo nuevamente.",
        });
      }
    } catch (error) {
      console.error("Error al solicitar registro:", error);
      setStatus({ type: "error", message: "Error de conexión. Inténtalo nuevamente." });
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className="w-full max-w-md p-6 rounded-xl shadow-2xl border border-black bg-white">
      <CardHeader>
        <CardTitle className="text-2xl font-bold text-black text-center">Crear cuenta</CardTitle>
        <CardDescription className="text-center text-black">
          Ingresa tu correo y te enviaremos un enlace para completar el registro.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex flex-col space-y-2">
            <Label htmlFor="register-email" className="text-black font-semibold">
              Correo electrónico
            </Label>
            <Input
              id="register-email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="tucorreo@ejemplo.com"
              className="border border-black rounded-md"
            />
          </div>

          {status && (
            <p
              className={`text-sm ${
                status.type === "error" ? "text-red-600" : "text-green-600"
              }`}
            >
              {status.message}
            </p>
          )}

          <Button type="submit" disabled={loading} className="w-full">
            {loading ? "Enviando..." : "Enviar enlace"}
          </Button>
        </form>
      </CardContent>
      <CardFooter className="text-sm text-center text-muted-foreground">
        ¿Ya tienes token? Abre el enlace del correo para continuar con el registro.
      </CardFooter>
    </Card>
  );
}
