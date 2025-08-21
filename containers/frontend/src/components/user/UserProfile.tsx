import { Card, CardHeader, CardContent, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { EditProfileDialog } from "@/components/user/EditProfileDialog";
import { EditPasswordDialog } from "@/components/user/EditPasswordDialog";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { AlertTriangle } from "lucide-react";
import { OrganizationHoverCard } from "@/components/organization/OrganizationHoverCard";

interface UserData {
  firstName: string;
  lastName: string;
  profileImage: string;
  email: string;
  role: string;
}

interface Organization {
  id: number;
  name: string;
  description: string;
  image: string;
  role: string;
}

// Actualización de tipos para las alertas
interface LocalAlert {
  cve: string;
  cpe: string;
  is_active: boolean;
  created_at: string | null;
  org_name: string;
  cvss_score?: number;
  cvss_version?: string;
}

interface UserProfileProps {
  user: UserData;
  organizations: Organization[];
  alerts: LocalAlert[]; 
  onUpdateUser: (updatedUser: Partial<UserData>) => void;
  onUpdatePassword: (newPassword: string) => void;
}

const formatDateSafe = (dateString: string | null): string => {
  if (!dateString) return "Fecha no disponible";
  try {
    // new Date() interpreta correctamente la cadena ISO 8601 UTC
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return "Fecha inválida";
    // Formatear usando la zona horaria local del navegador
    // 'Pp' es un formato conveniente para fecha y hora corta (ej: 16 abr 2025, 10:44)
    return format(date, "Pp", { locale: es });
  } catch (e) {
    console.error("Error formateando fecha:", e);
    return "Fecha inválida";
  }
};

export function UserProfile({
  user,
  organizations,
  alerts, 
  onUpdateUser,
  onUpdatePassword,
}: UserProfileProps) {

  // const router = useRouter();

  const getBadgeClasses = (cvss_score?: number): string => {
    if (cvss_score == null) return "bg-gray-200 text-gray-800 hover:bg-gray-200";
    if (cvss_score < 4) return "bg-green-200 text-green-900 hover:bg-green-200"; // Low
    if (cvss_score < 7) return "bg-yellow-200 text-yellow-900 hover:bg-yellow-200"; // Medium
    if (cvss_score < 9) return "bg-orange-300 text-orange-900 hover:bg-orange-300"; // High
    return "bg-red-400 text-red-900 hover:bg-red-400"; // Critical
  };

  return (
    <div className="space-y-8 md:space-y-12"> 
      <div className="flex flex-col md:flex-row items-center justify-between gap-4 md:gap-0">
        <div className="flex items-center space-x-4 md:space-x-6">
          <Avatar className="w-16 h-16 md:w-20 md:h-20">
            <AvatarImage src={user.profileImage} alt={`${user.firstName} ${user.lastName}`} />
            <AvatarFallback>{(user.firstName?.[0] ?? "") + (user.lastName?.[0] ?? "")}</AvatarFallback>
          </Avatar>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold">
              {user.firstName} {user.lastName}
            </h1>
            <p className="text-base md:text-lg text-gray-600 dark:text-gray-400">{user.email}</p>
            <p className="text-sm md:text-md text-gray-700 dark:text-gray-300">ROL: {user.role}</p>
          </div>
        </div>
        <div className="flex space-x-2 md:space-x-4">
          <EditProfileDialog user={user} onSave={onUpdateUser} />
          <EditPasswordDialog onChangePassword={onUpdatePassword} />
        </div>
      </div>

      {/* Paneles */}
      <div className="flex flex-col lg:flex-row gap-4 md:gap-6">

        <div className="w-full lg:w-[40%]">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg md:text-xl">ÚLTIMAS ALERTAS</CardTitle>
            </CardHeader>
            <CardContent>
              {alerts.length > 0 ? (
                <div className="overflow-x-auto max-h-96"> 
                  <Table>
                    <TableHeader>
                      <TableRow>
                        {/* Ancho ajustado */}
                        <TableHead className="w-[30%]">Alerta (CVE)</TableHead>
                        {/* Ancho ajustado */}
                        <TableHead className="w-[25%]">Organización</TableHead>
                        <TableHead className="w-[15%]">Fecha</TableHead>
                        {/* Nuevo encabezado para CVSS */}
                        <TableHead className="w-[15%]">CVSS</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {alerts.map((alert, index) => (
                        <TableRow key={`${alert.cve}-${alert.org_name}-${index}`}>
                          <TableCell className="font-medium text-xs md:text-sm">
                            <div className="flex items-center gap-2">
                              <div
                                className={`h-2 w-2 rounded-full flex-shrink-0 ${
                                  alert.is_active ? "bg-green-500 animate-pulse" : "bg-gray-400"
                                }`}
                              ></div>
                              <span className="font-bold">{alert.cve}</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-xs md:text-sm">
                            {alert.org_name}
                          </TableCell>
                          <TableCell className="text-xs md:text-sm text-muted-foreground">
                            {formatDateSafe(alert.created_at)}
                          </TableCell>
                          <TableCell className="text-xs md:text-sm text-muted-foreground">
                            {alert.cvss_score || alert.cvss_version ? (
                              <div className="flex items-center">
                                <Badge className={`px-1.5 py-0.5 whitespace-nowrap ${getBadgeClasses(alert.cvss_score)}`}>
                                  <span className="text-sm font-semibold text-black">{alert.cvss_score ?? "-"}</span>
                                  <span className="text-[10px] opacity-80 ml-1">V:{alert.cvss_version ?? "-"}</span>
                                </Badge>
                                {alert.cvss_score && alert.cvss_score >= 9 && (
                                  <AlertTriangle className="h-5 w-5 text-red-500 animate-pulse ml-1" />
                                )}
                              </div>
                            ) : (
                              <small>-</small>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <p className="text-sm text-gray-500 dark:text-gray-400">No hay alertas recientes disponibles.</p>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="w-full lg:w-[60%]"> 
         <Card>
          <CardHeader>
            <CardTitle className="text-lg md:text-xl">Organizaciones</CardTitle>
          </CardHeader>
          <CardContent>
           <div className="overflow-x-auto">
            <Table> 
              <TableHeader>
                <TableRow>
                  <TableHead>Organización</TableHead>
                  <TableHead>Rol</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {organizations.map((org) => (
                  <TableRow key={org.id}>
                    <TableCell>
                      {/* Espaciado ajustado */}
                      <div className="flex items-center space-x-2">
                        <Avatar className="w-8 h-8 md:w-10 md:h-10"> 
                          <AvatarImage src={org.image} alt={`${org.name} Logo`} />
                          <AvatarFallback>{org.name?.[0] ?? "?"}</AvatarFallback>
                        </Avatar>
                        <OrganizationHoverCard
                          name={org.name}
                          image={org.image}
                          triggerClassName="text-sm font-medium text-blue-600 hover:underline cursor-pointer dark:text-blue-400 -ml-1"
                        />
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="text-xs md:text-sm text-gray-900 dark:text-gray-100">{org.role}</span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
             </Table>
            </div>
           </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
