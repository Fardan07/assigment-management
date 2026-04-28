SELECT si.stock_inbound_id,
       si.inbound_number,
       si.inbound_date,
       si.warehouse_id,
       w.warehouse_code,
       w.warehouse_name,
       si.supplier_id,
       s.supplier_code,
       s.supplier_name,
       si.reference_number,
       si.notes,
       si.total_items,
       si.total_qty,
       si.total_amount,
       si.status,
       si.created_at,
       si.created_by,
       si.updated_at,
       si.updated_by
FROM stock_inbound si
LEFT JOIN warehouse w ON si.warehouse_id = w.warehouse_id
LEFT JOIN supplier s ON si.supplier_id = s.supplier_id