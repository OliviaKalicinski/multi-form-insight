import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { DashboardProvider } from "@/contexts/DashboardContext";
import { SidebarProvider, SidebarTrigger, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { GlobalFilter } from "@/components/GlobalFilter";
import ExecutiveDashboard from "./pages/ExecutiveDashboard";
import Upload from "./pages/Upload";
import Seguidores from "./pages/Seguidores";
import Volume from "./pages/Volume";
import Ads from "./pages/Ads";
import PerformanceFinanceira from "./pages/PerformanceFinanceira";
import ComportamentoCliente from "./pages/ComportamentoCliente";
import AnaliseSamples from "./pages/AnaliseSamples";
import AnaliseCritica from "./pages/AnaliseCritica";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
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
                  <Routes>
                    <Route path="/" element={<Navigate to="/dashboard" replace />} />
                    <Route path="/dashboard" element={<ExecutiveDashboard />} />
                    <Route path="/upload" element={<Upload />} />
                    <Route path="/seguidores" element={<Seguidores />} />
                    <Route path="/volume" element={<Volume />} />
                    <Route path="/ads" element={<Ads />} />
                    <Route path="/performance-financeira" element={<PerformanceFinanceira />} />
                    <Route path="/comportamento-cliente" element={<ComportamentoCliente />} />
                    <Route path="/analise-samples" element={<AnaliseSamples />} />
                    <Route path="/analise-critica" element={<AnaliseCritica />} />
                    {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                    <Route path="*" element={<NotFound />} />
                  </Routes>
                </main>
              </SidebarInset>
            </div>
          </SidebarProvider>
        </DashboardProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
