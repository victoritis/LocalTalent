import { useState, useEffect, useCallback } from "react";
import { createLazyFileRoute, useParams } from "@tanstack/react-router";
import { AlertsTable, AlertApi } from "@/components/organization/AlertsTable";
import { useAuth } from "@/auth";
import { toast } from "sonner";
import { useDebounce } from "@/hooks/useDebounce";
import {
  fetchOrganizationAlerts,
  toggleAlertStatus,
  deleteAlert,
  deactivateAllFilteredAlerts,
  activateAllFilteredAlerts,
  fetchCriticalActiveAlertsCount,
} from "@/services/organizations/alertsApi";
import { Loader2, AlertTriangle, ShieldAlert, ShieldCheck, ShieldX } from "lucide-react"; 
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export const Route = createLazyFileRoute(
  "/auth/organizations/$organizationName/alerts",
)({
  component: OrganizationAlertsPage,
});

const ALERTS_PER_PAGE = 10;

function OrganizationAlertsPage() {
  const { organizationName } = useParams({
    from: "/auth/organizations/$organizationName/alerts",
  });
  const { user } = useAuth();
  const [alerts, setAlerts] = useState<AlertApi[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // Estados para paginación y filtros
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [severityFilter, setSeverityFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [searchTerm, setSearchTerm] = useState("");
  const debouncedSearchTerm = useDebounce(searchTerm, 500);
  const [sortOrder, setSortOrder] = useState("DESC"); // DESC para más reciente primero

  // Estados para IDs de alertas en proceso de cambio
  const [togglingAlertId, setTogglingAlertId] = useState<string | null>(null);
  const [deletingAlertId, setDeletingAlertId] = useState<string | null>(null);

  // Estados para desactivación masiva
  const [showDeactivateAllDialog, setShowDeactivateAllDialog] = useState(false);
  const [isDeactivatingAll, setIsDeactivatingAll] = useState(false);

  // Estados para activación masiva
  const [showActivateAllDialog, setShowActivateAllDialog] = useState(false);
  const [isActivatingAll, setIsActivatingAll] = useState(false);

  // Estado para el contador de alertas críticas activas
  const [criticalAlertsCount, setCriticalAlertsCount] = useState<number | null>(null);
  const [isLoadingCriticalCount, setIsLoadingCriticalCount] = useState(false);

  const loadAlerts = useCallback(async () => {
    if (!organizationName || !user) return;

    setIsLoading(true);
    setError(null);
    try {
      const data = await fetchOrganizationAlerts(
        organizationName,
        currentPage,
        ALERTS_PER_PAGE,
        severityFilter,
        statusFilter,
        debouncedSearchTerm,
        sortOrder,
      );
      setAlerts(data.alerts);
      setTotalPages(data.total_pages);
      setTotalItems(data.total_items);
    } catch (err) {
      const fetchError = err instanceof Error ? err : new Error("Error desconocido al cargar alertas");
      setError(fetchError);
      toast.error("Error al cargar alertas", { description: fetchError.message });
      setAlerts([]); 
      setTotalPages(1);
      setTotalItems(0);
    } finally {
      setIsLoading(false);
    }
  }, [organizationName, user, currentPage, severityFilter, statusFilter, debouncedSearchTerm, sortOrder]);

  const loadCriticalAlertsCount = useCallback(async () => {
    if (!organizationName) return;
    setIsLoadingCriticalCount(true);
    try {
      const data = await fetchCriticalActiveAlertsCount(organizationName);
      setCriticalAlertsCount(data.critical_active_alerts_count);
    } catch (err) {
      const fetchError = err instanceof Error ? err : new Error("Error desconocido al cargar contador de alertas críticas");
      console.warn("Error al cargar contador de alertas críticas:", fetchError.message);
      setCriticalAlertsCount(null); 
    } finally {
      setIsLoadingCriticalCount(false);
    }
  }, [organizationName]);

  useEffect(() => {
    loadAlerts();
    loadCriticalAlertsCount(); 
  }, [loadAlerts, loadCriticalAlertsCount]);
  
  // Resetear página a 1 cuando cambian los filtros o el término de búsqueda
  useEffect(() => {
    setCurrentPage(1);
  }, [severityFilter, statusFilter, debouncedSearchTerm, sortOrder]);


  const handleToggleStatus = async (alert: AlertApi, isActive: boolean) => {
    if (!organizationName) return;
    const alertId = `${alert.cve_id}-${alert.cpe_id}`;
    setTogglingAlertId(alertId);
    const originalStatus = alert.is_active;
    // Optimistic update
    setAlerts(prevAlerts => 
      prevAlerts.map(a => a.cve_id === alert.cve_id && a.cpe_id === alert.cpe_id ? { ...a, is_active: isActive } : a)
    );

    try {
      await toggleAlertStatus(organizationName, alert.cve_id, alert.cpe_id, isActive);
      toast.success(`Alerta ${alert.cve_id} ${isActive ? "activada" : "desactivada"}.`);
      // No es necesario recargar, el estado ya se actualizó y la API no cambia `updatedAt`
    } catch (err) {
      // Revert optimistic update
      setAlerts(prevAlerts => 
        prevAlerts.map(a => a.cve_id === alert.cve_id && a.cpe_id === alert.cpe_id ? { ...a, is_active: originalStatus } : a)
      );
      const toggleError = err instanceof Error ? err : new Error("Error desconocido");
      toast.error("Error al cambiar estado", { description: toggleError.message });
    } finally {
      setTogglingAlertId(null);
    }
  };

  const handleDeleteAlert = async (alert: AlertApi) => {
    if (!organizationName) return;
    const alertId = `${alert.cve_id}-${alert.cpe_id}`;
    setDeletingAlertId(alertId);

    const toastId = toast.loading(`Eliminando alerta ${alert.cve_id}...`);
    try {
      await deleteAlert(organizationName, alert.cve_id, alert.cpe_id);
      toast.success("Alerta eliminada", { id: toastId });
      // Recargar alertas para reflejar la eliminación y posible cambio de paginación
      loadAlerts(); 
    } catch (err) {
      const deleteError = err instanceof Error ? err : new Error("Error desconocido");
      toast.error("Error al eliminar alerta", { id: toastId, description: deleteError.message });
    } finally {
      setDeletingAlertId(null);
    }
  };
  
  const handleDeactivateAllFiltered = () => {
    if (totalItems > 0) {
      setShowDeactivateAllDialog(true);
    } else {
      toast.info("No hay alertas que coincidan con los filtros actuales para desactivar.");
    }
  };

  const confirmDeactivateAllFiltered = async () => {
    if (!organizationName) return;

    setShowDeactivateAllDialog(false);
    setIsDeactivatingAll(true);
    const toastId = toast.loading("Desactivando alertas filtradas...");

    try {
      const result = await deactivateAllFilteredAlerts(
        organizationName,
        severityFilter,
        debouncedSearchTerm
      );
      toast.success(result.message || `${result.alerts_deactivated} alertas desactivadas.`, { id: toastId });
      loadAlerts(); // Recargar alertas
    } catch (err) {
      const deactivateError = err instanceof Error ? err : new Error("Error desconocido");
      toast.error("Error al desactivar alertas", { id: toastId, description: deactivateError.message });
    } finally {
      setIsDeactivatingAll(false);
    }
  };

  const handleActivateAllFiltered = () => {
    if (totalItems > 0) {
      setShowActivateAllDialog(true);
    } else {
      toast.info("No hay alertas que coincidan con los filtros actuales para activar.");
    }
  };

  const confirmActivateAllFiltered = async () => {
    if (!organizationName) return;

    setShowActivateAllDialog(false);
    setIsActivatingAll(true);
    const toastId = toast.loading("Activando alertas filtradas...");

    try {
      const result = await activateAllFilteredAlerts(
        organizationName,
        severityFilter,
        debouncedSearchTerm
      );
      toast.success(result.message || `${result.alerts_activated} alertas activadas.`, { id: toastId });
      loadAlerts(); // Recargar alertas
    } catch (err) {
      const activateError = err instanceof Error ? err : new Error("Error desconocido");
      toast.error("Error al activar alertas", { id: toastId, description: activateError.message });
    } finally {
      setIsActivatingAll(false);
    }
  };

  const handleSearchSubmit = () => {
    // setCurrentPage(1) ya se maneja en el useEffect que depende de debouncedSearchTerm
    loadAlerts(); // Forzar recarga si es necesario (aunque debouncedSearchTerm ya lo hace)
  };

  if (!organizationName) {
    return (
      <div className="container mx-auto p-4 text-center">
        <p className="text-lg text-muted-foreground">Nombre de organización no encontrado.</p>
      </div>
    );
  }
  
  // Renderizado principal
  return (
    <div className="container mx-auto py-8 px-4">
      <div className="flex flex-col sm:flex-row justify-between sm:items-center mb-6 gap-4">
        <h1 className="text-3xl font-bold">
          Alertas de Seguridad para {organizationName}
        </h1>
        {isLoadingCriticalCount ? (
          <div className="flex items-center text-sm text-muted-foreground p-2 rounded-lg bg-muted/50 h-[48px]">
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
            <span>Cargando críticas...</span>
          </div>
        ) : criticalAlertsCount !== null && criticalAlertsCount > 0 ? (
          <div className="flex items-center p-2 bg-destructive/10 border border-destructive/30 rounded-lg text-destructive animate-pulse">
            <ShieldX className="h-6 w-6 mr-2 flex-shrink-0" />
            <div>
              <span className="font-bold text-lg">{criticalAlertsCount}</span>
              <span className="ml-1 text-sm">Alerta(s) Crítica(s) Activa(s)</span>
            </div>
          </div>
        ) : criticalAlertsCount === 0 ? (
          <div className="flex items-center p-2 bg-green-600/10 border border-green-600/30 rounded-lg text-green-700 h-[48px]">
            <ShieldCheck className="h-6 w-6 mr-2 flex-shrink-0" />
            <span className="text-sm font-medium">No hay alertas críticas activas</span>
          </div>
        ) : criticalAlertsCount === null && !isLoadingCriticalCount ? (
           <div className="flex items-center p-2 bg-muted/20 border border-muted/30 rounded-lg text-muted-foreground h-[48px]">
            <AlertTriangle className="h-5 w-5 mr-2 flex-shrink-0 text-amber-500" />
            <span className="text-sm">Info. críticas no disponible</span>
          </div>
        ) : <div className="h-[48px] w-1/3 sm:w-auto"></div> 
        }
      </div>
      
      {/* Mostrar error global si existe y no estamos cargando */}
      {error && !isLoading && (
         <div className="mb-4 p-4 border border-destructive/50 bg-destructive/10 text-destructive rounded-md flex items-center">
           <AlertTriangle className="h-5 w-5 mr-2" />
           <div>
             <p className="font-semibold">Error al cargar las alertas:</p>
             <p className="text-sm">{error.message}</p>
           </div>
         </div>
      )}

      <AlertsTable
        alerts={alerts}
        isLoading={isLoading && alerts.length === 0} // Solo mostrar loader principal si no hay alertas previas
        error={null} // El error global se maneja arriba
        page={currentPage}
        totalPages={totalPages}
        totalItems={totalItems}
        onPageChange={setCurrentPage}
        onToggleStatus={handleToggleStatus}
        onDelete={handleDeleteAlert}
        togglingAlertId={togglingAlertId}
        deletingAlertId={deletingAlertId}
        severityFilter={severityFilter}
        onSeverityChange={setSeverityFilter}
        statusFilter={statusFilter}
        onStatusChange={setStatusFilter}
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        onSearchSubmit={handleSearchSubmit}
        sortOrder={sortOrder}
        onSortOrderChange={setSortOrder}
        onDeactivateAllFiltered={handleDeactivateAllFiltered}
        isDeactivatingAll={isDeactivatingAll}
        onActivateAllFiltered={handleActivateAllFiltered} 
        isActivatingAll={isActivatingAll} 
      />
      
      {/* Indicador de carga sutil si ya hay alertas mostradas */}
      {isLoading && alerts.length > 0 && (
        <div className="fixed bottom-4 right-4 bg-background border p-2 rounded-md shadow-lg text-sm flex items-center">
          <Loader2 className="h-4 w-4 animate-spin mr-2" />
          Actualizando alertas...
        </div>
      )}

      {showDeactivateAllDialog && (
        <AlertDialog open onOpenChange={setShowDeactivateAllDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center">
                <ShieldAlert className="h-6 w-6 mr-2 text-amber-500" />
                ¿Desactivar alertas filtradas?
              </AlertDialogTitle>
              <AlertDialogDescription className="space-y-3">
                <p>
                  Esta acción desactivará todas las alertas <strong className="text-amber-600">activas</strong> que coincidan
                  con los filtros de búsqueda <code className="bg-muted px-1 py-0.5 rounded font-mono text-sm">{debouncedSearchTerm || "ninguno"}</code> y
                  severidad <code className="bg-muted px-1 py-0.5 rounded font-mono text-sm">{severityFilter === "ALL" ? "Todas" : severityFilter}</code> para la organización{" "}
                  <strong>{organizationName}</strong>.
                </p>
                <p>
                  Se desactivarán un total de <strong>{totalItems}</strong> alerta(s) (si están activas y coinciden).
                </p>
                <div className="mt-2 p-3 bg-destructive/10 border border-destructive/30 rounded-md text-foreground">
                  <div className="flex items-start">
                    <AlertTriangle className="h-5 w-5 mr-2 mt-0.5 text-destructive" />
                    <div>
                      <p className="font-semibold text-destructive">¡Atención!</p>
                      <p className="text-sm ">
                        <strong className="text-foreground">Esta operación es masiva y no se puede deshacer fácilmente para múltiples alertas a la vez. Asegúrate de que los filtros aplicados son los correctos antes de proceder.</strong>
                      </p>
                    </div>
                  </div>
                </div>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={isDeactivatingAll}>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                onClick={confirmDeactivateAllFiltered}
                disabled={isDeactivatingAll}
                className="bg-amber-600 hover:bg-amber-700"
              >
                {isDeactivatingAll ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Desactivando...
                  </>
                ) : (
                  "Sí, desactivar todas"
                )}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}

      {showActivateAllDialog && (
        <AlertDialog open onOpenChange={setShowActivateAllDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center">
                <ShieldCheck className="h-6 w-6 mr-2 text-green-500" />
                ¿Activar alertas filtradas?
              </AlertDialogTitle>
              <AlertDialogDescription className="space-y-3">
                <p>
                  Esta acción activará todas las alertas <strong className="text-green-600">inactivas</strong> que coincidan
                  con los filtros de búsqueda <code className="bg-muted px-1 py-0.5 rounded font-mono text-sm">{debouncedSearchTerm || "ninguno"}</code> y
                  severidad <code className="bg-muted px-1 py-0.5 rounded font-mono text-sm">{severityFilter === "ALL" ? "Todas" : severityFilter}</code> para la organización{" "}
                  <strong>{organizationName}</strong>.
                </p>
                <p>
                  Se activarán un total de <strong>{totalItems}</strong> alerta(s) (si están inactivas y coinciden).
                </p>
                <div className="mt-2 p-3 bg-sky-600/10 border border-sky-600/30 rounded-md text-foreground">
                  <div className="flex items-start">
                    <AlertTriangle className="h-5 w-5 mr-2 mt-0.5 text-sky-500" />
                    <div>
                      <p className="font-semibold text-sky-600">Confirmación</p>
                      <p className="text-sm ">
                        <strong className="text-foreground">Esta operación modificará múltiples alertas. Verifica los filtros antes de continuar.</strong>
                      </p>
                    </div>
                  </div>
                </div>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={isActivatingAll}>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                onClick={confirmActivateAllFiltered}
                disabled={isActivatingAll}
                className="bg-green-600 hover:bg-green-700"
              >
                {isActivatingAll ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Activando...
                  </>
                ) : (
                  "Sí, activar todas"
                )}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  );
}
