SELECT
    a.attachment_id,
    a.report_id,
    r.report_number,
    a.attachment_type,
    a.file_name,
    a.file_url,
    a.mime_type,
    a.file_size_bytes,
    a.uploaded_by,
    u.full_name AS uploaded_by_name,
    a.created_at
FROM report_attachment a
LEFT JOIN maintenance_report r ON r.report_id = a.report_id
LEFT JOIN app_user u ON u.user_id = a.uploaded_by