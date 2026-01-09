import { useLocation, useNavigate } from "react-router-dom";
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
  DollarSign,
  TrendingUp,
  Gift,
  Users,
  UserCheck,
  Package,
  BarChart3,
  Target,
  Instagram,
  Megaphone,
  Brain,
  AlertTriangle,
  Upload,
  ChevronDown,
} from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";

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
    title: "Dashboard",
    icon: LayoutDashboard,
    items: [
      { title: "Visão Executiva", url: "/dashboard", icon: LayoutDashboard },
    ],
  },
  {
    title: "Financeiro",
    icon: DollarSign,
    items: [
      { title: "Performance Financeira", url: "/performance-financeira", icon: TrendingUp },
      { title: "Análise de Amostras", url: "/analise-samples", icon: Gift },
    ],
  },
  {
    title: "Clientes",
    icon: Users,
    items: [
      { title: "Comportamento", url: "/comportamento-cliente", icon: UserCheck },
    ],
  },
  {
    title: "Produtos & Ops",
    icon: Package,
    items: [
      { title: "Análise de Volume", url: "/volume", icon: BarChart3 },
    ],
  },
  {
    title: "Marketing",
    icon: Target,
    items: [
      { title: "Instagram", url: "/seguidores", icon: Instagram },
      { title: "Anúncios", url: "/ads", icon: Megaphone },
    ],
  },
  {
    title: "Inteligência",
    icon: Brain,
    items: [
      { title: "Análise Crítica", url: "/analise-critica", icon: AlertTriangle },
    ],
  },
];

export function AppSidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { state } = useSidebar();
  const isCollapsed = state === "collapsed";

  const isActive = (url: string) => location.pathname === url;
  
  // Check if any item in section is active
  const isSectionActive = (section: NavSection) => 
    section.items.some(item => isActive(item.url));

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="border-b">
        <div className={cn(
          "flex items-center gap-2 px-2 py-3",
          isCollapsed && "justify-center"
        )}>
          <span className="text-xl">🐉</span>
          {!isCollapsed && (
            <span className="font-bold text-sm">Comida de Dragão</span>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent>
        {navSections.map((section) => (
          <Collapsible
            key={section.title}
            defaultOpen={isSectionActive(section)}
            className="group/collapsible"
          >
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
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
