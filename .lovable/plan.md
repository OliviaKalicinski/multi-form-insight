

# Corrigir formatacao da data no indicador "Dados ate"

## Problema

O campo `data_venda` da tabela `sales_data` retorna um timestamp com timezone (ex: `2026-02-22T03:00:00+00:00`), enquanto os outros campos retornam datas simples (`2026-02-22`). O codigo atual faz `split('-')` assumindo formato `YYYY-MM-DD`, mas o timestamp quebra essa logica e exibe "22T03:00:00+00:00/02/2026".

## Solucao

No `fetchLatestDataDate` em `src/pages/Upload.tsx`, normalizar todas as datas extraindo apenas os primeiros 10 caracteres (`YYYY-MM-DD`) antes de processar:

```typescript
// Antes:
const maxDate = dates.sort().reverse()[0];
const [year, month, day] = maxDate.split('-');

// Depois:
const normalizedDates = dates.map(d => d.substring(0, 10));
const maxDate = normalizedDates.sort().reverse()[0];
const [year, month, day] = maxDate.split('-');
```

## Arquivo modificado

- `src/pages/Upload.tsx` (linhas 52-62): adicionar normalizacao com `substring(0, 10)` para tratar timestamps e datas simples de forma uniforme.

Resultado esperado: "Dados ate: 22/02/2026"

