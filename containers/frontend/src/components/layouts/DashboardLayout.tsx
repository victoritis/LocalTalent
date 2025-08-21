import React from "react";
import { useLocation } from "@tanstack/react-router";
import { AppSidebar } from "@/components/navBar/app-sidebar";
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb";
import { Separator } from "@/components/ui/separator";

export function DashboardLayout({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const segments = location.pathname.split("/").filter(Boolean).slice(1);

  // Función para decodificar y formatear el texto del segmento
  const formatSegment = (segment: string) => {
    return decodeURIComponent(segment).replace(/-/g, " ");
  };

  return (
    <SidebarProvider>
      <AppSidebar />

      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center gap-2">
          <div className="flex items-center gap-2 px-4">
            <SidebarTrigger className="-ml-1" />
            <Separator orientation="vertical" className="mr-2 h-4" />

            <Breadcrumb key={location.pathname}>
              <BreadcrumbList>
                {segments.map((segment, index) => (
                  <React.Fragment key={index}>
                    {index > 0 && <BreadcrumbSeparator className="hidden md:block" />}
                    <BreadcrumbItem className="hidden md:block">
                      <BreadcrumbLink
                      >
                        {formatSegment(segment)}
                      </BreadcrumbLink>
                    </BreadcrumbItem>
                    {index === segments.length - 1 && (
                      <BreadcrumbPage className="md:hidden">
                        {formatSegment(segment)}
                      </BreadcrumbPage>
                    )}
                  </React.Fragment>
                ))}
              </BreadcrumbList>
            </Breadcrumb>
          </div>
        </header>

        <div className="flex flex-1 flex-col gap-4 p-4 pt-0">{children}</div>
      </SidebarInset>
    </SidebarProvider>
  );
}
