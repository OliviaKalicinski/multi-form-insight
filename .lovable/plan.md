## Objetivo
Gerar relatório executivo da evolução **mês a mês (Jan–Mai 2026)** de clientes B2C que tiveram como **primeira compra uma amostra** e depois retornaram para um pedido regular (não-amostra).

## Definições alinhadas ao projeto
- **Amostra**: regra `isSampleProduct` — nome contém `amostra/sample/degustação/kit teste` **OU** produto com preço entre R$ 0,01 e R$ 1,00 (com nome legível). Pedido de amostra = `isOnlySampleOrder` (todos os itens são amostra).
- **B2C**: `sales_data.tipo_movimento='venda'` e `segmento_cliente IS NULL OR segmento_cliente='b2c'`.
- **Identidade**: `COALESCE(cpf_cnpj, cliente_email)`.
- **Recompra elegível**: pedido posterior **não-amostra** (pelo menos 1 produto regular).
- **Mês de referência**: mês em que a **recompra** ocorreu (`data_venda`).
- **Dedup NF×Ecommerce**: aplicar regra padrão (excluir ecommerce quando há NF com `numero_pedido_plataforma`).

## Métricas por mês (Jan, Fev, Mar, Abr, Mai)
1. **Novos clientes-amostra**: clientes cuja **1ª compra lifetime** foi uma amostra **e** ocorreu no mês.
2. **Recompras no mês**: clientes únicos que, neste mês, fizeram um pedido regular tendo histórico anterior **somente de amostras**.
3. **Taxa de conversão acumulada**: do total de clientes-amostra cuja 1ª compra foi até o fim do mês, quantos já recompraram (em qualquer momento até hoje).
4. **Lag médio (dias)** entre 1ª amostra e 1ª recompra (das recompras do mês).
5. **Receita gerada pelas recompras do mês** (`COALESCE(total_faturado, valor_total+valor_frete)`).
6. **Ticket médio** da recompra no mês.

## Entregáveis em `/mnt/documents/`
1. `amostra_recompra_mensal.csv` — uma linha por mês com todas as métricas.
2. `amostra_recompra_clientes.csv` — detalhe por cliente (cpf/email, 1ª amostra, 1ª recompra, lag, receita recompra).
3. `amostra_recompra_relatorio.md` — leitura executiva com destaques e tendência.

## Execução
Script Python único via `psql` (env `PG*`). Query agregada em CTEs:
- CTE `b2c`: filtros + dedup.
- CTE `first_purchase`: 1ª compra lifetime por cliente, com flag `was_sample`.
- CTE `sample_first_customers`: clientes cuja 1ª foi amostra.
- CTE `repurchase`: 1º pedido regular pós-amostra por cliente (MIN data_venda onde `hasRegularProduct` e data > 1ª amostra).
- Agrupar por `to_char(data_venda,'YYYY-MM')` dentro de 2026-01..2026-05.

Sem alteração de código do app.
