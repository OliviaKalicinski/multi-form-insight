import { Link } from "react-router-dom";
import { TrendingUp, Users, Target, ShoppingCart, BarChart3, Package, UserCheck, DollarSign } from "lucide-react";
import { CSVUploader } from "@/components/dashboard/CSVUploader";
import { FollowersUploader } from "@/components/dashboard/FollowersUploader";
import { AdsUploader } from "@/components/dashboard/AdsUploader";
import { SalesUploader } from "@/components/dashboard/SalesUploader";
import { MarketingData, FollowersData, AdsData, ProcessedOrder } from "@/types/marketing";
import { useDashboard } from "@/contexts/DashboardContext";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const Index = () => {
  const {
    marketingData,
    followersData,
    adsData,
    salesData,
    setMarketingData,
    setFollowersData,
    setAdsData,
    setSalesData,
  } = useDashboard();

  const handleDataLoaded = (data: MarketingData[]) => setMarketingData(data);
  const handleFollowersDataLoaded = (data: FollowersData[]) => setFollowersData(data);
  const handleAdsDataLoaded = (data: AdsData[]) => setAdsData(data);
  const handleSalesDataLoaded = (data: ProcessedOrder[]) => setSalesData(data);

  const hasAnyData = marketingData.length > 0 || followersData.length > 0 || adsData.length > 0 || salesData.length > 0;

  return (
    <div className="container mx-auto p-6 space-y-8">
      <div className="flex flex-col gap-2">
        <h1 className="text-4xl font-bold text-foreground">Dashboard de Marketing</h1>
        <p className="text-muted-foreground">Importe suas planilhas para visualizar métricas e análises detalhadas</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <CSVUploader onDataLoaded={handleDataLoaded} />
        <FollowersUploader onDataLoaded={handleFollowersDataLoaded} />
        <AdsUploader onDataLoaded={handleAdsDataLoaded} />
        <SalesUploader onDataLoaded={handleSalesDataLoaded} />
      </div>

      {!hasAnyData && (
        <Card className="border-dashed">
          <CardHeader>
            <CardTitle>Bem-vindo ao Dashboard</CardTitle>
            <CardDescription>Comece importando suas planilhas acima. Após o upload, você poderá visualizar todas as métricas e análises nas páginas específicas.</CardDescription>
          </CardHeader>
        </Card>
      )}

      {hasAnyData && (
        <div className="space-y-4">
          <h2 className="text-2xl font-semibold text-foreground">Acesse suas análises</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <Link to="/seguidores">
              <Card className="hover:shadow-lg transition-all duration-300 cursor-pointer border-primary/20 hover:border-primary/40">
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <Users className="h-8 w-8 text-primary" />
                    <div>
                      <CardTitle>Seguidores</CardTitle>
                      <CardDescription>Análise completa de crescimento e métricas gerais</CardDescription>
                    </div>
                  </div>
                </CardHeader>
              </Card>
            </Link>
            {adsData.length > 0 && (
              <Link to="/ads">
                <Card className="hover:shadow-lg transition-all duration-300 cursor-pointer border-primary/20 hover:border-primary/40">
                  <CardHeader>
                    <div className="flex items-center gap-3">
                      <Target className="h-8 w-8 text-primary" />
                      <div>
                        <CardTitle>Anúncios</CardTitle>
                        <CardDescription>Performance detalhada de campanhas</CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                </Card>
              </Link>
            )}
            {salesData.length > 0 && (
              <>
                <Link to="/volume">
                  <Card className="hover:shadow-lg transition-all duration-300 cursor-pointer border-primary/20 hover:border-primary/40">
                    <CardHeader>
                      <div className="flex items-center gap-3">
                        <Package className="h-8 w-8 text-primary" />
                        <div>
                          <CardTitle>Volume</CardTitle>
                          <CardDescription>Produtos, SKUs e operações</CardDescription>
                        </div>
                      </div>
                    </CardHeader>
                  </Card>
                </Link>
                <Link to="/comportamento-cliente">
                  <Card className="hover:shadow-lg transition-all duration-300 cursor-pointer border-primary/20 hover:border-primary/40">
                    <CardHeader>
                      <div className="flex items-center gap-3">
                        <UserCheck className="h-8 w-8 text-primary" />
                        <div>
                          <CardTitle>Comportamento do Cliente</CardTitle>
                          <CardDescription>Segmentação e análise de churn</CardDescription>
                        </div>
                      </div>
                    </CardHeader>
                  </Card>
                </Link>
                <Link to="/performance-financeira">
                  <Card className="hover:shadow-lg transition-all duration-300 cursor-pointer border-primary/20 hover:border-primary/40">
                    <CardHeader>
                      <div className="flex items-center gap-3">
                        <DollarSign className="h-8 w-8 text-primary" />
                        <div>
                          <CardTitle>Performance Financeira</CardTitle>
                          <CardDescription>Faturamento e tendências</CardDescription>
                        </div>
                      </div>
                    </CardHeader>
                  </Card>
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Index;
