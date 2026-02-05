
# Plano de Correcoes: Integridade de Dados do Dashboard

## Resumo Executivo
Eliminar benchmarks hardcoded, formalizar natureza das metricas (REAL/ESTIMATED), e impedir que o sistema apresente alertas ou scores enganosos baseados em dados estimados ou referencias invalidas.

---

## PASSO 1: Eliminar benchmarksPetFood (Prioridade Absoluta)

### Problema Atual
O arquivo `src/data/executiveData.ts` exporta `benchmarksPetFood` que e importado diretamente em:
- `alertSystem.ts` (linhas 2, 14, 23, 42, 43, 81, 82)
- `criticalAnalysis.ts` (linhas 2, 50, 54, 58, 86, 100, 259, 262, 268, 269, 275)
- `recommendationEngine.ts` (linhas 2, 36, 61, 62)

### Solucao

**1.1 Modificar alertSystem.ts**

Alterar assinatura da funcao para receber benchmarks como parametro:

```text
// ANTES
export const gerarAlertas = (
  atual: ExecutiveMetrics,
  anterior: ExecutiveMetrics
): CriticalAlert[]

// DEPOIS
export const gerarAlertas = (
  atual: ExecutiveMetrics,
  anterior: ExecutiveMetrics,
  benchmarks: SectorBenchmarks
): CriticalAlert[]
```

Substituir todas as referencias:
- `benchmarksPetFood.roasMedio` -> `benchmarks.roasMedio`
- `benchmarksPetFood.taxaChurn` -> `benchmarks.taxaChurn`
- `benchmarksPetFood.cac` -> `benchmarks.cac`

Remover: `import { benchmarksPetFood } from "@/data/executiveData";`

**1.2 Modificar criticalAnalysis.ts**

Mesma estrategia: injetar benchmarks como parametro em:
- `calcularHealthScore(metrics, benchmarks)`
- `calcularScoreMarketing(marketing, benchmarks)`
- `calcularScoreVendas(vendas, benchmarks)`
- `calcularScoreClientes(clientes, benchmarks)`
- `calcularScoreProdutos(produtos, benchmarks)`
- `gerarInsights(atual, anterior, healthScore, benchmarks)`

**1.3 Modificar recommendationEngine.ts**

Injetar benchmarks:
- `gerarRecomendacoes(atual, anterior, benchmarks)`

**1.4 Atualizar ExecutiveDashboard.tsx**

Passar `sectorBenchmarks` de `useAppSettings()` para todas as funcoes refatoradas.

**1.5 Deprecar benchmarksPetFood**

Adicionar comentario de depreciacao em `src/data/executiveData.ts`:

```text
/**
 * @deprecated NAO USAR - Migrado para app_settings.sector_benchmarks
 * Mantido apenas para referencia historica
 */
export const benchmarksPetFood = { ... }
```

---

## PASSO 2: Criar Sistema de Natureza de Metricas

### Criar novo arquivo: `src/types/metricNature.ts`

```text
export type MetricNature = 'REAL' | 'ESTIMATED' | 'INFERRED';

export interface MetricWithNature<T = number> {
  value: T;
  nature: MetricNature;
  source?: string; // Opcional: origem do dado
}
```

### Modificar executiveMetricsCalculator.ts

Criar interface estendida que inclui metadados de natureza:

```text
export interface ExecutiveMetricsWithNature extends ExecutiveMetrics {
  _meta: {
    margemMedia: MetricNature;      // 'ESTIMATED'
    tempoEnvio: MetricNature;       // 'ESTIMATED'
    taxaEntrega: MetricNature;      // 'ESTIMATED'
    pedidosCancelados: MetricNature; // 'ESTIMATED'
    tempoEmissaoNF: MetricNature;   // 'REAL'
    // ... demais metricas
  };
}
```

Atualizar retorno da funcao `calculateExecutiveMetrics`:

```text
return {
  vendas: { ... },
  marketing: { ... },
  clientes: { ... },
  produtos: { margemMedia, ... },
  operacoes: { tempoEnvio, taxaEntrega, pedidosCancelados, tempoEmissaoNF },
  _meta: {
    margemMedia: 'ESTIMATED',
    tempoEnvio: 'ESTIMATED',
    taxaEntrega: 'ESTIMATED',
    pedidosCancelados: 'ESTIMATED',
    tempoEmissaoNF: 'REAL',
  }
};
```

---

## PASSO 3: Guardrails em Alertas

### Modificar alertSystem.ts

Adicionar validacao antes de gerar alertas criticos:

```text
interface AlertConfig {
  benchmarkKey: keyof SectorBenchmarks;
  metricNature: MetricNature;
}

const canGenerateCriticalAlert = (
  benchmarks: SectorBenchmarks,
  benchmarkKey: keyof SectorBenchmarks,
  metricNature: MetricNature
): boolean => {
  // Benchmark deve existir e nao ser null
  const benchmarkValue = benchmarks[benchmarkKey];
  if (benchmarkValue === null || benchmarkValue === undefined) return false;
  
  // Metrica deve ser REAL para alertas criticos
  if (metricNature !== 'REAL') return false;
  
  return true;
};
```

Aplicar guardrail em cada alerta:

```text
// ANTES
if (atual.marketing.roasAds < 0.8) {
  alertas.push({ severity: 'critical', ... });
}

// DEPOIS
if (atual.marketing.roasAds < 0.8) {
  const canAlert = canGenerateCriticalAlert(benchmarks, 'roasMedio', meta.roasAds);
  if (canAlert) {
    alertas.push({ severity: 'critical', ... });
  } else {
    // Downgrade para info se nao pode ser critico
    alertas.push({ severity: 'info', title: 'ROAS baixo (referencia incompleta)', ... });
  }
}
```

---

## PASSO 4: Proteger Health Score

### Modificar criticalAnalysis.ts

Expandir logica de `isOperacoesEstimada` para cobrir todos os casos:

```text
interface ScoreValidation {
  isValid: boolean;
  reason?: string;
}

const validateScoreComponent = (
  component: 'marketing' | 'vendas' | 'clientes' | 'produtos' | 'operacoes',
  benchmarks: SectorBenchmarks,
  meta: ExecutiveMetricsWithNature['_meta']
): ScoreValidation => {
  switch (component) {
    case 'produtos':
      if (meta.margemMedia === 'ESTIMATED') {
        return { isValid: false, reason: 'Margem estimada' };
      }
      break;
    case 'operacoes':
      if (meta.tempoEnvio === 'ESTIMATED' || meta.taxaEntrega === 'ESTIMATED') {
        return { isValid: false, reason: 'Operacoes estimadas' };
      }
      break;
    // marketing, vendas, clientes - validar benchmarks
    default:
      // Verificar se benchmarks necessarios existem
      break;
  }
  return { isValid: true };
};
```

Atualizar HealthScore type:

```text
export interface HealthScore {
  overall: number;
  breakdown: {
    marketing: number | null;
    vendas: number | null;
    clientes: number | null;
    produtos: number | null;
    operacoes: number | null;
  };
  status: 'critical' | 'warning' | 'good' | 'excellent' | 'partial';
  isPartial: boolean;
  partialReasons: string[];
}
```

Logica de determinacao de status:

```text
// Se qualquer breakdown for null, status = 'partial'
const hasNullComponents = Object.values(breakdown).some(v => v === null);
if (hasNullComponents) {
  return {
    overall,
    breakdown,
    status: 'partial',
    isPartial: true,
    partialReasons: ['Alguns componentes usam dados estimados'],
  };
}
```

---

## PASSO 5: UI - Badges de Natureza

### Modificar MetricCard.tsx

Adicionar prop opcional `nature`:

```text
interface MetricCardProps {
  // ... existentes
  nature?: 'REAL' | 'ESTIMATED' | 'INFERRED';
}
```

Renderizar badge discreto:

```text
{nature && nature !== 'REAL' && (
  <Badge 
    variant="outline" 
    className={cn(
      "text-[10px] ml-2",
      nature === 'ESTIMATED' && "bg-amber-50 text-amber-700 border-amber-200",
      nature === 'INFERRED' && "bg-purple-50 text-purple-700 border-purple-200"
    )}
  >
    {nature === 'ESTIMATED' ? 'EST' : 'INF'}
  </Badge>
)}
```

### Modificar HealthScoreCard.tsx

Adicionar estado visual PARCIAL:

```text
const getStatusColor = (status: HealthScore['status']) => {
  switch (status) {
    // ... existentes
    case 'partial': return 'from-gray-50 to-gray-100 border-gray-400';
  }
};

const getStatusLabel = (status: HealthScore['status']) => {
  switch (status) {
    // ... existentes
    case 'partial': return 'Parcial';
  }
};
```

Exibir razoes quando parcial:

```text
{healthScore.isPartial && (
  <div className="mt-4 p-3 bg-amber-50 rounded-lg border border-amber-200">
    <p className="text-xs font-semibold text-amber-800">
      ⚠️ Score baseado em dados incompletos
    </p>
    <ul className="text-xs text-amber-700 mt-1 list-disc list-inside">
      {healthScore.partialReasons.map((reason, i) => (
        <li key={i}>{reason}</li>
      ))}
    </ul>
  </div>
)}
```

### Modificar CriticalAlertCard.tsx

Nenhuma mudanca necessaria - a logica do PASSO 3 ja impede alertas criticos invalidos.

---

## Arquivos a Modificar

| Arquivo | Acao |
|---------|------|
| `src/types/metricNature.ts` | **CRIAR** - Enum e interfaces |
| `src/types/executive.ts` | **MODIFICAR** - Adicionar status 'partial' e campos |
| `src/data/executiveData.ts` | **MODIFICAR** - Deprecar benchmarksPetFood |
| `src/utils/alertSystem.ts` | **REFATORAR** - Injetar benchmarks + guardrails |
| `src/utils/criticalAnalysis.ts` | **REFATORAR** - Injetar benchmarks + validacao |
| `src/utils/recommendationEngine.ts` | **REFATORAR** - Injetar benchmarks |
| `src/utils/executiveMetricsCalculator.ts` | **MODIFICAR** - Adicionar _meta |
| `src/pages/ExecutiveDashboard.tsx` | **MODIFICAR** - Passar benchmarks |
| `src/components/dashboard/MetricCard.tsx` | **MODIFICAR** - Prop nature + badge |
| `src/components/executive/HealthScoreCard.tsx` | **MODIFICAR** - Estado partial |

---

## Ordem de Execucao

```text
1. Criar src/types/metricNature.ts
2. Atualizar src/types/executive.ts (HealthScore com partial)
3. Refatorar alertSystem.ts (remover import hardcoded)
4. Refatorar criticalAnalysis.ts (remover import hardcoded)
5. Refatorar recommendationEngine.ts (remover import hardcoded)
6. Atualizar executiveMetricsCalculator.ts (adicionar _meta)
7. Atualizar ExecutiveDashboard.tsx (passar sectorBenchmarks)
8. Atualizar MetricCard.tsx (badge nature)
9. Atualizar HealthScoreCard.tsx (estado partial)
10. Deprecar benchmarksPetFood em executiveData.ts
```

---

## Validacao Final

Apos implementacao, o sistema deve passar nestes testes:

1. Alterar ROAS meta em /metas -> Alertas de ROAS mudam imediatamente
2. Zerar benchmark de taxaChurn -> Alerta de churn desaparece (sem referencia)
3. Health Score exibe "Parcial" se operacoes ou produtos usam estimativas
4. MetricCard de "Margem Media" exibe badge "EST"
5. Nenhum alerta CRITICO usa metrica ESTIMATED
