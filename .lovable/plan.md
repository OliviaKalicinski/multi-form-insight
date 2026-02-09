

# Substituir Mapa CTR x ROAS por grafico visual de classificacao

## O que muda

### 1. Remover AdFunnelMap

- Remover import e uso de `AdFunnelMap` em `src/pages/Ads.tsx` (linhas 30, 1076-1079)
- Deletar arquivo `src/components/dashboard/AdFunnelMap.tsx`
- Manter `adFormatClassifier.ts` (ainda usado pelo AdsBreakdown para classificacao)

### 2. Criar componente `AdClassificationChart`

Novo arquivo: `src/components/dashboard/AdClassificationChart.tsx`

Um scatter plot (grafico de dispersao) usando Recharts onde:

- **Eixo X** = CTR (%)
- **Eixo Y** = ROAS (x)
- **Cada ponto** = um anuncio (tamanho proporcional ao investimento)
- **Cores** = verde (Conversor), amarelo (Isca), azul (Silencioso), vermelho (Ineficiente)
- **Linhas de referencia** = CTR = 2% (vertical) e ROAS = 1.5x (horizontal), dividindo os 4 quadrantes
- **Labels nos quadrantes** = nome da classificacao em cada canto
- **Tooltip** ao passar o mouse = nome do anuncio, CTR, ROAS, investimento

Usa `getAdMetrics` (mesma logica do AdsBreakdown) para garantir consistencia dos valores.

Filtro de investimento minimo R$10 mantido para evitar ruido visual.

### 3. Inserir no lugar do AdFunnelMap

Em `src/pages/Ads.tsx`, onde estava o AdFunnelMap (ROW 7), inserir o novo `AdClassificationChart` com os mesmos dados (`activeAdsData`), visivel apenas na view de Sales.

## Resultado esperado

O usuario ve um grafico de dispersao intuitivo onde cada anuncio e um ponto colorido posicionado por CTR e ROAS, com os 4 quadrantes claramente demarcados por linhas de referencia. Permite identificar visualmente clusters de performance e outliers.

## Secao tecnica

### Dados do grafico

Cada ponto usa valores do Meta (CSV) via `getAdMetrics`:
- CTR de `ad["CTR (todos)"]`
- ROAS de `ad["ROAS de resultados"]`
- Investimento de `ad["Valor usado (BRL)"]`
- Classificacao via `classifyFunnelRole(ctr, roas)`

### Recharts components utilizados

- `ScatterChart` com `Scatter` (um por classificacao, para cores distintas)
- `ReferenceLine` x=2 e y=1.5
- `XAxis` / `YAxis` com labels
- `ZAxis` para tamanho do ponto (range baseado em investimento)
- `Tooltip` customizado
- `Legend` com os 4 nomes de classificacao

### Arquivos alterados

1. `src/components/dashboard/AdClassificationChart.tsx` — novo
2. `src/pages/Ads.tsx` — trocar import/uso
3. `src/components/dashboard/AdFunnelMap.tsx` — deletar

