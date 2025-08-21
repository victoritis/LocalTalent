
import React, { useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ChevronDown, Plus, Search } from "lucide-react";
import { DropdownMenuUser } from "@/components/user/DropdownMenuUser";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Organization,
  updateUserRoleInOrganization,
  deleteUserFromOrganization,
  inviteUserToOrganization,
} from "@/services/organizations/organizationApi";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Link } from "@tanstack/react-router";

interface OrganizationManagementProps {
  isSuperAdmin: boolean;
  organizations: Organization[];
  setOrganizations: React.Dispatch<React.SetStateAction<Organization[]>>;
  loading: boolean;
}

const getBadgeClasses = (role: string) => {
  switch (role) {
    case "ROLE_ORG_ADMIN":
      return "bg-blue-500 text-white hover:bg-blue-600";
    case "ROLE_SUPERADMIN":
      return "bg-red-500 text-white hover:bg-red-600";
    case "ROLE_USER":
      return "bg-gray-500 text-white hover:bg-gray-600";
    default:
      return "bg-muted text-foreground hover:bg-muted";
  }
};

const getDotColorClass = (role: string) => {
  switch (role) {
    case "ROLE_ORG_ADMIN":
      return "bg-blue-500";
    case "ROLE_SUPERADMIN":
      return "bg-red-500";
    case "ROLE_USER":
      return "bg-gray-500"; 
    default:
      return "bg-gray-500"; 
  }
};

const formatRole = (role: string) => {
  const roles: { [key: string]: string } = {
    "ROLE_ORG_ADMIN": "ORG_ADMIN",
    "ROLE_USER": "USER",
    "ROLE_SUPERADMIN": "SUPERADMIN",
  };
  return roles[role] || role.replace("ROLE_", "");
};

const OrganizationManagement: React.FC<OrganizationManagementProps> = ({
  isSuperAdmin,
  organizations,
  setOrganizations,
  loading,
}) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [openRows, setOpenRows] = useState<number[]>([]);

  const [userToDelete, setUserToDelete] = useState<{ orgId: number; userId: number; userEmail: string; orgName: string } | null>(null);
  const [isDeletingUser, setIsDeletingUser] = useState(false);

  const [inviteEmail, setInviteEmail] = useState("");
  const [invitingOrgId, setInvitingOrgId] = useState<number | null>(null);
  const [isInviting, setIsInviting] = useState(false);
  const [inviteRole, setInviteRole] = useState("ROLE_USER"); 

  const filteredOrgs = organizations.filter((org) =>
    org.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const toggleRow = (id: number) => {
    setOpenRows((prev) =>
      prev.includes(id) ? prev.filter((rowId) => rowId !== id) : [...prev, id]
    );
  };

  const handleRoleChange = async (organizationId: number, userId: number, newRole: string) => {
    const organization = organizations.find(org => org.id === organizationId);
    const user = organization?.users?.find(u => u.id === userId);

    if (!organization || !user) {
      toast.error("Error: No se pudo encontrar la organización o el usuario.");
      return;
    }

    const oldRole = user.currentRole;

    setOrganizations((prevOrgs) =>
      prevOrgs.map((org) => {
        if (org.id === organizationId) {
          return {
            ...org,
            users: (org.users || []).map((u) =>
              u.id === userId ? { ...u, currentRole: newRole } : u
            ),
          };
        }
        return org;
      })
    );

    try {
      const result = await updateUserRoleInOrganization(organizationId, userId, newRole);
      if (result.error) {
        console.error("Error updating role:", result.error);
        toast.error("Error al actualizar rol", { description: result.error });
        setOrganizations((prevOrgs) =>
          prevOrgs.map((org) => {
            if (org.id === organizationId) {
              return {
                ...org,
                users: (org.users || []).map((u) =>
                  u.id === userId ? { ...u, currentRole: oldRole, profile_image: user.profile_image } : u
                ),
              };
            }
            return org;
          })
        );
        return;
      }

      setOrganizations((prevOrgs) =>
        prevOrgs.map((org) => {
          if (org.id === organizationId) {
            return {
              ...org,
              users: (org.users || []).map((u) =>
                u.id === userId
                  ? {
                      ...u,
                      currentRole: newRole,
                      profile_image: result.user?.profile_image ?? u.profile_image,
                    }
                  : u
              ),
            };
          }
          return org;
        })
      );

      toast.success(`Rol de ${user.email} actualizado a ${formatRole(newRole)} en ${organization.name}.`);

    } catch (error) {
      console.error("Failed to update role:", error);
      const errorMessage = error instanceof Error ? error.message : "Error desconocido";
      toast.error("Error al actualizar rol", { description: errorMessage });
      setOrganizations((prevOrgs) =>
        prevOrgs.map((org) => {
          if (org.id === organizationId) {
            return {
              ...org,
              users: (org.users || []).map((u) =>
                u.id === userId ? { ...u, currentRole: oldRole, profile_image: user.profile_image } : u
              ),
            };
          }
          return org;
        })
      );
    }
  };

  const handleDeleteUserClick = (orgId: number, userId: number, userEmail: string, orgName: string) => {
    // Diferir la actualización del estado para permitir que el DropdownMenu se cierre primero.
    // Esto puede prevenir conflictos de modales o captura de eventos.
    setTimeout(() => {
      setUserToDelete({ orgId, userId, userEmail, orgName });
    }, 0); // Un retraso de 0ms es a menudo suficiente para diferir al siguiente tick del event loop.
    //ESTO ES IMPORTANTE PARA QUE NO SE BLOQUEE LA INTERFZ DE USUARIO (recordar porque pasa mas veces)
  };

  const confirmDeleteUser = async () => {
    if (!userToDelete) return;

    setIsDeletingUser(true);
    const { orgId, userId, userEmail, orgName } = userToDelete;
    const toastId = toast.loading(`Eliminando a ${userEmail} de ${orgName}...`);

    try {
      const result = await deleteUserFromOrganization(orgId, userId);
      if (result.error) {
        throw new Error(result.message || result.error);
      }

      setOrganizations((prevOrgs) =>
        prevOrgs.map((org) => {
          if (org.id === orgId) {
            return {
              ...org,
              users: (org.users || []).filter((user) => user.id !== userId),
            };
          }
          return org;
        })
      );
      toast.success(result.message || `Usuario ${userEmail} eliminado de ${orgName}.`, { id: toastId });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Error desconocido";
      toast.error(`Error al eliminar a ${userEmail}`, { id: toastId, description: errorMessage });
    } finally {
      setIsDeletingUser(false);
      setUserToDelete(null);
    }
  };

  const openInviteModal = (orgId: number) => {
    setInvitingOrgId(orgId);
    setInviteEmail("");
  };

  const confirmInvite = async () => {
    if (!invitingOrgId) return;
    setIsInviting(true);
    const toastId = toast.loading("Enviando invitación...");
    const res = await inviteUserToOrganization(invitingOrgId, inviteEmail, inviteRole);
    if (res.error) {
      toast.error("Error invitación", { id: toastId, description: res.error });
    } else {
      toast.success(res.message || "Invitación enviada", { id: toastId });
    }
    setIsInviting(false);
    setInvitingOrgId(null);
  };

  if (loading) {
    return (
      <div className="p-8 text-center text-muted-foreground">
        Cargando organizaciones...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="sticky top-0 z-50 bg-background shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-6 gap-4">
          <h1 className="text-2xl font-bold tracking-tight">
            {isSuperAdmin
              ? "Administrar Organizaciones"
              : "Administrar mis Organizaciones"}
          </h1>
          <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
            <div className="relative w-full">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar organización..."
                className="pl-8 w-full"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            {isSuperAdmin && (
              <Link to="/auth/superadmin/create-organization">
                <Button className="gap-2">
                  <Plus className="h-4 w-4" />
                  Crear organización
                </Button>
              </Link>
            )}
          </div>
        </div>
        <Separator />
      </div>

      <Table className="border rounded-lg overflow-hidden" data-testid="organizations-list">
        <TableHeader className="bg-muted/50">
          <TableRow>
            <TableHead className="w-[100px]">Logo</TableHead>
            <TableHead>Nombre</TableHead>
            <TableHead className="w-[200px]">Miembros</TableHead>
            <TableHead className="w-[150px]"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filteredOrgs.map((org, index) => (
            <React.Fragment key={org.id}>
              <TableRow
                className="cursor-pointer hover:bg-muted/30"
                onClick={() => toggleRow(org.id)}
              >
                <TableCell>
                <div className="flex items-center gap-3">
                  {org.logo_data ? (
                    <img
                      src={`data:image/png;base64,${org.logo_data}`}
                      className="h-10 w-10 rounded-md object-cover border"
                      alt={`Logo ${org.name}`}
                    />
                  ) : (
                    <div className="h-10 w-10 bg-primary/10 flex items-center justify-center rounded-md border">
                      <span className="text-xs font-bold">{org.name.substring(0, 2).toUpperCase()}</span>
                    </div>
                  )}
                </div>
                </TableCell>
                <TableCell>
                  <span className="font-medium text-lg">{org.name}</span>
                </TableCell>
                <TableCell>
                  <div className="flex -space-x-2">
                    {(org.users ?? []).slice(0, 3).map((user) => (
                      <div
                        key={user.id}
                        className="relative h-8 w-8 rounded-md border-2 border-background bg-muted overflow-hidden"
                      >
                        {user.profile_image ? (
                          <img
                            src={`data:image/png;base64,${user.profile_image}`}
                            alt={`Avatar de ${user.email}`}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <span className="absolute inset-0 flex items-center justify-center text-xs font-medium">
                            {user.email[0].toUpperCase()}
                          </span>
                        )}
                      </div>
                    ))}
                    {(org.users?.length ?? 0) > 3 && (
                      <div className="h-8 w-8 rounded-md border-2 border-background bg-muted flex items-center justify-center text-xs">
                        +{(org.users?.length ?? 0) - 3}
                      </div>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <Button variant="ghost" size="icon" data-testid="organizations-chevrondown" >
                    <ChevronDown
                      className={`h-4 w-4 transition-transform ${
                        openRows.includes(org.id) ? "rotate-180" : ""
                      }`}
                    />
                  </Button>
                </TableCell>
              </TableRow>
              {openRows.includes(org.id) && (
                <TableRow className="bg-muted/30">
                  <TableCell colSpan={4} className="p-4">
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <h3 className="font-semibold">Miembros del equipo</h3>
                        <Button variant="outline" size="sm" className="gap-2" onClick={() => openInviteModal(org.id)}>
                          <Plus className="h-4 w-4" />
                          Invitar miembro
                        </Button>
                      </div>

                      <div className="rounded-lg border">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead className="w-[40%]">Usuario</TableHead>
                              <TableHead className="w-[20%] text-center">Rol</TableHead>
                              <TableHead className="w-[20%] text-center">Acciones</TableHead>
                              <TableHead className="w-[20%] text-center">
                                Elegir Rol
                              </TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {(org.users ?? []).map((user) => (
                              <TableRow key={user.id}>
                                <TableCell className="px-4 py-2">
                                    <div className="flex items-center gap-3">
                                    {user.profile_image ? (
                                      <img
                                      src={`data:image/png;base64,${user.profile_image}`}
                                      className="h-8 w-8 rounded-md object-cover"
                                      alt={`Avatar de ${user.email}`}
                                      />
                                    ) : (
                                      <div className="h-8 w-8 rounded-md bg-muted flex items-center justify-center">
                                        {user.email[0].toUpperCase()}
                                      </div>
                                    )}
                                    <span>{user.email}</span>
                                  </div>
                                </TableCell>
                                <TableCell className="px-4 py-2 text-center">
                                  <div
                                    className={`inline-block px-2 py-1 rounded-md text-xs cursor-pointer ${getBadgeClasses(
                                      user.currentRole
                                    )}`}
                                  >
                                    {formatRole(user.currentRole)}
                                  </div>
                                </TableCell>
                                <TableCell className="px-4 py-2 text-center">
                                  <DropdownMenuUser
                                    userName={user.email}
                                    onDelete={() => handleDeleteUserClick(org.id, user.id, user.email, org.name) }
                                  />
                                </TableCell>
                                <TableCell className="px-4 py-2 text-center">
                                  <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={(e) => e.stopPropagation()}
                                      >
                                        Cambiar Rol
                                      </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                      <DropdownMenuItem
                                        onClick={() =>
                                          handleRoleChange(
                                            org.id, 
                                            user.id,
                                            "ROLE_ORG_ADMIN"
                                          )
                                        }
                                      >
                                        <div className="flex items-center gap-2">
                                          <span
                                            className={`h-2 w-2 rounded-full ${getDotColorClass(
                                              "ROLE_ORG_ADMIN"
                                            )}`}
                                          ></span>
                                          <span className="text-black bg-white uppercase text-xs">
                                            ORG_ADMIN
                                          </span>
                                        </div>
                                      </DropdownMenuItem>
                                      <DropdownMenuItem
                                        onClick={() =>
                                          handleRoleChange(
                                            org.id,
                                            user.id,
                                            "ROLE_USER" 
                                          )
                                        }
                                      >
                                        <div className="flex items-center gap-2">
                                          <span
                                            className={`h-2 w-2 rounded-full ${getDotColorClass(
                                              "ROLE_USER"
                                            )}`}
                                          ></span>
                                          <span className="text-black bg-white uppercase text-xs">
                                            USER
                                          </span>
                                        </div>
                                      </DropdownMenuItem>
                                      
                                    </DropdownMenuContent>
                                  </DropdownMenu>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    </div>
                  </TableCell>
                </TableRow>
              )}
              {index < filteredOrgs.length - 1 && (
                <TableRow>
                  <TableCell colSpan={4} className="p-0">
                    <Separator />
                  </TableCell>
                </TableRow>
              )}
            </React.Fragment>
          ))}
        </TableBody>
      </Table>

      {/* Estado vacío */}
      {filteredOrgs.length === 0 && !loading && (
        <div className="flex flex-col items-center justify-center p-12 text-center space-y-4">
          <div className="h-16 w-16 rounded-md bg-muted flex items-center justify-center">
            <Search className="h-8 w-8 text-muted-foreground" />
          </div>
          <div className="space-y-1">
            <h3 className="text-lg font-medium">
              No se encontraron organizaciones
            </h3>
            <p className="text-sm text-muted-foreground">
              Prueba con otro término de búsqueda o crea una nueva organización.
            </p>
          </div>
          {isSuperAdmin && (
            <Button className="mt-4">
              <Plus className="mr-2 h-4 w-4" />
              Crear organización
            </Button>
          )}
        </div>
      )}

      {userToDelete && (
        <AlertDialog open onOpenChange={(open) => { if (!open) setUserToDelete(null); }}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
              <AlertDialogDescription>
                Esta acción eliminará al usuario{" "}
                <strong className="break-all">{userToDelete.userEmail}</strong> de la organización{" "}
                <strong>{userToDelete.orgName}</strong>. El usuario perderá el acceso
                y los roles asociados dentro de esta organización. Esta acción no se puede deshacer directamente aquí,
                pero el usuario podría ser invitado nuevamente.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setUserToDelete(null)} disabled={isDeletingUser}>
                Cancelar
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={confirmDeleteUser}
                disabled={isDeletingUser}
                className="bg-destructive hover:bg-destructive/90"
              >
                {isDeletingUser ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Eliminando...
                  </>
                ) : (
                  "Eliminar Usuario"
                )}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}

      {invitingOrgId !== null && (
        <AlertDialog open onOpenChange={() => setInvitingOrgId(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Invitar Usuario</AlertDialogTitle>
              <AlertDialogDescription>
                Ingresa el correo del usuario a invitar y selecciona su rol:
              </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="p-4 space-y-4">
              <Input
                type="email"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                className="w-full border p-2"
                placeholder="email@ejemplo.com"
              />
              <div>
                <label className="block text-sm font-medium mb-1">Seleccionar Rol</label>
                <select
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value)}
                  className="w-full border p-2 rounded-md"
                >
                  <option value="ROLE_USER">Usuario</option>
                  <option value="ROLE_ORG_ADMIN">Administrador</option>
                </select>
              </div>
            </div>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={isInviting}>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                onClick={confirmInvite}
                disabled={isInviting || !inviteEmail}
              >
                {isInviting ? "Enviando..." : "Enviar Invitación"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  );
};

export { OrganizationManagement };
