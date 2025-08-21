import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Search, Compass, Home, ArrowLeft } from "lucide-react";
import { Link, useRouter } from "@tanstack/react-router";
import { motion } from "framer-motion";

const Error404Page = () => {
  const router = useRouter();

  useEffect(() => {
    document.title = "Página no encontrada - TuAplicación";
    return () => {
      document.title = "TuAplicación";
    };
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="min-h-screen flex items-center justify-center p-4 bg-background"
    >
      <div className="w-full max-w-2xl text-center space-y-8">
        <div className="relative inline-block">
          <motion.div
            animate={{ 
              scale: [1, 1.1, 1],
              rotate: [0, 5, 0, -5, 0]
            }}
            transition={{ 
              duration: 3, 
              repeat: Infinity,
              ease: "easeInOut" 
            }}
          >
            <Compass className="h-32 w-32 text-primary/80" />
          </motion.div>
          
          <motion.div
            className="absolute -top-6 -right-6"
            animate={{
              rotate: [0, 15, -15, 15, 0],
              x: [0, 5, -5, 5, 0],
              y: [0, -5, 5, -5, 0]
            }}
            transition={{ 
              duration: 4, 
              repeat: Infinity,
              ease: "easeInOut" 
            }}
          >
            <Search className="h-20 w-20 text-foreground/70" />
          </motion.div>
        </div>

        <div className="space-y-4">
          <h1 className="text-5xl font-bold text-foreground">
            ¡Ups! Página no encontrada
          </h1>
          <p className="text-xl text-muted-foreground">
            Parece que te has perdido en nuestro sistema...
          </p>
        </div>

        <Alert className="max-w-xl mx-auto text-left">
          <Search className="h-5 w-5" />
          <AlertTitle className="text-lg">Posibles causas:</AlertTitle>
          <AlertDescription className="mt-2 space-y-2">
            <p>• URL mal escrita</p>
            <p>• Contenido temporalmente inaccesible</p>
            <p>• Enlace obsoleto</p>
          </AlertDescription>
        </Alert>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Button 
            variant="outline" 
            className="gap-2"
            onClick={() => router.history.back()}
          >
            <ArrowLeft className="h-4 w-4" />
            Volver atrás
          </Button>
          
          <Button asChild className="gap-2">
            <Link to="/">
              <Home className="h-4 w-4" />
              Ir al inicio
            </Link>
          </Button>
        </div>

        <div className="mt-8 text-sm text-muted-foreground">
          ¿Necesitas ayuda? Contacta a{" "}
          <a
            href="mailto:soporte@cve-sentinel.csa.es"
            className="text-primary hover:underline font-medium"
          >
            soporte@cvesentinel.csa.es          </a>
        </div>
      </div>
    </motion.div>
  );
};

export default Error404Page;
