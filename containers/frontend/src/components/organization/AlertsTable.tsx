import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { AlertActions } from "./AlertActions";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ArrowRight, Loader2, ArrowUpDown, ShieldAlert, ShieldCheck } from "lucide-react"; // Añadir ShieldCheck
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import React from "react";
import { cn } from "@/lib/utils";

export interface AlertApi {
  org_id: number;
  cve_id: string;
  cpe_id: string;
  is_active: boolean;
  created_at: string | null;
  updated_at: string | null;
  cvss_score: number | null;
  cvss_version: string | null;
  severity: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW" | "UNKNOWN"; 
  cve_data: Record<string, unknown>; 
  cpe_data: Record<string, unknown>; 
}

interface AlertsTableProps {
  alerts: AlertApi[];
  isLoading: boolean;
  error: Error | null;
  page: number;
  totalPages: number;
  totalItems: number;
  onPageChange: (newPage: number) => void;
  onToggleStatus: (alert: AlertApi, isActive: boolean) => Promise<void>;
  onDelete: (alert: AlertApi) => Promise<void>;
  togglingAlertId: string | null;
  deletingAlertId: string | null;
  severityFilter: string;
  onSeverityChange: (severity: string) => void;
  statusFilter: string;
  onStatusChange: (status: string) => void;
  searchTerm: string;
  onSearchChange: (term: string) => void;
  onSearchSubmit: () => void;
  // Nuevos props para el ordenamiento temporal
  sortOrder: string;
  onSortOrderChange: (order: string) => void;
  // Prop para desactivación masiva
  onDeactivateAllFiltered?: () => void;
  isDeactivatingAll?: boolean;
  // Prop para activación masiva
  onActivateAllFiltered?: () => void;
  isActivatingAll?: boolean;
}

const severityColors: Record<AlertApi["severity"], string> = {
  CRITICAL: "bg-red-600 hover:bg-red-700",
  HIGH: "bg-orange-500 hover:bg-orange-600",
  MEDIUM: "bg-yellow-500 hover:bg-yellow-600 text-black",
  LOW: "bg-green-500 hover:bg-green-600",
  UNKNOWN: "bg-gray-400 hover:bg-gray-500",
};

export function AlertsTable({
  alerts,
  isLoading,
  error,
  page,
  totalPages,
  totalItems,
  onPageChange,
  onToggleStatus,
  onDelete,
  togglingAlertId,
  deletingAlertId,
  severityFilter,
  onSeverityChange,
  statusFilter,
  onStatusChange,
  searchTerm,
  onSearchChange,
  onSearchSubmit,
  sortOrder,
  onSortOrderChange,
  onDeactivateAllFiltered,
  isDeactivatingAll,
  onActivateAllFiltered,
  isActivatingAll,
}: AlertsTableProps) {

  const handleSearchKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") {
      onSearchSubmit();
    }
  };

  if (error) {
    return (
      <Card className="shadow-md">
        <CardHeader>
          <CardTitle className="text-destructive">Error al cargar alertas</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            {error.message || "Ocurrió un problema. Inténtalo de nuevo más tarde."}
          </p>
        </CardContent>
      </Card>
    );
  }
  
  return (
    <Card className="shadow-md">
      <CardHeader>
        <CardTitle>Alertas de Seguridad</CardTitle>
        <div className="mt-4 flex flex-col sm:flex-row gap-2">
          <Input
            placeholder="Buscar por CVE o CPE..."
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            onKeyDown={handleSearchKeyDown}
            className="max-w-sm"
          />
          <Select value={severityFilter} onValueChange={onSeverityChange}>
            <SelectTrigger className="w-full sm:w-[180px]">
              <SelectValue placeholder="Severidad" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Todas las Severidades</SelectItem>
              <SelectItem value="CRITICAL">Crítica</SelectItem>
              <SelectItem value="HIGH">Alta</SelectItem>
              <SelectItem value="MEDIUM">Media</SelectItem>
              <SelectItem value="LOW">Baja</SelectItem>
              <SelectItem value="UNKNOWN">Desconocida</SelectItem>
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={onStatusChange}>
            <SelectTrigger className="w-full sm:w-[180px]">
              <SelectValue placeholder="Estado" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Todos los Estados</SelectItem>
              <SelectItem value="ACTIVE">Activa</SelectItem>
              <SelectItem value="INACTIVE">Inactiva</SelectItem>
            </SelectContent>
          </Select>
          {/* Selector de orden temporal */}
          <Select value={sortOrder} onValueChange={onSortOrderChange}>
            <SelectTrigger className="w-full sm:w-[200px]">
              <SelectValue placeholder="Ordenar por fecha" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="DESC">
                <div className="flex items-center">
                  <ArrowUpDown className="mr-2 h-4 w-4" />
                  <span>Más reciente primero</span>
                </div>
              </SelectItem>
              <SelectItem value="ASC">
                <div className="flex items-center">
                  <ArrowUpDown className="mr-2 h-4 w-4" />
                  <span>Más antiguo primero</span>
                </div>
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
        {totalItems > 0 && (onDeactivateAllFiltered || onActivateAllFiltered) && (
          <div className="mt-3 flex flex-col sm:flex-row gap-2">
            {onDeactivateAllFiltered && (
              <Button
                variant="outline"
                size="sm"
                onClick={onDeactivateAllFiltered}
                disabled={isDeactivatingAll || isLoading || isActivatingAll}
                className="w-full sm:w-auto border-amber-500 text-amber-600 hover:bg-amber-500/10 hover:text-amber-700"
              >
                {isDeactivatingAll ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <ShieldAlert className="mr-2 h-4 w-4" />
                )}
                Desactivar Filtradas ({totalItems})
              </Button>
            )}
            {onActivateAllFiltered && (
               <Button
                variant="outline"
                size="sm"
                onClick={onActivateAllFiltered}
                disabled={isActivatingAll || isLoading || isDeactivatingAll}
                className="w-full sm:w-auto border-green-500 text-green-600 hover:bg-green-500/10 hover:text-green-700"
              >
                {isActivatingAll ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <ShieldCheck className="mr-2 h-4 w-4" />
                )}
                Activar Filtradas ({totalItems})
              </Button>
            )}
          </div>
        )}
      </CardHeader>
      <CardContent>
        {isLoading && alerts.length === 0 ? (
          <div className="flex justify-center items-center h-64">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : !isLoading && alerts.length === 0 ? (
          <div className="text-center py-10 text-muted-foreground">
            No se encontraron alertas con los filtros actuales.
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>CVE ID</TableHead>
                <TableHead className="hidden md:table-cell">CPE</TableHead>
                <TableHead>Severidad</TableHead>
                <TableHead className="hidden sm:table-cell">CVSS</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="hidden lg:table-cell">Actualizado</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {alerts.map((alert) => (
                <TableRow key={`${alert.cve_id}-${alert.cpe_id}`}>
                  <TableCell className="font-medium">{alert.cve_id}</TableCell>
                  <TableCell className="hidden md:table-cell text-xs truncate max-w-xs">{alert.cpe_id}</TableCell>
                  <TableCell>
                    <Badge className={`${severityColors[alert.severity] || severityColors.UNKNOWN} text-white`}>
                      {alert.severity}
                    </Badge>
                  </TableCell>
                  <TableCell className="hidden sm:table-cell text-sm">
                    {alert.cvss_score !== null ? `${alert.cvss_score} (${alert.cvss_version || "N/A"})` : "N/A"}
                  </TableCell>
                  <TableCell>
                    <Badge
                      className={cn(
                        alert.is_active
                          ? "badge-active-shimmer" // Clase para activa con animación
                          : "bg-gray-100 text-gray-600 border-gray-300" // Estilo para inactiva
                      )}
                    >
                      {alert.is_active ? "Activa" : "Inactiva"}
                    </Badge>
                  </TableCell>
                  <TableCell className="hidden lg:table-cell text-sm">
                    {alert.updated_at ? new Date(alert.updated_at).toLocaleDateString() : "N/A"}
                  </TableCell>
                  <TableCell className="text-right">
                    <AlertActions
                      alert={alert}
                      onToggleStatus={onToggleStatus}
                      onDelete={onDelete}
                      isToggling={togglingAlertId === `${alert.cve_id}-${alert.cpe_id}`}
                      isDeleting={deletingAlertId === `${alert.cve_id}-${alert.cpe_id}`}
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
      {totalPages > 1 && (
        <CardFooter className="flex flex-col sm:flex-row items-center justify-between pt-4">
          <div className="text-xs text-muted-foreground mb-2 sm:mb-0">
            Mostrando {alerts.length} de {totalItems} alertas.
          </div>
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange(page - 1)}
              disabled={page <= 1 || isLoading}
            >
              <ArrowLeft className="h-4 w-4 mr-1" />
              Anterior
            </Button>
            <span className="text-sm">
              Página {page} de {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange(page + 1)}
              disabled={page >= totalPages || isLoading}
            >
              Siguiente
              <ArrowRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        </CardFooter>
      )}
    </Card>
  );
}
