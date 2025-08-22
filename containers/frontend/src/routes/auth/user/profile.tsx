import React from "react";
import { createFileRoute } from "@tanstack/react-router";
import { UserProfile } from "@/components/user/UserProfile";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";

type LocalAlert = {
  cve: string;
  cpe: string;
  is_active: boolean;
  created_at: string | null;
  org_name: string;
};

type UserDataFromApi = {
  user_id: number;
  email: string;
  first_name: string;
  last_name: string;
  special_roles?: string[];
  is_enabled?: boolean;
  organizations?: never; // eliminado en backend
  profile_image?: string;
  alerts: LocalAlert[]; 
};

type LocalUser = {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  profileImage: string;
  role: string;
  specialRoles: string[];
  isEnabled: boolean;
};

type LocalOrganization = {
  id: number;
  name: string;
  description: string;
  image: string;
  role: string;
};

const apiUrl = import.meta.env.VITE_REACT_APP_API_URL;

function ProfilePage() {
  const [user, setUser] = React.useState<LocalUser>({
    id: 0,
    email: "",
    firstName: "",
    lastName: "",
    profileImage: "",
    role: "USER",
    specialRoles: [],
    isEnabled: false,
  });

  // Organizaciones eliminadas
  const [alerts, setAlerts] = React.useState<LocalAlert[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const fetchProfile = React.useCallback(() => {
    setIsLoading(true);
    setError(null);
    fetch(`${apiUrl}/api/v1/user/profile-info`, { credentials: "include" })
      .then((res) => {
        if (!res.ok) {
          return res
            .json()
            .then((errData) => {
              throw new Error(errData.error || `Error HTTP! status: ${res.status}`);
            })
            .catch(() => {
              throw new Error(`Error HTTP! status: ${res.status}`);
            });
        }
        return res.json();
      })
      .then((data: UserDataFromApi) => {
        setUser({
          id: data.user_id,
          email: data.email,
          firstName: data.first_name,
          lastName: data.last_name,
          profileImage: data.profile_image
            ? `data:image/png;base64,${data.profile_image}`
            : "https://via.placeholder.com/150",
          role: data.special_roles?.[0] ?? "USER",
          specialRoles: data.special_roles ?? [],
          isEnabled: data.is_enabled ?? false,
        });
  // organizaciones removidas
        setAlerts(data.alerts ?? []);
      })
      .catch((err) => {
        console.error("Error fetching profile info:", err);
        setError(err.message || "No se pudo cargar la información del perfil.");
      })
      .finally(() => setIsLoading(false));
  }, []);

  React.useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  const handleUpdateUser = (updatedUser: Partial<LocalUser>) => {
    setUser((prev) => ({ ...prev, ...updatedUser }));
  };

  const handleUpdatePassword = async (newPassword: string) => {
    console.log("Password update attempt:", newPassword ? "******" : "Empty");
  };

  if (isLoading) {
    return (
      <div className="p-4 md:p-8 space-y-6 max-w-6xl mx-auto">
        <div className="flex items-center space-x-4">
          <Skeleton className="h-20 w-20 rounded-full" />
          <div className="space-y-2 flex-1">
            <Skeleton className="h-6 w-1/3" />
            <Skeleton className="h-4 w-1/4" />
            <Skeleton className="h-4 w-1/5" />
          </div>
        </div>
        <div className="grid gap-6 md:grid-cols-2">
          <Skeleton className="h-72 w-full" />
          <Skeleton className="h-72 w-full" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 md:p-8 max-w-2xl mx-auto">
        <Card>
          <CardContent className="pt-6 flex flex-col items-center space-y-4">
            <p className="text-sm text-red-600 dark:text-red-400 font-medium">Error: {error}</p>
            <Button variant="outline" onClick={fetchProfile}>Reintentar</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
  <div className="p-4 md:p-8">
      <UserProfile
        user={user}
        organizations={[]}
        alerts={alerts} 
        onUpdateUser={handleUpdateUser}
        onUpdatePassword={handleUpdatePassword}
      />
    </div>
  );
}

export const Route = createFileRoute("/auth/user/profile")({
  component: ProfilePage,
});

export default ProfilePage;
