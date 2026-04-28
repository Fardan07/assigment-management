select 
	a.item_product_id, a.product_code, a.sku, a.product_name, b.category_name, a.brand, a.description, a.purchase_price, a.selling_price, a.stock, a.min_stock, 
	a.uom, a.weight, a.is_active, a.show_in_store, a.barcode, a.shelf_location, a.category_id
from item_product a
inner join category b on b.category_id = a.category_id 