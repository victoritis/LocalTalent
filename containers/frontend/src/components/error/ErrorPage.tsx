import { useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { ShieldBan, RotateCw, Home, Lock } from "lucide-react";
import { Link, useRouter } from "@tanstack/react-router";
import { motion } from "framer-motion";

const apiUrl = import.meta.env.VITE_REACT_APP_API_URL;

interface ErrorPageProps {
  errorMessage: string;
  errorCode?: number;
  retry?: () => void;
}

const ErrorPage = ({ errorMessage, errorCode, retry }: ErrorPageProps) => {
  const router = useRouter();

  useEffect(() => {
    const originalOverflow = document.body.style.overflow;
    const originalPaddingRight = document.body.style.paddingRight;
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;

    document.body.style.overflow = "hidden";
    document.body.style.paddingRight = `${scrollbarWidth}px`;

    return () => {
      document.body.style.overflow = originalOverflow;
      document.body.style.paddingRight = originalPaddingRight;
    };
  }, []);

  const logErrorToBackend = async () => {
    try {
      console.log(errorMessage);
      const response = await fetch(`${apiUrl}/api/v1/log-error`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({ error_message: errorMessage }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
    } catch (error) {
      console.error("Error al registrar el mensaje:", error);
    }
  };

  // Evitar múltiples POST del mismo mensaje (re-renders, montajes repetidos)
  const lastLoggedRef = useRef<string | null>(null);
  useEffect(() => {
    if (errorMessage && lastLoggedRef.current !== errorMessage) {
      lastLoggedRef.current = errorMessage;
      logErrorToBackend();
    }
  }, [errorMessage]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ 
        opacity: 1, 
        y: 0,
        transform: "translateZ(0)"
      }}
      transition={{ 
        type: "tween",
        duration: 0.15
      }}
      className="h-screen flex items-center justify-center p-4 bg-background overflow-hidden"
    >
      <div className="w-full max-w-md space-y-6 text-center">
        <div className="relative inline-block">
          <ShieldBan className="h-20 w-20 text-destructive" />
          <Lock className="absolute bottom-0 right-0 h-6 w-6 text-foreground transform translate-x-1/4" />
        </div>

        <h1 className="text-3xl font-bold text-foreground px-4">
          {errorCode ? `Error ${errorCode}` : "¡Acceso Restringido!"}
        </h1>

        <Alert variant="destructive" className="text-left relative">
          <div className="absolute top-4 left-4">
            <ShieldBan className="h-5 w-5" />
          </div>
          <AlertTitle className="text-lg pl-8">Detalles del error</AlertTitle>
          <AlertDescription className="mt-2 text-pretty pl-8">
            {errorMessage}
          </AlertDescription>
        </Alert>

        <div className="space-y-2 text-sm text-muted-foreground px-4">
          <p>Contacto de soporte:</p>
          <a
            href="mailto:soporte@localtalent.es"
            className="text-primary hover:underline font-medium"
          >
            soporte@cvesentinel.csa.es          </a>
        </div>

        <div className="flex flex-col gap-2.5 w-full max-w-xs mx-auto">
          {retry ? (
            <Button
              variant="destructive"
              className="gap-2 w-full"
              onClick={retry}
            >
              <RotateCw className="h-4 w-4" />
              Reintentar acceso
            </Button>
          ) : (
            <Button
              variant="outline"
              className="gap-2 w-full"
              onClick={() => router.invalidate()}
            >
              <RotateCw className="h-4 w-4" />
              Actualizar página
            </Button>
          )}

          <Button asChild variant="secondary" className="gap-2 w-full">
            <Link to="/">
              <Home className="h-4 w-4" />
              Volver al inicio
            </Link>
          </Button>
        </div>
      </div>
    </motion.div>
  );
};

export default ErrorPage;
