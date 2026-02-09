
# Plano: Classificacao visual por quadrante na tabela de anuncios

## Objetivo

Adicionar coluna "Classificacao" na tabela `AdsBreakdown` com badge colorida e tooltip, reutilizando a logica ja existente em `adFormatClassifier.ts` (`classifyFunnelRole`, `getRoleMeta`).

## Alteracoes

### Arquivo unico: `src/components/dashboard/AdsBreakdown.tsx`

### 1. Imports adicionais

- `classifyFunnelRole`, `getRoleMeta`, `FUNNEL_ROLE_ORDER` de `@/utils/adFormatClassifier`
- `Tooltip`, `TooltipTrigger`, `TooltipContent`, `TooltipProvider` de `@/components/ui/tooltip`

### 2. Novo tipo de ordenacao

Adicionar `'classification'` ao tipo `SortColumn`:

```typescript
type SortColumn = 'investment' | 'impressions' | 'clicks' | 'ctr' | 'purchases' | 'roas' | 'classification' | null;
```

### 3. Logica de classificacao dentro de `processedAds`

Para cada anuncio, calcular CTR e ROAS inline e derivar `performanceClass` usando `classifyFunnelRole(ctr, roas)`. Filtro de investimento >= R$10 ja e aplicado no AdFunnelMap; aqui a classificacao simplesmente mostra "-" para anuncios abaixo desse threshold.

### 4. Ordenacao por classificacao

No switch de ordenacao, mapear cada `FunnelRole` para um peso numerico seguindo a prioridade definida pelo usuario:

| Prioridade | Classe | Peso |
|---|---|---|
| 1 | Conversor | 0 |
| 2 | Conversor Silencioso | 1 |
| 3 | Isca de Atencao | 2 |
| 4 | Ineficiente | 3 |

### 5. Nova coluna no header

Adicionar coluna "Classificacao" com botao de ordenacao, posicionada apos a coluna ROAS e antes de "Tipo de Resultado".

### 6. Nova celula no body

Para cada linha:
- Calcular `ctr` (cliques / impressoes * 100) e `roas` (receita / investimento)
- Se investimento < 10: mostrar badge cinza "Sem dados"
- Senao: mostrar badge colorida com o label da classificacao

Cores das badges (Tailwind):
- Conversor: `bg-green-100 text-green-800`
- Isca de Atencao: `bg-yellow-100 text-yellow-800`
- Conversor Silencioso: `bg-blue-100 text-blue-800`
- Ineficiente: `bg-red-100 text-red-800`

### 7. Tooltip obrigatorio

Cada badge envolta em `Tooltip` com o texto descritivo vindo de `getRoleMeta(role).description`. Tooltips customizados conforme solicitado:
- Conversor: "Criativo atrai e converte. Bom candidato para escala."
- Isca de Atencao: "Chama atencao, mas nao gera retorno financeiro."
- Conversor Silencioso: "Baixo CTR, mas alta eficiencia. Trafego qualificado."
- Ineficiente: "Baixa atencao e baixo retorno. Avaliar pausa."

## O que NAO muda

- Nenhum calculo existente alterado
- Nenhum grafico novo criado
- Nenhum arquivo novo criado
- Componentes `AdFunnelMap`, `adFormatClassifier.ts` intocados
- Filtro de tipo de resultado continua funcionando normalmente
