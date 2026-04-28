SELECT
    u.user_id,
    u.employee_code,
    u.full_name,
    u.email,
    u.phone,
    u.role,
    u.department,
    u.job_title,
    u.is_active,
    u.last_login_at,
    u.created_at,
    u.updated_at
FROM app_user u