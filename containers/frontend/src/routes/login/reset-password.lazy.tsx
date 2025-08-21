import { createLazyFileRoute } from "@tanstack/react-router";
import { Link } from "@tanstack/react-router";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle, Terminal } from "lucide-react";
import { useState } from "react";

const apiUrl = import.meta.env.VITE_REACT_APP_API_URL;

// Define el esquema del formulario y la validación
const formSchema = z
  .object({
    newPassword: z
      .string()
      .min(6, "La contraseña debe tener al menos 6 caracteres"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Las contraseñas no coinciden",
    path: ["confirmPassword"],
  });

// Define el tipo para el estado de notificación
type NotificationState = {
  type: "success" | "error"
  message: string
} | null

export default function SetNewPassword() {
  const [notification, setNotification] = useState<NotificationState>(null);

  const form = useForm({
    resolver: zodResolver(formSchema),
    defaultValues: {
      newPassword: "",
      confirmPassword: "",
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get("token");

    if (!token) {
      setNotification({
        type: "error",
        message: "Token no encontrado en la URL.",
      });
      return;
    }

    try {
      const response = await fetch(
        `${apiUrl}/api/v1/reset-password-token/${token}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            password: values.newPassword,
            confirmPassword: values.confirmPassword,
          }),
        },
      );

      if (response.ok) {
        setNotification({
          type: "success",
          message: "Contraseña actualizada exitosamente.",
        });
        new Notification("Éxito", {
          body: "Tu contraseña se ha actualizado correctamente.",
        });
      } else {
        const errorData = await response.json();
        setNotification({
          type: "error",
          message: errorData.msg || "Error al actualizar la contraseña.",
        });
      }
    } catch (error) {
      console.error("Error:", error);
      setNotification({
        type: "error",
        message: "Hubo un problema con la conexión al servidor.",
      });
    }
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-b from-white to-gray-200 ">
      <h1 className="text-3xl font-bold text-black mb-4">
        Establecer nueva contraseña
      </h1>
      <div className="w-full max-w-md bg-white p-8 rounded-lg shadow-lg border border-black">
        {/* Renderiza la notificación */}
        {notification && (
          <Alert
            variant={
              notification.type === "success" ? "default" : "destructive"
            }
            className="mb-4"
          >
            {notification.type === "success" ? (
              <>
                <Terminal className="h-4 w-4" />
                <AlertTitle>¡Éxito!</AlertTitle>
                <AlertDescription>{notification.message}</AlertDescription>
              </>
            ) : (
              <>
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>{notification.message}</AlertDescription>
              </>
            )}
          </Alert>
        )}

        {/* Formulario */}
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Nueva contraseña */}
            <FormField
              control={form.control}
              name="newPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nueva contraseña</FormLabel>
                  <FormControl>
                    <Input
                      type="password"
                      placeholder="Nueva contraseña"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Confirmar contraseña */}
            <FormField
              control={form.control}
              name="confirmPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Confirmar contraseña</FormLabel>
                  <FormControl>
                    <Input
                      type="password"
                      placeholder="Confirmar contraseña"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Botón de envío */}
            <Button
              type="submit"
              className="w-full bg-black text-white hover:bg-gray-800"
            >
              Actualizar contraseña
            </Button>
          </form>
        </Form>
      </div>
      
      {/* Enlace para iniciar sesión */}
      <p className="mt-4 text-center text-sm text-gray-600">
        Prueba ahora a{" "}
        <Link
          to="/login"
          className="font-medium text-blue-600 hover:text-blue-500 hover:underline"
        >
          Inicia sesión aquí
        </Link>
      </p>
    </div>
  );
}

export const Route = createLazyFileRoute("/login/reset-password")({
  component: SetNewPassword,
});
