
# Upload de NF e Boleto — Plano de Implementação Final

## 1. Migração SQL

```sql
ALTER TABLE operational_orders
  ADD COLUMN nf_file_path text,
  ADD COLUMN boleto_file_path text,
  ADD COLUMN documentos_atualizados_em timestamptz DEFAULT now();

CREATE POLICY "Allow authenticated read operational docs"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'operational-documents');

CREATE POLICY "Allow authenticated insert operational docs"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'operational-documents');

CREATE POLICY "Allow authenticated update operational docs"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'operational-documents');
```

## 2. `src/hooks/useOperationalOrders.ts`

- Add `nf_file_path`, `boleto_file_path`, `documentos_atualizados_em` to `OperationalOrder` interface
- Export `uploadOrderDocument(orderId, file, type)` — validates PDF MIME, uploads to `{orderId}/{type}.pdf` with `upsert: true`
- Export `getSignedUrl(filePath)` — returns 60s signed URL
- Add `uploadDocument` mutation: upload + update file path column + `documentos_atualizados_em` + if NF: `nf_pendente = false` (never overwrite `numero_nf`)
- Fix "enviado" validation (line 278): `!order.is_fiscal_exempt && !order.numero_nf && !order.nf_file_path` (triple condition)
- Fix nf_pendente on send (line 289): `!order.numero_nf && !order.nf_file_path`

## 3. `src/components/kanban/EditOrderForm.tsx`

- Add "Documentos" section after "Expedição / Envio" with two PDF file inputs
- Show green indicator + filename if attached, with "Visualizar" (signed URL → new tab) and "Substituir" buttons
- Upload triggers mutation directly (independent of form submit), with toast and query invalidation

## 4. `src/components/kanban/OrderCard.tsx`

- Add `FileText` (NF) and `Receipt` (Boleto) icons in footer when file_path exists, clickable → signed URL
- Badge: `order.nf_pendente && !order.nf_file_path` → yellow "NF Pendente"
- Badge: status "enviado" + `!is_fiscal_exempt && !numero_nf && !nf_file_path` → red "Sem NF"

## 5. `src/pages/KanbanOperacional.tsx`

- No structural changes needed — `EditOrderForm` already receives `order` and can import the hook internally for upload

## Impact

- Backward compatible (nullable columns, no breaking changes)
- Private bucket, signed URLs only (60s TTL)
- `numero_nf` and `nf_file_path` independent
- Audit trail via `documentos_atualizados_em`
- PDF validation server-side (MIME check before upload)
