SELECT so.stock_outbound_id,
       so.outbound_number,
       so.outbound_date,
       so.warehouse_id,
       w.warehouse_code,
       w.warehouse_name,
       so.customer_id,
       c.customer_code,
       c.customer_name,
       so.reference_number,
       so.notes,
       so.total_items,
       so.total_qty,
       so.total_amount,
       so.status,
       so.created_at,
       so.created_by,
       so.updated_at,
       so.updated_by
FROM stock_outbound so
LEFT JOIN warehouse w ON so.warehouse_id = w.warehouse_id
LEFT JOIN customer c ON so.customer_id = c.customer_id