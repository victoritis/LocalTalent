import React, { useState } from "react";
import { useRouter } from "@tanstack/react-router";
import {
  HoverCard,
  HoverCardTrigger,
  HoverCardContent,
} from "@/components/ui/hover-card";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Loader2, Shield, Package, Users, AlertCircle, AlertTriangle } from "lucide-react"; // Añadido AlertTriangle aquí
import { fetchOrganizationHoverInfo, OrganizationHoverData } from "@/services/organizations/organizationApi";
import { Progress } from "@/components/ui/progress";

interface ApiErrorResponse {
  error: string;
}

type OrganizationApiResponse = OrganizationHoverData | ApiErrorResponse;

interface OrganizationHoverCardProps {

  name: string;
  image?: string;
  trigger?: React.ReactNode;
  triggerClassName?: string;
  contentClassName?: string;
  side?: "top" | "right" | "bottom" | "left";
  onClick?: () => void;
  disableNavigation?: boolean;
  children?: React.ReactNode;
}

export const OrganizationHoverCard: React.FC<OrganizationHoverCardProps> = ({
  name,
  image,
  trigger,
  triggerClassName = "text-sm font-medium text-blue-600 hover:underline cursor-pointer dark:text-blue-400",
  contentClassName = "p-4 w-80 space-y-3",
  side = "top",
  onClick,
  disableNavigation = false,
  children,
}) => {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [orgData, setOrgData] = useState<OrganizationHoverData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [hasLoadedData, setHasLoadedData] = useState(false);

  const handleClick = () => {
    if (disableNavigation) return;
    
    if (onClick) {
      onClick();
    } else {
      router.navigate({ 
        to: "/auth/organizations/$organizationName/overview", 
        params: { organizationName: name } 
      });
    }
  };

  const fetchOrgData = async () => {
    // Si ya tenemos los datos o estamos cargando, no hacemos nada
    if (hasLoadedData || isLoading) return;
    
    try {
      setIsLoading(true);
      setError(null);
      const data = await fetchOrganizationHoverInfo(name) as OrganizationApiResponse;
      
      if ("error" in data) {
        throw new Error(data.error);
      }
      
      setOrgData(data);
      setHasLoadedData(true);
    } catch (err) {
      console.error("Error al obtener datos de la organización:", err);
      setError(err instanceof Error ? err.message : "Error desconocido");
    } finally {
      setIsLoading(false);
    }
  };


  const getThreatColor = (threatScore: number): string => {
    if (threatScore >= 90) return "hsl(0, 80%, 55%)"; ; 
    if (threatScore >= 50) return "hsl(45, 100%, 50%)"; 
    if (threatScore >= 25) return "hsl(120, 70%, 45%)"; 
    return "hsl(210, 100%, 50%)"; 
  };

  const getMetricValue = (title: string): string => {
    if (!orgData?.metrics) return "0";
    const metric = orgData.metrics.find(m => m.title === title);
    return metric?.value || "0";
  };

  return (
    <HoverCard onOpenChange={(open) => {
      if (open) fetchOrgData();
    }}>
      <HoverCardTrigger asChild>
        {trigger ? (
          React.isValidElement(trigger) 
            ? React.cloneElement(trigger as React.ReactElement, { onClick: handleClick })
            : trigger
        ) : (
          <span
            className={triggerClassName}
            onClick={handleClick}
          >
            {name}
          </span>
        )}
      </HoverCardTrigger>
      <HoverCardContent className={`${contentClassName} shadow-lg`} side={side}>
        <div className="flex space-x-4 items-center">
          <Avatar className="h-12 w-12 border border-muted">
            <AvatarImage src={image} alt={`${name} Logo`} />
            <AvatarFallback className="text-base">{name?.[0] ?? "?"}</AvatarFallback>
          </Avatar>
          <div>
            <h4 className="text-sm font-semibold">{name}</h4>
            <p className="text-xs text-muted-foreground">Organización</p>
          </div>
        </div>
        
        <div className="border-t pt-2">
          {isLoading ? (
            <div className="flex justify-center items-center h-24">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
              <span className="ml-2 text-sm">Cargando datos...</span>
            </div>
          ) : error ? (
            <div className="text-red-500 text-center py-2">
              <p>Error al cargar datos: {error}</p>
            </div>
          ) : orgData ? (
            <div className="space-y-3">
              {/* Nivel de amenaza */}
              <div className="bg-muted/50 rounded-md p-3 space-y-2">
                <div className="flex justify-between items-center">
                  <div className="flex items-center">
                    <Shield className="h-4 w-4 mr-1 text-primary" />
                    <span className="font-medium">Nivel de Amenaza</span>
                  </div>
                  <div className="flex items-center">
                    <span 
                      className="text-sm font-bold mr-1" 
                      style={{ color: getThreatColor(orgData.security_score) }}
                    >
                      {orgData.security_score}%
                    </span>
                    {/* Iconos condicionales para Nivel de Amenaza */}
                  </div>
                </div>
                <Progress 
                  value={orgData.security_score} 
                  max={100}
                  className="h-2"
                  indicatorClassName={"bg-gradient-to-r from-current to-current transition-all"}
                  style={{ color: getThreatColor(orgData.security_score) }}
                />
              </div>
              
              {/* Métricas */}
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-muted/40 rounded-md p-2 flex flex-col items-center">
                  <div className="flex items-center text-amber-600 dark:text-amber-500 mb-1">
                    <AlertCircle className="h-4 w-4 mr-1" /> {/* Icono para Alertas Activas */}
                    <span className="text-xs font-medium">Alertas Activas</span>
                  </div>
                  <span className="text-xl font-bold">{getMetricValue("Alertas Activas")}</span>
                </div>
                
                <div className="bg-muted/40 rounded-md p-2 flex flex-col items-center">
                  <div className="flex items-center text-blue-600 dark:text-blue-500 mb-1">
                    <Package className="h-4 w-4 mr-1" />
                    <span className="text-xs font-medium">CPEs Registrados</span>
                  </div>
                  <span className="text-xl font-bold">{getMetricValue("CPEs Registrados")}</span>
                </div>

                {/* Nueva métrica: Usuarios */}
                <div className="bg-muted/40 rounded-md p-2 flex flex-col items-center">
                  <div className="flex items-center text-green-600 dark:text-green-500 mb-1">
                    <Users className="h-4 w-4 mr-1" />
                    <span className="text-xs font-medium">Usuarios</span>
                  </div>
                  <span className="text-xl font-bold">{getMetricValue("Usuarios")}</span>
                </div>

                {/* Nueva métrica: Alertas Críticas */}
                <div className="bg-muted/40 rounded-md p-2 flex flex-col items-center">
                  <div className="flex items-center text-red-600 dark:text-red-500 mb-1">
                    <AlertTriangle className="h-4 w-4 mr-1" /> {/* Icono para Alertas Críticas */}
                    <span className="text-xs font-medium">Alertas Críticas</span>
                  </div>
                  <span className="text-xl font-bold">{getMetricValue("Alertas Críticas")}</span>
                </div>
              </div>
            </div>
          ) : null}
        </div>
        
        {children}
      </HoverCardContent>
    </HoverCard>
  );
};
