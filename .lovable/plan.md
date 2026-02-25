

# Etapa 1 — Ingesta Fiscal (NF): Plano de Implementacao

## Visao Geral

A Nota Fiscal passa a ser o unico evento gerador de receita do sistema. A planilha e-commerce torna-se fonte auxiliar de metadados. Nesta etapa, apenas ingesta e schema mudam -- nenhum calculo existente sera alterado.

## Decisoes Formalizadas

- **Entidade primaria**: Nota Fiscal (`numero_nota` + `serie`)
- **Receita Oficial**: `total_faturado` (armazenada, NAO usada nos calculos ainda)
- **valorTotal nesta etapa**: mapeado para campo CSV `Valor Produtos` (semantica legada preservada)
- **numero_pedido**: metadado extraido de Observacoes, nullable
- **Precedencia**: NF > ecommerce (NF e autoridade economica)
- **Historico**: daqui para frente apenas -- dados antigos permanecem como estao

---

## Passo 1: Migracao SQL

Adicionar 21 colunas a tabela `sales_data` e ajustar constraints:

**Novos campos:**
- `id_nota`, `numero_nota`, `serie`, `chave_acesso` (text, nullable)
- `valor_produtos` (numeric, default 0), `valor_desconto` (numeric, default 0)
- `valor_nota`, `total_faturado` (numeric, nullable)
- `peso_liquido`, `peso_bruto` (numeric, nullable)
- `regime_tributario`, `natureza_operacao`, `cfop`, `ncm` (text, nullable)
- `frete_por_conta` (text, nullable) -- CIF/FOB separado de forma_envio
- `municipio`, `uf` (text, nullable)
- `data_emissao_nf`, `data_saida_nf` (date, nullable)
- `fonte_dados` (text, default 'ecommerce')
- `segmento_cliente` (text, nullable)

**Alteracoes estruturais:**
- DROP constraint `sales_data_numero_pedido_key`
- ALTER `numero_pedido` DROP NOT NULL
- CREATE UNIQUE INDEX parcial para ecommerce: `(numero_pedido) WHERE numero_pedido IS NOT NULL AND fonte_dados = 'ecommerce'`
- CREATE UNIQUE INDEX composto para NF: `(numero_nota, serie) WHERE numero_nota IS NOT NULL AND serie IS NOT NULL`
- CREATE INDEX de performance: `(data_venda)`

---

## Passo 2: Novo arquivo `src/utils/invoiceParser.ts`

Parser para planilha fiscal que:

1. Valida linhas com schema Zod (ID Nota, Numero Nota, Serie, Data emissao, Total Faturado, Item Descricao)
2. Agrupa linhas por `ID Nota` (notas multi-item)
3. Para cada nota:
   - Extrai `numeroPedido` de Observacoes via regex `/N[degree]?\s*Pedido[:\s]*(\d+)/i` (fallback: `NF-{numeroNota}`)
   - `valorTotal` = `parseBRL("Valor Produtos")` (campo consolidado NF)
   - `totalFaturado` = `parseBRL("Total Faturado")` (armazenado separado)
   - Constroi array de produtos com `standardizeProductName()`
   - Segmentacao automatica: Serie 2 = b2c; Serie 1 + UN = b2b2c; Serie 1 + KG/L = b2b
   - Validacao fiscal: warning se `|valorProdutos + frete - desconto - totalFaturado| > 0.01`
4. Aplica `consolidateSampleKits()` (que precisa ser exportada de `salesCalculator.ts`)

---

## Passo 3: Estender tipos em `src/types/marketing.ts`

Adicionar campos opcionais ao `ProcessedOrder` existente (todos opcionais para compatibilidade):

```text
idNota?, numeroNota?, serie?, chaveAcesso? (string)
valorProdutos?, valorDesconto?, valorNota?, totalFaturado? (number)
pesoLiquido?, pesoBruto? (number)
regimeTributario?, naturezaOperacao?, cfop?, ncm? (string)
fretePorConta?, municipio?, uf? (string)
fonteDados?: 'nf' | 'ecommerce'
segmentoCliente?: 'b2c' | 'b2b2c' | 'b2b'
```

---

## Passo 4: Auto-deteccao no `SalesUploader.tsx`

Apos `Papa.parse`, inspecionar headers:
- Se contem `ID Nota` E `Numero Nota` -> formato NF -> `processInvoiceData()`
- Se contem `Numero do pedido no e-commerce` -> formato antigo -> `processSalesData()`
- Exibir badge visual indicando formato detectado

---

## Passo 5: Atualizar `useDataPersistence.ts`

### saveSalesData
- Detectar `fonteDados` no array
- Para NF: mapear 21 novos campos, upsert com conflict em `(numero_nota, serie)` via nomeacao de indice
- Para ecommerce: antes do upsert, verificar se ja existe registro NF com mesmo `numero_pedido` (NF prevalece)
- Adicionar `fonte_dados` em ambos os fluxos

### loadAllData
- Mapear novas colunas de volta para `ProcessedOrder` (campos opcionais)

---

## Passo 6: Atualizar merge no `DashboardContext.tsx`

### persistSalesData
- Para dados NF: deduplicar por `numeroNota + serie` (nao `numeroPedido`)
- Precedencia: se NF e ecommerce compartilham mesmo `numeroPedido`, manter NF

---

## Passo 7: Exportar `consolidateSampleKits` de `salesCalculator.ts`

Mudar de `const` para `export const` (sem alterar logica).

---

## Arquivos criados/modificados

| Arquivo | Acao |
|---------|------|
| Migracao SQL | **Novo** |
| `src/utils/invoiceParser.ts` | **Novo** |
| `src/utils/salesCalculator.ts` | **Modificar** - exportar `consolidateSampleKits` |
| `src/types/marketing.ts` | **Modificar** - campos opcionais em ProcessedOrder |
| `src/components/dashboard/SalesUploader.tsx` | **Modificar** - auto-deteccao + badge |
| `src/hooks/useDataPersistence.ts` | **Modificar** - dual upsert + novos campos |
| `src/contexts/DashboardContext.tsx` | **Modificar** - merge NF-aware |

## O que NAO muda

- `financialMetrics.ts`, `salesCalculator.ts` (logica), `roasCalculator.ts`, `executiveMetricsCalculator.ts` -- inalterados
- Nenhuma pagina de dashboard ou componente de visualizacao
- Health Score, Executive Metrics -- inalterados

