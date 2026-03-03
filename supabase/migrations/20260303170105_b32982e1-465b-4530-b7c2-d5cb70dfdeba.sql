
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
