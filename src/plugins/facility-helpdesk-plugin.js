const db = require('restforgejs/src/utils/db');

module.exports = {
  onBeforeEndpointsLoad: (app, config) => {
    
    // Add custom API for WorkRequestDetailPage
    app.get('/api/work-requests/my', async (req, res) => {
      try {
        const actorId = req.query.actor_id || req.query.actor_email;
        if (!actorId) {
          return res.status(400).json({ success: false, message: 'actor_id or actor_email is required' });
        }
        
        let query = `
          SELECT * FROM maintenance_report
          WHERE reporter_id = $1
          ORDER BY updated_at DESC
        `;
        let params = [actorId];

        const data = await db.executeQuery(query, params);

        return res.json({
          success: true,
          data: data || []
        });
      } catch (err) {
        return res.status(500).json({ success: false, message: err.message });
      }
    });

    app.get('/api/work-request/:id/detail', async (req, res) => {
      try {
        const reportId = req.params.id;
        
        const reportResult = await db.executeQuery(`SELECT * FROM maintenance_report WHERE report_id = $1`, [reportId]);
        if (!reportResult || reportResult.length === 0) {
          return res.status(404).json({ success: false, message: 'Work request not found' });
        }

        const report = reportResult[0];
        
        // Fetch facility info and category info and assigned user name (relation)
        const relation = {
            facility_name: null,
            category_name: null,
            assigned_to_name: null
        };
        
        if (report.facility_id) {
            const facResult = await db.executeQuery(`SELECT facility_name as title FROM facility_asset WHERE facility_id = $1`, [report.facility_id]);
            if (facResult && facResult.length > 0) relation.facility_name = facResult[0].title;
            else relation.facility_name = report.facility_id;
        }
        
        if (report.category_id) {
            const catResult = await db.executeQuery(`SELECT category_name as title FROM issue_category WHERE category_id = $1`, [report.category_id]);
            if (catResult && catResult.length > 0) relation.category_name = catResult[0].title;
            else relation.category_name = report.category_id;
        }

        if (report.assigned_to_id) {
            const userResult = await db.executeQuery(`SELECT full_name FROM app_user WHERE user_id = $1`, [report.assigned_to_id]);
            if (userResult && userResult.length > 0) relation.assigned_to_name = userResult[0].full_name;
        }
        
        const activityResult = await db.executeQuery(`
          SELECT a.*, u.full_name as actor_name 
          FROM report_activity a 
          LEFT JOIN app_user u ON a.actor_id = u.user_id 
          WHERE a.report_id = $1 
          ORDER BY a.activity_at ASC`, [reportId]);

        const commentsResult = await db.executeQuery(`
          SELECT c.*, u.full_name as author_name 
          FROM report_comment c 
          LEFT JOIN app_user u ON c.author_id = u.user_id 
          WHERE c.report_id = $1 
          ORDER BY c.created_at ASC`, [reportId]);

        const attachmentsResult = await db.executeQuery(`SELECT * FROM report_attachment WHERE report_id = $1`, [reportId]);

        return res.json({
          success: true,
          data: {
            report: report,
            relation: relation,
            activity: activityResult || [],
            comments: commentsResult || [],
            attachments: attachmentsResult || []
          }
        });
      } catch (err) {
        console.error('Error fetching detail', err);
        return res.status(500).json({ success: false, message: err.message });
      }
    });

  }
};
