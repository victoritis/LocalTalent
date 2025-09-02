import * as React from "react";
import { checkIfLoggedIn, loginUser, logoutUser } from "@/services/login/authService.lazy.tsx";
import { checkAllRoles } from "@/services/rol/rol";
import { useEffect } from "react";
import LoadingPage from "@/components/loading/LoadingPage";

export interface AuthContextInterface {
  isAuthenticated: () => Promise<boolean | "" | null>;
  user: string | null;
  login: (username: string, password: string, otpCode: string) => Promise<boolean>;
  logout: () => Promise<void>;
  session: { username: string; userId: number; email: string; roles: string[] } | null;
  loadSession: () => Promise<void>;
  roles: {
    ROLE_SUPERADMIN: boolean;
    ROLE_USER: boolean;
  };
  getRoles: () => Promise<{ ROLE_SUPERADMIN: boolean; ROLE_USER: boolean }>;
  setRoles: () => Promise<void>;
  rolesLoaded: boolean;
}

const AuthContext = React.createContext<AuthContextInterface | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = React.useState<string | null>(null);
  const [roles, setInternalRoles] = React.useState({
    ROLE_SUPERADMIN: false,
    ROLE_USER: false,
  });
  const [rolesLoaded, setRolesLoaded] = React.useState(false);
  const [session, setSession] = React.useState<{ username: string; userId: number; email: string; roles: string[] } | null>(null);


  const loadSession = React.useCallback(async () => {
    try {
      const apiUrl = (import.meta as any).env.VITE_REACT_APP_API_URL;
      const res = await fetch(`${apiUrl}/api/v1/auth/session`, { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        if (data?.username) {
          setSession({ username: data.username, userId: data.user_id, email: data.email, roles: data.roles || [] });
          // Fallback derivado de sesión para evitar pantallas en blanco si /get-roles tarda
          const sessionRoles = Array.isArray(data.roles) ? data.roles as string[] : [];
          const isSuper = sessionRoles.includes('ROLE_SUPERADMIN');
          const isUser = sessionRoles.includes('ROLE_USER') || (!isSuper && true); // fallback: autenticado no superadmin -> user
          setInternalRoles(prev => ({
            ROLE_SUPERADMIN: isSuper,
            ROLE_USER: isUser,
          }));
          // Permitir render aunque /get-roles aún no haya cargado
          setRolesLoaded(true);
        }
      }
    } catch (e) {
      console.error('Error cargando sesión', e);
    }
  }, []);

  // Eliminado manejo de organizaciones

  const isAuthenticated = async (): Promise<boolean | "" | null> => {
    return await verifyLogin();
  };

  const verifyLogin = async () => {
    const loggedIn = await checkIfLoggedIn();
    if (loggedIn) setUser("IsLoggedIn");
    if (loggedIn && !session) {
      loadSession();
    }
    return loggedIn;
  };

  const getRoles = async () => {
    return await checkAllRoles();
  };

  const login = async (username: string, password: string, otpCode: string): Promise<boolean> => {
    const result = await loginUser(username, password, otpCode);
    if (result.success) setUser("IsLoggedIn");
    return result.success;
  };

  const logout = async (): Promise<void> => {
    const result = await logoutUser();
  const loginUrl = `/login`;
    window.location.href = loginUrl;
    if (result.success) {
      setUser(null);
  // org cleanup eliminado
  // navegación diferida: el redirect se hará vía window.location ya manejado arriba
    }
  };

  const updateRoles = React.useCallback(async () => {
    try {
      const newRoles = await checkAllRoles();
      setInternalRoles(prev => {
        return JSON.stringify(prev) === JSON.stringify(newRoles) ? prev : newRoles;
      });
    } catch (error) {
      console.error("Error updating roles:", error);
    }
  }, []);

  const setRoles = React.useCallback(async () => {
    await updateRoles();
    setRolesLoaded(true);
  }, [updateRoles]);

  useEffect(() => {
    // Intenta cargar roles del endpoint y también deriva desde sesión como respaldo
    setRoles();
    loadSession();
  }, [setRoles, loadSession]);

  if (!rolesLoaded) {
    return <LoadingPage />;
  }

  return (
    <AuthContext.Provider value={{
      isAuthenticated,
      user,
      login,
      logout,
      session,
      loadSession,
      roles,
      getRoles,
      setRoles,
      rolesLoaded // Propiedad añadida al proveedor de contexto
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = React.useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
