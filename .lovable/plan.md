

# Radar Operacional -- Implementacao

## Visao geral

Criar o hook `useRadarOperacional` com logica estatistica completa, a pagina `RadarOperacional.tsx` com 4 blocos diretivos, e registrar rota + sidebar. Nenhuma migracao SQL necessaria -- todos os dados ja existem.

---

## Arquivo 1: `src/hooks/useRadarOperacional.ts`

### Queries (campos minimos, paralelas via useQuery)

1. **customer_complaint**: `id, customer_id, produto, lote, transportador, tipo_reclamacao, data_contato, data_fechamento, status, gravidade`
2. **customer_contact_log**: `id, data_contato`
3. **sales_data**: `data_venda, cliente_email, forma_envio, produtos` filtrado por `tipo_movimento = 'venda'` e ultimos 180 dias (evitar limite 1000 rows; usar `.gte('data_venda', date180dAgo)`)
4. **customer_full**: `id, cpf_cnpj, segment` (para lookup VIP, feito em memoria)

### Constantes congeladas (hardcoded)

```text
SIGMA_WARNING = 0.5
SIGMA_DANGER = 1.0
TREND_WARNING_PERCENT = 15
SLA_GREEN_DAYS = 3
SLA_YELLOW_DAYS = 7
REPURCHASE_GREEN_PCT = 40
REPURCHASE_YELLOW_PCT = 20
REPURCHASE_WINDOW_DAYS = 90
MIN_COMPLAINT_THRESHOLD = 5
HISTORICAL_WINDOW_DAYS = 180
MIN_ORDERS_FOR_FRICTION = 20
FREEZE_DATE = '2026-02-27'
REVIEW_DATE = '2026-05-27'
```

### Helpers matematicos (funcoes puras no mesmo arquivo)

- `mean(values: number[]): number` -- media aritmetica
- `stddev(values: number[]): number` -- desvio padrao populacional
- `buildWindows(dates: Date[], windowDays: number, totalDays: number, referenceDate: Date): number[]` -- agrupa datas em janelas e retorna array de contagens

### Logica de calculo (useMemo)

**KPI 1 -- Reclamacoes 30d:**
- Valor: count complaints ultimos 30 dias
- Baseline: construir 3 janelas moveis de 30 dias dentro dos ultimos 90 dias (dias 0-30, 31-60, 61-90). Usar esses 3 pontos para media e sigma. Dimensionalmente consistente (30d vs 30d).
- Tendencia: variacao percentual entre janela atual (0-30) e janela anterior (31-60)
- Semaforo:
  - success: valor <= media + 0.5 * sigma
  - warning: valor > media + 0.5 * sigma OU tendencia >= +15%
  - danger: valor > media + 1 * sigma

**KPI 2 -- Indice de Friccao:**
- Formula: `(contatos_30d + reclamacoes_30d) / (totalPedidos90d / 3)`
- Se `totalPedidos90d / 3 < 20`: status = 'neutral' com interpretacao "Volume insuficiente para calculo"
- Baseline: mesma logica de 3 janelas de 30d, calculando indice para cada janela
- Semaforo: mesma logica sigma

**KPI 3 -- SLA Medio:**
- Media de dias entre `data_contato` e `data_fechamento` para complaints com status 'resolvida' ou 'fechada' nos ultimos 90 dias
- Semaforo fixo: success <= 3, warning <= 7, danger > 7

**KPI 4 -- Recompra Pos-Reclamacao:**
- Para cada customer_id com reclamacao: pegar reclamacao mais recente
- Ignorar clientes cuja reclamacao mais recente foi ha menos de 90 dias (janela aberta)
- Verificar se existe pedido de venda em sales_data (via `cliente_email` join com `customer_full.cpf_cnpj`) com `data_venda` posterior a `data_contato`, dentro de 90 dias
- Formula: clientes_com_recompra / clientes_elegiveis * 100 (so contar 1 por cliente)
- Semaforo fixo: success >= 40%, warning >= 20%, danger < 20%

**Status Geral:**
- Se qualquer KPI = danger -> "desvio"
- Se >= 2 KPIs = warning -> "indicio"
- Caso contrario -> "estavel"

**Bloco 2 -- Principal Fonte de Problema:**
- Analisa 4 eixos nos ultimos 90 dias: produto, lote, transportador, tipo_reclamacao
- Ignora itens com < 5 reclamacoes
- Normalizacao:
  - Transportador: count_reclamacoes / count_pedidos_com_mesmo_forma_envio (sales_data)
  - Produto: count_reclamacoes / count_pedidos_contendo_produto (parsing produtos jsonb, usando `standardizeProductName` de `productNormalizer.ts` para consistencia)
  - Lote e tipo_reclamacao: contagem bruta
- Comparar taxa 90d (dias 0-90) vs baseline (dias 91-180). NAO auto-incluir periodo atual.
- Eixo com maior desvio percentual positivo = "Principal Fonte"
- Se nenhum atinge threshold: null

**Bloco 3 -- Ranking Critico:**
- Top 5 itens do MESMO eixo do Bloco 2
- Tendencia: count ultimos 30d vs count dias 31-60

**Bloco 4 -- Recomendacao:**
- Texto fixo por eixo + contexto numerico + lista VIPs afetados (join em memoria)

### Retorno do hook

```text
{
  kpis: Array<{ label, value, formattedValue, status, detail, trend }>
  overallStatus: 'estavel' | 'indicio' | 'desvio'
  mainProblemSource: { axis, axisLabel, item, count, rate?, deviation, deviationPercent } | null
  criticalRanking: Array<{ item, count, rate?, trend: 'up'|'down'|'stable' }>
  recommendation: { text, context, affectedVips: string[] } | null
  parameters: { freezeDate, reviewDate, sigmaWarning, sigmaDanger, ... }
  isLoading: boolean
}
```

---

## Arquivo 2: `src/pages/RadarOperacional.tsx`

Layout fixo, sem filtros, 4 blocos verticais. Usa componentes existentes (Card, Badge, Table, Accordion, StatusMetricCard).

1. **Header**: "Radar Operacional" + Badge status geral (cores: green/amber/red)
2. **Bloco 1**: Grid `md:grid-cols-4` com 4 `StatusMetricCard` (componente existente em `src/components/dashboard/StatusMetricCard.tsx`)
3. **Bloco 2**: Card "Principal Fonte de Problema" -- mostra eixo, item, contagem, desvio %. Se nulo: CheckCircle + "Nenhum desvio significativo"
4. **Bloco 3**: Tabela compacta com ranking (componentes Table existentes). So aparece se mainProblemSource != null
5. **Bloco 4**: Card alerta com recomendacao + VIPs. So aparece se mainProblemSource != null
6. **Rodape**: Accordion "Como o Radar calcula" com criterios + datas de congelamento + "Dados analisados ate: [data atual]"
7. **Loading**: Skeleton cards + skeleton table

---

## Arquivo 3: `src/components/AppSidebar.tsx`

Importar `Activity` de lucide-react. Adicionar como primeiro item do grupo CRM:

```text
{ title: "Radar Operacional", url: "/radar-operacional", icon: Activity }
```

---

## Arquivo 4: `src/App.tsx`

Importar `RadarOperacional` e adicionar rota:

```text
/radar-operacional -> ProtectedRoute > AuthenticatedLayout > RadarOperacional
```

---

## Sequencia de implementacao

1. Criar `src/hooks/useRadarOperacional.ts`
2. Criar `src/pages/RadarOperacional.tsx`
3. Atualizar `AppSidebar.tsx` (novo item CRM)
4. Atualizar `App.tsx` (nova rota)

## Dividas tecnicas documentadas

- Parsing de `sales_data.produtos` jsonb client-side para normalizacao por produto -- migrar para SQL view se volume crescer
- Sigma com 3 pontos de 30 dias e minimo viavel -- reavaliar apos 90 dias
- Query de sales_data limitada a 180 dias para evitar limite de 1000 rows

