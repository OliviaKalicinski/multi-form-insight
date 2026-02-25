
# Etapa 1 — Ingesta Fiscal (NF): IMPLEMENTADO ✅

## Status: Completo

Todos os passos foram implementados:

1. ✅ **Migração SQL** — 21 colunas adicionadas, constraints ajustadas, índices criados
2. ✅ **invoiceParser.ts** — Parser NF com agrupamento multi-item, segmentação, validação fiscal
3. ✅ **marketing.ts** — ProcessedOrder estendido com campos fiscais opcionais + InvoiceRawData
4. ✅ **salesCalculator.ts** — `consolidateSampleKits` exportado
5. ✅ **SalesUploader.tsx** — Auto-detecção de formato + badge visual (NF / E-commerce)
6. ✅ **useDataPersistence.ts** — Dual upsert (NF por nota+serie, ecommerce por pedido) + precedência NF
7. ✅ **DashboardContext.tsx** — Merge NF-aware com precedência no state local

## Decisões Implementadas

- `ProcessedOrder` agora representa evento fiscal (NF) ou pedido e-commerce
- `total_faturado` armazenado mas NÃO usado nos cálculos (Etapa 2)
- `valorTotal` = `valor_produtos` (semântica legada preservada)
- Precedência NF > ecommerce no banco E no state
- Segmentação persistida: Serie 2=b2c, Serie 1+UN=b2b2c, Serie 1+KG/L=b2b
- Histórico: daqui para frente apenas

## Próximas Etapas

- **Etapa 2**: Migrar cálculos para usar `getOfficialRevenue()` (totalFaturado)
- **Etapa 3**: Margem real por SKU com custo
