// ============================================
// DECISION INTERPRETER - Etapa 5.2
// ============================================
// Função pura para interpretar histórico de decisões.
// NÃO influencia geração, ordem ou prioridade.
// Existe apenas para nomear padrões de forma legível.
// ============================================

import { DecisionEvent } from '@/types/decisions';
import { DecisionInterpretation } from '@/types/decisionInterpretation';

/**
 * Interpreta o histórico de decisões de uma recomendação
 * 
 * IMPORTANTE: Esta função é DESCRITIVA, não PRESCRITIVA.
 * O resultado NÃO deve ser usado para ordenar, filtrar ou priorizar.
 * Existe apenas para nomear padrões de forma legível.
 * 
 * Regras de precedência:
 * 1. Sem eventos → NEVER_EVALUATED
 * 2. Evento PENDING expirado → STALE_PENDING
 * 3. 3+ REJECTED em 60 dias → REPEATEDLY_REJECTED
 * 4. Último REJECTED há < 30 dias → RECENTLY_REJECTED
 * 5. Último evento ACCEPTED → PREVIOUSLY_ACCEPTED
 * 6. Tem histórico mas não encaixa → MIXED_HISTORY
 */
export function interpretDecisionHistory(
  recommendationId: string,
  events: DecisionEvent[],
  now: Date = new Date()
): DecisionInterpretation {
  // Filtrar eventos desta recomendação
  const related = events.filter(e => e.recommendationId === recommendationId);
  
  // 1. Sem eventos → NEVER_EVALUATED
  if (related.length === 0) {
    return 'NEVER_EVALUATED';
  }
  
  // Calcular datas de corte
  const thirtyDaysAgo = new Date(now);
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  
  const sixtyDaysAgo = new Date(now);
  sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);
  
  // 2. Verificar PENDING expirado
  const stalePending = related.find(
    e => e.status === 'PENDING' && e.expiresAt < now
  );
  if (stalePending) {
    return 'STALE_PENDING';
  }
  
  // 3. Contar rejeições nos últimos 60 dias
  const recentRejections = related.filter(
    e => e.status === 'REJECTED' &&
         e.statusChangedAt &&
         e.statusChangedAt > sixtyDaysAgo
  );
  if (recentRejections.length >= 3) {
    return 'REPEATEDLY_REJECTED';
  }
  
  // 4. Ordenar por data para encontrar último evento decidido
  const decidedEvents = related.filter(
    e => e.status === 'ACCEPTED' || e.status === 'REJECTED'
  ).sort((a, b) => 
    (b.statusChangedAt?.getTime() || 0) - (a.statusChangedAt?.getTime() || 0)
  );
  
  const lastDecided = decidedEvents[0];
  
  if (lastDecided) {
    // 4. Última rejeição recente
    if (lastDecided.status === 'REJECTED' && 
        lastDecided.statusChangedAt && 
        lastDecided.statusChangedAt > thirtyDaysAgo) {
      return 'RECENTLY_REJECTED';
    }
    
    // 5. Último aceite
    if (lastDecided.status === 'ACCEPTED') {
      return 'PREVIOUSLY_ACCEPTED';
    }
  }
  
  // 6. Tem histórico mas não encaixa → MIXED_HISTORY
  return 'MIXED_HISTORY';
}
