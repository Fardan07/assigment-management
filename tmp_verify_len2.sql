SELECT report_id, report_number, length(photo_before_url) AS photo_len, left(photo_before_url, 30) AS prefix
FROM maintenance_report
WHERE report_id = 'a2d7397c-07a2-404c-844c-b2b96eaad25e';
