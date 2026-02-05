import { useMemo, useEffect, useCallback } from "react";
import { useDashboard } from "@/contexts/DashboardContext";
import { useAppSettings } from "@/hooks/useAppSettings";
import { useDecisionEvents } from "@/hooks/useDecisionEvents";
import { HealthScoreCard } from "@/components/executive/HealthScoreCard";
import { CriticalAlertCard } from "@/components/executive/CriticalAlertCard";
import { RecommendationCard } from "@/components/executive/RecommendationCard";
import { ComparativeMetricCard } from "@/components/executive/ComparativeMetricCard";
import { TrendInsightCard } from "@/components/executive/TrendInsightCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { calcularHealthScore, gerarComparacaoMoM, gerarAnaliseTrimestral, gerarInsights } from "@/utils/criticalAnalysis";
import { gerarAlertas } from "@/utils/alertSystem";
import { gerarRecomendacoes } from "@/utils/recommendationEngine";
import { enrichRecommendationsWithDecisionState, EnrichedRecommendation } from "@/utils/recommendationEnricher";
import { calculateExecutiveMetrics, filterOrdersByMonth, filterAdsByMonth } from "@/utils/executiveMetricsCalculator";
import { FileText, TrendingUp, AlertTriangle, Target, BarChart3 } from "lucide-react";
import { ExecutiveMetrics, Recommendation } from "@/types/executive";
import { RejectionReasonKey } from "@/types/decisions";
import { canGenerateFullRecommendation, canGenerateTemporalRecommendation } from "@/types/metricNature";

export default function AnaliseCritica() {
  const { selectedMonth, availableMonths, salesData, adsData } = useDashboard();
  const { sectorBenchmarks } = useAppSettings();
  const { 
    events, 
    registerRecommendation, 
    accept, 
    reject,
    expireOldEvents,
    loading: loadingDecisions 
  } = useDecisionEvents();
  
  // Expirar eventos antigos ao carregar
  useEffect(() => {
    if (!loadingDecisions) {
      expireOldEvents();
    }
  }, [loadingDecisions, expireOldEvents]);
  
  // Calcular dados do mês atual a partir dos dados reais
  const dadosAtual = useMemo(() => {
    const ordersThisMonth = filterOrdersByMonth(salesData, selectedMonth);
    const adsThisMonth = filterAdsByMonth(adsData, selectedMonth);
    return calculateExecutiveMetrics(ordersThisMonth, adsThisMonth, selectedMonth);
  }, [salesData, adsData, selectedMonth]);
  
  // Calcular mês anterior
  const mesAnterior = useMemo(() => {
    const meses = availableMonths.sort();
    const index = meses.indexOf(selectedMonth);
    return index > 0 ? meses[index - 1] : null;
  }, [availableMonths, selectedMonth]);
  
  const dadosAnterior = useMemo(() => {
    if (!mesAnterior) return null;
    const ordersLastMonth = filterOrdersByMonth(salesData, mesAnterior);
    const adsLastMonth = filterAdsByMonth(adsData, mesAnterior);
    return calculateExecutiveMetrics(ordersLastMonth, adsLastMonth, mesAnterior);
  }, [salesData, adsData, mesAnterior]);
  
  // Cálculos
  const healthScore = useMemo(() => 
    dadosAtual ? calcularHealthScore(dadosAtual, sectorBenchmarks) : null, 
    [dadosAtual, sectorBenchmarks]
  );
  
  const comparacaoMoM = useMemo(() => 
    dadosAtual && dadosAnterior ? gerarComparacaoMoM(dadosAtual, dadosAnterior) : [], 
    [dadosAtual, dadosAnterior]
  );
  
  const alertas = useMemo(() => 
    dadosAtual && dadosAnterior ? gerarAlertas(dadosAtual, dadosAnterior, sectorBenchmarks) : [], 
    [dadosAtual, dadosAnterior, sectorBenchmarks]
  );
  
  // Gerar e enriquecer recomendações com estado de decisão
  const recomendacoesEnriquecidas = useMemo(() => {
    if (!dadosAtual || !dadosAnterior) return [];
    
    const recsRaw = gerarRecomendacoes(dadosAtual, dadosAnterior, sectorBenchmarks);
    
    // Enriquecer com histórico de decisões
    return enrichRecommendationsWithDecisionState(
      recsRaw,
      events,
      selectedMonth,
      60 // janela de 60 dias para histórico
    );
  }, [dadosAtual, dadosAnterior, sectorBenchmarks, events, selectedMonth]);
  
  // Registrar novas recomendações como PENDING
  useEffect(() => {
    if (loadingDecisions || !dadosAtual) return;
    
    const registerNewRecommendations = async () => {
      for (const rec of recomendacoesEnriquecidas) {
        // Só registrar se ainda não tem evento PENDING
        if (rec.decisionEventId) continue;
        
        // Verificar se a recomendação atende aos critérios de rastreamento
        // (DECISIONAL + REAL + BENCHMARK + STABLE)
        const authority = dadosAtual._authority;
        const temporal = dadosAtual._temporal;
        
        if (!authority || !temporal) continue;
        
        // Verificar autoridade da métrica base
        const metricKey = rec.basedOnMetric;
        if (!metricKey) continue;
        
        // Obter categoria da métrica
        const category = rec.category as 'marketing' | 'vendas' | 'clientes' | 'produtos' | 'operacoes';
        const temporalConfidence = temporal[category]?.confidence || 'STABLE';
        
        // Só registrar se temporal é STABLE
        if (!canGenerateTemporalRecommendation(temporalConfidence)) continue;
        
        // Registrar o evento
        await registerRecommendation({
          recommendation: rec as Recommendation,
          periodReference: selectedMonth,
          metricValue: 0, // Valor seria calculado baseado na métrica
          benchmark: null,
        });
      }
    };
    
    registerNewRecommendations();
  }, [recomendacoesEnriquecidas, loadingDecisions, dadosAtual, selectedMonth, registerRecommendation]);
  
  const insights = useMemo(() => 
    dadosAtual && dadosAnterior && healthScore ? gerarInsights(dadosAtual, dadosAnterior, healthScore, sectorBenchmarks) : [], 
    [dadosAtual, dadosAnterior, healthScore, sectorBenchmarks]
  );
  
  // Calcular análise trimestral
  const analiseTrimestral = useMemo(() => {
    const meses = availableMonths.sort();
    const index = meses.indexOf(selectedMonth);
    const ultimos3Meses = meses.slice(Math.max(0, index - 2), index + 1);
    
    // Calcular métricas para cada mês
    const dadosMensaisCalculados: Record<string, ExecutiveMetrics> = {};
    ultimos3Meses.forEach(mes => {
      const ordersMonth = filterOrdersByMonth(salesData, mes);
      const adsMonth = filterAdsByMonth(adsData, mes);
      const metrics = calculateExecutiveMetrics(ordersMonth, adsMonth, mes);
      if (metrics) {
        dadosMensaisCalculados[mes] = metrics;
      }
    });
    
    return gerarAnaliseTrimestral(ultimos3Meses, dadosMensaisCalculados);
  }, [selectedMonth, availableMonths, salesData, adsData]);
  
  // Handlers para aceitar/rejeitar recomendações
  const handleAccept = useCallback(async (eventId: string) => {
    await accept(eventId);
  }, [accept]);
  
  const handleReject = useCallback(async (eventId: string, reason?: RejectionReasonKey, notes?: string) => {
    await reject(eventId, reason, notes);
  }, [reject]);
  
  if (!dadosAtual) {
    return (
      <div className="container mx-auto px-6 py-8">
        <Card className="border-yellow-500 bg-yellow-50">
          <CardContent className="p-6">
            <p className="text-center text-muted-foreground">
              ⚠️ Sem dados de vendas ou anúncios para o mês selecionado: {selectedMonth}
            </p>
            <p className="text-center text-sm text-muted-foreground mt-2">
              Faça upload dos dados de vendas e/ou anúncios para visualizar a análise executiva.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }
  
  return (
    <div className="container mx-auto px-6 py-8 space-y-8">
      {/* HEADER */}
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold flex items-center gap-3">
              <FileText className="h-10 w-10 text-blue-600" />
              Análise Crítica Executiva
            </h1>
            <p className="text-muted-foreground mt-2">
              Insights estratégicos, alertas e recomendações acionáveis baseados nos seus dados reais
            </p>
          </div>
        </div>
        
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-sm text-blue-900">
            📊 <strong>Analisando:</strong> {selectedMonth} 
            {mesAnterior && <span className="ml-2">| <strong>Comparando com:</strong> {mesAnterior}</span>}
          </p>
          <p className="text-xs text-blue-700 mt-1">
            ✨ Métricas executivas calculadas automaticamente a partir dos seus dados de vendas e anúncios
          </p>
        </div>
      </div>
      
      {/* HEALTH SCORE */}
      {healthScore && (
        <div className="grid grid-cols-1 gap-6">
          <HealthScoreCard healthScore={healthScore} />
        </div>
      )}
      
      {/* ALERTAS CRÍTICOS */}
      {alertas.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-4">
            <AlertTriangle className="h-6 w-6 text-red-600" />
            <h2 className="text-2xl font-bold">Alertas Críticos</h2>
            <span className="text-sm text-muted-foreground">({alertas.length} alertas)</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {alertas.slice(0, 4).map(alerta => (
              <CriticalAlertCard key={alerta.id} alert={alerta} />
            ))}
          </div>
        </div>
      )}
      
      {/* RESUMO EXECUTIVO MoM */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp className="h-6 w-6 text-blue-600" />
          <h2 className="text-2xl font-bold">Resumo Executivo</h2>
          <span className="text-sm text-muted-foreground">
            {selectedMonth} vs {mesAnterior || 'N/A'}
          </span>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {comparacaoMoM.map(comp => (
            <ComparativeMetricCard key={comp.metric} comparison={comp} />
          ))}
        </div>
      </div>
      
      {/* PRINCIPAIS INSIGHTS */}
      {insights.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-4">
            <BarChart3 className="h-6 w-6 text-purple-600" />
            <h2 className="text-2xl font-bold">Principais Insights</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {insights.map((insight, index) => (
              <TrendInsightCard key={index} insight={insight} />
            ))}
          </div>
        </div>
      )}
      
      {/* RECOMENDAÇÕES PRIORITÁRIAS */}
      {recomendacoesEnriquecidas.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-4">
            <Target className="h-6 w-6 text-green-600" />
            <h2 className="text-2xl font-bold">Recomendações Prioritárias</h2>
            <span className="text-sm text-muted-foreground">(Top 5 por ROI)</span>
          </div>
          <div className="grid grid-cols-1 gap-4">
            {recomendacoesEnriquecidas.slice(0, 5).map((rec, index) => (
              <RecommendationCard 
                key={rec.id} 
                recommendation={rec as Recommendation} 
                rank={index + 1}
                onAccept={handleAccept}
                onReject={handleReject}
                showDecisionControls={!!rec.decisionEventId}
              />
            ))}
          </div>
        </div>
      )}
      
      {/* ANÁLISE TRIMESTRAL */}
      {analiseTrimestral.meses.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>📊 Análise Trimestral - Últimos 3 Meses</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                {analiseTrimestral.meses.map((mes, index) => (
                  <div key={mes} className="text-center">
                    <div className="text-sm text-muted-foreground">{mes}</div>
                    <div className="text-2xl font-bold">
                      R$ {(analiseTrimestral.metricas.receita[index] / 1000).toFixed(1)}K
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {analiseTrimestral.metricas.pedidos[index]} pedidos
                    </div>
                  </div>
                ))}
              </div>
              
              <div className="bg-gray-50 rounded p-4 mt-4">
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <div className="text-muted-foreground">Tendência</div>
                    <div className="font-bold capitalize">{analiseTrimestral.tendencia}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">Média Trimestral</div>
                    <div className="font-bold">R$ {(analiseTrimestral.media / 1000).toFixed(1)}K</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">Variação vs Média</div>
                    <div className={`font-bold ${analiseTrimestral.variacaoVsMedia > 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {analiseTrimestral.variacaoVsMedia > 0 ? '+' : ''}{analiseTrimestral.variacaoVsMedia.toFixed(1)}%
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
      
      {/* BENCHMARKS DO SETOR */}
      <Card>
        <CardHeader>
          <CardTitle>🎯 Benchmarks do Setor Pet Food</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div className="bg-gray-50 rounded p-3">
              <div className="text-muted-foreground text-xs">ROAS Ideal</div>
              <div className="font-bold text-lg">{sectorBenchmarks.roasMedio || 3.2}x</div>
            </div>
            <div className="bg-gray-50 rounded p-3">
              <div className="text-muted-foreground text-xs">Taxa Recompra</div>
              <div className="font-bold text-lg">{sectorBenchmarks.taxaRecompra || 38}%</div>
            </div>
            <div className="bg-gray-50 rounded p-3">
              <div className="text-muted-foreground text-xs">LTV Médio</div>
              <div className="font-bold text-lg">R$ {sectorBenchmarks.ltv || 420}</div>
            </div>
            <div className="bg-gray-50 rounded p-3">
              <div className="text-muted-foreground text-xs">CAC Ideal</div>
              <div className="font-bold text-lg">R$ {sectorBenchmarks.cac || 45}</div>
            </div>
          </div>
          <p className="text-xs text-muted-foreground mt-3">
            Fonte: {sectorBenchmarks.fonte || "Relatório Mercado Pet Brasil 2024"}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
