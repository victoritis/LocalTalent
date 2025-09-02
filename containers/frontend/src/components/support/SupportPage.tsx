import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LifeBuoy, ShieldAlert } from "lucide-react";

export function SupportPage() {
  return (
    <div className="container mx-auto py-10 px-4 flex justify-center items-start">
      <Card className="w-full max-w-2xl shadow-xl">
        <CardHeader className="bg-muted/30">
          <CardTitle className="flex items-center text-2xl">
            <LifeBuoy className="mr-3 h-7 w-7 text-primary" />
            Soporte Técnico
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          <Alert variant="default" className="bg-amber-50 border-amber-300 text-amber-800">
            <ShieldAlert className="h-5 w-5 !text-amber-700" />
            <AlertTitle className="font-semibold text-lg !text-amber-900">Funcionalidad No Disponible</AlertTitle>
            <AlertDescription className="mt-2 text-base">
              Actualmente, la sección de soporte directo a través de esta plataforma no está habilitada.
              <br /><br />
              Si necesitas asistencia o tienes alguna consulta, por favor, <strong>contacta con el administrador de tu organización</strong>.
              Ellos podrán ayudarte con cualquier incidencia o pregunta que tengas.
              <br /><br />
              Agradecemos tu comprensión.
            </AlertDescription>
          </Alert>
          
          <div className="mt-8 text-center">
            <p className="text-sm text-muted-foreground">Equipo de la aplicación</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
