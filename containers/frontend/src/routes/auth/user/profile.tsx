import React from "react";
import { createFileRoute } from "@tanstack/react-router";
import { UserProfile } from "@/components/user/UserProfile";

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
  organizations: {
    id: number;
    name: string;
    logo_data?: string;
    roles_in_org: string;
  }[];
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

  const [organizations, setOrganizations] = React.useState<LocalOrganization[]>([]);
  const [alerts, setAlerts] = React.useState<LocalAlert[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    setIsLoading(true); 
    setError(null);
    fetch(`${apiUrl}/api/v1/user/profile-info`, {
      credentials: "include",
    })
      .then((res) => {
        if (!res.ok) {
          return res.json().then(errData => {
            throw new Error(errData.error || `Error HTTP! status: ${res.status}`);
          }).catch(() => {
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

        const orgsMapped = data.organizations.map((org) => ({
          id: org.id,
          name: org.name,
          description: "Descripción proximamente",
          image: org.logo_data
            ? `data:image/png;base64,${org.logo_data}`
            : "https://via.placeholder.com/100", 
          role: org.roles_in_org || "User",
        }));
        setOrganizations(orgsMapped);

        setAlerts(data.alerts ?? []);

      })
      .catch((err) => {
        console.error("Error fetching profile info:", err);
        setError(err.message || "No se pudo cargar la información del perfil.");
      })
      .finally(() => {
         setIsLoading(false); 
      });
  }, []); 

  const handleUpdateUser = (updatedUser: Partial<LocalUser>) => {
    setUser((prev) => ({ ...prev, ...updatedUser }));
  };

  const handleUpdatePassword = async (newPassword: string) => {
    console.log("Password update attempt:", newPassword ? "******" : "Empty");
  };

  if (isLoading) {
    return <div className="p-8 text-center">Cargando perfil...</div>;
  }

  if (error) {
    return <div className="p-8 text-red-600 text-center">Error: {error}</div>;
  }

  return (
    <div className="p-4 md:p-8">
      <UserProfile
        user={user}
        organizations={organizations}
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
