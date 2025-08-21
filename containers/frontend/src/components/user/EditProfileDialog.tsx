import { useEffect, useState } from "react";
import { useForm, SubmitHandler } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
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

const apiUrl = import.meta.env.VITE_REACT_APP_API_URL || "";

// Esquema para validación y manejo del campo archivo
const profileSchema = z.object({
  firstName: z.string().min(2, "El nombre debe tener al menos 2 caracteres"),
  lastName: z.string().min(2, "El apellido debe tener al menos 2 caracteres"),
  profileImage: z.any()
    .transform((val) => val?.[0] || null)
    .refine((file) => !file || file instanceof File, {
      message: "Debe ser un archivo válido",
    })
    .nullable()
    .optional(),
});

type ProfileFormValues = {
  firstName: string;
  lastName: string;
  profileImage: File | null;
};

interface EditProfileDialogProps {
  user: {
    firstName: string;
    lastName: string;
    profileImage?: string;
  };

  onSave: (updatedUser: Partial<{ firstName: string; lastName: string; profileImage: string }>) => void;
}

export function EditProfileDialog({ user, onSave }: EditProfileDialogProps) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="text-gray-800 hover:bg-gray-200">
          Editar Perfil
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Editar perfil</DialogTitle>
          <DialogDescription>
            Realiza cambios en tu perfil aquí. Haz clic en "Guardar" cuando termines.
          </DialogDescription>
        </DialogHeader>
        <EditProfileForm 
          user={user} 
          onSave={(updatedUser) => {
            onSave(updatedUser);
            setOpen(false);
            // Recargar la página después de guardar
            setTimeout(() => {
              window.location.reload();
            }, 300);
          }} 
        />
      </DialogContent>
    </Dialog>
  );
}

function EditProfileForm({ user, onSave }: EditProfileDialogProps) {
  const [previewImage, setPreviewImage] = useState<string | null>(user.profileImage || null);
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      firstName: user.firstName,
      lastName: user.lastName,
      profileImage: null,
    },
  });

  // Extraemos la referencia para el input de archivo correctamente
  const { ref: fileRef, ...fileRegister } = register("profileImage");

  const profileImage = watch("profileImage");

  useEffect(() => {
    if (profileImage && profileImage instanceof File) {
      const reader = new FileReader();
      reader.onload = () => {
        if (reader.result) {
          setPreviewImage(reader.result as string);
        }
      };
      reader.readAsDataURL(profileImage);
    }
  }, [profileImage]);

  const onSubmit: SubmitHandler<ProfileFormValues> = async (data) => {
    try {
      setServerError(null);
      const formData = new FormData();
      formData.append("firstName", data.firstName);
      formData.append("lastName", data.lastName);

      if (data.profileImage) {
        formData.append("profileImage", data.profileImage);
      }

      const response = await fetch(`${apiUrl}/api/v1/user/update-profile`, {
        method: "POST",
        body: formData,
        credentials: "include",
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Error en el servidor");
      }

      const result = await response.json();
      onSave({
        firstName: data.firstName,
        lastName: data.lastName,
        profileImage: result.profile_image
          ? `data:image/png;base64,${result.profile_image}`
          : user.profileImage || "",
      });
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      setServerError(err.message);
      setError("root.serverError", {
        type: "server",
        message: err.message
      });
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <div className="grid gap-4 py-4">
        {previewImage && (
          <div className="flex justify-center">
            <img src={previewImage} alt="Preview" className="h-32 w-32 rounded-full object-cover" />
          </div>
        )}

        <div className="grid grid-cols-4 items-center gap-4">
          <Label htmlFor="profileImage" className="text-right">
            Foto de perfil
          </Label>
          <Input
            id="profileImage"
            type="file"
            accept="image/*"
            className="col-span-3"
            {...fileRegister}
            ref={(e) => {
              fileRef(e);
            }}
          />
          {errors.profileImage && (
            <p className="col-span-4 text-red-500 text-sm">{errors.profileImage.message as string}</p>
          )}
        </div>

        <div className="grid grid-cols-4 items-center gap-4">
          <Label htmlFor="firstName" className="text-right">
            Nombre
          </Label>
          <Input id="firstName" {...register("firstName")} className="col-span-3" />
          {errors.firstName && (
            <p className="col-span-4 text-red-500 text-sm">{errors.firstName.message as string}</p>
          )}
        </div>

        <div className="grid grid-cols-4 items-center gap-4">
          <Label htmlFor="lastName" className="text-right">
            Apellido
          </Label>
          <Input id="lastName" {...register("lastName")} className="col-span-3" />
          {errors.lastName && (
            <p className="col-span-4 text-red-500 text-sm">{errors.lastName.message as string}</p>
          )}
        </div>
      </div>

      {serverError && (
        <p className="text-red-500 text-sm text-center mb-4">{serverError}</p>
      )}

      <DialogFooter>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Guardando..." : "Guardar cambios"}
        </Button>
      </DialogFooter>
    </form>
  );
}
