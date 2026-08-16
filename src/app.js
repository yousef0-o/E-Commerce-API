const express = require('express');
const path = require('path');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');
const swaggerUi = require('swagger-ui-express');

const swaggerSpec = require('./config/swagger');
const apiRoutes = require('./routes');
const { notFoundHandler, errorHandler } = require('./middlewares/error.middleware');

const app = express();

// Security middleware with relaxed CSP for fonts/CDNs
app.use(
  helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
  })
);

// Enable CORS
app.use(
  cors({
    origin: true,
    credentials: true,
  })
);

// HTTP request logger (skip during test runs)
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('dev'));
}

// Request body parsers with rawBody preservation for Stripe webhook verification
app.use(
  express.json({
    verify: (req, res, buf) => {
      req.rawBody = buf;
    },
  })
);
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Serve Static Assets & Frontend Web Views
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.static(path.join(__dirname, 'views')));

// Swagger Interactive API Documentation
app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  customSiteTitle: 'E-Commerce Platform API Documentation',
  customCss: '.swagger-ui .topbar { display: none }',
}));

// API Routes
app.use('/api', apiRoutes);

// Frontend Page Routes
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'index.html'));
});

app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'admin.html'));
});

app.get('/login', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'login.html'));
});

app.get('/order-success', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'order-success.html'));
});

// Centralized 404 and Error handling
app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;
