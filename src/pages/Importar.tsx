import { FileUp, CheckCircle2, Clock } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CSVUploader } from "@/components/dashboard/CSVUploader";
import { FollowersUploader } from "@/components/dashboard/FollowersUploader";
import { AdsUploader } from "@/components/dashboard/AdsUploader";
import { SalesUploader } from "@/components/dashboard/SalesUploader";
import { useDashboard } from "@/contexts/DashboardContext";
import { Badge } from "@/components/ui/badge";

const Importar = () => {
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

  const hasMarketingData = marketingData.length > 0;
  const hasFollowersData = followersData.length > 0;
  const hasAdsData = adsData.length > 0;
  const hasSalesData = salesData.length > 0;

  return (
    <div className="min-h-screen bg-background p-6 space-y-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <FileUp className="w-8 h-8 text-primary" />
            <h1 className="text-4xl font-bold">Importar Dados</h1>
          </div>
          <p className="text-muted-foreground text-lg">
            Faça upload dos arquivos CSV/TSV para visualizar as análises completas do seu negócio.
          </p>
        </div>

        {/* Status Overview */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Status da Importação</CardTitle>
            <CardDescription>Acompanhe quais dados já foram importados</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="flex items-center gap-2">
                {hasMarketingData ? (
                  <CheckCircle2 className="w-5 h-5 text-green-500" />
                ) : (
                  <Clock className="w-5 h-5 text-muted-foreground" />
                )}
                <span className="font-medium">Marketing</span>
                <Badge variant={hasMarketingData ? "default" : "outline"}>
                  {hasMarketingData ? "Importado" : "Pendente"}
                </Badge>
              </div>
              <div className="flex items-center gap-2">
                {hasFollowersData ? (
                  <CheckCircle2 className="w-5 h-5 text-green-500" />
                ) : (
                  <Clock className="w-5 h-5 text-muted-foreground" />
                )}
                <span className="font-medium">Seguidores</span>
                <Badge variant={hasFollowersData ? "default" : "outline"}>
                  {hasFollowersData ? "Importado" : "Pendente"}
                </Badge>
              </div>
              <div className="flex items-center gap-2">
                {hasAdsData ? (
                  <CheckCircle2 className="w-5 h-5 text-green-500" />
                ) : (
                  <Clock className="w-5 h-5 text-muted-foreground" />
                )}
                <span className="font-medium">Meta Ads</span>
                <Badge variant={hasAdsData ? "default" : "outline"}>
                  {hasAdsData ? "Importado" : "Pendente"}
                </Badge>
              </div>
              <div className="flex items-center gap-2">
                {hasSalesData ? (
                  <CheckCircle2 className="w-5 h-5 text-green-500" />
                ) : (
                  <Clock className="w-5 h-5 text-muted-foreground" />
                )}
                <span className="font-medium">Vendas</span>
                <Badge variant={hasSalesData ? "default" : "outline"}>
                  {hasSalesData ? "Importado" : "Pendente"}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Uploaders Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <CSVUploader onDataLoaded={(data) => setMarketingData(data)} />
          <FollowersUploader onDataLoaded={(data) => setFollowersData(data)} />
          <AdsUploader onDataLoaded={(data, fileName, summaries, isHierarchical) => setAdsData(data, summaries, isHierarchical)} />
          <SalesUploader onDataLoaded={(data) => setSalesData(data)} />
        </div>

        {/* Help Card */}
        <Card className="mt-6 border-primary/20 bg-primary/5">
          <CardHeader>
            <CardTitle className="text-lg">💡 Próximos Passos</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              Após importar os dados, navegue pelas diferentes páginas de análise:
            </p>
            <ul className="mt-3 space-y-2 text-sm text-muted-foreground list-disc list-inside">
              <li><strong>Análise Instagram Geral</strong> - Métricas de marketing e crescimento de seguidores</li>
              <li><strong>Análise Meta Ads</strong> - Performance de anúncios pagos no Facebook e Instagram</li>
              <li><strong>Performance Financeira</strong> - Receita, ticket médio e análise de vendas</li>
              <li><strong>Comportamento do Cliente</strong> - Churn, retenção e segmentação</li>
              <li><strong>Produto & Operações</strong> - Volume de vendas, SKUs e operações</li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Importar;
