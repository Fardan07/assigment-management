SELECT sii.stock_inbound_item_id,
       sii.stock_inbound_id,
       sii.line_number,
       sii.item_product_id,
       ip.product_code,
       ip.product_name,
       sii.qty_received,
       sii.uom,
       sii.unit_price,
       sii.total_amount,
       sii.notes,
       sii.created_at,
       sii.created_by,
       sii.updated_at,
       sii.updated_by
FROM stock_inbound_item sii
LEFT JOIN item_product ip ON sii.item_product_id = ip.item_product_id
WHERE sii.stock_inbound_id = $1
ORDER BY sii.line_number