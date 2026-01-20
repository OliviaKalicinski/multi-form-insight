import { Link } from "react-router-dom";
import { Users, DollarSign, ShoppingCart, Target } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CSVUploader } from "@/components/dashboard/CSVUploader";
import { FollowersUploader } from "@/components/dashboard/FollowersUploader";
import { AdsUploader } from "@/components/dashboard/AdsUploader";
import { SalesUploader } from "@/components/dashboard/SalesUploader";
import { useDashboard } from "@/contexts/DashboardContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const Index = () => {
  const {
    setMarketingData,
    setFollowersData,
    setAdsData,
    setSalesData,
  } = useDashboard();

  const handleMarketingDataLoaded = (data: any[], fileName: string) => {
    setMarketingData(data);
  };

  const handleFollowersDataLoaded = (data: any[], fileName: string) => {
    setFollowersData(data);
  };

  const handleAdsDataLoaded = (data: any[], fileName: string, summaries?: any[], isHierarchical?: boolean) => {
    setAdsData(data, summaries, isHierarchical);
  };

  const handleSalesDataLoaded = (data: any[], fileName: string) => {
    setSalesData(data);
  };

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-bold text-foreground">Uploader de Dados</h1>
          <p className="text-muted-foreground">Carregue seus arquivos CSV para análise</p>
        </div>

        {/* Uploaders Section */}
        <div className="grid gap-4 md:grid-cols-2">
          <CSVUploader 
            onDataLoaded={handleMarketingDataLoaded}
            title="📊 Dados de Marketing"
            description="Faça upload do relatório CSV do Instagram"
          />
          
          <FollowersUploader 
            onDataLoaded={handleFollowersDataLoaded}
            title="👥 Dados de Seguidores"
            description="Faça upload do CSV de crescimento de seguidores"
          />
          
          <AdsUploader 
            onDataLoaded={handleAdsDataLoaded}
            title="💰 Dados de Anúncios"
            description="Faça upload dos dados de campanhas publicitárias"
          />
          
          <SalesUploader 
            onDataLoaded={handleSalesDataLoaded}
            title="🛍️ Dados de Vendas"
            description="Faça upload dos dados de vendas do e-commerce"
          />
        </div>

        {/* Quick Links */}
        <Card>
          <CardHeader>
            <CardTitle>🚀 Acesso Rápido às Análises</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-4">
              <Link to="/seguidores">
                <Button className="w-full" variant="outline">
                  <Users className="mr-2 h-4 w-4" />
                  Ver Análise do Instagram
                </Button>
              </Link>
              <Link to="/ads">
                <Button className="w-full" variant="outline">
                  <DollarSign className="mr-2 h-4 w-4" />
                  Ver Análise de Anúncios
                </Button>
              </Link>
              <Link to="/produtos">
                <Button className="w-full" variant="outline">
                  <ShoppingCart className="mr-2 h-4 w-4" />
                  Ver Análise de Volume
                </Button>
              </Link>
              <Link to="/comportamento-cliente">
                <Button className="w-full" variant="outline">
                  <Target className="mr-2 h-4 w-4" />
                  Ver Comportamento do Cliente
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Index;
