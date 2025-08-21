import { useEffect, useState} from "react";
import {
  fetchSuperAdminSummary,
  fetchLoadProgress,
  SuperAdminSummaryData,
  LoadProgressData,
} from "@/services/admin/superadminApi";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Loader2,
  AlertTriangle,
  Database,
  ShieldAlert,
  PackageSearch,
  ListFilter,
  Users,
  Building,
  Package,
  BellRing,
  CheckCircle2,
  XCircle,
  Clock,
  DatabaseZap,
} from "lucide-react";
import { toast } from "sonner";
import React from "react";
import { format, parseISO, differenceInHours } from "date-fns";
import { es } from "date-fns/locale";
import { cn } from "@/lib/utils";

interface CountCardProps {
  title: string;
  count: number | null;
  icon: React.ReactNode;
  isLoading: boolean;
  colorClass?: string;
  description?: string;
}

const CountCard: React.FC<CountCardProps> = ({ title, count, icon, isLoading, colorClass = "bg-primary", description }) => (
  <Card className="shadow-md hover:shadow-lg transition-shadow min-h-[6.5rem]"> {/* Aumentar altura mínima */}
    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1.5"> {/* Ajustar padding */}
      <CardTitle className="text-sm font-medium">{title}</CardTitle> {/* Tamaño de fuente ligeramente mayor */}
      <div className={`h-6 w-6 ${colorClass} flex items-center justify-center rounded-sm text-white`}> {/* Icono un poco más grande */}
        {React.cloneElement(icon as React.ReactElement, { className: "h-4 w-4" })}
      </div>
    </CardHeader>
    <CardContent className="pt-1"> {/* Ajustar padding */}
      {isLoading ? (
        <Loader2 className="h-7 w-7 animate-spin text-muted-foreground" />
      ) : (
        <div className="text-xl font-bold"> {/* Contador más grande */}
          {count !== null ? count.toLocaleString() : "-"}
        </div>
      )}
      <p className="text-xs text-muted-foreground">{description || "Total de registros"}</p> {/* Descripción más legible */}
    </CardContent>
  </Card>
);

interface InfoCardProps {
  title: string;
  value: string | React.ReactNode;
  icon: React.ReactNode;
  isLoading: boolean;
  colorClass?: string;
  subValue?: string | React.ReactNode;
}

const InfoCard: React.FC<InfoCardProps> = ({ title, value, icon, isLoading, colorClass = "text-primary", subValue }) => (
    <Card className="shadow-md hover:shadow-lg transition-shadow">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{title}</CardTitle>
            {React.cloneElement(icon as React.ReactElement, { className: `h-5 w-5 ${colorClass}` })}
        </CardHeader>
        <CardContent>
            {isLoading ? (
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            ) : (
                <div className="text-xl font-bold">{value}</div>
            )}
            {subValue && <p className="text-xs text-muted-foreground mt-1">{subValue}</p>}
        </CardContent>
    </Card>
);

interface UpdateStatusItemProps {
  label: string;
  dateString: string | null;
  icon: React.ReactNode;
  isLoading: boolean;
  progress?: number | undefined; // Añadir el progreso como prop
}

const UpdateStatusItem: React.FC<UpdateStatusItemProps> = ({ label, dateString, icon, progress }) => {
  const formatDate = (ds: string | null): string => {
    if (!ds) return "N/A";
    try {
      // Cambiar el formato para que muestre "27 de mayo de 2025 a las 10:29:45"
      return format(parseISO(ds), "d 'de' MMMM 'de' yyyy 'a las' HH:mm:ss", { locale: es });
    } catch {
      return "Fecha inválida";
    }
  };

  let isDataStale = false;
  let displayDate = "N/A";

  const isError = progress === -1;
  const isIncomplete = progress !== undefined && progress < 100 && progress >= 0;


  if (dateString) {
    displayDate = formatDate(dateString);
    try {
      const lastUpdateDate = parseISO(dateString);
      const now = new Date();
      if (differenceInHours(now, lastUpdateDate) > 5) {
        isDataStale = true;
      }
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (e) {
      isDataStale = true;
      displayDate = "Fecha inválida";
    }
  }

  return (
    <div className="flex items-center space-x-3 py-2">
      <div className={cn("flex-shrink-0", 
        isError ? "text-red-500" :
        isIncomplete ? "text-orange-500" : 
        isDataStale ? "text-orange-500" : 
        "text-primary")}>{icon}</div>
      <div className="flex-1">
        <p className="text-sm font-medium text-muted-foreground">{label}</p>
        <p className={cn("text-sm font-semibold", 
          isError ? "text-red-600" :
          isIncomplete ? "text-orange-600" :
          isDataStale ? "text-orange-600" : 
          "text-foreground")}>
          {displayDate}
          {isError && <span title="Error en la carga de datos"><XCircle className="inline-block ml-1 h-4 w-4" /></span>}
          {!isError && isIncomplete && <span title="Carga de datos incompleta"><AlertTriangle className="inline-block ml-1 h-4 w-4" /></span>}
          {!isError && !isIncomplete && isDataStale && <span title="Datos posiblemente desactualizados"><AlertTriangle className="inline-block ml-1 h-4 w-4" /></span>}
        </p>
        {isError && (
          <p className="text-xs text-red-600 font-medium">
            Error durante la carga.
          </p>
        )}
        {isIncomplete && (
          <p className="text-xs text-orange-600 font-medium">
            Carga incompleta: {progress !== undefined ? `${progress}%` : "estado desconocido"}
          </p>
        )}
      </div>
    </div>
  );
};

interface LoadProgressIndicatorProps {
  label: string;
  progress: number | undefined;
  icon: React.ReactNode;
}

const LoadProgressIndicator: React.FC<LoadProgressIndicatorProps> = ({ label, progress, icon }) => {
  const normalizedProgress = progress === -1 || progress === undefined ? 0 : progress;
  const isError = progress === -1;
  const isComplete = progress === 100;
  const isLoadingActive = !isError && !isComplete && normalizedProgress > 0;
  const isIncomplete = !isError && !isComplete && progress !== undefined; // Añadido para identificar estado incompleto explícitamente

  let barColor = "from-primary to-blue-500";
  let textColor = "text-primary";
  let iconAnim = "";
  let bgBar = "bg-gradient-to-r from-primary/20 to-blue-200";
  let borderBar = "border border-primary/30";
  let percentText = `${normalizedProgress}%`;
  let statusText = "En progreso";

  if (isError) {
    barColor = "from-red-500 to-red-400";
    textColor = "text-red-600";
    iconAnim = "animate-pulse";
    bgBar = "bg-gradient-to-r from-red-100 to-red-200";
    borderBar = "border border-red-300";
    percentText = "Error";
    statusText = "Error";
  } else if (isComplete) {
    barColor = "from-green-500 to-green-400";
    textColor = "text-green-600";
    iconAnim = ""; 
    bgBar = "bg-gradient-to-r from-green-100 to-green-200";
    borderBar = "border border-green-300";
    percentText = "100%";
    statusText = "Completado";
  } else if (isLoadingActive) {
    iconAnim = "animate-pulse"; 
    statusText = "Cargando";
  } else if (isIncomplete) {
    barColor = "from-orange-400 to-orange-300";
    textColor = "text-orange-600";
    bgBar = "bg-gradient-to-r from-orange-100 to-orange-200";
    borderBar = "border border-orange-300";
    statusText = "Incompleto";
  }

  const pulseStyle = { animationDuration: "3s" };

  return (
    <div className="space-y-1.5"> 
      <div className="flex items-center justify-between text-sm mb-1"> 
        <div className="flex items-center">
          <span className={iconAnim} style={(isError || isLoadingActive) ? pulseStyle : undefined}>{icon}</span>
          <span className="font-medium ml-2">{label}</span>
        </div>
        <span className={cn("font-semibold", textColor)}>
          {isError ? (
            <span className="flex items-center"><XCircle size={15} className="mr-1" /> Error</span>
          ) : isComplete ? (
            <span className="flex items-center"><CheckCircle2 size={15} className="mr-1" /> Completado</span>
          ) : isIncomplete ? (
            <span className="flex items-center"><AlertTriangle size={15} className="mr-1" /> {percentText}</span>
          ) : (
            percentText
          )}
        </span>
      </div>
      <div className={cn("relative w-full h-5 rounded-lg overflow-hidden shadow-sm", bgBar, borderBar)}> 
        <div
          className={cn(
            "absolute left-0 top-0 h-full transition-all duration-700 ease-in-out",
            `bg-gradient-to-r ${barColor}`,
            (isError || isLoadingActive) ? "animate-pulse" : ""
          )}
          style={{
            width: `${isError ? 100 : normalizedProgress}%`,
            minWidth: normalizedProgress > 0 ? "2.5rem" : "0", 
            borderRadius: "0.5rem",
            ...((isError || isLoadingActive) && pulseStyle)
          }}
        >
          <span
            className={cn(
              "absolute right-2 top-1/2 -translate-y-1/2 text-xs font-bold drop-shadow-sm",
              isError ? "text-white" : isComplete ? "text-white" : "text-primary-foreground"
            )}
          >
            {percentText}
          </span>
        </div>
        {normalizedProgress === 0 && !isError && ( 
          <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs font-bold text-muted-foreground">0%</span>
        )}
        
        {/* Añadir estado claramente visible */}
        <span className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-xs font-bold drop-shadow-md z-10">
          {statusText}
        </span>
      </div>
    </div>
  );
};

export function SuperAdminSummaryDashboard() {
  const [summaryData, setSummaryData] = useState<SuperAdminSummaryData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Progreso de carga
  const [loadProgress, setLoadProgress] = useState<LoadProgressData | null>(null);
  const [progressError, setProgressError] = useState<string | null>(null);

  // Voy a añadir un nuevo estado para verificar si todas las cargas están completas
  const [allLoadsComplete, setAllLoadsComplete] = useState<boolean>(true);

  useEffect(() => {
    const loadSummary = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const data = await fetchSuperAdminSummary();
        setSummaryData(data);
      } catch (err) {
        const message = err instanceof Error ? err.message : "Error desconocido al cargar el resumen del sistema.";
        setError(message);
        toast.error("Error al cargar resumen", { description: message });
      } finally {
        setIsLoading(false);
      }
    };

    loadSummary();
  }, []);

  // Cargar progreso si la carga inicial no está completa
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    const fetchProgress = async () => {
      setProgressError(null);
      try {
        const progress = await fetchLoadProgress();
        setLoadProgress(progress);
      } catch (err) {
        const message = err instanceof Error ? err.message : "Error al obtener el progreso de carga.";
        setProgressError(message);
      }
    };
    if (summaryData && !summaryData.initial_load_completed) {
      fetchProgress();
      interval = setInterval(fetchProgress, 4000);
    } else {
      setLoadProgress(null);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [summaryData]);

  // Añadir verificación para determinar si alguna carga está incompleta
  useEffect(() => {
    if (loadProgress) {
      const allComplete = 
        (loadProgress.cve_load_progress === 100 || loadProgress.cve_load_progress === undefined) &&
        (loadProgress.cpe_load_progress === 100 || loadProgress.cpe_load_progress === undefined) &&
        (loadProgress.match_load_progress === 100 || loadProgress.match_load_progress === undefined);
      
      setAllLoadsComplete(allComplete);
    }
  }, [loadProgress]);

  if (error) {
    return (
      <div className="container mx-auto py-8 px-4">
        <Alert variant="destructive" className="max-w-2xl mx-auto">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Error al Cargar el Resumen del Sistema</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </div>
    );
  }

  // Modificar la condición para mostrar los indicadores de progreso
  // Mostrar si initial_load_completed es false O si alguna carga no está al 100%
  const shouldShowProgressIndicators = !summaryData?.initial_load_completed || !allLoadsComplete;

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="mb-8"> 
        <h1 className="text-3xl font-bold tracking-tight flex items-center">
          <Database className="mr-3 h-8 w-8 text-primary" />
          Resumen del Sistema
        </h1>
        <p className="text-muted-foreground">
          Visión general de las entidades clave y el estado de los datos en la plataforma.
        </p>
      </div>

      {isLoading && !summaryData && (
         <div className="flex items-center justify-center h-64">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
         </div>
      )}

      {summaryData && (
        <>
          <section className="mb-6"> 
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"> 
              <CountCard title="CVEs" count={summaryData.cve_count} icon={<ShieldAlert />} isLoading={isLoading} colorClass="bg-red-500" />
              <CountCard title="CPEs" count={summaryData.cpe_count} icon={<PackageSearch />} isLoading={isLoading} colorClass="bg-blue-500" />
              <CountCard title="Criterios de Coincidencia" count={summaryData.match_count} icon={<ListFilter />} isLoading={isLoading} colorClass="bg-green-500" />
              <CountCard title="Productos Registrados" count={summaryData.product_count} icon={<Package />} isLoading={isLoading} colorClass="bg-purple-500" />
              <CountCard title="Usuarios Totales" count={summaryData.user_count} icon={<Users />} isLoading={isLoading} colorClass="bg-teal-500" />
              <CountCard title="Organizaciones" count={summaryData.organization_count} icon={<Building />} isLoading={isLoading} colorClass="bg-indigo-500" />
              <CountCard title="Alertas Creadas" count={summaryData.alert_count} icon={<BellRing />} isLoading={isLoading} colorClass="bg-orange-500" />
            </div>
          </section>

          <section className="mb-6 grid grid-cols-1 md:grid-cols-2 gap-4"> 
            <InfoCard
                title="Carga Inicial Completada"
                value={
                    summaryData.initial_load_completed ? (
                        <span className="flex items-center text-green-600">
                            <CheckCircle2 className="mr-2 h-5 w-5" /> Sí
                        </span>
                    ) : (
                        <span className="flex items-center text-red-600">
                            <XCircle className="mr-2 h-5 w-5" /> No
                        </span>
                    )
                }
                icon={summaryData.initial_load_completed ? <CheckCircle2 /> : <XCircle />}
                isLoading={isLoading}
                colorClass={summaryData.initial_load_completed ? "text-green-600" : "text-red-600"}
                subValue={summaryData.initial_load_completed ? "Todas las fuentes de datos base han sido procesadas." : "La carga inicial de datos (CVE, CPE, Match) no ha finalizado."}
            />
            <Card className="shadow-md hover:shadow-lg transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Estado de Actualización de Datos / Fechas de la ultima actualización</CardTitle>
                <Clock className="h-5 w-5 text-primary" />
              </CardHeader>
              <CardContent className="divide-y divide-muted/50">
                <UpdateStatusItem
                  label="CVEs"
                  dateString={summaryData.last_cve_update}
                  icon={<ShieldAlert size={18} />}
                  isLoading={isLoading}
                  progress={loadProgress?.cve_load_progress} // Pasar el progreso
                />
                <UpdateStatusItem
                  label="CPEs"
                  dateString={summaryData.last_cpe_update}
                  icon={<PackageSearch size={18} />}
                  isLoading={isLoading}
                  progress={loadProgress?.cpe_load_progress} // Pasar el progreso
                />
                <UpdateStatusItem
                  label="Criterios de Coincidencia"
                  dateString={summaryData.last_match_update}
                  icon={<ListFilter size={18} />}
                  isLoading={isLoading}
                  progress={loadProgress?.match_load_progress} // Pasar el progreso
                />
              </CardContent>
            </Card>
          </section>

          {shouldShowProgressIndicators && (
            <section className="mb-6"> 
              {progressError && (
                <Alert variant="destructive" className="mb-4">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle>Error al obtener progreso</AlertTitle>
                  <AlertDescription>{progressError}. Se reintentará automáticamente.</AlertDescription>
                </Alert>
              )}
              
              <Card className="shadow-md mb-4">
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg flex items-center">
                    <DatabaseZap className="mr-2 h-5 w-5 text-primary" />
                    Estado de Carga de Datos
                  </CardTitle>
                  <CardDescription>
                    {!summaryData.initial_load_completed 
                      ? "La carga inicial de datos está en progreso. Este proceso puede tomar tiempo."
                      : "Algunas cargas de datos no están completas. Verifique el estado de cada componente."}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <LoadProgressIndicator
                      label="CVEs"
                      progress={loadProgress?.cve_load_progress}
                      icon={<ShieldAlert size={16} className="text-red-500" />}
                    />
                    <LoadProgressIndicator
                      label="CPEs"
                      progress={loadProgress?.cpe_load_progress}
                      icon={<PackageSearch size={16} className="text-blue-500" />}
                    />
                    <LoadProgressIndicator
                      label="Criterios de Coincidencia (Matches)"
                      progress={loadProgress?.match_load_progress}
                      icon={<ListFilter size={16} className="text-green-500" />}
                    />
                  </div>
                </CardContent>
              </Card>
            </section>
          )}
        </>
      )}
    </div>
  );
}
