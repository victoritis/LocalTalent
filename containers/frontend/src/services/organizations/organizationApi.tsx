const apiUrl = import.meta.env.VITE_REACT_APP_API_URL;

export interface OrganizationUser {
  id: number;
  email: string;
  currentRole: string;
  profile_image?: string;
}

export interface OrganizationContext {
  id: number;
  name: string;
}

export interface OrganizationsResponse {
  organizations: Organization[];
  page: number;
  total_pages: number;
  total_items: number;
}

export interface Organization {
  id: number;
  name: string;
  logo_path: string | null;
  logo_data?: string;
  users?: OrganizationUser[] | null; 
}

export interface OrganizationProduct {
  cpe: string;
  added_at: string; 
  updated_at?: string; 
  send_email?: boolean;
}

export interface OrganizationProductsResponse {
  products: OrganizationProduct[];
  page: number;
  total_pages: number;
  total_items: number;
  per_page: number;
  error?: string;
}

export interface OrganizationUserUpdateResponse {
  message: string;
  user: OrganizationUser | null;
}

/*   PARA LA VISTA MY-ORGANIZATIONS   */
export async function fetchMyOrganizations(page: number = 1): Promise<{
  organizations: Organization[];
  page: number;
  total_pages: number;
  total_items: number;
}> {
  const response = await fetch(`${apiUrl}/api/v1/my-organizations?page=${page}`, {
    credentials: "include",
  });
  
  if (!response.ok) {
    throw new Error(`Error al obtener organizaciones: ${response.statusText}`);
  }
  
  return await response.json();
}


/**
 * Realiza una consulta a la API para obtener todas las organizaciones paginadas.
 * Se le pasa el número de página como parámetro.
 */
/* PARA LA VISTA SUPERADMIN/MANAGE-ORGANIZATIONS */
export async function fetchSuperAdminOrganizations(page: number = 1): Promise<OrganizationsResponse> {
  const response = await fetch(`${apiUrl}/api/v1/get-superadmin-organizations?page=${page}`, {
    credentials: "include",
  });
  if (!response.ok) {
    throw new Error(`Error al obtener organizaciones: ${response.statusText}`);
  }
  const data = await response.json();

  return data;
}

/**
 * Realiza una consulta a la API para obtener las organizaciones en las que el usuario es admin.
 * La función ahora soporta la paginación.
 */
/* PARA LA VISTA ORG-ADMIN/MANAGE-ORGANIZATIONS */
export async function fetchOrgAdminOrganizations(page: number = 1): Promise<OrganizationsResponse> {
  const response = await fetch(`${apiUrl}/api/v1/get-org-admin-organizations?page=${page}`, {
    credentials: "include",
  });
  if (!response.ok) {
    throw new Error(`Error al obtener organizaciones de admin: ${response.statusText}`);
  }
  const data = await response.json();

  return data;
}


/* PARA LA LISTA DE ORGANIZACIONES DE UN USUARIO */
// fetchGetUserOrganizationsNames eliminado (organizaciones removidas)


/**
 * Realiza una consulta a la API para obtener el overview de una organización por su nombre.
 * Si ocurre algún error, se devuelve un objeto JSON con la propiedad "error".
 * De lo contrario, se devuelven los datos en JSON.
 *
 * @param name - El nombre de la organización.
 * @returns Un objeto JSON con la información del overview o un error.
 */
/* PARA LA VISTA OVERVIEW */
export async function fetchOrganizationOverview(name: string): Promise<unknown> {
  try {
    const response = await fetch(`${apiUrl}/api/v1/organizations/${encodeURIComponent(name)}/overview`, {
      credentials: "include",
    });
    const data = await response.json();
    if (!response.ok) {
      return { error: data.error || "Error al obtener el overview de la organización" };
    }
    
    return data;
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Error desconocido" };
  }
}

/**
 * Interfaz para los datos del HoverCard de una organización
 */
export interface OrganizationHoverData {
  organization: {
    id: number;
    name: string;
  };
  security_score: number;
  metrics: Array<{
    title: string;
    value: string;
  }>;
}

/**
 * Obtiene información básica de una organización para mostrar en un HoverCard.
 * Esta función es más ligera que fetchOrganizationOverview, ya que solo obtiene
 * los datos esenciales para mostrar en el hover.
 *
 * @param name - El nombre de la organización.
 * @returns Una promesa que resuelve a los datos del HoverCard o un error.
 */
export async function fetchOrganizationHoverInfo(name: string): Promise<OrganizationHoverData | { error: string }> {
  try {
    const response = await fetch(`${apiUrl}/api/v1/organizations/${encodeURIComponent(name)}/hover-info`, {
      credentials: "include",
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      return { error: data.error || "Error al obtener información de la organización" };
    }
    
    return data as OrganizationHoverData;
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Error desconocido" };
  }
}

/**
 * Realiza una consulta a la API para añadir un producto (CPE) a una organización por su nombre.
 *
 * @param organizationName - El nombre de la organización.
 * @param cpeName - El nombre CPE del producto a añadir.
 * @returns Un objeto JSON con el resultado de la operación o un error.
 */
/* PARA LA VISTA ADD-PRODUCTS */
export async function addProductToOrganization(organizationName: string, cpeName: string): Promise<{
  status: string; alerts_created?: number; existing_alerts_activated?: number; error?: string; message?: string 
}> {
  try {
    const response = await fetch(`${apiUrl}/api/v1/organizations/${encodeURIComponent(organizationName)}/add-products`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include", // Usar cookies para autenticación
      body: JSON.stringify({ cpe_name: cpeName }),
    });

    const data = await response.json();

    if (!response.ok) {
      return { status: "error", error: data.error || data.message || `Error ${response.status}` };
    }

    return { ...data, message: data.message || "Operación completada" };
  } catch (error) {
    return { status: "error", error: error instanceof Error ? error.message : "Error desconocido al añadir producto" };
  }
}

/**
 * Elimina un producto (CPE) de una organización.
 *
 * @param organizationName - El nombre de la organización.
 * @param cpeName - El nombre CPE del producto a eliminar.
 * @returns Una promesa que resuelve a un objeto con mensaje o error.
 */
export async function deleteOrganizationProduct(
  organizationName: string,
  cpeName: string
): Promise<{ message?: string; error?: string }> {
  try {
    const encodedOrgName = encodeURIComponent(organizationName);
    const encodedCpeName = encodeURIComponent(cpeName);
    
    // Configurar un AbortController con un timeout más largo (30 segundos)
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 segundos
    
    const response = await fetch(
      `${apiUrl}/api/v1/organizations/${encodedOrgName}/products/${encodedCpeName}`,
      {
        method: "DELETE",
        credentials: "include",
        headers: { 
          "Content-Type": "application/json" 
        },
        mode: "cors",
        signal: controller.signal
      }
    );
    
    // Limpiar el timeout
    clearTimeout(timeoutId);
    
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || data.message || `Error ${response.status}: ${response.statusText}`);
    }
    return data;
  } catch (error) {
    // Si el error es por timeout, dar un mensaje más claro
    if (error instanceof Error && error.name === "AbortError") {
      console.error("Request timeout when deleting product");
      return { error: "La solicitud tardó demasiado tiempo. Intente nuevamente." };
    }
    console.error("Error deleting product in API service:", error);
    return { error: error instanceof Error ? error.message : "Unknown error" };
  }
}

/**
 * Actualiza la configuración de un producto específico en una organización.
 *
 * @param organizationName - El nombre de la organización.
 * @param cpeName - El nombre CPE del producto a actualizar.
 * @param settings - Objeto con la configuración a actualizar (ej. { send_email: false }).
 * @returns Una promesa que resuelve a un objeto con mensaje o error.
 */
export async function updateProductSettings(
  organizationName: string,
  cpeName: string,
  settings: { send_email: boolean }
  // Actualizar el tipo de retorno para reflejar que product puede tener updated_at
): Promise<{ message?: string; error?: string; product?: Partial<Pick<OrganizationProduct, "cpe" | "send_email" | "updated_at">> }> {
  try {
    const encodedOrgName = encodeURIComponent(organizationName);
    const encodedCpeName = encodeURIComponent(cpeName);

    const response = await fetch(
      `${apiUrl}/api/v1/organizations/${encodedOrgName}/products/${encodedCpeName}/settings`,
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify(settings),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || data.message || `Error ${response.status}: ${response.statusText}`);
    }
    // El backend actualmente no devuelve updated_at en esta ruta, pero el tipo lo permite por si cambia
    return data;
  } catch (error) {
    console.error("Error updating product settings in API service:", error);
    return { error: error instanceof Error ? error.message : "Unknown error updating settings" };
  }
}


/**
 * Obtiene la lista paginada de productos para una organización.
 *
 * @param organizationName - El nombre de la organización.
 * @param page - El número de página a solicitar.
 * @param limit - El número de productos por página.
 * @param recent - Si es true, filtra por los últimos 30 días.
 * @param searchTerm - Término de búsqueda opcional para filtrar productos por CPE.
 * @returns Una promesa que resuelve a la respuesta de la API.
 */
export async function fetchOrganizationProducts(
  organizationName: string,
  page: number = 1,
  limit: number = 10,
  recent: boolean = false, // Nuevo parámetro
  searchTerm?: string // Nuevo parámetro opcional para búsqueda
): Promise<OrganizationProductsResponse> {
  try {
    // Construir URL con parámetros
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
    });
    if (recent) {
      params.append("recent", "true"); 
    }
    if (searchTerm && searchTerm.trim() !== "") { 
      params.append("search", searchTerm.trim());
    }

    const response = await fetch(
      `${apiUrl}/api/v1/organizations/${encodeURIComponent(organizationName)}/products?${params.toString()}`, // Usar URLSearchParams
      {
        credentials: "include",
      }
    );

    const data = await response.json();

    if (!response.ok) {
      return {
        error: data.error || data.message || `Error ${response.status}`,
        products: [],
        page: 1,
        total_pages: 0,
        total_items: 0,
        per_page: limit,
      };
    }

    // Asegurarse de que el tipo de retorno coincida con la interfaz actualizada
    return data as OrganizationProductsResponse;

  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Error desconocido al obtener productos",
      products: [],
      page: 1,
      total_pages: 0,
      total_items: 0,
      per_page: limit,
    };
  }
}

/**
 * Busca CPEs que coincidan con un término de búsqueda.
 *
 * @param searchTerm - El término a buscar.
 * @param limit - El número máximo de resultados a devolver por página.
 * @param offset - El número de resultados a omitir (para paginación).
 * @returns Una promesa que resuelve a un objeto con la lista de IDs de CPE y un booleano indicando si hay más resultados.
 */
export async function searchCpes(searchTerm: string, limit: number = 10, offset: number = 0): Promise<{ results?: string[]; has_more?: boolean; error?: string }> {
  if (searchTerm.length < 3) {
    return { results: [], has_more: false }; // Evitar llamadas API para términos cortos
  }
  try {
    const response = await fetch(`${apiUrl}/api/v1/cpes/search?q=${encodeURIComponent(searchTerm)}&limit=${limit}&offset=${offset}`, {
      credentials: "include",
    });

    const data = await response.json();

    if (!response.ok) {
      return { error: data.error || data.message || `Error ${response.status}` };
    }

    return data;
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Error desconocido al buscar CPEs" };
  }
}

export async function updateUserRoleInOrganization(
  organizationId: number,
  userId: number,
  newRole: string
): Promise<OrganizationUserUpdateResponse & { error?: string }> {
  try {
    const response = await fetch(`${apiUrl}/api/v1/organizations/${organizationId}/users/${userId}/role`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
      body: JSON.stringify({ role: newRole }),
    });

    const data = await response.json();

    if (!response.ok) {
      return { ...data, error: data.error || data.message || `Error ${response.status}` };
    }
    return data as OrganizationUserUpdateResponse;
  } catch (error) {
    return { 
      message: "Error al actualizar rol",

      user: null, 
      error: error instanceof Error ? error.message : "Error desconocido al actualizar rol" 
    };
  }
}

export async function deleteUserFromOrganization(
  organizationId: number,
  userId: number
): Promise<{ message?: string; error?: string; code?: string }> {
  try {
    const response = await fetch(`${apiUrl}/api/v1/organizations/${organizationId}/users/${userId}`, {
      method: "DELETE",
      credentials: "include",
    });

    const data = await response.json();

    if (!response.ok) {
      return { ...data, error: data.error || data.message || `Error ${response.status}` };
    }
    return data;
  } catch (error) {
    return { 
      error: error instanceof Error ? error.message : "Error desconocido al eliminar usuario de la organización" 
    };
  }
}

export async function inviteUserToOrganization(
  orgId: number,
  email: string,
  role: string = "ROLE_USER" 
): Promise<{ message?: string; error?: string; code?: string }> {
  const resp = await fetch(`${apiUrl}/api/v1/organizations/${orgId}/invite-user`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ email, role }), 
  });
  const data = await resp.json();
  if (!resp.ok) {
    return { error: data.error || data.message || `Error ${resp.status}` };
  }
  return data;
}

export async function acceptOrganizationInvitation(
  token: string
): Promise<{ message?: string; organization_name?: string; error?: string; code?: string }> {
  const resp = await fetch(
    `${apiUrl}/api/v1/accept-organization-invitation`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ token }),
    }
  );
  const data = await resp.json();
  if (!resp.ok) {
    return { error: data.error || data.message || `Error ${resp.status}`, code: data.code };
  }
  return data;
}

/**
 * Crea una nueva organización.
 *
 * @param name - El nombre de la organización.
 * @param logoFile - El archivo de imagen del logo.
 * @returns Una promesa que resuelve a un objeto con el mensaje de éxito o error.
 */
/* PARA LA VISTA CREATE-ORGANIZATION */
export async function createOrganization(
  name: string,
  logoFile: File
): Promise<{ message?: string; organization?: Organization; error?: string }> {
  const form = new FormData();
  form.append("name", name);
  form.append("logo", logoFile);
  const resp = await fetch(
    `${apiUrl}/api/v1/admin/create-organization`,
    {
      method: "POST",
      credentials: "include",
      body: form,
    }
  );
  const data = await resp.json();
  if (!resp.ok) {
    return { error: data.error || data.message || `Error ${resp.status}` };
  }
  return { message: data.message, organization: data.organization };
}
