import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Mail, Lock, AlertCircle, Terminal } from "lucide-react";
import { Label } from "@/components/ui/label";

const formSchema = z.object({
  username: z.string().email("Debe ser un correo válido"),
  password: z.string().min(6, "Debe tener al menos 6 caracteres"),
});


export type FormValues = z.infer<typeof formSchema>;

interface LoginStep1Props {
  animateOut: boolean;
  onCheckCredentials: (values: FormValues) => void;
  customAlert: { type: "" | "success" | "error"; message: string };
}

export function LoginStep1({ animateOut, onCheckCredentials, customAlert }: LoginStep1Props) {
  const { register, handleSubmit } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { username: "", password: "" },
  });

  return (
    <div
      className={`absolute inset-0 transition-all duration-500 ${
        animateOut ? "opacity-0 -translate-x-full" : "opacity-100 translate-x-0"
      }`}
    >
      <form className="flex flex-col gap-6" onSubmit={handleSubmit(onCheckCredentials)}>
        {/* Encabezado */}
        <div className="flex flex-col items-center gap-2 text-center">
          <h1 className="text-2xl font-bold">Inicia sesión en tu cuenta</h1>
          <p className="text-sm text-muted-foreground">
            Ingresa tus credenciales para continuar
          </p>
        </div>

        {/* Alertas */}
        {customAlert.type && (
          <Alert
            variant={customAlert.type === "success" ? "default" : "destructive"}
            className="mb-4"
          >
            {customAlert.type === "success" ? (
              <>
                <Terminal className="h-4 w-4" />
                <AlertTitle>¡Éxito!</AlertTitle>
                <AlertDescription>{customAlert.message}</AlertDescription>
              </>
            ) : (
              <>
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>{customAlert.message}</AlertDescription>
              </>
            )}
          </Alert>
        )}

        <div className="grid gap-6">
          {/* Campo Email */}
          <div className="grid gap-2">
            <Label htmlFor="username">Email</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-3 text-gray-400" size={18} />
              <Input
                id="username"
                type="email"
                placeholder="usuario@example.com"
                {...register("username")}
                className="pl-10"
                required
              />
            </div>
          </div>

          {/* Campo Contraseña */}
          <div className="grid gap-2">
            <Label htmlFor="password">Contraseña</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-3 text-gray-400" size={18} />
              <Input
                id="password"
                type="password"
                placeholder="**********"
                {...register("password")}
                className="pl-10"
                required
              />
            </div>
          </div>

          <Button type="submit" className="w-full">
            Iniciar sesión
          </Button>
        </div>

        {/* Footer: enlace de recuperación de contraseña */}
        <div className="text-center text-sm">
          ¿Olvidaste tu contraseña?{" "}
          <a href="/login/recover-password" className="underline underline-offset-4">
            Recupérala ahora
          </a>
        </div>
      </form>
    </div>
  );
}
