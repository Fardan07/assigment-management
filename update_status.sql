-- Drop old constraint if exists
ALTER TABLE maintenance_report DROP CONSTRAINT IF EXISTS maintenance_report_status_check;

-- Migrate old status values to new ones
UPDATE maintenance_report SET status = 'draft' WHERE status IN ('pending', 'on_progress', 'solved', 'closed');
UPDATE maintenance_report SET status = 'draft' WHERE status IS NULL;

-- Add rejection_reason column if it doesn't exist
ALTER TABLE maintenance_report ADD COLUMN IF NOT EXISTS rejection_reason TEXT;

-- Add new constraint
ALTER TABLE maintenance_report ADD CONSTRAINT chk_maintenance_report_status CHECK (status IN ('draft', 'submitted', 'assigned', 'in_progress', 'pending_review', 'approved', 'rejected', 'cancelled'));

-- Verify results
SELECT status, COUNT(*) FROM maintenance_report GROUP BY status;
