"use client";

import {
  MoreHorizontal,
  type LucideIcon,
  ChevronDown,
  ChevronRight,
  LayoutDashboard,
  PackagePlus,
  ListChecks,
  Box,
  Bell,
  AlertTriangle, 
} from "lucide-react";
import { useRouter } from "@tanstack/react-router";
import * as React from "react";
import { Check } from "lucide-react";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  DropdownMenu,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  SidebarGroup,
  SidebarMenuAction,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from "@/components/ui/sidebar";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import { useAuth } from "@/auth";
import { fetchGetUserOrganizationsNames } from "@/services/organizations/organizationApi";
import { OrganizationContext } from "../../services/organizations/organizationApi";

export function NavProjects({ projects }: { projects: { name: string; url: string; icon: LucideIcon }[] }) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [orgName, setOrgName] = React.useState<string | null>(null);
  const [organizations, setOrganizations] = React.useState<OrganizationContext[]>([]);
  const { set_current_organization, current_organization } = useAuth();

  React.useEffect(() => {
    const loadOrganizations = async () => {
      try {
        const data = await fetchGetUserOrganizationsNames();
        setOrganizations(data.organizations);
        if (data.organizations.length > 0 && current_organization) {
          setOrgName(current_organization.name);
        }
      } catch (error) {
        console.error("Error al cargar las organizaciones:", error);
      }
    };

    loadOrganizations();
  }, [current_organization]);

  React.useEffect(() => {
    if (current_organization) {
      setOrgName(current_organization.name);
    }
    // Solo auto‑navegar cuando estamos en la ruta base de organización
    const pathname = router.state.location.pathname;
    const basePath = `/auth/organizations/${current_organization?.name}`;
    if (
      current_organization &&
      (pathname === basePath || pathname === `${basePath}/`)
    ) {
      router.navigate({
        to: "/auth/organizations/$organizationName/overview",
        params: { organizationName: current_organization.name },
      });
    }
  }, [current_organization, router]);

  const handleProjectClick = (url: string) => {
    router.navigate({ to: url });
  };

  const isProductSectionActive =
    router.state.location.pathname.includes("/products") ||
    router.state.location.pathname.includes("/add-products");
  
  const isAlertsSectionActive = 
    router.state.location.pathname.includes("/alerts");
    
  const isOverviewActive = router.state.location.pathname.endsWith("/overview");

  return (
    <SidebarGroup className="group-data-[collapsible=icon]:hidden">
      {projects.map((item) => {
        if (item.name === "Design Engineering") {
          return (
            <SidebarMenuItem key="organizations-selector">
              <Popover open={open} onOpenChange={setOpen}>
                <PopoverTrigger asChild>
                   <SidebarMenuButton asChild>
                      <button
                        type="button"
                        className="w-full text-left justify-between
                          bg-gradient-to-b from-background/90 to-background/70
                          border shadow-sm hover:bg-accent/60 px-3 py-3
                          rounded-md transition-colors min-h-[40px]"
                        role="combobox"
                        aria-expanded={open}
                      >
                        <div className="flex items-center gap-2">
                          <item.icon className="h-4 w-4" />
                          <span className="text-sm font-medium leading-snug">
                            {orgName ? orgName : "Seleccionar organización"}
                          </span>
                        </div>
                        <ChevronDown className="ml-2 h-3.5 w-3.5 shrink-0 opacity-70" />
                      </button>
                    </SidebarMenuButton>
                </PopoverTrigger>
                <PopoverContent className="w-[200px] p-0">
                   <Command>
                      <CommandInput placeholder="Buscar organización..." />
                      <CommandList className="max-h-[165px] overflow-y-auto">
                        {organizations.length === 0 ? (
                          <CommandEmpty>No se encontraron organizaciones</CommandEmpty>
                        ) : (
                          <CommandGroup>
                            {organizations.map((org) => (
                              <CommandItem
                                key={org.id}
                                value={org.name}
                                onSelect={() => {
                                  setOpen(false);
                                  set_current_organization(org); // Actualiza la organización en el contexto
                                  // Navega explícitamente al overview de la organización seleccionada
                                  router.navigate({
                                    to: "/auth/organizations/$organizationName/overview",
                                    params: { organizationName: org.name },
                                  });
                                }}
                              >
                                <Check
                                  className={cn(
                                    "mr-2 h-4 w-4",
                                    orgName === org.name ? "opacity-100" : "opacity-0"
                                  )}
                                />
                                {org.name}
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        )}
                      </CommandList>
                    </Command>
                </PopoverContent>
              </Popover>
            </SidebarMenuItem>
          );
        }
        return null;
      })}

      {current_organization && (
        <>
          <SidebarMenuItem key="org-overview">
            <SidebarMenuButton
              onClick={() =>
                router.navigate({
                  to: "/auth/organizations/$organizationName/overview",
                  params: { organizationName: current_organization.name },
                })
              }
              isActive={isOverviewActive}
              className="w-full"
            >
              <LayoutDashboard className="h-4 w-4" />
              <span>Resumen</span>
            </SidebarMenuButton>
          </SidebarMenuItem>

          <Collapsible asChild defaultOpen={true}>
            <SidebarMenuItem>
              <SidebarMenuButton
                isActive={isProductSectionActive}
                className="w-full justify-start" 
              >
                <Box className="h-4 w-4" />
                <span>Productos</span>
              </SidebarMenuButton>
              <CollapsibleTrigger asChild>
                <SidebarMenuAction className="data-[state=open]:rotate-90">
                  <ChevronRight className="h-4 w-4" />
                  <span className="sr-only">Toggle Productos</span>
                </SidebarMenuAction>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <SidebarMenuSub>
                  <SidebarMenuSubItem key="org-products">
                    <SidebarMenuSubButton
                      asChild 
                      isActive={router.state.location.pathname.endsWith("/products")}
                      onClick={() =>
                        router.navigate({
                          to: "/auth/organizations/$organizationName/products",
                          params: { organizationName: current_organization.name },
                        })
                      }
                    >
                      <button type="button" className="w-full">
                        <ListChecks className="h-4 w-4" />
                        <span>Mis Productos</span>
                      </button>
                    </SidebarMenuSubButton>
                  </SidebarMenuSubItem>
                  <SidebarMenuSubItem key="org-add-products">
                    <SidebarMenuSubButton
                      asChild 
                      isActive={router.state.location.pathname.endsWith("/add-products")}
                      onClick={() =>
                        router.navigate({
                          to: "/auth/organizations/$organizationName/add-products",
                          params: { organizationName: current_organization.name },
                        })
                      }
                    >
                      <button type="button" className="w-full">
                        <PackagePlus className="h-4 w-4" />
                        <span>Añadir Producto</span>
                      </button>
                    </SidebarMenuSubButton>
                  </SidebarMenuSubItem>
                </SidebarMenuSub>
              </CollapsibleContent>
            </SidebarMenuItem>
          </Collapsible>

          <Collapsible asChild defaultOpen={true}>
            <SidebarMenuItem>
              <SidebarMenuButton
                isActive={isAlertsSectionActive}
                className="w-full justify-start" 
              >
                <Bell className="h-4 w-4" />
                <span>Alertas</span>
              </SidebarMenuButton>
              <CollapsibleTrigger asChild>
                <SidebarMenuAction className="data-[state=open]:rotate-90">
                  <ChevronRight className="h-4 w-4" />
                  <span className="sr-only">Toggle Alertas</span>
                </SidebarMenuAction>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <SidebarMenuSub>
                  <SidebarMenuSubItem key="org-alerts">
                    <SidebarMenuSubButton
                      asChild 
                      isActive={router.state.location.pathname.endsWith("/alerts")}
                      onClick={() =>
                        router.navigate({
                          to: "/auth/organizations/$organizationName/alerts",
                          params: { organizationName: current_organization.name },
                        })
                      }
                    >
                      <button type="button" className="w-full">
                        <AlertTriangle className="h-4 w-4" />
                        <span>Mis Alertas</span>
                      </button>
                    </SidebarMenuSubButton>
                  </SidebarMenuSubItem>
                </SidebarMenuSub>
              </CollapsibleContent>
            </SidebarMenuItem>
          </Collapsible>
        </>
      )}
       {projects.map((item) => {
          if (item.name === "Design Engineering") return null; // Ya manejado arriba

          return (
            <SidebarMenuItem key={item.name}>
              <SidebarMenuButton
                asChild
                onClick={() => handleProjectClick(item.url)}
                className="w-full"
              >
                <button type="button" className="flex items-center justify-between w-full">
                   <div className="flex items-center gap-2">
                      <item.icon />
                      <span>{item.name}</span>
                   </div>
                </button>
              </SidebarMenuButton>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <SidebarMenuAction showOnHover>
                    <MoreHorizontal />
                    <span className="sr-only">More</span>
                  </SidebarMenuAction>
                </DropdownMenuTrigger>
              </DropdownMenu>
            </SidebarMenuItem>
          );
        })}
    </SidebarGroup>
  );
}
