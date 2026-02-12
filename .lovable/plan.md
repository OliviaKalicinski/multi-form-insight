

# Redesenho da Visao Executiva V2 - Apenas Mundo Online

## Resumo

Reestruturar a pagina para incluir mais detalhes no Mundo Online (B2C), adicionando blocos de analise de amostras por tipo de pet, produtos vendidos com grafico de pizza, e distribuicao por estados. Remover a coluna B2B/B2B2C por enquanto.

## Layout Final

A pagina tera layout de coluna unica (ou duas colunas internas dentro do Mundo Online), com os seguintes blocos:

### 1. Header (manter)
- Titulo "Fotografia Operacional"
- Toggle 7 dias / 1 dia (7d padrao)
- Label do periodo

### 2. Bloco Receita (ajustar)
- Receita Total (destaque grande)
- Grid com: Receita Produtos, Frete (com % do total), Receita Media por Produto
- Adicionar lista de receita media por produto individual (agrupar produtos por nome, calcular media)

### 3. Bloco Pedidos (manter estrutura atual)
- Total de Pedidos
- Apenas Amostra / Com Produto
- Ticket Medio / Media Produtos por Pedido

### 4. Bloco Pedidos Somente Amostras (novo/expandido)
- Quantidade de pedidos so amostra
- Breakdown: Cachorro, Gato, Cachorro + Gato (pedidos com ambos tipos)
- Grafico de pizza (donut) com distribuicao por estado dos pedidos so amostra

### 5. Bloco Pedidos com Produtos (novo)
- Lista de produtos vendidos (excluindo amostras) com quantidade
- Grafico de pizza com distribuicao dos produtos
- Grafico de pizza com distribuicao por estado dos pedidos com produto

### 6. Bloco Canais de Venda (ajustar)
- Trocar barras horizontais por grafico de pizza (donut chart)

### 7. Mundo Offline - removido temporariamente
- Remover completamente os blocos B2B e B2B2C

## Detalhes tecnicos

### Arquivo principal
- `src/pages/VisaoExecutivaV2.tsx` - reescrita significativa

### Novos calculos no useMemo
- **Receita media por produto individual**: agrupar por `descricaoAjustada`, somar receita e quantidade, calcular media por produto
- **Pedidos amostras por tipo de pet**: classificar pedidos so-amostra em Cachorro, Gato, ou Cachorro+Gato (quando o pedido tem amostras de ambos)
- **Estados separados**: buscar estados do banco separadamente para pedidos so-amostra vs pedidos com produto
- **Produtos vendidos (sem amostras)**: agrupar por `descricaoAjustada`, calcular quantidade e receita

### Graficos de pizza
- Usar `PieChart`, `Pie`, `Cell`, `Tooltip` do Recharts (ja instalado)
- Donut chart com `innerRadius` e `outerRadius`
- Legenda manual abaixo do grafico
- Paleta de 5 cores usando variaveis CSS do tema (`chart-1` a `chart-5`)

### Busca de estados
- Expandir o `useEffect` atual para buscar estados separados por tipo de pedido (so-amostra vs com-produto)
- Usar os IDs dos pedidos filtrados para fazer query na tabela `sales_data`

