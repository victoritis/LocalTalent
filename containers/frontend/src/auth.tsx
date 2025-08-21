import * as React from "react";
import { checkIfLoggedIn, loginUser, logoutUser } from "@/services/login/authService.lazy.tsx";
import { checkAllRoles } from "@/services/rol/rol";
import { OrganizationContext } from "./services/organizations/organizationApi";
import { useEffect } from "react";
import LoadingPage from "@/components/loading/LoadingPage";
import { useRouter } from "@tanstack/react-router";

export interface AuthContextInterface {
  isAuthenticated: () => Promise<boolean | "" | null>;
  user: string | null;
  current_organization: OrganizationContext | null;
  login: (username: string, password: string, otpCode: string) => Promise<boolean>;
  logout: () => Promise<void>;
  roles: {
    ROLE_SUPERADMIN: boolean;
    ROLE_ORG_ADMIN: boolean;
    ROLE_USER: boolean;
  };
  getRoles: () => Promise<{
    ROLE_SUPERADMIN: boolean;
    ROLE_ORG_ADMIN: boolean;
    ROLE_USER: boolean;
  }>;
  setRoles: () => Promise<void>;
  set_current_organization: (organization: OrganizationContext | null) => void;
  rolesLoaded: boolean; // Propiedad añadida
}

const AuthContext = React.createContext<AuthContextInterface | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [user, setUser] = React.useState<string | null>(null);
  const [current_organization, setCurrentOrganization] = React.useState<OrganizationContext | null>(null);
  const [roles, setInternalRoles] = React.useState({
    ROLE_SUPERADMIN: false,
    ROLE_ORG_ADMIN: false,
    ROLE_USER: false,
  });
  const [rolesLoaded, setRolesLoaded] = React.useState(false);

  const set_current_organization = React.useCallback((organization: OrganizationContext | null) => {
    setCurrentOrganization(organization);
  }, []);

  const isAuthenticated = async (): Promise<boolean | "" | null> => {
    return await verifyLogin();
  };

  const verifyLogin = async () => {
    const loggedIn = await checkIfLoggedIn();
    if (loggedIn) setUser("IsLoggedIn");
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
    const loginUrl = `${import.meta.env.VITE_REACT_FRONTEND_API_URL}/login`;
    window.location.href = loginUrl;
    if (result.success) {
      setUser(null);
      setCurrentOrganization(null);
      router.navigate({ to: "/login" });
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
    setRoles();
  }, [setRoles]);

  if (!rolesLoaded) {
    return <LoadingPage />;
  }

  return (
    <AuthContext.Provider value={{
      isAuthenticated,
      user,
      current_organization,
      login,
      logout,
      roles,
      getRoles,
      setRoles,
      set_current_organization,
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
