

# Production Patch: 6 Fixes across 4 Files

No migrations needed. All changes are surgical edits.

---

## Fix 1 — Replace `pdf-parse` with `pdfjs-dist` (CRITICAL)

**File:** `supabase/functions/process-nf-pdf/index.ts` — lines 184-188

Replace:
```typescript
const pdfParse = (await import("https://esm.sh/pdf-parse@1.1.1")).default;
const buffer = await fileData.arrayBuffer();
const result = await pdfParse(new Uint8Array(buffer));
rawText = result.text || "";
```

With:
```typescript
const pdfjsLib = await import(
  "https://esm.sh/pdfjs-dist@4.0.379/legacy/build/pdf.mjs?target=deno"
);
const buffer = await fileData.arrayBuffer();
const pdf = await pdfjsLib.getDocument({ data: new Uint8Array(buffer) }).promise;
const pages: string[] = [];
for (let i = 1; i <= pdf.numPages; i++) {
  const page = await pdf.getPage(i);
  const content = await page.getTextContent();
  const strings = content.items.map((item: any) => item.str).filter(Boolean);
  pages.push(strings.join(" "));
}
rawText = pages.join("\n");
```

## Fix 2 — Flag unrecognized products

**File:** `supabase/functions/process-nf-pdf/index.ts` — insert between lines 246 and 248 (after value comparison, before product comparison)

```typescript
if (extracted.produtos.some(p => p.product_id == null)) {
  divergencia.produto = true;
}
```

## Fix 3 — Clear divergencia on error (2 locations)

**File:** `supabase/functions/process-nf-pdf/index.ts`

- **Line 193:** change `.update({ reconciliacao_status: "erro" })` → `.update({ reconciliacao_status: "erro", divergencia: null })`
- **Line 350:** same change `.update({ reconciliacao_status: "erro" })` → `.update({ reconciliacao_status: "erro", divergencia: null })`

## Fix 4 — Toast UX + invalidate timeline

**File:** `src/hooks/useOperationalOrders.ts` — lines 322, 337-338

- **Line 322:** `toast.success(\`${label} anexado com sucesso\`)` → `toast(\`${label} anexado. Processando reconciliação...\`)`
- **Lines 337-338:** Replace:
  ```typescript
  queryClient.invalidateQueries({ queryKey: ["operational-orders"] });
  toast.success("Reconciliação automática concluída");
  ```
  With:
  ```typescript
  queryClient.invalidateQueries({ queryKey: ["operational-orders"] });
  queryClient.invalidateQueries({ queryKey: ["order-events"] });
  ```

## Fix 5 — Error badge on OrderCard

**File:** `src/components/kanban/OrderCard.tsx` — insert after line 110 (after the "processando" badge)

```tsx
{order.reconciliacao_status === 'erro' && (
  <Badge className="bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200 text-[10px]" title="Falha ao processar a nota fiscal">❌ Falha reconciliação</Badge>
)}
```

## Fix 6 — Broaden PDF MIME validation

**File:** `src/components/kanban/DocumentDropZone.tsx` — line 22

Replace:
```typescript
if (file.type !== "application/pdf") {
```
With:
```typescript
if (!file.type.includes("pdf") && !file.name.toLowerCase().endsWith(".pdf")) {
```

---

**Summary:** 6 edits, 4 files, 0 migrations. Critical fix is replacing `pdf-parse` with `pdfjs-dist/legacy` (`?target=deno`) to resolve the `fs.readFileSync` runtime error.

