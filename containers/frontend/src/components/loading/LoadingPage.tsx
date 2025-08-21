import { useEffect } from "react";
import { motion } from "framer-motion";
import { Loader2 } from "lucide-react";

const LoadingPage = () => {
  useEffect(() => {
    // Bloqueamos el scroll mientras se muestra la carga
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
          <Loader2 className="h-20 w-20 text-primary animate-spin" />
        </div>

        <h1 className="text-3xl font-bold text-foreground px-4">
          Cargando...
        </h1>

        <p className="text-pretty px-4">
          Por favor, espera mientras se carga la configuración necesaria.
        </p>


      </div>
    </motion.div>
  );
};

export default LoadingPage;
