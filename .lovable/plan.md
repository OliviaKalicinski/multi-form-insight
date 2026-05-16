## Objetivo
Gerar relatório executivo comparativo de vendas B2C entre dois períodos de 9 dias:
- **Período A:** 06/04/2026 → 14/04/2026
- **Período B:** 06/05/2026 → 14/05/2026

## Critérios (alinhados às regras do projeto)
- `sales_data` com `tipo_movimento = 'venda'`
- B2C: `segmento_cliente IS NULL OR segmento_cliente = 'b2c'`
- Filtro por `data_venda` (não data de upload/envio)
- Receita: `COALESCE(total_faturado, valor_total + COALESCE(valor_frete,0))`
- Identidade do cliente: `COALESCE(cpf_cnpj, cliente_email)`

## Métricas comparadas
- Receita total e líquida (sem frete)
- Nº de pedidos
- Nº de clientes únicos
- Ticket médio (receita / pedidos)
- ARPU (receita / clientes)
- Frete médio
- % de pedidos com frete grátis
- Clientes novos vs recorrentes (1ª compra lifetime vs já existente)
- Variação absoluta e % entre os dois períodos

## Entregáveis em `/mnt/documents/`
1. `vendas_comparativo_abr_mai.csv` — métricas lado a lado (Abr | Mai | Δ | Δ%)
2. `vendas_comparativo_abr_mai.md` — relatório executivo curto com destaques

## Execução
Script Python único via `psql` (env `PG*`), uma consulta agregada por período + cálculo de variações. Sem alteração de código do app.
