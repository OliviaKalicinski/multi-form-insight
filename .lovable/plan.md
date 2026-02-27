

# Adicionar "Pedidos com Amostra" e Refinar Interpretacao do Bloco Volume

## Contexto

O usuario identificou que "unidades distribuidas" mede intensidade fisica, nao qualidade de aquisicao. Para completar o funil superior, precisamos de 3 camadas distintas:

| Metrica | O que mede | Ja existe? |
|---|---|---|
| Amostras Distribuidas (unidades) | Volume fisico | Sim |
| Pedidos com Amostra | Eventos de aquisicao | **Nao** |
| Clientes com Amostra | Pessoas expostas | Sim |

## Alteracoes

### 1. Tipo -- `src/types/marketing.ts`

Adicionar ao bloco `volume` de `SampleMetrics`:

- `sampleOrders: number` -- total de pedidos distintos que contem pelo menos um produto amostra (entre revenue orders)

### 2. Calculo -- `src/utils/samplesAnalyzer.ts`

Na funcao `calculateSampleVolume` (linha ~194), apos o calculo de `totalSampleUnits`, adicionar:

```text
const sampleOrders = revenueOrders
  .filter(o => (o.produtos || []).some(p => isSampleProduct(p)))
  .length;
```

Retornar `sampleOrders` no objeto de retorno.

### 3. UI -- `src/pages/AnaliseSamples.tsx`

**a)** Adicionar card "Pedidos com Amostra" entre "Amostras Distribuidas" e "Clientes Qualificados" (linha ~391):

- Titulo: "Pedidos com Amostra"
- Valor: `metrics.volume.sampleOrders`
- Icone: `ShoppingBag` (de lucide-react)
- Status: neutral
- Interpretacao: razao unidades/pedidos (ex: "1.3 amostras/pedido")
- Size: compact

**b)** Ajustar interpretacao do card "Amostras Distribuidas" (linha ~386):

- Mudar de "X amostras/cliente" para "X unidades/pedido" -- porque a relacao direta da unidade e com o pedido, nao com o cliente
- Isso mantem cada card interpretando em relacao ao nivel imediatamente acima no funil

### 4. Importar `ShoppingBag` de lucide-react

Adicionar ao import existente de lucide-react no topo do arquivo `AnaliseSamples.tsx`.

## Resultado

O bloco Volume passa a ter 3 cards em sequencia logica de funil:

```text
[Amostras Distribuidas] -> [Pedidos com Amostra] -> [Clientes Qualificados]
     1.581 unidades           ~1.200 pedidos            773 clientes
     "1.3 unidades/pedido"    "1.6 pedidos/cliente"     "X% do total"
```

Cada nivel interpreta em relacao ao nivel seguinte, criando uma leitura de funil natural.

## O que NAO muda

- Nenhuma alteracao no banco
- Nenhuma alteracao na reconciliacao de identidade
- Demais KPIs permanecem identicos
- Logica de `isSampleProduct` e `isRevenueOrder` permanecem identicas

