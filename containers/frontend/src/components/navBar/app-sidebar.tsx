import * as React from "react";
import { Frame, LifeBuoy, Send, Music2, User, Map } from "lucide-react";
import { useRouter } from "@tanstack/react-router";
import { useAuth } from '@/auth';
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
    { title: 'Inicio', url: '/auth/home', icon: Music2 },
    { title: 'Mapa de Talento', url: '/auth/user/map', icon: Map },
    { title: 'Mi Perfil', url: '/auth/user/profile', icon: User }
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
  const router = useRouter();
  const { session } = useAuth();
  const username = session?.username;
  const [navMain, setNavMain] = React.useState<NavItem[]>(staticData.navMain);
  const [navSecondary, setNavSecondary] = React.useState(staticData.navSecondary);
  const [currentUserData, setCurrentUserData] = React.useState<UserData>(initialUserData);

  // Derivar datos básicos del usuario desde la sesión
  React.useEffect(() => {
    if (session?.username) {
      setCurrentUserData({
        name: session.username,
        email: session.email || "",
        avatar: null,
      })
    }
  }, [session])

  React.useEffect(() => {
    // Highlight secondary navigation based on current path
    const currentPath = router.state.location.pathname;
    const updatedNavSecondary = staticData.navSecondary.map(item => ({
      ...item,
      isActive: item.url !== "#" && currentPath.startsWith(item.url)
    }));
     
    setNavSecondary(updatedNavSecondary);
  }, [router.state.location.pathname]);

  return (
    <Sidebar variant="inset" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <a href="#">
                <img src="/images/cve-sentinel2.png" alt="App Logo" className="size-8 object-contain" />
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-semibold">LocalTalent</span>
                  <span className="truncate text-xs">Talento Local</span>
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
