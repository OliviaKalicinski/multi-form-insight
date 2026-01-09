import { useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  TrendingUp, 
  TrendingDown, 
  Megaphone, 
  DollarSign, 
  MousePointerClick, 
  Eye,
  Target,
  ShoppingCart
} from "lucide-react";
import { useDashboard } from "@/contexts/DashboardContext";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { format, parse } from "date-fns";
import { ptBR } from "date-fns/locale";

interface CampaignDetailModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  campaign: {
    name: string;
    spend: number;
    impressions: number;
    clicks: number;
    conversions: number;
    revenue?: number;
    ctr?: number;
    cpc?: number;
    roas?: number;
  } | null;
}

const COLORS = ["#8b5cf6", "#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#ec4899"];

export function CampaignDetailModal({
  open,
  onOpenChange,
  campaign,
}: CampaignDetailModalProps) {
  const { adsData } = useDashboard();

  // Função para parsear valores numéricos do formato brasileiro
  const parseNumber = (value: string | undefined): number => {
    if (!value) return 0;
    return parseFloat(value.replace(/\./g, '').replace(',', '.')) || 0;
  };

  // Calcular tendência de performance por mês (usando o campo Mês do AdsData)
  const trendData = useMemo(() => {
    if (!campaign || !adsData.length) return [];

    const monthlyData: Record<string, { spend: number; clicks: number; impressions: number; conversions: number }> = {};

    adsData.forEach((ad) => {
      const adName = ad["Nome do anúncio"] || "";
      const conjuntoName = ad["Nome do conjunto de anúncios"] || "";
      
      // Verificar se pertence à campanha (por nome de anúncio ou conjunto)
      if (adName.includes(campaign.name) || conjuntoName.includes(campaign.name) || campaign.name.includes(adName)) {
        const month = ad["Mês"] || "unknown";
        
        if (month !== "unknown") {
          if (!monthlyData[month]) {
            monthlyData[month] = { spend: 0, clicks: 0, impressions: 0, conversions: 0 };
          }
          monthlyData[month].spend += parseNumber(ad["Valor usado (BRL)"]);
          monthlyData[month].clicks += parseNumber(ad["Cliques no link"]);
          monthlyData[month].impressions += parseNumber(ad["Impressões"]);
          monthlyData[month].conversions += parseNumber(ad["Compras"]);
        }
      }
    });

    return Object.entries(monthlyData)
      .map(([month, data]) => {
        let monthLabel = month;
        try {
          monthLabel = format(parse(month, "yyyy-MM", new Date()), "MMM yy", { locale: ptBR });
        } catch {
          // Keep original if parse fails
        }
        return {
          month,
          monthLabel,
          ...data,
          ctr: data.impressions > 0 ? (data.clicks / data.impressions) * 100 : 0,
          cpc: data.clicks > 0 ? data.spend / data.clicks : 0,
        };
      })
      .sort((a, b) => a.month.localeCompare(b.month))
      .slice(-6);
  }, [campaign, adsData]);

  // Calcular métricas por conjunto de anúncios
  const placementData = useMemo(() => {
    if (!campaign || !adsData.length) return [];

    const placements: Record<string, { name: string; spend: number; clicks: number; impressions: number }> = {};

    adsData.forEach((ad) => {
      const adName = ad["Nome do anúncio"] || "";
      const conjuntoName = ad["Nome do conjunto de anúncios"] || "";
      
      if (adName.includes(campaign.name) || conjuntoName.includes(campaign.name) || campaign.name.includes(adName)) {
        const placement = conjuntoName || "Não especificado";
        
        if (!placements[placement]) {
          placements[placement] = { name: placement, spend: 0, clicks: 0, impressions: 0 };
        }
        placements[placement].spend += parseNumber(ad["Valor usado (BRL)"]);
        placements[placement].clicks += parseNumber(ad["Cliques no link"]);
        placements[placement].impressions += parseNumber(ad["Impressões"]);
      }
    });

    return Object.values(placements).sort((a, b) => b.spend - a.spend);
  }, [campaign, adsData]);

  // Calcular métricas calculadas
  const metrics = useMemo(() => {
    if (!campaign) return null;

    const ctr = campaign.impressions > 0 
      ? (campaign.clicks / campaign.impressions) * 100 
      : campaign.ctr || 0;
    
    const cpc = campaign.clicks > 0 
      ? campaign.spend / campaign.clicks 
      : campaign.cpc || 0;
    
    const cpa = campaign.conversions > 0 
      ? campaign.spend / campaign.conversions 
      : 0;
    
    const roas = campaign.roas || (campaign.revenue && campaign.spend > 0 
      ? campaign.revenue / campaign.spend 
      : 0);

    return { ctr, cpc, cpa, roas };
  }, [campaign]);

  if (!campaign) return null;

  const formatCurrency = (value: number) => 
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);

  const formatNumber = (value: number) => 
    new Intl.NumberFormat("pt-BR").format(value);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Megaphone className="h-5 w-5" />
            {campaign.name}
          </DialogTitle>
          <DialogDescription>
            Análise detalhada da campanha
          </DialogDescription>
        </DialogHeader>

        {/* Cards de resumo */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 my-4">
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                <DollarSign className="h-4 w-4" />
                Investimento
              </div>
              <div className="text-2xl font-bold">
                {formatCurrency(campaign.spend)}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                <Eye className="h-4 w-4" />
                Impressões
              </div>
              <div className="text-2xl font-bold">
                {formatNumber(campaign.impressions)}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                <MousePointerClick className="h-4 w-4" />
                Cliques
              </div>
              <div className="text-2xl font-bold">
                {formatNumber(campaign.clicks)}
              </div>
              <div className="text-xs text-muted-foreground">
                CTR: {metrics?.ctr.toFixed(2)}%
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                <ShoppingCart className="h-4 w-4" />
                Conversões
              </div>
              <div className="text-2xl font-bold">
                {formatNumber(campaign.conversions)}
              </div>
              {metrics?.roas ? (
                <Badge variant={metrics.roas >= 3 ? "default" : metrics.roas >= 2 ? "secondary" : "destructive"}>
                  ROAS: {metrics.roas.toFixed(2)}x
                </Badge>
              ) : null}
            </CardContent>
          </Card>
        </div>

        {/* Métricas secundárias */}
        <div className="grid grid-cols-3 gap-4 mb-4">
          <Card className="bg-muted/30">
            <CardContent className="pt-4 text-center">
              <div className="text-sm text-muted-foreground mb-1">CPC</div>
              <div className="text-xl font-semibold">{formatCurrency(metrics?.cpc || 0)}</div>
            </CardContent>
          </Card>
          <Card className="bg-muted/30">
            <CardContent className="pt-4 text-center">
              <div className="text-sm text-muted-foreground mb-1">CPA</div>
              <div className="text-xl font-semibold">{formatCurrency(metrics?.cpa || 0)}</div>
            </CardContent>
          </Card>
          <Card className="bg-muted/30">
            <CardContent className="pt-4 text-center">
              <div className="text-sm text-muted-foreground mb-1">CPM</div>
              <div className="text-xl font-semibold">
                {formatCurrency(campaign.impressions > 0 ? (campaign.spend / campaign.impressions) * 1000 : 0)}
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="trend" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="trend">📈 Tendência</TabsTrigger>
            <TabsTrigger value="breakdown">📊 Breakdown</TabsTrigger>
          </TabsList>

          <TabsContent value="trend" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Performance nos Últimos 6 Meses</CardTitle>
              </CardHeader>
              <CardContent>
                {trendData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={250}>
                    <LineChart data={trendData}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis dataKey="monthLabel" className="text-xs" />
                      <YAxis className="text-xs" />
                      <Tooltip
                        formatter={(value: number, name: string) => {
                          switch (name) {
                            case "spend": return [formatCurrency(value), "Investimento"];
                            case "clicks": return [formatNumber(value), "Cliques"];
                            case "conversions": return [formatNumber(value), "Conversões"];
                            default: return [value, name];
                          }
                        }}
                        contentStyle={{
                          backgroundColor: "hsl(var(--background))",
                          border: "1px solid hsl(var(--border))",
                          borderRadius: "8px",
                        }}
                      />
                      <Line
                        type="monotone"
                        dataKey="clicks"
                        stroke="hsl(var(--primary))"
                        strokeWidth={2}
                        dot={{ fill: "hsl(var(--primary))" }}
                      />
                      <Line
                        type="monotone"
                        dataKey="conversions"
                        stroke="#10b981"
                        strokeWidth={2}
                        dot={{ fill: "#10b981" }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="text-center text-muted-foreground py-8">
                    Sem dados de tendência disponíveis
                  </p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="breakdown" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Distribuição por Plataforma/Placement</CardTitle>
              </CardHeader>
              <CardContent>
                {placementData.length > 0 ? (
                  <div className="grid md:grid-cols-2 gap-6">
                    <ResponsiveContainer width="100%" height={200}>
                      <PieChart>
                        <Pie
                          data={placementData}
                          cx="50%"
                          cy="50%"
                          innerRadius={40}
                          outerRadius={80}
                          dataKey="spend"
                          nameKey="name"
                          label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                          labelLine={false}
                        >
                          {placementData.map((_, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip
                          formatter={(value: number) => formatCurrency(value)}
                          contentStyle={{
                            backgroundColor: "hsl(var(--background))",
                            border: "1px solid hsl(var(--border))",
                            borderRadius: "8px",
                          }}
                        />
                      </PieChart>
                    </ResponsiveContainer>

                    <div className="space-y-2">
                      {placementData.map((placement, index) => (
                        <div
                          key={placement.name}
                          className="flex items-center justify-between p-2 bg-muted/50 rounded-lg"
                        >
                          <div className="flex items-center gap-2">
                            <div
                              className="w-3 h-3 rounded-full"
                              style={{ backgroundColor: COLORS[index % COLORS.length] }}
                            />
                            <span className="text-sm font-medium truncate max-w-[120px]">
                              {placement.name}
                            </span>
                          </div>
                          <span className="text-sm font-semibold">
                            {formatCurrency(placement.spend)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <p className="text-center text-muted-foreground py-8">
                    Sem dados de breakdown disponíveis
                  </p>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
