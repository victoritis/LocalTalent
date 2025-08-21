import React from "react";
import { createLazyFileRoute, useRouter } from "@tanstack/react-router"; 
import {
  Organization,
  fetchMyOrganizations,
} from "@/services/organizations/organizationApi";
import { useAuth } from "@/auth";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

function MyOrganizations() {
  const { set_current_organization, current_organization } = useAuth();
  const [organizations, setOrganizations] = React.useState<Organization[]>([]);
  const [currentPage, setCurrentPage] = React.useState(1);
  const [totalPages, setTotalPages] = React.useState(1);
  const [loading, setLoading] = React.useState(false);
  const router = useRouter(); // Obtener el router para tener el contexto cargado

  React.useEffect(() => {
    console.log("Organización actual actualizada:", current_organization);
  }, [current_organization]);

  const loadOrganizations = async (pageToLoad: number) => {
    setLoading(true);
    try {
      const response = await fetchMyOrganizations(pageToLoad);
      setOrganizations(response.organizations || []);
      setCurrentPage(response.page);
      setTotalPages(response.total_pages);
    } catch (error) {
      console.error("Error fetching organizations:", error);
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    loadOrganizations(currentPage);
  }, [currentPage]);

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage);
    }
  };

  const handleSelectOrganization = (org: Organization) => {
    set_current_organization(org);
    // Navegar al overview de la organización seleccionada
    router.navigate({
      to: "/auth/organizations/$organizationName/overview",
      params: { organizationName: org.name },
    });
  };

  return (
    <div className="container mx-auto p-8">
      <h1 className="text-3xl font-bold mb-8">
        {"Mis Organizaciones"}
      </h1>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-[200px] w-full rounded-lg" />
          ))}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
            {organizations.map((org) => (
              <Card
                key={org.id}
                onClick={() => handleSelectOrganization(org)}
                className={cn(
                  "hover:shadow-lg transition-shadow h-[200px] flex flex-col relative cursor-pointer group overflow-hidden",
                  current_organization === org &&
                    "ring-2 ring-primary bg-primary/5"
                )}
              >
                <CardHeader className="flex flex-row items-center gap-4">
                  {/* Manejo actualizado de la imagen del logo */}
                  {org.logo_data ? (
                    <img
                      src={`data:image/png;base64,${org.logo_data}`}
                      className="h-10 w-10 rounded-md object-cover border"
                      alt={`Logo de ${org.name}`}
                    />
                  ) : (
                    <div className="h-10 w-10 bg-primary/10 flex items-center justify-center rounded-md border">
                      <span className="text-xs font-bold">{org.name.substring(0, 2).toUpperCase()}</span>
                    </div>
                  )}
                  <div className="space-y-1">
                    <CardTitle>{org.name}</CardTitle>
                    <div className="text-sm text-muted-foreground">
                      {org.users?.length ?? 0} miembro
                      {org.users?.length !== 1 && "s"}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="flex-1">
                  <div className="space-y-2 h-full">
                    <p className="text-sm font-medium">Usuarios:</p>
                    <ul className="space-y-1 h-[120px]">
                      {(org.users?.slice(0, 1) ?? []).map((user) => (
                        <li
                          key={user.id}
                          className="flex items-center justify-between text-sm"
                        >
                          <span className="truncate">{user.email}</span>
                          <Badge variant="outline" className="ml-2 capitalize">
                            {user.currentRole.replace("ROLE_", "")}
                          </Badge>
                        </li>
                      ))}
                      {(org.users?.length ?? 0) > 1 && (
                        <li className="text-sm text-muted-foreground mt-2">
                          +{(org.users?.length ?? 0) - 1} miembros más...
                        </li>
                      )}
                    </ul>
                  </div>
                </CardContent>
                {current_organization === org && (
                  <div className="absolute top-2 right-2 bg-primary text-primary-foreground rounded-full p-1">
                    <Check className="h-4 w-4" />
                  </div>
                )}
              </Card>
            ))}
          </div>
          {totalPages > 1 && (
            <Pagination>
              <PaginationContent className="relative z-10 bg-background">
                <PaginationItem>
                  <PaginationPrevious
                    onClick={(e) => {
                      e.stopPropagation();
                      handlePageChange(currentPage - 1);
                    }}
                    aria-disabled={currentPage === 1}
                    className={
                      currentPage === 1 ? "opacity-50 cursor-not-allowed" : ""
                    }
                  />
                </PaginationItem>

                {Array.from({ length: totalPages }, (_, i) => (
                  <PaginationItem key={i}>
                    <PaginationLink
                      isActive={currentPage === i + 1}
                      onClick={(e) => {
                        e.stopPropagation();
                        handlePageChange(i + 1);
                      }}
                    >
                      {i + 1}
                    </PaginationLink>
                  </PaginationItem>
                ))}

                <PaginationItem>
                  <PaginationNext
                    onClick={(e) => {
                      e.stopPropagation();
                      handlePageChange(currentPage + 1);
                    }}
                    aria-disabled={currentPage === totalPages}
                    className={
                      currentPage === totalPages
                        ? "opacity-50 cursor-not-allowed"
                        : ""
                    }
                  />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          )}

          {organizations.length === 0 && !loading && (
            <div className="flex flex-col items-center justify-center p-8 text-center space-y-4">
              <div className="text-muted-foreground">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="48"
                  height="48"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="mx-auto"
                >
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                  <circle cx="9" cy="7" r="4" />
                  <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                  <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold">
                No se encontraron organizaciones
              </h3>
              <p className="text-muted-foreground">
                No estás registrado en ninguna organización actualmente.
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export const Route = createLazyFileRoute(
  "/auth/organizations/my-organizations"
)({
  component: MyOrganizations,
});
