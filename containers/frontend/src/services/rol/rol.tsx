const apiUrl = import.meta.env.VITE_REACT_APP_API_URL;

// Two-role check: SUPERADMIN and USER
export async function checkAllRoles(): Promise<{ ROLE_SUPERADMIN: boolean; ROLE_USER: boolean }> {
  try {
    const response = await fetch(`${apiUrl}/api/v1/get-roles`, {
      method: 'GET',
      credentials: 'include',
    });

    if (!response.ok) {
      console.error('Error en la respuesta del API para roles:', response.status);
      return { ROLE_SUPERADMIN: false, ROLE_USER: false };
    }

    const data = await response.json();
    if (typeof data.ROLE_SUPERADMIN === 'boolean' && typeof data.ROLE_USER === 'boolean') {
      return data;
    }
    return { ROLE_SUPERADMIN: false, ROLE_USER: false };
  } catch (error) {
    console.error('Error al verificar roles:', error);
    return { ROLE_SUPERADMIN: false, ROLE_USER: false };
  }
}
