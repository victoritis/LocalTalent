import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";

const apiUrl = import.meta.env.VITE_REACT_APP_API_URL;

// Esquema de validación para la contraseña.
const passwordSchema = z
  .object({
    currentPassword: z.string().min(6, "La contraseña actual debe tener al menos 6 caracteres"),
    password: z.string().min(6, "La nueva contraseña debe tener al menos 6 caracteres"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Las contraseñas no coinciden",
    path: ["confirmPassword"],
  });

interface EditPasswordDialogProps {
  onChangePassword: (newPassword: string) => void
}

export function EditPasswordDialog({ onChangePassword }: EditPasswordDialogProps) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" className="text-gray-800 hover:bg-gray-200">
          Cambiar Contraseña
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Cambiar contraseña</DialogTitle>
          <DialogDescription>
            Introduce tu nueva contraseña y confírmala. Haz clic en "Guardar" para confirmar.
          </DialogDescription>
        </DialogHeader>

        <ChangePasswordForm onChangePassword={onChangePassword} />
      </DialogContent>
    </Dialog>
  );
}

function ChangePasswordForm({
  onChangePassword,
}: {
  onChangePassword: (newPassword: string) => void
}) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(passwordSchema),
    defaultValues: {
      currentPassword: "",
      password: "",
      confirmPassword: "",
    },
  });

  const onSubmit = async (data: {
    currentPassword: string
    password: string
    confirmPassword: string
  }) => {
    try {
      const response = await fetch(`${apiUrl}/api/v1/reset-password`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          current_password: data.currentPassword,
          new_password: data.password,
          confirm_password: data.confirmPassword,
        }),
        credentials: "include",
      });

      if (response.ok) {
        onChangePassword(data.password);
        alert("Contraseña cambiada exitosamente.");
      } else {
        const errorData = await response.json();
        alert(errorData.msg || "Error al cambiar la contraseña.");
      }
    } catch (err) {
      console.error("Error al cambiar la contraseña:", err);
      alert("Hubo un problema con el servidor.");
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4 py-4">
      <div className="grid grid-cols-4 items-center gap-4">
        <Label htmlFor="currentPassword" className="text-right">
          Contraseña Actual
        </Label>
        <Input
          id="currentPassword"
          type="password"
          placeholder="********"
          {...register("currentPassword")}
          className="col-span-3"
        />
        {errors.currentPassword && (
          <p className="text-red-600 text-sm col-span-4">
            {errors.currentPassword.message as string}
          </p>
        )}
      </div>

      <div className="grid grid-cols-4 items-center gap-4">
        <Label htmlFor="password" className="text-right">
          Nueva Contraseña
        </Label>
        <Input
          id="password"
          type="password"
          placeholder="********"
          {...register("password")}
          className="col-span-3"
        />
        {errors.password && (
          <p className="text-red-600 text-sm col-span-4">
            {errors.password.message as string}
          </p>
        )}
      </div>

      <div className="grid grid-cols-4 items-center gap-4">
        <Label htmlFor="confirmPassword" className="text-right">
          Confirmar Contraseña
        </Label>
        <Input
          id="confirmPassword"
          type="password"
          placeholder="********"
          {...register("confirmPassword")}
          className="col-span-3"
        />
        {errors.confirmPassword && (
          <p className="text-red-600 text-sm col-span-4">
            {errors.confirmPassword.message as string}
          </p>
        )}
      </div>

      <DialogFooter>
        <Button type="submit">Guardar contraseña</Button>
      </DialogFooter>
    </form>
  );
}
