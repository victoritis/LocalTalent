import { useState } from "react";
import { createLazyFileRoute, useRouter } from "@tanstack/react-router";
import { useAuth } from "@/auth";
import { createOrganization } from "@/services/organizations/organizationApi";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Loader2, ImagePlus } from "lucide-react";

export const Route = createLazyFileRoute(
  "/auth/superadmin/create-organization"
)({
  component: CreateOrganizationPage,
});

function CreateOrganizationPage() {
  const { roles } = useAuth();
  const router = useRouter();
  const [name, setName] = useState("");
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({ name: "", logo: "" });

  if (!roles.ROLE_SUPERADMIN) {
    return <p className="p-8 text-center text-red-600">Acceso denegado</p>;
  }

  const validateForm = () => {
    const newErrors = { name: "", logo: "" };
    if (!name.trim())
      newErrors.name = "El nombre de la organización es obligatorio.";
    if (!logoFile) newErrors.logo = "El logo de la organización es obligatorio.";
    setErrors(newErrors);
    return !newErrors.name && !newErrors.logo;
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    setLogoFile(file);
    if (file) {
      setPreview(URL.createObjectURL(file));
      setErrors((prev) => ({ ...prev, logo: "" }));
    }
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    setLoading(true);
    try {
      const res = await createOrganization(name.trim(), logoFile!);
      if (res.error) {
        toast.error(res.error);
      } else {
        toast.success(res.message || "Organización creada exitosamente");
        router.navigate({ to: "/auth/superadmin/manage-organizations" });
      }
    } catch {
      toast.error("Error al crear la organización");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto py-12">
      <Card className="shadow-lg border border-border/40">
        <CardHeader className="bg-muted/40 p-6 border-b border-border/40">
          <CardTitle className="text-xl font-semibold">
            Crear Nueva Organización
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6 space-y-6">
          <div>
            <label className="block text-sm font-medium mb-1">
              Nombre de la Organización
            </label>
            <Input
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                setErrors((prev) => ({ ...prev, name: "" }));
              }}
              placeholder="Ejemplo: Mi Organización"
              className={errors.name ? "border-red-500" : ""}
            />
            {errors.name && (
              <p className="text-sm text-red-500 mt-1">{errors.name}</p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">
              Logo de la Organización
            </label>
            <div className="flex items-center gap-4">
              <label
                htmlFor="logo-upload"
                className="cursor-pointer flex items-center justify-center w-32 h-32 bg-muted/30 border border-dashed border-border rounded-md hover:bg-muted/50"
              >
                {preview ? (
                  <img
                    src={preview}
                    alt="Preview"
                    className="h-full w-full object-cover rounded-md"
                  />
                ) : (
                  <div className="flex flex-col items-center text-muted-foreground">
                    <ImagePlus className="h-6 w-6" />
                    <span className="text-xs">Subir Logo</span>
                  </div>
                )}
              </label>
              <input
                id="logo-upload"
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="hidden"
              />
              <div className="text-sm text-muted-foreground">
                <p>Formatos soportados: PNG, JPG.</p>
                <p>Tamaño máximo: 2MB.</p>
              </div>
            </div>
            {errors.logo && (
              <p className="text-sm text-red-500 mt-1">{errors.logo}</p>
            )}
          </div>
        </CardContent>
        <CardFooter className="p-6 flex justify-end">
          <Button onClick={handleSubmit} disabled={loading} className="w-full sm:w-auto">
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creando...
              </>
            ) : (
              "Crear Organización"
            )}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
