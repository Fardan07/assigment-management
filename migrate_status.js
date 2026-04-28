const pg = require('pg');

const client = new pg.Client({
  host: '127.0.0.1',
  port: 5432,
  user: 'postgres',
  password: 'Radhiyya1512',
  database: 'facility_helpdesk_20260416'
});

(async () => {
  try {
    await client.connect();
    console.log('Connected to database');

    // Drop old constraint
    await client.query('ALTER TABLE maintenance_report DROP CONSTRAINT IF EXISTS maintenance_report_status_check');
    console.log('✓ Dropped old status constraint');

    // Migrate old status values
    const updateResult = await client.query(`
      UPDATE maintenance_report 
      SET status = 'draft' 
      WHERE status IN ('pending', 'on_progress', 'solved', 'closed', '')
      OR status IS NULL
    `);
    console.log('✓ Migrated', updateResult.rowCount, 'records to new status');

    // Add rejection_reason column
    await client.query('ALTER TABLE maintenance_report ADD COLUMN IF NOT EXISTS rejection_reason TEXT');
    console.log('✓ Added rejection_reason column');

    // Add new constraint
    await client.query(`
      ALTER TABLE maintenance_report 
      ADD CONSTRAINT chk_maintenance_report_status 
      CHECK (status IN ('draft', 'submitted', 'rejected_by_wom', 'assigned', 'in_progress', 'pending_review', 'rejected', 'approved'))
    `);
    console.log('✓ Added new status constraint');

    // Verify results
    const result = await client.query('SELECT status, COUNT(*) as count FROM maintenance_report GROUP BY status');
    console.log('\nStatus distribution:');
    console.table(result.rows);

    await client.end();
    console.log('\n✓ Migration completed successfully');
  } catch (err) {
    console.error('✗ Error:', err.message);
    process.exit(1);
  }
})();
