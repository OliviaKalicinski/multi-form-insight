

# Plano: Responsabilidade e Memoria de Decisao (Etapa 4)

## Objetivo
Criar um sistema de eventos de decisao que transforma recomendacoes de "sugestoes descartaveis" em contratos rastreados, onde o sistema lembra o que sugeriu, o que foi aceito/rejeitado, e aprende a calibrar sua propria credibilidade.

---

## MODELO MENTAL

### Principio Fundador
Recomendacao sem responsabilidade vira ruido.

O sistema nao mede apenas metricas. Ele mede decisoes tomadas em relacao as metricas.

### Decision Event
Um Decision Event nasce SOMENTE quando uma recomendacao:
- E baseada em metrica DECISIONAL
- Usa dados REAL
- Tem BENCHMARK configurado
- Tem confianca temporal STABLE

Ou seja: so quando o sistema tinha legitimidade total para sugerir.

---

## BLOCO 1: Estrutura de Dados

### 1.1 Novo tipo DecisionStatus

```text
type DecisionStatus = 
  | 'PENDING'    // Exibida, nenhuma acao ainda
  | 'ACCEPTED'   // Acao tomada pelo usuario
  | 'REJECTED'   // Conscientemente ignorada
  | 'EXPIRED';   // Perdeu validade temporal
```

### 1.2 Interface DecisionEvent

```text
interface DecisionEvent {
  id: string;
  recommendationId: string;      // ID da recomendacao original
  recommendationTitle: string;   // Titulo para referencia
  category: string;              // marketing | clientes | operacoes
  basedOnMetric: string;         // Metrica DECISIONAL que gerou
  
  // Contexto de quando foi gerada
  generatedAt: Date;
  periodReference: string;       // Ex: "2026-01"
  metricValueAtGeneration: number;
  benchmarkAtGeneration: number;
  
  // Estado atual
  status: DecisionStatus;
  statusChangedAt: Date | null;
  
  // Feedback opcional
  rejectionReason?: string;      // Motivo da rejeicao (opcional)
  userNotes?: string;            // Anotacoes livres
  
  // Rastreabilidade
  userId: string;
  expiresAt: Date;               // Quando vira EXPIRED automaticamente
}
```

### 1.3 Interface DecisionMemory (agregado)

```text
interface DecisionMemory {
  totalGenerated: number;
  byStatus: {
    pending: number;
    accepted: number;
    rejected: number;
    expired: number;
  };
  byMetric: {
    [metricKey: string]: {
      generated: number;
      accepted: number;
      rejected: number;
      acceptanceRate: number;
    };
  };
  avgResponseTimeHours: number;
  lastUpdated: Date;
}
```

### 1.4 Opcoes de Rejeicao (nao obrigatorias)

```text
const RejectionReasons = [
  'already_in_progress',    // "Ja em andamento"
  'not_applicable_now',     // "Nao aplicavel agora"
  'disagree_with_premise',  // "Discordo da premissa"
  'lack_of_resources',      // "Falta de recursos"
  'other',                  // "Outro"
] as const;
```

---

## BLOCO 2: Banco de Dados

### 2.1 Criar tabela decision_events

```sql
CREATE TABLE decision_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recommendation_id TEXT NOT NULL,
  recommendation_title TEXT NOT NULL,
  category TEXT NOT NULL,
  based_on_metric TEXT NOT NULL,
  
  -- Contexto de geracao
  generated_at TIMESTAMPTZ DEFAULT now(),
  period_reference TEXT NOT NULL,
  metric_value_at_generation NUMERIC,
  benchmark_at_generation NUMERIC,
  
  -- Estado
  status TEXT DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'ACCEPTED', 'REJECTED', 'EXPIRED')),
  status_changed_at TIMESTAMPTZ,
  
  -- Feedback
  rejection_reason TEXT,
  user_notes TEXT,
  
  -- Rastreabilidade
  user_id UUID NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Indices para consultas comuns
CREATE INDEX idx_decision_events_user ON decision_events(user_id);
CREATE INDEX idx_decision_events_status ON decision_events(status);
CREATE INDEX idx_decision_events_period ON decision_events(period_reference);
CREATE INDEX idx_decision_events_metric ON decision_events(based_on_metric);
```

### 2.2 RLS Policies

```sql
ALTER TABLE decision_events ENABLE ROW LEVEL SECURITY;

-- Usuarios podem ver/editar apenas seus proprios eventos
CREATE POLICY "Users can view own decision events"
  ON decision_events FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own decision events"
  ON decision_events FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own decision events"
  ON decision_events FOR UPDATE
  USING (auth.uid() = user_id);
```

### 2.3 Funcao para expirar automaticamente

```sql
-- Funcao para marcar eventos como EXPIRED
CREATE OR REPLACE FUNCTION expire_old_decisions()
RETURNS void AS $$
BEGIN
  UPDATE decision_events
  SET status = 'EXPIRED', 
      status_changed_at = now(),
      updated_at = now()
  WHERE status = 'PENDING' 
    AND expires_at < now();
END;
$$ LANGUAGE plpgsql;
```

---

## BLOCO 3: Tipos TypeScript

### 3.1 Novo arquivo src/types/decisions.ts

```text
// Estados possiveis de uma decisao
export type DecisionStatus = 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'EXPIRED';

// Motivos de rejeicao (opcionais)
export const RejectionReasons = {
  already_in_progress: 'Ja em andamento',
  not_applicable_now: 'Nao aplicavel agora',
  disagree_with_premise: 'Discordo da premissa',
  lack_of_resources: 'Falta de recursos',
  other: 'Outro',
} as const;

export type RejectionReasonKey = keyof typeof RejectionReasons;

// Evento de decisao
export interface DecisionEvent {
  id: string;
  recommendationId: string;
  recommendationTitle: string;
  category: string;
  basedOnMetric: string;
  
  generatedAt: Date;
  periodReference: string;
  metricValueAtGeneration: number;
  benchmarkAtGeneration: number | null;
  
  status: DecisionStatus;
  statusChangedAt: Date | null;
  
  rejectionReason?: RejectionReasonKey;
  userNotes?: string;
  
  userId: string;
  expiresAt: Date;
}

// Memoria agregada de decisoes
export interface DecisionMemory {
  totalGenerated: number;
  byStatus: Record<DecisionStatus, number>;
  byMetric: {
    [metricKey: string]: {
      generated: number;
      accepted: number;
      rejected: number;
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

export const DecisionStatusColors: Record<DecisionStatus, string> = {
  PENDING: 'bg-blue-100 text-blue-800',
  ACCEPTED: 'bg-green-100 text-green-800',
  REJECTED: 'bg-red-100 text-red-800',
  EXPIRED: 'bg-gray-100 text-gray-600',
};
```

---

## BLOCO 4: Hook para Gerenciar Decisoes

### 4.1 Criar src/hooks/useDecisionEvents.ts

```text
export function useDecisionEvents() {
  // Estados
  const [events, setEvents] = useState<DecisionEvent[]>([]);
  const [memory, setMemory] = useState<DecisionMemory | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Buscar eventos do usuario
  const fetchEvents = async () => { ... };
  
  // Registrar nova recomendacao como PENDING
  const registerRecommendation = async (
    recommendation: Recommendation,
    periodReference: string,
    metricValue: number,
    benchmark: number | null
  ): Promise<string> => { ... };
  
  // Atualizar status
  const updateStatus = async (
    eventId: string,
    status: DecisionStatus,
    rejectionReason?: RejectionReasonKey,
    notes?: string
  ) => { ... };
  
  // Aceitar recomendacao
  const accept = (eventId: string, notes?: string) => 
    updateStatus(eventId, 'ACCEPTED', undefined, notes);
  
  // Rejeitar recomendacao
  const reject = (eventId: string, reason?: RejectionReasonKey, notes?: string) => 
    updateStatus(eventId, 'REJECTED', reason, notes);
  
  // Calcular memoria agregada
  const calculateMemory = (): DecisionMemory => { ... };
  
  // Verificar se recomendacao similar foi ignorada recentemente
  const checkPreviousRejections = (
    recommendationId: string,
    daysWindow: number = 60
  ): { count: number; lastRejectedAt: Date | null } => { ... };
  
  return {
    events,
    memory,
    loading,
    registerRecommendation,
    accept,
    reject,
    checkPreviousRejections,
    fetchEvents,
  };
}
```

---

## BLOCO 5: Atualizacoes na Recommendation

### 5.1 Extender interface Recommendation

Adicionar campos opcionais para rastrear estado:

```text
export interface Recommendation {
  // ... campos existentes ...
  
  // Estado de decisao (quando vinculado a um evento)
  decisionEventId?: string;
  decisionStatus?: DecisionStatus;
  previousRejections?: number;      // Quantas vezes foi rejeitada antes
  lastRejectedAt?: Date | null;     // Ultima rejeicao
}
```

### 5.2 Funcao para enriquecer recomendacoes

```text
// src/utils/recommendationEnricher.ts

export const enrichRecommendationsWithDecisionState = (
  recommendations: Recommendation[],
  events: DecisionEvent[]
): Recommendation[] => {
  return recommendations.map(rec => {
    const relatedEvents = events.filter(e => e.recommendationId === rec.id);
    const pendingEvent = relatedEvents.find(e => e.status === 'PENDING');
    const rejections = relatedEvents.filter(e => e.status === 'REJECTED');
    
    return {
      ...rec,
      decisionEventId: pendingEvent?.id,
      decisionStatus: pendingEvent?.status || null,
      previousRejections: rejections.length,
      lastRejectedAt: rejections.length > 0 
        ? rejections.sort((a, b) => 
            b.statusChangedAt.getTime() - a.statusChangedAt.getTime()
          )[0].statusChangedAt 
        : null,
    };
  });
};
```

---

## BLOCO 6: Atualizacoes na UI

### 6.1 Atualizar RecommendationCard.tsx

Adicionar micro-feedback de estado:

```text
interface RecommendationCardProps {
  recommendation: Recommendation;
  rank: number;
  onAccept?: (id: string) => void;
  onReject?: (id: string, reason?: RejectionReasonKey) => void;
}

// No card, adicionar:
// 1. Badge de status (PENDING, ACCEPTED, REJECTED)
// 2. Botoes de acao (Aceitar / Rejeitar)
// 3. Indicador de rejeicoes anteriores
```

Exemplo visual:

```text
+---------------------------------------------+
| 🎯 Otimizar Portfolio de Campanhas META     |
|---------------------------------------------|
| Impacto: +R$ 3K   ROI: 2.5x   Prazo: 14d    |
|---------------------------------------------|
| [✔️ Aceitar]  [✖️ Rejeitar ▼]               |
|                                              |
| ⚠️ Ignorada 2x nos ultimos 60 dias          |
+---------------------------------------------+
```

### 6.2 Criar componente RejectionModal

Modal simples para capturar motivo (opcional):

```text
// src/components/executive/RejectionModal.tsx

interface RejectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (reason?: RejectionReasonKey, notes?: string) => void;
  recommendationTitle: string;
}

// Modal com:
// - Opcoes de motivo (radio buttons)
// - Campo de notas (opcional)
// - Botao "Rejeitar sem motivo" (sempre visivel)
```

### 6.3 Atualizar ExecutiveDashboard

No momento de exibir recomendacoes:

```text
// 1. Registrar recomendacoes novas como PENDING
// 2. Enriquecer com estado de decisao
// 3. Passar callbacks de accept/reject para os cards
```

---

## BLOCO 7: Indicadores de Memoria

### 7.1 Badge de historico

Quando uma recomendacao reaparece apos ser rejeitada:

```text
{recommendation.previousRejections > 0 && (
  <div className="flex items-center gap-1 text-xs text-amber-600">
    <AlertTriangle className="h-3 w-3" />
    <span>
      Ignorada {recommendation.previousRejections}x 
      nos ultimos 60 dias
    </span>
  </div>
)}
```

### 7.2 Card de DecisionMemory (opcional para dashboard)

```text
// src/components/executive/DecisionMemoryCard.tsx

// Exibe:
// - Total de recomendacoes geradas
// - Taxa de aceitacao geral
// - Metricas mais aceitas vs mais ignoradas
// - Tempo medio de resposta
```

---

## BLOCO 8: Expiracao Automatica

### 8.1 Logica de expiracao

Uma recomendacao PENDING expira quando:
- Passa 30 dias sem acao, OU
- O periodo de referencia muda (ex: virou outro mes)

### 8.2 Verificacao no frontend

```text
// No hook useDecisionEvents
const checkAndExpireEvents = async () => {
  const now = new Date();
  const toExpire = events.filter(
    e => e.status === 'PENDING' && new Date(e.expiresAt) < now
  );
  
  for (const event of toExpire) {
    await updateStatus(event.id, 'EXPIRED');
  }
};
```

---

## ARQUIVOS A CRIAR/MODIFICAR

| Arquivo | Acao |
|---------|------|
| `src/types/decisions.ts` | CRIAR - Tipos DecisionEvent, DecisionStatus, etc. |
| `src/hooks/useDecisionEvents.ts` | CRIAR - Hook para gerenciar eventos |
| `src/utils/recommendationEnricher.ts` | CRIAR - Enriquecer recomendacoes com estado |
| `src/types/executive.ts` | MODIFICAR - Extender Recommendation |
| `src/components/executive/RecommendationCard.tsx` | MODIFICAR - Adicionar acoes |
| `src/components/executive/RejectionModal.tsx` | CRIAR - Modal de rejeicao |
| `src/components/executive/DecisionMemoryCard.tsx` | CRIAR - Card de memoria (opcional) |
| `src/pages/ExecutiveDashboard.tsx` | MODIFICAR - Integrar sistema de decisoes |
| Migracao SQL | CRIAR - Tabela decision_events com RLS |

---

## ORDEM DE EXECUCAO

```text
1. Migracao SQL - Criar tabela decision_events
2. src/types/decisions.ts - Criar tipos
3. src/types/executive.ts - Extender Recommendation
4. src/hooks/useDecisionEvents.ts - Criar hook
5. src/utils/recommendationEnricher.ts - Criar enriquecedor
6. src/components/executive/RejectionModal.tsx - Criar modal
7. src/components/executive/RecommendationCard.tsx - Adicionar acoes
8. src/pages/ExecutiveDashboard.tsx - Integrar tudo
9. src/components/executive/DecisionMemoryCard.tsx - Card de memoria (opcional)
```

---

## O QUE NAO FAZER

- Nao gamificar decisoes
- Nao forcar explicacoes
- Nao punir rejeicao
- Nao esconder historico
- Nao automatizar decisoes

---

## CONTRATO FINAL COMPLETO (4 ETAPAS)

O sistema so age quando:

```text
VERDADE (nature)        ✓ REAL
AUTORIDADE (authority)  ✓ DECISIONAL
TEMPO (temporal)        ✓ STABLE
RESPONSABILIDADE        → explícita (PENDING/ACCEPTED/REJECTED/EXPIRED)
```

---

## VALIDACAO FINAL

1. Recomendacao exibida = evento PENDING criado
2. Usuario pode aceitar com um clique
3. Usuario pode rejeitar com motivo opcional
4. Recomendacao ignorada por 30 dias = EXPIRED automatico
5. Historico de rejeicoes visivel quando recomendacao reaparece
6. Sistema lembra: quais metricas geram acoes vs quais sao ignoradas
7. Memoria nao julga - apenas registra realidade

---

## RESPOSTA A PERGUNTA FUNDAMENTAL

> Este sistema deve aprender com o silencio do usuario ou apenas registrar?

**Nesta etapa: apenas registrar.**

A Etapa 4 constroi a infraestrutura de memoria honesta.
A Etapa 5 (futura) usara essa memoria para calibrar tom, frequencia e confianca.

Por enquanto: o sistema lembra, mas nao muda comportamento ainda.

