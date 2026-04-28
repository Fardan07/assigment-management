const path = require('path');
const dotenv = require('dotenv');

// Force-load project DB settings for this server instance.
dotenv.config({
  path: path.join(__dirname, 'config', 'db-connection.env'),
  override: true
});

const { execute } = require('./src/modules/facility-helpdesk');

const port = Number(process.env.SERVER_PORT || process.env.PORT || 3032);
const serverAddress = process.env.SERVER_ADDRESS || '0.0.0.0';
const apiKey = process.env.API_KEY || '';

execute({
  port,
  serverAddress,
  cors: true,
  logging: true,
  key: apiKey || undefined
}).catch((error) => {
  console.error('Failed to start facility-helpdesk server:', error);
  process.exit(1);
});
