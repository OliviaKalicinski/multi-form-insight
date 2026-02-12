

# Visao Executiva V2 -- Fotografia Operacional

## Resumo

Criar uma nova pagina `/visao-executiva-v2` que mostra uma fotografia operacional do negocio (ultimo dia com dados ou ultimos 7 dias), sem metas, alertas, benchmarks ou comparacoes. A pagina atual `/dashboard` permanece intacta.

## Arquivos criados

### 1. `src/pages/VisaoExecutivaV2.tsx`

Pagina principal contendo toda a logica e layout.

**Toggle no topo**: ToggleGroup (shadcn) com duas opcoes:
- "Ultimo Dia" -- filtra salesData pela data mais recente encontrada nos dados
- "Ultimos 7 Dias" -- filtra os 7 dias ate a data mais recente

**Calculo da data**: `useMemo` que encontra `Math.max(...salesData.map(o => o.dataVenda.getTime()))` para determinar o ultimo dia com dados. Nao usa `new Date()`.

**Layout em grid 2 colunas** (`grid grid-cols-1 lg:grid-cols-2 gap-6`):

**Coluna esquerda -- Mundo Online (B2C)**:

- **Bloco Receita** (Card):
  - Receita Total (valorTotal de todos os pedidos filtrados)
  - Receita Produtos (soma de produto.preco para todos os produtos, excluindo frete)
  - Frete (soma de valorFrete)
  - Receita Media por Produto = Receita Produtos / Quantidade Total de Produtos Vendidos

- **Bloco Pedidos** (Card):
  - Total de Pedidos
  - Apenas Amostra (usando `isOnlySampleOrder` de samplesAnalyzer)
  - Com Produto (pedidos que tem `hasRegularProduct`)
  - Ticket Medio (somente pedidos com produto): receita dos pedidos com produto / quantidade desses pedidos
  - Media de Produtos por Pedido (total de itens de produto / total de pedidos)

- **Bloco Amostras** (Card):
  - Pedidos So Amostra (contagem de pedidos `isOnlySampleOrder`)
  - Total de Amostras Vendidas (soma de quantidade dos produtos que sao `isSampleProduct`)
  - Amostras Cachorro (usando `getSamplePetType === 'dog'`)
  - Amostras Gato (usando `getSamplePetType === 'cat'`)

- **Bloco Distribuicao** (Card):
  - Top 3 Estados (agrupando por campo `estado` dos pedidos, caso exista no ProcessedOrder -- se nao existir, sera extraido via query ao banco ou omitido)
  - Distribuicao por Canal (campo `ecommerce` do ProcessedOrder) com barras horizontais simples em div/Tailwind (sem Recharts)

**Coluna direita -- Mundo Offline**:

- **Card B2B**: Exibe "Integracao de dados em andamento" (sem dados no banco)
- **Card B2B2C**: Exibe "Integracao de dados em andamento" (sem dados no banco)

Ambos os cards mostram a estrutura prevista (Receita Total, Receita Produtos, Frete, Total de Pedidos, Ticket Medio, Produto mais vendido) mas com o placeholder ao inves de zeros.

**Hierarquia visual**:
- Numeros grandes (`text-3xl font-bold`)
- Labels pequenos (`text-xs text-muted-foreground`)
- Espacamento generoso (`space-y-6`, `p-6`)
- Sem cores de status (sem verde/vermelho) -- usar apenas `text-foreground` e `text-muted-foreground`

## Arquivos modificados

### 2. `src/App.tsx`

- Importar `VisaoExecutivaV2`
- Adicionar rota `/visao-executiva-v2` (protegida, dentro de AuthenticatedLayout)
- Alterar redirect de `/` para `/visao-executiva-v2` (em vez de `/dashboard`)

### 3. `src/components/AppSidebar.tsx`

- Adicionar item "Visao Executiva V2" com url `/visao-executiva-v2` na secao Dashboard, acima do item existente "Visao Executiva"
- Usar icone `LayoutDashboard` (ou `Eye` do lucide)

## O que NAO muda

- ExecutiveDashboard.tsx (pagina atual em `/dashboard`)
- DashboardContext.tsx
- AlertSystem, RecommendationEngine, HealthScore
- GlobalFilter
- Nenhuma tabela no banco
- Nenhum outro arquivo existente alem dos dois listados acima

## Detalhes tecnicos

### Filtragem de dados (useMemo local)

```text
salesData (do DashboardContext)
  |
  v
useMemo: encontrar lastDate = max(dataVenda)
  |
  v
toggle === "1d" ? filtrar pedidos com dataVenda no mesmo dia que lastDate
toggle === "7d" ? filtrar pedidos com dataVenda >= lastDate - 6 dias
  |
  v
Calcular todas as metricas localmente
```

### Funcoes reutilizadas (sem criar novas)

- `isSampleProduct`, `isOnlySampleOrder`, `hasRegularProduct`, `getSamplePetType` de `samplesAnalyzer.ts`
- `formatCurrency` de `salesCalculator.ts`

### Distribuicao por canal

Usa o campo `ecommerce` de `ProcessedOrder` para agrupar e contar pedidos/receita por canal. Barras horizontais renderizadas com divs Tailwind (`bg-primary/20`, largura proporcional via `style={{ width: pct + '%' }}`).

### Top 3 Estados

O `ProcessedOrder` nao tem campo `estado` diretamente, mas o `sales_data` no banco tem coluna `estado`. Sera necessario verificar se o campo e mapeado no parser. Se nao estiver disponivel no ProcessedOrder, essa secao exibira "Dados nao disponiveis" ate o campo ser adicionado.

### Componentes usados

- Card, CardContent, CardHeader, CardTitle (shadcn)
- Badge (shadcn)
- Separator (shadcn)
- ToggleGroup, ToggleGroupItem (shadcn)
- Nenhum grafico pesado (sem Recharts)

