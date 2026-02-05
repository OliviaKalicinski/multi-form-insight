

# Plano: Etapa 5.3A — Postura Linguística

## Objetivo
Fazer o sistema "falar melhor" baseado na interpretação do histórico, sem adicionar fricção, sem mudar prioridades, sem bloquear ações.

---

## Princípio Fundamental

A interpretação influencia **como o texto é escrito**, não **o que é sugerido**.

| Interpretação | Postura do Sistema |
|---------------|-------------------|
| NEVER_EVALUATED | Neutra, primeira apresentação |
| RECENTLY_REJECTED | Transparente, reconhece rejeição recente |
| REPEATEDLY_REJECTED | Calma, reconhece padrão sem insistir |
| PREVIOUSLY_ACCEPTED | Positiva, reconhece contexto anterior |
| MIXED_HISTORY | Neutra, histórico variado |
| STALE_PENDING | Neutra, convida reavaliação |

---

## O Que Muda

### 1. Subtítulo contextual no RecommendationCard

Adicionar um texto pequeno abaixo do título que muda baseado na interpretação:

```text
NEVER_EVALUATED
→ "Primeira vez que esta recomendação aparece para você."

RECENTLY_REJECTED  
→ "Esta recomendação foi rejeitada há menos de 30 dias."

REPEATEDLY_REJECTED
→ "Esta recomendação foi rejeitada múltiplas vezes recentemente."

PREVIOUSLY_ACCEPTED
→ "Esta recomendação foi aceita em um contexto anterior."

MIXED_HISTORY
→ "Esta recomendação tem histórico variado de avaliações."

STALE_PENDING
→ "Esta recomendação estava pendente e expirou sem decisão."
```

### 2. Localização na UI

Inserir logo abaixo do CardTitle, como CardDescription:

```text
+--------------------------------------------------+
| 🎯 Título da Recomendação                   🥇   |
| Primeira vez que esta recomendação aparece.      | ← NOVO
+--------------------------------------------------+
| [KPIs Grid]                                      |
| ...                                              |
+--------------------------------------------------+
```

---

## Implementação Técnica

### Arquivo a Modificar
`src/components/executive/RecommendationCard.tsx`

### Mudanças

1. Criar mapa de frases contextuais:

```text
const InterpretationPosture: Record<DecisionInterpretation, string> = {
  NEVER_EVALUATED: 'Primeira vez que esta recomendação aparece para você.',
  RECENTLY_REJECTED: 'Esta recomendação foi rejeitada há menos de 30 dias.',
  REPEATEDLY_REJECTED: 'Esta recomendação foi rejeitada múltiplas vezes recentemente.',
  PREVIOUSLY_ACCEPTED: 'Esta recomendação foi aceita em um contexto anterior.',
  MIXED_HISTORY: 'Esta recomendação tem histórico variado de avaliações.',
  STALE_PENDING: 'Esta recomendação estava pendente e expirou sem decisão.',
};
```

2. Adicionar CardDescription após CardTitle:

```text
<CardHeader>
  <CardTitle>...</CardTitle>
  {recommendation.interpretation && (
    <p className="text-xs text-muted-foreground mt-1">
      {InterpretationPosture[recommendation.interpretation]}
    </p>
  )}
</CardHeader>
```

### Regras de Exibição

- Só exibir se `recommendation.interpretation` existir
- Usar cor neutra (`text-muted-foreground`)
- Sem ícones extras
- Sem cores valorativas (verde/vermelho)
- Sempre calmo e factual

---

## Refino do Histórico no Footer

Atualmente existe (linha 183-186):

```text
Histórico: {DecisionInterpretationLabels[recommendation.interpretation]}
```

Isso pode ser **removido** após adicionar a postura no header, pois seria redundante.

Ou mantido de forma ainda mais discreta como fallback.

**Decisão recomendada**: Remover do footer para evitar duplicação.

---

## O Que NÃO Muda

- Ranking/ordem das recomendações
- Prioridade ou score
- Disponibilidade de ações (aceitar/rejeitar)
- Geração de novas recomendações
- Qualquer lógica de decisão

---

## Arquivos a Modificar

| Arquivo | Ação |
|---------|------|
| `src/components/executive/RecommendationCard.tsx` | Adicionar postura linguística |

---

## Ordem de Execução

```text
1. Criar mapa InterpretationPosture
2. Adicionar texto contextual no CardHeader
3. Remover linha redundante do footer (opcional)
```

---

## Critério de Sucesso

A etapa está correta se:

1. O texto muda baseado na interpretação
2. Nenhuma ação é bloqueada
3. Nenhuma prioridade muda
4. A linguagem é calma e factual
5. Você pode deletar a Etapa 5.3A e tudo funciona igual (só perde a frase)

---

## Exemplo Visual Final

```text
+--------------------------------------------------+
| 🎯 Otimizar segmentação de campanhas        🥇   |
| Esta recomendação foi rejeitada há menos de 30   |
| dias.                                            |
+--------------------------------------------------+
| Impacto    ROI      Prazo     Custo              |
| +R$ 2.5k   3.2x     7 dias    Grátis             |
+--------------------------------------------------+
| AÇÕES ESPECÍFICAS                                |
| → Revisar públicos de remarketing                |
| → Testar lookalike 1% vs 3%                      |
+--------------------------------------------------+
| Responsável: Marketing                           |
| Baseado em: ROAS Ads                             |
|                        [Aceitar] [Rejeitar ▼]    |
+--------------------------------------------------+
```

