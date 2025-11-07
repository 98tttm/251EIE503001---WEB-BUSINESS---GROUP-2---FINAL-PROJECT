const ApiResponse = require('./response');

/**
 * Global error handling middleware
 */
const errorHandler = (err, req, res, next) => {
  console.error('❌ Error:', err);

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    const errors = Object.values(err.errors).map(e => ({
      field: e.path,
      message: e.message
    }));
    return ApiResponse.validationError(res, errors);
  }

  // Mongoose cast error (invalid ObjectId)
  if (err.name === 'CastError') {
    return ApiResponse.badRequest(res, 'Invalid ID format');
  }

  // MongoDB duplicate key error
  if (err.code === 11000) {
    const field = Object.keys(err.keyPattern)[0];
    return ApiResponse.conflict(res, `${field} already exists`);
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    return ApiResponse.unauthorized(res, 'Invalid token');
  }

  if (err.name === 'TokenExpiredError') {
    return ApiResponse.unauthorized(res, 'Token expired');
  }

  // Multer file upload errors
  if (err.code === 'LIMIT_FILE_SIZE') {
    return ApiResponse.badRequest(res, 'File size too large');
  }

  if (err.code === 'LIMIT_UNEXPECTED_FILE') {
    return ApiResponse.badRequest(res, 'Too many files uploaded');
  }

  // Custom application errors
  if (err.status) {
    return res.status(err.status).json({
      success: false,
      error: {
        message: err.message,
        code: err.code
      },
      timestamp: new Date().toISOString()
    });
  }

  // Default server error
  return ApiResponse.serverError(res, 
    process.env.NODE_ENV === 'development' ? err.message : 'Internal server error'
  );
};

/**
 * 404 Not Found handler
 */
const notFoundHandler = (req, res) => {
  ApiResponse.notFound(res, 'Endpoint');
};

/**
 * Async handler wrapper to catch errors in async route handlers
 */
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

/**
 * Custom error class for application-specific errors
 */
class AppError extends Error {
  constructor(message, statusCode = 500, code = null) {
    super(message);
    this.status = statusCode;
    this.code = code;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

module.exports = {
  errorHandler,
  notFoundHandler,
  asyncHandler,
  AppError
};

