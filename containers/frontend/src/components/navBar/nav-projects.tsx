"use client";

import { type LucideIcon, ChevronDown, Check } from "lucide-react";
import * as React from "react";
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
  SidebarGroup,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";
import { useAuth } from "@/auth";
import {
  fetchGetUserOrganizationsNames,
  OrganizationContext,
} from "@/services/organizations/organizationApi";

export function NavProjects({ projects }: { projects: { name: string; url: string; icon: LucideIcon }[] }) {
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

  const handleSelect = (org: OrganizationContext) => {
    setOpen(false);
    set_current_organization(org);
    setOrgName(org.name);
  };

  return (
    <SidebarGroup className="group-data-[collapsible=icon]:hidden">
      {projects.map((item) =>
        item.name === "Design Engineering" ? (
          <SidebarMenuItem key="organizations-selector">
            <Popover open={open} onOpenChange={setOpen}>
              <PopoverTrigger asChild>
                <SidebarMenuButton asChild>
                  <button
                    type="button"
                    className="w-full text-left justify-between bg-gradient-to-b from-background/90 to-background/70 border shadow-sm hover:bg-accent/60 px-3 py-3 rounded-md transition-colors min-h-[40px]"
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
                            onSelect={() => handleSelect(org)}
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
        ) : null
      )}
    </SidebarGroup>
  );
}

