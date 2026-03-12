// DashboardProvider + consumer co-located to prevent HMR context desync
import { useDashboard, DashboardProvider } from "@/contexts/DashboardContext";
import { SidebarProvider, SidebarTrigger, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { DataChat } from "@/components/dashboard/DataChat";
import { GlobalFilter } from "@/components/GlobalFilter";
import { format, isToday, isYesterday } from "date-fns";
import { ptBR } from "date-fns/locale";

const formatLastUpdate = (date: Date | null): string => {
  if (!date) return "—";
  if (isToday(date)) return format(date, "HH:mm", { locale: ptBR });
  if (isYesterday(date)) return `Ontem ${format(date, "HH:mm", { locale: ptBR })}`;
  return format(date, "dd/MM HH:mm", { locale: ptBR });
};

const DashboardLayoutInner = ({ children }: { children: React.ReactNode }) => {
  const { lastDataUpdate } = useDashboard();

  return (
    <SidebarProvider defaultOpen={true}>
      <div className="min-h-screen flex w-full">
        <AppSidebar />
        <SidebarInset>
          <header className="flex h-12 items-center border-b px-4 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-10">
            <SidebarTrigger className="-ml-1" />
            <div className="ml-4 font-semibold text-sm">📊 Dashboard de Marketing</div>
            <div className="flex-1" />
            <div className="text-xs text-muted-foreground flex items-center gap-1.5">
              <span
                className={`w-1.5 h-1.5 rounded-full ${lastDataUpdate ? "bg-green-500" : "bg-muted-foreground/50"}`}
              />
              <span className="hidden sm:inline">Dados:</span>
              <span>{formatLastUpdate(lastDataUpdate)}</span>
            </div>
          </header>
          <GlobalFilter />
          <main className="flex-1 bg-background">{children}</main>
          <DataChat />
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
};

export const DashboardLayout = ({ children }: { children: React.ReactNode }) => (
  <DashboardProvider>
    <DashboardLayoutInner>{children}</DashboardLayoutInner>
  </DashboardProvider>
);
