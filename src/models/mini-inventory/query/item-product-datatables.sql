SELECT a.item_product_id,
       a.product_code,
       a.sku,
       a.product_name,
       b.category_name,
       a.selling_price,
       a.stock,
       a.uom,
       a.is_active,
       a.category_id
FROM item_product a
INNER JOIN category b ON b.category_id = a.category_id