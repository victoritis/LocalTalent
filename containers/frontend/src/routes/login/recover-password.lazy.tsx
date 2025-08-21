import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { zodResolver } from "@hookform/resolvers/zod";
import { createLazyFileRoute, Link } from "@tanstack/react-router";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { useState } from "react";

// Define el tipo para el estado del alerta
type AlertState = {
  type: "success" | "error"
  message: string
} | null

const apiUrl = import.meta.env.VITE_REACT_APP_API_URL;

// Ruta principal para la vista de recuperar contraseña
export const Route = createLazyFileRoute("/login/recover-password")({
  component: ForgotPasswordComponent,
});

// Vista principal
function ForgotPasswordComponent() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 ">
      <h1 className="text-2xl font-bold mb-4">Recuperar contraseña</h1>
      {/* Componente del formulario */}
      <ForgotPasswordForm />
      {/* Enlace para iniciar sesión */}
      <p className="mt-4 text-center text-sm text-gray-600">
        Prueba ahora a {" "}
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

const formSchema = z.object({
  email: z.string().email("Debe ser un correo electrónico válido"),
});

// Componente del formulario de recuperación
function ForgotPasswordForm() {
  const [alert, setAlert] = useState<AlertState>(null);

  // Configuración de react-hook-form
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: "",
    },
  });

  // Manejo del envío del formulario
  async function onSubmit(values: z.infer<typeof formSchema>) {
    try {
      const response = await fetch(
        `${apiUrl}/api/v1/recover-password`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ email: values.email }),
        },
      );

      if (response.ok) {
        setAlert({
          type: "success",
          message: "El correo para recuperar tu contraseña ha sido enviado.",
        });
      } else {
        const error = await response.json();
        setAlert({
          type: "error",
          message: error.message || "Hubo un error al enviar el correo.",
        });
      }
    } catch {
      setAlert({
        type: "error",
        message: "Hubo un problema con la conexión al servidor.",
      });
    }
  }

  return (
    <div className="space-y-6 w-96">
      {alert && (
        <Alert variant={alert.type === "success" ? "default" : "destructive"}>
          <AlertTitle>
            {alert.type === "success" ? "Éxito" : "Error"}
          </AlertTitle>
          <AlertDescription>{alert.message}</AlertDescription>
        </Alert>
      )}

      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="space-y-6 bg-white p-6 rounded-md shadow-md w-96 border border-black"
        >
          {/* Campo de Email */}
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Correo electrónico</FormLabel>
                <FormControl>
                  <Input placeholder="tucorreo@ejemplo.com" {...field} />
                </FormControl>
                <FormDescription>
                  Introduce tu correo electrónico para recuperar tu contraseña.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Botón de Enviar */}
          <Button type="submit" className="w-full">
            Enviar
          </Button>
        </form>
      </Form>
    </div>
  );
}
