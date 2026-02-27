ALTER TABLE customer_complaint
ADD COLUMN order_id uuid REFERENCES sales_data(id) ON DELETE SET NULL;

CREATE INDEX idx_complaint_order_id ON customer_complaint(order_id);