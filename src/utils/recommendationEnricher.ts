// ============================================
// RECOMMENDATION ENRICHER
// ============================================
// Enriquece recomendações com estado de decisão,
// permitindo que a UI mostre histórico e status.
// ============================================

import { Recommendation } from '@/types/executive';
import { DecisionEvent, DecisionStatus } from '@/types/decisions';

// Interface estendida para recomendações com estado de decisão
export interface EnrichedRecommendation extends Recommendation {
  // Estado de decisão (quando vinculado a um evento)
  decisionEventId?: string;
  decisionStatus?: DecisionStatus;
  
  // Histórico de rejeições (apenas REJECTED, não EXPIRED)
  // Semântica neutra: contagem de rejeições prévias
  priorRejectionCount: number;
  lastRejectedAt: Date | null;
  
  // Flag para UI
  hasDecisionHistory: boolean;
}

/**
 * Enriquece uma lista de recomendações com dados de decisão
 * 
 * @param recommendations Lista de recomendações do sistema
 * @param events Lista de eventos de decisão do usuário
 * @param currentPeriod Período atual (ex: "2026-01")
 * @param daysWindow Janela de dias para considerar rejeições anteriores
 */
export const enrichRecommendationsWithDecisionState = (
  recommendations: Recommendation[],
  events: DecisionEvent[],
  currentPeriod: string,
  daysWindow: number = 60
): EnrichedRecommendation[] => {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - daysWindow);

  return recommendations.map(rec => {
    // Encontrar todos os eventos relacionados a esta recomendação
    const relatedEvents = events.filter(e => e.recommendationId === rec.id);
    
    // Encontrar evento PENDING do período atual (se existir)
    const pendingEvent = relatedEvents.find(
      e => e.status === 'PENDING' && e.periodReference === currentPeriod
    );
    
    // Contar APENAS rejeições explícitas na janela de tempo
    // (não contar EXPIRED como rejeição para manter neutralidade semântica)
    const rejections = relatedEvents.filter(
      e => e.status === 'REJECTED' &&
           e.statusChangedAt &&
           e.statusChangedAt > cutoffDate
    );

    // Encontrar última rejeição
    const lastRejectedAt = rejections.length > 0
      ? rejections.sort((a, b) => 
          (b.statusChangedAt?.getTime() || 0) - (a.statusChangedAt?.getTime() || 0)
        )[0].statusChangedAt
      : null;

    return {
      ...rec,
      decisionEventId: pendingEvent?.id,
      decisionStatus: pendingEvent?.status,
      priorRejectionCount: rejections.length,
      lastRejectedAt,
      hasDecisionHistory: relatedEvents.length > 0,
    };
  });
};

/**
 * Filtra recomendações que ainda não foram decididas
 */
export const filterPendingRecommendations = (
  recommendations: EnrichedRecommendation[]
): EnrichedRecommendation[] => {
  return recommendations.filter(
    r => !r.decisionStatus || r.decisionStatus === 'PENDING'
  );
};

/**
 * Ordena recomendações por prioridade, considerando histórico
 * 
 * Critérios:
 * 1. Recomendações nunca decididas primeiro
 * 2. Recomendações com menos rejeições depois
 * 3. Por prioridade original
 */
export const sortByPriorityWithHistory = (
  recommendations: EnrichedRecommendation[]
): EnrichedRecommendation[] => {
  return [...recommendations].sort((a, b) => {
    // Primeiro: nunca decididas vêm primeiro
    if (a.hasDecisionHistory !== b.hasDecisionHistory) {
      return a.hasDecisionHistory ? 1 : -1;
    }
    
    // Segundo: menos rejeições primeiro
    if (a.previousRejections !== b.previousRejections) {
      return a.previousRejections - b.previousRejections;
    }
    
    // Terceiro: por prioridade original
    return a.prioridade - b.prioridade;
  });
};

/**
 * Gera mensagem de histórico para UI
 */
export const getHistoryMessage = (
  recommendation: EnrichedRecommendation,
  daysWindow: number = 60
): string | null => {
  if (recommendation.priorRejectionCount === 0) {
    return null;
  }

  const times = recommendation.priorRejectionCount === 1 ? 'vez' : 'vezes';
  return `Ignorada ${recommendation.priorRejectionCount} ${times} nos últimos ${daysWindow} dias`;
};

/**
 * Verifica se recomendação deve exibir aviso de histórico
 * (threshold configurável)
 */
export const shouldShowHistoryWarning = (
  recommendation: EnrichedRecommendation,
  threshold: number = 1
): boolean => {
  return recommendation.priorRejectionCount >= threshold;
};
