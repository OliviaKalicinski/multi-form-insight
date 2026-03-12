import { useState, useEffect, useCallback } from "react";
import { useDashboard } from "@/contexts/DashboardContext";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { SalesUploader } from "@/components/dashboard/SalesUploader";
import { UploadHistory } from "@/components/dashboard/UploadHistory";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Upload as UploadIcon, BarChart3, ShoppingCart, CalendarDays, ExternalLink } from "lucide-react";

const EXTERNAL_LINKS = {
  vendas: "https://erp.olist.com/relatorios_personalizados#/view/4449",
};

export default function Upload() {
  const navigate = useNavigate();
  const { followersData, adsData, salesData, refreshFromDatabase } = useDashboard();

  const [latestDate, setLatestDate] = useState<string | null>(null);

  const fetchLatestDataDate = useCallback(async () => {
    const [salesRes, adsRes, followersRes, marketingRes] = await Promise.all([
      supabase.from("sales_data").select("data_venda").order("data_venda", { ascending: false }).limit(1),
      supabase.from("ads_data").select("data").order("data", { ascending: false }).limit(1),
      supabase.from("followers_data").select("data").order("data", { ascending: false }).limit(1),
      supabase.from("marketing_data").select("data").order("data", { ascending: false }).limit(1),
    ]);

    const dates: string[] = [];
    if (salesRes.data?.[0]?.data_venda) dates.push(salesRes.data[0].data_venda);
    if (adsRes.data?.[0]?.data) dates.push(adsRes.data[0].data);
    if (followersRes.data?.[0]?.data) dates.push(followersRes.data[0].data);
    if (marketingRes.data?.[0]?.data) dates.push(marketingRes.data[0].data);

    if (dates.length > 0) {
      const normalizedDates = dates.map((d) => d.substring(0, 10));
      const maxDate = normalizedDates.sort().reverse()[0];
      const [year, month, day] = maxDate.split("-");
      setLatestDate(`${day}/${month}/${year}`);
    } else {
      setLatestDate(null);
    }
  }, []);

  useEffect(() => {
    fetchLatestDataDate();
  }, [fetchLatestDataDate]);

  const handleUploadComplete = async () => {
    await refreshFromDatabase();
    await fetchLatestDataDate();
    // Recalcular entidade customer após upload de vendas
    try {
      await supabase.rpc("recalculate_all_customers");
    } catch (e) {
      console.warn("Falha ao recalcular clientes:", e);
    }
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
            Faça upload dos arquivos CSV para alimentar o dashboard. Dados de anúncios são sincronizados automaticamente
            via Meta API.
          </p>
        </div>

        {hasAnyData && (
          <Button onClick={() => navigate("/visao-executiva-v2")}>
            <BarChart3 className="h-4 w-4 mr-2" />
            Ver Dashboard
          </Button>
        )}
      </div>

      {/* Latest data date indicator */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <CalendarDays className="h-4 w-4" />
        {latestDate ? (
          <span>
            Dados até: <span className="font-semibold text-foreground">{latestDate}</span>
          </span>
        ) : (
          <span>Nenhum dado importado ainda</span>
        )}
      </div>

      {/* Main Upload Sections */}
      <div className="grid grid-cols-1 gap-6">
        {/* Vendas */}
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <ShoppingCart className="h-5 w-5 text-emerald-500" />
                <CardTitle className="text-base">Vendas</CardTitle>
              </div>
              <div className="flex items-center gap-2">
                {salesData.length > 0 && (
                  <Badge variant="secondary" className="font-normal text-xs">
                    {salesData.length} pedidos
                  </Badge>
                )}
                <a
                  href={EXTERNAL_LINKS.vendas}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
                >
                  Exportar <ExternalLink className="h-3 w-3" />
                </a>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-2">
            <SalesUploader onDataLoaded={handleUploadComplete} />
          </CardContent>
        </Card>
      </div>

      {/* Upload History */}
      <UploadHistory />
    </div>
  );
}
