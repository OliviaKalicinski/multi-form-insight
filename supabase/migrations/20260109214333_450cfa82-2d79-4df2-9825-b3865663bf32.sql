-- Add date range columns to upload_history
ALTER TABLE upload_history 
ADD COLUMN date_range_start date,
ADD COLUMN date_range_end date;