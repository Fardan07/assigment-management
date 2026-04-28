const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const { logger, logServerReady, logEndpointRegistered, createRequestLogger, logRequest } = require('restforgejs/src/utils/logger');
const ExportHandler = require('restforgejs/src/components/handlers/export_handler');
const ImportHandler = require('restforgejs/src/components/handlers/import_handler');
const { extractExportConfigFromEndpoint, extractImportConfigFromEndpoint } = require('restforgejs/src/utils/config-extractor');
const rateLimiter = require('restforgejs/src/middleware/rate-limiter');
const idempotencyMiddleware = require('restforgejs/src/middleware/idempotency');
const bodyOptionsMiddleware = require('restforgejs/src/middleware/body-options');

/**
 * MiniInventory Module - Auto-generated on 2026-04-15 00:37:08
 *
 * Fungsi untuk mengeksekusi modul mini-inventory
 * @param {Object} config - Konfigurasi untuk menjalankan modul
 * @param {number} config.port - Port untuk server
 * @param {string} config.key - API Key (opsional)
 * @param {boolean} config.cors - Enable CORS (default: true)
 * @param {boolean} config.logging - Enable request logging (default: true)
 * @returns {Promise<void>} Promise yang tidak pernah resolve agar server tetap berjalan
 */
async function execute(config) {
  return new Promise((resolve, reject) => {
    try {
      const app = express();
      const port = config.port || 3000;
      const serverAddress = config.serverAddress || '0.0.0.0'; // Default 0.0.0.0 untuk backward compatibility
      const moduleNameCapitalized = 'MiniInventory';

      // Configuration options
      const corsEnabled = config.cors !== false;
      const loggingEnabled = config.logging !== false;
      const apiKeyRequired = !!config.key;

      logger.info({
        event: 'module_starting',
        module: moduleNameCapitalized,
        port,
        cors: corsEnabled,
        logging: loggingEnabled,
        apiKey: apiKeyRequired
      }, `Starting ${moduleNameCapitalized} module`);

      // Middleware setup
      if (corsEnabled) {
        app.use((req, res, next) => {
          // CORS configuration
          res.header('Access-Control-Allow-Origin', '*');
          res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
          res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization, X-API-Key, X-Request-Mode, X-Request-ID, Idempotency-Key');
          res.header('Access-Control-Expose-Headers', 'Idempotent-Replayed, Idempotency-Key');

          // Handle preflight OPTIONS requests
          if (req.method === 'OPTIONS') {
            return res.sendStatus(200);
          }

          next();
        });
      }

      // JSON parsing middleware dengan error handling
      app.use(bodyParser.json({
        limit: '10mb',
        verify: (req, res, buf, encoding) => {
          // Skip validation untuk empty buffer
          if (buf.length === 0) {
            return;
          }

          try {
            JSON.parse(buf);
          } catch (error) {
            console.error(`JSON Parse Error from ${req.ip}: ${error.message}`);
            res.status(400).json({
              success: false,
              error: 'Invalid JSON payload',
              message: 'The payload sent is not a valid JSON format',
              details: error.message,
              timestamp: new Date().toISOString()
            });
            throw new Error('Invalid JSON');
          }
        }
      }));

      // URL-encoded parsing middleware
      app.use(bodyParser.urlencoded({
        extended: true,
        limit: '10mb'
      }));

      // Request logging middleware (Pino-based)
      if (loggingEnabled) {
        app.use((req, res, next) => {
          // Generate request ID
          req.id = req.headers['x-request-id'] || uuidv4();
          res.set('X-Request-ID', req.id);

          // Create scoped logger untuk request ini
          req.log = createRequestLogger({
            requestId: req.id,
            method: req.method,
            path: req.path,
            ip: req.ip
          });

          // Capture start time
          const startTime = process.hrtime();

          // Log response ketika selesai
          res.on('finish', () => {
            const [seconds, nanoseconds] = process.hrtime(startTime);
            const durationMs = parseFloat((seconds * 1000 + nanoseconds / 1e6).toFixed(2));
            logRequest(req, res, durationMs);
          });

          next();
        });
      }

      // API Key validation middleware
      if (apiKeyRequired) {
        app.use('/api', (req, res, next) => {
          const apiKey = req.headers['x-api-key'];
          if (!apiKey || apiKey !== config.key) {
            return res.status(401).json({
              success: false,
              error: 'Unauthorized',
              message: 'Invalid or missing API Key',
              timestamp: new Date().toISOString()
            });
          }
          next();
        });
      }

      // Rate limiting middleware (store: memory untuk single mode, Redis untuk cluster mode)
      rateLimiter.setStore(config.cluster ? 'redis' : 'memory');
      app.use('/api', rateLimiter.middleware());

      // Idempotency middleware (protects mutation endpoints from duplicate execution)
      if (process.env.IDEMPOTENCY_ENABLED === 'true') {
        app.use('/api', idempotencyMiddleware.middleware());
      }

      // Body options middleware (extract {data, options} format dari request body)
      app.use('/api', bodyOptionsMiddleware.middleware());

      // Auto-load plugin (jika ada)
      const moduleName = 'mini-inventory';
      const pluginPath = path.join(__dirname, '..', 'plugins', `${moduleName}-plugin.js`);
      let plugin = null;
      if (fs.existsSync(pluginPath)) {
        try {
          plugin = require(pluginPath);
          if (plugin.onBeforeEndpointsLoad) {
            plugin.onBeforeEndpointsLoad(app, config);
          }
          logger.info({ event: 'plugin_loaded', plugin: `${moduleName}-plugin` }, `Plugin loaded: ${moduleName}-plugin.js`);
        } catch (pluginError) {
          logger.error({ event: 'plugin_load_error', error: pluginError.message }, `Failed to load plugin: ${moduleName}-plugin.js`);
        }
      }

      // Global health check endpoint (tanpa prefix module)
      app.get('/health', (req, res) => {
        const healthInfo = {
          status: 'ok',
          timestamp: new Date().toISOString().replace('T', ' ').replace(/\.\d{3}Z$/, ''),
          service: 'mini-inventory',
          uptime: process.uptime(),
          memory: process.memoryUsage(),
          system: {
            platform: process.platform,
            nodeVersion: process.version,
            pid: process.pid
          }
        };

        res.json(healthInfo);
      });

      // Module-specific health check endpoint (dengan prefix module)
      app.get('/api/mini-inventory/health', (req, res) => {
        const healthInfo = {
          status: 'ok',
          timestamp: new Date().toISOString().replace('T', ' ').replace(/\.\d{3}Z$/, ''),
          service: 'mini-inventory',
          uptime: process.uptime(),
          memory: process.memoryUsage(),
          system: {
            platform: process.platform,
            nodeVersion: process.version,
            pid: process.pid
          }
        };

        res.json(healthInfo);
      });

      // Service info endpoint
      app.get('/api/mini-inventory/info', (req, res) => {
        res.json({
          name: 'MiniInventory API',
          description: 'Auto-generated API module for mini-inventory',
          documentation: 'See individual endpoint documentation',
          generated: '2026-04-15 00:37:08'
        });
      });

      // Load dan register endpoint modules
      // Binary-compatible: Use working directory instead of __dirname
      const isBunCompiled = typeof Bun !== 'undefined' && !process.argv[1];
      const getWorkingDir = () => {
        // Check if running as compiled binary
        if (isBunCompiled) {
          // Running as compiled binary: use directory where binary is located
          return path.dirname(process.execPath);
        } else {
          // Running as Node.js/Bun script: __dirname is already in src/modules
          // So we just need to add the module name
          return __dirname;
        }
      };

      const workingDir = getWorkingDir();
      // For compiled binary: workingDir is binary directory, need full path src/modules/moduleName
      // For script: workingDir is already src/modules/, just add moduleName
      const modulesDir = isBunCompiled
        ? path.join(workingDir, 'src', 'modules', 'mini-inventory')
        : path.join(workingDir, 'mini-inventory');

      try {
        // Ensure modules directory exists
        if (!fs.existsSync(modulesDir)) {
          fs.mkdirSync(modulesDir, { recursive: true });
          console.log(`Created modules directory: ${modulesDir}`);
        }

        // Read dan load semua endpoint files
        const files = fs.readdirSync(modulesDir);
        const endpointFiles = files.filter(file => file.endsWith('.js'));

        if (endpointFiles.length === 0) {
          console.log(`No endpoint files found in ${modulesDir}`);
          console.log(`Add endpoint files to enable API functionality`);
        } else {
          logger.info({ event: 'endpoints_loading', count: endpointFiles.length }, `Loading ${endpointFiles.length} endpoint(s)`);
        }

        // Register setiap endpoint
        for (const file of endpointFiles) {
          try {
            const endpointName = path.basename(file, '.js');
            const endpointPath = path.join(modulesDir, file);

            // Clear module cache untuk development
            if (require.cache[endpointPath]) {
              delete require.cache[endpointPath];
            }

            const endpointRouter = require(endpointPath);

            if (!endpointRouter) {
              console.warn(`Endpoint ${endpointName} did not export a router`);
              continue;
            }

            // Register endpoint dengan prefix
            const endpointPrefix = `/api/mini-inventory/${endpointName}`;
            app.use(endpointPrefix, endpointRouter);

            logEndpointRegistered(endpointName, endpointPrefix);

            // Register export routes untuk endpoint ini (auto-detect dari embedded config)
            try {
              const exportConfig = extractExportConfigFromEndpoint(endpointPath);
              if (exportConfig) {
                ExportHandler.registerRoutes(app, 'mini-inventory', endpointName, exportConfig);
                logger.info({
                  event: 'export_routes_registered',
                  endpoint: endpointName,
                  table: exportConfig.tableName
                }, `Export routes registered for ${endpointName}`);
              }
            } catch (exportError) {
              logger.error({
                event: 'export_registration_error',
                endpoint: endpointName,
                error: exportError.message
              }, `Export registration failed for ${endpointName}: ${exportError.message}`);
            }

            // Register import routes untuk endpoint ini (auto-detect dari embedded config)
            try {
              const importConfig = extractImportConfigFromEndpoint(endpointPath);
              if (importConfig) {
                ImportHandler.registerRoutes(app, 'mini-inventory', endpointName, importConfig);
                logger.info({
                  event: 'import_routes_registered',
                  endpoint: endpointName,
                  table: importConfig.tableName
                }, `Import routes registered for ${endpointName}`);
              }
            } catch (importError) {
              logger.error({
                event: 'import_registration_error',
                endpoint: endpointName,
                error: importError.message
              }, `Import registration failed for ${endpointName}: ${importError.message}`);
            }

          } catch (endpointError) {
            console.error(`Error loading endpoint ${file}:`, endpointError.message);
            // Continue loading other endpoints
          }
        }

      } catch (dirError) {
        console.error(`Error reading modules directory ${modulesDir}:`, dirError.message);
      }

      // Register cleanup route (optional admin endpoint)
      try {
        ExportHandler.registerCleanupRoute(app);
      } catch (cleanupError) {
        logger.error({ event: 'cleanup_route_error', error: cleanupError.message }, 'Export cleanup route registration failed');
      }

      // Default root endpoint
      app.get('/', (req, res) => {
        res.status(403).json({
          success: false,
          error: 'Forbidden',
          message: 'Access to the requested resource is forbidden',
          timestamp: new Date().toISOString()
        });
      });

      // Hook untuk mount middleware tambahan sebelum 404 handler
      // Digunakan oleh workbench UI dan middleware eksternal lainnya
      if (config.onAppReady && typeof config.onAppReady === 'function') {
        config.onAppReady(app);
      }

      // 404 handler untuk unknown routes
      app.use((req, res) => {
        res.status(403).json({
          success: false,
          error: 'Forbidden',
          message: 'Access to the requested resource is forbidden',
          timestamp: new Date().toISOString()
        });
      });

      // Global error handling middleware
      app.use((err, req, res, next) => {
        console.error(`Global Error Handler - ${req.method} ${req.url}:`, err);

        // Handle specific error types
        if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
          return res.status(400).json({
            success: false,
            error: 'Invalid JSON payload',
            message: 'The payload sent is not a valid JSON format',
            details: err.message,
            timestamp: new Date().toISOString()
          });
        }

        // Handle other errors
        if (!res.headersSent) {
          const statusCode = err.statusCode || err.status || 500;
          const errorResponse = {
            success: false,
            error: err.name || 'Internal Server Error',
            message: err.message || 'An error occurred on the server',
            timestamp: new Date().toISOString()
          };

          // Add stack trace in development
          if (process.env.NODE_ENV !== 'production') {
            errorResponse.stack = err.stack;
          }

          return res.status(statusCode).json(errorResponse);
        }

        next(err);
      });

      // Start server
      const server = app.listen(port, serverAddress, (err) => {
        if (err) {
          console.error(`Failed to start ${moduleNameCapitalized} server:`, err);
          reject(err);
          return;
        }

        console.log(`${moduleNameCapitalized} server started successfully!`);

        // Determine display URL based on serverAddress
        const displayHost = (serverAddress === '0.0.0.0' || !serverAddress) ? 'localhost' : serverAddress;

        logServerReady({
          port,
          module: 'mini-inventory',
          healthCheck: `http://${displayHost}:${port}/api/mini-inventory/health`,
          serviceInfo: `http://${displayHost}:${port}/api/mini-inventory/info`,
          baseUrl: `http://${displayHost}:${port}`
        });
        console.log('');

        // Execute plugin onAfterServerStart hook (jika ada)
        if (plugin && plugin.onAfterServerStart) {
          try {
            plugin.onAfterServerStart(app, config);
          } catch (pluginError) {
            logger.error({ event: 'plugin_after_start_error', error: pluginError.message }, 'Plugin onAfterServerStart failed');
          }
        }
      });

      // Graceful shutdown handling
      const gracefulShutdown = (signal) => {
        console.log(`\nReceived ${signal}, starting graceful shutdown...`);

        server.close((err) => {
          if (err) {
            console.error('Error during server shutdown:', err);
            process.exit(1);
          }

          console.log('Server closed successfully');
          console.log('Goodbye!');
          process.exit(0);
        });

        // Force shutdown after 10 seconds
        setTimeout(() => {
          console.error('Forced shutdown after timeout');
          process.exit(1);
        }, 10000);
      };

      // Handle shutdown signals
      process.on('SIGINT', () => gracefulShutdown('SIGINT'));
      process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

      // Handle uncaught exceptions
      process.on('uncaughtException', (error) => {
        console.error('Uncaught Exception:', error);
        gracefulShutdown('uncaughtException');
      });

      process.on('unhandledRejection', (reason, promise) => {
        console.error('Unhandled Rejection at:', promise, 'reason:', reason);
        gracefulShutdown('unhandledRejection');
      });

      // Store server reference untuk testing/management
      if (config.onServerReady && typeof config.onServerReady === 'function') {
        config.onServerReady(server, app);
      }

    } catch (error) {
      console.error(`Fatal error in ${moduleNameCapitalized} module:`, error);
      reject(error);
    }

    // Promise tidak akan pernah resolve untuk menjaga server tetap berjalan
    // kecuali ada error atau shutdown signal
  });
}

// Export execute function
module.exports = { execute };

// Additional exports untuk testing dan management
module.exports.miniInventory = { execute };
module.exports.moduleName = 'mini-inventory';
module.exports.generated = '2026-04-15 00:37:08';