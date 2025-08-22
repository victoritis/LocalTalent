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
import { LocationSelector } from '@/components/location/LocationSelector';
// Organización eliminada: se retira fetchGetUserOrganizationsNames

export function NavProjects({ projects }: { projects: { name: string; url: string; icon: LucideIcon }[] }) {
  // Ya no se listan proyectos dinámicos; se muestra selector de ubicación global

  return (
    <SidebarGroup className="group-data-[collapsible=icon]:hidden">
      <SidebarMenuItem>
        <SidebarMenuButton asChild>
          <div className="w-full flex justify-start">
            <LocationSelector />
          </div>
        </SidebarMenuButton>
      </SidebarMenuItem>
    </SidebarGroup>
  );
}

