const app = require('./app');
const config = require('./config/env');

const server = app.listen(config.port, () => {
  console.log(`\n=================================================`);
  console.log(`🚀 E-Commerce Platform Server is running!`);
  console.log(`📡 Base URL:          http://localhost:${config.port}`);
  console.log(`📚 API Documentation: http://localhost:${config.port}/api/docs`);
  console.log(`🛍️ Customer Store:    http://localhost:${config.port}`);
  console.log(`⚙️ Admin Dashboard:    http://localhost:${config.port}/admin`);
  console.log(`🔑 Environment:       ${config.nodeEnv}`);
  console.log(`=================================================\n`);
});

// Handle graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing HTTP server');
  server.close(() => {
    console.log('HTTP server closed');
  });
});
