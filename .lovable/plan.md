
# Plano: Governanca de Significado (Etapa 2)

## Objetivo
Criar um sistema de autoridade de metricas que define o que cada metrica pode provocar no sistema - separando sinal de decisao e impedindo que metricas erradas gerem acoes.

---

## BLOCO 1: Classificacao de Autoridade

### 1.1 Criar tipo MetricAuthority em metricNature.ts

```text
type MetricAuthority = 
  | 'OBSERVATIONAL'  // informa, nunca age
  | 'DIAGNOSTIC'     // gera alerta, nao acao
  | 'DECISIONAL'     // pode sugerir acao
  | 'RESTRICTED';    // nunca automatizar
```

### 1.2 Criar mapa de autoridades ExecutiveMetricsAuthority

```text
export interface ExecutiveMetricsAuthority {
  // Vendas
  receita: MetricAuthority;        // OBSERVATIONAL
  pedidos: MetricAuthority;        // OBSERVATIONAL
  ticketMedio: MetricAuthority;    // DIAGNOSTIC
  ticketMedioReal: MetricAuthority; // DIAGNOSTIC
  conversao: MetricAuthority;      // DIAGNOSTIC
  
  // Marketing
  roasAds: MetricAuthority;        // DECISIONAL
  cac: MetricAuthority;            // DECISIONAL
  // ...etc
  
  // Clientes
  taxaChurn: MetricAuthority;      // DECISIONAL
  taxaRecompra: MetricAuthority;   // DIAGNOSTIC
  ltv: MetricAuthority;            // RESTRICTED
  
  // Produtos
  margemMedia: MetricAuthority;    // RESTRICTED
  
  // Health Score
  healthScore: MetricAuthority;    // DIAGNOSTIC
}
```

### 1.3 Criar factory createDefaultAuthority()

Retorna o mapa com autoridades pre-definidas conforme tabela do prompt:
- Receita: OBSERVATIONAL
- Pedidos: OBSERVATIONAL  
- Ticket Medio: DIAGNOSTIC
- Conversao: DIAGNOSTIC
- ROAS: DECISIONAL
- CAC: DECISIONAL
- Churn: DECISIONAL
- Taxa Recompra: DIAGNOSTIC
- LTV: RESTRICTED
- Margem Estimada: RESTRICTED
- Health Score: DIAGNOSTIC

---

## BLOCO 2: Contrato de Acao (Guardrails)

### 2.1 Criar funcoes de verificacao em metricNature.ts

```text
// Verifica se metrica pode gerar alerta
export const canGenerateAlert = (authority: MetricAuthority): boolean => {
  return authority === 'DIAGNOSTIC' || authority === 'DECISIONAL';
  // OBSERVATIONAL e RESTRICTED nao geram alertas
};

// Verifica se metrica pode gerar recomendacao
export const canGenerateRecommendation = (authority: MetricAuthority): boolean => {
  return authority === 'DECISIONAL';
  // Apenas DECISIONAL pode sugerir acao
};

// Verifica se metrica requer aviso explicito
export const requiresExplicitWarning = (authority: MetricAuthority): boolean => {
  return authority === 'RESTRICTED';
};
```

### 2.2 Modificar alertSystem.ts

Adicionar verificacao de authority antes de gerar alertas:

```text
// Para cada alerta:
const authority = getMetricAuthority('roasAds');
if (!canGenerateAlert(authority)) {
  // Skip - metrica nao tem permissao para alertar
  continue;
}
```

Alertas de metricas OBSERVATIONAL (receita, pedidos) passam a ser bloqueados.
O alerta de "queda de receita" sera reclassificado ou removido (receita e OBSERVATIONAL).

### 2.3 Modificar recommendationEngine.ts

Adicionar verificacao de authority antes de gerar recomendacoes:

```text
// Cada recomendacao deve verificar:
const roasAuthority = getMetricAuthority('roasAds');
if (!canGenerateRecommendation(roasAuthority)) {
  // Skip - nao pode recomendar baseado nesta metrica
  continue;
}
```

Recomendacoes baseadas em ticket medio (DIAGNOSTIC) serao bloqueadas.
Apenas ROAS, CAC e Churn poderao gerar recomendacoes.

---

## BLOCO 3: Separacao entre Sinal e Decisao

### 3.1 Atualizar TrendInsight type em executive.ts

```text
export interface TrendInsight {
  type: 'sucesso' | 'atencao' | 'oportunidade';
  insightClass: 'signal' | 'context' | 'recommendation'; // NOVO
  title: string;
  description: string;
  metrics: { ... }[];
  blockedReason?: string; // NOVO - explica por que nao ha acao
}
```

### 3.2 Regras de classificacao de insights

```text
insightClass: 'signal'
- Toda metrica pode emitir (OBSERVATIONAL, DIAGNOSTIC, DECISIONAL)
- Ex: "ROAS caiu 25%" 

insightClass: 'context'
- DIAGNOSTIC e DECISIONAL podem emitir
- Ex: "Ticket medio abaixo do benchmark"

insightClass: 'recommendation'
- Apenas DECISIONAL pode emitir
- Apenas se nature === 'REAL'
- Apenas se benchmark existe
- Ex: "Pausar campanhas com baixo ROI"
```

### 3.3 Modificar gerarInsights() em criticalAnalysis.ts

```text
// Insight de ROAS pode ser recommendation (DECISIONAL + REAL + benchmark)
if (authority === 'DECISIONAL' && meta.roasAds === 'REAL' && benchmarks.roasMedio) {
  insights.push({ insightClass: 'recommendation', ... });
} else if (canGenerateAlert(authority)) {
  insights.push({ insightClass: 'signal', ... });
} else {
  // Explicar por que nao agiu
  insights.push({ insightClass: 'context', blockedReason: 'Metrica sem autoridade para acao' });
}
```

---

## BLOCO 4: Visibilidade e Transparencia na UI

### 4.1 Atualizar MetricCard.tsx

Adicionar prop authority opcional:

```text
interface MetricCardProps {
  nature?: MetricNature;
  authority?: MetricAuthority; // NOVO
}
```

Renderizar badge de authority quando RESTRICTED:

```text
{authority === 'RESTRICTED' && (
  <Badge variant="destructive" className="text-[10px]">
    ⚠️ Restrita
  </Badge>
)}
```

### 4.2 Criar componente AuthorityBadge.tsx

Badge discreto para exibir autoridade:

```text
const AuthorityBadge = ({ authority }: { authority: MetricAuthority }) => {
  const config = {
    OBSERVATIONAL: { label: 'OBS', color: 'gray' },
    DIAGNOSTIC: { label: 'DIAG', color: 'blue' },
    DECISIONAL: { label: 'DEC', color: 'green' },
    RESTRICTED: { label: 'REST', color: 'red' },
  };
  
  return <Badge>{config[authority].label}</Badge>;
};
```

### 4.3 Atualizar TrendInsightCard.tsx

Adicionar indicador de classe do insight:

```text
// Badge indicando se e signal/context/recommendation
<Badge className={...}>
  {insight.insightClass === 'signal' ? 'Sinal' : 
   insight.insightClass === 'context' ? 'Contexto' : 
   'Recomendacao'}
</Badge>

// Se bloqueado, mostrar razao
{insight.blockedReason && (
  <Tooltip>
    <TooltipTrigger><Info /></TooltipTrigger>
    <TooltipContent>{insight.blockedReason}</TooltipContent>
  </Tooltip>
)}
```

### 4.4 Atualizar RecommendationCard.tsx

Mostrar quais metricas fundamentam a recomendacao:

```text
<div className="text-xs text-muted-foreground">
  Baseado em: {recommendation.basedOnMetric} (DECISIONAL)
</div>
```

---

## BLOCO 5: Adicionar _authority ao ExecutiveMetrics

### 5.1 Atualizar executive.ts

```text
export interface ExecutiveMetrics {
  vendas: VendasMetrics;
  marketing: MarketingMetrics;
  clientes: ClientesMetrics;
  produtos: ProdutosMetrics;
  operacoes: OperacoesMetrics;
  _meta?: ExecutiveMetricsMeta;
  _source?: ExecutiveMetricsSource;
  _authority?: ExecutiveMetricsAuthority; // NOVO
}
```

### 5.2 Atualizar executiveMetricsCalculator.ts

Retornar _authority junto com _meta e _source:

```text
return {
  vendas: { ... },
  marketing: { ... },
  _meta,
  _source,
  _authority: createDefaultAuthority(), // NOVO
};
```

---

## Arquivos a Modificar

| Arquivo | Acao |
|---------|------|
| `src/types/metricNature.ts` | Adicionar MetricAuthority, ExecutiveMetricsAuthority, factories, guardrails |
| `src/types/executive.ts` | Adicionar insightClass e blockedReason em TrendInsight, _authority em ExecutiveMetrics |
| `src/utils/alertSystem.ts` | Adicionar verificacao de authority antes de gerar alertas |
| `src/utils/recommendationEngine.ts` | Adicionar verificacao de authority antes de gerar recomendacoes |
| `src/utils/criticalAnalysis.ts` | Adicionar insightClass na geracao de insights |
| `src/utils/executiveMetricsCalculator.ts` | Retornar _authority |
| `src/components/dashboard/MetricCard.tsx` | Prop authority + badge RESTRICTED |
| `src/components/executive/TrendInsightCard.tsx` | Badge de insightClass + tooltip blockedReason |
| `src/components/executive/RecommendationCard.tsx` | Indicar metrica base |

---

## Ordem de Execucao

```text
1. src/types/metricNature.ts - Criar MetricAuthority + ExecutiveMetricsAuthority + factories + guardrails
2. src/types/executive.ts - Adicionar insightClass, blockedReason, _authority
3. src/utils/executiveMetricsCalculator.ts - Retornar _authority
4. src/utils/alertSystem.ts - Aplicar guardrail de authority
5. src/utils/recommendationEngine.ts - Aplicar guardrail de authority
6. src/utils/criticalAnalysis.ts - Classificar insights por classe
7. src/components/dashboard/MetricCard.tsx - Badge authority
8. src/components/executive/TrendInsightCard.tsx - Badge insightClass
9. src/components/executive/RecommendationCard.tsx - Metrica base
```

---

## Impacto nas Funcionalidades Existentes

### Alertas que serao BLOQUEADOS
- Queda de Receita (receita e OBSERVATIONAL) - se mantido, sera reclassificado para signal
- Qualquer alerta baseado em metrica RESTRICTED

### Recomendacoes que serao BLOQUEADAS
- Upsell baseado em Ticket Medio (DIAGNOSTIC, nao DECISIONAL)
- Retencao baseada em Taxa Recompra (DIAGNOSTIC)

### Recomendacoes que PERMANECEM
- Otimizar ROAS (DECISIONAL)
- Reduzir CAC (DECISIONAL)
- Combater Churn (DECISIONAL)

---

## Validacao Final

1. Metrica OBSERVATIONAL nunca gera alerta ou recomendacao
2. Metrica DIAGNOSTIC gera alerta mas nunca recomendacao
3. Metrica DECISIONAL pode gerar alerta e recomendacao (se REAL + benchmark)
4. Metrica RESTRICTED exibe aviso explicito e nunca age
5. Sistema explica por que nao agiu quando authority bloqueia
6. Health Score (DIAGNOSTIC) pode alertar mas nao pode recomendar

