SELECT
    c.comment_id,
    c.report_id,
    r.report_number,
    c.author_id,
    u.full_name AS author_name,
    c.comment_text,
    c.is_internal,
    c.created_at
FROM report_comment c
LEFT JOIN maintenance_report r ON r.report_id = c.report_id
LEFT JOIN app_user u ON u.user_id = c.author_id