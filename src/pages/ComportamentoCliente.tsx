import { useMemo, useState } from "react";
import { Users, RefreshCcw, AlertTriangle, UserCheck, DollarSign, Calendar, TrendingUp, TrendingDown, Info, UserMinus, FileWarning, PieChart, Package, ShoppingCart, ShoppingBag, Target, Clock, Percent, ArrowRight } from "lucide-react";
import { format } from "date-fns";

import { useDashboard } from "@/contexts/DashboardContext";
import { useCustomerData } from "@/hooks/useCustomerData";
import { useAppSettings } from "@/hooks/useAppSettings";

import { calculateBehaviorComparison, BehaviorComparison, PathKPIs } from "@/utils/behaviorComparison";
import { calculateAllSampleMetrics, calculateDataPeriod, isSampleProduct } from "@/utils/samplesAnalyzer";
import { analyzeOrderVolume, analyzeSalesPeaks } from "@/utils/customerBehaviorMetrics";
import { formatCurrency, filterOrdersByDateRange } from "@/utils/salesCalculator";
import { getB2COrders } from "@/utils/revenue";
import { PET_PROFILE_ORDER, PET_PROFILE_LABELS, PET_PROFILE_COLORS, BuyerPetProfile } from "@/data/operationalProducts";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

import { OrderVolumeChart } from "@/components/dashboard/OrderVolumeChart";
import { SalesPeaksChart } from "@/components/dashboard/SalesPeaksChart";
import { VolumeKPICards } from "@/components/dashboard/VolumeKPICards";
import { ComparisonMetricCard } from "@/components/dashboard/ComparisonMetricCard";
import { StatusMetricCard, getStatusFromBenchmark } from "@/components/dashboard/StatusMetricCard";
import { CustomerSegmentationChart } from "@/components/dashboard/CustomerSegmentationChart";
import { SegmentRevenueChart } from "@/components/dashboard/SegmentRevenueChart";
import { SegmentDetailTable } from "@/components/dashboard/SegmentDetailTable";
import { ChurnFunnelChart } from "@/components/dashboard/ChurnFunnelChart";
import { ChurnRiskTable } from "@/components/dashboard/ChurnRiskTable";
import { KPITooltip } from "@/components/dashboard/KPITooltip";
import { EmptyState } from "@/components/EmptyState";
import { ConversionFunnelChart } from "@/components/dashboard/ConversionFunnelChart";
import { SampleProductsTable } from "@/components/dashboard/SampleProductsTable";

import { cn } from "@/lib/utils";

// ============================================================================
// HELPER: PathCard for Comparativo tab
// ============================================================================

interface PathCardProps {
  title: string;
  description: string;
  pathKPIs: PathKPIs;
  comparisonPathKPIs: PathKPIs;
  sectorBenchmarks: any;
}

function PathCard({ title, description, pathKPIs, comparisonPathKPIs, sectorBenchmarks }: PathCardProps) {
  const getComparisonBadge = (value: number, comparisonValue: number) => {
    const diff = value - comparisonValue;
    const percentDiff = (diff / comparisonValue) * 100;

    if (Math.abs(percentDiff) < 5) {
      return <TrendingUp className="w-4 h-4 text-gray-400" />;
    }
    return percentDiff > 0 ? (
      <TrendingUp className="w-4 h-4 text-green-600" />
    ) : (
      <TrendingDown className="w-4 h-4 text-red-600" />
    );
  };

  return (
    <Card className="bg-gradient-to-br from-slate-50 to-slate-100 border-slate-200">
      <CardHeader>
        <CardTitle className="text-lg">{title}</CardTitle>
        <CardDescription className="text-sm text-slate-600">{description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Total Customers */}
        <div className="flex items-center justify-between p-3 bg-white rounded-lg border border-slate-200">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-blue-600" />
            <span className="text-sm font-medium text-slate-700">Total de Clientes</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-lg font-bold text-slate-900">{pathKPIs.totalCustomers}</span>
            {getComparisonBadge(pathKPIs.totalCustomers, comparisonPathKPIs.totalCustomers)}
          </div>
        </div>

        {/* Repurchase Rate */}
        <div className="flex items-center justify-between p-3 bg-white rounded-lg border border-slate-200">
          <div className="flex items-center gap-2">
            <RefreshCcw className="w-4 h-4 text-purple-600" />
            <span className="text-sm font-medium text-slate-700">Taxa de Recompra (%)</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-lg font-bold text-slate-900">
              {(pathKPIs.repurchaseRate * 100).toFixed(1)}%
            </span>
            {getComparisonBadge(pathKPIs.repurchaseRate, comparisonPathKPIs.repurchaseRate)}
          </div>
        </div>

        {/* Ticket Médio */}
        <div className="flex items-center justify-between p-3 bg-white rounded-lg border border-slate-200">
          <div className="flex items-center gap-2">
            <ShoppingCart className="w-4 h-4 text-green-600" />
            <span className="text-sm font-medium text-slate-700">Ticket Médio (R$)</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-lg font-bold text-slate-900">
              {formatCurrency(pathKPIs.avgTicketMedio)}
            </span>
            {getComparisonBadge(pathKPIs.avgTicketMedio, comparisonPathKPIs.avgTicketMedio)}
          </div>
        </div>

        {/* LTV Médio */}
        <div className="flex items-center justify-between p-3 bg-white rounded-lg border border-slate-200">
          <div className="flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-yellow-600" />
            <span className="text-sm font-medium text-slate-700">LTV Médio (R$)</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-lg font-bold text-slate-900">
              {formatCurrency(pathKPIs.avgLTV)}
            </span>
            {getComparisonBadge(pathKPIs.avgLTV, comparisonPathKPIs.avgLTV)}
          </div>
        </div>

        {/* Days Between Purchases */}
        <div className="flex items-center justify-between p-3 bg-white rounded-lg border border-slate-200">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-indigo-600" />
            <span className="text-sm font-medium text-slate-700">Dias entre Compras</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-lg font-bold text-slate-900">
              {pathKPIs.avgDaysBetweenPurchases.toFixed(0)}d
            </span>
            {getComparisonBadge(
              -pathKPIs.avgDaysBetweenPurchases,
              -comparisonPathKPIs.avgDaysBetweenPurchases
            )}
          </div>
        </div>

        {/* Days to Second Purchase */}
        <div className="flex items-center justify-between p-3 bg-white rounded-lg border border-slate-200">
          <div className="flex items-center gap-2">
            <ArrowRight className="w-4 h-4 text-cyan-600" />
            <span className="text-sm font-medium text-slate-700">Dias até 2ª Compra</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-lg font-bold text-slate-900">
              {pathKPIs.avgDaysToSecondPurchase ? pathKPIs.avgDaysToSecondPurchase.toFixed(0) : "—"}d
            </span>
            {pathKPIs.avgDaysToSecondPurchase ? (
              getComparisonBadge(
                -pathKPIs.avgDaysToSecondPurchase,
                -(comparisonPathKPIs.avgDaysToSecondPurchase || 0)
              )
            ) : (
              <TrendingUp className="w-4 h-4 text-gray-400" />
            )}
          </div>
        </div>

        {/* Churn Rate */}
        <div className="flex items-center justify-between p-3 bg-white rounded-lg border border-slate-200">
          <div className="flex items-center gap-2">
            <UserMinus className="w-4 h-4 text-red-600" />
            <span className="text-sm font-medium text-slate-700">Taxa de Churn (%)</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-lg font-bold text-slate-900">
              {(pathKPIs.churnRate * 100).toFixed(1)}%
            </span>
            {getComparisonBadge(
              -pathKPIs.churnRate,
              -comparisonPathKPIs.churnRate
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function ComportamentoCliente() {
  const { salesData, dateRange, comparisonMode } = useDashboard();
  const { segments, churnMetrics, churnRiskCustomers, summaryMetrics, isLoading: customerDataLoading } = useCustomerData();
  const { sectorBenchmarks } = useAppSettings();
  const [volumeTimeframe, setVolumeTimeframe] = useState("daily");

  // ============================================================================
  // Comparativo Tab Logic
  // ============================================================================

  const behaviorComparison = useMemo(() => {
    if (!salesData || salesData.length === 0) return null;
    return calculateBehaviorComparison(salesData);
  }, [salesData]);

  // ============================================================================
  // Amostras Tab Logic
  // ============================================================================

  const filteredOrdersForSamples = useMemo(() => {
    if (!salesData) return [];
    if (!dateRange) return salesData;
    return filterOrdersByDateRange(salesData, dateRange.start, dateRange.end);
  }, [salesData, dateRange]);

  const sampleMetrics = useMemo(() => {
    if (!filteredOrdersForSamples || filteredOrdersForSamples.length === 0) return null;
    return calculateAllSampleMetrics(filteredOrdersForSamples, salesData || []);
  }, [filteredOrdersForSamples, salesData]);

  const samplePeriod = useMemo(() => {
    if (!filteredOrdersForSamples || filteredOrdersForSamples.length === 0) return null;
    return calculateDataPeriod(filteredOrdersForSamples);
  }, [filteredOrdersForSamples]);

  // ============================================================================
  // Volume & Padrões Tab Logic
  // ============================================================================

  const b2cOrders = useMemo(() => {
    return getB2COrders(salesData || []);
  }, [salesData]);

  const filteredB2COrders = useMemo(() => {
    if (!dateRange) return b2cOrders;
    return filterOrdersByDateRange(b2cOrders, dateRange.start, dateRange.end);
  }, [b2cOrders, dateRange]);

  const volumeAnalysis = useMemo(() => {
    if (!filteredB2COrders || filteredB2COrders.length === 0) return null;
    return analyzeOrderVolume(filteredB2COrders);
  }, [filteredB2COrders]);

  const salesPeaks = useMemo(() => {
    if (!filteredB2COrders || filteredB2COrders.length === 0) return null;
    return analyzeSalesPeaks(filteredB2COrders);
  }, [filteredB2COrders]);

  // ============================================================================
  // RENDER
  // ============================================================================

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-2 bg-gradient-to-br from-blue-600 to-blue-700 rounded-lg">
          <Users className="w-6 h-6 text-white" />
        </div>
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Comportamento do Cliente</h1>
          <p className="text-slate-600 text-sm mt-1">
            Análise comparativa, amostras, segmentação, churn e padrões de compra
          </p>
        </div>
      </div>

      {/* Main Tabs */}
      <Tabs defaultValue="comparativo" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="comparativo">Comparativo</TabsTrigger>
          <TabsTrigger value="amostras">Amostras</TabsTrigger>
          <TabsTrigger value="segmentos-churn">Segmentos & Churn</TabsTrigger>
          <TabsTrigger value="volume">Volume & Padrões</TabsTrigger>
        </TabsList>

        {/* ====================================================================
            TAB 1: COMPARATIVO
            ==================================================================== */}
        <TabsContent value="comparativo" className="space-y-6">
          {!behaviorComparison || !salesData || salesData.length === 0 ? (
            <EmptyState
              title="Sem dados disponíveis"
              description="Nenhum dado de comportamento de cliente encontrado para o período selecionado."
              icon={AlertTriangle}
            />
          ) : (
            <>
              {/* Two-Column Comparison */}
              <div className="grid grid-cols-2 gap-6">
                <PathCard
                  title="Começou com Amostra"
                  description="Clientes que iniciaram com produto de amostra"
                  pathKPIs={behaviorComparison.pathA}
                  comparisonPathKPIs={behaviorComparison.pathB}
                  sectorBenchmarks={sectorBenchmarks}
                />
                <PathCard
                  title="Começou com Produto"
                  description="Clientes que iniciaram com produto regular"
                  pathKPIs={behaviorComparison.pathB}
                  comparisonPathKPIs={behaviorComparison.pathA}
                  sectorBenchmarks={sectorBenchmarks}
                />
              </div>

              {/* Insights */}
              {behaviorComparison.insights && behaviorComparison.insights.length > 0 && (
                <Card className="border-blue-200 bg-blue-50">
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Info className="w-5 h-5 text-blue-600" />
                      Insights
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2">
                      {behaviorComparison.insights.map((insight, idx) => (
                        <li key={idx} className="flex gap-2 text-sm text-slate-700">
                          <span className="text-blue-600 font-bold">•</span>
                          <span>{insight}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              )}
            </>
          )}
        </TabsContent>

        {/* ====================================================================
            TAB 2: AMOSTRAS
            ==================================================================== */}
        <TabsContent value="amostras" className="space-y-6">
          {!sampleMetrics ? (
            <EmptyState
              title="Sem dados de amostra"
              description="Nenhum produto de amostra encontrado para o período selecionado."
              icon={Package}
            />
          ) : (
            <>
              {/* Hero Card with Conversion Rate */}
              {sampleMetrics.volume && (
                <Card className="border-2 border-blue-200 bg-gradient-to-r from-blue-50 to-indigo-50">
                  <CardHeader>
                    <CardTitle className="text-xl">Conversão Amostra → Produto Regular</CardTitle>
                    <CardDescription>
                      Taxa de conversão e métricas gerais de amostra para {samplePeriod?.startDate ? format(samplePeriod.startDate, "MMM yyyy") : "período"}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-3 gap-4">
                      <div className="text-center">
                        <div className="text-4xl font-bold text-blue-600">
                          {(
                            (sampleMetrics.volume.samplesConvertedToRegular /
                              sampleMetrics.volume.totalSamples) *
                            100
                          ).toFixed(1)}
                          %
                        </div>
                        <p className="text-sm text-slate-600 mt-1">Taxa de Conversão</p>
                      </div>
                      <div className="text-center">
                        <div className="text-4xl font-bold text-green-600">
                          {sampleMetrics.volume.totalSamples}
                        </div>
                        <p className="text-sm text-slate-600 mt-1">Total de Amostras</p>
                      </div>
                      <div className="text-center">
                        <div className="text-4xl font-bold text-purple-600">
                          {sampleMetrics.volume.samplesConvertedToRegular}
                        </div>
                        <p className="text-sm text-slate-600 mt-1">Convertidas</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Satellite KPI Cards (8 cards in grid) */}
              {sampleMetrics && (
                <div className="grid grid-cols-4 gap-4">
                  {/* Avg Repurchase Rate */}
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm font-medium text-slate-700">
                        Taxa Média de Recompra
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-slate-900">
                        {(sampleMetrics.repurchase?.avgRepurchaseRate * 100 || 0).toFixed(1)}%
                      </div>
                    </CardContent>
                  </Card>

                  {/* Avg Ticket */}
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm font-medium text-slate-700">
                        Ticket Médio
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-slate-900">
                        {formatCurrency(sampleMetrics.volume?.avgTicketMedio || 0)}
                      </div>
                    </CardContent>
                  </Card>

                  {/* Avg LTV */}
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm font-medium text-slate-700">
                        LTV Médio
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-slate-900">
                        {formatCurrency(sampleMetrics.volume?.avgLTV || 0)}
                      </div>
                    </CardContent>
                  </Card>

                  {/* Cross-sell Rate */}
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm font-medium text-slate-700">
                        Taxa Cross-sell
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-slate-900">
                        {(sampleMetrics.crossSell?.crossSellRate * 100 || 0).toFixed(1)}%
                      </div>
                    </CardContent>
                  </Card>

                  {/* Avg Days to Second Purchase */}
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm font-medium text-slate-700">
                        Dias até 2ª Compra
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-slate-900">
                        {(sampleMetrics.volume?.avgDaysToSecondPurchase || 0).toFixed(0)}d
                      </div>
                    </CardContent>
                  </Card>

                  {/* Quality Score */}
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm font-medium text-slate-700">
                        Pontuação de Qualidade
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-slate-900">
                        {(sampleMetrics.quality?.qualityScore || 0).toFixed(2)}/5
                      </div>
                    </CardContent>
                  </Card>

                  {/* Maturity Score */}
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm font-medium text-slate-700">
                        Nível de Maturidade
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-slate-900">
                        {sampleMetrics.maturity?.maturityLevel || "—"}
                      </div>
                    </CardContent>
                  </Card>

                  {/* Conversion by Time (30d) */}
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm font-medium text-slate-700">
                        Conversão 30d
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-slate-900">
                        {(sampleMetrics.conversionByTime?.["30days"] * 100 || 0).toFixed(1)}%
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}

              {/* Inner Tabs for Sample Analysis */}
              <Tabs defaultValue="overview" className="w-full">
                <TabsList className="grid w-full grid-cols-6">
                  <TabsTrigger value="overview">Visão Geral</TabsTrigger>
                  <TabsTrigger value="repurchase">Recompra</TabsTrigger>
                  <TabsTrigger value="cohort">Coorte</TabsTrigger>
                  <TabsTrigger value="crosssell">Cross-sell</TabsTrigger>
                  <TabsTrigger value="profile">Perfil</TabsTrigger>
                  <TabsTrigger value="trends">Tendências</TabsTrigger>
                </TabsList>

                {/* Visão Geral */}
                <TabsContent value="overview" className="space-y-6">
                  {sampleMetrics?.volume && (
                    <>
                      {/* Sample Products Table */}
                      <Card>
                        <CardHeader>
                          <CardTitle>Produtos de Amostra</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <SampleProductsTable data={sampleMetrics.volume.samplesByProduct || []} />
                        </CardContent>
                      </Card>

                      {/* Conversion by Time */}
                      {sampleMetrics.conversionByTime && (
                        <Card>
                          <CardHeader>
                            <CardTitle>Taxa de Conversão por Período</CardTitle>
                            <CardDescription>
                              Conversão de amostra para produto regular em diferentes períodos
                            </CardDescription>
                          </CardHeader>
                          <CardContent>
                            <div className="grid grid-cols-4 gap-4">
                              <div className="text-center p-4 bg-slate-50 rounded-lg border">
                                <div className="text-2xl font-bold text-slate-900">
                                  {(sampleMetrics.conversionByTime["30days"] * 100).toFixed(1)}%
                                </div>
                                <p className="text-sm text-slate-600 mt-1">30 dias</p>
                              </div>
                              <div className="text-center p-4 bg-slate-50 rounded-lg border">
                                <div className="text-2xl font-bold text-slate-900">
                                  {(sampleMetrics.conversionByTime["60days"] * 100).toFixed(1)}%
                                </div>
                                <p className="text-sm text-slate-600 mt-1">60 dias</p>
                              </div>
                              <div className="text-center p-4 bg-slate-50 rounded-lg border">
                                <div className="text-2xl font-bold text-slate-900">
                                  {(sampleMetrics.conversionByTime["90days"] * 100).toFixed(1)}%
                                </div>
                                <p className="text-sm text-slate-600 mt-1">90 dias</p>
                              </div>
                              <div className="text-center p-4 bg-slate-50 rounded-lg border">
                                <div className="text-2xl font-bold text-slate-900">
                                  {(sampleMetrics.conversionByTime["180days"] * 100).toFixed(1)}%
                                </div>
                                <p className="text-sm text-slate-600 mt-1">180 dias</p>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      )}

                      {/* Basket Metrics */}
                      {sampleMetrics.basket && (
                        <Card>
                          <CardHeader>
                            <CardTitle>Análise de Cesta</CardTitle>
                          </CardHeader>
                          <CardContent>
                            <div className="grid grid-cols-3 gap-4">
                              <div className="text-center">
                                <div className="text-3xl font-bold text-slate-900">
                                  {sampleMetrics.basket.avgBasketSize.toFixed(2)}
                                </div>
                                <p className="text-sm text-slate-600 mt-1">Tamanho Médio da Cesta</p>
                              </div>
                              <div className="text-center">
                                <div className="text-3xl font-bold text-slate-900">
                                  {formatCurrency(sampleMetrics.basket.avgBasketValue)}
                                </div>
                                <p className="text-sm text-slate-600 mt-1">Valor Médio da Cesta</p>
                              </div>
                              <div className="text-center">
                                <div className="text-3xl font-bold text-slate-900">
                                  {(sampleMetrics.basket.sampleShareOfBasket * 100).toFixed(1)}%
                                </div>
                                <p className="text-sm text-slate-600 mt-1">% da Cesta (Amostra)</p>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      )}
                    </>
                  )}
                </TabsContent>

                {/* Recompra */}
                <TabsContent value="repurchase" className="space-y-6">
                  {sampleMetrics?.repurchase && (
                    <Card>
                      <CardHeader>
                        <CardTitle>Métricas de Recompra</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-3 gap-4">
                          <div className="text-center">
                            <div className="text-3xl font-bold text-slate-900">
                              {(sampleMetrics.repurchase.avgRepurchaseRate * 100).toFixed(1)}%
                            </div>
                            <p className="text-sm text-slate-600 mt-1">Taxa de Recompra</p>
                          </div>
                          <div className="text-center">
                            <div className="text-3xl font-bold text-slate-900">
                              {sampleMetrics.repurchase.avgDaysBetweenRepurchases.toFixed(0)}d
                            </div>
                            <p className="text-sm text-slate-600 mt-1">Dias entre Compras</p>
                          </div>
                          <div className="text-center">
                            <div className="text-3xl font-bold text-slate-900">
                              {sampleMetrics.repurchase.totalRepurchasers}
                            </div>
                            <p className="text-sm text-slate-600 mt-1">Clientes Recompra</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </TabsContent>

                {/* Coorte */}
                <TabsContent value="cohort" className="space-y-6">
                  {sampleMetrics?.cohortAnalysis && (
                    <Card>
                      <CardHeader>
                        <CardTitle>Análise de Coorte</CardTitle>
                        <CardDescription>
                          Retenção de clientes por período de primeira compra
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="text-center p-4 text-slate-600">
                          {Object.entries(sampleMetrics.cohortAnalysis).length > 0 ? (
                            <div className="grid grid-cols-2 gap-4">
                              {Object.entries(sampleMetrics.cohortAnalysis).map(([period, data]: any) => (
                                <div key={period} className="p-4 border rounded-lg bg-slate-50">
                                  <p className="font-medium text-slate-900">{period}</p>
                                  <p className="text-sm text-slate-600 mt-1">
                                    {typeof data === 'object' ? JSON.stringify(data) : data}
                                  </p>
                                </div>
                              ))}
                            </div>
                          ) : (
                            "Sem dados de coorte disponíveis"
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </TabsContent>

                {/* Cross-sell */}
                <TabsContent value="crosssell" className="space-y-6">
                  {sampleMetrics?.crossSell && (
                    <Card>
                      <CardHeader>
                        <CardTitle>Análise de Cross-sell</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-3 gap-4">
                          <div className="text-center">
                            <div className="text-3xl font-bold text-slate-900">
                              {(sampleMetrics.crossSell.crossSellRate * 100).toFixed(1)}%
                            </div>
                            <p className="text-sm text-slate-600 mt-1">Taxa de Cross-sell</p>
                          </div>
                          <div className="text-center">
                            <div className="text-3xl font-bold text-slate-900">
                              {sampleMetrics.crossSell.totalCrossSells}
                            </div>
                            <p className="text-sm text-slate-600 mt-1">Total de Cross-sells</p>
                          </div>
                          <div className="text-center">
                            <div className="text-3xl font-bold text-slate-900">
                              {formatCurrency(sampleMetrics.crossSell.avgCrossSellValue)}
                            </div>
                            <p className="text-sm text-slate-600 mt-1">Valor Médio</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </TabsContent>

                {/* Perfil */}
                <TabsContent value="profile" className="space-y-6">
                  {sampleMetrics?.profile && (
                    <Card>
                      <CardHeader>
                        <CardTitle>Perfil de Clientes (Pet Types)</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-4 gap-4">
                          {PET_PROFILE_ORDER.map((petType: BuyerPetProfile) => {
                            const profileData = sampleMetrics.profile[petType] || { count: 0, percentage: 0, revenue: 0 };
                            return (
                              <div key={petType} className="p-4 border rounded-lg bg-slate-50">
                                <p className="font-medium text-slate-900">{PET_PROFILE_LABELS[petType]}</p>
                                <p className="text-2xl font-bold text-slate-900 mt-2">
                                  {profileData.percentage.toFixed(1)}%
                                </p>
                                <p className="text-sm text-slate-600 mt-1">
                                  {profileData.count} clientes
                                </p>
                              </div>
                            );
                          })}
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </TabsContent>

                {/* Tendências */}
                <TabsContent value="trends" className="space-y-6">
                  {sampleMetrics?.temporal && (
                    <Card>
                      <CardHeader>
                        <CardTitle>Tendências Temporais</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-center p-4 text-slate-600">
                          {Object.entries(sampleMetrics.temporal).length > 0 ? (
                            <div className="grid grid-cols-2 gap-4">
                              {Object.entries(sampleMetrics.temporal).map(([period, metrics]: any) => (
                                <div key={period} className="p-4 border rounded-lg bg-slate-50">
                                  <p className="font-medium text-slate-900">{period}</p>
                                  <p className="text-sm text-slate-600 mt-1">
                                    {typeof metrics === 'object' ? JSON.stringify(metrics) : metrics}
                                  </p>
                                </div>
                              ))}
                            </div>
                          ) : (
                            "Sem dados temporais disponíveis"
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </TabsContent>
              </Tabs>
            </>
          )}
        </TabsContent>

        {/* ====================================================================
            TAB 3: SEGMENTOS & CHURN
            ==================================================================== */}
        <TabsContent value="segmentos-churn" className="space-y-6">
          {customerDataLoading ? (
            <div className="space-y-4">
              <Skeleton className="h-20" />
              <Skeleton className="h-80" />
            </div>
          ) : !segments || segments.length === 0 ? (
            <EmptyState
              title="Sem dados de segmentação"
              description="Nenhum dado de segmentação de clientes disponível."
              icon={AlertTriangle}
            />
          ) : (
            <>
              {/* Period Info */}
              <Alert className="border-blue-200 bg-blue-50">
                <Calendar className="h-4 w-4 text-blue-600" />
                <AlertTitle>Período: Todo o histórico (fonte: banco de dados)</AlertTitle>
                <AlertDescription>
                  Análise completa desde a primeira transação registrada
                </AlertDescription>
              </Alert>

              {/* Segmentation Charts */}
              <div className="grid grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Distribuição de Clientes</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <CustomerSegmentationChart data={segments} />
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Receita por Segmento</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <SegmentRevenueChart data={segments} />
                  </CardContent>
                </Card>
              </div>

              {/* Segment Detail Table */}
              <Card>
                <CardHeader>
                  <CardTitle>Detalhamento por Segmento</CardTitle>
                </CardHeader>
                <CardContent>
                  <SegmentDetailTable data={segments} />
                </CardContent>
              </Card>

              {/* Separator */}
              <div className="border-t my-6" />

              {/* Churn KPIs */}
              {churnMetrics && (
                <div className="grid grid-cols-5 gap-4">
                  <KPITooltip
                    title="Taxa de Churn"
                    value={(churnMetrics.taxaChurn * 100).toFixed(1)}
                    unit="%"
                    icon={<Percent className="w-4 h-4" />}
                    description="Percentual de clientes inativos"
                  />
                  <KPITooltip
                    title="Clientes Ativos"
                    value={churnMetrics.clientesAtivos}
                    icon={<UserCheck className="w-4 h-4" />}
                    description="Clientes com compras recentes"
                  />
                  <KPITooltip
                    title="Em Risco"
                    value={churnMetrics.clientesEmRisco}
                    icon={<AlertTriangle className="w-4 h-4" />}
                    description="Clientes com inatividade"
                  />
                  <KPITooltip
                    title="Inativos"
                    value={churnMetrics.clientesInativos}
                    icon={<UserMinus className="w-4 h-4" />}
                    description="Sem atividade há muito tempo"
                  />
                  <KPITooltip
                    title="Valor em Risco"
                    value={formatCurrency(
                      (churnRiskCustomers || []).reduce((sum, c) => sum + (c.valorTotal || 0), 0)
                    )}
                    icon={<DollarSign className="w-4 h-4" />}
                    description="LTV dos clientes em risco"
                  />
                </div>
              )}

              {/* Churn Funnel */}
              <Card>
                <CardHeader>
                  <CardTitle>Funil de Churn</CardTitle>
                </CardHeader>
                <CardContent>
                  {churnMetrics && (
                    <ChurnFunnelChart
                      data={{
                        totalClientes: churnMetrics.totalClientes,
                        clientesAtivos: churnMetrics.clientesAtivos,
                        clientesEmRisco: churnMetrics.clientesEmRisco,
                        clientesInativos: churnMetrics.clientesInativos,
                      }}
                    />
                  )}
                </CardContent>
              </Card>

              {/* Churn Risk Table */}
              <Card>
                <CardHeader>
                  <CardTitle>Clientes em Risco</CardTitle>
                  <CardDescription>
                    Top clientes com maior valor em risco de churn
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ChurnRiskTable data={churnRiskCustomers || []} />
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>

        {/* ====================================================================
            TAB 4: VOLUME & PADRÕES
            ==================================================================== */}
        <TabsContent value="volume" className="space-y-6">
          {!filteredB2COrders || filteredB2COrders.length === 0 ? (
            <EmptyState
              title="Sem dados de volume"
              description="Nenhum pedido B2C encontrado para o período selecionado."
              icon={AlertTriangle}
            />
          ) : (
            <>
              {/* Volume KPI Cards */}
              {volumeAnalysis && (
                <VolumeKPICards
                  data={{
                    daily: volumeAnalysis.daily,
                    weekly: volumeAnalysis.weekly,
                    monthly: volumeAnalysis.monthly,
                    quarterly: volumeAnalysis.quarterly,
                  }}
                />
              )}

              {/* Order Volume Chart with Timeframe Toggle */}
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle>Volume de Pedidos</CardTitle>
                    <CardDescription>
                      {volumeTimeframe === "daily" && "Diário"}
                      {volumeTimeframe === "weekly" && "Semanal"}
                      {volumeTimeframe === "monthly" && "Mensal"}
                      {volumeTimeframe === "quarterly" && "Trimestral"}
                    </CardDescription>
                  </div>
                  <Select value={volumeTimeframe} onValueChange={setVolumeTimeframe}>
                    <SelectTrigger className="w-40">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="daily">Diário</SelectItem>
                      <SelectItem value="weekly">Semanal</SelectItem>
                      <SelectItem value="monthly">Mensal</SelectItem>
                      <SelectItem value="quarterly">Trimestral</SelectItem>
                    </SelectContent>
                  </Select>
                </CardHeader>
                <CardContent>
                  {volumeAnalysis && (
                    <OrderVolumeChart
                      data={volumeAnalysis[volumeTimeframe as keyof typeof volumeAnalysis] || []}
                      timeframe={volumeTimeframe}
                    />
                  )}
                </CardContent>
              </Card>

              {/* Sales Peaks Chart */}
              <Card>
                <CardHeader>
                  <CardTitle>Dias de Pico</CardTitle>
                  <CardDescription>
                    Identificação de padrões de vendas por dia da semana
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {salesPeaks && <SalesPeaksChart data={salesPeaks} />}
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
