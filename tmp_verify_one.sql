SELECT report_number, length(photo_before_url) AS photo_len, left(photo_before_url, 30) AS prefix
FROM maintenance_report
WHERE report_id = '04790c02-f3f3-4865-8a05-c11f17f2e99f';
