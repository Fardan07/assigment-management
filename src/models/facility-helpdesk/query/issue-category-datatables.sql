SELECT
    c.category_id,
    c.category_code,
    c.category_name,
    c.description,
    c.is_active,
    c.sort_order,
    c.created_at,
    c.updated_at
FROM issue_category c