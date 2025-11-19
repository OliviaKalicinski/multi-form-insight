import { useMemo } from "react";
import { useDashboard } from "@/contexts/DashboardContext";
import { HealthScoreCard } from "@/components/executive/HealthScoreCard";
import { CriticalAlertCard } from "@/components/executive/CriticalAlertCard";
import { RecommendationCard } from "@/components/executive/RecommendationCard";
import { ComparativeMetricCard } from "@/components/executive/ComparativeMetricCard";
import { TrendInsightCard } from "@/components/executive/TrendInsightCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { dadosMensais, getDadosMes, getUltimosTresMeses, benchmarksPetFood } from "@/data/executiveData";
import { calcularHealthScore, gerarComparacaoMoM, gerarAnaliseTrimestral, gerarInsights } from "@/utils/criticalAnalysis";
import { gerarAlertas } from "@/utils/alertSystem";
import { gerarRecomendacoes } from "@/utils/recommendationEngine";
import { FileText, TrendingUp, AlertTriangle, Target, BarChart3 } from "lucide-react";

export default function AnaliseCritica() {
  const { selectedMonth, setSelectedMonth } = useDashboard();
  
  // Obter meses disponíveis dos dados executivos
  const availableMonths = Object.keys(dadosMensais).sort().reverse();
  
  // Obter dados do mês atual e anterior
  const dadosAtual = useMemo(() => getDadosMes(selectedMonth), [selectedMonth]);
  
  const mesAnterior = useMemo(() => {
    const meses = Object.keys(dadosMensais).sort();
    const index = meses.indexOf(selectedMonth);
    return index > 0 ? meses[index - 1] : null;
  }, [selectedMonth]);
  
  const dadosAnterior = useMemo(() => mesAnterior ? getDadosMes(mesAnterior) : null, [mesAnterior]);
  
  // Cálculos
  const healthScore = useMemo(() => 
    dadosAtual ? calcularHealthScore(dadosAtual) : null, 
    [dadosAtual]
  );
  
  const comparacaoMoM = useMemo(() => 
    dadosAtual && dadosAnterior ? gerarComparacaoMoM(dadosAtual, dadosAnterior) : [], 
    [dadosAtual, dadosAnterior]
  );
  
  const alertas = useMemo(() => 
    dadosAtual && dadosAnterior ? gerarAlertas(dadosAtual, dadosAnterior) : [], 
    [dadosAtual, dadosAnterior]
  );
  
  const recomendacoes = useMemo(() => 
    dadosAtual && dadosAnterior ? gerarRecomendacoes(dadosAtual, dadosAnterior) : [], 
    [dadosAtual, dadosAnterior]
  );
  
  const insights = useMemo(() => 
    dadosAtual && dadosAnterior && healthScore ? gerarInsights(dadosAtual, dadosAnterior, healthScore) : [], 
    [dadosAtual, dadosAnterior, healthScore]
  );
  
  const analiseTrimestral = useMemo(() => {
    const meses = getUltimosTresMeses(selectedMonth);
    return gerarAnaliseTrimestral(meses, dadosMensais);
  }, [selectedMonth]);
  
  if (!dadosAtual) {
    return (
      <div className="container mx-auto px-6 py-8">
        <Card className="border-yellow-500 bg-yellow-50">
          <CardContent className="p-6">
            <p className="text-center text-muted-foreground">
              ⚠️ Dados não disponíveis para o mês selecionado: {selectedMonth}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }
  
  return (
    <div className="container mx-auto px-6 py-8 space-y-8">
      {/* HEADER */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold flex items-center gap-3">
            <FileText className="h-10 w-10 text-blue-600" />
            Análise Crítica Executiva
          </h1>
          <p className="text-muted-foreground mt-2">
            Insights estratégicos, alertas e recomendações acionáveis para o seu negócio
          </p>
        </div>
        <div className="w-80">
          <label className="text-sm font-medium mb-2 block">Período de Análise</label>
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="w-full border rounded-md px-3 py-2 text-sm"
          >
            {availableMonths.map((month) => (
              <option key={month} value={month}>
                {month}
              </option>
            ))}
          </select>
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
      {recomendacoes.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-4">
            <Target className="h-6 w-6 text-green-600" />
            <h2 className="text-2xl font-bold">Recomendações Prioritárias</h2>
            <span className="text-sm text-muted-foreground">(Top 5 por ROI)</span>
          </div>
          <div className="grid grid-cols-1 gap-4">
            {recomendacoes.slice(0, 5).map((rec, index) => (
              <RecommendationCard key={rec.id} recommendation={rec} rank={index + 1} />
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
              <div className="font-bold text-lg">{benchmarksPetFood.roasMedio}x</div>
            </div>
            <div className="bg-gray-50 rounded p-3">
              <div className="text-muted-foreground text-xs">Taxa Recompra</div>
              <div className="font-bold text-lg">{benchmarksPetFood.taxaRecompra}%</div>
            </div>
            <div className="bg-gray-50 rounded p-3">
              <div className="text-muted-foreground text-xs">LTV Médio</div>
              <div className="font-bold text-lg">R$ {benchmarksPetFood.ltv}</div>
            </div>
            <div className="bg-gray-50 rounded p-3">
              <div className="text-muted-foreground text-xs">CAC Ideal</div>
              <div className="font-bold text-lg">R$ {benchmarksPetFood.cac}</div>
            </div>
          </div>
          <p className="text-xs text-muted-foreground mt-3">
            Fonte: {benchmarksPetFood.fonte}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
