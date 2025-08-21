import React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardFooter,
} from "@/components/ui/card";

const apiUrl = import.meta.env.VITE_REACT_APP_API_URL;

// Importa tu alerta destructiva
import { AlertDestructive } from "@/components/ui/alertDestructive";

interface Step1Props {
  formData: {
    first_name: string;
    last_name: string;
    password: string;
    confirmPassword: string;
  };
  onChange: (field: string, value: string) => void;
  onNext: () => void;
  onTokenError: (errorMessage: string) => void;
  error: string; // <-- Nueva prop para recibir el error
}

export function CreateAccountStep1({
  formData,
  onChange,
  onNext,
  onTokenError,
  error,
}: Step1Props) {
  const [loading, setLoading] = React.useState(false);

  // Obtener token de la query
  const urlParams = new URLSearchParams(window.location.search);
  const token = urlParams.get("token") || "";

  async function handleSubmitStep1() {
    setLoading(true);
  
    try {
      const response = await fetch(
        `${apiUrl}/api/v1/register-step1/${token}`, 
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            first_name: formData.first_name,
            last_name: formData.last_name,
            password: formData.password,
            confirmPassword: formData.confirmPassword,
          }),
        }
      );
  
      const errorData = await response.json();
  
      if (!response.ok) {
        onTokenError(errorData.msg || "Error con el token.");
        return;
      }
  
      onNext();
    } catch (err) {
      console.error("Error al crear la cuenta:", err);
      onTokenError("Error de conexión. Inténtalo de nuevo.");
    } finally {
      setLoading(false);
    }
  }
  
  return (
    <Card className="w-full max-w-md p-6 rounded-xl shadow-2xl border border-black bg-white">
      <CardHeader>
        <CardTitle className="text-2xl font-bold text-black">Crear Cuenta - Paso 1</CardTitle>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* FIRST NAME */}
        <div className="flex flex-col space-y-2">
          <Label htmlFor="first_name" className="text-black font-semibold">Nombre</Label>
          <Input
            id="first_name"
            placeholder="Tu nombre"
            value={formData.first_name}
            onChange={(e) => onChange("first_name", e.target.value)}
            className="border border-black rounded-md"
          />
        </div>

        {/* LAST NAME */}
        <div className="flex flex-col space-y-2">
          <Label htmlFor="last_name" className="text-black font-semibold">Apellidos</Label>
          <Input
            id="last_name"
            placeholder="Tus apellidos"
            value={formData.last_name}
            onChange={(e) => onChange("last_name", e.target.value)}
            className="border border-black rounded-md"
          />
        </div>

        {/* PASSWORD */}
        <div className="flex flex-col space-y-2">
          <Label htmlFor="password" className="text-black font-semibold">Contraseña</Label>
          <Input
            id="password"
            type="password"
            placeholder="•••••••"
            value={formData.password}
            onChange={(e) => onChange("password", e.target.value)}
            className="border border-black rounded-md"
          />
        </div>

        {/* CONFIRM PASSWORD */}
        <div className="flex flex-col space-y-2">
          <Label htmlFor="confirmPassword" className="text-black font-semibold">Repite la contraseña</Label>
          <Input
            id="confirmPassword"
            type="password"
            placeholder="•••••••"
            value={formData.confirmPassword}
            onChange={(e) => onChange("confirmPassword", e.target.value)}
            className="border border-black rounded-md"
          />
        </div>
        {/* Si hay error, lo mostramos aquí con tu AlertDestructive */}
        {error && (
          <AlertDestructive message={error} />
        )}
      </CardContent>

      <CardFooter className="flex justify-end">
        <Button onClick={handleSubmitStep1} disabled={loading} className="px-6 py-2">
          {loading ? "Creando..." : "Siguiente"}
        </Button>
      </CardFooter>
    </Card>
  );
}
