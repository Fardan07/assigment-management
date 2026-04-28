SELECT report_number, created_at, length(photo_before_url) AS photo_len,
       left(photo_before_url, 40) AS photo_prefix
FROM maintenance_report
ORDER BY created_at DESC
LIMIT 8;
