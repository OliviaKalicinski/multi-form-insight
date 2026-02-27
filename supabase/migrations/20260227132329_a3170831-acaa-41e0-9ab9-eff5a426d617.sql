
-- Fix security definer view warning
DROP VIEW IF EXISTS customer_full;
CREATE VIEW customer_full WITH (security_invoker = true) AS
SELECT *,
  CASE
    WHEN last_order_date IS NULL THEN NULL
    ELSE (now()::date - last_order_date::date)
  END AS days_since_last_purchase,
  CASE
    WHEN last_order_date IS NULL THEN 'churned'
    WHEN (now()::date - last_order_date::date) <= 30 THEN 'active'
    WHEN (now()::date - last_order_date::date) <= 60 THEN 'at_risk'
    WHEN (now()::date - last_order_date::date) <= 90 THEN 'inactive'
    ELSE 'churned'
  END AS churn_status
FROM customer;
