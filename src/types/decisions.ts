// ============================================
// DECISION EVENT TYPES - Etapa 4
// ============================================
// Sistema de rastreamento de decisões para recomendações.
// Permite registrar aceites, rejeições e expirações.
// ============================================

// ============================================
// PRINCÍPIO EPISTÊMICO DA ETAPA 4
// ============================================
// A pergunta que o sistema faz NÃO é:
//   "O usuário aceitou?"
//
// A pergunta correta é:
//   "O sistema estava certo para aquele contexto?"
//
// Isso evita:
//   - Sistema subserviente (busca aprovação)
//   - Sistema punitivo (julga rejeição)
//   - Sistema manipulador (otimiza aceitação)
//
// O sistema registra realidade, não julga.
// ============================================

// ============================================
// TIPOS FUTUROS (preparação - não implementados)
// ============================================
// ExpirationReason permitirá diferenciar:
// - TIMEOUT: 30 dias sem ação
// - SUPERSEDED: nova recomendação substituiu
// - CONTEXT_CHANGED: contexto de negócios mudou
//
// TODO (Etapa 5+): Migrar EXPIRED para usar este tipo
// Por enquanto, EXPIRED = TIMEOUT implicitamente.
// ============================================
export type ExpirationReason = 
  | 'TIMEOUT'          // Passou 30 dias sem ação
  | 'SUPERSEDED'       // Substituída por recomendação mais recente
  | 'CONTEXT_CHANGED'; // Condições de negócios mudaram

// Estados possíveis de uma decisão
export type DecisionStatus = 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'EXPIRED';

// Motivos de rejeição (opcionais - nunca forçar explicação)
export const RejectionReasons = {
  already_in_progress: 'Já em andamento',
  not_applicable_now: 'Não aplicável agora',
  disagree_with_premise: 'Discordo da premissa',
  lack_of_resources: 'Falta de recursos',
  other: 'Outro',
} as const;

export type RejectionReasonKey = keyof typeof RejectionReasons;

// Evento de decisão - nasce quando uma recomendação DECISIONAL/REAL/STABLE é exibida
export interface DecisionEvent {
  id: string;
  recommendationId: string;
  recommendationTitle: string;
  category: string;
  basedOnMetric: string;
  
  // Contexto de quando foi gerada
  generatedAt: Date;
  periodReference: string;
  metricValueAtGeneration: number | null;
  benchmarkAtGeneration: number | null;
  
  // Snapshot legível da métrica no momento da geração
  // Ex: "ROAS Ads = 0.74x" ou "Churn = 12.3%"
  metricSnapshotLabel?: string;
  
  // Estado atual
  status: DecisionStatus;
  statusChangedAt: Date | null;
  
  // expirationReason?: ExpirationReason; // TODO: Implementar na Etapa 5+
  
  // Feedback opcional (nunca obrigatório)
  rejectionReason?: RejectionReasonKey;
  userNotes?: string;
  
  // Rastreabilidade
  userId: string;
  expiresAt: Date;
  
  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}

// Formato do banco de dados (snake_case)
export interface DecisionEventRow {
  id: string;
  recommendation_id: string;
  recommendation_title: string;
  category: string;
  based_on_metric: string;
  generated_at: string;
  period_reference: string;
  metric_value_at_generation: number | null;
  benchmark_at_generation: number | null;
  status: string;
  status_changed_at: string | null;
  rejection_reason: string | null;
  user_notes: string | null;
  user_id: string;
  expires_at: string;
  created_at: string;
  updated_at: string;
}

// Memória agregada de decisões
export interface DecisionMemory {
  totalGenerated: number;
  byStatus: Record<DecisionStatus, number>;
  byMetric: {
    [metricKey: string]: {
      generated: number;
      accepted: number;
      rejected: number;
      expired: number;
      // ============================================
      // ATENÇÃO: acceptanceRate é informativo apenas.
      // NÃO usar para:
      //   - Reordenar recomendações
      //   - Filtrar recomendações
      //   - Reduzir frequência
      // 
      // O uso deste dado será definido na Etapa 5.
      // ============================================
      acceptanceRate: number;
    };
  };
  avgResponseTimeHours: number;
  lastUpdated: Date;
}

// Labels para UI
export const DecisionStatusLabels: Record<DecisionStatus, string> = {
  PENDING: 'Pendente',
  ACCEPTED: 'Aceita',
  REJECTED: 'Rejeitada',
  EXPIRED: 'Expirada',
};

// Cores semânticas para badges (usando classes Tailwind)
export const DecisionStatusColors: Record<DecisionStatus, string> = {
  PENDING: 'bg-blue-100 text-blue-800 border-blue-200',
  ACCEPTED: 'bg-green-100 text-green-800 border-green-200',
  REJECTED: 'bg-red-100 text-red-800 border-red-200',
  EXPIRED: 'bg-gray-100 text-gray-600 border-gray-200',
};

// Ícones para status
export const DecisionStatusIcons: Record<DecisionStatus, string> = {
  PENDING: '⏳',
  ACCEPTED: '✅',
  REJECTED: '❌',
  EXPIRED: '⌛',
};

// ============================================
// FUNÇÕES AUXILIARES
// ============================================

// Converter row do banco para interface do app
export const rowToDecisionEvent = (row: DecisionEventRow): DecisionEvent => ({
  id: row.id,
  recommendationId: row.recommendation_id,
  recommendationTitle: row.recommendation_title,
  category: row.category,
  basedOnMetric: row.based_on_metric,
  generatedAt: new Date(row.generated_at),
  periodReference: row.period_reference,
  metricValueAtGeneration: row.metric_value_at_generation || 0,
  benchmarkAtGeneration: row.benchmark_at_generation,
  status: row.status as DecisionStatus,
  statusChangedAt: row.status_changed_at ? new Date(row.status_changed_at) : null,
  rejectionReason: row.rejection_reason as RejectionReasonKey | undefined,
  userNotes: row.user_notes || undefined,
  userId: row.user_id,
  expiresAt: new Date(row.expires_at),
  createdAt: new Date(row.created_at),
  updatedAt: new Date(row.updated_at),
});

// Calcular expiração padrão (30 dias a partir de agora)
export const calculateExpirationDate = (daysFromNow: number = 30): Date => {
  const date = new Date();
  date.setDate(date.getDate() + daysFromNow);
  return date;
};

// Verificar se evento está expirado
export const isDecisionExpired = (event: DecisionEvent): boolean => {
  return event.status === 'PENDING' && new Date() > event.expiresAt;
};

// ============================================
// CONTRATO DE DECISÃO
// ============================================
// Um Decision Event só é criado quando a recomendação atende:
// 1. authority === DECISIONAL
// 2. nature === REAL
// 3. hasBenchmark === true
// 4. temporalConfidence === STABLE
//
// Isso garante que só rastreamos decisões sobre sugestões
// nas quais o sistema tinha legitimidade total.
// ============================================
