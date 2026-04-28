SELECT
    a.activity_id,
    a.report_id,
    r.report_number,
    a.actor_id,
    u.full_name AS actor_name,
    a.activity_type,
    a.status_from,
    a.status_to,
    a.activity_note,
    a.activity_at
FROM report_activity a
LEFT JOIN maintenance_report r ON r.report_id = a.report_id
LEFT JOIN app_user u ON u.user_id = a.actor_id