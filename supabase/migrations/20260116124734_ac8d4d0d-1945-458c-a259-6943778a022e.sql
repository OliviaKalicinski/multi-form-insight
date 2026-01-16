-- Add DELETE policy for upload_history table
CREATE POLICY "Admins can delete upload history"
  ON public.upload_history
  FOR DELETE
  TO authenticated
  USING (is_admin(auth.uid()));

-- Add UPDATE policy for upload_history table (was also missing)
CREATE POLICY "Admins can update upload history"
  ON public.upload_history
  FOR UPDATE
  TO authenticated
  USING (is_admin(auth.uid()));

-- Clean up orphaned ads_data (data without valid upload_history reference)
DELETE FROM ads_data WHERE upload_id IS NOT NULL AND upload_id NOT IN (SELECT id FROM upload_history);

-- Clean up all existing ads data and history to start fresh
DELETE FROM ads_data;
DELETE FROM upload_history WHERE data_type = 'ads';