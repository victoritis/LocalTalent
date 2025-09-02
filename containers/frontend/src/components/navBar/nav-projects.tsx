"use client";

import { type LucideIcon } from "lucide-react";
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
// Organización eliminada: se retira fetchGetUserOrganizationsNames y selector de ubicación

export function NavProjects({ projects }: { projects: { name: string; url: string; icon: LucideIcon }[] }) {
  // Placeholder sin contenido específico del dominio
  return (
    <SidebarGroup className="group-data-[collapsible=icon]:hidden">
      <SidebarMenuItem>
        <SidebarMenuButton asChild>
          <div className="w-full flex justify-start text-xs text-muted-foreground px-2 py-1.5">
            Projects placeholder
          </div>
        </SidebarMenuButton>
      </SidebarMenuItem>
    </SidebarGroup>
  );
}
