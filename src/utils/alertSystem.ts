import { CriticalAlert, ExecutiveMetrics } from "@/types/executive";
import { SectorBenchmarks } from "@/hooks/useAppSettings";
import { 
  MetricNature, 
  canGenerateAlert, 
  createDefaultAuthority,
  canGenerateTemporalAlert,
  requiresTemporalWarning,
  TemporalConfidence
} from "@/types/metricNature";
import { addDays } from "date-fns";

// ============================================
// ALERTAS TEMPORAIS (exceção documentada)
// ============================================
// Alertas de Receita e Ticket Médio são TEMPORAIS:
// - Comparam período atual vs período anterior
// - Permitidos mesmo para métricas OBSERVATIONAL
// - NUNCA geram recomendações
// - São sinalizações, não decisões
// ============================================

/**
 * Verifica se pode gerar alerta crítico
 * - Benchmark deve existir e ser > 0
 * - Métrica deve ser REAL (não estimada)
 * - Confiança temporal deve ser suficiente
 */
const canGenerateCriticalAlert = (
  benchmarks: SectorBenchmarks,
  benchmarkKey: keyof SectorBenchmarks,
  metricNature?: MetricNature,
  temporalConfidence?: TemporalConfidence
): { canAlert: boolean; isDowngraded: boolean } => {
  const benchmarkValue = benchmarks[benchmarkKey];
  
  // Benchmark deve existir e não ser null/undefined/0
  if (benchmarkValue === null || benchmarkValue === undefined || benchmarkValue === 0) {
    return { canAlert: false, isDowngraded: false };
  }
  
  // Se natureza da métrica informada, deve ser REAL para alerta crítico
  if (metricNature && metricNature !== 'REAL') {
    return { canAlert: false, isDowngraded: false };
  }
  
  // Verificar confiança temporal
  if (temporalConfidence && !canGenerateTemporalAlert(temporalConfidence)) {
    // Dados insuficientes - não gerar alerta crítico
    return { canAlert: false, isDowngraded: true };
  }
  
  // Se STABILIZING, pode alertar mas com aviso
  const isDowngraded = temporalConfidence ? requiresTemporalWarning(temporalConfidence) : false;
  
  return { canAlert: true, isDowngraded };
};

/**
 * Gera alertas baseados nas métricas executivas
 * REGRA: Se benchmark === null/undefined → NÃO gerar alerta
 * @param atual - Métricas do período atual
 * @param anterior - Métricas do período anterior
 * @param benchmarks - Benchmarks do setor (de app_settings)
 */
export const gerarAlertas = (
  atual: ExecutiveMetrics,
  anterior: ExecutiveMetrics,
  benchmarks: SectorBenchmarks
): CriticalAlert[] => {
  const alertas: CriticalAlert[] = [];
  const meta = atual._meta;
  const authority = atual._authority || createDefaultAuthority();
  const temporal = atual._temporal;
  
  // 🔴 CRÍTICO: ROAS < 0.8x
  // REGRA: Só gera se benchmark.roasMedio existir E authority permite E temporal permite
  if (atual.marketing.roasAds < 0.8 && benchmarks.roasMedio) {
    // Verificar autoridade - ROAS é DECISIONAL, pode alertar
    if (!canGenerateAlert(authority.roasAds)) {
      // Skip - métrica não tem permissão para alertar
    } else {
      const marketingConfidence = temporal?.marketing.confidence || 'STABLE';
      const { canAlert, isDowngraded } = canGenerateCriticalAlert(
        benchmarks, 
        'roasMedio', 
        meta?.roasAds,
        marketingConfidence
      );
      
      // Se temporal INSUFFICIENT, criar alerta info em vez de crítico
      if (!canAlert && !canGenerateTemporalAlert(marketingConfidence)) {
        alertas.push({
          id: 'roas-critico-temporal',
          severity: 'info',
          category: 'marketing',
          alertType: 'benchmark',
          title: `ROAS Baixo (${temporal?.marketing.label || 'dados iniciais'})`,
          metric: 'ROAS',
          current: atual.marketing.roasAds,
          benchmark: benchmarks.roasMedio,
          gap: ((atual.marketing.roasAds / benchmarks.roasMedio) - 1) * 100,
          impact: 'Aguardando maturação temporal para alerta',
          action: 'Monitorar tendência nos próximos dias',
          priority: 'medium',
          estimatedFix: 'N/A',
          deadline: addDays(new Date(), 30),
        });
      } else if (canAlert) {
        const roasBenchmark = benchmarks.roasMedio;
        const prejuizo = atual.marketing.investimentoAds - atual.marketing.receitaAds;
        const gap = ((atual.marketing.roasAds / roasBenchmark) - 1) * 100;
        
        // Se STABILIZING, adicionar aviso no título
        const titleSuffix = isDowngraded ? ` (${temporal?.marketing.label})` : '';
        
        alertas.push({
          id: 'roas-critico',
          severity: isDowngraded ? 'warning' : 'critical',
          category: 'marketing',
          alertType: 'benchmark',
          title: `ROAS de Anúncios Abaixo do Crítico${titleSuffix}`,
          metric: 'ROAS',
          current: atual.marketing.roasAds,
          benchmark: roasBenchmark,
          gap,
          impact: `Prejuízo de R$ ${(prejuizo / 1000).toFixed(1)}K no mês`,
          action: 'Pausar 60% das campanhas com ROAS < 0.8x e realocar budget para top performers',
          priority: isDowngraded ? 'high' : 'urgent',
          estimatedFix: '+R$ 12K/mês',
          deadline: addDays(new Date(), isDowngraded ? 14 : 7),
        });
      }
    }
  }
  
  // 🔴 CRÍTICO: Churn > 40%
  // REGRA: Só gera se benchmark.taxaChurn existir E authority permite E temporal permite
  if (atual.clientes.taxaChurn > 40 && benchmarks.taxaChurn) {
    // Verificar autoridade - Churn é DECISIONAL, pode alertar
    if (!canGenerateAlert(authority.taxaChurn)) {
      // Skip - métrica não tem permissão para alertar
    } else {
      const clientesConfidence = temporal?.clientes.confidence || 'STABLE';
      const { canAlert, isDowngraded } = canGenerateCriticalAlert(
        benchmarks, 
        'taxaChurn', 
        meta?.taxaChurn,
        clientesConfidence
      );
      
      if (!canAlert && !canGenerateTemporalAlert(clientesConfidence)) {
        alertas.push({
          id: 'churn-critico-temporal',
          severity: 'info',
          category: 'clientes',
          alertType: 'benchmark',
          title: `Churn Alto (${temporal?.clientes.label || 'dados iniciais'})`,
          metric: 'Churn',
          current: atual.clientes.taxaChurn,
          benchmark: benchmarks.taxaChurn,
          gap: ((atual.clientes.taxaChurn - benchmarks.taxaChurn) / benchmarks.taxaChurn) * 100,
          impact: 'Aguardando maturação temporal para alerta',
          action: 'Monitorar tendência nos próximos dias',
          priority: 'medium',
          estimatedFix: 'N/A',
          deadline: addDays(new Date(), 30),
        });
      } else if (canAlert) {
        const churnBenchmark = benchmarks.taxaChurn;
        const titleSuffix = isDowngraded ? ` (${temporal?.clientes.label})` : '';
        
        alertas.push({
          id: 'churn-critico',
          severity: isDowngraded ? 'warning' : 'critical',
          category: 'clientes',
          alertType: 'benchmark',
          title: `Taxa de Churn em Nível Crítico${titleSuffix}`,
          metric: 'Churn',
          current: atual.clientes.taxaChurn,
          benchmark: churnBenchmark,
          gap: ((atual.clientes.taxaChurn - churnBenchmark) / churnBenchmark) * 100,
          impact: `Perda de ${Math.round(atual.clientes.clientesAtivos * (atual.clientes.taxaChurn / 100))} clientes/mês`,
          action: 'Implementar programa de retenção + email marketing personalizado',
          priority: isDowngraded ? 'high' : 'urgent',
          estimatedFix: '-15pp de churn em 60 dias',
          deadline: addDays(new Date(), isDowngraded ? 21 : 14),
        });
      }
    }
  }
  
  // 🟡 ATENÇÃO: Queda de receita > 10% (TEMPORAL)
  // NOTA: Receita é OBSERVATIONAL, normalmente não gera alertas
  // Porém alertas TEMPORAIS são exceção pois comparam períodos, não benchmark
  const quedaReceita = ((atual.vendas.receita - anterior.vendas.receita) / anterior.vendas.receita) * 100;
  if (quedaReceita < -10 && anterior.vendas.receita > 0) {
    // Alerta temporal permitido mesmo para OBSERVATIONAL
    alertas.push({
      id: 'queda-receita',
      severity: 'warning',
      category: 'vendas',
      alertType: 'temporal', // Comparação temporal, não benchmark
      title: 'Queda Significativa na Receita',
      metric: 'Receita',
      current: atual.vendas.receita,
      benchmark: anterior.vendas.receita, // Benchmark é o mês anterior
      gap: quedaReceita,
      impact: `Perda de R$ ${((anterior.vendas.receita - atual.vendas.receita) / 1000).toFixed(1)}K vs mês anterior`,
      action: 'Revisar estratégia de precificação e campanhas promocionais',
      priority: 'high',
      estimatedFix: '+R$ 8K/mês',
      deadline: addDays(new Date(), 15),
    });
  }
  
  // 🟡 ATENÇÃO: CAC > R$ 400
  // REGRA: Só gera se benchmark.cac existir E authority permite E temporal permite
  if (atual.clientes.cac > 400 && benchmarks.cac) {
    // Verificar autoridade - CAC é DECISIONAL, pode alertar
    if (!canGenerateAlert(authority.cac)) {
      // Skip - métrica não tem permissão para alertar
    } else {
      const clientesConfidence = temporal?.clientes.confidence || 'STABLE';
      const { canAlert, isDowngraded } = canGenerateCriticalAlert(
        benchmarks, 
        'cac', 
        meta?.cac,
        clientesConfidence
      );
      
      if (!canAlert && !canGenerateTemporalAlert(clientesConfidence)) {
        alertas.push({
          id: 'cac-alto-temporal',
          severity: 'info',
          category: 'marketing',
          alertType: 'benchmark',
          title: `CAC Elevado (${temporal?.clientes.label || 'dados iniciais'})`,
          metric: 'CAC',
          current: atual.clientes.cac,
          benchmark: benchmarks.cac,
          gap: ((atual.clientes.cac - benchmarks.cac) / benchmarks.cac) * 100,
          impact: 'Aguardando maturação temporal para alerta',
          action: 'Monitorar tendência nos próximos dias',
          priority: 'medium',
          estimatedFix: 'N/A',
          deadline: addDays(new Date(), 30),
        });
      } else if (canAlert) {
        const cacBenchmark = benchmarks.cac;
        const titleSuffix = isDowngraded ? ` (${temporal?.clientes.label})` : '';
        
        alertas.push({
          id: 'cac-alto',
          severity: isDowngraded ? 'info' : 'warning',
          category: 'marketing',
          alertType: 'benchmark',
          title: `Custo de Aquisição Elevado${titleSuffix}`,
          metric: 'CAC',
          current: atual.clientes.cac,
          benchmark: cacBenchmark,
          gap: ((atual.clientes.cac - cacBenchmark) / cacBenchmark) * 100,
          impact: `R$ ${(atual.clientes.cac - cacBenchmark).toFixed(0)} acima do ideal por cliente`,
          action: 'Otimizar segmentação de audiência e testar canais de baixo custo',
          priority: isDowngraded ? 'medium' : 'high',
          estimatedFix: '-R$ 150 de CAC',
          deadline: addDays(new Date(), isDowngraded ? 45 : 30),
        });
      }
    }
  }
  
  // 🟡 ATENÇÃO: Ticket médio caindo (TEMPORAL)
  // NOTA: Ticket Médio é DIAGNOSTIC, pode gerar alertas
  const quedaTicket = ((atual.vendas.ticketMedioReal - anterior.vendas.ticketMedioReal) / anterior.vendas.ticketMedioReal) * 100;
  if (quedaTicket < -15 && anterior.vendas.ticketMedioReal > 0) {
    // Verificar autoridade - Ticket é DIAGNOSTIC, pode alertar
    if (canGenerateAlert(authority.ticketMedioReal)) {
      alertas.push({
        id: 'ticket-queda',
        severity: 'warning',
        category: 'vendas',
        alertType: 'temporal', // Comparação temporal, não benchmark
        title: 'Ticket Médio em Queda',
        metric: 'Ticket Médio',
        current: atual.vendas.ticketMedioReal,
        benchmark: anterior.vendas.ticketMedioReal, // Benchmark é o mês anterior
        gap: quedaTicket,
        impact: `R$ ${(anterior.vendas.ticketMedioReal - atual.vendas.ticketMedioReal).toFixed(2)} a menos por pedido`,
        action: 'Implementar estratégia de upsell/cross-sell e combos',
        priority: 'high',
        estimatedFix: '+R$ 30 no ticket médio',
        deadline: addDays(new Date(), 20),
      });
    }
  }
  
  // Ordenar por prioridade
  return alertas.sort((a, b) => {
    const prioridadeMap = { urgent: 3, high: 2, medium: 1 };
    return prioridadeMap[b.priority] - prioridadeMap[a.priority];
  });
};

// Calcular prioridade numérica para ordenação
export const calcularPrioridadeScore = (alert: CriticalAlert): number => {
  const severityScore = alert.severity === 'critical' ? 100 : alert.severity === 'warning' ? 50 : 25;
  const priorityScore = alert.priority === 'urgent' ? 50 : alert.priority === 'high' ? 30 : 10;
  const gapScore = Math.abs(alert.gap) * 0.5;
  
  return severityScore + priorityScore + gapScore;
};
