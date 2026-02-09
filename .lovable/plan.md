

# Plano: Corrigir ROAS na pagina de Anuncios para usar investimento total

## Diagnostico

Apos analise detalhada, o problema do ROAS com investimento filtrado existe **apenas na pagina de Anuncios** (`Ads.tsx`):

| Pagina | Fonte do Investimento | Status |
|---|---|---|
| Ads.tsx | `activeAdsData` (filtrado por objetivo) | **Precisa corrigir** |
| ExecutiveDashboard.tsx | Todos os ads do mes (sem filtro de objetivo) | OK |
| PerformanceFinanceira.tsx | Todos os ads do mes (sem filtro de objetivo) | OK |

Na pagina de Ads, o `metrics.roas` e calculado como `valorConversaoTotal / investimentoTotal` usando apenas os 22 anuncios de vendas (R$ 8.887,01), quando deveria usar o investimento total de R$ 11.866,75.

## Solucao

Recalcular o ROAS na pagina de Ads usando `totalInvestmentAllObjectives` (ja criado no passo anterior) ao inves do `metrics.investimentoTotal` filtrado.

### Alteracoes em `src/pages/Ads.tsx`

1. **Criar um ROAS corrigido** usando receita de vendas dividida pelo investimento total:
   ```
   roasCorrigido = metrics.valorConversaoTotal / totalInvestmentAllObjectives
   ```

2. **Substituir `metrics.roas`** nos seguintes locais:
   - Hero card principal de ROAS (valor grande, linha ~413)
   - Badge de status do ROAS (linha ~404)
   - Calculo do `roasProgress` (linha ~190)
   - Chamada a `getRoasStatus` e `getRoasInterpretation`
   - Texto de calculo que mostra "Receita / Investimento" (linha ~418-420)
   - Trend do ROAS (continua usando o trend existente)

3. **Atualizar `roasStatusInfo`** para usar o ROAS corrigido

4. **Atualizar referencia ao investimento** na linha de calculo visual (linha ~420) que mostra o denominador

### Resultado esperado

- ROAS exibido: R$ 14.004,65 / R$ 11.866,75 = **1.18x** (antes mostrava ~1.58x com investimento filtrado)
- Investimento no card: R$ 11.866,75 (ja corrigido no passo anterior)
- Receita e conversoes: continuam refletindo apenas campanhas de vendas

### Secao tecnica

Adicionar apos `totalInvestmentAllObjectives`:

```typescript
const correctedRoas = totalInvestmentAllObjectives > 0 
  ? metrics.valorConversaoTotal / totalInvestmentAllObjectives 
  : 0;
```

Substituir todas as ocorrencias de `metrics.roas` na renderizacao por `correctedRoas`. Manter `metrics.roas` apenas no calculo de trends (que compara mes a mes com a mesma logica).

Locais exatos de substituicao:
- Linha 190: `roasProgress` 
- Linha 208-215: `getRoasStatus(metrics.roas)` 
- Linha 404: Badge condicional
- Linha 413: Valor principal
- Linha 420: Denominador do calculo visual
- Linha 444: `getRoasInterpretation`

