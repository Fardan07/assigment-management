SELECT
    r.report_id,
    r.report_number,
    r.reporter_id,
    rep.full_name AS reporter_name,
    r.category_id,
    c.category_name,
    r.facility_id,
    f.facility_name,
    r.title,
    r.location_floor,
    r.location_room,
    r.location_detail,
    r.urgency,
    r.status,
    r.assigned_to_id,
    ass.full_name AS assignee_name,
    r.admin_note,
    r.technician_note,
    r.resolution_note,
    r.photo_before_url,
    r.photo_after_url,
    r.reported_at,
    r.assigned_at,
    r.started_at,
    r.solved_at,
    r.closed_at,
    r.created_at,
    r.updated_at
FROM maintenance_report r
LEFT JOIN app_user rep ON rep.user_id = r.reporter_id
LEFT JOIN app_user ass ON ass.user_id = r.assigned_to_id
LEFT JOIN issue_category c ON c.category_id = r.category_id
LEFT JOIN facility_asset f ON f.facility_id = r.facility_id