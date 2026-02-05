

# Plano: Etapa 5.2 — Interpretação de Memória (Sem Adaptação)

## Objetivo
Criar uma camada semântica intermediária que **nomeia padrões** no histórico de decisões, sem influenciar nenhum comportamento do sistema.

---

## Princípio Fundamental

Esta etapa responde à pergunta:

> "Como descrever este histórico sem transformá-lo em regra?"

**O que a interpretação é:**
- Um vocabulário neutro para padrões humanos
- Uma descrição factual do passado

**O que a interpretação NÃO é:**
- Score / ranking
- Critério de filtragem
- Peso de prioridade
- Gatilho de adaptação

---

## BLOCO 1: Tipo DecisionInterpretation

### Arquivo a Criar
`src/types/decisionInterpretation.ts`

### Conteúdo

```text
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
```

---

## BLOCO 2: Função Interpretadora Pura

### Arquivo a Criar
`src/utils/decisionInterpreter.ts`

### Assinatura

```text
export function interpretDecisionHistory(
  recommendationId: string,
  events: DecisionEvent[],
  now: Date = new Date()
): DecisionInterpretation
```

### Regras de Interpretação (ordem de precedência)

```text
1. Sem eventos → NEVER_EVALUATED
2. Evento PENDING expirado → STALE_PENDING
3. 3+ REJECTED em 60 dias → REPEATEDLY_REJECTED
4. Último REJECTED há < 30 dias → RECENTLY_REJECTED
5. Último evento ACCEPTED → PREVIOUSLY_ACCEPTED
6. Tem histórico mas não encaixa acima → MIXED_HISTORY
```

### Implementação

```text
import { DecisionEvent, DecisionStatus } from '@/types/decisions';
import { DecisionInterpretation } from '@/types/decisionInterpretation';

/**
 * Interpreta o histórico de decisões de uma recomendação
 * 
 * IMPORTANTE: Esta função é DESCRITIVA, não PRESCRITIVA.
 * O resultado NÃO deve ser usado para ordenar, filtrar ou priorizar.
 * Existe apenas para nomear padrões de forma legível.
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
```

---

## BLOCO 3: Uso Mínimo na UI (Tooltip Discreto)

### Arquivo a Modificar
`src/components/executive/RecommendationCard.tsx`

### Mudanças

1. Importar o interpretador
2. Calcular interpretação para a recomendação
3. Exibir em tooltip discreto (não badge proeminente)

### Onde Exibir

Adicionar pequeno texto em `text-muted-foreground` abaixo de "Baseado em":

```text
{interpretation !== 'NEVER_EVALUATED' && (
  <span className="text-muted-foreground text-[10px]">
    Histórico: {DecisionInterpretationLabels[interpretation]}
  </span>
)}
```

### Exemplo Visual

```text
Baseado em: ROAS Ads
Histórico: rejeitada recentemente
```

Nada mais. Sem cor. Sem ícone. Sem destaque.

---

## BLOCO 4: Integração no Enricher (Opcional)

### Arquivo a Modificar
`src/utils/recommendationEnricher.ts`

### Mudança Opcional

Adicionar campo `interpretation` em `EnrichedRecommendation`:

```text
export interface EnrichedRecommendation extends Recommendation {
  // ... campos existentes ...
  
  // Interpretação semântica do histórico (Etapa 5.2)
  // APENAS para descrição, não para decisão
  interpretation?: DecisionInterpretation;
}
```

E calcular durante enrichment:

```text
interpretation: interpretDecisionHistory(rec.id, events, new Date()),
```

---

## Arquivos a Criar/Modificar

| Arquivo | Ação |
|---------|------|
| `src/types/decisionInterpretation.ts` | CRIAR - Tipo e labels |
| `src/utils/decisionInterpreter.ts` | CRIAR - Função pura |
| `src/utils/recommendationEnricher.ts` | MODIFICAR - Adicionar campo |
| `src/components/executive/RecommendationCard.tsx` | MODIFICAR - Tooltip discreto |

---

## Ordem de Execução

```text
1. src/types/decisionInterpretation.ts - Criar tipo
2. src/utils/decisionInterpreter.ts - Criar interpretador
3. src/utils/recommendationEnricher.ts - Adicionar campo
4. src/components/executive/RecommendationCard.tsx - Exibir discretamente
```

---

## O Que Continua PROIBIDO

- Usar interpretação para ordenar
- Usar interpretação para filtrar
- Usar interpretação para bloquear
- Usar interpretação para priorizar
- Usar interpretação para reduzir frequência

**Se qualquer função de decisão importar `DecisionInterpretation`, a etapa está errada.**

---

## Critério de Sucesso

A etapa está correta se:

1. Você pode apagar toda a Etapa 5.2 e o sistema continua funcionando igual
2. Nenhuma função de decisão importa `DecisionInterpretation`
3. Só a linguagem muda levemente (tooltip discreto)
4. O interpretador é uma função pura sem side effects

---

## Próxima Bifurcação (Etapa 5.3)

Após esta etapa, surge a escolha real:

- **5.3A — Postura**: Linguagem adaptativa baseada em interpretação
- **5.3B — Fricção Contextual**: Pedir confirmação extra em casos específicos

Mas isso só vem depois que o sistema sabe **nomear** o passado sem **reagir** a ele.

