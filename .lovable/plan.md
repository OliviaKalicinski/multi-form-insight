# Relatório de Recompra — Jan/2026 a 15/Mai/2026

Análise completa do comportamento de recompra a partir de `sales_data`, restrita a B2C (`tipo_movimento = 'venda'`), usando `cpf_cnpj` como identidade primária e `cliente_email` como fallback. Janela: `data_venda` entre 2026-01-01 e hoje.

## Entregáveis (em `/mnt/documents/`)

1. **`recompra_resumo.csv`** — KPIs gerais
   - Nº clientes únicos no período, % com 2+ compras, % com 3+, ticket médio 1ª/2ª/3ª+ compra, intervalo médio e mediano entre 1ª→2ª e 2ª→3ª (dias), LTV médio no período, receita oficial total.

2. **`produto_entrada.csv`** — Produto da 1ª compra do cliente no período
   - Por produto: nº de clientes que entraram, % do total, taxa de recompra (% que voltou dentro da janela), ticket médio da entrada, intervalo médio até 2ª compra, LTV médio.

3. **`produto_segunda_compra.csv`** — O que compram na 2ª vez
   - Top produtos da 2ª compra: contagem, % do total de 2ªs compras, ticket médio.

4. **`transicao_entrada_segunda.csv`** — Matriz de transição
   - Pares (produto entrada → produto 2ª compra): contagem e % dentro do produto de entrada.

5. **`combinacoes_mesmo_pedido.csv`** — Cross-sell
   - Pares de produtos no mesmo pedido: frequência, % dos pedidos, ticket médio do pedido com a combinação.

6. **`jornada_clientes.csv`** — Sequência por cliente (top 5000 por LTV no período)
   - cpf_cnpj, nome, nº compras, datas, produtos por compra, intervalos, LTV total, segmento.

7. **`recompra_relatorio.md`** — Sumário executivo
   - Top insights: produtos âncora de entrada, maiores taxas de recompra, combinações mais fortes, gargalos (entradas com baixa recompra), tempo típico de retorno por produto.

## Como será gerado

- Script Python em `/tmp/` usando `psql` (env `PG*` disponível).
- Filtros: `tipo_movimento = 'venda'`, segmento B2C (sem B2B/B2B2C), exclui marketplaces/devoluções; marca amostras (R$1) em coluna separada na entrada.
- Receita oficial: `COALESCE(total_faturado, valor_total + valor_frete)` (regra `getOfficialRevenue`).
- Identidade: `cpf_cnpj` quando válido, fallback `cliente_email` (regra do projeto).
- Normalização de produto via regex dos 31 IDs técnicos de `data/operationalProducts.ts`.
- Ordem cronológica por `data_venda`.
- **Importante**: "1ª compra" = primeira compra do cliente **dentro da janela** (jan→hoje). Não é a 1ª compra absoluta da vida do cliente. Posso ajustar para 1ª lifetime se preferir — diga.

Pronto para executar ao aprovar.
