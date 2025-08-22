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
// Organización eliminada: se retira fetchGetUserOrganizationsNames

export function NavProjects({ projects }: { projects: { name: string; url: string; icon: LucideIcon }[] }) {
  const [open, setOpen] = React.useState(false);
  // Organización eliminada: no se gestionan organizaciones

  // useEffect eliminado

  // handleSelect eliminado

  return (
    <SidebarGroup className="group-data-[collapsible=icon]:hidden">
  {/* Selector de organizaciones eliminado */}
    </SidebarGroup>
  );
}

