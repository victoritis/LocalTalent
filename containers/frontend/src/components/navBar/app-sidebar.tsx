import * as React from "react";
import {
  Frame,
  LifeBuoy,
  Send,
  SquareTerminal,
  PackageSearch, 
  ShieldAlert,
  ListFilter, 
  Settings,
} from "lucide-react";
import { useAuth } from "@/auth";
import { useRouter } from "@tanstack/react-router";
import { NavMain } from "@/components/navBar/nav-main";
import { NavProjects } from "@/components/navBar/nav-projects";
import { NavSecondary } from "@/components/navBar/nav-secondary";
import { NavUser } from "@/components/navBar/nav-user";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";

type NavItem = {
  title: string;
  url: string;
  icon: React.ForwardRefExoticComponent<
    Omit<React.SVGAttributes<SVGSVGElement>, "ref"> & 
    React.RefAttributes<SVGSVGElement>
  >;
  isActive?: boolean;
  items?: Array<{
    title: string;
    url: string;
    onClick?: () => void;
  }>;
  hidden?: boolean; 
};

type UserData = {
  name: string;
  email: string;
  avatar: string | null; // Avatar puede ser una cadena base64 o null
};

type StaticData = {
  user: UserData; // Tipo actualizado
  navMain: NavItem[];
  navSecondary: Array<{
    title: string;
    url: string;
    icon: React.ForwardRefExoticComponent<
      Omit<React.SVGAttributes<SVGSVGElement>, "ref"> & 
      React.RefAttributes<SVGSVGElement>
    >;
  }>;
  projects: Array<{
    name: string;
    url: string;
    icon: React.ForwardRefExoticComponent<
      Omit<React.SVGAttributes<SVGSVGElement>, "ref"> & 
      React.RefAttributes<SVGSVGElement>
    >;
  }>;
};

const initialUserData: UserData = {
  name: "Usuario",
  email: "cargando...",
  avatar: null, // Inicialmente null o una imagen de carga
};

const staticData: StaticData = {
  user: initialUserData, // Usar los datos iniciales
  navMain: [
    {
      title: "Organizaciones",
      url: "#",
      icon: SquareTerminal,
      isActive: false, 
      items: [] 
    },
    {
      title: "Panel Superadmin",
      url: "#", 
      icon: Settings, 
      isActive: false, 
      items: [],
    },
    
    {
      title: "Explorador CPE",
      url: "/auth/glossary/cpe-explorer", 
      icon: PackageSearch, 
      isActive: false, 
      items: [], 
    },
    {
      title: "Explorador CVE",
      url: "/auth/glossary/cve-explorer",
      icon: ShieldAlert, 
      isActive: false,
      items: [],
    },
    { 
      title: "Explorador de Match",
      url: "/auth/glossary/match-explorer",
      icon: ListFilter, 
      isActive: false,
      items: [],
    }
  ],
  navSecondary: [
    { title: "Support", url: "/auth/support", icon: LifeBuoy },
    { title: "Feedback", url: "/auth/feedback", icon: Send }
  ],
  projects: [
    { name: "Design Engineering", url: "#", icon: Frame } 
  ]
};

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { roles } = useAuth();
  const router = useRouter();
  const [navMain, setNavMain] = React.useState<NavItem[]>(staticData.navMain);
  const [navSecondary, setNavSecondary] = React.useState(staticData.navSecondary);
  const [currentUserData, setCurrentUserData] = React.useState<UserData>(initialUserData);
  const apiUrl = import.meta.env.VITE_REACT_APP_API_URL || "";

  React.useEffect(() => {
    const fetchUserData = async () => {
      try {
        const response = await fetch(`${apiUrl}/api/v1/user/sidebar-info`, {
          credentials: "include",
        });
        if (!response.ok) {
          throw new Error(`Error fetching user data: ${response.status}`);
        }
        const data = await response.json();
        setCurrentUserData({
          name: data.name || "Usuario",
          email: data.email || "error@example.com",
          avatar: data.avatar, // Esto ya debería ser 'data:image/...;base64,...' o null
        });
      } catch (error) {
        console.error("Failed to fetch user data:", error);
        setCurrentUserData({ // Fallback en caso de error
          name: "Error",
          email: "No se pudo cargar",
          avatar: null, 
        });
      }
    };

    fetchUserData();
  }, [apiUrl]);

  const getOrganizationItems = React.useCallback((
    currentRoles: typeof roles
  ): Array<{ title: string; url: string; onClick?: () => void }> => {
    const baseItems = [];
    
    if (currentRoles.ROLE_SUPERADMIN) {
      baseItems.push({
        title: "Administrar organizaciones",
        url: "/auth/superadmin/manage-organizations",
        onClick: () => router.navigate({ to: "/auth/superadmin/manage-organizations" })
      });
      baseItems.push({
        title: "Crear organización",
        url: "/auth/superadmin/create-organization",
        onClick: () => router.navigate({ to: "/auth/superadmin/create-organization" }),
      });
    }

    if (currentRoles.ROLE_ORG_ADMIN) {
      baseItems.push({
        title: "Administrar organizaciones",
        url: "/auth/org-admin/manage-organizations",
        onClick: () => router.navigate({ to: "/auth/org-admin/manage-organizations" })
      });
    }

    baseItems.push({
      title: currentRoles.ROLE_SUPERADMIN ? "Organizaciones" : "Mis organizaciones",
      url: "/auth/organizations/my-organizations",
      onClick: () => router.navigate({ to: "/auth/organizations/my-organizations" })
    });

    return baseItems;
  }, [router]);

  React.useEffect(() => {
    const updatedNavMain = staticData.navMain.map(item => {
      if (item.title === "Organizaciones") {
        return {
          ...item,
          items: getOrganizationItems(roles)
        };
      }
      if (item.title === "Panel Superadmin") {
        const superAdminItems = [];
        if (roles.ROLE_SUPERADMIN) {
          superAdminItems.push({
            title: "Resumen del Sistema", 
            url: "/auth/superadmin/data-status", 
            onClick: () => router.navigate({ to: "/auth/superadmin/data-status" }),
          });
          superAdminItems.push({ 
            title: "Sincronización de Datos",
            url: "/auth/superadmin/data-synchronization",
            onClick: () => router.navigate({ to: "/auth/superadmin/data-synchronization" }),
          });
          superAdminItems.push({
            title: "Consultar Feedback",
            url: "/auth/superadmin/view-feedback",
            onClick: () => router.navigate({ to: "/auth/superadmin/view-feedback" }),
          });

        }
        return {
          ...item,
          items: superAdminItems,
          isActive: roles.ROLE_SUPERADMIN,
          hidden: superAdminItems.length === 0,
        };
      }
      
      if (item.title === "Explorador CPE") {
        return {
          ...item,
          isActive: router.state.location.pathname.startsWith("/auth/glossary/cpe-explorer"), 
          
        };
      }
      if (item.title === "Explorador CVE") {
        return {
          ...item,
          isActive: router.state.location.pathname.startsWith("/auth/glossary/cve-explorer"),
        };
      }

      if (item.title === "Explorador de Match") {
        return {
          ...item,
          isActive: router.state.location.pathname.startsWith("/auth/glossary/match-explorer"),
        };
      }
      return item;
    });
    setNavMain(updatedNavMain.filter(item => !item.hidden)); // Filtrar items ocultos

    const currentPath = router.state.location.pathname;
    const updatedNavSecondary = staticData.navSecondary.map(item => ({
      ...item,
      isActive: item.url !== "#" && currentPath.startsWith(item.url)
    }));
    setNavSecondary(updatedNavSecondary);

  }, [roles, getOrganizationItems, router.state.location.pathname]); 

  return (
    <Sidebar variant="inset" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <a href="#">
                <img src="/images/cve-sentinel2.png" alt="Icono CVE-SENTINEL" className="size-8 object-contain" />
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-semibold">CVE-SENTINEL</span>
                  <span className="truncate text-xs">CSA Pro Edition</span>
                </div>
              </a>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={navMain} />
        <NavProjects projects={staticData.projects} />
        <NavSecondary items={navSecondary} className="mt-auto" />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={currentUserData} />
      </SidebarFooter>
    </Sidebar>
  );
}
