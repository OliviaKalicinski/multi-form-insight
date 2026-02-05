// ============================================
// DECISION INTERPRETATION - Etapa 5.2
// ============================================
// Camada semântica para nomear padrões no histórico.
// NÃO influencia geração, ordem ou prioridade.
// Existe apenas para descrição humana.
// ============================================

export type DecisionInterpretation =
  | 'NEVER_EVALUATED'      // Nunca teve evento registrado
  | 'RECENTLY_REJECTED'    // Última decisão foi REJECTED há < 30 dias
  | 'REPEATEDLY_REJECTED'  // 3+ rejeições nos últimos 60 dias
  | 'PREVIOUSLY_ACCEPTED'  // Última decisão foi ACCEPTED
  | 'MIXED_HISTORY'        // Histórico variado (aceites e rejeições)
  | 'STALE_PENDING';       // PENDING expirado ou muito antigo

// Labels em português para UI (discreto)
export const DecisionInterpretationLabels: Record<DecisionInterpretation, string> = {
  NEVER_EVALUATED: 'Nunca avaliada',
  RECENTLY_REJECTED: 'Rejeitada recentemente',
  REPEATEDLY_REJECTED: 'Rejeitada múltiplas vezes',
  PREVIOUSLY_ACCEPTED: 'Aceita anteriormente',
  MIXED_HISTORY: 'Histórico misto',
  STALE_PENDING: 'Pendente expirada',
};

// ============================================
// CONTRATO ÉTICO DA ETAPA 5.2
// ============================================
// DecisionInterpretation é DESCRITIVA, não PRESCRITIVA.
//
// PROIBIDO usar para:
//   - Ordenar recomendações
//   - Filtrar recomendações
//   - Bloquear exibição
//   - Alterar prioridade
//   - Reduzir frequência
//
// Se isso acontecer, a etapa está ERRADA.
// ============================================
