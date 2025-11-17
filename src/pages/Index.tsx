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
          <h1 className="text-4xl font-bold text-foreground">Dashboard de Marketing</h1>
          <p className="text-muted-foreground">Análise completa das suas métricas</p>
        </div>

        {/* Uploaders Section */}
        <div className="grid gap-6">
          <Card>
            <CardHeader>
              <CardTitle>📊 Dados de Marketing</CardTitle>
              <CardDescription>
                Faça upload do relatório CSV do Instagram
              </CardDescription>
            </CardHeader>
            <CardContent>
              <CSVUploader onDataLoaded={handleMarketingDataLoaded} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>👥 Dados de Seguidores</CardTitle>
              <CardDescription>
                Faça upload do CSV de crescimento de seguidores
              </CardDescription>
            </CardHeader>
            <CardContent>
              <FollowersUploader onDataLoaded={handleFollowersDataLoaded} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>💰 Dados de Anúncios</CardTitle>
              <CardDescription>
                Faça upload dos dados de campanhas publicitárias
              </CardDescription>
            </CardHeader>
            <CardContent>
              <AdsUploader onDataLoaded={handleAdsDataLoaded} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>🛍️ Dados de Vendas</CardTitle>
              <CardDescription>
                Faça upload dos dados de vendas do e-commerce
              </CardDescription>
            </CardHeader>
            <CardContent>
              <SalesUploader onDataLoaded={handleSalesDataLoaded} />
            </CardContent>
          </Card>
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
                  Ver Análise de Seguidores
                </Button>
              </Link>
              <Link to="/ads">
                <Button className="w-full" variant="outline">
                  <DollarSign className="mr-2 h-4 w-4" />
                  Ver Análise de Anúncios
                </Button>
              </Link>
              <Link to="/volume">
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
