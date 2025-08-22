import * as React from "react";
import { checkIfLoggedIn, loginUser, logoutUser } from "@/services/login/authService.lazy.tsx";
import { checkAllRoles } from "@/services/rol/rol";
import { useEffect } from "react";
import LoadingPage from "@/components/loading/LoadingPage";
import { useRouter } from "@tanstack/react-router";

export interface AuthContextInterface {
  isAuthenticated: () => Promise<boolean | "" | null>;
  user: string | null;
  login: (username: string, password: string, otpCode: string) => Promise<boolean>;
  logout: () => Promise<void>;
  city: string | null;
  setCity: (c: string | null) => void;
  detectCity: () => void;
  roles: {
    ROLE_SUPERADMIN: boolean;
    ROLE_ORG_ADMIN: boolean;
    ROLE_USER: boolean;
  };
  getRoles: () => Promise<{ ROLE_SUPERADMIN: boolean; ROLE_ORG_ADMIN: boolean; ROLE_USER: boolean; }>;
  setRoles: () => Promise<void>;
  rolesLoaded: boolean;
}

const AuthContext = React.createContext<AuthContextInterface | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [user, setUser] = React.useState<string | null>(null);
  const [roles, setInternalRoles] = React.useState({
    ROLE_SUPERADMIN: false,
    ROLE_ORG_ADMIN: false,
    ROLE_USER: false,
  });
  const [rolesLoaded, setRolesLoaded] = React.useState(false);
  const [city, setCityState] = React.useState<string | null>(null);

  // Persistencia local de ciudad
  React.useEffect(() => {
    const stored = localStorage.getItem('locTalent.currentCity');
    if (stored) setCityState(stored);
  }, []);

  const setCity = React.useCallback((c: string | null) => {
    setCityState(c);
    if (c) localStorage.setItem('locTalent.currentCity', c); else localStorage.removeItem('locTalent.currentCity');
  }, []);

  const detectCity = React.useCallback(() => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(pos => {
      const { latitude: lat, longitude: lon } = pos.coords;
      // Heurística simple igual que antes
      let detected = 'Madrid';
      if (lat < 40 && lon < -0.3) detected = 'Sevilla';
      if (lat > 41.2 && lon < 2.3) detected = 'Barcelona';
      setCity(detected);
    });
  }, [setCity]);

  // Eliminado manejo de organizaciones

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
  const loginUrl = `/login`;
    window.location.href = loginUrl;
    if (result.success) {
      setUser(null);
  // org cleanup eliminado
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
      login,
      logout,
      city,
      setCity,
      detectCity,
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
