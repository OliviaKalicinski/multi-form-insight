

# Chave Deterministica `numero_pedido_plataforma` -- Plano de Implementacao

## Resumo

Extrair o ID da plataforma de e-commerce do campo Observacoes da NF, armazena-lo como `numero_pedido_plataforma`, e fornecer metadados de cobertura para alerta na UI. O parser tem um unico consumidor (`SalesUploader.tsx`), confirmado via busca no codebase.

---

## Etapa 1: Migracao SQL

Adicionar coluna e indice simples (sem UNIQUE):

```sql
ALTER TABLE sales_data ADD COLUMN numero_pedido_plataforma TEXT;

CREATE INDEX idx_sales_pedido_plataforma
  ON sales_data (numero_pedido_plataforma)
  WHERE numero_pedido_plataforma IS NOT NULL;
```

---

## Etapa 2: Tipo `ProcessedOrder` (`src/types/marketing.ts`, linha 218)

Adicionar antes do fechamento da interface:

```
numeroPedidoPlataforma?: string;
```

---

## Etapa 3: Parser (`src/utils/invoiceParser.ts`)

### 3a. Nova funcao `extractNumeroPedidoPlataforma`

Regex com precedencia estrita (para no primeiro match valido):

1. `Ref\.?\s*a[lo]?\s*pedido\s*n[uú]mero\s*(\d+)` -- prioridade maxima
2. `OC:\s*(\d+)`
3. `(?:pedido|ped\.?)\s*(?:n[uú]mero|n[º°]|no\.?)?\s*:?\s*(\d+)` -- fallback (ignoreCase)

Defesas:
- Rejeitar numeros com 44 digitos (chave de acesso)
- Rejeitar numeros com mais de 12 digitos
- Normalizar: `.trim().replace(/\D/g, '')`
- Retorna `undefined` se nenhum match

### 3b. Iterar TODAS as linhas da nota agrupada

Percorrer `rows` (nao apenas `first`) para encontrar o primeiro valor valido.

### 3c. Mudar retorno para objeto com metadados

```typescript
interface InvoiceProcessingResult {
  orders: ProcessedOrder[];
  coberturaPedidoPlataforma: number; // 0-100
  totalComPlataforma: number;
  totalSemPlataforma: number;
  alertaCobertura: boolean; // true se < 90%
}
```

O parser continua retornando `ProcessedOrder[]` internamente via `consolidateSampleKits`, mas a funcao `processInvoiceData` envolve o resultado com metadados de cobertura.

Niveis de alerta:
- < 90%: `alertaCobertura = true` (warning forte)
- 90-95%: log de aviso no console
- >= 95%: OK

### 3d. Log detalhado no console

```text
[NF] Cobertura pedido_plataforma: X/Y (Z%)
```

---

## Etapa 4: Consumidor (`src/components/dashboard/SalesUploader.tsx`)

Unico consumidor confirmado (linha 116). Ajustar para:

```typescript
const result = processInvoiceData(results.data);
processedData = result.orders;

if (result.alertaCobertura) {
  toast({
    title: "Alerta de cobertura",
    description: `Apenas ${result.coberturaPedidoPlataforma.toFixed(1)}% das NFs tem numero_pedido_plataforma. Verificar padroes de Observacoes.`,
    variant: "destructive",
  });
}
```

---

## Etapa 5: Persistencia (`src/hooks/useDataPersistence.ts`)

### 5a. Save (linha ~321, no mapeamento NF)

Adicionar ao objeto de rows:

```
numero_pedido_plataforma: order.numeroPedidoPlataforma || null,
```

### 5b. Load (linha ~175, no mapeamento de leitura)

Adicionar:

```
numeroPedidoPlataforma: row.numero_pedido_plataforma || undefined,
```

---

## O que NAO muda

- `numero_pedido` continua como ID interno / fallback
- Constraint `uq_sales_nota_serie` intacta
- Upsert NF via `onConflict: "numero_nota,serie"` inalterado
- RPC `nf_snapshot_and_purge` inalterada
- Dados ecommerce nao alterados
- Nenhuma UNIQUE constraint
- Dashboard inalterado
- Nenhum outro consumidor do parser afetado (apenas SalesUploader)

## Pos-implementacao (manual)

1. Re-upload completo do arquivo NF (purge automatico via `nf_snapshot_and_purge`)
2. Verificar toast de cobertura na UI + log no console
3. Rodar queries de validacao no SQL editor (cobertura, cardinalidade, match)
4. Amostragem manual de 20 registros
5. Decisoes sobre UNIQUE e VIEW baseadas nos dados reais

