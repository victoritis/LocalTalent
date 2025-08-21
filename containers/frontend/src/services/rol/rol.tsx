const apiUrl = import.meta.env.VITE_REACT_APP_API_URL;

// roleChecks.tsx
export async function checkAllRoles(): Promise<{
  ROLE_SUPERADMIN: boolean;
  ROLE_ORG_ADMIN: boolean;
  ROLE_USER: boolean;
}> {
  try {
      const response = await fetch(`${apiUrl}/api/v1/get-roles`, {
          method: "GET",
          credentials: "include",
          headers: {
              "Content-Type": "application/json",
              "Cache-Control": "no-cache"
          }
      });

      if (!response.ok) {
          console.error("Error en la respuesta del API para roles:", response.status);
          return {
              ROLE_SUPERADMIN: false,
              ROLE_ORG_ADMIN: false,
              ROLE_USER: false
          };
      }

      const data = await response.json();
      
      // Por si cambio en algun momento la respuesta de la API darme cuenta
      if (typeof data.ROLE_SUPERADMIN === "boolean" && 
          typeof data.ROLE_ORG_ADMIN === "boolean" && 
          typeof data.ROLE_USER === "boolean") {
          return data;
      }
      
      throw new Error("Formato de respuesta inválido");
      
  } catch (error) {
      console.error("Error al verificar roles:", error);
      return {
          ROLE_SUPERADMIN: false,
          ROLE_ORG_ADMIN: false,
          ROLE_USER: false
      };
  }
}
