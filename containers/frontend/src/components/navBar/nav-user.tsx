"use client";

import { ChevronsUpDown, Languages, LogOut } from "lucide-react";
import { useTranslation } from "react-i18next";

import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";

import { useAuth } from "@/auth"; // Asegúrate de que la ruta sea correcta
import { useRouter } from "@tanstack/react-router"; // Asegúrate de que TanStack Router esté instalado
import { LANGUAGES } from "@/i18n";

export function NavUser({
  user,
}: {
  user: { name: string; email: string; avatar: string | null }; // avatar puede ser null
}) {
  const { isMobile } = useSidebar();
  const { logout, session } = useAuth();
  const router = useRouter();
  const { t, i18n } = useTranslation();

  const handleLogout = () => {
    logout();
    router.navigate({ to: "/login" });
  };

  // Perfil eliminado en esta base reusable

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
            >
              <Avatar className="h-8 w-8 rounded-lg">
                <AvatarImage src={user.avatar ?? undefined} alt={user.name} /> {/* Usar user.avatar directamente */}
                <AvatarFallback className="rounded-lg">
                  {user.name?.substring(0, 2).toUpperCase() || "U"}
                </AvatarFallback>
              </Avatar>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-semibold">{user.name}</span>
                <span className="truncate text-xs">{user.email}</span>
              </div>
              <ChevronsUpDown className="ml-auto size-4" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-lg"
            side={isMobile ? "bottom" : "right"}
            align="end"
            sideOffset={4}
          >
            <DropdownMenuLabel className="p-0 font-normal">
              <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                <Avatar className="h-8 w-8 rounded-lg">
                  <AvatarImage src={user.avatar ?? undefined} alt={user.name} /> {/* Usar user.avatar directamente */}
                  <AvatarFallback className="rounded-lg">
                    {user.name?.substring(0, 2).toUpperCase() || "U"}
                  </AvatarFallback>
                </Avatar>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-semibold">{user.name}</span>
                  <span className="truncate text-xs">{user.email}</span>
                </div>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuSub>
                <DropdownMenuSubTrigger>
                  <Languages aria-hidden="true" className="mr-2 h-4 w-4" />
                  <span>{t("language.label")}</span>
                  <span className="ml-auto text-xs uppercase text-muted-foreground">
                    {i18n.resolvedLanguage}
                  </span>
                </DropdownMenuSubTrigger>
                <DropdownMenuSubContent>
                  {LANGUAGES.map((lang) => (
                    <DropdownMenuItem
                      key={lang.code}
                      onSelect={() => i18n.changeLanguage(lang.code)}
                      aria-current={lang.code === i18n.resolvedLanguage ? "true" : undefined}
                    >
                      <span className="uppercase mr-2 text-xs w-6 text-muted-foreground">
                        {lang.code}
                      </span>
                      {t(lang.labelKey)}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuSubContent>
              </DropdownMenuSub>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleLogout}>
              <LogOut aria-hidden="true" className="mr-2 h-4 w-4" />
              <span>{t("nav.logout")}</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
