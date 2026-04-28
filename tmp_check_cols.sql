SELECT column_name, data_type, character_maximum_length
FROM information_schema.columns
WHERE table_name='maintenance_report' AND column_name IN ('photo_before_url','photo_after_url');
