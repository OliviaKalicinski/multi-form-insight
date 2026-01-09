import { useDashboard } from "@/contexts/DashboardContext";
import { useNavigate } from "react-router-dom";
import { CSVUploader } from "@/components/dashboard/CSVUploader";
import { FollowersUploader } from "@/components/dashboard/FollowersUploader";
import { AdsUploader } from "@/components/dashboard/AdsUploader";
import { SalesUploader } from "@/components/dashboard/SalesUploader";
import { UploadHistory } from "@/components/dashboard/UploadHistory";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Upload as UploadIcon, 
  FileSpreadsheet, 
  CheckCircle2, 
  XCircle,
  ArrowRight,
  BarChart3,
  Trash2
} from "lucide-react";

export default function Upload() {
  const navigate = useNavigate();
  const { 
    marketingData, 
    setMarketingData, 
    followersData, 
    setFollowersData, 
    adsData, 
    setAdsData,
    salesData,
    setSalesData,
    clearAdsData 
  } = useDashboard();

  const dataSources = [
    {
      name: "Dados de Vendas",
      data: salesData,
      icon: FileSpreadsheet,
      description: "CSV com pedidos do e-commerce",
      pages: ["Performance Financeira", "Comportamento Cliente", "Produtos", "Análise Crítica"],
    },
    {
      name: "Dados de Anúncios",
      data: adsData,
      icon: FileSpreadsheet,
      description: "CSV do Meta Ads Manager",
      pages: ["Anúncios", "Análise Crítica", "Performance Financeira (ROAS)"],
    },
    {
      name: "Dados de Seguidores",
      data: followersData,
      icon: FileSpreadsheet,
      description: "CSV de seguidores Instagram",
      pages: ["Instagram"],
    },
    {
      name: "Dados de Marketing",
      data: marketingData,
      icon: FileSpreadsheet,
      description: "CSV de marketing geral (opcional)",
      pages: ["Marketing"],
    },
  ];

  const hasAnyData = salesData.length > 0 || adsData.length > 0 || followersData.length > 0;

  return (
    <div className="container mx-auto px-6 py-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <UploadIcon className="h-8 w-8" />
            Upload de Dados
          </h1>
          <p className="text-muted-foreground mt-1">
            Faça upload dos arquivos CSV para alimentar o dashboard
          </p>
        </div>
        
        {hasAnyData && (
          <Button onClick={() => navigate('/dashboard')}>
            <BarChart3 className="h-4 w-4 mr-2" />
            Ver Dashboard
          </Button>
        )}
      </div>

      {/* Status Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Status dos Dados</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {dataSources.map(source => (
              <div 
                key={source.name}
                className="flex items-start gap-3 p-3 rounded-lg border bg-card"
              >
                <div className={`mt-0.5 ${source.data.length > 0 ? 'text-emerald-500' : 'text-muted-foreground'}`}>
                  {source.data.length > 0 ? (
                    <CheckCircle2 className="h-5 w-5" />
                  ) : (
                    <XCircle className="h-5 w-5" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm">{source.name}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    {source.data.length > 0 ? (
                      <span className="text-emerald-600">{source.data.length} registros</span>
                    ) : (
                      "Não carregado"
                    )}
                  </div>
                  <div className="flex flex-wrap gap-1 mt-2">
                    {source.pages.slice(0, 2).map(page => (
                      <Badge key={page} variant="outline" className="text-[10px] px-1.5 py-0">
                        {page}
                      </Badge>
                    ))}
                    {source.pages.length > 2 && (
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                        +{source.pages.length - 2}
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Upload Sections */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center justify-between">
              Dados de Vendas
              {salesData.length > 0 && (
                <Badge variant="secondary" className="font-normal">
                  {salesData.length} registros
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <SalesUploader onDataLoaded={setSalesData} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center justify-between">
              <span>Dados de Anúncios (Meta Ads)</span>
              <div className="flex items-center gap-2">
                {adsData.length > 0 && (
                  <>
                    <Badge variant="secondary" className="font-normal">
                      {adsData.length} registros
                    </Badge>
                    <Button 
                      variant="destructive" 
                      size="sm"
                      onClick={clearAdsData}
                    >
                      <Trash2 className="h-4 w-4 mr-1" />
                      Limpar
                    </Button>
                  </>
                )}
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <AdsUploader onDataLoaded={(data, _fileName, summaries, isHierarchical) => setAdsData(data, summaries, isHierarchical)} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center justify-between">
              Dados de Seguidores
              {followersData.length > 0 && (
                <Badge variant="secondary" className="font-normal">
                  {followersData.length} registros
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <FollowersUploader onDataLoaded={setFollowersData} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center justify-between">
              Dados de Marketing (Opcional)
              {marketingData.length > 0 && (
                <Badge variant="secondary" className="font-normal">
                  {marketingData.length} registros
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <CSVUploader onDataLoaded={setMarketingData} />
          </CardContent>
        </Card>
      </div>

      {/* Upload History */}
      <UploadHistory />

      {/* Quick Links when data is loaded */}
      {hasAnyData && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Acesso Rápido às Análises</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {salesData.length > 0 && (
                <>
                  <Button variant="outline" onClick={() => navigate('/dashboard')}>
                    Visão Executiva <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                  <Button variant="outline" onClick={() => navigate('/performance-financeira')}>
                    Performance <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                  <Button variant="outline" onClick={() => navigate('/comportamento-cliente')}>
                    Clientes <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                  <Button variant="outline" onClick={() => navigate('/volume')}>
                    Produtos <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                </>
              )}
              {adsData.length > 0 && (
                <Button variant="outline" onClick={() => navigate('/ads')}>
                  Anúncios <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              )}
              {followersData.length > 0 && (
                <Button variant="outline" onClick={() => navigate('/seguidores')}>
                  Instagram <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
