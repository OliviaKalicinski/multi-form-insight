// ============================================
// IMPLICIT LEARNING TYPES - Etapa 6
// ============================================
// Estados latentes de observação de padrões.
// NÃO influenciam comportamento visível do sistema.
// Existem para etapas futuras, sob novo contrato.
// ============================================

// FRASE-GUIA (incluir em toda documentação):
// "O sistema aprende, mas não age como se soubesse."

/**
 * Tendência de estilo de interação inferida do comportamento do usuário.
 * 
 * @description Este tipo é OBSERVACIONAL, não OPERACIONAL.
 * Não pode ser usado para alterar ranking, frequência, ou visibilidade.
 */
export type InteractionStyleTendency = 
  | 'UNKNOWN'           // Dados insuficientes
  | 'DIRECT_PREFERENCE' // Padrão: decisões rápidas, alta taxa explícita
  | 'DELIBERATIVE'      // Padrão: decisões lentas, múltiplas sessões
  | 'SELECTIVE'         // Padrão: alta taxa de rejeição explícita
  | 'PASSIVE';          // Padrão: muitas expirações, poucas decisões

/**
 * Nível de maturidade do perfil de decisão.
 */
export type ProfileMaturity = 'nascent' | 'emerging' | 'stable';

/**
 * Padrão de latência de decisão.
 */
export type DecisionLatencyPattern = 'fast' | 'moderate' | 'slow' | 'insufficient_data';

/**
 * Engajamento por categoria de recomendação.
 */
export interface CategoryEngagement {
  totalPresented: number;
  explicitDecisions: number;
  avgLatencyHours: number;
}

/**
 * Engajamento por métrica base de recomendação.
 */
export interface MetricEngagement {
  totalPresented: number;
  explicitDecisions: number;
  acceptanceRate: number;
}

/**
 * Perfil de decisão do usuário - estado latente de observação.
 * 
 * @description
 * "O sistema aprende, mas não age como se soubesse."
 * 
 * Este perfil é OBSERVACIONAL, não OPERACIONAL.
 * Ele descreve padrões de interação SEM influenciar o comportamento do sistema.
 * 
 * PROIBIDO usar para:
 *   - Reordenar recomendações
 *   - Filtrar recomendações
 *   - Esconder/suprimir exibição
 *   - Alterar linguagem ou tom
 *   - Mudar thresholds ou benchmarks
 *   - Adicionar fricção
 * 
 * Este estado existe APENAS para etapas futuras,
 * quando um novo contrato ético for estabelecido.
 */
export interface UserDecisionProfile {
  // Identificação
  userId: string;
  computedAt: Date;
  
  // Padrões de latência
  decisionLatencyPattern: DecisionLatencyPattern;
  avgLatencyHours: number;
  
  // Taxa de decisão explícita (vs expirações)
  explicitDecisionRate: number;
  
  // Engajamento por categoria
  categoryEngagement: Record<string, CategoryEngagement>;
  
  // Engajamento por métrica
  metricEngagement: Record<string, MetricEngagement>;
  
  // Maturidade do perfil
  maturityLevel: ProfileMaturity;
  totalCyclesObserved: number;
  totalEventsObserved: number;
  totalExplicitDecisions: number;
  
  // Confiabilidade
  isReliable: boolean;
  
  // Timestamps
  lastUpdated: Date;
}

// ============================================
// CONTRATO ÉTICO DA ETAPA 6
// ============================================
// 
// UserDecisionProfile é OBSERVACIONAL, não OPERACIONAL.
//
// O aprendizado implícito:
//   - Observa padrões
//   - Não reage a eventos isolados
//   - Nunca ajusta comportamento visível automaticamente
//
// Nada muda "porque o usuário rejeitou algo".
// Tudo só muda quando um padrão estável emerge,
// E MESMO ASSIM, não nesta etapa.
//
// O sistema aprende como um observador, não como um avaliador.
//
// ============================================

// Critérios mínimos para perfil confiável
export const PROFILE_RELIABILITY_CRITERIA = {
  minCycles: 3,           // >= 3 meses
  minExplicitDecisions: 5, // >= 5 decisões explícitas
  minTotalEvents: 10,      // >= 10 eventos observados
} as const;

// Thresholds de latência (em horas)
export const LATENCY_THRESHOLDS = {
  fast: 4,      // < 4h = fast
  moderate: 24, // 4-24h = moderate, > 24h = slow
  minDecisionsForPattern: 3, // mínimo de decisões para inferir padrão
} as const;

// Thresholds de estilo de interação
export const INTERACTION_STYLE_THRESHOLDS = {
  highExplicitRate: 0.8,    // > 80% = alta taxa explícita
  moderateExplicitRate: 0.5, // 50-80% = taxa moderada
  lowExplicitRate: 0.4,      // < 40% = baixa taxa
  highRejectionRate: 0.6,    // > 60% rejeição = seletivo
} as const;
