const apiUrl = import.meta.env.VITE_REACT_APP_API_URL;

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

export interface AlertsResponse {
  alerts: AlertApi[];
  page: number;
  total_pages: number;
  total_items: number;
}

export interface CriticalAlertsCountResponse {
  organization_name: string;
  critical_active_alerts_count: number;
}

interface ApiError {
  error: string;
  details?: string;
  code?: string;
}

/**
 * Obtiene las alertas para una organización específica.
 *
 * @param organizationName - El nombre de la organización.
 * @param page - La página actual para paginación.
 * @param perPage - Número de alertas por página.
 * @param severity - Filtro por severidad (ALL, CRITICAL, HIGH, MEDIUM, LOW).
 * @param status - Filtro por estado (ALL, ACTIVE, INACTIVE).
 * @param search - Término de búsqueda para filtrar por CVE o CPE.
 * @param sortOrder - Orden temporal (DESC = más reciente primero, ASC = más antiguo primero)
 */
export async function fetchOrganizationAlerts(
  organizationName: string,
  page: number = 1,
  perPage: number = 10,
  severity: string = "ALL",
  status: string = "ALL",
  search: string = "",
  sortOrder: string = "DESC"
): Promise<AlertsResponse> {
  try {
    // Construir URL con parámetros
    const params = new URLSearchParams({
      page: page.toString(),
      per_page: perPage.toString(),
      severity,
      status,
      search,
      sort_order: sortOrder
    });

    const response = await fetch(
      `${apiUrl}/api/v1/organizations/${encodeURIComponent(organizationName)}/alerts?${params.toString()}`,
      {
        credentials: "include",
      }
    );

    if (!response.ok) {
      const errorData = await response.json() as ApiError;
      throw new Error(errorData.error || `Error ${response.status}: ${response.statusText}`);
    }

    return await response.json() as AlertsResponse;
  } catch (error) {
    console.error("Error fetching alerts:", error);
    throw error;
  }
}

/**
 * Activa o desactiva una alerta específica.
 *
 * @param organizationName - El nombre de la organización.
 * @param cveId - ID del CVE de la alerta.
 * @param cpeId - ID del CPE de la alerta.
 * @param isActive - Nuevo estado de la alerta (true=activa, false=inactiva).
 */
export async function toggleAlertStatus(
  organizationName: string,
  cveId: string,
  cpeId: string,
  isActive: boolean
): Promise<{ message: string; is_active: boolean }> {
  try {
    const response = await fetch(
      `${apiUrl}/api/v1/organizations/${encodeURIComponent(organizationName)}/alerts/${encodeURIComponent(cveId)}/${encodeURIComponent(cpeId)}/toggle`,
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({ is_active: isActive }),
      }
    );

    if (!response.ok) {
      const errorData = await response.json() as ApiError;
      throw new Error(errorData.error || `Error ${response.status}: ${response.statusText}`);
    }

    return await response.json() as { message: string; is_active: boolean };
  } catch (error) {
    console.error("Error toggling alert status:", error);
    throw error;
  }
}

/**
 * Elimina una alerta específica (soft delete).
 *
 * @param organizationName - El nombre de la organización.
 * @param cveId - ID del CVE de la alerta.
 * @param cpeId - ID del CPE de la alerta.
 */
export async function deleteAlert(
  organizationName: string,
  cveId: string,
  cpeId: string
): Promise<{ message: string }> {
  try {
    const response = await fetch(
      `${apiUrl}/api/v1/organizations/${encodeURIComponent(organizationName)}/alerts/${encodeURIComponent(cveId)}/${encodeURIComponent(cpeId)}`,
      {
        method: "DELETE",
        credentials: "include",
      }
    );

    if (!response.ok) {
      const errorData = await response.json() as ApiError;
      throw new Error(errorData.error || `Error ${response.status}: ${response.statusText}`);
    }

    return await response.json() as { message: string };
  } catch (error) {
    console.error("Error deleting alert:", error);
    throw error;
  }
}

/**
 * Desactiva todas las alertas activas que coincidan con los filtros de severidad y búsqueda.
 *
 * @param organizationName - El nombre de la organización.
 * @param severity - Filtro por severidad.
 * @param search - Término de búsqueda.
 */
export async function deactivateAllFilteredAlerts(
  organizationName: string,
  severity: string,
  search: string
): Promise<{ message: string; alerts_deactivated: number }> {
  try {
    const response = await fetch(
      `${apiUrl}/api/v1/organizations/${encodeURIComponent(organizationName)}/alerts/deactivate-all-filtered`,
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({ severity, search }),
      }
    );

    if (!response.ok) {
      const errorData = await response.json() as ApiError;
      throw new Error(errorData.error || `Error ${response.status}: ${response.statusText}`);
    }

    return await response.json() as { message: string; alerts_deactivated: number };
  } catch (error) {
    console.error("Error deactivating all filtered alerts:", error);
    throw error;
  }
}

/**
 * Activa todas las alertas inactivas que coincidan con los filtros de severidad y búsqueda.
 *
 * @param organizationName - El nombre de la organización.
 * @param severity - Filtro por severidad.
 * @param search - Término de búsqueda.
 */
export async function activateAllFilteredAlerts(
  organizationName: string,
  severity: string,
  search: string
): Promise<{ message: string; alerts_activated: number }> {
  try {
    const response = await fetch(
      `${apiUrl}/api/v1/organizations/${encodeURIComponent(organizationName)}/alerts/activate-all-filtered`,
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({ severity, search }),
      }
    );

    if (!response.ok) {
      const errorData = await response.json() as ApiError;
      throw new Error(errorData.error || `Error ${response.status}: ${response.statusText}`);
    }

    return await response.json() as { message: string; alerts_activated: number };
  } catch (error) {
    console.error("Error activating all filtered alerts:", error);
    throw error;
  }
}

/**
 * Obtiene el número de alertas críticas activas para una organización.
 *
 * @param organizationName - El nombre de la organización.
 */
export async function fetchCriticalActiveAlertsCount(
  organizationName: string
): Promise<CriticalAlertsCountResponse> {
  try {
    const response = await fetch(
      `${apiUrl}/api/v1/organizations/${encodeURIComponent(organizationName)}/alerts/critical-active-count`,
      {
        credentials: "include",
      }
    );

    if (!response.ok) {
      const errorData = await response.json() as ApiError;
      throw new Error(errorData.error || `Error ${response.status}: ${response.statusText}`);
    }

    return await response.json() as CriticalAlertsCountResponse;
  } catch (error) {
    console.error("Error fetching critical active alerts count:", error);
    throw error; 
  }
}
