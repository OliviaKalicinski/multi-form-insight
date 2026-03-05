

# Fix parser PDF: versão final com ajustes técnicos

## Arquivo: `supabase/functions/process-nf-pdf/index.ts`

### A. Import pdfjs estabilizado (linhas ~185-189)
```typescript
const pdfjsLib = await import("npm:pdfjs-dist@4.0.379/legacy/build/pdf.mjs");
pdfjsLib.GlobalWorkerOptions.workerSrc = undefined;
const buffer = await fileData.arrayBuffer();
const pdf = await pdfjsLib.getDocument({
  data: new Uint8Array(buffer),
  useWorkerFetch: false,
  isEvalSupported: false,
}).promise;
```

### B. Normalização segura (nova função, substituindo proposta anterior)
Colapsa apenas sequências fragmentadas (3+ chars separados por espaço), sem destruir frases normais como "VALOR TOTAL DA NOTA":
```typescript
function collapseSpacedText(text: string): string {
  return text.replace(/\b(?:[A-Z0-9] ){3,}[A-Z0-9]\b/g, (m) =>
    m.replace(/\s+/g, "")
  );
}
```
Aplicar sobre `rawText` antes de `extractFromText`.

### C. Extração de chave de acesso (novo campo no `extractFromText`)
```typescript
const accessKeyMatch = text.match(/\b\d{44}\b/);
const chave_acesso = accessKeyMatch?.[0] ?? null;
```

### D. Regex NF mais tolerante (substituir bloco existente)
```typescript
const nfMatch = text.match(/NF-?e?\s*N[ºo°.]?\s*([\d.]+)/i)
  || text.match(/N[ºo°]\s*[:\-]?\s*(\d{3,})/i)
  || text.match(/NÚMERO\s*([\d.]+)/i);
const numero_nf = nfMatch ? nfMatch[1].replace(/\./g, "") : null;
```

### E. Regex de produtos robusta (substituir `prodRegex` existente)
Priorizar regex com código técnico, aceitar unidade opcional:
```typescript
const techProdRegex =
  /([A-Z0-9_\-]{3,})\s+(\d+(?:[.,]\d+)?)\s+(?:UN|KG|CX|PC)?\s*(\d+(?:[.,]\d+)?)\s+(\d+(?:[.,]\d+)?)/gi;
```
Tentar primeiro esta regex; fallback para a regex posicional existente se nenhum match.

### F. Regex de valor total mais tolerante (substituir bloco existente)
```typescript
const valorMatch =
  text.match(/VALOR\s+TOTAL\s+DA\s+NOTA\s*R?\$?\s*([\d.,]+)/i)
  || text.match(/TOTAL\s+DA\s+NOTA\s*R?\$?\s*([\d.,]+)/i)
  || text.match(/VALOR\s+TOTAL\s*R?\$?\s*([\d.,]+)/i)
  || text.match(/VLR\.\s*TOTAL\s*DA\s*NF\s*[:\s]*([\d.,]+)/i);
```

### G. Logging melhorado (catch do parse)
```typescript
catch (parseErr: any) {
  console.error("PDF parse failed", {
    message: parseErr?.message,
    stack: parseErr?.stack,
  });
```

## Migração de banco

Adicionar coluna `chave_acesso` na tabela `nf_extracted_data`:
```sql
ALTER TABLE nf_extracted_data ADD COLUMN IF NOT EXISTS chave_acesso text;
```
Persistir o valor extraído no upsert existente.

## Nenhuma lógica de reconciliação alterada

O fluxo de comparação (valor, produto, quantidade, NF duplicada) permanece idêntico. Apenas a extração de dados fica mais robusta.

