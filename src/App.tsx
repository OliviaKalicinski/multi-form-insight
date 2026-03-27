import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { DashboardLayout } from "@/components/DashboardLayout";
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
import AnaliseSamples from "./pages/AnaliseSamples";
import Publico from "./pages/Publico";
import VisaoExecutivaV2 from "./pages/VisaoExecutivaV2";
import Clientes from "./pages/Clientes";
import ClientePerfil from "./pages/ClientePerfil";
import Reclamacoes from "./pages/Reclamacoes";
import Atendimentos from "./pages/Atendimentos";
import ReclamacaoNova from "./pages/ReclamacaoNova";
import RadarOperacional from "./pages/RadarOperacional";
import KanbanOperacional from "./pages/KanbanOperacional";
import KanbanConciliacao from "./pages/KanbanConciliacao";
import Distribuidores from "./pages/Distribuidores";
import LetsFly from "./pages/LetsFly";
import SiteConversao from "./pages/SiteConversao";
import PaginaInteligente from "./pages/PaginaInteligente";
import ComentariosInstagram from "./pages/ComentariosInstagram";
import KanbanInfluenciadores from "./pages/KanbanInfluenciadores";
import PerformanceInfluenciadores from "./pages/PerformanceInfluenciadores";
import NotFound from "./pages/NotFound";
const queryClient = new QueryClient();

// Layout component for authenticated pages
const AuthenticatedLayout = ({ children }: { children: React.ReactNode }) => (
  <DashboardLayout>{children}</DashboardLayout>
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

          <Route
            path="/visao-executiva-v2"
            element={
              <ProtectedRoute>
                <AuthenticatedLayout>
                  <VisaoExecutivaV2 />
                </AuthenticatedLayout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <AuthenticatedLayout>
                  <ExecutiveDashboard />
                </AuthenticatedLayout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/upload"
            element={
              <ProtectedRoute>
                <AuthenticatedLayout>
                  <AdminRoute>
                    <Upload />
                  </AdminRoute>
                </AuthenticatedLayout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/settings"
            element={
              <ProtectedRoute>
                <AuthenticatedLayout>
                  <Settings />
                </AuthenticatedLayout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/metas"
            element={
              <ProtectedRoute>
                <AuthenticatedLayout>
                  <AdminRoute>
                    <Metas />
                  </AdminRoute>
                </AuthenticatedLayout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/seguidores"
            element={
              <ProtectedRoute>
                <AuthenticatedLayout>
                  <Seguidores />
                </AuthenticatedLayout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/produtos"
            element={
              <ProtectedRoute>
                <AuthenticatedLayout>
                  <Produtos />
                </AuthenticatedLayout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/operacoes"
            element={
              <ProtectedRoute>
                <AuthenticatedLayout>
                  <Operacoes />
                </AuthenticatedLayout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/ads"
            element={
              <ProtectedRoute>
                <AuthenticatedLayout>
                  <Ads />
                </AuthenticatedLayout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/performance-financeira"
            element={
              <ProtectedRoute>
                <AuthenticatedLayout>
                  <PerformanceFinanceira />
                </AuthenticatedLayout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/comportamento-cliente"
            element={
              <ProtectedRoute>
                <AuthenticatedLayout>
                  <ComportamentoCliente />
                </AuthenticatedLayout>
              </ProtectedRoute>
            }
          />

          {/* Redirects de rotas antigas */}
          <Route path="/segmentacao-clientes" element={<Navigate to="/comportamento-cliente" replace />} />
          <Route path="/analise-churn" element={<Navigate to="/comportamento-cliente" replace />} />

          <Route
            path="/analise-samples"
            element={
              <ProtectedRoute>
                <AuthenticatedLayout>
                  <AnaliseSamples />
                </AuthenticatedLayout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/publico"
            element={
              <ProtectedRoute>
                <AuthenticatedLayout>
                  <Publico />
                </AuthenticatedLayout>
              </ProtectedRoute>
            }
          />

          <Route path="/analise-critica" element={<Navigate to="/visao-executiva-v2" replace />} />

          <Route
            path="/clientes"
            element={
              <ProtectedRoute>
                <AuthenticatedLayout>
                  <Clientes />
                </AuthenticatedLayout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/clientes/:cpfCnpj"
            element={
              <ProtectedRoute>
                <AuthenticatedLayout>
                  <ClientePerfil />
                </AuthenticatedLayout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/reclamacoes/nova"
            element={
              <ProtectedRoute>
                <AuthenticatedLayout>
                  <ReclamacaoNova />
                </AuthenticatedLayout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/reclamacoes"
            element={
              <ProtectedRoute>
                <AuthenticatedLayout>
                  <Reclamacoes />
                </AuthenticatedLayout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/atendimentos"
            element={
              <ProtectedRoute>
                <AuthenticatedLayout>
                  <Atendimentos />
                </AuthenticatedLayout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/radar-operacional"
            element={
              <ProtectedRoute>
                <AuthenticatedLayout>
                  <RadarOperacional />
                </AuthenticatedLayout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/kanban-operacional"
            element={
              <ProtectedRoute>
                <AuthenticatedLayout>
                  <KanbanOperacional />
                </AuthenticatedLayout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/kanban-conciliacao"
            element={
              <ProtectedRoute>
                <AuthenticatedLayout>
                  <KanbanConciliacao />
                </AuthenticatedLayout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/distribuidores"
            element={
              <ProtectedRoute>
                <AuthenticatedLayout>
                  <Distribuidores />
                </AuthenticatedLayout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/lets-fly"
            element={
              <ProtectedRoute>
                <AuthenticatedLayout>
                  <LetsFly />
                </AuthenticatedLayout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/site-conversao"
            element={
              <ProtectedRoute>
                <AuthenticatedLayout>
                  <SiteConversao />
                </AuthenticatedLayout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/inteligencia"
            element={
              <ProtectedRoute>
                <AuthenticatedLayout>
                  <PaginaInteligente />
                </AuthenticatedLayout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/comentarios-instagram"
            element={
              <ProtectedRoute>
                <AuthenticatedLayout>
                  <ComentariosInstagram />
                </AuthenticatedLayout>
              </ProtectedRoute>
            }
          />

          {/* Influenciadores */}
          <Route
            path="/influenciadores/kanban"
            element={
              <ProtectedRoute>
                <AuthenticatedLayout>
                  <KanbanInfluenciadores />
                </AuthenticatedLayout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/influenciadores/performance"
            element={
              <ProtectedRoute>
                <AuthenticatedLayout>
                  <PerformanceInfluenciadores />
                </AuthenticatedLayout>
              </ProtectedRoute>
            }
          />

          {/* Catch-all route */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
