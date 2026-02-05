
# Plano: Confianca Temporal (Etapa 3)

## Objetivo
Criar um sistema de maturidade temporal que define quando uma metrica tem dados suficientes para justificar atencao, alerta ou decisao - completando o contrato de governanca junto com Nature (Etapa 1) e Authority (Etapa 2).

---

## BLOCO 1: Classificacao de Confianca Temporal

### 1.1 Criar tipo TemporalConfidence em metricNature.ts

```text
type TemporalConfidence = 
  | 'INSUFFICIENT'   // < 7 dias de dados
  | 'STABILIZING'    // 7-29 dias de dados
  | 'STABLE';        // >= 30 dias de dados
```

### 1.2 Criar interface TemporalMetadata

```text
export interface TemporalMetadata {
  dataPoints: number;        // Quantidade de registros
  windowDays: number;        // Janela em dias (calculada)
  firstDate: Date | null;    // Primeiro registro
  lastDate: Date | null;     // Ultimo registro
  confidence: TemporalConfidence;
  label: string;             // Ex: "23 dias de dados"
}
```

### 1.3 Criar mapa ExecutiveMetricsTemporal

```text
export interface ExecutiveMetricsTemporal {
  // Por categoria (simplificado - nao por metrica individual)
  vendas: TemporalMetadata;
  marketing: TemporalMetadata;
  clientes: TemporalMetadata;
  produtos: TemporalMetadata;
  operacoes: TemporalMetadata;
}
```

### 1.4 Criar funcao calculateTemporalConfidence

```text
export const calculateTemporalConfidence = (
  windowDays: number
): TemporalConfidence => {
  if (windowDays < 7) return 'INSUFFICIENT';
  if (windowDays < 30) return 'STABILIZING';
  return 'STABLE';
};
```

### 1.5 Criar factory createTemporalMetadata

```text
export const createTemporalMetadata = (
  dataPoints: number,
  firstDate: Date | null,
  lastDate: Date | null
): TemporalMetadata => {
  const windowDays = firstDate && lastDate 
    ? differenceInDays(lastDate, firstDate) + 1 
    : 0;
  
  const confidence = calculateTemporalConfidence(windowDays);
  
  const label = windowDays === 0 
    ? 'Sem dados' 
    : `${windowDays} dia${windowDays > 1 ? 's' : ''} de dados`;
  
  return {
    dataPoints,
    windowDays,
    firstDate,
    lastDate,
    confidence,
    label,
  };
};
```

---

## BLOCO 2: Regras de Bloqueio por Tempo

### 2.1 Criar funcoes de verificacao em metricNature.ts

```text
// Verifica se confianca permite alertas
export const canGenerateTemporalAlert = (
  confidence: TemporalConfidence
): boolean => {
  // INSUFFICIENT nao gera alertas
  return confidence === 'STABILIZING' || confidence === 'STABLE';
};

// Verifica se confianca permite recomendacoes
export const canGenerateTemporalRecommendation = (
  confidence: TemporalConfidence
): boolean => {
  // Apenas STABLE pode gerar recomendacoes
  return confidence === 'STABLE';
};

// Verifica se requer aviso de dados iniciais
export const requiresTemporalWarning = (
  confidence: TemporalConfidence
): boolean => {
  return confidence === 'INSUFFICIENT' || confidence === 'STABILIZING';
};
```

### 2.2 Labels para UI

```text
export const TemporalConfidenceLabels: Record<TemporalConfidence, string> = {
  INSUFFICIENT: 'Dados Insuficientes',
  STABILIZING: 'Estabilizando',
  STABLE: 'Estavel',
};

export const TemporalConfidenceBadges: Record<TemporalConfidence, string> = {
  INSUFFICIENT: 'IMAT',  // Imaturo
  STABILIZING: 'ESTAB', // Estabilizando
  STABLE: '',           // Nao exibe badge
};
```

---

## BLOCO 3: Integracao com ExecutiveMetrics

### 3.1 Adicionar _temporal ao ExecutiveMetrics (executive.ts)

```text
export interface ExecutiveMetrics {
  vendas: VendasMetrics;
  marketing: MarketingMetrics;
  clientes: ClientesMetrics;
  produtos: ProdutosMetrics;
  operacoes: OperacoesMetrics;
  _meta?: ExecutiveMetricsMeta;
  _source?: ExecutiveMetricsSource;
  _authority?: ExecutiveMetricsAuthority;
  _temporal?: ExecutiveMetricsTemporal; // NOVO
}
```

### 3.2 Atualizar executiveMetricsCalculator.ts

Calcular janela temporal a partir dos dados recebidos:

```text
export const calculateExecutiveMetrics = (
  orders: ProcessedOrder[],
  adsData: AdsData[],
  month: string
): ExecutiveMetrics | null => {
  // ... calculos existentes ...
  
  // Calcular metadados temporais
  const _temporal = calculateTemporalMetadata(orders, adsData);
  
  return {
    vendas: { ... },
    marketing: { ... },
    _meta,
    _source,
    _authority,
    _temporal, // NOVO
  };
};
```

### 3.3 Criar funcao calculateTemporalMetadata

```text
const calculateTemporalMetadata = (
  orders: ProcessedOrder[],
  adsData: AdsData[]
): ExecutiveMetricsTemporal => {
  // Vendas
  const vendasDates = orders.map(o => o.dataVenda);
  const vendasFirst = vendasDates.length > 0 ? min(vendasDates) : null;
  const vendasLast = vendasDates.length > 0 ? max(vendasDates) : null;
  
  // Marketing (ads)
  const adsDates = adsData.map(a => parse(a["Inicio dos relatorios"], 'yyyy-MM-dd', new Date()));
  const adsFirst = adsDates.length > 0 ? min(adsDates) : null;
  const adsLast = adsDates.length > 0 ? max(adsDates) : null;
  
  // Clientes - derivado de vendas
  const clientesTemporal = createTemporalMetadata(orders.length, vendasFirst, vendasLast);
  
  // Produtos - derivado de vendas
  const produtosTemporal = createTemporalMetadata(orders.length, vendasFirst, vendasLast);
  
  // Operacoes - derivado de vendas (NF)
  const operacoesTemporal = createTemporalMetadata(orders.length, vendasFirst, vendasLast);
  
  return {
    vendas: createTemporalMetadata(orders.length, vendasFirst, vendasLast),
    marketing: createTemporalMetadata(adsData.length, adsFirst, adsLast),
    clientes: clientesTemporal,
    produtos: produtosTemporal,
    operacoes: operacoesTemporal,
  };
};
```

---

## BLOCO 4: Guardrails em Alertas e Recomendacoes

### 4.1 Atualizar alertSystem.ts

Adicionar verificacao temporal APOS verificacao de authority:

```text
export const gerarAlertas = (
  atual: ExecutiveMetrics,
  anterior: ExecutiveMetrics,
  benchmarks: SectorBenchmarks
): CriticalAlert[] => {
  const alertas: CriticalAlert[] = [];
  const meta = atual._meta;
  const authority = atual._authority || createDefaultAuthority();
  const temporal = atual._temporal;
  
  // ROAS Alert
  if (atual.marketing.roasAds < 0.8 && benchmarks.roasMedio) {
    // 1. Verificar authority
    if (!canGenerateAlert(authority.roasAds)) continue;
    
    // 2. Verificar temporal (NOVO)
    const marketingConfidence = temporal?.marketing.confidence || 'STABLE';
    if (!canGenerateTemporalAlert(marketingConfidence)) {
      // Dados insuficientes - skip ou downgrade para info
      alertas.push({
        ...alertData,
        severity: 'info',
        title: 'ROAS baixo (dados iniciais)',
        blockedReason: temporal?.marketing.label || 'Base temporal insuficiente',
      });
      continue;
    }
    
    // 3. Se STABILIZING, adicionar aviso
    if (requiresTemporalWarning(marketingConfidence)) {
      alertData.title += ` (${temporal?.marketing.label})`;
    }
    
    // Gerar alerta normal
    alertas.push(alertData);
  }
};
```

### 4.2 Atualizar recommendationEngine.ts

```text
export const gerarRecomendacoes = (
  atual: ExecutiveMetrics,
  anterior: ExecutiveMetrics,
  benchmarks: SectorBenchmarks
): Recommendation[] => {
  const recomendacoes: Recommendation[] = [];
  const authority = atual._authority || createDefaultAuthority();
  const temporal = atual._temporal;
  
  // Rec 1: Otimizar ROAS
  if (atual.marketing.roasAds < 1.5) {
    // 1. Verificar authority
    if (!canGenerateRecommendation(authority.roasAds)) continue;
    
    // 2. Verificar temporal (NOVO) - DEVE SER STABLE
    const marketingConfidence = temporal?.marketing.confidence || 'STABLE';
    if (!canGenerateTemporalRecommendation(marketingConfidence)) {
      // Nao gerar recomendacao - dados imaturos
      // Pode adicionar a uma lista de "bloqueados" para transparencia
      continue;
    }
    
    // Gerar recomendacao
    recomendacoes.push({ ... });
  }
};
```

### 4.3 Atualizar criticalAnalysis.ts (insights)

```text
// Ao gerar insights, classificar considerando temporal
const generateInsight = (
  metric: string,
  authority: MetricAuthority,
  temporal: TemporalConfidence,
  ...
): TrendInsight => {
  // Se temporal INSUFFICIENT, sempre signal
  if (temporal === 'INSUFFICIENT') {
    return {
      insightClass: 'signal',
      blockedReason: 'Aguardando maturacao temporal da metrica',
      ...
    };
  }
  
  // Se temporal STABILIZING, pode ser context mas nao recommendation
  if (temporal === 'STABILIZING') {
    return {
      insightClass: authority === 'DECISIONAL' ? 'context' : 'signal',
      blockedReason: 'Dados em estabilizacao (< 30 dias)',
      ...
    };
  }
  
  // STABLE - segue regras normais de authority
  // ...
};
```

---

## BLOCO 5: Funcao Completa de Validacao

### 5.1 Criar canGenerateFullRecommendationWithTemporal

Atualizar a funcao existente para incluir temporal:

```text
export const canGenerateFullRecommendationWithTemporal = (
  authority: MetricAuthority,
  nature: MetricNature,
  hasBenchmark: boolean,
  temporalConfidence: TemporalConfidence
): { allowed: boolean; blockedReason?: string } => {
  // Checagem 1: Authority
  if (authority !== 'DECISIONAL') {
    return { 
      allowed: false, 
      blockedReason: `Metrica ${MetricAuthorityLabels[authority]} nao tem autoridade` 
    };
  }
  
  // Checagem 2: Nature
  if (nature !== 'REAL') {
    return { 
      allowed: false, 
      blockedReason: 'Metrica usa dados estimados' 
    };
  }
  
  // Checagem 3: Benchmark
  if (!hasBenchmark) {
    return { 
      allowed: false, 
      blockedReason: 'Benchmark nao configurado' 
    };
  }
  
  // Checagem 4: Temporal (NOVO)
  if (temporalConfidence !== 'STABLE') {
    return { 
      allowed: false, 
      blockedReason: temporalConfidence === 'INSUFFICIENT' 
        ? 'Base temporal insuficiente (< 7 dias)'
        : 'Dados em estabilizacao (< 30 dias)'
    };
  }
  
  return { allowed: true };
};
```

---

## BLOCO 6: UI - Visibilidade Temporal

### 6.1 Atualizar MetricCard.tsx

Adicionar prop temporal opcional:

```text
interface MetricCardProps {
  nature?: MetricNature;
  authority?: MetricAuthority;
  temporal?: TemporalConfidence; // NOVO
  temporalLabel?: string;        // NOVO: "23 dias de dados"
}
```

Renderizar badge temporal quando nao STABLE:

```text
{temporal && temporal !== 'STABLE' && (
  <Tooltip>
    <TooltipTrigger>
      <Badge 
        variant="outline" 
        className={cn(
          "text-[10px] ml-1",
          temporal === 'INSUFFICIENT' && "bg-red-50 text-red-700 border-red-200",
          temporal === 'STABILIZING' && "bg-yellow-50 text-yellow-700 border-yellow-200"
        )}
      >
        {TemporalConfidenceBadges[temporal]}
      </Badge>
    </TooltipTrigger>
    <TooltipContent>
      {temporalLabel || TemporalConfidenceLabels[temporal]}
    </TooltipContent>
  </Tooltip>
)}
```

### 6.2 Atualizar HealthScoreCard.tsx

Exibir janela temporal junto com parcialidade:

```text
// Se temporal insuficiente em alguma categoria
{hasInsufficientTemporal && (
  <div className="mt-2 p-2 bg-amber-50 rounded border border-amber-200">
    <p className="text-xs text-amber-700">
      ⏳ Base temporal incompleta: {temporalReason}
    </p>
  </div>
)}
```

### 6.3 Atualizar TrendInsightCard.tsx

Mostrar quando insight foi bloqueado por temporal:

```text
{insight.blockedReason?.includes('temporal') && (
  <Badge variant="outline" className="text-[10px] bg-amber-50">
    ⏳ {insight.blockedReason}
  </Badge>
)}
```

---

## BLOCO 7: Formalizacao de Alertas Temporais

### 7.1 Criar tipo para alertas temporais

Formalizar a excecao que ja existe (Receita, Ticket):

```text
// Alertas temporais tem regras diferentes:
// - Podem ser gerados por metricas OBSERVATIONAL
// - Comparam periodo vs periodo, nao vs benchmark
// - NAO geram recomendacoes (apenas sinalizacao)
export interface TemporalAlertConfig {
  metricKey: string;
  isTemporalAlert: true;
  comparesAgainst: 'previous_period';
  canTriggerRecommendation: false; // Sempre false
}
```

### 7.2 Documentar no alertSystem.ts

```text
// ============================================
// ALERTAS TEMPORAIS (excecao documentada)
// ============================================
// Alertas de Receita e Ticket Medio sao TEMPORAIS:
// - Comparam periodo atual vs periodo anterior
// - Permitidos mesmo para metricas OBSERVATIONAL
// - NUNCA geram recomendacoes
// - Sao sinalizacoes, nao decisoes
// ============================================
```

---

## Arquivos a Modificar

| Arquivo | Acao |
|---------|------|
| `src/types/metricNature.ts` | Adicionar TemporalConfidence, TemporalMetadata, ExecutiveMetricsTemporal, guardrails |
| `src/types/executive.ts` | Adicionar _temporal em ExecutiveMetrics |
| `src/utils/executiveMetricsCalculator.ts` | Calcular _temporal a partir dos dados |
| `src/utils/alertSystem.ts` | Aplicar guardrail temporal antes de gerar alertas |
| `src/utils/recommendationEngine.ts` | Aplicar guardrail temporal antes de gerar recomendacoes |
| `src/utils/criticalAnalysis.ts` | Considerar temporal na classificacao de insights |
| `src/components/dashboard/MetricCard.tsx` | Prop temporal + badge |
| `src/components/executive/HealthScoreCard.tsx` | Indicar janela temporal |
| `src/components/executive/TrendInsightCard.tsx` | Mostrar bloqueio temporal |

---

## Ordem de Execucao

```text
1. src/types/metricNature.ts - Criar TemporalConfidence + interfaces + guardrails
2. src/types/executive.ts - Adicionar _temporal em ExecutiveMetrics
3. src/utils/executiveMetricsCalculator.ts - Calcular _temporal
4. src/utils/alertSystem.ts - Aplicar guardrail temporal
5. src/utils/recommendationEngine.ts - Aplicar guardrail temporal
6. src/utils/criticalAnalysis.ts - Classificar insights com temporal
7. src/components/dashboard/MetricCard.tsx - Badge temporal
8. src/components/executive/HealthScoreCard.tsx - Indicador temporal
9. src/components/executive/TrendInsightCard.tsx - Bloqueio temporal
```

---

## Impacto nas Funcionalidades

### Recomendacoes que serao BLOQUEADAS se dados < 30 dias
- Otimizar ROAS
- Programa de Retencao (Churn)
- Novos Canais (CAC)

### Alertas que serao DOWNGRADED se dados < 7 dias
- ROAS Critico -> info com aviso
- Churn Critico -> info com aviso
- CAC Alto -> info com aviso

### Alertas TEMPORAIS (mantidos como estao)
- Queda Receita (vs mes anterior)
- Ticket Queda (vs mes anterior)
- Ja sao sinalizacoes, nao decisoes

---

## Contrato Final de Recomendacao

Uma recomendacao so pode existir se:

```text
authority === DECISIONAL
AND nature === REAL
AND benchmark existe
AND temporalConfidence === STABLE
```

Sem excecoes.

---

## Validacao Final

1. Com 5 dias de dados -> nenhum alerta critico, nenhuma recomendacao
2. Com 20 dias de dados -> alertas com aviso "estabilizando", nenhuma recomendacao
3. Com 35 dias de dados -> alertas normais, recomendacoes permitidas
4. UI exibe "23 dias de dados" discretamente nos cards
5. Sistema explica: "Aguardando maturacao temporal da metrica"
6. Alertas temporais (Receita, Ticket) continuam funcionando independentemente
