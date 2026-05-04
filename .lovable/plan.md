# Análise de Recompra de Clientes

Gerar análise exaustiva de comportamento de recompra a partir de `sales_data` (NF + ecommerce, com dedup já tratada pelos triggers existentes), restrita a B2C (`tipo_movimento = 'venda'`), usando `cpf_cnpj` como identidade primária e `cliente_email` como fallback (regra do projeto).

## Entregáveis (em `/mnt/documents/`)

1. **`recompra_resumo.csv`** — KPIs gerais
   - Total de clientes, % com 2+ compras, % com 3+, ticket médio 1ª vs 2ª vs 3ª+, intervalo médio entre 1ª→2ª e 2ª→3ª compra (dias), mediana, LTV médio.

2. **`produto_entrada.csv`** — Produto de entrada (1ª compra)
   - Para cada produto: nº de clientes que entraram com ele, % do total, taxa de recompra (% que voltou a comprar), ticket médio da entrada, intervalo médio até 2ª compra, LTV médio do cliente.

3. **`produto_segunda_compra.csv`** — O que compram na 2ª vez
   - Top produtos da 2ª compra, contagem, % do total de 2ªs compras, ticket médio.

4. **`transicao_entrada_segunda.csv`** — Matriz de transição
   - Para cada par (produto entrada → produto 2ª compra): contagem, % dentro do produto de entrada. Mostra o "próximo passo" típico por produto de entrada.

5. **`combinacoes_mesmo_pedido.csv`** — Cross-sell (já existe lógica em `CrossSellBarsChart`, replicar para CSV exaustivo)
   - Pares de produtos comprados juntos no mesmo pedido: frequência, % de pedidos, ticket médio do pedido com a combinação.

6. **`jornada_clientes.csv`** — Sequência detalhada por cliente (top 5000 por LTV)
   - cpf_cnpj, nº compras, datas, produtos por compra (concatenado), intervalo entre compras, LTV total, segmento.

7. **`recompra_relatorio.md`** — Relatório executivo
   - Top insights: produtos com maior taxa de recompra, "produtos âncora" de entrada, combinações mais fortes, gargalos (produtos de entrada com baixa recompra), tempo típico até retorno por produto.

## Como será gerado

- Script Python em `/tmp/` usando `psql` (env `PG*` disponível) para extrair `sales_data` filtrado (B2C, `venda`) + `customer` para LTV/segmento.
- Aplicar normalização de produto via lógica equivalente a `productNormalizer` / `kitBreakdown` em SQL/Python (regex dos 31 IDs técnicos do `data/operationalProducts.ts`).
- Dedup respeitada pelo trigger `delete_ecommerce_if_nf` já no banco.
- Usa `data_venda` para ordenação cronológica (regra do projeto).
- Receita oficial: `COALESCE(total_faturado, valor_total + valor_frete)`.

## Escopo

- **Inclui**: B2C apenas (regra de pureza de marketing/cliente final).
- **Exclui**: B2B/B2B2C, devoluções, amostras de R$1 (mas marca separadamente em coluna se for amostra na entrada).

Após aprovar, executo os scripts e entrego os 7 arquivos com `<lov-artifact>`.
