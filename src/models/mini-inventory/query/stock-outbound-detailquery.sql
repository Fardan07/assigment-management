SELECT soi.stock_outbound_item_id,
       soi.stock_outbound_id,
       soi.line_number,
       soi.item_product_id,
       ip.product_code,
       ip.product_name,
       soi.qty_shipped,
       soi.uom,
       soi.unit_price,
       soi.total_amount,
       soi.notes,
       soi.created_at,
       soi.created_by,
       soi.updated_at,
       soi.updated_by
FROM stock_outbound_item soi
LEFT JOIN item_product ip ON soi.item_product_id = ip.item_product_id
WHERE soi.stock_outbound_id = $1
ORDER BY soi.line_number