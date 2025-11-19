import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { DashboardProvider } from "@/contexts/DashboardContext";
import { Navigation } from "@/components/Navigation";
import Index from "./pages/Index";
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
          <div className="min-h-screen bg-background">
            <Navigation />
            <Routes>
              <Route path="/" element={<Index />} />
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
          </div>
        </DashboardProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
