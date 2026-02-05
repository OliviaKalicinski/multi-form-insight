

# Plano: Etapa 6 — Aprendizado Implícito

## Objetivo
Criar estruturas de observação de padrões sem que o sistema reaja a eles automaticamente. O sistema "aprende" no sentido de acumular conhecimento latente, mas não age baseado nesse conhecimento.

---

## Princípio Fundamental

> "O sistema aprende, mas não age como se soubesse."

O aprendizado implícito é uma **observação estruturada**, não um **gatilho de adaptação**.

---

## O Que Esta Etapa CRIA

### 1. Tipo: UserDecisionProfile

Estado interno latente que descreve padrões de interação do usuário, sem influenciar comportamento.

```text
interface UserDecisionProfile {
  // Identificação
  userId: string;
  computedAt: Date;
  
  // Padrões de engajamento (descritivos)
  decisionLatencyPattern: 'fast' | 'moderate' | 'slow' | 'insufficient_data';
  explicitDecisionRate: number; // % de decisões explícitas vs expirações
  
  // Tendências por categoria (sem efeito)
  categoryEngagement: Record<string, {
    totalPresented: number;
    explicitDecisions: number;
    avgLatencyHours: number;
  }>;
  
  // Tendências por métrica (sem efeito)
  metricEngagement: Record<string, {
    totalPresented: number;
    explicitDecisions: number;
    acceptanceRate: number; // informativo apenas
  }>;
  
  // Maturidade do perfil
  maturityLevel: 'nascent' | 'emerging' | 'stable';
  totalCyclesObserved: number;
  
  // Metadados
  lastUpdated: Date;
  isReliable: boolean; // só true após critérios mínimos
}
```

### 2. Tipo: InteractionStyleTendency

Tendência de estilo que poderia (futuramente) influenciar linguagem, mas não agora.

```text
type InteractionStyleTendency = 
  | 'UNKNOWN'           // Dados insuficientes
  | 'DIRECT_PREFERENCE' // Padrão: decisões rápidas, poucas leituras
  | 'DELIBERATIVE'      // Padrão: decisões lentas, múltiplas sessões
  | 'SELECTIVE'         // Padrão: alta taxa de rejeição explícita
  | 'PASSIVE';          // Padrão: muitas expirações, poucas decisões
```

### 3. Função: computeUserDecisionProfile

Função pura que calcula o perfil a partir dos eventos.

```text
function computeUserDecisionProfile(
  userId: string,
  events: DecisionEvent[],
  now: Date = new Date()
): UserDecisionProfile
```

### 4. Função: inferInteractionStyle

Função que infere tendência de estilo a partir do perfil.

```text
function inferInteractionStyle(
  profile: UserDecisionProfile
): InteractionStyleTendency
```

---

## Regras de Maturidade (Unidade Mínima)

O perfil só é considerado **reliable** quando:

| Critério | Valor Mínimo |
|----------|--------------|
| Ciclos temporais completos | >= 3 meses |
| Decisões explícitas totais | >= 5 |
| Eventos totais observados | >= 10 |

Antes disso:
- `maturityLevel = 'nascent'` ou `'emerging'`
- `isReliable = false`
- Nenhum output influencia nada

---

## Onde Isso Fica

### Arquivos a Criar

| Arquivo | Conteúdo |
|---------|----------|
| `src/types/implicitLearning.ts` | Tipos: UserDecisionProfile, InteractionStyleTendency |
| `src/utils/implicitLearningCalculator.ts` | Funções: computeUserDecisionProfile, inferInteractionStyle |

### Integração (Opcional, Somente Observação)

Hook `useDecisionEvents` pode expor:
```text
const { profile } = useDecisionEvents();
// profile é UserDecisionProfile, computado sob demanda
```

Mas esse valor **NÃO** é usado para nada visível.

---

## O Que Esta Etapa NÃO FAZ

| Proibição | Descrição |
|-----------|-----------|
| Reordenar recomendações | O perfil não influencia ranking |
| Esconder recomendações | Nenhuma filtragem baseada em perfil |
| Reduzir frequência | Nenhuma supressão de exibição |
| Alterar linguagem | Postura linguística (5.3A) não usa perfil |
| Mudar thresholds | Benchmarks permanecem fixos |
| Exigir confirmação | Nenhuma fricção adicional |

---

## Detalhes de Implementação

### 1. Arquivo: src/types/implicitLearning.ts

```text
// ============================================
// IMPLICIT LEARNING TYPES - Etapa 6
// ============================================
// Estados latentes de observação de padrões.
// NÃO influenciam comportamento visível do sistema.
// Existem para etapas futuras, sob novo contrato.
// ============================================

// FRASE-GUIA (incluir em toda documentação):
// "O sistema aprende, mas não age como se soubesse."

export type InteractionStyleTendency = 
  | 'UNKNOWN'
  | 'DIRECT_PREFERENCE'
  | 'DELIBERATIVE'
  | 'SELECTIVE'
  | 'PASSIVE';

export type ProfileMaturity = 'nascent' | 'emerging' | 'stable';

export interface CategoryEngagement {
  totalPresented: number;
  explicitDecisions: number;
  avgLatencyHours: number;
}

export interface MetricEngagement {
  totalPresented: number;
  explicitDecisions: number;
  acceptanceRate: number;
}

export interface UserDecisionProfile {
  userId: string;
  computedAt: Date;
  
  // Padrões de latência
  decisionLatencyPattern: 'fast' | 'moderate' | 'slow' | 'insufficient_data';
  avgLatencyHours: number;
  
  // Taxa de decisão explícita
  explicitDecisionRate: number;
  
  // Engajamento por categoria
  categoryEngagement: Record<string, CategoryEngagement>;
  
  // Engajamento por métrica
  metricEngagement: Record<string, MetricEngagement>;
  
  // Maturidade
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
// UserDecisionProfile é OBSERVACIONAL, não OPERACIONAL.
//
// PROIBIDO usar para:
//   - Reordenar recomendações
//   - Filtrar recomendações
//   - Esconder/suprimir exibição
//   - Alterar linguagem ou tom
//   - Mudar thresholds ou benchmarks
//   - Adicionar fricção
//
// Este estado existe APENAS para etapas futuras,
// quando um novo contrato ético for estabelecido.
// ============================================
```

### 2. Arquivo: src/utils/implicitLearningCalculator.ts

Funções puras para computar perfil e inferir estilo.

**Lógica de Latência:**
- fast: < 4h média
- moderate: 4-24h média
- slow: > 24h média
- insufficient_data: < 3 decisões

**Lógica de Estilo:**
- UNKNOWN: perfil não confiável
- DIRECT_PREFERENCE: fast + alta taxa decisão explícita (> 80%)
- DELIBERATIVE: slow + taxa moderada (50-80%)
- SELECTIVE: alta rejeição explícita (> 60% das decisões)
- PASSIVE: baixa taxa decisão explícita (< 40%)

**Lógica de Maturidade:**
- nascent: < 5 eventos OU < 1 mês
- emerging: 5-10 eventos OU 1-3 meses
- stable: >= 10 eventos E >= 3 meses E >= 5 decisões explícitas

---

## Integração no Hook (Opcional)

Adicionar ao `useDecisionEvents`:

```text
// Perfil de aprendizado implícito (Etapa 6)
// OBSERVAÇÃO: Este valor não influencia nenhum comportamento
const profile = useMemo((): UserDecisionProfile | null => {
  if (!user?.id || events.length === 0) return null;
  return computeUserDecisionProfile(user.id, events, new Date());
}, [user?.id, events]);
```

Retornar no hook:
```text
return {
  // ... existentes ...
  profile, // Etapa 6: estado latente, sem efeito
};
```

---

## Arquivos a Criar/Modificar

| Arquivo | Ação |
|---------|------|
| `src/types/implicitLearning.ts` | CRIAR |
| `src/utils/implicitLearningCalculator.ts` | CRIAR |
| `src/hooks/useDecisionEvents.ts` | MODIFICAR - Adicionar profile (opcional) |

---

## Ordem de Execução

```text
1. Criar src/types/implicitLearning.ts
2. Criar src/utils/implicitLearningCalculator.ts
3. Integrar no useDecisionEvents (opcional, apenas exposição)
```

---

## Critério de Sucesso

A etapa está correta se:

1. **Nenhum comportamento visível muda**
2. **Nenhuma função de UI importa os tipos de Etapa 6**
3. **O perfil só é computado, nunca consultado para decisão**
4. **Você pode apagar a Etapa 6 e o sistema continua idêntico**
5. **Comentários explícitos impedem uso operacional**

---

## Testes de Validação Ética

Para verificar que a Etapa 6 está correta, perguntar:

| Pergunta | Resposta Correta |
|----------|------------------|
| O ranking muda com base no perfil? | Não |
| Alguma recomendação some? | Não |
| A linguagem se adapta? | Não (5.3A não usa perfil) |
| Algum threshold muda? | Não |
| Algo é bloqueado? | Não |

Se qualquer resposta for "Sim", a etapa está quebrada.

---

## Próximas Etapas Possíveis (Não Agora)

Somente após Etapa 6 estabilizada:

| Etapa | Descrição |
|-------|-----------|
| 7 | Meta-reflexão: mostrar padrões ao usuário (se quiser) |
| 8 | Ajustes opt-in: "prefiro recomendações mais diretas" |
| 9 | Auditoria ética: detectar drift manipulativo |

---

## Exemplo de Output do Perfil

```text
{
  userId: "abc-123",
  computedAt: "2026-02-05T10:00:00Z",
  
  decisionLatencyPattern: "moderate",
  avgLatencyHours: 12.5,
  explicitDecisionRate: 0.72,
  
  categoryEngagement: {
    "marketing": { totalPresented: 5, explicitDecisions: 4, avgLatencyHours: 8.2 },
    "vendas": { totalPresented: 3, explicitDecisions: 2, avgLatencyHours: 18.1 }
  },
  
  metricEngagement: {
    "roasAds": { totalPresented: 3, explicitDecisions: 3, acceptanceRate: 0.67 },
    "churn": { totalPresented: 2, explicitDecisions: 1, acceptanceRate: 1.0 }
  },
  
  maturityLevel: "emerging",
  totalCyclesObserved: 2,
  totalEventsObserved: 8,
  totalExplicitDecisions: 6,
  
  isReliable: false,
  lastUpdated: "2026-02-05T10:00:00Z"
}
```

Este perfil existe. Ninguém usa. Etapa 6 completa.

