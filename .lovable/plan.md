

# Plano: Ajustes Finos da Etapa 4

## Objetivo
Aplicar refinamentos semanticos e documentais a Etapa 4, preparando o terreno para evolucoes futuras sem quebrar a implementacao atual.

---

## AJUSTE 1: Preparar Diferenciacao de Expiracao

### Arquivo: src/types/decisions.ts

Adicionar tipo ExpirationReason (documentado, nao usado ainda):

```text
// ============================================
// TIPOS FUTUROS (preparacao - nao implementados)
// ============================================
// ExpirationReason permitira diferenciar:
// - TIMEOUT: 30 dias sem acao
// - SUPERSEDED: nova recomendacao substituiu
// - CONTEXT_CHANGED: contexto de negocios mudou
//
// TODO (Etapa 5+): Migrar EXPIRED para usar este tipo
// Por enquanto, EXPIRED = TIMEOUT implicitamente.
// ============================================
export type ExpirationReason = 
  | 'TIMEOUT'          // Passou 30 dias sem acao
  | 'SUPERSEDED'       // Substituida por recomendacao mais recente
  | 'CONTEXT_CHANGED'; // Condicoes de negocios mudaram
```

Adicionar campo opcional em DecisionEvent (para futuro):

```text
// expirationReason?: ExpirationReason; // TODO: Implementar na Etapa 5+
```

---

## AJUSTE 2: Microcopy do Botao Aceitar

### Arquivo: src/components/executive/RecommendationCard.tsx

Atualizar tooltip do botao Aceitar:

De:
```text
<TooltipContent>
  <p>Marcar como ação aceita</p>
</TooltipContent>
```

Para:
```text
<TooltipContent side="top" className="max-w-xs">
  <p className="font-medium">Aceitar recomendação</p>
  <p className="text-xs text-muted-foreground mt-1">
    Registra que esta recomendação foi considerada válida neste contexto.
    Não executa nenhuma ação automaticamente.
  </p>
</TooltipContent>
```

Mesma logica para Rejeitar:

```text
<TooltipContent side="top" className="max-w-xs">
  <p className="font-medium">Rejeitar recomendação</p>
  <p className="text-xs text-muted-foreground mt-1">
    Registra que esta recomendação não se aplica agora.
    Você pode informar o motivo opcionalmente.
  </p>
</TooltipContent>
```

---

## AJUSTE 3: Campo metricSnapshotLabel

### Arquivo: src/types/decisions.ts

Adicionar campo opcional em DecisionEvent:

```text
export interface DecisionEvent {
  // ... campos existentes ...
  
  // Snapshot legivel da metrica no momento da geracao
  // Ex: "ROAS Ads = 0.74x" ou "Churn = 12.3%"
  metricSnapshotLabel?: string;
}
```

### Arquivo: src/hooks/useDecisionEvents.ts

Atualizar registerRecommendation para aceitar o label:

```text
interface RegisterRecommendationParams {
  recommendation: Recommendation;
  periodReference: string;
  metricValue: number;
  benchmark: number | null;
  metricSnapshotLabel?: string; // NOVO
}
```

---

## AJUSTE 4: Renomear previousRejections para Neutralidade

### Arquivo: src/utils/recommendationEnricher.ts

Renomear internamente:
- previousRejections -> priorRejectionCount

### Arquivo: src/components/executive/RecommendationCard.tsx

Atualizar para:
- Nao mostrar historico quando status === 'EXPIRED' (so REJECTED)
- Manter a logica de exibicao apenas para rejeicoes explicitas

```text
// Antes:
{hasDecisionHistory && (!status || status === 'PENDING') && (

// Depois:
// Mostrar historico apenas para rejeicoes explicitas, nao expiracoes
{priorRejectionCount > 0 && (!status || status === 'PENDING') && (
```

---

## AJUSTE 5: Debug Log para Decisoes Nao Registradas

### Arquivo: src/pages/AnaliseCritica.tsx

Adicionar log quando uma recomendacao nao e registrada por contrato:

```text
// Verificar autoridade da métrica base
const metricKey = rec.basedOnMetric;
if (!metricKey) {
  console.debug('[Decision skipped]', rec.id, 'reason:', 'no basedOnMetric');
  continue;
}

// Só registrar se temporal é STABLE
if (!canGenerateTemporalRecommendation(temporalConfidence)) {
  console.debug('[Decision skipped]', rec.id, 'reason:', 'temporal not stable', temporalConfidence);
  continue;
}
```

---

## AJUSTE 6: Documentar Disciplina sobre acceptanceRate

### Arquivo: src/types/decisions.ts

Adicionar comentario em DecisionMemory:

```text
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
      // ATENCAO: acceptanceRate e informativo apenas.
      // NAO usar para:
      //   - Reordenar recomendacoes
      //   - Filtrar recomendacoes
      //   - Reduzir frequencia
      // 
      // O uso deste dado sera definido na Etapa 5.
      // ============================================
      acceptanceRate: number;
    };
  };
  avgResponseTimeHours: number;
  lastUpdated: Date;
}
```

---

## AJUSTE 7: Comentario Filosofico

### Arquivo: src/types/decisions.ts

Adicionar no cabecalho:

```text
// ============================================
// PRINCIPIO EPISTEMICO DA ETAPA 4
// ============================================
// A pergunta que o sistema faz NAO e:
//   "O usuário aceitou?"
//
// A pergunta correta e:
//   "O sistema estava certo para aquele contexto?"
//
// Isso evita:
//   - Sistema subserviente (busca aprovacao)
//   - Sistema punitivo (julga rejeicao)
//   - Sistema manipulador (otimiza aceitacao)
//
// O sistema registra realidade, nao julga.
// ============================================
```

---

## Arquivos a Modificar

| Arquivo | Acao |
|---------|------|
| `src/types/decisions.ts` | Adicionar ExpirationReason, metricSnapshotLabel, comentarios |
| `src/hooks/useDecisionEvents.ts` | Adicionar metricSnapshotLabel param |
| `src/utils/recommendationEnricher.ts` | Renomear previousRejections -> priorRejectionCount |
| `src/components/executive/RecommendationCard.tsx` | Microcopy + filtrar EXPIRED do historico |
| `src/pages/AnaliseCritica.tsx` | Adicionar console.debug para skipped decisions |

---

## Ordem de Execucao

```text
1. src/types/decisions.ts - Todos os ajustes de tipos e documentacao
2. src/hooks/useDecisionEvents.ts - Adicionar metricSnapshotLabel
3. src/utils/recommendationEnricher.ts - Renomear campo
4. src/components/executive/RecommendationCard.tsx - Microcopy + logica EXPIRED
5. src/pages/AnaliseCritica.tsx - Debug logs
```

---

## O Que NAO Muda

- Logica de expiracao (EXPIRED continua = TIMEOUT)
- Uso de acceptanceRate (continua calculado, nao usado)
- Comportamento de registro (so DECISIONAL/REAL/STABLE)
- Fluxo de aceitar/rejeitar

---

## Validacao

1. ExpirationReason existe como tipo, nao como implementacao
2. Tooltip do Aceitar explica que nao executa acao
3. metricSnapshotLabel pode ser passado (opcional)
4. Historico so mostra rejeicoes, nao expiracoes
5. Console mostra logs de decisoes nao registradas (modo debug)
6. acceptanceRate tem comentario de disciplina
7. Principio epistemico documentado

