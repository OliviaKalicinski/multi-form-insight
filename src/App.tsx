import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { DashboardProvider, useDashboard } from "@/contexts/DashboardContext";
import { SidebarProvider, SidebarTrigger, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { DataChat } from "@/components/dashboard/DataChat";
import { GlobalFilter } from "@/components/GlobalFilter";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { AdminRoute } from "@/components/AdminRoute";
import Login from "./pages/Login";
import ExecutiveDashboard from "./pages/ExecutiveDashboard";
import Upload from "./pages/Upload";
import Settings from "./pages/Settings";
import Metas from "./pages/Metas";
import Seguidores from "./pages/Seguidores";
import Produtos from "./pages/Produtos";
import Operacoes from "./pages/Operacoes";
import Ads from "./pages/Ads";
import PerformanceFinanceira from "./pages/PerformanceFinanceira";
import ComportamentoCliente from "./pages/ComportamentoCliente";
import SegmentacaoClientes from "./pages/SegmentacaoClientes";
import AnaliseSamples from "./pages/AnaliseSamples";
import AnaliseCritica from "./pages/AnaliseCritica";
import AnaliseChurn from "./pages/AnaliseChurn";
import Publico from "./pages/Publico";
import VisaoExecutivaV2 from "./pages/VisaoExecutivaV2";
import Clientes from "./pages/Clientes";
import ClientePerfil from "./pages/ClientePerfil";
import Reclamacoes from "./pages/Reclamacoes";
import NotFound from "./pages/NotFound";
import { format, isToday, isYesterday } from "date-fns";
import { ptBR } from "date-fns/locale";

const queryClient = new QueryClient();

// Helper to format last update date
const formatLastUpdate = (date: Date | null): string => {
  if (!date) return "—";
  
  if (isToday(date)) {
    return format(date, "HH:mm", { locale: ptBR });
  }
  
  if (isYesterday(date)) {
    return `Ontem ${format(date, "HH:mm", { locale: ptBR })}`;
  }
  
  return format(date, "dd/MM HH:mm", { locale: ptBR });
};

// Inner layout that can use the Dashboard context
const DashboardLayout = ({ children }: { children: React.ReactNode }) => {
  const { lastDataUpdate } = useDashboard();
  
  return (
    <SidebarProvider defaultOpen={true}>
      <div className="min-h-screen flex w-full">
        <AppSidebar />
        <SidebarInset>
          <header className="flex h-12 items-center border-b px-4 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-10">
            <SidebarTrigger className="-ml-1" />
            <div className="ml-4 font-semibold text-sm">📊 Dashboard de Marketing</div>
            
            {/* Spacer */}
            <div className="flex-1" />
            
            {/* Data update indicator */}
            <div className="text-xs text-muted-foreground flex items-center gap-1.5">
              <span className={`w-1.5 h-1.5 rounded-full ${lastDataUpdate ? 'bg-green-500' : 'bg-muted-foreground/50'}`} />
              <span className="hidden sm:inline">Dados:</span>
              <span>{formatLastUpdate(lastDataUpdate)}</span>
            </div>
          </header>
          <GlobalFilter />
          <main className="flex-1 bg-background">
            {children}
          </main>
          <DataChat />
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
};

// Layout component for authenticated pages
const AuthenticatedLayout = ({ children }: { children: React.ReactNode }) => (
  <DashboardProvider>
    <DashboardLayout>{children}</DashboardLayout>
  </DashboardProvider>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          {/* Public route */}
          <Route path="/login" element={<Login />} />
          
          {/* Protected routes */}
          <Route path="/" element={<Navigate to="/visao-executiva-v2" replace />} />
          
          <Route path="/visao-executiva-v2" element={
            <ProtectedRoute>
              <AuthenticatedLayout>
                <VisaoExecutivaV2 />
              </AuthenticatedLayout>
            </ProtectedRoute>
          } />
          
          <Route path="/dashboard" element={
            <ProtectedRoute>
              <AuthenticatedLayout>
                <ExecutiveDashboard />
              </AuthenticatedLayout>
            </ProtectedRoute>
          } />
          
          <Route path="/upload" element={
            <ProtectedRoute>
              <AuthenticatedLayout>
                <AdminRoute>
                  <Upload />
                </AdminRoute>
              </AuthenticatedLayout>
            </ProtectedRoute>
          } />
          
          <Route path="/settings" element={
            <ProtectedRoute>
              <AuthenticatedLayout>
                <Settings />
              </AuthenticatedLayout>
            </ProtectedRoute>
          } />
          
          <Route path="/metas" element={
            <ProtectedRoute>
              <AuthenticatedLayout>
                <AdminRoute>
                  <Metas />
                </AdminRoute>
              </AuthenticatedLayout>
            </ProtectedRoute>
          } />
          
          <Route path="/seguidores" element={
            <ProtectedRoute>
              <AuthenticatedLayout>
                <Seguidores />
              </AuthenticatedLayout>
            </ProtectedRoute>
          } />
          
          <Route path="/produtos" element={
            <ProtectedRoute>
              <AuthenticatedLayout>
                <Produtos />
              </AuthenticatedLayout>
            </ProtectedRoute>
          } />
          
          <Route path="/operacoes" element={
            <ProtectedRoute>
              <AuthenticatedLayout>
                <Operacoes />
              </AuthenticatedLayout>
            </ProtectedRoute>
          } />
          
          <Route path="/ads" element={
            <ProtectedRoute>
              <AuthenticatedLayout>
                <Ads />
              </AuthenticatedLayout>
            </ProtectedRoute>
          } />
          
          <Route path="/performance-financeira" element={
            <ProtectedRoute>
              <AuthenticatedLayout>
                <PerformanceFinanceira />
              </AuthenticatedLayout>
            </ProtectedRoute>
          } />
          
          <Route path="/comportamento-cliente" element={
            <ProtectedRoute>
              <AuthenticatedLayout>
                <ComportamentoCliente />
              </AuthenticatedLayout>
            </ProtectedRoute>
          } />
          
          <Route path="/segmentacao-clientes" element={
            <ProtectedRoute>
              <AuthenticatedLayout>
                <SegmentacaoClientes />
              </AuthenticatedLayout>
            </ProtectedRoute>
          } />
          
          <Route path="/analise-churn" element={
            <ProtectedRoute>
              <AuthenticatedLayout>
                <AnaliseChurn />
              </AuthenticatedLayout>
            </ProtectedRoute>
          } />
          
          <Route path="/analise-samples" element={
            <ProtectedRoute>
              <AuthenticatedLayout>
                <AnaliseSamples />
              </AuthenticatedLayout>
            </ProtectedRoute>
          } />
          
          <Route path="/publico" element={
            <ProtectedRoute>
              <AuthenticatedLayout>
                <Publico />
              </AuthenticatedLayout>
            </ProtectedRoute>
          } />
          
          <Route path="/analise-critica" element={
            <ProtectedRoute>
              <AuthenticatedLayout>
                <AnaliseCritica />
              </AuthenticatedLayout>
            </ProtectedRoute>
          } />
          
          <Route path="/clientes" element={
            <ProtectedRoute>
              <AuthenticatedLayout>
                <Clientes />
              </AuthenticatedLayout>
            </ProtectedRoute>
          } />
          
          <Route path="/clientes/:cpfCnpj" element={
            <ProtectedRoute>
              <AuthenticatedLayout>
                <ClientePerfil />
              </AuthenticatedLayout>
            </ProtectedRoute>
          } />
          
          <Route path="/reclamacoes" element={
            <ProtectedRoute>
              <AuthenticatedLayout>
                <Reclamacoes />
              </AuthenticatedLayout>
            </ProtectedRoute>
          } />
          
          {/* Catch-all route */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
