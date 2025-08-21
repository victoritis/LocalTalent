import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Loader2, Trash2 } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { AlertApi } from "./AlertsTable"; 

interface AlertActionsProps {
  alert: AlertApi;
  onToggleStatus: (alert: AlertApi, isActive: boolean) => Promise<void>;
  onDelete: (alert: AlertApi) => Promise<void>;
  isToggling: boolean;
  isDeleting: boolean;
}

export function AlertActions({
  alert,
  onToggleStatus,
  onDelete,
  isToggling,
  isDeleting,
}: AlertActionsProps) {
  return (
    <div className="flex items-center justify-end space-x-2">
      <Switch
        id={`toggle-${alert.cve_id}-${alert.cpe_id}`}
        checked={alert.is_active}
        onCheckedChange={(checked) => onToggleStatus(alert, checked)}
        disabled={isToggling || isDeleting}
        aria-label={alert.is_active ? "Desactivar alerta" : "Activar alerta"}
        className="data-[state=checked]:bg-primary"
      />
      
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-8 w-8 text-destructive/80 hover:text-destructive hover:bg-destructive/10"
            disabled={isDeleting || isToggling}
            aria-label="Eliminar alerta"
          >
            {isDeleting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Trash2 className="h-4 w-4" />
            )}
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción eliminará la alerta para CVE <code className="font-mono bg-muted px-1 py-0.5 rounded">{alert.cve_id}</code> y 
              CPE <code className="font-mono bg-muted px-1 py-0.5 rounded text-xs">{alert.cpe_id}</code>. 
              No podrás deshacer esta acción.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => onDelete(alert)}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Eliminando...
                </>
              ) : (
                "Eliminar"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
