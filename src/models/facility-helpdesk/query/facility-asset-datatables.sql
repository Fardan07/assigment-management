SELECT
    f.facility_id,
    f.facility_code,
    f.facility_name,
    f.facility_type,
    f.floor_level,
    f.room_name,
    f.location_detail,
    f.brand,
    f.model,
    f.serial_number,
    f.condition_status,
    f.is_active,
    f.notes,
    f.created_at,
    f.updated_at
FROM facility_asset f