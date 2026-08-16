/**
 * 404 Not Found Middleware for unhandled API routes
 */
const notFoundHandler = (req, res, next) => {
  if (req.originalUrl.startsWith('/api/')) {
    return res.status(404).json({
      success: false,
      message: `API Route ${req.method} ${req.originalUrl} not found.`,
    });
  }
  next();
};

/**
 * Centralized Error Handling Middleware
 */
const errorHandler = (err, req, res, next) => {
  let statusCode = err.statusCode || 500;
  let message = err.message || 'Internal Server Error';

  // Handle Prisma Known Request Errors
  if (err.code) {
    if (err.code === 'P2002') {
      statusCode = 409;
      const target = err.meta?.target || 'field';
      message = `A record with this ${Array.isArray(target) ? target.join(', ') : target} already exists.`;
    } else if (err.code === 'P2025') {
      statusCode = 404;
      message = 'Requested record not found.';
    } else if (err.code === 'P2003') {
      statusCode = 400;
      message = 'Foreign key constraint failed on the database.';
    }
  }

  // Handle JWT specific errors
  if (err.name === 'JsonWebTokenError') {
    statusCode = 401;
    message = 'Invalid token. Please authenticate again.';
  } else if (err.name === 'TokenExpiredError') {
    statusCode = 401;
    message = 'Token has expired. Please authenticate again.';
  }

  // Log unexpected server errors
  if (statusCode >= 500 && process.env.NODE_ENV !== 'test') {
    console.error('💥 Server Error:', err);
  }

  res.status(statusCode).json({
    success: false,
    message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
};

module.exports = {
  notFoundHandler,
  errorHandler,
};
