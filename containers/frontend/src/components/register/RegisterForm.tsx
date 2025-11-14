import React from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Terminal, CheckCircle2 } from "lucide-react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";

const apiUrl = import.meta.env.VITE_REACT_APP_API_URL;

const formSchema = z.object({
  email: z
    .string()
    .min(1, "El email es requerido")
    .email("Formato de email inválido"),
  password: z
    .string()
    .min(8, "La contraseña debe tener al menos 8 caracteres"),
  confirmPassword: z
    .string()
    .min(1, "Por favor confirma tu contraseña"),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Las contraseñas no coinciden",
  path: ["confirmPassword"],
});

type FormValues = z.infer<typeof formSchema>;

export function RegisterForm() {
  const [loading, setLoading] = React.useState(false);
  const [alert, setAlert] = React.useState<{
    type: "" | "success" | "error";
    message: string;
  }>({ type: "", message: "" });
  const [registrationComplete, setRegistrationComplete] = React.useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: "",
      password: "",
      confirmPassword: "",
    },
  });

  async function onSubmit(values: FormValues) {
    setLoading(true);
    setAlert({ type: "", message: "" });

    try {
      const response = await fetch(`${apiUrl}/api/v1/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: values.email,
          password: values.password,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setAlert({
          type: "success",
          message: data.msg || "Registro exitoso. Por favor, revisa tu correo para activar tu cuenta.",
        });
        setRegistrationComplete(true);
        form.reset();
      } else {
        setAlert({
          type: "error",
          message: data.msg || "Error al registrar la cuenta",
        });
      }
    } catch (error) {
      console.error("Error:", error);
      setAlert({
        type: "error",
        message: "Hubo un problema con el servidor. Por favor, inténtalo de nuevo.",
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-md">
      <Card className="p-6 rounded-xl shadow-2xl border border-black bg-white">
        <CardHeader>
          <CardTitle className="text-2xl font-bold text-black text-center">
            Crear Cuenta
          </CardTitle>
          <CardDescription className="text-black text-center">
            Regístrate en Local Talent
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          {alert.type && (
            <Alert variant={alert.type === "error" ? "destructive" : "default"}>
              <Terminal className="h-4 w-4" />
              <AlertTitle>
                {alert.type === "error" ? "Error" : "¡Éxito!"}
              </AlertTitle>
              <AlertDescription>{alert.message}</AlertDescription>
            </Alert>
          )}

          {registrationComplete ? (
            <div className="text-center py-8 space-y-4">
              <CheckCircle2 className="h-16 w-16 text-green-600 mx-auto" />
              <p className="text-lg font-semibold text-black">
                ¡Revisa tu correo electrónico!
              </p>
              <p className="text-sm text-gray-600">
                Te hemos enviado un enlace para completar tu registro.
                El enlace expirará en 10 minutos.
              </p>
              <Button
                onClick={() => {
                  setRegistrationComplete(false);
                  setAlert({ type: "", message: "" });
                }}
                variant="outline"
                className="mt-4"
              >
                Registrar otra cuenta
              </Button>
            </div>
          ) : (
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-black font-semibold">
                  Email
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="tu@email.com"
                  {...form.register("email")}
                  className="border-black"
                  disabled={loading}
                />
                {form.formState.errors.email && (
                  <p className="text-sm text-red-600">
                    {form.formState.errors.email.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-black font-semibold">
                  Contraseña
                </Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  {...form.register("password")}
                  className="border-black"
                  disabled={loading}
                />
                {form.formState.errors.password && (
                  <p className="text-sm text-red-600">
                    {form.formState.errors.password.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword" className="text-black font-semibold">
                  Confirmar Contraseña
                </Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  placeholder="••••••••"
                  {...form.register("confirmPassword")}
                  className="border-black"
                  disabled={loading}
                />
                {form.formState.errors.confirmPassword && (
                  <p className="text-sm text-red-600">
                    {form.formState.errors.confirmPassword.message}
                  </p>
                )}
              </div>

              <Button
                type="submit"
                className="w-full border-black"
                disabled={loading}
              >
                {loading ? "Registrando..." : "Registrarse"}
              </Button>
            </form>
          )}
        </CardContent>

        <CardFooter className="flex flex-col items-center space-y-2 pt-4">
          <p className="text-sm text-gray-600">
            ¿Ya tienes una cuenta?{" "}
            <a href="/login" className="text-blue-600 hover:underline font-semibold">
              Inicia sesión
            </a>
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}
