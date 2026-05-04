const express = require('express');
const router = express.Router();
const maintenanceReportModel = require('../../models/facility-helpdesk/maintenance-report');

const WORKFLOW_ROLES = ['REQUESTER', 'WO_MANAGER', 'TECHNICIAN', 'SITE_MANAGER'];
const WORKFLOW_TRANSITIONS = {
  draft: ['submitted'],
  submitted: ['assigned', 'rejected_by_wom'],
  rejected_by_wom: [],
  assigned: ['in_progress'],
  in_progress: ['pending_review'],
  pending_review: ['approved', 'rejected'],
  rejected: ['in_progress'],
  approved: []
};

const WORKFLOW_TRANSITION_ACTORS = {
  'draft->submitted': ['REQUESTER'],
  'submitted->assigned': ['WO_MANAGER'],
  'submitted->rejected_by_wom': ['WO_MANAGER'],
  'assigned->in_progress': ['TECHNICIAN'],
  'in_progress->pending_review': ['TECHNICIAN'],
  'pending_review->approved': ['SITE_MANAGER'],
  'pending_review->rejected': ['SITE_MANAGER'],
  'rejected->in_progress': ['TECHNICIAN']
};

function getRequestRole(req) {
  const roleHeader = req.headers['x-user-role'] || req.headers['user-role'] || req.headers['role'];
  return String(roleHeader || '').trim().toUpperCase();
}

function getRequestUserId(req) {
  return String(req.headers['x-user-id'] || req.headers['user-id'] || '').trim();
}

function isWorkflowRole(role) {
  return WORKFLOW_ROLES.includes(role);
}

function normalizeStatus(value) {
  return String(value || '').trim().toLowerCase();
}

function isValidTransition(fromStatus, toStatus) {
  const nextStatuses = WORKFLOW_TRANSITIONS[fromStatus] || [];
  return nextStatuses.includes(toStatus);
}

function canActorRunTransition(role, fromStatus, toStatus) {
  const key = `${fromStatus}->${toStatus}`;
  const allowedActors = WORKFLOW_TRANSITION_ACTORS[key] || [];
  return allowedActors.includes(role);
}

function hasValue(value) {
  return value !== undefined && value !== null && String(value).trim() !== '';
}

function hasOnlyAllowedFields(payload, allowedFields) {
  const allowed = new Set(allowedFields);
  return Object.keys(payload || {}).every((key) => allowed.has(key));
}


// Component Engine untuk event lifecycle (optional)
let componentEngine = null;
let ContextBuilder = null;
try {
  // Hanya load component engine jika payload memiliki components
  const hasComponents = undefined && Array.isArray(undefined) && undefined.length > 0;

  if (hasComponents) {
    componentEngine = require('restforgejs/src/utils/component-engine').componentEngine;
    ContextBuilder = require('restforgejs/src/utils/context-builder');

    // Load component configuration dari payload yang sedang digunakan
    const componentConfig = {
      tableName: 'maintenance_report',
      fieldName: ["report_id","report_number","reporter_id","category_id","facility_id","title","location_floor","location_room","location_detail","description","urgency","status","assigned_to_id","admin_note","technician_note","resolution_note","rejection_reason","photo_before_url","photo_after_url","reported_at","assigned_at","started_at","solved_at","closed_at","created_at","updated_at"],
      exportQuery: null,
      columnFormats: null,
      fieldLabels: null,
      components: undefined,
      importConfig: null,
      adjustConfig: null,
      workflowConfig: null
    };

    componentEngine.loadConfigurationFromObject(componentConfig).then(result => {
      if (result.success) {
        console.log(`Component configuration loaded for facility-helpdesk/maintenance-report: ${result.componentsLoaded} components`);
      }
    }).catch(err => {
      console.error(`Failed to load component configuration for facility-helpdesk/maintenance-report:`, err.message);
    });
  } else {
    console.log(`No components defined in payload for facility-helpdesk/maintenance-report, running without events`);
  }
} catch (e) {
  if (hasComponents) {
    // Components dikonfigurasi tapi engine gagal load — ini error, bukan optional
    console.error(`CRITICAL: Component engine failed to load for facility-helpdesk/maintenance-report but components are configured:`, e.message);
    throw e;
  }
  // Jika tidak ada components, silent skip wajar
  console.log(`No component engine required for facility-helpdesk/maintenance-report, running without events`);
}

/**
 * MaintenanceReport Submodule - Auto-generated on 2026-04-15 01:43:40
 *
 * Endpoints untuk maintenance-report dengan actions: datatables, create, update, delete, first, lookup, read
 * Table: maintenance_report
 * Fields: 25 fields
 * Database: PostgreSQL
 */

// Middleware CORS
router.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization, X-Request-Mode, X-Request-ID, Idempotency-Key');
  res.header('Access-Control-Expose-Headers', 'Idempotent-Replayed, Idempotency-Key');

  // Handle OPTIONS request (preflight)
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});



// Middleware untuk validasi payload pada metode POST
router.use((req, res, next) => {
  if (req.method === 'POST') {
    try {
      // Skip validation untuk import routes (menggunakan multipart/form-data, bukan JSON)
      if (req.path.startsWith('/import-')) {
        return next();
      }

      // Validasi umum untuk payload
      if (!req.body || Object.keys(req.body).length === 0) {
        return res.status(400).json({
          success: false,
          error: 'Missing payload',
          message: 'Payload cannot be empty',
          timestamp: new Date().toISOString(),
          endpoint: '/api/facility-helpdesk/maintenance-report' + req.path
        });
      }

      // Validasi spesifik untuk endpoint tertentu
      const endpoint = req.path.substring(1); // menghapus / di awal

      // Endpoint get membutuhkan where dalam format {key, value} atau [{key, value}] (1 elemen)
      if (endpoint === 'first') {
        // Normalize: array 1 elemen -> object
        if (Array.isArray(req.body.where) && req.body.where.length === 1) {
          req.body.where = req.body.where[0];
        }
        if (!req.body.where || typeof req.body.where !== 'object' || Array.isArray(req.body.where)) {
          return res.status(400).json({
            success: false,
            error: 'Invalid payload',
            message: 'Where must be a single condition {key, value}',
            example: {
              "where": { "key": "field_name", "value": "field_value" },
              "select": ["field1", "field2"]
            },
            timestamp: new Date().toISOString()
          });
        }
        if (req.body.where.conditions || req.body.where.logic) {
          return res.status(400).json({
            success: false,
            error: 'Invalid payload',
            message: 'Advanced where format is not supported in /first endpoint. Use /read endpoint for complex queries',
            example: {
              "where": { "key": "field_name", "value": "field_value" }
            },
            timestamp: new Date().toISOString()
          });
        }
      }

      // Endpoint delete membutuhkan where
      if (endpoint === 'delete' && (!req.body.where)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid payload',
          message: 'DELETE payload must include a where property',
          example: {
            "where": [{ "key": "id", "value": "your-id-value" }]
          },
          timestamp: new Date().toISOString()
        });
      }

      // Endpoint add membutuhkan data yang valid
      if (endpoint === 'add') {
        // Filter field yang memiliki autoGenerate dari required check
        const autoGenerateFields = ["report_id"];

        const requiredFields = ['report_id']
          .filter(field => !autoGenerateFields.includes(field));

        const missingFields = requiredFields.filter(field => !req.body[field] || req.body[field] === '');

        if (missingFields.length > 0) {
          return res.status(400).json({
            success: false,
            error: 'Missing required fields',
            message: `Required field(s): ${missingFields.join(', ')}`,
            timestamp: new Date().toISOString()
          });
        }
      }

      // Endpoint update membutuhkan primary key
      if (endpoint === 'update') {
        const primaryKey = 'report_id';
        if (!req.body[primaryKey]) {
          return res.status(400).json({
            success: false,
            error: 'Missing required field',
            message: `Primary key (${primaryKey}) is required for update`,
            timestamp: new Date().toISOString()
          });
        }
      }

    } catch (error) {
      console.error(`Error validating payload for ${req.path}:`, error);
      return res.status(400).json({
        success: false,
        error: 'Invalid payload',
        message: 'Invalid payload',
        details: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }
  next();
});


// POST /api/facility-helpdesk/maintenance-report/datatables - Data untuk DataTables
router.post('/datatables', async (req, res) => {
  try {
    // req.log.debug('Request body maintenance-report/datatables:', JSON.stringify(req.body, null, 2));

    // Extract parameters dari request
    const options = {
      searchValue: req.body.search?.value || req.body.searchValue || req.body.search_value || '',
      searchBy: req.body.searchBy || req.body.search_by || 'all',
      perPage: parseInt(req.body.length || req.body.pagination?.perpage || 10, 10),
      start: parseInt(req.body.start || 0, 10),
      draw: req.body.draw || '1'
    };

    // Handle sort_columns
    if (req.body.sort_columns && Array.isArray(req.body.sort_columns) && req.body.sort_columns.length > 0) {
      options.sort_columns = req.body.sort_columns.map(item => ({
        column: item.column,
        direction: (item.direction || 'ASC').toUpperCase()
      }));
    }

    // Pass format DataTables parameters jika ada (fallback)
    if (req.body['order[0][column]'] !== undefined) {
      options['order[0][column]'] = req.body['order[0][column]'];
    }
    if (req.body['order[0][dir]'] !== undefined) {
      options['order[0][dir]'] = req.body['order[0][dir]'];
    }

    // Proses filter dalam format filters object
    if (req.body.filters && typeof req.body.filters === 'object') {
      // Filter out values that should be ignored ("all", "-", "", null, undefined)
      const filteredFilters = {};
      Object.keys(req.body.filters).forEach(key => {
        const value = req.body.filters[key];
        // Ignore filter if value is "all", "-", empty string, null, or undefined
        if (value !== "all" && value !== "-" && value !== "" && value !== null && value !== undefined) {
          filteredFilters[key] = value;
        }
      });

      // Only set filters if there are valid filters remaining
      if (Object.keys(filteredFilters).length > 0) {
        options.filters = filteredFilters;
        console.log('Applied filters (ignoring "all", "-", empty values):', JSON.stringify(filteredFilters, null, 2));
      } else {
        console.log('All filters ignored due to "all", "-", or empty values');
      }
    }

    // Proses parameter where dengan format advanced conditions
    if (req.body.where && typeof req.body.where === 'object') {
      // Validasi format where (mendukung format array legacy dan format object baru)
      if (Array.isArray(req.body.where) || (req.body.where.conditions && Array.isArray(req.body.where.conditions))) {
        options.where = req.body.where;
        console.log('Applied where conditions:', JSON.stringify(req.body.where, null, 2));
      } else {
        console.log('Invalid where format, ignoring where parameter');
      }
    }

    // Validasi dan sanitasi parameters
    if (options.perPage > 1000) {
      options.perPage = 1000; // Limit untuk mencegah overload
    }
    if (options.perPage < 1) {
      options.perPage = 10;
    }

    // Gunakan model untuk mendapatkan data
    const result = await maintenanceReportModel.getDatatables(options);

    // Menambahkan nomor baris untuk DataTables jika diperlukan
    if (result.data && Array.isArray(result.data)) {
      result.data = result.data.map((item, index) => ({
        ...item,
        rownumerator: options.start + index + 1
      }));
    }

    // Add metadata untuk debugging (development only)
    if (process.env.NODE_ENV === 'development') {
      result._metadata = {
        endpoint: 'maintenance-report',
        options: options,
        timestamp: new Date().toISOString()
      };
    }

    return res.json(result);
  } catch (error) {
    console.error('Error in maintenance-report datatables:', error);
    const statusCode = error.statusCode || 500;
    return res.status(statusCode).json({
      success: false,
      error: statusCode === 400 ? 'Bad Request' : 'Internal Server Error',
      message: statusCode === 400 ? error.message : 'An error occurred while fetching maintenance-report data',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined,
      timestamp: new Date().toISOString()
    });
  }
});


// POST /api/facility-helpdesk/maintenance-report/create - Menambahkan data maintenance-report baru
router.post('/create', async (req, res) => {
  try {
    // req.log.debug('Request body maintenance-report/create:', JSON.stringify(req.body, null, 2));

    const requestRole = getRequestRole(req);
    const requestUserId = getRequestUserId(req);
    if (requestRole && !isWorkflowRole(requestRole)) {
      return res.status(403).json({
        success: false,
        error: 'Forbidden',
        message: 'Role is not part of workflow actors',
        timestamp: new Date().toISOString()
      });
    }
    if (requestRole && requestRole !== 'REQUESTER') {
      return res.status(403).json({
        success: false,
        error: 'Forbidden',
        message: 'Only requester can create a work request',
        timestamp: new Date().toISOString()
      });
    }

    // Validasi payload
    if (!req.body || Object.keys(req.body).length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Invalid payload',
        message: 'Payload cannot be empty',
        timestamp: new Date().toISOString()
      });
    }

    if (requestUserId) {
      if (req.body.reporter_id && String(req.body.reporter_id) !== requestUserId) {
        return res.status(403).json({
          success: false,
          error: 'Forbidden',
          message: 'Requester can only create own work request',
          timestamp: new Date().toISOString()
        });
      }
      req.body.reporter_id = requestUserId;
    }

    // Poin 1 (overview): request baru selalu mulai dari draft.
    req.body.status = 'draft';
    req.body.assigned_to_id = null;
    req.body.assigned_at = null;
    req.body.started_at = null;
    req.body.solved_at = null;
    req.body.closed_at = null;

    // Get correlation ID from header (optional)
    const correlationId = req.headers['x-correlation-id'] || null;

    // Validasi data dengan model jika tersedia
    if (typeof maintenanceReportModel.validateData === 'function') {
      const validation = await maintenanceReportModel.validateData(req.body, 'insert');
      if (!validation.isValid) {
        return res.status(400).json({
          success: false,
          error: 'Validation failed',
          message: 'Invalid data',
          errors: validation.errors,
          timestamp: new Date().toISOString()
        });
      }

      // Gunakan sanitized data
      req.body = { ...req.body, ...validation.sanitizedData };
    }

    // Event lifecycle variables
    let oldData = null;
    let newData = null;
    const requestData = req.body;
    let responseData = null;

    // === Integrated Transaction dengan Event Lifecycle ===
    // onBefore + main operation + onAfter dieksekusi dalam satu transaction scope
    // di dalam model.executeTransactionWithEvents()
    if (componentEngine && ContextBuilder) {
      // Gunakan integrated transaction model dengan event lifecycle
      try {
        const eventContext = {
          componentEngine: componentEngine,
          ContextBuilder: ContextBuilder,
          tableName: 'maintenance_report',
          additionalContext: {
            user_id: req.headers['user-id'] || req.headers['x-user-id'] || 'system',
            options: req.bodyOptions || {},
            requestId: req.id || null
          }
        };

        responseData = await maintenanceReportModel.addData(req.body, eventContext);
        newData = responseData;

        console.log('[INTEGRATED TRANSACTION] INSERT completed successfully with events');
      } catch (error) {
        console.error('[INTEGRATED TRANSACTION] INSERT failed:', error.message);
        throw error;
      }
    } else {
      // Fallback: gunakan mode lama tanpa events (tetap propagasi requestId untuk Live Sync)
      try {
        responseData = await maintenanceReportModel.addData(req.body, { additionalContext: { requestId: req.id || null } });
        newData = responseData;
        console.log('[FALLBACK] INSERT completed without events');
      } catch (error) {
        console.error('[FALLBACK] INSERT failed:', error.message);
        throw error;
      }
    }

    // Log successful operation
    console.log(`maintenance-report data added successfully: ${responseData.report_id || 'new record'}`);

    // Kirim response
    return res.status(201).json({
      success: true,
      message: 'maintenance-report data successfully added',
      data: responseData,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error saat menambahkan data maintenance-report:', error);

    // Handle specific error types
    if (error.code === '23505') { // PostgreSQL unique violation
      return res.status(409).json({
        success: false,
        error: 'Duplicate entry',
        message: 'A record with this value already exists',
        timestamp: new Date().toISOString()
      });
    }

    if (error.code === '23503') { // PostgreSQL foreign key violation
      return res.status(400).json({
        success: false,
        error: 'Foreign key constraint',
        message: 'Referenced data not found',
        timestamp: new Date().toISOString()
      });
    }

    return res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: 'An error occurred while adding maintenance-report data',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined,
      timestamp: new Date().toISOString()
    });
  }
});


// POST /api/facility-helpdesk/maintenance-report/update - Mengupdate data maintenance-report
router.post('/update', async (req, res) => {
  try {
    // req.log.debug('Request body maintenance-report/update:', JSON.stringify(req.body, null, 2));

    const requestRole = getRequestRole(req);
    const requestUserId = getRequestUserId(req);
    if (requestRole && !isWorkflowRole(requestRole)) {
      return res.status(403).json({
        success: false,
        error: 'Forbidden',
        message: 'Role is not part of workflow actors',
        timestamp: new Date().toISOString()
      });
    }

    // Validasi payload
    if (!req.body || Object.keys(req.body).length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Invalid payload',
        message: 'Payload cannot be empty',
        timestamp: new Date().toISOString()
      });
    }

    // Get correlation ID from header (optional)
    const correlationId = req.headers['x-correlation-id'] || null;

    // Validasi primary key
    const primaryKey = 'report_id';
    if (!req.body[primaryKey]) {
      return res.status(400).json({
        success: false,
        error: 'Missing required field',
        message: `Primary key (${primaryKey}) is required for update`,
        timestamp: new Date().toISOString()
      });
    }

    const existingData = await maintenanceReportModel.getData({
      where: [{ key: primaryKey, value: req.body[primaryKey] }]
    });
    if (!existingData.success || !existingData.data || existingData.data.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Data not found',
        message: 'maintenance-report data not found',
        timestamp: new Date().toISOString()
      });
    }

    const oldData = existingData.data[0];
    const currentStatus = normalizeStatus(oldData.status);
    const hasRequestedStatus = Object.prototype.hasOwnProperty.call(req.body, 'status');
    const nextStatus = hasRequestedStatus ? normalizeStatus(req.body.status) : currentStatus;

    const immutableAfterDraftFields = ['report_number', 'reporter_id', 'reported_at'];
    for (const field of immutableAfterDraftFields) {
      if (Object.prototype.hasOwnProperty.call(req.body, field) && currentStatus !== 'draft') {
        return res.status(400).json({
          success: false,
          error: 'Invalid update',
          message: `${field} cannot be changed after draft status`,
          timestamp: new Date().toISOString()
        });
      }
    }

    // Update tanpa transisi hanya boleh saat draft oleh requester pemilik.
    if (!hasRequestedStatus || nextStatus === currentStatus) {
      if (!requestRole || !requestUserId) {
        return res.status(400).json({
          success: false,
          error: 'Missing actor header',
          message: 'x-user-role and x-user-id are required for draft update',
          timestamp: new Date().toISOString()
        });
      }

      if (currentStatus !== 'draft') {
        return res.status(403).json({
          success: false,
          error: 'Forbidden',
          message: 'Update without status transition is only allowed in draft',
          timestamp: new Date().toISOString()
        });
      }

      if (requestRole && requestRole !== 'REQUESTER') {
        return res.status(403).json({
          success: false,
          error: 'Forbidden',
          message: 'Only requester can edit draft work request',
          timestamp: new Date().toISOString()
        });
      }

      if (requestUserId && String(oldData.reporter_id || '') !== requestUserId) {
        return res.status(403).json({
          success: false,
          error: 'Forbidden',
          message: 'Requester can only edit own draft work request',
          timestamp: new Date().toISOString()
        });
      }

      if (!hasOnlyAllowedFields(req.body, [
        'report_id',
        'status',
        'category_id',
        'facility_id',
        'title',
        'location_floor',
        'location_room',
        'location_detail',
        'description',
        'urgency',
        'photo_before_url'
      ])) {
        return res.status(400).json({
          success: false,
          error: 'Invalid payload',
          message: 'Draft update only allows requester editable fields',
          timestamp: new Date().toISOString()
        });
      }
    } else {
      const transitionKey = `${currentStatus}->${nextStatus}`;

      if (!requestRole || !requestUserId) {
        return res.status(400).json({
          success: false,
          error: 'Missing actor header',
          message: 'x-user-role and x-user-id are required for workflow transition',
          timestamp: new Date().toISOString()
        });
      }

      if (!isValidTransition(currentStatus, nextStatus)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid transition',
          message: `Transition ${currentStatus} -> ${nextStatus} is not allowed`,
          timestamp: new Date().toISOString()
        });
      }

      if (requestRole && !canActorRunTransition(requestRole, currentStatus, nextStatus)) {
        return res.status(403).json({
          success: false,
          error: 'Forbidden',
          message: `Role ${requestRole} cannot perform transition ${currentStatus} -> ${nextStatus}`,
          timestamp: new Date().toISOString()
        });
      }

      if (transitionKey !== 'submitted->assigned' && Object.prototype.hasOwnProperty.call(req.body, 'assigned_to_id')) {
        return res.status(400).json({
          success: false,
          error: 'Invalid payload',
          message: 'assigned_to_id can only be changed during submitted -> assigned transition',
          timestamp: new Date().toISOString()
        });
      }

      if (requestRole === 'TECHNICIAN' && requestUserId && String(oldData.assigned_to_id || '') !== requestUserId) {
        return res.status(403).json({
          success: false,
          error: 'Forbidden',
          message: 'Only assigned technician can process this work request',
          timestamp: new Date().toISOString()
        });
      }

      if (currentStatus === 'submitted' && nextStatus === 'assigned' && !req.body.assigned_to_id) {
        return res.status(400).json({
          success: false,
          error: 'Missing required field',
          message: 'assigned_to_id is required for submitted -> assigned transition',
          timestamp: new Date().toISOString()
        });
      }

      if (requestRole === 'WO_MANAGER' && !hasOnlyAllowedFields(req.body, [
        'report_id',
        'status',
        'assigned_to_id',
        'admin_note',
        'rejection_reason',
        'assigned_at'
      ])) {
        return res.status(400).json({
          success: false,
          error: 'Invalid payload',
          message: 'WO_MANAGER can only update assignment and decision fields',
          timestamp: new Date().toISOString()
        });
      }

      if (requestRole === 'TECHNICIAN' && !hasOnlyAllowedFields(req.body, [
        'report_id',
        'status',
        'technician_note',
        'resolution_note',
        'photo_after_url',
        'started_at',
        'solved_at'
      ])) {
        return res.status(400).json({
          success: false,
          error: 'Invalid payload',
          message: 'TECHNICIAN can only update technician work progress fields',
          timestamp: new Date().toISOString()
        });
      }

      if (requestRole === 'SITE_MANAGER' && !hasOnlyAllowedFields(req.body, [
        'report_id',
        'status',
        'rejection_reason',
        'closed_at',
        'admin_note'
      ])) {
        return res.status(400).json({
          success: false,
          error: 'Invalid payload',
          message: 'SITE_MANAGER can only update review decision fields',
          timestamp: new Date().toISOString()
        });
      }

      if (currentStatus === 'submitted' && nextStatus === 'rejected_by_wom' && !hasValue(req.body.rejection_reason)) {
        return res.status(400).json({
          success: false,
          error: 'Missing required field',
          message: 'rejection_reason is required for submitted -> rejected_by_wom transition',
          timestamp: new Date().toISOString()
        });
      }

      if (currentStatus === 'in_progress' && nextStatus === 'pending_review' && !hasValue(req.body.resolution_note)) {
        return res.status(400).json({
          success: false,
          error: 'Missing required field',
          message: 'resolution_note is required for in_progress -> pending_review transition',
          timestamp: new Date().toISOString()
        });
      }

      if (currentStatus === 'pending_review' && nextStatus === 'rejected' && !hasValue(req.body.rejection_reason)) {
        return res.status(400).json({
          success: false,
          error: 'Missing required field',
          message: 'rejection_reason is required for pending_review -> rejected transition',
          timestamp: new Date().toISOString()
        });
      }

      if (currentStatus === 'submitted' && nextStatus === 'assigned' && !req.body.assigned_at) {
        req.body.assigned_at = new Date().toISOString();
      }
      if (currentStatus === 'submitted' && nextStatus === 'rejected_by_wom') {
        req.body.assigned_to_id = null;
        req.body.assigned_at = null;
        req.body.started_at = null;
        req.body.solved_at = null;
        req.body.closed_at = null;
      }
      if ((currentStatus === 'assigned' && nextStatus === 'in_progress') || (currentStatus === 'rejected' && nextStatus === 'in_progress')) {
        if (!req.body.started_at) {
          req.body.started_at = new Date().toISOString();
        }
        if (!hasValue(req.body.technician_note)) {
          req.body.technician_note = oldData.technician_note || 'Work order accepted by technician';
        }
      }
      if (currentStatus === 'in_progress' && nextStatus === 'pending_review' && !req.body.solved_at) {
        req.body.solved_at = new Date().toISOString();
      }
      if (currentStatus === 'pending_review' && nextStatus === 'approved' && !req.body.closed_at) {
        req.body.closed_at = new Date().toISOString();
      }
    }

    // Normalisasi status sebelum validasi model.
    req.body.status = nextStatus;

    // Validasi data dengan model jika tersedia
    if (typeof maintenanceReportModel.validateData === 'function') {
      const validation = await maintenanceReportModel.validateData(req.body, 'update');
      if (!validation.isValid) {
        return res.status(400).json({
          success: false,
          error: 'Validation failed',
          message: 'Invalid data',
          errors: validation.errors,
          timestamp: new Date().toISOString()
        });
      }

      // Gunakan sanitized data
      req.body = { ...req.body, ...validation.sanitizedData };
    }

    // Event lifecycle variables
    let newData = null;
    const requestData = req.body;
    let responseData = null;

    // === Integrated Transaction dengan Event Lifecycle ===
    // oldData fetch + onBefore + main operation + onAfter dieksekusi dalam satu transaction scope
    // di dalam model.executeTransactionWithEvents()
    if (componentEngine && ContextBuilder) {
      // Gunakan integrated transaction model dengan event lifecycle
      try {
        const eventContext = {
          componentEngine: componentEngine,
          ContextBuilder: ContextBuilder,
          tableName: 'maintenance_report',
          additionalContext: {
            user_id: req.headers['user-id'] || req.headers['x-user-id'] || 'system',
            options: req.bodyOptions || {},
            requestId: req.id || null
          }
        };

        responseData = await maintenanceReportModel.updateData(req.body, eventContext);
        newData = responseData;

        console.log('[INTEGRATED TRANSACTION] UPDATE completed successfully with events');
      } catch (error) {
        console.error('[INTEGRATED TRANSACTION] UPDATE failed:', error.message);
        throw error;
      }
    } else {
      // Fallback: gunakan mode lama tanpa events (tetap propagasi requestId untuk Live Sync)
      try {
        responseData = await maintenanceReportModel.updateData(req.body, { additionalContext: { requestId: req.id || null } });
        newData = responseData;
        console.log('[FALLBACK] UPDATE completed without events');
      } catch (error) {
        console.error('[FALLBACK] UPDATE failed:', error.message);
        throw error;
      }
    }

    // Log successful operation
    console.log(`maintenance-report data updated successfully: ${primaryKey}=${req.body[primaryKey]}`);

    // Kirim response
    return res.status(200).json({
      success: true,
      message: 'maintenance-report data successfully updated',
      data: responseData,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error saat mengupdate data maintenance-report:', error);

    // Handle khusus untuk error "Data tidak ditemukan"
    if (error.message === 'Data tidak ditemukan' || error.message.includes('not found')) {
      return res.status(404).json({
        success: false,
        error: 'Data not found',
        message: 'maintenance-report data not found',
        timestamp: new Date().toISOString()
      });
    }

    // Handle specific database errors
    if (error.code === '23505') { // PostgreSQL unique violation
      return res.status(409).json({
        success: false,
        error: 'Duplicate entry',
        message: 'A record with this value already exists',
        timestamp: new Date().toISOString()
      });
    }

    return res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: 'An error occurred while updating maintenance-report data',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined,
      timestamp: new Date().toISOString()
    });
  }
});


// POST /api/facility-helpdesk/maintenance-report/delete - Menghapus data maintenance-report
router.post('/delete', async (req, res) => {
  try {
    // req.log.debug('Request body maintenance-report/delete:', JSON.stringify(req.body, null, 2));

    const requestRole = getRequestRole(req);
    const requestUserId = getRequestUserId(req);
    if (requestRole && !isWorkflowRole(requestRole)) {
      return res.status(403).json({
        success: false,
        error: 'Forbidden',
        message: 'Role is not part of workflow actors',
        timestamp: new Date().toISOString()
      });
    }
    if (requestRole && requestRole !== 'REQUESTER') {
      return res.status(403).json({
        success: false,
        error: 'Forbidden',
        message: 'Only requester can delete a work request',
        timestamp: new Date().toISOString()
      });
    }

    // Validasi request body
    if (!req.body || Object.keys(req.body).length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Invalid payload',
        message: 'Payload cannot be empty',
        timestamp: new Date().toISOString()
      });
    }

    // Get correlation ID from header (optional)
    const correlationId = req.headers['x-correlation-id'] || null;

    if (!req.body.where) {
      return res.status(400).json({
        success: false,
        error: 'Missing required field',
        message: 'Invalid request format: where parameter is required',
        example: {
          "where": [{ "key": "id", "value": "your-id-value" }]
        },
        timestamp: new Date().toISOString()
      });
    }

    // Validasi format where
    if (!Array.isArray(req.body.where) && !req.body.where.conditions) {
      return res.status(400).json({
        success: false,
        error: 'Invalid where format',
        message: 'Invalid where format',
        example: {
          "where": [
            { "key": "id", "value": "your-id-value" }
          ]
        },
        timestamp: new Date().toISOString()
      });
    }

    // === EVENT LIFECYCLE: onBefore DELETE ===
    let oldData = null;
    let newData = null;
    const requestData = req.body;
    let responseData = null;

    // Cek apakah data exist sebelum delete dan ambil old data untuk event lifecycle
    // Menggunakan SELECT * dari tabel utama (tanpa explicit select) karena fieldName
    // bisa mengandung kolom dari JOIN (mis. city_name) yang tidak ada di tabel utama
    if (req.body.where && Array.isArray(req.body.where) && req.body.where.length > 0) {
      const firstCondition = req.body.where[0];
      try {
        const existingData = await maintenanceReportModel.getData({
          where: [{ key: firstCondition.key, value: firstCondition.value }]
        });

        if (!existingData.success || !existingData.data || existingData.data.length === 0) {
          return res.status(404).json({
            success: false,
            error: 'Data not found',
            message: 'maintenance-report data not found',
            timestamp: new Date().toISOString()
          });
        }

        // Simpan data untuk event lifecycle dan debug
        oldData = existingData.data[0];

        // Poin 1-2: delete hanya untuk draft milik requester.
        if (String(oldData.status || '').toLowerCase() !== 'draft') {
          return res.status(403).json({
            success: false,
            error: 'Forbidden',
            message: 'Only draft work request can be deleted',
            timestamp: new Date().toISOString()
          });
        }
        if (requestUserId && String(oldData.reporter_id || '') !== requestUserId) {
          return res.status(403).json({
            success: false,
            error: 'Forbidden',
            message: 'Requester can only delete own draft work request',
            timestamp: new Date().toISOString()
          });
        }

      } catch (checkError) {
        return res.status(500).json({
          success: false,
          error: 'Verification Failed',
          message: 'Could not verify data existence before delete',
          details: process.env.NODE_ENV === 'development' ? checkError.message : undefined,
          timestamp: new Date().toISOString()
        });
      }
    }

    // === Integrated Transaction dengan Event Lifecycle ===
    // onBefore + main operation + onAfter dieksekusi dalam satu transaction scope
    // di dalam model.executeTransactionWithEvents()
    if (componentEngine && ContextBuilder) {
      // Gunakan integrated transaction model dengan event lifecycle
      try {
        const eventContext = {
          componentEngine: componentEngine,
          ContextBuilder: ContextBuilder,
          tableName: 'maintenance_report',
          additionalContext: {
            user_id: req.headers['user-id'] || req.headers['x-user-id'] || 'system',
            options: req.bodyOptions || {},
            requestId: req.id || null
          }
        };

        responseData = await maintenanceReportModel.deleteData(req.body, eventContext);

        console.log('[INTEGRATED TRANSACTION] DELETE completed successfully with events');
      } catch (error) {
        console.error('[INTEGRATED TRANSACTION] DELETE failed:', error.message);
        throw error;
      }
    } else {
      // Fallback: gunakan mode lama tanpa events (tetap propagasi requestId untuk Live Sync)
      try {
        responseData = await maintenanceReportModel.deleteData(req.body, { additionalContext: { requestId: req.id || null } });
        console.log('[FALLBACK] DELETE completed without events');
      } catch (error) {
        console.error('[FALLBACK] DELETE failed:', error.message);
        throw error;
      }
    }

    // Log successful operation
    console.log(`maintenance-report data deleted successfully`);

    return res.json({
      ...responseData,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error saat menghapus data maintenance-report:', error);

    // Handle foreign key constraint errors
    if (error.code === '23503') { // PostgreSQL foreign key violation
      return res.status(409).json({
        success: false,
        error: 'Foreign key constraint',
        message: 'Cannot delete: record is still referenced by other data',
        timestamp: new Date().toISOString()
      });
    }

    return res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: 'An error occurred while deleting maintenance-report data',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined,
      timestamp: new Date().toISOString()
    });
  }
});


// POST /api/facility-helpdesk/maintenance-report/first - Mendapatkan data maintenance-report berdasarkan kriteria
router.post('/first', async (req, res) => {
  try {
    // req.log.debug('Request body maintenance-report/first:', JSON.stringify(req.body, null, 2));

    // Validasi request body
    if (!req.body || Object.keys(req.body).length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Invalid payload',
        message: 'Payload cannot be empty',
        timestamp: new Date().toISOString()
      });
    }

    // Normalize: array 1 elemen -> object (backward compatible)
    if (Array.isArray(req.body.where) && req.body.where.length === 1) {
      req.body.where = req.body.where[0];
    }

    // Validasi where clause - harus object tunggal {key, value}
    if (!req.body.where || typeof req.body.where !== 'object' || Array.isArray(req.body.where)) {
      return res.status(400).json({
        success: false,
        error: 'Missing required field',
        message: 'Property where is required as {key, value} object',
        example: {
          "where": { "key": "report_id", "value": "your-id-value" },
          "select": ["field1", "field2"]
        },
        timestamp: new Date().toISOString()
      });
    }

    // Validasi where.key dan where.value
    if (!req.body.where.key || req.body.where.value === undefined || req.body.where.value === null || req.body.where.value === '') {
      return res.status(400).json({
        success: false,
        error: 'Invalid where format',
        message: 'Where key and value are required',
        example: {
          "where": { "key": "report_id", "value": "your-id-value" }
        },
        timestamp: new Date().toISOString()
      });
    }

    // Tolak format advanced (conditions/logic)
    if (req.body.where.conditions || req.body.where.logic) {
      return res.status(400).json({
        success: false,
        error: 'Invalid where format',
        message: 'Advanced where format is not supported in /first endpoint. Use /read endpoint for complex queries',
        timestamp: new Date().toISOString()
      });
    }

    // Validasi where.key ada di validFields
    const validFields = ["report_id","report_number","reporter_id","category_id","facility_id","title","location_floor","location_room","location_detail","description","urgency","status","assigned_to_id","admin_note","technician_note","resolution_note","rejection_reason","photo_before_url","photo_after_url","reported_at","assigned_at","started_at","solved_at","closed_at","created_at","updated_at"];
    if (!validFields.includes(req.body.where.key)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid where field',
        message: `Invalid field: ${req.body.where.key}`,
        validFields: validFields,
        timestamp: new Date().toISOString()
      });
    }

    // Validasi select fields jika ada
    if (req.body.select && Array.isArray(req.body.select)) {
      const invalidFields = req.body.select.filter(field => !validFields.includes(field));

      if (invalidFields.length > 0) {
        return res.status(400).json({
          success: false,
          error: 'Invalid select fields',
          message: `Invalid field(s): ${invalidFields.join(', ')}`,
          validFields: validFields,
          timestamp: new Date().toISOString()
        });
      }
    }

    // Convert ke array format untuk kompatibilitas dengan model.getData() -> buildComplexWhereClause()
    const getPayload = {
      where: [{ key: req.body.where.key, value: req.body.where.value }],
      select: req.body.select
    };
    const result = await maintenanceReportModel.getData(getPayload);

    // Add metadata untuk debugging (development only)
    if (process.env.NODE_ENV === 'development' && result.success) {
      result._metadata = {
        endpoint: 'maintenance-report',
        query: req.body,
        resultCount: result.data ? result.data.length : 0,
        timestamp: new Date().toISOString()
      };
    }

    return res.json({
      ...result,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error saat mendapatkan data maintenance-report:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: 'An error occurred while fetching maintenance-report data',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined,
      timestamp: new Date().toISOString()
    });
  }
});


// GET /api/facility-helpdesk/maintenance-report/lookup - Pencarian maintenance-report untuk dropdown (dynamic)
router.get('/lookup', async (req, res) => {
  try {
    // Validasi X-Request-Mode header
    const requestMode = req.headers['x-request-mode'];
    console.log(`X-Request-Mode header: ${requestMode}`);

    if (requestMode !== 'dynamic') {
      return res.status(400).json({
        success: false,
        error: 'Invalid Request Mode',
        message: 'X-Request-Mode header must be set to dynamic',
        details: 'Contoh penggunaan: Tambahkan header X-Request-Mode: dynamic',
        timestamp: new Date().toISOString()
      });
    }

    // Ambil parameter search (default case-insensitive)
    let search = req.query.search || '';
    if (Array.isArray(search)) {
      search = search[0] || '';
    }

    // Ambil parameter tambahan untuk filtering
    const companyId = req.query.company_id || req.query.companyId;
    const extraFilters = {};

    // Collect additional filter parameters
    if (companyId) {
      extraFilters.company_id = companyId;
    }

    // Validasi search parameter
    if (search.length > 100) {
      return res.status(400).json({
        success: false,
        error: 'Invalid search parameter',
        message: 'Search parameter terlalu panjang (max 100 karakter)',
        timestamp: new Date().toISOString()
      });
    }

    console.log(`maintenance-report lookup request: search=${search}, filters=`, extraFilters);

    // Gunakan model untuk lookup data dengan filters tambahan
    const list = await maintenanceReportModel.getLookupDataDynamic(search, extraFilters);

    console.log(`Lookup results: ${list.length} records found`);
    return res.json({
      success: true,
      count: list.length,
      data: list,
      search: search,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error in maintenance-report lookup:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: 'An error occurred while looking up maintenance-report data',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined,
      timestamp: new Date().toISOString()
    });
  }
});

// POST /api/facility-helpdesk/maintenance-report/lookup - Mendapatkan data maintenance-report untuk lookup dengan filtering
router.post('/lookup', async (req, res) => {
  try {
    // Validasi X-Request-Mode header
    const requestMode = req.headers['x-request-mode'];
    console.log(`X-Request-Mode header for POST lookup: ${requestMode}`);

    if (requestMode !== 'static') {
      return res.status(400).json({
        success: false,
        error: 'Invalid Request Mode',
        message: 'X-Request-Mode header must be set to static for POST method',
        details: 'Contoh penggunaan: Tambahkan header X-Request-Mode: static',
        timestamp: new Date().toISOString()
      });
    }

    // Validasi payload
    if (!req.body) {
      // Support untuk fieldNameLookup config
      const lookupConfig = {"idField":"report_id","textField":"report_number||' - '||title as display_text","hasCustomText":true,"searchFields":["report_number","title"]};
      const defaultSelect = lookupConfig && lookupConfig.hasCustomText
        ? ["id", lookupConfig.textField]
        : ["id", "report_id"];

      return res.status(400).json({
        success: false,
        error: 'Invalid Payload',
        message: 'Payload cannot be empty',
        example: {
          "selected_tag": "optional-id-if-needed",
          "where": [{ "key": "report_id", "value": "AP2506-01" }],
          "select": defaultSelect
        },
        example_sql_expression: {
          "where": [{ "key": "company_id", "value": "your-company-id" }],
          "select": ["id", "report_id||' - '||code as display_text"]
        },
        example_custom_lookup: lookupConfig ? {
          "where": [{ "key": "company_id", "value": "your-company-id" }],
          "select": [lookupConfig.idField, lookupConfig.textField],
          "note": "Using fieldNameLookup configuration"
        } : null,
        example_advanced: {
          "where": {
            "logic": "OR",
            "conditions": [
              { "key": "report_id", "operator": "like", "value": "%Portal%" },
              { "key": "report_id", "operator": "like", "value": "%system%", "sensitive": false }
            ]
          },
          "select": ["id", "title"]
        },
        example_with_ordering: {
          "select": ["id", "report_id"],
          "sort_columns": [
            {
              "column": "report_number",
              "direction": "ASC"
            },
            {
              "column": "report_id",
              "direction": "ASC"
            }
          ]
        },
        timestamp: new Date().toISOString()
      });
    }

    // req.log.debug('Request body maintenance-report/lookup:', JSON.stringify(req.body, null, 2));

    // Cek apakah ada where clause (format baru) atau selected_tag (format lama)
    if (req.body.where) {
      // Format baru dengan where clause
      console.log('Using new format with where clause');

      // Validasi format where
      if (!Array.isArray(req.body.where) && !req.body.where.conditions) {
        return res.status(400).json({
          success: false,
          error: 'Invalid where format',
          message: 'Invalid where format',
          example: {
            "where": [
              { "key": "report_id", "value": "AP2506-01" }
            ],
            "select": ["id", "report_id"]
          },
          example_advanced: {
            "where": {
              "logic": "OR",
              "conditions": [
                { "key": "report_id", "operator": "like", "value": "%Portal%" },
                { "key": "report_id", "operator": "like", "value": "%system%", "sensitive": false }
              ]
            },
            "select": ["id", "title"]
          },
          timestamp: new Date().toISOString()
        });
      }

      // Validasi select fields jika ada (support SQL expressions)
      if (req.body.select && Array.isArray(req.body.select)) {
        const validFields = ["report_id","report_number","reporter_id","category_id","facility_id","title","location_floor","location_room","location_detail","description","urgency","status","assigned_to_id","admin_note","technician_note","resolution_note","rejection_reason","photo_before_url","photo_after_url","reported_at","assigned_at","started_at","solved_at","closed_at","created_at","updated_at"];
        const invalidFields = [];

        // Check setiap field dalam select
        for (const field of req.body.select) {
          // Skip validasi untuk field 'id'
          if (field.toLowerCase() === 'id') {
            continue;
          }

          // Skip validasi jika ada SQL expression dengan AS (alias)
          if (/\s+as\s+\w+$/i.test(field)) {
            continue;
          }

          // Skip validasi jika ada SQL operators/functions (||, CONCAT, dll)
          if (/\|\||CONCAT|COALESCE|CASE|WHEN/i.test(field)) {
            continue;
          }

          // Validasi normal field name
          if (!validFields.includes(field)) {
            invalidFields.push(field);
          }
        }

        if (invalidFields.length > 0) {
          return res.status(400).json({
            success: false,
            error: 'Invalid select fields',
            message: `Invalid field(s): ${invalidFields.join(', ')}`,
            validFields: validFields,
            sqlExpressionNote: 'SQL expressions dengan operator || atau AS alias diperbolehkan',
            timestamp: new Date().toISOString()
          });
        }
      }

      // Gunakan method getLookupDataWithFilter
      const list = await maintenanceReportModel.getLookupDataWithFilter(req.body);

      console.log(`Lookup with filter results: ${list.length} records found`);
      return res.json({
        success: true,
        count: list.length,
        data: list,
        query: req.body,
        timestamp: new Date().toISOString()
      });

    } else {
      // Format lama atau request tanpa WHERE clause tetapi dengan SELECT
      console.log('Using legacy format with selected_tag or select-only request');

      const selectedTag = req.body.selected_tag || '';
      console.log(`maintenance-report static lookup request with selected_tag: ${selectedTag}`);

      // Jika ada field select atau sort_columns, gunakan getLookupDataWithFilter dengan body yang dimodifikasi
      if ((req.body.select && Array.isArray(req.body.select)) || (req.body.sort_columns && Array.isArray(req.body.sort_columns))) {
        console.log('Found select fields or sort_columns, using getLookupDataWithFilter');

        // Buat body baru dengan where kosong untuk mengambil semua data
        const modifiedBody = {
          ...req.body,
          where: [] // Empty where untuk mengambil semua data
        };

        const list = await maintenanceReportModel.getLookupDataWithFilter(modifiedBody);

        console.log(`Static lookup with select/order results: ${list.length} records found`);
        return res.json({
          success: true,
          count: list.length,
          data: list,
          selectedTag: selectedTag,
          query: modifiedBody,
          timestamp: new Date().toISOString()
        });
      } else {
        // Gunakan model untuk mendapatkan data dengan method lama
        const list = await maintenanceReportModel.getStaticLookupData(selectedTag);

        console.log(`Static lookup results: ${list.length} records found`);
        return res.json({
          success: true,
          count: list.length,
          data: list,
          selectedTag: selectedTag,
          timestamp: new Date().toISOString()
        });
      }
    }

  } catch (error) {
    console.error('Error in maintenance-report static lookup:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: 'An error occurred while fetching maintenance-report data',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined,
      timestamp: new Date().toISOString()
    });
  }
});


// POST /api/facility-helpdesk/maintenance-report/read - Manual pagination endpoint
router.post('/read', async (req, res) => {
  try {
    // req.log.debug('Request body maintenance-report/read:', JSON.stringify(req.body, null, 2));

    // Validasi request body
    if (!req.body || Object.keys(req.body).length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Invalid payload',
        message: 'Payload cannot be empty',
        timestamp: new Date().toISOString()
      });
    }

    // Deteksi mode: paginasi (page dikirim) atau non-paginasi (page tidak dikirim)
    const paginate = req.body.page !== undefined;
    const page = paginate ? parseInt(req.body.page, 10) : null;
    const perPage = paginate ? parseInt(req.body.per_page || 10, 10) : null;
    const limit = !paginate ? Math.min(Math.max(parseInt(req.body.limit || 1000, 10), 1), 5000) : null;
    const searchValue = req.body.search_value || '';
    const searchBy = req.body.search_by || 'report_id';

    // Parse sort_columns
    let sort_columns = [];
    if (req.body.sort_columns && Array.isArray(req.body.sort_columns) && req.body.sort_columns.length > 0) {
      sort_columns = req.body.sort_columns.map(item => ({
        column: item.column,
        direction: (item.direction || 'ASC').toUpperCase()
      }));
    }

    // Proses parameter where dengan format advanced conditions
    let where = null;
    if (req.body.where && typeof req.body.where === 'object') {
      if (Array.isArray(req.body.where) || (req.body.where.conditions && Array.isArray(req.body.where.conditions))) {
        where = req.body.where;
      }
    }

    // Proses parameter select untuk kolom selektif
    const validFields = ["report_id","report_number","reporter_id","category_id","facility_id","title","location_floor","location_room","location_detail","description","urgency","status","assigned_to_id","admin_note","technician_note","resolution_note","rejection_reason","photo_before_url","photo_after_url","reported_at","assigned_at","started_at","solved_at","closed_at","created_at","updated_at"];
    let select = null;
    if (req.body.select && Array.isArray(req.body.select)) {
      const invalidFields = req.body.select.filter(field => !validFields.includes(field));
      if (invalidFields.length > 0) {
        return res.status(400).json({
          success: false,
          error: 'Invalid select fields',
          message: `Invalid field(s): ${invalidFields.join(', ')}`,
          validFields: validFields,
          timestamp: new Date().toISOString()
        });
      }
      select = req.body.select;
    }

    // Validasi parameter paginasi (hanya jika mode paginasi)
    if (paginate) {
      if (page < 1) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: {
            page: ['Page must be greater than 0']
          }
        });
      }

      if (perPage < 1 || perPage > 100) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: {
            per_page: ['Per page must be between 1 and 100']
          }
        });
      }
    }

    if (searchValue.length > 255) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: {
          search_value: ['Search value must not exceed 255 characters']
        }
      });
    }

    // Validasi kolom searching
    if (!validFields.includes(searchBy)) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: {
          search_by: [`Invalid search field. Valid fields: ${validFields.join(', ')}`]
        }
      });
    }

    // Build options untuk model
    const options = {
      searchValue: searchValue,
      searchBy: searchBy,
      sort_columns: sort_columns,
      where: where,
      select: select
    };

    if (paginate) {
      options.page = page;
      options.perPage = perPage;
      options.offset = (page - 1) * perPage;
    } else {
      options.limit = limit;
    }

    // Gunakan model untuk mendapatkan data list
    const result = await maintenanceReportModel.getList(options);

    // Format response berdasarkan mode
    if (paginate) {
      const totalPages = Math.ceil(result.totalRecords / perPage);
      const hasNext = page < totalPages;
      const hasPrevious = page > 1;

      return res.json({
        success: true,
        data: result.data || [],
        count: result.data ? result.data.length : 0,
        pagination: {
          current_page: page,
          per_page: perPage,
          total_records: result.totalRecords || 0,
          total_pages: totalPages,
          has_next: hasNext,
          has_previous: hasPrevious
        }
      });
    } else {
      return res.json({
        success: true,
        data: result.data || [],
        count: result.data ? result.data.length : 0
      });
    }

  } catch (error) {
    console.error('Error in maintenance-report list:', error);
    const statusCode = error.statusCode || 500;
    return res.status(statusCode).json({
      success: false,
      error: statusCode === 400 ? 'Bad Request' : 'Internal Server Error',
      message: statusCode === 400 ? error.message : 'An error occurred while fetching maintenance-report list data',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined,
      timestamp: new Date().toISOString()
    });
  }
});



// Endpoint info — self-documenting API
router.get('/info', async (req, res) => {
  try {
    const actions = {"datatables":true,"read":true,"first":true,"create":true,"update":true,"delete":true,"lookup":true,"export":false,"import":false,"workflow":true,"info":true};

    const modelInfo = await maintenanceReportModel.getModelInfo(actions);

    res.json({
      success: true,
      endpoint: 'maintenance-report',
      module: 'facility-helpdesk',
      table: modelInfo.table,
      fields: modelInfo.fields,
      querySources: modelInfo.querySources,
      actions: actions,
      databaseType: 'postgres',
      generated: '2026-04-15 01:43:40',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error in maintenance-report info:', error);
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: 'An error occurred while fetching endpoint information',
      timestamp: new Date().toISOString()
    });
  }
});

// Health check endpoint
router.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    endpoint: 'maintenance-report',
    timestamp: new Date().toISOString()
  });
});

function buildMaintenanceReportSummaryResponse(result) {
  if (!result.data || !Array.isArray(result.data)) {
    return {
      success: true,
      summary: {
        total_reports: 0,
        by_status: {
          draft: 0,
          submitted: 0,
          rejected_by_wom: 0,
          assigned: 0,
          in_progress: 0,
          pending_review: 0,
          rejected: 0,
          approved: 0
        },
        by_urgency: {
          low: 0,
          medium: 0,
          high: 0
        },
        not_processed: 0,
        in_progress_count: 0,
        completed: 0
      },
      latest: [],
      timestamp: new Date().toISOString()
    };
  }

  const data = result.data;
  const statusCounts = {
    draft: 0,
    submitted: 0,
    rejected_by_wom: 0,
    assigned: 0,
    in_progress: 0,
    pending_review: 0,
    rejected: 0,
    approved: 0
  };

  const urgencyCounts = {
    low: 0,
    medium: 0,
    high: 0
  };

  const latest = [];

  data.forEach(row => {
    const status = (row.status || 'draft').toLowerCase();
    const urgency = (row.urgency || 'low').toLowerCase();

    if (statusCounts.hasOwnProperty(status)) {
      statusCounts[status]++;
    }

    if (urgencyCounts.hasOwnProperty(urgency)) {
      urgencyCounts[urgency]++;
    }

    if (latest.length < 10) {
      latest.push({
        report_id: row.report_id,
        report_number: row.report_number,
        title: row.title,
        status: row.status,
        urgency: row.urgency,
        category_name: row.category_name,
        reporter_name: row.reporter_name,
        reported_at: row.reported_at
      });
    }
  });

  const totalReports = data.length;
  const notProcessed = statusCounts.draft + statusCounts.submitted;

  return {
    success: true,
    summary: {
      total_reports: totalReports,
      by_status: statusCounts,
      by_urgency: urgencyCounts,
      not_processed: notProcessed,
      in_progress_count: statusCounts.in_progress,
      completed: statusCounts.approved
    },
    latest,
    timestamp: new Date().toISOString()
  };
}

async function getMaintenanceReportSummary(req, res) {
  try {
    console.log('[Summary] Fetching maintenance report list...');
    // Gunakan model untuk get all data, kemudian aggregate di memory
    const result = await maintenanceReportModel.getList({ limit: 10000 });
    console.log('[Summary] Result received:', { hasData: !!result.data, dataLength: result.data?.length || 0 });
    res.json(buildMaintenanceReportSummaryResponse(result));
  } catch (error) {
    console.error('Error in maintenance-report summary:', error);
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: 'An error occurred while fetching summary data',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined,
      timestamp: new Date().toISOString()
    });
  }
}

// GET /api/facility-helpdesk/maintenance-report/summary - Dashboard summary statistics
router.get('/summary', getMaintenanceReportSummary);

// Backward-compatible alias for older dashboard builds
router.get('/statistics', getMaintenanceReportSummary);

// Health check endpoint
router.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    endpoint: 'maintenance-report',
    timestamp: new Date().toISOString()
  });
});

module.exports = router;