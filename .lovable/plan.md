

# Adicionar "Total de Amostras Distribuidas" + Reorganizar Bloco Volume

## Resumo

Adicionar KPI de unidades de amostra distribuidas na pagina de Analise de Amostras, com nomenclatura correta e calculo alinhado ao paradigma economico do sistema.

## Alteracoes

### 1. Tipo -- `src/types/marketing.ts`

Adicionar campo ao bloco `volume` de `SampleMetrics`:

- `totalSampleUnits: number` -- unidades individuais de amostra distribuidas (soma de quantidades)

### 2. Calculo -- `src/utils/samplesAnalyzer.ts`

Na funcao `calculateSampleVolume` (linha ~169), adicionar calculo:

```text
// Usa getRevenueOrders para alinhar com paradigma economico
const revenueOrders = orders.filter(isRevenueOrder);
const totalSampleUnits = revenueOrders
  .flatMap(o => o.produtos || [])
  .filter(p => isSampleProduct(p))
  .reduce((sum, p) => sum + Number(p.quantidade || 1), 0);
```

Retornar `totalSampleUnits` junto com os campos existentes no objeto de retorno.

### 3. UI -- `src/pages/AnaliseSamples.tsx`

Adicionar novo `StatusMetricCard` como primeiro item do grid de satelites (linha ~381):

- Titulo: **"Amostras Distribuidas"**
- Valor: `metrics.volume.totalSampleUnits` formatado com `toLocaleString('pt-BR')`
- Icone: `Package`
- Status: neutral
- Interpretacao: razao entre unidades e clientes qualificados (ex: "2.4 amostras/cliente")
- Size: compact

Importar `Package` de `lucide-react` se ainda nao estiver importado.

## O que NAO muda

- Nenhuma alteracao no banco
- Nenhuma alteracao na reconciliacao de identidade
- Nenhuma alteracao nos demais KPIs
- Logica de `isSampleProduct` permanece identica

