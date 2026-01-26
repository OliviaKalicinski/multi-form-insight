import { useDashboard } from "@/contexts/DashboardContext";
import { useNavigate } from "react-router-dom";
import { InstagramMetricsUploader } from "@/components/dashboard/InstagramMetricsUploader";
import { AdsUploader } from "@/components/dashboard/AdsUploader";
import { SalesUploader } from "@/components/dashboard/SalesUploader";
import { AudienceUploader } from "@/components/dashboard/AudienceUploader";
import { UploadHistory } from "@/components/dashboard/UploadHistory";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Upload as UploadIcon, 
  BarChart3,
  Instagram,
  TrendingUp,
  ShoppingCart,
  Users
} from "lucide-react";

export default function Upload() {
  const navigate = useNavigate();
  const { 
    marketingData, 
    followersData, 
    adsData, 
    salesData,
    audienceData,
    setAudienceData,
    refreshFromDatabase
  } = useDashboard();

  // Os uploaders já usam persist* internamente e fazem merge.
  // Após o upload, sincronizamos o estado local com o banco.
  const handleUploadComplete = async () => {
    await refreshFromDatabase();
  };

  const hasAnyData = salesData.length > 0 || adsData.length > 0 || followersData.length > 0;

  // Count total Instagram metrics (marketing + followers)
  const instagramMetricsCount = marketingData.length + followersData.length;

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

      {/* Main Upload Sections */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Instagram Metrics - Featured */}
        <Card className="lg:col-span-1 border-primary/20">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500">
                  <Instagram className="h-5 w-5 text-white" />
                </div>
                <div>
                  <CardTitle className="text-lg">Métricas do Instagram</CardTitle>
                  <CardDescription>Upload múltiplo de CSVs do Instagram</CardDescription>
                </div>
              </div>
              {instagramMetricsCount > 0 && (
                <Badge variant="secondary" className="font-normal">
                  {instagramMetricsCount} registros
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <InstagramMetricsUploader onUploadComplete={handleUploadComplete} />
          </CardContent>
        </Card>

        {/* Other Uploads */}
        <div className="space-y-4">
          {/* Vendas */}
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <ShoppingCart className="h-5 w-5 text-emerald-500" />
                  <CardTitle className="text-base">Vendas</CardTitle>
                </div>
                {salesData.length > 0 && (
                  <Badge variant="secondary" className="font-normal text-xs">
                    {salesData.length} pedidos
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent className="pt-2">
              <SalesUploader onDataLoaded={handleUploadComplete} />
            </CardContent>
          </Card>

          {/* Anúncios */}
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <TrendingUp className="h-5 w-5 text-blue-500" />
                  <CardTitle className="text-base">Anúncios (Meta)</CardTitle>
                </div>
                {adsData.length > 0 && (
                  <Badge variant="secondary" className="font-normal text-xs">
                    {adsData.length} registros
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent className="pt-2">
              <AdsUploader onDataLoaded={handleUploadComplete} />
            </CardContent>
          </Card>

          {/* Público */}
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Users className="h-5 w-5 text-orange-500" />
                  <CardTitle className="text-base">Público</CardTitle>
                </div>
                {audienceData && (
                  <Badge variant="secondary" className="font-normal text-xs">
                    ✓
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent className="pt-2">
              <AudienceUploader onDataLoaded={setAudienceData} />
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Upload History */}
      <UploadHistory />
    </div>
  );
}
