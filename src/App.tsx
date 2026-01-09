import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { DashboardProvider } from "@/contexts/DashboardContext";
import { SidebarProvider, SidebarTrigger, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { GlobalFilter } from "@/components/GlobalFilter";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { AdminRoute } from "@/components/AdminRoute";
import Login from "./pages/Login";
import ExecutiveDashboard from "./pages/ExecutiveDashboard";
import Upload from "./pages/Upload";
import Settings from "./pages/Settings";
import Seguidores from "./pages/Seguidores";
import Volume from "./pages/Volume";
import Ads from "./pages/Ads";
import PerformanceFinanceira from "./pages/PerformanceFinanceira";
import ComportamentoCliente from "./pages/ComportamentoCliente";
import AnaliseSamples from "./pages/AnaliseSamples";
import AnaliseCritica from "./pages/AnaliseCritica";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

// Layout component for authenticated pages
const AuthenticatedLayout = ({ children }: { children: React.ReactNode }) => (
  <DashboardProvider>
    <SidebarProvider defaultOpen={true}>
      <div className="min-h-screen flex w-full">
        <AppSidebar />
        <SidebarInset>
          <header className="flex h-12 items-center border-b px-4 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            <SidebarTrigger className="-ml-1" />
            <div className="ml-4 font-semibold text-sm">📊 Dashboard de Marketing</div>
          </header>
          <GlobalFilter />
          <main className="flex-1 bg-background">
            {children}
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
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
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          
          <Route path="/dashboard" element={
            <ProtectedRoute>
              <AuthenticatedLayout>
                <ExecutiveDashboard />
              </AuthenticatedLayout>
            </ProtectedRoute>
          } />
          
          <Route path="/upload" element={
            <ProtectedRoute>
              <AdminRoute>
                <AuthenticatedLayout>
                  <Upload />
                </AuthenticatedLayout>
              </AdminRoute>
            </ProtectedRoute>
          } />
          
          <Route path="/settings" element={
            <ProtectedRoute>
              <AuthenticatedLayout>
                <Settings />
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
          
          <Route path="/volume" element={
            <ProtectedRoute>
              <AuthenticatedLayout>
                <Volume />
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
          
          <Route path="/analise-samples" element={
            <ProtectedRoute>
              <AuthenticatedLayout>
                <AnaliseSamples />
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
          
          {/* Catch-all route */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
