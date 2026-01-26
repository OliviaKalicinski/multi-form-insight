import { useDashboard } from "@/contexts/DashboardContext";
import { useNavigate } from "react-router-dom";
import { CSVUploader } from "@/components/dashboard/CSVUploader";
import { FollowersUploader } from "@/components/dashboard/FollowersUploader";
import { AdsUploader } from "@/components/dashboard/AdsUploader";
import { SalesUploader } from "@/components/dashboard/SalesUploader";
import { AudienceUploader } from "@/components/dashboard/AudienceUploader";
import { UploadHistory } from "@/components/dashboard/UploadHistory";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Upload as UploadIcon, 
  BarChart3
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

      {/* Upload Sections */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center justify-between">
              <span>Vendas</span>
              {salesData.length > 0 && (
                <Badge variant="secondary" className="font-normal text-xs">
                  {salesData.length}
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-2">
            <SalesUploader onDataLoaded={handleUploadComplete} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center justify-between">
              <span>Anúncios (Meta)</span>
              {adsData.length > 0 && (
                <Badge variant="secondary" className="font-normal text-xs">
                  {adsData.length}
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-2">
            <AdsUploader onDataLoaded={handleUploadComplete} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center justify-between">
              <span>Seguidores</span>
              {followersData.length > 0 && (
                <Badge variant="secondary" className="font-normal text-xs">
                  {followersData.length}
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-2">
            <FollowersUploader onDataLoaded={handleUploadComplete} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center justify-between">
              <span>Marketing</span>
              {marketingData.length > 0 && (
                <Badge variant="secondary" className="font-normal text-xs">
                  {marketingData.length}
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-2">
            <CSVUploader onDataLoaded={handleUploadComplete} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center justify-between">
              <span>Público</span>
              {audienceData && (
                <Badge variant="secondary" className="font-normal text-xs">
                  ✓
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-2">
            <AudienceUploader onDataLoaded={setAudienceData} />
          </CardContent>
        </Card>
      </div>

      {/* Upload History */}
      <UploadHistory />
    </div>
  );
}
