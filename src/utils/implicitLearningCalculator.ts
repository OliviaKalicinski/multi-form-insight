// ============================================
// IMPLICIT LEARNING CALCULATOR - Etapa 6
// ============================================
// Funções puras para computar perfil de decisão do usuário.
// 
// FRASE-GUIA:
// "O sistema aprende, mas não age como se soubesse."
//
// Este módulo APENAS observa. Nenhum output daqui
// pode ser usado para alterar comportamento visível.
// ============================================

import { DecisionEvent } from '@/types/decisions';
import {
  UserDecisionProfile,
  InteractionStyleTendency,
  ProfileMaturity,
  DecisionLatencyPattern,
  CategoryEngagement,
  MetricEngagement,
  PROFILE_RELIABILITY_CRITERIA,
  LATENCY_THRESHOLDS,
  INTERACTION_STYLE_THRESHOLDS,
} from '@/types/implicitLearning';

/**
 * Calcula o número de ciclos mensais observados baseado nos eventos.
 */
function calculateCyclesObserved(events: DecisionEvent[], now: Date): number {
  if (events.length === 0) return 0;
  
  const dates = events.map(e => e.generatedAt.getTime());
  const earliest = Math.min(...dates);
  const monthsSpan = (now.getTime() - earliest) / (1000 * 60 * 60 * 24 * 30);
  
  return Math.floor(monthsSpan);
}

/**
 * Calcula a latência média de decisões explícitas (em horas).
 */
function calculateAverageLatency(events: DecisionEvent[]): number {
  const explicitDecisions = events.filter(
    e => (e.status === 'ACCEPTED' || e.status === 'REJECTED') && e.statusChangedAt
  );
  
  if (explicitDecisions.length === 0) return 0;
  
  const totalLatencyMs = explicitDecisions.reduce((sum, event) => {
    const latency = event.statusChangedAt!.getTime() - event.generatedAt.getTime();
    return sum + latency;
  }, 0);
  
  return (totalLatencyMs / explicitDecisions.length) / (1000 * 60 * 60); // ms to hours
}

/**
 * Infere o padrão de latência baseado na média.
 */
function inferLatencyPattern(
  avgLatencyHours: number, 
  explicitDecisionCount: number
): DecisionLatencyPattern {
  if (explicitDecisionCount < LATENCY_THRESHOLDS.minDecisionsForPattern) {
    return 'insufficient_data';
  }
  
  if (avgLatencyHours < LATENCY_THRESHOLDS.fast) {
    return 'fast';
  }
  
  if (avgLatencyHours <= LATENCY_THRESHOLDS.moderate) {
    return 'moderate';
  }
  
  return 'slow';
}

/**
 * Calcula a taxa de decisões explícitas vs expirações.
 */
function calculateExplicitDecisionRate(events: DecisionEvent[]): number {
  const resolved = events.filter(e => e.status !== 'PENDING');
  if (resolved.length === 0) return 0;
  
  const explicit = resolved.filter(
    e => e.status === 'ACCEPTED' || e.status === 'REJECTED'
  );
  
  return explicit.length / resolved.length;
}

/**
 * Calcula engajamento por categoria.
 */
function calculateCategoryEngagement(
  events: DecisionEvent[]
): Record<string, CategoryEngagement> {
  const byCategory: Record<string, DecisionEvent[]> = {};
  
  events.forEach(event => {
    const category = event.category;
    if (!byCategory[category]) {
      byCategory[category] = [];
    }
    byCategory[category].push(event);
  });
  
  const engagement: Record<string, CategoryEngagement> = {};
  
  Object.entries(byCategory).forEach(([category, categoryEvents]) => {
    const explicit = categoryEvents.filter(
      e => (e.status === 'ACCEPTED' || e.status === 'REJECTED') && e.statusChangedAt
    );
    
    const totalLatencyHours = explicit.reduce((sum, e) => {
      const latency = e.statusChangedAt!.getTime() - e.generatedAt.getTime();
      return sum + (latency / (1000 * 60 * 60));
    }, 0);
    
    engagement[category] = {
      totalPresented: categoryEvents.length,
      explicitDecisions: explicit.length,
      avgLatencyHours: explicit.length > 0 ? totalLatencyHours / explicit.length : 0,
    };
  });
  
  return engagement;
}

/**
 * Calcula engajamento por métrica.
 */
function calculateMetricEngagement(
  events: DecisionEvent[]
): Record<string, MetricEngagement> {
  const byMetric: Record<string, DecisionEvent[]> = {};
  
  events.forEach(event => {
    const metric = event.basedOnMetric;
    if (!byMetric[metric]) {
      byMetric[metric] = [];
    }
    byMetric[metric].push(event);
  });
  
  const engagement: Record<string, MetricEngagement> = {};
  
  Object.entries(byMetric).forEach(([metric, metricEvents]) => {
    const explicit = metricEvents.filter(
      e => e.status === 'ACCEPTED' || e.status === 'REJECTED'
    );
    const accepted = explicit.filter(e => e.status === 'ACCEPTED');
    
    engagement[metric] = {
      totalPresented: metricEvents.length,
      explicitDecisions: explicit.length,
      acceptanceRate: explicit.length > 0 ? accepted.length / explicit.length : 0,
    };
  });
  
  return engagement;
}

/**
 * Determina o nível de maturidade do perfil.
 */
function determineMaturity(
  totalEvents: number,
  totalExplicitDecisions: number,
  cyclesObserved: number
): ProfileMaturity {
  const { minCycles, minExplicitDecisions, minTotalEvents } = PROFILE_RELIABILITY_CRITERIA;
  
  // Stable: todos os critérios atingidos
  if (
    cyclesObserved >= minCycles &&
    totalExplicitDecisions >= minExplicitDecisions &&
    totalEvents >= minTotalEvents
  ) {
    return 'stable';
  }
  
  // Emerging: alguns critérios parcialmente atingidos
  if (totalEvents >= 5 || cyclesObserved >= 1) {
    return 'emerging';
  }
  
  return 'nascent';
}

/**
 * Verifica se o perfil é confiável para inferências.
 */
function isProfileReliable(
  totalEvents: number,
  totalExplicitDecisions: number,
  cyclesObserved: number
): boolean {
  const { minCycles, minExplicitDecisions, minTotalEvents } = PROFILE_RELIABILITY_CRITERIA;
  
  return (
    cyclesObserved >= minCycles &&
    totalExplicitDecisions >= minExplicitDecisions &&
    totalEvents >= minTotalEvents
  );
}

/**
 * Computa o perfil de decisão do usuário a partir dos eventos.
 * 
 * @description
 * Esta função é OBSERVACIONAL. O perfil resultante NÃO pode ser usado
 * para alterar ranking, frequência, visibilidade ou linguagem.
 * 
 * "O sistema aprende, mas não age como se soubesse."
 */
export function computeUserDecisionProfile(
  userId: string,
  events: DecisionEvent[],
  now: Date = new Date()
): UserDecisionProfile {
  const totalEventsObserved = events.length;
  
  const explicitDecisions = events.filter(
    e => e.status === 'ACCEPTED' || e.status === 'REJECTED'
  );
  const totalExplicitDecisions = explicitDecisions.length;
  
  const cyclesObserved = calculateCyclesObserved(events, now);
  const avgLatencyHours = calculateAverageLatency(events);
  const explicitDecisionRate = calculateExplicitDecisionRate(events);
  
  const maturityLevel = determineMaturity(
    totalEventsObserved,
    totalExplicitDecisions,
    cyclesObserved
  );
  
  const isReliable = isProfileReliable(
    totalEventsObserved,
    totalExplicitDecisions,
    cyclesObserved
  );
  
  return {
    userId,
    computedAt: now,
    
    decisionLatencyPattern: inferLatencyPattern(avgLatencyHours, totalExplicitDecisions),
    avgLatencyHours,
    
    explicitDecisionRate,
    
    categoryEngagement: calculateCategoryEngagement(events),
    metricEngagement: calculateMetricEngagement(events),
    
    maturityLevel,
    totalCyclesObserved: cyclesObserved,
    totalEventsObserved,
    totalExplicitDecisions,
    
    isReliable,
    
    lastUpdated: now,
  };
}

/**
 * Infere a tendência de estilo de interação do usuário.
 * 
 * @description
 * Esta inferência é DESCRITIVA, não PRESCRITIVA.
 * O resultado NÃO pode ser usado para adaptar o sistema.
 * 
 * Lógica de inferência:
 * - UNKNOWN: perfil não confiável
 * - DIRECT_PREFERENCE: fast + alta taxa decisão explícita (> 80%)
 * - DELIBERATIVE: slow + taxa moderada (50-80%)
 * - SELECTIVE: alta rejeição explícita (> 60% das decisões)
 * - PASSIVE: baixa taxa decisão explícita (< 40%)
 */
export function inferInteractionStyle(
  profile: UserDecisionProfile
): InteractionStyleTendency {
  // Perfil não confiável = estilo desconhecido
  if (!profile.isReliable) {
    return 'UNKNOWN';
  }
  
  const { 
    highExplicitRate, 
    moderateExplicitRate, 
    lowExplicitRate,
    highRejectionRate,
  } = INTERACTION_STYLE_THRESHOLDS;
  
  // Calcular taxa de rejeição entre decisões explícitas
  const totalAccepted = Object.values(profile.metricEngagement)
    .reduce((sum, m) => sum + (m.acceptanceRate * m.explicitDecisions), 0);
  const totalExplicit = profile.totalExplicitDecisions;
  const acceptanceRate = totalExplicit > 0 ? totalAccepted / totalExplicit : 0;
  const rejectionRate = 1 - acceptanceRate;
  
  // SELECTIVE: alta taxa de rejeição
  if (rejectionRate > highRejectionRate) {
    return 'SELECTIVE';
  }
  
  // PASSIVE: baixa taxa de decisão explícita
  if (profile.explicitDecisionRate < lowExplicitRate) {
    return 'PASSIVE';
  }
  
  // DIRECT_PREFERENCE: rápido + alta taxa explícita
  if (
    profile.decisionLatencyPattern === 'fast' &&
    profile.explicitDecisionRate > highExplicitRate
  ) {
    return 'DIRECT_PREFERENCE';
  }
  
  // DELIBERATIVE: lento + taxa moderada
  if (
    profile.decisionLatencyPattern === 'slow' &&
    profile.explicitDecisionRate >= moderateExplicitRate
  ) {
    return 'DELIBERATIVE';
  }
  
  // Padrões mistos ou não classificáveis
  return 'UNKNOWN';
}

// ============================================
// CONTRATO ÉTICO - LEMBRETE FINAL
// ============================================
// 
// As funções acima computam estados LATENTES.
// Esses estados NÃO podem ser usados para:
//   - Reordenar recomendações
//   - Filtrar ou esconder recomendações
//   - Alterar linguagem ou postura
//   - Mudar thresholds ou benchmarks
//   - Adicionar fricção ou confirmações
//
// O sistema observa, mas não reage.
// O sistema aprende, mas não age como se soubesse.
//
// ============================================
