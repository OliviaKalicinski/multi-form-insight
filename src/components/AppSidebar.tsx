import { useLocation, useNavigate } from "react-router-dom";
import comidaDragaoLogo from "@/assets/comida-dragao-logo.svg";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
  useSidebar,
} from "@/components/ui/sidebar";
import {
  LayoutDashboard,
  TrendingUp,
  Gift,
  Users,
  UserCheck,
  Package,
  BarChart3,
  Target,
  Instagram,
  Megaphone,
  Activity,
  Upload,
  ChevronDown,
  Settings,
  LogOut,
  Shield,
  Truck,
  Headset,
  MessageSquareWarning,
  ClipboardList,
} from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { useUserRole } from "@/hooks/useUserRole";

interface NavItem {
  title: string;
  url: string;
  icon: React.ComponentType<{ className?: string }>;
}

interface NavSection {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  items: NavItem[];
}

const navSections: NavSection[] = [
  {
    title: "Visão Geral",
    icon: LayoutDashboard,
    items: [
      { title: "Fotografia Operacional", url: "/visao-executiva-v2", icon: LayoutDashboard },
      { title: "Visão Executiva", url: "/dashboard", icon: LayoutDashboard },
      { title: "Kanban", url: "/kanban-operacional", icon: ClipboardList },
      { title: "Conciliação NF", url: "/kanban-conciliacao", icon: ClipboardList },
      { title: "Operações", url: "/operacoes", icon: Truck },
      { title: "Produtos", url: "/produtos", icon: Package },
    ],
  },
  {
    title: "CRM",
    icon: Headset,
    items: [
      { title: "Radar Operacional", url: "/radar-operacional", icon: Activity },
      { title: "Clientes", url: "/clientes", icon: Users },
      { title: "Reclamações", url: "/reclamacoes", icon: MessageSquareWarning },
      { title: "Atendimentos", url: "/atendimentos", icon: Headset },
    ],
  },
  {
    title: "Canais",
    icon: Truck,
    items: [
      { title: "Distribuidores", url: "/distribuidores", icon: Package },
      { title: "Let's Fly", url: "/lets-fly", icon: Truck },
    ],
  },
  {
    title: "Comida de Dragão",
    icon: Package,
    items: [
      { title: "Performance Financeira", url: "/performance-financeira", icon: TrendingUp },
      { title: "Comportamento", url: "/comportamento-cliente", icon: UserCheck },
      { title: "Amostras", url: "/analise-samples", icon: Gift },
      { title: "Anúncios Meta", url: "/ads", icon: Megaphone },
      { title: "Seguidores", url: "/seguidores", icon: Instagram },
      { title: "Público", url: "/publico", icon: Users },
    ],
  },
];

export function AppSidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { state } = useSidebar();
  const isCollapsed = state === "collapsed";

  const { user, signOut } = useAuth();
  const { isAdmin, isLoading: roleLoading } = useUserRole();

  const isActive = (url: string) => location.pathname === url;

  // Check if any item in section is active
  const isSectionActive = (section: NavSection) => section.items.some((item) => isActive(item.url));

  const handleLogout = async () => {
    await signOut();
    navigate("/login");
  };

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="border-b">
        <div className="flex items-center justify-center px-2 py-4">
          <img src={comidaDragaoLogo} alt="Comida de Dragão" className="h-24 w-auto object-contain" />
        </div>
      </SidebarHeader>

      <SidebarContent>
        {navSections.map((section) => (
          <Collapsible key={section.title} defaultOpen={isSectionActive(section)} className="group/collapsible">
            <SidebarGroup>
              <CollapsibleTrigger asChild>
                <SidebarGroupLabel className="cursor-pointer hover:bg-sidebar-accent rounded-md transition-colors">
                  <div className="flex items-center gap-2 w-full">
                    <section.icon className="h-4 w-4" />
                    {!isCollapsed && (
                      <>
                        <span className="flex-1">{section.title}</span>
                        <ChevronDown className="h-4 w-4 transition-transform group-data-[state=open]/collapsible:rotate-180" />
                      </>
                    )}
                  </div>
                </SidebarGroupLabel>
              </CollapsibleTrigger>

              <CollapsibleContent>
                <SidebarGroupContent>
                  <SidebarMenu>
                    {section.items.map((item) => (
                      <SidebarMenuItem key={item.url}>
                        <SidebarMenuButton
                          isActive={isActive(item.url)}
                          onClick={() => navigate(item.url)}
                          tooltip={item.title}
                        >
                          <item.icon className="h-4 w-4" />
                          <span>{item.title}</span>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    ))}
                  </SidebarMenu>
                </SidebarGroupContent>
              </CollapsibleContent>
            </SidebarGroup>
          </Collapsible>
        ))}
      </SidebarContent>

      <SidebarFooter className="border-t">
        <SidebarMenu>
          {/* Upload - Admin only */}
          {isAdmin && (
            <SidebarMenuItem>
              <SidebarMenuButton
                isActive={isActive("/upload")}
                onClick={() => navigate("/upload")}
                tooltip="Upload de Dados"
              >
                <Upload className="h-4 w-4" />
                <span>Upload de Dados</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          )}

          {/* Metas Financeiras - Admin only */}
          {isAdmin && (
            <SidebarMenuItem>
              <SidebarMenuButton
                isActive={isActive("/metas")}
                onClick={() => navigate("/metas")}
                tooltip="Metas Financeiras"
              >
                <Target className="h-4 w-4" />
                <span>Metas Financeiras</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          )}

          {/* Settings */}
          <SidebarMenuItem>
            <SidebarMenuButton
              isActive={isActive("/settings")}
              onClick={() => navigate("/settings")}
              tooltip="Configurações"
            >
              <Settings className="h-4 w-4" />
              <span>Configurações</span>
            </SidebarMenuButton>
          </SidebarMenuItem>

          {/* User info and logout */}
          {!isCollapsed && user && (
            <>
              <Separator className="my-2" />
              <div className="px-2 py-2">
                <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
                  <span className="truncate flex-1">{user.email}</span>
                  {!roleLoading && (
                    <Badge variant={isAdmin ? "default" : "secondary"} className="text-[10px] px-1.5">
                      {isAdmin ? (
                        <>
                          <Shield className="h-3 w-3 mr-1" />
                          Admin
                        </>
                      ) : (
                        "Viewer"
                      )}
                    </Badge>
                  )}
                </div>
              </div>
            </>
          )}

          <SidebarMenuItem>
            <SidebarMenuButton
              onClick={handleLogout}
              tooltip="Sair"
              className="text-destructive hover:text-destructive hover:bg-destructive/10"
            >
              <LogOut className="h-4 w-4" />
              <span>Sair</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
