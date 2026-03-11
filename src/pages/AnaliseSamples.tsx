import { useMemo } from "react";
import { useDashboard } from "@/contexts/DashboardContext";
import { filterOrdersByDateRange, formatCurrency } from "@/utils/salesCalculator";
import { calculateAllSampleMetrics, calculateDataPeriod, isSampleProduct } from "@/utils/samplesAnalyzer";
import { format } from "date-fns";
import { ComparisonMetricCard } from "@/components/dashboard/ComparisonMetricCard";
import { ConversionFunnelChart } from "@/components/dashboard/ConversionFunnelChart";
import { SampleProductsTable } from "@/components/dashboard/SampleProductsTable";
import { CustomerSegmentationChart } from "@/components/dashboard/CustomerSegmentationChart";
import { StatusMetricCard, getStatusFromBenchmark } from "@/components/dashboard/StatusMetricCard";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import {
  Package,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Clock,
  Users,
  ShoppingCart,
  ShoppingBag,
  Target,
  Calendar,
  Percent,
  ArrowRight,
  Info,
  AlertTriangle,
} from "lucide-react";
import { PET_PROFILE_ORDER, PET_PROFILE_LABELS, PET_PROFILE_COLORS, BuyerPetProfile } from "@/data/operationalProducts";
import { cn } from "@/lib/utils";

const AnaliseSamples = () => {
  const { salesData, dateRange, comparisonDateRange, comparisonMode } = useDashboard();

  const filteredOrders = useMemo(() => {
    if (salesData.length === 0) return [];
    return dateRange ? filterOrdersByDateRange(salesData, dateRange.start, dateRange.end) : salesData;
  }, [salesData, dateRange]);

  const metrics = useMemo(() => {
    if (filteredOrders.length === 0) return null;
    return calculateAllSampleMetrics(filteredOrders, salesData);
  }, [filteredOrders, salesData]);

  const dataPeriod = useMemo(() => {
    if (filteredOrders.length === 0) return null;
    return calculateDataPeriod(filteredOrders);
  }, [filteredOrders]);

  const comparisonMetrics = useMemo(() => {
    if (!comparisonMode || !comparisonDateRange || salesData.length === 0) return null;
    const periods = [
      { range: dateRange, label: "Período A" },
      { range: comparisonDateRange, label: "Período B" },
    ].filter((p) => p.range);
    return periods.map(({ range, label }) => {
      const orders = filterOrdersByDateRange(salesData, range!.start, range!.end);
      return {
        month: label.toLowerCase().replace(" ", "-"),
        label,
        metrics: calculateAllSampleMetrics(orders, salesData),
      };
    });
  }, [comparisonMode, comparisonDateRange, dateRange, salesData]);

  // Calcular estatísticas de diagnóstico
  const diagnosticStats = useMemo(() => {
    if (filteredOrders.length === 0) return null;

    const allProducts = filteredOrders.flatMap((o) => o.produtos);
    const sampleProducts = allProducts.filter((p) => isSampleProduct(p));
    const uniqueSampleNames = [...new Set(sampleProducts.map((p) => p.descricaoAjustada || p.descricao))];

    return {
      totalOrders: filteredOrders.length,
      totalProducts: allProducts.length,
      sampleProducts: sampleProducts.length,
      uniqueSampleNames: uniqueSampleNames.slice(0, 5),
    };
  }, [filteredOrders]);

  // Verificar se há dados reais (não apenas metrics não-nulo)
  const hasData = metrics && metrics.volume.uniqueCustomers > 0;

  if (!hasData) {
    return (
      <div className="container mx-auto p-6 space-y-6">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold text-foreground">🎁 Análise de Clientes que Iniciaram com Amostras</h1>
          <p className="text-muted-foreground">
            Análise de clientes cujo primeiro pedido foi apenas amostra (sem produto regular)
          </p>
        </div>

        <Alert variant="default" className="border-amber-500/50 bg-amber-500/10">
          <AlertTriangle className="h-4 w-4 text-amber-500" />
          <AlertTitle className="text-amber-600">Nenhum cliente qualificado encontrado</AlertTitle>
          <AlertDescription className="space-y-3">
            <p>
              Não foram encontrados clientes cujo <strong>primeiro pedido</strong> foi exclusivamente de amostras no
              período selecionado.
            </p>

            {diagnosticStats && (
              <div className="bg-background/50 rounded-lg p-3 space-y-2">
                <p className="text-sm font-medium">📊 Diagnóstico do período:</p>
                <ul className="text-sm space-y-1 ml-4">
                  <li>
                    • Pedidos analisados: <strong>{diagnosticStats.totalOrders}</strong>
                  </li>
                  <li>
                    • Produtos de amostra identificados: <strong>{diagnosticStats.sampleProducts}</strong>
                  </li>
                  {diagnosticStats.uniqueSampleNames.length > 0 && (
                    <li>• Exemplos: {diagnosticStats.uniqueSampleNames.join(", ")}</li>
                  )}
                </ul>
              </div>
            )}

            <div className="bg-muted/50 rounded-lg p-3 space-y-2">
              <p className="text-sm font-medium">ℹ️ Critérios de identificação de amostras:</p>
              <ul className="text-sm space-y-1 ml-4">
                <li>• Preço do produto até R$ 1,00</li>
                <li>• OU nome contém: amostra, sample, brinde, degustação, teste, grátis</li>
              </ul>
              <p className="text-sm mt-2">
                <strong>Cliente qualificado:</strong> primeiro pedido deve conter APENAS produtos de amostra.
              </p>
            </div>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  // Preparar dados de segmentação para o gráfico
  const segmentationData = [
    {
      segment: "Primeira Compra" as const,
      count: metrics.segmentation.oneTime,
      percentage:
        metrics.volume.uniqueCustomers > 0 ? (metrics.segmentation.oneTime / metrics.volume.uniqueCustomers) * 100 : 0,
      totalRevenue: 0,
      totalOrders: 0,
      ticketMedio: 0,
      arpu: 0,
      criteria: "1 compra apenas",
    },
    {
      segment: "Recorrente" as const,
      count: metrics.segmentation.explorers,
      percentage:
        metrics.volume.uniqueCustomers > 0
          ? (metrics.segmentation.explorers / metrics.volume.uniqueCustomers) * 100
          : 0,
      totalRevenue: 0,
      totalOrders: 0,
      ticketMedio: 0,
      arpu: 0,
      criteria: "1-2 recompras regulares",
    },
    {
      segment: "VIP" as const,
      count: metrics.segmentation.loyal,
      percentage:
        metrics.volume.uniqueCustomers > 0 ? (metrics.segmentation.loyal / metrics.volume.uniqueCustomers) * 100 : 0,
      totalRevenue: 0,
      totalOrders: 0,
      ticketMedio: 0,
      arpu: 0,
      criteria: "4+ compras",
    },
  ];

  // Benchmark de 25% para taxa de recompra
  const REPURCHASE_BENCHMARK = 25;
  const repurchaseRate = metrics.repurchase.repurchaseRate;
  const benchmarkProgress = Math.min((repurchaseRate / REPURCHASE_BENCHMARK) * 100, 150);

  // Determinar status baseado na taxa
  const getRepurchaseStatus = (rate: number) => {
    if (rate >= 35) return "success";
    if (rate >= 25) return "neutral";
    if (rate >= 15) return "warning";
    return "danger";
  };

  const repurchaseStatus = getRepurchaseStatus(repurchaseRate);

  // Interpretação contextual
  const getInterpretation = (rate: number) => {
    if (rate >= 35)
      return {
        text: "🎯 Excelente! Taxa muito acima da média do mercado.",
        color: "bg-emerald-50 text-emerald-700 border-emerald-200",
      };
    if (rate >= 25)
      return {
        text: "✅ Bom desempenho, dentro do esperado para e-commerce.",
        color: "bg-blue-50 text-blue-700 border-blue-200",
      };
    if (rate >= 15)
      return {
        text: "⚠️ Abaixo da média, avaliar qualidade das amostras e follow-up.",
        color: "bg-amber-50 text-amber-700 border-amber-200",
      };
    return {
      text: "🚨 Taxa crítica, revisar estratégia de amostras urgentemente.",
      color: "bg-red-50 text-red-700 border-red-200",
    };
  };

  const interpretation = getInterpretation(repurchaseRate);

  return (
    <div className="container mx-auto p-4 space-y-4">
      {/* Header Compacto */}
      <div className="space-y-1">
        <h1 className="text-2xl font-bold text-foreground">🎁 Análise de Amostras</h1>
        <p className="text-sm text-muted-foreground">
          Clientes cujo primeiro pedido foi apenas amostra (sem produto regular)
          {dataPeriod && (
            <span className="ml-2 text-xs">
              • {format(dataPeriod.startDate, "dd/MM/yyyy")} até {format(dataPeriod.endDate, "dd/MM/yyyy")}
            </span>
          )}
        </p>
      </div>

      {/* Alertas de Contexto - Compactos */}
      <div className="flex flex-wrap gap-2">
        {dataPeriod && dataPeriod.isShortPeriod && (
          <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
            <Calendar className="h-3 w-3 mr-1" />
            Período curto: {dataPeriod.totalMonths} {dataPeriod.totalMonths === 1 ? "mês" : "meses"}
          </Badge>
        )}
      </div>

      {/* LINHA 1: Card Principal (40%) + Satélites (60%) */}
      {comparisonMode && comparisonMetrics ? (
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
          <ComparisonMetricCard
            title="Clientes Qualificados"
            icon={Users}
            metrics={comparisonMetrics.map((m) => ({
              value: m.metrics.volume.uniqueCustomers,
              month: m.month,
              monthLabel: m.label,
              color: "hsl(var(--primary))",
            }))}
          />
          <ComparisonMetricCard
            title="Taxa de Recompra"
            icon={TrendingUp}
            metrics={comparisonMetrics.map((m) => ({
              value: m.metrics.repurchase.repurchaseRate,
              month: m.month,
              monthLabel: m.label,
              color: "hsl(var(--primary))",
            }))}
            formatValue={(v) => `${v.toFixed(1)}%`}
          />
          <ComparisonMetricCard
            title="Ticket Médio"
            icon={DollarSign}
            metrics={comparisonMetrics.map((m) => ({
              value: m.metrics.repurchase.avgTicketRepurchase,
              month: m.month,
              monthLabel: m.label,
              color: "hsl(var(--primary))",
            }))}
            formatValue={(v) => formatCurrency(v)}
          />
          <ComparisonMetricCard
            title="Tempo até Recompra"
            icon={Clock}
            metrics={comparisonMetrics.map((m) => ({
              value: m.metrics.repurchase.avgDaysToFirstRepurchase,
              month: m.month,
              monthLabel: m.label,
              color: "hsl(var(--primary))",
            }))}
            formatValue={(v) => `${Math.round(v)} dias`}
          />
        </div>
      ) : (
        <div className="grid gap-3 lg:grid-cols-5">
          {/* Card Principal - Taxa de Recompra (40% = 2 colunas) */}
          <Card
            className={cn(
              "lg:col-span-2 transition-all",
              repurchaseStatus === "success" && "border-emerald-300 bg-gradient-to-br from-emerald-50/50 to-background",
              repurchaseStatus === "warning" && "border-amber-300 bg-gradient-to-br from-amber-50/50 to-background",
              repurchaseStatus === "danger" && "border-red-300 bg-gradient-to-br from-red-50/50 to-background",
            )}
          >
            <CardContent className="p-4">
              <div className="space-y-3">
                {/* Header */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Percent className="h-5 w-5 text-primary" />
                    <span className="text-sm font-medium text-muted-foreground">
                      Taxa de Conversão (amostra → regular) — base total
                    </span>
                  </div>
                  <Badge
                    variant="outline"
                    className={cn(
                      "text-xs",
                      repurchaseStatus === "success" && "bg-emerald-100 text-emerald-700 border-emerald-300",
                      repurchaseStatus === "neutral" && "bg-blue-100 text-blue-700 border-blue-300",
                      repurchaseStatus === "warning" && "bg-amber-100 text-amber-700 border-amber-300",
                      repurchaseStatus === "danger" && "bg-red-100 text-red-700 border-red-300",
                    )}
                  >
                    {repurchaseStatus === "success"
                      ? "🏆 Premium"
                      : repurchaseStatus === "neutral"
                        ? "✓ Benchmark"
                        : repurchaseStatus === "warning"
                          ? "⚠️ Atenção"
                          : "🚨 Crítico"}
                  </Badge>
                </div>

                {/* Valor Principal */}
                <div
                  className={cn(
                    "text-3xl font-bold",
                    repurchaseStatus === "success" && "text-emerald-600",
                    repurchaseStatus === "neutral" && "text-blue-600",
                    repurchaseStatus === "warning" && "text-amber-600",
                    repurchaseStatus === "danger" && "text-red-600",
                  )}
                >
                  {repurchaseRate.toFixed(1)}%
                </div>

                {/* Cálculo Visível */}
                <div className="text-xs space-y-1 text-muted-foreground bg-muted/30 rounded-md p-2">
                  <div className="flex justify-between">
                    <span>Clientes qualificados:</span>
                    <span className="font-medium text-foreground">{metrics.volume.uniqueCustomers}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Converteram (produto regular):</span>
                    <span className="font-semibold text-primary">{metrics.repurchase.customersWhoRepurchased}</span>
                  </div>
                  <div className="border-t pt-1 flex justify-between font-medium">
                    <span>Taxa:</span>
                    <span>
                      {metrics.repurchase.customersWhoRepurchased} ÷ {metrics.volume.uniqueCustomers} ={" "}
                      {repurchaseRate.toFixed(1)}%
                    </span>
                  </div>
                </div>

                {/* Progress vs Benchmark */}
                <div className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Benchmark: {REPURCHASE_BENCHMARK}%</span>
                    <span
                      className={cn(
                        "font-medium",
                        repurchaseRate >= REPURCHASE_BENCHMARK ? "text-emerald-600" : "text-amber-600",
                      )}
                    >
                      {repurchaseRate >= REPURCHASE_BENCHMARK
                        ? `+${(repurchaseRate - REPURCHASE_BENCHMARK).toFixed(0)}pp acima`
                        : `${(repurchaseRate - REPURCHASE_BENCHMARK).toFixed(0)}pp abaixo`}
                    </span>
                  </div>
                  <Progress value={benchmarkProgress} className="h-2" />
                </div>

                {/* Interpretação */}
                <p className={cn("text-xs p-2 rounded-md border", interpretation.color)}>{interpretation.text}</p>

                {/* Receita Gerada */}
                {metrics.quality.avgLTV > 0 && (
                  <div className="pt-2 border-t text-xs">
                    <span className="text-muted-foreground">LTV médio dos convertidos: </span>
                    <span className="font-semibold text-primary">{formatCurrency(metrics.quality.avgLTV)}</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Grid de 6 Satélites (60% = 3 colunas, 2 linhas) */}
          <div className="lg:col-span-3 grid grid-cols-2 md:grid-cols-3 gap-2">
            <StatusMetricCard
              title="Amostras Distribuídas"
              value={metrics.volume.totalSampleUnits.toLocaleString("pt-BR")}
              icon={<Package className="h-3 w-3" />}
              status="neutral"
              interpretation={
                metrics.volume.sampleOrders > 0
                  ? `${(metrics.volume.totalSampleUnits / metrics.volume.sampleOrders).toFixed(1)} unidades/pedido`
                  : "Sem pedidos"
              }
              size="compact"
            />
            <StatusMetricCard
              title="Pedidos com Amostra"
              value={metrics.volume.sampleOrders.toLocaleString("pt-BR")}
              icon={<ShoppingBag className="h-3 w-3" />}
              status="neutral"
              interpretation={
                metrics.volume.uniqueCustomers > 0
                  ? `${(metrics.volume.sampleOrders / metrics.volume.uniqueCustomers).toFixed(1)} pedidos/cliente`
                  : "Sem clientes qualificados"
              }
              size="compact"
            />
            <StatusMetricCard
              title="Clientes Qualificados"
              value={metrics.volume.uniqueCustomers.toLocaleString("pt-BR")}
              icon={<Users className="h-3 w-3" />}
              status={metrics.volume.uniqueCustomers >= 30 ? "success" : "warning"}
              interpretation={`${metrics.volume.percentageOfTotal.toFixed(1)}% do total`}
              size="compact"
              tooltipKey="clientes_qualificados"
            />
            <StatusMetricCard
              title="Converteram (regular)"
              value={metrics.repurchase.customersWhoRepurchased.toLocaleString("pt-BR")}
              icon={<ShoppingCart className="h-3 w-3" />}
              status={getStatusFromBenchmark(repurchaseRate, REPURCHASE_BENCHMARK)}
              size="compact"
              tooltipKey="converteram_regular"
            />
            <StatusMetricCard
              title="Ticket Médio Recompra"
              value={formatCurrency(metrics.repurchase.avgTicketRepurchase)}
              icon={<DollarSign className="h-3 w-3" />}
              status="neutral"
              tooltipKey="ticket_medio_recompra"
              size="compact"
            />
            <StatusMetricCard
              title="Tempo até Recompra"
              value={`${Math.round(metrics.repurchase.avgDaysToFirstRepurchase)} dias`}
              icon={<Clock className="h-3 w-3" />}
              status={metrics.repurchase.avgDaysToFirstRepurchase <= 45 ? "success" : "warning"}
              invertTrend
              size="compact"
              tooltipKey="tempo_ate_recompra"
            />
            <StatusMetricCard
              title="LTV Médio"
              value={formatCurrency(metrics.quality.avgLTV)}
              icon={<TrendingUp className="h-3 w-3" />}
              status={metrics.quality.avgLTV >= 300 ? "success" : "neutral"}
              size="compact"
              tooltipKey="ltv_medio_samples"
            />
            <StatusMetricCard
              title="Receita Recompras"
              value={formatCurrency(metrics.quality.avgLTV * metrics.repurchase.customersWhoRepurchased)}
              icon={<DollarSign className="h-3 w-3" />}
              status="neutral"
              size="compact"
            />
          </div>
        </div>
      )}

      {/* Card Comparativo: Por tipo de pet */}
      {metrics.byPetType &&
        (() => {
          const visibleProfiles = PET_PROFILE_ORDER.filter(
            (k) =>
              k !== "nao_identificado" &&
              metrics.byPetType?.[k]?.uniqueCustomers &&
              metrics.byPetType[k]!.uniqueCustomers > 0,
          );
          if (visibleProfiles.length === 0) return null;

          // Find top 2 profiles for comparison insight
          const sorted = [...visibleProfiles].sort(
            (a, b) => (metrics.byPetType?.[b]?.uniqueCustomers || 0) - (metrics.byPetType?.[a]?.uniqueCustomers || 0),
          );
          const top1 = sorted[0];
          const top2 = sorted.length > 1 ? sorted[1] : null;

          return (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Users className="h-5 w-5" />
                  Amostras por Tipo de Pet
                </CardTitle>
                <p className="text-xs text-muted-foreground">Comparativo de amostras por classificação de pet</p>
              </CardHeader>
              <CardContent>
                <div className={cn("grid gap-4", `grid-cols-${Math.min(visibleProfiles.length, 4)}`)}>
                  {visibleProfiles.map((profile) => {
                    const data = metrics.byPetType?.[profile];
                    if (!data) return null;
                    const color = PET_PROFILE_COLORS[profile];
                    return (
                      <div
                        key={profile}
                        className="space-y-3 p-4 rounded-lg border"
                        style={{
                          backgroundColor: `${color}10`,
                          borderColor: `${color}40`,
                        }}
                      >
                        <div className="flex items-center gap-2">
                          <div className="h-3 w-3 rounded-full" style={{ backgroundColor: color }} />
                          <span className="font-semibold" style={{ color }}>
                            {PET_PROFILE_LABELS[profile]}
                          </span>
                        </div>
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Clientes:</span>
                            <span className="font-bold" style={{ color }}>
                              {data.uniqueCustomers}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Recompra:</span>
                            <span
                              className={cn(
                                "font-bold",
                                data.repurchaseRate >= 25 ? "text-emerald-600" : "text-muted-foreground",
                              )}
                            >
                              {data.repurchaseRate.toFixed(1)}%
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Recompraram:</span>
                            <span className="font-medium">{data.customersWhoRepurchased}</span>
                          </div>
                          <div className="flex justify-between border-t pt-2" style={{ borderColor: `${color}30` }}>
                            <span className="text-muted-foreground">Ticket Médio:</span>
                            <span className="font-bold" style={{ color }}>
                              {formatCurrency(data.avgTicket)}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Insight comparativo */}
                {top1 &&
                  top2 &&
                  (() => {
                    const d1 = metrics.byPetType?.[top1];
                    const d2 = metrics.byPetType?.[top2];
                    if (!d1 || !d2) return null;
                    const diff = d1.repurchaseRate - d2.repurchaseRate;
                    if (Math.abs(diff) < 0.5) {
                      return (
                        <div className="mt-3 p-2 bg-muted/50 rounded text-xs">
                          <span className="text-muted-foreground">
                            📊 Taxas de recompra equivalentes entre {PET_PROFILE_LABELS[top1]} e{" "}
                            {PET_PROFILE_LABELS[top2]}
                          </span>
                        </div>
                      );
                    }
                    const winner = diff > 0 ? top1 : top2;
                    const winnerColor = PET_PROFILE_COLORS[winner];
                    return (
                      <div className="mt-3 p-2 bg-muted/50 rounded text-xs">
                        <span style={{ color: winnerColor }}>
                          {PET_PROFILE_LABELS[winner]} tem taxa de recompra {Math.abs(diff).toFixed(1)}pp maior
                        </span>
                      </div>
                    );
                  })()}
              </CardContent>
            </Card>
          );
        })()}

      <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg border">
        <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
          <Calendar className="h-4 w-4" />
          Conversão dentro de X dias (informacional)
        </div>
        <div className="flex items-center gap-4">
          <div className="text-center">
            <p className="text-[10px] text-muted-foreground">30 dias</p>
            <p className="text-sm font-bold">{metrics.conversionByTime.days30.toFixed(1)}%</p>
          </div>
          <ArrowRight className="h-3 w-3 text-muted-foreground" />
          <div className="text-center">
            <p className="text-[10px] text-muted-foreground">60 dias</p>
            <p className="text-sm font-bold">{metrics.conversionByTime.days60.toFixed(1)}%</p>
          </div>
          <ArrowRight className="h-3 w-3 text-muted-foreground" />
          <div className="text-center">
            <p className="text-[10px] text-muted-foreground">90 dias</p>
            <p className="text-sm font-bold">{metrics.conversionByTime.days90.toFixed(1)}%</p>
          </div>
          <ArrowRight className="h-3 w-3 text-muted-foreground" />
          <div className="text-center">
            <p className="text-[10px] text-muted-foreground">180 dias</p>
            <p className="text-sm font-bold text-primary">{metrics.conversionByTime.days180.toFixed(1)}%</p>
          </div>
        </div>
      </div>

      {/* Tabs com análises detalhadas */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="overview" className="text-xs">
            📊 Visão Geral
          </TabsTrigger>
          <TabsTrigger value="repurchase" className="text-xs">
            🔄 Recompra
          </TabsTrigger>
          <TabsTrigger value="cohort" className="text-xs">
            ⏱️ Coorte
          </TabsTrigger>
          <TabsTrigger value="crosssell" className="text-xs">
            🛒 Cross-sell
          </TabsTrigger>
          <TabsTrigger value="profile" className="text-xs">
            👤 Perfil
          </TabsTrigger>
          <TabsTrigger value="trends" className="text-xs">
            📈 Tendências
          </TabsTrigger>
        </TabsList>

        {/* Aba: Visão Geral - Simplificada */}
        <TabsContent value="overview" className="space-y-4">
          <ConversionFunnelChart
            totalSampleCustomers={metrics.volume.uniqueCustomers}
            customersWhoRepurchased={metrics.repurchase.customersWhoRepurchased}
            loyalCustomers={metrics.segmentation.loyal}
          />
        </TabsContent>

        {/* Aba: Recompra - Sem cards duplicados */}
        <TabsContent value="repurchase" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Qualidade da Recompra</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-sm text-muted-foreground">Recompras por Cliente</p>
                  <p className="text-2xl font-bold">{metrics.quality.avgRepurchasesPerCustomer.toFixed(2)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">LTV Médio</p>
                  <p className="text-2xl font-bold">R$ {metrics.quality.avgLTV.toFixed(2)}</p>
                </div>
              </CardContent>
            </Card>

            <SampleProductsTable
              title="Produtos Preferidos na Recompra"
              products={metrics.quality.topRepurchaseProducts.slice(0, 5)}
            />
          </div>
        </TabsContent>

        {/* Aba: Análise de Coorte Temporal */}
        <TabsContent value="cohort" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>⏱️ Taxa de Recompra por Tempo desde Amostra</CardTitle>
              <p className="text-sm text-muted-foreground">
                Análise segmentada por quanto tempo os clientes tiveram desde a compra da amostra para recomprar
              </p>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-3 px-4 font-semibold">Período</th>
                      <th className="text-right py-3 px-4 font-semibold">Clientes</th>
                      <th className="text-right py-3 px-4 font-semibold">Recompras</th>
                      <th className="text-right py-3 px-4 font-semibold">Taxa</th>
                      <th className="text-right py-3 px-4 font-semibold">Ticket Médio</th>
                      <th className="text-right py-3 px-4 font-semibold">Dias até Recompra</th>
                    </tr>
                  </thead>
                  <tbody>
                    {metrics.cohortAnalysis.cohorts.map((cohort, index) => (
                      <tr key={index} className="border-b hover:bg-muted/50">
                        <td className="py-3 px-4 font-medium">{cohort.rangeLabel}</td>
                        <td className="text-right py-3 px-4">{cohort.customerCount}</td>
                        <td className="text-right py-3 px-4">{cohort.repurchaseCount}</td>
                        <td className="text-right py-3 px-4">
                          <span
                            className={`font-semibold ${cohort.repurchaseRate > 30 ? "text-primary" : cohort.repurchaseRate > 15 ? "text-warning" : "text-muted-foreground"}`}
                          >
                            {cohort.repurchaseRate.toFixed(1)}%
                          </span>
                        </td>
                        <td className="text-right py-3 px-4">
                          {cohort.avgTicket > 0 ? formatCurrency(cohort.avgTicket) : "-"}
                        </td>
                        <td className="text-right py-3 px-4">
                          {cohort.avgDaysToRepurchase > 0 ? `${Math.round(cohort.avgDaysToRepurchase)} dias` : "-"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>📊 Taxa de Recompra por Coorte</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={metrics.cohortAnalysis.cohorts}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="rangeLabel" tick={{ fontSize: 12 }} angle={-45} textAnchor="end" height={80} />
                    <YAxis label={{ value: "Taxa de Recompra (%)", angle: -90, position: "insideLeft" }} />
                    <Tooltip
                      formatter={(value: number) => `${value.toFixed(1)}%`}
                      labelFormatter={(label) => `Período: ${label}`}
                    />
                    <Line
                      type="monotone"
                      dataKey="repurchaseRate"
                      stroke="hsl(var(--primary))"
                      strokeWidth={2}
                      dot={{ fill: "hsl(var(--primary))", r: 5 }}
                      name="Taxa de Recompra"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>👥 Distribuição de Clientes por Coorte</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={metrics.cohortAnalysis.cohorts}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="rangeLabel" tick={{ fontSize: 12 }} angle={-45} textAnchor="end" height={80} />
                    <YAxis label={{ value: "Número de Clientes", angle: -90, position: "insideLeft" }} />
                    <Tooltip labelFormatter={(label) => `Período: ${label}`} />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="customerCount"
                      stroke="hsl(var(--chart-1))"
                      strokeWidth={2}
                      dot={{ fill: "hsl(var(--chart-1))", r: 4 }}
                      name="Total de Clientes"
                    />
                    <Line
                      type="monotone"
                      dataKey="repurchaseCount"
                      stroke="hsl(var(--chart-2))"
                      strokeWidth={2}
                      dot={{ fill: "hsl(var(--chart-2))", r: 4 }}
                      name="Clientes que Recompraram"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          <Card className="bg-muted/50">
            <CardContent className="pt-6">
              <div className="flex items-start gap-3">
                <Target className="h-5 w-5 text-primary mt-0.5" />
                <div>
                  <p className="font-medium">💡 Insights da Análise de Coorte</p>
                  <ul className="text-sm text-muted-foreground mt-2 space-y-1 list-disc list-inside">
                    <li>Clientes mais recentes (0-30 dias) ainda não tiveram tempo suficiente para recomprar</li>
                    <li>A taxa de recompra tende a estabilizar após 90+ dias desde a amostra</li>
                    <li>Coortes com mais tempo mostram o potencial real de conversão da estratégia de amostras</li>
                    <li>Use esta análise para projetar taxas de recompra futuras de clientes novos</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Aba: Cross-sell */}
        <TabsContent value="crosssell" className="space-y-6">
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Apenas Amostra</CardTitle>
                <ShoppingCart className="h-5 w-5 text-primary" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{metrics.crossSell.onlySample}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  Ticket: R$ {metrics.crossSell.avgTicketSampleOnly.toFixed(2)}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Amostra + Outros</CardTitle>
                <ShoppingCart className="h-5 w-5 text-primary" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{metrics.crossSell.samplePlusOthers}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  Ticket: R$ {metrics.crossSell.avgTicketSamplePlusOthers.toFixed(2)}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Tamanho Médio Cesta</CardTitle>
                <Package className="h-5 w-5 text-primary" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{metrics.basket.avgBasketSize.toFixed(1)}</div>
                <p className="text-xs text-muted-foreground mt-1">Produtos por pedido com amostra</p>
              </CardContent>
            </Card>
          </div>

          <SampleProductsTable
            title="Produtos Mais Comprados com Amostra"
            products={metrics.crossSell.topProductsWithSample}
            showAvgOrderValue
          />
        </TabsContent>

        {/* Aba: Perfil */}
        <TabsContent value="profile" className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Segmentação de Clientes</CardTitle>
              </CardHeader>
              <CardContent>
                <CustomerSegmentationChart segments={segmentationData} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Distribuição por Plataforma</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {metrics.profile.platformDistribution.map((platform, index) => (
                    <div key={index} className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="font-medium">{platform.platform}</span>
                        <span className="text-muted-foreground">{platform.count} clientes</span>
                      </div>
                      <div className="h-2 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full bg-primary rounded-full"
                          style={{
                            width: `${(platform.count / metrics.volume.uniqueCustomers) * 100}%`,
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Métodos de Envio</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-3">
                {metrics.profile.shippingMethods.slice(0, 3).map((method, index) => (
                  <div key={index} className="space-y-2">
                    <p className="text-sm font-medium text-foreground">{method.method}</p>
                    <p className="text-2xl font-bold">{method.count}</p>
                    <p className="text-xs text-muted-foreground">pedidos</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Aba: Tendências */}
        <TabsContent value="trends" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Evolução de Vendas de Amostras</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <LineChart data={metrics.temporal.monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis
                    dataKey="month"
                    stroke="hsl(var(--muted-foreground))"
                    tickFormatter={(value) => {
                      const [year, month] = value.split("-");
                      return `${month}/${year.slice(2)}`;
                    }}
                  />
                  <YAxis stroke="hsl(var(--muted-foreground))" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--popover))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "var(--radius)",
                    }}
                    labelFormatter={(value) => {
                      const [year, month] = value.split("-");
                      return `${month}/${year}`;
                    }}
                  />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="count"
                    stroke="hsl(var(--primary))"
                    strokeWidth={2}
                    name="Amostras Vendidas"
                    dot={{ fill: "hsl(var(--primary))" }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Taxa de Crescimento Mensal</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={metrics.temporal.monthlyData.slice(1)}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis
                    dataKey="month"
                    stroke="hsl(var(--muted-foreground))"
                    tickFormatter={(value) => {
                      const [year, month] = value.split("-");
                      return `${month}/${year.slice(2)}`;
                    }}
                  />
                  <YAxis stroke="hsl(var(--muted-foreground))" unit="%" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--popover))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "var(--radius)",
                    }}
                    formatter={(value: number) => `${value.toFixed(1)}%`}
                  />
                  <Line
                    type="monotone"
                    dataKey="growthRate"
                    stroke="hsl(var(--chart-2))"
                    strokeWidth={2}
                    name="Crescimento %"
                    dot={{ fill: "hsl(var(--chart-2))" }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AnaliseSamples;
