import { useState, useEffect } from "react";
import { useNavigate } from "@tanstack/react-router";
import { executeFullSynchronization, fetchSynchronizationStatus } from "@/services/admin/superadminApi";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Loader2, DatabaseZap, Info, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

export function DataSynchronizationManager() {
    const [isLoading, setIsLoading] = useState(false);
    const [isSyncInProgress, setIsSyncInProgress] = useState<boolean | null>(null); // null para estado inicial desconocido
    const [isLoadingStatus, setIsLoadingStatus] = useState(true);
    const navigate = useNavigate();

    useEffect(() => {
        let intervalId: NodeJS.Timeout | null = null;

        const checkStatus = async () => {
            // No establecer isLoadingStatus a true en cada sondeo para evitar parpadeo
            // Solo al inicio o cuando se inicia una nueva sincronización.
            if (isSyncInProgress === null) { // Solo en la carga inicial del componente
                 setIsLoadingStatus(true);
            }
            try {
                const statusResponse = await fetchSynchronizationStatus();
                setIsSyncInProgress(statusResponse.is_synchronizing);

                // Si la sincronización ha terminado, limpiar el intervalo
                if (!statusResponse.is_synchronizing && intervalId) {
                    clearInterval(intervalId);
                    intervalId = null;
                }
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            } catch (error) {
                toast.error("Error al verificar estado", {
                    description: "No se pudo verificar si hay una sincronización en curso.",
                });
                setIsSyncInProgress(false); // Asumir que no hay sincronización si hay error
                if (intervalId) {
                    clearInterval(intervalId); // Detener sondeo en caso de error persistente
                    intervalId = null;
                }
            } finally {
                 if (isSyncInProgress === null) { // Solo en la carga inicial
                    setIsLoadingStatus(false);
                 }
            }
        };

        checkStatus(); // Comprobar inmediatamente al montar

        // Iniciar sondeo si la sincronización podría estar en curso o para detectar su finalización
        intervalId = setInterval(checkStatus, 5000); // Comprobar cada 5 segundos

        return () => {
            if (intervalId) {
                clearInterval(intervalId);
            }
        };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []); // Ejecutar solo al montar y desmontar


    const handleSynchronizeData = async () => {
        if (isSyncInProgress) {
            toast.warning("Sincronización en curso", {
                description: "Ya hay un proceso de sincronización de datos activo.",
            });
            return;
        }

        setIsLoading(true);
        toast.info("Iniciando la sincronización de datos...", {
            description:
                "Esto puede tomar un momento. Serás redirigido al resumen del sistema una vez iniciado.",
        });

        try {
            const result = await executeFullSynchronization();

            if (result.status === "Sincronización iniciada" || result.status.includes("iniciada")) { 
                toast.success("Sincronización Iniciada", {
                    description: `${result.task_chain_id ? `ID de cadena de tareas: ${result.task_chain_id}. ` : ""}Redirigiendo al resumen del sistema...`,
                });
                setIsSyncInProgress(true); // Actualizar estado inmediatamente
                // El sondeo se encargará de actualizar si finaliza
                navigate({ to: "/auth/superadmin/data-status" });
            } else {
                toast.error("Error al Iniciar Sincronización", {
                    description: result.status || "Respuesta inesperada del servidor.",
                });
            }
        } catch (error) {
            const message = error instanceof Error ? error.message : "Error desconocido.";
            toast.error("Error de Conexión", {
                description: `No se pudo comunicar con el servidor para iniciar la sincronización. ${message}`,
            });
        } finally {
            setIsLoading(false);
        }
    };

    const buttonDisabled = isLoading || isLoadingStatus || isSyncInProgress === true;

    return (
        <Card className="w-full shadow-md">
            <CardHeader>
                <CardTitle className="text-lg">Gestión de Datos del Sistema</CardTitle>
                <CardDescription>
                    Inicia y gestiona la carga y sincronización de datos de
                    vulnerabilidades en el sistema.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                {isLoadingStatus && (
                    <Alert variant="default" className="bg-blue-50 border-blue-200 text-blue-700 dark:bg-blue-900/30 dark:border-blue-700 dark:text-blue-300">
                        <Loader2 className="h-4 w-4 animate-spin !text-blue-700 dark:!text-blue-300" />
                        <AlertTitle>Verificando Estado</AlertTitle>
                        <AlertDescription>
                            Comprobando si hay una sincronización de datos en curso...
                        </AlertDescription>
                    </Alert>
                )}

                {!isLoadingStatus && isSyncInProgress === true && (
                    <Alert variant="default" className="bg-amber-50 border-amber-300 text-amber-800 dark:bg-amber-900/30 dark:border-amber-700 dark:text-amber-300">
                        <Info className="h-4 w-4 !text-amber-800 dark:!text-amber-300" />
                        <AlertTitle>Sincronización en Curso</AlertTitle>
                        <AlertDescription>
                            Actualmente hay un proceso de sincronización de datos en ejecución.
                            No se puede iniciar una nueva sincronización hasta que la actual finalice.
                            Puedes ver el progreso en el{" "}
                            <Button variant="link" className="p-0 h-auto text-amber-800 dark:text-amber-300 inline" onClick={() => navigate({ to: "/auth/superadmin/data-status" })}>
                                Resumen del Sistema
                            </Button>.
                        </AlertDescription>
                    </Alert>
                )}
                
                {!isLoadingStatus && isSyncInProgress === false && (
                   <Alert variant="default" className="bg-green-50 border-green-300 text-green-800 dark:bg-green-900/30 dark:border-green-700 dark:text-green-300">
                    <ShieldCheck className="h-4 w-4 !text-green-800 dark:!text-green-300" />
                    <AlertTitle>Listo para Sincronizar</AlertTitle>
                    <AlertDescription>
                      No hay procesos de sincronización activos. Puedes iniciar una nueva carga de datos.
                    </AlertDescription>
                  </Alert>
                )}


                <div className="border-t pt-6">
                    <p className="mb-2 text-sm text-muted-foreground">
                        Haz clic en el botón de abajo para iniciar una carga completa y
                        sincronización de todos los datos (CVEs, CPEs, Criterios de
                        Coincidencia) desde las fuentes oficiales.
                    </p>
                    <p className="text-xs text-muted-foreground mb-4">
                        Este proceso se ejecuta en segundo plano y puede tardar un tiempo
                        considerable. Una vez iniciado, serás redirigido a la página de
                        resumen del sistema donde podrás monitorear
                        el progreso.
                    </p>
                    <Button
                        onClick={handleSynchronizeData}
                        disabled={buttonDisabled}
                        size="lg"
                        className="w-full md:w-auto"
                    >
                        {isLoading || isLoadingStatus ? (
                            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                        ) : (
                            <DatabaseZap className="mr-2 h-5 w-5" />
                        )}
                        {isLoadingStatus ? "Verificando..." : (isSyncInProgress ? "Sincronización en Curso" : "Sincronizar Todos los Datos")}
                    </Button>
                </div>

                <div className="text-xs text-muted-foreground pt-4 border-t">
                    <p>
                        <strong>Nota:</strong> Los datos son descargados de fuentes oficiales, puede consultar mas en la documentación.
                    </p>
                    <p>
                        La redirección ocurrirá una vez que se confirme el inicio de
                        las tareas de sincronización.
                    </p>
                </div>
            </CardContent>
        </Card>
    );
}
