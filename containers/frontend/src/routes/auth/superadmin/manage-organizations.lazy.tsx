import React from "react";
import { createLazyFileRoute } from "@tanstack/react-router";
import { OrganizationManagement } from "@/components/management/OrganizationManagement";
import { fetchSuperAdminOrganizations, Organization, OrganizationsResponse } from "@/services/organizations/organizationApi";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";

function ManageOrganizations() {
  const [organizations, setOrganizations] = React.useState<Organization[]>([]);
  const [page, setPage] = React.useState<number>(1);
  const [totalPages, setTotalPages] = React.useState<number>(1);
  const [loading, setLoading] = React.useState<boolean>(false);

  const loadOrganizations = async (pageToLoad: number) => {
    setLoading(true);
    try {
      const data: OrganizationsResponse = await fetchSuperAdminOrganizations(pageToLoad);
      setOrganizations(data.organizations);
      setPage(data.page);
      setTotalPages(data.total_pages);
    } catch (error) {
      throw new Error("Error fetching organizations: " + error);
    } finally {
      setLoading(false);
    }
  };
  

  // Cargar organizaciones al montar el componente o al cambiar la página
  React.useEffect(() => {
    loadOrganizations(page);
  }, [page]);

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setPage(newPage);
    }
  };

  return (
    <div className="p-8">
      <OrganizationManagement
        isSuperAdmin={true}
        organizations={organizations}
        setOrganizations={setOrganizations}
        loading={loading}
      />
      {/* Controles de paginación centrados */}
      <Pagination>
        <PaginationContent>
          <PaginationItem>
            <PaginationPrevious
              onClick={() => handlePageChange(page - 1)}
              aria-disabled={page === 1}
              className={page === 1 ? "opacity-50 cursor-not-allowed" : ""}
            />
          </PaginationItem>

          {Array.from({ length: totalPages }, (_, i) => (
            <PaginationItem key={i}>
              <PaginationLink
                isActive={page === i + 1}
                onClick={() => handlePageChange(i + 1)}
              >
                {i + 1}
              </PaginationLink>
            </PaginationItem>
          ))}

          <PaginationItem>
            <PaginationNext
              onClick={() => handlePageChange(page + 1)}
              aria-disabled={page === totalPages}
              className={page === totalPages ? "opacity-50 cursor-not-allowed" : ""}
            />
          </PaginationItem>
        </PaginationContent>
      </Pagination>
    </div>
  );
}

export const Route = createLazyFileRoute("/auth/superadmin/manage-organizations")({
  component: ManageOrganizations,
});
