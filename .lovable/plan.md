
# Plano de Correcoes: Rigor de Benchmarks e Metadados

## Resumo
Tres correcoes focadas: eliminar todos os fallbacks de benchmark, tipar alertas por natureza, e adicionar campo `source` nos metadados.

---

## CORRECAO 1: Matar Fallbacks de Benchmark

### Problema Atual
Existem fallbacks `|| valor` em 3 arquivos que permitem o sistema funcionar mesmo sem benchmarks configurados:

**alertSystem.ts (linhas 48, 72, 114):**
```typescript
const roasBenchmark = benchmarks.roasMedio || 3.2;
const churnBenchmark = benchmarks.taxaChurn || 28;
const cacBenchmark = benchmarks.cac || 45;
```

**criticalAnalysis.ts (linhas 150, 155, 160, 174, 179, 193, 198, 203, 217):**
```typescript
const roasBenchmark = benchmarks.roasMedio || 3.2;
const ctrBenchmark = benchmarks.ctr || 1.8;
const cpcBenchmark = benchmarks.cpc || 0.45;
// ... mais 6 fallbacks
```

**recommendationEngine.ts (linhas 43, 69):**
```typescript
const recompraBenchmark = benchmarks.taxaRecompra || 38;
const ticketBenchmark = benchmarks.ticketMedio || 180;
```

### Solucao

**1.1 alertSystem.ts**

Alterar cada bloco de alerta para nao gerar NADA se benchmark nao existe:

```typescript
// ANTES
if (atual.marketing.roasAds < 0.8) {
  const canAlert = canGenerateCriticalAlert(...);
  const roasBenchmark = benchmarks.roasMedio || 3.2;
  alertas.push({ ... });
}

// DEPOIS  
if (atual.marketing.roasAds < 0.8) {
  // Sem benchmark = sem alerta
  if (!benchmarks.roasMedio) continue; // ou return early
  
  const canAlert = canGenerateCriticalAlert(...);
  const roasBenchmark = benchmarks.roasMedio;
  
  if (!canAlert) {
    // Downgrade para info mas SEM valor de benchmark
    alertas.push({ 
      severity: 'info', 
      benchmark: 0, // Indica ausencia
      title: 'ROAS baixo (referencia nao configurada)',
      ...
    });
  } else {
    alertas.push({ severity: 'critical', ... });
  }
}
```

Aplicar mesma logica para:
- Alerta de Churn (linha 70): `if (!benchmarks.taxaChurn) return;`
- Alerta de CAC (linha 112): `if (!benchmarks.cac) return;`

**1.2 criticalAnalysis.ts**

Nas funcoes de score, retornar `null` se benchmark nao existe:

```typescript
// calcularScoreMarketing
const calcularScoreMarketing = (
  marketing: ExecutiveMetrics['marketing'],
  benchmarks: SectorBenchmarks
): number | null => {
  // Validacao rigorosa
  if (!benchmarks.roasMedio || !benchmarks.ctr || !benchmarks.cpc) {
    return null;
  }
  
  const roasScore = Math.min((marketing.roasAds / benchmarks.roasMedio) * 40, 40);
  const ctrScore = Math.min((marketing.ctr / benchmarks.ctr) * 30, 30);
  const cpcScore = Math.min((benchmarks.cpc / marketing.cpc) * 30, 30);
  
  return Math.round(roasScore + ctrScore + cpcScore);
};
```

Aplicar mesma logica em:
- `calcularScoreVendas`: requer `taxaConversao`, `ticketMedio`
- `calcularScoreClientes`: requer `taxaRecompra`, `taxaChurn`, `ltv`
- `calcularScoreProdutos`: requer `margemLiquida`

**1.3 recommendationEngine.ts**

Nao gerar recomendacao se benchmark necessario nao existe:

```typescript
// Rec 2: Programa de Retencao
if (!benchmarks.taxaRecompra) {
  // Skip - sem referencia, nao gerar recomendacao
} else if (atual.clientes.taxaRecompra < benchmarks.taxaRecompra) {
  recomendacoes.push({ ... });
}

// Rec 3: Estrategia Upsell
if (!benchmarks.ticketMedio) {
  // Skip
} else if (atual.vendas.ticketMedioReal < benchmarks.ticketMedio) {
  recomendacoes.push({ ... });
}
```

---

## CORRECAO 2: Tipar Alertas por Natureza

### Problema
Alertas de Receita e Ticket Medio usam comparacao TEMPORAL (vs mes anterior), nao BENCHMARK. O codigo trata todos iguais.

### Solucao

**2.1 Atualizar CriticalAlert type (src/types/executive.ts)**

```typescript
export interface CriticalAlert {
  id: string;
  severity: 'critical' | 'warning' | 'info';
  category: 'marketing' | 'vendas' | 'clientes' | 'produtos' | 'operacoes';
  
  // NOVO: Tipo de comparacao
  alertType: 'benchmark' | 'temporal';
  
  title: string;
  metric: string;
  current: number;
  benchmark: number; // Para temporal, sera o valor do periodo anterior
  gap: number;
  impact: string;
  action: string;
  priority: 'urgent' | 'high' | 'medium';
  estimatedFix: string;
  deadline: Date;
}
```

**2.2 Atualizar alertSystem.ts**

Marcar cada alerta com seu tipo:

```typescript
// Alerta ROAS - usa benchmark
alertas.push({
  id: 'roas-critico',
  alertType: 'benchmark', // NOVO
  ...
});

// Alerta Churn - usa benchmark
alertas.push({
  id: 'churn-critico',
  alertType: 'benchmark', // NOVO
  ...
});

// Alerta CAC - usa benchmark
alertas.push({
  id: 'cac-alto',
  alertType: 'benchmark', // NOVO
  ...
});

// Alerta Queda Receita - usa periodo anterior
alertas.push({
  id: 'queda-receita',
  alertType: 'temporal', // NOVO - compara vs mes anterior
  ...
});

// Alerta Ticket Medio - usa periodo anterior
alertas.push({
  id: 'ticket-queda',
  alertType: 'temporal', // NOVO - compara vs mes anterior
  ...
});
```

---

## CORRECAO 3: Adicionar Campo Source

### Problema
`_meta` informa se metrica e REAL/ESTIMATED, mas nao diz DE ONDE veio.

### Solucao

**3.1 Atualizar metricNature.ts**

Adicionar interface para source:

```typescript
// Apos ExecutiveMetricsMeta

// Mapeamento de origem dos dados
export interface ExecutiveMetricsSource {
  // Vendas
  receita: string;
  pedidos: string;
  ticketMedio: string;
  ticketMedioReal: string;
  conversao: string;
  
  // Marketing
  investimentoAds: string;
  receitaAds: string;
  roasAds: string;
  roasBruto: string;
  roasReal: string;
  roasMeta: string;
  impressoes: string;
  cliques: string;
  ctr: string;
  cpa: string;
  cpc: string;
  
  // Clientes
  novosClientes: string;
  clientesAtivos: string;
  taxaChurn: string;
  taxaRecompra: string;
  ltv: string;
  cac: string;
  
  // Produtos
  topProduto: string;
  receitaTopProduto: string;
  margemMedia: string;
  produtosVendidos: string;
  sku: string;
  
  // Operacoes
  tempoEmissaoNF: string;
  tempoEnvio: string;
  taxaEntrega: string;
  pedidosCancelados: string;
}

// Factory
export const createDefaultSource = (): ExecutiveMetricsSource => ({
  // Vendas
  receita: 'CSV Vendas (valorTotal)',
  pedidos: 'CSV Vendas (count)',
  ticketMedio: 'Derivado (receita / pedidos)',
  ticketMedioReal: 'Derivado (receita ex-amostras / pedidos)',
  conversao: 'Derivado (compras / cliques)',
  
  // Marketing
  investimentoAds: 'CSV Ads (Quantia gasta)',
  receitaAds: 'CSV Ads (Valor de conversao)',
  roasAds: 'Derivado (receitaAds / investimento)',
  roasBruto: 'Derivado (faturamento / investimento)',
  roasReal: 'Derivado (faturamento ex-frete / investimento)',
  roasMeta: 'Derivado (valorConversaoMeta / investimento)',
  impressoes: 'CSV Ads (Impressoes)',
  cliques: 'CSV Ads (Cliques)',
  ctr: 'CSV Ads (CTR)',
  cpa: 'Derivado (investimento / compras)',
  cpc: 'CSV Ads (CPC)',
  
  // Clientes
  novosClientes: 'Derivado (clientes com 1 pedido)',
  clientesAtivos: 'Derivado (< 90 dias sem compra)',
  taxaChurn: 'Derivado (inativos / total)',
  taxaRecompra: 'Derivado (recorrentes / total)',
  ltv: 'Derivado (receita / clientes)',
  cac: 'Derivado (investimento / novos)',
  
  // Produtos
  topProduto: 'CSV Vendas (max receita)',
  receitaTopProduto: 'CSV Vendas (soma)',
  margemMedia: 'Hardcoded (18%)',
  produtosVendidos: 'CSV Vendas (soma quantidade)',
  sku: 'CSV Vendas (count distinct)',
  
  // Operacoes
  tempoEmissaoNF: 'CSV Vendas (dataEmissao - dataVenda)',
  tempoEnvio: 'Hardcoded (2.5 dias)',
  taxaEntrega: 'Hardcoded (96%)',
  pedidosCancelados: 'Hardcoded (4%)',
});
```

**3.2 Atualizar ExecutiveMetrics (src/types/executive.ts)**

```typescript
export interface ExecutiveMetrics {
  vendas: VendasMetrics;
  marketing: MarketingMetrics;
  clientes: ClientesMetrics;
  produtos: ProdutosMetrics;
  operacoes: OperacoesMetrics;
  _meta?: ExecutiveMetricsMeta;
  _source?: ExecutiveMetricsSource; // NOVO
}
```

**3.3 Atualizar executiveMetricsCalculator.ts**

Adicionar `_source` no retorno:

```typescript
import { createDefaultMeta, createDefaultSource } from "@/types/metricNature";

export const calculateExecutiveMetrics = (...) => {
  const _meta = createDefaultMeta();
  const _source = createDefaultSource();
  
  // ... calculos existentes ...
  
  return {
    vendas: { ... },
    marketing: { ... },
    clientes: { ... },
    produtos: { ... },
    operacoes: { ... },
    _meta,
    _source, // NOVO
  };
};
```

---

## Arquivos a Modificar

| Arquivo | Acao |
|---------|------|
| `src/utils/alertSystem.ts` | Remover fallbacks `\|\| valor`, skip se benchmark null |
| `src/utils/criticalAnalysis.ts` | Remover fallbacks, retornar null se benchmark null |
| `src/utils/recommendationEngine.ts` | Remover fallbacks, skip recomendacao se benchmark null |
| `src/types/executive.ts` | Adicionar `alertType` em CriticalAlert, `_source` em ExecutiveMetrics |
| `src/types/metricNature.ts` | Adicionar `ExecutiveMetricsSource` e `createDefaultSource()` |
| `src/utils/executiveMetricsCalculator.ts` | Adicionar `_source` no retorno |

---

## Ordem de Execucao

```text
1. Atualizar src/types/metricNature.ts (ExecutiveMetricsSource + factory)
2. Atualizar src/types/executive.ts (alertType + _source)
3. Atualizar src/utils/executiveMetricsCalculator.ts (retornar _source)
4. Refatorar src/utils/alertSystem.ts (remover fallbacks + alertType)
5. Refatorar src/utils/criticalAnalysis.ts (remover fallbacks)
6. Refatorar src/utils/recommendationEngine.ts (remover fallbacks)
```

---

## Validacao Final

1. Se `roasMedio = null` em app_settings -> alerta de ROAS NAO e gerado
2. Se `ticketMedio = null` -> recomendacao de upsell NAO e gerada
3. Se `taxaRecompra = null` -> score de clientes = null
4. Alertas temporais (receita, ticket) marcados com `alertType: 'temporal'`
5. `_source.margemMedia` retorna `'Hardcoded (18%)'`
6. Sistema responde programaticamente: origem, natureza e benchmark de cada metrica
