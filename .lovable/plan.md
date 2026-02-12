

# Classificacao de eficiencia por objetivo do anuncio

## Problema atual
Todos os anuncios sao avaliados pelo mesmo criterio de CTR x ROAS, independente do objetivo. Anuncios de Engagement e Traffic nunca terao ROAS (nao geram compras), entao sao sempre classificados como "Ineficiente" ou "Isca de Atencao" -- o que e injusto e gera ruido na analise.

## Logica proposta

Anuncios serao avaliados por metricas diferentes conforme seu objetivo:

```text
+---------------------+---------------------------+---------------------------+
| Objetivo            | Eixo X (eficiencia)       | Eixo Y (resultado)        |
+---------------------+---------------------------+---------------------------+
| OUTCOME_SALES       | CTR >= 2%                 | ROAS >= 1.5x              |
| OUTCOME_ENGAGEMENT  | CTR >= 2%                 | CPR <= mediana do grupo    |
| OUTCOME_TRAFFIC     | CTR >= 2%                 | CPC <= mediana do grupo    |
+---------------------+---------------------------+---------------------------+
```

- **Sales**: mantém CTR x ROAS (sem mudanca)
- **Engagement**: CTR x Custo por Resultado (CPR). Um anuncio de engagement é "eficiente" se gera resultados a custo baixo
- **Traffic**: CTR x CPC. Um anuncio de trafego é "eficiente" se traz cliques baratos

Os 4 quadrantes continuam existindo com os mesmos nomes, mas o significado do eixo Y muda:

- **Conversor**: CTR alto + resultado bom (ROAS alto / CPR baixo / CPC baixo)
- **Isca de Atencao**: CTR alto + resultado fraco
- **Conversor Silencioso**: CTR baixo + resultado bom
- **Ineficiente**: CTR baixo + resultado fraco

## O que muda na interface

### Tabela de breakdown (AdsBreakdown.tsx)
- Coluna "ROAS" passa a mostrar a metrica relevante ao objetivo:
  - Sales: ROAS (como hoje)
  - Engagement: CPR (Custo por Resultado) formatado como moeda
  - Traffic: CPC formatado como moeda
- Coluna "Compras" passa a mostrar "Resultados" quando o objetivo nao for Sales
- Header da coluna muda dinamicamente (ex: "ROAS" / "CPR" / "CPC")

### Grafico scatter (AdClassificationChart.tsx)
- Eixo Y muda conforme objetivo:
  - Sales: ROAS (x)
  - Engagement: CPR invertido (quanto menor, melhor -- escala invertida)
  - Traffic: CPC invertido
- Label do eixo Y muda dinamicamente

### Regra de classificacao (adFormatClassifier.ts)
- Nova funcao `classifyByObjective(objective, ctr, roas, cpr, cpc, medianCpr, medianCpc)`
- Para Sales: mantém logica atual (CTR x ROAS)
- Para Engagement: CTR >= 2% e CPR <= mediana = "Conversor"
- Para Traffic: CTR >= 2% e CPC <= mediana = "Conversor"

## Detalhes tecnicos

### Arquivo: `src/utils/adFormatClassifier.ts`
- Adicionar funcao `classifyByObjective` que recebe o objetivo e as metricas relevantes
- Calcular mediana de CPR e CPC dentro do grupo de ads do mesmo objetivo
- Manter `classifyFunnelRole` existente para retrocompatibilidade

### Arquivo: `src/components/dashboard/AdsBreakdown.tsx`
- Receber nova prop `objective: string` para saber qual objetivo esta ativo
- Adaptar `getAdMetrics` para retornar CPR/CPC alem de CTR/ROAS
- Trocar labels das colunas dinamicamente
- Usar `classifyByObjective` em vez de `classifyFunnelRole` direto

### Arquivo: `src/components/dashboard/AdClassificationChart.tsx`
- Receber prop `objective` para adaptar eixo Y
- Trocar label e escala do eixo Y conforme objetivo

### Arquivo: `src/pages/Ads.tsx`
- Passar `objective={effectiveObjective}` para `AdsBreakdown` e `AdClassificationChart`

## Arquivos alterados
1. `src/utils/adFormatClassifier.ts` -- nova funcao de classificacao por objetivo
2. `src/components/dashboard/AdsBreakdown.tsx` -- metricas e labels dinamicos
3. `src/components/dashboard/AdClassificationChart.tsx` -- eixo Y dinamico
4. `src/pages/Ads.tsx` -- passar prop de objetivo

