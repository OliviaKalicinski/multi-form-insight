import { CriticalAlert, ExecutiveMetrics } from "@/types/executive";
import { benchmarksPetFood } from "@/data/executiveData";
import { addDays } from "date-fns";

export const gerarAlertas = (
  atual: ExecutiveMetrics,
  anterior: ExecutiveMetrics
): CriticalAlert[] => {
  const alertas: CriticalAlert[] = [];
  
  // 🔴 CRÍTICO: ROAS < 0.8x
  if (atual.marketing.roasAds < 0.8) {
    const prejuizo = atual.marketing.investimentoAds - atual.marketing.receitaAds;
    const gap = ((atual.marketing.roasAds / benchmarksPetFood.roasMedio) - 1) * 100;
    
    alertas.push({
      id: 'roas-critico',
      severity: 'critical',
      category: 'marketing',
      title: 'ROAS de Anúncios Abaixo do Crítico',
      metric: 'ROAS',
      current: atual.marketing.roasAds,
      benchmark: benchmarksPetFood.roasMedio,
      gap,
      impact: `Prejuízo de R$ ${(prejuizo / 1000).toFixed(1)}K no mês`,
      action: 'Pausar 60% das campanhas com ROAS < 0.8x e realocar budget para top performers',
      priority: 'urgent',
      estimatedFix: '+R$ 12K/mês',
      deadline: addDays(new Date(), 7),
    });
  }
  
  // 🔴 CRÍTICO: Churn > 40%
  if (atual.clientes.taxaChurn > 40) {
    alertas.push({
      id: 'churn-critico',
      severity: 'critical',
      category: 'clientes',
      title: 'Taxa de Churn em Nível Crítico',
      metric: 'Churn',
      current: atual.clientes.taxaChurn,
      benchmark: benchmarksPetFood.taxaChurn,
      gap: ((atual.clientes.taxaChurn - benchmarksPetFood.taxaChurn) / benchmarksPetFood.taxaChurn) * 100,
      impact: `Perda de ${Math.round(atual.clientes.clientesAtivos * (atual.clientes.taxaChurn / 100))} clientes/mês`,
      action: 'Implementar programa de retenção + email marketing personalizado',
      priority: 'urgent',
      estimatedFix: '-15pp de churn em 60 dias',
      deadline: addDays(new Date(), 14),
    });
  }
  
  // 🟡 ATENÇÃO: Queda de receita > 10%
  const quedaReceita = ((atual.vendas.receita - anterior.vendas.receita) / anterior.vendas.receita) * 100;
  if (quedaReceita < -10) {
    alertas.push({
      id: 'queda-receita',
      severity: 'warning',
      category: 'vendas',
      title: 'Queda Significativa na Receita',
      metric: 'Receita',
      current: atual.vendas.receita,
      benchmark: anterior.vendas.receita,
      gap: quedaReceita,
      impact: `Perda de R$ ${((anterior.vendas.receita - atual.vendas.receita) / 1000).toFixed(1)}K vs mês anterior`,
      action: 'Revisar estratégia de precificação e campanhas promocionais',
      priority: 'high',
      estimatedFix: '+R$ 8K/mês',
      deadline: addDays(new Date(), 15),
    });
  }
  
  // 🟡 ATENÇÃO: CAC > R$ 400
  if (atual.clientes.cac > 400) {
    alertas.push({
      id: 'cac-alto',
      severity: 'warning',
      category: 'marketing',
      title: 'Custo de Aquisição Elevado',
      metric: 'CAC',
      current: atual.clientes.cac,
      benchmark: benchmarksPetFood.cac,
      gap: ((atual.clientes.cac - benchmarksPetFood.cac) / benchmarksPetFood.cac) * 100,
      impact: `R$ ${(atual.clientes.cac - benchmarksPetFood.cac).toFixed(0)} acima do ideal por cliente`,
      action: 'Otimizar segmentação de audiência e testar canais de baixo custo',
      priority: 'high',
      estimatedFix: '-R$ 150 de CAC',
      deadline: addDays(new Date(), 30),
    });
  }
  
  // 🟡 ATENÇÃO: Ticket médio caindo
  const quedaTicket = ((atual.vendas.ticketMedioReal - anterior.vendas.ticketMedioReal) / anterior.vendas.ticketMedioReal) * 100;
  if (quedaTicket < -15) {
    alertas.push({
      id: 'ticket-queda',
      severity: 'warning',
      category: 'vendas',
      title: 'Ticket Médio em Queda',
      metric: 'Ticket Médio',
      current: atual.vendas.ticketMedioReal,
      benchmark: anterior.vendas.ticketMedioReal,
      gap: quedaTicket,
      impact: `R$ ${(anterior.vendas.ticketMedioReal - atual.vendas.ticketMedioReal).toFixed(2)} a menos por pedido`,
      action: 'Implementar estratégia de upsell/cross-sell e combos',
      priority: 'high',
      estimatedFix: '+R$ 30 no ticket médio',
      deadline: addDays(new Date(), 20),
    });
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
