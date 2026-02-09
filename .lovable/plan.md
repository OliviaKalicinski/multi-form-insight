
# Plano: Corrigir valor total de investimento Meta em novembro

## Diagnostico

O valor exibido de R$ 8.887,01 nao esta errado tecnicamente -- ele reflete apenas os anuncios com objetivo **OUTCOME_SALES** (22 de 39 anuncios). Os demais anuncios sao filtrados por objetivo:

| Objetivo | Anuncios | Gasto |
|---|---|---|
| OUTCOME_SALES | 22 | R$ 8.887,01 |
| LINK_CLICKS | 3 | R$ 1.666,69 |
| OUTCOME_ENGAGEMENT | 10 | R$ 920,01 |
| OUTCOME_LEADS | 4 | R$ 393,04 |
| **Total** | **39** | **R$ 11.866,75** |

A logica atual funciona assim:
1. `currentMonthAdsData` contem todos os 39 anuncios de novembro
2. `determinePrimaryObjective()` detecta que existem anuncios de vendas e define objetivo primario como `OUTCOME_SALES`
3. `activeAdsData` filtra para mostrar apenas os 22 anuncios de vendas
4. `calculateAdsMetrics(activeAdsData)` calcula investimento = R$ 8.887,01
5. Os KPIs no topo da pagina usam esse valor filtrado

## Solucao

Separar o KPI de **Investimento Total** para sempre mostrar o gasto de TODAS as campanhas do mes, independente do objetivo. Os demais KPIs (ROAS, CPA, conversoes) continuam usando apenas os dados filtrados por objetivo, pois so fazem sentido no contexto de vendas.

### Alteracoes

**Arquivo: `src/pages/Ads.tsx`**

1. Adicionar um `useMemo` para calcular o investimento total de TODOS os anuncios do mes (usando `currentMonthAdsData` ao inves de `activeAdsData`)
2. Atualizar o KPI "Investimento Total" no hero card para usar esse valor global
3. Manter todos os outros KPIs (ROAS, CPA, compras, CTR) usando `metrics` filtrado por objetivo

Isso garante que:
- O investimento exibido sera R$ 11.866,75 (todos os objetivos)
- ROAS, CPA e conversoes continuam refletindo apenas as campanhas de vendas
- A tabela de detalhamento continua mostrando todos os anuncios com filtro por tipo

### Secao tecnica

Adicionar apos a linha do `const metrics`:

```typescript
const totalInvestmentAllObjectives = useMemo(() => {
  return calculateAdsMetrics(currentMonthAdsData).investimentoTotal;
}, [currentMonthAdsData]);
```

Substituir `metrics.investimentoTotal` por `totalInvestmentAllObjectives` nos seguintes locais:
- Hero card de investimento (linha ~440)
- Calculo de `netProfit` (linha 181)

Manter `metrics.investimentoTotal` nos calculos de ROAS e CPA que dependem do filtro por objetivo.
