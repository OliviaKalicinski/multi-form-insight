

# Plano: Ajustes Semânticos de Proteção — Etapa 6

## Objetivo
Congelar semanticamente os tipos e valores da Etapa 6 para impedir interpretações futuras que levem a uso operacional.

---

## Ajuste 1: Renomear InteractionStyleTendency

### Problema
O nome `InteractionStyleTendency` pode sugerir que o sistema deve "atender" a essa tendência.

### Solução
Renomear para `ObservedInteractionPattern` — reforça que é um **padrão observado**, não uma preferência a ser atendida.

### Arquivos a Modificar

| Arquivo | Mudança |
|---------|---------|
| `src/types/implicitLearning.ts` | Renomear tipo e atualizar JSDoc |
| `src/utils/implicitLearningCalculator.ts` | Atualizar imports e referências |
| `src/hooks/useDecisionEvents.ts` | Atualizar import e tipo de retorno |

### Código Específico

**src/types/implicitLearning.ts** (linhas 12-23):
```typescript
/**
 * Padrão de interação observado do comportamento do usuário.
 * 
 * @description Este tipo é OBSERVACIONAL, não OPERACIONAL.
 * Não pode ser usado para alterar ranking, frequência, ou visibilidade.
 * 
 * O nome "Observed" é intencional: descreve o passado, não prescreve o futuro.
 */
export type ObservedInteractionPattern = 
  | 'UNKNOWN'           // Dados insuficientes
  | 'DIRECT_PREFERENCE' // Padrão: decisões rápidas, alta taxa explícita
  | 'DELIBERATIVE'      // Padrão: decisões lentas, múltiplas sessões
  | 'SELECTIVE'         // Padrão: alta taxa de rejeição explícita
  | 'PASSIVE';          // Padrão: muitas expirações, poucas decisões
```

---

## Ajuste 2: Comentários de Proteção no Retorno do Hook

### Problema
O ponto de consumo é o mais perigoso. Alguém pode importar `profile` e usá-lo para filtrar.

### Solução
Adicionar comentário de alerta explícito no retorno do hook.

### Código Específico

**src/hooks/useDecisionEvents.ts** (linhas 338-353):
```typescript
  return {
    events,
    memory,
    loading,
    error,
    registerRecommendation,
    accept,
    reject,
    expireOldEvents,
    checkPreviousRejections,
    getPendingEventForRecommendation,
    fetchEvents,
    
    // ============================================
    // ⚠️ OBSERVATIONAL ONLY — DO NOT USE FOR UI OR LOGIC
    // ============================================
    // Etapa 6: estados latentes de aprendizado implícito.
    // Esses valores existem para observação futura.
    // NÃO usar para: ranking, filtro, linguagem, frequência.
    // "O sistema aprende, mas não age como se soubesse."
    // ============================================
    profile,
    interactionStyle,
  };
```

---

## Resumo de Mudanças

| Arquivo | Linha(s) | Mudança |
|---------|----------|---------|
| `src/types/implicitLearning.ts` | 12-23 | Renomear `InteractionStyleTendency` → `ObservedInteractionPattern` |
| `src/utils/implicitLearningCalculator.ts` | 16, 283-285 | Atualizar import e assinatura de função |
| `src/hooks/useDecisionEvents.ts` | 16, 333, 338-353 | Atualizar import e adicionar comentários de proteção |

---

## Ordem de Execução

```text
1. src/types/implicitLearning.ts — Renomear tipo
2. src/utils/implicitLearningCalculator.ts — Atualizar referências
3. src/hooks/useDecisionEvents.ts — Atualizar import + comentários
```

---

## Critério de Sucesso

A mudança está correta se:

1. O nome do tipo comunica claramente que é **observação**, não **preferência**
2. O comentário no retorno do hook é visível e explícito
3. Qualquer desenvolvedor futuro entende imediatamente que não deve usar para lógica
4. A frase-guia aparece no ponto de consumo

