

# Corrigir calculo de Receita Produtos na Visao Executiva V2

## Problema

O campo `preco` de cada produto ja contem o **preco total da linha** (vem da coluna "Preco total" do CSV, que ja e preco unitario x quantidade). No entanto, o calculo na pagina multiplica `p.preco * p.quantidade` novamente, inflando o valor.

Por isso Receita Produtos (R$ 4.806) aparece maior que Receita Total (R$ 3.364), o que e impossivel.

## Correcao

### `src/pages/VisaoExecutivaV2.tsx` (linha 90)

Mudar de:
```text
totalProductRevenue += p.preco * p.quantidade;
```

Para:
```text
totalProductRevenue += p.preco;
```

Apenas remover a multiplicacao por `p.quantidade`, pois `p.preco` ja representa o valor total daquela linha de produto.

## Impacto

- Receita Produtos passara a ser menor ou igual a Receita Total (correto)
- Receita Media por Produto tambem sera corrigida (usa `receitaProdutos / totalProductQty`)
- Nenhum outro arquivo precisa ser alterado
